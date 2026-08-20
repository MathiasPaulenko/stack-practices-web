---
contentType: recipes
slug: export-csv-excel
title: "Exportar Datos a CSV y Excel"
description: "Cómo exportar datos estructurados a archivos CSV y Excel de forma eficiente."
metaDescription: "Aprendé a exportar datos a CSV y Excel en Python, JavaScript y Java. Cubre pandas, xlsx, Apache POI y streaming para datasets grandes."
difficulty: beginner
topics:
  - file-handling
  - data
tags:
  - file-handling
  - csv
  - excel
  - data
  - python
  - javascript
  - java
  - export
  - streaming
relatedResources:
  - /recipes/import-csv-excel
  - /recipes/parse-csv-files
  - /recipes/file-upload-validation
  - /recipes/background-jobs
  - /recipes/stream-processing
  - /recipes/read-write-file
lastUpdated: "2026-08-19"
publishedAt: "2026-06-11"
author: Mathias Paulenko
seo:
  metaDescription: "Aprendé a exportar datos a CSV y Excel en Python, JavaScript y Java. Cubre pandas, xlsx, Apache POI y streaming para datasets grandes."
  keywords:
    - exportar csv excel python
    - pandas csv tutorial
    - apache poi java excel
    - streaming csv javascript
    - exportar datos grandes
---

## Visión General

Exportar a CSV o Excel es algo que casi todo dashboard de administración o
herramienta de reporting necesita. La parte complicada es manejar datasets
grandes sin quedarse sin memoria. Esta receta cubre generación eficiente de
CSV/Excel en Python, JavaScript y Java.

## Cuándo Usar

- Los usuarios necesitan descargar reportes o datos filtrados desde una app web.
- Migrás datos entre sistemas y necesitás un formato de archivo intermedio.
- Construís un panel de administración con exportación masiva.
- Procesás datos para hojas de cálculo, BI u otras apps externas.

### Cuándo evitarlo

- Necesitás una respuesta de API en tiempo real. El streaming de archivos
  bloquea o complica el request.
- El dataset entra en memoria y solo necesitás una exportación puntual. Un
  script simple alcanza.
- Necesitás un reporte con gráficos y visuales. Usá una librería de reporting.

## Solución

### Python (pandas y csv)

```python
import csv
import pandas as pd

# Dataset pequeño: pandas a CSV
users = [
    {"id": 1, "name": "Alice", "email": "alice@example.com"},
    {"id": 2, "name": "Bob", "email": "bob@example.com"},
]
df = pd.DataFrame(users)
df.to_csv("users.csv", index=False)

# Dataset grande: streaming CSV con un generador
def generate_rows(cursor):
    for row in cursor:
        yield row

with open("export.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["id", "name", "email"])
    for row in generate_rows(db_cursor):
        writer.writerow(row)

# Excel con múltiples hojas
with pd.ExcelWriter("report.xlsx", engine="openpyxl") as writer:
    df.to_excel(writer, sheet_name="Users", index=False)
```

### JavaScript (fast-csv y xlsx)

```javascript
const { format } = require("fast-csv");
const XLSX = require("xlsx");

const rows = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
];

// Dataset pequeño: CSV en memoria
format.write(rows, { headers: true }).pipe(process.stdout);

// Dataset grande: streaming a respuesta HTTP
async function streamCsv(res, dbQuery) {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=export.csv");
  const stream = dbQuery.stream();
  stream.pipe(format({ headers: true })).pipe(res);
}

// Generación Excel
const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Users");
XLSX.writeFile(wb, "users.xlsx");
```

### Java (Apache Commons CSV + Apache POI)

```java
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.*;
import java.nio.file.*;

public class Exporter {

    public void exportCsv(Iterable<Iterable<String>> rows, Path path) throws IOException {
        try (BufferedWriter writer = Files.newBufferedWriter(path);
             CSVPrinter printer = new CSVPrinter(writer, CSVFormat.DEFAULT.withHeader("id", "name", "email"))) {
            for (Iterable<String> row : rows) {
                printer.printRecord(row);
            }
        }
    }

    public void exportExcel(Iterable<Iterable<String>> rows, Path path) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Users");
            int rowNum = 0;
            for (Iterable<String> rowData : rows) {
                Row row = sheet.createRow(rowNum++);
                int colNum = 0;
                for (String cellData : rowData) {
                    row.createCell(colNum++).setCellValue(cellData);
                }
            }
            workbook.write(Files.newOutputStream(path));
        }
    }
}
```

## Explicación

La decisión central es **memoria vs. conveniencia**:

| Enfoque | Cómo funciona | Ideal para |
| --- | --- | --- |
| **En memoria** | Carga todos los datos, los formatea y escribe a disco | Datasets menores a ~100K filas |
| **Streaming** | Procesa una fila a la vez y escribe directamente | Datasets grandes o ilimitados |

CSV es texto plano y fácil de stream. Los `.xlsx` son archivos ZIP con XML,
así que `openpyxl` y Apache POI los construyen en memoria o con ventanas
deslizantes. Para archivos Excel muy grandes usá Apache POI `SXSSF` o escribí
CSV y dejá que el usuario lo abra en Excel.

## Variantes

| Formato | Librería | Streaming | Ideal para |
| --- | --- | --- | --- |
| CSV | Python `csv` | Sí | Universal, liviano, cualquier tamaño |
| CSV | `fast-csv` (JS) | Sí | Exports streaming en Node.js |
| CSV | Apache Commons CSV | Sí | Java enterprise |
| Excel | `openpyxl` (Python) | Parcial (`write_only`) | Reportes multi-hoja |
| Excel | `xlsx` (JS) | No | Generación del lado del cliente |
| Excel | Apache POI SXSSF | Sí | Archivos Excel grandes (>100K filas) |

## Mejores Prácticas

- Stream anything que supere 10K filas. Mantener millones de objetos en memoria
  crashea.
- Seteá un nombre significativo en `Content-Disposition`, como
  `report-2024-01-users.csv`.
- Elegí CSV para intercambio de datos. Excel es más lento y propietario.
- Sanitizá celdas que empiecen con `=`, `+`, `-` o `@` para prevenir CSV
  injection. Anteponé un tab o una comilla simple.
- Formateá fechas y números explícitamente. Usá ISO 8601 para los valores de
  fecha.
- Agregá un UTF-8 BOM (`\ufeff`) al inicio de CSV para Excel en Windows.
- Cerrá los file handles y descartá los archivos temporales de `SXSSFWorkbook`.

## Errores Comunes

- Cargar millones de filas en memoria de una. `SELECT * FROM huge_table` en un
  DataFrame crashea. Stream o paginá.
- Olvidar el BOM para Excel en Windows. Los caracteres especiales se ven mal.
- Ignorar CSV injection. Un valor como `=cmd|' /C calc'!A0` puede ejecutar una
  fórmula en Excel.
- Bloquear el event loop de Node.js. Generá archivos grandes de forma
  asíncrona o en un worker.
- No cerrar `Workbook` u `OutputStream` en Java, lo que fuga memoria y bloquea
  archivos.

## FAQ

### ¿Cómo exporto un millón de filas sin crashear?

Usá streaming. En Python escribí una fila a la vez con `csv.writer`. En Java
usá Apache POI `SXSSFWorkbook` con ventana deslizante. En JavaScript pipeá un
cursor a la respuesta HTTP.

### ¿Debería exportar CSV o Excel?

Usá CSV para intercambio de datos, archivos grandes o cuando el usuario va a
importar en otro sistema. Usá Excel cuando necesitás formato, varias hojas,
fórmulas o usuarios no técnicos esperen una hoja de cálculo.

### ¿Cómo manejo caracteres especiales y encoding?

Siempre escribí UTF-8. Agregá un BOM (`\ufeff`) al inicio para Excel en Windows.
Doblá las comillas dobles dentro de los campos CSV. Para Excel, `openpyxl` y POI
manejan Unicode nativamente.

### ¿Cómo exporto varios CSV como ZIP?

```python
import zipfile
import csv
import io

def export_csv_zip(datasets, output_path):
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for filename, rows in datasets.items():
            buffer = io.StringIO()
            if rows:
                writer = csv.DictWriter(buffer, fieldnames=rows[0].keys())
                writer.writeheader()
                writer.writerows(rows)
            zf.writestr(f"{filename}.csv", buffer.getvalue())
```

### ¿Cómo exporto a Excel con fórmulas?

Usá `openpyxl` (Python) o Apache POI (Java) para escribir fórmulas como strings
en celdas. En Python:

```python
from openpyxl import Workbook

wb = Workbook()
ws = wb.active
ws["A1"] = 10
ws["A2"] = 20
ws["A3"] = "=SUM(A1:A2)"
wb.calculation.calcMode = "auto"
wb.save("formulas.xlsx")
```

### ¿Cuáles son las características de rendimiento?

Python `csv.writer` con cursor: ~50K-100K filas/segundo y memoria constante.
pandas `to_csv`: ~200K filas/segundo pero necesita todos los datos en RAM.
Apache POI `SXSSFWorkbook`: ~10K filas/segundo y ~50 MB constantes. `fast-csv`
en Node.js: ~100K filas/segundo y ~20 MB. Los archivos CSV suelen ser 3-4x más
chicos que XLSX.
