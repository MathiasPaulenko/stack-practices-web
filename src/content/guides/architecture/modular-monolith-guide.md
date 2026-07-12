---


contentType: guides
slug: modular-monolith-guide
title: "Modular Monolith — A Pragmatic Architecture"
description: "A practical guide to Modular Monoliths: combine the simplicity of monoliths with the modularity of microservices through clear bounded contexts and strict module boundaries."
metaDescription: "Learn Modular Monolith architecture with bounded contexts, module boundaries, and migration paths to microservices. Practical guide for growing teams."
difficulty: intermediate
topics:
  - architecture
  - design
tags:
  - modular-monolith
  - monolith
  - microservices
  - bounded-contexts
  - module-boundaries
  - domain-driven-design
  - guide
relatedResources:
  - /guides/microservices-architecture-guide
  - /guides/monolith-to-microservices-migration-guide
  - /guides/hexagonal-architecture-guide
  - /guides/clean-architecture-guide
  - /patterns/anti-corruption-layer-pattern
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Learn Modular Monolith architecture with bounded contexts, module boundaries, and migration paths to microservices. Practical guide for growing teams."
  keywords:
    - modular-monolith
    - monolith
    - microservices
    - bounded-contexts
    - module-boundaries
    - domain-driven-design
    - guide


---

## Overview

A Modular Monolith is a software architecture that keeps the deployment simplicity of a monolith while enforcing the modular boundaries of microservices. Instead of deploying many small services, you build a single deployable unit composed of well-defined, loosely-coupled modules. Each module owns its domain, data, and public interface. Communication between modules happens through explicit APIs, not through shared database tables or direct method calls.

## When to Use


- For alternatives, see [Clean Architecture](/guides/clean-architecture-guide/).

- Your team is not ready for the operational complexity of microservices
- You need fast deployments and simple debugging but want clear boundaries
- You are migrating from a big ball of mud and need a stepping stone
- Your domain has natural boundaries (bounded contexts) but does not need independent scaling
- You want to defer the decision to split into microservices until you have more information

## When NOT to Use

- Different modules need to scale independently (CPU, memory, or team-wise)
- Teams must deploy on different schedules without coordination
- Technology diversity per module is a hard requirement
- The organization already has mature microservices infrastructure

## Module Structure

```
├── src/
│   ├── modules/
│   │   ├── catalog/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   └── api/
│   │   ├── inventory/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   └── api/
│   │   └── orders/
│   │       ├── domain/
│   │       ├── application/
│   │       ├── infrastructure/
│   │       └── api/
│   └── shared/
│       └── kernel/
```

## Enforcing Boundaries

### Compile-Time Boundaries

Use your build system to prevent cross-module imports:

```gradle
// catalog/build.gradle
dependencies {
    implementation project(':shared:kernel')
    // NO dependencies on inventory or orders
}

// orders/build.gradle
dependencies {
    implementation project(':shared:kernel')
    implementation project(':catalog')   // Only if absolutely necessary
    implementation project(':inventory')
}
```

### Database Boundaries

Each module owns its schema. No foreign keys across modules.

```sql
-- catalog schema
CREATE TABLE catalog.products (
    id UUID PRIMARY KEY,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    price_cents INTEGER NOT NULL
);

-- orders schema
CREATE TABLE orders.order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders.orders(id),
    product_id UUID NOT NULL,  -- No FK to catalog.products
    product_name VARCHAR(255) NOT NULL,  -- Denormalized at order time
    quantity INTEGER NOT NULL,
    unit_price_cents INTEGER NOT NULL
);
```

### API Communication

Modules communicate through explicit APIs, not direct database access.

```typescript
// catalog module exposes this interface
interface CatalogApi {
  getProduct(productId: ProductId): Promise<ProductSnapshot>;
  checkAvailability(productId: ProductId, quantity: number): Promise<boolean>;
}

// orders module depends on the interface, not the implementation
class PlaceOrderService {
  constructor(
    private catalog: CatalogApi,
    private inventory: InventoryApi,
    private orderRepository: OrderRepository
  ) {}

  async execute(command: PlaceOrderCommand): Promise<void> {
    const product = await this.catalog.getProduct(command.productId);
    const available = await this.inventory.checkAvailability(command.productId, command.quantity);

    if (!available) throw new OutOfStockError(product.id);

    const order = Order.create({ ...command, productName: product.name, unitPrice: product.price });
    await this.orderRepository.save(order);
  }
}
```

## Shared Kernel

A minimal shared module for cross-cutting concepts that would be overkill to duplicate:

- Base entity types with IDs and timestamps
- Domain event base classes
- Common value objects (Money, Email, Address if truly generic)
- Infrastructure helpers (date providers, ID generators)

**Keep the shared kernel small.** Resist the temptation to move business logic there.

## Testing Strategy

| Test Scope | What It Tests | Isolation |
|------------|---------------|-----------|
| In-module unit | Domain logic | No module dependencies |
| In-module integration | Adapters + DB | Real test DB per module |
| Cross-module integration | API contracts | In-memory fakes of other modules |
| Full system | End-to-end flow | Full application |

## Migration to Microservices

A modular monolith is the ideal starting point for a later extraction:

1. **Identify the module** with the clearest boundary and highest scaling need
2. **Extract its database** into a separate schema or service
3. **Replace in-process API calls** with HTTP/gRPC, keeping the interface stable
4. **Deploy as a separate service** while keeping the monolith running
5. **Repeat** for other modules

Because modules already communicate through APIs and own their data, extraction is mechanical rather than architectural.

## Common Mistakes

- **Shared database tables** — defeats the entire purpose; use schema-per-module
- **Bypassing the API** — calling another module's domain classes directly
- **Bloated shared kernel** — moving business logic to shared modules creates coupling
- **Premature extraction** — splitting to microservices before boundaries are proven

## FAQ

**Is a Modular Monolith just a well-structured monolith?**
Yes, but the discipline matters. Without explicit boundaries enforced by the build system, it becomes a big ball of mud.

**How is this different from a Service-Oriented Architecture?**
SOA typically implies separate deployment units. A modular monolith deploys as one unit.

**Can I use different tech stacks per module?**
No. A modular monolith uses one tech stack. If you need polyglot persistence, you are in microservices territory.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Detailed Scenario: Modular Monolith for E-commerce

```text
Project: E-commerce (Java 21 + Spring Boot)
Teams: 3 teams (Catalog, Orders, Payments) + 2 shared kernel devs
Size: 120k lines, 1 deployable

Module structure:
  src/modules/
    catalog/
      domain/
        entities/Product.java
        valueobjects/SKU.java
        events/ProductPriceChangedEvent.java
      application/
        services/CreateProductService.java
        services/UpdatePriceService.java
        dto/ProductDto.java
      infrastructure/
        persistence/ProductRepository.java
        persistence/ProductJpaEntity.java
      api/
        CatalogApi.java          # Module public interface
        ProductController.java   # REST controller
    orders/
      domain/
        entities/Order.java
        entities/OrderLine.java
        valueobjects/OrderId.java
        events/OrderPlacedEvent.java
      application/
        services/PlaceOrderService.java
        dto/PlaceOrderCommand.java
      infrastructure/
        persistence/OrderRepository.java
      api/
        OrdersApi.java
        OrderController.java
    payments/
      domain/
        entities/Payment.java
        valueobjects/TransactionId.java
      application/
        services/ProcessPaymentService.java
      infrastructure/
        persistence/PaymentRepository.java
        external/StripeGateway.java
      api/
        PaymentsApi.java
        PaymentController.java
  src/shared/kernel/
    BaseEntity.java
    DomainEvent.java
    Money.java
    IdGenerator.java
    ClockProvider.java

Build rules (Gradle):
  modules/catalog/build.gradle:
    dependencies { implementation project(":shared:kernel") }
    // CANNOT depend on orders or payments

  modules/orders/build.gradle:
    dependencies {
      implementation project(":shared:kernel")
      implementation project(":modules:catalog")  # Only API interface
    }

  modules/payments/build.gradle:
    dependencies {
      implementation project(":shared:kernel")
      implementation project(":modules:orders")   # Only API interface
    }

Inter-module communication:
  Orders -> Catalog: calls CatalogApi.getProduct(id)
  Orders -> Payments: calls PaymentsApi.process(payment)
  Catalog -> Orders: listens to OrderPlaced event (via Spring Events)

  // CatalogApi.java — public interface of Catalog module
  public interface CatalogApi {
      ProductSnapshot getProduct(UUID productId);
      boolean checkAvailability(UUID productId, int quantity);
  }

  // PlaceOrderService.java — Orders depends on the interface
  public class PlaceOrderService {
      private final CatalogApi catalogApi;
      private final PaymentsApi paymentsApi;
      private final OrderRepository orderRepo;

      public OrderId execute(PlaceOrderCommand cmd) {
          ProductSnapshot product = catalogApi.getProduct(cmd.productId());
          PaymentResult payment = paymentsApi.process(new Payment(cmd.orderId(), product.price()));
          if (!payment.success()) throw new PaymentFailedException();
          Order order = Order.create(cmd, product);
          orderRepo.save(order);
          return order.id();
      }
  }

Database schemas (separate):
  catalog_schema: products, categories, product_reviews
  orders_schema: orders, order_items, order_status_history
  payments_schema: payments, refunds, transactions
  -- No foreign keys across schemas

Future extraction to microservice:
  1. Move payments to its own binary (Spring Boot app)
  2. Replace in-process PaymentsApi with HTTP client
  3. Move payments_schema to its own PostgreSQL instance
  4. Deploy payments-service independently
  5. Monolith continues running with remaining modules
```

### How do I enforce module boundaries at runtime?

Use ArchUnit or Spring Modulith to verify in tests that no module accesses another module internal classes. Spring Modulith automatically detects boundary violations and fails the test. You can also use JPMS (Java Platform Module System) with `requires` and `exports` to enforce boundaries at the compiler level. Without verification tools, boundaries degrade over time.
