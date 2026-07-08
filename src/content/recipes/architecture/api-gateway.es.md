---
contentType: recipes
slug: api-gateway
title: "Diseñar un API Gateway Escalable para Microservicios"
description: "Cómo construir un gateway de API que enrute requests, maneje autenticación, rate limiting, caching y traducción de protocolos entre clientes y microservicios backend."
metaDescription: "Aprende diseño de API gateway para microservicios. Enruta requests, maneja auth, rate limiting, caching y traducción de protocolos entre clientes y servicios."
difficulty: intermediate
topics:
  - architecture
tags:
  - architecture
  - api-gateway
  - authentication
  - design
  - patterns
relatedResources:
  - /recipes/microservices-patterns
  - /recipes/load-balancing
  - /recipes/rate-limiting
  - /recipes/jwt-authentication
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende diseño de API gateway para microservicios. Enruta requests, maneja auth, rate limiting, caching y traducción de protocolos entre clientes y servicios."
  keywords:
    - api gateway
    - gateway microservicios
    - enrutamiento requests
    - patron gateway
    - caching api gateway
---

## Visión general

En una arquitectura de microservicios, los clientes deben interactuar con docenas de servicios individuales — cada uno con su propio endpoint, protocolo y requisitos de autenticación. Exponerlos directamente crea un acoplamiento frágil: una app mobile debe conocer la ubicación de cada servicio, manejar retries a través de múltiples conexiones, y gestionar tokens de auth distintos. Cuando los servicios se agregan, remueven o reubican, cada cliente debe actualizarse.

Un API gateway resuelve esto actuando como un único punto de entrada. Los clientes hablan con una URL. El gateway enruta requests al servicio backend apropiado, maneja concerns cross-cutting como autenticación, rate limiting, terminación SSL y transformación de request/response. Protege a los clientes de la complejidad de la topología interna. Lo siguiente cubre patrones de gateway, estrategias de enrutamiento e implementaciones usando Kong, AWS API Gateway y un gateway custom en Node.js.

## Cuándo usarlo

Usa esta receta cuando:

- Operando 5+ servicios backend que los clientes deben acceder directamente
- Necesitando [autenticación](/recipes/authentication/jwt-authentication), [rate limiting](/recipes/api/api-rate-limiting-redis) o logging centralizado en todas las APIs
- Soportando múltiples tipos de clientes (web, mobile, IoT) con diferentes requisitos de API
- Migrando de un monolito a microservicios manteniendo un contrato externo estable
- Requiriendo traducción de protocolos entre clientes GraphQL y backends REST

## Solución

### Configuración de Kong Gateway (Declarativa)

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
          uri_param_names: []
          cookie_names: []
          key_claim_name: iss
          secret_is_base64: false
          claims_to_verify:
            - exp
      - name: proxy-cache
        config:
          response_code:
            - 200
          request_method:
            - GET
          content_type:
            - application/json
          cache_ttl: 300
          strategy: memory

  - name: order-service
    url: http://orders.internal:8080
    routes:
      - name: order-routes
        paths:
          - /api/v1/orders
    plugins:
      - name: rate-limiting
        config:
          minute: 60
      - name: request-transformer
        config:
          add:
            headers:
              - X-Request-Source:gateway
```

### AWS API Gateway con Lambda Authorizer (Terraform)

```hcl
resource "aws_api_gateway_rest_api" "api" {
  name = "microservices-gateway"
}

resource "aws_api_gateway_resource" "users" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "users"
}

resource "aws_api_gateway_method" "users_get" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.users.id
  http_method   = "GET"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.lambda_auth.id
}

resource "aws_api_gateway_authorizer" "lambda_auth" {
  name                   = "jwt-validator"
  rest_api_id            = aws_api_gateway_rest_api.api.id
  authorizer_uri         = aws_lambda_function.authorizer.invoke_arn
  identity_source        = "method.request.header.Authorization"
  type                   = "TOKEN"
}

resource "aws_api_gateway_integration" "users_integration" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.users.id
  http_method = aws_api_gateway_method.users_get.http_method
  type        = "HTTP_PROXY"
  uri         = "http://users.internal:8080/users"
  integration_http_method = "GET"
}
```

### Gateway Custom en Node.js

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
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.use('/api/', (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

const services = {
  '/api/v1/users': 'http://users.internal:8080',
  '/api/v1/orders': 'http://orders.internal:8080',
  '/api/v1/inventory': 'http://inventory.internal:8080',
};

Object.entries(services).forEach(([path, target]) => {
  app.use(path, createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { [`^${path}`]: '' },
    onProxyReq: (proxyReq, req) => {
      proxyReq.setHeader('X-User-Id', req.user.sub);
      proxyReq.setHeader('X-User-Roles', req.user.roles.join(','));
    },
  }));
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.listen(3000, () => console.log('Gateway running on port 3000'));
```

## Explicación

- **Enrutamiento de requests**: el gateway mapea paths de URL entrantes a servicios backend. `/api/v1/users` enruta al servicio de usuarios, `/api/v1/orders` al de órdenes. Esto desacopla clientes de ubicaciones de servicios — los backends pueden moverse sin actualizaciones de clientes.
- **Concerns cross-cutting**: auth, rate limiting, logging y caching se implementan una vez en la capa de gateway en lugar de duplicarse en cada servicio. Esto reduce repetición de código y asegura enforcement consistente de políticas.
- **Traducción de protocolos**: un gateway GraphQL puede agregar backends REST en un schema unificado. El gateway recibe una query GraphQL, dispara múltiples requests REST a microservicios, y ensambla la respuesta. Los clientes obtienen una API tipada única mientras los backends permanecen REST simples.
- **Terminación SSL**: el gateway maneja encriptación/desencriptación TLS. La comunicación servicio-a-servicio interna puede usar HTTP plano dentro de una VPC confiable, reduciendo overhead computacional y complejidad de gestión de certificados.

## Variantes

| Tipo | Gestión | Mejor para | Trade-off |
|------|---------|------------|-----------|
| Self-hosted (Kong, Traefik) | Control total | On-prem, compliance | Overhead operacional |
| Managed (AWS, Azure, GCP) | Serverless | Cloud-native, scaling | Vendor lock-in, costo |
| Custom built | Máxima flexibilidad | Requisitos únicos | Costo de desarrollo |
| Service mesh (Istio ingress) | Kubernetes-native | Clusters K8s | Complejidad |

## Lo que funciona

- **Implementa [circuit breakers](/recipes/circuit-breaker-pattern-recipe) en el gateway**: si un servicio backend está fallando, el gateway debería dejar de enviar requests y retornar una respuesta cacheada o 503. Esto previene fallos en cascada y da a servicios en dificultades tiempo para recuperarse.
- **Usa versionado de paths**: incluye la versión de API en el path (`/api/v1/users`) en lugar de headers. Esto hace el enrutamiento explícito, soporta múltiples versiones simultáneamente, y simplifica generación de cache keys.
- **Centraliza observabilidad**: el gateway es el lugar ideal para tracing distribuido, métricas y logging. Inyecta trace IDs en el edge y propágalos a todos los servicios downstream. Cada request fluye a través del gateway — usa esa visibilidad.
- **Descarga autenticación**: [valida JWTs](/recipes/authentication/jwt-authentication) o API keys en el gateway. Reenvía solo requests autenticadas con headers de contexto de usuario a los backends. Los servicios no deberían necesitar validar tokens ellos mismos, pero aún deben enforce autorización.
- **Cachea agresivamente en el edge**: endpoints de lectura intensiva como catálogos de productos, perfiles de usuario y datos de configuración deberían cachearse en el gateway con TTLs cortos. Esto reduce carga de backend y mejora tiempos de respuesta dramáticamente.

## Errores comunes

- **Poner lógica de negocio en el gateway**: el gateway debería enrutar, autenticar y rate limit — no calcular precios, aplicar descuentos o validar reglas de negocio. La lógica de negocio pertenece a servicios de dominio. Un gateway sobrecargado se convierte en un nuevo monolito.
- **Sin estrategia de timeout o retry**: reenviar requests sin budgets de timeout causa que threads se bloqueen indefinidamente cuando un backend es lento. Consulta [Lógica de Retry](/recipes/architecture/retry-backoff) para estrategias de backoff. Establece timeouts por-ruta e implementa retries con backoff solo para operaciones idempotentes.
- **Punto único de fallo**: una única instancia de gateway es un cuello de botella. Despliega múltiples instancias detrás de un [load balancer](/recipes/api/nginx-reverse-proxy) con health checks. Usa despliegues blue/green o canary para actualizaciones de gateway que prevengan downtime.
- **Ignorar necesidades específicas de clientes**: las apps mobile necesitan payloads más pequeños y menos round trips que las apps web. Implementa gateways backend-for-frontend (BFF) — uno optimizado para mobile, otro para web — en lugar de forzar a todos los clientes a través de una API genérica.

## Preguntas frecuentes

**P: ¿Debería usar un API gateway o un service mesh?**
R: Usa un gateway para tráfico north-south (clientes externos al cluster). Usa un service mesh para tráfico east-west (servicio-a-servicio dentro del cluster). Son complementarios. El gateway maneja ingress; el mesh maneja enrutamiento interno, mTLS y observabilidad.

**P: ¿Cómo manejo GraphQL en un gateway?**
R: Usa un gateway GraphQL (Apollo Router, Hasura) que componga subgraphs de múltiples servicios. Cada microservicio expone un subgraph GraphQL. El gateway los une en un supergraph y enruta queries al servicio apropiado.

**P: ¿Un gateway agrega latencia?**
R: Sí, pero típicamente 1-5ms para gateways bien tuneados. Los beneficios — caching, connection pooling, auth centralizado — usualmente reducen la latencia total. Un request que golpea un cache de gateway evita una llamada de 50ms a base de datos por completo.

**P: ¿Cómo aseguro llamadas servicio-a-servicio detrás de un gateway?**
R: El gateway valida tokens externos. Para llamadas internas, usa mTLS (service mesh) o tokens internos firmados. Nunca confíes en headers de auth orientados a usuarios para comunicación interna de servicios — un atacante que comprometa un servicio podría forjarlos.


### GraphQL Gateway con Apollo Router

```yaml
# router.yaml
supergraph:
  listen: 0.0.0.0:4000
  path: /
  introspection: true

sandbox:
  enabled: true

homepage:
  enabled: false

health_check:
  listen: 0.0.0.0:8088

telemetry:
  instrumentation:
    spans:
      mode: spec_compliant
  exporters:
    tracing:
      propagation: tracecontext
      otlp:
        endpoint: http://otel-collector:4317
        protocol: grpc
```

```typescript
// Subgraph: schema GraphQL del user-service
const userTypeDefs = gql`
  type User {
    id: ID!
    email: String!
    name: String!
    role: String!
  }

  type Query {
    user(id: ID!): User
    users(limit: Int = 20, offset: Int = 0): [User!]!
  }

  type Mutation {
    createUser(email: String!, name: String!): User!
  }
`;
```

```typescript
// Subgraph: schema GraphQL del order-service con referencia a User
const orderTypeDefs = gql`
  type Order {
    id: ID!
    userId: ID!
    total: Float!
    status: OrderStatus!
    user: User @provides(fields: "name")
  }

  enum OrderStatus {
    PENDING
    PAID
    SHIPPED
    DELIVERED
    CANCELLED
  }

  type Query {
    orders(userId: ID!): [Order!]!
    order(id: ID!): Order
  }

  extend type User @key(fields: "id") {
    id: ID! @external
    name: String @external
    orders: [Order!]!
  }
`;
```

### Patrón de Agregación de Requests (Node.js)

```typescript
import express from 'express';
import axios from 'axios';

const app = express();

interface ProductDetails {
  product: any;
  reviews: any[];
  inventory: any;
}

// Agregar múltiples llamadas backend en una sola respuesta
app.get('/api/v1/products/:id/details', async (req, res) => {
  const productId = req.params.id;

  try {
    const [productRes, reviewsRes, inventoryRes] = await Promise.all([
      axios.get(`http://products.internal:8080/products/${productId}`, {
        timeout: 2000,
        headers: { 'X-User-Id': req.user.sub },
      }),
      axios.get(`http://reviews.internal:8080/products/${productId}/reviews`, {
        timeout: 2000,
        headers: { 'X-User-Id': req.user.sub },
      }),
      axios.get(`http://inventory.internal:8080/products/${productId}/stock`, {
        timeout: 2000,
        headers: { 'X-User-Id': req.user.sub },
      }),
    ]);

    const details: ProductDetails = {
      product: productRes.data,
      reviews: reviewsRes.data,
      inventory: inventoryRes.data,
    };

    res.json(details);
  } catch (error) {
    // Degradación parcial: retornar lo que tengamos
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Product not found' });
    }
    // Si un servicio falla, retornar datos parciales
    const partial: any = {};
    try {
      partial.product = (await axios.get(
        `http://products.internal:8080/products/${productId}`,
        { timeout: 2000 }
      )).data;
    } catch {}
    try {
      partial.reviews = (await axios.get(
        `http://reviews.internal:8080/products/${productId}/reviews`,
        { timeout: 2000 }
      )).data;
    } catch { partial.reviews = []; }
    try {
      partial.inventory = (await axios.get(
        `http://inventory.internal:8080/products/${productId}/stock`,
        { timeout: 2000 }
      )).data;
    } catch { partial.inventory = { inStock: false, quantity: 0 }; }

    res.json({ ...partial, _degraded: true });
  }
});
```

### Configuración de Traefik Gateway

```yaml
# traefik.yml
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"
    http:
      tls:
        certResolver: letsencrypt

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@stackpractices.com
      storage: /acme.json
      httpChallenge:
        entryPoint: web

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: gateway

api:
  dashboard: true
  insecure: false

metrics:
  prometheus:
    addEntryPointsLabels: true
    addServicesLabels: true
    entryPoint: metrics
```

```yaml
# labels de servicio docker-compose para enrutamiento Traefik
services:
  user-service:
    image: myregistry/user-service:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.user-service.rule=PathPrefix(`/api/v1/users`)"
      - "traefik.http.routers.user-service.entrypoints=websecure"
      - "traefik.http.routers.user-service.tls.certresolver=letsencrypt"
      - "traefik.http.services.user-service.loadbalancer.server.port=8080"
      - "traefik.http.middlewares.user-ratelimit.ratelimit.average=100"
      - "traefik.http.middlewares.user-ratelimit.ratelimit.burst=50"
      - "traefik.http.routers.user-service.middlewares=user-ratelimit"
```

## Mejores Prácticas Adicionales

1. **Implementa transformación de request/response.** Diferentes clientes pueden necesitar diferentes formatos de respuesta. Usa el gateway para transformar respuestas — stripear campos para mobile, añadir campos calculados, o convertir XML a JSON:

```yaml
# Plugin response-transformer de Kong
plugins:
  - name: response-transformer
    config:
      add:
        json:
          - _source: gateway
          - _timestamp:$(time.utc())
      remove:
        json:
          - internal_id
          - debug_info
```

2. **Usa enrutamiento weighted para despliegues canary.** Enruta un porcentaje del tráfico a una nueva versión de un servicio para testing antes del rollout completo:

```yaml
# Enrutamiento weighted de Kong
services:
  - name: user-service-v1
    url: http://users-v1.internal:8080
    routes:
      - name: user-canary
        paths:
          - /api/v1/users
        hosts:
          - api.stackpractices.com
  - name: user-service-v2
    url: http://users-v2.internal:8080
    routes:
      - name: user-canary-v2
        paths:
          - /api/v1/users
        hosts:
          - api.stackpractices.com
        # 10% tráfico a v2 via upstream
```

3. **Añade headers de distributed tracing en el edge.** Genera un trace ID para cada request entrante y propágalo a todos los servicios downstream:

```javascript
const { trace, context } = require('@opentelemetry/api');
const tracer = trace.getTracer('api-gateway');

app.use('/api/', (req, res, next) => {
  const traceId = req.headers['traceparent'] || generateTraceId();
  const span = tracer.startSpan(`gateway:${req.path}`, {
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'trace.id': traceId,
    },
  });

  // Inyectar contexto de trace para downstream
  req.traceId = traceId;
  req.span = span;

  // Propagar a proxy requests
  app.use((req, res, next) => {
    if (req.span) {
      req.proxyHeaders = {
        'traceparent': req.traceId,
        'x-trace-id': req.traceId,
      };
    }
    next();
  });

  res.on('finish', () => {
    span.setAttribute('http.status_code', res.statusCode);
    span.end();
  });

  next();
});
```

## Errores Comunes Adicionales

1. **No configurar budgets de timeout por-ruta.** Diferentes endpoints tienen diferentes perfiles de latencia. Una búsqueda de productos puede necesitar 5 segundos, mientras un health check necesita 100ms. Configura timeouts por-ruta:

```javascript
const routeTimeouts = {
  '/api/v1/users/search': 5000,
  '/api/v1/users/:id': 500,
  '/api/v1/orders': 2000,
  '/api/v1/inventory/stock': 1000,
  '/health': 100,
};

app.use('/api/', (req, res, next) => {
  const timeout = matchRoute(req.path, routeTimeouts) || 3000;
  req.setTimeout(timeout, () => {
    res.status(504).json({ error: 'Gateway timeout' });
  });
  next();
});
```

2. **Exponer detalles de error internos.** Los servicios backend pueden retornar stack traces, IPs internas o errores de base de datos. El gateway debería sanitizar respuestas de error antes de retornar al cliente:

```javascript
app.use((err, req, res, next) => {
  // Loguear error completo internamente
  logger.error('Gateway error', { error: err, path: req.path });

  // Retornar error sanitizado al cliente
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({ error: 'Service unavailable' });
  }
  if (err.code === 'ETIMEDOUT') {
    return res.status(504).json({ error: 'Gateway timeout' });
  }

  res.status(500).json({ error: 'Internal server error' });
});
```

3. **No implementar estrategia de versionado de API.** Sin versionado, los breaking changes afectan a todos los clientes. Usa versionado por-path y soporta múltiples versiones simultáneamente:

```javascript
const versions = {
  v1: {
    '/users': 'http://users-v1.internal:8080',
    '/orders': 'http://orders-v1.internal:8080',
  },
  v2: {
    '/users': 'http://users-v2.internal:8080',
    '/orders': 'http://orders-v2.internal:8080',
  },
};

function resolveBackend(path) {
  const match = path.match(/^\/api\/(v\d+)(\/.*)$/);
  if (!match) return null;
  const [, version, route] = match;
  const backend = versions[version]?.[route.split('/')[1]];
  return backend ? { backend, path: route } : null;
}
```

## FAQ Adicional

### ¿Cómo testeo la configuración de API gateway?

Usa contract testing para verificar que el gateway enruta correctamente. Escribe tests de integración que envíen requests a través del gateway y verifiquen la respuesta. Para Kong, usa `kong config parse kong.yml` para validar la configuración. Para Traefik, usa `traefik check` para validar reglas. Para testing canary, usa feature flags o enrutamiento weighted para testear nuevas versiones con un pequeño porcentaje de tráfico. Para load testing, usa `wrk` o `k6` para generar tráfico a través del gateway y medir latencia, throughput y tasas de error. Para testing de failover, detén un servicio backend y verifica que el gateway retorna códigos de error apropiados o respuestas cacheadas.

### ¿Esta solución está lista para producción?

Sí. Kong se usa en producción por Yahoo, T-Mobile y SoulCycle para gestión de APIs. AWS API Gateway es usado por miles de clientes AWS incluyendo Airbnb y Samsung. Traefik se usa en producción por Docker, Containous y VMware. Apollo Router es usado por Netflix, Wayfair y Expedia para federación GraphQL. El patrón API gateway está documentado en el Microsoft Azure Architecture Center, la documentación de NGINX y el libro Building Microservices de Sam Newman.

### ¿Cuáles son las características de rendimiento?

Kong añade 1-3ms de latencia por request en hardware commodity. AWS API Gateway añade 5-20ms de latencia dependiendo de la región y tipo de integración. Traefik añade 0.5-2ms de latencia para enrutamiento Layer 7. Un gateway custom Node.js añade 2-5ms para auth, rate limiting y proxying. La agregación de requests con `Promise.all` añade la latencia de la llamada backend más lenta. El caching en el gateway reduce la latencia a menos de 1ms para cache hits. La terminación SSL añade 0.5-1ms para el TLS handshake (amortizado con session resumption). La federación GraphQL añade 5-15ms para query planning y subgraph fan-out. El gateway mismo debería manejar 10K-50K requests por segundo con tuning apropiado.

### ¿Cómo depuro problemas con este enfoque?

Para Kong, usa el admin API (`:8001`) para inspeccionar rutas, servicios y plugins. Revisa los logs de Kong para errores de plugins y timeouts de upstream. Para AWS API Gateway, usa CloudWatch Logs y X-Ray para tracing de requests. Para Traefik, usa el dashboard (`:8080`) para ver routers, servicios y middlewares. Para gateways custom, loguea cada request con trace ID, ruta, backend, latencia y código de estado. Usa distributed tracing (Jaeger, Zipkin, Honeycomb) para ver el path completo del request a través del gateway hacia los backends. Para issues de enrutamiento, verifica las reglas de path matching y condiciones de host. Para fallos de auth, verifica expiración de tokens y rotación de keys. Para errores 502/504, verifica salud del backend y configuración de timeout.
