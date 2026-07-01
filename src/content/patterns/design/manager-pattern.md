---
contentType: patterns
slug: manager-pattern
title: "Manager Pattern"
description: "Encapsulate lifecycle, coordination, and access control for a set of related objects through a dedicated manager class that centralizes operations and enforces invariants."
metaDescription: "Learn the Manager Pattern for object lifecycle and coordination. Examples in Python, Java, and JavaScript with resource pools, entity managers, and service registries."
difficulty: beginner
topics:
  - design
  - architecture
tags:
  - manager
  - pattern
  - design-pattern
  - behavioral
  - architecture
  - coordination
  - lifecycle
relatedResources:
  - /patterns/design/facade-pattern
  - /patterns/design/singleton-pattern
  - /patterns/design/dependency-injection-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Manager Pattern for object lifecycle and coordination. Examples in Python, Java, and JavaScript with resource pools, entity managers, and service registries."
  keywords:
    - manager pattern
    - design pattern
    - architecture
    - coordination
    - lifecycle
---

# Manager Pattern

## Overview

The Manager Pattern encapsulates the lifecycle, coordination, and access control for a set of related objects through a dedicated manager class. Rather than scattering object creation, lookup, and cleanup logic across the codebase, a manager centralizes these operations and enforces invariants.

This pattern is one of the most common in software development, though it often goes unnamed. Entity managers in ORMs, resource managers in games, connection managers in networking, and service managers in microservices all follow this pattern. The manager acts as the single point of contact for operations on a collection of managed objects.

## When to Use

Use the Manager Pattern when:
- A group of related objects needs centralized lifecycle management
- You need to enforce constraints or invariants across a collection of objects
- Objects should be looked up by ID or key rather than direct reference
- Resources need pooling, caching, or reuse (connections, threads, sprites)

## When to Avoid

- Single objects that do not need coordination with peers
- When a simple collection or array suffices
- The manager becomes a God object handling unrelated responsibilities
- Dependency injection and service registries provide the same coordination natively

## Solution

### Python

```python
from typing import Dict, List, Optional
from dataclasses import dataclass, field
import uuid

@dataclass
class Employee:
    name: str
    department: str
    salary: float
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    active: bool = True


class EmployeeManager:
    """Centralizes lifecycle and operations for Employee objects"""
    def __init__(self):
        self._employees: Dict[str, Employee] = {}
        self._department_index: Dict[str, List[str]] = {}

    def hire(self, name: str, department: str, salary: float) -> Employee:
        emp = Employee(name=name, department=department, salary=salary)
        self._employees[emp.id] = emp
        self._department_index.setdefault(department, []).append(emp.id)
        return emp

    def get(self, emp_id: str) -> Optional[Employee]:
        return self._employees.get(emp_id)

    def fire(self, emp_id: str) -> bool:
        emp = self._employees.get(emp_id)
        if emp:
            emp.active = False
            self._department_index[emp.department].remove(emp_id)
            del self._employees[emp_id]
            return True
        return False

    def list_by_department(self, department: str) -> List[Employee]:
        ids = self._department_index.get(department, [])
        return [self._employees[eid] for eid in ids if eid in self._employees]

    def total_payroll(self) -> float:
        return sum(emp.salary for emp in self._employees.values() if emp.active)

    def give_raise(self, emp_id: str, percentage: float) -> bool:
        emp = self._employees.get(emp_id)
        if emp:
            emp.salary *= (1 + percentage / 100)
            return True
        return False


# Usage
manager = EmployeeManager()
emp1 = manager.hire("Alice", "Engineering", 120000)
emp2 = manager.hire("Bob", "Engineering", 95000)
emp3 = manager.hire("Carol", "Sales", 80000)

print(f"Total payroll: ${manager.total_payroll():,.2f}")
print(f"Engineering team: {[e.name for e in manager.list_by_department('Engineering')]}")
manager.give_raise(emp1.id, 10)
print(f"Alice's new salary: ${manager.get(emp1.id).salary:,.2f}")
```

### Java

```java
import java.util.*;

class Employee {
    private final String id;
    private String name;
    private String department;
    private double salary;
    private boolean active = true;

    public Employee(String name, String department, double salary) {
        this.id = UUID.randomUUID().toString().substring(0, 8);
        this.name = name;
        this.department = department;
        this.salary = salary;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getDepartment() { return department; }
    public double getSalary() { return salary; }
    public void setSalary(double salary) { this.salary = salary; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}

class EmployeeManager {
    private final Map<String, Employee> employees = new HashMap<>();
    private final Map<String, List<String>> deptIndex = new HashMap<>();

    public Employee hire(String name, String department, double salary) {
        Employee emp = new Employee(name, department, salary);
        employees.put(emp.getId(), emp);
        deptIndex.computeIfAbsent(department, k -> new ArrayList<>()).add(emp.getId());
        return emp;
    }

    public Employee get(String id) { return employees.get(id); }

    public boolean fire(String id) {
        Employee emp = employees.get(id);
        if (emp != null) {
            emp.setActive(false);
            deptIndex.getOrDefault(emp.getDepartment(), new ArrayList<>()).remove(id);
            employees.remove(id);
            return true;
        }
        return false;
    }

    public List<Employee> listByDepartment(String department) {
        List<String> ids = deptIndex.getOrDefault(department, List.of());
        List<Employee> result = new ArrayList<>();
        for (String id : ids) {
            Employee emp = employees.get(id);
            if (emp != null && emp.isActive()) result.add(emp);
        }
        return result;
    }

    public double totalPayroll() {
        return employees.values().stream()
            .filter(Employee::isActive)
            .mapToDouble(Employee::getSalary)
            .sum();
    }
}

// Usage
EmployeeManager manager = new EmployeeManager();
Employee alice = manager.hire("Alice", "Engineering", 120000);
manager.hire("Bob", "Engineering", 95000);
System.out.println("Total payroll: $" + manager.totalPayroll());
```

### JavaScript

```javascript
class Employee {
  constructor(name, department, salary) {
    this.id = Math.random().toString(36).substring(2, 10);
    this.name = name;
    this.department = department;
    this.salary = salary;
    this.active = true;
  }
}

class EmployeeManager {
  constructor() {
    this.employees = new Map();
    this.deptIndex = new Map();
  }

  hire(name, department, salary) {
    const emp = new Employee(name, department, salary);
    this.employees.set(emp.id, emp);
    if (!this.deptIndex.has(department)) {
      this.deptIndex.set(department, []);
    }
    this.deptIndex.get(department).push(emp.id);
    return emp;
  }

  get(id) {
    return this.employees.get(id);
  }

  fire(id) {
    const emp = this.employees.get(id);
    if (emp) {
      emp.active = false;
      const dept = this.deptIndex.get(emp.department) || [];
      const idx = dept.indexOf(id);
      if (idx > -1) dept.splice(idx, 1);
      this.employees.delete(id);
      return true;
    }
    return false;
  }

  listByDepartment(department) {
    const ids = this.deptIndex.get(department) || [];
    return ids.map(id => this.employees.get(id)).filter(e => e && e.active);
  }

  totalPayroll() {
    let total = 0;
    for (const emp of this.employees.values()) {
      if (emp.active) total += emp.salary;
    }
    return total;
  }

  giveRaise(id, percentage) {
    const emp = this.employees.get(id);
    if (emp) {
      emp.salary *= (1 + percentage / 100);
      return true;
    }
    return false;
  }
}

// Usage
const manager = new EmployeeManager();
const alice = manager.hire('Alice', 'Engineering', 120000);
manager.hire('Bob', 'Engineering', 95000);
manager.hire('Carol', 'Sales', 80000);

console.log('Total payroll:', manager.totalPayroll());
console.log('Engineering:', manager.listByDepartment('Engineering').map(e => e.name));
```

## Explanation

The Manager Pattern centralizes responsibility for a domain of objects:

- **Creation**: `hire()` instantiates and registers objects
- **Lookup**: `get()` and `list_by_department()` provide query access
- **Mutation**: `give_raise()` modifies managed objects through the manager
- **Cleanup**: `fire()` removes objects and maintains indexes

The manager maintains indexes (department → employee IDs) to make queries efficient without exposing the internal storage directly to clients.

## Variants

| Variant | Responsibility | Example |
|---------|--------------|---------|
| **Entity Manager** | CRUD + queries | JPA EntityManager, Django ORM Manager |
| **Resource Manager** | Pooling and reuse | Database connection pools, thread pools |
| **Scene Manager** | Lifecycle in games | Unity SceneManager, game object managers |
| **Service Manager** | Registry and lookup | Android ServiceManager, plugin registries |
| **Cache Manager** | Eviction and TTL | Redis cache wrappers, in-memory caches |

## What Works

- **Keep managers focused.** A manager should handle one type of object, not everything.
- **Return immutable views.** Do not expose internal collections directly.
- **Maintain consistency.** Updates to the primary store should update all indexes.
- **Support batch operations.** `hire_many()`, `fire_all_in_department()` are common.
- **Consider thread safety.** Use `ConcurrentHashMap` or locks for shared managers.

## Common Mistakes

- **The manager becomes a God class.** If it manages unrelated objects, split it.
- **Exposing internal state.** Returning modifiable references breaks encapsulation.
- **Forgetting to clean up indexes.** A stale index causes silent bugs.
- **Synchronous I/O inside manager methods.** Offload blocking work in async contexts.
- **Over-managing simple objects.** Arrays and sets are fine for small-scale cases.

## Real-World Examples

### EntityManager (JPA)

JPA's `EntityManager` is a database manager: it persists, finds, merges, and removes entities while managing transactions and caching.

### Android ServiceManager

Android's `ServiceManager` registers and looks up system services by name, acting as a central registry for OS-level services.

### Game Object Managers

Game engines use managers for sprites, particles, physics bodies, and audio sources. Each manager handles creation, updates, and destruction of its object type.

## Frequently Asked Questions

**Q: What is the difference between Manager and Repository?**
A: A Repository is a persistence abstraction (DDD). A Manager is broader: it handles lifecycle, coordination, and sometimes business rules, not just storage.

**Q: Can a manager be a singleton?**
A: Yes, managers are often singletons when they represent a single source of truth for a resource type. Use dependency injection rather than global state where possible.

**Q: Should managers contain business logic?**
A: Basic coordination (indexing, validation) is fine. Complex business rules should live in domain services or use cases, not the manager itself.
