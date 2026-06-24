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
  - /patterns/design/event-driven-pattern
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

La arquitectura Lakehouse, pionera de Databricks, unifica lo mejor de Data Lakes y Data Warehouses. Almacena datos en formatos abiertos (Parquet) en almacenamiento de objetos de bajo costo mientras añade garantías transaccionales, enforce de schema y time travel. Los formatos de tabla abiertos como Delta Lake, Apache Iceberg y Hudi hacen esto posible manteniendo capas de metadata que rastrean cambios, particiones y estadísticas.

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
El almacenamiento es significativamente más barato (S3/GCS vs propietario). Los costos de cómputo dependen del motor elegido. El TCO total suele ser menor, especialmente para datasets grandes.
