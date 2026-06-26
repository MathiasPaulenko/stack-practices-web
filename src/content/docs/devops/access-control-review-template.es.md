---
contentType: docs
slug: access-control-review-template
title: "Plantilla de Revision de Control de Acceso"
description: "Una plantilla para auditar derechos de acceso de usuarios, verificar privilegio minimo y documentar decisiones de acceso en sistemas y equipos."
metaDescription: "Audita derechos de acceso de usuarios con esta plantilla. Cubre verificacion de privilegio minimo, asignaciones de roles, cuentas huerfanas y registros de atestacion."
difficulty: intermediate
topics:
  - security
  - devops
tags:
  - access-control
  - audit
  - least-privilege
  - identity
  - compliance
relatedResources:
  - /docs/devops/rbac-policy-template
  - /docs/devops/user-access-audit-template
  - /docs/devops/secret-rotation-schedule-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Audita derechos de acceso de usuarios con esta plantilla. Cubre verificacion de privilegio minimo, asignaciones de roles, cuentas huerfanas y registros de atestacion."
  keywords:
    - revision de control de acceso
    - auditoria de acceso
    - privilegio minimo
    - atestacion de roles
    - revision de identidad
---

## Descripcion General

Una Plantilla de Revision de Control de Acceso proporciona una forma estructurada de verificar que usuarios y cuentas de servicio tienen solo los permisos requeridos por su rol actual. Documenta quien tiene acceso, por que lo tiene y si todavia esta justificado, apoyando marcos de cumplimiento como SOC 2, ISO 27001 y PCI-DSS.

## Cuando Usar

- Durante revisiones de acceso trimestrales o anuales.
- Antes de una auditoria externa o certificacion.
- Despues de un cambio de rol, terminacion o reorganizacion.
- Al incorporar o retirar un sistema sensible.
- Cuando se detecta una cuenta con privilegios excesivos.

## Prerequisitos

- Un inventario autorizado de sistemas, roles y usuarios.
- Acceso a logs del proveedor de identidad o APIs de gestion de roles.
- Una politica definida de privilegio minimo y ciclo de vida de roles.
- Un revisor que sea manager o dueno del sistema, no el usuario revisado.

## Solucion

### Plantilla

#### 1. Alcance de la Revision

| Campo | Descripcion | Ejemplo |
|-------|-------------|---------|
| Sistema o aplicacion | Recurso bajo revision | Base de datos de produccion |
| Periodo de revision | Fechas de inicio y fin | Q2 2026 |
| Revisor | Persona responsable | Engineering manager |
| Fecha de revision | Cuando se realiza la atestacion | 2026-06-27 |
| Tamano de muestra | Numero de usuarios revisados | 42 |

#### 2. Registro de Acceso de Usuarios

| Usuario | Rol | Permisos | Justificacion de Negocio | Aun Requerido? | Notas del Revisor |
|---------|-----|----------|-------------------------|--------------|-------------------|
| alice@example.com | db-admin | Lectura, escritura, schema | Mantenimiento de BD | Si | Valido |
| bob@example.com | solo-lectura | Lectura | Reportes | No | Desactivar cuenta |
| deploy-bot | servicio | Desplegar en produccion | Pipeline CI/CD | Si | Gestionado por rol IAM |

#### 3. Checklist de Cuentas de Servicio

| Cuenta | Proposito | Ultimo Uso | Llave Rotada | Accion Requerida |
|--------|-----------|------------|-------------|------------------|
| backup-sa | Backups nocturnos | 2026-06-26 | Si | Ninguna |
| integration-sa | Sincronizacion tercero | Nunca | No | Revisar o eliminar |
| monitoring-sa | Ingesta de metricas | 2026-06-27 | Si | Ninguna |

#### 4. Hallazgos y Acciones

| ID Hallazgo | Descripcion | Severidad | Dueno | Fecha Limite | Estado |
|-------------|-------------|-----------|-------|--------------|--------|
| AC-01 | Dos usuarios con admin nunca lo usan | Media | Equipo IAM | 2026-07-04 | Abierto |
| AC-02 | Cuenta huerfana de ex contratista | Alta | Seguridad | 2026-06-30 | Abierto |
| AC-03 | MFA ausente en tres cuentas privilegiadas | Alta | Equipo identidad | 2026-07-02 | Abierto |

#### 5. Atestacion

| Campo | Valor |
|-------|-------|
| Nombre del revisor | Alice Rivera |
| Rol | Engineering manager |
| Fecha | 2026-06-27 |
| Resultado | Aprobado con condiciones |
| Condiciones | Eliminar dos cuentas huerfanas y exigir MFA en 5 dias |
| Proxima revision | 2026-09-27 |

## Explicacion

La revision separa la identificacion del acceso de la aprobacion. Al listar cada cuenta, su rol, justificacion y necesidad, los revisores pueden detectar acumulacion de privilegios, cuentas huerfanas y MFA faltante. El paso de atestacion crea una trazabilidad de auditoria que demuestra cumplimiento.

## Variantes

- **Revision de acceso privilegiado**: Se enfoca solo en administradores, cuentas root y credenciales de emergencia.
- **Revision a nivel aplicacion**: Revisa roles y permisos dentro de una sola aplicacion, no infraestructura.
- **Revision de IAM en la nube**: Apunta a roles, politicas y grupos de AWS, Azure o GCP.
- **Revision de contratistas**: Revisa acceso con duracion limitada y fechas de vencimiento.

## Mejores Practicas

- Realiza revisiones trimestrales para acceso privilegiado y anuales para acceso estandar.
- Usa como revisor un manager o dueno del sistema, nunca al titular de la cuenta.
- Desactiva automaticamente cuentas inactivas por un periodo definido.
- Exige MFA para todas las cuentas privilegiadas.
- Elimina el acceso antes o en el ultimo dia del empleado.
- Conserva registros de atestacion por al menos un anio o segun requisitos de cumplimiento.

## Errores Comunes

- Revisar acceso sin verificar si la cuenta sigue activa.
- Permitir auto-revision de permisos propios.
- Mantener acceso amplio despues de un cambio de rol.
- Olvidar revisar cuentas de servicio y API keys.
- Omitir acceso a la consola en la nube al revisar roles de aplicacion.

## FAQs

### Que es una cuenta huerfana?

Una cuenta que permanece activa despues de que el dueno dejo la organizacion, cambio de rol o dejo de usar el servicio asociado. Son de alto riesgo y deben desactivarse o eliminarse.

### Las revisiones de acceso pueden automatizarse?

Si. Herramientas de gobernanza de identidad pueden recolectar datos de acceso, disparar recordatorios y enrutar aprobaciones. Sin embargo, la atestacion humana sigue siendo requerida para la mayoria de marcos de cumplimiento.

### Que evidencia necesita un auditor?

Un registro de acceso completo, decisiones del revisor, acciones de remediacion y atestacion firmada con fechas y nombres de revisores.
