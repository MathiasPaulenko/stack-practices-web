---


contentType: guides
slug: real-time-analytics-guide
title: "Real-Time Analytics: From Events to Dashboards in Seconds"
description: "A practical guide to real-time analytics: event collection, stream processing, data warehousing, and building sub-second dashboards with Kafka, ClickHouse, Druid, and modern OLAP databases."
metaDescription: "Learn real-time analytics: event collection, stream processing, data warehousing, and building sub-second dashboards with Kafka, ClickHouse, Druid, and OLAP."
difficulty: advanced
topics:
  - data
  - performance
  - architecture
tags:
  - real-time-analytics
  - streaming
  - clickhouse
  - druid
  - kafka
  - olap
  - guide
relatedResources:
  - /guides/stream-processing-guide
  - /guides/etl-pipeline-guide
  - /guides/metrics-and-dashboards-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn real-time analytics: event collection, stream processing, data warehousing, and building sub-second dashboards with Kafka, ClickHouse, Druid, and OLAP."
  keywords:
    - real-time-analytics
    - streaming
    - clickhouse
    - druid
    - kafka
    - olap
    - guide


---

## Overview

Real-time analytics processes data as it arrives, delivering insights within seconds rather than hours or days. Unlike batch analytics that runs overnight, real-time systems ingest events, compute aggregations on the fly, and update dashboards continuously. This enables immediate operational decisions: fraud detection, live user behavior analysis, IoT monitoring, and real-time personalization.

The following guide covers event collection, stream processing, OLAP databases, and dashboard design for sub-second analytics.

## When to Use


- For alternatives, see [Complete Guide to LLM Application Architecture](/guides/complete-guide-llm-application-architecture/).

- You need to detect anomalies or fraud within seconds of events occurring
- Business operations depend on minute-by-minute visibility (trading, logistics, gaming)
- Users expect live dashboards that update without manual refresh
- IoT devices stream telemetry that requires immediate response
- Personalization engines need current user behavior, not yesterday's data
- Batch latency (hours) causes missed opportunities or delayed reactions

## When NOT to Use

- Historical trend analysis where minutes of delay are acceptable. Batch ETL is simpler
- Complex multi-table joins across petabytes. Pre-aggregation may be needed
- Regulatory reporting requiring full audit trails and reconciliation. Batch is more reliable
- Your data volume is small enough that PostgreSQL queries complete in seconds on raw data

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Event Stream** | Continuous flow of events from producers to consumers |
| **OLAP** | Online Analytical Processing — databases optimized for read-heavy aggregations |
| **Materialized View** | Precomputed query result that updates incrementally |
| **Windowing** | Grouping stream events into time-based buckets for aggregation |
| **Exactly-Once Semantics** | Guarantee that each event is processed once despite failures |
| **Backpressure** | Handling cases where consumers cannot keep up with producers |

## Real-Time Analytics Architecture

```
┌─────────────┐
│   Events    │  (Click, purchase, sensor reading, API call)
└──────┬──────┘
       │
┌──────▼──────┐
│   Kafka /   │  (Event streaming, buffering, replay)
│   Kinesis   │
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
┌──▼──┐ ┌──▼──┐
│Flink│ │Spark│  (Stream processing, aggregations)
│/Kafka│ │Stream│
│Streams│ │     │
└──┬──┘ └──┬──┘
   │       │
   └───┬───┘
       │
┌──────▼──────┐
│ClickHouse / │  (OLAP storage, sub-second queries)
│Druid /      │
│Apache Pinot│
└──────┬──────┘
       │
┌──────▼──────┐
│ Dashboards  │  (Grafana, Superset, custom UI)
│   & APIs    │
└─────────────┘
```

## Step-by-Step Real-Time Analytics Implementation

### 1. Collect Events

Instrument your applications to emit structured events:

```python
# Example: Python event producer with Kafka
from kafka import KafkaProducer
import json
import time

producer = KafkaProducer(
    bootstrap_servers=['kafka:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    acks='all',           # Wait for all replicas
    retries=3,
    max_block_ms=1000    # Fail fast if Kafka is unavailable
)

def track_event(event_type, user_id, properties, timestamp=None):
    """Emit a structured analytics event."""
    event = {
        'event_type': event_type,
        'user_id': user_id,
        'timestamp': timestamp or time.time(),
        'properties': properties,
        'session_id': properties.get('session_id'),
        'device': properties.get('device'),
        'country': properties.get('country')
    }
    
    # Send to Kafka (non-blocking with callback)
    future = producer.send('events', key=str(user_id).encode(), value=event)
    
    # Optional: Add callback for delivery confirmation
    future.add_callback(
        lambda metadata: print(f"Sent to {metadata.topic} partition {metadata.partition}"
    ))
    future.add_errback(
        lambda exc: print(f"Failed to send: {exc}"
    ))

# Usage
track_event('product_viewed', user_id=12345, properties={
    'product_id': 'sku-789',
    'category': 'electronics',
    'price': 299.99,
    'session_id': 'sess-abc',
    'device': 'mobile'
})
```

```javascript
// Example: Browser event tracking (lightweight)
function trackEvent(eventType, properties) {
    const event = {
        event_type: eventType,
        timestamp: Date.now(),
        url: window.location.href,
        user_id: getUserId(),
        session_id: getSessionId(),
        properties: properties
    };
    
    // Send via Beacon API (survives page unload)
    navigator.sendBeacon('/analytics/collect', JSON.stringify(event));
}

// Usage
trackEvent('button_clicked', { button_id: 'checkout', page: 'cart' });
```

#### Event Schema Guidelines

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event_type` | String | Yes | Categorical event name (product_viewed, purchase) |
| `timestamp` | Number | Yes | Unix timestamp with millisecond precision |
| `user_id` | String | Yes | Unique user identifier (hashed for privacy) |
| `session_id` | String | No | Groups events into user sessions |
| `properties` | Object | No | Event-specific data (product_id, amount, category) |
| `device` | String | No | mobile, desktop, tablet |
| `country` | String | No | ISO country code for geo analytics |

### 2. Process Streams with Windowing

Compute aggregations over sliding or tumbling time windows:

```java
// Example: Kafka Streams for real-time aggregations
StreamsBuilder builder = new StreamsBuilder();

KStream<String, Event> events = builder.stream("events",
    Consumed.with(Serdes.String(), eventSerde));

// Tumbling window: 1-minute buckets
KTable<Windowed<String>, Long> pageViewsPerMinute = events
    .filter((key, event) -> "page_viewed".equals(event.getEventType()))
    .groupBy((key, event) -> event.getProperties().get("page_id"))
    .windowedBy(TimeWindows.of(Duration.ofMinutes(1)))
    .count(Materialized.as("page-view-counts"));

// Sliding window: last 5 minutes, updated every 10 seconds
KTable<Windowed<String>, Double> avgResponseTime = events
    .filter((key, event) -> "api_call".equals(event.getEventType()))
    .groupBy((key, event) -> event.getProperties().get("endpoint"))
    .windowedBy(SlidingWindows.ofTimeDifferenceWithNoGrace(Duration.ofMinutes(5)))
    .aggregate(
        () -> new ResponseTimeStats(),
        (key, event, stats) -> stats.add(event.getProperties().get("response_time")),
        Materialized.as("response-time-stats")
    )
    .mapValues(ResponseTimeStats::getAverage);

// Write results to output topic
pageViewsPerMinute.toStream()
    .to("analytics.page_views_per_minute", Produced.with(windowedSerde, Serdes.Long()));
```

```python
# Example: Flink SQL for stream processing
from pyflink.table import StreamTableEnvironment
from pyflink.datastream import StreamExecutionEnvironment

env = StreamExecutionEnvironment.get_execution_environment()
t_env = StreamTableEnvironment.create(env)

# Define Kafka source
t_env.execute_sql("""
    CREATE TABLE events (
        event_type STRING,
        user_id STRING,
        timestamp TIMESTAMP(3),
        properties MAP<STRING, STRING>,
        WATERMARK FOR timestamp AS timestamp - INTERVAL '5' SECOND
    ) WITH (
        'connector' = 'kafka',
        'topic' = 'events',
        'properties.bootstrap.servers' = 'kafka:9092',
        'format' = 'json'
    )
""")

# Tumbling window aggregation
t_env.execute_sql("""
    CREATE TABLE page_views_per_minute (
        page_id STRING,
        view_count BIGINT,
        window_start TIMESTAMP(3),
        window_end TIMESTAMP(3),
        PRIMARY KEY (page_id, window_start, window_end) NOT ENFORCED
    ) WITH (
        'connector' = 'jdbc',
        'url' = 'jdbc:clickhouse://clickhouse:8123/analytics',
        'table-name' = 'page_views_per_minute',
        'driver' = 'ru.yandex.clickhouse.ClickHouseDriver'
    )
""")

t_env.execute_sql("""
    INSERT INTO page_views_per_minute
    SELECT 
        properties['page_id'] as page_id,
        COUNT(*) as view_count,
        TUMBLE_START(timestamp, INTERVAL '1' MINUTE) as window_start,
        TUMBLE_END(timestamp, INTERVAL '1' MINUTE) as window_end
    FROM events
    WHERE event_type = 'page_viewed'
    GROUP BY 
        properties['page_id'],
        TUMBLE(timestamp, INTERVAL '1' MINUTE)
""")
```

#### Window Types

| Window Type | Behavior | Use Case |
|-------------|----------|----------|
| **Tumbling** | Fixed-size, non-overlapping | Hourly metrics, daily counts |
| **Sliding** | Fixed-size, overlapping | Moving averages, trend detection |
| **Session** | Variable, gaps of inactivity | User session analysis, funnel tracking |
| **Global** | All events, triggered manually | Cumulative counters, state machines |
| **Watermark** | Handles late-arriving events | Out-of-order event streams |

### 3. Store in OLAP Database

Choose a columnar database optimized for analytical queries:

```sql
-- Example: ClickHouse table for event analytics
CREATE TABLE events (
    event_type LowCardinality(String),
    user_id UInt64,
    timestamp DateTime64(3),
    session_id UUID,
    properties String,  -- JSON as String, parse with JSONExtract
    device LowCardinality(String),
    country LowCardinality(String),
    page_id LowCardinality(String),
    product_id LowCardinality(String),
    amount Decimal(10, 2)
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (event_type, timestamp, user_id)
TTL timestamp + INTERVAL 90 DAY;  -- Auto-delete old data

-- Materialized view for pre-aggregated page views
CREATE MATERIALIZED VIEW page_views_hourly
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMMDD(hour)
ORDER BY (page_id, hour)
AS SELECT
    toStartOfHour(timestamp) as hour,
    page_id,
    count() as views,
    uniqExact(user_id) as unique_users
FROM events
WHERE event_type = 'page_viewed'
GROUP BY hour, page_id;

-- Query pre-aggregated data (sub-second)
SELECT 
    hour,
    page_id,
    views,
    unique_users
FROM page_views_hourly
WHERE hour >= now() - INTERVAL 24 HOUR
ORDER BY hour DESC, views DESC
LIMIT 100;
```

```sql
-- Example: Apache Druid ingestion spec
{
  "type": "kafka",
  "spec": {
    "dataSchema": {
      "dataSource": "events",
      "timestampSpec": {
        "column": "timestamp",
        "format": "iso"
      },
      "dimensionsSpec": {
        "dimensions": [
          "event_type",
          "user_id",
          "session_id",
          "device",
          "country",
          "page_id",
          "product_id",
          "category"
        ]
      },
      "metricsSpec": [
        { "type": "count", "name": "count" },
        { "type": "doubleSum", "name": "amount", "fieldName": "amount" },
        { "type": "thetaSketch", "name": "unique_users", "fieldName": "user_id" }
      ],
      "granularitySpec": {
        "type": "uniform",
        "segmentGranularity": "HOUR",
        "queryGranularity": "MINUTE"
      }
    }
  }
}
```

#### OLAP Database Comparison

| Feature | ClickHouse | Apache Druid | Apache Pinot | BigQuery | Snowflake |
|---------|------------|--------------|--------------|----------|-----------|
| **Latency** | Sub-second | Sub-second | Sub-second | 1-5 seconds | 1-10 seconds |
| **Self-hosted** | Yes | Yes | Yes | No | No |
| **Streaming ingest** | Native | Native | Native | Streaming API | Snowpipe |
| **SQL support** | Full | Druid SQL | Pinot SQL | Full | Full |
| **Updates/deletes** | Limited | Limited | Limited | Full | Full |
| **Best for** | Time-series | Multi-tenant | User-facing | Ad-hoc | Enterprise |
| **Cost model** | Hardware | Hardware | Hardware | Query-based | Storage + compute |

### 4. Build Real-Time Dashboards

Query OLAP databases for live visualizations:

```sql
-- Grafana-compatible ClickHouse queries

-- Real-time active users (last 5 minutes)
SELECT 
    toStartOfMinute(timestamp) as minute,
    uniqExact(user_id) as active_users
FROM events
WHERE timestamp >= now() - INTERVAL 5 MINUTE
GROUP BY minute
ORDER BY minute;

-- Top products by revenue (last hour)
SELECT 
    product_id,
    sum(amount) as revenue,
    count() as orders
FROM events
WHERE event_type = 'purchase'
  AND timestamp >= now() - INTERVAL 1 HOUR
GROUP BY product_id
ORDER BY revenue DESC
LIMIT 10;

-- Conversion funnel (last 30 minutes)
SELECT 
    event_type,
    count() as events,
    uniqExact(user_id) as unique_users
FROM events
WHERE event_type IN ('product_viewed', 'added_to_cart', 'checkout_started', 'purchase')
  AND timestamp >= now() - INTERVAL 30 MINUTE
GROUP BY event_type
ORDER BY 
    multiIf(
        event_type = 'product_viewed', 1,
        event_type = 'added_to_cart', 2,
        event_type = 'checkout_started', 3,
        event_type = 'purchase', 4,
        5
    );

-- Geo distribution of current traffic
SELECT 
    country,
    count() as requests,
    uniqExact(user_id) as unique_users
FROM events
WHERE timestamp >= now() - INTERVAL 5 MINUTE
GROUP BY country
ORDER BY requests DESC
LIMIT 20;
```

#### Dashboard Design for Real-Time

| Pattern | Query Strategy | Refresh Rate |
|---------|---------------|--------------|
| **Live counters** | `SELECT count() FROM events WHERE timestamp > now() - 5m` | 5-10 seconds |
| **Time series** | Pre-aggregated materialized view | 10-30 seconds |
| **Top-N lists** | `ORDER BY metric DESC LIMIT 10` | 30-60 seconds |
| **Funnel analysis** | Multi-stage filtering with window functions | 1-5 minutes |
| **Anomaly alerts** | Statistical anomaly detection on aggregates | 1 minute |

## What works

- Use event-time, not processing-time. Clock skew and late arrivals make processing-time unreliable. Watermarks handle late data gracefully.
- Pre-aggregate where possible. Materialized views in ClickHouse or Druid aggregations reduce query cost by 1000×.
- Choose the right window size. Too small = noisy; too large = delayed insights. Start with 1-minute tumbling windows.
- Handle backpressure. If consumers lag, scale horizontally or use sampling (process 10% of events) rather than dropping data.
- Schema evolution with care. Adding fields is easy; removing or changing types requires reprocessing or dual schemas.
- Monitor end-to-end latency. From event generation to dashboard display. Alert if latency exceeds your SLA.

## Common Mistakes

- Using transactional databases for analytics. PostgreSQL/MySQL cannot handle high-cardinality aggregations at scale.
- No event schema validation. Invalid events silently break downstream aggregations.
- Processing-time instead of event-time. Dashboards show "now" but events are from 5 minutes ago due to network delays.
- Over-engineering for small scale. If you have <100 events/second, PostgreSQL with proper indexes may be sufficient.
- Ignoring late data. Without watermarks, late events corrupt windowed aggregates or are dropped.
- Not setting TTL. Unbounded data growth destroys query performance and storage budgets.

## Variants

- Lambda architecture: Batch layer (Hadoop/Spark) + speed layer (Storm/Flink). Complex, largely replaced
- Kappa architecture: Pure streaming with reprocessing capability. Simpler, preferred today
- Hybrid batch+streaming: Flink/Spark for complex aggregations, materialized views for simple counts
- Cloud-native: Kinesis + Athena, Pub/Sub + BigQuery, Event Hubs + Synapse. Fully managed

## FAQ

**Q: How real-time is "real-time"?**
True real-time is <1 second from event to insight. Near real-time is 1-60 seconds. The architecture and cost differ considerably.

**Q: Can I use Elasticsearch for real-time analytics?**
Yes, for text-heavy, low-cardinality aggregations. For high-cardinality numeric aggregations (billions of events), ClickHouse/Druid are 10-100× faster.

**Q: How do I handle late-arriving events?**
Use watermarks (Flink/Kafka Streams) or late-data handling (Druid/ClickHouse). A 5-minute watermark allows events up to 5 minutes late to be included in the correct window.

**Q: What is the difference between stream processing and real-time analytics?**
Stream processing is the computation layer (Flink, Kafka Streams). Real-time analytics is the end-to-end system including collection, processing, storage, and visualization.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.

## Conclusion

Real-time analytics turns event streams into timely intelligence within seconds. By instrumenting applications with structured events, processing them through windowed aggregations, and storing results in OLAP databases, you build systems that react to the present rather than reporting on the past.

