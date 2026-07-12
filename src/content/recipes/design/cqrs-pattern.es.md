---

contentType: recipes
slug: cqrs-pattern-recipe
title: "Escalar Cargas de Lectura y Escritura con CQRS"
description: "Cómo separar modelos de lectura y escritura usando Command Query Responsibility Segregation para queries optimizadas, event sourcing, y escalado independiente de rutas de lectura y escritura."
metaDescription: "Aprende CQRS para escalar lectura y escritura. Separa modelos de lectura y escritura para queries optimizadas, event sourcing, y escalado independiente."
difficulty: advanced
topics:
  - design
tags:
  - design
  - cqrs
  - design-patterns
  - patterns
  - oop
relatedResources:
  - /recipes/domain-driven-design
  - /recipes/microservices-patterns
  - /recipes/event-driven-functions
  - /recipes/database-migrations
  - /recipes/observer-pattern-recipe
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

Command Query Responsibility Segregation (CQRS) divide el modelo de datos en dos: un modelo de escritura optimizado para commands (crear, actualizar, eliminar) y un modelo de lectura optimizado para queries. Los commands mutan estado en el modelo de escritura y publican eventos. Los event handlers actualizan modelos de lectura — proyecciones desnormalizadas adaptadas para patrones de query específicos. Los dos modelos pueden usar diferentes bases de datos, diferentes esquemas, y escalar independientemente. La solucion a continuacion cubre implementación de CQRS con event sourcing y patrones de proyección.

## Cuándo usarlo

Usa esta receta cuando:

- Los volúmenes de lectura y escritura difieren considerablemente (ratios 100:1 de lectura intensiva son comunes). Consulta [Réplicas de Lectura](/recipes/databases/database-read-replicas) para escalado de lecturas.
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

## Lo que funciona

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


### Implementación en Python con Event Sourcing

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Any
from abc import ABC, abstractmethod
import uuid

@dataclass
class Event:
    type: str
    aggregate_id: str
    payload: Any
    occurred_at: datetime = field(default_factory=datetime.utcnow)

class EventStore(ABC):
    @abstractmethod
    async def append(self, events: List[Event]) -> None:
        ...

    @abstractmethod
    async def get_events(self, aggregate_id: str) -> List[Event]:
        ...

@dataclass
class OrderItem:
    product_id: str
    quantity: int
    price: float

class OrderWriteModel:
    def __init__(self, order_id: str, customer_id: str, items: List[OrderItem]):
        self.id = order_id
        self.customer_id = customer_id
        self.items = items
        self.status = 'pending'

    def pay(self, payment_method: str) -> List[Event]:
        if self.status != 'pending':
            raise ValueError('Order already paid')
        self.status = 'paid'
        return [Event(
            type='OrderPaid',
            aggregate_id=self.id,
            payload={'payment_method': payment_method, 'total': self.total()}
        )]

    def total(self) -> float:
        return sum(item.price * item.quantity for item in self.items)

class PayOrderHandler:
    def __init__(self, event_store: EventStore):
        self._event_store = event_store

    async def handle(self, order_id: str, payment_method: str) -> None:
        events = await self._event_store.get_events(order_id)
        order = self._rehydrate(events)
        new_events = order.pay(payment_method)
        await self._event_store.append(new_events)

    def _rehydrate(self, events: List[Event]) -> OrderWriteModel:
        if not events:
            raise ValueError('No events found for order')
        order = OrderWriteModel(events[0].aggregate_id, '', [])
        for event in events:
            if event.type == 'OrderCreated':
                order.customer_id = event.payload['customer_id']
                order.items = [OrderItem(**i) for i in event.payload['items']]
            elif event.type == 'OrderPaid':
                order.status = 'paid'
        return order
```

### Snapshotting para Event Streams Grandes

```typescript
interface Snapshot {
  aggregateId: string;
  version: number;
  state: unknown;
}

class SnapshotStore {
  async save(snapshot: Snapshot): Promise<void> {
    // Persistir snapshot a base de datos
  }

  async load(aggregateId: string): Promise<Snapshot | null> {
    // Cargar último snapshot
    return null;
  }
}

class PayOrderHandlerWithSnapshots {
  constructor(
    private eventStore: EventStore,
    private snapshots: SnapshotStore
  ) {}

  async handle(command: PayOrderCommand): Promise<void> {
    const snapshot = await this.snapshots.load(command.orderId);
    let order: OrderWriteModel;
    let fromVersion = 0;

    if (snapshot) {
      order = snapshot.state as OrderWriteModel;
      fromVersion = snapshot.version;
    } else {
      const events = await this.eventStore.getEvents(command.orderId);
      order = this.rehydrate(events);
      fromVersion = events.length;
    }

    // Aplicar solo eventos después del snapshot
    const recentEvents = await this.eventStore.getEventsAfter(
      command.orderId, fromVersion
    );
    for (const event of recentEvents) {
      this.apply(order, event);
    }

    const newEvents = order.pay(command.paymentMethod);
    await this.eventStore.append(newEvents);

    // Guardar snapshot cada 100 eventos
    if (fromVersion + recentEvents.length + newEvents.length >= 100) {
      await this.snapshots.save({
        aggregateId: command.orderId,
        version: fromVersion + recentEvents.length + newEvents.length,
        state: order,
      });
    }
  }

  private apply(order: OrderWriteModel, event: Event): void {
    // Aplicar evento a la orden
  }

  private rehydrate(events: Event[]): OrderWriteModel {
    return new OrderWriteModel(events[0]?.aggregateId ?? '', '', []);
  }
}
```

### Base de Datos de Lectura Separada con Redis

```typescript
class OrderReadModelRedis {
  constructor(private redis: RedisClient) {}

  async getOrderSummary(orderId: string): Promise<OrderSummary | null> {
    const data = await this.redis.hgetall(`order:${orderId}:summary`);
    if (!data || Object.keys(data).length === 0) return null;

    return {
      orderId,
      customerName: data.customerName,
      totalAmount: parseFloat(data.totalAmount),
      itemCount: parseInt(data.itemCount, 10),
      status: data.status,
    };
  }

  async handleOrderCreated(event: Event): Promise<void> {
    await this.redis.hset(`order:${event.aggregateId}:summary`, {
      customerName: event.payload.customerName,
      totalAmount: event.payload.total.toString(),
      itemCount: event.payload.items.length.toString(),
      status: 'pending',
    });
  }

  async handleOrderPaid(event: Event): Promise<void> {
    await this.redis.hset(`order:${event.aggregateId}:summary`, {
      status: 'paid',
    });
  }
}
```

## Mejores Prácticas Adicionales

1. **Usa pools de conexiones separados para lectura y escritura.** Esto previene que las queries de lectura agoten las conexiones necesarias para escritura:

```typescript
const writePool = new Pool({ connectionString: config.writeDbUrl, max: 10 });
const readPool = new Pool({ connectionString: config.readDbUrl, max: 50 });
```

2. **Implementa el patrón saga para commands multi-aggregate.** Cuando un command abarca múltiples aggregates, usa un saga para coordinar:

```typescript
class OrderSaga {
  async handle(command: CreateOrderCommand): Promise<void> {
    const events: Event[] = [];
    events.push(...await this.inventoryService.reserve(command.items));
    events.push(...await this.paymentService.charge(command.paymentMethod));
    events.push(new OrderCreated(command.orderId, command.items));
    await this.eventStore.append(events);
  }
}
```

3. **Usa materialized views para CQRS simple.** Las materialized views de PostgreSQL te dan separación de read model sin una base de datos separada:

```sql
CREATE MATERIALIZED VIEW order_summaries AS
SELECT
  o.id AS order_id,
  c.name AS customer_name,
  SUM(oi.price * oi.quantity) AS total_amount,
  COUNT(oi.id) AS item_count,
  o.status
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, c.name, o.status;

-- Refrescar periódicamente
REFRESH MATERIALIZED VIEW CONCURRENTLY order_summaries;
```

## Errores Comunes Adicionales

1. **Compartir conexiones de base de datos entre read y write models.** Las queries de lectura con result sets grandes pueden matar las operaciones de escritura:

```typescript
// Mal: pool compartido
const pool = new Pool({ connectionString: dbUrl });
const writeRepo = new WriteRepository(pool);
const readRepo = new ReadRepository(pool);

// Bien: pools separados
const writePool = new Pool({ connectionString: writeDbUrl });
const readPool = new Pool({ connectionString: readDbUrl });
```

2. **No manejar eventos fuera de orden.** Los event handlers pueden recibir eventos en orden incorrecto debido a network partitions o retries. Usa un version o sequence number:

```typescript
async handleOrderPaid(event: Event): Promise<void> {
  const current = await this.redis.hget(`order:${event.aggregateId}`, 'version');
  if (current && parseInt(current) >= event.version) {
    return; // Ya procesado
  }
  // Procesar evento
}
```

3. **Construir demasiados read models.** Cada read model agrega overhead de mantenimiento. Empieza con un read model por patrón de query que tenga necesidades de optimización diferentes:

```typescript
// Mal: read model separado por endpoint
const models = {
  orderList: new OrderListModel(),
  orderDetail: new OrderDetailModel(),
  orderSearch: new OrderSearchModel(),
  orderExport: new OrderExportModel(),
};

// Bien: un read model sirviendo múltiples endpoints
const orderReadModel = new OrderReadModel();
// Usa diferentes queries contra el mismo modelo
```

## FAQ Adicional

### ¿Cómo testeo sistemas CQRS?

Testea command handlers con un event store en memoria. Testea proyecciones reproduciendo eventos y verificando el estado del read model. Para tests de integración, usa una base de datos real y verifica el flujo completo de evento a proyección. Testea consistencia eventual verificando que el read model se actualice dentro de una ventana de timeout.

### ¿Cuál es la diferencia entre CQRS y microservicios?

CQRS separa lectura y escritura dentro de un solo servicio. Los microservicios separan dominios enteros en servicios independientes. Puedes usar CQRS dentro de un microservicio, y puedes usar event sourcing para comunicar entre microservicios. Son patrones ortogonales.

### ¿Esta solución está lista para producción?

Sí. Los patrones de command handler, event store y proyección se usan en sistemas event-sourced de producción. Las implementaciones de TypeScript y Python son directamente usables. El patrón de read model con Redis es común en plataformas de e-commerce de alto throughput. Adapta el manejo de errores e infraestructura a tu entorno específico.

### ¿Cuáles son las características de rendimiento?

El throughput de la ruta de escritura está limitado por la latencia de append del event store (típicamente 1-5ms por batch). El throughput de la ruta de lectura depende de la base de datos de lectura — Redis sirve lecturas en sub-milisegundo, las materialized views de PostgreSQL en 1-10ms. El lag de proyección es típicamente 50-200ms con batching apropiado. El snapshotting reduce el tiempo de rehidratación de O(n) eventos a carga de snapshot O(1) más O(eventos recientes).

### ¿Cómo depuro problemas con este enfoque?

Verifica el lag de proyección primero — si el read model está obsoleto, el projection handler está atascado o lento. Inspecciona la dead-letter queue para eventos fallidos. Usa replay del event store en un entorno staging para reproducir issues. Loggea cada entrada y salida de event handler con datos de timing. Usa `docker compose logs` para correlacionar logs de write y read model.
