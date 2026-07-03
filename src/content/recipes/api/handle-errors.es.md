---
contentType: recipes
slug: handle-errors
title: "Manejar Errores en APIs"
description: "Patrones para un manejo de errores de API consistente y predecible en varios lenguajes y frameworks."
metaDescription: "Aprende a implementar manejo de errores REST consistente con códigos de estado HTTP, payloads de error y ejemplos en Python, JavaScript y Java."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - error-handling
  - java
  - rest
  - http
relatedResources:
  - /recipes/call-rest-api
  - /recipes/jwt-authentication
  - /patterns/design/strategy-pattern
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a implementar manejo de errores REST consistente con códigos de estado HTTP, payloads de error y ejemplos en Python, JavaScript y Java."
  keywords:
    - manejo de errores
    - errores api
    - rest api
    - códigos de estado http
    - respuesta de error
---

## Overview

El manejo de errores es lo que separa a las APIs fiableas de las frágiles. Una respuesta de error bien diseñada le dice al cliente exactamente qué salió mal, qué hacer al respecto y cómo evitarlo en el futuro, sin filtrar detalles internos de implementación.

Esta receta cubre el formato estándar de respuesta de error (RFC 7807 Problem Details), la selección correcta de códigos de estado HTTP y patrones de implementación idiomáticos en Python, JavaScript y Java.

## When to Use

Usa esta receta cuando:

- Construyas o refactores una [API REST](/recipes/api/call-rest-api) de la que clientes dependan
- Estandarices respuestas de error entre múltiples servicios backend
- Documentes modos de falla para consumidores de la API
- Diseñes middleware de manejo de errores o mapeadores de excepciones

## Solution

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
            "title": "Entrada Inválida",
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
                "title": "Usuario No Encontrado",
                "detail": f"No hay usuario con id {user_id}",
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
        'Usuario No Encontrado',
        `No hay usuario con id ${req.params.userId}`,
        404
      )
    );
  }
  res.json({ id: userId, name: 'Ada' });
});

// Manejador de errores global (debe ir al final)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json(
    errorResponse(
      'https://api.example.com/errors/server-error',
      'Error Interno del Servidor',
      process.env.NODE_ENV === 'production' ? 'Algo salió mal.' : err.message,
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
                "No hay usuario con id " + userId
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

## Explanation

- **RFC 7807 Problem Details** define un formato JSON de error estándar: `type`, `title`, `detail` y `status`. Usar este formato hace que tu API sea predecible para los clientes.
- **Los códigos de estado HTTP** transmiten el significado semántico del error. Nunca devuelvas 200 OK para una solicitud fallida.
- **Los manejadores de error globales** centralizan la serialización de errores para que los manejadores de rutas individuales se concentren en la lógica de negocio. Consulta [Patrones de Middleware de Express](/recipes/api/express-middleware-patterns) para manejo de errores específico de Express.
- **Prevención de fugas**: en producción, nunca expongas stack traces o rutas internas en las respuestas de error.

## Variants

| Lenguaje | Framework | Manejador de Excepciones | Errores Tipados |
|----------|-----------|--------------------------|-----------------|
| Python | FastAPI | `@app.exception_handler` | `HTTPException` |
| Python | Django REST | `exception_handler` setting | Subclases de `APIException` |
| JavaScript | Express | Middleware de errores | Clase `AppError` personalizada |
| JavaScript | NestJS | Filtros de excepción `@Catch()` | `HttpException` |
| Java | Spring Boot | `@ControllerAdvice` | `ResponseStatusException` |
| Java | JAX-RS | `ExceptionMapper<T>` | `WebApplicationException` |

## Lo que Funciona

- **Usa el código HTTP correcto**: 400 para errores del cliente, 401/403 para problemas de autenticación, 404 para recursos faltantes, 409 para conflictos, 422 para fallas de validación, 500 para bugs del servidor.
- **Incluye un ID de correlación**: agrega un ID de solicitud a cada respuesta de error para que soporte pueda rastrear logs.
- **Documenta todos los errores**: lista cada 4xx y 5xx que tu endpoint puede devolver en la documentación de la API. Consulta [Plantilla de Documentación de API](/docs/templates/api-documentation) para estructura de docs.
- **Mantén los mensajes útiles**: "El nombre de usuario debe tener entre 2 y 50 caracteres" es mejor que "Validación fallida."
- **Localiza con moderación**: el `detail` del error puede estar en inglés; deja que el cliente mapee URLs `type` a cadenas de UI localizadas.

## Common Mistakes

- **Devolver 200 con cuerpo de error**: algunas APIs legacy hacen esto — rompe el cacheo, el logging y el monitoreo. Usa [códigos de estado HTTP](/recipes/api/api-versioning) apropiados.
- **Exponer detalles internos**: enviar stack traces completos o detalles SQL al cliente es un riesgo de seguridad. Consulta [Guía de Seguridad](/guides/security/security-best-practices-guide) para protección de datos.
- **Formas inconsistentes**: un endpoint devuelve `{ error: "msg" }`, otro devuelve `{ message: "msg", code: 123 }` — esto confunde a los generadores de clientes.
- **Código de estado incorrecto**: devolver 500 para un recurso faltante (debería ser 404) o 403 para una solicitud no autenticada (debería ser 401).
- **Ocultar excepciones**: capturar todo y devolver un 500 genérico oculta bugs que deberías corregir.

## Frequently Asked Questions

**Q: ¿Debería usar RFC 7807 o un formato personalizado más simple?**
A: RFC 7807 es recomendado para APIs públicas y microservicios. Para herramientas internas, un objeto `{ error, message }` más simple está bien si es consistente en todos los endpoints.

**Q: ¿Cómo manejo errores de validación con múltiples campos?**
A: Extiende la respuesta Problem Details con un arreglo `errors` o campo `invalid-params`, listando cada campo inválido y su razón. Spring Boot y FastAPI hacen esto automáticamente.

**Q: ¿Qué código de estado uso para fallas de lógica de negocio?**
A: Prefiere 422 Unprocessable Entity para fallas de validación semántica (ej. "no se puede enviar a este país"). Usa 409 Conflict para conflictos de estado (ej. email duplicado). Evita 400 para reglas de negocio.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
