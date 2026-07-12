---




contentType: patterns
slug: event-bus-pattern
title: "Patrón Event Bus"
description: "Desacopla componentes rutando eventos a través de un bus central. Un patrón behavioral para comunicación entre módulos con acoplamiento mínimo."
metaDescription: "Aprende el Patrón Event Bus para comunicación de componentes desacoplados. Ejemplos en Python, Java y JavaScript con variantes sync y async."
difficulty: intermediate
topics:
  - design
tags:
  - event-bus
  - pattern
  - design-pattern
  - behavioral
  - decoupling
  - messaging
  - pub-sub
relatedResources:
  - /patterns/observer-pattern
  - /patterns/mediator-pattern
  - /patterns/outbox-pattern
  - /patterns/domain-event-pattern
  - /guides/cqrs-guide
  - /guides/event-sourcing-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Event Bus para comunicación de componentes desacoplados. Ejemplos en Python, Java y JavaScript con variantes sync y async."
  keywords:
    - event bus
    - design pattern
    - behavioral pattern
    - pub-sub
    - decoupling
    - messaging




---

# Patrón Event Bus

## Descripción General

El Patrón Event Bus habilita la comunicación entre componentes sin dependencias directas. En lugar de llamarse entre sí directamente, los componentes publican eventos a un bus central y se suscriben a eventos que les interesan. El bus rutea eventos a todos los suscriptores interesados, desacoplando publishers de consumers.

Esta es la base de la arquitectura dirigida por eventos. Un módulo de registro de usuarios publica `UserRegistered`; módulos de email, analytics y CRM se suscriben independientemente. El módulo de registro nunca sabe que estos consumers existen.

## Cuándo Usar

Usa el Patrón Event Bus cuando:
- Múltiples componentes necesitan reaccionar al mismo evento independientemente
- Quieres agregar nuevas reacciones sin modificar el publisher
- Concerns transversales (logging, métricas, auditoría) deben observar operaciones
- Los componentes no deben tener dependencias en tiempo de compilación o ejecución
- Necesitas procesamiento async sin bloquear el flujo principal

## Cuándo Evitar

- Comunicación simple uno-a-uno (una llamada directa a método es más clara)
- Necesitas entrega garantizada y ordenamiento (usa una message queue en su lugar)
- Debugging requiere trazar cadenas exactas de llamadas (los event buses oscurecen el flujo)
- Los eventos se convierten en un flujo de control oculto difícil de razonar

## Solución

### Python

```python
from typing import Callable, List, Dict, Any
from dataclasses import dataclass
import threading

@dataclass
class Event:
    type: str
    payload: Dict[str, Any]


class EventBus:
    def __init__(self):
        self._subscribers: Dict[str, List[Callable]] = {}
        self._lock = threading.Lock()

    def subscribe(self, event_type: str, handler: Callable):
        with self._lock:
            self._subscribers.setdefault(event_type, []).append(handler)

    def publish(self, event: Event):
        handlers = []
        with self._lock:
            handlers = list(self._subscribers.get(event.type, []))
        for handler in handlers:
            handler(event)

    def unsubscribe(self, event_type: str, handler: Callable):
        with self._lock:
            if handler in self._subscribers.get(event_type, []):
                self._subscribers[event_type].remove(handler)


# Uso
bus = EventBus()

def on_user_registered(event: Event):
    print(f"Enviar email de bienvenida a {event.payload['email']}")

def on_user_registered_analytics(event: Event):
    print(f"Trackear signup: {event.payload['user_id']}")

bus.subscribe("UserRegistered", on_user_registered)
bus.subscribe("UserRegistered", on_user_registered_analytics)

bus.publish(Event("UserRegistered", {"user_id": 42, "email": "alice@example.com"}))
```

### Java

```java
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Consumer;

class Event {
    private final String type;
    private final Map<String, Object> payload;

    public Event(String type, Map<String, Object> payload) {
        this.type = type;
        this.payload = payload;
    }
    public String getType() { return type; }
    public Map<String, Object> getPayload() { return payload; }
}

class EventBus {
    private final Map<String, List<Consumer<Event>>> subscribers = new ConcurrentHashMap<>();

    public void subscribe(String eventType, Consumer<Event> handler) {
        subscribers.computeIfAbsent(eventType, k -> new CopyOnWriteArrayList<>()).add(handler);
    }

    public void publish(Event event) {
        List<Consumer<Event>> handlers = subscribers.getOrDefault(event.getType(), List.of());
        for (Consumer<Event> handler : handlers) {
            handler.accept(event);
        }
    }

    public void unsubscribe(String eventType, Consumer<Event> handler) {
        subscribers.getOrDefault(eventType, List.of()).remove(handler);
    }
}

// Uso
EventBus bus = new EventBus();

bus.subscribe("UserRegistered", event -> {
    System.out.println("Enviar email de bienvenida a " + event.getPayload().get("email"));
});

bus.subscribe("UserRegistered", event -> {
    System.out.println("Trackear signup: " + event.getPayload().get("user_id"));
});

bus.publish(new Event("UserRegistered", Map.of("user_id", 42, "email", "alice@example.com")));
```

### JavaScript

```javascript
class EventBus {
  constructor() {
    this.subscribers = new Map();
  }

  subscribe(eventType, handler) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType).push(handler);

    // Retorna función de unsubscribe
    return () => this.unsubscribe(eventType, handler);
  }

  publish(eventType, payload) {
    const handlers = this.subscribers.get(eventType) || [];
    handlers.forEach(handler => {
      try {
        handler(payload);
      } catch (err) {
        console.error(`Handler falló para ${eventType}:`, err);
      }
    });
  }

  unsubscribe(eventType, handler) {
    const handlers = this.subscribers.get(eventType) || [];
    const idx = handlers.indexOf(handler);
    if (idx !== -1) handlers.splice(idx, 1);
  }
}

// Uso
const bus = new EventBus();

const unsubEmail = bus.subscribe('UserRegistered', (payload) => {
  console.log(`Enviar email de bienvenida a ${payload.email}`);
});

bus.subscribe('UserRegistered', (payload) => {
  console.log(`Trackear signup: ${payload.user_id}`);
});

bus.publish('UserRegistered', { user_id: 42, email: 'alice@example.com' });

// Luego: unsubEmail(); // Remueve handler específico
```

## Explicación

El Patrón Event Bus consiste en:

- **Event**: Un mensaje ligero que lleva un tipo y payload
- **Publisher**: Código que llama `publish()` sin conocer suscriptores
- **Subscriber**: Código que registra un callback vía `subscribe()`
- **Bus**: Rutea eventos de publishers a todos los suscriptores coincidentes

## Variantes

| Variante | Entrega | Caso de Uso |
|----------|---------|-------------|
| **Síncrono** | Inmediata, bloqueante | Eventos de UI in-process |
| **Asíncrono** | Encolada, no bloqueante | Backends de alto throughput |
| **Priorizada** | Ordenada por prioridad | Frameworks de UI (DOM events burbujean) |
| **Filtrada** | Suscriptores definen predicados | Sistemas grandes con muchos tipos de eventos |

## Lo que funciona

- **Mantén los payloads de eventos inmutables.** Los suscriptores no deberían modificar objetos de payload compartidos.
- **Usa nombres de eventos tipados.** Prefiere `"OrderPlaced"` sobre `"order_event"`. Usa constantes o enums.
- **Aísla fallos de suscriptores.** Un handler fallido no debería prevenir que otros corran. Captura y loggea excepciones por handler.
- **Desuscribe al limpiar.** Memory leaks ocurren cuando componentes destruidos aún mantienen suscripciones.
- **Documenta el schema del evento.** La estructura del payload es un contrato implícito. Documenta campos requeridos y opcionales.

## Errores Comunes

- **Encadenar eventos** donde A dispara B, que dispara C, que dispara A de nuevo. Usa event sourcing o sagas para flujos de trabajo complejos.
- **Sobreusar el bus** para comunicación simple padre-hijo hace que el código sea más difícil de seguir que un callback directo.
- **Olvidar desuscribirse** causa memory leaks y updates stale de componentes de UI destruidos.
- **Handlers síncronos haciendo I/O** bloquea al publisher. Descarga trabajo lento a threads de background o queues.
- **Payloads sin tipado** fuerzan a los suscriptores a castear y adivinar nombres de campos. Usa validación de schema o strong typing.

## Ejemplos del Mundo Real

### Android LocalBroadcastManager

El event bus de Android permite que fragments y servicios se comuniquen sin referencias directas. Reemplazado por `LiveData` pero el patrón permanece.

### Vue.js Event Bus

`$emit` / `$on` de Vue provee event buses a nivel de componente. El state management global (Pinia) es preferido para comunicación cross-app.

### Guava EventBus

La librería de Google para Java provee suscripción basada en anotaciones (`@Subscribe`) con opciones de entrega síncrona y async.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Event Bus y Observer?**
A: [Observer](/patterns/design/observer-pattern) es uno-a-muchos entre un subject y sus observadores. Event Bus es muchos-a-muchos a través de un mediador central que ni publisher ni subscriber poseen.

**Q: Debería construir mi propio event bus o usar una librería?**
A: Para necesidades simples in-process, una implementación de 50 líneas es suficiente. Para durabilidad, clustering o replay, usa RabbitMQ, Kafka o Redis Pub/Sub.

**Q: Cómo testeo código dirigido por eventos?**
A: Inyecta el bus como dependencia. En tests, usa un test double síncrono y aserta que los eventos correctos se publican con los payloads esperados.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.


## Temas Avanzados

### Escenario: Event Bus para Arquitectura Event-Driven

```typescript
// Event Bus: pub/sub con tipado y middleware
type EventHandler<T = unknown> = (event: T) => void | Promise<void>;

class TypedEventBus {
  private handlers = new Map<string, EventHandler[]>()
  private middleware: ((event: string, data: unknown, next: () => void) => void)[] = [];

  on<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler as EventHandler);
    return () => {
      const list = this.handlers.get(event);
      if (list) this.handlers.set(event, list.filter(h => h !== handler));
    };
  }

  use(mw: (event: string, data: unknown, next: () => void) => void): void {
    this.middleware.push(mw);
  }

  async emit<T>(event: string, data: T): Promise<void> {
    // Ejecutar middleware chain
    let idx = 0;
    const runMiddleware = () => {
      if (idx < this.middleware.length) {
        const mw = this.middleware[idx++];
        mw(event, data, runMiddleware);
      } else {
        this.dispatch(event, data);
      }
    };
    runMiddleware();
  }

  private async dispatch(event: string, data: unknown): Promise<void> {
    const list = this.handlers.get(event) || [];
    for (const handler of list) {
      try { await handler(data); }
      catch (err) { console.error(`[BUS] Handler error for ${event}:`, err); }
    }
  }
}

// Uso: middleware para logging y validacion
const bus = new TypedEventBus();
bus.use((event, data, next) => { console.log(`[LOG] ${event}`); next(); });
bus.use((event, data, next) => {
  if (!data) { console.error("[VALIDATE] Empty data"); return; }
  next();
});

bus.on("user.created", async (user: User) => {
  await emailService.welcome(user.email);
});
bus.on("user.created", async (user: User) => {
  await analytics.track("signup", { userId: user.id });
});

await bus.emit("user.created", { id: "123", email: "alice@test.com" });
// [LOG] user.created
// -> welcome email sent
// -> analytics tracked
```

Lecciones:
  - Event Bus: pub/sub con middleware chain (como Express)
  - Middleware: logging, validacion, auth antes de dispatch
  - Handlers async: el bus espera cada handler secuencialmente
  - on() retorna unsubscribe: limpieza automatica
  - En sistemas distribuidos: usar Kafka/RabbitMQ en lugar de bus en memoria
  - El bus en memoria es para un solo proceso: no persiste ni distribuye
```

### Event Bus vs Message Queue: cual uso?

Usa Event Bus en memoria para desacoplar modulos dentro de un proceso: notificaciones, logging, analytics. Usa Message Queue (Kafka, RabbitMQ, SQS) para desacoplar microservicios: persistencia, retry, DLQ, ordering. Event Bus es volatil: si el proceso muere, los eventos se pierden. MQ es persistente: sobrevive a restarts. Para un monolito modular, Event Bus. Para microservicios, MQ.
