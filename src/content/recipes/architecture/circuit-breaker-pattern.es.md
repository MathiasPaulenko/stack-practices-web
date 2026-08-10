---


contentType: recipes
slug: circuit-breaker-pattern-recipe
title: "Construir Sistemas Resilientes con el Circuit Breaker"
description: "Cómo prevenir fallas en cascada en sistemas distribuidos usando circuit breakers con estados open, closed y half-open en Java, TypeScript y Python."
metaDescription: "Aprende circuit breaker pattern para sistemas distribuidos resilientes. Previene fallas en cascada con estados open, closed y half-open en Java, TypeScript y Python."
difficulty: intermediate
topics:
  - architecture
tags:
  - architecture
  - circuit-breaker
  - design
  - pattern
  - scalability
relatedResources:
  - /recipes/microservices-patterns
  - /recipes/saga-pattern-recipe
  - /recipes/api-gateway
  - /recipes/retry-logic-exponential-backoff
  - /recipes/multi-tenancy
  - /recipes/service-discovery
lastUpdated: "2026-06-14"
publishedAt: "2026-06-14"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende circuit breaker pattern para sistemas distribuidos resilientes. Previene fallas en cascada con estados open, closed y half-open en Java, TypeScript y Python."
  keywords:
    - circuit breaker pattern
    - sistemas resilientes
    - fallas en cascada
    - tolerancia a fallas
    - resiliencia distribuida


---

## Visión general

Un microservicio llama a un servicio de pagos downstream. El servicio de pagos se ralentiza debido a un problema de base de datos. El servicio llamador lanza más threads, cada uno esperando que el servicio de pagos responda. Los pools de threads se saturan. El servicio deja de aceptar nuevas peticiones. Los servicios que dependen de él también fallan. En minutos, una ralentización localizada de base de datos ha derribado toda la cadena de peticiones. Esto es una falla en cascada.

El circuit breaker pattern previene esto monitoreando las llamadas a un servicio downstream. Si la tasa de fallas excede un umbral, el circuito se "abre" y las llamadas posteriores fallan rápido sin alcanzar el servicio en problemas. Después de un timeout, el circuito entra en estado "half-open" y permite una petición de prueba. Si tiene éxito, el circuito se cierra de nuevo. Esto da tiempo al servicio fallido para recuperarse y previene que el llamador desperdicie recursos en peticiones condenadas. Aqui se explica como diseño de máquina de estados, implementación e integración con retry y fallbacks.

## Cuándo usarlo

Usa esta receta cuando:

- Llamando servicios externos sobre una red donde las fallas son inevitables
- Previniendo que un servicio downstream lento consuma todos los recursos del llamador
- Proveer falla rápida con fallback en lugar de bloquear en timeouts
- Proteger pools de threads, pools de conexiones y memoria de ser agotados
- Construyendo arquitecturas de microservicios resilientes donde las fallas parciales están contenidas

## Solución

### Circuit Breaker en TypeScript

```typescript
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  halfOpenMaxCalls: number;
}

class CircuitBreaker<T extends (...args: any[]) => Promise<any>> {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private nextAttempt = Date.now();

  constructor(private fn: T, private config: CircuitBreakerConfig) {}

  async execute(...args: Parameters<T>): Promise<ReturnType<T>> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
      this.successes = 0;
    }

    try {
      const result = await this.fn(...args);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.config.halfOpenMaxCalls) {
        this.state = 'CLOSED';
        this.failures = 0;
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    if (this.state === 'HALF_OPEN' || this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.config.recoveryTimeout;
    }
  }

  getState(): CircuitState { return this.state; }
}

const paymentBreaker = new CircuitBreaker(
  (amount: number) => paymentService.charge(amount),
  { failureThreshold: 5, recoveryTimeout: 30000, halfOpenMaxCalls: 3 }
);

try {
  await paymentBreaker.execute(100);
} catch (error) {
  await fallbackPaymentProcessor.charge(100);
}
```

### Java con Resilience4j

```java
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;

public class PaymentService {
    private final CircuitBreaker circuitBreaker;

    public PaymentService() {
        CircuitBreakerConfig config = CircuitBreakerConfig.custom()
            .failureRateThreshold(50)
            .waitDurationInOpenState(Duration.ofMillis(30000))
            .permittedNumberOfCallsInHalfOpenState(3)
            .slidingWindowSize(10)
            .build();

        CircuitBreakerRegistry registry = CircuitBreakerRegistry.of(config);
        this.circuitBreaker = registry.circuitBreaker("payment");
    }

    public String charge(double amount) {
        return circuitBreaker.executeSupplier(() ->
            externalPaymentGateway.charge(amount));
    }
}
```

### Python con pybreaker

```python
import pybreaker
import requests

class PaymentService:
    def __init__(self):
        self.breaker = pybreaker.CircuitBreaker(
            fail_max=5,
            reset_timeout=30,
            expected_exception=requests.RequestException
        )

    @pybreaker.circuit
    def charge(self, amount):
        response = requests.post(
            "https://payment-api.example.com/charge",
            json={"amount": amount}
        )
        response.raise_for_status()
        return response.json()

service = PaymentService()
try:
    result = service.charge(100)
except pybreaker.CircuitBreakerError:
    result = fallback_charge(100)
```

## Explicación

- **Estado closed**: el circuito está cerrado y las peticiones pasan al servicio downstream.   Las fallas se cuentan en una ventana deslizante.   Si la tasa de fallas o el conteo excede el umbral, el circuito se abre.   En estado cerrado, un pequeño número de fallas es tolerado — las redes son inherentemente poco confiables.
- **Estado open**: el circuito está abierto y todas las peticiones fallan rápido con una excepción `CircuitBreakerOpen` (o similar).   El servicio downstream no es llamado, previniendo agotamiento de recursos.   El circuito permanece abierto por un timeout de recuperación configurado (ej.   30 segundos), dando tiempo al servicio fallido para sanar.
- **Estado half-open**: después del timeout de recuperación, el circuito transiciona a half-open.   Un número limitado de peticiones de prueba son permitidas.   Si tienen éxito, el circuito se cierra.   Si alguna falla, el circuito se abre de nuevo con un timeout fresco.
- **Ventana deslizante**: las fallas se rastrean en una ventana deslizante (ej.   últimas 10 llamadas o últimos 60 segundos).   Esto previene que un circuito se abra debido a un pico único si la tasa general es saludable.   También permite recuperación si las fallas dejan de ocurrir.

## Variantes

| Tipo | Detección de fallas | Recuperación | Mejor para |
|------|---------------------|--------------|------------|
| Basado en conteo | N fallas en ventana | Timeout fijo | Carga estable, patrones de falla predecibles |
| Basado en tiempo | N fallas en duración | Timeout adaptativo | Carga variable, tráfico en ráfagas |
| Porcentaje | >X% tasa de falla | Timeout | Gran volumen donde conteo absoluto es ruidoso |
| Métrica custom | Latencia, tasa de error | Manual | Sistemas complejos con múltiples señales de salud |

## Lo que funciona

- **Siempre provee un fallback**: cuando el circuito está abierto, la aplicación debe seguir funcionando.   Un servicio de pagos podría retornar "pago pendiente, reintentar más tarde.  " Un catálogo de productos podría servir datos stale desde cache.   Nunca dejes que un circuito abierto se propague como falla dura al usuario.
- **Usa circuit breakers con timeouts y [retries](/recipes/retry-backoff/)**: un circuit breaker sin timeout por petición aún puede colgarse.   Combina un circuit breaker (salud a nivel macro) con un timeout de petición (límite a nivel micro) y retry (recuperación transitoria).   El retry debe estar dentro del circuit breaker, no fuera — reintentar sobre un circuito abierto es esfuerzo desperdiciado.
- **Loguea y alerta sobre cambios de estado de circuito**: abrir un circuito es un síntoma de un problema downstream.   Loguea cada transición de estado con contexto (tasa de falla, último error, servicio afectado).   Alerta cuando un circuito se abre, pero suprime alertas de recuperación a menos que el circuito se abra repetidamente — una sola recuperación es normal; un circuito fluctuante no lo es.
- **Dimensiona la ventana deslizante a tu tráfico**: una ventana de 10 llamadas se abre después de 5 fallas, apropiado para tráfico moderado.   Para servicios de alto throughput, una ventana basada en porcentaje (ej.   50% de tasa de falla sobre 100 llamadas) es más estable.   Para servicios de bajo tráfico, una ventana basada en conteo puede nunca acumular suficientes fallas — considera ventanas basadas en tiempo.
- **Distinque entre tipos de falla**: no abras el circuito en errores 4xx (errores de cliente que no se recuperarán).   Ábrelo solo en 5xx, timeouts y errores de conexión.   Algunas librerías permiten configurar `expected_exception` — úsalo para clasificar errores no reintentables.

## Errores comunes

- **Envolver cada llamada en un circuit breaker**: un circuit breaker agrega overhead y complejidad.   Úsalo para llamadas cross-service, cross-network.   No envuelvas llamadas en-memoria, in-process — no fallan de formas en que un circuit breaker ayude.
- **Ignorar el estado half-open**: algunas implementaciones saltan half-open y transicionan directamente de open a closed después del timeout.   Esto es peligroso — si el servicio aún está fallando, el circuito se reabre inmediatamente y obtienes un loop de open-close-open.   Siempre prueba con un número limitado de llamadas antes de cerrar completamente.
- **Configurar timeout de recuperación demasiado corto**: un timeout de 1 segundo en una base de datos que necesita 30 segundos para hacer failover causa fluctuación rápida.   Si tu servicio downstream tarda 2 minutos en reiniciar, configura el timeout a 2.  5 minutos.
- **No monitorear métricas de circuito**: sin métricas, no sabes qué tan a menudo se abren los circuitos ni cuánto tiempo permanecen abiertos.   Exporta estado de circuito, conteo de fallas y duración de apertura a Prometheus, CloudWatch o Datadog.

## Preguntas frecuentes

**P: ¿Es un circuit breaker solo un if-statement elegante?**
R: No — es una máquina de estados con memoria (ventanas de falla), recuperación automática (half-open) y coordinación distribuida. Un simple `if (failures > 5) throw` no recupera automáticamente, no rastrea ventanas deslizantes y no permite peticiones de prueba controladas.

**P: ¿Debería reintentar dentro o fuera del circuit breaker?**
R: Reintenta dentro. El circuit breaker envuelve la lógica de retry. Si el retry se agota y la llamada aún falla, el circuit breaker lo cuenta como falla. Reintentar fuera de un circuito abierto desperdicia recursos — ya sabes que el servicio no está saludable.

**P: ¿Pueden los circuit breakers causar inconsistencia de datos?**
R: Sí, si el fallback no está cuidadosamente diseñado. Si el circuito se abre durante un pago y el fallback es "asumir que tuvo éxito," puedes marcar órdenes no pagadas como pagadas. Diseña fallbacks seguros: marca como pendiente, encola para procesamiento posterior, o notifica al usuario. Consulta [Saga Pattern](/recipes/saga-pattern-recipe/) para coordinación de transacciones distribuidas.

**P: ¿Cómo funcionan los circuit breakers con async/await?**
R: La mayoría de las librerías modernas (Resilience4j, Opossum para JS) soportan ejecución async nativamente. La máquina de estados corre en el thread llamador (o event loop), y la función envuelta se espera. Los timeouts deben ser compatibles con el runtime async (Promise timeout en JS, CompletableFuture timeout en Java). Consulta [Async Patterns](/recipes/call-rest-api/) para estrategias de ejecución async.


### Go con gobreaker

```go
package main

import (
    "context"
    "fmt"
    "time"

    "github.com/sony/gobreaker"
)

type PaymentClient struct {
    cb *gobreaker.CircuitBreaker
}

func NewPaymentClient() *PaymentClient {
    settings := gobreaker.Settings{
        Name:        "payment-service",
        MaxRequests: 3,                              // llamadas half-open máx
        Interval:    60 * time.Second,               // intervalo de ventana deslizante
        Timeout:     30 * time.Second,               // duración estado open
        ReadyToTrip: func(counts gobreaker.Counts) bool {
            // Abrir cuando ratio de falla > 60%
            failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
            return counts.Requests > 5 && failureRatio > 0.6
        },
        OnStateChange: func(name string, from, to gobreaker.State) {
            log.Printf("Circuit %s: %s -> %s", name, from, to)
        },
    }

    return &PaymentClient{
        cb: gobreaker.NewCircuitBreaker(settings),
    }
}

func (c *PaymentClient) Charge(ctx context.Context, amount float64) (string, error) {
    result, err := c.cb.Execute(func() (interface{}, error) {
        return c.callPaymentService(ctx, amount)
    })
    if err != nil {
        return "", err
    }
    return result.(string), nil
}

func (c *PaymentClient) callPaymentService(ctx context.Context, amount float64) (string, error) {
    // llamada HTTP al servicio de pagos
    return fmt.Sprintf("charged %.2f", amount), nil
}
```

### C# con Polly

```csharp
using Polly;
using Polly.CircuitBreaker;
using System.Net.Http;

public class PaymentService
{
    private readonly AsyncCircuitBreakerPolicy<HttpResponseMessage> _circuitBreaker;
    private readonly HttpClient _httpClient;

    public PaymentService(HttpClient httpClient)
    {
        _httpClient = httpClient;

        _circuitBreaker = Policy<HttpResponseMessage>
            .Handle<HttpRequestException>()
            .OrResult(r => r.IsSuccessStatusCode == false)
            .CircuitBreakerAsync(
                handledEventsAllowedBeforeBreaking: 5,
                durationOfBreak: TimeSpan.FromSeconds(30),
                onBreak: (exception, duration) =>
                {
                    Console.WriteLine($"Circuit opened for {duration.TotalSeconds}s");
                },
                onReset: () => Console.WriteLine("Circuit closed"),
                onHalfOpen: () => Console.WriteLine("Circuit half-open")
            );
    }

    public async Task<string> ChargeAsync(decimal amount)
    {
        return await _circuitBreaker.ExecuteAsync(async () =>
        {
            var response = await _httpClient.PostAsJsonAsync(
                "https://payment-api.example.com/charge",
                new { Amount = amount }
            );
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        });
    }
}
```

### Métricas Prometheus para Circuit Breaker

```typescript
import { Counter, Gauge, Histogram } from 'prom-client';

const circuitState = new Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state: 0=closed, 1=open, 2=half-open',
  labelNames: ['circuit_name'],
});

const circuitFailures = new Counter({
  name: 'circuit_breaker_failures_total',
  help: 'Total failures counted by circuit breaker',
  labelNames: ['circuit_name'],
});

const circuitDuration = new Histogram({
  name: 'circuit_breaker_call_duration_seconds',
  help: 'Call duration through circuit breaker',
  labelNames: ['circuit_name', 'outcome'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

class InstrumentedCircuitBreaker<T extends (...args: any[]) => Promise<any>> {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private nextAttempt = Date.now();

  constructor(
    private fn: T,
    private config: CircuitBreakerConfig,
    private name: string
  ) {
    circuitState.set({ circuit_name: this.name }, 0);
  }

  async execute(...args: Parameters<T>): Promise<ReturnType<T>> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        circuitState.set({ circuit_name: this.name }, 1);
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
      circuitState.set({ circuit_name: this.name }, 2);
      this.successes = 0;
    }

    const start = Date.now();
    try {
      const result = await this.fn(...args);
      const duration = (Date.now() - start) / 1000;
      circuitDuration.observe(
        { circuit_name: this.name, outcome: 'success' },
        duration
      );
      this.onSuccess();
      return result;
    } catch (error) {
      const duration = (Date.now() - start) / 1000;
      circuitDuration.observe(
        { circuit_name: this.name, outcome: 'failure' },
        duration
      );
      circuitFailures.inc({ circuit_name: this.name });
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.config.halfOpenMaxCalls) {
        this.state = 'CLOSED';
        circuitState.set({ circuit_name: this.name }, 0);
        this.failures = 0;
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    if (this.state === 'HALF_OPEN' || this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      circuitState.set({ circuit_name: this.name }, 1);
      this.nextAttempt = Date.now() + this.config.recoveryTimeout;
    }
  }
}
```



