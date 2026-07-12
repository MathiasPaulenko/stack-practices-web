---


contentType: recipes
slug: python-dask-parallel-dataframe
title: "Operaciones Paralelas de DataFrame con Dask"
description: "Cómo usar Dask para operaciones paralelas de DataFrame en datasets más grandes que la memoria, cubriendo lazy evaluation, particiones, computations custom y scheduling distribuido."
metaDescription: "Usa Dask para operaciones paralelas de DataFrame en datasets mas grandes que la memoria. Lazy evaluation, particiones, computations custom y scheduling distribuido."
difficulty: advanced
topics:
  - data
tags:
  - data
  - python
  - dask
  - dataframe
  - parallel
  - big-data
  - recipe
relatedResources:
  - /recipes/python-polars-fast-dataframe
  - /recipes/python-pandas-etl-pipeline
  - /recipes/python-spark-groupby-aggregation
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usa Dask para operaciones paralelas de DataFrame en datasets mas grandes que la memoria. Lazy evaluation, particiones, computations custom y scheduling distribuido."
  keywords:
    - data
    - python
    - dask
    - dataframe
    - parallel
    - big-data
    - recipe


---

## Overview

Dask extiende pandas/NumPy para trabajar en datasets más grandes que la memoria splitteando DataFrames en particiones y procesándolas en paralelo. Un Dask DataFrame es una colección de pandas DataFrames — cada partición es un pandas DataFrame regular que cabe en memoria. Dask construye un task graph de operaciones y las ejecuta lazymente, paralelizando a través de cores (local scheduler) o máquinas (distributed scheduler). La API espeja pandas, así que la mayoría del código de pandas funciona con cambios mínimos.

## When to Use

- Datasets de 1GB a 1TB que no caben en memoria pero caben en disco
- Código de pandas que necesita escalar — Dask espeja la API de pandas
- Cuando quieres paralelismo sin settear un Spark cluster
- Pipelines ETL que leen/escriben Parquet, CSV o HDF5
- Cuando necesitas computations paralelas custom más allá de group-by/join

## When NOT to Use

- Datasets bajo 1GB — pandas es más rápido (no hay overhead de task graph)
- Cuando necesitas el ecosistema completo de pandas — Dask no soporta todos los métodos de pandas
- Real-time/streaming — usa Structured Streaming o Flink
- Cuando Polars es suficiente — Polars es más rápido para la mayoría de operaciones de DataFrame

## Solution

### Dask DataFrame básico

```python
import dask.dataframe as dd

# Leer CSV (lazy — no carga hasta compute)
ddf = dd.read_csv("data/orders_*.csv")

# Leer Parquet
ddf = dd.read_parquet("data/orders/")

# Desde pandas
import pandas as pd
pdf = pd.read_csv("data.csv")
ddf = dd.from_pandas(pdf, npartitions=4)

# Inspeccionar
print(ddf.npartitions)  # Número de particiones
print(ddf.divisions)    # Boundaries de particiones (conocidas si está sorteado)
```

### Operaciones lazy

```python
# Construir task graph — sin ejecución todavía
result = (
    ddf
    .query("amount > 100")
    .groupby("customer_id")
    .agg({"amount": "sum"})
    .reset_index()
    .sort_values("amount", ascending=False)
)

# Ejecutar — triggerea computation
df = result.compute()  # Retorna un pandas DataFrame
print(df.head(10))
```

### Leer y escribir

```python
# Leer múltiples CSV files
ddf = dd.read_csv("data/2025-*.csv", parse_dates=["order_date"])

# Leer con dtypes
ddf = dd.read_csv("data/orders.csv", dtype={
    "order_id": "int64",
    "amount": "float64",
    "customer_id": "object",
})

# Escribir a Parquet (partitioned)
ddf.to_parquet("data/output/", write_index=False)

# Escribir a un solo CSV
ddf.to_csv("data/output_*.csv", index=False)  # Un file por partición
```

### Group-by y agregación

```python
# Agregación group-by (paralela a través de particiones)
result = (
    ddf
    .groupby("customer_id")
    .agg({
        "amount": ["sum", "mean", "count"],
        "order_id": "nunique",
    })
    .compute()
)

# Agregación custom
result = (
    ddf
    .groupby("category")
    .agg(
        total_revenue=("amount", "sum"),
        avg_order=("amount", "mean"),
        order_count=("order_id", "count"),
    )
    .compute()
)
```

### Joins

```python
orders = dd.read_parquet("data/orders/")
customers = dd.read_parquet("data/customers/")

# Join (requiere shuffle si no está sorteado por join key)
joined = orders.merge(customers, on="customer_id", how="left")

# Broadcast join para right DataFrame pequeño
small_customers = customers.head(1000)  # pandas DataFrame
joined = orders.merge(
    dd.from_pandas(small_customers, npartitions=1),
    on="customer_id",
    how="left",
    broadcast=True,
)

result = joined.compute()
```

### Computation paralela custom con map_partitions

```python
def process_partition(pdf: pd.DataFrame) -> pd.DataFrame:
    """Procesar una sola partición (pandas DataFrame)."""
    pdf["amount_with_tax"] = pdf["amount"] * 1.1
    pdf["order_date"] = pd.to_datetime(pdf["order_date"])
    pdf["month"] = pdf["order_date"].dt.month
    return pdf

# Aplicar función a cada partición
ddf_processed = ddf.map_partitions(process_partition)

result = ddf_processed.compute()
```

### Computation custom con delayed

```python
import dask

@dask.delayed
def load_file(path):
    return pd.read_csv(path)

@dask.delayed
def process(df):
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    return df.dropna(subset=["amount"])

@dask.delayed
def aggregate(dfs):
    combined = pd.concat(dfs)
    return combined.groupby("customer_id")["amount"].sum()

# Construir task graph
files = ["data/jan.csv", "data/feb.csv", "data/mar.csv"]
processed = [process(load_file(f)) for f in files]
result = aggregate(processed)

# Ejecutar
df = result.compute()
```

### Repartitioning

```python
# Setear número de particiones
ddf = ddf.repartition(npartitions=10)

# Setear tamaño de partición (e.g., 100MB por partición)
ddf = ddf.repartition(partition_size="100MB")

# Resetear index para hacer divisions conocidas
ddf = ddf.reset_index(drop=True)
ddf = ddf.set_index("customer_id")  # Shuffles data
```

### Usar Dask Distributed

```python
from dask.distributed import Client

# Local cluster (usa todos los cores)
client = Client(n_workers=4, threads_per_worker=2, memory_limit="4GB")

# Ahora todos los .compute() usan el distributed scheduler
ddf = dd.read_parquet("data/orders/")
result = ddf.groupby("customer_id")["amount"].sum().compute()

# Conectar a cluster existente
# client = Client("scheduler-address:8786")

# Cerrar cuando termines
client.close()
```

### Persistir data en memoria

```python
# Persist — cargar a distributed memory a través de workers
ddf_persisted = ddf.persist()

# Ahora las operaciones en ddf_persisted son rápidas (data está en memoria)
result = ddf_persisted.groupby("customer_id")["amount"].sum().compute()
```

### Monitoreo de progreso

```python
from dask.distributed import progress

# Compute con progress bar
result = ddf.groupby("customer_id")["amount"].sum()
future = client.compute(result)
progress(future)
df = future.result()
```

## Variants

### Usar Dask con S3

```python
ddf = dd.read_parquet(
    "s3://my-bucket/data/orders/",
    storage_options={"key": "aws-key", "secret": "aws-secret"},
)

ddf.to_parquet(
    "s3://my-bucket/data/output/",
    storage_options={"key": "aws-key", "secret": "aws-secret"},
)
```

### Dask Bag para data no estructurada

```python
import dask.bag as db

# Leer JSON lines
bag = db.read_text("data/events_*.jsonl").map(json.loads)

# Procesar en paralelo
result = (
    bag
    .filter(lambda x: x["event_type"] == "purchase")
    .map(lambda x: {"user": x["user_id"], "amount": x["amount"]})
    .to_dataframe()
    .compute()
)
```

### Dask Array para operaciones de NumPy

```python
import dask.array as da

# Crear un array grande
x = da.random.random((10000, 10000), chunks=(1000, 1000))

# Computation lazy
mean = x.mean(axis=0)
result = mean.compute()
```

## Best Practices


- For a deeper guide, see [High-Performance DataFrame Operations with Polars](/es/recipes/python-polars-fast-dataframe/).

- Usa `npartitions` igual a 2-4x el número de cores — suficiente paralelismo sin overhead
- El tamaño de partición debería ser 50-200MB — muy chico agrega overhead, muy grande reduce paralelismo
- Llama `.compute()` solo al final — deja que Dask optimice el task graph
- Usa `.persist()` para DataFrames usados múltiples veces — mantiene data en memoria
- Lee Parquet en lugar de CSV — Parquet preserva tipos y es más rápido de leer
- Usa `map_partitions` para operaciones no soportadas por la API de Dask
- Evita `.set_index()` en DataFrames grandes — triggerea un full shuffle
- Usa Dask Distributed incluso para trabajo local — mejores diagnostics y dashboard

## Common Mistakes

- **Llamar `.compute()` muy temprano**: materializa resultados intermedios. Encadena operaciones y computea una sola vez al final.
- **Demasiadas particiones**: 1000 particiones de 1MB cada una agrega huge scheduling overhead. Repartitiona a chunks de 50-200MB.
- **No usar `.persist()` para data reusada**: Dask recomputa el task graph cada vez. Persiste para mantener en memoria.
- **Usar CSV en lugar de Parquet**: CSV requiere parsing en cada read. Parquet es columnar, tipado y comprimido.
- **No setear `dtype` al leer CSV**: Dask lee un sample para inferir tipos, que puede ser incorrecto. Especifica dtypes explícitamente.

## FAQ

### ¿En qué se diferencia Dask de pandas?

Dask splittea data en particiones y las procesa en paralelo. pandas carga todo en un solo DataFrame. Dask espeja la API de pandas pero evalúa lazymente — las operaciones construyen un task graph que se ejecuta en `.compute()`.

### ¿En qué se diferencia Dask de Spark?

Dask es Python-native y usa pandas DataFrames como particiones. Spark usa su propio formato interno y convierte a/desde pandas. Dask es más ligero y más fácil de settear, pero Spark tiene mejor soporte del ecosistema para herramientas de big data.

### ¿Cuántas particiones debería usar?

Apunta a particiones de 50-200MB cada una. Para un dataset de 10GB, usa 50-200 particiones. Para ejecución local, usa 2-4x el número de CPU cores. Usa `ddf.npartitions` para chequear.

### ¿Puedo usar Dask en un cluster?

Sí. Usa `dask.distributed.Client("scheduler-address:8786")` para conectarte a un Dask cluster remoto. Settea un scheduler con `dask-scheduler` y workers con `dask-worker`.

### ¿Dask soporta todas las operaciones de pandas?

La mayoría de operaciones comunes están soportadas (groupby, merge, join, filter, map_partitions). Algunos métodos menos comunes no están implementados. Chequea los docs de la API de Dask para la lista completa de métodos soportados.
