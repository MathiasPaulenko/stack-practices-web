---




contentType: docs
slug: cloud-resource-tagging-policy-template
title: "Plantilla de Politica de Etiquetado de Recursos Cloud"
description: "Una plantilla de politica para aplicar etiquetas consistentes en recursos cloud y mejorar la asignacion de costos, la seguridad y las operaciones."
metaDescription: "Impone etiquetado consistente de recursos cloud con esta plantilla. Cubre etiquetas requeridas, convenciones de nombres, automatizacion y controles de gobernanza."
difficulty: beginner
topics:
  - infrastructure
  - devops
tags:
  - tagging
  - cloud-governance
  - cost-management
  - infrastructure
  - policy
relatedResources:
  - /docs/infrastructure-cost-allocation-template
  - /docs/cloud-cost-allocation-template
  - /docs/monitoring-alerting-policy-template
  - /docs/environment-configuration-template
  - /docs/ssl-certificate-management-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Impone etiquetado consistente de recursos cloud con esta plantilla. Cubre etiquetas requeridas, convenciones de nombres, automatizacion y controles de gobernanza."
  keywords:
    - politica de etiquetado de recursos cloud
    - gobernanza de etiquetas
    - etiquetas de recursos
    - etiquetas de asignacion de costos
    - metadata cloud




---

## Descripcion General

El Etiquetado de Recursos Cloud es la practica de aplicar etiquetas de metadatos a recursos cloud como maquinas virtuales, buckets de almacenamiento, bases de datos y componentes de red. Las etiquetas consistentes permiten la asignacion de costos, el control de acceso, las operaciones automatizadas y la auditoria de seguridad. Esta plantilla de politica define etiquetas requeridas, convenciones de nombres, mecanismos de cumplimiento y controles de gobernanza.

## Cuando Usar


- For alternatives, see [Infrastructure Cost Allocation Template](/es/docs/infrastructure-cost-allocation-template/).

- Configurar una nueva cuenta cloud o landing zone.
- Incorporar un equipo o carga de trabajo a la plataforma cloud.
- Preparar reportes de costos o auditorias de seguridad que requieran propiedad de recursos.
- Automatizar operaciones como backups, apagados o parches por etiqueta.
- Limpiar recursos sin etiquetar o etiquetados inconsistentemente.

## Prerequisitos

- Un proveedor cloud o entorno multi-cloud como AWS, Azure o GCP.
- Un dueno de la politica de etiquetado, tipicamente ingenieria de plataforma o gobernanza cloud.
- Una lista de etiquetas requeridas acordada con finanzas, seguridad y operaciones.
- Herramientas de policy-as-code o gobernanza de etiquetado nativas como AWS Organizations tag policies, Azure Policy o GCP Organization Policy.
- Un mecanismo para reportar y remediar recursos no conformes.

## Solucion

### Plantilla de Politica

#### 1. Etiquetas Requeridas

| Etiqueta | Requerida | Formato | Ejemplo | Proposito |
|----------|-----------|---------|---------|-----------|
| `owner` | Si | email o ID de equipo | `checkout-team@example.com` | Responsabilidad |
| `team` | Si | minusculas, sin espacios | `platform` | Propiedad del equipo |
| `product` | Si | minusculas, sin espacios | `api-gateway` | Mapeo de producto |
| `environment` | Si | minusculas | `production`, `staging`, `development` | Separacion de entornos |
| `cost-center` | Si | alfanumerico | `cc-12345` | Asignacion financiera |
| `budget-code` | No | alfanumerico | `budget-2026-q3` | Seguimiento de presupuesto |
| `data-classification` | Si | predefinido | `public`, `internal`, `confidential`, `restricted` | Clasificacion de seguridad |
| `compliance-scope` | No | predefinido | `pci`, `gdpr`, `soc2`, `none` | Alcance de cumplimiento |
| `auto-shutdown` | No | `true` / `false` | `true` | Automatizacion operacional |
| `backup-policy` | No | predefinido | `standard`, `critical`, `none` | Asignacion de backup |

#### 2. Convenciones de Nombres de Etiquetas

| Regla | Descripcion | Ejemplo |
|-------|-------------|---------|
| Minusculas | Todas las claves y valores de etiquetas en minusculas | `environment: production` |
| Sin espacios | Usar guiones en lugar de espacios | `cost-center: cc-12345` |
| Usar guiones, no guiones bajos | Separador consistente en claves y valores | `budget-code: budget-2026-q3` |
| Sin caracteres especiales | Evitar `!@#$%^&*` excepto guiones | `product: api-gateway` |
| Significativas y cortas | Usar abreviaturas claras | `team: sre` |
| Valores controlados para etiquetas restringidas | Usar valores permitidos para environment, clasificacion de datos, etc. | `environment: production` |

#### 3. Matriz de Cobertura de Etiquetado

| Tipo de Recurso | Etiquetas Requeridas | Soporte de Automatizacion |
|-----------------|----------------------|---------------------------|
| Instancias de computo | owner, team, product, environment, cost-center, data-classification | Si |
| Buckets de almacenamiento | owner, team, product, environment, cost-center, data-classification | Si |
| Bases de datos | owner, team, product, environment, cost-center, data-classification, backup-policy | Si |
| Recursos de red | owner, team, environment, cost-center | Parcial |
| Load balancers | owner, team, product, environment, cost-center | Si |
| Clusters Kubernetes | owner, team, product, environment, cost-center | Si |
| Contenedores y pods | team, product, environment | Via labels |
| Funciones serverless | owner, team, product, environment, cost-center | Si |
| Roles y politicas IAM | owner, team, environment, compliance-scope | Si |

#### 4. Mecanismos de Cumplimiento de Etiquetas

| Mecanismo | Alcance | Accion ante No Conformidad | Herramienta de Ejemplo |
|-----------|---------|------------------------------|------------------------|
| Linting de IaC | Pull request | Bloquear merge | Terraform policy, Checkov, tfsec |
| Politica de despliegue | Creacion de recurso | Bloquear o advertir | AWS Organizations, Azure Policy, GCP Organization Policy |
| Remediacion automatica | Recursos existentes | Agregar etiquetas por defecto o notificar dueno | Cloud Custodian, Azure Policy remediation |
| Escaneo de cumplimiento | Todos los recursos | Generar reporte y ticket | Prowler, Cloud Custodian, herramientas nativas |
| Filtrado de reportes de costo | Facturacion | Costos sin etiquetar asignados a presupuesto central | AWS Cost Explorer, Azure Cost Management |

#### 5. Manejo de Excepciones

| Escenario | Proceso | Dueno | Vencimiento |
|-----------|---------|-------|-------------|
| Recurso legacy sin etiquetas | Agregar etiquetas durante proxima ventana de mantenimiento o via remediacion automatica | Dueno del recurso | 30 dias |
| Recurso gestionado por terceros | Aplicar etiquetas a nivel de cuenta o proyecto si el etiquetado directo no es soportado | Equipo de plataforma | 90 dias |
| Recurso compartido | Etiquetar con dueno primario y agregar metadata de division de costos compartidos | Equipo de plataforma | 90 dias |
| Recurso temporal | Requerir etiquetas minimas al crear; auto-limpieza despues del vencimiento | Dueno del recurso | Vida util del recurso |
| Aprobacion de excepcion | Enviar solicitud de excepcion con aceptacion de riesgo y fecha de revision | Equipo de gobernanza | 6 meses |

#### 6. Checklist de Gobernanza

- [ ] Las etiquetas requeridas estan definidas y documentadas.
- [ ] Las claves y valores de etiquetas siguen las convenciones de nombres.
- [ ] Las plantillas de IaC exigen etiquetas al crear recursos.
- [ ] La politica cloud impide la creacion de recursos sin etiquetas cuando sea posible.
- [ ] El escaneo automatico reporta recursos no conformes semanalmente.
- [ ] Los recursos sin etiquetar se asignan a un centro de costos por defecto y se remedian.
- [ ] Los valores de etiquetas se mantienen en un registro central o lista de valores permitidos.
- [ ] La politica se revisa trimestralmente y se actualiza para nuevos servicios.
- [ ] El cumplimiento de etiquetas se incluye en revisiones de seguridad y costos.

## Explicacion

Las etiquetas son metadatos que potencian la asignacion de costos, seguridad, operaciones y cumplimiento. Una politica de etiquetado asegura que cada recurso tenga etiquetas consistentes y significativas desde la creacion hasta la retirada. Sin gobernanza, las etiquetas se vuelven inconsistentes, haciendo que la automatizacion y los reportes sean poco confiables. La combinacion de etiquetas requeridas, convenciones de nombres y herramientas de cumplimiento crea un modelo de operacion cloud preparado para crecer.

## Politica de Etiquetas con Terraform

```hcl
# Modulo de etiquetas obligatorias para AWS
variable "required_tags" {
  type = map(string)
  default = {
    Team        = ""
    Environment = ""
    Project     = ""
    CostCenter  = ""
    Owner       = ""
  }
}

locals {
  default_tags = {
    Team        = var.required_tags["Team"]
    Environment = var.required_tags["Environment"]
    Project     = var.required_tags["Project"]
    CostCenter  = var.required_tags["CostCenter"]
    Owner       = var.required_tags["Owner"]
    ManagedBy   = "terraform"
    CreatedAt   = formatdate("YYYY-MM-DD", timestamp())
  }
}

# Aplicar etiquetas a todos los recursos
resource "aws_instance" "app" {
  ami           = data.aws_ami.app.id
  instance_type = var.instance_type
  tags          = local.default_tags
}

resource "aws_s3_bucket" "data" {
  bucket = var.bucket_name
  tags   = local.default_tags
}

resource "aws_db_instance" "database" {
  engine         = "postgres"
  instance_class = var.db_class
  tags           = local.default_tags
}
```

## Script de Deteccion de Recursos Sin Etiquetar

```python
#!/usr/bin/env python3
"""Detectar recursos sin etiquetar en AWS."""
import boto3
import json
from datetime import datetime

REQUIRED_TAGS = ['Team', 'Environment', 'Project', 'CostCenter', 'Owner']
REGIONS = ['us-east-1', 'eu-west-1', 'ap-southeast-1']

def check_ec2_instances(region):
    ec2 = boto3.client('ec2', region_name=region)
    untagged = []
    response = ec2.describe_instances()
    for res in response['Reservations']:
        for inst in res['Instances']:
            tags = {t['Key']: t['Value'] for t in inst.get('Tags', [])}
            missing = [t for t in REQUIRED_TAGS if t not in tags]
            if missing:
                untagged.append({
                    'resource_id': inst['InstanceId'],
                    'type': 'EC2',
                    'region': region,
                    'missing_tags': missing,
                    'launch_time': inst['LaunchTime'].isoformat()
                })
    return untagged

def check_s3_buckets(region):
    s3 = boto3.client('s3', region_name=region)
    untagged = []
    for bucket in s3.list_buckets()['Buckets']:
        tags = s3.get_bucket_tagging(Bucket=bucket['Name']).get('TagSet', [])
        tag_keys = [t['Key'] for t in tags]
        missing = [t for t in REQUIRED_TAGS if t not in tag_keys]
        if missing:
            untagged.append({
                'resource_id': bucket['Name'],
                'type': 'S3',
                'region': region,
                'missing_tags': missing
            })
    return untagged

def check_rds_instances(region):
    rds = boto3.client('rds', region_name=region)
    untagged = []
    for db in rds.describe_db_instances()['DBInstances']:
        arn = db['DBInstanceArn']
        tags = rds.list_tags_for_resource(ResourceName=arn).get('TagList', [])
        tag_keys = [t['Key'] for t in tags]
        missing = [t for t in REQUIRED_TAGS if t not in tag_keys]
        if missing:
            untagged.append({
                'resource_id': db['DBInstanceIdentifier'],
                'type': 'RDS',
                'region': region,
                'missing_tags': missing
            })
    return untagged

def main():
    all_untagged = []
    for region in REGIONS:
        all_untagged.extend(check_ec2_instances(region))
        all_untagged.extend(check_s3_buckets(region))
        all_untagged.extend(check_rds_instances(region))

    report = {
        'timestamp': datetime.now().isoformat(),
        'total_untagged': len(all_untagged),
        'resources': all_untagged
    }
    print(json.dumps(report, indent=2))

    if all_untagged:
        print(f'\nRecursos sin etiquetar: {len(all_untagged)}')
        for r in all_untagged:
            print(f"  {r['type']} {r['resource_id']} ({r['region']}): falta {', '.join(r['missing_tags'])}")

if __name__ == '__main__':
    main()
```


## Variantes

- **Politica de etiquetado AWS**: Usa AWS Organizations tag policies, AWS Config rules y Cost Allocation Tags.
- **Politica de etiquetado Azure**: Usa Azure Policy, resource tags y cost management tags.
- **Politica de etiquetado GCP**: Usa GCP labels, Organization Policy y Resource Manager labels.
- **Politica de etiquetado multi-cloud**: Estandariza un conjunto comun de etiquetas en AWS, Azure y GCP con implementacion especifica por proveedor.
- **Politica de etiquetado de contenedores**: Se enfoca en labels y annotations de Kubernetes para pods, namespaces y nodos.
- **Politica de etiquetado centrada en seguridad**: Enfatiza clasificacion de datos, alcance de cumplimiento y etiquetas de segmentacion de red.

## Lo que funciona

- Exige etiquetas minimas requeridas al momento de crear recursos.
- Usa policy-as-code para validar etiquetas en pipelines de CI/CD e IaC.
- Aplica etiquetas consistentemente en computo, almacenamiento, red e IAM.
- Manten los valores de etiquetas en un vocabulario controlado para evitar duplicados y errores tipograficos.
- Usa automatizacion para remediar recursos sin etiquetar en lugar de depender de correcciones manuales.
- Incluye el cumplimiento de etiquetas en revisiones de costos y seguridad.
- Documenta la razon de cada etiqueta requerida para que los equipos entiendan el valor.
- Revisa los valores permitidos trimestralmente a medida que cambian equipos y productos.

## Errores Comunes

- Permitir valores de texto libre para etiquetas que deberian ser controladas.
- Etiquetar solo algunos tipos de recursos y omitir red o IAM.
- Depender del etiquetado manual despues de crear recursos.
- Usar convenciones de nombres diferentes en diferentes equipos o cuentas.
- No actualizar etiquetas cuando cambia la propiedad o el entorno.
- Tratar las etiquetas como metadata opcional en lugar de datos operativos.
- No reportar recursos sin etiquetar o asignar propiedad de remediacion.

## FAQs

### Que pasa si un recurso es compartido por multiples equipos?

Etiqueta el recurso con el dueno primario o el equipo que lo gestiona. Usa metadata adicional como una etiqueta de shared-cost o un reporte de asignacion de costos para distribuir los costos compartidos.

### Como cumplimos las etiquetas sin ralentizar el desarrollo?

Usa controles de policy-as-code en CI/CD que fallen rapido cuando faltan etiquetas requeridas. Provee plantillas y valores por defecto de auto-etiquetado para que los equipos no tengan que recordar cada etiqueta manualmente.

### Podemos etiquetar recursos existentes retroactivamente?

Si, usa herramientas nativas del cloud o automatizacion de terceros como Cloud Custodian para escanear, reportar y remediar recursos sin etiquetar. Establece un plazo para remediacion manual antes del etiquetado o apagado automatico.


### Como implementamos aplicacion de etiquetas en CI/CD?

Usa Terraform Cloud o GitHub Actions con validacion de etiquetas. Crea un script que analice el plan de Terraform y verifique que todos los recursos tengan las etiquetas requeridas (team, environment, project, cost-center). Falla el pipeline si falta alguna etiqueta. Para recursos existentes, ejecuta escaneos semanales con Cloud Custodian o scripts personalizados que identifiquen recursos sin etiquetar y notifiquen a los responsables.

### Que es Cloud Custodian y como nos ayuda?

Cloud Custodian (c7n) es una herramienta de codigo abierto para gestion de nube que permite escribir politicas en YAML para auditar, hacer cumplir y optimizar recursos en AWS, Azure y GCP. Puedes escribir reglas como "eliminar recursos sin etiquetar despues de 7 dias" o "detener instancias EC2 fuera de horario laboral". Ejecutalo diariamente via Lambda o CI/CD. Almacena los resultados en S3 o CloudWatch para auditoria.

### Como manejamos etiquetas para recursos compartidos?

Etiqueta el recurso con el dueno primario o el equipo que lo gestiona. Usa una etiqueta adicional Shared=true y un reporte de asignacion de costos para distribuir los costos compartidos. Documenta los acuerdos de costos compartidos en la politica de etiquetado. Para recursos compartidos por muchos equipos, considera usar un centro de costos dedicado en lugar de asignar a un solo equipo.

### Con que frecuencia debemos auditar el cumplimiento de etiquetas?

Ejecuta escaneos automaticos diariamente para detectar recursos sin etiquetar. Genera un reporte semanal de cumplimiento para liderazgo. Realiza una auditoria completa trimestral que incluya: porcentaje de recursos con etiquetas completas, recursos con etiquetas no conformes, costo asociado a recursos sin etiquetar, y tendencias de cumplimiento. Comparte el reporte con los equipos y establece plazos de remediacion.

### Como evitamos la proliferacion de valores de etiquetas no validos?

Mantén un registro central de valores permitidos para cada etiqueta. Usa AWS Organizations Tag Policies para restringir valores a nivel de organizacion. En Terraform, usa variables con validacion para limitar valores. En CI/CD, agrega un paso que valide los valores de etiquetas contra el registro central. Revisa y actualiza los valores permitidos trimestralmente a medida que cambian equipos y productos.
