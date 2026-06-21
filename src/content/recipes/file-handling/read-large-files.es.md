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
lastUpdated: "2026-06-20"
author: "StackPractices"
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

Leer archivos de varios gigabytes en memoria de una sola vez puede bloquear aplicaciones o degradar severamente el rendimiento. Esta receta muestra técnicas eficientes en memoria para procesar archivos grandes línea por línea o en chunks en Python, JavaScript y Java.

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

## Mejores Prácticas

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
