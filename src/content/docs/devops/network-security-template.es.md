---


contentType: docs
slug: network-security-template
title: "Plantilla de Seguridad de Red"
description: "Una plantilla para documentar el inventario de reglas de seguridad de VPC, firewall y DNS."
metaDescription: "Usa esta plantilla de seguridad de red para inventariar reglas de VPC, configuraciones de firewall, ajustes de DNS y controles de acceso a la red."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - network-security
  - vpc
  - firewall
  - dns
  - template
relatedResources:
  - /docs/auto-scaling-policy-template
  - /docs/backup-and-restore-template
  - /docs/cloud-cost-allocation-template
  - /docs/cross-region-failover-template
  - /docs/deployment-checklist-template
  - /docs/bug-triage-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de seguridad de red para inventariar reglas de VPC, configuraciones de firewall, ajustes de DNS y controles de acceso a la red."
  keywords:
    - devops
    - seguridad-de-red
    - vpc
    - firewall
    - dns
    - plantilla


---
## Visión General

Tu red es el perímetro. Reglas de firewall mal configuradas, security groups demasiado permisivos y registros DNS obsoletos son puntos de entrada comunes para atacantes. Esta plantilla inventaría tus controles de seguridad de red para que puedas auditarlos, rastrear cambios y demostrar cumplimiento durante una revisión de seguridad.

## Cuándo Usar

Usa este recurso cuando:
- Onboardees un nuevo servicio que requiere reglas de acceso a la red
- Realices una auditoría de seguridad trimestral o preparación para prueba de penetración
- Migres infraestructura a un nuevo VPC o proveedor de nube

## Solución

```markdown
# Inventario de Seguridad de Red: `<Entorno>`

## 1. Alcance

| Campo | Valor |
|-------|-------|
| Entorno | `prod / staging / dev` |
| Proveedor de Nube | `AWS / GCP / Azure / On-prem` |
| CIDR de Red | `10.0.0.0/16` |
| Última Revisión | `YYYY-MM-DD` |
| Revisor | `@security-team` |

## 2. Segmentación de VPC / Red

| Segmento | CIDR | Propósito | Acceso a Internet | Peering |
|----------|------|-----------|-------------------|---------|
| Subnet pública | `10.0.1.0/24` | Load balancers, bastion | Sí (solo egress) | Ninguno |
| Subnet de aplicación | `10.0.2.0/24` | Microservicios | No | Peered a shared services |
| Subnet de base de datos | `10.0.3.0/24` | PostgreSQL, Redis | No | Peered a shared services |
| Subnet de administración | `10.0.4.0/24` | CI/CD runners, monitoreo | Sí (NAT) | Ninguno |
| Servicios compartidos | `10.1.0.0/24` | SSO, logging, secretos | No | Peered a todos los VPCs |

## 3. Reglas de Firewall / Security Groups

### 3.1. Reglas de Entrada

| Origen | Protocolo | Puerto | Destino | Justificación | Última Revisión |
|--------|-----------|--------|---------|---------------|---------------|
| `0.0.0.0/0` | TCP | 443 | ALB público | HTTPS público | `YYYY-MM-DD` |
| `10.0.2.0/24` | TCP | 5432 | Subnet de base de datos | Aplicación → DB | `YYYY-MM-DD` |
| `10.0.4.0/24` | TCP | 22 | Bastion host | Acceso admin | `YYYY-MM-DD` |
| `CIDR VPN` | TCP | 3389 | Windows jump host | Acceso admin | `YYYY-MM-DD` |

### 3.2. Reglas de Salida

| Destino | Protocolo | Puerto | Origen | Justificación | Última Revisión |
|---------|-----------|--------|--------|---------------|---------------|
| `0.0.0.0/0` | TCP | 443 | Todas las subnets | Actualizaciones de software, APIs | `YYYY-MM-DD` |
| `0.0.0.0/0` | TCP | 53 | Todas las subnets | Resolución DNS | `YYYY-MM-DD` |
| `0.0.0.0/0` | UDP | 53 | Todas las subnets | Resolución DNS | `YYYY-MM-DD` |
| `Rango IP SaaS` | TCP | 443 | Subnet de aplicación | API de terceros | `YYYY-MM-DD` |

## 4. Configuración de DNS

| Registro | Tipo | Valor | TTL | Propósito | Seguro |
|----------|------|-------|-----|-----------|--------|
| `api.example.com` | A | IP ALB | 60s | API pública | DNSSEC habilitado |
| `internal.example.com` | A | IP privada | 300s | Servicios internos | Solo zona privada |
| `cdn.example.com` | CNAME | `cdn.provider.com` | 300s | Entrega de assets | HTTPS forzado |

## 5. Controles de Acceso a la Red

| Control | Implementación | Alcance | Estado |
|---------|----------------|---------|--------|
| Protección DDoS | AWS Shield / Cloud Armor / Azure DDoS | Endpoints públicos | Activo |
| WAF | AWS WAF / Cloudflare / ModSecurity | Endpoints públicos | Activo |
| Detección de intrusiones | Suricata / GuardDuty / Azure Sentinel | Flow logs de VPC | Activo |
| VPN / Zero Trust | WireGuard / Zscaler / BeyondCorp | Todo acceso admin | Activo |
| Endpoints privados | VPC endpoints / PrivateLink / Private Link | Servicios AWS / Azure | Activo |

## 6. Registro de Cambios

| Fecha | Cambio | Solicitante | Aprobado Por | Ticket |
|-------|--------|-------------|--------------|--------|
| `YYYY-MM-DD` | Abrir puerto 5432 para nuevo servicio de analytics | `data-team` | `security-team` | `SEC-123` |
| `YYYY-MM-DD` | Eliminar SSH de subnet pública | `sre-team` | `security-team` | `SEC-124` |
```

## Explicación

La plantilla trata tu red como un **sistema de defensa en profundidad**. La segmentación asegura que si una subnet es comprometida, el atacante no puede moverse lateralmente hacia la base de datos. Cada regla requiere una **justificación** y una **fecha de última revisión**, para que reglas obsoletas no persistan indefinidamente. Los registros DNS son frecuentemente pasados por alto en revisiones de seguridad, pero DNS secuestrado o obsoleto puede redirigir tráfico a infraestructura controlada por atacantes.

## Variantes

| Entorno | Enfoque | Notas |
|---------|---------|-------|
| AWS | VPC + Security Groups + NACLs | Usa NACLs para reglas a nivel de subnet, SGs para nivel de instancia |
| GCP | VPC Firewall Rules + Cloud Armor | Las reglas de firewall son stateful; usa service accounts para identidad |
| Azure | NSGs + Azure Firewall | Los NSGs aplican a subnets o NICs; Azure Firewall para logging central |
| Kubernetes | Network Policies + Cilium / Calico | Enforce aislamiento de namespaces; default-deny es más seguro |
| Híbrido / On-prem | Firewall físico + SD-WAN | Documenta tanto rutas lógicas como físicas |

## Lo que funciona

1. Denegar todo por defecto; whitelista solo lo requerido con justificación documentada
2. Revisa reglas de firewall trimestralmente; elimina reglas que ya no tienen justificación válida
3. No uses `0.0.0.0/0` para entrada excepto a un load balancer que termina TLS
4. Habilita flow logs de VPC y reténlos por al menos 90 días para análisis forense
5. Usa endpoints privados para servicios de nube en lugar de enrutar tráfico por internet público

## Errores Comunes

1. Permitir SSH o RDP desde `0.0.0.0/0` en lugar de solo desde bastion o VPN
2. Reusar el mismo security group en producción y staging, difuminando límites
3. Olvidar eliminar reglas temporales agregadas durante un incidente o sesión de debugging
4. No monitorear flow logs de VPC, perdiendo movimiento lateral durante una brecha
5. Hardcodear direcciones IP en DNS en lugar de usar CNAMEs a load balancers

## Preguntas Frecuentes

### ¿Cómo audito security groups existentes rápidamente?

Usa `aws ec2 describe-security-groups` (o equivalente) y exporta a CSV. Ordena por reglas de entrada con `0.0.0.0/0`. Cruza cada regla con tickets de cambio. Si una regla no tiene justificación o no ha sido revisada en más de un año, márcala para eliminación y notifica al equipo propietario.

### ¿Debería usar Network ACLs o Security Groups?

Ambos. Los **security groups** son stateful y aplican a instancias; son tu control primario. Los **NACLs** son stateless y aplican a subnets; úsalos como defensa de respaldo de grano grueso. Por ejemplo, un NACL puede bloquear un puerto completamente a nivel de subnet incluso si un security group lo permite por error.

### ¿Cómo aseguro registros DNS?

Habilita DNSSEC para zonas públicas para prevenir envenenamiento de caché. Usa TTLs cortos (60–300s) para registros que pueden necesitar cambios rápidos. Monitorea cambios no autorizados de registros con logs de auditoría del proveedor DNS. Para DNS interno, restringe transferencias de zona a servidores autorizados y usa zonas privadas solo accesibles dentro del VPC.

## Soluciones Avanzadas

### Auditoría automatizada de security groups con AWS CLI

Exporta y analiza todas las reglas de security groups para encontrar configuraciones demasiado permisivas:

```python
import boto3
import csv
from dataclasses import dataclass
from typing import List

@dataclass
class SecurityGroupFinding:
    group_id: str
    group_name: str
    direction: str  # ingress or egress
    protocol: str
    from_port: int
    to_port: int
    cidr: str
    is_overly_permissive: bool
    vpc_id: str

class SecurityGroupAuditor:
    def __init__(self, region: str = "us-east-1"):
        self.ec2 = boto3.client("ec2", region_name=region)

    def audit_all_security_groups(self) -> List[SecurityGroupFinding]:
        """Audit all security groups for overly permissive rules."""
        findings = []
        response = self.ec2.describe_security_groups()

        for sg in response["SecurityGroups"]:
            for rule_type in ["IpPermissions", "IpPermissionsEgress"]:
                direction = "ingress" if rule_type == "IpPermissions" else "egress"
                for rule in sg.get(rule_type, []):
                    for ip_range in rule.get("IpRanges", []):
                        cidr = ip_range.get("CidrIp", "N/A")
                        is_permissive = cidr == "0.0.0.0/0"
                        # Flag 0.0.0.0/0 on non-HTTP/HTTPS ports as critical
                        if is_permissive:
                            from_port = rule.get("FromPort", 0)
                            if from_port not in [443, 80, 53]:
                                is_permissive = True

                        findings.append(SecurityGroupFinding(
                            group_id=sg["GroupId"],
                            group_name=sg["GroupName"],
                            direction=direction,
                            protocol=rule.get("IpProtocol", "all"),
                            from_port=rule.get("FromPort", 0),
                            to_port=rule.get("ToPort", 0),
                            cidr=cidr,
                            is_overly_permissive=is_permissive,
                            vpc_id=sg.get("VpcId", "default"),
                        ))
        return findings

    def export_findings(self, output_file: str) -> None:
        """Export findings to CSV for audit trail."""
        findings = self.audit_all_security_groups()
        with open(output_file, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "Group ID", "Group Name", "Direction", "Protocol",
                "From Port", "To Port", "CIDR", "Overly Permissive", "VPC ID"
            ])
            for finding in findings:
                writer.writerow([
                    finding.group_id, finding.group_name, finding.direction,
                    finding.protocol, finding.from_port, finding.to_port,
                    finding.cidr, finding.is_overly_permissive, finding.vpc_id,
                ])

        risky = [f for f in findings if f.is_overly_permissive]
        print(f"Total rules: {len(findings)}")
        print(f"Overly permissive rules: {len(risky)}")
        for r in risky:
            print(f"  RISK: {r.group_name} ({r.direction}) - {r.protocol}:{r.from_port} from {r.cidr}")

# Example usage
auditor = SecurityGroupAuditor(region="us-east-1")
auditor.export_findings("sg-audit-report.csv")
```

### Análisis de flow logs de VPC para detección de movimiento lateral

Analiza flow logs de VPC para detectar patrones de tráfico sospechoso:

```bash
#!/bin/bash
set -euo pipefail

# Query VPC flow logs for rejected traffic in the last 24 hours
LOG_GROUP="/aws/vpc/flow-logs"
START_TIME=$(date -d '24 hours ago' +%s)000
END_TIME=$(date +%s)000

aws logs filter-log-events \
  --log-group-name "$LOG_GROUP" \
  --start-time "$START_TIME" \
  --end-time "$END_TIME" \
  --filter-pattern "REJECT" \
  --query 'events[*].message' \
  --output text | while read -r line; do
    # Parse flow log fields: version account-id srcaddr dstaddr srcport dstport protocol packets bytes start end action log-status
    SRC=$(echo "$line" | awk '{print $4}')
    DST=$(echo "$line" | awk '{print $5}')
    DSTPORT=$(echo "$line" | awk '{print $7}')
    ACTION=$(echo "$line" | awk '{print $13}')

    echo "REJECTED: $SRC -> $DST:$DSTPORT ($ACTION)"
  done

# Aggregate by source IP to find scanning attempts
echo ""
echo "=== Top Source IPs by Rejected Connections ==="
aws logs filter-log-events \
  --log-group-name "$LOG_GROUP" \
  --start-time "$START_TIME" \
  --end-time "$END_TIME" \
  --filter-pattern "REJECT" \
  --query 'events[*].message' \
  --output text | \
  awk '{print $4}' | \
  sort | uniq -c | sort -rn | head -20
```

### Enforce de network policies de Kubernetes con Cilium

Define y verifica políticas default-deny en todos los namespaces:

```yaml
# default-deny-all.yaml - Apply to every namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
# allow-dns.yaml - Explicitly allow DNS
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
---
# allow-frontend-to-backend.yaml - Specific service communication
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-to-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
```

```bash
#!/bin/bash
# Verify all namespaces have default-deny policies
set -euo pipefail

NAMESPACES=$(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}')
for ns in $NAMESPACES; do
  POLICIES=$(kubectl get networkpolicy -n "$ns" -o json | \
    jq -r '.items[] | select(.metadata.name | test("default-deny")) | .metadata.name')

  if [ -z "$POLICIES" ]; then
    echo "WARNING: Namespace '$ns' has no default-deny network policy"
  else
    echo "OK: Namespace '$ns' has policy: $POLICIES"
  fi
done
```

## Mejores Prácticas Adicionales


- For a deeper guide, see [Auto-Scaling Policy Template](/es/docs/auto-scaling-policy-template/).

1. **Implementa filtrado de egress para prevenir exfiltración de datos.** Restringe el tráfico saliente a destinos conocidos en lugar de permitir egress `0.0.0.0/0`:

```python
# Example: AWS security group with restricted egress
import boto3

ec2 = boto3.client("ec2", region_name="us-east-1")

# Replace 0.0.0.0/0 egress with specific destinations
ec2.revoke_security_group_egress(
    GroupId="sg-xxxxxxxx",
    IpPermissions=[{
        "IpProtocol": "-1",
        "IpRanges": [{"CidrIp": "0.0.0.0/0"}],
    }],
)

# Add specific egress rules
ec2.authorize_security_group_egress(
    GroupId="sg-xxxxxxxx",
    IpPermissions=[
        {
            "IpProtocol": "tcp",
            "FromPort": 443,
            "ToPort": 443,
            "IpRanges": [
                {"CidrIp": "52.94.236.248/32", "Description": "S3 endpoint"},
                {"CidrIp": "10.0.0.0/16", "Description": "Internal VPC"},
            ],
        },
    ],
)
```

2. **Etiqueta security groups con metadatos de propiedad y propósito.** Los tags facilitan identificar qué equipo es dueño de una regla y por qué existe:

```bash
# Tag a security group with ownership info
aws ec2 create-tags \
  --resources sg-xxxxxxxx \
  --tags \
    Key=Owner,Value=platform-team \
    Key=Purpose,Value=public-alb-https \
    Key=ReviewedDate,Value=2026-06-01 \
    Key=Ticket,Value=SEC-123
```

## Errores Comunes Adicionales

1. **No auditar conexiones de peering entre VPCs.** Las reglas de peering pueden evadir controles de security groups si no se gestionan cuidadosamente. Audita las conexiones de peering regularmente:

```bash
# List all VPC peering connections and their status
aws ec2 describe-vpc-peering-connections \
  --query 'VpcPeeringConnections[*].{
    Id:VpcPeeringConnectionId,
    Requester:RequesterVpcInfo.CidrBlock,
    Accepter:AccepterVpcInfo.CidrBlock,
    Status:Status.Code
  }' \
  --output table
```

2. **Ignorar las prefix lists gestionadas por el proveedor de nube.** Las prefix lists de AWS pueden referenciar conjuntos de IPs dinámicos. No rastrear cambios en estas listas puede abrir acceso inesperado:

```bash
# List all managed prefix lists and their entries
aws ec2 describe-managed-prefix-lists \
  --query 'PrefixLists[*].{Id:PrefixListId,Name:PrefixListName,Entries:PrefixListName}' \
  --output table

# Get entries for a specific prefix list
aws ec2 get-managed-prefix-list-entries \
  --prefix-list-id pl-xxxxxxxx \
  --output table
```

## Preguntas Frecuentes Adicionales

### ¿Cómo manejamos la seguridad de red para workloads serverless o containerizados?

Para serverless (Lambda, Cloud Run), usa configuración de VPC con subnets privadas y NAT gateways. Para contenedores, usa Network Policies de Kubernetes o equivalentes nativos de la nube como AWS Security Groups for Pods. Aplica el mismo principio de default-deny: comienza sin acceso, luego agrega solo lo que el workload necesita.

### ¿Cuál es la diferencia entre reglas de firewall stateful y stateless?

Los firewalls stateful (como AWS Security Groups) permiten automáticamente el tráfico de retorno para conexiones establecidas. Los firewalls stateless (como AWS NACLs) requieren reglas explícitas para ambas direcciones. Las reglas stateful son más fáciles de gestionar pero las stateless proporcionan una capa adicional de defensa en el límite de la subnet.
