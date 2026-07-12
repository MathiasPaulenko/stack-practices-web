---



contentType: docs
slug: change-management-template
title: "Plantilla de Gestión de Cambios"
description: "Plantilla para documentar revisiones CAB y criterios de reversión para cambios en producción."
metaDescription: "Usa esta plantilla de gestión de cambios para documentar revisiones CAB, flujos de aprobación y criterios de reversión para cambios en producción."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - change-management
  - cab
  - rollback
  - operations
  - template
relatedResources:
  - /docs/bug-triage-template
  - /docs/runbook-template
  - /docs/auto-scaling-policy-template
  - /docs/backup-and-restore-template
  - /docs/cloud-cost-allocation-template
  - /docs/service-level-objective-template
  - /docs/weekly-ops-review-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de gestión de cambios para documentar revisiones CAB, flujos de aprobación y criterios de reversión para cambios en producción."
  keywords:
    - devops
    - gestion-cambios
    - cab
    - rollback
    - operaciones
    - plantilla



---
## Visión General

Los cambios en producción son riesgosos. Una migración de base de datos, una actualización de configuración o un cambio de feature flag pueden desencadenar una interrupción. La gestión de cambios no es burocracia: es una forma estructurada de reducir sorpresas. Esta plantilla documenta el flujo de revisión, aprobación y reversión para cualquier cambio que toque producción, asegurando que las personas correctas hayan revisado el riesgo y que la ruta de reversión esté lista antes de comenzar.

## Cuándo Usar


- For alternatives, see [Bug Triage Template](/es/docs/bug-triage-template/).

Usa este recurso cuando:
- Introduces un cambio en infraestructura de producción, bases de datos o configuración
- Tu marco de cumplimiento (SOC 2, ISO 27001) requiere aprobación documentada de cambios
- Una interrupción reciente fue causada por un cambio no revisado o no probado

## Solución

```markdown
# Solicitud de Cambio: `<Título>`

## 1. Resumen del Cambio

| Campo | Valor |
|-------|-------|
| ID de Cambio | `CHG-AAAA-NNNN` |
| Título | `descripcion` |
| Solicitante | `@nombre` |
| Equipo | `equipo` |
| Entorno | `staging / producción` |
| Fecha / Hora Programada | `AAAA-MM-DD HH:MM UTC` |
| Duración (esperada) | `X minutos / horas` |
| Nivel de Riesgo | `Bajo / Medio / Alto / Crítico` |

## 2. Descripción del Cambio

**¿Qué está cambiando?**
[Describe el cambio técnico en un párrafo.]

**¿Por qué se necesita?**
[Enlace al ticket, incidente o justificación de negocio.]

**¿Cuáles son los resultados esperados?**
[Resultado medible: latencia reducida en X%, característica habilitada para Y% de usuarios.]

## 3. Análisis de Impacto

| Sistema / Servicio | Impacto | Método de Validación |
|--------------------|---------|----------------------|
| | | |

### Dependencias
- [ ] No hay servicios dependientes afectados
- [ ] Servicios dependientes notificados: `lista`
- [ ] Socios externos / clientes notificados: `lista`

### Evaluación de Riesgo

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| | | | |

## 4. Plan de Reversión

| Condición | Acción de Reversión | Tiempo para Completar | Responsable |
|-----------|--------------------|-----------------------|-------------|
| El cambio falla durante el despliegue | `git revert` / `terraform destroy -target` / rollback de config | 10 min | `@nombre` |
| Degradación de rendimiento > 20% | Rollback a imagen anterior / revertir migración | 15 min | `@nombre` |
| Inconsistencia de datos detectada | Restaurar desde snapshot pre-cambio | 30 min | `@nombre` |
| Modo de fallo desconocido | Página a guardia; ejecutar runbook de reversión de emergencia | 5 min | `@guardia` |

- [ ] La reversión se ha probado en staging
- [ ] El comando de reversión está documentado en el runbook
- [ ] Snapshot / copia de seguridad de base de datos tomada antes del cambio
- [ ] El kill switch de feature flag está listo (si aplica)

## 5. Aprobación

| Rol | Nombre | Aprobado | Fecha |
|-----|--------|----------|-------|
| Solicitante | | | |
| Revisor Técnico | | | |
| Product Owner (si afecta usuarios) | | | |
| Seguridad (si involucra datos / acceso) | | | |
| CAB / Manager (riesgo Alto+) | | | |

## 6. Registro de Ejecución

| Hora (UTC) | Paso | Resultado | Notas |
|------------|------|-----------|-------|
| | | | |

## 7. Revisión Post-Cambio

- [ ] Cambio completado según lo planeado
- [ ] El monitoreo no muestra anomalías durante 1 hora post-cambio
- [ ] Plan de reversión archivado / actualizado basado en lecciones
- [ ] Ticket cerrado con resumen de resultado
```

## Explicación

La plantilla impone **tres compuertas** antes de cualquier cambio en producción: una descripción que justifica el cambio, un análisis de impacto que revela dependencias ocultas, y un plan de reversión que está listo antes de que comience el cambio. El nivel de riesgo determina quién debe aprobar: los cambios de bajo riesgo pueden necesitar solo revisión por pares, mientras que los de alto riesgo requieren un Change Advisory Board (CAB) y aprobación explícita de seguridad. El registro de ejecución crea una trazabilidad de auditoría invaluable durante post-mortems y auditorías de cumplimiento.

## Matriz de Evaluacion de Riesgo de Cambios

```text
=== Evaluacion de Riesgo de Cambios ===

Criterios de Nivel de Riesgo:

CRITICO:
  - Cambios en autenticacion o autorizacion
  - Cambios de esquema de base de datos que afectan datos de produccion
  - Cambios de infraestructura de red (VPC, firewall, DNS)
  - Cambios durante periodos de congelacion (Black Friday, lanzamiento)
  - Cambios que afectan > 50% del trafico de usuarios
  Aprobacion: CAB + Seguridad + Director de Ingenieria

ALTO:
  - Cambios en configuracion de produccion
  - Cambios de contrato de API que afectan consumidores externos
  - Cambios de scaling de infraestructura
  - Adicion/eliminacion de indices de base de datos
  - Cambios que afectan 10-50% del trafico de usuarios
  Aprobacion: CAB + Team Lead

MEDIO:
  - Activacion/desactivacion de feature flags en produccion
  - Adiciones no-rompedoras de API
  - Actualizaciones de parametros de configuracion
  - Actualizaciones de version de dependencias
  Aprobacion: Team Lead + Revision de Par

BAJO:
  - Cambios de CSS/estilos
  - Actualizaciones de texto/copy
  - Actualizaciones de documentacion
  - Cambios en entornos no productivos
  Aprobacion: Revision de Par
```

## Calendario de Cambios y Deteccion de Colisiones

```text
=== Calendario de Cambios (Semana del 2026-07-08) ===

Lunes     2026-07-08
  10:00  [MEDIO]   Desplegar API v2.3.1 (team-a)       Estado: Aprobado
  14:00  [BAJO]    Actualizar sitio docs (team-b)       Estado: Aprobado

Martes    2026-07-09
  09:00  [ALTO]    Migracion DB: agregar indice (dba)   Estado: Pendiente CAB
  15:00  [MEDIO]   Feature flag: checkout-v2 (team-c)   Estado: Aprobado

Miercoles 2026-07-10
  --     DIA DE CONGELACION (lanzamiento)              No se permiten cambios

Jueves    2026-07-11
  10:00  [CRITICO] Upgrade servicio auth (sec)         Estado: Pendiente CAB
  11:00  [MEDIO]   Desplegar frontend v3.1 (team-d)     Estado: Pendiente
  COLISION DETECTADA: Upgrade auth + deploy frontend al mismo tiempo
  RESOLUCION: Mover deploy frontend a 14:00

Viernes   2026-07-12
  09:00  [BAJO]    Limpiar buckets S3 no usados (platform)  Estado: Aprobado
  --     No cambios ALTO/CRITICO despues de 12:00 (seguridad fin de semana)
```

## Plantilla de Revision Post-Cambio

```text
=== Revision Post-Cambio ===

Change ID: CHG-2026-07-11-001
Titulo: Desplegar API v2.3.1
Nivel de Riesgo: MEDIO
Responsable: alice@example.com
Revisor: bob@example.com

Resumen de Ejecucion:
  Inicio planificado:  10:00 UTC
  Inicio real:         10:02 UTC
  Fin planificado:     10:30 UTC
  Fin real:            10:35 UTC
  Varianza:            +5 minutos

Resultado:
  [x] Cambio completado como estaba planificado
  [x] Todos los pasos de despliegue tuvieron exito
  [x] Smoke tests pasaron
  [x] Monitoreo no muestra anomalias (1h post-cambio)
  [x] No fue necesario rollback
  [x] Ticket cerrado con resumen de resultado

Problemas Encontrados:
  - La migracion tardo 3 min mas de lo esperado por tamano de tabla
  - Sin impacto al usuario

Lecciones Aprendidas:
  - Actualizar estimacion de tiempo de migracion para tablas > 10M filas
  - Considerar pre-calentar cache despues de migracion

Acciones de Seguimiento:
  - Actualizar runbook con nueva estimacion (alice, para 2026-07-18)
  - Agregar paso de cache warming al script (platform, para 2026-07-25)
```


## Variantes

| Contexto | Compuerta de Aprobación | Enfoque |
|----------|------------------------|---------|
| Startup / equipo pequeño | Revisión por pares + líder de equipo | Velocidad; documentación ligera |
| Empresa / regulado | CAB + seguridad + cumplimiento | Trazabilidad completa; aprobación formal |
| Infraestructura (Terraform) | Revisión de IaC + diff del plan | Verificar que no haya cambios destructivos |
| Migración de base de datos | Revisión de DBA + script de reversión | La integridad de datos es la prioridad |
| Despliegue gradual de feature flag | Producto + ingeniería | Exposición gradual; reversión instantánea vía flag |
| Cambio de emergencia | Aprobación post-hoc dentro de 24 horas | Arreglar primero, documentar después—pero documentar |

## Lo que funciona

1. Clasifica el riesgo objetivamente; si el cambio toca facturación, autenticación o datos, es al menos Medio
2. Nunca apruebes tu propio cambio; requiere al menos un revisor independiente
3. Prueba la reversión en staging, no solo el cambio hacia adelante
4. Programa cambios de alto riesgo durante ventanas de bajo tráfico con todo el equipo disponible
5. Mantén un calendario de cambios visible para todos los equipos para evitar colisiones (dos cambios riesgosos a la vez)

## Errores Comunes

1. Tratar cambios "simples" como de bajo riesgo sin análisis de impacto
2. No notificar a equipos downstream que dependen del servicio cambiado
3. Omitir la prueba de reversión porque "probablemente funcionará"
4. Aprobar cambios vía DM de Slack en lugar de un registro documentado
5. No revisar el cambio después de la ejecución; las lecciones se pierden si no cierras el ciclo

## Preguntas Frecuentes

### ¿Cuándo un cambio necesita aprobación del CAB?

Los cambios de riesgo Alto y Crítico deben pasar por un Change Advisory Board o revisión senior equivalente. Los criterios incluyen: cambios en bases de datos de producción, modificaciones a autenticación/autorización, infraestructura que afecta > 50% del tráfico, o cambios durante un período sensible conocido (por ejemplo, Viernes Negro). Los cambios de riesgo Medio pueden necesitar solo aprobación del líder de equipo. Los cambios de bajo riesgo (por ejemplo, correcciones CSS, actualizaciones de texto) pueden usar revisión por pares.

### ¿Cómo manejo cambios de emergencia que no pueden esperar aprobación completa?

Documenta un proceso de cambio de emergencia: el ingeniero de guardia ejecuta el arreglo, luego crea una solicitud de cambio retroactiva dentro de 24 horas con la plantilla completa. La vía de emergencia debe requerir aprobación verbal de un manager o líder de equipo, registrada en Slack o en una llamada. No dejes que "emergencia" se convierta en una excusa para saltarse el proceso cada semana.

### ¿Los cambios de infraestructura-como-código deben usar esta plantilla?

Sí, pero integra con tu proceso de revisión de IaC. La solicitud de cambio debe referenciar el pull request y el diff de `terraform plan`. La evaluación de riesgo se enfoca en si el plan muestra cambios destructivos (reemplazo de recursos) o solo cambios aditivos. El plan de reversión para IaC suele ser `git revert` + re-aplicar, pero verifica que el archivo de estado permanecerá consistente.


### Como implementamos congelaciones de cambios?

Define periodos de congelacion basados en eventos de negocio: lanzamientos de producto, dias festivos, eventos de ventas (Black Friday), plazos regulatorios. Durante una congelacion, solo se permiten cambios de emergencia con aprobacion de nivel VP. Comunica las fechas de congelacion con al menos 2 semanas de anticipacion. Bloquea despliegues via CI/CD durante congelaciones con un proceso de override para emergencias. Documenta la congelacion en el calendario de cambios. Reanuda cambios normales despues del periodo de congelacion con un debrief de cambios de emergencia realizados.

### Que es un Change Advisory Board (CAB)?

Un CAB es un grupo de stakeholders que revisa y aprueba cambios de alto riesgo. Miembros tipicos: manager de ingenieria, representante de seguridad, lider de operaciones, y product owner. El CAB se reunen en un horario regular (semanal o dos veces por semana) para revisar cambios proximos. Reuniones de CAB de emergencia pueden convocarse para cambios urgentes. El CAB revisa la descripcion del cambio, analisis de impacto, plan de rollback y evaluacion de riesgo. Documenta decisiones del CAB en el sistema de gestion de cambios para auditoria.

### Como rastreamos la tasa de exito de cambios?

Rastrea metricas: cambios totales por mes, porcentaje de cambios que causaron incidentes, porcentaje de cambios que requirieron rollback, tiempo promedio para completar un cambio, y porcentaje de cambios con documentacion completa. Objetivo: < 5% tasa de incidentes, < 10% tasa de rollback. Revisa metricas mensualmente. Identifica patrones en cambios fallidos (servicios especificos, tipos de cambio especificos, momentos especificos). Usa estos patrones para mejorar el proceso de cambios y proporcionar capacitacion dirigida.

### Como manejamos rollback cuando el cambio no puede revertirse?

Algunos cambios son irreversibles (migraciones de base de datos que eliminan columnas, eliminaciones de datos, cambios de esquema). Para estos, crea un plan de forward-fix en lugar de un plan de rollback. El plan de forward-fix documenta como restaurar funcionalidad si el cambio causa problemas, incluso si el estado original no puede restaurarse. Prueba el forward-fix en staging. Ten un plan de comunicacion listo para stakeholders. Considera hacer cambios irreversibles en fases: primero depreca, luego elimina en un cambio posterior despues de un periodo de verificacion.

### Como integramos gestion de cambios con GitOps?

En un flujo de GitOps, el pull request ES la solicitud de cambio. Vincula el PR al sistema de gestion de cambios. Usa etiquetas de PR para clasificacion de riesgo (bajo, medio, alto, critico). Requiere aprobaciones basadas en nivel de riesgo: bajo = 1 revisor, medio = 2 revisores, alto = aprobacion CAB. El commit de merge es la ejecucion. Usa herramientas como Argo CD o Flux para rastrear el estado del despliegue. La descripcion del PR debe incluir el analisis de impacto y el plan de rollback. Cierra el ticket de cambio automaticamente cuando el despliegue tiene exito.

### Que hacemos con cambios de emergencia fuera de horario?

Define un proceso de cambio de emergencia separado del flujo normal. Requiere aprobacion del lider de guardia y notificacion al CAB via canal de Slack o PagerDuty. Documenta el cambio retrospectivamente dentro de 24 horas. Realiza un postmortem si el cambio de emergencia causo o estuvo relacionado con un incidente. Limita cambios de emergencia a correcciones de bugs criticos o parches de seguridad. No uses el proceso de emergencia para saltarte revisiones de cambios planificados.
