---
contentType: patterns
slug: solid-principles-typescript
title: "SOLID Principles in TypeScript with Practical Examples"
description: "Apply the five SOLID principles to TypeScript code to improve maintainability, testability, and reduce coupling in object-oriented designs"
metaDescription: "SOLID principles in TypeScript. Apply Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion with practical examples."
difficulty: intermediate
topics:
  - design
tags:
  - solid
  - clean-code
  - typescript
  - design-pattern
  - design-patterns
relatedResources:
  - /patterns/design/adapter-pattern-api
  - /patterns/design/decorator-pattern-pipeline
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "SOLID principles in TypeScript. Apply Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion with practical examples."
  keywords:
    - solid principles
    - typescript
    - clean code
    - object oriented design
    - dependency inversion
---

# SOLID Principles in TypeScript with Practical Examples

The [SOLID](/guides/design/solid-principles-guide) principles provide a framework for writing maintainable object-oriented code. When applied to TypeScript, they help prevent the common pitfalls of tightly coupled classes, brittle inheritance hierarchies, and unmaintainable dependency graphs.

## When to Use This

- Classes grow beyond 200 lines and handle multiple responsibilities
- Changing one feature requires modifying unrelated code
- Unit tests require extensive mocking of concrete dependencies

## S — Single Responsibility Principle

A class should have one reason to change. When a class handles both data access and business logic, changes to the database schema force retesting of business rules.

```typescript
// Before: OrderService handles validation, persistence, and notifications
class OrderService {
  async createOrder(data: OrderData) {
    if (!this.validate(data)) throw new Error('Invalid');
    await this.db.query('INSERT INTO orders ...');
    await this.sendEmail(data.customerEmail);
  }
}

// After: Separate responsibilities
class OrderValidator {
  validate(data: OrderData): boolean {
    return !!data.items?.length && data.total > 0;
  }
}

class OrderRepository {
  async save(order: OrderData): Promise<Order> {
    // Database logic only
  }
}

class OrderNotificationService {
  async sendConfirmation(email: string, order: Order): Promise<void> {
    // Email logic only
  }
}
```

## O — Open/Closed Principle

Software entities should be open for extension but closed for modification. Use composition and interfaces instead of modifying existing code. See [Strategy](/patterns/design/strategy-pattern) and [Decorator](/patterns/design/decorator-pattern) for practical examples.

```typescript
interface PaymentProcessor {
  process(amount: number): Promise<PaymentResult>;
}

class StripeProcessor implements PaymentProcessor {
  async process(amount: number) {
    // Stripe-specific logic
    return { success: true, transactionId: 'stripe_123' };
  }
}

class PayPalProcessor implements PaymentProcessor {
  async process(amount: number) {
    // PayPal-specific logic
    return { success: true, transactionId: 'paypal_456' };
  }
}

// Checkout does not change when adding new processors
class CheckoutService {
  constructor(private processor: PaymentProcessor) {}

  async charge(amount: number) {
    return this.processor.process(amount);
  }
}
```

## L — Liskov Substitution Principle

Subtypes must be substitutable for their base types without altering program correctness.

```typescript
// Violation: PremiumCustomer breaks the contract of Customer
class Customer {
  getDiscount(): number { return 0; }
}

class PremiumCustomer extends Customer {
  getDiscount(): number { return 0.2; }
}

// Correct: Both satisfy the same contract
interface Discountable {
  getDiscount(): number;
}

class RegularCustomer implements Discountable {
  getDiscount() { return 0; }
}

class PremiumCustomer implements Discountable {
  getDiscount() { return 0.2; }
}

function calculatePrice(base: number, customer: Discountable) {
  return base * (1 - customer.getDiscount());
}
```

## I — Interface Segregation Principle

Clients should not depend on interfaces they do not use. Split large interfaces into focused ones.

```typescript
// Before: Printer interface forces Fax capability
interface MultiFunctionDevice {
  print(document: string): void;
  scan(): string;
  fax(document: string): void;
}

// After: Segregated interfaces
interface Printer {
  print(document: string): void;
}

interface Scanner {
  scan(): string;
}

interface Fax {
  fax(document: string): void;
}

class SimplePrinter implements Printer {
  print(document: string) {
    console.log(`Printing: ${document}`);
  }
}

class AllInOne implements Printer, Scanner, Fax {
  print(document: string) { /* ... */ }
  scan() { return 'scanned'; }
  fax(document: string) { /* ... */ }
}
```

## D — Dependency Inversion Principle

Depend on abstractions, not concrete implementations. Use constructor injection to make dependencies explicit and testable. See [Dependency Injection](/patterns/design/dependency-injection-pattern) for wiring patterns.

```typescript
interface Logger {
  log(message: string): void;
}

class ConsoleLogger implements Logger {
  log(message: string) { console.log(message); }
}

class FileLogger implements Logger {
  log(message: string) { /* write to file */ }
}

class UserService {
  constructor(private logger: Logger) {}

  createUser(data: UserData) {
    // Business logic
    this.logger.log(`User created: ${data.email}`);
  }
}

// Tests inject a mock logger
class MockLogger implements Logger {
  messages: string[] = [];
  log(message: string) { this.messages.push(message); }
}
```

## How It Works

1. **Single Responsibility** isolates change impact to one class
2. **Open/Closed** allows feature addition without regression risk
3. **Liskov Substitution** ensures inheritance hierarchies remain safe
4. **Interface Segregation** prevents fat interfaces and forced dependencies
5. **Dependency Inversion** enables unit testing and framework swapping

## Production Considerations

- Use **dependency injection containers** like TSyringe or InversifyJS for large applications
- Apply SOLID incrementally; refactoring everything at once is risky
- Combine with the **Composition Root** pattern to wire dependencies at application startup

## Common Mistakes

- Creating one interface per class (over-engineering)
- Using inheritance when composition is sufficient
- Injecting concrete classes instead of interfaces in constructors

## FAQ

**Q: Does SOLID apply to functional programming?**
A: Partially. SRP and DIP translate well. OCP and LSP are less relevant when using pure functions instead of classes.

**Q: Should every class implement an interface?**
A: No. Extract interfaces only when there are multiple implementations or when testing requires mocking.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.


## Advanced Topics

### Scenario: SOLID in an Order Service

```typescript
// SRP: each class has one reason to change
class Order {
  constructor(public id: string, public items: OrderItem[], public total: number) {}
}

class OrderRepository {
  async save(order: Order): Promise<void> { /* DB save */ }
  async findById(id: string): Promise<Order | null> { /* DB query */ }
}

class OrderValidator {
  validate(order: Order): string[] {
    const errors: string[] = [];
    if (order.items.length === 0) errors.push("Order must have items");
    if (order.total <= 0) errors.push("Total must be positive");
    return errors;
  }
}

class OrderNotifier {
  async notify(order: Order): Promise<void> {
    await emailService.send(order.customerEmail, "Order confirmed");
  }
}

// OCP: open for extension, closed for modification
interface DiscountStrategy {
  apply(order: Order): number;
}

class NoDiscount implements DiscountStrategy {
  apply(order: Order): number { return order.total; }
}

class PercentageDiscount implements DiscountStrategy {
  constructor(private percent: number) {}
  apply(order: Order): number { return order.total * (1 - this.percent / 100); }
}

// Add new discount without touching existing code
class BlackFridayDiscount implements DiscountStrategy {
  apply(order: Order): number { return order.total * 0.7; }
}

// LSP: subclasses must be substitutable for superclass
// ISP: small, specific interfaces
interface Readable { read(id: string): Promise<Order | null>; }
interface Writable { write(order: Order): Promise<void>; }
// OrderRepository implements both, but ReadOnlyRepo only Readable

// DIP: depend on abstractions, not concretions
class OrderService {
  constructor(
    private repo: Writable,
    private validator: OrderValidator,
    private notifier: OrderNotifier,
    private discount: DiscountStrategy
  ) {}

  async createOrder(order: Order): Promise<void> {
    const errors = this.validator.validate(order);
    if (errors.length > 0) throw new Error(errors.join(", "));
    order.total = this.discount.apply(order);
    await this.repo.write(order);
    await this.notifier.notify(order);
  }
}

// Composition: inject dependencies
const service = new OrderService(
  new OrderRepository(),
  new OrderValidator(),
  new OrderNotifier(),
  new PercentageDiscount(10)
);
```

Lessons:
  - SRP: Order, Repository, Validator, Notifier are separate responsibilities
  - OCP: new discount = new class, do not modify existing ones
  - LSP: any DiscountStrategy can replace another
  - ISP: Readable and Writable separated, do not force unnecessary methods
  - DIP: OrderService depends on interfaces, not concrete classes
  - In tests, inject mocks: MockRepo, MockNotifier, NoDiscount
```

### How do I apply SOLID in legacy code?

Start with SRP: identify classes doing too much and extract responsibilities. Use method and class extraction. Then DIP: introduce interfaces for external dependencies and use injection. OCP comes naturally: when you need to add variation, create a new class instead of modifying. Do not try to apply all principles at once: refactor incrementally, one principle at a time, with tests as a safety net.
