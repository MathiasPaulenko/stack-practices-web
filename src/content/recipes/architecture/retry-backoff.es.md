---
contentType: recipes
slug: retry-backoff
title: "Retry con Exponential Backoff"
description: "Implementa estrategias de retry resilientes con exponential backoff, jitter e integración de circuit breaker para recuperación de fallas transitorias."
metaDescription: "Patrones de retry con exponential backoff y jitter: implementa clientes HTTP resilientes, evita thundering herds e integra con circuit breakers."
difficulty: intermediate
topics:
  - architecture
tags:
  - resilience
  - architecture
  - distributed-systems
  - design
  - pattern
relatedResources:
  - /guides/microservices-architecture-guide
  - /guides/system-design-interview-guide
  - /guides/cap-theorem-guide
  - /recipes/microservices-communication
  - /recipes/workflow-engine
lastUpdated: "2026-06-19"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Patrones de retry con exponential backoff y jitter: implementa clientes HTTP resilientes, evita thundering herds e integra con circuit breakers."
  keywords:
    - retry-backoff
    - resilience
    - architecture
    - distributed-systems
---
## Visión General

El retry con exponential backoff es el patrón fundacional para manejar fallas transitorias en [sistemas distribuidos](/guides/microservices-architecture-guide/). En lugar de fallar inmediatamente cuando ocurre un network hiccup o sobrecarga temporal, el cliente espera progresivamente más entre intentos. Agregar jitter previene retries sincronizados que crean un thundering herd que abruma al servicio en recuperación.

## Cuándo Usar

Usa este recurso cuando:
- Llamas a APIs externas o servicios sobre redes poco confiables
- [Conexiones de base de datos](/recipes/connection-pooling/) ocasionalmente hacen timeout bajo carga
- Necesitas distinguir errores transitorios (reintentables) de fallas permanentes
- Integras con servicios cloud que throttlean o tienen outages regionales

## Solución

### Exponential Backoff con Jitter (Python)

```python
import random
import time
from functools import wraps

def retry(max_attempts=5, base_delay=1, max_delay=60, exceptions=(Exception,)):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_attempts:
                        raise
                    
                    # Exponential backoff con full jitter
                    delay = min(base_delay * (2 ** (attempt - 1)), max_delay)
                    jitter = random.uniform(0, delay)
                    time.sleep(jitter)
        return wrapper
    return decorator

@retry(max_attempts=5, base_delay=1, exceptions=(ConnectionError,))
def fetch_data(url):
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    return response.json()
```

### Resilience4j Circuit Breaker + Retry (Java)

```java
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;

@Service
public class PaymentService {

    @Retry(name = "paymentRetry", fallbackMethod = "fallback")
    @CircuitBreaker(name = "paymentCircuit")
    public PaymentResult charge(PaymentRequest request) {
        return paymentClient.charge(request);
    }

    private PaymentResult fallback(PaymentRequest request, Exception ex) {
        return PaymentResult.declined("Service temporarily unavailable");
    }
}

// application.yml
resilience4j:
  retry:
    configs:
      default:
        maxAttempts: 5
        waitDuration: 1s
        exponentialBackoffMultiplier: 2
        retryExceptions:
          - java.net.ConnectException
          - java.net.SocketTimeoutException
```

### Polly Retry Policy (C#)

```csharp
using Polly;

var retryPolicy = Policy
    .Handle<HttpRequestException>(ex => 
        ex.StatusCode == HttpStatusCode.ServiceUnavailable ||
        ex.StatusCode == HttpStatusCode.TooManyRequests)
    .WaitAndRetryAsync(
        retryCount: 5,
        sleepDurationProvider: retryAttempt => 
            TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)) 
            + TimeSpan.FromMilliseconds(new Random().Next(0, 1000)),
        onRetry: (exception, timeSpan, retryCount, context) =>
        {
            logger.LogWarning($"Retry {retryCount} after {timeSpan}s due to {exception.Message}");
        });

var result = await retryPolicy.ExecuteAsync(() => httpClient.GetAsync(url));
```

## Explicación

**Estrategias de backoff**:

| Estrategia | Patrón de Delay | Caso de Uso |
|------------|-----------------|-------------|
| Fijo | 1s, 1s, 1s | Intervalos de retry predecibles |
| Lineal | 1s, 2s, 3s | Incremento moderado |
| Exponencial | 1s, 2s, 4s, 8s | Escape rápido de sobrecarga |
| Decorrelated jitter | Random en [0, 2^n] | Previene thundering herd |
| Equal jitter | (2^n)/2 + random | Spread balanceado |

**Cuándo NO reintentar**:
- HTTP 400 (client error — retry no lo arregla)
- HTTP 401/403 (issues de auth)
- HTTP 404 (el recurso no existe)
- Errores de lógica de negocio (fondos insuficientes, input inválido)

## Variantes

| Librería | Lenguaje | Destacado |
|----------|----------|-----------|
| Resilience4j | Java | Retry, CB, rate limiter, bulkhead |
| Polly | C# | Completo; soporte async |
| tenacity | Python | Decorators; soporte jitter |
| cockroachdb/errors | Go | Errores estructurados; retry markers |
| axios-retry | JavaScript | Plugin de Axios; configurable |

## Lo que funciona

- **Setea un delay máximo**: Sin un cap, el backoff puede crecer a horas
- **Usa idempotency keys**: Reintentar POST requests sin ellos crea duplicados. Consulta [idempotencia de mensajes](/recipes/rabbitmq-task-queue/).
- **Integración con circuit breaker**: Deja de reintentar cuando el servicio está claramente caído. Integra con [circuit breaker](/patterns/circuit-breaker-pattern/).
- **Loggea cada retry**: Retries silenciosos ocultan issues sistémicos
- **Respeta headers Retry-After**: HTTP 429/503 a menudo incluyen tiempos de espera recomendados

## Errores Comunes

1. **Reintentar todo**: Operaciones [no idempotentes](/recipes/rabbitmq-task-queue/) y client errors deberían fallar fast
2. **Sin jitter**: Retries sincronizados de múltiples clientes recrean la sobrecarga original
3. **Retries infinitos**: Un cliente que reintenta para siempre se convierte en una fuente de DoS
4. **Bloquear al caller**: Retries síncronos en request handlers aumentan tiempos de respuesta
5. **Reintentar dentro de transacciones**: Transacciones de base de datos + retries = escalación de locks

## Preguntas Frecuentes

**P: ¿Cuál es el número correcto de retries?**
R: Usualmente 3-5. Más retries aumentan latencia sin mejorar considerablemente tasas de éxito.

**P: ¿Debería reintentar en el cliente o usar una message queue?**
R: Para APIs síncronos: retry en cliente. Para jobs en background: usa una queue con retry built-in.

**P: ¿Cómo manejo idempotencia para retries?**
R: Genera un header `Idempotency-Key` único. El servidor verifica si ya procesó esta key antes. Aprende más en [idempotencia de mensajes](/recipes/rabbitmq-task-queue/).

### Retry Budget con Token Bucket (Go)

```go
package main

import (
    "sync"
    "time"
)

type RetryBudget struct {
    mu         sync.Mutex
    tokens     float64
    maxTokens  float64
    refillRate float64 // tokens por segundo
    lastRefill time.Time
}

func NewRetryBudget(maxTokens, refillRate float64) *RetryBudget {
    return &RetryBudget{
        tokens:     maxTokens,
        maxTokens:  maxTokens,
        refillRate: refillRate,
        lastRefill: time.Now(),
    }
}

func (b *RetryBudget) TryAcquire() bool {
    b.mu.Lock()
    defer b.mu.Unlock()

    // Rellenar tokens basado en tiempo transcurrido
    now := time.Now()
    elapsed := now.Sub(b.lastRefill).Seconds()
    b.tokens = min(b.maxTokens, b.tokens+elapsed*b.refillRate)
    b.lastRefill = now

    if b.tokens >= 1.0 {
        b.tokens -= 1.0
        return true
    }
    return false
}

// Uso: solo reintentar si el budget lo permite
func callWithBudget(client *Client, req *Request, budget *RetryBudget) (*Response, error) {
    for attempt := 0; attempt < 5; attempt++ {
        resp, err := client.Do(req)
        if err == nil {
            return resp, nil
        }
        if !isRetryable(err) {
            return nil, err
        }
        if !budget.TryAcquire() {
            return nil, fmt.Errorf("retry budget exhausted")
        }
        time.Sleep(backoff(attempt))
    }
    return nil, fmt.Errorf("max attempts exceeded")
}
```

### Hedged Requests con Cancelación (TypeScript)

```typescript
import { AbortController } from 'node:abort-controller';

async function hedgedRequest(
  url: string,
  options: RequestInit,
  hedgedDelay: number = 200
): Promise<Response> {
  const controller = new AbortController();

  // Primera request
  const firstPromise = fetch(url, { ...options, signal: controller.signal });

  // Hedged request después del delay si la primera no ha respondido
  const hedgedPromise = new Promise<Response>((resolve) => {
    setTimeout(async () => {
      if (!controller.signal.aborted) {
        const response = await fetch(url, { ...options, signal: controller.signal });
        resolve(response);
      }
    }, hedgedDelay);
  });

  // Race: la primera en completar gana, cancela la otra
  const response = await Promise.race([firstPromise, hedgedPromise]);
  controller.abort(); // cancelar la perdedora

  return response;
}

// Uso: enviar hedged requests para reducir tail latency
const response = await hedgedRequest('https://api.example.com/data', {
  method: 'GET',
  headers: { 'Accept': 'application/json' },
}, 150);
```

### Retry Context-Aware con Deadline (Python)

```python
import time
from typing import Callable, Type, Tuple, Optional
from dataclasses import dataclass

@dataclass
class RetryConfig:
    max_attempts: int = 5
    base_delay: float = 1.0
    max_delay: float = 60.0
    deadline: Optional[float] = None  # segundos desde el inicio
    retryable_exceptions: Tuple[Type[Exception], ...] = (ConnectionError, TimeoutError)

def retry_with_deadline(config: RetryConfig):
    def decorator(func: Callable):
        def wrapper(*args, **kwargs):
            start_time = time.monotonic()
            last_error = None

            for attempt in range(1, config.max_attempts + 1):
                # Verificar deadline
                if config.deadline:
                    elapsed = time.monotonic() - start_time
                    if elapsed >= config.deadline:
                        raise TimeoutError(
                            f'Retry deadline exceeded after {elapsed:.1f}s '
                            f'(attempt {attempt}/{config.max_attempts})'
                        )

                try:
                    return func(*args, **kwargs)
                except config.retryable_exceptions as e:
                    last_error = e
                    if attempt == config.max_attempts:
                        raise

                    # Calcular delay con exponential backoff + full jitter
                    delay = min(
                        config.base_delay * (2 ** (attempt - 1)),
                        config.max_delay
                    )
                    # No delayar más allá del deadline
                    if config.deadline:
                        remaining = config.deadline - (time.monotonic() - start_time)
                        delay = min(delay, remaining * 0.5)

                    import random
                    jitter = random.uniform(0, delay)
                    time.sleep(jitter)

            raise last_error
        return wrapper
    return decorator

@retry_with_deadline(RetryConfig(
    max_attempts=5,
    base_delay=0.5,
    max_delay=30,
    deadline=10.0,
    retryable_exceptions=(ConnectionError, TimeoutError)
))
def fetch_with_deadline(url: str):
    response = requests.get(url, timeout=5)
    response.raise_for_status()
    return response.json()
```



