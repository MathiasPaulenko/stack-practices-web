---
contentType: patterns
slug: gateway-routing-pattern
title: "Patron de Enrutamiento de Gateway"
description: "Enruta solicitudes a multiples servicios backend a traves de un unico punto de entrada que gestiona preocupaciones transversales."
metaDescription: "Enruta solicitudes a multiples servicios con el Patron de Enrutamiento de Gateway. Centraliza SSL, autenticacion, rate limiting y balanceo de carga."
difficulty: intermediate
category: architectural
topics:
  - architecture
  - infrastructure
  - api
tags:
  - gateway-routing
  - pattern
  - api-gateway
  - architecture
  - microservices
relatedResources:
  - /guides/api-gateway-design-guide
  - /patterns/anti-corruption-layer-pattern
  - /patterns/backend-for-frontend-pattern
  - /patterns/strangler-fig-pattern
  - /guides/rest-api-design-guide
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Enruta solicitudes a multiples servicios con el Patron de Enrutamiento de Gateway. Centraliza SSL, autenticacion, rate limiting y balanceo de carga."
  keywords:
    - patron de enrutamiento de gateway
    - gateway routing
    - api gateway
    - arquitectura de microservicios
    - enrutamiento de servicios
---
## Visión General

El Patron de Enrutamiento de Gateway coloca un unico punto de entrada frente a multiples servicios backend. En lugar de exponer cada servicio directamente a los clientes, el gateway recibe las solicitudes y las enruta al upstream adecuado segun la ruta, el metodo, los encabezados u otras reglas. Tambien centraliza preocupaciones transversales como la terminacion TLS, la autenticacion, el rate limiting y el registro.

Este patron es esencial para arquitecturas de microservicios y modulares donde deseas un contrato externo limpio mientras permites que los servicios internos evolucionen de forma independiente.

## Cuándo Usar

Usa este patron cuando:
- Tengas multiples servicios backend que los clientes deben alcanzar a traves de una sola direccion
- Necesites aplicar TLS, autenticacion o rate limiting en un solo lugar
- Quieras enrutar trafico por ruta URL, host o version de API sin cambiar clientes
- Estes migrando de un monolito a microservicios y necesites ocultar cambios internos
- Necesites componer respuestas de varios servicios o aplicar traduccion de protocolos

## Solución

```typescript
// Configuracion simplificada de rutas de gateway estilo Express
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

app.use('/users', createProxyMiddleware({
  target: 'http://users-service:3001',
  changeOrigin: true,
}));

app.use('/orders', createProxyMiddleware({
  target: 'http://orders-service:3002',
  changeOrigin: true,
}));

app.use('/inventory', createProxyMiddleware({
  target: 'http://inventory-service:3003',
  changeOrigin: true,
}));

app.listen(3000, () => console.log('Gateway escuchando en el puerto 3000'));
```

```yaml
# Ejemplo de enrutamiento basado en ubicaciones en NGINX
server {
  listen 443 ssl;
  server_name api.example.com;

  location /users {
    proxy_pass http://users-service;
  }

  location /orders {
    proxy_pass http://orders-service;
  }

  location /inventory {
    proxy_pass http://inventory-service;
  }
}
```

## Explicación

El Patron de Enrutamiento de Gateway funciona insertando un proxy inverso o gateway dedicado entre clientes y servicios. El gateway mantiene una tabla de enrutamiento que mapea caracteristicas de las solicitudes entrantes a destinos upstream. Cuando llega una solicitud, el gateway la compara con la tabla, aplica cualquier middleware y la reenvia. Las respuestas viajan de regreso a traves del gateway, que puede transformar encabezados o cachear resultados.

Responsabilidades clave del gateway:
- **Enrutamiento**: emparejar solicitudes con servicios segun ruta, host, encabezados o version
- **Balanceo de carga**: distribuir solicitudes entre instancias upstream saludables
- **Seguridad**: terminar TLS, validar tokens y aplicar rate limits
- **Observabilidad**: recolectar metricas y logs de todo el trafico

## Variantes

| Variante | Caso de Uso | Compromiso |
|----------|-------------|------------|
| **API Gateway** | Exponer APIs publicas a clientes externos | Centralizado pero puede convertirse en cuello de botella |
| **Backend for Frontend** | Adaptar APIs para web, movil o clientes socios | Agrega un servicio por tipo de cliente |
| **Edge Gateway** | Gestionar TLS, DDoS y cache en el borde de red | Simplifica origenes pero agrega dependencia de proveedor |
| **Gateway Interno** | Enrutar trafico dentro de un cluster con mTLS | Mantiene el trafico privado y seguro |

## Lo que Funciona

- Manten el gateway **sin estado** para que pueda escalar horizontalmente
- Almacena las reglas de enrutamiento en **configuracion** en lugar de codificarlas
- Usa **health checks** para evitar enrutar a servicios upstream fallidos
- **Descarga TLS** en el gateway para reducir la complejidad de certificados en los servicios
- Limita la logica del gateway a **preocupaciones transversales**; evita logica de negocio
- Registra IDs de solicitud y **IDs de correlacion** para trazabilidad distribuida

## Errores Comunes

- Colocar **logica de negocio** en el gateway, dificultando su mantenimiento
- Enrutar cada microservicio a traves de un unico gateway sin **escalarlo**
- Ignorar la configuracion de **timeout y reintentos**, causando fallos en cascada
- Olvidar **validar certificados TLS** en conexiones upstream
- Enrutar basandose en reglas fragiles como cadenas de consulta que cambian frecuentemente

## Preguntas Frecuentes

**P: Cual es la diferencia entre Gateway Routing y un API Gateway?**
R: Gateway Routing es la capacidad de enrutamiento. Un API Gateway suele agregar autenticacion, rate limiting, transformacion y portal de desarrolladores ademas del enrutamiento.

**P: Deberia el gateway manejar reintentos?**
R: El gateway puede reintentar solicitudes seguras e idempotentes, pero ten cuidado con reintentos en POST u otras operaciones que cambian estado para evitar trabajo duplicado.

**P: Puedo usar este patron con funciones serverless?**
R: Si. Las funciones pueden registrarse como destinos upstream y enrutarse por ruta o metodo HTTP, igual que los servicios en contenedores.
