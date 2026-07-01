---
contentType: recipes
slug: python-image-resize-batch
title: "Redimensionar Imágenes en Lote con Python"
description: "Cómo redimensionar y optimizar imágenes en lote usando Pillow y Python para entrega web."
metaDescription: "Redimensiona imágenes en lote con Python y Pillow. Aprende procesamiento masivo, conversión de formato y optimización para web con ejemplos."
difficulty: beginner
topics:
  - file-handling
tags:
  - images
  - python
  - pillow
  - batch-processing
  - resize
  - optimization
relatedResources:
  - /recipes/compress-decompress-files
  - /recipes/copy-move-files
  - /recipes/generate-temporary-files
  - /recipes/image-optimization
  - /recipes/read-large-files
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Redimensiona imágenes en lote con Python y Pillow. Aprende procesamiento masivo, conversión de formato y optimización para web con ejemplos."
  keywords:
    - redimensionar imágenes python
    - pillow resize batch
    - optimizar imágenes webp
    - python pillow thumbnail
    - batch image processing
---
## Visión General

Redimensionar imágenes en lote es una tarea común para optimización web, generación de thumbnails y pipelines de contenido. Python con Pillow (fork de PIL) hace esto sencillo. Esta recipe cubre redimensionado batch, conversión de formato, optimización de calidad y generación de thumbnails.

## Cuándo Usar

- Necesitas generar thumbnails para una galería o catálogo de productos
- Estás optimizando imágenes para entrega web (reducir tamaño de archivo)
- Necesitas convertir imágenes entre formatos (PNG a WebP, JPEG a PNG)
- Estás procesando uploads de usuarios a un tamaño consistente

## Solución

### Redimensionado básico

```python
from PIL import Image

img = Image.open("photo.jpg")
resized = img.resize((800, 600))
resized.save("photo_small.jpg")
```

### Redimensionar todas las imágenes de un directorio

```python
from PIL import Image
from pathlib import Path

input_dir = Path("images")
output_dir = Path("images_resized")
output_dir.mkdir(exist_ok=True)

target_size = (800, 600)

for img_path in input_dir.glob("*"):
    if img_path.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
        continue

    img = Image.open(img_path)
    resized = img.resize(target_size, Image.Resampling.LANCZOS)
    resized.save(output_dir / img_path.name)
    print(f"Resized: {img_path.name}")
```

### Redimensionar manteniendo aspect ratio

```python
from PIL import Image

def resize_maintain_ratio(img, max_width, max_height):
    width, height = img.size
    ratio = min(max_width / width, max_height / height)
    new_size = (int(width * ratio), int(height * ratio))
    return img.resize(new_size, Image.Resampling.LANCZOS)

img = Image.open("photo.jpg")
resized = resize_maintain_ratio(img, 800, 600)
resized.save("photo_ratio.jpg")
```

### Generar thumbnails

```python
from PIL import Image
from pathlib import Path

img = Image.open("photo.jpg")
img.thumbnail((200, 200), Image.Resampling.LANCZOS)
img.save("thumb_photo.jpg")
```

### Convertir formato y optimizar para web

```python
from PIL import Image
from pathlib import Path

input_dir = Path("images")
output_dir = Path("images_webp")
output_dir.mkdir(exist_ok=True)

for img_path in input_dir.glob("*.png"):
    img = Image.open(img_path)
    img = img.convert("RGB")  # WebP necesita RGB
    output_path = output_dir / (img_path.stem + ".webp")
    img.save(output_path, "webp", quality=85, method=6)
    print(f"Converted: {img_path.name} -> {output_path.name}")
```

### Procesamiento batch con seguimiento de progreso

```python
from PIL import Image
from pathlib import Path
import time

input_dir = Path("photos")
output_dir = Path("photos_optimized")
output_dir.mkdir(exist_ok=True)

files = list(input_dir.glob("*.[jp][pn]g"))
total = len(files)

for i, img_path in enumerate(files, 1):
    img = Image.open(img_path)
    img.thumbnail((1200, 1200), Image.Resampling.LANCZOS)

    output_path = output_dir / (img_path.stem + ".jpg")
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    img.save(output_path, "JPEG", quality=85, optimize=True)

    print(f"[{i}/{total}] {img_path.name} -> {output_path.name}")
```

## Explicación

Pillow proporciona dos métodos de redimensionado: `resize()` cambia las dimensiones a valores exactos (puede distorsionar), y `thumbnail()` redimensiona para caber dentro de una caja preservando aspect ratio (modificación in-place).

`Image.Resampling.LANCZOS` da la mejor calidad para downscaling. Para upscaling, `BICUBIC` suele ser mejor. El default `NEAREST` es rápido pero produce resultados pixelados.

Para optimización web, convierte a formato WebP con `quality=85`. WebP produce archivos 25-35% más pequeños que JPEG a calidad equivalente. Usa `method=6` para máxima compresión (más lento pero archivos más pequeños).

## Variantes

| Enfoque | Método | Aspect Ratio | Usar Cuando |
|---------|--------|--------------|-------------|
| resize() | Tamaño exacto | Distorsionado | Dimensiones fijas requeridas |
| thumbnail() | Caber en caja | Preservado | Thumbnails de galería |
| Función ratio custom | Max ancho/alto | Preservado | Layouts flexibles |
| Conversión WebP | Cambio de formato | Preservado | Optimización web |

## Pautas

- Usa `LANCZOS` para downscaling de fotos. Produce los resultados más nítidos.
- Convierte imágenes RGBA/P a RGB antes de guardar como JPEG. JPEG no soporta transparencia.
- Usa `quality=85` para JPEG. Bajo 80, los artefactos son visibles; sobre 90, el tamaño crece con ganancia mínima.
- Usa WebP para entrega web. Es soportado por todos los navegadores modernos y produce archivos más pequeños.
- Procesa imágenes en un directorio de output separado. Nunca sobrescribas los originales.

## Errores Comunes

- Usar `resize()` cuando quieres preservar aspect ratio. Usa `thumbnail()` o una función de ratio custom.
- Olvidar convertir RGBA a RGB antes de guardar como JPEG. Esto lanza error o produce colores incorrectos.
- Usar `NEAREST` resampling para fotos. Se ve pixelado. Siempre usa `LANCZOS` o `BICUBIC`.
- No activar `optimize=True` para JPEG. Reduce el tamaño sin pérdida de calidad.
- Sobrescribir archivos originales. Siempre escribe a un directorio separado para evitar pérdida de datos.

## Preguntas Frecuentes

### ¿Cómo redimensiono imágenes sin Pillow?

Puedes usar `opencv-python` (`cv2.resize()`) o `imageio` con `skimage.transform.resize`. Pillow es la opción más común porque es ligero y está bien documentado.

### ¿Cómo proceso imágenes en lote en paralelo?

Usa `concurrent.futures.ProcessPoolExecutor` para procesar imágenes entre núcleos de CPU:

```python
from concurrent.futures import ProcessPoolExecutor

def process_one(img_path):
    img = Image.open(img_path)
    img.thumbnail((800, 800), Image.Resampling.LANCZOS)
    img.save(f"out/{img_path.name}")

with ProcessPoolExecutor() as pool:
    pool.map(process_one, list(Path("images").glob("*.jpg")))
```

### ¿Cómo elimino datos EXIF por privacidad?

Pasa `exif=b""` al guardar, o usa `img.info.pop("exif", None)` antes de guardar. Esto remueve coordenadas GPS y metadatos de cámara.

### ¿Cuál es la diferencia entre quality y method en WebP?

`quality` controla la fidelidad visual (0-100). `method` controla el esfuerzo de compresión (0-6). `method` más alto significa encoding más lento pero archivos más pequeños. Usa `quality=85, method=6` para mejores resultados.
