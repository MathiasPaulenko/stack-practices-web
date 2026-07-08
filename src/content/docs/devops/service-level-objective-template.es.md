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

Los SLO separan el "teatro de disponibilidad" de la confiabilidad real. Un dashboard que muestra 99.9% de uptime no significa nada si tus usuarios experimentaron errores 500 durante el checkout porque la métrica promedió una interrupción de 10 minutos. Definir objetivos de nivel de servicio (SLOs), indicadores de nivel de servicio (SLIs) y presupuestos de error claros obliga a la ingeniería a ser honesta sobre qué significa "confiable" y cuánta falta de confiabilidad es aceptable antes de detener el trabajo de funcionalidades.

## Cuándo Usar

Usa este recurso cuando:
- Estás estableciendo objetivos de confiabilidad para un nuevo servicio o API
- Tu equipo pasa cada sprint apagando incendios en lugar de entregar funcionalidades
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

- **Saludable (< 50% quemado):** Desarrollo normal de funcionalidades
- **En Riesgo (50–80% quemado):** Sin deploys no críticos; prioridad a trabajo de confiabilidad
- **Agotado (> 80% quemado):** Congelamiento de funcionalidades; toda la ingeniería enfocada en confiabilidad
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

La plantilla fuerza un **contrato de confiabilidad cuantificado** entre ingeniería y usuarios. Los SLIs son las métricas brutas; los SLOs son los objetivos; el presupuesto de error es la cantidad de "falta de confiabilidad" que puedes gastar antes de detener el trabajo de funcionalidades. Sin una política de presupuesto de error, los equipos o entran en pánico con cada fluctuación o ignoran la degradación hasta que los clientes se van. La política da permiso explícito para frenar cuando la confiabilidad está en riesgo.

## Variantes

| Contexto | SLIs Clave | Diferenciador |
|----------|------------|---------------|
| Web / API | Disponibilidad, latencia P99, tasa de error | Los percentiles orientados al usuario importan más |
| Batch / ETL | Tasa de completitud, frescura, corrección | Entrega a tiempo, no velocidad |
| Streaming / Kafka | Lag del consumidor, throughput, salud de partición | El lag importa más que la latencia |
| Backend móvil | Latencia de API, tasa de entrega push, tamaño de payload | Consciencia de batería y costo de datos |
| Inferencia ML | Latencia de predicción, throughput, drift del modelo | La degradación de precisión también es un SLO |

## Lo que funciona

1. Empieza con 2–3 SLIs; más métricas diluyen el foco y crean fatiga de alertas
2. Basar SLOs en el rendimiento actual, no en objetivos aspiracionales; SLOs irreales agotan presupuestos instantáneamente
3. Revisar SLOs trimestralmente; los patrones de tráfico cambian y los objetivos también deberían
4. Alinear SLOs con el dolor del usuario, no con métricas internas; los usuarios se preocupan por errores de checkout, no por uso de CPU
5. Documentar el impacto empresarial de cada SLO para que los ejecutivos entiendan por qué un congelamiento de funcionalidades importa

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

La política de presupuesto de error debería activar un congelamiento de funcionalidades y redirigir todo el esfuerzo de ingeniería a trabajo de confiabilidad. Esto no es un castigo; es un mecanismo de seguridad. Si el equipo agota presupuestos consistentemente, los objetivos SLO probablemente son irreales y deberían revisarse hacia abajo. Si los presupuestos nunca se tocan, los objetivos son demasiado laxos y podrías estar sobre-invirtiendo en confiabilidad a costa de la velocidad de entregas.

## Soluciones Avanzadas

### Monitoreo de SLO con Prometheus y Grafana

Implementa seguimiento de SLO con reglas de grabacion de Prometheus y dashboards de Grafana:

```yaml
# prometheus-slo-rules.yaml
groups:
  - name: slo_availability
    interval: 30s
    rules:
      - record: job:slo_availability:ratio_rate5m
        expr: |
          sum(rate(http_requests_total{status!~"5.."}[5m])) by (job)
          /
          sum(rate(http_requests_total[5m])) by (job)

      - record: job:slo_availability:ratio_rate1h
        expr: |
          sum(rate(http_requests_total{status!~"5.."}[1h])) by (job)
          /
          sum(rate(http_requests_total[1h])) by (job)

      - record: job:slo_availability:ratio_rate30d
        expr: |
          sum(rate(http_requests_total{status!~"5.."}[30d])) by (job)
          /
          sum(rate(http_requests_total[30d])) by (job)

      - alert: SLOAvailabilityBurnRateHigh
        expr: |
          (
            job:slo_availability:ratio_rate1h < 0.999
            and
            job:slo_availability:ratio_rate5m < 0.999
          )
        for: 2m
        labels:
          severity: page
        annotations:
          summary: "SLO availability burn rate is high for {{ $labels.job }}"

  - name: slo_latency
    interval: 30s
    rules:
      - record: job:slo_latency_p99:histogram_quantile
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, job)
          )

      - alert: SLOLatencyP99Breach
        expr: job:slo_latency_p99:histogram_quantile > 0.2
        for: 5m
        labels:
          severity: page
        annotations:
          summary: "P99 latency exceeds 200ms SLO for {{ $labels.job }}"
```

### Script de calculo de presupuesto de error

Calcula la tasa de quema del presupuesto de error y el presupuesto restante programaticamente:

```python
import datetime
from dataclasses import dataclass

@dataclass
class ErrorBudget:
    slo_target: float          # e.g., 0.999 for 99.9%
    window_days: int           # e.g., 30
    total_requests: int
    failed_requests: int

    @property
    def error_budget_total(self) -> float:
        """Total allowed errors in the window."""
        return self.total_requests * (1 - self.slo_target)

    @property
    def error_budget_consumed(self) -> float:
        """Errors consumed so far."""
        return self.failed_requests

    @property
    def error_budget_remaining(self) -> float:
        """Errors remaining in the budget."""
        return self.error_budget_total - self.error_budget_consumed

    @property
    def burn_rate(self) -> float:
        """How fast we are consuming the budget (1.0 = on pace)."""
        if self.error_budget_total == 0:
            return 0
        return self.error_budget_consumed / self.error_budget_total

    @property
    def status(self) -> str:
        rate = self.burn_rate
        if rate > 1.0:
            return "EXHAUSTED"
        elif rate > 0.8:
            return "CRITICAL"
        elif rate > 0.5:
            return "AT RISK"
        else:
            return "HEALTHY"

    def report(self) -> str:
        return (
            f"SLO Target: {self.slo_target*100}%\n"
            f"Window: {self.window_days} days\n"
            f"Total Requests: {self.total_requests:,}\n"
            f"Failed Requests: {self.failed_requests:,}\n"
            f"Budget Total: {self.error_budget_total:.0f}\n"
            f"Budget Consumed: {self.error_budget_consumed:.0f}\n"
            f"Budget Remaining: {self.error_budget_remaining:.0f}\n"
            f"Burn Rate: {self.burn_rate:.2%}\n"
            f"Status: {self.status}"
        )

# Example usage
budget = ErrorBudget(
    slo_target=0.999,
    window_days=30,
    total_requests=10_000_000,
    failed_requests=15_000
)
print(budget.report())
```

### Alertas multi-ventana multi-tasa-de-quema

Implementa las alertas de tasa de quema multi-ventana recomendadas por Google para detectar violaciones de SLO de quema rapida y lenta:

```yaml
# Multi-window burn rate alerts
# Fast burn: 2% of budget in 1 hour
# Slow burn: 10% of budget in 3 days
groups:
  - name: slo_multi_window_alerts
    rules:
      # Fast burn - Page immediately
      - alert: SLOFastBurnRate
        expr: |
          (
            job:slo_availability:ratio_rate5m < 0.999
            and job:slo_availability:ratio_rate1h < 0.999
          )
        for: 2m
        labels:
          severity: page
          burn_type: fast
        annotations:
          summary: "Fast SLO burn: 2% budget in 1h for {{ $labels.job }}"

      # Slow burn - Warn for investigation
      - alert: SLOSlowBurnRate
        expr: |
          (
            job:slo_availability:ratio_rate1h < 0.999
            and job:slo_availability:ratio_rate6h < 0.999
          )
        for: 15m
        labels:
          severity: warn
          burn_type: slow
        annotations:
          summary: "Slow SLO burn: 10% budget in 3d for {{ $labels.job }}"

      # Critical burn - Executive notification
      - alert: SLOCriticalBurnRate
        expr: |
          (
            job:slo_availability:ratio_rate30m < 0.99
            and job:slo_availability:ratio_rate6h < 0.99
          )
        for: 10m
        labels:
          severity: critical
          burn_type: critical
        annotations:
          summary: "Critical SLO burn for {{ $labels.job }} - exec notification required"
```

## Mejores Practicas Adicionales

1. **Usa alertas basadas en SLI en lugar de alertas basadas en umbrales.** En vez de alertar cuando CPU > 80%, alerta cuando la tasa de quema del presupuesto de error excede 2x lo normal. Esto reduce falsos positivos y vincula las alertas al impacto en el usuario:

```promql
# Alert when 30-day error budget burns 2x faster than normal
(
  1 - job:slo_availability:ratio_rate1h
) > 2 * (1 - 0.999) / 30 / 24
```

2. **Rastrea SLOs por viaje de usuario, no por servicio.** Un servicio puede estar saludable mientras un viaje critico de usuario esta roto. Define SLIs alrededor del flujo de checkout, no solo de la API de pagos:

```yaml
# User journey SLI: Checkout completion
sli_checkout:
  good_events: "checkout_completed_total"
  bad_events: "checkout_failed_total + checkout_abandoned_total"
  metric: "rate(checkout_completed_total[5m]) / rate(checkout_started_total[5m])"
  target: 0.995
```

## Errores Comunes Adicionales

1. **Establecer SLOs diferentes para el mismo servicio entre equipos.** Cuando multiples equipos poseen partes de un servicio, los SLOs inconsistentes crean puntos ciegos. Usa un SLO unificado que cubra el viaje completo del usuario:

```bash
# Validate SLO consistency across teams
node -e "
const slos = require('./slo-definitions.json');
const services = {};
slos.forEach(s => {
  if (!services[s.service]) services[s.service] = [];
  services[s.service].push(s.target);
});
for (const [svc, targets] of Object.entries(services)) {
  const unique = [...new Set(targets)];
  if (unique.length > 1) {
    console.log('INCONSISTENT: ' + svc + ' has targets: ' + unique.join(', '));
  }
}
"
```

2. **No contabilizar el mantenimiento planificado en los presupuestos de error.** Los despliegues programados y el mantenimiento consumen presupuesto de error. Excluye el downtime planificado de los calculos de SLI o asigna un presupuesto de mantenimiento separado:

```promql
# Exclude planned maintenance windows from SLI
sum(rate(http_requests_total{status!~"5..", maintenance!="true"}[30d]))
/
sum(rate(http_requests_total{maintenance!="true"}[30d]))
```

## Preguntas Frecuentes Adicionales

### Como calculo el presupuesto de error en minutos?

Para una ventana de 30 dias: `30 dias * 24 horas * 60 minutos * (1 - SLO_target)`. Al 99.9%: `43200 * 0.001 = 43.2 minutos` de downtime permitido por mes. Al 99.95%: `43200 * 0.0005 = 21.6 minutos`. Al 99.99%: `43200 * 0.0001 = 4.32 minutos`.

### Deberia usar SLOs para servicios solo internos?

Si. Los servicios internos afectan a los servicios orientados al usuario que dependen de ellos. Una API interna lenta aumenta la latencia del viaje del usuario. Establece SLOs en servicios internos con objetivos alineados a su impacto en los servicios descendentes. Un servicio de autenticacion interno que tarda 500ms violara el SLO de latencia orientado al usuario incluso si el frontend es rapido.
