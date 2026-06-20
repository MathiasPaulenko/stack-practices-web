---
contentType: recipes
slug: convert-csv-to-json
title: "Convertir CSV a JSON"
description: "Cómo convertir datos CSV a formato JSON en Python, Java y JavaScript."
metaDescription: "Aprende a convertir CSV a JSON en Python, Java y JavaScript. Transforma exports de spreadsheets en payloads estructurados de API con ejemplos de código."
difficulty: beginner
topics:
  - data
tags:
  - csv
  - json
  - conversion
  - python
  - javascript
  - java
  - data-processing
relatedResources:
  - /recipes/data/convert-json-to-csv
  - /recipes/data/parse-csv-files
  - /recipes/data/parse-xml-files
  - /recipes/data/serialize-deserialize-data
  - /recipes/data/validate-json-schema
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Aprende a convertir CSV a JSON en Python, Java y JavaScript. Transforma exports de spreadsheets en payloads estructurados de API con ejemplos de código."
  keywords:
    - csv
    - json
    - conversion
    - python
    - javascript
    - java
    - data-processing
---
## Visión General

CSV es el formato de exportación universal para spreadsheets y bases de datos pero carece de estructura anidada y tipos explícitos. Convertir CSV a JSON habilita ingesta en APIs REST, almacenamiento en document stores NoSQL y data binding del lado del cliente. Esta recipe cubre conversión robusta CSV a JSON con inferencia de tipos, mapeo a objetos anidados y streaming para archivos grandes en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Importes exports de spreadsheets en una aplicación web o API
- Cargues datos planos en MongoDB, Elasticsearch u otros document stores
- Habilites visualización de datos del lado del cliente desde exports CSV
- Proceses archivos CSV grandes que exceden memoria si se cargan enteros como JSON

## Solución

### Python

```python
# csv + json de la librería estándar
import csv
import json

with open('data.csv', newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(rows, f, indent=2)
```

```python
# pandas para inferencia de tipos y columnas anidadas
# pip install pandas
import pandas as pd

df = pd.read_csv('data.csv')
df['date'] = pd.to_datetime(df['date'])
json_data = df.to_json(orient='records', date_format='iso')
print(json_data)
```

### JavaScript

```javascript
// csv-parse para conversión robusta con streaming
// npm install csv-parse
import { parse } from 'csv-parse';
import fs from 'fs';

const parser = fs.createReadStream('data.csv').pipe(
  parse({ columns: true, cast: true })
);

const rows = [];
for await (const row of parser) {
  rows.push(row);
}
console.log(JSON.stringify(rows, null, 2));
```

```javascript
// papaparse para conversión en el browser
// npm install papaparse
import Papa from 'papaparse';

const csv = 'name,age\nAlice,30\nBob,25';
const result = Papa.parse(csv, { header: true });
console.log(JSON.stringify(result.data, null, 2));
```

### Java

```java
// Jackson CSV module para conversión con streaming
// Maven: com.fasterxml.jackson.dataformat:jackson-dataformat-csv
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.csv.CsvMapper;
import com.fasterxml.jackson.dataformat.csv.CsvSchema;

public class CsvToJson {
    public static void main(String[] args) throws Exception {
        CsvSchema schema = CsvSchema.builder()
            .setUseHeader(true)
            .build();
        CsvMapper csvMapper = new CsvMapper();
        ObjectMapper jsonMapper = new ObjectMapper();

        List<Map<String, String>> rows = csvMapper
            .readerFor(Map.class)
            .with(schema)
            .readValues(new File("data.csv"))
            .readAll();

        jsonMapper.writerWithDefaultPrettyPrinter()
            .writeValue(new File("data.json"), rows);
    }
}
```

## Explicación

CSV no tiene sistema de tipos nativo: cada valor es una cadena. JSON soporta strings, números, booleanos, null, arrays y objetos. La conversión requiere decisiones de casting: `age` debería convertirse a entero, `active` a booleano, y `tags` a lista. `csv.DictReader` (Python) y `csv-parse` (JS) tratan todos los campos como strings por defecto; se necesitan funciones de casting explícitas o definiciones de schema para fidelidad de tipos.

El streaming es crítico para archivos grandes. `csv-parse` (JS) y Jackson (Java) soportan lectores streaming que emiten una fila a la vez, manteniendo uso de memoria O(tamaño de fila) en lugar de O(tamaño de archivo). Para objetos JSON anidados, usa convenciones de nombres de columna como `user.name` y utilidades de flattening (ej. paquete `flat` de npm, `pandas.json_normalize`) para reconstruir jerarquías.

## Variantes

| Tecnología | Librería | Enfoque | Notas |
|------------|----------|---------|-------|
| Python | `csv` + `json` | `DictReader` + `json.dump` | Librería estándar, sin dependencias |
| Python | `pandas` | `read_csv` + `to_json` | Inferencia de tipos, columnas anidadas, soporte para archivos grandes |
| JavaScript | `csv-parse` | `parse({ columns: true })` | Streaming, async iterables, enfocado en Node |
| JavaScript | `papaparse` | `Papa.parse(csv, { header: true })` | Browser + Node, maneja CSV malformado robustamente |
| Java | `Jackson CSV` | `CsvMapper` + `ObjectMapper` | Streaming, schema-driven, estándar enterprise |
| Java | `Apache Commons CSV` | `CSVFormat.DEFAULT.parse()` | Alternativa ligera, serialización JSON manual |

## Mejores Prácticas

- **Usa `DictReader` / `columns: true`** para mapear headers CSV directamente a claves JSON en lugar de arrays posicionales
- **Haz casting de tipos explícitamente**: CSV no tiene booleanos o fechas; define un schema o post-procesa filas para evitar strings `"true"`
- **Haz streaming de archivos grandes**: Para archivos sobre 100MB, usa parsers streaming y escribe JSON en chunks o a base de datos
- **Valida schema JSON después de la conversión**: Usa `jsonschema` (Python), `ajv` (JS) o validadores de Jackson para asegurar que la salida coincide con la estructura esperada
- **Preserva encoding UTF-8**: Especifica `encoding='utf-8'` en Python y manejo de `BOM` en JS para evitar caracteres internacionales corruptos

## Errores Comunes

- **Cargar CSVs multi-gigabyte enteros en memoria**: Causa errores OOM; siempre haz streaming o procesamiento por chunks
- **No manejar comas y saltos de línea entre comillas**: Un naive `split(',')` rompe con `"New York, NY"`; siempre usa un parser CSV apropiado
- **Asumir orden de columnas consistente**: Los headers CSV pueden cambiar; referencia campos por nombre, no por índice
- **Ignorar marcadores BOM**: CSVs exportados de Excel pueden tener un BOM UTF-8 que corrompe la primera clave de header
- **Olvidar formato de fechas**: JSON no tiene tipo date; usa strings ISO 8601 (`2024-01-15T00:00:00Z`) para consistencia

## Preguntas Frecuentes

### ¿Cómo convierto CSV con estructuras JSON anidadas?

Usa nombres de columna en notación de puntos (`user.name`, `user.email`) y reconstruye objetos programáticamente. En Python, usa `pandas` con `json_normalize` a la inversa, o escribe un reducer. En JavaScript, librerías como `flat` pueden expandir dot-keys en objetos anidados. Jackson soporta `@JsonUnwrapped` para mapeo anidado de POJOs en Java.

### ¿Cuál es el enfoque más eficiente en memoria para CSVs grandes?

Haz streaming de filas y escribe JSON incrementalmente. En Python, usa `ijson` para emitir elementos de array JSON sin mantener la lista completa. En JavaScript, pipea `csv-parse` hacia un writer JSON streaming. En Java, usa `SequenceWriter` de Jackson para appendear filas a un array JSON sin buffering.

### ¿Cómo manejo archivos CSV sin headers?

Define un array de headers manualmente y haz zip con los valores de fila. Python: `dict(zip(headers, row))`. JavaScript: `Object.fromEntries(headers.map((h, i) => [h, row[i]]))`. Java: Provee un `CsvSchema` con nombres de columna explícitos vía `CsvSchema.builder().addColumn("name")...`.
