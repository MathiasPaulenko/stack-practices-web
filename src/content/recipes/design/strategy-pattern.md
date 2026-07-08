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
  - design-patterns
  - patterns
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

The strategy pattern separates the algorithms from the context that uses them. Each shipping algorithm becomes its own class implementing a shared `ShippingStrategy` interface. The checkout system holds a reference to a strategy and delegates the calculation to it. At runtime, you swap strategies — flat rate for domestic, weight-based for international — without changing the checkout code. New strategies are added by writing new classes, not by editing existing ones. This approach handles class-based strategies, function-based strategies, and dependency-injected strategy selection.

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

## What Works

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


### Strategy Registry with Dynamic Selection (TypeScript)

```typescript
class StrategyRegistry<TContext, TResult> {
  private strategies: Map<string, (ctx: TContext) => TResult> = new Map();

  register(key: string, strategy: (ctx: TContext) => TResult): void {
    this.strategies.set(key, strategy);
  }

  select(context: TContext & { strategyKey?: string }): (ctx: TContext) => TResult {
    const key = context.strategyKey;
    if (!key || !this.strategies.has(key)) {
      throw new Error(`No strategy registered for key: ${key}`);
    }
    return this.strategies.get(key)!;
  }
}

// Registration at startup
const shippingRegistry = new StrategyRegistry<Order, number>();

shippingRegistry.register('flat-rate', (order) => 10);
shippingRegistry.register('weight-based', (order) => order.totalWeight * 2.5);
shippingRegistry.register('distance', (order) => 5 + order.distanceKm * 0.5);
shippingRegistry.register('free-shipping', (order) => {
  const subtotal = order.items.reduce((s, i) => s + i.price, 0);
  return subtotal > 100 ? 0 : 10;
});

// Usage — select strategy by key from order metadata
const calculate = shippingRegistry.select(order as Order & { strategyKey: string });
const shipping = calculate(order);
```

### Strategy with Decorator Composition (TypeScript)

```typescript
interface PricingStrategy {
  calculate(order: Order): Money;
}

class BasePricingStrategy implements PricingStrategy {
  calculate(order: Order): Money {
    return order.items.reduce(
      (total, item) => total.add(item.price),
      Money.zero('USD')
    );
  }
}

class DiscountDecorator implements PricingStrategy {
  constructor(
    private wrapped: PricingStrategy,
    private discountPercentage: number
  ) {}

  calculate(order: Order): Money {
    const base = this.wrapped.calculate(order);
    const discount = base.multiply(this.discountPercentage / 100);
    return base.subtract(discount);
  }
}

class TaxDecorator implements PricingStrategy {
  constructor(
    private wrapped: PricingStrategy,
    private taxRate: number
  ) {}

  calculate(order: Order): Money {
    const base = this.wrapped.calculate(order);
    const tax = base.multiply(this.taxRate / 100);
    return base.add(tax);
  }
}

class FreeShippingDecorator implements PricingStrategy {
  constructor(
    private wrapped: PricingStrategy,
    private threshold: number
  ) {}

  calculate(order: Order): Money {
    const base = this.wrapped.calculate(order);
    if (base.amount > this.threshold) {
      return base;
    }
    return base.add(new Money(10, 'USD'));
  }
}

// Compose — stack decorators to build the final strategy
const pricing = new FreeShippingDecorator(
  new TaxDecorator(
    new DiscountDecorator(
      new BasePricingStrategy(),
      10
    ),
    8
  ),
  100
);

const total = pricing.calculate(order);
```

### Context-Based Strategy Selection (Python)

```python
from typing import Protocol

class PaymentStrategy(Protocol):
    def pay(self, amount: float) -> str: ...

class CreditCardStrategy:
    def __init__(self, card_number: str, cvv: str):
        self._card = card_number
        self._cvv = cvv

    def pay(self, amount: float) -> str:
        return f"Charged ${amount:.2f} to card ending in {self._card[-4:]}"

class PayPalStrategy:
    def __init__(self, email: str):
        self._email = email

    def pay(self, amount: float) -> str:
        return f"Charged ${amount:.2f} via PayPal ({self._email})"

class CryptoStrategy:
    def __init__(self, wallet: str):
        self._wallet = wallet

    def pay(self, amount: float) -> str:
        return f"Charged {amount / 50000:.8f} BTC from {self._wallet[:8]}..."

class PaymentContext:
    def __init__(self):
        self._strategies: dict[str, PaymentStrategy] = {}

    def register(self, key: str, strategy: PaymentStrategy):
        self._strategies[key] = strategy

    def pay(self, method: str, amount: float) -> str:
        strategy = self._strategies.get(method)
        if strategy is None:
            raise ValueError(f"Unknown payment method: {method}")
        return strategy.pay(amount)

# Usage — register strategies, select by method key
context = PaymentContext()
context.register('credit-card', CreditCardStrategy('4111111111111234', '123'))
context.register('paypal', PayPalStrategy('user@example.com'))
context.register('crypto', CryptoStrategy('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'))

result = context.pay('paypal', 99.99)
```

## Additional Best Practices

1. **Use a strategy factory for complex selection logic.** When selection depends on multiple factors (region, customer tier, order size), encapsulate the logic:

```typescript
class ShippingStrategyFactory {
  create(order: Order): ShippingStrategy {
    if (order.isInternational) {
      return new InternationalStrategy(order.customsFee);
    }
    if (order.isExpress) {
      return new ExpressStrategy(order.distanceKm);
    }
    if (order.totalWeight > 20) {
      return new FreightStrategy(order.pallets);
    }
    return new FlatRateStrategy(10);
  }
}
```

2. **Make strategies immutable.** After construction, a strategy should not change its configuration. This makes them safe to share across threads and requests:

```typescript
class WeightBasedStrategy implements ShippingStrategy {
  constructor(
    private readonly ratePerKg: number,
    private readonly fuelSurcharge: number
  ) {}

  calculate(order: Order): number {
    return (order.totalWeight * this.ratePerKg) + this.fuelSurcharge;
  }
}
```

3. **Test strategies in isolation.** Each strategy is a unit — test it directly without the context:

```typescript
describe('WeightBasedStrategy', () => {
  it('calculates shipping based on weight', () => {
    const strategy = new WeightBasedStrategy(2.5);
    const order = { totalWeight: 10 } as Order;
    expect(strategy.calculate(order)).toBe(25);
  });

  it('returns zero for zero weight', () => {
    const strategy = new WeightBasedStrategy(2.5);
    const order = { totalWeight: 0 } as Order;
    expect(strategy.calculate(order)).toBe(0);
  });
});
```

## Additional Common Mistakes

1. **God strategy interface.** When the strategy interface grows to 5+ methods, each strategy implementation becomes a god class. Split into focused interfaces:

```typescript
// Bad: one interface does everything
interface PaymentStrategy {
  validate(): boolean;
  charge(amount: number): void;
  refund(transactionId: string): void;
  getStatus(): PaymentStatus;
  generateReceipt(): string;
}

// Good: split by responsibility
interface PaymentValidator { validate(): boolean; }
interface PaymentProcessor { charge(amount: number): void; refund(txId: string): void; }
interface PaymentReporter { generateReceipt(): string; }
```

2. **Strategy coupled to persistence.** A strategy that reads from a database or calls an API couples algorithm selection to infrastructure. Inject data as parameters:

```typescript
// Bad: strategy fetches its own data
class TaxStrategy implements ShippingStrategy {
  constructor(private db: Database) {}
  calculate(order: Order): number {
    const rate = this.db.query('SELECT rate FROM tax_rates WHERE region = ?', order.region);
    return order.subtotal * rate;
  }
}

// Good: strategy receives data as parameter
class TaxStrategy implements ShippingStrategy {
  constructor(private rate: number) {}
  calculate(order: Order): number {
    return order.subtotal * this.rate;
  }
}
```

3. **Not handling strategy errors.** Each strategy can fail differently. Wrap strategy calls with consistent error handling:

```typescript
class CheckoutService {
  getTotal(order: Order): number {
    const subtotal = order.items.reduce((s, i) => s + i.price, 0);
    let shipping: number;
    try {
      shipping = this.shippingStrategy.calculate(order);
    } catch (error) {
      console.error('Shipping calculation failed', { strategy: this.shippingStrategy.constructor.name, error });
      shipping = 10; // fallback
    }
    return subtotal + shipping;
  }
}
```

## Additional FAQ

### How do I handle strategy selection based on multiple criteria?

Use a rules engine or a chain of responsibility for multi-factor selection. For simple cases, a factory with conditional logic works. For complex cases, encode selection rules as data and evaluate them:

```typescript
interface StrategyRule {
  matches(order: Order): boolean;
  create(): ShippingStrategy;
}

const rules: StrategyRule[] = [
  { matches: o => o.isInternational, create: () => new InternationalStrategy(15) },
  { matches: o => o.isExpress, create: () => new ExpressStrategy(0.8) },
  { matches: () => true, create: () => new FlatRateStrategy(10) }, // fallback
];

const strategy = rules.find(r => r.matches(order))!.create();
```

### Is this solution production-ready?

Yes. The class-based, function-based, and decorator-composed strategy patterns are all production-proven. The registry pattern mirrors how DI containers resolve strategies by key. The decorator composition is standard in pricing and shipping systems. The Python protocol-based approach is used in modern Python codebases with type checking.

### What are the performance characteristics?

Strategy method dispatch is a virtual call — negligible overhead (nanoseconds). The registry adds a hash map lookup (O(1)). Decorator stacking adds one virtual call per layer — typically 2-3 layers, still sub-microsecond. Strategy factories that query databases for configuration add I/O latency on first call; cache the result. For hot paths, pre-select the strategy at startup rather than per-request.

### How do I debug issues with this approach?

Log the strategy class name and key parameters before delegation. For decorator stacks, log at each layer to trace how the result is built. For registry-based selection, log the requested key and resolved strategy. Use the strategy's `toString()` or `constructor.name` to identify which implementation ran. Test strategies in isolation with in-memory inputs before integrating with the context.
