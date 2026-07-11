---
contentType: guides
slug: rest-api-design-guide
title: "Guía de Diseño de APIs REST"
description: "Una guía completa para diseñar APIs REST limpias, escalables y mantenibles."
metaDescription: "Aprende mejores prácticas de diseño de APIs REST: estructura de URLs, métodos HTTP, códigos de estado, versionado, paginación y manejo de errores."
difficulty: intermediate
topics:
  - api
  - architecture
tags:
  - api
  - architecture
  - arquitectura
  - diseno
  - http
  - mejores-practicas
  - rest
relatedResources:
  - /recipes/api/call-rest-api
  - /recipes/api/handle-errors
  - /patterns/design/factory-pattern
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende mejores prácticas de diseño de APIs REST: estructura de URLs, métodos HTTP, códigos de estado, versionado, paginación y manejo de errores."
  keywords:
    - diseno api rest
    - mejores practicas api
    - arquitectura restful
    - metodos http
    - versionado api
    - paginacion api
---

# Guía de Diseño de APIs REST

## Overview

REST (Representational State Transfer) es el estilo arquitectónico dominante para diseñar aplicaciones en red. Una API REST bien diseñada es predecible, autodescriptiva y fácil de consumir desde múltiples clientes.

A continuación: los principios fundamentales y decisiones prácticas que separan las APIs amateur de las de grado producción.

## When to Use

Esta guía aplica cuando:
- Construyes APIs HTTP públicas o internas
- Diseñas límites de [comunicación entre microservicios](/guides/architecture/microservices-architecture-guide)
- Creas servicios backend consumidos por web, mobile o clientes CLI
- Migras de RPC o SOAP a REST

## Core Principles

### 1. Recursos y URLs

Una API REST se organiza alrededor de **recursos** — sustantivos, no acciones:

| Bien (Recurso) | Mal (Acción) |
|-----------------|--------------|
| `GET /users` | `GET /getUsers` |
| `POST /orders` | `POST /createOrder` |
| `DELETE /posts/42` | `DELETE /deletePost?id=42` |

Usa sustantivos plurales para colecciones y singulares para instancias específicas:

```
GET    /users          # Listar todos los usuarios
GET    /users/123      # Obtener usuario 123
POST   /users          # Crear nuevo usuario
PUT    /users/123      # Reemplazar usuario 123
PATCH  /users/123      # Actualizar parcialmente usuario 123
DELETE /users/123      # Eliminar usuario 123
```

### 2. Métodos HTTP

| Método | Propósito | Idempotente |
|--------|---------|------------|
| `GET` | Recuperar un recurso | Sí |
| `POST` | Crear un recurso | No |
| `PUT` | Reemplazar un recurso | Sí |
| `PATCH` | Actualizar parcialmente | Sí (usualmente) |
| `DELETE` | Eliminar un recurso | Sí |

### 3. Códigos de Estado

Usa el código HTTP correcto para comunicar la intención:

| Código | Significado | Cuándo Usar |
|------|---------|-------------|
| `200 OK` | Éxito | Respuesta estándar para peticiones exitosas |
| `201 Created` | Recurso creado | Después de un `POST` exitoso |
| `204 No Content` | Éxito vacío | Después de un `DELETE` exitoso |
| `400 Bad Request` | Error cliente | Input inválido, fallo de validación |
| `401 Unauthorized` | No autenticado | Credenciales faltantes o inválidas |
| `403 Forbidden` | Sin permiso | Autenticado pero no autorizado |
| `404 Not Found` | Recurso no encontrado | URL o ID no existe |
| `409 Conflict` | Conflicto de estado | Email duplicado, edición concurrente |
| `422 Unprocessable` | Error semántico | JSON válido pero lógica de negocio inválida |
| `500 Internal Error` | Error servidor | Fallo inesperado, loguear y reportar |

## Advanced Patterns

### Versionado

Siempre versiona tu API desde el día uno:

```
/api/v1/users
/api/v2/users
```

Prefiere versionado por URL sobre headers por simplicidad. Documenta la política de deprecación y retiro.

### Paginación

Para endpoints de colección, nunca devuelvas listas sin límite:

```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "per_page": 20,
    "total": 145,
    "total_pages": 8
  }
}
```

Usa paginación por cursor para datos de alta rotación, por offset para datasets estables.

### Filtrado, Ordenamiento y Búsqueda

```
GET /users?role=admin&sort=-created_at
GET /products?search=laptop&category=electronics
```

Usa query parameters consistentemente. Documenta los filtros soportados en tu documentación API.

### Respuestas de Error

Devuelve un envelope de error consistente:

```json
{
  "error": {
    "code": "INVALID_EMAIL",
    "message": "El formato de email es inválido.",
    "field": "email",
    "documentation_url": "https://docs.example.com/errors/INVALID_EMAIL"
  }
}
```

## Lo que funciona

- **Usa JSON** como tipo de contenido por defecto (`application/json`)
- **Devuelve envelopes consistentes** — envuelve respuestas en una estructura predecible
- **Soporta headers `Content-Type` y `Accept`** correctamente
- **Implementa [rate limiting](/recipes/api/rate-limiting)** — protege tu infraestructura y usuarios
- **Usa HTTPS en todas partes** — nunca expongas APIs sobre HTTP plano. Consulta [mejores prácticas de seguridad](/guides/security/security-best-practices-guide).
- **Documenta con OpenAPI** — genera specs y docs interactivas
- **Versiona desde v1** — versionado retroactivo es doloroso
- **Devuelve headers `Location`** en respuestas `201 Created`

## Common Mistakes

- **Usar verbos en URLs** — `/createUser` rompe la semántica REST
- **Devolver `200 OK` para errores** — confunde clientes y rompe [lógica de reintentos](/recipes/architecture/retry-backoff)
- **Sin paginación** — endpoints que colapsan bajo carga real. Consulta [estrategias de paginación](/recipes/api/cursor-pagination-postgresql).
- **Exponer IDs internos** — usa UUIDs o identificadores basados en slugs
- **Naming inconsistente** — mezclar `camelCase` y `snake_case` en JSON
- **Manejo de `Content-Type` faltante** — clientes reciben páginas HTML en lugar de JSON
- **Sin rate limiting** — invita abuso y DDoS accidental
- **Acoplamiento fuerte al schema de BD** — filtra detalles de implementación

## Frequently Asked Questions

**Q: ¿Debería usar PUT o PATCH para actualizaciones?**
A: Usa `PUT` para reemplazos completos (el cliente envía el recurso completo) y `PATCH` para actualizaciones parciales. Si solo soportas uno, documéntalo claramente.

**Q: ¿Cómo manejo uploads de archivos en una API REST?**
A: Usa `multipart/form-data` para uploads simples. Para archivos grandes, usa URLs prefirmadas (estilo S3) o endpoints de upload por chunks.

**Q: ¿Qué es HATEOAS y lo necesito?**
A: HATEOAS (Hypermedia as the Engine of Application State) incluye links en respuestas. Es deseable para APIs públicas pero excesivo para servicios internos.

**Q: ¿Cómo autentico una API REST?**
A: Para server-to-server, usa [API keys](/recipes/security/api-security-headers) o OAuth 2.0 client credentials. Para apps orientadas a usuarios, usa [OAuth 2.0 con PKCE](/recipes/security/oauth2-pkce-spa) o auth basada en sesiones con [protección CSRF](/recipes/security/csrf-protection).

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.


## Temas Avanzados

### Idempotencia

La idempotencia asegura que reintentar un request produce el mismo resultado que el request inicial. Esto es critico para procesamiento de pagos, creacion de pedidos y cualquier operacion donde fallos de red pueden causar reintentos del cliente.

Usa un header `Idempotency-Key` en requests `POST`:

```text
POST /v1/orders
Idempotency-Key: client-uuid-12345
Content-Type: application/json

{"customer_id": "usr_123", "items": [{"sku": "PROD-001", "quantity": 2}]}
```

Comportamiento del servidor:
- Primer request con una key nueva: procesa normalmente, almacena resultado
- Requests subsecuentes con misma key y mismo body: retorna resultado almacenado
- Misma key con body diferente: retorna 409 Conflict
- Las keys expiran despues de 24 horas (configurable)

### Negociacion de Contenido

Soporta multiples formatos de respuesta via el header `Accept`:

```text
GET /v1/users/123
Accept: application/json       -> respuesta JSON
Accept: application/xml        -> respuesta XML (si se soporta)
Accept: application/vnd.api+json -> formato JSON:API (si se soporta)
```

Usa `application/json` por defecto cuando el header falta. Retorna `406 Not Acceptable` si el formato solicitado no se soporta.

### Operaciones en Lote

Para actualizaciones o creaciones en lote, usa un endpoint dedicado:

```text
POST /v1/users/bulk
Content-Type: application/json

{
  "users": [
    {"email": "alice@example.com", "name": "Alice"},
    {"email": "bob@example.com", "name": "Bob"},
    {"email": "charlie@example.com", "name": "Charlie"}
  ]
}
```

Respuesta con resultados por item:

```json
{
  "results": [
    {"index": 0, "status": 201, "id": "usr_001"},
    {"index": 1, "status": 201, "id": "usr_002"},
    {"index": 2, "status": 422, "error": {"code": "DUPLICATE_EMAIL"}}
  ],
  "summary": {"created": 2, "failed": 1}
}
```

### Configuracion CORS

```text
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type, Idempotency-Key
Access-Control-Max-Age: 3600
```

Nunca uses `Access-Control-Allow-Origin: *` con credenciales. Especifica origenes exactos para requests con credenciales.

### Headers de Rate Limiting

```text
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1721003460
Retry-After: 30
```

Retorna `429 Too Many Requests` con un header `Retry-After` cuando se excede el limite.

### Webhooks

Para notificaciones asincronas, usa webhooks con verificacion de firma:

```text
POST /webhooks/orders
X-Webhook-Signature: sha256=abc123...
X-Webhook-Event: order.created
X-Webhook-Timestamp: 1721003460

{"event": "order.created", "order_id": "ord_123", "timestamp": "2026-07-11T14:30:00Z"}
```

Verifica la firma usando HMAC-SHA256 con un secret compartido. Rechaza requests con timestamps mayores a 5 minutos para prevenir replay attacks.

### Como manejo operaciones de larga duracion?

Para operaciones que tardan mas de unos segundos, retorna `202 Accepted` con una URL de estado:

```text
POST /v1/exports

HTTP/1.1 202 Accepted
Location: /v1/exports/exp_123/status

{"export_id": "exp_123", "status": "processing"}
```

Los clientes hacen polling de la URL de estado hasta que la operacion completa:

```text
GET /v1/exports/exp_123/status

{"export_id": "exp_123", "status": "completed", "download_url": "/v1/exports/exp_123/download"}
```

### Deberia usar PATCH o JSON Patch (RFC 6902)?

PATCH simple con un body JSON parcial es mas facil para los clientes y suficiente para la mayoria de casos. JSON Patch (RFC 6902) usa operaciones como `add`, `remove`, `replace`, `move` y es mas preciso para estructuras anidadas complejas. Usa JSON Patch cuando necesitas operaciones atomicas en arrays u objetos anidados. Documenta que formato acepta tu API.

### Como diseno la deprecacion de API?

Agrega un header `Deprecation` y un header `Sunset` a los endpoints deprecados:

```text
Deprecation: true
Sunset: Sat, 31 Dec 2026 23:59:59 GMT
Link: </v2/users>; rel="successor-version"
```

Anuncia la deprecacion al menos 6 meses antes del sunset. Loguea el uso de endpoints deprecados y notifica a los consumidores individualmente. Retorna `410 Gone` despues del sunset.
