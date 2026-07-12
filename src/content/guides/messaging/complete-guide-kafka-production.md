---





contentType: guides
slug: complete-guide-kafka-production
title: "Complete Guide to Apache Kafka in Production"
description: "Run Apache Kafka in production with confidence. Covers partitions, replication, consumer groups, monitoring, performance tuning, and operational best practices for high-throughput streaming pipelines."
metaDescription: "Run Kafka in production. Covers partitions, replication, consumer groups, monitoring, performance tuning, and operational best practices."
difficulty: advanced
topics:
  - messaging
  - infrastructure
  - observability
tags:
  - kafka
  - messaging
  - guide
  - streaming
  - partitions
  - consumer-groups
  - replication
  - monitoring
relatedResources:
  - /guides/complete-guide-serverless-architecture
  - /patterns/circuit-breaker-pattern
  - /patterns/bulkhead-pattern
  - /guides/message-queue-guide
  - /guides/complete-guide-event-driven-systems
  - /guides/complete-guide-rabbitmq-architecture
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Run Kafka in production. Covers partitions, replication, consumer groups, monitoring, performance tuning, and operational best practices."
  keywords:
    - apache kafka production
    - kafka partitions
    - kafka replication
    - kafka consumer groups
    - kafka monitoring
    - kafka performance tuning
    - kafka operations
    - streaming pipelines





---

## Introduction

Apache Kafka is a distributed event streaming platform used by thousands of companies for real-time data pipelines, event-driven architectures, and streaming analytics. Running Kafka in production requires understanding partitions, replication, consumer groups, and operational concerns. Below is a practical guide to everything you need to operate Kafka reliably at scale.

## Kafka Architecture Fundamentals

### Core Concepts

```text
Producer → Topic (Partitioned) → Broker Cluster → Consumer Group
                ↓
         Partition 0: [msg1, msg2, msg3, ...]
         Partition 1: [msg4, msg5, msg6, ...]
         Partition 2: [msg7, msg8, msg9, ...]
```

- **Broker**: A Kafka server. Clusters typically have 3+ brokers.
- **Topic**: A named stream of events, divided into partitions.
- **Partition**: An ordered, append-only sequence of events. The unit of parallelism.
- **Offset**: A monotonically increasing ID for each message within a partition.
- **Consumer Group**: A group of consumers that share partitions of a topic.
- **Replication**: Each partition has replicas across brokers for fault tolerance.

### Partition Design

Partitions determine parallelism. More partitions mean more consumers can process data concurrently, but too many partitions increase overhead.

```python
from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers=["kafka1:9092", "kafka2:9092", "kafka3:9092"],
    key_serializer=str.encode,
    value_serializer=lambda v: json.dumps(v).encode("utf-8")
)

# Partitioning: messages with the same key go to the same partition
# This guarantees ordering for events related to the same entity
def send_order_event(order_id, event_type, data):
    producer.send(
        "orders",
        key=str(order_id),  # Same order_id → same partition → ordered
        value={
            "order_id": order_id,
            "event_type": event_type,
            "data": data,
            "timestamp": "2026-07-04T12:00:00Z"
        }
    )
    producer.flush()
```

### Choosing Partition Count

| Factor | Recommendation |
|--------|---------------|
| Throughput target | 1 partition per 10MB/s write throughput |
| Consumer parallelism | At least as many partitions as consumers |
| Broker count | Partitions per broker should stay under 2000 |
| Retention | More partitions = more memory for offsets |
| Future growth | Over-partition early (cannot easily reduce) |

```bash
# Create a topic with 12 partitions and replication factor 3
kafka-topics.sh --create \
  --bootstrap-server kafka1:9092 \
  --topic orders \
  --partitions 12 \
  --replication-factor 3 \
  --config retention.ms=604800000 \
  --config compression.type=lz4
```

## Replication and Fault Tolerance

Each partition has one leader and N-1 followers. Producers and consumers interact with the leader. Followers replicate the leader's data.

### Replication Factor

```text
Replication Factor 1: No tolerance for broker failure (data loss)
Replication Factor 2: Tolerates 1 broker failure (not recommended — no safety margin)
Replication Factor 3: Tolerates 1 broker failure (production standard)
Replication Factor 5: Tolerates 2 broker failures (high availability)
```

### In-Sync Replicas (ISR)

A replica is "in-sync" if it has fetched all messages from the leader. Only ISR replicas are eligible to become leaders.

```bash
# Check ISR for a topic
kafka-topics.sh --describe \
  --bootstrap-server kafka1:9092 \
  --topic orders

# Output:
# Topic: orders  Partition: 0  Leader: 1  Replicas: 1,2,3  Isr: 1,2,3
# Topic: orders  Partition: 1  Leader: 2  Replicas: 2,3,1  Isr: 2,3,1
```

### acks Configuration

```python
# acks=0: Fire and forget — no acknowledgment (highest throughput, data loss risk)
producer = KafkaProducer(bootstrap_servers=["kafka1:9092"], acks=0)

# acks=1: Leader acknowledges (good balance for most use cases)
producer = KafkaProducer(bootstrap_servers=["kafka1:9092"], acks=1)

# acks=all: Leader + all ISR replicas acknowledge (strongest durability)
producer = KafkaProducer(
    bootstrap_servers=["kafka1:9092"],
    acks="all",
    retries=3,
    max_in_flight_requests_per_connection=1  # Prevent out-of-order on retry
)
```

## Consumer Groups

Consumer groups allow parallel processing of topic partitions. Each partition is consumed by exactly one consumer within a group.

### Consumer Group Mechanics

```text
Topic: orders (6 partitions)

Consumer Group A (3 consumers):
  Consumer 1 → Partitions 0, 1
  Consumer 2 → Partitions 2, 3
  Consumer 3 → Partitions 4, 5

Consumer Group B (2 consumers):
  Consumer 1 → Partitions 0, 1, 2
  Consumer 2 → Partitions 3, 4, 5

# Adding a consumer to Group A:
  Consumer 4 → Partitions 4
  Consumer 3 → Partitions 5 (rebalance)
```

### Basic Consumer

```python
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    "orders",
    bootstrap_servers=["kafka1:9092", "kafka2:9092", "kafka3:9092"],
    group_id="order-processor",
    auto_offset_reset="earliest",
    enable_auto_commit=False,
    key_deserializer=lambda k: k.decode("utf-8") if k else None,
    value_deserializer=lambda v: json.loads(v.decode("utf-8"))
)

for message in consumer:
    try:
        process_order(message.value)
        consumer.commit()  # Manual commit after successful processing
    except Exception as e:
        logger.error(f"Failed to process message: {e}")
        # Message will be re-delivered on next poll
```

### At-Least-Once Processing

```python
from kafka import KafkaConsumer, TopicPartition
import json

consumer = KafkaConsumer(
    "orders",
    bootstrap_servers=["kafka1:9092"],
    group_id="order-processor",
    enable_auto_commit=False,
    auto_offset_reset="earliest"
)

def process_with_retry(message, max_retries=3):
    for attempt in range(max_retries):
        try:
            process_order(message.value)
            return True
        except Exception as e:
            if attempt == max_retries - 1:
                # Send to dead letter topic
                send_to_dlt(message)
                return True  # Mark as handled to skip
            time.sleep(2 ** attempt)  # Exponential backoff
    return False

for message in consumer:
    if process_with_retry(message):
        consumer.commit()
```

### Exactly-Once Semantics

Kafka supports exactly-once through transactional APIs. Use this when processing must not produce duplicates.

```python
from kafka import KafkaProducer, KafkaConsumer
from kafka.errors import KafkaError

# Transactional producer
producer = KafkaProducer(
    bootstrap_servers=["kafka1:9092"],
    transactional_id="order-processor-tx",
    enable_idempotence=True
)

consumer = KafkaConsumer(
    "orders",
    bootstrap_servers=["kafka1:9092"],
    group_id="order-processor-tx",
    isolation_level="read_committed"
)

# Consume-transform-produce pattern with exactly-once
producer.init_transactions()

for message in consumer:
    try:
        producer.begin_transaction()
        
        # Process and produce to output topic
        result = transform_order(message.value)
        producer.send("processed-orders", value=result)
        
        # Commit consumer offset within the transaction
        producer.send_offsets_to_transaction(
            consumer.position(message.partition),
            consumer.consumer_group_metadata()
        )
        
        producer.commit_transaction()
    except KafkaError:
        producer.abort_transaction()
```

## Performance Tuning

### Producer Tuning

```python
producer = KafkaProducer(
    bootstrap_servers=["kafka1:9092"],
    
    # Batching: accumulate messages before sending
    batch_size=65536,          # 64KB batch size
    linger_ms=10,              # Wait up to 10ms for batch to fill
    
    # Compression: reduce network overhead
    compression_type="lz4",    # lz4 (fast), snappy (balanced), zstd (best ratio)
    
    # Buffering: in-memory buffer for unsent messages
    buffer_memory=67108864,    # 64MB buffer
    
    # Durability
    acks="all",
    retries=3,
    max_in_flight_requests_per_connection=5,
    
    # Serialization
    key_serializer=str.encode,
    value_serializer=lambda v: json.dumps(v).encode("utf-8")
)
```

### Consumer Tuning

```python
consumer = KafkaConsumer(
    "orders",
    bootstrap_servers=["kafka1:9092"],
    
    # Fetch settings
    fetch_min_bytes=1024,       # Wait for at least 1KB before returning
    fetch_max_wait_ms=500,      # Max wait time for fetch_min_bytes
    max_partition_fetch_bytes=1048576,  # 1MB per partition
    
    # Poll settings
    max_poll_records=500,       # Max records per poll
    max_poll_interval_ms=300000,  # 5min max processing time
    
    # Offset management
    enable_auto_commit=False,
    auto_offset_reset="earliest"
)
```

### Broker Tuning

```bash
# server.properties — key production settings

# Replication
default.replication.factor=3
min.insync.replicas=2

# Log retention
log.retention.hours=168          # 7 days
log.segment.bytes=1073741824     # 1GB segments
log.retention.check.interval.ms=300000

# Network
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
socket.request.max.bytes=104857600

# Threads
num.network.threads=3
num.io.threads=8

# Topic defaults
num.partitions=6
log.cleanup.policy=delete        # or "compact" for key-based retention
```

## Monitoring

### Key Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Under-replicated partitions | Partitions with lagging followers | > 0 |
| Offline partitions | Partitions without a leader | > 0 |
| Consumer lag | Difference between log end and committed offset | > 10,000 |
| Bytes in/out per second | Throughput | Baseline + 50% |
| Request latency | Time to serve requests | > 100ms |
| Active controller count | Should always be 1 | != 1 |
| ISR shrinks per second | Replicas falling out of sync | > 0 sustained |

### Consumer Lag Monitoring

```python
from kafka import KafkaConsumer, TopicPartition
import json

consumer = KafkaConsumer(
    "orders",
    bootstrap_servers=["kafka1:9092"],
    group_id="order-processor"
)

# Get current lag
def get_consumer_lag(consumer, topic, group_id):
    partitions = consumer.partitions_for_topic(topic)
    if not partitions:
        return 0
    
    total_lag = 0
    for partition in partitions:
        tp = TopicPartition(topic, partition)
        # Get the end offset of the partition
        end_offset = consumer.end_offsets([tp])[tp]
        # Get the consumer's committed position
        committed = consumer.committed(tp)
        if committed is not None:
            total_lag += end_offset - committed
    
    return total_lag

lag = get_consumer_lag(consumer, "orders", "order-processor")
if lag > 10000:
    alert(f"High consumer lag: {lag} messages behind")
```

### JMX Metrics via Command Line

```bash
# Check under-replicated partitions
kafka-topics.sh --describe --bootstrap-server kafka1:9092 --under-replicated-partitions

# Check consumer group lag
kafka-consumer-groups.sh --describe \
  --bootstrap-server kafka1:9092 \
  --group order-processor

# Output:
# GROUP            TOPIC    PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG  CONSUMER-ID
# order-processor  orders   0          15000           15200           200  consumer-1
```

## Operational Procedures

### Adding Partitions

```bash
# Increase partitions (cannot decrease later)
kafka-topics.sh --alter \
  --bootstrap-server kafka1:9092 \
  --topic orders \
  --partitions 24

# Note: existing messages stay in their original partitions
# New messages may be distributed differently if key hashing changes
```

### Reassigning Partitions

When adding brokers, rebalance partitions across the cluster.

```bash
# Generate reassignment plan
kafka-reassign-partitions.sh --bootstrap-server kafka1:9092 \
  --topics-to-move-json-file topics.json \
  --generate

# Execute reassignment
kafka-reassign-partitions.sh --bootstrap-server kafka1:9092 \
  --reassignment-json-file plan.json \
  --execute

# Verify completion
kafka-reassign-partitions.sh --bootstrap-server kafka1:9092 \
  --reassignment-json-file plan.json \
  --verify
```

### Preferred Leader Election

```bash
# Trigger preferred leader election to restore original leader assignments
kafka-leader-election.sh --bootstrap-server kafka1:9092 \
  --election-type preferred \
  --all-topic-partitions
```

## Security

### SASL Authentication

```bash
# server.properties
listeners=SASL_SSL://:9092
advertised.listeners=SASL_SSL://kafka1:9092
sasl.enabled.mechanisms=SCRAM-SHA-512
sasl.mechanism.inter.broker.protocol=SCRAM-SHA-512
listener.security.protocol.map=SASL_SSL:SASL_SSL
ssl.keystore.location=/etc/kafka/keystore.jks
ssl.keystore.password=changeit
ssl.truststore.location=/etc/kafka/truststore.jks
ssl.truststore.password=changeit
```

```python
# Python client with SASL
producer = KafkaProducer(
    bootstrap_servers=["kafka1:9092"],
    security_protocol="SASL_SSL",
    sasl_mechanism="SCRAM-SHA-512",
    sasl_plain_username="producer-user",
    sasl_plain_password="secure-password",
    ssl_cafile="/path/to/ca-cert"
)
```

### ACLs

```bash
# Grant produce permission to a user on a topic
kafka-acls.sh --bootstrap-server kafka1:9092 \
  --add --allow-principal User:producer-user \
  --producer --topic orders

# Grant consume permission to a consumer group
kafka-acls.sh --bootstrap-server kafka1:9092 \
  --add --allow-principal User:consumer-user \
  --consumer --topic orders --group order-processor
```

## Production Checklist

- [ ] Replication factor >= 3 for all topics
- [ ] min.insync.replicas >= 2
- [ ] acks=all for critical producers
- [ ] Partition count sized for throughput and consumer parallelism
- [ ] Consumer lag monitoring with alerts
- [ ] Dead letter topic for failed messages
- [ ] Graceful shutdown handling for consumers
- [ ] SASL/SSL authentication enabled
- [ ] ACLs configured per topic and consumer group
- [ ] Log retention configured per topic requirements
- [ ] JMX metrics exported to monitoring system
- [ ] Broker disk usage alerts at 70% and 85%
- [ ] Disaster recovery plan (MirrorMaker2 or cluster replication)
- [ ] Schema registry for Avro/Protobuf serialization

## FAQ

### How many partitions should I use?

Start with 6-12 partitions per topic for moderate throughput. Add more if you need more consumer parallelism or higher write throughput. Rule of thumb: 1 partition per 10MB/s throughput. Do not exceed 2000 partitions per broker.

### What happens when a broker fails?

If the broker was a partition leader, one of the ISR replicas takes over as leader. If replication factor is 3 and min.insync.replicas is 2, the cluster continues operating with 2 replicas. Producers with acks=all will experience a brief pause until the new leader is elected.

### How do I handle consumer lag?

Check if consumers are slow (increase parallelism, optimize processing), if there is a traffic spike (scale consumers), or if a consumer is stuck (restart it). Monitor lag continuously and alert when it exceeds your threshold. Use `kafka-consumer-groups.sh` to inspect lag per partition.

### Can I reduce the number of partitions?

No. Kafka does not support reducing partitions. If you need fewer partitions, create a new topic with the desired count and migrate producers and consumers. Choose partition count carefully at topic creation time.

### What is log compaction?

Log compaction retains only the latest value for each key, removing older entries. This is useful for changelog topics where you only care about the current state. Use `log.cleanup.policy=compact` instead of the default `delete` policy.

### How do I achieve exactly-once processing?

Use Kafka's transactional API: create a transactional producer with `transactional_id`, consume-transform-produce within a transaction, and commit the consumer offset as part of the transaction. Consumers must set `isolation_level=read_committed` to only see committed messages.

## See Also

- [Message Queues — RabbitMQ, Kafka, and SQS detailed analysis](/guides/message-queue-guide/)
- [Complete Guide to Monitoring and Alerting](/guides/complete-guide-monitoring-and-alerting/)
- [Complete Guide to Event-Driven Systems](/guides/complete-guide-event-driven-systems/)
- [Complete Guide to RabbitMQ Architecture](/guides/complete-guide-rabbitmq-architecture/)
- [Complete Guide to Observability with the Grafana Stack](/guides/complete-guide-observability-grafana-stack/)

