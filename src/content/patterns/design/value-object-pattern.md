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
  - /patterns/entity-component-system-pattern
  - /patterns/aggregate-pattern
  - /patterns/solid-principles-typescript
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


- For alternatives, see [Aggregate Pattern](/patterns/aggregate-pattern/).

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

## What Works

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

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.


## Advanced Topics

### Scenario: Value Objects for Money and Coordinates

```typescript
// Value Object: immutable, no identity, equality by value
class Money {
  constructor(readonly amount: number, readonly currency: string) {
    if (amount < 0) throw new Error("Amount cannot be negative");
    if (!currency || currency.length !== 3) throw new Error("Invalid currency code");
    Object.freeze(this); // Immutable
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) throw new Error("Currency mismatch");
    return new Money(this.amount + other.amount, this.currency);
  }
  subtract(other: Money): Money {
    if (this.currency !== other.currency) throw new Error("Currency mismatch");
    return new Money(this.amount - other.amount, this.currency);
  }
  multiply(factor: number): Money {
    return new Money(Math.round(this.amount * factor * 100) / 100, this.currency);
  }
  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
  toString(): string {
    return `${this.amount.toFixed(2)} ${this.currency}`;
  }
}

// Value Object: Geographic coordinates
class GeoCoordinate {
  constructor(readonly lat: number, readonly lng: number) {
    if (lat < -90 || lat > 90) throw new Error("Invalid latitude");
    if (lng < -180 || lng > 180) throw new Error("Invalid longitude");
    Object.freeze(this);
  }
  distanceTo(other: GeoCoordinate): number {
    const R = 6371; // km
    const dLat = (other.lat - this.lat) * Math.PI / 180;
    const dLng = (other.lng - this.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 +
      Math.cos(this.lat * Math.PI / 180) * Math.cos(other.lat * Math.PI / 180) *
      Math.sin(dLng/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  equals(other: GeoCoordinate): boolean {
    return this.lat === other.lat && this.lng === other.lng;
  }
}

// Usage
const price = new Money(99.99, "USD");
const tax = new Money(8.99, "USD");
const total = price.add(tax);
console.log(total.toString()); // "108.98 USD"
console.log(price.equals(new Money(99.99, "USD"))); // true
console.log(price.equals(total)); // false

const nyc = new GeoCoordinate(40.7128, -74.0060);
const la = new GeoCoordinate(34.0522, -118.2437);
console.log(`${nyc.distanceTo(la).toFixed(0)} km`); // "3936 km"
```

Lessons:
  - Value Object: immutable, no identity, equality by value
  - Money: do not use float for money. Use cents (integer) or BigDecimal
  - Object.freeze() guarantees immutability at runtime
  - Operations return new instances, do not mutate
  - equals() compares by value, not by reference
  - Validation in constructor: an invalid Value Object cannot exist
```

### Value Object vs Entity: which do I use?

Use Value Object when identity does not matter: Money, Date, Coordinate, Address. Two Money of 100 USD are interchangeable. Use Entity when identity matters: User, Order, Product. Two Users with the same name are different people. Value Objects are immutable; Entities are mutable. Value Objects compare by value; Entities by id. Prefer Value Objects when possible: they are simpler, testable, and have no side effects.
