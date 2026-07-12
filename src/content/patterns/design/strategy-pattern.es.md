---





contentType: patterns
slug: strategy-pattern
title: "Patrón Strategy"
description: "Define una familia de algoritmos, encapsula cada uno y los hace intercambiables. Patrón de diseño conductual para selección flexible de comportamiento."
metaDescription: "Aprende el Patrón Strategy con ejemplos prácticos en Python, Java y JavaScript. Patrón conductual para algoritmos intercambiables."
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
  - /patterns/observer-pattern
  - /recipes/sort-array
  - /guides/rest-api-design-guide
  - /patterns/blackboard-pattern
  - /patterns/bridge-pattern
  - /patterns/chain-of-responsibility-pattern
  - /patterns/circuit-breaker-pattern
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende el Patrón Strategy con ejemplos prácticos en Python, Java y JavaScript. Patrón conductual para algoritmos intercambiables."
  keywords:
    - strategy pattern
    - patrón de diseño
    - patrón conductual
    - algoritmos intercambiables
    - python strategy
    - java strategy
    - javascript strategy





---

# Patrón Strategy

## Visión general

El [Patrón Strategy](/patterns/design/strategy-pattern) es un patrón de diseño conductual que define una familia de algoritmos, encapsula cada uno como una clase separada y los hace intercambiables en tiempo de ejecución. Permite que el algoritmo varíe independientemente de los clientes que lo usan.

Es ideal cuando necesitas seleccionar entre múltiples formas de realizar una operación, como diferentes estrategias de ordenamiento, métodos de pago o algoritmos de compresión.

## Cuándo usarlo

Usa el Patrón Strategy cuando:
- Tienes múltiples formas de realizar una operación y quieres cambiar entre ellas en tiempo de ejecución
- Una clase tiene un condicional grande (`if`/`switch`) para seleccionar comportamiento
- Quieres aislar los detalles de implementación del algoritmo del contexto que lo usa
- Necesitas añadir nuevos algoritmos sin modificar código existente (Principio Abierto/Cerrado)
- Diferentes clientes necesitan diferentes variantes del mismo algoritmo

## Solución

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

# Uso
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

// Uso
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

// Uso
Checkout checkout = new Checkout(new CreditCardPayment());
System.out.println(checkout.process(100));
checkout.setStrategy(new PayPalPayment());
System.out.println(checkout.process(50));
```

## Explicación

El Patrón Strategy separa el comportamiento en tres roles:

- **Interfaz Strategy** (`PaymentStrategy`): Define el contrato que todos los algoritmos deben seguir
- **Estrategias concretas** (`CreditCardPayment`, `PayPalPayment`): Los algoritmos intercambiables reales
- **Contexto** (`Checkout`): Usa una estrategia a través de la interfaz, sin conocer la implementación concreta

Esto elimina bloques condicionales grandes y hace que añadir nuevas estrategias sea tan simple como crear una nueva clase.

## Variantes

| Variante | Caso de uso | Compromiso |
|----------|-------------|------------|
| **Strategy simple** | Contexto único, pocas estrategias | Fácil de empezar, acoplamiento directo |
| **[Strategy](/patterns/design/strategy-pattern) con [Factory](/patterns/design/factory-pattern)** | Selección dinámica de estrategias | Más flexible, añade indirección |
| **Strategy funcional** | Lenguajes con funciones de primera clase | Conciso, pero menos explícito que clases |

## Lo que Funciona

- **Usa una interfaz o base abstracta** para asegurar que todas las estrategias tengan la misma firma
- **Mantén las estrategias sin estado** cuando sea posible para facilitar reutilización y testing
- **Inyecta la estrategia** vía constructor o setter en lugar de codificarla
- **Documenta las diferencias entre estrategias** para que los llamadores sepan cuál elegir
- **Evita la inflación de estrategias**: si tienes decenas de estrategias, considera una abstracción diferente

## Errores comunes

- **Filtrar internals del contexto**: Las estrategias no deberían depender de detalles privados del contexto
- **Sobreuso para casos triviales**: Un simple `if` no siempre necesita una clase Strategy
- **Acoplamiento fuerte**: El contexto conociendo clases de estrategia concretas en lugar de la interfaz
- **Interfaces inconsistentes**: Estrategias con diferentes firmas de método rompen la intercambiabilidad
- **Gestión de estado**: Las estrategias con estado mutable pueden causar efectos secundarios inesperados

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre Strategy y State?**
R: Strategy trata sobre algoritmos intercambiables elegidos por el cliente. [State](/patterns/design/state-pattern) trata sobre cambiar comportamiento basado en transiciones de estado internas del objeto.

**P: ¿Puedo usar funciones en lugar de clases para estrategias?**
R: Sí, en lenguajes con funciones de primera clase (JavaScript, Python, Go) puedes pasar funciones directamente. Las clases son mejores cuando las estrategias necesitan configuración o múltiples métodos.

**P: ¿Cuántas estrategias son demasiadas?**
R: No hay límite estricto, pero si te encuentras con decenas, considera agruparlas por categoría o usar un patrón registry/factory.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.


## Temas Avanzados

### Escenario: Strategy para Algoritmos de Pricing

```typescript
// Strategy pattern: intercambiar algoritmos en runtime
interface PricingStrategy {
  calculate(basePrice: number, context: PricingContext): number;
}

interface PricingContext {
  userAge?: number;
  isMember?: boolean;
  orderCount?: number;
  isHoliday?: boolean;
}

class RegularPricing implements PricingStrategy {
  calculate(basePrice: number): number { return basePrice; }
}

class MemberDiscountPricing implements PricingStrategy {
  calculate(basePrice: number, ctx: PricingContext): number {
    const discount = ctx.orderCount > 10 ? 0.20 : 0.10;
    return basePrice * (1 - discount);
  }
}

class SeniorDiscountPricing implements PricingStrategy {
  calculate(basePrice: number, ctx: PricingContext): number {
    if (ctx.userAge >= 65) return basePrice * 0.85;
    return basePrice;
  }
}

class HolidayPricing implements PricingStrategy {
  calculate(basePrice: number, ctx: PricingContext): number {
    if (ctx.isHoliday) return basePrice * 0.90;
    return basePrice;
  }
}

// Contexto: usa la estrategia activa
class PricingService {
  private strategy: PricingStrategy;

  constructor(strategy: PricingStrategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy: PricingStrategy) {
    this.strategy = strategy;
  }

  calculatePrice(basePrice: number, ctx: PricingContext): number {
    return this.strategy.calculate(basePrice, ctx);
  }
}

// Uso: cambiar estrategia en runtime
const pricing = new PricingService(new RegularPricing());

// Cliente regular
console.log(pricing.calculatePrice(100, {})); // 100

// Cambiar a member discount
pricing.setStrategy(new MemberDiscountPricing());
console.log(pricing.calculatePrice(100, { orderCount: 15 })); // 80

// Cambiar a senior
pricing.setStrategy(new SeniorDiscountPricing());
console.log(pricing.calculatePrice(100, { userAge: 70 })); // 85

// Combinar estrategias (composite)
class CompositePricing implements PricingStrategy {
  constructor(private strategies: PricingStrategy[]) {}
  calculate(basePrice: number, ctx: PricingContext): number {
    return this.strategies.reduce(
      (price, s) => s.calculate(price, ctx),
      basePrice
    );
  }
}

// Aplicar member + holiday
const composite = new CompositePricing([
  new MemberDiscountPricing(),
  new HolidayPricing(),
]);
console.log(composite.calculate(100, { orderCount: 15, isHoliday: true })); // 72
```

Lecciones:
  - Strategy intercambia algoritmos sin tocar el cliente
  - Cada estrategia es una clase separada (Open/Closed)
  - Composite strategy combina multiples descuentos
  - El cliente no conoce los detalles del algoritmo
  - Strategy vs State: Strategy cambia algoritmo, State cambia comportamiento segun estado
```

### Strategy vs State: cual uso?

Strategy cambia el algoritmo desde fuera: el cliente elige que estrategia usar. State cambia el comportamiento desde dentro: el objeto cambia su comportamiento segun su estado interno. Strategy es explicito: pricing.setStrategy(new MemberDiscount()). State es implicito: el objeto decide segun su estado. Strategy es un patron de comportamiento; State es un patron de estado.
