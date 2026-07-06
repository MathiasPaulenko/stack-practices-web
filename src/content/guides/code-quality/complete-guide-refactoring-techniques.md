---
contentType: guides
slug: complete-guide-refactoring-techniques
title: "Refactoring Guide: Extract Method, Replace Conditional, Move Function"
description: "Master refactoring techniques: extract method, replace conditional with polymorphism, move function, extract class, rename, and safe refactoring workflows with tests."
metaDescription: "Master refactoring techniques: extract method, replace conditional with polymorphism, move function, extract class, rename, and safe refactoring workflows with tests."
difficulty: intermediate
topics:
  - testing
tags:
  - guide
  - refactoring
  - code-quality
  - extract-method
  - polymorphism
  - clean-code
  - technical-debt
  - best-practices
relatedResources:
  - /guides/code-quality/complete-guide-clean-code-principles
  - /guides/code-quality/complete-guide-technical-debt-management
  - /guides/code-quality/complete-guide-code-review-best-practices
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 22
seo:
  metaDescription: "Master refactoring techniques: extract method, replace conditional with polymorphism, move function, extract class, rename, and safe refactoring workflows with tests."
  keywords:
    - refactoring
    - extract method
    - replace conditional
    - move function
    - extract class
    - rename
    - safe refactoring
---

## Introduction

Refactoring is the process of changing code structure without changing behavior. It makes code easier to read, understand, and modify. This guide walks through the most common refactoring techniques: extract method, replace conditional with polymorphism, move function, extract class, rename, and safe refactoring workflows.

## Safe Refactoring Workflow

```
1. Write tests for the code you're refactoring
2. Run tests — they should pass
3. Make one small refactoring change
4. Run tests — they should still pass
5. Commit
6. Repeat from step 3
```

```typescript
// Before refactoring: ensure tests exist
describe('OrderProcessor', () => {
  it('calculates total for regular customer', () => {
    const order = { items: [{ price: 100 }], customer: { isVip: false } };
    expect(processOrder(order)).toBe(100);
  });

  it('applies 10% discount for VIP customer', () => {
    const order = { items: [{ price: 100 }], customer: { isVip: true } };
    expect(processOrder(order)).toBe(90);
  });

  it('calculates tax for food items at 5%', () => {
    const order = { items: [{ price: 100, category: 'food' }], customer: { isVip: false } };
    const result = processOrder(order);
    expect(result).toBe(105); // 100 + 5% tax
  });
});
```

## Extract Method

The most common refactoring. Extract a block of code into a named function when it does something that can be named.

```typescript
// BEFORE: one long function
function printInvoice(order: Order): void {
  // Print header
  console.log('************************');
  console.log('*     INVOICE          *');
  console.log('************************');
  console.log(`Date: ${order.date}`);
  console.log(`Customer: ${order.customer.name}`);

  // Print items
  for (const item of order.items) {
    console.log(`${item.name}: ${item.price} x ${item.quantity} = ${item.price * item.quantity}`);
  }

  // Print total
  const subtotal = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = subtotal * 0.10;
  const total = subtotal + tax;
  console.log(`Subtotal: ${subtotal}`);
  console.log(`Tax: ${tax}`);
  console.log(`Total: ${total}`);
}

// AFTER: extracted methods
function printInvoice(order: Order): void {
  printHeader(order);
  printItems(order.items);
  printTotals(order.items);
}

function printHeader(order: Order): void {
  console.log('************************');
  console.log('*     INVOICE          *');
  console.log('************************');
  console.log(`Date: ${order.date}`);
  console.log(`Customer: ${order.customer.name}`);
}

function printItems(items: Item[]): void {
  for (const item of items) {
    console.log(`${item.name}: ${item.price} x ${item.quantity} = ${item.price * item.quantity}`);
  }
}

function printTotals(items: Item[]): void {
  const subtotal = calculateSubtotal(items);
  const tax = subtotal * 0.10;
  const total = subtotal + tax;
  console.log(`Subtotal: ${subtotal}`);
  console.log(`Tax: ${tax}`);
  console.log(`Total: ${total}`);
}

function calculateSubtotal(items: Item[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}
```

## Replace Conditional with Polymorphism

Replace complex switch/if-else chains with polymorphic classes.

```typescript
// BEFORE: conditional logic for different employee types
function calculatePay(employee: Employee): number {
  switch (employee.type) {
    case 'ENGINEER':
      return employee.salary;
    case 'MANAGER':
      return employee.salary + employee.bonus;
    case 'SALESMAN':
      return employee.baseSalary + employee.commission * employee.salesCount;
    case 'INTERN':
      return employee.hourlyRate * employee.hoursWorked;
    default:
      throw new Error(`Unknown employee type: ${employee.type}`);
  }
}

function calculateVacationDays(employee: Employee): number {
  switch (employee.type) {
    case 'ENGINEER':
      return 20;
    case 'MANAGER':
      return 30;
    case 'SALESMAN':
      return 25;
    case 'INTERN':
      return 10;
    default:
      throw new Error(`Unknown employee type: ${employee.type}`);
  }
}

// AFTER: polymorphic classes
abstract class Employee {
  abstract calculatePay(): number;
  abstract calculateVacationDays(): number;
}

class Engineer extends Employee {
  constructor(private salary: number) { super(); }
  calculatePay(): number { return this.salary; }
  calculateVacationDays(): number { return 20; }
}

class Manager extends Employee {
  constructor(private salary: number, private bonus: number) { super(); }
  calculatePay(): number { return this.salary + this.bonus; }
  calculateVacationDays(): number { return 30; }
}

class Salesman extends Employee {
  constructor(
    private baseSalary: number,
    private commission: number,
    private salesCount: number,
  ) { super(); }
  calculatePay(): number { return this.baseSalary + this.commission * this.salesCount; }
  calculateVacationDays(): number { return 25; }
}

class Intern extends Employee {
  constructor(private hourlyRate: number, private hoursWorked: number) { super(); }
  calculatePay(): number { return this.hourlyRate * this.hoursWorked; }
  calculateVacationDays(): number { return 10; }
}

// Usage: no conditionals needed
function processPayroll(employee: Employee): number {
  return employee.calculatePay();
}
```

## Move Function

Move a function to the class or module where it belongs. Functions should be close to the data they operate on.

```typescript
// BEFORE: invoice calculation in Order class, but it uses Customer data
class Order {
  items: Item[];
  customer: Customer;

  calculateDiscount(): number {
    // This logic is about the customer, not the order
    if (this.customer.isVip && this.customer.yearsActive > 5) {
      return 0.15;
    } else if (this.customer.isVip) {
      return 0.10;
    }
    return 0;
  }
}

// AFTER: move discount logic to Customer class
class Customer {
  isVip: boolean;
  yearsActive: number;

  calculateDiscount(): number {
    if (this.isVip && this.yearsActive > 5) {
      return 0.15;
    } else if (this.isVip) {
      return 0.10;
    }
    return 0;
  }
}

class Order {
  items: Item[];
  customer: Customer;

  calculateTotal(): number {
    const subtotal = this.items.reduce((sum, i) => sum + i.price, 0);
    const discount = this.customer.calculateDiscount();
    return subtotal * (1 - discount);
  }
}
```

## Extract Class

Split a class that has too many responsibilities into smaller classes.

```typescript
// BEFORE: Person class handles personal info AND address AND phone
class Person {
  constructor(
    public name: string,
    public email: string,
    public street: string,
    public city: string,
    public state: string,
    public zipCode: string,
    public phone: string,
    public phoneType: string,
  ) {}

  getFullAddress(): string {
    return `${this.street}, ${this.city}, ${this.state} ${this.zipCode}`;
  }

  getFormattedPhone(): string {
    const cleaned = this.phone.replace(/\D/g, '');
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  isValidEmail(): boolean {
    return /^[^@]+@[^@]+\.[^@]+$/.test(this.email);
  }
}

// AFTER: extracted Address and Phone classes
class Address {
  constructor(
    public street: string,
    public city: string,
    public state: string,
    public zipCode: string,
  ) {}

  getFullAddress(): string {
    return `${this.street}, ${this.city}, ${this.state} ${this.zipCode}`;
  }
}

class PhoneNumber {
  constructor(public number: string, public type: string) {}

  getFormatted(): string {
    const cleaned = this.number.replace(/\D/g, '');
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
}

class Person {
  public address: Address;
  public phone: PhoneNumber;

  constructor(
    public name: string,
    public email: string,
    address: Address,
    phone: PhoneNumber,
  ) {
    this.address = address;
    this.phone = phone;
  }

  isValidEmail(): boolean {
    return /^[^@]+@[^@]+\.[^@]+$/.test(this.email);
  }
}
```

## Rename

Rename variables, functions, and classes to reveal intent. The most common and valuable refactoring.

```typescript
// BEFORE: unclear names
function calc(a: number[], b: number): number {
  let r = 0;
  for (const i of a) {
    if (i > b) {
      r += i - b;
    }
  }
  return r;
}

// AFTER: meaningful names
function calculateExcessOverThreshold(values: number[], threshold: number): number {
  let excess = 0;
  for (const value of values) {
    if (value > threshold) {
      excess += value - threshold;
    }
  }
  return excess;
}
```

## Replace Magic Number with Named Constant

```typescript
// BEFORE: magic numbers
function calculatePay(hoursWorked: number): number {
  if (hoursWorked > 40) {
    return 40 * 25 + (hoursWorked - 40) * 25 * 1.5;
  }
  return hoursWorked * 25;
}

// AFTER: named constants
const REGULAR_HOURS = 40;
const HOURLY_RATE = 25;
const OVERTIME_MULTIPLIER = 1.5;

function calculatePay(hoursWorked: number): number {
  if (hoursWorked > REGULAR_HOURS) {
    const overtimeHours = hoursWorked - REGULAR_HOURS;
    return REGULAR_HOURS * HOURLY_RATE + overtimeHours * HOURLY_RATE * OVERTIME_MULTIPLIER;
  }
  return hoursWorked * HOURLY_RATE;
}
```

## Replace Nested Conditional with Guard Clauses

```typescript
// BEFORE: deeply nested conditionals
function getPayment(employee: Employee): number {
  let result = 0;
  if (employee.isEmployed) {
    if (employee.isSalaried) {
      if (employee.isMonthly) {
        result = calculateMonthlySalary(employee);
      } else {
        result = calculateHourlySalary(employee);
      }
    } else {
      result = calculateContractorPay(employee);
    }
  } else {
    result = 0;
  }
  return result;
}

// AFTER: guard clauses
function getPayment(employee: Employee): number {
  if (!employee.isEmployed) return 0;
  if (!employee.isSalaried) return calculateContractorPay(employee);
  if (employee.isMonthly) return calculateMonthlySalary(employee);
  return calculateHourlySalary(employee);
}
```

## Best Practices

- Refactor in small steps — one change at a time, run tests after each
- Keep tests green — if tests break, you're changing behavior, not just structure
- Commit frequently — each successful refactoring step gets a commit
- Don't refactor and add features simultaneously — separate refactoring commits from feature commits
- Write tests before refactoring — if there are no tests, write characterization tests first
- Use IDE refactoring tools — automated rename, extract method, move class are safer than manual edits
- Don't refactor broken code — fix bugs first, then refactor
- Timebox refactoring — don't spend days refactoring when hours will do
- Pair refactor — two people spot issues that one person misses
- Refactor before adding features — clean code is easier to extend

## Common Mistakes

- **Big bang refactoring**: rewriting everything at once. Break into small steps with tests between each.
- **Refactoring without tests**: you can't know if you broke something. Write tests first.
- **Mixing refactoring with features**: makes it hard to review and revert. Keep them separate.
- **Over-refactoring**: extracting too many tiny functions or too many classes. Balance readability with indirection.
- **Not running tests after each step**: catching a break 5 steps later is hard to debug. Run after every change.
- **Renaming without updating references**: use IDE tools to rename safely, not find-and-replace.

## FAQ

### When should I refactor?

Refactor when the code is hard to understand, when you're adding a feature and the existing code is messy, or when you're fixing a bug and the surrounding code is unclear. The rule of three: the third time you do the same thing, refactor.

### How do I refactor safely?

Write tests for the existing behavior. Run them to confirm they pass. Make one small structural change. Run tests again. Commit. Repeat. If tests break, you've changed behavior — revert and try a smaller step.

### What is the most common refactoring?

Extract Method. Take a block of code that does one thing and move it into a named function. It reduces function size, improves readability, and enables reuse.

### When should I replace conditional with polymorphism?

When you have a switch or if-else chain that checks the same type field in multiple places. Each new type requires adding a case to every switch. Polymorphism lets you add a new class instead.

### What is a guard clause?

An early return that handles a special case at the start of a function. It replaces deep nesting with flat structure: `if (!condition) return defaultValue;` instead of wrapping the main logic in an if block.
