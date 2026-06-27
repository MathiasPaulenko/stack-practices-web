---
contentType: docs
slug: user-access-audit-template
title: "Plantilla de Auditoria de Acceso de Usuarios"
description: "Una plantilla para revisar y certificar derechos de acceso de usuarios en sistemas, aplicaciones y repositorios de datos."
metaDescription: "Revisa y certifica el acceso de usuarios con esta plantilla de auditoria. Cubre inventario, roles, certificaciones y remediacion."
difficulty: beginner
topics:
  - security
  - devops
tags:
  - access-audit
  - user-access-review
  - identity-governance
  - rbac
  - compliance
relatedResources:
  - /docs/devops/rbac-policy-template
  - /docs/devops/access-control-review-template
  - /docs/devops/secret-rotation-schedule-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Revisa y certifica el acceso de usuarios con esta plantilla de auditoria. Cubre inventario, roles, certificaciones y remediacion."
  keywords:
    - auditoria de acceso de usuarios
    - certificacion de acceso
    - gobernanza de identidades
    - cuenta huerfana
    - plantilla de revision de acceso
---

## Descripcion General

Una auditoria de acceso de usuarios verifica que cada usuario tenga el nivel correcto de acceso a sistemas, aplicaciones y datos. Es un control fundamental para la gobernanza de identidades, el principio de minimo privilegio y el cumplimiento de estandares como SOC 2, ISO 27001 y PCI-DSS. Esta plantilla proporciona una forma estructurada de recopilar datos de acceso, revisar permisos, certificar accesos y remediar hallazgos.

## Cuando Usar

- Realizar revisiones de acceso trimestrales o anuales.
- Prepararse para una auditoria de cumplimiento o certificacion.
- Despues de un cambio de rol, reorganizacion o fusion.
- Cuando se sospecha de acceso privilegiado excesivo.
- Despues de la baja de un usuario o contratista.

## Prerequisitos

- Una fuente de identidades como un proveedor SSO o sistema de gestion de identidades.
- Una lista de aplicaciones, sistemas y repositorios de datos bajo revision.
- Duenos o gerentes de cada aplicacion que puedan certificar el acceso.
- Un cronograma de revisiones de acceso y un proceso de escalamiento.

## Solucion

### Plantilla

#### 1. Alcance de la Auditoria

| Item de Alcance | Descripcion |
|-------------------|-------------|
| Periodo | 2026-Q2 |
| Sistemas revisados | AWS, GitHub, Jira, Confluence, Slack, VPN, Google Workspace |
| Poblacion | Empleados, contratistas, cuentas de servicio, roles admin privilegiados |
| Revisores | Duenos de aplicaciones, gerentes, equipo de seguridad |
| Fecha limite | 2026-07-15 |
| Excepciones permitidas | Si, con aceptacion de riesgo y vencimiento |

#### 2. Inventario de Identidades

| ID de Usuario | Nombre | Tipo | Departamento | Estado | Ultima Revision |
|---------------|--------|------|--------------|--------|-----------------|
| `alice@example.com` | Alicia Chen | Empleada | Ingenieria | Activa | 2026-03-31 |
| `bob@example.com` | Roberto Smith | Contratista | Finanzas | Activa | 2026-03-31 |
| svc-api-prod | Servicio API | Cuenta de servicio | Plataforma | Activa | 2026-05-15 |
| `carol@example.com` | Carolina Jones | Empleada | Marketing | Inactiva | 2026-01-31 |

#### 3. Mapeo de Acceso

| Usuario | Sistema | Rol / Permiso | Justificacion de Negocio | Revisor | Decision |
|---------|---------|---------------|---------------------------|---------|----------|
| `alice@example.com` | AWS | PowerUser | Gestiona infraestructura | Lider de plataforma | Mantener |
| `bob@example.com` | GitHub | Lectura | Revisa pull requests | Gerente de ingenieria | Mantener |
| `alice@example.com` | Jira | Admin | Configura workflows | Lider de IT | Revocar |
| svc-api-prod | AWS | S3 solo lectura | Aplicacion lee reportes | Lider de plataforma | Mantener |
| `carol@example.com` | Slack | Miembro | Dejo la empresa | RRHH | Revocar |

#### 4. Revision de Acceso Privilegiado

| Usuario | Sistema | Rol Privilegiado | Justificacion | Riesgo | Revisor | Decision |
|---------|---------|------------------|---------------|--------|---------|----------|
| `alice@example.com` | AWS | Acceso root | Break-glass de emergencia | Alto | CISO | Mantener con MFA |
| `dave@example.com` | GitHub | Dueno de organizacion | Gestiona repositorios | Alto | CTO | Mantener |
| `eve@example.com` | VPN | Tunel completo | Acceso remoto admin | Alto | Lider de seguridad | Revocar |

#### 5. Registro de Certificacion

| Aplicacion | Revisor | Estado | Fecha | Notas |
|------------|---------|--------|-------|-------|
| AWS | Lider de plataforma | Certificado | 2026-07-10 | 2 revocaciones pendientes |
| GitHub | CTO | Certificado | 2026-07-08 | 1 cuenta huerfana eliminada |
| Jira | Lider de IT | En progreso | 2026-07-05 | Rol admin en revision |
| Slack | RRHH | Certificado | 2026-07-09 | 3 cuentas inactivas revocadas |

#### 6. Plan de Remediacion

| Hallazgo | Accion | Dueno | Fecha Limite | Estado |
|----------|--------|-------|--------------|--------|
| Derechos admin excesivos en Jira | Degradar a usuario | Lider de IT | 2026-07-20 | Abierto |
| Cuenta inactiva en Slack | Desactivar | RRHH | 2026-07-12 | Hecho |
| Cuenta de servicio huerfana | Investigar y deshabilitar | Equipo de plataforma | 2026-07-18 | Abierto |
| MFA faltante en usuarios privilegiados | Aplicar MFA | Equipo IAM | 2026-07-15 | En progreso |

## Explicacion

La plantilla conecta identidades con permisos, justificacion de negocio y revisores responsables. Sin esta estructura, las organizaciones acumulan cuentas obsoletas y usuarios sobre-privilegiados, aumentando tanto el riesgo interno como la superficie de ataque externa. Las revisiones de acceso regulares son requeridas por la mayoria de los frameworks de seguridad y son una forma practica de aplicar el minimo privilegio.

## Variantes

- **Revision de acceso especifica a una aplicacion**: Se enfoca en un solo sistema, como AWS IAM o acceso a organizacion de GitHub.
- **Revision de acceso privilegiado**: Solo revisa cuentas de admin, root o acceso de emergencia.
- **Auditoria de cuentas de servicio**: Revisa identidades no humanas y sus claves API o credenciales.
- **Revision de acceso de contratistas**: Revision con plazo definido para usuarios externos con acceso temporal.
- **Auditoria de acceso a datos**: Se enfoca en usuarios que pueden acceder a bases de datos sensibles, data lakes o herramientas de analisis.

## Mejores Practicas

- Automatiza la recoleccion de identidades desde el proveedor SSO o gestion de identidades.
- Envia recordatorios a los revisores antes de la fecha limite.
- Requiere justificacion de negocio para cada rol privilegiado.
- Revoca el acceso inmediatamente cuando un usuario cambia de rol o se va.
- Programa revisiones trimestrales para acceso privilegiado y anuales para acceso general.
- Documenta la aceptacion de riesgo para excepciones necesarias.
- Rastrea la remediacion hasta que cada hallazgo se cierre.

## Errores Comunes

- Revisar el acceso solo una vez al año sin seguimiento.
- Permitir que gerentes mantengan acceso para empleados que cambiaron de rol.
- Ignorar cuentas de servicio y credenciales compartidas.
- Omitir acceso privilegiado o cuentas de break-glass de emergencia.
- No vincular decisiones de acceso a justificacion de negocio.
- No verificar que las revocaciones realmente ocurrieron.
- Almacenar evidencia de revision en correos o documentos dispersos.

## FAQs

### Quien debe certificar el acceso?

El dueno del sistema o el gerente directo del usuario es el mejor revisor. Para sistemas sensibles, el equipo de seguridad o el dueno de datos tambien pueden aprobar.

### Que es una cuenta huerfana?

Una cuenta huerfana es una cuenta activa que ya no esta asociada a un usuario o dueno conocido, frecuentemente despues de una baja o cambio de equipo. Estas deben deshabilitarse o reclamarse.

### Como hacemos las revisiones de acceso menos tediosas?

Utiliza herramientas de gobernanza de identidades que extraigan datos de acceso automaticamente, proporcionen dashboards amigables para revisores y revoquen automaticamente cuentas inactivas de bajo riesgo tras aprobacion.
