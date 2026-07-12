---


contentType: patterns
slug: data-lineage-tracking-pattern
title: "Patrón Data Lineage Tracking"
description: "Cómo trackear data origin y transformations end-to-end. Cubre column-level lineage, OpenLineage, Marquez, metadata injection, y impact analysis."
metaDescription: "Trackea data origin y transformations end-to-end. Aprende column-level lineage, OpenLineage, Marquez, metadata injection, y impact analysis strategies."
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
  metaDescription: "Trackea data origin y transformations end-to-end. Aprende column-level lineage, OpenLineage, Marquez, metadata injection, y impact analysis strategies."
  keywords:
    - data
    - lineage
    - metadata
    - openlineage
    - governance
    - pattern


---

## Overview

Data lineage trackea de dónde viene el data, cómo se transforma, y dónde termina. Cada pipeline run, cada SQL transformation, cada column mapping se recordea como metadata. Esto crea un graph: source table → transformation → intermediate table → final report. Cuando un source column cambia, podás tracear qué downstream tables, dashboards, y ML models dependen de él. OpenLineage es el open standard para lineage metadata, y Marquez es su reference implementation. Lineage es essential para data governance, impact analysis, debugging, y compliance (GDPR, CCPA require saber dónde personal data fluye).

## When to Use

- Data governance y compliance (GDPR, CCPA, SOX)
- Impact analysis antes de schema changes o pipeline modifications
- Debugging data quality issues — traceando bad data back al source
- Multi-team data platforms donde los teams necesitan entender dependencies
- Regulatory audits que requieren data flow documentation

## When NOT to Use

- Projects chicos con un single pipeline y no dependencies
- Prototypes y exploratory work
- Systems donde todos los data flows están documented manually y raramente cambian

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

### Python lineage tracking con OpenLineage

```python
# lineage_tracker.py — emití OpenLineage events desde Python pipelines
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

### Usando lineage tracker en un pipeline

```python
# etl_with_lineage.py — ETL pipeline con lineage tracking
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

        # Corré el actual ETL
        df = extract_from_source()
        df = transform(df)
        load_to_warehouse(df)

        tracker.complete(inputs, outputs)

    except Exception as e:
        tracker.fail(str(e))
        raise
```

### Column-level lineage con SQL parsing

```python
# column_lineage.py — extractá column-level lineage desde SQL
import sqlglot
from sqlglot import exp

def extract_column_lineage(sql, source_table, target_table):
    """Parseá SQL y extractá column-level lineage."""
    parsed = sqlglot.parse_one(sql)
    lineage = {}

    for select in parsed.find_all(exp.Select):
        for column in select.find_all(exp.Column):
            col_name = column.name
            source_col = column.name

            # Checkeá si es un alias o expression
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
-- impact_analysis.sql — encontrá todos los downstream tables affected por un source change
WITH RECURSIVE lineage_graph AS (
    -- Arrancá desde el changed table
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

    -- Recursá a través de downstream dependencies
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

### Airflow integration con OpenLineage

```python
# airflow_lineage.py — Airflow DAG con automatic lineage extraction
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

# Airflow automáticamente emite OpenLineage events cuando configured
# Agregá a airflow.cfg:
# [openlineage]
# transport = {"type": "http", "url": "http://marquez:5000"}
# extraction_filter = airflow.providers.openlineage.extractors.python.PythonOperatorExtractor

def extract(**context):
    import pandas as pd
    # Airflow extractor leé XCom para dataset info
    context['ti'].xcom_push(key='inputs', value=[
        {"namespace": "postgres://source", "name": "shop.customers"}
    ])
    context['ti'].xcom_push(key='outputs', value=[
        {"namespace": "postgres://warehouse", "name": "warehouse.customers"}
    ])
    # Actual ETL logic acá
    pass

extract_task = PythonOperator(
    task_id='extract',
    python_callable=extract,
    provide_context=True,
    dag=dag,
)
```

### Java lineage con custom metadata

```java
// LineageEmitter.java — emití lineage events desde Java pipelines
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

### Table-level lineage (más simple)

```python
# table_lineage.py — simple table-level lineage sin column detail
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
        """Encontrá todos los tables que dependen de este table."""
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

### Lineage desde dbt models

```yaml
# dbt_lineage.yml — dbt automáticamente genera lineage desde model dependencies
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


- For a deeper guide, see [Batch-to-Streaming Bridge](/es/patterns/batch-to-streaming-bridge-pattern/).

- Emití lineage events en both START y COMPLETE — para que podás ver running pipelines y sus results
- Trackeá column-level lineage cuando sea possible — table-level es un start, pero column-level habilita precise impact analysis
- Usá OpenLineage standard — no buildéas un custom lineage format; OpenLineage tiene wide tool support
- Incluí SQL en job facets — el SQL query es el most useful lineage metadata para debugging
- Automatizá lineage collection — usá extractors para Airflow, Spark, dbt en vez de manual emission
- Storeá lineage en un queryable system — Marquez, DataHub, o Amundsen para queryear el lineage graph
- Corré impact analysis antes de schema changes — "¿quién depende de este column?" antes de droppearlo
- Mantené lineage metadata in sync — si un pipeline se remove, clean up sus lineage edges

## Common Mistakes

- **No lineage at all**: cuando algo breakea, no podás tracear el data back al source. Manual investigation takes hours.
- **Solo table-level lineage**: sabés que `warehouse.customers` depende de `source.customers` pero no qué columns. Droppear un column breakea unknown downstream consumers.
- **No incluir SQL**: lineage sin el actual SQL hace hard de entender qué el transformation hace.
- **Manual lineage tracking**: mantener lineage en spreadsheets o wikis. Siempre está out of date. Automatizalo.
- **No impact analysis**: hacer schema changes sin checkear qué depende de los changed columns.

## FAQ

### ¿Qué es data lineage?

Un record de de dónde viene el data, cómo se transforma, y dónde fluye. Es un graph connecting source tables, transformations, intermediate tables, y final outputs (dashboards, ML models, reports).

### ¿Qué es OpenLineage?

Un open standard para lineage metadata. Define un JSON event format para recording pipeline runs, sus inputs, outputs, y transformations. Marquez es el reference implementation. Airflow, Spark, y dbt tienen OpenLineage integrations.

### ¿Qué es column-level lineage?

Lineage que trackea individual columns, no solo tables. Sabés que `warehouse.customers.is_active` viene de `source.customers.status`. Esto habilita precise impact analysis cuando un source column cambia.

### ¿Cómo implemento lineage con dbt?

dbt genera lineage automáticamente desde model dependencies (`ref()` calls). Corré `dbt docs generate` y vieweá el lineage graph en `localhost:8080`. Para OpenLineage integration, usá el dbt-openlineage adapter.

### ¿Por qué lineage es importante para compliance?

GDPR y CCPA requiren saber dónde personal data fluye. Si un user requestea data deletion, necesitás tracear su data a través de todos los tables, pipelines, y downstream systems. Lineage provee este map.
