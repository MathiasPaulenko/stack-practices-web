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
author: "Mathias Paulenko"
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

- **Gzip (DEFLATE)**: el estándar de compresión universal soportado por cada navegador y cliente HTTP desde 1998. Usa LZ77 y codificación Huffman para eliminar redundancia. El nivel de compresión 6 provee el mejor balance entre costo de CPU y reducción de tamaño.
- **Brotli**: desarrollado por Google, Brotli logra 15-25% mejor compresión que Gzip para assets de texto. Usa un diccionario predefinido de términos web comunes (tags HTML, propiedades CSS, keywords JavaScript) para mejorar ratios. Soportado en todos los navegadores modernos.
- **Compresión streaming**: en lugar de cargar un archivo completo en memoria, el streaming lee chunks desde disco, los comprime y escribe al output. Esto maneja archivos multi-gigabyte sin agotar la RAM.
- **Negociación de contenido**: los navegadores envían `Accept-Encoding: gzip, deflate, br` para indicar algoritmos soportados. Los servidores responden con `Content-Encoding: br` y el payload comprimido. Si el cliente no soporta compresión, el servidor retorna datos sin comprimir.

## Variantes

| Algoritmo | Ratio de compresión | Velocidad | Soporte de navegador | Mejor para |
|-----------|---------------------|-----------|----------------------|------------|
| Gzip | Bueno | Rápida | Universal | Responses en vivo, soporte legacy |
| Brotli | Excelente | Media | Navegadores modernos | Assets estáticos pre-comprimidos |
| Zstandard | Muy bueno | Muy rápida | Limitado | APIs internas, microservicios |
| LZ4 | Bajo | Extremadamente rápida | Herramientas | Logs en tiempo real, rutas críticas de velocidad |

## Lo que funciona

- **Pre-comprime assets estáticos durante build**: en lugar de comprimir en cada request, ejecuta `brotli -q 11` y `gzip -k` durante tu pipeline CI/CD. Almacena variantes `.br` y `.gz` junto a los originales. Nginx puede servirlos directamente con `brotli_static on`.
- **No compres formatos ya comprimidos**: imágenes (JPEG, PNG, WebP), videos (MP4) y archivos (ZIP) ya están comprimidos. Ejecutar Gzip sobre ellos desperdicia CPU y puede aumentar el tamaño del archivo. Salta compresión para estos MIME types.
- **Usa filtros de threshold**: comprimir una response JSON de 200 bytes agrega más overhead (headers, framing) de lo que ahorra. Establece un tamaño mínimo de 1KB y solo comprime `text/*`, `application/json` e `image/svg+xml`.
- **Habilita `Vary: Accept-Encoding`**: los caches y CDNs deben almacenar variantes separadas para responses comprimidas y sin comprimir. El header `Vary` indica a intermediarios que usen el header `Accept-Encoding` como clave de cache, previniendo servir gzip a clientes que no pueden descomprimir.
- **Monitorea overhead de CPU**: la compresión es intensiva en CPU. En APIs de alto tráfico, la pre-compresión o appliances de compresión dedicados (CDNs) descargan trabajo de los servidores de aplicación. Profilea tu aplicación para asegurar que la compresión no sature el manejo de requests.

## Errores comunes

- **Doble compresión**: aplicar Gzip a una response que ya está comprimida con Brotli, o viceversa, corrompe los datos. Asegúrate de que tu stack de middleware no aplique múltiples capas de compresión.
- **Comprimir en cada request**: la compresión en vivo para assets estáticos es desperdiciadora. Pre-comprime una vez al momento de build y sirve el archivo pre-comprimido directamente. La compresión en vivo debería aplicarse solo a responses genuinamente en vivo.
- **Olvidar descomprimir en el cliente**: los clientes de API deben descomprimir responses explícitamente o usar bibliotecas que manejen `Content-Encoding` transparentemente. Bytes crudos de Gzip pasados a un parser JSON lanzarán errores de sintaxis.
- **Ignorar límites de memoria**: descomprimir input no confiable de usuario puede desencadenar ataques de zip bomb (un archivo comprimido pequeño que expande a terabytes). Limita tamaños de buffer de descompresión y usa APIs de streaming que procesen chunks incrementalmente.

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

## Mejores Prácticas Adicionales

1. **Usa Brotli calidad 11 para assets estáticos, calidad 4 para dinámicos.** Calidad 11 es 10-50x más lento que calidad 4 pero produce archivos 5-10% más pequeños. Para pre-compresión al momento de build, el tiempo extra es irrelevante. Para responses en vivo, calidad 4 mantiene la latencia bajo 10ms:

```bash
# Assets estáticos: calidad 11 (build time, máxima compresión)
brotli -q 11 -k app.js

# Responses dinámicos: calidad 4 (runtime, compresión rápida)
# En Node.js: zlib.createBrotliCompress({ params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } })
```

2. **Cachea archivos pre-comprimidos con nombres basados en contenido.** Usa nombres de archivo basados en hash (ej. `app.a3f5b2c.js`) para que el CDN cachee la variante comprimida indefinidamente:

```nginx
# Nginx: servir archivos pre-comprimidos con headers de cache de largo plazo
location ~* \.(js|css|html|svg)$ {
    brotli_static on;
    gzip_static on;
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary "Accept-Encoding";
}
```

3. **Benchmark ratios de compresión antes de comprometerte con un algoritmo.** Diferentes tipos de datos comprimen diferente. JSON con keys repetidas comprime bien con el diccionario de Brotli. CSV con datos numéricos puede comprimir mejor con Gzip:

```python
import gzip
import time

def benchmark_compression(data: bytes, algorithm: str = 'gzip', level: int = 6) -> dict:
    """Benchmark de ratio de compresión y velocidad."""
    start = time.perf_counter()
    if algorithm == 'gzip':
        compressed = gzip.compress(data, compresslevel=level)
    elif algorithm == 'brotli':
        import brotli
        compressed = brotli.compress(data, quality=level)
    else:
        raise ValueError(f"Algoritmo desconocido: {algorithm}")
    elapsed = time.perf_counter() - start

    return {
        'algorithm': algorithm,
        'level': level,
        'original_size': len(data),
        'compressed_size': len(compressed),
        'ratio': f"{len(compressed)/len(data)*100:.1f}%",
        'time_ms': f"{elapsed*1000:.2f}",
        'speed_mbs': f"{len(data)/elapsed/1024/1024:.1f}",
    }

# data = open('large.json', 'rb').read()
# print(benchmark_compression(data, 'gzip', 6))
# print(benchmark_compression(data, 'brotli', 4))
```

## Errores Comunes Adicionales

1. **Servir Brotli a clientes que no lo soportan.** Brotli está soportado en todos los navegadores modernos pero no en clientes HTTP antiguos, curl (sin `--compressed`), o algunos proxies. Siempre verifica `Accept-Encoding` antes de enviar Brotli:

```javascript
// Mal: siempre envía Brotli
// res.setHeader('Content-Encoding', 'br');

// Bien: verifica soporte del cliente primero
const acceptEncoding = req.headers['accept-encoding'] || '';
if (acceptEncoding.includes('br')) {
    res.setHeader('Content-Encoding', 'br');
} else if (acceptEncoding.includes('gzip')) {
    res.setHeader('Content-Encoding', 'gzip');
}
```

2. **Usar nivel de compresión 9 para responses de API en vivo.** Nivel 9 es 3-5x más lento que nivel 6 para una mejora marginal de tamaño (1-3%). Para responses en vivo donde la latencia importa, usa nivel 4-6:

```python
# Mal: nivel 9 para response de API en vivo (demasiado lento)
# compressed = gzip.compress(data, compresslevel=9)

# Bien: nivel 6 para responses en vivo (balanceado)
compressed = gzip.compress(data, compresslevel=6)

# Bien: nivel 9 para cold storage (el tamaño importa más que la velocidad)
compressed = gzip.compress(data, compresslevel=9)
```

3. **No establecer `Vary: Accept-Encoding` en responses comprimidas.** Sin este header, un CDN puede cachear una response Brotli y servirla a un cliente que solo soporta Gzip:

```nginx
# Mal: sin header Vary, CDN sirve el encoding equivocado
# gzip on;
# gzip_comp_level 6;

# Bien: header Vary previene cache poisoning
gzip on;
gzip_comp_level 6;
gzip_vary on;
add_header Vary "Accept-Encoding";
```

## Preguntas Frecuentes Adicionales

### ¿Cómo manejo la compresión en una arquitectura de microservicios?

Usa un gateway de compresión o proxy sidecar. Los servicios de aplicación retornan responses sin comprimir, y el gateway maneja la negociación de `Accept-Encoding`. Esto centraliza la config de compresión y evita overhead de CPU en los servidores de aplicación. Envoy, Nginx y HAProxy todos soportan este patrón:

```nginx
# Nginx como gateway de API: comprimir responses de servicios upstream
location /api/ {
    proxy_pass http://backend;
    gzip on;
    gzip_comp_level 6;
    gzip_types application/json;
    gzip_vary on;
    proxy_set_header Accept-Encoding $http_accept_encoding;
}
```

### ¿Esta solución está lista para producción?

Sí. `zlib` de Node.js es usado por Express.js, Next.js, y el SDK de AWS para compresión de responses. `gzip` de Python es usado por `GZipMiddleware` de Django, Flask-Compress, y pip para distribución de paquetes. `GZIPOutputStream` de Java es usado por `GzipFilter` de Spring Boot, Gradle para compresión de artefactos, y Kafka para compresión de mensajes. Los módulos `gzip` y `brotli` de Nginx son usados por Cloudflare, Fastly, y todos los CDNs principales para compresión en el edge. Brotli es usado por Google Search, YouTube, y Facebook para entrega de assets estáticos. El middleware `compression` de Express es usado por miles de APIs en producción. Pre-compresión con `brotli -q 11` es el step de build estándar en Webpack, Vite, y Astro para optimización de assets estáticos.

### ¿Cuáles son las características de rendimiento?

Gzip nivel 6 comprime texto a 30-80MB/s en Python, 50-120MB/s en Node.js, y 60-150MB/s en Java con buffer de 8KB. Brotli calidad 4 comprime a 20-60MB/s; calidad 11 a 2-10MB/s pero produce output 5-10% más pequeño. La descompresión es 5-10x más rápida que la compresión: Gzip descomprime a 200-500MB/s, Brotli a 100-400MB/s. `gzip_static` de Nginx sirve archivos pre-comprimidos a velocidad de I/O de disco (500-2000MB/s en SSD). Ratio de compresión para texto: Gzip nivel 6 logra 70-85% de reducción, Brotli calidad 11 logra 75-90% de reducción. Para JSON con keys repetidas, el diccionario de Brotli añade 3-8% de reducción adicional sobre Gzip. Para datos binarios (imágenes, videos), el ratio de compresión es 0-5% — saltar compresión. Uso de memoria: compresión streaming usa O(buffer_size), típicamente 8-64KB por stream. Brotli calidad 11 usa diccionario de 16MB, requiriendo 16-32MB RAM por compresión concurrente. Costo de CPU: Gzip nivel 6 usa 1-3ms por 100KB en una CPU moderna; Brotli calidad 11 usa 50-200ms por 100KB.

### ¿Cómo depuro problemas de compresión?

Para `Content-Encoding` incorrecto, verifica headers con `curl -v -H "Accept-Encoding: gzip, br" https://example.com/api` — revisa `Content-Encoding` y `Vary` en la response. Para datos comprimidos corruptos, verifica integridad con `gzip -t file.gz` (Bash) o lectura completa con `GZIPInputStream` (Java). Para ratios de compresión pobres, verifica si los datos ya están comprimidos con `file --mime-type input.dat` — si retorna `application/zip` o `image/jpeg`, salta compresión. Para responses lentas, perfila el tiempo de compresión con `time curl -s -o /dev/null https://example.com/api` y compara con y sin `Accept-Encoding: gzip`. Para problemas de cache, verifica que `Vary: Accept-Encoding` esté presente con `curl -I https://example.com/api` y prueba con diferentes valores de `Accept-Encoding`. Para Brotli no servido, verifica que el módulo `ngx_brotli` esté cargado con `nginx -V 2>&1 | grep brotli` y revisa que `brotli_types` incluya el MIME type de la response. Para doble compresión, inspecciona headers de response — si `Content-Encoding` aparece dos veces o la response es más grande que el original, revisa el orden del middleware. Para problemas de memoria durante compresión batch, monitorea con `top` o `htop` y reduce el tamaño del buffer o usa APIs de streaming en lugar de compresión en memoria.
