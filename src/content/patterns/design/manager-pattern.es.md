---
contentType: patterns
slug: manager-pattern
title: "Patrón Manager"
description: "Encapsula el ciclo de vida, coordinación y control de acceso para un conjunto de objetos relacionados a través de una clase manager dedicada que centraliza operaciones y fuerza invariantes."
metaDescription: "Aprende el Patrón Manager para lifecycle y coordinación de objetos. Ejemplos en Python, Java y JavaScript con pools de recursos, entity managers y service registries."
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
  metaDescription: "Aprende el Patrón Manager para lifecycle y coordinación de objetos. Ejemplos en Python, Java y JavaScript con pools de recursos, entity managers y service registries."
  keywords:
    - manager pattern
    - design pattern
    - architecture
    - coordination
    - lifecycle
---

# Patrón Manager

## Descripción General

El Patrón Manager encapsula el ciclo de vida, coordinación y control de acceso para un conjunto de objetos relacionados a través de una clase manager dedicada. En lugar de dispersar la lógica de creación, búsqueda y limpieza de objetos a través del codebase, un manager centraliza estas operaciones y fuerza invariantes.

Este patrón es uno de los más comunes en desarrollo de software, aunque a menudo no se nombra. Los entity managers en ORMs, resource managers en juegos, connection managers en redes, y service managers en microservicios todos siguen este patrón. El manager actúa como punto de contacto único para operaciones sobre una colección de objetos gestionados.

## Cuándo Usar

Usa el Patrón Manager cuando:
- Un grupo de objetos relacionados necesita gestión centralizada de ciclo de vida
- Necesitas forzar constraints o invariantes a través de una colección de objetos
- Los objetos deberían ser buscados por ID o clave en lugar de referencia directa
- Los recursos necesitan pooling, caching o reuso (conexiones, threads, sprites)

## Cuándo Evitar

- Objetos únicos que no necesitan coordinación con pares
- Cuando una simple colección o arreglo basta
- El manager se convierte en God object manejando responsabilidades no relacionadas
- Inyección de dependencias y service registries proveen la misma coordinación nativamente

## Solución

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
    """Centraliza lifecycle y operaciones para objetos Employee"""
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


# Uso
manager = EmployeeManager()
emp1 = manager.hire("Alice", "Engineering", 120000)
emp2 = manager.hire("Bob", "Engineering", 95000)
emp3 = manager.hire("Carol", "Sales", 80000)

print(f"Total nómina: ${manager.total_payroll():,.2f}")
print(f"Equipo Engineering: {[e.name for e in manager.list_by_department('Engineering')]}")
manager.give_raise(emp1.id, 10)
print(f"Nuevo salario de Alice: ${manager.get(emp1.id).salary:,.2f}")
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

// Uso
EmployeeManager manager = new EmployeeManager();
Employee alice = manager.hire("Alice", "Engineering", 120000);
manager.hire("Bob", "Engineering", 95000);
System.out.println("Total nómina: $" + manager.totalPayroll());
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

// Uso
const manager = new EmployeeManager();
const alice = manager.hire('Alice', 'Engineering', 120000);
manager.hire('Bob', 'Engineering', 95000);
manager.hire('Carol', 'Sales', 80000);

console.log('Total nómina:', manager.totalPayroll());
console.log('Engineering:', manager.listByDepartment('Engineering').map(e => e.name));
```

## Explicación

El Patrón Manager centraliza la responsabilidad para un dominio de objetos:

- **Creación**: `hire()` instancia y registra objetos
- **Búsqueda**: `get()` y `list_by_department()` proveen acceso por query
- **Mutación**: `give_raise()` modifica objetos gestionados a través del manager
- **Limpieza**: `fire()` remueve objetos y mantiene índices

El manager mantiene índices (department → employee IDs) para hacer queries eficientes sin exponer el almacenamiento interno directamente a los clientes.

## Variantes

| Variante | Responsabilidad | Ejemplo |
|----------|---------------|---------|
| **Entity Manager** | CRUD + queries | JPA EntityManager, Django ORM Manager |
| **Resource Manager** | Pooling y reuso | Connection pools, thread pools |
| **Scene Manager** | Lifecycle en juegos | Unity SceneManager, game object managers |
| **Service Manager** | Registry y lookup | Android ServiceManager, plugin registries |
| **Cache Manager** | Eviction y TTL | Redis cache wrappers, in-memory caches |

## Lo que funciona

- **Mantén managers enfocados.** Un manager debería manejar un tipo de objeto, no todo.
- **Retorna vistas inmutables.** No expongas colecciones internas directamente.
- **Mantiene consistencia.** Las actualizaciones al store primario deberían actualizar todos los índices.
- **Soporta operaciones batch.** `hire_many()`, `fire_all_in_department()` son comunes.
- **Considera thread safety.** Usa `ConcurrentHashMap` o locks para managers compartidos.

## Errores Comunes

- **El manager se convierte en God class.** Si maneja objetos no relacionados, splitea.
- **Exponer estado interno.** Retornar referencias modificables rompe encapsulación.
- **Olvidar limpiar índices.** Un índice stale causa bugs silenciosos.
- **I/O síncrono dentro de métodos de manager.** Offload trabajo bloqueante en contextos async.
- **Sobre-gestionar objetos simples.** Arrays y sets están bien para casos a pequeña escala.

## Ejemplos del Mundo Real

### EntityManager (JPA)

El `EntityManager` de JPA es un database manager: persiste, encuentra, mergea y remueve entidades mientras gestiona transacciones y caching.

### Android ServiceManager

El `ServiceManager` de Android registra y busca system services por nombre, actuando como registro central para servicios a nivel de OS.

### Game Object Managers

Los game engines usan managers para sprites, partículas, physics bodies y audio sources. Cada manager maneja creación, updates y destrucción de su tipo de objeto.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Manager y Repository?**
A: Un Repository es una abstracción de persistencia (DDD). Un Manager es más amplio: maneja lifecycle, coordinación y a veces reglas de negocio, no solo almacenamiento.

**Q: Puede un manager ser singleton?**
A: Sí, los managers son a menudo singletons cuando representan una única fuente de verdad para un tipo de recurso. Usa inyección de dependencias en lugar de estado global donde sea posible.

**Q: Los managers deberían contener lógica de negocio?**
A: La coordinación básica (indexing, validación) está bien. Las reglas de negocio complejas deberían vivir en domain services o use cases, no en el manager mismo.
