---
contentType: patterns
slug: idempotent-load-pattern
title: "Patrón Idempotent Load: Re-run Data Loads Safely Sin Duplicates"
description: "Cómo re-run data loads safely sin duplicates. Cubre deduplication keys, MERGE upserts, load IDs, partition overwrite, y transactional loads."
metaDescription: "Re-run data loads safely sin duplicates. Aprende deduplication keys, MERGE upserts, load IDs, partition overwrite, y transactional load strategies."
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
  metaDescription: "Re-run data loads safely sin duplicates. Aprende deduplication keys, MERGE upserts, load IDs, partition overwrite, y transactional load strategies."
  keywords:
    - data
    - etl
    - idempotency
    - data-quality
    - pipelines
    - pattern
---

## Overview

Un idempotent load produce el mismo result whether corra una vez o diez veces. Si un pipeline falla a mitad de camino y lo re-correés, el target table debería no tener duplicates, no orphaned partial data, y no missing rows. Esto se logra a través de deduplication keys, upsert (MERGE) operations, load IDs para tracking, y partition-level overwrite strategies. Idempotent loads son essential para reliable ETL/ELT pipelines — sin ellos, cada failure requiere manual cleanup y risks data corruption.

## When to Use

- ETL/ELT pipelines que pueden fallar y necesitan re-runs
- Scheduled data loads donde duplicates corromperían analytics
- Data ingestion desde external APIs con retry logic
- Cualquier pipeline donde data quality es non-negotiable
- Streaming consumers que pueden processar el mismo message dos veces

## When NOT to Use

- One-time data migrations (idempotency agrega complexity por no benefit)
- Append-only event logs donde duplicates se handle downstream
- Prototypes y exploratory data loading

## Solution

### MERGE upsert para idempotent loads

```sql
-- idempotent_upsert.sql — MERGE asegura no duplicates on re-run
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

### Python idempotent load con load IDs

```python
# idempotent_load.py — idempotent load con tracking
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

        # Checkeá si ya está loaded
        if self._is_already_loaded(load_id):
            logger.info(f"Load {load_id} already completed. Skipping.")
            return {"load_id": load_id, "status": "skipped", "rows": 0}

        logger.info(f"Starting load {load_id} for {target_table}")

        # Agregá load metadata
        df = df.copy()
        df['_load_id'] = load_id
        df['_loaded_at'] = datetime.now()

        # Loadéa a staging table
        staging_table = f"stg_{target_table}_{load_id}"
        df.to_sql(staging_table, self.warehouse, index=False, if_exists='replace')

        # Upsert desde staging a target
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
# partition_overwrite.py — idempotent partition overwrite con PySpark
from pyspark.sql import SparkSession
from pyspark.sql.functions import lit, current_timestamp

spark = SparkSession.builder.appName("IdempotentLoad").getOrCreate()

def load_partition(df, table, partition_col, partition_value):
    """Overwriteá un single partition — idempotent by design."""
    df_with_partition = df.withColumn(partition_col, lit(partition_value)) \
        .withColumn("_loaded_at", current_timestamp())

    # mode('overwrite') con dynamic partition overwrite
    # solo el specific partition se reemplaza, no el whole table
    spark.conf.set("spark.sql.sources.partitionOverwriteMode", "dynamic")

    df_with_partition.write \
        .mode("overwrite") \
        .partitionBy(partition_col) \
        .format("parquet") \
        .saveAsTable(table)

    print(f"Overwrote partition {partition_col}={partition_value} in {table}")

# Loadéa daily partition — re-running replacea solo este partition
load_partition(df, "warehouse.events", "load_date", "2026-07-05")
```

### Deduplication con window functions

```sql
-- dedup_load.sql — removeá duplicates desde re-runs usando window functions
WITH ranked_rows AS (
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY id
            ORDER BY _loaded_at DESC
        ) AS rn
    FROM warehouse.customers
    WHERE _load_id IN ('abc123', 'def456')  -- dos runs que pueden overlap
)
DELETE FROM warehouse.customers
WHERE id IN (
    SELECT id FROM ranked_rows WHERE rn > 1
);

-- O keepéa solo el latest version per key
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
// IdempotentConsumer.java — processá messages sin duplicates
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

            // Processá el event
            handler.run();

            // Markéa como processed en la misma transaction
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

### Atomic load con temp table y rename

```sql
-- atomic_swap.sql — atomic table replacement
-- Step 1: Loadéa en un temp table
CREATE TABLE warehouse.customers_new AS
SELECT
    id,
    LOWER(TRIM(email)) AS email,
    TRIM(first_name) AS first_name,
    TRIM(last_name) AS last_name,
    status
FROM staging.customers_batch;

-- Step 2: Atomic swap — renameá old a backup, new a live
ALTER TABLE warehouse.customers RENAME TO customers_backup;
ALTER TABLE warehouse.customers_new RENAME TO customers;

-- Step 3: Verify y drop backup
-- SELECT COUNT(*) FROM warehouse.customers;
-- DROP TABLE warehouse.customers_backup;
```

## Variants

### Idempotent API ingestion con checkpointing

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

### Conditional load con pre-checks

```python
# conditional_load.py — checkeá target state antes de loadear
class ConditionalLoader:
    def __init__(self, warehouse):
        self.warehouse = warehouse

    def load_if_needed(self, df, table, key_col, batch_date):
        # Checkeá si data para este batch ya existe
        with self.warehouse.cursor() as cur:
            cur.execute(f"""
                SELECT COUNT(*) FROM {table}
                WHERE DATE(created_at) = %s
            """, (batch_date,))
            existing_count = cur.fetchone()[0]

        if existing_count >= len(df):
            print(f"Target already has {existing_count} rows for {batch_date}. Skipping.")
            return

        # Loadéa con MERGE
        self._upsert(df, table, key_col)

    def _upsert(self, df, table, key_col):
        # Implementation usando MERGE
        pass
```

## Best Practices

- Usá MERGE (upsert) en vez de INSERT — si el row existe, updateá; si no, insertá
- Trackeá load IDs — storeá metadata sobre cada load run para detectar y skippear re-runs
- Usá partition overwrite para batch data — replaceá un entire partition atomically
- Wrapéa loads en transactions — si cualquier part falla, el entire load roll back
- Usá staging tables — loadéa a staging primero, después MERGE a target en una operation
- Deduplicá con window functions — `ROW_NUMBER() OVER (PARTITION BY key ORDER BY loaded_at DESC)`
- Hacé checkpoints persistent — storeá progress en un file o table para que restarts skippeen completed work
- Testeá re-runs — corré el mismo pipeline dos veces y verify que el target no tiene duplicates

## Common Mistakes

- **Usar INSERT en vez de MERGE**: re-corriendo el pipeline inserta duplicate rows. Siempre usá MERGE o upsert.
- **No load tracking**: no way de saber si un batch ya está loaded. Re-runs duplican todo.
- **Partial loads sin transactions**: el pipeline falla a mitad, dejando partial data. Usá transactions o staging tables.
- **Overwritear el whole table**: `DROP TABLE` después `CREATE TABLE` pierde todos los other partitions. Usá partition-level overwrite.
- **No deduplication key**: sin un unique key, MERGE no puede matchear rows. Siempre definí un primary key o composite key.

## FAQ

### ¿Qué es un idempotent data load?

Un load que produce el mismo result whether corra una vez o múltiples veces. Re-corriendo el pipeline no crea duplicates o corrompe existing data. El target table termina en el mismo state regardless de cuántas veces el load corra.

### ¿Cómo hago un load idempotent?

Usá MERGE (upsert) en vez de INSERT. Trackeá cada load con un unique load ID. Usá staging tables para que el target solo vea el final result. Wrapéa el load en un transaction.

### ¿Qué es un load ID?

Un unique identifier para cada load run, típicamente un hash del source table y batch date. Se storea en un load history table para que podás detectar si un batch ya está loaded y skippearlo.

### ¿Debería usar partition overwrite o MERGE?

Partition overwrite es más simple para batch data — replaceá el entire partition. MERGE es mejor para incremental loads donde solo updateás changed rows. Usá partition overwrite para daily batches, MERGE para CDC o streaming.

### ¿Cómo handleo idempotency en streaming consumers?

Usá el event ID como deduplication key. Storeá processed event IDs en un table. Antes de processar, checkeá si el ID ya está processed. Usá la misma transaction para processar y markear como processed.
