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
lastUpdated: "2026-08-19"
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

## Resumen

En una arquitectura de microservicios, los clientes deben interactuar con muchos servicios
individuales, cada uno con su propio endpoint, protocolo y requisitos de autenticación. Exponerlos
directamente crea un acoplamiento frágil: los clientes deben conocer la ubicación de cada
servicio, manejar retries y gestionar tokens distintos.

Un API gateway resuelve esto actuando como único punto de entrada. Los clientes hablan con una
URL. El gateway enruta requests al backend correcto, maneja concerns cross-cutting como
autenticación, [rate limiting](/recipes/rate-limiting/), terminación SSL y transformación de
request/response. Protege a los clientes de la topología interna.

## Cuándo Usarlo

- Operás 5+ servicios backend a los que los clientes acceden directamente.
- Necesitás autenticación, rate limiting o logging centralizados para todas las APIs.
- Soportás múltiples tipos de clientes (web, mobile, IoT) con requisitos distintos.
- Migrás de un monolito a microservicios manteniendo un contrato externo estable.
- Necesitás traducción de protocolos entre clientes GraphQL y backends REST.

## Cuándo NO Usarlo

- Tenés uno o dos servicios — un reverse proxy o load balancer simple alcanza.
- No estás listo para manejar modos de fallo del gateway y alta disponibilidad.
- La lógica de negocio se filtra al gateway en vez de quedar en los servicios de dominio.
- El proyecto es pequeño y el overhead operacional no se justifica.

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

- **Enrutamiento de requests**: el gateway mapea paths entrantes a servicios backend.
  `/api/v1/users` va al servicio de usuarios. Los backends pueden moverse sin actualizar
  clientes.
- **Concerns cross-cutting**: auth, rate limiting y caching se implementan una vez en el borde en
  vez de duplicarse en cada servicio.
- **Traducción de protocolos**: un gateway GraphQL dispara múltiples requests REST a
  microservicios y arma una sola respuesta tipada para el cliente.
- **Terminación SSL**: el gateway maneja TLS para que los servicios internos usen HTTP simple
  dentro de una red confiable.

## Variantes

|Tipo|Gestión|Ideal para|Compromiso|
|----|-------|----------|----------|
|Self-hosted (Kong, Traefik)|Control total|On-prem, compliance|Overhead operacional|
|Managed (AWS, Azure, GCP)|Serverless|Cloud-native, escalar|Vendor lock-in, costo|
|Custom built|Flexibilidad máxima|Requisitos únicos|Costo de desarrollo|
|Service mesh (Istio ingress)|Kubernetes-native|Clusters K8s|Complejidad|

## Buenas Prácticas

- Implementá [circuit breakers](/recipes/circuit-breaker-pattern-recipe/) en el gateway para
  dejar de enviar requests a backends con fallos.
- Usá versionado en el path (`/api/v1/users`) en vez de headers. Hace el routing explícito y
  simplifica las claves de caché.
- Centralizá observability: inyectá trace IDs en el borde y propagalos downstream.
- Descargá autenticación: validá JWTs o API keys en el gateway y reenviá headers de contexto de
  usuario a los backends.
- Cacheá endpoints read-heavy en el borde, como catálogos de productos y datos de configuración.

## Errores Comunes

- **Meter lógica de negocio en el gateway**. Dejá routing, auth y rate limiting en el borde; las
  reglas de negocio van en los servicios de dominio.
- **No tener timeouts ni retries**. Definí timeouts por ruta y reintentá solo operaciones
  idempotentes.
- **Punto único de fallo**. Corré varias instancias del gateway detrás de un [load
  balancer](/recipes/load-balancing/) con health checks.
- **Ignorar necesidades específicas de clientes**. Las apps mobile necesitan payloads más
  pequeños que las web. Considerá gateways backend-for-frontend (BFF).

## Preguntas Frecuentes

### ¿Uso un API gateway o un service mesh?

Usá un gateway para tráfico north-south (clientes externos al cluster). Usá un [service
mesh](/recipes/service-mesh/) para tráfico east-west (servicio a servicio dentro del cluster). Son
complementarios.

### ¿Cómo manejo GraphQL en un gateway?

Usá un gateway GraphQL como Apollo Router o Hasura. Cada microservicio expone un subgraph y el
gateway los une en un supergraph.

### ¿Agrega latencia un gateway?

Sí, pero típicamente 1-5 ms para un gateway bien afinado. Los beneficios — caching, connection
pooling y auth centralizado — suelen reducir la latencia total.

### ¿Cómo aseguro llamadas servicio a servicio detrás de un gateway?

El gateway valida tokens externos. Para llamadas internas, usá mTLS o tokens internos firmados.
Nunca confiés en headers de auth orientados al usuario para comunicación interna.
