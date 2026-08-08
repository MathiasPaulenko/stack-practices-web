---

contentType: recipes
slug: event-driven-architecture
title: "Diseñar Sistemas Event-Driven con Event Buses y Brokers"
description: "Cómo construir sistemas débilmente acoplados usando eventos, event buses, message brokers y event sourcing para comunicación asíncrona que escala entre servicios."
metaDescription: "Aprende arquitectura event-driven con event buses y brokers. Construye sistemas débilmente acoplados usando eventos, message brokers y event sourcing para async."
difficulty: intermediate
topics:
  - architecture
tags:
  - architecture
  - event-driven
  - design
  - pattern
  - scalability
relatedResources:
  - /recipes/microservices-patterns
  - /recipes/cqrs-pattern-recipe
  - /recipes/serverless-functions
  - /recipes/async-patterns
  - /recipes/saga-pattern-recipe
lastUpdated: "2026-06-14"
publishedAt: "2026-06-14"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende arquitectura event-driven con event buses y brokers. Construye sistemas débilmente acoplados usando eventos, message brokers y event sourcing para async."
  keywords:
    - arquitectura event driven
    - message broker
    - event bus
    - kafka eventos
    - patron pub sub

---

## Visión general

Las llamadas síncronas servicio-a-servicio crean acoplamiento fuerte. El llamador debe conocer la ubicación del callee, esperar una respuesta, y manejar fallos directamente. Cuando el callee es lento o caído, el llamador sufre. A medida que los sistemas crecen, esta red de dependencias directas se convierte en un enredo donde cualquier cambio se propaga a través de múltiples servicios.

La arquitectura event-driven invierte esta relación. Los servicios se comunican publicando eventos a un message broker en lugar de llamarse directamente. Un evento "OrderPlaced" se publica una vez. El servicio de inventario se suscribe y decrementa stock. El servicio de billing se suscribe y crea una factura. El servicio de shipping se suscribe y prepara una etiqueta. Cada servicio opera independientemente — si billing es lento, las órdenes y el shipping continúan sin afectarse. El siguiente enfoque cubre patrones de eventos, selección de brokers e implementación con Kafka, RabbitMQ y AWS EventBridge.

## Cuándo usarlo

Usa esta receta cuando:

- Múltiples servicios deben reaccionar al mismo evento de negocio
- Las cargas de trabajo son irregulares y necesitan buffering para suavizar picos de tráfico
- Los servicios tienen diferentes requisitos de disponibilidad y no pueden bloquearse entre sí
- Construyendo audit trails donde cada cambio de estado debe ser registrado
- Implementando event sourcing para queries temporales y reconstrucción de estado. Consulta [CQRS Pattern](/patterns/design/cqrs-pattern) para separación de lectura/escritura.

## Solución

### Publicando Eventos (Python / Kafka)

```python
from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers=['kafka:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    acks='all',
    retries=3,
)

def place_order(order_data):
    order = save_order(order_data)
    event = {
        'type': 'OrderPlaced',
        'aggregate_id': order.id,
        'payload': {
            'customer_id': order.customer_id,
            'items': [item.to_dict() for item in order.items],
            'total': order.total(),
        },
        'occurred_at': order.created_at.isoformat(),
    }
    producer.send('orders', key=order.id.encode(), value=event)
    producer.flush()
    return order
```

### Consumiendo Eventos (Node.js / RabbitMQ)

```javascript
const amqp = require('amqplib');

async function startInventoryConsumer() {
  const connection = await amqp.connect('amqp://rabbitmq');
  const channel = await connection.createChannel();
  const queue = 'inventory_updates';

  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, 'orders', 'OrderPlaced');

  channel.consume(queue, async (msg) => {
    if (msg !== null) {
      const event = JSON.parse(msg.content.toString());
      try {
        await reserveInventory(event.payload.items);
        channel.ack(msg);
      } catch (error) {
        channel.nack(msg, false, false);
      }
    }
  });
}
```

### AWS EventBridge Event Bus (Terraform)

```hcl
resource "aws_cloudwatch_event_bus" "main" {
  name = "stackpractices-events"
}

resource "aws_cloudwatch_event_rule" "order_placed" {
  name        = "order-placed-rule"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    source      = ["order-service"]
    detail-type = ["OrderPlaced"]
  })
}

resource "aws_cloudwatch_event_target" "inventory_target" {
  rule           = aws_cloudwatch_event_rule.order_placed.name
  event_bus_name = aws_cloudwatch_event_bus.main.name
  arn            = aws_sqs_queue.inventory_queue.arn
}

resource "aws_cloudwatch_event_target" "billing_target" {
  rule           = aws_cloudwatch_event_rule.order_placed.name
  event_bus_name = aws_cloudwatch_event_bus.main.name
  arn            = aws_lambda_function.billing_processor.arn
}
```

## Explicación

- **Evento vs command**: un evento establece que algo sucedió (`OrderPlaced`). Es inmutable y broadcast. Un command instruye una acción (`PlaceOrder`). Es dirigido a un handler específico. No los mezcles — un servicio que recibe un command no debería publicarlo como evento sin transformación.
- **Patrones de message broker**: publish-subscribe (pub/sub) broadcast a todos los suscriptores. Point-to-point envía a un consumidor. Competing consumers escalan point-to-point agregando workers. Elige basado en si todos los servicios necesitan el evento o solo uno.
- **Ordenamiento de eventos**: los brokers no garantizan ordenamiento global. Si `OrderPlaced` y `OrderCancelled` llegan fuera de secuencia, el sistema de inventario puede intentar cancelar stock que nunca fue reservado. Usa ordenamiento scoped por aggregate (mismo order ID siempre enruta a la misma partición) o handlers idempotentes.
- **Dead-letter queues**: el procesamiento fallido de eventos no debe bloquear la cola. Después de N reintentos, envía el mensaje a una dead-letter queue para inspección manual. Monitorea la profundidad del DLQ como alerta crítica — DLQs crecientes indican problemas sistémicos.

## Variantes

| Broker | Patrón | Durabilidad | Ordenamiento | Escala | Mejor para |
|--------|--------|------------|--------------|--------|------------|
| Kafka | Pub/sub, streams | Alta | Por partición | Masiva | Event sourcing, streaming |
| RabbitMQ | Pub/sub, colas | Media | Por cola | Media | Enrutamiento complejo, AMQP |
| NATS | Pub/sub, request/reply | Baja | Ninguno | Muy alta | Baja latencia, simple |
| AWS SNS/SQS | Pub/sub, colas | Alta | Ninguno | Alta | Cloud-native, serverless |
| Redis Streams | Pub/sub | Media | Por stream | Media | Simple, Redis existente |

## Lo que funciona

- **Diseña eventos, no mensajes**: un evento debería describir qué sucedió, no qué debería hacer el consumidor. Consulta [Microservices Patterns](/guides/architecture/microservices-architecture-guide) para estrategias de comunicación entre servicios. `OrderPlaced` es correcto. `DecrementInventory` es un command disfrazado de evento. Los eventos son hechos; los commands son instrucciones.
- **Usa validación de esquemas**: eventos sin validar son fuente de bugs sutiles. Usa Avro, JSON Schema o Protobuf para definir contratos de eventos. Valida en los boundaries de publisher y consumer. Versiona esquemas y mantén compatibilidad hacia atrás.
- **Haz consumidores idempotentes**: retries de red y redeliveries de brokers significan que el mismo evento puede procesarse múltiples veces. Consulta [Endpoints Idempotentes](/recipes/api/idempotent-api-endpoints) para patrones de deduplicación. Diseña handlers para que procesar el mismo evento dos veces produzca el mismo estado. Usa `UPSERT` o trackea IDs de eventos procesados en una tabla de deduplicación.
- **Monitorea consumer lag**: lag es el número de mensajes no procesados en una partición. Lag alto indica que el consumidor es más lento que el productor. Alerta en umbrales de lag. Escala consumidores horizontalmente u optimiza el rendimiento del handler.
- **Publica eventos de dominio, no eventos de infraestructura**: `PaymentProcessed` es un evento de dominio con significado de negocio. `DatabaseRowInserted` es ruido de infraestructura. Los consumidores se preocupan por cambios de estado de negocio, no detalles de implementación.

## Errores comunes

- **Coreografía sin visibilidad**: un request que se dispara a 5 eventos, cada uno triggerando 3 más, crea un workflow invisible. Cuando falla, debuggear requiere chequear 15 servicios. Agrega correlation IDs y distributed tracing para seguir la cadena.
- **Procesamiento síncrono de eventos**: un consumer que procesa eventos síncronamente dentro de un HTTP request reintroduce el acoplamiento que el event bus estaba destinado a eliminar. Los eventos deberían procesarse asíncronamente, desacoplados del request orientado al usuario.
- **Sin manejo de error para mensajes envenenados**: un evento malformado que crashea al consumer será redelivered indefinidamente, bloqueando la cola. Implementa un máximo de reintentos y un handler de poison pill.
- **Almacenar estado en el broker**: usar el broker como base de datos (ej. hacer queries a Kafka para estado actual) es un anti-pattern. Los brokers son para transporte, no almacenamiento. Usa event sourcing o un read model para queries de estado.

## Preguntas frecuentes

**P: ¿Debería usar Kafka o RabbitMQ?**
R: Kafka para event streaming de alto throughput, event sourcing y replay. RabbitMQ para enrutamiento complejo, patrones request-reply y compatibilidad AMQP. Kafka escala horizontalmente mejor; RabbitMQ es más fácil de operar a pequeña escala.

**P: ¿Cómo manejo ordenamiento de eventos entre servicios?**
R: No puedes garantizar ordenamiento global entre servicios. Asegura ordenamiento dentro de un aggregate (ej. todos los eventos para `order-123` van a la misma partición). Usa [sagas](/recipes/saga-pattern-recipe) para compensar cuando las asunciones de ordenamiento cross-service se violan.

**P: ¿Cuál es la diferencia entre event-driven y message-driven?**
R: Event-driven: los servicios reaccionan a eventos a los que se suscriben. Message-driven: los servicios envían mensajes a colas específicas. Los términos se superponen, pero event-driven implica pub/sub y acoplamiento débil, mientras que message-driven incluye patrones point-to-point.

**P: ¿Puedo hacer queries directamente desde Kafka?**
R: Puedes leer un stream, pero Kafka no es un query engine. Para queries, materializa eventos en una base de datos (read model) vía Kafka Streams o ksqlDB. Consulta la base de datos, no el broker.

### Event Sourcing con Kafka Streams (Java)

```java
public class OrderEventStore {

    private final KafkaStreams streams;

    public OrderEventStore() {
        StreamsBuilder builder = new StreamsBuilder();

        // Event store: agregar eventos por order ID
        KStream<String, OrderEvent> eventStream = builder.stream(
            "orders",
            Consumed.with(Serdes.String(), new OrderEventSerde())
        );

        // Materializar estado actual desde historial de eventos
        KTable<String, OrderState> orderState = eventStream
            .groupByKey()
            .aggregate(
                OrderState::new,
                (key, event, state) -> state.apply(event),
                Materialized.as("order-state-store")
            );

        // Proyectar a un tópico de read model
        orderState.toStream().to("order-read-model",
            Produced.with(Serdes.String(), new OrderStateSerde()));

        streams = new KafkaStreams(builder.build(), getStreamsConfig());
    }

    public void start() {
        streams.start();
    }

    public OrderState getOrder(String orderId) {
        ReadOnlyKeyValueStore<String, OrderState> store =
            streams.store(StoreQueryParameters.fromNameAndType(
                "order-state-store",
                QueryableStoreTypes.keyValueStore()
            ));
        return store.get(orderId);
    }
}

// Aplicar eventos para reconstruir estado
class OrderState {
    private String status;
    private BigDecimal total;
    private List<String> items = new ArrayList<>();

    public OrderState apply(OrderEvent event) {
        switch (event.getType()) {
            case "OrderPlaced":
                this.status = "placed";
                this.total = event.getTotal();
                this.items = event.getItemIds();
                break;
            case "OrderPaid":
                this.status = "paid";
                break;
            case "OrderShipped":
                this.status = "shipped";
                break;
            case "OrderCancelled":
                this.status = "cancelled";
                break;
        }
        return this;
    }
}
```

### Schema Registry con Avro (Python)

```python
from confluent_kafka import Producer, SerializingProducer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer
from dataclasses import dataclass, asdict
import uuid

schema_registry_client = SchemaRegistryClient({
    'url': 'http://schema-registry:8081'
})

order_event_schema_str = """
{
  "type": "record",
  "name": "OrderEvent",
  "namespace": "com.stackpractices.events",
  "fields": [
    {"name": "event_id", "type": "string"},
    {"name": "event_type", "type": "string"},
    {"name": "aggregate_id", "type": "string"},
    {"name": "customer_id", "type": "string"},
    {"name": "total", "type": "double"},
    {"name": "items", "type": {"type": "array", "items": "string"}},
    {"name": "occurred_at", "type": "string"}
  ]
}
"""

avro_serializer = AvroSerializer(
    schema_registry_client,
    order_event_schema_str,
    lambda obj, ctx: asdict(obj)
)

@dataclass
class OrderEvent:
    event_id: str
    event_type: str
    aggregate_id: str
    customer_id: str
    total: float
    items: list
    occurred_at: str

producer = SerializingProducer({
    'bootstrap.servers': 'kafka:9092',
    'value.serializer': avro_serializer,
})

def publish_order_event(order):
    event = OrderEvent(
        event_id=str(uuid.uuid4()),
        event_type='OrderPlaced',
        aggregate_id=order.id,
        customer_id=order.customer_id,
        total=order.total(),
        items=[item.id for item in order.items],
        occurred_at=order.created_at.isoformat(),
    )
    producer.produce(
        topic='orders',
        key=order.id.encode(),
        value=event,
        on_delivery=delivery_report,
    )
    producer.flush()
```

### AWS EventBridge Consumer (TypeScript)

```typescript
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

const eventBridge = new EventBridgeClient({ region: 'us-east-1' });
const sqs = new SQSClient({ region: 'us-east-1' });

// Publicar a EventBridge
async function publishOrderEvent(order: Order): Promise<void> {
  const command = new PutEventsCommand({
    Entries: [{
      EventBusName: 'stackpractices-events',
      Source: 'order-service',
      DetailType: 'OrderPlaced',
      Detail: JSON.stringify({
        orderId: order.id,
        customerId: order.customerId,
        total: order.total,
        items: order.items,
      }),
    }],
  });
  await eventBridge.send(command);
}

// Consumir desde SQS (target de EventBridge)
async function processOrderEvents(): Promise<void> {
  const result = await sqs.send(new ReceiveMessageCommand({
    QueueUrl: process.env.INVENTORY_QUEUE_URL!,
    MaxNumberOfMessages: 10,
    WaitTimeSeconds: 20,
  }));

  for (const message of result.Messages || []) {
    try {
      const event = JSON.parse(message.Body!);
      const detail = JSON.parse(event.detail);

      await reserveInventory(detail.items);
      await sqs.send(new DeleteMessageCommand({
        QueueUrl: process.env.INVENTORY_QUEUE_URL!,
        ReceiptHandle: message.ReceiptHandle!,
      }));
    } catch (error) {
      // El mensaje será visible de nuevo después del visibility timeout
      // Después de max retries, pasa a DLQ
      console.error('Failed to process order event:', error);
    }
  }
}
```



