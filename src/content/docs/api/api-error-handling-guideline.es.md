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
  - /docs/microservice-contract-template
  - /docs/api-security-review-template
  - /docs/api-monitoring-alerting-template
  - /guides/complete-guide-api-versioning-strategies
  - /guides/rest-api-design-guide
  - /guides/graphql-vs-rest-guide
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


- For alternatives, see [GraphQL vs REST — When to Choose and How to Migrate](/es/guides/graphql-vs-rest-guide/).

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

## Implementacion de Manejador de Errores

### Manejador Central de Errores en Express.js

```javascript
function errorHandler(err, req, res, next) {
  const errorId = `err_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const statusCode = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";

  const payload = {
    error: {
      id: errorId,
      code: code,
      message: statusCode >= 500
        ? "Ocurrio un error interno. Por favor reintente."
        : err.message,
      details: err.details || [],
      timestamp: new Date().toISOString(),
      path: req.path,
      retryable: err.retryable || false,
      documentation_url: `https://docs.example.com/errors/${code}`,
    },
  };

  if (statusCode >= 500) {
    logger.error({
      errorId,
      code,
      message: err.message,
      stack: err.stack,
      requestId: req.id,
      userId: req.user?.id,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.warn({
      errorId,
      code,
      message: err.message,
      requestId: req.id,
      path: req.path,
    });
  }

  res.status(statusCode).json(payload);
}

class ApiError extends Error {
  constructor(code, message, statusCode, options = {}) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = options.details || [];
    this.retryable = options.retryable || false;
  }
}

// Uso en manejadores de rutas
app.post("/v1/users", (req, res, next) => {
  if (!req.body.email || !req.body.email.includes("@")) {
    return next(new ApiError("INVALID_PARAMETER", "El campo 'email' debe ser un email valido.", 400, {
      details: [{ field: "email", issue: "invalid_format", value: req.body.email }],
    }));
  }
  res.status(201).json({ id: 1, email: req.body.email });
});

app.use(errorHandler);
```

### Manejador de Errores en Python Flask

```python
import uuid
import logging
from flask import Flask, request, jsonify, g

logger = logging.getLogger(__name__)

class ApiError(Exception):
    def __init__(self, code, message, status_code, details=None, retryable=False):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or []
        self.retryable = retryable
        super().__init__(message)

@app.errorhandler(ApiError)
def handle_api_error(e):
    error_id = f"err_{uuid.uuid4().hex[:12]}"
    payload = {
        "error": {
            "id": error_id,
            "code": e.code,
            "message": e.message,
            "details": e.details,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "path": request.path,
            "retryable": e.retryable,
            "documentation_url": f"https://docs.example.com/errors/{e.code}",
        }
    }

    if e.status_code >= 500:
        logger.error(
            "Error de API",
            extra={
                "errorId": error_id,
                "code": e.code,
                "requestId": getattr(g, "request_id", None),
                "userId": getattr(g, "user_id", None),
            },
        )

    return jsonify(payload), e.status_code
```

## Logging Estructurado para Errores

Usa logging estructurado en JSON para que los errores sean buscables y correlacionables entre servicios:

```json
{
  "timestamp": "2026-06-26T10:00:00.123Z",
  "level": "error",
  "errorId": "err_7f8a9b2c",
  "requestId": "req_abc123",
  "userId": "usr_xyz789",
  "code": "INTERNAL_ERROR",
  "message": "Timeout de conexion a base de datos",
  "stack": "Error: Timeout de conexion a base de datos\n    at ...",
  "path": "/v1/orders",
  "method": "POST",
  "duration_ms": 5023,
  "service": "order-service",
  "version": "2.1.0"
}
```

## Formato RFC 9457 Problem Details

Para APIs REST que quieren seguir un estandar IETF, usa RFC 9457 (anteriormente RFC 7807):

```json
{
  "type": "https://docs.example.com/errors/INVALID_PARAMETER",
  "title": "Parametro Invalido",
  "status": 400,
  "detail": "El campo 'email' debe ser un email valido.",
  "instance": "/v1/users",
  "traceId": "err_7f8a9b2c",
  "errors": [
    {
      "field": "email",
      "issue": "invalid_format",
      "value": "no-es-un-email"
    }
  ]
}
```

Establece el header `Content-Type` a `application/problem+json` para respuestas RFC 9457.

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| API Publica | Formato completo con URLs de docs | Los consumidores necesitan debugging autoservicio |
| API Interna | Formato ligero | Payload menor, consumidores mas simples |
| Microservicios | Incluir request ID para tracing | Esencial para debugging distribuido |
| gRPC | Usar codigos de status con proto de detalles | gRPC tiene su propio modelo de errores |

## Lo que funciona

1. **Nunca retornar stack traces o SQL en respuestas de error** — loguearlos internamente
2. **Usar un registro de errores centralizado** para prevenir que los equipos inventen nuevos codigos
3. **Siempre incluir un request ID** para tracing entre servicios
4. **Documentar cada codigo de error** en una pagina de referencia publica
5. **Retornar 404 para recursos faltantes** sin distinguir "existe pero esta prohibido"
6. **Usar una clase de error personalizada** en tu codebase para estandarizar la creacion de errores
7. **Loguear 4xx a nivel warn, 5xx a nivel error** — diferente severidad para diferentes audiencias

## Errores Comunes

1. **Retornar 200 OK para errores** — rompe la deteccion de errores del cliente
2. **Nombres de campo inconsistentes** (`error_message` vs `message` vs `detail`)
3. **No distinguir errores reintentables vs no reintentables**
4. **Exponer detalles de implementacion interna** en mensajes de error
5. **Usar 500 para errores de validacion** — 500 significa bug del servidor, no error del usuario
6. **Formatos de error diferentes por endpoint** — cada equipo inventa su propia estructura
7. **No loguear errores 4xx** — los errores de cliente revelan patrones de mal uso de la API
8. **Retornar el ID de error solo en logs** — los consumidores lo necesitan en la respuesta para referenciarlo

## Preguntas Frecuentes

### Las APIs GraphQL deberian retornar HTTP 200 para todas las solicitudes?

Si para errores de transporte, pero los errores de aplicacion deben estar en el arreglo `errors`. HTTP 400 es aceptable para sintaxis GraphQL malformada. HTTP 401/403 son aceptables para fallas de autenticacion.

### Como manejo errores de validacion con multiples campos?

Incluir un arreglo `details` con una entrada por campo en error. Cada entrada contiene el nombre del campo, el tipo de problema y el valor invalido.

### Que pasa si un consumidor envia una version de API invalida?

Retornar `400 Bad Request` con codigo `UNSUPPORTED_API_VERSION` y un mensaje apuntando a las versiones soportadas. No retornar 404 — el endpoint existe, la version no.

### Deberia usar RFC 9457 Problem Details o un formato personalizado?

RFC 9457 te da un formato estandarizado con `Content-Type: application/problem+json` que algunas librerias cliente entienden automaticamente. Un formato personalizado te da mas flexibilidad (ej. campo `retryable`, `documentation_url`). Si no necesitas la flexibilidad, usa RFC 9457 para interoperabilidad.

### Como manejo errores en jobs asincronos/background?

Para jobs en background, registra el error con el mismo formato estructurado y notifica al dueno del job. Si el job tiene un callback webhook, envia un evento de error a la URL de callback con la misma estructura de payload de error.

### Deberia localizar los mensajes de error?

Retornar codigos legibles por maquina siempre. Para el campo `message` legible por humanos, usa el header `Accept-Language` del consumidor para retornar texto localizado. Mantener el codigo en ingles para que sea buscable independientemente del locale.

### Como versiono los codigos de error?

Los codigos de error deben ser estables entre versiones de API. Si necesitas cambiar el significado de un codigo, crea un nuevo codigo en su lugar. Deprecar codigos antiguos con fecha de retiro y documentar el reemplazo en tu referencia de errores.

### Que estado HTTP debo usar para rate limiting vs cuota excedida?

Usar `429 Too Many Requests` para rate limiting (temporal, reintentar despues de un retraso). Usar `402 Payment Required` o `403 Forbidden` con codigo `QUOTA_EXCEEDED` para agotamiento de cuota (requiere upgrade de plan, no solo esperar).
