---

contentType: recipes
slug: javascript-clipboard-copy-paste
title: "Copiar y Pegar con Clipboard en JavaScript"
description: "Copia texto al portapapeles programáticamente en JavaScript con fallback"
metaDescription: "Copia texto al portapapeles en JavaScript con navigator.clipboard API y fallback para navegadores antiguos. Cubre execCommand, permisos y manejo de eventos paste."
difficulty: beginner
topics:
  - frontend
tags:
  - javascript
  - clipboard
  - copy-paste
  - navigator-api
  - browser
  - dom
relatedResources:
  - /recipes/javascript-localstorage-expiration
  - /recipes/javascript-drag-drop-file-upload
  - /recipes/javascript-infinite-scroll-pagination
  - /guides/terraform-best-practices-guide
  - /docs/deployment-checklist-template
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Copia texto al portapapeles en JavaScript con navigator.clipboard API y fallback para navegadores antiguos. Cubre execCommand, permisos y manejo de eventos paste."
  keywords:
    - javascript clipboard copy
    - navigator.clipboard api
    - copy text javascript
    - clipboard fallback
    - execCommand copy
    - paste event javascript

---

## Visión General

La Clipboard API permite copiar y pegar texto programáticamente en el navegador. `navigator.clipboard.writeText()` es el enfoque moderno, con `document.execCommand("copy")` como fallback para navegadores antiguos. Esta recipe cubre copiar texto, leer del portapapeles, manejar permisos e interceptar eventos de pegado.

## Cuándo Usar


- For alternatives, see [JavaScript Infinite Scroll Pagination with](/es/recipes/javascript-infinite-scroll-pagination/).

- Necesitas un botón "Copiar al portapapeles" para snippets de código, URLs o tokens
- Quieres leer contenido del portapapeles en eventos de pegado
- Estás construyendo un editor de texto rico que intercepta el pegado
- Necesitas soporte de portapapeles en navegadores modernos y legacy

## Solución

### Copiar al portapapeles básico

```javascript
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        console.log("Copied to clipboard");
        return true;
    } catch (err) {
        console.error("Failed to copy:", err);
        return false;
    }
}

// Uso
document.getElementById("copy-btn").addEventListener("click", () => {
    copyToClipboard("https://example.com/share-link");
});
```

### Copiar con fallback para navegadores antiguos

```javascript
async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Caer al fallback
        }
    }

    // Fallback: execCommand
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
        const success = document.execCommand("copy");
        document.body.removeChild(textarea);
        return success;
    } catch (err) {
        document.body.removeChild(textarea);
        return false;
    }
}

// Uso
const button = document.querySelector("#copy-btn");
button.addEventListener("click", async () => {
    const ok = await copyToClipboard("text to copy");
    if (ok) {
        button.textContent = "Copied!";
        setTimeout(() => button.textContent = "Copy", 2000);
    }
});
```

### Leer del portapapeles

```javascript
async function readClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        console.log("Clipboard content:", text);
        return text;
    } catch (err) {
        console.error("Failed to read clipboard:", err);
        return null;
    }
}

// Uso: leer portapapeles al hacer click (requiere gesto del usuario)
document.getElementById("paste-btn").addEventListener("click", async () => {
    const text = await readClipboard();
    if (text) {
        document.getElementById("output").value = text;
    }
});
```

### Interceptar eventos de pegado

```javascript
document.getElementById("editor").addEventListener("paste", (event) => {
    event.preventDefault();

    const clipboardData = event.clipboardData || window.clipboardData;
    const pastedText = clipboardData.getData("text/plain");

    // Sanitizar o transformar el contenido pegado
    const cleanText = pastedText
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    document.execCommand("insertText", false, cleanText);
});

// Manejar pegado de imágenes
document.getElementById("image-editor").addEventListener("paste", (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
        if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = document.createElement("img");
                img.src = e.target.result;
                document.getElementById("preview").appendChild(img);
            };

            reader.readAsDataURL(file);
        }
    }
});
```

### Botón de copiar para bloques de código

```javascript
function addCopyButtons() {
    const codeBlocks = document.querySelectorAll("pre code");

    codeBlocks.forEach((codeBlock) => {
        const button = document.createElement("button");
        button.className = "copy-btn";
        button.textContent = "Copy";
        button.style.position = "absolute";
        button.style.top = "8px";
        button.style.right = "8px";

        button.addEventListener("click", async () => {
            const text = codeBlock.textContent;
            const ok = await copyToClipboard(text);

            if (ok) {
                button.textContent = "Copied!";
                setTimeout(() => button.textContent = "Copy", 2000);
            }
        });

        const pre = codeBlock.parentElement;
        pre.style.position = "relative";
        pre.appendChild(button);
    });
}

addCopyButtons();
```

### Verificar permisos del portapapeles

```javascript
async function checkClipboardPermission() {
    try {
        const permission = await navigator.permissions.query({
            name: "clipboard-write"
        });

        if (permission.state === "granted") {
            return true;
        }

        if (permission.state === "prompt") {
            // Preguntará en la próxima operación del portapapeles
            return null;
        }

        return false;
    } catch (err) {
        // permissions API no soportada, asumir disponible
        return true;
    }
}

// Uso
const canCopy = await checkClipboardPermission();
if (canCopy === false) {
    showNotification("Clipboard access denied. Please enable it in browser settings.");
}
```

## Explicación

La Clipboard API tiene dos métodos principales:

- **`navigator.clipboard.writeText(text)`**: Escribe texto al portapapeles. Retorna una promesa. Requiere un contexto seguro (HTTPS o localhost) y debe ser disparado por un gesto del usuario (click, keypress).
- **`navigator.clipboard.readText()`**: Lee texto del portapapeles. Retorna una promesa. Requiere el permiso `clipboard-read`, que los navegadores suelen solicitar en el primer uso.

El fallback `document.execCommand("copy")` está deprecado pero sigue funcionando en navegadores antiguos. Requiere un elemento textarea visible u off-screen que esté seleccionado antes de llamar `execCommand`.

Restricciones clave:

- **Contexto seguro**: `navigator.clipboard` solo funciona en HTTPS o `localhost`. En HTTP, usar el fallback.
- **Gesto del usuario**: Las operaciones del portapapeles deben ser disparadas por una acción del usuario (click, tap, keypress). No se puede copiar programáticamente sin interacción del usuario.
- **Permisos**: Leer el portapapeles requiere permiso explícito. Escribir suele estar permitido con un gesto del usuario.
- **Eventos de pegado**: El evento `paste` se dispara en elementos focusable (inputs, textareas, contenteditable). Usa `event.clipboardData` para acceder al contenido pegado y `event.preventDefault()` para sobreescribir el comportamiento por defecto.

## Variantes

| Método | Soporte | Async | Usar Cuando |
|--------|---------|-------|-------------|
| `navigator.clipboard.writeText` | Navegadores modernos | Sí | Opción por defecto, HTTPS |
| `document.execCommand("copy")` | Todos los navegadores | No | Fallback para legacy |
| `navigator.clipboard.readText` | Navegadores modernos | Sí | Leer portapapeles |
| Handler de evento paste | Todos los navegadores | No | Interceptar pegado |

## Pautas

- Siempre usar `navigator.clipboard` primero, con `execCommand` como fallback.
- Requerir HTTPS para la API moderna. No funciona en HTTP.
- Dar feedback visual después de copiar (ej., texto "Copiado!" o cambio de icono).
- Manejar errores gracefulmente. El acceso al portapapeles puede ser denegado por el usuario.
- Sanitizar contenido pegado en editores de texto rico para prevenir XSS.
- No leer el portapapeles sin interacción del usuario. Los navegadores lo bloquean.
- Probar en navegadores móviles. Algunos tienen flujos de permisos diferentes.

## Errores Comunes

- Llamar `navigator.clipboard` en HTTP. Solo funciona en HTTPS o localhost.
- No proveer un fallback para navegadores antiguos. La API moderna no es universal.
- No manejar la promesa rechazada. El usuario puede denegar el permiso del portapapeles.
- Olvidar remover el textarea off-screen en el fallback. Causa memory leaks.
- Intentar leer el portapapeles sin un gesto del usuario. Los navegadores lo bloquean por seguridad.
- No sanitizar HTML pegado. Pegar desde Word o navegadores puede inyectar markup malicioso.

## Preguntas Frecuentes

### ¿Por qué navigator.clipboard no funciona en localhost con HTTP?

La Clipboard API requiere un contexto seguro. `localhost` es considerado seguro incluso sobre HTTP, pero otros orígenes HTTP no. Usa HTTPS en producción o prueba en `localhost`.

### ¿Cómo copio texto rico o HTML al portapapeles?

Usa `navigator.clipboard.write()` con un `ClipboardItem`:

```javascript
const htmlBlob = new Blob(["<b>Bold text</b>"], { type: "text/html" });
const textBlob = new Blob(["Bold text"], { type: "text/plain" });

await navigator.clipboard.write([
    new ClipboardItem({
        "text/html": htmlBlob,
        "text/plain": textBlob
    })
]);
```

### ¿Puedo copiar sin un click de botón?

No. Los navegadores requieren un gesto del usuario (click, tap, keypress) para operaciones del portapapeles. No se puede copiar automáticamente al cargar la página o en un timeout sin interacción previa del usuario.

### ¿Cómo copio una imagen al portapapeles?

Usa `navigator.clipboard.write()` con un PNG blob:

```javascript
const response = await fetch("image.png");
const blob = await response.blob();

await navigator.clipboard.write([
    new ClipboardItem({ "image/png": blob })
]);
```
