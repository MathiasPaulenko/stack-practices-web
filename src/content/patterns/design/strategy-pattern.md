---
contentType: patterns
slug: strategy-pattern
title: "Strategy Pattern"
description: "Define a family of algorithms, encapsulate each one, and make them interchangeable. A behavioral design pattern for flexible behavior selection."
metaDescription: "Learn the Strategy Pattern with practical examples in Python, Java, and JavaScript. Behavioral design pattern for interchangeable algorithms."
difficulty: beginner
topics:
  - design
tags:
  - strategy
  - pattern
  - design-pattern
  - behavioral
  - algorithms
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/observer-pattern
  - /recipes/data/sort-array
  - /guides/api/rest-api-design-guide
lastUpdated: "2026-06-10"
author: "StackPractices"
seo:
  metaDescription: "Learn the Strategy Pattern with practical examples in Python, Java, and JavaScript. Behavioral design pattern for interchangeable algorithms."
  keywords:
    - strategy pattern
    - design pattern
    - behavioral pattern
    - interchangeable algorithms
    - python strategy
    - java strategy
    - javascript strategy
---

# Strategy Pattern

## Overview

The Strategy Pattern is a behavioral design pattern that defines a family of algorithms, encapsulates each one as a separate class, and makes them interchangeable at runtime. It lets the algorithm vary independently from the clients that use it.

It is ideal when you need to select from multiple ways to perform an operation, such as different sorting strategies, payment methods, or compression algorithms.

## When to Use

Use the Strategy Pattern when:
- You have multiple ways to perform an operation and want to switch between them at runtime
- A class has a large conditional (`if`/`switch`) for selecting behavior
- You want to isolate algorithm implementation details from the context that uses them
- You need to add new algorithms without modifying existing code (Open/Closed Principle)
- Different clients need different variants of the same algorithm

## Solution

### Python

```python
from abc import ABC, abstractmethod

class PaymentStrategy(ABC):
    @abstractmethod
    def pay(self, amount: float) -> str:
        pass

class CreditCardPayment(PaymentStrategy):
    def pay(self, amount: float) -> str:
        return f"Paid ${amount} with Credit Card"

class PayPalPayment(PaymentStrategy):
    def pay(self, amount: float) -> str:
        return f"Paid ${amount} via PayPal"

class Checkout:
    def __init__(self, strategy: PaymentStrategy):
        self.strategy = strategy

    def process(self, amount: float):
        return self.strategy.pay(amount)

# Usage
checkout = Checkout(CreditCardPayment())
print(checkout.process(100.0))
checkout.strategy = PayPalPayment()
print(checkout.process(50.0))
```

### JavaScript

```javascript
class CreditCardPayment {
  pay(amount) {
    return `Paid $${amount} with Credit Card`;
  }
}

class PayPalPayment {
  pay(amount) {
    return `Paid $${amount} via PayPal`;
  }
}

class Checkout {
  constructor(strategy) {
    this.strategy = strategy;
  }

  process(amount) {
    return this.strategy.pay(amount);
  }
}

// Usage
const checkout = new Checkout(new CreditCardPayment());
console.log(checkout.process(100));
checkout.strategy = new PayPalPayment();
console.log(checkout.process(50));
```

### Java

```java
interface PaymentStrategy {
    String pay(double amount);
}

class CreditCardPayment implements PaymentStrategy {
    public String pay(double amount) {
        return "Paid $" + amount + " with Credit Card";
    }
}

class PayPalPayment implements PaymentStrategy {
    public String pay(double amount) {
        return "Paid $" + amount + " via PayPal";
    }
}

class Checkout {
    private PaymentStrategy strategy;

    Checkout(PaymentStrategy strategy) {
        this.strategy = strategy;
    }

    String process(double amount) {
        return strategy.pay(amount);
    }

    void setStrategy(PaymentStrategy strategy) {
        this.strategy = strategy;
    }
}

// Usage
Checkout checkout = new Checkout(new CreditCardPayment());
System.out.println(checkout.process(100));
checkout.setStrategy(new PayPalPayment());
System.out.println(checkout.process(50));
```

## Explanation

The Strategy Pattern separates behavior into three roles:

- **Strategy Interface** (`PaymentStrategy`): Defines the contract all algorithms must follow
- **Concrete Strategies** (`CreditCardPayment`, `PayPalPayment`): The actual interchangeable algorithms
- **Context** (`Checkout`): Uses a strategy through the interface, unaware of the concrete implementation

This eliminates large conditional blocks and makes adding new strategies as simple as creating a new class.

## Variants

| Variant | Use Case | Trade-off |
|---------|----------|-----------|
| **Simple Strategy** | Single context, few strategies | Easy to start, direct coupling |
| **Strategy with Factory** | Dynamic strategy selection | More flexible, adds indirection |
| **Functional Strategy** | Languages with first-class functions | Concise, but less explicit than classes |

## Best Practices

- **Use an interface or abstract base** to ensure all strategies have the same signature
- **Keep strategies stateless** when possible for easier reuse and testing
- **Inject the strategy** via constructor or setter rather than hardcoding it
- **Document strategy differences** so callers know which to choose
- **Avoid strategy bloat**: if you have dozens of strategies, consider a different abstraction

## Common Mistakes

- **Leaking context internals**: Strategies should not depend on private details of the context
- **Overuse for trivial cases**: A simple `if` statement does not always need a Strategy class
- **Tight coupling**: The context knowing about concrete strategy classes instead of the interface
- **Inconsistent interfaces**: Strategies with different method signatures break interchangeability
- **State management**: Strategies holding mutable state can cause unexpected side effects

## Frequently Asked Questions

**Q: What is the difference between Strategy and State patterns?**
A: Strategy is about interchangeable algorithms chosen by the client. State is about changing behavior based on the object's internal state transitions.

**Q: Can I use functions instead of classes for strategies?**
A: Yes, in languages with first-class functions (JavaScript, Python, Go) you can pass functions directly. Classes are better when strategies need configuration or multiple methods.

**Q: How many strategies is too many?**
A: There is no hard limit, but if you find yourself with dozens, consider grouping them by category or using a registry/factory pattern.
