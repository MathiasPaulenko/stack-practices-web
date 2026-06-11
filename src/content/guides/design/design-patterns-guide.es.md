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
  - design-patterns
  - creational
  - structural
  - behavioral
  - singleton
  - factory
  - observer
  - strategy
relatedResources:
  - /es/patterns/design/singleton-pattern
  - /es/patterns/design/observer-pattern
  - /es/patterns/design/strategy-pattern
  - /es/patterns/design/repository-pattern
lastUpdated: "2026-06-11"
author: "StackPractices"
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
| "Necesito abstraer el acceso a base de datos" | Repository |
| "Necesito rastrear y deshacer cambios" | Command + Memento |

## Buenas Prácticas

- **No fuerces patterns**: No todo problema necesita un pattern
- **Empieza simple**: Refactoriza hacia un pattern cuando aparezca duplicación
- **El nombre importa**: Usa nombres de pattern en clases (`UserRepository`, `EmailStrategy`)
- **Documenta la intención**: Explica *por qué* elegiste un pattern, no solo *qué* hace

## Errores Comunes

- Over-engineering: aplicar patterns a problemas triviales
- Explosión de patterns: usar demasiados patterns en un módulo
- Ignorar los idiomas del lenguaje: no todos los patterns encajan en todos los lenguajes

## Preguntas Frecuentes

### Cuándo debería usar un design pattern?

Usa un design pattern cuando encuentres un problema que resuelve, no antes. Empieza con código simple y refactoriza hacia un pattern cuando veas duplicación, complejidad o acoplamiento que un pattern resolvería.

### Son relevantes los design patterns en lenguajes modernos?

Sí, pero los lenguajes modernos a menudo absorben patterns en sus librerías estándar. Por ejemplo, Promise de JavaScript es el pattern Observer, y los decorators de Python implementan el pattern Decorator nativamente.

### Cuántos patterns debería usar en un módulo?

Usa tantos como necesites, pero no más. Cada pattern agrega carga cognitiva. Si un módulo usa más de 2-3 patterns, considera si está haciendo demasiado y debería dividirse.
