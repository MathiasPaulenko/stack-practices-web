---


contentType: patterns
slug: data-lineage-tracking-pattern
title: "Data Lineage Tracking: Track Origin End-to-End"
description: "How to track data origin and transformations end-to-end. Covers column-level lineage, OpenLineage, Marquez, metadata injection, and impact analysis."
metaDescription: "Track data origin and transformations end-to-end. Learn column-level lineage, OpenLineage, Marquez, metadata injection, and impact analysis strategies."
difficulty: advanced
topics:
  - data
tags:
  - data
  - lineage
  - metadata
  - openlineage
  - governance
  - pattern
category: architectural
relatedResources:
  - /patterns/etl-extract-transform-load-pattern
  - /patterns/cdc-change-data-capture-pattern
  - /patterns/schema-registry-evolution-pattern
  - /patterns/idempotent-load-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Track data origin and transformations end-to-end. Learn column-level lineage, OpenLineage, Marquez, metadata injection, and impact analysis strategies."
  keywords:
    - data
    - lineage
    - metadata
    - openlineage
    - governance
    - pattern


---

## Overview

Data lineage tracks where data comes from, how it's transformed, and where it ends up. Every pipeline run, every SQL transformation, every column mapping is recorded as metadata. This creates a graph: source table → transformation → intermediate table → final report. When a source column changes, you can trace which downstream tables, dashboards, and ML models depend on it. OpenLineage is the open standard for lineage metadata, and Marquez is its reference implementation. Lineage is essential for data governance, impact analysis, debugging, and compliance (GDPR, CCPA require knowing where personal data flows).

## When to Use

- Data governance and compliance (GDPR, CCPA, SOX)
- Impact analysis before schema changes or pipeline modifications
- Debugging data quality issues — tracing bad data back to the source
- Multi-team data platforms where teams need to understand dependencies
- Regulatory audits requiring data flow documentation

## When NOT to Use

- Small projects with a single pipeline and no dependencies
- Prototypes and exploratory work
- Systems where all data flows are documented manually and rarely change

## Solution

### OpenLineage event structure

```json
// openlineage_event.json — OpenLineage run event
{
  "eventType": "START",
  "eventTime": "2026-07-05T10:00:00.000Z",
  "run": {
    "runId": "abc-123-def",
    "facets": {
      "nominalTime": {
        "_producer": "https://github.com/OpenLineage/OpenLineage",
        "_schemaURL": "https://openlineage.io/schema/facets/1.0/nominalTime.json",
        "nominalStartTime": "2026-07-05T10:00:00.000Z",
        "nominalEndTime": "2026-07-05T10:05:00.000Z"
      }
    }
  },
  "job": {
    "namespace": "shop",
    "name": "etl.customers_daily",
    "facets": {
      "sql": {
        "query": "SELECT id, email, status FROM source.customers WHERE updated_at >= ?"
      }
    }
  },
  "inputs": [
    {
      "namespace": "postgres://source-db",
      "name": "shop.public.customers",
      "facets": {
        "schema": {
          "fields": [
            {"name": "id", "type": "long"},
            {"name": "email", "type": "string"},
            {"name": "status", "type": "string"}
          ]
        }
      }
    }
  ],
  "outputs": [
    {
      "namespace": "postgres://warehouse",
      "name": "warehouse.customers",
      "facets": {
        "schema": {
          "fields": [
            {"name": "id", "type": "long"},
            {"name": "email", "type": "string"},
            {"name": "status", "type": "string"},
            {"name": "is_active", "type": "boolean"}
          ]
        },
        "columnLineage": {
          "fields": {
            "is_active": {
              "inputFields": [
                {"namespace": "postgres://source-db", "name": "shop.public.customers", "field": "status"}
              ]
            }
          }
        }
      }
    }
  ]
}
```

### Python lineage tracking with OpenLineage

```python
# lineage_tracker.py — emit OpenLineage events from Python pipelines
from openlineage.client import OpenLineageClient
from openlineage.client.run import (
    Run, RunEvent, Job, Dataset, OutputDataset, InputDataset
)
import uuid
from datetime import datetime

client = OpenLineageClient(url="http://marquez:5000", api_key=None)

class LineageTracker:
    def __init__(self, job_name, job_namespace="shop"):
        self.job = Job(namespace=job_namespace, name=job_name)
        self.run_id = str(uuid.uuid4())

    def start(self, inputs, outputs, sql=None):
        run = Run(runId=self.run_id)

        job_facets = {}
        if sql:
            job_facets["sql"] = {"query": sql}

        self.job.facets = job_facets

        event = RunEvent(
            eventType="START",
            eventTime=datetime.now().isoformat(),
            run=run,
            job=self.job,
            inputs=[self._to_input_dataset(d) for d in inputs],
            outputs=[self._to_output_dataset(d) for d in outputs]
        )
        client.emit(event)

    def complete(self, inputs, outputs):
        run = Run(runId=self.run_id)

        event = RunEvent(
            eventType="COMPLETE",
            eventTime=datetime.now().isoformat(),
            run=run,
            job=self.job,
            inputs=[self._to_input_dataset(d) for d in inputs],
            outputs=[self._to_output_dataset(d) for d in outputs]
        )
        client.emit(event)

    def fail(self, error_message):
        run = Run(runId=self.run_id)
        run.facets = {"errorMessage": {"message": error_message}}

        event = RunEvent(
            eventType="FAIL",
            eventTime=datetime.now().isoformat(),
            run=run,
            job=self.job,
            inputs=[],
            outputs=[]
        )
        client.emit(event)

    def _to_input_dataset(self, spec):
        return InputDataset(
            namespace=spec.get("namespace", "default"),
            name=spec["name"],
            facets=spec.get("facets", {})
        )

    def _to_output_dataset(self, spec):
        return OutputDataset(
            namespace=spec.get("namespace", "default"),
            name=spec["name"],
            facets=spec.get("facets", {}),
            outputFacets={}
        )
```

### Using lineage tracker in a pipeline

```python
# etl_with_lineage.py — ETL pipeline with lineage tracking
from lineage_tracker import LineageTracker

def run_customer_etl():
    tracker = LineageTracker("etl.customers_daily")

    inputs = [{
        "namespace": "postgres://source-db",
        "name": "shop.public.customers",
        "facets": {
            "schema": {
                "fields": [
                    {"name": "id", "type": "long"},
                    {"name": "email", "type": "string"},
                    {"name": "status", "type": "string"}
                ]
            }
        }
    }]

    outputs = [{
        "namespace": "postgres://warehouse",
        "name": "warehouse.customers",
        "facets": {
            "schema": {
                "fields": [
                    {"name": "id", "type": "long"},
                    {"name": "email", "type": "string"},
                    {"name": "is_active", "type": "boolean"}
                ]
            },
            "columnLineage": {
                "fields": {
                    "is_active": {
                        "inputFields": [
                            {"namespace": "postgres://source-db",
                             "name": "shop.public.customers",
                             "field": "status"}
                        ]
                    }
                }
            }
        }
    }]

    sql = "SELECT id, LOWER(email) as email, status = 'active' as is_active FROM source.customers"

    try:
        tracker.start(inputs, outputs, sql=sql)

        # Run the actual ETL
        df = extract_from_source()
        df = transform(df)
        load_to_warehouse(df)

        tracker.complete(inputs, outputs)

    except Exception as e:
        tracker.fail(str(e))
        raise
```

### Column-level lineage with SQL parsing

```python
# column_lineage.py — extract column-level lineage from SQL
import sqlglot
from sqlglot import exp

def extract_column_lineage(sql, source_table, target_table):
    """Parse SQL and extract column-level lineage."""
    parsed = sqlglot.parse_one(sql)
    lineage = {}

    for select in parsed.find_all(exp.Select):
        for column in select.find_all(exp.Column):
            col_name = column.name
            source_col = column.name

            # Check if it's an alias or expression
            parent = column.parent
            if isinstance(parent, exp.Alias):
                target_col = parent.alias
            elif isinstance(parent, exp.EQ):
                target_col = parent.left.name
            else:
                target_col = col_name

            if target_col not in lineage:
                lineage[target_col] = []

            lineage[target_col].append({
                "source_table": source_table,
                "source_column": source_col
            })

    return lineage

# Example
sql = """
SELECT
    id,
    LOWER(email) AS email,
    status = 'active' AS is_active,
    CONCAT(first_name, ' ', last_name) AS full_name
FROM source.customers
"""

lineage = extract_column_lineage(sql, "source.customers", "warehouse.customers")
# Result:
# {
#   "id": [{"source_table": "source.customers", "source_column": "id"}],
#   "email": [{"source_table": "source.customers", "source_column": "email"}],
#   "is_active": [{"source_table": "source.customers", "source_column": "status"}],
#   "full_name": [{"source_table": "source.customers", "source_column": "first_name"},
#                 {"source_table": "source.customers", "source_column": "last_name"}]
# }
```

### Impact analysis query

```sql
-- impact_analysis.sql — find all downstream tables affected by a source change
WITH RECURSIVE lineage_graph AS (
    -- Start from the changed table
    SELECT
        downstream_table,
        downstream_column,
        upstream_table,
        upstream_column,
        1 AS depth
    FROM lineage_edges
    WHERE upstream_table = 'source.customers'
      AND upstream_column = 'email'

    UNION ALL

    -- Recurse through downstream dependencies
    SELECT
        e.downstream_table,
        e.downstream_column,
        e.upstream_table,
        e.upstream_column,
        g.depth + 1
    FROM lineage_edges e
    JOIN lineage_graph g ON e.upstream_table = g.downstream_table
                        AND e.upstream_column = g.downstream_column
    WHERE g.depth < 10  -- prevent infinite loops
)
SELECT DISTINCT
    downstream_table,
    downstream_column,
    depth,
    STRING_AGG(upstream_table || '.' || upstream_column, ' -> ') AS path
FROM lineage_graph
GROUP BY downstream_table, downstream_column, depth
ORDER BY depth, downstream_table;
```

### Airflow integration with OpenLineage

```python
# airflow_lineage.py — Airflow DAG with automatic lineage extraction
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.openlineage.extractors.python import PythonOperatorExtractor
from datetime import datetime, timedelta

default_args = {
    'owner': 'data-team',
    'depends_on_past': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

dag = DAG(
    'etl_with_lineage',
    default_args=default_args,
    schedule_interval='0 2 * * *',
    start_date=datetime(2026, 1, 1),
    tags=['etl', 'lineage'],
)

# Airflow automatically emits OpenLineage events when configured
# Add to airflow.cfg:
# [openlineage]
# transport = {"type": "http", "url": "http://marquez:5000"}
# extraction_filter = airflow.providers.openlineage.extractors.python.PythonOperatorExtractor

def extract(**context):
    import pandas as pd
    # Airflow extractor reads XCom for dataset info
    context['ti'].xcom_push(key='inputs', value=[
        {"namespace": "postgres://source", "name": "shop.customers"}
    ])
    context['ti'].xcom_push(key='outputs', value=[
        {"namespace": "postgres://warehouse", "name": "warehouse.customers"}
    ])
    # Actual ETL logic here
    pass

extract_task = PythonOperator(
    task_id='extract',
    python_callable=extract,
    provide_context=True,
    dag=dag,
)
```

### Java lineage with custom metadata

```java
// LineageEmitter.java — emit lineage events from Java pipelines
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import java.time.Instant;

public class LineageEmitter {
    private static final String MARQUEZ_URL = "http://marquez:5000";
    private final HttpClient client = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    public void emitRun(String jobName, String runId, String eventType,
                        String[] inputTables, String[] outputTables) {
        try {
            var event = mapper.createObjectNode();
            event.put("eventType", eventType);
            event.put("eventTime", Instant.now().toString());

            var run = mapper.createObjectNode();
            run.put("runId", runId);
            event.set("run", run);

            var job = mapper.createObjectNode();
            job.put("namespace", "shop");
            job.put("name", jobName);
            event.set("job", job);

            var inputs = mapper.createArrayNode();
            for (String table : inputTables) {
                var ds = mapper.createObjectNode();
                ds.put("namespace", "postgres://source");
                ds.put("name", table);
                inputs.add(ds);
            }
            event.set("inputs", inputs);

            var outputs = mapper.createArrayNode();
            for (String table : outputTables) {
                var ds = mapper.createObjectNode();
                ds.put("namespace", "postgres://warehouse");
                ds.put("name", table);
                outputs.add(ds);
            }
            event.set("outputs", outputs);

            var request = HttpRequest.newBuilder()
                .uri(URI.create(MARQUEZ_URL + "/api/v1/lineage"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(event)))
                .build();

            client.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (Exception e) {
            throw new RuntimeException("Failed to emit lineage event", e);
        }
    }
}
```

## Variants

### Table-level lineage (simpler)

```python
# table_lineage.py — simple table-level lineage without column detail
class TableLineage:
    def __init__(self):
        self.edges = []  # list of (source_table, target_table, job_name)

    def record(self, source, target, job):
        self.edges.append({
            "source": source,
            "target": target,
            "job": job,
            "recorded_at": datetime.now().isoformat()
        })

    def get_downstream(self, table):
        """Find all tables that depend on this table."""
        visited = set()
        queue = [table]
        result = []

        while queue:
            current = queue.pop(0)
            for edge in self.edges:
                if edge["source"] == current and edge["target"] not in visited:
                    visited.add(edge["target"])
                    result.append(edge["target"])
                    queue.append(edge["target"])

        return result
```

### Lineage from dbt models

```yaml
# dbt_lineage.yml — dbt automatically generates lineage from model dependencies
version: 2
models:
  - name: stg_customers
    description: "Staged customer data"
    columns:
      - name: id
        tests: [not_null, unique]
      - name: email
        tests: [not_null]

  - name: dim_customers
    description: "Customer dimension with enriched fields"
    depends_on:
      - ref('stg_customers')
      - ref('stg_orders')
    columns:
      - name: customer_id
        tests: [not_null, unique]
      - name: lifetime_value
        description: "Calculated from stg_orders"
```

## Best Practices


- For a deeper guide, see [Batch-to-Streaming Bridge](/patterns/batch-to-streaming-bridge-pattern/).

- Emit lineage events at both START and COMPLETE — so you can see running pipelines and their results
- Track column-level lineage when possible — table-level is a start, but column-level enables precise impact analysis
- Use OpenLineage standard — don't build a custom lineage format; OpenLineage has wide tool support
- Include SQL in job facets — the SQL query is the most useful lineage metadata for debugging
- Automate lineage collection — use extractors for Airflow, Spark, dbt instead of manual emission
- Store lineage in a queryable system — Marquez, DataHub, or Amundsen for querying the lineage graph
- Run impact analysis before schema changes — "who depends on this column?" before dropping it
- Keep lineage metadata in sync — if a pipeline is removed, clean up its lineage edges

## Common Mistakes

- **No lineage at all**: when something breaks, you can't trace the data back to the source. Manual investigation takes hours.
- **Only table-level lineage**: you know `warehouse.customers` depends on `source.customers` but not which columns. Dropping a column breaks unknown downstream consumers.
- **Not including SQL**: lineage without the actual SQL makes it hard to understand what the transformation does.
- **Manual lineage tracking**: maintaining lineage in spreadsheets or wikis. It's always out of date. Automate it.
- **No impact analysis**: making schema changes without checking what depends on the changed columns.

## FAQ

### What is data lineage?

A record of where data comes from, how it's transformed, and where it flows. It's a graph connecting source tables, transformations, intermediate tables, and final outputs (dashboards, ML models, reports).

### What is OpenLineage?

An open standard for lineage metadata. It defines a JSON event format for recording pipeline runs, their inputs, outputs, and transformations. Marquez is the reference implementation. Airflow, Spark, and dbt have OpenLineage integrations.

### What is column-level lineage?

Lineage that tracks individual columns, not just tables. You know that `warehouse.customers.is_active` comes from `source.customers.status`. This enables precise impact analysis when a source column changes.

### How do I implement lineage with dbt?

dbt generates lineage automatically from model dependencies (`ref()` calls). Run `dbt docs generate` and view the lineage graph at `localhost:8080`. For OpenLineage integration, use the dbt-openlineage adapter.

### Why is lineage important for compliance?

GDPR and CCPA require knowing where personal data flows. If a user requests data deletion, you need to trace their data across all tables, pipelines, and downstream systems. Lineage provides this map.
