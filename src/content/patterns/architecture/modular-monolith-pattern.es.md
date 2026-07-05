---
contentType: patterns
slug: modular-monolith-pattern
title: "Patrón Modular Monolith: Single Deployable Unit con Internal Module Boundaries"
description: "Cómo construir un modular monolith con strict internal module boundaries. Cubre module isolation, shared kernel, inter-module communication, y migration a microservices."
metaDescription: "Construye un modular monolith con strict internal module boundaries. Aprende module isolation, shared kernel, inter-module communication, y migration a microservices."
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
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye un modular monolith con strict internal module boundaries. Aprende module isolation, shared kernel, inter-module communication, y migration a microservices."
  keywords:
    - architecture
    - monolith
    - modules
    - boundaries
    - pattern
---

## Overview

Un modular monolith es un single deployable application con strict internal module boundaries. Cada module posee su data, expone un clear API, y communicatea con otros modules solo a través de well-defined contracts. A diferencia de un traditional monolith donde el code está tangled across layers, un modular monolith enforcea isolation: los modules no pueden accessar cada other's database tables o internal classes. Esto te da la simplicity de un single deployment (un build, un database, un process) con los organizational benefits de microservices (team ownership, independent modules, clear contracts). Cuando llegue el momento, los modules pueden ser extracted a separate microservices con minimal refactoring.

## When to Use

- Teams chicos a medianos que quieren clean architecture sin operational overhead
- Startups que necesitan mover fast pero planean future microservices extraction
- Applications donde deployment simplicity importa más que independent scaling
- Domains que pueden ser claramente partitioned en bounded contexts
- Teams transitionando desde monolith a microservices gradualmente

## When NOT to Use

- Applications que requieren independent scaling de different components
- Teams lo suficientemente large que un single codebase crea merge conflicts
- Systems donde diferentes modules tienen muy different availability requirements
- Real-time systems donde cross-module latency debe ser sub-millisecond

## Solution

### Module structure (Python)

```python
# order_module/__init__.py — Order module public API
from order_module.services import OrderService
from order_module.api import OrderAPI

__all__ = ["OrderService", "OrderAPI"]

# El module solo expone lo que está en __all__
# Internal classes no son importable desde afuera
```

```python
# order_module/services.py — Order module internal implementation
from order_module.models import Order, OrderItem
from order_module.repository import OrderRepository
from shared_kernel.events import DomainEvent
from shared_kernel.ids import OrderId, CustomerId
from typing import Optional, List

class OrderService:
    """Internal service — no es part del module's public API."""

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
# order_module/api.py — Order module public API (el contract)
from order_module.services import OrderService
from shared_kernel.ids import OrderId, CustomerId
from typing import Optional, List, Dict, Any

class OrderAPI:
    """Public API del Order module. Otros modules usan solo esto."""

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
# shared_kernel/ids.py — Shared value objects usados across modules
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
# shared_kernel/events.py — Event bus para inter-module communication
from typing import Callable, Dict, List, Type, Any
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class DomainEvent:
    """Base class para todos los domain events."""
    pass

class EventBus:
    """In-process event bus para inter-module communication.
    Los modules communicatean a través de events, no direct calls."""

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
    # Cuando un order se crea, reserveá inventory
    event_bus.subscribe(OrderCreatedEvent, inventory_service.reserve_items)

    return {
        "orders": order_api,
        "customers": customer_api,
        "inventory": inventory_api,
    }
```

### Module isolation enforcement (Python)

```python
# enforce_boundaries.py — static analysis para enforcear module boundaries
import ast
import os
from pathlib import Path
from typing import Set, Dict, List

class ModuleBoundaryChecker:
    """Checkeá que los modules no importen cada other's internals."""

    def __init__(self, root: str, modules: Dict[str, Set[str]]):
        self.root = Path(root)
        self.modules = modules  # {module_name: {allowed_imports}}

    def check(self) -> List[str]:
        violations = []

        for py_file in self.root.rglob("*.py"):
            rel_path = py_file.relative_to(self.root)
            parts = rel_path.parts

            # Determiná a qué module pertenece este file
            current_module = parts[0] if parts else None
            if current_module not in self.modules:
                continue

            # Parseá imports
            tree = ast.parse(py_file.read_text())
            for node in ast.walk(tree):
                if isinstance(node, ast.ImportFrom):
                    module = node.module or ""
                    for import_name in [alias.name for alias in node.names]:
                        full_import = f"{module}.{import_name}" if module else import_name

                        # Checkeá si está importando desde otro module's internals
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

### Java modular monolith con Spring

```java
// OrderModule.java — Spring module con package-private internals
package com.shop.order;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

// Public API — solo lo que se expone a otros modules
@Configuration
@Import(OrderPublicConfig.class)
public class OrderModule {

    @Bean
    public OrderFacade orderFacade(OrderService service) {
        return new OrderFacade(service);
    }
}

// OrderFacade — el public interface que otros modules usan
package com.shop.order.api;

public interface OrderFacade {
    OrderDto createOrder(String customerId, List<OrderItemDto> items);
    OrderDto getOrder(String orderId);
    void cancelOrder(String orderId);
}

// Internal service — package-private, no accessible afuera
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
-- Cada module posee sus tables — prefixed por module name
-- No cross-module foreign keys (usá reference IDs en su lugar)

-- Order module tables
CREATE TABLE order_orders (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL,  -- reference, no FK
    status VARCHAR(50) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES order_orders(id),
    product_id UUID NOT NULL,  -- reference, no FK
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

-- No FK desde order_orders.customer_id a customer_customers.id
-- El relationship se enforcea en application code, no en el database
```

## Variants

### Module-as-package (lightweight isolation)

```python
# Lightweight: los modules son Python packages con __all__ controlling exports
# No separate database schemas, pero code-level isolation

# catalog/__init__.py
from catalog.service import CatalogService
__all__ = ["CatalogService"]

# Otros modules solo pueden importar CatalogService
# from catalog import CatalogService  ✅
# from catalog.service import _internal_helper  ❌ (convention, no enforced)
```

### Module-as-subsystem (strict isolation con separate schemas)

```sql
-- Cada module obtiene su propio database schema
CREATE SCHEMA IF NOT EXISTS order_module;
CREATE SCHEMA IF NOT EXISTS customer_module;
CREATE SCHEMA IF NOT EXISTS inventory_module;

-- Tables están fully isolated
CREATE TABLE order_module.orders (...);
CREATE TABLE customer_module.customers (...);
CREATE TABLE inventory_module.products (...);

-- Modules accessan solo su propio schema
GRANT USAGE ON SCHEMA order_module TO order_app_role;
GRANT USAGE ON SCHEMA customer_module TO customer_app_role;
```

## Best Practices

- Definí un public API para cada module — solo exponé lo que otros modules necesitan
- Usá un event bus para cross-module communication — no llames a otros modules directamente
- No cross-module database access — cada module posee sus tables, usá reference IDs no FKs
- Enforceá boundaries con static analysis — catcheá violations en CI antes de que lleguen a production
- Mantené el shared kernel chico — solo shareá value objects, IDs, y event definitions
- Un team per module — evitá múltiples teams modificando el mismo module
- Diseñá contracts cuidadosamente — el module API es el contract; cambiarlo breakea consumers
- Planificá para extraction — diseñá modules para que puedan ser extracted a microservices después

## Common Mistakes

- **No boundary enforcement**: los modules importan cada other's internals. El monolith se vuelve un tangled mess. Usá static analysis para enforcear boundaries.
- **Shared database tables**: los modules directamente queryean cada other's tables. Extractear un module a un microservice requiere rewritear todos los cross-module queries.
- **Direct service calls**: `OrderService` llama a `CustomerService` directamente. Usá events o un thin facade en su lugar.
- **Bloated shared kernel**: poner business logic en el shared kernel. Mantenelo a IDs, events, y value objects only.
- **No module ownership**: cualquiera puede modificar cualquier module. Los modules pierden su coherence. Assigná clear ownership.

## FAQ

### ¿Qué es un modular monolith?

Un single deployable application con strict internal module boundaries. Cada module posee su data, expone un public API, y communicatea con otros modules a través de events o facades. Es un monolith en deployment pero modular en design.

### ¿En qué se diferencia un modular monolith de microservices?

Un modular monolith deployea como un unit con un database. Los microservices deployean independentemente con separate databases. Un modular monolith es más simple de operatear pero no puede scalear modules independentemente. Los modules pueden ser extracted a microservices después.

### ¿Cómo communicatean los modules en un modular monolith?

A través de events (event bus) o public APIs (facades). Module A publicéa un event cuando algo pasa; Module B subscribe y reactea. Para synchronous queries, Module A llama al facade de Module B — nunca a su internal service.

### ¿Deberían los modules sharear un database?

Pueden sharear un database server pero deberían tener separate schemas o table prefixes. No cross-module foreign keys. Esto permite extractear un module a su propio database después sin cambiar table relationships.

### ¿Cuándo debería extractear un module a un microservice?

Cuando el module necesita independent scaling, tiene un different availability requirement, o es owned por un team que se beneficiaría de independent deployment. El modular monolith hace extraction más fácil porque los boundaries ya existen.
