---
contentType: guides
slug: event-sourcing-guide
title: "Event Sourcing — Estado como Secuencia de Eventos"
description: "Inmersión profunda en Event Sourcing: persiste cambios de estado como eventos, reconstruye agregados desde el historial y construye audit trails por diseño."
metaDescription: "Aprende Event Sourcing con reconstrucción de agregados, event stores, snapshots y proyecciones. Guía completa para sistemas auditables y event-driven."
difficulty: advanced
topics:
  - architecture
  - design
tags:
  - event-sourcing
  - cqrs
  - event-store
  - audit-trail
  - domain-events
  - event-driven
  - guide
relatedResources:
  - /guides/cqrs-guide
  - /guides/cqrs-event-sourcing-combined-guide
  - /guides/hexagonal-architecture-guide
  - /patterns/design/event-bus-pattern
  - /patterns/design/outbox-pattern
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Aprende Event Sourcing con reconstrucción de agregados, event stores, snapshots y proyecciones. Guía completa para sistemas auditables y event-driven."
  keywords:
    - event-sourcing
    - cqrs
    - event-store
    - audit-trail
    - domain-events
    - event-driven
    - guía
---

## Overview

Event Sourcing es un patrón arquitectónico donde el estado de una aplicación se almacena no como una instantánea actual, sino como una secuencia de eventos inmutables. En lugar de actualizar una fila en la base de datos, agregas un evento describiendo lo que ocurrió. El estado actual se deriva reproduciendo todos los eventos de un agregado. Este enfoque proporciona un audit trail completo, permite consultas temporales y soporta naturalmente arquitecturas event-driven.

## When to Use

- Los requisitos de auditoría exigen saber exactamente cómo ocurrió cada cambio de estado
- Necesitas reconstruir estados pasados para debugging o cumplimiento
- La comunicación event-driven entre bounded contexts ya está planeada
- Las consultas temporales ("¿cómo se veía la cuenta el martes pasado?") son comunes
- Quieres desacoplar escrituras y lecturas con proyecciones

## When NOT to Use

- CRUD simple sin necesidades de auditoría o consultas temporales
- Equipos sin familiaridad con consistencia eventual y sistemas distribuidos
- Dominios donde los eventos son difíciles de definir o cambian frecuentemente
- Escrituras de alta frecuencia donde el replay de eventos sería demasiado lento sin snapshots

## Conceptos Core

### Eventos

Los eventos son hechos inmutables en pasado que describen algo que ocurrió en el dominio.

```typescript
interface DomainEvent {
  eventId: string;
  aggregateId: string;
  eventType: string;
  version: number;
  occurredAt: Date;
  payload: Record<string, unknown>;
}

interface OrderCreatedEvent extends DomainEvent {
  eventType: 'OrderCreated';
  payload: {
    customerId: string;
    items: { productId: string; quantity: number; price: number }[];
    shippingAddress: Address;
  };
}

interface OrderConfirmedEvent extends DomainEvent {
  eventType: 'OrderConfirmed';
  payload: {
    confirmedAt: Date;
    paymentReference: string;
  };
}
```

### Agregados

Los agregados son los límites de consistencia que emiten y aplican eventos. Reconstruyen su estado plegando eventos.

```typescript
class Order {
  private events: DomainEvent[] = [];
  private status: OrderStatus = OrderStatus.PENDING;
  private items: OrderItem[] = [];

  static create(data: CreateOrderData): Order {
    const order = new Order();
    order.apply(new OrderCreatedEvent({
      aggregateId: generateId(),
      eventId: generateId(),
      version: 1,
      occurredAt: new Date(),
      payload: data
    }));
    return order;
  }

  confirm(paymentRef: string): void {
    if (this.status !== OrderStatus.PENDING) {
      throw new DomainError('Solo órdenes pendientes pueden confirmarse');
    }
    this.apply(new OrderConfirmedEvent({
      aggregateId: this.id,
      eventId: generateId(),
      version: this.version + 1,
      occurredAt: new Date(),
      payload: { confirmedAt: new Date(), paymentReference: paymentRef }
    }));
  }

  private apply(event: DomainEvent): void {
    this.events.push(event);
    this.when(event);
  }

  private when(event: DomainEvent): void {
    switch (event.eventType) {
      case 'OrderCreated':
        this.id = event.aggregateId;
        this.items = event.payload.items.map(i => new OrderItem(i));
        break;
      case 'OrderConfirmed':
        this.status = OrderStatus.CONFIRMED;
        break;
    }
  }

  static fromHistory(events: DomainEvent[]): Order {
    const order = new Order();
    for (const event of events.sort((a, b) => a.version - b.version)) {
      order.when(event);
      order.version = event.version;
    }
    return order;
  }

  getUncommittedEvents(): DomainEvent[] {
    return [...this.events];
  }
}
```

## Event Store

El event store es un log append-only de todos los eventos de dominio. Debe soportar:

- Agregar eventos atómicamente por agregado
- Leer todos los eventos de un agregado en orden
- Control de concurrencia optimista (version check)
- Opcional: ordenamiento global para proyecciones

```sql
CREATE TABLE events (
  event_id UUID PRIMARY KEY,
  aggregate_id UUID NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL,
  event_type VARCHAR(200) NOT NULL,
  version INTEGER NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE (aggregate_id, version)
);

CREATE INDEX idx_events_aggregate ON events(aggregate_id, version);
CREATE INDEX idx_events_occurred ON events(occurred_at);
```

## Snapshots

Para agregados con miles de eventos, reproducir desde el evento 1 es lento. Los snapshots cachean el estado en una versión específica.

```typescript
interface Snapshot {
  aggregateId: string;
  aggregateType: string;
  version: number;
  state: SerializedState;
  createdAt: Date;
}

class AggregateRepository<T> {
  constructor(
    private eventStore: EventStore,
    private snapshotStore: SnapshotStore,
    private snapshotFrequency: number = 100
  ) {}

  async findById(id: string): Promise<T | null> {
    const snapshot = await this.snapshotStore.getLatest(id);
    const fromVersion = snapshot ? snapshot.version : 0;

    const events = await this.eventStore.getEvents(id, fromVersion + 1);
    if (events.length === 0 && !snapshot) return null;

    const aggregate = snapshot
      ? this.hydrateFromSnapshot(snapshot, events)
      : this.hydrateFromEvents(events);

    return aggregate;
  }

  async save(aggregate: T): Promise<void> {
    const events = aggregate.getUncommittedEvents();
    await this.eventStore.append(events);

    if (aggregate.version % this.snapshotFrequency === 0) {
      await this.snapshotStore.save(aggregate.toSnapshot());
    }
  }
}
```

## Proyecciones

Las proyecciones construyen modelos de lectura escuchando eventos y actualizando almacenes optimizados para consultas.

```typescript
class OrderSummaryProjection {
  constructor(private readDb: ReadDatabase) {}

  async handle(event: DomainEvent): Promise<void> {
    switch (event.eventType) {
      case 'OrderCreated':
        await this.readDb.orderSummaries.insert({
          orderId: event.aggregateId,
          customerId: event.payload.customerId,
          total: event.payload.items.reduce((s, i) => s + i.price * i.quantity, 0),
          itemCount: event.payload.items.length,
          status: 'pending',
          createdAt: event.occurredAt
        });
        break;

      case 'OrderConfirmed':
        await this.readDb.orderSummaries.update(
          { orderId: event.aggregateId },
          { status: 'confirmed', confirmedAt: event.payload.confirmedAt }
        );
        break;
    }
  }
}
```

## Errores Comunes

- **Evolución de esquema** — los eventos son contratos inmutables; planifica estrategias de migración temprano
- **Explosión de eventos** — no cada cambio de campo necesita un evento; modela eventos de dominio significativos
- **Descuido de snapshots** — olvidar los snapshots hace que la reconstrucción sea insoportablemente lenta
- **Inconsistencia de proyecciones** — las proyecciones deben ser idempotentes y manejar eventos fuera de orden

## FAQ

**¿Cómo borro datos bajo GDPR?**
Usa borrado criptográfico (elimina la clave de encriptación de payloads sensibles) o modela eventos explícitos `DataAnonymized`.

**¿Puedo usar una base de datos relacional como event store?**
Sí, PostgreSQL con JSONB funciona bien para escala moderada. Para alto throughput, usa stores especializados como EventStoreDB.

**¿Cómo testeo agregados con event sourcing?**
Afirma sobre los eventos emitidos, no sobre el estado. Dada una secuencia de eventos, cuando se ejecuta un comando, entonces deberían emitirse eventos específicos.
