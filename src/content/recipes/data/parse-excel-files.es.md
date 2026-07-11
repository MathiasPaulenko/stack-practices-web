---
contentType: recipes
slug: parse-excel-files
title: "Analizar Archivos Excel"
description: "Cómo leer y escribir archivos Excel (.xlsx) en Python, Java y JavaScript."
metaDescription: "Aprende a analizar archivos Excel en Python, Java y JavaScript. Lee worksheets, formatea celdas y maneja grandes spreadsheets con ejemplos de código."
difficulty: beginner
topics:
  - data
tags:
  - excel
  - xlsx
  - parsing
  - spreadsheet
  - python
  - javascript
  - java
relatedResources:
  - /recipes/data/parse-csv-files
  - /recipes/data/convert-csv-to-json
  - /recipes/data/convert-json-to-csv
  - /recipes/data/serialize-deserialize-data
  - /recipes/data/parse-json
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Aprende a analizar archivos Excel en Python, Java y JavaScript. Lee worksheets, formatea celdas y maneja grandes spreadsheets con ejemplos de código."
  keywords:
    - excel
    - xlsx
    - parsing
    - spreadsheet
    - python
    - javascript
    - java
---
## Visión General

Los archivos Excel (.xlsx) siguen siendo el formato dominante para reportes de negocio, exports de datos y modelado financiero. Analizar Excel programáticamente habilita ingestión automatizada de datos, generación de reportes y pipelines de validación. Esta recipe cubre lectura, escritura y formateo de spreadsheets en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Importes datos de usuarios de negocio que entregan archivos Excel en lugar de CSV
- Generes reportes formateados con múltiples hojas, gráficos y estilos
- Valides exports de datos contra bases de datos source-of-truth
- Conviertas flujos de trabajo legacy basados en Excel a pipelines automatizados

## Solución

### Python

```python
# openpyxl es el estándar para archivos .xlsx modernos
# pip install openpyxl
from openpyxl import load_workbook

wb = load_workbook('data.xlsx')
ws = wb.active

for row in ws.iter_rows(min_row=2, values_only=True):
    print(row)
```

```python
# Escribir archivos Excel
from openpyxl import Workbook

wb = Workbook()
ws = wb.active
ws.title = "Ventas"
ws.append(["Producto", "Cantidad", "Precio"])
ws.append(["Widget", 100, 19.99])
wb.save('output.xlsx')
```

### JavaScript

```javascript
// xlsx (SheetJS) es la librería Excel más popular para Node.js
// npm install xlsx
import xlsx from 'xlsx';

const workbook = xlsx.readFile('data.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet);
console.log(data);
```

```javascript
// Escribir archivos Excel
import xlsx from 'xlsx';

const ws = xlsx.utils.aoa_to_sheet([['Nombre', 'Edad'], ['Alice', 30]]);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, 'Personas');
xlsx.writeFile(wb, 'output.xlsx');
```

### Java

```java
// Apache POI es el estándar para Excel en Java
// Maven: org.apache.poi:poi-ooxml
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.FileInputStream;

public class ExcelParser {
    public static void main(String[] args) throws Exception {
        try (Workbook wb = new XSSFWorkbook(new FileInputStream("data.xlsx"))) {
            Sheet sheet = wb.getSheetAt(0);
            for (Row row : sheet) {
                for (Cell cell : row) {
                    System.out.print(cell.toString() + "\t");
                }
                System.out.println();
            }
        }
    }
}
```

## Explicación

Los archivos Excel son archivos ZIP que contienen XML siguiendo la especificación Open XML. Las librerías abstraen esta complejidad en APIs de sheet, row y cell. `openpyxl` (Python) soporta capacidades modernas de `.xlsx` como gráficos, imágenes y formato condicional. `xlsx` (JS) es ligera y soporta lectura y escritura en browser y Node.js. Apache POI (Java) es el estándar enterprise pero tiene mayor consumo de memoria.

Al leer, decide entre `values_only=True` (Python) o `sheet_to_json` (JS) para obtener valores planos, versus acceder a objetos de celda para formato, fórmulas y metadata. Para archivos grandes (>10k filas), usa lectores streaming para evitar cargar todo el workbook en memoria.

## Variantes

| Tecnología | Librería | Enfoque | Notas |
|------------|----------|---------|-------|
| Python | `openpyxl` | `load_workbook()` | Soporte completo, lee/escribe .xlsx |
| Python | `pandas` | `read_excel()` | Rápido para análisis de datos, envuelve openpyxl |
| Python | `xlrd` | `open_workbook()` | Solo .xls legacy, no recomendado para .xlsx |
| JavaScript | `xlsx` (SheetJS) | `readFile()` / `writeFile()` | Browser + Node, soporta export CSV/JSON |
| Java | `Apache POI` | `XSSFWorkbook` | Estándar enterprise, soporta fórmulas y gráficos |
| Java | `FastExcel` | API Streaming | Alternativa de baja memoria a POI para archivos grandes |

## Lo que funciona

- **Usa `read_only=True` en openpyxl** para archivos grandes solo-lectura para reducir uso de memoria
- **Valida nombres de hojas** antes de acceder; archivos provistos por usuarios pueden tener nombres inesperados
- **Maneja celdas mergeadas explícitamente**: Las librerías suelen retornar `None` para rangos mergeados excepto la celda superior-izquierda
- **Prefiere `.xlsx` sobre `.xls`**: El formato moderno tiene límites de fila mayores y mejor compresión
- **Cierra handles de archivo** con context managers (`with` en Python, try-with-resources en Java)

## Errores Comunes

- **Usar `xlrd` para archivos .xlsx**: `xlrd` eliminó soporte .xlsx en versión 2.0; usa `openpyxl` en su lugar
- **No manejar celdas con fórmulas**: Las celdas fórmula retornan `0` o `#VALUE!` a menos que se evalúen o cacheen
- **Ignorar tipos de datos**: Excel almacena fechas como números seriales; conviértelas explícitamente a `datetime`
- **Cargar workbooks enteros en memoria**: Para archivos > 50 MB, usa APIs streaming para evitar OOM
- **Hard-codear índices de columna**: Usa mapeo de fila header (e.g., `{'Nombre': 0, 'Edad': 1}`) para sobrevivir reordenamiento de columnas

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

### ¿Cómo leo archivos Excel grandes sin quedarme sin memoria?

Usa `openpyxl` con `read_only=True` en Python, `FastExcel` streaming en Java, o procesa archivos en chunks con `xlsx` en Node.js. Otra aproximación es convertir a CSV primero y luego hacer streaming del CSV, aunque pierdes formato y fórmulas.

### ¿Puedo preservar formato al escribir archivos Excel?

Sí. `openpyxl` soporta fuentes, rellenos, bordes y formatos numéricos vía el módulo `openpyxl.styles`. Apache POI tiene clases `CellStyle` y `Font`. `xlsx` (SheetJS) soporta estilos en su versión Pro; la versión community está limitada a datos raw.

### ¿Cómo manejo fechas correctamente al analizar Excel?

Excel almacena fechas como números de punto flotante (días desde 1900 o 1904). `openpyxl` retorna objetos `datetime` cuando `data_only=True` está seteado y los valores están cacheados. `pandas` convierte automáticamente columnas de fecha si se especifica `parse_dates`. En Java, usa `DataFormatter` para renderizar valores de celda como strings, luego parsea con `DateTimeFormatter`.

## Temas Avanzados

### Escenario: Parsear Excel con Formulas y Multiples Hojas

```python
import openpyxl
from openpyxl.utils import get_column_letter

# Leer workbook con formulas
wb = openpyxl.load_workbook("report.xlsx", data_only=False)

# Listar hojas
print(wb.sheetnames)  # ["Summary", "Data", "Charts"]

# Leer una hoja especifica
ws = wb["Data"]

# Iterar filas con tipos preservados
for row in ws.iter_rows(min_row=2, max_col=5, values_only=False):
    for cell in row:
        print(f"{cell.coordinate}: {cell.value} (type: {cell.data_type})")

# Leer valor calculado de una formula
wb_calc = openpyxl.load_workbook("report.xlsx", data_only=True)
ws_calc = wb_calc["Summary"]
print(ws_calc["B2"].value)  # Resultado de la formula, no la formula

# Crear nuevo Excel con formato
wb_new = openpyxl.Workbook()
ws_new = wb_new.active
ws_new.title = "Results"
ws_new.append(["Product", "Price", "Stock", "Total"])
for product in products:
    ws_new.append([product.name, product.price, product.stock, product.price * product.stock])

# Formato condicional
from openpyxl.formatting.rule import ColorScaleRule
ws_new.conditional_formatting.add("D2:D100", ColorScaleRule(
    start_type="min", start_color="FF63BE7B",
    mid_type="percentile", mid_value=50, mid_color="FFFFEB84",
    end_type="max", end_color="FFF8696B",
))

wb_new.save("results.xlsx")
```

Lecciones:
  - data_only=False: lee formulas. data_only=True: lee valores calculados
  - iter_rows: iterar eficientemente sin cargar todo en memoria
  - cell.data_type: preserva tipos (n, s, b, d, f, e)
  - Formato condicional: ColorScaleRule para heatmaps
  - Para archivos grandes (>100MB), usar openpyxl en read-only mode
  - Alternativas: pandas.read_excel (mas simple), xlrd (legacy .xls)
```

### Como manejo archivos Excel muy grandes?

Usa openpyxl en read-only mode: wb = load_workbook(filename, read_only=True). Esto usa streaming: no carga todo en memoria. Para escribir, usa write_only mode: wb = Workbook(write_only=True). Alternativa: usar pandas con chunksize: pd.read_excel(filename, sheet_name=0, chunksize=10000). Para archivos extremos (>1GB), convertir a CSV primero con libreoffice headless y luego procesar el CSV con pandas chunked.
