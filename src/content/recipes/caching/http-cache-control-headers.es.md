---
contentType: recipes
slug: http-cache-control-headers
title: "Configurar headers HTTP Cache-Control para APIs y assets estaticos"
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
  - /recipes/caching/redis-cache-aside-pattern
  - /recipes/performance/http-caching-strategy
  - /patterns/caching/cdn-cache-pattern
lastUpdated: "2026-07-02"
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

Los headers de caching HTTP le dicen a navegadores y CDN cuanto tiempo cachear una respuesta, cuando revalidar y si la respuesta puede servirse desde una cache compartida. Headers configurados correctamente reducen latencia, bajan la carga del origen y mejoran Core Web Vitals. Esta receta cubre `Cache-Control`, `ETag`, `Last-Modified` y `stale-while-revalidate` tanto para respuestas API como para assets estaticos.

## Cuando Usar Esto

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
