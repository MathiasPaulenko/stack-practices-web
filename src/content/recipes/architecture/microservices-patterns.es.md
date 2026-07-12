---



contentType: recipes
slug: microservices-patterns
title: "Diseñar Microservicios Resilientes con Circuit Breakers,"
description: "Cómo construir sistemas distribuidos tolerantes a fallos usando patrones de microservicios incluyendo circuit breakers, bulkheads, retries con backoff y sagas para gestión de transacciones."
metaDescription: "Aprende patrones de microservicios para sistemas resilientes. Implementa circuit breakers, bulkheads, retries con backoff y sagas tolerantes a fallos."
difficulty: advanced
topics:
  - architecture
tags:
  - architecture
  - bulkhead
  - circuit-breaker
  - design
  - patterns
relatedResources:
  - /recipes/api-gateway
  - /recipes/event-driven-functions
  - /recipes/load-balancing
  - /recipes/service-mesh
  - /recipes/circuit-breaker-pattern-recipe
  - /recipes/event-driven-architecture
  - /recipes/saga-pattern-recipe
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende patrones de microservicios para sistemas resilientes. Implementa circuit breakers, bulkheads, retries con backoff y sagas tolerantes a fallos."
  keywords:
    - patrones microservicios
    - circuit breaker
    - sistemas distribuidos
    - patron saga
    - arquitectura resiliente



---

## Visión general

Las arquitecturas de microservicios descomponen aplicaciones en servicios independientemente desplegables, cada uno poseyendo un contexto delimitado y comunicándose vía llamadas de red. Esta descomposición habilita autonomía de equipo, diversidad tecnológica y escalado independiente. Pero introduce un problema fundamental: la red es poco confiable. Cada llamada inter-servicio es un punto potencial de fallo — picos de latencia, fallos en cascada, fallas parciales e inconsistencia durante transacciones distribuidas.

Los patrones de resiliencia protegen el sistema de estos modos de fallo. Un circuit breaker deja de enviar requests a un servicio fallido, dándole tiempo para recuperarse. Un bulkhead aísla fallos para que no consuman todos los recursos. Los retries con backoff exponencial manejan fallos transitorios sin sobrecargar servicios en dificultades. El patrón saga reemplaza transacciones distribuidas con secuencias de transacciones locales coordinadas vía eventos. A continuacion se cubre la implementación de estos patrones core en múltiples lenguajes y frameworks.

## Cuándo usarlo

Usa esta receta cuando:

- Migrando de un monolito a una arquitectura distribuida con 5+ servicios. Consulta [Guía de Migración](/guides/architecture/monolith-to-microservices-migration-guide) para estrategias de migración.
- Experimentando fallos en cascada donde un servicio lento degrada todo el sistema
- Implementando flujos de pago, gestión de inventario o procesamiento de órdenes entre servicios. Consulta [Saga Pattern](/recipes/saga-pattern-recipe) para transacciones distribuidas.
- Operando servicios con diferentes SLAs de confiabilidad en infraestructura compartida
- Construyendo plataformas donde servicios individuales deben fallar sin impactar el conjunto

## Solución

### Circuit Breaker (Python)

```python
import time
from enum import Enum

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30, half_open_max_calls=3):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = None
        self.half_open_calls = 0

    def call(self, func, *args, **kwargs):
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                self.half_open_calls = 0
            else:
                raise Exception("Circuit breaker is OPEN")

        if self.state == CircuitState.HALF_OPEN:
            if self.half_open_calls >= self.half_open_max_calls:
                raise Exception("Circuit breaker is HALF_OPEN")
            self.half_open_calls += 1

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e

    def _on_success(self):
        self.failure_count = 0
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.CLOSED

    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN

breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=10)

def get_user_profile(user_id):
    pass

try:
    profile = breaker.call(get_user_profile, user_id=123)
except Exception as e:
    profile = get_cached_profile(123)
```

### Retry con Backoff Exponencial (JavaScript / p-retry)

```javascript
const pRetry = require('p-retry');

async function callPaymentService(orderId) {
  const response = await fetch(`https://payments.internal/api/charge/${orderId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`Payment service returned ${response.status}`);
  return response.json();
}

const chargeWithRetry = async (orderId) => {
  return pRetry(() => callPaymentService(orderId), {
    retries: 5,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 30000,
    randomize: true,
    retryIf: (error) => error.message.includes('5') || error.code === 'ECONNREFUSED',
  });
};
```

### Patrón Saga para Transacciones Distribuidas (TypeScript)

```typescript
interface SagaStep {
  execute(): Promise<void>;
  compensate(): Promise<void>;
}

class OrderSaga {
  private steps: SagaStep[] = [];
  private completedSteps: SagaStep[] = [];

  addStep(step: SagaStep) { this.steps.push(step); return this; }

  async execute() {
    for (const step of this.steps) {
      try {
        await step.execute();
        this.completedSteps.push(step);
      } catch (error) {
        for (const completed of this.completedSteps.reverse()) {
          await completed.compensate();
        }
        throw new Error(`Saga failed: ${error}`);
      }
    }
  }
}

const orderSaga = new OrderSaga()
  .addStep({
    execute: () => inventoryService.reserve(order.items),
    compensate: () => inventoryService.release(order.items),
  })
  .addStep({
    execute: () => paymentService.charge(order.total),
    compensate: () => paymentService.refund(order.total),
  })
  .addStep({
    execute: () => shippingService.createShipment(order),
    compensate: () => shippingService.cancelShipment(order),
  });

await orderSaga.execute();
```

## Explicación

- **Circuit breaker**: previene fallos en cascada deteniendo requests a un servicio fallido. Cuando los fallos exceden un umbral, el breaker se abre y retorna errores inmediatamente. Después de un timeout, entra en estado half-open permitiendo requests limitados de prueba. Si estos tienen éxito, se cierra nuevamente. Esto da a servicios sobrecargados tiempo para recuperarse.
- **Backoff exponencial**: reintentar inmediatamente después de un fallo frecuentemente golpea el mismo servicio en dificultades. El backoff incrementa el delay entre retries exponencialmente (1s, 2s, 4s, 8s...), distribuyendo la carga y permitiendo recuperación. Agregar jitter previene tormentas de retry sincronizadas.
- **Patrón bulkhead**: aísla fallos limitando recursos (threads, conexiones, memoria) asignados a cada dependencia de servicio. Si el servicio de pagos es lento, el bulkhead asegura que solo threads relacionados a pagos se bloqueen, dejando threads de inventario y catálogo sin afectar.
- **Patrón saga**: las transacciones ACID distribuidas son impracticables entre microservicios. Las sagas descomponen una transacción de negocio en transacciones locales, cada una con un rollback compensatorio. Si el paso 3 falla, los pasos 2 y 1 se deshacen, manteniendo consistencia eventual.

## Variantes

| Patrón | Manejo de fallos | Consistencia | Complejidad | Mejor para |
|--------|-----------------|--------------|---------------|------------|
| Circuit breaker | Fail rápido | N/A | Baja | Protección contra sobrecarga |
| Retry + backoff | Recuperación transitoria | N/A | Baja | Problemas de red momentáneos |
| Bulkhead | Aislamiento de recursos | N/A | Media | Servicios de criticidad mixta |
| Saga (coreografía) | Rollback vía eventos | Eventual | Alta | Servicios débilmente acoplados |
| Saga (orquestación) | Coordinador central | Eventual | Alta | Flujos de trabajo complejos |

## Lo que funciona

- **Establece budgets de timeout apropiados**: cada llamada saliente debería tener un timeout más corto que el timeout del llamador. Si tu API tiene un SLA de 2 segundos, las llamadas downstream deberían timeoutear a los 500ms para dejar margen para retries y fallbacks.
- **Implementa degradación graceful**: cuando un servicio no está disponible, retorna datos cacheados, valores por defecto o funcionalidad reducida en lugar de fallar completamente. Una página de producto sin recomendaciones es mejor que un error 500.
- **Monitorea el estado del circuit breaker**: expone estados de breakers (closed/open/half-open) como métricas. Alerta cuando los breakers se abren frecuentemente — esto indica problemas sistémicos, no solo fallos transitorios.
- **Idempotencia para retries**: los retries pueden causar operaciones duplicadas. Asegura que todos los endpoints de mutación sean idempotentes. Consulta [Endpoints Idempotentes](/recipes/api/idempotent-api-endpoints) para patrones de deduplicación. Sin idempotencia, los retries crean datos inconsistentes.
- **Testea inyección de fallos**: usa herramientas como Chaos Monkey, Gremlin o Toxiproxy para introducir aleatoriamente latencia, errores y particiones de red en staging. Si tus patrones de resiliencia solo funcionan en teoría, fallarán en producción.

## Errores comunes

- **Reintentar en todos los errores**: un 404 Not Found o 401 Unauthorized no tendrá éxito al reintentar. Solo reintenta operaciones idempotentes que fallen con 5xx, timeouts o errores de red. Reintentar 400 Bad Request desperdicia recursos y genera ruido en logs.
- **Loops infinitos de retry**: sin un máximo de reintentos o timeout, una dependencia fallida puede crear un loop infinito de retries, consumiendo threads y memoria. Siempre limita retries a 3-5 intentos con un budget total bajo 30 segundos.
- **Ignorar pools de threads**: los retries bloqueantes consumen threads. En runtimes async (Node.js, Go), esto agota el event loop. Usa bibliotecas de retry async y pools de threads acotados para prevenir agotamiento de recursos.
- **Faltar compensaciones en sagas**: una saga sin compensación es solo una secuencia de requests esperanzados. Si el paso 3 falla pero los pasos 1-2 no tienen rollback, el sistema queda en un estado inconsistente. Cada paso de saga debe tener una compensación testeada.

## Preguntas frecuentes

**P: ¿Debería usar coreografía u orquestación para sagas?**
R: La coreografía (event-driven) escala mejor para servicios débilmente acoplados pero es más difícil de trazar. La orquestación (coordinador central) es más fácil de debuggear y monitorear pero crea un punto único de complejidad. Empieza con orquestación por claridad, migra a coreografía para escalar.

**P: ¿Cómo prevengo tormentas de retry después de una caída?**
R: Usa backoff exponencial con jitter, circuit breakers y rate limiters. Cuando un servicio se recupera, distribuye los retries entre la población de clientes para que el servicio en recuperación no sea abrumado por requests sincronizados.

**P: ¿Puedo combinar [circuit breakers](/recipes/circuit-breaker-pattern-recipe) y [retries](/recipes/architecture/retry-backoff)?**
R: Sí — este es el patrón estándar. El retry maneja fallos transitorios. Si los retries se agotan, el circuit breaker se abre. Esto capas defensa: los retries arreglan problemas pequeños, los circuit breakers previenen colapso durante cortes mayores.

**P: ¿Cuál es la diferencia entre una [saga](/recipes/saga-pattern-recipe) y two-phase commit?**
R: Two-phase commit (2PC) bloquea recursos entre servicios, esperando hasta que todos los participantes confirmen. Las sagas no bloquean — ejecutan pasos secuencialmente y compensan ante fallo. Las sagas intercambian consistencia inmediata por disponibilidad y tolerancia a particiones (BASE vs ACID). Consulta [Arquitectura Event-Driven](/recipes/architecture/event-driven-architecture) para coordinación basada en eventos.


### Patrón Bulkhead (Go / errgroup con semáforo)

```go
package main

import (
	"context"
	"fmt"
	"sync"
	"time"

	"golang.org/x/sync/errgroup"
)

type Bulkhead struct {
	sem chan struct{}
}

func NewBulkhead(maxConcurrent int) *Bulkhead {
	return &Bulkhead{sem: make(chan struct{}, maxConcurrent)}
}

func (b *Bulkhead) Execute(ctx context.Context, fn func() error) error {
	select {
	case b.sem <- struct{}{}:
		defer func() { <-b.sem }()
		return fn()
	case <-ctx.Done():
		return ctx.Err()
	}
}

type ResilientClient struct {
	paymentBulkhead    *Bulkhead
	inventoryBulkhead  *Bulkhead
	shippingBulkhead   *Bulkhead
}

func NewResilientClient() *ResilientClient {
	return &ResilientClient{
		paymentBulkhead:   NewBulkhead(10),
		inventoryBulkhead: NewBulkhead(20),
		shippingBulkhead:  NewBulkhead(5),
	}
}

func (c *ResilientClient) ProcessOrder(ctx context.Context, order Order) error {
	g, ctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		return c.paymentBulkhead.Execute(ctx, func() error {
			return c.callPaymentService(ctx, order)
		})
	})

	g.Go(func() error {
		return c.inventoryBulkhead.Execute(ctx, func() error {
			return c.callInventoryService(ctx, order)
		})
	})

	if err := g.Wait(); err != nil {
		return fmt.Errorf("order processing failed: %w", err)
	}

	return c.shippingBulkhead.Execute(ctx, func() error {
		return c.callShippingService(ctx, order)
	})
}

func (c *ResilientClient) callPaymentService(ctx context.Context, order Order) error {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	// Llamada HTTP al servicio de pagos
	return nil
}

func (c *ResilientClient) callInventoryService(ctx context.Context, order Order) error {
	ctx, cancel := context.WithTimeout(ctx, 1*time.Second)
	defer cancel()
	// Llamada HTTP al servicio de inventario
	return nil
}

func (c *ResilientClient) callShippingService(ctx context.Context, order Order) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	// Llamada HTTP al servicio de envíos
	return nil
}
```

### Resiliencia Combinada con Java Resilience4j

```java
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.bulkhead.Bulkhead;
import io.github.resilience4j.bulkhead.BulkheadConfig;
import io.github.resilience4j.timelimiter.TimeLimiter;
import io.vavr.control.Try;

import java.time.Duration;
import java.util.concurrent.*;

public class ResilientPaymentClient {

    private final CircuitBreaker circuitBreaker;
    private final Retry retry;
    private final Bulkhead bulkhead;
    private final TimeLimiter timeLimiter;
    private final ExecutorService executor;

    public ResilientPaymentClient() {
        // Circuit breaker: abre con 50% de tasa de fallo y mínimo 10 llamadas
        CircuitBreakerConfig cbConfig = CircuitBreakerConfig.custom()
            .failureRateThreshold(50)
            .slowCallRateThreshold(50)
            .slowCallDurationThreshold(Duration.ofSeconds(2))
            .minimumNumberOfCalls(10)
            .waitDurationInOpenState(Duration.ofSeconds(30))
            .permittedNumberOfCallsInHalfOpenState(3)
            .build();
        this.circuitBreaker = CircuitBreaker.of("payment", cbConfig);

        // Retry: 3 intentos con backoff exponencial
        RetryConfig retryConfig = RetryConfig.custom()
            .maxAttempts(3)
            .waitDuration(Duration.ofMillis(500))
            .intervalFunction(attempt -> Math.pow(2, attempt) * 500)
            .retryOnException(e -> e instanceof TimeoutException || e instanceof ConnectionException)
            .build();
        this.retry = Retry.of("payment", retryConfig);

        // Bulkhead: máximo 10 llamadas concurrentes
        BulkheadConfig bulkheadConfig = BulkheadConfig.custom()
            .maxConcurrentCalls(10)
            .maxWaitDuration(Duration.ofMillis(500))
            .build();
        this.bulkhead = Bulkhead.of("payment", bulkheadConfig);

        // Time limiter: máximo 3 segundos
        this.timeLimiter = TimeLimiter.of(Duration.ofSeconds(3));
        this.executor = Executors.newCachedThreadPool();
    }

    public PaymentResult charge(String orderId, double amount) {
        Supplier<PaymentResult> supplier = () -> callPaymentService(orderId, amount);

        Supplier<PaymentResult> decorated = Decorators.ofSupplier(supplier)
            .withCircuitBreaker(circuitBreaker)
            .withRetry(retry)
            .withBulkhead(bulkhead)
            .decorate();

        return Try.ofSupplier(decorated)
            .recover(throwable -> {
                // Fallback: retornar resultado cacheado o por defecto
                return PaymentResult.degraded(orderId, "Payment unavailable, using fallback");
            })
            .get();
    }

    private PaymentResult callPaymentService(String orderId, double amount) {
        // Llamada HTTP real al servicio de pagos
        // Lanza excepción en caso de fallo
        return new PaymentResult(orderId, "SUCCESS");
    }
}
```

### Health Probes de Kubernetes para Resiliencia

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
        - name: order-service
          image: myregistry/order-service:latest
          ports:
            - containerPort: 8080
          # Liveness probe: reiniciar contenedor si no está saludable
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3
          # Readiness probe: remover del servicio si no está listo
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 2
          # Startup probe: esperar a que la app arranque
          startupProbe:
            httpGet:
              path: /health/startup
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
            failureThreshold: 30
          resources:
            limits:
              cpu: "500m"
              memory: "512Mi"
            requests:
              cpu: "250m"
              memory: "256Mi"
```

```typescript
// Endpoints de health check para probes de Kubernetes
import express from 'express';

const app = express();

// Liveness: ¿el proceso está corriendo?
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Readiness: ¿podemos manejar tráfico?
app.get('/health/ready', async (req, res) => {
  const checks = await Promise.allSettled([
    checkDatabaseConnection(),
    checkRedisConnection(),
    checkDownstreamServices(),
  ]);

  const allHealthy = checks.every(c => c.status === 'fulfilled');
  if (allHealthy) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({
      status: 'not ready',
      failures: checks
        .filter(c => c.status === 'rejected')
        .map(c => c.reason.message),
    });
  }
});

// Startup: ¿la app terminó de inicializar?
app.get('/health/startup', (req, res) => {
  if (app.locals.initialized) {
    res.status(200).json({ status: 'started' });
  } else {
    res.status(503).json({ status: 'starting' });
  }
});
```

## Mejores Prácticas Adicionales

1. **Usa una biblioteca de resiliencia en lugar de construir desde cero.** Las bibliotecas production-grade manejan edge cases que las implementaciones hechas a mano omiten — thread safety, recolección de métricas, hot-reload de configuración y composición de múltiples patrones:

```java
// Composición de decoradores Resilience4j
Supplier<String> decorated = Decorators.ofSupplier(this::callService)
    .withCircuitBreaker(circuitBreaker)
    .withRetry(retry)
    .withBulkhead(bulkhead)
    .withTimeLimiter(timeLimiter)
    .withFallback(List.of(TimeoutException.class), e -> "fallback")
    .decorate();
```

2. **Distribuye budgets de timeout entre cadenas de llamadas.** Si un endpoint API tiene un SLA de 5 segundos y llama a 3 servicios, cada servicio obtiene una fracción del budget. El gateway obtiene 5s, el servicio A obtiene 3s (dejando 2s para B y C), el servicio B obtiene 1.5s, el servicio C obtiene 500ms. Esto previene que los timeouts downstream excedan el budget upstream:

```go
func handleRequest(w http.ResponseWriter, r *http.Request) {
    ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
    defer cancel()

    // Servicio A: budget de 3s
    ctxA, cancelA := context.WithTimeout(ctx, 3*time.Second)
    defer cancelA()
    resultA := callServiceA(ctxA)

    // Servicio B: budget de 1.5s (restante de A)
    ctxB, cancelB := context.WithTimeout(ctx, 1500*time.Millisecond)
    defer cancelB()
    resultB := callServiceB(ctxB)
}
```

3. **Implementa request hedging para lecturas críticas.** Para operaciones de lectura donde la latencia importa más que el costo, envía la misma request a dos réplicas y usa la primera respuesta. Esto enmascara réplicas lentas y reduce la latencia de cola:

```python
import asyncio
import aiohttp

async def hedged_request(session, url, timeout=2.0):
    tasks = [
        asyncio.create_task(session.get(url, timeout=timeout)),
        asyncio.create_task(asyncio.sleep(0.1) or session.get(url, timeout=timeout)),
    ]
    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
    for p in pending:
        p.cancel()
    return next(iter(done)).result()
```

## Errores Comunes Adicionales

1. **Usar el mismo circuit breaker para todos los servicios downstream.** Cada servicio downstream debería tener su propio circuit breaker con umbrales ajustados al perfil de confiabilidad de ese servicio. Un breaker compartido único se abriría cuando cualquier servicio falle, bloqueando llamadas a servicios saludables:

```typescript
// Incorrecto: breaker compartido
const sharedBreaker = new CircuitBreaker({ threshold: 5 });

// Correcto: breakers por servicio
const breakers = {
  payment: new CircuitBreaker({ threshold: 5, timeout: 30 }),
  inventory: new CircuitBreaker({ threshold: 10, timeout: 15 }),
  shipping: new CircuitBreaker({ threshold: 3, timeout: 60 }),
};
```

2. **No propagar el contexto de trace a través de retries y circuit breakers.** Cuando un retry o circuit breaker intercepta una llamada, el contexto de trace (W3C traceparent, headers B3) debe propagarse al servicio downstream. Sin esto, el distributed tracing se rompe y el debuggeo se vuelve imposible:

```java
// Resilience4j con propagación de contexto
Supplier<Response> decorated = Decorators.ofSupplier(() -> {
    String traceId = MDC.get("traceId");
    Request request = Request.builder()
        .url(url)
        .header("traceparent", traceId)
        .build();
    return httpClient.execute(request);
}).withCircuitBreaker(circuitBreaker).withRetry(retry).decorate();
```

3. **Configurar circuit breakers sin monitoreo.** Un circuit breaker que se abre silenciosamente es peor que no tener circuit breaker — las requests fallan sin indicación de por qué. Exporta cambios de estado del breaker a Prometheus y configura alertas:

```yaml
# Reglas de alerta de Prometheus
groups:
  - name: circuit_breaker
    rules:
      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state{state="open"} == 1
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Circuit breaker {{ $labels.circuit_name }} está abierto"
          description: "Circuit breaker ha estado abierto por más de 1 minuto"

      - alert: CircuitBreakerHighFailureRate
        expr: |
          rate(circuit_breaker_failures_total[5m]) /
          rate(circuit_breaker_calls_total[5m]) > 0.3
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Alta tasa de fallo en {{ $labels.circuit_name }}"
```

## FAQ Adicional

### ¿Cómo testeo la configuración de resiliencia de microservicios?

Usa chaos engineering para inyectar fallos en staging. Mata pods aleatorios con `kubectl delete pod` para testear que Kubernetes reagenda y el servicio se mantiene disponible. Usa Toxiproxy para inyectar latencia de red, packet loss y particiones entre servicios. Usa Chaos Mesh para inyectar stress de CPU, presión de memoria y latencia de IO de disco. Verifica que los circuit breakers se abren cuando se espera y que los fallbacks retornan respuestas degradadas apropiadas. Testea que los retries no causan cobros duplicados verificando las claves de idempotencia. Testea que las sagas compensan correctamente cuando un servicio downstream no está disponible. Para load testing, usa k6 o Gatling para generar tráfico mientras inyectas fallos — el sistema debería mantener tasas de error aceptables incluso con 20% de servicios fallando.

### ¿Esta solución está lista para producción?

Sí. Resilience4j se usa en producción por aplicaciones Spring Boot a escala, incluyendo Boeing y Deutsche Telekom. La biblioteca gobreaker se usa en microservicios Go en Uber y Twitch. Los health probes de Kubernetes son un patrón estándar usado por cada usuario major de Kubernetes. El patrón circuit breaker fue popularizado por Michael Nygard en Release It! y está documentado en el Microsoft Azure Architecture Center. Chaos engineering es practicado por Netflix (Chaos Monkey), Amazon (GameDays) y Google (DiRT exercises).

### ¿Cuáles son las características de rendimiento?

Un circuit breaker añade 0.01-0.1ms de overhead por llamada para verificación de estado. Retry con backoff exponencial añade el delay del retry más 0.01ms por intento para lógica de decisión. Un semáforo bulkhead añade 0.001ms por llamada para acquire/release. Los decoradores combinados de Resilience4j añaden 0.1-0.5ms por llamada para todos los patrones. Request hedging duplica el costo de la request pero reduce la latencia P99 en 30-50%. Los liveness probes de Kubernetes añaden 1-5ms cada 10 segundos para la llamada HTTP de health check. El overhead es despreciable comparado con la latencia típica de 1-50ms por llamada a servicio. El principal riesgo de rendimiento son las tormentas de retry — 1000 clientes reintentando simultáneamente pueden abrumar a un servicio en recuperación. Circuit breakers y jitter mitigan esto.

### ¿Cómo depuro problemas con este enfoque?

Revisa el estado del circuit breaker vía el endpoint de métricas (`/actuator/circuitbreakers` en Spring Boot, `/metrics` en implementaciones custom). Busca breakers atascados en estado OPEN — esto indica un servicio downstream que no se ha recuperado. Revisa las métricas de retry para conteos altos de retry — esto indica fallos persistentes en lugar de transitorios. Usa distributed tracing (Jaeger, Zipkin) para ver qué llamadas a servicios son lentas o están fallando. Revisa las métricas de bulkhead para llamadas rechazadas — si el bulkhead está lleno, aumenta el límite de concurrencia o arregla el downstream lento. Revisa los eventos de Kubernetes por reinicios de pods (`kubectl get events --sort-by='.lastTimestamp'`). Para fallos de saga, consulta la tabla de estado de saga por estado COMPENSATING. Para tormentas de retry, verifica si jitter está habilitado y si los circuit breakers están configurados para abrir antes de que los retries se agoten.
