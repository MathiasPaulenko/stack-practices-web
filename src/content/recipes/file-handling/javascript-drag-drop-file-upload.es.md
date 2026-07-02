---
contentType: recipes
slug: javascript-drag-drop-file-upload
title: "Subida de Archivos con Drag and Drop en JavaScript con HTML5 API"
description: "Implementa subida de archivos drag and drop nativo HTML5 en JavaScript"
metaDescription: "Construye subida drag and drop en JavaScript con HTML5 Drag API. Cubre drop zones, validación de archivos, barras de progreso, FormData y feedback visual de drag events."
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
  - /guides/file-handling-best-practices
  - /patterns/file-upload-pipeline
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Construye subida drag and drop en JavaScript con HTML5 Drag API. Cubre drop zones, validación de archivos, barras de progreso, FormData y feedback visual de drag events."
  keywords:
    - javascript drag drop upload
    - html5 drag and drop files
    - drag drop file upload js
    - formdata file upload
    - javascript file validation
    - drop zone javascript
---

## Visión General

La HTML5 Drag and Drop API permite subidas de archivos nativas sin librerías de terceros. Esta recipe cubre configurar una drop zone, validar archivos por tipo y tamaño, subir con FormData y seguimiento de progreso, y dar feedback visual durante operaciones de arrastre.

## Cuándo Usar

- Necesitas un área de subida donde los usuarios puedan arrastrar archivos en vez de hacer click en un botón
- Quieres validar archivos del lado del cliente antes de subir
- Necesitas feedback de progreso de subida
- Estás construyendo un uploader de galería de imágenes o interfaz de gestión de documentos

## Solución

### Drop zone básica

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

### Drop zone con validación de archivos

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

### Subida con FormData y barra de progreso

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

### Uploader completo de drag and drop

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

        // También manejar click para explorar
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

// Uso
const uploader = new DragDropUploader("drop-zone", {
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    uploadUrl: "/api/upload",
    onProgress: (file, percent) => console.log(`${file.name}: ${percent}%`),
    onComplete: (file, response) => console.log(`${file.name} done:`, response),
    onError: (file, error) => console.error(`${file.name}: ${error}`)
});
```

### Preview de imagen antes de subir

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

## Explicación

La HTML5 Drag and Drop API funciona a través de una serie de eventos:

- **`dragenter`**: Se dispara cuando un item arrastrado entra en la drop zone. Usar para feedback visual.
- **`dragover`**: Se dispara continuamente mientras el item arrastrado está sobre la drop zone. Debe llamar `e.preventDefault()` para permitir el drop.
- **`dragleave`**: Se dispara cuando el item arrastrado sale de la drop zone. Remover feedback visual.
- **`drop`**: Se dispara cuando el item se suelta. Llamar `e.preventDefault()` y acceder a los archivos vía `e.dataTransfer.files`.

Puntos clave:

- **`preventDefault()` en `dragover`**: Sin esto, el navegador no permite soltar. Es el error más común.
- **`dataTransfer.files`**: Un objeto `FileList` conteniendo los archivos soltados. Cada archivo tiene propiedades `name`, `size`, `type` y `lastModified`.
- **Subida con FormData**: Usar `FormData` para enviar archivos vía `XMLHttpRequest` o `fetch`. `XHR` es necesario para eventos de progreso. `fetch` no soporta progreso de subida aún.
- **FileReader**: Lee contenidos de archivos del lado del cliente. `readAsDataURL` produce un string base64 para previews de imágenes. `readAsText` lee archivos de texto.
- **Validación**: Siempre validar tipo y tamaño del archivo antes de subir. Verificar `file.type` contra una allowlist y `file.size` contra un máximo.

## Variantes

| Feature | Método | Usar Cuando |
|---------|--------|-------------|
| Drop básico | `dataTransfer.files` | Selección simple de archivos |
| Validación | Verificar tipo + tamaño | Apps en producción |
| Seguimiento de progreso | `XMLHttpRequest` upload | Subidas de archivos grandes |
| Preview de imagen | `FileReader.readAsDataURL` | Uploaders de imágenes |
| Click + drag | Hidden file input | Mejor UX |

## Pautas

- Siempre llamar `e.preventDefault()` en los eventos `dragover` y `drop`.
- Validar tipo y tamaño del archivo del lado del cliente antes de subir.
- Usar `XMLHttpRequest` para seguimiento de progreso. `fetch` no soporta eventos de progreso de subida.
- Dar feedback visual durante el arrastre (highlight, cambio de borde, icono).
- Soportar tanto drag-and-drop como click-para-explorar para accesibilidad.
- Mostrar progreso de subida para archivos mayores a 1 MB.
- Limpiar referencias de `FileReader` y `XMLHttpRequest` tras completar.
- Manejar errores de red y de servidor con mensajes amigables para el usuario.

## Errores Comunes

- No llamar `preventDefault()` en `dragover`. El navegador abre el archivo en vez de soltarlo.
- No validar el tipo de archivo. Los usuarios pueden soltar ejecutables o scripts.
- Usar `fetch` para subidas con progreso. `fetch` no soporta eventos de progreso de subida.
- No manejar `dragleave` correctamente. El highlight parpadea al mover sobre elementos hijos.
- Olvidar agregar archivos a `FormData` con un nombre de campo.
- No proveer un fallback de click-para-explorar. Drag-and-drop no es intuitivo para todos los usuarios.

## Preguntas Frecuentes

### ¿Cómo evito que el navegador abra el archivo al soltarlo fuera de la drop zone?

Añade un handler global `dragover` y `drop` en `document` o `window`:

```javascript
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => e.preventDefault());
```

Esto previene que el navegador navegue al archivo si el usuario falla la drop zone.

### ¿Puedo usar fetch en vez de XMLHttpRequest para subidas?

Sí, pero no puedes seguir el progreso de subida con `fetch`. Si no necesitas progreso:

```javascript
const formData = new FormData();
formData.append("file", file);

const response = await fetch("/api/upload", {
    method: "POST",
    body: formData
});
```

### ¿Cómo manejo drag-and-drop en dispositivos móviles?

Los navegadores móviles tienen soporte limitado de drag-and-drop. Siempre provee un fallback de click-para-explorar con un `<input type="file">` oculto. La API de touch events puede usarse para implementaciones móviles custom.

### ¿Cómo limito el número de archivos?

Verifica `files.length` en el handler `drop`:

```javascript
if (files.length > MAX_FILES) {
    showError(`Maximum ${MAX_FILES} files allowed`);
    return;
}
```
