---
contentType: docs
slug: network-segmentation-policy-template
title: "Network Segmentation Policy Template"
description: "A template for documenting network security zones, segmentation rules, and traffic controls between environments and tenants."
metaDescription: "Document network security zones and segmentation rules with this policy template. Covers environments, trust levels, controls, and exceptions."
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
  metaDescription: "Document network security zones and segmentation rules with this policy template. Covers environments, trust levels, controls, and exceptions."
  keywords:
    - network segmentation
    - network security zones
    - security policy
    - firewall rules
    - zero trust network
---

## Overview

A Network Segmentation Policy defines how an organization's network is divided into isolated zones based on trust levels, data sensitivity, and functional requirements. This template documents the purpose of each zone, the allowed traffic between zones, and the controls that enforce isolation. It supports zero-trust architecture and compliance with standards like PCI-DSS, HIPAA, and SOC 2.

## When to Use

- Defining network architecture for a new cloud or data center environment.
- Preparing for a security audit or compliance certification.
- Onboarding a new tenant or business unit that needs isolation.
- After a lateral movement incident or segmentation gap is identified.
- Migrating from a flat network to a zero-trust model.

## Prerequisites

- An inventory of current subnets, VPCs, and virtual networks.
- A data classification scheme identifying sensitive vs. public data.
- A list of critical systems and their communication patterns.
- Ownership from network, security, and platform engineering teams.

## Solution

### Template

#### 1. Policy Statement

All production systems, sensitive data, and privileged access paths must reside in network segments separated from public, development, and guest networks. Traffic between segments is allowed only through approved paths, inspected by firewalls, and logged for monitoring.

#### 2. Network Zones

| Zone | Trust Level | Purpose | Examples |
|------|-------------|---------|----------|
| Public | Untrusted | Internet-facing entry points | Load balancers, CDN, WAF |
| DMZ | Low | Services that accept public traffic | Web servers, API gateways |
| Application | Medium | Internal business logic | App services, microservices |
| Data | High | Databases and persistent storage | PostgreSQL, S3, caches |
| Management | High | Administrative interfaces | Bastion, VPN, jump hosts |
| Development | Restricted | Engineering and test workloads | CI/CD runners, dev VMs |
| Guest | Untrusted | Visitor or contractor access | Guest Wi-Fi, contractor VPN |

#### 3. Allowed Traffic Matrix

| Source Zone | Destination Zone | Allowed | Protocol / Port | Justification | Control |
|-------------|------------------|---------|---------------|---------------|---------|
| Public | DMZ | Yes | HTTPS 443 | Public web traffic | WAF + firewall |
| DMZ | Application | Yes | HTTPS 443 | API requests | Application firewall |
| Application | Data | Yes | DB-specific | Application queries | Database firewall |
| Development | Production | No | Any | Segregation of duties | Default deny |
| Guest | Management | No | Any | Protect admin paths | Default deny |

#### 4. Segmentation Controls

| Control | Implementation | Owner | Frequency |
|---------|----------------|-------|-----------|
| Firewall rules | Cloud security groups / on-prem firewall | Network team | Quarterly review |
| Route tables | Subnet-level routing enforced | Platform team | Per change |
| Network ACLs | Additional stateless filtering | Security team | Quarterly review |
| Microsegmentation | Workload-level policies | Platform team | Per change |
| DNS filtering | Block known malicious domains | Security team | Continuous |
| VPN / Zero-trust | Identity-based access for remote users | IAM team | Per change |

#### 5. Exception Handling

| Exception ID | Description | Risk | Approved By | Expiration | Monitoring |
|--------------|-------------|------|-------------|------------|------------|
| EX-001 | Dev access to staging DB | Medium | Security lead | 2026-09-30 | Session recording |
| EX-002 | Vendor integration over VPN | Low | Compliance officer | 2026-12-31 | Traffic logs |

#### 6. Roles and Responsibilities

| Role | Responsibility |
|------|----------------|
| CISO | Owns policy and risk acceptance |
| Network team | Implements firewall and routing rules |
| Security team | Reviews exceptions and validates controls |
| Platform team | Applies microsegmentation and cloud policies |
| Compliance team | Maps policy to frameworks and audits evidence |

## Explanation

Segmentation limits the blast radius of a breach by preventing attackers from moving laterally between zones. The policy turns an abstract network architecture into enforceable rules, documented justifications, and accountable owners. Combining coarse segmentation with microsegmentation provides defense in depth.

## Variants

- **Cloud-native segmentation policy**: Uses VPCs, security groups, and IAM-based network controls in AWS, Azure, or GCP.
- **Container network policy**: Focuses on Kubernetes NetworkPolicy, service meshes, and namespace isolation.
- **Multi-tenant segmentation**: Defines isolation between customers, business units, or environments in a shared platform.
- **Critical-system air gap**: Documents fully isolated segments for industrial control or high-sensitivity systems.

## What Works

- Start with a default-deny posture and explicitly allow required traffic.
- Document business justification for every cross-zone flow.
- Avoid overly broad rules that span multiple zones.
- Automate rule validation using network reachability tests.
- Review firewall rules quarterly and after architecture changes.
- Log and monitor denied traffic for attack indicators.
- Map policy requirements to compliance controls.

## Common Mistakes

- Leaving production and development in the same network segment.
- Creating firewall rules without documenting their purpose.
- Allowing broad IP ranges instead of specific workloads.
- Not reviewing exceptions and letting them expire.
- Ignoring east-west traffic between application services.
- Relying only on perimeter firewalls without internal segmentation.

## FAQs

### What is the difference between a VLAN and microsegmentation?

A VLAN is a layer-2 boundary, typically coarse and subnet-based. Microsegmentation applies policies to individual workloads or identities, often using software-defined networking, regardless of subnet.

### Does segmentation replace a firewall?

No. Segmentation defines the architecture; firewalls, ACLs, and network policies are the controls that enforce it. They work together.

### How do we prove segmentation to an auditor?

Provide network diagrams, firewall rule inventories, traffic matrices, exception logs, and evidence of periodic reviews. Automated reachability tests add strong technical evidence.

## Advanced Solutions

### Automated network reachability testing with AWS

Verify that segmentation rules are actually enforced by testing reachability between zones:

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

### Kubernetes microsegmentation with Calico network policies

Define fine-grained east-west traffic controls between Kubernetes workloads:

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

### Terraform for enforcing segmentation as code

Define and enforce network segmentation using infrastructure-as-code:

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

## Additional Best Practices

1. **Implement service mesh for application-layer segmentation.** Use Istio or Linkerd to enforce traffic policies at the application layer, complementing network-level controls:

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

2. **Use network flow analysis to validate segmentation.** Collect and analyze actual traffic patterns to identify undocumented flows that violate the policy:

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

## Additional Common Mistakes

1. **Forgetting to segment management and control plane traffic.** Admin traffic (SSH, RDP, Kubernetes API) should use a dedicated management segment, not share application network paths:

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

2. **Not testing segmentation after infrastructure changes.** A single misconfigured security group can open a path between zones. Run automated reachability tests as part of your CI/CD pipeline:

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

## Additional FAQs

### How do we handle segmentation for serverless functions?

Use VPC configuration for Lambda functions to place them in private subnets. Restrict egress through NAT gateways with route table filters. For API Gateway, use resource policies to restrict source IPs. For Step Functions, use private endpoints for service-to-service communication. Apply the same default-deny principle at the function level.

### What tools can automate segmentation policy validation?

Use cloud-native tools like AWS Network Manager, Azure Network Watcher, or GCP Network Intelligence Center. For Kubernetes, use Calico's policy tester or Cilium's connectivity tests. For multi-cloud, tools like Alcide, Tufin, or GuardiCore provide cross-platform segmentation visibility and validation.
