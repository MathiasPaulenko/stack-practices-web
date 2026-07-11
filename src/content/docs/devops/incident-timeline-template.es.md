---
contentType: docs
slug: incident-timeline-template
title: "Plantilla de Linea de Tiempo de Incidentes"
description: "Una plantilla para reconstruir la secuencia exacta de eventos durante investigaciones de incidentes para identificar brechas de deteccion y retrasos en respuesta."
metaDescription: "Reconstruye eventos de incidentes con precision. Rastrea marcas de tiempo de deteccion, respuesta y resolucion para identificar brechas."
difficulty: beginner
topics:
  - devops
  - infrastructure
tags:
  - incident-management
  - timeline
  - postmortem
  - root-cause-analysis
  - template
  - sre
relatedResources:
  - /docs/devops/incident-communication-template
  - /docs/devops/postmortem-incident-review-template
  - /docs/devops/escalation-policy-template
  - /docs/devops/on-call-handoff-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Reconstruye eventos de incidentes con precision. Rastrea marcas de tiempo de deteccion, respuesta y resolucion para identificar brechas."
  keywords:
    - linea de tiempo de incidente
    - plantilla de postmortem
    - analisis de causa raiz
    - reconstruccion de incidente
    - plantilla de cronologia
---

## Overview

La mayoria de los postmortems de incidentes no logran identificar los problemas reales porque carecen de una cronologia precisa. Los equipos recuerdan los grandes eventos pero olvidan los 15 minutos de retraso en el escalamiento, los 30 minutos gastados revisando los logs incorrectos, o la brecha entre la primera alerta y el reconocimiento humano. Esta plantilla estructura la reconstruccion de incidentes con granularidad de cinco minutos, exponiendo los retrasos que realmente impulsan el MTTR.

## When to Use

Usa esta plantilla cuando:
- Realizas un postmortem despues de cualquier incidente P1 o P2
- Un incidente tomo considerablemente mas tiempo de lo esperado en resolverse
- Necesitas identificar si brechas de alertas, herramientas o procesos contribuyeron a los retrasos
- Construyes un caso para mejoras de infraestructura o monitoreo

## Prerequisites

Antes de reconstruir la cronologia:
- [ ] Reunir logs de todos los sistemas afectados (aplicacion, infraestructura, red)
- [ ] Recolectar marcas de tiempo de alertas de tu sistema de monitoreo
- [ ] Revisar el historial del canal de incidentes de Slack/Teams
- [ ] Entrevistar a cada respondedor que participo en el incidente
- [ ] Extraer logs de despliegues y cambios de configuracion de las 24 horas previas

## Solution

```markdown
# Linea de Tiempo de Incidente: `<Titulo del Incidente>`

## Metadatos

| Campo | Valor |
|-------|-------|
| ID del Incidente | ______ |
| Severidad | P1 / P2 / P3 / P4 |
| Fecha | ______ |
| Servicio(s) Afectado(s) | ______ |
| Comandante del Incidente | ______ |
| Autor de la Cronologia | ______ |

---

## Resumen

| Metrica | Valor |
|---------|-------|
| Tiempo hasta Detectar (TTD) | ______ |
| Tiempo hasta Reconocer (TTA) | ______ |
| Tiempo hasta Mitigar (TTM) | ______ |
| Tiempo hasta Resolver (TTR) | ______ |
| Duracion Total del Impacto al Cliente | ______ |

---

## Cronologia Detallada

| Hora (UTC) | Evento | Fuente | Actor | Notas |
|------------|--------|--------|-------|-------|
| T-2:00:00 | Ultimo estado conocido como saludable | Dashboard de monitoreo | Sistema | Metricas baseline normales |
| T-1:30:00 | Cambio de configuracion desplegado | Logs de CI/CD | deploy-bot | [enlace al cambio] |
| T-0:45:00 | Latencia comienza a aumentar | Metricas de APM | Sistema | p95 sube de 200ms a 500ms |
| T-0:15:00 | Primer pico de tasa de error | Rastreo de errores | Sistema | 0.1% → 2% de tasa de error |
| T+0:00:00 | **Alerta dispara: Tasa de error alta** | PagerDuty | Sistema | Umbral: >1% por 5 min |
| T+0:05:00 | Ingeniero de guardia notificado | PagerDuty | Sistema | |
| T+0:12:00 | Ingeniero de guardia reconoce | PagerDuty | [Nombre Ingeniero] | Retraso: 7 min (investigando otra alerta) |
| T+0:15:00 | Incidente declarado en Slack | Slack | [Nombre Ingeniero] | Canal: #incident-xxx |
| T+0:18:00 | Comienza investigacion inicial de logs | Shell | [Nombre Ingeniero] | Reviso logs de aplicacion primero |
| T+0:25:00 | Identificada correlacion con despliegue | Historial de Git | [Nombre Ingeniero] | Encontro cambio de config en T-1:30:00 |
| T+0:30:00 | Intento de rollback | CI/CD | [Nombre Ingeniero] | Rollback fallo: migracion nueva bloqueando |
| T+0:35:00 | Escalado a equipo de plataforma | Slack | [Nombre Ingeniero] | Ingeniero de plataforma se une en T+0:40 |
| T+0:45:00 | Equipo de plataforma identifica agotamiento del pool de conexiones de BD | Metricas de BD | [Ingeniero Plataforma] | Pool de conexiones maximo en 100 |
| T+0:50:00 | Aplicado aumento de emergencia del pool de conexiones | Cambio de config | [Ingeniero Plataforma] | Temporalmente elevado a 200 |
| T+0:55:00 | Tasa de error comienza a bajar | Monitoreo | Sistema | Baja a 0.5% |
| T+1:00:00 | Servicio declarado mitigado | Canal de incidente | [Nombre Ingeniero] | Impacto al cliente reducido |
| T+1:30:00 | Causa raiz confirmada: cambio de config filtraba conexiones | Revision de codigo | [Ingeniero Plataforma] | Conexion no cerrada en nuevo camino |
| T+2:00:00 | Solucion permanente desplegada | CI/CD | [Nombre Ingeniero] | Agregada limpieza de conexion apropiada |
| T+2:15:00 | Monitoreo confirma estabilidad | Dashboards | Sistema | Metricas en baseline por 15 min |
| T+2:15:00 | **Incidente resuelto** | Canal de incidente | [Nombre Ingeniero] | |

---

## Analisis de Retrasos

| Brecha | Duracion | Causa Raiz | Item de Accion |
|--------|----------|------------|----------------|
| Alerta a Reconocimiento | 7 min | Ingeniero investigando alerta de menor prioridad | MEJORA-1: Separar enrutamiento de alertas P1 vs P2 |
| Reconocimiento a Declaracion de Incidente | 3 min | Ingeniero intento solucionar solo primero | MEJORA-2: Requerir declaracion de incidente dentro de 5 min de alerta P1 |
| Fallo de Rollback | 5 min | Conflicto de migracion no documentado en runbook | MEJORA-3: Actualizar runbook de rollback con manejo de migraciones |
| Retraso de Escalamiento | 10 min | Equipo de plataforma no auto-incluido para problemas de BD | MEJORA-4: Agregar alertas de BD al enrutamiento del equipo de plataforma |
| Brecha de Deteccion | 15 min | Aumento de latencia no disparo alerta | MEJORA-5: Agregar alerta de latencia en p95 >400ms |

---

## Lo Que Funciono Bien

1. [Observacion positiva sobre la respuesta]
2. [Observacion positiva sobre la comunicacion]
3. [Observacion positiva sobre las herramientas]

## Lo Que Funciono Mal

1. [Observacion negativa sobre deteccion/alertas]
2. [Observacion negativa sobre el proceso de respuesta]
3. [Observacion negativa sobre documentacion/runbooks]

## Items de Accion

| ID | Accion | Responsable | Fecha Limite | Prioridad |
|----|--------|-------------|--------------|-----------|
| MEJORA-1 | ______ | ______ | ______ | Alta |
| MEJORA-2 | ______ | ______ | ______ | Alta |
| MEJORA-3 | ______ | ______ | ______ | Media |
| MEJORA-4 | ______ | ______ | ______ | Media |
| MEJORA-5 | ______ | ______ | ______ | Alta |
```

## Explanation

La cronologia expone **brechas** — los periodos donde no paso nada util. La mayoria de las mejoras de MTTR provienen de eliminar estas brechas, no de hacer mas rapido el trabajo activo. La plantilla fuerza a documentar la fuente de cada marca de tiempo (linea de log, mensaje de Slack, sistema de monitoreo) para que la cronologia sea verificable, no basada en memoria. El analisis de retrasos convierte la cronologia en mejoras útiles en lugar de solo un registro historico.

## Ejemplo Real de Timeline de Incidente

```text
=== Timeline de Incidente: INC-2026-07-11-001 ===

Severidad: SEV1 (Critico)
Servicio: auth-service
Inicio: 2026-07-11 10:55 UTC
Fin:    2026-07-11 11:25 UTC
Duracion: 30 minutos

TIMELINE:
10:42  [SISTEMA]  CPU de DB comienza a subir (metrica CloudWatch)
10:50  [SISTEMA]  CPU de DB llega a 95% (umbral: 80%)
10:52  [SISTEMA]  Latencia de login p99 excede 2s (umbral: 1s)
10:55  [ALERTA]   PagerDuty dispara: "auth-service latencia critica"
10:55  [ALERTA]   PagerDuty dispara: "DB CPU critico"
10:57  [HUMANO]   On-call reconoce ambas alertas
10:58  [HUMANO]   On-call abre canal de incidente #inc-2026-07-11
11:00  [HUMANO]   On-call declara SEV1 — 15% de logins fallando
11:01  [HUMANO]   On-call revisa despliegues recientes — config deploy a las 10:40
11:03  [HUMANO]   On-call identifica cambio de config: rotacion de JWT secret
11:04  [HUMANO]   On-call notifica a canal #support sobre problemas de login
11:05  [HUMANO]   On-call inicia rollback del cambio de config
11:08  [SISTEMA]  Rollback de config desplegado
11:08  [HUMANO]   On-call monitorea tasa de error: 15% -> 8% -> 3%
11:12  [SISTEMA]  Tasa de error cae debajo de 0.5%
11:12  [HUMANO]   On-call actualiza pagina de estado: "Problema identificado, fix desplegado"
11:15  [HUMANO]   On-call monitorea por 10 minutos (ventana de estabilidad)
11:25  [HUMANO]   On-call declara incidente resuelto
11:25  [HUMANO]   On-call actualiza pagina de estado: "Resuelto"

ANALISIS DE RETRASOS:
  Deteccion -> Alerta:        3 min  (CPU DB subiendo a las 10:42, alerta a las 10:55)
  Alerta -> Reconocimiento:   2 min  (Bien)
  Reconocimiento -> Declarar: 3 min  (Bien)
  Declarar -> Identificar:    4 min  (Bien — reviso deploys recientes)
  Identificar -> Fix:         3 min  (Bien — rollback rapido)
  Fix -> Estable:             7 min  (Aceptable — drenaje de tasa de error)
  Estable -> Resolver:       10 min  (Ventana de estabilidad estandar)

TOTAL: 30 minutos (RTO objetivo: 30 min — CUMPLIDO)
```


## Variants

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Postmortem sin culpa | Brechas de procesos y sistemas | Evita nombrar individuos; enfocate en fallas de sistemas |
| Resumen ejecutivo | Cronologia de impacto al negocio | Comprime a 5-10 eventos clave con impacto al cliente |
| Incidente de seguridad | Cronologia del vector de ataque | Incluye acciones del atacante y respuestas defensivas |
| Degradacion de rendimiento | Correlacion de metricas | Enfocate en cambios de metricas y sus efectos en cascada |

## Lo que funciona

1. **Construye la cronologia durante el incidente, no despues** — asigna un escriba para capturar marcas de tiempo en tiempo real
2. **Incluye eventos "negativos"** — nota cuando las alertas esperadas NO dispararon
3. **Cruza multiples fuentes** — no confies en una sola fuente de logs; la memoria es poco confiable
4. **Cuantifica cada brecha** — "pasamos algun tiempo" no sirve; "12 minutos" impulsa la mejora
5. **Revisa cronologias mensualmente** — busca patrones entre incidentes en lugar de tratar cada uno como unico

## Common Mistakes

1. **Construir la cronologia de memoria** — los humanos comprimen el tiempo y omiten retrasos incómodos
2. **Incluir solo acciones exitosas** — el rollback fallado que desperdicio 10 minutos es mas valioso que la solucion eventual
3. **Usar marcas de tiempo imprecisas** — "alrededor de las 2:30" no es suficiente; usa marcas de tiempo UTC exactas
4. **Olvidar la brecha de deteccion** — el tiempo entre cuando empezo el problema y cuando disparo la alerta frecuentemente es la brecha mas grande
5. **No conectar la cronologia a items de accion** — una cronologia sin seguimiento es solo una historia

## Frequently Asked Questions

### Como reconstruimos una cronologia si no capturamos marcas de tiempo durante el incidente?

Usa agregacion de logs (Splunk, Datadog, CloudWatch) para encontrar marcas de tiempo exactas de picos de error, despliegues, y eventos de sistema. Cruza referencia con historial de Slack, logs de PagerDuty, y marcas de tiempo de pipeline de CI/CD. Entrevista respondedores con preguntas especificas: "Que revisaste primero? Que viste?" en lugar de "Que paso?"

### Debemos incluir nombres de respondedores en la cronologia?

En postmortems sin culpa, enfocate en roles ("ingeniero de guardia", "ingeniero de plataforma") en lugar de nombres. El objetivo es mejorar sistemas, no evaluar individuos. Los nombres pueden ser relevantes en incidentes de seguridad o para entrevistas de seguimiento, pero mantenlos fuera de la cronologia publicada.

### Que tan detallada deberia ser la cronologia?

Apunta a eventos cada 5-10 minutos durante la respuesta activa. No necesitas documentar cada mensaje de Slack, pero deberias capturar cada accion, decision y escalamiento significativos. Si un periodo de 30 minutos no tiene entradas, esa es una brecha que vale la pena investigar.


### Como automatizamos la recopilacion de timeline durante incidentes?

Usa una herramienta de gestion de incidentes que capture timestamps automaticamente: PagerDuty, FireHydrant, o Rootly. Estas herramientas se integran con Slack, monitoreo y CI/CD para construir el timeline automaticamente. Usa un canal de Slack dedicado para incidentes con un bot que registre todos los mensajes con timestamps. Configura CloudWatch o Datadog para publicar anomalias de metricas al canal de incidentes. Usa un rol de scribe durante el incidente para registrar manualmente decisiones y acciones clave. Despues del incidente, exporta el timeline de la herramienta y refinelo para el post-mortem.

### Que es un post-mortem sin culpa y como soporta el timeline?

Un post-mortem sin culpa se enfoca en sistemas y procesos, no individuos. El timeline soporta esto mostrando que paso y cuando, sin asignar culpa. En lugar de "Alice tardo 10 minutos en identificar el problema", escribe "El ingeniero on-call tardo 10 minutos en identificar el problema porque el runbook no cubria este escenario." El timeline revela brechas sistemicas: alertas faltantes, runbooks poco claros, rutas de escalacion lentas. Los action items abordan estas brechas, no el rendimiento individual. Revisa el timeline con el equipo para validar hechos e identificar patrones.

### Como usamos timelines para encontrar patrones entre incidentes?

Mantén una base de datos de timelines de incidentes. Trimestralmente, revisa todos los timelines en busca de patrones: brechas de deteccion recurrentes (misma alerta faltante multiples veces), retrasos de escalacion recurrentes (mismo equipo lento en responder), fallos de rollback recurrentes (mismo problema de migracion), y retrasos de comunicacion recurrentes (pagina de estado no actualizada rapidamente). Crea un reporte de "top 5 patrones" para liderazgo. Prioriza action items que aborden patrones sobre problemas unicos. Rastrea la resolucion de patrones como metrica: "incidentes con brecha de deteccion reducidos de 60% a 30%."

### Deberiamos compartir timelines de incidentes con clientes?

Para incidentes SEV1-2, comparte un timeline resumido en el post-mortem publicado en la pagina de estado. Incluye: cuando empezo el problema, cuando fue detectado, cuando se desplego un fix, y cuando fue resuelto. Omite detalles de herramientas internas y nombres de responders. Para incidentes SEV3, un breve resumen es suficiente. El timeline muestra a los clientes que tomas los incidentes en serio y tienes un proceso de respuesta estructurado. Tambien establece expectativas para incidentes futuros — los clientes aprenden tus patrones de deteccion y resolucion.

### Como manejamos timelines para incidentes de larga duracion (multi-hora o multi-dia)?

Para incidentes largos, divide el timeline en fases: Deteccion, Investigacion, Mitigacion, Resolucion, Recuperacion. Dentro de cada fase, registra eventos clave cada 15-30 minutos. Para brechas mayores a 30 minutos, nota que se estaba investigando incluso si no se tomo accion. Asigna un scribe dedicado que rote cada 4 horas para prevenir fatiga. Usa el timeline para identificar cuando se perdio momentum (brechas largas sin progreso) — estas son oportunidades para escalacion. Despues de la resolucion, el timeline puede necesitar condensarse para el post-mortem, pero mantén la version completa para referencia.


### Como automatizamos la recopilacion de timeline durante incidentes?

Usa una herramienta de gestion de incidentes que capture timestamps automaticamente: PagerDuty, FireHydrant, o Rootly. Estas herramientas se integran con Slack, monitoreo y CI/CD para construir el timeline automaticamente. Usa un canal de Slack dedicado para incidentes con un bot que registre todos los mensajes con timestamps. Configura CloudWatch o Datadog para publicar anomalias de metricas al canal de incidentes. Usa un rol de scribe durante el incidente para registrar manualmente decisiones y acciones clave. Despues del incidente, exporta el timeline de la herramienta y refinelo para el post-mortem.

### Que es un post-mortem sin culpa y como soporta el timeline?

Un post-mortem sin culpa se enfoca en sistemas y procesos, no individuos. El timeline soporta esto mostrando que paso y cuando, sin asignar culpa. En lugar de "Alice tardo 10 minutos en identificar el problema", escribe "El ingeniero on-call tardo 10 minutos en identificar el problema porque el runbook no cubria este escenario." El timeline revela brechas sistemicas: alertas faltantes, runbooks poco claros, rutas de escalacion lentas. Los action items abordan estas brechas, no el rendimiento individual. Revisa el timeline con el equipo para validar hechos e identificar patrones.

### Como usamos timelines para encontrar patrones entre incidentes?

Mantén una base de datos de timelines de incidentes. Trimestralmente, revisa todos los timelines en busca de patrones: brechas de deteccion recurrentes, retrasos de escalacion recurrentes, fallos de rollback recurrentes, y retrasos de comunicacion recurrentes. Crea un reporte de "top 5 patrones" para liderazgo. Prioriza action items que aborden patrones sobre problemas unicos. Rastrea la resolucion de patrones como metrica: "incidentes con brecha de deteccion reducidos de 60% a 30%."

### Deberiamos compartir timelines de incidentes con clientes?

Para incidentes SEV1-2, comparte un timeline resumido en el post-mortem publicado en la pagina de estado. Incluye: cuando empezo el problema, cuando fue detectado, cuando se desplego un fix, y cuando fue resuelto. Omite detalles de herramientas internas y nombres de responders. Para incidentes SEV3, un breve resumen es suficiente. El timeline muestra a los clientes que tomas los incidentes en serio y tienes un proceso de respuesta estructurado.

### Como manejamos timelines para incidentes de larga duracion?

Para incidentes largos, divide el timeline en fases: Deteccion, Investigacion, Mitigacion, Resolucion, Recuperacion. Dentro de cada fase, registra eventos clave cada 15-30 minutos. Para brechas mayores a 30 minutos, nota que se estaba investigando incluso si no se tomo accion. Asigna un scribe dedicado que rote cada 4 horas para prevenir fatiga. Usa el timeline para identificar cuando se perdio momentum — estas son oportunidades para escalacion. Despues de la resolucion, el timeline puede necesitar condensarse para el post-mortem, pero mantén la version completa para referencia.
























End of document. Review and update quarterly.