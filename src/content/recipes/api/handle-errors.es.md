---
contentType: recipes
slug: handle-errors
title: "Manejar Errores en APIs con RFC 7807"
description: "Patrones para un manejo de errores de API consistente y predecible en varios lenguajes y frameworks."
metaDescription: "Implementá manejo de errores REST consistente con RFC 7807 Problem Details, códigos de estado HTTP y ejemplos en Python, JavaScript y Java."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - error-handling
  - rest
  - http
  - python
  - javascript
  - java
  - fastapi
  - express
relatedResources:
  - /recipes/call-rest-api
  - /recipes/input-validation
  - /recipes/api-versioning
  - /recipes/api-logging-audit
  - /recipes/api-documentation-openapi
  - /guides/rest-api-design-guide
lastUpdated: "2026-08-19"
publishedAt: "2026-06-10"
author: Mathias Paulenko
seo:
  metaDescription: "Implementá manejo de errores REST consistente con RFC 7807 Problem Details, códigos de estado HTTP y ejemplos en Python, JavaScript y Java."
  keywords:
    - manejo de errores
    - errores api
    - rest api
    - códigos de estado http
    - rfc 7807
    - problem details
---

## Visión General

Un buen manejo de errores es lo que hace que una API sea confiable. Una respuesta
de error bien diseñada le dice al cliente qué salió mal, qué hacer y cómo
evitarlo, sin filtrar detalles internos. Esta receta cubre RFC 7807 Problem
Details, códigos de estado HTTP e implementaciones idiomáticas en Python,
JavaScript y Java.

## Cuándo Usar

- Construís o refactorizás una API REST de la que dependan clientes.
- Estandarizás respuestas de error entre varios servicios backend.
- Documentás modos de falla para consumidores de la API.
- Diseñás middleware de manejo de errores o mapeadores de excepciones.

### Cuándo evitarlo

- La API tiene pocos endpoints y sin lógica compleja. Un shape liviano `{ error:
  "message" }` alcanza.
- La API ya usa un formato de error estable del que dependen los clientes.
  Migrar a RFC 7807 rompe compatibilidad.
- La latencia es crítica. La validación extra y el formateo de respuesta agregan
  overhead.

## Solución

### Python (FastAPI)

```python
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI()

@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    return JSONResponse(
        status_code=400,
        content={
            "type": "https://api.example.com/errors/invalid-input",
            "title": "Invalid Input",
            "detail": str(exc),
            "status": 400,
        },
    )

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    if user_id <= 0:
        raise HTTPException(
            status_code=404,
            detail={
                "type": "https://api.example.com/errors/not-found",
                "title": "User Not Found",
                "detail": f"No user with id {user_id}",
                "status": 404,
            },
        )
    return {"id": user_id, "name": "Ada"}
```

### JavaScript (Express)

```javascript
const express = require('express');
const app = express();

function errorResponse(type, title, detail, status) {
  return { type, title, detail, status };
}

app.get('/users/:userId', (req, res, next) => {
  const userId = parseInt(req.params.userId, 10);
  if (Number.isNaN(userId) || userId <= 0) {
    return res.status(404).json(
      errorResponse(
        'https://api.example.com/errors/not-found',
        'User Not Found',
        `No user with id ${req.params.userId}`,
        404
      )
    );
  }
  res.json({ id: userId, name: 'Ada' });
});

// Global error handler (must be last)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json(
    errorResponse(
      'https://api.example.com/errors/server-error',
      'Internal Server Error',
      process.env.NODE_ENV === 'production' ? 'Something went wrong.' : err.message,
      err.status || 500
    )
  );
});
```

### Java (Spring Boot)

```java
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestController
public class UserController {

    @GetMapping("/users/{userId}")
    public Map<String, Object> getUser(@PathVariable Long userId) {
        if (userId <= 0) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "No user with id " + userId
            );
        }
        return Map.of("id", userId, "name", "Ada");
    }
}

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handle(ResponseStatusException ex) {
        var body = Map.of(
            "type", "https://api.example.com/errors/not-found",
            "title", ex.getReason(),
            "detail", ex.getReason(),
            "status", ex.getStatusCode().value()
        );
        return ResponseEntity.status(ex.getStatusCode()).body(body);
    }
}
```

## Explicación

**RFC 7807 Problem Details** define un formato JSON estándar con `type`, `title`,
`detail` y `status`. Esto hace que tu API sea predecible para los clientes y
fácil de documentar.

**Los códigos de estado HTTP** llevan el significado semántico. Nunca devuelvas
200 OK para un request fallido. Usá 400 para errores del cliente, 401/403 para
auth, 404 para recursos faltantes, 409 para conflictos, 422 para validación y
500 para bugs del servidor.

**Los manejadores globales** centralizan la serialización para que los route
handlers se enfoquen en la lógica de negocio. También evitan que stack traces o
SQL lleguen a los clientes en producción.

## Variantes

| Lenguaje | Framework | Patrón de handler | Errores tipados |
| --- | --- | --- | --- |
| Python | FastAPI | `@app.exception_handler` | `HTTPException` |
| Python | Django REST | `exception_handler` setting | Subclases de `APIException` |
| JavaScript | Express | Middleware de error | Clase `AppError` custom |
| JavaScript | NestJS | Exception filters `@Catch()` | `HttpException` |
| Java | Spring Boot | `@ControllerAdvice` | `ResponseStatusException` |
| Java | JAX-RS | `ExceptionMapper<T>` | `WebApplicationException` |

## Mejores Prácticas

- Usá el código de estado correcto: 400 para errores del cliente, 401/403 para
  auth, 404 para recursos faltantes, 409 para conflictos, 422 para validación,
  500 para bugs del servidor.
- Incluí un correlation ID en las respuestas de error y logs para que soporte
  pueda tracear requests.
- Mantené mensajes útiles. "El nombre debe tener entre 2 y 50 caracteres" es
  mejor que "Validation failed."
- Nunca expongas stack traces, SQL o paths internos en producción.
- Seteá `Cache-Control: no-store` en todas las respuestas de error.
- Documentá cada 4xx y 5xx que un endpoint puede devolver en tu spec OpenAPI.
- Validá el input temprano. Consultá [input
  validation](/recipes/input-validation/) para patrones de validación.

## Errores Comunes

- Devolver 200 OK con un body de error. Rompe cache, logging y monitoreo.
- Exponer internals como stack traces o SQL a los clientes.
- Usar shapes inconsistentes entre endpoints. Uno devuelve `{ error: "msg" }`,
  otro `{ message: "msg", code: 123 }`.
- Devolver 500 por un recurso faltante (debería ser 404) o 403 por un request no
  autenticado (debería ser 401).
- Tragar excepciones. Atrapar todo y devolver 500 genérico oculta bugs.
- Devolver errores distintos para "user not found" y "wrong password". Eso
  permite enumerar cuentas válidas.

## FAQ

### ¿Debería usar RFC 7807 o un formato custom más simple?

Usá RFC 7807 para APIs públicas y microservicios. Para tools internos con
clientes confiables, un objeto `{ error, message }` consistente es suficiente.

### ¿Cómo manejo errores de validación con varios campos?

Extendé la respuesta Problem Details con un array `errors` o `invalid-params`,
listando cada campo y su motivo. FastAPI y Spring Boot hacen esto por defecto.

### ¿Qué código de estado uso para fallas de lógica de negocio?

Usá 422 Unprocessable Entity para validaciones semánticas (p. ej., "no se puede
enviar a este país"). Usá 409 Conflict para conflictos de estado (p. ej., email
duplicado). Evitá 400 para reglas de negocio.

### ¿Cómo evito que las respuestas de error filtren datos sensibles?

En producción devolvé un mensaje genérico para errores 500 y logueá el stack
completo del lado del servidor. Usá un allowlist de campos en respuestas de error
y evitá incluir input del usuario directamente.

### ¿Cómo pruebo el manejo de errores?

Escribí contract tests que verifiquen que cada endpoint devuelva los mismos
campos de error para cada código de estado (400, 401, 403, 404, 409, 422, 500).
Verificá que los logs contengan correlation ID y stack trace.

### ¿Cómo manejo errores entre microservicios?

Propagate el mismo correlation ID y formato de error a través de los límites del
servicio. Devolvé 502/503 por fallas downstream y 504 por timeouts. Nunca
reenviés detalles internos de errores downstream al cliente.
