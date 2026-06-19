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
relatedResources:
  - /recipes/read-write-file
  - /recipes/import-csv-excel
  - /recipes/image-optimization
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
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

- Procesas archivos más grandes que la RAM disponible (logs, CSVs, video, backups)
- Construyes pipelines ETL que transforman datos entre formatos
- Manejas feeds de datos en tiempo real (datos de sensores, ticks financieros, clickstreams)
- Comprimes o encriptas archivos sin cargarlos completamente
- Implementas barras de progreso y procesamiento resumible para tareas de larga duración

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

- **Evaluación lazy**: Los streams no leen el archivo completo por adelantado. Extraen datos bajo demanda — unos pocos kilobytes o líneas a la vez. Esto mantiene el uso de memoria plano incluso para archivos de escala de terabytes.
- **Backpressure**: En Node.js, los streams manejan automáticamente casos donde el writer es más lento que el reader. El reader pausa hasta que el writer se recupera, previniendo que la memoria se llene con chunks sin procesar.
- **Pipelines componibles**: Múltiples transformaciones (decodificar CSV, filtrar filas, agregar, codificar JSON) se encadenan como un pipeline. Cada etapa procesa chunks independientemente.
- **Manejo de errores**: Los errores de stream pueden ocurrir en cualquier etapa. Handlers de error centralizados capturan fallas sin filtrar recursos o dejar archivos de output parciales.

## Variantes

| Enfoque | Uso de memoria | Complejidad | Mejor para |
|---------|---------------|-------------|------------|
| Carga completa de archivo | O(tamaño archivo) | Baja | Archivos pequeños (< RAM) |
| Stream línea por línea | O(tamaño línea) | Baja | Archivos de texto, CSV, logs |
| Stream por chunks | O(tamaño buffer) | Media | Archivos binarios, compresión |
| Stream paralelo | O(buffer × workers) | Alta | Transformaciones CPU-intensivas |

## Mejores prácticas

- **Usa I/O buffered**: las lecturas y escrituras sin buffer emiten una system call por byte. Los buffers (8KB default en la mayoría de lenguajes) amortizan este overhead.
- **Maneja encoding explícitamente**: los encodings default varían por plataforma. Especifica `utf-8` para evitar corrupción con texto internacional.
- **Valida input temprano**: datos malformados en un stream pueden causar errores downstream. Sanitiza o salta registros malos.
- **Implementa reporte de progreso**: para streams de larga duración, emite eventos de progreso o loguea conteos de bytes procesados para que operadores sepan que el job progresa.
- **Cierra recursos apropiadamente**: usa `with` (Python), `try-with-resources` (Java), o `pipeline` (Node.js) para asegurar que los file handles se liberen.

## Errores comunes

- **Cargar archivos completos en arrays**: `readlines()` o `readFile()` lee todo en memoria. Para archivos grandes, usa equivalentes de streaming.
- **Ignorar backpressure**: en Node.js, escribir a un consumidor lento sin manejar eventos `drain` causa que la memoria crezca sin límites.
- **No manejar caracteres multibyte parciales**: un límite de chunk puede dividir un carácter UTF-8 multibyte. Buffer caracteres incompletos a través de chunks.
- **Escribir al mismo archivo desde el que lees**: sobreescribir un archivo mientras haces streaming desde él corrompe los datos. Escribe a un archivo temporal y renombra atómicamente.

## Preguntas frecuentes

**P: ¿Cómo proceso un archivo que tampoco cabe en disco?**
R: Usa streaming de red o procesa chunks desde almacenamiento en la nube (S3 GetObject con headers Range) sin descargar el archivo completo.

**P: ¿Puedo reanudar un stream interrumpido?**
R: Sí. Trackea el último byte offset procesado exitosamente y posiciónate ahí al reiniciar. Incluye checksums para verificar continuidad.

**P: ¿Los streams son siempre más rápidos que cargar el archivo completo?**
R: No siempre. Para archivos pequeños, el overhead de gestión de streams puede exceder el costo de una sola lectura. Profile con tus tamaños de archivo reales.

**P: ¿Cómo proceso archivos ZIP o GZIP con streams?**
R: Usa librerías de compresión streaming como `zlib` (Node.js), `gzip` (Python), o `GZIPInputStream` (Java) como etapas intermedias del pipeline.

