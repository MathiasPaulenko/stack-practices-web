---
contentType: guides
slug: layered-architecture-guide
title: "Layered Architecture — N-Tier Explained"
description: "A practical guide to Layered (N-Tier) Architecture: separating presentation, business logic, and data layers with clear responsibilities and dependency rules."
metaDescription: "Learn Layered Architecture: separate presentation, business, and data layers. Understand N-Tier structure, dependency rules, and when to use it."
difficulty: beginner
topics:
  - architecture
  - design
tags:
  - layered-architecture
  - n-tier
  - separation-of-concerns
  - presentation-layer
  - business-logic-layer
  - data-access-layer
  - guide
relatedResources:
  - /guides/onion-architecture-guide
  - /guides/vertical-slice-architecture-guide
  - /patterns/design/repository-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn Layered Architecture: separate presentation, business, and data layers. Understand N-Tier structure, dependency rules, and when to use it."
  keywords:
    - layered-architecture
    - n-tier
    - separation-of-concerns
    - presentation-layer
    - business-logic-layer
    - guide
---

## Overview

Layered Architecture (also called N-Tier) is the most common architectural pattern in enterprise applications. It divides the application into horizontal layers, each with a specific responsibility. The classic three-tier model separates Presentation, Business Logic, and Data Access. This separation makes the system easier to understand, test, and maintain — though it can also introduce unnecessary abstraction if over-applied.

## When to Use

- Building traditional enterprise web or desktop applications
- Team structure mirrors technical specialization (frontend, backend, DB)
- Business logic is moderately complex but not rapidly changing
- You need a well-understood, proven architecture with abundant examples
- The application is not expected to change its delivery mechanism (web vs mobile vs API)

## The Classic Three Layers

| Layer | Responsibility | Example Components |
|-------|---------------|-------------------|
| **Presentation** | UI rendering, input validation, routing | Controllers, Views, ViewModels, DTOs |
| **Business Logic** | Domain rules, calculations, workflows | Services, Entities, Validators |
| **Data Access** | Persistence, querying, transactions | Repositories, ORM mappings, SQL |

## Dependency Direction

In strict layered architecture, a layer can only depend on the layer directly below it.

```
Presentation Layer
      ↓ (depends on)
Business Logic Layer
      ↓ (depends on)
Data Access Layer
      ↓ (depends on)
Database
```

## Example Implementation

```csharp
// Presentation Layer — Controller
public class OrderController : ControllerBase
{
    private readonly IOrderService _orderService;

    public OrderController(IOrderService orderService) =>
        _orderService = orderService;

    [HttpPost]
    public async Task<ActionResult<OrderDto>> Create(CreateOrderRequest request)
    {
        var dto = await _orderService.CreateOrderAsync(request.ProductId, request.Quantity);
        return CreatedAtAction(nameof(Get), new { id = dto.Id }, dto);
    }
}
```

```csharp
// Business Logic Layer — Service
public class OrderService : IOrderService
{
    private readonly IOrderRepository _repository;
    private readonly IProductRepository _productRepository;

    public OrderService(IOrderRepository repository, IProductRepository productRepository)
    {
        _repository = repository;
        _productRepository = productRepository;
    }

    public async Task<OrderDto> CreateOrderAsync(int productId, int quantity)
    {
        var product = await _productRepository.GetByIdAsync(productId);
        if (product.Stock < quantity)
            throw new BusinessException("Insufficient stock");

        var order = new Order { ProductId = productId, Quantity = quantity, Total = product.Price * quantity };
        await _repository.AddAsync(order);
        return new OrderDto(order);
    }
}
```

```csharp
// Data Access Layer — Repository
public class OrderRepository : IOrderRepository
{
    private readonly AppDbContext _context;

    public OrderRepository(AppDbContext context) => _context = context;

    public async Task AddAsync(Order order)
    {
        _context.Orders.Add(order);
        await _context.SaveChangesAsync();
    }

    public async Task<Order> GetByIdAsync(int id) =>
        await _context.Orders.FindAsync(id);
}
```

## Relaxed vs Strict Layering

| Style | Rule | Trade-off |
|-------|------|-----------|
| **Strict** | Layer N only calls Layer N-1 | Cleaner but more abstraction layers |
| **Relaxed** | Layer N can call any layer below | Less code, but harder to trace dependencies |

## Common Variations

- **Two-tier**: Client directly accesses database (legacy desktop apps)
- **Three-tier**: Presentation → Business → Data (most common)
- **Four-tier**: Presentation → Application → Domain → Infrastructure (Onion/Clean influence)

## Common Mistakes

- **Business logic leaking into controllers** — thin controllers, fat services
- **Direct database access from presentation** — breaks encapsulation and testability
- **Circular dependencies between layers** — use dependency injection to prevent
- **Anemic domain model** — entities with only getters/setters and all logic in services
- **DTO explosion** — creating separate DTOs for every layer transition without need

## FAQ

**Is Layered Architecture outdated?**
No, it remains valid for many applications. However, for highly complex domains or systems needing frequent delivery mechanism changes, Onion/Clean/Hexagonal architectures provide better isolation.

**How do I test a layered application?**
Unit test each layer in isolation by mocking the layer below. Integration tests verify the wiring between layers. End-to-end tests validate the full stack.

**Can microservices use layered architecture?**
Yes. Each microservice can internally use layered architecture while communicating via APIs. The layering is an internal organization pattern, not an inter-service pattern.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Detailed Scenario: E-commerce App with Four Layers

```text
Project: E-commerce .NET 8
Layer structure:
  src/
    ECommerce.Web/            # Presentation (Controllers, Views)
    ECommerce.Application/    # Application (Services, DTOs, Validators)
    ECommerce.Domain/         # Domain (Entities, Value Objects, Rules)
    ECommerce.Infrastructure/ # Infrastructure (EF Core, Email, Cache)

Flow: Create order
  1. Web: OrderController.Create(CreateOrderRequest)
     - Validate input with DataAnnotations
     - Map to CreateOrderCommand
     - Call _orderService.CreateOrderAsync(cmd)

  2. Application: OrderService.CreateOrderAsync(cmd)
     - Check stock via _productRepository
     - Calculate total, discounts, taxes
     - Create Order entity (logic in domain)
     - Persist via _orderRepository
     - Publish OrderCreated event
     - Return OrderDto

  3. Domain: Order.Create(customerId, items)
     - Apply business rules: min 1 item,
       max 100 items, total > 0
     - Set status = Pending
     - Set created date

  4. Infrastructure: OrderRepository.AddAsync(order)
     - EF Core maps entity to Orders table
     - SaveChangesAsync persists
     - Publish event to RabbitMQ via outbox

Dependency rules:
  Web -> Application -> Domain
  Infrastructure -> Domain (implements domain interfaces)
  Domain depends on nothing (pure, no external references)

Testing per layer:
  | Layer | Test type | Tool |
  |-------|-----------|------|
  | Domain | Pure unit | xUnit, no mocks |
  | Application | Unit with repo mocks | xUnit + Moq |
  | Infrastructure | Integration with Testcontainers | xUnit + Testcontainers |
  | Web | Integration with TestServer | xUnit + Web.ApplicationFactory |
```

### How do I avoid the anemic domain model?

Move business logic into domain entities. An Order entity should have methods like AddItem(), CalculateTotal(), Cancel(). If all logic lives in OrderService and Order only has getters/setters, you have an anemic model. The service should coordinate, not contain rules. Rules belong to the entity that governs them. This makes rules testable without mocks and reusable across services.

### Should I use dependency injection in every layer?

Yes, but with different purposes. In the application layer, DI coordinates services and repositories. In the domain layer, avoid DI: the domain should be pure and constructible with `new`. In infrastructure, DI configures concrete implementations (EF Core, Redis, SMTP). Use dependency composition at the entry point (Program.cs) to wire everything together.































































End of document. Review and update quarterly.