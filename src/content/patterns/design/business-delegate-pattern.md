---
contentType: patterns
slug: business-delegate-pattern
title: "Business Delegate Pattern"
description: "Reduce coupling between presentation and business tiers by introducing an intermediary that handles lookup, creation, and invocation of business services."
metaDescription: "Learn the Business Delegate Pattern for decoupling presentation from business tiers. Examples in Python, Java, and JavaScript with service lookup and caching."
difficulty: intermediate
topics:
  - design
  - architecture
tags:
  - business-delegate
  - pattern
  - design-pattern
  - behavioral
  - architecture
  - decoupling
  - layers
relatedResources:
  - /patterns/design/facade-pattern
  - /patterns/design/proxy-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Business Delegate Pattern for decoupling presentation from business tiers. Examples in Python, Java, and JavaScript with service lookup and caching."
  keywords:
    - business delegate
    - design pattern
    - architecture
    - decoupling
    - layers
---

# Business Delegate Pattern

## Overview

The Business Delegate Pattern reduces coupling between the presentation tier and the business services tier by introducing an intermediary layer. Instead of the presentation layer directly accessing business services (EJBs, remote APIs, or complex service objects), it uses a Business Delegate that handles service lookup, creation, and invocation.

This pattern is particularly valuable in enterprise applications where business services may be distributed, change frequently, or require complex initialization. The Business Delegate can also cache results, handle retries, and provide a simplified interface to the presentation layer.

## When to Use

Use the Business Delegate Pattern when:
- The presentation tier needs to access remote or distributed business services
- Business service lookup is complex or involves JNDI, service registries, or DI containers
- You want to cache business service references to avoid repeated lookups
- The business tier API is complex and you need a simplified facade for the presentation layer

## When to Avoid

- Simple monolithic applications where presentation and business tiers are not separated
- When a plain Facade or direct service injection suffices
- Overhead of an additional layer is not justified by the coupling reduction

## Solution

### Python

```python
from abc import ABC, abstractmethod
from typing import Optional, Dict

class OrderServiceInterface(ABC):
    @abstractmethod
    def create_order(self, customer_id: str, items: list) -> dict:
        pass

    @abstractmethod
    def get_order(self, order_id: str) -> dict:
        pass


class RemoteOrderService(OrderServiceInterface):
    """Simulated remote EJB or API service"""
    def create_order(self, customer_id: str, items: list) -> dict:
        # Simulate network call
        return {"order_id": "ORD-123", "status": "created", "items": items}

    def get_order(self, order_id: str) -> dict:
        return {"order_id": order_id, "status": "shipped"}


class ServiceLocator:
    """Central registry for service lookup"""
    _services: Dict[str, any] = {}

    @classmethod
    def register(cls, name: str, service: any):
        cls._services[name] = service

    @classmethod
    def lookup(cls, name: str) -> any:
        return cls._services.get(name)


class OrderBusinessDelegate:
    """Delegate that simplifies access to OrderService"""
    def __init__(self):
        self._service: Optional[OrderServiceInterface] = None

    def _get_service(self) -> OrderServiceInterface:
        if self._service is None:
            self._service = ServiceLocator.lookup("OrderService")
            if self._service is None:
                self._service = RemoteOrderService()
        return self._service

    def create_order(self, customer_id: str, items: list) -> dict:
        try:
            return self._get_service().create_order(customer_id, items)
        except Exception as e:
            # Handle remote exceptions, retry logic, etc.
            raise RuntimeError(f"Failed to create order: {e}")

    def get_order(self, order_id: str) -> dict:
        return self._get_service().get_order(order_id)


# Presentation layer (servlet/controller equivalent)
class OrderController:
    def __init__(self):
        self.delegate = OrderBusinessDelegate()

    def handle_create_order(self, customer_id: str, items: list):
        result = self.delegate.create_order(customer_id, items)
        return f"Order created: {result['order_id']}"


# Usage
ServiceLocator.register("OrderService", RemoteOrderService())
controller = OrderController()
print(controller.handle_create_order("CUST-001", ["item1", "item2"]))
```

### Java

```java
import java.util.*;

interface OrderService {
    Map<String, Object> createOrder(String customerId, List<String> items);
    Map<String, Object> getOrder(String orderId);
}

class RemoteOrderService implements OrderService {
    public Map<String, Object> createOrder(String customerId, List<String> items) {
        Map<String, Object> result = new HashMap<>();
        result.put("order_id", "ORD-123");
        result.put("status", "created");
        result.put("items", items);
        return result;
    }

    public Map<String, Object> getOrder(String orderId) {
        Map<String, Object> result = new HashMap<>();
        result.put("order_id", orderId);
        result.put("status", "shipped");
        return result;
    }
}

class ServiceLocator {
    private static final Map<String, Object> services = new HashMap<>();
    public static void register(String name, Object service) { services.put(name, service); }
    public static Object lookup(String name) { return services.get(name); }
}

class OrderBusinessDelegate {
    private OrderService service;

    private OrderService getService() {
        if (service == null) {
            service = (OrderService) ServiceLocator.lookup("OrderService");
            if (service == null) service = new RemoteOrderService();
        }
        return service;
    }

    public Map<String, Object> createOrder(String customerId, List<String> items) {
        try {
            return getService().createOrder(customerId, items);
        } catch (Exception e) {
            throw new RuntimeException("Failed to create order: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> getOrder(String orderId) {
        return getService().getOrder(orderId);
    }
}

class OrderController {
    private final OrderBusinessDelegate delegate = new OrderBusinessDelegate();

    public String handleCreateOrder(String customerId, List<String> items) {
        Map<String, Object> result = delegate.createOrder(customerId, items);
        return "Order created: " + result.get("order_id");
    }
}

// Usage
ServiceLocator.register("OrderService", new RemoteOrderService());
OrderController controller = new OrderController();
System.out.println(controller.handleCreateOrder("CUST-001", List.of("item1", "item2")));
```

### JavaScript

```javascript
class RemoteOrderService {
  createOrder(customerId, items) {
    return { order_id: 'ORD-123', status: 'created', items };
  }

  getOrder(orderId) {
    return { order_id: orderId, status: 'shipped' };
  }
}

class ServiceLocator {
  static services = new Map();
  static register(name, service) { this.services.set(name, service); }
  static lookup(name) { return this.services.get(name); }
}

class OrderBusinessDelegate {
  constructor() {
    this.service = null;
  }

  getService() {
    if (!this.service) {
      this.service = ServiceLocator.lookup('OrderService') || new RemoteOrderService();
    }
    return this.service;
  }

  createOrder(customerId, items) {
    try {
      return this.getService().createOrder(customerId, items);
    } catch (e) {
      throw new Error(`Failed to create order: ${e.message}`);
    }
  }

  getOrder(orderId) {
    return this.getService().getOrder(orderId);
  }
}

class OrderController {
  constructor() {
    this.delegate = new OrderBusinessDelegate();
  }

  handleCreateOrder(customerId, items) {
    const result = this.delegate.createOrder(customerId, items);
    return `Order created: ${result.order_id}`;
  }
}

// Usage
ServiceLocator.register('OrderService', new RemoteOrderService());
const controller = new OrderController();
console.log(controller.handleCreateOrder('CUST-001', ['item1', 'item2']));
```

## Explanation

The Business Delegate acts as a proxy and adapter between the presentation tier and the business services:

- **Presentation Tier**: Uses the simple Business Delegate interface
- **Business Delegate**: Handles service lookup, caching, exception translation, and retry logic
- **Service Locator**: Provides a central registry for finding business services
- **Business Service**: The actual remote or complex service implementation

This layered approach means the presentation code never directly references remote interfaces, JNDI, or service-specific exceptions.

## Variants

| Variant | Additional Feature | Use Case |
|---------|-------------------|----------|
| **Basic** | Simple lookup and delegation | Standard enterprise apps |
| **Caching** | Caches service references | High-throughput systems |
| **Retry** | Automatic retry on failure | Unreliable remote services |
| **Async** | Asynchronous invocation | Non-blocking presentation |

## What Works

- **Cache service references.** Avoid repeated JNDI or registry lookups.
- **Translate exceptions.** Convert remote/service exceptions into presentation-friendly errors.
- **Keep the delegate thin.** Business logic belongs in the service, not the delegate.
- **Use with Service Locator or DI.** The delegate should not hard-code service creation.
- **Implement retries for remote calls.** Network failures should be handled gracefully.

## Common Mistakes

- **Putting business logic in the delegate.** The delegate should only route and simplify.
- **Not caching service references.** Repeated lookups are expensive.
- **Exposing remote exceptions to the presentation layer.** Always translate to domain exceptions.
- **Tight coupling to a specific service implementation.** Use interfaces and factories.
- **Overusing for local services.** Direct injection is simpler when services are in-process.

## Real-World Examples

### Java EE / Jakarta EE

Business Delegate was a core J2EE pattern. Session beans were accessed via delegates to hide EJB complexity from servlets and JSPs.

### Spring Framework

While Spring's dependency injection reduces the need for manual delegates, `@Service` layers with `@Transactional` often act as business delegates between controllers and repositories.

### Microservice Gateways

API gateways in microservice architectures often implement Business Delegate logic, aggregating multiple backend services into a single client-facing interface.

## Frequently Asked Questions

**Q: What is the difference between Business Delegate and Facade?**
A: A Facade simplifies a complex subsystem interface. A Business Delegate specifically mediates between presentation and remote/distributed business services.

**Q: How does Business Delegate relate to Service Locator?**
A: The delegate often uses Service Locator to find the actual business service. They are complementary patterns.

**Q: Is Business Delegate still relevant with modern DI frameworks?**
A: The need for manual delegates has diminished with Spring and CDI, but the concept lives on in service layers, BFFs, and API gateways.
