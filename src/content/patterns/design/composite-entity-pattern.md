---
contentType: patterns
slug: composite-entity-pattern
title: "Composite Entity Pattern"
description: "Map a coarse-grained entity to multiple database tables by composing dependent objects, reducing the number of fine-grained remote calls in EJB and distributed systems."
metaDescription: "Learn the Composite Entity Pattern for coarse-grained persistence. Examples in Python, Java, and JavaScript with composed dependent objects and table mapping."
difficulty: intermediate
topics:
  - design
  - databases
tags:
  - composite-entity
  - pattern
  - design-pattern
  - structural
  - databases
  - persistence
  - orm
relatedResources:
  - /patterns/design/data-mapper-pattern
  - /patterns/design/active-record-pattern
  - /patterns/design/unit-of-work-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Composite Entity Pattern for coarse-grained persistence. Examples in Python, Java, and JavaScript with composed dependent objects and table mapping."
  keywords:
    - composite entity
    - design pattern
    - databases
    - persistence
    - orm
---

# Composite Entity Pattern

## Overview

The Composite Entity Pattern maps a coarse-grained entity object to multiple fine-grained database tables by composing dependent objects. Rather than exposing individual dependent objects through separate remote interfaces, the composite entity aggregates them into a single object that can be loaded, modified, and persisted in one operation.

This pattern was originally designed for EJB 2.x entity beans to reduce the number of fine-grained remote calls. In modern applications, it remains useful for ORM mapping where an aggregate root (like an Order) contains multiple dependent value objects (line items, shipping address, payment details) that do not exist independently.

## When to Use

Use the Composite Entity Pattern when:
- An aggregate root contains multiple dependent objects that should be persisted together
- You need coarse-grained objects to reduce remote call overhead
- Dependent objects have no meaning outside their parent entity
- You want to maintain referential integrity across related tables

## When to Avoid

- Dependent objects are shared across multiple parent entities
- Independent CRUD operations are needed on child objects
- The object graph is deeply nested and causes memory/performance issues
- Microservice boundaries would be violated by coarse-grained aggregates

## Solution

### Python

```python
from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class LineItem:
    product_id: str
    quantity: int
    unit_price: float

    @property
    def total(self) -> float:
        return self.quantity * self.unit_price

@dataclass
class ShippingAddress:
    street: str
    city: str
    country: str
    postal_code: str

@dataclass
class PaymentDetails:
    method: str
    transaction_id: str
    amount: float

@dataclass
class Order:
    order_id: Optional[str] = None
    customer_id: str = ""
    line_items: List[LineItem] = field(default_factory=list)
    shipping_address: Optional[ShippingAddress] = None
    payment: Optional[PaymentDetails] = None

    @property
    def total(self) -> float:
        return sum(item.total for item in self.line_items)


class OrderMapper:
    """Composite entity mapper loading from multiple tables"""
    def __init__(self, conn):
        self._conn = conn

    def find_by_id(self, order_id: str) -> Optional[Order]:
        # Load parent order
        row = self._conn.execute(
            "SELECT order_id, customer_id FROM orders WHERE order_id = ?",
            (order_id,)
        ).fetchone()
        if not row:
            return None

        order = Order(order_id=row["order_id"], customer_id=row["customer_id"])

        # Load dependent line items
        for item_row in self._conn.execute(
            "SELECT product_id, quantity, unit_price FROM line_items WHERE order_id = ?",
            (order_id,)
        ):
            order.line_items.append(LineItem(
                product_id=item_row["product_id"],
                quantity=item_row["quantity"],
                unit_price=item_row["unit_price"]
            ))

        # Load shipping address
        addr_row = self._conn.execute(
            "SELECT street, city, country, postal_code FROM shipping_addresses WHERE order_id = ?",
            (order_id,)
        ).fetchone()
        if addr_row:
            order.shipping_address = ShippingAddress(
                street=addr_row["street"],
                city=addr_row["city"],
                country=addr_row["country"],
                postal_code=addr_row["postal_code"]
            )

        return order

    def save(self, order: Order):
        # Save parent
        self._conn.execute(
            "INSERT OR REPLACE INTO orders (order_id, customer_id) VALUES (?, ?)",
            (order.order_id, order.customer_id)
        )

        # Delete old line items, re-insert
        self._conn.execute("DELETE FROM line_items WHERE order_id = ?", (order.order_id,))
        for item in order.line_items:
            self._conn.execute(
                "INSERT INTO line_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
                (order.order_id, item.product_id, item.quantity, item.unit_price)
            )

        # Save shipping address
        if order.shipping_address:
            self._conn.execute(
                """INSERT OR REPLACE INTO shipping_addresses
                   (order_id, street, city, country, postal_code)
                   VALUES (?, ?, ?, ?, ?)""",
                (order.order_id, order.shipping_address.street,
                 order.shipping_address.city, order.shipping_address.country,
                 order.shipping_address.postal_code)
            )

        self._conn.commit()


# Usage
import sqlite3
conn = sqlite3.connect(":memory:")
conn.row_factory = sqlite3.Row
conn.execute("CREATE TABLE orders (order_id TEXT PRIMARY KEY, customer_id TEXT)")
conn.execute("""CREATE TABLE line_items (
    order_id TEXT, product_id TEXT, quantity INTEGER, unit_price REAL
)""")
conn.execute("""CREATE TABLE shipping_addresses (
    order_id TEXT PRIMARY KEY, street TEXT, city TEXT, country TEXT, postal_code TEXT
)""")

mapper = OrderMapper(conn)
order = Order(
    order_id="ORD-001",
    customer_id="CUST-001",
    line_items=[
        LineItem("PROD-1", 2, 29.99),
        LineItem("PROD-2", 1, 49.99),
    ],
    shipping_address=ShippingAddress("123 Main St", "Springfield", "USA", "62701")
)

mapper.save(order)
loaded = mapper.find_by_id("ORD-001")
print(f"Order total: ${loaded.total:.2f}")
```

### Java

```java
import java.sql.*;
import java.util.*;

public class LineItem {
    private final String productId;
    private final int quantity;
    private final double unitPrice;

    public LineItem(String productId, int quantity, double unitPrice) {
        this.productId = productId; this.quantity = quantity; this.unitPrice = unitPrice;
    }
    public double getTotal() { return quantity * unitPrice; }
    public String getProductId() { return productId; }
    public int getQuantity() { return quantity; }
    public double getUnitPrice() { return unitPrice; }
}

public class ShippingAddress {
    private final String street, city, country, postalCode;
    public ShippingAddress(String street, String city, String country, String postalCode) {
        this.street = street; this.city = city; this.country = country; this.postalCode = postalCode;
    }
    public String getStreet() { return street; }
    public String getCity() { return city; }
    public String getCountry() { return country; }
    public String getPostalCode() { return postalCode; }
}

public class Order {
    private final String orderId;
    private final String customerId;
    private final List<LineItem> lineItems = new ArrayList<>();
    private ShippingAddress shippingAddress;

    public Order(String orderId, String customerId) {
        this.orderId = orderId; this.customerId = customerId;
    }
    public String getOrderId() { return orderId; }
    public String getCustomerId() { return customerId; }
    public List<LineItem> getLineItems() { return lineItems; }
    public ShippingAddress getShippingAddress() { return shippingAddress; }
    public void setShippingAddress(ShippingAddress addr) { this.shippingAddress = addr; }
    public double getTotal() { return lineItems.stream().mapToDouble(LineItem::getTotal).sum(); }
}

class OrderMapper {
    private final Connection conn;
    public OrderMapper(Connection conn) { this.conn = conn; }

    public Order findById(String orderId) throws SQLException {
        try (PreparedStatement stmt = conn.prepareStatement(
                "SELECT customer_id FROM orders WHERE order_id = ?")) {
            stmt.setString(1, orderId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (!rs.next()) return null;
                Order order = new Order(orderId, rs.getString("customer_id"));

                // Load line items
                try (PreparedStatement itemStmt = conn.prepareStatement(
                        "SELECT product_id, quantity, unit_price FROM line_items WHERE order_id = ?")) {
                    itemStmt.setString(1, orderId);
                    try (ResultSet items = itemStmt.executeQuery()) {
                        while (items.next()) {
                            order.getLineItems().add(new LineItem(
                                items.getString("product_id"),
                                items.getInt("quantity"),
                                items.getDouble("unit_price")
                            ));
                        }
                    }
                }

                // Load shipping
                try (PreparedStatement addrStmt = conn.prepareStatement(
                        "SELECT street, city, country, postal_code FROM shipping_addresses WHERE order_id = ?")) {
                    addrStmt.setString(1, orderId);
                    try (ResultSet addr = addrStmt.executeQuery()) {
                        if (addr.next()) {
                            order.setShippingAddress(new ShippingAddress(
                                addr.getString("street"), addr.getString("city"),
                                addr.getString("country"), addr.getString("postal_code")
                            ));
                        }
                    }
                }
                return order;
            }
        }
    }
}

// Usage
Connection conn = DriverManager.getConnection("jdbc:sqlite::memory:");
conn.createStatement().execute("CREATE TABLE orders (order_id TEXT PRIMARY KEY, customer_id TEXT)");
conn.createStatement().execute("CREATE TABLE line_items (order_id TEXT, product_id TEXT, quantity INTEGER, unit_price REAL)");
conn.createStatement().execute("CREATE TABLE shipping_addresses (order_id TEXT PRIMARY KEY, street TEXT, city TEXT, country TEXT, postal_code TEXT)");

OrderMapper mapper = new OrderMapper(conn);
// Save and load order...
```

### JavaScript

```javascript
class LineItem {
  constructor(productId, quantity, unitPrice) {
    this.productId = productId;
    this.quantity = quantity;
    this.unitPrice = unitPrice;
  }

  get total() {
    return this.quantity * this.unitPrice;
  }
}

class ShippingAddress {
  constructor(street, city, country, postalCode) {
    this.street = street;
    this.city = city;
    this.country = country;
    this.postalCode = postalCode;
  }
}

class Order {
  constructor(orderId, customerId) {
    this.orderId = orderId;
    this.customerId = customerId;
    this.lineItems = [];
    this.shippingAddress = null;
  }

  get total() {
    return this.lineItems.reduce((sum, item) => sum + item.total, 0);
  }
}

class OrderMapper {
  constructor(db) {
    this.db = db;
  }

  async findById(orderId) {
    const row = await this.db.get('SELECT customer_id FROM orders WHERE order_id = ?', orderId);
    if (!row) return null;

    const order = new Order(orderId, row.customer_id);

    const items = await this.db.all('SELECT product_id, quantity, unit_price FROM line_items WHERE order_id = ?', orderId);
    for (const item of items) {
      order.lineItems.push(new LineItem(item.product_id, item.quantity, item.unit_price));
    }

    const addr = await this.db.get('SELECT street, city, country, postal_code FROM shipping_addresses WHERE order_id = ?', orderId);
    if (addr) {
      order.shippingAddress = new ShippingAddress(addr.street, addr.city, addr.country, addr.postal_code);
    }

    return order;
  }
}

// Usage
// const mapper = new OrderMapper(db);
// const order = await mapper.findById('ORD-001');
// console.log(order.total);
```

## Explanation

The Composite Entity Pattern treats a group of related objects as a single persistence unit:

- **Composite Entity (Order)**: The aggregate root containing dependent objects
- **Dependent Objects (LineItem, ShippingAddress)**: Objects that only exist within the parent
- **Mapper**: Coordinates loading and saving across multiple tables

The key insight is that dependent objects have no standalone identity. They are part of the composite and are persisted, loaded, and deleted as a unit.

## Variants

| Variant | Mapping Strategy | Use Case |
|---------|-----------------|----------|
| **Table per class** | Each dependent has its own table | Complex queries on child data |
| **Single table** | All data in one denormalized table | Simple reads, no joins needed |
| **JSON column** | Dependents stored as JSON | Flexible schema, document databases |
| **Embedded value** | Flattened into parent columns | Simple value objects |

## What Works

- **Make dependent objects immutable.** Changes should go through the aggregate root.
- **Enforce invariants at the aggregate level.** The composite entity validates the whole.
- **Use cascading persistence.** Saving the parent saves all children automatically.
- **Avoid deep nesting.** More than 2-3 levels of composition becomes hard to manage.
- **Consider JSON columns for flexibility.** Modern databases support structured data types.

## Common Mistakes

- **Exposing dependent objects directly.** Clients should interact with the aggregate root.
- **Allowing standalone persistence of dependents.** This breaks the composite boundary.
- **Loading the entire graph for simple queries.** Use projections for read-only scenarios.
- **Sharing dependent objects between parents.** Each composite should own its children.
- **Ignoring orphan deletion.** Removed dependents should be deleted from the database.

## Real-World Examples

### JPA @Embeddable

JPA's `@Embeddable` annotation marks dependent objects that are stored within their parent's table. `@Embedded` composes them into the entity.

### DDD Aggregate Roots

Domain-Driven Design uses Aggregate Roots (like Order) that encapsulate entities and value objects with transactional consistency boundaries.

### MongoDB Embedded Documents

MongoDB naturally supports composite entities by embedding related documents, making it well-suited for aggregate-heavy domains.

## Frequently Asked Questions

**Q: What is the difference between Composite Entity and Composite Pattern?**
A: Composite Pattern (GoF) is about tree structures where leaf and composite nodes share the same interface. Composite Entity is about persistence mapping of aggregate objects.

**Q: Can dependent objects have their own IDs?**
A: Yes, but they should not be globally unique. Their identity is local to the parent (e.g., line item number within an order).

**Q: Should I always cascade deletes?**
A: Yes, for true dependent objects. If a child might outlive the parent, it is not a dependent and should be modeled as an independent entity.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
