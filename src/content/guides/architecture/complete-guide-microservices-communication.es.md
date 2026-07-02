---
contentType: guides
slug: complete-guide-microservices-communication
title: "Guía Completa de Comunicación entre Microservicios"
description: "Compara patrones de comunicación síncrona vs asíncrona para microservicios. Cubre REST, gRPC, colas de mensajes, event-driven, service mesh y cuándo usar cada uno."
metaDescription: "Guía completa de comunicación entre microservicios. Compara REST, gRPC, colas de mensajes, patrones event-driven y service mesh para sync vs async."
difficulty: intermediate
topics:
  - architecture
  - messaging
  - api
tags:
  - microservices
  - communication
  - rest
  - grpc
  - message-queue
  - event-driven
  - service-mesh
  - guide
relatedResources:
  - /guides/architecture/microservices-architecture-guide
  - /guides/architecture/event-driven-architecture-guide
  - /guides/architecture/grpc-microservices-guide
  - /patterns/architecture/pipes-and-filters-pattern
  - /patterns/design/circuit-breaker-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Guía completa de comunicación entre microservicios. Compara REST, gRPC, colas de mensajes, patrones event-driven y service mesh para sync vs async."
  keywords:
    - microservices communication
    - sync vs async microservices
    - rest vs grpc
    - event-driven architecture
    - message queue microservices
    - service mesh
    - microservices patterns
---

# Guía Completa de Comunicación entre Microservicios

## Introducción

Los microservicios deben comunicarse para entregar funcionalidad de negocio. La elección del patrón de comunicación afecta directamente latencia, confiabilidad, escalabilidad y acoplamiento. Esta guía cubre patrones síncronos (REST, gRPC), patrones asíncronos (colas de mensajes, event-driven), y patrones de infraestructura (service mesh, API gateway), con ejemplos de código prácticos y criterios de decisión.

## Síncrono vs Asíncrono

| Aspecto | Síncrono | Asíncrono |
|--------|-------------|--------------|
| Acoplamiento | Estrecho (caller conoce callee) | Loose (caller no conoce callee) |
| Latencia | Caller espera respuesta | Caller continúa inmediatamente |
| Fallo | Caller falla si callee está down | El mensaje persiste, callee procesa después |
| Escalabilidad | Limitada por el servicio más lento | Mejor — servicios escalan independientemente |
| Complejidad | Más simple de implementar | Requiere broker, idempotency, ordering |
| Caso de Uso | Read-heavy, baja latencia | Write-heavy, workflows desacoplados |

## Patrones Síncronos

### REST (HTTP/JSON)

```python
from fastapi import FastAPI, HTTPException
import httpx

app = FastAPI()

ORDER_SERVICE = "http://order-service:8000"
PAYMENT_SERVICE = "http://payment-service:8000"

@app.get("/orders/{order_id}/summary")
async def order_summary(order_id: str):
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            order = await client.get(f"{ORDER_SERVICE}/orders/{order_id}")
            order.raise_for_status()
            payment = await client.get(f"{PAYMENT_SERVICE}/payments/{order_id}")
            payment.raise_for_status()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Upstream error: {e}")

    return {
        "order": order.json(),
        "payment": payment.json(),
    }
```

**Cuándo usar REST**:
- APIs públicas, integraciones externas
- Operaciones CRUD
- Payloads human-readable
- Endpoints para browser

### gRPC (HTTP/2 + Protobuf)

```protobuf
syntax = "proto3";

service OrderService {
  rpc GetOrder (OrderRequest) returns (OrderResponse);
  rpc CreateOrder (CreateOrderRequest) returns (OrderResponse);
}

message OrderRequest {
  string order_id = 1;
}

message OrderResponse {
  string order_id = 1;
  string status = 2;
  double total = 3;
}
```

```python
import grpc
import order_pb2
import order_pb2_grpc

def get_order(order_id: str) -> order_pb2.OrderResponse:
    with grpc.insecure_channel("order-service:50051") as channel:
        stub = order_pb2_grpc.OrderServiceStub(channel)
        return stub.GetOrder(order_pb2.OrderRequest(order_id=order_id))
```

**Cuándo usar gRPC**:
- Comunicación interna service-to-service
- Requisitos de high-throughput, baja latencia
- Strong typing across lenguajes
- Streaming (bi-directional, server-streaming)

## Patrones Asíncronos

### Cola de Mensajes (Point-to-Point)

```python
import pika
import json

connection = pika.BlockingConnection(pika.ConnectionParameters("rabbitmq"))
channel = connection.channel()
channel.queue_declare(queue="order_created", durable=True)

# Productor — Order service publica un mensaje
def publish_order_created(order_id: str, customer_id: str):
    message = json.dumps({"order_id": order_id, "customer_id": customer_id})
    channel.basic_publish(
        exchange="",
        routing_key="order_created",
        body=message,
        properties=pika.BasicProperties(delivery_mode=2),  # persistente
    )

# Consumidor — Shipping service procesa el mensaje
def consume_orders():
    def callback(ch, method, properties, body):
        order = json.loads(body)
        print(f"Shipping order {order['order_id']}")
        ch.basic_ack(delivery_tag=method.delivery_tag)

    channel.basic_consume(queue="order_created", on_message_callback=callback)
    channel.start_consuming()
```

### Event-Driven (Pub/Sub)

```javascript
const { Kafka } = require("kafkajs");

const kafka = new Kafka({
    clientId: "order-service",
    brokers: ["kafka:9092"],
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "inventory-group" });

// Productor — publica eventos de dominio
async function publishOrderCreated(order) {
    await producer.connect();
    await producer.send({
        topic: "order.created",
        messages: [
            {
                key: order.id,
                value: JSON.stringify({
                    orderId: order.id,
                    customerId: order.customerId,
                    items: order.items,
                    timestamp: Date.now(),
                }),
            },
        ],
    });
    await producer.disconnect();
}

// Consumidor — múltiples servicios se suscriben al mismo evento
async function consumeOrderEvents() {
    await consumer.connect();
    await consumer.subscribe({ topic: "order.created", fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const event = JSON.parse(message.value.toString());
            console.log(`Reserving inventory for order ${event.orderId}`);
            // Actualizar inventario, luego publicar evento inventory.reserved
        },
    });
}

consumeOrderEvents();
```

### Event-Driven con Outbox Pattern (Java)

```java
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;

@Service
public class OrderService {

    private final JdbcTemplate jdbc;

    public OrderService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    public void createOrder(Order order) {
        // 1. Guardar order
        jdbc.update(
            "INSERT INTO orders (id, customer_id, total) VALUES (?, ?, ?)",
            order.getId(), order.getCustomerId(), order.getTotal()
        );

        // 2. Guardar outbox event en la misma transacción
        jdbc.update(
            "INSERT INTO outbox (aggregate_id, event_type, payload) VALUES (?, ?, ?)",
            order.getId(), "OrderCreated", order.toJson()
        );
    }
}

// Proceso separado lee outbox y publica a Kafka
@Service
public class OutboxPublisher {

    private final JdbcTemplate jdbc;
    private final KafkaTemplate<String, String> kafka;

    public OutboxPublisher(JdbcTemplate jdbc, KafkaTemplate<String, String> kafka) {
        this.jdbc = jdbc;
        this.kafka = kafka;
    }

    @Scheduled(fixedDelay = 1000)
    public void publishPendingEvents() {
        var events = jdbc.queryForList(
            "SELECT id, aggregate_id, event_type, payload FROM outbox WHERE published = false LIMIT 100"
        );

        for (var event : events) {
            kafka.send("order." + event.get("event_type"),
                       (String) event.get("aggregate_id"),
                       (String) event.get("payload"));
            jdbc.update("UPDATE outbox SET published = true WHERE id = ?", event.get("id"));
        }
    }
}
```

## Patrones de Infraestructura

### API Gateway

```yaml
# Configuración de Kong o NGINX API Gateway
apiVersion: v1
kind: ConfigMap
metadata:
  name: gateway-routes
data:
  kong.yml: |
    routes:
      - name: order-service
        paths:
          - /orders
        service:
          name: order-service
          url: http://order-service:8000
      - name: payment-service
        paths:
          - /payments
        service:
          name: payment-service
          url: http://payment-service:8000
    plugins:
      - name: rate-limiting
        config:
          minute: 100
      - name: jwt
```

### Service Mesh (Istio)

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: order-service
spec:
  hosts:
    - order-service
  http:
    - route:
        - destination:
            host: order-service
            subset: v1
            port:
              number: 8000
          weight: 90
        - destination:
            host: order-service
            subset: v2
            port:
              number: 8000
          weight: 10
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: order-service
spec:
  host: order-service
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

## Framework de Decisión

| Necesidad | Patrón | Protocolo |
|------|---------|----------|
| API pública | REST | HTTP/JSON |
| Alto rendimiento interno | gRPC | HTTP/2 + Protobuf |
| Fire-and-forget | Cola de Mensajes | AMQP/Kafka |
| Múltiples consumidores | Pub/Sub | Kafka/NATS |
| Desacoplamiento cross-team | Event-Driven | Kafka + Outbox |
| Control de tráfico | API Gateway | HTTP + plugins |
| mTLS, retries, tracing | Service Mesh | Istio/Linkerd |
| Agregación de peticiones | GraphQL | HTTP/JSON + schema |

## Pautas

- **Preferir async para workflows write-heavy** — desacopla servicios, mejora resiliencia
- **Usar el Outbox pattern** — asegura que eventos se publiquen exactly once con la transacción de DB
- **Hacer consumidores idempotentes** — los mensajes pueden entregarse más de una vez
- **Setear timeouts en calls síncronas** — nunca dejar que un caller hanguee indefinidamente
- **Usar circuit breakers para calls síncronas** — fail fast cuando un servicio downstream está down
- **Versionar eventos** — los consumidores pueden no upgradearse simultáneamente
- **Usar dead-letter queues** — mensajes que fallan procesamiento van a DLQ para investigación
- **Monitorear latencia end-to-end** — pipelines async pueden acumular latencia across hops
- **Mantener eventos pequeños** — usar el Claim Check pattern para payloads grandes
- **Usar schema registry** — enforce compatibilidad de schema de eventos (Avro, Protobuf)

## Errores Comunes

- Usar REST para todo — acoplamiento estrecho, fallos en cascada
- No manejar mensajes duplicados — idempotency es obligatorio para consumidores async
- Encadenar calls síncronas profundamente — la latencia se acumula, la probabilidad de fallo sube
- No usar el Outbox pattern — dual-write a DB + broker no es atómico
- Ignorar ordering de mensajes — algunos eventos deben procesarse en orden (e.g., order created antes que order cancelled)
- No setear límites de concurrencia del consumidor — un consumidor lento puede exhaustar recursos
- Mezclar sync y async para la misma operación — elegir un patrón por workflow
- No monitorear queue depth — queues que crecen indican consumer lag

## Preguntas Frecuentes

### ¿Debo usar REST o gRPC para comunicación interna?

Usar gRPC para calls internas service-to-service donde el performance importa. Ofrece menor latencia, payloads más pequeños y strong typing. Usar REST para APIs públicas, endpoints para browser e integraciones donde la interoperabilidad HTTP/JSON es requerida.

### ¿Cuál es la diferencia entre una cola de mensajes y pub/sub?

En una cola de mensajes (point-to-point), cada mensaje es consumido por exactamente un consumidor. En pub/sub, cada mensaje es entregado a todos los suscriptores. Usar queues para distribución de tareas (e.g., procesamiento de órdenes). Usar pub/sub para eventos de dominio (e.g., order created — inventory, shipping y analytics necesitan saber).

### ¿Necesito un service mesh?

Un service mesh es útil cuando tienes muchos microservicios (10+) y necesitas mTLS consistente, traffic splitting, retries y observabilidad sin modificar código de aplicación. Para menos servicios, librerías como resilience4j o Polly pueden manejar retries y circuit breaking in-process.
