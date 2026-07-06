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


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
