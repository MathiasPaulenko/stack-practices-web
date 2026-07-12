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

## Soluciones Avanzadas

### Pipeline con multiprocessing para lotes grandes

```python
from PIL import Image, ImageOps
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, as_completed
import time
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")
logger = logging.getLogger(__name__)


def process_image(
    img_path: str,
    output_dir: str,
    max_size: tuple[int, int] = (1200, 1200),
    quality: int = 85,
    strip_exif: bool = True,
) -> dict:
    """Procesa una imagen: redimensiona, elimina EXIF, convierte a JPEG/WebP."""
    try:
        img_path = Path(img_path)
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        img = Image.open(img_path)
        img = ImageOps.exif_transpose(img)  # Auto-orientar desde EXIF

        if strip_exif:
            img.info.pop("exif", None)

        if img.mode in ("RGBA", "P", "LA"):
            img = img.convert("RGB")

        img.thumbnail(max_size, Image.Resampling.LANCZOS)

        out_path = output_dir / (img_path.stem + ".webp")
        img.save(out_path, "webp", quality=quality, method=6)

        return {
            "input": str(img_path),
            "output": str(out_path),
            "size": out_path.stat().st_size,
            "status": "ok",
        }
    except Exception as e:
        return {"input": str(img_path), "status": "error", "error": str(e)}


def batch_process(
    input_dir: str,
    output_dir: str,
    max_size: tuple[int, int] = (1200, 1200),
    quality: int = 85,
    workers: int = 4,
) -> list[dict]:
    """Procesa imágenes en lote en paralelo."""
    input_dir = Path(input_dir)
    extensions = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}
    files = [f for f in input_dir.rglob("*") if f.suffix.lower() in extensions]

    if not files:
        logger.warning("No se encontraron imágenes en %s", input_dir)
        return []

    logger.info("Procesando %d imágenes con %d workers", len(files), workers)
    results = []
    start = time.time()

    with ProcessPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(process_image, str(f), output_dir, max_size, quality): f
            for f in files
        }

        for i, future in enumerate(as_completed(futures), 1):
            result = future.result()
            results.append(result)
            if result["status"] == "ok":
                logger.info(
                    "[%d/%d] OK: %s (%d KB)",
                    i, len(files), result["output"], result["size"] // 1024,
                )
            else:
                logger.error("[%d/%d] FAIL: %s - %s", i, len(files), result["input"], result.get("error"))

    elapsed = time.time() - start
    ok = sum(1 for r in results if r["status"] == "ok")
    logger.info("Listo: %d/%d exitosos en %.1fs", ok, len(results), elapsed)
    return results


if __name__ == "__main__":
    batch_process("images", "images_optimized", max_size=(1200, 1200), quality=85, workers=4)
```

### Generación de imágenes responsive (múltiples tamaños)

```python
from PIL import Image, ImageOps
from pathlib import Path
import json


def generate_responsive_images(
    input_path: str,
    output_dir: str,
    sizes: list[int] = None,
    quality: int = 82,
    formats: list[str] = None,
) -> dict:
    """Genera imágenes responsive en múltiples breakpoints."""
    if sizes is None:
        sizes = [320, 640, 1024, 1920]
    if formats is None:
        formats = ["webp", "jpg"]

    input_path = Path(input_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    img = Image.open(input_path)
    img = ImageOps.exif_transpose(img)

    if img.mode in ("RGBA", "P", "LA"):
        img = img.convert("RGB")

    original_width = img.width
    manifest = {
        "original": input_path.name,
        "original_width": original_width,
        "variants": [],
    }

    for target_width in sizes:
        if target_width > original_width:
            continue  # No escalar hacia arriba

        ratio = target_width / original_width
        new_height = int(img.height * ratio)
        resized = img.resize((target_width, new_height), Image.Resampling.LANCZOS)

        for fmt in formats:
            suffix = f"_{target_width}w"
            out_name = f"{input_path.stem}{suffix}.{fmt}"
            out_path = output_dir / out_name

            if fmt == "webp":
                resized.save(out_path, "webp", quality=quality, method=6)
            elif fmt == "jpg":
                resized.save(out_path, "JPEG", quality=quality, optimize=True)

            manifest["variants"].append({
                "width": target_width,
                "height": new_height,
                "format": fmt,
                "file": out_name,
                "size_bytes": out_path.stat().st_size,
            })

    manifest_path = output_dir / f"{input_path.stem}_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2))

    return manifest


if __name__ == "__main__":
    result = generate_responsive_images(
        "photo.jpg",
        "responsive_output",
        sizes=[320, 640, 1024, 1920],
        quality=82,
        formats=["webp", "jpg"],
    )
    print(json.dumps(result, indent=2))
```

### Marca de agua para procesamiento en lote

```python
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path


def add_watermark(
    input_path: str,
    output_path: str,
    text: str = "© StackPractices",
    opacity: int = 128,
    position: str = "bottom-right",
    padding: int = 20,
) -> None:
    """Añade una marca de agua de texto a una imagen."""
    img = Image.open(input_path).convert("RGBA")
    overlay = Image.new("RGBA", img.size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(overlay)

    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 36)
    except (IOError, OSError):
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    if position == "bottom-right":
        x = img.width - text_width - padding
        y = img.height - text_height - padding
    elif position == "bottom-left":
        x = padding
        y = img.height - text_height - padding
    elif position == "top-right":
        x = img.width - text_width - padding
        y = padding
    else:
        x = padding
        y = padding

    draw.text((x, y), text, fill=(255, 255, 255, opacity), font=font)
    watermarked = Image.alpha_composite(img, overlay)

    output_path = Path(output_path)
    if output_path.suffix.lower() in (".jpg", ".jpeg"):
        watermarked = watermarked.convert("RGB")

    watermarked.save(output_path)
    print(f"Marca de agua: {input_path} -> {output_path}")


def batch_watermark(input_dir: str, output_dir: str, text: str) -> None:
    """Aplica marca de agua a todas las imágenes de un directorio."""
    input_dir = Path(input_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(exist_ok=True)

    for img_path in input_dir.glob("*"):
        if img_path.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
            continue
        add_watermark(str(img_path), str(output_dir / img_path.name), text)


if __name__ == "__main__":
    batch_watermark("images", "images_watermarked", "© 2026 StackPractices")
```

### Herramienta CLI con argparse

```python
import argparse
from pathlib import Path
from PIL import Image, ImageOps


def main():
    parser = argparse.ArgumentParser(description="Redimensionar imágenes en lote")
    parser.add_argument("input", help="Directorio o archivo de entrada")
    parser.add_argument("-o", "--output", default="output", help="Directorio de salida")
    parser.add_argument("-w", "--width", type=int, default=1200, help="Ancho máximo")
    parser.add_argument("-H", "--height", type=int, default=1200, help="Alto máximo")
    parser.add_argument("-q", "--quality", type=int, default=85, help="Calidad JPEG/WebP (1-100)")
    parser.add_argument("-f", "--format", choices=["jpg", "webp", "png"], default="webp")
    parser.add_argument("--strip-exif", action="store_true", help="Eliminar metadatos EXIF")
    parser.add_argument("--workers", type=int, default=4, help="Workers paralelos")
    args = parser.parse_args()

    output_dir = Path(args.output)
    output_dir.mkdir(exist_ok=True)

    input_path = Path(args.input)
    if input_path.is_file():
        files = [input_path]
    else:
        exts = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}
        files = [f for f in input_path.rglob("*") if f.suffix.lower() in exts]

    print(f"Procesando {len(files)} imágenes -> {args.format} ({args.width}x{args.height})")

    for i, f in enumerate(files, 1):
        try:
            img = Image.open(f)
            img = ImageOps.exif_transpose(img)

            if args.strip_exif:
                img.info.pop("exif", None)

            if img.mode in ("RGBA", "P", "LA"):
                img = img.convert("RGB")

            img.thumbnail((args.width, args.height), Image.Resampling.LANCZOS)

            out_path = output_dir / f"{f.stem}.{args.format}"
            if args.format == "webp":
                img.save(out_path, "webp", quality=args.quality, method=6)
            elif args.format == "jpg":
                img.save(out_path, "JPEG", quality=args.quality, optimize=True)
            else:
                img.save(out_path, "PNG")

            print(f"[{i}/{len(files)}] {f.name} -> {out_path.name}")
        except Exception as e:
            print(f"[{i}/{len(files)}] ERROR: {f.name} - {e}")


if __name__ == "__main__":
    main()
```

## Mejores Prácticas Adicionales


- For a deeper guide, see [Compress and Decompress Files](/es/recipes/compress-decompress-files/).

1. **Usa `ImageOps.exif_transpose()` antes de redimensionar.** Las fotos de teléfonos suelen tener tags de orientación EXIF. Sin auto-orientación, la imagen redimensionada puede aparecer rotada:

```python
from PIL import Image, ImageOps

img = Image.open("phone_photo.jpg")
img = ImageOps.exif_transpose(img)  # Aplicar orientación EXIF
img.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
img.save("photo_correct.jpg", "JPEG", quality=85)
```

2. **Usa `Image.MAX_IMAGE_PIXELS` para prevenir bombas de descompresión.** Pillow tiene un límite integrado para evitar que imágenes maliciosas agoten la memoria. Ajústalo si procesas imágenes grandes legítimas:

```python
from PIL import Image

# El límite por defecto es ~89 millones de píxeles. Súbelo para panoramas/tiled.
Image.MAX_IMAGE_PIXELS = 200_000_000  # 200 megapíxeles
```

3. **Guarda JPEGs progresivos para carga web más rápida.** Los JPEGs progresivos cargan en pasadas de grueso a fino, dando al usuario una vista previa antes de que la imagen completa cargue:

```python
from PIL import Image

img = Image.open("photo.jpg")
img.save("photo_progressive.jpg", "JPEG", quality=85, optimize=True, progressive=True)
```

## Errores Comunes Adicionales

1. **No manejar el modo de color CMYK.** Algunos JPEGs de flujos de impresión usan modo CMYK. Guardar como WebP o JPEG RGB sin conversión produce colores incorrectos:

```python
from PIL import Image

img = Image.open("print_photo.jpg")
if img.mode == "CMYK":
    img = img.convert("RGB")  # Convertir CMYK a RGB para web
img.save("web_photo.jpg", "JPEG", quality=85)
```

2. **Usar `resize()` con expectativas de `thumbnail()`.** `thumbnail()` modifica la imagen in-place y nunca escala hacia arriba. `resize()` crea una imagen nueva y puede distorsionar. Conoce la diferencia:

```python
from PIL import Image

img = Image.open("photo.jpg")
# thumbnail() preserva aspect ratio, modifica in-place, sin upscaling
img.thumbnail((800, 800))
# img ahora es <= 800x800 con aspect ratio original

img2 = Image.open("photo.jpg")
# resize() crea imagen nueva, puede distorsionar, puede escalar
resized = img2.resize((800, 800))  # Exactamente 800x800, puede distorsionar
```

3. **Ignorar perfiles de color ICC.** Las imágenes con perfiles ICC embebidos pueden verse diferentes después del procesamiento. Preserva o convierte el perfil:

```python
from PIL import Image, ImageCms

img = Image.open("photo_with_icc.jpg")
icc = img.info.get("icc_profile")

# Convertir a sRGB para visualización web consistente
if icc:
    img = ImageCms.profileToProfile(
        img,
        ImageCms.ImageCmsProfile(ImageCms.getOpenProfileFromString(icc)),
        ImageCms.ImageCmsProfile("sRGB"),
        outputMode="RGB",
    )

img.save("photo_srgb.jpg", "JPEG", quality=85)
```

## Preguntas Frecuentes Adicionales

### ¿Cómo genero un sprite sheet desde múltiples imágenes?

Usa Pillow para pegar imágenes en una cuadrícula:

```python
from PIL import Image
from pathlib import Path

images = sorted(Path("icons").glob("*.png"), key=lambda x: x.name)
if not images:
    raise ValueError("No se encontraron imágenes PNG")

first = Image.open(images[0])
tile_w, tile_h = first.size
cols = 10
rows = (len(images) + cols - 1) // cols

sheet = Image.new("RGBA", (cols * tile_w, rows * tile_h), (0, 0, 0, 0))

for i, img_path in enumerate(images):
    img = Image.open(img_path)
    x = (i % cols) * tile_w
    y = (i // cols) * tile_h
    sheet.paste(img, (x, y))

sheet.save("sprite_sheet.png")
print(f"Sprite sheet: {sheet.size} ({len(images)} iconos)")
```

### ¿Cómo comparo la calidad de imagen antes y después de redimensionar?

Usa SSIM (Índice de Similitud Estructural) de `scikit-image`:

```python
from PIL import Image
from skimage.metrics import structural_similarity as ssim
import numpy as np

original = np.array(Image.open("photo.jpg").convert("L"))
resized = np.array(Image.open("photo_small.jpg").convert("L"))

# Redimensionar original para coincidir en la comparación
if original.shape != resized.shape:
    from PIL import Image as PILImage
    original = np.array(
        PILImage.open("photo.jpg").convert("L").resize(resized.shape[::-1])
    )

score = ssim(original, resized)
print(f"SSIM score: {score:.4f} (1.0 = idéntico, 0.0 = completamente diferente)")
```

### ¿Cómo proceso imágenes desde un archivo ZIP sin extraer?

Usa `zipfile` con `io.BytesIO` para leer imágenes directamente desde archivos:

```python
import zipfile
import io
from PIL import Image
from pathlib import Path

output_dir = Path("extracted_images")
output_dir.mkdir(exist_ok=True)

with zipfile.ZipFile("images.zip", "r") as zf:
    for name in zf.namelist():
        if not name.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
            continue

        with zf.open(name) as f:
            img_data = f.read()

        img = Image.open(io.BytesIO(img_data))
        img.thumbnail((800, 800), Image.Resampling.LANCZOS)

        out_name = Path(name).stem + ".webp"
        img.save(output_dir / out_name, "webp", quality=85)
        print(f"Procesado: {name} -> {out_name}")
```
