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

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Pre-lanzamiento | Comparación de línea base | Incluir números del lanzamiento anterior lado a lado |
| Recuperación de incidente | Validación post-corrección | Enfocarse en la ruta específica que falló |
| Planificación de capacidad | Prueba de saturación | Documentar el punto de ruptura y el recurso limitante |

## Mejores Prácticas

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

Antes de cada lanzamiento mayor, después de cambios significativos de infraestructura, y trimestralmente como verificación de regresión. Automatiza pruebas de humo nocturnas con carga pequeña para detectar regresiones temprano.
