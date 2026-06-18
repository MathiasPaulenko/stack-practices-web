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
  - haproxy
relatedResources:
  - /patterns/design/ambassador-pattern-services
  - /recipes/devops/nginx-reverse-proxy
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

- Corres multiples instancias de aplicacion y necesitas distribuir trafico equitativamente
- Los servicios deben removerse automaticamente de rotacion cuando esten unhealthy
- SSL termination deberia ocurrir en el edge, no en cada servidor de aplicacion

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
