---
contentType: recipes
slug: middleware
title: "Middleware"
description: "Cómo implementar middleware de request/response para logging, auth y manejo de errores en Python, JavaScript y Java."
metaDescription: "Ejemplos prácticos de middleware en Python, JavaScript y Java. Aprende interceptores de request, logging, auth y manejo de errores."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - authentication
  - express
relatedResources:
  - /recipes/call-rest-api
  - /recipes/handle-errors
  - /recipes/jwt-authentication
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejemplos prácticos de middleware en Python, JavaScript y Java. Aprende interceptores de request, logging, auth y manejo de errores."
  keywords:
    - middleware
    - interceptor de request
    - express middleware
    - fastapi middleware
    - spring interceptor
    - auth middleware
    - logging middleware
    - error handling middleware
---

## Visión general

El middleware es software que se ubica entre el request entrante y el route handler final. Intercepta, procesa o transforma requests y responses. Usos comunes incluyen autenticación, logging, CORS, rate limiting, validación de requests y manejo de errores.

El middleware sigue un patrón de pipeline: cada capa puede modificar el request, abortar la cadena, o pasar el control a la siguiente capa.

## Cuándo usarlo

Usa esta recipe cuando:

- Aplicas autenticación antes de que los route handlers se ejecuten. Consulta [JWT Authentication](/recipes/authentication/jwt-authentication) para patrones de auth.
- Logueas todos los requests entrantes y tiempos de respuesta. Consulta [Logging](/recipes/api/logging) para logging estructurado.
- Agregas headers CORS o de seguridad a cada response. Consulta [Manejo de CORS](/recipes/api/handle-cors) para configuración de CORS.
- Validas cuerpos de request o parámetros de query
- Implementas rate limiting o throttling de requests. Consulta [Rate Limiting con Redis](/recipes/api/api-rate-limiting-redis) para rate limiting basado en Redis.

## Solución

### Python (FastAPI)

```python
from fastapi import Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import time

# Middleware personalizado
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    print(f"{request.method} {request.url.path} - {response.status_code} ({duration:.3f}s)")
    return response

# Middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://example.com"],
    allow_methods=["GET", "POST"],
)

# Dependencia de auth (usada como middleware en rutas)
async def verify_token(request: Request):
    token = request.headers.get("Authorization")
    if not token or not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    return token

@app.get("/protected", dependencies=[Depends(verify_token)])
async def protected():
    return {"message": "Secret data"}
```

### JavaScript (Express)

```javascript
const express = require('express');
const app = express();

// Middleware de logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Middleware de auth
function authMiddleware(req, res, next) {
  const token = req.headers.authorization;
  if (!token || !token.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = verifyToken(token); // tu lógica de verificación de token
  next();
}

app.use('/api/protected', authMiddleware);

// Middleware de manejo de errores (debe ir al final)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});
```

### Java (Spring Boot)

```java
@Component
public class LoggingInterceptor implements HandlerInterceptor {
    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
        req.setAttribute("startTime", System.currentTimeMillis());
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest req, HttpServletResponse res, Object handler, Exception ex) {
        long start = (Long) req.getAttribute("startTime");
        long duration = System.currentTimeMillis() - start;
        System.out.println(req.getMethod() + " " + req.getRequestURI() + " - " + res.getStatus() + " (" + duration + "ms)");
    }
}

// Registrar interceptor
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Autowired
    private LoggingInterceptor loggingInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(loggingInterceptor).addPathPatterns("/api/**");
    }
}
```

## Explicación

- **preHandle / before**: Corre antes del route handler. Puede bloquear requests (auth, validación).
- **postHandle / after**: Corre después del handler pero antes de que el response se envíe.
- **afterCompletion**: Corre después de que el response se envió completamente. Ideal para cleanup y logging.
- **Error middleware**: Captura excepciones no atrapadas. Debe registrarse al final del stack. Consulta [Manejo de Errores](/recipes/api/handle-errors) para patrones de error.

## Mejores prácticas

- **El orden importa**: Registra middleware en la secuencia correcta (ej. auth antes de rutas, error handler al final)
- **Fail fast**: Rechaza requests no autorizados o inválidos lo antes posible
- **No tragues errores**: Siempre pasa errores al error handler o al siguiente middleware
- **Sé stateless**: El middleware no debe depender del orden de requests o estado mutable compartido
- **Usa inyección de dependencias**: En Spring/FastAPI, inyecta servicios en lugar de instanciarlos dentro del middleware

## Errores comunes

- Olvidar llamar `next()` en middleware de Express
- Registrar middleware de manejo de errores antes de route handlers
- Mutar el objeto request con datos no confiables
- Ejecutar computaciones pesadas sincrónicamente en middleware, bloqueando requests
- No manejar errores async apropiadamente en Express (usa `next(err)` en catch blocks)

## Preguntas frecuentes

**P: ¿El middleware puede modificar el body del response?**
R: Sí, pero es complejo en algunos frameworks. Prefiere modificar headers o status codes. Para transformación de body, usa response wrappers o hooks post-route.

**P: ¿Cuántas capas de middleware son demasiadas?**
R: No hay un límite estricto, pero cada capa agrega latencia. Profilea tu stack y elimina capas innecesarias en paths críticos de rendimiento.

**P: ¿Cuál es la diferencia entre middleware y decoradores/anotaciones?**
R: El middleware opera a nivel de framework en todas las rutas coincidentes. Los decoradores/anotaciones adjuntan comportamiento a funciones o controladores específicos.
