---
contentType: guides
slug: vertical-slice-architecture-guide
title: "Vertical Slice Architecture: Feature-First Organization"
description: "A practical guide to Vertical Slice Architecture: organizing code by feature instead of technical concern to reduce cross-layer navigation and improve cohesion."
metaDescription: "Learn Vertical Slice Architecture: organize code by feature, not layer. Reduce navigation, improve cohesion and simplify changes with practical examples."
difficulty: intermediate
topics:
  - architecture
  - design
tags:
  - maintainability
  - guide
  - vertical-slice
  - architecture
  - feature-based
  - modularity
  - cohesion
relatedResources:
  - /guides/onion-architecture-guide
  - /guides/layered-architecture-guide
  - /guides/clean-architecture-guide
  - /patterns/cqrs-pattern
  - /patterns/mediator-pattern
  - /patterns/repository-pattern
lastUpdated: "2026-08-19"
publishedAt: "2026-06-25"
author: Mathias Paulenko
seo:
  metaDescription: "Learn Vertical Slice Architecture: organize code by feature, not layer. Reduce navigation, improve cohesion and simplify changes with practical examples."
  keywords:
    - vertical-slice-architecture
    - feature-based
    - feature-folder
    - code-organization
    - cohesion
    - guide
---

## Overview

Vertical Slice Architecture, popularized by Jimmy Bogard, flips the traditional
layered approach. Instead of organizing code by technical concern (Controllers,
Services, Repositories), you organize by feature. All code for a single feature
— command, handler, validator and endpoint — lives together in one place. When
you need to change "Create Order", all the relevant files are in one folder. This
cuts the cognitive load of navigating a codebase and reduces merge conflicts
between teams.

## When to Use

- Your application has many capabilities that evolve independently.
- Team members keep asking "where is the code for X?"
- Cross-layer changes require touching several files in several directories.
- You want to minimize merge conflicts between feature teams.
- Some capabilities are simple CRUD, others are complex workflows.

For alternatives, see [Clean Architecture](/guides/clean-architecture-guide/).

### When to avoid

- The codebase is tiny. A single feature folder doesn't simplify a project that
  already fits in a few files.
- Every feature reuses the same massive domain model. Deep coupling across slices
  is a sign the domain isn't split well.
- Your organization isn't ready to let one team own one slice end to end.

## Horizontal vs Vertical Organization

```text
Horizontal (Layered)          Vertical (Feature Slices)
├── Controllers               ├── Features
│   ├── OrderController.cs    │   ├── CreateOrder
│   └── ProductController.cs  │   │   ├── CreateOrderCommand.cs
├── Services                  │   │   ├── CreateOrderHandler.cs
│   ├── OrderService.cs       │   │   ├── CreateOrderValidator.cs
│   └── ProductService.cs     │   │   └── CreateOrderEndpoint.cs
├── Repositories              │   ├── GetOrderById
│   ├── OrderRepository.cs    │   │   ├── GetOrderByIdQuery.cs
│   └── ProductRepository.cs  │   │   └── GetOrderByIdHandler.cs
                              │   └── UpdateOrderStatus
```

## Feature Structure

Each feature is self-contained and typically includes:

| Component | Purpose |
| --- | --- |
| **Command/Query** | Input model (DTO) |
| **Handler** | Business logic for the feature |
| **Validator** | Input validation rules |
| **Endpoint/Controller** | HTTP or messaging entry point |
| **Response** | Output model (DTO) |

## Example: Create Order Feature

```csharp
// Features/Orders/CreateOrder/CreateOrderCommand.cs
public record CreateOrderCommand(
    int ProductId,
    int Quantity,
    string CustomerEmail
) : IRequest<OrderDto>;
```

```csharp
// Features/Orders/CreateOrder/CreateOrderHandler.cs
public class CreateOrderHandler : IRequestHandler<CreateOrderCommand, OrderDto>
{
    private readonly AppDbContext _dbContext;

    public CreateOrderHandler(AppDbContext dbContext) => _dbContext = dbContext;

    public async Task<OrderDto> Handle(CreateOrderCommand request, CancellationToken ct)
    {
        var product = await _dbContext.Products.FindAsync(request.ProductId);
        if (product == null) throw new NotFoundException("Product not found");
        if (product.Stock < request.Quantity)
            throw new ValidationException("Insufficient stock");

        var order = new Order
        {
            ProductId = request.ProductId,
            Quantity = request.Quantity,
            CustomerEmail = request.CustomerEmail,
            Total = product.Price * request.Quantity,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Orders.Add(order);
        product.Stock -= request.Quantity;
        await _dbContext.SaveChangesAsync(ct);

        return new OrderDto(order);
    }
}
```

```csharp
// Features/Orders/CreateOrder/CreateOrderValidator.cs
public class CreateOrderValidator : AbstractValidator<CreateOrderCommand>
{
    public CreateOrderValidator()
    {
        RuleFor(x => x.ProductId).GreaterThan(0);
        RuleFor(x => x.Quantity).GreaterThan(0).LessThanOrEqualTo(100);
        RuleFor(x => x.CustomerEmail).NotEmpty().EmailAddress();
    }
}
```

```csharp
// Features/Orders/CreateOrder/CreateOrderEndpoint.cs
public class CreateOrderEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapPost("/orders", async (CreateOrderCommand command, ISender sender) =>
        {
            var result = await sender.Send(command);
            return Results.Created($"/orders/{result.Id}", result);
        });
    }
}
```

## Sharing Cross-Cutting Concerns

Not everything belongs in a feature slice. Shared infrastructure lives in a
common folder:

```text
├── Features/           # Vertical slices
├── Common/
│   ├── Behaviors/      # MediatR pipelines (logging, validation, transactions)
│   ├── Exceptions/     # Domain and application exceptions
│   ├── Interfaces/     # Shared abstractions
│   └── Infrastructure/ # DbContext, DI configuration
```

Use this folder for code that's reused across slices: logging, validation
pipelines, transactions and shared exceptions. Keep the business logic inside
the slice.

## Best Practices

- Group related operations in one slice. Don't create a slice for every CRUD
  action if they share the same data and rules.
- Keep handlers fat and endpoints thin. Endpoints should delegate; handlers
  should contain the business logic.
- Extract shared logic into `Common/` or domain services, but only when at least
  two slices need it.
- Organize tests by feature. Put `CreateOrderTests.cs` next to the feature code
  or in a matching test folder.
- Use a mediator library (MediatR, Mediator) to route requests to handlers
  without coupling slices to each other.
- Pick one primary organization per application. Mixing horizontal and vertical
  in the same project creates confusion.

## Common Mistakes

- Duplicating `DbContext` access or validation pipelines in every feature instead
  of using shared behaviors.
- Making slices too granular. A folder per tiny CRUD operation adds noise, not
  clarity.
- Putting business logic in endpoints or controllers. That pulls logic out of the
  slice and back into a horizontal layer.
- Ignoring cross-cutting concerns. Logging, caching and transactions still need a
  central place.
- Forcing absolute isolation. Shared domain entities can live in `Common/Domain`
  and still keep each slice cohesive.

## FAQ

### Does Vertical Slice replace Clean Architecture?

No. Vertical Slice is about folder organization. Clean Architecture is about
dependency direction. You can combine them: vertically organized slices with
inward-pointing dependencies.

### What framework works best with Vertical Slice?

Any framework that supports a mediator pattern. ASP.NET Core with MediatR,
FastAPI with dependency injection, or Spring Boot with CQRS libraries all work
well.

### How do I handle features that share logic?

Extract shared logic into domain services or common behaviors. The goal is
cohesion within a feature, not isolation at all costs.

### How do I migrate from layered to vertical slices?

Migrate one feature at a time. Start with the simplest one, move its code into
the new slice folder, verify the tests, then remove the old files. Repeat. Don't
migrate everything at once.

### How do I handle shared domain entities?

Shared entities like `Order` or `Product` live in `Common/Domain/` or a shared
project. Slices reference them but keep their own business logic. If two slices
need the same domain logic, extract a method on the entity or create a domain
service in `Common/`.

### When is a slice too big?

When the folder starts to feel like its own application — several business
processes, unrelated data and many sub-folders — it's probably a bounded context
that deserves its own service or module.
