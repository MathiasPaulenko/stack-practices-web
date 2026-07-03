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

Las subidas de archivos son uno de los vectores de ataque más comunes en aplicaciones web. Subidas sin validación pueden provocar ejecución remota de código, cross-site scripting y filtraciones de datos. Esta receta muestra cómo validar subidas de archivos verificando límites de tamaño, tipos MIME, magic bytes y estructura del contenido antes de aceptar cualquier archivo de un usuario.

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
