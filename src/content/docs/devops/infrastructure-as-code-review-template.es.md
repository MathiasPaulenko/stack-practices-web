---
contentType: docs
slug: infrastructure-as-code-review-template
title: "Plantilla de Revisión de Infrastructure as Code"
description: "Una plantilla para revisar código de infraestructura Terraform y CloudFormation."
metaDescription: "Usa esta plantilla de revisión de infrastructure-as-code para validar configuraciones de Terraform, CloudFormation y Ansible antes del despliegue."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - infrastructure-as-code
  - terraform
  - cloudformation
  - review
  - template
relatedResources:
  - /docs/auto-scaling-policy-template
  - /docs/backup-and-restore-template
  - /docs/cloud-cost-allocation-template
  - /docs/deployment-checklist-template
  - /docs/api-status-page-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de revisión de infrastructure-as-code para validar configuraciones de Terraform, CloudFormation y Ansible antes del despliegue."
  keywords:
    - devops
    - infrastructure-as-code
    - terraform
    - cloudformation
    - revision
    - plantilla
---
## Visión General

El código de infraestructura es software. Debe ser revisado, probado y versionado igual que el código de aplicación. Un solo security group mal configurado o una política IAM demasiado permisiva puede exponer todo tu entorno. Esta plantilla estructura un proceso de revisión de código específicamente para configuraciones de Terraform, CloudFormation, Pulumi o Ansible.

## Cuándo Usar

Usa este recurso cuando:
- Agregues un nuevo módulo de Terraform o stack de CloudFormation a producción
- Revises pull requests que modifican infraestructura
- Audites código de infraestructura existente por problemas de seguridad o costos

## Solución

```markdown
# Revisión de Infrastructure as Code: `<Módulo / Stack>`

## 1. Metadatos del Cambio

| Campo | Valor |
|-------|-------|
| Módulo / Stack | `nombre` |
| Herramienta | `Terraform / CloudFormation / Pulumi / Ansible` |
| Entorno | `dev / staging / prod` |
| Ticket | `JIRA-1234` |
| Autor | `@autor` |
| Revisor | `@revisor` |
| Nivel de Riesgo | `Bajo / Medio / Alto / Crítico` |

## 2. Análisis Estático

- [ ] `terraform validate` o `cfn-lint` pasa sin errores
- [ ] `terraform plan` o `change set` ha sido revisado para eliminaciones inesperadas
- [ ] Escaneo de seguridad (Checkov, tfsec, cfn-nag) tiene cero hallazgos HIGH/CRITICAL
- [ ] Estimación de costo proporcionada para nuevos recursos (Infracost o manual)
- [ ] Bloqueo de archivo de estado configurado para Terraform
- [ ] Configuración de backend usa un store de estado remoto y cifrado

## 3. Revisión de Seguridad

| Check | Aprobado / Fallido | Notas |
|-------|-------------------|-------|
| Sin secretos hardcodeados en código o variables | | |
| Roles IAM / RBAC de mínimo privilegio | | |
| Security groups restringen ingress a CIDRs conocidos | | |
| Cifrado en reposo habilitado para almacenamiento | | |
| Cifrado en tránsito forzado (TLS 1.2+) | | |
| Acceso público deshabilitado por defecto | | |
| Logging habilitado para todos los data planes | | |
| WAF / protección DDoS para endpoints públicos | | |

## 4. Confiabilidad y Operaciones

| Check | Aprobado / Fallido | Notas |
|-------|-------------------|-------|
| Límites / cuotas de recursos verificados | | |
| Health checks y auto-recovery configurados | | |
| Redundancia multi-AZ o multi-región donde se requiere | | |
| Política de backup / snapshot definida | | |
| Monitoreo y alertas incluidos | | |
| Shutdown graceful / draining para servicios stateful | | |
| Idempotencia verificada: re-ejecución no produce cambios | | |

## 5. Costo y Eficiencia

| Check | Aprobado / Fallido | Notas |
|-------|-------------------|-------|
| Instancias right-sized (no default / máximo) | | |
| Capacidad reservada o savings plans considerados | | |
| Recursos no utilizados removidos en este cambio | | |
| Políticas de ciclo de vida de almacenamiento definidas | | |
| Costos de transferencia de datos estimados | | |

## 6. Documentación

- [ ] README actualizado con inputs, outputs y ejemplo de uso
- [ ] Architecture Decision Record (ADR) incluido para cambios importantes
- [ ] Runbook actualizado para nuevos procedimientos operacionales
- [ ] Playbooks de alertas de on-call cubren nuevas señales de monitoreo

## 7. Plan de Rollback

| Escenario | Acción de Rollback | Tiempo para Completar |
|-----------|-------------------|----------------------|
| Falla de despliegue | `terraform destroy -target` o eliminación de stack | 15 min |
| Regresión de rendimiento | Revertir a imagen anterior / escalar arriba | 10 min |
| Incidente de seguridad | Deshabilitar acceso público + revocar claves | 5 min |
```

## Explicación

Las revisiones de infraestructura difieren de las de código de aplicación porque **el radio de explosión es mayor**. Un bug en código de aplicación afecta un pod; un bug en Terraform puede eliminar una base de datos o exponerla a internet. La plantilla impone **análisis estático** (chequeos automatizados), **revisión de seguridad** (juicio humano) y **preparación operacional** (¿puedes ejecutarlo y recuperarte de él?). El plan de rollback no es negociable: cada cambio de infraestructura debe ser reversible dentro del RTO del servicio que soporta.

## Variantes

| Herramienta | Análisis Estático | Escaneo de Seguridad | Gestión de Estado |
|-------------|-------------------|----------------------|-------------------|
| Terraform | `terraform validate`, `fmt` | Checkov, tfsec, Terrascan | Backend S3 remoto + bloqueo |
| CloudFormation | `cfn-lint`, `cfn-guard` | cfn-nag, Checkov | Stack sets + drift detection |
| Pulumi | `pulumi preview` | Checkov | Estado Pulumi Cloud |
| Ansible | `ansible-lint`, `syntax-check` | Roles de hardening de Ansible | Git + AWX / Tower |

## Lo que funciona

1. Ejecuta análisis estático en CI/CD antes de que un humano vea el pull request
2. Requiere dos aprobaciones para cambios de infraestructura en producción, no una
3. Revisa el diff de `terraform plan`, no solo el código; los planes revelan cambios destructivos
4. Separa archivos de estado por entorno; nunca compartas estado de prod y dev
5. Usa versionado de módulos; fija versiones de provider y módulo para evitar actualizaciones sorpresa

## Errores Comunes

1. Revisar solo el diff de código e ignorar la salida de `terraform plan`
2. Hardcodear secretos en lugar de usar un gestor de secretos (Vault, AWS Secrets Manager)
3. Usar `count` o `for_each` en recursos stateful sin considerar pérdida de datos al destruir
4. Olvidar actualizar documentación cuando la infraestructura cambia
5. Ejecutar `terraform apply` localmente en lugar de a través de un pipeline CI/CD con logging de auditoría

## Preguntas Frecuentes

### ¿Los cambios de infraestructura deberían requerir la misma aprobación que los despliegues de aplicación?

A menudo deberían requerir **más** escrutinio. Los cambios de aplicación se pueden revertir con un despliegue; los cambios de infraestructura pueden destruir datos. Considera un flujo de aprobación separado para infraestructura de producción, o requiere la firma de un ingeniero senior.

### ¿Cómo reviso un módulo de Terraform grande sin perder detalles?

Divide la revisión en capas: primero análisis estático y revisión de plan, luego chequeos de seguridad, luego preparación operacional. No intentes revisar todo a la vez. Usa un checklist (como esta plantilla) para que ninguna categoría sea omitida.

### ¿Qué es drift detection y por qué importa?

El drift ocurre cuando alguien cambia infraestructura fuera de IaC (ej. por consola). Herramientas como Terraform `refresh`, AWS Config o CloudFormation drift detection identifican estos cambios. Revisa reportes de drift regularmente; de lo contrario tu código y la realidad divergen, haciendo futuros cambios peligrosos.

## Soluciones Avanzadas

### Escaneo automatizado de IaC con Checkov en CI/CD

Integra el escaneo de infraestructura en tu pipeline para detectar problemas antes de la revision:

```yaml
# .github/workflows/terraform-review.yml
name: Terraform Security Scan
on:
  pull_request:
    paths:
      - "terraform/**"
      - "infrastructure/**"

jobs:
  checkov-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: bridgecrewio/checkov-action@v12
        with:
          directory: terraform/
          framework: terraform
          output_format: sarif
          output_file_path: results.sarif
          soft_fail: false
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif

  terraform-plan-review:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-tf
          aws-region: us-east-1
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.0"
      - name: Terraform Init
        run: terraform -chdir=terraform/ init -input=false
      - name: Terraform Plan
        run: terraform -chdir=terraform/ plan -input=false -out=tfplan
      - name: Post Plan to PR
        uses: actions/github-script@v7
        with:
          script: |
            const { execSync } = require('child_process');
            const planOutput = execSync('terraform -chdir=terraform/ show -no-color tfplan').toString();
            const truncated = planOutput.substring(0, 50000);
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.payload.pull_request.number,
              body: `## Terraform Plan\n\n\`\`\`diff\n${truncated}\n\`\`\``
            });
```

### Politica personalizada de Checkov para reglas especificas de la organizacion

Define politicas personalizadas que hagan cumplir los estandares de tu organizacion:

```python
# checkov_custom_policies/aws_require_tags.py
from checkov.terraform.checks.resource.base_resource_check import BaseResourceCheck
from checkov.common.models.enums import CheckResult, CheckCategories

class RequireCostCenterTag(BaseResourceCheck):
    def __init__(self):
        name = "Ensure all resources have a CostCenter tag"
        check_id = "CKV_AWS_CUSTOM_1"
        supported_resources = ["aws_*"]
        categories = [CheckCategories.CONVENTION]
        super().__init__(name=name, id=check_id, categories=categories,
                         supported_resources=supported_resources)

    def scan_resource_conf(self, conf):
        tags = conf.get("tags", [{}])[0]
        if "CostCenter" in tags and "Environment" in tags:
            return CheckResult.PASSED
        return CheckResult.FAILED

check = RequireCostCenterTag()
```

```bash
# Run custom policies alongside built-in checks
checkov -d terraform/ \
  --external-checks-dir checkov_custom_policies/ \
  --framework terraform \
  --output cli \
  --soft-fail false
```

### Pruebas de modulos de Terraform con Terratest

Valida que tu infraestructura realmente funciona escribiendo pruebas automatizadas:

```go
// test/infrastructure_test.go
package test

import (
    "testing"
    "time"

    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/aws"
    "github.com/stretchr/testify/assert"
)

func TestVpcModule(t *testing.T) {
    terraformOptions := &terraform.Options{
        TerraformDir: "../terraform/modules/vpc",
        Vars: map[string]interface{}{
            "environment":    "test",
            "vpc_cidr":       "10.0.0.0/16",
            "enable_nat":     true,
        },
    }

    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)

    vpcId := terraform.Output(t, terraformOptions, "vpc_id")
    assert.NotEmpty(t, vpcId)

    subnetIds := terraform.OutputList(t, terraformOptions, "private_subnet_ids")
    assert.Equal(t, 2, len(subnetIds))

    // Verify NAT gateway was created
    natGatewayId := terraform.Output(t, terraformOptions, "nat_gateway_id")
    assert.NotEmpty(t, natGatewayId)

    // Verify VPC has DNS support
    aws.AssertVpcDnsSupportEnabled(t, "us-east-1", vpcId)
}
```

### Automatizacion de deteccion de drift

Programar verificaciones regulares de drift y alertar cuando la infraestructura diverge del codigo:

```python
import subprocess
import json
import smtplib
from email.mime.text import MIMEText
from typing import List, Dict

class DriftDetector:
    def __init__(self, terraform_dir: str, environments: List[str]):
        self.terraform_dir = terraform_dir
        self.environments = environments

    def check_drift(self, env: str) -> Dict:
        """Check for drift in a specific environment."""
        result = {"environment": env, "drifted": False, "resources": []}

        try:
            subprocess.run(
                ["terraform", "-chdir=f{self.terraform_dir}/{env}", "init", "-input=false"],
                check=True, capture_output=True
            )
            subprocess.run(
                ["terraform", "-chdir=f{self.terraform_dir}/{env}", "refresh", "-input=false"],
                check=True, capture_output=True
            )
            plan = subprocess.run(
                ["terraform", "-chdir=f{self.terraform_dir}/{env}", "plan", "-detailed-exitcode", "-input=false"],
                capture_output=True, text=True
            )

            if plan.returncode == 2:
                result["drifted"] = True
                result["resources"] = self._parse_drifted_resources(plan.stdout)
        except subprocess.CalledProcessError as e:
            result["error"] = str(e)

        return result

    def _parse_drifted_resources(self, plan_output: str) -> List[str]:
        """Extract resource addresses from plan output."""
        resources = []
        for line in plan_output.split("\n"):
            if line.startswith("  # ") and "will be" in line:
                resources.append(line.strip())
        return resources

    def send_alert(self, drift_results: List[Dict]) -> None:
        """Send email alert if drift is detected."""
        drifted_envs = [r for r in drift_results if r["drifted"]]
        if not drifted_envs:
            return

        body = "Drift detected in the following environments:\n\n"
        for env in drifted_envs:
            body += f"Environment: {env['environment']}\n"
            for resource in env["resources"]:
                body += f"  - {resource}\n"
            body += "\n"

        msg = MIMEText(body)
        msg["Subject"] = "[ALERT] Terraform Drift Detected"
        msg["From"] = "infra-alerts@example.com"
        msg["To"] = "platform-team@example.com"

        with smtplib.SMTP("smtp.example.com", 587) as server:
            server.send_message(msg)

# Example usage
detector = DriftDetector("terraform/environments", ["prod", "staging", "dev"])
results = [detector.check_drift(env) for env in detector.environments]
detector.send_alert(results)
```

## Mejores Practicas Adicionales

1. **Usa `terraform plan -out` para persistir planes para auditoria.** Guardar el archivo de plan crea un registro inmutable de lo que se reviso y aplico:

```bash
#!/bin/bash
set -euo pipefail

ENV="${1:?Usage: $0 <environment>}"
PLAN_FILE="plans/${ENV}-$(date +%Y%m%d-%H%M%S).tfplan"

mkdir -p plans/
terraform -chdir=terraform/environments/${ENV} init -input=false
terraform -chdir=terraform/environments/${ENV} plan -out="../../${PLAN_FILE}" -input=false

echo "Plan saved to ${PLAN_FILE}"
echo "Review the plan, then run:"
echo "  terraform -chdir=terraform/environments/${ENV} apply \"../../${PLAN_FILE}\""
```

2. **Etiqueta todos los recursos consistentemente para seguimiento de costos y propiedad.** Usa un bloque de tags por defecto en la configuracion del provider de Terraform:

```hcl
# Default tags applied to all AWS resources
provider "aws" {
  default_tags {
    tags = {
      Environment   = var.environment
      ManagedBy     = "terraform"
      Project       = var.project_name
      CostCenter    = var.cost_center
      Owner         = var.owner_team
      LastReviewed  = formatdate("YYYY-MM-DD", timestamp())
    }
  }
}
```

## Errores Comunes Adicionales

1. **Usar `terraform import` sin actualizar el codigo.** Importar un recurso al estado sin escribir el codigo de Terraform correspondiente crea una discrepancia. Siempre escribe el bloque del recurso primero, luego importa:

```bash
# Wrong: import without code
terraform import aws_s3_bucket.my_bucket my-bucket-name
# State now has a resource with no code backing it

# Correct: write code first, then import
# 1. Add resource block to .tf file
# 2. Run import
terraform import aws_s3_bucket.my_bucket my-bucket-name
# 3. Run plan to verify code matches reality
terraform plan
```

2. **No usar `prevent_destroy` para recursos criticos.** Agrega bloques lifecycle para prevenir eliminacion accidental de recursos stateful como bases de datos:

```hcl
resource "aws_rds_instance" "main" {
  # ... configuration ...

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      # Ignore changes that are managed outside Terraform
      engine_version,
    ]
  }
}
```

## Preguntas Frecuentes Adicionales

### Como manejamos secretos en Terraform sin hardcodearlos?

Usa un gestor de secretos y referencia los secretos al momento de aplicar. Para AWS, usa parameter store o Secrets Manager con data sources:

```hcl
# Fetch secret from AWS Secrets Manager
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "prod/db/password"
}

resource "aws_db_instance" "main" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
  # Never hardcode: password = "supersecretpassword123"
}
```

Para Terraform Cloud o Enterprise, usa variables de workspace marcadas como sensibles. Para GitLab CI, usa variables CI/CD enmascaradas. Nunca almacenes secretos en archivos `.tfvars` commiteados a control de versiones.

### Cual es la diferencia entre `terraform refresh` y `terraform apply -refresh-only`?

`terraform refresh` actualiza el archivo de estado para coincidir con la infraestructura real pero no genera un plan. Esta siendo deprecado en favor de `terraform apply -refresh-only`, que te muestra que cambio antes de actualizar el estado. Usa `-refresh-only` para detectar drift de forma segura sin riesgo de modificaciones no intencionales. Siempre revisa la salida antes de confirmar.
