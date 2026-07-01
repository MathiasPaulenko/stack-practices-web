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
lastUpdated: "2026-06-20"
author: "StackPractices"
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

File system watchers react to create, modify, delete, and rename events in real time. They power hot-reload dev servers, log tailers, and sync tools. This recipe shows cross-platform implementations in Python, JavaScript, and Java.

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

## Frequently Asked Questions

### Can I watch remote or network paths?

Native watchers generally do not support network shares. Use polling libraries like `chokidar` with `usePolling: true` or `FileAlterationMonitor` as fallbacks.

### Why do I get duplicate events?

Many text editors write files atomically (create temp, rename), triggering multiple events. Debounce with a small delay (e.g., 100 ms) before acting.

### How many files can I watch at once?

OS limits vary. Linux inotify has a per-user `max_user_watches` limit (default ~8K). macOS FSEvents scales to millions. Avoid recursive watches on huge trees.
