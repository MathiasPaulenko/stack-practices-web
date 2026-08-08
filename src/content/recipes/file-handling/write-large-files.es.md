---



contentType: recipes
slug: write-large-files
title: "Escribir Archivos Grandes"
description: "Cómo escribir archivos grandes de forma eficiente usando salida bufferizada y streaming."
metaDescription: "Descubre patrones eficientes para escribir archivos grandes en Python, JavaScript y Java con streams bufferizados y escritura por chunks."
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
  - /recipes/read-large-files
  - /recipes/file-upload-validation
  - /recipes/generate-pdfs
  - /recipes/stream-processing
  - /patterns/abstract-factory-pattern
  - /recipes/compress-decompress-files
  - /recipes/copy-move-files
  - /recipes/watch-file-changes
lastUpdated: "2026-06-20"
publishedAt: "2026-06-21"
author: Mathias Paulenko
seo:
  metaDescription: "Descubre patrones eficientes para escribir archivos grandes en Python, JavaScript y Java con streams bufferizados y escritura por chunks."
  keywords:
    - file-handling
    - streaming
    - python
    - javascript
    - java
    - io



---
## Visión General

Escribir datasets o logs masivos en disco requiere técnicas bufferizadas y de streaming para evitar picos de memoria y cuellos de botella de I/O. A continuacion se cubre patrones eficientes de escritura de archivos en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Generas archivos de exportación grandes (CSV, JSONL, XML) desde consultas a base de datos
- Añades registros a archivos de log en servicios de larga duración
- Transmites datos transformados a disco sin mantener todo el payload en memoria

## Solución

### Python

```python
# Escritura bufferizada de texto
with open('output.log', 'w', encoding='utf-8') as f:
    for record in data_source:
        f.write(f"{record}\n")

# Escritura binaria por chunks
with open('output.bin', 'wb') as f:
    for chunk in byte_generator():
        f.write(chunk)
```

### JavaScript

```javascript
const fs = require('fs');

// Stream writer
const stream = fs.createWriteStream('output.log');
for (const record of dataSource) {
    stream.write(`${record}\n`);
}
stream.end();

// Finalización basada en Promise
await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
});
```

### Java

```java
import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;

public class LargeFileWriter {
    // Escritor de texto bufferizado
    public void writeLines(String path, Iterable<String> lines) throws IOException {
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(path))) {
            for (String line : lines) {
                writer.write(line);
                writer.newLine();
            }
        }
    }

    // Escritor binario por chunks
    public void writeChunks(String path, Iterable<byte[]> chunks) throws IOException {
        try (FileChannel channel = FileChannel.open(Paths.get(path),
                StandardOpenOption.CREATE, StandardOpenOption.WRITE)) {
            for (byte[] chunk : chunks) {
                channel.write(ByteBuffer.wrap(chunk));
            }
        }
    }
}
```

## Explicación

Los escritores bufferizados reducen la cantidad de system calls acumulando datos en memoria antes de volcarlos a disco. Las **escrituras con streaming** procesan y emiten datos incrementalmente, manteniendo el uso de memoria constante sin importar el tamaño total de salida. **FileChannel** en Java provee transferencias directas buffer-a-canal, minimizando copias entre espacio de usuario y kernel.

## Variantes

| Tecnología | Enfoque | Notas |
|------------|---------|-------|
| Python | `tempfile` + renombrado atómico | Escribe en temp, luego mueve para seguridad ante fallos |
| JavaScript | `pipeline()` | Piping consciente de backpressure entre streams |
| Java | `FileOutputStream` con `BufferedOutputStream` | IO clásica, más simple pero ligeramente más lenta que NIO |

## Lo que funciona

1. Siempre cierra o finaliza streams para volcar buffers internos y liberar descriptores
2. Usa patrones de renombrado atómico (escribir en archivo temporal, luego renombrar) para prevenir archivos parciales ante un crash
3. Ajusta tamaños de buffer basados en el tamaño de bloque del disco (típicamente 4 KB u 8 KB)
4. Maneja errores de stream para evitar pérdida silenciosa de datos
5. Para escritores concurrentes, usa bloqueo de archivos o modos append-only

## Errores Comunes

1. Construir un string gigante en memoria antes de escribir en lugar de hacer streaming
2. Ignorar errores del stream de escritura, que pueden dejar archivos truncados
3. Usar llamadas de escritura síncronas en bucles críticos de rendimiento
4. No hacer flush antes de salir del proceso, perdiendo datos bufferizados
5. Sobrescribir archivos originales in-place sin una estrategia de backup

## Preguntas Frecuentes

### ¿Debo usar modo append o reescribir?

Usa append (`'a'` en Python, flag `'a'` en Node, `StandardOpenOption.APPEND` en Java) para logs. Usa renombrado atómico para archivos de datos que deben mantenerse consistentes.

### ¿Cómo manejo errores de disco lleno?

Captura `IOException` (Java), evento `error` en streams (JS) o `OSError` (Python). Pre-verificar espacio disponible con `shutil.disk_usage` (Python) o `fs.statvfs` (Node) puede ayudar.

### ¿Es `BufferedWriter` más rápido que `FileWriter`?

Sí. `BufferedWriter` agrupa escrituras, reduciendo syscalls. La diferencia es dramática para muchas escrituras pequeñas y negligible para escrituras de bloques grandes.

## Soluciones Avanzadas

### Python: Escritura atómica con tempfile y seguimiento de progreso

```python
import os
import tempfile
from pathlib import Path
from typing import Iterable

def atomic_write_lines(path: str | Path, lines: Iterable[str],
                       encoding: str = 'utf-8',
                       buffer_size: int = 8192) -> None:
    """Escribe líneas atómicamente: escribe en archivo temporal, luego renombra."""
    path = Path(path)
    tmp_fd, tmp_path = tempfile.mkstemp(
        dir=path.parent, suffix='.tmp', prefix=path.name
    )
    try:
        with os.fdopen(tmp_fd, 'w', encoding=encoding, buffering=buffer_size) as f:
            for line in lines:
                f.write(line)
                f.write('\n')
        os.replace(tmp_path, path)  # Atómico en POSIX y Windows
    except Exception:
        os.unlink(tmp_path)
        raise

def write_csv_streaming(path: str | Path, rows: Iterable[dict],
                        headers: list[str],
                        chunk_size: int = 10000) -> None:
    """Stream de exports CSV grandes sin cargar todas las filas en memoria."""
    import csv
    path = Path(path)
    tmp_fd, tmp_path = tempfile.mkstemp(dir=path.parent, suffix='.tmp')
    try:
        with os.fdopen(tmp_fd, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            count = 0
            for row in rows:
                writer.writerow(row)
                count += 1
                if count % chunk_size == 0:
                    f.flush()  # Flush periódico para exports de larga duración
        os.replace(tmp_path, path)
        print(f"Escritas {count} filas en {path}")
    except Exception:
        os.unlink(tmp_path)
        raise

# Uso
# atomic_write_lines('/etc/app/config.conf', generate_config())
# write_csv_streaming('/exports/users.csv', query_users(), ['id', 'name', 'email'])
```

### JavaScript: Pipeline con backpressure y seguimiento de progreso

```javascript
const { pipeline } = require('stream');
const fs = require('fs');
const { Transform } = require('stream');
const path = require('path');

async function writeLargeCsv(destPath, rowGenerator, headers) {
    const tmpPath = destPath + '.tmp';
    const writeStream = fs.createWriteStream(tmpPath, { highWaterMark: 64 * 1024 });

    // Transform stream personalizado para formateo CSV
    const csvTransform = new Transform({
        objectMode: false,
        highWaterMark: 64 * 1024,
        transform(chunk, encoding, callback) {
            const line = Array.isArray(chunk) ? chunk.join(',') : chunk;
            callback(null, line + '\n');
        },
    });

    // Escribir cabecera
    writeStream.write(headers.join(',') + '\n');

    // Stream de filas con manejo de backpressure
    let count = 0;
    for await (const row of rowGenerator) {
        const canContinue = writeStream.write(row.join(',') + '\n');
        count++;
        if (!canContinue) {
            await new Promise(resolve => writeStream.once('drain', resolve));
        }
        if (count % 10000 === 0) {
            console.log(`Progreso: ${count} filas escritas`);
        }
    }

    writeStream.end();
    await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });

    // Renombrado atómico
    await fs.promises.rename(tmpPath, destPath);
    console.log(`Listo: ${count} filas en ${destPath}`);
}

// Uso
// async function* generateRows() { for (let i = 0; i < 1000000; i++) yield [i, `user${i}`]; }
// writeLargeCsv('./users.csv', generateRows(), ['id', 'name']);
```

### Java: Escritura con memory-mapped files para archivos binarios grandes

```java
import java.io.*;
import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.file.*;
import java.util.stream.Stream;

public class LargeFileWriter {

    // Escritura memory-mapped para archivos binarios grandes
    public void writeMapped(String path, byte[] data, int chunkSize) throws IOException {
        try (FileChannel channel = FileChannel.open(
                Paths.get(path),
                StandardOpenOption.CREATE,
                StandardOpenOption.WRITE,
                StandardOpenOption.TRUNCATE_EXISTING)) {

            long position = 0;
            int offset = 0;
            while (offset < data.length) {
                int remaining = data.length - offset;
                int size = Math.min(chunkSize, remaining);
                MappedByteBuffer buffer = channel.map(
                    FileChannel.MapMode.READ_WRITE, position, size);
                buffer.put(data, offset, size);
                offset += size;
                position += size;
            }
            channel.force(true);  // Forzar flush a disco
        }
    }

    // CSV streaming con BufferedWriter y flush periódico
    public void writeCsvStreaming(String path, Stream<String[]> rows, String[] headers)
            throws IOException {
        Path tmpPath = Paths.get(path + ".tmp");
        try (BufferedWriter writer = Files.newBufferedWriter(tmpPath)) {
            writer.write(String.join(",", headers));
            writer.newLine();
            long count = 0;
            for (String[] row : (Iterable<String[]>) rows::iterator) {
                writer.write(String.join(",", row));
                writer.newLine();
                count++;
                if (count % 10000 == 0) {
                    writer.flush();
                }
            }
            System.out.println("Escritas " + count + " filas");
        }
        Files.move(tmpPath, Paths.get(path), StandardCopyOption.ATOMIC_MOVE);
    }

    // Append con bloqueo de archivo para escritores concurrentes
    public void appendWithLock(String path, String line) throws IOException {
        try (FileChannel channel = FileChannel.open(
                Paths.get(path),
                StandardOpenOption.CREATE,
                StandardOpenOption.WRITE,
                StandardOpenOption.APPEND)) {
            long position = channel.size();
            channel.lock(position, line.length() + 1, false);
            ByteBuffer buffer = ByteBuffer.wrap((line + "\n").getBytes());
            channel.write(buffer, position);
        }
    }
}
```

### Bash: Escritura de archivos grandes con dd y split

```bash
#!/usr/bin/env bash
set -euo pipefail

# Escribir un archivo grande con dd usando un tamaño de bloque específico
write_large_file() {
    local output="$1"
    local size_mb="${2:-100}"
    local block_size="${3:-1M}"

    dd if=/dev/zero of="$output" bs="$block_size" count="$size_mb" status=progress
    echo "Creado $output (${size_mb}MB)"
}

# Dividir un archivo grande en chunks más pequeños
split_large_file() {
    local input="$1"
    local prefix="${2:-chunk_}"
    local chunk_size="${3:-100M}"

    split -b "$chunk_size" -d --numeric-suffixes=1 -a 3 "$input" "$prefix"
    echo "Dividido en chunks de ${chunk_size}"
}

# Escritura atómica usando archivo temporal y renombrado
atomic_write() {
    local output="$1"
    local content="$2"
    local tmp="${output}.tmp.$$"

    printf '%s' "$content" > "$tmp"
    mv "$tmp" "$output"
    echo "Escritura atómica en $output"
}

# Stream de export de base de datos a archivo comprimido
stream_db_export() {
    local db_url="$1"
    local output="$2"

    psql "$db_url" -c "COPY (SELECT * FROM users) TO STDOUT WITH CSV HEADER" \
        | gzip -c > "${output}.tmp"
    mv "${output}.tmp" "$output"
    echo "Exportado y comprimido en $output"
}

# Uso
# write_large_file /tmp/large.bin 500 4M
# split_large_file /tmp/large.bin chunk_ 50M
# atomic_write /etc/app/config.txt "key=value"
```



