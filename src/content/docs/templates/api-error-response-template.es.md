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
  - /docs/templates/api-documentation
  - /docs/templates/api-deprecation-notice-template
  - /guides/api/rest-api-design-guide
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

## Estructura de la Plantilla

Usa esta plantilla para construir respuestas de error consistentes y accionables para cualquier API REST o HTTP. Consulta también la [Plantilla de Documentación API](/docs/templates/api-documentation) para documentación de endpoints.

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
| `status` | Sí | Código de estado HTTP (debe coincidir con la respuesta real) |
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

## Mejores Prácticas

- **Siempre retorna un cuerpo** — Nunca envíes un cuerpo vacío para respuestas `4xx` o `5xx`
- **Usa RFC 7807 para APIs públicas** — Los consumidores esperan formatos estándar; las bibliotecas pueden analizarlos automáticamente
- **Incluye un ID de solicitud** — Esencial para correlacionar reportes de clientes con logs del servidor
- **No filtre stack traces** — Los detalles internos pertenecen a los logs, no a las respuestas
- **Localiza `detail` si es necesario** — Usa `Accept-Language` para mensajes localizados, pero mantén `title` estable
- **Enlaza a documentación** — El URI `type` debe llevar a una página de docs que explique el error y cómo corregirlo
- **Sé específico en errores de validación** — Di `"el teléfono debe coincidir con formato E.164"` en vez de `"entrada inválida"`

## Errores Comunes

- Retornar `500` con una página HTML plana — rompe clientes de API que esperan JSON
- Incluir stack traces o consultas SQL en el cuerpo del error — riesgo de seguridad
- Usar `"error": "algo salió mal"` genérico para cada fallo — imposible de depurar
- Cambiar nombres de campos de error entre versiones — rompe la lógica de parsing del cliente
- No loggear el contexto completo del error en el servidor — pierdes la capacidad de investigar

## Preguntas Frecuentes

### ¿Debería usar RFC 7807 para APIs internas?

Sí, incluso para APIs internas. La pequeña sobrecarga de agregar `type` y `title` se paga cuando otro equipo necesita integrarse, y te fuerza a documentar los casos de error.

### ¿Qué pasa si un error tiene múltiples causas?

Usa el arreglo `errors` con un objeto por causa. Cada objeto debe incluir `field`, `message` y opcionalmente `code`. Este patrón es común en fallas de validación donde múltiples campos son inválidos.

### ¿Cómo manejo errores de servicios downstream?

Envuelve los errores downstream en tu propio formato. Considera los patrones [Circuit Breaker](/patterns/design/circuit-breaker-pattern) y [Retry](/patterns/design/retry-pattern) para comunicación downstream resiliente. No proxies cuerpos de error de terceros directamente. Mapea el fallo downstream a uno de tus códigos de error documentados, loguea la respuesta upstream original y retorna un mensaje sanitizado al cliente.
