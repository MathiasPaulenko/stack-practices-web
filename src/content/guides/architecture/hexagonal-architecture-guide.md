---



contentType: guides
slug: hexagonal-architecture-guide
title: "Hexagonal Architecture — Ports, Adapters, and Testability"
description: "A complete guide to Hexagonal Architecture (Ports and Adapters): structure applications so domain logic is isolated from frameworks, databases, and external services."
metaDescription: "Learn Hexagonal Architecture with ports, adapters, and domain isolation. Practical guide for testable, framework-independent applications."
difficulty: advanced
topics:
  - architecture
  - design
tags:
  - hexagonal-architecture
  - ports-and-adapters
  - domain-driven-design
  - testability
  - clean-architecture
  - dependency-inversion
  - guide
relatedResources:
  - /guides/clean-architecture-guide
  - /guides/onion-architecture-guide
  - /guides/modular-monolith-guide
  - /guides/cqrs-guide
  - /patterns/dependency-injection-pattern
  - /guides/event-sourcing-guide
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Learn Hexagonal Architecture with ports, adapters, and domain isolation. Practical guide for testable, framework-independent applications."
  keywords:
    - hexagonal-architecture
    - ports-and-adapters
    - domain-driven-design
    - testability
    - clean-architecture
    - dependency-inversion
    - guide



---

## Overview

Hexagonal Architecture, also known as Ports and Adapters, is a design pattern that isolates the core domain logic from external concerns like frameworks, databases, and UI. Instead of the domain depending on infrastructure, infrastructure depends on the domain through well-defined interfaces called ports. This inversion of dependencies makes applications easier to test, refactor, and adapt to changing requirements.

## When to Use


- For alternatives, see [Onion Architecture — Dependency Inversion in Practice](/guides/onion-architecture-guide/).

- You need to swap frameworks (web, CLI, messaging) without touching business logic
- You want fast, isolated unit tests without mocking external services
- Your application integrates with multiple external systems (databases, APIs, queues)
- You are migrating from a monolith and need clear boundaries

## Core Concepts

### Ports

Ports are interfaces that define what the application needs from the outside world, or what it offers to the outside world. They belong to the domain layer.

### Adapters

Adapters are concrete implementations of ports. They translate between the application's domain and external technologies (HTTP, SQL, message queues).

### Domain (Inside)

The application's core logic — entities, value objects, use cases, and domain services. It has zero external dependencies.

## Structure

```
┌─────────────────────────────────────┐
│           Adapters (Outside)        │
│  ┌─────────┐ ┌─────────┐ ┌────────┐ │
│  │ Web API │ │ CLI     │ │ Events │ │
│  └────┬────┘ └────┬────┘ └───┬────┘ │
│       │           │          │       │
│  ┌────┴───────────┴──────────┴────┐ │
│  │         Primary Ports           │ │
│  │      (Driving Adapters)         │ │
│  └──────────────┬──────────────────┘ │
│                 │                    │
│  ┌──────────────┴──────────────────┐ │
│  │           Application           │ │
│  │         (Use Cases)             │ │
│  └──────────────┬──────────────────┘ │
│                 │                    │
│  ┌──────────────┴──────────────────┐ │
│  │         Secondary Ports         │ │
│  │      (Driven Adapters)          │ │
│  └──────────────┬──────────────────┘ │
│       │          │           │      │
│  ┌────┴────┐ ┌───┴───┐ ┌─────┴────┐│
│  │ Database│ │External│ │  Queue   ││
│  │ Adapter │ │ API    │ │  Adapter ││
│  └─────────┘ └────────┘ └──────────┘│
└─────────────────────────────────────┘
```

## Implementation

### Define the Port

```java
// Secondary port (driven) — what the domain needs
public interface OrderRepository {
    Order findById(OrderId id);
    void save(Order order);
}

// Primary port (driving) — what the domain offers
public interface PlaceOrderUseCase {
    OrderResult place(PlaceOrderCommand command);
}
```

### Implement the Domain

```java
public class PlaceOrderService implements PlaceOrderUseCase {
    private final OrderRepository repository;
    private final PaymentGatewayPort paymentPort;

    public PlaceOrderService(OrderRepository repository, PaymentGatewayPort paymentPort) {
        this.repository = repository;
        this.paymentPort = paymentPort;
    }

    @Override
    public OrderResult place(PlaceOrderCommand command) {
        Order order = Order.create(command);
        PaymentResult payment = paymentPort.charge(order.total());
        if (payment.success()) {
            order.confirm(payment.transactionId());
            repository.save(order);
            return OrderResult.success(order.id());
        }
        return OrderResult.failure(payment.error());
    }
}
```

### Create the Adapter

```java
@RestController
@RequestMapping("/orders")
public class OrderControllerAdapter {
    private final PlaceOrderUseCase useCase;

    public OrderControllerAdapter(PlaceOrderUseCase useCase) {
        this.useCase = useCase;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> place(@RequestBody PlaceOrderRequest request) {
        PlaceOrderCommand command = request.toCommand();
        OrderResult result = useCase.place(command);
        return result.isSuccess()
            ? ResponseEntity.ok(OrderResponse.from(result))
            : ResponseEntity.badRequest().body(OrderResponse.error(result));
    }
}
```

## Testing Strategy

| Test Type | What It Tests | Dependencies |
|-----------|---------------|-------------|
| Unit | Domain logic | None (pure Java) |
| Integration | Adapter + real DB | Testcontainers |
| Contract | Port boundary | In-memory stub |
| E2E | Full flow | Everything |

## Common Mistakes

- **Leaking framework annotations into the domain** — keep `@Entity`, `@Autowired`, and similar out
- **Anemic domain models** — ports should expose behavior, not just data access
- **Over-engineering simple CRUD** — hexagonal architecture adds ceremony; use it when the domain justifies it


### Detailed Scenario: Order System with Hexagonal Architecture

```text
Project: Order system Java 21 + Spring Boot
Ports defined:
  Primary (driving):
    - PlaceOrderUseCase: place(PlaceOrderCommand) -> OrderResult
    - CancelOrderUseCase: cancel(CancelOrderCommand) -> void
    - GetOrderQuery: getById(OrderId) -> OrderDto
  Secondary (driven):
    - OrderRepository: findById, save, update
    - PaymentGatewayPort: charge(Money) -> PaymentResult
    - NotificationPort: sendOrderConfirmation(OrderId, Email)
    - InventoryPort: reserveItems(List<OrderItem>) -> ReservationId

Adapters implemented:
  Driving:
    - RestOrderController (Spring @RestController)
    - GrpcOrderService (gRPC service)
    - CliOrderHandler (Picocli CLI)
    - KafkaOrderConsumer (event consumer)
  Driven:
    - PostgresOrderRepository (JPA/Hibernate)
    - StripePaymentAdapter (HTTP client)
    - SmtpNotificationAdapter (JavaMail)
    - RedisInventoryAdapter (Redis client)

Flow: Place Order via REST
  1. POST /orders -> RestOrderController
  2. Controller maps request to PlaceOrderCommand
  3. Calls PlaceOrderUseCase.place(command)
  4. PlaceOrderService:
     a. Creates Order.create(command)
     b. InventoryPort.reserveItems(items)
     c. PaymentGatewayPort.charge(order.total())
     d. If payment ok: order.confirm(txId), OrderRepository.save(order)
     e. NotificationPort.sendOrderConfirmation(order.id, email)
     f. Returns OrderResult.success(order.id)
  5. Controller maps OrderResult to OrderResponse

Testing with in-memory adapters:
  public class PlaceOrderServiceTest {
      private InMemoryOrderRepository repo = new InMemoryOrderRepository();
      private FakePaymentGateway payment = new FakePaymentGateway();
      private SpyNotificationPort notification = new SpyNotificationPort();
      private FakeInventoryPort inventory = new FakeInventoryPort();
      private PlaceOrderService service;

      @BeforeEach
      void setUp() {
          service = new PlaceOrderService(repo, payment, notification, inventory);
      }

      @Test
      void shouldPlaceOrderWhenPaymentSucceeds() {
          payment.setSuccess(true);
          var cmd = new PlaceOrderCommand("cust-1", List.of(new Item("prod-1", 2)));
          var result = service.place(cmd);
          assertTrue(result.isSuccess());
          assertEquals(1, notification.sentConfirmations());
          assertTrue(repo.findById(result.orderId()).isPresent());
      }

      @Test
      void shouldFailWhenPaymentDeclines() {
          payment.setSuccess(false);
          var cmd = new PlaceOrderCommand("cust-1", List.of(new Item("prod-1", 2)));
          var result = service.place(cmd);
          assertFalse(result.isSuccess());
          assertEquals(0, notification.sentConfirmations());
      }
  }

  // Tests run in < 100ms without DB or network
  // Domain coverage: 95%+
  // Adapters tested separately with Testcontainers
```

### How do I handle dependency wiring in hexagonal?

Use dependency injection at the entry point (Application.java in Spring Boot). The domain does not know Spring. Adapters are annotated with @RestController, @Repository, @Service. Wiring happens in a configuration class: @Bean PlaceOrderUseCase with concrete adapters. For testing, simply construct the service with in-memory adapters using `new`. The domain never depends on the DI container.

## Variants

- **Onion Architecture** — adds explicit domain services and application services layers
- **Clean Architecture** — emphasizes the Dependency Rule: dependencies point inward
- **BCE (Boundary-Control-Entity)** — similar structure with different naming

## FAQ

**How is Hexagonal different from Clean Architecture?**
Hexagonal focuses on the ports-and-adapters metaphor. Clean Architecture adds the explicit layer dependency rule and emphasizes the Entities layer. Both achieve the same goal.

**Do I need DDD to use Hexagonal?**
No. You can use simple entities and value objects. DDD complements hexagonal but is not required.

**When should I NOT use Hexagonal?**
Simple CRUD applications, prototypes, or scripts where the extra structure does not provide value.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.















End of document. Review and update quarterly.