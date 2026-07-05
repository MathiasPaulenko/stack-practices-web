---
contentType: docs
slug: dead-letter-queue-runbook
templateType: runbook
title: "Runbook de Dead Letter Queue"
description: "Runbook para handlear y replayear dead letter queue messages en Kafka y RabbitMQ: DLQ setup, inspection procedures, root cause analysis, replay strategies, monitoring alerts y automation scripts para failed message recovery."
metaDescription: "Dead letter queue runbook: DLQ setup, message inspection, root cause analysis, replay strategies, monitoring, automation for Kafka and RabbitMQ."
difficulty: intermediate
topics:
  - messaging
tags:
  - dead-letter-queue
  - messaging
  - kafka
  - rabbitmq
  - runbook
  - error-handling
relatedResources:
  - /docs/messaging/kafka-topic-naming-convention-template
  - /docs/messaging/rabbitmq-queue-design-template
  - /docs/messaging/message-schema-evolution-policy
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Dead letter queue runbook: DLQ setup, message inspection, root cause analysis, replay strategies, monitoring, automation for Kafka and RabbitMQ."
  keywords:
    - dead letter queue
    - dlq runbook
    - kafka dlq
    - rabbitmq dlq
    - message replay
    - error handling
    - failed messages
---

## Overview

Este runbook cubre procedures para handlear y replayear dead letter queue (DLQ) messages en Kafka y RabbitMQ. DLQs capturean messages que consumers failearon de procesar — debido a deserialization errors, business logic failures o downstream service unavailability. Este documento cubre DLQ setup, inspection, root cause analysis, replay strategies, monitoring y automation.

---

## 1. DLQ Setup

### 1.1 RabbitMQ DLQ Configuration

```python
import pika

connection = pika.BlockingConnection(pika.ConnectionParameters('rabbitmq-prod'))
channel = connection.channel()

# Declara dead letter exchange
channel.exchange_declare(
    exchange='prod.orders.dlx.direct',
    exchange_type='direct',
    durable=True,
)

# Declara dead letter queue con 7-day retention
channel.queue_declare(
    queue='prod.orders.dlq.failed-messages',
    durable=True,
    arguments={
        'x-message-ttl': 604800000,  # 7 days
    },
)

# Bindea DLQ a DLX
channel.queue_bind(
    exchange='prod.orders.dlx.direct',
    queue='prod.orders.dlq.failed-messages',
    routing_key='order-processing-failed',
)

# Configura main queue para usar DLX
channel.queue_declare(
    queue='prod.orders.payment-service.process-payment',
    durable=True,
    arguments={
        'x-dead-letter-exchange': 'prod.orders.dlx.direct',
        'x-dead-letter-routing-key': 'order-processing-failed',
        'x-max-priority': 10,
    },
)
```

### 1.2 Kafka DLQ Topic Setup

```bash
# Crea DLQ topic
kafka-topics.sh --bootstrap-server kafka:9092 \
  --create \
  --topic prod.orders.order-created.dlq \
  --partitions 6 \
  --replication-factor 3 \
  --config retention.ms=604800000 \
  --config cleanup.policy=delete
```

### 1.3 Kafka Consumer DLQ Producer

```python
from confluent_kafka import Consumer, Producer, KafkaError
import json

consumer = Consumer({
    'bootstrap.servers': 'kafka:9092',
    'group.id': 'payment-service',
    'auto.offset.reset': 'earliest',
    'enable.auto.commit': False,
})

dlq_producer = Producer({'bootstrap.servers': 'kafka:9092'})
consumer.subscribe(['prod.orders.order-created.v1'])

MAX_RETRIES = 3

def process_with_dlq():
    while True:
        msg = consumer.poll(1.0)
        if msg is None:
            continue
        if msg.error():
            if msg.error().code() == KafkaError._PARTITION_EOF:
                continue
            logger.error(f"Consumer error: {msg.error()}")
            continue

        try:
            process_message(msg.value())
            consumer.commit(msg)
        except Exception as e:
            headers = dict(msg.headers() or [])
            retry_count = int(headers.get('retry-count', b'0')) + 1

            if retry_count <= MAX_RETRIES:
                # Retry — requeue con incremented retry count
                dlq_producer.produce(
                    topic='prod.orders.order-created.v1',
                    key=msg.key(),
                    value=msg.value(),
                    headers=[('retry-count', str(retry_count).encode())],
                )
            else:
                # Send a DLQ despues de max retries
                dlq_producer.produce(
                    topic='prod.orders.order-created.dlq',
                    key=msg.key(),
                    value=msg.value(),
                    headers=[
                        ('retry-count', str(retry_count).encode()),
                        ('error', str(e).encode()),
                        ('original-topic', msg.topic().encode()),
                        ('original-partition', str(msg.partition()).encode()),
                        ('original-offset', str(msg.offset()).encode()),
                        ('failed-at', datetime.utcnow().isoformat().encode()),
                    ],
                )
            consumer.commit(msg)
```

---

## 2. DLQ Inspection

### 2.1 RabbitMQ DLQ Inspection

```bash
# Checkea DLQ message count
rabbitmqctl list_queues name messages messages_ready messages_unacknowledged \
  | grep dlq

# Inspecta DLQ messages via management API
curl -u admin:password \
  http://rabbitmq-prod:15672/api/queues/%2F/prod.orders.dlq.failed-messages/get \
  -H "content-type: application/json" \
  --data '{"count": 5, "ackmode": "ack_requeue_true", "encoding": "auto"}'
```

### 2.2 Kafka DLQ Inspection

```bash
# Consume de DLQ para inspection (sin committing offsets)
kafka-console-consumer.sh --bootstrap-server kafka:9092 \
  --topic prod.orders.order-created.dlq \
  --from-beginning \
  --max-messages 10 \
  --property print.headers=true \
  --property print.partition=true \
  --property print.offset=true

# Cuenta messages en DLQ
kafka-run-class.sh kafka.tools.GetOffsetShell \
  --broker-list kafka:9092 \
  --topic prod.orders.order-created.dlq \
  --time -1
```

### 2.3 DLQ Message Analysis Script

```python
import json
from confluent_kafka import Consumer

consumer = Consumer({
    'bootstrap.servers': 'kafka:9092',
    'group.id': 'dlq-inspector',
    'auto.offset.reset': 'earliest',
    'enable.auto.commit': False,
})

consumer.subscribe(['prod.orders.order-created.dlq'])

error_categories = {}
total_messages = 0

while True:
    msg = consumer.poll(1.0)
    if msg is None():
        if total_messages > 0:
            break
        continue

    headers = dict(msg.headers() or [])
    error = headers.get('error', b'unknown').decode()
    original_topic = headers.get('original-topic', b'unknown').decode()

    # Categoriza errors
    if 'ConnectionError' in error:
        category = 'downstream_unavailable'
    elif 'JSONDecodeError' in error:
        category = 'deserialization_error'
    elif 'ValidationError' in error:
        category = 'schema_validation_error'
    elif 'TimeoutError' in error:
        category = 'timeout'
    else:
        category = 'business_logic_error'

    error_categories[category] = error_categories.get(category, 0) + 1
    total_messages += 1

print(f"Total DLQ messages: {total_messages}")
for category, count in sorted(error_categories.items(), key=lambda x: -x[1]):
    print(f"  {category}: {count} ({count * 100 / total_messages:.1f}%)")
```

---

## 3. Root Cause Analysis

### 3.1 Common DLQ Causes

```text
Cause                     | Frequency | Fix
──────────────────────────┼───────────┼──────────────────────────────────────
Downstream service down   | High      | Fix downstream, replay DLQ
Schema mismatch           | Medium    | Fix consumer deserialization, replay
Invalid message format    | Medium    | Fix producer, discard o transform
Business rule violation   | Low       | Fix data, replay o discard
Timeout                   | Medium    | Increase timeout, optimize handler
Deserialization error     | Medium    | Fix schema, deploy, replay
Null pointer / bug        | Low       | Fix code, deploy, replay
```

### 3.2 RCA Template

```text
Incident: <DLQ alert name>
Date: <YYYY-MM-DD HH:MM>
DLQ: <queue o topic name>
Message count: <N>
Error category: <category from analysis>

Root cause:
  <Describe que causo que los messages faileran>

Affected messages:
  - Count: <N>
  - Time range: <start> to <end>
  - Original topic/queue: <name>

Resolution:
  - [ ] Fix applied: <description>
  - [ ] Fix deployed: <version>
  - [ ] DLQ replayed: <yes/no>
  - [ ] DLQ cleared: <yes/no>
  - [ ] Monitoring confirmed: <yes/no>

Prevention:
  - <Que hacer para prevenir recurrence>
```

---

## 4. Replay Strategies

### 4.1 RabbitMQ Replay

```python
import pika

connection = pika.BlockingConnection(pika.ConnectionParameters('rabbitmq-prod'))
channel = connection.channel()

# Replayea messages de DLQ back a main exchange
def replay_dlq(source_queue, target_exchange, routing_key, batch_size=100):
    for _ in range(batch_size):
        method, properties, body = channel.basic_get(
            queue=source_queue,
            auto_ack=False,
        )
        if method is None:
            print("DLQ empty — replay complete")
            break

        # Clear dead-letter headers para prevenir loops
        if properties.headers:
            properties.headers.pop('x-death', None)
            properties.headers.pop('x-first-death-exchange', None)
            properties.headers.pop('x-first-death-queue', None)
            properties.headers.pop('x-first-death-reason', None)

        # Republisha a original exchange
        channel.basic_publish(
            exchange=target_exchange,
            routing_key=routing_key,
            body=body,
            properties=properties,
        )

        # Acknowledge el DLQ message
        channel.basic_ack(delivery_tag=method.delivery_tag)
        print(f"Replayed message {method.delivery_tag}")

replay_dlq(
    source_queue='prod.orders.dlq.failed-messages',
    target_exchange='prod.orders.order-created.direct',
    routing_key='order.payment.required',
)
```

### 4.2 Kafka Replay

```python
from confluent_kafka import Consumer, Producer
import json

consumer = Consumer({
    'bootstrap.servers': 'kafka:9092',
    'group.id': 'dlq-replayer',
    'auto.offset.reset': 'earliest',
    'enable.auto.commit': False,
})

producer = Producer({'bootstrap.servers': 'kafka:9092'})

consumer.subscribe(['prod.orders.order-created.dlq'])

def replay_dlq(target_topic, max_messages=None):
    count = 0
    while True:
        msg = consumer.poll(1.0)
        if msg is None():
            if count > 0:
                break
            continue
        if msg.error():
            continue

        # Extracta original message de DLQ
        headers = dict(msg.headers() or [])
        original_topic = headers.get('original-topic', msg.topic().encode()).decode()

        # Remove DLQ metadata headers
        clean_headers = [
            (k, v) for k, v in msg.headers()
            if k not in ('retry-count', 'error', 'original-topic',
                        'original-partition', 'original-offset', 'failed-at')
        ]

        # Reproducea a original topic
        producer.produce(
            topic=target_topic,
            key=msg.key(),
            value=msg.value(),
            headers=clean_headers,
        )
        consumer.commit(msg)
        count += 1

        if max_messages and count >= max_messages:
            break

    producer.flush()
    print(f"Replayed {count} messages to {target_topic}")

replay_dlq(target_topic='prod.orders.order-created.v1')
```

---

## 5. Monitoring and Alerts

### 5.1 Alert Rules

```yaml
# Prometheus alert rules para DLQ
groups:
  - name: dlq-alerts
    rules:
      - alert: RabbitMQDLQMessages
        expr: rabbitmq_queue_messages_ready{queue=~".*dlq.*"} > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "DLQ has messages: {{ $labels.queue }}"
          description: "DLQ {{ $labels.queue }} has {{ $value }} messages"

      - alert: KafkaDLQMessages
        expr: kafka_topic_partition_current_offset{topic=~".*dlq"} > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Kafka DLQ has messages: {{ $labels.topic }}"

      - alert: DLQRateIncreasing
        expr: rate(rabbitmq_queue_messages_ready{queue=~".*dlq.*"}[10m]) > 1
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "DLQ message rate is increasing: {{ $labels.queue }}"
```

### 5.2 Dashboard Queries

```promql
# DLQ message count by queue
rabbitmq_queue_messages_ready{queue=~".*dlq.*"}

# DLQ age (oldest message)
rabbitmq_queue_messages_ready{queue=~".*dlq.*"} * 60

# DLQ rate (messages per minute)
rate(rabbitmq_queue_messages_ready{queue=~".*dlq.*"}[5m]) * 60

# Consumer error rate (messages entering DLQ)
rate(rabbitmq_queue_messages{queue=~".*dlq.*"}[5m])
```

## Preguntas Frecuentes

### ¿Por cuanto tiempo deberia retener messages en el DLQ?

Retene DLQ messages por 7 days en production. Esto da a engineers enough time para investigate, fixear el root cause y replayear messages. Para audit o compliance topics, extend a 30 days. Setea un TTL en RabbitMQ DLQs y retention en Kafka DLQ topics. Monitora DLQ age y alerta cuando messages son older que 24 hours — stale messages son harder de replayear successfully.

### ¿Cuando deberia discardar DLQ messages en vez de replayearlos?

Discarda messages cuando el data itself es invalid y no puede ser fixed (e.g., corrupt payload, missing required fields que no pueden ser reconstructed). Tambien discarda si el business event ya no es relevant (e.g., un cancelled order's payment event). Documenta el discard decision en el RCA. Nunca discards sin confirmar que el message es truly unrecoverable — checkea si un producer fix podia regenerar el correct data.

### ¿Cómo prevengo infinite retry loops?

Setea un maximum retry count (tipicamente 3) en message headers. Despues de max retries, routea a DLQ en vez de requeueing. En RabbitMQ, usa `basic_reject(requeue=False)` despues de max retries. En Kafka, checkea el `retry-count` header y produce a DLQ cuando exceeded. Siempre setea un TTL en el DLQ para que messages expiren si nadie los processea. Monitora para messages cycling entre main queue y DLQ.

### ¿Deberia usar un separate DLQ per consumer o per topic?

Usa un separate DLQ per consumer service, no per topic. Esto da a cada team visibility en sus own failures y previene que un service's errors drowneen out another's. Nombra el DLQ con el consumer service name (e.g., `prod.orders.payment-service.dlq`). Para Kafka, usa un DLQ topic per source topic (e.g., `prod.orders.order-created.dlq`) ya que Kafka consumers son tipicamente per-topic.

### ¿Cómo automatizo DLQ replay?

Buildea un replay service que read de DLQ, checkea si el fix ha sido deployed (via health check o version check) y replayea messages al original topic. Include un dry-run mode que inspecta messages sin replayear. Add rate limiting para avoid overwhelming downstream services. Loggea cada replayed message con su original metadata para auditability. Corre el replay service como un Kubernetes Job o Lambda function triggered manually despues de un fix deployed.
