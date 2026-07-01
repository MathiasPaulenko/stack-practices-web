---
contentType: recipes
slug: bash-aws-cli-scripts
title: "Automatización de AWS CLI con Bash"
description: "Automatiza el aprovisionamiento de recursos AWS con bash y AWS CLI."
metaDescription: "Automatiza recursos AWS con bash y AWS CLI. Scripting de aprovisionamiento EC2, gestión de buckets S3 y automatización de políticas IAM con ejemplos prácticos."
difficulty: intermediate
topics:
  - devops
tags:
  - bash
  - aws
  - cli
  - automation
  - cloud
  - infrastructure
relatedResources:
  - /recipes/bash-aws-cli-automation
  - /docs/auto-scaling-policy-template
  - /recipes/bash-backup-rotation
  - /recipes/bash-disk-usage-monitor
  - /recipes/bash-log-rotation
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Automatiza recursos AWS con bash y AWS CLI. Scripting de aprovisionamiento EC2, gestión de buckets S3 y automatización de políticas IAM con ejemplos prácticos."
  keywords:
    - bash aws cli
    - automatización aws
    - aprovisionamiento EC2
    - gestión S3 bash
    - IAM audit bash
---
## Visión General

El AWS CLI envuelve llamadas a la API de AWS en una herramienta de línea de comandos. Combinado con bash, puedes automatizar aprovisionamiento de infraestructura, operaciones S3, gestión de IAM y monitoreo de costos. Esta recipe cubre patrones comunes de automatización de AWS usando scripts bash.

## Cuándo Usar

- Necesitas automatizar aprovisionamiento y teardown de instancias EC2
- Quieres gestionar buckets S3 y sincronizar archivos programáticamente
- Necesitas auditar permisos IAM en tu cuenta de AWS
- Estás construyendo scripts de deploy que interactúan con recursos AWS

## Solución

### Aprovisionar una instancia EC2

```bash
#!/bin/bash

set -euo pipefail

INSTANCE_NAME="web-server-01"
AMI_ID="ami-0c55b159cbfafe1f0"
INSTANCE_TYPE="t3.micro"
KEY_NAME="my-key-pair"
SECURITY_GROUP="sg-12345678"
SUBNET_ID="subnet-12345678"

INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$AMI_ID" \
    --instance-type "$INSTANCE_TYPE" \
    --key-name "$KEY_NAME" \
    --security-group-ids "$SECURITY_GROUP" \
    --subnet-id "$SUBNET_ID" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${INSTANCE_NAME}}]" \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "Launched instance: $INSTANCE_ID"

# Wait for instance to be running
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID"

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo "Instance running at: $PUBLIC_IP"
```

### Listar todas las instancias EC2 con detalles

```bash
#!/bin/bash

aws ec2 describe-instances \
    --query 'Reservations[*].Instances[*].[InstanceId,State.Name,InstanceType,PublicIpAddress,Tags[?Key==`Name`].Value | [0]]' \
    --output table
```

### Gestión de buckets S3

```bash
#!/bin/bash

BUCKET_NAME="my-app-backups-$(date +%Y%m%d)"
REGION="us-east-1"

# Create bucket
if [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$BUCKET_NAME"
else
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$REGION" \
        --create-bucket-configuration LocationConstraint="$REGION"
fi

echo "Created bucket: $BUCKET_NAME"

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket "$BUCKET_NAME" \
    --versioning-configuration Status=Enabled

# Set lifecycle policy (delete after 90 days)
cat > /tmp/lifecycle.json << 'EOF'
{
    "Rules": [
        {
            "ID": "DeleteOldObjects",
            "Status": "Enabled",
            "Expiration": { "Days": 90 },
            "NoncurrentVersionExpiration": { "NoncurrentDays": 30 },
            "Filter": {}
        }
    ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
    --bucket "$BUCKET_NAME" \
    --lifecycle-configuration file:///tmp/lifecycle.json

echo "Versioning and lifecycle policy configured"
```

### Sincronizar directorio local a S3

```bash
#!/bin/bash

LOCAL_DIR="/var/backups/app"
S3_BUCKET="my-app-backups"
S3_PREFIX="daily"

# Sync with delete and exclude temp files
aws s3 sync "$LOCAL_DIR" "s3://${S3_BUCKET}/${S3_PREFIX}/" \
    --delete \
    --exclude "*.tmp" \
    --exclude "*.lock" \
    --storage-class STANDARD_IA

echo "Synced $LOCAL_DIR to s3://${S3_BUCKET}/${S3_PREFIX}/"
```

### Auditoría de usuarios IAM

```bash
#!/bin/bash

echo "=== IAM User Audit ==="
echo "Date: $(date)"
echo ""

# List all users
USERS=$(aws iam list-users --query 'Users[*].UserName' --output text)

for user in $USERS; do
    echo "--- User: $user ---"

    # Get access keys
    KEYS=$(aws iam list-access-keys --user-name "$user" --output text 2>/dev/null)
    if [ -n "$KEYS" ]; then
        echo "Access keys:"
        echo "$KEYS" | tr '\t' '\n'
    else
        echo "No access keys"
    fi

    # Get attached policies
    POLICIES=$(aws iam list-attached-user-policies --user-name "$user" \
        --query 'AttachedPolicies[*].PolicyName' --output text 2>/dev/null)
    if [ -n "$POLICIES" ]; then
        echo "Attached policies: $POLICIES"
    fi

    # Get groups
    GROUPS=$(aws iam list-groups-for-user --user-name "$user" \
        --query 'Groups[*].GroupName' --output text 2>/dev/null)
    if [ -n "$GROUPS" ]; then
        echo "Groups: $GROUPS"
    fi

    echo ""
done
```

### Detener e iniciar instancias EC2 por tag

```bash
#!/bin/bash

# Stop all instances tagged Environment=dev
INSTANCE_IDS=$(aws ec2 describe-instances \
    --filters "Name=tag:Environment,Values=dev" "Name=instance-state-name,Values=running" \
    --query 'Reservations[*].Instances[*].InstanceId' \
    --output text)

if [ -z "$INSTANCE_IDS" ]; then
    echo "No running dev instances found"
    exit 0
fi

echo "Stopping instances: $INSTANCE_IDS"
aws ec2 stop-instances --instance-ids $INSTANCE_IDS

# Wait for stop
aws ec2 wait instance-stopped --instance-ids $INSTANCE_IDS
echo "All dev instances stopped"
```

### Monitoreo de costos con AWS Cost Explorer

```bash
#!/bin/bash

START_DATE=$(date -d "30 days ago" +%Y-%m-%d)
END_DATE=$(date +%Y-%m-%d)

aws ce get-cost-and-usage \
    --time-period Start="$START_DATE",End="$END_DATE" \
    --granularity DAILY \
    --metrics UnblendedCost \
    --group-by Type=SERVICE \
    --query 'ResultsByTime[*].[TimePeriod.Start,Groups[*].[Keys[0],Metrics.UnblendedCost.Amount]]' \
    --output table
```

### Limpieza de volúmenes EBS no usados

```bash
#!/bin/bash

# Find unattached volumes
VOLUMES=$(aws ec2 describe-volumes \
    --filters "Name=status,Values=available" \
    --query 'Volumes[*].[VolumeId,Size,Tags[?Key==`Name`].Value | [0]]' \
    --output text)

if [ -z "$VOLUMES" ]; then
    echo "No unused volumes found"
    exit 0
fi

echo "Unused EBS volumes:"
echo "$VOLUMES"

# Delete each volume
for vol_id in $(echo "$VOLUMES" | awk '{print $1}'); do
    echo "Deleting volume: $vol_id"
    aws ec2 delete-volume --volume-id "$vol_id"
done

echo "Cleanup complete"
```

### Backup de snapshot RDS

```bash
#!/bin/bash

DB_INSTANCE="my-database"
SNAPSHOT_ID="${DB_INSTANCE}-snapshot-$(date +%Y%m%d-%H%M%S)"

aws rds create-db-snapshot \
    --db-instance-identifier "$DB_INSTANCE" \
    --db-snapshot-identifier "$SNAPSHOT_ID"

echo "Creating snapshot: $SNAPSHOT_ID"

# Wait for snapshot to complete
aws rds wait db-snapshot-available \
    --db-snapshot-identifier "$SNAPSHOT_ID"

echo "Snapshot created: $SNAPSHOT_ID"

# Clean up snapshots older than 30 days
OLD_SNAPSHOTS=$(aws rds describe-db-snapshots \
    --db-instance-identifier "$DB_INSTANCE" \
    --query "DBSnapshots[?SnapshotCreateTime<\`$(date -d '30 days ago' -I)\`].DBSnapshotIdentifier" \
    --output text)

for snapshot in $OLD_SNAPSHOTS; do
    echo "Deleting old snapshot: $snapshot"
    aws rds delete-db-snapshot --db-snapshot-identifier "$snapshot"
done
```

## Explicación

El AWS CLI devuelve JSON por defecto. Usar `--query` con expresiones JMESPath y `--output text|table` hace el output amigable para scripts. La sintaxis `--query` filtra y da forma a la respuesta antes de que llegue a bash.

Patrones clave:

- **`--query`**: Expresión JMESPath para extraer campos específicos de la respuesta de la API.
- **`--output text`**: Devuelve texto plano, un valor por línea. Ideal para capturar en variables.
- **`--output table`**: Formato legible para humanos para reportes y auditorías.
- **Comandos `wait`**: Bloquean hasta que una operación long-running completa (instance running, snapshot available, etc.).
- **`set -euo pipefail`**: Fails fast en errores, variables undefined y pipe failures.

## Variantes

| Enfoque | Herramienta | Complejidad | Usar Cuando |
|---------|------------|------------|-------------|
| AWS CLI + bash | aws cli | Baja | Scripts rápidos, automatización simple |
| AWS SDK (Python) | boto3 | Media | Lógica compleja, manejo de errores |
| AWS SDK (JavaScript) | aws-sdk | Media | Entornos Node.js |
| Terraform | terraform | Alta | Infrastructure as code |
| CloudFormation | aws cloudformation | Alta | IaC declarativo |

## Pautas

- Siempre setea `set -euo pipefail` al inicio de los scripts. Fail fast en errores.
- Usa `--query` para extraer solo los campos que necesitas. Evita parsear JSON en bash.
- Usa comandos `wait` en vez de pollear con `sleep`. Son más confiables.
- Taguea todos los recursos. Los tags facilitan la limpieza y asignación de costos.
- Usa IAM roles para instancias EC2 en vez de embeber access keys en scripts.
- Testea scripts contra una cuenta no productiva primero.

## Errores Comunes

- Embeber credenciales AWS en scripts. Usa variables de entorno o IAM roles.
- No manejar rate limits de la API. AWS throttlear peticiones; agrega retries con `--retry-attempts`.
- Olvidar esperar operaciones async. El script continúa antes de que el recurso esté listo.
- No limpiar recursos. Volúmenes EBS huérfanos y snapshots viejos generan costos.
- Usar `--output json` y parsear con `jq` cuando `--query` puede hacerlo nativamente.

## Preguntas Frecuentes

### ¿Cómo manejo errores de AWS CLI en bash?

Verifica el exit code y captura stderr:

```bash
if ! aws s3 ls "s3://my-bucket" 2>/dev/null; then
    echo "Bucket does not exist or access denied"
    exit 1
fi
```

### ¿Cómo asumo un rol antes de ejecutar comandos?

```bash
ROLE_ARN="arn:aws:iam::123456789012:role/MyRole"

CREDENTIALS=$(aws sts assume-role \
    --role-arn "$ROLE_ARN" \
    --role-session-name "my-script" \
    --query 'Credentials' \
    --output json)

export AWS_ACCESS_KEY_ID=$(echo "$CREDENTIALS" | jq -r '.AccessKeyId')
export AWS_SECRET_ACCESS_KEY=$(echo "$CREDENTIALS" | jq -r '.SecretAccessKey')
export AWS_SESSION_TOKEN=$(echo "$CREDENTIALS" | jq -r '.SessionToken')

# Now run AWS commands as the assumed role
aws s3 ls
```

### ¿Cómo ejecuto el mismo comando en múltiples regiones?

```bash
REGIONS=("us-east-1" "us-west-2" "eu-west-1")

for region in "${REGIONS[@]}"; do
    echo "=== Region: $region ==="
    aws ec2 describe-instances --region "$region" \
        --query 'Reservations[*].Instances[*].[InstanceId,State.Name]' \
        --output table
done
```

### ¿Cómo hago dry-run de operaciones destructivas?

Usa el flag `--dry-run`. AWS valida la petición sin hacer cambios:

```bash
aws ec2 terminate-instances --instance-ids "i-12345678" --dry-run
```

Si el output dice `DryRunOperation`, la petición tendría éxito. Si dice `UnauthorizedOperation`, te faltan permisos.
