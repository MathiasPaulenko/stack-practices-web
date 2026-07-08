---
contentType: recipes
slug: strategy-pattern-recipe
title: "Intercambiar Algoritmos en Runtime con el Strategy Pattern"
description: "Cómo encapsular algoritmos y comportamientos intercambiables usando el strategy pattern con inyección de dependencias, function pointers y lambda strategies en Java, TypeScript y Python."
metaDescription: "Aprende strategy pattern para intercambiar algoritmos en runtime. Encapsula comportamientos intercambiables con DI, function pointers y lambda strategies."
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
  metaDescription: "Aprende strategy pattern para intercambiar algoritmos en runtime. Encapsula comportamientos intercambiables con DI, function pointers y lambda strategies."
  keywords:
    - strategy pattern
    - intercambiar algoritmos runtime
    - patron behavioral
    - polimorfismo strategy
    - encapsular comportamiento
---

## Visión general

Un sistema de checkout de e-commerce calcula costos de envío. Para órdenes domésticas, usa precio flat-rate. Para órdenes internacionales, usa precio basado en peso. Para entrega express, usa distancia más multiplicadores de urgencia. Una implementación ingenua pone los tres cálculos en un solo método `calculateShipping()` con un enorme `switch`. Agregar un nuevo método de envío significa editar ese método, violando el principio open-closed. Testear la lógica de envío requiere configurar todo el objeto checkout.

El strategy pattern separa los algoritmos del contexto que los usa. Cada algoritmo de envío se convierte en su propia clase implementando una interfaz `ShippingStrategy` compartida. El checkout mantiene una referencia a una estrategia y delega el cálculo a ella. En runtime, intercambias estrategias — flat rate para doméstico, weight-based para internacional — sin cambiar el código del checkout. Nuevas estrategias se agregan escribiendo nuevas clases, no editando existentes. La solucion a continuacion cubre estrategias basadas en clases, en funciones y selección por inyección de dependencias.

## Cuándo usarlo

Usa esta receta cuando:

- Múltiples algoritmos o comportamientos existen para la misma tarea y solo uno se usa a la vez. Consulta [Factory Pattern](/recipes/factory-pattern-recipe) para crear algoritmos.
- El algoritmo debe seleccionarse en runtime basado en configuración o input del usuario. Consulta [Input Validation](/recipes/api/input-validation) para configuración segura.
- Quieres aislar la complejidad del algoritmo de la lógica de negocio principal
- Agregar nuevas variantes no debería requerir modificar código existente. Consulta [Adapter Pattern](/recipes/adapter-pattern-recipe) para extender interfaces.
- El estado o configuración específico del algoritmo necesita encapsulación separada del contexto

## Solución

### Estrategia Basada en Clases (TypeScript)

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

const strategy = order.destination === 'domestic'
  ? new FlatRateStrategy(10)
  : new WeightBasedStrategy(2.5);

const checkout = new CheckoutService(strategy);
const total = checkout.getTotal(order);
```

### Java con Enum Strategy

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

### Python con Estrategias como Funciones

```python
from typing import Callable, List
from dataclasses import dataclass

@dataclass
class Order:
    items: List[float]
    total_weight: float
    destination: str

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

strategies = {
    'domestic': flat_rate_strategy,
    'international': weight_based_strategy,
    'promo': free_over_threshold,
}

checkout = CheckoutService(strategies[order.destination])
total = checkout.get_total(order)
```

## Explicación

- **Encapsulación del algoritmo**: cada estrategia es un objeto o función autocontenido con su propio estado y comportamiento. El contexto (checkout service) conoce solo la interfaz de la estrategia, no los detalles de implementación. Esto desacopla el contexto de la evolución del algoritmo.
- **Selección en runtime**: las estrategias se seleccionan en runtime basado en configuración, input del usuario o reglas de negocio. Una factory o registro puede mapear claves a instancias de estrategia. El contexto no hardcodea qué estrategia usar — recibe la estrategia como dependencia.
- **Principio open-closed**: agregar un nuevo método de envío significa escribir una nueva clase que implementa `ShippingStrategy`. El checkout service, las estrategias existentes y los tests permanecen intactos. Esta es la esencia del principio open-closed: abierto para extensión, cerrado para modificación.
- **Strategy vs función simple**: en lenguajes con funciones de primera clase (Python, JavaScript, Go), una estrategia puede ser una función en lugar de una clase. Esto reduce boilerplate para algoritmos stateless. Usa clases cuando la estrategia necesita configuración, estado interno o múltiples métodos.

## Variantes

| Variante | Estado | Lenguaje | Mejor para |
|----------|--------|----------|------------|
| Estrategia clase | Sí (campos) | Java, C# | Algoritmos complejos con config |
| Lambda/función | No | Python, JS, Go | Algoritmos simples, stateless |
| Enum strategy | Mínimo | Java | Conjunto fijo de estrategias conocidas |
| Registry + strategy | Sí | Cualquiera | Algoritmos configurables por usuario |
| Template method | Heredado | Cualquiera | Estrategias con esqueleto compartido |

## Lo que funciona

- **Usa inyección de dependencias para selección de estrategia**: en lugar de que el contexto construya su propia estrategia, inyéctala vía constructor o setter. Esto hace el contexto testeable con mocks de estrategia y permite al llamador controlar la selección de algoritmo sin modificar el contexto.
- **Mantén las interfaces de estrategia enfocadas**: una interfaz de estrategia debería tener un método principal. Si te encuentras agregando `init()`, `validate()` y `cleanup()` a la interfaz, la estrategia está haciendo demasiado. Separa en interfaces distintas o usa un wrapper de lifecycle.
- **Documenta precondiciones y efectos secundarios de estrategias**: algunas estrategias mutan estado (ej. una estrategia de pago que cobra una tarjeta). Documenta si la estrategia es idempotente, qué excepciones lanza y qué estado espera. Los consumidores deben entender el contrato.
- **Considera la null strategy**: si el contexto siempre espera una estrategia pero a veces no se necesita comportamiento, implementa un null object strategy que no hace nada. Esto evita null checks y lógica condicional en el contexto.
- **Compón estrategias con decorators**: un decorator de caching envuelve una estrategia y memoiza resultados. Un decorator de validación chequea inputs antes de delegar. Esto mantiene las estrategias individuales simples mientras agrega concerns transversales externamente.

## Errores comunes

- **Sobre-ingeniería condicionales simples**: si tienes dos estrategias que son cada una una línea, un strategy pattern agrega más boilerplate que valor. Usa una simple función o condicional inline hasta que tengas tres o más algoritmos, o los algoritmos crezcan en complejidad.
- **Poner selección de estrategia dentro del contexto**: `if (region === 'US') strategy = new UsTaxStrategy()` dentro del contexto viola separación de concerns. El contexto debería recibir la estrategia. La lógica de selección pertenece a una factory, parser de configuración o controlador.
- **Estrategias accediendo a internals del contexto**: una estrategia no debería alcanzar hacia atrás al objeto contexto. Pasa todos los datos necesarios como parámetros al método de estrategia. El acoplamiento bidireccional hace tanto al contexto como a la estrategia más difíciles de testear y razonar.
- **Interfaces de estrategia inconsistentes**: si una estrategia retorna un número y otra retorna un string formateado, el contexto debe manejar ambos casos. Define la interfaz precisamente — tipos de retorno, contratos de excepción y formas de parámetros deben ser uniformes entre todas las estrategias.

## Preguntas frecuentes

**P: ¿Es el strategy pattern lo mismo que el command pattern?**
R: No. Strategy encapsula algoritmos intercambiables usados por un contexto. Command encapsula una petición como objeto, habilitando encolado, logging y undo. Consulta [Batch Processing](/recipes/data/batch-processing-patterns) para colas de commands. Una estrategia es sobre "cómo hacerlo"; un command es sobre "hazlo después." Puedes combinarlos — un objeto command que contiene una estrategia.

**P: ¿Cuándo debería usar una función en lugar de una clase para una estrategia?**
R: Usa una función cuando la estrategia es stateless y simple (ej. cálculo de impuesto). Usa una clase cuando la estrategia necesita configuración en tiempo de construcción, mantiene estado interno entre llamadas, o tiene múltiples métodos relacionados.

**P: ¿Cómo manejo estrategias que necesitan diferentes inputs?**
R: La interfaz de estrategia debería aceptar el tipo de input más amplio común. Si las estrategias necesitan diferentes subsets, pasa un objeto contexto conteniendo todos los datos posibles. Las estrategias extraen lo que necesitan. Evita múltiples métodos de estrategia sobrecargados.

**P: ¿Pueden las estrategias cambiarse dinámicamente en runtime?**
R: Sí — expón un setter en el contexto. Esto es útil para algoritmos adaptativos (ej. cambiar de A* a Dijkstra basado en tamaño del mapa). Asegura thread safety si el contexto es compartido entre threads.


### Strategy Registry con Selección Dinámica (TypeScript)

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

// Registro al arranque
const shippingRegistry = new StrategyRegistry<Order, number>();

shippingRegistry.register('flat-rate', (order) => 10);
shippingRegistry.register('weight-based', (order) => order.totalWeight * 2.5);
shippingRegistry.register('distance', (order) => 5 + order.distanceKm * 0.5);
shippingRegistry.register('free-shipping', (order) => {
  const subtotal = order.items.reduce((s, i) => s + i.price, 0);
  return subtotal > 100 ? 0 : 10;
});

// Uso — selecciona estrategia por clave desde metadatos de la orden
const calculate = shippingRegistry.select(order as Order & { strategyKey: string });
const shipping = calculate(order);
```

### Strategy con Decorator Composition (TypeScript)

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

// Composición — apila decorators para construir la estrategia final
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

### Selección de Estrategia Basada en Contexto (Python)

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

# Uso — registra estrategias, selecciona por clave de método
context = PaymentContext()
context.register('credit-card', CreditCardStrategy('4111111111111234', '123'))
context.register('paypal', PayPalStrategy('user@example.com'))
context.register('crypto', CryptoStrategy('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'))

result = context.pay('paypal', 99.99)
```

## Mejores Prácticas Adicionales

1. **Usa una strategy factory para lógica de selección compleja.** Cuando la selección depende de múltiples factores (región, tier de cliente, tamaño de orden), encapsula la lógica:

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

2. **Haz las estrategias inmutables.** Después de la construcción, una estrategia no debería cambiar su configuración. Esto las hace seguras para compartir entre threads y requests:

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

3. **Testea estrategias en aislamiento.** Cada estrategia es una unidad — testéala directamente sin el contexto:

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

## Errores Comunes Adicionales

1. **Interfaz de estrategia god.** Cuando la interfaz de estrategia crece a 5+ métodos, cada implementación se convierte en una god class. Separa en interfaces enfocadas:

```typescript
// Mal: una interfaz hace todo
interface PaymentStrategy {
  validate(): boolean;
  charge(amount: number): void;
  refund(transactionId: string): void;
  getStatus(): PaymentStatus;
  generateReceipt(): string;
}

// Bien: separa por responsabilidad
interface PaymentValidator { validate(): boolean; }
interface PaymentProcessor { charge(amount: number): void; refund(txId: string): void; }
interface PaymentReporter { generateReceipt(): string; }
```

2. **Estrategia acoplada a persistencia.** Una estrategia que lee de una base de datos o llama una API acopla la selección de algoritmo a infraestructura. Inyecta los datos como parámetros:

```typescript
// Mal: estrategia obtiene sus propios datos
class TaxStrategy implements ShippingStrategy {
  constructor(private db: Database) {}
  calculate(order: Order): number {
    const rate = this.db.query('SELECT rate FROM tax_rates WHERE region = ?', order.region);
    return order.subtotal * rate;
  }
}

// Bien: estrategia recibe datos como parámetro
class TaxStrategy implements ShippingStrategy {
  constructor(private rate: number) {}
  calculate(order: Order): number {
    return order.subtotal * this.rate;
  }
}
```

3. **No manejar errores de estrategia.** Cada estrategia puede fallar diferente. Envuelve las llamadas a estrategia con manejo de errores consistente:

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

## FAQ Adicional

### ¿Cómo manejo selección de estrategia basada en múltiples criterios?

Usa un rules engine o chain of responsibility para selección multi-factor. Para casos simples, una factory con lógica condicional funciona. Para casos complejos, codifica reglas de selección como datos y evalúalas:

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

### ¿Esta solución está lista para producción?

Sí. Los patrones de estrategia basados en clases, funciones y decorators compuestos son todos probados en producción. El patrón registry refleja cómo los DI containers resuelven estrategias por clave. La composición con decorators es estándar en sistemas de pricing y shipping. El enfoque basado en protocol de Python se usa en codebases modernos de Python con type checking.

### ¿Cuáles son las características de rendimiento?

El dispatch de método de estrategia es una llamada virtual — overhead despreciable (nanosegundos). El registry añade una búsqueda en hash map (O(1)). El apilamiento de decorators añade una llamada virtual por capa — típicamente 2-3 capas, todavía sub-microsegundo. Las strategy factories que consultan bases de datos para configuración añaden latencia de I/O en la primera llamada; cachea el resultado. Para hot paths, pre-selecciona la estrategia al arranque en lugar de por-request.

### ¿Cómo depuro problemas con este enfoque?

Loggea el nombre de la clase de estrategia y los parámetros clave antes de delegar. Para stacks de decorators, loggea en cada capa para trazar cómo se construye el resultado. Para selección basada en registry, loggea la clave solicitada y la estrategia resuelta. Usa `toString()` o `constructor.name` de la estrategia para identificar qué implementación se ejecutó. Testea estrategias en aislamiento con inputs in-memory antes de integrar con el contexto.
