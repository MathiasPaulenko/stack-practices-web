---
contentType: recipes
slug: javascript-fetch-retry-logic
title: "Lógica de Reintento en JavaScript Fetch con Backoff Exponencial"
description: "Reintenta peticiones HTTP fallidas en JavaScript con backoff exponencial"
metaDescription: "Reintenta peticiones fetch fallidas con backoff exponencial, jitter, timeout con AbortController y circuit breaker en JavaScript."
difficulty: intermediate
topics:
  - api
tags:
  - javascript
  - fetch
  - retry
  - exponential-backoff
  - error-handling
  - http
relatedResources:
  - /recipes/retry-backoff
  - /recipes/retry-logic-exponential-backoff
  - /recipes/nodejs-websocket-realtime
  - /guides/api-error-handling-guideline
  - /patterns/circuit-breaker-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Reintenta peticiones fetch fallidas con backoff exponencial, jitter, timeout con AbortController y circuit breaker en JavaScript."
  keywords:
    - javascript fetch retry
    - exponential backoff javascript
    - retry failed requests js
    - fetch abortcontroller timeout
    - javascript http retry
    - fetch error handling
---

## Visión General

Las peticiones de red fallan por muchas razones: timeouts, errores del servidor, rate limiting o pérdida temporal de conectividad. Reintentar con backoff exponencial da tiempo a que los fallos transitorios se resuelvan sin sobrecargar el servidor. Esta recipe cubre un wrapper de fetch con reintento, jitter para evitar thundering herd, timeout con AbortController y un circuit breaker simple.

## Cuándo Usar

- Llamas a APIs externas que ocasionalmente devuelven 5xx o timeout
- Necesitas peticiones HTTP resilientes en navegador o Node.js
- Quieres reintento automático sin añadir una dependencia pesada
- Necesitas manejar respuestas rate-limited (429) con cabeceras Retry-After

## Solución

### Reintento básico con backoff exponencial

```javascript
async function fetchWithRetry(url, options = {}, retries = 3, baseDelay = 1000) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, options);

            if (response.ok) {
                return response;
            }

            if (response.status >= 500 && attempt < retries) {
                const delay = baseDelay * Math.pow(2, attempt);
                await sleep(delay);
                continue;
            }

            return response;
        } catch (err) {
            if (attempt < retries) {
                const delay = baseDelay * Math.pow(2, attempt);
                await sleep(delay);
                continue;
            }
            throw err;
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Uso
const res = await fetchWithRetry("https://api.example.com/data");
const data = await res.json();
```

### Reintento con jitter y timeout

```javascript
async function fetchWithRetry(url, options = {}, config = {}) {
    const {
        retries = 3,
        baseDelay = 1000,
        maxDelay = 30000,
        timeoutMs = 10000
    } = config;

    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                ...options,
                signal: options.signal || controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                return response;
            }

            if (response.status === 429) {
                const retryAfter = parseInt(response.headers.get("Retry-After") || "0", 10);
                if (attempt < retries) {
                    const wait = retryAfter > 0 ? retryAfter * 1000 : getDelay(attempt, baseDelay, maxDelay);
                    await sleep(wait);
                    continue;
                }
            }

            if (response.status >= 500 && attempt < retries) {
                await sleep(getDelay(attempt, baseDelay, maxDelay));
                continue;
            }

            return response;
        } catch (err) {
            clearTimeout(timeoutId);

            if (attempt < retries) {
                await sleep(getDelay(attempt, baseDelay, maxDelay));
                continue;
            }

            throw err;
        }
    }
}

function getDelay(attempt, baseDelay, maxDelay) {
    const exponential = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * baseDelay;
    return Math.min(exponential + jitter, maxDelay);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Clase wrapper con circuit breaker

```javascript
class CircuitBreaker {
    constructor(threshold = 5, resetTimeout = 60000) {
        this.threshold = threshold;
        this.resetTimeout = resetTimeout;
        this.failures = 0;
        this.lastFailureTime = null;
        this.state = "closed";
    }

    recordFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.failures >= this.threshold) {
            this.state = "open";
        }
    }

    recordSuccess() {
        this.failures = 0;
        this.state = "closed";
    }

    canExecute() {
        if (this.state === "open") {
            const elapsed = Date.now() - this.lastFailureTime;
            if (elapsed > this.resetTimeout) {
                this.state = "half-open";
                return true;
            }
            return false;
        }
        return true;
    }
}

class FetchWithRetry {
    constructor(config = {}) {
        this.retries = config.retries ?? 3;
        this.baseDelay = config.baseDelay ?? 1000;
        this.maxDelay = config.maxDelay ?? 30000;
        this.timeoutMs = config.timeoutMs ?? 10000;
        this.breaker = new CircuitBreaker(
            config.breakerThreshold ?? 5,
            config.breakerResetTimeout ?? 60000
        );
    }

    async request(url, options = {}) {
        if (!this.breaker.canExecute()) {
            throw new Error("Circuit breaker is open — requests temporarily blocked");
        }

        for (let attempt = 0; attempt <= this.retries; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

            try {
                const response = await fetch(url, {
                    ...options,
                    signal: options.signal || controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    this.breaker.recordSuccess();
                    return response;
                }

                if (this.shouldRetry(response.status) && attempt < this.retries) {
                    this.breaker.recordFailure();
                    await this.delay(attempt);
                    continue;
                }

                this.breaker.recordFailure();
                return response;
            } catch (err) {
                clearTimeout(timeoutId);
                this.breaker.recordFailure();

                if (attempt < this.retries) {
                    await this.delay(attempt);
                    continue;
                }
                throw err;
            }
        }
    }

    shouldRetry(status) {
        return status >= 500 || status === 429;
    }

    delay(attempt) {
        const exponential = this.baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * this.baseDelay;
        const ms = Math.min(exponential + jitter, this.maxDelay);
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

const client = new FetchWithRetry({
    retries: 4,
    baseDelay: 500,
    timeoutMs: 8000,
    breakerThreshold: 5,
    breakerResetTimeout: 30000
});

const res = await client.request("https://api.example.com/users");
const data = await res.json();
```

### Reintento con condición custom y callbacks

```javascript
async function fetchRetry(url, options = {}, config = {}) {
    const {
        retries = 3,
        delay = 1000,
        retryOn = (response) => response.status >= 500,
        onRetry = (attempt, error) => console.log(`Retry ${attempt}: ${error?.message}`)
    } = config;

    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, options);

            if (response.ok || !retryOn(response)) {
                return response;
            }

            lastError = new Error(`HTTP ${response.status}`);

            if (attempt < retries) {
                onRetry(attempt + 1, lastError);
                await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt)));
            }
        } catch (err) {
            lastError = err;

            if (attempt < retries) {
                onRetry(attempt + 1, err);
                await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt)));
                continue;
            }
        }
    }

    throw lastError;
}

// Uso: reintentar solo en 503
const res = await fetchRetry(
    "https://api.example.com/data",
    { method: "GET" },
    {
        retries: 5,
        delay: 500,
        retryOn: (res) => res.status === 503,
        onRetry: (n, err) => console.warn(`Attempt ${n} failed: ${err.message}`)
    }
);
```

## Explicación

El patrón de reintento funciona capturando fallos transitorios y reintentando la petición tras un delay:

- **Backoff exponencial**: Cada reintento espera más que el anterior. `delay = baseDelay * 2^attempt`. Esto le da al servidor tiempo para recuperarse sin sobrecargarlo.
- **Jitter**: Añadir aleatoriedad (`Math.random() * baseDelay`) previene el problema thundering herd donde muchos clientes reintentan simultáneamente.
- **Timeout con AbortController**: Crea un deadline para cada petición. Si el servidor no responde dentro de `timeoutMs`, la petición se aborta y reintenta.
- **Circuit breaker**: Rastrea fallos consecutivos. Tras `threshold` fallos, se abre y bloquea todas las peticiones por `resetTimeout` milisegundos. Esto previene fallos en cascada cuando un servicio downstream está caído.
- **Cabecera Retry-After**: Cuando un servidor devuelve 429 (Too Many Requests), puede incluir una cabecera `Retry-After` indicando cuánto esperar. Respetar esta cabecera es mejor que usar backoff exponencial.
- **Idempotencia**: Solo reintentar métodos seguros (GET, HEAD, PUT, DELETE). Reintentar POST puede crear recursos duplicados.

## Variantes

| Enfoque | Complejidad | Features | Usar Cuando |
|---------|------------|----------|-------------|
| Reintento básico | Baja | Backoff exponencial | Scripts simples, pocos endpoints |
| Jitter + timeout | Media | Delay aleatorio, AbortController | Apps de navegador en producción |
| Clase con circuit breaker | Alta | State tracking, auto-recovery | Dependencias de API críticas |
| Condición custom de retry | Media | Lógica de retry por respuesta | Retry selectivo (ej., solo 503) |

## Pautas

- Solo reintentar métodos idempotentes (GET, PUT, DELETE). POST puede crear duplicados.
- Siempre usar un máximo de reintentos. Los reintentos infinitos pueden colgar tu aplicación.
- Respetar la cabecera `Retry-After` cuando esté presente en respuestas 429.
- Añadir jitter para prevenir tormentas de reintento sincronizadas.
- Usar AbortController para timeouts. fetch por defecto no tiene timeout.
- Loguear los intentos de reintento para debuggear problemas intermitentes.
- Setear un delay máximo para evitar esperas excesivamente largas.
- Combinar con un circuit breaker para servicios downstream críticos.

## Errores Comunes

- Reintentar peticiones POST. Esto puede crear órdenes, pagos o registros duplicados.
- No usar timeout. Un servidor colgado bloqueará todos los reintentos indefinidamente.
- Reintentar errores 4xx. Son errores de cliente (bad request, unauthorized) que no tendrán éxito al reintentar.
- Usar delays fijos sin backoff. Reintentar cada 1 segundo pone carga constante en un servidor que está luchando.
- No añadir jitter. Cuando muchos clientes reintentan al mismo tiempo, el servidor se sobrecarga de nuevo.
- Olvidar limpiar el timeout en éxito. Esto causa memory leaks y aborts falsos.

## Preguntas Frecuentes

### ¿Debería reintentar errores 4xx?

No. Los errores 4xx (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found) son errores de cliente. Reintentar la misma petición producirá el mismo resultado. Solo reintentar errores 5xx del servidor y respuestas 429 de rate limit.

### ¿Cómo pruebo la lógica de reintento?

Usa un mock server que devuelva fallos para las primeras N peticiones y luego éxito. Librerías como MSW (Mock Service Worker) o nock pueden simular esto. Prueba que los reintentos ocurran, los delays se apliquen y el circuit breaker se abra tras el threshold de fallos.

### ¿Cuál es la diferencia entre backoff exponencial y backoff lineal?

El backoff exponencial duplica el delay cada vez (1s, 2s, 4s, 8s). El backoff lineal añade una cantidad fija (1s, 2s, 3s, 4s). El exponencial es mejor para fallos transitorios porque se retira más rápido, reduciendo la carga en el servidor.

### ¿Puedo usar esto con axios en vez de fetch?

Sí. Reemplaza `fetch()` con `axios()` y revisa `error.response.status` en vez de `response.status`. Axios lanza en non-2xx por defecto, así que manejas errores en el catch block en vez de revisar `response.ok`.
