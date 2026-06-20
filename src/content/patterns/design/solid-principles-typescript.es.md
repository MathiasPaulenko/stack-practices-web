---
contentType: patterns
slug: solid-principles-typescript
title: "Principios SOLID en TypeScript con Ejemplos Practicos"
description: "Aplica los cinco principios SOLID a codigo TypeScript para mejorar mantenibilidad, testeabilidad y reducir acoplamiento en disenos orientados a objetos"
metaDescription: "Principios SOLID en TypeScript. Aplica Responsabilidad Unica, Abierto/Cerrado, Sustitucion de Liskov, Segregacion de Interfaces e Inversion de Dependencias."
difficulty: intermediate
topics:
  - design
tags:
  - solid
  - clean-code
  - typescript
  - design-pattern
relatedResources:
  - /patterns/design/adapter-pattern-api
   - /patterns/design/decorator-pattern-pipeline
  - /guides/clean-code-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Principios SOLID en TypeScript. Aplica Responsabilidad Unica, Abierto/Cerrado, Sustitucion de Liskov, Segregacion de Interfaces e Inversion de Dependencias."
  keywords:
    - solid principles
    - typescript
    - clean code
    - object oriented design
    - dependency inversion
---

# Principios SOLID en TypeScript con Ejemplos Practicos

Los [principios SOLID](/guides/design/solid-principles-guide) proporcionan un marco para escribir codigo orientado a objetos mantenible. Aplicados a TypeScript, ayudan a prevenir los problemas comunes de clases fuertemente acopladas, jerarquias de herencia fragiles y grafos de dependencias inmantenibles.

## Cuando Usar Esto

- Las clases crecen mas de 200 lineas y manejan multiples responsabilidades
- Cambiar una funcionalidad requiere modificar codigo no relacionado
- Los tests unitarios requieren mocking extenso de dependencias concretas

## S — Single Responsibility Principle

Una clase debe tener una razon para cambiar. Cuando una clase maneja tanto acceso a datos como logica de negocio, los cambios en el esquema de base de datos fuerzan retestear las reglas de negocio.

```typescript
// Antes: OrderService maneja validacion, persistencia y notificaciones
class OrderService {
  async createOrder(data: OrderData) {
    if (!this.validate(data)) throw new Error('Invalid');
    await this.db.query('INSERT INTO orders ...');
    await this.sendEmail(data.customerEmail);
  }
}

// Despues: Responsabilidades separadas
class OrderValidator {
  validate(data: OrderData): boolean {
    return !!data.items?.length && data.total > 0;
  }
}

class OrderRepository {
  async save(order: OrderData): Promise<Order> {
    // Logica de base de datos solamente
  }
}

class OrderNotificationService {
  async sendConfirmation(email: string, order: Order): Promise<void> {
    // Logica de email solamente
  }
}
```

## O — Open/Closed Principle

Las entidades de software deben estar abiertas para extension pero cerradas para modificacion. Usa composicion e interfaces en lugar de modificar codigo existente. Consulta [Strategy](/patterns/design/strategy-pattern) y [Decorator](/patterns/design/decorator-pattern) para ejemplos practicos.

```typescript
interface PaymentProcessor {
  process(amount: number): Promise<PaymentResult>;
}

class StripeProcessor implements PaymentProcessor {
  async process(amount: number) {
    // Logica especifica de Stripe
    return { success: true, transactionId: 'stripe_123' };
  }
}

class PayPalProcessor implements PaymentProcessor {
  async process(amount: number) {
    // Logica especifica de PayPal
    return { success: true, transactionId: 'paypal_456' };
  }
}

// Checkout no cambia al agregar nuevos procesadores
class CheckoutService {
  constructor(private processor: PaymentProcessor) {}

  async charge(amount: number) {
    return this.processor.process(amount);
  }
}
```

## L — Liskov Substitution Principle

Los subtipos deben ser sustituibles por sus tipos base sin alterar la correccion del programa.

```typescript
// Violacion: PremiumCustomer rompe el contrato de Customer
class Customer {
  getDiscount(): number { return 0; }
}

class PremiumCustomer extends Customer {
  getDiscount(): number { return 0.2; }
}

// Correcto: Ambos satisfacen el mismo contrato
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

Los clientes no deben depender de interfaces que no usan. Divide interfaces grandes en interfaces enfocadas.

```typescript
// Antes: La interfaz Printer fuerza capacidad de Fax
interface MultiFunctionDevice {
  print(document: string): void;
  scan(): string;
  fax(document: string): void;
}

// Despues: Interfaces segregadas
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

Depende de abstracciones, no de implementaciones concretas. Usa inyeccion por constructor para hacer dependencias explicitas y testeables. Consulta [Inyeccion de Dependencias](/patterns/design/dependency-injection-pattern) para patrones de wiring.

```typescript
interface Logger {
  log(message: string): void;
}

class ConsoleLogger implements Logger {
  log(message: string) { console.log(message); }
}

class FileLogger implements Logger {
  log(message: string) { /* escribe a archivo */ }
}

class UserService {
  constructor(private logger: Logger) {}

  createUser(data: UserData) {
    // Logica de negocio
    this.logger.log(`User created: ${data.email}`);
  }
}

// Tests inyectan un logger mock
class MockLogger implements Logger {
  messages: string[] = [];
  log(message: string) { this.messages.push(message); }
}
```

## Como Funciona

1. **Single Responsibility** aísla el impacto del cambio a una clase
2. **Open/Closed** permite agregar funcionalidades sin riesgo de regresion
3. **Liskov Substitution** asegura que las jerarquias de herencia permanezcan seguras
4. **Interface Segregation** previene interfaces gordas y dependencias forzadas
5. **Dependency Inversion** habilita tests unitarios y cambio de frameworks

## Consideraciones de Produccion

- Usa **contenedores de inyeccion de dependencias** como TSyringe o InversifyJS para aplicaciones grandes
- Aplica SOLID incrementalmente; refactorizar todo a la vez es riesgoso
- Combina con el patron **Composition Root** para cablear dependencias al iniciar la aplicacion

## Errores Comunes

- Crear una interfaz por clase (sobre-ingenieria)
- Usar herencia cuando la composicion es suficiente
- Inyectar clases concretas en lugar de interfaces en constructores

## FAQ

**P: SOLID aplica a programacion funcional?**
R: Parcialmente. SRP y DIP se traducen bien. OCP y LSP son menos relevantes cuando se usan funciones puras en lugar de clases.

**P: Toda clase debe implementar una interfaz?**
R: No. Extrae interfaces solo cuando hay multiples implementaciones o cuando los tests requieren mocking.
