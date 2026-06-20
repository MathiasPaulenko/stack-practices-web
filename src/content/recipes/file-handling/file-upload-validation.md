---
contentType: recipes
slug: file-upload-validation
title: "File Upload Validation"
description: "How to handle file uploads securely with size, type, and content validation."
metaDescription: "Learn secure file upload validation: size limits, MIME type checking, content scanning, and virus detection. Code examples in Python, JavaScript, and Java."
difficulty: intermediate
topics:
  - file-handling
tags:
  - file-handling
  - java
relatedResources:
  - /recipes/input-validation
  - /recipes/jwt-authentication
  - /recipes/password-hashing
  - /recipes/regular-expressions
  - /recipes/read-write-file
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn secure file upload validation: size limits, MIME type checking, content scanning, and virus detection. Code examples in Python, JavaScript, and Java."
  keywords:
    - file-upload
    - validation
    - security
    - mime-type
    - python
    - javascript
    - java
---
## Overview

File uploads are one of the most common attack vectors in web applications. Unvalidated uploads can lead to remote code execution, cross-site scripting, and data breaches. This recipe shows how to validate file uploads by checking size limits, MIME types, magic bytes, and content structure before accepting any file from a user.

## When to Use

Use this resource when:
- Building a web app that accepts user-generated images, documents, or media. See [Image Optimization](/recipes/file-handling/image-optimization) for post-upload processing.
- Implementing a CMS, forum, or SaaS with attachment support. See [Export CSV Excel](/recipes/file-handling/export-csv-excel) for data export features.
- You need to comply with security standards (PCI-DSS, SOC 2). See [Secret Management](/recipes/devops/secret-management) for secure credential storage.
- Processing files from untrusted sources (public forms, APIs). See [Input Validation](/recipes/api/input-validation) for untrusted input handling.

## Solution

### Python

```python
import os
import magic
from werkzeug.utils import secure_filename

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "pdf"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

def validate_upload(file_storage):
    # 1. Check filename extension
    filename = secure_filename(file_storage.filename)
    ext = filename.rsplit(".", 1)[1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Extension not allowed: {ext}")

    # 2. Check file size
    file_storage.seek(0, os.SEEK_END)
    size = file_storage.tell()
    file_storage.seek(0)
    if size > MAX_FILE_SIZE:
        raise ValueError(f"File too large: {size} bytes")

    # 3. Check magic bytes (libmagic)
    mime = magic.from_buffer(file_storage.read(2048), mime=True)
    file_storage.seek(0)
    expected_mimes = {
        "png": "image/png", "jpg": "image/jpeg",
        "jpeg": "image/jpeg", "gif": "image/gif", "pdf": "application/pdf"
    }
    if mime != expected_mimes.get(ext):
        raise ValueError(f"MIME mismatch: got {mime}, expected {expected_mimes.get(ext)}")

    return filename
```

### JavaScript (Node.js)

```javascript
const path = require("path");
const multer = require("multer");
const fileType = require("file-type");
const fs = require("fs");

const ALLOWED = { png: "image/png", jpg: "image/jpeg", pdf: "application/pdf" };
const MAX_SIZE = 5 * 1024 * 1024;

const upload = multer({
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
    if (!ALLOWED[ext]) return cb(new Error("Extension not allowed"));
    cb(null, true);
  },
});

async function validateBuffer(buffer, ext) {
  const type = await fileType.fromBuffer(buffer);
  if (!type || type.mime !== ALLOWED[ext]) {
    throw new Error(`MIME mismatch: ${type?.mime}`);
  }
  return true;
}
```

### Java (Spring Boot)

```java
import org.springframework.web.multipart.MultipartFile;
import java.util.Set;

public class UploadValidator {
    private static final Set<String> ALLOWED = Set.of("image/png", "image/jpeg", "application/pdf");
    private static final long MAX_SIZE = 5L * 1024 * 1024;

    public static void validate(MultipartFile file) {
        if (file.getSize() > MAX_SIZE) {
            throw new IllegalArgumentException("File exceeds 5 MB");
        }
        String contentType = file.getContentType();
        if (!ALLOWED.contains(contentType)) {
            throw new IllegalArgumentException("MIME type not allowed: " + contentType);
        }
        // Additional: check magic bytes with Apache Tika or similar
    }
}
```

## Explanation

Validation should happen in **layers**:

1. **Client-side** — improves UX but is trivial to bypass.
2. **Server-side extension check** — fast but easily spoofed.
3. **Server-side MIME type check** — better, but still relies on HTTP headers.
4. **Magic bytes (file signature)** — reads the actual file content to determine type. The most reliable single check.
5. **Content scanning / AV** — essential for any environment handling untrusted files.

Each layer catches different threats. Never rely on a single check.

## Variants

| Technology | Validation Library | Notes |
|------------|-------------------|-------|
| Python | python-magic | Reads libmagic database; very accurate |
| Node.js | file-type | Pure JS, fast, no native deps |
| Java | Apache Tika | Heavyweight but handles 1000+ formats |
| Go | mimetype | Fast, pure Go, zero-allocation reads |
| Ruby | Marcel | Rails default, uses both extension and magic |

## Best Practices

- **Validate before saving to disk**: Check everything in memory or a temp buffer first.
- **Use random filenames**: Never store files with original user-provided names. Map to UUIDs internally.
- **Store outside web root**: Serve files via controller/API, not direct filesystem access.
- **Scan with AV**: Integrate ClamAV or a cloud scanner for untrusted uploads.
- **Rate limit uploads**: Prevent abuse and disk exhaustion.

## Common Mistakes

- **Trusting the Content-Type header**: Attackers can set this to anything.
- **Relying only on extension**: A `.jpg` can contain PHP code.
- **No size limit**: A single upload can fill your disk.
- **Saving to public directories**: If the file is executable, it may be served and run.
- **No virus scanning**: Malicious files may pass type checks but still harm users.

## Frequently Asked Questions

### Should I validate on the client or server?

**Both.** Client-side validation improves UX with instant feedback. Server-side validation is mandatory for security — never trust anything from the client.

### What is the difference between MIME type and magic bytes?

MIME type is declared by the client in the HTTP `Content-Type` header. Magic bytes are the actual file signature read from the first few bytes of the file content. Magic bytes are far harder to fake.

### How do I prevent users from uploading malware disguised as images?

Use a combination of magic bytes, re-encoding (process the image and re-save it), and antivirus scanning. Re-encoding strips embedded scripts from image files.
