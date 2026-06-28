---
contentType: recipes
slug: bash-aws-cli-automation
title: "Automatización de AWS CLI con Bash"
description: "Automatiza el aprovisionamiento, etiquetado y limpieza de recursos de AWS usando scripts de Bash envueltos alrededor de AWS CLI."
metaDescription: "Automatiza recursos de AWS con Bash y AWS CLI. Aprovisiona recursos, aplica tags consistentes, programa limpiezas y reduce operaciones cloud manuales."
difficulty: intermediate
topics:
  - file-handling
tags:
  - bash
  - aws
  - cli
  - automation
  - cloud
relatedResources:
  - /recipes/bash-scripting-automation
  - /recipes/bash-backup-rotation-script
  - /recipes/bash-ssh-key-management
  - /recipes/bash-iptables-firewall-rules
  - /recipes/bash-log-rotation-compression
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Automatiza recursos de AWS con Bash y AWS CLI. Aprovisiona recursos, aplica tags consistentes, programa limpiezas y reduce operaciones cloud manuales."
  keywords:
    - bash
    - aws
    - cli
    - automatización
    - cloud
---
## Visión General

El AWS CLI es potente pero verboso. Envolverlo en scripts de Bash te permite aprovisionar, etiquetar y limpiar recursos de forma consistente entre entornos. Ya sea que estés levantando un stack de prueba, aplicando políticas de tagging o eliminando recursos no utilizados, un script reduce errores de copiar y pegar y hace que las operaciones sean repetibles.

## Cuándo Usar

Usa este recurso cuando:
- Necesites crear o destruir recursos de AWS repetidamente.
- Quieras aplicar etiquetado consistente en todos los recursos.
- Automatizar la limpieza de entornos de desarrollo o sandbox.
- Prefieras scripts de shell sobre Terraform o CloudFormation para tareas simples.

## Solución

### Script de automatización con AWS CLI

```bash
#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
PROJECT="${1:-demo}"
ENV="${2:-dev}"

TAGS="Key=Project,Value=$PROJECT Key=Environment,Value=$ENV Key=ManagedBy,Value=bash-script"

# Crear un VPC con tags
VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 --region "$REGION" --query 'Vpc.VpcId' --output text)
aws ec2 create-tags --resources "$VPC_ID" --tags $TAGS --region "$REGION"

# Crear una subnet
SUBNET_ID=$(aws ec2 create-subnet --vpc-id "$VPC_ID" --cidr-block 10.0.1.0/24 --region "$REGION" --query 'Subnet.SubnetId' --output text)
aws ec2 create-tags --resources "$SUBNET_ID" --tags $TAGS --region "$REGION"

# Función de limpieza
cleanup() {
    echo "Cleaning up resources..."
    aws ec2 delete-subnet --subnet-id "$SUBNET_ID" --region "$REGION" || true
    aws ec2 delete-vpc --vpc-id "$VPC_ID" --region "$REGION" || true
}
trap cleanup EXIT

echo "Created VPC $VPC_ID and subnet $SUBNET_ID"
```

## Explicación

El script lee la región de AWS desde una variable de entorno y acepta nombres de proyecto y entorno como argumentos. Crea un VPC, lo etiqueta, crea una subnet, la etiqueta, y registra un trap de limpieza que elimina ambos recursos cuando el script termina. Usar `|| true` en la función de limpieza evita que un fallo durante el teardown falle todo el script. Las flags `--query` y `--output text` extraen solo los IDs de recursos necesarios para comandos posteriores.

## Variantes

| Tarea | Comando AWS CLI | Notas |
|-------|-----------------|-------|
| Listar sin tags | `aws ec2 describe-instances` | Filtrar por ausencia de tag |
| Etiquetar recursos | `aws ec2 create-tags` | Etiquetado masivo por IDs |
| Borrar antiguos | `aws ec2 describe-snapshots` | Filtrar por fecha, luego eliminar |
| Asumir rol | `aws sts assume-role` | Usar credenciales temporales |

## Mejores Prácticas

1. **Usa `--query` y `--output text` para parsear IDs.** Evita el parsing frágil de JSON o tablas.
2. **Etiqueta todo inmediatamente.** Es más fácil agregar tags al crear que aplicarlos retroactivamente.
3. **Agrega un trap de limpieza para recursos temporales.** Esto evita infraestructura de prueba abandonada que aumente la factura.
4. **Asume roles de mínimo privilegio.** Usa `aws sts assume-role` en lugar de claves de acceso de larga duración.
5. **Valida con `--dry-run` primero.** El AWS CLI soporta dry-run para muchas llamadas mutantes, especialmente EC2.

## Errores Comunes

1. **Hardcodear credenciales en scripts.** Usa roles IAM, variables de entorno o AWS SSO en su lugar.
2. **Olvidar manejar dependencias.** No puedes eliminar un VPC que aún tiene subnets o dependencias.
3. **No usar trap de limpieza.** Un script fallado deja recursos corriendo y acumulando cargos.
4. **Usar la región default en silencio.** Siempre configura `AWS_REGION` o pasa `--region` explícitamente.
5. **Ignorar límites de tasa de la API.** Scripts grandes pueden alcanzar throttling; agrega reintentos o ralentiza con el modo de retry de `aws configure`.

## Preguntas Frecuentes

**P: ¿Cómo ejecuto esto en CI?**
R: Usa OIDC o credenciales temporales de AWS SSO. Nunca commitees claves de acceso en variables de CI.

**P: ¿Debería usar esto en lugar de Terraform?**
R: Para tareas puntuales o exploratorias, Bash más AWS CLI está bien. Para infraestructura de producción, usa Terraform o CloudFormation para gestión de estado y detección de drift.

**P: ¿Cómo encuentro y elimino recursos sin tags?**
R: Usa `aws resourcegroupstaggingapi get-resources` y luego elimina los ARNs devueltos con los comandos apropiados de cada servicio.
