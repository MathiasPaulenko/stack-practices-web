---
contentType: guides
slug: data-lake-guide
title: "Data Lake vs Data Warehouse — Guía de Arquitectura"
description: "Guía práctica de arquitectura Data Lake: almacenamiento estructurado vs no estructurado, conceptos de lakehouse, patrones ETL vs ELT y cuándo elegir un lake sobre un warehouse."
metaDescription: "Aprende arquitectura Data Lake: almacenamiento estructurado vs no estructurado, conceptos lakehouse, ETL vs ELT. Compara lakes vs warehouses y elige el enfoque correcto."
difficulty: intermediate
topics:
  - architecture
  - data
  - databases
tags:
  - data-lake
  - data-warehouse
  - etl
  - elt
  - lakehouse
  - big-data
  - structured-data
  - unstructured-data
  - guia
relatedResources:
  - /guides/lakehouse-guide
  - /guides/data-mesh-guide
  - /guides/database-sharding-implementation-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende arquitectura Data Lake: almacenamiento estructurado vs no estructurado, conceptos lakehouse, ETL vs ELT. Compara lakes vs warehouses y elige el enfoque correcto."
  keywords:
    - data-lake
    - data-warehouse
    - etl
    - elt
    - lakehouse
    - big-data
    - guia
---

## Overview

Un Data Lake es un repositorio de almacenamiento centralizado que contiene datos estructurados, semi-estructurados y no estructurados a cualquier escala. A diferencia de un Data Warehouse, que almacena datos procesados con schema-on-write en tablas rígidas, un Data Lake almacena datos crudos en su formato nativo con schema aplicado en lectura (schema-on-read). Esta flexibilidad lo hace ideal para machine learning, análisis exploratorio y almacenar datos cuya estructura aún no se conoce. Sin embargo, sin gobernanza, los lakes pueden convertirse en "data swamps" — desorganizados, no buscables y poco confiables.

## Cuándo Usar un Data Lake

- Necesitas almacenar diversos tipos de datos: JSON, CSV, Parquet, imágenes, videos, logs
- Las cargas de trabajo de machine learning requieren datos crudos sin procesar
- El volumen de datos excede lo que las bases de datos tradicionales pueden manejar rentablemente
- Quieres diferir el diseño de schema hasta que los datos se consuman
- Los datos históricos deben retenerse barato para análisis futuro

## Data Lake vs Data Warehouse

| Dimensión | Data Lake | Data Warehouse |
|-----------|-----------|----------------|
| **Tipos de datos** | Todos (estructurados, semi, no estructurados) | Solo estructurados |
| **Schema** | Schema-on-read | Schema-on-write |
| **Usuarios** | Científicos de datos, ingenieros ML, analistas | Analistas de negocio, herramientas BI |
| **Rendimiento de consulta** | Variable, optimizado para batch | Rápido, optimizado para OLAP |
| **Costo** | Almacenamiento bajo, cómputo alto | Almacenamiento alto, cómputo optimizado |
| **Calidad de datos** | Crudos, pueden no estar validados | Curados, validados, confiables |
| **Escala** | Petabyte+ | Terabyte a Petabyte |

## Capas de Arquitectura

```
Zona Raw (Bronze)
    ├── Datos sin procesar de fuentes
    ├── Retenidos en formato nativo
    └── Almacenamiento barato, largo plazo

Zona Limpia (Silver)
    ├── Datos deduplicados y validados
    ├── Transformaciones básicas aplicadas
    └── Schemas tipados forzados

Zona Curada (Gold)
    ├── Agregados listos para negocio
    ├── Optimizados para rendimiento de consulta
    └── Usados por herramientas BI y aplicaciones
```

## ETL vs ELT

| Patrón | Flujo | Mejor Para |
|--------|-------|-----------|
| **ETL** | Extract → Transform → Load | Data warehouses, requerimientos estrictos de schema |
| **ELT** | Extract → Load → Transform | Data lakes, flexibilidad de schema-on-read |

```python
# Patrón ELT — carga cruda, transforma bajo demanda
import pandas as pd
from pyspark.sql import SparkSession

spark = SparkSession.builder.appName("DataLakeELT").getOrCreate()

# Extract: Leer logs JSON crudos desde S3
raw_df = spark.read.json("s3://datalake/raw/events/2024/01/")

# Load: Almacenar como Parquet en la zona Silver
raw_df.write.parquet("s3://datalake/silver/events/", mode="overwrite")

# Transform: Aplicar schema y agregaciones bajo lectura
cleaned_df = spark.read.parquet("s3://datalake/silver/events/")
cleaned_df.createOrReplaceTempView("events")

daily_metrics = spark.sql("""
    SELECT 
        DATE(timestamp) as date,
        event_type,
        COUNT(*) as event_count,
        COUNT(DISTINCT user_id) as unique_users
    FROM events
    WHERE timestamp >= '2024-01-01'
    GROUP BY DATE(timestamp), event_type
""")

daily_metrics.write.parquet("s3://datalake/gold/daily_metrics/")
```

## Formatos de Almacenamiento

| Formato | Tipo | Caso de Uso |
|---------|------|------------|
| **CSV** | Texto | Intercambio, legible por humanos |
| **JSON** | Semi-estructurado | APIs, datos anidados |
| **Parquet** | Columnar | Consultas analíticas, compresión |
| **Avro** | Basado en filas | Streaming, evolución de schema |
| **ORC** | Columnar | Cargas de trabajo Hive/Spark |
| **Delta Lake** | Capa | Transacciones ACID sobre lakes |

## Ejemplo de Delta Lake

```python
from delta import configure_spark_with_delta_pip
from pyspark.sql import SparkSession

builder = SparkSession.builder.appName("DeltaLakeExample") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
spark = configure_spark_with_delta_pip(builder).getOrCreate()

# Escribir con garantías ACID
df.write.format("delta").mode("overwrite").save("/datalake/silver/orders")

# Time travel — consultar a partir de una versión específica
spark.read.format("delta").option("versionAsOf", 5).load("/datalake/silver/orders")

# Evolución de schema
df_with_new_column.write.format("delta") \
    .mode("append") \
    .option("mergeSchema", "true") \
    .save("/datalake/silver/orders")
```

## Errores Comunes

- **El data swamp** — volcar todo sin catalogar, gobernar o políticas de retención
- **Sin estrategia de particionamiento** — consultar lakes sin particionar es dolorosamente lento; particionar por fecha y/o región
- **Usar lakes para OLTP** — los lakes son para análisis, no cargas transaccionales
- **Ignorar gobernanza de datos** — sin catálogos de metadata y controles de acceso, los lakes se vuelven inusables
- **Problema de archivos pequeños** — escribir miles de archivos diminutos mata el rendimiento de consulta; compactar regularmente

## FAQ

**Puedo consultar un Data Lake con SQL?**
Sí. Motores de consulta como Athena, Presto/Trino, Dremio y Spark SQL proveen interfaces SQL sobre almacenamiento de lakes.

**Es un Data Lake reemplazo de un Data Warehouse?**
No exactamente. Muchas organizaciones usan ambos: lakes para datos crudos/ML, warehouses para datos curados de BI. Las arquitecturas Lakehouse (Delta Lake, Iceberg) difuminan esta línea.

**Cómo evito que mi lake se convierta en un swamp?**
Implementa: (1) un catálogo de datos para descubrimiento, (2) políticas de retención y archivado, (3) chequeos de calidad en ingesta, (4) propiedad clara por dataset.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.


## Temas Avanzados

### Escenario Detallado: Pipeline de Eventos con Spark y Delta Lake

```text
Sistema: Plataforma de analitica de e-commerce
Volumen: 50M eventos/dia (clicks, vistas, compras)
Almacenamiento: S3 con zonas Bronze/Silver/Gold
Motor: EMR con Spark 3.5

Arquitectura:
  Fuentes -> Kinesis -> S3 Bronze (JSON crudo)
  S3 Bronze -> Spark job -> S3 Silver (Parquet + Delta)
  S3 Silver -> Spark job -> S3 Gold (Agregados)
  S3 Gold -> Athena/Trino -> BI tools

Paso 1: Ingesta a Bronze
  Kinesis Firehose escribe JSON crudo a s3://lake/bronze/events/dt=2026-07-11/
  Particion por fecha (dt) para queries eficientes
  Sin transformacion: datos exactamente como llegan

Paso 2: Bronze a Silver (limpieza)
  $ spark-submit --master yarn \\
      --num-executors 20 \\
      --executor-memory 8g \\
      bronze_to_silver.py

  # bronze_to_silver.py
  raw = spark.read.json("s3://lake/bronze/events/dt=2026-07-11/")
  cleaned = raw.filter("user_id is not null") \\
      .withColumn("event_time", to_timestamp("timestamp")) \\
      .withColumn("event_date", to_date("event_time")) \\
      .dropDuplicates(["event_id"])
  cleaned.write.format("delta") \\
      .mode("append") \\
      .partitionBy("event_date") \\
      .save("s3://lake/silver/events/")

Paso 3: Silver a Gold (agregados)
  silver = spark.read.format("delta").load("s3://lake/silver/events/")
  daily = silver.groupBy("event_date", "event_type") \\
      .agg(count("*").alias("total_events"),
           countDistinct("user_id").alias("unique_users"))
  daily.write.format("delta") \\
      .mode("overwrite") \\
      .option("overwriteSchema", "true") \\
      .save("s3://lake/gold/daily_events/")

Paso 4: Optimizacion
  # Compactar archivos pequenos semanalmente
  delta_table = DeltaTable.forPath(spark, "s3://lake/silver/events/")
  delta_table.optimize().compact(minFileSize="10MB")

  # Vacuum: eliminar versiones viejas (retener 7 dias)
  delta_table.vacuum(retentionHours=168)

Monitoreo:
  - CloudWatch: duracion de jobs, uso de memoria, archivos de salida
  - Alerta si Silver tiene > 1000 archivos pequenos (< 1MB)
  - Alerta si Gold no se actualiza en 24h
  - Data quality: Great Expectations valida schema y nulls en Silver

Costo mensual estimado:
  S3 storage (50TB): ~$1,150
  EMR (20 ejecutores x 4h/dia): ~$800
  Athena (queries BI): ~$200
  Total: ~$2,150/mes
```

### Como manejo la evolucion de schema en un Data Lake?

Usa formatos que soportan evolucion de schema: Parquet, Avro o Delta Lake. Con Delta Lake, la opcion `mergeSchema` anade nuevas columnas sin romper lecturas existentes. Para cambios mayores (renombrar columnas, cambiar tipos), usa versionado de tablas: `events_v1`, `events_v2`. Documenta el cambio en el catalogo de datos. Los consumidores deben usar nombres de columna, no posicion, para evitar roturas.

### Cuando debo compactar archivos en el lake?

Compacta cuando el numero de archivos pequenos (< 10MB) supera los 1000 por particion. Los archivos pequenos degradan el rendimiento porque Spark/Trino deben abrir cada archivo individualmente. Ejecuta `OPTIMIZE` semanalmente para tablas Silver y mensualmente para tablas Gold. Despues de compactar, ejecuta `VACUUM` para eliminar versiones viejas y liberar espacio.







































End of document. Review and update quarterly.