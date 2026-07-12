---



contentType: recipes
slug: http-cache-control-headers
title: "Configurar headers HTTP Cache-Control para APIs y assets"
description: "Establece headers Cache-Control, ETag y Last-Modified para controlar el caching de navegadores y CDN para respuestas API y assets estaticos"
metaDescription: "Configura headers HTTP Cache-Control para APIs y assets estaticos. Usa ETag, Last-Modified, max-age y stale-while-revalidate para caching CDN."
difficulty: beginner
topics:
  - caching
  - performance
tags:
  - http
  - cache-control
  - headers
  - cdn
  - caching
relatedResources:
  - /recipes/redis-cache-aside-pattern
  - /patterns/cache-aside-pattern
  - /recipes/cdn-cache-invalidation-strategies
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Configura headers HTTP Cache-Control para APIs y assets estaticos. Usa ETag, Last-Modified, max-age y stale-while-revalidate para caching CDN."
  keywords:
    - http cache-control
    - cache headers
    - etag
    - cdn caching
    - http caching



---

# Configurar headers HTTP Cache-Control para APIs y assets estaticos

Los headers de caching HTTP le dicen a navegadores y CDN cuanto tiempo cachear una respuesta, cuando revalidar y si la respuesta puede servirse desde una cache compartida. Headers configurados correctamente reducen latencia, bajan la carga del origen y mejoran Core Web Vitals. La solucion a continuacion cubre `Cache-Control`, `ETag`, `Last-Modified` y `stale-while-revalidate` tanto para respuestas API como para assets estaticos.

## Cuando Usar Esto


- For alternatives, see [Complete Guide to GraphQL Caching](/es/guides/complete-guide-graphql-caching/).

- Servir assets estaticos (JS, CSS, imagenes, fuentes) que cambian infrecuentemente
- Respuestas API que son iguales para todos los usuarios o cambian en intervalos predecibles
- Cualquier respuesta que se beneficia del caching en el edge del CDN

## Requisitos Previos

- Un servidor web o framework que permita establecer headers de respuesta
- Conocimiento basico del ciclo request/response HTTP

## Solucion

### 1. Assets estaticos — cache larga con immutable

Assets estaticos con hashes de contenido en el nombre de archivo pueden cachearse agresivamente:

```nginx
# nginx.conf
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

```typescript
// Express.js
app.use(express.static("public", {
  maxAge: "1y",
  setHeaders: (res, path) => {
    if (path.endsWith(".js") || path.endsWith(".css")) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  },
}));
```

El flag `immutable` le dice al navegador que nunca revalide — el nombre del archivo cambia cuando el contenido cambia (ej. `app.abc123.js`).

### 2. Respuestas API — cache corta con revalidacion

```typescript
// Express.js — cachear respuestas API por 60 segundos con revalidacion
app.get("/api/products", async (req, res) => {
  const products = await getProducts();

  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.json(products);
});

// Sin caching para datos especificos de usuario
app.get("/api/users/me", authMiddleware, async (req, res) => {
  const user = await getUser(req.userId);

  res.setHeader("Cache-Control", "private, no-cache");
  res.json(user);
});
```

### 3. ETag para peticiones condicionales

```typescript
import crypto from "crypto";

app.get("/api/products", async (req, res) => {
  const products = await getProducts();
  const etag = `"${crypto.createHash("sha256").update(JSON.stringify(products)).digest("hex").slice(0, 16)}"`;

  if (req.headers["if-none-match"] === etag) {
    return res.status(304).end();
  }

  res.setHeader("ETag", etag);
  res.setHeader("Cache-Control", "public, max-age=60");
  res.json(products);
});
```

El cliente envia `If-None-Match: "<etag>"` en peticiones subsecuentes. Si el ETag coincide, el servidor retorna `304 Not Modified` sin body — el cliente usa su copia cacheada.

### 4. Last-Modified para peticiones condicionales

```typescript
app.get("/api/articles/:id", async (req, res) => {
  const article = await getArticle(req.params.id);
  const lastModified = new Date(article.updatedAt).toUTCString();

  if (req.headers["if-modified-since"] === lastModified) {
    return res.status(304).end();
  }

  res.setHeader("Last-Modified", lastModified);
  res.setHeader("Cache-Control", "public, max-age=300");
  res.json(article);
});
```

### 5. stale-while-revalidate para refresco en background

```typescript
app.get("/api/trending", async (req, res) => {
  const data = await getTrending();

  // Cachear por 60s, luego servir obsoleto por hasta 300s mientras revalida
  res.setHeader(
    "Cache-Control",
    "public, max-age=60, stale-while-revalidate=300"
  );
  res.json(data);
});
```

El CDN sirve la respuesta cacheada por 60 segundos. Entre 60-360 segundos, sirve la respuesta obsoleta mientras obtiene una copia fresca en background.

### 6. Ejemplo con Python / FastAPI

```python
from fastapi import FastAPI, Request, Response
from fastapi.staticfiles import StaticFiles
import hashlib
import json

app = FastAPI()

app.mount("/static", StaticFiles(directory="public", max_age=31536000), name="static")

@app.get("/api/products")
async def get_products(request: Request):
    products = await fetch_products()
    body = json.dumps(products, default=str)
    etag = f'"{hashlib.sha256(body.encode()).hexdigest()[:16]}"'

    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304)

    return Response(
        content=body,
        media_type="application/json",
        headers={
            "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
            "ETag": etag,
        },
    )
```

## Como Funciona

1. **`max-age`** — el numero de segundos que la respuesta se considera fresca. El navegador sirve desde cache sin revalidacion durante este periodo.
2. **`public`** — permite a caches compartidos (CDN, proxies) almacenar la respuesta. Usa `private` para datos especificos de usuario.
3. **`immutable`** — le dice al navegador que la respuesta nunca cambiara durante su vida util de frescura, omitiendo revalidacion condicional.
4. **`ETag`** — una huella de contenido. El cliente envia `If-None-Match` en peticiones subsecuentes; una coincidencia retorna `304 Not Modified`.
5. **`stale-while-revalidate`** — despues de que `max-age` expira, el CDN sirve contenido obsoleto mientras obtiene una copia fresca asincronamente, eliminando latencia para el usuario.

## Variantes

### No-Store para datos sensibles

```typescript
app.get("/api/user/billing", authMiddleware, async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(billingData);
});
```

`no-store` previene que cualquier cache — navegador, CDN o proxy — almacene la respuesta.

### Header Vary para negociacion de contenido

```typescript
app.get("/api/products", (req, res) => {
  res.setHeader("Vary", "Accept-Encoding, Accept-Language");
  res.setHeader("Cache-Control", "public, max-age=300");
  // La respuesta varia por encoding (gzip, br) y lenguaje
  res.json(products);
});
```

### Surrogate-Control para caching especifico de CDN

```typescript
res.setHeader("Surrogate-Control", "max-age=3600");
res.setHeader("Cache-Control", "max-age=60");
```

Los CDN usan el TTL mas largo de `Surrogate-Control`, mientras los navegadores usan el TTL mas corto de `Cache-Control`.

## Mejores Practicas

- **Hashea nombres de archivo para assets estaticos** — habilita caching `immutable` con `max-age=31536000`
- **Usa `no-store` para datos sensibles** — billing, tokens de auth, informacion personal
- **Establece `Vary` correctamente** — omitir `Accept-Encoding` causa que respuestas comprimidas y no comprimidas colisionen en cache
- **Usa `stale-while-revalidate` para APIs** — elimina latencia visible para el usuario durante revalidacion

## Errores Comunes

- **Cachear respuestas especificas de usuario con `public`** — filtra datos entre usuarios a traves del CDN
- **Establecer `max-age=0` sin `no-cache`** — `max-age=0` fuerza revalidacion pero aun almacena la respuesta; `no-store` previene almacenamiento
- **Olvidar `Vary: Accept-Encoding`** — una respuesta gzipped cacheada para un cliente que no soporta gzip causa errores
- **Usar `Expires` en lugar de `Cache-Control`** — `Expires` es HTTP/1.0 y menos flexible; prefiere `Cache-Control`

## FAQ

**Q: Cual es la diferencia entre `no-cache` y `no-store`?**
A: `no-cache` almacena la respuesta pero requiere revalidacion antes de usarla. `no-store` previene el almacenamiento completamente. Usa `no-store` para datos sensibles.

**Q: Debo usar ETag o Last-Modified?**
A: ETag es mas preciso (hash de contenido vs. timestamp). Usa ambos — los clientes que soportan ETag lo usan; los demas fallan a Last-Modified.

**Q: Por cuanto tiempo debo cachear assets estaticos?**
A: Un ano (`max-age=31536000`) con `immutable` si los nombres de archivo tienen hash de contenido. De lo contrario, usa un TTL mas corto con revalidacion.

**Q: `stale-while-revalidate` funciona en navegadores?**
A: Funciona en Chrome y Firefox. Safari lo ignora. CDN como Cloudflare y Fastly lo soportan independientemente del navegador.

### ¿Cómo invalido respuestas cacheadas?

Usa `Cache-Control: no-cache` con validación de `ETag`. Cuando el recurso cambia, el servidor retorna un nuevo ETag, forzando al cliente a revalidar. Para invalidación de CDN, usa la API de purge del CDN (ej., `POST /purge` en Cloudflare). Tag-based purging permite invalidar grupos de URLs por cache-tag (ej., `user-123`). Evita `Clear-Site-Data` para invalidación de cache — limpia todo incluyendo cookies y storage.

### ¿Cómo manejo el caching para requests autenticados?

Setea `Cache-Control: private` para que caches compartidos (CDNs, proxies) no almacenen respuestas user-specific. Usa `Vary: Authorization` para asegurar que la cache key incluya el header de auth. Para data user-specific que cambia raramente, usa `stale-while-revalidate=60` para que el cliente sirva data stale mientras revalida en background. Nunca cachees respuestas que contengan tokens o session IDs en caches compartidos.

### ¿Cuál es la diferencia entre `max-age` y `s-maxage`?

`max-age` aplica a todos los caches (browser y CDN). `s-maxage` aplica solo a caches compartidos (CDNs, proxies) y sobrescribe `max-age` para ellos. Usa `s-maxage=600, max-age=60` para que los CDNs cacheen por 10 minutos mientras los browsers revalidan cada minuto. Este patrón es útil para APIs donde la data cambia frecuentemente pero puede tolerar short staleness.

### ¿Cómo cacheo respuestas de API con query parameters?

La cache key incluye la URL completa con query string por defecto. Asegúrate de `Vary: Accept` si las respuestas varían por content type. Para paginación, cachea cada página separadamente incluyendo el cursor o page number en la URL. Evita cachear respuestas con query parameters mutables como timestamps o random nonces — crean cache entries únicos que nunca se reutilizan.

### ¿Cómo implemento cache busting para assets hasheados?

Usa content-hash en los filenames: `app.a1b2c3d4.js`. Setea `Cache-Control: public, max-age=31536000, immutable` para estos archivos. Cuando el contenido del archivo cambia, el hash cambia, creando una nueva URL que el browser fetchea fresh. Referencia los filenames hasheados en tu HTML, que debería usar `no-cache` para que el browser siempre obtenga las referencias más recientes.

### ¿Cómo debuggeo problemas de caching?

Usa `curl -I` para inspeccionar los headers de respuesta. Chequea los headers `Cache-Control`, `ETag`, `Last-Modified`, `Age`, y `X-Cache`. La pestaña Network de Browser DevTools muestra el status de cache hit/miss. Usa el header `Cache-Control: no-cache` en un request para forzar revalidación. Para problemas de CDN, revisa el dashboard del CDN para cache hit ratios y edge locations sirviendo contenido stale.

### ¿Cómo manejo caching con Vary headers?

`Vary` le dice a los caches qué headers del request afectan la respuesta. `Vary: Accept-Encoding` cachea respuestas gzip y brotli separadamente. `Vary: Accept` cachea respuestas JSON y HTML separadamente. Evita `Vary: *` — deshabilita el caching completamente. Sobre-especificar `Vary` (ej., `Vary: User-Agent`) fragmenta las cache keys y reduce hit rates. Usa `Vary: Accept, Accept-Encoding` para APIs que retornan múltiples content types.

### ¿Cómo uso surrogate keys para invalidación de CDN cache?

Surrogate keys (o cache tags) permiten invalidar grupos de URLs con un solo request. Agrega `Cache-Tag: user-123, posts` a las respuestas. Cuando el usuario 123 actualiza su perfil, envía un purge request para el tag `user-123`. Cloudflare y Fastly soportan esto nativamente. Esto es más eficiente que purgear URLs individuales — un solo tag purge puede invalidar miles de respuestas cacheadas.

### ¿Cómo manejo cache para páginas Server-Side Rendered?

Setea `Cache-Control: public, max-age=300, s-maxage=3600` para páginas SSR. El browser revalida cada 5 minutos mientras el CDN sirve HTML cacheado por 1 hora. Usa `stale-while-revalidate=60` para que el CDN sirva HTML stale mientras fetchea un render fresh en background. Para páginas SSR personalizadas, usa `Cache-Control: private, no-cache` y relied en client-side hydration para contenido user-specific.

### ¿Cómo manejo caching para versionado de API?

Cuando versionas tu API (ej., `/v1/users` vs `/v2/users`), cada versión tiene su propio namespace de cache naturalmente. Incluye la versión en el URL path en lugar de en un header para que los caches keyeen correctamente. Setea `Cache-Control: no-store` para versiones de API deprecadas para prevenir stale caching. Cuando deprecas una versión, setea una sunset date en el header `Deprecation` y `Sunset` para que los clientes sepan cuándo migrar.

### ¿Cómo manejo caching con CORS?

Las respuestas preflight de CORS (`OPTIONS` requests) pueden cachearse con `Access-Control-Max-Age: 86400` (24 horas). Esto le dice al browser que skipee preflight para same-origin requests dentro de ese período. Setea `Vary: Origin` si tu servidor retorna diferentes CORS headers por origin. No cachees respuestas CORS actuales con `Access-Control-Allow-Origin: *` junto a `Vary: Origin` — esto crea cache entries conflictivos.

### ¿Qué es el header `Age`?

El header `Age` indica cuánto tiempo (en segundos) una respuesta ha estado cacheada por un CDN o proxy. Se incrementa mientras la respuesta está en cache. Usa `Age` para debuggear contenido stale — si `Age` excede `max-age`, la respuesta es stale y debería revalidarse. Los CDNs setean este header automáticamente. Los browsers no setean `Age` — es un header de shared-cache-only. Chequea `Age` junto a `X-Cache` (HIT/MISS) para entender el comportamiento de cache end-to-end.

### ¿Cómo manejo caching para A/B testing?

Usa `Vary: Cookie` si la variante A/B se setea via cookie. Alternativamente, incluye la variante del experimento en la URL (ej., `?variant=b`) para que cada variante tenga su propia cache entry. No uses `Vary: User-Agent` para A/B testing — fragmenta el cache. Setea `Cache-Control: private` si la variante es user-specific. Para server-side A/B testing, inyecta la asignación de variante antes de la capa de CDN cache para que el CDN cachee cada variante separadamente.
