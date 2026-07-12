---




contentType: recipes
slug: javascript-drag-drop-file-upload
title: "JavaScript Drag and Drop File Upload with HTML5 API"
description: "Implement native HTML5 drag and drop file upload in JavaScript"
metaDescription: "Build drag and drop file upload in JavaScript with HTML5 Drag API. Covers drop zones, file validation, progress bars, FormData upload, and drag event visual feedback."
difficulty: intermediate
topics:
  - file-handling
tags:
  - javascript
  - drag-and-drop
  - file-upload
  - html5
  - formdata
  - browser
relatedResources:
  - /recipes/javascript-clipboard-copy-paste
  - /recipes/javascript-localstorage-expiration
  - /recipes/nodejs-file-upload-validation
  - /recipes/graphql-error-handling-best-practices
  - /recipes/file-upload-validation
  - /recipes/nodejs-read-large-file-stream
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Build drag and drop file upload in JavaScript with HTML5 Drag API. Covers drop zones, file validation, progress bars, FormData upload, and drag event visual feedback."
  keywords:
    - javascript drag drop upload
    - html5 drag and drop files
    - drag drop file upload js
    - formdata file upload
    - javascript file validation
    - drop zone javascript




---

## Overview

HTML5 Drag and Drop API enables native file uploads without third-party libraries. The following demonstrates how to setting up a drop zone, validating files by type and size, uploading with FormData and progress tracking, and providing visual feedback during drag operations.

## When to Use


- For alternatives, see [Compress and Decompress Files](/recipes/compress-decompress-files/).

- You need a file upload area where users can drag files instead of clicking a button
- You want to validate files client-side before uploading
- You need upload progress feedback
- You are building an image gallery uploader or document management interface

## Solution

### Basic drop zone

```javascript
const dropZone = document.getElementById("drop-zone");

dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");

    const files = Array.from(e.dataTransfer.files);
    console.log(`Dropped ${files.length} files`);

    files.forEach(file => {
        console.log(`${file.name} — ${file.size} bytes — ${file.type}`);
    });
});
```

### Drop zone with file validation

```javascript
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function setupDropZone(elementId) {
    const dropZone = document.getElementById(elementId);

    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("drag-over");
    });

    dropZone.addEventListener("dragleave", (e) => {
        if (e.target === dropZone) {
            dropZone.classList.remove("drag-over");
        }
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("drag-over");

        const files = Array.from(e.dataTransfer.files);
        const valid = [];
        const errors = [];

        for (const file of files) {
            if (!ALLOWED_TYPES.includes(file.type)) {
                errors.push(`${file.name}: invalid type (${file.type})`);
                continue;
            }

            if (file.size > MAX_SIZE) {
                errors.push(`${file.name}: too large (${formatSize(file.size)})`);
                continue;
            }

            valid.push(file);
        }

        errors.forEach(err => showError(err));
        valid.forEach(file => uploadFile(file));
    });
}

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function showError(message) {
    const errorDiv = document.getElementById("upload-errors");
    errorDiv.innerHTML += `<p>${message}</p>`;
}

setupDropZone("drop-zone");
```

### Upload with FormData and progress bar

```javascript
function uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    const progressBar = createProgressBar(file.name);

    xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            progressBar.style.width = `${percent}%`;
            progressBar.textContent = `${percent}%`;
        }
    });

    xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
            console.log(`${file.name} uploaded successfully`);
            progressBar.parentElement.classList.add("upload-complete");
        } else {
            console.error(`${file.name} upload failed: ${xhr.status}`);
            progressBar.parentElement.classList.add("upload-error");
        }
    });

    xhr.addEventListener("error", () => {
        console.error(`${file.name} upload error`);
        progressBar.parentElement.classList.add("upload-error");
    });

    xhr.open("POST", "/api/upload");
    xhr.send(formData);
}

function createProgressBar(fileName) {
    const container = document.createElement("div");
    container.className = "upload-item";

    const label = document.createElement("span");
    label.textContent = fileName;

    const bar = document.createElement("div");
    bar.className = "progress-bar";

    const fill = document.createElement("div");
    fill.className = "progress-fill";

    bar.appendChild(fill);
    container.appendChild(label);
    container.appendChild(bar);
    document.getElementById("upload-list").appendChild(container);

    return fill;
}
```

### Complete drag and drop uploader

```javascript
class DragDropUploader {
    constructor(elementId, options = {}) {
        this.dropZone = document.getElementById(elementId);
        this.maxSize = options.maxSize ?? 5 * 1024 * 1024;
        this.allowedTypes = options.allowedTypes ?? ["image/jpeg", "image/png", "image/webp"];
        this.uploadUrl = options.uploadUrl ?? "/api/upload";
        this.onProgress = options.onProgress ?? (() => {});
        this.onComplete = options.onComplete ?? (() => {});
        this.onError = options.onError ?? (() => {});

        this.setupEvents();
    }

    setupEvents() {
        this.dropZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            this.dropZone.classList.add("drag-over");
        });

        this.dropZone.addEventListener("dragleave", (e) => {
            if (!this.dropZone.contains(e.relatedTarget)) {
                this.dropZone.classList.remove("drag-over");
            }
        });

        this.dropZone.addEventListener("drop", (e) => {
            e.preventDefault();
            this.dropZone.classList.remove("drag-over");
            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files);
        });

        // Also handle click to browse
        this.dropZone.addEventListener("click", () => {
            const input = document.createElement("input");
            input.type = "file";
            input.multiple = true;
            input.accept = this.allowedTypes.join(",");
            input.addEventListener("change", () => {
                this.handleFiles(Array.from(input.files));
            });
            input.click();
        });
    }

    handleFiles(files) {
        for (const file of files) {
            const error = this.validate(file);
            if (error) {
                this.onError(file, error);
                continue;
            }
            this.upload(file);
        }
    }

    validate(file) {
        if (!this.allowedTypes.includes(file.type)) {
            return `Invalid type: ${file.type}`;
        }
        if (file.size > this.maxSize) {
            return `File too large: ${this.formatSize(file.size)}`;
        }
        return null;
    }

    upload(file) {
        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                this.onProgress(file, percent);
            }
        });

        xhr.addEventListener("load", () => {
            if (xhr.status === 200) {
                this.onComplete(file, JSON.parse(xhr.responseText));
            } else {
                this.onError(file, `Upload failed: ${xhr.status}`);
            }
        });

        xhr.addEventListener("error", () => {
            this.onError(file, "Network error");
        });

        xhr.open("POST", this.uploadUrl);
        xhr.send(formData);
    }

    formatSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
}

// Usage
const uploader = new DragDropUploader("drop-zone", {
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    uploadUrl: "/api/upload",
    onProgress: (file, percent) => console.log(`${file.name}: ${percent}%`),
    onComplete: (file, response) => console.log(`${file.name} done:`, response),
    onError: (file, error) => console.error(`${file.name}: ${error}`)
});
```

### Image preview before upload

```javascript
function previewImage(file) {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();

    reader.onload = (e) => {
        const img = document.createElement("img");
        img.src = e.target.result;
        img.style.maxWidth = "200px";
        img.style.maxHeight = "200px";
        img.style.borderRadius = "8px";

        const container = document.createElement("div");
        container.className = "preview-item";
        container.appendChild(img);

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "Remove";
        removeBtn.onclick = () => container.remove();
        container.appendChild(removeBtn);

        document.getElementById("preview-grid").appendChild(container);
    };

    reader.readAsDataURL(file);
}
```

## Explanation

The HTML5 Drag and Drop API works through a series of events:

- **`dragenter`**: Fired when a dragged item enters the drop zone. Use for visual feedback.
- **`dragover`**: Fired continuously while the dragged item is over the drop zone. Must call `e.preventDefault()` to allow dropping.
- **`dragleave`**: Fired when the dragged item leaves the drop zone. Remove visual feedback.
- **`drop`**: Fired when the item is dropped. Call `e.preventDefault()` and access files via `e.dataTransfer.files`.

Key points:

- **`preventDefault()` on `dragover`**: Without this, the browser does not allow dropping. This is the most common mistake.
- **`dataTransfer.files`**: A `FileList` object containing the dropped files. Each file has `name`, `size`, `type`, and `lastModified` properties.
- **FormData upload**: Use `FormData` to send files via `XMLHttpRequest` or `fetch`. `XHR` is needed for progress events. `fetch` does not support upload progress yet.
- **FileReader**: Reads file contents client-side. `readAsDataURL` produces a base64 string for image previews. `readAsText` reads text files.
- **Validation**: Always validate file type and size before uploading. Check `file.type` against an allowlist and `file.size` against a maximum.

## Variants

| Feature | Method | Use When |
|---------|--------|----------|
| Basic drop | `dataTransfer.files` | Simple file selection |
| Validation | Check type + size | Production apps |
| Progress tracking | `XMLHttpRequest` upload | Large file uploads |
| Image preview | `FileReader.readAsDataURL` | Image uploaders |
| Click + drag | Hidden file input | Better UX |

## Guidelines

- Always call `e.preventDefault()` on `dragover` and `drop` events.
- Validate file type and size client-side before uploading.
- Use `XMLHttpRequest` for progress tracking. `fetch` does not support upload progress.
- Provide visual feedback during drag (highlight, border change, icon).
- Support both drag-and-drop and click-to-browse for accessibility.
- Show upload progress for files larger than 1 MB.
- Clean up `FileReader` and `XMLHttpRequest` references after completion.
- Handle network errors and server errors with user-friendly messages.

## Common Mistakes

- Not calling `preventDefault()` on `dragover`. The browser opens the file instead of dropping it.
- Not validating file type. Users can drop executables or scripts.
- Using `fetch` for uploads with progress. `fetch` does not support upload progress events.
- Not handling `dragleave` correctly. The highlight flickers when moving over child elements.
- Forgetting to append files to `FormData` with a field name.
- Not providing a click-to-browse fallback. Drag-and-drop is not intuitive for all users.

## Frequently Asked Questions

### How do I prevent the browser from opening the file when dropped outside the drop zone?

Add a global `dragover` and `drop` handler on `document` or `window`:

```javascript
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => e.preventDefault());
```

This prevents the browser from navigating to the file if the user misses the drop zone.

### Can I use fetch instead of XMLHttpRequest for uploads?

Yes, but you cannot track upload progress with `fetch`. If progress is not needed:

```javascript
const formData = new FormData();
formData.append("file", file);

const response = await fetch("/api/upload", {
    method: "POST",
    body: formData
});
```

### How do I handle drag-and-drop on mobile devices?

Mobile browsers have limited drag-and-drop support. Always provide a click-to-browse fallback with a hidden `<input type="file">`. The touch events API can be used for custom mobile implementations.

### How do I limit the number of files?

Check `files.length` in the `drop` handler:

```javascript
if (files.length > MAX_FILES) {
    showError(`Maximum ${MAX_FILES} files allowed`);
    return;
}
```
