---
contentType: recipes
slug: brotli-nginx-compression
title: "Habilita compresión Brotli en Nginx para assets estáticos"
description: "Configura compresión Brotli en Nginx para reducir assets de JavaScript, CSS y HTML con mejores ratios que Gzip y cargar más rápido."
metaDescription: "Configura compresión Brotli en Nginx. Reduce el tamaño de transferencia de JavaScript, CSS y HTML con mejores ratios que Gzip para una entrega más rápida."
difficulty: beginner
topics:
  - performance
  - frontend
  - infrastructure
tags:
  - brotli
  - nginx
  - compression
  - performance
  - static-assets
  - optimization
relatedResources:
  - /recipes/compression-gzip
  - /recipes/cdn-edge-caching
  - /recipes/web-performance
  - /recipes/cache-invalidation
  - /recipes/lazy-loading
  - /guides/performance-optimization-guide
lastUpdated: "2026-08-22"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Configura compresión Brotli en Nginx. Reduce el tamaño de transferencia de JavaScript, CSS y HTML con mejores ratios que Gzip para una entrega más rápida."
  keywords:
    - brotli
    - nginx
    - compresion
    - rendimiento
    - static assets
    - gzip
---

Brotli es un algoritmo de compresión moderno que suele entregar archivos JavaScript y CSS entre un
15 % y un 25 % más pequeños que Gzip. Cuando lo habilitás en Nginx, los assets de texto llegan más
rápido al navegador y las páginas empiezan a renderizarse antes.

## Cuándo Usarlo

- Servís assets de texto estáticos a través de Nginx.
- La mayoría de tus usuarios usan navegadores modernos que soportan Brotli.
- Querés reducir el ancho de banda sin cambiar el código de la aplicación.

## Cuándo NO Usarlo

- El servidor ya está limitado por CPU en picos de tráfico — la compresión dinámica Brotli agrega
    carga.
- Solo servís archivos de media como JPEG, PNG o MP4, que ya están comprimidos.
- Estás detrás de un CDN que maneja la compresión por sí mismo e ignora la codificación del origen.

## Solución

### Instalar el módulo Brotli

La mayoría de los paquetes de Nginx no incluyen Brotli por defecto. En Ubuntu, `nginx-extras` puede
tenerlo. De lo contrario, compilalo como módulo dinámico.

```bash
# Ubuntu/Debian
sudo apt install nginx-extras

# Compilar desde fuente
./configure --with-compat --add-dynamic-module=/path/to/ngx_brotli
make && sudo make install
```

### Configurar Nginx

Cargá los módulos dinámicos si los compilaste, luego activá Brotli y seteá los MIME types que querés
comprimir.

```nginx
# /etc/nginx/nginx.conf
http {
  load_module modules/ngx_http_brotli_filter_module.so;
  load_module modules/ngx_http_brotli_static_module.so;

  brotli on;
  brotli_comp_level 6;
  brotli_types
    text/plain
    text/css
    text/xml
    application/javascript
    application/json
    application/xml
    image/svg+xml
    font/woff2;

  # Servir archivos .br pre-generados cuando existan
  brotli_static on;
}
```

Un nivel de compresión 6 es un buen default. Los niveles 10-11 generan archivos más pequeños pero
usan mucha más CPU, así que son mejores para assets estáticos pre-comprimidos.

### Pre-comprimir assets estáticos en build time

Evitá comprimir los mismos archivos en cada request generando archivos `.br` durante el build.

```bash
for file in dist/**/*.{js,css,html,svg}; do
  if [ -f "$file" ]; then
    brotli --quality=11 --output="${file}.br" "$file"
  fi
done
```

Para un proyecto con Vite, podés agregar un plugin pequeño:

```javascript
// vite-plugin-brotli.js
import { brotliCompressSync } from 'zlib';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, extname } from 'path';

export default function brotliPlugin() {
  return {
    name: 'brotli',
    closeBundle() {
      const dist = resolve('dist');
      const exts = ['.js', '.css', '.html', '.svg'];

      function compressDir(dir) {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const full = resolve(dir, entry.name);
          if (entry.isDirectory()) {
            compressDir(full);
          } else if (exts.includes(extname(entry.name))) {
            const compressed = brotliCompressSync(readFileSync(full));
            writeFileSync(`${full}.br`, compressed);
          }
        }
      }

      compressDir(dist);
    },
  };
}
```

### Verificar la respuesta

Pedí un asset con `br` en `Accept-Encoding` y confirmá el header.

```bash
curl -H "Accept-Encoding: br" -I https://example.com/app.js

HTTP/2 200
content-encoding: br
content-type: application/javascript
```

### Mantener Gzip como fallback

Nginx elige la mejor codificación que el cliente acepta, así que dejá Gzip habilitado para
navegadores viejos.

```nginx
server {
  gzip on;
  gzip_types text/plain text/css application/javascript;
  gzip_vary on;
}
```

## Explicación

1. **Compresión basada en diccionario** — Brotli usa un diccionario interno grande de términos
    comunes de la web, lo que hace archivos de texto más pequeños que Gzip a velocidades similares.
2. **Negociación de contenido** — El navegador envía un header `Accept-Encoding: br, gzip` y Nginx
    responde con el primer formato que soporte.
3. **Compresión estática vs dinámica** — `brotli_static` sirve archivos `.br` pre-generados sin
    costo en runtime. `brotli on` comprime respuestas sin cachear sobre la marcha.
4. **Trade-off de CPU** — Niveles más altos comprimen más pero tardan más. Usá nivel 11 para
    compresión en build y 4-6 para respuestas en vivo.

## Variantes

### Usar un CDN con Brotli

Si usás Cloudflare, Fastly o un CDN similar, Brotli puede ya estar habilitado en el edge. En ese
caso, mantené Brotli en el origen como fallback y seteá headers `Cache-Control` largos para que el
edge cachee ambas variantes `br` y `gzip`. Verá [CDN Edge Caching](/es/recipes/cdn-edge-caching/)
para más.

### Pre-comprimir en un pipeline de CI/CD

Agregá el paso de build a tu pipeline de despliegue y asegurate de que los archivos `.br` existan
antes de subir.

```yaml
- name: Pre-comprimir assets
  run: |
    find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' \) \
      -exec brotli --best {} \;
```

## Buenas Prácticas

- Usá Brotli nivel 4-6 para contenido dinámico y nivel 11 para archivos pre-comprimidos.
- Agregá `font/woff2` e `image/svg+xml` a `brotli_types` — comprimen bien.
- No incluyas formatos ya comprimidos como JPEG, PNG, WebP o MP4.
- Habilitá `brotli_vary on` para que los caches manejen correctamente las variantes de codificación.
- Testeá con Lighthouse o `curl` después de cada cambio de configuración.

## Errores Comunes

- Olvidar instalar o cargar `ngx_brotli` y pensar que `brotli on` funciona por defecto.
- Usar nivel 11 para compresión dinámica, lo que agrega latencia bajo carga.
- Comprimir fuentes WOFF2 y servirlas con el `Content-Type` incorrecto.
- No agregar `br` a la cache key del CDN, lo que genera respuestas con codificación mezclada.

## Preguntas Frecuentes

### ¿Debería reemplazar Gzip por Brotli?

No. Serví Brotli a los navegadores que lo soportan y mantené Gzip para clientes más viejos. Nginx
maneja esto automáticamente a través de `Accept-Encoding`.

### ¿Qué assets se benefician más de Brotli?

JavaScript, CSS, HTML, SVG, JSON y texto plano. Las imágenes y video ya tienen su propia compresión,
así que Brotli ayuda poco.

### ¿Cuánto más pequeño es Brotli que Gzip?

Típicamente entre un 15 % y un 25 % más pequeño para JavaScript y CSS, y un 10 % a 15 % para HTML.
Los resultados dependen de cuán repetitivo sea el texto.

### ¿Puedo usar Brotli para respuestas dinámicas?

Sí, pero usá un nivel bajo como 4 para evitar picos de CPU. Pre-comprimí archivos estáticos en build
y servilos con `brotli_static`.

### ¿Cómo testeo la efectividad de la compresión?

Ejecutá `curl -H "Accept-Encoding: br" --compressed -I` y compará `Content-Length` contra las
versiones sin comprimir y con Gzip. Lighthouse también reporta tamaños de transferencia.
