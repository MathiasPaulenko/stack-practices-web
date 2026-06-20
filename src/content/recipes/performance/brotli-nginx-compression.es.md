---
contentType: recipes
slug: brotli-nginx-compression
title: "Habilita Compresion Brotli en Nginx para Entrega Mas Rapida de Assets"
description: "Como configurar compresion Brotli en Nginx para reducir tamanos de transferencia de assets JavaScript, CSS y HTML con mejores ratios que Gzip"
metaDescription: "Habilita compresion Brotli en Nginx. Reduce tamanos de transferencia de assets con mejores ratios de compresion que Gzip para JavaScript, CSS y HTML."
difficulty: beginner
topics:
  - performance
  - frontend
tags:
  - brotli
  - performance
  - nginx
  - compression
relatedResources:
  - /recipes/compression-gzip
  - /recipes/cdn-edge-caching
  - /guides/performance-optimization-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Habilita compresion Brotli en Nginx. Reduce tamanos de transferencia de assets con mejores ratios de compresion que Gzip para JavaScript, CSS y HTML."
  keywords:
    - brotli compression
    - nginx
    - web performance
    - asset compression
    - gzip alternative
---

# Habilita Compresion Brotli en Nginx para Entrega Mas Rapida de Assets

Brotli es un algoritmo de compresion moderno desarrollado por Google que consistentemente logra tamanos de archivo 15-25% mas pequenos que Gzip para assets basados en texto. Consulta [optimizacion de rendimiento](/guides/performance/performance-optimization-guide) para mas tecnicas de web performance. Combinado con Nginx y configuracion apropiada de content-type, reduce uso de ancho de banda y mejora tiempos de carga de pagina para todos los usuarios.

## Cuando Usar Esto

- Sirves assets estaticos a traves de Nginx y quieres maxima compresion
- Tus usuarios estan en navegadores modernos que soportan Brotli (95%+ de cobertura)
- Los costos de ancho de banda son un factor significativo en gasto de infraestructura

## Requisitos Previos

- Nginx compilado con el modulo `ngx_brotli` o usando el paquete `nginx-full`
- Certificado SSL/TLS (Brotli solo es efectivo sobre HTTPS en la practica)

## Solucion

### 1. Instalar el Modulo Brotli

```bash
# Ubuntu/Debian con modulo precompilado
sudo apt install nginx-extras

# O compilar desde fuente
./configure \
  --with-compat \
  --add-dynamic-module=/path/to/ngx_brotli
make && sudo make install
```

### 2. Configurar Brotli en Nginx

```nginx
# /etc/nginx/nginx.conf
http {
  # Cargar el modulo dinamico si se compilo dinamicamente
  load_module modules/ngx_http_brotli_filter_module.so;
  load_module modules/ngx_http_brotli_static_module.so;

  # Habilitar compresion Brotli dinamica
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

  # Archivos estaticos pre-comprimidos (opcional)
  brotli_static on;
}
```

### 3. Pre-Comprimir Assets Estaticos en Build Time

```bash
# Script de build para CI/CD
for file in dist/**/*.{js,css,html,svg}; do
  if [ -f "$file" ]; then
    brotli --quality=11 --output="${file}.br" "$file"
  fi
done
```

```javascript
// vite-plugin-brotli.js
import { brotliCompressSync } from 'zlib';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

export default function brotliPlugin() {
  return {
    name: 'brotli',
    closeBundle() {
      const dist = resolve('dist');
      const files = ['.js', '.css', '.html', '.svg'];
      
      files.forEach(ext => {
        const file = resolve(dist, `index${ext}`);
        try {
          const compressed = brotliCompressSync(readFileSync(file));
          writeFileSync(`${file}.br`, compressed);
        } catch { /* archivo no existe */ }
      });
    }
  };
}
```

### 4. Verificar que la Compresion Funciona

```bash
# Verificar headers de respuesta
curl -H "Accept-Encoding: br" -I https://example.com/app.js

# Salida esperada
HTTP/2 200
content-encoding: br
content-type: application/javascript
```

### 5. Fallback a Gzip para Clientes Antiguos

```nginx
server {
  location ~ \.(js|css|html|svg)$ {
    # Nginx automaticamente negocia encoding basado en el header Accept-Encoding
    # Brotli tiene prioridad cuando ambos son soportados
    gzip on;
    gzip_types text/plain text/css application/javascript;
    gzip_vary on;
  }
}
```

## Como Funciona

1. **Algoritmo Brotli** usa un enfoque basado en diccionario optimizado para contenido web
2. **Compresion Dinamica** comprime respuestas on-the-fly para contenido no cacheado
3. **Pre-Compresion Estatica** sirve archivos `.br` pre-construidos para evitar overhead de CPU
4. **Negociacion de Contenido** Nginx selecciona Brotli o Gzip basado en el header `Accept-Encoding`

## Consideraciones de Produccion

- Usa **nivel de compresion 4-6** para contenido dinamico; nivel 11 para assets estaticos pre-comprimidos
- Monitorea **uso de CPU**; Brotli a niveles altos puede ser intensivo en CPU
- Combina con un **[CDN](/recipes/data/caching)** que soporte cacheo de Brotli para maximo beneficio
- Testea con **WebPageTest** o Lighthouse para verificar reducciones de tamano de transferencia y [Core Web Vitals](/guides/performance/performance-optimization-guide)

## Errores Comunes

- Olvidar agregar `font/woff2` a `brotli_types`; las fuentes WOFF2 se comprimen bien
- Usar `brotli_comp_level 11` para contenido dinamico, causando alta latencia
- No habilitar `brotli_static` y comprimir los mismos archivos en cada peticion

## FAQ

**P: Deberia reemplazar Gzip completamente con Brotli?**
R: No. Sirve Brotli a navegadores modernos y Gzip como fallback para clientes antiguos.

**P: Brotli ayuda con imagenes?**
R: Beneficio minimo para formatos ya comprimidos como JPEG y PNG. Usalo para SVG, JSON y JavaScript.

**P: Cuanto mas pequeno es Brotli comparado con Gzip?**
R: Tipicamente 15-25% mas pequeno para JavaScript y CSS. HTML ve 10-15% de mejora.
