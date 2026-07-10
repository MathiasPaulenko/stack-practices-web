---
contentType: recipes
slug: nginx-reverse-proxy
title: "Configura Nginx como Reverse Proxy y API Gateway"
description: "Como usar Nginx como reverse proxy para servicios backend, implementar balanceo de carga, terminacion SSL y rate limiting para API gateways de produccion"
metaDescription: "Nginx reverse proxy y API gateway. Configura load balancing, SSL termination, rate limiting y routing basado en paths para servicios backend en produccion."
difficulty: intermediate
topics:
  - api
  - infrastructure
tags:
  - nginx
  - api-gateway
  - load-balancer
  - api
  - rest
relatedResources:
  - /recipes/performance/brotli-nginx-compression
  - /recipes/devops/terraform-aws-vpc
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Nginx reverse proxy y API gateway. Configura load balancing, SSL termination, rate limiting y routing basado en paths para servicios backend en produccion."
  keywords:
    - nginx reverse proxy
    - api gateway
    - load balancing
    - ssl termination
    - rate limiting
---

# Configura Nginx como Reverse Proxy y API Gateway

Nginx es un servidor web de alto rendimiento que destaca como reverse proxy y API gateway. Maneja terminacion SSL, balanceo de carga entre multiples backends, routing basado en paths y rate limiting — todo con minimo overhead de memoria y rendimiento predecible bajo alta concurrencia.

## Cuando Usar Esto

- Necesitas exponer multiples servicios backend a traves de un unico punto de entrada
- La terminacion SSL/TLS debe ocurrir en el edge, no en codigo de aplicacion. Consulta [Guía de Seguridad](/guides/security/security-best-practices-guide) para lo que funciona para TLS.
- Quieres agregar [rate limiting](/recipes/api/api-rate-limiting-redis), cacheo o reescritura de peticiones sin modificar backends

## Requisitos Previos

- Nginx 1.18+ instalado
- Servicios backend ejecutandose en puertos o hostnames conocidos

## Solucion

### 1. Reverse Proxy Basico

```nginx
# /etc/nginx/sites-available/api
server {
  listen 80;
  server_name api.example.com;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### 2. Routing Basado en Paths a Multiples Servicios

```nginx
# /etc/nginx/sites-available/gateway
server {
  listen 80;
  server_name gateway.example.com;

  # Servicio de usuarios
  location /api/users/ {
    proxy_pass http://user-service:8080/;
    proxy_set_header Host $host;
  }

  # Servicio de ordenes
  location /api/orders/ {
    proxy_pass http://order-service:8081/;
    proxy_set_header Host $host;
  }

  # Servicio de pagos
  location /api/payments/ {
    proxy_pass http://payment-service:8082/;
    proxy_set_header Host $host;
  }

  # Assets estaticos desde CDN
  location /assets/ {
    proxy_pass https://cdn.example.com/;
    proxy_cache_valid 200 1h;
  }
}
```

### 3. Balanceo de Carga con Health Checks

```nginx
# /etc/nginx/conf.d/upstreams.conf
upstream user_service {
  least_conn;

  server 10.0.1.10:8080 weight=5;
  server 10.0.1.11:8080 weight=5;
  server 10.0.1.12:8080 backup;

  keepalive 32;
}

server {
  location /api/users/ {
    proxy_pass http://user_service/;
    proxy_connect_timeout 5s;
    proxy_read_timeout 30s;
  }
}
```

### 4. Rate Limiting

```nginx
# /etc/nginx/conf.d/rate-limit.conf
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_conn_zone $binary_remote_addr zone=addr:10m;

server {
  location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    limit_conn addr 10;
    limit_req_status 429;

    proxy_pass http://backend/;
  }
}
```

### 5. Terminacion SSL con Let's Encrypt

```nginx
# /etc/nginx/sites-available/api-ssl
server {
  listen 80;
  server_name api.example.com;
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name api.example.com;

  ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
  ssl_prefer_server_ciphers on;

  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
  }
}
```

### 6. Cacheo de Respuestas

```nginx
# /etc/nginx/conf.d/cache.conf
proxy_cache_path /var/cache/nginx/api
  levels=1:2
  keys_zone=api_cache:10m
  max_size=1g
  inactive=60m
  use_temp_path=off;

server {
  location /api/public/ {
    proxy_cache api_cache;
    proxy_cache_key "$scheme$request_method$host$request_uri";
    proxy_cache_valid 200 10m;
    proxy_cache_valid 404 1m;
    proxy_cache_use_stale error timeout updating;
    add_header X-Cache-Status $upstream_cache_status;

    proxy_pass http://backend/;
  }

  # No cachear endpoints autenticados
  location /api/private/ {
    proxy_pass http://backend/;
    proxy_set_header Cache-Control "no-store";
  }
}
```

### 7. Proxy WebSocket

```nginx
# /etc/nginx/sites-available/ws
server {
  listen 80;
  server_name ws.example.com;

  location /socket.io/ {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
  }
}
```

### 8. Balanceo de Carga Ponderado con Fallback

```nginx
upstream api_backend {
  # Primario: 3 instancias con peso igual
  server 10.0.1.10:8080 weight=3;
  server 10.0.1.11:8080 weight=3;
  server 10.0.1.12:8080 weight=3;

  # Secundario: 2 instancias con peso menor para canary
  server 10.0.1.20:8080 weight=1;
  server 10.0.1.21:8080 weight=1;

  # Backup: solo se usa cuando todos los primarios fallan
  server 10.0.2.10:8080 backup;

  keepalive 64;
  keepalive_timeout 60s;
}

server {
  location /api/ {
    proxy_pass http://api_backend/;
    proxy_next_upstream error timeout http_502 http_503 http_504;
    proxy_next_upstream_tries 3;
    proxy_next_upstream_timeout 10s;
  }
}
```

### 9. Compresión con Brotli

```nginx
# Requiere el modulo ngx_brotli
brotli on;
brotli_comp_level 6;
brotli_types text/plain text/css application/json application/javascript
  text/xml application/xml application/xml+rss text/javascript;

server {
  location /api/ {
    proxy_pass http://backend/;
    brotli on;
    brotli_min_length 1024;
  }
}
```

## Variantes

| Feature | Nginx OSS | Nginx Plus | Traefik | Kong |
|---------|-----------|------------|---------|------|
| Balanceo de carga | Round-robin, least_conn, ip_hash | + Health checks activos, slow start | Round-robin, ponderado | Round-robin, hashing consistente |
| Terminacion SSL | Si | Si + rotacion de certificados | Si (ACME) | Si |
| Rate limiting | Modulo `limit_req` | Si | Si (middleware) | Si (plugins) |
| Service discovery | Upstreams estaticos | DNS + etcd | Docker, K8s, Consul | K8s, Consul |
| Dashboard | No | Si (dashboard en vivo) | Si (web UI) | Si (admin API) |
| Auth por API key | Lua custom / auth_request | Si | Si (middleware) | Si (plugins) |

## Como Funciona

1. **Reverse Proxy** reenvia peticiones de clientes a servicios backend
2. **Path Routing** mapea prefijos de URL a diferentes servicios upstream
3. **Load Balancing** distribuye trafico entre instancias backend saludables
4. **Rate Limiting** previene abuso usando algoritmos de token bucket
5. **SSL Termination** desencripta trafico HTTPS en el edge para eficiencia del backend

## Consideraciones de Produccion

- Habilita **HTTP/2** en el frontend para conexiones multiplexadas
- Usa conexiones **keepalive** a backends para reducir overhead de TCP
- Implementa **sticky sessions** solo cuando sea necesario; prefiere diseno stateless
- Monitorea **salud upstream** con checks activos o deteccion pasiva de fallos. Consulta [Logging y Auditoría de APIs](/recipes/api/api-logging-audit) para logging de health checks.
- Configura **access logs** con formato custom para capturar tiempo de respuesta upstream: `log_format upstream '$remote_addr - $request_time $upstream_response_time $status';`
- Usa **open file cache** para assets estaticos: `open_file_cache max=1000 inactive=20s; open_file_cache_valid 30s;`
- Configura **limites de body del cliente**: `client_max_body_size 10m;` para APIs que aceptan subida de archivos
- Habilita **gzip** para respuestas de texto: `gzip on; gzip_types application/json text/css;`
- Setea **server tokens off** para ocultar la version de Nginx de los headers de respuesta

## Errores Comunes

- No preservar headers `Host` y `X-Forwarded-*`, rompiendo routing de backend
- Usar balanceo `ip_hash` sin considerar clientes NATed
- Olvidar incrementar `worker_connections` para despliegues de alto trafico
- Setear `proxy_read_timeout` muy bajo para endpoints de long-polling o streaming
- No configurar `proxy_buffering off` para Server-Sent Events (SSE) — el buffering rompe el streaming en tiempo real
- Usar `proxy_pass` con slashes finales inconsistentes entre bloques location, causando duplicacion o truncamiento de paths
- No setear `client_max_body_size` para endpoints de subida de archivos, causando errores 413
- Olvidar recargar Nginx despues de cambios de config con `nginx -s reload`

## FAQ

**P: Deberia usar Nginx o un API gateway como Kong o Traefik?**
R: Nginx es suficiente para routing, SSL y rate limiting. Usa Kong o Traefik cuando necesites plugins, service discovery o capacidades nativas de Kubernetes.

**P: Como manejo conexiones WebSocket a traves de Nginx?**
R: Agrega `proxy_set_header Upgrade $http_upgrade;` y `proxy_set_header Connection "upgrade";` al bloque de location.

**P: Puede Nginx cachear respuestas de API?**
R: Si. Usa `proxy_cache` con cache keys basados en URL y headers de autorizacion. Se cauteloso con endpoints autenticados.

**P: Como ajusto los worker processes de Nginx para alto trafico?**
R: Setea `worker_processes auto;` para coincidir con los cores de CPU. Incrementa `worker_connections` (ej. 10240) para despliegues de alto trafico. Usa `worker_rlimit_nofile` para coincidir. Habilita `multi_accept on` para trafico burst. Monitorea con `nginx -T` y ajusta basado en metricas de conexiones.

**P: Cual es la diferencia entre `proxy_pass` con y sin slash final?**
R: Con slash final (`proxy_pass http://backend/;`), Nginx elimina el prefijo de location coincidido antes de reenviar. Sin el (`proxy_pass http://backend;`), el URI completo se reenvia. Esto es una fuente comun de bugs de routing — prueba cuidadosamente.

**P: Como implemento despliegues blue-green con Nginx?**
R: Usa dos bloques upstream (blue y green) y cambia el target de `proxy_pass`. O usa balanceo ponderado para desplazar trafico gradualmente: empieza con `weight=10` para blue y `weight=0` para green, luego incrementa green y decrementa blue. Usa `proxy_next_upstream` para manejar fallos durante el switch.

**P: Como bloqueo IPs o user agents especificos?**
R: Usa directivas `deny` y `allow` para bloqueo de IPs. Para user agents, usa `if` con `$http_user_agent` o bloqueo basado en map. Ejemplo: `deny 192.168.1.100;` dentro de un bloque location. Para bloqueo a gran escala, usa un map con un archivo de lista de IPs y `include`alo.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
