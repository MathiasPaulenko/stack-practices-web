---

contentType: recipes
slug: import-csv-excel
title: "Importar Datos desde CSV/Excel"
description: "Cómo parsear e importar datos desde archivos CSV y Excel con validación."
metaDescription: "Aprende a importar datos desde CSV y Excel en Python, JavaScript y Java. Cubre pandas, csv-parser, Apache POI y estrategias de validación."
difficulty: beginner
topics:
  - file-handling
tags:
  - file-handling
  - csv
  - io
  - streams
  - files
relatedResources:
  - /recipes/export-csv-excel
  - /recipes/file-upload-validation
  - /recipes/generate-pdfs
  - /recipes/image-optimization
  - /recipes/input-validation
  - /recipes/stream-processing
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a importar datos desde CSV y Excel en Python, JavaScript y Java. Cubre pandas, csv-parser, Apache POI y estrategias de validación."
  keywords:
    - importar csv excel python
    - parsear csv javascript
    - apache poi importar excel
    - validacion datos importados
    - batch insert base datos

---
## Visión General

Importar datos desde CSV o Excel es una funcionalidad estándar de paneles de administración, herramientas de migración de datos y capacidades de actualización masiva. El desafío no es solo parsear el archivo, sino validar cada fila, manejar datos malformados elegantemente e importar archivos grandes sin bloquear el servidor. La solucion a continuacion cubre importación confiable de CSV/Excel en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Los usuarios suban hojas de cálculo para crear o actualizar registros masivamente. Consulta [File Upload Validation](/recipes/file-handling/file-upload-validation) para manejo seguro de subidas.
- Migres datos desde sistemas legacy o proveedores externos. Consulta [Export CSV Excel](/recipes/file-handling/export-csv-excel) para el flujo inverso de migración.
- Construyas pipelines ETL que procesen archivos programados. Consulta [Stream Processing](/recipes/file-handling/stream-processing) para pipelines eficientes en memoria.
- Paneles de administración necesiten una capacidad de "subir e importar". Consulta [Background Jobs](/recipes/devops/background-jobs) para procesamiento asíncrono de imports.

## Solución

### Python (pandas + csv)

```python
import csv
import pandas as pd
from pydantic import BaseModel, ValidationError

# Importación streaming CSV con validación
class UserImport(BaseModel):
    name: str
    email: str
    age: int

def import_users_csv(file_path):
    valid, errors = [], []
    with open(file_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row_num, row in enumerate(reader, start=2):
            try:
                user = UserImport(name=row["name"], email=row["email"], age=int(row["age"]))
                valid.append(user.dict())
            except (ValueError, KeyError, ValidationError) as e:
                errors.append({"row": row_num, "error": str(e)})
    return valid, errors

# Importación Excel con pandas
def import_users_excel(file_path):
    df = pd.read_excel(file_path, sheet_name="Users")
    df = df.dropna()  # Remover filas vacías
    records = df.to_dict("records")
    return records
```

### JavaScript (csv-parser + xlsx)

```javascript
const csv = require("csv-parser");
const fs = require("fs");
const XLSX = require("xlsx");

function importCsv(filePath) {
  return new Promise((resolve, reject) => {
    const valid = [], errors = [];
    let rowNum = 1;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        rowNum++;
        if (!row.name || !row.email) {
          errors.push({ row: rowNum, error: "Missing required field" });
        } else {
          valid.push(row);
        }
      })
      .on("end", () => resolve({ valid, errors }))
      .on("error", reject);
  });
}

function importExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = row[i]));
    return obj;
  });
}
```

### Java (Apache Commons CSV + Apache POI)

```java
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.*;
import java.nio.file.*;
import java.util.*;

public class Importer {

    public List<Map<String, String>> importCsv(Path path) throws IOException {
        List<Map<String, String>> rows = new ArrayList<>();
        try (Reader reader = Files.newBufferedReader(path);
             CSVParser parser = new CSVParser(reader, CSVFormat.DEFAULT.withFirstRecordAsHeader())) {
            for (CSVRecord record : parser) {
                Map<String, String> row = new HashMap<>();
                record.toMap().forEach(row::put);
                rows.add(row);
            }
        }
        return rows;
    }

    public List<Map<String, String>> importExcel(Path path) throws IOException {
        List<Map<String, String>> rows = new ArrayList<>();
        try (Workbook workbook = new XSSFWorkbook(Files.newInputStream(path))) {
            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);
            List<String> headers = new ArrayList<>();
            for (Cell cell : headerRow) {
                headers.add(cell.getStringCellValue());
            }
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                Map<String, String> map = new HashMap<>();
                for (int j = 0; j < headers.size(); j++) {
                    Cell cell = row.getCell(j);
                    map.put(headers.get(j), cell != null ? cell.toString() : "");
                }
                rows.add(map);
            }
        }
        return rows;
    }
}
```

## Explicación

Importar es más difícil que exportar porque **no controlas la entrada**. Los usuarios subirán archivos con:
- Headers faltantes o columnas renombradas
- Tipos de datos incorrectos (texto en columna numérica)
- Filas o columnas en blanco extra
- Encoding incorrecto (Windows-1252 en vez de UTF-8)

El patrón confiable es:
1. **Parsear**: Leer el archivo fila por fila (streaming para archivos grandes)
2. **Validar**: Verificar cada fila contra un esquema (campos requeridos, tipos de datos, rangos)
3. **Colectar errores**: No fallar en la primera fila mala; colecta todos los errores y repórtalos
4. **Insertar en lotes**: Para importaciones a base de datos, inserta en chunks de 1,000 filas dentro de una transacción

## Variantes

| Formato | Librería | Streaming? | Ideal Para |
|---------|----------|------------|------------|
| CSV | Python `csv` | Sí | Archivos pequeños a medianos con validación custom |
| CSV | `csv-parser` (JS) | Sí | Pipeline streaming en Node.js |
| CSV | Apache Commons CSV | Sí | Parsing Java enterprise |
| Excel | `pandas.read_excel` | No | Importaciones rápidas, exploración de datos |
| Excel | `xlsx` (JS) | No | Client-side o importaciones pequeñas en servidor |
| Excel | Apache POI | Sí (event model) | Archivos Excel muy grandes |

## Lo que funciona

- **Valida antes de insertar**: Nunca confíes en archivos subidos por usuarios. Valida cada celda contra tipos y rangos esperados.
- **Reporta todos los errores, no solo el primero**: Los usuarios necesitan arreglar todo de una vez, no trial-and-error fila por fila.
- **Usa transacciones para importaciones a base de datos**: Si alguna fila falla validación, haz rollback del batch completo para evitar importaciones parciales.
- **Soporta múltiples encodings**: Intenta UTF-8 primero, luego fallback a `latin-1` o `cp1252` para archivos legacy de Windows.
- **Proporciona un archivo template**: Da a los usuarios un template descargable con los headers exactos y formato que esperas.

## Errores Comunes

- **Insertar fila por fila**: Statements `INSERT` individuales son 100x más lentos que inserts batch. Usa `executemany` (Python), `bulkCreate` (Sequelize) o JDBC batch inserts.
- **Ignorar problemas de encoding**: Un archivo con caracteres españoles guardado en Windows fallará si fuerzas UTF-8. Detecta o permite especificar el encoding.
- **No manejar filas en blanco**: Los archivos Excel a menudo tienen cientos de filas vacías al final. Filtra filas donde todas las celdas estén vacías.
- **Sin rate limiting en uploads**: Un archivo Excel de 500MB hará crash la mayoría de procesos de importación. Impón tamaños máximos de archivo y usa background jobs para importaciones grandes.
- **Pérdida de datos silenciosa**: Truncar columnas `VARCHAR(255)` sin advertencia pierde datos. Valida restricciones de longitud explícitamente.

## Preguntas Frecuentes

### Cómo manejo un archivo CSV de 1GB?

Nunca lo cargues completamente en memoria. Usa **parsers de streaming** (`csv.reader` en Python, `csv-parser` en Node.js, Apache Commons CSV en Java). Procesa una fila a la vez, valídala e insértala en lotes de 1,000-10,000 filas. Si la importación toma mucho tiempo, descárgala a un background job.

### Debo importar directamente a la base de datos o hacer staging primero?

**Haz staging primero** para cualquier cosa no trivial. Importa a una tabla temporal "staging", valida todo, luego ejecuta un `INSERT INTO ... SELECT` para mover datos limpios a la tabla de producción. Esto permite previsualizar errores, hacer rollback fácilmente y evitar bloquear tablas de producción durante validación.

### Cómo manejo filas duplicadas?

Define una business-key (ej. email o SKU) y usa `INSERT ... ON CONFLICT` (PostgreSQL), `INSERT IGNORE` (MySQL) o `MERGE` (SQL Server, Oracle). Alternativamente, deduplica en memoria usando un `Set` de hashes antes de insertar. Siempre informa al usuario cuántos duplicados fueron encontrados y omitidos.

## Soluciones Avanzadas

### Importación streaming CSV con inserción batch en chunks

```python
import csv
import sqlite3
from typing import Iterator, Any


def stream_csv_to_db(
    file_path: str,
    db_path: str,
    table: str,
    batch_size: int = 1000,
    encoding: str = "utf-8",
) -> dict:
    """Stream un archivo CSV a una base de datos en lotes con validación."""
    stats = {"inserted": 0, "errors": 0, "batches": 0}

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    with open(file_path, newline="", encoding=encoding) as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames

        if not headers:
            raise ValueError("El archivo CSV no tiene fila de encabezado")

        # Crear tabla si no existe
        cols = ", ".join(f'"{h}" TEXT' for h in headers)
        cursor.execute(f'CREATE TABLE IF NOT EXISTS {table} ({cols})')

        batch: list[tuple] = []
        placeholders = ", ".join("?" * len(headers))
        insert_sql = f'INSERT INTO {table} VALUES ({placeholders})'

        for row_num, row in enumerate(reader, start=2):
            try:
                values = tuple(row.get(h, "") for h in headers)
                batch.append(values)
            except Exception as e:
                stats["errors"] += 1
                print(f"Error en fila {row_num}: {e}")
                continue

            if len(batch) >= batch_size:
                cursor.executemany(insert_sql, batch)
                conn.commit()
                stats["inserted"] += len(batch)
                stats["batches"] += 1
                batch.clear()

        # Insertar filas restantes
        if batch:
            cursor.executemany(insert_sql, batch)
            conn.commit()
            stats["inserted"] += len(batch)
            stats["batches"] += 1

    conn.close()
    return stats


# Uso
result = stream_csv_to_db("large_data.csv", "app.db", "users", batch_size=5000)
print(f"Insertadas {result['inserted']} filas en {result['batches']} lotes")
```

### Streaming Excel con Apache POI event model

Para archivos Excel muy grandes (.xlsx), usa el parser SAX basado en eventos de POI para evitar cargar todo el workbook en memoria:

```java
import org.apache.poi.openxml4j.opc.OPCPackage;
import org.apache.poi.xssf.eventusermodel.XSSFReader;
import org.apache.poi.xssf.eventusermodel.XSSFReader.SheetIterator;
import org.apache.poi.xssf.model.SharedStringsTable;
import org.apache.poi.xssf.usermodel.XSSFRichTextString;
import org.xml.sax.*;
import org.xml.sax.helpers.DefaultHandler;
import org.xml.sax.helpers.XMLReaderFactory;

import java.io.InputStream;
import java.util.*;

public class StreamingExcelImporter {

    public List<Map<String, String>> importLargeExcel(String filePath) throws Exception {
        List<Map<String, String>> rows = new ArrayList<>();
        OPCPackage pkg = OPCPackage.open(filePath);
        XSSFReader reader = new XSSFReader(pkg);
        SharedStringsTable sst = new SharedStringsTable();

        SheetIterator sheetIterator = (SheetIterator) reader.getSheetsData();
        while (sheetIterator.hasNext()) {
            try (InputStream sheetStream = sheetIterator.next()) {
                XMLReader parser = XMLReaderFactory.createXMLReader();
                SheetHandler handler = new SheetHandler(sst, rows);
                parser.setContentHandler(handler);
                parser.parse(new InputSource(sheetStream));
            }
        }
        pkg.close();
        return rows;
    }

    static class SheetHandler extends DefaultHandler {
        private final SharedStringsTable sst;
        private final List<Map<String, String>> rows;
        private List<String> headers;
        private Map<String, String> currentRow;
        private String lastCellValue;
        private int currentCol;
        private boolean isHeaderRow;

        SheetHandler(SharedStringsTable sst, List<Map<String, String>> rows) {
            this.sst = sst;
            this.rows = rows;
            this.headers = new ArrayList<>();
            this.currentRow = new LinkedHashMap<>();
            this.currentCol = 0;
            this.isHeaderRow = true;
        }

        @Override
        public void startElement(String uri, String localName, String qName, Attributes attrs) {
            if (qName.equals("c")) {
                String ref = attrs.getValue("r");
                currentCol = 0;
                lastCellValue = "";
            }
        }

        @Override
        public void endElement(String uri, String localName, String qName) {
            if (qName.equals("v")) {
                if (isHeaderRow) {
                    headers.add(lastCellValue);
                } else {
                    currentRow.put(
                        headers.size() > currentCol ? headers.get(currentCol) : "col" + currentCol,
                        lastCellValue
                    );
                }
                currentCol++;
            } else if (qName.equals("row")) {
                if (!isHeaderRow && !currentRow.isEmpty()) {
                    rows.add(new LinkedHashMap<>(currentRow));
                }
                currentRow.clear();
                isHeaderRow = false;
            }
        }

        @Override
        public void characters(char[] ch, int start, int length) {
            lastCellValue = new String(ch, start, length);
        }
    }
}
```

### Detección de encoding con fallback

```python
import csv
from pathlib import Path


def read_csv_with_encoding_detection(file_path: str) -> list[dict]:
    """Prueba múltiples encodings y retorna las filas parseadas."""
    encodings = ["utf-8", "utf-8-sig", "latin-1", "cp1252", "iso-8859-1"]
    path = Path(file_path)

    for enc in encodings:
        try:
            with open(path, newline="", encoding=enc) as f:
                reader = csv.DictReader(f)
                rows = list(reader)
                print(f"Leído correctamente con encoding: {enc}")
                return rows
        except UnicodeDecodeError:
            continue

    raise ValueError(f"No se pudo decodificar {file_path} con ningún encoding conocido")


# Uso: maneja archivos de Windows, macOS y Linux
rows = read_csv_with_encoding_detection("data_from_windows.csv")
```

### Mapeo de columnas y transformación de datos

```python
import csv
from datetime import datetime
from typing import Any, Callable


class ColumnMapper:
    """Mapea columnas CSV origen a esquema destino con transformaciones."""

    def __init__(self):
        self.mappings: dict[str, tuple[str, Callable]] = {}

    def add_mapping(self, source_col: str, target_col: str, transform: Callable = None):
        self.mappings[source_col] = (target_col, transform or (lambda x: x))

    def transform_row(self, row: dict) -> dict:
        result = {}
        for source_col, (target_col, transform) in self.mappings.items():
            value = row.get(source_col, "")
            try:
                result[target_col] = transform(value)
            except (ValueError, TypeError) as e:
                result[target_col] = None
                result[f"_error_{target_col}"] = str(e)
        return result


# Uso: mapear y transformar columnas de un CSV de proveedor
mapper = ColumnMapper()
mapper.add_mapping("First Name", "first_name", str.strip)
mapper.add_mapping("Last Name", "last_name", str.strip)
mapper.add_mapping("Email Address", "email", str.lower)
mapper.add_mapping("Phone", "phone", lambda x: x.replace("-", "").replace(" ", ""))
mapper.add_mapping("Birth Date", "birth_date", lambda x: datetime.strptime(x, "%m/%d/%Y").date())
mapper.add_mapping("Salary", "salary", lambda x: float(x.replace("$", "").replace(",", "")))

with open("vendor_export.csv", newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        transformed = mapper.transform_row(row)
        print(transformed)
```

### Node.js: Streaming CSV con inserción batch en base de datos

```javascript
import csv from 'csv-parser';
import fs from 'fs';
import { Database } from 'better-sqlite3';


async function streamCsvToDb(filePath, dbPath, tableName, batchSize = 1000) {
    const db = new Database(dbPath);
    const stats = { inserted: 0, errors: 0, batches: 0 };
    let batch = [];
    let headers = null;
    let insertStmt = null;

    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('headers', (hdrs) => {
                headers = hdrs;
                const cols = hdrs.map(h => `"${h}" TEXT`).join(', ');
                db.exec(`CREATE TABLE IF NOT EXISTS ${tableName} (${cols})`);
                const placeholders = hdrs.map(() => '?').join(', ');
                insertStmt = db.prepare(
                    `INSERT INTO ${tableName} VALUES (${placeholders})`
                );
            })
            .on('data', (row) => {
                try {
                    const values = headers.map(h => row[h] || '');
                    batch.push(values);

                    if (batch.length >= batchSize) {
                        const tx = db.transaction((rows) => {
                            for (const r of rows) insertStmt.run(...r);
                        });
                        tx(batch);
                        stats.inserted += batch.length;
                        stats.batches++;
                        batch = [];
                    }
                } catch (err) {
                    stats.errors++;
                    console.error(`Error en fila: ${err.message}`);
                }
            })
            .on('end', () => {
                if (batch.length > 0 && insertStmt) {
                    const tx = db.transaction((rows) => {
                        for (const r of rows) insertStmt.run(...r);
                    });
                    tx(batch);
                    stats.inserted += batch.length;
                    stats.batches++;
                }
                db.close();
                resolve(stats);
            })
            .on('error', reject);
    });
}

// Uso
const result = await streamCsvToDb('large.csv', 'app.db', 'users', 5000);
console.log(`Insertadas ${result.inserted} filas en ${result.batches} lotes`);
```

## Mejores Prácticas Adicionales

1. **Usa una tabla staging para validación antes de insertar en producción.** Importa a una tabla temporal, valida todas las filas, luego mueve los datos limpios en una sola transacción:

```sql
-- Paso 1: Importar a staging
CREATE TABLE staging_users (LIKE users);

-- Paso 2: Validar y reportar
SELECT * FROM staging_users WHERE email NOT LIKE '%@%.%';
SELECT COUNT(*) FROM staging_users WHERE name IS NULL OR name = '';

-- Paso 3: Mover datos limpios
INSERT INTO users (name, email, age)
SELECT name, email, age FROM staging_users
WHERE email LIKE '%@%.%' AND name IS NOT NULL AND name != '';

-- Paso 4: Reportar y limpiar
SELECT COUNT(*) AS imported FROM users;
DROP TABLE staging_users;
```

2. **Proporciona templates descargables.** Da a los usuarios un template con los headers exactos, filas de ejemplo y reglas de validación:

```python
import csv
from io import StringIO


def generate_csv_template() -> str:
    """Genera un template CSV con headers y filas de ejemplo."""
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["name", "email", "age", "department"])
    writer.writerow(["Jane Doe", "jane@example.com", "30", "Engineering"])
    writer.writerow(["John Smith", "john@example.com", "25", "Marketing"])
    return output.getvalue()


# Servir como descarga en un framework web
# return Response(generate_csv_template(), mimetype="text/csv",
#                 headers={"Content-Disposition": "attachment; filename=template.csv"})
```

## Errores Comunes Adicionales

1. **No validar nombres de encabezado.** Los usuarios a menudo renombran columnas o cambian capitalización. Normaliza los headers antes de procesar:

```python
import csv


def normalize_headers(headers: list[str]) -> dict[str, str]:
    """Mapea headers de usuario a headers esperados, case-insensitive."""
    expected = {"name", "email", "age", "department"}
    mapping = {}
    for h in headers:
        normalized = h.strip().lower().replace(" ", "_")
        if normalized in expected:
            mapping[h] = normalized
    return mapping


with open("user_upload.csv", newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    header_map = normalize_headers(reader.fieldnames)

    if len(header_map) < len(expected):
        missing = expected - set(header_map.values())
        raise ValueError(f"Columnas requeridas faltantes: {missing}")

    for row in reader:
        normalized_row = {header_map[k]: v for k, v in row.items() if k in header_map}
        # Procesar normalized_row...
```

2. **Truncar datos sin advertencia.** Al insertar en una columna `VARCHAR(255)`, los strings más largos de 255 chars son silenciosamente truncados por algunas bases de datos. Valida la longitud antes de insertar:

```python
MAX_LENGTHS = {
    "name": 100,
    "email": 255,
    "department": 50,
}

def validate_lengths(row: dict) -> list[str]:
    """Verifica campos que exceden la longitud máxima."""
    warnings = []
    for field, max_len in MAX_LENGTHS.items():
        value = row.get(field, "")
        if len(value) > max_len:
            warnings.append(f"{field} excede {max_len} chars (got {len(value)})")
    return warnings
```

## Preguntas Frecuentes Adicionales

### ¿Cómo manejo archivos CSV con diferentes delimitadores?

Detecta el delimitador automáticamente o permite que el usuario lo especifique:

```python
import csv


def detect_delimiter(file_path: str) -> str:
    """Detecta el delimitador más probable en un archivo CSV."""
    with open(file_path, "r", newline="", encoding="utf-8") as f:
        sample = f.read(1024)
        sniffer = csv.Sniffer()
        dialect = sniffer.sniff(sample, delimiters=",;\t|")
        return dialect.delimiter


# Uso
delim = detect_delimiter("data.csv")
print(f"Delimitador detectado: '{delim}'")

with open("data.csv", newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f, delimiter=delim)
    for row in reader:
        print(row)
```

### ¿Cómo importo archivos Excel con múltiples hojas?

```python
import pandas as pd


def import_multi_sheet_excel(file_path: str) -> dict[str, list[dict]]:
    """Importa todas las hojas de un archivo Excel."""
    xl = pd.ExcelFile(file_path)
    result = {}
    for sheet_name in xl.sheet_names:
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        df = df.dropna(how="all")  # Remover filas completamente vacías
        result[sheet_name] = df.to_dict("records")
    return result


# Uso
sheets = import_multi_sheet_excel("workbook.xlsx")
for sheet_name, rows in sheets.items():
    print(f"Hoja '{sheet_name}': {len(rows)} filas")
```

### ¿Cómo manejo el parseo de fechas desde Excel?

Excel almacena fechas como números de serie. Usa `pandas` con parseo explícito de fechas:

```python
import pandas as pd


def import_excel_with_dates(file_path: str) -> list[dict]:
    """Importa Excel con parseo correcto de fechas."""
    df = pd.read_excel(
        file_path,
        parse_dates=["birth_date", "hire_date", "last_login"],
        date_format="%Y-%m-%d",
    )

    # Manejar formatos de fecha mixtos
    for col in ["birth_date", "hire_date"]:
        df[col] = pd.to_datetime(df[col], errors="coerce", format="mixed")

    # Filtrar filas con fechas inválidas
    df = df.dropna(subset=["birth_date", "hire_date"])

    return df.to_dict("records")
```

### ¿Cómo reanudo una importación interrumpida?

Rastrea el progreso con un archivo de checkpoint para reanudar desde el último lote exitoso:

```python
import csv
import json
from pathlib import Path


def resumable_import(file_path: str, checkpoint_path: str, batch_size: int = 1000):
    """Importa CSV con checkpointing para capacidad de reanudación."""
    checkpoint = {"last_row": 0, "inserted": 0}

    if Path(checkpoint_path).exists():
        with open(checkpoint_path) as f:
            checkpoint = json.load(f)
        print(f"Reanudando desde fila {checkpoint['last_row']}")

    with open(file_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        batch = []

        for row_num, row in enumerate(reader, start=2):
            if row_num <= checkpoint["last_row"]:
                continue  # Saltar filas ya procesadas

            batch.append(row)

            if len(batch) >= batch_size:
                # Insertar lote a base de datos...
                checkpoint["last_row"] = row_num
                checkpoint["inserted"] += len(batch)

                with open(checkpoint_path, "w") as f:
                    json.dump(checkpoint, f)

                batch.clear()

        # Procesar filas restantes
        if batch:
            checkpoint["last_row"] = row_num
            checkpoint["inserted"] += len(batch)
            with open(checkpoint_path, "w") as f:
                json.dump(checkpoint, f)

    return checkpoint


# Uso
result = resumable_import("large.csv", ".import_checkpoint.json")
print(f"Importadas {result['inserted']} filas, última fila: {result['last_row']}")
```
