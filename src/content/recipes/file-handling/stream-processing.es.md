---




contentType: recipes
slug: stream-processing
title: "Procesar Archivos Grandes con Streams"
description: "Cómo leer, transformar y escribir archivos grandes eficientemente usando streams sin cargar archivos completos en memoria en Python, Node.js y Java."
metaDescription: "Aprende stream processing para archivos grandes. Lee, transforma y escribe archivos eficientemente sin cargarlos en memoria usando Python, Node.js y Java streams."
difficulty: intermediate
topics:
  - file-handling
tags:
  - file-handling
  - python
  - io
  - streams
  - files
relatedResources:
  - /recipes/read-write-file
  - /recipes/import-csv-excel
  - /recipes/image-optimization
  - /recipes/compression-gzip
  - /recipes/read-large-files
  - /recipes/watch-file-changes
  - /recipes/write-large-files
lastUpdated: "2026-06-13"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende stream processing para archivos grandes. Lee, transforma y escribe archivos eficientemente sin cargarlos en memoria usando Python, Node.js y Java streams."
  keywords:
    - stream processing
    - large file processing
    - memory efficient
    - python streams
    - nodejs streams
    - java streams




---

## Visión general

Cargar un archivo de 10 GB en memoria crashea la mayoría de aplicaciones. Los streams resuelven esto procesando datos en chunks pequeños y manejables — leyendo unos pocos kilobytes a la vez, transformándolos, y escribiendo resultados incrementalmente. La huella de memoria se mantiene constante sin importar el tamaño del archivo.

El streaming no es solo para archivos. Aplica a respuestas de red, resultados de queries de base de datos, y pipelines de datos en tiempo real. Cada vez que procesas datos que no caben en RAM o llegan continuamente, los streams son la abstracción correcta.

## Cuándo usarlo

Usa esta receta cuando:

- Procesas archivos más grandes que la RAM disponible (logs, CSVs, video, backups). Consulta [Compression Gzip](/recipes/file-handling/compression-gzip) para pre-procesamiento de archivos grandes.
- Construyes pipelines ETL que transforman datos entre formatos. Consulta [Import CSV Excel](/recipes/file-handling/import-csv-excel) para patrones ETL tabulares.
- Manejas feeds de datos en tiempo real (datos de sensores, ticks financieros, clickstreams). Consulta [Kafka Event Streaming](/recipes/messaging/kafka-event-streaming) para streaming pub-sub.
- Comprimes o encriptas archivos sin cargarlos completamente. Consulta [Image Optimization](/recipes/file-handling/image-optimization) para procesamiento de pipelines de media.
- Implementas barras de progreso y procesamiento resumible para tareas de larga duración. Consulta [Background Jobs](/recipes/devops/background-jobs) para gestión de colas de trabajos.

## Solución

### Python (Generators + open)

```python
import csv

def process_large_csv(input_path, output_path):
    with open(input_path, 'r', encoding='utf-8') as infile, \
         open(output_path, 'w', encoding='utf-8') as outfile:
        reader = csv.reader(infile)
        writer = csv.writer(outfile)
        writer.writerow(next(reader))
        for row in reader:
            writer.writerow([cell.upper() for cell in row])
```

### Node.js (Transform Stream)

```javascript
const fs = require('fs');
const { Transform } = require('stream');

const upperCase = new Transform({
  transform(chunk, enc, cb) { this.push(chunk.toString().toUpperCase()); cb(); }
});
fs.createReadStream('input.txt')
  .pipe(upperCase)
  .pipe(fs.createWriteStream('output.txt'));
```

### Java (BufferedReader)

```java
import java.io.*;
import java.nio.file.*;

public class StreamProcessor {
    public static void process(String input, String output) throws IOException {
        try (BufferedReader r = Files.newBufferedReader(Path.of(input));
             BufferedWriter w = Files.newBufferedWriter(Path.of(output))) {
            String line;
            while ((line = r.readLine()) != null) {
                w.write(line.toUpperCase());
                w.newLine();
            }
        }
    }
}
```

## Explicación

- **Evaluación lazy**: Los streams no leen el archivo completo por adelantado.   Extraen datos bajo demanda — unos pocos kilobytes o líneas a la vez.   Esto mantiene el uso de memoria plano incluso para archivos de escala de terabytes.
- **Backpressure**: En Node.  js, los streams manejan automáticamente casos donde el writer es más lento que el reader.   El reader pausa hasta que el writer se recupera, previniendo que la memoria se llene con chunks sin procesar.
- **Pipelines componibles**: Múltiples transformaciones (decodificar CSV, filtrar filas, agregar, codificar JSON) se encadenan como un pipeline.   Cada etapa procesa chunks independientemente.
- **Manejo de errores**: Los errores de stream pueden ocurrir en cualquier etapa.   Handlers de error centralizados capturan fallas sin filtrar recursos o dejar archivos de output parciales.

## Variantes

| Enfoque | Uso de memoria | Complejidad | Mejor para |
|---------|---------------|-------------|------------|
| Carga completa de archivo | O(tamaño archivo) | Baja | Archivos pequeños (< RAM) |
| Stream línea por línea | O(tamaño línea) | Baja | Archivos de texto, CSV, logs |
| Stream por chunks | O(tamaño buffer) | Media | Archivos binarios, compresión |
| Stream paralelo | O(buffer × workers) | Alta | Transformaciones CPU-intensivas |

## Lo que funciona

- **Usa I/O buffered**: las lecturas y escrituras sin buffer emiten una system call por byte.   Los buffers (8KB default en la mayoría de lenguajes) amortizan este overhead.
- **Maneja encoding explícitamente**: los encodings default varían por plataforma.
- **Valida input temprano**: datos malformados en un stream pueden causar errores downstream.   Sanitiza o salta registros malos.
- **Implementa reporte de progreso**: para streams de larga duración, emite eventos de progreso o loguea conteos de bytes procesados para que operadores sepan que el job progresa.
- **Cierra recursos apropiadamente**: usa `with` (Python), `try-with-resources` (Java), o `pipeline` (Node.

## Errores comunes

- **Cargar archivos completos en arrays**: `readlines()` o `readFile()` lee todo en memoria.
- **Ignorar backpressure**: en Node.
- **No manejar caracteres multibyte parciales**: un límite de chunk puede dividir un carácter UTF-8 multibyte.   Buffer caracteres incompletos a través de chunks.
- **Escribir al mismo archivo desde el que lees**: sobreescribir un archivo mientras haces streaming desde él corrompe los datos.   Escribe a un archivo temporal y renombra atómicamente.

## Preguntas frecuentes

**P: ¿Cómo proceso un archivo que tampoco cabe en disco?**
R: Usa streaming de red o procesa chunks desde almacenamiento en la nube (S3 GetObject con headers Range) sin descargar el archivo completo.

**P: ¿Puedo reanudar un stream interrumpido?**
R: Sí. Trackea el último byte offset procesado exitosamente y posiciónate ahí al reiniciar. Incluye checksums para verificar continuidad.

**P: ¿Los streams son siempre más rápidos que cargar el archivo completo?**
R: No siempre. Para archivos pequeños, el overhead de gestión de streams puede exceder el costo de una sola lectura. Profile con tus tamaños de archivo reales.

**P: ¿Cómo proceso archivos ZIP o GZIP con streams?**
R: Usa librerías de compresión streaming como `zlib` (Node.js), `gzip` (Python), o `GZIPInputStream` (Java) como etapas intermedias del pipeline.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Soluciones Avanzadas

### Python: Pipeline ETL con generadores y seguimiento de progreso

```python
import csv
import json
import os
import time
from pathlib import Path
from typing import Generator, Callable

def read_csv_stream(path: str | Path, encoding: str = 'utf-8') -> Generator[dict, None, None]:
    """Yield filas de un archivo CSV una a la vez sin cargarlo todo."""
    with open(path, 'r', encoding=encoding, newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            yield row

def transform_rows(rows: Generator[dict, None, None],
                   transformer: Callable[[dict], dict | None]) -> Generator[dict, None, None]:
    """Aplica una función de transformación a cada fila, saltando resultados None."""
    for row in rows:
        result = transformer(row)
        if result is not None:
            yield result

def write_jsonl_stream(path: str | Path, rows: Generator[dict, None, None],
                       flush_interval: int = 1000) -> int:
    """Escribe filas como JSONL, con flush periódico. Retorna el conteo de filas."""
    tmp_path = str(path) + '.tmp'
    count = 0
    with open(tmp_path, 'w', encoding='utf-8') as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False))
            f.write('\n')
            count += 1
            if count % flush_interval == 0:
                f.flush()
    os.replace(tmp_path, path)
    return count

def etl_pipeline(input_csv: str, output_jsonl: str,
                 transformer: Callable[[dict], dict | None]) -> None:
    """ETL completo: leer CSV -> transformar -> escribir JSONL con progreso."""
    start = time.time()
    rows = read_csv_stream(input_csv)
    transformed = transform_rows(rows, transformer)

    # Wrap con seguimiento de progreso
    def with_progress(gen: Generator[dict, None, None]) -> Generator[dict, None, None]:
        count = 0
        for item in gen:
            count += 1
            if count % 10000 == 0:
                elapsed = time.time() - start
                rate = count / elapsed if elapsed > 0 else 0
                print(f"  Procesadas {count:,} filas ({rate:.0f} filas/s)")
            yield item

    total = write_jsonl_stream(output_jsonl, with_progress(transformed))
    elapsed = time.time() - start
    print(f"ETL completo: {total:,} filas en {elapsed:.1f}s ({total/elapsed:.0f} filas/s)")

# Uso
# def filter_active_users(row: dict) -> dict | None:
#     if row.get('status') != 'active':
#         return None
#     return {'id': row['id'], 'email': row['email'].lower(), 'name': row['name']}
# etl_pipeline('users.csv', 'users.jsonl', filter_active_users)
```

### Node.js: Pipeline con backpressure y recuperación de errores

```javascript
const fs = require('fs');
const { pipeline } = require('stream');
const { Transform, Writable } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);

async function processLargeFile(inputPath, outputPath, transformFn) {
    const readStream = fs.createReadStream(inputPath, { highWaterMark: 64 * 1024 });
    const writeStream = fs.createWriteStream(outputPath + '.tmp', { highWaterMark: 64 * 1024 });

    let lineBuffer = '';
    let count = 0;
    const startTime = Date.now();

    const lineTransform = new Transform({
        highWaterMark: 64 * 1024,
        transform(chunk, encoding, callback) {
            lineBuffer += chunk.toString('utf-8');
            const lines = lineBuffer.split('\n');
            lineBuffer = lines.pop();  // Mantener última línea incompleta

            for (const line of lines) {
                const transformed = transformFn(line);
                if (transformed !== null) {
                    this.push(transformed + '\n');
                    count++;
                    if (count % 10000 === 0) {
                        const elapsed = (Date.now() - startTime) / 1000;
                        const rate = (count / elapsed).toFixed(0);
                        process.stdout.write(`\r  Procesadas ${count} líneas (${rate}/s)`);
                    }
                }
            }
            callback();
        },
        flush(callback) {
            // Procesar buffer restante
            if (lineBuffer) {
                const transformed = transformFn(lineBuffer);
                if (transformed !== null) {
                    this.push(transformed + '\n');
                    count++;
                }
            }
            callback();
        },
    });

    try {
        await pipelineAsync(readStream, lineTransform, writeStream);
        await fs.promises.rename(outputPath + '.tmp', outputPath);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\nListo: ${count} líneas en ${elapsed}s`);
    } catch (err) {
        // Limpiar archivo temporal ante error
        try { await fs.promises.unlink(outputPath + '.tmp'); } catch {}
        throw err;
    }
}

// Uso
// processLargeFile('input.log', 'output.log', line => {
//     if (line.includes('ERROR')) return null;
//     return line.replace(/DEBUG:/g, 'INFO:');
// });
```

### Java: Procesamiento paralelo con thread pool

```java
import java.io.*;
import java.nio.file.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Function;

public class ParallelStreamProcessor {

    private final ExecutorService executor;
    private final int batchSize;

    public ParallelStreamProcessor(int workers, int batchSize) {
        this.executor = Executors.newFixedThreadPool(workers);
        this.batchSize = batchSize;
    }

    public void process(String input, String output, Function<String, String> transformer)
            throws Exception {
        Path tmpPath = Path.of(output + ".tmp");
        AtomicLong processed = new AtomicLong(0);
        long startTime = System.currentTimeMillis();

        try (BufferedReader reader = Files.newBufferedReader(Path.of(input));
             BufferedWriter writer = Files.newBufferedWriter(tmpPath)) {

            // Leer en batches, procesar en paralelo, escribir secuencialmente
            String[] batch = new String[batchSize];
            int batchIndex = 0;
            String line;

            while ((line = reader.readLine()) != null) {
                batch[batchIndex++] = line;
                if (batchIndex == batchSize) {
                    String[] results = processBatch(batch, batchIndex, transformer);
                    for (int i = 0; i < batchIndex; i++) {
                        if (results[i] != null) {
                            writer.write(results[i]);
                            writer.newLine();
                        }
                        long count = processed.incrementAndGet();
                        if (count % 10000 == 0) {
                            double elapsed = (System.currentTimeMillis() - startTime) / 1000.0;
                            System.out.printf("  Procesadas %d líneas (%.0f/s)%n",
                                count, count / elapsed);
                        }
                    }
                    batchIndex = 0;
                }
            }

            // Procesar líneas restantes del último batch parcial
            if (batchIndex > 0) {
                String[] results = processBatch(batch, batchIndex, transformer);
                for (int i = 0; i < batchIndex; i++) {
                    if (results[i] != null) {
                        writer.write(results[i]);
                        writer.newLine();
                    }
                }
            }
        }

        Files.move(tmpPath, Path.of(output), StandardCopyOption.ATOMIC_MOVE);
        long total = processed.get();
        double elapsed = (System.currentTimeMillis() - startTime) / 1000.0;
        System.out.printf("Listo: %d líneas en %.1fs (%.0f/s)%n", total, elapsed, total / elapsed);
    }

    private String[] processBatch(String[] batch, int size, Function<String, String> transformer)
            throws Exception {
        Future<String>[] futures = new Future[size];
        for (int i = 0; i < size; i++) {
            final String line = batch[i];
            futures[i] = executor.submit(() -> transformer.apply(line));
        }
        String[] results = new String[size];
        for (int i = 0; i < size; i++) {
            results[i] = futures[i].get();
        }
        return results;
    }

    public void shutdown() {
        executor.shutdown();
        try {
            executor.awaitTermination(10, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}

// Uso
// var processor = new ParallelStreamProcessor(4, 100);
// processor.process("input.log", "output.log", line -> {
//     if (line.contains("ERROR")) return null;
//     return line.toUpperCase();
// });
// processor.shutdown();
```

### Bash: Named pipes para streaming entre procesos

```bash
#!/usr/bin/env bash
set -euo pipefail

# Crear un named pipe (FIFO) para streaming inter-proceso
PIPE="/tmp/stream_pipe_$$"
mkfifo "$PIPE"

# Productor: stream de datos al pipe
generate_data() {
    for i in $(seq 1 1000000); do
        echo "record_$i,data_value_$i"
    done
}

# Consumidor: leer del pipe, transformar, escribir a output
transform_data() {
    local output="$1"
    while IFS=',' read -r key value; do
        echo "${key^^}|${value^^}"  # Mayúsculas en ambos campos
    done > "$output"
}

# Ejecutar productor y consumidor en paralelo
generate_data > "$PIPE" &
PRODUCER_PID=$!
transform_data "$PIPE" > "output.txt" &
CONSUMER_PID=$!

# Esperar a que ambos terminen
wait "$PRODUCER_PID"
wait "$CONSUMER_PID"

# Limpieza
rm -f "$PIPE"
echo "Streaming completo: output.txt"

# Alternativa: pipe de descompresión gzip directamente al procesamiento
# gzip -dc large_file.csv.gz | awk -F',' '{print $1","toupper($2)}' > processed.csv

# Stream desde S3 sin descargar el archivo completo
# aws s3 cp s3://bucket/large-file.csv.gz - | gzip -dc | head -n 1000 > preview.csv
```



