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
- [ ] Plan de reversión archivado / actualizado basado en aprendizajes
- [ ] Ticket cerrado con resumen de resultado
```

## Explicación

La plantilla impone **tres compuertas** antes de cualquier cambio en producción: una descripción que justifica el cambio, un análisis de impacto que revela dependencias ocultas, y un plan de reversión que está listo antes de que comience el cambio. El nivel de riesgo determina quién debe aprobar: los cambios de bajo riesgo pueden necesitar solo revisión por pares, mientras que los de alto riesgo requieren un Change Advisory Board (CAB) y aprobación explícita de seguridad. El registro de ejecución crea una trazabilidad de auditoría invaluable durante post-mortems y auditorías de cumplimiento.

## Variantes

| Contexto | Compuerta de Aprobación | Enfoque |
|----------|------------------------|---------|
| Startup / equipo pequeño | Revisión por pares + líder de equipo | Velocidad; documentación ligera |
| Empresa / regulado | CAB + seguridad + cumplimiento | Trazabilidad completa; aprobación formal |
| Infraestructura (Terraform) | Revisión de IaC + diff del plan | Verificar que no haya cambios destructivos |
| Migración de base de datos | Revisión de DBA + script de reversión | La integridad de datos es la prioridad |
| Despliegue gradual de feature flag | Producto + ingeniería | Exposición gradual; reversión instantánea vía flag |
| Cambio de emergencia | Aprobación post-hoc dentro de 24 horas | Arreglar primero, documentar después—pero documentar |

## Mejores Prácticas

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
