---
contentType: patterns
slug: idempotent-load-pattern
title: "Idempotent Load: Re-run Data Loads Safely Without Duplicates"
description: "How to re-run data loads safely without duplicates. Covers deduplication keys, MERGE upserts, load IDs, partition overwrite, and transactional loads."
metaDescription: "Re-run data loads safely without duplicates. Learn deduplication keys, MERGE upserts, load IDs, partition overwrite, and transactional load strategies."
difficulty: intermediate
topics:
  - data
tags:
  - data
  - etl
  - idempotency
  - data-quality
  - pipelines
  - pattern
category: architectural
relatedResources:
  - /patterns/etl-extract-transform-load-pattern
  - /patterns/cdc-change-data-capture-pattern
  - /patterns/data-lineage-tracking-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Re-run data loads safely without duplicates. Learn deduplication keys, MERGE upserts, load IDs, partition overwrite, and transactional load strategies."
  keywords:
    - data
    - etl
    - idempotency
    - data-quality
    - pipelines
    - pattern
---

## Overview

An idempotent load produces the same result whether it runs once or ten times. If a pipeline fails halfway through and you re-run it, the target table should have no duplicates, no orphaned partial data, and no missing rows. This is achieved through deduplication keys, upsert (MERGE) operations, load IDs for tracking, and partition-level overwrite strategies. Idempotent loads are essential for reliable ETL/ELT pipelines — without them, every failure requires manual cleanup and risks data corruption.

## When to Use

- ETL/ELT pipelines that may fail and need re-runs
- Scheduled data loads where duplicates would corrupt analytics
- Data ingestion from external APIs with retry logic
- Any pipeline where data quality is non-negotiable
- Streaming consumers that may process the same message twice

## When NOT to Use

- One-time data migrations (idempotency adds complexity for no benefit)
- Append-only event logs where duplicates are handled downstream
- Prototypes and exploratory data loading

## Solution

### MERGE upsert for idempotent loads

```sql
-- idempotent_upsert.sql — MERGE ensures no duplicates on re-run
MERGE INTO warehouse.customers AS target
USING staging.customers_batch AS source
ON target.id = source.id
WHEN MATCHED THEN
    UPDATE SET
        email = source.email,
        first_name = source.first_name,
        last_name = source.last_name,
        status = source.status,
        updated_at = source.updated_at
WHEN NOT MATCHED THEN
    INSERT (id, email, first_name, last_name, status, created_at, updated_at)
    VALUES (source.id, source.email, source.first_name, source.last_name,
            source.status, source.created_at, source.updated_at);
```

### Python idempotent load with load IDs

```python
# idempotent_load.py — idempotent load with tracking
import pandas as pd
import hashlib
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class IdempotentLoader:
    def __init__(self, warehouse_conn, load_history_table="_load_history"):
        self.warehouse = warehouse_conn
        self.history_table = load_history_table

    def _generate_load_id(self, source_table, batch_date):
        raw = f"{source_table}_{batch_date}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    def _is_already_loaded(self, load_id):
        query = f"SELECT COUNT(*) FROM {self.history_table} WHERE load_id = %s"
        with self.warehouse.cursor() as cur:
            cur.execute(query, (load_id,))
            return cur.fetchone()[0] > 0

    def _record_load(self, load_id, source_table, target_table, row_count):
        query = f"""
            INSERT INTO {self.history_table} (load_id, source_table, target_table, row_count, loaded_at)
            VALUES (%s, %s, %s, %s, %s)
        """
        with self.warehouse.cursor() as cur:
            cur.execute(query, (load_id, source_table, target_table, row_count, datetime.now()))
        self.warehouse.commit()

    def load(self, df, target_table, source_table, batch_date, key_columns=None):
        load_id = self._generate_load_id(source_table, batch_date)

        # Check if already loaded
        if self._is_already_loaded(load_id):
            logger.info(f"Load {load_id} already completed. Skipping.")
            return {"load_id": load_id, "status": "skipped", "rows": 0}

        logger.info(f"Starting load {load_id} for {target_table}")

        # Add load metadata
        df = df.copy()
        df['_load_id'] = load_id
        df['_loaded_at'] = datetime.now()

        # Load to staging table
        staging_table = f"stg_{target_table}_{load_id}"
        df.to_sql(staging_table, self.warehouse, index=False, if_exists='replace')

        # Upsert from staging to target
        key_cols = key_columns or ['id']
        key_list = ', '.join(key_cols)
        set_cols = ', '.join([
            f"{c} = source.{c}" for c in df.columns
            if c not in key_cols and not c.startswith('_')
        ])
        insert_cols = ', '.join([c for c in df.columns if not c.startswith('_')])

        upsert_sql = f"""
            MERGE INTO {target_table} AS target
            USING {staging_table} AS source
            ON {' AND '.join([f'target.{c} = source.{c}' for c in key_cols])}
            WHEN MATCHED THEN UPDATE SET {set_cols}
            WHEN NOT MATCHED THEN INSERT ({insert_cols})
                VALUES ({', '.join([f'source.{c}' for c in df.columns if not c.startswith('_')])})
        """

        with self.warehouse.cursor() as cur:
            cur.execute(upsert_sql)
            row_count = cur.rowcount
            # Clean up staging
            cur.execute(f"DROP TABLE {staging_table}")

        # Record the load
        self._record_load(load_id, source_table, target_table, row_count)

        logger.info(f"Load {load_id} completed: {row_count} rows")
        return {"load_id": load_id, "status": "loaded", "rows": row_count}
```

### Partition overwrite strategy (Spark)

```python
# partition_overwrite.py — idempotent partition overwrite with PySpark
from pyspark.sql import SparkSession
from pyspark.sql.functions import lit, current_timestamp

spark = SparkSession.builder.appName("IdempotentLoad").getOrCreate()

def load_partition(df, table, partition_col, partition_value):
    """Overwrite a single partition — idempotent by design."""
    df_with_partition = df.withColumn(partition_col, lit(partition_value)) \
        .withColumn("_loaded_at", current_timestamp())

    # mode('overwrite') with dynamic partition overwrite
    # only the specific partition is replaced, not the whole table
    spark.conf.set("spark.sql.sources.partitionOverwriteMode", "dynamic")

    df_with_partition.write \
        .mode("overwrite") \
        .partitionBy(partition_col) \
        .format("parquet") \
        .saveAsTable(table)

    print(f"Overwrote partition {partition_col}={partition_value} in {table}")

# Load daily partition — re-running replaces only this partition
load_partition(df, "warehouse.events", "load_date", "2026-07-05")
```

### Deduplication with window functions

```sql
-- dedup_load.sql — remove duplicates from re-runs using window functions
WITH ranked_rows AS (
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY id
            ORDER BY _loaded_at DESC
        ) AS rn
    FROM warehouse.customers
    WHERE _load_id IN ('abc123', 'def456')  -- two runs that may overlap
)
DELETE FROM warehouse.customers
WHERE id IN (
    SELECT id FROM ranked_rows WHERE rn > 1
);

-- Or keep only the latest version per key
CREATE TABLE warehouse.customers_deduped AS
SELECT * FROM (
    SELECT
        *,
        ROW_NUMBER() OVER (PARTITION BY id ORDER BY _loaded_at DESC) AS rn
    FROM warehouse.customers
) WHERE rn = 1;
```

### Java idempotent consumer

```java
// IdempotentConsumer.java — process messages without duplicates
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.UUID;

public class IdempotentConsumer {

    private final Connection db;

    public IdempotentConsumer(Connection db) {
        this.db = db;
        initProcessedTable();
    }

    private void initProcessedTable() {
        try (var stmt = db.createStatement()) {
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS processed_events (
                    event_id VARCHAR(255) PRIMARY KEY,
                    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public boolean isProcessed(String eventId) {
        try (var ps = db.prepareStatement(
                "SELECT 1 FROM processed_events WHERE event_id = ?")) {
            ps.setString(1, eventId);
            try (var rs = ps.executeQuery()) {
                return rs.next();
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public void process(String eventId, Runnable handler) {
        if (isProcessed(eventId)) {
            System.out.println("Event " + eventId + " already processed. Skipping.");
            return;
        }

        try {
            db.setAutoCommit(false);

            // Process the event
            handler.run();

            // Mark as processed in the same transaction
            try (var ps = db.prepareStatement(
                    "INSERT INTO processed_events (event_id) VALUES (?)")) {
                ps.setString(1, eventId);
                ps.executeUpdate();
            }

            db.commit();
            System.out.println("Processed event " + eventId);
        } catch (Exception e) {
            try { db.rollback(); } catch (Exception ignored) {}
            throw new RuntimeException("Failed to process event " + eventId, e);
        } finally {
            try { db.setAutoCommit(true); } catch (Exception ignored) {}
        }
    }
}
```

### Atomic load with temp table and rename

```sql
-- atomic_swap.sql — atomic table replacement
-- Step 1: Load into a temp table
CREATE TABLE warehouse.customers_new AS
SELECT
    id,
    LOWER(TRIM(email)) AS email,
    TRIM(first_name) AS first_name,
    TRIM(last_name) AS last_name,
    status
FROM staging.customers_batch;

-- Step 2: Atomic swap — rename old to backup, new to live
ALTER TABLE warehouse.customers RENAME TO customers_backup;
ALTER TABLE warehouse.customers_new RENAME TO customers;

-- Step 3: Verify and drop backup
-- SELECT COUNT(*) FROM warehouse.customers;
-- DROP TABLE warehouse.customers_backup;
```

## Variants

### Idempotent API ingestion with checkpointing

```python
# api_ingestion.py — idempotent API data ingestion
import requests
import json
from pathlib import Path

class IdempotentApiLoader:
    def __init__(self, checkpoint_file="checkpoints.json"):
        self.checkpoint_file = Path(checkpoint_file)
        self.checkpoints = self._load_checkpoints()

    def _load_checkpoints(self):
        if self.checkpoint_file.exists():
            return json.loads(self.checkpoint_file.read_text())
        return {}

    def _save_checkpoints(self):
        self.checkpoint_file.write_text(json.dumps(self.checkpoints, indent=2))

    def load_page(self, api_url, endpoint, page=1):
        checkpoint_key = f"{endpoint}_page_{page}"

        if checkpoint_key in self.checkpoints:
            print(f"Page {page} already loaded. Skipping.")
            return self.checkpoints[checkpoint_key]

        response = requests.get(f"{api_url}/{endpoint}", params={"page": page})
        data = response.json()

        self.checkpoints[checkpoint_key] = {
            "loaded_at": str(datetime.now()),
            "record_count": len(data.get("results", []))
        }
        self._save_checkpoints()

        return data
```

### Conditional load with pre-checks

```python
# conditional_load.py — check target state before loading
class ConditionalLoader:
    def __init__(self, warehouse):
        self.warehouse = warehouse

    def load_if_needed(self, df, table, key_col, batch_date):
        # Check if data for this batch already exists
        with self.warehouse.cursor() as cur:
            cur.execute(f"""
                SELECT COUNT(*) FROM {table}
                WHERE DATE(created_at) = %s
            """, (batch_date,))
            existing_count = cur.fetchone()[0]

        if existing_count >= len(df):
            print(f"Target already has {existing_count} rows for {batch_date}. Skipping.")
            return

        # Load with MERGE
        self._upsert(df, table, key_col)

    def _upsert(self, df, table, key_col):
        # Implementation using MERGE
        pass
```

## Best Practices

- Use MERGE (upsert) instead of INSERT — if the row exists, update it; if not, insert it
- Track load IDs — store metadata about each load run so you can detect and skip re-runs
- Use partition overwrite for batch data — replace an entire partition atomically
- Wrap loads in transactions — if any part fails, the entire load rolls back
- Use staging tables — load to staging first, then MERGE to target in one operation
- Deduplicate with window functions — `ROW_NUMBER() OVER (PARTITION BY key ORDER BY loaded_at DESC)`
- Make checkpoints persistent — store progress in a file or table so restarts skip completed work
- Test re-runs — run the same pipeline twice and verify the target has no duplicates

## Common Mistakes

- **Using INSERT instead of MERGE**: re-running the pipeline inserts duplicate rows. Always use MERGE or upsert.
- **No load tracking**: no way to know if a batch was already loaded. Re-runs duplicate everything.
- **Partial loads without transactions**: the pipeline fails halfway, leaving partial data. Use transactions or staging tables.
- **Overwriting the whole table**: `DROP TABLE` then `CREATE TABLE` loses all other partitions. Use partition-level overwrite.
- **No deduplication key**: without a unique key, MERGE can't match rows. Always define a primary key or composite key.

## FAQ

### What is an idempotent data load?

A load that produces the same result whether it runs once or multiple times. Re-running the pipeline doesn't create duplicates or corrupt existing data. The target table ends up in the same state regardless of how many times the load runs.

### How do I make a load idempotent?

Use MERGE (upsert) instead of INSERT. Track each load with a unique load ID. Use staging tables so the target only sees the final result. Wrap the load in a transaction.

### What is a load ID?

A unique identifier for each load run, typically a hash of the source table and batch date. It's stored in a load history table so you can detect if a batch was already loaded and skip it.

### Should I use partition overwrite or MERGE?

Partition overwrite is simpler for batch data — replace the entire partition. MERGE is better for incremental loads where you only update changed rows. Use partition overwrite for daily batches, MERGE for CDC or streaming.

### How do I handle idempotency in streaming consumers?

Use the event ID as a deduplication key. Store processed event IDs in a table. Before processing, check if the ID was already processed. Use the same transaction for processing and marking as processed.
