---
contentType: recipes
slug: copy-move-files
title: "Cómo Copiar y Mover Archivos con Python, JS, Java y Bash"
description: "Aprende a copiar y mover archivos multiplataforma con Python, JavaScript, Java y Bash. Incluye movimientos atómicos, checksums, symlinks y patrones batch."
metaDescription: "Copia y mueve archivos de forma segura en Python, JavaScript, Java y Bash. Usa shutil, fs, NIO y shell con checksums, movimientos atómicos y patrones batch."
difficulty: beginner
topics:
  - file-handling
tags:
  - file-handling
  - filesystem
  - python
  - javascript
  - java
  - bash
relatedResources:
  - /recipes/watch-file-changes
  - /recipes/read-large-files
  - /recipes/write-large-files
  - /recipes/file-upload-validation
  - /recipes/compress-decompress-files
  - /recipes/rotate-log-files
lastUpdated: "2026-08-23"
publishedAt: "2026-06-21"
author: Mathias Paulenko
seo:
  metaDescription: "Copia y mueve archivos de forma segura en Python, JavaScript, Java y Bash. Usa shutil, fs, NIO y shell con checksums, movimientos atómicos y patrones batch."
  keywords:
    - copiar archivos
    - mover archivos
    - shutil
    - filesystem
    - batch copy
    - checksum
    - multiplataforma
---

## Visión General

Copiar y mover archivos parece simple hasta que una transferencia parcial, un error de permisos o un
renombre entre dispositivos corrompe los datos. Esta receta trae patrones prácticos en Python,
JavaScript, Java y Bash que cubren sobrescrituras, checksums, symlinks y movimientos atómicos.

## Cuándo Usar

- Necesitas duplicar archivos de configuración durante [despliegues](/recipes/watch-file-changes/).
- Estás moviendo archivos subidos desde directorios temporales a almacenamiento permanente y quieres
  validarlos primero (consulta la [validación de archivos subidos](/recipes/file-upload-validation/)).
- Quieres [rotar o archivar archivos de log](/recipes/rotate-log-files/) automáticamente.
- Estás copiando archivos en lote antes de [comprimirlos](/recipes/compress-decompress-files/).

## Cuándo Evitar

- Si necesitas replicación en tiempo real entre servidores, usa `rsync` o una herramienta de
  sincronización.
- Estás moviendo objetos grandes a la nube: el SDK o CLI del proveedor maneja mejor las cargas
  multipartes.
- Los usuarios finales necesitan un gestor gráfico de archivos; esto es una receta de scripting.

## Solución

### Python

```python
import shutil
from pathlib import Path
import hashlib

def safe_copy(src, dest, *, overwrite=False, verify=True, follow_symlinks=False):
    """Copia un archivo, preservando metadatos y verificando integridad opcionalmente."""
    src, dest = Path(src), Path(dest)
    if not src.exists():
        raise FileNotFoundError(f"Origen no encontrado: {src}")
    if dest.exists() and not overwrite:
        raise FileExistsError(f"Destino existe: {dest}")
    dest.parent.mkdir(parents=True, exist_ok=True)

    if src.is_symlink() and not follow_symlinks:
        dest.symlink_to(Path(src).readlink())
    else:
        shutil.copy2(src, dest)

    if verify and not src.is_symlink():
        src_hash = hashlib.sha256(src.read_bytes()).hexdigest()
        dest_hash = hashlib.sha256(dest.read_bytes()).hexdigest()
        if src_hash != dest_hash:
            dest.unlink()
            raise IOError(f"Checksum no coincide: {src} -> {dest}")
    return dest

def safe_move(src, dest, *, overwrite=False):
    """Mueve un archivo, usando copiar+borrar si está entre filesystems."""
    src, dest = Path(src), Path(dest)
    if not src.exists():
        raise FileNotFoundError(f"Origen no encontrado: {src}")
    if dest.exists() and not overwrite:
        raise FileExistsError(f"Destino existe: {dest}")
    dest.parent.mkdir(parents=True, exist_ok=True)

    try:
        shutil.move(str(src), str(dest))
    except shutil.Error:
        safe_copy(src, dest, overwrite=overwrite, verify=True)
        src.unlink()
    return dest

def batch_copy(src_dir, dest_dir, pattern="*", *, overwrite=False):
    """Copia todos los archivos que coinciden con un patrón de src_dir a dest_dir."""
    src_dir, dest_dir = Path(src_dir), Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    copied = []
    for file in src_dir.glob(pattern):
        if file.is_file():
            copied.append(safe_copy(file, dest_dir / file.name, overwrite=overwrite))
    return copied
```

### JavaScript

```javascript
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

async function sha256(file) {
  const data = await fs.readFile(file);
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function copyWithChecksum(src, dest) {
  // COPYFILE_FICLONE intenta un clon copy-on-write cuando se soporta
  await fs.copyFile(src, dest, fs.constants.COPYFILE_FICLONE);
  if (await sha256(src) !== await sha256(dest)) {
    await fs.unlink(dest);
    throw new Error(`Checksum no coincide: ${src} -> ${dest}`);
  }
}

async function moveWithFallback(src, dest) {
  try {
    await fs.rename(src, dest);  // atómico si es el mismo filesystem
  } catch (err) {
    if (err.code === 'EXDEV') {
      const stat = await fs.stat(src);
      if (stat.isDirectory()) {
        await fs.cp(src, dest, { recursive: true });  // Node 16.7+
        await fs.rm(src, { recursive: true });
      } else {
        await copyWithChecksum(src, dest);
        await fs.unlink(src);
      }
    } else {
      throw err;
    }
  }
}
```

### Java

```java
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;

public class FileCopier {

    public static void copyWithAttributes(Path src, Path dest, boolean overwrite) throws Exception {
        List<CopyOption> options = new ArrayList<>();
        options.add(StandardCopyOption.COPY_ATTRIBUTES);
        if (overwrite) options.add(StandardCopyOption.REPLACE_EXISTING);
        Files.copy(src, dest, options.toArray(new CopyOption[0]));
    }

    public static void moveWithFallback(Path src, Path dest, boolean overwrite) throws Exception {
        List<CopyOption> options = new ArrayList<>();
        if (overwrite) options.add(StandardCopyOption.REPLACE_EXISTING);

        try {
            // ATOMIC_MOVE solo funciona dentro del mismo filesystem
            options.add(StandardCopyOption.ATOMIC_MOVE);
            Files.move(src, dest, options.toArray(new CopyOption[0]));
        } catch (AtomicMoveNotSupportedException e) {
            options.remove(StandardCopyOption.ATOMIC_MOVE);
            copyWithAttributes(src, dest, overwrite);
            Files.deleteIfExists(src);
        }
    }

    public static String sha256(Path file) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] hash = md.digest(Files.readAllBytes(file));
        StringBuilder sb = new StringBuilder();
        for (byte b : hash) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
```

### Bash

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
```

## Explicación

Copiar duplica contenido y, opcionalmente, metadatos. Mover dentro del mismo filesystem suele ser un
renombre rápido y atómico del inode. Los movimientos entre dispositivos tienen que copiar los bytes
primero y luego borrar el origen; si algo falla a mitad de camino, puedes terminar con un archivo
parcial o un duplicado.

El flag `ATOMIC_MOVE` de Java y `fs.rename` de Node solo garantizan atomicidad cuando origen y
destino están en el mismo filesystem. Para escrituras críticas, un patrón común es escribir a un
archivo temporal en el directorio destino y luego renombrarlo sobre el objetivo.

## Variantes

| Tecnología | Enfoque | Mejor para |
| ------------ | --------- | ------------ |
| **Python** | `shutil` + `pathlib` | Scripts multiplataforma y pipelines de datos |
| **JavaScript** | `fs.promises` / `fs.cp` | Tooling de Node.js y scripts de CI |
| **Java** | `java.nio.file.Files` | Servicios de producción que necesitan opciones tipadas |
| **Bash** | `cp`, `mv`, `sha256sum` | Tareas rápidas de sysadmin y cron jobs |

Otras variantes útiles incluyen `sendfile`/`copy_file_range` para copias a nivel de kernel en Linux,
`fs-extra` para copias recursivas con filtros en Node.js, y Apache Commons IO `FileUtils` para
helpers batch de más alto nivel en Java.

## Mejores Prácticas

- Verifica siempre las sobrescrituras con `COPYFILE_EXCL` o un flag explícito, para no reemplazar
  datos sin darte cuenta.
- Para archivos críticos, escribe en un archivo temporal del mismo directorio y luego muévelo al
  nombre final.
- Verifica checksums en archivos grandes, copias por red o cualquier operación donde perder datos te
  costaría caro.
- Crea los directorios padre antes de escribir, o la operación fallará con "No such file or
  directory".
- Decide la política de symlinks desde el inicio: síguelos para backups, copia el enlace para
  preservar la estructura.
- Maneja movimientos `EXDEV`/entre dispositivos con un fallback de copiar y borrar.

## Errores Comunes

- Sobrescribir archivos existentes antes de confirmar o sin backup.
- Asumir que `move` es atómico cuando origen y destino están en distintos filesystems o particiones.
- Construir rutas a mano concatenando strings en lugar de usar `pathlib`, `path.join` o `Path.resolve`.
- Ignorar symlinks, de modo que un backup capture el enlace en lugar del contenido, o el contenido
  en lugar del enlace.
- Mover archivos que otro proceso aún sigue escribiendo.
- Olvidarte de crear el directorio destino y recibir un error críptico de "No such file or
  directory".

## Preguntas Frecuentes

### ¿Es `move` siempre atómico?

Solo un `move` dentro del mismo filesystem es atómico. Los movimientos entre dispositivos son copiar
y borrar, y pueden interrumpirse. Cuando los lectores necesiten una actualización todo-o-nada,
escribe un archivo temporal y colócalo renombrándolo.

### ¿Cómo copio directorios recursivamente?

En Python, usa `shutil.copytree()`. En JavaScript, usa `fs.cp(src, dest, { recursive: true })`
(Node 16.7+) o `fs-extra.copy()`. En Java, usa `Files.walkFileTree()` o Apache Commons IO
`FileUtils.copyDirectory()`. En Bash, `cp -r` sirve para copias rápidas; `rsync -a` preserva
permisos y puede reanudar transferencias interrumpidas.

### ¿Debo seguir symlinks al copiar?

La respuesta depende del caso. Si haces backups, sigue symlinks para copiar el contenido real. Si
quieres preservar la estructura exacta, copia el symlink mismo. Python, Java y Node exponen flags
que te permiten decidir.

### ¿Qué hago si falla un checksum?

Borra la copia de destino, revisa que el origen no esté corrupto y reintenta. No conserves un
archivo si su hash no coincide con el original.
