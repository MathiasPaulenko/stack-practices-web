---
contentType: recipes
slug: strategy-pattern
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
relatedResources:
  - /recipes/factory-pattern
  - /recipes/adapter-pattern
  - /recipes/hexagonal-architecture
  - /recipes/singleton-pattern
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

El strategy pattern separa los algoritmos del contexto que los usa. Cada algoritmo de envío se convierte en su propia clase implementando una interfaz `ShippingStrategy` compartida. El checkout mantiene una referencia a una estrategia y delega el cálculo a ella. En runtime, intercambias estrategias — flat rate para doméstico, weight-based para internacional — sin cambiar el código del checkout. Nuevas estrategias se agregan escribiendo nuevas clases, no editando existentes. Esta receta cubre estrategias basadas en clases, en funciones y selección por inyección de dependencias.

## Cuándo usarlo

Usa esta receta cuando:

- Múltiples algoritmos o comportamientos existen para la misma tarea y solo uno se usa a la vez. Consulta [Factory Pattern](/recipes/design/factory-pattern) para crear algoritmos.
- El algoritmo debe seleccionarse en runtime basado en configuración o input del usuario. Consulta [Input Validation](/recipes/api/input-validation) para configuración segura.
- Quieres aislar la complejidad del algoritmo de la lógica de negocio principal
- Agregar nuevas variantes no debería requerir modificar código existente. Consulta [Adapter Pattern](/recipes/design/adapter-pattern) para extender interfaces.
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

## Mejores prácticas

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

