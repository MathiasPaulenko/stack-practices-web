---


contentType: recipes
slug: batch-processing-patterns
title: "Patrones de Procesamiento por Lotes"
description: "Diseña pipelines robustos de procesamiento por lotes para grandes datasets con retry, idempotencia y observabilidad."
metaDescription: "Patrones de procesamiento por lotes para grandes datasets: diseño robusto de pipelines, retry, idempotencia y lo que funciona de observabilidad para ETL."
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
  - /recipes/deep-clone-structured
  - /recipes/uuid-generation-strategies
lastUpdated: "2026-07-09"
author: "StackPractices"
seo:
  metaDescription: "Patrones de procesamiento por lotes para grandes datasets: diseño robusto de pipelines, retry, idempotencia y lo que funciona de observabilidad para ETL."
  keywords:
    - batch-processing
    - data
    - performance
    - architecture


---
## Visión General

El procesamiento por lotes es la columna vertebral de pipelines de datos, flujos de trabajo ETL y generación de reportes. A diferencia del procesamiento de streams, los trabajos por lotes procesan conjuntos de datos acotados en chunks, lo que los hace más simples de razonar pero requieren atención cuidadosa a la idempotencia, tolerancia a fallos y observabilidad.

## Cuándo Usar

Usa este recurso cuando:
- Procesas grandes datasets que no caben en memoria. Consulta [Retry Logic](/recipes/architecture/retry-backoff) para manejar fallos transitorios.
- Construyes pipelines ETL para data warehouses
- Generas reportes o agregaciones nocturnas
- Migras datos entre sistemas con ventanas de mantenimiento

## Solución

### Pipeline Resiliente de Procesamiento por Lotes (Python)

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
                logging.warning(f"Batch fallido (intento {attempt + 1}): {e}")
                if attempt == self.max_retries - 1:
                    self.failed.extend(batch)
```

### Seguimiento Idempotente de Trabajos (SQL)

```sql
CREATE TABLE job_runs (
    job_id VARCHAR(64) PRIMARY KEY,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('running', 'completed', 'failed')),
    checksum VARCHAR(64)
);

-- Antes de comenzar, verifica si ya está completado
SELECT * FROM job_runs WHERE job_id = 'daily_report_2025_01_15' AND status = 'completed';
```

## Explicación

Un pipeline de producción por lotes necesita tres propiedades:

1. **Idempotencia**: Ejecutar el mismo trabajo dos veces debe producir el mismo resultado. Usa IDs de trabajo y checksums para saltar trabajo ya procesado. Consulta [Endpoints Idempotentes](/recipes/api/idempotent-api-endpoints) para patrones de deduplicación.
2. **Tolerancia a fallos**: Fallos individuales de batch no deben crashear todo el trabajo. Implementa reintentos con backoff exponencial y una cola de mensajes fallidos.
3. **Observabilidad**: Rastrea progreso, throughput y errores. [Registra](/recipes/api/logging) métricas para items procesados, latencia y tasas de fallo.

**Estrategia de chunking**: Ajusta el tamaño de batches para balancear uso de memoria y throughput. Demasiado pequeño = overhead; demasiado grande = riesgo de OOM.

## Variantes

| Patrón | Caso de Uso | Compromiso |
|--------|-------------|------------|
| Procesamiento por chunks | Archivos grandes, límites de memoria | Más simple, mayor latencia |
| Workers paralelos | Transformaciones CPU-bound | Complejo, necesita coordinación |
| MapReduce | Agregación distribuida | Escala horizontalmente |
| Change Data Capture | Sincronización incremental | Requiere soporte de la fuente |

## Lo que funciona

- **Diseña para idempotencia**: Cada trabajo debe ser seguro de reintentar
- **Registra todo**: Inicio de trabajo, fin, y resultado de cada batch
- **Usa transacciones**: Envuelve escrituras de batch en transacciones de base de datos
- **Monitorea profundidad de cola**: Alerta cuando batches pendientes excedan umbrales
- **Implementa [circuit breakers](/recipes/circuit-breaker-pattern-recipe)**: Detén reintentos si el downstream está unhealthy

## Errores Comunes

1. **No manejar fallos parciales**: Un batch de 1000 donde 1 falla necesita reintento individual
2. **Ignorar límites de memoria**: Cargar datasets enteros en RAM crashea el proceso
3. **Faltar checkpointing**: Un trabajo de 6 horas que falla a las 5:55 debe reiniciar desde cero
4. **Pérdida silenciosa de datos**: Errores logueados pero no visibles para operadores
5. **Sin estrategia de rollback**: Trabajos fallidos dejan la base de datos en estado inconsistente

## Preguntas Frecuentes

### ¿Qué tan grande debería ser cada batch?

Comienza con 100-1000 items por batch. Haz benchmark con tus datos y restricciones de memoria. Para inserts en base de datos, 500-2000 rows por batch balancea throughput y tamaño de transacción. Para procesamiento de archivos, 10-50 MB por chunk evita OOM en contenedores de 512 MB. Monitorea el uso de memoria con `resource.getrusage(resource.RUSAGE_SELF).ru_maxrss` en Python. Si los batches exceden la memoria disponible, reduce el batch size o cambia a streaming. Para APIs network-bound, batches más grandes (500-5000) amortizan latencia. Para transforms CPU-bound, batches más pequeños (100-500) permiten mejor paralelismo. Siempre testea con volúmenes de datos similares a producción — los datos sintéticos raramente revelan patrones de presión de memoria.

### ¿Debería usar una cola de trabajos como Celery o un cron job?

Usa Celery/Redis para sistemas distribuidos con múltiples workers, retry logic y monitoreo. Celery provee task routing, priority queues y dead-letter handling out of the box. Para pipelines simples de un solo nodo, cron jobs bastan — pero añade `flock` para prevenir runs overlapping: `flock -n /tmp/batch.lock python batch_job.py`. Para Kubernetes, usa recursos `CronJob` con `concurrencyPolicy: Forbid`. Consulta [Rate Limiting](/recipes/api/rate-limiting) para controlar throughput. Para setups cloud-native, AWS Step Functions o Google Cloud Workflows proveen retry y state management manejados sin overhead de infraestructura.

### ¿Cómo manejo cambios de schema en medio del pipeline?

Versiona tu lógica de trabajo y schemas de datos. Ejecuta versiones viejas y nuevas en paralelo durante la migración. Usa una columna `schema_version` en las tablas target: `ALTER TABLE orders ADD COLUMN schema_version INT DEFAULT 1`. El batch job verifica `schema_version` y aplica la transformación correcta. Para Avro/Protobuf, usa schema registry para manejar cambios backward-compatible. Para JSON, valida con JSON Schema versionado por `$id`. Despliega nuevas versiones del job con un feature flag: `if config.use_new_schema: transform_v2(record) else: transform_v1(record)`. Monitorea la salida de ambas versiones para discrepancias. Una vez confiado, descomisiona la versión vieja.

### ¿Cómo implemento checkpointing para batch jobs de larga duración?

El checkpointing guarda el progreso para que los jobs fallidos resuman desde el último batch exitoso. Almacena checkpoints en una tabla durable: `CREATE TABLE job_checkpoints (job_id VARCHAR(64), batch_number INT, status VARCHAR(20), PRIMARY KEY (job_id, batch_number))`. Después de cada batch, escribe: `INSERT INTO job_checkpoints VALUES ('daily_etl', 42, 'completed')`. En restart, query el último batch completado: `SELECT MAX(batch_number) FROM job_checkpoints WHERE job_id = 'daily_etl' AND status = 'completed'`. Resume desde el batch 43. Para checkpoints basados en archivos, escribe un archivo JSON a S3 o disco local después de cada batch. Usa writes atómicos para prevenir corrupción: escribe a un temp file, luego rename. Para jobs distribuidos, usa Redis o etcd para coordinación distribuida de checkpoints.

### ¿Cómo manejo dead-letter queues para items fallidos de batch?

Las dead-letter queues (DLQ) aislan items fallidos para inspección manual y retry. En Python, mantén una DLQ list: `dead_letter_queue = []` y appendea items fallidos con contexto: `dead_letter_queue.append({'item': item, 'error': str(e), 'batch_id': batch_id, 'timestamp': datetime.utcnow()})`. Después de que el job completa, escribe la DLQ a una tabla de base de datos o message queue. En Celery, configura `task_queues` con un DLQ exchange dedicado. En AWS SQS, setea `RedrivePolicy` para mover mensajes después de `maxReceiveCount` intentos. Para DLQs basadas en base de datos: `CREATE TABLE dead_letters (id SERIAL PRIMARY KEY, job_id VARCHAR(64), item JSONB, error TEXT, created_at TIMESTAMP DEFAULT NOW())`. Procesa items de DLQ separadamente con un retry job que corre cada hora.

### ¿Cómo monitoro throughput y progreso de batch jobs?

Emite métricas en cada boundary de batch. En Python, usa `prometheus_client`: `from prometheus_client import Counter, Histogram; processed = Counter('batch_processed_total', 'Items processed'); latency = Histogram('batch_duration_seconds', 'Batch duration')`. Push métricas a Prometheus Pushgateway para batch jobs: `from prometheus_client import push_to_gateway; push_to_gateway('localhost:9091', job='batch_etl', registry=registry)`. Para setups cloud, emite CloudWatch custom metrics o Datadog statsd. Trackea: items procesados, items fallidos, duración del batch, queue depth y uso de memoria. Setea dashboards de Grafana con alerts para: throughput abajo del 50% del average, failure rate arriba del 5% y duración del job excediendo SLA. Loguea JSON estructurado para cada batch: `{"batch_id": 42, "processed": 1000, "failed": 3, "duration_ms": 1250}`.

### ¿Cómo manejo backpressure en pipelines de procesamiento por lotes?

El backpressure ocurre cuando los sistemas downstream no pueden mantener el ritmo del productor de batches. Implementa rate limiting con un semaphore: `from threading import Semaphore; rate_limiter = Semaphore(10)` — acquire antes de cada batch write y release después. Para writes a base de datos, usa connection pooling con un max pool size para limitar inserts concurrentes. Para API calls, implementa un token bucket: `import time; time.sleep(1 / max_rps)`. Monitorea la latencia downstream — si aumenta más de 2x el baseline, reduce el batch size o pausa el procesamiento. En Celery, setea `worker_prefetch_multiplier = 1` para prevenir que los workers over-fetchen. Para pipelines basados en Kafka, setea `max.poll.records` para controlar el batch size. Usa `concurrent.futures.ThreadPoolExecutor(max_workers=N)` para limitar paralelismo en Python.

### ¿Cómo testeo batch jobs para correctitud?

Testea batch jobs con data fixtures determinísticos. Crea un dataset de test: `test_data = [{'id': i, 'value': i * 2} for i in range(10000)]`. Testea idempotencia corriendo el job dos veces y verificando que la salida sea idéntica: `assert run_job(test_data) == run_job(test_data)`. Testea fault tolerance inyectando fallos: `def failing_handler(batch): if len(batch) > 500: raise Exception('simulated failure')` y verifica que el job retiene y registra fallos. Testea checkpointing matando el job mid-run y verificando que resume correctamente. Usa property-based testing con Hypothesis: `@given(st.lists(st.dictionaries(st.text(), st.integers())))` para generar inputs edge-case. Para jobs basados en SQL, usa testcontainers para levantar una base de datos real: `from testcontainers.postgres import PostgresContainer`.

### ¿Cómo manejo procesamiento por lotes para datos de series temporales?

Los batch jobs de series temporales procesan datos en ventanas de tiempo fijas. Usa windowed batching: agrupa records por `window_start` y `window_end` timestamps. Por ejemplo, `SELECT date_trunc('hour', timestamp) AS window, COUNT(*) FROM events GROUP BY 1` procesa batches por hora. Para datos que llegan tarde, usa watermarking: permite datos hasta 5 minutos tarde seteando `watermark = current_time - 5 minutes`. Procesa ventanas solo después de que el watermark pase. Para retención, particiona por tiempo: `CREATE TABLE events_2025_01 PARTITION OF events FOR VALUES FROM ('2025-01-01') TO ('2025-02-01')`. Dropea particiones viejas en lugar de borrar rows: `DROP TABLE events_2024_01`. Para downsampling, agrega datos crudos en tablas resumen de 1-minuto, 1-hora y 1-día en batch jobs separados.

### ¿Cómo manejo procesamiento por lotes con semántica exactly-once?

El procesamiento exactly-once requiere writes idempotentes y checkpoints transaccionales. Usa una transacción para escribir tanto la salida del batch como el checkpoint atómicamente: `BEGIN; INSERT INTO results SELECT * FROM staging; INSERT INTO job_checkpoints VALUES ('job_1', 42, 'completed'); COMMIT;`. Si la transacción falla, tanto los datos como el checkpoint se rollbackean — el job retiene el batch. Para consumers de Kafka, usa `enable.idempotence=true` y `transactional.id` para exactly-once del lado del producer. Para writes a base de datos, usa `INSERT ... ON CONFLICT DO NOTHING` para manejar batches duplicados safe. Para calls a APIs externas, usa idempotency keys: `Idempotency-Key: batch_42_run_3` en headers de request. Acepta que exactly-once tiene un coste de performance — mide si at-least-once con writes idempotentes basta para tu use case.

### ¿Cómo manejo procesamiento por lotes en entornos serverless?

En AWS Lambda, procesa batches dentro del límite de timeout de 15 minutos. Usa el batch windowing de Lambda: setea `MaximumBatchingWindowInSeconds` a 300 segundos para batches más grandes. Para Lambda triggered por SQS, setea `BatchSize` a 10000 (máximo). Maneja fallos parciales con `ReportBatchItemFailures` en la response — SQS requeuea solo los items fallidos. Para Step Functions, usa `Map` state con `MaxConcurrency` para paralelizar el procesamiento de batches. En Google Cloud Functions, usa Cloud Scheduler para trigger batch jobs. Para batches de larga duración, splitea en invocaciones Lambda más pequeñas usando SQS como queue: cada Lambda procesa un batch y enqueue el siguiente. Monitorea con CloudWatch metrics y setea alarms para timeout y error rates. Usa Lambda Layers para dependencias compartidas across batch functions.

### ¿Cómo manejo procesamiento por lotes para archivos CSV más grandes que la memoria?

Usa streaming CSV parsers que yield rows de a uno a la vez. En Python, usa `csv.DictReader`: `with open('large.csv') as f: reader = csv.DictReader(f); for batch in chunked(reader, 1000): process(batch)`. La función `chunked` de `more-itertools` agrupa rows en batches: `from more_itertools import chunked; for batch in chunked(reader, 1000): process(batch)`. Para pandas, usa `chunksize`: `for chunk in pd.read_csv('large.csv', chunksize=10000): process(chunk)`. Para Node.js, usa `csv-parse` con streaming: `const parser = parse({ columns: true }); fs.createReadStream('large.csv').pipe(parser)`. Para archivos muy grandes (10+ GB), considera splitear con `split -l 1000000 large.csv chunk_` y procesar chunks en paralelo across workers.

### ¿Cómo manejo procesamiento por lotes con transacciones de base de datos?

Envuelve cada batch en una transacción de base de datos para asegurar atomicidad. En Python con psycopg2: `with conn.cursor() as cur: cur.execute('BEGIN'); cur.executemany('INSERT INTO orders VALUES (%s, %s)', batch); conn.commit()`. Si el batch falla, la transacción se rollbackea automáticamente. Para PostgreSQL, usa `COPY` para bulk inserts — 10-100x más rápido que `INSERT`: `with open('batch.csv') as f: cur.copy_from(f, 'orders', sep=',')`. Para MySQL, usa `LOAD DATA INFILE` para bulk loads. Setea el transaction isolation level a `READ COMMITTED` para evitar lock contention. Para batches grandes, usa savepoints para retentar items individuales dentro de un batch: `SAVEPOINT batch_item; INSERT ...; RELEASE SAVEPOINT batch_item`.

### ¿Cómo manejo procesamiento por lotes con Apache Airflow?

Airflow orquesta batch jobs con DAGs (Directed Acyclic Graphs). Define un DAG: `with DAG('daily_etl', schedule='@daily', default_args={'retries': 3, 'retry_delay': timedelta(minutes=5)}) as dag: process_task = PythonOperator(task_id='process', python_callable=process_batch)`. Usa `XCom` para pasar datos pequeños entre tasks — para datos grandes, usa referencias S3/GCS. Setea `retries` y `retry_delay` para retry automático en fallos. Usa `task_concurrency` para limitar instancias paralelas de tasks. Monitorea con la UI de Airflow o integra con Datadog. Para generación dinámica de tasks, usa `TaskGroup` con `partial` y `expand` para mapped tasks sobre particiones de batch. Setea `sla` para alertar cuando los jobs miss deadlines. Usa `Pool` para limitar tasks concurrentes across DAGs.

### ¿Cómo manejo procesamiento por lotes para deduplicación de datos?

La deduplicación en batch jobs elimina records duplicados de datasets grandes. Para duplicados exactos, usa SQL `DISTINCT`: `SELECT DISTINCT * FROM staging INTO clean_table`. Para duplicados fuzzy, usa blocking y matching: primero bloquea records por una shared key (e.g., últimos 4 dígitos de teléfono), luego compara dentro de bloques usando Levenshtein distance o Jaccard similarity. En Python, usa la librería `dedupe`: `import dedupe; deduper = dedupe.Dedupe(variables); deduper.train(data_sample); clustered = deduper.partition(data, threshold=0.5)`. Para datasets grandes, usa locality-sensitive hashing (LSH) con `datasketch`: `from datasketch import MinHash, MinHashLSH`. Procesa en batches para limitar memoria: carga 10000 records, deduplica dentro del batch, luego mergea con resultados previos.

### ¿Cómo manejo procesamiento por lotes con Kafka Connect?

Kafka Connect provee procesamiento por lotes manejado para pipelines de datos entre Kafka y sistemas externos. Usa source connectors para ingerir datos: `curl -X POST http://localhost:8083/connectors -H 'Content-Type: application/json' -d '{"name": "pg-source", "config": {"connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector", "connection.url": "jdbc:postgresql://localhost/db", "mode": "incrementing", "incrementing.column.name": "id", "topic.prefix": "pg-"}}'`. Usa sink connectors para escribir datos en batch: `{"connector.class": "io.confluent.connect.jdbc.JdbcSinkConnector", "topics": "pg-orders", "connection.url": "jdbc:postgresql://localhost/db", "insert.mode": "upsert", "pk.fields": "id", "auto.create": true}`. Configura `batch.size` (default 2000) y `consumer.override.max.poll.records` para controlar batch sizes. Para exactly-once, usa `exactly.once.source.support: true` con transactional source connectors. Monitorea con Connect REST API: `GET /connectors/pg-source/status`. Usa Single Message Transforms (SMTs) para transformaciones lightweight per-record: `"transforms": "cast", "transforms.cast.type": "org.apache.kafka.connect.transforms.Cast$Value", "transforms.cast.spec": "amount:int64"`.

### ¿Cómo manejo procesamiento por lotes para incremental loads?

Los incremental loads procesan solo records nuevos o cambiados desde el último run. Trackea el high-water mark: `CREATE TABLE job_watermarks (job_id VARCHAR(64) PRIMARY KEY, last_processed_id BIGINT, last_processed_at TIMESTAMP)`. Después de cada run, updatea: `INSERT INTO job_watermarks VALUES ('orders_etl', 50000, NOW()) ON CONFLICT (job_id) DO UPDATE SET last_processed_id = EXCLUDED.last_processed_id`. En el próximo run, query: `SELECT * FROM orders WHERE id > (SELECT last_processed_id FROM job_watermarks WHERE job_id = 'orders_etl') ORDER BY id LIMIT 10000`. Para incremental loads basados en timestamp: `WHERE updated_at > (SELECT last_processed_at FROM job_watermarks WHERE job_id = 'orders_etl')`. Para PostgreSQL, usa logical replication con `pgoutput` plugin para change data capture. Para MySQL, usa binlog replication con Debezium. Maneja deletes con tombstone records o columnas soft-delete.

### ¿Cómo manejo procesamiento por lotes para validación de datos a escala?

Valida datos en batches antes de cargar a sistemas target. Usa un framework de validación como Great Expectations: `import great_expectations as ge; df = ge.from_pandas(batch); df.expect_column_values_to_not_be_null('id'); df.expect_column_values_to_be_unique('id'); df.expect_column_values_to_be_between('amount', 0, 10000)`. Para validación basada en SQL, corre check queries después de cada batch: `SELECT COUNT(*) FROM staging WHERE amount IS NULL OR amount < 0`. Cuarentena records inválidos: `INSERT INTO quarantine SELECT * FROM staging WHERE amount IS NULL OR amount < 0`. Genera un reporte de validación por batch: `{"batch_id": 42, "total": 1000, "valid": 995, "invalid": 5, "checks_failed": ["amount_not_null", "amount_positive"]}`. Para validación de schema, usa Pydantic: `from pydantic import BaseModel; class Order(BaseModel): id: int; amount: float; status: str` y valida cada record: `Order(**record)`. Setea alerts cuando la tasa de records inválidos excede 1%.

### ¿Cómo manejo procesamiento por lotes para coordinación de workers paralelos?

Coordina workers paralelos de batch con una shared task queue. En Python, usa `multiprocessing.Queue` para inter-process communication: `from multiprocessing import Queue, Process; task_queue = Queue(); result_queue = Queue()`. Distribuye batches: `for batch_id in range(num_batches): task_queue.put(batch_id)`. Workers consumen: `def worker(task_queue, result_queue): while True: batch_id = task_queue.get(); process_batch(batch_id); result_queue.put(batch_id)`. Para coordinación distribuida, usa Redis como task queue: `import redis; r = redis.Redis(); r.lpush('batch_queue', batch_id)`. Workers claim tasks atómicamente: `batch_id = r.brpop('batch_queue', timeout=30)`. Trackea in-flight tasks: `r.sadd('in_flight', batch_id)` y remueve en completion: `r.srem('in_flight', batch_id)`. Para fault tolerance, requeuea stale tasks: checkea el set `in_flight` periódicamente y requeuea items más viejos que 30 minutos. Usa `concurrent.futures.ProcessPoolExecutor` para work CPU-bound y `ThreadPoolExecutor` para work I/O-bound.

### ¿Cómo manejo procesamiento por lotes para estrategias de particionamiento de datos?

Particiona datasets grandes para paralelizar el procesamiento por lotes. Particiona por fecha: `df['partition'] = df['created_at'].dt.strftime('%Y-%m-%d')` y procesa cada partición independientemente. Particiona por hash: `df['partition'] = df['id'] % num_partitions` para distribución uniforme. Particiona por rango: `WHERE id BETWEEN 0 AND 99999`, `WHERE id BETWEEN 100000 AND 199999` para queries de base de datos. Para particionamiento basado en archivos, usa directory structure: `data/year=2025/month=01/day=15/data.parquet`. Este particionamiento Hive-style funciona con Spark, Presto y Athena. Para particionamiento de base de datos, usa PostgreSQL declarative partitioning: `CREATE TABLE orders PARTITION BY RANGE (created_at)` con particiones mensuales. Procesa particiones en paralelo con `concurrent.futures`: `with ThreadPoolExecutor(max_workers=4) as executor: executor.map(process_partition, partition_list)`. Monitorea progreso por partición para identificar stragglers. Reparticiona datos skewed con salting: añade una random salt column para break up hot keys.

### ¿Cómo manejo procesamiento por lotes con memory-mapped files?

Los memory-mapped files permiten procesar archivos más grandes que RAM mapeando contenidos de archivos directamente a virtual memory. En Python, usa `mmap`: `import mmap; with open('large.bin', 'r+b') as f: mm = mmap.mmap(f.fileno(), 0); for i in range(0, len(mm), chunk_size): process(mm[i:i+chunk_size])`. Esto evita cargar el archivo entero en memoria — el OS pagea data in y out según se necesita. Para read-only access: `mm = mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ)`. Para structured data, usa NumPy memmap: `import numpy as np; data = np.memmap('large.bin', dtype=np.float32, mode='r', shape=(1000000, 100))`. Procesa en chunks: `for i in range(0, len(data), 10000): process(data[i:i+10000])`. Para text files, combina `mmap` con regex para fast searching: `import re; for match in re.finditer(rb'pattern', mm): process(match)`. Flushea writes con `mm.flush()` y cierra con `mm.close()`. En Linux, usa `madvise` para hintear al OS sobre access patterns: `mm.madvise(mmap.MADV_SEQUENTIAL)`.

### ¿Cómo manejo procesamiento por lotes para data skew y hot partitions?

El data skew ocurre cuando una partición es mucho más grande que las otras, causando straggler workers. Detecta skew midiendo tamaños de partición: `from collections import Counter; sizes = Counter(df['partition_key']); print(sizes.most_common(10))`. Si la partición más grande es 10x la mediana, tienes skew. Mitiga con salting: añade un random salt al key: `df['salted_key'] = df['key'] + '_' + str(random.randint(0, 9))`. Esto splitea hot keys en 10 sub-particiones. Procesa cada sub-partición independientemente, luego mergea resultados. Para skew basado en rango (e.g., todos los records en una fecha), usa dynamic partitioning: splitea particiones grandes en chunks más pequeños en runtime. En Spark, usa `repartition(num_partitions)` con round-robin distribution. Para queries de base de datos, añade `LIMIT` y `OFFSET` para splitear particiones grandes: `SELECT * FROM orders WHERE date = '2025-01-15' LIMIT 10000 OFFSET 0`, luego `OFFSET 10000`, etc. Monitorea tiempo de procesamiento por partición y alerta cuando el max excede 3x la mediana.

### ¿Cómo manejo procesamiento por lotes para tracking de data lineage?

El data lineage trackea el origen y transformación de datos a través de pipelines de batch. Implementa lineage con metadata tables: `CREATE TABLE data_lineage (id SERIAL PRIMARY KEY, job_id VARCHAR(64), source_table VARCHAR(128), target_table VARCHAR(128), transformation TEXT, started_at TIMESTAMP, completed_at TIMESTAMP)`. Registra lineage en cada boundary de batch: `INSERT INTO data_lineage (job_id, source_table, target_table, transformation) VALUES ('etl_42', 'raw_orders', 'clean_orders', 'filter_nulls, cast_amount')`. Para column-level lineage, trackea transformaciones de columnas individuales: `INSERT INTO column_lineage (job_id, source_column, target_column, transformation) VALUES ('etl_42', 'raw_orders.amount', 'clean_orders.amount_cents', 'multiply_by_100')`. Usa OpenLineage para emisión estandarizada de lineage: `from openlineage.client import OpenLineageClient; client.emit(run_event)`. Integra con Marquez o DataHub para visualización. Para Spark jobs, usa `spark.openlineage` connector para tracking automático de lineage. Almacena lineage como un DAG en Neo4j para grafos de dependencias complejos.

### ¿Cómo manejo procesamiento por lotes para retry con exponential backoff?

Implementa retry con exponential backoff para manejar fallos transitorios. En Python: `import time; def retry_with_backoff(func, max_retries=3, base_delay=1): for attempt in range(max_retries): try: return func() except Exception as e: if attempt == max_retries - 1: raise; delay = base_delay * (2 ** attempt) + random.uniform(0, 1); time.sleep(delay)`. Para batch jobs, retenta el batch entero primero, luego items individuales: `for item in batch: retry_with_backoff(lambda: process_item(item))`. Usa jitter para prevenir thundering herd: `delay = base_delay * (2 ** attempt) + random.uniform(0, base_delay)`. En Celery, configura `task_autoretry_for = (ConnectionError,)` y `task_retry_backoff = True`. Para operaciones de base de datos, usa `psycopg2.exponential_backoff` o implementa retry custom con `tenacity`: `from tenacity import retry, stop_after_attempt, wait_exponential; @retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=4, max=60)) def process_batch(batch): ...`. Loguea cada intento de retry con batch ID y detalles del error.

### ¿Cómo manejo procesamiento por lotes para scoring de calidad de datos?

Scorea calidad de datos por batch para trackear la salud del pipeline. Define dimensiones de calidad: completeness (ratio non-null), uniqueness (tasa de duplicados), validity (conformance de schema), timeliness (freshness) y consistency (reglas cross-field). Calcula por batch: `completeness = 1 - (null_count / total_count); uniqueness = unique_count / total_count; validity = valid_count / total_count`. Almacena scores: `CREATE TABLE data_quality_scores (id SERIAL PRIMARY KEY, job_id VARCHAR(64), batch_id INT, completeness FLOAT, uniqueness FLOAT, validity FLOAT, overall_score FLOAT, created_at TIMESTAMP DEFAULT NOW())`. Alerta cuando el overall score baja de 0.95. Usa un weighted score: `overall = 0.3 * completeness + 0.3 * uniqueness + 0.2 * validity + 0.2 * timeliness`. Genera tendencias semanales: `SELECT date_trunc('week', created_at), AVG(overall_score) FROM data_quality_scores GROUP BY 1`. Para anomaly detection, usa z-scores: `z = (current_score - avg_score) / std_score` y alerta cuando `z < -2`. Integra con Apache Griffin o Deequ para automated quality scoring a escala.

### ¿Cómo manejo procesamiento por lotes para merge de datos multi-source?

Mergea datos de múltiples sources en batch jobs con conflict resolution. Usa una staging table por source: `CREATE TABLE staging_source_a (id INT, email VARCHAR, phone VARCHAR, updated_at TIMESTAMP); CREATE TABLE staging_source_b (id INT, email VARCHAR, phone VARCHAR, updated_at TIMESTAMP)`. Mergea con priority rules: `INSERT INTO merged SELECT COALESCE(a.id, b.id), COALESCE(a.email, b.email), COALESCE(a.phone, b.phone), GREATEST(a.updated_at, b.updated_at) FROM staging_source_a a FULL OUTER JOIN staging_source_b b ON a.id = b.id`. Para conflict resolution por recency: `CASE WHEN a.updated_at > b.updated_at THEN a.email ELSE b.email END`. Para incremental multi-source loads, trackea per-source watermarks: `CREATE TABLE source_watermarks (source VARCHAR(64), job_id VARCHAR(64), last_processed_at TIMESTAMP, PRIMARY KEY (source, job_id))`. Maneja diferencias de schema con una mapping table: `CREATE TABLE field_mapping (source VARCHAR(64), source_field VARCHAR(128), target_field VARCHAR(128), transform VARCHAR(256))`. Valida datos mergeados con cross-source consistency checks.

### ¿Cómo manejo procesamiento por lotes para error handling y alerting?

Implementa error handling comprehensivo con alerts estructurados. Categoriza errores: transient (retry), permanent (quarantine) y systemic (abort). Para transient errors: `except (ConnectionError, TimeoutError) as e: retry_batch(batch)`. Para permanent errors: `except (ValueError, KeyError) as e: quarantine_batch(batch, str(e))`. Para systemic errors: `except OutOfMemoryError as e: abort_job(str(e)); send_alert('CRITICAL', str(e))`. Envía alerts vía múltiples canales: `def send_alert(severity, message): if severity == 'CRITICAL': pagerduty.trigger(message); slack.post('#alerts', message); email.send('oncall@company.com', message)`. Incluye contexto en alerts: `{"job_id": "etl_42", "batch_id": 15, "error": "connection refused", "host": "db-1.prod", "timestamp": "2025-01-15T03:00:00Z"}`. Usa exponential backoff para delivery de alerts para evitar alert storms. Setea dashboards de error rate: `SELECT date_trunc('hour', created_at), error_type, COUNT(*) FROM job_errors GROUP BY 1, 2`. Configura escalation policies: pagea después de 3 fallos consecutivos, email después de 5 retries en 1 hora.

### ¿Cómo manejo procesamiento por lotes para encriptación de datos at rest?

Encripta datos sensibles durante el procesamiento por lotes para cumplir con requisitos de seguridad. Usa column-level encryption en PostgreSQL: `CREATE EXTENSION pgcrypto; INSERT INTO orders (id, ssn) VALUES (1, pgp_sym_encrypt('123-45-6789', 'encryption_key'))`. Query desencriptado: `SELECT pgp_sym_decrypt(ssn, 'encryption_key') FROM orders`. Para encriptación basada en archivos, usa `cryptography` en Python: `from cryptography.fernet import Fernet; key = Fernet.generate_key(); cipher = Fernet(key); encrypted = cipher.encrypt(batch_data); decrypted = cipher.decrypt(encrypted)`. Para S3, usa server-side encryption: `aws s3 cp batch.json s3://bucket/ --sse aws:kms`. Para Kafka, configura `encryption.at.rest` con KMS. Rota encryption keys periódicamente: almacena keys en AWS KMS o HashiCorp Vault. Audita el estado de encriptación: `SELECT relname, relrowsecurity FROM pg_class WHERE relrowsecurity = true`. Nunca loguees valores encriptados o encryption keys. Usa keys separadas por entorno (dev, staging, prod).

### ¿Cómo manejo procesamiento por lotes para data masking y PII compliance?

Masquea datos PII durante el procesamiento por lotes para cumplir con GDPR y CCPA. Implementa masking functions: `def mask_email(email): parts = email.split('@'); return parts[0][:2] + '***@' + parts[1]`. Para phone numbers: `def mask_phone(phone): return phone[:3] + '***' + phone[-4:]`. Para SSN: `def mask_ssn(ssn): return '***-**-' + ssn[-4:]`. Aplica masking en el step de transformación del batch: `masked_batch = [{**record, 'email': mask_email(record['email']), 'phone': mask_phone(record['phone'])} for record in batch]`. Para masking a nivel de base de datos, usa PostgreSQL views: `CREATE VIEW orders_masked AS SELECT id, mask_email(email) AS email, mask_phone(phone) AS phone FROM orders`. Usa dynamic data masking en PostgreSQL con `pg_anonymizer`: `CREATE MASKING POLICY mask_pii ON orders FOR SELECT TO analyst USING (email = mask_email(email), phone = mask_phone(phone))`. Tokeniza en lugar de masquear cuando necesitas referential integrity: `token = hash(email + salt)`. Audita acceso a datos masqueados con `pgaudit`.

### ¿Cómo manejo procesamiento por lotes para SLA monitoring?

Monitorea SLAs de batch jobs para asegurar que los datos se entreguen a tiempo. Define SLAs por job: `CREATE TABLE job_slas (job_id VARCHAR(64) PRIMARY KEY, max_duration_minutes INT, max_latency_minutes INT, alert_threshold_minutes INT)`. Trackea ejecución de jobs: `INSERT INTO job_executions (job_id, started_at, completed_at, status) VALUES ('daily_etl', '2025-01-15T02:00:00Z', '2025-01-15T02:45:00Z', 'completed')`. Verifica SLA compliance: `SELECT j.job_id, j.max_duration_minutes, EXTRACT(EPOCH FROM (j.completed_at - j.started_at))/60 AS actual_minutes, CASE WHEN EXTRACT(EPOCH FROM (j.completed_at - j.started_at))/60 > s.max_duration_minutes THEN 'VIOLATED' ELSE 'OK' END FROM job_executions j JOIN job_slas s ON j.job_id = s.job_id`. Alerta en SLA breaches: `SELECT * FROM job_executions WHERE EXTRACT(EPOCH FROM (completed_at - started_at))/60 > (SELECT max_duration_minutes FROM job_slas WHERE job_id = job_executions.job_id)`. Trackea data freshness SLA: `SELECT EXTRACT(EPOCH FROM (NOW() - MAX(updated_at)))/3600 AS hours_since_last_update FROM orders`. Setea dashboards de Grafana mostrando tendencias de SLA compliance.

### ¿Cómo manejo procesamiento por lotes para optimización de costos?

Optimiza costos de procesamiento por lotes right-sizing resources y reduciendo waste. Usa spot instances para batch jobs non-critical: `aws ec2 request-spot-instances --instance-count 10 --spot-price 0.10 --launch-specification file://spec.json`. Para Kubernetes, usa `spot` node pools con `priorityClassName: spot-batch`. Escala workers dinámicamente: `from kubernetes import client; client.autoscaling_v1.create_namespaced_horizontal_pod_autoscaler(...)`. Reduce costos de base de datos batcheando reads: `SELECT * FROM orders WHERE id BETWEEN 0 AND 99999` en lugar de queries row-by-row. Usa columnar storage (Parquet) para batch jobs analíticos: `df.to_parquet('batch.parquet')` — 10x más pequeño que CSV con compression. Comprime intermediate files: `import gzip; with gzip.open('batch.json.gz', 'wt') as f: json.dump(batch, f)`. Monitorea costos por job: taggea resources con job IDs y query AWS Cost Explorer: `aws ce get_cost_and_usage --filter '{"Tags":{"Key":"JobId","Values":["daily_etl"]}}'`. Optimiza Spark jobs con Dynamic Resource Allocation: `spark.dynamicAllocation.enabled=true`. Archiva outputs viejos de batch a S3 Glacier para long-term storage a $0.004/GB/mes.

### ¿Cómo manejo procesamiento por lotes para archivado y retención de datos?

Archiva datos viejos de batch para reducir costos de storage y mejorar performance de queries. Implementa una retention policy: `DELETE FROM orders WHERE created_at < NOW() - INTERVAL '2 years'` — pero archiva primero: `INSERT INTO orders_archive SELECT * FROM orders WHERE created_at < NOW() - INTERVAL '2 years'`. Para PostgreSQL, usa table partitioning con `pg_partman`: `SELECT partman.create_parent('public.orders', 'created_at', 'native', 'monthly')`. Dropea particiones viejas: `SELECT partman.drop_partition_time('public.orders', '2024-01-01', p_archive_table => true)`. Para archivado en S3, usa lifecycle policies: transiciona a Glacier después de 90 días, borra después de 7 años. Comprime datos archivados: `COPY (SELECT * FROM orders WHERE created_at < '2024-01-01') TO PROGRAM 'gzip > /tmp/orders_2023.csv.gz' WITH CSV HEADER`. Para requisitos de audit, mantén un archive manifest: `CREATE TABLE archive_manifest (id SERIAL PRIMARY KEY, table_name VARCHAR(128), archive_date DATE, row_count BIGINT, file_path VARCHAR(512), checksum VARCHAR(64))`. Verifica integridad del archivo: `SELECT count(*) FROM orders_archive WHERE created_at < '2024-01-01'` debería matchear el manifest. Implementa un restore procedure y testéalo trimestralmente.

### ¿Cómo manejo procesamiento por lotes para reconciliación de datos?

Reconcilia outputs de batch contra sistemas source para detectar data loss o corrupción. Después de cada batch, compara row counts: `SELECT source_count, target_count, source_count - target_count AS discrepancy FROM (SELECT COUNT(*) AS source_count FROM source.orders WHERE date = '2025-01-15') s CROSS JOIN (SELECT COUNT(*) AS target_count FROM target.orders WHERE date = '2025-01-15') t`. Para datos financieros, reconcilia sums: `SELECT source_sum, target_sum, source_sum - target_sum AS variance FROM (SELECT SUM(amount) AS source_sum FROM source.transactions) s CROSS JOIN (SELECT SUM(amount) AS target_sum FROM target.transactions) t`. Alerta cuando la varianza excede el threshold: `IF ABS(variance) > 0.01 THEN send_alert('RECONCILIATION_FAILED', variance)`. Para reconciliación basada en checksum, hashea cada row: `SELECT md5(string_agg(t.*::text, ',')) FROM table t WHERE batch_id = 42` y compara hashes source vs target. Para reconciliación event-driven, cuenta eventos por batch: `{"source_events": 10000, "target_events": 9998, "missing": 2}`. Almacena resultados de reconciliación: `CREATE TABLE reconciliation_results (id SERIAL PRIMARY KEY, job_id VARCHAR(64), batch_id INT, source_count BIGINT, target_count BIGINT, variance NUMERIC, status VARCHAR(20), checked_at TIMESTAMP DEFAULT NOW())`. Corre reconciliación después de cada batch y alerta en mismatches dentro de 5 minutos.

### ¿Cómo manejo procesamiento por lotes para data profiling?

Profilea datos antes de procesar para entender su estructura y calidad. Usa Python: `import pandas as pd; df = pd.read_csv('batch.csv'); profile = df.describe(include='all'); print(profile)`. Para profiling más profundo, usa `pandas-profiling`: `from pandas_profiling import ProfileReport; report = ProfileReport(df); report.to_file('profile.html')`. Checkea column types: `df.dtypes`, null counts: `df.isnull().sum()`, unique values: `df.nunique()`, y value distributions: `df['status'].value_counts()`. Para SQL profiling: `SELECT column_name, data_type, null_frac, n_distinct FROM pg_stats WHERE tablename = 'orders'`. Profilea antes de cada batch run para detectar schema drift: si los column types cambian o aparecen nuevas columnas, alerta al team. Almacena profiles por batch: `CREATE TABLE batch_profiles (id SERIAL PRIMARY KEY, job_id VARCHAR(64), batch_id INT, column_name VARCHAR(128), data_type VARCHAR(64), null_count INT, unique_count INT, profile_json JSONB, created_at TIMESTAMP DEFAULT NOW())`. Compara profiles across batches para detectar anomalías: `SELECT batch_id, unique_count FROM batch_profiles WHERE column_name = 'email' ORDER BY batch_id DESC LIMIT 5`.

### ¿Cómo manejo procesamiento por lotes para sampling y testing de datos?

Samplea datos de batch para testing rápido y validación antes del procesamiento completo. Random sampling en Python: `import random; sample = random.sample(batch, min(100, len(batch)))`. Stratified sampling para representación balanceada: `from sklearn.model_selection import train_test_split; sample, _ = train_test_split(batch, train_size=0.1, stratify=[item['category'] for item in batch])`. Para SQL sampling: `SELECT * FROM orders TABLESAMPLE BERNOULLI(10)` para 10% random sample, o `SELECT * FROM orders TABLESAMPLE SYSTEM(10)` para block-based sampling (más rápido, menos random). Usa reservoir sampling para streaming data: `import reservoir; r = reservoir.Reservoir(1000); for item in stream: r.add(item); sample = r.sample()`. Almacena samples para regression testing: `CREATE TABLE batch_samples (id SERIAL PRIMARY KEY, job_id VARCHAR(64), batch_id INT, sample_data JSONB, created_at TIMESTAMP DEFAULT NOW())`. Corre transformaciones en samples primero para validar lógica: `result = transform(sample); assert validate(result)`. Compara resultados de sample con runs previos para detectar regresiones. Usa samples para performance testing: mide tiempo de transformación en 1000 records, luego extrapola.

### ¿Cómo manejo procesamiento por lotes para data governance?

Implementa data governance en pipelines de batch para asegurar compliance y auditability. Taggea datos con classification levels: `CREATE TABLE data_classifications (table_name VARCHAR(128), column_name VARCHAR(128), classification VARCHAR(20) CHECK (classification IN ('public', 'internal', 'confidential', 'restricted')), PRIMARY KEY (table_name, column_name))`. Enforcea access controls basados en classification: `SELECT * FROM orders WHERE NOT EXISTS (SELECT 1 FROM data_classifications WHERE table_name = 'orders' AND column_name = 'ssn' AND classification = 'restricted') OR current_user IN (SELECT user_id FROM authorized_users WHERE clearance = 'restricted')`. Trackea data lineage para audit: `INSERT INTO audit_log (user_id, action, table_name, batch_id, timestamp) VALUES (current_user, 'READ', 'orders', 42, NOW())`. Implementa data retention policies: `SELECT apply_retention_policy('orders', INTERVAL '7 years')`. Genera compliance reports por batch: `{"batch_id": 42, "classification": "confidential", "accessed_by": ["etl_service"], "retention_days": 2555, "encrypted": true}`. Usa Apache Atlas o DataHub para governance metadata centralizado. Para GDPR, implementa right-to-be-forgotten: `DELETE FROM orders WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com')` y cascada a todas las tablas relacionadas.

### ¿Cómo manejo procesamiento por lotes para data cataloging?

Cataloga data assets de batch para discoverability y lineage tracking. Usa un metadata catalog: `CREATE TABLE data_catalog (id SERIAL PRIMARY KEY, asset_name VARCHAR(256), asset_type VARCHAR(50), owner VARCHAR(128), description TEXT, tags TEXT[], created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP)`. Registra cada output de batch: `INSERT INTO data_catalog (asset_name, asset_type, owner, description, tags) VALUES ('orders_clean', 'table', 'data_team', 'Cleaned orders from ETL pipeline', ARRAY['orders', 'etl', 'daily'])`. Para Apache Hive, usa `DESCRIBE FORMATTED orders_clean` para recuperar table metadata. Para AWS Glue Data Catalog, usa boto3: `import boto3; glue = boto3.client('glue'); glue.create_database(DatabaseInput={'Name': 'analytics'})`. Updatea catalog en schema changes: `UPDATE data_catalog SET updated_at = NOW() WHERE asset_name = 'orders_clean'`. Busca en catalog: `SELECT * FROM data_catalog WHERE tags @> ARRAY['orders'] AND asset_type = 'table'`. Integra con DataHub o Amundsen para catalog browsing web. Mantén descripciones column-level: `CREATE TABLE column_catalog (asset_name VARCHAR(256), column_name VARCHAR(128), description TEXT, data_type VARCHAR(64), PRIMARY KEY (asset_name, column_name))`.

### ¿Cómo manejo procesamiento por lotes para data versioning?

Versiona outputs de batch para trackear cambios a lo largo del tiempo y habilitar rollback. Usa una columna `version`: `ALTER TABLE orders ADD COLUMN batch_version INT DEFAULT 1`. En cada batch run, incrementa: `INSERT INTO orders (id, amount, batch_version) VALUES (1, 100.00, 42)`. Para time-travel queries: `SELECT * FROM orders WHERE batch_version = 42`. Para Delta Lake: `df.write.format('delta').mode('overwrite').option('overwriteSchema', 'true').save('/delta/orders')` y query versiones previas: `spark.read.format('delta').option('versionAsOf', 10).load('/delta/orders')`. Para Apache Iceberg: `SELECT * FROM orders.history` para ver snapshots y `SELECT * FROM orders.snapshots` para metadata. Para PostgreSQL, usa la extensión `temporal_tables`: `CREATE TABLE orders_history (LIKE orders INCLUDING ALL); SELECT temporal.create_history_table('orders')`. Query datos históricos: `SELECT * FROM orders FOR SYSTEM_TIME AS OF '2025-01-01'`. Implementa un rollback procedure: `DELETE FROM orders WHERE batch_version = 42` para deshacer un batch específico. Almacena batch metadata: `CREATE TABLE batch_versions (batch_id INT PRIMARY KEY, version INT, started_at TIMESTAMP, completed_at TIMESTAMP, row_count BIGINT, checksum VARCHAR(64))`.

### ¿Cómo manejo procesamiento por lotes para data contracts?

Los data contracts definen expectativas de schema entre producers y consumers. Implementa contract validation: `CREATE TABLE data_contracts (contract_id SERIAL PRIMARY KEY, producer VARCHAR(128), consumer VARCHAR(128), schema_json JSONB, version INT, created_at TIMESTAMP DEFAULT NOW())`. Valida batch entrante contra contract: `import jsonschema; schema = json.load(contract_schema); jsonschema.validate(batch_data, schema)`. En violación: `raise ContractViolation(f'Batch {batch_id} failed contract {contract_id}: {error.message}')`. Usa Protobuf para contracts tipados: `syntax = "proto3"; message Order { int64 id = 1; double amount = 2; string status = 3; }`. Para Avro: `{"type": "record", "name": "Order", "fields": [{"name": "id", "type": "long"}, {"name": "amount", "type": "double"}]}`. Registra schemas en un schema registry: `POST /subjects/orders-value/versions` con el Avro schema. Consumers fetchean el último schema: `GET /subjects/orders-value/versions/latest`. En breaking changes, bumpa la contract version y notifica a todos los consumers. Almacena contract violations: `CREATE TABLE contract_violations (id SERIAL PRIMARY KEY, contract_id INT, batch_id INT, error_message TEXT, violated_at TIMESTAMP DEFAULT NOW())`.

## Ver También

- [Database Indexing](/recipes/performance/database-indexing) — optimización del rendimiento de queries para reads en batch
- [Rendimiento Web](/recipes/performance/web-performance) — técnicas de rendimiento frontend y backend
- [Load Testing](/recipes/performance/load-testing) — validación del rendimiento de batch jobs bajo carga
