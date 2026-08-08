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
  - files
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
publishedAt: "2026-06-25"
author: Mathias Paulenko
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

