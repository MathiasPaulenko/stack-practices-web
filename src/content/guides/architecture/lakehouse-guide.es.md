---
contentType: guides
slug: lakehouse-guide
title: "Arquitectura Lakehouse — Lo Mejor de Ambos Mundos"
description: "Guía práctica de arquitectura Lakehouse: combinar flexibilidad de almacenamiento de data lake con confiabilidad de data warehouse usando formatos de tabla abiertos."
metaDescription: "Aprende arquitectura Lakehouse: combina flexibilidad de data lake con confiabilidad de warehouse. Guía práctica de Delta Lake, Apache Iceberg y Hudi con ejemplos."
difficulty: intermediate
topics:
  - architecture
  - data
  - databases
tags:
  - lakehouse
  - delta-lake
  - apache-iceberg
  - apache-hudi
  - open-table-format
  - acid-transactions
  - time-travel
  - guia
relatedResources:
  - /guides/data-lake-guide
  - /guides/data-mesh-guide
  - /guides/database-sharding-implementation-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende arquitectura Lakehouse: combina flexibilidad de data lake con confiabilidad de warehouse. Guía práctica de Delta Lake, Apache Iceberg y Hudi con ejemplos."
  keywords:
    - lakehouse
    - delta-lake
    - apache-iceberg
    - apache-hudi
    - open-table-format
    - acid-transactions
    - guia
---

## Overview

La arquitectura Lakehouse, novedosa de Databricks, unifica lo mejor de Data Lakes y Data Warehouses. Almacena datos en formatos abiertos (Parquet) en almacenamiento de objetos de bajo costo mientras añade garantías transaccionales, enforce de schema y time travel. Los formatos de tabla abiertos como Delta Lake, Apache Iceberg y Hudi hacen esto posible manteniendo capas de metadata que rastrean cambios, particiones y estadísticas.

## Cuándo Usar

- Necesitas confiabilidad de warehouse (ACID, schema) con economía de lake
- El vendor lock-in en warehouses propietarios es una preocupación
- Quieres una capa de almacenamiento para cargas BI y ML
- Time travel y auditabilidad son requeridos
- Los datos se consumen por múltiples motores (Spark, Presto, DuckDB, Snowflake)

## Comparativa

| Característica | Data Lake | Data Warehouse | Lakehouse |
|---------------|-----------|----------------|-----------|
| **Costo de almacenamiento** | Bajo | Alto | Bajo |
| **Transacciones ACID** | No | Sí | Sí |
| **Enforce de schema** | No | Sí | Sí |
| **Time travel** | No | Limitado | Sí |
| **Formatos abiertos** | Sí | No | Sí |
| **Soporte ML/AI** | Excelente | Limitado | Excelente |
| **Rendimiento BI** | Lento | Rápido | Rápido (con indexado) |

## Formatos de Tabla Abiertos

| Formato | Característica Principal | Mejor Para |
|---------|------------------------|------------|
| **Delta Lake** | ACID, time travel, schema enforcement | Ecosistemas Spark, streaming |
| **Apache Iceberg** | Particionado oculto, evolución de particiones | Cloud-native, multi-motor |
| **Apache Hudi** | Procesamiento incremental, updates a nivel de registro | CDC, ingesta near-real-time |

## Delta Lake

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("LakehouseDelta") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .getOrCreate()

# Crear tabla Delta con enforce de schema
spark.sql("""
    CREATE TABLE IF NOT EXISTS bronze.orders (
        order_id STRING,
        customer_id STRING,
        total DECIMAL(10,2),
        status STRING,
        created_at TIMESTAMP
    ) USING DELTA
    LOCATION 's3://lakehouse/bronze/orders'
""")

# Insert con garantías ACID
spark.sql("""
    INSERT INTO bronze.orders
    VALUES ('ord-001', 'cust-123', 99.99, 'placed', current_timestamp())
""")

# Update in-place
spark.sql("""
    UPDATE bronze.orders
    SET status = 'shipped'
    WHERE order_id = 'ord-001'
""")

# Time travel
spark.read.format("delta") \
    .option("versionAsOf", 0) \
    .load("s3://lakehouse/bronze/orders") \
    .show()
```

## Apache Iceberg

```python
from pyiceberg.catalog import load_catalog

catalog = load_catalog("rest", **{
    "uri": "https://catalog.example.com",
    "warehouse": "s3://lakehouse/"
})

# Crear tabla con particionado oculto
table = catalog.create_table(
    identifier="silver.events",
    schema=Schema(
        NestedField(1, "event_id", StringType()),
        NestedField(2, "event_type", StringType()),
        NestedField(3, "timestamp", TimestampType()),
        NestedField(4, "payload", StringType())
    ),
    partition_spec=PartitionSpec(
        PartitionField(source_id=3, field_id=1000, transform=Day(), name="day")
    )
)

# Evolución de particiones sin reescribir datos
with table.update_spec() as update:
    update.add_field("hour", Hour(source_column="timestamp"))
```

## Apache Hudi

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder.appName("HudiExample").getOrCreate()

# Upserts a nivel de registro
df.write.format("hudi") \
    .option("hoodie.table.name", "customer_orders") \
    .option("hoodie.datasource.write.recordkey.field", "order_id") \
    .option("hoodie.datasource.write.precombine.field", "updated_at") \
    .option("hoodie.datasource.write.operation", "upsert") \
    .mode("append") \
    .save("s3://lakehouse/hudi/customer_orders")

# Lectura incremental
spark.read.format("hudi") \
    .option("hoodie.datasource.query.type", "incremental") \
    .option("hoodie.datasource.read.begin.instanttime", "20240101000000") \
    .load("s3://lakehouse/hudi/customer_orders")
```

## Arquitectura Medallion con Lakehouse

```
Bronze (Raw)
    ├── Tablas Delta Lake / Iceberg / Hudi
    ├── Mínima transformación
    └── Historia completa retenida

Silver (Limpio)
    ├── Deduplicado, tipado, validado
    ├── Joined con datos de referencia
    └── Chequeos de calidad forzados

Gold (Curado)
    ├── Métricas de negocio agregadas
    ├── Optimizado para consumo BI
    └── Gestionado como productos de datos
```

## Errores Comunes

- **Tratar lakehouse como solo almacenamiento** — la capa de formato de tabla es crítica; sin ella, solo tienes un lake
- **Sobre-optimizar prematuramente** — empieza con un formato (Delta es el más maduro), añade otros solo si es necesario
- **Sin estrategia de compactación** — archivos pequeños matan el rendimiento; programa jobs de compactación regular
- **Ignorar metastore** — Glue, Hive o Unity Catalog son esenciales para descubrimiento y gobernanza de tablas
- **Mezclar formatos de tabla en un pipeline** — cada formato tiene diferentes semánticas; mezclarlos añade complejidad

## FAQ

**Qué formato de tabla debo elegir?**
- **Delta Lake**: Mejor para pipelines centrados en Spark y cargas de trabajo de streaming
- **Iceberg**: Mejor para entornos multi-motor y evolución de particiones
- **Hudi**: Mejor para CDC y procesamiento de datos incremental

**Puedo consultar tablas lakehouse desde Snowflake o BigQuery?**
Sí. Snowflake soporta tablas Iceberg nativamente. BigQuery soporta BigLake tables sobre Iceberg y Delta via conectores.

**Es Lakehouse más barato que un warehouse tradicional?**
El almacenamiento es considerablemente más barato (S3/GCS vs propietario). Los costos de cómputo dependen del motor elegido. El TCO total suele ser menor, especialmente para datasets grandes.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.


## Temas Avanzados

### Escenario Detallado: Pipeline Lakehouse con Delta Lake

```text
Sistema: Plataforma de analitica de streaming
Volumen: 100M eventos/dia (clicks, vistas, transacciones)
Plataforma: AWS EMR + S3 + Delta Lake + Athena

Arquitectura Medallion:
  Bronze: Kinesis -> S3 (JSON crudo, sin transformar)
  Silver: Spark job -> S3 (Delta Lake, limpio, tipado)
  Gold: Spark job -> S3 (Delta Lake, agregados de negocio)
  Serving: Athena/Trino sobre S3 Gold -> BI tools

Paso 1: Ingesta a Bronze
  Kinesis Firehose escribe a s3://lakehouse/bronze/events/dt=2026-07-11/
  Formato: JSON line-delimited, sin particion Delta
  Retencion: 30 dias (raw backup)

Paso 2: Bronze a Silver (limpieza + Delta)
  $ spark-submit --master yarn --num-executors 30 \\
      --executor-memory 16g \\
      bronze_to_silver_delta.py

  # bronze_to_silver_delta.py
  from delta.tables import DeltaTable
  from pyspark.sql import SparkSession

  spark = SparkSession.builder.appName("BronzeToSilver").getOrCreate()

  raw = spark.read.json("s3://lakehouse/bronze/events/dt=2026-07-11/")
  cleaned = (raw
      .filter("event_id is not null and user_id is not null")
      .withColumn("event_time", to_timestamp("timestamp"))
      .withColumn("event_date", to_date("event_time"))
      .dropDuplicates(["event_id"]))

  # Escritura con merge (upsert) en tabla Delta existente
  if DeltaTable.isDeltaTable(spark, "s3://lakehouse/silver/events/"):
      delta_table = DeltaTable.forPath(spark, "s3://lakehouse/silver/events/")
      (delta_table.alias("target")
          .merge(cleaned.alias("source"), "target.event_id = source.event_id")
          .whenMatchedUpdateAll()
          .whenNotMatchedInsertAll()
          .execute())
  else:
      cleaned.write.format("delta")
          .mode("overwrite")
          .partitionBy("event_date")
          .save("s3://lakehouse/silver/events/")

Paso 3: Silver a Gold (agregados)
  silver = spark.read.format("delta").load("s3://lakehouse/silver/events/")

  # Agregado diario por tipo de evento
  daily = (silver.groupBy("event_date", "event_type")
      .agg(count("*").alias("total_events"),
           countDistinct("user_id").alias("unique_users"),
           sum("amount").alias("revenue")))

  daily.write.format("delta")
      .mode("overwrite")
      .option("overwriteSchema", "true")
      .save("s3://lakehouse/gold/daily_metrics/")

Paso 4: Optimizacion y mantenimiento
  # Compactar archivos pequenos (semanal)
  delta_silver = DeltaTable.forPath(spark, "s3://lakehouse/silver/events/")
  delta_silver.optimize().compact(minFileSize="10MB")

  # Z-Order por user_id para queries filtradas por usuario
  delta_silver.optimize().zOrder("user_id")

  # Vacuum: eliminar versiones viejas (retener 7 dias)
  delta_silver.vacuum(retentionHours=168)

  # Generar manifiesto para Athena/Catalog
  delta_silver.generate("symlink_format_manifest")

Paso 5: Consulta desde Athena
  -- Crear tabla externa sobre Delta Lake
  CREATE EXTERNAL TABLE silver_events
  STORED AS PARQUET
  LOCATION "s3://lakehouse/silver/events/"
  TBLPROPERTIES ("parquet.compression"="SNAPPY");

  -- Consulta directa
  SELECT event_type, count(*) as total
  FROM silver_events
  WHERE event_date >= DATE("2026-07-01")
  GROUP BY event_type
  ORDER BY total DESC;

Monitoreo:
  - CloudWatch: duracion de jobs, uso de memoria, archivos de salida
  - Alerta si Silver tiene > 1000 archivos pequenos (< 10MB)
  - Delta Lake transaction log monitoring via DeltaTable.history()
  - Data quality: Great Expectations valida schema y nulls en Silver

Costo mensual estimado:
  S3 storage (100TB): ~$2,300
  EMR (30 ejecutores x 6h/dia): ~$2,400
  Athena (queries BI): ~$500
  Total: ~$5,200/mes
```

### Como elijo entre Delta Lake, Iceberg y Hudi?

Delta Lake es la mejor opcion si usas Spark intensivamente: integracion nativa, madurez, y documentacion abundante. Iceberg es mejor si necesitas multi-motor (Trino, Flink, Snowflake, DuckDB) con particionado oculto y evolucion de esquemas. Hudi es mejor para CDC y procesamiento incremental con upserts a nivel de registro. Si no tienes un requerimiento especifico, empieza con Delta Lake por su simplicidad y madurez.

### Como manejo la evolucion de esquemas en Lakehouse?

Los tres formatos soportan evolucion de esquema. Delta Lake: usa `mergeSchema: true` para anadir columnas automaticamente, o `overwriteSchema: true` para cambiar el esquema completo. Iceberg: evolucion de esquemas nativa sin reescribir datos (anadir, renombrar, eliminar columnas). Hudi: soporta evolucion de esquema con `hoodie.schema.on.read.enable=true`. Para cambios mayores, versiona las tablas: `events_v1`, `events_v2`. Documenta los cambios en el catalogo de datos.
