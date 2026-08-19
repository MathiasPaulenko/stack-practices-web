---
contentType: recipes
slug: convert-csv-to-json
title: "Convertir CSV a JSON"
description: "Convertí archivos CSV a JSON estructurado con Python, JavaScript y Java. Elegí la librería adecuada para conversiones puntuales o pipelines grandes."
metaDescription: "Convierte CSV a JSON en Python, JavaScript y Java. Usá ejemplos con la librería estándar, pandas, csv-parse, papaparse y Jackson para conversiones confiables."
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
  - /recipes/parse-csv-files
  - /recipes/convert-json-to-csv
  - /recipes/parse-csv-python-pandas
  - /recipes/serialize-deserialize-data
  - /recipes/validate-json-schema
  - /recipes/python-excel-read-write
lastUpdated: "2026-08-19"
publishedAt: "2026-06-20"
author: Mathias Paulenko
seo:
  metaDescription: "Convierte CSV a JSON en Python, JavaScript y Java. Usá ejemplos con la librería estándar, pandas, csv-parse, papaparse y Jackson para conversiones confiables."
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

CSV es el formato de exportación por defecto de spreadsheets y bases de datos,
pero solo guarda texto plano. JSON te da números, booleanos, objetos anidados y
arrays — la forma que la mayoría de las APIs y document stores esperan.

Los ejemplos de abajo corren en Python, JavaScript y Java. Usá la versión rápida
con librería estándar para archivos chicos, y la versión con streaming para lo
que no entra en RAM.

## Cuándo Usar

Esta receta sirve cuando:

- Tenés que llevar exports de spreadsheets a una app web o API.
- Necesitás cargar datos planos en MongoDB, Elasticsearch u otro document store.
- Querés alimentar con datos CSV una librería de gráficos del lado del cliente.
- El CSV es demasiado grande para caber en memoria como un solo objeto.

### Cuándo evitar

- Si los datos ya viven en una base de datos, consultala directamente con SQL.
Exportar a CSV solo agrega un paso intermedio innecesario.
- El archivo es Parquet, Avro u ORC. Usá la herramienta hecha para ese formato
  binario.
- Estás procesando un stream en vivo de registros chicos. Ahí la conversión por
  lotes de archivos no tiene sentido.

## Solución

### Python (librería estándar)

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

### Python (pandas)

```python
# pip install pandas
import pandas as pd

df = pd.read_csv('data.csv')
df['date'] = pd.to_datetime(df['date'])
json_data = df.to_json(orient='records', date_format='iso')
print(json_data)
```

### JavaScript (Node con csv-parse)

```javascript
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

### JavaScript (browser con PapaParse)

```javascript
// npm install papaparse
import Papa from 'papaparse';

const csv = 'name,age\nAlice,30\nBob,25';
const result = Papa.parse(csv, { header: true });
console.log(JSON.stringify(result.data, null, 2));
```

### Java (Jackson)

```java
// Maven: com.fasterxml.jackson.dataformat:jackson-dataformat-csv
import java.io.File;
import java.util.List;
import java.util.Map;
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

CSV solo guarda texto; no distingue números, booleanos ni fechas. JSON te permite
guardar números, booleanos, null, arrays y objetos. Vos decidís cómo mapea cada
valor a un tipo JSON: `age` va a número, `active` a booleano, `tags` a array.
`csv.DictReader` de Python y `csv-parse` de Node devuelven strings por defecto,
así que casteás manualmente o definís un schema.

Un parser de streaming lee una fila a la vez, así que nunca guarda todo el archivo
en memoria. Si necesitás JSON
anidado, usá nombres de columna con puntos como `user.name` y una utilidad para
expandirlos, o armá el objeto en el código.

## Variantes

| Tecnología | Librería | Enfoque | Notas |
| --- | --- | --- | --- |
| Python | `csv` + `json` | `DictReader` + `json.dump` | Librería estándar, sin dependencias |
| Python | `pandas` | `read_csv` + `to_json` | Inferencia de tipos, maneja fechas, archivos grandes |
| JavaScript | `csv-parse` | `parse({ columns: true })` | Streaming, async iterables, enfocado en Node |
| JavaScript | `papaparse` | `Papa.parse(csv, { header: true })` | Browser + Node, tolera CSV malformado |
| Java | `Jackson CSV` | `CsvMapper` + `ObjectMapper` | Streaming, schema-driven |
| Java | `Apache Commons CSV` | `CSVFormat.DEFAULT.parse()` | Ligero, serialización JSON manual |

## Mejores Prácticas

- Mapeá los headers CSV directamente a claves JSON con `columns: true` o
  `DictReader`; no confíes en las posiciones de las columnas.
- Casteá los tipos de forma explícita. CSV no tiene booleanos ni fechas, así que
  definí un schema o post-procesá las filas.
- Hacé streaming una vez que el archivo pasa los 100 MB. Escribí el JSON en
  pedazos, o cargalo directamente a una base de datos.
- Validá el JSON de salida contra un schema cuando la estructura importe.
- Mantené el encoding UTF-8 explícito y manejá los BOM, especialmente con exports
  de Excel.

## Errores Comunes

- Cargar un CSV de varios gigabytes entero en memoria.
- Separar filas con `line.split(',')` y romper con comillas o saltos de línea.
- Referenciar columnas por índice cuando los headers pueden cambiar.
- Ignorar un BOM UTF-8 que corrompe la primera clave del header.
- Olvidar que JSON no tiene tipo date. Usá strings en formato ISO 8601.

## Preguntas Frecuentes

### ¿Por qué todos los valores salen como strings?

CSV no almacena tipos. Usá un schema o funciones de casteo para convertir
números, booleanos y fechas a los tipos JSON correctos.

### ¿Puedo convertir un CSV sin cargarlo entero en memoria?

Sí. Usá `csv-parse` con async iteration en Node, la API de streaming de Jackson
en Java, o `pd.read_csv(chunksize=...)` en Python.

### ¿Cómo creo objetos JSON anidados desde columnas planas de CSV?

Usá nombres de columna con puntos como `user.name` y `user.email`, luego
expandilos en el código o con una librería como `flat` o `pandas.json_normalize`.

### ¿Qué hago si el CSV tiene un delimitador distinto?

Seteá la opción `delimiter` del parser para que coincida con el archivo.
`csv.Sniffer` en Python, la opción `delimiter` de `csv-parse` y el export "CSV
(punto y coma)" de Excel son soluciones comunes.

### ¿Cómo manejo CSV malformado?

Usá un parser que no se rompa fácil, como `papaparse` con `skipEmptyLines` y
callbacks de `error`, o configurá `csv-parse` para saltar líneas vacías y seguir
con los registros buenos.
