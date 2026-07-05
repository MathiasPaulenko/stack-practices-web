---
contentType: guides
slug: complete-guide-cdn-caching-strategy
title: "Guía Completa de Estrategia de Caching CDN"
description: "Disenar caching CDN para aplicaciones web y APIs. Cubre edge caching, cache keys, cache headers, estrategias de invalidacion, surrogate keys y setups multi-CDN para rendimiento global."
metaDescription: "Disenar caching CDN para web y APIs. Cubre edge caching, cache keys, headers, invalidacion, surrogate keys y multi-CDN para rendimiento global."
difficulty: advanced
topics:
  - caching
  - performance
  - infrastructure
tags:
  - cdn
  - caching
  - guia
  - edge-caching
  - cache-keys
  - invalidation
  - surrogate-keys
  - cloudflare
relatedResources:
  - /guides/caching/complete-guide-redis-caching-strategies
  - /guides/api/complete-guide-graphql-caching
  - /patterns/design/circuit-breaker-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Disenar caching CDN para web y APIs. Cubre edge caching, cache keys, headers, invalidacion, surrogate keys y multi-CDN para rendimiento global."
  keywords:
    - cdn caching estrategia
    - edge caching
    - cache keys
    - cache headers
    - cache invalidation
    - surrogate keys
    - multi-cdn
---

## Introducción

Un Content Delivery Network (CDN) cachea tu contenido en edge locations cercanas a los usuarios. Cuando un usuario en Tokyo solicita una pagina servida desde un data center en Virginia, el CDN la sirve desde un edge node en Tokyo. Esto reduce la latencia de 200ms a 20ms. Pero el caching CDN solo funciona si lo configuras correctamente. Un mal diseno de cache keys, headers faltantes, o invalidacion agresiva pueden hacer el CDN inutil. Esta guia cubre todo lo que necesitas para disenar una estrategia de caching CDN que funcione.

## Cómo Funciona el Caching CDN

```text
Usuario (Tokyo) → CDN Edge (Tokyo) → Origin (Virginia)
                    ↓
              Cache HIT → Retorna respuesta cacheada (20ms)
              Cache MISS → Fetchea de origin, cachea, retorna (200ms)
```

1. El usuario solicita una URL (ej., `https://example.com/image.jpg`)
2. El CDN checkea si la respuesta esta cacheada en el edge node mas cercano
3. Si esta cacheada (HIT): retorna la respuesta cacheada inmediatamente
4. Si no esta cacheada (MISS): fetchea de origin, almacena en edge, retorna al usuario
5. Requests subsiguientes para la misma URL se sirven desde cache hasta que el TTL expira

## Cache Headers

Los CDNs usan HTTP cache headers para determinar que cachear y por cuanto tiempo.

### Cache-Control

El header `Cache-Control` es la directiva principal para caching CDN.

```http
Cache-Control: public, max-age=3600
```

- `public`: Cualquier cache (CDN, browser) puede almacenar la respuesta
- `private`: Solo el browser puede almacenar la respuesta (no el CDN)
- `max-age=N`: Cachear por N segundos
- `s-maxage=N`: Cachear por N segundos en shared caches (CDN) solo
- `no-cache`: Debe revalidar con origin antes de usar la copia cacheada
- `no-store`: No cachear en absoluto
- `must-revalidate`: No servir respuesta stale despues de expirar
- `stale-while-revalidate=N`: Servir stale mientras revalida en background

### Setear Headers por Tipo de Contenido

```nginx
# configuracion nginx

# Assets estaticos: cache largo, immutable
location ~* \.(css|js|png|jpg|jpeg|gif|svg|woff2?)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}

# Paginas HTML: cache corto, must revalidate
location ~* \.html$ {
    add_header Cache-Control "public, max-age=60, must-revalidate";
}

# Respuestas API: no cachear por defecto
location /api/ {
    add_header Cache-Control "no-store";
}

# Respuestas API publicas: cache corto
location /api/public/ {
    add_header Cache-Control "public, max-age=60";
}
```

### ETag y Last-Modified

`ETag` y `Last-Modified` habilitan conditional requests. Cuando la copia cacheada del CDN expira, envia una conditional request al origin con `If-None-Match` o `If-Modified-Since`. Si el contenido no ha cambiado, el origin retorna `304 Not Modified` (sin body), y el CDN refresca el TTL de la copia cacheada.

```http
# Primera request
HTTP/1.1 200 OK
ETag: "abc123"
Last-Modified: Wed, 04 Jul 2026 12:00:00 GMT
Cache-Control: public, max-age=3600
Content: <html>...</html>

# Request subsiguiente (despues de que TTL expira)
GET /page
If-None-Match: "abc123"
If-Modified-Since: Wed, 04 Jul 2026 12:00:00 GMT

# Respuesta del origin
HTTP/1.1 304 Not Modified
Cache-Control: public, max-age=3600
# Sin body — el CDN mantiene la copia cacheada
```

## Cache Keys

La cache key determina si dos requests hittean la misma respuesta cacheada. Por defecto, la cache key es la URL completa incluyendo query string. Pero puedes customizarla.

### Cache Key por Defecto

```text
Cache key: https://example.com/page?utm_source=email&utm_campaign=summer
```

Dos requests con diferentes valores de `utm_source` producen diferentes cache keys, aunque el contenido sea identico. Esto desperdicia espacio de cache.

### Normalizar Cache Keys

Remueve parametros de tracking que no afectan el contenido:

```javascript
// Cloudflare Worker: normalizar cache key
addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // Remover parametros de tracking
  const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"];
  for (const param of trackingParams) {
    url.searchParams.delete(param);
  }
  
  // Usar URL normalizada como cache key
  event.respondWith(fetch(url.toString()));
});
```

### Vary Header

El header `Vary` le dice al CDN que incluya headers de request adicionales en la cache key. Esto es necesario cuando la respuesta difiere basandose en headers de request.

```http
Vary: Accept-Encoding, Accept-Language
```

Esto crea entradas de cache separadas para diferentes encodings (gzip, br) e idiomas (en, es). Sin `Vary`, un usuario pidiendo Espanol podria obtener la respuesta cacheada en Ingles.

### Composición de Cache Key

```text
Cache key completa = URL + Vary headers + Custom keys
```

Disena tu cache key para incluir todo lo que afecta la respuesta y nada que no afecte.

## Estrategias de Invalidación

### Expiración Basada en TTL

Setea un TTL en contenido cacheado. Despues de que el TTL expira, el CDN revalida con el origin. Simple pero sirve contenido stale por la duracion del TTL.

```http
Cache-Control: public, max-age=300
```

### Purge por URL

Remueve explicitamente una URL del cache del CDN. Usa esto cuando el contenido cambia antes de que el TTL expire.

```bash
# Cloudflare purge por URL
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  -d '{"files": ["https://example.com/page1", "https://example.com/page2"]}'
```

```bash
# Fastly purge por URL
curl -X POST "https://api.fastly.com/purge/{service_id}" \
  -H "Fastly-Key: {api_key}" \
  -d "https://example.com/page1"
```

### Purge por Surrogate Key

Etiqueta respuestas cacheadas con surrogate keys. Purga por key para remover todas las respuestas etiquetadas en una llamada. Esto es mas eficiente que purgar URLs individuales.

```http
# Headers de respuesta
Surrogate-Key: product-42 products category-5
Cache-Control: public, max-age=3600
```

```bash
# Fastly purge por surrogate key
curl -X POST "https://api.fastly.com/purge/{service_id}" \
  -H "Fastly-Key: {api_key}" \
  -H "Surrogate-Key: product-42"
```

Esto purga todas las respuestas etiquetadas con `product-42` across todo el CDN.

### Purge All

Purga todo del CDN. Usa con moderacion: causa un spike en trafico de origin ya que todas las requests se vuelven cache misses.

```bash
# Cloudflare purge everything
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything": true}'
```

### Invalidación Event-Driven

Triggera purge del CDN cuando los datos cambian en tu backend.

```python
import requests

def update_product(product_id: int, data: dict):
    product = db.products.update(product_id, data)
    
    # Purgar cache CDN para este producto
    requests.post(
        "https://api.fastly.com/purge/{service_id}",
        headers={"Fastly-Key": API_KEY},
        data={"surrogate_keys": [f"product-{product_id}", "products"]}
    )
    
    return product
```

## Estrategias de Contenido Stale

### stale-while-revalidate

Sirve contenido stale mientras fetchea una copia fresca en background. Los usuarios obtienen respuestas instantaneas; el cache se actualiza asincronamente.

```http
Cache-Control: public, max-age=300, stale-while-revalidate=60
```

Por 300 segundos, sirve desde cache. De 300-360 segundos, sirve stale mientras revalida. Despues de 360 segundos, fetchea de origin sincronamente.

### stale-if-error

Sirve contenido stale si el origin no esta disponible. Esto proporciona resiliencia durante outages del origin.

```http
Cache-Control: public, max-age=300, stale-if-error=86400
```

Si el origin retorna un error (5xx) despues de que el cache expira, sirve el contenido stale cacheado por hasta 86400 segundos (1 dia).

## Caching por Tipo de Contenido

### Assets Estaticos (CSS, JS, Imagenes)

Cachear por mucho tiempo con filenames basados en contenido. Usa fingerprinting (hash en filename) para que nuevas versiones obtengan nuevas URLs.

```http
Cache-Control: public, max-age=31536000, immutable
```

```html
<!-- URLs versionadas -->
<link rel="stylesheet" href="/css/main.a1b2c3d4.css">
<script src="/js/app.e5f6g7h8.js"></script>
```

### Paginas HTML

Cachear por poco tiempo con revalidacion. El contenido cambia frecuentemente pero deberia estar fresco.

```http
Cache-Control: public, max-age=60, must-revalidate
ETag: "abc123"
```

### Respuestas API

Cachear respuestas API publicas con TTLs cortos. No cachear respuestas autenticadas o especificas de usuario.

```http
# Lista de productos publica
Cache-Control: public, max-age=60

# Datos especificos de usuario
Cache-Control: private, no-cache

# Datos en tiempo real
Cache-Control: no-store
```

### Autenticación y Caching CDN

Las respuestas autenticadas no deben ser cacheadas por el CDN. Usa `private` o `no-store` para cualquier respuesta que incluye datos especificos de usuario.

```http
# Perfil de usuario (private)
Cache-Control: private, no-cache
Set-Cookie: session=abc123; HttpOnly; Secure

# Producto publico (cacheable)
Cache-Control: public, max-age=3600
```

## Estrategia Multi-CDN

Para aplicaciones globales, usa multiples CDNs para optimizar costo, rendimiento, y disponibilidad.

### Selección de CDN por Geografía

Rutea usuarios al CDN con el mejor rendimiento en su region.

```javascript
// Ruteo CDN basado en DNS (usando un DNS provider como NS1 o Route 53)
const cdnRoutes = {
  "asia": "cdn-asia.example.com",     // Cloudflare (fuerte en Asia)
  "europe": "cdn-europe.example.com",  // Fastly (fuerte en Europa)
  "default": "cdn-global.example.com", // Cloudfront (global)
};
```

### Selección de CDN por Tipo de Contenido

Rutea assets estaticos a un CDN y contenido dinamico a otro.

```text
Assets estaticos (CSS, JS, imagenes) → CDN A (mas barato, TTL mas largo)
Contenido dinamico (API, HTML) → CDN B (origin mas rapido, TTL mas corto)
```

### Failover

Si un CDN se cae, rutea el trafico al CDN de backup.

```bash
# Script de health check
if ! curl -s --max-time 5 https://cdn-a.example.com/health; then
  # Actualizar DNS para rutar a CDN B
  aws route53 change-resource-record-sets \
    --hosted-zone-id Z123 \
    --change-batch '{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"cdn.example.com","Type":"CNAME","TTL":60,"ResourceRecords":[{"Value":"cdn-b.example.com"}]}}]}'
fi
```

## Monitoreo de Rendimiento CDN

### Métricas Clave

- **Cache hit ratio**: `hits / (hits + misses)` — deberia estar sobre 90% para contenido estatico
- **Origin shield ratio**: porcentaje de requests servidas desde origin shield sin hittear origin
- **Edge response time**: p50, p95, p99 para respuestas servidas desde edge
- **Origin response time**: p50, p95, p99 para fetches de origin
- **Purge latency**: tiempo desde purge request hasta invalidacion de cache
- **Bandwidth**: ancho de banda servido por CDN vs servido por origin

### Cálculo de Cache Hit Ratio

```text
Cache Hit Ratio = Cache Hits / (Cache Hits + Cache Misses) * 100
```

Un 95% de hit ratio significa que 95 de cada 100 requests se sirven desde cache. Las 5 restantes van al origin. Trackea esto por tipo de contenido:

| Tipo de Contenido | Hit Ratio Objetivo | TTL Tipico |
|-------------------|-------------------|------------|
| Assets estaticos | 99%+ | 1 ano |
| Paginas HTML | 80-90% | 1-5 minutos |
| API publica | 60-80% | 30-60 segundos |
| API privada | 0% (sin cache) | N/A |

## Checklist de Producción

- [ ] Headers Cache-Control seteados para todos los tipos de contenido
- [ ] Headers ETag o Last-Modified para conditional requests
- [ ] Cache keys normalizadas (parametros de tracking removidos)
- [ ] Header Vary seteado para content negotiation (encoding, idioma)
- [ ] Surrogate keys para purging dirigido
- [ ] Purge event-driven en cambios de datos
- [ ] stale-while-revalidate para staleness graceful
- [ ] stale-if-error para resiliencia de outage de origin
- [ ] Assets estaticos usan filenames fingerprinted
- [ ] Respuestas autenticadas marcadas private o no-store
- [ ] Cache hit ratio monitoreado por tipo de contenido
- [ ] Purge latency monitoreado
- [ ] Origin shield configurado para reducir carga de origin
- [ ] Plan de failover para outage de CDN

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre browser cache y CDN cache?

Browser cache se almacena en el dispositivo del usuario. Reduce requests al CDN. CDN cache se almacena en edge servers. Reduce requests al origin. Ambas capas trabajan juntas: browser cache sirve visitas repetidas, CDN cache sirve primeras visitas de cualquier usuario en la misma region.

### ¿Debería cachear paginas HTML en el CDN?

Si, con un TTL corto (1-5 minutos). Las paginas HTML son costosas de generar server-side. Cachearlas por solo 1 minuto reduce la carga de origin significativamente. Usa `must-revalidate` y ETags para que el CDN revalide eficientemente.

### ¿Cómo manejo contenido especifico de usuario con un CDN?

No caches contenido especifico de usuario en el CDN. Marcalo `private` o `no-store`. Para paginas con una mezcla de contenido publico y privado, usa Edge Side Includes (ESI) o client-side rendering para las partes personalizadas, y cachea las partes publicas en el CDN.

### ¿Qué es un origin shield?

Un origin shield es una capa de cache CDN entre los edge nodes y tu origin. Todos los edge nodes fetchean desde el shield, y el shield fetchea desde el origin. Esto reduce la carga de origin: si 100 edge nodes solicitan el mismo contenido, solo 1 request llega al origin (desde el shield).

### ¿Por cuánto tiempo debería cachear assets estaticos?

Cachea assets estaticos por 1 ano (`max-age=31536000`). Usa filenames fingerprinted (hash en filename) para que nuevas versiones obtengan nuevas URLs. Cuando deployas una nueva version, la URL cambia, y el CDN fetchea el archivo nuevo. Las URLs viejas permanecen cacheadas para usuarios que no han actualizado.

### ¿Cuál es el mejor CDN para mi caso de uso?

Depende de tus prioridades. Cloudflare tiene la red de edge mas amplia y un free tier generoso. Fastly ofrece purge instantaneo y surrogate keys. CloudFront se integra bien con AWS. Akamai es fuerte para enterprise y entrega a gran escala. Testea multiples CDNs con usuarios reales para encontrar el mejor fit.
