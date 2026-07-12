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
  - /docs/rbac-policy-template
  - /docs/user-access-audit-template
  - /docs/secret-rotation-schedule-template
  - /docs/vulnerability-scan-report-template
  - /docs/compliance-gap-analysis-template
  - /docs/data-breach-response-playbook
  - /docs/third-party-vendor-assessment-template
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


- For alternatives, see [Compliance Gap Analysis Template](/es/docs/compliance-gap-analysis-template/).

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

## Lo que funciona

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

## Soluciones Avanzadas

### Revision automatizada de acceso con AWS IAM Access Analyzer

Usa AWS IAM Access Analyzer para detectar permisos no usados y generar hallazgos para revision:

```bash
#!/bin/bash
set -euo pipefail

# Generar hallazgos de access analyzer
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Listar todos los usuarios IAM y su ultima actividad
echo "=== IAM Users Last Activity ==="
aws iam get-account-authorization-details --output json | \
  jq -r '.UserDetailList[] | {
    user: .UserName,
    groups: (.Groups | join(", ")),
    policies: (.AttachedManagedPolicies | map(.PolicyName) | join(", ")),
    last_used: .PasswordLastUsed
  }'

# Verificar access keys no usadas
echo ""
echo "=== Unused Access Keys (>90 days) ==="
for user in $(aws iam list-users --query 'Users[].UserName' --output text); do
  aws iam list-access-keys --user-name "$user" --output json | \
    jq -r '.AccessKeyMetadata[] | select(.Status=="Active") | "\(.UserName) \(.AccessKeyId) \(.CreateDate)"'
done

# Generar reporte de permisos no usados
echo ""
echo "=== IAM Access Analyzer Findings ==="
aws accessanalyzer list-findings --analyzer-arn "$ANALYZER_ARN" --output json | \
  jq -r '.findings[] | select(.status=="ACTIVE") | {
    resource: .resource,
    finding: .findingType,
    principal: .principal
  }'
```

### Script de auditoria de acceso en organizacion de GitHub

Audita miembros de la organizacion de GitHub y su acceso a repositorios con la GitHub API:

```python
#!/usr/bin/env python3
"""Auditar acceso de org de GitHub y flaggear miembros inactivos."""
import requests
import sys
from datetime import datetime, timedelta

ORG = "your-org"
TOKEN = sys.argv[1] if len(sys.argv) > 1 else ""
HEADERS = {"Authorization": f"token {TOKEN}", "Accept": "application/vnd.github+json"}

def get_org_members() -> list:
    resp = requests.get(f"https://api.github.com/orgs/{ORG}/members", headers=HEADERS)
    return resp.json()

def get_user_activity(username: str) -> dict:
    resp = requests.get(
        f"https://api.github.com/users/{username}/events",
        headers=HEADERS,
        params={"per_page": 1},
    )
    events = resp.json()
    if events:
        last_event = datetime.strptime(events[0]["created_at"], "%Y-%m-%dT%H:%M:%SZ")
        days_inactive = (datetime.utcnow() - last_event).days
        return {"username": username, "last_active": events[0]["created_at"], "days_inactive": days_inactive}
    return {"username": username, "last_active": "never", "days_inactive": 999}

def audit_members() -> None:
    members = get_org_members()
    print(f"Total org members: {len(members)}\n")
    print(f"{'Username':<25} {'Last Active':<25} {'Days Inactive':<15} {'Status'}")
    print("-" * 80)

    threshold = 90
    for member in members:
        username = member["login"]
        activity = get_user_activity(username)
        status = "REVIEW" if activity["days_inactive"] > threshold else "OK"
        print(f"{username:<25} {activity['last_active']:<25} {activity['days_inactive']:<15} {status}")

if __name__ == "__main__":
    audit_members()
```

### Auditoria RBAC de Kubernetes con kubectl

Audita bindings RBAC de Kubernetes e identifica subjects sobre-privilegiados:

```bash
#!/bin/bash
set -euo pipefail

echo "=== ClusterRoleBindings with cluster-admin ==="
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] | select(.roleRef.name=="cluster-admin") | "\(.metadata.name) -> \(.subjects[].name // "unknown")"'

echo ""
echo "=== RoleBindings per namespace ==="
for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  echo "--- Namespace: $ns ---"
  kubectl get rolebindings -n "$ns" -o json | \
    jq -r '.items[] | "\(.metadata.name): role=\(.roleRef.name) subjects=\([.subjects[].name] | join(", "))"'
done

echo ""
echo "=== Service accounts with secrets ==="
kubectl get serviceaccounts --all-namespaces -o json | \
  jq -r '.items[] | select(.secrets != null and (.secrets | length > 0)) | "\(.metadata.namespace)/\(.metadata.name)"'
```

## Mejores Practicas Adicionales

1. **Implementa acceso just-in-time para operaciones privilegiadas.** En vez de conceder acceso admin permanente, usa elevacion just-in-time con aprobacion y limites de tiempo. Esto reduce la superficie de ataque y crea una trazabilidad auditable:

```yaml
# Teleport role: acceso admin temporal con aprobacion
kind: role
metadata:
  name: jit-admin
spec:
  allow:
    node_labels: "*"
    max_session_ttl: 4h
    require_session_join: true
```

2. **Usa dashboards de revision de acceso para visibilidad continua.** Construye un dashboard que muestre metricas de acceso en tiempo real, como numero de cuentas privilegiadas, cuentas inactivas y cobertura de MFA:

```sql
-- Query: cuentas privilegiadas sin MFA
SELECT u.username, u.role, u.last_login
FROM users u
LEFT JOIN mfa_enrollments m ON u.id = m.user_id
WHERE u.role IN ('admin', 'operator') AND m.id IS NULL
ORDER BY u.last_login DESC;
```

## Errores Comunes Adicionales

1. **No revisar cuentas de servicio e identidades de maquina.** Las cuentas de servicio suelen acumular permisos con el tiempo y rara vez se revisan. Incluyelas en cada ciclo de revision de acceso y verifica su ultimo uso:

```bash
# Verificar fecha de ultimo uso para AWS access keys
aws iam list-access-keys --user-name deploy-bot --query 'AccessKeyMetadata[].{Key:AccessKeyId, LastUsed:CreateDate, Status:Status}' --output table
```

2. **Confiar en spreadsheets manuales para revisiones de acceso.** Los spreadsheets son propensos a errores y se desactualizan rapidamente. Usa herramientas de gobernanza de identidad o scripts que extraigan datos en vivo de tu proveedor de identidad:

```bash
# Exportar datos de acceso en vivo en vez de mantener spreadsheets
aws iam get-account-authorization-details --output json > access-snapshot-$(date +%Y%m%d).json
```

## Preguntas Frecuentes Adicionales

### Como manejo revisiones de acceso para contratistas y personal temporal?

Establece fechas de vencimiento en todas las cuentas de contratistas al momento del aprovisionamiento. Usa asignaciones de roles con tiempo limitado que auto-expiran. Envia recordatorios al manager sponsor 7 dias antes del vencimiento. Requiere re-aprobacion para extension. Nunca concedas acceso permanente a no-empleados.

### Cual es la diferencia entre atestacion y certificacion en revisiones de acceso?

La atestacion es el acto de un revisor confirmando que el acceso es apropiado. La certificacion es un proceso formal y auditable donde el revisor firma toda la lista de acceso, a menudo con significancia legal o de cumplimiento. La mayoria de marcos de cumplimiento requieren certificacion, no solo atestacion.
