---
contentType: recipes
slug: python-django-cache-framework
title: "Cachear Consultas de Base de Datos con Django Cache Framework"
description: "Usa el framework de cache integrado de Django con caching por vista, fragmentos de template y API de cache de bajo nivel para optimizar consultas."
metaDescription: "Cachear consultas con Django cache framework. Configura backend Redis, usa cache por vista, fragmentos de template y API de cache de bajo nivel."
difficulty: intermediate
topics:
  - caching
  - performance
  - databases
tags:
  - python
  - django
  - cache
  - redis
  - database-optimization
relatedResources:
  - /recipes/caching/python-redis-cache-decorator
  - /recipes/caching/python-memcached-session-storage
  - /guides/complete-guide-redis-caching-strategies
  - /guides/complete-guide-application-level-caching
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Cachear consultas con Django cache framework. Configura backend Redis, usa cache por vista, fragmentos de template y API de cache de bajo nivel."
  keywords:
    - django cache framework
    - python cache
    - django redis cache
    - per-view caching
    - template fragment cache
---

## Descripcion general

Django incluye un framework de cache que soporta multiples backends (Memcached, Redis, base de datos, archivo, memoria local) y cuatro niveles de caching: por-sitio, por-vista, fragmento de template y API de bajo nivel. El framework abstrae el backend para que puedas cambiar de memoria local a Redis sin cambiar codigo de aplicacion. A continuacion: configurar un backend Redis, cachear respuestas de vistas, fragmentos de template, resultados de consultas individuales y patrones de invalidacion de cache.

## Cuando Usar Esto

- Aplicaciones Django con consultas de base de datos costosas o rendering de vistas lento
- Paginas con contenido que cambia infrecuentemente (catalogos de productos, blog posts, dashboards)
- Reducir la carga de base de datos durante picos de trafico
- Cualquier proyecto Django que necesita una capa de caching sin agregar librerias externas

## Prerrequisitos

- Python 3.10+
- Django 4.2+
- Servidor Redis (para backend de produccion)

## Solucion

### 1. Configurar Backend de Cache

```python
# settings.py

# Desarrollo: cache en memoria local
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "my-app-cache",
    }
}

# Produccion: backend Redis
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/1",
        "TIMEOUT": 300,  # TTL por defecto: 5 minutos
        "OPTIONS": {
            "connection_pool_kwargs": {"max_connections": 50, "retry_on_timeout": True},
        },
    }
}

# Multiples caches para diferentes propositos
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/1",
        "TIMEOUT": 300,
    },
    "sessions": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/2",
        "TIMEOUT": 86400,  # 24 horas para sesiones
    },
    "long_term": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/3",
        "TIMEOUT": 86400 * 7,  # 7 dias para datos semi-estaticos
    },
}

# Usar cache de sesiones para sesiones Django
SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "sessions"
```

### 2. API de Cache de Bajo Nivel

```python
from django.core.cache import cache

# Establecer un valor con TTL (segundos)
cache.set("product:1", {"id": 1, "name": "Widget", "price": 9.99}, timeout=300)

# Obtener un valor (retorna None si falta)
product = cache.get("product:1")

# Obtener con default
product = cache.get("product:999", default={"name": "Unknown"})

# Obtener o calcular (atomico — evita cache stampede)
product = cache.get_or_set(
    "product:1",
    lambda: fetch_product_from_db(1),
    timeout=300,
)

# Establecer multiples
cache.set_many({"user:1": "Alice", "user:2": "Bob"}, timeout=600)

# Obtener multiples
users = cache.get_many(["user:1", "user:2"])  # {"user:1": "Alice", "user:2": "Bob"}

# Eliminar
cache.delete("product:1")

# Eliminar multiples
cache.delete_many(["user:1", "user:2"])

# Incrementar / decrementar
cache.set("page_views:home", 0)
cache.incr("page_views:home")  # 1
cache.incr("page_views:home", 10)  # 11
cache.decr("page_views:home")  # 10

# Touch (actualizar TTL sin cambiar valor)
cache.touch("product:1", timeout=600)
```

### 3. Caching por Vista

```python
from django.views.decorators.cache import cache_page
from django.shortcuts import render
from myapp.models import Product

# Cachear la respuesta completa de la vista por 15 minutos
@cache_page(60 * 15, cache="default")
def product_list(request):
    products = Product.objects.all().select_related("category")
    return render(request, "products/list.html", {"products": products})

# Cachear con variacion por query params
@cache_page(60 * 15, key_prefix="products")
def product_detail(request, product_id):
    product = Product.objects.get(pk=product_id)
    return render(request, "products/detail.html", {"product": product})
```

### 4. Caching de Fragmentos de Template

```html
{% load cache %}

<!-- Cachear este fragmento por 10 minutos -->
{% cache 600 product_list %}
  <div class="product-grid">
    {% for product in products %}
      <div class="product-card">
        <h3>{{ product.name }}</h3>
        <p>{{ product.price }}</p>
      </div>
    {% endfor %}
  </div>
{% endcache %}

<!-- Cachear con clave variante (diferente por pagina) -->
{% cache 600 product_list request.GET.page %}
  ...
{% endcache %}

<!-- Usar backend de cache especifico -->
{% cache 600 sidebar using="long_term" %}
  <aside>
    {% for category in categories %}
      <a href="{{ category.get_absolute_url }}">{{ category.name }}</a>
    {% endfor %}
  </aside>
{% endcache %}
```

### 5. Cachear Resultados de Consultas con Funciones Helper

```python
from django.core.cache import cache
from django.db.models import QuerySet
import json

def cached_queryset(key: str, queryset: QuerySet, timeout: int = 300):
    """Cachear resultados de un queryset. Retorna lista de dicts."""
    cached = cache.get(key)
    if cached is not None:
        return cached

    # Serializar queryset a lista de dicts
    data = list(queryset.values())
    cache.set(key, data, timeout=timeout)
    return data

def cached_single(key: str, model_cls, obj_id: int, timeout: int = 300):
    """Cachear una instancia de modelo unica."""
    cached = cache.get(key)
    if cached is not None:
        return cached

    obj = model_cls.objects.filter(pk=obj_id).first()
    if obj:
        cache.set(key, obj, timeout=timeout)
    return obj
```

Uso en vistas:

```python
from django.shortcuts import render
from myapp.models import Product, Category

def shop_view(request):
    # Cachear lista de productos por 10 minutos
    products = cached_queryset(
        "shop:products:all",
        Product.objects.filter(active=True).select_related("category"),
        timeout=600,
    )

    # Cachear categorias por 1 hora
    categories = cached_queryset(
        "shop:categories",
        Category.objects.all(),
        timeout=3600,
    )

    return render(request, "shop.html", {
        "products": products,
        "categories": categories,
    })
```

### 6. Invalidacion de Cache en Model Save

```python
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
from myapp.models import Product, Category

@receiver(post_save, sender=Product)
@receiver(post_delete, sender=Product)
def invalidate_product_cache(sender, instance, **kwargs):
    cache.delete(f"product:{instance.pk}")
    cache.delete("shop:products:all")
    cache.delete(f"product_list:category:{instance.category_id}")

@receiver(post_save, sender=Category)
@receiver(post_delete, sender=Category)
def invalidate_category_cache(sender, instance, **kwargs):
    cache.delete("shop:categories")
    cache.delete(f"category:{instance.pk}")
```

### 7. Cache con Versionado

```python
from django.core.cache import cache

# Incrementar version de cache para invalidar todas las claves a la vez
cache.incr_version("product:1")  # La clave de version antigua es ahora invisible

# Clave con conscience de version
cache.set("product:1", data, version=2)  # Solo visible en version 2
cache.get("product:1", version=2)  # Retorna data
cache.get("product:1", version=1)  # Retorna None

# Bump global de version en cambio de schema
def bump_all_cache_versions():
    old_version = cache.version
    cache.incr_version("global_version_key")
    # Todas las claves con version antigua son efectivamente invalidadas
```

## Como Funciona

1. **Abstraccion de backend**: La API de cache de Django (`cache.get`, `cache.set`, etc.) es agnostica al backend. El setting `BACKEND` determina donde se almacenan los datos — Redis, Memcached, base de datos, archivo o memoria local.
2. **Caching por vista**: `@cache_page(timeout)` envuelve la funcion de vista. En la primera peticion, la respuesta renderizada se cachea. Peticiones subsecuentes dentro del TTL retornan la respuesta cacheada sin ejecutar la vista.
3. **Caching de fragmentos de template**: `{% cache timeout key %}` cachea el output renderizado del bloque. La clave puede incluir variables para variar el cache por pagina, usuario, etc.
4. **Generacion de claves de cache**: Django genera claves de cache desde el nombre de la vista, parametros de URL y `key_prefix`. Para fragmentos de template, la clave se basa en el nombre de clave proporcionado y las variables de contexto del template.
5. **Invalidacion por senales**: Cuando un modelo se guarda o elimina, las senales disparan y limpian las claves de cache relevantes. Esto mantiene los datos cacheados consistentes con la base de datos.

## Variantes

### Patron Cache-Aside

```python
def get_product(product_id: int):
    key = f"product:{product_id}"
    product = cache.get(key)
    if product is None:
        product = Product.objects.select_related("category").get(pk=product_id)
        cache.set(key, product, timeout=300)
    return product

def update_product(product_id: int, **kwargs):
    Product.objects.filter(pk=product_id).update(**kwargs)
    cache.delete(f"product:{product_id}")  # Invalidar en update
```

### Write-Through Cache

```python
def create_product(data: dict):
    product = Product.objects.create(**data)
    cache.set(f"product:{product.pk}", product, timeout=300)
    return product

def update_product(product_id: int, **kwargs):
    product = Product.objects.get(pk=product_id)
    for key, value in kwargs.items():
        setattr(product, key, value)
    product.save()
    cache.set(f"product:{product.pk}", product, timeout=300)  # Actualizar cache en write
    return product
```

### Cache por Usuario con Vary Headers

```python
from django.views.decorators.vary import vary_on_headers

@cache_page(60 * 5)
@vary_on_headers("Authorization")
def user_dashboard(request):
    # Cacheado por usuario — el header Authorization varia la clave de cache
    return render(request, "dashboard.html", {"user": request.user})
```

### Backend de Base de Datos (Sin Dependencias Externas)

```python
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.db.DatabaseCache",
        "LOCATION": "my_cache_table",
        "TIMEOUT": 300,
    }
}

# Crear la tabla de cache
# python manage.py createcachetable
```

## Mejores Practicas

- **Usar `select_related` y `prefetch_related` antes de cachear**: Reduce el conteo de queries primero, luego cachea el resultado.
- **Cachear en el nivel correcto**: Cachea querysets costosos, no atributos individuales de modelo. Fragment caching para templates, view caching para paginas completas.
- **Establecer timeouts explicitos**: No confies en el `TIMEOUT` por defecto. Diferentes datos tienen diferentes requerimientos de frescura.
- **Invalidar en writes**: Usa senales o llamadas explicitas a `cache.delete()` despues de mutaciones. Cache stale es peor que no tener cache.
- **Usar backends de cache separados para diferentes datos**: Sesiones, cache de pagina y cache de largo plazo tienen diferentes necesidades de TTL y eviction.
- **Monitorear hit rate del cache**: Usa `django-debug-toolbar` en desarrollo o Redis `INFO stats` en produccion.

## Errores Comunes

- **Cachear datos especificos de usuario sin variar la clave**: Todos los usuarios ven la misma pagina cacheada. Usa `@vary_on_headers("Authorization")` o incluye user ID en la clave de cache.
- **Olvidar invalidar despues de writes**: Los datos cacheados se vuelven stale. Siempre limpia claves de cache en senales `post_save` o despues de llamadas `update()`/`delete()`.
- **Cachear querysets sin serializacion**: Los QuerySets son lazy — cachear el objeto queryset no cachea los resultados. Llama `list(queryset)` o `.values()` primero.
- **Usar `cache_page` en vistas autenticadas**: `@cache_page` cachea la respuesta completa incluyendo contenido especifico del usuario. Usa fragment caching o `vary_on_headers` en su lugar.
- **Sin namespacing de claves de cache**: Las colisiones entre diferentes features causan datos incorrectos. Prefija claves con nombres de feature (`shop:products:all`, no solo `products`).

## FAQ

**Django cache vs Redis directamente — cual deberia usar?**

El framework de cache de Django abstrae el backend, facilitando cambiar entre memoria local, Memcached y Redis. Usa la API de Django para caching a nivel aplicacion. Usa `redis-py` directamente para features especificas de Redis (pub/sub, streams, scripts Lua).

**Como maneja `@cache_page` usuarios autenticados?**

Por defecto, `@cache_page` cachea la misma respuesta para todos los usuarios. Usa `@vary_on_headers("Authorization")` o `@vary_on_cookie` para generar entradas de cache separadas por usuario.

**Puedo cachear querysets de Django ORM?**

Los QuerySets son lazy — cachear el objeto queryset no cachea los datos. Convierte a lista primero: `list(queryset.values())` o `list(queryset)`, luego cachea la lista resultante.

**Como limpio todo el cache?**

`cache.clear()` remueve todas las claves. En produccion con Redis, esto hace flush de la base de datos. Usar con precaucion — afecta a todos los usuarios. Para invalidacion dirigida, elimina claves especificas.

**Cual es la diferencia entre `cache_page` y caching de fragmentos de template?**

`cache_page` cachea la respuesta HTTP completa (headers + body). El caching de fragmentos de template cachea solo una porcion del template renderizado. Usa `cache_page` para paginas estaticas, fragmentos para paginas con contenido mixto estatico y dinamico.
