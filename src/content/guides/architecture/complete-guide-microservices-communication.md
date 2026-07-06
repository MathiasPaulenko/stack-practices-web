---
contentType: guides
slug: complete-guide-microservices-communication
title: "Complete Guide to Microservices Communication"
description: "Compare sync vs async communication patterns for microservices. Covers REST, gRPC, message queues, event-driven, service mesh, and when to use each."
metaDescription: "Complete guide to microservices communication. Compare REST, gRPC, message queues, event-driven patterns, and service mesh for sync vs async interactions."
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
  metaDescription: "Complete guide to microservices communication. Compare REST, gRPC, message queues, event-driven patterns, and service mesh for sync vs async interactions."
  keywords:
    - microservices communication
    - sync vs async microservices
    - rest vs grpc
    - event-driven architecture
    - message queue microservices
    - service mesh
    - microservices patterns
---

# Complete Guide to Microservices Communication

## Introduction

Microservices must communicate to deliver business functionality. The choice of communication pattern directly affects latency, reliability, scalability, and coupling. The following guide covers synchronous patterns (REST, gRPC), asynchronous patterns (message queues, event-driven), and infrastructure patterns (service mesh, API gateway), with practical code examples and decision criteria.

## Synchronous vs Asynchronous

| Aspect | Synchronous | Asynchronous |
|--------|-------------|--------------|
| Coupling | Tight (caller knows callee) | Loose (caller does not know callee) |
| Latency | Caller waits for response | Caller continues immediately |
| Failure | Caller fails if callee is down | Message persists, callee processes later |
| Scalability | Limited by slowest service | Better — services scale independently |
| Complexity | Simpler to implement | Requires broker, idempotency, ordering |
| Use Case | Read-heavy, low-latency | Write-heavy, decoupled workflows |

## Synchronous Patterns

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

**When to use REST**:
- Public APIs, external integrations
- CRUD operations
- Human-readable payloads
- Browser-facing endpoints

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

**When to use gRPC**:
- Internal service-to-service communication
- High-throughput, low-latency requirements
- Strong typing across languages
- Streaming (bi-directional, server-streaming)

## Asynchronous Patterns

### Message Queue (Point-to-Point)

```python
import pika
import json

connection = pika.BlockingConnection(pika.ConnectionParameters("rabbitmq"))
channel = connection.channel()
channel.queue_declare(queue="order_created", durable=True)

# Producer — Order service publishes a message
def publish_order_created(order_id: str, customer_id: str):
    message = json.dumps({"order_id": order_id, "customer_id": customer_id})
    channel.basic_publish(
        exchange="",
        routing_key="order_created",
        body=message,
        properties=pika.BasicProperties(delivery_mode=2),  # persistent
    )

# Consumer — Shipping service processes the message
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

// Producer — publish domain events
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

// Consumer — multiple services subscribe to the same event
async function consumeOrderEvents() {
    await consumer.connect();
    await consumer.subscribe({ topic: "order.created", fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const event = JSON.parse(message.value.toString());
            console.log(`Reserving inventory for order ${event.orderId}`);
            // Update inventory, then publish inventory.reserved event
        },
    });
}

consumeOrderEvents();
```

### Event-Driven with Outbox Pattern (Java)

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
        // 1. Save order
        jdbc.update(
            "INSERT INTO orders (id, customer_id, total) VALUES (?, ?, ?)",
            order.getId(), order.getCustomerId(), order.getTotal()
        );

        // 2. Save outbox event in the same transaction
        jdbc.update(
            "INSERT INTO outbox (aggregate_id, event_type, payload) VALUES (?, ?, ?)",
            order.getId(), "OrderCreated", order.toJson()
        );
    }
}

// Separate process reads outbox and publishes to Kafka
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

## Infrastructure Patterns

### API Gateway

```yaml
# Kong or NGINX API Gateway configuration
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

## Decision Framework

| Need | Pattern | Protocol |
|------|---------|----------|
| Public API | REST | HTTP/JSON |
| Internal high-perf | gRPC | HTTP/2 + Protobuf |
| Fire-and-forget | Message Queue | AMQP/Kafka |
| Multiple consumers | Pub/Sub | Kafka/NATS |
| Cross-team decoupling | Event-Driven | Kafka + Outbox |
| Traffic control | API Gateway | HTTP + plugins |
| mTLS, retries, tracing | Service Mesh | Istio/Linkerd |
| Request aggregation | GraphQL | HTTP/JSON + schema |

## Best Practices

- **Prefer async for write-heavy workflows** — decouples services, improves resilience
- **Use the Outbox pattern** — ensures events are published exactly once with the DB transaction
- **Make consumers idempotent** — messages may be delivered more than once
- **Set timeouts on sync calls** — never let a caller hang indefinitely
- **Use circuit breakers for sync calls** — fail fast when a downstream service is down
- **Version your events** — consumers may not all upgrade simultaneously
- **Use dead-letter queues** — messages that fail processing go to DLQ for investigation
- **Monitor end-to-end latency** — async pipelines can accumulate latency across hops
- **Keep events small** — use the Claim Check pattern for large payloads
- **Use schema registry** — enforce event schema compatibility (Avro, Protobuf)

## Common Mistakes

- Using REST for everything — tight coupling, cascading failures
- Not handling duplicate messages — idempotency is mandatory for async consumers
- Chaining synchronous calls deeply — latency compounds, failure probability rises
- Not using the Outbox pattern — dual-write to DB + broker is not atomic
- Ignoring message ordering — some events must be processed in order (e.g., order created before order cancelled)
- Not setting consumer concurrency limits — a slow consumer can exhaust resources
- Mixing sync and async for the same operation — pick one pattern per workflow
- Not monitoring queue depth — growing queues indicate consumer lag

## Frequently Asked Questions

### Should I use REST or gRPC for internal communication?

Use gRPC for internal service-to-service calls where performance matters. It offers lower latency, smaller payloads, and strong typing. Use REST for public APIs, browser-facing endpoints, and integrations where HTTP/JSON interoperability is required.

### What is the difference between a message queue and pub/sub?

In a message queue (point-to-point), each message is consumed by exactly one consumer. In pub/sub, each message is delivered to all subscribers. Use queues for task distribution (e.g., order processing). Use pub/sub for domain events (e.g., order created — inventory, shipping, and analytics all need to know).

### Do I need a service mesh?

A service mesh is useful when you have many microservices (10+) and need consistent mTLS, traffic splitting, retries, and observability without modifying application code. For fewer services, libraries like resilience4j or Polly can handle retries and circuit breaking in-process.
