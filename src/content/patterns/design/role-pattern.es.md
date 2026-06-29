---
contentType: patterns
slug: role-pattern
title: "Patrón Role"
description: "Asigna roles dinámicos a objetos en runtime en lugar de codificar comportamiento en jerarquías de clase, habilitando cambios flexibles de identidad sin bloat de herencia."
metaDescription: "Aprende el Patrón Role para asignación dinámica de comportamiento en runtime. Ejemplos en Python, Java y JavaScript con role objects y entity delegation."
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
  metaDescription: "Aprende el Patrón Role para asignación dinámica de comportamiento en runtime. Ejemplos en Python, Java y JavaScript con role objects y entity delegation."
  keywords:
    - role pattern
    - design pattern
    - dynamic
    - composition
    - ddd
---

# Patrón Role

## Descripción General

El Patrón Role asigna roles dinámicos a objetos en runtime en lugar de codificar comportamiento en jerarquías de clase fijas. En muchos dominios, la misma entidad desempeña diferentes roles en diferentes contextos: una persona puede ser cliente, empleado y vendedor. Usar herencia para cada combinación lleva a una explosión combinatoria de subclases.

El Patrón Role resuelve esto separando la **entidad core** (quién es el objeto) de los **roles** (qué hace el objeto). Los roles pueden adjuntarse, desprenderse y combinarse en runtime, proveendo la flexibilidad de la composición mientras mantiene una identidad clara para la entidad subyacente.

Este patrón es fundamental en Domain-Driven Design (DDD) y se usa en sistemas de autorización (RBAC), motores de workflow y aplicaciones multi-tenant.

## Cuándo Usar

Usa el Patrón Role cuando:
- La misma entidad puede desempeñar múltiples roles en diferentes contextos
- Las combinaciones de rol causarían una explosión combinatoria con herencia
- Los roles necesitan ser asignados, revocados o cambiados en runtime
- Necesitas trackear historial de roles o auditar transiciones de rol

## Cuándo Evitar

- Los roles son estáticos y conocidos en tiempo de compilación (una jerarquía de tipos simple basta)
- El sistema tiene solo uno o dos roles sin overlap
- Introducir objetos de rol agrega indirección sin beneficio claro
- La performance es crítica y el overhead de lookup de rol es inaceptable

## Solución

### Python

```python
from typing import Dict, List, Optional, Protocol
from dataclasses import dataclass
from datetime import datetime

class Role(Protocol):
    """Protocol para roles que pueden adjuntarse a entidades"""
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
        return f"Refund procesado para {order_id}"


@dataclass
class VendorRole:
    role_name: str = "vendor"
    company_name: str = ""
    commission_rate: float = 0.05

    def can_perform(self, action: str) -> bool:
        return action in ["list_products", "manage_inventory", "view_sales"]


class Person:
    """Entidad core que puede tener múltiples roles"""
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


# Uso
person = Person("P-001", "Alice")
person.assign_role(CustomerRole(loyalty_points=100))
person.assign_role(EmployeeRole(department="Sales", salary=75000))

print(f"Roles de Alice: {person.roles}")
print(f"Puede browse: {person.can_perform('browse')}")
print(f"Puede refund: {person.can_perform('refund')}")
print(f"Puede list_products: {person.can_perform('list_products')}")

emp_role = person.get_role("employee")
if emp_role:
    print(emp_role.process_refund("ORD-123"))

person.revoke_role("customer")
print(f"Roles después de revocar: {person.roles}")
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
    public String processRefund(String orderId) { return "Refund procesado para " + orderId; }
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

// Uso
Person person = new Person("P-001", "Alice");
person.assignRole(new CustomerRole());
person.assignRole(new EmployeeRole("Sales", 75000));

System.out.println("Roles: " + person.getRoles());
System.out.println("Puede browse: " + person.canPerform("browse"));
System.out.println("Puede refund: " + person.canPerform("refund"));
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
    return `Refund procesado para ${orderId}`;
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

// Uso
const person = new Person('P-001', 'Alice');
person.assignRole(new CustomerRole(100));
person.assignRole(new EmployeeRole('Sales', 75000));

console.log('Roles:', person.getRoleNames());
console.log('Puede browse:', person.canPerform('browse'));
console.log('Puede refund:', person.canPerform('refund'));

const empRole = person.getRole('employee');
if (empRole) console.log(empRole.processRefund('ORD-123'));

person.revokeRole('customer');
console.log('Roles después de revocar:', person.getRoleNames());
```

## Explicación

El Patrón Role separa identidad de comportamiento:

- **Entity (Person)**: La identidad core estable con un ID y nombre
- **Role (CustomerRole, EmployeeRole)**: Comportamiento adjunto dinámicamente a la entidad
- **Role Manager**: Almacena roles, verifica permisos y trackea transiciones

Esto evita cadenas de herencia como `CustomerEmployeePerson extends Person` y en su lugar compone roles en runtime.

## Variantes

| Variante | Mecanismo | Caso de Uso |
|----------|-----------|-------------|
| **Role Object** | Instancias de rol separadas adjuntas a entidad | DDD, autorización |
| **Trait/Mixin** | Composición a nivel de lenguaje | Traits de Scala, módulos de Ruby |
| **RBAC** | Roles con matriz de permisos | Autorización enterprise |
| **State Machine** | Roles como estados con transiciones | Motores de workflow |

## Lo que Funciona

- **Mantén la entidad thin.** La entidad solo debería tener identidad y gestión de roles.
- **Haz los roles stateful cuando sea necesario.** Un `CustomerRole` puede trackear puntos de lealtad.
- **Audita cambios de rol.** Seguridad y compliance a menudo requieren logs de transiciones de rol.
- **Evita confusiones de overlap de roles.** Si dos roles otorgan el mismo permiso, documenta la estrategia de resolución.
- **Usa value objects para datos de rol.** Los datos inmutables de rol no deberían mutarse directamente.

## Errores Comunes

- **Usar herencia para roles.** `Employee extends Person` no permite que una persona también sea cliente.
- **God entity.** La clase entidad acumula campos para cada posible rol.
- **Conflictos de permisos de rol.** Dos roles otorgan permisos conflictivos sin regla de resolución.
- **No limpiar al revocar rol.** Los recursos retenidos por un rol deberían liberarse cuando se revoca.
- **Almacenar datos específicos de rol en la entidad.** Los puntos de lealtad del cliente pertenecen a `CustomerRole`, no a `Person`.

## Ejemplos del Mundo Real

### RBAC (Role-Based Access Control)

Los sistemas enterprise asignan usuarios a roles (Admin, Editor, Viewer) en lugar de otorgar permisos directamente. El Patrón Role es la base de implementación de RBAC.

### DDD Aggregates

En Domain-Driven Design, una entidad `Person` puede contener objetos de valor `Customer` y `Employee` como roles dentro de un bounded context.

### Personajes de Juegos

Las entidades de juegos a menudo tienen componentes de rol: `WarriorRole`, `MerchantRole`, `QuestGiverRole` que se adjuntan a una entidad base `Character`.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Role y Strategy?**
A: Strategy intercambia comportamiento algorítmico. Role intercambia identidad y capacidad. Una persona puede tener múltiples roles simultáneamente; típicamente solo una strategy está activa.

**Q: Puede una entidad tener múltiples instancias del mismo rol?**
A: Usualmente no (un rol `employee` por persona), pero algunos dominios lo permiten (múltiples contratos de vendor). Usa una lista si es necesario.

**Q: Cómo se relaciona esto con RBAC?**
A: RBAC es la aplicación de autorización del Patrón Role. RBAC agrega una capa de permisos sobre la asignación de roles.
