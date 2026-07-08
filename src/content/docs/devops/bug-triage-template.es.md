---
contentType: docs
slug: bug-triage-template
title: "Plantilla de Triaje de Bugs"
description: "Plantilla para clasificar y enrutar reportes de bugs por severidad e impacto."
metaDescription: "Usa esta plantilla de triaje de bugs para clasificar reportes por severidad, asignar prioridad y enrutarlos al equipo de ingeniería correcto."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - bug
  - triage
  - severity
  - operations
  - template
relatedResources:
  - /docs/runbook-template
  - /docs/auto-scaling-policy-template
  - /docs/backup-and-restore-template
  - /docs/cloud-cost-allocation-template
  - /docs/cross-region-failover-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de triaje de bugs para clasificar reportes por severidad, asignar prioridad y enrutarlos al equipo de ingeniería correcto."
  keywords:
    - devops
    - bug
    - triaje
    - severidad
    - operaciones
    - plantilla
---
## Visión General

No todos los bugs son iguales. Un problema cosmético en un interruptor de modo oscuro no es lo mismo que un bug de pérdida de datos en un flujo de pago. Sin un sistema de triaje, los problemas críticos se acumulan en backlogs mientras los ingenieros persiguen ruido de baja prioridad. Esta plantilla crea un sistema de clasificación y enrutamiento repetible para que los bugs correctos lleguen a los equipos correctos con la prioridad adecuada.

## Cuándo Usar

Usa este recurso cuando:
- Tu backlog de bugs crece más rápido de lo que tu equipo puede cerrar ítems
- Los problemas críticos de producción están enterrados bajo solicitudes de características menores
- Múltiples equipos comparten una cola de bugs y la propiedad no está clara

## Solución

```markdown
# Triaje de Bugs: `<Proyecto / Producto>`

## 1. Clasificación por Severidad

| Severidad | Impacto | Ejemplos | Tiempo de Respuesta | Objetivo de Resolución |
|-----------|---------|----------|---------------------|------------------------|
| S1 — Crítico | Servicio inutilizable o pérdida de datos | Pago fallando, login roto, corrupción de datos | 15 min | 4 horas |
| S2 — Alto | Característica principal rota; existe workaround | Búsqueda caída, exportación de informes falla | 2 horas | 24 horas |
| S3 — Medio | Característica degradada pero funcional | Páginas lentas, ordenamiento incorrecto | 24 horas | 1 semana |
| S4 — Bajo | Cosmético o inconveniente menor | Botón desalineado, typo, color incorrecto | 1 semana | Próximo sprint |

## 2. Preguntas de Triaje

Responde estas preguntas para cada reporte de bug entrante:

1. **Reproducibilidad**
   - [ ] ¿El bug puede reproducirse consistentemente?
   - [ ] Si es intermitente, ¿cuál es la frecuencia aproximada?
   - [ ] ¿Afecta a un segmento específico de usuarios, dispositivo o navegador?

2. **Impacto**
   - [ ] ¿Bloquea un recorrido principal del usuario (registro, compra, login)?
   - [ ] ¿Afecta a un solo usuario, un subconjunto o todos?
   - [ ] ¿Existe un workaround? ¿Qué tan difícil es?

3. **Regulatorio / Seguridad**
   - [ ] ¿Expone PII o datos sensibles?
   - [ ] ¿Viola un requisito de cumplimiento (PCI, SOC 2, GDPR)?

4. **Recencia**
   - [ ] ¿Apareció este bug después de un release reciente?
   - [ ] ¿Es una regresión de un issue previamente corregido?

## 3. Reglas de Enrutamiento

| Severidad | Asignado | Canal | Escalamiento |
|-----------|----------|-------|--------------|
| S1 | Ingeniero de guardia + Líder de equipo | Página + Sala de guerra | VP de Ingeniería después de 1 hora |
| S2 | Líder de equipo | Slack #incidents | Manager después de 4 horas |
| S3 | Siguiente ingeniero disponible | JIRA / Linear | Líder de equipo si no se resuelve en 3 días |
| S4 | Backlog | JIRA / Linear | Re-evaluar si se acumulan duplicados |

## 4. Registro de Triaje

| Fecha | ID de Bug | Reportado Por | Severidad Inicial | Severidad Final | Responsable | Razón del Cambio |
|-------|-----------|---------------|-------------------|-----------------|-------------|------------------|
| | | | | | | |

## 5. Detección de Duplicados

| Verificación | Método |
|--------------|--------|
| Búsqueda por palabras clave | Buscar en JIRA con mensaje de error / componente |
| Coincidencia de stack trace | Comparar firmas de stack trace |
| Superposición de impacto | Verificar si múltiples reportes referencian el mismo flujo |
| Correlación con release | Filtrar bugs reportados dentro de 48h de un despliegue |
```

## Explicación

La plantilla fuerza una **clasificación estructurada** antes del enrutamiento. Muchos equipos omiten el triaje y asignan bugs a quien esté disponible, lo que significa que los issues críticos esperan detrás de tickets de baja prioridad. La matriz de severidad usa **impacto en el usuario** y **riesgo para el negocio** como ejes principales, no solo "qué tan difícil es arreglarlo". Un cambio de CSS de una línea que bloquea el checkout es S1; una fuga de memoria compleja que afecta al 0.1% de usuarios es S3. Las reglas de enrutamiento evitan que los bugs de alta severidad se traten como trabajo normal de backlog.

## Variantes

| Contexto | Enfoque de Clasificación | Enfoque de Enrutamiento |
|----------|-------------------------|------------------------|
| Aplicación móvil | Versión de SO, modelo de dispositivo, reseñas de tienda | Crashlytics agrupa automáticamente por stack trace |
| API / backend | Endpoint, tasa de error, pico de latencia | Alert manager enruta por propietario del servicio |
| SaaS B2B | Tamaño de tenant, valor de contrato, SLA | Éxito del cliente marca bugs de clientes de alto valor |
| Juego / consumidor | Impacto en monetización, segmento de jugador | Equipo de live ops triaja durante eventos |
| Bug de seguridad | Puntaje CVSS, explotabilidad, exposición | Directo al equipo de seguridad; omite la cola estándar |

## Lo que funciona

1. Triajea cada bug nuevo dentro de 24 horas de reportado; triaje viejo es triaje fallido
2. Usa una única fuente de verdad (JIRA, Linear, GitHub Issues) para que los duplicados sean detectables
3. Requiere un caso de prueba reproducible antes de aceptar S2 o mayor; bugs críticos no confirmados desperdician tiempo de ingeniería
4. Re-evalúa la severidad si emerge nueva información (por ejemplo, "afecta a todos los usuarios" y no "a algunos")
5. Cierra bugs "no se arreglará" explícitamente con una justificación; el silencio crea backlogs de tickets zombie

## Errores Comunes

1. Clasificar bugs por esfuerzo en lugar de impacto (arreglo fácil ≠ alta prioridad)
2. Dejar que los reportadores establezcan su propia severidad; los usuarios siempre piensan que su bug es crítico
3. No rastrear decisiones de triaje, llevando a los mismos debates cada semana
4. Enrutar bugs de seguridad a través de la cola estándar en lugar de directamente a seguridad
5. Ignorar duplicados; diez reportes del mismo bug parecen diez problemas separados

## Preguntas Frecuentes

### ¿Qué pasa si un reporte de bug es vago o le faltan pasos de reproducción?

Solicita la información estándar: pasos para reproducir, comportamiento esperado vs real, entorno (navegador, SO, versión), capturas de pantalla o grabaciones, y logs de error. Si el reportador no puede proporcionar esto dentro de 48 horas, reduce a S4 o cierra como "necesita info". No dejes que reportes incompletos bloqueen el triaje de bugs útiles.

### ¿Cómo evito que el triaje se convierta en un cuello de botella?

Rota un ingeniero de "deber de triaje" cada semana. Esta persona revisa todos los bugs entrantes durante 30 minutos cada mañana, clasifica, enruta y solicita información faltante. El deber de triaje no debe ser la misma persona que el de guardia. Con el tiempo, automatiza: usa reportes de crashes para pre-clasificar por stack trace, y reglas de bots para auto-enrutar a propietarios conocidos de componentes.

### ¿Deben las solicitudes de características ser triajeadas junto con bugs?

No. Mantén bugs y solicitudes de características en colas separadas con objetivos de SLA distintos. Las solicitudes de características requieren input de producto; los bugs requieren input de ingeniería. Mezclarlos genera confusión sobre propiedad y prioridad. Si un usuario reporta un bug que en realidad es una característica faltante, re-etiquétalo y muévelo al backlog de producto con una explicación clara.

## Soluciones Avanzadas

### Triaje automatizado de bugs con GitHub Issues y labels

Usa GitHub Actions para auto-etiquetar y enrutar reportes de bugs entrantes basado en análisis de contenido:

```yaml
# .github/workflows/auto-triage.yml
name: Auto-Triage Bug Reports
on:
  issues:
    types: [opened, labeled]

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - name: Check for severity keywords
        uses: actions/github-script@v7
        with:
          script: |
            const body = context.payload.issue.body || "";
            const title = context.payload.issue.title || "";
            const text = (title + " " + body).toLowerCase();

            const severityRules = [
              { label: "s1-critical", keywords: ["data loss", "payment", "login broken", "security", "production down"] },
              { label: "s2-high", keywords: ["broken", "crash", "error 500", "not working", "failing"] },
              { label: "s3-medium", keywords: ["slow", "incorrect", "wrong", "unexpected"] },
              { label: "s4-low", keywords: ["typo", "cosmetic", "alignment", "color"] },
            ];

            for (const rule of severityRules) {
              if (rule.keywords.some(kw => text.includes(kw))) {
                await github.rest.issues.addLabels({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  issue_number: context.payload.issue.number,
                  labels: [rule.label, "needs-triage"],
                });
                break;
              }
            }
```

### Desduplicación de bugs con fingerprinting de stack traces

Agrupa reportes de crashes similares normalizando y hasheando stack traces:

```python
import hashlib
import re
from collections import defaultdict
from typing import List, Dict

def normalize_stack_trace(trace: str) -> str:
    """Normalize a stack trace by removing line numbers and memory addresses."""
    # Remove file paths, keeping only filenames
    trace = re.sub(r'/[\w/.-]+/', '', trace)
    # Remove line numbers
    trace = re.sub(r':\d+', '', trace)
    # Remove memory addresses
    trace = re.sub(r'0x[0-9a-fA-F]+', '0xADDR', trace)
    # Remove thread IDs
    trace = re.sub(r'Thread-\d+', 'Thread-N', trace)
    return trace.strip()

def fingerprint_stack_trace(trace: str) -> str:
    """Generate a hash fingerprint from a normalized stack trace."""
    normalized = normalize_stack_trace(trace)
    return hashlib.sha256(normalized.encode()).hexdigest()[:16]

def group_bug_reports(reports: List[Dict]) -> Dict[str, List[Dict]]:
    """Group bug reports by stack trace fingerprint."""
    groups = defaultdict(list)
    for report in reports:
        trace = report.get("stack_trace", "")
        if trace:
            fp = fingerprint_stack_trace(trace)
            groups[fp].append(report)
        else:
            groups["no-trace"].append(report)
    return groups

# Example usage
bug_reports = [
    {"id": "BUG-001", "stack_trace": "TypeError at /app/src/handlers.py:42\n  File /app/src/utils.py:128"},
    {"id": "BUG-002", "stack_trace": "TypeError at /app/src/handlers.py:45\n  File /app/src/utils.py:131"},
    {"id": "BUG-003", "stack_trace": "ValueError at /app/src/models.py:67"},
]

groups = group_bug_reports(bug_reports)
for fp, reports in groups.items():
    print(f"Fingerprint {fp}: {len(reports)} reports - {[r['id'] for r in reports]}")
```

### Dashboard de envejecimiento de bugs con notificación Slack

Rastrea bugs que exceden su objetivo de resolución SLA y alerta al equipo:

```python
import os
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import List

SLA_TARGETS = {
    "S1": timedelta(hours=4),
    "S2": timedelta(hours=24),
    "S3": timedelta(days=7),
    "S4": timedelta(days=14),
}

@dataclass
class BugTicket:
    id: str
    severity: str
    created_at: datetime
    status: str
    assignee: str

def find_aged_bugs(tickets: List[BugTicket]) -> List[BugTicket]:
    """Find bugs that have exceeded their SLA resolution target."""
    now = datetime.now()
    aged = []
    for ticket in tickets:
        if ticket.status in ("closed", "resolved"):
            continue
        sla = SLA_TARGETS.get(ticket.severity)
        if not sla:
            continue
        age = now - ticket.created_at
        if age > sla:
            aged.append(ticket)
    return aged

def format_slack_alert(aged_bugs: List[BugTicket]) -> str:
    """Format aged bugs for a Slack alert message."""
    if not aged_bugs:
        return "No bugs have exceeded their SLA target."

    lines = [":warning: *SLA Violation Alert* — Bugs exceeding resolution target:\n"]
    for bug in sorted(aged_bugs, key=lambda b: b.created_at):
        age_hours = (datetime.now() - bug.created_at).total_seconds() / 3600
        sla_hours = SLA_TARGETS[bug.severity].total_seconds() / 3600
        lines.append(
            f"• {bug.severity} {bug.id} — {age_hours:.0f}h old "
            f"(SLA: {sla_hours:.0f}h) — Assigned: {bug.assignee}"
        )
    return "\n".join(lines)

# Example usage
tickets = [
    BugTicket("BUG-100", "S1", datetime.now() - timedelta(hours=6), "open", "alice"),
    BugTicket("BUG-101", "S2", datetime.now() - timedelta(hours=30), "open", "bob"),
    BugTicket("BUG-102", "S3", datetime.now() - timedelta(days=2), "open", "charlie"),
]

aged = find_aged_bugs(tickets)
print(format_slack_alert(aged))
```

## Mejores Prácticas Adicionales

1. **Usa un tablero de triaje de bugs con columnas para cada severidad.** Visualizar bugs por severidad hace inmediatamente claro dónde se necesita atención. Configura transiciones automáticas de columnas basadas en temporizadores de SLA:

```yaml
# Linear workflow configuration
states:
  - name: triage
    transitions: [s1-critical, s2-high, s3-medium, s4-low]
  - name: in_progress
    sla_timer: true
    overdue_alert: "#incidents"
  - name: in_review
    requires_pr: true
  - name: done
    auto_close_after_days: 30
```

2. **Rastrea métricas de triaje a lo largo del tiempo.** Mide qué tan rápido los bugs pasan de "reportado" a "triajeado" para identificar cuellos de botella:

```python
from datetime import datetime, timedelta
from collections import defaultdict

def calculate_triage_metrics(tickets):
    """Calculate average triage time by severity."""
    triage_times = defaultdict(list)
    for t in tickets:
        if t.triaged_at and t.created_at:
            delta = (t.triaged_at - t.created_at).total_seconds() / 3600
            triage_times[t.severity].append(delta)

    metrics = {}
    for severity, times in triage_times.items():
        metrics[severity] = {
            "avg_triage_hours": sum(times) / len(times),
            "max_triage_hours": max(times),
            "count": len(times),
        }
    return metrics
```

## Errores Comunes Adicionales

1. **No cerrar reportes de bugs inválidos prontamente.** Reportes que son en realidad errores de usuario, errores de configuración o duplicados obstruyen la cola de triaje. Ciérralos dentro de 24 horas con una explicación clara:

```markdown
## Closing Template for Invalid Reports

Thank you for reporting this issue. After investigation, this appears to be:
- [ ] A configuration error on the user side
- [ ] Expected behavior, not a bug
- [ ] A duplicate of #{existing_issue}
- [ ] A feature request, not a bug

Closing as: {reason}. If you believe this is incorrect, please reopen with additional context.
```

2. **Dejar que bugs S3 y S4 se acumulen sin revisión periódica.** Los bugs de baja severidad pueden volverse irrelevantes con el tiempo. Programa un "bug bash" mensual para revisar y cerrar tickets S3/S4 obsoletos:

```bash
#!/bin/bash
# Find S3/S4 bugs older than 90 days with no activity
gh issue list \
  --label "s3-medium,s4-low" \
  --state open \
  --search "created:<$(date -d '90 days ago' +%Y-%m-%d) updated:<$(date -d '30 days ago' +%Y-%m-%d)" \
  --json number,title,createdAt,updatedAt \
  --jq '.[] | "#\(.number) \(.title) (created: \(.createdAt[:10]))"'
```

## Preguntas Frecuentes Adicionales

### ¿Cómo manejamos bugs encontrados durante testing automatizado vs. bugs reportados por usuarios?

Los bugs encontrados por tests automatizados deben omitir la cola estándar de triaje. Archívalos directamente con el nombre del test fallido, stack trace y detalles del entorno. Asígnalos al equipo propietario del suite de tests. Usa un label "test-failure" para distinguirlos de issues reportados por usuarios. Si el mismo test falla repetidamente, escala a S2 ya que puede indicar un entorno inestable o una regresión real.

### ¿Qué métricas deberíamos rastrear para la efectividad del triaje?

Rastrea estas métricas clave: tiempo mediano hasta triaje (objetivo: menos de 4 horas para S1/S2), porcentaje de bugs triajeados dentro de 24 horas (objetivo: 95%), número de cambios de severidad después del triaje inicial (objetivo: menos de 10%), y conteo de bugs envejecidos (objetivo: cero bugs S1/S2 pasados el SLA). Revisa estas métricas mensualmente para identificar patrones y ajustar el proceso de triaje.
