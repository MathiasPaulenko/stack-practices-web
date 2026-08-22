---
contentType: recipes
slug: api-gateway
title: "Diseñar un API Gateway Escalable para Microservicios"
description: "Construí un gateway de API que enrute requests, maneje autenticación, rate limiting, caching y traducción de protocolos entre clientes y microservicios backend."
metaDescription: "Aprendé diseño de API gateway para microservicios. Enruta requests, maneja auth, rate limiting, caching y traducción de protocolos entre clientes y servicios."
difficulty: intermediate
topics:
  - architecture
  - api
tags:
  - architecture
  - api
  - api-gateway
  - microservices
  - authentication
  - rate-limiting
  - caching
  - routing
relatedResources:
  - /recipes/microservices-patterns
  - /recipes/load-balancing
  - /recipes/rate-limiting
  - /recipes/jwt-authentication
  - /recipes/circuit-breaker-pattern-recipe
  - /recipes/service-mesh
lastUpdated: "2026-08-22"
publishedAt: "2026-06-14"
author: Mathias Paulenko
seo:
  metaDescription: "Aprendé diseño de API gateway para microservicios. Enruta requests, maneja auth, rate limiting, caching y traducción de protocolos entre clientes y servicios."
  keywords:
    - api gateway
    - gateway microservicios
    - enrutamiento requests
    - patron gateway
    - caching api gateway
    - rate limiting
    - jwt
---

En una arquitectura de microservicios, los clientes pueden terminar hablando con decenas de
servicios distintos, cada uno con su propio endpoint, protocolo y reglas de auth. Exponer todo eso
directamente genera un desastre: cada cliente tiene que rastrear ubicaciones, manejar retries y
administrar tokens separados. Cuando un servicio se mueve o aparece uno nuevo, cada cliente necesita
una actualización.

Un API gateway se ubica al frente y se convierte en el único punto de entrada. Los clientes llaman a
una URL y el gateway reenvía el request al backend correcto. También maneja concerns cross-cutting —
autenticación, [rate limiting](/recipes/rate-limiting/), terminación SSL y transformación de
request/response — para que los servicios internos no tengan que hacerlo.

## Cuándo Usarlo

Un API gateway empieza a valer la pena cuando varios servicios backend están expuestos a clientes,
cuando auth y rate limiting necesitan centralizarse, o cuando distintos tipos de clientes como web,
mobile e IoT necesitan formas de API diferentes. También ayuda durante una migración de monolito a
microservicios porque permite mantener estable el contrato externo mientras cambia la topología
interna. Finalmente, es el lugar correcto para poner una API GraphQL por encima de microservicios
REST.

## Cuándo NO Usarlo

Un gateway es exceso para uno o dos servicios; un reverse proxy o load balancer simple maneja eso.
Saltearlo si el equipo no está listo para operarlo como infraestructura crítica con HA y monitoreo,
si la lógica de negocio se filtra al gateway, o si el proyecto es pequeño y el overhead operacional
no se justifica.

## Solución

### Kong Gateway (declarativo)

```yaml
# kong.yml
_format_version: "3.0"
services:
  - name: user-service
    url: http://users.internal:8080
    routes:
      - name: user-routes
        paths:
          - /api/v1/users
    plugins:
      - name: rate-limiting
        config:
          minute: 100
          policy: redis
      - name: jwt
        config:
          claims_to_verify:
            - exp
      - name: proxy-cache
        config:
          response_code:
            - 200
          request_method:
            - GET
          cache_ttl: 300
          strategy: memory

  - name: order-service
    url: http://orders.internal:8080
    routes:
      - name: order-routes
        paths:
          - /api/v1/orders
```

### Gateway custom en Node.js

```javascript
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const app = express();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
});
app.use('/api/', limiter);

app.use('/api/', (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

const services = {
  '/api/v1/users': 'http://users.internal:8080',
  '/api/v1/orders': 'http://orders.internal:8080',
};

Object.entries(services).forEach(([path, target]) => {
  app.use(path, createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { [`^${path}`]: '' },
    onProxyReq: (proxyReq, req) => {
      proxyReq.setHeader('X-User-Id', req.user.sub);
    },
  }));
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.listen(3000, () => console.log('Gateway running on port 3000'));
```

### Traefik con labels de Docker

```yaml
# docker-compose.yml
services:
  user-service:
    image: myregistry/user-service:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.user-service.rule=PathPrefix(`/api/v1/users`)"
      - "traefik.http.routers.user-service.entrypoints=websecure"
      - "traefik.http.services.user-service.loadbalancer.server.port=8080"
      - "traefik.http.middlewares.user-ratelimit.ratelimit.average=100"
      - "traefik.http.routers.user-service.middlewares=user-ratelimit"
```

### Apollo Router para GraphQL

```yaml
# router.yaml
supergraph:
  listen: 0.0.0.0:4000
  path: /
  introspection: true

telemetry:
  exporters:
    tracing:
      otlp:
        endpoint: http://otel-collector:4317
```

## Explicación

El enrutamiento de requests es el trabajo principal del gateway. Mapea paths entrantes a servicios
backend: `/api/v1/users` va al servicio de usuarios, y ese servicio puede moverse o escalar sin que
el cliente lo sepa.

Concerns como auth, rate limiting y caching pertenecen al borde. Resolverlos una vez allí evita
duplicar la misma lógica en cada microservicio.

Un gateway GraphQL puede disparar varios requests REST a microservicios y armar una sola respuesta
tipada para el cliente. Esa es la traducción de protocolos en la práctica.

La terminación SSL significa que el gateway maneja TLS para que los servicios internos usen HTTP
simple dentro de una red confiable.

## Variantes

| Tipo | Gestión | Ideal para | Compromiso |
| --- | --- | --- | --- |
| Self-hosted (Kong, Traefik) | Control total | On-prem, compliance | Overhead operacional |
| Managed (AWS, Azure, GCP) | Serverless | Cloud-native, escalar | Vendor lock-in, costo |
| Custom built | Flexibilidad máxima | Requisitos únicos | Costo de desarrollo |
| Service mesh (Istio ingress) | Kubernetes-native | Clusters K8s | Complejidad |

## Buenas Prácticas

- Implementá [circuit breakers](/recipes/circuit-breaker-pattern-recipe/) en el gateway para dejar
    de enviar tráfico a backends con fallos.
- Usá versionado en el path, como `/api/v1/users`, en vez de headers. Mantiene el routing explícito
    y las claves de caché simples.
- Centralizá observability: inyectá trace IDs en el borde y propagalos downstream.
- Descargá autenticación validando JWTs o API keys en el gateway y reenviá headers de contexto de
    usuario a los backends.
- Cacheá endpoints read-heavy en el borde, como catálogos de productos y datos de configuración.

## Errores Comunes

- Tratar al gateway como un servicio más y meter lógica de negocio. Dejá routing, auth y rate
    limiting en el borde; las reglas de negocio van en los servicios de dominio.
- Publicar sin timeouts ni reglas de retry. Definí timeouts por ruta y reintentá solo operaciones
    idempotentes.
- Correr una sola instancia del gateway. Usá al menos dos instancias detrás de un [load
    balancer](/recipes/load-balancing/) con health checks.
- Ignorar necesidades específicas de clientes. Las apps mobile suelen necesitar payloads más
    pequeños que las web, así que un gateway backend-for-frontend (BFF) puede valer la pena.

## Preguntas Frecuentes

### ¿Uso un API gateway o un service mesh?

Usá un gateway para tráfico north-south — clientes externos hacia el cluster. Usá un [service
mesh](/recipes/service-mesh/) para tráfico east-west — servicios hablando entre sí dentro del
cluster. Se complementan.

### ¿Cómo manejo GraphQL en un gateway?

Usá un gateway GraphQL como Apollo Router o Hasura. Cada microservicio expone un subgraph y el
gateway los une en un supergraph.

### ¿Agrega latencia un gateway?

Sí, pero generalmente solo 1–5 ms para un gateway bien afinado. Los beneficios — caching, connection
pooling y auth centralizado — suelen reducir la latencia total.

### ¿Cómo aseguro llamadas servicio a servicio detrás de un gateway?

El gateway valida tokens externos. Para llamadas internas, usá mTLS o tokens internos firmados.
Nunca confiés en headers de auth orientados al usuario para comunicación servicio a servicio.
