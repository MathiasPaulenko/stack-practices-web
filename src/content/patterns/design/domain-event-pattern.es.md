---
contentType: patterns
slug: domain-event-pattern
title: "Patrón Domain Event"
description: "Captura y publica ocurrencias importantes dentro de un modelo de dominio para desacoplar efectos secundarios de la lógica de negocio central y habilitar workflows reactivos."
metaDescription: "Aprende el Patrón Domain Event para desacoplar lógica de negocio de efectos secundarios. Ejemplos en Python, Java y JavaScript con event sourcing."
difficulty: intermediate
topics:
  - design
tags:
  - domain-event
  - pattern
  - design-pattern
  - behavioral
  - ddd
  - event-driven
  - decoupling
  - messaging
relatedResources:
  - /patterns/design/aggregate-pattern
  - /patterns/design/outbox-pattern
  - /patterns/design/event-bus-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Domain Event para desacoplar lógica de negocio de efectos secundarios. Ejemplos en Python, Java y JavaScript con event sourcing."
  keywords:
    - domain event
    - design pattern
    - event driven
    - ddd
    - decoupling
---

# Patrón Domain Event

## Descripción General

El Patrón Domain Event captura ocurrencias de negocio importantes dentro de un modelo de dominio como objetos de primera clase. Cuando algo importante sucede — se realiza un pedido, se registra un usuario, falla un pago — el dominio emite un evento. Otras partes del sistema reaccionan a estos eventos en lugar de ser llamadas directamente.

Esto desacopla la lógica de negocio central de efectos secundarios como enviar emails, actualizar analytics o notificar servicios downstream. Los eventos de dominio también habilitan el event sourcing, donde el estado de un aggregate se reconstruye reproduciendo su historial de eventos.

## Cuándo Usar

Usa el Patrón Domain Event cuando:
- Los efectos secundarios no deberían dispararse directamente por la lógica de negocio
- Múltiples subsistemas necesitan reaccionar a la misma ocurrencia de negocio
- Necesitas un audit trail de qué pasó en el sistema y cuándo
- La consistencia eventual entre bounded contexts es aceptable
- Quieres habilitar event sourcing para aggregates

## Cuándo Evitar

- Aplicaciones CRUD simples donde llamadas directas son suficientes
- Operaciones síncronas donde se requiere feedback inmediato
- Debuggear cadenas de eventos se vuelve difícil en sistemas grandes
- Sobre-abstracción: no cada setter necesita emitir un evento

## Solución

### Python

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Callable
from uuid import UUID, uuid4


@dataclass(frozen=True)
class DomainEvent:
    event_id: UUID = field(default_factory=uuid4)
    occurred_at: datetime = field(default_factory=datetime.now)
    aggregate_id: str = ""
    event_type: str = ""
    payload: dict = field(default_factory=dict)


class EventPublisher:
    _handlers: List[Callable] = []

    @classmethod
    def subscribe(cls, handler: Callable):
        cls._handlers.append(handler)

    @classmethod
    def publish(cls, event: DomainEvent):
        for handler in cls._handlers:
            handler(event)


class Order:
    def __init__(self, customer_id: str):
        self.id = str(uuid4())
        self.customer_id = customer_id
        self.lines = []
        self.status = "pending"
        self._events: List[DomainEvent] = []

    def add_line(self, product_id: str, quantity: int, price: float):
        self.lines.append({"product_id": product_id, "quantity": quantity, "price": price})

    def submit(self):
        if not self.lines:
            raise ValueError("No se puede enviar un pedido vacío")
        self.status = "submitted"
        self._events.append(DomainEvent(
            aggregate_id=self.id,
            event_type="OrderSubmitted",
            payload={"customer_id": self.customer_id, "line_count": len(self.lines)}
        ))

    def clear_events(self):
        events = list(self._events)
        self._events.clear()
        return events


# Uso
order = Order("cust-123")
order.add_line("prod-1", 2, 9.99)
order.submit()

for event in order.clear_events():
    EventPublisher.publish(event)
```

### Java

```java
import java.time.Instant;
import java.util.*;

public record DomainEvent(
    UUID eventId,
    Instant occurredAt,
    String aggregateId,
    String eventType,
    Map<String, Object> payload
) {
    public DomainEvent(String aggregateId, String eventType, Map<String, Object> payload) {
        this(UUID.randomUUID(), Instant.now(), aggregateId, eventType, payload);
    }
}

class EventPublisher {
    private static final List<java.util.function.Consumer<DomainEvent>> handlers = new ArrayList<>();

    public static void subscribe(java.util.function.Consumer<DomainEvent> handler) {
        handlers.add(handler);
    }

    public static void publish(DomainEvent event) {
        handlers.forEach(h -> h.accept(event));
    }
}

class Order {
    private final UUID id = UUID.randomUUID();
    private final String customerId;
    private final List<Map<String, Object>> lines = new ArrayList<>();
    private String status = "pending";
    private final List<DomainEvent> events = new ArrayList<>();

    public Order(String customerId) {
        this.customerId = customerId;
    }

    public void addLine(String productId, int quantity, double price) {
        lines.add(Map.of("product_id", productId, "quantity", quantity, "price", price));
    }

    public void submit() {
        if (lines.isEmpty()) throw new IllegalStateException("No se puede enviar pedido vacío");
        status = "submitted";
        events.add(new DomainEvent(
            id.toString(), "OrderSubmitted",
            Map.of("customer_id", customerId, "line_count", lines.size())
        ));
    }

    public List<DomainEvent> clearEvents() {
        List<DomainEvent> result = new ArrayList<>(events);
        events.clear();
        return result;
    }
}

// Uso
EventPublisher.subscribe(event -> System.out.println("Recibido: " + event.eventType()));
Order order = new Order("cust-123");
order.addLine("prod-1", 2, 9.99);
order.submit();
order.clearEvents().forEach(EventPublisher::publish);
```

### JavaScript

```javascript
class DomainEvent {
  constructor(aggregateId, eventType, payload = {}) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date().toISOString();
    this.aggregateId = aggregateId;
    this.eventType = eventType;
    this.payload = payload;
  }
}

class EventPublisher {
  static handlers = [];

  static subscribe(handler) {
    this.handlers.push(handler);
  }

  static publish(event) {
    this.handlers.forEach(h => h(event));
  }
}

class Order {
  constructor(customerId) {
    this.id = crypto.randomUUID();
    this.customerId = customerId;
    this.lines = [];
    this.status = 'pending';
    this._events = [];
  }

  addLine(productId, quantity, price) {
    this.lines.push({ productId, quantity, price });
  }

  submit() {
    if (this.lines.length === 0) throw new Error('No se puede enviar pedido vacío');
    this.status = 'submitted';
    this._events.push(new DomainEvent(
      this.id, 'OrderSubmitted',
      { customer_id: this.customerId, line_count: this.lines.length }
    ));
  }

  clearEvents() {
    const events = [...this._events];
    this._events = [];
    return events;
  }
}

// Uso
EventPublisher.subscribe(event => console.log('Recibido:', event.eventType));
const order = new Order('cust-123');
order.addLine('prod-1', 2, 9.99);
order.submit();
order.clearEvents().forEach(e => EventPublisher.publish(e));
```

## Explicación

Un Domain Event es:

- **Inmutable**: Una vez creado, nunca cambia. Representa algo que ya sucedió.
- **Nombrado en pasado**: `OrderSubmitted`, `PaymentFailed`, `UserRegistered`.
- **Rico en contexto**: Incluye el aggregate ID, timestamp, y payload de datos relevantes.
- **Publicado después de cambios de estado**: El aggregate cambia de estado primero, luego emite eventos describiendo qué cambió.

## Variantes

| Variante | Entrega | Caso de Uso |
|----------|---------|-------------|
| **In-memory** | Síncrono dentro del proceso | Desacoplamiento simple dentro de un monolito |
| **Outbox** | Async vía tabla de base de datos | Entrega cross-service confiable |
| **Event Sourcing** | Los eventos son la fuente de verdad | Audit trail completo y queries temporales |
| **CQRS** | Proyecciones de read model | Separar modelos de lectura y escritura |

## Lo que Funciona

- **Nombrar eventos en pasado.** `OrderPlaced`, no `PlaceOrder`. Los eventos describen cosas que ya pasaron.
- **Mantener los eventos pequeños.** Incluye solo los datos necesarios para los consumidores. No incluyas el estado completo del aggregate.
- **Usar UUIDs para IDs de evento.** Esto habilita idempotencia y trazabilidad a través de servicios.
- **Incluir timestamps.** `occurred_at` ayuda con ordenamiento, debugging y analytics.
- **Limpiar eventos después de publicar.** Los aggregates no deben acumular listas de eventos ilimitadas en memoria.

## Errores Comunes

- **Emitir eventos antes de cambios de estado.** Si el cambio de estado falla, el evento ya fue publicado, causando inconsistencia.
- **Olvidar limpiar eventos** causa memory leaks y publicación duplicada en operaciones subsecuentes.
- **Poner demasiados datos en payloads** satura el event bus y acopla consumidores a estructuras internas.
- **Tratar comandos como eventos.** `PlaceOrder` es un comando; `OrderPlaced` es un evento. No los confundas.
- **Falta de versionamiento de eventos.** A medida que el schema de payload evoluciona, consumidores antiguos se rompen. Versiona tus eventos.

## Ejemplos del Mundo Real

### Axon Framework

Framework Java construido alrededor de eventos de dominio y event sourcing. Los aggregates emiten eventos; los event handlers construyen read models.

### EventStoreDB

Una base de datos diseñada para event sourcing. Streams de domain events se persisten como el modelo de datos primario.

### Stripe Webhooks

Stripe publica `charge.succeeded`, `invoice.paid` y otros eventos de dominio a webhooks. Tu aplicación reacciona a ellos asíncronamente.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre un Domain Event y un Integration Event?**
A: Los domain events se quedan dentro de un bounded context. Los integration events cruzan límites de servicio y usualmente se publican vía un message broker.

**Q: Debería almacenar eventos de dominio en una base de datos?**
A: Sí, si usas event sourcing o el outbox pattern. Para simple desacoplamiento in-memory, el almacenamiento es opcional.

**Q: Puedo modificar un domain event después de crearlo?**
A: No. Los eventos representan hechos inmutables. Si necesitas corregir algo, publica un evento compensatorio como `OrderCancelled`.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
