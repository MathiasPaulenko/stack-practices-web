---
contentType: patterns
slug: decorator-pattern-pipeline
title: "Decorator Pattern para Pipelines de Peticiones HTTP"
description: "Usa el Decorator pattern para componer preocupaciones transversales como logging, metricas y reintentos en pipelines de peticiones HTTP sin modificar logica central"
metaDescription: "Decorator pattern para pipelines HTTP. Compone logging, reintentos y metricas alrededor de peticiones sin modificar logica central. Middleware limpio y testeable."
difficulty: intermediate
topics:
  - design
  - api
tags:
  - decorator
  - middleware
  - structural
  - design-pattern
relatedResources:
  - /patterns/design/proxy-pattern-caching
  - /patterns/design/adapter-pattern
  - /recipes/api/call-rest-api
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Decorator pattern para pipelines HTTP. Compone logging, reintentos y metricas alrededor de peticiones sin modificar logica central. Middleware limpio y testeable."
  keywords:
    - decorator pattern
    - http middleware
    - request pipeline
    - structural pattern
    - cross-cutting concerns
---

# Decorator Pattern para Pipelines de Peticiones HTTP

El [Decorator](/patterns/design/decorator-pattern) pattern envuelve un objeto para agregar responsabilidades dinamicamente. Cuando se aplica a clientes HTTP, se convierte en una forma limpia de componer preocupaciones transversales — logging, reintentos, metricas, autenticacion — sin contaminar la logica central de la peticion.

## Cuando Usar Esto

- Multiples preocupaciones transversales deben envolver cada llamada a API
- Quieres agregar o remover preocupaciones sin cambiar codigo existente
- La logica central de la peticion debe mantenerse testeable y enfocada

## Problema

Agregar logging, reintentos, metricas y autenticacion a cada [llamada HTTP](/recipes/api/call-rest-api) lleva a clases de cliente monoliticas o boilerplate copiado en cada punto de llamada.

## Solucion

```typescript
// api/HttpClient.ts
interface HttpClient {
  request(url: string, options: RequestInit): Promise<Response>;
}

// api/FetchClient.ts
class FetchClient implements HttpClient {
  async request(url: string, options: RequestInit): Promise<Response> {
    return fetch(url, options);
  }
}

// decorators/BaseClientDecorator.ts
abstract class BaseClientDecorator implements HttpClient {
  constructor(protected client: HttpClient) {}
  abstract request(url: string, options: RequestInit): Promise<Response>;
}

// decorators/LoggingDecorator.ts
class LoggingDecorator extends BaseClientDecorator {
  async request(url: string, options: RequestInit): Promise<Response> {
    const start = performance.now();
    try {
      const response = await this.client.request(url, options);
      console.log(`${options.method || 'GET'} ${url} → ${response.status} (${(performance.now() - start).toFixed(0)}ms)`);
      return response;
    } catch (error) {
      console.error(`${options.method || 'GET'} ${url} → ERROR`);
      throw error;
    }
  }
}

// decorators/RetryDecorator.ts
class RetryDecorator extends BaseClientDecorator {
  constructor(client: HttpClient, private maxRetries: number = 3) {
    super(client);
  }

  async request(url: string, options: RequestInit): Promise<Response> {
    let lastError: Error;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.client.request(url, options);
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }
    throw lastError!;
  }
}

// decorators/AuthDecorator.ts
class AuthDecorator extends BaseClientDecorator {
  constructor(client: HttpClient, private token: string) {
    super(client);
  }

  async request(url: string, options: RequestInit): Promise<Response> {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${this.token}`);
    return this.client.request(url, { ...options, headers });
  }
}
```

## Uso

```typescript
const client = new AuthDecorator(
  new RetryDecorator(
    new LoggingDecorator(new FetchClient()),
    3
  ),
  process.env.API_TOKEN!
);
```

## Variaciones

- **Conditional Decorator**: Aplica logica solo para URLs o metodos HTTP especificos
- **Metrics Decorator**: Envuelve tiempos y distribuciones de codigos de estado a Prometheus
- **Cache Decorator**: Combina con [Proxy](/patterns/design/proxy-pattern) pattern para cachear respuestas GET

## Lo que funciona

- Manten los decorators enfocados en una sola responsabilidad cada uno
- Asegura que los delegates deleguen a `client.request()` sin tragar errores
- Haz los decorators stateless cuando sea posible para evitar efectos secundarios

## Errores Comunes

- Mutar el objeto de peticion en lugar de crear uno nuevo
- Olvidar reenviar la respuesta o el error al siguiente decorator
- Agregar demasiados decorators, haciendo el stack de llamadas dificil de rastrear

## FAQ

**P: Como se diferencia del middleware en Express?**
R: El [middleware](/patterns/design/chain-of-responsibility-middleware) de Express opera en objetos request/response en secuencia. Los decorators envuelven una sola interfaz de cliente y pueden componerse a cualquier granularidad.

**P: Los decorators pueden removerse dinamicamente?**
R: Solo si reasignas la referencia del cliente. Los decorators se componen tipicamente al inicializar y permanecen fijos.
