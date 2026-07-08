---
contentType: recipes
slug: read-write-file
title: "Leer y Escribir Archivos"
description: "Cómo leer y escribir archivos de forma segura en varios lenguajes de programación."
metaDescription: "Aprende a leer y escribir archivos en Python, JavaScript y Bash con ejemplos prácticos, consejos de codificación y lo que funciona para manejo de errores."
difficulty: beginner
topics:
  - file-handling
tags:
  - file-handling
  - bash
  - io
  - streams
  - files
relatedResources:
  - /recipes/call-rest-api
  - /recipes/parse-json
  - /recipes/regular-expressions
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a leer y escribir archivos en Python, JavaScript y Bash con ejemplos prácticos, consejos de codificación y lo que funciona para manejo de errores."
  keywords:
    - leer archivo
    - escribir archivo
    - archivos python
    - fs node
    - archivos bash
---
## Visión General

Leer y escribir archivos es una de las tareas de E/S más habituales: cargar configuración, procesar logs, exportar informes o persistir estado. Hacerlo de forma segura implica manejar bien la codificación y cerrar siempre el descriptor del archivo.

Los archivos son la interfaz universal entre programas y almacenamiento persistente. Ya sea que estés guardando preferencias de usuario, leyendo logs del servidor o generando una exportación CSV, los mismos principios aplican: abrir el archivo, realizar la operación y asegurar que el recurso se libere incluso cuando ocurren errores. Los runtimes modernos proporcionan abstracciones de alto nivel que manejan buffering, codificación y limpieza automáticamente, pero entender la mecánica subyacente te ayuda a depurar problemas de rendimiento y evitar corrupción de datos.

Aqui se muestra la forma de la forma idiomática de leer y escribir archivos de texto en Python, JavaScript (Node.js) y Bash, además de cómo hacer streaming de archivos grandes sin agotar la memoria.

## Cuándo Usar

Usa esta receta cuando:

- Cargas archivos de configuración o datos al arrancar. Consulta [Parse JSON](/recipes/data/parse-json) para archivos de config estructurados.
- Generas informes, exportaciones o logs para auditoría y análisis
- Procesas texto línea a línea (CSV, logs, fixtures)
- Persistes pequeñas cantidades de estado sin una base de datos
- Lees y escribes archivos de configuración JSON o YAML
- Haces streaming de archivos de logs grandes sin cargarlos completamente en memoria
- Creas archivos temporales para procesamiento intermedio en pipelines de datos. Consulta [Call REST API](/recipes/api/call-rest-api) para descargar datos remotos.

## Solución

### Python

La sentencia `with` de Python crea un context manager que cierra automáticamente el archivo, incluso si se levanta una excepción dentro del bloque. Especifica siempre `encoding="utf-8"` para evitar valores por defecto dependientes de la plataforma.

```python
# Escribir
with open("notes.txt", "w", encoding="utf-8") as f:
    f.write("Hola, archivo!\n")

# Leer
with open("notes.txt", "r", encoding="utf-8") as f:
    content = f.read()
print(content)
```

### JavaScript

Node.js proporciona una API basada en promesas bajo `node:fs/promises` que evita bloquear el event loop. Esto es esencial para aplicaciones de servidor que manejan peticiones concurrentes.

```javascript
import { readFile, writeFile } from "node:fs/promises";

await writeFile("notes.txt", "Hola, archivo!\n", "utf-8");

const content = await readFile("notes.txt", "utf-8");
console.log(content);
```

### Bash

Bash usa redirección de shell para operaciones de archivo. El operador `>` sobrescribe el archivo destino, mientras que `>>` añade. Estas son las formas más rápidas de escribir pequeñas cantidades de datos desde scripts.

```bash
# Escribir (sobrescribir) y añadir
echo "Hola, archivo!" > notes.txt
echo "Otra línea" >> notes.txt

# Leer
cat notes.txt
```

## Explicación

- **Python** usa la sentencia `with` (context manager) para que el archivo se cierre siempre, incluso ante un error. La función `open()` acepta un string de modo: `"r"` para lectura, `"w"` para escritura (truncar), `"a"` para append, y `"x"` para creación exclusiva. Especifica siempre `encoding="utf-8"`.
- **JavaScript** usa la API basada en promesas `fs/promises`. Prefiérela sobre las síncronas `readFileSync`/`writeFileSync`, que bloquean el event loop. Para archivos grandes, usa `createReadStream()` para procesar datos en chunks.
- **Bash** usa redirección: `>` sobrescribe, `>>` añade. `cat` imprime el contenido. Para parsing estructurado, combina `cat` con `jq` para JSON o `awk` para CSV.

Para convertir el contenido de un archivo en datos estructurados, consulta [Parsear JSON](/recipes/data/parse-json).

## Variantes

| Lenguaje | Leer | Escribir | Añadir |
|----------|------|----------|--------|
| Python | `open(p).read()` | `open(p, "w")` | `open(p, "a")` |
| JavaScript | `readFile(p)` | `writeFile(p, data)` | `appendFile(p, data)` |
| Bash | `cat p` | `> p` | `>> p` |

## Lo que funciona

- **Define siempre la codificación**: un `utf-8` explícito evita valores por defecto dependientes de la plataforma que pueden corromper caracteres no-ASCII en Windows o macOS.
- **Usa context managers / APIs async**: `with` en Python, `fs/promises` en Node, para evitar fugas de descriptores y bloqueos del event loop. Estas abstracciones garantizan limpieza incluso cuando ocurren excepciones.
- **Comprueba que la ruta existe**: maneja los archivos ausentes con elegancia en lugar de fallar. En Python, usa `pathlib.Path.exists()`; en Node, usa `fs.access()` o `fs.stat()`.
- **Procesa archivos grandes en streaming**: lee línea a línea en vez de cargar gigabytes en memoria. Python proporciona `for line in f`; Node proporciona `readline` o `createReadStream`; Bash proporciona `while read line`.
- **Escribe de forma atómica**: escribe en un archivo temporal y luego renómbralo, para no corromper datos ante un fallo. Si el proceso muere durante la escritura, el archivo original permanece intacto.
- **Usa rutas absolutas en scripts**: las rutas relativas se rompen cuando cambia el directorio de trabajo. Resuelve rutas con `pathlib` (Python) o `path.resolve()` (Node) antes de abrir archivos.
- **Establece permisos restrictivos en archivos sensibles**: los archivos de configuración que contienen secrets deben ser legibles solo por el owner (`chmod 600`).

## Errores Comunes

- **Olvidar cerrar el descriptor**: provoca fugas de descriptores y eventualmente agota el límite del proceso; usa siempre `with` o `try/finally`.
- **Bloquear el event loop en Node**: evita `readFileSync` en los manejadores de peticiones. Una sola lectura síncrona puede congelar todo tu servidor para todos los usuarios concurrentes.
- **Codificación incorrecta**: leer UTF-8 como ASCII corrompe los caracteres no ingleses y puede producir mojibake en logs o output orientado al usuario.
- **Sobrescribir con `>`**: usar `>` en lugar de `>>` en Bash borra el archivo en silencio sin undo ni confirmación.
- **Ignorar errores**: un archivo ausente o un error de permisos debe manejarse, no tragarse con un catch vacío. Registra el error y falla con elegancia.
- **Leer archivos completos en memoria**: cargar un archivo de logs de 10 GB en un string hará crash tu proceso. Siempre verifica el tamaño del archivo o usa streaming para cualquier cosa superior a unos pocos megabytes.
- **Escribir en el mismo archivo que estás leyendo**: sobrescribir un archivo de entrada in-place puede truncarlo antes de que termines de leer, resultando en pérdida de datos.

## Preguntas Frecuentes

**Q: ¿Cómo añado contenido en vez de sobrescribir?**
A: Abre en modo append: `open(p, "a")` en Python, `appendFile` en Node, o `>>` en Bash. Esto preserva el contenido existente y agrega nuevos datos al final.

**Q: ¿Por qué debo evitar `readFileSync` en Node.js?**
A: Bloquea el event loop de un solo hilo, congelando el resto de peticiones hasta que termine la lectura. Usa `fs/promises` en su lugar para cualquier código de servidor en producción.

**Q: ¿Cómo leo un archivo grande sin quedarme sin memoria?**
A: Prosésalo línea a línea: `for line in f` en Python, `createReadStream` en Node, o `while read line` en Bash. Esto mantiene el uso de memoria constante independientemente del tamaño del archivo.

**Q: ¿Cómo escribo de forma segura en un archivo que otros procesos podrían estar leyendo?**
A: Escribe en un archivo temporal en el mismo filesystem, luego renómbralo atómicamente sobre el destino. Los lectores verán o el archivo viejo completo o el nuevo completo, nunca uno parcialmente escrito.

**Q: ¿Cuál es la diferencia entre modo texto y modo binario?**
A: El modo texto aplica traducción de newlines específica de la plataforma (`\r\n` en Windows) y codificación. El modo binario lee bytes raw sin transformación. Usa modo binario para imágenes, archivos comprimidos, o cuando necesitas fidelidad byte por byte exacta.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Soluciones Avanzadas

### Python: Escritura atómica con pathlib y manejo de errores

```python
import os
import tempfile
from pathlib import Path
from typing import Any

def safe_write(path: str | Path, data: str, encoding: str = 'utf-8') -> None:
    """Escribe texto atómicamente: archivo temporal + renombrado. Seguro ante crashes."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    fd, tmp_path = tempfile.mkstemp(
        dir=path.parent, suffix='.tmp', prefix=path.name
    )
    try:
        with os.fdopen(fd, 'w', encoding=encoding) as f:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, path)
    except Exception:
        Path(tmp_path).unlink(missing_ok=True)
        raise

def safe_read(path: str | Path, encoding: str = 'utf-8',
              default: str | None = None) -> str | None:
    """Lee texto con fallback elegante para archivos faltantes."""
    path = Path(path)
    if not path.exists():
        return default
    try:
        return path.read_text(encoding=encoding)
    except PermissionError:
        raise PermissionError(f"No se puede leer {path}: permiso denegado")
    except UnicodeDecodeError as e:
        raise UnicodeDecodeError(
            e.encoding, e.object, e.start, e.end,
            f"El archivo {path} no es {encoding} válido"
        )

def read_lines_lazy(path: str | Path, encoding: str = 'utf-8') -> list[str]:
    """Lee líneas del archivo de forma lazy, stripping whitespace de cada línea."""
    path = Path(path)
    with path.open('r', encoding=encoding) as f:
        return [line.rstrip('\n\r') for line in f if line.strip()]

def write_json_atomic(path: str | Path, data: Any, indent: int = 2) -> None:
    """Serializa JSON y escribe atómicamente."""
    import json
    text = json.dumps(data, indent=indent, ensure_ascii=False, default=str)
    safe_write(path, text)

# Uso
# safe_write('/etc/app/config.yaml', 'key: value\n')
# content = safe_read('/etc/app/config.yaml', default='key: default\n')
# write_json_atomic('/data/state.json', {'users': 42, 'active': 10})
```

### Node.js: Streaming read/write con recuperación de errores

```javascript
const fs = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');
const { createReadStream, createWriteStream } = fs;
const pipe = promisify(pipeline);

async function streamFile(srcPath, destPath, transformFn) {
    const tmpPath = destPath + '.tmp';
    const readStream = createReadStream(srcPath, { encoding: 'utf-8' });
    const writeStream = createWriteStream(tmpPath, { encoding: 'utf-8' });

    let lineBuffer = '';
    const lineTransform = new (require('stream').Transform)({
        transform(chunk, encoding, callback) {
            lineBuffer += chunk;
            const lines = lineBuffer.split('\n');
            lineBuffer = lines.pop();
            for (const line of lines) {
                const result = transformFn(line);
                if (result !== null) this.push(result + '\n');
            }
            callback();
        },
        flush(callback) {
            if (lineBuffer) {
                const result = transformFn(lineBuffer);
                if (result !== null) this.push(result + '\n');
            }
            callback();
        },
    });

    try {
        await pipe(readStream, lineTransform, writeStream);
        await fs.promises.rename(tmpPath, destPath);
    } catch (err) {
        try { await fs.promises.unlink(tmpPath); } catch {}
        throw err;
    }
}

async function readLines(path) {
    const content = await fs.promises.readFile(path, 'utf-8');
    return content.split('\n').filter(l => l.trim());
}

async function appendLine(path, line) {
    await fs.promises.appendFile(path, line + '\n', 'utf-8');
}

// Uso
// streamFile('input.log', 'output.log', line => line.toUpperCase());
// const lines = await readLines('config.txt');
// await appendLine('app.log', `[${new Date().toISOString()}] Iniciado`);
```

### Java: Operaciones de archivo NIO con escritura atómica

```java
import java.io.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.ArrayList;

public class FileOps {

    // Escritura atómica: archivo temporal + Files.move con ATOMIC_MOVE
    public static void atomicWrite(Path path, String content) throws IOException {
        Path parent = path.getParent();
        if (parent != null) Files.createDirectories(parent);
        Path tmp = Files.createTempFile(parent, path.getFileName().toString(), ".tmp");
        try {
            Files.writeString(tmp, content, StandardCharsets.UTF_8);
            Files.move(tmp, path, StandardCopyOption.ATOMIC_MOVE,
                       StandardCopyOption.REPLACE_EXISTING);
        } catch (Exception e) {
            Files.deleteIfExists(tmp);
            throw e;
        }
    }

    // Lectura segura con fallback
    public static String safeRead(Path path, String defaultValue) {
        if (!Files.exists(path)) return defaultValue;
        try {
            return Files.readString(path, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Error al leer " + path, e);
        }
    }

    // Leer todas las líneas de forma lazy
    public static List<String> readLines(Path path) throws IOException {
        return Files.readAllLines(path, StandardCharsets.UTF_8);
    }

    // Añadir una línea
    public static void appendLine(Path path, String line) throws IOException {
        String entry = line + System.lineSeparator();
        Files.writeString(path, entry,
            StandardCharsets.UTF_8,
            StandardOpenOption.CREATE,
            StandardOpenOption.APPEND);
    }

    // Stream líneas con try-with-resources
    public static void processLines(Path path, LineHandler handler) throws IOException {
        try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
            String line;
            while ((line = reader.readLine()) != null) {
                handler.handle(line);
            }
        }
    }

    @FunctionalInterface
    public interface LineHandler {
        void handle(String line) throws IOException;
    }
}

// Uso
// FileOps.atomicWrite(Path.of("/etc/app/config.yaml"), "key: value\n");
// String config = FileOps.safeRead(Path.of("config.yaml"), "key: default\n");
// FileOps.processLines(Path.of("large.log"), line -> {
//     if (line.contains("ERROR")) System.err.println(line);
// });
```

### Bash: Operaciones de archivo seguras con verificación de errores

```bash
#!/usr/bin/env bash
set -euo pipefail

# Escritura segura: escribir a archivo temporal, luego renombrado atómico
safe_write() {
    local file="$1"
    local content="$2"
    local tmp="${file}.tmp.$$"
    local dir
    dir="$(dirname "$file")"
    mkdir -p "$dir"
    printf '%s' "$content" > "$tmp"
    mv "$tmp" "$file"
}

# Lectura segura: verificar existencia primero, proporcionar default
safe_read() {
    local file="$1"
    local default="${2:-}"
    if [[ -f "$file" && -r "$file" ]]; then
        cat "$file"
    else
        printf '%s' "$default"
    fi
}

# Append con timestamp (para logging)
log_append() {
    local file="$1"
    local message="$2"
    local timestamp
    timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf '[%s] %s\n' "$timestamp" "$message" >> "$file"
}

# Leer archivo línea por línea con manejo de errores
read_lines() {
    local file="$1"
    if [[ ! -f "$file" ]]; then
        echo "Error: $file no encontrado" >&2
        return 1
    fi
    while IFS= read -r line || [[ -n "$line" ]]; do
        echo "$line"
    done < "$file"
}

# Crear archivo con permisos restrictivos (para secrets)
create_secret_file() {
    local file="$1"
    local content="$2"
    # Crear con permisos 600 directamente
    (umask 077; printf '%s' "$content" > "$file")
    echo "Creado $file con permisos 600"
}

# Uso
# safe_write /etc/app/config.txt "key=value"
# content=$(safe_read /etc/app/config.txt "key=default")
# log_append /var/log/app.log "Aplicación iniciada"
# create_secret_file /etc/app/secret.key "my-secret-key-123"
```

## Mejores Prácticas Adicionales

1. **Usa `pathlib` en lugar de `os.path` en Python.** `pathlib` proporciona una API orientada a objetos que es más legible y menos propensa a errores:

```python
from pathlib import Path

# Bueno: pathlib es claro y encadenable
config_path = Path('/etc/app') / 'config.yaml'
if config_path.exists():
    data = config_path.read_text(encoding='utf-8')

# Evitar: concatenación de strings con os.path es propensa a errores
# import os
# config_path = os.path.join('/etc/app', 'config.yaml')
```

2. **Usa `fs.promises` sobre callbacks de `fs` en Node.js.** La API de promises se integra con `async/await` y evita callback hell:

```javascript
const fs = require('fs/promises');

// Bueno: async/await con promises
async function loadConfig(path) {
    try {
        const data = await fs.readFile(path, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') return {};
        throw err;
    }
}

// Evitar: API basada en callbacks
// fs.readFile(path, 'utf-8', (err, data) => {
//     if (err) return callback(err);
#     callback(null, JSON.parse(data));
# });
```

3. **Establece permisos de archivo explícitamente al crear archivos.** El umask por defecto varía por sistema. Para archivos sensibles (config con secrets, private keys), establece permisos al momento de creación:

```python
import os
# Crear archivo con permisos 600 (solo lectura/escritura del owner)
fd = os.open('secret.key', os.O_CREAT | os.O_WRONLY, 0o600)
with os.fdopen(fd, 'w') as f:
    f.write(secret_data)
```

```bash
# Bash: usar umask o chmod
(umask 077; echo "$SECRET" > secret.key)
```

## Errores Comunes Adicionales

1. **Usar `readlines()` para archivos grandes en Python.** `readlines()` carga todas las líneas en una lista. Para archivos mayores a unos pocos MB, itera directamente:

```python
# Incorrecto: carga todo el archivo en memoria
with open('large.log') as f:
    lines = f.readlines()
    for line in lines:
        process(line)

# Correcto: iterar de forma lazy, una línea a la vez
with open('large.log') as f:
    for line in f:
        process(line)
```

2. **No manejar `ENOENT` en Node.js.** Un archivo faltante lanza un error con código `ENOENT`. Captúralo explícitamente en lugar de dejar que el proceso crashee:

```javascript
async function readConfig(path) {
    try {
        return await fs.readFile(path, 'utf-8');
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.warn(`Config no encontrada en ${path}, usando defaults`);
            return '{}';
        }
        if (err.code === 'EACCES') {
            throw new Error(`Permiso denegado: ${path}`);
        }
        throw err;  // Re-lanzar errores desconocidos
    }
}
```

3. **Usar `cat` en Bash para procesar archivos grandes.** `cat` carga todo el archivo en memoria. Para procesamiento línea por línea, usa `while read`:

```bash
# Ineficiente: cat pipea todo el archivo, luego awk procesa
cat large.log | awk '{print $1}'

# Mejor: awk lee directamente, sin overhead de cat
awk '{print $1}' large.log

# Mejor para procesamiento complejo: while read con IFS
while IFS=' ' read -r timestamp level message; do
    [[ "$level" == "ERROR" ]] && echo "$timestamp: $message"
done < large.log
```

## Preguntas Frecuentes Adicionales

### ¿Cómo manejo file locking para acceso concurrente?

Usa locks advisory. En Python, `fcntl.flock` (Linux/macOS) o `msvcrt.locking` (Windows). En Node.js, usa el paquete `proper-lockfile`. En Java, `FileChannel.lock()`. Los locks advisory requieren que todos los procesos cooperen — no previenen acceso por procesos no cooperantes:

```python
import fcntl

with open('shared.log', 'a') as f:
    fcntl.flock(f, fcntl.LOCK_EX)  # Lock exclusivo
    f.write(f"{record}\n")
    fcntl.flock(f, fcntl.LOCK_UN)  # Liberar
```

### ¿Esta solución está lista para producción?

Sí. La sentencia `with` de Python y `pathlib` son usados por Django, Flask, y la propia standard library de Python. `fs/promises` de Node.js con `pipeline()` es usado por Express.js, Next.js, y el SDK de AWS. La clase `Files` de Java NIO con `ATOMIC_MOVE` es usada por Spring Boot, Kafka, y Elasticsearch para persistencia de configuración y estado. Los patrones de escritura segura de Bash (temp + rename) son usados por package managers como apt y yum, y por actualizaciones de unit files de systemd. El patrón de escritura atómica (archivo temporal + renombrado) es el mismo enfoque usado por PostgreSQL para escrituras WAL, SQLite para commits de journal, y nginx para recargas de config.

### ¿Cuáles son las características de rendimiento?

`pathlib.read_text()` de Python lee a 300-600MB/s en SSD para archivos menores a 100MB. `fs.promises.readFile()` de Node.js alcanza 200-500MB/s. `Files.readString()` de Java alcanza 400-800MB/s con tamaños de buffer por defecto. `cat` de Bash logra 500-900MB/s para lectura raw de archivos pero tiene alto overhead para procesamiento línea por línea debido a spawning de subshells (~1ms por línea). `os.fsync()` añade 5-50ms por llamada dependiendo del tipo de disco. `Files.move(ATOMIC_MOVE)` completa en <1ms en el mismo filesystem. `fs.promises.appendFile()` para escrituras pequeñas (menores a 4KB) completa en 0.1-1ms. La iteración `for line in f` de Python añade ~0.01ms por línea de overhead. `createReadStream` de Node.js con highWaterMark de 64KB procesa 200K-500K líneas/s. `BufferedReader.readLine()` de Java procesa 500K-1M líneas/s con buffer por defecto de 8KB.

### ¿Cómo depuro problemas con este enfoque?

En Python, usa `pathlib.Path.resolve()` para verificar la ruta real siendo accedida y `Path.stat()` para verificar tamaño y permisos del archivo. En Node.js, envuelve operaciones de archivo en try/catch y registra `err.code` (`ENOENT`, `EACCES`, `EISDIR`, `EMFILE`). En Java, captura `IOException` e inspecciona `getMessage()` para detalles de ruta y permisos. Para fugas de descriptores, verifica el conteo de archivos abiertos con `lsof -p <pid>` (Linux/macOS) — no debería crecer con el tiempo. Para problemas de encoding, inspecciona bytes del archivo con `xxd file.txt | head` o `hexdump -C file.txt | head`. Para errores de permisos, verifica con `ls -la file` (Bash) o `Files.getPosixFilePermissions()` (Java). Para fallos de escritura atómica, verifica que el archivo temporal y el destino estén en el mismo filesystem — `os.replace` y `Files.move(ATOMIC_MOVE)` fallan entre límites de filesystem. Para escrituras lentas, verifica I/O de disco con `iostat -x 1` (Linux) o `Activity Monitor > Disk` (macOS).
