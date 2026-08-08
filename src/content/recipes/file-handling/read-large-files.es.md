---



contentType: recipes
slug: read-large-files
title: "Leer Archivos Grandes"
description: "Cómo leer archivos grandes de forma eficiente sin agotar la memoria."
metaDescription: "Aprende técnicas eficientes en memoria para leer archivos grandes en Python, JavaScript y Java usando streaming y procesamiento por chunks."
difficulty: intermediate
topics:
  - file-handling
tags:
  - file-handling
  - streaming
  - python
  - javascript
  - java
  - io
relatedResources:
  - /recipes/file-upload-validation
  - /recipes/generate-pdfs
  - /recipes/stream-processing
  - /patterns/abstract-factory-pattern
  - /patterns/adapter-pattern
  - /recipes/compress-decompress-files
  - /recipes/copy-move-files
  - /recipes/generate-temporary-files
  - /recipes/python-image-resize-batch
  - /recipes/rotate-log-files
  - /recipes/watch-file-changes
  - /recipes/write-large-files
lastUpdated: "2026-06-20"
publishedAt: "2026-06-21"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende técnicas eficientes en memoria para leer archivos grandes en Python, JavaScript y Java usando streaming y procesamiento por chunks."
  keywords:
    - file-handling
    - streaming
    - python
    - javascript
    - java
    - io



---
## Visión General

Leer archivos de varios gigabytes en memoria de una sola vez puede bloquear aplicaciones o degradar severamente el rendimiento. Lo siguiente demuestra técnicas eficientes en memoria para procesar archivos grandes línea por línea o en chunks en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Procesas archivos de log, volcados CSV o datasets mayores que la RAM disponible
- Construyes pipelines ETL que ingieren archivos masivos
- Transmites contenido de archivos para evitar bloquear el event loop o el heap

## Solución

### Python

```python
# Streaming línea por línea (eficiente en memoria)
with open('large-file.log', 'r', encoding='utf-8') as f:
    for line in f:
        process(line)

# Lectura binaria por chunks
chunk_size = 1024 * 1024  # 1 MB
with open('large-file.bin', 'rb') as f:
    while chunk := f.read(chunk_size):
        process(chunk)
```

### JavaScript

```javascript
const fs = require('fs');
const readline = require('readline');

// Línea por línea con readline (Node.js)
const stream = fs.createReadStream('large-file.log');
const rl = readline.createInterface({ input: stream });

for await (const line of rl) {
    console.log(line);
}

// Lectura por chunks
const readable = fs.createReadStream('large-file.bin', { highWaterMark: 1024 * 1024 });
readable.on('data', chunk => process(chunk));
```

### Java

```java
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;

public class LargeFileReader {
    // Línea por línea
    public void readLines(String path) throws IOException {
        try (BufferedReader reader = new BufferedReader(new FileReader(path))) {
            String line;
            while ((line = reader.readLine()) != null) {
                process(line);
            }
        }
    }

    // Lectura por chunks con memory mapping
    public void readChunks(String path) throws IOException {
        try (FileChannel channel = FileChannel.open(Paths.get(path), StandardOpenOption.READ)) {
            ByteBuffer buffer = ByteBuffer.allocateDirect(1024 * 1024);
            while (channel.read(buffer) > 0) {
                buffer.flip();
                process(buffer);
                buffer.clear();
            }
        }
    }

    private void process(Object data) {}
}
```

## Explicación

El **streaming línea por línea** mantiene solo una línea en memoria a la vez, ideal para logs de texto y archivos CSV. La **lectura por chunks** procesa bloques de bytes de tamaño fijo, adecuada para datos binarios o cuando necesitas controlar el tamaño del buffer. Los **archivos mapeados en memoria** (Java) dejan que el SO maneje el paging directamente, a menudo más rápido para acceso aleatorio pero usa espacio de direcciones virtuales.

## Variantes

| Tecnología | Enfoque | Notas |
|------------|---------|-------|
| Python | Módulo `mmap` | Mapea archivo a memoria; el SO maneja paging |
| JavaScript | Web Streams API | `ReadableStream.getReader()` en navegadores |
| Java | `Files.lines()` | Stream<String> lazy; auto-cierre |

## Lo que funciona

1. Siempre usa `with` (Python), `try-with-resources` (Java) o manejo de errores en pipes (JS) para evitar fugas de descriptores de archivo
2. Elige tamaños de buffer basados en la longitud promedio de línea; 1 MB es un valor razonable por defecto
3. Para CSV/JSONL, parsea incrementalmente en lugar de cargar toda la estructura
4. Monitorea el uso de memoria con herramientas del SO para verificar el comportamiento de streaming
5. Usa `mmap` cuando necesites acceso aleatorio sin cargar todo el archivo

## Errores Comunes

1. Llamar `read()` o `readFileSync()` en archivos grandes carga todo en RAM
2. Olvidar manejar errores de encoding, que rompen streams a mitad de archivo
3. Usar tamaños de chunk demasiado pequeños, causando overhead excesivo de syscalls
4. No cerrar handles de archivo, provocando errores de "demasiados archivos abiertos"
5. Ignorar backpressure al pipear a consumidores lentos

## Preguntas Frecuentes

### ¿Qué tan grande es "grande"?

Cualquier archivo que se acerque o exceda el heap/RAM del proceso (ej. >500 MB en un contenedor de 2 GB). El streaming es económico; prefírelo siempre para archivos de más de unos pocos megabytes.

### ¿Funciona línea por línea para archivos binarios?

No. Los archivos binarios deben leerse con chunks de bytes. Los enfoques basados en líneas asumen delimitadores de nueva línea y encoding de texto.

### ¿Es memory mapping más rápido que streaming?

Para acceso secuencial, usualmente no de forma dramática. El memory mapping brilla en patrones de acceso aleatorio o cuando múltiples procesos comparten el mismo archivo.

## Soluciones Avanzadas

### Python: Generadores para procesamiento lazy con seguimiento de progreso

```python
import os
from pathlib import Path
from typing import Iterator

def read_lines_lazy(path: str, encoding: str = 'utf-8') -> Iterator[str]:
    """Yield líneas una a la vez. El uso de memoria es O(1) sin importar el tamaño del archivo."""
    with open(path, 'r', encoding=encoding) as f:
        for line in f:
            yield line.rstrip('\n\r')

def read_chunks(path: str, chunk_size: int = 1024 * 1024) -> Iterator[bytes]:
    """Yield chunks binarios. El uso de memoria es O(chunk_size)."""
    with open(path, 'rb') as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            yield chunk

def process_with_progress(path: str, process_fn, encoding: str = 'utf-8') -> int:
    """Procesa archivo línea por línea con seguimiento de progreso. Retorna conteo de líneas."""
    file_size = os.path.getsize(path)
    bytes_read = 0
    line_count = 0

    with open(path, 'r', encoding=encoding) as f:
        for line in f:
            process_fn(line.rstrip('\n\r'))
            bytes_read += len(line.encode(encoding))
            line_count += 1
            if line_count % 10000 == 0:
                pct = (bytes_read / file_size) * 100 if file_size > 0 else 0
                print(f"Progreso: {pct:.1f}% ({line_count} líneas)")
    return line_count

def read_csv_streaming(path: str, encoding: str = 'utf-8'):
    """Stream filas CSV sin cargar el archivo completo. Retorna iterador de dicts."""
    import csv
    with open(path, 'r', encoding=encoding, newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            yield row

def read_jsonl_streaming(path: str, encoding: str = 'utf-8'):
    """Stream JSONL (un objeto JSON por línea) sin cargar el archivo completo."""
    import json
    for line in read_lines_lazy(path, encoding):
        if line.strip():
            yield json.loads(line)

# Uso
# for line in read_lines_lazy('10gb.log'):
#     if 'ERROR' in line:
#         print(line)
# count = process_with_progress('large.log', lambda l: None)
# for row in read_csv_streaming('data.csv'):
#     process_row(row)
```

### Node.js: Streaming con backpressure y recuperación de errores

```javascript
const fs = require('fs');
const readline = require('readline');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipe = promisify(pipeline);

async function readLinesProcess(path, processFn) {
    const stream = fs.createReadStream(path, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let count = 0;
    for await (const line of rl) {
        await processFn(line);
        count++;
    }
    return count;
}

async function readChunksProcess(path, processFn, chunkSize = 1024 * 1024) {
    const stream = fs.createReadStream(path, { highWaterMark: chunkSize });
    let totalBytes = 0;

    for await (const chunk of stream) {
        await processFn(chunk);
        totalBytes += chunk.length;
    }
    return totalBytes;
}

async function streamToTransform(srcPath, destPath, transformFn) {
    const src = fs.createReadStream(srcPath, { encoding: 'utf-8' });
    const dest = fs.createWriteStream(destPath, { encoding: 'utf-8' });

    const { Transform } = require('stream');
    let lineBuffer = '';

    const transform = new Transform({
        transform(chunk, encoding, callback) {
            lineBuffer += chunk;
            const lines = lineBuffer.split('\n');
            lineBuffer = lines.pop();
            for (const line of lines) {
                const result = transformFn(line);
                if (result !== null) this.push(result + '\n');
            }
            callback();
        },
        flush(callback) {
            if (lineBuffer) {
                const result = transformFn(lineBuffer);
                if (result !== null) this.push(result + '\n');
            }
            callback();
        },
    });

    await pipe(src, transform, dest);
}

// Uso
// const count = await readLinesProcess('large.log', async (line) => {
//     if (line.includes('ERROR')) console.error(line);
// });
// console.log(`Procesadas ${count} líneas`);
// await streamToTransform('input.log', 'output.log', line => line.toUpperCase());
```

### Java: Archivos NIO mapeados en memoria y procesamiento paralelo de líneas

```java
import java.io.*;
import java.nio.*;
import java.nio.channels.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.stream.Stream;

public class AdvancedFileReader {

    // Lectura de archivo mapeado en memoria para acceso aleatorio
    public static void readMapped(String path, long chunkSize) throws IOException {
        try (FileChannel channel = FileChannel.open(Paths.get(path), StandardOpenOption.READ)) {
            long fileSize = channel.size();
            long position = 0;
            while (position < fileSize) {
                long remaining = fileSize - position;
                long mapSize = Math.min(chunkSize, remaining);
                MappedByteBuffer buffer = channel.map(
                    FileChannel.MapMode.READ_ONLY, position, mapSize
                );
                processBuffer(buffer);
                position += mapSize;
            }
        }
    }

    private static void processBuffer(MappedByteBuffer buffer) {
        buffer.load();
        while (buffer.hasRemaining()) {
            byte b = buffer.get();
            // Procesar byte
        }
    }

    // Procesamiento paralelo de líneas con Files.lines()
    public static long processLinesParallel(String path,
                                            java.util.function.Consumer<String> processor)
            throws IOException {
        try (Stream<String> lines = Files.lines(Paths.get(path), StandardCharsets.UTF_8)) {
            return lines.parallel()
                .peek(processor)
                .count();
        }
    }

    // Lectura bufferizada con tamaño de buffer configurable
    public static int readBuffered(String path, int bufferSize,
                                   java.util.function.Consumer<String> lineHandler)
            throws IOException {
        int count = 0;
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(
                    new FileInputStream(path), StandardCharsets.UTF_8), bufferSize)) {
            String line;
            while ((line = reader.readLine()) != null) {
                lineHandler.accept(line);
                count++;
            }
        }
        return count;
    }

    // Leer archivo en chunks usando NIO
    public static long readChunksNIO(String path, int chunkSize) throws IOException {
        long totalBytes = 0;
        try (SeekableByteChannel channel = Files.newByteChannel(
                Paths.get(path), StandardOpenOption.READ)) {
            ByteBuffer buffer = ByteBuffer.allocateDirect(chunkSize);
            while (channel.read(buffer) > 0) {
                buffer.flip();
                totalBytes += buffer.remaining();
                buffer.clear();
            }
        }
        return totalBytes;
    }
}

// Uso
// AdvancedFileReader.readMapped("large.bin", 1024 * 1024 * 100); // chunks de 100MB
// long count = AdvancedFileReader.processLinesParallel("large.log",
//     line -> { if (line.contains("ERROR")) System.err.println(line); });
// int lines = AdvancedFileReader.readBuffered("data.csv", 65536, System.out::println);
```

### Bash: Lectura eficiente de archivos con while-read y awk

```bash
#!/usr/bin/env bash
set -euo pipefail

# Leer línea por línea (eficiente en memoria, maneja caracteres especiales)
read_lines() {
    local file="$1"
    while IFS= read -r line || [[ -n "$line" ]]; do
        echo "$line"
    done < "$file"
}

# Procesar con awk (lo más rápido para procesamiento de texto)
process_with_awk() {
    local file="$1"
    local pattern="${2:-ERROR}"
    awk -v pat="$pattern" '$0 ~ pat { count++ } END { print count " coincidencias" }' "$file"
}

# Leer en chunks usando dd (para archivos binarios)
read_chunks_dd() {
    local file="$1"
    local chunk_size="${2:-1048576}"  # 1MB default
    local offset=0
    local file_size
    file_size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file")
    while (( offset < file_size )); do
        dd if="$file" bs="$chunk_size" skip=$((offset / chunk_size)) count=1 2>/dev/null
        offset=$((offset + chunk_size))
    done
}

# Contar líneas eficientemente (wc -l es más rápido que while-read)
count_lines() {
    local file="$1"
    wc -l < "$file" | tr -d ' '
}

# Filtrar y contar en una pasada (evitar múltiples lecturas)
filter_and_count() {
    local file="$1"
    local pattern="$2"
    grep -c "$pattern" "$file"
}

# Leer rango específico de líneas (sed para rangos pequeños, tail+head para grandes)
read_line_range() {
    local file="$1"
    local start="$2"
    local end="$3"
    sed -n "${start},${end}p" "$file"
}

# Uso
# read_lines large.log | head -100
# process_with_awk large.log ERROR
# count_lines large.log
# read_line_range large.log 1000 1010
```



