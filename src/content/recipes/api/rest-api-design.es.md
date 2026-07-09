---
contentType: recipes
slug: rest-api-design
title: "Diseño de APIs REST: Lo que funciona"
description: "Diseña APIs REST robustas y escalables con métodos HTTP adecuados, códigos de estado, versionado y estrategias de paginación."
metaDescription: "Lo que funciona para diseñar APIs REST: métodos HTTP, códigos de estado, versionado, paginación, HATEOAS y convenciones de nomenclatura de recursos."
difficulty: intermediate
topics:
  - api
tags:
  - rest-api
  - http
  - api
  - rest
  - backend
relatedResources:
  - /docs/api-error-response-template
  - /guides/rest-api-design-guide
  - /recipes/call-rest-api
  - /recipes/handle-cors
  - /recipes/idempotent-api-endpoints
lastUpdated: "2026-07-09"
author: "StackPractices"
seo:
  metaDescription: "Lo que funciona para diseñar APIs REST: métodos HTTP, códigos de estado, versionado, paginación, HATEOAS y convenciones de nomenclatura de recursos."
  keywords:
    - rest-api
    - api-design
    - http
    - backend
---
## Visión General

REST es el estilo arquitectónico dominante para diseñar APIs de red. Una API REST bien diseñada usa la semántica HTTP de manera consistente, provee URLs predecibles y devuelve códigos de estado significativos. Un diseño deficiente conduce a consumidores confundidos, clientes rotos e integraciones frágiles.

## Cuándo Usar

Usa este recurso cuando:

- Diseñes una API pública o interna desde cero
- Refactorices una API estilo RPC legacy a REST
- Documentes una API con OpenAPI/Swagger
- Elijas entre [REST](/recipes/api/call-rest-api), [GraphQL](/recipes/api/graphql-api) o [gRPC](/recipes/api/grpc-api) para un nuevo servicio

## Cuándo Evitar

- **Comunicación bidireccional en tiempo real**: Usa WebSockets o Server-Sent Events. REST es solo request-response.
- **Queries complejas controladas por el cliente**: GraphQL permite a los clientes pedir exactamente los campos que necesitan. REST hace over-fetch o under-fetch.
- **Llamadas internas de alto rendimiento**: gRPC con Protobuf es 5-10x más rápido que REST/JSON para microservicios internos.
- **Streaming de payloads grandes**: REST bufferiza respuestas completas. Usa chunked transfer o un protocolo de streaming.

## Solución

### Nomenclatura de Recursos

```
GET    /users                # Listar usuarios
GET    /users/:id            # Obtener un usuario
POST   /users                # Crear un usuario
PUT    /users/:id            # Actualización completa
PATCH  /users/:id            # Actualización parcial
DELETE /users/:id            # Eliminar un usuario
GET    /users/:id/orders     # Recurso anidado
```

### Códigos de Estado

```javascript
// Respuestas exitosas
200 OK              // GET, PUT, DELETE exitoso
201 Created         // POST exitoso
204 No Content      // DELETE exitoso (opcional)

// Errores del cliente
400 Bad Request     // Fallo de validación
401 Unauthorized    // Token de auth faltante
403 Forbidden       // Permisos insuficientes
404 Not Found       // El recurso no existe
409 Conflict        // Duplicado o conflicto de estado
422 Unprocessable   // Error de validación semántica

// Errores del servidor
500 Internal Error  // Fallo inesperado del servidor
502 Bad Gateway     // Fallo upstream
503 Service Unavail // Rate limiting o mantenimiento
```

### Paginación con Cursor

```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6MTAwfQ==",
    "prev_cursor": null,
    "has_more": true
  }
}
```

### Formato de Respuesta de Error

Devuelve errores en una estructura consistente:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "field": "email",
    "details": [{"field": "email", "message": "Email is required"}]
  }
}
```

### Estrategias de Versionado

```javascript
// Basado en URL (más común)
GET /v1/users
GET /v2/users

// Basado en header (URLs más limpias, más difícil de testear)
Accept: application/vnd.api+json;version=1

// Query parameter (fácil pero no recomendado)
GET /users?version=1
```

El versionado basado en URL es el más explícito y fácil de testear. El basado en header es más limpio pero más difícil de debuggear en navegadores.

### Claves de Idempotencia

Para requests POST que pueden ser reintentados (pagos, creación de órdenes), acepta una clave de idempotencia:

```http
POST /payments
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{"amount": 1000, "currency": "USD"}
```

El servidor almacena la clave y devuelve la respuesta original en reintentos. Consulta [Endpoints Idempotentes](/recipes/api/idempotent-api-endpoints) para implementación.

### Respuesta de Rate Limiting

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1719900000

{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Retry after 60 seconds."
  }
}
```

## Explicación

REST aprovecha HTTP como protocolo de aplicación, no solo como transporte:

- **Idempotencia**: GET, PUT, DELETE deben ser seguros de reintentar. Consulta [Endpoints Idempotentes](/recipes/api/idempotent-api-endpoints) para patrones. POST no es idempotente.
- **Sin estado**: Cada request contiene toda la información necesaria; sin sesión del lado del servidor.
- **Cacheabilidad**: Usa Cache-Control, ETag y Last-Modified agresivamente. Consulta [Manejo de CORS](/recipes/api/handle-cors) para configuración de headers.
- **HATEOAS**: Incluye links a recursos relacionados (opcional pero mejora descubribilidad).

## Variantes

| Estilo | Caso de Uso | Notas |
|--------|-------------|-------|
| REST | CRUD, orientado a recursos | Ecosistema maduro; caching HTTP |
| GraphQL | Queries flexibles; mobile | Un solo endpoint; client-driven |
| gRPC | Microservicios internos | Binario; streaming; schema-first |
| JSON-RPC | RPC simple | Liviano; menos nativo HTTP |
| tRPC | TypeScript end-to-end | Type-safe; sin codegen; solo TS |
| SOAP | Enterprise; banca | XML; WS-Security; verboso |

## Avanzado: Negociación de Contenido

Soporta múltiples formatos de respuesta vía headers Accept:

```http
GET /users/42
Accept: application/json      # default
Accept: application/xml        # clientes legacy
Accept: application/csv        # exportación de datos
```

El servidor selecciona el serializer basado en Accept. Devuelve 406 Not Acceptable si el formato no está soportado.

## Avanzado: Requests Condicionales

Usa ETag e If-None-Match para caching:

```http
# Primera request
GET /users/42
ETag: "abc123"

# Request subsiguiente
GET /users/42
If-None-Match: "abc123"

# El servidor devuelve 304 si no cambió
HTTP/1.1 304 Not Modified
```

Para updates concurrentes, usa If-Match con ETag para optimistic locking:

```http
PUT /users/42
If-Match: "abc123"
```

Si el ETag ya no coincide (alguien más modificó el recurso), devuelve 412 Precondition Failed.

## Lo que funciona

- **Usa sustantivos plurales**: /orders, no /order ni /getOrder
- **Versiona en la URL**: /v1/users (más explícito que headers)
- **Devuelve estructura consistente**: { data, error, meta }
- **Soporta filtrado**: GET /users?role=admin&active=true
- **Rate limit desde el inicio**: Devuelve 429 con header Retry-After. Consulta [Rate Limiting con Redis](/recipes/api/api-rate-limiting-redis) para implementación.

## Errores Comunes

1. **Usar verbos en URLs**: /createUser, /getOrders — usa sustantivos y métodos HTTP
2. **Ignorar códigos HTTP**: Devolver 200 con cuerpo de error rompe middleware. Consulta [Manejo de Errores](/recipes/api/handle-errors) para uso de códigos de estado.
3. **No versionar**: Cambios breaking sin versionado abandonan clientes existentes
4. **Over-fetching**: Devolver objetos anidados enormes cuando el cliente necesita un subset
5. **Faltar negociación de contenido**: No respetar Accept y Content-Type headers

## Preguntas Frecuentes

### ¿Debería usar PUT o PATCH para actualizaciones?

PUT para reemplazo completo (todos los campos requeridos). PATCH para actualizaciones parciales (solo campos cambiados). PUT es idempotente: enviar el mismo PUT dos veces produce el mismo estado. PATCH puede ser idempotente pero no se requiere que lo sea.

### ¿Cómo manejo uploads de archivos en REST?

Usa multipart/form-data para uploads simples. Para archivos grandes, usa signed URLs (S3, GCS) o uploads resumibles. El cliente sube directamente al object storage, luego notifica a tu API con la ubicación del archivo. Esto evita streamear archivos grandes a través de tu servidor de API.

### ¿Vale la pena implementar HATEOAS?

Para APIs públicas consumidas por diversos clientes, sí — mejora la descubribilidad y reduce el harcoding de URLs. Para APIs internas con clientes generados, opcional. La mayoría de las APIs en producción omiten HATEOAS y documentan las URLs en specs de OpenAPI.

### ¿Cómo manejo la paginación para datasets grandes?

Usa paginación basada en cursor para datasets grandes o que cambian frecuentemente. La paginación basada en offset (page=2&limit=20) es más simple pero salta items cuando se insertan datos entre requests. Codifica el cursor como base64 de la sort key del último item.

### ¿Qué métodos HTTP debería usar?

GET (lectura, cacheable), POST (creación, no idempotente), PUT (update completo, idempotente), PATCH (update parcial), DELETE (eliminación, idempotente). Nunca uses GET para cambios de estado — rompe el caching y viola la semántica HTTP.

### ¿Cómo versiono mi API?

El versionado basado en URL (/v1/users) es el más común y fácil de testear. Incrementa la versión en cambios breaking: campos eliminados, tipos cambiados, semántica modificada. Cambios no-breaking (nuevos campos, nuevos endpoints) no requieren incrementar la versión.

### ¿Debería envolver las respuestas en un envelope?

Para endpoints de listado, sí — incluye metadata de paginación. Para recursos individuales, el envelope es opcional. Si envuelves, usa una estructura consistente: `{ data, error, meta }`. Algunas APIs devuelven data directamente con info de error en headers.

### ¿Cómo manejo la autenticación en REST?

Bearer tokens en el header Authorization: `Authorization: Bearer <token>`. API keys en headers (X-API-Key) para casos simples. Evita poner tokens en parámetros de URL — aparecen en logs del servidor e historial del navegador.

### ¿Cuál es la diferencia entre 401 y 403?

401 Unauthorized significa que la request carece de credenciales de autenticación. 403 Forbidden significa que las credenciales son válidas pero el usuario carece de permisos para el recurso específico. Siempre devuelve 401 antes de auth, 403 después de auth pero sin permisos.

### ¿Cómo manejo operaciones de larga duración?

Devuelve 202 Accepted con una URL de estado. El cliente hace polling de la URL de estado hasta que la operación completa. Para webhooks, devuelve 202 y envía un POST a la URL del webhook del cliente cuando termine. Consulta [Async API Pattern](/patterns/design/async-generator-pattern) para patrones.

### ¿Debería usar REST o GraphQL?

REST para APIs orientadas a recursos con patrones de acceso predecibles. GraphQL cuando los clientes necesitan queries flexibles (e.g., apps mobile que fetchean diferentes conjuntos de campos). GraphQL añade complejidad: parsing de queries, resolución N+1, y el caching es más difícil.

### ¿Cómo testeo APIs REST?

Tests de integración con un cliente HTTP real (supertest para Node.js, requests para Python, MockMvc para Java). Testea códigos de estado, bodies de respuesta y formatos de error. Para contract testing, usa herramientas como Pact o Spring Cloud Contract.

### ¿Qué es HATEOAS y debería implementarlo?

HATEOAS (Hypermedia As The Engine Of Application State) incluye hyperlinks en las respuestas de la API para que los clientes puedan navegar la API dinámicamente. Ejemplo: una respuesta de usuario incluye `_links` con URLs de `self`, `edit` y `orders`. Habilita acoplamiento débil entre cliente y servidor pero añade tamaño de respuesta y complejidad. La mayoría de las APIs de producción omiten HATEOAS completo y usan convenciones de URL documentadas.

### ¿Cómo manejo versionado de API?

Tres estrategias comunes: path URI (`/v1/users`), parámetro de query (`/users?version=1`), y header (`Accept: application/vnd.api.v1+json`). Path URI es el más popular porque es explícito y fácil de testear. Deprecar versiones viejas con un header sunset y guía de migración.

### ¿Qué código de estado debo usar para errores de validación?

Devuelve 422 Unprocessable Entity cuando el body de la request es sintácticamente válido pero semánticamente incorrecto (e.g., campos requeridos faltantes, formato de email inválido). Usa 400 Bad Request para JSON malformado o headers content-type faltantes. Incluye un array `details` en la respuesta de error apuntando a errores de campos específicos.
