---
contentType: guides
slug: stream-processing-guide
title: "Stream Processing — Event-Driven Data Pipelines with Kafka, Flink, and Spark"
description: "A practical guide to stream processing: choosing between Kafka Streams, Flink, and Spark Streaming, designing event schemas, handling stateful operations, and building exactly-once processing pipelines for real-time data."
metaDescription: "Learn stream processing: Kafka Streams, Flink, Spark Streaming, event schemas, stateful operations, and exactly-once processing for real-time data pipelines."
difficulty: advanced
topics:
  - data
  - architecture
  - messaging
tags:
  - stream-processing
  - kafka
  - flink
  - spark-streaming
  - event-driven
  - real-time
  - guide
relatedResources:
  - /guides/data/real-time-analytics-guide
  - /guides/data/etl-pipeline-guide
  - /guides/observability/metrics-and-dashboards-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn stream processing: Kafka Streams, Flink, Spark Streaming, event schemas, stateful operations, and exactly-once processing for real-time data pipelines."
  keywords:
    - stream-processing
    - kafka
    - flink
    - spark-streaming
    - event-driven
    - real-time
    - guide
---

## Overview

Stream processing continuously ingests, transforms, and produces data as events flow through your system. Unlike batch processing that processes data in scheduled chunks, stream processing handles each event as it arrives, enabling sub-second reactions to changing conditions. It powers real-time fraud detection, live recommendations, IoT monitoring, and operational analytics.

This guide covers stream processing fundamentals, engine selection, stateful operations, and production patterns with Kafka Streams, Apache Flink, and Spark Streaming.

## When to Use

- You need to process events as they arrive, not in hourly or daily batches
- Your system must react to conditions within seconds (fraud, anomalies, alerts)
- You need to join multiple event streams in real time (user clicks + transactions)
- You are building an event-sourced system where the event log is the source of truth
- You need to maintain aggregated state that updates continuously (counters, windows)
- Your data volume makes batch processing too slow or resource-intensive

## When NOT to Use

- Your use case tolerates minutes or hours of latency — batch ETL is simpler and cheaper
- Your transformations require access to historical data that does not fit in memory
- You need complex multi-table SQL joins across disparate systems — batch or OLAP is better
- Your team lacks operational experience with distributed stream processors
- Event ordering is critical but your source does not guarantee it (most logs, some APIs)

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Event Stream** | An ordered, append-only sequence of events |
| **Stream Partition** | A subset of events within a stream, processed in parallel |
| **Offset** | The position of an event within a partition (like a cursor) |
| **Consumer Group** | A set of consumers that share partition assignment |
| **Stateful Processing** | Operations that maintain and update state across events |
| **Watermark** | A timestamp that indicates when all events up to that time have been seen |
| **Checkpoint** | A snapshot of state and offsets for fault recovery |

## Stream Processing Engines

```
┌─────────────────────────────────────────────────────────────────┐
│                     Event Sources                               │
│  (Kafka, Kinesis, Pulsar, RabbitMQ, Logs, APIs)               │
└─────────────────────────────┬───────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
    ┌─────▼─────┐      ┌─────▼─────┐      ┌─────▼─────┐
    │   Flink   │      │  Kafka    │      │   Spark   │
    │           │      │  Streams  │      │  Streaming│
    │ • Complex │      │ • Simple  │      │ • Batch   │
    │   event   │      │   event   │      │   compat  │
    │   time    │      │   logic   │      │ • Micro-  │
    │   proc    │      │ • Embedded│      │   batches │
    │ • Stateful│      │ • Kafka   │      │ • SQL     │
    │ • Exactly-│      │   only    │      │   support │
    │   once    │      │ • Easy ops│      │           │
    └─────┬─────┘      └─────┬─────┘      └─────┬─────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Destinations     │
                    │  (Database, API,  │
                    │  Another Stream,  │
                    │  Alerting)        │
                    └───────────────────┘
```

## Step-by-Step Stream Processing Implementation

### 1. Design Event Schemas

Well-designed schemas make stream processing reliable and evolvable:

```json
// Example: CloudEvents-compliant event schema
{
  "specversion": "1.0",
  "type": "order.placed",
  "source": "payment-service",
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "time": "2024-06-25T14:30:00Z",
  "datacontenttype": "application/json",
  "data": {
    "order_id": "ORD-12345",
    "customer_id": "CUST-987",
    "items": [
      {"sku": "SKU-001", "quantity": 2, "price": 29.99}
    ],
    "total": 59.98,
    "currency": "USD",
    "shipping_address": {
      "country": "US",
      "zip": "10001"
    }
  },
  "traceparent": "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01"
}
```

**Schema design principles:**

| Principle | Why It Matters |
|-----------|---------------|
| **Immutable events** | Events represent something that happened; they do not change |
| **Self-describing** | Include all context needed to process (do not require lookups) |
| **UTC timestamps** | Event time is critical for windowing and ordering |
| **Unique IDs** | Enables idempotency and deduplication |
| **Correlation IDs** | Trace events through multiple processing stages |
| **Schema registry** | Enforce compatibility (Avro, Protobuf, JSON Schema) |

```python
# Example: Schema validation with JSON Schema
from jsonschema import validate, ValidationError
import json

ORDER_PLACED_SCHEMA = {
    "type": "object",
    "required": ["specversion", "type", "source", "id", "time", "data"],
    "properties": {
        "specversion": {"type": "string", "enum": ["1.0"]},
        "type": {"type": "string"},
        "source": {"type": "string"},
        "id": {"type": "string", "format": "uuid"},
        "time": {"type": "string", "format": "date-time"},
        "data": {
            "type": "object",
            "required": ["order_id", "customer_id", "total"],
            "properties": {
                "order_id": {"type": "string"},
                "customer_id": {"type": "string"},
                "total": {"type": "number", "minimum": 0},
                "currency": {"type": "string", "enum": ["USD", "EUR", "GBP"]}
            }
        }
    }
}

def validate_event(event):
    try:
        validate(instance=event, schema=ORDER_PLACED_SCHEMA)
        return True, None
    except ValidationError as e:
        return False, str(e)
```

### 2. Implement Kafka Streams

Kafka Streams is the simplest option for Kafka-centric architectures:

```java
// Example: Kafka Streams application for order analytics
public class OrderAnalyticsApp {
    
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "order-analytics");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
        props.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, 
            Serdes.String().getClass().getName());
        props.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, 
            Serdes.String().getClass().getName());
        
        StreamsBuilder builder = new StreamsBuilder();
        
        // Read order events
        KStream<String, Order> orders = builder.stream("orders",
            Consumed.with(Serdes.String(), new OrderSerde()));
        
        // Filter high-value orders
        KStream<String, Order> highValueOrders = orders
            .filter((key, order) -> order.getTotal() > 100.0);
        
        // Enrich with customer data (KTable lookup)
        KTable<String, Customer> customers = builder.table("customers",
            Consumed.with(Serdes.String(), new CustomerSerde()));
        
        KStream<String, EnrichedOrder> enrichedOrders = highValueOrders
            .leftJoin(customers, (order, customer) -> new EnrichedOrder(order, customer));
        
        // Write to output topic
        enrichedOrders.to("enriched-orders",
            Produced.with(Serdes.String(), new EnrichedOrderSerde()));
        
        // Tumbling window: revenue per category per hour
        orders
            .groupBy((key, order) -> order.getCategory())
            .windowedBy(TimeWindows.of(Duration.ofHours(1)))
            .aggregate(
                () -> 0.0,
                (key, order, total) -> total + order.getTotal(),
                Materialized.with(Serdes.String(), Serdes.Double())
            )
            .toStream()
            .to("hourly-revenue-by-category");
        
        KafkaStreams streams = new KafkaStreams(builder.build(), props);
        streams.start();
        
        Runtime.getRuntime().addShutdownHook(new Thread(streams::close));
    }
}
```

**Kafka Streams patterns:**

| Pattern | Description | Use Case |
|---------|-------------|----------|
| **KStream → KStream** | Event-to-event transformation | Filtering, mapping, branching |
| **KStream → KTable** | Aggregation into state | Counting, summing, grouping |
| **KTable → KStream** | Changelog output | Publishing updated aggregates |
| **KStream + KTable** | Stream enrichment | Lookup joins with reference data |
| **KStream + KStream** | Stream join | Matching events from two streams |
| **Windowed aggregation** | Time-bounded grouping | Hourly metrics, session analysis |

### 3. Implement Apache Flink

Flink is the most capable engine for complex stream processing:

```java
// Example: Flink job for real-time fraud detection
public class FraudDetectionJob {
    
    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env = 
            StreamExecutionEnvironment.getExecutionEnvironment();
        
        // Configure checkpointing for exactly-once
        env.enableCheckpointing(60000);  // 60-second checkpoints
        env.getCheckpointConfig().setCheckpointingMode(
            CheckpointingMode.EXACTLY_ONCE);
        env.getCheckpointConfig().setMinPauseBetweenCheckups(30000);
        
        // Kafka source with event-time watermarking
        KafkaSource<Transaction> source = KafkaSource.<Transaction>builder()
            .setBootstrapServers("kafka:9092")
            .setTopics("transactions")
            .setGroupId("fraud-detection")
            .setStartingOffsets(OffsetsInitializer.latest())
            .setValueOnlyDeserializer(new TransactionDeserializationSchema())
            .build();
        
        DataStream<Transaction> transactions = env.fromSource(
            source,
            WatermarkStrategy.<Transaction>forBoundedOutOfOrderness(
                Duration.ofSeconds(30))
                .withTimestampAssigner((transaction, timestamp) -> 
                    transaction.getTimestamp()),
            "Transactions"
        );
        
        // Keyed stream by account for per-account state
        DataStream<Alert> alerts = transactions
            .keyBy(Transaction::getAccountId)
            .process(new FraudDetectionFunction());
        
        // Sink alerts to Kafka
        KafkaSink<Alert> sink = KafkaSink.<Alert>builder()
            .setBootstrapServers("kafka:9092")
            .setRecordSerializer(
                KafkaRecordSerializationSchema.builder()
                    .setTopic("fraud-alerts")
                    .setValueSerializationSchema(new AlertSerializationSchema())
                    .build()
            )
            .setDeliveryGuarantee(DeliveryGuarantee.EXACTLY_ONCE)
            .build();
        
        alerts.sinkTo(sink);
        env.execute("Fraud Detection");
    }
    
    // Stateful fraud detection function
    public static class FraudDetectionFunction 
            extends KeyedProcessFunction<String, Transaction, Alert> {
        
        private ValueState<Double> lastAmountState;
        private ValueState<Long> lastTimestampState;
        private ListState<Transaction> recentTransactionsState;
        
        @Override
        public void open(Configuration parameters) {
            lastAmountState = getRuntimeContext().getState(
                new ValueStateDescriptor<>("lastAmount", Types.DOUBLE));
            lastTimestampState = getRuntimeContext().getState(
                new ValueStateDescriptor<>("lastTimestamp", Types.LONG));
            recentTransactionsState = getRuntimeContext().getListState(
                new ListStateDescriptor<>("recentTxns", Transaction.class));
        }
        
        @Override
        public void processElement(Transaction txn, Context ctx, Collector<Alert> out) 
                throws Exception {
            
            Double lastAmount = lastAmountState.value();
            Long lastTimestamp = lastTimestampState.value();
            
            // Rule 1: Amount spike (>3x previous)
            if (lastAmount != null && txn.getAmount() > lastAmount * 3) {
                out.collect(new Alert(txn.getAccountId(), "AMOUNT_SPIKE", 
                    txn.getAmount(), txn.getTimestamp()));
            }
            
            // Rule 2: Velocity (3+ transactions in 1 minute)
            recentTransactionsState.add(txn);
            long oneMinuteAgo = txn.getTimestamp() - 60000;
            
            Iterable<Transaction> recent = recentTransactionsState.get();
            int count = 0;
            for (Transaction t : recent) {
                if (t.getTimestamp() > oneMinuteAgo) count++;
            }
            
            if (count >= 3) {
                out.collect(new Alert(txn.getAccountId(), "VELOCITY", 
                    txn.getAmount(), txn.getTimestamp()));
            }
            
            // Update state
            lastAmountState.update(txn.getAmount());
            lastTimestampState.update(txn.getTimestamp());
        }
    }
}
```

**Flink patterns:**

| Pattern | API | Use Case |
|---------|-----|----------|
| **Windowed aggregation** | `keyBy(...).window(...).aggregate(...)` | Hourly metrics, daily summaries |
| **Event-time windows** | `WatermarkStrategy.forBoundedOutOfOrderness(...)` | Correct results despite late events |
| **Stateful operators** | `ValueState`, `ListState`, `MapState` | Session tracking, fraud detection |
| **Async I/O** | `AsyncDataStream.unorderedWait(...)` | Enriching with external API calls |
| **CEP (Complex Event Processing)** | `CEP.pattern(...)` | Multi-event pattern matching |
| **Side outputs** | `OutputTag` + `ctx.output(...)` | Dead letter queue, late data handling |

### 4. Handle State and Fault Tolerance

State is the hardest part of stream processing:

```java
// Example: Flink state backend configuration
StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

// Options: MemoryStateBackend, FsStateBackend, RocksDBStateBackend
env.setStateBackend(new EmbeddedRocksDBStateBackend());
env.getCheckpointConfig().setCheckpointStorage("hdfs://namenode:8020/flink/checkpoints");

// State TTL (time-to-live) for garbage collection
StateTtlConfig ttlConfig = StateTtlConfig
    .newBuilder(Time.hours(24))
    .setUpdateType(StateTtlConfig.UpdateType.OnCreateAndWrite)
    .setStateVisibility(StateTtlConfig.StateVisibility.NeverReturnExpired)
    .cleanupFullSnapshot()
    .build();

ValueStateDescriptor<MyState> descriptor = new ValueStateDescriptor<>("myState", MyState.class);
descriptor.enableTimeToLive(ttlConfig);
```

**State management strategies:**

| Strategy | Best For | Trade-off |
|----------|----------|-----------|
| **In-memory (HashMap)** | Small state, short windows | Fast, but lost on failure |
| **RocksDB** | Large state, long windows | Slower, but scales to TBs |
| **External store** | Shared state across jobs | Adds latency and complexity |
| **Incremental checkpoints** | Large state changes slowly | Reduces checkpoint time |

### 5. Implement Exactly-Once Processing

Exactly-once semantics ensure each event is processed once despite failures:

```java
// Kafka + Flink exactly-once setup
Properties props = new Properties();
props.put("bootstrap.servers", "kafka:9092");
props.put("group.id", "exactly-once-job");

// Producer config for idempotent writes
props.put("enable.idempotence", "true");
props.put("acks", "all");
props.put("retries", Integer.MAX_VALUE);
props.put("max.in.flight.requests.per.connection", "5");

// Flink exactly-once configuration
env.enableCheckpointing(60000);
env.getCheckpointConfig().setCheckpointingMode(CheckpointingMode.EXACTLY_ONCE);
env.getCheckpointConfig().setMaxConcurrentCheckpoints(1);
env.getCheckpointConfig().enableExternalizedCheckpoints(
    ExternalizedCheckpointCleanup.RETAIN_ON_CANCELLATION);

// Sink with transactional writes
FlinkKafkaProducer<String> kafkaSink = new FlinkKafkaProducer<>(
    "output-topic",
    new SimpleStringSchema(),
    props,
    FlinkKafkaProducer.Semantic.EXACTLY_ONCE
);
```

**Delivery guarantees:**

| Guarantee | Behavior | Use Case |
|-----------|----------|----------|
| **At-most-once** | Events may be lost | Non-critical metrics, logs |
| **At-least-once** | Events may be duplicated | Most analytics, counting |
| **Exactly-once** | No loss, no duplicates | Financial transactions, billing |

## Best Practices

- **Use event time, not processing time.** Processing time is unreliable across restarts and replays. Event time with watermarks gives correct results.
- **Keep state bounded.** Use TTL, window expiration, and periodic cleanup to prevent unbounded state growth.
- **Idempotent sinks.** Even with exactly-once, design your downstream consumers to handle duplicates gracefully.
- **Monitor lag.** Consumer lag is the primary operational metric for stream processing health.
- **Test with replay.** Replay historical events through your job to validate correctness and performance.
- **Schema evolution.** Use Confluent Schema Registry or similar to enforce backward/forward compatibility.

## Common Mistakes

- **Processing-time windows.** Results differ on every replay. Always use event time for aggregations.
- **Unbounded state growth.** Forgetting to set TTL on state leads to OOM crashes after days or weeks.
- **Ignoring backpressure.** When consumers cannot keep up, data loss or cascading failures occur. Monitor and scale.
- **No dead letter queue.** Invalid events should not crash the pipeline. Route them to a DLQ for inspection.
- **Stateful operations without checkpoints.** A job restart loses all state and must reprocess from the beginning.
- **Kafka auto.offset.reset=latest.** This silently skips data on new consumer groups. Use earliest or explicit offsets.

## Variants

- **Kafka Streams:** Embedded library, no separate cluster — best for simple transformations on Kafka
- **Flink:** Full-featured stream processor — best for complex event time processing and stateful operations
- **Spark Streaming:** Micro-batch processing — best for teams already using Spark, or when batch+streaming unification matters
- **ksqlDB:** SQL interface over Kafka Streams — best for declarative stream processing without Java
- **Pulsar Functions:** Lightweight compute on Apache Pulsar — best for Pulsar-centric architectures

## FAQ

**Q: Should I use Kafka Streams or Flink?**
Use Kafka Streams if your logic is simple (filter, map, aggregate) and you are already Kafka-centric. Use Flink for complex windowing, event-time semantics, CEP, or when you need to process from multiple sources beyond Kafka.

**Q: How do I handle late-arriving events?**
Use watermarks with allowed lateness. Flink supports `allowedLateness()` on windows. Kafka Streams supports grace periods. Events arriving after the grace period go to a side output or are dropped.

**Q: What is the difference between stream processing and real-time analytics?**
Stream processing is the engine that transforms events. Real-time analytics is the end-to-end system that includes collection, processing, storage, and visualization. Stream processing feeds into real-time analytics.

**Q: Can I use SQL for stream processing?**
Yes. Flink SQL, ksqlDB, and Spark Structured Streaming all support SQL over streams. These are excellent for simple aggregations and joins. Complex stateful logic still requires the DataStream/functional API.

## Conclusion

Stream processing enables systems that react to events as they happen. By choosing the right engine, designing immutable event schemas, managing state carefully, and implementing exactly-once semantics, you build pipelines that process millions of events per second with correctness guarantees.

## Related Resources

- [Real-Time Analytics](/guides/data/real-time-analytics-guide)
- [ETL Pipelines](/guides/data/etl-pipeline-guide)
- [Message Queues](/guides/messaging/message-queues-guide)
- [Event-Driven Architecture](/guides/architecture/event-driven-guide)
- [Metrics and Dashboards](/guides/observability/metrics-and-dashboards-guide)
