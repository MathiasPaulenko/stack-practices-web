---



contentType: recipes
slug: watch-file-changes
title: "Watch File Changes"
description: "How to monitor file system changes in real time."
metaDescription: "Implement file system watchers in Python, JavaScript, and Java to monitor file changes and directory updates in real time."
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
  metaDescription: "Implement file system watchers in Python, JavaScript, and Java to monitor file changes and directory updates in real time."
  keywords:
    - file-handling
    - watcher
    - python
    - javascript
    - java
    - filesystem



---
## Overview

File system watchers react to create, modify, delete, and rename events in real time. They power hot-reload dev servers, log tailers, and sync tools. Below is the idiomatic way to cross-platform implementations in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Building development servers that reload on code changes
- Monitoring log directories for new files to process
- Triggering pipelines when upload folders receive files

## Solution

### Python

```python
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class Handler(FileSystemEventHandler):
    def on_modified(self, event):
        if not event.is_directory:
            print(f"Modified: {event.src_path}")

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

// Watch a file or directory
const watcher = fs.watch('./watched', { recursive: true }, (eventType, filename) => {
    console.log(`${eventType}: ${filename}`);
});

// Cleanup
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

## Explanation

Watchers register with the OS kernel, which then pushes events to your process rather than requiring expensive polling. **Python watchdog** abstracts inotify (Linux), FSEvents (macOS), and ReadDirectoryChangesW (Windows). **Node.js `fs.watch`** delegates to the most efficient native API per platform. **Java NIO WatchService** uses the same underlying OS mechanisms through a standardized API.

## Variants

| Technology | Approach | Notes |
|------------|----------|-------|
| Python | `watchdog` library | Cross-platform, handles edge cases like rapid renames |
| JavaScript | `chokidar` npm package | More reliable than `fs.watch` on macOS and Windows |
| Java | Apache Commons IO `FileAlterationMonitor` | Polling fallback for older JDKs |

## What Works

1. Debounce rapid events (editors often trigger multiple writes)
2. Always handle the `error` event / `WatchService` exceptions
3. Use recursive watches sparingly; they consume OS resources
4. Filter by file extension to ignore temp files (e.g., `.tmp`, `.swp`)
5. Run watchers in a dedicated thread or process to avoid blocking

## Common Mistakes

1. Assuming `modify` events fire only once per save (editors may trigger many)
2. Not cleaning up watcher resources on shutdown, causing resource leaks
3. Watching network drives with native APIs that don't support them
4. Ignoring `rename` events, which appear as separate create + delete on some OSes
5. Processing files immediately on `create` before the writer has closed them

## FAQ

### Can I watch remote or network paths?

Native watchers generally do not support network shares. Use polling libraries like `chokidar` with `usePolling: true` or `FileAlterationMonitor` as fallbacks.

### Why do I get duplicate events?

Many text editors write files atomically (create temp, rename), triggering multiple events. Debounce with a small delay (e.g., 100 ms) before acting.

### How many files can I watch at once?

OS limits vary. Linux inotify has a per-user `max_user_watches` limit (default ~8K). macOS FSEvents scales to millions. Avoid recursive watches on huge trees.

## Advanced Solutions

### Python: Debounced watcher with event coalescing

```python
import time
import threading
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from collections import defaultdict
from typing import Callable

class DebouncedEventHandler(FileSystemEventHandler):
    """Coalesces rapid file events into a single callback after a quiet period."""

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

### JavaScript: Chokidar with glob filtering and async handlers

```javascript
const chokidar = require('chokidar');
const path = require('path');

const watcher = chokidar.watch('./src', {
    ignored: /(^|[\/\\])\./,  // Ignore dotfiles
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
        console.log(`Deleted: ${file}`);
        cleanupCache(file);
    })
    .on('error', err => console.error('Watcher error:', err))
    .on('ready', () => console.log('Initial scan complete. Watching for changes...'));

function processCSV(file) { console.log(`Processing CSV: ${file}`); }
function rebuildBundle(file) { console.log(`Rebuilding: ${file}`); }
function recompileStyles(file) { console.log(`Recompiling CSS: ${file}`); }
function cleanupCache(file) { console.log(`Cleaning cache for: ${file}`); }

// Cleanup on exit
process.on('SIGINT', () => watcher.close().then(() => process.exit(0)));
```

### Java: Recursive watch with thread pool

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

                        // Auto-register new subdirectories
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

// Usage
// RecursiveWatcher watcher = new RecursiveWatcher();
// watcher.registerAll(Path.of("./src"));
// watcher.start();
// Runtime.getRuntime().addShutdownHook(new Thread(watcher::stop));
```

### Bash: inotifywait for simple file watching

```bash
#!/usr/bin/env bash
set -euo pipefail

# Watch a directory with inotifywait (Linux only)
# Requires: apt install inotify-tools

WATCH_DIR="${1:-./watched}"
DEBOUNCE_SECONDS=0.3

echo "Watching: $WATCH_DIR"

inotifywait -m -r --format '%w%f|%e' \
    -e create,modify,delete,move \
    --exclude '\.(swp|tmp|log)' \
    "$WATCH_DIR" | while IFS='|' read -r file event; do
        # Debounce: skip if same file+event seen recently
        CACHE_KEY="${event}:${file}"
        if [[ -f /tmp/.watch_cache ]] && grep -q "^${CACHE_KEY}$" /tmp/.watch_cache 2>/dev/null; then
            continue
        fi
        echo "${CACHE_KEY}" >> /tmp/.watch_cache
        sleep "$DEBOUNCE_SECONDS"
        sed -i "/^${CACHE_KEY//\//\\/}$/d" /tmp/.watch_cache 2>/dev/null || true

        echo "[$(date +%H:%M:%S)] $event: $file"

        # Trigger action based on extension
        case "$file" in
            *.py) echo "  -> Python file changed, running lint..." ;;
            *.js) echo "  -> JS file changed, rebuilding bundle..." ;;
            *.csv) echo "  -> CSV file added, processing..." ;;
        esac
    done
```



