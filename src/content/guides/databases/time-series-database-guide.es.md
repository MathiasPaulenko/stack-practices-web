---
contentType: guides
slug: time-series-database-guide
title: "Bases de Datos de Series Temporales — InfluxDB, TimescaleDB y ClickHouse"
description: "Guia practica de bases de datos de series temporales: cuando usar un TSDB especializado, modelo de datos, politicas de retencion, y elegir entre InfluxDB, TimescaleDB y ClickHouse."
metaDescription: "Aprende bases de datos de series temporales: cuando usar un TSDB, modelo de datos, politicas de retencion. Compara InfluxDB, TimescaleDB y ClickHouse con ejemplos."
difficulty: intermediate
topics:
  - databases
  - performance
tags:
  - series-temporales
  - influxdb
  - timescaledb
  - clickhouse
  - iot
  - metricas
  - politica-retencion
  - guia
relatedResources:
  - /guides/nosql-patterns-guide
  - /guides/sql-performance-tuning-guide
  - /guides/observability-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende bases de datos de series temporales: cuando usar un TSDB, modelo de datos, politicas de retencion. Compara InfluxDB, TimescaleDB y ClickHouse con ejemplos."
  keywords:
    - series-temporales
    - influxdb
    - timescaledb
    - clickhouse
    - iot
    - metricas
    - guia
---

## Overview

Las bases de datos de series temporales (TSDBs) estan optimizadas para cargas de trabajo donde los datos se indexan principalmente por tiempo: metricas, lecturas de sensores IoT, logs de aplicaciones, datos de ticks financieros y monitoreo de sistemas. A diferencia de las bases de proposito general, las TSDBs usan la naturaleza inmutable y solo-adicion de datos de series temporales para lograr alto rendimiento de ingestion y consultas eficientes por rango de tiempo. Motores especializados como InfluxDB, TimescaleDB y ClickHouse ofrecen diferentes compromisos entre facilidad de uso, compatibilidad SQL y rendimiento crudo.

## When to Use

- Ingestas millones de puntos de datos por segundo con una marca de tiempo
- Las consultas son predominantemente escaneos por rango de tiempo (`WHERE time > now() - interval '1 day'`)
- Los datos son solo-adicion y raramente actualizados despues de la insercion
- Se necesitan politicas de retencion y downsampling para gestionar almacenamiento
- Consultas de agregacion (avg, sum, count) sobre ventanas deslizantes son comunes

## Comparacion

| Caracteristica | InfluxDB | TimescaleDB | ClickHouse |
|----------------|----------|-------------|------------|
| **Motor base** | Custom (TSM/TSI) | Extension PostgreSQL | Columnar OLAP |
| **Soporte SQL** | InfluxQL / Flux | SQL completo | Dialecto SQL |
| **Facilidad setup** | Binario unico | PostgreSQL + extension | Mas complejo |
| **Tasa ingestion** | Muy alta | Alta | Extremadamente alta |
| **Compresion** | Buena | Buena | Excelente |
| **Mejor para** | Metricas DevOps, IoT | Aplicaciones ya en Postgres | Analitica, big data |

## Modelo de Datos (InfluxDB Line Protocol)

```
measurement,tag1=value1,tag2=value2 field1=42.0,field2="text" 1465839830100400200
```

- **Measurement**: Contenedor logico (como una tabla)
- **Tags**: Dimensiones de metadata indexadas (ID de dispositivo, region)
- **Fields**: Valores reales (temperatura, uso de CPU)
- **Timestamp**: Precision de nanosegundos

## Ejemplo TimescaleDB

```sql
-- Habilitar extension TimescaleDB y crear hypertable
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE sensor_data (
    time TIMESTAMPTZ NOT NULL,
    sensor_id INT NOT NULL,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION
);

-- Convertir a hypertable con chunks de 1 dia
SELECT create_hypertable('sensor_data', by_range('time', INTERVAL '1 day'));

-- Agregado continuo para promedios horarios
CREATE MATERIALIZED VIEW hourly_avg
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) as bucket,
    sensor_id,
    AVG(temperature) as avg_temp,
    AVG(humidity) as avg_humidity
FROM sensor_data
GROUP BY bucket, sensor_id;

-- Politica de retencion: eliminar chunks mayores a 90 dias
SELECT add_retention_policy('sensor_data', INTERVAL '90 days');
```

## Ejemplo ClickHouse

```sql
-- Crear tabla MergeTree para datos de series temporales
CREATE TABLE events (
    event_time DateTime,
    user_id UInt64,
    event_type String,
    value Float64
) ENGINE = MergeTree()
ORDER BY (event_type, event_time);

-- Consulta eficiente por rango de tiempo
SELECT
    toStartOfHour(event_time) as hour,
    count() as event_count,
    avg(value) as avg_value
FROM events
WHERE event_time > now() - INTERVAL 7 DAY
GROUP BY hour
ORDER BY hour;
```

## Retencion y Downsampling

| Estrategia | Como | Compromiso |
|------------|------|------------|
| **Retencion raw** | Mantener todos los datos por N dias | Mayor fidelidad, mayor costo |
| **Downsampling** | Agregar a menor resolucion despues de N dias | Ahorra almacenamiento, pierde granularidad |
| **Almacenamiento por niveles** | Mover chunks viejos a almacenamiento frio | Consultas viejas mas lentas, mas barato |

```sql
-- InfluxDB: consulta continua para downsampling
CREATE CONTINUOUS QUERY "hourly_cpu" ON "monitoring"
BEGIN
    SELECT mean("usage") INTO "downsampled"."autogen"."cpu_1h"
    FROM "monitoring"."autogen"."cpu"
    GROUP BY time(1h),*
END;
```

## Common Mistakes

- **Usar una TSDB para cargas transaccionales** — no hay ACID, no updates, no integridad referencial
- **Tags de alta cardinalidad** — demasiados valores unicos de tag explotan memoria y tamano de indice
- **Sin politica de retencion** — los datos de series temporales crecen indefinidamente; siempre definir retencion o archivado
- **Precision de timestamp incorrecta** — precision de nanosegundos suele ser excesiva y desperdicia almacenamiento
- **Almacenar datos no-temporales en una TSDB** — usar la herramienta correcta para cada carga de trabajo

## FAQ

**Puedo usar PostgreSQL para datos de series temporales?**
Si, con TimescaleDB. Para cargas de pequena escala, PostgreSQL vanilla con indices apropiados funciona. Para alta tasa de ingestion, una TSDB dedicada es mejor.

**Como manejo backfills en una TSDB?**
La mayoria de TSDBs soportan escrituras fuera de orden, pero el rendimiento puede degradarse. Hacer backfills en lotes y usar tamanos de chunk apropiados.

**Debo almacenar tags o fields?**
Los tags son indexados; los fields no. Usa tags para dimensiones por las que filtras o agrupas. Usa fields para valores que agregas.
