---
contentType: recipes
slug: retry-logic-exponential-backoff
title: "Retry con Backoff Exponencial"
description: "Cómo implementar lógica de retry resiliente con backoff exponencial y jitter para fallos transitorios en llamadas de red y APIs."
metaDescription: "Aprende retry con backoff exponencial en Python, JavaScript y Java. Cubre jitter, circuit breakers, max retries e idempotencia para sistemas resilientes."
difficulty: intermediate
topics:
  - devops
tags:
  - retry
  - exponential-backoff
  - jitter
  - resilience
  - circuit-breaker
  - python
  - javascript
  - java
relatedResources:
  - /recipes/background-jobs
  - /recipes/cli-tool-argument-parsing
  - /recipes/environment-variables
  - /recipes/feature-flags
  - /recipes/health-check-endpoint
lastUpdated: "2026-06-11"
author: "StackPractices"
seo:
  metaDescription: "Aprende retry con backoff exponencial en Python, JavaScript y Java. Cubre jitter, circuit breakers, max retries e idempotencia para sistemas resilientes."
  keywords:
    - retry
    - backoff-exponencial
    - jitter
    - resiliencia
    - circuit-breaker
    - python
    - javascript
    - java
---
## Visión General

Los fallos transitorios —timeouts de red, rate limits, cortes temporales de servicio— son inevitables en sistemas distribuidos. Reintentar inmediatamente puede sobrecargar servicios que ya están luchando. El backoff exponencial espacia los reintentos de forma exponencial (1s, 2s, 4s, 8s...) mientras que el jitter aleatoriza los tiempos de espera para prevenir manadas de reintentos sincronizados (thundering herd). Esta receta cubre la construcción de un decorador de retry robusto con estrategias de backoff configurables, integración con circuit breaker y conciencia de idempotencia en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Llames APIs externas que pueden aplicar rate limits o sufrir cortes temporales
- Publiques mensajes a colas o buses de eventos que puedan estar temporalmente no disponibles
- Realices operaciones de base de datos que puedan encontrar deadlocks o timeouts de conexión
- Construyas microservicios que necesiten resiliencia ante degradación de servicios downstream

## Solución

### Python

```python
import time
import random
from functools import wraps
from typing import Callable, TypeVar, Tuple

T = TypeVar("T")

def retry(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exceptions: Tuple[type, ...] = (Exception,),
    jitter: bool = True,
    on_retry: Callable[[Exception, int, float], None] = None
):
    def decorator(fn: Callable[..., T]) -> Callable[..., T]:
        @wraps(fn)
        def wrapper(*args, **kwargs) -> T:
            for attempt in range(max_retries + 1):
                try:
                    return fn(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_retries:
                        raise
                    delay = min(base_delay * (2 ** attempt), max_delay)
                    if jitter:
                        delay = random.uniform(0, delay)
                    if on_retry:
                        on_retry(e, attempt + 1, delay)
                    time.sleep(delay)
        return wrapper
    return decorator

# Uso
@retry(max_retries=3, base_delay=1.0, exceptions=(ConnectionError, TimeoutError))
def fetch_data(url: str) -> dict:
    import requests
    response = requests.get(url, timeout=5)
    response.raise_for_status()
    return response.json()

# Con idempotency key
import uuid

def call_api_with_retry():
    idempotency_key = str(uuid.uuid4())
    headers = {"Idempotency-Key": idempotency_key}
    return fetch_data("https://api.example.com/data")
```

### JavaScript

```javascript
async function retry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 60000,
    jitter = true,
    shouldRetry = () => true,
    onRetry = () => {},
  } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }
      let delay = Math.min(baseDelay * (2 ** attempt), maxDelay);
      if (jitter) {
        delay = Math.random() * delay;
      }
      onRetry(error, attempt + 1, delay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// Uso
async function fetchWithRetry(url) {
  return retry(
    () => fetch(url).then((r) => r.json()),
    {
      maxRetries: 3,
      baseDelay: 1000,
      shouldRetry: (err) => err.status >= 500 || err.code === "ETIMEDOUT",
      onRetry: (err, attempt, delay) => {
        console.warn(`Retry ${attempt} después de ${delay}ms: ${err.message}`);
      },
    }
  );
}

// Estilo decorador con idempotencia
function withRetry(fn, options) {
  return (...args) => retry(() => fn(...args), options);
}
```

### Java

```java
import java.time.Duration;
import java.util.Random;
import java.util.concurrent.Callable;
import java.util.function.BiConsumer;
import java.util.function.Predicate;

public class RetryExecutor {
  private final int maxRetries;
  private final Duration baseDelay;
  private final Duration maxDelay;
  private final boolean jitter;
  private final Predicate<Throwable> shouldRetry;
  private final BiConsumer<Throwable, Integer> onRetry;
  private final Random random = new Random();

  public RetryExecutor(int maxRetries, Duration baseDelay, Duration maxDelay,
                       boolean jitter, Predicate<Throwable> shouldRetry,
                       BiConsumer<Throwable, Integer> onRetry) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
    this.jitter = jitter;
    this.shouldRetry = shouldRetry;
    this.onRetry = onRetry;
  }

  public <T> T execute(Callable<T> action) throws Exception {
    for (int attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return action.call();
      } catch (Exception e) {
        Throwable cause = e instanceof java.util.concurrent.ExecutionException
          ? e.getCause() : e;
        if (attempt == maxRetries || !shouldRetry.test(cause)) {
          throw e;
        }
        long delayMs = Math.min(
          baseDelay.toMillis() * (1L << attempt),
          maxDelay.toMillis()
        );
        if (jitter) {
          delayMs = (long) (random.nextDouble() * delayMs);
        }
        onRetry.accept(cause, attempt + 1);
        Thread.sleep(delayMs);
      }
    }
    throw new IllegalStateException("Unreachable");
  }

  // Uso
  public static void main(String[] args) throws Exception {
    RetryExecutor retry = new RetryExecutor(
      3, Duration.ofSeconds(1), Duration.ofSeconds(60),
      true,
      t -> t instanceof java.net.ConnectException,
      (err, attempt) -> System.out.println("Retry " + attempt + ": " + err.getMessage())
    );

    String result = retry.execute(() -> {
      // Llamada flaky simulada
      if (Math.random() < 0.7) throw new java.net.ConnectException("timeout");
      return "success";
    });
  }
}
```

## Explicación

- **Backoff exponencial** duplica el tiempo de espera tras cada fallo: 1s → 2s → 4s → 8s. Esto da espacio a los servicios en recuperación mientras sigue reintentando con prontitud.
- **Jitter** añade aleatoriedad (`random * delay`) para prevenir reintentos sincronizados desde muchos clientes golpeando simultáneamente un servidor en recuperación (problema de thundering herd).
- **Tope de delay máximo** previene esperas ilimitadas — esencial para operaciones orientadas a usuarios donde la latencia importa.
- **Filtrado de excepciones** asegura que solo se reintenten errores transitorios (timeouts, 5xx, conexión rechazada), no permanentes (errores 4xx del cliente, fallos de validación).
- **Idempotency keys** (UUID enviado como header) garantizan que los reintentos no creen efectos secundarios duplicados. El servidor usa la clave para deduplicar.

## Variantes

| Estrategia | Fórmula de Backoff | Ideal Para |
|------------|-------------------|------------|
| Fijo | `delay` constante | Intervalos predecibles, debugging |
| Lineal | `delay * intento` | Carga moderada sobre servicios en recuperación |
| Exponencial | `delay * 2^intento` | Más común, buen balance entre persistencia y carga |
| Exponencial + Jitter | `random * exponencial` | APIs de producción, previene thundering herd |
| Circuit Breaker | Fail-fast tras N errores | Protección contra fallos en cascada |

## Mejores Prácticas

1. **Siempre añade jitter en producción** — sin él, reintentos coordinados desde miles de clientes pueden DDoSear un servicio en recuperación.
2. **Solo reintenta operaciones idempotentes** — un POST sin idempotency key o escrituras no transaccionales pueden crear duplicados al reintentar.
3. **Establece un delay máximo y timeout total** — un usuario esperando 60+ segundos por una cascada de reintentos es peor que fallar rápido con un error claro.
4. **Loguea cada reintento** — incluye número de intento, delay y tipo de excepción para debuggear issues intermitentes.
5. **Considera circuit breakers para dependencias downstream** — si un servicio falla consistentemente, deja de reintentar por un período de cooldown en vez de martillearlo.

## Errores Comunes

1. Reintentar inmediatamente (delay 0), amplificando la carga sobre un servicio que ya está luchando.
2. Reintentar operaciones no idempotentes como pagos o decrementos de inventario sin claves de deduplicación.
3. No poner tope al delay máximo, causando que requests cuelguen por minutos antes de que el usuario vea un error.
4. Reintentar todas las excepciones indiscriminadamente, incluyendo errores 4xx del cliente que nunca tendrán éxito.
5. Omitir el jitter, llevando a problemas de thundering herd durante la recuperación de servicios.

## Preguntas Frecuentes

### ¿Debería usar siempre backoff exponencial?

No. Para servicios internos con baja latencia y alta confiabilidad, un reintento fijo corto (ej. 100ms × 3) puede bastar. El backoff exponencial con jitter es esencial para APIs públicas, sistemas distribuidos y escenarios de alto tráfico donde muchos clientes podrían reintentar simultáneamente.

### ¿Cuál es la diferencia entre retry y circuit breaker?

Retry intenta la misma operación nuevamente tras un fallo transitorio, esperando que funcione la próxima vez. Circuit breaker deja de llamar a un servicio que falla enteramente tras un umbral de errores, previniendo fallos en cascada y dando al servicio downstream tiempo para recuperarse. Funcionan bien juntos: retry para parpadeos transitorios, circuit breaker para cortes sostenidos.

### ¿Cómo hago segura una operación no idempotente para reintentar?

Genera una idempotency key única (UUID) antes del primer intento y envíala con cada reintento. El servidor almacena las claves procesadas e ignora duplicados. Para operaciones de base de datos, usa transacciones con optimistic locking o patrones UPSERT que son naturalmente idempotentes.
