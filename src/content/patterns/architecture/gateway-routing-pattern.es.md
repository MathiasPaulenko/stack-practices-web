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
  - /patterns/health-endpoint-monitoring-pattern
  - /patterns/compute-resource-consolidation-pattern
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


- For alternatives, see [API Gateway Design: Resilience, Routing, and Security](/es/guides/api-gateway-design-guide/).

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

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.

## Soluciones Avanzadas

### Enrutamiento dinamico con descubrimiento de servicios

Integra el enrutamiento de gateway con descubrimiento de servicios para actualizaciones automaticas de upstream:

```typescript
import { ServiceRegistry } from './service-registry';
import { createProxyMiddleware } from 'http-proxy-middleware';

class DynamicGateway {
  private registry: ServiceRegistry;
  private app: express.Application;

  constructor(registry: ServiceRegistry) {
    this.registry = registry;
    this.app = express();
    this.setupRoutes();
  }

  async setupRoutes() {
    const services = await this.registry.getAllServices();
    
    services.forEach(service => {
      const targets = service.instances.map(
        instance => `${instance.host}:${instance.port}`
      );

      this.app.use(service.path, createProxyMiddleware({
        target: `http://${targets[0]}`,
        changeOrigin: true,
        router: (req) => {
          // Balancear carga entre instancias saludables
          const healthyInstances = service.instances.filter(i => i.healthy);
          const selected = healthyInstances[Math.floor(Math.random() * healthyInstances.length)];
          return `${selected.host}:${selected.port}`;
        },
        onProxyReq: (proxyReq, req, res) => {
          proxyReq.setHeader('X-Request-ID', req.id);
        },
        onError: (err, req, res) => {
          console.error(`Error de proxy: ${err.message}`);
          res.status(502).json({ error: 'Bad Gateway' });
        }
      }));
    });
  }

  listen(port: number) {
    this.app.listen(port, () => console.log(`Gateway escuchando en ${port}`));
  }
}
```

### Integracion de circuit breaker

Agrega el patron de circuit breaker para prevenir fallos en cascada:

```typescript
import CircuitBreaker from 'opossum';

const options = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
};

class CircuitBreakerGateway {
  private breakers: Map<string, any>;

  constructor() {
    this.breakers = new Map();
  }

  getBreaker(serviceName: string) {
    if (!this.breakers.has(serviceName)) {
      const breaker = new CircuitBreaker(
        async (url: string, options: RequestInit) => {
          const response = await fetch(url, options);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        },
        options
      );

      breaker.on('open', () => console.log(`Circuito abierto para ${serviceName}`));
      breaker.on('halfOpen', () => console.log(`Circulo medio-abierto para ${serviceName}`));
      breaker.on('close', () => console.log(`Circulo cerrado para ${serviceName}`));

      this.breakers.set(serviceName, breaker);
    }

    return this.breakers.get(serviceName);
  }

  async proxyRequest(serviceName: string, path: string, request: Request) {
    const breaker = this.getBreaker(serviceName);
    const serviceUrl = `http://${serviceName}:3001${path}`;
    
    return breaker.fire(serviceUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body
    });
  }
}
```

### Middleware de transformacion de solicitudes

Transforma solicitudes y respuestas en el gateway:

```typescript
class TransformGateway {
  private app: express.Application;

  constructor() {
    this.app = express();
    this.setupTransforms();
  }

  setupTransforms() {
    // Transformar encabezados de solicitud
    this.app.use('/api/v1', (req, res, next) => {
      req.headers['x-api-version'] = 'v1';
      req.headers['x-request-time'] = new Date().toISOString();
      next();
    });

    // Transformar formato de respuesta
    this.app.use('/api/v2', async (req, res, next) => {
      const originalJson = res.json;
      res.json = function(data) {
        const transformed = {
          meta: {
            version: 'v2',
            timestamp: new Date().toISOString()
          },
          data: data
        };
        originalJson.call(this, transformed);
      };
      next();
    });

    // Traduccion de protocolo (REST a gRPC)
    this.app.post('/grpc-proxy', async (req, res) => {
      const grpcClient = loadGrpcClient('users-service');
      const grpcRequest = mapRestToGrpc(req.body);
      
      try {
        const grpcResponse = await grpcClient.getUser(grpcRequest);
        const restResponse = mapGrpcToRest(grpcResponse);
        res.json(restResponse);
      } catch (error) {
        res.status(500).json({ error: 'Fallo de traduccion gRPC' });
      }
    });
  }
}
```

## Mejores Practicas Adicionales

1. **Implementa transformacion de solicitud/respuesta en el gateway.** Usa middleware para normalizar versiones de API, transformar formatos de datos y manejar traduccion de protocolos. Esto mantiene los servicios backend simples y consistentes.

2. **Usa enrutamiento ponderado para despliegues canary.** Enruta un porcentaje de trafico a una nueva version de un servicio para rollout gradual. Monitorea metricas y haz rollback automatico si los errores aumentan.

```yaml
# Configuracion de enrutamiento ponderado
routes:
  - path: /api/users
    upstreams:
      - service: users-service-v1
        weight: 90  # 90% del trafico
      - service: users-service-v2
        weight: 10  # 10% del trafico (canary)
```

3. **Implementa rate limiting por cliente.** Usa rate limiting basado en IP, clave de API o usuario para prevenir abuso. Almacena contadores de rate limit en Redis para gateways distribuidos.

## Errores Comunes Adicionales

1. **Crear un unico punto de falla.** El gateway se convierte en infraestructura critica. Despliega multiples instancias de gateway detras de un balanceador de carga con health checks para asegurar alta disponibilidad.

2. **Sobrecargar el gateway con logica de transformacion.** Las transformaciones complejas aumentan la latencia y dificultan el debugging. Mueve la logica de transformacion pesada a servicios BFF (Backend for Frontend) dedicados.

## FAQs Adicionales

### ¿Cómo manejo la autenticacion en el gateway?

Valida tokens JWT o claves de API en el gateway antes del enrutamiento. Extrae la identidad del usuario del token y pasala como encabezados a los servicios backend. Esto centraliza la logica de autenticacion y reduce la validacion duplicada.

### ¿Deberia el gateway manejar cache de respuestas?

Si, cachea respuestas GET para datos frecuentemente accedidos en el gateway. Usa encabezados de cache de los servicios backend para determinar la duracion del cache. Implementa invalidacion de cache para contenido dinamico usando webhooks o eventos pub/sub.

### ¿Cómo monitoreo el rendimiento del gateway?

Rastrea metricas de latencia de solicitud, tasas de error, salud de upstream y throughput. Usa trazabilidad distribuida para seguir solicitudes a traves de servicios. Configura alertas para tasas de error aumentadas o latencia para detectar problemas temprano.
