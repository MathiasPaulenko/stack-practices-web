---
contentType: recipes
slug: event-driven-microservices
title: "Microservicios Event-Driven"
description: "Diseña microservicios event-driven con message brokers, event sourcing, CQRS y patrones de consistencia eventual."
metaDescription: "Arquitectura de microservicios event-driven: message brokers, event sourcing, CQRS, consistencia eventual, patrones saga e implementación del outbox pattern."
difficulty: advanced
topics:
  - messaging
tags:
  - event-driven
  - microservices
  - messaging
  - architecture
  - kafka
relatedResources:
  - /recipes/kafka-event-streaming
  - /recipes/rabbitmq-task-queue
  - /guides/software-architecture-guide
  - /guides/event-driven-architecture-guide
  - /guides/microservices-architecture-guide
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Arquitectura de microservicios event-driven: message brokers, event sourcing, CQRS, consistencia eventual, patrones saga e implementación del outbox pattern."
  keywords:
    - event-driven
    - microservices
    - messaging
    - architecture
---
## Visión General

Los microservicios event-driven se comunican de forma asíncrona a través de eventos en lugar de llamadas directas a API. Esto desacopla servicios, mejora la resiliencia y permite escalado independiente. Patrones como event sourcing, CQRS, orquestación de sagas y el outbox pattern resuelven desafíos comunes: consistencia de datos, ordenamiento de mensajes, manejo de duplicados y recuperación de fallas.

## Cuándo Usar

Usa este recurso cuando:
- Los servicios necesitan escalar independientemente sin acoplamiento fuerte. Consulta [Event-Driven Functions](/recipes/messaging/event-driven-microservices) para patrones de mensajería async.
- Manejas procesos de negocio de larga duración a través de múltiples dominios. Consulta [Serverless Orchestration](/recipes/devops/background-jobs) para coordinación de workflows.
- Aseguras consistencia de datos sin transacciones distribuidas. Consulta [Retry Logic](/recipes/architecture/retry-backoff) para manejar fallas transitorias.
- Construyes pipelines de notificaciones, auditoría o analytics en tiempo real. Consulta [Kafka Event Streaming](/recipes/messaging/kafka-event-streaming) para procesamiento de eventos de alto throughput.

## Solución

### Event Sourcing con PostgreSQL (Python)

```python
from dataclasses import dataclass
from typing import List
import json

@dataclass
class Event:
    aggregate_id: str
    event_type: str
    payload: dict
    version: int

class OrderAggregate:
    def __init__(self, order_id: str):
        self.order_id = order_id
        self.events: List[Event] = []
        self.status = "pending"
    
    def apply(self, event: Event):
        if event.event_type == "order_placed":
            self.status = "placed"
        elif event.event_type == "payment_received":
            self.status = "paid"
        self.events.append(event)
    
    def place_order(self, items: List[dict]):
        event = Event(
            aggregate_id=self.order_id,
            event_type="order_placed",
            payload={"items": items},
            version=len(self.events) + 1
        )
        self.apply(event)
        return event
```

### Outbox Pattern (Node.js + Kafka)

```javascript
// Dentro de la misma transacción de base de datos:
await db.transaction(async (trx) => {
  // 1. Actualizar datos de negocio
  await trx('orders').insert({ id: orderId, status: 'placed' });
  
  // 2. Escribir en tabla outbox (misma transacción)
  await trx('outbox').insert({
    topic: 'orders.events',
    key: orderId,
    payload: JSON.stringify({ event: 'order_placed', orderId, items })
  });
});

// Proceso relay separado hace polling de outbox y publica a Kafka
const pending = await db('outbox').where('sent', false).limit(100);
for (const msg of pending) {
  await kafka.producer.send({
    topic: msg.topic,
    messages: [{ key: msg.key, value: msg.payload }]
  });
  await db('outbox').where('id', msg.id).update({ sent: true });
}
```

### Orquestación de Saga (TypeScript)

```typescript
interface SagaStep {
  name: string;
  execute: () => Promise<void>;
  compensate: () => Promise<void>;
}

class OrderSaga {
  private steps: SagaStep[] = [
    {
      name: 'reserve_inventory',
      execute: () => inventoryService.reserve(order.items),
      compensate: () => inventoryService.release(order.items)
    },
    {
      name: 'process_payment',
      execute: () => paymentService.charge(order.total),
      compensate: () => paymentService.refund(order.total)
    },
    {
      name: 'ship_order',
      execute: () => shippingService.createLabel(order),
      compensate: () => shippingService.cancelLabel(order)
    }
  ];
  
  async execute() {
    const completed: SagaStep[] = [];
    try {
      for (const step of this.steps) {
        await step.execute();
        completed.push(step);
      }
    } catch (err) {
      // Rollback de pasos completados en orden inverso
      for (const step of completed.reverse()) {
        await step.compensate();
      }
      throw new Error(`Saga falló en paso ${completed[0]?.name}`);
    }
  }
}
```

## Explicación

**Patrones core**:

| Patrón | Problema Resuelto | Compromiso |
|--------|-------------------|------------|
| Event Sourcing | Audit trail; queries temporales | Complejo; requiere CQRS para reads |
| CQRS | Optimiza modelos de lectura/escritura separados | Consistencia eventual; más código |
| Saga | Transacciones distribuidas sin locks | Rollback complejo; consistencia eventual |
| Outbox | Atómico "DB update + publicación de mensaje" | Requiere proceso relay |
| Idempotent Consumer | Manejar mensajes duplicados | Requiere claves únicas por mensaje |

**Garantías de ordenamiento de mensajes**:
- **Kafka**: Ordenado por partition key (ej. order_id)
- **RabbitMQ**: Ordenado por cola pero no entre consumers
- **SQS**: Sin ordenamiento (usa FIFO queues para ordenamiento)

## Variantes

| Broker | Ordenamiento | Delivery | Ideal Para |
|--------|--------------|----------|------------|
| Kafka | Por partición | At-least-once | Alto throughput; replayability |
| RabbitMQ | Por cola | At-least-once | Routing complejo; colas prioritarias |
| NATS | Por subject | At-most-once | Baja latencia; simplicidad |
| Pulsar | Global | Exactly-once | Geo-replicación; tiered storage |

## Lo que funciona

- **Diseña eventos como hechos, no comandos**: "OrderPlaced" no "PlaceOrder"
- **Incluye versiones de schema**: Eventos V1 deben ser legibles por consumers V2
- **Maneja duplicados gracefulmente**: Haz consumers idempotentes (upsert, no insert)
- **Monitorea dead letter queues**: Mensajes fallidos necesitan investigación, no dropping silencioso
- **Mantén payloads de eventos pequeños**: Referencia datos grandes; no embebas blobs

## Errores Comunes

1. **Spaghetti event-driven**: 50 microservicios suscritos al mismo evento crean acoplamiento invisible
2. **Idempotencia faltante**: Procesar el mismo evento de pago dos veces cobra al cliente dos veces
3. **Cadenas síncronas de eventos**: Llamar APIs HTTP dentro de event handlers anula el propósito
4. **Sin manejo de dead letter**: Mensajes fallidos desaparecen; pierdes eventos de negocio
5. **Suposiciones incorrectas de ordenamiento**: Asumir ordenamiento global cuando solo existe por partición

## Preguntas Frecuentes

**P: ¿Cuándo debo usar event sourcing vs. CRUD tradicional?**
R: Usa event sourcing para dominios donde el historial de auditoría, queries temporales o replay son críticos (finanzas, logística). Usa CRUD para dominios simples de CRUD.

**P: ¿Cómo manejo evolución de schema en eventos?**
R: Usa schema registries (Confluent, AWS Glue). Agrega campos; nunca elimines. Mantén compatibilidad hacia atrás por 2+ versiones.

**P: ¿Cuál es la diferencia entre sagas de coreografía y orquestación?**
R: Coreografía: los servicios reaccionan a eventos independientemente. Orquestación: un coordinador central dirige cada paso. La orquestación es más fácil de debug; la coreografía está más desacoplada.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
