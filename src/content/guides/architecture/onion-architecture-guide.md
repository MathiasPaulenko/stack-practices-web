---
contentType: guides
slug: onion-architecture-guide
title: "Onion Architecture — Dependency Inversion in Practice"
description: "A practical guide to Onion Architecture: organizing code around the domain model, enforcing dependency direction inward, and isolating infrastructure from business logic."
metaDescription: "Learn Onion Architecture: organize code around the domain, enforce inward dependencies, isolate infrastructure from business logic. Practical guide with examples."
difficulty: intermediate
topics:
  - architecture
  - design
tags:
  - onion-architecture
  - dependency-inversion
  - domain-driven-design
  - clean-architecture
  - ports-and-adapters
  - layered-architecture
  - guide
relatedResources:
  - /guides/layered-architecture-guide
  - /guides/vertical-slice-architecture-guide
  - /patterns/design/dependency-injection-pattern
  - /patterns/design/repository-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn Onion Architecture: organize code around the domain, enforce inward dependencies, isolate infrastructure from business logic. Practical guide with examples."
  keywords:
    - onion-architecture
    - dependency-inversion
    - domain-driven-design
    - clean-architecture
    - ports-and-adapters
    - guide
---

## Overview

Onion Architecture, popularized by Jeffrey Palermo, structures applications as concentric layers with the domain model at the center. Unlike traditional layered architecture where dependencies point downward (UI → Business → Data), Onion inverts this: all dependencies point inward toward the domain core. Infrastructure, UI, and external services live at the outer edges and depend on inner abstractions, never the other way around. This makes the domain model completely isolated from frameworks, databases, and delivery mechanisms.

## When to Use

- You need a domain model that survives framework changes
- Your business logic is complex and changes frequently
- You want to defer technology decisions (database, framework, UI)
- Testing business rules without database or web server is a priority
- You are applying Domain-Driven Design (DDD) principles

## The Layers

| Layer | Responsibility | Dependencies |
|-------|---------------|--------------|
| **Domain Core** | Entities, value objects, domain events, business rules | None (pure) |
| **Domain Services** | Operations that don't belong to an entity | Domain Core |
| **Application Services** | Use cases, orchestration, DTOs | Domain Core, Domain Services |
| **Infrastructure** | DB access, external APIs, messaging, file system | Application Services (via interfaces) |
| **Presentation** | Controllers, CLI handlers, views | Application Services |

## Dependency Rule

All dependencies point inward. Outer layers depend on inner layers via interfaces defined in the inner layers.

```csharp
// Domain Core — innermost layer
public interface IOrderRepository
{
    Task<Order> GetByIdAsync(OrderId id);
    Task SaveAsync(Order order);
}

public class Order
{
    public OrderId Id { get; private set; }
    public Money Total { get; private set; }
    private List<OrderLine> _lines = new();

    public void AddLine(Product product, int quantity)
    {
        if (quantity <= 0) throw new DomainException("Quantity must be positive");
        _lines.Add(new OrderLine(product, quantity));
        RecalculateTotal();
    }

    private void RecalculateTotal() =>
        Total = _lines.Aggregate(Money.Zero, (sum, line) => sum + line.Subtotal);
}
```

```csharp
// Application Layer — orchestrates use cases
public class PlaceOrderHandler
{
    private readonly IOrderRepository _orderRepository;
    private readonly IProductRepository _productRepository;
    private readonly IEventBus _eventBus;

    public PlaceOrderHandler(
        IOrderRepository orderRepository,
        IProductRepository productRepository,
        IEventBus eventBus)
    {
        _orderRepository = orderRepository;
        _productRepository = productRepository;
        _eventBus = eventBus;
    }

    public async Task<OrderId> Handle(PlaceOrderCommand command)
    {
        var order = new Order();
        foreach (var item in command.Items)
        {
            var product = await _productRepository.GetByIdAsync(item.ProductId);
            order.AddLine(product, item.Quantity);
        }
        await _orderRepository.SaveAsync(order);
        await _eventBus.PublishAsync(new OrderPlacedEvent(order.Id, order.Total));
        return order.Id;
    }
}
```

```csharp
// Infrastructure Layer — implements domain interfaces
public class SqlOrderRepository : IOrderRepository
{
    private readonly AppDbContext _dbContext;

    public SqlOrderRepository(AppDbContext dbContext) => _dbContext = dbContext;

    public async Task<Order> GetByIdAsync(OrderId id) =>
        await _dbContext.Orders
            .Include(o => o.Lines)
            .FirstAsync(o => o.Id == id);

    public async Task SaveAsync(Order order)
    {
        _dbContext.Orders.Add(order);
        await _dbContext.SaveChangesAsync();
    }
}
```

## Ports and Adapters

The outer layers implement interfaces (ports) defined by inner layers. This is the Ports and Adapters pattern.

```
┌─────────────────────────────────────┐
│  Presentation (Controllers, CLI)   │
│         ↓ uses interfaces          │
├─────────────────────────────────────┤
│  Application Services (use cases)  │
│         ↓ uses interfaces          │
├─────────────────────────────────────┤
│  Domain Services (operations)      │
│         ↓ uses                     │
├─────────────────────────────────────┤
│  Domain Core (entities, rules)     │
└─────────────────────────────────────┘
         ↑
   Infrastructure implements interfaces defined above
```

## Common Mistakes

- **Leaking ORM details into the domain** — mapping configuration belongs in infrastructure, not entity classes
- **Application services with business logic** — business rules belong in the domain, orchestration in application
- **Circular dependencies** — using a tool like ArchUnit or NetArchTest to enforce layer boundaries
- **Anemic domain model** — entities should encapsulate behavior, not just data
- **Too many layers** — for simple CRUD apps, Onion can be overkill; use it when domain complexity justifies it

## FAQ

**Onion vs Clean Architecture?**
Both share the same dependency inversion principle. Onion explicitly names the layers (Domain, Application, Infrastructure, Presentation), while Clean Architecture uses a more generic concentric ring model. They are functionally equivalent.

**Can I use Onion with a monolithic application?**
Yes. Onion Architecture works at the module or application level. A monolith can have multiple onion-structured modules.

**What ORM works best with Onion?**
Any ORM that supports POCO/POJO entities without requiring base classes or attributes. EF Core with Fluent API, Dapper, Hibernate with XML mappings, or SQLAlchemy with declarative base all work.
