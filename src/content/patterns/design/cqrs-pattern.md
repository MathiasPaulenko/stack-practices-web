---
contentType: patterns
slug: cqrs-pattern
title: "CQRS Pattern"
description: "Separate read and write operations into different models, optimizing each for their specific workload. A data pattern for scalable systems."
metaDescription: "Learn the CQRS Pattern in Python, Java, and JavaScript. Architectural pattern separating read and write models for performance and scalability."
difficulty: advanced
topics:
  - design
tags:
  - cqrs
  - pattern
  - design-pattern
  - architectural
  - read-model
  - write-model
  - scalability
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/event-sourcing-pattern
  - /patterns/design/saga-pattern
  - /patterns/design/cache-aside-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the CQRS Pattern in Python, Java, and JavaScript. Architectural pattern separating read and write models for performance and scalability."
  keywords:
    - cqrs pattern
    - design pattern
    - architectural pattern
    - read model
    - write model
    - python cqrs
    - java cqrs
    - javascript cqrs
---

# CQRS Pattern

## Overview

CQRS (Command Query Responsibility Segregation) is an architectural pattern that separates read and write operations into distinct models. Instead of using a single data model for both queries and updates, CQRS uses a **Command Model** for writes and a **Query Model** for reads, each optimized for its specific workload.

## When to Use

Use the CQRS Pattern when:
- Read and write workloads have very different performance characteristics or scale independently
- You need complex query capabilities (aggregation, filtering, search) without complicating the write model
- Event sourcing is already in use, making read model projections natural
- Different teams own reads vs. writes, and decoupling reduces coordination
- Examples: analytics dashboards, e-commerce catalogs, social media feeds, reporting systems

## Solution

### Python

```python
from dataclasses import dataclass, field
from typing import List, Dict
from datetime import datetime

# Write Model (Command Side)
@dataclass
class Order:
    order_id: str
    customer_id: str
    items: List[dict] = field(default_factory=list)
    status: str = "pending"
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

class OrderCommandHandler:
    def __init__(self):
        self.orders: Dict[str, Order] = {}

    def create_order(self, order_id: str, customer_id: str) -> Order:
        order = Order(order_id=order_id, customer_id=customer_id)
        self.orders[order_id] = order
        return order

    def add_item(self, order_id: str, product: str, qty: int, price: float):
        order = self.orders[order_id]
        order.items.append({"product": product, "qty": qty, "price": price})

    def confirm(self, order_id: str):
        self.orders[order_id].status = "confirmed"

# Read Model (Query Side) — optimized for reads
@dataclass
class OrderSummary:
    order_id: str
    customer_id: str
    total: float
    item_count: int
    status: str

class OrderQueryHandler:
    def __init__(self, command_store: Dict[str, Order]):
        self.command_store = command_store

    def get_summary(self, order_id: str) -> OrderSummary:
        order = self.command_store[order_id]
        total = sum(i["qty"] * i["price"] for i in order.items)
        return OrderSummary(
            order_id=order.order_id,
            customer_id=order.customer_id,
            total=total,
            item_count=len(order.items),
            status=order.status
        )

    def list_by_customer(self, customer_id: str) -> List[OrderSummary]:
        return [
            self.get_summary(o.order_id)
            for o in self.command_store.values()
            if o.customer_id == customer_id
        ]

# Usage
commands = OrderCommandHandler()
commands.create_order("ORD-1", "CUST-1")
commands.add_item("ORD-1", "Laptop", 1, 999.99)
commands.add_item("ORD-1", "Mouse", 2, 29.99)
commands.confirm("ORD-1")

queries = OrderQueryHandler(commands.orders)
summary = queries.get_summary("ORD-1")
print(f"Order {summary.order_id}: ${summary.total:.2f} ({summary.item_count} items)")
```

### JavaScript

```javascript
// Write Model (Command Side)
class OrderCommandHandler {
  constructor() {
    this.orders = new Map();
  }

  createOrder(orderId, customerId) {
    this.orders.set(orderId, {
      orderId, customerId, items: [], status: "pending",
      createdAt: new Date().toISOString()
    });
  }

  addItem(orderId, product, qty, price) {
    this.orders.get(orderId).items.push({ product, qty, price });
  }

  confirm(orderId) {
    this.orders.get(orderId).status = "confirmed";
  }
}

// Read Model (Query Side)
class OrderQueryHandler {
  constructor(commandStore) {
    this.store = commandStore;
  }

  getSummary(orderId) {
    const order = this.store.get(orderId);
    const total = order.items.reduce((sum, i) => sum + i.qty * i.price, 0);
    return {
      orderId: order.orderId,
      customerId: order.customerId,
      total,
      itemCount: order.items.length,
      status: order.status
    };
  }

  listByCustomer(customerId) {
    return Array.from(this.store.values())
      .filter(o => o.customerId === customerId)
      .map(o => this.getSummary(o.orderId));
  }
}

// Usage
const commands = new OrderCommandHandler();
commands.createOrder("ORD-1", "CUST-1");
commands.addItem("ORD-1", "Laptop", 1, 999.99);
commands.confirm("ORD-1");

const queries = new OrderQueryHandler(commands.orders);
console.log(queries.getSummary("ORD-1"));
```

### Java

```java
import java.util.*;

// Write Model
class Order {
    String orderId;
    String customerId;
    List<Map<String, Object>> items = new ArrayList<>();
    String status = "pending";
    String createdAt = new Date().toString();
}

class OrderCommandHandler {
    private final Map<String, Order> orders = new HashMap<>();

    public void createOrder(String orderId, String customerId) {
        Order o = new Order();
        o.orderId = orderId;
        o.customerId = customerId;
        orders.put(orderId, o);
    }

    public void addItem(String orderId, String product, int qty, double price) {
        Map<String, Object> item = new HashMap<>();
        item.put("product", product);
        item.put("qty", qty);
        item.put("price", price);
        orders.get(orderId).items.add(item);
    }

    public void confirm(String orderId) {
        orders.get(orderId).status = "confirmed";
    }

    public Map<String, Order> getStore() { return orders; }
}

// Read Model
class OrderSummary {
    public String orderId;
    public String customerId;
    public double total;
    public int itemCount;
    public String status;
}

class OrderQueryHandler {
    private final Map<String, Order> store;

    public OrderQueryHandler(Map<String, Order> store) {
        this.store = store;
    }

    public OrderSummary getSummary(String orderId) {
        Order o = store.get(orderId);
        OrderSummary s = new OrderSummary();
        s.orderId = o.orderId;
        s.customerId = o.customerId;
        s.total = o.items.stream().mapToDouble(i ->
            (int)i.get("qty") * (double)i.get("price")).sum();
        s.itemCount = o.items.size();
        s.status = o.status;
        return s;
    }
}

// Usage
OrderCommandHandler commands = new OrderCommandHandler();
commands.createOrder("ORD-1", "CUST-1");
commands.addItem("ORD-1", "Laptop", 1, 999.99);
commands.confirm("ORD-1");

OrderQueryHandler queries = new OrderQueryHandler(commands.getStore());
System.out.println(queries.getSummary("ORD-1").total);
```

## Explanation

CQRS separates two concerns:

- **Command Model**: Optimized for writes — validates business rules, maintains invariants, processes state changes
- **Query Model**: Optimized for reads — denormalized, indexed, often read from a separate database (e.g., Elasticsearch for search, Redis for fast lookups)

The two models are synchronized either synchronously (same transaction) or asynchronously (event-driven projections).

## Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| **Single DB** | Separate models, same database | Simple CQRS; lower complexity |
| **Dual DB** | Write to SQL, read from NoSQL/search | Complex queries; high read scale |
| **Event Sourcing + CQRS** | Events are source of truth; read models are projections | Audit trails; temporal queries |
| **API Segregation** | Separate REST/GraphQL endpoints for commands and queries | Microservices; team boundaries |

## Best Practices

- **Start simple** — separate models within the same database before introducing dual storage
- **Use eventual consistency** for read models when async projections are acceptable
- **Version your read models** when the query schema changes
- **Monitor projection lag** — ensure read models don't fall too far behind writes
- **Keep commands small and focused** — one command should do one thing

## Common Mistakes

- Applying CQRS to simple CRUD apps where a single model is sufficient
- Allowing the read model to bypass business rules (validation belongs in commands)
- Ignoring eventual consistency issues in async CQRS
- Over-engineering with separate databases before proving the need
- Not handling read model rebuilds when projection logic changes

## Frequently Asked Questions

**Q: Does CQRS require Event Sourcing?**
A: No. CQRS can be used with any persistence model. Event Sourcing is often paired with CQRS because events make natural source data for read model projections, but they are independent patterns.

**Q: How do I keep read and write models in sync?**
A: In synchronous CQRS, update both in the same transaction. In asynchronous CQRS, publish events after writes and have consumers rebuild the read model. Accept eventual consistency.

**Q: When should I avoid CQRS?**
A: Avoid CQRS for simple CRUD applications, small teams, or when read/write ratios are balanced. The added complexity is only justified when the two sides have fundamentally different scaling or modeling needs.
