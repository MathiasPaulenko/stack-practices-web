---
contentType: recipes
slug: cqrs-pattern
title: "Escalar Cargas de Lectura y Escritura con CQRS"
description: "Cómo separar modelos de lectura y escritura usando Command Query Responsibility Segregation para queries optimizadas, event sourcing, y escalado independiente de rutas de lectura y escritura."
metaDescription: "Aprende CQRS para escalar lectura y escritura. Separa modelos de lectura y escritura para queries optimizadas, event sourcing, y escalado independiente."
difficulty: advanced
topics:
  - design
tags:
  - design
  - cqrs
relatedResources:
  - /recipes/domain-driven-design
  - /recipes/microservices-patterns
  - /recipes/event-driven-functions
  - /recipes/database-migrations
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende CQRS para escalar lectura y escritura. Separa modelos de lectura y escritura para queries optimizadas, event sourcing, y escalado independiente."
  keywords:
    - patron cqrs
    - command query responsibility segregation
    - modelo lectura escritura
    - event sourcing cqrs
    - queries escalables
---

## Visión general

Las aplicaciones CRUD tradicionales usan un único modelo de datos para lectura y escritura. Una tabla relacional sirve queries `SELECT` para dashboards y operaciones `INSERT/UPDATE` para envíos de forms. Esta simplicidad funciona para dominios pequeños pero se rompe a escala. Los esquemas optimizados para escritura (normalizados, transaccionales) son lentos para lecturas complejas. Los esquemas optimizados para lectura (desnormalizados, indexados) son costosos de actualizar. A medida que crece el tráfico, ambas cargas de trabajo compiten por los mismos recursos de base de datos.

Command Query Responsibility Segregation (CQRS) divide el modelo de datos en dos: un modelo de escritura optimizado para commands (crear, actualizar, eliminar) y un modelo de lectura optimizado para queries. Los commands mutan estado en el modelo de escritura y publican eventos. Los event handlers actualizan modelos de lectura — proyecciones desnormalizadas adaptadas para patrones de query específicos. Los dos modelos pueden usar diferentes bases de datos, diferentes esquemas, y escalar independientemente. Esta receta cubre implementación de CQRS con event sourcing y patrones de proyección.

## Cuándo usarlo

Usa esta receta cuando:

- Los volúmenes de lectura y escritura difieren significativamente (ratios 100:1 de lectura intensiva son comunes). Consulta [Réplicas de Lectura](/recipes/databases/database-read-replicas) para escalado de lecturas.
- Queries complejas requieren joins entre múltiples aggregates, degradando performance de escritura. Consulta [SQL Joins](/recipes/databases/sql-joins) para optimización de queries.
- Construyendo dashboards en tiempo real, analytics, o búsqueda que necesita datos con forma diferente al modelo transaccional
- Trabajando con sistemas event-sourced donde el estado se deriva de una secuencia de eventos. Consulta [Event Sourcing](/recipes/databases/event-sourcing-relational) para patrones de event store.
- Equipos necesitan optimizar esquemas de lectura y escritura independientemente sin coordinación

## Solución

### Command Handler con Publicación de Eventos (TypeScript)

```typescript
interface Event {
  type: string;
  aggregateId: string;
  payload: unknown;
  occurredAt: Date;
}

interface EventStore {
  append(events: Event[]): Promise<void>;
  getEvents(aggregateId: string): Promise<Event[]>;
}

class OrderWriteModel {
  constructor(
    public id: string,
    public customerId: string,
    public items: Array<{ productId: string; quantity: number; price: number }>,
    public status: 'pending' | 'paid' | 'shipped' = 'pending'
  ) {}

  pay(paymentMethod: string): Event[] {
    if (this.status !== 'pending') throw new Error('Order already paid');
    return [{
      type: 'OrderPaid',
      aggregateId: this.id,
      payload: { paymentMethod, total: this.total() },
      occurredAt: new Date(),
    }];
  }

  total(): number {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
}

class PayOrderCommand {
  constructor(public orderId: string, public paymentMethod: string) {}
}

class PayOrderHandler {
  constructor(private eventStore: EventStore) {}

  async handle(command: PayOrderCommand): Promise<void> {
    const events = await this.eventStore.getEvents(command.orderId);
    const order = this.rehydrate(events);
    const newEvents = order.pay(command.paymentMethod);
    await this.eventStore.append(newEvents);
  }

  private rehydrate(events: Event[]): OrderWriteModel {
    const order = new OrderWriteModel(events[0].aggregateId, '', []);
    for (const event of events) {
      // Apply each event to mutate order state
    }
    return order;
  }
}
```

### Read Model Projection (SQL)

```sql
CREATE TABLE order_summaries (
  order_id UUID PRIMARY KEY,
  customer_name VARCHAR(255),
  total_amount DECIMAL(10,2),
  item_count INT,
  status VARCHAR(20),
  last_updated TIMESTAMP
);

CREATE OR REPLACE FUNCTION project_order_paid()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE order_summaries
  SET status = 'paid', last_updated = NEW.occurred_at
  WHERE order_id = NEW.aggregate_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Event Handler Actualizando Read Model (Node.js)

```javascript
class OrderProjection {
  constructor(private readDb, private elasticsearch) {}

  async handleOrderPaid(event) {
    await this.readDb.query(
      'UPDATE order_summaries SET status = $1, last_updated = $2 WHERE order_id = $3',
      ['paid', event.occurredAt, event.aggregateId]
    );

    await this.elasticsearch.update({
      index: 'orders',
      id: event.aggregateId,
      doc: { status: 'paid', paidAt: event.occurredAt }
    });
  }

  async handleOrderCreated(event) {
    await this.readDb.query(
      `INSERT INTO order_summaries (order_id, customer_name, total_amount, item_count, status, last_updated)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [event.aggregateId, event.payload.customerName, event.payload.total,
       event.payload.items.length, 'pending', event.occurredAt]
    );
  }
}
```

## Explicación

- **Command model**: maneja cambios de estado. Cada command es validado contra invariantes, muta el modelo de escritura, y produce domain events. El modelo de escritura es normalizado y transaccional — enforce reglas de negocio a costa de complejidad de query.
- **Event sourcing**: en lugar de almacenar estado actual, almacena la secuencia de eventos que llevaron a él. El modelo de escritura agrega eventos a un event store. El estado se rehidrata reproduciendo eventos. Esto provee historial de auditoría completo y queries temporales.
- **Read model (proyección)**: una vista desnormalizada y optimizada para queries construida desde eventos. Un read model de `customer_orders` podría aplanar items de orden, nombres de clientes y estado de envío en una sola tabla con índices apropiados. Se construye y actualiza asíncronamente.
- **Consistencia eventual**: cuando un command completa, el read model no se actualiza inmediatamente. Hay una breve ventana (milisegundos a segundos) donde el modelo de escritura refleja el cambio pero el read model no. Esto es consistencia eventual — aceptable para la mayoría de sistemas de lectura intensiva.

## Variantes

| Enfoque | Modelo de escritura | Modelo de lectura | Consistencia | Mejor para |
|---------|--------------------|--------------------|-------------|------------|
| Single DB, vistas separadas | Relacional | Materialized views | Fuerte | CQRS simple |
| Dual DB | Relacional | Documento/Búsqueda | Eventual | Alta escala de lectura |
| Event sourcing | Event store | Múltiples proyecciones | Eventual | Auditoría, queries temporales |
| Réplicas de lectura | DB primaria | DB réplica | Casi-fuerte | Escalado de lectura sin complejidad |

## Mejores prácticas

- **Mantén read models simples y desechables**: un read model es un cache, no una fuente de verdad. Si se corrompe, reconstrúyelo reproduciendo eventos desde el inicio. No pongas lógica de negocio u operaciones de escritura en read models.
- **Versiona tus eventos**: a medida que los esquemas evolucionan, proyecciones más antiguas aún deben entender eventos históricos. Incluye un campo de versión en eventos y escribe handlers para cada versión. Esto permite migración gradual sin downtime.
- **Usa proyecciones idempotentes**: los event handlers pueden ejecutarse múltiples veces (entrega al-menos-una-vez). Diseña proyecciones para que procesar el mismo evento dos veces produzca el mismo resultado. Usa `UPSERT` en lugar de `INSERT`.
- **Monitorea lag de proyección**: el delay entre escritura y actualización de read model debe estar acotado. Alerta si el lag de proyección excede tu SLA (ej. 5 segundos). Proyecciones lentas indican backpressure o event handlers ineficientes.
- **Empieza simple, evoluciona a CQRS**: no construyas CQRS desde el día uno en un proyecto greenfield. Empieza con un modelo único. Cuando la complejidad o performance de lectura se vuelve un problema, extrae un read model. CQRS prematuro agrega complejidad innecesaria.

## Errores comunes

- **CQRS sin razón**: si tu aplicación tiene CRUD simple con ratios iguales de lectura/escritura, CQRS agrega complejidad sin beneficio. Úsalo cuando la asimetría de lectura/escritura o complejidad de query justifique la separación.
- **Poner reglas de negocio en read models**: los read models son para querying. Si te encuentras validando o mutando estado en una proyección, has violado la separación. Las reglas de negocio pertenecen a los command handlers.
- **Ignorar consistencia eventual en UX**: los usuarios pueden enviar un form e inmediatamente refrescar, viendo datos obsoletos. Diseña la UI para manejar esto — muestra un mensaje de éxito, actualiza optimistamente, o redirige a una página de confirmación en lugar de inmediatamente consultar el read model.
- **Reproducir eventos desde el inicio en cada deploy**: en desarrollo, es tentador limpiar el read model y reconstruir desde cero. En producción con billones de eventos, esto toma días. Implementa snapshotting — guarda periódicamente estado de aggregate para que las reproducciones empiecen desde el snapshot, no desde el evento 1.

## Preguntas frecuentes

**P: ¿Es CQRS lo mismo que event sourcing?**
R: No. CQRS separa lecturas y escrituras. [Event sourcing](/recipes/databases/event-sourcing-relational) almacena estado como eventos. Se usan frecuentemente juntos porque event sourcing produce naturalmente eventos que pueden poblar read models. Pero puedes usar CQRS sin event sourcing (ej. dual databases) y event sourcing sin CQRS (modelo único reconstruido desde eventos).

**P: ¿Cómo manejo queries que necesitan datos en tiempo real?**
R: Para requisitos verdaderamente en tiempo real (sub-segundo), consulta el modelo de escritura directamente. Acepta el costo de performance para el pequeño subconjunto de queries que necesitan frescura perfecta. La mayoría de dashboards y listas pueden tolerar consistencia eventual.

**P: ¿Qué pasa si una proyección falla?**
R: Las proyecciones fallidas no deberían bloquear la ruta de escritura. Usa una dead-letter queue para eventos fallidos. Arregla el handler de proyección y reproduce desde el punto de fallo. El modelo de escritura permanece disponible durante todo el proceso.

**P: ¿Puedo usar CQRS con una base de datos relacional?**
R: Sí. El modelo de escritura puede ser un esquema relacional normalizado. El read model puede ser un esquema separado con vistas desnormalizadas, o una tecnología diferente (Elasticsearch, Redis, ClickHouse). Usa lo que se ajuste al patrón de query.

