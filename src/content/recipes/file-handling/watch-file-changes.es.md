---



contentType: recipes
slug: watch-file-changes
title: "Observar Cambios en Archivos"
description: "Cómo monitorear cambios en el sistema de archivos en tiempo real."
metaDescription: "Implementa watchers del sistema de archivos en Python, JavaScript y Java para monitorear cambios de archivos y directorios en tiempo real."
difficulty: intermediate
topics:
  - file-handling
tags:
  - file-handling
  - watcher
  - python
  - javascript
  - java
  - filesystem
relatedResources:
  - /recipes/read-large-files
  - /recipes/write-large-files
  - /recipes/file-upload-validation
  - /recipes/generate-pdfs
  - /recipes/stream-processing
  - /recipes/compress-decompress-files
  - /recipes/copy-move-files
lastUpdated: "2026-06-20"
publishedAt: "2026-06-21"
author: Mathias Paulenko
seo:
  metaDescription: "Implementa watchers del sistema de archivos en Python, JavaScript y Java para monitorear cambios de archivos y directorios en tiempo real."
  keywords:
    - file-handling
    - watcher
    - python
    - javascript
    - java
    - filesystem



---
## Visión General

Los watchers del sistema de archivos reaccionan a eventos de creación, modificación, eliminación y renombrado en tiempo real. Alimentan servidores de hot-reload, tailers de logs y herramientas de sincronización. La solucion abajo muestra implementaciones multiplataforma en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Construyes servidores de desarrollo que recargan ante cambios de código
- Monitoreas directorios de logs para nuevos archivos a procesar
- Disparas pipelines cuando carpetas de upload reciben archivos

## Solución

### Python

```python
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class Handler(FileSystemEventHandler):
    def on_modified(self, event):
        if not event.is_directory:
            print(f"Modificado: {event.src_path}")

observer = Observer()
observer.schedule(Handler(), path='./watched', recursive=True)
observer.start()

try:
    while True:
        pass
except KeyboardInterrupt:
    observer.stop()
observer.join()
```

### JavaScript

```javascript
const fs = require('fs');

// Observar archivo o directorio
const watcher = fs.watch('./watched', { recursive: true }, (eventType, filename) => {
    console.log(`${eventType}: ${filename}`);
});

// Limpieza
process.on('SIGINT', () => watcher.close());
```

### Java

```java
import java.nio.file.*;

public class FileWatcher {
    public static void watch(Path path) throws Exception {
        WatchService watchService = FileSystems.getDefault().newWatchService();
        path.register(watchService,
                StandardWatchEventKinds.ENTRY_CREATE,
                StandardWatchEventKinds.ENTRY_MODIFY,
                StandardWatchEventKinds.ENTRY_DELETE);

        while (true) {
            WatchKey key = watchService.take();
            for (WatchEvent<?> event : key.pollEvents()) {
                System.out.println(event.kind() + ": " + event.context());
            }
            key.reset();
        }
    }
}
```

## Explicación

Los watchers se registran en el kernel del SO, que luego empuja eventos a tu proceso en lugar de requerir polling costoso. **Python watchdog** abstrae inotify (Linux), FSEvents (macOS) y ReadDirectoryChangesW (Windows). **Node.js `fs.watch`** delega a la API nativa más eficiente por plataforma. **Java NIO WatchService** usa los mismos mecanismos subyacentes del SO a través de una API estandarizada.

## Variantes

| Tecnología | Enfoque | Notas |
|------------|---------|-------|
| Python | Biblioteca `watchdog` | Multiplataforma, maneja casos edge como renombres rápidos |
| JavaScript | Paquete `chokidar` | Más confiable que `fs.watch` en macOS y Windows |
| Java | Apache Commons IO `FileAlterationMonitor` | Fallback por polling para JDKs antiguos |

## Lo que funciona

1. Debounce eventos rápidos (los editores suelen disparar múltiples escrituras)
2. Siempre maneja el evento `error` / excepciones de `WatchService`
3. Usa watchers recursivos con moderación; consumen recursos del SO
4. Filtra por extensión de archivo para ignorar archivos temporales (ej. `.tmp`, `.swp`)
5. Ejecuta watchers en un hilo o proceso dedicado para evitar bloqueos

## Errores Comunes

1. Asumir que los eventos `modify` se disparan solo una vez por guardado (los editores pueden disparar muchos)
2. No limpiar recursos del watcher al cerrar, causando fugas
3. Observar unidades de red con APIs nativas que no las soportan
4. Ignorar eventos de `rename`, que aparecen como create + delete separados en algunos SO
5. Procesar archivos inmediatamente en `create` antes de que el escritor los haya cerrado

## Soluciones Avanzadas

### Python: Watcher con debounce y coalescencia de eventos

```python
import time
import threading
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from collections import defaultdict
from typing import Callable

class DebouncedEventHandler(FileSystemEventHandler):
    """Coalesce eventos rápidos de archivo en un solo callback después de un período de quietud."""

    def __init__(self, callback: Callable[[str, str], None],
                 debounce_seconds: float = 0.3,
                 extensions: list[str] | None = None):
        self.callback = callback
        self.debounce = debounce_seconds
        self.extensions = extensions or []
        self._pending: dict[str, dict] = {}
        self._lock = threading.Lock()
        self._timer: threading.Timer | None = None

    def _should_process(self, path: str) -> bool:
        if not self.extensions:
            return True
        return any(path.endswith(ext) for ext in self.extensions)

    def _on_event(self, event_type: str, src_path: str):
        if not self._should_process(src_path):
            return
        with self._lock:
            self._pending[src_path] = {
                "type": event_type,
                "time": time.time(),
            }
            if self._timer:
                self._timer.cancel()
            self._timer = threading.Timer(self.debounce, self._flush)
            self._timer.start()

    def _flush(self):
        with self._lock:
            for path, info in self._pending.items():
                self.callback(info["type"], path)
            self._pending.clear()

    def on_created(self, event):
        if not event.is_directory:
            self._on_event("created", event.src_path)

    def on_modified(self, event):
        if not event.is_directory:
            self._on_event("modified", event.src_path)

    def on_deleted(self, event):
        if not event.is_directory:
            self._on_event("deleted", event.src_path)

    def on_moved(self, event):
        if not event.is_directory:
            self._on_event("moved", event.dest_path)

def handle_change(event_type: str, path: str):
    print(f"[{event_type}] {path}")

observer = Observer()
handler = DebouncedEventHandler(
    callback=handle_change,
    debounce_seconds=0.3,
    extensions=[".py", ".js", ".json", ".yaml"],
)
observer.schedule(handler, path="./src", recursive=True)
observer.start()

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    observer.stop()
observer.join()
```

### JavaScript: Chokidar con filtrado glob y handlers asíncronos

```javascript
const chokidar = require('chokidar');
const path = require('path');

const watcher = chokidar.watch('./src', {
    ignored: /(^|[\/\\])\./,  // Ignorar dotfiles
    persistent: true,
    ignoreInitial: true,
    followSymlinks: false,
    usePolling: false,
    interval: 100,
    binaryInterval: 300,
    awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
    },
});

const debounce = new Map();
function debouncedRun(file, fn, delay = 300) {
    if (debounce.has(file)) clearTimeout(debounce.get(file));
    debounce.set(file, setTimeout(() => {
        fn(file);
        debounce.delete(file);
    }, delay));
}

watcher
    .on('add', file => debouncedRun(file, f => {
        if (f.endsWith('.csv')) processCSV(f);
    }))
    .on('change', file => debouncedRun(file, f => {
        if (f.endsWith('.js')) rebuildBundle(f);
        if (f.endsWith('.css')) recompileStyles(f);
    }))
    .on('unlink', file => {
        console.log(`Eliminado: ${file}`);
        cleanupCache(file);
    })
    .on('error', err => console.error('Error del watcher:', err))
    .on('ready', () => console.log('Escaneo inicial completo. Observando cambios...'));

function processCSV(file) { console.log(`Procesando CSV: ${file}`); }
function rebuildBundle(file) { console.log(`Reconstruyendo: ${file}`); }
function recompileStyles(file) { console.log(`Recompilando CSS: ${file}`); }
function cleanupCache(file) { console.log(`Limpiando caché para: ${file}`); }

// Limpieza al salir
process.on('SIGINT', () => watcher.close().then(() => process.exit(0)));
```

### Java: Watch recursivo con thread pool

```java
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

public class RecursiveWatcher {

    private final WatchService watchService;
    private final ExecutorService executor;
    private final AtomicBoolean running = new AtomicBoolean(true);
    private final ConcurrentHashMap<WatchKey, Path> keys = new ConcurrentHashMap<>();

    public RecursiveWatcher() throws Exception {
        this.watchService = FileSystems.getDefault().newWatchService();
        this.executor = Executors.newSingleThreadExecutor();
    }

    public void registerAll(Path start) throws Exception {
        Files.walkFileTree(start, new SimpleFileVisitor<>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws Exception {
                WatchKey key = dir.register(watchService,
                    StandardWatchEventKinds.ENTRY_CREATE,
                    StandardWatchEventKinds.ENTRY_MODIFY,
                    StandardWatchEventKinds.ENTRY_DELETE);
                keys.put(key, dir);
                return FileVisitResult.CONTINUE;
            }
        });
    }

    public void start() {
        executor.submit(() -> {
            while (running.get()) {
                try {
                    WatchKey key = watchService.poll(1, TimeUnit.SECONDS);
                    if (key == null) continue;

                    Path dir = keys.get(key);
                    for (WatchEvent<?> event : key.pollEvents()) {
                        Path fullPath = dir.resolve((Path) event.context());
                        System.out.println(event.kind() + ": " + fullPath);

                        // Auto-registrar nuevos subdirectorios
                        if (event.kind() == StandardWatchEventKinds.ENTRY_CREATE) {
                            if (Files.isDirectory(fullPath)) {
                                registerAll(fullPath);
                            }
                        }
                    }
                    key.reset();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        });
    }

    public void stop() throws Exception {
        running.set(false);
        executor.shutdown();
        executor.awaitTermination(5, TimeUnit.SECONDS);
        watchService.close();
    }
}

// Uso
// RecursiveWatcher watcher = new RecursiveWatcher();
// watcher.registerAll(Path.of("./src"));
// watcher.start();
// Runtime.getRuntime().addShutdownHook(new Thread(watcher::stop));
```

### Bash: inotifywait para observación simple de archivos

```bash
#!/usr/bin/env bash
set -euo pipefail

# Observar un directorio con inotifywait (solo Linux)
# Requiere: apt install inotify-tools

WATCH_DIR="${1:-./watched}"
DEBOUNCE_SECONDS=0.3

echo "Observando: $WATCH_DIR"

inotifywait -m -r --format '%w%f|%e' \
    -e create,modify,delete,move \
    --exclude '\.(swp|tmp|log)' \
    "$WATCH_DIR" | while IFS='|' read -r file event; do
        # Debounce: saltar si mismo archivo+evento visto recientemente
        CACHE_KEY="${event}:${file}"
        if [[ -f /tmp/.watch_cache ]] && grep -q "^${CACHE_KEY}$" /tmp/.watch_cache 2>/dev/null; then
            continue
        fi
        echo "${CACHE_KEY}" >> /tmp/.watch_cache
        sleep "$DEBOUNCE_SECONDS"
        sed -i "/^${CACHE_KEY//\//\\/}$/d" /tmp/.watch_cache 2>/dev/null || true

        echo "[$(date +%H:%M:%S)] $event: $file"

        # Disparar acción según extensión
        case "$file" in
            *.py) echo "  -> Archivo Python cambiado, ejecutando lint..." ;;
            *.js) echo "  -> Archivo JS cambiado, reconstruyendo bundle..." ;;
            *.csv) echo "  -> Archivo CSV añadido, procesando..." ;;
        esac
    done
```



## Preguntas Frecuentes

### ¿Puedo observar rutas remotas o de red?

Los watchers nativos generalmente no soportan shares de red. Usa bibliotecas de polling como `chokidar` con `usePolling: true` o `FileAlterationMonitor` como fallback.

### ¿Por qué recibo eventos duplicados?

Muchos editores escriben archivos atómicamente (crear temp, renombrar), disparando múltiples eventos. Aplica debounce con un pequeño retraso (ej. 100 ms) antes de actuar.

### ¿Cuántos archivos puedo observar a la vez?

Los límites del SO varían. Linux inotify tiene un límite `max_user_watches` por usuario (default ~8K). macOS FSEvents escala a millones. Evita watchers recursivos en árboles enormes.

