---
contentType: docs
slug: network-segmentation-policy-template
title: "Plantilla de Politica de Segmentacion de Red"
description: "Una plantilla para documentar zonas de seguridad de red, reglas de segmentacion y controles de trafico entre ambientes e inquilinos."
metaDescription: "Documenta zonas de seguridad y reglas de segmentacion con esta plantilla. Cubre ambientes, niveles de confianza, controles y excepciones."
difficulty: intermediate
topics:
  - security
  - infrastructure
tags:
  - network-segmentation
  - security-policy
  - zero-trust
  - firewall
  - compliance
relatedResources:
  - /docs/devops/container-security-baseline-template
  - /docs/api-security-review-template
  - /docs/devops/rbac-policy-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Documenta zonas de seguridad y reglas de segmentacion con esta plantilla. Cubre ambientes, niveles de confianza, controles y excepciones."
  keywords:
    - segmentacion de red
    - zonas de seguridad de red
    - politica de seguridad
    - reglas de firewall
    - red zero trust
---

## Descripcion General

Una Politica de Segmentacion de Red define como la red de una organizacion se divide en zonas aisladas segun niveles de confianza, sensibilidad de datos y requisitos funcionales. Esta plantilla documenta el proposito de cada zona, el trafico permitido entre zonas y los controles que hacen cumplir el aislamiento. Soporta la arquitectura de confianza cero y el cumplimiento con estandares como PCI-DSS, HIPAA y SOC 2.

## Cuando Usar

- Definir la arquitectura de red para un nuevo entorno cloud o data center.
- Prepararse para una auditoria de seguridad o certificacion de cumplimiento.
- Incorporar un nuevo inquilino o unidad de negocio que necesita aislamiento.
- Despues de un incidente de movimiento lateral o brecha de segmentacion.
- Migrar desde una red plana a un modelo de confianza cero.

## Prerequisitos

- Un inventario de subnets, VPCs y redes virtuales actuales.
- Un esquema de clasificacion de datos que identifique datos sensibles vs publicos.
- Una lista de sistemas criticos y sus patrones de comunicacion.
- Propiedad de los equipos de red, seguridad y plataforma.

## Solucion

### Plantilla

#### 1. Declaracion de Politica

Todos los sistemas de produccion, datos sensibles y rutas de acceso privilegiado deben residir en segmentos de red separados de las redes publicas, de desarrollo e invitados. El trafico entre segmentos solo se permite a traves de rutas aprobadas, inspeccionado por firewalls y registrado para monitoreo.

#### 2. Zonas de Red

| Zona | Nivel de Confianza | Proposito | Ejemplos |
|------|--------------------|-----------|----------|
| Publica | No confiable | Puntos de entrada a internet | Balanceadores, CDN, WAF |
| DMZ | Bajo | Servicios que aceptan trafico publico | Servidores web, API gateways |
| Aplicacion | Medio | Logica interna de negocio | Servicios de aplicacion, microservicios |
| Datos | Alto | Bases de datos y almacenamiento persistente | PostgreSQL, S3, caches |
| Gestion | Alto | Interfaces administrativas | Bastion, VPN, jump hosts |
| Desarrollo | Restringido | Cargas de trabajo de ingenieria y prueba | CI/CD runners, VMs de dev |
| Invitada | No confiable | Acceso de visitantes o contratistas | Wi-Fi invitado, VPN contratista |

#### 3. Matriz de Trafico Permitido

| Zona Origen | Zona Destino | Permitido | Protocolo / Puerto | Justificacion | Control |
|-------------|--------------|-----------|--------------------|---------------|---------|
| Publica | DMZ | Si | HTTPS 443 | Trafico web publico | WAF + firewall |
| DMZ | Aplicacion | Si | HTTPS 443 | Peticiones API | Firewall de aplicacion |
| Aplicacion | Datos | Si | Especifico de BD | Consultas de aplicacion | Firewall de base de datos |
| Desarrollo | Produccion | No | Cualquiera | Separacion de deberes | Negacion por defecto |
| Invitada | Gestion | No | Cualquiera | Proteger rutas admin | Negacion por defecto |

#### 4. Controles de Segmentacion

| Control | Implementacion | Dueno | Frecuencia |
|---------|----------------|-------|------------|
| Reglas de firewall | Security groups cloud / firewall on-prem | Equipo de red | Revision trimestral |
| Tablas de ruteo | Ruteo a nivel de subnet impuesto | Equipo de plataforma | Por cambio |
| ACLs de red | Filtrado stateless adicional | Equipo de seguridad | Revision trimestral |
| Microsegmentacion | Politicas a nivel de carga de trabajo | Equipo de plataforma | Por cambio |
| Filtrado DNS | Bloquear dominios maliciosos conocidos | Equipo de seguridad | Continuo |
| VPN / Confianza cero | Acceso remoto basado en identidad | Equipo IAM | Por cambio |

#### 5. Manejo de Excepciones

| ID Excepcion | Descripcion | Riesgo | Aprobado Por | Vencimiento | Monitoreo |
|--------------|-------------|--------|--------------|-------------|-----------|
| EX-001 | Acceso dev a staging DB | Medio | Lider de seguridad | 2026-09-30 | Grabacion de sesion |
| EX-002 | Integracion de proveedor por VPN | Bajo | Oficial de cumplimiento | 2026-12-31 | Logs de trafico |

#### 6. Roles y Responsabilidades

| Rol | Responsabilidad |
|-----|-----------------|
| CISO | Posee la politica y acepta riesgos |
| Equipo de red | Implementa reglas de firewall y ruteo |
| Equipo de seguridad | Revisa excepciones y valida controles |
| Equipo de plataforma | Aplica microsegmentacion y politicas cloud |
| Equipo de cumplimiento | Mapea la politica a marcos y audita evidencia |

## Explicacion

La segmentacion limita el radio de explosion de una brecha al impedir que los atacantes se muevan lateralmente entre zonas. La politica convierte una arquitectura de red abstracta en reglas aplicables, justificaciones documentadas y duenos responsables. Combinar segmentacion gruesa con microsegmentacion provee defensa en profundidad.

## Variantes

- **Politica de segmentacion cloud-native**: Usa VPCs, security groups y controles de red basados en IAM en AWS, Azure o GCP.
- **Politica de red de contenedores**: Se enfoca en NetworkPolicy de Kubernetes, service meshes y aislamiento por namespaces.
- **Segmentacion multi-inquilino**: Define aislamiento entre clientes, unidades de negocio o ambientes en una plataforma compartida.
- **Segmentacion critica air-gap**: Documenta segmentos completamente aislados para sistemas de control industrial o alta sensibilidad.

## Lo que funciona

- Comienza con una postura de negacion por defecto y permite explicitamente el trafico requerido.
- Documenta la justificacion de negocio para cada flujo entre zonas.
- Evita reglas demasiado amplias que abarquen multiples zonas.
- Automatiza la validacion de reglas usando pruebas de alcance de red.
- Revisa las reglas de firewall trimestralmente y despues de cambios de arquitectura.
- Registra y monitorea el trafico denegado por indicadores de ataque.
- Mapea los requisitos de la politica a controles de cumplimiento.

## Errores Comunes

- Dejar produccion y desarrollo en el mismo segmento de red.
- Crear reglas de firewall sin documentar su proposito.
- Permitir rangos IP amplios en lugar de cargas de trabajo especificas.
- No revisar excepciones y dejarlas vencer.
- Ignorar el trafico este-oeste entre servicios de aplicacion.
- Depender solo de firewalls perimetrales sin segmentacion interna.

## FAQs

### Cual es la diferencia entre una VLAN y la microsegmentacion?

Una VLAN es un limite de capa 2, tipicamente grueso y basado en subnet. La microsegmentacion aplica politicas a cargas de trabajo o identidades individuales, a menudo usando redes definidas por software, independientemente de la subnet.

### La segmentacion reemplaza un firewall?

No. La segmentacion define la arquitectura; los firewalls, ACLs y politicas de red son los controles que la hacen cumplir. Trabajan juntos.

### Como probamos la segmentacion ante un auditor?

Provee diagramas de red, inventarios de reglas de firewall, matrices de trafico, logs de excepciones y evidencia de revisiones periodicas. Las pruebas automaticas de alcance agregan evidencia tecnica solida.

## Soluciones Avanzadas

### Pruebas automatizadas de alcance de red con AWS

Verifica que las reglas de segmentacion se cumplan realmente probando el alcance entre zonas:

```python
import boto3
from dataclasses import dataclass
from typing import List, Tuple

@dataclass
class ReachabilityTest:
    source_instance: str
    destination_ip: str
    destination_port: int
    expected_result: str  # "allow" or "deny"
    zone_pair: str  # e.g., "DMZ -> Application"

class NetworkReachabilityValidator:
    def __init__(self, region: str = "us-east-1"):
        self.ssm = boto3.client("ssm", region_name=region)
        self.ec2 = boto3.client("ec2", region_name=region)

    def run_test(self, test: ReachabilityTest) -> Tuple[bool, str]:
        """Run a single reachability test via SSM."""
        try:
            response = self.ssm.send_command(
                InstanceIds=[test.source_instance],
                DocumentName="AWS-RunShellScript",
                Parameters={
                    "commands": [
                        f"timeout 5 bash -c 'echo > /dev/tcp/{test.destination_ip}/{test.destination_port}' "
                        f"2>/dev/null && echo 'REACHABLE' || echo 'UNREACHABLE'"
                    ]
                },
            )
            command_id = response["Command"]["CommandId"]

            import time
            time.sleep(5)

            output = self.ssm.get_command_invocation(
                CommandId=command_id,
                InstanceId=test.source_instance,
            )

            actual = "allow" if "REACHABLE" in output.get("StandardOutputContent", "") else "deny"
            passed = actual == test.expected_result
            status = "PASS" if passed else "FAIL"
            message = f"{status}: {test.zone_pair} - Expected {test.expected_result}, got {actual}"
            return passed, message
        except Exception as e:
            return False, f"ERROR: {test.zone_pair} - {str(e)}"

    def validate_segmentation(self, tests: List[ReachabilityTest]) -> None:
        """Run all reachability tests and report results."""
        passed = 0
        failed = 0
        for test in tests:
            ok, msg = self.run_test(test)
            print(msg)
            if ok:
                passed += 1
            else:
                failed += 1
        print(f"\nResults: {passed} passed, {failed} failed out of {len(tests)} tests")

# Example usage
tests = [
    ReachabilityTest("i-dmz001", "10.0.2.10", 443, "allow", "DMZ -> Application"),
    ReachabilityTest("i-dmz001", "10.0.3.10", 5432, "deny", "DMZ -> Data"),
    ReachabilityTest("i-app001", "10.0.3.10", 5432, "allow", "Application -> Data"),
    ReachabilityTest("i-dev001", "10.0.3.10", 5432, "deny", "Development -> Data"),
]

validator = NetworkReachabilityValidator(region="us-east-1")
validator.validate_segmentation(tests)
```

### Microsegmentacion de Kubernetes con politicas de red Calico

Define controles detallados de trafico este-oeste entre workloads de Kubernetes:

```yaml
# calico-default-deny.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all-namespaces
  namespace: kube-system
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
# calico-allow-payment-flow.yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-payment-to-database
  namespace: payment
spec:
  selector: app == "payment-service"
  types:
    - Egress
  egress:
    - action: Allow
      destination:
        selector: app == "postgres"
        namespaceSelector: name == "database"
      protocol: TCP
      destinationPorts:
        - 5432
    - action: Deny
      destination:
        selector: all()
```

### Terraform para hacer cumplir la segmentacion como codigo

Define y aplica la segmentacion de red usando infraestructura como codigo:

```hcl
# modules/segmentation/main.tf

variable "environment" {
  type        = string
  description = "Environment name (prod, staging, dev)"
}

variable "allowed_ingress" {
  type = list(object({
    source_cidr = string
    port        = number
    description = string
  }))
  default = []
}

resource "aws_security_group" "segment" {
  name        = "${var.environment}-segment-sg"
  description = "Security group for ${var.environment} network segment"
  vpc_id      = var.vpc_id

  # Default deny all ingress
  ingress {
    description = "Default deny"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = []
  }

  # Explicit allow rules from variable
  dynamic "ingress" {
    for_each = var.allowed_ingress
    content {
      description = ingress.value.description
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = "tcp"
      cidr_blocks = [ingress.value.source_cidr]
    }
  }

  # Default deny all egress (override with specific rules)
  egress {
    description = "Default deny"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = []
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Policy      = "segmentation"
  }
}

# Example usage for production segment
module "prod_segment" {
  source = "./modules/segmentation"

  environment = "prod"
  vpc_id      = aws_vpc.main.id

  allowed_ingress = [
    { source_cidr = "10.0.1.0/24", port = 443, description = "DMZ to Application" },
    { source_cidr = "10.0.4.0/24", port = 22, description = "Management SSH" },
  ]
}
```

## Mejores Practicas Adicionales

1. **Implementa un service mesh para segmentacion a nivel de aplicacion.** Usa Istio o Linkerd para hacer cumplir politicas de trafico en la capa de aplicacion, complementando los controles a nivel de red:

```yaml
# Istio AuthorizationPolicy - restrict which services can call payment-service
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: payment-service-access
  namespace: payment
spec:
  selector:
    matchLabels:
      app: payment-service
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/checkout/sa/checkout-sa"]
      to:
        - operation:
            methods: ["POST"]
            paths: ["/api/v1/charge"]
```

2. **Usa analisis de flujo de red para validar la segmentacion.** Recopila y analiza patrones de trafico reales para identificar flujos no documentados que violen la politica:

```bash
#!/bin/bash
set -euo pipefail

# Export VPC flow logs and analyze cross-zone traffic
aws logs start-query \
  --log-group-name "/aws/vpc/flow-logs" \
  --start-time $(date -d '7 days ago' +%s) \
  --end-time $(date +%s) \
  --query-string '
    fields srcAddr, dstAddr, dstPort, action
    | filter action = "ACCEPT"
    | stats count() as connections by srcAddr, dstAddr, dstPort
    | sort connections desc
    | limit 100
  ' \
  --output text
```

## Errores Comunes Adicionales

1. **Olvidar segmentar el trafico de gestion y plano de control.** El trafico administrativo (SSH, RDP, API de Kubernetes) debe usar un segmento de gestion dedicado, no compartir rutas de red de aplicacion:

```hcl
# Terraform - separate management subnet
resource "aws_subnet" "management" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.4.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "management-subnet"
    Zone = "management"
  }
}

# Management security group - no internet access
resource "aws_security_group" "management" {
  name        = "management-sg"
  vpc_id      = aws_vpc.main.id
  description = "Management segment - VPN access only"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }
}
```

2. **No probar la segmentacion despues de cambios de infraestructura.** Un solo security group mal configurado puede abrir una ruta entre zonas. Ejecuta pruebas automatizadas de alcance como parte de tu pipeline CI/CD:

```yaml
# .github/workflows/segmentation-test.yml
name: Network Segmentation Validation
on:
  workflow_dispatch:
  schedule:
    - cron: "0 6 * * *"

jobs:
  test-segmentation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run reachability tests
        run: |
          python scripts/validate_segmentation.py \
            --config network-segmentation-tests.yaml \
            --fail-on-violation
```

## FAQs Adicionales

### Como manejamos la segmentacion para funciones serverless?

Usa la configuracion de VPC para funciones Lambda para colocarlas en subnets privadas. Restringe el egress a traves de NAT gateways con filtros de tablas de ruteo. Para API Gateway, usa politicas de recursos para restringir IPs de origen. Para Step Functions, usa endpoints privados para comunicacion servicio a servicio. Aplica el mismo principio de negacion por defecto a nivel de funcion.

### Que herramientas pueden automatizar la validacion de politicas de segmentacion?

Usa herramientas cloud-native como AWS Network Manager, Azure Network Watcher o GCP Network Intelligence Center. Para Kubernetes, usa el probador de politicas de Calico o las pruebas de conectividad de Cilium. Para multi-cloud, herramientas como Alcide, Tufin o GuardiCore proveen visibilidad y validacion de segmentacion multiplataforma.
