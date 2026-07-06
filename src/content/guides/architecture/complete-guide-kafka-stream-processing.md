---
contentType: guides
slug: complete-guide-kafka-stream-processing
title: "Complete Guide to Kafka Stream Processing"
description: "Build real-time event streaming pipelines with Kafka. Covers producers, consumers, Kafka Streams, Kafka Connect, schema registry, and stream processing patterns."
metaDescription: "Complete guide to Kafka stream processing. Build real-time pipelines with producers, consumers, Kafka Streams, Connect, schema registry and processing patterns."
difficulty: advanced
topics:
  - messaging
  - architecture
  - data
tags:
  - kafka
  - stream-processing
  - event-streaming
  - kafka-streams
  - kafka-connect
  - schema-registry
  - guide
  - messaging
relatedResources:
  - /guides/architecture/event-driven-architecture-guide
  - /guides/architecture/complete-guide-microservices-communication
  - /patterns/architecture/pipes-and-filters-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Complete guide to Kafka stream processing. Build real-time pipelines with producers, consumers, Kafka Streams, Connect, schema registry and processing patterns."
  keywords:
    - kafka stream processing
    - kafka streams
    - kafka connect
    - schema registry
    - event streaming
    - real-time data pipeline
    - kafka consumers
    - kafka producers
---

# Complete Guide to Kafka Stream Processing

## Introduction

Apache Kafka is a distributed event streaming platform. It handles trillions of events per day at companies like LinkedIn, Uber, and Netflix. Below is a practical guide to Kafka core concepts, producers, consumers, Kafka Streams API, Kafka Connect, Schema Registry, and common stream processing patterns with code examples in Python, Java, and JavaScript.

## Core Concepts

- **Topic**: A named stream of events (like a category)
- **Partition**: A topic is split into partitions for parallelism; each partition is an ordered, append-only log
- **Offset**: The position of a message within a partition
- **Consumer Group**: A group of consumers that share partitions of a topic
- **Broker**: A Kafka server that stores and serves messages
- **Producer**: An application that publishes events to topics
- **Consumer**: An application that subscribes to topics and processes events

## Producer

### Python (aiokafka)

```python
from aiokafka import AIOKafkaProducer
import json
import asyncio

async def produce_events():
    producer = AIOKafkaProducer(
        bootstrap_servers="localhost:9092",
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        key_serializer=lambda k: k.encode("utf-8") if k else None,
        acks="all",
        enable_idempotence=True,
    )
    await producer.start()
    try:
        for i in range(100):
            await producer.send_and_wait(
                "orders",
                key=f"order-{i}",
                value={"order_id": i, "amount": 99.99 * i, "status": "created"},
            )
    finally:
        await producer.stop()

asyncio.run(produce_events())
```

### Java (Kafka Producer)

```java
import org.apache.kafka.clients.producer.*;
import java.util.Properties;

public class OrderProducer {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put("bootstrap.servers", "localhost:9092");
        props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        props.put("acks", "all");
        props.put("enable.idempotence", "true");

        try (Producer<String, String> producer = new KafkaProducer<>(props)) {
            for (int i = 0; i < 100; i++) {
                ProducerRecord<String, String> record = new ProducerRecord<>(
                    "orders",
                    "order-" + i,
                    "{\"order_id\":" + i + ",\"amount\":" + (99.99 * i) + "}"
                );
                producer.send(record, (metadata, e) -> {
                    if (e != null) {
                        e.printStackTrace();
                    } else {
                        System.out.printf("Sent to partition %d offset %d%n",
                            metadata.partition(), metadata.offset());
                    }
                });
            }
        }
    }
}
```

## Consumer

### Python (aiokafka)

```python
from aiokafka import AIOKafkaConsumer
import json
import asyncio

async def consume_events():
    consumer = AIOKafkaConsumer(
        "orders",
        bootstrap_servers="localhost:9092",
        group_id="order-processor",
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        key_deserializer=lambda k: k.decode("utf-8") if k else None,
        auto_offset_reset="earliest",
        enable_auto_commit=False,
    )
    await consumer.start()
    try:
        async for msg in consumer:
            print(f"Topic={msg.topic}, Partition={msg.partition}, Offset={msg.offset}")
            print(f"Key={msg.key}, Value={msg.value}")
            await consumer.commit()
    finally:
        await consumer.stop()

asyncio.run(consume_events())
```

### JavaScript (KafkaJS)

```javascript
const { Kafka } = require("kafkajs");

const kafka = new Kafka({
    clientId: "order-consumer",
    brokers: ["localhost:9092"],
});

const consumer = kafka.consumer({ groupId: "order-processor" });

async function consumeEvents() {
    await consumer.connect();
    await consumer.subscribe({ topic: "orders", fromBeginning: true });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const event = JSON.parse(message.value.toString());
            console.log(`Processing order ${event.order_id}, amount: ${event.amount}`);

            // Process the order...
        },
    });
}

consumeEvents();
```

## Kafka Streams (Java)

Kafka Streams is a library for building real-time stream processing applications.

### Filter and branch

```java
import org.apache.kafka.streams.*;
import org.apache.kafka.streams.kstream.*;
import java.util.Properties;

public class OrderStreamProcessor {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put("application.id", "order-processor");
        props.put("bootstrap.servers", "localhost:9092");
        props.put("default.key.serde", "org.apache.kafka.common.serialization.Serdes$StringSerde");
        props.put("default.value.serde", "org.apache.kafka.common.serialization.Serdes$StringSerde");

        StreamsBuilder builder = new StreamsBuilder();
        KStream<String, String> orders = builder.stream("orders");

        // Branch by amount
        KStream<String, String>[] branches = orders.branch(
            (key, value) -> value.contains("\"amount\":0"),
            (key, value) -> true
        );

        KStream<String, String> zeroOrders = branches[0];
        KStream<String, String> validOrders = branches[1];

        // Filter high-value orders
        KStream<String, String> highValue = validOrders.filter(
            (key, value) -> {
                // Parse and check amount > 1000
                return value.contains("\"amount\":1");
            }
        );

        highValue.to("high-value-orders");
        validOrders.to("processed-orders");

        KafkaStreams streams = new KafkaStreams(builder.build(), props);
        streams.start();
    }
}
```

### Aggregation (count by key)

```java
KTable<String, Long> orderCounts = orders
    .groupBy((key, value) -> key, Grouped.with(
        Serdes.String(),
        Serdes.String()
    ))
    .count();

orderCounts.toStream().to("order-counts");
```

### Windowed aggregation (5-minute tumbling windows)

```java
KTable<Windowed<String>, Long> windowedCounts = orders
    .groupByKey()
    .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofMinutes(5)))
    .count();

windowedCounts.toStream((key, value) -> key.key() + "@" + key.window().start())
    .to("windowed-order-counts");
```

### Joining streams

```java
KStream<String, String> orders = builder.stream("orders");
KStream<String, String> payments = builder.stream("payments");

KStream<String, String> enriched = orders.join(
    payments,
    (orderValue, paymentValue) -> orderValue + "|" + paymentValue,
    JoinWindows.of(Duration.ofMinutes(5)),
    Joined.with(Serdes.String(), Serdes.String(), Serdes.String())
);

enriched.to("enriched-orders");
```

## Schema Registry

Schema Registry ensures compatibility between producers and consumers by enforcing a schema (Avro, Protobuf, JSON Schema).

### Register an Avro schema

```python
from confluent_kafka import SerializingProducer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer

schema_registry_conf = {"url": "http://localhost:8081"}
schema_registry_client = SchemaRegistryClient(schema_registry_conf)

schema_str = """
{
  "type": "record",
  "name": "Order",
  "fields": [
    {"name": "order_id", "type": "int"},
    {"name": "amount", "type": "double"},
    {"name": "status", "type": "string"}
  ]
}
"""

avro_serializer = AvroSerializer(schema_registry_client, schema_str)

producer_conf = {
    "bootstrap.servers": "localhost:9092",
    "key.serializer": "org.apache.kafka.common.serialization.StringSerializer",
    "value.serializer": avro_serializer,
}

producer = SerializingProducer(producer_conf)
producer.produce(
    topic="orders-avro",
    key="order-1",
    value={"order_id": 1, "amount": 99.99, "status": "created"},
)
producer.flush()
```

## Kafka Connect

Kafka Connect is a framework for connecting Kafka with external systems (databases, queues, file systems).

### JDBC Source Connector

```json
{
  "name": "postgres-source",
  "config": {
    "connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector",
    "connection.url": "jdbc:postgresql://localhost:5432/mydb",
    "connection.user": "postgres",
    "connection.password": "secret",
    "table.whitelist": "orders",
    "mode": "incrementing",
    "incrementing.column.name": "id",
    "topic.prefix": "postgres-",
    "key.converter": "org.apache.kafka.connect.json.JsonConverter",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter"
  }
}
```

### Elasticsearch Sink Connector

```json
{
  "name": "es-sink",
  "config": {
    "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
    "tasks.max": "1",
    "topics": "processed-orders",
    "connection.url": "http://localhost:9200",
    "type.name": "_doc",
    "key.converter": "org.apache.kafka.connect.json.JsonConverter",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter",
    "schema.ignore": "true"
  }
}
```

## Stream Processing Patterns

| Pattern | Description | Use Case |
|---------|-------------|----------|
| Filter | Drop events that do not match a predicate | Remove invalid orders |
| Map | Transform each event | Enrich with customer data |
| Aggregate | Group and reduce | Count orders per customer |
| Window | Aggregate over time | 5-minute rolling average |
| Join | Combine two streams | Orders + payments |
| Split | Route to multiple topics | High/low value orders |
| Repartition | Re-key a stream | Group by customer_id instead of order_id |

## Best Practices

- **Use `acks=all` for producers** — ensures data is written to multiple replicas
- **Enable idempotent producers** — prevents duplicates on retries
- **Set `enable.auto.commit=false`** — commit offsets after processing, not before
- **Handle deserialization errors** — use a dead-letter topic for poison pills
- **Use Schema Registry** — enforce schema compatibility, prevent breaking consumers
- **Partition by key for ordering** — events with the same key go to the same partition
- **Size partitions correctly** — aim for 10-50 MB/s throughput per partition
- **Monitor consumer lag** — growing lag means consumers cannot keep up
- **Use exactly-once semantics for critical pipelines** — set `processing.guarantee=exactly_once_v2`
- **Set retention wisely** — use time-based (7 days) or size-based (1GB) retention per topic
- **Use consumer groups for parallelism** — each consumer in a group gets a subset of partitions

## Common Mistakes

- Not handling poison pills — one bad message blocks the entire partition
- Using `auto.offset.reset=latest` — new consumers miss historical data
- Not setting `max.poll.interval.ms` — slow consumers get kicked from the group
- Over-partitioning — too many partitions increase overhead and latency
- Not monitoring lag — issues surface only when users complain
- Using Kafka as a database — Kafka is a log, not a queryable store
- Not using Schema Registry — schema changes break consumers silently
- Producing without a key — events are distributed randomly, losing ordering guarantees

## Frequently Asked Questions

### How many partitions should a topic have?

Start with 6-12 partitions for most topics. Add partitions if consumer lag grows or throughput exceeds 50 MB/s per partition. You cannot reduce partitions later — only add. Plan for peak throughput.

### How do I ensure exactly-once processing?

Use Kafka Streams with `processing.guarantee=exactly_once_v2`. For consumer-producer loops, use the transactional API: `producer.initTransactions()`, `beginTransaction()`, send + commit offset, `commitTransaction()`.

### What is the difference between Kafka Streams and Kafka Consumers?

Kafka Consumers are low-level — you handle offsets, retries, and state yourself. Kafka Streams is a high-level library that handles state management, exactly-once, rebalancing, and local state stores. Use Kafka Streams for stateful processing (aggregations, joins). Use consumers for simple event processing.
