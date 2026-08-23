---
contentType: recipes
slug: python-dask-parallel-dataframe
title: "Operaciones Paralelas de DataFrame con Dask"
description: "Escalá workflows de pandas con Dask. Procesá DataFrames que no caben en memoria usando lazy evaluation, particiones y el scheduler distribuido en datasets de 1 GB a 1 TB."
metaDescription: "Escalá workflows de pandas con Dask. Procesá DataFrames que no caben en memoria usando lazy evaluation, particiones y el scheduler distribuido en datasets de 1 GB a 1 TB."
difficulty: advanced
topics:
  - data
tags:
  - python
  - dask
  - dataframe
  - pandas
  - parallel
  - big-data
relatedResources:
  - /recipes/python-polars-fast-dataframe
  - /recipes/python-pandas-etl-pipeline
  - /recipes/python-spark-groupby-aggregation
  - /recipes/python-data-validation-pandera
  - /recipes/python-airflow-dag-scheduling
  - /recipes/python-excel-read-write
lastUpdated: "2026-08-23"
publishedAt: "2026-07-05"
author: Mathias Paulenko
seo:
  metaDescription: "Escalá workflows de pandas con Dask. Procesá DataFrames que no caben en memoria usando lazy evaluation, particiones y el scheduler distribuido en datasets de 1 GB a 1 TB."
  keywords:
    - python
    - dask
    - dataframe
    - pandas
    - parallel
    - big-data
    - out-of-core
---

## Visión General

Dask se apoya en pandas y NumPy para trabajar con datasets más grandes que la memoria. Corta un DataFrame
en particiones, y cada partición es un pandas DataFrame normal. Dask construye un task graph de operaciones y
las ejecuta de forma lazy, paralelizando entre cores con el scheduler local o
entre máquinas con el scheduler distribuido. Como la API refleja la de pandas, la mayoría del código
existente funciona con cambios mínimos.

## Cuándo Usar

Dask rinde cuando los datasets van de unos pocos gigabytes a aproximadamente un terabyte, demasiado grandes
para la memoria pero manejables en disco. Si ya tenés código de pandas que necesita escalar sin una
reescritura grande, la API familiar de Dask es una victoria rápida. También sirve cuando querés paralelismo
sin el overhead de un cluster de Spark, o cuando tus pipelines ETL mueven archivos Parquet, CSV o HDF5. Por
último, usá Dask cuando necesitás lógica paralela custom que va más allá de group-by y join.

## Cuándo Evitar

Evitá Dask cuando los datasets sean menores a 1 GB. pandas suele ser más rápido porque evita el overhead del
task graph de Dask. También evitalo si necesitás el ecosistema completo de pandas, porque Dask no implementa
todos los métodos de pandas. Para streams o procesamiento en tiempo real, Flink o Structured Streaming son
un mejor ajuste. Y si [Polars](/es/recipes/python-polars-fast-dataframe/) es suficiente, usalo: suele ser más
rápido y ligero para
la mayoría del trabajo con DataFrames.

## Solución

### Dask DataFrame Básico

```python
import dask.dataframe as dd

# Leer CSV lazy — no carga hasta compute()
ddf = dd.read_csv("data/orders_*.csv")

# Leer Parquet
ddf = dd.read_parquet("data/orders/")

# Desde un pandas DataFrame
import pandas as pd
pdf = pd.read_csv("data.csv")
ddf = dd.from_pandas(pdf, npartitions=4)

# Inspeccionar particiones
print(ddf.npartitions)  # número de particiones
print(ddf.divisions)    # límites de particiones, conocidos si están ordenados
```

### Operaciones Lazy

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

# Ejecutar el graph y obtener un pandas DataFrame
df = result.compute()
print(df.head(10))
```

### Lectura y Escritura

```python
# Leer múltiples archivos CSV
ddf = dd.read_csv("data/2025-*.csv", parse_dates=["order_date"])

# Leer con dtypes explícitos
ddf = dd.read_csv(
    "data/orders.csv",
    dtype={
        "order_id": "int64",
        "amount": "float64",
        "customer_id": "object",
    },
)

# Escribir Parquet (un archivo por partición por defecto)
ddf.to_parquet("data/output/", write_index=False)

# Escribir CSV con un archivo por partición
ddf.to_csv("data/output_*.csv", index=False)
```

### Group-by y Agregación

```python
# Agregación group-by en paralelo
result = (
    ddf
    .groupby("customer_id")
    .agg({
        "amount": ["sum", "mean", "count"],
        "order_id": "nunique",
    })
    .compute()
)

# Agregaciones con nombres custom
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

# Merge estándar; puede requerir un shuffle si no está ordenado por la join key
joined = orders.merge(customers, on="customer_id", how="left")

# Broadcast join cuando el lado derecho es chico
small_customers = customers.head(1000)  # pandas DataFrame
joined = orders.merge(
    dd.from_pandas(small_customers, npartitions=1),
    on="customer_id",
    how="left",
    broadcast=True,
)

result = joined.compute()
```

### Cómputo Custom con `map_partitions`

```python
def process_partition(pdf: pd.DataFrame) -> pd.DataFrame:
    pdf["amount_with_tax"] = pdf["amount"] * 1.1
    pdf["order_date"] = pd.to_datetime(pdf["order_date"])
    pdf["month"] = pdf["order_date"].dt.month
    return pdf

ddf_processed = ddf.map_partitions(process_partition)
result = ddf_processed.compute()
```

### Task Graphs Custom con `delayed`

```python
import dask

@dask.delayed
def load_file(path):
    return pd.read_csv(path)

@dask.delayed
def clean(df):
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    return df.dropna(subset=["amount"])

@dask.delayed
def combine(dfs):
    return pd.concat(dfs).groupby("customer_id")["amount"].sum()

files = ["data/jan.csv", "data/feb.csv", "data/mar.csv"]
processed = [clean(load_file(f)) for f in files]
result = combine(processed)

df = result.compute()
```

### Repartitioning

```python
# Setear número de particiones
ddf = ddf.repartition(npartitions=10)

# O setear tamaño de partición
ddf = ddf.repartition(partition_size="100MB")

# Setear un índice ordenado para que divisions sean conocidas
ddf = ddf.reset_index(drop=True)
ddf = ddf.set_index("customer_id")  # dispara un shuffle
```

### Usar Dask Distributed

```python
from dask.distributed import Client

# Cluster local usando todos los cores
client = Client(n_workers=4, threads_per_worker=2, memory_limit="4GB")

# Todos los .compute() usan el distributed scheduler
ddf = dd.read_parquet("data/orders/")
result = ddf.groupby("customer_id")["amount"].sum().compute()

# Cerrar el client al terminar
client.close()
```

### Persistir Data en Memoria

```python
# Cargar a memoria distribuida entre workers
ddf_persisted = ddf.persist()

# Reusar el objeto persistido para operaciones repetidas más rápidas
result = ddf_persisted.groupby("customer_id")["amount"].sum().compute()
```

### Monitoreo de Progreso

```python
from dask.distributed import progress

result = ddf.groupby("customer_id")["amount"].sum()
future = client.compute(result)
progress(future)
df = future.result()
```

## Variantes

### Dask con S3

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

### Dask Bag para Data No Estructurada

```python
import dask.bag as db

bag = db.read_text("data/events_*.jsonl").map(json.loads)

result = (
    bag
    .filter(lambda x: x["event_type"] == "purchase")
    .map(lambda x: {"user": x["user_id"], "amount": x["amount"]})
    .to_dataframe()
    .compute()
)
```

### Dask Array para Cargas de NumPy

```python
import dask.array as da

x = da.random.random((10000, 10000), chunks=(1000, 1000))
mean = x.mean(axis=0)
result = mean.compute()
```

## Mejores Prácticas

Para trabajo local, yo empiezo con `npartitions` alrededor de dos o cuatro veces el número de cores. Eso da
suficiente paralelismo sin generar demasiado overhead de scheduling. Apuntá a particiones de 50 MB a 200 MB.
Las chicas agregan overhead; las grandes dejan cores ociosos.

Llamá a `.compute()` solo al final de una cadena para que Dask optimice el task graph completo. Usá
`.persist()` cuando vayas a tocar un DataFrame más de una vez; así se mantiene en memoria de los workers.

Prefiero Parquet sobre CSV porque conserva tipos, soporta column pruning y se lee más rápido. Para
operaciones que la API de Dask no expone directamente, bajá a `map_partitions` y escribí código normal de
pandas en cada chunk. Evitá `.set_index()` en DataFrames grandes porque dispara un shuffle completo. Para
desarrollo local, usá el Dask Distributed scheduler; agrega un dashboard y mejores diagnósticos que el
scheduler síncrono por defecto.

## Errores Comunes

Llamar a `.compute()` muy temprano materializa resultados intermedios y rompe la optimización del graph.
Encadená operaciones y llamá `.compute()` una sola vez al final. Demasiadas particiones, como 1.000
particiones chicas de 1 MB, generan un overhead de scheduling enorme. Llamá a `.repartition()` para caer en
el rango de 50–200 MB.

No usar `.persist()` para datos reusados significa que Dask recomputa el task graph cada vez. Dejá los
objetos que vas a reusar en memoria con `.persist()`. CSV es más lento que Parquet porque debe parsear tipos
en cada
lectura y no soporta column pruning. Además, Dask lee una muestra para inferir el `dtype` del CSV, lo cual
puede ser incorrecto. Declará los dtypes para evitar errores de tipo.

## Preguntas Frecuentes

### ¿En qué se diferencia Dask de pandas?

Dask parte los datos en particiones y las procesa en paralelo. pandas pone todo en un solo DataFrame. Dask
refleja la API de pandas pero evalúa lazy, así que las operaciones construyen un task graph que se ejecuta en
`.compute()`.

### ¿En qué se diferencia Dask de Spark?

Dask es nativo de Python y usa pandas DataFrames como particiones. Spark usa su propio formato interno y
convierte a y desde pandas. Dask es más ligero y fácil de levantar, pero Spark tiene un ecosistema de big data
más amplio.

### ¿Cuántas particiones debería usar?

Apuntá a 50–200 MB por partición. Un archivo de 10 GB se parte en 50–200 chunks de ese tamaño. Para
ejecución local, yo empiezo con dos a cuatro veces el número de cores, y después verifico `ddf.npartitions`.

### ¿Puedo usar Dask en un cluster?

Sí. Creá un `dask.distributed.Client("scheduler-address:8786")` para conectarte a un scheduler remoto.
Levantá el scheduler con `dask-scheduler` y los workers con `dask-worker`.

### ¿Dask soporta todas las operaciones de pandas?

La mayoría de las operaciones comunes están soportadas, incluyendo groupby, merge, join, filter,
`map_partitions` y varias operaciones de ventana. Algunos menos comunes no están implementados, así que
consultá la documentación de la API de Dask para la lista más actualizada.
