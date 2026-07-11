---
contentType: guides
slug: complete-guide-clean-code-principles
title: "Clean Code: Naming, Functions, Classes, Comments"
description: "Dominá clean code principles: meaningful naming, small functions, single responsibility, comments, formatting, error handling y patrones de code quality en producción."
metaDescription: "Dominá clean code principles: meaningful naming, small functions, single responsibility, comments, formatting, error handling y patrones de code quality."
difficulty: intermediate
topics:
  - testing
tags:
  - guide
  - clean-code
  - code-quality
  - naming
  - functions
  - refactoring
  - best-practices
  - maintainability
relatedResources:
  - /guides/code-quality/complete-guide-refactoring-techniques
  - /guides/code-quality/complete-guide-technical-debt-management
  - /patterns/testing/factory-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 20
seo:
  metaDescription: "Dominá clean code principles: meaningful naming, small functions, single responsibility, comments, formatting, error handling y patrones de code quality."
  keywords:
    - clean code
    - naming conventions
    - function design
    - single responsibility
    - code quality
    - refactoring
    - maintainability
---

## Introducción

Clean code es code que es easy de read, understand y modify. Está escrito para humans, no compilers. Los principles vienen de "Clean Code" de Robert C. Martin y decades de software engineering practice. A continuación: naming, functions, classes, comments, formatting, error handling y production patterns.

## Meaningful Names

### Usá intention-revealing names

```typescript
// BAD: ¿qué representa d?
const d = 5; // elapsed time in days
const total = d * 24 * 60 * 60;

// GOOD: el name revela intent
const elapsedTimeInDays = 5;
const totalSeconds = elapsedTimeInDays * 24 * 60 * 60;
```

### Evitá disinformation

```typescript
// BAD: accountList no es un List
const accountList = new Set<Account>();

// GOOD: el name refleja el data structure
const accountSet = new Set<Account>();
// o simplemente
const accounts = new Set<Account>();
```

### Usá searchable names

```typescript
// BAD: 5 es un magic number, hard de search
if (employee.type === 5) {
  giveBonus(employee);
}

// GOOD: named constant es searchable
const SENIOR_ENGINEER = 5;
if (employee.type === SENIOR_ENGINEER) {
  giveBonus(employee);
}
```

### Class names deberían ser nouns

```typescript
// GOOD: nouns
class Customer { }
class Account { }
class OrderProcessor { }
class PaymentValidator { }

// BAD: verbs
class ProcessOrder { }    // debería ser un method
class ValidatePayment { } // debería ser un method
```

### Method names deberían ser verbs

```typescript
// GOOD: verbs
function processOrder(order: Order): void { }
function validatePayment(payment: Payment): boolean { }
function calculateTotal(items: Item[]): number { }

// BAD: nouns para actions
function orderProcessing(order: Order): void { }
function paymentValidation(payment: Payment): boolean { }
```

## Functions

### Small y focused

```typescript
// BAD: la function hace too many things
function processOrder(order: Order): void {
  // Validate
  if (!order.items || order.items.length === 0) {
    throw new Error('Order has no items');
  }
  if (order.total <= 0) {
    throw new Error('Order total must be positive');
  }

  // Calculate tax
  let tax = 0;
  for (const item of order.items) {
    if (item.category === 'food') {
      tax += item.price * 0.05;
    } else if (item.category === 'electronics') {
      tax += item.price * 0.18;
    } else {
      tax += item.price * 0.10;
    }
  }

  // Apply discount
  if (order.customer.isVip) {
    order.total *= 0.90;
  }

  // Save to database
  db.query('INSERT INTO orders ...', order);

  // Send email
  emailService.send(order.customer.email, 'Order confirmed', order);
}

// GOOD: cada function hace one thing
function processOrder(order: Order): void {
  validateOrder(order);
  const tax = calculateTax(order.items);
  applyDiscount(order);
  saveOrder(order);
  sendConfirmationEmail(order);
}

function validateOrder(order: Order): void {
  if (!order.items || order.items.length === 0) {
    throw new Error('Order has no items');
  }
  if (order.total <= 0) {
    throw new Error('Order total must be positive');
  }
}

function calculateTax(items: Item[]): number {
  const taxRates: Record<string, number> = {
    food: 0.05,
    electronics: 0.18,
    default: 0.10,
  };
  return items.reduce((total, item) => {
    const rate = taxRates[item.category] ?? taxRates.default;
    return total + item.price * rate;
  }, 0);
}

function applyDiscount(order: Order): void {
  if (order.customer.isVip) {
    order.total *= 0.90;
  }
}
```

### No más de 2-3 parameters

```typescript
// BAD: too many parameters, hard de understand
function createOrder(customerId: string, items: Item[], shippingAddress: Address, billingAddress: Address, paymentMethod: string, couponCode: string | null): Order { }

// GOOD: parameter object
interface CreateOrderRequest {
  customerId: string;
  items: Item[];
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: string;
  couponCode?: string;
}

function createOrder(request: CreateOrderRequest): Order { }
```

### No side effects

```typescript
// BAD: la function checkea password E inicializa session (side effect)
function checkPassword(user: User, password: string): boolean {
  if (user.password === hash(password)) {
    session.initialize(user); // side effect!
    return true;
  }
  return false;
}

// GOOD: separá concerns
function validatePassword(user: User, password: string): boolean {
  return user.password === hash(password);
}

function login(user: User, password: string): Session {
  if (!validatePassword(user, password)) {
    throw new Error('Invalid credentials');
  }
  return session.initialize(user);
}
```

### Command-query separation

```typescript
// BAD: la function both setea y returnea un value
function setAttribute(name: string, value: string): boolean {
  if (isValid(name, value)) {
    attributes[name] = value;
    return true;
  }
  return false;
}

// GOOD: separá command de query
function setAttribute(name: string, value: string): void {
  if (!isValid(name, value)) {
    throw new Error(`Invalid attribute: ${name}=${value}`);
  }
  attributes[name] = value;
}

function isValidAttribute(name: string, value: string): boolean {
  return isValid(name, value);
}
```

## Classes

### Single Responsibility Principle

```typescript
// BAD: la class hace too many things
class OrderManager {
  processOrder(order: Order) { /* ... */ }
  calculateTax(order: Order) { /* ... */ }
  sendEmail(order: Order) { /* ... */ }
  generateInvoice(order: Order) { /* ... */ }
  saveToDatabase(order: Order) { /* ... */ }
}

// GOOD: cada class tiene one responsibility
class OrderProcessor {
  constructor(
    private readonly taxCalculator: TaxCalculator,
    private readonly orderRepository: OrderRepository,
    private readonly emailService: EmailService,
    private readonly invoiceGenerator: InvoiceGenerator,
  ) {}

  process(order: Order): void {
    const tax = this.taxCalculator.calculate(order);
    order.tax = tax;
    this.orderRepository.save(order);
    this.emailService.sendConfirmation(order);
    this.invoiceGenerator.generate(order);
  }
}

class TaxCalculator {
  calculate(order: Order): number { /* ... */ }
}

class OrderRepository {
  save(order: Order): void { /* ... */ }
}

class EmailService {
  sendConfirmation(order: Order): void { /* ... */ }
}

class InvoiceGenerator {
  generate(order: Order): Invoice { /* ... */ }
}
```

### Encapsulation

```typescript
// BAD: public fields exponen internal state
class BankAccount {
  public balance: number = 0;

  deposit(amount: number) {
    this.balance += amount;
  }
}

// Cualquiera puede modify balance directamente
account.balance = 1000000; // bypasséando deposit logic

// GOOD: private fields con controlled access
class BankAccount {
  private _balance: number = 0;

  get balance(): number {
    return this._balance;
  }

  deposit(amount: number): void {
    if (amount <= 0) {
      throw new Error('Deposit amount must be positive');
    }
    this._balance += amount;
  }

  withdraw(amount: number): void {
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be positive');
    }
    if (amount > this._balance) {
      throw new Error('Insufficient funds');
    }
    this._balance -= amount;
  }
}
```

## Comments

### Comments no compensan bad code

```typescript
// BAD: el comment explaina unclear code
// Check if employee is eligible for bonus
if (employee.flags & 0x80 && employee.yearsOfService > 5) {
  giveBonus(employee);
}

// GOOD: el code es self-documenting
if (employee.isEligibleForBonus()) {
  giveBonus(employee);
}
```

### Good comments: explainá intent

```typescript
// GOOD: explaina por qué, no qué
// Using binary search because the list is sorted and large (>10k items)
// Linear scan was 50ms slower in benchmarks
function findItem(sortedItems: Item[], target: string): Item | null {
  let low = 0;
  let high = sortedItems.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const comparison = sortedItems[mid].id.localeCompare(target);

    if (comparison === 0) return sortedItems[mid];
    if (comparison < 0) low = mid + 1;
    else high = mid - 1;
  }

  return null;
}
```

### Good comments: warnings

```typescript
// GOOD: warneá sobre consequences
// This function is called on every keystroke — keep it under 5ms
function autoComplete(input: string): string[] {
  // ...
}
```

### Bad comments: obvious comments

```typescript
// BAD: statea lo obvious
// Increment i by 1
i++;

// BAD: commented-out code
// const oldCalculation = calculateOldWay(order);
// if (oldCalculation > 0) { ... }
```

## Error Handling

### Usá exceptions, no error codes

```typescript
// BAD: error codes forzan al caller a checkear
function deletePage(page: Page): number {
  if (page.isLocked) {
    return E_LOCKED;
  }
  if (!page.exists) {
    return E_NOT_FOUND;
  }
  page.delete();
  return E_OK;
}

const result = deletePage(page);
if (result === E_OK) {
  // success
} else if (result === E_LOCKED) {
  // handle locked
} else if (result === E_NOT_FOUND) {
  // handle not found
}

// GOOD: exceptions separan happy path de error handling
function deletePage(page: Page): void {
  if (page.isLocked) {
    throw new PageLockedException(page.id);
  }
  if (!page.exists) {
    throw new PageNotFoundException(page.id);
  }
  page.delete();
}

try {
  deletePage(page);
} catch (error) {
  if (error instanceof PageLockedException) {
    handleLockedPage(error);
  } else if (error instanceof PageNotFoundException) {
    handleMissingPage(error);
  }
}
```

### No returnees null

```typescript
// BAD: el caller debe checkear null
function getCustomer(id: string): Customer | null {
  return db.query('SELECT * FROM customers WHERE id = ?', id);
}

const customer = getCustomer(id);
if (customer !== null) {
  // 20 lines de code usando customer
} else {
  // handle missing
}

// GOOD: returneá empty object o throw
function getCustomer(id: string): Customer {
  const customer = db.query('SELECT * FROM customers WHERE id = ?', id);
  if (!customer) {
    throw new CustomerNotFoundException(id);
  }
  return customer;
}

// o usá Option/Maybe pattern
function findCustomer(id: string): Option<Customer> {
  const customer = db.query('SELECT * FROM customers WHERE id = ?', id);
  return customer ? Option.some(customer) : Option.none();
}
```

### No pases null

```typescript
// BAD: el method debe handle null parameter
function calculateDiscount(customer: Customer | null): number {
  if (customer === null) {
    return 0;
  }
  if (customer.isVip) {
    return 0.10;
  }
  return 0;
}

// GOOD: usá null object o overload
function calculateDiscount(customer: Customer): number {
  if (customer.isVip) {
    return 0.10;
  }
  return 0;
}

// Null object pattern
const NO_CUSTOMER: Customer = {
  id: 'none',
  isVip: false,
  name: 'Guest',
};
```

## Formatting

### Vertical formatting: leé top to bottom

```typescript
// GOOD: high-level concepts arriba, details abajo
class OrderService {
  // Public interface first
  process(order: Order): void {
    this.validate(order);
    this.calculate(order);
    this.save(order);
  }

  // Private helpers abajo
  private validate(order: Order): void {
    this.validateItems(order);
    this.validateTotal(order);
  }

  private calculate(order: Order): void {
    order.tax = this.calculateTax(order);
    order.discount = this.calculateDiscount(order);
  }

  private save(order: Order): void {
    this.repository.save(order);
  }

  // Lowest-level details al bottom
  private validateItems(order: Order): void { /* ... */ }
  private validateTotal(order: Order): void { /* ... */ }
  private calculateTax(order: Order): number { /* ... */ }
  private calculateDiscount(order: Order): number { /* ... */ }
}
```

### Horizontal formatting: mantené lines short

```typescript
// BAD: line too long
const result = await orderService.processOrderWithPaymentAndShippingAndTaxCalculation(order, paymentMethod, shippingAddress, billingAddress);

// GOOD: breakéa en readable lines
const result = await orderService.processOrder({
  order,
  paymentMethod,
  shippingAddress,
  billingAddress,
});
```

## Best Practices

- Nombrá things para revelar intent — un good name replacea un comment
- Mantené functions small — 4-20 lines, hacé one thing
- Limitá parameters a 2-3 — usá parameter objects para más
- Seguí command-query separation — una function either hace algo o returnea algo, no both
- Usá exceptions para error handling — no returnees error codes
- No returnees null — usá el Option pattern o throw
- No pases null — usá null objects o default values
- Escribí comments que explainen por qué, no qué — el code muestra qué
- Mantené one level de abstraction per function — no mezcles high-level logic con low-level details
- Organizá code top to bottom — high-level concepts first, details abajo
- Usá consistent formatting — seguí el project's style guide
- Refactoréa antes de addear features — clean code es easier de extend

## Common Mistakes

- **Functions que hacen too many things**: hard de test, hard de reuse, hard de understand. Extractéa responsibilities en separate functions.
- **Meaningless names**: `data`, `info`, `temp`, `manager`, `helper` no le dicen al reader nada. Usá specific, descriptive names.
- **Commented-out code**: dead code que nadie recuerda por qué está ahí. Deleteálo — version control tiene el history.
- **Returnear null**: forzá a every caller a checkear. Usá exceptions o el Option pattern.
- **Deep nesting**: más de 3 levels de indentation es hard de follow. Extractéa nested logic en functions o usá early returns.
- **Large classes**: classes con 500+ lines violan SRP. Spliteá en smaller, focused classes.

## FAQ

### ¿Qué es clean code?

Code que es easy de read, understand y modify. Sigue principles como meaningful naming, small focused functions, single responsibility y clear error handling. Clean code está escrito para el next developer que lo lee.

### ¿Qué tan small deberían ser las functions?

Small enough que hagan one thing. Típicamente 4-20 lines. Si una function tiene multiple levels de abstraction, extractéa los lower levels en helper functions. El test: ¿podés describir qué la function hace en una sentence sin usar "and"?

### ¿Debería escribir comments?

Escribí comments que explainen por qué algo se hace, no qué el code hace. El code debería ser self-documenting a través de good naming. Comments que statean lo obvious (`i++ // increment i`) son noise. Comments que warnean sobre consequences o explainan non-obvious decisions son valuable.

### ¿Qué es el Single Responsibility Principle?

Una class o function debería tener one reason to change. Si una class handlea order processing, tax calculation y email sending, tiene three reasons to change. Spliteá en three classes, cada una con one responsibility.

### ¿Cómo handleo errors sin returnear null?

Throwéa exceptions para exceptional conditions. Usá el Option/Maybe pattern para operations que might no returnear un value. Usá el Result/Either type para operations que might fail. Nunca returnees null de una function — forzá a every caller a checkear.
