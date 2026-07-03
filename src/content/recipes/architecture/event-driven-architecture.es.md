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
  - patterns
  - scalability
relatedResources:
  - /recipes/microservices-patterns
  - /recipes/cqrs-pattern-recipe
  - /recipes/serverless-functions
  - /recipes/async-patterns
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
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

La arquitectura event-driven invierte esta relación. Los servicios se comunican publicando eventos a un message broker en lugar de llamarse directamente. Un evento "OrderPlaced" se publica una vez. El servicio de inventario se suscribe y decrementa stock. El servicio de billing se suscribe y crea una factura. El servicio de shipping se suscribe y prepara una etiqueta. Cada servicio opera independientemente — si billing es lento, las órdenes y el shipping continúan sin afectarse. Esta receta cubre patrones de eventos, selección de brokers e implementación con Kafka, RabbitMQ y AWS EventBridge.

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

## Explicación

- **Evento vs command**: un evento establece que algo sucedió (`OrderPlaced`). Es inmutable y broadcast. Un command instruye una acción (`PlaceOrder`). Es dirigido a un handler específico. No los mezcles — un servicio que recibe un command no debería publicarlo como evento sin transformación.
- **Patrones de message broker**: publish-subscribe (pub/sub) broadcast a todos los suscriptores. Point-to-point envía a un consumidor. Competing consumers escalan point-to-point agregando workers. Elige basado en si todos los servicios necesitan el evento o solo uno.
- **Ordenamiento de eventos**: los brokers no garantizan ordenamiento global. Si `OrderPlaced` y `OrderCancelled` llegan fuera de secuencia, el sistema de inventario puede intentar cancelar stock que nunca fue reservado. Usa ordenamiento scoped por aggregate (mismo order ID siempre enruta a la misma partición) o handlers idempotentes.

## Variantes

| Broker | Patrón | Durabilidad | Ordenamiento | Escala | Mejor para |
|--------|--------|------------|--------------|--------|------------|
| Kafka | Pub/sub, streams | Alta | Por partición | Masiva | Event sourcing, streaming |
| RabbitMQ | Pub/sub, colas | Media | Por cola | Media | Enrutamiento complejo, AMQP |
| NATS | Pub/sub | Baja | Ninguno | Muy alta | Baja latencia, simple |
| AWS SNS/SQS | Pub/sub, colas | Alta | Ninguno | Alta | Cloud-native, serverless |

## Lo que funciona

- **Diseña eventos, no mensajes**: un evento debería describir qué sucedió, no qué debería hacer el consumidor. `OrderPlaced` es correcto. `DecrementInventory` es un command disfrazado de evento. Los eventos son hechos; los commands son instrucciones.
- **Usa validación de esquemas**: eventos sin validar son fuente de bugs sutiles. Usa Avro, JSON Schema o Protobuf para definir contratos de eventos. Valida en los boundaries de publisher y consumer. Versiona esquemas y mantén compatibilidad hacia atrás.
- **Haz consumidores idempotentes**: retries de red y redeliveries de brokers significan que el mismo evento puede procesarse múltiples veces. Consulta [Endpoints Idempotentes](/recipes/api/idempotent-api-endpoints) para patrones de deduplicación. Diseña handlers para que procesar el mismo evento dos veces produzca el mismo estado. Usa `UPSERT` o trackea IDs de eventos procesados en una tabla de deduplicación.

## Errores comunes

- **Coreografía sin visibilidad**: un request que se dispara a 5 eventos, cada uno triggerando 3 más, crea un workflow invisible. Cuando falla, debuggear requiere chequear 15 servicios. Agrega correlation IDs y distributed tracing para seguir la cadena.
- **Procesamiento síncrono de eventos**: un consumer que procesa eventos síncronamente dentro de un HTTP request reintroduce el acoplamiento que el event bus estaba destinado a eliminar. Los eventos deberían procesarse asíncronamente, desacoplados del request orientado al usuario.
- **Sin manejo de error para mensajes envenenados**: un evento malformado que crashea al consumer será redelivered indefinidamente, bloqueando la cola. Implementa un máximo de reintentos y un handler de poison pill.

## Preguntas frecuentes

**P: ¿Debería usar Kafka o RabbitMQ?**
R: Kafka para event streaming de alto throughput, event sourcing y replay. RabbitMQ para enrutamiento complejo, patrones request-reply y compatibilidad AMQP. Kafka escala horizontalmente mejor; RabbitMQ es más fácil de operar a pequeña escala.

**P: ¿Cómo manejo ordenamiento de eventos entre servicios?**
R: No puedes garantizar ordenamiento global entre servicios. Asegura ordenamiento dentro de un aggregate (ej. todos los eventos para `order-123` van a la misma partición). Usa [sagas](/recipes/saga-pattern-recipe) para compensar cuando las asunciones de ordenamiento cross-service se violan.

**P: ¿Puedo hacer queries directamente desde Kafka?**
R: Puedes leer un stream, pero Kafka no es un query engine. Para queries, materializa eventos en una base de datos (read model) vía Kafka Streams o ksqlDB. Consulta la base de datos, no el broker.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
