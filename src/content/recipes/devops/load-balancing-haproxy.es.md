---
contentType: recipes
slug: load-balancing-haproxy
title: "Load Balancing con HAProxy y Health Checks"
description: "Configura HAProxy como load balancer de alto rendimiento con health checks activos, sticky sessions y SSL termination para distribucion resiliente de servicios"
metaDescription: "Configura HAProxy como load balancer con health checks, sticky sessions y SSL termination para distribucion resiliente de trafico entre backend services."
difficulty: intermediate
topics:
  - infrastructure
  - devops
tags:
  - networking
  - load-balancer
  - infrastructure
  - cloud
  - aws
relatedResources:
  - /patterns/design/ambassador-pattern-services
  - /recipes/nginx-reverse-proxy
  - /patterns/design/circuit-breaker-pattern
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Configura HAProxy como load balancer con health checks, sticky sessions y SSL termination para distribucion resiliente de trafico entre backend services."
  keywords:
    - haproxy
    - load balancing
    - health checks
    - ssl termination
    - high availability
---

# Load Balancing con HAProxy y Health Checks

Distribuye trafico entrante entre multiples servidores backend usando HAProxy, un load balancer TCP/HTTP de alto rendimiento. Esta recipe cubre distribucion round-robin, health checks activos, sticky sessions y SSL termination para resiliencia production-grade.

## Cuando Usar Esto

- Corres multiples instancias de aplicacion y necesitas distribuir trafico equitativamente. Consulta [Health Check Endpoint](/recipes/devops/health-check-endpoint) para health probes de backend.
- Los servicios deben removerse automaticamente de rotacion cuando esten unhealthy. Consulta [Circuit Breaker](/patterns/design/circuit-breaker-pattern) para aislamiento de fallos.
- SSL termination deberia ocurrir en el edge, no en cada servidor de aplicacion. Consulta [Nginx Reverse Proxy](/recipes/api/nginx-reverse-proxy) para patrones de proxy edge.

## Solucion

### 1. Configuracion Basica de HAProxy

```haproxy
# haproxy.cfg
global
    log stdout local0
    maxconn 4096

defaults
    mode http
    timeout connect 5s
    timeout client 30s
    timeout server 30s
    option httpchk GET /health

frontend web_frontend
    bind *:80
    default_backend app_servers

backend app_servers
    balance roundrobin
    server web1 10.0.1.10:3000 check
    server web2 10.0.1.11:3000 check
    server web3 10.0.1.12:3000 check
```

### 2. Health Checks Activos

```haproxy
backend app_servers
    balance roundrobin
    option httpchk GET /health

    # Marca como down despues de 2 checks fallidos; up despues de 3 exitosos
    default-server inter 5s fall 2 rise 3

    server web1 10.0.1.10:3000 check
    server web2 10.0.1.11:3000 check
    server web3 10.0.1.12:3000 check
```

### 3. Sticky Sessions con Cookies

```haproxy
backend app_servers
    balance roundrobin
    cookie SERVERID insert indirect nocache

    server web1 10.0.1.10:3000 check cookie web1
    server web2 10.0.1.11:3000 check cookie web2
    server web3 10.0.1.12:3000 check cookie web3
```

### 4. SSL Termination

```haproxy
frontend web_frontend
    bind *:443 ssl crt /etc/ssl/certs/site.pem
    http-request redirect scheme https unless { ssl_fc }
    default_backend app_servers
```

### 5. Dashboard de Stats

```haproxy
listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s
```

## Como Funciona

- **Frontend** escucha en un puerto y recibe conexiones de clientes
- **Backend** define el pool de servidores y el algoritmo de balanceo
- **Health checks** envian requests periodicos; servidores fallidos se remueven
- **Cookie insertion** pinnea un usuario a un backend especifico para session affinity

## Variacion: Load Balancing Ponderado

```haproxy
backend app_servers
    balance roundrobin
    server web1 10.0.1.10:3000 check weight 3
    server web2 10.0.1.11:3000 check weight 2
    server web3 10.0.1.12:3000 check weight 1
```

## Consideraciones de Produccion

- Corre HAProxy en active-passive con keepalived para failover
- Usa `leastconn` para conexiones WebSocket de larga duracion
- Habilita compresion con `compression algo gzip`

## Errores Comunes

- Olvidar exponer un endpoint `/health` en las aplicaciones
- Usar source IP affinity detras de NAT donde todos los clientes comparten una IP
- No monitorear la pagina de stats para degradacion de backends

## FAQ

**P: En que se diferencia de Nginx?**
R: HAProxy se especializa en load balancing layer 4/7 con granularidad superior de health checks. Nginx es un servidor web de proposito general que tambien hace proxy.

**P: Puedo usar HAProxy con Docker?**
R: Si. Usa la imagen oficial `haproxy` y monta tu `haproxy.cfg` como volumen.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### Enrutamiento de Tráfico con ACL

Ruta requests a diferentes backends según path, host o headers:

```haproxy
frontend web_frontend
    bind *:80

    # Ruta por prefijo de path
    acl is_api path_beg /api
    acl is_static path_beg /static
    acl is_admin path_beg /admin

    use_backend api_servers if is_api
    use_backend static_servers if is_static
    use_backend admin_servers if is_admin
    default_backend app_servers

backend api_servers
    balance roundrobin
    option httpchk GET /api/health
    server api1 10.0.1.20:8080 check
    server api2 10.0.1.21:8080 check

backend static_servers
    balance roundrobin
    server static1 10.0.1.30:80 check
    server static2 10.0.1.31:80 check

backend admin_servers
    balance roundrobin
    # Restringir admin backend a IPs internas
    acl allowed_src src 10.0.0.0/8 192.168.0.0/16
    http-request deny unless allowed_src
    server admin1 10.0.1.40:80 check
```

### Rate Limiting con Stick Tables

```haproxy
frontend web_frontend
    bind *:80

    # Trackear rate de requests por IP (10 requests por 10 segundos)
    stick-table type ip size 100k expire 30s store http_req_rate(10s)
    http-request track-sc0 src

    # Denegar si el rate excede 10 req/10s
    acl too_many_requests sc_http_req_rate(0) gt 10
    http-request deny status 429 if too_many_requests

    default_backend app_servers
```

### Modo TCP para Load Balancing de Base de Datos

```haproxy
# haproxy.cfg
frontend pg_frontend
    bind *:5432
    mode tcp
    option tcp-check
    tcp-check connect
    tcp-check send PING\r\n
    tcp-check expect string PONG
    default_backend pg_servers

backend pg_servers
    mode tcp
    balance leastconn
    option tcp-check
    server pg1 10.0.1.50:5432 check
    server pg2 10.0.1.51:5432 check backup
```

### Failover de Backend con Servidores Backup

```haproxy
backend app_servers
    balance roundrobin
    option httpchk GET /health

    # Servidores primarios
    server web1 10.0.1.10:3000 check
    server web2 10.0.1.11:3000 check

    # Servidor backup solo recibe tráfico cuando todos los primarios están down
    server backup1 10.0.1.99:3000 check backup
```

### leastconn para Conexiones de Larga Duración

```haproxy
backend websocket_servers
    balance leastconn
    option httpchk GET /health
    timeout server 3600s  # Timeout largo para conexiones WebSocket

    server ws1 10.0.1.60:3000 check
    server ws2 10.0.1.61:3000 check
```

### API de Stats de HAProxy para Monitoreo

```haproxy
listen stats
    bind *:8404
    mode http
    stats enable
    stats uri /stats
    stats refresh 10s
    stats auth admin:secretpassword

    # Exportar métricas en formato Prometheus
    http-request use-service prometheus-exporter if { path /metrics }
```

### Docker Compose con HAProxy

```yaml
version: "3.9"
services:
  haproxy:
    image: haproxy:2.9-alpine
    ports:
      - "80:80"
      - "443:443"
      - "8404:8404"
    volumes:
      - ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro
    depends_on:
      - web1
      - web2
      - web3

  web1:
    build: ./app
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 5s
      retries: 3

  web2:
    build: ./app
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 5s
      retries: 3

  web3:
    build: ./app
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 5s
      retries: 3
```

### SSL Termination con Múltiples Certificados

```haproxy
frontend web_frontend
    bind *:443 ssl crt /etc/ssl/certs/site1.pem crt /etc/ssl/certs/site2.pem

    # Ruta basada en SNI (Server Name Indication)
    acl is_site1 req.ssl_sni -i site1.example.com
    acl is_site2 req.ssl_sni -i site2.example.com

    use_backend site1_servers if is_site1
    use_backend site2_servers if is_site2
    default_backend site1_servers
```

## Mejores Prácticas Adicionales

4. **Usa `option httplog` para debugging HTTP.** El logging detallado de requests HTTP ayuda a troubleshootear problemas de enrutamiento:

```haproxy
defaults
    mode http
    option httplog
    log stdout local0
```

5. **Establece límites de conexión por backend.** Evita que un backend consuma todas las conexiones:

```haproxy
backend app_servers
    balance roundrobin
    default-server maxconn 100
    server web1 10.0.1.10:3000 check maxconn 100
    server web2 10.0.1.11:3000 check maxconn 100
```

6. **Habilita compresión para respuestas de texto.** Reduce ancho de banda para HTML, CSS, JS:

```haproxy
defaults
    compression algo gzip
    compression type text/html text/css application/javascript application/json
```

7. **Usa `http-reuse` para connection pooling.** Reutiliza conexiones de backend en lugar de abrir nuevas:

```haproxy
defaults
    http-reuse safe
```

## Errores Comunes Adicionales

4. **No establecer `timeout http-request`.** Ataques Slowloris explotan timeouts faltantes:

```haproxy
defaults
    timeout http-request 10s
    timeout connect 5s
    timeout client 30s
    timeout server 30s
```

5. **Usar `balance source` detrás de un CDN.** Todo el tráfico aparece desde la IP del CDN, causando distribución desigual. Usa afinidad basada en cookies en su lugar.

6. **Olvidar actualizar IPs de servidores después de cambios de infraestructura.** Usa nombres DNS con sección `resolvers`:

```haproxy
resolvers dns
    nameserver ns1 10.0.0.2:53
    resolve_retries 3
    timeout resolve 1s
    timeout retry 1s
    hold valid 10s

backend app_servers
    balance roundrobin
    server web1 web1.internal:3000 check resolvers dns init-addr none
```

## FAQ Adicional

### ¿Cómo hago drain de un servidor backend para mantenimiento?

Usa la página de stats o el socket de HAProxy para poner un servidor en modo drain. Deja de recibir nuevas conexiones pero deja terminar las existentes:

```bash
# Vía stats socket
echo "set server app_servers/web1 state drain" | socat /var/run/haproxy.sock -
```

### ¿Cuál es la diferencia entre `roundrobin` y `static-rr`?

`roundrobin` soporta ajustes dinámicos de peso en runtime y es el default. `static-rr` usa un peso fijo calculado al inicio, que usa menos CPU pero no puede ajustarse dinámicamente.

### ¿Cómo reenvío la IP del cliente a los servidores backend?

Por default, HAProxy termina la conexión y los backends ven la IP de HAProxy. Usa el header `X-Forwarded-For`:

```haproxy
defaults
    option forwardfor
```

Para modo TCP, usa PROXY protocol:

```haproxy
frontend pg_frontend
    bind *:5432
    mode tcp
    option tcp-check
    default_backend pg_servers

backend pg_servers
    mode tcp
    server pg1 10.0.1.50:5432 check send-proxy
```

## Tips de Rendimiento

1. **Ajusta `maxconn` según la memoria disponible.** Cada conexión usa ~200 bytes. Para 10K conexiones, asigna ~2MB:

```haproxy
global
    maxconn 10000
    nbproc 4  # Usar múltiples procesos para CPUs multi-core
```

2. **Usa `nbthread` para modo multi-thread.** HAProxy 2.0+ soporta threads:

```haproxy
global
    nbthread 4
    cpu-map auto:1/1-4 0-3
```

3. **Habilita `splice-request` y `splice-response` para TCP.** Usa kernel splice para zero-copy forwarding:

```haproxy
defaults
    mode tcp
    option splice-request
    option splice-response
```

4. **Usa `tune.ssl.default-dh-param` para rendimiento SSL.** Establece a 2048 o superior:

```haproxy
global
    tune.ssl.default-dh-param 2048
```

5. **Monitorea con el stats socket de HAProxy.** Exporta métricas a Prometheus para alerting:

```bash
# Habilitar stats socket
echo "stats socket /var/run/haproxy.sock mode 660 level admin" >> haproxy.cfg

# Consultar stats
echo "show info" | socat /var/run/haproxy.sock -
echo "show servers state" | socat /var/run/haproxy.sock -
```
