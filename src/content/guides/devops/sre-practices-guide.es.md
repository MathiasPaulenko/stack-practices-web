---
contentType: guides
slug: sre-practices-guide
title: "Site Reliability Engineering — Practicas SRE y Presupuestos de Error"
description: "Guia practica de SRE: definir SLIs, SLOs y SLAs, gestionar presupuestos de error, reducir toil, rotaciones de guardia y construir una cultura de confiabilidad."
metaDescription: "Aprende practicas SRE: define SLIs, SLOs, SLAs, gestiona presupuestos de error, reduce toil y construye rotaciones on-call para confiabilidad en produccion."
difficulty: intermediate
topics:
  - devops
  - observability
  - performance
tags:
  - sre
  - site-reliability-engineering
  - slo
  - sli
  - sla
  - presupuesto-error
  - toil
  - guardia
  - guia
relatedResources:
  - /guides/observability-guide
  - /guides/chaos-engineering-guide
  - /guides/platform-engineering-guide
  - /recipes/devops/setup-slo-dashboards
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende practicas SRE: define SLIs, SLOs, SLAs, gestiona presupuestos de error, reduce toil y construye rotaciones on-call para confiabilidad en produccion."
  keywords:
    - sre
    - site-reliability-engineering
    - slo
    - sli
    - sla
    - presupuesto-error
    - toil
    - guardia
    - guia
---

## Overview

Site Reliability Engineering (SRE), pionero en Google, aplica principios de ingenieria de software a las operaciones. En lugar de tratar la confiabilidad como una funcion separada, los equipos SRE escriben codigo para automatizar operaciones, gestionar infraestructura y medir la salud del sistema a traves de Service Level Objectives (SLOs). El principio central: la confiabilidad es una caracteristica, no una ocurrencia tardia. SRE balancea la necesidad de velocidad (enviar features) con la necesidad de estabilidad (mantener sistemas corriendo) a traves de presupuestos de error, presupuestos de toil y postmortems sin culpa.

## When to Use

- Operas sistemas en produccion donde el downtime tiene impacto de negocio
- Los equipos de desarrollo y operaciones estan en conflicto sobre velocidad de release vs estabilidad
- Necesitas definiciones objetivas y medibles de "confiable"
- El trabajo operacional manual consume tiempo significativo de ingenieria
- La respuesta a incidentes es reactiva y ad-hoc en lugar de estructurada

## La Jerarquia de Conceptos de Confiabilidad

| Concepto | Definicion | Ejemplo |
|----------|-----------|---------|
| **SLI** | Service Level Indicator — que mides | "Percentil 99 de latencia de requests" |
| **SLO** | Service Level Objective — target en el tiempo | "p99 latencia < 200ms en 30 dias" |
| **SLA** | Service Level Agreement — contrato con penalidad | "99.9% uptime o 10% credito de servicio" |
| **Presupuesto de error** | 1 - SLO; cantidad de fallo aceptable | 0.1% presupuesto = 43m downtime/mes |

## Definiendo SLIs

Elige indicadores de los que los usuarios realmente se preocupan:

| Orientado al usuario | Orientado al sistema |
|----------------------|---------------------|
| Latencia de request | Utilizacion de CPU |
| Tasa de error | Presion de memoria |
| Throughput | Profundidad de cola |
| Disponibilidad | Lag de replicacion |

**Ejemplo de SLI de latencia:**
```
SLI = proporcion de requests con latencia < 200ms
medida sobre una ventana de 1 minuto
```

## Estableciendo SLOs

1. **Comienza con lo que puedes medir** — no establezcas un SLO que no puedas trackear
2. **Basado en rendimiento historico** — mira los ultimos 30-90 dias, elige el percentil 50, no el mejor caso
3. **Deja margen** — si estas en 99.9%, establece SLO en 99.5% para permitir crecimiento
4. **Revisa trimestralmente** — ajusta segun necesidades de negocio y capacidad tecnica

| SLO | Presupuesto de error (mensual) | Caso de uso |
|-----|-------------------------------|-------------|
| 99% | 7.3 horas | Herramientas internas, no criticas |
| 99.9% | 43 minutos | Servicios orientados a clientes |
| 99.99% | 4.3 minutos | Sistemas core de revenue |
| 99.999% | 26 segundos | Raramente justificado; extremadamente caro |

## Politica de Presupuesto de Error

```
SI presupuesto_restante > 50%:
    → Velocidad de release completa

SI 25% < presupuesto_restante < 50%:
    → Requiere revision SRE para cambios riesgosos

SI 0% < presupuesto_restante < 25%:
    → Congelar todos los releases no criticos
    → Priorizar trabajo de confiabilidad

SI presupuesto_agotado:
    → Todo trabajo de features se detiene
    → Solo fixes de confiabilidad y mitigacion
```

## Reduccion de Toil

**Toil** es trabajo operacional manual, repetitivo, automatizable sin valor duradero.

| Tipo de toil | Enfoque de automatizacion |
|--------------|--------------------------|
| Escalamiento manual | Horizontal pod autoscaling, cluster autoscaler |
| Despliegues manuales | Pipelines CI/CD con analisis de canary automatico |
| Revision manual de logs | Alertar en metricas derivadas, no logs raw |
| Cambios por tickets | Portales de self-service con guardrails |
| Paginas on-call para issues conocidos | Runbooks de auto-remediacion |

**Presupuesto de toil:** Google recomienda limitar el toil al 50% del tiempo de un SRE. El otro 50% va a trabajo de proyecto que mejora el sistema.

## Diseno de Rotacion On-Call

| Patron | Mejor para | Tamano de roster |
|--------|----------|------------------|
| **Primario/secundario** | Equipos pequenos, servicios criticos | 4-6 personas |
| **Follow-the-sun** | Equipos globales, cobertura 24/7 | 3+ regiones |
| **Sin guardia (pagerless)** | Equipos con automatizacion madura | Requiere inversion significativa |

**Metricas de salud on-call:**
- Paginas por guardia (target: < 2)
- Tiempo de acknowledge (target: < 5 minutos)
- Tiempo de resolucion (trackear, pero no targetear — calidad sobre velocidad)
- Action items post-incidente cerrados en 30 dias (target: 100%)

## Postmortem Sin Culpa

```markdown
## Incidente: [Descripcion corta] — [Fecha]

### Impacto
- Duracion: 23 minutos
- Usuarios afectados: ~1,200
- Impacto revenue: $0 (tier gratuito)

### Linea de tiempo
- 14:32 — Alerta de monitoreo disparada
- 14:35 — On-call acknowledge
- 14:40 — Causa raiz identificada (agotamiento de pool de conexiones DB)
- 14:55 — Servicio completamente recuperado

### Causa Raiz
El pool de conexiones estaba dimensionado para 100 conexiones. Un despliegue duplico el trafico sin escalar el pool.

### Factores Contribuyentes
- Sin prueba de carga para el nuevo despliegue
- Tamano del pool de conexiones no expuesto como configurable
- Umbral de alerta demasiado alto (solo disparo a 95% de tasa de error)

### Action Items
| Owner | Tarea | Fecha limite |
|-------|-------|--------------|
| @alice | Agregar autoscaling de pool de conexiones | 2026-07-15 |
| @bob | Ejecutar pruebas de carga en staging | 2026-07-01 |
| @charlie | Bajar alerta de tasa de error a 1% | 2026-06-30 |

### Lecciones Aprendidas
Necesitamos tratar los pools de conexiones como recursos elasticos, no constantes fijos.
```

## Common Mistakes

- **Establecer SLOs demasiado altos** — 99.999% suena impresionante pero cuesta 10x mas que 99.9% por beneficio marginal
- **Usar SLAs como SLOs** — Las SLAs son contratos externos; los SLOs son targets internos. Los SLOs deben ser mas estrictos que las SLAs.
- **Sin politica de presupuesto de error** — sin consecuencias por quemar presupuesto, los SLOs carecen de significado
- **Toil que "es parte del trabajo"** — si es repetitivo y manual, es toil. Automatizalo.
- **Postmortems con culpa** — enfocarse en quien cometio un error crea miedo y oculta problemas sistémicos

## FAQ

**Cual es la diferencia entre SRE y DevOps?**
DevOps es un movimiento cultural y un conjunto de practicas. SRE es una implementacion especifica de principios DevOps con targets de confiabilidad cuantitativos y un tope de 50% de toil.

**Como convenzo a management de adoptar SLOs?**
Enmarca los SLOs como gestion de riesgos. Responden "Que tan rapido podemos enviar sin romper la confianza del cliente?" Los presupuestos de error crean una conversacion data-driven entre ingenieria y producto.

**Deberia cada equipo tener un SRE?**
No necesariamente. Comienza con SLOs y presupuestos de error. A medida que crece el toil, dedica tiempo de ingenieria a automatizacion. Cuando eso no es suficiente, forma un equipo SRE dedicado.
