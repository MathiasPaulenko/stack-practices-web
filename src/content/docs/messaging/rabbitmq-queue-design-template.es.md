---


contentType: docs
slug: rabbitmq-queue-design-template
templateType: guideline
title: "Plantilla de Diseno de Colas RabbitMQ"
description: "Plantilla para documentar diseno de colas, exchanges y bindings de RabbitMQ: exchange types, queue properties, binding rules, dead letter handling, TTL policies y capacity planning con ejemplos de codigo."
metaDescription: "RabbitMQ queue design template: exchange types, queue properties, binding rules, DLX, TTL, capacity planning, QoS, and code examples for producers and consumers."
difficulty: intermediate
topics:
  - messaging
tags:
  - rabbitmq
  - queue-design
  - messaging
  - amqp
  - exchanges
  - dead-letter
relatedResources:
  - /docs/kafka-topic-naming-convention-template
  - /docs/message-schema-evolution-policy
  - /docs/dead-letter-queue-runbook
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "RabbitMQ queue design template: exchange types, queue properties, binding rules, DLX, TTL, capacity planning, QoS, and code examples for producers and consumers."
  keywords:
    - rabbitmq queue design
    - amqp exchange types
    - rabbitmq bindings
    - dead letter exchange
    - rabbitmq ttl
    - queue capacity planning
    - rabbitmq qos


---

## Overview

Esta plantilla documenta el diseno de colas, exchanges y bindings de RabbitMQ para un service. Cubre exchange type selection, queue properties, binding rules, dead letter configuration, TTL policies y capacity planning. Usa esta plantilla cuando designes new messaging infrastructure o reviewees existing queue topologies.

---

## 1. Exchange Design

### 1.1 Exchange Type Selection

```text
Exchange type | Use case                           | Routing key
──────────────┼────────────────────────────────────┼──────────────────
direct        | Point-to-point, exact match        | Exact string match
topic         | Pattern-based routing              | Wildcard match (* and #)
fanout        | Broadcast to all queues            | Ignored
headers       | Route by message headers           | Header key-value match
```

### 1.2 Exchange Naming Convention

```text
<environment>.<domain>.<purpose>.<exchange-type>

Examples:
  prod.orders.order-created.direct
  prod.notifications.broadcast.fanout
  prod.payments.payment-events.topic
  staging.users.user-updates.topic
```

### 1.3 Exchange Declaration

```python
import pika

connection = pika.BlockingConnection(
    pika.ConnectionParameters(
        host='rabbitmq-prod',
        port=5672,
        credentials=pika.PlainCredentials('producer', 'password'),
        heartbeat=30,
        blocked_connection_timeout=300,
    )
)
channel = connection.channel()

# Declara exchange con durability y persistence
channel.exchange_declare(
    exchange='prod.orders.order-created.direct',
    exchange_type='direct',
    durable=True,          # survive broker restart
    auto_delete=False,     # no delete cuando queues disconnect
    internal=False,        # accept publishes de clients
)
```

---

## 2. Queue Design

### 2.1 Queue Properties

```text
Property          | Recommended | Description
──────────────────┼─────────────┼──────────────────────────────────
durable           | True        # Survive broker restart
auto_delete       | False       # No delete cuando consumers disconnect
exclusive         | False       # Allow multiple consumers
max_length        | Set per Q   # Previene unbounded growth
message_ttl       | Set per Q   # Expire stale messages
dead_letter_exchange| Set per Q # Routea failed messages a DLX
```

### 2.2 Queue Naming Convention

```text
<environment>.<domain>.<consumer-service>.<purpose>

Examples:
  prod.orders.payment-service.process-payment
  prod.notifications.email-service.send-email
  prod.payments.audit-service.log-transaction
  staging.users.analytics-service.track-signup
```

### 2.3 Queue Declaration

```python
# Standard queue con DLX y TTL
args = {
    'x-message-ttl': 86400000,           # 24 hours in ms
    'x-dead-letter-exchange': 'prod.orders.dlx.direct',
    'x-dead-letter-routing-key': 'order-payment-failed',
    'x-max-priority': 10,                # Priority support
    'x-max-length': 50000,               # Max messages en queue
    'x-overflow': 'reject-publish',      # Reject new messages cuando full
}

channel.queue_declare(
    queue='prod.orders.payment-service.process-payment',
    durable=True,
    arguments=args,
)
```

---

## 3. Binding Design

### 3.1 Binding Rules

```python
# Direct exchange — exact routing key match
channel.queue_bind(
    exchange='prod.orders.order-created.direct',
    queue='prod.orders.payment-service.process-payment',
    routing_key='order.payment.required',
)

# Topic exchange — wildcard routing key match
channel.queue_bind(
    exchange='prod.payments.payment-events.topic',
    queue='prod.payments.audit-service.log-transaction',
    routing_key='payment.*.completed',  # matches payment.usd.completed, payment.eur.completed
)

# Fanout exchange — routing key ignored
channel.queue_bind(
    exchange='prod.notifications.broadcast.fanout',
    queue='prod.notifications.email-service.send-email',
    routing_key='',  # ignored para fanout
)
```

### 3.2 Binding Patterns for Topic Exchanges

```text
Pattern              | Matches
─────────────────────┼──────────────────────────────────────────
order.*.created      | order.usd.created, order.eur.created
order.#              # order.created, order.usd.created, order.usd.created.v2
#.error              | any.error, payment.error, orders.error
*.*.completed        | order.usd.completed, payment.eur.completed
```

---

## 4. Dead Letter Configuration

### 4.1 Dead Letter Exchange (DLX)

```python
# Declara dead letter exchange
channel.exchange_declare(
    exchange='prod.orders.dlx.direct',
    exchange_type='direct',
    durable=True,
)

# Declara dead letter queue
dlq_args = {
    'x-message-ttl': 604800000,  # 7 days retention
}

channel.queue_declare(
    queue='prod.orders.dlq.failed-messages',
    durable=True,
    arguments=dlq_args,
)

# Bindea DLQ a DLX
channel.queue_bind(
    exchange='prod.orders.dlx.direct',
    queue='prod.orders.dlq.failed-messages',
    routing_key='order-payment-failed',
)
```

### 4.2 Dead Letter Triggers

```text
Trigger              | Configuration                | Behavior
─────────────────────┼──────────────────────────────┼──────────────────────
Message TTL expired  | x-message-ttl on queue       | Message moves a DLX
Queue length exceeded| x-max-length on queue        | Oldest message a DLX
Consumer rejection   | basic_reject(requeue=False)  | Message moves a DLX
Consumer nack        | basic_nack(requeue=False)    | Message moves a DLX
```

---

## 5. Consumer Configuration

### 5.1 QoS (Quality of Service)

```python
# Setea prefetch count — limita unacknowledged messages
channel.basic_qos(
    prefetch_count=10,       # Processea 10 messages a la vez
    prefetch_global=False,   # Per-consumer, no per-channel
)

# Empieza consuming con manual acknowledgment
channel.basic_consume(
    queue='prod.orders.payment-service.process-payment',
    on_message_callback=process_message,
    auto_ack=False,          # Manual acknowledgment required
)
```

### 5.2 Message Processing

```python
def process_message(channel, method, properties, body):
    try:
        message = json.loads(body)
        result = handle_payment(message)

        if result.success:
            # Acknowledge successful processing
            channel.basic_ack(delivery_tag=method.delivery_tag)
        else:
            # Reject y requeue para retry (limited retries)
            if properties.headers.get('x-retry-count', 0) < 3:
                channel.basic_reject(
                    delivery_tag=method.delivery_tag,
                    requeue=True,
                )
            else:
                # Send a DLX despues de max retries
                channel.basic_reject(
                    delivery_tag=method.delivery_tag,
                    requeue=False,
                )
    except Exception as e:
        logger.error(f"Failed to process message: {e}")
        channel.basic_reject(
            delivery_tag=method.delivery_tag,
            requeue=False,
        )
```

---

## 6. Capacity Planning

### 6.1 Sizing Worksheet

```text
Metric                    | Value        | Notes
──────────────────────────┼──────────────┼──────────────────────
Expected msg/s (peak)     | 500          | Peak throughput
Avg message size          | 2 KB         | Payload size
Max queue depth           | 10,000       # Max messages before backpressure
Consumer count            | 5            # Parallel consumers
Consumer throughput (msg/s)| 150         # Per consumer
Total consumer throughput | 750          # 5 x 150
Headroom                  | 50%          # 750 vs 500 peak = 50% headroom
Memory per message        | 2.5 KB       # Message + RabbitMQ overhead
Max queue memory          | 25 MB        # 10,000 x 2.5 KB
```

### 6.2 Resource Limits

```text
Resource          | Limit              | Action when exceeded
──────────────────┼────────────────────┼──────────────────────────────
Queue memory      | 2 GB per queue     # Enable x-max-length o TTL
Total queues      | 100 per node       # Split across nodes
File descriptors  | 10,000 per node    # Monitora con rabbitmqctl
Disk space        | 50% free minimum   # RabbitMQ disk alarm at 50%
Erlang processes  | 1M per node        # Monitora via management API
```

## Preguntas Frecuentes

### ¿Cuando deberia usar direct vs topic exchange?

Usa direct exchange cuando routing keys son known y exact (e.g., `order.payment.required`). Usa topic exchange cuando necesitas pattern-based routing (e.g., `payment.*.completed` matchea multiple routing keys). Direct exchanges son faster debido a simpler routing logic. Topic exchanges son mas flexible pero tienen slightly higher overhead. Empieza con direct y switchea a topic solo si necesitas wildcard routing.

### ¿Cómo handleo poison messages en RabbitMQ?

Configura un dead letter exchange en la queue. Cuando un consumer rejectea un message con `requeue=False`, RabbitMQ lo routea al DLX. Setea un DLQ para storear failed messages para inspection. Implementa un retry counter en message headers — rejectea con `requeue=True` para retries bajo el limit, y `requeue=False` despues de max retries. Monitora DLQ depth y alerta cuando messages accumulate.

### ¿Qué prefetch count deberia usar?

Empieza con 10 para most workloads. Lower values (1-5) para slow, CPU-intensive processing para ensure fair distribution among consumers. Higher values (50-100) para fast, I/O-bound processing para maximize throughput. Too high prefetch puede causar que un consumer hoardee messages mientras otros estan idle. Monitora consumer lag y adjusta accordingly. Usa `prefetch_global=False` para per-consumer limits.

### ¿Cómo aseguro que messages survivean broker restarts?

Declara exchanges y queues con `durable=True`. Publica messages con `delivery_mode=2` (persistent). Usa `confirmation mode` en el channel para ensure que el broker ha accepted el message. Se aware que persistent messages tienen higher latency debido a disk writes. Para truly critical messages, considera publicar con `mandatory=True` y handlea `basic.return` para unroutable messages.

### ¿Deberia usar RabbitMQ o Kafka para mi use case?

Usa RabbitMQ para point-to-point communication, request-reply patterns, work queues con complex routing y cuando necesitas per-message acknowledgment. Usa Kafka para event streaming, high-throughput log aggregation, replay de historical events y cuando consumers necesitan read a su own pace. RabbitMQ es mejor para transactional messaging; Kafka es mejor para event sourcing y analytics pipelines.

## See Also

- [Complete Guide to RabbitMQ Architecture](/es/guides/complete-guide-rabbitmq-architecture/)
- [Message Queues — RabbitMQ, Kafka, and SQS detailed analysis](/es/guides/message-queue-guide/)
- [Event Streaming with Apache Kafka and Node.js](/es/recipes/kafka-event-streaming/)
- [Message Processing Idempotency](/es/recipes/message-idempotency/)
- [Task Queues and RPC with RabbitMQ and AMQP](/es/recipes/rabbitmq-task-queue/)

