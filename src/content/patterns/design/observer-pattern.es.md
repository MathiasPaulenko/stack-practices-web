---
contentType: patterns
slug: observer-pattern
title: "Patrón Observer"
description: "Define un mecanismo de suscripción para notificar a múltiples objetos sobre eventos. Patrón de diseño conductual para comunicación basada en eventos."
metaDescription: "Aprende el Patrón Observer con ejemplos prácticos en Python, Java y JavaScript. Patrón conductual para sistemas basados en eventos."
difficulty: beginner
topics:
  - design
tags:
  - observer
  - pattern
  - design-pattern
  - behavioral
  - event-driven
  - python
  - javascript
  - java
relatedResources:
  - /recipes/api/call-rest-api
  - /patterns/design/singleton-pattern
  - /patterns/design/strategy-pattern
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende el Patrón Observer con ejemplos prácticos en Python, Java y JavaScript. Patrón conductual para sistemas basados en eventos."
  keywords:
    - observer pattern
    - patrón de diseño
    - patrón conductual
    - event driven
    - pub sub
    - python observer
    - java observer
    - javascript observer
---

# Patrón Observer

## Visión general

El Patrón Observer es un patrón de diseño conductual que define un mecanismo de suscripción para notificar a múltiples objetos sobre eventos que ocurren en el objeto que están observando. Establece una dependencia uno-a-muchos entre objetos.

Es la base de arquitecturas basadas en eventos, programación reactiva y la arquitectura Model-View en frameworks de UI.

## Cuándo usarlo

Usa el Patrón Observer cuando:
- Los cambios en un objeto requieren actualizar un número desconocido de objetos dependientes. Consulta [Mediator Pattern](/patterns/design/mediator-pattern) para enrutamiento centralizado.
- Necesitas un modelo de comunicación publicar-suscribir. Consulta [CQRS Pattern](/recipes/cqrs-pattern-recipe) para arquitecturas event-driven.
- Un objeto debe notificar a otros sin saber quiénes son
- Quieres acoplamiento débil entre productores y consumidores de eventos
- Construyes componentes de UI reactivos o feeds de datos en tiempo real. Consulta [API REST](/recipes/api/call-rest-api) para fetching de datos en tiempo real.

## Solución

### Python

```python
class Subject:
    def __init__(self):
        self._observers = []

    def attach(self, observer):
        self._observers.append(observer)

    def notify(self, data):
        for observer in self._observers:
            observer.update(data)

class Observer:
    def update(self, data):
        print(f"Recibido: {data}")

# Uso
subject = Subject()
subject.attach(Observer())
subject.attach(Observer())
subject.notify("¡Hola observadores!")
```

### JavaScript

```javascript
class Subject {
  constructor() {
    this.observers = [];
  }

  subscribe(fn) {
    this.observers.push(fn);
  }

  notify(data) {
    this.observers.forEach((fn) => fn(data));
  }
}

// Uso
const subject = new Subject();
subject.subscribe((data) => console.log("A:", data));
subject.subscribe((data) => console.log("B:", data));
subject.notify("¡Hola observadores!");
```

### Java

```java
import java.util.ArrayList;
import java.util.List;

interface Observer {
    void update(String data);
}

class Subject {
    private final List<Observer> observers = new ArrayList<>();

    void attach(Observer o) {
        observers.add(o);
    }

    void notifyObservers(String data) {
        for (Observer o : observers) {
            o.update(data);
        }
    }
}

// Uso
Subject subject = new Subject();
subject.attach(data -> System.out.println("Recibido: " + data));
subject.notifyObservers("¡Hola observadores!");
```

## Explicación

El Patrón Observer consiste en dos roles principales:

- **Subject (Publicador)**: Mantiene una lista de observadores y envía notificaciones
- **Observer (Suscriptor)**: Define una interfaz para objetos que deben ser notificados de cambios

Cuando el estado del Subject cambia, itera sobre sus observadores y llama su método `update`. Los observadores pueden suscribirse o darse de baja dinámicamente sin que el Subject conozca las clases concretas.

## Variantes

| Variante | Caso de uso | Compromiso |
|----------|-------------|------------|
| **Modelo push** | El subject envía datos completos a observadores | Simple, pero puede enviar datos innecesarios |
| **Modelo pull** | El subject notifica; los observadores consultan detalles | Más eficiente, pero añade idas y vueltas |
| **Event bus** | Un despachador central desacopla subjects y observers | Más flexible, añade indirección |

## Mejores prácticas

- **Desuscríbete de observadores** cuando se destruyen para prevenir fugas de memoria
- **Evita actualizaciones circulares** donde observadores disparan cambios de vuelta al subject
- **Usa referencias débiles** en lenguajes que lo soportan (ej. Java) para limpieza automática
- **Mantén la lógica de notificación simple** y evita cómputos pesados en el loop de notify
- **Documenta los payloads de eventos** para que los observadores sepan qué datos esperar

## Errores comunes

- **Fugas de memoria**: Olvidar desvincular observadores cuando ya no se necesitan
- **Orden de actualización inesperado**: Los observadores pueden ejecutarse en orden indefinido; no dependas de ello
- **Bucles infinitos**: Un observador que modifica el subject puede desencadenar actualizaciones en cascada
- **Acoplamiento fuerte**: Dar a los observadores acceso al subject completo en lugar de solo los datos que necesitan
- **Bloqueo síncrono**: Ejecutar observadores lentos en el hilo principal de notificación

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre Observer y Pub/Sub?**
R: Observer es una relación directa subject-observer. Pub/Sub añade un broker de eventos ([Mediator](/patterns/design/mediator-pattern)) que desacopla completamente a los publicadores de los suscriptores.

**P: ¿Sigue siendo relevante el Patrón Observer con frameworks reactivos modernos?**
R: Sí. React hooks, RxJS y el sistema de reactividad de Vue están construidos sobre conceptos de Observer. Para brokers de eventos singleton, consulta [Singleton](/patterns/design/singleton-pattern).

**P: ¿Cómo evito fugas de memoria con observadores?**
R: Siempre proporciona un mecanismo de desuscripción y llámalo en manejadores de limpieza o destructores.
