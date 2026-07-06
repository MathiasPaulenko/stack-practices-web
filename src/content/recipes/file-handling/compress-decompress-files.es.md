---
contentType: recipes
slug: compress-decompress-files
title: "Comprimir y Descomprimir Archivos"
description: "Cómo manejar archivos ZIP, GZIP y TAR programáticamente."
metaDescription: "Aprende a comprimir y descomprimir archivos ZIP, GZIP y TAR en Python, JavaScript y Java con ejemplos de código prácticos."
difficulty: intermediate
topics:
  - file-handling
tags:
  - file-handling
  - compression
  - zip
  - gzip
  - python
  - javascript
  - java
relatedResources:
  - /recipes/copy-move-files
  - /recipes/read-large-files
  - /recipes/watch-file-changes
  - /recipes/write-large-files
  - /recipes/file-upload-validation
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Aprende a comprimir y descomprimir archivos ZIP, GZIP y TAR en Python, JavaScript y Java con ejemplos de código prácticos."
  keywords:
    - file-handling
    - compression
    - zip
    - gzip
    - python
    - javascript
    - java
---
## Visión General

Archivar y comprimir archivos reduce costos de almacenamiento y transferencia. Manejar ZIP, GZIP y TAR programáticamente es esencial para scripts de backup, exportaciones de datos y empaquetado de artefactos. La solucion a continuacion cubre los tres formatos en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Empaquetas bundles de logs o exportaciones de reportes para descarga
- Comprimes respuestas HTTP para reducir ancho de banda
- Extraes archivos subidos en aplicaciones web

## Solución

### Python

```python
import zipfile
import gzip
import tarfile

# Archivo ZIP
with zipfile.ZipFile('archive.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    z.write('file.txt')

# Archivo GZIP
with open('file.txt', 'rb') as f_in:
    with gzip.open('file.txt.gz', 'wb') as f_out:
        f_out.writelines(f_in)

# Archivo TAR
with tarfile.open('archive.tar.gz', 'w:gz') as tar:
    tar.add('data/')
```

### JavaScript

```javascript
const fs = require('fs');
const zlib = require('zlib');
const archiver = require('archiver');

// Comprimir GZIP
const input = fs.createReadStream('file.txt');
const output = fs.createWriteStream('file.txt.gz');
input.pipe(zlib.createGzip()).pipe(output);

// Archivo ZIP
const archive = archiver('zip', { zlib: { level: 9 } });
archive.pipe(fs.createWriteStream('archive.zip'));
archive.file('file.txt', { name: 'file.txt' });
archive.finalize();
```

### Java

```java
import java.io.*;
import java.util.zip.*;

public class Compressor {
    // Comprimir GZIP
    public void gzip(String src, String dest) throws IOException {
        try (FileInputStream fis = new FileInputStream(src);
             FileOutputStream fos = new FileOutputStream(dest);
             GZIPOutputStream gzos = new GZIPOutputStream(fos)) {
            fis.transferTo(gzos);
        }
    }

    // Archivo ZIP
    public void zip(String src, String dest) throws IOException {
        try (FileOutputStream fos = new FileOutputStream(dest);
             ZipOutputStream zos = new ZipOutputStream(fos);
             FileInputStream fis = new FileInputStream(src)) {
            zos.putNextEntry(new ZipEntry(new File(src).getName()));
            fis.transferTo(zos);
            zos.closeEntry();
        }
    }
}
```

## Explicación

**ZIP** almacena múltiples archivos con compresión opcional por archivo, preservando estructura de directorios. **GZIP** comprime un único archivo o stream, comúnmente usado para content encoding HTTP y rotación de logs. **TAR** archiva múltiples archivos sin compresión; emparejado con GZIP se convierte en `.tar.gz` (o `.tgz`). Los tres usan DEFLATE internamente, ofreciendo excelente compresión para datos de texto.

## Variantes

| Tecnología | Enfoque | Notas |
|------------|---------|-------|
| Python | `shutil.make_archive()` | One-liner para crear ZIP/TAR |
| JavaScript | `adm-zip` | Manipulación de ZIP en memoria, sin streams |
| Java | Apache Commons Compress | Soporta BZIP2, LZMA y formatos 7Z |

## Lo que funciona

1. Transmite archivos grandes en lugar de bufferizar archivos completos en memoria
2. Usa nivel de compresión 6 como default balanceado; nivel 9 es más lento con rendimientos decrecientes
3. Valida rutas extraídas para prevenir ataques de directory traversal (zip-slip)
4. Prefiere GZIP para compresión de archivo único; ZIP/TAR para bundles multi-archivo
5. Cierra streams en try-with-resources / bloques `with` para evitar fugas de descriptores

## Errores Comunes

1. Cargar archivos completos en memoria en lugar de hacer streaming
2. No validar rutas de entrada extraídas, permitiendo exploits de directory traversal
3. Olvidar `finalize()` o `closeEntry()`, produciendo archivos corruptos
4. Aplicar compresión a formatos ya comprimidos (ej. JPEG, MP4)
5. Ignorar encoding al comprimir archivos de texto entre plataformas

## Preguntas Frecuentes

### ¿Qué formato debo usar?

Usa **GZIP** para archivos únicos y compresión HTTP. Usa **ZIP** para bundles multi-archivo en Windows. Usa **TAR.GZ** para archivos multi-archivo en Unix/Linux.

### ¿Cómo manejo archivos muy grandes?

Transmite el proceso: lee un archivo, comprime, escribe en el archivo, luego descarta de memoria. `zipfile` de Python, `archiver` de Node y `ZipOutputStream` de Java soportan streaming.

### ¿Es segura la compresión ZIP?

ZIP por sí mismo no está encriptado. Usa ZIP con encriptación AES (Python `pyminizip`, Java `Zip4j`) o encripta el archivo externamente con GPG o similar.
