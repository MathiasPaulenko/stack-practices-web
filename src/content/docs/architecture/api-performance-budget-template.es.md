---



contentType: docs
slug: api-performance-budget-template
title: "Plantilla de Presupuesto de Rendimiento de API"
description: "Una plantilla para establecer y rastrear presupuestos de rendimiento de latencia y throughput para APIs."
metaDescription: "Usa esta plantilla de presupuesto de rendimiento de API para definir objetivos de latencia, límites de throughput y restricciones de recursos para diseño de APIs."
difficulty: intermediate
topics:
  - architecture
tags:
  - architecture
  - api
  - performance
  - budget
  - latency
  - template
relatedResources:
  - /docs/api-lifecycle-management-template
  - /docs/api-monitoring-alerting-template
  - /docs/microservice-contract-template
  - /docs/service-dependency-map-template
  - /docs/system-diagram-template
  - /docs/api-rate-limiting-policy-template
  - /guides/graphql-vs-rest-guide
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de presupuesto de rendimiento de API para definir objetivos de latencia, límites de throughput y restricciones de recursos para diseño de APIs."
  keywords:
    - arquitectura
    - api
    - rendimiento
    - presupuesto
    - latencia
    - plantilla



---
## Visión General

Cada endpoint de API consume recursos: CPU, memoria, conexiones de base de datos y ancho de banda de red. Sin presupuestos explícitos, los equipos agregan capacidades hasta que el sistema colapsa bajo carga. Esta plantilla define presupuestos de rendimiento como un contrato entre requisitos de producto y capacidad de infraestructura, haciendo explícitos los trade-offs antes de que se conviertan en caídas.

## Cuándo Usar


- For alternatives, see [GraphQL vs REST — When to Choose and How to Migrate](/es/guides/graphql-vs-rest-guide/).

Usa este recurso cuando:
- Diseñas una nueva API o agregas un nuevo endpoint a una existente
- Planificas capacidad para una campaña de marketing o pico de tráfico estacional
- Investigas por qué una API es lenta bajo carga

## Solución

```markdown
# Presupuesto de Rendimiento de API: `<Nombre de la API>`

## 1. Presupuestos por Endpoint

### 1.1. Presupuesto de Latencia (p95)

| Endpoint | Objetivo | Actual | Margen | Notas |
|----------|----------|--------|--------|-------|
| `GET /health` | < 10ms | 8ms | 2ms | No debe depender de DB |
| `GET /users/{id}` | < 100ms | 85ms | 15ms | Solo una query de DB permitida |
| `POST /orders` | < 250ms | 210ms | 40ms | Transacción multi-tabla |
| `GET /reports/aggregate` | < 2s | 1.8s | 200ms | Réplica de lectura permitida |

### 1.2. Presupuesto de Throughput

| Endpoint | RPS Objetivo | Burst Máximo | Pool de Conexiones | Notas |
|----------|--------------|--------------|--------------------|-------|
| `GET /products` | 5,000 | 10,000 | 50 | Cacheado en Redis |
| `POST /checkout` | 500 | 1,000 | 20 | Escritura DB, idempotente |

### 1.3. Presupuesto de Payload

| Dirección | Tamaño Máximo | Típico | Compresión |
|-----------|---------------|--------|------------|
| Request body | 1 MB | 10 KB | Gzip |
| Response body | 5 MB | 50 KB | Gzip + Brotli |
| Header total | 16 KB | 1 KB | Ninguna |

### 1.4. Presupuesto de Dependencias

| Dependencia | Contribución Máxima de Latencia | Llamadas Concurrentes Máximas | Fallback |
|-------------|-----------------------------------|-------------------------------|----------|
| PostgreSQL | 40ms | 20 | Réplica de lectura |
| Redis | 5ms | 100 | Saltear caché (más lento) |
| Payment Gateway | 200ms | 10 | Encolar para async |
| Search Service | 100ms | 50 | Query LIKE básica |

## 2. Presupuestos de Recursos

| Recurso | Línea Base | Margen | Máximo | Alertar En |
|---------|------------|--------|--------|------------|
| CPU / núcleo | 40% | 30% | 70% | 60% |
| Memoria / pod | 512 MB | 256 MB | 1 GB | 800 MB |
| Conexiones DB | 50 | 30 | 80 | 70 |
| Egress de red | 100 Mbps | 50 Mbps | 200 Mbps | 150 Mbps |

## 3. Aplicación de Presupuestos

- [ ] Aserciones de latencia en CI (fallar build si p95 excede presupuesto)
- [ ] Gates de load test en pipeline de despliegue
- [ ] Validación de tamaño de payload en API gateway
- [ ] Circuit breaker en llamadas a dependencias que excedan latencia máxima
- [ ] Autoscaling disparado al 60% de CPU, no al 80%

## 4. Cadencia de Revisión

| Disparador | Acción | Responsable |
|------------|--------|-------------|
| Semanal | Revisar dashboards por desviación sobre presupuesto | SRE |
| Mensual | Ajustar presupuestos basado en crecimiento de tráfico | Plataforma |
| Trimestral | Re-negociar presupuestos con equipo de producto | Engineering Lead |
| Incidente | Auditoría de presupuesto post-incidente | Incident Commander |
```

## Explicacion

Un **presupuesto de latencia** es una cadena: frontend (100ms) + red (50ms) + API (200ms) + base de datos (40ms) = 390ms total. Si cualquier eslabón excede su asignacion, toda la experiencia de usuario se degrada. La **columna de margen** existe porque el rendimiento del mundo real es ruidoso. Los **presupuestos de dependencias** evitan que un servicio downstream lento consuma todo el presupuesto de la API. Los presupuestos de throughput definen pools de conexiones y tamanos de caché. Los presupuestos de recursos evitan que un endpoint pesado limite recursos de otros en el mismo host.

## Ejemplo de Cadena de Presupuesto de Latencia

Cuando un usuario hace clic en "Realizar Pedido", la solicitud atraviesa multiples capas. Cada capa tiene su propio presupuesto:

```
Usuario hace clic (0ms)
  └─ Renderizado del navegador (50ms)
       └─ CDN edge (20ms)
            └─ API gateway (10ms)
                 └─ Servicio de pedidos (80ms)
                      ├─ PostgreSQL (30ms)
                      ├─ Pasarela de pago (150ms)
                      └─ Servicio de inventario (40ms)
                 └─ Serializacion de respuesta (5ms)
            └─ Retorno CDN edge (20ms)
       └─ Renderizado del navegador (50ms)
Total: ~455ms (dentro del presupuesto de 500ms)
```

Si la pasarela de pago tarda 300ms en lugar de 150ms, el total salta a 605ms y el presupuesto se excede. El presupuesto de dependencia para la pasarela (200ms max) detectaria esto como violacion antes que el presupuesto del endpoint.

## Aplicacion en CI con k6 Load Tests

Usa k6 para aplicar presupuestos de latencia en tu pipeline de CI:

```javascript
import http from "k6/http";
import { check, fail } from "k6/utils";

export let options = {
  stages: [
    { duration: "30s", target: 50 },
    { duration: "1m", target: 100 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: [
      { endpoint: "GET /health", p(95): 10 },
      { endpoint: "GET /users/{id}", p(95): 100 },
      { endpoint: "POST /orders", p(95): 250 },
    ],
  },
};

export default function () {
  const healthRes = http.get(`${__ENV.BASE_URL}/health`);
  check(healthRes, {
    "health p95 < 10ms": (r) => r.timings.duration < 10,
  });

  const userRes = http.get(`${__ENV.BASE_URL}/users/123`);
  check(userRes, {
    "busqueda de usuario p95 < 100ms": (r) => r.timings.duration < 100,
  });

  const orderRes = http.post(
    `${__ENV.BASE_URL}/orders`,
    JSON.stringify({ productId: 1, quantity: 2 }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(orderRes, {
    "creacion de pedido p95 < 250ms": (r) => r.timings.duration < 250,
  });
}
```

Ejecutar en CI con aplicacion de presupuesto:

```bash
k6 run --env BASE_URL=https://staging.example.com load-test.js
# Exit code 1 si cualquier threshold se viola, fallando el build de CI
```

## Monitoreo de Cumplimiento de Presupuesto con Prometheus

Rastrea violaciones de presupuesto en produccion con PromQL:

```promql
# Porcentaje de solicitudes dentro del presupuesto (por endpoint)
sum(rate(http_request_duration_seconds_bucket{le="0.1", endpoint="GET /users"}[5m]))
/
sum(rate(http_request_duration_seconds_count{endpoint="GET /users"}[5m]))
* 100

# Alertar cuando mas del 1% de solicitudes exceden el presupuesto
(
  sum(rate(http_request_duration_seconds_count{endpoint="GET /users"}[5m]))
  -
  sum(rate(http_request_duration_seconds_bucket{le="0.1", endpoint="GET /users"}[5m]))
)
/
sum(rate(http_request_duration_seconds_count{endpoint="GET /users"}[5m]))
> 0.01
```

## Dashboard de Seguimiento de Presupuesto

Crea un panel de dashboard en Grafana para cada endpoint mostrando:

1. **p95 de latencia actual** como un stat unico, coloreado verde/amarillo/rojo segun el presupuesto
2. **Tendencia de latencia** de los ultimos 7 dias con una linea horizontal en el umbral del presupuesto
3. **Tasa de violacion de presupuesto** como porcentaje de solicitudes que exceden el objetivo
4. **Throughput vs presupuesto** mostrando RPS actual contra el objetivo de RPS
5. **Desglose de latencia por dependencia** mostrando la contribucion de cada servicio upstream a la latencia total

JSON de dashboard para un panel de presupuesto de latencia:

```json
{
  "panels": [
    {
      "title": "GET /users - p95 Latencia vs Presupuesto",
      "type": "stat",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{endpoint=\"GET /users\"}[5m])) * 1000",
          "legendFormat": "p95 latencia (ms)"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "thresholds": {
            "steps": [
              { "value": null, "color": "green" },
              { "value": 80, "color": "yellow" },
              { "value": 100, "color": "red" }
            ]
          },
          "unit": "ms"
        }
      }
    }
  ]
}
```

Los umbrales verde/amarillo/rojo mapean directamente al presupuesto: verde esta dentro del 80% del presupuesto, amarillo es 80-100%, y rojo esta sobre el presupuesto.

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| GraphQL | Presupuesto de complejidad de query | Limitar costo total de campos por query, no solo profundidad |
| API de streaming | Throughput por shard | Presupuesto por particion, no global |
| SDK movil | Tamano de bundle + frecuencia de llamadas | Presupuesto incluye tamano de payload y numero de requests paralelos |
| gRPC | Propagacion de deadline por metodo | Usar context deadlines para aplicar presupuestos entre hops |

## Lo que funciona

1. Establecer presupuestos durante el diseno, no despues del lanzamiento
2. Incluir presupuestos en checklists de revision de diseno de API
3. Fallar builds de CI cuando tests de latencia excedan el presupuesto por cualquier margen
4. Reservar 20-30% de margen en cada presupuesto para picos de trafico
5. Documentar quien puede aprobar excepciones de presupuesto (usualmente el engineering lead)
6. Rastrear la tasa de quema del presupuesto, no solo valores actuales
7. Separar presupuestos de lectura y escritura ya que tienen perfiles de costo diferentes

## Errores Comunes

1. Basar presupuestos en condiciones de laboratorio en lugar de percentiles de produccion
2. Ignorar latencia de dependencias al calcular presupuestos de endpoint
3. Establecer un presupuesto global para todos los endpoints sin importar criticidad
4. Tratar los presupuestos como decisiones unicas en lugar de documentos vivos
5. No hacer cumplir presupuestos en CI o gates de despliegue
6. No contabilizar cold starts en arquitecturas serverless
7. Establecer presupuestos sin input del equipo de producto, llevando a objetivos irreales

## Preguntas Frecuentes

### Que pasa cuando un endpoint excede su presupuesto?

Primero, optimiza: agrega caching, desnormaliza queries o pagina. Si el endpoint fundamentalmente necesita mas tiempo, escala al engineering lead quien puede aprobar un aumento de presupuesto o degradar el SLO. Nunca ignores violaciones de presupuesto silenciosamente.

### Como presupuesto para endpoints con patrones de trafico desconocidos?

Comienza con estimaciones conservadoras basadas en endpoints similares. Monitorea por 2 semanas despues del lanzamiento, luego ajusta. Usa feature flags para rampar trafico gradualmente y observar rendimiento real antes de comprometerte con un presupuesto.

### Deberian los presupuestos aplicar a endpoints batch / async?

Si, pero usa metricas diferentes. Para async, presupuesta profundidad de cola, tasa de procesamiento (items/segundo) y latencia end-to-end desde enqueue hasta completion. El throughput importa mas que el tiempo de respuesta para jobs batch.

### Como manejo violaciones de presupuesto durante un pico de trafico?

El autoscaling deberia dispararse antes del agotamiento del presupuesto (al 60% de CPU, no al 80%). Si el pico es inesperado, aumenta temporalmente el presupuesto y programa una revision post-incidente. Si el pico es esperado (campana, lanzamiento), pre-aprovisiona capacidad y eleva los presupuestos con anticipacion.

### Cual es la diferencia entre un presupuesto de rendimiento y un SLO?

Un SLO es un objetivo de confiabilidad acordado con consumidores (ej. 99.9% de solicitudes bajo 200ms). Un presupuesto de rendimiento es una restriccion interna de ingenieria que te ayuda a cumplir el SLO (ej. queries de base de datos bajo 40ms para que la API pueda mantenerse bajo 200ms). Los presupuestos son la descomposicion de los SLOs en asignaciones por capa.

### Deberia usar p95 o p99 para presupuestos de latencia?

Usa p95 para endpoints orientados al usuario donde la mayoria de la experiencia importa. Usa p99 para caminos criticos como pago y autenticacion donde cada solicitud cuenta. Usar p50 (mediana) oculta problemas de latencia de cola que afectan a usuarios reales.

### Con que frecuencia debo revisar y ajustar los presupuestos?

Revisar mensualmente para servicios de rapido crecimiento. Trimestralmente para servicios estables. Despues de cualquier incidente P1, auditar si el presupuesto era realista o necesita ajuste. Los presupuestos que nunca se actualizan son presupuestos que nunca se revisan.

### Como establezco un presupuesto de tamano de payload?

Mide el percentil 95 de tamanos de request y response en produccion. Establece el presupuesto en 2x el p95 para permitir margen. Aplica el presupuesto en el API gateway con un rechazo duro para payloads que excedan el limite. Para respuestas, usa paginacion y seleccion de campos para mantener los tamanos de payload dentro del presupuesto.

### Puedo tener presupuestos diferentes para el mismo endpoint en diferentes regiones?

Si. Los presupuestos de latencia deben contabilizar la distancia geografica. Un endpoint que sirve usuarios en Europa desde un data center en EE.UU. tendra mayor latencia que el mismo endpoint sirviendo usuarios de EE.UU. Establece presupuestos por region y considera edge caching o despliegues regionales para endpoints sensibles a latencia.

### Que herramientas debo usar para rastrear el cumplimiento del presupuesto?

Usa Prometheus para recoleccion de metricas, Grafana para dashboards, y k6 o Locust para load testing en CI. Para alertas de presupuesto, configura Prometheus alertmanager para notificar a on-call cuando la tasa de violacion de presupuesto exceda 1% en 5 minutos.
