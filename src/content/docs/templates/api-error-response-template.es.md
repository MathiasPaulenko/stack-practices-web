---


contentType: docs
slug: api-error-response-template
templateType: api-error-response
title: "Plantilla de Respuesta de Error de API"
description: "Una plantilla reutilizable para respuestas de error de API consistentes, informativas y amigables para desarrolladores que reducen el tiempo de depuración."
metaDescription: "Plantilla estandarizada de respuesta de error de API con RFC 7807 Problem Details, campos estructurados y mejores prácticas para APIs HTTP amigables."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - error-handling
  - template
  - rest-api
  - rfc-7807
  - developer-experience
relatedResources:
  - /docs/api-documentation
  - /docs/api-deprecation-notice-template
  - /guides/rest-api-design-guide
  - /recipes/rest-api-design
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Plantilla estandarizada de respuesta de error de API con RFC 7807 Problem Details, campos estructurados y mejores prácticas para APIs HTTP amigables."
  keywords:
    - plantilla respuesta error api
    - rfc 7807 problem details
    - formato error rest api
    - manejo errores api
    - errores amigables desarrolladores


---

## Resumen

Las respuestas de error de API son la parte más importante de la experiencia del desarrollador. Cuando una llamada a una API falla, la respuesta de error es lo que el desarrollador lee para arreglar su código. Las buenas respuestas de error reducen tickets de soporte, aceleran la integración y generan confianza. Las malas respuestas obligan a los desarrolladores a adivinar, abrir tickets o rendirse.

Esta plantilla cubre:

1. **RFC 7807 Problem Details** — el formato estándar para errores de API HTTP
2. **Formato simple legacy** — para APIs internas o compatibilidad hacia atrás
3. **Catálogo de códigos de error** — mapeo de códigos HTTP a tipos de error específicos
4. **Validación a nivel de campo** — errores estructurados para respuestas `400 Bad Request`
5. **Mejores prácticas** — qué incluir, qué ocultar y cómo enlazar a docs

## Estructura de la Plantilla

Usa esta plantilla para construir respuestas de error consistentes y util para cualquier API REST o HTTP. Consulta también la [Plantilla de Documentación API](/docs/templates/api-documentation) para documentación de endpoints.

---

## RFC 7807 Problem Details (Recomendado)

```json
{
  "type": "https://api.example.com/errors/invalid-request",
  "title": "Solicitud Inválida",
  "status": 400,
  "detail": "El campo 'email' debe ser una dirección de correo válida.",
  "instance": "/orders/123e4567-e89b-12d3-a456-426614174000",
  "errors": [
    {
      "field": "email",
      "message": "debe ser una dirección de correo válida",
      "code": "invalid_format"
    }
  ]
}
```

### Referencia de Campos

| Campo | Requerido | Descripción |
|-------|-----------|-------------|
| `type` | Sí | URI que identifica el tipo de error y documentación legible |
| `title` | Sí | Resumen breve y legible del problema |
| `status` | Sí | Código de estado HTTP (debe coincidir con la respuesta actual) |
| `detail` | No | Explicación detallada específica para esta ocurrencia |
| `instance` | No | Referencia URI que identifica la ocurrencia específica del problema |
| `errors` | No | Arreglo de errores a nivel de campo para `400 Bad Request` |

---

## Formato Simple Legacy

Para APIs internas o compatibilidad hacia atrás, usa esta estructura ligera:

```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "El parámetro 'page_size' debe estar entre 1 y 100.",
    "request_id": "req_abc123xyz"
  }
}
```

---

## Ejemplos Completos por Código de Estado

### 400 Bad Request — Error de Validación

```json
{
  "type": "https://api.example.com/errors/validation-failed",
  "title": "Validación Fallida",
  "status": 400,
  "detail": "3 campos fallaron validación.",
  "instance": "/users",
  "errors": [
    {
      "field": "email",
      "message": "debe ser una dirección de correo válida",
      "code": "invalid_format"
    },
    {
      "field": "password",
      "message": "debe tener al menos 12 caracteres",
      "code": "min_length"
    },
    {
      "field": "role",
      "message": "debe ser uno de: admin, editor, viewer",
      "code": "invalid_enum"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "type": "https://api.example.com/errors/unauthorized",
  "title": "No Autorizado",
  "status": 401,
  "detail": "Header Authorization faltante o inválido. Usa autenticación Bearer token.",
  "instance": "/orders/123"
}
```

### 404 Not Found

```json
{
  "type": "https://api.example.com/errors/resource-not-found",
  "title": "Recurso No Encontrado",
  "status": 404,
  "detail": "La orden con ID '123e4567-e89b-12d3-a456-426614174000' no existe.",
  "instance": "/orders/123e4567-e89b-12d3-a456-426614174000"
}
```

### 429 Rate Limit Exceeded

```json
{
  "type": "https://api.example.com/errors/rate-limit-exceeded",
  "title": "Límite de Rate Excedido",
  "status": 429,
  "detail": "Has excedido el límite de 200 requests por minuto. Reintenta en 30 segundos.",
  "instance": "/reports"
}
```

Headers de respuesta para 429 deberían incluir:

```
Retry-After: 30
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1721003460
```

---

## Catálogo de Códigos de Error (Ejemplo)

| Estado HTTP | Código de Error | Cuándo Usar |
|-------------|-----------------|-------------|
| 400 | `INVALID_REQUEST` | Solicitud malformada genérica |
| 400 | `VALIDATION_ERROR` | Falló validación de esquema o regla de negocio |
| 401 | `UNAUTHORIZED` | Token de autenticación faltante o inválido |
| 403 | `FORBIDDEN` | Usuario autenticado sin permisos |
| 404 | `RESOURCE_NOT_FOUND` | El recurso solicitado no existe |
| 409 | `CONFLICT` | Recurso ya existe o conflicto de estado |
| 422 | `UNPROCESSABLE_ENTITY` | Falló validación semántica |
| 429 | `RATE_LIMIT_EXCEEDED` | Demasiadas solicitudes |
| 500 | `INTERNAL_ERROR` | Fallo inesperado del servidor |
| 503 | `SERVICE_UNAVAILABLE` | Interrupción temporal o mantenimiento |

---

## Lo que funciona

- **Siempre retorna un cuerpo** — Nunca envíes un cuerpo vacío para respuestas `4xx` o `5xx`
- **Usa RFC 7807 para APIs públicas** — Los consumidores esperan formatos estándar; las bibliotecas pueden analizarlos automáticamente
- **Incluye un ID de solicitud** — Esencial para correlacionar reportes de clientes con logs del servidor
- **No filtre stack traces** — Los detalles internos pertenecen a los logs, no a las respuestas
- **Localiza `detail` si es necesario** — Usa `Accept-Language` para mensajes localizados, pero mantén `title` estable
- **Enlaza a documentación** — El URI `type` debe llevar a una página de docs que explique el error y cómo corregirlo
- **Sé específico en errores de validación** — Di `"el teléfono debe coincidir con formato E.164"` en vez de `"entrada inválida"`
- **Incluye guía de reintento para 429** — el header `Retry-After` indica a los clientes cuándo reintentar
- **Usa códigos de error consistentes** — los clientes construyen lógica de retry basada en códigos específicos, no en estados HTTP

## Errores Comunes

- Retornar `500` con una página HTML plana — rompe clientes de API que esperan JSON
- Incluir stack traces o consultas SQL en el cuerpo del error — riesgo de seguridad
- Usar `"error": "algo salió mal"` genérico para cada fallo — imposible de depurar
- Cambiar nombres de campos de error entre versiones — rompe la lógica de parsing del cliente
- No loggear el contexto completo del error en el servidor — pierdes la capacidad de investigar
- Retornar `200 OK` con un cuerpo de error — viola la semántica HTTP y rompe middleware
- Diferentes formatos de error por endpoint — los clientes necesitan un formato consistente


## Comparacion de Variantes

| Variante | Contexto | Enfoque | Notas |
|----------|----------|---------|-------|
| RFC 7807 Problem Details | API publica, clientes externos | JSON estructurado con type, title, status | Estandar IETF, librerias disponibles |
| Formato simple legacy | API interna, compatibilidad atras | code + message + request_id | Minimo, suficiente para APIs pequenas |
| Errores GraphQL | API GraphQL | Arreglo errors con extensions | No usa codigos de estado HTTP |
| Errores gRPC | Microservicios internos | Codigos de estado 0-16 + detalles protobuf | Binario, alto rendimiento |

## Escenario Detallado: Manejar una Cascada de Errores

```text
Sistema: API de pedidos que llama a servicio de inventario
Flujo: POST /orders -> verificar stock -> crear pedido

Escenario: Servicio de inventario no responde (timeout)

Paso 1 - Deteccion del error:
  - Request a inventario timeout despues de 3s
  - Circuit breaker abierto (3 fallos consecutivos)
  - El error no es del cliente, es del downstream

Paso 2 - Respuesta al cliente:
  HTTP/1.1 503 Service Unavailable
  Content-Type: application/problem+json
  Retry-After: 60

  {
    "type": "https://api.example.com/errors/service-unavailable",
    "title": "Servicio No Disponible",
    "status": 503,
    "detail": "El servicio de inventario no esta disponible temporalmente. Reintenta en 60 segundos.",
    "instance": "/orders",
    "request_id": "req_abc123",
    "correlation_id": "corr_xyz789"
  }

Paso 3 - Logging interno:
  - Log completo: request original, timeout, circuit breaker state
  - Tag: downstream_timeout, service=inventory
  - Metric: inventory_timeout_count++
  - Trace span: inventario.call (estado=error, duracion=3001ms)

Paso 4 - Comunicacion al cliente:
  - 503 con Retry-After indica fallo temporal
  - El cliente debe reintentar con backoff exponencial
  - Si el cliente recibe 503 repetidamente, mostrar mensaje
    de mantenimiento en la UI

Paso 5 - Degradacion (opcional):
  - Si el circuit breaker esta abierto, aceptar pedidos en
    modo degradado (sin verificacion de stock)
  - Marcar pedido como "pending_stock_verification"
  - Cola de reconciliacion cuando inventario se recupere
```

### Como documento errores que varian segun el plan del cliente?

Usa el mismo codigo de error pero varia el `detail` segun el contexto. Por ejemplo, un plan gratuito que excede el limite de exports retorna 403 con `detail: "Tu plan permite 100 exports/mes. Actualiza para mas."`. No crees codigos de error separados por plan; el codigo identifica el problema, no el contexto del usuario.

### Deberia incluir timestamps en las respuestas de error?

Si, agrega un campo `timestamp` en formato ISO 8601. Esto ayuda a los clientes a correlacionar errores con sus propios logs y a reportar problemas con precision. Algunos equipos prefieren usar el header `Date` de la respuesta HTTP, pero incluirlo en el body es mas util para clientes que loguean solo el cuerpo del error.

## Variantes

### Errores GraphQL

GraphQL usa un formato de error diferente. Los errores se retornan en el arreglo `errors` de la respuesta, no como códigos de estado HTTP de error. Cada error incluye `message`, `locations`, `path`, y opcionalmente `extensions`:

```json
{
  "errors": [
    {
      "message": "El campo 'email' debe ser una dirección de correo válida.",
      "locations": [{ "line": 3, "column": 10 }],
      "path": ["createUser", "input", "email"],
      "extensions": { "code": "INVALID_FORMAT" }
    }
  ]
}
```

### Errores gRPC

gRPC usa códigos de estado (0-16) en lugar de códigos de estado HTTP. Mapea los códigos de estado de gRPC a tu catálogo de errores. Incluye `details` con información de error estructurada usando mensajes protobuf.

### Errores async/webhooks

Para webhooks, retorna errores como payloads de eventos. Incluye el ID del evento original, código de error, y un timestamp. Provee un endpoint de webhook de retry para que los clientes puedan re-reprobar entregas fallidas.

## Preguntas Frecuentes

### ¿Debería usar RFC 7807 para APIs internas?

Sí, incluso para APIs internas. La pequeña sobrecarga de agregar `type` y `title` se paga cuando otro equipo necesita integrarse, y te fuerza a documentar los casos de error.

### ¿Qué pasa si un error tiene múltiples causas?

Usa el arreglo `errors` con un objeto por causa. Cada objeto debe incluir `field`, `message` y opcionalmente `code`. Este patrón es común en fallas de validación donde múltiples campos son inválidos.

### ¿Cómo manejo errores de servicios downstream?

Envuelve los errores downstream en tu propio formato. Considera los patrones [Circuit Breaker](/patterns/design/circuit-breaker-pattern) y [Retry](/patterns/design/retry-pattern) para comunicación downstream resiliente. No proxies cuerpos de error de terceros directamente. Mapea el fallo downstream a uno de tus códigos de error documentados, loguea la respuesta upstream original y retorna un mensaje sanitizado al cliente.

### ¿Debería incluir un correlation ID además del request ID?

Sí. Un request ID identifica la solicitud del cliente. Un correlation ID traza la solicitud a través de servicios. Incluye ambos: `request_id` para el cliente y `correlation_id` para tracing interno. Esto ayuda a debuggear sistemas distribuidos donde una solicitud del cliente dispara múltiples llamadas a servicios.

### ¿Cómo versiono los formatos de respuesta de error?

Agrega campos nuevos, nunca elimines ni renombres existentes. Si necesitas breaking changes, crea un nuevo formato de error y usa content negotiation (`Accept: application/problem+json; version=2`) para que los clientes opten. Documenta la estrategia de versionado en tu [Documentación de API](/docs/templates/api-documentation).

### ¿Debería retornar diferentes errores para el mismo problema según el contexto?

No. La misma condición de error debería producir el mismo código y estado de error, independientemente del endpoint que lo disparó. La información específica del contexto va en `detail` e `instance`, no en el código de error.
