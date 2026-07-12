---


contentType: recipes
slug: python-data-validation-pandera
title: "Validate DataFrame Schemas with Pandera"
description: "How to validate pandas and Polars DataFrame schemas with Pandera, covering column types, constraints, custom checks, hypothesis testing, and schema inheritance."
metaDescription: "Validate pandas and Polars DataFrame schemas with Pandera. Enforce column types, constraints, custom checks, hypothesis testing, and schema inheritance in pipelines."
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
  metaDescription: "Validate pandas and Polars DataFrame schemas with Pandera. Enforce column types, constraints, custom checks, hypothesis testing, and schema inheritance in pipelines."
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

Pandera is a data validation library for pandas and Polars DataFrames. You define a schema that specifies column names, data types, and constraints (value ranges, nullability, uniqueness). Pandera validates the DataFrame against the schema and raises informative errors when data doesn't match. This catches data quality issues early in pipelines — before bad data reaches downstream consumers or production models.

## When to Use

- ETL pipelines where upstream data quality is uncertain
- ML feature engineering — validate features before model training
- Data ingestion from external APIs, files, or databases
- Testing data transformations — assert output matches expected schema
- Any pipeline where silent data corruption causes downstream issues

## When NOT to Use

- One-off exploratory analysis — just use `df.dtypes` and `df.describe()`
- When you need full data profiling — use Great Expectations or ydata-profiling instead
- Real-time validation with strict latency requirements — Pandera adds overhead per validation
- When the schema changes frequently and maintenance cost is high

## Solution

### Basic schema validation

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

# Validate — raises SchemaError if invalid
validated_df = schema.validate(df)
print("Validation passed!")
```

### Schema with class-based syntax

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
        strict = True  # Reject extra columns
        coerce = True  # Auto-convert types

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

### Custom validation checks

```python
import pandera as pa
from pandera import Column, Check, DataFrameSchema

def is_valid_email(series: pd.Series) -> pd.Series:
    """Check that all values match email pattern."""
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

### Column-level checks

```python
schema = DataFrameSchema({
    "id": Column(int, checks=[
        Check.unique(),  # No duplicates
        Check.gt(0),     # Positive
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
    ], nullable=True),  # Can be null
})
```

### DataFrame-level checks

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

### Schema with coercion

```python
schema = DataFrameSchema({
    "order_id": Column(int, coerce=True),
    "amount": Column(float, coerce=True),
    "order_date": Column(pa.DateTime, coerce=True),
}, coerce=True)  # Global coercion

# Pandera converts types before validating
df = pd.DataFrame({
    "order_id": ["1", "2", "3"],       # Strings → int
    "amount": ["100.0", "250.0", "75.5"],  # Strings → float
    "order_date": ["2025-01-01", "2025-01-02", "2025-01-03"],  # Strings → DateTime
})

validated = schema.validate(df)
print(validated.dtypes)  # int64, float64, datetime64[ns]
```

### Handling validation errors

```python
try:
    validated = schema.validate(df, lazy=True)  # Collect all errors
except pa.SchemaErrors as e:
    print(f"Found {len(e.failure_cases)} validation failures:")
    print(e.failure_cases[["column", "check", "failure_case", "index"]])

    # failure_cases is a DataFrame with details:
    #   column    check           failure_case  index
    # 0  amount  greater_than(0)         -50.0      5
    # 1  status  isin([...])          "unknown"     12
```

### Schema inheritance

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

### Validating Polars DataFrames

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

### Using schema in a pipeline

```python
def process_orders(df: pd.DataFrame) -> pd.DataFrame:
    """Pipeline with validation at each stage."""
    # Validate input
    input_schema = DataFrameSchema({
        "order_id": Column(int, checks=Check.gt(0)),
        "amount": Column(float, checks=Check.ge(0)),
    })
    df = input_schema.validate(df)

    # Transform
    df["amount_with_tax"] = df["amount"] * 1.1

    # Validate output
    output_schema = DataFrameSchema({
        "order_id": Column(int, checks=Check.gt(0)),
        "amount": Column(float, checks=Check.ge(0)),
        "amount_with_tax": Column(float, checks=Check.ge(0)),
    })
    return output_schema.validate(df)
```

## Variants

### Hypothesis testing integration

```python
from pandera import Check
import pandera as pa

schema = DataFrameSchema({
    "amount": Column(float, checks=[
        Check.in_range(min_value=0, max_value=10000),
        # Statistical check: mean should be around 500
        Check(lambda s: abs(s.mean() - 500) < 100, element_wise=False),
        # Standard deviation check
        Check(lambda s: s.std() < 500, element_wise=False),
    ]),
})
```

### Schema from existing DataFrame

```python
import pandera as pa

# Infer schema from a DataFrame
df = pd.read_csv("data/orders.csv")
schema = pa.infer_schema(df)
print(schema)

# Save schema for reuse
schema.to_yaml("schemas/orders_schema.yaml")

# Load later
schema = pa.DataFrameSchema.from_yaml("schemas/orders_schema.yaml")
```

### Decorator-based validation

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


- For a deeper guide, see [Schedule and Monitor DAGs with Apache Airflow](/recipes/python-airflow-dag-scheduling/).

- Use `lazy=True` to collect all errors at once — default mode stops at the first error
- Use `coerce=True` when data comes from CSV (strings) and needs type conversion
- Set `strict=True` to reject unexpected columns — catches schema drift
- Define schemas as classes (`pa.DataFrameModel`) for readability and reuse
- Validate at pipeline boundaries — input and output of each stage
- Use `nullable=True` for optional columns — default is non-nullable
- Save schemas as YAML — enables schema sharing between teams
- Use custom checks for business logic — built-in checks cover ranges and types

## Common Mistakes

- **Not using `lazy=True`**: default stops at the first error. You miss other issues in the same run.
- **Forgetting `coerce=True`**: CSV data comes as strings. Without coercion, type checks fail.
- **Not setting `strict=True`**: extra columns pass silently. Use strict mode to catch schema drift.
- **Validating only at the end**: errors propagate through the pipeline. Validate at each stage boundary.
- **Using element-wise checks for aggregate validations**: use `element_wise=False` for checks that operate on the whole series (mean, std, count).

## FAQ

### What is the difference between Pandera and Great Expectations?

Pandera is lightweight and code-first — you define schemas in Python. Great Expectations is heavier and config-first — you define expectations in JSON/YAML. Use Pandera for pipeline validation, Great Expectations for data profiling and reporting.

### Can I use Pandera with Polars?

Yes. Use `pandera.polars` module and `pandera.typing.polars.Series`. The API is the same as the pandas version.

### Does Pandera support nullable columns?

Yes. Set `nullable=True` in `Column()` or `Field()`. By default, columns are non-nullable.

### How do I validate a subset of columns?

Use `strict=False` (default) and only specify the columns you want to validate. Extra columns are ignored.

### Can I generate test data from a schema?

Yes. Use `schema.example(size=10)` to generate a sample DataFrame that passes validation:

```python
sample = OrderSchema.example(size=5)
print(sample)
```
