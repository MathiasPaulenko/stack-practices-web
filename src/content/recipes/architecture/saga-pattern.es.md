---

contentType: recipes
slug: saga-pattern-recipe
title: "Gestionar Transacciones Distribuidas con el Saga Pattern"
description: "Cómo implementar orquestación y coreografía de sagas para mantener consistencia de datos entre microservicios sin transacciones distribuidas ni two-phase commit."
metaDescription: "Aprende saga pattern para transacciones distribuidas. Implementa orquestación y coreografía para mantener consistencia entre microservicios sin 2PC."
difficulty: advanced
topics:
  - architecture
tags:
  - architecture
  - compensation
  - design
  - patterns
  - scalability
relatedResources:
  - /recipes/microservices-patterns
  - /recipes/event-driven-architecture
  - /recipes/cqrs-pattern-recipe
  - /recipes/database-transactions
  - /recipes/circuit-breaker-pattern-recipe
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende saga pattern para transacciones distribuidas. Implementa orquestación y coreografía para mantener consistencia entre microservicios sin 2PC."
  keywords:
    - saga pattern
    - transacciones distribuidas
    - orquestacion saga
    - consistencia microservicios
    - compensacion transacciones

---

## Visión general

En una aplicación monolítica, una única transacción de base de datos envuelve múltiples operaciones: debitar una cuenta, acreditar otra, actualizar el estado de una orden. Si algún paso falla, la base de datos hace rollback de todo. La atomicidad está garantizada por el motor de base de datos. En una arquitectura de microservicios, cada servicio posee su propia base de datos. No hay un gestor de transacciones compartido. No puedes envolver un débito en el servicio de pagos, una reserva en el servicio de inventario y un envío en el servicio de logística en un solo bloque `BEGIN...COMMIT`.

El saga pattern resuelve esto dividiendo una transacción de larga duración en una secuencia de transacciones locales. Cada paso actualiza datos en un servicio y publica un evento o comando para activar el siguiente paso. Si un paso falla, la saga ejecuta transacciones compensatorias — deshaciendo los cambios realizados por los pasos anteriores. Hay dos estilos: coreografía (los servicios reaccionan a los eventos de los demás) y orquestación (un gestor de saga central dirige cada paso). Lo siguiente cubre ambos enfoques, diseño de compensaciones y manejo de fallas.

## Cuándo usarlo

Usa esta receta cuando:

- Una operación de negocio abarca múltiples microservicios con bases de datos independientes
- Two-phase commit (2PC) no está disponible o es inaceptable por latencia o contención de locks. Consulta [Arquitectura Event-Driven](/recipes/architecture/event-driven-architecture) para coordinación sin bloqueos.
- Las operaciones de larga duración deben sobrevivir a la indisponibilidad temporal de servicios
- Las acciones compensatorias son factibles (ej. reembolsar pago, liberar inventario, cancelar envío). Consulta [Microservices Patterns](/guides/architecture/microservices-architecture-guide) para estrategias de resiliencia.
- La consistencia eventual es aceptable para el caso de uso

## Solución

### Saga por Coreografía (Event-Driven)

```typescript
class OrderService {
  async createOrder(orderData: OrderData): Promise<void> {
    const order = await this.orderRepo.create(orderData);
    await this.eventBus.publish('OrderCreated', {
      orderId: order.id,
      items: order.items,
      total: order.total,
    });
  }

  async cancelOrder(orderId: string): Promise<void> {
    await this.orderRepo.updateStatus(orderId, 'cancelled');
  }
}

class InventoryService {
  constructor(private eventBus: EventBus) {
    this.eventBus.subscribe('OrderCreated', this.onOrderCreated.bind(this));
    this.eventBus.subscribe('PaymentFailed', this.onPaymentFailed.bind(this));
  }

  async onOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await this.inventoryRepo.reserve(event.items);
    await this.eventBus.publish('InventoryReserved', {
      orderId: event.orderId,
      items: event.items,
    });
  }

  async onPaymentFailed(event: PaymentFailedEvent): Promise<void> {
    await this.inventoryRepo.release(event.orderId);
  }
}

class PaymentService {
  constructor(private eventBus: EventBus) {
    this.eventBus.subscribe('InventoryReserved', this.onInventoryReserved.bind(this));
  }

  async onInventoryReserved(event: InventoryReservedEvent): Promise<void> {
    try {
      await this.paymentGateway.charge(event.orderId, event.total);
      await this.eventBus.publish('PaymentProcessed', { orderId: event.orderId });
    } catch (error) {
      await this.eventBus.publish('PaymentFailed', { orderId: event.orderId, reason: error.message });
    }
  }

  async refund(orderId: string): Promise<void> {
    await this.paymentGateway.refund(orderId);
  }
}
```

### Saga por Orquestación (Controlador Central)

```typescript
class OrderSagaOrchestrator {
  constructor(
    private orderService: OrderService,
    private inventoryService: InventoryService,
    private paymentService: PaymentService,
    private shippingService: ShippingService
  ) {}

  async execute(orderData: OrderData): Promise<SagaResult> {
    const state: SagaState = { orderId: generateUUID(), status: 'started' };

    try {
      await this.orderService.createOrder({ ...orderData, id: state.orderId });
      state.orderCreated = true;

      await this.inventoryService.reserve(state.orderId, orderData.items);
      state.inventoryReserved = true;

      await this.paymentService.charge(state.orderId, orderData.total);
      state.paymentProcessed = true;

      await this.shippingService.schedule(state.orderId, orderData.address);
      state.shipped = true;

      return { success: true, orderId: state.orderId };
    } catch (error) {
      await this.compensate(state);
      return { success: false, orderId: state.orderId, error: error.message };
    }
  }

  private async compensate(state: SagaState): Promise<void> {
    if (state.shipped) {
      await this.shippingService.cancel(state.orderId);
    }
    if (state.paymentProcessed) {
      await this.paymentService.refund(state.orderId);
    }
    if (state.inventoryReserved) {
      await this.inventoryService.release(state.orderId);
    }
    if (state.orderCreated) {
      await this.orderService.cancelOrder(state.orderId);
    }
  }
}
```

### Máquina de Estados de Saga (Temporal / Cadence)

```typescript
import { workflow, activity } from '@temporalio/workflow';

const createOrder = activity('createOrder');
const reserveInventory = activity('reserveInventory');
const processPayment = activity('processPayment');
const scheduleShipping = activity('scheduleShipping');
const refundPayment = activity('refundPayment');
const releaseInventory = activity('releaseInventory');

async function orderSaga(orderData: OrderData): Promise<void> {
  const orderId = await createOrder(orderData);

  try {
    await reserveInventory({ orderId, items: orderData.items });
  } catch (error) {
    await compensateOrder(orderId);
    throw error;
  }

  try {
    await processPayment({ orderId, amount: orderData.total });
  } catch (error) {
    await releaseInventory({ orderId });
    await compensateOrder(orderId);
    throw error;
  }

  try {
    await scheduleShipping({ orderId, address: orderData.address });
  } catch (error) {
    await refundPayment({ orderId });
    await releaseInventory({ orderId });
    await compensateOrder(orderId);
    throw error;
  }
}
```

## Explicación

- **Coreografía**: cada servicio publica un evento después de completar su paso. Otros servicios se suscriben y reaccionan. No hay un controlador central. La saga emerge de la interacción de servicios independientes. Es altamente desacoplado pero puede volverse difícil de trazar a medida que crece el número de servicios.
- **Orquestación**: un orquestador de saga dedicado ejecuta pasos secuencialmente, llamando a cada servicio directamente. El orquestador mantiene el estado de la saga y maneja compensaciones si un paso falla. Centraliza la lógica y hace el flujo explícito, pero introduce un punto de control único.
- **Transacciones compensatorias**: a diferencia de los rollbacks de base de datos, las compensaciones son operaciones de negocio explícitas. Reembolsar un pago no es lo mismo que deshacer un `BEGIN...ROLLBACK`. La compensación puede fallar por sí misma, requiriendo reintento o intervención humana. Diseña compensaciones idempotentes que puedan reintentarse de forma segura.
- **Idempotencia**: cada paso de saga y compensación debe ser idempotente. Consulta [Endpoints Idempotentes](/recipes/api/idempotent-api-endpoints) para patrones de deduplicación. Si la red se agota, el orquestador puede reintentar un paso que ya tuvo éxito. El servicio debe reconocer la solicitud duplicada y devolver el resultado anterior, no ejecutar la operación de nuevo.

## Variantes

| Estilo | Acoplamiento | Visibilidad | Complejidad | Mejor para |
|--------|-------------|-------------|-------------|------------|
| Coreografía | Débil | Pobre (distribuida) | Baja inicial, alta a escala | Flujos simples, pocos servicios |
| Orquestación | Más fuerte | Buena (central) | Media | Flujos complejos, muchos pasos |
| Máquina de estados | Débil | Excelente | Alta | Larga duración, aprobación humana |

## Lo que funciona

- **Haz cada paso idempotente**: una saga puede reintentar pasos por timeouts de red. Si `reserveInventory` se llama dos veces para la misma orden, debe devolver el mismo ID de reserva en lugar de crear una duplicada. Usa IDs de orden como claves de deduplicación.
- **Diseña compensaciones antes de implementar pasos**: para cada acción hacia adelante, define la compensación correspondiente antes de escribir la acción. Si no puedes definir una compensación (ej. enviar un email no se puede deshacer), reconsidera si el saga pattern encaja.
- **Persiste el estado de la saga**: el orquestador debe almacenar el progreso de la saga en una base de datos, no solo en memoria. Si el orquestador falla en medio de una saga, una nueva instancia debe poder reanudar desde el último paso completado y ejecutar las compensaciones apropiadas.
- **Configura timeouts en cada paso**: un paso de saga que se cuelga indefinitivamente bloquea toda la saga. Configura timeouts por paso (ej. 5 segundos para reserva de inventario, 10 segundos para pago). Si un timeout se dispara, trátalo como falla y compensa.
- **Monitorea la tasa de completitud de sagas**: rastrea el porcentaje de sagas que completan exitosamente vs. las que requieren compensación. Una alta tasa de compensación indica problemas sistémicos — pagos fallando, inventario insuficiente, o servicios downstream inestables. Arregla la causa raíz, no solo los síntomas.

## Errores comunes

- **Compensación faltante para un paso**: la saga debita el pago pero no tiene compensación para la reserva de inventario. Si el pago falla después de la reserva, el inventario permanece reservado para siempre. Cada paso debe tener una transacción compensatoria correspondiente.
- **Orden de compensación incorrecto**: compensar en el orden equivocado puede causar fallas. Si reembolsas el pago antes de cancelar el envío, el servicio de envío puede cobrar de nuevo. Compensa en orden inverso a los pasos hacia adelante: deshaz el último paso primero.
- **Tratar sagas como transacciones ACID**: las sagas proveen consistencia eventual, no atomicidad. Entre el paso de pago y el de envío, el pago está comprometido y el envío aún no está programado. Hay una ventana donde el sistema es inconsistente. Diseña la UI y los procesos downstream para manejar esto.
- **Falta de visibilidad de saga**: una saga atascada (compensación fallando repetidamente) es invisible sin monitoreo dedicado. Construye un dashboard de sagas mostrando activas, completadas y en compensación. Alerta sobre sagas atascadas en compensación por más de 5 minutos.

## Preguntas frecuentes

**P: ¿Es saga mejor que two-phase commit (2PC)?**
R: Para microservicios, generalmente sí. 2PC mantiene locks entre servicios durante la fase de preparación, causando latencia y problemas de disponibilidad. Las sagas liberan locks inmediatamente después de cada transacción local. El trade-off es consistencia eventual en lugar de consistencia fuerte.

**P: ¿Cómo manejo una compensación que falla?**
R: Reintenta con backoff exponencial. Si los reintentos se agotan, alerta a un operador y estaciona la saga en una cola de resolución manual. Algunas compensaciones (reembolsos) pueden requerir aprobación humana. Construye flujos de escalación para compensaciones irresolubles.

**P: ¿Puedo consultar el estado de una saga?**
R: Sí — mantén una tabla de estado de saga en la base de datos del orquestador. Cada fila representa una instancia de saga con columnas para el paso actual, pasos completados y detalles de error. Expón una API de lectura para equipos de soporte y dashboards de monitoreo.

**P: ¿Debería toda interacción entre microservicios usar saga?**
R: No. Las sagas agregan complejidad. Úsalas para procesos de negocio de múltiples pasos que deben ser todo-o-nada. Para llamadas simples uno-a-uno que pueden fallar independientemente, usa llamadas API directas con [retries](/recipes/architecture/retry-backoff) y [circuit breakers](/recipes/circuit-breaker-pattern-recipe).


### Orquestador Java Spring Boot con Event Sourcing

```java
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderSagaManager {

    private final OrderRepository orderRepo;
    private final SagaStateRepository sagaStateRepo;
    private final InventoryClient inventoryClient;
    private final PaymentClient paymentClient;
    private final ShippingClient shippingClient;

    public OrderSagaManager(OrderRepository orderRepo,
                            SagaStateRepository sagaStateRepo,
                            InventoryClient inventoryClient,
                            PaymentClient paymentClient,
                            ShippingClient shippingClient) {
        this.orderRepo = orderRepo;
        this.sagaStateRepo = sagaStateRepo;
        this.inventoryClient = inventoryClient;
        this.paymentClient = paymentClient;
        this.shippingClient = shippingClient;
    }

    @Transactional
    public SagaResult execute(OrderData orderData) {
        String sagaId = UUID.randomUUID().toString();
        SagaState state = new SagaState(sagaId, orderData.getOrderId());
        sagaStateRepo.save(state);

        try {
            // Paso 1: Crear orden
            orderRepo.save(new Order(orderData));
            state.setCurrentStep("ORDER_CREATED");
            sagaStateRepo.save(state);

            // Paso 2: Reservar inventario
            inventoryClient.reserve(orderData.getOrderId(), orderData.getItems());
            state.setCurrentStep("INVENTORY_RESERVED");
            sagaStateRepo.save(state);

            // Paso 3: Procesar pago
            paymentClient.charge(orderData.getOrderId(), orderData.getTotal());
            state.setCurrentStep("PAYMENT_PROCESSED");
            sagaStateRepo.save(state);

            // Paso 4: Programar envío
            shippingClient.schedule(orderData.getOrderId(), orderData.getAddress());
            state.setCurrentStep("SHIPPING_SCHEDULED");
            state.setStatus("COMPLETED");
            sagaStateRepo.save(state);

            return SagaResult.success(sagaId);

        } catch (Exception e) {
            state.setStatus("COMPENSATING");
            state.setError(e.getMessage());
            sagaStateRepo.save(state);
            compensate(state);
            state.setStatus("COMPENSATED");
            sagaStateRepo.save(state);
            return SagaResult.failure(sagaId, e.getMessage());
        }
    }

    private void compensate(SagaState state) {
        // Compensar en orden inverso
        if ("SHIPPING_SCHEDULED".equals(state.getCurrentStep())) {
            shippingClient.cancel(state.getOrderId());
        }
        if ("PAYMENT_PROCESSED".equals(state.getCurrentStep()) ||
            "SHIPPING_SCHEDULED".equals(state.getCurrentStep())) {
            paymentClient.refund(state.getOrderId());
        }
        if ("INVENTORY_RESERVED".equals(state.getCurrentStep()) ||
            "PAYMENT_PROCESSED".equals(state.getCurrentStep()) ||
            "SHIPPING_SCHEDULED".equals(state.getCurrentStep())) {
            inventoryClient.release(state.getOrderId());
        }
        orderRepo.updateStatus(state.getOrderId(), "CANCELLED");
    }

    public void resume(String sagaId) {
        SagaState state = sagaStateRepo.findById(sagaId)
            .orElseThrow(() -> new SagaNotFoundException(sagaId));

        if ("COMPENSATING".equals(state.getStatus())) {
            compensate(state);
        }
    }
}
```

### Persistencia de Estado de Saga con PostgreSQL

```sql
CREATE TABLE saga_state (
    saga_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id         UUID NOT NULL,
    saga_type        VARCHAR(100) NOT NULL,
    current_step     VARCHAR(50),
    status           VARCHAR(20) NOT NULL DEFAULT 'STARTED',
    error            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at     TIMESTAMPTZ
);

CREATE INDEX idx_saga_status ON saga_state(status);
CREATE INDEX idx_saga_order ON saga_state(order_id);

CREATE TABLE saga_steps (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saga_id      UUID NOT NULL REFERENCES saga_state(saga_id),
    step_name    VARCHAR(50) NOT NULL,
    step_status  VARCHAR(20) NOT NULL,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error        TEXT
);

CREATE INDEX idx_steps_saga ON saga_steps(saga_id);
```

```python
import asyncpg
from dataclasses import dataclass
from enum import Enum
from datetime import datetime

class SagaStatus(Enum):
    STARTED = "STARTED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    COMPENSATING = "COMPENSATING"
    COMPENSATED = "COMPENSATED"
    FAILED = "FAILED"

@dataclass
class SagaState:
    saga_id: str
    order_id: str
    saga_type: str
    current_step: str
    status: SagaStatus
    error: str | None

class SagaStateRepository:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def create(self, order_id: str, saga_type: str) -> SagaState:
        row = await self.pool.fetchrow(
            """INSERT INTO saga_state (order_id, saga_type, status)
               VALUES ($1, $2, 'STARTED')
               RETURNING saga_id, order_id, saga_type, current_step, status, error""",
            order_id, saga_type
        )
        return SagaState(
            saga_id=str(row['saga_id']),
            order_id=str(row['order_id']),
            saga_type=row['saga_type'],
            current_step=row['current_step'],
            status=SagaStatus(row['status']),
            error=row['error']
        )

    async def update_step(self, saga_id: str, step: str, status: SagaStatus, error: str = None):
        await self.pool.execute(
            """UPDATE saga_state
               SET current_step = $2, status = $3, error = $4, updated_at = NOW()
               WHERE saga_id = $1""",
            saga_id, step, status.value, error
        )

    async def record_step(self, saga_id: str, step_name: str, status: str, error: str = None):
        await self.pool.execute(
            """INSERT INTO saga_steps (saga_id, step_name, step_status, error)
               VALUES ($1, $2, $3, $4)""",
            saga_id, step_name, status, error
        )

    async def get_stuck_sagas(self, older_than_minutes: int = 5) -> list[SagaState]:
        rows = await self.pool.fetch(
            """SELECT * FROM saga_state
               WHERE status IN ('COMPENSATING', 'RUNNING')
               AND updated_at < NOW() - INTERVAL '%s minutes'
               ORDER BY updated_at ASC""",
            older_than_minutes
        )
        return [SagaState(
            saga_id=str(r['saga_id']),
            order_id=str(r['order_id']),
            saga_type=r['saga_type'],
            current_step=r['current_step'],
            status=SagaStatus(r['status']),
            error=r['error']
        ) for r in rows]
```

## Mejores Prácticas Adicionales

1. **Usa semantic lock para prevenir sagas concurrentes.** Si dos sagas intentan reservar el mismo inventario simultáneamente, ambas pueden tener éxito y sobrevender. Usa un semantic lock — un flag en la base de datos que marca la entidad como siendo procesada por una saga:

```sql
-- Añadir columna pending_state a la tabla de órdenes
ALTER TABLE orders ADD COLUMN pending_state VARCHAR(50) DEFAULT NULL;

-- Antes de iniciar la saga, establecer el estado pendiente
UPDATE orders SET pending_state = 'PAYMENT_PENDING' WHERE id = $1 AND pending_state IS NULL;
-- Si 0 filas afectadas, otra saga ya está procesando esta orden
```

2. **Implementa replay de saga para recuperación de crashes.** Cuando el orquestador se reinicia después de un crash, debe identificar sagas incompletas y reanudarlas. Usa un worker en background para escanear sagas atascadas:

```typescript
class SagaRecoveryWorker {
  constructor(private sagaRepo: SagaStateRepository) {}

  async run(): Promise<void> {
    const stuckSagas = await this.sagaRepo.findStuckSagas(5); // más antiguas que 5 min

    for (const saga of stuckSagas) {
      if (saga.status === 'COMPENSATING') {
        await this.orchestrator.compensate(saga);
      } else if (saga.status === 'RUNNING') {
        await this.orchestrator.resume(saga);
      }
    }
  }

  start(): void {
    setInterval(() => this.run(), 60000); // cada minuto
  }
}
```

3. **Versiona las definiciones de saga para compatibilidad backward.** Cuando añades un nuevo paso a una saga, las sagas en curso deberían completarse con la definición anterior. Almacena la versión de saga en el estado:

```java
public class SagaDefinition {
    private final String version;
    private final List<SagaStep> steps;

    public SagaDefinition(String version, List<SagaStep> steps) {
        this.version = version;
        this.steps = steps;
    }

    public List<SagaStep> getStepsForVersion(String stateVersion) {
        if (stateVersion.equals(this.version)) {
            return this.steps;
        }
        // Retornar pasos compatibles para versiones anteriores
        return getCompatibleSteps(stateVersion);
    }
}
```

## Errores Comunes Adicionales

1. **No manejar fallos no-retriables.** Algunos fallos no pueden repararse reintentando — una tarjeta de crédito inválida, un item agotado, un permiso denegado. La saga debería distinguir fallos retriables de no-retriables y saltar los reintentos para los no-retriables:

```typescript
class SagaStep {
  async execute(state: SagaState): Promise<void> {
    try {
      await this.action(state);
    } catch (error) {
      if (this.isNonRetriable(error)) {
        // Saltar reintento, ir directo a compensación
        state.nonRetriable = true;
        throw error;
      }
      throw error; // será reintentado por el orquestador
    }
  }

  private isNonRetriable(error: Error): boolean {
    return error instanceof ValidationError ||
           error instanceof PermissionError ||
           error instanceof NotFoundError;
  }
}
```

2. **Mezclar orquestación y coreografía en la misma saga.** Si algunos pasos son orquestados y otros event-driven, el flujo se vuelve difícil de trazar y debuggear. Elige un estilo por saga. Si necesitas ambos, divide en dos sagas — una orquestada, una coreografiada — con un boundary claro entre ellas.

3. **No testear los paths de compensación.** Los equipos testean el happy path pero raramente testean la compensación. Inyecta fallos en cada paso y verifica que las compensaciones se ejecutan en el orden correcto. Testea que las compensaciones son idempotentes ejecutándolas dos veces. Testea que las compensaciones parciales (la compensación misma falla a mitad de camino) dejan el sistema en un estado recuperable:

```java
@Test
void testCompensationWhenPaymentFails() {
    // Setup: orden creada, inventario reservado
    when(paymentClient.charge(any(), any()))
        .thenThrow(new PaymentException("card declined"));

    SagaResult result = sagaManager.execute(orderData);

    assertFalse(result.isSuccess());
    verify(inventoryClient).release(orderData.getOrderId());
    verify(orderRepo).updateStatus(orderData.getOrderId(), "CANCELLED");
    verify(shippingClient, never()).schedule(any(), any());
}
```

## FAQ Adicional

### ¿Cómo testeo la configuración de saga?

Escribe tests de integración que inyecten fallos en cada paso. Usa un mock o stub para cada servicio downstream y configúralo para lanzar en conteos de llamada específicos. Verifica que las compensaciones se ejecutan en orden inverso. Testea la recuperación de crash matando el orquestador a mitad de saga y verificando que el worker de recuperación reanuda correctamente. Testea idempotencia llamando cada paso dos veces y verificando que no hay efectos secundarios duplicados. Para load testing, ejecuta 1000 sagas concurrentes y verifica que no hay sobreventa de inventario ni doble cobro. Para chaos testing, inyecta particiones de red entre el orquestador y un servicio — la saga debería hacer timeout, compensar, y dejar el sistema consistente.

### ¿Esta solución está lista para producción?

Sí. Temporal se usa en producción por Uber, Snap y Coinbase para orquestación de workflows. AWS Step Functions es usado por miles de clientes AWS para coordinación de sagas. EventStoreDB es usado por compañías como Red Bull y HSBC para sagas event-sourced. El saga pattern está documentado en el libro Microservices Patterns de Chris Richardson y el Microsoft Azure Architecture Center. Las implementaciones de saga con Spring Boot se usan en aplicaciones Java empresariales a escala.

### ¿Cuáles son las características de rendimiento?

Una saga por coreografía añade 2-10ms por paso por publicación y consumo de eventos. Una saga por orquestación añade 1-5ms por paso por llamadas directas a servicios más 1-2ms por persistencia de estado. Temporal añade 10-50ms por paso por scheduling de workflow y dispatch de activities. La persistencia de estado en PostgreSQL añade 1-2ms por paso por INSERT/UPDATE. La compensación añade la misma latencia que el paso hacia adelante. Una saga de orden de 4 pasos típicamente completa en 50-200ms con orquestación, 100-400ms con coreografía. La tabla de estado de saga crece a 1 fila por saga — 1M órdenes producen 1M filas, que PostgreSQL maneja sin degradación de rendimiento con indexación apropiada.

### ¿Cómo depuro problemas con este enfoque?

Consulta la tabla `saga_state` por sagas en estado `COMPENSATING` — estas son sagas atascadas que necesitan atención. Revisa la tabla `saga_steps` para el último paso completado y el error que activó la compensación. Usa distributed tracing (Jaeger, Zipkin) con el saga ID como trace tag para ver todas las llamadas a servicios en la saga. Para sagas por coreografía, busca en el event bus por eventos con el correlation ID de la saga — eventos faltantes indican un consumer que crashó. Para sagas por orquestación, revisa los logs del orquestador por el saga ID. Para fallos de compensación, verifica si el servicio downstream está disponible y la compensación es idempotente. Construye un dashboard de sagas mostrando sagas activas, tasa de completitud, duración promedio y tasa de compensación.
