---
contentType: patterns
slug: publish-subscribe-pattern
title: "Patrón Publish-Subscribe"
description: "Difundir eventos a multiples suscriptores independientes. Los publicadores envian mensajes a un topico sin saber que suscriptores existen, habilitando acoplamiento ligero entre productores y consumidores."
metaDescription: "Difundir eventos a multiples suscriptores independientes via topico. Los publicadores envian sin conocer suscriptores, habilitando acoplamiento ligero."
difficulty: intermediate
topics:
  - messaging
  - architecture
tags:
  - publish-subscribe
  - patron
  - patron-diseno
  - event-driven
  - pub-sub
  - message-broker
  - decoupling
relatedResources:
  - /patterns/design/message-queue-load-leveling-pattern
  - /patterns/design/serverless-fanout-pattern
  - /patterns/design/dead-letter-channel-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Difundir eventos a multiples suscriptores independientes via topico. Los publicadores envian sin conocer suscriptores, habilitando acoplamiento ligero."
  keywords:
    - patron publish subscribe
    - pub sub event driven
    - difundir mensajes suscriptores
    - patron diseno
---

## Descripción General

En una cola punto-a-punto, cada mensaje es procesado por exactamente un consumidor. Pero muchos sistemas necesitan multiples reacciones independientes al mismo evento. Cuando se realiza un pedido, el servicio de inventario actualiza stock, el servicio de notificaciones envia email de confirmacion, y el servicio de analitica registra el evento. El patron Publish-Subscribe difunde un mensaje a todos los suscriptores de un topico, para que cada suscriptor reciba su propia copia y la procese independientemente.

## Cuándo Usar

- Multiples servicios necesitan reaccionar al mismo evento independientemente
- Quieres desacoplar al productor de los consumidores (el productor no sabe quien consume)
- Nuevos consumidores pueden agregarse sin modificar al productor
- Diferentes consumidores procesan el evento a diferentes velocidades o con diferente logica

## Solución

### Python (Redis Pub/Sub)

```python
import redis
import json
import threading

r = redis.Redis(host="localhost", port=6379)

# Publicador
def publish_order(order_id, total):
    event = {"type": "order.created", "order_id": order_id, "total": total}
    r.publish("order.events", json.dumps(event))
    print(f"Published: {event}")

# Suscriptor 1: Servicio de inventario
def inventory_subscriber():
    pubsub = r.pubsub()
    pubsub.subscribe("order.events")
    for message in pubsub.listen():
        if message["type"] == "message":
            event = json.loads(message["data"])
            if event["type"] == "order.created":
                print(f"[Inventory] Updating stock for order {event['order_id']}")

# Suscriptor 2: Servicio de notificaciones
def notification_subscriber():
    pubsub = r.pubsub()
    pubsub.subscribe("order.events")
    for message in pubsub.listen():
        if message["type"] == "message":
            event = json.loads(message["data"])
            if event["type"] == "order.created":
                print(f"[Notification] Sending confirmation for order {event['order_id']}")

# Iniciar suscriptores en threads
threading.Thread(target=inventory_subscriber, daemon=True).start()
threading.Thread(target=notification_subscriber, daemon=True).start()

# Publicar eventos
publish_order(1, 99.99)
publish_order(2, 49.99)
```

### JavaScript (RabbitMQ — fanout exchange)

```javascript
import amqp from "amqplib";

async function setup() {
  const conn = await amqp.connect("amqp://localhost");
  const channel = await conn.createChannel();

  // Fanout exchange difunde a todas las colas enlazadas
  await channel.assertExchange("order.events", "fanout", { durable: true });

  // Crear colas para cada suscriptor
  const { queue: inventoryQueue } = await channel.assertQueue("inventory", {
    durable: true,
  });
  const { queue: notificationQueue } = await channel.assertQueue("notification", {
    durable: true,
  });

  // Enlazar colas al fanout exchange
  await channel.bindQueue(inventoryQueue, "order.events", "");
  await channel.bindQueue(notificationQueue, "order.events", "");

  // Publicador
  async function publishOrder(orderId, total) {
    const event = JSON.stringify({ type: "order.created", orderId, total });
    channel.publish("order.events", "", Buffer.from(event), {
      persistent: true,
    });
    console.log(`Published: order ${orderId}`);
  }

  // Suscriptor 1: Inventario
  channel.consume(inventoryQueue, (msg) => {
    if (!msg) return;
    const event = JSON.parse(msg.content.toString());
    console.log(`[Inventory] Updating stock for order ${event.orderId}`);
    channel.ack(msg);
  });

  // Suscriptor 2: Notificaciones
  channel.consume(notificationQueue, (msg) => {
    if (!msg) return;
    const event = JSON.parse(msg.content.toString());
    console.log(`[Notification] Sending confirmation for order ${event.orderId}`);
    channel.ack(msg);
  });

  // Publicar eventos
  await publishOrder(1, 99.99);
  await publishOrder(2, 49.99);
}

setup();
```

### Java (Spring + Kafka topics)

```java
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import com.fasterxml.jackson.databind.ObjectMapper;

@Component
public class OrderEventPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OrderEventPublisher(KafkaTemplate<String, String> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    // Publicador
    public void publishOrder(Long orderId, double total) {
        try {
            String event = objectMapper.writeValueAsString(
                new OrderEvent("order.created", orderId, total)
            );
            kafkaTemplate.send("order-events", String.valueOf(orderId), event);
            System.out.println("Published: order " + orderId);
        } catch (Exception e) {
            throw new RuntimeException("Failed to publish", e);
        }
    }

    // Suscriptor 1: Inventario
    @KafkaListener(topics = "order-events", groupId = "inventory-service")
    public void handleInventory(String message) {
        OrderEvent event = parseEvent(message);
        if ("order.created".equals(event.getType())) {
            System.out.println("[Inventory] Updating stock for order " + event.getOrderId());
        }
    }

    // Suscriptor 2: Notificaciones
    @KafkaListener(topics = "order-events", groupId = "notification-service")
    public void handleNotification(String message) {
        OrderEvent event = parseEvent(message);
        if ("order.created".equals(event.getType())) {
            System.out.println("[Notification] Sending confirmation for order " + event.getOrderId());
        }
    }

    private OrderEvent parseEvent(String message) {
        try {
            return objectMapper.readValue(message, OrderEvent.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse event", e);
        }
    }
}
```

## Explicación

El publicador envia mensajes a un topico (o exchange) sin saber que suscriptores existen. El broker mantiene una lista de suscripciones para cada topico. Cuando llega un mensaje, el broker entrega una copia a cada suscriptor.

**Fanout exchange** (RabbitMQ): Difunde cada mensaje a todas las colas enlazadas al exchange. Cada cola obtiene su propia copia, y cada consumidor lee de su cola independientemente.

**Kafka consumer groups**: Kafka usa consumer groups para implementar pub/sub. Cada consumer group obtiene su propia copia de cada mensaje. Dentro de un grupo, las particiones se distribuyen entre consumidores para paralelismo.

**Redis Pub/Sub**: Fire-and-forget. Si un suscriptor no esta escuchando cuando se publica un mensaje, lo pierde. Usa Redis Streams en su lugar para durabilidad.

El beneficio clave es **acoplamiento ligero**: el publicador no sabe ni le importan los suscriptores. Agregar un nuevo suscriptor (ej. un servicio de analitica) no requiere cambios al publicador ni a otros suscriptores.

## Variantes

| Variante | Mecanismo | Caso de Uso | Compromiso |
|----------|-----------|-------------|------------|
| **Fanout Exchange** | RabbitMQ fanout | Todos los suscriptores reciben todos los mensajes | Sin filtrado a nivel broker |
| **Topic Exchange** | RabbitMQ topic con routing keys | Suscriptores filtran por patron | Ruteo mas complejo |
| **Kafka Consumer Groups** | Kafka topics + groups | Durable, particionado, reejecutable | Mas infraestructura |
| **SNS + SQS** | AWS SNS fanout a SQS queues | Administrado, durable por suscriptor | Solo AWS, costo por mensaje |
| **Redis Pub/Sub** | Redis channels | Simple, baja latencia | Sin durabilidad, mensajes perdidos si offline |

## Qué Funciona

- Usa colas durables para cada suscriptor para que los mensajes sobrevivan reinicios del broker
- Dale a cada suscriptor su propia cola (no compartida) para que procesen independientemente
- Usa consumer groups en Kafka para escalar dentro de un servicio suscriptor
- Incluye tipo de evento en el mensaje para que los suscriptores puedan filtrar eventos relevantes
- Haz suscriptores idempotentes — el mismo evento puede entregarse mas de una vez
- Monitorea el lag del suscriptor — un suscriptor lento puede acumular una cola grande
- Usa dead-letter queues por suscriptor para que un suscriptor fallido no afecte a otros

## Errores Comunes

- **Cola compartida para multiples suscriptores**: Todos los suscriptores compiten por mensajes en lugar de cada uno obtener una copia. Cada suscriptor necesita su propia cola.
- **Redis Pub/Sub para eventos criticos**: Los mensajes se pierden si un suscriptor esta offline. Usa Redis Streams o un broker durable para eventos que no deben perderse.
- **Suscriptores sincronos bloqueando al publicador**: Si el publicador espera acknowledgments de suscriptores, los suscriptores lentos bloquean al publicador. Usa entrega asincrona.
- **Sin filtrado por tipo de evento**: Los suscriptores procesan cada evento incluso si solo les importa un tipo. Usa topic exchanges o filtra en el consumidor.
- **Agregar suscriptores sin escalar el broker**: Mas suscriptores significa mas copias de mensajes. Asegura que el broker pueda manejar el throughput aumentado.
- **No manejar consumidores lentos**: Un suscriptor que no puede mantener el ritmo acumula mensajes. Establece max depth de cola y alertas.

## Preguntas Frecuentes

### ¿En qué se diferencia pub/sub de una cola de mensajes?

En una cola de mensajes, cada mensaje es consumido por exactamente un consumidor. En pub/sub, cada mensaje se entrega a todos los suscriptores. Las colas son para distribucion de trabajo; pub/sub es para difusion de eventos.

### ¿Debería usar Kafka o RabbitMQ para pub/sub?

Kafka si necesitas durabilidad, replay, alto throughput y procesamiento particionado. RabbitMQ si necesitas configuracion mas simple, menor latencia y ruteo flexible. Para soluciones cloud administradas, SNS+SQS (AWS) o Service Bus topics (Azure) son buenas opciones.

### ¿Los suscriptores pueden procesar eventos a diferentes velocidades?

Si. Cada suscriptor tiene su propia cola y procesa independientemente. Un suscriptor lento no afecta a otros. Monitorea la profundidad de cola por suscriptor para detectar lag.

### ¿Qué pasa si un suscriptor está caído?

Con colas durables, los mensajes se acumulan en la cola del suscriptor mientras esta offline. Cuando se reconecta, procesa el backlog. Con Redis Pub/Sub, los mensajes se pierden.

### ¿Cómo agrego un nuevo suscriptor?

Crea una nueva cola, enlazala al topico/exchange, y comienza a consumir. No se necesitan cambios al publicador ni a los suscriptores existentes. Este es el beneficio principal del patron.
