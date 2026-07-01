---
contentType: patterns
slug: state-pattern
title: "Patrón State"
description: "Permite que un objeto altere su comportamiento cuando cambia su estado interno. Un patrón de comportamiento para máquinas de estados finitos."
metaDescription: "Aprende el Patrón State en Python, Java y JavaScript. Patrón de comportamiento para máquinas de estados finitos y comportamiento dependiente del estado."
difficulty: intermediate
topics:
  - design
tags:
  - state
  - patron
  - patron-de-diseno
  - comportamiento
  - maquina-de-estados
  - fsm
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/strategy-pattern
  - /patterns/design/command-pattern
  - /patterns/design/observer-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende el Patrón State en Python, Java y JavaScript. Patrón de comportamiento para máquinas de estados finitos y comportamiento dependiente del estado."
  keywords:
    - patron state
    - patron de diseno
    - patron de comportamiento
    - maquina de estados finitos
    - python state
    - java state machine
    - javascript state machine
---

# Patrón State

## Visión General

El [Patrón State](/patterns/design/state-pattern) es un patrón de diseño de comportamiento que permite que un objeto altere su comportamiento cuando cambia su estado interno. En lugar de grandes sentencias switch o condicionales dispersas por todo el código, cada estado se encapsula en su propia clase con comportamiento específico.

## Cuándo Usarlo

Usa el Patrón State cuando:
- El comportamiento de un objeto depende de su estado y debe cambiar en tiempo de ejecución
- Tienes sentencias condicionales grandes que cambian comportamiento según el estado
- Los estados tienen transiciones complejas con acciones de entrada/salida
- Quieres agregar nuevos estados sin modificar clases de estado existentes

## Solución

### Python

```python
from abc import ABC, abstractmethod

class OrderState(ABC):
    @abstractmethod
    def pay(self, order):
        pass

    @abstractmethod
    def ship(self, order):
        pass

    @abstractmethod
    def cancel(self, order):
        pass

class PendingState(OrderState):
    def pay(self, order):
        print("Procesando pago...")
        order.transition_to(PaidState())
    def ship(self, order):
        print("No se puede enviar: pago pendiente")
    def cancel(self, order):
        print("Pedido cancelado")
        order.transition_to(CancelledState())

class PaidState(OrderState):
    def pay(self, order):
        print("Ya pagado")
    def ship(self, order):
        print("Enviando pedido...")
        order.transition_to(ShippedState())
    def cancel(self, order):
        print("Emitiendo reembolso...")
        order.transition_to(CancelledState())

class ShippedState(OrderState):
    def pay(self, order):
        print("Ya pagado")
    def ship(self, order):
        print("Ya enviado")
    def cancel(self, order):
        print("No se puede cancelar: ya enviado")

class CancelledState(OrderState):
    def pay(self, order):
        print("No se puede pagar: pedido cancelado")
    def ship(self, order):
        print("No se puede enviar: pedido cancelado")
    def cancel(self, order):
        print("Ya cancelado")

class Order:
    def __init__(self):
        self._state = PendingState()

    def transition_to(self, state):
        self._state = state

    def pay(self):
        self._state.pay(self)

    def ship(self):
        self._state.ship(self)

    def cancel(self):
        self._state.cancel(self)

# Uso
order = Order()
order.pay()
order.ship()
order.cancel()  # No se puede cancelar: ya enviado
```

### JavaScript

```javascript
class Order {
  constructor() { this.state = new PendingState(this); }
  transitionTo(state) { this.state = state; }
  pay() { this.state.pay(); }
  ship() { this.state.ship(); }
  cancel() { this.state.cancel(); }
}

class PendingState {
  constructor(order) { this.order = order; }
  pay() {
    console.log("Procesando pago...");
    this.order.transitionTo(new PaidState(this.order));
  }
  ship() { console.log("No se puede enviar: pago pendiente"); }
  cancel() {
    console.log("Pedido cancelado");
    this.order.transitionTo(new CancelledState(this.order));
  }
}

class PaidState {
  constructor(order) { this.order = order; }
  pay() { console.log("Ya pagado"); }
  ship() {
    console.log("Enviando pedido...");
    this.order.transitionTo(new ShippedState(this.order));
  }
  cancel() {
    console.log("Emitiendo reembolso...");
    this.order.transitionTo(new CancelledState(this.order));
  }
}

class ShippedState {
  constructor(order) { this.order = order; }
  pay() { console.log("Ya pagado"); }
  ship() { console.log("Ya enviado"); }
  cancel() { console.log("No se puede cancelar: ya enviado"); }
}

class CancelledState {
  constructor(order) { this.order = order; }
  pay() { console.log("No se puede pagar: pedido cancelado"); }
  ship() { console.log("No se puede enviar: pedido cancelado"); }
  cancel() { console.log("Ya cancelado"); }
}

const order = new Order();
order.pay();
order.ship();
order.cancel(); // No se puede cancelar: ya enviado
```

### Java

```java
interface OrderState {
    void pay(Order order);
    void ship(Order order);
    void cancel(Order order);
}

class PendingState implements OrderState {
    public void pay(Order order) {
        System.out.println("Procesando pago...");
        order.transitionTo(new PaidState());
    }
    public void ship(Order order) {
        System.out.println("No se puede enviar: pago pendiente");
    }
    public void cancel(Order order) {
        System.out.println("Pedido cancelado");
        order.transitionTo(new CancelledState());
    }
}

class PaidState implements OrderState {
    public void pay(Order order) {
        System.out.println("Ya pagado");
    }
    public void ship(Order order) {
        System.out.println("Enviando pedido...");
        order.transitionTo(new ShippedState());
    }
    public void cancel(Order order) {
        System.out.println("Emitiendo reembolso...");
        order.transitionTo(new CancelledState());
    }
}

class ShippedState implements OrderState {
    public void pay(Order order) {
        System.out.println("Ya pagado");
    }
    public void ship(Order order) {
        System.out.println("Ya enviado");
    }
    public void cancel(Order order) {
        System.out.println("No se puede cancelar: ya enviado");
    }
}

class CancelledState implements OrderState {
    public void pay(Order order) {
        System.out.println("No se puede pagar: pedido cancelado");
    }
    public void ship(Order order) {
        System.out.println("No se puede enviar: pedido cancelado");
    }
    public void cancel(Order order) {
        System.out.println("Ya cancelado");
    }
}

class Order {
    private OrderState state = new PendingState();

    public void transitionTo(OrderState state) {
        this.state = state;
    }

    public void pay() { state.pay(this); }
    public void ship() { state.ship(this); }
    public void cancel() { state.cancel(this); }
}

// Uso
Order order = new Order();
order.pay();
order.ship();
order.cancel(); // No se puede cancelar: ya enviado
```

## Explicación

El Patrón State involucra dos roles:

- **Contexto** (`Order`): Mantiene una referencia al estado actual y delega comportamiento a él
- **Interfaz de Estado** (`OrderState`): Define el contrato para comportamiento específico de estado
- **Estados Concretos** (`PendingState`, `PaidState`, etc.): Implementan comportamiento específico para cada estado y manejan transiciones

## Variantes

| Variante | Descripción | Caso de Uso |
|----------|-------------|-------------|
| **Máquina de Estados Simple** | Los estados manejan transiciones | Pequeño número de estados |
| **Máquina de Estados Jerárquica** | Los estados pueden tener subestados | Comportamiento anidado complejo |
| **Tabla de Estados** | Las transiciones se almacenan en tabla de búsqueda | Muchos estados con transiciones predecibles |
| **Autómata de Pila** | Historial de estado basado en pila | Transiciones de estado deshacer/reversibles. Consulta [Memento](/patterns/design/memento-pattern) |

## Lo que funciona

- **Delega todo el comportamiento dependiente del estado** a objetos de estado, manteniendo el contexto delgado
- **Haz los objetos de estado inmutables** o recréalos en transición para evitar bugs de estado compartido
- **Usa enums para estados bien definidos** en lenguajes que los soportan (Java, TypeScript)
- **Agrega hooks de entrada/salida** cuando las transiciones necesiten efectos secundarios (logging, analytics)
- **Considera una tabla de transiciones** cuando tengas muchos estados y las transiciones se vuelvan difíciles de gestionar

## Errores Comunes

- Duplicar lógica de transición entre múltiples clases de estado en lugar de centralizarla
- Permitir que el contexto modifique el estado directamente en lugar de delegar al estado actual
- Olvidar manejar transiciones inválidas con gracia, llevando a errores en tiempo de ejecución
- Crear transiciones circulares de estado que puedan causar bucles infinitos
- Mezclar lógica de estado con lógica de negocio, haciendo el patrón difícil de probar

## Preguntas Frecuentes

**P: ¿Cuál es la diferencia entre State y Strategy?**
R: Ambos encapsulan comportamiento en objetos intercambiables. State es sobre cambiar comportamiento basado en transiciones de estado internas. [Strategy](/patterns/design/strategy-pattern) es sobre seleccionar un algoritmo desde afuera. La intención difiere: State gestiona ciclo de vida, Strategy proporciona opciones.

**P: ¿Los estados deben conocerse entre sí?**
R: En la implementación clásica, los estados disparan transiciones a otros estados. Una alternativa es dejar que el contexto o una tabla de transiciones gestione las transiciones, manteniendo los estados desacoplados.

**P: ¿Puedo usar enums en lugar de clases para máquinas de estado simples?**
R: Sí. Para casos simples, un enum con un switch es suficiente. Usa el Patrón State completo cuando los estados tengan comportamiento complejo o esperes agregados frecuentes.
