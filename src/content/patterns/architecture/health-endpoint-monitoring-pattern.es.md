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

## Mejores Prácticas

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
