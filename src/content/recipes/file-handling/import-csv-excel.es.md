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
  - csv
  - excel
  - import
  - parse
  - validation
  - pandas
  - python
  - javascript
  - java
relatedResources:
  - /recipes/export-csv-excel
  - /recipes/file-upload-validation
  - /recipes/generate-pdfs
  - /recipes/image-optimization
  - /recipes/input-validation
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

Importar datos desde CSV o Excel es una funcionalidad estándar de paneles de administración, herramientas de migración de datos y actualizaciones masivas. El desafío no es solo parsear el archivo, sino validar cada fila, manejar datos malformados elegantemente e importar archivos grandes sin bloquear el servidor. Esta receta cubre importación robusta de CSV/Excel en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Los usuarios suban hojas de cálculo para crear o actualizar registros masivamente
- Migres datos desde sistemas legacy o proveedores externos
- Construyas pipelines ETL que procesen archivos programados
- Paneles de administración necesiten una funcionalidad de "subir e importar"

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

El patrón robusto es:
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

## Mejores Prácticas

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
