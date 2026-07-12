---
contentType: docs
slug: load-test-execution-plan-template
title: "Plantilla de Plan de Ejecucion de Pruebas de Carga"
description: "Una plantilla para planificar, ejecutar y documentar pruebas de carga que miden el comportamiento del sistema bajo trafico realista o pico."
metaDescription: "Planifica y ejecuta pruebas de carga con esta plantilla. Cubre objetivos, escenarios, metricas de linea base, criterios de exito, configuracion del entorno y remediacion."
difficulty: intermediate
topics:
  - performance
  - devops
tags:
  - load-testing
  - performance
  - jmeter
  - k6
  - observability
relatedResources:
  - /docs/devops/capacity-planning-forecast-template
  - /docs/devops/monitoring-alerting-policy-template
  - /docs/runbook-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Planifica y ejecuta pruebas de carga con esta plantilla. Cubre objetivos, escenarios, metricas de linea base, criterios de exito, configuracion del entorno y remediacion."
  keywords:
    - plantilla de plan de ejecucion de pruebas de carga
    - plan de pruebas de rendimiento
    - checklist de pruebas de carga
    - plantilla de escenario de prueba de carga
    - guia de pruebas de rendimiento
---

## Descripcion General

Las pruebas de carga evaluan como se comporta un sistema bajo trafico realista o de pico. Esta plantilla ayuda a los equipos a definir objetivos de prueba, seleccionar escenarios, preparar entornos, ejecutar pruebas y documentar resultados. Asegura que el trabajo de rendimiento sea repetible y vinculado a criterios de exito claros.

## Cuando Usar

- Antes de un lanzamiento de producto importante o campana de marketing.
- Despues de cambios mayores de arquitectura o infraestructura.
- Cuando cambian los objetivos de escalado o las proyecciones de crecimiento de usuarios.
- Cuando aparecen problemas de latencia o tasa de error bajo carga.
- Como parte de una suite regular de pruebas de regresion de rendimiento.
- Antes de la planificacion de capacidad o la optimizacion de costos.

## Prerequisitos

- Un entorno de prueba similar a produccion que refleje topologia y datos.
- Herramientas de pruebas de carga como k6, JMeter, Gatling o Locust.
- Monitoreo y observabilidad del sistema bajo prueba.
- Metricas de linea base del trafico normal de produccion.
- Dueno claro y una ventana de prueba programada.
- Un plan de rollback o escalado si la prueba revela problemas.

## Solucion

### Plantilla

#### 1. Objetivos y Alcance de la Prueba

| Campo | Descripcion | Ejemplo |
|-------|-------------|---------|
| ID de prueba | Identificador unico | `LT-2026-Q3-001` |
| Sistema bajo prueba | Aplicacion o servicio | `Checkout API` |
| Fecha de prueba | Cuando se ejecuta la prueba | `2026-06-27` |
| Dueno de la prueba | Ingeniero responsable de la ejecucion | `Equipo de rendimiento` |
| Stakeholders | Equipos a notificar | `SRE, backend, plataforma, producto` |
| Objetivo | Por que se ejecuta la prueba | `Validar que el checkout soporte 10x de trafico en el lanzamiento` |
| Alcance | Que se incluye | `Endpoints de API, base de datos, cache, cola` |
| Fuera de alcance | Que no se prueba | `Procesador de pagos, integraciones de terceros` |

#### 2. Escenarios de Prueba

| ID de Escenario | Descripcion | Endpoint / Flujo | Usuarios Virtuales | Ramp Up | Duracion | Think Time |
|-----------------|-------------|------------------|--------------------|---------|----------|------------|
| S01 | Navegar catalogo | `GET /products` | 500 | 2 min | 10 min | 1-3 s |
| S02 | Agregar al carrito | `POST /cart/items` | 300 | 2 min | 10 min | 1-3 s |
| S03 | Checkout | `POST /orders` | 200 | 2 min | 10 min | 2-5 s |
| S04 | Busqueda | `GET /search?q=...` | 400 | 2 min | 10 min | 1-2 s |
| S05 | Pico maximo | Todos los endpoints combinados | 2000 | 5 min | 15 min | 0-1 s |

#### 3. Criterios de Exito

| Metrica | Linea Base | Objetivo | No Debe Superar | Notas |
|---------|------------|----------|-----------------|-------|
| Latencia p50 | 45 ms | < 60 ms | 80 ms | Para respuestas de API |
| Latencia p95 | 120 ms | < 150 ms | 200 ms | Para respuestas de API |
| Latencia p99 | 300 ms | < 400 ms | 600 ms | Para respuestas de API |
| Tasa de error | 0.01% | < 0.1% | 0.5% | HTTP 5xx y timeouts |
| Throughput | 1000 RPS | > 2000 RPS | - | Ordenes por segundo |
| Uso de CPU | 40% | < 70% | 80% | Por nodo de aplicacion |
| Uso de memoria | 50% | < 70% | 85% | Por nodo de aplicacion |
| Conexiones de base de datos | 80 | < 150 | 200 | Conexiones activas |
| Profundidad de cola | 10 | < 50 | 100 | Jobs en segundo plano |

#### 4. Configuracion del Entorno

| Recurso | dev/test | production | Notas |
|---------|----------|------------|-------|
| Nodos de aplicacion | 2 | 6 | Mismo tamano de instancia |
| Load balancer | 1 | 2 | Misma configuracion |
| Base de datos | Instancia unica | Cluster Multi-AZ | Misma version mayor |
| Cache | 1 nodo | 3 nodos | Misma version del engine |
| Cola de mensajes | 1 nodo | 3 nodos | Misma configuracion |
| Generador de carga | 4 inyectores | N/A | Instancias cloud o contenedores |
| Red | VPC aislada | VPC de produccion | Reflejar latencia y topologia |
| Volumen de datos | 10% de produccion | Produccion completa | Usar datos anonimizados |

#### 5. Plan de Ejecucion

| Paso | Accion | Dueno | Tiempo |
|------|--------|-------|--------|
| 1 | Verificar entorno y monitoreo | SRE | T-30 min |
| 2 | Reiniciar entorno a estado conocido | SRE | T-20 min |
| 3 | Desplegar scripts de prueba y datos | Equipo de rendimiento | T-15 min |
| 4 | Ejecutar prueba de linea base con carga baja | Equipo de rendimiento | T-10 min |
| 5 | Ejecutar escenarios S01-S04 | Equipo de rendimiento | T0 |
| 6 | Ejecutar escenario de pico S05 | Equipo de rendimiento | T+15 min |
| 7 | Monitorear sistema y recolectar metricas | SRE | T+15 a T+30 min |
| 8 | Reducir carga gradualmente y detener la prueba | Equipo de rendimiento | T+30 min |
| 9 | Exportar resultados y logs | Equipo de rendimiento | T+35 min |
| 10 | Restaurar entorno | SRE | T+45 min |

#### 6. Resultados y Analisis

| Escenario | Max VUs | Pico RPS | Latencia p95 | Latencia p99 | Tasa de Error | CPU Prom | Memoria Prom | Resultado |
|-----------|---------|----------|--------------|--------------|---------------|----------|--------------|-----------|
| S01 | 500 | 1200 | 55 ms | 180 ms | 0.01% | 45% | 60% | Aprobado |
| S02 | 300 | 800 | 90 ms | 250 ms | 0.02% | 55% | 65% | Aprobado |
| S03 | 200 | 450 | 140 ms | 380 ms | 0.05% | 60% | 70% | Aprobado |
| S04 | 400 | 950 | 70 ms | 210 ms | 0.01% | 50% | 62% | Aprobado |
| S05 | 2000 | 3400 | 220 ms | 700 ms | 0.8% | 85% | 88% | Fallido |

#### 7. Hallazgos y Remediacion

| ID de Hallazgo | Descripcion | Severidad | Recomendacion | Dueno | Fecha Limite |
|----------------|-------------|-----------|---------------|-------|--------------|
| LT-001 | Pool de conexiones de base de datos agotado durante el pico | Alta | Aumentar tamano del pool y agregar reintentos de conexion | Equipo backend | 2026-07-04 |
| LT-002 | Tasa de aciertos de cache cae bajo carga de busqueda | Media | Agregar cache de resultados de busqueda y ajustar TTL | Equipo backend | 2026-07-11 |
| LT-003 | Profundidad de cola crece cuando la tasa de ordenes excede la capacidad del consumidor | Media | Escalar workers de segundo plano horizontalmente | Equipo de plataforma | 2026-07-11 |

## Explicacion

Las pruebas de carga no solo tratan de encontrar el punto de ruptura. Se trata de entender como se degrada un sistema, donde estan los cuellos de botella y si la capacidad actual cumple con las expectativas de usuarios y negocio. Un plan de ejecucion documentado hace que las pruebas de rendimiento sean repetibles, comparables entre releases y útiles para los equipos de ingenieria.

## Ejemplo de Script de Load Test con k6

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const failureRate = new Rate('check_failure_rate');

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 300 },
    { duration: '5m', target: 300 },
    { duration: '2m', target: 500 },
    { duration: '5m', target: 500 },
    { duration: '2m', target: 2000 },
    { duration: '5m', target: 2000 },
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    check_failure_rate: ['rate<0.05'],
  },
};

export default function () {
  const correlationId = `corr_${__VU}_${__ITER}`;
  const headers = {
    'X-Correlation-Id': correlationId,
    'Content-Type': 'application/json',
  };

  const loginRes = http.post('https://api.example.com/auth/login', JSON.stringify({
    username: `user_${__VU % 100}`,
    password: 'test-password',
  }), { headers });

  check(loginRes, {
    'login status 200': (r) => r.status === 200,
    'login has token': (r) => r.json('token') !== undefined,
  });

  failureRate.add(!check(loginRes, {
    'login success': (r) => r.status === 200,
  }));

  sleep(Math.random() * 2 + 1);

  const listRes = http.get('https://api.example.com/orders', {
    headers: { ...headers, Authorization: `Bearer ${loginRes.json('token')}` },
  });

  check(listRes, {
    'orders status 200': (r) => r.status === 200,
    'orders has items': (r) => r.json('items').length > 0,
  });

  sleep(Math.random() * 3 + 1);
}
```


## Variantes

- **Plan de spike test**: Enfocado en rafagas repentinas de trafico y comportamiento de recuperacion.
- **Plan de stress test**: Empuja el sistema mas alla de los limites esperados para encontrar modos de falla.
- **Plan de endurance test**: Ejecuta carga moderada por horas o dias para detectar fugas de memoria o deriva.
- **Plan de soak test**: Prueba de larga duracion con carga similar a produccion para validar estabilidad.
- **Plan de scalability test**: Aumenta la carga mientras se agregan recursos para medir eficiencia de escalado.
- **Plan de prueba de carga basada en navegador**: Usa sesiones reales de navegador para medir rendimiento frontend y API juntos.

## Lo que funciona

- Prueba en un entorno similar a produccion con datos representativos y patrones de trafico reales.
- Define criterios de exito antes de ejecutar la prueba.
- Comienza con una linea base y aumenta la carga gradualmente.
- Monitorea tanto metricas de aplicacion como de infraestructura.
- Ejecuta las pruebas multiples veces para confirmar reproducibilidad.
- Incluye metricas de negocio como tasa de conversion o throughput de transacciones.
- Documenta hallazgos y asigna duenos antes de cerrar la prueba.
- Automatiza pruebas de regresion en CI/CD para caminos criticos.
- Coordina con el equipo para evitar impactar produccion o entornos compartidos.

## Errores Comunes

- Ejecutar pruebas de carga directamente contra produccion.
- Usar trafico sintetico que no coincide con el comportamiento real de usuarios.
- Probar solo un endpoint en lugar de la jornada completa del usuario.
- Ignorar cold start, warm-up de cache o efectos de seeding de base de datos.
- No involucrar al equipo de plataforma o SRE durante la ejecucion.
- Definir criterios de exito demasiado laxos o indefinidos.
- Ejecutar las pruebas una sola vez y no repetirlas despues de cambios.
- No correlacionar metricas de infraestructura con la latencia de aplicacion.

## FAQs

### Que herramientas se usan comúnmente para pruebas de carga?

Las herramientas populares incluyen k6, Apache JMeter, Gatling, Locust y Artillery. La eleccion depende del soporte de protocolos, lenguaje de scripting y necesidades de reportes.

### Como simulamos el comportamiento real de usuarios?

Usa logs de produccion para modelar patrones de request, agrega think time entre requests, varia los inputs de datos e incluye una mezcla de operaciones de lectura y escritura.

### Deberiamos ejecutar pruebas de carga en produccion?

Las pruebas de carga en produccion son riesgosas y generalmente solo se hacen con trafico sintetico, feature flags y aislamiento. Prefiere entornos dedicados similares a produccion para la mayoria de las pruebas de carga.


### Como correlacionamos resultados de load test con metricas de infraestructura?

Durante el test, captura metricas de infraestructura (CPU, memoria, red, disco I/O) junto con metricas de aplicacion (RPS, latencia, tasa de error). Usa un dashboard que superponga eventos de load test con metricas de infraestructura. Despues del test, analiza: que componente de infraestructura alcanzo su limite primero, si el bottleneck fue CPU, memoria, red o disco, si el auto-scaling se disparo y si fue suficientemente rapido, y si las conexiones de base de datos o la latencia de query fueron el bottleneck. Documenta el bottleneck y el cambio de infraestructura necesario para abordarlo.

### Cual es la diferencia entre spike, stress y endurance testing?

Spike testing: aumento repentino y extremo de trafico (ej., 10x normal por 30 segundos) para probar si el sistema sobrevive y se recupera. Stress testing: aumentar gradualmente la carga hasta que el sistema se rompa, para encontrar el modo de fallo y la capacidad maxima. Endurance testing: ejecutar carga moderada por horas o dias para detectar memory leaks, agotamiento de recursos o deriva de rendimiento. Cada tipo de test revela problemas diferentes. Ejecuta los tres como parte de una estrategia essential de performance testing.

### Como manejamos load testing para servicios con estado?

Los servicios con estado (bases de datos, colas de mensajes, caches) requieren consideraciones especiales de load testing. Usa volumenes de datos realistas — probar con 100 filas cuando produccion tiene 10 millones oculta problemas de rendimiento. Calienta caches antes de medir. Prueba con tamaños de connection pool realistas. Monitorea el lag de replicacion durante el test. Prueba escenarios de escritura pesada y lectura pesada separadamente. Para bases de datos, prueba con distribucion de datos similar a produccion (no datos aleatorios uniformes). Documenta el procedimiento de setup y teardown de datos para reproducibilidad.

### Que deberiamos hacer si el load test falla?

Si el load test falla: no re-ejecutes inmediatamente — analiza el fallo primero. Identifica que escenario fallo y que umbral fue superado. Revisa metricas de infraestructura para el bottleneck. Revisa logs de aplicacion para errores durante el test. Determina si el fallo es un problema real de rendimiento o un problema del entorno de test. Documenta el hallazgo con un plan de remediacion y responsable. Re-ejecuta el test despues del fix para confirmar la mejora. Nunca marques un load test fallido como aprobado sin remediacion.

### Con que frecuencia deberiamos ejecutar load tests?

Ejecuta load tests completos antes de cada release mayor (mensual o trimestral). Ejecuta load tests de regresion en CI para caminos criticos (cada PR o diario). Ejecuta endurance tests trimestralmente para detectar memory leaks. Ejecuta spike tests antes de eventos de trafico esperados (Black Friday, lanzamientos de productos, campanas de marketing). Re-ejecuta load tests despues de cambios significativos de infraestructura (nuevos tipos de instancia, upgrades de base de datos, cambios de arquitectura). Documenta el calendario de load tests en la estrategia de testing.
























End of document. Review and update quarterly.