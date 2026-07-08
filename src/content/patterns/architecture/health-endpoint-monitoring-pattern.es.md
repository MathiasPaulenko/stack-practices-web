---
contentType: patterns
slug: health-endpoint-monitoring-pattern
title: "Patron de Monitoreo de Endpoints de Salud"
description: "Expone endpoints de salud ligeros para que orquestadores, balanceadores de carga y herramientas de monitoreo verifiquen la disponibilidad del servicio."
metaDescription: "Verifica la salud del servicio con el Patron de Monitoreo de Endpoints de Salud. Expone probes para balanceadores, orquestadores y sistemas de alertas."
difficulty: beginner
category: architectural
topics:
  - architecture
  - observability
  - infrastructure
tags:
  - health-endpoint-monitoring
  - pattern
  - observability
  - microservices
  - health-check
relatedResources:
  - /patterns/gateway-routing-pattern
  - /patterns/anti-corruption-layer-pattern
  - /patterns/content-delivery-network-pattern
  - /guides/api-gateway-design-guide
  - /patterns/database-per-service-pattern
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Verifica la salud del servicio con el Patron de Monitoreo de Endpoints de Salud. Expone probes para balanceadores, orquestadores y sistemas de alertas."
  keywords:
    - monitoreo de endpoints de salud
    - health endpoint monitoring
    - observabilidad
    - microservicios
    - health check
---
## Visión General

El Patron de Monitoreo de Endpoints de Salud expone endpoints ligeros que reportan si un servicio esta vivo y listo para recibir trafico. Los balanceadores de carga, orquestadores de contenedores y herramientas de monitoreo pueden consultar estos endpoints para decidir si enrutar trafico hacia una instancia o reiniciarla.

Este patron es la base de los sistemas auto-curativos y es esencial para cualquier servicio que se ejecute en un entorno dinamico donde las instancias pueden fallar o reiniciarse en cualquier momento.

## Cuándo Usar

Usa este patron cuando:
- Ejecutes servicios en contenedores o detras de un balanceador de carga
- Quieras que un orquestador reinicie instancias no saludables automaticamente
- Necesites distinguir entre "el proceso esta corriendo" y "el servicio es usable"
- Quieras agregar health checks de dependencias sin modificar el codigo cliente
- Necesites mostrar datos de salud en un dashboard de monitoreo o sistema de alertas

## Solución

```javascript
// Endpoints de salud Express con probes de liveness y readiness
const express = require('express');
const app = express();

app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

app.get('/health/ready', async (req, res) => {
  const dbHealthy = await checkDatabaseConnection();
  const cacheHealthy = await checkCacheConnection();
  if (dbHealthy && cacheHealthy) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
});

app.listen(3000);
```

```yaml
# Probes de liveness y readiness en Kubernetes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  template:
    spec:
      containers:
      - name: api
        image: api:latest
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 15
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
```

## Explicación

Los endpoints de salud separan dos preocupaciones:
- **Liveness**: el proceso esta corriendo y no deberia reiniciarse. Si el liveness falla, el orquestador mata el contenedor e inicia uno nuevo.
- **Readiness**: el servicio esta listo para recibir trafico. Si el readiness falla, el balanceador deja de enviar solicitudes pero no reinicia la instancia.

Al verificar dependencias como bases de datos, caches y colas de mensajes, los probes de readiness evitan que el trafico llegue a una instancia que no puede atender solicitudes correctamente. Esto mejora la confiabilidad y reduce las tasas de error durante despliegues o interrupciones.

## Variantes

| Endpoint | Proposito | Respuesta |
|----------|-----------|-----------|
| **Liveness** | El proceso esta vivo? | `200` cuando corre, `500` en caso contrario |
| **Readiness** | Puede atender trafico? | `200` cuando las dependencias estan saludables, `503` en caso contrario |
| **Startup** | Ha terminado de iniciar? | `200` cuando la inicializacion completa |
| **Deep health** | Estado detallado de subsistemas | JSON con salud por dependencia |

## Lo que Funciona

- Manten el probe de **liveness** ligero y libre de dependencias
- Haz que el probe de **readiness** refleje la capacidad real de atender solicitudes
- Devuelve **codigos de estado consistentes** (`200` saludable, `503` no saludable)
- Evita operaciones pesadas en los health checks para prevenir falsos fallos
- Agrega **timeouts** y **presupuestos de reintentos** para verificaciones de dependencias
- Registra los fallos de health checks para debugging pero no satures los logs en cada llamada

## Errores Comunes

- Usar un unico endpoint que devuelve OK incluso cuando el servicio esta roto
- Hacer que los health checks dependan de **servicios externos** que no son criticos
- Devolver `500` para liveness, causando reinicios innecesarios
- Olvidar probar los readiness probes durante los despliegues
- Exponer endpoints de salud publicamente sin autenticacion o rate limiting

## Preguntas Frecuentes

**P: Deberia un probe de liveness verificar la base de datos?**
R: No. Liveness solo debe verificar que el proceso esta corriendo. Si la base de datos esta caida, deberia fallar el readiness probe, no el liveness.

**P: Que codigo de estado debe devolver un readiness probe cuando no esta saludable?**
R: Debe devolver `503 Service Unavailable`. Esto le indica al orquestador que deje de enrutar trafico sin reiniciar el contenedor.

**P: Puedo exponer endpoints de salud a internet publica?**
R: Solo si no filtran informacion sensible. Los endpoints de deep-health internos deben estar protegidos por politicas de red o autenticacion.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.

## Soluciones Avanzadas

### Endpoint de salud profundo con verificaciones de dependencias

Implementa un endpoint de salud comprehensivo que verifica todas las dependencias:

```javascript
const express = require('express');
const app = express();

const healthChecks = {
  database: async () => {
    try {
      await pool.query('SELECT 1');
      return { status: 'healthy', latency: Date.now() - start };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  },
  cache: async () => {
    try {
      await cache.ping();
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  },
  messageQueue: async () => {
    try {
      await channel.checkQueue();
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
};

app.get('/health/deep', async (req, res) => {
  const results = {};
  let overallHealthy = true;

  for (const [name, check] of Object.entries(healthChecks)) {
    try {
      const start = Date.now();
      const result = await check();
      results[name] = { ...result, checkTime: Date.now() - start };
      if (result.status !== 'healthy') {
        overallHealthy = false;
      }
    } catch (error) {
      results[name] = { status: 'error', error: error.message };
      overallHealthy = false;
    }
  }

  res.status(overallHealthy ? 200 : 503).json({
    status: overallHealthy ? 'healthy' : 'unhealthy',
    checks: results,
    timestamp: new Date().toISOString()
  });
});
```

### Probe de startup para servicios de inicializacion lenta

Usa un probe de startup para servicios que toman tiempo en inicializar:

```yaml
# Deployment de Kubernetes con probe de startup
apiVersion: apps/v1
kind: Deployment
metadata:
  name: slow-startup-service
spec:
  template:
    spec:
      containers:
      - name: app
        image: app:latest
        startupProbe:
          httpGet:
            path: /health/startup
            port: 3000
          initialDelaySeconds: 0
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 30  # Permitir hasta 5 minutos para iniciar
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 15
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
```

```javascript
// Endpoint de startup que devuelve exito solo despues de inicializacion
let isInitialized = false;

async function initialize() {
  // Realizar tareas de inicializacion lentas
  await loadConfiguration();
  await warmUpCache();
  await connectToExternalServices();
  isInitialized = true;
}

app.get('/health/startup', (req, res) => {
  if (isInitialized) {
    res.status(200).json({ status: 'initialized' });
  } else {
    res.status(503).json({ status: 'initializing' });
  }
});

// Iniciar inicializacion en background
initialize();
```

### Endpoint de salud con circuit breaker

Agrega el patron de circuit breaker para prevenir tormentas de health checks:

```javascript
class HealthCheckCircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'closed'; // closed, open, half-open
  }

  recordSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'open';
    }
  }

  shouldAllowCheck() {
    if (this.state === 'closed') return true;
    
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure > this.timeout) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }
    
    return true;
  }
}

const circuitBreaker = new HealthCheckCircuitBreaker();

app.get('/health/ready', async (req, res) => {
  if (!circuitBreaker.shouldAllowCheck()) {
    return res.status(503).json({ status: 'circuit open' });
  }

  try {
    const dbHealthy = await checkDatabaseConnection();
    const cacheHealthy = await checkCacheConnection();
    
    if (dbHealthy && cacheHealthy) {
      circuitBreaker.recordSuccess();
      res.status(200).json({ status: 'ready' });
    } else {
      circuitBreaker.recordFailure();
      res.status(503).json({ status: 'not ready' });
    }
  } catch (error) {
    circuitBreaker.recordFailure();
    res.status(503).json({ status: 'error', message: error.message });
  }
});
```

## Mejores Practicas Adicionales

1. **Agrega informacion de version a los endpoints de salud.** Incluye la version del servicio, timestamp de build y hash de commit en las respuestas de salud. Esto ayuda a identificar cual version esta desplegada y rastrear despliegues.

```javascript
app.get('/health/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    version: process.env.APP_VERSION || 'unknown',
    buildTime: process.env.BUILD_TIME || 'unknown',
    commitHash: process.env.COMMIT_HASH || 'unknown'
  });
});
```

2. **Implementa autenticacion de endpoints de salud.** Protege los endpoints de deep health con tokens de autenticacion o allowlists de IP. Esto previene acceso no autorizado a informacion sensible del sistema.

```javascript
const authMiddleware = (req, res, next) => {
  const token = req.headers['x-health-token'];
  if (token !== process.env.HEALTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.get('/health/deep', authMiddleware, async (req, res) => {
  // Implementacion de health check profundo
});
```

3. **Usa health checks para shutdown graceful.** Implementa un endpoint de shutdown que marca el servicio como no saludable, permitiendo que el balanceador de carga drene el trafico antes de que el proceso salga.

```javascript
let isShuttingDown = false;

app.post('/health/shutdown', (req, res) => {
  isShuttingDown = true;
  res.status(200).json({ status: 'shutting down' });
  
  // Dar tiempo al balanceador de carga para dejar de enviar trafico
  setTimeout(() => {
    process.exit(0);
  }, 10000);
});

app.get('/health/ready', (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({ status: 'shutting down' });
  }
  // Verificacion de readiness normal
});
```

## Errores Comunes Adicionales

1. **Hacer health checks muy costosos.** Los health checks que consultan bases de datos grandes o realizan operaciones complejas pueden causar degradacion de rendimiento. Manten los health checks rapidos (menos de 100ms) y ligeros.

2. **Olvidar manejar solicitudes concurrentes de health checks.** Multiples solicitudes de health check de balanceadores de carga pueden abrumar el servicio. Implementa rate limiting o cache para respuestas de health check.

## FAQs Adicionales

### ¿Con que frecuencia deben llamarse los health checks?

Configura los intervalos de health check basado en tus requisitos. Los intervalos tipicos son 5-10 segundos para probes de readiness y 15-30 segundos para probes de liveness. Chequeos mas frecuentes proporcionan deteccion mas rapida pero aumentan la carga.

### ¿Deberian los health checks devolver mensajes de error detallados?

Para endpoints de salud publicos, devuelve solo estado generico. Para endpoints de deep health internos, incluye mensajes de error detallados para ayudar al debugging. Nunca expongas informacion sensible en respuestas de salud publicas.

### ¿Cómo manejo health checks durante migraciones de base de datos?

Implementa un endpoint de estado de migracion que devuelve el estado de la migracion. Durante migraciones, el readiness probe puede verificar este endpoint y devolver not ready si las migraciones estan en progreso. Esto previene enrutar trafico a un servicio con cambios de schema incompatibles.
