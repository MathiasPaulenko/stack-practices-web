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
  - /docs/rbac-policy-template
  - /docs/access-control-review-template
  - /docs/secret-rotation-schedule-template
  - /docs/data-retention-policy-template
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


- For alternatives, see [Access Control Review Template](/es/docs/access-control-review-template/).

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

## Lo que funciona

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

## Soluciones Avanzadas

### Revision automatizada de acceso con Okta API

Extrae datos de acceso de usuarios desde Okta y genera un reporte de revision automaticamente:

```python
import requests
import csv
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import List

@dataclass
class UserAccessRecord:
    user_id: str
    user_name: str
    status: str
    last_login: str
    assigned_apps: List[str]
    admin_roles: List[str]

class OktaAccessReviewer:
    def __init__(self, api_token: str, domain: str):
        self.headers = {
            "Authorization": f"SSWS {api_token}",
            "Accept": "application/json",
        }
        self.base_url = f"https://{domain}/api/v1"

    def get_inactive_users(self, days: int = 90) -> List[dict]:
        """Find users who haven't logged in within the specified period."""
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat() + "Z"
        users = []
        params = {"filter": f'status eq "ACTIVE"'}
        resp = requests.get(
            f"{self.base_url}/users",
            headers=self.headers,
            params=params,
        )
        for user in resp.json():
            last_login = user.get("lastLogin")
            if last_login and last_login < cutoff:
                users.append({
                    "id": user["id"],
                    "email": user["profile"]["email"],
                    "last_login": last_login,
                    "status": user["status"],
                })
        return users

    def get_user_apps(self, user_id: str) -> List[str]:
        """Get applications assigned to a user."""
        resp = requests.get(
            f"{self.base_url}/users/{user_id}/appLinks",
            headers=self.headers,
        )
        return [app["label"] for app in resp.json()]

    def get_admin_roles(self, user_id: str) -> List[str]:
        """Get admin roles assigned to a user."""
        resp = requests.get(
            f"{self.base_url}/users/{user_id}/roles",
            headers=self.headers,
        )
        return [role["type"] for role in resp.json()]

    def generate_review_report(self, output_file: str) -> None:
        """Generate a CSV report of all active users and their access."""
        resp = requests.get(
            f"{self.base_url}/users",
            headers=self.headers,
            params={"filter": 'status eq "ACTIVE"'},
        )
        with open(output_file, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "User ID", "Email", "Status", "Last Login",
                "Assigned Apps", "Admin Roles"
            ])
            for user in resp.json():
                apps = self.get_user_apps(user["id"])
                roles = self.get_admin_roles(user["id"])
                writer.writerow([
                    user["id"],
                    user["profile"]["email"],
                    user["status"],
                    user.get("lastLogin", "Never"),
                    "; ".join(apps),
                    "; ".join(roles),
                ])

# Example usage
reviewer = OktaAccessReviewer(api_token="YOUR_TOKEN", domain="yourorg.okta.com")
inactive = reviewer.get_inactive_users(days=90)
for u in inactive:
    print(f"INACTIVE: {u['email']} - last login: {u['last_login']}")
reviewer.generate_review_report("access_review_q2.csv")
```

### AWS IAM Access Analyzer para deteccion automatizada de hallazgos

Usa AWS IAM Access Analyzer para detectar permisos no utilizados y acceso entre cuentas:

```bash
#!/bin/bash
set -euo pipefail

# Create an analyzer if it doesn't exist
ANALYZER_NAME="org-access-analyzer"
aws accessanalyzer create-analyzer \
  --analyzer-name "$ANALYZER_NAME" \
  --type ORGANIZATION \
  --region us-east-1

# List all findings
echo "=== Active Findings ==="
aws accessanalyzer list-findings \
  --analyzer-arn "$(aws accessanalyzer list-analyzers --query 'analyzers[0].arn' --output text)" \
  --filter '{"status":{"eq":["ACTIVE"]}}' \
  --query 'findings[*].{id:id,resource:resource.resourceArn,type:findingType,createdAt:createdAt}' \
  --output table

# Export findings to CSV for audit trail
aws accessanalyzer list-findings \
  --analyzer-arn "$(aws accessanalyzer list-analyzers --query 'analyzers[0].arn' --output text)" \
  --query 'findings[*].{id:id,resource:resource.resourceArn,type:findingType,createdAt:createdAt}' \
  --output json > iam-findings-$(date +%Y%m%d).json
```

### Script de auditoria de organizacion de GitHub

Audita miembros de la organizacion de GitHub y sus roles programaticamente:

```javascript
const { Octokit } = require("@octokit/rest");

async function auditGitHubOrg(orgName, token) {
  const octokit = new Octokit({ auth: token });
  const findings = [];

  // Get all organization members
  const members = await octokit.paginate(
    octokit.rest.orgs.listMembers,
    { org: orgName, per_page: 100 }
  );

  for (const member of members) {
    // Check if 2FA is enabled
    const { data: mfaStatus } = await octokit.rest.orgs.getMembershipForUser({
      org: orgName,
      username: member.login,
    });

    // Get user's public keys to verify SSH key rotation
    let keyCount = 0;
    try {
      const { data: keys } = await octokit.rest.users.listPublicKeysForUser({
        username: member.login,
      });
      keyCount = keys.length;
    } catch (e) {
      // API may rate limit
    }

    findings.push({
      login: member.login,
      role: mfaStatus.role,
      two_factor: member.two_factor_authentication ? "enabled" : "disabled",
      public_keys: keyCount,
    });
  }

  // Flag users without 2FA
  const noMfa = findings.filter(f => f.two_factor === "disabled");
  if (noMfa.length > 0) {
    console.log(`\nUSERS WITHOUT 2FA (${noMfa.length}):`);
    noMfa.forEach(u => console.log(`  - ${u.login} (role: ${u.role})`));
  }

  // Flag admins
  const admins = findings.filter(f => f.role === "admin");
  console.log(`\nORGANIZATION ADMINS (${admins.length}):`);
  admins.forEach(u => console.log(`  - ${u.login} (2FA: ${u.two_factor})`));

  return findings;
}

auditGitHubOrg("your-org", process.env.GITHUB_TOKEN)
  .then(() => console.log("\nAudit complete."))
  .catch(err => console.error("Audit failed:", err.message));
```

## Mejores Practicas Adicionales

1. **Implementa acceso just-in-time (JIT) para roles privilegiados.** En lugar de acceso admin permanente, concede elevacion con tiempo limitado y expiracion automatica:

```python
# Example: Request time-bound AWS IAM role assumption
import boto3
from datetime import datetime, timedelta

sts = boto3.client("sts")

# Assume a role with 1-hour session duration
response = sts.assume_role(
    RoleArn="arn:aws:iam::123456789012:role/PrivilegedAdmin",
    RoleSessionName="jit-access-alice",
    DurationSeconds=3600,  # 1 hour maximum
)

print(f"Temporary credentials expire at: {response['Credentials']['Expiration']}")
print(f"Access valid for 1 hour only. No standing privilege.")
```

2. **Usa SCIM para desprovisionamiento automatizado.** Cuando un usuario se deshabilita en el proveedor de identidades, SCIM elimina automaticamente su acceso de las aplicaciones conectadas:

```yaml
# Okta SCIM configuration example
scim:
  enabled: true
  app_assignments:
    - app: "github"
      scim_url: "https://api.github.com/scim/v2/organizations/{org}/Users"
      auth_method: "bearer_token"
    - app: "aws-iam-identity-center"
      scim_url: "https://scim.example.com/v2/Users"
      auth_method: "oauth2"
  deprovisioning:
    on_disable: "remove_all_access"
    on_suspend: "disable_signin_keep_membership"
```

## Errores Comunes Adicionales

1. **No auditar la rotacion de tokens de cuentas de servicio.** Las cuentas de servicio suelen tener tokens de larga duracion que nunca expiran. Audita y rota estos tokens:

```bash
#!/bin/bash
# Find GitHub PATs older than 90 days
set -euo pipefail

# List all fine-grained tokens via GitHub API
curl -s -H "Authorization: token $GITHUB_ADMIN_TOKEN" \
  "https://api.github.com/orgs/$ORG/personal-access-tokens" | \
  jq -r '.[] | select(.expiring_at != null) | "TOKEN: \(.id) - expires: \(.expiring_at)"'
```

2. **Ignorar credenciales de cuentas compartidas.** Las cuentas compartidas hacen imposible la responsabilidad individual. Reemplazalas con cuentas individuales o procedimientos de break-glass:

```markdown
## Shared Account Remediation Checklist
- [ ] Inventory all shared accounts (root, admin, service)
- [ ] Identify which individuals use each shared account
- [ ] Create individual accounts for each user
- [ ] Disable shared account after migration
- [ ] Implement break-glass procedure for emergency access
- [ ] Log all break-glass usage with automatic alerts
```

## Preguntas Frecuentes Adicionales

### Como manejamos el acceso para contratistas con compromisos de corto plazo?

Usa aprovisionamiento de acceso con tiempo limitado. Establece una fecha de expiracion cuando el contratista se incorpora, y configura el desprovisionamiento automatico en esa fecha. Requiere que un gerente reapruebe el acceso si el compromiso se extiende:

```python
# Example: Set expiration on Okta group membership
import requests

def set_temporary_access(okta_token, user_id, group_id, expires_at):
    """Assign user to a group with expiration date."""
    headers = {
        "Authorization": f"SSWS {okta_token}",
        "Content-Type": "application/json",
    }
    # Okta lifecycle expiration via custom attribute
    payload = {
        "profile": {
            "contractorAccessExpiresAt": expires_at,
        }
    }
    resp = requests.put(
        f"https://yourorg.okta.com/api/v1/users/{user_id}",
        headers=headers,
        json=payload,
    )
    return resp.status_code == 200
```

### Cual es la diferencia entre revision de acceso y certificacion de acceso?

La revision de acceso es el proceso de examinar los permisos de los usuarios. La certificacion de acceso es la aprobacion formal y documentada de esos permisos por un dueno del sistema o gerente. La certificacion crea un registro auditable de que una persona responsable reviso y aprobo el acceso.
