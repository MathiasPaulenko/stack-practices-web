---
contentType: patterns
slug: specification-pattern
title: "Patrón Specification"
description: "Encapsula reglas de negocio para seleccionar objetos como objetos predicado reutilizables y componibles que pueden combinarse con operadores lógicos."
metaDescription: "Aprende el Patrón Specification para predicados de query componibles. Ejemplos en Python, Java y JavaScript con combinadores AND, OR, NOT e integración con repository."
difficulty: intermediate
topics:
  - design
  - databases
tags:
  - specification
  - pattern
  - design-pattern
  - structural
  - query
  - composition
  - filtering
relatedResources:
  - /patterns/design/data-mapper-pattern
  - /patterns/design/repository-pattern
  - /patterns/design/eager-loading-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Specification para predicados de query componibles. Ejemplos en Python, Java y JavaScript con combinadores AND, OR, NOT e integración con repository."
  keywords:
    - specification pattern
    - design pattern
    - query
    - composition
    - filtering
---

# Patrón Specification

## Descripción General

El Patrón Specification encapsula reglas de negocio para seleccionar objetos como objetos predicado reutilizables y componibles. En lugar de hard-codear condiciones de query en repositories o servicios, cada regla es encapsulada en una clase Specification que puede combinarse con otras usando operadores lógicos (AND, OR, NOT).

Este patrón es particularmente capaz para validación y querying. Una `OverdueInvoiceSpecification` puede reutilizarse tanto para encontrar facturas vencidas como para validar si una sola factura está vencida. Las specifications pueden encadenarse: `isOverdue AND isHighValue AND isFromVIPCustomer`.

## Cuándo Usar

Usa el Patrón Specification cuando:
- La misma lógica de selección es necesaria en múltiples lugares (queries, validación, notificaciones)
- Reglas de negocio necesitan ser combinadas dinámicamente
- Quieres mantener lógica de query fuera de repositories y servicios
- Reglas de dominio complejas gobiernan qué objetos son válidos o relevantes

## Cuándo Evitar

- Queries simples que solo se usan una vez (over-engineering)
- Cuando specifications se vuelven wrappers anémicos de expresiones booleanas
- Paths críticos de performance donde abstracción agrega overhead
- Equipos no familiarizados con el patrón (curva de aprendizaje pronunciada para beneficio simple)

## Solución

### Python

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List

@dataclass
class Invoice:
    id: int
    amount: float
    due_date: datetime
    paid: bool = False
    customer_tier: str = "standard"


class Specification(ABC):
    @abstractmethod
    def is_satisfied_by(self, candidate) -> bool:
        pass

    def __and__(self, other: 'Specification'):
        return AndSpecification(self, other)

    def __or__(self, other: 'Specification'):
        return OrSpecification(self, other)

    def __invert__(self):
        return NotSpecification(self)


class AndSpecification(Specification):
    def __init__(self, left: Specification, right: Specification):
        self._left = left
        self._right = right

    def is_satisfied_by(self, candidate) -> bool:
        return self._left.is_satisfied_by(candidate) and self._right.is_satisfied_by(candidate)


class OrSpecification(Specification):
    def __init__(self, left: Specification, right: Specification):
        self._left = left
        self._right = right

    def is_satisfied_by(self, candidate) -> bool:
        return self._left.is_satisfied_by(candidate) or self._right.is_satisfied_by(candidate)


class NotSpecification(Specification):
    def __init__(self, spec: Specification):
        self._spec = spec

    def is_satisfied_by(self, candidate) -> bool:
        return not self._spec.is_satisfied_by(candidate)


# Specifications concretas
class OverdueSpecification(Specification):
    def is_satisfied_by(self, invoice: Invoice) -> bool:
        return not invoice.paid and invoice.due_date < datetime.now()


class HighValueSpecification(Specification):
    def __init__(self, threshold: float = 1000):
        self._threshold = threshold

    def is_satisfied_by(self, invoice: Invoice) -> bool:
        return invoice.amount >= self._threshold


class VIPCustomerSpecification(Specification):
    def is_satisfied_by(self, invoice: Invoice) -> bool:
        return invoice.customer_tier == "vip"


class InvoiceRepository:
    def __init__(self, invoices: List[Invoice]):
        self._invoices = invoices

    def find(self, spec: Specification) -> List[Invoice]:
        return [inv for inv in self._invoices if spec.is_satisfied_by(inv)]


# Uso
invoices = [
    Invoice(1, 500, datetime.now() - timedelta(days=10), customer_tier="vip"),
    Invoice(2, 2000, datetime.now() - timedelta(days=5), paid=True, customer_tier="vip"),
    Invoice(3, 3000, datetime.now() - timedelta(days=20), customer_tier="standard"),
    Invoice(4, 1500, datetime.now() - timedelta(days=15), customer_tier="vip"),
]

repo = InvoiceRepository(invoices)

overdue = OverdueSpecification()
high_value = HighValueSpecification(1000)
vip = VIPCustomerSpecification()

# Componer: overdue AND high_value AND vip
critical = overdue & high_value & vip
results = repo.find(critical)
for inv in results:
    print(f"Factura crítica: #{inv.id}, ${inv.amount}")
```

### Java

```java
import java.time.LocalDateTime;
import java.util.*;

public class Invoice {
    private final int id;
    private final double amount;
    private final LocalDateTime dueDate;
    private final boolean paid;
    private final String customerTier;

    public Invoice(int id, double amount, LocalDateTime dueDate, boolean paid, String customerTier) {
        this.id = id; this.amount = amount; this.dueDate = dueDate;
        this.paid = paid; this.customerTier = customerTier;
    }
    public int getId() { return id; }
    public double getAmount() { return amount; }
    public LocalDateTime getDueDate() { return dueDate; }
    public boolean isPaid() { return paid; }
    public String getCustomerTier() { return customerTier; }
}

interface Specification<T> {
    boolean isSatisfiedBy(T candidate);

    default Specification<T> and(Specification<T> other) {
        return c -> this.isSatisfiedBy(c) && other.isSatisfiedBy(c);
    }
    default Specification<T> or(Specification<T> other) {
        return c -> this.isSatisfiedBy(c) || other.isSatisfiedBy(c);
    }
    default Specification<T> not() {
        return c -> !this.isSatisfiedBy(c);
    }
}

class OverdueSpecification implements Specification<Invoice> {
    public boolean isSatisfiedBy(Invoice invoice) {
        return !invoice.isPaid() && invoice.getDueDate().isBefore(LocalDateTime.now());
    }
}

class HighValueSpecification implements Specification<Invoice> {
    private final double threshold;
    public HighValueSpecification(double threshold) { this.threshold = threshold; }
    public boolean isSatisfiedBy(Invoice invoice) {
        return invoice.getAmount() >= threshold;
    }
}

class VIPCustomerSpecification implements Specification<Invoice> {
    public boolean isSatisfiedBy(Invoice invoice) {
        return "vip".equals(invoice.getCustomerTier());
    }
}

class InvoiceRepository {
    private final List<Invoice> invoices;
    public InvoiceRepository(List<Invoice> invoices) { this.invoices = invoices; }

    public List<Invoice> find(Specification<Invoice> spec) {
        return invoices.stream().filter(spec::isSatisfiedBy).toList();
    }
}

// Uso
List<Invoice> invoices = List.of(
    new Invoice(1, 500, LocalDateTime.now().minusDays(10), false, "vip"),
    new Invoice(2, 2000, LocalDateTime.now().minusDays(5), true, "vip"),
    new Invoice(3, 3000, LocalDateTime.now().minusDays(20), false, "standard"),
    new Invoice(4, 1500, LocalDateTime.now().minusDays(15), false, "vip")
);

InvoiceRepository repo = new InvoiceRepository(invoices);
Specification<Invoice> critical = new OverdueSpecification()
    .and(new HighValueSpecification(1000))
    .and(new VIPCustomerSpecification());

for (Invoice inv : repo.find(critical)) {
    System.out.println("Factura crítica: #" + inv.getId() + ", $" + inv.getAmount());
}
```

### JavaScript

```javascript
class Invoice {
  constructor(id, amount, dueDate, paid = false, customerTier = 'standard') {
    this.id = id;
    this.amount = amount;
    this.dueDate = dueDate;
    this.paid = paid;
    this.customerTier = customerTier;
  }
}

class Specification {
  isSatisfiedBy(candidate) {
    throw new Error('Must implement isSatisfiedBy');
  }

  and(other) {
    return new AndSpecification(this, other);
  }

  or(other) {
    return new OrSpecification(this, other);
  }

  not() {
    return new NotSpecification(this);
  }
}

class AndSpecification extends Specification {
  constructor(left, right) {
    super();
    this.left = left;
    this.right = right;
  }

  isSatisfiedBy(candidate) {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }
}

class OrSpecification extends Specification {
  constructor(left, right) {
    super();
    this.left = left;
    this.right = right;
  }

  isSatisfiedBy(candidate) {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
  }
}

class NotSpecification extends Specification {
  constructor(spec) {
    super();
    this.spec = spec;
  }

  isSatisfiedBy(candidate) {
    return !this.spec.isSatisfiedBy(candidate);
  }
}

class OverdueSpecification extends Specification {
  isSatisfiedBy(invoice) {
    return !invoice.paid && invoice.dueDate < new Date();
  }
}

class HighValueSpecification extends Specification {
  constructor(threshold = 1000) {
    super();
    this.threshold = threshold;
  }

  isSatisfiedBy(invoice) {
    return invoice.amount >= this.threshold;
  }
}

class VIPCustomerSpecification extends Specification {
  isSatisfiedBy(invoice) {
    return invoice.customerTier === 'vip';
  }
}

class InvoiceRepository {
  constructor(invoices) {
    this.invoices = invoices;
  }

  find(spec) {
    return this.invoices.filter(inv => spec.isSatisfiedBy(inv));
  }
}

// Uso
const invoices = [
  new Invoice(1, 500, new Date(Date.now() - 10 * 86400000), false, 'vip'),
  new Invoice(2, 2000, new Date(Date.now() - 5 * 86400000), true, 'vip'),
  new Invoice(3, 3000, new Date(Date.now() - 20 * 86400000), false, 'standard'),
  new Invoice(4, 1500, new Date(Date.now() - 15 * 86400000), false, 'vip'),
];

const repo = new InvoiceRepository(invoices);
const overdue = new OverdueSpecification();
const highValue = new HighValueSpecification(1000);
const vip = new VIPCustomerSpecification();

const critical = overdue.and(highValue).and(vip);
for (const inv of repo.find(critical)) {
  console.log(`Factura crítica: #${inv.id}, $${inv.amount}`);
}
```

## Explicación

El Patrón Specification separa el "qué" (reglas de negocio) del "dónde" (queries de repository):

- **Specification**: Encapsula una única regla de negocio como predicado
- **Composite Specifications**: Combina specifications básicas con AND, OR, NOT
- **Repository**: Usa una specification para filtrar su colección
- **Validación**: La misma specification valida un único objeto candidato

Esto permite que las reglas se definan una vez y se reutilicen a través de queries, validación y lógica condicional.

## Variantes

| Variante | Feature | Caso de Uso |
|----------|---------|-------------|
| **Basic** | Single método `isSatisfiedBy` | Validación en memoria |
| **Parameterized** | Constructor acepta thresholds | Reutilizable con diferentes límites |
| **SQL Generating** | Convierte a cláusula WHERE | Empujar specs a la base de datos |
| **Visitor-based** | Recorre el árbol de specification | Optimización de query, serialización |

## Lo que funciona

- **Haz specifications inmutables.** Sin cambios de estado después de construcción.
- **Nómbralas como adjetivos.** `Overdue`, `HighValue`, `VIP` — no `CheckIfOverdue`.
- **Usa con Repository.** El repository aplica la spec; la spec define la regla.
- **Testea specifications en aislamiento.** Son predicados puros y fáciles de unit testear.
- **Evita side effects.** Specifications solo deberían leer, nunca mutar.

## Errores Comunes

- **Specifications anémicas.** Si una spec solo envuelve `x > 5`, inlineala en su lugar.
- **Acoplamiento fuerte a la base de datos.** Specs en memoria no deberían importar librerías SQL.
- **Combinación excesiva.** `a AND b AND c AND d AND e` es difícil de debuggear. Considera una composite spec dedicada.
- **Negligenciar generación SQL.** Para datasets grandes, filtrado en memoria es muy lento. Traduce specs a cláusulas WHERE.
- **Specifications con estado.** Una spec que cambia comportamiento basado en estado externo es impredecible.

## Ejemplos del Mundo Real

### Domain-Driven Design

El patrón fue formalizado por Eric Evans en Domain-Driven Design. Los equipos usan specifications para queries de dominio complejo como `isEligibleForDiscount`, `meetsComplianceRequirements`.

### Spring Data JPA

La interfaz `Specification<T>` de Spring Data extiende la API `Criteria` de JPA, permitiendo queries type-safe y componibles.

### NHibernate / Hibernate Criteria

La API Criteria permite componer restricciones (`Restrictions.and`, `Restrictions.or`) que espejan el Patrón Specification.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Specification y Strategy?**
A: Strategy alterna entre algoritmos intercambiables. Specification encapsula un predicado para selección/validación. Pueden solaparse, pero su intención difiere.

**Q: Pueden las specifications generar SQL?**
A: Sí. Implementaciones avanzadas incluyen un método `toSql()` o `toPredicate()` que convierte la spec en una cláusula de query de base de datos.

**Q: Cuándo debería usar Specification vs. un lambda simple?**
A: Usa Specification cuando el predicado es reutilizado, combinado con otros, o necesita un nombre que transmita significado de dominio.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
