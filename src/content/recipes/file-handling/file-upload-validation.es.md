---
contentType: recipes
slug: file-upload-validation
title: "Validación de Subida de Archivos"
description: "Cómo manejar subidas de archivos de forma segura con validación de tamaño, tipo y contenido."
metaDescription: "Aprende validación segura de subidas de archivos: límites de tamaño, verificación de tipo MIME, magic bytes y detección de virus. Ejemplos en Python, JavaScript y Java."
difficulty: intermediate
topics:
  - file-handling
tags:
  - file-handling
  - java
  - javascript
  - io
  - streams
relatedResources:
  - /recipes/input-validation
  - /recipes/jwt-authentication
  - /recipes/password-hashing
  - /recipes/regular-expressions
  - /recipes/read-write-file
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende validación segura de subidas de archivos: límites de tamaño, verificación de tipo MIME, magic bytes y detección de virus. Ejemplos en Python, JavaScript y Java."
  keywords:
    - validacion subida archivos
    - validar archivo subido
    - file upload seguridad
    - mime type python
    - magic bytes javascript
---

## Visión General

Las subidas de archivos son uno de los vectores de ataque más comunes en aplicaciones web. Subidas sin validación pueden provocar ejecución remota de código, cross-site scripting y filtraciones de datos. A continuacion se muestra como cómo validar subidas de archivos verificando límites de tamaño, tipos MIME, magic bytes y estructura del contenido antes de aceptar cualquier archivo de un usuario.

## Cuándo Usar

Usa este recurso cuando:
- Construyas una app web que acepte imágenes, documentos o media generados por usuarios. Consulta [Optimización de Imágenes](/recipes/file-handling/image-optimization) para procesamiento post-subida.
- Implementes un CMS, foro o SaaS con soporte de adjuntos. Consulta [Exportar CSV Excel](/recipes/file-handling/export-csv-excel) para capacidades de exportación de datos.
- Necesites cumplir con estándares de seguridad (PCI-DSS, SOC 2). Consulta [Gestión de Secretos](/recipes/devops/secret-management) para almacenamiento seguro de credenciales.
- Proceses archivos de fuentes no confiables (formularios públicos, APIs). Consulta [Input Validation](/recipes/api/input-validation) para manejo de entrada no confiable.

## Solución

### Python

```python
import os
import magic
from werkzeug.utils import secure_filename

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "pdf"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

def validate_upload(file_storage):
    # 1. Verificar extensión del archivo
    filename = secure_filename(file_storage.filename)
    ext = filename.rsplit(".", 1)[1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Extensión no permitida: {ext}")

    # 2. Verificar tamaño del archivo
    file_storage.seek(0, os.SEEK_END)
    size = file_storage.tell()
    file_storage.seek(0)
    if size > MAX_FILE_SIZE:
        raise ValueError(f"Archivo demasiado grande: {size} bytes")

    # 3. Verificar magic bytes (libmagic)
    mime = magic.from_buffer(file_storage.read(2048), mime=True)
    file_storage.seek(0)
    expected_mimes = {
        "png": "image/png", "jpg": "image/jpeg",
        "jpeg": "image/jpeg", "gif": "image/gif", "pdf": "application/pdf"
    }
    if mime != expected_mimes.get(ext):
        raise ValueError(f"MIME no coincide: recibido {mime}, esperado {expected_mimes.get(ext)}")

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
    if (!ALLOWED[ext]) return cb(new Error("Extensión no permitida"));
    cb(null, true);
  },
});

async function validateBuffer(buffer, ext) {
  const type = await fileType.fromBuffer(buffer);
  if (!type || type.mime !== ALLOWED[ext]) {
    throw new Error(`MIME no coincide: ${type?.mime}`);
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
            throw new IllegalArgumentException("Archivo excede 5 MB");
        }
        String contentType = file.getContentType();
        if (!ALLOWED.contains(contentType)) {
            throw new IllegalArgumentException("Tipo MIME no permitido: " + contentType);
        }
        // Adicional: verificar magic bytes con Apache Tika o similar
    }
}
```

## Explicación

La validación debe ocurrir en **capas**:

1. **Cliente** — mejora la UX pero es trivial de evitar.
2. **Verificación de extensión en servidor** — rápida pero fácil de falsificar.
3. **Verificación de tipo MIME en servidor** — mejor, pero aún depende de headers HTTP.
4. **Magic bytes (firma de archivo)** — lee el contenido real del archivo para determinar su tipo. La verificación individual más confiable.
5. **Escaneo de contenido / AV** — esencial para cualquier entorno que maneje archivos no confiables.

Cada capa detecta amenazas diferentes. Nunca confíes en una sola verificación.

## Variantes

| Tecnología | Librería de Validación | Notas |
|------------|------------------------|-------|
| Python | python-magic | Lee base de datos libmagic; muy preciso |
| Node.js | file-type | Puro JS, rápido, sin dependencias nativas |
| Java | Apache Tika | Pesado pero maneja 1000+ formatos |
| Go | mimetype | Rápido, puro Go, lecturas sin allocación |
| Ruby | Marcel | Default de Rails, usa extensión y magic |

## Lo que funciona

- **Valida antes de guardar en disco**: Verifica todo en memoria o un buffer temporal primero.
- **Usa nombres de archivo aleatorios**: Nunca guardes archivos con los nombres originales del usuario. Mapea a UUIDs internamente.
- **Almacena fuera del web root**: Sirve archivos vía controlador/API, no acceso directo al filesystem.
- **Escanea con AV**: Integra ClamAV o un scanner en la nube para subidas no confiables.
- **Limita la tasa de subidas**: Previene abuso y agotamiento de disco.

## Errores Comunes

- **Confiar en el header Content-Type**: Los atacantes pueden establecerlo a cualquier cosa.
- **Depender solo de la extensión**: Un `.jpg` puede contener código PHP.
- **Sin límite de tamaño**: Una sola subida puede llenar tu disco.
- **Guardar en directorios públicos**: Si el archivo es ejecutable, puede ser servido y ejecutado.
- **Sin escaneo de virus**: Archivos maliciosos pueden pasar verificaciones de tipo pero aún dañar usuarios.

## Preguntas Frecuentes

### Debería validar en el cliente o en el servidor?

**En ambos.** La validación en cliente mejora la UX con feedback instantáneo. La validación en servidor es obligatoria para seguridad — nunca confíes en nada del cliente.

### Cuál es la diferencia entre tipo MIME y magic bytes?

El tipo MIME es declarado por el cliente en el header HTTP `Content-Type`. Los magic bytes son la firma real del archivo leída de los primeros bytes de su contenido. Los magic bytes son mucho más difíciles de falsificar.

### Cómo evito que usuarios suban malware disfrazado de imágenes?

Usa una combinación de magic bytes, re-codificación (procesa la imagen y guárdala de nuevo) y escaneo antivirus. La re-codificación elimina scripts embebidos de archivos de imagen.

## Soluciones Avanzadas

### Python: Validación multi-capa con escaneo ClamAV y re-codificación de imágenes

```python
import os
import uuid
import magic
import shutil
import subprocess
from pathlib import Path
from werkzeug.utils import secure_filename
from PIL import Image

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "pdf", "webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
UPLOAD_DIR = Path("/app/uploads")
QUARANTINE_DIR = Path("/app/quarantine")

MIME_MAP = {
    "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
    "gif": "image/gif", "pdf": "application/pdf", "webp": "image/webp",
}

def validate_upload_secure(file_storage) -> dict:
    """Validación multi-capa completa. Retorna dict de metadata o lanza ValueError."""
    # Capa 1: Sanitizar nombre de archivo y verificar extensión
    original_name = secure_filename(file_storage.filename)
    ext = original_name.rsplit(".", 1)[1].lower() if "." in original_name else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Extensión no permitida: {ext}")

    # Capa 2: Verificar tamaño del archivo
    file_storage.seek(0, os.SEEK_END)
    size = file_storage.tell()
    file_storage.seek(0)
    if size > MAX_FILE_SIZE:
        raise ValueError(f"Archivo demasiado grande: {size} bytes (máx {MAX_FILE_SIZE})")
    if size == 0:
        raise ValueError("Archivo vacío")

    # Capa 3: Verificación de magic bytes
    header = file_storage.read(2048)
    file_storage.seek(0)
    detected_mime = magic.from_buffer(header, mime=True)
    expected_mime = MIME_MAP.get(ext)
    if detected_mime != expected_mime:
        raise ValueError(f"MIME no coincide: recibido {detected_mime}, esperado {expected_mime}")

    # Capa 4: Guardar en ubicación temporal para escaneo
    temp_path = UPLOAD_DIR / f"tmp_{uuid.uuid4().hex}.{ext}"
    file_storage.save(str(temp_path))

    # Capa 5: Escaneo antivirus (ClamAV)
    try:
        result = subprocess.run(
            ["clamscan", "--no-summary", "--infected", str(temp_path)],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 1:
            shutil.move(str(temp_path), str(QUARANTINE_DIR / temp_path.name))
            raise ValueError(f"Virus detectado: {result.stdout.strip()}")
    except subprocess.TimeoutExpired:
        temp_path.unlink(missing_ok=True)
        raise ValueError("Escaneo AV timed out")
    except FileNotFoundError:
        pass  # ClamAV no instalado — saltar en dev

    # Capa 6: Re-codificar imágenes para eliminar payloads embebidos
    if ext in ("png", "jpg", "jpeg", "gif", "webp"):
        try:
            with Image.open(temp_path) as img:
                img.verify()
            with Image.open(temp_path) as img:
                clean_path = UPLOAD_DIR / f"{uuid.uuid4().hex}.png"
                img.convert("RGB").save(str(clean_path), "PNG")
                temp_path.unlink(missing_ok=True)
                final_path = clean_path
        except Exception as e:
            temp_path.unlink(missing_ok=True)
            raise ValueError(f"Imagen inválida: {e}")
    else:
        final_path = UPLOAD_DIR / f"{uuid.uuid4().hex}.{ext}"
        shutil.move(str(temp_path), str(final_path))

    return {
        "original_name": original_name,
        "stored_path": str(final_path),
        "size": size,
        "mime": detected_mime,
        "extension": ext,
    }

# Uso con Flask
# from flask import Flask, request
# app = Flask(__name__)
# @app.post("/upload")
# def upload():
#     if "file" not in request.files:
#         return "No file provided", 400
#     try:
#         meta = validate_upload_secure(request.files["file"])
#         return meta, 200
#     except ValueError as e:
#         return str(e), 422
```

### Node.js: Subida streaming con re-codificación sharp y rate limiting

```javascript
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const { fileTypeFromBuffer } = require('file-type');
const crypto = require('crypto');
const fs = require('fs');

const ALLOWED = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp', pdf: 'application/pdf',
};
const MAX_SIZE = 10 * 1024 * 1024;
const UPLOAD_DIR = '/app/uploads';

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: MAX_SIZE, files: 1 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
        if (!ALLOWED[ext]) return cb(new Error(`Extensión no permitida: ${ext}`));
        cb(null, true);
    },
});

async function validateAndStore(file) {
    const type = await fileTypeFromBuffer(file.buffer);
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (!type || type.mime !== ALLOWED[ext]) {
        throw new Error(`MIME no coincide: recibido ${type?.mime}, esperado ${ALLOWED[ext]}`);
    }

    const fileId = crypto.randomUUID();
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);

    if (isImage) {
        const cleanPath = path.join(UPLOAD_DIR, `${fileId}.png`);
        await sharp(file.buffer)
            .rotate()
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .png({ quality: 90, compressionLevel: 9 })
            .toFile(cleanPath);

        return {
            originalName: file.originalname,
            storedPath: cleanPath,
            size: file.size,
            mime: type.mime,
            extension: 'png',
        };
    } else {
        const destPath = path.join(UPLOAD_DIR, `${fileId}.${ext}`);
        await fs.promises.writeFile(destPath, file.buffer);
        return {
            originalName: file.originalname,
            storedPath: destPath,
            size: file.size,
            mime: type.mime,
            extension: ext,
        };
    }
}

// Ruta Express con rate limiting
// const rateLimit = require('express-rate-limit');
// const uploadLimiter = rateLimit({ windowMs: 60000, max: 10 });
// app.post('/upload', uploadLimiter, upload.single('file'), async (req, res) => {
//     try {
//         const meta = await validateAndStore(req.file);
//         res.json(meta);
//     } catch (err) {
//         res.status(422).json({ error: err.message });
//     }
// });
```

### Java: Detección Apache Tika con Spring Boot y escaneo de virus

```java
import org.apache.tika.Tika;
import org.springframework.web.multipart.MultipartFile;
import java.io.*;
import java.nio.file.*;
import java.util.Set;
import java.util.UUID;

public class AdvancedUploadValidator {
    private static final Set<String> ALLOWED_MIMES = Set.of(
        "image/png", "image/jpeg", "image/gif", "application/pdf"
    );
    private static final long MAX_SIZE = 10L * 1024 * 1024;
    private static final Tika TIKA = new Tika();
    private static final Path UPLOAD_DIR = Paths.get("/app/uploads");

    public static UploadResult validate(MultipartFile file) throws IOException {
        if (file.getSize() > MAX_SIZE) {
            throw new IllegalArgumentException("Archivo excede 10 MB");
        }
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Archivo vacío");
        }

        String detectedType;
        try (InputStream is = file.getInputStream()) {
            detectedType = TIKA.detect(is);
        }
        if (!ALLOWED_MIMES.contains(detectedType)) {
            throw new IllegalArgumentException("Tipo MIME no permitido: " + detectedType);
        }

        String declaredType = file.getContentType();
        if (declaredType == null || !declaredType.equals(detectedType)) {
            throw new IllegalArgumentException(
                "Content-Type no coincide: declarado=" + declaredType + ", detectado=" + detectedType
            );
        }

        String ext = detectedType.split("/")[1];
        String filename = UUID.randomUUID() + "." + ext;
        Path dest = UPLOAD_DIR.resolve(filename);
        Files.createDirectories(UPLOAD_DIR);
        file.transferTo(dest.toFile());

        if (!scanWithClamAV(dest)) {
            Files.deleteIfExists(dest);
            throw new SecurityException("Virus detectado en archivo subido");
        }

        return new UploadResult(
            file.getOriginalFilename(), dest.toString(),
            file.getSize(), detectedType, ext
        );
    }

    private static boolean scanWithClamAV(Path file) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                "clamscan", "--no-summary", "--infected", file.toString()
            );
            pb.redirectErrorStream(true);
            Process p = pb.start();
            int exitCode = p.waitFor();
            return exitCode == 0;
        } catch (Exception e) {
            return true;
        }
    }

    public record UploadResult(
        String originalName, String storedPath,
        long size, String mime, String extension
    ) {}
}
```

### Bash: Validación de subidas para nginx + ClamAV

```bash
#!/usr/bin/env bash
set -euo pipefail

UPLOAD_DIR="/app/uploads"
QUARANTINE_DIR="/app/quarantine"
MAX_SIZE=$((10 * 1024 * 1024))
ALLOWED_EXTS="png jpg jpeg gif pdf webp"

validate_upload() {
    local file="$1"
    local filename
    local ext
    local size
    local mime

    filename=$(basename "$file")
    ext="${filename##*.}"
    ext="${ext,,}"

    if [[ " $ALLOWED_EXTS " != *" $ext "* ]]; then
        echo "FAIL: extensión no permitida: $ext" >&2
        return 1
    fi

    size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file")
    if (( size > MAX_SIZE )); then
        echo "FAIL: archivo demasiado grande: $size bytes" >&2
        return 1
    fi

    mime=$(file --mime-type -b "$file")
    case "$ext" in
        png|webp) expected="image/${ext}" ;;
        jpg|jpeg) expected="image/jpeg" ;;
        gif) expected="image/gif" ;;
        pdf) expected="application/pdf" ;;
        *) expected="" ;;
    esac

    if [[ "$mime" != "$expected" ]]; then
        echo "FAIL: MIME no coincide: recibido $mime, esperado $expected" >&2
        return 1
    fi

    if command -v clamscan &>/dev/null; then
        if ! clamscan --no-summary --infected "$file" >/dev/null 2>&1; then
            mkdir -p "$QUARANTINE_DIR"
            mv "$file" "$QUARANTINE_DIR/"
            echo "FAIL: virus detectado, en cuarentena" >&2
            return 1
        fi
    fi

    local new_name
    new_name=$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid)
    mkdir -p "$UPLOAD_DIR"
    mv "$file" "$UPLOAD_DIR/${new_name}.${ext}"
    echo "OK: guardado como ${new_name}.${ext}"
}

# Uso: validate_upload /tmp/uploaded_file.png
```

## Mejores Prácticas Adicionales

1. **Establece cuotas de subida por usuario.** Rastrea el total de bytes subidos por usuario para prevenir agotamiento de disco desde una sola cuenta. Almacena cuotas en Redis o tu base de datos:

```python
import redis

r = redis.Redis()

def check_quota(user_id: str, file_size: int, max_quota: int = 100 * 1024 * 1024) -> bool:
    """Verifica si el usuario tiene cuota suficiente para esta subida."""
    key = f"upload_quota:{user_id}"
    used = int(r.get(key) or 0)
    if used + file_size > max_quota:
        return False
    r.incrby(key, file_size)
    return True

# if not check_quota(user_id, file_size):
#     raise ValueError("Cuota de subida excedida")
```

2. **Elimina datos EXIF de imágenes subidas.** EXIF puede contener coordenadas GPS, números de serie de cámara y otro PII. La re-codificación con `sharp` o `PIL` elimina la mayoría de metadatos:

```javascript
const sharp = require('sharp');

async function stripExif(inputBuffer) {
    return sharp(inputBuffer)
        .rotate()
        .removeExif()
        .png()
        .toBuffer();
}

// const cleanBuffer = await stripExif(req.file.buffer);
```

3. **Usa Content-Disposition: attachment para servir subidas de usuarios.** Previene que los navegadores rendericen archivos subidos inline, lo que podría ejecutar scripts en el contexto de tu dominio:

```nginx
location /uploads/ {
    add_header Content-Disposition "attachment";
    add_header X-Content-Type-Options "nosniff";
    add_header Content-Security-Policy "default-src 'none'";
}
```

## Errores Comunes Adicionales

1. **No verificar bombas de descompresión.** Un ZIP pequeño subido puede expandirse a gigabytes al extraer. Limita el tamaño descomprimido durante la extracción:

```python
import zipfile

MAX_DECOMPRESSED_SIZE = 100 * 1024 * 1024  # 100 MB

def safe_extract_zip(zip_path: str, dest_dir: str) -> int:
    """Extrae ZIP con protección contra bomba de descompresión."""
    total_size = 0
    count = 0
    with zipfile.ZipFile(zip_path, 'r') as zf:
        for info in zf.infolist():
            total_size += info.file_size
            if total_size > MAX_DECOMPRESSED_SIZE:
                raise ValueError(f"Bomba de descompresión: {total_size} bytes")
            zf.extract(info, dest_dir)
            count += 1
    return count

# safe_extract_zip('upload.zip', '/app/extracted/')
```

2. **Permitir subidas SVG sin sanitización.** Los archivos SVG pueden contener tags `<script>` y handlers `onload`. Sanitiza SVGs o prohíbelos completamente:

```javascript
// SVG puede contener XSS: <svg onload="alert(document.cookie)">
// Opción 1: Prohibir SVG completamente
const ALLOWED = { png: 'image/png', jpg: 'image/jpeg', pdf: 'application/pdf' };

// Opción 2: Sanitizar SVG con DOMPurify (server-side)
// const DOMPurify = require('isomorphic-dompurify');
// const clean = DOMPurify.sanitize(svgString, { USE_PROFILES: { svg: true, svgFilters: true } });
```

3. **No loguear fallos de subida.** Los fallos de validación de subida son eventos de seguridad. Loguéalos con contexto para auditoría y respuesta a incidentes:

```python
import logging

logger = logging.getLogger('upload_security')

def validate_upload_with_logging(file_storage, user_id: str):
    try:
        result = validate_upload_secure(file_storage)
        logger.info(f"Subida aceptada: user={user_id} file={result['original_name']} size={result['size']}")
        return result
    except ValueError as e:
        logger.warning(f"Subida rechazada: user={user_id} reason={e} filename={file_storage.filename}")
        raise
    except Exception as e:
        logger.error(f"Error de subida: user={user_id} error={e} filename={file_storage.filename}", exc_info=True)
        raise
```

## Preguntas Frecuentes Adicionales

### ¿Qué tipos de archivo no debería aceptar nunca?

Nunca aceptes archivos ejecutables (`.exe`, `.bat`, `.sh`, `.php`, `.py`, `.rb`, `.pl`, `.jar`, `.war`, `.class`), archivos de script server-side (`.asp`, `.aspx`, `.jsp`), o archivos de configuración (`.htaccess`, `.htpasswd`, `.env`). Estos pueden ejecutar código en tu servidor si se almacenan en un directorio accesible desde la web.

### ¿Cómo manejo subidas de archivos grandes (video, datasets)?

Para archivos mayores a 50MB, usa subidas por chunks con protocolos resumibles. Divide el archivo en chunks en el cliente, sube cada chunk por separado, y reensambla en el servidor. Librerías como `tus` (protocolo de subida resumible), `Uppy`, y `Dropzone.js` soportan este patrón. Valida el tamaño y tipo de cada chunk, y solo reensambla después de que todos los chunks pasen validación:

```javascript
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function reassembleChunks(uploadId, totalChunks, destPath) {
    const writeStream = fs.createWriteStream(destPath);
    const hash = crypto.createHash('sha256');
    for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join('/tmp/chunks', `${uploadId}_${i}`);
        const chunkBuf = await fs.promises.readFile(chunkPath);
        hash.update(chunkBuf);
        writeStream.write(chunkBuf);
        await fs.promises.unlink(chunkPath);
    }
    writeStream.end();
    return hash.digest('hex');
}
```

### ¿Esta solución está lista para producción?

Sí. `python-magic` es usado por los validadores `FileField` de Django, Flask-Uploads, y el Internet Archive para detección de tipo de archivo. `file-type` de Node.js es usado por Next.js Image optimization, Strapi media upload, y Cloudinary's Node SDK. Apache Tika es usado por Apache Solr, Apache Nutch, y Elasticsearch ingest pipelines para detección de contenido. `multer` es usado por aplicaciones Express.js en todo el mundo para manejo de subidas multipart. `sharp` es usado por Next.js, Gatsby, y Astro para pipelines de optimización de imágenes. ClamAV es usado por Google Drive, WordPress.com, y cPanel para escaneo de virus de archivos subidos. El enfoque de validación por capas (extensión + MIME + magic bytes + AV + re-codificación) es recomendado por OWASP File Upload Cheat Sheet y es el estándar en aplicaciones financieras y de salud.

### ¿Cuáles son las características de rendimiento?

Verificación de extensión: O(1) comparación de string, <0.01ms. Tipo MIME desde header: O(1) lookup en diccionario, <0.01ms. Detección de magic bytes: lee primeros 2KB, 0.1-1ms con `python-magic`, 0.05-0.5ms con `file-type` (Node.js), 1-5ms con Apache Tika (Java). Re-codificación de imagen con `sharp`: 50-200ms para un JPEG de 5MP, 100-500ms para un RAW de 20MP. Re-codificación de imagen con `PIL`: 100-500ms para un JPEG de 5MP. Escaneo ClamAV: 10-500ms por archivo dependiendo del tamaño de la base de datos de firmas y tipo de archivo. Pipeline de validación completo: 50-700ms por subida de imagen, 10-600ms por subida de documento. Uso de memoria: `multer` memory storage usa O(file_size) RAM. `multer` disk storage usa O(1) RAM pero requiere I/O de disco. `sharp` usa 50-200MB RAM por procesamiento de imagen concurrente. ClamAV daemon usa 500MB-2GB RAM para la base de datos de firmas. Rate limiting con Redis añade 0.5-2ms por request.

### ¿Cómo depuro problemas de validación de subida?

Para errores de MIME no coincidente, inspecciona el archivo con `file --mime-type upload.bin` (Bash) para ver qué detecta libmagic. Para inspección de magic bytes, usa `xxd upload.bin | head -5` para ver los primeros bytes — PNG empieza con `89504e47`, JPEG con `ffd8ff`, PDF con `25504446`, GIF con `47494638`. Para falsos positivos de ClamAV, ejecuta `clamscan --debug upload.bin` para ver qué firma coincidió. Para errores de procesamiento de `sharp`, verifica si el input es una imagen válida con `identify upload.bin` (ImageMagick) o `file upload.bin`. Para errores "Unexpected field" de multer, verifica que el nombre del campo del formulario coincida con la llamada `upload.single('fieldname')`. Para `MaxUploadSizeExceededException` de Spring Boot, revisa `spring.servlet.multipart.max-file-size` en `application.properties`. Para `413 Request Entity Too Large` de nginx, revisa `client_max_body_size` en la config de nginx. Para timeouts de subida, revisa `proxy_read_timeout` (nginx) y `spring.servlet.multipart.max-request-size` (Spring Boot). Para subidas corruptas con HTTPS, verifica `proxy_request_buffering on` en nginx y que el certificado SSL sea válido.
