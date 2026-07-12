---



contentType: guides
slug: design-patterns-guide
title: "Guía Práctica de Design Patterns"
description: "Guía para seleccionar y aplicar el design pattern correcto para problemas comunes de ingeniería de software."
metaDescription: "Aprende cuándo y cómo usar design patterns: Singleton, Factory, Observer, Strategy, Repository y más. Ejemplos prácticos con criterios de selección."
difficulty: intermediate
topics:
  - design
  - architecture
tags:
  - architecture
  - behavioral
  - creational
  - design-patterns
  - factory
  - observer
  - singleton
  - strategy
  - structural
relatedResources:
  - /recipes/singleton-pattern-recipe
  - /recipes/observer-pattern-recipe
  - /recipes/strategy-pattern-recipe
  - /patterns/repository-pattern
  - /guides/domain-driven-design-guide
  - /guides/code-review-best-practices-guide
  - /guides/solid-principles-guide
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende cuándo y cómo usar design patterns: Singleton, Factory, Observer, Strategy, Repository y más. Ejemplos prácticos con criterios de selección."
  keywords:
    - design patterns
    - software patterns
    - creational patterns
    - structural patterns
    - behavioral patterns



---

## Resumen

Los design patterns son soluciones reutilizables a problemas comunes de diseño de software. Saber *cuándo* aplicar un pattern es tan importante como saber *cómo* hacerlo. Esta guía te ayuda a elegir el pattern correcto para cada situación.

## Patrones Creacionales

Los patrones creacionales manejan mecanismos de creación de objetos.

### Factory Method

Usar cuando: Necesitas crear objetos sin especificar la clase exacta.

```python
from abc import ABC, abstractmethod

class Notification(ABC):
    @abstractmethod
    def send(self, message: str): pass

class EmailNotification(Notification):
    def send(self, message: str):
        print(f"Email: {message}")

class NotificationFactory:
    @staticmethod
    def create(type: str):
        if type == "email": return EmailNotification()
        raise ValueError(f"Tipo desconocido: {type}")

# Uso
notifier = NotificationFactory.create("email")
notifier.send("Hola!")
```

**Cuándo usar**: Múltiples implementaciones de una interfaz, elegidas en runtime.

### Builder

Usar cuando: Necesitas construir objetos complejos paso a paso.

```typescript
class QueryBuilder {
  private parts: string[] = [];

  select(columns: string[]): this {
    this.parts.push(`SELECT ${columns.join(', ')}`);
    return this;
  }

  from(table: string): this {
    this.parts.push(`FROM ${table}`);
    return this;
  }

  build(): string {
    return this.parts.join(' ') + ';';
  }
}

// Uso
const query = new QueryBuilder()
  .select(['id', 'name', 'email'])
  .from('users')
  .build();
```

**Cuándo usar**: Objetos con muchos parámetros opcionales, o lógica de construcción compleja.

## Patrones Estructurales

Los patrones estructurales manejan la composición de objetos.

### Adapter

Usar cuando: Necesitas hacer que interfaces incompatibles funcionen juntas.

```python
class OldPrinter:
    def old_print(self, text):
        print(f"OLD: {text}")

class PrinterAdapter:
    def __init__(self, old_printer):
        self._printer = old_printer

    def print(self, text):
        self._printer.old_print(text)

# Uso
adapter = PrinterAdapter(OldPrinter())
adapter.print("Hola")  # Funciona con nueva interfaz
```

**Cuándo usar**: Integrando código legacy, librerías de terceros, o APIs con interfaces diferentes.

### Decorator

Usar cuando: Necesitas agregar responsabilidades a objetos dinámicamente.

```python
from functools import wraps

def timing(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        import time
        start = time.time()
        result = func(*args, **kwargs)
        print(f"{func.__name__} tomó {time.time() - start:.2f}s")
        return result
    return wrapper

@timing
def fetch_data():
    # ... operación lenta
    return data
```

**Cuándo usar**: Extender funcionalidad sin herencia (logging, caching, validación, retries).

## Patrones de Comportamiento

Los patrones de comportamiento se enfocan en la comunicación entre objetos.

### Observer

Usar cuando: Necesitas un mecanismo publish-subscribe.

```typescript
class EventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(callback);
  }

  emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}

// Uso
const emitter = new EventEmitter();
emitter.on('user:login', (user) => console.log(`${user.name} inició sesión`));
emitter.emit('user:login', { name: 'Alice' });
```

**Cuándo usar**: Arquitecturas event-driven, actualizaciones en tiempo real, sistemas desacoplados.

### Strategy

Usar cuando: Necesitas algoritmos intercambiables.

```python
from abc import ABC, abstractmethod

class PaymentStrategy(ABC):
    @abstractmethod
    def pay(self, amount: float): pass

class CreditCardPayment(PaymentStrategy):
    def pay(self, amount: float):
        print(f"Pagado ${amount} con tarjeta de crédito")

class PayPalPayment(PaymentStrategy):
    def pay(self, amount: float):
        print(f"Pagado ${amount} con PayPal")

class ShoppingCart:
    def __init__(self, strategy: PaymentStrategy):
        self.strategy = strategy

    def checkout(self, amount: float):
        self.strategy.pay(amount)

# Uso
cart = ShoppingCart(PayPalPayment())
cart.checkout(99.99)
```

**Cuándo usar**: Diferentes algoritmos para la misma tarea (sorting, payment, reglas de validación).

## Cheat Sheet de Selección de Patterns

| Problema | Pattern |
|----------|---------|
| "Necesito exactamente una instancia" | Singleton |
| "Creo objetos basados en un string/tipo" | Factory Method |
| "Este objeto tiene 10 parámetros opcionales" | Builder |
| "El código legacy no coincide con mi interfaz" | Adapter |
| "Necesito agregar logging a todo" | Decorator |
| "Los componentes necesitan reaccionar a eventos" | Observer |
| "Quiero intercambiar algoritmos en runtime" | Strategy |
| "Necesito abstraer el acceso a base de datos" | Repository | Consulta [diseño de bases de datos](/guides/databases/database-design-guide).
| "Necesito rastrear y deshacer cambios" | Command + Memento |

## Lo que funciona

- **No fuerces patterns**: No todo problema necesita un pattern
- **Empieza simple**: Refactoriza hacia un pattern cuando aparezca duplicación. Consulta [código limpio](/guides/design/clean-code-principles-guide).
- **El nombre importa**: Usa nombres de pattern en clases (`UserRepository`, `EmailStrategy`)
- **Documenta la intención**: Explica *por qué* elegiste un pattern, no solo *qué* hace

## Errores Comunes

- Over-engineering: aplicar patterns a problemas triviales
- Explosión de patterns: usar demasiados patterns en un módulo
- Ignorar los idiomas del lenguaje: no todos los patterns encajan en todos los lenguajes

## Preguntas Frecuentes

### Cuándo debería usar un design pattern?

Usa un design pattern cuando encuentres un problema que resuelve, no antes. Combina con [principios SOLID](/guides/design/solid-principles-guide). Empieza con código simple y refactoriza hacia un pattern cuando veas duplicación, complejidad o acoplamiento que un pattern resolvería.

### Son relevantes los design patterns en lenguajes modernos?

Sí, pero los lenguajes modernos a menudo absorben patterns en sus librerías estándar. Por ejemplo, Promise de JavaScript es el pattern Observer, y los decorators de Python implementan el pattern Decorator nativamente.

### Cuántos patterns debería usar en un módulo?

Usa tantos como necesites, pero no más. Cada pattern agrega carga cognitiva. Si un módulo usa más de 2-3 patterns, considera si está haciendo demasiado y debería dividirse.


## Temas Avanzados

### Escenario: Patrones en un Sistema de Pedidos

```text
Sistema: Procesamiento de pedidos e-commerce
Patrones aplicados: Strategy, Factory, Observer, Decorator, Command

1. Strategy - Calculo de envio:
  interface ShippingStrategy {
    calculate(weight: number): number;
  }
  class StandardShipping implements ShippingStrategy {
    calculate(weight: number) { return weight * 0.5; }
  }
  class ExpressShipping implements ShippingStrategy {
    calculate(weight: number) { return weight * 1.5; }
  }
  class SameDayShipping implements ShippingStrategy {
    calculate(weight: number) { return weight * 3.0; }
  }

  // Uso: seleccionar estrategia en runtime
  const shipping = strategies[order.shippingMethod];
  const cost = shipping.calculate(order.totalWeight);

2. Factory - Creacion de notificaciones:
  class NotificationFactory {
    create(type: string): Notification {
      switch (type) {
        case "email": return new EmailNotification();
        case "sms": return new SMSNotification();
        case "push": return new PushNotification();
        default: throw new Error("Tipo no soportado");
      }
    }
  }

3. Observer - Eventos de pedido:
  class OrderEventBus {
    private handlers: Map<string, Function[]> = new Map();
    on(event: string, handler: Function) {
      if (!this.handlers.has(event)) this.handlers.set(event, []);
      this.handlers.get(event).push(handler);
    }
    emit(event: string, data: any) {
      this.handlers.get(event)?.forEach(h => h(data));
    }
  }
  // Suscriptores: inventario, email, analytics
  bus.on("order.created", updateInventory);
  bus.on("order.created", sendConfirmation);
  bus.on("order.created", trackAnalytics);

4. Decorator - Logging y cache:
  function withLogging(fn: Function) {
    return async (...args: any[]) => {
      console.log("Calling:", fn.name, args);
      const result = await fn(...args);
      console.log("Result:", result);
      return result;
    };
  }
  function withCache(fn: Function, ttl: number) {
    const cache = new Map();
    return async (...args: any[]) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) return cache.get(key);
      const result = await fn(...args);
      cache.set(key, result);
      setTimeout(() => cache.delete(key), ttl);
      return result;
    };
  }

  // Composicion: logging + cache
  const cachedLoggedFetch = withCache(withLogging(fetchProduct), 60000);

5. Command - Operaciones de pedido:
  interface Command { execute(): Promise<void>; }
  class CancelOrderCommand implements Command {
    constructor(private order: Order, private inventory: Inventory) {}
    async execute() {
      await this.inventory.release(this.order.items);
      await this.order.update({ status: "cancelled" });
    }
  }
  // Permite undo, queue, y logging de operaciones

Anti-patrones a evitar:
  - Singleton para todo (acoplamiento global)
  - Factory cuando un constructor basta
  - Observer sin unsubscribe (memory leaks)
  - Decorator stacking excesivo (> 3 niveles)
  - Command sin undo (pierde la mitad del valor)

Lecciones:
  - Aplica patrones cuando el problema lo requiere, no antes
  - Los lenguajes modernos absorben patrones en su stdlib
  - Composicion > herencia en la mayoria de casos
  - Cada patron agrega complejidad: midela contra el valor
  - Refactoriza hacia patrones, no los disenes desde el inicio
```

### Como se relacionan los patrones con SOLID?

Strategy implementa Open/Closed (nuevas estrategias sin cambiar codigo existente). Factory implementa Single Responsibility (creacion separada de uso). Observer implementa Dependency Inversion (depende de abstraccion, no concrecion). Decorator implementa Open/Closed (extiende sin modificar). Command implementa Single Responsibility (cada comando una responsabilidad).
