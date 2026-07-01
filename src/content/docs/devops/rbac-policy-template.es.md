---
contentType: docs
slug: rbac-policy-template
title: "Plantilla de Politica RBAC"
description: "Una plantilla para definir politicas de control de acceso basado en roles, incluyendo roles, permisos, reglas de asignacion y frecuencia de revision."
metaDescription: "Define politicas de control de acceso basado en roles con esta plantilla RBAC. Cubre roles, permisos, reglas de asignacion y frecuencia de revision."
difficulty: intermediate
topics:
  - security
  - devops
tags:
  - rbac
  - access-control
  - authorization
  - policy
  - identity
relatedResources:
  - /docs/devops/access-control-review-template
  - /docs/devops/user-access-audit-template
  - /docs/devops/secret-rotation-schedule-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Define politicas de control de acceso basado en roles con esta plantilla RBAC. Cubre roles, permisos, reglas de asignacion y frecuencia de revision."
  keywords:
    - politica rbac
    - control de acceso basado en roles
    - politica de autorizacion
    - asignacion de roles
    - gobernanza de acceso
---

## Descripcion General

Una Plantilla de Politica RBAC define como se otorgan los derechos de acceso a traves de roles nombrados. Documenta los roles, los permisos asociados, quien puede asignarlos y con que frecuencia se revisan. Una politica RBAC clara reduce la acumulacion de privilegios, simplifica la incorporacion y apoya auditorias de cumplimiento.

## Cuando Usar

- Disenando control de acceso para una nueva aplicacion o sistema.
- Estandarizando permisos a traves de multiples servicios o equipos.
- Preparandose para una auditoria de seguridad o certificacion.
- Revisando o refactorizando un modelo de acceso existente.
- Incorporando empleados con aprovisionamiento basado en roles.

## Prerequisitos

- Un inventario de recursos y acciones del sistema.
- Una lista de funciones o responsabilidades actuales del equipo.
- Acuerdo sobre principios de privilegio minimo.
- Un proveedor de identidad o sistema de gestion de roles.

## Solucion

### Plantilla

#### 1. Declaracion de Politica

Todo acceso a sistemas, datos e infraestructura se otorga mediante roles predefinidos. Los roles se alinean con funciones laborales, privilegio minimo y separacion de deberes. El acceso debe ser aprobado, documentado y revisado periodicamente.

#### 2. Definicion de Roles

| Rol | Descripcion | Permisos | Alcance | Aprobacion Requerida |
|-----|-------------|----------|---------|----------------------|
| viewer | Acceso solo lectura para reportes e investigacion | lectura | Todos los recursos | Manager |
| editor | Puede modificar configuracion y datos no productivos | lectura, escritura | No-produccion | Manager |
| operator | Puede desplegar, reiniciar y monitorear servicios | lectura, despliegue, reinicio | Servicios asignados | Team lead |
| admin | Acceso total para emergencias y cambios criticos | total | Sistema completo | Seguridad + manager |
| auditor | Acceso solo lectura a logs y evidencia de cumplimiento | lectura | Logs y datos de auditoria | Compliance officer |

#### 3. Reglas de Asignacion de Roles

| Regla | Descripcion |
|-------|-------------|
| Privilegio minimo | Los usuarios reciben el rol minimo necesario para sus funciones actuales. |
| Separacion de deberes | Un solo usuario no puede tener roles que permitan cometer y aprobar cambios sensibles. |
| Por tiempo | Roles temporales o elevados expiran automaticamente. |
| Aprobacion de manager | La asignacion de un rol requiere aprobacion documentada del manager. |
| Revocacion por cambio | Los roles se revocan cuando un usuario cambia de equipo o deja la organizacion. |

#### 4. Flujo de Solicitud de Acceso

| Paso | Accion | Dueno | SLA |
|------|--------|-------|-----|
| 1 | El usuario envia solicitud con justificacion de negocio | Solicitante | N/A |
| 2 | El manager revisa y aprueba | Manager | 2 dias habiles |
| 3 | El equipo de identidad o plataforma aprovisiona el rol | Equipo IAM | 1 dia habil |
| 4 | La asignacion se registra en el registro de acceso | Equipo IAM | Mismo dia |
| 5 | El acceso se revisa durante la auditoria trimestral | Dueno del sistema | Trimestral |

#### 5. Revision y Cumplimiento

| Actividad | Frecuencia | Dueno | Evidencia |
|-----------|-----------|-------|-----------|
| Revision de inventario de roles | Anual | Seguridad | Matriz de roles actualizada |
| Revision de acceso privilegiado | Trimestral | Dueno del sistema | Registro de atestacion |
| Limpieza de cuentas huerfanas | Trimestral | Equipo IAM | Lista de cuentas desactivadas |
| Aprobacion de excepcion | Segun necesidad | Comite de riesgo | Forma de aceptacion de riesgo |

## Explicacion

RBAC simplifica la gestion de acceso al agrupar permisos en roles en lugar de asignarlos directamente a usuarios. Esta plantilla hace el modelo de roles explicito, ejecutable y auditable. Combinado con aprovisionamiento automatico, reduce errores manuales y acelera la incorporacion y baja de personal.

## Variantes

- **Politica ABAC**: Usa atributos como departamento, proyecto o ubicacion para decidir acceso dinamicamente.
- **Politica IAM en la nube**: Mapea roles a roles y politicas de AWS IAM, Azure RBAC o GCP IAM.
- **RBAC a nivel aplicacion**: Define roles dentro de una sola aplicacion, independiente de la identidad corporativa.
- **RBAC orientado a clientes**: Modela roles de inquilino, admin y usuario final en sistemas multi-tenant.

## Lo que funciona

- Comienza con pocos roles y expande solo cuando sea necesario.
- Evita nombres de roles que coincidan con titulos de trabajo; usa nombres funcionales como editor u operator.
- Documenta la justificacion de negocio para cada asignacion de rol.
- Usa grupos y roles, no permisos individuales, para la mayoria de usuarios.
- Exige MFA para todos los roles privilegiados.
- Automatiza la revocacion de roles cuando los usuarios cambian o se van.
- Revisa roles anualmente para eliminar roles sin uso o demasiado amplios.

## Errores Comunes

- Crear demasiados roles, causando explosion de roles y confusion.
- Conceder permisos directos fuera de roles definidos.
- Permitir que usuarios mantengan roles antiguos tras transferirse a otro equipo.
- No definir separacion de deberes para operaciones sensibles.
- Usar roles genericos como admin para tareas diarias.

## FAQs

### Cual es la diferencia entre RBAC y ABAC?

RBAC otorga acceso basado en roles asignados. ABAC otorga acceso basado en atributos del usuario, recurso y entorno, como departamento=ingenieria y horario=laboral.

### Cuantos roles deberia tener un sistema?

La mayoria de los sistemas necesitan entre tres y siete roles. Mas de diez roles generalmente indica explosion de roles y debe refactorizarse.

### Puede un usuario tener multiples roles?

Si, pero los permisos combinados deben revisarse para evitar escalacion no intencionada de privilegios. Roles temporales y permanentes deben rastrearse por separado.
