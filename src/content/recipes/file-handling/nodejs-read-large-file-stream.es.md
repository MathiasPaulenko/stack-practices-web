---



contentType: recipes
slug: nodejs-read-large-file-stream
title: "Procesa Archivos Grandes con Streams en Node.js Sin"
description: "Procesa archivos de GB en Node.js usando streams. Cubre readline, transform streams, pipeline, backpressure y procesamiento por chunks."
metaDescription: "Procesa archivos grandes en Node.js con streams. Readline, transform streams, pipeline, backpressure, procesamiento por chunks y parsing eficiente en memoria."
difficulty: intermediate
topics:
  - file-handling
  - performance
tags:
  - nodejs
  - streams
  - files
  - performance
  - readline
  - backpressure
relatedResources:
  - /recipes/javascript-drag-drop-file-upload
  - /recipes/javascript-service-worker-offline
  - /guides/performance-optimization-guide
  - /guides/stream-processing-guide
  - /patterns/voucher-pattern
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Procesa archivos grandes en Node.js con streams. Readline, transform streams, pipeline, backpressure, procesamiento por chunks y parsing eficiente en memoria."
  keywords:
    - nodejs read large file
    - nodejs stream file processing
    - nodejs readline large file
    - nodejs transform stream
    - nodejs pipeline backpressure
    - memory efficient file processing nodejs



---

## Visión General

Leer un archivo grande con `fs.readFile()` carga el archivo entero en memoria. Para archivos de múltiples GB, esto causa crashes de out-of-memory. Los streams procesan datos en chunks, manteniendo el uso de memoria constante sin importar el tamaño del archivo. Esta recipe cubre lectura, transformación y escritura de archivos grandes usando streams de Node.js.

## Cuándo Usar


- For alternatives, see [Implement an LRU Cache in Node.js](/es/recipes/nodejs-in-memory-cache-lru/).

- Procesas archivos más grandes que la RAM disponible (logs, CSV, JSON, datasets)
- Necesitas transformar datos mientras lees (filter, map, convert)
- Quieres uso de memoria constante sin importar el tamaño del archivo
- Parseas línea por línea o en chunks de tamaño fijo

## Solución

### Leer archivo línea por línea con readline

```javascript
const fs = require("fs");
const readline = require("readline");

async function processLineByLine(filePath) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    let lineCount = 0;
    for await (const line of rl) {
        lineCount++;
        if (lineCount % 100_000 === 0) {
            console.log(`Processed ${lineCount} lines`);
        }
    }

    console.log(`Total lines: ${lineCount}`);
}

processLineByCSV("large_file.log");
```

### Procesar CSV con transform stream

```javascript
const fs = require("fs");
const { Transform } = require("stream");

function createCsvParser() {
    return new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            const lines = chunk.toString().split("\n");
            for (const line of lines) {
                if (line.trim()) {
                    const columns = line.split(",");
                    this.push(columns);
                }
            }
            callback();
        },
    });
}

function createFilter(filterFn) {
    return new Transform({
        objectMode: true,
        transform(row, encoding, callback) {
            if (filterFn(row)) {
                this.push(row);
            }
            callback();
        },
    });
}

function createJsonStringifier() {
    return new Transform({
        objectMode: true,
        transform(row, encoding, callback) {
            this.push(JSON.stringify(row) + "\n");
            callback();
        },
    });
}

// Pipeline: leer CSV -> parsear -> filtrar -> convertir a JSON -> escribir
fs.createReadStream("data.csv")
    .pipe(createCsvParser())
    .pipe(createFilter(row => row[2] === "active"))
    .pipe(createJsonStringifier())
    .pipe(fs.createWriteStream("active_users.jsonl"));
```

### Usar pipeline para manejo de errores

```javascript
const fs = require("fs");
const { pipeline } = require("stream");

function processFile(inputPath, outputPath) {
    pipeline(
        fs.createReadStream(inputPath),
        createCsvParser(),
        createFilter(row => row[2] === "active"),
        createJsonStringifier(),
        fs.createWriteStream(outputPath),
        (err) => {
            if (err) {
                console.error("Pipeline failed:", err);
            } else {
                console.log("Pipeline succeeded");
            }
        }
    );
}

// pipeline limpia correctamente todos los streams en caso de error
processFile("data.csv", "output.jsonl");
```

### Procesamiento en lotes con async

```javascript
const fs = require("fs");
const readline = require("readline");

async function processInBatches(filePath, batchSize = 1000) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream });

    let batch = [];

    for await (const line of rl) {
        batch.push(line);

        if (batch.length >= batchSize) {
            await processBatch(batch);
            batch = [];
        }
    }

    if (batch.length > 0) {
        await processBatch(batch);
    }
}

async function processBatch(lines) {
    // ej., insertar en base de datos, llamar API, etc.
    console.log(`Processing batch of ${lines.length} lines`);
    await new Promise(resolve => setTimeout(resolve, 10));
}

processInBatches("large_file.log", 500);
```

### Transform stream con procesamiento async

```javascript
const { Transform } = require("stream");

function createAsyncTransform(processFn, concurrency = 10) {
    let pending = 0;
    let doneCallback = null;

    return new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            pending++;
            processFn(chunk)
                .then(result => {
                    if (result) this.push(result);
                })
                .catch(err => this.emit("error", err))
                .finally(() => {
                    pending--;
                    if (pending < concurrency) {
                        callback();
                    }
                    if (pending === 0 && doneCallback) {
                        doneCallback();
                    }
                });

            if (pending >= concurrency) {
                // Esperar — backpressure
            } else {
                callback();
            }
        },
        flush(callback) {
            if (pending === 0) {
                callback();
            } else {
                doneCallback = callback;
            }
        },
    });
}

// Uso — async API calls por línea con límite de concurrencia
async function enrichRow(row) {
    const response = await fetch(`https://api.example.com/user/${row[0]}`);
    const data = await response.json();
    return [...row, data.name];
}

fs.createReadStream("users.csv")
    .pipe(createCsvParser())
    .pipe(createAsyncTransform(enrichRow, 5))
    .pipe(createJsonStringifier())
    .pipe(fs.createWriteStream("enriched_users.jsonl"));
```

### Contar líneas en un archivo enorme

```javascript
const fs = require("fs");
const readline = require("readline");

function countLines(filePath) {
    return new Promise((resolve, reject) => {
        let count = 0;
        const stream = fs.createReadStream(filePath);
        const rl = readline.createInterface({ input: stream });

        rl.on("line", () => count++);
        rl.on("close", () => resolve(count));
        rl.on("error", reject);
    });
}

countLines("huge_file.log").then(count => console.log(`Lines: ${count}`));
```

### Descompresión Gzip mientras se lee

```javascript
const fs = require("fs");
const zlib = require("zlib");
const { pipeline } = require("stream");
const readline = require("readline");

async function processGzippedFile(filePath) {
    const fileStream = fs.createReadStream(filePath);
    const gunzip = zlib.createGunzip();
    const rl = readline.createInterface({ input: gunzip });

    // Manejar errores de descompresión
    gunzip.on("error", (err) => console.error("Gunzip error:", err));

    let count = 0;
    for await (const line of rl) {
        count++;
    }
    console.log(`Total lines: ${count}`);
}

processGzippedFile("large_file.log.gz");
```

### Comparación de uso de memoria

```javascript
// MAL — carga el archivo entero en memoria
// Archivo de 5GB = 5GB de RAM, probablemente crash
fs.readFile("huge.log", (err, data) => {
    const lines = data.toString().split("\n");
    console.log(lines.length);
});

// BIEN — memoria constante, procesa en chunks
// Archivo de 5GB = ~64KB de RAM en cualquier momento
const stream = fs.createReadStream("huge.log", { highWaterMark: 64 * 1024 });
const rl = readline.createInterface({ input: stream });
let count = 0;
rl.on("line", () => count++);
rl.on("close", () => console.log(count));
```

## Explicación

Los streams de Node.js procesan datos en chunks en lugar de cargar todo en memoria. La API de streams tiene cuatro tipos: Readable, Writable, Duplex y Transform.

Conceptos clave:

- **Readable stream**: Produce datos (file read stream, HTTP response). Emite eventos `data` o se puede consumir con `for await...of`.
- **Writable stream**: Consume datos (file write stream, HTTP request). Tiene métodos `write()` y `end()`.
- **Transform stream**: Readable + Writable. Transforma datos mientras pasan a través.
- **pipeline**: Conecta múltiples streams y maneja cleanup en caso de error. Siempre preferir `pipeline()` sobre cadenas manuales de `.pipe()`.
- **Backpressure**: Cuando un stream downstream no puede mantener el ritmo, señala al upstream que se ralentice. Los streams manejan esto automáticamente vía `.pipe()` y `pipeline()`.
- **highWaterMark**: Tamaño del buffer interno. Default es 64KB para streams de bytes, 16 objetos para streams objectMode. Buffers más grandes usan más memoria pero reducen system calls.
- **objectMode**: Streams que push objects en lugar de bytes. Útil para registros parseados (CSV rows, JSON objects).

## Variantes

| Enfoque | Memoria | Velocidad | Usar Cuando |
|----------|--------|-------|----------|
| fs.readFile | O(tamaño archivo) | Rápido | Archivos < 100MB |
| readline + createReadStream | O(buffer) | Medio | Archivos basados en líneas |
| Transform stream pipeline | O(buffer) | Medio | Transformar mientras se lee |
| Readable.from + async generator | O(buffer) | Flexible | Data sources personalizados |
| mmap (third-party) | O(page cache) | Rápido | Acceso aleatorio en archivos enormes |

## Pautas

- Siempre usar streams para archivos mayores a 100MB. `fs.readFile` crashea en archivos de múltiples GB.
- Usar `pipeline()` en lugar de cadenas de `.pipe()`. `pipeline` destruye streams correctamente en caso de error.
- Usar `readline` para formatos basados en líneas (logs, CSV, JSONL). Maneja line endings correctamente.
- Establecer `highWaterMark` para controlar el tamaño del buffer. Buffers más grandes mejoran throughput pero usan más memoria.
- Usar transform streams en `objectMode` para registros parseados (CSV rows, JSON objects).
- Procesar en lotes cuando se llaman APIs externas. Acumular rows y flushar en grupos.
- Manejar errores de streams con evento `error` o callback de `pipeline`. Errores no manejados crashean el proceso.
- Usar `for await...of` para async iteration moderna sobre readable streams.
- Liberar file handles cerrando streams correctamente. `pipeline` maneja esto automáticamente.

## Errores Comunes

- Usar `fs.readFile()` para archivos grandes. Carga el archivo entero en memoria, causa crashes de OOM.
- Usar `.pipe()` sin manejo de errores. Si un stream erra, otros streams leak resources. Usar `pipeline()`.
- No manejar eventos `error` en streams. Errores no manejados crashean el proceso.
- Pushear demasiado rápido en un Transform stream. Verificar el return value de `this.push()` para backpressure.
- Usar `readline` para archivos binarios. `readline` está diseñado para texto. Usar chunks raw para datos binarios.
- No establecer `objectMode` cuando se pushean objetos. Los streams por defecto son byte mode y stringify objects.
- Olvidar llamar `callback()` en Transform. El stream se cuelga esperando el callback.
- No cerrar file descriptors en caso de error. Usar `pipeline()` o `stream.destroy()` para limpiar.

## Preguntas Frecuentes

### ¿Cuál es el tamaño máximo de archivo que puedo procesar con streams?

No hay límite práctico. Los streams procesan datos en chunks, así que el uso de memoria es constante sin importar el tamaño del archivo. Puedes procesar archivos más grandes que la RAM disponible.

### ¿Debo usar .pipe() o pipeline()?

Siempre usar `pipeline()`. Destruye correctamente todos los streams cuando ocurre un error, previniendo resource leaks. `.pipe()` no forwardea errores y puede dejar streams abiertos.

### ¿Cómo manejo backpressure en un Transform stream personalizado?

Llamar `callback()` solo cuando estás listo para más datos. Si `this.push()` retorna `false`, el destination está sobrecargado. Dejar de llamar `callback()` hasta que el destination drene. El framework de streams maneja esto automáticamente en la mayoría de los casos.

### ¿Puedo procesar archivos binarios con readline?

No. `readline` está diseñado para archivos de texto con line endings. Para archivos binarios, usar chunks raw de `createReadStream` y procesarlos manualmente con operaciones de Buffer.
