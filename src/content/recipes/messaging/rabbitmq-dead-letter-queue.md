---
contentType: recipes
slug: rabbitmq-dead-letter-queue
title: "Configure Dead-Letter Queues in RabbitMQ for Failed Messages"
description: "Set up dead-letter queues and exchanges in RabbitMQ with TTL expiry, max length limits, rejection-based routing, and retry patterns for resilient messaging."
metaDescription: "Configure dead-letter queues in RabbitMQ. Use TTL expiry, max length, rejection routing, and retry patterns with exponential backoff for failed messages."
difficulty: intermediate
topics:
  - messaging
  - architecture
  - infrastructure
tags:
  - rabbitmq
  - dead-letter-queue
  - dlq
  - message-queue
  - error-handling
relatedResources:
  - /recipes/messaging/rabbitmq-python-pika-consumer
  - /recipes/messaging/python-celery-task-queue
  - /guides/complete-guide-message-queues
  - /guides/complete-guide-rabbitmq-patterns
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Configure dead-letter queues in RabbitMQ. Use TTL expiry, max length, rejection routing, and retry patterns with exponential backoff for failed messages."
  keywords:
    - rabbitmq dead letter queue
    - rabbitmq dlq configuration
    - rabbitmq message ttl
    - rabbitmq retry pattern
    - rabbitmq error handling
---

## Overview

Dead-letter queues (DLQ) capture messages that RabbitMQ cannot deliver or process — rejected messages, expired messages, or overflow from full queues. Without a DLQ, failed messages vanish or loop forever as poison pills. Below: configuring DLQ with TTL, max-length, rejection-based routing, retry patterns with exponential backoff, and inspecting/replaying DLQ messages.

## When to Use This

- Any RabbitMQ queue where message loss is unacceptable
- Work queues where consumers may fail to process specific messages
- Time-sensitive messages that should be discarded after a deadline
- Queues with capacity limits that need overflow handling

## Prerequisites

- RabbitMQ 3.8+
- Python 3.10+ with `pika`
- Understanding of exchanges and bindings

## Solution

### 1. Basic DLQ Configuration

```python
import pika
import json

def setup_dlq(channel, main_queue: str, dlq_queue: str):
    # Declare the dead-letter exchange
    dlx_name = f'{main_queue}.dlx'
    channel.exchange_declare(exchange=dlx_name, exchange_type='direct', durable=True)

    # Declare the DLQ
    channel.queue_declare(queue=dlq_queue, durable=True)
    channel.queue_bind(queue=dlq_queue, exchange=dlx_name, routing_key=dlq_queue)

    # Declare the main queue with DLQ arguments
    channel.queue_declare(
        queue=main_queue,
        durable=True,
        arguments={
            'x-dead-letter-exchange': dlx_name,
            'x-dead-letter-routing-key': dlq_queue,
        },
    )

    return main_queue, dlq_queue

connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()

setup_dlq(channel, 'orders', 'orders.dlq')
```

### 2. TTL-Based Dead-Lettering

```python
def setup_ttl_queue(channel, queue_name: str, dlq_name: str, ttl_ms: int):
    """Messages expire after ttl_ms and are routed to DLQ."""
    channel.queue_declare(
        queue=queue_name,
        durable=True,
        arguments={
            'x-dead-letter-exchange': f'{queue_name}.dlx',
            'x-dead-letter-routing-key': dlq_name,
            'x-message-ttl': ttl_ms,  # e.g., 60000 = 60 seconds
        },
    )

# Messages in 'expiring_tasks' expire after 30 seconds
# and are routed to 'expiring_tasks.dlq'
setup_ttl_queue(channel, 'expiring_tasks', 'expiring_tasks.dlq', 30000)
```

### 3. Max-Length Overflow

```python
def setup_max_length_queue(channel, queue_name: str, dlq_name: str, max_length: int):
    """When queue reaches max_length, oldest messages are dead-lettered."""
    channel.queue_declare(
        queue=queue_name,
        durable=True,
        arguments={
            'x-dead-letter-exchange': f'{queue_name}.dlx',
            'x-dead-letter-routing-key': dlq_name,
            'x-max-length': max_length,  # e.g., 1000 messages max
            'x-overflow': 'reject-publish',  # or 'drop-head' (default)
        },
    )

# 'bounded_queue' holds max 1000 messages — overflow goes to DLQ
setup_max_length_queue(channel, 'bounded_queue', 'bounded_queue.dlq', 1000)
```

### 4. Consumer Rejection to DLQ

```python
def consume_with_rejection(channel, queue_name: str):
    def callback(ch, method, properties, body):
        message = json.loads(body)

        try:
            process_message(message)
            ch.basic_ack(delivery_tag=method.delivery_tag)

        except ValidationError as e:
            # Validation errors go to DLQ — don't retry
            print(f"Validation error, dead-lettering: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

        except TransientError as e:
            # Transient errors — retry once, then DLQ
            headers = properties.headers or {}
            retry_count = headers.get('x-retry-count', 0)

            if retry_count < 1:
                ch.basic_publish(
                    exchange='',
                    routing_key=queue_name,
                    body=body,
                    properties=pika.BasicProperties(
                        delivery_mode=2,
                        headers={'x-retry-count': retry_count + 1},
                        content_type='application/json',
                    ),
                )
                ch.basic_ack(delivery_tag=method.delivery_tag)
            else:
                print(f"Max retries reached, dead-lettering: {message.get('id')}")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    channel.basic_consume(queue=queue_name, on_message_callback=callback)
    channel.start_consuming()
```

### 5. Retry with Exponential Backoff (TTL-Based)

```python
def setup_retry_queues(channel, base_queue: str):
    """Create retry queues with increasing TTLs for exponential backoff."""
    retry_intervals = [10, 30, 120, 600]  # seconds: 10s, 30s, 2m, 10m

    for i, interval in enumerate(retry_intervals):
        retry_queue = f'{base_queue}.retry.{i}'
        channel.queue_declare(
            queue=retry_queue,
            durable=True,
            arguments={
                'x-dead-letter-exchange': '',
                'x-dead-letter-routing-key': base_queue,
                'x-message-ttl': interval * 1000,  # Convert to ms
            },
        )

    # DLQ for final failures
    channel.queue_declare(queue=f'{base_queue}.dlq', durable=True)

def send_to_retry(channel, base_queue: str, body: bytes, attempt: int):
    """Send failed message to the appropriate retry queue."""
    retry_queue = f'{base_queue}.retry.{attempt}'

    channel.basic_publish(
        exchange='',
        routing_key=retry_queue,
        body=body,
        properties=pika.BasicProperties(
            delivery_mode=2,
            headers={'x-retry-attempt': attempt + 1},
            content_type='application/json',
        ),
    )

def consume_with_backoff(channel, base_queue: str, max_retries: int = 4):
    def callback(ch, method, properties, body):
        message = json.loads(body)
        attempt = (properties.headers or {}).get('x-retry-attempt', 0)

        try:
            process_message(message)
            ch.basic_ack(delivery_tag=method.delivery_tag)
            print(f"Processed successfully on attempt {attempt}")

        except Exception as e:
            if attempt < max_retries:
                print(f"Attempt {attempt} failed, sending to retry queue {attempt}")
                send_to_retry(ch, base_queue, body, attempt)
                ch.basic_ack(delivery_tag=method.delivery_tag)
            else:
                print(f"All {max_retries} retries exhausted, sending to DLQ")
                # Publish directly to DLQ
                ch.basic_publish(
                    exchange='',
                    routing_key=f'{base_queue}.dlq',
                    body=body,
                    properties=pika.BasicProperties(
                        delivery_mode=2,
                        headers={'x-retry-attempt': attempt, 'x-final-error': str(e)},
                        content_type='application/json',
                    ),
                )
                ch.basic_ack(delivery_tag=method.delivery_tag)

    channel.basic_consume(queue=base_queue, on_message_callback=callback)
    channel.start_consuming()
```

### 6. Inspecting and Replaying DLQ Messages

```python
def inspect_dlq(channel, dlq_name: str, limit: int = 10):
    """Inspect messages in the DLQ without removing them."""
    messages = []

    for _ in range(limit):
        method, properties, body = channel.basic_get(queue=dlq_name, auto_ack=False)
        if method is None:
            break

        message = {
            'body': json.loads(body),
            'headers': properties.headers or {},
            'timestamp': properties.timestamp,
            'message_id': properties.message_id,
        }
        messages.append(message)

        # Requeue the message back to DLQ
        channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    return messages

def replay_dlq_messages(channel, dlq_name: str, target_queue: str):
    """Move messages from DLQ back to the main queue."""
    while True:
        method, properties, body = channel.basic_get(queue=dlq_name, auto_ack=False)
        if method is None:
            break

        # Strip dead-letter headers for clean reprocessing
        clean_props = pika.BasicProperties(
            delivery_mode=2,
            content_type=properties.content_type,
            message_id=properties.message_id,
            # Don't copy headers — they contain dead-letter metadata
        )

        channel.basic_publish(
            exchange='',
            routing_key=target_queue,
            body=body,
            properties=clean_props,
        )
        channel.basic_ack(delivery_tag=method.delivery_tag)
        print(f"Replayed message to {target_queue}")
```

### 7. Dead-Letter Headers Inspection

```python
def get_dead_letter_reason(properties) -> dict:
    """Extract dead-letter metadata from message headers."""
    headers = properties.headers or {}
    x_death = headers.get('x-death', [])

    if x_death:
        first_death = x_death[0]  # List of death records
        return {
            'queue': first_death.get('queue'),
            'reason': first_death.get('reason'),  # 'rejected', 'expired', 'maxlen'
            'exchange': first_death.get('exchange'),
            'routing_key': first_death.get('routing-keys', [None])[0],
            'count': first_death.get('count'),
            'time': str(first_death.get('time')),
        }
    return {}

# Reasons:
# 'rejected' — consumer nack/reject with requeue=False
# 'expired' — message TTL elapsed
# 'maxlen' — queue max-length exceeded
```

## How It Works

1. **Dead-letter exchange (DLX)**: A normal exchange that receives messages dead-lettered from a queue. The queue is configured with `x-dead-letter-exchange` to specify where to send dead-lettered messages.
2. **Dead-letter routing key**: When a message is dead-lettered, RabbitMQ replaces the routing key with the value of `x-dead-letter-routing-key` (if set). Without it, the original routing key is used.
3. **Dead-letter reasons**: Messages are dead-lettered for three reasons: `rejected` (consumer nack with requeue=False), `expired` (message TTL elapsed), `maxlen` (queue max-length exceeded).
4. **x-death header**: RabbitMQ adds an `x-death` header to dead-lettered messages containing the queue, reason, exchange, and timestamp. This metadata helps diagnose why the message was dead-lettered.
5. **Retry queues with TTL**: Create intermediate queues with TTLs. Messages expire from the retry queue and are dead-lettered back to the main queue, implementing delayed retries without a custom scheduler.

## Variants

### Per-Message TTL

```python
# Set TTL on individual messages, not the queue
channel.basic_publish(
    exchange='',
    routing_key='tasks',
    body=json.dumps(message),
    properties=pika.BasicProperties(
        delivery_mode=2,
        expiration='30000',  # 30 seconds — this message expires if not consumed
    ),
)
```

### Quorum Queue with DLQ

```python
# Quorum queues provide high availability and data safety
channel.queue_declare(
    queue='durable_tasks',
    durable=True,
    arguments={
        'x-queue-type': 'quorum',
        'x-dead-letter-exchange': 'durable_tasks.dlx',
        'x-dead-letter-routing-key': 'durable_tasks.dlq',
    },
)
```

### Lazy Queue for Large DLQ

```python
# Lazy queues write messages to disk immediately, reducing memory usage
# Useful for DLQs that may accumulate many messages
channel.queue_declare(
    queue='large_dlq',
    durable=True,
    arguments={
        'x-queue-mode': 'lazy',
    },
)
```

## Best Practices

- **Always configure DLQ for critical queues**: Without a DLQ, rejected messages are lost. Always set `x-dead-letter-exchange` on important queues.
- **Use separate DLQ per queue**: Don't share one DLQ across multiple queues. It makes debugging harder. Name them `<queue>.dlq`.
- **Set per-message TTL for retry**: Instead of sleeping in the consumer, publish to a retry queue with TTL. The message automatically returns to the main queue after the TTL expires.
- **Strip dead-letter headers on replay**: When replaying from DLQ, remove `x-death` headers to avoid confusion on subsequent failures.
- **Monitor DLQ depth**: Set alerts on DLQ message count. A growing DLQ indicates a systemic issue that needs investigation.
- **Use `reject-publish` overflow**: With `x-overflow=reject-publish`, publishers get an error when the queue is full, letting them handle it. `drop-head` silently drops messages.

## Common Mistakes

- **Not setting `x-dead-letter-routing-key`**: Without it, RabbitMQ uses the original routing key, which may not route to the DLQ correctly. Always set it explicitly.
- **Requeuing poison pills**: `basic_nack(requeue=True)` on a message that always fails creates an infinite loop. Use `requeue=False` to dead-letter, or implement a retry counter.
- **Not handling DLQ messages**: A DLQ that nobody reads is just delayed data loss. Regularly inspect and replay or discard DLQ messages.
- **Sharing a DLX across queues**: If multiple queues use the same DLX, dead-lettered messages from all queues mix in the same exchange. Use per-queue DLX or distinct routing keys.
- **Not testing DLQ behavior**: DLQ configuration is easy to get wrong. Test by sending a message, rejecting it, and verifying it lands in the DLQ.

## FAQ

**What triggers a message to be dead-lettered?**

Three conditions: (1) Consumer rejects with `basic_nack` or `basic_reject` and `requeue=False`. (2) Message TTL expires (per-message or per-queue). (3) Queue exceeds `x-max-length` with `x-overflow=drop-head`.

**Can a dead-lettered message be dead-lettered again?**

Yes. If the DLQ also has a `x-dead-letter-exchange`, a message rejected from the DLQ is dead-lettered again. RabbitMQ appends to the `x-death` header, creating a chain of death records.

**How do I replay messages from DLQ to the main queue?**

Use `basic_get` to fetch from DLQ, `basic_publish` to the main queue, then `basic_ack` to remove from DLQ. Strip dead-letter headers before republishing.

**What is the difference between `drop-head` and `reject-publish` overflow?**

`drop-head` (default) silently removes the oldest message when the queue is full. `reject-publish` refuses new messages, notifying the publisher. Use `reject-publish` when publishers should handle overflow.

**Can I set a TTL on the DLQ itself?**

Yes. Set `x-message-ttl` on the DLQ to automatically discard old dead-lettered messages. This prevents the DLQ from growing indefinitely. Set a long TTL (e.g., 7 days) to allow investigation time.
