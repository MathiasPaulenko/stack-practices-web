---
contentType: docs
slug: api-error-handling-guideline
title: "Guia de Manejo de Errores de API"
description: "Guia para estandarizar respuestas de error, codigos de estado y payloads de error en APIs REST y GraphQL."
metaDescription: "Estandariza respuestas de error de API con esta guia. Cubre codigos HTTP, payloads de error, IDs de error y estrategias de reintento."
difficulty: beginner
topics:
  - api
  - architecture
tags:
  - api
  - manejo-de-errores
  - codigos-http
  - rest
  - graphql
  - guia
relatedResources:
  - /docs/architecture/microservice-contract-template
  - /docs/security/api-security-review-template
  - /docs/architecture/api-monitoring-alerting-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Estandariza respuestas de error de API con esta guia. Cubre codigos HTTP, payloads de error, IDs de error y estrategias de reintento."
  keywords:
    - errores api
    - manejo de errores
    - codigos de estado http
    - api rest
    - errores graphql
    - respuestas de error
---

## Resumen

Las respuestas de error inconsistentes confunden a los consumidores de API y aumentan el tiempo de integracion. Un endpoint retorna texto plano, otro retorna JSON anidado, y un tercero retorna HTML. Esta guia estandariza como tus APIs comunican fallas para que los consumidores puedan manejar errores programaticamente sin adivinar formatos.

## Cuando Usar

Usa este recurso cuando:
- Disenes una API nueva o versiones una existente
- Incorpores un nuevo equipo que construira endpoints de API
- Revises una API para consistencia antes del lanzamiento publico
- Los consumidores reporten que el manejo de errores es dificil o impredecible

## Solucion

```markdown
# Estandar de Manejo de Errores de API

## 1. Codigos de Estado HTTP

| Estado | Significado | Cuando Usar |
|--------|-------------|-------------|
| 400 | Solicitud Incorrecta | Errores de validacion, JSON malformado, campos requeridos faltantes |
| 401 | No Autorizado | Credenciales de autenticacion faltantes o invalidas |
| 403 | Prohibido | Autenticado pero no autorizado para este recurso |
| 404 | No Encontrado | El recurso no existe |
| 409 | Conflicto | El recurso ya existe, entrada duplicada, conflicto de estado |
| 422 | Entidad No Procesable | Semanticamente correcto pero violacion de regla de negocio |
| 429 | Demasiadas Solicitudes | Limite de tasa excedido |
| 500 | Error Interno del Servidor | Falla inesperada del servidor (evitar exponer detalles) |
| 503 | Servicio No Disponible | Interrupcion temporal, header Retry-After proporcionado |

## 2. Formato de Respuesta de Error (REST)

```json
{
  "error": {
    "id": "err_7f8a9b2c",
    "code": "INVALID_PARAMETER",
    "message": "El campo 'email' debe ser una direccion de correo valida.",
    "details": [
      {
        "field": "email",
        "issue": "invalid_format",
        "value": "no-es-email"
      }
    ],
    "timestamp": "2026-06-26T10:00:00Z",
    "path": "/v1/users",
    "retryable": false,
    "documentation_url": "https://docs.ejemplo.com/errors/INVALID_PARAMETER"
  }
}
```

## 3. Formato de Respuesta de Error (GraphQL)

```json
{
  "data": null,
  "errors": [
    {
      "message": "El campo 'email' debe ser una direccion de correo valida.",
      "extensions": {
        "code": "INVALID_PARAMETER",
        "errorId": "err_7f8a9b2c",
        "field": "email",
        "retryable": false,
        "documentationUrl": "https://docs.ejemplo.com/errors/INVALID_PARAMETER"
      }
    }
  ]
}
```

## 4. Registro de Codigos de Error

| Codigo | Estado HTTP | Descripcion |
|--------|-------------|-------------|
| INVALID_PARAMETER | 400 | Fallo de validacion de campo |
| MISSING_REQUIRED_FIELD | 400 | Campo requerido no proporcionado |
| AUTHENTICATION_FAILED | 401 | Credenciales invalidas o expiradas |
| PERMISSION_DENIED | 403 | Permisos insuficientes |
| RESOURCE_NOT_FOUND | 404 | Recurso solicitado no encontrado |
| DUPLICATE_RESOURCE | 409 | El recurso ya existe |
| RATE_LIMIT_EXCEEDED | 429 | Demasiadas solicitudes |
| INTERNAL_ERROR | 500 | Error inesperado del servidor |

## 5. Comportamiento de Reintento

| Codigo de Error | Estrategia de Reintento | Reintentos Maximos | Backoff |
|-----------------|-------------------------|--------------------|---------|
| RATE_LIMIT_EXCEEDED | Esperar header Retry-After | 3 | Exponencial |
| INTERNAL_ERROR | Reintentar con jitter | 3 | Exponencial 1s, 2s, 4s |
| SERVICE_UNAVAILABLE | Reintentar con jitter | 5 | Exponencial |
| INVALID_PARAMETER | No reintentar | 0 | N/A |
| AUTHENTICATION_FAILED | No reintentar | 0 | N/A |

## 6. Requisitos de Logging

Cada respuesta de error debe ser logueada con:
- ID de Error (para correlacion)
- ID de Solicitud (de la solicitud entrante)
- ID de Usuario (si esta autenticado)
- Ruta del endpoint y metodo
- Payload completo de error
- Stack trace (solo errores 500, logs internos)
- Timestamp
```

## Explicacion

La guia obliga a que cada error incluya un codigo legible por maquina (`INVALID_PARAMETER`) y un mensaje legible por humanos. El `errorId` permite a los consumidores referenciar la falla exacta al contactar soporte. El booleano `retryable` indica a los SDKs si el reintento automatico es seguro. Separar los formatos REST y GraphQL reconoce que GraphQL retorna 200 OK incluso para errores, por lo que la informacion de error vive en el arreglo `errors`.

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| API Publica | Formato completo con URLs de docs | Los consumidores necesitan debugging autoservicio |
| API Interna | Formato ligero | Payload menor, consumidores mas simples |
| Microservicios | Incluir request ID para tracing | Esencial para debugging distribuido |

## Mejores Practicas

1. **Nunca retornar stack traces o SQL en respuestas de error** — loguearlos internamente
2. **Usar un registro de errores centralizado** para prevenir que los equipos inventen nuevos codigos
3. **Siempre incluir un request ID** para tracing entre servicios
4. **Documentar cada codigo de error** en una pagina de referencia publica
5. **Retornar 404 para recursos faltantes** sin distinguir "existe pero esta prohibido"

## Errores Comunes

1. **Retornar 200 OK para errores** — rompe la deteccion de errores del cliente
2. **Nombres de campo inconsistentes** (`error_message` vs `message` vs `detail`)
3. **No distinguir errores reintentables vs no reintentables**
4. **Exponer detalles de implementacion interna** en mensajes de error
5. **Usar 500 para errores de validacion** — 500 significa bug del servidor, no error del usuario

## Preguntas Frecuentes

### Las APIs GraphQL deberian retornar HTTP 200 para todas las solicitudes?

Si para errores de transporte, pero los errores de aplicacion deben estar en el arreglo `errors`. HTTP 400 es aceptable para sintaxis GraphQL malformada. HTTP 401/403 son aceptables para fallas de autenticacion.

### Como manejo errores de validacion con multiples campos?

Incluir un arreglo `details` con una entrada por campo en error. Cada entrada contiene el nombre del campo, el tipo de problema y el valor invalido.

### Que pasa si un consumidor envia una version de API invalida?

Retornar `400 Bad Request` con codigo `UNSUPPORTED_API_VERSION` y un mensaje apuntando a las versiones soportadas. No retornar 404 — el endpoint existe, la version no.
