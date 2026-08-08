---





contentType: docs
slug: incident-communication-template
title: "Plantilla de Comunicacion de Incidentes"
description: "Una plantilla para notificar a stakeholders durante interrupciones de produccion con mensajes pre-redactados para cada nivel de severidad y tipo de audiencia."
metaDescription: "Comunica claramente durante interrupciones. Plantilla con mensajes pre-redactados para clientes, ejecutivos y equipos por severidad."
difficulty: beginner
topics:
  - devops
  - infrastructure
tags:
  - incident-management
  - communication
  - template
  - outage
  - management
  - sre
relatedResources:
  - /docs/incident-timeline-template
  - /docs/escalation-policy-template
  - /docs/downtime-communication-template
  - /docs/on-call-handoff-template
  - /docs/data-breach-response-playbook
  - /docs/disaster-recovery-test-plan
  - /docs/postmortem-incident-review-template
  - /docs/production-readiness-review-template
  - /docs/service-ownership-document-template
  - /docs/api-status-page-template
lastUpdated: "2026-06-26"
publishedAt: "2026-06-26"
author: Mathias Paulenko
seo:
  metaDescription: "Comunica claramente durante interrupciones. Plantilla con mensajes pre-redactados para clientes, ejecutivos y equipos por severidad."
  keywords:
    - comunicacion de incidentes
    - plantilla de notificacion de interrupcion
    - comunicacion con stakeholders
    - plantilla de actualizacion de incidente
    - mensaje de interrupcion a clientes





---

## Overview

Una comunicacion deficiente de incidentes convierte un problema tecnico en un problema de confianza. Cuando los clientes no saben que esta pasando, asumen lo peor. Cuando los ejecutivos se sorprenden, exigen explicaciones en lugar de ofrecer apoyo. Esta plantilla proporciona mensajes pre-redactados para cada audiencia y nivel de severidad, para que tu equipo comunique claramente, consistentemente y rapidamente durante las interrupciones.

## When to Use


- For alternatives, see [Incident Timeline Template](/es/docs/incident-timeline-template/).

Usa esta plantilla cuando:
- Una interrupcion de produccion impacta clientes o usuarios internos
- Un incidente cruza umbrales de severidad que requieren notificacion a stakeholders
- Necesitas proporcionar actualizaciones de estado durante un incidente prolongado
- Despues del incidente, necesitas redactar la comunicacion final a las partes afectadas

## Prerequisites

Antes de enviar comunicaciones:
- [ ] Confirmar el alcance del impacto (que servicios, regiones, segmentos de usuarios)
- [ ] Verificar el nivel de severidad con el comandante del incidente
- [ ] Identificar los canales de comunicacion correctos para cada audiencia
- [ ] Revisar cualquier requisito regulatorio o contractual de notificacion

## Solution

```markdown
# Comunicacion de Incidente: `<Titulo del Incidente>`

## Metadatos

| Campo | Valor |
|-------|-------|
| ID del Incidente | ______ |
| Severidad | P1 / P2 / P3 / P4 |
| Hora de Inicio (UTC) | ______ |
| Estado | Investigando / Identificado / Monitoreando / Resuelto |
| Comandante del Incidente | ______ |
| Responsable de Comunicacion | ______ |

---

## Mensaje 1: Notificacion Inicial

### Para Clientes (Pagina de Estado / Email)

**Severidad: P1 (Critico)**

> Estamos investigando reportes de indisponibilidad de [servicio]. Proporcionaremos una actualizacion dentro de 30 minutos o tan pronto como tengamos mas informacion.
>
> **Servicios impactados:** [Lista de servicios]
> **Iniciado a las:** [Hora UTC]
> **Proxima actualizacion:** [Hora UTC + 30 min]

**Severidad: P2 (Alto)**

> Estamos investigando rendimiento degradado en [servicio]. Algunos usuarios pueden experimentar [sintoma especifico]. Proporcionaremos una actualizacion dentro de 60 minutos.
>
> **Servicios impactados:** [Lista de servicios]
> **Iniciado a las:** [Hora UTC]
> **Proxima actualizacion:** [Hora UTC + 60 min]

**Severidad: P3/P4 (Medio/Bajo)**

> Tenemos conocimiento de un problema que afecta [descripcion del servicio]. El impacto esta limitado a [alcance]. Una solucion esta en progreso y esperamos resolucion dentro de [plazo].

---

### Para Stakeholders Internos (Slack / Email)

**Severidad: P1/P2**

> **ALERTA DE INCIDENTE** — [Servicio] — [Severidad]
>
> Se ha declarado un incidente para [servicio]. Impacto: [breve descripcion]. Comandante: [nombre]. Canal: [enlace].
>
> No se requiere accion de tu equipo en este momento. Las actualizaciones se publicaran en [canal].

**Severidad: P3/P4**

> **Notificacion de Incidente** — [Servicio] — [Severidad]
>
> Se ha abierto un incidente para [servicio]. El impacto esta limitado a [alcance]. No se espera impacto orientado al cliente. Seguimiento en [canal].

---

### Para Ejecutivos (Email / Slack DM)

> **Resumen de Incidente** — [Servicio] — [Severidad]
>
> **Impacto:** [numero] clientes / [porcentaje]% de trafico / [region]
> **Riesgo de Ingresos:** [Alto / Medio / Bajo / Ninguno]
> **Causa Raiz (preliminar):** [una oracion si se conoce]
> **ETA para Resolucion:** [tiempo si se conoce]
> **Acciones Tomadas:** [lo que se ha hecho hasta ahora]
>
> Enviare una actualizacion dentro de [plazo].

---

## Mensaje 2: Actualizacion de Estado

### Para Clientes

> **Actualizacion** — [Servicio] — [Hora UTC]
>
> Hemos [identificado la causa / implementado una mitigacion / desplegado una solucion] para el problema de [servicio]. [Breve descripcion de lo que paso y que se hizo].
>
> **Estado:** Monitoreando / En Progreso
> **Proxima actualizacion:** [Hora UTC]

---

### Para Stakeholders Internos

> **Actualizacion de Incidente** — [INC-xxx] — [Hora UTC]
>
> **Estado:** [Investigando / Identificado / Mitigado / Monitoreando]
> **Lo que sabemos:** [resumen de 2-3 oraciones]
> **Lo que estamos haciendo:** [acciones actuales]
> **Lo que necesitamos:** [cualquier ayuda requerida de otros equipos]
> **Proxima actualizacion:** [Hora UTC]

---

### Para Ejecutivos

> **Actualizacion de Incidente** — [INC-xxx] — [Hora UTC]
>
> **Estado Actual:** [Investigando / Mitigado / Monitoreando]
> **Impacto al Cliente:** [numeros actualizados si cambiaron]
> **Causa Raiz:** [entendimiento actualizado]
> **ETA para Resolucion Completa:** [estimacion actualizada]
> **Riesgo de Recurrencia:** [Alto / Medio / Bajo]
> **Postmortem Programado:** [Fecha / Por Determinar]

---

## Mensaje 3: Resolucion

### Para Clientes

> **Resuelto** — [Servicio] — [Hora UTC]
>
> El problema que afectaba [servicio] ha sido resuelto. Todos los sistemas estan operando normalmente.
>
> **Duracion:** [hora de inicio] a [hora de fin] ([duracion])
> **Impacto:** [resumen de lo que experimentaron los usuarios]
> **Causa Raiz:** [breve descripcion no tecnica]
> **Acciones Preventivas:** [lo que estamos haciendo para prevenir recurrencia]
>
> Pedimos disculpas por cualquier inconveniente. Si continuas experimentando problemas, contacta [canal de soporte].

---

### Para Stakeholders Internos

> **INCIDENTE RESUELTO** — [INC-xxx] — [Hora UTC]
>
> El incidente que afectaba [servicio] ha sido resuelto.
>
> **Duracion:** [duracion]
> **Causa Raiz:** [descripcion tecnica]
> **Resolucion:** [lo que lo soluciono]
> **Postmortem:** [Fecha / Por Determinar] — [Enlace cuando este disponible]
> **Items de Accion:** [Enlace al seguimiento]

---

### Para Ejecutivos

> **Incidente Cerrado** — [INC-xxx] — [Hora UTC]
>
> **Estado Final:** Resuelto
> **Duracion Total:** [duracion]
> **Impacto al Cliente:** [numeros finales]
> **Impacto en Ingresos:** [si aplica]
> **Causa Raiz:** [un parrafo]
> **Acciones Preventivas:** [lista]
> **Postmortem:** [Fecha] — [Enlace]
> **Seguimiento Requerido:** [Si / No — detalles si si]

---

## Reglas de Comunicacion

1. Se honesto sobre lo que sabes. No adivines causas raiz
2. Proporciona ETAs solo si estas confiado. ETAs incumplidos destruyen confianza mas rapido que ningun ETA
3. Actualiza segun lo programado aunque no haya progreso. El silencio genera ansiedad
4. Usa el mismo canal para actualizaciones. No hagas que los stakeholders busquen informacion
5. Adapta la profundidad tecnica a la audiencia. Los ejecutivos necesitan impacto, los ingenieros necesitan detalles

## Frecuencia de Comunicacion por Severidad

| Severidad | Notificacion Inicial | Actualizaciones | Resolucion |
|-----------|---------------------|-----------------|------------|
| P1 | Inmediata | Cada 15-30 min | Dentro de 15 min de resolucion |
| P2 | Dentro de 15 min | Cada 30-60 min | Dentro de 30 min de resolucion |
| P3 | Dentro de 30 min | Cada 2-4 horas | Dentro de 1 hora de resolucion |
| P4 | Dentro de 1 hora | Diariamente o al cambiar | Dentro de 1 hora de resolucion |
```

## Explanation

La plantilla separa las comunicaciones por **audiencia** (los clientes necesitan tranquilidad y plazos, los ejecutivos necesitan impacto al negocio, los equipos internos necesitan coordinacion tecnica) y **momento** (inicial, actualizacion, resolucion). El principio clave es que cada mensaje responde tres preguntas: que paso, que estamos haciendo al respecto, y cuando actualizaremos. Sin esos tres elementos, la comunicacion genera mas ansiedad de la que resuelve.

## Variants

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| SaaS orientado al cliente | Pagina de estado + email | Automatizar via herramienta de pagina de estado (Statuspage, Instatus) |
| Solo herramientas internas | Slack + email | No se necesita comunicacion externa |
| Incidente de seguridad | Revision legal + PR primero | Nunca comuniques incidentes de seguridad sin autorizacion legal |
| Brecha de datos | Notificacion regulatoria | Puede requerir notificacion de 72 horas bajo GDPR |
| Interrupcion de app movil | Banner en app + redes sociales | Los usuarios pueden no revisar email durante la interrupcion |

## Lo que funciona

1. Redacta plantillas durante periodos de calma. Crea versiones especificas para tus servicios antes de que ocurra un incidente
2. Asigna un responsable de comunicacion separado del comandante del incidente durante P1s
3. Revisa mensajes por tono. Evita jerga, culpa, o explicaciones demasiado tecnicas
4. Incluye una firma humana. Los mensajes firmados se sienten mas autenticos que actualizaciones genericas
5. Monitorea retrasos en comunicacion. Si toma 20 minutos redactar una actualizacion, tu proceso es demasiado lento

## Common Mistakes

1. Decir "estamos investigando" por horas. Proporciona actualizaciones significativas o admite que estas atascado
2. Prometer tiempos de resolucion excesivos. Da rangos ("1-2 horas") en lugar de tiempos exactos
3. Usar terminologia diferente entre canales. "degradado" en la pagina de estado y "interrupcion" en Slack crea confusion
4. Olvidar notificar a equipos internos. La comunicacion al cliente es visible, pero los equipos internos tambien necesitan coordinacion
5. Enviar resolucion antes de verificar. Confirmar resolucion prematuramente lleva a reaperturas

## FAQ

### Como manejamos incidentes donde aun no conocemos la causa raiz?

Indica lo que sabes, lo que has descartado, y lo que estas verificando. Ejemplo: "Hemos identificado que el problema esta aislado a la capa de API. Las capas de base de datos y cache operan normalmente. Estamos investigando cambios de configuracion desplegados en las ultimas 24 horas."

### Deberiamos disculparnos en las comunicaciones de incidentes?

Si, pero proporcionalmente. Un breve "pedimos disculpas por el inconveniente" es apropiado para interrupciones orientadas al cliente. Evita lenguaje de disculpa excesivo que suene poco sincero. Enfocate en hechos y remedios.

### Que pasa si un incidente abarca multiples zonas horarias?

Usa siempre UTC para todas las marcas de tiempo. Incluye la hora local de la region principal afectada si es relevante. Asegurate de que el relevo entre turnos incluya el estado de comunicacion para que las actualizaciones no se detengan cuando los equipos se desconectan.


## Mejores Practicas Adicionales

1. **Mantén una matriz de mapeo severidad-audiencia.** No todos los niveles de severidad requieren notificar a cada audiencia. Documenta quien es notificado y cuando:

```markdown
## Notification Matrix

| Severity | Customers | Internal Teams | Executives | Legal/PR |
|----------|-----------|----------------|------------|----------|
| P1 | Immediate | Immediate | Within 15 min | If data involved |
| P2 | Within 15 min | Immediate | Within 30 min | If data involved |
| P3 | Within 30 min | Within 15 min | No | No |
| P4 | Status page only | Within 1 hour | No | No |
```

2. **Pre-construye plantillas de mensaje para tus top 5 servicios.** Las plantillas genericas requieren llenar demasiados espacios en blanco durante un incidente. Pre-llena nombres de servicios, componentes afectados y descripciones de impacto comun:

```yaml
# templates/checkout-service-p1.yaml
service: checkout-service
severity: P1
affected_components:
  - api-gateway
  - checkout-api
  - payment-processor
default_impact: "Customers unable to complete checkout. Payment processing affected."
status_page_components:
  - "chk8wxy1"  # Statuspage component ID
stakeholders:
  - "#payments-oncall"
  - "#engineering-leads"
  - "exec-team@company.com"
```

## Errores Comunes Adicionales

1. **Enviar detalles tecnicos a los clientes.** Los clientes necesitan saber impacto y ETA, no que "el pool de conexiones se agoto debido a una configuracion incorrecta de HikariCP maxPoolSize." Traduce los hallazgos tecnicos a lenguaje orientado al usuario:

```markdown
# Technical (internal only)
Root cause: HikariCP maxPoolSize set to 10 instead of 50 after config migration.
Database connections exhausted under load, causing 500s on checkout endpoint.

# Customer-facing
Some customers were unable to complete checkout due to a configuration issue
in our payment processing system. The issue has been resolved and all systems
are operating normally.
```

2. **No asignar un responsable de comunicacion dedicado para incidentes P1.** Cuando el comandante del incidente tambien maneja la comunicacion, ambos sufren. El comandante pierde foco en la mitigacion, y la comunicacion se retrasa. Para incidentes P1, siempre asigna un responsable de comunicacion separado cuyo unico trabajo sea redactar y enviar actualizaciones.

## FAQ Adicionales

### Como manejamos la comunicacion cuando el incidente es causado por un proveedor externo?

Se transparente pero no culpes a los socios. Indica que estas experimentando problemas relacionados con una dependencia, que estas haciendo para mitigar, y que estas trabajando con el proveedor. Ejemplo: "Estamos experimentando rendimiento degradado debido a un problema con nuestro proveedor cloud. Estamos implementando rutas alternativas y trabajando con el proveedor para resolver el problema subyacente." Haz seguimiento con un postmortem que incluya si necesitas agregar redundancia para ese proveedor.

### Que comunicacion se necesita despues de que el incidente se resuelve?

Envia un mensaje de resolucion a todas las audiencias dentro del plazo del SLA. Programa un postmortem dentro de 48 horas. Publica un postmortem publico para incidentes P1/P2 dentro de 5 dias habiles. Envia un seguimiento a los clientes que abrieron tickets de soporte durante el incidente con un resumen y cualquier accion de remediacion. Actualiza la pagina de estado a operacional y remueve los banners de incidente.
