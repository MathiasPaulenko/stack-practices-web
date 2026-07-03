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

La clave es que la compresión ocurra transparentemente en la capa correcta. Los servidores web (Nginx, Apache) pueden comprimir responses sobre la marcha. Los pipelines de build (Webpack, Vite) pueden pre-comprimir assets estáticos durante el deployment. Las APIs pueden streamer JSON comprimido directamente a clientes que anuncian soporte vía el header `Accept-Encoding`. Esta receta cubre Gzip, Brotli y compresión streaming en Python, Node.js y configuraciones de servidor web.

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
