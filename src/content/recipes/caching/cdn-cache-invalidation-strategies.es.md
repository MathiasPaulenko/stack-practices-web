---



contentType: recipes
slug: cdn-cache-invalidation-strategies
title: "Estrategias y patrones de invalidacion de cache CDN"
description: "Implementa invalidacion de cache CDN usando purge APIs, surrogate keys, invalidacion por tags y URLs versionadas para mantener contenido fresco"
metaDescription: "Invalida caches CDN con purge APIs, surrogate keys e invalidacion por tags. Usa URLs versionadas y soft purges para mantener contenido fresco sin picos."
difficulty: intermediate
topics:
  - caching
  - performance
tags:
  - cdn
  - cache invalidation
  - cloudflare
  - fastly
  - performance
relatedResources:
  - /recipes/http-cache-control-headers
  - /recipes/redis-cache-aside-pattern
  - /patterns/cache-aside-pattern
  - /recipes/nginx-reverse-proxy-cache
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Invalida caches CDN con purge APIs, surrogate keys e invalidacion por tags. Usa URLs versionadas y soft purges para mantener contenido fresco sin picos."
  keywords:
    - cdn cache invalidation
    - cdn purge
    - surrogate keys
    - tag-based invalidation
    - cdn caching



---

# Estrategias y patrones de invalidacion de cache CDN

El caching CDN reduce latencia y carga del origen, pero el contenido cacheado puede volverse obsoleto. La invalidacion le dice al CDN que obtenga una copia fresca del origen. El siguiente enfoque cubre cuatro estrategias de invalidacion — purge por URL, invalidacion por surrogate key (tags), URLs versionadas y soft purge — con ejemplos de codigo para Cloudflare y Fastly.

## Cuando Usar Esto


- For alternatives, see [Complete Guide to CDN Caching Strategy](/es/guides/complete-guide-cdn-caching-strategy/).

- Actualizaciones de contenido que deben aparecer inmediatamente (noticias, precios, inventario)
- Despliegues donde assets viejos no deben persistir en el edge
- Sitios multi-pagina donde actualizar una pagina debe invalidar paginas relacionadas

## Requisitos Previos

- Un proveedor CDN (Cloudflare, Fastly, AWS CloudFront o similar)
- Credenciales de API para el CDN

## Solucion

### 1. Purge por URL — invalidar URLs especificas

**Cloudflare:**

```python
import httpx

CLOUDFLARE_API = "https://api.cloudflare.com/client/v4"

async def purge_cloudflare_urls(zone_id: str, api_token: str, urls: list[str]) -> dict:
    """Purge specific URLs from Cloudflare's cache.

    Args:
        zone_id: Cloudflare zone ID.
        api_token: API token with purge permission.
        urls: List of URLs to purge.

    Returns:
        API response dict.
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{CLOUDFLARE_API}/zones/{zone_id}/purge_cache",
            headers={
                "Authorization": f"Bearer {api_token}",
                "Content-Type": "application/json",
            },
            json={"files": urls},
        )
        return response.json()

# Uso
await purge_cloudflare_urls(
    zone_id="abc123",
    api_token="token",
    urls=["https://example.com/page1", "https://example.com/page2"],
)
```

**Fastly:**

```python
FASTLY_API = "https://api.fastly.com"

async def purge_fastly_urls(service_id: str, api_key: str, urls: list[str]) -> list[dict]:
    """Purge specific URLs from Fastly's cache."""
    results = []
    async with httpx.AsyncClient() as client:
        for url in urls:
            response = await client.post(
                f"{FASTLY_API}/purge/{url}",
                headers={"Fastly-Key": api_key},
            )
            results.append(response.json())
    return results
```

### 2. Invalidacion por surrogate key — purge por tags

Las surrogate keys te permiten etiquetar URLs relacionadas e invalidarlas con una llamada a la API. Esto es ideal cuando actualizar un producto debe invalidar su pagina de producto, pagina de categoria y resultados de busqueda.

**Fastly (surrogate keys nativas):**

```python
# En los headers de respuesta de tu origen:
# Surrogate-Key: product-123 category-456

async def purge_fastly_key(service_id: str, api_key: str, surrogate_key: str) -> dict:
    """Purge all URLs tagged with a surrogate key."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{FASTLY_API}/service/{service_id}/purge/{surrogate_key}",
            headers={"Fastly-Key": api_key},
        )
        return response.json()

# Uso — purgar todas las paginas relacionadas con product-123
await purge_fastly_key("svc123", "key", "product-123")
```

**Cloudflare (Cache Tags):**

```python
# En los headers de respuesta de tu origen:
# Cache-Tag: product-123, category-456

async def purge_cloudflare_tags(zone_id: str, api_token: str, tags: list[str]) -> dict:
    """Purge all URLs with matching cache tags."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{CLOUDFLARE_API}/zones/{zone_id}/purge_cache",
            headers={
                "Authorization": f"Bearer {api_token}",
                "Content-Type": "application/json",
            },
            json={"tags": tags},
        )
        return response.json()
```

### 3. URLs versionadas — invalidacion por hash de contenido

En lugar de purgar, cambia la URL cuando el contenido cambia. Esto elimina la invalidacion por completo:

```typescript
// Paso de build — genera URLs de assets con hash de contenido
import crypto from "crypto";
import fs from "fs";

function generateVersionedAsset(filePath: string): string {
  const content = fs.readFileSync(filePath);
  const hash = crypto.createHash("sha256").update(content).digest("hex").slice(0, 8);
  const ext = filePath.split(".").pop();
  const base = filePath.replace(/\.\w+$/, "");
  return `${base}.${hash}.${ext}`;
}

// app.js -> app.a1b2c3d4.js
// Cuando el contenido cambia, el hash cambia, y el CDN obtiene la nueva URL
```

```html
<!-- El HTML referencia el filename con hash -->
<script src="/assets/app.a1b2c3d4.js"></script>
<link rel="stylesheet" href="/assets/styles.e5f6g7h8.css" />
```

### 4. Soft purge — invalidacion elegante

Soft purge marca el contenido cacheado como obsoleto en lugar de eliminarlo. El CDN sirve el contenido obsoleto mientras obtiene una copia fresca en background, evitando picos en el origen.

**Fastly Soft Purge:**

```python
async def soft_purge_fastly(service_id: str, api_key: str, surrogate_key: str) -> dict:
    """Soft purge — mark as stale, serve while refreshing."""
    async with httpx.AsyncClient() as client:
        response = await client.request(
            "POST",
            f"{FASTLY_API}/service/{service_id}/purge/{surrogate_key}",
            headers={
                "Fastly-Key": api_key,
                "Fastly-Soft-Purge": "1",
                "Fastly-Soft-Purge-TTL": "30",
            },
        )
        return response.json()
```

### 5. Invalidacion automatizada al desplegar

```python
import os

async def invalidate_on_deploy():
    """Purge CDN cache after a deployment."""
    cdn = os.getenv("CDN_PROVIDER")
    service_id = os.getenv("CDN_SERVICE_ID")
    api_key = os.getenv("CDN_API_KEY")

    if cdn == "fastly":
        # Purgar todo via surrogate key "all"
        await purge_fastly_key(service_id, api_key, "all")
    elif cdn == "cloudflare":
        zone_id = os.getenv("CLOUDFLARE_ZONE_ID")
        api_token = os.getenv("CLOUDFLARE_API_TOKEN")
        # Purgar todo
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{CLOUDFLARE_API}/zones/{zone_id}/purge_cache",
                headers={"Authorization": f"Bearer {api_token}"},
                json={"purge_everything": True},
            )

    print("CDN cache invalidated after deploy")
```

## Como Funciona

1. **Purge por URL** envia una llamada a la API al CDN para eliminar URLs especificas de la cache del edge. La siguiente peticion obtiene del origen.
2. **Surrogate keys** (Fastly) y **cache tags** (Cloudflare) agrupan URLs por tag. Purgar un tag invalida todas las URLs con ese tag en una llamada, evitando enumerar cada URL.
3. **URLs versionadas** eliminan la invalidacion — la URL cambia cuando el contenido cambia, por lo que el CDN siempre obtiene el archivo nuevo. Las URLs viejas permanecen cacheadas hasta que su TTL expira.
4. **Soft purge** establece el TTL del objeto cacheado a un valor corto (ej. 30 segundos) en lugar de eliminarlo. El CDN sirve contenido obsoleto mientras asincronamente obtiene una copia fresca.

## Variantes

### Invalidacion con AWS CloudFront

```python
import boto3

def invalidate_cloudfront(distribution_id: str, paths: list[str]) -> dict:
    """Create a CloudFront invalidation."""
    client = boto3.client("cloudfront")
    response = client.create_invalidation(
        DistributionId=distribution_id,
        InvalidationBatch={
            "Paths": {
                "Quantity": len(paths),
                "Items": paths,
            },
            "CallerReference": str(int(time.time())),
        },
    )
    return response
```

### Invalidacion selectiva por tipo de contenido

```python
async def invalidate_product(product_id: str):
    """Invalidate all cache entries related to a product."""
    tags = [
        f"product-{product_id}",
        f"category-{get_product_category(product_id)}",
        "search-results",
        "product-feed",
    ]
    await purge_cloudflare_tags(zone_id, api_token, tags)
```

### Webhook de invalidacion

```python
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()

@app.post("/webhook/cdn-invalidate")
async def invalidate_webhook(request: Request):
    """Webhook endpoint for CMS-triggered invalidation."""
    payload = await request.json()
    if payload.get("secret") != os.getenv("WEBHOOK_SECRET"):
        raise HTTPException(status_code=403)

    if payload["type"] == "product_updated":
        await invalidate_product(payload["product_id"])
    elif payload["type"] == "full_deploy":
        await invalidate_on_deploy()

    return {"status": "ok"}
```

## Mejores Practicas

- **Usa surrogate keys para contenido relacionado** — purgar una key invalida todas las URLs relacionadas sin enumerarlas
- **Prefiere URLs versionadas para assets estaticos** — elimina la necesidad de invalidacion por completo
- **Usa soft purge para paginas de alto trafico** — evita picos en el origen por cache misses simultaneos
- **Agrupa peticiones de purge** — la mayoria de CDN rate-limit las llamadas a la API de purge; agrupa URLs o usa tags

## Errores Comunes

- **Purgar todo en cada despliegue** — causa picos en el origen; usa surrogate keys para invalidacion dirigida
- **No establecer headers `Surrogate-Key`** — sin tags, solo puedes purgar por URL, lo que requiere conocer cada URL afectada
- **Purgar en lugar de versionar** — para assets estaticos, las URLs versionadas son mas simples y confiables
- **No manejar rate limits del API de purge** — Cloudflare permite 30 peticiones de purge por minuto por zona; agrupa en consecuencia

## FAQ

**Q: Cuanto toma la invalidacion del CDN?**
A: Tipicamente 30-60 segundos para Cloudflare, 1-5 segundos para Fastly. Depende de la velocidad de propagacion del edge del CDN.

**Q: Debo purgar o usar TTLs cortos?**
A: Usa TTLs cortos (60-300 segundos) para contenido que cambia frecuentemente. Usa purge para invalidacion inmediata cuando los TTLs son muy lentos.

**Q: Puedo purgar por patron de URL (ej. /products/*)?**
A: Cloudflare soporta purge por prefijo con `"prefixes": ["/products/"]`. Fastly usa surrogate keys para el mismo efecto.

**Q: Cual es el costo de las llamadas al API de purge del CDN?**
A: Cloudflare incluye purge en todos los planes. Fastly lo incluye pero rate-limite por plan. AWS CloudFront cobra por path de invalidacion despues de los primeros 1,000/mes.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### ¿Cuál es la diferencia entre purge y ban en caché de CDN?

Purge elimina el contenido cacheado inmediatamente y el próximo request obtiene una copia fresca del origin. Ban marca el contenido como stale pero lo deja en caché — el próximo request dispara una revalidación. Usa purge para limpieza inmediata. Usa ban cuando quieres invalidación lazy para reducir picos de carga en el origin.

### ¿Cómo hago cache-bust sin cambiar la URL?

No puedes. El caché de navegador y CDN está basado en URL. Para forzar un refresh, debes cambiar la URL — ya sea el filename (content hash), un query parameter (`?v=2`), o un path prefix (`/v2/asset.css`). Content hashing (ej. `[name].[contenthash].js`) es el approach más confiable porque el hash cambia solo cuando el contenido del archivo cambia.

## Errores Comunes Adicionales

- Purgar todo el caché en lugar de URLs específicas — causa un pico de tráfico hacia el origin
- Setear `Cache-Control: no-cache` en assets estáticos — anula el propósito del caché de CDN
- No setear el header `Vary` para respuestas localizadas o específicas por dispositivo
- Olvidar invalidar el caché después de desplegar nuevo contenido — los usuarios ven páginas stale
- Usar TTLs cortos para assets estáticos — incrementa la carga del origin innecesariamente; usa TTLs largos con content hashing en su lugar
- No setear headers `Surrogate-Key` — hace la invalidación granular imposible sin purgar zonas enteras de caché
- Ignorar `stale-while-revalidate` — pierde una forma fácil de servir contenido stale mientras se refresca en background
