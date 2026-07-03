---
contentType: recipes
slug: nodejs-file-upload-validation
title: "Validación de Subida de Archivos en Node.js: Tipo, Tamaño y Contenido"
description: "Valida subidas de archivos en Node.js con multer para tipo, tamaño y contenido."
metaDescription: "Valida subidas de archivos en Node.js con multer. Verifica MIME types, impón límites de tamaño, escanea contenido y previene subidas maliciosas en Express."
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
  metaDescription: "Valida subidas de archivos en Node.js con multer. Verifica MIME types, impón límites de tamaño, escanea contenido y previene subidas maliciosas en Express."
  keywords:
    - nodejs subida archivos
    - multer validación
    - validación tipo archivo
    - límite tamaño archivo
    - mime type validación
    - express file upload
---

## Visión General

Las subidas de archivos son un vector de ataque común en aplicaciones web. Sin validación adecuada, los atacantes pueden subir archivos maliciosos, sobrescribir archivos del sistema o ejecutar código arbitrario. Esta recipe cubre validar tipo de archivo, tamaño, extensión y contenido usando multer en aplicaciones Node.js Express.

## Cuándo Usar

- Estás construyendo una API que acepta subidas de archivos de usuarios
- Necesitas restringir subidas a tipos específicos (imágenes, documentos)
- Quieres imponer límites de tamaño para prevenir DoS
- Necesitas escanear el contenido del archivo para prevenir subidas maliciosas disfrazadas

## Solución

### Setup básico de multer con límite de tamaño

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

### Validación de tipo de archivo con file filter

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

### Verificación de MIME type basada en contenido

```javascript
const express = require("express");
const multer = require("multer");
const fs = require("fs");
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
            return resolve(true);
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

### Validación de dimensiones de imagen con Sharp

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

### Middleware completo de subida con todas las validaciones

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

## Explicación

La validación de subidas de archivos tiene múltiples capas:

- **Límites de tamaño**: Previene que archivos grandes consuman memoria o disco. El `limits.fileSize` de multer rechaza archivos excedidos antes de que lleguen al disco.
- **Check de extensión**: La extensión del archivo es la primera línea de defensa, pero puede ser falsificada. Verificarla de todos modos.
- **Check de MIME type**: Multer lee el header `Content-Type`. Esto también es falsificable pero atrapa subidas accidentales.
- **Magic bytes**: El tipo de contenido real se determina leyendo los primeros bytes del archivo. Un JPEG siempre empieza con `FF D8 FF`. Esto atrapa archivos con extensiones falsas.
- **Dimensiones de imagen**: Para imágenes, usa Sharp para leer metadata y forzar límites de dimensiones.
- **Saneamiento de filename**: Los filenames provistos por el usuario pueden contener caracteres de path traversal (`../`). Siempre sanea.

## Variantes

| Capa de Validación | Método | Fiabilidad | Overhead |
|--------------------|--------|------------|----------|
| Extensión | String check | Baja (falsificable) | Despreciable |
| MIME type | Content-Type header | Media (falsificable) | Despreciable |
| Magic bytes | Lectura de header | Alta | Bajo (leer primeros N bytes) |
| Escaneo de contenido | Parseo completo | Muy alta | Medio (parsear archivo completo) |
| Escaneo de virus | ClamAV / externo | Muy alta | Alto (scan async) |

## Pautas

- Usa `diskStorage` para archivos grandes. Usa `memoryStorage` solo para archivos pequeños que necesitan procesamiento.
- Siempre sanea los filenames. Remueve separadores de path y caracteres especiales.
- Setea tanto `fileSize` como `files` limits para prevenir DoS.
- Valida el contenido del archivo con magic bytes, no solo el header MIME.
- Almacena subidas fuera del web root para prevenir ejecución directa.
- Usa un CDN u object storage (S3) para producción. No sirvas subidas desde tu servidor.
- Procesa imágenes con Sharp para remover datos EXIF y forzar dimensiones.

## Errores Comunes

- Confiar en el header `Content-Type`. Lo setea el cliente y puede ser cualquier cosa.
- No sanea los filenames. `../../etc/passwd` como filename puede sobrescribir archivos del sistema.
- Usar `memoryStorage` para archivos grandes. Múltiples subidas concurrentes pueden agotar la RAM.
- No setear límite de `files`. Un atacante puede subir miles de archivos en una petición.
- Servir archivos subidos desde el mismo directorio que el código de la aplicación. Esto habilita path traversal y ejecución de código.

## Preguntas Frecuentes

### ¿Cómo subo archivos directamente a S3 en vez de disco local?

Usa `multer-s3` en vez de `multer.diskStorage`:

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

### ¿Cómo escaneo archivos subidos en busca de virus?

Usa el paquete `clamscan` para integrar con ClamAV:

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

### ¿Debo usar memoryStorage o diskStorage?

Usa `memoryStorage` para archivos pequeños (< 1 MB) que necesitan procesamiento inmediato (resize, transform). Usa `diskStorage` para archivos más grandes o cuando necesitas streamear el archivo a otro servicio. `memoryStorage` con múltiples subidas concurrentes puede agotar la RAM del servidor.

### ¿Cómo manejo múltiples tipos de archivo con diferentes límites?

Crea middleware separado para cada tipo:

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
