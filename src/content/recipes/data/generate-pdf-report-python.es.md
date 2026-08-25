---
contentType: recipes
slug: generate-pdf-report-python
title: "Generar Reportes PDF en Python: Guía de ReportLab y fpdf2"
description: "Crea documentos PDF con estilos a partir de datos usando ReportLab y fpdf2 en Python."
metaDescription: "Genera reportes PDF en Python con ReportLab y fpdf2. Tablas, gráficos, documentos con estilos desde pandas DataFrames, headers, footers y generación en lote."
difficulty: intermediate
topics:
  - data
tags:
  - pdf
  - python
  - reportlab
  - fpdf2
  - data-processing
  - report
  - pandas
relatedResources:
  - /recipes/parse-csv-python-pandas
  - /recipes/python-excel-read-write
  - /recipes/convert-csv-to-json
  - /recipes/convert-json-to-csv
  - /recipes/python-generate-qr-code
  - /recipes/parse-csv-files
lastUpdated: "2026-08-25"
publishedAt: "2026-07-01"
author: Mathias Paulenko
seo:
  metaDescription: "Genera reportes PDF en Python con ReportLab y fpdf2. Tablas, gráficos, documentos con estilos desde pandas DataFrames, headers, footers y generación en lote."
  keywords:
    - generar pdf python
    - reportlab tabla
    - fpdf2 python
    - reportes pdf datos
    - python pdf generation
    - pandas
---

## Visión General

La mayoría de los equipos termina necesitando convertir datos en un PDF: una
factura, un resumen semanal de ventas o un certificado. Python maneja esto bien
con dos librerías principales: ReportLab, que da control completo sobre el
layout, y fpdf2, que es más liviana y rápida de empezar a usar. Esta receta cubre
ambas con ejemplos funcionales.

## Cuándo Usar

Usá estas librerías cuando necesites generar facturas, recibos o reportes
financieros; construir pipelines de reportes automatizados como resúmenes diarios
o semanales; exportar tablas de datos con formato a PDF; o crear certificados y
documentos imprimibles a partir de plantillas.

## Solución

### PDF básico con fpdf2

```python
from fpdf import FPDF

pdf = FPDF()
pdf.add_page()
pdf.set_font("Helvetica", size=12)

pdf.cell(200, 10, txt="Sales Report", new_x="LMARGIN", new_y="NEXT", align="C")
pdf.ln(10)

pdf.cell(200, 10, txt="Total Revenue: $15,430", new_x="LMARGIN", new_y="NEXT")
pdf.cell(200, 10, txt="Orders: 247", new_x="LMARGIN", new_y="NEXT")

pdf.output("report.pdf")
```

### PDF con estilos usando ReportLab

```python
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table
from reportlab.lib import colors

doc = SimpleDocTemplate(
    "report.pdf",
    pagesize=A4,
    topMargin=2 * cm,
    bottomMargin=2 * cm
)

styles = getSampleStyleSheet()
title_style = ParagraphStyle(
    "CustomTitle",
    parent=styles["Title"],
    fontSize=18,
    textColor=colors.HexColor("#1a56db")
)
body_style = ParagraphStyle(
    "CustomBody",
    parent=styles["Normal"],
    fontSize=10,
    leading=14
)

elements = [
    Paragraph("Monthly Sales Report", title_style),
    Spacer(1, 0.5 * cm),
    Paragraph("Generated on 2026-07-01", body_style),
    Spacer(1, 1 * cm),
]

data = [
    ["Region", "Orders", "Revenue"],
    ["North", "82", "$5,210"],
    ["South", "65", "$4,180"],
    ["East", "100", "$6,040"],
]

table = Table(data, colWidths=[5 * cm, 3 * cm, 4 * cm])
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

### Agregar encabezado y pie de página

```python
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm

def add_header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.drawString(2 * cm, 1 * cm, "StackPractices Report")
    canvas.drawRightString(
        A4[0] - 2 * cm,
        1 * cm,
        f"Page {doc.page}"
    )
    canvas.restoreState()

doc = SimpleDocTemplate("report.pdf", pagesize=A4)
content = Paragraph("Content here", getSampleStyleSheet()["Normal"])
doc.build(
    [content],
    onFirstPage=add_header_footer,
    onLaterPages=add_header_footer
)
```

### Agregar un gráfico

```python
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Image, Spacer
from reportlab.lib.units import cm

# Renderizar el gráfico a un archivo PNG
fig, ax = plt.subplots(figsize=(6, 3))
ax.bar(["North", "South", "East"], [5210, 4180, 6040])
ax.set_title("Revenue by Region")
fig.savefig("chart.png", format="png", bbox_inches="tight")
plt.close(fig)

doc = SimpleDocTemplate("report_with_chart.pdf", pagesize=A4)
img = Image("chart.png", width=15 * cm, height=7 * cm)
doc.build([img, Spacer(1, 1 * cm)])
```

## Explicación

fpdf2 es más chica y sirve para documentos con mucho texto sin layouts complejos.
Distribuye el contenido a través de celdas, similar a escribir texto en una
grilla.

ReportLab usa un sistema basado en flowables. Construís una lista de elementos —
Paragraphs, Tables, Spacers, Images — y el motor se encarga de saltos de página,
wrapping y layout. Ese poder extra también hace que la curva de aprendizaje sea
más pronunciada.

Para reportes basados en datos, el patrón habitual es: cargar datos con pandas,
agregarlos, convertirlos a una lista de listas y alimentar un Table de
ReportLab. Si los datos vienen de una hoja de cálculo, consultá
[Python Excel Read Write](/recipes/python-excel-read-write/) para la etapa de
extracción. Para reportes con muchos gráficos, renderizá el gráfico con
matplotlib y embebelo como imagen en el PDF.

## Variantes

Elegí la librería según la complejidad del documento. Para facturas o texto de
una sola página, fpdf2 (`pip install fpdf2`) suele ser suficiente. Para tablas,
encabezados, pies de página o reportes multi-página con estilo, usá ReportLab
(`pip install reportlab`). Para embeber gráficos renderizados con matplotlib,
combiná las dos (`pip install matplotlib reportlab`). Si el reporte ya está
armado como HTML y CSS, WeasyPrint (`pip install weasyprint`) lo renderiza
directamente a PDF.

## Mejores Prácticas

- Para facturas simples o reportes de texto, fpdf2 suele ser suficiente. Necesita
  menos código y menos dependencias que ReportLab.
- Usá ReportLab cuando necesites tablas, encabezados, pies de página o layouts de
  varias páginas.
- Convertí DataFrames a listas antes de pasarlos a Tables de ReportLab para un
  render limpio.
- Definí tamaños de fuente y márgenes explícitamente. Los márgenes default de
  ReportLab son ajustados.
- Usá `SimpleDocTemplate` para la mayoría de los casos. Solo recurrí a
  `BaseDocTemplate` si necesitás plantillas de página personalizadas.
- Embebebé gráficos como imágenes cuando necesites visualizaciones; renderizar
  directamente en el canvas del PDF es más difícil de mantener.

## Errores Comunes

- Olvidar llamar `pdf.output()` o `doc.build()`. No se escribe nada hasta que lo
  hagás.
- Usar fpdf2 para tablas complejas. Le falta estilo de tablas; cambiá a
  ReportLab.
- No manejar Unicode. fpdf2 necesita una fuente que realmente contenga los
  caracteres que usás. Para texto no latino, cargá una fuente TrueType a través de
  `pdf.add_font()` y activala con `pdf.set_font()`.
- Hardcodear datos en lugar de leer desde una fuente. Construí reportes desde
  archivos de datos o APIs.
- Ignorar el tamaño de página. A4 y Letter tienen dimensiones distintas; elegí
  uno explícitamente.
- Olvidar cerrar o hacer `seek` del buffer de matplotlib antes de embeber la
  imagen.

## Preguntas Frecuentes

### ¿Cómo agrego imágenes a un PDF?

En ReportLab, importá `Image` y agregá `Image("chart.png", width=15*cm,
height=8*cm)` a tu lista de elementos. En fpdf2, llamá `pdf.image("chart.png",
x=10, y=20, w=100)` para colocar la imagen.

### ¿Puedo generar PDFs desde HTML en Python?

Sí. WeasyPrint convierte HTML y CSS a PDF con buena fidelidad. Es más pesado que
fpdf2 pero maneja layouts complejos bien.

### ¿Cómo agrego números de página?

Usá los callbacks `onFirstPage` y `onLaterPages` de `doc.build()`, como se muestra
en el ejemplo de encabezado y pie de página.

### ¿Cómo creo un layout de varias columnas?

ReportLab soporta frames y templates a través de `BaseDocTemplate`. Definí
varios frames en una página y asigná flowables a cada uno. Es más complejo pero
permite layouts estilo revista.

### ¿Puedo usar una fuente custom con fpdf2?

Sí. Descargá un archivo TTF, llamá `pdf.add_font("DejaVu", "",
"DejaVuSans.ttf")`, luego `pdf.set_font("DejaVu", size=12)`. Esta es la forma más
simple de soportar Unicode y scripts no latinos.

### ¿Cómo repito un encabezado en cada página?

Usá un `PageTemplate` con un `Frame` y dibujá el encabezado en el callback
`onPage` de `doc.build()`. Alternativamente, usá `SimpleDocTemplate` con
`onFirstPage` y `onLaterPages` como una solución liviana.
