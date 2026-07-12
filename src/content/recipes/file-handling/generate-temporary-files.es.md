---






contentType: recipes
slug: generate-temporary-files
title: "Generar Archivos Temporales"
description: "Cómo crear archivos y directorios temporales de forma segura con limpieza automática en Python, Node.js, Java y Bash."
metaDescription: "Crea archivos y directorios temporales de forma segura en Python, Node.js, Java y Bash, con limpieza automática y lo que funciona."
difficulty: beginner
topics:
  - file-handling
tags:
  - file-handling
  - temp-files
  - cleanup
  - python
  - nodejs
  - java
  - bash
  - recipe
relatedResources:
  - /recipes/rotate-log-files
  - /recipes/read-large-files
  - /guides/caching-strategies-guide
  - /recipes/python-image-resize-batch
  - /recipes/bash-backup-rotation-script
  - /recipes/bash-loop-over-files
  - /recipes/python-zip-file-extraction
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Crea archivos y directorios temporales de forma segura en Python, Node.js, Java y Bash, con limpieza automática y lo que funciona."
  keywords:
    - file-handling
    - temp-files
    - cleanup
    - python
    - nodejs
    - java
    - bash
    - recipe






---

## Descripción General

Los archivos temporales son esenciales para almacenar datos intermedios, archivos de subida durante procesamiento o secretos que no deberían persistir en disco. Crearlos incorrectamente puede llevar a vulnerabilidades de seguridad (nombres predecibles), fugas de recursos (archivos nunca eliminados) o incompatibilidad entre plataformas.

## Cuándo Usar

- Almacenar archivos de subida antes de la validación y almacenamiento permanente
- Mantener datos descifrados o secretos brevemente durante el procesamiento
- Almacenar en caché resultados intermedios de computación dentro de la vida útil de un proceso
- Ejecutar tests que necesitan un estado aislado del sistema de archivos
- Intercambiar datos que no caben en memoria durante procesamiento por batch

## Cuándo NO Usar

- Almacenamiento a largo plazo de datos de usuario — usa rutas permanentes con backups apropiados
- Datos que deben sobrevivir reinicios de proceso — los directorios temporales pueden ser borrados al reiniciar
- Secretos altamente sensibles en sistemas compartidos — usa enfoques solo en memoria o volúmenes cifrados
- Archivos que múltiples procesos necesitan descubrir por nombre — los nombres temporales son aleatorios

## Implementación Paso a Paso

### Python

```python
import tempfile
import os

# Archivo temporal (auto-eliminado al cerrar)
with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=True) as f:
    f.write('{"key": "value"}')
    f.flush()
    print(f"Archivo temp: {f.name}")
    # El archivo se elimina automáticamente al salir del contexto

# Directorio temporal (auto-eliminado con cleanup=True)
with tempfile.TemporaryDirectory() as tmpdir:
    path = os.path.join(tmpdir, 'report.txt')
    with open(path, 'w') as f:
        f.write('Datos temporales del reporte')
    print(f"Dir temp: {tmpdir}")
    # El directorio y todo su contenido se eliminan al salir del contexto

# Limpieza manual (útil cuando pasas la ruta a un proceso externo)
tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False)
try:
    tmp.write('id,name\n1,Alice\n')
    tmp.close()
    # Pasa tmp.name a herramienta externa...
finally:
    os.unlink(tmp.name)
```

### Node.js

```javascript
import os from 'os';
import fs from 'fs';
import path from 'path';

// Usando fs promises con limpieza personalizada
async function withTempFile(data, suffix = '.tmp') {
    const tmpPath = path.join(os.tmpdir(), `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}${suffix}`);
    try {
        await fs.promises.writeFile(tmpPath, data);
        return tmpPath;
    } catch (err) {
        await fs.promises.unlink(tmpPath).catch(() => {});
        throw err;
    }
}

// Usando el paquete tmp (recomendado para producción)
import tmp from 'tmp';

// Limpieza automática al salir del proceso
const tmpObj = tmp.fileSync({ postfix: '.json' });
fs.writeFileSync(tmpObj.name, '{"key": "value"}');
// tmpObj.removeCallback() elimina el archivo

const tmpDir = tmp.dirSync({ unsafeCleanup: true });
// Elimina recursivamente el directorio al limpiar
```

### Java

```java
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

// Java 7+ NIO.2 (recomendado)
public class TempFileExample {
    public static void main(String[] args) throws IOException {
        // Crear archivo temp en el directorio temp por defecto
        Path tempFile = Files.createTempFile("prefix-", ".txt");
        System.out.println("Creado: " + tempFile);
        Files.writeString(tempFile, "datos temporales");

        // Crear directorio temp
        Path tempDir = Files.createTempDirectory("myapp-");
        Path nested = tempDir.resolve("nested.txt");
        Files.writeString(nested, "contenido anidado");

        // Registrar para eliminación al salir de la JVM (best effort)
        tempFile.toFile().deleteOnExit();
        tempDir.toFile().deleteOnExit();

        // Limpieza explícita
        Files.deleteIfExists(tempFile);
        Files.walk(tempDir)
            .sorted((a, b) -> -a.compareTo(b))
            .forEach(p -> {
                try { Files.deleteIfExists(p); }
                catch (IOException e) { /* ignorar */ }
            });
    }
}
```

### Bash

```bash
#!/bin/bash
set -euo pipefail

# Crear archivo temp (portable, compatible POSIX)
TMPFILE=$(mktemp "${TMPDIR:-/tmp}/XXXXXX.json")
trap 'rm -f "$TMPFILE"' EXIT

echo '{"status": "ok"}' > "$TMPFILE"
# Procesar archivo...
echo "Usando: $TMPFILE"

# Crear directorio temp
TMPDIR_PATH=$(mktemp -d "${TMPDIR:-/tmp}/myapp.XXXXXX")
trap 'rm -rf "$TMPDIR_PATH"' EXIT

# Múltiples recursos temp — usa una función de limpieza
cleanup() {
    rm -f "$TMPFILE" 2>/dev/null || true
    rm -rf "$TMPDIR_PATH" 2>/dev/null || true
}
trap cleanup EXIT

# Avanzado: generar ruta temp única sin crear el archivo
UNIQUE_PATH="${TMPDIR:-/tmp}/batch_$(date +%s)_$$_$RANDOM.csv"
```

## Lo que funciona

- **Siempre usa `mktemp` o APIs nativas de temp del lenguaje.** Nunca construyas rutas temporales manualmente con patrones predecibles como `/tmp/myapp.pid` — son vulnerables a condiciones de carrera y ataques de symlink.
- **Configura `trap` en Bash o `deleteOnExit` en Java** para garantías de limpieza, pero prefiere limpieza explícita en try-finally o try-with-resources.
- **Usa prefijos y sufijos descriptivos** (`mktemp prefix.XXXXXX.ext`) para identificar el propósito del archivo temp en logs y herramientas del sistema de archivos.
- **Evita escribir secretos en archivos temporales** cuando sea posible. Si es inevitable, configura permisos restrictivos (`chmod 600`) inmediatamente después de la creación.
- **Respeta la variable de entorno `$TMPDIR`** para portabilidad. No hardcodees `/tmp` — macOS y algunas distros de Linux usan rutas alternativas.

## Errores Comunes

- **Hardcodear `/tmp` con nombres predecibles.** Un atacante puede crear un symlink en la ruta esperada para sobrescribir archivos arbitrarios.
- **Depender únicamente de `deleteOnExit` en procesos de larga duración.** Los archivos se acumulan hasta que la JVM o el proceso termina.
- **Olvidar la limpieza en rutas de error.** Una excepción antes de la limpieza deja archivos temporales huérfanos que llenan el disco con el tiempo.
- **Usar `Date.now()` como único aleatorizador en Node.js.** Las colisiones de milisegundos son posibles bajo carga — combina con bytes crypto-aleatorios.
- **Crear archivos temporales en el directorio de trabajo.** Poluciona el proyecto y puede ser commiteado accidentalmente.

## Preguntas Frecuentes

**Q: ¿Por qué `mktemp` es más seguro que crear archivos en /tmp manualmente?**
A: `mktemp` genera nombres de archivo únicos con permisos restrictivos, previniendo condiciones de carrera y rutas predecibles que un atacante podría explotar.

**Q: ¿Qué pasa con los archivos temporales después de que el script termina?**
A: Permanecen a menos que los borres. Usa un trap para limpiar al salir, o almacena archivos en un directorio creado con `mktemp -d` y elimina todo el directorio.

**Q: ¿Puedo usar archivos temporales en un pipeline de CI?**
A: Sí, pero asegúrate de que el runner tenga suficiente espacio en disco y que datos sensibles nunca queden en artefactos o cachés compartidos.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Soluciones Avanzadas

### Escritura atómica de archivos con archivos temporales

Escribir a un archivo temporal y renombrar en caso de éxito previene que escrituras parciales corrompan el archivo destino:

```python
import tempfile
import os
from pathlib import Path


def atomic_write(path: str | Path, data: str | bytes, mode: str = "w") -> None:
    """Escribe datos atómicamente: escribe a temp, luego renombra."""
    path = Path(path)
    is_binary = "b" in mode

    # Crear archivo temporal en el mismo directorio (rename debe ser mismo filesystem)
    fd, tmp_path = tempfile.mkstemp(
        dir=path.parent,
        prefix=f".{path.name}.",
        suffix=".tmp",
    )

    try:
        with os.fdopen(fd, mode) as f:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())  # Forzar escritura a disco
        os.rename(tmp_path, path)  # Atómico en mismo filesystem
    except Exception:
        os.unlink(tmp_path)
        raise


# Uso
atomic_write("config.json", '{"version": "2.0"}')
atomic_write("data.bin", b"\x00\x01\x02", mode="wb")
```

### Pool de archivos temporales para procesamiento por lotes

```python
import tempfile
from pathlib import Path
from contextlib import contextmanager
from typing import Generator


class TempFilePool:
    """Administra un pool de archivos temporales para procesamiento por lotes con limpieza automática."""

    def __init__(self, prefix: str = "pool_", suffix: str = ".tmp", max_files: int = 100):
        self.prefix = prefix
        self.suffix = suffix
        self.max_files = max_files
        self._files: list[str] = []
        self._dir = tempfile.mkdtemp(prefix=f"{prefix}dir_")

    def create(self) -> str:
        """Crea un nuevo archivo temporal y retorna su ruta."""
        if len(self._files) >= self.max_files:
            self._evict_oldest()
        fd, path = tempfile.mkstemp(
            dir=self._dir, prefix=self.prefix, suffix=self.suffix
        )
        os.close(fd)
        self._files.append(path)
        return path

    def _evict_oldest(self):
        """Elimina el archivo temporal más antiguo."""
        if self._files:
            oldest = self._files.pop(0)
            try:
                os.unlink(oldest)
            except FileNotFoundError:
                pass

    def cleanup(self) -> None:
        """Elimina todos los archivos temporales y el directorio temporal."""
        for f in self._files:
            try:
                os.unlink(f)
            except FileNotFoundError:
                pass
        self._files.clear()
        try:
            os.rmdir(self._dir)
        except OSError:
            pass

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.cleanup()


# Uso: procesar dataset grande en chunks
import os

with TempFilePool(prefix="batch_", suffix=".csv", max_files=10) as pool:
    for chunk_idx in range(50):
        tmp_path = pool.create()
        with open(tmp_path, "w") as f:
            f.write(f"chunk_id,value\n{chunk_idx},{chunk_idx * 100}\n")
        print(f"Chunk {chunk_idx} -> {tmp_path}")
    # Los archivos más antiguos se evictan automáticamente después de 10
    # Todos los archivos se limpian al salir
```

### Archivos temporales seguros con permisos restrictivos

```python
import tempfile
import os
from pathlib import Path


def create_secure_temp(content: str, suffix: str = ".txt") -> str:
    """Crea un archivo temporal con permisos 0600 (solo lectura/escritura del propietario)."""
    fd, path = tempfile.mkstemp(suffix=suffix)

    # Establecer permisos restrictivos inmediatamente
    os.chmod(path, 0o600)

    with os.fdopen(fd, "w") as f:
        f.write(content)
        f.flush()
        os.fsync(f.fileno())

    return path


def create_secure_temp_dir() -> str:
    """Crea un directorio temporal con permisos 0700."""
    path = tempfile.mkdtemp()
    os.chmod(path, 0o700)
    return path


# Uso para datos sensibles
secret_path = create_secure_temp("API_KEY=sk-xxx", suffix=".env")
try:
    # Leer el secreto en tu aplicación
    with open(secret_path) as f:
        config = f.read()
    print(f"Secreto almacenado en: {secret_path}")
finally:
    os.unlink(secret_path)
```

### Node.js: Escritura atómica con nombres crypto-aleatorios

```javascript
import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';


async function atomicWrite(filePath, data) {
    const dir = path.dirname(filePath);
    const tmpName = `.${path.basename(filePath)}.${crypto.randomUUID()}.tmp`;
    const tmpPath = path.join(dir, tmpName);

    try {
        await fs.writeFile(tmpPath, data);
        await fs.rename(tmpPath, filePath);
    } catch (err) {
        await fs.unlink(tmpPath).catch(() => {});
        throw err;
    }
}


async function createTempDir(prefix = 'app-') {
    const tmpDir = os.tmpdir();
    const dirName = `${prefix}${crypto.randomUUID()}`;
    const dirPath = path.join(tmpDir, dirName);
    await fs.mkdir(dirPath, { recursive: true, mode: 0o700 });
    return dirPath;
}


// Uso
await atomicWrite('config.json', JSON.stringify({ version: '2.0' }));
const tmpDir = await createTempDir('upload-');
console.log(`Dir temp: ${tmpDir}`);
```

### Bash: Archivo temporal con patrón de escritura atómica

```bash
#!/bin/bash
set -euo pipefail

atomic_write() {
    local target="$1"
    local content="$2"
    local dir
    dir=$(dirname "$target")

    # Crear archivo temporal en el mismo directorio que el destino
    local tmp_file
    tmp_file=$(mktemp "$dir/.${target##*/}.XXXXXX.tmp")

    # Escribir contenido y sincronizar
    printf '%s' "$content" > "$tmp_file"
    sync "$tmp_file" 2>/dev/null || true

    # Renombrado atómico
    mv "$tmp_file" "$target"
}

# Uso
atomic_write "/var/app/config.json" '{"version":"2.0","debug":false}'
echo "Config escrito atómicamente"

# Directorio temporal con permisos restrictivos
SECURE_DIR=$(mktemp -d)
chmod 700 "$SECURE_DIR"
trap 'rm -rf "$SECURE_DIR"' EXIT

echo "sensitive data" > "$SECURE_DIR/secret.txt"
echo "Dir temp seguro: $SECURE_DIR"
```

## Mejores Prácticas Adicionales


- For a deeper guide, see [Rotate Log Files](/es/recipes/rotate-log-files/).

1. **Crea archivos temporales en el mismo directorio que el destino para escrituras atómicas.** `os.rename()` es atómico solo dentro del mismo filesystem. Si el archivo temporal está en un mount point diferente, el rename se convierte en copy, que no es atómico:

```python
import tempfile
import os

# Bien: archivo temporal en el mismo dir que el destino
target = "/var/app/config.json"
fd, tmp = tempfile.mkstemp(dir=os.path.dirname(target), prefix=".config.", suffix=".tmp")
os.close(fd)
# ... escribir datos ...
os.rename(tmp, target)  # Atómico en mismo filesystem

# Mal: archivo temporal en /tmp, destino en /var (filesystem diferente)
# fd, tmp = tempfile.mkstemp(suffix=".tmp")  # /tmp puede ser un mount diferente
# os.rename(tmp, "/var/app/config.json")     # No atómico si cross-filesystem
```

2. **Usa `fsync` después de escribir datos críticos.** El SO puede bufferar escrituras. Si el proceso cae, los datos bufferados se pierden. Llama `fsync` para forzar los datos a disco antes de renombrar:

```python
import os

fd, tmp_path = tempfile.mkstemp(suffix=".dat")
with os.fdopen(fd, "wb") as f:
    f.write(b"critical data")
    f.flush()
    os.fsync(f.fileno())  # Forzar a disco
os.rename(tmp_path, "important.dat")
```

3. **Limpia archivos temporales ante interrupciones por señales.** En Bash, `trap` en EXIT no se dispara con `SIGKILL`, pero sí con `SIGINT` y `SIGTERM`:

```bash
#!/bin/bash
set -euo pipefail

TMPDIR_PATH=$(mktemp -d)

cleanup() {
    rm -rf "$TMPDIR_PATH"
    exit 0
}

trap cleanup EXIT INT TERM

# Proceso de larga duración
for i in $(seq 1 100); do
    echo "Procesando $i..." > "$TMPDIR_PATH/log.txt"
    sleep 1
done
```

## Errores Comunes Adicionales

1. **Usar `tempfile.mktemp()` (deprecado).** Genera un nombre de archivo sin crear el archivo, creando una condición de carrera. Usa `mkstemp()` en su lugar:

```python
import tempfile
import os

# Mal: mktemp() está deprecado, vulnerable a condición de carrera
# path = tempfile.mktemp(suffix=".txt")  # No uses esto

# Bien: mkstemp() crea el archivo atómicamente
fd, path = tempfile.mkstemp(suffix=".txt")
os.close(fd)
print(f"Archivo temporal seguro: {path}")
os.unlink(path)
```

2. **No manejar la limpieza de directorios temporales en estructuras recursivas.** Si creas directorios temporales anidados, un simple `os.rmdir()` falla porque solo elimina directorios vacíos. Usa `shutil.rmtree()`:

```python
import tempfile
import shutil
import os

tmpdir = tempfile.mkdtemp()
try:
    nested = os.path.join(tmpdir, "a", "b", "c")
    os.makedirs(nested)
    with open(os.path.join(nested, "file.txt"), "w") as f:
        f.write("data")

    # Mal: os.rmdir falla porque el dir no está vacío
    # os.rmdir(tmpdir)  # OSError: Directory not empty

    # Bien: shutil.rmtree elimina recursivamente
    shutil.rmtree(tmpdir)
finally:
    if os.path.exists(tmpdir):
        shutil.rmtree(tmpdir, ignore_errors=True)
```

3. **Filtrar descriptores de archivo temporal.** En Windows, los archivos con descriptores abiertos no pueden ser eliminados. Siempre cierra antes de hacer unlink:

```python
import tempfile
import os

# Mal: archivo aún abierto, unlink falla en Windows
# f = tempfile.NamedTemporaryFile(delete=False)
# f.write("data")
# os.unlink(f.name)  # Puede fallar en Windows

# Bien: cerrar primero, luego unlink
f = tempfile.NamedTemporaryFile(delete=False, suffix=".txt")
try:
    f.write("data".encode())
    f.close()  # Cerrar antes de unlink
    os.unlink(f.name)
except Exception:
    f.close()
    if os.path.exists(f.name):
        os.unlink(f.name)
    raise
```

## Preguntas Frecuentes Adicionales

### ¿Cómo establezco un tamaño máximo para directorios temporales?

Monitorea el uso de disco en tu directorio temporal y evicta archivos antiguos cuando se alcance el límite:

```python
import tempfile
import os
import time
from pathlib import Path


def enforce_temp_limit(tmpdir: str, max_size_mb: int = 500) -> None:
    """Elimina archivos antiguos cuando el dir temp excede el límite de tamaño."""
    tmpdir = Path(tmpdir)
    if not tmpdir.exists():
        return

    files = [(f, f.stat()) for f in tmpdir.rglob("*") if f.is_file()]
    total_size = sum(s.st_size for _, s in files)
    max_bytes = max_size_mb * 1024 * 1024

    if total_size <= max_bytes:
        return

    # Ordenar por tiempo de modificación (más antiguo primero)
    files.sort(key=lambda x: x[1].st_mtime)

    for f, stat in files:
        os.unlink(f)
        total_size -= stat.st_size
        if total_size <= max_bytes:
            break

    print(f"Dir temp limpiado, ahora usa {total_size // 1024 // 1024} MB")
```

### ¿Cómo comparto archivos temporales entre procesos?

Usa un directorio temporal conocido con `flock` para coordinación:

```bash
#!/bin/bash
set -euo pipefail

SHARED_TMP="/tmp/myapp_shared"
mkdir -p "$SHARED_TMP"

# Archivo de lock para coordinación
LOCK_FILE="$SHARED_TMP/.lock"

# Escribir a temp compartido con locking
(
    flock -x 200
    echo "$(date): Proceso $$ escribiendo" >> "$SHARED_TMP/jobs.log"
    TMPFILE=$(mktemp "$SHARED_TMP/job_XXXXXX.dat")
    echo "data from $$" > "$TMPFILE"
    echo "Creado: $TMPFILE"
) 200>"$LOCK_FILE"

# Limpiar archivos antiguos (mayores a 1 hora)
find "$SHARED_TMP" -type f -mmin +60 -delete 2>/dev/null || true
```

### ¿Cómo uso tmpfs para archivos temporales ultra rápidos?

En Linux, `/dev/shm` es un filesystem tmpfs (respaldado en RAM). Los archivos ahí son extremadamente rápidos pero limitados por la memoria disponible:

```python
import tempfile
import os

# Usar /dev/shm para archivos temporales rápidos respaldados en RAM
shm_dir = "/dev/shm" if os.path.isdir("/dev/shm") else None

if shm_dir:
    fd, path = tempfile.mkstemp(dir=shm_dir, prefix="fast_", suffix=".tmp")
    os.close(fd)
    print(f"Archivo temporal respaldado en RAM: {path}")
    # Escritura y lectura serán muy rápidas
    # Nota: limitado por RAM disponible, no espacio en disco
    os.unlink(path)
else:
    print("/dev/shm no disponible, usando directorio temporal por defecto")
```

### ¿Cómo pruebo código que usa archivos temporales?

Usa el fixture `tmp_path` de `pytest` para directorios temporales aislados en tests:

```python
import pytest
from pathlib import Path


def process_file(filepath: Path) -> str:
    """Función que procesa un archivo."""
    return filepath.read_text().upper()


def test_process_file(tmp_path: Path):
    # tmp_path es un directorio temporal único para este test
    test_file = tmp_path / "input.txt"
    test_file.write_text("hello world")

    result = process_file(test_file)

    assert result == "HELLO WORLD"
    # tmp_path se limpia automáticamente después del test
```

### ¿Cómo manejo archivos temporales en contenedores Docker?

Establece la variable de entorno `TMPDIR` a una ruta montada en volumen para persistencia, o usa `/dev/shm` para memoria compartida:

```dockerfile
# docker-compose.yml
services:
  app:
    image: myapp
    environment:
      - TMPDIR=/app/tmp
    tmpfs:
      - /dev/shm:size=256m
    volumes:
      - ./tmp:/app/tmp
```

```python
import os
import tempfile

# Respetar TMPDIR para compatibilidad con Docker
tmp_dir = os.environ.get("TMPDIR", tempfile.gettempdir())
fd, path = tempfile.mkstemp(dir=tmp_dir, suffix=".tmp")
os.close(fd)
print(f"Archivo temporal en Docker: {path}")
os.unlink(path)
```
