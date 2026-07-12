---

contentType: recipes
slug: saga-pattern-recipe
title: "Manage Distributed Transactions with the Saga Pattern"
description: "How to implement saga orchestration and choreography to maintain data consistency across microservices without distributed transactions or two-phase commit."
metaDescription: "Learn saga pattern for distributed transactions. Implement orchestration and choreography to maintain consistency across microservices without 2PC."
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
  metaDescription: "Learn saga pattern for distributed transactions. Implement orchestration and choreography to maintain consistency across microservices without 2PC."
  keywords:
    - saga pattern
    - distributed transactions
    - saga orchestration
    - microservices consistency
    - compensation pattern

---

## Overview

In a monolithic application, a single database transaction wraps multiple operations: debit one account, credit another, update an order status. If any step fails, the database rolls back everything. Atomicity is guaranteed by the database engine. In a microservices architecture, each service owns its own database. There is no shared transaction manager. You cannot wrap a debit in the payment service, a reservation in the inventory service, and a shipment in the logistics service in a single `BEGIN...COMMIT` block.

The saga pattern solves this by breaking a long-lived transaction into a sequence of local transactions. Each step updates data in one service and publishes an event or command to trigger the next step. If a step fails, the saga executes compensating transactions — undoing the changes made by previous steps. There are two styles: choreography (services react to each other's events) and orchestration (a central saga manager directs each step). The solution below covers both approaches, compensation design, and failure handling.

## When to use it

Use this recipe when:

- A business operation spans multiple microservices with independent databases
- Two-phase commit (2PC) is unavailable or unacceptable due to latency or lock contention. See [Event-Driven Architecture](/recipes/architecture/event-driven-architecture) for lock-free coordination.
- Long-running operations must survive temporary service unavailability
- Compensating actions are feasible (e.g., refund payment, release inventory, cancel shipment). See [Microservices Patterns](/guides/architecture/microservices-architecture-guide) for resilience strategies.
- Eventual consistency is acceptable for the use case

## Solution

### Choreography Saga (Event-Driven)

```typescript
// Order Service
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

// Inventory Service
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

// Payment Service
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

### Orchestration Saga (Central Controller)

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
      // Step 1: Create order
      await this.orderService.createOrder({ ...orderData, id: state.orderId });
      state.orderCreated = true;

      // Step 2: Reserve inventory
      await this.inventoryService.reserve(state.orderId, orderData.items);
      state.inventoryReserved = true;

      // Step 3: Process payment
      await this.paymentService.charge(state.orderId, orderData.total);
      state.paymentProcessed = true;

      // Step 4: Ship order
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

### Saga State Machine (Temporal / Cadence)

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

## Explanation

- **Choreography**: each service publishes an event after completing its step. Other services subscribe and react. There is no central controller. The saga emerges from the interaction of independent services. This is highly decoupled but can become hard to trace as the number of services grows.
- **Orchestration**: a dedicated saga orchestrator executes steps sequentially, calling each service directly. The orchestrator maintains saga state and handles compensation if a step fails. This centralizes logic and makes the flow explicit, but introduces a single point of control.
- **Compensating transactions**: unlike database rollbacks, compensations are explicit business operations. Refunding a payment is not the same as undoing a `BEGIN...ROLLBACK`. Compensation may itself fail, requiring retry or human intervention. Design idempotent compensations that can be safely retried.
- **Idempotency**: every saga step and compensation must be idempotent. See [Idempotent Endpoints](/recipes/api/idempotent-api-endpoints) for deduplication patterns. If the network times out, the orchestrator may retry a step that already succeeded. The service must recognize the duplicate request and return the previous result, not execute the operation again.

## Variants

| Style | Coupling | Visibility | Complexity | Best for |
|-------|----------|------------|------------|----------|
| Choreography | Loose | Poor (distributed) | Low initial, high at scale | Simple flows, few services |
| Orchestration | Tighter | Good (central) | Medium | Complex flows, many steps |
| State machine | Loose | Excellent | High | Long-running, human approval |

## What Works

- **Make every step idempotent**: a saga may retry steps due to network timeouts. If `reserveInventory` is called twice for the same order, it should return the same reservation ID rather than creating a duplicate reservation. Use order IDs as deduplication keys.
- **Design compensations before implementing steps**: for every forward action, define the corresponding compensation before writing the action. If you cannot define a compensation (e.g., sending an email cannot be unsent), reconsider whether the saga pattern fits.
- **Persist saga state**: the orchestrator must store saga progress in a database, not just in memory. If the orchestrator crashes mid-saga, a new instance must be able to resume from the last completed step and run the appropriate compensations.
- **Set timeouts on every step**: a saga step that hangs indefinitely blocks the entire saga. Configure per-step timeouts (e.g., 5 seconds for inventory reservation, 10 seconds for payment). If a timeout fires, treat it as a failure and compensate.
- **Monitor saga completion rate**: track the percentage of sagas that complete successfully vs. require compensation. A high compensation rate indicates systemic problems — failing payments, insufficient inventory, or flaky downstream services. Fix the root cause, not just the symptoms.

## Common mistakes

- **Missing compensation for a step**: the saga debits payment but has no compensation for the inventory reservation. If payment fails after reservation, inventory stays reserved forever. Every step must have a corresponding compensating transaction.
- **Compensation ordering**: compensating in the wrong order can cause failures. If you refund payment before cancelling shipping, the shipping service may charge again. Compensate in reverse order of the forward steps: undo the last step first.
- **Treating sagas like ACID transactions**: sagas provide eventual consistency, not atomicity. Between the payment step and the shipping step, payment is committed and shipping is not yet scheduled. There is a window where the system is inconsistent. Design the UI and downstream processes to handle this.
- **No saga visibility**: a stuck saga (compensation failing repeatedly) is invisible without dedicated monitoring. Build a saga dashboard showing active, completed, and compensating sagas. Alert on sagas stuck in compensation for more than 5 minutes.

## FAQ

**Q: Is saga better than two-phase commit (2PC)?**
A: For microservices, usually yes. 2PC holds locks across services during the prepare phase, causing latency and availability issues. Sagas release locks immediately after each local transaction. The trade-off is eventual consistency instead of strong consistency.

**Q: How do I handle a compensation that fails?**
A: Retry with exponential backoff. If retries exhaust, alert an operator and park the saga in a manual resolution queue. Some compensations (refunds) may require human approval. Build escalation workflows for unresolvable compensations.

**Q: Can I query saga state?**
A: Yes — maintain a saga state table in the orchestrator's database. Each row represents a saga instance with columns for current step, completed steps, and error details. Expose a read API for support teams and monitoring dashboards.

**Q: Should every microservices interaction use a saga?**
A: No. Sagas add complexity. Use them for multi-step business processes that must be all-or-nothing. For simple one-to-one calls that can fail independently, use direct API calls with [retries](/recipes/architecture/retry-backoff) and [circuit breakers](/recipes/circuit-breaker-pattern-recipe).


### Java Spring Boot Orchestrator with Event Sourcing

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
            // Step 1: Create order
            orderRepo.save(new Order(orderData));
            state.setCurrentStep("ORDER_CREATED");
            sagaStateRepo.save(state);

            // Step 2: Reserve inventory
            inventoryClient.reserve(orderData.getOrderId(), orderData.getItems());
            state.setCurrentStep("INVENTORY_RESERVED");
            sagaStateRepo.save(state);

            // Step 3: Process payment
            paymentClient.charge(orderData.getOrderId(), orderData.getTotal());
            state.setCurrentStep("PAYMENT_PROCESSED");
            sagaStateRepo.save(state);

            // Step 4: Schedule shipping
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
        // Compensate in reverse order
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

### Saga State Persistence with PostgreSQL

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

## Additional Best Practices

1. **Use semantic lock for concurrent saga prevention.** If two sagas try to reserve the same inventory simultaneously, both may succeed and oversell. Use a semantic lock — a flag in the database that marks the entity as being processed by a saga:

```sql
-- Add a pending_state column to the order table
ALTER TABLE orders ADD COLUMN pending_state VARCHAR(50) DEFAULT NULL;

-- Before starting saga, set pending state
UPDATE orders SET pending_state = 'PAYMENT_PENDING' WHERE id = $1 AND pending_state IS NULL;
-- If 0 rows affected, another saga is already processing this order
```

2. **Implement saga replay for crash recovery.** When the orchestrator restarts after a crash, it must identify incomplete sagas and resume them. Use a background worker to scan for stuck sagas:

```typescript
class SagaRecoveryWorker {
  constructor(private sagaRepo: SagaStateRepository) {}

  async run(): Promise<void> {
    const stuckSagas = await this.sagaRepo.findStuckSagas(5); // older than 5 min

    for (const saga of stuckSagas) {
      if (saga.status === 'COMPENSATING') {
        await this.orchestrator.compensate(saga);
      } else if (saga.status === 'RUNNING') {
        await this.orchestrator.resume(saga);
      }
    }
  }

  start(): void {
    setInterval(() => this.run(), 60000); // every minute
  }
}
```

3. **Version saga definitions for backward compatibility.** When you add a new step to a saga, existing in-flight sagas should still complete with the old definition. Store the saga version in the state:

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
        // Return compatible steps for older versions
        return getCompatibleSteps(stateVersion);
    }
}
```

## Additional Common Mistakes

1. **Not handling non-retriable failures.** Some failures cannot be fixed by retrying — an invalid credit card, an out-of-stock item, a permission denied. The saga should distinguish retriable from non-retriable failures and skip retries for non-retriable ones:

```typescript
class SagaStep {
  async execute(state: SagaState): Promise<void> {
    try {
      await this.action(state);
    } catch (error) {
      if (this.isNonRetriable(error)) {
        // Skip retry, go straight to compensation
        state.nonRetriable = true;
        throw error;
      }
      throw error; // will be retried by orchestrator
    }
  }

  private isNonRetriable(error: Error): boolean {
    return error instanceof ValidationError ||
           error instanceof PermissionError ||
           error instanceof NotFoundError;
  }
}
```

2. **Mixing orchestration and choreography in the same saga.** If some steps are orchestrated and others are event-driven, the flow becomes hard to trace and debug. Pick one style per saga. If you need both, split into two sagas — one orchestrated, one choreographed — with a clear boundary between them.

3. **Not testing compensation paths.** Teams test the happy path but rarely test compensation. Inject failures at each step and verify the compensations execute in the correct order. Test that compensations are idempotent by running them twice. Test that partial compensations (compensation itself fails midway) leave the system in a recoverable state:

```java
@Test
void testCompensationWhenPaymentFails() {
    // Setup: order created, inventory reserved
    when(paymentClient.charge(any(), any()))
        .thenThrow(new PaymentException("card declined"));

    SagaResult result = sagaManager.execute(orderData);

    assertFalse(result.isSuccess());
    verify(inventoryClient).release(orderData.getOrderId());
    verify(orderRepo).updateStatus(orderData.getOrderId(), "CANCELLED");
    verify(shippingClient, never()).schedule(any(), any());
}
```

## Additional FAQ

### How do I test saga configuration?

Write integration tests that inject failures at each step. Use a mock or stub for each downstream service and configure it to throw at specific call counts. Verify that compensations execute in reverse order. Test crash recovery by killing the orchestrator mid-saga and verifying that the recovery worker resumes correctly. Test idempotency by calling each step twice and verifying no duplicate side effects. For load testing, run 1000 concurrent sagas and verify no inventory oversells or double charges. For chaos testing, inject network partitions between the orchestrator and a service — the saga should timeout, compensate, and leave the system consistent.

### Is this solution production-ready?

Yes. Temporal is used in production by Uber, Snap, and Coinbase for workflow orchestration. AWS Step Functions is used by thousands of AWS customers for saga coordination. EventStoreDB is used by companies like Red Bull and HSBC for event-sourced sagas. The saga pattern is documented in the book Microservices Patterns by Chris Richardson and the Microsoft Azure Architecture Center. Spring Boot saga implementations are used across enterprise Java applications at scale.

### What are the performance characteristics?

A choreography saga adds 2-10ms per step for event publishing and consumption. An orchestration saga adds 1-5ms per step for direct service calls plus 1-2ms for state persistence. Temporal adds 10-50ms per step for workflow scheduling and activity dispatch. PostgreSQL saga state persistence adds 1-2ms per step for INSERT/UPDATE. Compensation adds the same latency as the forward step. A 4-step order saga typically completes in 50-200ms with orchestration, 100-400ms with choreography. The saga state table grows at 1 row per saga — 1M orders produce 1M rows, which PostgreSQL handles without performance degradation with proper indexing.

### How do I debug issues with this approach?

Query the `saga_state` table for sagas in `COMPENSATING` status — these are stuck sagas needing attention. Check the `saga_steps` table for the last completed step and the error that triggered compensation. Use distributed tracing (Jaeger, Zipkin) with the saga ID as a trace tag to see all service calls in the saga. For choreography sagas, search the event bus for events with the saga's correlation ID — missing events indicate a consumer that crashed. For orchestration sagas, check the orchestrator's logs for the saga ID. For compensation failures, check if the downstream service is available and the compensation is idempotent. Build a saga dashboard showing active sagas, completion rate, average duration, and compensation rate.
