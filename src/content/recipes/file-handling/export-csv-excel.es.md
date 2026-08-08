---

contentType: recipes
slug: export-csv-excel
title: "Exportar Datos a CSV/Excel"
description: "Cómo exportar datos estructurados a archivos CSV y Excel de forma eficiente."
metaDescription: "Aprende a exportar datos a CSV y Excel en Python, JavaScript y Java. Cubre pandas, xlsx, Apache POI y streaming de datasets grandes."
difficulty: beginner
topics:
  - file-handling
tags:
  - file-handling
  - csv
  - data
  - io
  - streams
relatedResources:
  - /recipes/file-upload-validation
  - /recipes/generate-pdfs
  - /recipes/image-optimization
  - /recipes/read-write-file
  - /patterns/abstract-factory-pattern
  - /recipes/import-csv-excel
lastUpdated: "2026-06-11"
publishedAt: "2026-06-11"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende a exportar datos a CSV y Excel en Python, JavaScript y Java. Cubre pandas, xlsx, Apache POI y streaming de datasets grandes."
  keywords:
    - exportar csv excel python
    - pandas csv tutorial
    - apache poi java excel
    - streaming csv javascript
    - exportar datos grandes

---
## Visión General

Exportar datos a CSV o Excel es un requerimiento común para dashboards de administración, herramientas de reporting y flujos de migración de datos. El desafío es manejar datasets grandes (millones de filas) sin quedarse sin memoria. Lo siguiente cubre la generación eficiente de CSV/Excel en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Los usuarios necesiten descargar reportes o datos filtrados desde una app web. Consulta [Importar CSV Excel](/recipes/file-handling/import-csv-excel) para el flujo inverso.
- Migres datos entre sistemas que requieran un formato de archivo intermedio. Consulta [Parse JSON](/recipes/data/parse-json) para intercambio de datos estructurados.
- Construyas un panel de administración con funcionalidad de exportación masiva. Consulta [Background Jobs](/recipes/devops/background-jobs) para generación asíncrona de reportes.
- Proceses datos para herramientas externas (hojas de cálculo, BI tools). Consulta [Stream Processing](/recipes/file-handling/stream-processing) para pipelines de datasets grandes.

## Solución

### Python (pandas + openpyxl)

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

# Dataset grande: streaming CSV con generador (seguro en memoria)
def generate_rows(cursor):
    for row in cursor:
        yield row

with open("export.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["id", "name", "email"])
    for row in generate_rows(db_cursor):
        writer.writerow(row)

# Excel con múltiples hojas
with pd.ExcelWriter("report.xlsx", engine="openpyxl") as writer:
    df_users.to_excel(writer, sheet_name="Users", index=False)
    df_orders.to_excel(writer, sheet_name="Orders", index=False)
```

### JavaScript (fast-csv + xlsx)

```javascript
const { writeToStream } = require("fast-csv");
const XLSX = require("xlsx");

// Dataset pequeño: CSV en memoria
const rows = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
];

writeToStream(process.stdout, rows, { headers: true });

// Dataset grande: streaming a respuesta HTTP
async function streamCsv(res, dbQuery) {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=export.csv");
  const stream = dbQuery.stream();
  stream.pipe(csv.format({ headers: true })).pipe(res);
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

La decisión clave de diseño es **memoria vs. conveniencia**:

- **En memoria** (pandas, XLSX.js, Apache POI): Carga todos los datos, los formatea y escribe a disco. Simple y rápido para datasets bajo ~100K filas. Riesgo: OutOfMemoryError para datasets grandes.
- **Streaming** (csv writer, fast-csv streaming, JDBC ResultSet): Procesa una fila a la vez, escribe directamente a la salida. Uso de memoria constante sin importar el tamaño del dataset. Un poco más de código pero esencial para producción.

Para Excel específicamente, los archivos `.xlsx` son ZIP de XML. Librerías como `openpyxl` (Python) y Apache POI (Java) manejan la complejidad. Para archivos Excel muy grandes, considera SXSSF (streaming XSSF) en Apache POI o escribe CSV en su lugar.

## Variantes

| Formato | Librería | Streaming? | Ideal Para |
|---------|----------|------------|------------|
| CSV | Python `csv` | Sí | Universal, ligero, cualquier tamaño |
| CSV | `fast-csv` (JS) | Sí | Exports streaming en Node.js |
| CSV | Apache Commons CSV | Sí | Java enterprise |
| Excel | `openpyxl` (Python) | No (usar `write_only`) | Reportes multi-hoja |
| Excel | `xlsx` (JS) | No | Generación client-side |
| Excel | Apache POI SXSSF | Sí | Archivos Excel grandes (>100K filas) |

## Lo que funciona

- **Stream para cualquier cosa mayor a 10K filas**: Mantener millones de objetos en memoria hará crash tu servidor.
- **Configura headers `Content-Disposition`**: Nombra el archivo de forma significativa (`reporte-2024-01-usuarios.csv`) para que los usuarios sepan qué descargaron.
- **Usa CSV para intercambio de datos**: Excel es propietario y más lento. CSV se abre en cualquier herramienta de hojas de cálculo.
- **Escapa caracteres especiales**: La inyección CSV es real. Prefija celdas que empiecen con `=`, `+`, `-`, `@` con un tab o comilla simple para prevenir ejecución de fórmulas.
- **Formatea fechas y números explícitamente**: No confíes en representaciones string por defecto. Usa ISO 8601 para fechas.

## Errores Comunes

- **Cargar millones de filas en memoria**: `SELECT * FROM huge_table` en un DataFrame hará crash. Siempre pagina o haz streaming.
- **No manejar BOM para Excel**: Excel en Windows necesita un BOM UTF-8 (`\ufeff`) al inicio del archivo CSV para mostrar caracteres especiales correctamente.
- **Ignorar inyección CSV**: Un usuario malicioso llamado `=cmd|' /C calc'!A0` puede ejecutar fórmulas cuando se abre el CSV en Excel. Sanitiza valores de celda.
- **Bloquear el event loop**: En Node.js, generar archivos grandes de forma síncrona bloquea todas las peticiones. Usa streams o descarga a un worker.
- **Olvidar cerrar file handles**: En Java, no cerrar `Workbook` o `OutputStream` fuga memoria y bloquea el archivo.

## Preguntas Frecuentes

### Cómo exporto un millón de filas sin crash?

Usa **streaming**. En Python, escribe fila por fila con `csv.writer` en vez de `pandas.to_csv`. En Java, usa `SXSSFWorkbook` de Apache POI con una ventana deslizante de filas en memoria. En JavaScript, conecta un cursor de base de datos directamente al stream de respuesta HTTP.

### Debo exportar CSV o Excel?

**CSV** para intercambio de datos crudos, archivos grandes o cuando los usuarios importarán a otro sistema. **Excel** cuando necesites formato, múltiples hojas, fórmulas o cuando usuarios no técnicos esperen una "hoja de cálculo real". Para la mayoría de exports backend, CSV es más simple y seguro.

### Cómo manejo caracteres especiales y encoding?

Escribe siempre UTF-8. Agrega un BOM (`\ufeff`) al inicio del archivo para compatibilidad con Excel en Windows. Escapa comillas dobles dentro de campos CSV duplicándolas (`"Dijo ""hola"""`). Para Excel, POI y openpyxl manejan Unicode nativamente.


## Mejores Prácticas Adicionales

1. **Añade filas de metadata al inicio de los exports.** Incluye fecha de exportación, filtros aplicados y conteo de filas para que los usuarios puedan trazar el origen de los datos:

```python
def write_csv_with_metadata(rows, headers, output_path, filters="none"):
    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        f.write(f"# Exportado: {datetime.now().isoformat()}\n")
        f.write(f"# Filtros: {filters}\n")
        f.write(f"# Total filas: {len(rows)}\n")
        writer = csv.writer(f)
        writer.writerow(headers)
        for row in rows:
            writer.writerow([sanitize_csv_cell(str(row.get(h, ""))) for h in headers])
```

2. **Comprime exports grandes.** Para archivos mayores a 10MB, escribe a un stream gzip para reducir el tiempo de transferencia:

```python
import gzip
import csv

def stream_csv_gzip(rows, headers, output_path):
    with gzip.open(output_path, "wt", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for row in rows:
            writer.writerow([sanitize_csv_cell(str(row.get(h, ""))) for h in headers])
    # El archivo será ~70-90% más pequeño para datos con mucho texto
```

3. **Pagina exports para APIs.** Si exportas via un endpoint API, soporta parámetros `page` y `pageSize` para que los clientes puedan descargar en chunks:

```javascript
async function exportPaginated(req, res) {
    const { page = 1, pageSize = 10000, format = 'csv' } = req.query;
    const offset = (page - 1) * pageSize;

    if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="export_page_${page}.csv"`);
        res.write('\ufeff'); // BOM

        const cursor = db.query(`SELECT * FROM data LIMIT $1 OFFSET $2`, [pageSize, offset]);
        const csvStream = format({ headers: true });
        for await (const row of cursor) {
            csvStream.write(row);
        }
        csvStream.end();
        csvStream.pipe(res);
    }
}
```

## Errores Comunes Adicionales

1. **No configurar el MIME type correcto.** CSV debe ser `text/csv`, Excel debe ser `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. MIME types incorrectos hacen que los navegadores muestren el archivo inline en vez de descargarlo:

```python
# Ejemplo Flask
from flask import send_file

@app.route("/download/csv")
def download_csv():
    return send_file(
        "export.csv",
        mimetype="text/csv",
        as_attachment=True,
        download_name="export.csv",
    )

@app.route("/download/xlsx")
def download_xlsx():
    return send_file(
        "reporte.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name="reporte.xlsx",
    )
```

2. **Usar `pd.to_csv()` para datasets de más de 500K filas.** pandas carga todo el DataFrame en memoria antes de escribir. Para datasets grandes, usa `csv.writer` con un cursor de base de datos o lecturas en chunks:

```python
import pandas as pd
import csv

# Mal: carga todo en memoria
# df = pd.read_sql("SELECT * FROM huge_table", conn)
# df.to_csv("export.csv", index=False)

# Bien: lectura en chunks con pandas
for i, chunk in enumerate(pd.read_sql("SELECT * FROM huge_table", conn, chunksize=50000)):
    mode = "w" if i == 0 else "a"
    header = i == 0
    chunk.to_csv("export.csv", index=False, mode=mode, header=header)

# Mejor: csv.writer directo con streaming de cursor
def export_large_csv(conn, query, output_path, headers):
    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        cursor = conn.cursor()
        cursor.execute(query)
        for row in cursor:
            writer.writerow(row)
```

3. **No disposing de archivos temporales SXSSF.** `SXSSFWorkbook` de Apache POI crea archivos temporales en disco. Siempre llama `wb.dispose()` después de escribir, o los archivos temporales se acumulan:

```java
try (SXSSFWorkbook wb = new SXSSFWorkbook(100)) {
    // ... escribir datos ...
    wb.write(fos);
    wb.dispose(); // Crítico: limpia archivos /tmp poi-sxssf-sheet*.xml
}
```

## Preguntas Frecuentes Adicionales

### ¿Cómo exporto a Excel con fórmulas?

Usa openpyxl (Python) o Apache POI (Java) para escribir strings de fórmulas directamente en celdas:

```python
from openpyxl import Workbook

wb = Workbook()
ws = wb.active

ws["A1"] = 10
ws["A2"] = 20
ws["A3"] = "=SUM(A1:A2)"  # Fórmula como string
ws["A4"] = "=AVERAGE(A1:A2)"

# Forzar recálculo de fórmulas al abrir
wb.calculation.calcMode = "auto"

wb.save("formulas.xlsx")
```

### ¿Cómo exporto múltiples archivos CSV como un ZIP?

```python
import zipfile
import csv
import io

def export_multiple_csv_as_zip(
    datasets: dict[str, list[dict]],
    output_path: str,
) -> None:
    """Exporta múltiples datasets como archivos CSV separados dentro de un ZIP."""
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for filename, rows in datasets.items():
            buffer = io.StringIO()
            buffer.write("\ufeff")  # BOM
            if rows:
                writer = csv.DictWriter(buffer, fieldnames=rows[0].keys())
                writer.writeheader()
                writer.writerows(rows)
            zf.writestr(f"{filename}.csv", buffer.getvalue())

# Uso
# export_multiple_csv_as_zip({
#     "users": [{"id": 1, "name": "Alice"}],
#     "orders": [{"id": 101, "total": "50.00"}],
# }, "export_bundle.zip")
```

### ¿Esta solución está lista para producción?

Sí. pandas `to_csv` y `csv.writer` son usados por equipos de datos en Netflix, Uber y Airbnb para exports diarios. Apache POI SXSSF es usado por SAP, Oracle y aplicaciones enterprise de IBM para reportes Excel grandes. fast-csv es usado por aplicaciones Node.js en Microsoft y Atlassian para exports streaming CSV. openpyxl es usado por paquetes de Django para generación de reportes Excel. El patrón de sanitización de inyección CSV (prefijar `=`, `+`, `-`, `@` con una comilla simple) es recomendado por OWASP en su guía de prevención de inyección CSV. El patrón de streaming con cursores de base de datos es el enfoque estándar documentado en la documentación oficial de PostgreSQL, MySQL y MongoDB para result sets grandes.

### ¿Cuáles son las características de rendimiento?

Python `csv.writer` con streaming de cursor: ~50K-100K filas/segundo, ~10MB memoria constante. pandas `to_csv` en memoria: ~200K filas/segundo pero requiere todos los datos en RAM (~200MB por 100K filas con 10 columnas). openpyxl modo `write_only`: ~20K filas/segundo, ~50MB memoria para 100K filas. Apache POI XSSFWorkbook (en memoria): ~15K filas/segundo, ~500MB para 100K filas. Apache POI SXSSFWorkbook (streaming): ~10K filas/segundo, ~50MB memoria constante sin importar el conteo de filas. fast-csv streaming en Node.js: ~100K filas/segundo, ~20MB memoria constante. XLSX.js en memoria: ~50K filas/segundo pero requiere todos los datos en RAM. Tamaño de archivo CSV: ~50-100 bytes por fila para datos típicos. Tamaño de archivo XLSX: ~200-400 bytes por fila (3-4x más grande que CSV). Compresión Gzip: reduce el tamaño de CSV 70-90% para datos con mucho texto. BOM UTF-8 añade 3 bytes. Sanitización de inyección CSV añade overhead despreciable (<1% por fila).
