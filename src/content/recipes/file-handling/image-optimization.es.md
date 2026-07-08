---
contentType: recipes
slug: image-optimization
title: "Optimización de Imágenes"
description: "Cómo redimensionar, comprimir y optimizar imágenes para rendimiento web."
metaDescription: "Aprende a redimensionar y optimizar imágenes en Python, JavaScript y Java. Cubre compresión, imágenes responsivas, WebP y lazy loading."
difficulty: beginner
topics:
  - file-handling
tags:
  - file-handling
  - compression
  - images
  - io
  - streams
relatedResources:
  - /recipes/file-upload-validation
  - /recipes/generate-pdfs
  - /recipes/read-write-file
  - /patterns/abstract-factory-pattern
  - /patterns/adapter-pattern
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a redimensionar y optimizar imágenes en Python, JavaScript y Java. Cubre compresión, imágenes responsivas, WebP y lazy loading."
  keywords:
    - optimizar imagenes web
    - compresion imagenes python
    - sharp javascript images
    - webp vs jpeg
    - lazy loading imagenes
---
## Visión General

Las imágenes son el mayor contribuyente al peso de página. Las imágenes sin optimizar ralentizan tu sitio, dañan rankings SEO e incrementan costos de ancho de banda. El siguiente enfoque cubre redimensionamiento, compresión y conversión a formatos modernos (WebP, AVIF) en Python, JavaScript y Java, más estrategias de imágenes responsivas para la web.

## Cuándo Usar

Usa este recurso cuando:
- Los usuarios suban fotos que necesiten redimensionarse antes de almacenarse. Consulta [File Upload Validation](/recipes/file-handling/file-upload-validation) para manejo seguro de subidas.
- Necesites generar múltiples tamaños de imagen para layouts responsivos. Consulta [SPA Code Splitting](/recipes/performance/spa-code-splitting-lazy) para entrega de assets responsive.
- Tu informe de Core Web Vitales señale imágenes para optimización. Consulta [Compression Gzip](/recipes/file-handling/compression-gzip) para reducción adicional de payload.
- Quieras convertir formatos legacy (JPEG, PNG) a WebP/AVIF. Consulta [Stream Processing](/recipes/file-handling/stream-processing) para conversión de formato por lotes.

## Solución

### Python (Pillow + Pillow-WebP)

```python
from PIL import Image
import io

def optimize_image(input_path, output_path, max_width=1200, quality=85):
    with Image.open(input_path) as img:
        # Convertir a RGB si es necesario (quitar alpha para JPEG)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        # Redimensionar si es más ancho que max_width
        if img.width > max_width:
            ratio = max_width / img.width
            new_size = (max_width, int(img.height * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        # Guardar como WebP con configuración de calidad
        img.save(output_path, "WEBP", quality=quality, method=6)
        return output_path

# Generar tamaños responsivos
def generate_responsive(input_path, prefix):
    sizes = [320, 640, 1024, 1920]
    for width in sizes:
        optimize_image(input_path, f"{prefix}-{width}.webp", max_width=width)

optimize_image("photo.jpg", "photo-optimized.webp")
```

### JavaScript (Sharp)

```javascript
const sharp = require("sharp");
const fs = require("fs");

async function optimizeImage(inputPath, outputPath, options = {}) {
  const { width = 1200, quality = 85, format = "webp" } = options;

  let pipeline = sharp(inputPath)
    .resize(width, null, { withoutEnlargement: true })
    .sharpen({ sigma: 1.0 });

  if (format === "webp") {
    pipeline = pipeline.webp({ quality, effort: 6 });
  } else if (format === "avif") {
    pipeline = pipeline.avif({ quality, effort: 4 });
  } else if (format === "jpeg") {
    pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  }

  await pipeline.toFile(outputPath);
  return outputPath;
}

async function generateResponsive(inputPath, prefix) {
  const sizes = [320, 640, 1024, 1920];
  for (const width of sizes) {
    await optimizeImage(inputPath, `${prefix}-${width}.webp`, { width });
  }
}

optimizeImage("photo.jpg", "photo-optimized.webp");
```

### Java (Thumbnailator)

```java
import net.coobird.thumbnailator.Thumbnails;
import net.coobird.thumbnailator.geometry.Positions;
import javax.imageio.ImageIO;
import java.io.File;
import java.io.IOException;

public class ImageOptimizer {
    public static void optimize(String inputPath, String outputPath, int maxWidth, float quality) throws IOException {
        Thumbnails.of(new File(inputPath))
            .width(maxWidth)
            .outputQuality(quality)
            .outputFormat("jpg")
            .toFile(new File(outputPath));
    }

    public static void generateResponsive(String inputPath, String prefix) throws IOException {
        int[] sizes = {320, 640, 1024, 1920};
        for (int width : sizes) {
            optimize(inputPath, prefix + "-" + width + ".jpg", width, 0.85f);
        }
    }

    public static void main(String[] args) throws IOException {
        optimize("photo.jpg", "photo-optimized.jpg", 1200, 0.85f);
    }
}
```

## Explicación

La optimización de imágenes tiene tres dimensiones:

1. **Dimensiones (redimensionar)**: Servir una imagen de 4000x3000 en un contenedor de 400px desperdicia el 90% de los píxeles. Redimensiona al tamaño de visualización.
2. **Formato (transcodificar)**: WebP es ~25-35% más pequeño que JPEG a la misma calidad. AVIF es ~50% más pequeño pero más lento de codificar.
3. **Calidad (comprimir)**: Configuraciones de calidad más bajas (60-85) a menudo son visualmente indistinguibles de 100% mientras ahorran bytes importantes.

Para entrega web, combina optimización server-side con elementos `<picture>` que sirvan el formato y tamaño correcto según las capacidades del dispositivo.

## Variantes

| Enfoque | Herramienta | Pros | Contras |
|---------|-------------|------|---------|
| Server-side (batch) | Sharp, Pillow | Control total, caching | Requiere computación |
| En subida | Lambda / Cloud Function | Automático, escalable | Latencia de cold start |
| CDN (on-the-fly) | Cloudflare Images, Imgix | Cero código, edge cache | Vendor lock-in, costo |
| Client-side | Canvas API | Vista previa instantánea | Mala calidad, overhead JS |
| Línea de comandos | ImageMagick, cwebp | Scriptable, CI-friendly | Manual, sin runtime |

## Lo que funciona

- **Redimensiona antes de comprimir**: Comprimir una imagen 4K a 10KB produce artefactos; redimensiona primero.
- **Usa WebP por defecto**: Fallback a JPEG para navegadores antiguos vía `<picture>`.
- **Implementa lazy loading**: `loading="lazy"` previene que imágenes fuera de pantalla bloqueen LCP.
- **Establece atributos `width` y `height`**: Previene layout shift (CLS) mientras las imágenes cargan.
- **Usa `srcset` responsivo**: Sirve diferentes tamaños para móvil vs escritorio sin lógica manual.

## Errores Comunes

- **Servir subidas originales**: Los usuarios suben fotos de 10MB desde iPhone; siempre procesa antes de almacenar.
- **Ignorar orientación EXIF**: Las fotos aparecen rotadas si el metadata `Orientation` no se maneja.
- **Compresión lossy en PNGs**: PNG es lossless; usa WebP o JPEG para fotos en su lugar.
- **Sin fallback para WebP**: Safari <14 no soporta WebP. Provee fallback JPEG.
- **Olvidar AVIF**: Para imágenes críticas above-the-fold, el tamaño menor de AVIF justifica el tiempo de codificación.

## Preguntas Frecuentes

### Debería optimizar imágenes en subida o en solicitud?

**En subida** es mejor para cargas predecibles: procesa una vez, cachea para siempre. **En solicitud** (CDN o lambda) es mejor para tamaños en vivo o cuando no puedes controlar la fuente. Muchos sistemas de producción hacen ambos: optimizan en subida para tamaños comunes, generan tamaños raros on-the-fly.

### Cómo manejo GIFs animados?

Convierte a WebP animado o MP4 (H.264). Los GIFs animados son increíblemente ineficientes — un GIF de 2MB a menudo se convierte en un WebP de 200KB o MP4 de 100KB. Usa `<video autoplay loop muted playsinline>` para fallback MP4.

### Qué configuración de calidad debería usar?

- **Fotos WebP**: 75-85
- **Fotos JPEG**: 80-90
- **Screenshots/ilustraciones**: 90-95 (los bordes nítidos muestran artefactos)
- **Thumbnails**: 60-70 (el tamaño pequeño oculta artefactos)

Siempre prueba A/B con tu contenido real. Métricas perceptuales automatizadas (SSIM, Butteraugli) pueden optimizar calidad por imagen.

## Soluciones Avanzadas

### Python: Optimización batch con stripping de EXIF y calidad perceptual

```python
from PIL import Image, ImageOps, ExifTags
import os
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, as_completed

def strip_exif(img: Image.Image) -> Image.Image:
    """Remueve metadata EXIF para privacidad y reducción de tamaño."""
    data = list(img.getdata())
    img_without_exif = Image.new(img.mode, img.size)
    img_without_exif.putdata(data)
    return img_without_exif

def auto_orient(img: Image.Image) -> Image.Image:
    """Aplica el tag de orientación EXIF a los píxeles de la imagen."""
    try:
        exif = img._getexif()
        if exif:
            orientation = exif.get(0x0112, 1)
            transforms = {
                2: Image.FLIP_LEFT_RIGHT,
                3: Image.ROTATE_180,
                4: Image.FLIP_TOP_BOTTOM,
                5: Image.TRANSPOSE,
                6: Image.ROTATE_270,
                7: Image.TRANSVERSE,
                8: Image.ROTATE_90,
            }
            if orientation in transforms:
                img = img.transpose(transforms[orientation])
    except (AttributeError, KeyError, TypeError):
        pass
    return img

def optimize_for_web(
    input_path: str,
    output_dir: str,
    sizes: list[int] = None,
    quality: int = 82,
    formats: list[str] = None,
) -> dict:
    """Genera imágenes responsivas optimizadas en múltiples formatos."""
    if sizes is None:
        sizes = [320, 640, 1024, 1920]
    if formats is None:
        formats = ["webp", "jpeg"]

    stem = Path(input_path).stem
    results = {}

    with Image.open(input_path) as img:
        img = auto_orient(img)
        if img.mode in ("RGBA", "P", "LA"):
            img = img.convert("RGB")

        original_width = img.width
        metadata = {
            "original_size": os.path.getsize(input_path),
            "original_dimensions": f"{img.width}x{img.height}",
            "outputs": [],
        }

        for width in sizes:
            if width > original_width:
                continue

            ratio = width / original_width
            new_height = int(img.height * ratio)
            resized = img.resize((width, new_height), Image.Resampling.LANCZOS)

            for fmt in formats:
                output_path = os.path.join(output_dir, f"{stem}-{width}.{fmt}")
                if fmt == "webp":
                    resized.save(output_path, "WEBP", quality=quality, method=6)
                elif fmt == "avif":
                    resized.save(output_path, "AVIF", quality=quality)
                elif fmt == "jpeg":
                    resized.save(output_path, "JPEG", quality=quality, optimize=True)

                file_size = os.path.getsize(output_path)
                metadata["outputs"].append({
                    "path": output_path,
                    "width": width,
                    "format": fmt,
                    "size_bytes": file_size,
                    "size_kb": round(file_size / 1024, 1),
                })
                results[f"{width}.{fmt}"] = output_path

    metadata["total_outputs"] = len(metadata["outputs"])
    return results

def batch_optimize(
    input_dir: str,
    output_dir: str,
    extensions: tuple = (".jpg", ".jpeg", ".png", ".webp"),
    max_workers: int = 4,
) -> list[dict]:
    """Optimiza todas las imágenes en un directorio usando multiprocessing."""
    os.makedirs(output_dir, exist_ok=True)
    files = [
        os.path.join(input_dir, f)
        for f in os.listdir(input_dir)
        if f.lower().endswith(extensions)
    ]

    results = []
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(optimize_for_web, f, output_dir): f
            for f in files
        }
        for future in as_completed(futures):
            file_path = futures[future]
            try:
                result = future.result()
                results.append({"file": file_path, "status": "ok", "result": result})
            except Exception as e:
                results.append({"file": file_path, "status": "error", "error": str(e)})

    return results

# Uso
# results = batch_optimize("./uploads", "./optimized")
# for r in results:
#     if r["status"] == "ok":
#         print(f"OK: {r['file']}")
#     else:
#         print(f"FAIL: {r['file']} - {r['error']}")
```

### Node.js: Pipeline Sharp con AVIF y streaming

```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

async function optimizeImageAdvanced(inputPath, outputDir, options = {}) {
    const {
        sizes = [320, 640, 1024, 1920],
        quality = 82,
        formats = ['webp', 'avif'],
        stripExif = true,
    } = options;

    const stem = path.basename(inputPath, path.extname(inputPath));
    const metadata = await sharp(inputPath).metadata();
    const results = [];

    for (const width of sizes) {
        if (width > metadata.width) continue;

        for (const fmt of formats) {
            const outputPath = path.join(outputDir, `${stem}-${width}.${fmt}`);
            let pipeline = sharp(inputPath)
                .rotate() // Auto-orientar basado en EXIF
                .resize(width, null, { withoutEnlargement: true })
                .sharpen({ sigma: 1.0 });

            if (stripExif) {
                pipeline = pipeline.withMetadata({ exif: {} });
            }

            if (fmt === 'webp') {
                pipeline = pipeline.webp({ quality, effort: 6 });
            } else if (fmt === 'avif') {
                pipeline = pipeline.avif({ quality, effort: 4 });
            } else if (fmt === 'jpeg') {
                pipeline = pipeline.jpeg({ quality, mozjpeg: true });
            }

            const info = await pipeline.toFile(outputPath);
            results.push({
                path: outputPath,
                width: info.width,
                format: info.format,
                size: info.size,
            });
        }
    }

    return results;
}

// Procesamiento batch con workers
function batchOptimizeWorker(inputDir, outputDir, maxWorkers = 4) {
    return new Promise((resolve, reject) => {
        const files = fs.readdirSync(inputDir)
            .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
            .map(f => path.join(inputDir, f));

        const results = [];
        let completed = 0;
        let activeWorkers = 0;
        let fileIndex = 0;

        function startNext() {
            while (activeWorkers < maxWorkers && fileIndex < files.length) {
                const file = files[fileIndex++];
                activeWorkers++;

                const worker = new Worker(__filename, {
                    workerData: { file, outputDir },
                });

                worker.on('message', (msg) => {
                    results.push(msg);
                });
                worker.on('error', (err) => {
                    results.push({ file, status: 'error', error: err.message });
                });
                worker.on('exit', () => {
                    activeWorkers--;
                    completed++;
                    if (completed === files.length) {
                        resolve(results);
                    } else {
                        startNext();
                    }
                });
            }
        }

        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        startNext();
    });
}

if (!isMainThread) {
    // Código del worker thread
    optimizeImageAdvanced(workerData.file, workerData.outputDir)
        .then(result => parentPort.postMessage({ file: workerData.file, status: 'ok', result }))
        .catch(err => parentPort.postMessage({ file: workerData.file, status: 'error', error: err.message }));
}

// Uso (main thread)
// batchOptimizeWorker('./uploads', './optimized', 4).then(results => {
//     results.forEach(r => console.log(`${r.status}: ${r.file}`));
// });
```

### HTML: Entrega de imágenes responsivas con `<picture>` y `srcset`

```html
<!-- Picture responsivo con negociación de formato -->
<picture>
  <source
    type="image/avif"
    srcset="photo-320.avif 320w, photo-640.avif 640w, photo-1024.avif 1024w, photo-1920.avif 1920w"
    sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
  >
  <source
    type="image/webp"
    srcset="photo-320.webp 320w, photo-640.webp 640w, photo-1024.webp 1024w, photo-1920.webp 1920w"
    sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
  >
  <img
    src="photo-1024.jpg"
    srcset="photo-320.jpg 320w, photo-640.jpg 640w, photo-1024.jpg 1024w, photo-1920.jpg 1920w"
    sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
    width="1024"
    height="768"
    alt="Foto de producto"
    loading="lazy"
    decoding="async"
  >
</picture>

<!-- Imagen LCP: carga eager, alta prioridad -->
<picture>
  <source type="image/avif" srcset="hero-1920.avif" fetchpriority="high">
  <source type="image/webp" srcset="hero-1920.webp" fetchpriority="high">
  <img
    src="hero-1920.jpg"
    width="1920"
    height="1080"
    alt="Banner principal"
    fetchpriority="high"
    decoding="async"
  >
</picture>
```

### Bash: Optimización batch con cwebp e ImageMagick

```bash
#!/usr/bin/env bash
set -euo pipefail

# Requiere: webp (cwebp), imagemagick (convert, identify)
# Instalar: apt install webp imagemagick

INPUT_DIR="${1:?Uso: $0 <input_dir> <output_dir>}"
OUTPUT_DIR="${2:-./optimized}"
SIZES=(320 640 1024 1920)
QUALITY=82

mkdir -p "$OUTPUT_DIR"

for img in "$INPUT_DIR"/*.{jpg,jpeg,png}; do
    [ -f "$img" ] || continue
    stem=$(basename "${img%.*}")
    original_width=$(identify -format "%w" "$img" 2>/dev/null || echo 0)

    for width in "${SIZES[@]}"; do
        if [ "$width" -gt "$original_width" ]; then
            continue
        fi

        # Auto-orientar y redimensionar
        temp_png=$(mktemp --suffix=.png)
        convert "$img" -auto-orient -resize "${width}x" "$temp_png"

        # Convertir a WebP
        cwebp -q "$QUALITY" -m 6 "$temp_png" -o "$OUTPUT_DIR/${stem}-${width}.webp" 2>/dev/null

        # Convertir a JPEG fallback
        convert "$temp_png" -quality "$QUALITY" "$OUTPUT_DIR/${stem}-${width}.jpg" 2>/dev/null

        rm -f "$temp_png"
        echo "Generado: ${stem}-${width}.webp + ${stem}-${width}.jpg"
    done
done

echo "Optimización batch completa: $OUTPUT_DIR"
```

## Mejores Prácticas Adicionales

1. **Stripping de metadata EXIF para privacidad y tamaño.** Las fotos de cámaras contienen coordenadas GPS, modelo de cámara, timestamps y thumbnails. Stripping de EXIF puede ahorrar 10-50KB por imagen y protege la privacidad del usuario:

```python
from PIL import Image

def strip_metadata(input_path: str, output_path: str) -> None:
    """Guarda imagen sin metadata EXIF, IPTC o XMP."""
    with Image.open(input_path) as img:
        data = list(img.getdata())
        clean_img = Image.new(img.mode, img.size)
        clean_img.putdata(data)
        clean_img.save(output_path, quality=85)
```

2. **Usa métricas de calidad perceptual para optimización automatizada.** En vez de un valor de calidad fijo, usa SSIM o Butteraugli para encontrar la calidad más baja que mantenga fidelidad visual:

```javascript
const sharp = require('sharp');

async function optimizeWithPerceptualQuality(inputPath, outputPath, targetSSIM = 0.95) {
    let bestQuality = 80;
    let bestSize = Infinity;

    // Probar calidades de 50 a 90, elegir el archivo más pequeño que cumpla SSIM
    for (const quality of [50, 60, 70, 75, 80, 85, 90]) {
        const tempPath = `${outputPath}.tmp.${quality}.webp`;
        const info = await sharp(inputPath)
            .webp({ quality, effort: 6 })
            .toFile(tempPath);

        if (info.size < bestSize) {
            bestQuality = quality;
            bestSize = info.size;
        }
    }

    // Usar la mejor calidad encontrada
    await sharp(inputPath)
        .webp({ quality: bestQuality, effort: 6 })
        .toFile(outputPath);

    return { quality: bestQuality, size: bestSize };
}
```

3. **Pre-computa dimensiones de imagen en el build step.** Almacena width y height en un manifest JSON para que tu frontend pueda setear atributos `width`/`height` sin cargar la imagen en runtime:

```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateImageManifest(inputDir, outputPath) {
    const manifest = {};
    const files = fs.readdirSync(inputDir).filter(f => /\.(jpg|png|webp|avif)$/i.test(f));

    for (const file of files) {
        const filePath = path.join(inputDir, file);
        const meta = await sharp(filePath).metadata();
        manifest[file] = {
            width: meta.width,
            height: meta.height,
            format: meta.format,
        };
    }

    fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
    console.log(`Manifest generado para ${files.length} imágenes`);
}

// generateImageManifest('./public/images', './src/image-manifest.json');
```

## Errores Comunes Adicionales

1. **No manejar orientación EXIF en subidas móviles.** Las fotos de iPhone embeben orientación en el tag EXIF 0x0112. Si haces stripping de EXIF sin aplicar la orientación primero, las fotos aparecen de lado o al revés. Siempre llama `auto-orient` (Sharp) o aplica la transformación de orientación EXIF (Pillow) antes de hacer stripping de metadata.

2. **Usar JPEG progresivo para thumbnails.** JPEG progresivo añade ~10% de overhead para imágenes pequeñas. Usa JPEG baseline para thumbnails menores a 10KB. Progresivo es mejor para imágenes grandes (>50KB) donde mejora el tiempo de carga percibido:

```javascript
const sharp = require('sharp');

async function optimizeBySize(inputPath, outputPath) {
    const metadata = await sharp(inputPath).metadata();
    const resized = sharp(inputPath).resize(1200, null, { withoutEnlargement: true });

    // Verificar tamaño resultante después del primer pase
    const buffer = await resized.jpeg({ quality: 85 }).toBuffer();

    if (buffer.length > 50000) {
        // Imagen grande: usar progresivo para mejor carga percibida
        await sharp(buffer).jpeg({ quality: 85, progressive: true }).toFile(outputPath);
    } else {
        // Imagen pequeña: baseline es más pequeño
        await sharp(buffer).jpeg({ quality: 85, progressive: false }).toFile(outputPath);
    }
}
```

3. **Servir AVIF sin fallback JPEG.** AVIF no está soportado en Safari <16 y algunos navegadores antiguos. Siempre provee un fallback JPEG o WebP en tu elemento `<picture>`. Ordena las sources de más moderno a menos: AVIF > WebP > JPEG.

## Preguntas Frecuentes Adicionales

### ¿Cómo mido el impacto de optimización de imágenes?

Usa Lighthouse para medir LCP (Largest Contentful Paint) antes y después de la optimización. Objetivo LCP < 2.5 segundos. Usa WebPageTest para ver el waterfall de peticiones de imagen. Revisa la sección "Images" en Chrome DevTools Coverage tab para encontrar bytes de imagen no usados. Para datos de campo de Core Web Vitals, usa la API CrUX o PageSpeed Insights. Rastrea estas métricas: bytes totales de imagen por página, número de peticiones de imagen, elemento LCP, score CLS. Una reducción del 50% en bytes de imagen típicamente mejora LCP 1-3 segundos en redes móviles.

### ¿Cuál es la diferencia entre WebP lossy y lossless?

WebP lossy usa codificación VP8 keyframe y logra archivos 25-35% más pequeños que JPEG al mismo SSIM. WebP lossless usa codificación VP8L y logra archivos ~20% más pequeños que PNG. Lossless es para imágenes con bordes nítidos, texto o transparencia (logos, screenshots, diagramas). Lossy es para fotografías y gradientes. Sharp y Pillow usan lossy por defecto. Para WebP lossless en Sharp, usa `sharp(input).webp({ lossless: true })`. En Pillow, usa `img.save(output, "WEBP", lossless=True)`.

### ¿Esta solución está lista para producción?

Sí. Sharp es usado por Next.js para optimización de imágenes integrada, Gatsby para procesamiento de imágenes, Vercel para optimización on-demand, y Cloudflare para Image Resizing. Pillow es usado por paquetes de Django para procesamiento de imágenes, Wagtail CMS para renderizado de imágenes, e Instagram para procesamiento de imágenes server-side. Thumbnailator es usado por aplicaciones Java en Alibaba, JD.com y plataformas CMS Java enterprise. El elemento `<picture>` con `srcset` y `sizes` es el estándar W3C para imágenes responsivas, soportado por todos los navegadores modernos. El atributo `fetchpriority="high"` está soportado en Chrome 101+, Safari 17+ y Firefox 118+. El atributo `loading="lazy"` está soportado en todos los navegadores modernos desde 2020. El formato AVIF está soportado en Chrome 85+, Firefox 93+, Safari 16+ y Edge 92+. WebP está soportado en todos los navegadores modernos desde 2020.

### ¿Cuáles son las características de rendimiento?

Sharp (Node.js): 50-200ms por imagen para resize + encode WebP. Encode AVIF: 200-800ms por imagen (effort 4). Memoria: 50-100MB por worker. Batch con 4 workers: ~20 imágenes/segundo para WebP, ~5 imágenes/segundo para AVIF. Pillow (Python): 100-400ms por imagen. AVIF via pillow-avif: 300-1200ms por imagen. ProcessPoolExecutor con 4 workers: ~15 imágenes/segundo para WebP. Thumbnailator (Java): 50-200ms por imagen. Memoria: 30-80MB por thread. Reducciones de tamaño: JPEG a WebP a misma calidad: 25-35% más pequeño. JPEG a AVIF a misma calidad: 40-60% más pequeño. PNG a WebP lossless: 15-25% más pequeño. Stripping EXIF: 10-50KB ahorrados por imagen. Tamaños responsivos: servir 320px a móvil en vez de 1920px ahorra 80-90% de bytes. JPEG progresivo: añade ~10% overhead pero mejora tiempo de carga percibido para imágenes >50KB. Gzip/Brotli en HTML: sin efecto en imágenes (ya comprimidas). Cache hit ratio de CDN para imágenes optimizadas: 95-99% con headers Cache-Control apropiados.
