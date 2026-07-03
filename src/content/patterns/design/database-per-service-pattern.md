---
contentType: patterns
slug: database-per-service-pattern
title: "Database per Service Pattern"
description: "Give each microservice its own private database to ensure loose coupling, independent deployment, and technology heterogeneity across the application portfolio."
metaDescription: "Learn the Database per Service Pattern for microservice data isolation. Examples in Python, Java, and JavaScript with per-service schemas and event sync."
difficulty: intermediate
topics:
  - design
  - architecture
  - databases
tags:
  - database-per-service
  - pattern
  - design-pattern
  - microservices
  - databases
  - isolation
  - data-ownership
relatedResources:
  - /patterns/design/saga-pattern
  - /patterns/design/event-sourcing-pattern
  - /patterns/design/cqrs-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Database per Service Pattern for microservice data isolation. Examples in Python, Java, and JavaScript with per-service schemas and event sync."
  keywords:
    - database per service
    - microservices
    - data isolation
    - design pattern
    - saga
    - event sourcing
---

# Database per Service Pattern

## Overview

The Database per Service Pattern gives each microservice its own private database that no other service can access directly. This ensures that services are loosely coupled, can be deployed independently, and can choose the database technology best suited to their needs. A service's data is accessed only through its API, creating a clear boundary and single source of truth for that domain.

In a monolith, multiple modules share a single database, creating tight coupling: schema changes require coordination across teams, one module's heavy query affects others, and scaling requires scaling the entire database. With Database per Service, each team owns its schema, can optimize independently, and deploys without fear of breaking other services.

The tradeoff is complexity: querying across services requires API composition or event-based synchronization, and transactions spanning multiple databases need patterns like Saga.

## When to Use

Use the Database per Service Pattern when:
- Building microservices where teams need independent deployment velocity
- Different services have fundamentally different data access patterns (OLTP vs analytics)
- Services need different database technologies (graph, document, relational)
- You want to prevent accidental coupling through shared database schemas

## When to Avoid

- The application is a monolith or small enough that a single database suffices
- The overhead of managing multiple databases exceeds the independence benefit
- Complex cross-service queries are frequent and API composition is too slow
- Strong consistency across services is required and eventual consistency is unacceptable

## Solution

### Python (Per-Service Databases with Event Sync)

```python
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional
import sqlite3
import json

# ============================================================================
# ORDER SERVICE DATABASE
# ============================================================================

class OrderDatabase:
    """Private database for the Order Service"""
    def __init__(self, db_path: str = "order_service.db"):
        self.conn = sqlite3.connect(db_path)
        self._init_schema()

    def _init_schema(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                order_id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                total_amount REAL NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS order_events (
                event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                payload TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.conn.commit()

    def create_order(self, order_id: str, customer_id: str, total: float) -> dict:
        self.conn.execute(
            "INSERT INTO orders (order_id, customer_id, total_amount) VALUES (?, ?, ?)",
            (order_id, customer_id, total)
        )
        self._emit_event("ORDER_CREATED", {
            "order_id": order_id,
            "customer_id": customer_id,
            "total": total
        })
        self.conn.commit()
        return {"order_id": order_id, "status": "pending"}

    def _emit_event(self, event_type: str, payload: dict):
        """Publish event to local outbox for downstream consumers"""
        self.conn.execute(
            "INSERT INTO order_events (order_id, event_type, payload) VALUES (?, ?, ?)",
            (payload["order_id"], event_type, json.dumps(payload))
        )

    def get_order(self, order_id: str) -> Optional[dict]:
        cursor = self.conn.execute(
            "SELECT * FROM orders WHERE order_id = ?", (order_id,)
        )
        row = cursor.fetchone()
        if row:
            return {
                "order_id": row[0], "customer_id": row[1],
                "total_amount": row[2], "status": row[3]
            }
        return None


# ============================================================================
# CUSTOMER SERVICE DATABASE
# ============================================================================

class CustomerDatabase:
    """Private database for the Customer Service"""
    def __init__(self, db_path: str = "customer_service.db"):
        self.conn = sqlite3.connect(db_path)
        self._init_schema()

    def _init_schema(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                customer_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                loyalty_points INTEGER DEFAULT 0
            )
        """)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS customer_events (
                event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                payload TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.conn.commit()

    def create_customer(self, customer_id: str, name: str, email: str):
        self.conn.execute(
            "INSERT INTO customers (customer_id, name, email) VALUES (?, ?, ?)",
            (customer_id, name, email)
        )
        self.conn.commit()

    def add_loyalty_points(self, customer_id: str, points: int):
        self.conn.execute(
            "UPDATE customers SET loyalty_points = loyalty_points + ? WHERE customer_id = ?",
            (points, customer_id)
        )
        self.conn.commit()

    def get_customer(self, customer_id: str) -> Optional[dict]:
        cursor = self.conn.execute(
            "SELECT * FROM customers WHERE customer_id = ?", (customer_id,)
        )
        row = cursor.fetchone()
        if row:
            return {"customer_id": row[0], "name": row[1], "email": row[2], "loyalty_points": row[3]}
        return None


# ============================================================================
# EVENT BUS (simulating message broker for cross-service sync)
# ============================================================================

class EventBus:
    """Simplified event bus for inter-service communication"""
    def __init__(self):
        self.subscribers = {}

    def subscribe(self, event_type: str, handler):
        self.subscribers.setdefault(event_type, []).append(handler)

    def publish(self, event_type: str, payload: dict):
        for handler in self.subscribers.get(event_type, []):
            handler(payload)


# ============================================================================
# SERVICE LAYER
# ============================================================================

class OrderService:
    """Encapsulates order business logic and private database"""
    def __init__(self, database: OrderDatabase, event_bus: EventBus):
        self.db = database
        self.events = event_bus

    def place_order(self, order_id: str, customer_id: str, items: List[dict]) -> dict:
        total = sum(item["price"] * item["quantity"] for item in items)
        result = self.db.create_order(order_id, customer_id, total)
        return result

    def get_order(self, order_id: str) -> Optional[dict]:
        return self.db.get_order(order_id)


class CustomerService:
    """Encapsulates customer business logic and private database"""
    def __init__(self, database: CustomerDatabase, event_bus: EventBus):
        self.db = database
        self.events = event_bus
        self._subscribe_to_events()

    def _subscribe_to_events(self):
        self.events.subscribe("ORDER_CREATED", self._on_order_created)

    def _on_order_created(self, payload: dict):
        """React to orders by updating loyalty points"""
        points = int(payload["total"] * 0.1)  # 10% of order value
        self.db.add_loyalty_points(payload["customer_id"], points)
        print(f"Added {points} loyalty points to customer {payload['customer_id']}")

    def register_customer(self, customer_id: str, name: str, email: str):
        self.db.create_customer(customer_id, name, email)

    def get_customer(self, customer_id: str) -> Optional[dict]:
        return self.db.get_customer(customer_id)


# ============================================================================
# USAGE: Services communicate via events, not shared database
# ============================================================================

bus = EventBus()
order_service = OrderService(OrderDatabase(), bus)
customer_service = CustomerService(CustomerDatabase(), bus)

# Register a customer
customer_service.register_customer("C-001", "Alice Johnson", "alice@example.com")

# Place an order (triggers loyalty point update via event)
order_service.place_order("ORD-001", "C-001", [
    {"sku": "A1", "price": 50.0, "quantity": 2}
])

# Verify data in respective databases
print("Order:", order_service.get_order("ORD-001"))
print("Customer:", customer_service.get_customer("C-001"))
```

### Java (Spring Boot with Separate DataSources)

```java
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.JpaRepository;
import javax.persistence.*;
import javax.sql.DataSource;

// Order Service Configuration
@Configuration
public class OrderDatabaseConfig {
    @Bean
    @ConfigurationProperties("app.datasource.order")
    public DataSourceProperties orderDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    public DataSource orderDataSource() {
        return orderDataSourceProperties()
            .initializeDataSourceBuilder()
            .build();
    }
}

// Order Entity (in Order Service database)
@Entity
@Table(name = "orders")
class Order {
    @Id
    private String orderId;
    private String customerId;
    private double totalAmount;
    private String status = "pending";

    // getters, setters
}

interface OrderRepository extends JpaRepository<Order, String> {}

// Customer Service (separate service, separate database)
@Entity
@Table(name = "customers")
class Customer {
    @Id
    private String customerId;
    private String name;
    private String email;
    private int loyaltyPoints = 0;

    public void addLoyaltyPoints(int points) {
        this.loyaltyPoints += points;
    }

    // getters, setters
}

interface CustomerRepository extends JpaRepository<Customer, String> {}

// Event-driven sync
record OrderCreatedEvent(String orderId, String customerId, double total) {}

@Service
class CustomerEventHandler {
    private final CustomerRepository customerRepo;

    public CustomerEventHandler(CustomerRepository customerRepo) {
        this.customerRepo = customerRepo;
    }

    @EventListener
    @Transactional
    public void onOrderCreated(OrderCreatedEvent event) {
        Customer customer = customerRepo.findById(event.customerId())
            .orElseThrow();
        int points = (int) (event.total() * 0.1);
        customer.addLoyaltyPoints(points);
        customerRepo.save(customer);
    }
}
```

### JavaScript (Node.js with Separate MongoDB Collections)

```javascript
const { MongoClient } = require('mongodb');

class DatabasePerService {
  constructor(uri) {
    this.client = new MongoClient(uri);
  }

  async connect() {
    await this.client.connect();
    // Each service gets its own database
    this.orderDb = this.client.db('order_service');
    this.customerDb = this.client.db('customer_service');
    this.inventoryDb = this.client.db('inventory_service');
  }

  // Order Service methods
  async createOrder(orderId, customerId, items) {
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const orders = this.orderDb.collection('orders');
    await orders.insertOne({
      orderId, customerId, total, status: 'pending',
      createdAt: new Date()
    });
    return { orderId, status: 'pending' };
  }

  async getOrder(orderId) {
    return this.orderDb.collection('orders').findOne({ orderId });
  }

  // Customer Service methods
  async createCustomer(customerId, name, email) {
    await this.customerDb.collection('customers').insertOne({
      customerId, name, email, loyaltyPoints: 0
    });
  }

  async addLoyaltyPoints(customerId, points) {
    await this.customerDb.collection('customers').updateOne(
      { customerId },
      { $inc: { loyaltyPoints: points } }
    );
  }

  // Inventory Service methods
  async reserveInventory(orderId, sku, qty) {
    const inventory = this.inventoryDb.collection('inventory');
    const result = await inventory.updateOne(
      { sku, available: { $gte: qty } },
      { $inc: { available: -qty, reserved: qty } }
    );
    return result.modifiedCount > 0;
  }
}

// Event bus for cross-service communication
class EventBus {
  constructor() {
    this.handlers = new Map();
  }

  on(event, handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event).push(handler);
  }

  emit(event, payload) {
    (this.handlers.get(event) || []).forEach(h => h(payload));
  }
}

// Usage
async function demo() {
  const db = new DatabasePerService('mongodb://localhost:27017');
  await db.connect();

  const bus = new EventBus();

  // Subscribe customer service to order events
  bus.on('ORDER_CREATED', async (payload) => {
    const points = Math.floor(payload.total * 0.1);
    await db.addLoyaltyPoints(payload.customerId, points);
    console.log(`Added ${points} points to ${payload.customerId}`);
  });

  // Create customer
  await db.createCustomer('C-001', 'Alice', 'alice@example.com');

  // Create order + emit event
  const order = await db.createOrder('ORD-001', 'C-001', [
    { sku: 'A1', price: 50, qty: 2 }
  ]);
  bus.emit('ORDER_CREATED', { orderId: 'ORD-001', customerId: 'C-001', total: 100 });

  console.log('Order:', await db.getOrder('ORD-001'));
}

demo().catch(console.error);
```

## Explanation

Database per Service enforces boundaries through physical isolation:

1. **Private schema**: Each service owns its tables/collections and can change them independently
2. **API-only access**: Other services interact through HTTP/gRPC/Events, not SQL queries
3. **Technology choice**: One service uses PostgreSQL, another uses MongoDB, another uses Redis — whatever fits best
4. **Event synchronization**: Data that needs to be shared is published as events that other services consume into their own databases

## Variants

| Variant | Isolation Level | Use Case |
|---------|----------------|----------|
| **Separate database servers** | Full physical isolation | Maximum independence, different technologies |
| **Separate schemas** | Logical isolation within one server | Same tech, reduced operational overhead |
| **Separate collections/tables** | Minimal isolation | Migration phase from monolith |
| **Schema per tenant + service** | Multi-tenant microservices | SaaS applications with per-tenant data |

## What Works

- **Never expose your database directly.** Always access other services through their APIs or events.
- **Use an outbox pattern for events.** Publish events atomically with database transactions.
- **Adopt eventual consistency.** Cross-service data will be temporarily inconsistent; design for it.
- **Implement sagas for multi-service transactions.** Compensating transactions handle failures across services.
- **Keep service databases small.** If a service's database grows too large, consider splitting the service.

## Common Mistakes

- **Direct database access between services.** This creates the same coupling the pattern is designed to prevent.
- **Sharing a database "temporarily."** Temporary shared databases become permanent and defeat the purpose.
- **Not handling eventual consistency.** Users see stale data because the UI assumes immediate consistency.
- **Overly chatty APIs.** Making 10 API calls to compose a page is a sign of poor service boundaries.
- **Ignoring data duplication.** Some data duplication across services is normal and necessary.

## Real-World Examples

### Amazon

Amazon's architecture famously uses database per service. The order service, customer service, and inventory service each have their own data stores, synchronized via events. This allows each team to innovate independently.

### Netflix

Netflix uses Cassandra for some services, Elasticsearch for others, and S3 for yet others. Each service team chooses the technology that best fits their access patterns and scaling needs.

### Uber

Uber migrated from a monolithic Postgres database to microservices with separate databases. The trip service, payment service, and driver service each have dedicated data stores, with change data capture (CDC) streaming events between them.

## Frequently Asked Questions

**Q: How do I query across multiple services?**
A: Use API composition (call multiple services and aggregate) or build a read model via event consumption. CQRS and materialized views are common solutions.

**Q: What about reporting and analytics?**
A: Extract data from services into a data warehouse or lake via ETL/CDC. Services publish change events that are consumed by analytics pipelines.

**Q: Does every service need a different database technology?**
A: No. Many organizations standardize on one or two technologies to reduce operational complexity. The pattern is about ownership, not heterogeneity.

**Q: How do I handle foreign key relationships across services?**
A: You don't. Services reference other services by ID only, without database-level constraints. Consistency is enforced at the application level via sagas or events.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
