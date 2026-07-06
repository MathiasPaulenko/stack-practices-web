---
contentType: guides
slug: complete-guide-modular-monolith
title: "Guía Completa de Modular Monolith: Boundaries, Shared Kernel"
description: "Dominá modular monolith: module boundaries, shared kernel, dependency rules, communication patterns y migración incremental a microservices."
metaDescription: "Dominá modular monolith: module boundaries, shared kernel, dependency rules, communication patterns y migración incremental a microservices."
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
  - /guides/architecture/complete-guide-strangler-fig-migration
  - /guides/architecture/complete-guide-api-gateway-pattern
  - /patterns/architecture/modular-monolith-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 22
seo:
  metaDescription: "Dominá modular monolith: module boundaries, shared kernel, dependency rules, communication patterns y migración incremental a microservices."
  keywords:
    - modular monolith
    - module boundaries
    - shared kernel
    - dependency rules
    - microservices migration
    - domain driven design
---

## Introducción

Un modular monolith es un single deployable unit con strict internal module boundaries. Cada module posee su domain logic, data y public API. Los modules communicatean through well-defined contracts, no direct database access. Esta arquitectura te da la simplicity de un monolith para deployment y testing, con la separation of concerns needed para un future microservices migration. Esta guía cubre module boundaries, shared kernel, dependency rules, communication patterns y migration strategies.

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
│   │   ├── api/              # Public API del module
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
├── shared/                   # Shared kernel — usado by all modules
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
// modules/orders/api/OrdersModule.ts — Public interface del Orders module
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

// Implementation es internal — other modules solo ven el interface
class OrdersModuleImpl implements OrdersModule {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly eventBus: EventBus,
    private readonly inventoryModule: InventoryModule,
  ) {}

  async placeOrder(command: PlaceOrderCommand): Promise<OrderId> {
    // Checkeá inventory availability
    for (const item of command.items) {
      const available = await this.inventoryModule.checkAvailability({
        productId: item.productId,
        quantity: item.quantity,
      });
      if (!available) {
        throw new Error(`Product ${item.productId} not available`);
      }
    }

    // Creá order
    const order = Order.create(command.customerId, command.items, command.shippingAddress);
    await this.orderRepo.save(order);

    // Publicá domain event
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
// shared/events/EventBus.ts — In-process event bus para module communication
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
        // No rethrowées — un handler failure no debería blockear others
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
// ARCHITECTURE TEST — Enforceá module boundaries con dependency rules
// Usando dependency-cruiser o un custom test

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
    private readonly ordersModule: OrdersModule,  // Depende en public API only
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
// modules/inventory/application/OnOrderPlaced.ts — Reacteá a Orders module events
class OnOrderPlaced implements EventHandler<OrderPlaced> {
  constructor(
    private readonly inventoryRepo: InventoryRepository,
  ) {}

  async handle(event: OrderPlaced): Promise<void> {
    // Reservá inventory cuando un order es placed
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

// Wire up en composition root
eventBus.register('OrderPlaced', new OnOrderPlaced(inventoryRepo));
eventBus.register('OrderCompleted', new OnOrderCompleted(invoiceGenerator));
```

## Database Per Module

```typescript
// Cada module tiene su own schema/tables — no cross-module table access
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

// WRONG: Orders module queryeando customers table directamente
// class OrderRepository {
//   async findWithCustomer(orderId: string) {
//     return db.query('SELECT o.*, c.name FROM orders o JOIN customers c ON o.customer_id = c.id');
//   }
// }

// CORRECT: Usá el Customers module public API
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

### Step 1: Extractéa module a separate process

```typescript
// Before: in-process call
const order = await ordersModule.getOrderDetails({ orderId });

// After: HTTP call a extracted service
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

// Swapéa en composition root
const ordersModule = isMicroservice
  ? new OrdersModuleHttp(httpClient)
  : new OrdersModuleImpl(orderRepo, eventBus, inventoryModule);
```

### Step 2: Reemplazá in-process event bus con message broker

```typescript
// Before: in-process event bus
eventBus.publish(new OrderPlaced(orderId, customerId, total));

// After: publicá a RabbitMQ/Kafka
messageBroker.publish('order.events', new OrderPlaced(orderId, customerId, total));

// Subscriber en extracted service
messageBroker.subscribe('order.events', async (event) => {
  if (event.type === 'OrderPlaced') {
    await inventoryService.reserveItems(event.items);
  }
});
```

## Best Practices

- Definí un public API para cada module — other modules solo interactúan through it
- Usá domain events para asynchronous communication — decoupleá modules at runtime
- Enforceá boundaries con architecture tests — usá dependency-cruiser o ArchUnit
- Cada module posee sus database tables — no cross-module joins
- Mantené el shared kernel minimal — solo truly shared concepts (Money, Address, EventBus)
- Usá el dependency inversion principle — modules dependen en interfaces, no implementations
- Wireéa modules en un composition root — el only place que sabe sobre implementations
- Versioná module APIs — breaking changes requiren coordinación con consuming modules
- Usá anti-corruption layers cuando integrés con legacy — translateá external models a internal
- Arrancá con un modular monolith — extractéa a microservices solo cuando scale lo demanda

## Common Mistakes

- **Sharing database tables across modules**: crea hidden coupling. Un schema change en un module breakea others.
- **No public API boundary**: modules acceden a each other's internals directamente. Refactoring se vuelve risky.
- **Over-sized shared kernel**: demasiados shared types crean coupling. Mantenelo a truly universal concepts.
- **Synchronous calls para everything**: tight coupling at runtime. Usá events para fire-and-forget communication.
- **No architecture tests**: boundaries erode over time. Enforceá con automated tests.
- **Extracting a microservices too early**: distributed systems add latency, complexity y failure modes. Stayéa monolithic hasta que tengas un clear reason para split.

## FAQ

### ¿Qué es un modular monolith?

Un single deployable application con strict internal module boundaries. Cada module posee su domain, data y public API. Los modules communicatean through defined contracts, no direct database access. Combina monolith simplicity con microservices-style separation.

### ¿Qué es un shared kernel?

Un small set de types, interfaces y utilities shared across all modules. Típicamente incluye value objects (Money, Address), event bus abstractions y common error types. Mantenelo minimal — todo en el shared kernel crea coupling.

### ¿Cómo se diferencia un modular monolith de microservices?

Un modular monolith deployea como un unit con in-process communication. Microservices deployean independientemente con network communication. Un modular monolith puede ser extracted a microservices incrementalmente cuando scale lo demanda.

### ¿Cuándo debería extraer un module a microservice?

Cuando un module tiene different scaling requirements, deployment cadence o team ownership. Extractéa un module a la vez, empezando con el más independent. Reemplazá in-process calls con HTTP/gRPC e in-process events con un message broker.

### ¿Cómo enforceo module boundaries?

Usá architecture tests (dependency-cruiser, ArchUnit) para prevenir cross-module internal access. Lint rules que forbidean importing from another module's non-API paths. Code reviews que rejectean direct database access across modules.
