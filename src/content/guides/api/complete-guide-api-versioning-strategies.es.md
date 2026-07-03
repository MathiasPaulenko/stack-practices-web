---
contentType: guides
slug: complete-guide-api-versioning-strategies
title: "Guía Completa de Estrategias de Versionado de APIs"
description: "Versiona APIs REST y GraphQL con estrategias de URI, header, query param y content negotiation. Cubre deprecación, sunset y patrones de migración."
metaDescription: "Guía completa de versionado de APIs. Compara URI, header, query param, content negotiation y evolución de schema GraphQL para REST y GraphQL."
difficulty: intermediate
topics:
  - api
  - architecture
tags:
  - api-versioning
  - rest
  - graphql
  - versioning
  - deprecation
  - backward-compatibility
  - guide
  - api-design
relatedResources:
  - /guides/api/rest-api-design-guide
  - /guides/architecture/graphql-vs-rest-guide
  - /patterns/architecture/gateway-routing-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Guía completa de versionado de APIs. Compara URI, header, query param, content negotiation y evolución de schema GraphQL para REST y GraphQL."
  keywords:
    - api versioning strategies
    - rest api versioning
    - graphql versioning
    - uri versioning
    - header versioning
    - content negotiation
    - api deprecation
    - backward compatibility
---

# Guía Completa de Estrategias de Versionado de APIs

## Introducción

El versionado de APIs permite evolucionar una API sin romper clientes existentes. La estrategia correcta depende del tipo de API (REST vs GraphQL), base de clientes (interna vs pública) y cadencia de releases. Esta guía cubre los cuatro enfoques principales de versionado REST, evolución de schema GraphQL, workflows de deprecación y patrones de migración.

## ¿Por qué versionar APIs?

- **Compatibilidad backward**: Clientes existentes siguen funcionando cuando añades o cambias campos
- **Breaking changes controladas**: Introducir v2 mientras v1 sigue corriendo
- **Timeline de deprecación claro**: Los clientes saben cuándo migrar
- **Experimentación segura**: Testear nuevo comportamiento en una nueva versión sin afectar v1

## Estrategias de Versionado REST

### 1. Versionado por URI Path

```python
from fastapi import FastAPI, APIRouter

app = FastAPI()

v1_router = APIRouter(prefix="/api/v1")
v2_router = APIRouter(prefix="/api/v2")

@v1_router.get("/users/{user_id}")
async def get_user_v1(user_id: str):
    return {"id": user_id, "name": "Alice", "email": "alice@example.com"}

@v2_router.get("/users/{user_id}")
async def get_user_v2(user_id: str):
    return {"id": user_id, "name": "Alice", "email": "alice@example.com", "created_at": "2024-01-01"}

app.include_router(v1_router)
app.include_router(v2_router)
```

**Pros**: Simple, explícito, cacheable, visible en logs
**Contras**: Contaminación de URI, rompe pureza REST (la versión no es un recurso)

### 2. Versionado por Query Parameter

```python
from fastapi import FastAPI, Request

app = FastAPI()

@app.get("/users/{user_id}")
async def get_user(user_id: str, request: Request):
    version = request.query_params.get("version", "1")

    if version == "1":
        return {"id": user_id, "name": "Alice"}
    elif version == "2":
        return {"id": user_id, "name": "Alice", "email": "alice@example.com"}
    else:
        return {"error": "Unsupported version"}, 400
```

**Pros**: URIs limpias, fácil defaultear a latest
**Contras**: Fácil olvidar, no visible en logs, problemas de caching

### 3. Versionado por Header

```python
from fastapi import FastAPI, Header, HTTPException

app = FastAPI()

@app.get("/users/{user_id}")
async def get_user(
    user_id: str,
    x_api_version: str = Header(default="1", alias="X-API-Version"),
):
    if x_api_version == "1":
        return {"id": user_id, "name": "Alice"}
    elif x_api_version == "2":
        return {"id": user_id, "name": "Alice", "email": "alice@example.com"}
    raise HTTPException(status_code=400, detail="Unsupported version")
```

**Pros**: URIs limpias, RESTful, la versión es metadata no recurso
**Contras**: No visible en logs, más difícil de testear en browser, no cacheable por defecto

### 4. Content Negotiation (Accept Header)

```python
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()

@app.get("/users/{user_id}")
async def get_user(user_id: str, request: Request):
    accept = request.headers.get("accept", "")

    if "application/vnd.example.v1+json" in accept:
        return {"id": user_id, "name": "Alice"}
    elif "application/vnd.example.v2+json" in accept:
        return {"id": user_id, "name": "Alice", "email": "alice@example.com"}

    raise HTTPException(status_code=406, detail="Unsupported media type")
```

**Pros**: RESTful, sigue spec HTTP, URIs limpias
**Contras**: Complejo de implementar, difícil de testear en browser, no intuitivo para consumidores

## Comparación

| Estrategia | Visibilidad | Caching | RESTful | Complejidad | Mejor Para |
|----------|-----------|---------|---------|------------|----------|
| URI Path | Alta | Fácil | No | Baja | APIs públicas, más común |
| Query Param | Media | Más difícil | Sí | Baja | APIs internas, default-to-latest |
| Header | Baja | Difícil | Sí | Media | APIs internas, fine-grained |
| Content Negotiation | Baja | Difícil | Sí | Alta | REST estricto, media-type driven |

## Evolución de Schema GraphQL

GraphQL no usa versionado de URL. En su lugar, evoluciona el schema con cambios backward-compatible.

### Cambios aditivos (sin versión)

```graphql
type User {
  id: ID!
  name: String!
  email: String!      # Nuevo campo — clientes viejos lo ignoran
  createdAt: String   # Nuevo campo — nullable para backward compat
}
```

### Deprecar campos

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  username: String @deprecated(reason: "Use email instead")
}
```

### Breaking changes (nuevo schema o directive)

```javascript
const { buildSchema } = require("graphql");

// Opción 1: Correr dos schemas en diferentes endpoints
const v1Schema = buildSchema(`
  type User { id: ID!, name: String! }
`);
const v2Schema = buildSchema(`
  type User { id: ID!, name: String!, email: String! }
`);

// Opción 2: Usar @specifiedBy o custom directives para feature flags
const schema = buildSchema(`
  type User {
    id: ID!
    name: String!
    email: String
  }
`);
```

### Pautas de versionado GraphQL

- **Añadir campos, nunca remover** — clientes viejos siguen funcionando
- **Deprecar antes de remover** — usar directive `@deprecated`
- **Hacer nuevos campos nullable** — datos viejos pueden no tener el campo
- **Usar schema stitching/federation** para versiones mayores — rutear queries a subgraph v1 o v2
- **Trackear usage de campos** — remover campos deprecados solo cuando el usage baje a cero

## Deprecación y Sunset

### Headers de deprecación

```python
from fastapi import FastAPI, Response

app = FastAPI()

@app.get("/api/v1/users/{user_id}")
async def get_user_v1(user_id: str, response: Response):
    response.headers["Deprecation"] = "true"
    response.headers["Sunset"] = "Sun, 01 Jun 2025 00:00:00 GMT"
    response.headers["Link"] = '</api/v2/users/{user_id}>; rel="successor-version"'
    return {"id": user_id, "name": "Alice"}
```

### Timeline de deprecación

1. **Anunciar**: Añadir header `Deprecation: true`, actualizar docs
2. **Notificar**: Enviar email a consumidores de API, loguear deprecation warnings
3. **Sunset**: Añadir header `Sunset` con fecha de remoción (mínimo 6 meses)
4. **Monitorear**: Trackear usage del endpoint deprecado
5. **Remover**: Eliminar endpoint después de sunset date, retornar 410 Gone

## Patrones de Migración

### Patrón Strangler Fig

```python
from fastapi import FastAPI, Request
import httpx

app = FastAPI()

@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def router(path: str, request: Request):
    # Nuevos endpoints manejados por v2
    if path.startswith("v2/"):
        return await handle_v2(request)

    # Endpoints viejos — chequear si migraron
    migrated = ["users", "orders"]  # endpoints que migraron a v2
    base_path = path.split("/", 1)[0] if "/" in path else path

    if base_path in migrated:
        # Proxy a v2 con transformación de response
        return await proxy_to_v2(request)

    # No migrado — servir desde v1
    return await handle_v1(request)
```

### Parallel run (shadow deployment)

```python
import asyncio
import logging

logger = logging.getLogger("api_migration")

async def parallel_run(v1_handler, v2_handler, request):
    # Servir desde v1 (source of truth)
    v1_response = await v1_handler(request)

    # Correr v2 en background, comparar resultados
    try:
        v2_response = await v2_handler(request)
        if v1_response != v2_response:
            logger.warning(f"Response mismatch: v1={v1_response}, v2={v2_response}")
    except Exception as e:
        logger.error(f"v2 handler failed: {e}")

    return v1_response
```

## Pautas

- **Comenzar con versionado por URI path para APIs públicas** — más intuitivo para consumidores
- **Versionar a nivel router** — no por endpoint, para mantener versiones consistentes
- **Mantener versiones viejas corriendo** — al menos 6 meses después del anuncio de deprecación
- **Usar semantic versioning para SDKs** — major.minor.patch, breaking changes bump major
- **Documentar cambios entre versiones** — changelogs son obligatorios para APIs públicas
- **Monitorear usage de versiones** — trackear qué versiones se usan activamente antes de remover
- **Hacer cambios backward-compatible cuando sea posible** — campos aditivos, nuevos endpoints
- **Usar feature flags para rollout gradual** — testear nuevo comportamiento con un subconjunto de tráfico
- **Proveer guías de migración** — instrucciones step-by-step para transición v1 a v2
- **Setear rate limits más bajos en versiones viejas** — incentivar migración

## Errores Comunes

- No versionar desde day one — retrofit versionado es doloroso
- Breaking changes sin nueva versión — clientes se rompen silenciosamente
- Remover versiones viejas muy rápido — clientes necesitan tiempo para migrar
- Sin headers de deprecación — clientes descubren la remoción solo cuando se rompe
- Versionar cada cambio minor — reservar nuevas versiones para breaking changes
- No documentar diferencias entre versiones — consumidores adivinan qué cambió
- Usar múltiples estrategias de versionado simultáneamente — elegir una y ser consistente
- No testear versiones viejas después de deployar nuevas — regresiones en v1 pasan desapercibidas

## Preguntas Frecuentes

### ¿Cuándo debo crear una nueva versión de API?

Crear una nueva versión cuando haces breaking changes: remover campos, cambiar tipos de campos, cambiar estructura de response, cambiar error codes o alterar autenticación. Cambios aditivos (nuevos campos, nuevos endpoints) no requieren nueva versión.

### ¿Debo versionar APIs GraphQL?

No, GraphQL está diseñado para evolución de schema. Añadir campos, deprecar viejos con `@deprecated` y hacer nuevos campos nullable. Solo crear un nuevo schema para cambios verdaderamente incompatibles, y aún así, considerar correr dos schemas en paralelo.

### ¿Por cuánto tiempo debo soportar versiones viejas?

Mínimo 6 meses para APIs internas y 12-24 meses para APIs públicas. Usar el header `Sunset` para comunicar la fecha de remoción. Monitorear usage — no remover una versión mientras tenga tráfico significativo.
