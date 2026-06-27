---
contentType: guides
slug: caching-strategies-guide
title: "Estrategias de Caché — Desde el Navegador hasta la Base de Datos, una Guía Completa"
description: "Guía práctica sobre estrategias de caché: caché del navegador, caché perimetral de CDN, caché de aplicación con Redis, y caché de consultas de base de datos. Aprende cuándo usar cada una y cómo evitar pesadillas de invalidación de caché."
metaDescription: "Aprende estrategias de caché: navegador, CDN, Redis, y caché de consultas de base de datos. Cuándo usar cada una y cómo evitar errores comunes de invalidación."
difficulty: intermediate
topics:
  - data
  - performance
  - infrastructure
tags:
  - caching
  - redis
  - cdn
  - browser-cache
  - cache-invalidation
  - performance
  - guide
relatedResources:
  - /guides/data/database-sharding-implementation-guide
  - /guides/data/read-replica-guide
  - /guides/data/connection-pooling-deep-dive-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende estrategias de caché: navegador, CDN, Redis, y caché de consultas de base de datos. Cuándo usar cada una y cómo evitar errores comunes de invalidación."
  keywords:
    - caching
    - redis
    - cdn
    - browser-cache
    - cache-invalidation
    - performance
    - guide
---

## Descripción General

La caché es una de las formas más efectivas de mejorar el rendimiento de aplicaciones y reducir costos de infraestructura. Al almacenar copias de datos frecuentemente accedidos más cerca de donde se necesitan, reduces latencia, disminuyes la carga en la base de datos y mejoras la experiencia de usuario. Pero la caché introduce complejidad: datos obsoletos, lógica de invalidación y desafíos de consistencia.

Esta guía cubre caché en cada capa del stack, desde el navegador hasta la base de datos.

## Cuándo Usar

- Tu base de datos está bajo alta carga de lectura y escalar verticalmente es costoso
- Los tiempos de respuesta de la API exceden tu SLO de latencia
- Sirves contenido estático o semi-estático a muchos usuarios
- Tienes computaciones costosas que pueden ser reutilizadas
- Tu aplicación realiza consultas o llamadas a API repetidas e idénticas

## La Jerarquía de Caché

```
Navegador del Usuario
    ↓ (HTTP Cache-Control)
CDN Edge (Cloudflare, Fastly, CloudFront)
    ↓ (Reglas de caché, TTL)
Balanceador de Carga / Proxy Inverso (Nginx, Varnish)
    ↓ (Caché de proxy, límite de tasa)
Caché de Aplicación (Redis, Memcached)
    ↓ (Clave-valor, TTL, evicción)
Caché de Consultas de Base de Datos (PostgreSQL, MySQL)
    ↓ (Caché de plan de consulta, buffer pool)
Disco / Almacenamiento
```

| Capa | Latencia | Caso de Uso Típico |
|------|----------|-------------------|
| Navegador | 0ms | Activos estáticos, respuestas de API |
| CDN | 10-50ms | Imágenes, CSS, JS, páginas HTML |
| Proxy Inverso | 1-5ms | Endpoints de API, páginas renderizadas |
| Aplicación | 1-5ms | Datos de sesión, resultados computados |
| Base de Datos | 1-10ms | Resultados de consultas, datos frecuentemente unidos |

## Implementación de Caché Paso a Paso

### 1. Caché del Navegador

Aprovecha la caché integrada del navegador primero:

```nginx
# Nginx: Caché de activos estáticos agresiva
location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary "Accept-Encoding";
}

# Respuestas de API: caché condicional
location /api/ {
    add_header Cache-Control "public, max-age=60, stale-while-revalidate=300";
}
```

```javascript
// Cliente: Service Worker para caché offline
// sw.js
const CACHE_NAME = 'app-v1';
const urlsToCache = ['/static/app.js', '/static/styles.css', '/api/config'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Retornar caché o buscar desde red
      return response || fetch(event.request);
    })
  );
});
```

**Encabezados de caché del navegador explicados:**

| Encabezado | Significado | Ejemplo |
|------------|-------------|---------|
| `Cache-Control: no-store` | Nunca caché | Datos sensibles |
| `Cache-Control: no-cache` | Revalidar cada vez | Contenido semi-dinámico |
| `Cache-Control: max-age=3600` | Caché por 1 hora | Respuestas de API estáticas |
| `Cache-Control: immutable` | Nunca revalidar | Nombres de archivo con hash |
| `ETag` | Identificador de versión para peticiones condicionales | Recursos de API |
| `Last-Modified` | Marca de tiempo para peticiones condicionales | Recursos basados en archivos |

### 2. Caché Perimetral de CDN

Caché en el edge para reducir la carga del origen:

```nginx
# Nginx con capa de caché
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=app_cache:100m max_size=1g;

server {
    location /api/public/ {
        proxy_cache app_cache;
        proxy_cache_valid 200 5m;
        proxy_cache_use_stale error timeout updating;
        proxy_cache_key "$scheme$request_method$host$request_uri";
        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

```terraform
# Distribución CloudFront CDN con caché
resource "aws_cloudfront_distribution" "cdn" {
  enabled = true

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "app_origin"

    forwarded_values {
      query_string = true
      cookies { forward = "none" }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }
}
```

**Reglas de caché de CDN:**
- Caché de activos estáticos (imágenes, CSS, JS) por 1 año con nombres de archivo con hash
- Caché de respuestas de API basado en patrones de URL y parámetros de consulta
- Usa `stale-while-revalidate` para contenido orientado a usuarios (muestra obsoleto, refresca en segundo plano)
- Purga selectivamente usando etiquetas de caché o surrogate keys

### 3. Caché de Aplicación con Redis

El caballo de batalla de la caché de aplicación:

```python
# Ejemplo: Python con Redis para caché de aplicación
import redis
import json
import hashlib
from functools import wraps

r = redis.Redis(host='redis', port=6379, db=0)

def cache_with_ttl(ttl_seconds=300):
    """Decorador para caché de resultados de función en Redis."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Crear una clave de caché determinista
            key_data = json.dumps({"func": func.__name__, "args": args, "kwargs": kwargs})
            cache_key = f"cache:{func.__name__}:{hashlib.sha256(key_data.encode()).hexdigest()[:16]}"
            
            # Intentar obtener de caché
            cached = r.get(cache_key)
            if cached:
                return json.loads(cached)
            
            # Computar y almacenar
            result = func(*args, **kwargs)
            r.setex(cache_key, ttl_seconds, json.dumps(result))
            return result
        return wrapper
    return decorator

@cache_with_ttl(ttl_seconds=600)
def get_product_details(product_id):
    """Consulta costosa de base de datos."""
    return db.query(Product).get(product_id).to_dict()

@cache_with_ttl(ttl_seconds=60)
def get_dashboard_stats(user_id):
    """Agregación costosa."""
    return compute_dashboard_stats(user_id)
```

```java
// Ejemplo: Spring Boot con caché Redis
@Configuration
@EnableCaching
public class CacheConfig {
    
    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory factory) {
        return RedisCacheManager.builder(factory)
            .cacheDefaults(
                RedisCacheConfiguration.defaultCacheConfig()
                    .entryTtl(Duration.ofMinutes(10))
                    .serializeValuesWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(
                            new GenericJackson2JsonRedisSerializer()
                        )
                    )
            )
            .build();
    }
}

@Service
public class ProductService {
    
    @Cacheable(value = "products", key = "#id")
    public Product getProduct(String id) {
        return productRepository.findById(id).orElseThrow();
    }
    
    @CacheEvict(value = "products", key = "#product.id")
    public Product updateProduct(Product product) {
        return productRepository.save(product);
    }
    
    @CacheEvict(value = "products", allEntries = true)
    public void clearProductCache() {
        # Invalidación masiva
    }
}
```

**Patrones de caché con Redis:**

| Patrón | Cuándo Usar | Riesgo |
|--------|-------------|--------|
| **Cache-Aside** | Lectura intensiva, invalidación simple | Datos obsoletos si la invalidación falla |
| **Read-Through** | Calentamiento de caché complejo | La caché se convierte en dependencia requerida |
| **Write-Through** | Consistencia fuerte necesaria | La latencia de escritura aumenta |
| **Write-Behind** | Escritura intensiva, consistencia eventual | Pérdida de datos si la caché falla antes del flush |

### 4. Caché de Consultas de Base de Datos

Deja que la base de datos haga caché por ti:

```sql
-- PostgreSQL: Habilitar y ajustar configuración de caché de consultas
-- postgresql.conf
shared_buffers = 4GB                  # 25% de RAM para buffer pool
effective_cache_size = 12GB           # Caché total del SO + PostgreSQL
work_mem = 256MB                      # Memoria de ordenamiento/hash por consulta

-- Crear una vista materializada para agregaciones costosas
CREATE MATERIALIZED VIEW daily_sales_summary AS
SELECT 
    date_trunc('day', created_at) as day,
    sum(amount) as total_sales,
    count(*) as order_count
FROM orders
WHERE created_at > now() - interval '90 days'
GROUP BY 1;

-- Refrescar en horario programado (o usar pg_cron)
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary;
```

```sql
-- MySQL: Caché de consultas (eliminado en 8.0; usa ProxySQL o caché de aplicación en su lugar)
-- Para MySQL 5.7 y anteriores:
query_cache_type = 1
query_cache_size = 256M
query_cache_limit = 8M
```

**Mejores prácticas de caché de base de datos:**
- Ajusta `shared_buffers` (PostgreSQL) o `innodb_buffer_pool_size` (MySQL)
- Usa vistas materializadas para agregaciones costosas que no necesitan datos en tiempo real
- Crea índices de cobertura para que las consultas se sirvan completamente desde páginas de índice
- Monitorea la tasa de acierto de caché (debería ser >99% para OLTP)

## Estrategias de Invalidación de Caché

El problema más difícil de la caché:

| Estrategia | Cómo Funciona | Mejor Para |
|------------|---------------|------------|
| **TTL (Time to Live)** | Expirar después de duración fija | Datos que pueden estar obsoletos brevemente |
| **Invalidación Activa** | Eliminar/actualizar caché al escribir | Requisitos de consistencia fuerte |
| **Event-Driven** | Escuchar eventos de cambio (CDC) | Sistemas distribuidos |
| **Claves Versionadas** | Incluir versión/hash en la clave | Despliegues inmutables |
| **Calentamiento de Caché** | Pre-poblar antes de carga pico | Patrones de tráfico predecibles |

```python
# Ejemplo: Invalidación event-driven con Redis Pub/Sub
import redis

r = redis.Redis(host='redis', port=6379)
p = r.pubsub()

def handle_invalidation(message):
    key = message['data']
    r.delete(f"cache:product:{key}")
    print(f"Caché invalidada para producto {key}")

p.subscribe(**{'product-updates': handle_invalidation})
p.run_in_thread(sleep_time=0.001)

# Al actualizar producto, publicar evento
r.publish('product-updates', product_id)
```

## Mejores Prácticas

- **Caché en múltiples capas.** Navegador + CDN + Redis + buffer pool de base de datos.
- **Usa TTLs apropiados a la volatilidad de los datos.** Perfil de usuario: 1 hora. Catálogo de productos: 1 día. Sesión: 15 minutos.
- **Diseña para fallo de caché.** Si Redis cae, tu app debería seguir funcionando (degradada, no rota).
- **Monitorea tasas de acierto de caché.** Apunta a >90% para caché de aplicación, >99% para buffer pool de base de datos.
- **Evita cachéar todo.** Los datos pequeños y frecuentemente accedidos se benefician más. Los datos grandes y raramente accedidos desperdician memoria.
- **Usa hash consistente para cachés distribuidas.** Redis Cluster o sharding del lado del cliente previene hotspotting.

## Errores Comunes

- **Estampida de caché (thundering herd).** Muchas peticiones golpean el backend simultáneamente cuando la caché expira. Usa locks o patrones de single-flight.
- **Almacenar objetos no serializables.** Cachéa tipos simples (strings, JSON), no objetos ORM o handles de archivo.
- **Sin estrategia de evicción.** El crecimiento ilimitado de caché lleva a OOM. Configura `maxmemory-policy` en Redis.
- **Ignorar el calentamiento de caché.** Una caché fría después de reinicio causa picos de latencia. Calienta gradualmente.
- **Sobre-cachéar.** Cada capa de caché añade complejidad. Mide antes de agregar cada capa.

## Variantes

- **Caché local en proceso:** Caffeine (Java), LRU-cache (Python) — más rápido, sin red, pero por instancia
- **Caché distribuida:** Redis, Memcached — compartida entre instancias, requiere red
- **Caché jerárquica:** L1 local + L2 Redis — lo mejor de ambos mundos, invalidación compleja
- **CDN con lógica de edge:** Cloudflare Workers, Fastly VCL — caché y computación en el edge

## FAQ

**P: ¿Debería usar Redis o Memcached?**
Redis es más rico en características (estructuras de datos, persistencia, pub/sub). Memcached es más simple y ligeramente más rápido para clave-valor puro. Usa Redis a menos que tengas una razón específica para no hacerlo.

**P: ¿Cómo prevengo la estampida de caché?**
Usa un mecanismo de locking (Redis SET NX EX) para que solo un proceso regenere la caché. Alternativamente, escalona TTLs o usa expiración temprana probabilística.

**P: ¿Cuál es una buena tasa de acierto de caché?**
Caché de aplicación: >85% es bueno, >95% es excelente. Buffer pool de base de datos: >99% se espera para OLTP.

**P: ¿Debería cachéar escrituras (write-behind)?**
Solo si puedes tolerar breve pérdida de datos y tienes un mecanismo de reintento. Write-through o cache-aside son más seguros para la mayoría de aplicaciones.

## Conclusión

La caché efectiva transforma el rendimiento de la aplicación. Al capas de caché desde el navegador hasta la base de datos, elegir estrategias de invalidación apropiadas, y monitorear tasas de acierto, reduces latencia y costo de infraestructura mientras mantienes consistencia de datos.

## Recursos Relacionados

- [Sharding de Base de Datos](/guides/data/database-sharding-implementation-guide)
- [Réplicas de Lectura](/guides/data/read-replica-guide)
- [Pooling de Conexiones](/guides/data/connection-pooling-deep-dive-guide)
- [Testing de Rendimiento](/guides/performance/performance-testing-guide)
- [Escalado](/guides/devops/scaling-guide)
