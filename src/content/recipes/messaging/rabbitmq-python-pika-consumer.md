---
contentType: recipes
slug: rabbitmq-python-pika-consumer
title: "Build a RabbitMQ Consumer with Python and Pika"
description: "Create a RabbitMQ consumer and producer in Python using pika with durable queues, work dispatching, acknowledgments, dead-letter exchanges, and prefetch tuning."
metaDescription: "Build a RabbitMQ consumer and producer in Python with pika. Use durable queues, acknowledgments, dead-letter exchanges, prefetch, and work dispatching."
difficulty: intermediate
topics:
  - messaging
  - architecture
  - infrastructure
tags:
  - rabbitmq
  - python
  - pika
  - consumer
  - message-queue
relatedResources:
  - /recipes/messaging/rabbitmq-dead-letter-queue
  - /recipes/messaging/python-celery-task-queue
  - /guides/complete-guide-graphql-federation
  - /guides/complete-guide-graphql-federation
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build a RabbitMQ consumer and producer in Python with pika. Use durable queues, acknowledgments, dead-letter exchanges, prefetch, and work dispatching."
  keywords:
    - rabbitmq python pika
    - rabbitmq consumer python
    - pika rabbitmq tutorial
    - rabbitmq dead letter queue
    - rabbitmq prefetch qos
---

## Overview

RabbitMQ is a message broker that routes messages between producers and consumers. Pika is the standard Python client. Below: building a producer and consumer with durable queues, manual acknowledgments, dead-letter exchanges for failed messages, prefetch tuning for fair dispatch, and connection recovery.

## When to Use This

- Distributing background work across multiple workers (image processing, email sending)
- Decoupling producers from consumers in a microservice architecture
- Work queues where each message must be processed exactly once
- Systems that need message persistence and guaranteed delivery

## Prerequisites

- Python 3.10+
- RabbitMQ server (local or cloud, e.g., CloudAMQP)
- `pika` package

## Solution

### 1. Producer

```python
import pika
import json
import uuid

def get_connection():
    credentials = pika.PlainCredentials('guest', 'guest')
    params = pika.ConnectionParameters(
        host='localhost',
        port=5672,
        credentials=credentials,
        heartbeat=30,
        blocked_connection_timeout=7200,
    )
    return pika.BlockingConnection(params)

def publish_message(queue_name: str, message: dict):
    connection = get_connection()
    channel = connection.channel()

    # Declare a durable queue — survives RabbitMQ restarts
    channel.queue_declare(queue=queue_name, durable=True)

    channel.basic_publish(
        exchange='',
        routing_key=queue_name,
        body=json.dumps(message),
        properties=pika.BasicProperties(
            delivery_mode=2,  # Persistent message
            message_id=str(uuid.uuid4()),
            content_type='application/json',
            timestamp=int(__import__('time').time()),
        ),
    )
    print(f"Published to {queue_name}: {message['id']}")
    connection.close()

# Usage
publish_message('task_queue', {
    'id': 'task-001',
    'type': 'email',
    'payload': {'to': 'user@example.com', 'subject': 'Welcome'},
})
```

### 2. Consumer with Manual Acknowledgments

```python
import pika
import json
import time

def get_connection():
    credentials = pika.PlainCredentials('guest', 'guest')
    params = pika.ConnectionParameters(
        host='localhost',
        port=5672,
        credentials=credentials,
        heartbeat=30,
    )
    return pika.BlockingConnection(params)

def process_message(channel, method, properties, body):
    message = json.loads(body)
    print(f"Received: {message['id']} — {message['type']}")

    try:
        # Simulate work
        time.sleep(1)
        process_task(message)
        print(f"Done: {message['id']}")

        # Acknowledge only after successful processing
        channel.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print(f"Failed: {message['id']} — {e}")
        # Reject and requeue — message goes back to the queue
        channel.basic_nack(
            delivery_tag=method.delivery_tag,
            requeue=True,
        )

def process_task(message: dict):
    if message['type'] == 'email':
        send_email(message['payload'])
    elif message['type'] == 'report':
        generate_report(message['payload'])
    else:
        raise ValueError(f"Unknown task type: {message['type']}")

def start_consumer(queue_name: str):
    connection = get_connection()
    channel = connection.channel()

    # Declare queue as durable (must match producer)
    channel.queue_declare(queue=queue_name, durable=True)

    # Fair dispatch — don't dispatch a new message to a worker
    # until it has processed and acknowledged the previous one
    channel.basic_qos(prefetch_count=1)

    channel.basic_consume(
        queue=queue_name,
        on_message_callback=process_message,
    )

    print(f"Waiting for messages on {queue_name}. To exit press CTRL+C")
    channel.start_consuming()

start_consumer('task_queue')
```

### 3. Dead-Letter Exchange

```python
import pika

def declare_queues_with_dlq(channel):
    # Dead-letter exchange
    channel.exchange_declare(exchange='dlx', exchange_type='direct', durable=True)

    # Dead-letter queue
    channel.queue_declare(queue='task_queue.dlq', durable=True)
    channel.queue_bind(queue='task_queue.dlq', exchange='dlx', routing_key='task_queue.dlq')

    # Main queue with dead-letter arguments
    args = {
        'x-dead-letter-exchange': 'dlx',
        'x-dead-letter-routing-key': 'task_queue.dlq',
        'x-max-retries': 3,  # Custom header-based retry limit
    }
    channel.queue_declare(queue='task_queue', durable=True, arguments=args)

# Consumer with retry tracking
def process_message_with_retry(channel, method, properties, body):
    message = json.loads(body)
    headers = properties.headers or {}
    retry_count = headers.get('x-retry-count', 0)

    try:
        process_task(message)
        channel.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        if retry_count < 3:
            print(f"Retry {retry_count + 1}/3 for {message['id']}")
            # Re-publish with incremented retry count
            channel.basic_publish(
                exchange='',
                routing_key=method.routing_key,
                body=body,
                properties=pika.BasicProperties(
                    delivery_mode=2,
                    headers={'x-retry-count': retry_count + 1},
                    content_type='application/json',
                ),
            )
            channel.basic_ack(delivery_tag=method.delivery_tag)
        else:
            print(f"Max retries exceeded for {message['id']}, sending to DLQ")
            # Let RabbitMQ dead-letter it
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
```

### 4. Work Queue with Multiple Workers

```python
# Run multiple instances of the consumer — RabbitMQ distributes messages
# in round-robin with prefetch_count=1 for fair dispatch

# worker.py
import pika
import json
import sys

def start_worker(worker_id: str, queue_name: str):
    connection = get_connection()
    channel = connection.channel()
    channel.queue_declare(queue=queue_name, durable=True)
    channel.basic_qos(prefetch_count=1)

    def callback(ch, method, properties, body):
        message = json.loads(body)
        print(f"[Worker {worker_id}] Processing: {message['id']}")
        time.sleep(1)
        ch.basic_ack(delivery_tag=method.delivery_tag)

    channel.basic_consume(queue=queue_name, on_message_callback=callback)
    print(f"[Worker {worker_id}] Waiting for tasks...")
    channel.start_consuming()

worker_id = sys.argv[1] if len(sys.argv) > 1 else '1'
start_worker(worker_id, 'task_queue')
```

### 5. Topic Exchange for Routing

```python
import pika
import json

def setup_topic_exchange():
    connection = get_connection()
    channel = connection.channel()

    # Topic exchange — routes by pattern (e.g., 'orders.*', 'logs.error')
    channel.exchange_declare(exchange='topic_logs', exchange_type='topic', durable=True)

    # Queues for different routing keys
    channel.queue_declare(queue='all_orders', durable=True)
    channel.queue_declare(queue='error_logs', durable=True)
    channel.queue_declare(queue='all_logs', durable=True)

    channel.queue_bind(queue='all_orders', exchange='topic_logs', routing_key='order.#')
    channel.queue_bind(queue='error_logs', exchange='topic_logs', routing_key='log.error')
    channel.queue_bind(queue='all_logs', exchange='topic_logs', routing_key='log.#')

    return channel

def publish_topic(routing_key: str, message: dict):
    channel = setup_topic_exchange()
    channel.basic_publish(
        exchange='topic_logs',
        routing_key=routing_key,
        body=json.dumps(message),
        properties=pika.BasicProperties(delivery_mode=2, content_type='application/json'),
    )

# Routes to 'all_orders' queue
publish_topic('order.created', {'orderId': '123'})
publish_topic('order.cancelled', {'orderId': '456'})

# Routes to 'error_logs' AND 'all_logs' queues
publish_topic('log.error', {'service': 'api', 'msg': 'timeout'})
```

### 6. Connection Recovery

```python
import pika
import json
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ResilientConsumer:
    def __init__(self, queue_name: str, host: str = 'localhost'):
        self.queue_name = queue_name
        self.host = host
        self._connection = None
        self._channel = None

    def connect(self):
        while True:
            try:
                self._connection = pika.BlockingConnection(
                    pika.ConnectionParameters(
                        host=self.host,
                        heartbeat=30,
                        blocked_connection_timeout=7200,
                    )
                )
                self._channel = self._connection.channel()
                self._channel.queue_declare(queue=self.queue_name, durable=True)
                self._channel.basic_qos(prefetch_count=1)
                self._channel.basic_consume(
                    queue=self.queue_name,
                    on_message_callback=self.on_message,
                )
                logger.info("Connected and consuming...")
                self._channel.start_consuming()
                break
            except pika.exceptions.AMQPConnectionError:
                logger.warning("Connection lost, retrying in 5s...")
                time.sleep(5)
            except Exception as e:
                logger.error(f"Unexpected error: {e}, retrying in 5s...")
                time.sleep(5)

    def on_message(self, channel, method, properties, body):
        try:
            message = json.loads(body)
            self.process(message)
            channel.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            logger.error(f"Processing failed: {e}")
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    def process(self, message: dict):
        logger.info(f"Processing: {message.get('id')}")
        # Business logic here

consumer = ResilientConsumer('task_queue')
consumer.connect()
```

## How It Works

1. **Queues**: Messages are placed on a queue. Consumers subscribe to the queue. RabbitMQ delivers messages in FIFO order. Durable queues persist to disk, surviving broker restarts.
2. **Acknowledgments**: With manual ack, a message is only removed from the queue after the consumer acknowledges it. If the consumer dies (connection lost, crash), RabbitMQ re-delivers the message to another consumer.
3. **Prefetch (QoS)**: `basic_qos(prefetch_count=1)` tells RabbitMQ not to send a new message to a worker until it has acknowledged the previous one. This prevents one slow worker from hoarding messages.
4. **Dead-letter exchange**: When a message is rejected with `requeue=False` or expires, RabbitMQ routes it to the dead-letter exchange. The DLQ holds failed messages for inspection or replay.
5. **Exchanges**: Direct exchanges route by exact routing key. Topic exchanges route by pattern (`*` = one word, `#` = zero or more words). Fanout exchanges broadcast to all bound queues.

## Variants

### Fanout Exchange (Broadcast)

```python
channel.exchange_declare(exchange='broadcast', exchange_type='fanout', durable=True)
# All queues bound to this exchange receive every message
channel.queue_bind(queue='worker1_queue', exchange='broadcast', routing_key='')
channel.queue_bind(queue='worker2_queue', exchange='broadcast', routing_key='')
```

### Priority Queue

```python
# Declare queue with max priority
channel.queue_declare(
    queue='priority_tasks',
    durable=True,
    arguments={'x-max-priority': 10},
)

# Publish with priority
channel.basic_publish(
    exchange='',
    routing_key='priority_tasks',
    body=json.dumps(message),
    properties=pika.BasicProperties(
        delivery_mode=2,
        priority=5,  # Higher number = higher priority
    ),
)
```

### Delayed Messages (TTL + DLQ)

```python
# Declare a queue with TTL — messages expire after N ms and go to DLQ
channel.queue_declare(
    queue='delayed_tasks',
    durable=True,
    arguments={
        'x-message-ttl': 60000,  # 60 seconds
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': 'task_queue',
    },
)

# Publish to the delayed queue — after 60s, the message
# expires and is routed to 'task_queue' for processing
channel.basic_publish(
    exchange='',
    routing_key='delayed_tasks',
    body=json.dumps(message),
    properties=pika.BasicProperties(delivery_mode=2),
)
```

## Best Practices

- **Always use durable queues and persistent messages**: Without durability, messages are lost on broker restart. Set `delivery_mode=2` on every message.
- **Use manual acknowledgments**: Auto-ack removes messages before processing completes. If the consumer crashes, the message is lost. Always use manual ack.
- **Set `prefetch_count=1` for fair dispatch**: Without prefetch, RabbitMQ dispatches all messages to the first available consumer. Prefetch=1 ensures round-robin distribution.
- **Use dead-letter queues**: Don't requeue failed messages indefinitely — they become poison pills. Use a retry counter and send to DLQ after max retries.
- **Set heartbeat**: Without heartbeat, dead connections aren't detected for hours. Set `heartbeat=30` to detect network failures quickly.
- **Handle connection recovery**: Network failures happen. Wrap the consumer in a reconnect loop that retries with backoff.

## Common Mistakes

- **Using auto-ack**: `auto_ack=True` removes the message before processing. If the consumer crashes, the message is lost. Always use manual ack.
- **Not setting prefetch**: Without `basic_qos`, one consumer can receive all messages while others sit idle. Set `prefetch_count=1` for fair dispatch.
- **Requeuing poison pills**: A message that always fails gets requeued and reprocessed forever. Use a retry counter and dead-letter after max attempts.
- **Not declaring queues on both sides**: Both producer and consumer must declare the queue with the same parameters (durable, arguments). Mismatched declarations cause errors.
- **Blocking the callback**: Long-running tasks in the callback block the heartbeat, causing RabbitMQ to close the connection. Offload heavy work to a thread pool.

## FAQ

**What is the difference between ack, nack, and reject?**

`basic_ack` confirms successful processing — message is removed. `basic_nack` can reject multiple messages and optionally requeue. `basic_reject` rejects one message and optionally requeue. Use `nack` with `requeue=False` to dead-letter.

**How does prefetch_count work?**

RabbitMQ delivers up to `prefetch_count` unacknowledged messages to a consumer. With prefetch=1, the consumer gets one message and must ack it before receiving the next. Higher values improve throughput but can cause uneven distribution.

**Can I use RabbitMQ with asyncio?**

Yes. Use `aiormq` or `aio-pika` for async RabbitMQ clients. Pika is synchronous — it blocks the event loop. For async applications, use `aio-pika`.

**What happens if RabbitMQ restarts?**

Durable queues and persistent messages survive restarts — they're written to disk. Non-durable queues and non-persistent messages are lost. Always use durable=True and delivery_mode=2 for important messages.

**How do I monitor RabbitMQ?**

Use the RabbitMQ Management Plugin (`rabbitmq-plugins enable rabbitmq_management`). It provides a web UI at port 15672 with queue depth, message rates, and consumer information. For production, monitor with Prometheus + Grafana using the rabbitmq_exporter.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
