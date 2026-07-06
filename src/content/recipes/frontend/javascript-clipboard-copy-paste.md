---
contentType: recipes
slug: javascript-clipboard-copy-paste
title: "JavaScript Clipboard Copy and Paste: Navigator API and Fallback"
description: "Copy text to clipboard programmatically in JavaScript with fallback"
metaDescription: "Copy text to clipboard in JavaScript using navigator.clipboard API with fallback for older browsers. Covers execCommand, permissions, and paste event handling."
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
  metaDescription: "Copy text to clipboard in JavaScript using navigator.clipboard API with fallback for older browsers. Covers execCommand, permissions, and paste event handling."
  keywords:
    - javascript clipboard copy
    - navigator.clipboard api
    - copy text javascript
    - clipboard fallback
    - execCommand copy
    - paste event javascript
---

## Overview

The Clipboard API lets you copy and paste text programmatically in the browser. `navigator.clipboard.writeText()` is the modern approach, with `document.execCommand("copy")` as a fallback for older browsers. This approach handles copying text, reading from clipboard, handling permissions, and paste event interception.

## When to Use

- You need a "Copy to clipboard" button for code snippets, URLs, or tokens
- You want to read clipboard content on paste events
- You are building a rich text editor that intercepts paste
- You need clipboard support across modern and legacy browsers

## Solution

### Basic copy to clipboard

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

// Usage
document.getElementById("copy-btn").addEventListener("click", () => {
    copyToClipboard("https://example.com/share-link");
});
```

### Copy with fallback for older browsers

```javascript
async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fall through to fallback
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

// Usage
const button = document.querySelector("#copy-btn");
button.addEventListener("click", async () => {
    const ok = await copyToClipboard("text to copy");
    if (ok) {
        button.textContent = "Copied!";
        setTimeout(() => button.textContent = "Copy", 2000);
    }
});
```

### Read from clipboard

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

// Usage: read clipboard on button click (requires user gesture)
document.getElementById("paste-btn").addEventListener("click", async () => {
    const text = await readClipboard();
    if (text) {
        document.getElementById("output").value = text;
    }
});
```

### Intercept paste events

```javascript
document.getElementById("editor").addEventListener("paste", (event) => {
    event.preventDefault();

    const clipboardData = event.clipboardData || window.clipboardData;
    const pastedText = clipboardData.getData("text/plain");

    // Sanitize or transform pasted content
    const cleanText = pastedText
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();

    document.execCommand("insertText", false, cleanText);
});

// Handle image paste
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

### Copy button for code blocks

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

### Check clipboard permissions

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
            // Will ask on next clipboard operation
            return null;
        }

        return false;
    } catch (err) {
        // permissions API not supported, assume available
        return true;
    }
}

// Usage
const canCopy = await checkClipboardPermission();
if (canCopy === false) {
    showNotification("Clipboard access denied. Please enable it in browser settings.");
}
```

## Explanation

The Clipboard API has two main methods:

- **`navigator.clipboard.writeText(text)`**: Writes text to the clipboard. Returns a promise. Requires a secure context (HTTPS or localhost) and must be triggered by a user gesture (click, keypress).
- **`navigator.clipboard.readText()`**: Reads text from the clipboard. Returns a promise. Requires the `clipboard-read` permission, which browsers typically prompt for on first use.

The fallback `document.execCommand("copy")` is deprecated but still works in older browsers. It requires a visible or off-screen textarea element that is selected before calling `execCommand`.

Key constraints:

- **Secure context**: `navigator.clipboard` only works on HTTPS or `localhost`. On HTTP, use the fallback.
- **User gesture**: Clipboard operations must be triggered by a user action (click, tap, keypress). You cannot copy programmatically without user interaction.
- **Permissions**: Reading clipboard requires explicit permission. Writing is usually allowed with a user gesture.
- **Paste events**: The `paste` event fires on focusable elements (inputs, textareas, contenteditable). Use `event.clipboardData` to access pasted content and `event.preventDefault()` to override default behavior.

## Variants

| Method | Browser Support | Async | Use When |
|--------|----------------|-------|----------|
| `navigator.clipboard.writeText` | Modern browsers | Yes | Default choice, HTTPS |
| `document.execCommand("copy")` | All browsers | No | Fallback for legacy |
| `navigator.clipboard.readText` | Modern browsers | Yes | Reading clipboard |
| Paste event handler | All browsers | No | Intercepting paste |

## Guidelines

- Always use `navigator.clipboard` first, with `execCommand` as fallback.
- Require HTTPS for the modern API. It does not work on HTTP.
- Provide visual feedback after copy (e.g., "Copied!" text or icon change).
- Handle errors gracefully. Clipboard access can be denied by the user.
- Sanitize pasted content in rich text editors to prevent XSS.
- Do not read clipboard without user interaction. Browsers block this.
- Test on mobile browsers. Some have different clipboard permission flows.

## Common Mistakes

- Calling `navigator.clipboard` on HTTP. It only works on HTTPS or localhost.
- Not providing a fallback for older browsers. The modern API is not universal.
- Not handling the rejected promise. The user may deny clipboard permission.
- Forgetting to remove the off-screen textarea in the fallback. It causes memory leaks.
- Trying to read clipboard without a user gesture. Browsers block this for security.
- Not sanitizing pasted HTML. Pasting from Word or browsers can inject malicious markup.

## Frequently Asked Questions

### Why does navigator.clipboard not work on localhost with HTTP?

The Clipboard API requires a secure context. `localhost` is considered secure even over HTTP, but other HTTP origins are not. Use HTTPS in production or test on `localhost`.

### How do I copy rich text or HTML to the clipboard?

Use `navigator.clipboard.write()` with a `ClipboardItem`:

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

### Can I copy without a button click?

No. Browsers require a user gesture (click, tap, keypress) for clipboard operations. You cannot copy automatically on page load or in a timeout without prior user interaction.

### How do I copy an image to the clipboard?

Use `navigator.clipboard.write()` with a PNG blob:

```javascript
const response = await fetch("image.png");
const blob = await response.blob();

await navigator.clipboard.write([
    new ClipboardItem({ "image/png": blob })
]);
```
