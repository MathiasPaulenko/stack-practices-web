---
contentType: docs
slug: compliance-gap-analysis-template
title: "Plantilla de Analisis de Brechas de Cumplimiento"
description: "Una plantilla para mapear controles de seguridad actuales a marcos de cumplimiento como SOC 2, ISO 27001 y PCI-DSS."
metaDescription: "Mapea controles de seguridad a marcos de cumplimiento con esta plantilla. Cubre requisitos, evidencia, brechas y planes de remediacion."
difficulty: intermediate
topics:
  - security
  - devops
tags:
  - compliance
  - gap-analysis
  - soc2
  - iso27001
  - audit
relatedResources:
  - /docs/devops/access-control-review-template
  - /docs/devops/rbac-policy-template
  - /docs/devops/network-segmentation-policy-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Mapea controles de seguridad a marcos de cumplimiento con esta plantilla. Cubre requisitos, evidencia, brechas y planes de remediacion."
  keywords:
    - analisis de brechas de cumplimiento
    - analisis de brechas soc2
    - analisis de brechas iso 27001
    - preparacion para auditoria
    - mapeo de controles
---

## Descripcion General

Un Analisis de Brechas de Cumplimiento compara tus controles de seguridad actuales contra los requisitos de un marco objetivo, como SOC 2, ISO 27001, PCI-DSS o GDPR. Esta plantilla captura el requisito, el control que lo satisface, la evidencia disponible, cualquier pieza faltante y un plan para cerrar las brechas. Es un insumo estandar para la preparacion de auditorias y hojas de ruta de certificacion.

## Cuando Usar

- Prepararse para una auditoria o certificacion inicial.
- Renovar una certificacion e identificar cambios desde la ultima auditoria.
- Fusionar empresas o integrar nuevas unidades de negocio.
- Despues de un cambio significativo en arquitectura, procesos o proveedores.
- Construir una hoja de ruta de seguridad vinculada a obligaciones de cumplimiento.

## Prerequisitos

- El marco objetivo y version, como SOC 2 Trust Services Criteria 2017.
- Un inventario de politicas, controles y procesos de seguridad.
- Acceso a repositorios de evidencia, sistemas de tickets y consolas cloud.
- Un equipo multifuncional de seguridad, ingenieria, legal y RRHH.

## Solucion

### Plantilla

#### 1. Vision General del Compromiso

| Campo | Descripcion | Valor |
|-------|-------------|-------|
| Marco | Estandar de cumplimiento objetivo | SOC 2 Tipo II |
| Version | Version o criterios especificos | Trust Services Criteria 2017 |
| Alcance | Sistemas, equipos o ubicaciones cubiertas | Ambiente cloud de produccion |
| Fecha de evaluacion | Cuando se realizo el analisis | 2026-06-27 |
| Dueno | Persona responsable del analisis | Gerente de cumplimiento |
| Fecha objetivo de auditoria | Certificacion o auditoria planeada | 2027-03-31 |

#### 2. Mapeo de Controles

| ID Requisito | Objetivo de Control | Control Actual | Evidencia | Estado | Brecha | Dueno | Fecha Limite |
|----------------|-------------------|----------------|-----------|--------|--------|-------|--------------|
| CC6.1 | Acceso logico | Politica RBAC aplicada | Doc de politica RBAC, config IAM | Parcial | MFA no aplicada a todos los roles admin | Equipo IAM | 2026-08-15 |
| CC6.6 | Monitoreo de sistemas | Logs centralizados en SIEM | Dashboard SIEM, politica de retencion | Cumple | Ninguna | Equipo de seguridad | N/A |
| CC7.1 | Gestion de vulnerabilidades | Escaneos trimestrales | Reporte del escaner | Parcial | Sin SLA de remediacion | Equipo de gestion de vulnerabilidades | 2026-09-01 |
| A.12.3.1 | Respaldo de informacion | Politica de backup existe | Politica de backup, prueba de restauracion | Cumple | Ninguna | Equipo DevOps | N/A |
| A.9.2.3 | Derechos de acceso | Proceso de revision de acceso | Revisiones trimestrales de acceso | Parcial | Revisiones no documentadas | Gerentes de ingenieria | 2026-07-30 |

#### 3. Resumen de Brechas

| Categoria | Total | Cumple | Parcial | No Cumple | Riesgo |
|-----------|-------|--------|---------|-----------|--------|
| Control de acceso | 12 | 7 | 4 | 1 | Alto |
| Monitoreo | 8 | 6 | 2 | 0 | Medio |
| Gestion de cambios | 6 | 3 | 2 | 1 | Alto |
| Gestion de proveedores | 5 | 2 | 2 | 1 | Medio |
| Respuesta a incidentes | 7 | 5 | 1 | 1 | Alto |
| Total | 38 | 23 | 11 | 4 | Alto |

#### 4. Plan de Remediacion

| ID Brecha | Descripcion | Accion | Dueno | Fecha Limite | Prioridad | Evidencia Requerida |
|-----------|-------------|--------|-------|--------------|-----------|---------------------|
| GAP-01 | MFA faltante para roles admin | Aplicar MFA en todas las cuentas privilegiadas | Equipo IAM | 2026-08-15 | Alta | Reporte de inscripcion MFA |
| GAP-02 | Sin SLA de remediacion de vulnerabilidades | Definir y aprobar SLA por severidad | Equipo de seguridad | 2026-09-01 | Alta | Documento de SLA |
| GAP-03 | Revisiones de acceso no documentadas | Usar plantilla de revision de acceso trimestral | Gerentes de ingenieria | 2026-07-30 | Media | Atestaciones firmadas |
| GAP-04 | Sin evaluacion formal de proveedores | Adoptar plantilla de evaluacion de proveedores | Compras | 2026-10-01 | Media | Evaluaciones completadas |

#### 5. Seguimiento de Evidencia

| ID Requisito | Ubicacion de Evidencia | Ultima Actualizacion | Revisor | Notas |
|----------------|------------------------|----------------------|---------|-------|
| CC6.1 | /policies/rbac-policy | 2026-06-01 | Lider de seguridad | Aprobado y publicado |
| CC6.6 | /siem/retention-config | 2026-05-15 | Analista SOC | Retencion de 12 meses confirmada |
| A.12.3.1 | /runbooks/backup-restore-test | 2026-06-20 | Lider DevOps | Prueba trimestral de restauracion exitosa |

## Explicacion

El analisis de brechas convierte el cumplimiento en un proyecto accionable. Al mapear cada requisito a un control, evidencia y estado, puedes priorizar el trabajo basado en riesgo y cronograma de auditoria. El plan de remediacion se convierte en la hoja de ruta que impulsa las tareas de ingenieria, seguridad y legal hacia la certificacion.

## Variantes

- **Evaluacion de preparacion SOC 2**: Enfocada en Trust Services Criteria con controles y evidencia comunes.
- **Analisis de brechas ISO 27001**: Mapeado a controles del Anexo A y planes de tratamiento de riesgo.
- **Analisis de brechas PCI-DSS**: Centrado en el entorno de datos de tarjetahabientes, cifrado y acceso.
- **Mapeo de cumplimiento GDPR**: Rastrea derechos de los titulares de datos, registros de procesamiento y consentimiento.
- **Mapeo multi-marco**: Una matriz unificada mostrando cobertura entre SOC 2, ISO 27001 y PCI-DSS.

## Mejores Practicas

- Usa la version oficial del marco para evitar requisitos obsoletos.
- Involucra a los duenos de los controles, no solo al equipo de cumplimiento, en la evaluacion.
- Recolecta evidencia durante el analisis, no despues.
- Califica las brechas por riesgo y preparacion para auditoria, no solo por volumen.
- Rastrea la remediacion como un proyecto con duenos, fechas y entregables.
- Vuelve a ejecutar el analisis trimestralmente o despues de cambios mayores.
- Manten una fuente unica de verdad para ubicaciones de evidencia.

## Errores Comunes

- Tratar el cumplimiento como un proyecto de una sola vez en lugar de un programa continuo.
- Mapear controles a requisitos sin revisar la evidencia real.
- Asignar remediacion a equipos sin capacidad o autoridad.
- Usar versiones obsoletas de marcos.
- Sobre-documentar controles triviales mientras se omiten brechas criticas.
- No vincular el analisis de brechas con historial de incidentes o evaluaciones de riesgo.

## FAQs

### Cuanto tiempo toma un analisis de brechas?

Una evaluacion enfocada para un estandar tipicamente toma de 2 a 4 semanas, dependiendo del alcance, madurez y disponibilidad de evidencia. Los mapeos multi-marco toman mas tiempo.

### Quien debe ser dueno del analisis de brechas?

Un gerente de cumplimiento o riesgo usualmente posee el documento, pero cada requisito debe tener un dueno del control que valide la evidencia y se comprometa con la remediacion.

### Que cuenta como evidencia?

Politicas, capturas de configuracion, logs de auditoria, registros de tickets, atestaciones firmadas, registros de capacitacion completada, resultados de pruebas e informes de terceros. La evidencia debe estar fechada y ser atribuible.
