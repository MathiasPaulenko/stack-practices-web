---
contentType: guides
slug: complete-guide-refactoring-techniques
title: "Guía Completa de Refactoring: Extract Method, Replace Conditional, Move Function"
description: "Dominá refactoring techniques: extract method, replace conditional with polymorphism, move function, extract class, rename y safe refactoring workflows con tests."
metaDescription: "Dominá refactoring: extract method, replace conditional with polymorphism, move function, extract class, rename y safe refactoring workflows con tests."
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
  metaDescription: "Dominá refactoring: extract method, replace conditional with polymorphism, move function, extract class, rename y safe refactoring workflows con tests."
  keywords:
    - refactoring
    - extract method
    - replace conditional
    - move function
    - extract class
    - rename
    - safe refactoring
---

## Introducción

Refactoring es el process de cambiar code structure sin cambiar behavior. Hace el code easier de read, understand y modify. A continuación: las most common refactoring techniques: extract method, replace conditional with polymorphism, move function, extract class, rename y safe refactoring workflows.

## Safe Refactoring Workflow

```
1. Escribí tests para el code que estás refactorando
2. Corré tests — deberían pasar
3. Hacé one small refactoring change
4. Corré tests — deberían seguir pasando
5. Commiteá
6. Repetí desde step 3
```

```typescript
// Antes de refactor: asegurate que existan tests
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

El most common refactoring. Extractéa un block de code en un named function cuando hace algo que puede ser named.

```typescript
// BEFORE: una long function
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

Reemplazá complex switch/if-else chains con polymorphic classes.

```typescript
// BEFORE: conditional logic para different employee types
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

Mové una function a la class o module donde pertenece. Functions deberían estar close al data que operan.

```typescript
// BEFORE: invoice calculation en Order class, pero usa Customer data
class Order {
  items: Item[];
  customer: Customer;

  calculateDiscount(): number {
    // Esta logic es sobre el customer, no el order
    if (this.customer.isVip && this.customer.yearsActive > 5) {
      return 0.15;
    } else if (this.customer.isVip) {
      return 0.10;
    }
    return 0;
  }
}

// AFTER: mové discount logic a Customer class
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

Spliteá una class que tiene too many responsibilities en smaller classes.

```typescript
// BEFORE: Person class handlea personal info AND address AND phone
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

// AFTER: extracted Address y Phone classes
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

Renombrá variables, functions y classes para revelar intent. El most common y valuable refactoring.

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

- Refactoréa en small steps — one change a la vez, corré tests después de cada uno
- Mantené tests green — si tests break, estás cambiando behavior, no solo structure
- Commiteá frecuentemente — cada successful refactoring step gets un commit
- No refactorées y addees features simultáneamente — separá refactoring commits de feature commits
- Escribí tests antes de refactor — si no hay tests, escribí characterization tests first
- Usá IDE refactoring tools — automated rename, extract method, move class son safer que manual edits
- No refactorées broken code — fixeá bugs first, luego refactor
- Timeboxeá refactoring — no gastes days refactoréando cuando hours bastan
- Pair refactor — dos people spotean issues que uno miss
- Refactoréa antes de addear features — clean code es easier de extend

## Common Mistakes

- **Big bang refactoring**: rewritear everything a la vez. Breakéa en small steps con tests entre cada uno.
- **Refactor sin tests**: no podés saber si rompiste algo. Escribí tests first.
- **Mixing refactoring con features**: hace hard de review y revert. Mantenelos separate.
- **Over-refactoring**: extractear too many tiny functions o too many classes. Balanceá readability con indirection.
- **No correr tests después de cada step**: catchear un break 5 steps después es hard de debug. Corré después de every change.
- **Rename sin updatear references**: usá IDE tools para rename safely, no find-and-replace.

## FAQ

### ¿Cuándo debería refactor?

Refactoréa cuando el code es hard de understand, cuando estás addeando un feature y el existing code es messy, o cuando estás fixeando un bug y el surrounding code es unclear. La rule of three: la third vez que hacés lo mismo, refactor.

### ¿Cómo refactoréa safely?

Escribí tests para el existing behavior. Corrélos para confirmar que pasan. Hacé one small structural change. Corré tests de nuevo. Commiteá. Repetí. Si tests break, cambiaste behavior — revert y probá un smaller step.

### ¿Cuál es el most common refactoring?

Extract Method. Tomá un block de code que hace one thing y movelo en un named function. Reduce function size, improve readability y habilita reuse.

### ¿Cuándo debería replace conditional con polymorphism?

Cuando tenés un switch o if-else chain que checkea el same type field en multiple places. Cada new type requiere addear un case a every switch. Polymorphism te deja addear un new class en vez.

### ¿Qué es un guard clause?

Un early return que handlea un special case al start de una function. Reemplaza deep nesting con flat structure: `if (!condition) return defaultValue;` en vez de wrappear el main logic en un if block.
