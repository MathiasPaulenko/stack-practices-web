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
lastUpdated: "2026-06-20"
author: "StackPractices"
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

Los watchers del sistema de archivos reaccionan a eventos de creación, modificación, eliminación y renombrado en tiempo real. Alimentan servidores de hot-reload, tailers de logs y herramientas de sincronización. Esta receta muestra implementaciones multiplataforma en Python, JavaScript y Java.

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

## Mejores Prácticas

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

## Preguntas Frecuentes

### ¿Puedo observar rutas remotas o de red?

Los watchers nativos generalmente no soportan shares de red. Usa bibliotecas de polling como `chokidar` con `usePolling: true` o `FileAlterationMonitor` como fallback.

### ¿Por qué recibo eventos duplicados?

Muchos editores escriben archivos atómicamente (crear temp, renombrar), disparando múltiples eventos. Aplica debounce con un pequeño retraso (ej. 100 ms) antes de actuar.

### ¿Cuántos archivos puedo observar a la vez?

Los límites del SO varían. Linux inotify tiene un límite `max_user_watches` por usuario (default ~8K). macOS FSEvents escala a millones. Evita watchers recursivos en árboles enormes.
