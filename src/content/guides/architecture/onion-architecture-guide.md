---
contentType: guides
slug: onion-architecture-guide
title: "Onion Architecture Guide: Domain-Centric Design with Dependency Inversion"
description: "A practical guide to Onion Architecture: organize code around the domain, enforce inward dependencies, and isolate infrastructure. Includes C# examples."
metaDescription: "A practical guide to Onion Architecture: organize code around the domain, enforce inward dependencies, and isolate infrastructure. Includes C# examples."
difficulty: intermediate
topics:
  - architecture
  - design
tags:
  - architecture
  - dependency-inversion
  - domain-driven-design
  - clean-architecture
  - ports-and-adapters
  - layered-architecture
  - guide
relatedResources:
  - /guides/layered-architecture-guide
  - /guides/vertical-slice-architecture-guide
  - /patterns/dependency-injection-pattern
  - /patterns/repository-pattern
  - /guides/clean-architecture-guide
  - /guides/cqrs-event-sourcing-combined-guide
  - /guides/hexagonal-architecture-guide
lastUpdated: "2026-08-23"
publishedAt: "2026-06-25"
author: Mathias Paulenko
seo:
  metaDescription: "A practical guide to Onion Architecture: organize code around the domain, enforce inward dependencies, and isolate infrastructure. Includes C# examples."
  keywords:
    - onion-architecture
    - dependency-inversion
    - domain-driven-design
    - clean-architecture
    - ports-and-adapters
    - guide
---

## Overview

Onion Architecture, introduced by Jeffrey Palermo, organizes an application as
concentric layers with the domain model at the center. In a traditional layered
design, dependencies point downward: UI depends on business logic, which depends
on the database. Onion inverts that direction. Every layer depends on the layers
closer to the center, never the other way around. Infrastructure, UI, and
external services sit at the outer edge and depend on abstractions defined in the
domain core. This keeps the domain model free of frameworks, databases, and
delivery mechanisms.

## When to Use

Use Onion Architecture when the domain model must outlive framework choices, when
business rules are complex and change often, and when you want to delay decisions
about the database, web framework, or UI. It also helps when you need fast,
deterministic tests for business rules without spinning up a database or web
server, and when you're already applying Domain-Driven Design.

## When to Avoid

Avoid it for simple CRUD or throwaway prototypes where the extra layering costs
more than it gives back. If the team isn't comfortable with dependency inversion
or testing through interfaces, the structure can feel heavy. It's also a poor
fit when deadlines matter more than long-term maintainability and the domain is
unlikely to change.

## Core Concepts

### The Layers

The architecture splits the system into four layers, each one with a clear
responsibility. The **Domain Core** sits at the center and contains entities,
value objects, domain events, and business rules, and it stays free of outside
dependencies. **Domain Services** hold operations that don't fit naturally inside
an entity, and they rely only on the Domain Core. **Application Services**
coordinate use cases, map DTOs, and drive domain objects, relying on the Domain
Core and Domain Services. **Infrastructure** fills in the interfaces defined by
inner layers, such as repositories, message buses, file storage, and external
APIs, and it connects to the Application layer through those interfaces.
**Presentation** contains controllers, CLI handlers, or views and depends on the
Application Services. This arrangement leaves the domain as the most stable part
of the system.

### The Dependency Rule

All dependencies point inward. Outer layers depend on inner layers through
interfaces that live in the inner layers. The domain stays clear of Entity
Framework, ASP.NET, RabbitMQ, and any other framework. Instead, the
infrastructure layer references the domain and fills in interfaces such as
`IOrderRepository` or `IEventBus`.

### Ports and Adapters

The interfaces defined by the inner layers are ports. The concrete
implementations in the outer layers are adapters. The application states its
needs, and the infrastructure satisfies them. This decoupling lets you swap SQL
Server for PostgreSQL, REST for gRPC, or a real bus for an in-memory fake without
touching the domain.

## Implementation Example

The C# snippets below show a small order system: the domain defines an `Order`
entity and an `IOrderRepository` port, the application layer places an order, and
the infrastructure layer builds the repository with Entity Framework Core.

```csharp
// Domain Core — no external dependencies
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

A typical .NET solution looks like this:

```text
src/
  Domain/
    Entities/Order.cs
    ValueObjects/Money.cs
    Events/OrderPlacedEvent.cs
    Interfaces/IOrderRepository.cs
  Application/
    Orders/PlaceOrder/PlaceOrderHandler.cs
    DTOs/OrderDto.cs
  Infrastructure/
    Persistence/Repositories/SqlOrderRepository.cs
    Messaging/RabbitMqEventBus.cs
  Presentation/
    Controllers/OrdersController.cs
```

Dependency rules can be enforced in CI with a test such as this one using
NetArchTest or ArchUnit:

```csharp
var result = Types.InAssembly(typeof(Order).Assembly)
    .Should().NotHaveDependencyOn("Infrastructure")
    .And().NotHaveDependencyOn("Presentation")
    .And().NotHaveDependencyOn("Microsoft.EntityFrameworkCore")
    .GetResult();

result.IsSuccessful.Should().BeTrue();
```

## Best Practices

Keep the Domain Core pure by making sure it never references a framework, ORM, or
external library. Define repository, bus, and unit-of-work interfaces in the
domain or application layer, not in infrastructure. Wire concrete adapters through
dependency injection at the composition root, usually in `Program.cs` or a startup
module. Enforce layer boundaries with architecture tests in CI, because a passing
build isn't enough when a new reference creeps inward. Map between entities and
DTOs explicitly, and never expose domain objects straight from controllers. Keep
business rules inside entities and domain services, and let application services
only coordinate.

## Common Mistakes

Leaking ORM details into the domain is a common mistake; mapping configuration and
framework attributes belong in infrastructure. Putting business logic in
application services also breaks the model, because rules belong in the domain
while application code coordinates. Circular dependencies between layers can be
caught early with architecture tests. Building an anemic domain model, where
entities are just data bags with getters and setters, misses the point. Adding
every layer to a small CRUD app is overkill; the pattern only pays off when domain
complexity is genuine.

## FAQ

### What is the difference between Onion and Clean Architecture?

Both use the same inward dependency rule. Onion gives explicit names to the
layers — Domain, Application, Infrastructure, Presentation. Clean Architecture
draws the same idea as generic concentric rings. They're functionally the same.

### Can I use Onion Architecture in a monolith?

Yes. It works at module or application level. A monolith can contain several
onion-structured modules, each with its own domain core.

### Which ORM works best?

Any ORM that lets you use plain POCO or POJO entities without base classes or
attributes. EF Core with Fluent API, Dapper, Hibernate with XML mappings, and
SQLAlchemy with declarative bases all work.

### How do I start with an existing codebase?

Pick one bounded context or service and apply the layering there. Move framework
code outward, define ports in the domain, and add an adapter. Measure before
expanding.

### How do I handle transactions?

Define `IUnitOfWork` in the domain or application layer. Infrastructure
handles it with EF Core or Dapper. The application handler opens the unit of
work, runs domain operations, and commits. The domain knows nothing about
transactions.

### How do I test each layer?

Domain Core tests are pure unit tests with no mocks. Application Service tests
use mocked ports. Infrastructure tests run against a real database or a test
container. Presentation tests run against the full API host.
