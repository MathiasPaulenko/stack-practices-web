---
contentType: recipes
slug: generate-pdf-report-python
title: "Generar Reportes PDF con Python"
description: "Cómo crear documentos PDF con estilos a partir de datos usando ReportLab y fpdf2 en Python."
metaDescription: "Genera reportes PDF en Python con ReportLab y fpdf2. Crea documentos con estilos, tablas y gráficos desde datos con ejemplos de código."
difficulty: intermediate
topics:
  - data
tags:
  - pdf
  - python
  - reportlab
  - fpdf
  - data-processing
  - reports
relatedResources:
  - /recipes/convert-csv-to-json
  - /recipes/convert-json-to-csv
  - /recipes/merge-json-files
  - /recipes/parse-csv-files
  - /recipes/parse-csv-python-pandas
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Genera reportes PDF en Python con ReportLab y fpdf2. Crea documentos con estilos, tablas y gráficos desde datos con ejemplos de código."
  keywords:
    - generar pdf python
    - reportlab tabla
    - fpdf2 python
    - reportes pdf datos
    - python pdf generation
---
## Visión General

Generar reportes PDF a partir de datos es un requerimiento común para facturas, dashboards de analytics y reportes automatizados. Python tiene dos librerías principales para esto: ReportLab (con muchas funciones, control de bajo nivel) y fpdf2 (ligero, API más simple). Esta recipe cubre ambos enfoques con ejemplos prácticos.

## Cuándo Usar

- Necesitas generar facturas, recibos o reportes financieros
- Estás construyendo pipelines de reportes automatizados (resúmenes diarios/semanales)
- Necesitas exportar tablas de datos con formato a PDF
- Quieres crear certificados o documentos imprimibles desde plantillas

## Solución

### PDF básico con fpdf2

```python
from fpdf import FPDF

pdf = FPDF()
pdf.add_page()
pdf.set_font("Helvetica", size=12)

pdf.cell(200, 10, text="Sales Report", new_x="LMARGIN", new_y="NEXT", align="C")
pdf.ln(10)

pdf.cell(200, 10, text="Total Revenue: $15,430", new_x="LMARGIN", new_y="NEXT")
pdf.cell(200, 10, text="Orders: 247", new_x="LMARGIN", new_y="NEXT")

pdf.output("report.pdf")
```

### PDF con estilos usando ReportLab

```python
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table
from reportlab.lib import colors

doc = SimpleDocTemplate("report.pdf", pagesize=A4, topMargin=2*cm, bottomMargin=2*cm)

styles = getSampleStyleSheet()
title_style = ParagraphStyle("CustomTitle", parent=styles["Title"], fontSize=18, textColor=colors.HexColor("#1a56db"))
body_style = ParagraphStyle("CustomBody", parent=styles["Normal"], fontSize=10, leading=14)

elements = []
elements.append(Paragraph("Monthly Sales Report", title_style))
elements.append(Spacer(1, 0.5 * cm))
elements.append(Paragraph("Generated on 2026-07-01", body_style))
elements.append(Spacer(1, 1 * cm))

# Tabla de datos
data = [
    ["Region", "Orders", "Revenue"],
    ["North", "82", "$5,210"],
    ["South", "65", "$4,180"],
    ["East", "100", "$6,040"],
]

table = Table(data, colWidths=[5*cm, 3*cm, 4*cm])
table.setStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a56db")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 10),
    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
])
elements.append(table)

doc.build(elements)
```

### PDF desde un DataFrame de pandas

```python
import pandas as pd
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
from reportlab.lib import colors

df = pd.read_csv("sales.csv")
df_summary = df.groupby("region")[["orders", "revenue"]].sum().reset_index()

# Convertir DataFrame a lista de listas para ReportLab
table_data = [df_summary.columns.tolist()] + df_summary.values.tolist()

doc = SimpleDocTemplate("sales_summary.pdf", pagesize=A4)
table = Table(table_data)
table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a56db")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
]))
doc.build([table])
```

### Agregar headers y footers

```python
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.units import cm

def add_header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.drawString(2 * cm, 1 * cm, "StackPractices Report")
    canvas.drawRightString(A4[0] - 2 * cm, 1 * cm, f"Page {doc.page}")
    canvas.restoreState()

doc = SimpleDocTemplate("report.pdf", pagesize=A4)
doc.build([Paragraph("Content here", getSampleStyleSheet()["Normal"])], onFirstPage=add_header_footer, onLaterPages=add_header_footer)
```

## Explicación

fpdf2 es más simple y bueno para documentos con mucho texto sin layouts complejos. Usa un enfoque basado en celdas similar a escribir texto en una grilla.

ReportLab usa un sistema basado en flowables. Construyes una lista de elementos (Paragraphs, Tables, Spacers) y el motor maneja saltos de página, wrapping y layout. Esto te da más control pero tiene una curva de aprendizaje más pronunciada.

Para reportes basados en datos, el patrón es: cargar datos con pandas, agregarlos, convertir a lista de listas y alimentar a un Table de ReportLab. Esto te permite ir de CSV a PDF en menos de 30 líneas de código.

## Variantes

| Librería | Complejidad | Mejor Para | Dependencias |
|---------|------------|------------|--------------|
| fpdf2 | Baja | Documentos de texto simples | `pip install fpdf2` |
| ReportLab | Media | Tablas, gráficos, reportes con estilo | `pip install reportlab` |
| WeasyPrint | Media | HTML/CSS a PDF | `pip install weasyprint` |
| matplotlib | Alta | PDFs solo con gráficos | `pip install matplotlib` |

## Pautas

- Usa fpdf2 para facturas simples o reportes de texto. Menos overhead, más rápido de escribir.
- Usa ReportLab cuando necesitas tablas, headers/footers o layouts multi-página.
- Convierte DataFrames a listas antes de pasarlos a Tables de ReportLab para un render limpio.
- Define tamaños de fuente y márgenes explícitamente. Los márgenes default de ReportLab son ajustados.
- Usa `SimpleDocTemplate` para la mayoría de casos. Solo usa `BaseDocTemplate` si necesitas plantillas de página custom.

## Errores Comunes

- Olvidar llamar `pdf.output()` o `doc.build()`. El archivo no se escribe hasta que lo haces.
- Usar fpdf2 para tablas complejas. Le falta styling de tablas; cambia a ReportLab.
- No manejar Unicode. fpdf2 necesita `pdf.set_font("Helvetica")` y puede requerir hints de encoding para texto no latino.
- Hardcodear datos en vez de leer desde una fuente. Construye reportes desde archivos de datos o APIs.
- Ignorar el tamaño de página. A4 y Letter tienen dimensiones distintas; elige uno explícitamente.

## Preguntas Frecuentes

### ¿Cómo agrego imágenes a un PDF?

Con ReportLab, usa `from reportlab.platypus import Image` y agrega `Image("chart.png", width=15*cm, height=8*cm)` a tu lista de elementos.

### ¿Puedo generar PDFs desde HTML en Python?

Sí. WeasyPrint convierte HTML/CSS a PDF con buena fidelidad. Es más pesado que fpdf2 pero maneja layouts complejos bien.

### ¿Cómo agrego números de página?

Usa los callbacks `onFirstPage` y `onLaterPages` en `doc.build()` como se muestra en el ejemplo de header/footer arriba.

### ¿Cómo creo un layout multi-columna?

ReportLab soporta frames y templates via `BaseDocTemplate`. Define múltiples frames en una página y asigna flowables a cada uno. Es más complejo pero da layouts estilo revista.
