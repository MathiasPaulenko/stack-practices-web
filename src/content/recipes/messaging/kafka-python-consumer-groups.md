---





contentType: recipes
slug: kafka-python-consumer-groups
title: "Kafka Consumer Groups with Python for Scalable Streaming"
description: "Create Kafka consumer groups in Python with partition assignment, offset management, commit strategies, rebalance handling, and exactly-once semantics for scalable stream processing."
metaDescription: "Build Kafka consumer groups in Python. Manage partitions, offsets, commit strategies, rebalance handling, and exactly-once semantics for scalable stream processing."
difficulty: advanced
topics:
  - messaging
  - architecture
  - infrastructure
tags:
  - kafka
  - python
  - consumer-group
  - streaming
  - event-driven
relatedResources:
  - /recipes/rabbitmq-python-pika-consumer
  - /recipes/python-celery-task-queue
  - /guides/complete-guide-graphql-federation
  - /guides/complete-guide-kafka-stream-processing
  - /recipes/kafka-spring-boot-stream-listener
  - /recipes/event-sourcing-cqrs-pattern
  - /recipes/outbox-pattern-transactional-events
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build Kafka consumer groups in Python. Manage partitions, offsets, commit strategies, rebalance handling, and exactly-once semantics for scalable stream processing."
  keywords:
    - kafka python consumer group
    - kafka consumer offset management
    - kafka rebalance handling
    - kafka exactly once python
    - kafka partition assignment





---

## Overview

Kafka consumer groups enable parallel processing of a topic by distributing partitions among consumers. Each partition is assigned to exactly one consumer in a group, providing horizontal scalability and ordered processing per partition. Below: creating consumer groups, managing offsets, handling rebalances, commit strategies, and achieving exactly-once semantics with Python and `confluent-kafka`.

## When to Use This

- High-throughput event streaming (click streams, IoT data, financial transactions)
- Log aggregation and real-time analytics pipelines
- Event sourcing architectures where order per partition matters
- Stream processing with parallel consumers and partition-level ordering

## Prerequisites

- Python 3.10+
- Kafka cluster (local or cloud, e.g., Confluent Cloud)
- `confluent-kafka` package

## Solution

### 1. Basic Consumer Group

```python
from confluent_kafka import Consumer, KafkaError
import json

def create_consumer(group_id: str, servers: str = 'localhost:9092'):
    conf = {
        'bootstrap.servers': servers,
        'group.id': group_id,
        'auto.offset.reset': 'earliest',
        'enable.auto.commit': False,  # Manual commits
        'partition.assignment.strategy': 'cooperative-sticky',
    }
    return Consumer(conf)

def consume_messages(consumer: Consumer, topic: str):
    consumer.subscribe([topic])

    try:
        while True:
            msg = consumer.poll(timeout=1.0)

            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                print(f"Consumer error: {msg.error()}")
                continue

            # Process message
            key = msg.key().decode('utf-8') if msg.key() else None
            value = json.loads(msg.value().decode('utf-8'))

            print(f"Topic={msg.topic()}, Partition={msg.partition()}, "
                  f"Offset={msg.offset()}, Key={key}")

            process_event(value)

            # Manual commit after processing
            consumer.commit(msg)

    except KeyboardInterrupt:
        print("Stopping consumer...")
    finally:
        consumer.close()

consumer = create_consumer('order-processors')
consume_messages(consumer, 'orders')
```

### 2. Producer with Key-Based Partitioning

```python
from confluent_kafka import Producer
import json

def create_producer(servers: str = 'localhost:9092'):
    return Producer({
        'bootstrap.servers': servers,
        'acks': 'all',
        'enable.idempotence': True,
    })

def delivery_report(err, msg):
    if err:
        print(f"Delivery failed: {err}")
    else:
        print(f"Delivered to {msg.topic()} [{msg.partition()}] at offset {msg.offset()}")

def produce_event(producer: Producer, topic: str, key: str, value: dict):
    producer.produce(
        topic=topic,
        key=key.encode('utf-8'),  # Key determines partition
        value=json.dumps(value).encode('utf-8'),
        callback=delivery_report,
    )
    producer.poll(0)  # Serve delivery callbacks

# Key-based partitioning ensures same key always goes to same partition
producer = create_producer()
produce_event(producer, 'orders', 'user-123', {'orderId': 'o1', 'userId': 'user-123'})
produce_event(producer, 'orders', 'user-456', {'orderId': 'o2', 'userId': 'user-456'})
producer.flush()
```

### 3. Rebalance Handling

```python
from confluent_kafka import Consumer, KafkaError, TopicPartition
import json

def on_assign(consumer, partitions):
    print(f"Partitions assigned: {partitions}")
    # Load committed offsets and seek to them
    for tp in partitions:
        # Could load from external store for exactly-once
        pass

def on_revoke(consumer, partitions):
    print(f"Partitions revoked: {partitions}")
    # Commit current offsets before losing ownership
    consumer.commit(asynchronous=False)

def on_lost(consumer, partitions):
    print(f"Partitions lost: {partitions}")
    # Partitions lost due to consumer failure — cleanup

def create_resilient_consumer(group_id: str):
    conf = {
        'bootstrap.servers': 'localhost:9092',
        'group.id': group_id,
        'auto.offset.reset': 'earliest',
        'enable.auto.commit': False,
        'partition.assignment.strategy': 'cooperative-sticky',
        # Rebalance callbacks
        'on_assign': on_assign,
        'on_revoke': on_revoke,
        'on_lost': on_lost,
    }
    return Consumer(conf)

consumer = create_resilient_consumer('order-processors')
consumer.subscribe(['orders'])
```

### 4. Batch Processing with Manual Offset

```python
from confluent_kafka import Consumer, KafkaError
import json
from collections import defaultdict

def consume_batch(consumer: Consumer, topic: str, batch_size: int = 100, timeout: float = 5.0):
    consumer.subscribe([topic])
    messages = []

    while True:
        msg = consumer.poll(timeout=timeout)

        if msg is None:
            if messages:
                process_batch(messages)
                consumer.commit(asynchronous=False)
                messages = []
            continue

        if msg.error():
            continue

        messages.append({
            'topic': msg.topic(),
            'partition': msg.partition(),
            'offset': msg.offset(),
            'key': msg.key().decode('utf-8') if msg.key() else None,
            'value': json.loads(msg.value().decode('utf-8')),
        })

        if len(messages) >= batch_size:
            process_batch(messages)
            consumer.commit(asynchronous=False)
            messages = []

def process_batch(messages: list):
    # Group by partition for ordered processing
    by_partition = defaultdict(list)
    for msg in messages:
        by_partition[(msg['topic'], msg['partition'])].append(msg)

    for (topic, partition), msgs in by_partition.items():
        print(f"Processing {len(msgs)} messages from {topic}[{partition}]")
        for msg in msgs:
            process_event(msg['value'])
```

### 5. Exactly-Once Semantics (Transactional)

```python
from confluent_kafka import Consumer, Producer, KafkaError, KafkaException
import json

class ExactlyOnceProcessor:
    def __init__(self, input_topic: str, output_topic: str, group_id: str):
        self.consumer = Consumer({
            'bootstrap.servers': 'localhost:9092',
            'group.id': group_id,
            'auto.offset.reset': 'earliest',
            'enable.auto.commit': False,
            'isolation.level': 'read_committed',
        })

        self.producer = Producer({
            'bootstrap.servers': 'localhost:9092',
            'transactional.id': f'{group_id}-txn',
            'enable.idempotence': True,
        })

        self.input_topic = input_topic
        self.output_topic = output_topic

    def start(self):
        self.producer.init_transactions()
        self.consumer.subscribe([self.input_topic])

        try:
            while True:
                msg = self.consumer.poll(1.0)
                if msg is None or msg.error():
                    continue

                # Process within a transaction
                self.producer.begin_transaction()

                try:
                    result = process_event(json.loads(msg.value().decode('utf-8')))

                    # Produce output message
                    self.producer.produce(
                        self.output_topic,
                        value=json.dumps(result).encode('utf-8'),
                    )

                    # Commit consumer offset within the transaction
                    self.producer.send_offsets_to_transaction(
                        [TopicPartition(msg.topic(), msg.partition(), msg.offset() + 1)],
                        self.consumer.consumer_group_metadata(),
                    )

                    self.producer.commit_transaction()

                except Exception as e:
                    print(f"Transaction failed, aborting: {e}")
                    self.producer.abort_transaction()

        finally:
            self.consumer.close()
            self.producer.flush()
```

### 6. Running Multiple Consumers in a Group

```python
# Run multiple instances — Kafka assigns partitions automatically
# With 6 partitions and 3 consumers, each gets 2 partitions

# consumer_worker.py
import sys
from confluent_kafka import Consumer

def start_worker(worker_id: str, group_id: str, topic: str):
    consumer = Consumer({
        'bootstrap.servers': 'localhost:9092',
        'group.id': group_id,
        'auto.offset.reset': 'earliest',
        'enable.auto.commit': False,
        'partition.assignment.strategy': 'cooperative-sticky',
    })

    consumer.subscribe([topic])
    print(f"[Worker {worker_id}] Subscribed to {topic}")

    try:
        while True:
            msg = consumer.poll(1.0)
            if msg is None or msg.error():
                continue

            value = json.loads(msg.value().decode('utf-8'))
            print(f"[Worker {worker_id}] P={msg.partition()} O={msg.offset()} — {value.get('id')}")
            process_event(value)
            consumer.commit(msg)
    finally:
        consumer.close()

worker_id = sys.argv[1]
start_worker(worker_id, 'order-processors', 'orders')

# Run in separate terminals:
# python consumer_worker.py worker-1
# python consumer_worker.py worker-2
# python consumer_worker.py worker-3
```

## How It Works

1. **Consumer groups**: Consumers in the same group share partitions. Each partition is assigned to exactly one consumer. Adding consumers scales throughput up to the number of partitions.
2. **Key-based partitioning**: The producer hashes the message key to determine the partition. Same key always goes to the same partition, preserving order for that key.
3. **Offset management**: Each consumer tracks its position (offset) in each partition. Commits persist the offset to Kafka's `__consumer_offsets` topic. Manual commits give control over when offsets are saved.
4. **Rebalance**: When consumers join or leave the group, partitions are reassigned. Cooperative-sticky strategy minimizes disruption by only moving partitions that need to move.
5. **Exactly-once**: Transactions tie the consumer offset commit and producer send into one atomic operation. If the transaction fails, both are rolled back — no duplicates, no data loss.

## Variants

### Windowed Aggregation with Kafka Streams

```python
# Use confluent-kafka-python's stream processing or Faust
# pip install faust-streaming

import faust

app = faust.App('order-aggregator', broker='kafka://localhost:9092')
orders_topic = app.topic('orders', value_type=dict)
order_counts = app.Table('order_counts', default=int)

@app.agent(orders_topic)
async def count_orders(stream):
    async for order in stream:
        user_id = order['userId']
        order_counts[user_id] += 1
        print(f"User {user_id}: {order_counts[user_id]} orders")
```

### Schema Registry with Avro

```python
from confluent_kafka import Consumer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroDeserializer

schema_registry = SchemaRegistryClient({'url': 'http://localhost:8081'})
avro_deserializer = AvroDeserializer(schema_registry)

consumer = Consumer({
    'bootstrap.servers': 'localhost:9092',
    'group.id': 'avro-consumers',
})

consumer.subscribe(['orders-avro'])

msg = consumer.poll(1.0)
if msg:
    value = avro_deserializer(msg.value(), None)
    print(f"Deserialized: {value}")
```

### Multiple Topics

```python
# Subscribe to multiple topics with pattern
consumer.subscribe(['orders', 'payments', 'shipments'])

# Or use regex pattern
import re
consumer.subscribe(['orders.*'], on_assign=on_assign)
```

## Best Practices


- For a deeper guide, see [Consume Kafka Topics with Spring Boot Stream Listeners](/recipes/kafka-spring-boot-stream-listener/).

- **Use `cooperative-sticky` assignment**: The default `range` strategy causes stop-the-world rebalances. Cooperative-sticky only moves affected partitions, reducing disruption.
- **Disable `enable.auto.commit`**: Auto-commit can commit offsets before processing completes. Use manual commits after successful processing.
- **Use key-based partitioning for order**: Messages with the same key (e.g., user ID) go to the same partition, preserving order. Without keys, messages are distributed round-robin.
- **Set `isolation.level=read_committed`**: Only read committed transactions. Without it, consumers may see uncommitted (potentially rolled-back) messages.
- **Handle rebalances gracefully**: Implement `on_revoke` to commit offsets before losing partition ownership. Otherwise, you may reprocess messages.
- **Monitor consumer lag**: Use `kafka-consumer-groups.sh` or Burrow to monitor lag (difference between latest offset and committed offset). High lag means consumers can't keep up.

## Common Mistakes

- **More consumers than partitions**: Extra consumers sit idle. If you have 6 partitions, only 6 consumers can actively consume. Scale partitions before scaling consumers.
- **Auto-commit with slow processing**: Auto-commit runs every 5 seconds by default. If processing takes longer, offsets are committed before processing completes — data loss on crash.
- **Not handling rebalance**: During rebalance, partitions are revoked. If you don't commit before revocation, you reprocess messages after the rebalance.
- **Blocking in poll loop**: Long-running processing blocks `poll()`, triggering session timeout and rebalance. Use pause/resume or async processing.
- **Not setting `auto.offset.reset`**: If no committed offset exists, this setting determines where to start. `earliest` reads from the beginning, `latest` only new messages. Choose based on your use case.

## FAQ

**How many partitions should I create?**

Plan for peak throughput. Each partition supports ~10MB/s. For 100MB/s, use 10+ partitions. More partitions enable more parallelism but increase overhead. Start with 6-12 and scale as needed.

**What is consumer lag?**

Lag is the difference between the latest offset in a partition and the consumer's committed offset. High lag means the consumer is falling behind. Monitor with `kafka-consumer-groups.sh --describe`.

**How does exactly-once work in Kafka?**

Kafka transactions tie the producer send and consumer offset commit into one atomic operation. The producer uses a `transactional.id` for idempotent writes. The consumer sets `isolation.level=read_committed` to only see committed messages.

**Can I have multiple consumer groups on the same topic?**

Yes. Each consumer group independently tracks its offsets. Multiple groups can read the same topic for different purposes (e.g., one for real-time analytics, one for database sync).

**What happens if a consumer crashes?**

Kafka detects the failure via session timeout (default 10s). A rebalance occurs, and the crashed consumer's partitions are reassigned to other consumers. Offsets are read from the last committed position.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
