---



contentType: guides
slug: complete-guide-modular-monolith
title: "Modular Monolith: Module Boundaries, Shared Kernel"
description: "Master modular monolith architecture: module boundaries, shared kernel, dependency rules, communication patterns, and incremental migration to microservices."
metaDescription: "Master modular monolith architecture: module boundaries, shared kernel, dependency rules, communication patterns, and incremental migration to microservices."
difficulty: advanced
topics:
  - architecture
tags:
  - guide
  - modular-monolith
  - architecture
  - module-boundaries
  - shared-kernel
  - microservices
  - ddd
relatedResources:
  - /guides/complete-guide-strangler-fig-migration
  - /guides/complete-guide-api-gateway-pattern
  - /patterns/modular-monolith-pattern
  - /guides/complete-guide-event-sourcing-cqrs
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 22
seo:
  metaDescription: "Master modular monolith architecture: module boundaries, shared kernel, dependency rules, communication patterns, and incremental migration to microservices."
  keywords:
    - modular monolith
    - module boundaries
    - shared kernel
    - dependency rules
    - microservices migration
    - domain driven design



---

## Introduction

A modular monolith is a single deployable unit with strict internal module boundaries. Each module owns its domain logic, data, and public API. Modules communicate through well-defined contracts, not direct database access. This architecture gives you the simplicity of a monolith for deployment and testing, with the separation of concerns needed for a future microservices migration. Here is a hands-on guide to module boundaries, shared kernel, dependency rules, communication patterns, and migration strategies.

## Module Structure

```
src/
├── modules/
│   ├── orders/
│   │   ├── domain/           # Entities, value objects, domain events
│   │   │   ├── Order.ts
│   │   │   ├── OrderItem.ts
│   │   │   └── events/
│   │   │       ├── OrderPlaced.ts
│   │   │       └── OrderCancelled.ts
│   │   ├── application/      # Use cases, command/query handlers
│   │   │   ├── PlaceOrder.ts
│   │   │   ├── CancelOrder.ts
│   │   │   └── GetOrderDetails.ts
│   │   ├── infrastructure/   # Database, external services
│   │   │   ├── OrderRepository.ts
│   │   │   └── OrderSchema.ts
│   │   ├── api/              # Public API of the module
│   │   │   ├── OrdersModule.ts  # Public interface
│   │   │   └── types.ts
│   │   └── presentation/     # Controllers, DTOs
│   │       ├── OrdersController.ts
│   │       └── dto/
│   ├── customers/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   ├── api/
│   │   └── presentation/
│   ├── inventory/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   ├── api/
│   │   └── presentation/
│   └── billing/
│       ├── domain/
│       ├── application/
│       ├── infrastructure/
│       ├── api/
│       └── presentation/
├── shared/                   # Shared kernel — used by all modules
│   ├── events/
│   │   ├── EventBus.ts
│   │   └── DomainEvent.ts
│   ├── types/
│   │   ├── Money.ts
│   │   └── Address.ts
│   └── utils/
└── kernel/                   # Composition root
    ├── AppModule.ts
    └── bootstrap.ts
```

## Module Public API

```typescript
// modules/orders/api/OrdersModule.ts — Public interface of the Orders module
export interface OrdersModule {
  placeOrder(command: PlaceOrderCommand): Promise<OrderId>;
  cancelOrder(command: CancelOrderCommand): Promise<void>;
  getOrderDetails(query: GetOrderDetailsQuery): Promise<OrderDetails>;
  getOrderHistory(query: GetOrderHistoryQuery): Promise<OrderSummary[]>;
}

export interface PlaceOrderCommand {
  customerId: string;
  items: { productId: string; quantity: number; price: number }[];
  shippingAddress: Address;
}

export interface OrderDetails {
  id: string;
  status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
  items: { productId: string; quantity: number; price: number }[];
  totalAmount: number;
  createdAt: Date;
}

// Implementation is internal — other modules only see the interface
class OrdersModuleImpl implements OrdersModule {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly eventBus: EventBus,
    private readonly inventoryModule: InventoryModule,
  ) {}

  async placeOrder(command: PlaceOrderCommand): Promise<OrderId> {
    // Check inventory availability
    for (const item of command.items) {
      const available = await this.inventoryModule.checkAvailability({
        productId: item.productId,
        quantity: item.quantity,
      });
      if (!available) {
        throw new Error(`Product ${item.productId} not available`);
      }
    }

    // Create order
    const order = Order.create(command.customerId, command.items, command.shippingAddress);
    await this.orderRepo.save(order);

    // Publish domain event
    await this.eventBus.publish(new OrderPlaced(order.id, order.customerId, order.totalAmount));

    return order.id;
  }

  async cancelOrder(command: CancelOrderCommand): Promise<void> {
    const order = await this.orderRepo.findById(command.orderId);
    if (!order) throw new Error('Order not found');

    order.cancel(command.reason);
    await this.orderRepo.save(order);

    await this.eventBus.publish(new OrderCancelled(order.id, order.customerId, command.reason));
  }

  async getOrderDetails(query: GetOrderDetailsQuery): Promise<OrderDetails> {
    const order = await this.orderRepo.findById(query.orderId);
    if (!order) throw new Error('Order not found');

    return {
      id: order.id.value,
      status: order.status,
      items: order.items.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        price: i.price,
      })),
      totalAmount: order.totalAmount.value,
      createdAt: order.createdAt,
    };
  }

  async getOrderHistory(query: GetOrderHistoryQuery): Promise<OrderSummary[]> {
    const orders = await this.orderRepo.findByCustomerId(query.customerId);
    return orders.map(o => ({
      id: o.id.value,
      status: o.status,
      totalAmount: o.totalAmount.value,
      createdAt: o.createdAt,
    }));
  }
}
```

## Shared Kernel

```typescript
// shared/events/EventBus.ts — In-process event bus for module communication
export interface DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
}

export interface EventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
}

export class EventBus {
  private handlers = new Map<string, EventHandler<any>[]>();

  register<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>,
  ): void {
    const existing = this.handlers.get(eventType) || [];
    this.handlers.set(eventType, [...existing, handler]);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.constructor.name) || [];
    for (const handler of handlers) {
      try {
        await handler.handle(event);
      } catch (error) {
        console.error(`Handler failed for ${event.constructor.name}:`, error);
        // Don't rethrow — one handler failure shouldn't block others
      }
    }
  }
}

// shared/types/Money.ts — Shared value object
export class Money {
  private constructor(
    public readonly amount: number,
    public readonly currency: string,
  ) {
    if (amount < 0) throw new Error('Money cannot be negative');
  }

  static create(amount: number, currency = 'USD'): Money {
    return new Money(Math.round(amount * 100) / 100, currency);
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add different currencies');
    }
    return Money.create(this.amount + other.amount, this.currency);
  }

  multiply(quantity: number): Money {
    return Money.create(this.amount * quantity, this.currency);
  }
}
```

## Dependency Rules

```typescript
// ARCHITECTURE TEST — Enforce module boundaries with dependency rules
// Using dependency-cruiser or a custom test

// .dependency-cruiser.js
module.exports = {
  forbidden: [
    {
      name: 'no-cross-module-internal-access',
      comment: 'Modules must not access other modules internals',
      severity: 'error',
      from: { path: 'src/modules/([^/]+)/' },
      to: { path: 'src/modules/(?!$1)([^/]+)/((?!api/).*)' },
    },
    {
      name: 'no-domain-to-infrastructure',
      comment: 'Domain must not depend on infrastructure',
      severity: 'error',
      from: { path: 'src/modules/([^/]+)/domain/' },
      to: { path: 'src/modules/$1/infrastructure/' },
    },
    {
      name: 'no-domain-to-presentation',
      comment: 'Domain must not depend on presentation',
      severity: 'error',
      from: { path: 'src/modules/([^/]+)/domain/' },
      to: { path: 'src/modules/$1/presentation/' },
    },
    {
      name: 'modules-must-not-share-database-tables',
      comment: 'Each module owns its tables',
      severity: 'error',
      from: { path: 'src/modules/([^/]+)/infrastructure/' },
      to: { path: 'src/modules/(?!$1)([^/]+)/infrastructure/.*Schema' },
    },
  ],
};
```

## Inter-Module Communication

### Via public API (synchronous)

```typescript
// modules/billing/application/GenerateInvoice.ts
class GenerateInvoice {
  constructor(
    private readonly ordersModule: OrdersModule,  // Depends on public API only
    private readonly invoiceRepo: InvoiceRepository,
  ) {}

  async execute(orderId: string): Promise<InvoiceId> {
    const order = await this.ordersModule.getOrderDetails({ orderId });
    if (order.status !== 'completed') {
      throw new Error('Cannot invoice non-completed orders');
    }

    const invoice = Invoice.create(order.id, order.totalAmount, order.items);
    await this.invoiceRepo.save(invoice);
    return invoice.id;
  }
}
```

### Via domain events (asynchronous)

```typescript
// modules/inventory/application/OnOrderPlaced.ts — React to Orders module events
class OnOrderPlaced implements EventHandler<OrderPlaced> {
  constructor(
    private readonly inventoryRepo: InventoryRepository,
  ) {}

  async handle(event: OrderPlaced): Promise<void> {
    // Reserve inventory when an order is placed
    for (const item of event.items) {
      await this.inventoryRepo.reserve(item.productId, item.quantity, event.aggregateId);
    }
  }
}

// modules/billing/application/OnOrderCompleted.ts
class OnOrderCompleted implements EventHandler<OrderCompleted> {
  constructor(
    private readonly invoiceGenerator: GenerateInvoice,
  ) {}

  async handle(event: OrderCompleted): Promise<void> {
    await this.invoiceGenerator.execute(event.aggregateId);
  }
}

// Wire up in composition root
eventBus.register('OrderPlaced', new OnOrderPlaced(inventoryRepo));
eventBus.register('OrderCompleted', new OnOrderCompleted(invoiceGenerator));
```

## Database Per Module

```typescript
// Each module has its own schema/tables — no cross-module table access
// modules/orders/infrastructure/OrderSchema.ts
const OrderSchema = {
  tableName: 'orders',
  columns: {
    id: 'uuid PRIMARY KEY',
    customer_id: 'uuid NOT NULL',
    status: 'varchar(20) NOT NULL',
    total_amount: 'decimal(10,2) NOT NULL',
    created_at: 'timestamp NOT NULL',
    updated_at: 'timestamp',
  },
};

// modules/customers/infrastructure/CustomerSchema.ts
const CustomerSchema = {
  tableName: 'customers',
  columns: {
    id: 'uuid PRIMARY KEY',
    email: 'varchar(255) UNIQUE NOT NULL',
    name: 'varchar(255) NOT NULL',
    created_at: 'timestamp NOT NULL',
  },
};

// WRONG: Orders module querying customers table directly
// class OrderRepository {
//   async findWithCustomer(orderId: string) {
//     return db.query('SELECT o.*, c.name FROM orders o JOIN customers c ON o.customer_id = c.id');
//   }
// }

// CORRECT: Use the Customers module public API
class OrderService {
  constructor(private customersModule: CustomersModule) {}

  async getOrderWithCustomer(orderId: string) {
    const order = await this.ordersModule.getOrderDetails({ orderId });
    const customer = await this.customersModule.getCustomer({ id: order.customerId });
    return { order, customer };
  }
}
```

## Migration to Microservices

### Step 1: Extract module to separate process

```typescript
// Before: in-process call
const order = await ordersModule.getOrderDetails({ orderId });

// After: HTTP call to extracted service
const order = await ordersClient.getOrderDetails(orderId);

// Same interface, different implementation
interface OrdersModule {
  getOrderDetails(query: GetOrderDetailsQuery): Promise<OrderDetails>;
}

class OrdersModuleHttp implements OrdersModule {
  constructor(private readonly httpClient: HttpClient) {}

  async getOrderDetails(query: GetOrderDetailsQuery): Promise<OrderDetails> {
    const response = await this.httpClient.get(`/api/orders/${query.orderId}`);
    return response.data;
  }
}

// Swap in composition root
const ordersModule = isMicroservice
  ? new OrdersModuleHttp(httpClient)
  : new OrdersModuleImpl(orderRepo, eventBus, inventoryModule);
```

### Step 2: Replace in-process event bus with message broker

```typescript
// Before: in-process event bus
eventBus.publish(new OrderPlaced(orderId, customerId, total));

// After: publish to RabbitMQ/Kafka
messageBroker.publish('order.events', new OrderPlaced(orderId, customerId, total));

// Subscriber in extracted service
messageBroker.subscribe('order.events', async (event) => {
  if (event.type === 'OrderPlaced') {
    await inventoryService.reserveItems(event.items);
  }
});
```

## Best Practices


- For a deeper guide, see [Modular Monolith — A Pragmatic Architecture](/guides/modular-monolith-guide/).

- Define a public API for each module — other modules only interact through it
- Use domain events for asynchronous communication — decouples modules at runtime
- Enforce boundaries with architecture tests — use dependency-cruiser or ArchUnit
- Each module owns its database tables — no cross-module joins
- Keep the shared kernel minimal — only truly shared concepts (Money, Address, EventBus)
- Use the dependency inversion principle — modules depend on interfaces, not implementations
- Wire modules in a composition root — the only place that knows about implementations
- Version module APIs — breaking changes require coordination with consuming modules
- Use anti-corruption layers when integrating with legacy — translate external models to internal
- Start with a modular monolith — extract to microservices only when scale demands it

## Common Mistakes

- **Sharing database tables across modules**: creates hidden coupling. A schema change in one module breaks others.
- **No public API boundary**: modules access each other's internals directly. Refactoring becomes risky.
- **Over-sized shared kernel**: too many shared types create coupling. Keep it to truly universal concepts.
- **Synchronous calls for everything**: tight coupling at runtime. Use events for fire-and-forget communication.
- **No architecture tests**: boundaries erode over time. Enforce with automated tests.
- **Extracting to microservices too early**: distributed systems add latency, complexity, and failure modes. Stay monolithic until you have a clear reason to split.

## FAQ

### What is a modular monolith?

A single deployable application with strict internal module boundaries. Each module owns its domain, data, and public API. Modules communicate through defined contracts, not direct database access. It combines monolith simplicity with microservices-style separation.

### What is a shared kernel?

A small set of types, interfaces, and utilities shared across all modules. Typically includes value objects (Money, Address), event bus abstractions, and common error types. Keep it minimal — everything in the shared kernel creates coupling.

### How is a modular monolith different from microservices?

A modular monolith deploys as one unit with in-process communication. Microservices deploy independently with network communication. A modular monolith can be extracted into microservices incrementally when scale demands it.

### When should I extract a module to a microservice?

When a module has different scaling requirements, deployment cadence, or team ownership. Extract one module at a time, starting with the most independent. Replace in-process calls with HTTP/gRPC and in-process events with a message broker.

### How do I enforce module boundaries?

Use architecture tests (dependency-cruiser, ArchUnit) to prevent cross-module internal access. Lint rules that forbid importing from another module's non-API paths. Code reviews that reject direct database access across modules.
