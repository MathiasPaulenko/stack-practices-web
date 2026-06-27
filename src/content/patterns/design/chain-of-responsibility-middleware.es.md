---
contentType: patterns
slug: chain-of-responsibility-middleware
title: "Chain of Responsibility para Middleware de Procesamiento de Peticiones"
description: "Pasa peticiones a lo largo de una cadena de handlers donde cada handler decide si procesa la peticion o la pasa al siguiente handler en la pipeline"
metaDescription: "Chain of Responsibility para pipelines de middleware. Pasa peticiones a traves de una cadena de handlers donde cada uno decide procesar o delegar al siguiente."
difficulty: intermediate
topics:
  - design
  - api
tags:
  - chain-of-responsibility
  - behavioral-patterns
  - nodejs
  - design-pattern
relatedResources:
  - /patterns/design/decorator-pattern-pipeline
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Chain of Responsibility para pipelines de middleware. Pasa peticiones a traves de una cadena de handlers donde cada uno decide procesar o delegar al siguiente."
  keywords:
    - chain of responsibility
    - middleware pipeline
    - request processing
    - behavioral patterns
    - express middleware
---

# Chain of Responsibility para Middleware de Procesamiento de Peticiones

El [Chain of Responsibility](/patterns/design/chain-of-responsibility-pattern) pattern pasa peticiones a lo largo de una cadena de handlers. Cada handler decide si procesa la peticion o la pasa al siguiente handler en la cadena. Este pattern desacopla emisores de receptores, permitiendo que multiples objetos manejen una peticion sin que el emisor sepa cual objeto la procesara finalmente.

## Cuando Usar Esto

- Mas de un objeto puede manejar una peticion y el handler no se conoce de antemano
- Quieres emitir una peticion a uno de varios objetos sin especificar el receptor explicitamente
- El conjunto de objetos que pueden manejar una peticion deberia especificarse dinamicamente

## Problema

Una peticion HTTP necesita pasar por autenticacion, [rate limiting](/recipes/security/rate-limiting), validacion de peticiones y logging. Hardcodear esta secuencia en el router hace la pipeline rigida y dificil de extender.

## Solucion

```typescript
// chain/Handler.ts
interface RequestContext {
  headers: Record<string, string>;
  body: unknown;
  path: string;
  method: string;
  user?: { id: string; roles: string[] };
}

type NextFunction = () => void;

abstract class MiddlewareHandler {
  protected next: MiddlewareHandler | null = null;

  setNext(handler: MiddlewareHandler): MiddlewareHandler {
    this.next = handler;
    return handler;
  }

  handle(req: RequestContext, next: NextFunction): void {
    if (this.canHandle(req)) {
      this.process(req, () => {
        if (this.next) {
          this.next.handle(req, next);
        } else {
          next();
        }
      });
    } else if (this.next) {
      this.next.handle(req, next);
    } else {
      next();
    }
  }

  protected abstract canHandle(req: RequestContext): boolean;
  protected abstract process(req: RequestContext, next: NextFunction): void;
}

// Concrete Handlers
class AuthMiddleware extends MiddlewareHandler {
  protected canHandle(): boolean {
    return true; // Siempre revisar auth
  }

  protected process(req: RequestContext, next: NextFunction): void {
    const token = req.headers['authorization']?.replace('Bearer ', '');

    if (!token) {
      throw new Error('Unauthorized');
    }

    // Verificar token
    req.user = { id: 'user123', roles: ['user'] };
    next();
  }
}

class RateLimitMiddleware extends MiddlewareHandler {
  private requests = new Map<string, number[]>();
  private readonly windowMs = 60000;
  private readonly maxRequests = 100;

  protected canHandle(): boolean {
    return true;
  }

  protected process(req: RequestContext, next: NextFunction): void {
    const clientId = req.headers['x-client-id'] || req.user?.id || 'anonymous';
    const now = Date.now();
    const window = this.requests.get(clientId) || [];

    const recent = window.filter(t => now - t < this.windowMs);

    if (recent.length >= this.maxRequests) {
      throw new Error('Rate limit exceeded');
    }

    recent.push(now);
    this.requests.set(clientId, recent);
    next();
  }
}

class ValidationMiddleware extends MiddlewareHandler {
  protected canHandle(req: RequestContext): boolean {
    return req.method === 'POST' || req.method === 'PUT';
  }

  protected process(req: RequestContext, next: NextFunction): void {
    if (!req.body || typeof req.body !== 'object') {
      throw new Error('Invalid request body');
    }
    next();
  }
}

class LoggingMiddleware extends MiddlewareHandler {
  protected canHandle(): boolean {
    return true;
  }

  protected process(req: RequestContext, next: NextFunction): void {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  }
}

// Construir cadena
const auth = new AuthMiddleware();
const rateLimit = new RateLimitMiddleware();
const validation = new ValidationMiddleware();
const logging = new LoggingMiddleware();

auth.setNext(rateLimit).setNext(validation).setNext(logging);

// Uso
function handleRequest(req: RequestContext): void {
  auth.handle(req, () => {
    console.log('Peticion alcanzo el handler final');
  });
}
```

## Como Funciona

1. **Handler** declara la interfaz para manejar peticiones y acceder al siguiente handler
2. **Concrete Handler** procesa peticiones de las que es responsable o las reenvia
3. **Client** inicia la peticion a un handler en la cadena

## Variacion: Middleware Estilo Express

```typescript
// Estilo Express con funciones en lugar de clases
type Middleware = (req: RequestContext, next: NextFunction) => void;

function compose(middlewares: Middleware[]): Middleware {
  return (req, finalNext) => {
    let index = -1;

    function dispatch(i: number): void {
      if (i <= index) throw new Error('next() llamado multiples veces');
      index = i;

      const fn = i < middlewares.length ? middlewares[i] : finalNext;
      if (!fn) return;

      fn(req, () => dispatch(i + 1));
    }

    dispatch(0);
  };
}

const pipeline = compose([
  (req, next) => { console.log('Auth'); next(); },
  (req, next) => { console.log('Rate limit'); next(); },
  (req, next) => { console.log('Log'); next(); },
]);
```

## Consideraciones de Produccion

- Asegura que los handlers llamen `next()` para evitar que la pipeline se detenga
- Considera short-circuiting (no llamar `next()`) para cacheo o rechazo temprano
- Manten los middleware stateless o scoped a la peticion para prevenir leaks

## Errores Comunes

- Crear cadenas circulares que causan loops infinitos
- No llamar `next()` en handlers async, causando que peticiones se cuelguen
- Almacenar estado mutable en handlers compartidos entre peticiones concurrentes

## FAQ

**P: En que se diferencia de Decorator?**
R: [Decorator](/patterns/design/decorator-pattern) agrega responsabilidades dinamicamente pero todos los decorators procesan la peticion. Chain of Responsibility pasa peticiones hasta que uno las maneja.

**P: Puedo agregar handlers en runtime?**
R: Si. Esta es la ventaja principal — el middleware puede registrarse dinamicamente basado en rutas o configuracion.
