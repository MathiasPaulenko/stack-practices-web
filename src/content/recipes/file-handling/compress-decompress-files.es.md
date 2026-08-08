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
  - /recipes/python-image-resize-batch
  - /recipes/python-zip-file-extraction
  - /recipes/bash-log-rotation-compression
  - /recipes/rotate-log-files
lastUpdated: "2026-06-20"
publishedAt: "2026-06-21"
author: Mathias Paulenko
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

## Soluciones Avanzadas

### Python: Compresión streaming con progreso y protección zip-slip

```python
import zipfile
import gzip
import tarfile
import os
from pathlib import Path

def compress_directory_streaming(src_dir: str, dest_zip: str,
                                 compression: int = zipfile.ZIP_DEFLATED,
                                 level: int = 6) -> int:
    """Comprime un directorio a ZIP con streaming. Retorna conteo de archivos."""
    src_path = Path(src_dir)
    file_count = 0
    with zipfile.ZipFile(dest_zip, 'w', compression, compresslevel=level) as zf:
        for file_path in sorted(src_path.rglob('*')):
            if file_path.is_file():
                arcname = file_path.relative_to(src_path)
                zf.write(file_path, arcname)
                file_count += 1
    return file_count

def decompress_zip_safe(zip_path: str, dest_dir: str) -> int:
    """Extrae ZIP con protección zip-slip. Retorna conteo de archivos."""
    dest_path = Path(dest_dir).resolve()
    dest_path.mkdir(parents=True, exist_ok=True)
    file_count = 0

    with zipfile.ZipFile(zip_path, 'r') as zf:
        for member in zf.namelist():
            member_path = (dest_path / member).resolve()
            # Prevenir zip-slip: asegurar que la ruta resuelta está bajo dest
            if not str(member_path).startswith(str(dest_path)):
                raise ValueError(f"Ruta insegura detectada: {member}")
            zf.extract(member, dest_path)
            file_count += 1
    return file_count

def gzip_file_streaming(src: str, dest: str, level: int = 6) -> None:
    """GZIP un archivo individual con streaming y nivel configurable."""
    with open(src, 'rb') as f_in, gzip.open(dest, 'wb', compresslevel=level) as f_out:
        while True:
            chunk = f_in.read(65536)
            if not chunk:
                break
            f_out.write(chunk)

def tar_directory_streaming(src_dir: str, dest: str,
                            mode: str = 'w:gz', level: int = 6) -> None:
    """Crea un archivo TAR.GZ con streaming."""
    with tarfile.open(dest, mode, compresslevel=level) as tar:
        tar.add(src_dir, arcname=Path(src_dir).name)

def list_archive_contents(archive_path: str) -> list[str]:
    """Lista contenidos de archivo ZIP o TAR."""
    if archive_path.endswith('.zip'):
        with zipfile.ZipFile(archive_path, 'r') as zf:
            return zf.namelist()
    elif archive_path.endswith(('.tar.gz', '.tgz', '.tar')):
        with tarfile.open(archive_path, 'r:*') as tar:
            return tar.getnames()
    raise ValueError(f"Formato de archivo no soportado: {archive_path}")

# Uso
# count = compress_directory_streaming('logs/', 'logs.zip', level=6)
# print(f"Comprimidos {count} archivos")
# extracted = decompress_zip_safe('upload.zip', 'extracted/')
# print(f"Extraídos {extracted} archivos de forma segura")
```

### Node.js: Pipeline de compresión streaming con zlib

```javascript
const fs = require('fs');
const zlib = require('zlib');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipe = promisify(pipeline);

async function gzipFile(srcPath, destPath, level = 6) {
    const src = fs.createReadStream(srcPath);
    const gzip = zlib.createGzip({ level });
    const dest = fs.createWriteStream(destPath);
    await pipe(src, gzip, dest);
}

async function gunzipFile(srcPath, destPath) {
    const src = fs.createReadStream(srcPath);
    const gunzip = zlib.createGunzip();
    const dest = fs.createWriteStream(destPath);
    await pipe(src, gunzip, dest);
}

async function gzipDirectory(srcDir, destZip) {
    const archiver = require('archiver');
    const output = fs.createWriteStream(destZip);
    const archive = archiver('zip', { zlib: { level: 6 } });

    const done = new Promise((resolve, reject) => {
        output.on('close', () => resolve(archive.pointer()));
        output.on('error', reject);
        archive.on('error', reject);
    });

    archive.pipe(output);
    archive.directory(srcDir, false);
    archive.finalize();

    const bytes = await done;
    return bytes;
}

async function extractZipSafe(zipPath, destDir) {
    const extract = require('extract-zip');
    const path = require('path');

    await extract(zipPath, {
        dir: path.resolve(destDir),
        onEntry: (entry, zipfile) => {
            // Prevenir zip-slip: rechazar rutas que escapan de destDir
            const dest = path.resolve(destDir, entry.fileName);
            if (!dest.startsWith(path.resolve(destDir))) {
                throw new Error(`Ruta insegura en archivo: ${entry.fileName}`);
            }
        },
    });
}

// Uso
// gzipFile('large.log', 'large.log.gz', 9);
// const bytes = await gzipDirectory('logs/', 'logs.zip');
// console.log(`Tamaño del archivo: ${bytes} bytes`);
// await extractZipSafe('upload.zip', 'extracted/');
```

### Java: Compresión batch con try-with-resources

```java
import java.io.*;
import java.nio.file.*;
import java.util.zip.*;
import java.util.List;
import java.util.ArrayList;
import java.util.stream.Stream;

public class BatchCompressor {

    // GZIP un archivo individual
    public static void gzipFile(Path src, Path dest, int bufferSize) throws IOException {
        try (InputStream fis = Files.newInputStream(src);
             OutputStream fos = Files.newOutputStream(dest);
             GZIPOutputStream gzos = new GZIPOutputStream(fos, bufferSize)) {
            fis.transferTo(gzos);
        }
    }

    // ZIP múltiples archivos con streaming
    public static int zipFiles(List<Path> sources, Path destZip) throws IOException {
        int count = 0;
        try (OutputStream fos = Files.newOutputStream(destZip);
             ZipOutputStream zos = new ZipOutputStream(fos)) {
            for (Path src : sources) {
                ZipEntry entry = new ZipEntry(src.getFileName().toString());
                zos.putNextEntry(entry);
                try (InputStream fis = Files.newInputStream(src)) {
                    fis.transferTo(zos);
                }
                zos.closeEntry();
                count++;
            }
        }
        return count;
    }

    // Extraer ZIP con protección zip-slip
    public static int extractZipSafe(Path zipPath, Path destDir) throws IOException {
        Files.createDirectories(destDir);
        int count = 0;
        try (InputStream fis = Files.newInputStream(zipPath);
             ZipInputStream zis = new ZipInputStream(fis)) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                Path destFile = destDir.resolve(entry.getName()).normalize();
                // Prevenir zip-slip
                if (!destFile.startsWith(destDir)) {
                    throw new IOException("Entrada zip insegura: " + entry.getName());
                }
                if (entry.isDirectory()) {
                    Files.createDirectories(destFile);
                } else {
                    Files.createDirectories(destFile.getParent());
                    Files.copy(zis, destFile, StandardCopyOption.REPLACE_EXISTING);
                }
                count++;
            }
        }
        return count;
    }

    // Comprimir todos los archivos en un directorio
    public static int compressDirectory(Path srcDir, Path destZip) throws IOException {
        List<Path> files = new ArrayList<>();
        try (Stream<Path> stream = Files.walk(srcDir)) {
            stream.filter(Files::isRegularFile).forEach(files::add);
        }
        return zipFiles(files, destZip);
    }
}

// Uso
// BatchCompressor.gzipFile(Path.of("large.log"), Path.of("large.log.gz"), 8192);
// int count = BatchCompressor.compressDirectory(Path.of("logs/"), Path.of("logs.zip"));
// System.out.println("Comprimidos " + count + " archivos");
// int extracted = BatchCompressor.extractZipSafe(Path.of("upload.zip"), Path.of("extracted/"));
```

### Bash: tar/gzip con progreso y compresión paralela

```bash
#!/usr/bin/env bash
set -euo pipefail

# Comprimir directorio a tar.gz con progreso
compress_tarball() {
    local src="$1"
    local dest="$2"
    local level="${3:-6}"
    tar -c -C "$(dirname "$src")" "$(basename "$src")" \
        | gzip -"$level" -c > "$dest"
    echo "Creado $dest ($(du -h "$dest" | cut -f1))"
}

# Extraer tarball de forma segura (prevenir path traversal)
extract_tarball_safe() {
    local archive="$1"
    local dest="$2"
    mkdir -p "$dest"
    # Listar contenidos primero, verificar sin rutas absolutas o ../ escapes
    if tar -tf "$archive" | grep -E '^/|\.\.'; then
        echo "Error: rutas inseguras detectadas en $archive" >&2
        return 1
    fi
    tar -xzf "$archive" -C "$dest"
    echo "Extraído a $dest"
}

# Compresión gzip paralela usando pigz (3-5x más rápido que gzip)
compress_parallel() {
    local src="$1"
    local dest="$2"
    if command -v pigz &>/dev/null; then
        tar -c -C "$(dirname "$src")" "$(basename "$src")" | pigz -p 4 > "$dest"
    else
        tar -czf "$dest" -C "$(dirname "$src")" "$(basename "$src")"
    fi
    echo "Creado $dest"
}

# Compresión batch de archivos individuales
batch_gzip() {
    local dir="$1"
    local count=0
    for file in "$dir"/*; do
        [[ -f "$file" ]] || continue
        gzip -c "$file" > "${file}.gz"
        ((count++))
    done
    echo "Comprimidos $count archivos en $dir"
}

# Uso
# compress_tarball logs/ logs.tar.gz 6
# extract_tarball_safe archive.tar.gz extracted/
# compress_parallel data/ data.tar.gz
# batch_gzip /var/log/app/
```



