---
contentType: guides
slug: complete-guide-modular-monolith
title: "Modular Monolith: Module Boundaries, Shared Kernel"
description: "Design a modular monolith with clear module boundaries, a shared kernel, dependency rules, and a migration path to microservices when scale demands it."
metaDescription: "Design a modular monolith: define module boundaries, a shared kernel, dependency rules, and a clean migration path to microservices when scale demands it."
difficulty: advanced
topics:
  - architecture
tags:
  - guide
  - modular-monolith
  - architecture
  - module-boundaries
  - microservices
  - ddd
  - domain-driven-design
relatedResources:
  - /guides/complete-guide-strangler-fig-migration
  - /guides/complete-guide-api-gateway-pattern
  - /patterns/modular-monolith-pattern
  - /guides/complete-guide-event-sourcing-cqrs
lastUpdated: "2026-08-18"
publishedAt: "2026-07-06"
author: Mathias Paulenko
estimatedReadTime: 22
seo:
  metaDescription: "Design a modular monolith: define module boundaries, a shared kernel, dependency rules, and a clean migration path to microservices when scale demands it."
  keywords:
    - modular monolith
    - module boundaries
    - shared kernel
    - dependency rules
    - microservices migration
    - domain driven design
---

## Overview

A modular monolith is a single deployable application that keeps code organized
into independent modules. Each module owns its own domain logic, data, and public
interface, and it only talks to other modules through well-defined contracts.
That gives you the operational simplicity of a monolith while keeping the
separation of concerns you'll need if you later split services out.

In this guide we'll look at module structure, public APIs, the shared kernel,
dependency rules, communication patterns, and how to extract modules one at a
time.

## When to Use

A modular monolith is a good fit when:

- Your team wants clear boundaries and independent modules without the overhead
  of a distributed system.
- Some parts of the system may need independent scaling or deployment later, but
  not right now.
- You want a single database and a single codebase, but you also want to avoid
  the "big ball of mud" of a classic monolith.
- You aren't sure microservices are worth the cost yet.

## Module Structure

```text
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
│   ├── inventory/
│   └── billing/
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

## Migrating to Microservices

### Step 1: Extract one module to its own process

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

### Step 2: Replace in-process events with a message broker

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

- Give each module a clear public API, and make the other modules talk to it through that API.
- Use domain events for work that doesn't need an immediate response. That
  decouples modules at runtime.
- Enforce boundaries with architecture tests. Tools like dependency-cruiser or
  ArchUnit will catch regressions in CI.
- Let each module own its tables, and avoid joins or foreign keys that cross
  module boundaries.
- Keep the shared kernel minimal. Only truly shared concepts belong there, such
  as `Money`, `Address`, or the event bus contracts.
- Depend on interfaces, not implementations. Wire concrete classes in the
  composition root.
- Version module APIs. Breaking changes need coordination with consumers.
- When you integrate with legacy systems, add anti-corruption layers to translate
  their models into your own.
- Stay monolithic until you've got a clear reason to split. Distribution adds
  latency, failure modes, and operational work.

## Common Mistakes

- **Sharing database tables across modules**: a schema change in one module
  breaks others.
- **No public API boundary**: modules reach into each other's internals, so
  refactoring becomes risky.
- **Shared kernel too large**: packing in too many shared types ties modules together.
- **Synchronous calls for everything**: that creates tight coupling at runtime.
  Use events for work that doesn't need an immediate response.
- **No architecture tests**: boundaries erode over time. Enforce them with
  automated tests.
- **Extracting to microservices too early**: distributed systems add latency,
  complexity, and failure modes. Extract a module only when it actually needs
  different scale, a different deploy cycle, or a different owning team.

## FAQ

### What is a modular monolith?

A modular monolith is a single deployable application that's split into
modules. Each module keeps its own logic, data, and public interface, and
modules talk to each other through contracts rather than by looking inside one
another's databases or internals.

### What is a shared kernel?

The shared kernel is a compact set of types, interfaces, and utilities that
every module can use. It usually holds value objects like `Money` or `Address`,
the event bus contracts, and common error types. Keep it small because every
extra item in the shared kernel adds coupling.

### How is a modular monolith different from microservices?

A modular monolith deploys as one unit and talks to itself in-process.
Microservices deploy independently and communicate over the network. The modular
monolith is a natural starting point, and you can extract a module into a
microservice once a real boundary appears.

### When should I extract a module to a microservice?

Extract a module when it's got different scaling needs, a different deployment
cadence, or a different owning team. Move one module at a time, starting with
the one that's got the fewest dependencies. Replace in-process calls with HTTP or gRPC,
and in-process events with a message broker.

### How do I enforce module boundaries?

Use architecture tests, such as dependency-cruiser or ArchUnit, and lint rules
that block imports from another module's non-API paths. During code review,
reject any direct database access that crosses module boundaries.
