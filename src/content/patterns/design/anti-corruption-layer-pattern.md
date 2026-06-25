---
contentType: patterns
slug: anti-corruption-layer-pattern
title: "Anti-Corruption Layer Pattern"
description: "Insert a translation layer between a bounded context and an external system to isolate domain models, prevent legacy constraints from leaking, and preserve semantic integrity."
metaDescription: "Learn the Anti-Corruption Layer Pattern for isolating domain models from legacy. Examples in Python, Java, and JavaScript with adapters and translators."
difficulty: intermediate
topics:
  - design
  - architecture
  - infrastructure
tags:
  - anti-corruption-layer
  - pattern
  - design-pattern
  - architecture
  - ddd
  - legacy
  - adapter
  - bounded-context
relatedResources:
  - /patterns/design/adapter-pattern
  - /patterns/design/facade-pattern
  - /patterns/design/strangler-fig-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Anti-Corruption Layer Pattern for isolating domain models from legacy. Examples in Python, Java, and JavaScript with adapters and translators."
  keywords:
    - anti corruption layer
    - design pattern
    - ddd
    - legacy
    - adapter
    - bounded context
---

# Anti-Corruption Layer Pattern

## Overview

The Anti-Corruption Layer (ACL) Pattern inserts a translation boundary between a bounded context and an external system — legacy, third-party, or foreign — to prevent incompatible domain models, naming conventions, and architectural constraints from leaking into the consuming context.

In Domain-Driven Design (DDD), each bounded context owns its own ubiquitous language and model. When integrating with a legacy system that uses different terminology (e.g., `Customer` vs `Client`, `Order` vs `Transaction`), direct coupling causes the foreign model to corrupt the local domain. The ACL acts as a protective membrane: it exposes a clean interface aligned with the local domain, then translates calls to and from the external system's API or data format.

## When to Use

Use the Anti-Corruption Layer Pattern when:
- Integrating with a legacy system that has a fundamentally different domain model
- Consuming a third-party API with incompatible naming, types, or semantics
- Building a new bounded context that must not be constrained by external data structures
- Migrating away from a legacy system incrementally (often paired with Strangler Fig)

## When to Avoid

- The external system shares the same ubiquitous language and model (direct integration is simpler)
- The translation layer would be trivial (one-to-one field mapping with no semantic shift)
- Performance overhead of translation is unacceptable in a latency-critical path
- The external system is temporary and will be replaced before the ACL pays for itself

## Solution

### Python

```python
from dataclasses import dataclass
from typing import Optional
from datetime import datetime

# ============================================================================
# DOMAIN MODEL (our bounded context)
# ============================================================================

@dataclass
class Customer:
    customer_id: str
    full_name: str
    email: str
    registered_at: datetime

@dataclass
class Order:
    order_id: str
    customer: Customer
    total_amount: float
    items: list

# ============================================================================
# LEGACY SYSTEM (foreign model we must integrate with)
# ============================================================================

class LegacyOrderSystem:
    """Simulates a legacy system with different terminology and structure"""
    def get_order_by_txn_id(self, txn_id: str) -> dict:
        # Returns legacy format: 'txn_id', 'cust_ref', 'cust_name', 'cust_email',
        # 'txn_date', 'line_items', 'gross_value'
        return {
            "txn_id": txn_id,
            "cust_ref": "C-8842",
            "cust_name": "Alice Johnson",
            "cust_email": "alice@example.com",
            "txn_date": "2024-03-15T09:30:00Z",
            "line_items": [
                {"sku": "SKU-001", "desc": "Widget", "qty": 2, "unit_price": 25.0}
            ],
            "gross_value": 50.0,
            "tax_rate": 0.08,
            "discount_code": "SPRING10"
        }

# ============================================================================
# ANTI-CORRUPTION LAYER
# ============================================================================

class OrderTranslator:
    """Translates between legacy format and our domain model"""
    @staticmethod
    def to_domain(legacy_data: dict) -> Order:
        customer = Customer(
            customer_id=legacy_data["cust_ref"],
            full_name=legacy_data["cust_name"],
            email=legacy_data["cust_email"],
            registered_at=datetime.fromisoformat(legacy_data["txn_date"].replace("Z", "+00:00"))
        )
        return Order(
            order_id=legacy_data["txn_id"],
            customer=customer,
            total_amount=legacy_data["gross_value"],
            items=legacy_data["line_items"]
        )

class OrderRepositoryACL:
    """ACL facade that exposes a clean domain interface over the legacy system"""
    def __init__(self, legacy_system: LegacyOrderSystem):
        self._legacy = legacy_system
        self._translator = OrderTranslator()

    def get_order(self, order_id: str) -> Optional[Order]:
        """Domain-aligned method name; caller knows nothing about 'txn_id'"""
        legacy_data = self._legacy.get_order_by_txn_id(order_id)
        if not legacy_data:
            return None
        return self._translator.to_domain(legacy_data)


# ============================================================================
# USAGE (domain code is isolated from legacy details)
# ============================================================================

legacy = LegacyOrderSystem()
order_repo = OrderRepositoryACL(legacy)

order = order_repo.get_order("TXN-12345")
print(f"Order {order.order_id} for {order.customer.full_name}")
print(f"Total: ${order.total_amount}")
```

### Java

```java
import java.time.Instant;
import java.util.*;

// Domain model
record Customer(String customerId, String fullName, String email, Instant registeredAt) {}
record OrderItem(String sku, String description, int quantity, double unitPrice) {}
record Order(String orderId, Customer customer, double totalAmount, List<OrderItem> items) {}

// Legacy system
class LegacyOrderSystem {
    public Map<String, Object> getOrderByTxnId(String txnId) {
        Map<String, Object> result = new HashMap<>();
        result.put("txn_id", txnId);
        result.put("cust_ref", "C-8842");
        result.put("cust_name", "Alice Johnson");
        result.put("cust_email", "alice@example.com");
        result.put("txn_date", "2024-03-15T09:30:00Z");
        result.put("gross_value", 50.0);

        List<Map<String, Object>> items = new ArrayList<>();
        Map<String, Object> item = new HashMap<>();
        item.put("sku", "SKU-001");
        item.put("desc", "Widget");
        item.put("qty", 2);
        item.put("unit_price", 25.0);
        items.add(item);
        result.put("line_items", items);

        return result;
    }
}

// ACL Translator
class OrderTranslator {
    @SuppressWarnings("unchecked")
    public Order toDomain(Map<String, Object> legacy) {
        Customer customer = new Customer(
            (String) legacy.get("cust_ref"),
            (String) legacy.get("cust_name"),
            (String) legacy.get("cust_email"),
            Instant.parse((String) legacy.get("txn_date"))
        );

        List<Map<String, Object>> legacyItems = (List<Map<String, Object>>) legacy.get("line_items");
        List<OrderItem> items = new ArrayList<>();
        for (Map<String, Object> li : legacyItems) {
            items.add(new OrderItem(
                (String) li.get("sku"),
                (String) li.get("desc"),
                (Integer) li.get("qty"),
                ((Number) li.get("unit_price")).doubleValue()
            ));
        }

        return new Order(
            (String) legacy.get("txn_id"),
            customer,
            ((Number) legacy.get("gross_value")).doubleValue(),
            items
        );
    }
}

// ACL Facade
class OrderRepositoryACL {
    private final LegacyOrderSystem legacy;
    private final OrderTranslator translator = new OrderTranslator();

    public OrderRepositoryACL(LegacyOrderSystem legacy) {
        this.legacy = legacy;
    }

    public Order getOrder(String orderId) {
        Map<String, Object> legacyData = legacy.getOrderByTxnId(orderId);
        return translator.toDomain(legacyData);
    }
}

// Usage
LegacyOrderSystem legacy = new LegacyOrderSystem();
OrderRepositoryACL repo = new OrderRepositoryACL(legacy);
Order order = repo.getOrder("TXN-12345");
System.out.println("Order " + order.orderId() + " for " + order.customer().fullName());
```

### JavaScript

```javascript
// Domain model
class Customer {
  constructor(customerId, fullName, email, registeredAt) {
    this.customerId = customerId;
    this.fullName = fullName;
    this.email = email;
    this.registeredAt = registeredAt;
  }
}

class Order {
  constructor(orderId, customer, totalAmount, items) {
    this.orderId = orderId;
    this.customer = customer;
    this.totalAmount = totalAmount;
    this.items = items;
  }
}

// Legacy system
class LegacyOrderSystem {
  getOrderByTxnId(txnId) {
    return {
      txn_id: txnId,
      cust_ref: 'C-8842',
      cust_name: 'Alice Johnson',
      cust_email: 'alice@example.com',
      txn_date: '2024-03-15T09:30:00Z',
      gross_value: 50.0,
      line_items: [
        { sku: 'SKU-001', desc: 'Widget', qty: 2, unit_price: 25.0 }
      ]
    };
  }
}

// ACL Translator
class OrderTranslator {
  toDomain(legacyData) {
    const customer = new Customer(
      legacyData.cust_ref,
      legacyData.cust_name,
      legacyData.cust_email,
      new Date(legacyData.txn_date)
    );

    const items = legacyData.line_items.map(li => ({
      sku: li.sku,
      description: li.desc,
      quantity: li.qty,
      unitPrice: li.unit_price
    }));

    return new Order(
      legacyData.txn_id,
      customer,
      legacyData.gross_value,
      items
    );
  }
}

// ACL Facade
class OrderRepositoryACL {
  constructor(legacySystem) {
    this.legacy = legacySystem;
    this.translator = new OrderTranslator();
  }

  getOrder(orderId) {
    const legacyData = this.legacy.getOrderByTxnId(orderId);
    return this.translator.toDomain(legacyData);
  }
}

// Usage
const legacy = new LegacyOrderSystem();
const repo = new OrderRepositoryACL(legacy);
const order = repo.getOrder('TXN-12345');
console.log(`Order ${order.orderId} for ${order.customer.fullName}`);
console.log(`Total: $${order.totalAmount}`);
```

## Explanation

The ACL has three responsibilities:

1. **Translation**: Convert data structures, field names, types, and value semantics between systems
2. **Interface adaptation**: Expose methods aligned with the local ubiquitous language (`getOrder` not `getOrderByTxnId`)
3. **Isolation**: Prevent changes in the legacy system from propagating into the domain model

The ACL is typically organized as a **facade** (the entry point) plus **translators/mappers** (data conversion logic). It may also handle **caching**, **circuit breaking**, and **logging** to further shield the domain.

## Variants

| Variant | Structure | Use Case |
|---------|-----------|----------|
| **Adapter ACL** | Single adapter class per external system | Simple one-to-one integration |
| **Repository ACL** | Repository facade + translator + data mapper | Data access boundary |
| **Service ACL** | Service layer with anti-corruption services | Complex business logic translation |
| **Event-driven ACL** | Event translator between message formats | Async event-based integration |
| **CQRS read ACL** | Separate read model translating to query DTOs | Reporting over legacy data |

## Best Practices

- **Keep the ACL thin.** Business logic belongs in the domain, not the translation layer.
- **Test translations independently.** Unit test translator classes with fixture data from both systems.
- **Version the ACL interface.** Changes to the legacy system should be absorbed by the ACL, not the domain.
- **Log translation failures.** Mismatched fields or type coercion issues should be observable.
- **Consider bidirectional translation.** If writes go to the legacy system, you need `to_legacy()` as well as `to_domain()`.

## Common Mistakes

- **Leaking legacy types into the domain.** The ACL should be the only place that knows about legacy structures.
- **Putting domain logic in the ACL.** Calculations, validations, and invariants belong in the domain layer.
- **Skipping tests for edge cases.** Null fields, unexpected enums, and format changes happen in legacy systems.
- **Tight coupling between ACL and domain.** The domain should depend on an interface, not the ACL implementation directly.
- **One giant ACL class.** Split by concern: `OrderACL`, `CustomerACL`, `InventoryACL`.

## Real-World Examples

### SAP Integration

Enterprise systems integrating with SAP often build ACLs because SAP uses German-centric field names, IDoc formats, and RFC/BAPI interfaces that bear no resemblance to the internal domain model.

### Payment Gateway Wrappers

Stripe, Adyen, and PayPal each have different webhook formats and API structures. A payment ACL normalizes them into a uniform `PaymentEvent` model that the domain processes regardless of provider.

### Microservice Boundaries

In a microservice architecture, each service is a bounded context. ACLs at service boundaries translate between the internal models of Team A (e.g., `UserProfile`) and Team B (e.g., `CustomerAccount`).

## Frequently Asked Questions

**Q: What is the difference between ACL and Adapter?**
A: Adapter makes two interfaces compatible. ACL additionally prevents semantic corruption — it isolates models and languages, not just method signatures.

**Q: Should the ACL handle retries and circuit breaking?**
A: Yes, resilience patterns are often co-located with the ACL because they shield the domain from external failures as well as model mismatches.

**Q: Is an ACL needed for REST API clients?**
A: If the API model matches your domain, a simple HTTP client suffices. If the API uses different terminology, types, or structures, an ACL adds value.

**Q: How does ACL relate to the Strangler Fig Pattern?**
A: Strangler Fig incrementally replaces a legacy system. The ACL is often the first component built, acting as the new system's interface to the legacy system being strangled.
