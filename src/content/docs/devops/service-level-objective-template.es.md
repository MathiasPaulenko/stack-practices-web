---
contentType: docs
slug: service-level-objective-template
title: "Plantilla de Objetivos de Nivel de Servicio"
description: "Plantilla para definir SLOs, SLIs y presupuestos de error para la gestión confiable de servicios."
metaDescription: "Usa esta plantilla de SLO para definir objetivos de nivel de servicio, indicadores, presupuestos de error y paneles de seguimiento para tu equipo de ingeniería."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - slo
  - sli
  - error-budget
  - reliability
  - operations
  - template
relatedResources:
  - /docs/bug-triage-template
  - /docs/change-management-template
  - /docs/escalation-policy-template
  - /docs/on-call-runbook-template
  - /docs/patch-management-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de SLO para definir objetivos de nivel de servicio, indicadores, presupuestos de error y paneles de seguimiento para tu equipo de ingeniería."
  keywords:
    - devops
    - slo
    - sli
    - error-budget
    - reliability
    - operations
    - template
---
## Visión General

Los SLO separan el "teatro de disponibilidad" de la confiabilidad real. Un dashboard que muestra 99.9% de uptime no significa nada si tus usuarios experimentaron errores 500 durante el checkout porque la métrica promedió una interrupción de 10 minutos. Definir objetivos de nivel de servicio (SLOs), indicadores de nivel de servicio (SLIs) y presupuestos de error claros obliga a la ingeniería a ser honesta sobre qué significa "confiable" y cuánta falta de confiabilidad es aceptable antes de detener el trabajo de features.

## Cuándo Usar

Usa este recurso cuando:
- Estás estableciendo objetivos de confiabilidad para un nuevo servicio o API
- Tu equipo pasa cada sprint apagando incendios en lugar de entregar features
- Necesitas negociar SLAs con clientes y quieres un margen interno

## Solución

```markdown
# Definición de SLO: `<Servicio / API>`

## 1. Visión General del Servicio

| Campo | Valor |
|-------|-------|
| Servicio | `nombre` |
| Viajes Críticos del Usuario | `lista` |
| Stakeholders | `equipo, servicios dependientes, clientes` |
| Fecha de Revisión | `AAAA-MM-DD` |

## 2. Indicadores de Nivel de Servicio (SLIs)

| Nombre SLI | Métrica | Eventos Buenos | Eventos Malos | Ventana de Medición |
|------------|---------|----------------|---------------|---------------------|
| Disponibilidad | `peticiones exitosas / peticiones totales` | HTTP 2xx/3xx | HTTP 5xx, timeouts | 30 días rodante |
| Latencia | `duración de petición` | P99 < 200ms | P99 >= 200ms | 30 días rodante |
| Tasa de Error | `peticiones fallidas / peticiones totales` | < 0.1% | >= 0.1% | 30 días rodante |
| Saturación | `utilización de recursos` | CPU < 70% | CPU >= 70% | 7 días rodante |

## 3. Objetivos de Nivel de Servicio (SLOs)

| SLI | Objetivo | Justificación | Umbral de Alerta |
|-----|----------|---------------|------------------|
| Disponibilidad | 99.9% | 3 nueves = 43.8 min downtime/mes | Page al 99.8% |
| Latencia P99 | < 200ms | Capacidad de respuesta percibida por el usuario | Page a 250ms |
| Tasa de Error | < 0.1% | Estándar de la industria para APIs | Page al 0.2% |
| Saturación | < 70% | Margen para picos de tráfico | Warn al 65% |

## 4. Presupuesto de Error

| Objetivo SLO | Presupuesto de Error (30 días) | Tasa de Quema | Estado Actual |
|--------------|-------------------------------|---------------|---------------|
| 99.9% disponibilidad | 43.8 minutos | `Xx` | Saludable / En Riesgo / Agotado |

### Política de Presupuesto de Error

- **Saludable (< 50% quemado):** Desarrollo normal de features
- **En Riesgo (50–80% quemado):** Sin deploys no críticos; prioridad a trabajo de confiabilidad
- **Agotado (> 80% quemado):** Congelamiento de features; toda la ingeniería enfocada en confiabilidad
- **Agotado (> 100% quemado):** Incidente declarado; notificación ejecutiva requerida

## 5. Reglas de Alerta

| Condición | Severidad | Acción | Destinatario |
|-----------|-----------|--------|--------------|
| Umbral SLO violado por > 5 min | P2 | Page al ingeniero de guardia | PagerDuty |
| Presupuesto > 50% en 1 día | P1 | Page al líder del equipo | PagerDuty + Slack |
| Presupuesto > 100% en 7 días | P0 | Page a manager + resumen ejecutivo | PagerDuty + Email |

## 6. Dashboard e Informes

- Dashboard principal: `link`
- Gráfico de quema de presupuesto: `link`
- Revisión mensual de SLO: `link de calendario`
- Evaluación de impacto SLO post-incidente: requerido para SEV 1–2
```

## Explicación

La plantilla fuerza un **contrato de confiabilidad cuantificado** entre ingeniería y usuarios. Los SLIs son las métricas brutas; los SLOs son los objetivos; el presupuesto de error es la cantidad de "falta de confiabilidad" que puedes gastar antes de detener el trabajo de features. Sin una política de presupuesto de error, los equipos o entran en pánico con cada fluctuación o ignoran la degradación hasta que los clientes se van. La política da permiso explícito para frenar cuando la confiabilidad está en riesgo.

## Variantes

| Contexto | SLIs Clave | Diferenciador |
|----------|------------|---------------|
| Web / API | Disponibilidad, latencia P99, tasa de error | Los percentiles orientados al usuario importan más |
| Batch / ETL | Tasa de completitud, frescura, corrección | Entrega a tiempo, no velocidad |
| Streaming / Kafka | Lag del consumidor, throughput, salud de partición | El lag importa más que la latencia |
| Backend móvil | Latencia de API, tasa de entrega push, tamaño de payload | Consciencia de batería y costo de datos |
| Inferencia ML | Latencia de predicción, throughput, drift del modelo | La degradación de precisión también es un SLO |

## Mejores Prácticas

1. Empieza con 2–3 SLIs; más métricas diluyen el foco y crean fatiga de alertas
2. Basar SLOs en el rendimiento actual, no en objetivos aspiracionales; SLOs irreales agotan presupuestos instantáneamente
3. Revisar SLOs trimestralmente; los patrones de tráfico cambian y los objetivos también deberían
4. Alinear SLOs con el dolor del usuario, no con métricas internas; los usuarios se preocupan por errores de checkout, no por uso de CPU
5. Documentar el impacto empresarial de cada SLO para que los ejecutivos entiendan por qué un congelamiento de features importa

## Errores Comunes

1. Establecer SLOs al 100%; la perfección es imposible y paraliza a la ingeniería
2. Usar promedios en lugar de percentiles; los promedios ocultan latencia de cola que los usuarios realmente sienten
3. Alertar en valores brutos de SLI en lugar de violaciones de SLO; esto crea ruido sin acción
4. No definir una política de presupuesto de error; SLOs sin consecuencias son solo dashboards
5. Separar la revisión de SLO de la revisión de incidentes; cada SEV 1 debería activar una evaluación de impacto SLO

## Preguntas Frecuentes

### ¿Cuántos nueves debería tener mi objetivo SLO?

99.9% (tres nueves) es un punto de partida común para la mayoría de las APIs SaaS. 99.99% (cuatro nueves) es caro y solo debería perseguirse si el downtime causa pérdida directa de ingresos. 99.999% (cinco nueves) típicamente se reserva para infraestructura crítica como procesamiento de pagos o sistemas de salud. Cada nueve adicional aproximadamente duplica el costo de ingeniería. Empieza conservador y ajusta a la medida que maduran tu observabilidad y automatización.

### ¿Los SLOs deberían ser iguales que los SLAs orientados al cliente?

No. Los SLOs son objetivos internos; los SLAs son contratos externos. Establece tus SLOs más estrictos que tus SLAs para crear un margen. Por ejemplo, si tu SLA promete 99.9% de disponibilidad, establece tu SLO interno al 99.95%. Este margen absorbe violaciones menores sin incumplir contratos y te da margen de negociación cuando los clientes exijan SLAs más estrictos.

### ¿Qué pasa cuando agotamos el presupuesto de error?

La política de presupuesto de error debería activar un congelamiento de features y redirigir todo el esfuerzo de ingeniería a trabajo de confiabilidad. Esto no es un castigo; es un mecanismo de seguridad. Si el equipo agota presupuestos consistentemente, los objetivos SLO probablemente son irreales y deberían revisarse hacia abajo. Si los presupuestos nunca se tocan, los objetivos son demasiado laxos y podrías estar sobre-invirtiendo en confiabilidad a costa de la velocidad de features.
