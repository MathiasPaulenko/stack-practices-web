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
  - /recipes/parse-csv-files
  - /recipes/parse-json
  - /recipes/serialize-deserialize-data
  - /recipes/validate-json-schema
  - /recipes/parse-xml-files
  - /recipes/merge-json-files-javascript
  - /recipes/python-excel-read-write
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

## Cuando No Usar Este Enfoque

- **Datos de streaming en tiempo real**: si los datos llegan continuamente en chunks pequeÃ±os, el parsing batch es el modelo equivocado. Usa frameworks de stream processing (Kafka Streams, Flink, RxJS) en lugar de cargar archivos enteros en memoria
- **Archivos mas grandes que la RAM disponible**: parsear un CSV de 50GB con pandas.read_csv() crashea con MemoryError. Usa lectura en chunks (chunksize), Dask, o import bulk a base de datos para archivos que excedan 50% de la RAM disponible
- **Consultas estructuradas a base de datos**: si la fuente de datos es una base de datos, extraer a CSV/JSON primero y luego parsear es desperdicio. Consulta la base de datos directamente con SQL y procesa los resultados en memoria
- **Lookups simples key-value**: para leer un archivo de config pequeÃ±o (10-20 keys), un parser completo es excesivo. Usa json.loads() o csv.DictReader sobre el string raw directamente
- **Formatos binarios con librerias dedicadas**: si el archivo es Parquet, Avro u ORC, no lo parsees como CSV/JSON. Usa lectores especificos del formato (pyarrow, fastavro) que manejan compresion y schema nativamente
- **Compliance regulatorio que requiere audit trails**: si el procesamiento de datos debe producir un audit trail, los scripts de parsing ad-hoc carecen de trazabilidad. Usa herramientas ETL (Airflow, dbt, Prefect) que loguean cada paso de transformacion

## Benchmarks de Rendimiento

- **Throughput de parsing CSV**: el modulo csv de Python procesa 100-500 MB/s para rows simples. pandas.read_csv() logra 200-800 MB/s con engine='c'. El crate csv de Rust alcanza 1-3 GB/s
- **Latencia de parsing JSON**: json.loads() en Python parsea 10MB JSON en 50-200ms. orjson parsea el mismo archivo en 10-30ms. JSON.parse() de JavaScript maneja 10MB en 20-80ms
- **Parsing Excel**: openpyxl lee un Excel de 10,000 rows en 2-5 segundos. pandas.read_excel() con engine openpyxl toma 3-8 segundos. xlrd (legacy .xls) es 2-3x mas rapido pero limitado a formatos antiguos
- **Parsing XML**: ElementTree parsea 1MB XML en 10-50ms. lxml (basado en C) parsea el mismo archivo en 2-10ms. SAX streaming maneja archivos de 1GB+ con memoria constante
- **Uso de memoria**: pandas.read_csv() usa 5-10x el tamaÃ±o del archivo en memoria. Un CSV de 100MB se convierte en 500MB-1GB en un DataFrame. Usa especificacion de dtype para reducir memoria en 50-80%
- **Parsing paralelo**: leer 4 archivos CSV en paralelo con concurrent.futures.ThreadPoolExecutor logra 3x throughput en maquinas de 4 cores. El parsing I/O-bound escala bien con threads

## Estrategia de Testing

- **Test con input malformado**: verifica que el parser maneje rows rotos, columnas faltantes, errores de encoding (BOM, UTF-16) y archivos vacios sin crashear. Usa property-based testing (Hypothesis) para generar edge cases
- **Test de fidelidad round-trip**: parsea un archivo, serializa de vuelta, y compara. El testing round-trip detecta perdida de datos por type coercion, issues de encoding, o perdida de precision de floating-point
- **Test con archivos grandes**: crea un archivo sintetico de 1GB+ y verifica que el parser complete dentro de los limites de memoria. Usa head -n 1000000 para generar datos de test desde archivos reales
- **Test de manejo de encoding**: verifica que el parser maneje UTF-8, UTF-16, Latin-1 y archivos con BOM. Testea con archivos que contienen emoji, caracteres CJK y null bytes
- **Test de inferencia de delimitador**: para parsing CSV, testea con delimitadores comma, semicolon, tab y pipe. Verifica que csv.Sniffer o equivalente detecte el delimitador correcto
- **Test de acceso concurrente**: si multiples procesos parsean el mismo archivo, verifica que no haya race conditions. Usa file locking o lecturas atomicas para acceso compartido a archivos

## Estimacion de Costos

- **Costo de compute**: parsear 1TB de archivos CSV en una VM cloud cuesta -10 en compute (dependiendo del tipo de instancia). Usar un servicio gestionado como AWS Glue cuesta -15 por TB incluyendo I/O
- **Costo de memoria**: el parsing en memoria de archivos grandes requiere instancias high-memory. Un CSV de 10GB necesita una instancia de 32GB+ RAM (.50-2.00/hora en AWS). La lectura en chunks reduce esto a instancias de 4GB (.10-0.30/hora)
- **Costo de almacenamiento**: los archivos JSON intermedios son 2-5x mas grandes que CSV. Convertir 1TB CSV a JSON requiere 2-5TB almacenamiento (-50/mes en S3). Considera Parquet (10-20% del tamaÃ±o CSV) para eficiencia de almacenamiento
- **Tiempo de desarrollo**: escribir un parser robusto con manejo de errores, deteccion de encoding y type inference toma 4-8 horas. Usar pandas o librerias dedicadas reduce esto a 1-2 horas
- **Infraestructura para jobs batch**: los jobs de parsing programados necesitan una instancia de compute, job scheduler y alerting de errores. Infraestructura total: -200/mes para un pipeline pequeÃ±o que procesa archivos diarios

## Monitoring y Observabilidad

- **Tasa de errores de parsing**: trackea el porcentaje de rows/archivos que fallan al parsear. Alerta cuando la tasa de error excede 1% del total. Causas comunes: cambios de encoding, schema drift, archivos corruptos
- **Duracion de parsing**: monitorea el tiempo para parsear cada archivo. Un aumento de 3x desde el baseline indica archivos mas grandes o degradacion de performance. Loguea el tamaÃ±o del archivo junto con la duracion de parsing
- **Uso de memoria durante parsing**: monitorea el peak de memoria durante el parsing de archivos. Si el peak excede 80% de la RAM disponible, cambia a lectura en chunks o streaming
- **Validacion de conteo de rows**: compara conteos de rows antes y despues del parsing. Una caida significativa indica perdida silenciosa de datos. Loguea rows de input, rows de output y rows saltadas separadamente
- **Deteccion de schema drift**: loguea nombres de columnas y tipos en cada parse. Alerta cuando columnas aparecen, desaparecen o cambian de tipo. El schema drift rompe consumidores downstream silenciosamente

## Deployment Checklist

- [ ] Setear limites de tamaÃ±o de archivo: rechazar archivos mas grandes que el maximo configurado (ej. 10GB) para prevenir OOM. Retornar HTTP 413 para uploads via API
- [ ] Configurar deteccion de encoding: usa chardet o cchardet para deteccion automatica de encoding. Default a UTF-8 pero falla a Latin-1 para archivos legacy
- [ ] Setear limites de memoria: usa lectura en chunks para archivos >500MB. Configura chunksize en pandas o stream line-by-line para CSV
- [ ] Implementar logica de retry: errores I/O transitorios (network storage, S3) requieren exponential backoff. Setea max 3 retries con delays de 5-30 segundos
- [ ] Configurar manejo de errores: decide si saltar rows malas (loguear y continuar) o fail fast. Para pipelines de datos, saltar con logging es usualmente preferido
- [ ] Setear timeouts: el parsing debe tener una duracion maxima. Mata procesos que excedan 2x el tiempo esperado de parse para prevenir agotamiento de recursos

## Consideraciones de Seguridad

- **Zip bomb via archivos comprimidos**: un ZIP de 10MB puede descomprimirse a 100GB. Setea limites de tamaÃ±o descomprimido antes de extraer. Usa zipfile.infolist() para chequear ile_size antes de extraccion
- **Inyeccion XXE (XML External Entity)**: los parsers XML que resuelven entidades externas pueden leakear archivos locales o realizar SSRF. Deshabilita el procesamiento DTD con XMLParser(resolve_entities=False) en lxml o orbid_dtd=True en defusedxml
- **Inyeccion de formulas via CSV**: archivos Excel y CSV pueden contener formulas empezando con =, +, - o @. Al abrirse en Excel, estas ejecutan formulas arbitrarias. Prefija celdas peligrosas con un single quote o strippa caracteres de formula
- **Path traversal via nombres de archivo**: si los nombres de archivo vienen de input del usuario, ../../etc/passwd puede escapar del directorio intencionado. Usa os.path.basename() o pathlib.Path.name para sanitizar nombres de archivo
- **Agotamiento de memoria via archivos grandes**: un atacante puede subir un archivo de 100GB para crashear el parser. Enforce limites de tamaÃ±o en el web server (nginx client_max_body_size) antes de que el parser vea el archivo
- **Inyeccion de codigo via eval en datos parseados**: si los datos parseados se pasan a eval(), exec() o Function(), un atacante puede inyectar codigo arbitrario. Nunca evalues datos parseados. Usa deserializadores seguros
- **Bypass basado en encoding**: encoding UTF-7 o UTF-16 puede bypassar filtros de seguridad que esperan UTF-8. Normaliza el encoding a UTF-8 antes de los checks de seguridad
- **Contenido PDF malicioso**: archivos PDF pueden contener JavaScript, archivos embebidos o acciones de launch. Usa PyPDF2 con strict mode o corre parsing de PDF en un contenedor sandboxed
- **Inyeccion de logs via newlines en datos parseados**: si los datos parseados se escriben a archivos de log, newlines embebidos pueden forjar entradas de log. Strippa o escapa caracteres de newline antes de loguear
- **Agotamiento de recursos via estructuras profundamente anidadas**: JSON o XML con 10,000+ niveles de nesting causa stack overflow en parsers recursivos. Setea limites de profundidad de recursion antes de parsear
## Variantes y Alternativas

- **Parsers streaming vs batch**: los parsers streaming (SAX, StAX, ijson) procesan dato por dato con memoria O(1). Los parsers batch (DOM, ElementTree, json.loads) cargan todo en memoria. Elije streaming para archivos >100MB
- **Formatos columnares vs row-based**: Parquet y ORC almacenan datos columna por columna, habilitando column pruning y 10-50x mejor compresion para queries analiticos. CSV y JSON son row-based y requieren full-row scans
- **Formatos binarios vs texto**: Protocol Buffers, Avro y MessagePack son 3-10x mas pequeÃ±os que JSON/CSV y parsean 2-5x mas rapido. El tradeoff es legibilidad humana y complejidad de debugging
- **I/O mapeado a memoria vs I/O bufferizado**: mmap mapea archivos directamente al espacio de direcciones del proceso, evitando overhead de copia. Para workloads read-heavy en archivos grandes, mmap es 2-3x mas rapido que lecturas bufferizadas
- **Estrategias de parsing paralelo**: divide archivos grandes por byte ranges y parsea chunks en paralelo. Para CSV, encuentra boundaries de newline antes de dividir. Para JSON, usa JSON Lines (un objeto por linea) para paralelismo natural
- **Enfoques hibridos**: usa un scanner rapido para extraer metadata (headers, conteo de rows, schema) antes del parsing completo. Esto habilita rechazo temprano de archivos invalidos y alocacion optimizada de memoria

## Pitfalls Comunes en Produccion

- **Fallos de deteccion de encoding**: chardet identifica mal strings cortos. Para archivos <1KB, defaulta a UTF-8 en lugar de depender de deteccion. Para archivos de contenido mixto, deteccion de BOM es mas confiable que metodos estadisticos
- **Inconsistencia de delimitadores**: archivos CSV europeos usan punto y coma. Archivos US usan comma. Archivos tab-delimited de Excel usan tabs. Siempre detecta el delimitador con csv.Sniffer o aceptalo como parametro
- **Manejo de campos entre comillas**: campos CSV que contienen el delimitador deben ir entre comillas. Las comillas embebidas deben duplicarse. Los parsers que no manejan quoting producen output incorrecto en campos con commas o newlines
- **Ambiguedad de formato de fecha**:  1/02/2024 es 2 de enero en US y 1 de febrero en Europa. Siempre parsea fechas con format strings explicitos. ISO 8601 (YYYY-MM-DD) es ambiguo
- **Precision de floating-point en CSV**: escribir  .1 a CSV y leerlo de vuelta puede producir  .10000000000000001. Usa representacion de string para valores exactos o Decimal para datos financieros
- **Presion de memoria por archivos Excel grandes**: openpyxl carga el workbook entero en memoria. Un Excel de 50MB puede usar 500MB+ de RAM. Usa modo 
ead_only=True o la API streaming de openpyxl para workbooks grandes
## Patrones de Integracion

- **Integracion con pipeline ETL**: usa parsers de archivos como extractores en pipelines ETL. Lee de archivos (extract), transforma con pandas/Polars (transform), escribe a base de datos o data warehouse (load). Programa con Airflow o Prefect
- **Procesamiento de archivos via API**: acepta uploads de archivos via REST API, almacena en object storage (S3), triggera procesamiento async con una message queue. Retorna un job ID para status polling. Este patron maneja archivos grandes sin bloquear la API
- **Procesamiento batch vs micro-batch**: batch processing corre nocturnamente en todos los archivos. Micro-batch procesa archivos cada 15-30 minutos. Micro-batch reduce latencia pero aumenta costo de infraestructura. Elije basado en el timing de dependencias downstream
- **Integracion con schema registry**: registra schemas de archivos en un schema registry (Confluent, Apicurio). Valida archivos contra el registry antes de procesar. Esto asegura que todos los consumidores usen schemas compatibles
- **Patron data lake**: almacena archivos raw en un data lake (S3, Azure Data Lake). Procesa con Spark o Dask. Escribe resultados a un data warehouse (Snowflake, BigQuery). El data lake preserva datos raw para reprocesamiento
- **Procesamiento de archivos event-driven**: cuando un archivo llega a S3, S3 Event Notifications triggera una funcion Lambda. La funcion parsea el archivo y escribe resultados a una base de datos. Este patron escala a miles de archivos por segundo

## Manejo de Errores y Recuperacion

- **Procesamiento parcial de archivos**: si un archivo tiene 10,000 rows y la row 5,000 esta malformada, procesa rows 1-4,999, loguea el error, salta la row 5,000, y continua con rows 5,001-10,000. Nunca falles un batch entero por una row mala
- **Dead letter queue para archivos**: archivos que fallan al procesarse van a una dead letter queue (S3 bucket, message queue). Un proceso separado los reintenta con exponential backoff. Despues de 3 fallos, alerta a un humano para inspeccion manual
- **Checkpointing para archivos grandes**: registra el byte offset del ultimo procesado exitosamente. Si el procesamiento crashea, resumea desde el checkpoint en lugar de reprocesar el archivo entero. Esto es critico para archivos que toman horas procesar
- **Procesamiento idempotente de archivos**: procesar el mismo archivo dos veces debe producir el mismo resultado. Usa file hash + timestamp de procesamiento como key unica. Salta archivos que ya fueron procesados exitosamente
- **Circuit breaker para dependencias externas**: si la fuente de archivos (FTP, S3, API) esta caida, abre un circuit breaker despues de 5 fallos consecutivos. Deja de intentar lecturas por 5 minutos, luego prueba de nuevo. Esto previene fallos en cascada
- **Degradacion graceful**: si un parser no critico falla (ej. extraccion de metadata), continua procesando con los datos core. Loguea el fallo pero no bloquees el pipeline. Bloquea solo en fallos criticos de parsing
## Tooling y Ecosistema

- **pandas**: la libreria estandar de Python para datos tabulares. 50M+ downloads/mes. Maneja CSV, Excel, JSON, SQL, Parquet. El overhead de memoria es 5-10x el tamaÃ±o del archivo. Usa parametro dtype para reducir memoria
- **Polars**: 2-10x mas rapido que pandas con lazy evaluation. Escrito en Rust. Menor uso de memoria. Reemplazo drop-in para la mayoria de operaciones de pandas. Ecosistema creciente con 5M+ downloads/mes
- **DuckDB**: base de datos analitica in-process. Queryea CSV/Parquet/JSON directamente con SQL. Sin servidor. 2-5x mas rapido que pandas para queries de agregacion. Embebida como SQLite pero para analytics
- **Apache Arrow**: formato columnar in-memory. Lecturas zero-copy desde Parquet. Agnostico del lenguaje (Python, R, Java, JS). Fundacion para tools modernos de datos (pandas 2.0, Polars, DuckDB)
- **jq**: procesador de JSON command-line. Filtra, transforma y queryea JSON con un DSL compacto. Esencial para pipelines de shell y debugging de respuestas API. Instala con pt install jq o rew install jq
- **csvkit**: herramientas command-line para archivos CSV. csvstat muestra estadisticas, csvcut selecciona columnas, csvjoin mergea archivos. Util para exploracion rapida sin escribir scripts Python

## Resumen de Best Practices


- For a deeper guide, see [Convert CSV to JSON](/es/recipes/convert-csv-to-json/).

- Siempre especifica encoding explicitamente (encoding='utf-8'). Nunca confies en defaults del sistema
- Usa lectura en chunks para archivos >500MB. Setea chunksize en pandas o itera line-by-line
- Valida la estructura del archivo antes del parsing completo. Chequea headers, conteo de rows y tamaÃ±o del archivo
- Loguea errores de parse con nombre de archivo, numero de linea y mensaje de error para debugging
- Usa parsers streaming (SAX, ijson) para archivos >1GB para mantener memoria constante
- Comprime archivos intermedios con gzip o zstd. Parquet es 10-20x mas pequeÃ±o que CSV
## Tips de Optimizacion de Performance

- Usa pandas.read_csv(dtype=...) para especificar tipos de columna. Evita overhead de auto-inference y reduce memoria en 50-80%
- Para lecturas repetidas del mismo archivo, cachea el resultado parseado con unctools.lru_cache o Redis
- Usa csv.field_size_limit() para aumentar el tamaÃ±o maximo de campo si encuentras _csv.Error: field larger than field limit
- Para XML, prefiere lxml sobre xml.etree.ElementTree. lxml es 5-10x mas rapido para archivos grandes
- Para Excel, usa openpyxl en modo ead_only=True para archivos >10MB. Streamea rows en lugar de cargar el workbook entero
- Para extraccion de texto PDF, pdfplumber es mas preciso que PyPDF2 para layouts complejos pero 3-5x mas lento
- Para archivos de log, usa e.compile() para pre-compilar patrones regex. Regex compilado es 2-5x mas rapido que e.search() con string patterns
- Para conversion CSV-a-JSON, usa orjson en lugar de json para serializacion 5-10x mas rapida
- Para procesamiento de CSV grandes, usa pandas.read_csv(chunksize=10000) y procesa chunks en paralelo con concurrent.futures
- Para escritura Excel, xlsxwriter es 2-3x mas rapido que openpyxl para archivos grandes de output pero no soporta lectura
## Preguntas Frecuentes

### ¿Cómo convierto JSON profundamente anidado a CSV?

Usa `pandas.json_normalize` con `sep='_'` o la opción `unwind` de `@json2csv` para arrays. Para objetos profundamente anidados, considera si CSV es el formato correcto — parquet o JSON Lines pueden ser mejores alternativas. Si CSV es requerido, aplanar claves en columnas dot-notation.

### ¿Puedo convertir JSON a CSV en el navegador?

Sí. Carga `@json2csv` vía CDN o bundléalo con tu aplicación frontend. Para archivos muy grandes, usa Web Workers para evitar bloquear el hilo principal, y stream chunks a una descarga usando Streams API o `Blob`/`URL.createObjectURL`.

### ¿Cómo manejo arrays dentro de objetos JSON al convertir a CSV?

Opción 1: Desenrolla el array para que cada elemento sea una fila separada (duplicando campos padre). Opción 2: Serializa el array a string JSON dentro de la celda CSV. Opción 3: Crea un archivo CSV relacionado separado y usa una columna ID para vincularlos, similar a normalización de base de datos.