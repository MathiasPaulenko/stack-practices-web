---
contentType: recipes
slug: event-sourcing-serverless
title: "Implementar Event Sourcing en Arquitecturas Serverless"
description: "Cómo capturar todos los cambios como eventos inmutables usando event sourcing con AWS Lambda, DynamoDB streams y event stores para audit trails y consultas temporales."
metaDescription: "Aprende event sourcing en arquitecturas serverless. Captura cambios como eventos inmutables usando Lambda, DynamoDB streams y event stores para audit trails."
difficulty: advanced
topics:
  - serverless
tags:
  - cqrs
  - dynamodb-streams
  - event-sourcing
  - event-store
  - immutable-events
  - lambda-triggers
  - serverless
  - serverless-patterns
  - temporal-query
relatedResources:
  - /recipes/cqrs-pattern
  - /recipes/saga-pattern
  - /recipes/serverless-orchestration
  - /recipes/event-driven-architecture
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende event sourcing en arquitecturas serverless. Captura cambios como eventos inmutables usando Lambda, DynamoDB streams y event stores para audit trails."
  keywords:
    - event sourcing serverless
    - eventos inmutables
    - event store
    - DynamoDB streams
    - audit trail
---

## Visión general

Los sistemas tradicionales almacenan el estado actual. Una orden está "enviada," y la fila de base de datos dice `status = shipped`. Si un usuario pregunta "¿cuándo cambió el estado a enviado?" la base de datos no tiene respuesta — el valor anterior fue sobrescrito. Si un analista pregunta "¿cuántas órdenes fueron canceladas y re-enviadas el mes pasado?" el sistema no puede responder sin agregar columnas de auditoría explícitas que rastreen cada cambio manualmente.

Event sourcing almacena cada cambio de estado como un evento inmutable en un log append-only. El estado actual se computa reproduciendo eventos. El estado de una orden no es una fila — es la secuencia `[OrderCreated, ItemAdded, PaymentProcessed, Shipped]`. Esto provee un audit trail completo, soporta consultas temporales ("¿cuál era el estado a las 3pm de ayer?"), y permite reconstruir proyecciones desde cero. En arquitecturas serverless, los eventos se capturan vía DynamoDB streams, SQS o EventBridge, y las funciones Lambda proyectan el modelo de lectura. Esta receta cubre implementación de event sourcing, event stores, proyecciones y consideraciones específicas de serverless.

## Cuándo usarlo

Usa esta receta cuando:

- El historial completo de auditoría de todos los cambios es un requerimiento de negocio
- Necesitas responder preguntas temporales sobre estados pasados
- Reconstruir modelos de lectura desde cero es una capacidad necesaria
- El modelo de escritura es complejo y el modelo de lectura necesita optimizarse separadamente
- Requerimientos de compliance o regulatorios mandatan logs de cambio inmutables

## Solución

### Event Store con DynamoDB y Streams

```typescript
interface DomainEvent {
  eventId: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: string;
  version: number;
}

class OrderEventStore {
  constructor(private tableName: string, private client: DynamoDBDocument) {}

  async appendEvents(aggregateId: string, events: DomainEvent[]): Promise<void> {
    const currentVersion = await this.getCurrentVersion(aggregateId);

    const transactItems = events.map((event, index) => ({
      Put: {
        TableName: this.tableName,
        Item: {
          pk: `ORDER#${aggregateId}`,
          sk: `EVENT#${(currentVersion + index + 1).toString().padStart(10, '0')}`,
          eventId: event.eventId,
          eventType: event.eventType,
          payload: event.payload,
          timestamp: new Date().toISOString(),
          version: currentVersion + index + 1,
        },
        ConditionExpression: 'attribute_not_exists(pk)',
      },
    }));

    await this.client.transactWrite({ TransactItems: transactItems });
  }

  async getEvents(aggregateId: string): Promise<DomainEvent[]> {
    const result = await this.client.query({
      TableName: this.tableName,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': `ORDER#${aggregateId}`,
        ':sk': 'EVENT#',
      },
      ScanIndexForward: true,
    });

    return (result.Items || []).map(item => ({
      eventId: item.eventId,
      aggregateId,
      eventType: item.eventType,
      payload: item.payload,
      timestamp: item.timestamp,
      version: item.version,
    }));
  }

  private async getCurrentVersion(aggregateId: string): Promise<number> {
    const events = await this.getEvents(aggregateId);
    return events.length > 0 ? events[events.length - 1].version : 0;
  }
}
```

### Lambda Projection Handler

```typescript
export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  for (const record of event.Records) {
    if (record.eventName !== 'INSERT') continue;

    const newImage = unmarshall(record.dynamodb?.NewImage as any);
    const domainEvent: DomainEvent = {
      eventId: newImage.eventId,
      aggregateId: newImage.aggregateId,
      eventType: newImage.eventType,
      payload: newImage.payload,
      timestamp: newImage.timestamp,
      version: newImage.version,
    };

    await projectEvent(domainEvent);
  }
};

async function projectEvent(event: DomainEvent): Promise<void> {
  switch (event.eventType) {
    case 'OrderCreated':
      await createOrderProjection(event.aggregateId, event.payload);
      break;
    case 'ItemAdded':
      await addItemToOrderProjection(event.aggregateId, event.payload);
      break;
    case 'OrderShipped':
      await updateOrderStatus(event.aggregateId, 'shipped');
      break;
  }
}
```

### Reconstrucción de Agregado

```typescript
class OrderAggregate {
  private status: string = 'pending';
  private items: OrderItem[] = [];
  private total: number = 0;

  applyEvent(event: DomainEvent): void {
    switch (event.eventType) {
      case 'OrderCreated':
        this.status = 'created';
        this.total = event.payload.total as number;
        break;
      case 'ItemAdded':
        this.items.push(event.payload.item as OrderItem);
        this.total += (event.payload.item as OrderItem).price;
        break;
      case 'OrderShipped':
        this.status = 'shipped';
        break;
      case 'OrderCancelled':
        this.status = 'cancelled';
        break;
    }
  }

  static fromEvents(events: DomainEvent[]): OrderAggregate {
    const order = new OrderAggregate();
    for (const event of events) {
      order.applyEvent(event);
    }
    return order;
  }
}
```

## Explicación

- **Event store**: el event store es un log append-only. Los eventos nunca se actualizan ni eliminan. Cada evento tiene un ID único, un aggregate ID (la entidad a la que pertenece), un tipo, un payload y una versión. La versión asegura ordenamiento y previene escrituras concurrentes (control de concurrencia optimista vía `ConditionExpression`).
- **Reconstrucción de agregado**: el estado actual de una entidad no se almacena directamente. En su lugar, cargas todos los eventos de un agregado y los reproduces en orden. El objeto agregado comienza vacío y aplica cada evento, mutando su estado interno. Esto es determinista — la misma secuencia de eventos siempre produce el mismo estado.
- **Proyecciones (modelos de lectura)**: los modelos de lectura se construyen suscribiéndose al stream de eventos. Cuando un evento es agregado, una Lambda (disparada por DynamoDB streams) actualiza la vista optimizada para lectura. Puedes tener múltiples proyecciones para los mismos eventos — una para el dashboard del cliente, otra para analytics, otra para indexación de búsqueda.
- **Snapshots**: reproducir miles de eventos para un agregado de larga vida es lento. Los snapshots cachean el estado del agregado en una versión específica. Para reconstruir, carga el último snapshot y reproduce solo eventos después de esa versión. Almacena snapshots periódicamente (ej. cada 100 eventos) y asíncronamente.

## Variantes

| Enfoque | Store | Proyecciones | Mejor para |
|---------|-------|-------------|------------|
| DynamoDB + Streams | DynamoDB | Lambda | Nativo AWS, escala moderada |
| EventStoreDB | EventStoreDB | Subscriptions | Alto volumen, dominios complejos |
| Kafka + KTables | Kafka | Kafka Streams | Stream processing, replay |
| S3 + Athena | S3 | Athena queries | Audit, compliance, analytics |
| Aurora + Outbox | PostgreSQL | CDC | Event sourcing relacional |

## Mejores prácticas

- **Versiona cada evento**: incluye una versión monotónicamente creciente por agregado. Usa `ConditionExpression` de DynamoDB para rechazar escrituras con versiones stale. Esto previene updates perdidos cuando dos usuarios modifican simultáneamente el mismo agregado.
- **Haz los eventos inmutables y autocontenidos**: un evento debería llevar todos los datos necesarios para entenderlo, no solo deltas. `OrderCreated` debería incluir customer ID, dirección de envío y líneas de items — no solo "la orden 123 fue creada." Consumidores futuros no deberían necesitar consultar otros sistemas para interpretar el evento.
- **Usa correlation IDs a través de la cadena de eventos**: cuando un evento dispara otro (ej. `OrderShipped` dispara `InventoryDecremented`), propaga el correlation ID. Esto habilita tracing end-to-end y debugging a través de cadenas de eventos distribuidas.
- **Implementa proyecciones idempotentes**: las funciones Lambda reintentan ante fallas. Una proyección que incrementa un contador en cada invocación sobrecuentará. Diseña proyecciones idempotentes — escribe el event ID en la fila de proyección y salta si ya fue procesado.
- **Archiva eventos viejos a cold storage**: DynamoDB es caro para almacenamiento a largo plazo de millones de eventos. Mueve eventos mayores a 90 días a S3 usando TTL de DynamoDB o jobs de export. Mantén el event store lean y consulta datos archivados vía Athena cuando sea necesario.

## Errores comunes

- **Almacenar estado actual junto a eventos**: si mantienes tanto un log de eventos como una tabla de estado actual, pueden divergir. Un bug en la proyección escribe estado A mientras el log contiene eventos para estado B. La fuente de verdad es el event store; las proyecciones son derivadas. No trates la proyección como estado primario.
- **Exponer tipos de evento a sistemas externos**: los consumidores externos no deberían depender de schemas internos de eventos. Usa un schema de evento público (ej. `OrderConfirmed`) y mapea eventos internos a públicos. El refactoring interno de tipos de evento no debería romper integraciones externas.
- **No manejar la evolución de schema de eventos**: cuando un tipo de evento cambia (agregando un campo), eventos viejos en el log no tienen el nuevo campo. El agregado debe manejar campos faltantes gracefulmente. Usa versionado de schema y valores por defecto, o upcast eventos viejos al cargar.
- **Reproducir eventos desde el inicio para cada query**: siempre usa snapshots para agregados con historias largas. Reproducir 10,000 eventos para cada `GET /order/123` destruye el rendimiento. Toma snapshots asíncronamente y carga desde ellos.

## Preguntas frecuentes

**P: ¿Es event sourcing más complejo que CRUD?**
R: Sí. Agrega conceptos (agregados, proyecciones, versionado de eventos) e infraestructura (event stores, stream processors). Úsalo solo cuando los beneficios (auditoría, consultas temporales, capacidad de reconstrucción) justifiquen la complejidad. Para CRUD simple sin requerimientos de auditoría, el almacenamiento tradicional de estado es suficiente.

**P: ¿Cómo elimino datos bajo GDPR si los eventos son inmutables?**
R: Implementa crypto-shredding: encripta payloads de eventos con una clave por usuario. Para "eliminar" los datos de un usuario, borra su clave de encriptación. Los eventos permanecen pero son ilegibles. Alternativamente, almacena PII en un store mutable separado y referéncialo desde los eventos.

**P: ¿Puedo usar event sourcing con bases de datos relacionales?**
R: Sí — usa el outbox pattern. Escribe eventos a una tabla `outbox` en la misma transacción que los cambios de datos de negocio. Un proceso CDC (change data capture) sondea el outbox y publica eventos. Esto te da garantías ACID con semántica de event sourcing.

**P: ¿Cómo consulto a través de agregados?**
R: No consultes el event store directamente para queries cross-aggregate. Construye proyecciones de modelo de lectura que desnormalicen datos para eficiencia de query. El event store es el modelo de escritura; las proyecciones son el modelo de lectura. Esta separación es CQRS.

