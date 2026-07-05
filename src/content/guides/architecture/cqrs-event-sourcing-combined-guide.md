---
contentType: guides
slug: cqrs-event-sourcing-combined-guide
title: "CQRS + Event Sourcing — Combined Guide"
description: "A practical guide to combining CQRS and Event Sourcing: separating read and write models, rebuilding state from events, and handling eventual consistency."
metaDescription: "Learn CQRS + Event Sourcing: separate read/write models, rebuild state from events, handle eventual consistency. Practical guide with code examples."
difficulty: advanced
topics:
  - architecture
  - databases
  - messaging
tags:
  - cqrs
  - event-sourcing
  - read-model
  - write-model
  - eventual-consistency
  - event-store
  - projection
  - guide
relatedResources:
  - /guides/onion-architecture-guide
  - /guides/data-mesh-guide
  - /patterns/design/saga-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn CQRS + Event Sourcing: separate read/write models, rebuild state from events, handle eventual consistency. Practical guide with code examples."
  keywords:
    - cqrs
    - event-sourcing
    - read-model
    - write-model
    - eventual-consistency
    - event-store
    - guide
---

## Overview

CQRS (Command Query Responsibility Segregation) and Event Sourcing are often used together but solve different problems. CQRS splits read and write operations into separate models optimized for each. Event Sourcing stores state changes as a sequence of events rather than overwriting current state. Combined, they create a capable pattern where the write model appends events, the read model projects those events into queryable views, and the system can reconstruct any past state by replaying the event log.

## When to Use

- Complex domains where auditing every state change is required
- Read and write workloads have fundamentally different access patterns
- You need to rebuild read models without touching the write path
- Event-driven microservices need a reliable source of truth
- Business requirements demand temporal queries ("What was the state on March 15?")

## The Combined Architecture

```
┌─────────────┐     Command      ┌──────────────┐
│   Client    │ ───────────────> │ Command Side │
│             │                  │  (Write Model)│
│             │ <─────────────── │              │
└─────────────┘     Event        └──────┬───────┘
                                        │
                                        │ Store Events
                                        ▼
                                ┌──────────────┐
                                │  Event Store │
                                └──────┬───────┘
                                       │ Publish
                                       ▼
┌─────────────┐     Query      ┌──────────────┐
│   Client    │ <──────────────│  Query Side  │
│             │                │  (Read Model) │
└─────────────┘                └──────────────┘
```

## Write Model — Event Sourcing

```csharp
// Commands
public record PlaceOrderCommand(Guid CustomerId, List<OrderLineItem> Items);
public record CancelOrderCommand(Guid OrderId, string Reason);

// Domain Events
public record OrderPlaced(Guid OrderId, Guid CustomerId, List<OrderLineItem> Items, DateTime PlacedAt);
public record OrderCancelled(Guid OrderId, string Reason, DateTime CancelledAt);

// Aggregate Root
public class Order : AggregateRoot
{
    private List<OrderLineItem> _items = new();
    private OrderStatus _status = OrderStatus.Pending;

    public static Order Create(PlaceOrderCommand command)
    {
        var order = new Order();
        order.Apply(new OrderPlaced(
            Guid.NewGuid(),
            command.CustomerId,
            command.Items,
            DateTime.UtcNow));
        return order;
    }

    public void Cancel(string reason)
    {
        if (_status == OrderStatus.Shipped)
            throw new DomainException("Cannot cancel shipped order");
        
        Apply(new OrderCancelled(Id, reason, DateTime.UtcNow));
    }

    // Rehydration from events
    protected override void When(object @event)
    {
        switch (@event)
        {
            case OrderPlaced e:
                Id = e.OrderId;
                _items = e.Items;
                _status = OrderStatus.Placed;
                break;
            case OrderCancelled:
                _status = OrderStatus.Cancelled;
                break;
        }
    }
}
```

## Event Store

```csharp
public interface IEventStore
{
    Task AppendAsync(string streamId, IEnumerable<object> events, long expectedVersion);
    Task<IReadOnlyList<object>> ReadStreamAsync(string streamId);
}

public class PostgresEventStore : IEventStore
{
    private readonly NpgsqlConnection _connection;

    public async Task AppendAsync(string streamId, IEnumerable<object> events, long expectedVersion)
    {
        await using var transaction = await _connection.BeginTransactionAsync();
        
        var currentVersion = await GetCurrentVersionAsync(streamId);
        if (currentVersion != expectedVersion)
            throw new ConcurrencyException($"Expected version {expectedVersion}, found {currentVersion}");

        foreach (var @event in events)
        {
            await _connection.ExecuteAsync(
                "INSERT INTO events (stream_id, version, type, data, metadata) VALUES (@streamId, @version, @type, @data, @metadata)",
                new { streamId, version = ++currentVersion, type = @event.GetType().Name, data = JsonSerializer.Serialize(@event) });
        }
        
        await transaction.CommitAsync();
    }

    public async Task<IReadOnlyList<object>> ReadStreamAsync(string streamId)
    {
        var rows = await _connection.QueryAsync<EventRow>(
            "SELECT type, data FROM events WHERE stream_id = @streamId ORDER BY version",
            new { streamId });
        
        return rows.Select(r => JsonSerializer.Deserialize(r.Data, Type.GetType(r.Type))).ToList();
    }
}
```

## Read Model — Projections

```csharp
public class OrderProjectionHandler : IEventHandler<OrderPlaced>, IEventHandler<OrderCancelled>
{
    private readonly OrderReadDbContext _dbContext;

    public OrderProjectionHandler(OrderReadDbContext dbContext) => _dbContext = dbContext;

    public async Task Handle(OrderPlaced @event, CancellationToken cancellationToken)
    {
        var orderView = new OrderView
        {
            Id = @event.OrderId,
            CustomerId = @event.CustomerId,
            Status = "Placed",
            Total = @event.Items.Sum(i => i.Price * i.Quantity),
            ItemCount = @event.Items.Count,
            PlacedAt = @event.PlacedAt
        };
        _dbContext.OrderViews.Add(orderView);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task Handle(OrderCancelled @event, CancellationToken cancellationToken)
    {
        var orderView = await _dbContext.OrderViews.FindAsync(@event.OrderId);
        if (orderView != null)
        {
            orderView.Status = "Cancelled";
            orderView.CancelledAt = @event.CancelledAt;
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
```

## Read Model Queries

```csharp
public class GetOrdersQueryHandler : IRequestHandler<GetOrdersQuery, List<OrderSummaryDto>>
{
    private readonly OrderReadDbContext _dbContext;

    public GetOrdersQueryHandler(OrderReadDbContext dbContext) => _dbContext = dbContext;

    public async Task<List<OrderSummaryDto>> Handle(GetOrdersQuery request, CancellationToken cancellationToken)
    {
        return await _dbContext.OrderViews
            .Where(o => request.Status == null || o.Status == request.Status)
            .OrderByDescending(o => o.PlacedAt)
            .Select(o => new OrderSummaryDto(o.Id, o.Status, o.Total, o.ItemCount))
            .ToListAsync(cancellationToken);
    }
}
```

## Handling Eventual Consistency

| Strategy | When to Use |
|----------|-------------|
| **Polling** | Simple UI with low latency requirements |
| **WebSockets/SSE** | Real-time UI updates |
| **Return projection ID** | Let client poll the read model directly |
| **Synchronous projection** | Acceptable only for critical paths with low volume |

```csharp
// Option: Return read model location after command
public async Task<IActionResult> PlaceOrder(PlaceOrderCommand command)
{
    var orderId = await _commandBus.SendAsync(command);
    return AcceptedAtAction(
        actionName: nameof(GetOrder),
        routeValues: new { id = orderId },
        value: new { message = "Order processing", checkStatusAt = $"/orders/{orderId}" });
}
```

## Common Mistakes

- **Over-engineering simple CRUD** — CQRS + ES adds major complexity; use it when the domain justifies it
- **No versioning strategy** — event schemas evolve; implement upcasting or multiple versions
- **Missing idempotency** — handlers may process the same event twice; design for idempotency
- **Large aggregates** — big aggregates generate many events; consider splitting by bounded context
- **No snapshot strategy** — replaying thousands of events for each load is slow; use snapshots for hot aggregates

## FAQ

**Can I use CQRS without Event Sourcing?**
Yes. CQRS only requires separate read/write models. The write model can use a traditional relational database.

**How do I handle schema changes in events?**
Version your events. When reading old events, apply an upcaster to transform them to the current schema. Never modify stored events.

**What database should I use for the event store?**
PostgreSQL with JSONB works well for moderate scale. For high throughput, use specialized event stores like EventStoreDB or Axon Server.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.
