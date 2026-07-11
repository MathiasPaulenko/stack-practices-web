---
contentType: guides
slug: vertical-slice-architecture-guide
title: "Vertical Slice Architecture: Feature-First Organization"
description: "A practical guide to Vertical Slice Architecture: organizing code by feature instead of technical concern, reducing cross-layer navigation and improving cohesion."
metaDescription: "Learn Vertical Slice Architecture: organize code by feature, not layer. Reduce cross-layer navigation, improve cohesion, and simplify changes with practical examples."
difficulty: intermediate
topics:
  - architecture
  - design
tags:
  - vertical-slice-architecture
  - feature-based
  - feature-folder
  - code-organization
  - cohesion
  - maintainability
  - guide
relatedResources:
  - /guides/onion-architecture-guide
  - /guides/layered-architecture-guide
  - /patterns/design/cqrs-pattern
  - /patterns/design/mediator-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn Vertical Slice Architecture: organize code by feature, not layer. Reduce cross-layer navigation, improve cohesion, and simplify changes with practical examples."
  keywords:
    - vertical-slice-architecture
    - feature-based
    - feature-folder
    - code-organization
    - cohesion
    - guide
---

## Overview

Vertical Slice Architecture, popularized by Jimmy Bogard, flips the traditional layered approach. Instead of organizing code by technical concern (Controllers, Services, Repositories), you organize by feature. All code for a single feature — controller, service, queries, DTOs, validation — lives together in one place. When you need to change "Create Order," all the relevant code is in one folder. This dramatically reduces the cognitive load of navigating a codebase.

## When to Use

- Your application has many capabilities that evolve independently
- Team members frequently ask "where is the code for X?"
- Cross-layer changes require touching 5+ files in 3+ directories
- You want to minimize merge conflicts between feature teams
- Some capabilities are simple CRUD, others are complex workflows

## Horizontal vs Vertical Organization

```
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
|-----------|---------|
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

    public async Task<OrderDto> Handle(CreateOrderCommand request, CancellationToken cancellationToken)
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
        await _dbContext.SaveChangesAsync(cancellationToken);

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

Not everything belongs in a feature slice. Shared infrastructure lives in a common folder:

```
├── Features/           # Vertical slices
├── Common/
│   ├── Behaviors/      # MediatR pipelines (logging, validation, transactions)
│   ├── Exceptions/     # Domain and application exceptions
│   ├── Interfaces/     # Shared abstractions
│   └── Infrastructure/ # DbContext, DI configuration
```

## Common Mistakes

- **No shared abstractions** — duplicating DbContext access or validation pipelines in every feature
- **Features too granular** — creating a slice for every CRUD operation instead of grouping related operations
- **Business logic in endpoints** — handlers should contain the logic, endpoints just delegate
- **Ignoring cross-cutting concerns** — logging, caching, and transactions still need centralized handling
- **Mixing horizontal and vertical** — picking one approach per application, not both arbitrarily

## FAQ

**Does Vertical Slice replace Clean Architecture?**
No, they address different concerns. Vertical Slice is about code organization (folder structure). Clean Architecture is about dependency direction. You can combine them: vertically organized features with inward-pointing dependencies.

**What framework works best with Vertical Slice?**
Any framework that supports a mediator pattern. ASP.NET Core with MediatR, FastAPI with dependency injection, or Spring Boot with CQRS libraries all work well.

**How do I handle features that share logic?**
Extract shared logic into domain services or common behaviors. The goal is cohesion within a feature, not absolute isolation at all costs.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Detailed Scenario: E-commerce App with Vertical Slices

```text
Project: E-commerce API (.NET 8, FastEndpoints + MediatR)
Domains: Orders, Products, Customers, Cart, Checkout

Folder structure:
  src/
    Features/
      Orders/
        CreateOrder/
          ├── CreateOrderCommand.cs      # Input DTO
          ├── CreateOrderHandler.cs       # Business logic
          ├── CreateOrderValidator.cs     # Validation
          ├── CreateOrderEndpoint.cs      # HTTP route
          └── CreateOrderResponse.cs      # Output DTO
        GetOrderById/
          ├── GetOrderByIdQuery.cs
          ├── GetOrderByIdHandler.cs
          └── GetOrderByIdEndpoint.cs
        UpdateOrderStatus/
          ├── UpdateOrderStatusCommand.cs
          ├── UpdateOrderStatusHandler.cs
          ├── UpdateOrderStatusValidator.cs
          └── UpdateOrderStatusEndpoint.cs
        CancelOrder/
          ├── CancelOrderCommand.cs
          ├── CancelOrderHandler.cs
          └── CancelOrderEndpoint.cs
      Products/
        CreateProduct/
        GetProductById/
        ListProducts/
        UpdatePrice/
      Cart/
        AddToCart/
        RemoveFromCart/
        GetCart/
    Common/
      Behaviors/
        ├── LoggingBehavior.cs            # Logging pipeline
        ├── ValidationBehavior.cs         # Validation pipeline
        └── TransactionBehavior.cs        # Transaction pipeline
      Exceptions/
        ├── NotFoundException.cs
        ├── ValidationException.cs
        └── ConflictException.cs
      Infrastructure/
        ├── AppDbContext.cs
        ├── DependencyInjection.cs
        └── EventBus.cs

MediatR pipeline (chained behaviors):
  Request -> LoggingBehavior -> ValidationBehavior -> TransactionBehavior -> Handler

  // LoggingBehavior.cs
  public class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
  {
      public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
      {
          logger.LogInformation("Handling {RequestType}", typeof(TRequest).Name);
          var response = await next();
          logger.LogInformation("Handled {RequestType}", typeof(TRequest).Name);
          return response;
      }
  }

Observed benefits:
  - Change to "Create Order" touches 1 folder, not 5
  - Merge conflicts reduced 80% (each team works in their slice)
  - Faster onboarding: new dev reads one folder and understands the feature
  - Tests organized by feature: Orders.Tests/CreateOrderTests.cs
```

### How do I migrate from layered architecture to vertical slices?

Migrate one feature at a time. Start with the simplest feature (e.g., GetProductById). Create the Features/Products/GetProductById/ folder, move the relevant code, and verify tests pass. Remove the old code from the horizontal folders. Repeat with the next feature. Do not migrate everything at once: the risk of breaking is high and the value of each incremental migration is immediate.

### How do I handle features that share domain entities?

Shared domain entities (Order, Product, Customer) live in Common/Domain/ or a shared project. Slices reference these entities but contain their own business logic. If two features need the same domain logic, extract a method on the entity or create a domain service in Common/. The goal is cohesion within the slice, not forced duplication.

























End of document. Review and update quarterly.