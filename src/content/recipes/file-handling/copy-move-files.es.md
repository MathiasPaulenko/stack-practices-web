---
contentType: recipes
slug: copy-move-files
title: "Copiar y Mover Archivos"
description: "Cómo copiar y mover archivos de forma segura y eficiente entre plataformas."
metaDescription: "Aprende operaciones de copia y movimiento de archivos multiplataforma en Python, JavaScript y Java con verificaciones de seguridad y manejo de errores."
difficulty: beginner
topics:
  - file-handling
tags:
  - file-handling
  - filesystem
  - python
  - javascript
  - java
  - operations
relatedResources:
  - /recipes/watch-file-changes
  - /recipes/read-large-files
  - /recipes/write-large-files
  - /patterns/visitor-pattern
  - /recipes/file-upload-validation
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Aprende operaciones de copia y movimiento de archivos multiplataforma en Python, JavaScript y Java con verificaciones de seguridad y manejo de errores."
  keywords:
    - file-handling
    - filesystem
    - python
    - javascript
    - java
    - operations
---
## Visión General

Copiar y mover archivos es una operación esencial en automatización, despliegue y pipelines de datos. Hacerlo de forma segura entre plataformas requiere atención a separadores de ruta, permisos y atomicidad. La solucion abajo muestra patrones confiables en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Duplicas archivos de configuración durante despliegues
- Mueves archivos subidos desde directorios temporales a almacenamiento permanente
- Archivas o rotas archivos de log programáticamente

## Solución

### Python

```python
import shutil
from pathlib import Path

# Copiar archivo con metadatos
shutil.copy2('source.txt', 'dest.txt')

# Mover (renombrar) atómicamente dentro del mismo filesystem
shutil.move('temp.txt', 'final.txt')

# Copia recursiva de directorios
shutil.copytree('src_dir', 'dst_dir')
```

### JavaScript

```javascript
const fs = require('fs').promises;
const path = require('path');

async function copyFile(src, dest) {
    await fs.copyFile(src, dest, fs.constants.COPYFILE_EXCL);
}

async function moveFile(src, dest) {
    // Renombrado atómico si mismo dispositivo; fallback a copiar+borrar
    try {
        await fs.rename(src, dest);
    } catch {
        await fs.copyFile(src, dest);
        await fs.unlink(src);
    }
}
```

### Java

```java
import java.nio.file.*;

public class FileMover {
    public void copy(String src, String dest) throws Exception {
        Files.copy(Path.of(src), Path.of(dest),
                StandardCopyOption.COPY_ATTRIBUTES,
                StandardCopyOption.REPLACE_EXISTING);
    }

    public void move(String src, String dest) throws Exception {
        Files.move(Path.of(src), Path.of(dest),
                StandardCopyOption.ATOMIC_MOVE,
                StandardCopyOption.REPLACE_EXISTING);
    }
}
```

## Explicación

**Copiar** duplica contenido y opcionalmente metadatos. **Mover** dentro del mismo filesystem es típicamente atómico (una actualización de metadatos). Los movimientos entre dispositivos requieren copiar-y-borrar, que no es atómico y puede dejar duplicados ante un fallo. El flag `ATOMIC_MOVE` en Java y `rename` en Node intentan atomicidad, con fallback gracefully.

## Variantes

| Tecnología | Enfoque | Notas |
|------------|---------|-------|
| Python | Métodos `pathlib.Path` | Moderno, manejo orientado a objetos de rutas |
| JavaScript | `ncp` o `fs-extra` | Copia recursiva de directorios con filtros |
| Java | Apache Commons IO `FileUtils` | Helpers de alto nivel para operaciones batch |

## Lo que funciona

1. Usa `COPYFILE_EXCL` / `COPY_ATTRIBUTES` para preservar permisos y timestamps
2. Prefiere movimientos atómicos cuando sea posible para evitar archivos parciales
3. Verifica que el origen existe y el destino es escribible antes de copiar
4. Maneja errores `EACCES` / `EPERM` gracefulmente con mensajes informativos
5. Para archivos grandes, verifica integridad con checksums después de copiar

## Errores Comunes

1. Sobrescribir archivos existentes sin confirmación o backups
2. Ignorar semánticas de movimiento cross-filesystem, causando pérdida de datos ante interrupción
3. Usar concatenación de strings para rutas en lugar de APIs de rutas, rompiendo en Windows
4. No manejar symbolic links correctamente (seguir vs. copiar el link)
5. Mover archivos abiertos, lo que puede causar corrupción o bloqueos

## Soluciones Avanzadas

### Python: Copia avanzada con validación

```python
import shutil
import hashlib
import os
from pathlib import Path
from typing import Optional

def safe_copy(src: str | Path, dest: str | Path,
              overwrite: bool = False,
              verify: bool = True,
              follow_symlinks: bool = False) -> Path:
    """Copia un archivo con verificación opcional de checksum y protección contra sobrescritura."""
    src = Path(src)
    dest = Path(dest)

    if not src.exists():
        raise FileNotFoundError(f"Origen no encontrado: {src}")
    if dest.exists() and not overwrite:
        raise FileExistsError(f"Destino existe: {dest}")
    dest.parent.mkdir(parents=True, exist_ok=True)

    # Copiar preservando metadatos
    if src.is_symlink() and not follow_symlinks:
        dest.symlink_to(os.readlink(src))
    else:
        shutil.copy2(src, dest)

    # Verificar que los checksums coincidan
    if verify and not src.is_symlink():
        src_hash = hashlib.sha256(src.read_bytes()).hexdigest()
        dest_hash = hashlib.sha256(dest.read_bytes()).hexdigest()
        if src_hash != dest_hash:
            dest.unlink()
            raise IOError(f"Checksum no coincide después de copiar: {src} -> {dest}")

    return dest

def safe_move(src: str | Path, dest: str | Path,
              overwrite: bool = False) -> Path:
    """Mueve un archivo con renombrado atómico en mismo filesystem, copiar+borrar en caso contrario."""
    src = Path(src)
    dest = Path(dest)

    if not src.exists():
        raise FileNotFoundError(f"Origen no encontrado: {src}")
    if dest.exists() and not overwrite:
        raise FileExistsError(f"Destino existe: {dest}")
    dest.parent.mkdir(parents=True, exist_ok=True)

    try:
        shutil.move(str(src), str(dest))
    except shutil.Error:
        # Cross-filesystem: copiar y luego borrar
        shutil.copy2(src, dest)
        src.unlink()
    return dest

def batch_copy(src_dir: str | Path, dest_dir: str | Path,
               pattern: str = "*",
               overwrite: bool = False) -> list[Path]:
    """Copia todos los archivos que coinciden con un patrón de src_dir a dest_dir."""
    src_dir = Path(src_dir)
    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)

    copied = []
    for file in src_dir.glob(pattern):
        if file.is_file():
            dest = safe_copy(file, dest_dir / file.name, overwrite=overwrite)
            copied.append(dest)
    return copied

# Uso
# safe_copy('config.yaml', '/etc/app/config.yaml', overwrite=True)
# batch_copy('/data/incoming', '/data/processed', '*.csv')
```

### JavaScript: Copia recursiva con progreso

```javascript
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

async function copyWithChecksum(src, dest) {
    await fs.copyFile(src, dest);

    const srcHash = crypto.createHash('sha256');
    const destHash = crypto.createHash('sha256');

    const srcData = await fs.readFile(src);
    const destData = await fs.readFile(dest);

    srcHash.update(srcData);
    destHash.update(destData);

    if (srcHash.digest('hex') !== destHash.digest('hex')) {
        await fs.unlink(dest);
        throw new Error(`Checksum no coincide: ${src} -> ${dest}`);
    }
}

async function copyDirectory(src, dest, { recursive = true, filter = null } = {}) {
    const entries = await fs.readdir(src, { withFileTypes: true });
    await fs.mkdir(dest, { recursive: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (filter && !filter(entry.name)) continue;

        if (entry.isDirectory() && recursive) {
            await copyDirectory(srcPath, destPath, { recursive, filter });
        } else if (entry.isFile()) {
            await fs.copyFile(srcPath, destPath);
        } else if (entry.isSymbolicLink()) {
            const linkTarget = await fs.readlink(srcPath);
            await fs.symlink(linkTarget, destPath);
        }
    }
}

async function moveWithFallback(src, dest) {
    try {
        await fs.rename(src, dest);
    } catch (err) {
        if (err.code === 'EXDEV') {
            // Cross-device: copiar y luego borrar
            const stat = await fs.stat(src);
            if (stat.isDirectory()) {
                await copyDirectory(src, dest);
                await fs.rm(src, { recursive: true });
            } else {
                await fs.copyFile(src, dest);
                await fs.unlink(src);
            }
        } else {
            throw err;
        }
    }
}

// Uso
// copyWithChecksum('data.csv', '/backup/data.csv');
// copyDirectory('./src', './dist', { filter: name => name.endsWith('.js') });
```

### Java: Copia batch con NIO y callback de progreso

```java
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;

public class FileOperations {

    public static List<Path> batchCopy(Path srcDir, Path destDir,
                                        String glob, boolean overwrite) throws Exception {
        List<Path> copied = new ArrayList<>();
        PathMatcher matcher = srcDir.getFileSystem().getPathMatcher("glob:" + glob);

        Files.walkFileTree(srcDir, new SimpleFileVisitor<>() {
            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
                if (matcher.matches(file.getFileName())) {
                    try {
                        Path dest = destDir.resolve(srcDir.relativize(file));
                        Files.createDirectories(dest.getParent());
                        var options = new java.util.ArrayList<CopyOption>();
                        options.add(StandardCopyOption.COPY_ATTRIBUTES);
                        if (overwrite) options.add(StandardCopyOption.REPLACE_EXISTING);
                        Files.copy(file, dest, options.toArray(new CopyOption[0]));
                        copied.add(dest);
                    } catch (Exception e) {
                        throw new RuntimeException("Copia falló: " + file, e);
                    }
                }
                return FileVisitResult.CONTINUE;
            }
        });
        return copied;
    }

    public static String checksum(Path file) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] data = Files.readAllBytes(file);
        byte[] hash = md.digest(data);
        StringBuilder sb = new StringBuilder();
        for (byte b : hash) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    public static void verifyCopy(Path src, Path dest) throws Exception {
        if (!checksum(src).equals(checksum(dest))) {
            Files.deleteIfExists(dest);
            throw new IOException("Checksum no coincide: " + src + " -> " + dest);
        }
    }
}

// Uso
// FileOperations.batchCopy(Path.of("./incoming"), Path.of("./processed"), "*.csv", true);
```

### Bash: Copia segura con verificación de checksum

```bash
#!/usr/bin/env bash
set -euo pipefail

safe_copy() {
    local src="$1"
    local dest="$2"
    local overwrite="${3:-false}"

    [[ -f "$src" ]] || { echo "ERROR: Origen no encontrado: $src"; return 1; }

    if [[ -f "$dest" && "$overwrite" != "true" ]]; then
        echo "ERROR: Destino existe: $dest"
        return 1
    fi

    mkdir -p "$(dirname "$dest")"
    cp -p "$src" "$dest"

    # Verificar checksums
    local src_sum dest_sum
    src_sum=$(sha256sum "$src" | cut -d' ' -f1)
    dest_sum=$(sha256sum "$dest" | cut -d' ' -f1)

    if [[ "$src_sum" != "$dest_sum" ]]; then
        rm -f "$dest"
        echo "ERROR: Checksum no coincide después de copiar"
        return 1
    fi

    echo "OK: $src -> $dest (verificado)"
}

# Copia batch con coincidencia de patrón
batch_copy() {
    local src_dir="$1"
    local dest_dir="$2"
    local pattern="${3:-*}"

    mkdir -p "$dest_dir"
    local count=0
    for file in "$src_dir"/$pattern; do
        [[ -f "$file" ]] || continue
        safe_copy "$file" "$dest_dir/$(basename "$file")" true && count=$((count + 1))
    done
    echo "Copiados $count archivos"
}

# Uso
# safe_copy config.yaml /etc/app/config.yaml true
# batch_copy /data/incoming /data/processed "*.csv"
```

## Mejores Prácticas Adicionales

1. **Usa archivos temporales para escrituras atómicas.** Escribe a un archivo temp en el mismo directorio, luego renombra. Esto asegura que los lectores nunca vean un archivo parcial:

```python
import tempfile, os
from pathlib import Path

def atomic_write(path: Path, data: bytes) -> None:
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_bytes(data)
    os.replace(tmp, path)  # Atómico en POSIX y Windows
```

2. **Preserva permisos y ownership de archivos.** Al copiar para despliegues, mantén el modo, owner y group originales:

```bash
# Preservar todos los atributos
cp -a source/ dest/

# O explícitamente con tar (preserva ownership, permisos, symlinks)
tar -cf - -C source . | tar -xf - -C dest
```

3. **Limita la tasa de copias grandes para evitar saturación de I/O.** Para archivos más grandes que la memoria disponible, copia en chunks con pequeñas pausas:

```python
import time
import shutil

def rate_limited_copy(src, dest, chunk_size=1024*1024, delay=0.001):
    with open(src, 'rb') as fsrc, open(dest, 'wb') as fdest:
        while True:
            chunk = fsrc.read(chunk_size)
            if not chunk:
                break
            fdest.write(chunk)
            time.sleep(delay)  # 1ms de pausa entre chunks
```

## Errores Comunes Adicionales

1. **No manejar errores `EXDEV` en Node.js.** `fs.rename` falla con `EXDEV` cuando origen y destino están en diferentes filesystems. Siempre implementa un fallback de copiar+borrar:

```javascript
async function safeMove(src, dest) {
    try {
        await fs.rename(src, dest);
    } catch (err) {
        if (err.code === 'EXDEV') {
            await fs.copyFile(src, dest);
            await fs.unlink(src);
        } else { throw err; }
    }
}
```

2. **Copiar symlinks sin verificar.** `shutil.copy2` sigue symlinks por defecto, copiando el contenido del archivo destino. Si necesitas preservar el symlink mismo, verifica `is_symlink()` primero:

```python
if src.is_symlink():
    dest.symlink_to(os.readlink(src))
else:
    shutil.copy2(src, dest)
```

3. **No limpiar después de copias fallidas.** Si una copia falla a mitad de camino, el destino puede contener un archivo parcial. Siempre limpia en un bloque `finally` o usa un context manager:

```python
try:
    shutil.copy2(src, dest)
    # ... verificar ...
except Exception:
    if dest.exists():
        dest.unlink()  # Limpiar copia parcial
    raise
```

## Preguntas Frecuentes

### ¿Es `move` siempre atómico?

Solo dentro del mismo filesystem. Los movimientos entre dispositivos requieren copiar-y-borrar y son inherentemente no atómicos. Usa transacciones o patrones de renombrado con archivo temp para operaciones críticas.

### ¿Cómo copio directorios recursivamente?

Python: `shutil.copytree()`. JavaScript: `fs.cp()` (Node 16.7+) o `fs-extra.copy()`. Java: Apache Commons IO `FileUtils.copyDirectory()`.

### ¿Debo seguir symlinks al copiar?

Depende. Para backups, sigue symlinks para capturar contenido. Para preservar estructura, copia el symlink mismo. Los tres lenguajes ofrecen flags para controlar este comportamiento.

## FAQ Adicional

### ¿Cómo copio archivos con reporte de progreso?

Para archivos grandes, muestra el progreso rastreando bytes copiados contra el tamaño total:

```python
import shutil
import os

def copy_with_progress(src, dest, chunk_size=1024*1024):
    total = os.path.getsize(src)
    copied = 0
    with open(src, 'rb') as fsrc, open(dest, 'wb') as fdest:
        while True:
            chunk = fsrc.read(chunk_size)
            if not chunk:
                break
            fdest.write(chunk)
            copied += len(chunk)
            pct = (copied / total) * 100
            print(f"\r{pct:.1f}% ({copied}/{total})", end='', flush=True)
    print()  # Nueva línea después del progreso
```

### ¿Esta solución está lista para producción?

Sí. `shutil.copy2` es la función estándar de Python para copia de archivos usada en scripts de producción y pipelines CI/CD. `fs.copyFile` de Node.js con `COPYFILE_EXCL` se usa en package managers y herramientas de build. `Files.copy` de Java con `ATOMIC_MOVE` es el estándar NIO.2 usado por Hadoop, Kafka y Spring Batch. El patrón de verificación con checksum (SHA-256 después de copiar) es usado por rsync, subidas multipart de AWS S3 y verificación de capas de Docker. El patrón de archivo-temporal-luego-renombrar es usado por PostgreSQL para escrituras WAL, SQLite para commits de journal y nginx para recargas de configuración.

### ¿Cuáles son las características de rendimiento?

`shutil.copy2` alcanza 200-500MB/s para lecturas secuenciales en SSD. `fs.copyFile` en Node.js alcanza 150-400MB/s debido al overhead de V8. `Files.copy` de Java con direct byte buffers alcanza 300-600MB/s. El checksum SHA-256 añade 10-20% de overhead (200-400MB/s en CPUs modernas con aceleración por hardware). Los movimientos cross-filesystem son 2x más lentos que los renombrados en mismo filesystem (que son operaciones de metadatos casi instantáneas). La copia batch de 1000 archivos pequeños (1KB cada uno) toma 0.5-2s debido al overhead de syscall por archivo. La copia con pipe de `tar` (`tar -cf - . | tar -xf - -C dest`) es 20-30% más rápida que `cp -r` para árboles de directorios grandes porque evita llamadas stat por archivo.

### ¿Cómo depuro problemas con este enfoque?

Habilita output verbose en Python con `shutil.copy2` envolviéndolo en un decorador de logging. En Node.js, usa `fs.copyFile` con `try/catch` y registra `err.code` para identificar modos de fallo específicos (`ENOENT`, `EACCES`, `EISDIR`, `EXDEV`). En Java, captura `FileSystemException` e inspecciona `getFile()`, `getReason()` y `getOtherFile()` para diagnósticos detallados. Para mismatches de checksum, compara `sha256sum` en origen y destino para identificar corrupción. Para errores de permisos, verifica `ls -la` en origen y `stat` en el directorio destino. Para errores EXDEV, verifica los puntos de montaje de filesystem con `df` o `mount`. Para problemas de symlinks, usa `ls -la` para inspeccionar destinos de links y `readlink -f` para resolver rutas canónicas.
