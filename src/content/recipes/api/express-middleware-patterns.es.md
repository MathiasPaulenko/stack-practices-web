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
  - patterns
relatedResources:
  - /recipes/api/go-rest-api-gin
  - /recipes/security/data-validation-zod
  - /guides/api-design-guide
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

El middleware de Express es la columna vertebral de la arquitectura de APIs en Node.js, pero cadenas de middleware profundamente anidadas o duplicadas rapidamente se vuelven inmantenibles. Esta recipe cubre patrones de composicion para autenticacion, validacion, manejo de errores, propagacion de contexto de request y wrappers de rutas async que mantienen los route handlers limpios y testeables.

## Cuando Usar Esto

- Las rutas de Express acumulan middleware repetitivo (auth, logging, validacion) copiado en todos lados
- Los route handlers async lanzan unhandled promise rejections que crashean el servidor
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
- Usa `res.on('finish')` para middleware de logging para capturar el status de respuesta actual

## Errores Comunes

- Llamar `next()` dentro de middleware async sin await, causando race conditions
- Olvidar llamar `next()` en middleware sincronico, colgando requests indefinidamente
- Lanzar strings en lugar de objetos Error, perdiendo stack traces

## FAQ

**P: Deberia usar Express o Fastify para proyectos nuevos?**
R: Fastify ofrece mejor performance y validacion de schema built-in. Express tiene ecosistema mas grande y familiaridad. Ambos son viables para produccion.

**P: Como testeo middleware en aislamiento?**
R: Crea una mini app Express en tests, monta el middleware y haz requests con supertest contra ella.
