---
contentType: docs
slug: api-documentation
templateType: api-doc
title: "Plantilla de Documentación de API"
description: "Una plantilla reutilizable para documentar APIs REST y GraphQL con endpoints, schemas, errores y ejemplos."
metaDescription: "Usa esta plantilla de documentación de API para documentar endpoints, schemas de request/response, códigos de error y autenticación para APIs REST y GraphQL."
difficulty: beginner
topics:
  - api
tags:
  - api
  - documentación
  - template
  - rest
  - openapi
  - swagger
relatedResources:
  - /guides/api/rest-api-design-guide
  - /recipes/api/call-rest-api
  - /recipes/api/handle-errors
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usa esta plantilla de documentación de API para documentar endpoints, schemas de request/response, códigos de error y autenticación para APIs REST y GraphQL."
  keywords:
    - documentación api
    - rest api docs
    - openapi template
    - swagger template
    - documentación endpoints
---

## Estructura de la plantilla

Usa esta plantilla como base para documentar cualquier API HTTP. Reemplaza las secciones entre corchetes con el contenido específico de tu API.

---

## 1. Visión general

### Base URL

```
https://api.example.com/v1
```

### Autenticación

Todos los endpoints requieren un Bearer token en el header `Authorization`:

```
Authorization: Bearer <your_api_key>
```

### Content-Type

Requests y responses usan `application/json` a menos que se especifique lo contrario. Consulta [Parse JSON](/recipes/data/parse-json) para manejar payloads JSON.

### Rate Limits

- 100 requests por minuto para usuarios autenticados
- 10 requests por minuto para usuarios anónimos
- Headers de rate limit incluidos en todas las responses:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

---

## 2. Endpoints

### [Nombre del Recurso]

#### `GET /[resource]`

Lista todos los [recursos] con filtrado y paginación opcionales.

**Query Parameters**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `page` | integer | No | Número de página (default: 1) |
| `limit` | integer | No | Items por página (default: 20, max: 100) |
| `sort` | string | No | Campo y dirección de ordenamiento (`created_at:desc`) |
| `filter[field]` | string | No | Filtrar por valor de campo |

**Response `200 OK`**

```json
{
  "data": [
    {
      "id": "string",
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

#### `POST /[resource]`

Crea un nuevo [recurso].

**Request Body**

```json
{
  "name": "string (requerido, max 255 chars)",
  "description": "string (opcional, max 1000 chars)"
}
```

**Response `201 Created`**

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "created_at": "2026-01-01T00:00:00Z"
}
```

#### `GET /[resource]/{id}`

Obtiene un [recurso] por ID.

**Path Parameters**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | string | Sí | Identificador único del recurso |

**Response `200 OK`**

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-01T00:00:00Z"
}
```

#### `PATCH /[resource]/{id}`

Actualiza parcialmente un [recurso]. Solo los campos proporcionados son modificados.

**Request Body**

```json
{
  "name": "string (opcional)",
  "description": "string (opcional)"
}
```

**Response `200 OK`**

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "updated_at": "2026-01-01T00:00:00Z"
}
```

#### `DELETE /[resource]/{id}`

Elimina un [recurso] por ID.

**Response `204 No Content`**

---

## 3. Error Responses

Todos los errores siguen esta estructura. Para una plantilla dedicada de respuestas de error, consulta [Plantilla de Respuesta de Error API](/docs/templates/api-error-response-template). Consulta [Input Validation](/recipes/api/input-validation) para patrones de validación de requests.

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Descripción legible por humanos",
    "details": [
      {
        "field": "name",
        "issue": "is required"
      }
    ]
  }
}
```

### Códigos HTTP comunes

| Status | Código | Descripción |
|--------|--------|-------------|
| 400 | `bad_request` | Request malformado o error de validación |
| 401 | `unauthorized` | Autenticación faltante o inválida |
| 403 | `forbidden` | Permisos insuficientes |
| 404 | `not_found` | El recurso no existe |
| 409 | `conflict` | Conflicto de recurso (ej. campo único duplicado) |
| 422 | `unprocessable_entity` | Error de validación semántica |
| 429 | `rate_limited` | Demasiados requests |
| 500 | `internal_error` | Error del lado del servidor |

---

## 4. SDKs y herramientas

- **cURL**: Todos los ejemplos usan comandos cURL estándar
- **Postman**: Importa nuestro [spec de OpenAPI](https://api.example.com/openapi.json)
- **OpenAPI**: Spec auto-generado disponible en `/openapi.json`

---

## 5. Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0.0 | 2026-06-10 | Release inicial |

---

## Guía de personalización

1. Reemplaza `[resource]` con tu entidad de dominio real (ej. `users`, `orders`, `products`)
2. Agrega query parameters y campos de response específicos de cada endpoint
3. Incluye ejemplos de autenticación para OAuth, API keys o JWT
4. Agrega ejemplos de código en Python, JavaScript y Java
5. Linkea a tu spec de OpenAPI/Swagger para documentación interactiva

## Preguntas Frecuentes

### Debería documentar cada endpoint o solo los públicos?

Documenta cada endpoint consumido por clientes, incluyendo microservicios internos. Los endpoints solo-internos pueden tener documentación más ligera, pero deberían ser descubribles y entendibles por otros equipos.

### Cuál es la diferencia entre documentación de API y una spec OpenAPI?

La documentación de API es la guía legible por humanos con explicaciones, ejemplos y contexto. Una [spec OpenAPI](/docs/templates/api-documentation) es el contrato legible por máquinas que potencia docs interactivos, generación de clientes y testing de contratos. Mantén ambos.

### Cómo mantengo la documentación de API sincronizada con el código?

Genera la documentación desde anotaciones de código o specs OpenAPI como parte de tu pipeline de CI. Usa herramientas como Swagger UI, Redoc o Stoplight para renderizar specs automáticamente. Consulta [REST API Design Guide](/guides/api/rest-api-design-guide) para ver lo que funciona en diseño de API. La documentación manual se desactualiza rápidamente sin automatización.


## Comparacion de Variantes

| Variante | Contexto | Enfoque | Notas |
|----------|----------|---------|-------|
| REST con OpenAPI | API publica, clientes externos | Spec OpenAPI + docs narrativas | Genera clientes automaticamente |
| GraphQL con schema | API con consultas flexibles | Schema SDL + ejemplos de queries | Una sola endpoint |
| gRPC con proto | Microservicios internos | Archivos .proto + docs generadas | Binario, alto rendimiento |
| Markdown simple | API interna pequena | Documentacion manual en repo | Suficiente para 2-3 endpoints |

## Escenario Detallado: Documentar un Endpoint de Creacion de Pedidos

```text
Endpoint: POST /v1/orders
Autenticacion: Bearer token (JWT)
Rate limit: 100 req/min por usuario

Request:
  POST /v1/orders HTTP/1.1
  Host: api.example.com
  Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
  Content-Type: application/json
  Idempotency-Key: client-uuid-12345

  {
    "customer_id": "usr_abc123",
    "items": [
      {"sku": "PROD-001", "quantity": 2},
      {"sku": "PROD-002", "quantity": 1}
    ],
    "shipping_address_id": "addr_xyz789"
  }

Response 201 Created:
  HTTP/1.1 201 Created
  Content-Type: application/json
  Location: /v1/orders/ord_def456

  {
    "id": "ord_def456",
    "customer_id": "usr_abc123",
    "status": "pending",
    "items": [
      {"sku": "PROD-001", "quantity": 2, "unit_price_cents": 1999},
      {"sku": "PROD-002", "quantity": 1, "unit_price_cents": 4999}
    ],
    "total_cents": 8997,
    "currency": "USD",
    "placed_at": "2026-07-11T14:30:00Z"
  }

Headers clave:
  Idempotency-Key: Previene duplicados si el cliente reintenta
  Location: URL del recurso creado para redirect

Errores posibles:
  400 - customer_id no existe o esta inactivo
  409 - Idempotency-Key ya usada con body diferente
  422 - quantity <= 0 o SKU no encontrado
```

### Como documento paginacion cursor-based vs offset-based?

Documenta ambos si los soportas. Offset-based usa `page` y `limit` (mas simple, pero lento en datasets grandes). Cursor-based usa `after` (un ID u opaco cursor) y `limit` (mas eficiente, no salta registros). Incluye ejemplos de ambos en la documentacion y recomienda cursor-based para datasets que superan 10,000 registros.

### Deberia incluir ejemplos de codigo en multiples lenguajes?

Si tu API tiene consumidores en multiples lenguajes, si. Incluye ejemplos en cURL (universal), Python (requests), y JavaScript (fetch). Manten los ejemplos cortos y enfocados en un endpoint cada uno. Para APIs internas con un solo lenguaje consumidor, un lenguaje basta.
