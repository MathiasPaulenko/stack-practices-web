---
contentType: recipes
slug: strategy-pattern-recipe
title: "Swap Algorithms at Runtime with the Strategy Pattern"
description: "How to encapsulate interchangeable algorithms and behaviors using the strategy pattern with dependency injection, function pointers, and lambda strategies in Java, TypeScript, and Python."
metaDescription: "Learn strategy pattern to swap algorithms at runtime. Encapsulate interchangeable behaviors with DI, function pointers, and lambda strategies in Java, TypeScript, Python."
difficulty: beginner
topics:
  - design
tags:
  - design
  - strategy-pattern
  - behavioral-patterns
relatedResources:
  - /recipes/factory-pattern-recipe
  - /recipes/adapter-pattern-recipe
  - /recipes/hexagonal-architecture
  - /recipes/singleton-pattern-recipe
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn strategy pattern to swap algorithms at runtime. Encapsulate interchangeable behaviors with DI, function pointers, and lambda strategies in Java, TypeScript, Python."
  keywords:
    - strategy pattern
    - swap algorithms runtime
    - behavioral pattern
    - polymorphism strategy
    - encapsulate behavior
---

## Overview

An e-commerce checkout system calculates shipping costs. For domestic orders, it uses flat-rate pricing. For international orders, it uses weight-based pricing. For express delivery, it uses distance plus urgency multipliers. A naive implementation puts all three calculations in a single `calculateShipping()` method with a giant `switch` statement. Adding a new shipping method means editing that method, violating the open-closed principle. Testing shipping logic requires setting up the entire checkout object.

The strategy pattern separates the algorithms from the context that uses them. Each shipping algorithm becomes its own class implementing a shared `ShippingStrategy` interface. The checkout system holds a reference to a strategy and delegates the calculation to it. At runtime, you swap strategies — flat rate for domestic, weight-based for international — without changing the checkout code. New strategies are added by writing new classes, not by editing existing ones. This recipe covers class-based strategies, function-based strategies, and dependency-injected strategy selection.

## When to use it

Use this recipe when:

- Multiple algorithms or behaviors exist for the same task and only one is used at a time. See [Factory Pattern](/recipes/factory-pattern-recipe) for creating algorithms.
- The algorithm must be selected at runtime based on configuration or user input. See [Input Validation](/recipes/api/input-validation) for safe configuration.
- You want to isolate algorithm complexity from the main business logic
- Adding new variants should not require modifying existing code. See [Adapter Pattern](/recipes/adapter-pattern-recipe) for extending interfaces.
- Algorithm-specific state or configuration needs encapsulation separate from the context

## Solution

### Class-Based Strategy (TypeScript)

```typescript
interface ShippingStrategy {
  calculate(order: Order): number;
}

class FlatRateStrategy implements ShippingStrategy {
  constructor(private rate: number) {}

  calculate(order: Order): number {
    return this.rate;
  }
}

class WeightBasedStrategy implements ShippingStrategy {
  constructor(private ratePerKg: number) {}

  calculate(order: Order): number {
    return order.totalWeight * this.ratePerKg;
  }
}

class DistanceBasedStrategy implements ShippingStrategy {
  constructor(private baseRate: number, private perKm: number) {}

  calculate(order: Order): number {
    return this.baseRate + (order.distanceKm * this.perKm);
  }
}

class CheckoutService {
  private shippingStrategy: ShippingStrategy;

  constructor(strategy: ShippingStrategy) {
    this.shippingStrategy = strategy;
  }

  setStrategy(strategy: ShippingStrategy): void {
    this.shippingStrategy = strategy;
  }

  getTotal(order: Order): number {
    const subtotal = order.items.reduce((sum, item) => sum + item.price, 0);
    const shipping = this.shippingStrategy.calculate(order);
    return subtotal + shipping;
  }
}

// Runtime selection
const strategy = order.destination === 'domestic'
  ? new FlatRateStrategy(10)
  : new WeightBasedStrategy(2.5);

const checkout = new CheckoutService(strategy);
const total = checkout.getTotal(order);
```

### Java with Enum Strategy

```java
interface TaxStrategy {
    BigDecimal calculateTax(BigDecimal amount);
}

enum TaxRegion implements TaxStrategy {
    US {
        public BigDecimal calculateTax(BigDecimal amount) {
            return amount.multiply(new BigDecimal("0.08"));
        }
    },
    EU {
        public BigDecimal calculateTax(BigDecimal amount) {
            return amount.multiply(new BigDecimal("0.20"));
        }
    },
    UK {
        public BigDecimal calculateTax(BigDecimal amount) {
            return amount.multiply(new BigDecimal("0.20"));
        }
    };
}

class Invoice {
    private final TaxStrategy taxStrategy;

    Invoice(TaxStrategy taxStrategy) {
        this.taxStrategy = taxStrategy;
    }

    BigDecimal getTotal(BigDecimal subtotal) {
        return subtotal.add(taxStrategy.calculateTax(subtotal));
    }
}

Invoice invoice = new Invoice(TaxRegion.EU);
```

### Python with Function Strategies

```python
from typing import Callable, List
from dataclasses import dataclass

@dataclass
class Order:
    items: List[float]
    total_weight: float
    destination: str

# Strategies are plain functions
Strategy = Callable[[Order], float]

def flat_rate_strategy(order: Order) -> float:
    return 10.0

def weight_based_strategy(order: Order) -> float:
    return order.total_weight * 2.5

def free_over_threshold(order: Order) -> float:
    subtotal = sum(order.items)
    return 0.0 if subtotal > 50 else 5.0

class CheckoutService:
    def __init__(self, strategy: Strategy):
        self.strategy = strategy

    def set_strategy(self, strategy: Strategy):
        self.strategy = strategy

    def get_total(self, order: Order) -> float:
        subtotal = sum(order.items)
        shipping = self.strategy(order)
        return subtotal + shipping

# Runtime selection
strategies = {
    'domestic': flat_rate_strategy,
    'international': weight_based_strategy,
    'promo': free_over_threshold,
}

checkout = CheckoutService(strategies[order.destination])
total = checkout.get_total(order)
```

## Explanation

- **Encapsulation of algorithm**: each strategy is a self-contained object or function with its own state and behavior. The context (checkout service) knows only the strategy interface, not the implementation details. This decouples the context from algorithm evolution.
- **Runtime selection**: strategies are selected at runtime based on configuration, user input, or business rules. A factory or registry can map keys to strategy instances. The context does not hardcode which strategy to use — it receives the strategy as a dependency.
- **Open-closed principle**: adding a new shipping method means writing a new class that implements `ShippingStrategy`. The checkout service, existing strategies, and tests remain untouched. This is the essence of the open-closed principle: open for extension, closed for modification.
- **Strategy vs simple function**: in languages with first-class functions (Python, JavaScript, Go), a strategy can be a function rather than a class. This reduces boilerplate for stateless algorithms. Use classes when the strategy needs configuration, internal state, or multiple methods.

## Variants

| Variant | State | Language | Best for |
|---------|-------|----------|----------|
| Class strategy | Yes (fields) | Java, C# | Complex algorithms with config |
| Lambda/function | No | Python, JS, Go | Simple, stateless algorithms |
| Enum strategy | Minimal | Java | Fixed set of known strategies |
| Registry + strategy | Yes | Any | User-configurable algorithms |
| Template method | Inherited | Any | Strategies with shared skeleton |

## Best practices

- **Use dependency injection for strategy selection**: instead of the context constructing its own strategy, inject it via constructor or setter. This makes the context testable with mock strategies and allows the caller to control algorithm selection without modifying the context.
- **Keep strategy interfaces focused**: a strategy interface should have one primary method. If you find yourself adding `init()`, `validate()`, and `cleanup()` to the interface, the strategy is doing too much. Split into separate interfaces or use a lifecycle wrapper.
- **Document strategy side effects and preconditions**: some strategies mutate state (e.g., a payment strategy that charges a card). Document whether the strategy is idempotent, what exceptions it throws, and what state it expects. Consumers must understand the contract.
- **Consider the null strategy**: if the context always expects a strategy but sometimes no behavior is needed, implement a null object strategy that does nothing. This avoids null checks and conditional logic in the context.
- **Compose strategies with decorators**: a caching decorator wraps a strategy and memoizes results. A validation decorator checks inputs before delegating. This keeps individual strategies simple while adding cross-cutting concerns externally.

## Common mistakes

- **Over-engineering simple conditionals**: if you have two strategies that are each one line, a strategy pattern adds more boilerplate than value. Use a simple function or inline conditional until you have three or more algorithms, or the algorithms grow complex.
- **Putting strategy selection inside the context**: `if (region === 'US') strategy = new UsTaxStrategy()` inside the context violates separation of concerns. The context should receive the strategy. Selection logic belongs in a factory, configuration parser, or controller.
- **Strategies accessing context internals**: a strategy should not reach back into the context object. Pass all needed data as parameters to the strategy method. Bidirectional coupling makes both the context and strategy harder to test and reason about.
- **Inconsistent strategy interfaces**: if one strategy returns a number and another returns a formatted string, the context must handle both cases. Define the interface precisely — return types, exception contracts, and parameter shapes should be uniform across all strategies.

## FAQ

**Q: Is the strategy pattern the same as the command pattern?**
A: No. Strategy encapsulates interchangeable algorithms used by a context. Command encapsulates a request as an object, enabling queuing, logging, and undo. See [Batch Processing](/recipes/data/batch-processing-patterns) for command queues. A strategy is about "how to do it"; a command is about "do it later." You can combine them — a command object that holds a strategy.

**Q: When should I use a function instead of a class for a strategy?**
A: Use a function when the strategy is stateless and simple (e.g., a tax calculation). Use a class when the strategy needs configuration at construction time, maintains internal state between calls, or has multiple related methods.

**Q: How do I handle strategies that need different inputs?**
A: The strategy interface should accept the broadest common input type. If strategies need different subsets, pass a context object containing all possible data. Strategies extract what they need. Avoid multiple overloaded strategy methods.

**Q: Can strategies be changed dynamically at runtime?**
A: Yes — expose a setter on the context. This is useful for adaptive algorithms (e.g., switching from A* to Dijkstra based on map size). Ensure thread safety if the context is shared between threads.

