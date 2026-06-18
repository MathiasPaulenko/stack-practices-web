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
  - reverse-proxy
relatedResources:
  - /recipes/performance/brotli-nginx-compression
  - /recipes/devops/terraform-aws-vpc
  - /guides/api-design-guide
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
- La terminacion SSL/TLS debe ocurrir en el edge, no en codigo de aplicacion
- Quieres agregar rate limiting, cacheo o reescritura de peticiones sin modificar backends

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
- Monitorea **salud upstream** con checks activos o deteccion pasiva de fallos

## Errores Comunes

- No preservar headers `Host` y `X-Forwarded-*`, rompiendo routing de backend
- Usar balanceo `ip_hash` sin considerar clientes NATed
- Olvidar incrementar `worker_connections` para despliegues de alto trafico

## FAQ

**P: Deberia usar Nginx o un API gateway como Kong o Traefik?**
R: Nginx es suficiente para routing, SSL y rate limiting. Usa Kong o Traefik cuando necesites plugins, service discovery o features nativos de Kubernetes.

**P: Como manejo conexiones WebSocket a traves de Nginx?**
R: Agrega `proxy_set_header Upgrade $http_upgrade;` y `proxy_set_header Connection "upgrade";` al bloque de location.

**P: Puede Nginx cachear respuestas de API?**
R: Si. Usa `proxy_cache` con cache keys basados en URL y headers de autorizacion. Se cauteloso con endpoints autenticados.
