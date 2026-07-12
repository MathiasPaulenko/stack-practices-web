---


contentType: patterns
slug: specification-pattern
title: "Specification Pattern"
description: "Encapsulate business rules for selecting objects as reusable, composable predicate objects that can be combined with logical operators."
metaDescription: "Learn the Specification Pattern for composable query predicates. Examples in Python, Java, and JavaScript with AND, OR, NOT combinators and repository integration."
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
  - /patterns/data-mapper-pattern
  - /patterns/repository-pattern
  - /patterns/eager-loading-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Specification Pattern for composable query predicates. Examples in Python, Java, and JavaScript with AND, OR, NOT combinators and repository integration."
  keywords:
    - specification pattern
    - design pattern
    - query
    - composition
    - filtering


---

# Specification Pattern

## Overview

The Specification Pattern encapsulates business rules for selecting objects as reusable, composable predicate objects. Instead of hard-coding query conditions in repositories or services, each rule is encapsulated in a Specification class that can be combined with others using logical operators (AND, OR, NOT).

This pattern is particularly capable for validation and querying. A `OverdueInvoiceSpecification` can be reused both to find overdue invoices and to validate whether a single invoice is overdue. Specifications can be chained: `isOverdue AND isHighValue AND isFromVIPCustomer`.

## When to Use


- For alternatives, see [Composite Entity Pattern](/patterns/composite-entity-pattern/).

Use the Specification Pattern when:
- The same selection logic is needed in multiple places (queries, validation, notifications)
- Business rules need to be combined dynamically
- You want to keep query logic out of repositories and services
- Complex domain rules govern which objects are valid or relevant

## When to Avoid

- Simple queries that are only used once (over-engineering)
- When specifications become anemic wrappers around boolean expressions
- Performance-critical paths where abstraction adds overhead
- Teams unfamiliar with the pattern (steep learning curve for simple benefit)

## Solution

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


# Concrete specifications
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


# Usage
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

# Compose: overdue AND high_value AND vip
critical = overdue & high_value & vip
results = repo.find(critical)
for inv in results:
    print(f"Critical invoice: #{inv.id}, ${inv.amount}")
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

// Usage
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
    System.out.println("Critical invoice: #" + inv.getId() + ", $" + inv.getAmount());
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

// Usage
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
  console.log(`Critical invoice: #${inv.id}, $${inv.amount}`);
}
```

## Explanation

The Specification Pattern separates the "what" (business rules) from the "where" (repository queries):

- **Specification**: Encapsulates a single business rule as a predicate
- **Composite Specifications**: Combine basic specifications with AND, OR, NOT
- **Repository**: Uses a specification to filter its collection
- **Validation**: The same specification validates a single candidate object

This allows rules to be defined once and reused across queries, validation, and conditional logic.

## Variants

| Variant | Feature | Use Case |
|---------|---------|----------|
| **Basic** | Single `isSatisfiedBy` method | In-memory validation |
| **Parameterized** | Constructor accepts thresholds | Reusable with different limits |
| **SQL Generating** | Converts to WHERE clause | Pushing specs to the database |
| **Visitor-based** | Walks the specification tree | Query optimization, serialization |

## What Works

- **Make specifications immutable.** No state changes after construction.
- **Name them as adjectives.** `Overdue`, `HighValue`, `VIP` — not `CheckIfOverdue`.
- **Use with Repository.** The repository applies the spec; the spec defines the rule.
- **Test specifications in isolation.** They are pure predicates and easy to unit test.
- **Avoid side effects.** Specifications should only read, never mutate.

## Common Mistakes

- **Anemic specifications.** If a spec just wraps `x > 5`, inline it instead.
- **Tight coupling to the database.** In-memory specs should not import SQL libraries.
- **Over-combining.** `a AND b AND c AND d AND e` is hard to debug. Consider a dedicated composite spec.
- **Neglecting SQL generation.** For large datasets, in-memory filtering is too slow. Translate specs to WHERE clauses.
- **Specifications with state.** A spec that changes behavior based on external state is unpredictable.

## Real-World Examples

### Domain-Driven Design

The pattern was formalized by Eric Evans in Domain-Driven Design. Teams use specifications for complex domain queries like `isEligibleForDiscount`, `meetsComplianceRequirements`.

### Spring Data JPA

Spring Data's `Specification<T>` interface extends JPA's `Criteria` API, allowing type-safe, composable queries.

### NHibernate / Hibernate Criteria

The Criteria API lets you compose restrictions (`Restrictions.and`, `Restrictions.or`) that mirror the Specification Pattern.

## Frequently Asked Questions

**Q: What is the difference between Specification and Strategy?**
A: Strategy switches between interchangeable algorithms. Specification encapsulates a predicate for selection/validation. They can overlap, but their intent differs.

**Q: Can specifications generate SQL?**
A: Yes. Advanced implementations include a `toSql()` or `toPredicate()` method that converts the spec into a database query clause.

**Q: When should I use Specification vs. a simple lambda?**
A: Use Specification when the predicate is reused, combined with others, or needs a name that conveys domain meaning.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
