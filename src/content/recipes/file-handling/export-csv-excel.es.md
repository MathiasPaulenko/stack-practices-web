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
  - csv
  - data
  - excel
  - export
  - file-handling
  - java
  - javascript
  - pandas
  - python
  - streaming
  - xlsx
relatedResources:
  - /recipes/file-upload-validation
  - /recipes/generate-pdfs
  - /recipes/image-optimization
  - /recipes/read-write-file
  - /patterns/abstract-factory-pattern
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
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

Exportar datos a CSV o Excel es un requerimiento común para dashboards de administración, herramientas de reporting y flujos de migración de datos. El desafío es manejar datasets grandes (millones de filas) sin quedarse sin memoria. Esta receta cubre la generación eficiente de CSV/Excel en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Los usuarios necesiten descargar reportes o datos filtrados desde una app web
- Migres datos entre sistemas que requieran un formato de archivo intermedio
- Construyas un panel de administración con funcionalidad de exportación masiva
- Proceses datos para herramientas externas (hojas de cálculo, BI tools)

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

## Mejores Prácticas

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
