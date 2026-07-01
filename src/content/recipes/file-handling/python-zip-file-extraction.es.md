---
contentType: recipes
slug: python-zip-file-extraction
title: "Extraer Archivos Zip de Forma Segura con Python"
description: "Cómo extraer y validar archivos zip de forma segura usando zipfile y shutil en Python."
metaDescription: "Extrae archivos zip de forma segura en Python con el módulo zipfile. Valida archivos, evita path traversal y maneja extracciones grandes con ejemplos."
difficulty: beginner
topics:
  - file-handling
tags:
  - zip
  - python
  - zipfile
  - extraction
  - security
  - archives
relatedResources:
  - /recipes/compress-decompress-files
  - /recipes/bash-iptables-firewall-rules
  - /recipes/bash-ssh-key-management
  - /recipes/copy-move-files
  - /recipes/generate-temporary-files
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Extrae archivos zip de forma segura en Python con el módulo zipfile. Valida archivos, evita path traversal y maneja extracciones grandes con ejemplos."
  keywords:
    - extraer zip python
    - zipfile python seguridad
    - path traversal zip
    - validar zip python
    - python extractall
---
## Visión General

Extraer archivos zip es una tarea rutinaria, pero hacerla de forma segura requiere validación. Archivos maliciosos pueden contener entradas de path traversal (`../../etc/passwd`) o zip bombs que agotan el disco. El módulo `zipfile` de Python te da las herramientas para extraer de forma segura si verificas las entradas antes de escribir.

## Cuándo Usar

- Necesitas extraer archivos zip subidos por usuarios
- Estás procesando archivos de fuentes no confiables
- Quieres validar el contenido del zip antes de extraer (cantidad de archivos, tamaño total)
- Necesitas extraer archivos específicos sin descomprimir todo

## Solución

### Extracción básica

```python
import zipfile

with zipfile.ZipFile("archive.zip", "r") as zf:
    zf.extractall("output_dir")
```

### Extracción segura con protección path traversal

```python
import zipfile
import os

def safe_extract(zip_path, extract_to):
    with zipfile.ZipFile(zip_path, "r") as zf:
        for member in zf.namelist():
            # Resolver el path destino
            target = os.path.realpath(os.path.join(extract_to, member))

            # Asegurar que el destino está dentro del directorio de extracción
            if not target.startswith(os.path.realpath(extract_to) + os.sep):
                raise ValueError(f"Path traversal detectado: {member}")

        # Solo extraer después de que la validación pase
        zf.extractall(extract_to)

safe_extract("archive.zip", "output_dir")
```

### Validar antes de extraer

```python
import zipfile

def validate_zip(zip_path, max_files=1000, max_total_size_mb=500):
    with zipfile.ZipFile(zip_path, "r") as zf:
        files = zf.namelist()
        if len(files) > max_files:
            raise ValueError(f"Demasiados archivos: {len(files)} (max {max_files})")

        total_size = sum(info.file_size for info in zf.infolist())
        if total_size > max_total_size_mb * 1024 * 1024:
            raise ValueError(f"Archivo demasiado grande: {total_size / 1024 / 1024:.1f}MB")

        # Revisar entradas sospechosas
        for member in files:
            if member.startswith("/") or ".." in member:
                raise ValueError(f"Path inseguro en archivo: {member}")

    return True

if validate_zip("archive.zip"):
    with zipfile.ZipFile("archive.zip", "r") as zf:
        zf.extractall("output_dir")
```

### Extraer solo archivos específicos

```python
import zipfile

with zipfile.ZipFile("archive.zip", "r") as zf:
    # Listar todos los archivos
    for name in zf.namelist():
        print(name)

    # Extraer solo archivos .csv
    csv_files = [f for f in zf.namelist() if f.endswith(".csv")]
    for f in csv_files:
        zf.extract(f, "csv_output/")
```

### Extraer a memoria sin escribir al disco

```python
import zipfile

with zipfile.ZipFile("archive.zip", "r") as zf:
    with zf.open("data.json") as f:
        content = f.read()
        # Procesar contenido directamente sin escribir al disco
        print(content[:200])
```

## Explicación

El módulo `zipfile` lee metadatos del archivo (nombres, tamaños, compresión) sin extraer. Usa esto para validar antes de escribir nada al disco.

Ataques de path traversal funcionan incluyendo entradas como `../../etc/passwd` en el archivo. Si llamas `extractall()` sin validación, Python escribe archivos a esos paths. La función de extracción segura verifica que cada path resuelto stays dentro del directorio destino.

Zip bombs son archivos que se descomprimen a tamaños enormes (e.g., 42KB que se expande a 4.5PB). Revisa `file_size` de cada entrada y súmalos antes de extraer.

## Variantes

| Enfoque | Seguridad | Usar Cuando |
|---------|-----------|-------------|
| extractall() | Ninguna | Solo archivos confiables |
| Extracción segura con path check | Alta | Uploads de usuarios |
| Validar + extraer | Máxima | Fuentes no confiables |
| Extraer a memoria | Alta | Procesamiento sin I/O de disco |

## Pautas

- Nunca llames `extractall()` en archivos no confiables sin validación.
- Revisa el tamaño total descomprimido antes de extraer para evitar zip bombs.
- Resuelve paths con `os.path.realpath()` para detectar traversal basado en symlinks.
- Usa `zf.open()` para leer archivos a memoria cuando no los necesitas en disco.
- Define un límite de cantidad de archivos. Archivos legítimos rara vez contienen 10,000 archivos.

## Errores Comunes

- Llamar `extractall()` directamente en uploads de usuarios. Esta es la vulnerabilidad de extracción zip más común.
- No revisar `file_size` (descomprimido). Un zip de 1MB puede contener entradas que se expanden a GBs.
- Confiar solo en checks de `member.startswith("..")`. Symlinks y paths absolutos pueden bypassar checks simples de strings.
- Olvidar manejar archivos zip protegidos con contraseña. `zf.extractall(pwd=b"secret")` lanza `RuntimeError` con passwords incorrectos.
- No cerrar el contexto de ZipFile. Usa `with` para asegurar que el file handle se libere.

## Preguntas Frecuentes

### ¿Cómo extraigo un zip protegido con contraseña?

Pasa el password como bytes: `zf.extractall("output", pwd=b"mypassword")`. Para zips con encriptación AES, instala `pyzipper` en vez de usar `zipfile` de stdlib.

### ¿Cómo detecto un zip bomb?

Revisa el ratio de compresión. Si el tamaño descomprimido es más de 100x el tamaño comprimido, trátalo como sospechoso. También define un límite hard en el tamaño total descomprimido (e.g., 500MB).

### ¿Puedo extraer archivos .tar.gz con zipfile?

No. Usa el módulo `tarfile` para archivos tar. Tiene una API similar: `tarfile.open("file.tar.gz", "r:gz")`.

### ¿Cómo creo un archivo zip en Python?

```python
import zipfile

with zipfile.ZipFile("output.zip", "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write("file1.txt")
    zf.write("file2.txt")
```
