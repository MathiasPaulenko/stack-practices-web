---
contentType: guides
slug: complete-guide-event-driven-systems
title: "Guía Completa de Sistemas Event-Driven"
description: "Disenar y operar backends event-driven. Cubre event sourcing, CQRS, sagas, outbox pattern, idempotency, eventual consistency y patrones de produccion para arquitecturas event-driven confiables."
metaDescription: "Disenar backends event-driven. Cubre event sourcing, CQRS, sagas, outbox pattern, idempotency, eventual consistency y patrones de produccion."
difficulty: advanced
topics:
  - messaging
  - architecture
  - infrastructure
tags:
  - event-driven
  - messaging
  - guia
  - event-sourcing
  - cqrs
  - sagas
  - outbox-pattern
  - eventual-consistency
relatedResources:
  - /guides/messaging/complete-guide-kafka-production
  - /guides/messaging/complete-guide-rabbitmq-architecture
  - /patterns/design/circuit-breaker-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Disenar backends event-driven. Cubre event sourcing, CQRS, sagas, outbox pattern, idempotency, eventual consistency y patrones de produccion."
  keywords:
    - arquitectura event driven
    - event sourcing
    - cqrs
    - saga pattern
    - outbox pattern
    - idempotency
    - eventual consistency
    - event driven produccion
---

## Introducción

La arquitectura event-driven (EDA) desacopla servicios comunicandose a traves de eventos en lugar de llamadas directas. Los producers emiten eventos cuando el estado cambia. Los consumers reaccionan a eventos asincronicamente. Esto habilita loose coupling, escalado independiente, y extensibilidad. Tambien introduce desafios: eventual consistency, complejidad de debugging, garantias de orden, e idempotency. Esta guia cubre los patrones y practicas para construir sistemas event-driven confiables en produccion.

## Conceptos Clave

### Events vs Commands vs Queries

```text
Command: "CreateOrder" → Intent, enviado a un handler especifico, espera response
Event:   "OrderCreated" → Hecho, broadcast a cualquiera interesado, no espera response
Query:   "GetOrder"     → Request de datos, sincrono, espera response
```

- **Command**: Expresa intent. Enviado a un handler. Puede ser rechazado.
- **Event**: Expresa un hecho que ocurrio. Broadcast a multiples consumers. No puede ser rechazado.
- **Query**: Pide datos. Sincrono. Retorna un response.

### Estructura de Event

```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "event_type": "OrderCreated",
  "aggregate_id": "order-123",
  "aggregate_type": "Order",
  "timestamp": "2026-07-04T12:00:00.000Z",
  "version": 1,
  "metadata": {
    "correlation_id": "req-abc-123",
    "causation_id": "cmd-create-order-456",
    "user_id": "user-789",
    "source": "api-gateway"
  },
  "data": {
    "order_id": "order-123",
    "customer_id": "cust-456",
    "items": [
      {"product_id": "prod-1", "quantity": 2, "price": 29.99}
    ],
    "total": 59.98,
    "currency": "USD"
  }
}
```

## Event Sourcing

Event sourcing almacena eventos como la fuente de verdad en lugar de estado mutable. Cada cambio de estado es un evento appended. El estado actual se deriva replayando eventos.

### Event Store Basico

```python
import json
from datetime import datetime
from uuid import uuid4

class EventStore:
    def __init__(self, db):
        self.db = db
    
    def append(self, aggregate_id, event_type, data, metadata=None):
        event = {
            "event_id": str(uuid4()),
            "event_type": event_type,
            "aggregate_id": aggregate_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "data": data,
            "metadata": metadata or {}
        }
        self.db.events.insert_one(event)
        return event
    
    def get_events(self, aggregate_id, from_version=0):
        cursor = self.db.events.find(
            {"aggregate_id": aggregate_id},
            sort=[("timestamp", 1)]
        )
        return list(cursor)[from_version:]
```

### Replaying Eventos para Construir Estado

```python
class OrderAggregate:
    def __init__(self):
        self.id = None
        self.status = "new"
        self.items = []
        self.total = 0
        self.version = 0
    
    def apply(self, event):
        if event["event_type"] == "OrderCreated":
            self.id = event["data"]["order_id"]
            self.items = event["data"]["items"]
            self.total = event["data"]["total"]
            self.status = "created"
        
        elif event["event_type"] == "OrderPaid":
            self.status = "paid"
        
        elif event["event_type"] == "OrderShipped":
            self.status = "shipped"
        
        elif event["event_type"] == "OrderCancelled":
            self.status = "cancelled"
        
        self.version += 1
    
    @classmethod
    def from_events(cls, events):
        order = cls()
        for event in events:
            order.apply(event)
        return order

# Reconstruir estado del order desde eventos
events = event_store.get_events("order-123")
order = OrderAggregate.from_events(events)
print(f"Order {order.id}: status={order.status}, total={order.total}")
```

### Command Handler con Event Sourcing

```python
class OrderCommandHandler:
    def __init__(self, event_store):
        self.event_store = event_store
    
    def handle_create_order(self, command):
        # Checkear si el order ya existe (idempotency)
        existing = self.event_store.get_events(command["order_id"])
        if existing:
            return {"status": "already_exists"}
        
        # Validar command
        if not command.get("items"):
            raise ValueError("Order must have items")
        
        # Append event
        self.event_store.append(
            aggregate_id=command["order_id"],
            event_type="OrderCreated",
            data={
                "order_id": command["order_id"],
                "customer_id": command["customer_id"],
                "items": command["items"],
                "total": sum(i["price"] * i["quantity"] for i in command["items"])
            },
            metadata={"correlation_id": command.get("correlation_id")}
        )
    
    def handle_pay_order(self, command):
        events = self.event_store.get_events(command["order_id"])
        order = OrderAggregate.from_events(events)
        
        if order.status != "created":
            raise ValueError(f"Cannot pay order in status: {order.status}")
        
        self.event_store.append(
            aggregate_id=command["order_id"],
            event_type="OrderPaid",
            data={"order_id": command["order_id"], "payment_method": command["method"]},
            metadata={"correlation_id": command.get("correlation_id")}
        )
```

## CQRS (Command Query Responsibility Segregation)

CQRS separa write models (commands) de read models (queries). Los commands modifican estado. Las queries leen de proyecciones optimizadas.

```text
Write Side:                    Read Side:
Command → CommandHandler       Query → ReadModel
              ↓                      ↑
         EventStore → Event → Projector → ReadDatabase
```

### Projection Builder

```python
class OrderProjection:
    def __init__(self, db):
        self.db = db
    
    def handle(self, event):
        if event["event_type"] == "OrderCreated":
            self.db.order_summary.insert_one({
                "order_id": event["data"]["order_id"],
                "customer_id": event["data"]["customer_id"],
                "total": event["data"]["total"],
                "status": "created",
                "item_count": len(event["data"]["items"]),
                "created_at": event["timestamp"]
            })
        
        elif event["event_type"] == "OrderPaid":
            self.db.order_summary.update_one(
                {"order_id": event["data"]["order_id"]},
                {"$set": {"status": "paid", "paid_at": event["timestamp"]}}
            )
        
        elif event["event_type"] == "OrderShipped":
            self.db.order_summary.update_one(
                {"order_id": event["data"]["order_id"]},
                {"$set": {"status": "shipped", "shipped_at": event["timestamp"]}}
            )
        
        elif event["event_type"] == "OrderCancelled":
            self.db.order_summary.update_one(
                {"order_id": event["data"]["order_id"]},
                {"$set": {"status": "cancelled", "cancelled_at": event["timestamp"]}}
            )

# Projection consume eventos del event store
def build_projections(event_store, projections):
    last_processed = get_last_processed_position()
    
    for event in event_store.get_all_events(from_position=last_processed):
        for projection in projections:
            projection.handle(event)
        save_processed_position(event["event_id"])
```

### Read Model Queries

```python
# Read model optimizado: obtener order summary por customer
def get_customer_orders(customer_id, limit=20):
    return db.order_summary.find(
        {"customer_id": customer_id},
        sort=[("created_at", -1)],
        limit=limit
    )

# Read model optimizado: obtener revenue por rango de fechas
def get_revenue_by_date(start_date, end_date):
    return db.order_summary.aggregate([
        {"$match": {
            "status": {"$in": ["paid", "shipped"]},
            "created_at": {"$gte": start_date, "$lt": end_date}
        }},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "revenue": {"$sum": "$total"},
            "order_count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ])
```

## Saga Pattern

Las sagas coordinan transacciones de negocio multi-step across servicios. Cada step tiene una compensating action para rollback.

### Saga Basada en Choreography

Sin coordinador central. Cada servicio reacciona a eventos y emite nuevos eventos.

```text
Step 1: Order Service → OrderCreated event
Step 2: Payment Service reacciona → PaymentProcessed event (o PaymentFailed)
Step 3: Inventory Service reacciona → InventoryReserved event (o InventoryFailed)
Step 4: Shipping Service reacciona → OrderShipped event

Si cualquier step falla, compensating events deshacen steps previos:
PaymentFailed → Order Service cancela order → Inventory Service libera reservation
```

```python
# Order Service
def handle_create_order(command):
    order = create_order(command)
    event_store.append("OrderCreated", {"order_id": order.id, "total": order.total})
    publish_event("OrderCreated", {"order_id": order.id, "total": order.total})

# Payment Service
def on_order_created(event):
    try:
        result = process_payment(event["data"]["order_id"], event["data"]["total"])
        publish_event("PaymentProcessed", {"order_id": event["data"]["order_id"], "payment_id": result.id})
    except PaymentError:
        publish_event("PaymentFailed", {"order_id": event["data"]["order_id"], "reason": "declined"})

# Order Service (compensating)
def on_payment_failed(event):
    cancel_order(event["data"]["order_id"])
    publish_event("OrderCancelled", {"order_id": event["data"]["order_id"], "reason": "payment_failed"})
```

### Saga Basada en Orchestration

Un orquestador central coordina los steps y maneja compensacion.

```python
class OrderSagaOrchestrator:
    def __init__(self, event_store, message_bus):
        self.event_store = event_store
        self.message_bus = message_bus
    
    def start_saga(self, order_id, total):
        saga_id = str(uuid4())
        self.event_store.append("SagaStarted", {
            "saga_id": saga_id,
            "order_id": order_id,
            "total": total,
            "status": "processing_payment"
        })
        # Enviar command al payment service
        self.message_bus.send("ProcessPayment", {
            "saga_id": saga_id,
            "order_id": order_id,
            "amount": total
        })
        return saga_id
    
    def on_payment_processed(self, event):
        saga = self.load_saga(event["data"]["saga_id"])
        if saga["status"] != "processing_payment":
            return  # Ya manejado o stale
        
        self.event_store.append("SagaStepCompleted", {
            "saga_id": saga["saga_id"],
            "step": "payment"
        })
        
        # Next step: reservar inventory
        self.message_bus.send("ReserveInventory", {
            "saga_id": saga["saga_id"],
            "order_id": saga["order_id"],
            "items": saga["items"]
        })
        self.update_saga_status(saga["saga_id"], "reserving_inventory")
    
    def on_payment_failed(self, event):
        saga = self.load_saga(event["data"]["saga_id"])
        # Compensar: cancelar order
        self.message_bus.send("CancelOrder", {"order_id": saga["order_id"]})
        self.update_saga_status(saga["saga_id"], "failed")
    
    def on_inventory_reserved(self, event):
        saga = self.load_saga(event["data"]["saga_id"])
        # Next step: ship order
        self.message_bus.send("ShipOrder", {
            "saga_id": saga["saga_id"],
            "order_id": saga["order_id"]
        })
        self.update_saga_status(saga["saga_id"], "shipping")
    
    def on_inventory_failed(self, event):
        saga = self.load_saga(event["data"]["saga_id"])
        # Compensar: refund payment
        self.message_bus.send("RefundPayment", {
            "saga_id": saga["saga_id"],
            "order_id": saga["order_id"]
        })
        self.update_saga_status(saga["saga_id"], "failed")
```

## Outbox Pattern

El outbox pattern asegura que los eventos se publiquen de forma confiable. En lugar de publicar eventos directamente (que puede fallar), los eventos se escriben en la misma transaccion de base de datos que los cambios de estado. Un proceso separado lee la tabla outbox y publica eventos.

```python
import psycopg2
from uuid import uuid4

def create_order_with_outbox(conn, order_data):
    cursor = conn.cursor()
    
    try:
        # Iniciar transaccion
        cursor.execute("BEGIN")
        
        # Insertar order
        cursor.execute(
            "INSERT INTO orders (id, customer_id, total, status) VALUES (%s, %s, %s, %s)",
            (order_data["id"], order_data["customer_id"], order_data["total"], "created")
        )
        
        # Insertar outbox event en la misma transaccion
        cursor.execute(
            """INSERT INTO outbox (event_id, aggregate_id, event_type, data, created_at, published)
               VALUES (%s, %s, %s, %s, NOW(), FALSE)""",
            (
                str(uuid4()),
                order_data["id"],
                "OrderCreated",
                json.dumps(order_data),
            )
        )
        
        cursor.execute("COMMIT")
    except Exception:
        cursor.execute("ROLLBACK")
        raise
    finally:
        cursor.close()
```

### Outbox Publisher

```python
import psycopg2
import json
import requests

def publish_outbox_events(conn):
    cursor = conn.cursor()
    
    # Fetche eventos no publicados, lockearlos para update
    cursor.execute("""
        SELECT event_id, aggregate_id, event_type, data 
        FROM outbox 
        WHERE published = FALSE 
        ORDER BY created_at 
        LIMIT 100 
        FOR UPDATE SKIP LOCKED
    """)
    
    events = cursor.fetchall()
    
    for event_id, aggregate_id, event_type, data in events:
        try:
            # Publicar a message broker
            publish_to_kafka(event_type, {
                "event_id": str(event_id),
                "aggregate_id": aggregate_id,
                "event_type": event_type,
                "data": json.loads(data)
            })
            
            # Marcar como publicado
            cursor.execute(
                "UPDATE outbox SET published = TRUE, published_at = NOW() WHERE event_id = %s",
                (event_id,)
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Failed to publish event {event_id}: {e}")
            continue
    
    cursor.close()
```

## Idempotency

En sistemas event-driven, los eventos pueden entregarse mas de una vez. Los consumers deben manejar duplicados gracefully.

### Consumer Idempotent con Deduplication

```python
import redis

r = redis.Redis(host="redis", port=6379)

def process_event_idempotent(event):
    event_id = event["event_id"]
    
    # Checkear si ya fue procesado (operacion atomica)
    if not r.setnx(f"processed:{event_id}", "1"):
        # Ya procesado, skip
        return {"status": "duplicate"}
    
    # Setear TTL en el dedup key (e.g., 24 horas)
    r.expire(f"processed:{event_id}", 86400)
    
    try:
        # Procesar el event
        result = handle_event(event)
        return {"status": "processed", "result": result}
    except Exception as e:
        # Remover el key para que el event pueda ser retried
        r.delete(f"processed:{event_id}")
        raise
```

### Consumer Idempotent con Database State Check

```python
def process_payment_event(event):
    order_id = event["data"]["order_id"]
    
    # Checkear estado actual en database
    order = db.orders.find_one({"id": order_id})
    if order and order.get("status") in ["paid", "shipped"]:
        # Ya procesado, skip
        return {"status": "already_paid"}
    
    # Procesar payment
    db.orders.update_one(
        {"id": order_id, "status": "created"},  # Conditional update
        {"$set": {"status": "paid", "paid_at": event["timestamp"]}}
    )
    
    return {"status": "processed"}
```

## Eventual Consistency

Los sistemas event-driven son eventualmente consistentes. El estado se propaga asincronicamente. Esto tiene implicaciones para UX e integridad de datos.

### Manejar Expectativas del Usuario

```python
# Problema: Usuario crea order, pero read model no esta actualizado aun
# Solucion: Usar CQRS con read sincrono despues de write, o aceptar eventual consistency

# Opcion 1: Esperar que la projection catch up
def create_order_and_wait(command):
    order_id = command_handler.handle(command)
    
    # Poll read model hasta que el order aparezca (con timeout)
    for _ in range(10):
        order = read_model.get_order(order_id)
        if order:
            return order
        time.sleep(0.1)
    
    # Fallback: retornar order del write model
    return write_model.get_order(order_id)

# Opcion 2: Aceptar eventual consistency, informar al usuario
def create_order(command):
    order_id = command_handler.handle(command)
    return {
        "order_id": order_id,
        "status": "processing",
        "message": "Your order is being processed. Refresh in a moment."
    }
```

## Error Handling y Dead Letter Queues

```python
def consume_events_with_dlq(consumer, processor, dlq_producer, max_retries=3):
    for message in consumer:
        event = json.loads(message.value)
        retry_count = event.get("metadata", {}).get("retry_count", 0)
        
        try:
            processor.process(event)
            consumer.commit()
        except Exception as e:
            if retry_count < max_retries:
                # Incrementar retry count y requeue
                event["metadata"]["retry_count"] = retry_count + 1
                event["metadata"]["last_error"] = str(e)
                event["metadata"]["last_retry_at"] = datetime.utcnow().isoformat()
                
                # Enviar a retry topic con delay
                dlq_producer.send("retry-topic", value=json.dumps(event))
                consumer.commit()  # Ack mensaje original
            else:
                # Enviar a dead letter topic para investigacion manual
                event["metadata"]["final_error"] = str(e)
                event["metadata"]["failed_at"] = datetime.utcnow().isoformat()
                dlq_producer.send("dead-letter-topic", value=json.dumps(event))
                consumer.commit()  # Ack para prevenir infinite loop
                logger.error(f"Event {event['event_id']} sent to DLQ after {max_retries} retries")
```

## Monitoreo de Sistemas Event-Driven

### Metricas Clave

| Metrica | Descripcion | Threshold de Alerta |
|---------|-------------|---------------------|
| Event lag | Tiempo entre creacion y procesamiento del event | > 60 segundos |
| Event throughput | Eventos procesados por segundo | Baseline + 100% |
| Error rate | Porcentaje de procesamiento de eventos fallido | > 5% |
| DLQ depth | Mensajes en dead letter queue | > 0 |
| Projection lag | Eventos no yet projected a read model | > 10,000 |
| Saga timeout | Sagas atascadas en estado processing | > 30 minutos |

### Distributed Tracing con Correlation IDs

```python
import json
from uuid import uuid4

class EventProcessor:
    def __init__(self, tracer):
        self.tracer = tracer
    
    def process(self, event):
        correlation_id = event.get("metadata", {}).get("correlation_id", str(uuid4()))
        causation_id = event.get("metadata", {}).get("causation_id")
        
        with self.tracer.start_span("process_event", correlation_id=correlation_id) as span:
            span.set_tag("event_type", event["event_type"])
            span.set_tag("aggregate_id", event["aggregate_id"])
            span.set_tag("causation_id", causation_id)
            
            try:
                result = self.handle(event)
                
                # Propagar correlation ID a eventos downstream
                if isinstance(result, dict) and "event_type" in result:
                    result["metadata"] = result.get("metadata", {})
                    result["metadata"]["correlation_id"] = correlation_id
                    result["metadata"]["causation_id"] = event["event_id"]
                
                return result
            except Exception as e:
                span.record_exception(e)
                raise
```

## Checklist de Producción

- [ ] Eventos tienen IDs unicos y timestamps
- [ ] Correlation IDs propagados across todos los eventos
- [ ] Consumers son idempotent
- [ ] Outbox pattern para publicacion confiable de eventos
- [ ] Dead letter queue para eventos fallidos
- [ ] Retry con exponential backoff y max attempts
- [ ] Event schema versioning para backward compatibility
- [ ] Projections pueden ser rebuilt desde event store
- [ ] Monitoreo de event lag, error rate, y DLQ depth
- [ ] Distributed tracing con correlation IDs
- [ ] Logica de compensacion de saga testeada
- [ ] Backup y retention policy del event store
- [ ] Schema registry para validacion de eventos

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre event sourcing y event-driven architecture?

Event-driven architecture es un patron de comunicacion donde los servicios se comunican via eventos. Event sourcing es un patron de almacenamiento de datos donde los eventos son la fuente de verdad. Puedes usar event-driven architecture sin event sourcing (almacenar estado mutable, publicar eventos en cambios). Puedes usar event sourcing sin event-driven architecture (replay eventos para construir estado, sin comunicacion inter-servicios).

### ¿Cómo manejo la evolucion de schema en eventos?

Usa versioning de schema. Incluye un campo `schema_version` en cada event. Usa un schema registry (como Confluent Schema Registry) para validar y evolucionar schemas. Los consumers deberian manejar multiples versiones de schema. Usa cambios de schema backward-compatible (agregar campos opcionales, no remover campos).

### ¿Qué es el outbox pattern y por qué lo necesito?

El outbox pattern escribe eventos a una tabla de base de datos (outbox) en la misma transaccion que los cambios de estado. Un proceso separado lee el outbox y publica eventos a un message broker. Esto asegura que los eventos nunca se pierdan, incluso si el broker esta temporalmente unavailable. Sin el outbox, arriesgas estado inconsistente entre tu database y el message broker.

### ¿Cómo debuggeo sistemas event-driven?

Usa correlation IDs para tracear el flow de eventos across servicios. Implementa distributed tracing (OpenTelemetry, Jaeger). Loggea cada event recibido y producido con su correlation ID. Construye una tool para replay eventos desde el event store para debugging. Monitorea event lag y DLQ depth para detectar issues temprano.

### ¿Debería usar choreography u orchestration para sagas?

Usa choreography para sagas simples con 2-3 steps. Es mas simple de implementar y no tiene single point of failure. Usa orchestration para sagas complejas con muchos steps, logica condicional, o cuando necesitas monitoreo centralizado y error handling. Orchestration es mas facil de debuggear pero anade un coordinador central que debe ser highly available.

### ¿Cómo manejo el orden de eventos?

Dentro de un solo aggregate, los eventos deben estar ordenados. Usa el aggregate ID como partition key en Kafka para garantizar orden dentro de una particion. Para orden cross-aggregate, usa una saga u orquestador. No dependas de orden global across todos los eventos — es caro y usualmente innecesario.
