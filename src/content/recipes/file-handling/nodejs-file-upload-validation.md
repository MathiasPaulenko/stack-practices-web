---
contentType: recipes
slug: nodejs-file-upload-validation
title: "Node.js File Upload Validation: Type, Size, and Content"
description: "Validate file uploads in Node.js with multer for type, size, and content"
metaDescription: "Validate file uploads in Node.js with multer. Check MIME types, enforce size limits, scan content, and prevent malicious uploads in Express."
difficulty: intermediate
topics:
  - file-handling
tags:
  - nodejs
  - express
  - multer
  - file-upload
  - validation
  - security
  - mime-type
relatedResources:
  - /recipes/file-upload-validation
  - /recipes/javascript-drag-drop-file-upload
  - /docs/endpoint-security-checklist-template
  - /guides/graphql-error-handling-best-practices
  - /patterns/file-upload-validation
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Validate file uploads in Node.js with multer. Check MIME types, enforce size limits, scan content, and prevent malicious uploads in Express."
  keywords:
    - nodejs file upload
    - multer validation
    - file type check
    - file size limit
    - mime type validation
    - express file upload
---

## Overview

File uploads are a common attack vector in web applications. Without proper validation, attackers can upload malicious files, overwrite system files, or execute arbitrary code. This approach handles validating file type, size, extension, and content using multer in Node.js Express applications.

## When to Use

- You are building an API that accepts file uploads from users
- You need to restrict uploads to specific file types (images, documents)
- You want to enforce file size limits to prevent DoS
- You need to scan file content to prevent disguised malicious uploads

## Solution

### Basic multer setup with file size limit

```javascript
const express = require("express");
const multer = require("multer");
const path = require("path");

const app = express();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + "-" + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
        files: 1
    }
});

app.post("/api/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }
    res.json({
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
    });
});

app.listen(3000, () => console.log("Server running on port 3000"));
```

### File type validation with file filter

```javascript
const ALLOWED_MIMETYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf"
];

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"];

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
        return cb(new Error(`MIME type ${file.mimetype} is not allowed`), false);
    }

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return cb(new Error(`Extension ${ext} is not allowed`), false);
    }

    cb(null, true);
};

const upload = multer({
    storage: multer.diskStorage({
        destination: "uploads/",
        filename: (req, file, cb) => {
            const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9.-]/g, "_");
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            cb(null, uniqueSuffix + "-" + safeName);
        }
    }),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 5
    },
    fileFilter: fileFilter
});

app.post("/api/upload", upload.array("files", 5), (req, res) => {
    const files = req.files.map(f => ({
        filename: f.filename,
        size: f.size,
        mimetype: f.mimetype
    }));
    res.json({ uploaded: files });
});

// Error handling middleware for multer errors
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({ error: "File too large. Max size: 5MB" });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
            return res.status(400).json({ error: "Too many files. Max: 5" });
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(400).json({ error: "Unexpected field name" });
        }
        return res.status(400).json({ error: err.message });
    }
    if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
});
```

### Content-based MIME type verification

```javascript
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { execFile } = require("child_process");
const path = require("path");

const app = express();

const MAGIC_BYTES = {
    "image/jpeg": [0xff, 0xd8, 0xff],
    "image/png": [0x89, 0x50, 0x4e, 0x47],
    "image/gif": [0x47, 0x49, 0x46, 0x38],
    "application/pdf": [0x25, 0x50, 0x44, 0x46],
    "image/webp": [0x52, 0x49, 0x46, 0x46]
};

function verifyMagicBytes(filePath, expectedMime) {
    return new Promise((resolve, reject) => {
        const expected = MAGIC_BYTES[expectedMime];
        if (!expected) {
            return resolve(true); // No magic bytes defined for this type
        }

        fs.open(filePath, "r", (err, fd) => {
            if (err) return reject(err);

            const buffer = Buffer.alloc(expected.length);
            fs.read(fd, buffer, 0, expected.length, 0, (err, bytesRead, buf) => {
                fs.close(fd, (closeErr) => {
                    if (closeErr) return reject(closeErr);
                    if (err) return reject(err);

                    const matches = expected.every((byte, i) => buf[i] === byte);
                    resolve(matches);
                });
            });
        });
    });
}

const upload = multer({
    storage: multer.diskStorage({
        destination: "uploads/",
        filename: (req, file, cb) => {
            cb(null, Date.now() + "-" + file.originalname);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (MAGIC_BYTES[file.mimetype]) {
            cb(null, true);
        } else {
            cb(new Error("File type not allowed"), false);
        }
    }
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
        const isValid = await verifyMagicBytes(req.file.path, req.file.mimetype);
        if (!isValid) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                error: "File content does not match declared type",
                declared: req.file.mimetype
            });
        }

        res.json({
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
            verified: true
        });
    } catch (err) {
        res.status(500).json({ error: "File verification failed" });
    }
});

app.listen(3000);
```

### Image dimension validation with Sharp

```javascript
const express = require("express");
const multer = require("multer");
const sharp = require("sharp");

const app = express();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only images allowed"), false);
        }
    }
});

app.post("/api/avatar", upload.single("avatar"), async (req, res) => {
    try {
        const metadata = await sharp(req.file.buffer).metadata();

        if (metadata.width > 2000 || metadata.height > 2000) {
            return res.status(400).json({
                error: "Image too large. Max dimensions: 2000x2000",
                actual: `${metadata.width}x${metadata.height}`
            });
        }

        if (metadata.width < 100 || metadata.height < 100) {
            return res.status(400).json({
                error: "Image too small. Min dimensions: 100x100",
                actual: `${metadata.width}x${metadata.height}`
            });
        }

        const processedImage = await sharp(req.file.buffer)
            .resize(256, 256, { fit: "cover" })
            .jpeg({ quality: 80 })
            .toBuffer();

        // Save processedImage to storage
        res.json({
            message: "Avatar uploaded",
            original: `${metadata.width}x${metadata.height}`,
            processed: "256x256"
        });
    } catch (err) {
        res.status(400).json({ error: "Invalid image file" });
    }
});

app.listen(3000);
```

### Complete upload middleware with all validations

```javascript
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const CONFIG = {
    maxFileSize: 5 * 1024 * 1024,
    maxFiles: 5,
    allowedMimetypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".pdf"],
    uploadDir: "uploads/"
};

function createUploadMiddleware(config = CONFIG) {
    const fileFilter = (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();

        if (!config.allowedMimetypes.includes(file.mimetype)) {
            return cb(new Error(`MIME type ${file.mimetype} not allowed`), false);
        }

        if (!config.allowedExtensions.includes(ext)) {
            return cb(new Error(`Extension ${ext} not allowed`), false);
        }

        cb(null, true);
    };

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            fs.mkdirSync(config.uploadDir, { recursive: true });
            cb(null, config.uploadDir);
        },
        filename: (req, file, cb) => {
            const safeName = path.basename(file.originalname)
                .replace(/[^a-zA-Z0-9.-]/g, "_")
                .substring(0, 100);
            cb(null, `${Date.now()}-${safeName}`);
        }
    });

    return multer({
        storage,
        limits: {
            fileSize: config.maxFileSize,
            files: config.maxFiles
        },
        fileFilter
    });
}

// Usage
const uploadMiddleware = createUploadMiddleware();

app.post("/api/documents", uploadMiddleware.array("files", 5), (req, res) => {
    const results = req.files.map(f => ({
        filename: f.filename,
        size: f.size,
        path: f.path
    }));
    res.json({ uploaded: results });
});
```

## Explanation

File upload validation has multiple layers:

- **Size limits**: Prevent large files from consuming memory or disk. Multer's `limits.fileSize` rejects oversized files before they hit disk.
- **Extension check**: The file extension is the first line of defense, but it can be spoofed. Check it anyway.
- **MIME type check**: Multer reads the `Content-Type` header. This is also spoofable but catches accidental uploads.
- **Magic bytes**: The real content type is determined by reading the first few bytes of the file. A JPEG always starts with `FF D8 FF`. This catches files with fake extensions.
- **Image dimensions**: For images, use Sharp to read metadata and enforce dimension limits.
- **Filename sanitization**: User-provided filenames can contain path traversal characters (`../`). Always sanitize.

## Variants

| Validation Layer | Method | Reliability | Overhead |
|------------------|--------|-------------|----------|
| Extension | String check | Low (spoofable) | Negligible |
| MIME type | Content-Type header | Medium (spoofable) | Negligible |
| Magic bytes | File header read | High | Low (read first N bytes) |
| Content scan | Full file parse | Very high | Medium (parse entire file) |
| Virus scan | ClamAV / external | Very high | High (async scan) |

## Guidelines

- Use `diskStorage` for large files. Use `memoryStorage` only for small files that need processing.
- Always sanitize filenames. Remove path separators and special characters.
- Set both `fileSize` and `files` limits to prevent DoS.
- Validate file content with magic bytes, not just the MIME header.
- Store uploads outside the web root to prevent direct execution.
- Use a CDN or object storage (S3) for production. Do not serve uploads from your server.
- Process images with Sharp to strip EXIF data and enforce dimensions.

## Common Mistakes

- Trusting the `Content-Type` header. It is set by the client and can be anything.
- Not sanitizing filenames. `../../etc/passwd` as a filename can overwrite system files.
- Using `memoryStorage` for large files. Multiple concurrent uploads can exhaust RAM.
- Not setting `files` limit. An attacker can upload thousands of files in one request.
- Serving uploaded files from the same directory as application code. This enables path traversal and code execution.

## Frequently Asked Questions

### How do I upload files directly to S3 instead of local disk?

Use `multer-s3` instead of `multer.diskStorage`:

```javascript
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");

const s3 = new S3Client({ region: "us-east-1" });

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: "my-bucket",
        key: (req, file, cb) => {
            cb(null, `uploads/${Date.now()}-${file.originalname}`);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 }
});
```

### How do I scan uploaded files for viruses?

Use `clamscan` package to integrate with ClamAV:

```javascript
const NodeClam = require("clamscan");

const clamscan = new NodeClam().init({
    clamscan: { path: "/usr/bin/clamscan" }
});

async function scanFile(filePath) {
    const { isInfected } = await clamscan.scanFile(filePath);
    if (isInfected) {
        fs.unlinkSync(filePath);
        throw new Error("File infected");
    }
}
```

### Should I use memoryStorage or diskStorage?

Use `memoryStorage` for small files (< 1 MB) that need immediate processing (resize, transform). Use `diskStorage` for larger files or when you need to stream the file to another service. `memoryStorage` with multiple concurrent uploads can exhaust server RAM.

### How do I handle multiple file types with different limits?

Create separate middleware for each type:

```javascript
const imageUpload = createUploadMiddleware({
    allowedMimetypes: ["image/jpeg", "image/png"],
    allowedExtensions: [".jpg", ".png"],
    maxFileSize: 2 * 1024 * 1024
});

const docUpload = createUploadMiddleware({
    allowedMimetypes: ["application/pdf"],
    allowedExtensions: [".pdf"],
    maxFileSize: 10 * 1024 * 1024
});

app.post("/api/images", imageUpload.single("image"), imageHandler);
app.post("/api/docs", docUpload.single("doc"), docHandler);
```
