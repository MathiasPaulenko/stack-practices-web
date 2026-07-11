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

Time-series databases (TSDBs) are optimized for workloads where data is indexed primarily by time: metrics, IoT sensor readings, application logs, financial tick data, and system monitoring. Unlike general-purpose databases, TSDBs use the immutable, append-only nature of time-series data to achieve massive ingestion throughput and efficient time-range queries. Specialized engines like InfluxDB, TimescaleDB, and ClickHouse each offer different trade-offs between ease of use, SQL compatibility, and raw performance.

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

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.


## Advanced Topics

### Detailed Scenario: IoT Monitoring with TimescaleDB

```text
System: 10,000 IoT sensor monitoring (TimescaleDB on PostgreSQL)
Volume: 100,000 readings/second, 8.6B readings/day
Requirements: Real-time alerts, historical dashboards, downsampling

Schema:
  CREATE EXTENSION IF NOT EXISTS timescaledb;

  CREATE TABLE sensor_readings (
      time TIMESTAMPTZ NOT NULL,
      sensor_id INT NOT NULL,
      temperature DOUBLE PRECISION,
      humidity DOUBLE PRECISION,
      pressure DOUBLE PRECISION,
      battery_level DOUBLE PRECISION
  );

  SELECT create_hypertable("sensor_readings",
      "time", chunk_time_interval => INTERVAL "6 hours");

  CREATE INDEX idx_sensor_time ON sensor_readings(sensor_id, time DESC);

Ingestion:
  INSERT INTO sensor_readings (time, sensor_id, temperature, humidity, pressure)
  SELECT
      NOW() - (generate_series(1, 10000) * INTERVAL "1 second"),
      (random() * 10000)::INT,
      20 + random() * 15,
      40 + random() * 20,
      1013 + random() * 10;
  -- Throughput: 100K rows/sec on commodity hardware

Continuous aggregates (downsampling):
  CREATE MATERIALIZED VIEW sensor_1m
  WITH (timescaledb.continuous) AS
  SELECT
      time_bucket("1 minute", time) AS bucket,
      sensor_id,
      AVG(temperature) AS avg_temp,
      MAX(temperature) AS max_temp,
      MIN(temperature) AS min_temp,
      AVG(humidity) AS avg_humidity
  FROM sensor_readings
  GROUP BY bucket, sensor_id
  WITH NO DATA;

  CREATE MATERIALIZED VIEW sensor_1h
  WITH (timescaledb.continuous) AS
  SELECT
      time_bucket("1 hour", time) AS bucket,
      sensor_id,
      AVG(temperature) AS avg_temp,
      MAX(temperature) AS max_temp,
      MIN(temperature) AS min_temp,
      COUNT(*) AS sample_count
  FROM sensor_readings
  GROUP BY bucket, sensor_id
  WITH NO DATA;

Retention policies:
  SELECT add_retention_policy("sensor_readings", INTERVAL "7 days");
  SELECT add_retention_policy("sensor_1m", INTERVAL "90 days");
  SELECT add_retention_policy("sensor_1h", INTERVAL "5 years");

Typical queries:
  -- Latest reading per sensor
  SELECT DISTINCT ON (sensor_id)
      sensor_id, time, temperature, humidity
  FROM sensor_readings
  ORDER BY sensor_id, time DESC;

  -- Alert: sensors with temp > 35C in last 10 min
  SELECT sensor_id, MAX(temperature) AS max_temp
  FROM sensor_readings
  WHERE time > NOW() - INTERVAL "10 minutes"
    AND temperature > 35
  GROUP BY sensor_id
  ORDER BY max_temp DESC;

Tiered storage:
  | Level | Data | Retention | Size |
  |-------|------|-----------|------|
  | Raw | All readings | 7 days | 50GB |
  | 1-min | Per-minute aggregates | 90 days | 5GB |
  | 1-hour | Per-hour aggregates | 5 years | 1GB |

Performance:
  | Query | Time | Rows scanned |
  |-------|------|-------------|
  | Latest reading (1 sensor) | 2ms | 1 |
  | Real-time alerts (10 min) | 15ms | ~6M |
  | 24h dashboard (1 sensor) | 8ms | 24 (from aggregate) |
  | 30-day dashboard (all) | 120ms | 720 (from aggregate) |

Lessons learned:
  - TimescaleDB gives TSDB performance without leaving PostgreSQL
  - Continuous aggregates eliminate need for pre-computation jobs
  - Tiered retention saves storage dramatically
  - chunk_time_interval should align with query patterns
```

### How do I handle backfill of historical data?

TimescaleDB supports out-of-order inserts. For bulk backfill, temporarily disable retention policies, insert in batches of 100K rows, and re-enable. Continuous aggregates update automatically. In InfluxDB, use the correct timePrecision and avoid high-cardinality tags during backfill. In ClickHouse, insert into date-partitioned tables to optimize merges.


















End of document. Review and update quarterly.