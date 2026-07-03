---
contentType: recipes
slug: python-httpx-cache-responses
title: "Cachear Respuestas HTTP con httpx y CacheControl en Python"
description: "Cachear respuestas HTTP en Python usando httpx con CacheControl para caching compatible con HTTP, manejo de ETag y peticiones condicionales."
metaDescription: "Cachear respuestas HTTP en Python con httpx y CacheControl. Maneja ETags, peticiones condicionales, headers de cache y backends personalizados."
difficulty: intermediate
topics:
  - caching
  - api
  - performance
tags:
  - python
  - httpx
  - http-cache
  - cachecontrol
  - etag
relatedResources:
  - /recipes/caching/python-redis-cache-decorator
  - /recipes/caching/nginx-reverse-proxy-cache
  - /guides/complete-guide-api-versioning-strategies
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Cachear respuestas HTTP en Python con httpx y CacheControl. Maneja ETags, peticiones condicionales, headers de cache y backends personalizados."
  keywords:
    - python httpx cache
    - cachecontrol python
    - http caching python
    - etag conditional requests
    - httpx cache backend
---

## Descripcion general

Cuando una aplicacion Python hace peticiones HTTP a APIs externas, cachear respuestas reduce latencia, evita rate limits y disminuye el uso de ancho de banda. `httpx` combinado con `CacheControl` proporciona caching compatible con HTTP que respeta los headers `Cache-Control`, `ETag` y `Last-Modified` — las mismas reglas que siguen los navegadores. A continuacion: configurar httpx con CacheControl, usar backends de archivo y Redis, manejar peticiones condicionales y control manual de cache.

## Cuando Usar Esto

- Aplicaciones Python que llaman a APIs externas repetidamente (clima, tasas de cambio, busqueda)
- Reducir consumo de rate limits en APIs de terceros
- Cachear respuestas de API durante desarrollo o testing
- Cualquier escenario de cliente HTTP donde las respuestas sean cacheables

## Prerrequisitos

- Python 3.10+
- Paquetes `httpx` y `cachecontrol`

## Solucion

### 1. Instalar Dependencias

```bash
pip install httpx cachecontrol
```

### 2. Caching Basico con Archivos

```python
import httpx
from cachecontrol import CacheControlAdapter

# Crear un cliente httpx con un adapter de cache basado en archivos
adapter = CacheControlAdapter(cache_dir="/tmp/http_cache")
client = httpx.Client(
    mount={
        "https://": adapter,
        "http://": adapter,
    }
)

# Primera peticion — obtiene y cachea
response = client.get("https://api.example.com/products")
print(response.json())
print(f"From cache: {response.from_cache}")  # False

# Segunda peticion — servida desde cache
response = client.get("https://api.example.com/products")
print(f"From cache: {response.from_cache}")  # True

client.close()
```

### 3. Backend Redis

```python
import httpx
from cachecontrol import CacheControlAdapter
from cachecontrol.caches.redis_cache import RedisCache
import redis

redis_client = redis.Redis(host="localhost", port=6379, db=2)
adapter = CacheControlAdapter(cache=RedisCache(redis_client))

client = httpx.Client(mount={"https://": adapter, "http://": adapter})

# Las respuestas cacheadas se almacenan en Redis — compartidas entre procesos
response = client.get("https://api.example.com/data")
```

### 4. Cache en Memoria (Desarrollo)

```python
from cachecontrol import CacheControlAdapter

adapter = CacheControlAdapter()  # Por defecto: cache en memoria
client = httpx.Client(mount={"https://": adapter})

# El cache vive solo en este proceso — se pierde al reiniciar
response = client.get("https://api.example.com/data")
```

### 5. Usar httpx Async con CacheControl

```python
import httpx
from cachecontrol import CacheControlAdapter

adapter = CacheControlAdapter(cache_dir="/tmp/http_cache")

async with httpx.AsyncClient(
    mount={"https://": adapter, "http://": adapter}
) as client:
    # Primera peticion — obtiene
    r1 = await client.get("https://api.example.com/products")

    # Segunda peticion — desde cache
    r2 = await client.get("https://api.example.com/products")
    print(f"From cache: {r2.from_cache}")
```

### 6. Control Manual de Cache

```python
import httpx
from cachecontrol import CacheControlAdapter

adapter = CacheControlAdapter(cache_dir="/tmp/http_cache")
client = httpx.Client(mount={"https://": adapter})

# Forzar cache miss — siempre obtener fresco
response = client.get(
    "https://api.example.com/products",
    headers={"Cache-Control": "no-cache"},
)

# Forzar no-store — no cachear la respuesta
response = client.get(
    "https://api.example.com/sensitive",
    headers={"Cache-Control": "no-store"},
)

# Max-age — solo usar cache si es mas joven que 60 segundos
response = client.get(
    "https://api.example.com/products",
    headers={"Cache-Control": "max-age=60"},
)
```

### 7. Peticiones Condicionales (ETag / Last-Modified)

CacheControl maneja automaticamente los headers `ETag` y `Last-Modified`:

```python
# Primera peticion — el servidor retorna ETag
response = client.get("https://api.example.com/products")
etag = response.headers.get("ETag")  # "abc123"
last_modified = response.headers.get("Last-Modified")

# Segunda peticion — CacheControl envia If-None-Match automaticamente
# Si el servidor retorna 304 Not Modified, se usa la respuesta cacheada
response = client.get("https://api.example.com/products")
# response.status_code puede ser 200 (desde cache) o 304 (revalidado)
```

### 8. Clase Wrapper con Override de TTL

```python
import httpx
from cachecontrol import CacheControlAdapter
from datetime import timedelta

class CachedHttpClient:
    def __init__(self, cache_dir="/tmp/http_cache", default_ttl=300):
        adapter = CacheControlAdapter(cache_dir=cache_dir)
        self.client = httpx.Client(mount={"https://": adapter, "http://": adapter})
        self.default_ttl = default_ttl

    def get(self, url: str, params: dict = None, force_refresh: bool = False) -> dict:
        headers = {}
        if force_refresh:
            headers["Cache-Control"] = "no-cache"

        response = self.client.get(url, params=params, headers=headers)
        response.raise_for_status()
        return response.json()

    def post(self, url: str, json: dict = None) -> dict:
        # Las peticiones POST nunca se cachean
        response = self.client.post(url, json=json)
        response.raise_for_status()
        return response.json()

    def close(self):
        self.client.close()

# Uso
api = CachedHttpClient(cache_dir="/tmp/api_cache", default_ttl=600)

# GET cacheado
data = api.get("https://api.example.com/products", params={"page": 1})

# Forzar fetch fresco
fresh = api.get("https://api.example.com/products", force_refresh=True)

# POST (nunca cacheado)
result = api.post("https://api.example.com/products", json={"name": "Widget"})
```

## Como Funciona

1. **Parseo de Cache-Control**: CacheControl lee el header `Cache-Control` de la respuesta. Directivas como `max-age`, `no-store`, `no-cache` y `must-revalidate` determinan si y por cuanto tiempo cachear.
2. **Revalidacion ETag**: Cuando una respuesta cacheada tiene `ETag`, CacheControl envia `If-None-Match: <etag>` en la siguiente peticion. Si el servidor retorna `304 Not Modified`, el body cacheado se reutiliza — ahorrando ancho de banda.
3. **Revalidacion Last-Modified**: Similar a ETag, pero usa el header `If-Modified-Since` con la fecha `Last-Modified`.
4. **Clave de cache**: La clave de cache se deriva de la URL y metodo de la peticion. Los parametros de query se incluyen en la clave.
5. **Header Vary**: Si la respuesta incluye `Vary: Accept-Encoding`, CacheControl almacena entradas de cache separadas para diferentes valores de `Accept-Encoding`.

## Variantes

### Backend de Cache Personalizado

```python
from cachecontrol.caches.file_cache import FileCache

class CustomFileCache(FileCache):
    def __init__(self, directory, **kwargs):
        super().__init__(directory, **kwargs)

    def get(self, key):
        # Agregar logging o metricas
        value = super().get(key)
        if value:
            print(f"Cache hit: {key}")
        return value

    def set(self, key, value, expires=None):
        print(f"Cache set: {key}, expires: {expires}")
        super().set(key, value, expires)

adapter = CacheControlAdapter(cache=CustomFileCache("/tmp/http_cache"))
```

### Override de TTL por Peticion

```python
# Sobrescribir el Cache-Control del servidor con un TTL mas corto
response = client.get(
    "https://api.example.com/long-cache",
    headers={"Cache-Control": "max-age=60"},  # Usar 60s en lugar de 3600s del servidor
)
```

### Cache con Circuit Breaker

```python
import httpx
from cachecontrol import CacheControlAdapter

class ResilientClient:
    def __init__(self):
        adapter = CacheControlAdapter(cache_dir="/tmp/http_cache")
        self.client = httpx.Client(mount={"https://": adapter})
        self.failure_count = 0
        self.circuit_open = False

    def get(self, url: str) -> dict:
        if self.circuit_open:
            # Intentar solo cache — no hit la red
            cached = self.client.get(url, headers={"Cache-Control": "only-if-cached"})
            if cached.from_cache:
                return cached.json()
            raise Exception("Circuit open and no cached response available")

        try:
            response = self.client.get(url)
            response.raise_for_status()
            self.failure_count = 0
            return response.json()
        except (httpx.HTTPError, httpx.TimeoutException):
            self.failure_count += 1
            if self.failure_count >= 5:
                self.circuit_open = True
            raise
```

## Mejores Practicas

- **Usar backend de archivo o Redis en produccion**: El cache en memoria se pierde al reiniciar y no se comparte entre procesos.
- **Respetar los headers `Cache-Control`**: No sobrescribas las directivas de cache del servidor a menos que tengas una buena razon. El servidor conoce los requerimientos de frescura de sus datos.
- **Usar `no-cache` para forzar refresco**: La directiva `no-cache` revalida con el servidor (envia ETag/Last-Modified). Usa `no-store` para saltar el caching completamente.
- **Cachear solo GET**: POST, PUT, DELETE y PATCH nunca deberian cachearse. CacheControl solo cachea metodos seguros (GET, HEAD) por defecto.
- **Establecer un directorio de cache con suficiente espacio en disco**: Los caches basados en archivos crecen con el uso. Monitorea el uso de disco y limpia entradas viejas.
- **Manejar respuestas 304**: Una respuesta 304 significa que el body cacheado sigue siendo valido. CacheControl maneja esto automaticamente, pero tenlo en cuenta al inspeccionar codigos de respuesta.

## Errores Comunes

- **Cachear respuestas autenticadas**: Las respuestas con headers `Authorization` pueden cachear datos especificos del usuario. Usa la directiva de cache `private` o evita cachear peticiones autenticadas.
- **Ignorar headers `Vary`**: Si el servidor retorna `Vary: Accept`, diferentes headers `Accept` producen diferentes respuestas. CacheControl maneja esto, pero caches personalizados pueden no hacerlo.
- **No cerrar el cliente**: `httpx.Client` mantiene conexiones. Usa el statement `with` o llama `close()` para evitar leaks de conexiones.
- **Usar cache en memoria en produccion**: El cache en memoria es por-proceso y se pierde al reiniciar. Usa backend de archivo o Redis.
- **Sobrescribir `Cache-Control` sin entender**: Establecer `max-age=3600` en una respuesta con `no-store` derrocha la intencion del servidor. Solo sobrescribe cuando controlas ambos lados.

## FAQ

**httpx + CacheControl vs requests-cache — cual deberia usar?**

`requests-cache` funciona con la libreria `requests`. `CacheControl` funciona tanto con `requests` como con `httpx`. Si usas `httpx` para async o HTTP/2, usa `CacheControl`. Si estas en `requests`, `requests-cache` ofrece una API mas simple.

**CacheControl cachea bodies de respuesta?**

Si. CacheControl almacena la respuesta completa incluyendo headers y body. El body se serializa (JSON, texto, o binario) y se almacena en el backend de cache.

**Como maneja CacheControl los redirects?**

CacheControl cachea la respuesta final despues de los redirects. La cadena de redirects no se cachea — cada redirect se sigue en cada peticion. Usa `httpx.Client(follow_redirects=False)` para deshabilitar redirects.

**Puedo usar CacheControl con respuestas streaming?**

Las respuestas streaming (`client.stream()`) no se cachean por defecto porque el body se consume lazy. Lee el body completo antes de cachear, o usa peticiones no-streaming para endpoints cacheables.

**Que pasa cuando el cache esta lleno?**

Los caches basados en archivos no tienen un limite de tamano integrado. Las entradas viejas se remueven cuando expiran (basado en `max-age`). Para caching con limite de tamano, usa Redis con `maxmemory` y una politica de eviction.
