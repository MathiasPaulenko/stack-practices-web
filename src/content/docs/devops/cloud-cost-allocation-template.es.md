---



contentType: docs
slug: cloud-cost-allocation-template
title: "Plantilla de Asignación de Costos en la Nube"
description: "Una plantilla para rastrear y asignar costos de nube por equipo y entorno."
metaDescription: "Usa esta plantilla de asignación de costos en la nube para rastrear y atribuir gastos de nube por equipo, entorno y servicio."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - cloud
  - cost
  - finops
  - allocation
  - template
relatedResources:
  - /docs/auto-scaling-policy-template
  - /docs/deployment-checklist-template
  - /docs/api-status-page-template
  - /docs/bug-report-template
  - /docs/capacity-planning-template
  - /docs/weekly-ops-review-template
  - /docs/bug-triage-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de asignación de costos en la nube para rastrear y atribuir gastos de nube por equipo, entorno y servicio."
  keywords:
    - devops
    - nube
    - costos
    - finops
    - asignacion
    - plantilla



---
## Visión General

Las facturas de nube crecen en silencio. Un entorno de staging olvidado, una instancia de base de datos sobre-dimensionada o un trabajo de CI descontrolado pueden duplicar tu gasto mensual sin que nadie lo note. Esta plantilla crea un modelo transparente de asignación de costos para que los equipos entiendan quién gasta qué, finanzas puedan pronosticar con precisión y los ingenieros optimicen con datos.

## Cuándo Usar


- For alternatives, see [Auto-Scaling Policy Template](/es/docs/auto-scaling-policy-template/).

Usa este recurso cuando:
- Tu factura de nube está creciendo y ningún equipo asume la responsabilidad de investigar
- Finanzas pide un desglose de gastos por equipo, entorno o servicio
- Estás implementando prácticas de FinOps o migrando a un modelo de chargeback

## Solución

```markdown
# Asignación de Costos en la Nube: `<Organización>`

## 1. Modelo de Asignación

| Dimensión | Método | Granularidad | Herramienta |
|-----------|--------|-------------|-------------|
| Equipo | Tag `team` | Por recurso | Exportación de facturación del proveedor de nube |
| Entorno | Tag `env` | Por recurso | Exportación de facturación del proveedor de nube |
| Servicio | Tag `service` | Por recurso | Exportación de facturación del proveedor de nube |
| Compartido | División equitativa por cantidad de equipos | Toda la plataforma | Hoja de asignación |

### 1.1. Política de Tags

| Tag | Requerido | Valores Permitidos | Ejemplo |
|-----|-----------|-------------------|---------|
| `team` | Sí | `platform`, `payments`, `growth`, `data` | `payments` |
| `env` | Sí | `prod`, `staging`, `dev`, `sandbox` | `prod` |
| `service` | Sí | Nombre del microservicio o identificador de app | `checkout-api` |
| `cost-center` | Sí | Código de centro de costos de finanzas | `CC-1234` |
| `owner` | Recomendado | Email de individuo o equipo | `payments@company.com` |

- [ ] Cada recurso tiene todos los tags requeridos antes del despliegue
- [ ] CI/CD bloquea despliegues con tags faltantes
- [ ] Auditoría mensual de recursos sin tag; auto-asignación al equipo de plataforma después de 7 días

## 2. Desglose de Costos por Categoría

### 2.1. Cómputo

| Servicio | Métrica | Costo Unitario | Gasto Mensual | Participación del Equipo |
|----------|---------|----------------|---------------|-------------------------|
| EC2 / VMs | vCPU-horas | $0.05/hr | $12,000 | Por tag |
| Kubernetes | vCPU + memoria | $0.03/vCPU/hr | $8,000 | Labels de namespace |
| Serverless | Invocaciones + duración | $0.20/millón | $1,500 | Tags de función |

### 2.2. Almacenamiento

| Servicio | Métrica | Costo Unitario | Gasto Mensual | Participación del Equipo |
|----------|---------|----------------|---------------|-------------------------|
| Almacenamiento en bloque | GB-mes | $0.10/GB | $3,000 | Por tag |
| Almacenamiento de objetos | GB-mes + requests | $0.023/GB | $5,000 | Tags de bucket |
| Base de datos | Instancia + almacenamiento | $0.15/GB | $6,000 | Por tag |
| Backup | GB-mes | $0.05/GB | $800 | Tag del recurso fuente |

### 2.3. Redes

| Servicio | Métrica | Costo Unitario | Gasto Mensual | Método de Asignación |
|----------|---------|----------------|---------------|---------------------|
| Transferencia de datos | GB | $0.09/GB | $2,500 | Tag fuente |
| Load balancer | Horas + LCU | $0.025/hr | $1,200 | Tag del servicio destino |
| NAT gateway | Horas + datos | $0.045/hr | $900 | Compartido / división por equipo |
| CDN | GB + requests | $0.085/GB | $3,000 | Tag de dominio |

## 3. Asignación de Costos Compartidos

| Servicio Compartido | Total Mensual | Base de Asignación | Razonamiento |
|---------------------|---------------|-------------------|-------------|
| Observabilidad | $4,000 | Por cantidad de personas del equipo | Todos se benefician equitativamente |
| CI/CD runners | $2,500 | Por minutos de build por equipo | Basado en uso |
| VPC / VPN | $1,000 | División equitativa por equipo | Infraestructura fija |
| IAM / SSO | $500 | División equitativa por equipo | Infraestructura fija |

## 4. Cadencia de Reportes

| Reporte | Frecuencia | Audiencia | Acción |
|---------|-----------|-----------|--------|
| Dashboard de gasto por equipo | Semanal | Líderes de ingeniería | Identificar anomalías |
| Presupuesto vs real | Mensual | Finanzas + Ingeniería | Ajustes de pronóstico |
| Costo por request | Mensual | Producto + Ingeniería | Tendencias de eficiencia |
| Revisión de capacidad reservada | Trimestral | Plataforma + Finanzas | Planificación de compromisos |

## 5. Detección de Anomalías

| Condición | Umbral | Acción | Escalación |
|-----------|--------|--------|------------|
| Gasto diario > 150% de la línea base | 1 día | Alertar Slack del equipo | 24 horas |
| Recursos sin tag > $500 | Mensual | Asignar al equipo de plataforma | Finanzas |
| Utilización de instancia reservada < 80% | Semanal | Right-size o intercambio | Plataforma |
| Recursos huérfanos (sin tráfico) | Semanal | Auto-eliminación después de 14 días | Líder de equipo |
```

## Explicación

La asignación de costos solo funciona cuando **cada recurso está taggeado consistentemente**. Sin tags, el gasto se convierte en "overhead compartido" que ningún equipo asume. La plantilla impone una política de tags aplicada en CI/CD, de modo que cada recurso desplegado sea rastreable a un equipo y servicio. La sección de **costos compartidos** reconoce que cierta infraestructura beneficia a todos y no puede taggearse directamente. La base de asignación (cantidad de personas, uso, división equitativa) debe acordarse con finanzas de antemano para evitar disputas.

## Politica de Etiquetas con Terraform

```hcl
# Modulo de Terraform con etiquetas obligatorias
variable "required_tags" {
  type = map(string)
  default = {
    Team        = "platform"
    Environment = "production"
    Project     = "api-gateway"
    CostCenter  = "PL-0001"
  }
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  tags          = var.required_tags
}

# Validacion de etiquetas en CI
resource "null_resource" "tag_validator" {
  provisioner "local-exec" {
    command = "python3 scripts/validate_tags.py --tfplan tfplan.json"
  }
}
```

## Script de Deteccion de Recursos Sin Etiquetar

```python
#!/usr/bin/env python3
"""Detecta recursos sin etiquetar en AWS y reporta el costo estimado."""
import boto3
import json
from datetime import datetime, timedelta

def check_untagged_resources():
    ce = boto3.client('ce')
    ec2 = boto3.client('ec2')

    # Consultar costo por recurso en los ultimos 7 dias
    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')

    response = ce.get_cost_and_usage(
        TimePeriod={'Start': start_date, 'End': end_date},
        Granularity='DAILY',
        Filter={'Dimensions': {'Key': 'RECORD_TYPE', 'Values': ['Usage']}},
        GroupBy=[{'Type': 'DIMENSION', 'Key': 'RESOURCE_ID'}],
        Metrics=['UnblendedCost']
    )

    untagged_cost = 0
    untagged_resources = []

    for group in response['ResultsByTime']:
        for result in group['Groups']:
            resource_id = result['Keys'][0]
            cost = float(result['Metrics']['UnblendedCost']['Amount'])
            if cost > 0:
                # Verificar si el recurso tiene etiquetas
                try:
                    if 'instance/' in resource_id:
                        instance_id = resource_id.split('/')[-1]
                        tags = ec2.describe_tags(
                            Filters=[{'Name': 'resource-id', 'Values': [instance_id]}]
                        )
                        if not tags['Tags']:
                            untagged_cost += cost
                            untagged_resources.append({
                                'resource_id': resource_id,
                                'cost': cost
                            })
                except Exception:
                    pass

    print(f'Recursos sin etiquetar: {len(untagged_resources)}')
    print(f'Costo estimado semanal: ${untagged_cost:.2f}')
    if untagged_cost > 500:
        print('ALERTA: Recursos sin etiquetar superan $500/semana')
        # Enviar alerta a Slack
    return untagged_resources

if __name__ == '__main__':
    check_untagged_resources()
```

## Dashboard de Costos por Equipo

```text
=== Dashboard de Costos por Equipo (Mensual) ===

Equipo Platform:
  EC2:          $3,200  (40%)
  RDS:          $1,800  (22%)
  S3:             $400  (5%)
  DataTransfer:   $600  (8%)
  Total:        $6,000  (100%)

Equipo Data:
  EMR:          $4,500  (55%)
  RDS:          $2,000  (24%)
  S3:          $1,200  (15%)
  Lambda:         $500  (6%)
  Total:        $8,200  (100%)

Equipo Frontend:
  CloudFront:   $1,200  (60%)
  S3:             $300  (15%)
  EC2:            $500  (25%)
  Total:        $2,000  (100%)

Costos Compartidos:
  Load Balancers: $800
  Monitoring:     $400
  Networking:     $300
  Total:        $1,500

TOTAL MENSUAL: $17,700
```


## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Multi-nube | Normalizar tags entre AWS, GCP, Azure | Usa una única herramienta de FinOps (CloudHealth, Kubecost) |
| Kubernetes-heavy | Labels de namespace + Kubecost | Asigna por labels de pod, no tags de nodo |
| SaaS con tenants | Aislamiento de tenant + división de infra compartida | Chargeback al equipo de customer success para la plataforma compartida |
| Startup / equipo pequeño | Simplificado: env + team solamente | Omite tags de servicio hasta tener > 5 microservicios |

## Lo que funciona

1. Enforce tags en CI/CD, no como auditoría post-despliegue
2. Asigna costos compartidos por una base que todos acepten (cantidad de personas, uso, ingresos)
3. Revisa right-sizing mensual; la mejor optimización de costos es no gastarlo
4. Separa presupuestos de producción y no-producción; staging debe ser < 10% de prod
5. Usa instancias reservadas o savings plans para capacidad baseline, pero solo después de load testing

## Errores Comunes

1. Taggear después del despliegue, lo que genera un gasto grande sin taggear
2. Usar diferentes claves de tag entre equipos (`team`, `owner`, `department`)
3. Ignorar costos de transferencia de datos, que pueden superar los costos de cómputo
4. Asignar puramente por cantidad de personas cuando un equipo ejecuta el 90% de las cargas de trabajo
5. Comprar capacidad reservada antes de entender los patrones de uso reales

## Preguntas Frecuentes

### ¿Cómo manejo la agregación de costos multi-nube?

Usa una plataforma de FinOps (CloudHealth, Finout, Vantage) o construye un pipeline que exporte CSVs de facturación de cada nube a un data warehouse. Normaliza las claves de tag durante la ingesta. La clave es un dashboard, no tres.

### ¿Cuál es la diferencia entre showback y chargeback?

**Showback** reporta costos a los equipos para generar conciencia pero no mueve dinero. **Chargeback** factura realmente a los equipos internos desde un presupuesto central de nube. Comienza con showback para crear conciencia, luego migra a chargeback una vez que los tags y la asignación sean maduros.

### ¿Cómo reduzco costos sin impactar la confiabilidad?

Haz right-sizing de instancias basado en uso real de CPU/memoria (no pico). Usa spot/preemptible para cargas no críticas. Archiva logs y datos antiguos. Habilita auto-apagado de entornos de desarrollo fuera de horario. Cada cambio debe tener un plan de rollback y ser probado en staging.


### Como implementamos aplicacion de etiquetas en CI/CD?

Usa Terraform Cloud o GitHub Actions con validacion de etiquetas. Crea un script que analice el plan de Terraform y verifique que todos los recursos tengan las etiquetas requeridas (team, environment, project, cost-center). Falla el pipeline si falta alguna etiqueta. Para recursos existentes, ejecuta escaneos semanales con Cloud Custodian o scripts personalizados que identifiquen recursos sin etiquetar y notifiquen a los responsables.

### Que es Cloud Custodian y como nos ayuda?

Cloud Custodian (c7n) es una herramienta de codigo abierto para gestion de nube que permite escribir politicas en YAML para auditar, hacer cumplir y optimizar recursos en AWS, Azure y GCP. Puedes escribir reglas como "eliminar recursos sin etiquetar despues de 7 dias" o "detener instancias EC2 fuera de horario laboral". Ejecutalo diariamente via Lambda o CI/CD. Almacena los resultados en S3 o CloudWatch para auditoria.

### Como manejamos costos de transferencia de datos entre regiones?

La transferencia de datos entre regiones tiene costo en ambos lados. Rastrea el egreso por region usando AWS Cost Explorer con agrupacion por region. Asigna los costos de transferencia al servicio que inicia la transferencia. Para arquitecturas multi-region, considera usar VPC peering o Transit Gateway para reducir costos. Documenta los patrones de transferencia y revisalos trimestralmente para identificar optimizaciones.

### Como optimizamos costos de Kubernetes?

1. Usa requests y limits apropiados por pod. 2. Habilita Horizontal Pod Autoscaler para escalar con la demanda. 3. Usa spot instances para workloads no criticos. 4. Implementa cluster autoscaler para ajustar nodos. 5. Revisa recursos inactivos (pods sin trafico, namespaces abandonados). 6. Usa Kubecost o similar para visibilidad por namespace. 7. Consolida servicios pequenos en un cluster compartido. 8. Usa node groups con instancias mixtas.

### Como calculamos el costo por usuario activo?

Costo total del servicio dividido por usuarios activos mensuales (MAU). Incluye todos los costos directos (computo, almacenamiento, red) y los costos compartidos asignados. Rastrea esto mensualmente. Si el costo por usuario aumenta mientras el numero de usuarios se mantiene, hay ineficiencia. Compara entre equipos para identificar outliers. Establece un objetivo de costo por usuario y revisalo trimestralmente.
