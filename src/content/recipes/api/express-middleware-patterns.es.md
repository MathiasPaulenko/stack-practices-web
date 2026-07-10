---
contentType: recipes
slug: express-middleware-patterns
title: "Patrones de Composicion de Middleware en Express.js"
description: "Construye aplicaciones Express mantenibles usando patrones de composicion de middleware para autenticacion, validacion, manejo de errores, propagacion de contexto y wrappers de rutas async"
metaDescription: "Construye apps Express mantenibles con composicion de middleware. Patrones para auth, validacion, manejo de errores, propagacion de contexto y wrappers async."
difficulty: intermediate
topics:
  - api
  - frontend
tags:
  - express
  - nodejs
  - middleware
  - api
  - rest
relatedResources:
  - /recipes/api/go-rest-api-gin
  - /recipes/security/data-validation-zod
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye apps Express mantenibles con composicion de middleware. Patrones para auth, validacion, manejo de errores, propagacion de contexto y wrappers async."
  keywords:
    - express middleware
    - middleware composition
    - nodejs patterns
    - async routes
    - error handling
---

# Patrones de Composicion de Middleware en Express.js

El middleware de Express es la columna vertebral de la arquitectura de APIs en Node.js, pero cadenas de middleware profundamente anidadas o duplicadas rapidamente se vuelven inmantenibles. Esta recipe cubre patrones de composicion para [autenticación](/guides/security/api-security-checklist-guide), [validación](/recipes/security/data-validation-zod), [manejo de errores](/recipes/api/handle-errors), propagacion de contexto de request y wrappers de rutas async que mantienen los route handlers limpios y testeables.

## Cuando Usar Esto

- Las rutas de Express acumulan middleware repetitivo (auth, logging, validacion) copiado en todos lados
- Los route handlers async lanzan unhandled promise rejections que crashean el servidor. Consulta [Manejo de Errores](/recipes/api/handle-errors) para patrones.
- Necesitas contexto scopeado a la request (usuario, trace ID) accesible a traves de todo el call stack

## Solucion

### 1. Wrapper de Rutas Async

```typescript
// middleware/asyncHandler.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Uso — no se necesita try/catch
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await userService.findById(req.params.id);
  res.json(user);
}));
```

### 2. Factory de Middleware Componible

```typescript
// middleware/compose.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

type Middleware = RequestHandler | [RequestHandler, ...RequestHandler[]];

function compose(...middlewares: Middleware[]): RequestHandler[] {
  return middlewares.flatMap((m) => Array.isArray(m) ? m : [m]);
}

const authenticated = compose(verifyToken, requireActiveUser);
const validated = (schema: ZodSchema) => compose(validateBody(schema));

app.post('/posts', ...compose(authenticated, validated(createPostSchema)), asyncHandler(createPost));
app.patch('/posts/:id', ...compose(authenticated, validated(updatePostSchema)), asyncHandler(updatePost));
```

### 3. Propagacion de Contexto de Request

```typescript
// middleware/context.ts
import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';

interface RequestContext {
  traceId: string;
  user?: { id: string; role: string };
  startTime: number;
}

const asyncStorage = new AsyncLocalStorage<RequestContext>();

function contextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const context: RequestContext = {
    traceId: req.headers['x-trace-id'] as string || crypto.randomUUID(),
    startTime: Date.now(),
  };

  asyncStorage.run(context, () => {
    res.setHeader('X-Trace-Id', context.traceId);
    next();
  });
}

function getContext(): RequestContext | undefined {
  return asyncStorage.getStore();
}

class UserService {
  async findById(id: string): Promise<User> {
    const ctx = getContext();
    logger.info('Fetching user', { traceId: ctx?.traceId, userId: id });
    return await db.users.findById(id);
  }
}
```

### 4. Handler de Errores Unificado

```typescript
// middleware/errorHandler.ts
import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const ctx = getContext();

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      traceId: ctx?.traceId,
    });
    return;
  }

  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: 'Validation failed',
      details: err.errors,
      traceId: ctx?.traceId,
    });
    return;
  }

  logger.error('Unhandled error', { traceId: ctx?.traceId, error: err });
  res.status(500).json({
    error: 'Internal server error',
    traceId: ctx?.traceId,
  });
};

app.use(errorHandler);
```

### 5. Middleware de Validacion con Zod

```typescript
// middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        issues: result.error.issues,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({ error: 'Invalid parameters', issues: result.error.issues });
      return;
    }
    req.params = result.data;
    next();
  };
}
```

## Como Funciona

- **Wrappers async** capturan promises rechazadas y las reenvian a handlers de error de Express
- **Composicion** aplana arrays de middleware anidados en stacks limpios y reutilizables
- **AsyncLocalStorage** crea contexto de request implicito sin propagacion manual a traves de cada firma de funcion
- **Validacion tipada** transforma y acota datos de request en el boundary antes de que los route handlers ejecuten

## Consideraciones de Produccion

- Registra handlers de error al final del stack de middleware (despues de todas las rutas)
- No llames `next()` despues de enviar una respuesta; causa errores "headers already sent"
- Usa `res.on('finish')` para [middleware de logging](/recipes/api/api-logging-audit) para capturar el status de respuesta actual

## Errores Comunes

- Llamar `next()` dentro de middleware async sin await, causando race conditions
- Olvidar llamar `next()` en middleware sincronico, colgando requests indefinidamente
- Lanzar strings en lugar de objetos Error, perdiendo stack traces

## Mejores Prácticas

- **El orden importa**: registra middleware en la secuencia correcta — logging primero, luego autenticación, luego autorización, luego rate limiting, luego lógica de negocio. Un stack mal ordenado puede permitir peticiones no autenticadas a endpoints costosos.
- **Mantén middleware delgado**: cada middleware debería hacer una sola cosa. Evita combinar auth, logging y validación en una sola función. Middleware delgado es más fácil de testear, reutilizar y debuggear.
- **Usa `express.Router()` para stacks modulares**: monta routers con diferentes stacks de middleware para diferentes grupos de rutas. Rutas de API get middleware de auth; rutas públicas get solo logging y CORS.
- **Siempre maneja errores async**: wrappea middleware async en try/catch y pasa errores a `next(err)`. Usa `express-async-errors` o una función wrapper para evitar try/catch manual en cada middleware.
- **Setea `req.locals` para data compartida**: pasa data entre middleware usando `req.locals` en lugar de mutar `req` directamente. Esta es la convención de Express y funciona con la mayoría de middleware de terceros.

## Checklist de Producción

- [ ] Orden de middleware es: logging → CORS → auth → rate limiting → routes → error handler
- [ ] Error-handling middleware está registrado último (función con 4 args)
- [ ] Middleware async usa error wrapper o paquete `express-async-errors`
- [ ] Headers sensibles de request se stripped antes de loguear
- [ ] CORS middleware está configurado con allowlist explícita de origins, no `*`
- [ ] Body parser tiene límites de tamaño configurados (e.g., 1MB JSON, 10MB multipart)
- [ ] Helmet middleware está habilitado para security headers
- [ ] Request ID se genera y se attachea a `req.locals` para tracing
- [ ] Endpoint de health check (`/health`) bypassa auth middleware
- [ ] Graceful shutdown drena requests in-flight antes de cerrar

## Consideraciones de Escalado

- **Overhead de middleware a escala**: cada middleware agrega 0.1-1ms por petición. Con 10 funciones middleware, eso es 1-10ms de overhead antes de la lógica de negocio. Profilea middleware con `express-status-monitor` o timing middleware custom para identificar bottlenecks.
- **Memory leaks en procesos long-running**: middleware que acumula estado (caches, connection pools) puede leakear memoria over días/semanas. Monitorea heap usage y restartea workers periódicamente con PM2 cluster mode o Kubernetes rolling restarts.
- **Escalado horizontal**: middleware de Express corre por instancia. Middleware stateful (sessions, rate limiting) necesita shared storage (Redis, Memcached) al escalar a múltiples instancias. Middleware stateless (logging, CORS) funciona sin cambios.

## Cuándo No Usar Este Enfoque

- **APIs de alto rendimiento (>50K req/s)**: Express agrega overhead de la ejecución de la middleware chain y el JavaScript runtime. Para throughput extremo, usa Fastify (2-3x más rápido), Go con Gin/Fiber, o Rust con Actix.
- **Funciones serverless**: las middleware chains de Express no cold-startean eficientemente en Lambda. Usa framework-native handlers (AWS Lambda handler, Vercel edge functions) para despliegues serverless.
- **Servir archivos estáticos simple**: si tu app solo sirve archivos estáticos, Express middleware es excesivo. Usa Nginx, Caddy, o un CDN directamente para 10-100x mejor throughput.

## Estrategia de Testing

- **Unit test middleware en aislamiento**: crea una app Express minimal con `supertest`, monta solo el middleware bajo test y haz HTTP requests. Asserta sobre response status, headers y body. Mockea `next()` para verificar call order.
- **Integration test el stack completo de middleware**: monta la app Express completa y testea el flow end-to-end de peticiones. Verifica middleware ordering, error handling y response transformations.
- **Testea error paths explícitamente**: envía peticiones malformadas, triggerea timeouts y simula downstream failures. Verifica que error-handling middleware catchee y formatee errores correctamente.
- **Performance test middleware overhead**: usa `autocannon` para benchmarkear middleware overhead. Compara baseline (sin middleware) vs stack completo para identificar bottlenecks. Target <5ms total middleware overhead por petición.

## Estimación de Costos

| Componente | Costo | Notas |
|-----------|------|-------|
| Express (self-hosted) | $0 | Open-source, MIT license |
| PM2 cluster mode | $0 | Process manager, open-source |
| Redis (para session/rate limit) | $10-$75/mes | Shared state across instancias |
| Load balancer | $20-$100/mes | AWS ALB, GCP LB, Nginx |
| Monitoring (PM2 Plus) | $0-$80/mes | PM2 Plus, Datadog APM |

Para 10K req/s: 2x EC2 t3.large ($60/mes) + Redis ($15/mes) + ALB ($25/mes) = ~$100/mes. PM2 cluster mode es free. Agrega Datadog APM ($80/mes) para monitoring de producción.

## Monitoring y Observabilidad

- **Trackea execution time de middleware por petición**: usa `express-status-monitor` o custom timing middleware para registrar cuánto tarda cada middleware. Alerta si cualquier middleware excede 10ms p95.
- **Monitorea error rates de middleware**: cuenta errores por función middleware. Setea alertas para error rate >1% en middleware critical (auth, CORS, rate limiting). Usa `prom-client` para exponer Prometheus metrics.
- **Loggea violaciones de middleware order**: si middleware ejecuta out of order (e.g., auth después de body parsing), loggea un warning. Bugs de middleware order son hard to debug en producción.
- **Trackea memory usage por middleware**: algún middleware (body-parser, session) allocatea memoria por petición. Monitorea heap growth y setea alertas para memory leaks. Usa `--max-old-space-size` para limitar heap y forzar garbage collection.

## FAQ

**P: Deberia usar Express o Fastify para proyectos nuevos?**
R: Fastify ofrece mejor performance y validacion de schema built-in. Express tiene ecosistema mas grande y familiaridad. Ambos son viables para produccion. Para APIs en Go, consulta [Go REST API con Gin](/recipes/api/go-rest-api-gin).

**P: Como testeo middleware en aislamiento?**
R: Crea una mini app Express en tests, monta el middleware y haz requests con supertest contra ella.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
