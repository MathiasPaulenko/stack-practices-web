---
contentType: recipes
slug: nginx-reverse-proxy-cache
title: "Cachear Respuestas HTTP con Nginx Reverse Proxy"
description: "Configura Nginx como reverse proxy con cache para almacenar respuestas HTTP upstream con zonas TTL, claves de cache y purge condicional."
metaDescription: "Cachear respuestas HTTP con Nginx reverse proxy. Configura zonas de cache, TTL por codigo de respuesta, claves, bypass y estrategias de purge."
difficulty: intermediate
topics:
  - caching
  - performance
  - infrastructure
tags:
  - nginx
  - reverse-proxy
  - http-cache
  - caching
  - load-balancer
relatedResources:
  - /recipes/caching/python-redis-cache-decorator
  - /recipes/caching/cdn-cache-invalidation-strategies
  - /guides/complete-guide-api-versioning-strategies
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Cachear respuestas HTTP con Nginx reverse proxy. Configura zonas de cache, TTL por codigo de respuesta, claves, bypass y estrategias de purge."
  keywords:
    - nginx reverse proxy cache
    - http caching
    - nginx cache zone
    - proxy_cache
    - cache ttl nginx
---

## Descripcion general

Nginx puede cachear respuestas de servidores upstream, reduciendo la carga en aplicaciones backend y cortando la latencia para peticiones repetidas. La directiva `proxy_cache` almacena respuestas en una zona de cache configurable en disco, con TTLs por codigo de respuesta, claves de cache basadas en atributos de la peticion, y opciones para bypass de cache para peticiones especificas. A continuacion: configurar un reverse proxy con cache, ajustar zonas de cache, manejar invalidacion de cache y caching condicional.

## Cuando Usar Esto

- Endpoints de API con respuestas GET cacheables (catalogos de productos, resultados de busqueda, contenido estatico)
- Reducir la carga en servidores de aplicacion backend durante picos de trafico
- Cachear respuestas de servicios upstream lentos
- Agregar una capa de caching sin modificar codigo de aplicacion

## Prerrequisitos

- Nginx 1.20+
- Un servidor de aplicacion backend ejecutandose en localhost o red interna
- Espacio suficiente en disco para la zona de cache

## Solucion

### 1. Definir una Zona de Cache

En el bloque `http` de `nginx.conf`:

```nginx
http {
    # Definir zona de cache: path, levels (jerarquia de directorios), size, max_size, inactive
    proxy_cache_path /var/cache/nginx/api
        levels=1:2
        keys_zone=api_cache:10m
        max_size=1g
        inactive=60m
        use_temp_path=off;

    # Otra zona para assets estaticos
    proxy_cache_path /var/cache/nginx/assets
        levels=1:2
        keys_zone=asset_cache:50m
        max_size=5g
        inactive=24h
        use_temp_path=off;
}
```

- `levels=1:2`: Jerarquia de directorios de dos niveles para archivos de cache (evita demasiados archivos en un directorio)
- `keys_zone=api_cache:10m`: 10MB de memoria compartida para claves (aproximadamente 80,000 claves)
- `max_size=1g`: Tamano maximo de cache en disco
- `inactive=60m`: Remover archivos no accedidos en 60 minutos (incluso si el TTL no ha expirado)

### 2. Habilitar Caching en un Server Block

```nginx
server {
    listen 80;
    server_name api.example.com;

    location /api/ {
        proxy_pass http://backend:3000;
        proxy_cache api_cache;

        # Clave de cache: metodo + host + URI + query string
        proxy_cache_key "$request_method$request_uri";

        # TTL por codigo de respuesta
        proxy_cache_valid 200 302 10m;
        proxy_cache_valid 404 1m;
        proxy_cache_valid 500 10s;  # Cachear errores brevemente para proteger backend

        # Agregar headers mostrando estado de cache
        add_header X-Cache-Status $upstream_cache_status;

        # No cachear respuestas con estos headers
        proxy_no_cache $http_authorization;
        proxy_cache_bypass $http_authorization;
    }

    location /assets/ {
        proxy_pass http://backend:3000;
        proxy_cache asset_cache;
        proxy_cache_key "$request_uri";
        proxy_cache_valid 200 24h;
        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

### 3. Caching Condicional

Saltar cache para peticiones autenticadas, POST, o query params especificos:

```nginx
server {
    listen 80;
    server_name api.example.com;

    # Saltar cache para POST, PUT, DELETE
    set $skip_cache 0;
    if ($request_method != GET) {
        set $skip_cache 1;
    }

    # Saltar cache para peticiones autenticadas
    if ($http_authorization) {
        set $skip_cache 1;
    }

    # Saltar cache para query params especificos
    if ($args ~* "no_cache=1") {
        set $skip_cache 1;
    }

    location /api/ {
        proxy_pass http://backend:3000;
        proxy_cache api_cache;
        proxy_cache_key "$request_method$request_uri";
        proxy_cache_valid 200 10m;

        proxy_no_cache $skip_cache;
        proxy_cache_bypass $skip_cache;

        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

### 4. Cache Locking (Prevenir Cache Stampede)

Cuando multiples peticiones llegan para la misma clave no cacheada, Nginx puede bloquear para que solo una peticion llegue al backend:

```nginx
location /api/ {
    proxy_pass http://backend:3000;
    proxy_cache api_cache;
    proxy_cache_key "$request_method$request_uri";
    proxy_cache_valid 200 10m;

    # Solo una peticion popula el cache
    proxy_cache_lock on;
    proxy_cache_lock_timeout 5s;    # Esperar hasta 5s para llenar cache
    proxy_cache_lock_age 30s;       # Liberar lock despues de 30s

    # Servir contenido stale mientras refresca
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    proxy_cache_background_update on;
    proxy_cache_revalidate on;

    add_header X-Cache-Status $upstream_cache_status;
}
```

### 5. Cache Purge (con modulo nginx-cache-purge)

```nginx
location ~ /purge(/.*) {
    allow 127.0.0.1;
    allow 10.0.0.0/8;
    deny all;
    proxy_cache_purge api_cache "$request_method$1$is_args$args";
}
```

Purgar una URL especifica:

```bash
curl -X GET http://api.example.com/purge/api/products?page=1
# Retorna: 200 OK - Purge successful
```

### 6. Headers de Cache Control del Upstream

Nginx respeta los headers `Cache-Control` del backend por defecto. Sobrescribirlos:

```nginx
location /api/ {
    proxy_pass http://backend:3000;
    proxy_cache api_cache;
    proxy_cache_key "$request_uri";

    # Ignorar headers Cache-Control del backend
    proxy_ignore_headers Cache-Control Expires Set-Cookie;

    # Forzar caching independientemente de los headers del backend
    proxy_cache_valid 200 10m;

    # Ocultar headers del backend al cliente
    proxy_hide_header Set-Cookie;
    proxy_hide_header Cache-Control;
}
```

## Como Funciona

1. **Clave de cache**: Nginx hashea el valor de `proxy_cache_key` (ej., `$request_method$request_uri`) y lo usa como identificador de archivo de cache. Claves identicas hit el mismo cache entry.
2. **Zona de cache**: El parametro `keys_zone` asigna memoria compartida para la tabla de lookup de claves. Las respuestas cacheadas reales se almacenan en disco bajo el directorio `proxy_cache_path`.
3. **Resolucion de TTL**: Nginx verifica `proxy_cache_valid` para el codigo de respuesta. Si el backend envia `Cache-Control: max-age`, Nginx usa eso a menos que `proxy_ignore_headers` lo sobrescriba.
4. **`$upstream_cache_status`**: Valores posibles: `HIT`, `MISS`, `BYPASS`, `EXPIRED`, `STALE`, `UPDATING`, `REVALIDATED`, `NONE`.
5. **Cache lock**: Con `proxy_cache_lock on`, solo la primera peticion para una clave no cacheada llega al backend. Otras esperan hasta `proxy_cache_lock_timeout` y luego reciben la respuesta cacheada.

## Variantes

### Cache con Header Vary

Cachear diferentes versiones de la misma URL basado en el header `Accept`:

```nginx
proxy_cache_key "$request_method$request_uri$http_accept";
```

### Cache con Conciencia de Cookies

```nginx
# Cachear diferentemente basado en cookie de rol de usuario
proxy_cache_key "$request_method$request_uri$cookie_user_role";
```

### Microcaching (Cache de 1 Segundo)

Cachear por un TTL muy corto para absorber picos de trafico:

```nginx
location /api/ {
    proxy_pass http://backend:3000;
    proxy_cache api_cache;
    proxy_cache_key "$request_method$request_uri";
    proxy_cache_valid 200 1s;        # TTL muy corto
    proxy_cache_lock on;
    add_header X-Cache-Status $upstream_cache_status;
}
```

### Cache Warming

Pre-poblar el cache obteniendo URLs despues de un deploy:

```bash
#!/bin/bash
# warm-cache.sh
URLS=(
    "https://api.example.com/api/products?page=1"
    "https://api.example.com/api/products?page=2"
    "https://api.example.com/api/categories"
)

for url in "${URLS[@]}"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    echo "$url -> $status"
done
```

## Mejores Practicas

- **Dimensionar `keys_zone` correctamente**: 1MB de memoria compartida contiene aproximadamente 8,000 claves de cache. Para 100K items cacheados, asigna 13MB.
- **Usar `proxy_cache_lock`**: Previene cache stampede cuando muchas peticiones hit la misma clave no cacheada simultaneamente.
- **Habilitar `proxy_cache_use_stale`**: Sirve contenido stale durante fallos del backend, mejorando resiliencia.
- **Monitorear hit rate del cache**: Verifica headers `X-Cache-Status` o parsea access logs de Nginx.
- **Establecer `inactive` menor que `max_age`**: Remueve archivos accedidos infrecuentemente incluso si su TTL no ha expirado, manteniendo el uso de disco manejable.
- **No cachear respuestas autenticadas**: Usa `proxy_cache_bypass` con `$http_authorization` para saltar cache para usuarios logueados.

## Errores Comunes

- **Cachear POST/PUT/DELETE**: Solo GET y HEAD deberian cachearse. Usa `if ($request_method != GET)` para saltar otros.
- **Olvidar `proxy_cache_key`**: Sin una clave explicita, Nginx usa un default que puede no incluir query strings, causando cache hits incorrectos.
- **No manejar Set-Cookie**: Si el backend setea cookies, cachear la respuesta filtra la sesion de un usuario a otro. Usa `proxy_hide_header Set-Cookie`.
- **Zona de cache demasiado pequena**: Si `keys_zone` es undersized, Nginx evicta entradas prematuramente. Monitorea con `nginx -V` y estadisticas de cache.
- **Sin `proxy_cache_lock`**: Sin locking, un cache miss dispara N peticiones concurrentes al backend — el cache stampede.

## FAQ

**Cuanto espacio en disco usa el cache de Nginx?**

Hasta `max_size` por zona de cache. Nginx usa un proceso cache manager en background para remover archivos least recently used cuando el cache excede `max_size`.

**Puedo cachear respuestas HTTPS?**

Si. Nginx termina TLS y hace proxy al backend sobre HTTP. El cache funciona sobre la respuesta desencriptada — TLS es transparente para la capa de cache.

**Como purgo todo el cache?**

Elimina el contenido del directorio de cache: `rm -rf /var/cache/nginx/api/*`. Nginx reconstruira el cache en peticiones subsecuentes. Para purges dirigidos, usa la directiva `proxy_cache_purge`.

**Nginx cachea compresion (gzip)?**

Nginx cachea la respuesta no comprimida del backend y la comprime por peticion con `gzip on`. Para cachear respuestas comprimidas, habilita `gzip_proxied` y configura el backend para enviar contenido pre-comprimido.

**Que es microcaching?**

Una estrategia de caching con un TTL muy corto (1-5 segundos). Absorbe picos de trafico cacheando respuestas brevemente, reduciendo la carga del backend durante picos sin servir datos stale por mucho tiempo.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
