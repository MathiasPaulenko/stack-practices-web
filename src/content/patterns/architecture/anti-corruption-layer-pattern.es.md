---





contentType: patterns
slug: anti-corruption-layer-pattern
title: "Patrón Anti-Corruption Layer"
description: "Cómo isolatar legacy systems con translation adapters. Cubre ACL facade, domain translation, bidirectional mapping, y gradual legacy replacement."
metaDescription: "Isolá legacy systems con translation adapters. Aprende ACL facade, domain translation, bidirectional mapping, y gradual legacy replacement strategy."
difficulty: advanced
topics:
  - architecture
tags:
  - architecture
  - ddd
  - legacy
  - isolation
  - pattern
category: architectural
relatedResources:
  - /patterns/strangler-fig-pattern
  - /patterns/modular-monolith-pattern
  - /patterns/ambassador-pattern
  - /patterns/backends-for-frontends-pattern
  - /patterns/compute-resource-consolidation-pattern
  - /patterns/gateway-routing-pattern
  - /patterns/health-endpoint-monitoring-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Isolá legacy systems con translation adapters. Aprende ACL facade, domain translation, bidirectional mapping, y gradual legacy replacement strategy."
  keywords:
    - architecture
    - ddd
    - legacy
    - isolation
    - pattern





---

## Overview

El anti-corruption layer (ACL) isolata un new domain model de un legacy system's model. Cuando un new system necesita interactuar con un legacy system, los legacy's concepts, data structures, y APIs pueden "corruptir" el new domain model. El ACL actúa como un translation layer: acceptéa requests en el new domain's language, los translate al legacy system's format, llama al legacy, y translatea el response back. El new domain nunca ve los legacy's data structures. Este pattern es essential durante migrations donde el new system debe coexistir con el old one, y se pairéa bien con el strangler fig pattern.

## When to Use

- Migrando desde un legacy system mientras maintainés integration
- New domain model que difiere del legacy data model
- Integrando con external systems que tienen different domain concepts
- Preveniendo legacy terminology de leakingar en new code
- Microservices que necesitan llamar legacy monolith endpoints

## When NOT to Use

- Cuando el new y legacy systems sharean el mismo domain model
- Cuando el legacy system está siendo completamente replaced (no integration needed)
- Cuando el translation es trivial (1:1 field mapping)
- Greenfield projects sin legacy integration

## Solution

### ACL facade (Python)

```python
# acl/customer_acl.py — Anti-corruption layer para customer domain
from dataclasses import dataclass
from typing import Optional
from legacy.client import LegacyCustomerClient

# New domain model — clean, usa domain language
@dataclass(frozen=True)
class Customer:
    id: str
    email: str
    full_name: str
    status: CustomerStatus
    created_at: str

@dataclass(frozen=True)
class CustomerStatus:
    value: str  # "active", "suspended", "churned"

    @staticmethod
    def active() -> 'CustomerStatus':
        return CustomerStatus("active")

    @staticmethod
    def suspended() -> 'CustomerStatus':
        return CustomerStatus("suspended")

# ACL Translator — convertéa entre legacy y new domain
class CustomerTranslator:
    """Translateéa entre legacy data structures y new domain model."""

    @staticmethod
    def from_legacy(legacy_data: dict) -> Customer:
        """Translateéa legacy API response a domain Customer."""
        # Legacy usa 'cust_id', 'email_addr', 'first_nm', 'last_nm', 'stat_cd'
        # New domain usa 'id', 'email', 'full_name', 'status'
        full_name = f"{legacy_data.get('first_nm', '')} {legacy_data.get('last_nm', '')}".strip()

        # Legacy status codes: 1=active, 2=suspended, 3=churned
        status_map = {"1": "active", "2": "suspended", "3": "churned"}
        status = status_map.get(legacy_data.get("stat_cd", "1"), "active")

        return Customer(
            id=legacy_data["cust_id"],
            email=legacy_data["email_addr"].lower(),
            full_name=full_name,
            status=CustomerStatus(status),
            created_at=legacy_data.get("create_dt", "")
        )

    @staticmethod
    def to_legacy(customer: Customer) -> dict:
        """Translateéa domain Customer a legacy API format."""
        # Spliteá full_name back en first/last para legacy
        parts = customer.full_name.split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""

        # Reverse status mapping
        status_map = {"active": "1", "suspended": "2", "churned": "3"}

        return {
            "cust_id": customer.id,
            "email_addr": customer.email,
            "first_nm": first_name,
            "last_nm": last_name,
            "stat_cd": status_map.get(customer.status.value, "1")
        }

# ACL Facade — el public interface que el new domain usa
class CustomerACL:
    """Anti-corruption layer facade.
    El new domain llama a esto — nunca al legacy client directamente."""

    def __init__(self, legacy_client: LegacyCustomerClient):
        self._legacy = legacy_client
        self._translator = CustomerTranslator()

    def get_customer(self, customer_id: str) -> Optional[Customer]:
        legacy_data = self._legacy.fetch_customer(customer_id)
        if legacy_data is None:
            return None
        return self._translator.from_legacy(legacy_data)

    def create_customer(self, customer: Customer) -> Customer:
        legacy_data = self._translator.to_legacy(customer)
        result = self._legacy.insert_customer(legacy_data)
        return self._translator.from_legacy(result)

    def update_customer(self, customer: Customer) -> Customer:
        legacy_data = self._translator.to_legacy(customer)
        result = self._legacy.update_customer(customer.id, legacy_data)
        return self._translator.from_legacy(result)

    def suspend_customer(self, customer_id: str) -> Customer:
        legacy_data = self._legacy.update_status(customer_id, "2")
        return self._translator.from_legacy(legacy_data)
```

### New domain service usando el ACL

```python
# domain/customer_service.py — new domain service usa ACL, no legacy
from acl.customer_acl import CustomerACL, Customer, CustomerStatus

class CustomerService:
    """New domain service — no sabe nada sobre el legacy system."""

    def __init__(self, acl: CustomerACL):
        self._acl = acl

    def onboard_customer(self, email: str, full_name: str) -> Customer:
        customer = Customer(
            id="",  # ACL assignará
            email=email,
            full_name=full_name,
            status=CustomerStatus.active(),
            created_at=""
        )
        return self._acl.create_customer(customer)

    def suspend(self, customer_id: str) -> Customer:
        return self._acl.suspend_customer(customer_id)

    def get_profile(self, customer_id: str) -> dict:
        customer = self._acl.get_customer(customer_id)
        if customer is None:
            raise ValueError(f"Customer {customer_id} not found")
        return {
            "id": customer.id,
            "email": customer.email,
            "name": customer.full_name,
            "status": customer.status.value
        }
```

### Java ACL con Spring

```java
// CustomerACL.java — Anti-corruption layer en Java
package com.shop.acl;

import com.shop.domain.Customer;
import com.shop.domain.CustomerStatus;
import com.legacy.client.LegacyCustomerClient;
import com.legacy.dto.LegacyCustomerDTO;
import org.springframework.stereotype.Component;

@Component
public class CustomerACL {

    private final LegacyCustomerClient legacyClient;

    public CustomerACL(LegacyCustomerClient legacyClient) {
        this.legacyClient = legacyClient;
    }

    public Customer findById(String customerId) {
        LegacyCustomerDTO legacy = legacyClient.getCustomer(customerId);
        if (legacy == null) return null;
        return translateFromLegacy(legacy);
    }

    public Customer save(Customer customer) {
        LegacyCustomerDTO legacy = translateToLegacy(customer);
        LegacyCustomerDTO saved = legacyClient.insert(legacy);
        return translateFromLegacy(saved);
    }

    public Customer suspend(String customerId) {
        LegacyCustomerDTO legacy = legacyClient.updateStatus(customerId, "2");
        return translateFromLegacy(legacy);
    }

    private Customer translateFromLegacy(LegacyCustomerDTO legacy) {
        String fullName = legacy.getFirstName() + " " + legacy.getLastName();
        CustomerStatus status = switch (legacy.getStatusCode()) {
            case "1" -> CustomerStatus.active();
            case "2" -> CustomerStatus.suspended();
            case "3" -> CustomerStatus.churned();
            default -> CustomerStatus.active();
        };

        return new Customer(
            legacy.getCustomerId(),
            legacy.getEmailAddress().toLowerCase(),
            fullName.trim(),
            status,
            legacy.getCreationDate()
        );
    }

    private LegacyCustomerDTO translateToLegacy(Customer customer) {
        String[] nameParts = customer.getFullName().split(" ", 2);
        String firstName = nameParts[0];
        String lastName = nameParts.length > 1 ? nameParts[1] : "";

        String statusCode = switch (customer.getStatus()) {
            case ACTIVE -> "1";
            case SUSPENDED -> "2";
            case CHURNED -> "3";
        };

        LegacyCustomerDTO dto = new LegacyCustomerDTO();
        dto.setCustomerId(customer.getId());
        dto.setEmailAddress(customer.getEmail());
        dto.setFirstName(firstName);
        dto.setLastName(lastName);
        dto.setStatusCode(statusCode);
        return dto;
    }
}
```

### ACL para event-based integration

```python
# acl/event_acl.py — translateéa legacy events a domain events
from typing import Callable, Dict, List
from dataclasses import dataclass

@dataclass
class LegacyEvent:
    event_type: str  # "CUST_ADD", "CUST_MOD", "CUST_DEL"
    cust_id: str
    email_addr: str
    stat_cd: str
    timestamp: str

@dataclass
class DomainEvent:
    event_type: str  # "CustomerCreated", "CustomerUpdated", "CustomerDeleted"
    customer_id: str
    email: str
    status: str
    occurred_at: str

class EventTranslator:
    """Translateéa legacy events a domain events."""

    TYPE_MAP = {
        "CUST_ADD": "CustomerCreated",
        "CUST_MOD": "CustomerUpdated",
        "CUST_DEL": "CustomerDeleted"
    }

    STATUS_MAP = {"1": "active", "2": "suspended", "3": "churned"}

    @staticmethod
    def to_domain(legacy: LegacyEvent) -> DomainEvent:
        return DomainEvent(
            event_type=EventTranslator.TYPE_MAP.get(legacy.event_type, "Unknown"),
            customer_id=legacy.cust_id,
            email=legacy.email_addr.lower() if legacy.email_addr else "",
            status=EventTranslator.STATUS_MAP.get(legacy.stat_cd, "active"),
            occurred_at=legacy.timestamp
        )

class EventACL:
    """Subscribeéa a legacy events, publicéa domain events."""

    def __init__(self):
        self._translator = EventTranslator()
        self._handlers: Dict[str, List[Callable]] = {}

    def subscribe(self, event_type: str, handler: Callable):
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

    def on_legacy_event(self, legacy_event: LegacyEvent):
        """Llamado cuando un legacy event arrive."""
        domain_event = self._translator.to_domain(legacy_event)

        handlers = self._handlers.get(domain_event.event_type, [])
        for handler in handlers:
            handler(domain_event)
```

### ACL para database integration

```python
# acl/database_acl.py — translateéa legacy database tables a domain repositories
from typing import Optional, List
from domain.customer import Customer, CustomerStatus, CustomerRepository

class LegacyCustomerRepository(CustomerRepository):
    """Implementa el domain repository interface usando legacy tables.
    El domain ve un clean repository; esta class hace el translation."""

    def __init__(self, db_connection):
        self._db = db_connection

    def find_by_id(self, customer_id: str) -> Optional[Customer]:
        # Queryeá legacy table con legacy column names
        row = self._db.execute_one(
            "SELECT cust_id, email_addr, first_nm, last_nm, stat_cd, create_dt "
            "FROM LEGACY.CUSTOMERS WHERE cust_id = :id",
            {"id": customer_id}
        )
        if row is None:
            return None

        # Translateéa legacy row a domain entity
        status_map = {"1": "active", "2": "suspended", "3": "churned"}
        return Customer(
            id=row["cust_id"],
            email=row["email_addr"].lower(),
            full_name=f"{row['first_nm']} {row['last_nm']}".strip(),
            status=CustomerStatus(status_map.get(row["stat_cd"], "active")),
            created_at=str(row["create_dt"])
        )

    def save(self, customer: Customer) -> Customer:
        # Translateéa domain entity a legacy columns
        parts = customer.full_name.split(" ", 1)
        status_map = {"active": "1", "suspended": "2", "churned": "3"}

        self._db.execute(
            "MERGE INTO LEGACY.CUSTOMERS "
            "USING (SELECT :id AS cust_id FROM dual) src "
            "ON (CUSTOMERS.cust_id = src.cust_id) "
            "WHEN MATCHED THEN UPDATE SET "
            "  email_addr = :email, first_nm = :first, last_nm = :last, stat_cd = :status "
            "WHEN NOT MATCHED THEN INSERT "
            "  (cust_id, email_addr, first_nm, last_nm, stat_cd, create_dt) "
            "  VALUES (:id, :email, :first, :last, :status, SYSDATE)",
            {
                "id": customer.id,
                "email": customer.email,
                "first": parts[0],
                "last": parts[1] if len(parts) > 1 else "",
                "status": status_map.get(customer.status.value, "1")
            }
        )
        return self.find_by_id(customer.id)

    def find_by_status(self, status: CustomerStatus) -> List[Customer]:
        status_map = {"active": "1", "suspended": "2", "churned": "3"}
        rows = self._db.execute_all(
            "SELECT cust_id, email_addr, first_nm, last_nm, stat_cd, create_dt "
            "FROM LEGACY.CUSTOMERS WHERE stat_cd = :status",
            {"status": status_map.get(status.value, "1")}
        )
        return [self._row_to_customer(row) for row in rows]
```

## Variants

### ACL como API gateway

```python
# acl_gateway.py — ACL expuesto como HTTP API
from flask import Flask, request, jsonify
from acl.customer_acl import CustomerACL
from legacy.client import LegacyCustomerClient

app = Flask(__name__)
acl = CustomerACL(LegacyCustomerClient())

@app.route("/api/customers/<customer_id>", methods=["GET"])
def get_customer(customer_id):
    customer = acl.get_customer(customer_id)
    if customer is None:
        return jsonify({"error": "Not found"}), 404
    return jsonify({
        "id": customer.id,
        "email": customer.email,
        "fullName": customer.full_name,
        "status": customer.status.value
    })

@app.route("/api/customers", methods=["POST"])
def create_customer():
    data = request.json
    customer = Customer(
        id="",
        email=data["email"],
        full_name=data["fullName"],
        status=CustomerStatus.active(),
        created_at=""
    )
    created = acl.create_customer(customer)
    return jsonify({
        "id": created.id,
        "email": created.email,
        "fullName": created.full_name,
        "status": created.status.value
    }), 201
```

### ACL con caching

```python
# acl_cached.py — ACL con caching para reducir legacy calls
from functools import lru_cache
from acl.customer_acl import CustomerACL, Customer

class CachedCustomerACL:
    """Wrapea el ACL con caching para reducir legacy system load."""

    def __init__(self, inner_acl: CustomerACL):
        self._inner = inner_acl

    @lru_cache(maxsize=1000)
    def get_customer(self, customer_id: str) -> Customer:
        return self._inner.get_customer(customer_id)

    def create_customer(self, customer: Customer) -> Customer:
        result = self._inner.create_customer(customer)
        # Cacheéa el new customer
        self.get_customer.cache_clear()
        return result

    def update_customer(self, customer: Customer) -> Customer:
        result = self._inner.update_customer(customer)
        # Invalidateá cache para este customer
        self.get_customer.cache_clear()
        return result

    def suspend_customer(self, customer_id: str) -> Customer:
        result = self._inner.suspend_customer(customer_id)
        self.get_customer.cache_clear()
        return result
```

## Best Practices


- For a deeper guide, see [Strangler Fig: Gradually Replace Legacy by Intercepting](/es/patterns/strangler-fig-pattern/).

- Mantené el ACL stateless — debería solo translatear, no storear business state
- Hacé el ACL el único path al legacy system — no domain code debería llamar legacy directamente
- Testeá translations thoroughly — mapping errors causan silent data corruption
- Usá el ACL para both reads y writes — no dejes que ningún path bypasse el translation
- Mantené translators bidirectional — `from_legacy` y `to_legacy` deberían ser inverse operations
- Versioneá el ACL — cuando el legacy API cambia, updateéa el translator, no el domain
- Considerá caching — si el legacy system es slow, cacheéa translated results
- Planificá para ACL removal — cuando el legacy está fully replaced, el ACL puede ser deleted

## Common Mistakes

- **Domain code llamando legacy directamente**: bypasseando el ACL. El legacy model corrupte el domain. Enforceá que solo el ACL le hable al legacy.
- **Incomplete translation**: algunos legacy fields leakean en el domain. Translateéa todo, incluso si parece unimportant.
- **No tests para translators**: mapping errors pasan unnoticed. Testeá `from_legacy` y `to_legacy` con todos los possible values.
- **ACL con business logic**: el ACL debería solo translatear. Business logic pertenece en el domain service, no en el ACL.
- **No caching strategy**: cada domain operation hittea el legacy system. Agregá caching para read-heavy operations.

## FAQ

### ¿Qué es un anti-corruption layer?

Un translation layer entre un new domain model y un legacy system. Acceptéa requests en el new domain's language, los translate al legacy format, llama al legacy, y translatea el response back. El new domain nunca ve los legacy's data structures.

### ¿En qué se diferencia ACL de un regular adapter?

Un adapter wrapea un external API. Un ACL específicamente previene el legacy domain model de corruptir el new domain model. Translateéa concepts, no solo data formats. Por ejemplo, legacy "stat_cd=2" se vuelve domain "CustomerStatus.suspended()".

### ¿Cuándo debería remover el ACL?

Cuando el legacy system está fully decommissioned. En ese punto, el ACL no tiene purpose y puede ser deleted. Este es el end state del strangler fig migration.

### ¿Debería el ACL ser un separate service?

Puede ser una class, un module, o un separate service. Arrancá con una class en el mismo process. Si el ACL se vuelve complex o es shared por múltiples services, extractealo a un separate microservice.

### ¿Puede el ACL handlear events, no solo request-response?

Sí. Subscribeéa a legacy events, translateéalos a domain events, y publicéalos al domain's event bus. El domain reactea a clean domain events sin saber el legacy event format.
