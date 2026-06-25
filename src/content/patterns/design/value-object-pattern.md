---
contentType: patterns
slug: value-object-pattern
title: "Value Object Pattern"
description: "Model domain concepts by value rather than identity. An immutable object defined by its attributes, not by a unique ID."
metaDescription: "Learn the Value Object Pattern for immutable domain objects defined by their attributes. Examples in Python, Java, and JavaScript."
difficulty: intermediate
topics:
  - design
tags:
  - value-object
  - pattern
  - design-pattern
  - ddd
  - immutability
  - domain-modeling
relatedResources:
  - /patterns/design/entity-component-system-pattern
  - /patterns/design/aggregate-pattern
  - /patterns/design/solid-principles-typescript
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Value Object Pattern for immutable domain objects defined by their attributes. Examples in Python, Java, and JavaScript."
  keywords:
    - value object
    - design pattern
    - ddd
    - immutability
    - domain modeling
---

# Value Object Pattern

## Overview

A Value Object is an immutable object defined entirely by its attributes, not by a unique identity. Two value objects with the same values are considered equal regardless of whether they are the same instance. Money, dates, coordinates, and email addresses are classic examples.

This pattern is fundamental to Domain-Driven Design (DDD). It encapsulates validation, formatting, and comparison logic in a type-safe wrapper, preventing primitive obsession (representing domain concepts as strings or numbers).

## When to Use

Use the Value Object Pattern when:
- A concept has no conceptual identity (e.g., $20 is $20 regardless of which bill)
- You need validation logic at construction time (e.g., email format, positive amounts)
- Immutability prevents accidental mutation bugs in concurrent code
- You want rich comparison and arithmetic behavior for primitives

## When to Avoid

- The concept has a lifecycle and changes state over time (use an Entity instead)
- You need to track historical versions of the same object
- Performance of creating many small objects is unacceptable

## Solution

### Python (Dataclass with Frozen)

```python
from dataclasses import dataclass
import re

@dataclass(frozen=True)
class EmailAddress:
    value: str

    def __post_init__(self):
        if not re.match(r"^[^@]+@[^@]+\.[^@]+$", self.value):
            raise ValueError(f"Invalid email: {self.value}")

    def domain(self) -> str:
        return self.value.split("@")[1]

    def local_part(self) -> str:
        return self.value.split("@")[0]


@dataclass(frozen=True)
class Money:
    amount: int
    currency: str

    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("Amount cannot be negative")

    def add(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError("Currency mismatch")
        return Money(self.amount + other.amount, self.currency)

    def __str__(self):
        return f"{self.currency} {self.amount / 100:.2f}"


# Usage
email = EmailAddress("alice@example.com")
price = Money(1999, "USD")
discount = Money(200, "USD")
total = price.add(discount)
print(total)  # USD 21.99
```

### Java (Record)

```java
public record EmailAddress(String value) {
    public EmailAddress {
        if (!value.matches("^[^@]+@[^@]+\\.[^@]+$")) {
            throw new IllegalArgumentException("Invalid email: " + value);
        }
    }

    public String domain() {
        return value.substring(value.indexOf('@') + 1);
    }
}

public record Money(long amount, String currency) {
    public Money {
        if (amount < 0) throw new IllegalArgumentException("Negative amount");
    }

    public Money add(Money other) {
        if (!currency.equals(other.currency)) {
            throw new IllegalArgumentException("Currency mismatch");
        }
        return new Money(amount + other.amount, currency);
    }

    @Override
    public String toString() {
        return String.format("%s %.2f", currency, amount / 100.0);
    }
}

// Usage
EmailAddress email = new EmailAddress("alice@example.com");
Money price = new Money(1999, "USD");
Money total = price.add(new Money(200, "USD"));
```

### JavaScript

```javascript
class EmailAddress {
  constructor(value) {
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(value)) {
      throw new Error(`Invalid email: ${value}`);
    }
    this._value = value;
    Object.freeze(this);
  }

  get value() { return this._value; }

  domain() { return this._value.split('@')[1]; }
  localPart() { return this._value.split('@')[0]; }

  equals(other) {
    return other instanceof EmailAddress && this._value === other._value;
  }
}

class Money {
  constructor(amount, currency) {
    if (amount < 0) throw new Error('Negative amount');
    this._amount = amount;
    this._currency = currency;
    Object.freeze(this);
  }

  get amount() { return this._amount; }
  get currency() { return this._currency; }

  add(other) {
    if (this._currency !== other._currency) {
      throw new Error('Currency mismatch');
    }
    return new Money(this._amount + other._amount, this._currency);
  }

  toString() {
    return `${this._currency} ${(this._amount / 100).toFixed(2)}`;
  }
}

// Usage
const email = new EmailAddress('alice@example.com');
const price = new Money(1999, 'USD');
console.log(price.add(new Money(200, 'USD')).toString());
```

## Explanation

Value Objects are characterized by:

- **Immutability**: Once created, they never change. Operations return new instances.
- **Identity-free equality**: Two value objects are equal if their attributes match.
- **Self-validation**: Invalid states are impossible after construction.
- **Rich behavior**: Formatting, arithmetic, and comparison logic lives with the data.

## Variants

| Variant | Use Case |
|---------|----------|
| **Composite Value Object** | Address with street, city, zip as one unit |
| **Range Value Object** | DateRange, TemperatureRange with validation |
| **Calculated Value Object** | TaxAmount computed from Money and Rate |

## Best Practices

- **Make them immutable.** No setters, mutable fields, or in-place updates. Return new instances for transformations.
- **Validate at construction.** An invalid `EmailAddress` should be impossible to create. Fail fast with clear errors.
- **Implement `equals` and `hashCode`** properly (or use records/dataclasses) so collections behave correctly.
- **Keep them small.** A value object with 15 fields is likely an Entity in disguise.
- **Use them in APIs.** Prefer `Money` over `int` in method signatures for type safety and clarity.

## Common Mistakes

- **Adding an ID** turns a value object into an entity. If you track "the email Alice changed last Tuesday," it is an entity.
- **Mutating value objects** after creation breaks equality contracts and causes bugs in hash-based collections.
- **Using reference equality** (`==` in Java, `is` in Python) instead of value equality. Always override `equals`/`__eq__`.
- **Over-engineering** with value objects for every primitive. Not every string needs to be a `FirstName` object.
- **Missing `hashCode`/`__hash__`** when implementing custom equality causes `HashMap`/`set` lookups to fail silently.

## Real-World Examples

### Java Money and Currency

JSR-354 `MonetaryAmount` is a standardized value object for money, handling currencies, rounding, and arithmetic correctly.

### Python datetime

`datetime.date(2024, 6, 25)` is a value object. Two dates with the same year, month, and day are equal regardless of instance identity.

### JavaScript Temporal API

The upcoming `Temporal.PlainDate` will replace `Date` as an immutable value object for calendar dates without time zone confusion.

## Frequently Asked Questions

**Q: What is the difference between Value Object and Entity?**
A: An Entity is defined by identity (a user with ID 42). A Value Object is defined by attributes ($20 USD). Entities change; value objects are replaced.

**Q: Can value objects contain entities?**
A: No, but entities can contain value objects. A `User` entity may have an `Address` value object.

**Q: Should I store value objects in a database?**
A: Yes, as embedded columns or JSON fields. They do not need their own table unless the ORM requires it.
