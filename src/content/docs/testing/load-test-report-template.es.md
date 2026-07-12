---


contentType: docs
slug: load-test-report-template
title: "Plantilla de Informe de Pruebas de Carga"
description: "Una plantilla estandarizada para documentar resultados de pruebas de carga y recomendaciones."
metaDescription: "Usa esta plantilla de informe de pruebas de carga para documentar benchmarks de rendimiento, cuellos de botella encontrados y recomendaciones accionables."
difficulty: beginner
topics:
  - testing
tags:
  - testing
  - load-testing
  - performance
  - template
  - report
relatedResources:
  - /recipes/load-testing-k6
  - /guides/cicd-pipeline-guide
  - /guides/test-driven-development-guide
  - /guides/testing-strategy-guide
  - /recipes/api-contract-testing
  - /docs/api-testing-strategy-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de informe de pruebas de carga para documentar benchmarks de rendimiento, cuellos de botella encontrados y recomendaciones accionables."
  keywords:
    - testing
    - pruebas-de-carga
    - rendimiento
    - plantilla
    - informe


---

## Visión General

Los informes de pruebas de carga comunican hallazgos de rendimiento a los interesados y rastrean mejoras a lo largo del tiempo. Sin un formato estándar, los equipos pierden tiempo reexplicando métricas y contexto. Esta plantilla proporciona una estructura consistente para documentar benchmarks, cuellos de botella y recomendaciones.

## Cuándo Usar


- For alternatives, see [Test Coverage Report Template](/es/docs/test-coverage-report-template/).

Usa este recurso cuando:
- Reportes resultados después de un ciclo programado de pruebas de carga
- Compartes hallazgos de rendimiento con product managers o ejecutivos
- Creas una línea base antes de un lanzamiento mayor o cambio de infraestructura

## Solución

```markdown
# Informe de Pruebas de Carga

## 1. Resumen Ejecutivo

| Campo | Valor |
|-------|-------|
| Aplicación / Servicio | `nombre` |
| Fecha de Prueba | `YYYY-MM-DD` |
| Entorno | `staging / producción-similar` |
| Herramienta Usada | `k6 / JMeter / Gatling / Locust` |
| Tester | `nombre` |
| Resultado General | `APROBADO / APROBADO con advertencias / REPROBADO` |

- **Objetivo**: Breve declaración de qué se probó y por qué.
- **Hallazgo Clave**: Resumen en una línea del resultado más importante.

## 2. Alcance de la Prueba

- **Endpoints probados**: Lista de URLs o flujos de usuario
- **Perfil de carga**: Usuarios concurrentes, ramp-up, duración, estado estable
- **Datos usados**: Conjuntos de datos realistas, datos de producción anonimizados o sintéticos

## 3. Resultados

### Rendimiento

| Métrica | Objetivo | Actual | Estado |
|---------|----------|--------|--------|
| Peticiones/seg | 1,000 | 1,150 | APROBADO |
| Transacciones/seg | 500 | 480 | APROBADO |

### Latencia (ms)

| Percentil | Objetivo | Actual | Estado |
|-----------|----------|--------|--------|
| p50 | < 100 | 85 | APROBADO |
| p95 | < 300 | 320 | ADVERTENCIA |
| p99 | < 500 | 680 | REPROBADO |

### Tasa de Error

| Métrica | Objetivo | Actual | Estado |
|---------|----------|--------|--------|
| HTTP 5xx | < 0.1% | 0.05% | APROBADO |
| Timeout | < 0.01% | 0.00% | APROBADO |

### Utilización de Recursos

| Recurso | Objetivo | Pico | Estado |
|---------|----------|------|--------|
| CPU | < 70% | 65% | APROBADO |
| Memoria | < 80% | 82% | ADVERTENCIA |
| Conexiones DB | < 80% | 78% | APROBADO |

## 4. Cuellos de Botella Identificados

1. **Cuello de botella**: La consulta X de la base de datos tarda 400ms bajo carga
   - **Impacto**: La latencia p99 excede el objetivo
   - **Evidencia**: Captura del query plan, enlace a trace de APM
   - **Recomendación**: Agregar índice compuesto en `(user_id, created_at)`

2. **Cuello de botella**: Agotamiento del pool de conexiones a 1,200 usuarios
   - **Impacto**: Picos de errores 503
   - **Evidencia**: Enlace a métricas del pool en dashboard
   - **Recomendación**: Aumentar tamaño del pool de 20 a 40

## 5. Acciones

| Prioridad | Acción | Responsable | Fecha Límite |
|-----------|--------|-------------|--------------|
| P0 | Agregar índice en DB para consulta X | @backend-team | 2026-06-28 |
| P1 | Aumentar pool de conexiones | @devops-team | 2026-06-25 |
| P2 | Evaluar capa de cache | @architect | 2026-07-05 |

## 6. Apéndices

- Enlace al repositorio del script de prueba
- Enlace a resultados brutos / exportaciones CSV
- Enlace a dashboards de APM (Grafana, Datadog)
- Enlace al runbook de incidentes si se requiere seguimiento
```

## Explicación

La plantilla separa el **resumen** (para ejecutivos), los **detalles** (para ingenieros) y las **acciones** (para planificación). El formato tabular hace que el estado de aprobado/reprobado sea fácil de escanear. Los cuellos de botella enlazan a evidencia para que los revisores puedan verificar las afirmaciones. Las acciones incluyen responsables y fechas para evitar que los hallazgos se olviden.


### Escenario Detallado: Prueba de Carga del Checkout de E-commerce

```text
Sistema: API de checkout de e-commerce
Herramienta: k6
Objetivo: Validar que el checkout maneja 500 usuarios concurrentes al pico

Script de prueba (k6):
  import http from "k6/http";
  import { check, sleep } from "k6";

  export const options = {
    stages: [
      { duration: "2m", target: 100 },
      { duration: "5m", target: 500 },
      { duration: "2m", target: 500 },
      { duration: "1m", target: 0 },
    ],
    thresholds: {
      http_req_duration: ["p(95)<300", "p(99)<500"],
      http_req_failed: ["rate<0.01"],
    },
  };

  export default function () {
    const res = http.post("https://staging.example.com/api/checkout",
      JSON.stringify({ cart_id: "cart_123", payment_method: "card" }),
      { headers: { "Content-Type": "application/json" } });
    check(res, {
      "status es 201": (r) => r.status === 201,
      "respuesta tiene order_id": (r) => r.json("order_id") !== undefined,
    });
    sleep(1);
  }

Ejecucion:
  $ k6 run --out json=results.json checkout_load.js

Resultados:
  - p50 latencia: 85ms (objetivo < 100ms) APROBADO
  - p95 latencia: 320ms (objetivo < 300ms) ADVERTENCIA
  - p99 latencia: 680ms (objetivo < 500ms) REPROBADO
  - Tasa de error: 0.05% (objetivo < 0.1%) APROBADO
  - Rendimiento: 1,150 req/s (objetivo 1,000) APROBADO

Cuello de botella encontrado:
  - Consulta DB en tabla order_items tarda 400ms bajo carga
  - Falta indice compuesto en (order_id, product_sku)
  - Pool de conexiones agotado a 1,200 usuarios concurrentes

Acciones:
  P0: Agregar indice en order_items(order_id, product_sku) - @backend
  P1: Aumentar pool de 20 a 40 - @devops
  P2: Agregar cache Redis para product lookups - @architect
```

### Que percentiles debo reportar?

Reporta p50 (mediana), p95 y p99 como minimo. p50 muestra la experiencia tipica. p95 detecta la mayoria de las degradaciones. p99 revela problemas de latencia de cola que afectan a usuarios reales. Si tienes SLOs en p99.9, incluyelo tambien. Nunca reportes solo promedios: ocultan los picos de latencia de cola.

### Como simulo comportamiento realista de usuarios en pruebas de carga?

Usa think time (pausas entre acciones) para coincidir con patrones reales de usuarios. Distribuye requests entre endpoints proporcionalmente al trafico de produccion. Incluye flujos de navegacion, busqueda y checkout, no solo el endpoint mas pesado. Parametriza los datos de prueba para que cada usuario virtual hittee registros diferentes y evitar que los cache hits sesguen los resultados.

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Pre-lanzamiento | Comparación de línea base | Incluir números del lanzamiento anterior lado a lado |
| Recuperación de incidente | Validación post-corrección | Enfocarse en la ruta específica que falló |
| Planificación de capacidad | Prueba de saturación | Documentar el punto de ruptura y el recurso limitante |

## Lo que funciona

1. Ejecutar pruebas en un entorno que refleje producción (hardware, tamaño de datos, red)
2. Calentar el sistema antes de registrar métricas para evitar sesgo de arranque en frío
3. Reportar percentiles (p50, p95, p99) en lugar de promedios para capturar latencia de cola
4. Incluir gráficos y enlaces a dashboards, no solo números estáticos
5. Adjuntar el script exacto de prueba para que sea reproducible

## Errores Comunes

1. Probar en laptops de desarrollo o entornos subdimensionados
2. Usar conjuntos de datos pequeños que ocultan el rendimiento de consultas del mundo real
3. Reportar solo latencia promedio, que oculta degradación del p99
4. Omitir tasas de error y enfocarse solo en rendimiento
5. No asignar responsables a las acciones, por lo que nada se corrige

## Preguntas Frecuentes

### ¿Cómo defino objetivos de latencia y rendimiento?

Los objetivos deben provenir de SLAs, requisitos de producto o líneas base históricas. Si no existen, usa el percentil 80 del tráfico actual de producción como punto de partida.

### ¿Debería ejecutar pruebas de carga contra producción?

Evita probar producción directamente. Usa un entorno similar a producción con volumen de datos e infraestructura comparable. Para endpoints de solo lectura, considera traffic mirroring o shadow testing.

### ¿Con qué frecuencia se deben repetir las pruebas de carga?

Antes de cada lanzamiento mayor, después de cambios mayores de infraestructura, y trimestralmente como verificación de regresión. Automatiza pruebas de humo nocturnas con carga pequeña para detectar regresiones temprano.


































































End of document. Review and update quarterly.