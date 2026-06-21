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
- [ ] Architecture Decision Record (ADR) incluido para cambios significativos
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

## Mejores Prácticas

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
