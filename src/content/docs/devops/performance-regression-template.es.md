---
contentType: docs
slug: performance-regression-template
title: "Plantilla de Regresión de Rendimiento"
description: "Una plantilla para comparar benchmarks y crear planes de acción cuando el rendimiento se degrada."
metaDescription: "Plantilla de regresión de rendimiento para comparar benchmarks antes y después de releases, identificar degradaciones y crear planes de remediación accionables."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - performance
  - regression
  - benchmark
  - operations
  - template
relatedResources:
  - /docs/bug-triage-template
  - /docs/change-management-template
  - /docs/escalation-policy-template
  - /docs/patch-management-template
  - /docs/capacity-planning-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Plantilla de regresión de rendimiento para comparar benchmarks antes y después de releases, identificar degradaciones y crear planes de remediación accionables."
  keywords:
    - devops
    - rendimiento
    - regresión
    - benchmark
    - operaciones
    - plantilla
---
## Visión General

Las regresiones de rendimiento son invisibles hasta que son dolorosas. Un aumento del 20% en la latencia después de un release pasa desapercibido durante semanas, y de repente tu cliente más grande se va porque su integración de API expiró. Hacer benchmarking no es suficiente — necesitas una forma estructurada de comparar métricas antes/después, identificar causas raíz y decidir si hacer rollback o avanzar con el arreglo. Esta plantilla crea un proceso repetible para detectar, analizar y resolver regresiones de rendimiento.

## Cuándo Usar

Usa este recurso cuando:
- Tu pipeline de releases carece de puertas automáticas de rendimiento
- Un despliegue reciente degradó los tiempos de respuesta o aumentó el consumo de recursos
- Estás estableciendo presupuestos de rendimiento y necesitas una forma de hacerlos cumplir

## Solución

```markdown
# Reporte de Regresión de Rendimiento: `<Release / Feature>`

## 1. Resumen de la Regresión

| Campo | Valor |
|-------|-------|
| Release | `versión / commit` |
| Fecha Detectada | `AAAA-MM-DD` |
| Detectado Por | `Benchmark de CI / alerta de APM / reporte de cliente` |
| Severidad | `Crítica (> 50%) / Alta (> 20%) / Media (> 10%) / Baja (< 10%)` |
| Estado | `Investigando / Causa raíz identificada / Arreglo desplegado / Resuelta` |
| Responsable | `@nombre` |

## 2. Comparación de Benchmarks

### 2.1. Latencia

| Métrica | Línea Base | Actual | Delta | Umbral | ¿Excedido? |
|---------|------------|--------|-------|--------|------------|
| P50 | `X ms` | `Y ms` | `+Z%` | `+10%` | Sí / No |
| P95 | `X ms` | `Y ms` | `+Z%` | `+15%` | Sí / No |
| P99 | `X ms` | `Y ms` | `+Z%` | `+20%` | Sí / No |

### 2.2. Throughput

| Métrica | Línea Base | Actual | Delta | Umbral | ¿Excedido? |
|---------|------------|--------|-------|--------|------------|
| RPS | `X` | `Y` | `+/- Z%` | `-10%` | Sí / No |

### 2.3. Utilización de Recursos

| Métrica | Línea Base | Actual | Delta | Umbral | ¿Excedido? |
|---------|------------|--------|-------|--------|------------|
| CPU | `X%` | `Y%` | `+Z%` | `+20%` | Sí / No |
| Memoria | `X%` | `Y%` | `+Z%` | `+20%` | Sí / No |
| Disco I/O | `X MB/s` | `Y MB/s` | `+Z%` | `+30%` | Sí / No |

## 3. Análisis de Causa Raíz

| Hipótesis | Evidencia | ¿Validada? | Responsable |
|-----------|-----------|------------|-------------|
| | | | |

### Pasos de Diagnóstico Realizados

1. Correlacionar la regresión con el tiempo de despliegue
2. Revisar cambios de código en el diff del release
3. Revisar planes de consulta de la base de datos para nuevas queries o cambios de schema
4. Profilear CPU y memoria (flame graphs, heap dumps)
5. Revisar latencia de servicios downstream
6. Verificar cambios de infraestructura (tipo de instancia, eventos de escalamiento)
7. Revisar tasas de acierto de caché y patrones de evicción
8. Verificar jobs en segundo plano o procesos batch que coincidan con pico de tráfico

## 4. Plan de Acción

| Acción | Responsable | Fecha Límite | Estado |
|--------|-------------|--------------|--------|
| | | | |

### Decisión: ¿Rollback o Fix Forward?

| Criterio | Rollback | Fix Forward |
|----------|----------|-------------|
| Severidad | Crítica o Alta | Media o Baja |
| Tiempo para Arreglar | > 4 horas estimadas | < 2 horas estimadas |
| Riesgo de Rollback | Bajo (rollback probado) | Alto (migración irreversible) |
| Impacto a Clientes | > 5% de usuarios afectados | < 5% de usuarios afectados |
| **Decisión** | [ ] | [ ] |

## 5. Verificación Después del Arreglo

- [ ] Re-ejecución de benchmark muestra métricas dentro del 5% de la línea base
- [ ] Dashboards de APM muestran tendencia estable por 24 horas
- [ ] No hay nuevas alertas disparadas post-despliegue
- [ ] Tests sintéticos orientados al cliente pasan
- [ ] Utilización de recursos regresó a la línea base
- [ ] Revisión post-arreglo documentada en tracker de incidentes
```

## Explicación

La plantilla fuerza una **decisión cuantificada** en lugar de una corazonada. Muchos equipos o hacen rollback a todo pánico o nunca hacen rollback y dejan que el rendimiento se degrade. Las tablas de comparación hacen visible la regresión con números, y la matriz de decisión rollback/fix-forward elimina la ambigüedad. Los pasos de diagnóstico están ordenados por frecuencia: la mayoría de las regresiones son causadas por una mala consulta, una caché faltante, o una lentitud downstream — no por problemas exóticos de infraestructura.

## Configuracion de Performance Gate en CI

```yaml
# GitHub Actions performance gate
name: Performance Regression Check
on:
  pull_request:
    branches: [main]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup environment
        run: |
          npm ci
          docker compose up -d test-db
      - name: Run benchmark suite
        run: npm run benchmark -- --output=results.json
      - name: Compare with baseline
        run: |
          node scripts/compare-baseline.js \
            --current results.json \
            --baseline baselines/main.json \
            --threshold 5 \
            --fail-on-regression
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: benchmark-results
          path: results.json
      - name: Comment on PR
        if: always()
        run: node scripts/pr-comment.js --results results.json
```

## Script de Comparacion de Benchmarks

```python
#!/usr/bin/env python3
"""Comparar resultados de benchmark actuales contra baseline."""
import json
import sys
import argparse

def compare(current_path, baseline_path, threshold_pct):
    with open(current_path) as f:
        current = json.load(f)
    with open(baseline_path) as f:
        baseline = json.load(f)

    regressions = []
    improvements = []

    for metric in baseline:
        name = metric['name']
        base_value = metric['value']
        curr = next((m for m in current if m['name'] == name), None)
        if not curr:
            continue
        change_pct = ((curr['value'] - base_value) / base_value) * 100
        if change_pct > threshold_pct:
            regressions.append({
                'name': name,
                'baseline': base_value,
                'current': curr['value'],
                'change': f'+{change_pct:.1f}%'
            })
        elif change_pct < -threshold_pct:
            improvements.append({
                'name': name,
                'baseline': base_value,
                'current': curr['value'],
                'change': f'{change_pct:.1f}%'
            })

    if regressions:
        print('REGRESIONES DETECTADAS:')
        for r in regressions:
            print(f"  {r['name']}: {r['baseline']} -> {r['current']} ({r['change']})")
        sys.exit(1)
    else:
        print('No se detectaron regresiones.')
        if improvements:
            print('Mejoras:')
            for i in improvements:
                print(f"  {i['name']}: {i['baseline']} -> {i['current']} ({i['change']})")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--current', required=True)
    parser.add_argument('--baseline', required=True)
    parser.add_argument('--threshold', type=float, default=5.0)
    args = parser.parse_args()
    compare(args.current, args.baseline, args.threshold)
```

## Arbol de Decision para Triage de Regresion de Rendimiento

```text
=== Triage de Regresion de Rendimiento ===

1. IDENTIFICAR ALCANCE (5 min)
   - Que endpoint/servicio regreso?
   - P50, P95 o P99 afectado?
   - Cuando empezo? (correlacionar con deploys)

2. REVISAR HISTORIAL DE DEPLOYS (10 min)
   - Hubo un deploy en las ultimas 24h?
   - La regresion empezo al momento del deploy?
   - SI -> Rollback o fix-forward. Ir al paso 4.
   - NO -> Continuar al paso 3.

3. REVISAR INFRAESTRUCTURA (15 min)
   - Base de datos: queries lentas? replication lag? connection pool?
   - Cache: hit rate bajo? evictions? memoria redis?
   - Red: latencia aumentada entre servicios? problemas DNS?
   - Disco: IOPS saturados? disco lleno?

4. DIAGNOSTICAR CAUSA RAIZ (30 min)
   - Codigo: queries N+1, indice faltante, loop sin limite
   - Config: cambio de pool size, timeout, cache TTL
   - Datos: tabla crecio mas alla de capacidad de indice, hot partition
   - Dependencia: servicio downstream mas lento, API rate limited

5. DECIDIR: ROLLBACK O FIX-FORWARD (5 min)
   - Rollback si: regresion > 20%, afecta usuario, fix desconocido
   - Fix-forward si: regresion < 10%, fix listo, bajo riesgo
   - Feature flag si: regresion vinculada a feature especifica

6. VERIFICAR FIX (continuo)
   - Re-ejecutar benchmarks
   - Monitorear APM por 24h
   - Confirmar metricas vuelven a baseline
```


## Variantes

| Contexto | Métricas Clave | Consideración Especial |
|----------|----------------|------------------------|
| Web / API | P50, P95, P99 latencia; RPS; tasa de error | Enfocarse en percentiles orientados al usuario |
| Backend móvil | Latencia de API, tamaño de payload, impacto en batería | Considerar costos de transferencia de datos |
| Base de datos | Latencia de consulta, uso de pool de conexiones, lag de replicación | Cambios de planes de consulta después de migraciones |
| Batch / ETL | Duración de jobs, throughput, costo de recurso por registro | Costo por ejecución de job, no solo velocidad |
| Microservicios | Latencia entre servicios, disparos de circuit breaker, tormentas de reintentos | La sobrecarga de red domina |
| Frontend | Time to Interactive, Largest Contentful Paint, tamaño de bundle | Scores de Lighthouse + datos de RUM |

## Lo que funciona

1. Ejecuta benchmarks en CI para cada release; bloquea despliegues si la regresión supera el umbral
2. Establece métricas de línea base a partir de un período estable, no de un objetivo arbitrario
3. Profilea en producción, no solo localmente; los benchmarks locales a menudo engañan
4. Correlaciona regresiones con el tiempo de despliegue, no solo con "alguna vez la semana pasada"
5. Documenta el arreglo en el runbook; el mismo patrón de regresión suele repetirse

## Errores Comunes

1. Ignorar la latencia P99 y solo observar promedios; los promedios ocultan latencia de cola
2. Hacer benchmarking en aislamiento sin carga concurrente; las condiciones de carrera solo aparecen bajo tráfico
3. Culpar a la infraestructura antes de revisar cambios de código; la mayoría de las regresiones son código, no hardware
4. No establecer umbrales por adelantado; umbrales ad-hoc llevan a decisiones inconsistentes
5. No verificar después de un arreglo; el primer arreglo suele solo abordar parcialmente el problema

## Preguntas Frecuentes

### ¿Cómo establezco líneas base de rendimiento?

Recopila métricas durante un período conocido por ser estable (por ejemplo, las últimas 2 semanas sin incidentes ni releases mayores). Usa el percentil 95 de los picos diarios como tu línea base, no el promedio. Actualiza las líneas base trimestralmente a medida que cambian los patrones de tráfico. Almacena los datos de línea base en tu herramienta de APM o una base de datos de rendimiento dedicada para que sea consultable durante las regresiones.

### ¿Debería la regresión de rendimiento bloquear un release?

Sí, para regresiones Críticas y Altas. Para Medias, usa una advertencia que requiera aprobación de ingeniería. Para Bajas, registra y programa el arreglo en el siguiente sprint. El umbral debe definirse antes del release, no debatirse durante el incidente. Si tu benchmark de CI es inestable, arregla el benchmark antes de usarlo como puerta.

### ¿Qué pasa si la regresión solo afecta a un pequeño subconjunto de usuarios?

Una regresión de subconjunto puede seguir siendo grave si afecta a clientes de alto valor o una característica crítica. Documenta el segmento afectado en el reporte. Si es un caso de uso de nicho, puedes avanzar con el arreglo. Si es un segmento de alto valor, considera un rollback dirigido o deshabilitar la feature flag. Nunca ignores una regresión solo porque es "solo el 1% de usuarios" sin entender quién es ese 1%.


### Como establecemos umbrales de regresion de rendimiento?

Establece umbrales basados en impacto al usuario, no porcentajes arbitrarios. Una regresion del 5% en un endpoint de 50ms es insignificante (2.5ms). Una regresion del 5% en un endpoint de 5s es notable (250ms). Usa umbrales escalonados: 10% para P50, 15% para P95, 20% para P99. Bloquea releases solo en regresiones de P95 y P99. Registra regresiones de P50 para seguimiento. Ajusta umbrales por servicio segun criticidad de negocio.

### Que herramientas deberiamos usar para benchmarking de rendimiento?

Para benchmarks de API: k6, Locust o Artillery. Para benchmarks de base de datos: pgbench (PostgreSQL), sysbench (MySQL). Para frontend: Lighthouse CI, WebPageTest. Para load testing: k6 con ejecucion distribuida. Integra benchmarks en CI usando GitHub Actions o Jenkins. Almacena resultados en una base de datos time-series (InfluxDB, Prometheus) para analisis de tendencias. Usa herramientas APM (Datadog, New Relic, Dynatrace) para monitoreo de rendimiento en produccion.

### Como manejamos benchmarks inestables (flaky)?

Los benchmarks flaky erosionan la confianza en el performance gate. Reparalos: ejecutando benchmarks en entornos aislados (runners dedicados, sin recursos compartidos), calentando antes de medir, ejecutando multiples iteraciones y tomando la mediana, excluyendo outliers, y usando cooldown entre grupos de prueba. Si un benchmark es inherentemente flaky, aumenta el umbral o marcalo como informativo en lugar de bloqueante. Rastrea la tasa de flakiness y arregla benchmarks con > 5% de flakiness.

### Cual es la diferencia entre load testing y benchmarking de rendimiento?

Load testing mide el comportamiento del sistema bajo carga esperada y pico (ej. podemos manejar 10,000 RPS?). Benchmarking de rendimiento mide metricas especificas contra un baseline (ej. este cambio hizo la API 10% mas lenta?). Load testing trata sobre capacidad; benchmarking trata sobre regresion. Ejecuta load tests trimestralmente o antes de lanzamientos importantes. Ejecuta benchmarks en cada pipeline de CI. Ambos son necesarios pero sirven diferentes propositos.

### Como medimos regresiones de rendimiento frontend?

Rastrea Core Web Vitals: LCP (Largest Contentful Paint), INP (Interaction to Next Paint), CLS (Cumulative Layout Shift). Usa Lighthouse CI en GitHub Actions para bloquear regresiones en estas metricas. Recopila datos de Real User Monitoring (RUM) desde produccion usando la libreria web-vitals. Establece umbrales: LCP < 2.5s, INP < 200ms, CLS < 0.1. Rastrea el tamano del bundle como indicador principal — un aumento de 50KB eventualmente causara regresion de LCP. Usa source maps para atribuir cambios de tamano de bundle a commits especificos.
