---


contentType: docs
slug: rabbitmq-queue-design-template
templateType: guideline
title: "RabbitMQ Queue Design Template"
description: "Template for documenting RabbitMQ queue, exchange, and binding design: exchange types, queue properties, binding rules, dead letter handling, TTL policies, and capacity planning with code examples."
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

This template documents RabbitMQ queue, exchange, and binding design for a service. It covers exchange type selection, queue properties, binding rules, dead letter configuration, TTL policies, and capacity planning. Use this template when designing new messaging infrastructure or reviewing existing queue topologies.

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

# Declare exchange with durability and persistence
channel.exchange_declare(
    exchange='prod.orders.order-created.direct',
    exchange_type='direct',
    durable=True,          # survive broker restart
    auto_delete=False,     # don't delete when queues disconnect
    internal=False,        # accept publishes from clients
)
```

---

## 2. Queue Design

### 2.1 Queue Properties

```text
Property          | Recommended | Description
──────────────────┼─────────────┼──────────────────────────────────
durable           | True        # Survive broker restart
auto_delete       | False       # Don't delete when consumers disconnect
exclusive         | False       # Allow multiple consumers
max_length        | Set per Q   # Prevent unbounded growth
message_ttl       | Set per Q   # Expire stale messages
dead_letter_exchange| Set per Q # Route failed messages to DLX
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
# Standard queue with DLX and TTL
args = {
    'x-message-ttl': 86400000,           # 24 hours in ms
    'x-dead-letter-exchange': 'prod.orders.dlx.direct',
    'x-dead-letter-routing-key': 'order-payment-failed',
    'x-max-priority': 10,                # Priority support
    'x-max-length': 50000,               # Max messages in queue
    'x-overflow': 'reject-publish',      # Reject new messages when full
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
    routing_key='',  # ignored for fanout
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
# Declare dead letter exchange
channel.exchange_declare(
    exchange='prod.orders.dlx.direct',
    exchange_type='direct',
    durable=True,
)

# Declare dead letter queue
dlq_args = {
    'x-message-ttl': 604800000,  # 7 days retention
}

channel.queue_declare(
    queue='prod.orders.dlq.failed-messages',
    durable=True,
    arguments=dlq_args,
)

# Bind DLQ to DLX
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
Message TTL expired  | x-message-ttl on queue       | Message moves to DLX
Queue length exceeded| x-max-length on queue        | Oldest message to DLX
Consumer rejection   | basic_reject(requeue=False)  | Message moves to DLX
Consumer nack        | basic_nack(requeue=False)    | Message moves to DLX
```

---

## 5. Consumer Configuration

### 5.1 QoS (Quality of Service)

```python
# Set prefetch count — limit unacknowledged messages
channel.basic_qos(
    prefetch_count=10,       # Process 10 messages at a time
    prefetch_global=False,   # Per-consumer, not per-channel
)

# Start consuming with manual acknowledgment
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
            # Reject and requeue for retry (limited retries)
            if properties.headers.get('x-retry-count', 0) < 3:
                channel.basic_reject(
                    delivery_tag=method.delivery_tag,
                    requeue=True,
                )
            else:
                # Send to DLX after max retries
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
Queue memory      | 2 GB per queue     # Enable x-max-length or TTL
Total queues      | 100 per node       # Split across nodes
File descriptors  | 10,000 per node    # Monitor with rabbitmqctl
Disk space        | 50% free minimum   # RabbitMQ disk alarm at 50%
Erlang processes  | 1M per node        # Monitor via management API
```

## FAQ

### When should I use a direct vs topic exchange?

Use a direct exchange when routing keys are known and exact (e.g., `order.payment.required`). Use a topic exchange when you need pattern-based routing (e.g., `payment.*.completed` matches multiple routing keys). Direct exchanges are faster due to simpler routing logic. Topic exchanges are more flexible but have slightly higher overhead. Start with direct and switch to topic only if you need wildcard routing.

### How do I handle poison messages in RabbitMQ?

Configure a dead letter exchange on the queue. When a consumer rejects a message with `requeue=False`, RabbitMQ routes it to the DLX. Set up a DLQ to store failed messages for inspection. Implement a retry counter in message headers — reject with `requeue=True` for retries under the limit, and `requeue=False` after max retries. Monitor DLQ depth and alert when messages accumulate.

### What prefetch count should I use?

Start with 10 for most workloads. Lower values (1-5) for slow, CPU-intensive processing to ensure fair distribution among consumers. Higher values (50-100) for fast, I/O-bound processing to maximize throughput. Too high a prefetch can cause one consumer to hoard messages while others are idle. Monitor consumer lag and adjust accordingly. Use `prefetch_global=False` for per-consumer limits.

### How do I ensure messages survive broker restarts?

Declare exchanges and queues with `durable=True`. Publish messages with `delivery_mode=2` (persistent). Use `confirmation mode` on the channel to ensure the broker has accepted the message. Be aware that persistent messages have higher latency due to disk writes. For truly critical messages, consider publishing with `mandatory=True` and handle `basic.return` for unroutable messages.

### Should I use RabbitMQ or Kafka for my use case?

Use RabbitMQ for point-to-point communication, request-reply patterns, work queues with complex routing, and when you need per-message acknowledgment. Use Kafka for event streaming, high-throughput log aggregation, replay of historical events, and when consumers need to read at their own pace. RabbitMQ is better for transactional messaging; Kafka is better for event sourcing and analytics pipelines.

## See Also

- [Complete Guide to RabbitMQ Architecture](/guides/complete-guide-rabbitmq-architecture/)
- [Message Queues — RabbitMQ, Kafka, and SQS detailed analysis](/guides/message-queue-guide/)
- [Event Streaming with Apache Kafka and Node.js](/recipes/kafka-event-streaming/)
- [Message Processing Idempotency](/recipes/message-idempotency/)
- [Task Queues and RPC with RabbitMQ and AMQP](/recipes/rabbitmq-task-queue/)

