---
contentType: patterns
slug: role-pattern
title: "Role Pattern"
description: "Assign dynamic roles to objects at runtime instead of hard-coding behavior in class hierarchies, enabling flexible identity changes without inheritance bloat."
metaDescription: "Learn the Role Pattern for dynamic runtime behavior assignment. Examples in Python, Java, and JavaScript with role objects, trait composition, and entity delegation."
difficulty: intermediate
topics:
  - design
  - architecture
tags:
  - role
  - pattern
  - design-pattern
  - behavioral
  - dynamic
  - composition
  - ddd
relatedResources:
  - /patterns/design/decorator-pattern
  - /patterns/design/strategy-pattern
  - /patterns/design/composite-entity-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Role Pattern for dynamic runtime behavior assignment. Examples in Python, Java, and JavaScript with role objects, trait composition, and entity delegation."
  keywords:
    - role pattern
    - design pattern
    - dynamic
    - composition
    - ddd
---

# Role Pattern

## Overview

The Role Pattern assigns dynamic roles to objects at runtime instead of encoding behavior in fixed class hierarchies. In many domains, the same entity plays different roles in different contexts: a person can be a customer, an employee, and a vendor. Using inheritance for each combination leads to a combinatorial explosion of subclasses.

The Role Pattern solves this by separating the **core entity** (who the object is) from **roles** (what the object does). Roles can be attached, detached, and combined at runtime, providing the flexibility of composition while maintaining a clear identity for the underlying entity.

This pattern is foundational in Domain-Driven Design (DDD) and is used in authorization systems (RBAC), workflow engines, and multi-tenant applications.

## When to Use

Use the Role Pattern when:
- The same entity can play multiple roles in different contexts
- Role combinations would cause a combinatorial explosion with inheritance
- Roles need to be assigned, revoked, or changed at runtime
- You need to track role history or audit role transitions

## When to Avoid

- Roles are static and known at compile time (a simple type hierarchy suffices)
- The system has only one or two roles with no overlap
- Introducing role objects adds indirection without clear benefit
- Performance is critical and role lookup overhead is unacceptable

## Solution

### Python

```python
from typing import Dict, List, Optional, Protocol
from dataclasses import dataclass, field
from datetime import datetime

class Role(Protocol):
    """Protocol for roles that can be attached to entities"""
    role_name: str

    def can_perform(self, action: str) -> bool:
        ...


@dataclass
class CustomerRole:
    role_name: str = "customer"
    loyalty_points: int = 0

    def can_perform(self, action: str) -> bool:
        return action in ["browse", "purchase", "review"]

    def earn_points(self, amount: int):
        self.loyalty_points += amount


@dataclass
class EmployeeRole:
    role_name: str = "employee"
    department: str = ""
    salary: float = 0.0

    def can_perform(self, action: str) -> bool:
        return action in ["browse", "inventory", "support", "refund"]

    def process_refund(self, order_id: str) -> str:
        return f"Refund processed for {order_id}"


@dataclass
class VendorRole:
    role_name: str = "vendor"
    company_name: str = ""
    commission_rate: float = 0.05

    def can_perform(self, action: str) -> bool:
        return action in ["list_products", "manage_inventory", "view_sales"]


class Person:
    """Core entity that can hold multiple roles"""
    def __init__(self, person_id: str, name: str):
        self.person_id = person_id
        self.name = name
        self._roles: Dict[str, Role] = {}
        self._role_history: List[dict] = []

    def assign_role(self, role: Role):
        self._roles[role.role_name] = role
        self._role_history.append({
            "action": "assigned",
            "role": role.role_name,
            "timestamp": datetime.now().isoformat()
        })

    def revoke_role(self, role_name: str):
        if role_name in self._roles:
            del self._roles[role_name]
            self._role_history.append({
                "action": "revoked",
                "role": role_name,
                "timestamp": datetime.now().isoformat()
            })

    def has_role(self, role_name: str) -> bool:
        return role_name in self._roles

    def get_role(self, role_name: str) -> Optional[Role]:
        return self._roles.get(role_name)

    def can_perform(self, action: str) -> bool:
        return any(role.can_perform(action) for role in self._roles.values())

    @property
    def roles(self) -> List[str]:
        return list(self._roles.keys())


# Usage
person = Person("P-001", "Alice")
person.assign_role(CustomerRole(loyalty_points=100))
person.assign_role(EmployeeRole(department="Sales", salary=75000))

print(f"Alice's roles: {person.roles}")
print(f"Can browse: {person.can_perform('browse')}")
print(f"Can refund: {person.can_perform('refund')}")
print(f"Can list products: {person.can_perform('list_products')}")

# Access role-specific behavior
emp_role = person.get_role("employee")
if emp_role:
    print(emp_role.process_refund("ORD-123"))

# Revoke a role
person.revoke_role("customer")
print(f"Roles after revoke: {person.roles}")
```

### Java

```java
import java.util.*;

interface Role {
    String getRoleName();
    boolean canPerform(String action);
}

class CustomerRole implements Role {
    private int loyaltyPoints = 0;

    public String getRoleName() { return "customer"; }
    public boolean canPerform(String action) {
        return List.of("browse", "purchase", "review").contains(action);
    }
    public void earnPoints(int amount) { loyaltyPoints += amount; }
}

class EmployeeRole implements Role {
    private String department;
    private double salary;

    public EmployeeRole(String department, double salary) {
        this.department = department; this.salary = salary;
    }

    public String getRoleName() { return "employee"; }
    public boolean canPerform(String action) {
        return List.of("browse", "inventory", "support", "refund").contains(action);
    }
    public String processRefund(String orderId) { return "Refund processed for " + orderId; }
}

class Person {
    private final String personId;
    private final String name;
    private final Map<String, Role> roles = new HashMap<>();
    private final List<Map<String, String>> history = new ArrayList<>();

    public Person(String personId, String name) {
        this.personId = personId; this.name = name;
    }

    public void assignRole(Role role) {
        roles.put(role.getRoleName(), role);
        history.add(Map.of("action", "assigned", "role", role.getRoleName()));
    }

    public void revokeRole(String roleName) {
        if (roles.remove(roleName) != null) {
            history.add(Map.of("action", "revoked", "role", roleName));
        }
    }

    public boolean hasRole(String roleName) { return roles.containsKey(roleName); }
    public Role getRole(String roleName) { return roles.get(roleName); }

    public boolean canPerform(String action) {
        return roles.values().stream().anyMatch(r -> r.canPerform(action));
    }

    public List<String> getRoles() { return new ArrayList<>(roles.keySet()); }
}

// Usage
Person person = new Person("P-001", "Alice");
person.assignRole(new CustomerRole());
person.assignRole(new EmployeeRole("Sales", 75000));

System.out.println("Roles: " + person.getRoles());
System.out.println("Can browse: " + person.canPerform("browse"));
System.out.println("Can refund: " + person.canPerform("refund"));
```

### JavaScript

```javascript
class CustomerRole {
  constructor(loyaltyPoints = 0) {
    this.roleName = 'customer';
    this.loyaltyPoints = loyaltyPoints;
  }

  canPerform(action) {
    return ['browse', 'purchase', 'review'].includes(action);
  }

  earnPoints(amount) {
    this.loyaltyPoints += amount;
  }
}

class EmployeeRole {
  constructor(department, salary) {
    this.roleName = 'employee';
    this.department = department;
    this.salary = salary;
  }

  canPerform(action) {
    return ['browse', 'inventory', 'support', 'refund'].includes(action);
  }

  processRefund(orderId) {
    return `Refund processed for ${orderId}`;
  }
}

class VendorRole {
  constructor(companyName, commissionRate = 0.05) {
    this.roleName = 'vendor';
    this.companyName = companyName;
    this.commissionRate = commissionRate;
  }

  canPerform(action) {
    return ['list_products', 'manage_inventory', 'view_sales'].includes(action);
  }
}

class Person {
  constructor(personId, name) {
    this.personId = personId;
    this.name = name;
    this.roles = new Map();
    this.history = [];
  }

  assignRole(role) {
    this.roles.set(role.roleName, role);
    this.history.push({ action: 'assigned', role: role.roleName, timestamp: new Date().toISOString() });
  }

  revokeRole(roleName) {
    if (this.roles.has(roleName)) {
      this.roles.delete(roleName);
      this.history.push({ action: 'revoked', role: roleName, timestamp: new Date().toISOString() });
    }
  }

  hasRole(roleName) {
    return this.roles.has(roleName);
  }

  getRole(roleName) {
    return this.roles.get(roleName);
  }

  canPerform(action) {
    for (const role of this.roles.values()) {
      if (role.canPerform(action)) return true;
    }
    return false;
  }

  getRoleNames() {
    return Array.from(this.roles.keys());
  }
}

// Usage
const person = new Person('P-001', 'Alice');
person.assignRole(new CustomerRole(100));
person.assignRole(new EmployeeRole('Sales', 75000));

console.log('Roles:', person.getRoleNames());
console.log('Can browse:', person.canPerform('browse'));
console.log('Can refund:', person.canPerform('refund'));

const empRole = person.getRole('employee');
if (empRole) console.log(empRole.processRefund('ORD-123'));

person.revokeRole('customer');
console.log('Roles after revoke:', person.getRoleNames());
```

## Explanation

The Role Pattern separates identity from behavior:

- **Entity (Person)**: The stable core identity with an ID and name
- **Role (CustomerRole, EmployeeRole)**: Behavior attached dynamically to the entity
- **Role Manager**: Stores roles, checks permissions, and tracks transitions

This avoids inheritance chains like `CustomerEmployeePerson extends Person` and instead composes roles at runtime.

## Variants

| Variant | Mechanism | Use Case |
|---------|-----------|----------|
| **Role Object** | Separate role instances attached to entity | DDD, authorization |
| **Trait/Mixin** | Language-level composition | Scala traits, Ruby modules |
| **RBAC** | Roles with permissions matrix | Enterprise authorization |
| **State Machine** | Roles as states with transitions | Workflow engines |

## Best Practices

- **Keep the entity thin.** The entity should only hold identity and role management.
- **Make roles stateful when needed.** A `CustomerRole` can track loyalty points.
- **Audit role changes.** Security and compliance often require role transition logs.
- **Avoid role overlap confusion.** If two roles grant the same permission, document the resolution strategy.
- **Use value objects for role data.** Immutable role data should not be mutated directly.

## Common Mistakes

- **Using inheritance for roles.** `Employee extends Person` does not allow a person to also be a customer.
- **God entity.** The entity class accumulates fields for every possible role.
- **Role permission conflicts.** Two roles grant conflicting permissions with no resolution rule.
- **Not cleaning up on role revocation.** Resources held by a role should be released when revoked.
- **Storing role-specific data on the entity.** Customer loyalty points belong in `CustomerRole`, not `Person`.

## Real-World Examples

### RBAC (Role-Based Access Control)

Enterprise systems assign users to roles (Admin, Editor, Viewer) rather than granting permissions directly. The Role Pattern is the implementation basis for RBAC.

### DDD Aggregates

In Domain-Driven Design, a `Person` entity may hold `Customer` and `Employee` value objects as roles within a bounded context.

### Game Characters

Game entities often have role components: `WarriorRole`, `MerchantRole`, `QuestGiverRole` that are attached to a base `Character` entity.

## Frequently Asked Questions

**Q: What is the difference between Role and Strategy?**
A: Strategy swaps algorithmic behavior. Role swaps identity and capability. A person can have multiple roles simultaneously; typically only one strategy is active.

**Q: Can an entity have multiple instances of the same role?**
A: Usually no (one `employee` role per person), but some domains allow it (multiple vendor contracts). Use a list if needed.

**Q: How does this relate to RBAC?**
A: RBAC is the authorization application of the Role Pattern. RBAC adds a permission layer on top of role assignment.
