---
contentType: recipes
slug: compression-gzip
title: "Comprimir y Descomprimir Archivos con Gzip y Brotli"
description: "Cómo reducir tamaños de archivos para APIs, assets estáticos y logs usando Gzip, Brotli y zlib con compresión streaming, negociación de contenido y lo que funciona."
metaDescription: "Aprende compresión de archivos con Gzip y Brotli. Reduce tamaños para APIs, assets estáticos y logs usando compresión streaming y negociación de contenido."
difficulty: beginner
topics:
  - file-handling
tags:
  - file-handling
  - brotli
  - io
  - streams
  - files
relatedResources:
  - /recipes/cdn-edge-caching
  - /recipes/lazy-loading
  - /recipes/image-optimization
  - /recipes/stream-processing
lastUpdated: "2026-06-14"
publishedAt: "2026-06-14"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende compresión de archivos con Gzip y Brotli. Reduce tamaños para APIs, assets estáticos y logs usando compresión streaming y negociación de contenido."
  keywords:
    - compresion gzip
    - compresion brotli
    - comprimir archivos
    - zlib streaming
    - comprimir assets
---

## Visión general

El ancho de banda de red frecuentemente es el componente más lento en la entrega de aplicaciones web. Un bundle JavaScript de 500KB puede tardar 2 segundos en descargarse en una conexión 3G, pero solo 50 milisegundos en generarse en el servidor. La compresión cierra esta brecha reduciendo tamaños de payload antes de la transmisión. Algoritmos modernos como Gzip y Brotli pueden reducir assets basados en texto — HTML, CSS, JavaScript, JSON y SVG — entre un 60-85% sin pérdida de datos.

La clave es que la compresión ocurra transparentemente en la capa correcta. Los servidores web (Nginx, Apache) pueden comprimir responses sobre la marcha. Los pipelines de build (Webpack, Vite) pueden pre-comprimir assets estáticos durante el deployment. Las APIs pueden streamer JSON comprimido directamente a clientes que anuncian soporte vía el header `Accept-Encoding`. A continuacion se cubre Gzip, Brotli y compresión streaming en Python, Node.js y configuraciones de servidor web.

## Cuándo usarlo

Usa esta receta cuando:

- Sirviendo grandes bundles JavaScript, hojas de estilo CSS o documentos HTML. Consulta [SPA Code Splitting](/recipes/performance/spa-code-splitting-lazy) para reducir tamaños de bundles.
- Reduciendo tamaños de response de API para clientes móviles en conexiones medidas. Consulta [Call REST API](/recipes/api/call-rest-api) para diseño eficiente de APIs.
- Comprimiendo archivos de log antes de archivarlos a cold storage. Consulta [Stream Processing](/recipes/file-handling/stream-processing) para procesamiento de pipelines de logs.
- Subiendo grandes payloads a object storage o transfiriendo archivos entre servicios. Consulta [Image Optimization](/recipes/file-handling/image-optimization) para compresión de media.
- Cumpliendo con presupuestos de performance que mandatan tamaños máximos de transferencia. Consulta [Lazy Loading Images](/recipes/performance/lazy-loading) para reducir transferencia.

## Solución

### Compresión Streaming con Gzip (Node.js / zlib)

```javascript
const zlib = require('zlib');
const fs = require('fs');
const { pipeline } = require('stream');

function compressFile(inputPath, outputPath) {
  const gzip = zlib.createGzip({ level: 6 });
  const source = fs.createReadStream(inputPath);
  const destination = fs.createWriteStream(outputPath);

  pipeline(source, gzip, destination, (err) => {
    if (err) console.error('Compression failed:', err);
    else console.log('File compressed successfully');
  });
}

compressFile('data.json', 'data.json.gz');
```

### Compresión con Brotli (Python)

```python
import brotli
import gzip

def compress_with_brotli(data: bytes) -> bytes:
    return brotli.compress(data, quality=4)

def compress_with_gzip(data: bytes) -> bytes:
    return gzip.compress(data, compresslevel=6)

json_data = b'{"users": [...]}' * 1000
brotli_compressed = compress_with_brotli(json_data)
gzip_compressed = compress_with_gzip(json_data)

print(f"Original: {len(json_data)} bytes")
print(f"Brotli: {len(brotli_compressed)} bytes ({len(brotli_compressed)/len(json_data)*100:.1f}%)")
print(f"Gzip: {len(gzip_compressed)} bytes ({len(gzip_compressed)/len(json_data)*100:.1f}%)")
```

### Middleware Express con Negociación de Contenido

```javascript
const express = require('express');
const compression = require('compression');

const app = express();

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024,
}));

app.get('/api/data', (req, res) => {
  res.json(largeDataset);
});
```

### Pre-compresión de Assets Estáticos en Nginx

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

brotli on;
brotli_static on;
brotli_comp_level 4;
brotli_types text/plain text/css application/javascript application/json image/svg+xml;
```

## Explicación

- **Gzip (DEFLATE)**: el estándar de compresión universal soportado por cada navegador y cliente HTTP desde 1998.   El nivel de compresión 6 provee el mejor balance entre costo de CPU y reducción de tamaño.
- **Brotli**: desarrollado por Google, Brotli logra 15-25% mejor compresión que Gzip para assets de texto.   Soportado en todos los navegadores modernos.
- **Compresión streaming**: en lugar de cargar un archivo completo en memoria, el streaming lee chunks desde disco, los comprime y escribe al output.
- **Negociación de contenido**: los navegadores envían `Accept-Encoding: gzip, deflate, br` para indicar algoritmos soportados.   Los servidores responden con `Content-Encoding: br` y el payload comprimido.   Si el cliente no soporta compresión, el servidor retorna datos sin comprimir.

## Variantes

| Algoritmo | Ratio de compresión | Velocidad | Soporte de navegador | Mejor para |
|-----------|---------------------|-----------|----------------------|------------|
| Gzip | Bueno | Rápida | Universal | Responses en vivo, soporte legacy |
| Brotli | Excelente | Media | Navegadores modernos | Assets estáticos pre-comprimidos |
| Zstandard | Muy bueno | Muy rápida | Limitado | APIs internas, microservicios |
| LZ4 | Bajo | Extremadamente rápida | Herramientas | Logs en tiempo real, rutas críticas de velocidad |

## Lo que funciona

- **Pre-comprime assets estáticos durante build**: en lugar de comprimir en cada request, ejecuta `brotli -q 11` y `gzip -k` durante tu pipeline CI/CD.  br` y `.  gz` junto a los originales.   Nginx puede servirlos directamente con `brotli_static on`.
- **No compres formatos ya comprimidos**: imágenes (JPEG, PNG, WebP), videos (MP4) y archivos (ZIP) ya están comprimidos.   Ejecutar Gzip sobre ellos desperdicia CPU y puede aumentar el tamaño del archivo.   Salta compresión para estos MIME types.
- **Usa filtros de threshold**: comprimir una response JSON de 200 bytes agrega más overhead (headers, framing) de lo que ahorra.   Establece un tamaño mínimo de 1KB y solo comprime `text/*`, `application/json` e `image/svg+xml`.
- **Habilita `Vary: Accept-Encoding`**: El header `Vary` indica a intermediarios que usen el header `Accept-Encoding` como clave de cache, previniendo servir gzip a clientes que no pueden descomprimir.
- **Monitorea overhead de CPU**: la compresión es intensiva en CPU.   En APIs de alto tráfico, la pre-compresión o appliances de compresión dedicados (CDNs) descargan trabajo de los servidores de aplicación.

## Errores comunes

- **Doble compresión**: aplicar Gzip a una response que ya está comprimida con Brotli, o viceversa, corrompe los datos.   Asegúrate de que tu stack de middleware no aplique múltiples capas de compresión.
- **Comprimir en cada request**: la compresión en vivo para assets estáticos es desperdiciadora.   Pre-comprime una vez al momento de build y sirve el archivo pre-comprimido directamente.   La compresión en vivo debería aplicarse solo a responses genuinamente en vivo.
- **Olvidar descomprimir en el cliente**: los clientes de API deben descomprimir responses explícitamente o usar bibliotecas que manejen `Content-Encoding` transparentemente.   Bytes crudos de Gzip pasados a un parser JSON lanzarán errores de sintaxis.
- **Ignorar límites de memoria**: descomprimir input no confiable de usuario puede desencadenar ataques de zip bomb (un archivo comprimido pequeño que expande a terabytes).

## Preguntas frecuentes

**P: ¿Debería usar Gzip o Brotli para mi aplicación?**
R: Usa ambos. Brotli para assets estáticos (pre-comprimidos al momento de build), Gzip para responses en vivo y soporte de navegadores legacy. Los CDNs modernos seleccionan automáticamente el mejor algoritmo basado en el header `Accept-Encoding` del cliente.

**P: ¿La compresión afecta el caching?**
R: Sí. Un cache debe almacenar copias separadas para cada variante de `Content-Encoding`. Configura tu CDN o cache para variar sobre `Accept-Encoding`. De lo contrario, una response gzip cacheada puede ser servida a un cliente que solo soporta Brotli.

**P: ¿Puedo comprimir mensajes de WebSocket?**
R: WebSocket per-message deflate está soportado en RFC 7692. Sin embargo, la compresión está deshabilitada por razones de seguridad cuando TLS no se usa (ataques CRIME/BREACH). Usa TLS con WebSockets si habilitas compresión.

**P: ¿Cómo mido la efectividad de la compresión?**
R: Compara el `Content-Length` de responses comprimidas vs sin comprimir. Un ratio de compresión de 70-85% es típico para JSON y HTML. Si tu ratio está por debajo del 50%, verifica que no estés comprimiendo formatos ya comprimidos o que tus datos sean genuinamente incompresibles.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Soluciones Avanzadas

### Python: Streaming Gzip con niveles configurables y verificación de integridad

```python
import gzip
import hashlib
from pathlib import Path

def gzip_streaming(src: str, dest: str, level: int = 6) -> str:
    """GZIP un archivo con streaming. Retorna SHA256 del original para integridad."""
    hasher = hashlib.sha256()
    with open(src, 'rb') as f_in, gzip.open(dest, 'wb', compresslevel=level) as f_out:
        while True:
            chunk = f_in.read(65536)
            if not chunk:
                break
            hasher.update(chunk)
            f_out.write(chunk)
    return hasher.hexdigest()

def gunzip_streaming(src: str, dest: str, expected_sha256: str = None) -> bool:
    """Descomprime GZIP con verificación opcional de integridad. Retorna True si es válido."""
    hasher = hashlib.sha256()
    with gzip.open(src, 'rb') as f_in, open(dest, 'wb') as f_out:
        while True:
            chunk = f_in.read(65536)
            if not chunk:
                break
            hasher.update(chunk)
            f_out.write(chunk)
    if expected_sha256:
        return hasher.hexdigest() == expected_sha256
    return True

def gzip_batch(files: list[str], level: int = 6) -> dict[str, str]:
    """GZIP múltiples archivos. Retorna mapeo de ruta original a SHA256."""
    results = {}
    for file_path in files:
        dest = f"{file_path}.gz"
        sha = gzip_streaming(file_path, dest, level)
        results[file_path] = sha
    return results

# Uso
# sha = gzip_streaming('large.log', 'large.log.gz', level=6)
# print(f"SHA256 original: {sha}")
# valid = gunzip_streaming('large.log.gz', 'large_restored.log', expected_sha256=sha)
# print(f"Verificación de integridad: {'PASS' if valid else 'FAIL'}")
```

### Node.js: Brotli streaming con middleware de negociación de contenido

```javascript
const zlib = require('zlib');
const fs = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipe = promisify(pipeline);

async function compressBrotli(srcPath, destPath, quality = 11) {
    const src = fs.createReadStream(srcPath);
    const brotli = zlib.createBrotliCompress({
        params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: quality,
            [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
        },
    });
    const dest = fs.createWriteStream(destPath);
    await pipe(src, brotli, dest);
}

async function compressGzip(srcPath, destPath, level = 6) {
    const src = fs.createReadStream(srcPath);
    const gzip = zlib.createGzip({ level });
    const dest = fs.createWriteStream(destPath);
    await pipe(src, gzip, dest);
}

// Middleware Express: negociar el mejor encoding
function smartCompression() {
    return (req, res, next) => {
        const acceptEncoding = req.headers['accept-encoding'] || '';
        const originalSend = res.send.bind(res);

        res.send = function (body) {
            if (typeof body === 'string' && body.length > 1024) {
                if (acceptEncoding.includes('br')) {
                    res.setHeader('Content-Encoding', 'br');
                    res.setHeader('Vary', 'Accept-Encoding');
                    body = zlib.brotliCompressSync(body, {
                        params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 },
                    });
                } else if (acceptEncoding.includes('gzip')) {
                    res.setHeader('Content-Encoding', 'gzip');
                    res.setHeader('Vary', 'Accept-Encoding');
                    body = zlib.gzipSync(body, { level: 6 });
                }
            }
            originalSend(body);
        };
        next();
    };
}

// Uso
// await compressBrotli('app.js', 'app.js.br', 11);
// await compressGzip('app.js', 'app.js.gz', 6);
// app.use(smartCompression());
```

### Java: Compresión GZIP y Brotli con buffers configurables

```java
import java.io.*;
import java.nio.file.*;
import java.util.zip.*;

public class CompressionUtils {

    // GZIP un archivo con streaming
    public static long gzipFile(Path src, Path dest, int bufferSize) throws IOException {
        long bytesWritten = 0;
        try (InputStream fis = Files.newInputStream(src);
             OutputStream fos = Files.newOutputStream(dest);
             GZIPOutputStream gzos = new GZIPOutputStream(fos, bufferSize) {{
                 def.setLevel(6); // Establecer nivel de compresión
             }}) {
            byte[] buffer = new byte[bufferSize];
            int read;
            while ((read = fis.read(buffer)) != -1) {
                gzos.write(buffer, 0, read);
                bytesWritten += read;
            }
        }
        return bytesWritten;
    }

    // Descomprimir GZIP con streaming
    public static long gunzipFile(Path src, Path dest, int bufferSize) throws IOException {
        long bytesWritten = 0;
        try (InputStream fis = Files.newInputStream(src);
             GZIPInputStream gzis = new GZIPInputStream(fis, bufferSize);
             OutputStream fos = Files.newOutputStream(dest)) {
            byte[] buffer = new byte[bufferSize];
            int read;
            while ((read = gzis.read(buffer)) != -1) {
                fos.write(buffer, 0, read);
                bytesWritten += read;
            }
        }
        return bytesWritten;
    }

    // Verificar integridad GZIP sin extraer
    public static boolean verifyGzip(Path gzPath) {
        try (InputStream fis = Files.newInputStream(gzPath);
             GZIPInputStream gzis = new GZIPInputStream(fis)) {
            byte[] buffer = new byte[8192];
            while (gzis.read(buffer) != -1) {
                // Leer todo el archivo para verificar integridad
            }
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    // Compresión batch de archivos en un directorio
    public static int gzipDirectory(Path srcDir, Path destDir, int bufferSize) throws IOException {
        Files.createDirectories(destDir);
        int count = 0;
        try (var files = Files.walk(srcDir)) {
            for (Path file : files.filter(Files::isRegularFile).toList()) {
                Path relative = srcDir.relativize(file);
                Path dest = destDir.resolve(relative.toString() + ".gz");
                Files.createDirectories(dest.getParent());
                gzipFile(file, dest, bufferSize);
                count++;
            }
        }
        return count;
    }
}

// Uso
// long bytes = CompressionUtils.gzipFile(Path.of("data.json"), Path.of("data.json.gz"), 8192);
// boolean valid = CompressionUtils.verifyGzip(Path.of("data.json.gz"));
// int count = CompressionUtils.gzipDirectory(Path.of("logs/"), Path.of("logs-gz/"), 16384);
```

### Bash: Pipeline de pre-compresión para assets estáticos

```bash
#!/usr/bin/env bash
set -euo pipefail

# Pre-comprimir assets estáticos con Gzip y Brotli
precompress_assets() {
    local dir="$1"
    local count=0

    for file in "$dir""/"*.{js,css,html,json,svg,xml,txt}; do
        [[ -f "$file" ]] || continue

        # Saltar si ya está comprimido
        [[ "$file" == *.gz || "$file" == *.br ]] && continue

        # Compresión Gzip (nivel 9 para assets estáticos)
        if [[ ! -f "${file}.gz" || "$file" -nt "${file}.gz" ]]; then
            gzip -9 -k -f "$file"
            ((count++))
        fi

        # Compresión Brotli (calidad 11 para assets estáticos)
        if command -v brotli &>/dev/null; then
            if [[ ! -f "${file}.br" || "$file" -nt "${file}.br" ]]; then
                brotli -q 11 -k -f "$file"
                ((count++))
            fi
        fi
    done

    echo "Pre-comprimidos $count archivos en $dir"
}

# Comparar ratios de compresión
compare_ratios() {
    local file="$1"
    local original_size
    local gzip_size
    local brotli_size

    original_size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file")
    gzip -c -9 "$file" > /tmp/compare.gz
    brotli -c -q 11 "$file" > /tmp/compare.br 2>/dev/null || true

    gzip_size=$(stat -c%s /tmp/compare.gz 2>/dev/null || stat -f%z /tmp/compare.gz)
    brotli_size=$(stat -c%s /tmp/compare.br 2>/dev/null || stat -f%z /tmp/compare.br)

    echo "Archivo: $file"
    echo "  Original: $original_size bytes"
    echo "  Gzip:     $gzip_size bytes ($(awk "BEGIN{printf \"%.1f\", ($gzip_size/$original_size)*100}")%)"
    echo "  Brotli:   $brotli_size bytes ($(awk "BEGIN{printf \"%.1f\", ($brotli_size/$original_size)*100}")%)"

    rm -f /tmp/compare.gz /tmp/compare.br
}

# Verificar integridad gzip
verify_gzip() {
    local file="$1"
    if gzip -t "$file" 2>/dev/null; then
        echo "OK: $file es válido"
    else
        echo "FAIL: $file está corrupto"
        return 1
    fi
}

# Uso
# precompress_assets /var/www/static
# compare_ratios /var/www/static/app.js
# verify_gzip /var/www/static/app.js.gz
```



