---
contentType: recipes
slug: convert-json-to-csv
title: "Convertir JSON a CSV"
description: "Cómo convertir datos JSON a formato CSV en Python, Java y JavaScript."
metaDescription: "Aprende a convertir JSON a CSV en Python, Java y JavaScript. Transforma respuestas de API y exports de datos con ejemplos prácticos."
difficulty: beginner
topics:
  - data
tags:
  - json
  - csv
  - conversion
  - python
  - javascript
  - java
  - data-processing
relatedResources:
  - /recipes/data/parse-csv-files
  - /recipes/data/parse-json
  - /recipes/data/serialize-deserialize-data
  - /recipes/data/validate-json-schema
  - /recipes/data/parse-xml-files
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Aprende a convertir JSON a CSV en Python, Java y JavaScript. Transforma respuestas de API y exports de datos con ejemplos prácticos."
  keywords:
    - json
    - csv
    - conversion
    - python
    - javascript
    - java
    - data-processing
---

## Visión General

Convertir JSON a CSV conecta respuestas estructuradas de API con formatos compatibles con hojas de cálculo. Esta transformación es esencial para exports de datos, pipelines de business intelligence e interoperabilidad con flujos de trabajo basados en Excel. La estructura anidada de JSON debe aplanarse en filas y columnas, manejando arrays y objetos anidados cuidadosamente.

## Cuándo Usar

Usa este recurso cuando:
- Exportes datos de respuesta de API a Excel o Google Sheets
- Construyas pipelines ETL que alimenten herramientas BI o data warehouses
- Generes reportes desde bases de datos NoSQL que almacenan documentos JSON
- Conviertas datos de analytics web o telemetría para stakeholders no técnicos

## Solución

### Python

```python
import json
import csv

# Array JSON plano simple
json_data = '[{"name":"Alice","age":30},{"name":"Bob","age":25}]'
records = json.loads(json_data)

with open('output.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=records[0].keys())
    writer.writeheader()
    writer.writerows(records)
```

```python
# Aplanar JSON anidado con pandas
# pip install pandas
import pandas as pd

nested = '[{"user":{"name":"Alice"},"orders":[{"id":1}]}]'
df = pd.json_normalize(json.loads(nested), sep='.')
df.to_csv('output.csv', index=False)
```

### JavaScript

```javascript
// Conversión manual para arrays planos
const records = [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }];
const headers = Object.keys(records[0]);
const rows = records.map(r => headers.map(h => JSON.stringify(r[h])).join(','));
const csv = [headers.join(','), ...rows].join('\n');
console.log(csv);
```

```javascript
// Usando json2csv para conversión confiable
// npm install @json2csv/plainjs
import { Parser } from '@json2csv/plainjs';

const parser = new Parser();
const csv = parser.parse(records);
console.log(csv);
```

### Java

```java
// Jackson + commons-csv
// Maven: com.fasterxml.jackson.core:jackson-databind, org.apache.commons:commons-csv
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import java.io.StringWriter;
import java.util.List;
import java.util.Map;

public class JsonToCsv {
    public static void main(String[] args) throws Exception {
        String json = "[{\"name\":\"Alice\",\"age\":30},{\"name\":\"Bob\",\"age\":25}]";
        ObjectMapper mapper = new ObjectMapper();
        List<Map<String, Object>> records = mapper.readValue(json, List.class);

        StringWriter sw = new StringWriter();
        try (CSVPrinter printer = new CSVPrinter(sw, CSVFormat.DEFAULT.withHeader("name", "age"))) {
            for (Map<String, Object> record : records) {
                printer.printRecord(record.get("name"), record.get("age"));
            }
        }
        System.out.println(sw.toString());
    }
}
```

## Explicación

El desafío principal en la conversión JSON a CSV es aplanar datos jerárquicos en una tabla bidimensional. Los arrays JSON planos mapean directamente a filas. Los objetos anidados requieren estrategias: aplanar claves (`user.name` -> `user_name`) o explotar en múltiples archivos CSV con relaciones de foreign key.

`pandas.json_normalize` (Python) maneja aplanado automáticamente con separadores configurables. `@json2csv` (JS) soporta campos custom, transforms y operaciones unwind para arrays. Java requiere iteración manual porque las librerías estándar no incluyen un convertidor JSON a CSV.

## Variantes

| Tecnología | Librería | Enfoque | Notas |
|------------|----------|---------|-------|
| Python | `csv` (stdlib) | `DictWriter` | Cero deps, requiere JSON plano |
| Python | `pandas` | `json_normalize()` | Maneja anidación, potente pero dependencia pesada |
| JavaScript | `@json2csv` | `Parser` | Campos custom, transforms, streams async |
| JavaScript | Manual | `Object.keys()` + `join()` | Cero deps, frágil para datos complejos |
| Java | `Jackson` + `commons-csv` | Iteración manual | Enterprise-grade, boilerplate verbose |
| Java | `univocity-parsers` | `CsvWriter` | Alternativa de alto rendimiento a commons-csv |

## Lo que funciona

- **Sanitiza headers** para remover espacios y caracteres especiales que rompen parsers downstream
- **Maneja campos faltantes gracefulmente**: Usa valores por defecto o strings vacíos en lugar de omitir columnas
- **Escapa comas y quotes** en valores string para producir CSV compliant con RFC 4180
- **Desenrolla arrays antes de convertir** o mantenlos como strings JSON en celdas para preservar integridad
- **Agrega un BOM (`\ufeff`)** al escribir CSV para compatibilidad con Excel y caracteres no-ASCII

## Errores Comunes

- **Asumir que todos los registros tienen claves idénticas**: Campos faltantes causan columnas desalineadas; normaliza el schema primero
- **No manejar objetos anidados**: Resulta en `[object Object]` en JS o `LinkedHashMap` en Java
- **Olvidar quotteo de valores con comas**: Rompe parsers CSV que esperan simple split-by-comma
- **Escribir archivos grandes a memoria**: Usa conversión streaming para datasets > 10k filas para evitar OOM
- **Usar delimitador default de Excel en locales no-inglés**: Algunas regiones usan punto y coma; setea explícitamente el delimitador si es necesario

## Preguntas Frecuentes

### ¿Cómo convierto JSON profundamente anidado a CSV?

Usa `pandas.json_normalize` con `sep='_'` o la opción `unwind` de `@json2csv` para arrays. Para objetos profundamente anidados, considera si CSV es el formato correcto — parquet o JSON Lines pueden ser mejores alternativas. Si CSV es requerido, aplanar claves en columnas dot-notation.

### ¿Puedo convertir JSON a CSV en el navegador?

Sí. Carga `@json2csv` vía CDN o bundléalo con tu aplicación frontend. Para archivos muy grandes, usa Web Workers para evitar bloquear el hilo principal, y stream chunks a una descarga usando Streams API o `Blob`/`URL.createObjectURL`.

### ¿Cómo manejo arrays dentro de objetos JSON al convertir a CSV?

Opción 1: Desenrolla el array para que cada elemento sea una fila separada (duplicando campos padre). Opción 2: Serializa el array a string JSON dentro de la celda CSV. Opción 3: Crea un archivo CSV relacionado separado y usa una columna ID para vincularlos, similar a normalización de base de datos.
