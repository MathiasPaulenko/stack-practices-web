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
relatedResources:
  - /guides/microservices-architecture-guide
  - /guides/system-design-interview-guide
  - /guides/cap-theorem-guide
  - /recipes/microservices-communication
  - /recipes/workflow-engine
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Patrones de retry con exponential backoff y jitter: implementa clientes HTTP resilientes, evita thundering herds e integra con circuit breakers."
  keywords:
    - retry-backoff
    - resilience
    - architecture
    - distributed-systems
---
## Visión General

El retry con exponential backoff es el patrón fundacional para manejar fallas transitorias en sistemas distribuidos. En lugar de fallar inmediatamente cuando ocurre un network hiccup o sobrecarga temporal, el cliente espera progresivamente más entre intentos. Agregar jitter previene retries sincronizados que crean un thundering herd que abruma al servicio en recuperación.

## Cuándo Usar

Usa este recurso cuando:
- Llamas a APIs externas o servicios sobre redes poco confiables
- Conexiones de base de datos ocasionalmente hacen timeout bajo carga
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

## Mejores Prácticas

- **Setea un delay máximo**: Sin un cap, el backoff puede crecer a horas
- **Usa idempotency keys**: Reintentar POST requests sin ellos crea duplicados
- **Integración con circuit breaker**: Deja de reintentar cuando el servicio está claramente caído
- **Loggea cada retry**: Retries silenciosos ocultan issues sistémicos
- **Respeta headers Retry-After**: HTTP 429/503 a menudo incluyen tiempos de espera recomendados

## Errores Comunes

1. **Reintentar todo**: Operaciones no idempotentes y client errors deberían fallar fast
2. **Sin jitter**: Retries sincronizados de múltiples clientes recrean la sobrecarga original
3. **Retries infinitos**: Un cliente que reintenta para siempre se convierte en una fuente de DoS
4. **Bloquear al caller**: Retries síncronos en request handlers aumentan tiempos de respuesta
5. **Reintentar dentro de transacciones**: Transacciones de base de datos + retries = escalación de locks

## Preguntas Frecuentes

**P: ¿Cuál es el número correcto de retries?**
R: Usualmente 3-5. Más retries aumentan latencia sin mejorar significativamente tasas de éxito.

**P: ¿Debería reintentar en el cliente o usar una message queue?**
R: Para APIs síncronos: retry en cliente. Para jobs en background: usa una queue con retry built-in.

**P: ¿Cómo manejo idempotencia para retries?**
R: Genera un header `Idempotency-Key` único. El servidor verifica si ya procesó esta key antes.
