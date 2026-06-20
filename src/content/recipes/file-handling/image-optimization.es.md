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

Las imágenes son el mayor contribuyente al peso de página. Las imágenes sin optimizar ralentizan tu sitio, dañan rankings SEO e incrementan costos de ancho de banda. Esta receta cubre redimensionamiento, compresión y conversión a formatos modernos (WebP, AVIF) en Python, JavaScript y Java, más estrategias de imágenes responsivas para la web.

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
3. **Calidad (comprimir)**: Configuraciones de calidad más bajas (60-85) a menudo son visualmente indistinguibles de 100% mientras ahorran bytes significativos.

Para entrega web, combina optimización server-side con elementos `<picture>` que sirvan el formato y tamaño correcto según las capacidades del dispositivo.

## Variantes

| Enfoque | Herramienta | Pros | Contras |
|---------|-------------|------|---------|
| Server-side (batch) | Sharp, Pillow | Control total, caching | Requiere computación |
| En subida | Lambda / Cloud Function | Automático, escalable | Latencia de cold start |
| CDN (on-the-fly) | Cloudflare Images, Imgix | Cero código, edge cache | Vendor lock-in, costo |
| Client-side | Canvas API | Vista previa instantánea | Mala calidad, overhead JS |
| Línea de comandos | ImageMagick, cwebp | Scriptable, CI-friendly | Manual, sin runtime |

## Mejores Prácticas

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

**En subida** es mejor para cargas predecibles: procesa una vez, cachea para siempre. **En solicitud** (CDN o lambda) es mejor para tamaños dinámicos o cuando no puedes controlar la fuente. Muchos sistemas de producción hacen ambos: optimizan en subida para tamaños comunes, generan tamaños raros on-the-fly.

### Cómo manejo GIFs animados?

Convierte a WebP animado o MP4 (H.264). Los GIFs animados son increíblemente ineficientes — un GIF de 2MB a menudo se convierte en un WebP de 200KB o MP4 de 100KB. Usa `<video autoplay loop muted playsinline>` para fallback MP4.

### Qué configuración de calidad debería usar?

- **Fotos WebP**: 75-85
- **Fotos JPEG**: 80-90
- **Screenshots/ilustraciones**: 90-95 (los bordes nítidos muestran artefactos)
- **Thumbnails**: 60-70 (el tamaño pequeño oculta artefactos)

Siempre prueba A/B con tu contenido real. Métricas perceptuales automatizadas (SSIM, Butteraugli) pueden optimizar calidad por imagen.
