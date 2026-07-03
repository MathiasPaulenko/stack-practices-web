---
contentType: guides
slug: cqrs-guide
title: "CQRS — Segregación de Responsabilidades de Comandos y Consultas"
description: "Guía completa de CQRS: separa los modelos de lectura y escritura para optimizar rendimiento, escalabilidad y autonomía de equipos en dominios complejos."
metaDescription: "Aprende CQRS con separación de comandos y consultas, integración con event sourcing y patrones prácticos de implementación. Guía para sistemas escalables."
difficulty: advanced
topics:
  - architecture
  - design
tags:
  - cqrs
  - command-query-segregation
  - event-sourcing
  - read-model
  - write-model
  - scalability
  - domain-driven-design
  - guide
relatedResources:
  - /guides/event-sourcing-guide
  - /guides/cqrs-event-sourcing-combined-guide
  - /guides/hexagonal-architecture-guide
  - /guides/clean-architecture-guide
  - /patterns/design/event-bus-pattern
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Aprende CQRS con separación de comandos y consultas, integración con event sourcing y patrones prácticos de implementación. Guía para sistemas escalables."
  keywords:
    - cqrs
    - segregacion-de-responsabilidades
    - event-sourcing
    - modelo-de-lectura
    - modelo-de-escritura
    - escalabilidad
    - domain-driven-design
    - guía
---

## Overview

CQRS (Command Query Responsibility Segregation) es un patrón arquitectónico que separa los modelos utilizados para escribir datos de los modelos utilizados para leer datos. En lugar de un único modelo que maneja tanto comandos (escrituras) como consultas (lecturas), CQRS los divide en caminos distintos optimizados para sus respectivos propósitos. Esta separación permite ajustar rendimiento, escalar independientemente y simplificar los modelos mentales para dominios complejos.

## When to Use

- Las cargas de lectura y escritura tienen requisitos fundamentalmente diferentes
- Necesitas múltiples modelos de lectura para los mismos datos (ej. búsqueda, reportes, APIs)
- Diferentes equipos poseen las lecturas vs las escrituras
- Ya usas event sourcing (pareamiento natural)
- Necesitas escalar lecturas y escrituras de forma independiente

## When NOT to Use

- CRUD simple con patrones de lectura/escritura similares
- Equipos pequeños sin capacidad operacional para la complejidad adicional
- Sistemas donde la consistencia eventual es inaceptable en todas partes

## Conceptos Core

### Comandos

Los comandos representan intenciones de cambiar estado. Se nombran en imperativo y deben fallar rápido si la validación falla.

```typescript
interface CreateOrderCommand {
  customerId: string;
  items: OrderItem[];
  shippingAddress: Address;
}
```

### Consultas

Las consultas retornan datos sin efectos secundarios. Se moldean por las necesidades de la UI o consumidor, no por el modelo de dominio.

```typescript
interface OrderSummaryQuery {
  customerId: string;
  status?: OrderStatus;
  page: number;
  pageSize: number;
}

interface OrderSummary {
  orderId: string;
  total: Money;
  status: OrderStatus;
  placedAt: Date;
}
```

### Modelo de Escritura

Optimizado para consistencia, validación y reglas de negocio. Generalmente mapea estrechamente al modelo de dominio.

### Modelo de Lectura

Optimizado para rendimiento de consultas. Generalmente desnormalizado, proyectado y almacenado en una base de datos diferente.

## CQRS Simple (Base de Datos Única)

```
┌─────────────┐      ┌──────────────┐
│   Comando   │─────▶│  Modelo Escr │
│   Handler   │      │   (ORM)      │
└─────────────┘      └──────┬───────┘
                            │
                     ┌──────┴───────┐
                     │   Base de    │
                     │    Datos     │
                     └──────┬───────┘
                            │
┌─────────────┐      ┌──────┴───────┐
│   Consulta  │─────▶│  Modelo Lect │
│   Handler   │      │  (DTO/Vista) │
└─────────────┘      └──────────────┘
```

```typescript
// Lado escritura — modelo de dominio completo
class Order {
  private items: OrderItem[] = [];
  private status: OrderStatus = OrderStatus.PENDING;

  addItem(product: Product, quantity: number): void {
    if (quantity <= 0) throw new DomainError('Cantidad debe ser positiva');
    this.items.push(new OrderItem(product, quantity));
  }

  confirm(): void {
    if (this.items.length === 0) throw new DomainError('No se puede confirmar orden vacía');
    this.status = OrderStatus.CONFIRMED;
  }
}

// Lado lectura — DTO plano optimizado para listados
interface OrderListItem {
  orderId: string;
  customerName: string;
  totalAmount: number;
  itemCount: number;
  status: string;
  placedAt: string;
}
```

## CQRS Avanzado (Almacenes Separados)

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Comando   │─────▶│  Modelo Escr │─────▶│  Event Store│
│   Handler   │      │  (Aggregate) │      │  (Eventos)  │
└─────────────┘      └──────────────┘      └──────┬────┘
                                                   │
                                              ┌────┴────┐
                                              │  Event  │
                                              │  Bus    │
                                              └───┬─────┘
                                                  │
┌─────────────┐      ┌──────────────┐      ┌─────┴────┐
│   Consulta  │─────▶│  Modelo Lect │◀─────│ Projection│
│   Handler   │      │   (NoSQL)    │      │  Handler  │
└─────────────┘      └──────────────┘      └───────────┘
```

### Ejemplo de Proyección

```typescript
class OrderProjectionHandler {
  constructor(private readDb: ReadDatabase) {}

  async handle(event: OrderEvent): Promise<void> {
    switch (event.type) {
      case 'OrderCreated':
        await this.readDb.orders.insert({
          orderId: event.orderId,
          customerId: event.customerId,
          total: event.items.reduce((sum, i) => sum + i.price * i.quantity, 0),
          status: 'pending',
          createdAt: event.timestamp
        });
        break;

      case 'OrderConfirmed':
        await this.readDb.orders.update(
          { orderId: event.orderId },
          { status: 'confirmed', confirmedAt: event.timestamp }
        );
        break;
    }
  }
}
```

## Patrones de Optimización de Modelo de Lectura

| Patrón | Caso de Uso | Almacenamiento |
|--------|-------------|----------------|
| Vista Materializada | Agregados pre-computados | Document DB |
| Índice de Búsqueda | Búsqueda full-text | Elasticsearch |
| Proyección de Grafo | Consultas de relaciones | Neo4j |
| Caché | Datos calientes | Redis |
| Stream de Eventos | Analítica en tiempo real | Kafka/Kinesis |

## Modelos de Consistencia

- **Consistencia fuerte** — leer y escribir desde la misma transacción (CQRS simple)
- **Consistencia eventual** — modelo de lectura actualiza asincrónicamente (almacenes separados)
- **Lee-tus-escrituras** — enruta lecturas recientes al modelo de escritura temporalmente

## Errores Comunes

- **Separación prematura** — agregar CQRS a CRUD simple añade complejidad sin beneficio
- **Bugs de consistencia eventual** — usuarios refrescan y no ven sus propias escrituras
- **Explosión de modelos de lectura** — mantener demasiadas proyecciones para cada caso de uso
- **Infierno de transacciones distribuidas** — intentar hacer almacenes separados fuertemente consistentes

## FAQ

**¿CQRS requiere Event Sourcing?**
No. Puedes usar CQRS con una base de datos relacional para lecturas y escrituras, o con bases de datos separadas. Event sourcing es un compañero natural pero no requerido.

**¿Cómo manejo el lag en modelos de lectura?**
Usa el patrón lee-tus-escrituras, actualizaciones optimistas de UI, o polling con verificación de versión.

**¿Puedo usar CQRS con microservicios?**
Sí. Cada servicio puede tener su propia separación lectura/escritura. Ten cuidado con consultas entre servicios — prefiere composición de API o vistas materializadas.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.
