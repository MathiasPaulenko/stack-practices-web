---
contentType: recipes
slug: parse-csv-python-pandas
title: "Leer Archivos CSV con Python y Pandas"
description: "Cómo leer, filtrar y transformar archivos CSV grandes usando Python pandas y el módulo csv."
metaDescription: "Aprende a leer CSV en Python con pandas y el módulo csv. Filtra y transforma archivos CSV grandes con ejemplos de código prácticos."
difficulty: beginner
topics:
  - data
tags:
  - csv
  - pandas
  - python
  - data-processing
  - file-handling
relatedResources:
  - /recipes/convert-csv-to-json
  - /recipes/convert-json-to-csv
  - /recipes/parse-csv-files
  - /recipes/merge-json-files
  - /recipes/parse-xml-files
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Aprende a leer CSV en Python con pandas y el módulo csv. Filtra y transforma archivos CSV grandes con ejemplos de código prácticos."
  keywords:
    - csv python
    - pandas read_csv
    - procesamiento csv
    - lectura archivos csv
    - python data processing
---
## Visión General

CSV es el formato más común para intercambio de datos tabulares. Python tiene dos enfoques principales para parsear CSV: el módulo `csv` integrado para tareas simples y pandas para cualquier cosa que involucre filtrado, agregación o datasets grandes. Esta recipe cubre ambos, con guía sobre cuándo usar cada uno.

## Cuándo Usar

- Necesitas leer archivos CSV exportados desde bases de datos, hojas de cálculo o APIs
- Estás filtrando o transformando datos tabulares antes de cargarlos a otro destino
- Trabajas con archivos demasiado grandes para la memoria y necesitas procesamiento por chunks
- Necesitas manejar archivos CSV con quoting inconsistente o problemas de encoding

## Solución

### Parseo básico con el módulo csv

```python
import csv

with open("data.csv", newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        print(row["name"], row["email"])
```

### Leer CSV con pandas

```python
import pandas as pd

df = pd.read_csv("data.csv")
print(df.head())
print(df.columns)
print(df.shape)
```

### Filtrar y transformar

```python
import pandas as pd

df = pd.read_csv("sales.csv")

# Filtrar filas donde revenue > 1000
high_value = df[df["revenue"] > 1000]

# Agrupar por región y sumar
by_region = df.groupby("region")["revenue"].sum().reset_index()

# Agregar columna calculada
df["margin"] = df["revenue"] - df["cost"]

# Exportar de vuelta a CSV
df.to_csv("sales_processed.csv", index=False)
```

### Procesamiento por chunks para archivos grandes

```python
import pandas as pd

chunk_size = 10000
total = 0

for chunk in pd.read_csv("large_file.csv", chunksize=chunk_size):
    total += chunk["revenue"].sum()

print(f"Total revenue: {total}")
```

### Manejar problemas de encoding

```python
import pandas as pd

# Probar encodings comunes si UTF-8 falla
for encoding in ["utf-8", "latin-1", "cp1252"]:
    try:
        df = pd.read_csv("data.csv", encoding=encoding)
        break
    except UnicodeDecodeError:
        continue
```

## Explicación

El módulo `csv` es ligero y eficiente en memoria porque lee una fila a la vez. Úsalo para tareas simples donde solo necesitas iterar sobre filas.

pandas carga el archivo completo en un DataFrame (en memoria). Esto te da operaciones vectorizadas, filtrado, agrupación y joins. Para archivos más grandes que la RAM, usa `chunksize` para procesar en lotes.

Parámetros clave en `read_csv`:
- `sep` — delimitador (default `,`, pero `\t` para TSV)
- `encoding` — encoding del archivo (prueba `latin-1` si UTF-8 falla)
- `dtype` — especifica tipos de columna para evitar que pandas adivine mal
- `parse_dates` — parsea columnas de fecha automáticamente
- `na_values` — strings personalizados a tratar como NaN

## Variantes

| Enfoque | Librería | Memoria | Usar Cuando |
|----------|---------|---------|-------------|
| DictReader | `csv` (stdlib) | Baja | Iteración simple de filas |
| pandas read_csv | `pandas` | Alta | Filtrado, agrupación, joins |
| Chunked read | `pandas` | Limitada | Archivos más grandes que RAM |
| Dask | `dask.dataframe` | Disco | Archivos > 10GB, procesamiento paralelo |

## Pautas

- Especifica `encoding="utf-8"` explícitamente. No confíes en defaults del sistema.
- Usa `dtype` para evitar que pandas infiera tipos incorrectos en archivos grandes.
- Activa `low_memory=False` si recibes warnings de dtype en columnas mixtas.
- Usa `chunksize` para archivos above 500MB para evitar presión de memoria.
- Limpia espacios en nombres de columna con `df.columns = df.columns.str.strip()`.

## Errores Comunes

- Olvidar `newline=""` en `open()` con el módulo `csv` en Windows. Causa filas en blanco extra.
- Dejar que pandas infiera dtypes en columnas mixtas. Puede convertir strings a NaN silenciosamente.
- No manejar encoding. Archivos de sistemas antiguos suelen usar `latin-1` o `cp1252`.
- Cargar archivos enteros en memoria cuando procesamiento por chunks funcionaría.
- Ignorar problemas de quoting. Usa `quoting=csv.QUOTE_ALL` si los campos contienen comas.

## Preguntas Frecuentes

### ¿Cómo leo un CSV sin headers?

Pasa `header=None` a `read_csv`, o usa `csv.reader` en vez de `csv.DictReader`.

### ¿Cómo manejo archivos CSV con millones de filas?

Usa `chunksize` en pandas, o cambia a `polars` o `dask` para procesamiento out-of-core. Polars es a menudo 5-10x más rápido que pandas en archivos grandes.

### ¿Cómo leo solo columnas específicas?

Pasa `usecols=["name", "email"]` a `read_csv`. Esto ahorra memoria cuando el archivo tiene muchas columnas que no necesitas.

### ¿Cuál es la diferencia entre read_csv y read_table?

Nada significativo. `read_table` usa `sep="\t"` por defecto; `read_csv` usa `sep=","`. Son alias en lo demás.
