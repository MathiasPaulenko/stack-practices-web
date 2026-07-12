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
  - /docs/access-control-review-template
  - /docs/user-access-audit-template
  - /docs/secret-rotation-schedule-template
  - /docs/ci-cd-pipeline-security-template
  - /docs/compliance-gap-analysis-template
  - /docs/container-security-baseline-template
  - /docs/network-segmentation-policy-template
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


- For alternatives, see [Access Control Review Template](/es/docs/access-control-review-template/).

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

## Soluciones Avanzadas

### RBAC de Kubernetes con role bindings

Define roles y bindings RBAC de Kubernetes para un cluster multi-equipo:

```yaml
# Role: developer-read-only
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer-read-only
  namespace: team-payments
rules:
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch"]
---
# RoleBinding: vincular developers al role
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developers-read-only
  namespace: team-payments
subjects:
  - kind: Group
    name: team-payments-developers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: developer-read-only
  apiGroup: rbac.authorization.k8s.io
---
# ClusterRole: namespace admin para platform team
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: namespace-admin
rules:
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["rbac.authorization.k8s.io"]
    resources: ["roles", "rolebindings"]
    verbs: ["get", "list", "watch", "create", "update", "delete"]
```

### Politica AWS IAM con boundaries de privilegio minimo

Define una politica IAM con permission boundaries para limitar lo que los developers pueden hacer incluso con roles mas amplios:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3ReadWrite",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::team-payments-data",
        "arn:aws:s3:::team-payments-data/*"
      ]
    },
    {
      "Sid": "DenyDeleteBucket",
      "Effect": "Deny",
      "Action": [
        "s3:DeleteBucket",
        "s3:DeleteBucketPolicy"
      ],
      "Resource": "*"
    },
    {
      "Sid": "RequireMFAForSensitiveActions",
      "Effect": "Deny",
      "Action": [
        "iam:CreateAccessKey",
        "iam:DeleteAccessKey",
        "iam:AttachUserPolicy"
      ],
      "Resource": "*",
      "Condition": {
        "BoolIfExists": {
          "aws:MultiFactorAuthPresent": "false"
        }
      }
    }
  ]
}
```

### Politica RBAC as code con OPA Gatekeeper

Aplica reglas RBAC usando Open Policy Agent (OPA) Gatekeeper en Kubernetes:

```yaml
# Constraint: prevenir escalacion de privilegios
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredRoleBindings
metadata:
  name: prevent-privilege-escalation
spec:
  match:
    kinds:
      - apiGroups: ["rbac.authorization.k8s.io"]
        kinds: ["RoleBinding", "ClusterRoleBinding"]
  parameters:
    # Bloquear bindings a cluster-admin para namespaces no-platform
    forbiddenRoles:
      - cluster-admin
    allowedGroups:
      - platform-team
      - security-team
```

```rego
# Politica OPA: validar role bindings
package k8srequiredrolebindings

violation[{"msg": msg}] {
  input.review.object.roleRef.name == "cluster-admin"
  not input.review.object.subjects[_].name in input.parameters.allowedGroups
  msg := sprintf("cluster-admin role cannot be bound to %v", [input.review.object.subjects[_].name])
}
```

## Mejores Practicas Adicionales

1. **Implementa acceso break-glass con auditoria completa.** El acceso admin de emergencia debe usar una cuenta separada, triggerar alertas y requerir revision post-incidente. Nunca uses cuentas break-glass para operaciones rutinarias:

```python
# Alertar sobre uso de break-glass
def on_break_glass_login(user: str, resource: str) -> None:
    alert_security_team(
        f"Break-glass account {user} accessed {resource}. "
        f"Post-incident review required within 24 hours."
    )
    create_incident_ticket(user, resource)
```

2. **Usa composicion de roles para conjuntos complejos de permisos.** En vez de crear un nuevo role para cada combinacion, compone roles de conjuntos de permisos mas pequenos. Esto reduce la explosion de roles:

```yaml
# Ejemplo de composicion de roles
roles:
  deployer:
    inherits: [viewer, editor]
    adds: [deploy, restart]
  incident_commander:
    inherits: [viewer, deployer]
    adds: [scale, rollback, toggle_feature_flag]
```

## Errores Comunes Adicionales

1. **Conceder el role `admin` como atajo durante incidentes y olvidar revocarlo.** Usa elevacion con tiempo limitado y expiracion automatica en vez de grants permanentes de admin. Establece un TTL maximo de 4 horas para acceso de emergencia:

```bash
# Conceder admin temporal con expiracion de 4 horas
vault write identity/entity-alias/name=user@company.com \
    policies=temp-admin ttl=4h
```

2. **No testear cambios de roles en staging antes de produccion.** Aplica cambios RBAC a un entorno staging primero y verifica que los usuarios pueden seguir realizando sus tareas. Tests automatizados pueden validar rutas de acceso:

```bash
# Test: verificar que un developer puede leer pero no escribir
kubectl auth can-i get pods --as=developer@company.com -n staging
# Esperado: yes
kubectl auth can-i create pods --as=developer@company.com -n staging
# Esperado: no
```

## Preguntas Frecuentes Adicionales

### Como migro de permisos directos a RBAC sin disrupcion?

Comienza inventariando todos los permisos directos existentes. Mapea cada permiso a un role. Asigna roles junto a los permisos directos existentes. Verifica que los usuarios pueden realizar sus tareas con solo el role. Luego elimina los permisos directos en una ventana de mantenimiento con capacidad de rollback.

### Que es la explosion de roles y como la prevengo?

La explosion de roles ocurre cuando una organizacion crea demasiados roles fine-grained, haciendo el modelo inmanejable. Prevenla usando nombres funcionales de roles, componiendo roles de conjuntos de permisos mas pequenos y revisando roles anualmente para fusionar o eliminar los no usados. Apunta a menos de 10 roles por sistema.
