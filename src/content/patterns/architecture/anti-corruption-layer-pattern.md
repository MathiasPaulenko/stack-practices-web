---





contentType: patterns
slug: anti-corruption-layer-pattern
title: "Anti-Corruption Layer: Isolate Legacy with Adapters"
description: "How to isolate legacy systems with translation adapters. Covers ACL facade, domain translation, bidirectional mapping, and gradual legacy replacement."
metaDescription: "Isolate legacy systems with translation adapters. Learn ACL facade, domain translation, bidirectional mapping, and gradual legacy replacement strategy."
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
  metaDescription: "Isolate legacy systems with translation adapters. Learn ACL facade, domain translation, bidirectional mapping, and gradual legacy replacement strategy."
  keywords:
    - architecture
    - ddd
    - legacy
    - isolation
    - pattern





---

## Overview

The anti-corruption layer (ACL) isolates a new domain model from a legacy system's model. When a new system needs to interact with a legacy system, the legacy's concepts, data structures, and APIs can "corrupt" the new domain model. The ACL acts as a translation layer: it accepts requests in the new domain's language, translates them to the legacy system's format, calls the legacy, and translates the response back. The new domain never sees the legacy's data structures. This pattern is essential during migrations where the new system must coexist with the old one, and it pairs well with the strangler fig pattern.

## When to Use

- Migrating from a legacy system while maintaining integration
- New domain model that differs from the legacy data model
- Integrating with external systems that have different domain concepts
- Preventing legacy terminology from leaking into new code
- Microservices that need to call legacy monolith endpoints

## When NOT to Use

- When the new and legacy systems share the same domain model
- When the legacy system is being completely replaced (no integration needed)
- When the translation is trivial (1:1 field mapping)
- Greenfield projects with no legacy integration

## Solution

### ACL facade (Python)

```python
# acl/customer_acl.py — Anti-corruption layer for customer domain
from dataclasses import dataclass
from typing import Optional
from legacy.client import LegacyCustomerClient

# New domain model — clean, uses domain language
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

# ACL Translator — converts between legacy and new domain
class CustomerTranslator:
    """Translates between legacy data structures and new domain model."""

    @staticmethod
    def from_legacy(legacy_data: dict) -> Customer:
        """Translate legacy API response to domain Customer."""
        # Legacy uses 'cust_id', 'email_addr', 'first_nm', 'last_nm', 'stat_cd'
        # New domain uses 'id', 'email', 'full_name', 'status'
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
        """Translate domain Customer to legacy API format."""
        # Split full_name back into first/last for legacy
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

# ACL Facade — the public interface the new domain uses
class CustomerACL:
    """Anti-corruption layer facade.
    The new domain calls this — never the legacy client directly."""

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

### New domain service using the ACL

```python
# domain/customer_service.py — new domain service uses ACL, not legacy
from acl.customer_acl import CustomerACL, Customer, CustomerStatus

class CustomerService:
    """New domain service — knows nothing about the legacy system."""

    def __init__(self, acl: CustomerACL):
        self._acl = acl

    def onboard_customer(self, email: str, full_name: str) -> Customer:
        customer = Customer(
            id="",  # ACL will assign
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

### Java ACL with Spring

```java
// CustomerACL.java — Anti-corruption layer in Java
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

### ACL for event-based integration

```python
# acl/event_acl.py — translate legacy events to domain events
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
    """Translate legacy events to domain events."""

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
    """Subscribe to legacy events, publish domain events."""

    def __init__(self):
        self._translator = EventTranslator()
        self._handlers: Dict[str, List[Callable]] = {}

    def subscribe(self, event_type: str, handler: Callable):
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

    def on_legacy_event(self, legacy_event: LegacyEvent):
        """Called when a legacy event arrives."""
        domain_event = self._translator.to_domain(legacy_event)

        handlers = self._handlers.get(domain_event.event_type, [])
        for handler in handlers:
            handler(domain_event)
```

### ACL for database integration

```python
# acl/database_acl.py — translate legacy database tables to domain repositories
from typing import Optional, List
from domain.customer import Customer, CustomerStatus, CustomerRepository

class LegacyCustomerRepository(CustomerRepository):
    """Implements the domain repository interface using legacy tables.
    The domain sees a clean repository; this class does the translation."""

    def __init__(self, db_connection):
        self._db = db_connection

    def find_by_id(self, customer_id: str) -> Optional[Customer]:
        # Query legacy table with legacy column names
        row = self._db.execute_one(
            "SELECT cust_id, email_addr, first_nm, last_nm, stat_cd, create_dt "
            "FROM LEGACY.CUSTOMERS WHERE cust_id = :id",
            {"id": customer_id}
        )
        if row is None:
            return None

        # Translate legacy row to domain entity
        status_map = {"1": "active", "2": "suspended", "3": "churned"}
        return Customer(
            id=row["cust_id"],
            email=row["email_addr"].lower(),
            full_name=f"{row['first_nm']} {row['last_nm']}".strip(),
            status=CustomerStatus(status_map.get(row["stat_cd"], "active")),
            created_at=str(row["create_dt"])
        )

    def save(self, customer: Customer) -> Customer:
        # Translate domain entity to legacy columns
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

### ACL as an API gateway

```python
# acl_gateway.py — ACL exposed as an HTTP API
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

### ACL with caching

```python
# acl_cached.py — ACL with caching to reduce legacy calls
from functools import lru_cache
from acl.customer_acl import CustomerACL, Customer

class CachedCustomerACL:
    """Wraps the ACL with caching to reduce legacy system load."""

    def __init__(self, inner_acl: CustomerACL):
        self._inner = inner_acl

    @lru_cache(maxsize=1000)
    def get_customer(self, customer_id: str) -> Customer:
        return self._inner.get_customer(customer_id)

    def create_customer(self, customer: Customer) -> Customer:
        result = self._inner.create_customer(customer)
        # Cache the new customer
        self.get_customer.cache_clear()
        return result

    def update_customer(self, customer: Customer) -> Customer:
        result = self._inner.update_customer(customer)
        # Invalidate cache for this customer
        self.get_customer.cache_clear()
        return result

    def suspend_customer(self, customer_id: str) -> Customer:
        result = self._inner.suspend_customer(customer_id)
        self.get_customer.cache_clear()
        return result
```

## Best Practices


- For a deeper guide, see [Strangler Fig: Gradually Replace Legacy by Intercepting](/patterns/strangler-fig-pattern/).

- Keep the ACL stateless — it should only translate, not store business state
- Make the ACL the only path to the legacy system — no domain code should call legacy directly
- Test translations thoroughly — mapping errors cause silent data corruption
- Use the ACL for both reads and writes — don't let any path bypass the translation
- Keep translators bidirectional — `from_legacy` and `to_legacy` should be inverse operations
- Version the ACL — when the legacy API changes, update the translator, not the domain
- Consider caching — if the legacy system is slow, cache translated results
- Plan for ACL removal — when the legacy is fully replaced, the ACL can be deleted

## Common Mistakes

- **Domain code calling legacy directly**: bypassing the ACL. The legacy model corrupts the domain. Enforce that only the ACL talks to legacy.
- **Incomplete translation**: some legacy fields leak into the domain. Translate everything, even if it seems unimportant.
- **No tests for translators**: mapping errors go unnoticed. Test `from_legacy` and `to_legacy` with all possible values.
- **ACL with business logic**: the ACL should only translate. Business logic belongs in the domain service, not the ACL.
- **No caching strategy**: every domain operation hits the legacy system. Add caching for read-heavy operations.

## FAQ

### What is an anti-corruption layer?

A translation layer between a new domain model and a legacy system. It accepts requests in the new domain's language, translates them to the legacy format, calls the legacy, and translates the response back. The new domain never sees the legacy's data structures.

### How is ACL different from a regular adapter?

An adapter wraps an external API. An ACL specifically prevents the legacy domain model from corrupting the new domain model. It translates concepts, not just data formats. For example, legacy "stat_cd=2" becomes domain "CustomerStatus.suspended()".

### When should I remove the ACL?

When the legacy system is fully decommissioned. At that point, the ACL has no purpose and can be deleted. This is the end state of the strangler fig migration.

### Should the ACL be a separate service?

It can be a class, a module, or a separate service. Start with a class in the same process. If the ACL becomes complex or is shared by multiple services, extract it to a separate microservice.

### Can the ACL handle events, not just request-response?

Yes. Subscribe to legacy events, translate them to domain events, and publish to the domain's event bus. The domain reacts to clean domain events without knowing the legacy event format.
