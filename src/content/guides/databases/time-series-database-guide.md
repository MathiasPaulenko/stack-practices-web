---
contentType: guides
slug: time-series-database-guide
title: "Time-Series Databases — InfluxDB, TimescaleDB, and ClickHouse"
description: "A practical guide to time-series databases: when to use a specialized TSDB, data model, retention policies, and choosing between InfluxDB, TimescaleDB, and ClickHouse."
metaDescription: "Learn time-series databases: when to use a TSDB, data model, retention policies. Compare InfluxDB, TimescaleDB, and ClickHouse with practical examples."
difficulty: intermediate
topics:
  - databases
  - performance
tags:
  - time-series
  - influxdb
  - timescaledb
  - clickhouse
  - iot
  - metrics
  - retention-policy
  - guide
relatedResources:
  - /guides/nosql-patterns-guide
  - /guides/sql-performance-tuning-guide
  - /guides/observability-guide
  - /recipes/databases/model-time-series-data
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn time-series databases: when to use a TSDB, data model, retention policies. Compare InfluxDB, TimescaleDB, and ClickHouse with practical examples."
  keywords:
    - time-series
    - influxdb
    - timescaledb
    - clickhouse
    - iot
    - metrics
    - guide
---

## Overview

Time-series databases (TSDBs) are optimized for workloads where data is indexed primarily by time: metrics, IoT sensor readings, application logs, financial tick data, and system monitoring. Unlike general-purpose databases, TSDBs leverage the immutable, append-only nature of time-series data to achieve massive ingestion throughput and efficient time-range queries. Specialized engines like InfluxDB, TimescaleDB, and ClickHouse each offer different trade-offs between ease of use, SQL compatibility, and raw performance.

## When to Use

- You ingest millions of data points per second with a timestamp
- Queries are predominantly time-range scans (`WHERE time > now() - interval '1 day'`)
- Data is append-only and rarely updated after insertion
- Retention policies and downsampling are needed to manage storage
- Aggregation queries (avg, sum, count) over sliding windows are common

## Comparison

| Feature | InfluxDB | TimescaleDB | ClickHouse |
|---------|----------|-------------|------------|
| **Base engine** | Custom (TSM/TSI) | PostgreSQL extension | Columnar OLAP |
| **SQL support** | InfluxQL / Flux | Full SQL | SQL dialect |
| **Ease of setup** | Single binary | PostgreSQL + extension | More complex |
| **Ingestion rate** | Very high | High | Extremely high |
| **Compression** | Good | Good | Excellent |
| **Best for** | DevOps metrics, IoT | Applications already on Postgres | Analytics, big data |

## Data Model (InfluxDB Line Protocol)

```
measurement,tag1=value1,tag2=value2 field1=42.0,field2="text" 1465839830100400200
```

- **Measurement**: Logical container (like a table)
- **Tags**: Indexed metadata dimensions (device ID, region)
- **Fields**: Actual values (temperature, CPU usage)
- **Timestamp**: Nanosecond precision

## TimescaleDB Example

```sql
-- Enable TimescaleDB extension and create hypertable
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE sensor_data (
    time TIMESTAMPTZ NOT NULL,
    sensor_id INT NOT NULL,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION
);

-- Convert to hypertable with 1-day chunks
SELECT create_hypertable('sensor_data', by_range('time', INTERVAL '1 day'));

-- Continuous aggregate for hourly averages
CREATE MATERIALIZED VIEW hourly_avg
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) as bucket,
    sensor_id,
    AVG(temperature) as avg_temp,
    AVG(humidity) as avg_humidity
FROM sensor_data
GROUP BY bucket, sensor_id;

-- Retention policy: drop chunks older than 90 days
SELECT add_retention_policy('sensor_data', INTERVAL '90 days');
```

## ClickHouse Example

```sql
-- Create a MergeTree table for time-series data
CREATE TABLE events (
    event_time DateTime,
    user_id UInt64,
    event_type String,
    value Float64
) ENGINE = MergeTree()
ORDER BY (event_type, event_time);

-- Efficient time-range query
SELECT
    toStartOfHour(event_time) as hour,
    count() as event_count,
    avg(value) as avg_value
FROM events
WHERE event_time > now() - INTERVAL 7 DAY
GROUP BY hour
ORDER BY hour;
```

## Retention and Downsampling

| Strategy | How | Trade-off |
|----------|-----|-----------|
| **Raw retention** | Keep all data for N days | Highest fidelity, highest cost |
| **Downsampling** | Aggregate to lower resolution after N days | Saves storage, loses granularity |
| **Tiered storage** | Move old chunks to cold storage | Slower old queries, cheaper |

```sql
-- InfluxDB: continuous query for downsampling
CREATE CONTINUOUS QUERY "hourly_cpu" ON "monitoring"
BEGIN
    SELECT mean("usage") INTO "downsampled"."autogen"."cpu_1h"
    FROM "monitoring"."autogen"."cpu"
    GROUP BY time(1h),*
END;
```

## Common Mistakes

- **Using a TSDB for transactional workloads** — no ACID, no updates, no referential integrity
- **High-cardinality tags** — too many unique tag values explode memory and index size
- **No retention policy** — time-series data grows indefinitely; always set a retention or archiving strategy
- **Wrong timestamp precision** — nanosecond precision is often overkill and wastes storage
- **Storing non-time-series data in a TSDB** — use the right tool for each workload

## FAQ

**Can I use PostgreSQL for time-series data?**
Yes, with TimescaleDB. For small-scale workloads, vanilla PostgreSQL with proper indexing works. For high ingestion rates, a dedicated TSDB is better.

**How do I handle backfill in a TSDB?**
Most TSDBs support out-of-order writes, but performance may degrade. Batch backfills and use appropriate chunk sizes.

**Should I store tags or fields?**
Tags are indexed; fields are not. Use tags for dimensions you filter or group by. Use fields for values you aggregate.
