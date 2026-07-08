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

## Lo que funciona

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

### Ciclo de vida y limpieza de buckets S3

```bash
#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
BUCKET="${1:-my-app-logs}"
LIFECYCLE_FILE="/tmp/lifecycle.json"

# Aplicar política de ciclo de vida: transición a IA después de 30 días, Glacier después de 90, eliminar después de 365
cat > "$LIFECYCLE_FILE" <<EOF
{
    "Rules": [
        {
            "ID": "LogLifecycleRule",
            "Status": "Enabled",
            "Filter": { "Prefix": "logs/" },
            "Transitions": [
                { "Days": 30, "StorageClass": "STANDARD_IA" },
                { "Days": 90, "StorageClass": "GLACIER" }
            ],
            "Expiration": { "Days": 365 }
        }
    ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
    --bucket "$BUCKET" \
    --lifecycle-configuration "file://$LIFECYCLE_FILE" \
    --region "$REGION"

echo "Política de ciclo de vida aplicada al bucket $BUCKET"

# Listar objetos con más de 90 días para auditoría
aws s3api list-objects-v2 \
    --bucket "$BUCKET" \
    --prefix "logs/" \
    --query "Contents[?LastModified<='$(date -d '90 days ago' -I)'].[Key,LastModified,Size]" \
    --output table \
    --region "$REGION"
```

### Gestión de snapshots de EC2

```bash
#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
RETENTION_DAYS="${1:-30}"

# Crear snapshots de todos los volúmenes EBS con el tag Backup
VOLUME_IDS=$(aws ec2 describe-volumes \
    --filters "Name=tag:Backup,Values=true" \
    --query 'Volumes[*].VolumeId' \
    --output text \
    --region "$REGION")

for vol_id in $VOLUME_IDS; do
    SNAP_ID=$(aws ec2 create-snapshot \
        --volume-id "$vol_id" \
        --description "Automated backup $(date -I)" \
        --tag-specifications "ResourceType=snapshot,Tags=[{Key=CreatedBy,Value=bash-script},{Key=Date,Value=$(date -I)}]" \
        --query 'SnapshotId' \
        --output text \
        --region "$REGION")
    echo "Snapshot $SNAP_ID creado para volumen $vol_id"
done

# Eliminar snapshots anteriores al período de retención
CUTOFF=$(date -d "$RETENTION_DAYS days ago" -I)
OLD_SNAPS=$(aws ec2 describe-snapshots \
    --owner-ids self \
    --filters "Name=tag:CreatedBy,Values=bash-script" \
    --query "Snapshots[?StartTime<='$CUTOFF'].SnapshotId" \
    --output text \
    --region "$REGION")

for snap_id in $OLD_SNAPS; do
    aws ec2 delete-snapshot --snapshot-id "$snap_id" --region "$REGION"
    echo "Snapshot antiguo $snap_id eliminado"
done
```

### Auditoría de cumplimiento de tagging

```bash
#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
REQUIRED_TAGS=("Project" "Environment" "Owner" "CostCenter")

# Auditar instancias EC2 por tags requeridos faltantes
INSTANCES=$(aws ec2 describe-instances \
    --query 'Reservations[*].Instances[?State.Name==`running`].[InstanceId,Tags]' \
    --output json \
    --region "$REGION")

echo "$INSTANCES" | jq -c '.[]' | while read -r instance; do
    instance_id=$(echo "$instance" | jq -r '.[0]')
    tags=$(echo "$instance" | jq -r '.[1] // [] | map(.Key)')
    missing=()
    for req_tag in "${REQUIRED_TAGS[@]}"; do
        if ! echo "$tags" | grep -q "\"$req_tag\""; then
            missing+=("$req_tag")
        fi
    done
    if [ ${#missing[@]} -gt 0 ]; then
        echo "VIOLACIÓN: $instance_id falta tags: ${missing[*]}"
    fi
done

# Auditar buckets S3 por tags faltantes
BUCKETS=$(aws s3api list-buckets --query 'Buckets[*].Name' --output text --region "$REGION")
for bucket in $BUCKETS; do
    bucket_tags=$(aws s3api get-bucket-tagging --bucket "$bucket" --query 'TagSet[*].Key' --output text 2>/dev/null || echo "")
    missing=()
    for req_tag in "${REQUIRED_TAGS[@]}"; do
        if ! echo "$bucket_tags" | grep -qw "$req_tag"; then
            missing+=("$req_tag")
        fi
    done
    if [ ${#missing[@]} -gt 0 ]; then
        echo "VIOLACIÓN: bucket $bucket falta tags: ${missing[*]}"
    fi
done
```

### Creación de dashboard de CloudWatch

```bash
#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
DASHBOARD_NAME="${1:-app-overview}"

DASHBOARD_BODY=$(cat <<EOF
{
    "widgets": [
        {
            "type": "metric",
            "x": 0, "y": 0, "width": 12, "height": 6,
            "properties": {
                "metrics": [
                    ["AWS/EC2", "CPUUtilization", "AutoScalingGroupName", "app-asg"],
                    [".", "NetworkIn", ".", "."]
                ],
                "period": 300,
                "stat": "Average",
                "region": "$REGION",
                "title": "EC2 CPU y Red"
            }
        },
        {
            "type": "metric",
            "x": 12, "y": 0, "width": 12, "height": 6,
            "properties": {
                "metrics": [
                    ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", "app-db"],
                    [".", "DatabaseConnections", ".", "."]
                ],
                "period": 300,
                "stat": "Average",
                "region": "$REGION",
                "title": "RDS CPU y Conexiones"
            }
        },
        {
            "type": "log",
            "x": 0, "y": 6, "width": 24, "height": 6,
            "properties": {
                "query": "SOURCE 'app-logs' | fields @timestamp, level, message | filter level = \"ERROR\" | sort @timestamp desc | limit 20",
                "region": "$REGION",
                "title": "Errores Recientes"
            }
        }
    ]
}
EOF
)

aws cloudwatch put-dashboard \
    --dashboard-name "$DASHBOARD_NAME" \
    --dashboard-body "$DASHBOARD_BODY" \
    --region "$REGION"

echo "Dashboard $DASHBOARD_NAME creado"
```

### Despliegue multi-entorno con AWS SSO

```bash
#!/usr/bin/env bash
set -euo pipefail

ACCOUNTS=("dev:111111111111" "staging:222222222222" "prod:333333333333")
ROLE_NAME="DeploymentRole"

for account in "${ACCOUNTS[@]}"; do
    ENV="${account%%:*}"
    ACCOUNT_ID="${account##*:}"

    echo "=== Desplegando a $ENV ($ACCOUNT_ID) ==="

    # Asumir rol vía SSO
    CREDS=$(aws sts assume-role \
        --role-arn "arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME" \
        --role-session-name "deploy-$ENV-$(date +%s)" \
        --query 'Credentials' \
        --output json)

    export AWS_ACCESS_KEY_ID=$(echo "$CREDS" | jq -r '.AccessKeyId')
    export AWS_SECRET_ACCESS_KEY=$(echo "$CREDS" | jq -r '.SecretAccessKey')
    export AWS_SESSION_TOKEN=$(echo "$CREDS" | jq -r '.SessionToken')

    # Desplegar: actualizar función Lambda
    aws lambda update-function-code \
        --function-name "app-handler" \
        --zip-file "fileb://dist/handler.zip" \
        --region "$AWS_REGION"

    # Verificar despliegue
    STATUS=$(aws lambda get-function \
        --function-name "app-handler" \
        --query 'Configuration.LastUpdateStatus' \
        --output text)

    echo "Despliegue a $ENV: $STATUS"

    # Limpiar credenciales
    unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
done
```

## Mejores Prácticas Adicionales

1. **Usa paginación del AWS CLI para conjuntos de resultados grandes.** La flag `--page-size` controla cuántos items se obtienen por llamada API. Para listar miles de objetos S3 o instancias EC2, usa `--page-size 1000` para reducir el número de llamadas API y evitar throttling:

```bash
aws s3api list-objects-v2 --bucket "$BUCKET" --page-size 1000 --query 'Contents[*].Key' --output text
```

2. **Habilita el modo retry del CLI para scripts de automatización.** Configura el modo retry a `adaptive` para manejar throttling transitorio automáticamente. Esto es especialmente importante para scripts que hacen muchas llamadas API secuenciales:

```bash
aws configure set default.retry_mode adaptive
# O por comando: --cli-retry-mode adaptive
```

3. **Usa `--no-paginate` cuando solo necesitas la primera página.** Si sabes que el conjunto de resultados es pequeño, deshabilitar la paginación evita llamadas API innecesarias y acelera la ejecución del script:

```bash
aws ec2 describe-instances --no-paginate --query 'Reservations[0].Instances[0].InstanceId' --output text
```

## Errores Comunes Adicionales

1. **No manejar la consistencia eventual.** Las APIs de AWS son eventualmente consistentes. Después de crear un recurso, una llamada `describe` subsecuente puede no retornarlo inmediatamente. Agrega un wait o poll loop:

```bash
VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 --query 'Vpc.VpcId' --output text)
# Esperar a que el VPC esté disponible
aws ec2 wait vpc-available --vpc-ids "$VPC_ID"
# Ahora es seguro crear la subnet
```

2. **Usar `aws s3 cp` en lugar de `aws s3 sync` para transferencias batch.** El comando `cp` re-sube todos los archivos cada vez. `sync` solo transfiere archivos cambiados, ahorrando ancho de banda y tiempo:

```bash
# Incorrecto: re-sube todo
aws s3 cp ./build/ s3://my-bucket/ --recursive

# Correcto: solo sube archivos cambiados
aws s3 sync ./build/ s3://my-bucket/ --delete --exclude "*.tmp"
```

3. **No configurar perfiles del CLI para múltiples cuentas.** Hardcodear IDs de cuenta o cambiar credenciales manualmente es propenso a errores. Usa perfiles nombrados en `~/.aws/config`:

```ini
[profile dev]
role_arn = arn:aws:iam::111111111111:role/DeploymentRole
source_profile = default

[profile prod]
role_arn = arn:aws:iam::333333333333:role/DeploymentRole
source_profile = default
```

```bash
# Usar perfil en scripts
aws ec2 describe-instances --profile prod --region us-east-1
```

## FAQ Adicional

### ¿Cómo manejo errores del AWS CLI programáticamente?

Verifica códigos de salida y captura stderr. El AWS CLI retorna códigos de salida no cero en caso de fallo y escribe mensajes de error a stderr. Usa `set -euo pipefail` para fallar rápido, y captura errores para logging:

```bash
if ! aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --region "$REGION" 2>/dev/null; then
    echo "ERROR: Instancia $INSTANCE_ID no encontrada o acceso denegado"
    exit 1
fi
```

Para manejo de errores más estructurado, usa `--output json` y parsea con `jq`:

```bash
RESULT=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --output json 2>&1) || {
    ERROR_CODE=$(echo "$RESULT" | jq -r '.Code // "Unknown"')
    ERROR_MSG=$(echo "$RESULT" | jq -r '.Message // "Unknown"')
    echo "Error AWS [$ERROR_CODE]: $ERROR_MSG"
    exit 1
}
```

### ¿Esta solución está lista para producción?

Sí. El AWS CLI es la herramienta oficial para automatización de AWS y es usada por Netflix, Airbnb y GitHub para automatización de infraestructura. Wrappers de Bash alrededor del CLI son un patrón estándar para pipelines CI/CD, jobs de limpieza y scripts operacionales. Los patrones de ciclo de vida S3, snapshots EBS y cumplimiento de tagging mostrados aquí se usan en producción por equipos que gestionan miles de recursos AWS. Para gestión compleja de infraestructura, complementa estos scripts con Terraform o CloudFormation para tracking de estado y detección de drift.

### ¿Cuáles son las características de rendimiento?

Cada llamada del AWS CLI toma 200-800ms dependiendo de la API y región. Scripts que hacen 50 llamadas secuenciales toman 10-40 segundos. Usa `--page-size 1000` para reducir el conteo de llamadas en operaciones de listado. Ejecución paralela con `xargs -P` puede reducir el wall time en 3-5x para operaciones independientes. Subidas a S3 están limitadas por ancho de banda de red — `aws s3 sync` transfiere 5-50MB/s por conexión. El uso de memoria del CLI es bajo 50MB por proceso. El modo `adaptive` retry añade 1-5 segundos por retry pero previene fallos de script durante throttling.

### ¿Cómo depuro problemas con este enfoque?

Ejecuta `aws configure list` para verificar credenciales y región. Usa la flag `--debug` para ver requests y responses HTTP completos: `aws ec2 describe-instances --debug 2>&1 | head -100`. Verifica permisos IAM con `aws iam simulate-principal-policy`. Testea scripts con `--dry-run` antes de ejecutar operaciones mutantes. Usa `aws cloudtrail lookup-events` para auditar qué llamadas API hizo tu script. Para problemas de S3, verifica políticas de bucket con `aws s3api get-bucket-policy`. Para errores de autenticación, verifica que los tokens SSO no hayan expirado con `aws sso list-account-roles`.
