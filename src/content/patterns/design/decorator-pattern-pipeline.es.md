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
  - design-patterns
relatedResources:
  - /patterns/proxy-pattern-caching
  - /patterns/adapter-pattern
  - /recipes/call-rest-api
  - /recipes/websocket-authentication
  - /patterns/adapter-pattern-api
  - /patterns/chain-of-responsibility-middleware
  - /patterns/composite-pattern-ui
lastUpdated: "2026-07-09"
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

El decorator mas externo (Auth) corre primero, agregando el header del token. Luego Retry captura fallos y reintenta. Luego Logging registra tiempos. Finalmente FetchClient realiza la llamada de red. Cada decorator envuelve al siguiente, formando un stack.

## Como Funciona

Cada decorator implementa la misma interfaz `HttpClient` y mantiene una referencia al siguiente decorator en la cadena. Cuando se llama `request()`, el decorator puede modificar los inputs, llamar al cliente interno, y luego modificar o inspeccionar el output. Como todos los decorators comparten la misma interfaz, se componen transparentemente: el llamador no sabe cuantas capas existen.

El orden de decoracion importa. Auth deberia envolver Retry para que los reintentos incluyan el token. Logging deberia envolver el cliente mas interno para registrar tiempo real de red, no delays de retry. Metrics deberia envolver todo para capturar latencia end-to-end.

## Mejores Practicas

- Manten cada decorator enfocado en un solo concern. Un decorator que loggea y reintenta son dos decorators disfrazados.
- Siempre spread o clona el objeto options antes de mutar headers. Mutar el original causa bugs sutiles cuando los reintentos re-usan las mismas options.
- Re-lanza errores a menos que el proposito del decorator sea manejarlos (como Retry). Tragar errores rompe el contrato de la cadena.
- Usa una funcion builder o factory para construir el stack de decorators. El nesting inline como el ejemplo arriba se vuelve ilegible despues de 4 capas.
- Testea los decorators de forma aislada pasando un mock del cliente interno. Verifica que el decorator llama a traves y transforma inputs/outputs correctamente.
- Considera un `CircuitBreakerDecorator` para sistemas en produccion que llaman downstreams no confiables. Previene fallos en cascada cortocircuitando despues de N errores consecutivos.

### Ejemplo Circuit Breaker

```typescript
class CircuitBreakerDecorator extends BaseClientDecorator {
  private failures = 0;
  private isOpen = false;
  private lastFailureTime = 0;

  constructor(
    client: HttpClient,
    private threshold: number = 5,
    private resetTimeout: number = 30000
  ) {
    super(client);
  }

  async request(url: string, options: RequestInit): Promise<Response> {
    if (this.isOpen) {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.isOpen = false;
        this.failures = 0;
      } else {
        throw new Error('Circuit breaker open');
      }
    }

    try {
      const response = await this.client.request(url, options);
      this.failures = 0;
      return response;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      if (this.failures >= this.threshold) {
        this.isOpen = true;
      }
      throw error;
    }
  }
}
```

El circuit breaker rastrea fallos consecutivos. Despues de `threshold` errores, se abre y rechaza todas las peticiones por `resetTimeout` milisegundos. Despues del timeout, permite una peticion (estado half-open). Si esa tiene exito, el breaker se cierra. Si falla, el ciclo se repite.

## Variaciones

- **Conditional Decorator**: Aplica logica solo para URLs o metodos HTTP especificos
- **Metrics Decorator**: Envuelve tiempos y distribuciones de codigos de estado a Prometheus
- **Cache Decorator**: Combina con [Proxy](/patterns/design/proxy-pattern) pattern para cachear respuestas GET
- **Circuit Breaker Decorator**: Cortocircuita peticiones despues de N fallos consecutivos, con un periodo de cooldown antes de reintentar
- **Timeout Decorator**: Aborta peticiones que exceden un deadline configurable usando `AbortController`
- **Rate Limit Decorator**: Enforcea un maximo de peticiones concurrentes o por segundo
- **Tracing Decorator**: Inyecta trace IDs en headers y emite spans a OpenTelemetry

## Lo que funciona

- Manten los decorators enfocados en una sola responsabilidad cada uno
- Asegura que los delegates deleguen a `client.request()` sin tragar errores
- Haz los decorators stateless cuando sea posible para evitar efectos secundarios

## Errores Comunes

- Mutar el objeto de peticion en lugar de crear uno nuevo
- Olvidar reenviar la respuesta o el error al siguiente decorator
- Agregar demasiados decorators, haciendo el stack de llamadas dificil de rastrear
- Envolver en el orden equivocado: logging fuera de retry registra tiempo total incluyendo reintentos, lo que puede ser enganoso
- No testear los decorators de forma aislada: siempre pasa un mock del cliente interno
- Usar decorators para logica de negocio: deben manejar concerns transversales, no reglas de dominio
- Ignorar propagacion de errores: un decorator que catcha pero no re-lanza oculta fallos del llamador
- Hardcodear configuracion del decorator: pasa retry counts, timeouts y tokens a traves de constructores para testabilidad

## FAQ

### Como se diferencia del middleware en Express?

El [middleware](/patterns/design/chain-of-responsibility-middleware) de Express opera en objetos request/response en secuencia. Los decorators envuelven una sola interfaz de cliente y pueden componerse a cualquier granularidad.

### Los decorators pueden removerse dinamicamente?

Solo si reasignas la referencia del cliente. Los decorators se componen tipicamente al inicializar y permanecen fijos. Para composicion dinamica, usa una factory que reconstruya el stack.

**P: En que orden deberian aplicarse los decorators?**
R: El mas externo corre primero. Pon auth mas externo para que todos los reintentos carguen el token. Pon logging mas interno para medir tiempo real de red. Pon metrics mas externo para capturar latencia end-to-end incluyendo reintentos.

**P: Como testeo un decorator?**
R: Pasa un mock `HttpClient` que retorne una respuesta fija o lance un error. Verifica que el decorator llama a traves, modifica headers u options correctamente, y re-lanza errores. Cada decorator deberia ser testeable sin llamadas reales de red.

**P: Puedo usar decorators con fetch directamente?**
R: Si, pero envuelve fetch en una clase que implemente `HttpClient` primero. El patron decorator necesita una interfaz compartida. Lamar `fetch()` directamente en cada decorator derrota el proposito.

**P: Cuantos decorators son demasiados?**
R: Despues de 5-6 capas, el stack se vuelve dificil de debuggear. Si necesitas mas, considera agrupar concerns: combina logging y metrics en un decorator de observabilidad, o usa un pipeline de middleware.

**P: Los decorators deberian manejar logica de negocio?**
R: No. Los decorators manejan concerns transversales: concerns a nivel de transporte como auth, reintentos, logging, caching. Las reglas de negocio pertenecen a servicios o controllers que llaman al cliente decorado.

**P: Como se compara con el patron Chain of Responsibility?**
R: Chain of Responsibility pasa una peticion a lo largo de una cadena donde cada handler decide procesar o reenviar. Los decorators siempre llaman al cliente interno y tipicamente envuelven o transforman la llamada. Ver [Chain of Responsibility](/patterns/design/chain-of-responsibility-middleware).

**P: Puedo usar este patron con clientes GraphQL?**
R: Si. Envuelve los metodos `query` y `mutate` del cliente GraphQL con el mismo stack de decorators. Auth, logging y retry funcionan identicamente para operaciones GraphQL.

**P: Como manejo cancelacion de peticiones?**
R: Usa un `TimeoutDecorator` que crea un `AbortController`, setea un timeout, y pasa la senal al cliente interno. Si el timeout se dispara, aborta la peticion y lanza un error de timeout.

**P: El decorator Retry deberia reintentar en todos los errores?**
R: No. Reintenta solo en fallos transitorios: errores de red, 502, 503, 504. No reintentes en 400, 401, 403, 404 o errores de validacion. Verifica el codigo de estado o tipo de error antes de reintentar.

**P: Los decorators pueden usarse en el navegador?**
R: Si. El patron funciona en cualquier entorno TypeScript/JavaScript. `performance.now()` esta disponible en navegadores. Usa `AbortController` para timeouts en lugar de APIs especificas de Node.

**P: Como agrego tracing con decorators?**
R: Crea un `TracingDecorator` que genere o propague un trace ID via headers (ej. `X-Trace-Id`). Emite spans a OpenTelemetry o tu backend de tracing. Colocalo mas externo para que capture el ciclo de vida completo de la peticion.

**P: Que pasa con respuestas streaming?**
R: Los decorators pueden pasar respuestas `ReadableStream` sin cambios. Si un decorator necesita inspeccionar el body, debe hacer tee del stream para que el llamador pueda consumirlo. Cuidado: leer el body en un decorator lo consume.

**P: Como comparto stacks de decorators entre servicios?**
R: Exporta una funcion factory desde un modulo compartido: `createHttpClient(config)` retorna el cliente completamente decorado. Cada servicio importa la factory y pasa su propia config (tokens, timeouts, retry counts).

**P: Cual es la diferencia entre Decorator y Proxy?**
R: Proxy controla el acceso a un objeto (lazy loading, control de acceso, caching). Decorator agrega responsabilidades a un objeto. En la practica, la implementacion es similar: ambos envuelven el target. La intencion difiere. Ver [Proxy Pattern](/patterns/design/proxy-pattern-caching).

**P: Como manejo idempotencia con reintentos?**
R: Genera una clave de idempotencia (ej. UUID) en un `IdempotencyDecorator` y agregala como header. El servidor usa esta clave para desduplicar peticiones. Esto hace los reintentos seguros para operaciones POST y PUT.

**P: Puedo componer decorators condicionalmente segun entorno?**
R: Si. En la funcion factory, verifica `process.env.NODE_ENV` o un flag de config e incluye o excluye decorators. Por ejemplo, omite logging en tests o agrega tracing solo en produccion.

**P: Como interactuan los decorators con generics de TypeScript?**
R: Define la interfaz con generics: `HttpClient<T = Response>`. Cada decorator pasa el parametro de tipo a traves. Esto permite respuestas tipadas sin perder la composabilidad del patron decorator.

**P: Deberia usar decorators o interceptors?**
R: Los interceptors (como los de Axios) son hooks especificos del framework. Los decorators son basados en interfaz y agnosticos al framework. Si cambias de libreria HTTP, los decorators portan; los interceptors no.

**P: Como loggeo bodies de peticion y respuesta?**
R: Crea un `BodyLoggingDecorator` que clona la peticion y respuesta para leer bodies sin consumir streams. Usa `request.clone()` y `response.clone()` antes de leer. Loggea solo en desarrollo para evitar filtrar datos sensibles.

**P: Los decorators pueden ser async?**
R: Si. Todos los decorators en este patron son async porque `request()` retorna `Promise<Response>`. El decorator puede await el cliente interno, await operaciones adicionales (como delays en Retry), y retornar la respuesta asincronicamente.

**P: Como manejo subida de archivos con decorators?**
R: Las subidas de archivos funcionan igual. El body `FormData` pasa a traves del stack de decorators sin cambios. Agrega un `ProgressDecorator` que envuelve `XMLHttpRequest` en lugar de `fetch` si necesitas eventos de progreso de upload, ya que `fetch` no soporta progreso de upload aun.

**P: Como mockeo el cliente decorado en tests?**
R: Crea un `MockClient` que implemente `HttpClient` y retorne respuestas prefabricadas. Envuelvelo solo con los decorators que quieres testear. Para tests de integracion, usa una libreria como MSW (Mock Service Worker) para interceptar a nivel de red.

**P: Que pasa si un decorator lanza antes de llamar al cliente interno?**
R: El cliente interno nunca se ejecuta. Esto es esperado para decorators como CircuitBreaker cuando el circuito esta abierto. El error se propaga al llamador. Asegurate de que el tipo de error sea distinguible para que los llamadores puedan manejarlo apropiadamente.

**P: Puedo usar decorators con gRPC?**
R: Si. Define una interfaz `GrpcClient` con metodos `unaryCall`, `serverStream` y `clientStream`. Aplica el mismo patron decorator: auth, logging, retry y timeout funcionan identicamente para llamadas gRPC.

**P: Como funciona este patron con contenedores de inyeccion de dependencias?**
R: Registra cada decorator como un servicio en tu contenedor DI. Inyecta el `HttpClient` interno en el constructor de cada decorator. El contenedor resuelve la cadena automaticamente segun el orden de registro. Funciona bien con NestJS, InversifyJS o frameworks DI similares.
