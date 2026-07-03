---
contentType: recipes
slug: microservices-patterns
title: "Diseñar Microservicios Resilientes con Circuit Breakers, Retries y Timeouts"
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

Los patrones de resiliencia protegen el sistema de estos modos de fallo. Un circuit breaker deja de enviar requests a un servicio fallido, dándole tiempo para recuperarse. Un bulkhead aísla fallos para que no consuman todos los recursos. Los retries con backoff exponencial manejan fallos transitorios sin sobrecargar servicios en dificultades. El patrón saga reemplaza transacciones distribuidas con secuencias de transacciones locales coordinadas vía eventos. Esta receta cubre la implementación de estos patrones core en múltiples lenguajes y frameworks.

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


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
