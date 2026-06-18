---
contentType: recipes
slug: load-testing-k6
title: "Testing de Carga de APIs con k6 y Aserciones Basadas en Umbrales"
description: "Como escribir y ejecutar tests de carga con k6 para medir rendimiento de APIs, validar SLOs e identificar cuellos de botella antes del despliegue a produccion"
metaDescription: "Testing de carga de APIs con k6. Mide rendimiento, valida SLOs con aserciones de umbrales e identifica cuellos de botella antes del despliegue a produccion."
difficulty: intermediate
topics:
  - testing
  - performance
tags:
  - benchmarks
  - testing
  - performance
  - api
relatedResources:
  - /recipes/load-testing
  - /recipes/integration-testing
  - /guides/testing-strategy-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Testing de carga de APIs con k6. Mide rendimiento, valida SLOs con aserciones de umbrales e identifica cuellos de botella antes del despliegue a produccion."
  keywords:
    - k6 load testing
    - api performance
    - load test
    - benchmarking
    - slo validation
---

# Testing de Carga de APIs con k6 y Aserciones Basadas en Umbrales

k6 es una herramienta moderna de testing de carga construida para desarrolladores. Usa JavaScript para scripting de tests y proporciona metricas integradas, aserciones de umbrales y escenarios modulares que te ayudan a validar requerimientos de rendimiento antes de que el codigo llegue a produccion.

## Cuando Usar Esto

- Necesitas verificar que las APIs cumplen SLOs de tiempo de respuesta y throughput
- Quieres simular patrones de trafico de usuarios realistas
- El testing de regresion debe detectar degradacion de rendimiento en CI/CD

## Requisitos Previos

- k6 instalado (`brew install k6` o descargar desde k6.io)
- Un endpoint de API ejecutandose para testear

## Solucion

### 1. Script Basico de Test de Carga

```javascript
// load-tests/basic.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 100 },   // Estado estable
    { duration: '2m', target: 200 },   // Spike
    { duration: '5m', target: 200 },   // Carga sostenida
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],    // 95% bajo 500ms
    http_req_failed: ['rate<0.01'],     // Tasa de error bajo 1%
  },
};

export default function () {
  const response = http.get('https://api.example.com/products');

  check(response, {
    'status es 200': (r) => r.status === 200,
    'tiempo de respuesta < 500ms': (r) => r.timings.duration < 500,
    'tiene array de productos': (r) => r.json().length > 0,
  });

  sleep(1);
}
```

### 2. Testing de API Autenticada

```javascript
// load-tests/authenticated.js
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://api.example.com';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;

export const options = {
  vus: 50,
  duration: '10m',
};

export default function () {
  const params = {
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  // Simular un flujo de usuario
  const cart = http.post(`${BASE_URL}/cart`, JSON.stringify({ items: [1, 2, 3] }), params);
  check(cart, { 'carrito creado': (r) => r.status === 201 });

  const checkout = http.post(`${BASE_URL}/checkout`, JSON.stringify({ cartId: cart.json('id') }), params);
  check(checkout, {
    'checkout exitoso': (r) => r.status === 200,
    'orden confirmada': (r) => r.json('status') === 'confirmed',
  });
}
```

### 3. Ejecutar Tests e Interpretar Resultados

```bash
# Ejecutar test de carga basico
k6 run load-tests/basic.js

# Ejecutar con variables de entorno
k6 run --env BASE_URL=https://staging.example.com --env AUTH_TOKEN=token123 load-tests/authenticated.js

# Output a InfluxDB para dashboards de Grafana
k6 run --out influxdb=http://localhost:8086/k6 load-tests/basic.js

# Ejecucion en cloud para carga distribuida
k6 cloud run load-tests/basic.js
```

### 4. Smoke Test para CI/CD

```javascript
// load-tests/smoke.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_duration: ['max<2000'],
    http_req_failed: ['rate===0'],
  },
};

export default function () {
  const endpoints = [
    '/health',
    '/products',
    '/users/me',
  ];

  for (const endpoint of endpoints) {
    const res = http.get(`https://api.example.com${endpoint}`);
    check(res, {
      [`${endpoint} es 200`]: (r) => r.status === 200,
    });
  }
}
```

## Como Funciona

1. **Virtual Users (VUs)** simulan clientes concurrentes haciendo peticiones
2. **Stages** definen patrones de ramp-up, carga sostenida y ramp-down
3. **Thresholds** aseguran que metricas cumplan SLOs; thresholds fallidos salen con estado no-cero
4. **Checks** validan correccion funcional bajo carga

## Consideraciones de Produccion

- Ejecuta smoke tests en cada pull request para detectar regresiones basicas
- Programa soak tests (ejecuciones de horas) para encontrar memory leaks
- Usa ambientes separados para testing de carga; nunca testees produccion directamente
- Correlaciona metricas de k6 con herramientas APM (Datadog, New Relic) para analisis de root cause

## Errores Comunes

- Testear desde una sola maquina que se convierte en cuello de botella
- No calentar la aplicacion antes de medir rendimiento de estado estable
- Usar `sleep()` con intervalos aleatorios que no coinciden con think time de usuarios reales

## FAQ

**P: Cuantos VUs necesito para simular 10,000 usuarios reales?**
R: Depende de la frecuencia de peticiones. Si cada usuario hace una peticion cada 30 segundos, 50-100 VUs pueden simular 10,000 usuarios.

**P: Puede k6 testear conexiones WebSocket?**
R: Si, a traves del modulo experimental `k6/ws`, aunque herramientas dedicadas de WebSocket pueden ser mas apropiadas.

**P: Como manejo datos dinamicos en tests de carga?**
R: Usa `papaparse` para leer archivos CSV o genera datos randomizados con funciones `random` integradas.
