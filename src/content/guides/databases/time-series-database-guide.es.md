---

contentType: guides
slug: time-series-database-guide
title: "Bases de Datos de Series Temporales"
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


- For alternatives, see [Complete Guide to Redis Caching Strategies](/es/guides/complete-guide-redis-caching-strategies/).

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

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.


## Temas Avanzados

### Escenario Detallado: Monitoreo IoT con TimescaleDB

```text
Sistema: Monitoreo de 10,000 sensores IoT (TimescaleDB sobre PostgreSQL)
Volumen: 100,000 mediciones/segundo, 8.6B mediciones/dia
Requisitos: Alertas en tiempo real, dashboards historicos, downsampling

Esquema:
  CREATE EXTENSION IF NOT EXISTS timescaledb;

  CREATE TABLE sensor_readings (
      time TIMESTAMPTZ NOT NULL,
      sensor_id INT NOT NULL,
      temperature DOUBLE PRECISION,
      humidity DOUBLE PRECISION,
      pressure DOUBLE PRECISION,
      battery_level DOUBLE PRECISION
  );

  -- Hypertable con chunks de 6 horas
  SELECT create_hypertable("sensor_readings",
      "time", chunk_time_interval => INTERVAL "6 hours");

  -- Indice compuesto para queries por sensor y tiempo
  CREATE INDEX idx_sensor_time ON sensor_readings(sensor_id, time DESC);

Ingestion masiva:
  -- Insert batch de 10,000 mediciones
  INSERT INTO sensor_readings (time, sensor_id, temperature, humidity, pressure)
  SELECT
      NOW() - (generate_series(1, 10000) * INTERVAL "1 second"),
      (random() * 10000)::INT,
      20 + random() * 15,
      40 + random() * 20,
      1013 + random() * 10;

  -- TimescaleDB optimiza inserts append-only
  -- Throughput: 100K rows/seg en hardware commodity

Agregados continuos (downsampling):
  -- Promedio cada 1 minuto (para dashboards en tiempo real)
  CREATE MATERIALIZED VIEW sensor_1m
  WITH (timescaledb.continuous) AS
  SELECT
      time_bucket("1 minute", time) AS bucket,
      sensor_id,
      AVG(temperature) AS avg_temp,
      MAX(temperature) AS max_temp,
      MIN(temperature) AS min_temp,
      AVG(humidity) AS avg_humidity
  FROM sensor_readings
  GROUP BY bucket, sensor_id
  WITH NO DATA;

  -- Promedio cada 1 hora (para dashboards historicos)
  CREATE MATERIALIZED VIEW sensor_1h
  WITH (timescaledb.continuous) AS
  SELECT
      time_bucket("1 hour", time) AS bucket,
      sensor_id,
      AVG(temperature) AS avg_temp,
      MAX(temperature) AS max_temp,
      MIN(temperature) AS min_temp,
      COUNT(*) AS sample_count
  FROM sensor_readings
  GROUP BY bucket, sensor_id
  WITH NO DATA;

Politicas de retencion:
  -- Datos raw: 7 dias
  SELECT add_retention_policy("sensor_readings", INTERVAL "7 days");

  -- Agregados de 1 minuto: 90 dias
  SELECT add_retention_policy("sensor_1m", INTERVAL "90 days");

  -- Agregados de 1 hora: 5 anos
  SELECT add_retention_policy("sensor_1h", INTERVAL "5 years");

Queries tipicas:
  -- Ultima lectura de cada sensor
  SELECT DISTINCT ON (sensor_id)
      sensor_id, time, temperature, humidity
  FROM sensor_readings
  ORDER BY sensor_id, time DESC;

  -- Alerta: sensores con temperatura > 35C en los ultimos 10 min
  SELECT sensor_id, MAX(temperature) AS max_temp
  FROM sensor_readings
  WHERE time > NOW() - INTERVAL "10 minutes"
    AND temperature > 35
  GROUP BY sensor_id
  ORDER BY max_temp DESC;

  -- Trend de temperatura por hora (ultimas 24h)
  SELECT bucket, sensor_id, avg_temp, max_temp, min_temp
  FROM sensor_1h
  WHERE bucket > NOW() - INTERVAL "24 hours"
    AND sensor_id = 42
  ORDER BY bucket;

Almacenamiento por nivel:
  | Nivel | Datos | Retencion | Tamano estimado |
  |-------|-------|-----------|-----------------|
  | Raw | Todas las mediciones | 7 dias | 50GB |
  | 1-min | Agregado por minuto | 90 dias | 5GB |
  | 1-hour | Agregado por hora | 5 anos | 1GB |

Performance:
  | Query | Tiempo | Filas escaneadas |
  |-------|--------|-----------------|
  | Ultima lectura (1 sensor) | 2ms | 1 |
  | Alertas tiempo real (10 min) | 15ms | ~6M |
  | Dashboard 24h (1 sensor) | 8ms | 24 (desde agregado) |
  | Dashboard 30 dias (todos) | 120ms | 720 (desde agregado) |

Lecciones aprendidas:
  - TimescaleDB da performance de TSDB sin salir de PostgreSQL
  - Los agregados continuos eliminan necesidad de pre-computar
  - La retencion por niveles ahorra almacenamiento drasticamente
  - chunk_time_interval debe alinearse con el patron de consulta
```

### Como manejo backfill de datos historicos?

TimescaleDB soporta inserts fuera de orden. Para backfill masivo, deshabilita temporalmente las políticas de retencion, inserta en lotes de 100K filas, y re-habilita. Los agregados continuos se actualizan automaticamente. En InfluxDB, usa la opcion timePrecision correcta y evita tags de alta cardinalidad durante el backfill. En ClickHouse, inserta en particiones por fecha para optimizar el merge.
