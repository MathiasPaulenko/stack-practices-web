---
contentType: recipes
slug: python-excel-read-write
title: "Leer y Escribir Archivos Excel con Python"
description: "Cómo leer, escribir y formatear hojas de cálculo Excel usando openpyxl y pandas en Python."
metaDescription: "Lee y escribe archivos Excel en Python con openpyxl y pandas. Crea, formatea y manipula hojas de cálculo con ejemplos de código."
difficulty: intermediate
topics:
  - data
tags:
  - excel
  - python
  - openpyxl
  - pandas
  - data-processing
  - spreadsheets
relatedResources:
  - /recipes/parse-csv-python-pandas
  - /recipes/convert-csv-to-json
  - /recipes/convert-json-to-csv
  - /recipes/generate-pdf-report-python
  - /recipes/merge-json-files
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Lee y escribe archivos Excel en Python con openpyxl y pandas. Crea, formatea y manipula hojas de cálculo con ejemplos de código."
  keywords:
    - leer excel python
    - openpyxl formato celdas
    - pandas to_excel
    - escribir xlsx python
    - python excel automation
---
## Visión General

Los archivos Excel (.xlsx) están en todas partes en el mundo empresarial. Python puede leerlos, escribirlos y formatearlos programáticamente usando openpyxl (control a nivel de celda) y pandas (operaciones a nivel de DataFrame). Esta recipe cubre ambos enfoques para tareas comunes como leer hojas, escribir datos, aplicar formato y manejar workbooks con múltiples hojas.

## Cuándo Usar

- Necesitas leer datos de archivos Excel exportados por herramientas empresariales
- Estás generando reportes Excel desde una base de datos o API
- Necesitas formatear celdas (colores, bordes, formatos numéricos) programáticamente
- Estás automatizando un workflow que involucra múltiples hojas Excel

## Solución

### Leer Excel con pandas

```python
import pandas as pd

# Leer una sola hoja
df = pd.read_excel("data.xlsx", sheet_name="Sheet1")
print(df.head())
print(df.columns)

# Leer todas las hojas a un dict de DataFrames
sheets = pd.read_excel("data.xlsx", sheet_name=None)
for name, df in sheets.items():
    print(f"Sheet: {name}, rows: {len(df)}")
```

### Escribir Excel con pandas

```python
import pandas as pd

df = pd.DataFrame({
    "name": ["Alice", "Bob", "Charlie"],
    "score": [85, 92, 78],
})

# Escritura básica
df.to_excel("output.xlsx", index=False, sheet_name="Results")

# Múltiples hojas
with pd.ExcelWriter("report.xlsx") as writer:
    df.to_excel(writer, sheet_name="Summary", index=False)
    df[df["score"] > 80].to_excel(writer, sheet_name="High Scores", index=False)
```

### Control a nivel de celda con openpyxl

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

wb = Workbook()
ws = wb.active
ws.title = "Report"

# Fila de header con estilos
headers = ["Name", "Score", "Grade"]
header_fill = PatternFill(start_color="1a56db", end_color="1a56db", fill_type="solid")
header_font = Font(color="FFFFFF", bold=True)

for col, header in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col, value=header)
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = Alignment(horizontal="center")

# Filas de datos
data = [("Alice", 85, "B"), ("Bob", 92, "A"), ("Charlie", 78, "C")]
for row_idx, (name, score, grade) in enumerate(data, 2):
    ws.cell(row=row_idx, column=1, value=name)
    ws.cell(row=row_idx, column=2, value=score)
    ws.cell(row=row_idx, column=3, value=grade)

# Auto-ajustar columnas
for col in ws.columns:
    max_length = max(len(str(cell.value or "")) for cell in col)
    ws.column_dimensions[col[0].column_letter].width = max_length + 2

wb.save("formatted_report.xlsx")
```

### Leer con openpyxl

```python
from openpyxl import load_workbook

wb = load_workbook("data.xlsx", data_only=True)  # data_only lee valores computados
ws = wb["Sheet1"]

for row in ws.iter_rows(min_row=1, max_row=5, values_only=True):
    print(row)

# Acceder a una celda específica
print(ws["A1"].value)
```

### Agregar fórmulas

```python
from openpyxl import Workbook

wb = Workbook()
ws = wb.active

ws["A1"] = 10
ws["A2"] = 20
ws["A3"] = 30
ws["A4"] = "=SUM(A1:A3)"
ws["A5"] = "=AVERAGE(A1:A3)"

wb.save("formulas.xlsx")
```

## Explicación

pandas usa openpyxl por debajo al leer y escribir archivos .xlsx. Usa pandas para operaciones centradas en datos (filtrado, agrupación, joins) y openpyxl cuando necesitas control a nivel de celda (formato, fórmulas, celdas combinadas, gráficos).

Diferencias clave:
- `pd.read_excel` retorna un DataFrame. Bueno para análisis pero pierde formato.
- `openpyxl.load_workbook` preserva formato y te da objetos celda. Más lento para archivos grandes.
- `pd.ExcelWriter` con `engine="openpyxl"` te permite escribir DataFrames preservando el formato de un workbook existente.

## Variantes

| Librería | Nivel | Mejor Para | Dependencias |
|---------|-------|------------|--------------|
| pandas | DataFrame | Análisis de datos, lectura/escritura masiva | `pandas`, `openpyxl` |
| openpyxl | Celda | Formato, fórmulas, gráficos | `openpyxl` |
| xlsxwriter | Celda | Solo escritura, gráficos, formato condicional | `xlsxwriter` |
| xlrd | Solo lectura | Archivos .xls legacy | `xlrd` |

## Pautas

- Usa pandas para leer y escribir datos. Usa openpyxl para formato y fórmulas.
- Siempre pasa `index=False` a `to_excel` a menos que necesites la columna de índice.
- Usa `data_only=True` con `load_workbook` para leer valores computados en vez de strings de fórmula.
- Define anchos de columna explícitamente. openpyxl no auto-ajusta columnas.
- Usa `pd.ExcelWriter` context manager para escribir múltiples hojas en un archivo.

## Errores Comunes

- Olvidar instalar openpyxl. pandas lo necesita como engine para archivos .xlsx.
- Usar `openpyxl` para archivos grandes (10k+ filas). Es lento; usa pandas para operaciones masivas.
- No pasar `data_only=True` al leer fórmulas. Obtienes el string de fórmula en vez del resultado.
- Sobrescribir un workbook existente con `to_excel`. Reemplaza el archivo; usa `ExcelWriter` con `mode="a"` para agregar.
- Ignorar formatos numéricos. Excel puede mostrar fechas y números distinto a lo que Python espera.

## Preguntas Frecuentes

### ¿Cómo leo un rango específico de celdas?

Con openpyxl, usa `ws.iter_rows(min_row=2, max_row=10, min_col=1, max_col=3, values_only=True)`. Con pandas, usa los parámetros `usecols` y `skiprows`.

### ¿Cómo agrego formato condicional?

Usa `openpyxl.formatting.rule` o `xlsxwriter`. Por ejemplo, color scales y data bars son soportados via `ColorScaleRule` y `DataBarRule`.

### ¿Cómo manejo archivos .xls (legacy)?

Usa `xlrd` para leer y `xlwt` para escribir. pandas los soporta con `engine="xlrd"` y `engine="xlwt"`. Nota que xlrd dejó de soportar .xlsx en la versión 2.0.

### ¿Puedo crear gráficos en Excel con Python?

Sí. `openpyxl.chart` soporta gráficos de barras, líneas y pie. `xlsxwriter` también soporta gráficos con una API similar.
