---
contentType: docs
slug: network-security-template
title: "Network Security Template"
description: "A template for documenting VPC, firewall, and DNS security rules inventory."
metaDescription: "Use this network security template to inventory VPC rules, firewall configurations, DNS settings, and network access controls."
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
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this network security template to inventory VPC rules, firewall configurations, DNS settings, and network access controls."
  keywords:
    - devops
    - network-security
    - vpc
    - firewall
    - dns
    - template
---
## Overview

Your network is the perimeter. Misconfigured firewall rules, overly permissive security groups, and stale DNS records are common entry points for attackers. This template inventories your network security controls so you can audit them, track changes, and prove compliance during a security review.

## When to Use

Use this resource when:
- Onboarding a new service that requires network access rules
- Conducting a quarterly security audit or penetration test preparation
- Migrating infrastructure to a new VPC or cloud provider

## Solution

```markdown
# Network Security Inventory: `<Environment>`

## 1. Scope

| Field | Value |
|-------|-------|
| Environment | `prod / staging / dev` |
| Cloud Provider | `AWS / GCP / Azure / On-prem` |
| Network CIDR | `10.0.0.0/16` |
| Last Reviewed | `YYYY-MM-DD` |
| Reviewer | `@security-team` |

## 2. VPC / Network Segmentation

| Segment | CIDR | Purpose | Internet Access | Peering |
|---------|------|---------|-----------------|---------|
| Public subnet | `10.0.1.0/24` | Load balancers, bastion | Yes (egress only) | None |
| Application subnet | `10.0.2.0/24` | Microservices | No | Peered to shared services |
| Database subnet | `10.0.3.0/24` | PostgreSQL, Redis | No | Peered to shared services |
| Management subnet | `10.0.4.0/24` | CI/CD runners, monitoring | Yes (NAT) | None |
| Shared services | `10.1.0.0/24` | SSO, logging, secrets | No | Peered to all VPCs |

## 3. Firewall / Security Group Rules

### 3.1. Inbound Rules

| Source | Protocol | Port | Destination | Justification | Last Reviewed |
|--------|----------|------|-------------|---------------|---------------|
| `0.0.0.0/0` | TCP | 443 | Public ALB | Public HTTPS | `YYYY-MM-DD` |
| `10.0.2.0/24` | TCP | 5432 | Database subnet | Application → DB | `YYYY-MM-DD` |
| `10.0.4.0/24` | TCP | 22 | Bastion host | Admin access | `YYYY-MM-DD` |
| `VPN CIDR` | TCP | 3389 | Windows jump host | Admin access | `YYYY-MM-DD` |

### 3.2. Outbound Rules

| Destination | Protocol | Port | Source | Justification | Last Reviewed |
|-------------|----------|------|--------|---------------|---------------|
| `0.0.0.0/0` | TCP | 443 | All subnets | Software updates, APIs | `YYYY-MM-DD` |
| `0.0.0.0/0` | TCP | 53 | All subnets | DNS resolution | `YYYY-MM-DD` |
| `0.0.0.0/0` | UDP | 53 | All subnets | DNS resolution | `YYYY-MM-DD` |
| `SaaS IP range` | TCP | 443 | Application subnet | Third-party API | `YYYY-MM-DD` |

## 4. DNS Configuration

| Record | Type | Value | TTL | Purpose | Secured |
|--------|------|-------|-----|---------|---------|
| `api.example.com` | A | ALB IP | 60s | Public API | DNSSEC enabled |
| `internal.example.com` | A | Private IP | 300s | Internal services | Private zone only |
| `cdn.example.com` | CNAME | `cdn.provider.com` | 300s | Asset delivery | HTTPS enforced |

## 5. Network Access Controls

| Control | Implementation | Scope | Status |
|---------|----------------|-------|--------|
| DDoS protection | AWS Shield / Cloud Armor / Azure DDoS | Public endpoints | Active |
| WAF | AWS WAF / Cloudflare / ModSecurity | Public endpoints | Active |
| Intrusion detection | Suricata / GuardDuty / Azure Sentinel | VPC flow logs | Active |
| VPN / Zero Trust | WireGuard / Zscaler / BeyondCorp | All admin access | Active |
| Private endpoints | VPC endpoints / PrivateLink / Private Link | AWS / Azure services | Active |

## 6. Change Log

| Date | Change | Requester | Approved By | Ticket |
|------|--------|-----------|-------------|--------|
| `YYYY-MM-DD` | Opened port 5432 for new analytics service | `data-team` | `security-team` | `SEC-123` |
| `YYYY-MM-DD` | Removed SSH from public subnet | `sre-team` | `security-team` | `SEC-124` |
```

## Explanation

The template treats your network as a **defense-in-depth system**. Segmentation ensures that if one subnet is compromised, the attacker cannot move laterally to the database. Every rule requires a **justification** and a **last reviewed** date, so stale rules do not persist indefinitely. DNS records are often overlooked in security reviews, but hijacked or stale DNS can redirect traffic to attacker-controlled infrastructure.

## Variants

| Environment | Approach | Notes |
|-------------|----------|-------|
| AWS | VPC + Security Groups + NACLs | Use NACLs for subnet-level rules, SGs for instance-level |
| GCP | VPC Firewall Rules + Cloud Armor | Firewall rules are stateful; use service accounts for identity |
| Azure | NSGs + Azure Firewall | NSGs apply to subnets or NICs; Azure Firewall for central logging |
| Kubernetes | Network Policies + Cilium / Calico | Enforce namespace isolation; default-deny is safest |
| Hybrid / On-prem | Physical firewall + SD-WAN | Document both logical and physical paths |

## What Works

1. Default-deny all traffic; whitelist only what is required with documented justification
2. Review firewall rules quarterly; remove rules that no longer have a valid justification
3. Do not use `0.0.0.0/0` for inbound except to a load balancer that terminates TLS
4. Enable VPC flow logs and retain them for at least 90 days for forensic analysis
5. Use private endpoints for cloud services instead of routing traffic over the public internet

## Common Mistakes

1. Allowing SSH or RDP from `0.0.0.0/0` instead of a bastion or VPN-only
2. Reusing the same security group across production and staging, blurring boundaries
3. Forgetting to remove temporary rules added during an incident or debugging session
4. Not monitoring VPC flow logs, missing lateral movement during a breach
5. Hardcoding IP addresses in DNS instead of using CNAMEs to load balancers

## Frequently Asked Questions

### How do I audit existing security groups quickly?

Use `aws ec2 describe-security-groups` (or equivalent) and export to CSV. Sort by ingress rules with `0.0.0.0/0`. Cross-reference each rule with change tickets. If a rule has no justification or has not been reviewed in over a year, mark it for removal and notify the owner team.

### Should I use Network ACLs or Security Groups?

Both. **Security groups** are stateful and apply to instances; they are your primary control. **NACLs** are stateless and apply to subnets; use them as a coarse-grained backup defense. For example, a NACL can block a port entirely at the subnet level even if a security group mistakenly allows it.

### How do I secure DNS records?

Enable DNSSEC for public zones to prevent cache poisoning. Use short TTLs (60–300s) for records that may need rapid changes. Monitor for unauthorized record changes with DNS provider audit logs. For internal DNS, restrict zone transfers to authorized servers and use private zones only accessible within the VPC.

## Advanced Solutions

### Automated security group audit with AWS CLI

Export and analyze all security group rules to find overly permissive configurations:

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

### VPC flow log analysis for lateral movement detection

Parse VPC flow logs to detect suspicious traffic patterns:

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

### Kubernetes network policy enforcement with Cilium

Define and verify default-deny network policies across all namespaces:

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

## Additional Best Practices

1. **Implement egress filtering to prevent data exfiltration.** Restrict outbound traffic to known destinations instead of allowing `0.0.0.0/0` egress:

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

2. **Tag security groups with ownership and purpose metadata.** Tags make it easier to identify which team owns a rule and why it exists:

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

## Additional Common Mistakes

1. **Not auditing cross-VPC peering connections.** VPC peering rules can bypass security group controls if not carefully managed. Audit peering connections regularly:

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

2. **Ignoring cloud provider managed prefix lists.** AWS prefix lists can reference dynamic IP sets. Not tracking changes to these lists can open unexpected access:

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

## Additional Frequently Asked Questions

### How do we handle network security for serverless or containerized workloads?

For serverless (Lambda, Cloud Run), use VPC configuration with private subnets and NAT gateways. For containers, use Kubernetes Network Policies or cloud-native equivalents like AWS Security Groups for Pods. Apply the same default-deny principle: start with no access, then add only what the workload needs.

### What is the difference between stateful and stateless firewall rules?

Stateful firewalls (like AWS Security Groups) automatically allow return traffic for established connections. Stateless firewalls (like AWS NACLs) require explicit rules for both directions. Stateful rules are easier to manage but stateless rules provide an additional layer of defense at the subnet boundary.
