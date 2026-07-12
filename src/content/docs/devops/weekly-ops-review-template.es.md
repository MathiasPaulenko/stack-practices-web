---


contentType: docs
slug: weekly-ops-review-template
title: "Plantilla de Revisión Semanal de Operaciones"
description: "Plantilla para resumir incidentes, costos, rendimiento y acciones en revisiones semanales de operaciones."
metaDescription: "Usa esta plantilla de revisión semanal de operaciones para resumir incidentes, costos en la nube, métricas de rendimiento y acciones para tu equipo de operaciones."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - weekly
  - review
  - operations
  - incident
  - cost
  - performance
  - template
relatedResources:
  - /docs/performance-regression-template
  - /docs/bug-triage-template
  - /docs/change-management-template
  - /docs/cloud-cost-allocation-template
  - /docs/downtime-communication-template
  - /docs/infrastructure-as-code-review-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de revisión semanal de operaciones para resumir incidentes, costos en la nube, métricas de rendimiento y acciones para tu equipo de operaciones."
  keywords:
    - devops
    - weekly
    - review
    - operations
    - incident
    - cost
    - performance
    - template


---
## Visión General

Las revisiones de operaciones son donde los equipos detectan tendencias antes de que se conviertan en incidentes. Una revisión semanal de incidentes, costos y rendimiento transforma alertas dispersas en patrones útiles. Sin estructura, las revisiones de operaciones se convierten en sesiones de quejas o actualizaciones de estado que nadie lee. Esta plantilla crea un formato repetible: qué pasó, qué costó, qué está en tendencia y qué vamos a hacer al respecto.

## Cuándo Usar


- For alternatives, see [Performance Regression Template](/es/docs/performance-regression-template/).

Usa este recurso cuando:
- Tu equipo está reaccionando a incidentes pero nunca analiza patrones
- Los costos en la nube aumentan silenciosamente sin explicación
- Estás estableciendo una práctica de SRE o ingeniería de plataforma y necesitas una cadencia de revisión regular

## Solución

```markdown
# Revisión Semanal de Operaciones: `<Semana del AAAA-MM-DD>`

## 1. Resumen Ejecutivo

| Métrica | Esta Semana | Semana Pasada | Tendencia | Objetivo |
|---------|-------------|---------------|-----------|----------|
| Incidentes | `X` | `Y` | ↑ / ↓ / → | `< 3` |
| SEV 1–2 | `X` | `Y` | ↑ / ↓ / → | `0` |
| MTTR (promedio) | `X min` | `Y min` | ↑ / ↓ / → | `< 30 min` |
| Costo en la Nube | `$X` | `$Y` | ↑ / ↓ / → | `< $Z` |
| Presupuesto de Error Restante | `X%` | `Y%` | ↑ / ↓ / → | `> 50%` |

**Narrativa:** `Un párrafo resumiendo la semana: mayor problema, mayor éxito, mayor riesgo.`

## 2. Revisión de Incidentes

| ID | Severidad | Servicio | Causa Raíz | MTTR | Acción | Responsable | Estado |
|----|-----------|----------|------------|------|--------|-------------|--------|
| INC-### | SEV 1/2/3 | `servicio` | `causa` | `X min` | `acción` | `@nombre` | Abierto / Cerrado |

### Temas Recurrentes

- `Tema 1: descripción y frecuencia`
- `Tema 2: descripción y frecuencia`

### Seguimiento de la Semana Pasada

- [ ] `Acción 1` — `@responsable` — `estado`
- [ ] `Acción 2` — `@responsable` — `estado`

## 3. Análisis de Costos

| Categoría | Esta Semana | Semana Pasada | Delta | Presupuesto | Variación |
|-----------|-------------|---------------|-------|-------------|-----------|
| Compute (EC2 / GCE) | `$X` | `$Y` | `+/- Z%` | `$B` | `+/- V%` |
| Almacenamiento | `$X` | `$Y` | `+/- Z%` | `$B` | `+/- V%` |
| Transferencia de Datos | `$X` | `$Y` | `+/- Z%` | `$B` | `+/- V%` |
| Servicios Administrados | `$X` | `$Y` | `+/- Z%` | `$B` | `+/- V%` |
| **Total** | `$X` | `$Y` | `+/- Z%` | `$B` | `+/- V%` |

### Drivers de Costo

- `Driver 1: descripción`
- `Driver 2: descripción`

### Acciones de Costo

| Acción | Ahorro Proyectado | Responsable | Fecha Límite |
|--------|-------------------|-------------|--------------|
| | | | |

## 4. Rendimiento y Confiabilidad

| Servicio | Disponibilidad | Latencia P99 | Tasa de Error | Saturación | Estado |
|----------|----------------|--------------|---------------|------------|--------|
| `API` | `X%` | `Y ms` | `Z%` | `W%` | ✅ / ⚠️ / ❌ |
| `Web` | `X%` | `Y ms` | `Z%` | `W%` | ✅ / ⚠️ / ❌ |
| `Worker` | `X%` | `Y ms` | `Z%` | `W%` | ✅ / ⚠️ / ❌ |

### Violaciones de SLO

| Servicio | SLO | Actual | Impacto en Presupuesto | Acción |
|----------|-----|--------|------------------------|--------|
| | | | | |

## 5. Acciones para la Próxima Semana

| Prioridad | Acción | Responsable | ETA | Criterio de Éxito |
|-----------|--------|-------------|-----|-------------------|
| P0 | | | | |
| P1 | | | | |
| P2 | | | | |

## 6. Riesgos y Escalamientos

| Riesgo | Probabilidad | Impacto | Mitigación | Escalamiento |
|--------|--------------|---------|------------|--------------|
| | | | | |
```

## Explicación

La plantilla separa **datos** de **narrativa**. Las tablas fuerzan una revisión cuantitativa; la sección narrativa explica qué significan los números. Muchos equipos omiten el análisis de costos hasta que la factura sorprende a finanzas. Incluir costos semanalmente construye consciencia de costos en la cultura de ingeniería. La sección de temas recurrentes es donde detectas problemas sistémicos: tres incidentes relacionados con memoria en tres semanas significa un patrón, no mala suerte.

## Consulta para Dashboard de Revision Operativa Semanal

```text
=== Dashboard de Revision Operativa Semanal ===

Semana del: 2026-07-08 al 2026-07-14

1. RESUMEN DE INCIDENTES
   Incidentes totales:     3
   P0 (critico):           0
   P1 (alto):              1 (auth-service timeout, 2026-07-10)
   P2 (medio):             2 (cache eviction storm, DB slow query)
   Tiempo medio deteccion: 4 min
   Tiempo medio resolucion: 22 min
   Impacto al cliente:     1,200 usuarios afectados (P1)

2. ESTADO DE SLO
   Servicio          Objetivo SLO  Actual    Presupuesto Restante
   api-gateway       99.9%         99.92%    78%
   auth-service      99.9%         99.85%    42% (tendencia bajando)
   payment-service   99.95%        99.96%    65%
   search-service    99.5%         99.51%    51%

3. ANALISIS DE COSTOS
   Esta semana:      $12,450
   Semana pasada:    $11,800
   Tendencia:        +5.5% (investigar)
   Mayor costo:      Instancias EC2 ($4,200)
   Anomalia:         Egress S3 +40% (nueva feature de export?)

4. RESUMEN DE DESPLIEGUES
   Despliegues totales: 7
   Rollbacks:           1 (api-gateway v2.3, error de config)
   Hotfixes:            1 (auth-service fix de sesion)
   Despliegues fallidos: 0

5. TEMAS RECURRENTES
   - Picos de latencia en auth-service durante pico (3ra semana)
   - Tasa de cache eviction sobre baseline (2da semana)
   - Costo de egress S3 aumentando (1ra semana, patron nuevo)
```

## Plantilla de Seguimiento de Action Items

```text
=== Tracker de Action Items ===

Semana: 2026-07-08

| ID  | Prioridad | Action                              | Owner    | Estado     | ETA         |
|-----|-----------|-------------------------------------|----------|------------|-------------|
| A01 | P1        | Investigar latencia auth-service    | alice    | En Progreso| 2026-07-15 |
| A02 | P1        | Fix politica cache eviction         | bob      | Abierto    | 2026-07-18 |
| A03 | P2        | Revisar pico costo egress S3        | charlie  | Abierto    | 2026-07-22 |
| A04 | P2        | Actualizar query DB con indice falt | dba-team | Hecho      | 2026-07-10 |
| A05 | P0        | Agregar alerta auth p99 > 2s        | alice    | Hecho      | 2026-07-11 |

Items Semana Anterior:
| ID  | Action                              | Owner    | Estado      |
|-----|-------------------------------------|----------|-------------|
| P01 | Reducir costos EC2 right-sizing     | platform | Hecho       |
| P02 | Agregar synthetic test para checkout| qa-team  | En Progreso |
| P03 | Documentar procedimiento failover   | sre-team | Hecho       |
```


## Variantes

| Contexto | Enfoque | Cadencia |
|----------|---------|----------|
| Startup (< 20 personas) | Incidentes + costos solo; omitir tablas SLO | Semanal, 15 min |
| Scale-up (20–100) | Plantilla completa; asignar responsables de acciones | Semanal, 30 min |
| Enterprise (100+) | Revisiones por servicio; agregación mensual | Semanal por equipo, mensual cross-team |
| Equipo de Plataforma / SRE | Enfoque en infraestructura compartida y salud de tenants | Semanal, 45 min |
| Organización consciente de costos | Expandir sección de costos; incluir costo por feature | Semanal, 30 min |

## Lo que funciona

1. Mantén la revisión bajo 30 minutos; reuniones largas matan el engagement
2. Asigna responsables a cada acción en la reunión, no después
3. Revisa primero las acciones de la semana pasada; la rendición de cuentas refuerza el hábito
4. Usa números reales, no anécdotas; "se siente lento" no es útil
5. Documenta riesgos antes de que se conviertan en incidentes; escalar temprano previene incendios

## Errores Comunes

1. Convertir la revisión en una sesión de culpas; enfócate en sistemas, no en personas
2. Omitir el análisis de costos hasta que finanzas se queje; los costos aumentan silenciosamente
3. No revisar acciones de semanas anteriores; esto hace inútil la reunión
4. Permitir que "no hubo incidentes esta semana" signifique "no hay nada que discutir"; siempre revisa tendencias
5. No escalar riesgos temprano; esperar a que un riesgo se convierta en incidente desperdicia la revisión

## Preguntas Frecuentes

### ¿Quién debería asistir a la revisión de operaciones?

Líderes de ingeniería, representantes de guardia y un stakeholder de producto o negocio. El líder de SRE o plataforma dirige la reunión. Los contribuidores individuales asisten cuando se discute su servicio. Mantén el grupo pequeño: máximo 6–8 personas. Grupos más grandes convierten la reunión en un reporte de estado que nadie asume.

### ¿Qué pasa si no hubo incidentes esta semana?

Celebra brevemente, luego investiga más profundo. Revisa tendencias de costos, degradación de rendimiento y riesgos próximos. Una semana tranquila es una oportunidad para pagar deuda técnica o ajustar SLOs. Nunca canceles la revisión porque "no pasó nada"; la consistencia construye el hábito que detecta problemas temprano.

### ¿Cómo hago que los ingenieros se preocupen por los costos?

Muestra costo por feature o por cliente, no solo gasto total. Los ingenieros se relacionan con la eficiencia. Si la Feature X cuesta $0.05 por usuario por mes y la Feature Y cuesta $2.00, esa comparación impulsa la optimización. También, comparte logros de ahorro de costos como victorias de ingeniería; reducir desperdicio es tan valioso como entregar código.


### Como automatizamos la recopilacion de datos de la revision operativa?

Usa un script o dashboard que extraiga datos de tu monitoreo (Datadog, Prometheus), gestion de incidentes (PagerDuty, Opsgenie) y gestion de costos (AWS Cost Explorer, CloudHealth) APIs. Genera las tablas automaticamente y completa la narrativa manualmente. Almacena el reporte semanal en un wiki o sistema de documentos compartido. Automatiza la recopilacion de datos pero mantén el analisis humano — el valor de la revision esta en la discusion, no en los numeros.

### Que metricas deberiamos rastrear mas alla de incidentes y costos?

Rastrea: frecuencia de despliegue, lead time para cambios, tasa de fallo de cambios, tiempo medio a recuperacion (metricas DORA). Rastrea tasa de quemado de SLO y consumo de presupuesto de error. Rastrea carga de on-call (paginas por semana, escalaciones). Rastrea items de deuda tecnica cerrados. Rastrea hallazgos de seguridad abiertos y resueltos. Rastrea problemas reportados por clientes. Estas metricas juntas dan una vista completa de la salud operativa.

### Como manejamos action items que nunca se completan?

Escala action items estancados (abiertos por mas de 2 semanas) al team lead. Si un action item no es lo suficientemente importante para completar en 2 semanas, cierralo y documenta por que. No permitas que la lista de action items crezca indefinidamente — se convierte en ruido. Limita los action items activos a 10 por equipo. Si alcanzas el limite, cierra los items mas antiguos o escala a liderazgo para priorizacion.

### Deberiamos compartir la revision operativa con la empresa?

Comparte una version resumida mensualmente con liderazgo y stakeholders. Incluye: conteo de incidentes, estado de SLO, tendencias de costo y logros principales. Omite action items internos y analisis tecnico detallado. El resumen mensual construye confianza y transparencia. Para equipos de ingenieria, comparte la revision semanal completa en un canal o wiki compartido para que todos puedan ver tendencias y contribuir observaciones.

### Como ejecutamos la revision para equipos distribuidos?

Usa un documento compartido (Google Docs, Notion, Confluence) que todos puedan editar simultaneamente. Comienza con 5 minutos de revision de datos (tablas), luego 15 minutos de discusion (narrativa), luego 10 minutos de action items. Graba la reunion para participantes asincronos. Rota el facilitador semanalmente para construir ownership. Usa una plantilla consistente para que la revision sea comparable semana a semana. Mantén un backlog de temas de discusion para semanas con menos incidentes.


### Como manejamos post-mortems sin culpa en la revision operativa?

Dedica 5 minutos al inicio de cada revision para discutir los incidentes de la semana anterior usando un enfoque sin culpa. Enfocate en que paso, por que paso, y que cambios sistemicos lo preveniran. Nunca culpes a individuos — culpa a sistemas, procesos y herramientas. Documenta action items de post-mortems y rastrelos en el tracker de action items. Comparte resumenes de post-mortems con el equipo amplio para aprendizaje. Celebra buenas respuestas a incidentes publicamente.

### Que es un presupuesto de error y como lo usamos en la revision?

Un presupuesto de error es la cantidad maxima de tiempo que un servicio puede fallar su SLO antes de que se requiera accion correctiva. Para un SLO de 99.9% en 30 dias, el presupuesto de error es 43 minutos. Rastrea el consumo del presupuesto de error semanalmente. Si un servicio ha consumido mas del 50% de su presupuesto en menos de la mitad del periodo, marcalo como en riesgo. Si el presupuesto se agota, congela cambios no esenciales y enfocate en mejoras de confiabilidad. Reporta el estado del presupuesto de error en cada revision operativa.

### Como rastreamos la salud del on-call en la revision?

Rastrea: numero de paginas por semana por ingeniero on-call, numero de escalaciones, paginas fuera de horario laboral, e indicadores de fatiga on-call (semanas consecutivas con muchas paginas). Objetivo: menos de 5 paginas por turno, menos de 2 paginas fuera de horario laboral. Si un ingeniero on-call recibe mas de 10 paginas en una semana, marcalo como un problema de salud on-call e investiga causas raiz. Rota los horarios on-call para prevenir burnout. Discute la salud on-call en cada revision operativa.

### Que herramientas deberiamos usar para la revision operativa?

Usa una combinacion de: dashboards de monitoreo (Grafana, Datadog) para datos de SLO e incidentes, herramientas de gestion de costos (AWS Cost Explorer, CloudHealth) para analisis de gasto, herramientas de gestion de incidentes (PagerDuty, Opsgenie) para logs de incidentes, y un documento compartido (Google Docs, Notion) para el reporte semanal. Automatiza la extraccion de datos con scripts o APIs donde sea posible. Mantén el formato de revision consistente semana a semana para analisis de tendencias. Almacena todos los reportes semanales en un archivo buscable para comparacion historica.





















End of document. Review and update quarterly.