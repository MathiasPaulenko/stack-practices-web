---
contentType: recipes
slug: batch-processing-patterns
title: "Batch Processing Patterns"
description: "Design reliable batch processing pipelines for large datasets with retry logic, idempotency, and observability."
metaDescription: "Batch processing patterns for large datasets: reliable pipeline design, retry logic, idempotency, and observability what works for ETL and reporting workflows."
difficulty: intermediate
topics:
  - data
tags:
  - batch-processing
  - data
  - performance
  - architecture
  - parsing
relatedResources:
  - /recipes/caching
  - /recipes/data-validation
  - /recipes/date-formatting
  - /recipes/deep-clone-javascript
  - /recipes/flatten-unflatten-objects
lastUpdated: "2026-07-09"
author: "StackPractices"
seo:
  metaDescription: "Batch processing patterns for large datasets: reliable pipeline design, retry logic, idempotency, and observability what works for ETL and reporting workflows."
  keywords:
    - batch-processing
    - data
    - performance
    - architecture
---
## Overview

Batch processing is the backbone of data pipelines, ETL workflows, and report generation. Unlike stream processing, batch jobs process bounded datasets in chunks, making them simpler to reason about but requiring careful attention to idempotency, fault tolerance, and observability.

## When to Use

Use this resource when:
- Processing large datasets that do not fit in memory. See [Retry Logic](/recipes/architecture/retry-backoff) for handling transient failures.
- Building ETL pipelines for data warehouses
- Generating nightly reports or aggregations
- Migrating data between systems with downtime windows

## Solution

### Resilient Batch Pipeline (Python)

```python
import logging
from typing import Callable, List, Iterator

class BatchProcessor:
    def __init__(self, batch_size: int = 1000, max_retries: int = 3):
        self.batch_size = batch_size
        self.max_retries = max_retries
        self.processed = 0
        self.failed = []

    def process(
        self,
        items: Iterator[dict],
        handler: Callable[[List[dict]], None]
    ) -> dict:
        batch = []
        for item in items:
            batch.append(item)
            if len(batch) >= self.batch_size:
                self._execute(batch, handler)
                batch = []

        if batch:
            self._execute(batch, handler)

        return {"processed": self.processed, "failed": len(self.failed)}

    def _execute(self, batch: List[dict], handler: Callable):
        for attempt in range(self.max_retries):
            try:
                handler(batch)
                self.processed += len(batch)
                return
            except Exception as e:
                logging.warning(f"Batch failed (attempt {attempt + 1}): {e}")
                if attempt == self.max_retries - 1:
                    self.failed.extend(batch)
```

### Idempotent Job Tracking (SQL)

```sql
CREATE TABLE job_runs (
    job_id VARCHAR(64) PRIMARY KEY,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('running', 'completed', 'failed')),
    checksum VARCHAR(64)
);

-- Before starting, check if already completed
SELECT * FROM job_runs WHERE job_id = 'daily_report_2025_01_15' AND status = 'completed';
```

## Explanation

A production batch pipeline needs three properties:

1. **Idempotency**: Running the same job twice must produce the same result. Use job IDs and checksums to skip already-processed work. See [Idempotent API Endpoints](/recipes/api/idempotent-api-endpoints) for deduplication patterns.
2. **Fault tolerance**: Individual batch failures should not crash the entire job. Implement retry with exponential backoff and a dead-letter queue.
3. **Observability**: Track progress, throughput, and errors. [Log](/recipes/api/logging) metrics for processed items, latency, and failure rates.

**Chunking strategy**: Size batches to balance memory usage and throughput. Too small = overhead; too large = OOM risk.

## Variants

| Pattern | Use Case | Trade-off |
|---------|----------|-----------|
| Chunked processing | Large files, memory limits | Simpler, higher latency |
| Parallel workers | CPU-bound transformations | Complex, needs coordination |
| MapReduce | Distributed aggregation | Scales horizontally |
| Change Data Capture | Incremental sync | Requires source support |

## What Works

- **Design for idempotency**: Every job must be safely retryable
- **Log everything**: Job start, end, and every batch outcome
- **Use transactions**: Wrap batch writes in database transactions
- **Monitor queue depth**: Alert when pending batches exceed thresholds
- **Implement [circuit breakers](/recipes/circuit-breaker-pattern-recipe)**: Stop retrying if downstream is unhealthy

## Common Mistakes

1. **Not handling partial failures**: A batch of 1000 where 1 fails needs individual retry
2. **Ignoring memory limits**: Loading entire datasets into RAM crashes the process
3. **Missing checkpointing**: A 6-hour job that fails at 5:55 must restart from scratch
4. **Silent data loss**: Errors logged but not surfaced to operators
5. **No rollback strategy**: Failed jobs leave the database in an inconsistent state

## Frequently Asked Questions

### How large should each batch be?

Start with 100-1000 items per batch. Benchmark with your data and memory constraints. For database inserts, 500-2000 rows per batch balances throughput and transaction size. For file processing, 10-50 MB per chunk avoids OOM on 512 MB containers. Monitor memory usage with `resource.getrusage(resource.RUSAGE_SELF).ru_maxrss` in Python. If batches exceed available memory, reduce batch size or switch to streaming. For network-bound APIs, larger batches (500-5000) amortize latency. For CPU-bound transforms, smaller batches (100-500) allow better parallelism. Always test with production-like data volumes — synthetic data rarely reveals memory pressure patterns.

### Should I use a job queue like Celery or a cron job?

Use Celery/Redis for distributed systems with multiple workers, retry logic, and monitoring. Celery provides task routing, priority queues, and dead-letter handling out of the box. For single-node, simple pipelines, cron jobs suffice — but add `flock` to prevent overlapping runs: `flock -n /tmp/batch.lock python batch_job.py`. For Kubernetes, use `CronJob` resources with `concurrencyPolicy: Forbid`. See [Rate Limiting](/recipes/api/rate-limiting) for controlling throughput. For cloud-native setups, AWS Step Functions or Google Cloud Workflows provide managed retry and state management without infrastructure overhead.

### How do I handle schema changes mid-pipeline?

Version your job logic and data schemas. Run old and new versions in parallel during migration. Use a `schema_version` column in target tables: `ALTER TABLE orders ADD COLUMN schema_version INT DEFAULT 1`. The batch job checks `schema_version` and applies the correct transformation. For Avro/Protobuf, use schema registry to manage backward-compatible changes. For JSON, validate with JSON Schema versioned by `$id`. Deploy new job versions with a feature flag: `if config.use_new_schema: transform_v2(record) else: transform_v1(record)`. Monitor both versions' output for discrepancies. Once confident, decommission the old version.

### How do I implement checkpointing for long-running batch jobs?

Checkpointing saves progress so failed jobs resume from the last successful batch. Store checkpoints in a durable database table: `CREATE TABLE job_checkpoints (job_id VARCHAR(64), batch_number INT, status VARCHAR(20), PRIMARY KEY (job_id, batch_number))`. After each batch, write: `INSERT INTO job_checkpoints VALUES ('daily_etl', 42, 'completed')`. On restart, query the last completed batch: `SELECT MAX(batch_number) FROM job_checkpoints WHERE job_id = 'daily_etl' AND status = 'completed'`. Resume from batch 43. For file-based checkpoints, write a JSON file to S3 or local disk after each batch. Use atomic writes to prevent corruption: write to a temp file, then rename. For distributed jobs, use Redis or etcd for distributed checkpoint coordination.

### How do I handle dead-letter queues for failed batch items?

Dead-letter queues (DLQ) isolate failed items for manual inspection and retry. In Python, maintain a DLQ list: `dead_letter_queue = []` and append failed items with context: `dead_letter_queue.append({'item': item, 'error': str(e), 'batch_id': batch_id, 'timestamp': datetime.utcnow()})`. After the job completes, write the DLQ to a database table or message queue. In Celery, configure `task_queues` with a dedicated DLQ exchange. In AWS SQS, set `RedrivePolicy` to move messages after `maxReceiveCount` attempts. For database-backed DLQs: `CREATE TABLE dead_letters (id SERIAL PRIMARY KEY, job_id VARCHAR(64), item JSONB, error TEXT, created_at TIMESTAMP DEFAULT NOW())`. Process DLQ items separately with a retry job that runs every hour.

### How do I monitor batch job throughput and progress?

Emit metrics at each batch boundary. In Python, use `prometheus_client`: `from prometheus_client import Counter, Histogram; processed = Counter('batch_processed_total', 'Items processed'); latency = Histogram('batch_duration_seconds', 'Batch duration')`. Push metrics to Prometheus Pushgateway for batch jobs: `from prometheus_client import push_to_gateway; push_to_gateway('localhost:9091', job='batch_etl', registry=registry)`. For cloud setups, emit CloudWatch custom metrics or Datadog statsd. Track: items processed, items failed, batch duration, queue depth, and memory usage. Set up Grafana dashboards with alerts for: throughput below 50% of average, failure rate above 5%, and job duration exceeding SLA. Log structured JSON for each batch: `{"batch_id": 42, "processed": 1000, "failed": 3, "duration_ms": 1250}`.

### How do I handle backpressure in batch processing pipelines?

Backpressure occurs when downstream systems cannot keep up with the batch producer. Implement rate limiting with a semaphore: `from threading import Semaphore; rate_limiter = Semaphore(10)` — acquire before each batch write and release after. For database writes, use connection pooling with a max pool size to limit concurrent inserts. For API calls, implement a token bucket: `import time; time.sleep(1 / max_rps)`. Monitor downstream latency — if it increases beyond 2x baseline, reduce batch size or pause processing. In Celery, set `worker_prefetch_multiplier = 1` to prevent workers from over-fetching. For Kafka-based pipelines, set `max.poll.records` to control batch size. Use `concurrent.futures.ThreadPoolExecutor(max_workers=N)` to limit parallelism in Python.

### How do I test batch processing jobs for correctness?

Test batch jobs with deterministic data fixtures. Create a test dataset: `test_data = [{'id': i, 'value': i * 2} for i in range(10000)]`. Test idempotency by running the job twice and verifying the output is identical: `assert run_job(test_data) == run_job(test_data)`. Test fault tolerance by injecting failures: `def failing_handler(batch): if len(batch) > 500: raise Exception('simulated failure')` and verify the job retries and records failures. Test checkpointing by killing the job mid-run and verifying it resumes correctly. Use property-based testing with Hypothesis: `@given(st.lists(st.dictionaries(st.text(), st.integers())))` to generate edge-case inputs. For SQL-based jobs, use testcontainers to spin up a real database: `from testcontainers.postgres import PostgresContainer`.

### How do I handle batch processing for time-series data?

Time-series batch jobs process data in fixed time windows. Use windowed batching: group records by `window_start` and `window_end` timestamps. For example, `SELECT date_trunc('hour', timestamp) AS window, COUNT(*) FROM events GROUP BY 1` processes hourly batches. For late-arriving data, use watermarking: allow data up to 5 minutes late by setting `watermark = current_time - 5 minutes`. Process windows only after the watermark passes. For retention, partition by time: `CREATE TABLE events_2025_01 PARTITION OF events FOR VALUES FROM ('2025-01-01') TO ('2025-02-01')`. Drop old partitions instead of deleting rows: `DROP TABLE events_2024_01`. For downsampling, aggregate raw data into 1-minute, 1-hour, and 1-day summary tables in separate batch jobs.

### How do I handle batch processing with exactly-once semantics?

Exactly-once processing requires idempotent writes and transactional checkpoints. Use a transaction to write both the batch output and the checkpoint atomically: `BEGIN; INSERT INTO results SELECT * FROM staging; INSERT INTO job_checkpoints VALUES ('job_1', 42, 'completed'); COMMIT;`. If the transaction fails, both the data and checkpoint are rolled back — the job retries the batch. For Kafka consumers, use `enable.idempotence=true` and `transactional.id` for producer-side exactly-once. For database writes, use `INSERT ... ON CONFLICT DO NOTHING` to handle duplicate batches safely. For external API calls, use idempotency keys: `Idempotency-Key: batch_42_run_3` in request headers. Accept that exactly-once has a performance cost — measure whether at-least-once with idempotent writes suffices for your use case.

### How do I handle batch processing in serverless environments?

In AWS Lambda, process batches within the 15-minute timeout limit. Use Lambda's batch windowing: set `MaximumBatchingWindowInSeconds` to 300 seconds for larger batches. For SQS-triggered Lambda, set `BatchSize` to 10000 (maximum). Handle partial failures with `ReportBatchItemFailures` in the response — SQS requeues only the failed items. For Step Functions, use `Map` state with `MaxConcurrency` to parallelize batch processing. In Google Cloud Functions, use Cloud Scheduler to trigger batch jobs. For long-running batches, split into smaller Lambda invocations using SQS as a queue: each Lambda processes one batch and enqueues the next. Monitor with CloudWatch metrics and set alarms for timeout and error rates. Use Lambda Layers for shared dependencies across batch functions.

### How do I handle batch processing for CSV files larger than memory?

Use streaming CSV parsers that yield rows one at a time. In Python, use `csv.DictReader`: `with open('large.csv') as f: reader = csv.DictReader(f); for batch in chunked(reader, 1000): process(batch)`. The `chunked` function from `more-itertools` groups rows into batches: `from more_itertools import chunked; for batch in chunked(reader, 1000): process(batch)`. For pandas, use `chunksize`: `for chunk in pd.read_csv('large.csv', chunksize=10000): process(chunk)`. For Node.js, use `csv-parse` with streaming: `const parser = parse({ columns: true }); fs.createReadStream('large.csv').pipe(parser)`. For very large files (10+ GB), consider splitting with `split -l 1000000 large.csv chunk_` and processing chunks in parallel across workers.

### How do I handle batch processing with database transactions?

Wrap each batch in a database transaction to ensure atomicity. In Python with psycopg2: `with conn.cursor() as cur: cur.execute('BEGIN'); cur.executemany('INSERT INTO orders VALUES (%s, %s)', batch); conn.commit()`. If the batch fails, the transaction rolls back automatically. For PostgreSQL, use `COPY` for bulk inserts — 10-100x faster than `INSERT`: `with open('batch.csv') as f: cur.copy_from(f, 'orders', sep=',')`. For MySQL, use `LOAD DATA INFILE` for bulk loads. Set transaction isolation level to `READ COMMITTED` to avoid lock contention. For large batches, use savepoints to retry individual items within a batch: `SAVEPOINT batch_item; INSERT ...; RELEASE SAVEPOINT batch_item`.

### How do I handle batch processing with Apache Airflow?

Airflow orchestrates batch jobs with DAGs (Directed Acyclic Graphs). Define a DAG: `with DAG('daily_etl', schedule='@daily', default_args={'retries': 3, 'retry_delay': timedelta(minutes=5)}) as dag: process_task = PythonOperator(task_id='process', python_callable=process_batch)`. Use `XCom` to pass small data between tasks — for large data, use S3/GCS references. Set `retries` and `retry_delay` for automatic retry on failure. Use `task_concurrency` to limit parallel task instances. Monitor with Airflow's UI or integrate with Datadog. For dynamic task generation, use `TaskGroup` with `partial` and `expand` for mapped tasks over batch partitions. Set `sla` to alert when jobs miss deadlines. Use `Pool` to limit concurrent tasks across DAGs.

### How do I handle batch processing for data deduplication?

Deduplication in batch jobs removes duplicate records from large datasets. For exact duplicates, use SQL `DISTINCT`: `SELECT DISTINCT * FROM staging INTO clean_table`. For fuzzy duplicates, use blocking and matching: first block records by a shared key (e.g., last 4 digits of phone), then compare within blocks using Levenshtein distance or Jaccard similarity. In Python, use `dedupe` library: `import dedupe; deduper = dedupe.Dedupe(variables); deduper.train(data_sample); clustered = deduper.partition(data, threshold=0.5)`. For large datasets, use locality-sensitive hashing (LSH) with `datasketch`: `from datasketch import MinHash, MinHashLSH`. Process in batches to limit memory: load 10000 records, deduplicate within the batch, then merge with previous results.

### How do I handle batch processing with Kafka Connect?

Kafka Connect provides managed batch processing for data pipelines between Kafka and external systems. Use source connectors to ingest data: `curl -X POST http://localhost:8083/connectors -H 'Content-Type: application/json' -d '{"name": "pg-source", "config": {"connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector", "connection.url": "jdbc:postgresql://localhost/db", "mode": "incrementing", "incrementing.column.name": "id", "topic.prefix": "pg-"}}'`. Use sink connectors to write batch data: `{"connector.class": "io.confluent.connect.jdbc.JdbcSinkConnector", "topics": "pg-orders", "connection.url": "jdbc:postgresql://localhost/db", "insert.mode": "upsert", "pk.fields": "id", "auto.create": true}`. Configure `batch.size` (default 2000) and `consumer.override.max.poll.records` to control batch sizes. For exactly-once, use `exactly.once.source.support: true` with transactional source connectors. Monitor with Connect REST API: `GET /connectors/pg-source/status`. Use Single Message Transforms (SMTs) for lightweight per-record transformations: `"transforms": "cast", "transforms.cast.type": "org.apache.kafka.connect.transforms.Cast$Value", "transforms.cast.spec": "amount:int64"`.

### How do I handle batch processing for incremental loads?

Incremental loads process only new or changed records since the last run. Track the high-water mark: `CREATE TABLE job_watermarks (job_id VARCHAR(64) PRIMARY KEY, last_processed_id BIGINT, last_processed_at TIMESTAMP)`. After each run, update: `INSERT INTO job_watermarks VALUES ('orders_etl', 50000, NOW()) ON CONFLICT (job_id) DO UPDATE SET last_processed_id = EXCLUDED.last_processed_id`. On the next run, query: `SELECT * FROM orders WHERE id > (SELECT last_processed_id FROM job_watermarks WHERE job_id = 'orders_etl') ORDER BY id LIMIT 10000`. For timestamp-based incremental loads: `WHERE updated_at > (SELECT last_processed_at FROM job_watermarks WHERE job_id = 'orders_etl')`. For PostgreSQL, use logical replication with `pgoutput` plugin for change data capture. For MySQL, use binlog replication with Debezium. Handle deletes with tombstone records or soft-delete columns.

### How do I handle batch processing for data validation at scale?

Validate data in batches before loading to target systems. Use a validation framework like Great Expectations: `import great_expectations as ge; df = ge.from_pandas(batch); df.expect_column_values_to_not_be_null('id'); df.expect_column_values_to_be_unique('id'); df.expect_column_values_to_be_between('amount', 0, 10000)`. For SQL-based validation, run check queries after each batch: `SELECT COUNT(*) FROM staging WHERE amount IS NULL OR amount < 0`. Quarantine invalid records: `INSERT INTO quarantine SELECT * FROM staging WHERE amount IS NULL OR amount < 0`. Generate a validation report per batch: `{"batch_id": 42, "total": 1000, "valid": 995, "invalid": 5, "checks_failed": ["amount_not_null", "amount_positive"]}`. For schema validation, use Pydantic: `from pydantic import BaseModel; class Order(BaseModel): id: int; amount: float; status: str` and validate each record: `Order(**record)`. Set up alerts when invalid record rate exceeds 1%.

### How do I handle batch processing for parallel worker coordination?

Coordinate parallel batch workers with a shared task queue. In Python, use `multiprocessing.Queue` for inter-process communication: `from multiprocessing import Queue, Process; task_queue = Queue(); result_queue = Queue()`. Distribute batches: `for batch_id in range(num_batches): task_queue.put(batch_id)`. Workers consume: `def worker(task_queue, result_queue): while True: batch_id = task_queue.get(); process_batch(batch_id); result_queue.put(batch_id)`. For distributed coordination, use Redis as a task queue: `import redis; r = redis.Redis(); r.lpush('batch_queue', batch_id)`. Workers claim tasks atomically: `batch_id = r.brpop('batch_queue', timeout=30)`. Track in-flight tasks: `r.sadd('in_flight', batch_id)` and remove on completion: `r.srem('in_flight', batch_id)`. For fault tolerance, requeue stale tasks: check `in_flight` set periodically and requeue items older than 30 minutes. Use `concurrent.futures.ProcessPoolExecutor` for CPU-bound work and `ThreadPoolExecutor` for I/O-bound work.

### How do I handle batch processing for data partitioning strategies?

Partition large datasets to parallelize batch processing. Partition by date: `df['partition'] = df['created_at'].dt.strftime('%Y-%m-%d')` and process each partition independently. Partition by hash: `df['partition'] = df['id'] % num_partitions` for even distribution. Partition by range: `WHERE id BETWEEN 0 AND 99999`, `WHERE id BETWEEN 100000 AND 199999` for database queries. For file-based partitioning, use directory structure: `data/year=2025/month=01/day=15/data.parquet`. This Hive-style partitioning works with Spark, Presto, and Athena. For database partitioning, use PostgreSQL declarative partitioning: `CREATE TABLE orders PARTITION BY RANGE (created_at)` with monthly partitions. Process partitions in parallel with `concurrent.futures`: `with ThreadPoolExecutor(max_workers=4) as executor: executor.map(process_partition, partition_list)`. Monitor per-partition progress to identify stragglers. Repartition skewed data with salting: add a random salt column to break up hot keys.

### How do I handle batch processing for memory-mapped files?

Memory-mapped files allow processing files larger than RAM by mapping file contents directly into virtual memory. In Python, use `mmap`: `import mmap; with open('large.bin', 'r+b') as f: mm = mmap.mmap(f.fileno(), 0); for i in range(0, len(mm), chunk_size): process(mm[i:i+chunk_size])`. This avoids loading the entire file into memory — the OS pages data in and out as needed. For read-only access: `mm = mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ)`. For structured data, use NumPy memmap: `import numpy as np; data = np.memmap('large.bin', dtype=np.float32, mode='r', shape=(1000000, 100))`. Process in chunks: `for i in range(0, len(data), 10000): process(data[i:i+10000])`. For text files, combine `mmap` with regex for fast searching: `import re; for match in re.finditer(rb'pattern', mm): process(match)`. Flush writes with `mm.flush()` and close with `mm.close()`. On Linux, use `madvise` to hint the OS about access patterns: `mm.madvise(mmap.MADV_SEQUENTIAL)`.

### How do I handle batch processing for data skew and hot partitions?

Data skew occurs when one partition is much larger than others, causing straggler workers. Detect skew by measuring partition sizes: `from collections import Counter; sizes = Counter(df['partition_key']); print(sizes.most_common(10))`. If the largest partition is 10x the median, you have skew. Mitigate with salting: add a random salt to the key: `df['salted_key'] = df['key'] + '_' + str(random.randint(0, 9))`. This splits hot keys into 10 sub-partitions. Process each sub-partition independently, then merge results. For range-based skew (e.g., all records on one date), use dynamic partitioning: split large partitions into smaller chunks at runtime. In Spark, use `repartition(num_partitions)` with a round-robin distribution. For database queries, add `LIMIT` and `OFFSET` to split large partitions: `SELECT * FROM orders WHERE date = '2025-01-15' LIMIT 10000 OFFSET 0`, then `OFFSET 10000`, etc. Monitor per-partition processing time and alert when the max exceeds 3x the median.

### How do I handle batch processing for data lineage tracking?

Data lineage tracks the origin and transformation of data through batch pipelines. Implement lineage with metadata tables: `CREATE TABLE data_lineage (id SERIAL PRIMARY KEY, job_id VARCHAR(64), source_table VARCHAR(128), target_table VARCHAR(128), transformation TEXT, started_at TIMESTAMP, completed_at TIMESTAMP)`. Record lineage at each batch boundary: `INSERT INTO data_lineage (job_id, source_table, target_table, transformation) VALUES ('etl_42', 'raw_orders', 'clean_orders', 'filter_nulls, cast_amount')`. For column-level lineage, track individual column transformations: `INSERT INTO column_lineage (job_id, source_column, target_column, transformation) VALUES ('etl_42', 'raw_orders.amount', 'clean_orders.amount_cents', 'multiply_by_100')`. Use OpenLineage for standardized lineage emission: `from openlineage.client import OpenLineageClient; client.emit(run_event)`. Integrate with Marquez or DataHub for visualization. For Spark jobs, use `spark.openlineage` connector for automatic lineage tracking. Store lineage as a DAG in Neo4j for complex dependency graphs.

### How do I handle batch processing for retry with exponential backoff?

Implement retry with exponential backoff to handle transient failures. In Python: `import time; def retry_with_backoff(func, max_retries=3, base_delay=1): for attempt in range(max_retries): try: return func() except Exception as e: if attempt == max_retries - 1: raise; delay = base_delay * (2 ** attempt) + random.uniform(0, 1); time.sleep(delay)`. For batch jobs, retry the entire batch first, then individual items: `for item in batch: retry_with_backoff(lambda: process_item(item))`. Use jitter to prevent thundering herd: `delay = base_delay * (2 ** attempt) + random.uniform(0, base_delay)`. In Celery, configure `task_autoretry_for = (ConnectionError,)` and `task_retry_backoff = True`. For database operations, use `psycopg2.exponential_backoff` or implement custom retry with `tenacity`: `from tenacity import retry, stop_after_attempt, wait_exponential; @retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=4, max=60)) def process_batch(batch): ...`. Log each retry attempt with batch ID and error details.

### How do I handle batch processing for data quality scoring?

Score data quality per batch to track pipeline health. Define quality dimensions: completeness (non-null ratio), uniqueness (duplicate rate), validity (schema conformance), timeliness (freshness), and consistency (cross-field rules). Calculate per batch: `completeness = 1 - (null_count / total_count); uniqueness = unique_count / total_count; validity = valid_count / total_count`. Store scores: `CREATE TABLE data_quality_scores (id SERIAL PRIMARY KEY, job_id VARCHAR(64), batch_id INT, completeness FLOAT, uniqueness FLOAT, validity FLOAT, overall_score FLOAT, created_at TIMESTAMP DEFAULT NOW())`. Alert when overall score drops below 0.95. Use a weighted score: `overall = 0.3 * completeness + 0.3 * uniqueness + 0.2 * validity + 0.2 * timeliness`. Generate weekly trends: `SELECT date_trunc('week', created_at), AVG(overall_score) FROM data_quality_scores GROUP BY 1`. For anomaly detection, use z-scores: `z = (current_score - avg_score) / std_score` and alert when `z < -2`. Integrate with Apache Griffin or Deequ for automated quality scoring at scale.

### How do I handle batch processing for multi-source data merging?

Merge data from multiple sources in batch jobs with conflict resolution. Use a staging table per source: `CREATE TABLE staging_source_a (id INT, email VARCHAR, phone VARCHAR, updated_at TIMESTAMP); CREATE TABLE staging_source_b (id INT, email VARCHAR, phone VARCHAR, updated_at TIMESTAMP)`. Merge with priority rules: `INSERT INTO merged SELECT COALESCE(a.id, b.id), COALESCE(a.email, b.email), COALESCE(a.phone, b.phone), GREATEST(a.updated_at, b.updated_at) FROM staging_source_a a FULL OUTER JOIN staging_source_b b ON a.id = b.id`. For conflict resolution by recency: `CASE WHEN a.updated_at > b.updated_at THEN a.email ELSE b.email END`. For incremental multi-source loads, track per-source watermarks: `CREATE TABLE source_watermarks (source VARCHAR(64), job_id VARCHAR(64), last_processed_at TIMESTAMP, PRIMARY KEY (source, job_id))`. Handle schema differences with a mapping table: `CREATE TABLE field_mapping (source VARCHAR(64), source_field VARCHAR(128), target_field VARCHAR(128), transform VARCHAR(256))`. Validate merged data with cross-source consistency checks.

### How do I handle batch processing for error handling and alerting?

Implement comprehensive error handling with structured alerts. Categorize errors: transient (retry), permanent (quarantine), and systemic (abort). For transient errors: `except (ConnectionError, TimeoutError) as e: retry_batch(batch)`. For permanent errors: `except (ValueError, KeyError) as e: quarantine_batch(batch, str(e))`. For systemic errors: `except OutOfMemoryError as e: abort_job(str(e)); send_alert('CRITICAL', str(e))`. Send alerts via multiple channels: `def send_alert(severity, message): if severity == 'CRITICAL': pagerduty.trigger(message); slack.post('#alerts', message); email.send('oncall@company.com', message)`. Include context in alerts: `{"job_id": "etl_42", "batch_id": 15, "error": "connection refused", "host": "db-1.prod", "timestamp": "2025-01-15T03:00:00Z"}`. Use exponential backoff for alert delivery to avoid alert storms. Set up error rate dashboards: `SELECT date_trunc('hour', created_at), error_type, COUNT(*) FROM job_errors GROUP BY 1, 2`. Configure escalation policies: page after 3 consecutive failures, email after 5 retries in 1 hour.

### How do I handle batch processing for data encryption at rest?

Encrypt sensitive data during batch processing to comply with security requirements. Use column-level encryption in PostgreSQL: `CREATE EXTENSION pgcrypto; INSERT INTO orders (id, ssn) VALUES (1, pgp_sym_encrypt('123-45-6789', 'encryption_key'))`. Query decrypted: `SELECT pgp_sym_decrypt(ssn, 'encryption_key') FROM orders`. For file-based encryption, use `cryptography` in Python: `from cryptography.fernet import Fernet; key = Fernet.generate_key(); cipher = Fernet(key); encrypted = cipher.encrypt(batch_data); decrypted = cipher.decrypt(encrypted)`. For S3, use server-side encryption: `aws s3 cp batch.json s3://bucket/ --sse aws:kms`. For Kafka, configure `encryption.at.rest` with KMS. Rotate encryption keys periodically: store keys in AWS KMS or HashiCorp Vault. Audit encryption status: `SELECT relname, relrowsecurity FROM pg_class WHERE relrowsecurity = true`. Never log encrypted values or encryption keys. Use separate keys per environment (dev, staging, prod).

### How do I handle batch processing for data masking and PII compliance?

Mask PII data during batch processing to comply with GDPR and CCPA. Implement masking functions: `def mask_email(email): parts = email.split('@'); return parts[0][:2] + '***@' + parts[1]`. For phone numbers: `def mask_phone(phone): return phone[:3] + '***' + phone[-4:]`. For SSN: `def mask_ssn(ssn): return '***-**-' + ssn[-4:]`. Apply masking in the batch transformation step: `masked_batch = [{**record, 'email': mask_email(record['email']), 'phone': mask_phone(record['phone'])} for record in batch]`. For database-level masking, use PostgreSQL views: `CREATE VIEW orders_masked AS SELECT id, mask_email(email) AS email, mask_phone(phone) AS phone FROM orders`. Use dynamic data masking in PostgreSQL with `pg_anonymizer`: `CREATE MASKING POLICY mask_pii ON orders FOR SELECT TO analyst USING (email = mask_email(email), phone = mask_phone(phone))`. Tokenize instead of mask when you need referential integrity: `token = hash(email + salt)`. Audit masked data access with `pgaudit`.

### How do I handle batch processing for SLA monitoring?

Monitor batch job SLAs to ensure data is delivered on time. Define SLAs per job: `CREATE TABLE job_slas (job_id VARCHAR(64) PRIMARY KEY, max_duration_minutes INT, max_latency_minutes INT, alert_threshold_minutes INT)`. Track job execution: `INSERT INTO job_executions (job_id, started_at, completed_at, status) VALUES ('daily_etl', '2025-01-15T02:00:00Z', '2025-01-15T02:45:00Z', 'completed')`. Check SLA compliance: `SELECT j.job_id, j.max_duration_minutes, EXTRACT(EPOCH FROM (j.completed_at - j.started_at))/60 AS actual_minutes, CASE WHEN EXTRACT(EPOCH FROM (j.completed_at - j.started_at))/60 > s.max_duration_minutes THEN 'VIOLATED' ELSE 'OK' END FROM job_executions j JOIN job_slas s ON j.job_id = s.job_id`. Alert on SLA breaches: `SELECT * FROM job_executions WHERE EXTRACT(EPOCH FROM (completed_at - started_at))/60 > (SELECT max_duration_minutes FROM job_slas WHERE job_id = job_executions.job_id)`. Track data freshness SLA: `SELECT EXTRACT(EPOCH FROM (NOW() - MAX(updated_at)))/3600 AS hours_since_last_update FROM orders`. Set up Grafana dashboards showing SLA compliance trends.

### How do I handle batch processing for cost optimization?

Optimize batch processing costs by right-sizing resources and reducing waste. Use spot instances for non-critical batch jobs: `aws ec2 request-spot-instances --instance-count 10 --spot-price 0.10 --launch-specification file://spec.json`. For Kubernetes, use `spot` node pools with `priorityClassName: spot-batch`. Scale workers dynamically: `from kubernetes import client; client.autoscaling_v1.create_namespaced_horizontal_pod_autoscaler(...)`. Reduce database costs by batching reads: `SELECT * FROM orders WHERE id BETWEEN 0 AND 99999` instead of row-by-row queries. Use columnar storage (Parquet) for analytical batch jobs: `df.to_parquet('batch.parquet')` — 10x smaller than CSV with compression. Compress intermediate files: `import gzip; with gzip.open('batch.json.gz', 'wt') as f: json.dump(batch, f)`. Monitor costs per job: tag resources with job IDs and query AWS Cost Explorer: `aws ce get_cost_and_usage --filter '{"Tags":{"Key":"JobId","Values":["daily_etl"]}}'`. Optimize Spark jobs with Dynamic Resource Allocation: `spark.dynamicAllocation.enabled=true`. Archive old batch outputs to S3 Glacier for long-term storage at $0.004/GB/month.

### How do I handle batch processing for data archiving and retention?

Archive old batch data to reduce storage costs and improve query performance. Implement a retention policy: `DELETE FROM orders WHERE created_at < NOW() - INTERVAL '2 years'` — but archive first: `INSERT INTO orders_archive SELECT * FROM orders WHERE created_at < NOW() - INTERVAL '2 years'`. For PostgreSQL, use table partitioning with `pg_partman`: `SELECT partman.create_parent('public.orders', 'created_at', 'native', 'monthly')`. Drop old partitions: `SELECT partman.drop_partition_time('public.orders', '2024-01-01', p_archive_table => true)`. For S3 archiving, use lifecycle policies: transition to Glacier after 90 days, delete after 7 years. Compress archived data: `COPY (SELECT * FROM orders WHERE created_at < '2024-01-01') TO PROGRAM 'gzip > /tmp/orders_2023.csv.gz' WITH CSV HEADER`. For audit requirements, maintain an archive manifest: `CREATE TABLE archive_manifest (id SERIAL PRIMARY KEY, table_name VARCHAR(128), archive_date DATE, row_count BIGINT, file_path VARCHAR(512), checksum VARCHAR(64))`. Verify archive integrity: `SELECT count(*) FROM orders_archive WHERE created_at < '2024-01-01'` should match the manifest. Implement a restore procedure and test it quarterly.

### How do I handle batch processing for data reconciliation?

Reconcile batch outputs against source systems to detect data loss or corruption. After each batch, compare row counts: `SELECT source_count, target_count, source_count - target_count AS discrepancy FROM (SELECT COUNT(*) AS source_count FROM source.orders WHERE date = '2025-01-15') s CROSS JOIN (SELECT COUNT(*) AS target_count FROM target.orders WHERE date = '2025-01-15') t`. For financial data, reconcile sums: `SELECT source_sum, target_sum, source_sum - target_sum AS variance FROM (SELECT SUM(amount) AS source_sum FROM source.transactions) s CROSS JOIN (SELECT SUM(amount) AS target_sum FROM target.transactions) t`. Alert when variance exceeds threshold: `IF ABS(variance) > 0.01 THEN send_alert('RECONCILIATION_FAILED', variance)`. For checksum-based reconciliation, hash each row: `SELECT md5(string_agg(t.*::text, ',')) FROM table t WHERE batch_id = 42` and compare source vs target hashes. For event-driven reconciliation, count events per batch: `{"source_events": 10000, "target_events": 9998, "missing": 2}`. Store reconciliation results: `CREATE TABLE reconciliation_results (id SERIAL PRIMARY KEY, job_id VARCHAR(64), batch_id INT, source_count BIGINT, target_count BIGINT, variance NUMERIC, status VARCHAR(20), checked_at TIMESTAMP DEFAULT NOW())`. Run reconciliation after every batch and alert on mismatches within 5 minutes.

### How do I handle batch processing for data profiling?

Profile data before processing to understand its structure and quality. Use Python: `import pandas as pd; df = pd.read_csv('batch.csv'); profile = df.describe(include='all'); print(profile)`. For deeper profiling, use `pandas-profiling`: `from pandas_profiling import ProfileReport; report = ProfileReport(df); report.to_file('profile.html')`. Check column types: `df.dtypes`, null counts: `df.isnull().sum()`, unique values: `df.nunique()`, and value distributions: `df['status'].value_counts()`. For SQL profiling: `SELECT column_name, data_type, null_frac, n_distinct FROM pg_stats WHERE tablename = 'orders'`. Profile before each batch run to detect schema drift: if column types change or new columns appear, alert the team. Store profiles per batch: `CREATE TABLE batch_profiles (id SERIAL PRIMARY KEY, job_id VARCHAR(64), batch_id INT, column_name VARCHAR(128), data_type VARCHAR(64), null_count INT, unique_count INT, profile_json JSONB, created_at TIMESTAMP DEFAULT NOW())`. Compare profiles across batches to detect anomalies: `SELECT batch_id, unique_count FROM batch_profiles WHERE column_name = 'email' ORDER BY batch_id DESC LIMIT 5`.

### How do I handle batch processing for data sampling and testing?

Sample batch data for quick testing and validation before full processing. Random sampling in Python: `import random; sample = random.sample(batch, min(100, len(batch)))`. Stratified sampling for balanced representation: `from sklearn.model_selection import train_test_split; sample, _ = train_test_split(batch, train_size=0.1, stratify=[item['category'] for item in batch])`. For SQL sampling: `SELECT * FROM orders TABLESAMPLE BERNOULLI(10)` for 10% random sample, or `SELECT * FROM orders TABLESAMPLE SYSTEM(10)` for block-based sampling (faster, less random). Use reservoir sampling for streaming data: `import reservoir; r = reservoir.Reservoir(1000); for item in stream: r.add(item); sample = r.sample()`. Store samples for regression testing: `CREATE TABLE batch_samples (id SERIAL PRIMARY KEY, job_id VARCHAR(64), batch_id INT, sample_data JSONB, created_at TIMESTAMP DEFAULT NOW())`. Run transformations on samples first to validate logic: `result = transform(sample); assert validate(result)`. Compare sample results with previous runs to detect regressions. Use samples for performance testing: measure transformation time on 1000 records, then extrapolate.

### How do I handle batch processing for data governance?

Implement data governance in batch pipelines to ensure compliance and auditability. Tag data with classification levels: `CREATE TABLE data_classifications (table_name VARCHAR(128), column_name VARCHAR(128), classification VARCHAR(20) CHECK (classification IN ('public', 'internal', 'confidential', 'restricted')), PRIMARY KEY (table_name, column_name))`. Enforce access controls based on classification: `SELECT * FROM orders WHERE NOT EXISTS (SELECT 1 FROM data_classifications WHERE table_name = 'orders' AND column_name = 'ssn' AND classification = 'restricted') OR current_user IN (SELECT user_id FROM authorized_users WHERE clearance = 'restricted')`. Track data lineage for audit: `INSERT INTO audit_log (user_id, action, table_name, batch_id, timestamp) VALUES (current_user, 'READ', 'orders', 42, NOW())`. Implement data retention policies: `SELECT apply_retention_policy('orders', INTERVAL '7 years')`. Generate compliance reports per batch: `{"batch_id": 42, "classification": "confidential", "accessed_by": ["etl_service"], "retention_days": 2555, "encrypted": true}`. Use Apache Atlas or DataHub for centralized governance metadata. For GDPR, implement right-to-be-forgotten: `DELETE FROM orders WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com')` and cascade to all related tables.

### How do I handle batch processing for data cataloging?

Catalog batch data assets for discoverability and lineage tracking. Use a metadata catalog: `CREATE TABLE data_catalog (id SERIAL PRIMARY KEY, asset_name VARCHAR(256), asset_type VARCHAR(50), owner VARCHAR(128), description TEXT, tags TEXT[], created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP)`. Register each batch output: `INSERT INTO data_catalog (asset_name, asset_type, owner, description, tags) VALUES ('orders_clean', 'table', 'data_team', 'Cleaned orders from ETL pipeline', ARRAY['orders', 'etl', 'daily'])`. For Apache Hive, use `DESCRIBE FORMATTED orders_clean` to retrieve table metadata. For AWS Glue Data Catalog, use boto3: `import boto3; glue = boto3.client('glue'); glue.create_database(DatabaseInput={'Name': 'analytics'})`. Update catalog on schema changes: `UPDATE data_catalog SET updated_at = NOW() WHERE asset_name = 'orders_clean'`. Search catalog: `SELECT * FROM data_catalog WHERE tags @> ARRAY['orders'] AND asset_type = 'table'`. Integrate with DataHub or Amundsen for web-based catalog browsing. Maintain column-level descriptions: `CREATE TABLE column_catalog (asset_name VARCHAR(256), column_name VARCHAR(128), description TEXT, data_type VARCHAR(64), PRIMARY KEY (asset_name, column_name))`.

### How do I handle batch processing for data versioning?

Version batch outputs to track changes over time and enable rollback. Use a `version` column: `ALTER TABLE orders ADD COLUMN batch_version INT DEFAULT 1`. On each batch run, increment: `INSERT INTO orders (id, amount, batch_version) VALUES (1, 100.00, 42)`. For time-travel queries: `SELECT * FROM orders WHERE batch_version = 42`. For Delta Lake: `df.write.format('delta').mode('overwrite').option('overwriteSchema', 'true').save('/delta/orders')` and query previous versions: `spark.read.format('delta').option('versionAsOf', 10).load('/delta/orders')`. For Apache Iceberg: `SELECT * FROM orders.history` to see snapshots and `SELECT * FROM orders.snapshots` for metadata. For PostgreSQL, use `temporal_tables` extension: `CREATE TABLE orders_history (LIKE orders INCLUDING ALL); SELECT temporal.create_history_table('orders')`. Query historical data: `SELECT * FROM orders FOR SYSTEM_TIME AS OF '2025-01-01'`. Implement a rollback procedure: `DELETE FROM orders WHERE batch_version = 42` to undo a specific batch. Store batch metadata: `CREATE TABLE batch_versions (batch_id INT PRIMARY KEY, version INT, started_at TIMESTAMP, completed_at TIMESTAMP, row_count BIGINT, checksum VARCHAR(64))`.

### How do I handle batch processing for data contracts?

Data contracts define schema expectations between producers and consumers. Implement contract validation: `CREATE TABLE data_contracts (contract_id SERIAL PRIMARY KEY, producer VARCHAR(128), consumer VARCHAR(128), schema_json JSONB, version INT, created_at TIMESTAMP DEFAULT NOW())`. Validate incoming batch against contract: `import jsonschema; schema = json.load(contract_schema); jsonschema.validate(batch_data, schema)`. On violation: `raise ContractViolation(f'Batch {batch_id} failed contract {contract_id}: {error.message}')`. Use Protobuf for typed contracts: `syntax = "proto3"; message Order { int64 id = 1; double amount = 2; string status = 3; }`. For Avro: `{"type": "record", "name": "Order", "fields": [{"name": "id", "type": "long"}, {"name": "amount", "type": "double"}]}`. Register schemas in a schema registry: `POST /subjects/orders-value/versions` with the Avro schema. Consumers fetch the latest schema: `GET /subjects/orders-value/versions/latest`. On breaking changes, bump the contract version and notify all consumers. Store contract violations: `CREATE TABLE contract_violations (id SERIAL PRIMARY KEY, contract_id INT, batch_id INT, error_message TEXT, violated_at TIMESTAMP DEFAULT NOW())`.

## See Also

- [Database Indexing](/recipes/performance/database-indexing) — optimizing query performance for batch reads
- [Web Performance](/recipes/performance/web-performance) — frontend and backend performance techniques
- [Load Testing](/recipes/performance/load-testing) — validating batch job performance under load
