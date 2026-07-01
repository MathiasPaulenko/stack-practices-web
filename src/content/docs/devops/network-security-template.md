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
