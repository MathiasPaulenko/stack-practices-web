---
contentType: recipes
slug: batch-processing-patterns
title: "Batch Processing Patterns"
description: "Design robust batch processing pipelines for large datasets with retry logic, idempotency, and observability."
metaDescription: "Batch processing patterns for large datasets: robust pipeline design, retry logic, idempotency, and observability best practices for ETL and reporting workflows."
difficulty: intermediate
topics:
  - data
tags:
  - batch-processing
  - data
  - performance
  - architecture
relatedResources:
  - /recipes/caching
  - /recipes/data-validation
  - /recipes/date-formatting
  - /recipes/deep-clone-javascript
  - /recipes/flatten-unflatten-objects
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Batch processing patterns for large datasets: robust pipeline design, retry logic, idempotency, and observability best practices for ETL and reporting workflows."
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

## Best Practices

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

**Q: How large should each batch be?**
A: Start with 100-1000 items. Benchmark with your data and memory constraints.

**Q: Should I use a job queue like Celery or a cron job?**
A: Use Celery/Redis for distributed systems and cron for single-node, simple pipelines. See [Rate Limiting](/recipes/api/rate-limiting) for controlling throughput.

**Q: How do I handle schema changes mid-pipeline?**
A: Version your job logic and data schemas. Run old and new versions in parallel during migration.
