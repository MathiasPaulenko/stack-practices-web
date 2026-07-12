---





contentType: recipes
slug: python-pandas-etl-pipeline
title: "Construir un Pipeline ETL con pandas y Parquet"
description: "Cómo construir un pipeline extract-transform-load usando pandas para procesamiento de datos y Parquet para almacenamiento columnar con coerción de tipos y validación."
metaDescription: "Construye un pipeline ETL con pandas y Parquet. Extrae de CSV/JSON, transforma con coerción de tipos y validación, carga a almacenamiento columnar Parquet."
difficulty: intermediate
topics:
  - data
tags:
  - data
  - python
  - pandas
  - etl
  - parquet
  - recipe
relatedResources:
  - /recipes/python-polars-fast-dataframe
  - /recipes/python-data-validation-pandera
  - /recipes/sql-cte-recursive-hierarchy
  - /recipes/python-airflow-dag-scheduling
  - /recipes/python-dask-parallel-dataframe
  - /recipes/python-dbt-model-transformations
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye un pipeline ETL con pandas y Parquet. Extrae de CSV/JSON, transforma con coerción de tipos y validación, carga a almacenamiento columnar Parquet."
  keywords:
    - data
    - python
    - pandas
    - etl
    - parquet
    - recipe





---

## Overview

pandas es la herramienta estándar para procesamiento de datos tabulares en Python. Parquet es un formato de almacenamiento columnar que comprime mejor que CSV y preserva los tipos de datos (enteros, floats, datetimes, categoricals). Combinarlos en un pipeline ETL te da procesamiento de datos type-safe con almacenamiento compacto. Aqui se explica como extracción de múltiples fuentes, transformación con coerción de tipos y validación, y carga a archivos Parquet particionados.

## When to Use

- Jobs de procesamiento de datos batch que corren en un schedule (horario, diario)
- Transformar exports CSV/JSON en Parquet tipado para analytics downstream
- Pipelines de datos donde los archivos intermedios necesitan preservación de tipos
- Construir features para modelos ML a partir de data sources raw
- Cualquier escenario donde necesitas transformaciones de datos reproducibles y auditables

## When NOT to Use

- Pipelines streaming/real-time — usa Spark Structured Streaming o Flink
- Datasets más grandes que la memoria — usa Polars, Dask o PySpark
- Transformaciones one-off simples — un solo `pd.read_csv().to_parquet()` es suficiente
- Data warehouses productivos — usa dbt para transformaciones basadas en SQL

## Solution

### Estructura básica de pipeline ETL

```python
import pandas as pd
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def extract_csv(path: str) -> pd.DataFrame:
    """Extraer data de un archivo CSV."""
    logger.info(f"Extracting from {path}")
    df = pd.read_csv(path)
    logger.info(f"Extracted {len(df)} rows, {len(df.columns)} columns")
    return df


def extract_json(path: str) -> pd.DataFrame:
    """Extraer data de un archivo JSON."""
    logger.info(f"Extracting from {path}")
    df = pd.read_json(path, lines=True)
    logger.info(f"Extracted {len(df)} rows")
    return df


def transform(df: pd.DataFrame) -> pd.DataFrame:
    """Aplicar transformaciones: coerción de tipos, limpieza, columnas derivadas."""
    logger.info("Starting transformation")

    # Coerción de tipos
    df["order_date"] = pd.to_datetime(df["order_date"], errors="coerce")
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").astype("Int64")

    # Drop filas con fechas o amounts inválidos
    df = df.dropna(subset=["order_date", "amount"])

    # Columnas derivadas
    df["year"] = df["order_date"].dt.year
    df["month"] = df["order_date"].dt.month
    df["revenue"] = df["amount"] * df["quantity"]

    # Normalizar columnas de texto
    df["customer_name"] = df["customer_name"].str.strip().str.title()

    # Categorical para columnas de baja cardinalidad
    df["status"] = df["status"].astype("category")

    logger.info(f"Transformed to {len(df)} rows")
    return df


def load_parquet(df: pd.DataFrame, path: str, partition_cols: list[str] | None = None) -> None:
    """Cargar DataFrame a Parquet, opcionalmente particionado."""
    logger.info(f"Loading to {path}")
    if partition_cols:
        df.to_parquet(path, partition_cols=partition_cols, index=False)
    else:
        df.to_parquet(path, index=False)
    logger.info(f"Loaded {len(df)} rows")


def run_pipeline(source_path: str, destination_path: str) -> None:
    """Ejecutar el pipeline ETL completo."""
    df = extract_csv(source_path)
    df = transform(df)
    load_parquet(df, destination_path, partition_cols=["year", "month"])


if __name__ == "__main__":
    run_pipeline("data/raw/orders.csv", "data/processed/orders")
```

### Extraer de múltiples fuentes y mergear

```python
def extract_and_merge(orders_path: str, customers_path: str) -> pd.DataFrame:
    """Extraer de múltiples fuentes y mergear."""
    orders = pd.read_csv(orders_path)
    customers = pd.read_csv(customers_path)

    # Estandarizar join keys
    orders["customer_id"] = orders["customer_id"].astype(str).str.strip()
    customers["customer_id"] = customers["customer_id"].astype(str).str.strip()

    merged = orders.merge(customers, on="customer_id", how="left")

    logger.info(f"Merged: {len(orders)} orders + {len(customers)} customers = {len(merged)} rows")
    return merged
```

### Transformar con validación

```python
def transform_with_validation(df: pd.DataFrame) -> pd.DataFrame:
    """Transformar con checks de calidad de datos."""
    # Coerción de tipos
    df["order_date"] = pd.to_datetime(df["order_date"], errors="coerce")
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")

    # Validación: no amounts negativos
    negative_count = (df["amount"] < 0).sum()
    if negative_count > 0:
        logger.warning(f"Found {negative_count} negative amounts, filtering out")
        df = df[df["amount"] >= 0]

    # Validación: no order IDs duplicados
    dup_count = df.duplicated(subset=["order_id"]).sum()
    if dup_count > 0:
        logger.warning(f"Found {dup_count} duplicate order IDs, dropping duplicates")
        df = df.drop_duplicates(subset=["order_id"], keep="last")

    # Validación: columnas requeridas presentes
    required_cols = ["order_id", "customer_id", "order_date", "amount"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    # Columnas derivadas
    df["year"] = df["order_date"].dt.year
    df["month"] = df["order_date"].dt.month
    df["quarter"] = df["order_date"].dt.quarter

    return df
```

### Output Parquet particionado

```python
def load_partitioned(df: pd.DataFrame, base_path: str) -> None:
    """Cargar a Parquet particionado por year y month."""
    # Asegurar que las columnas de partición sean strings (requerimiento de Parquet)
    df["year"] = df["year"].astype(str)
    df["month"] = df["month"].astype(str).str.zfill(2)

    df.to_parquet(
        base_path,
        partition_cols=["year", "month"],
        index=False,
        engine="pyarrow",
        compression="snappy",
    )
    logger.info(f"Partitioned output at {base_path}/year=*/month=*")


def read_partitioned(base_path: str, year: str, month: str | None = None) -> pd.DataFrame:
    """Leer particiones específicas."""
    if month:
        path = f"{base_path}/year={year}/month={month}"
    else:
        path = f"{base_path}/year={year}"
    return pd.read_parquet(path)
```

### Carga incremental (append a Parquet existente)

```python
def load_incremental(df: pd.DataFrame, path: str) -> None:
    """Appendear nueva data a dataset Parquet existente."""
    from pathlib import Path

    if Path(path).exists():
        existing = pd.read_parquet(path)
        combined = pd.concat([existing, df], ignore_index=True)
        combined = combined.drop_duplicates(subset=["order_id"], keep="last")
    else:
        combined = df

    combined.to_parquet(path, index=False)
    logger.info(f"Incremental load: {len(df)} new rows, {len(combined)} total")
```

### Pipeline con error handling y retries

```python
import time

def extract_with_retry(path: str, retries: int = 3, delay: int = 5) -> pd.DataFrame:
    """Extraer con lógica de retry para sources de red."""
    for attempt in range(retries):
        try:
            if path.startswith("http"):
                df = pd.read_csv(path)
            else:
                df = pd.read_csv(path)
            return df
        except Exception as e:
            logger.warning(f"Attempt {attempt + 1}/{retries} failed: {e}")
            if attempt < retries - 1:
                time.sleep(delay * (attempt + 1))
            raise


def run_pipeline_safe(source: str, destination: str) -> bool:
    """Ejecutar pipeline con error handling completo."""
    try:
        df = extract_with_retry(source)
        df = transform_with_validation(df)
        load_partitioned(df, destination)
        logger.info("Pipeline completed successfully")
        return True
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        return False
```

### Enforcement de schema

```python
EXPECTED_SCHEMA = {
    "order_id": "int64",
    "customer_id": "object",
    "order_date": "datetime64[ns]",
    "amount": "float64",
    "quantity": "Int64",
    "status": "category",
}

def enforce_schema(df: pd.DataFrame) -> pd.DataFrame:
    """Enforcear el schema esperado en el DataFrame."""
    for col, dtype in EXPECTED_SCHEMA.items():
        if col not in df.columns:
            raise ValueError(f"Missing column: {col}")
        if df[col].dtype != dtype:
            logger.info(f"Converting {col} from {df[col].dtype} to {dtype}")
            if dtype == "datetime64[ns]":
                df[col] = pd.to_datetime(df[col], errors="coerce")
            elif dtype == "category":
                df[col] = df[col].astype("category")
            else:
                df[col] = df[col].astype(dtype)
    return df
```

## Variants

### Usar PyArrow directamente para archivos grandes

```python
import pyarrow.parquet as pq
import pyarrow as pa

def load_with_pyarrow(df: pd.DataFrame, path: str) -> None:
    """Escribir Parquet usando PyArrow para más control."""
    table = pa.Table.from_pandas(df, preserve_index=False)
    pq.write_table(
        table,
        path,
        compression="zstd",
        compression_level=3,
        use_dictionary=True,
        write_statistics=True,
    )
```

### Pipeline con logging a archivo

```python
import logging.handlers

def setup_logging(log_path: str = "logs/etl.log") -> None:
    """Set up logging a archivo + consola."""
    handler = logging.handlers.RotatingFileHandler(
        log_path, maxBytes=10_000_000, backupCount=5
    )
    handler.setFormatter(logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    ))
    logging.basicConfig(
        level=logging.INFO,
        handlers=[handler, logging.StreamHandler()],
    )
```

### Orquestación de pipeline con config

```python
import yaml

def load_config(config_path: str) -> dict:
    with open(config_path) as f:
        return yaml.safe_load(f)

def run_pipeline_from_config(config_path: str) -> None:
    config = load_config(config_path)

    df = pd.read_csv(config["source"])
    for transform_config in config.get("transforms", []):
        if transform_config["type"] == "rename":
            df = df.rename(columns=transform_config["mapping"])
        elif transform_config["type"] == "filter":
            df = df.query(transform_config["condition"])
        elif transform_config["type"] == "cast":
            df[transform_config["column"]] = df[transform_config["column"]].astype(
                transform_config["dtype"]
            )

    df.to_parquet(
        config["destination"],
        partition_cols=config.get("partition_cols"),
        index=False,
    )
```

## Best Practices


- For a deeper guide, see [Schedule and Monitor DAGs with Apache Airflow](/es/recipes/python-airflow-dag-scheduling/).

- Usa `errors="coerce"` en `pd.to_numeric` y `pd.to_datetime` — convierte valores inválidos a `NaN` en lugar de lanzar error
- Particiona por columnas de fecha (year, month) — habilita reads eficientes de rangos de tiempo específicos
- Usa compresión `snappy` para velocidad, `zstd` para mejor ratio de compresión
- Loggea row counts en cada stage — hace el debugging de issues del pipeline más fácil
- Valida data antes de escribir — atrapa issues temprano, no propagues data mala
- Usa `Int64` (nullable integer) en lugar de `int64` cuando la data puede tener missing values
- Escribe statistics en Parquet — habilita predicate pushdown para queries más rápidas

## Common Mistakes

- **No manejar missing values**: `pd.to_numeric` sin `errors="coerce"` lanza error en data inválida. Usa `errors="coerce"` y maneja `NaN` downstream.
- **Usar CSV como formato intermedio**: CSV pierde información de tipos. Usa Parquet para almacenamiento intermedio.
- **No particionar datasets grandes**: un solo archivo Parquet de 10GB es lento de leer. Particiona por fecha.
- **Ignorar dtypes después de leer**: `pd.read_csv` infiere tipos, que pueden ser incorrectos. Cast explícitamente las columnas después de leer.
- **No deduplicar en cargas incrementales**: appendear sin deduplicación crea filas duplicadas. Usa `drop_duplicates`.

## FAQ

### ¿Por qué usar Parquet en lugar de CSV?

Parquet preserva tipos de datos (enteros quedan enteros, fechas quedan fechas), comprime 3-10x mejor que CSV y soporta reads columnares (solo leer las columnas que necesitas). CSV requiere re-parsing de tipos en cada read.

### ¿Cómo manejo datasets más grandes que la memoria?

Usa el parámetro `chunksize` en `pd.read_csv` para procesar en batches, o cambia a Polars/Dask que manejan out-of-core computation nativamente.

### ¿Qué compresión debería usar?

`snappy` para read/write rápido (bueno para archivos intermedios). `zstd` para mejor ratio de compresión (bueno para archival). `gzip` para compatibilidad pero más lento que ambos.

### ¿Cómo leo particiones específicas?

```python
df = pd.read_parquet("data/orders/year=2025/month=01")
```

El particionado de Parquet crea estructuras de directorios que pandas puede leer directamente.

### ¿Debería usar pandas o Polars para ETL?

Usa pandas para datasets bajo 1GB y cuando necesitas compatibilidad con el ecosistema. Usa Polars para datasets más grandes o cuando la velocidad es crítica — es 5-30x más rápido para la mayoría de operaciones.
