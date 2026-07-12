---




contentType: patterns
slug: modular-monolith-pattern
title: "Modular Monolith: Single Deployable with Module Boundaries"
description: "How to build a modular monolith with strict internal module boundaries. Covers module isolation, shared kernel, inter-module communication, and migration to microservices."
metaDescription: "Build a modular monolith with strict internal module boundaries. Learn module isolation, shared kernel, inter-module communication, and migration to microservices."
difficulty: intermediate
topics:
  - architecture
tags:
  - architecture
  - monolith
  - modules
  - boundaries
  - pattern
category: architectural
relatedResources:
  - /patterns/strangler-fig-pattern
  - /patterns/anti-corruption-layer-pattern
  - /patterns/backends-for-frontends-pattern
  - /patterns/ambassador-pattern
  - /patterns/sidecar-pattern
  - /guides/complete-guide-modular-monolith
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build a modular monolith with strict internal module boundaries. Learn module isolation, shared kernel, inter-module communication, and migration to microservices."
  keywords:
    - architecture
    - monolith
    - modules
    - boundaries
    - pattern




---

## Overview

A modular monolith is a single deployable application with strict internal module boundaries. Each module owns its data, exposes a clear API, and communicates with other modules only through well-defined contracts. Unlike a traditional monolith where code is tangled across layers, a modular monolith enforces isolation: modules can't access each other's database tables or internal classes. This gives you the simplicity of a single deployment (one build, one database, one process) with the organizational benefits of microservices (team ownership, independent modules, clear contracts). When the time comes, modules can be extracted into separate microservices with minimal refactoring.

## When to Use

- Small to medium teams that want clean architecture without operational overhead
- Startups that need to move fast but plan for future microservices extraction
- Applications where deployment simplicity matters more than independent scaling
- Domains that can be clearly partitioned into bounded contexts
- Teams transitioning from monolith to microservices gradually

## When NOT to Use

- Applications requiring independent scaling of different components
- Teams large enough that a single codebase creates merge conflicts
- Systems where different modules have very different availability requirements
- Real-time systems where cross-module latency must be sub-millisecond

## Solution

### Module structure (Python)

```python
# order_module/__init__.py — Order module public API
from order_module.services import OrderService
from order_module.api import OrderAPI

__all__ = ["OrderService", "OrderAPI"]

# The module only exposes what's in __all__
# Internal classes are not importable from outside
```

```python
# order_module/services.py — Order module internal implementation
from order_module.models import Order, OrderItem
from order_module.repository import OrderRepository
from shared_kernel.events import DomainEvent
from shared_kernel.ids import OrderId, CustomerId
from typing import Optional, List

class OrderService:
    """Internal service — not part of the module's public API."""

    def __init__(self, repo: OrderRepository, event_bus: 'EventBus'):
        self._repo = repo
        self._event_bus = event_bus

    def create_order(self, customer_id: CustomerId, items: List[OrderItem]) -> Order:
        order = Order.create(customer_id, items)
        self._repo.save(order)

        self._event_bus.publish(OrderCreatedEvent(
            order_id=order.id,
            customer_id=customer_id,
            total=order.total
        ))
        return order

    def get_order(self, order_id: OrderId) -> Optional[Order]:
        return self._repo.find_by_id(order_id)

    def cancel_order(self, order_id: OrderId) -> None:
        order = self._repo.find_by_id(order_id)
        if order is None:
            raise ValueError(f"Order {order_id} not found")

        order.cancel()
        self._repo.save(order)
        self._event_bus.publish(OrderCancelledEvent(order_id=order_id))
```

```python
# order_module/api.py — Order module public API (the contract)
from order_module.services import OrderService
from shared_kernel.ids import OrderId, CustomerId
from typing import Optional, List, Dict, Any

class OrderAPI:
    """Public API of the Order module. Other modules use only this."""

    def __init__(self, service: OrderService):
        self._service = service

    def create_order(self, customer_id: str, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        customer = CustomerId.from_string(customer_id)
        order_items = [OrderItem.from_dict(item) for item in items]
        order = self._service.create_order(customer, order_items)
        return order.to_dict()

    def get_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        order = self._service.get_order(OrderId.from_string(order_id))
        return order.to_dict() if order else None

    def cancel_order(self, order_id: str) -> None:
        self._service.cancel_order(OrderId.from_string(order_id))
```

### Shared kernel

```python
# shared_kernel/ids.py — Shared value objects used across modules
from dataclasses import dataclass
import uuid

@dataclass(frozen=True)
class OrderId:
    value: str

    @staticmethod
    def from_string(s: str) -> 'OrderId':
        return OrderId(s)

    @staticmethod
    def generate() -> 'OrderId':
        return OrderId(str(uuid.uuid4()))

@dataclass(frozen=True)
class CustomerId:
    value: str

    @staticmethod
    def from_string(s: str) -> 'CustomerId':
        return CustomerId(s)

@dataclass(frozen=True)
class ProductId:
    value: str

    @staticmethod
    def from_string(s: str) -> 'ProductId':
        return ProductId(s)
```

```python
# shared_kernel/events.py — Event bus for inter-module communication
from typing import Callable, Dict, List, Type, Any
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class DomainEvent:
    """Base class for all domain events."""
    pass

class EventBus:
    """In-process event bus for inter-module communication.
    Modules communicate through events, not direct calls."""

    def __init__(self):
        self._handlers: Dict[Type[DomainEvent], List[Callable]] = {}

    def subscribe(self, event_type: Type[DomainEvent], handler: Callable):
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

    def publish(self, event: DomainEvent):
        event_type = type(event)
        handlers = self._handlers.get(event_type, [])

        for handler in handlers:
            try:
                handler(event)
            except Exception as e:
                logger.error(f"Event handler failed for {event_type.__name__}: {e}")

# Event definitions
@dataclass
class OrderCreatedEvent(DomainEvent):
    order_id: str
    customer_id: str
    total: float

@dataclass
class OrderCancelledEvent(DomainEvent):
    order_id: str

@dataclass
class PaymentProcessedEvent(DomainEvent):
    order_id: str
    amount: float
```

### Module wiring

```python
# app.py — Application composition root
from order_module import OrderService, OrderAPI
from order_module.repository import OrderRepository
from customer_module import CustomerService, CustomerAPI
from customer_module.repository import CustomerRepository
from inventory_module import InventoryService, InventoryAPI
from inventory_module.repository import InventoryRepository
from shared_kernel.events import EventBus, OrderCreatedEvent
from database import Database

def create_app():
    # Shared infrastructure
    db = Database("postgresql://localhost/shop")
    event_bus = EventBus()

    # Order module
    order_repo = OrderRepository(db)
    order_service = OrderService(order_repo, event_bus)
    order_api = OrderAPI(order_service)

    # Customer module
    customer_repo = CustomerRepository(db)
    customer_service = CustomerService(customer_repo, event_bus)
    customer_api = CustomerAPI(customer_service)

    # Inventory module
    inventory_repo = InventoryRepository(db)
    inventory_service = InventoryService(inventory_repo, event_bus)
    inventory_api = InventoryAPI(inventory_service)

    # Cross-module event subscriptions
    # When an order is created, reserve inventory
    event_bus.subscribe(OrderCreatedEvent, inventory_service.reserve_items)

    return {
        "orders": order_api,
        "customers": customer_api,
        "inventory": inventory_api,
    }
```

### Module isolation enforcement (Python)

```python
# enforce_boundaries.py — static analysis to enforce module boundaries
import ast
import os
from pathlib import Path
from typing import Set, Dict, List

class ModuleBoundaryChecker:
    """Check that modules don't import each other's internals."""

    def __init__(self, root: str, modules: Dict[str, Set[str]]):
        self.root = Path(root)
        self.modules = modules  # {module_name: {allowed_imports}}

    def check(self) -> List[str]:
        violations = []

        for py_file in self.root.rglob("*.py"):
            rel_path = py_file.relative_to(self.root)
            parts = rel_path.parts

            # Determine which module this file belongs to
            current_module = parts[0] if parts else None
            if current_module not in self.modules:
                continue

            # Parse imports
            tree = ast.parse(py_file.read_text())
            for node in ast.walk(tree):
                if isinstance(node, ast.ImportFrom):
                    module = node.module or ""
                    for import_name in [alias.name for alias in node.names]:
                        full_import = f"{module}.{import_name}" if module else import_name

                        # Check if importing from another module's internals
                        for other_module in self.modules:
                            if other_module == current_module:
                                continue
                            if full_import.startswith(other_module) and \
                               full_import not in self.modules[other_module]:
                                violations.append(
                                    f"{rel_path}: imports {full_import} from "
                                    f"{other_module} (not in public API)"
                                )

        return violations

# Usage
checker = ModuleBoundaryChecker("src/", {
    "order_module": {"order_module.OrderService", "order_module.OrderAPI"},
    "customer_module": {"customer_module.CustomerService", "customer_module.CustomerAPI"},
    "inventory_module": {"inventory_module.InventoryService", "inventory_module.InventoryAPI"},
})

violations = checker.check()
for v in violations:
    print(f"VIOLATION: {v}")
```

### Java modular monolith with Spring

```java
// OrderModule.java — Spring module with package-private internals
package com.shop.order;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

// Public API — only what's exposed to other modules
@Configuration
@Import(OrderPublicConfig.class)
public class OrderModule {

    @Bean
    public OrderFacade orderFacade(OrderService service) {
        return new OrderFacade(service);
    }
}

// OrderFacade — the public interface other modules use
package com.shop.order.api;

public interface OrderFacade {
    OrderDto createOrder(String customerId, List<OrderItemDto> items);
    OrderDto getOrder(String orderId);
    void cancelOrder(String orderId);
}

// Internal service — package-private, not accessible outside
package com.shop.order.internal;

import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;

@Service
class OrderServiceImpl implements OrderService {

    private final OrderRepository repository;
    private final ApplicationEventPublisher eventPublisher;

    OrderServiceImpl(OrderRepository repository,
                     ApplicationEventPublisher eventPublisher) {
        this.repository = repository;
        this.eventPublisher = eventPublisher;
    }

    @Override
    public Order createOrder(CustomerId customerId, List<OrderItem> items) {
        var order = Order.create(customerId, items);
        repository.save(order);

        eventPublisher.publishEvent(new OrderCreatedEvent(
            order.getId(), customerId, order.getTotal()
        ));

        return order;
    }
}
```

### Database schema isolation

```sql
-- Each module owns its tables — prefixed by module name
-- No cross-module foreign keys (use reference IDs instead)

-- Order module tables
CREATE TABLE order_orders (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL,  -- reference, not FK
    status VARCHAR(50) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES order_orders(id),
    product_id UUID NOT NULL,  -- reference, not FK
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL
);

-- Customer module tables
CREATE TABLE customer_customers (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL
);

-- Inventory module tables
CREATE TABLE inventory_products (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    stock INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL
);

-- No FK from order_orders.customer_id to customer_customers.id
-- The relationship is enforced in application code, not the database
```

## Variants

### Module-as-package (lightweight isolation)

```python
# Lightweight: modules are Python packages with __all__ controlling exports
# No separate database schemas, but code-level isolation

# catalog/__init__.py
from catalog.service import CatalogService
__all__ = ["CatalogService"]

# Other modules can only import CatalogService
# from catalog import CatalogService  ✅
# from catalog.service import _internal_helper  ❌ (convention, not enforced)
```

### Module-as-subsystem (strict isolation with separate schemas)

```sql
-- Each module gets its own database schema
CREATE SCHEMA IF NOT EXISTS order_module;
CREATE SCHEMA IF NOT EXISTS customer_module;
CREATE SCHEMA IF NOT EXISTS inventory_module;

-- Tables are fully isolated
CREATE TABLE order_module.orders (...);
CREATE TABLE customer_module.customers (...);
CREATE TABLE inventory_module.products (...);

-- Modules access only their own schema
GRANT USAGE ON SCHEMA order_module TO order_app_role;
GRANT USAGE ON SCHEMA customer_module TO customer_app_role;
```

## Best Practices


- For a deeper guide, see [Microservices Architecture — When to Use and When Not To](/guides/microservices-architecture-guide/).

- Define a public API for each module — only expose what other modules need
- Use an event bus for cross-module communication — don't call other modules directly
- No cross-module database access — each module owns its tables, use reference IDs not FKs
- Enforce boundaries with static analysis — catch violations in CI before they reach production
- Keep the shared kernel small — only share value objects, IDs, and event definitions
- One team per module — avoid multiple teams modifying the same module
- Design contracts carefully — the module API is the contract; changing it breaks consumers
- Plan for extraction — design modules so they can be extracted to microservices later

## Common Mistakes

- **No boundary enforcement**: modules import each other's internals. The monolith becomes a tangled mess. Use static analysis to enforce boundaries.
- **Shared database tables**: modules directly query each other's tables. Extracting a module to a microservice requires rewriting all cross-module queries.
- **Direct service calls**: `OrderService` calls `CustomerService` directly. Use events or a thin facade instead.
- **Bloated shared kernel**: putting business logic in the shared kernel. Keep it to IDs, events, and value objects only.
- **No module ownership**: anyone can modify any module. Modules lose their coherence. Assign clear ownership.

## FAQ

### What is a modular monolith?

A single deployable application with strict internal module boundaries. Each module owns its data, exposes a public API, and communicates with other modules through events or facades. It's a monolith in deployment but modular in design.

### How is a modular monolith different from microservices?

A modular monolith deploys as one unit with one database. Microservices deploy independently with separate databases. A modular monolith is simpler to operate but can't scale modules independently. Modules can be extracted to microservices later.

### How do modules communicate in a modular monolith?

Through events (event bus) or public APIs (facades). Module A publishes an event when something happens; Module B subscribes and reacts. For synchronous queries, Module A calls Module B's facade — never its internal service.

### Should modules share a database?

They can share a database server but should have separate schemas or table prefixes. No cross-module foreign keys. This allows extracting a module to its own database later without changing table relationships.

### When should I extract a module to a microservice?

When the module needs independent scaling, has a different availability requirement, or is owned by a team that would benefit from independent deployment. The modular monolith makes extraction easier because boundaries already exist.
