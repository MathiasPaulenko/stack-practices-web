---
contentType: recipes
slug: python-excel-read-write
title: "Leer y Escribir Archivos Excel con Python"
description: "Cómo leer, escribir y formatear hojas de cálculo Excel usando openpyxl y pandas en Python."
metaDescription: "Lee y escribe archivos Excel en Python con openpyxl y pandas. Crea, formatea y manipula hojas de cálculo con ejemplos de código."
difficulty: intermediate
topics:
  - data
tags:
  - excel
  - python
  - pandas
  - data-processing
  - data
relatedResources:
  - /recipes/parse-csv-python-pandas
  - /recipes/convert-csv-to-json
  - /recipes/convert-json-to-csv
  - /recipes/generate-pdf-report-python
  - /recipes/merge-json-files
lastUpdated: "2026-07-01"
publishedAt: "2026-07-01"
author: Mathias Paulenko
seo:
  metaDescription: "Lee y escribe archivos Excel en Python con openpyxl y pandas. Crea, formatea y manipula hojas de cálculo con ejemplos de código."
  keywords:
    - leer excel python
    - openpyxl formato celdas
    - pandas to_excel
    - escribir xlsx python
    - python excel automation

---
## Visión General

Los archivos Excel (.xlsx) están en todas partes en el mundo empresarial. Python puede leerlos, escribirlos y formatearlos programáticamente usando openpyxl (control a nivel de celda) y pandas (operaciones a nivel de DataFrame). Esta recipe cubre ambos enfoques para tareas comunes como leer hojas, escribir datos, aplicar formato y manejar workbooks con múltiples hojas.

## Cuándo Usar

- Necesitas leer datos de archivos Excel exportados por herramientas empresariales
- Estás generando reportes Excel desde una base de datos o API
- Necesitas formatear celdas (colores, bordes, formatos numéricos) programáticamente
- Estás automatizando un workflow que involucra múltiples hojas Excel

## Solución

### Leer Excel con pandas

```python
import pandas as pd

# Leer una sola hoja
df = pd.read_excel("data.xlsx", sheet_name="Sheet1")
print(df.head())
print(df.columns)

# Leer todas las hojas a un dict de DataFrames
sheets = pd.read_excel("data.xlsx", sheet_name=None)
for name, df in sheets.items():
    print(f"Sheet: {name}, rows: {len(df)}")
```

### Escribir Excel con pandas

```python
import pandas as pd

df = pd.DataFrame({
    "name": ["Alice", "Bob", "Charlie"],
    "score": [85, 92, 78],
})

# Escritura básica
df.to_excel("output.xlsx", index=False, sheet_name="Results")

# Múltiples hojas
with pd.ExcelWriter("report.xlsx") as writer:
    df.to_excel(writer, sheet_name="Summary", index=False)
    df[df["score"] > 80].to_excel(writer, sheet_name="High Scores", index=False)
```

### Control a nivel de celda con openpyxl

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

wb = Workbook()
ws = wb.active
ws.title = "Report"

# Fila de header con estilos
headers = ["Name", "Score", "Grade"]
header_fill = PatternFill(start_color="1a56db", end_color="1a56db", fill_type="solid")
header_font = Font(color="FFFFFF", bold=True)

for col, header in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col, value=header)
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = Alignment(horizontal="center")

# Filas de datos
data = [("Alice", 85, "B"), ("Bob", 92, "A"), ("Charlie", 78, "C")]
for row_idx, (name, score, grade) in enumerate(data, 2):
    ws.cell(row=row_idx, column=1, value=name)
    ws.cell(row=row_idx, column=2, value=score)
    ws.cell(row=row_idx, column=3, value=grade)

# Auto-ajustar columnas
for col in ws.columns:
    max_length = max(len(str(cell.value or "")) for cell in col)
    ws.column_dimensions[col[0].column_letter].width = max_length + 2

wb.save("formatted_report.xlsx")
```

### Leer con openpyxl

```python
from openpyxl import load_workbook

wb = load_workbook("data.xlsx", data_only=True)  # data_only lee valores computados
ws = wb["Sheet1"]

for row in ws.iter_rows(min_row=1, max_row=5, values_only=True):
    print(row)

# Acceder a una celda específica
print(ws["A1"].value)
```

### Agregar fórmulas

```python
from openpyxl import Workbook

wb = Workbook()
ws = wb.active

ws["A1"] = 10
ws["A2"] = 20
ws["A3"] = 30
ws["A4"] = "=SUM(A1:A3)"
ws["A5"] = "=AVERAGE(A1:A3)"

wb.save("formulas.xlsx")
```

## Explicación

pandas usa openpyxl por debajo al leer y escribir archivos .xlsx. Usa pandas para operaciones centradas en datos (filtrado, agrupación, joins) y openpyxl cuando necesitas control a nivel de celda (formato, fórmulas, celdas combinadas, gráficos).

Diferencias clave:
- `pd.read_excel` retorna un DataFrame. Bueno para análisis pero pierde formato.
- `openpyxl.load_workbook` preserva formato y te da objetos celda. Más lento para archivos grandes.
- `pd.ExcelWriter` con `engine="openpyxl"` te permite escribir DataFrames preservando el formato de un workbook existente.

## Variantes

| Librería | Nivel | Mejor Para | Dependencias |
|---------|-------|------------|--------------|
| pandas | DataFrame | Análisis de datos, lectura/escritura masiva | `pandas`, `openpyxl` |
| openpyxl | Celda | Formato, fórmulas, gráficos | `openpyxl` |
| xlsxwriter | Celda | Solo escritura, gráficos, formato condicional | `xlsxwriter` |
| xlrd | Solo lectura | Archivos .xls legacy | `xlrd` |

## Pautas

- Usa pandas para leer y escribir datos. Usa openpyxl para formato y fórmulas.
- Siempre pasa `index=False` a `to_excel` a menos que necesites la columna de índice.
- Usa `data_only=True` con `load_workbook` para leer valores computados en vez de strings de fórmula.
- Define anchos de columna explícitamente. openpyxl no auto-ajusta columnas.
- Usa `pd.ExcelWriter` context manager para escribir múltiples hojas en un archivo.

## Errores Comunes

- Olvidar instalar openpyxl. pandas lo necesita como engine para archivos .xlsx.
- Usar `openpyxl` para archivos grandes (10k+ filas). Es lento; usa pandas para operaciones masivas.
- No pasar `data_only=True` al leer fórmulas. Obtienes el string de fórmula en vez del resultado.
- Sobrescribir un workbook existente con `to_excel`. Reemplaza el archivo; usa `ExcelWriter` con `mode="a"` para agregar.
- Ignorar formatos numéricos. Excel puede mostrar fechas y números distinto a lo que Python espera.

## Cuando No Usar Este Enfoque

- **Datos de streaming en tiempo real**: si los datos llegan continuamente en chunks pequeÃ±os, el parsing batch es el modelo equivocado.
- **Archivos mas grandes que la RAM disponible**: parsear un CSV de 50GB con pandas.  read_csv() crashea con MemoryError.
- **Consultas estructuradas a base de datos**: si la fuente de datos es una base de datos, extraer a CSV/JSON primero y luego parsear es desperdicio.
- **Lookups simples key-value**: para leer un archivo de config pequeÃ±o (10-20 keys), un parser completo es excesivo.  loads() o csv.
- **Formatos binarios con librerias dedicadas**: si el archivo es Parquet, Avro u ORC, no lo parsees como CSV/JSON.
- **Compliance regulatorio que requiere audit trails**: si el procesamiento de datos debe producir un audit trail, los scripts de parsing ad-hoc carecen de trazabilidad.

## Benchmarks de Rendimiento

- **Throughput de parsing CSV**: el modulo csv de Python procesa 100-500 MB/s para rows simples.   pandas.  read_csv() logra 200-800 MB/s con engine='c'.
- **Latencia de parsing JSON**: json.  loads() en Python parsea 10MB JSON en 50-200ms.   orjson parsea el mismo archivo en 10-30ms.   JSON.
- **Parsing Excel**: openpyxl lee un Excel de 10,000 rows en 2-5 segundos.   pandas.  read_excel() con engine openpyxl toma 3-8 segundos.   xlrd (legacy .
- **Parsing XML**: ElementTree parsea 1MB XML en 10-50ms.   lxml (basado en C) parsea el mismo archivo en 2-10ms.
- **Uso de memoria**: pandas.   Un CSV de 100MB se convierte en 500MB-1GB en un DataFrame.
- **Parsing paralelo**: leer 4 archivos CSV en paralelo con concurrent.  futures.  ThreadPoolExecutor logra 3x throughput en maquinas de 4 cores.

## Estrategia de Testing

- **Test con input malformado**: verifica que el parser maneje rows rotos, columnas faltantes, errores de encoding (BOM, UTF-16) y archivos vacios sin crashear.
- **Test de fidelidad round-trip**: parsea un archivo, serializa de vuelta, y compara.
- **Test con archivos grandes**: crea un archivo sintetico de 1GB+ y verifica que el parser complete dentro de los limites de memoria.
- **Test de manejo de encoding**: verifica que el parser maneje UTF-8, UTF-16, Latin-1 y archivos con BOM.
- **Test de inferencia de delimitador**: Verifica que csv.
- **Test de acceso concurrente**: si multiples procesos parsean el mismo archivo, verifica que no haya race conditions.

## Estimacion de Costos

- **Costo de compute**: parsear 1TB de archivos CSV en una VM cloud cuesta -10 en compute (dependiendo del tipo de instancia).
- **Costo de memoria**: el parsing en memoria de archivos grandes requiere instancias high-memory.   Un CSV de 10GB necesita una instancia de 32GB+ RAM (.  50-2.  00/hora en AWS).   La lectura en chunks reduce esto a instancias de 4GB (.  10-0.
- **Costo de almacenamiento**: los archivos JSON intermedios son 2-5x mas grandes que CSV.   Convertir 1TB CSV a JSON requiere 2-5TB almacenamiento (-50/mes en S3).
- **Tiempo de desarrollo**: escribir un parser robusto con manejo de errores, deteccion de encoding y type inference toma 4-8 horas.
- **Infraestructura para jobs batch**: los jobs de parsing programados necesitan una instancia de compute, job scheduler y alerting de errores.

## Monitoring y Observabilidad

- **Tasa de errores de parsing**: Alerta cuando la tasa de error excede 1% del total.
- **Duracion de parsing**: Un aumento de 3x desde el baseline indica archivos mas grandes o degradacion de performance.
- **Uso de memoria durante parsing**: monitorea el peak de memoria durante el parsing de archivos.
- **Validacion de conteo de rows**: Una caida significativa indica perdida silenciosa de datos.
- **Deteccion de schema drift**: loguea nombres de columnas y tipos en cada parse.   Alerta cuando columnas aparecen, desaparecen o cambian de tipo.

## Deployment Checklist

- [ ] Setear limites de tamaÃ±o de archivo: rechazar archivos mas grandes que el maximo configurado (ej. 10GB) para prevenir OOM. Retornar HTTP 413 para uploads via API
- [ ] Configurar deteccion de encoding: usa chardet o cchardet para deteccion automatica de encoding. Default a UTF-8 pero falla a Latin-1 para archivos legacy
- [ ] Setear limites de memoria: usa lectura en chunks para archivos >500MB. Configura chunksize en pandas o stream line-by-line para CSV
- [ ] Implementar logica de retry: errores I/O transitorios (network storage, S3) requieren exponential backoff. Setea max 3 retries con delays de 5-30 segundos
- [ ] Configurar manejo de errores: decide si saltar rows malas (loguear y continuar) o fail fast. Para pipelines de datos, saltar con logging es usualmente preferido
- [ ] Setear timeouts: el parsing debe tener una duracion maxima. Mata procesos que excedan 2x el tiempo esperado de parse para prevenir agotamiento de recursos

## Consideraciones de Seguridad

- **Zip bomb via archivos comprimidos**: un ZIP de 10MB puede descomprimirse a 100GB.   Setea limites de tamaÃ±o descomprimido antes de extraer.
- **Inyeccion XXE (XML External Entity)**: los parsers XML que resuelven entidades externas pueden leakear archivos locales o realizar SSRF.
- **Inyeccion de formulas via CSV**: archivos Excel y CSV pueden contener formulas empezando con =, +, - o @.   Al abrirse en Excel, estas ejecutan formulas arbitrarias.
- **Path traversal via nombres de archivo**: si los nombres de archivo vienen de input del usuario, ..  /..  /etc/passwd puede escapar del directorio intencionado.  path.  basename() o pathlib.  Path.
- **Agotamiento de memoria via archivos grandes**: un atacante puede subir un archivo de 100GB para crashear el parser.
- **Inyeccion de codigo via eval en datos parseados**: si los datos parseados se pasan a eval(), exec() o Function(), un atacante puede inyectar codigo arbitrario.   Nunca evalues datos parseados.
- **Bypass basado en encoding**: encoding UTF-7 o UTF-16 puede bypassar filtros de seguridad que esperan UTF-8.
- **Contenido PDF malicioso**: archivos PDF pueden contener JavaScript, archivos embebidos o acciones de launch.
- **Inyeccion de logs via newlines en datos parseados**: si los datos parseados se escriben a archivos de log, newlines embebidos pueden forjar entradas de log.
- **Agotamiento de recursos via estructuras profundamente anidadas**: JSON o XML con 10,000+ niveles de nesting causa stack overflow en parsers recursivos.
## Variantes y Alternativas

- **Parsers streaming vs batch**: los parsers streaming (SAX, StAX, ijson) procesan dato por dato con memoria O(1).   Los parsers batch (DOM, ElementTree, json.  loads) cargan todo en memoria.
- **Formatos columnares vs row-based**: Parquet y ORC almacenan datos columna por columna, habilitando column pruning y 10-50x mejor compresion para queries analiticos.
- **Formatos binarios vs texto**: Protocol Buffers, Avro y MessagePack son 3-10x mas pequeÃ±os que JSON/CSV y parsean 2-5x mas rapido.
- **I/O mapeado a memoria vs I/O bufferizado**: mmap mapea archivos directamente al espacio de direcciones del proceso, evitando overhead de copia.
- **Estrategias de parsing paralelo**: divide archivos grandes por byte ranges y parsea chunks en paralelo.   Para CSV, encuentra boundaries de newline antes de dividir.
- **Enfoques hibridos**: usa un scanner rapido para extraer metadata (headers, conteo de rows, schema) antes del parsing completo.

## Pitfalls Comunes en Produccion

- **Fallos de deteccion de encoding**: Para archivos <1KB, defaulta a UTF-8 en lugar de depender de deteccion.
- **Inconsistencia de delimitadores**: archivos CSV europeos usan punto y coma.   Archivos US usan comma.   Archivos tab-delimited de Excel usan tabs.   Siempre detecta el delimitador con csv.
- **Manejo de campos entre comillas**: campos CSV que contienen el delimitador deben ir entre comillas.   Las comillas embebidas deben duplicarse.
- **Ambiguedad de formato de fecha**:  1/02/2024 es 2 de enero en US y 1 de febrero en Europa.   Siempre parsea fechas con format strings explicitos.
- **Precision de floating-point en CSV**: escribir  .  1 a CSV y leerlo de vuelta puede producir  .  10000000000000001.
- **Presion de memoria por archivos Excel grandes**: openpyxl carga el workbook entero en memoria.   Un Excel de 50MB puede usar 500MB+ de RAM.
ead_only=True o la API streaming de openpyxl para workbooks grandes
## Patrones de Integracion

- **Integracion con pipeline ETL**: Lee de archivos (extract), transforma con pandas/Polars (transform), escribe a base de datos o data warehouse (load).
- **Procesamiento de archivos via API**: Retorna un job ID para status polling.
- **Procesamiento batch vs micro-batch**: batch processing corre nocturnamente en todos los archivos.   Micro-batch procesa archivos cada 15-30 minutos.   Micro-batch reduce latencia pero aumenta costo de infraestructura.
- **Integracion con schema registry**: registra schemas de archivos en un schema registry (Confluent, Apicurio).   Valida archivos contra el registry antes de procesar.
- **Patron data lake**: Escribe resultados a un data warehouse (Snowflake, BigQuery).
- **Procesamiento de archivos event-driven**: cuando un archivo llega a S3, S3 Event Notifications triggera una funcion Lambda.   La funcion parsea el archivo y escribe resultados a una base de datos.

## Manejo de Errores y Recuperacion

- **Procesamiento parcial de archivos**: si un archivo tiene 10,000 rows y la row 5,000 esta malformada, procesa rows 1-4,999, loguea el error, salta la row 5,000, y continua con rows 5,001-10,000.
- **Dead letter queue para archivos**: archivos que fallan al procesarse van a una dead letter queue (S3 bucket, message queue).   Un proceso separado los reintenta con exponential backoff.
- **Checkpointing para archivos grandes**: registra el byte offset del ultimo procesado exitosamente.   Si el procesamiento crashea, resumea desde el checkpoint en lugar de reprocesar el archivo entero.
- **Procesamiento idempotente de archivos**: procesar el mismo archivo dos veces debe producir el mismo resultado.
- **Circuit breaker para dependencias externas**: si la fuente de archivos (FTP, S3, API) esta caida, abre un circuit breaker despues de 5 fallos consecutivos.   Deja de intentar lecturas por 5 minutos, luego prueba de nuevo.
- **Degradacion graceful**: si un parser no critico falla (ej.   extraccion de metadata), continua procesando con los datos core.   Loguea el fallo pero no bloquees el pipeline.
## Tooling y Ecosistema

- **pandas**: la libreria estandar de Python para datos tabulares.   50M+ downloads/mes.   El overhead de memoria es 5-10x el tamaÃ±o del archivo.
- **Polars**: 2-10x mas rapido que pandas con lazy evaluation.   Escrito en Rust.   Menor uso de memoria.   Reemplazo drop-in para la mayoria de operaciones de pandas.
- **DuckDB**: base de datos analitica in-process.   Queryea CSV/Parquet/JSON directamente con SQL.   Sin servidor.   2-5x mas rapido que pandas para queries de agregacion.
- **Apache Arrow**: formato columnar in-memory.   Lecturas zero-copy desde Parquet.   Agnostico del lenguaje (Python, R, Java, JS).   Fundacion para tools modernos de datos (pandas 2.
- **jq**: procesador de JSON command-line.   Filtra, transforma y queryea JSON con un DSL compacto.   Esencial para pipelines de shell y debugging de respuestas API.
- **csvkit**: herramientas command-line para archivos CSV.   csvstat muestra estadisticas, csvcut selecciona columnas, csvjoin mergea archivos.

## Resumen de Best Practices


- For a deeper guide, see [Parse CSV Files with Python and Pandas](/es/recipes/parse-csv-python-pandas/).

- Siempre especifica encoding explicitamente (encoding='utf-8'). Nunca confies en defaults del sistema
- Usa lectura en chunks para archivos >500MB. Setea chunksize en pandas o itera line-by-line
- Valida la estructura del archivo antes del parsing completo. Chequea headers, conteo de rows y tamaÃ±o del archivo
- Loguea errores de parse con nombre de archivo, numero de linea y mensaje de error para debugging
- Usa parsers streaming (SAX, ijson) para archivos >1GB para mantener memoria constante
- Comprime archivos intermedios con gzip o zstd. Parquet es 10-20x mas pequeÃ±o que CSV



## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de excel y python para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica leer y escribir archivos excel con python** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Preguntas Frecuentes

### ¿Cómo leo un rango específico de celdas?

Con openpyxl, usa `ws.iter_rows(min_row=2, max_row=10, min_col=1, max_col=3, values_only=True)`. Con pandas, usa los parámetros `usecols` y `skiprows`.

### ¿Cómo agrego formato condicional?

Usa `openpyxl.formatting.rule` o `xlsxwriter`. Por ejemplo, color scales y data bars son soportados via `ColorScaleRule` y `DataBarRule`.

### ¿Cómo manejo archivos .xls (legacy)?

Usa `xlrd` para leer y `xlwt` para escribir. pandas los soporta con `engine="xlrd"` y `engine="xlwt"`. Nota que xlrd dejó de soportar .xlsx en la versión 2.0.

### ¿Puedo crear gráficos en Excel con Python?

Sí. `openpyxl.chart` soporta gráficos de barras, líneas y pie. `xlsxwriter` también soporta gráficos con una API similar.

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos que deberían ser configurables por entorno.
- Olvidar agregar logging y monitoreo en cada paso.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar caché o procesamiento por lotes.
- No documentar la versión y configuración usadas en producción.
- Dejar la receta sin cambios cuando evolucionan las dependencias o la escala.
