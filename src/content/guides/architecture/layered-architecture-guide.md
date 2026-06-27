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
