---


contentType: recipes
slug: python-data-validation-pandera
title: "Validar Schemas de DataFrame con Pandera"
description: "Cómo validar schemas de DataFrame de pandas y Polars con Pandera, cubriendo tipos de columnas, constraints, checks custom, hypothesis testing y herencia de schemas."
metaDescription: "Valida schemas de DataFrame de pandas y Polars con Pandera. Enforcea tipos de columnas, constraints, checks custom, hypothesis testing y herencia de schemas en pipelines."
difficulty: intermediate
topics:
  - data
tags:
  - data
  - python
  - pandera
  - validation
  - schema
  - testing
  - recipe
relatedResources:
  - /recipes/python-pandas-etl-pipeline
  - /recipes/python-polars-fast-dataframe
  - /recipes/python-dbt-model-transformations
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Valida schemas de DataFrame de pandas y Polars con Pandera. Enforcea tipos de columnas, constraints, checks custom, hypothesis testing y herencia de schemas en pipelines."
  keywords:
    - data
    - python
    - pandera
    - validation
    - schema
    - testing
    - recipe


---

## Overview

Pandera es una librería de validación de data para DataFrames de pandas y Polars. Defines un schema que especifica nombres de columnas, tipos de datos y constraints (rangos de valores, nullability, uniqueness). Pandera valida el DataFrame contra el schema y lanza errores informativos cuando la data no matchea. Esto atrapa data quality issues temprano en los pipelines — antes de que data mala llegue a consumers downstream o modelos en producción.

## When to Use

- Pipelines ETL donde la data quality upstream es incierta
- ML feature engineering — valida features antes de model training
- Data ingestion de APIs externas, archivos o databases
- Testear transformaciones de data — asertar que el output matchea el schema esperado
- Cualquier pipeline donde la corrupción silenciosa de data causa issues downstream

## When NOT to Use

- Análisis exploratorio one-off — simplemente usa `df.dtypes` y `df.describe()`
- Cuando necesitas full data profiling — usa Great Expectations o ydata-profiling en su lugar
- Validación real-time con requisitos de latencia estrictos — Pandera agrega overhead por validación
- Cuando el schema cambia frecuentemente y el costo de mantenimiento es alto

## Solution

### Validación básica de schema

```python
import pandas as pd
import pandera as pa
from pandera import Column, DataFrameSchema, Check

schema = DataFrameSchema({
    "order_id": Column(int, checks=Check.gt(0)),
    "customer_id": Column(int, nullable=False),
    "order_date": Column(pa.DateTime),
    "amount": Column(float, checks=[Check.ge(0), Check.le(100000)]),
    "status": Column(str, checks=Check.isin(["pending", "completed", "cancelled"])),
})

df = pd.DataFrame({
    "order_id": [1, 2, 3],
    "customer_id": [101, 102, 103],
    "order_date": pd.to_datetime(["2025-01-01", "2025-01-02", "2025-01-03"]),
    "amount": [100.0, 250.0, 75.5],
    "status": ["completed", "pending", "cancelled"],
})

# Validar — lanza SchemaError si es inválido
validated_df = schema.validate(df)
print("Validation passed!")
```

### Schema con sintaxis basada en clases

```python
from pandera import Field
from pandera.typing import Series
import pandera as pa

class OrderSchema(pa.DataFrameModel):
    order_id: Series[int] = Field(gt=0, description="Unique order identifier")
    customer_id: Series[int] = Field(nullable=False)
    order_date: Series[pa.DateTime] = Field(le="2025-12-31")
    amount: Series[float] = Field(ge=0, le=100000)
    status: Series[str] = Field(isin=["pending", "completed", "cancelled"])
    quantity: Series[int] = Field(ge=1, le=1000)

    class Config:
        strict = True  # Rechazar columnas extra
        coerce = True  # Auto-convertir tipos

df = pd.DataFrame({
    "order_id": [1, 2, 3],
    "customer_id": [101, 102, 103],
    "order_date": pd.to_datetime(["2025-01-01", "2025-01-02", "2025-01-03"]),
    "amount": [100.0, 250.0, 75.5],
    "status": ["completed", "pending", "cancelled"],
    "quantity": [2, 1, 5],
})

validated = OrderSchema.validate(df)
```

### Checks de validación custom

```python
import pandera as pa
from pandera import Column, Check, DataFrameSchema

def is_valid_email(series: pd.Series) -> pd.Series:
    """Checkear que todos los valores matcheen el patrón de email."""
    import re
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return series.str.match(pattern)

schema = DataFrameSchema({
    "email": Column(str, checks=Check(is_valid_email, element_wise=False)),
    "age": Column(int, checks=[
        Check.ge(18, error="Must be 18 or older"),
        Check.le(120, error="Age must be realistic"),
    ]),
    "phone": Column(str, checks=Check.str_matches(r'^\+?\d{10,15}$')),
})
```

### Checks a nivel de columna

```python
schema = DataFrameSchema({
    "id": Column(int, checks=[
        Check.unique(),  # No duplicados
        Check.gt(0),     # Positivo
    ]),
    "name": Column(str, checks=[
        Check.str_length(min_value=1, max_value=100),
        Check.not_nullable(),
    ]),
    "price": Column(float, checks=[
        Check.ge(0),
        Check.le(10000),
        Check(lambda s: s.std() < 1000, element_wise=False, error="Price variance too high"),
    ]),
    "category": Column(str, checks=[
        Check.isin(["electronics", "books", "clothing", "food"]),
    ], nullable=True),  # Puede ser null
})
```

### Checks a nivel de DataFrame

```python
schema = DataFrameSchema(
    columns={
        "start_date": Column(pa.DateTime),
        "end_date": Column(pa.DateTime),
    },
    checks=Check(
        lambda df: df["end_date"] > df["start_date"],
        element_wise=False,
        error="end_date must be after start_date",
    )
)
```

### Schema con coercion

```python
schema = DataFrameSchema({
    "order_id": Column(int, coerce=True),
    "amount": Column(float, coerce=True),
    "order_date": Column(pa.DateTime, coerce=True),
}, coerce=True)  # Coerción global

# Pandera convierte tipos antes de validar
df = pd.DataFrame({
    "order_id": ["1", "2", "3"],       # Strings → int
    "amount": ["100.0", "250.0", "75.5"],  # Strings → float
    "order_date": ["2025-01-01", "2025-01-02", "2025-01-03"],  # Strings → DateTime
})

validated = schema.validate(df)
print(validated.dtypes)  # int64, float64, datetime64[ns]
```

### Manejar errores de validación

```python
try:
    validated = schema.validate(df, lazy=True)  # Coleccionar todos los errores
except pa.SchemaErrors as e:
    print(f"Found {len(e.failure_cases)} validation failures:")
    print(e.failure_cases[["column", "check", "failure_case", "index"]])

    # failure_cases es un DataFrame con detalles:
    #   column    check           failure_case  index
    # 0  amount  greater_than(0)         -50.0      5
    # 1  status  isin([...])          "unknown"     12
```

### Herencia de schema

```python
class BaseOrderSchema(pa.DataFrameModel):
    order_id: Series[int] = Field(gt=0)
    customer_id: Series[int] = Field(nullable=False)
    amount: Series[float] = Field(ge=0)

class ExtendedOrderSchema(BaseOrderSchema):
    status: Series[str] = Field(isin=["pending", "completed", "cancelled"])
    shipping_address: Series[str] = Field(nullable=True)

    class Config:
        strict = True
        coerce = True
```

### Validar DataFrames de Polars

```python
import polars as pl
import pandera.polars as pa_pl
from pandera.typing.polars import Series

class OrderSchema(pa_pl.DataFrameModel):
    order_id: Series[int] = Field(gt=0)
    customer_id: Series[int] = Field(nullable=False)
    amount: Series[float] = Field(ge=0, le=100000)
    status: Series[str] = Field(isin=["pending", "completed", "cancelled"])

df = pl.DataFrame({
    "order_id": [1, 2, 3],
    "customer_id": [101, 102, 103],
    "amount": [100.0, 250.0, 75.5],
    "status": ["completed", "pending", "cancelled"],
})

validated = OrderSchema.validate(df)
```

### Usar schema en un pipeline

```python
def process_orders(df: pd.DataFrame) -> pd.DataFrame:
    """Pipeline con validación en cada stage."""
    # Validar input
    input_schema = DataFrameSchema({
        "order_id": Column(int, checks=Check.gt(0)),
        "amount": Column(float, checks=Check.ge(0)),
    })
    df = input_schema.validate(df)

    # Transformar
    df["amount_with_tax"] = df["amount"] * 1.1

    # Validar output
    output_schema = DataFrameSchema({
        "order_id": Column(int, checks=Check.gt(0)),
        "amount": Column(float, checks=Check.ge(0)),
        "amount_with_tax": Column(float, checks=Check.ge(0)),
    })
    return output_schema.validate(df)
```

## Variants

### Integración con hypothesis testing

```python
from pandera import Check
import pandera as pa

schema = DataFrameSchema({
    "amount": Column(float, checks=[
        Check.in_range(min_value=0, max_value=10000),
        # Check estadístico: mean debería ser alrededor de 500
        Check(lambda s: abs(s.mean() - 500) < 100, element_wise=False),
        # Check de standard deviation
        Check(lambda s: s.std() < 500, element_wise=False),
    ]),
})
```

### Schema desde un DataFrame existente

```python
import pandera as pa

# Inferir schema desde un DataFrame
df = pd.read_csv("data/orders.csv")
schema = pa.infer_schema(df)
print(schema)

# Guardar schema para reuso
schema.to_yaml("schemas/orders_schema.yaml")

# Cargar después
schema = pa.DataFrameSchema.from_yaml("schemas/orders_schema.yaml")
```

### Validación con decoradores

```python
from pandera import check_input, check_output

@check_input(OrderSchema)
@check_output(ExtendedOrderSchema)
def enrich_orders(df: pd.DataFrame) -> pd.DataFrame:
    df["status"] = df["status"].fillna("pending")
    df["shipping_address"] = df.get("shipping_address", "N/A")
    return df
```

## Best Practices


- For a deeper guide, see [Schedule and Monitor DAGs with Apache Airflow](/es/recipes/python-airflow-dag-scheduling/).

- Usa `lazy=True` para coleccionar todos los errores a la vez — el modo default para en el primer error
- Usa `coerce=True` cuando la data viene de CSV (strings) y necesita conversión de tipos
- Setea `strict=True` para rechazar columnas inesperadas — atrapa schema drift
- Define schemas como clases (`pa.DataFrameModel`) para legibilidad y reuso
- Valida en los boundaries del pipeline — input y output de cada stage
- Usa `nullable=True` para columnas opcionales — el default es non-nullable
- Guarda schemas como YAML — habilita sharing de schemas entre equipos
- Usa checks custom para business logic — los checks built-in cubren rangos y tipos

## Common Mistakes

- **No usar `lazy=True`**: el default para en el primer error. Te perdés otros issues en la misma run.
- **Olvidar `coerce=True`**: la data de CSV viene como strings. Sin coercion, los type checks fallan.
- **No setear `strict=True`**: las columnas extra pasan silenciosamente. Usa strict mode para atrapar schema drift.
- **Validar solo al final**: los errores se propagan a través del pipeline. Valida en cada boundary de stage.
- **Usar checks element-wise para validaciones aggregate**: usa `element_wise=False` para checks que operan en la series completa (mean, std, count).

## FAQ

### ¿Cuál es la diferencia entre Pandera y Great Expectations?

Pandera es ligero y code-first — defines schemas en Python. Great Expectations es más pesado y config-first — defines expectations en JSON/YAML. Usa Pandera para validación de pipelines, Great Expectations para data profiling y reporting.

### ¿Puedo usar Pandera con Polars?

Sí. Usa el módulo `pandera.polars` y `pandera.typing.polars.Series`. La API es la misma que la versión de pandas.

### ¿Pandera soporta columnas nullable?

Sí. Setea `nullable=True` en `Column()` o `Field()`. Por default, las columnas son non-nullable.

### ¿Cómo valido un subset de columnas?

Usa `strict=False` (default) y especifica solo las columnas que quieres validar. Las columnas extra se ignoran.

### ¿Puedo generar data de test desde un schema?

Sí. Usa `schema.example(size=10)` para generar un DataFrame sample que pasa la validación:

```python
sample = OrderSchema.example(size=5)
print(sample)
```
