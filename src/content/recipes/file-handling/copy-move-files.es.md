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

## Preguntas Frecuentes

### ¿Es `move` siempre atómico?

Solo dentro del mismo filesystem. Los movimientos entre dispositivos requieren copiar-y-borrar y son inherentemente no atómicos. Usa transacciones o patrones de renombrado con archivo temp para operaciones críticas.

### ¿Cómo copio directorios recursivamente?

Python: `shutil.copytree()`. JavaScript: `fs.cp()` (Node 16.7+) o `fs-extra.copy()`. Java: Apache Commons IO `FileUtils.copyDirectory()`.

### ¿Debo seguir symlinks al copiar?

Depende. Para backups, sigue symlinks para capturar contenido. Para preservar estructura, copia el symlink mismo. Los tres lenguajes ofrecen flags para controlar este comportamiento.
