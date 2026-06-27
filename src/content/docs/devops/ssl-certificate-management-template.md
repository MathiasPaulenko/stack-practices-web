---
contentType: docs
slug: ssl-certificate-management-template
title: "SSL Certificate Management Template"
description: "A template for tracking TLS/SSL certificate inventory, renewals, deployments, and expiration risks across domains and services."
metaDescription: "Manage SSL/TLS certificates with this template. Covers inventory tracking, renewal workflows, deployment steps, expiry monitoring, and incident response."
difficulty: beginner
topics:
  - security
  - infrastructure
tags:
  - ssl
  - tls
  - certificates
  - security
  - automation
relatedResources:
  - /docs/devops/monitoring-alerting-policy-template
  - /docs/devops/cloud-resource-tagging-policy-template
  - /docs/runbook-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Manage SSL/TLS certificates with this template. Covers inventory tracking, renewal workflows, deployment steps, expiry monitoring, and incident response."
  keywords:
    - SSL certificate management
    - TLS certificate renewal
    - certificate inventory
    - certificate expiry monitoring
    - certificate deployment
---

## Overview

SSL/TLS certificates protect data in transit by encrypting traffic between clients and servers. Expired, misconfigured, or forgotten certificates can cause outages, security warnings, and loss of customer trust. This template provides a process for tracking certificate inventory, planning renewals, deploying certificates, and responding to certificate-related incidents.

## When to Use

- Setting up a new domain or public-facing service.
- Migrating from one certificate provider to another.
- Preparing for an audit of security or infrastructure hygiene.
- After a certificate expiry caused an outage or warning.
- Automating certificate lifecycle management with a tool like Let's Encrypt, Certbot, or a managed certificate service.

## Prerequisites

- A list of domains, subdomains, and services that use TLS certificates.
- A certificate authority (CA) or managed certificate provider such as Let's Encrypt, DigiCert, or AWS ACM.
- A deployment process for updating certificates on load balancers, web servers, CDNs, and containers.
- A monitoring system to alert on certificate expiration.
- Ownership from security, platform, and application teams.

## Solution

### Template

#### 1. Certificate Inventory

| Domain / Service | Certificate Type | Provider | Expiry Date | Auto-Renewal | Owner | Notes |
|------------------|------------------|----------|-------------|--------------|-------|-------|
| `example.com` | Wildcard | Let's Encrypt | 2026-09-15 | Yes | Platform team | Used on CDN |
| `api.example.com` | Standard | DigiCert | 2026-12-01 | No | API team | Manual renewal |
| `app.example.com` | Managed | AWS ACM | Auto | Yes | Platform team | ELB attached |
| `internal.example.com` | Self-signed | Internal CA | 2027-01-10 | No | IT team | Internal tools |
| `cdn.example.com` | Standard | Cloudflare | Auto | Yes | Platform team | Edge certificate |

#### 2. Certificate Lifecycle Stages

| Stage | Activities | Owner | Timing |
|-------|------------|-------|--------|
| Request | Identify domain, validate ownership, choose CA | Application or platform team | At provisioning |
| Approval | Security review, budget approval, CA selection | Security / finance | Before purchase |
| Issuance | Generate CSR, submit request, download certificate | Platform team | Same day |
| Deployment | Install certificate on all endpoints and test | Platform team | Same day |
| Renewal | Request new certificate before expiry | Platform team | 30 days before expiry |
| Revocation | Revoke compromised certificate and replace | Security team | Immediate |
| Retirement | Remove old certificate from inventory and systems | Platform team | After replacement |

#### 3. Renewal Workflow

| Step | Action | Owner | Timing |
|------|--------|-------|--------|
| 1 | Check inventory for certificates expiring within 30, 14, and 7 days | Platform team | Daily |
| 2 | Generate or renew certificate with CA | Platform team | 30 days before expiry |
| 3 | Validate certificate chain and test in staging | Platform team | Before deployment |
| 4 | Deploy certificate to production endpoints | Platform team | During maintenance window |
| 5 | Verify production endpoint using SSL checkers | Platform team | After deployment |
| 6 | Update inventory and renewal log | Platform team | Same day |
| 7 | Close renewal ticket | Platform team | Same day |

#### 4. Expiry Alert Schedule

| Days to Expiry | Alert Channel | Action |
|----------------|---------------|--------|
| 60 days | Email to owner | Plan renewal |
| 30 days | Slack or email to team | Start renewal process |
| 14 days | Page on-call if not renewed | Escalate renewal |
| 7 days | Page manager and security lead | Emergency renewal or workaround |
| 1 day | Page executive + incident response | Treat as incident |

#### 5. Deployment Checklist

- [ ] Certificate and private key are stored securely in a vault or certificate manager.
- [ ] Full certificate chain is included during deployment.
- [ ] Certificate is deployed on all endpoints: load balancers, web servers, CDNs, and proxies.
- [ ] Certificate is tested with tools such as SSL Labs, OpenSSL, or `curl`.
- [ ] Old certificate is removed from configuration after deployment.
- [ ] Inventory is updated with new expiry date, serial number, and deployment date.
- [ ] Monitoring alerts are confirmed to reflect the new certificate.

#### 6. Incident Response for Certificate Issues

| Scenario | Response | Owner |
|----------|----------|-------|
| Certificate expired in production | Emergency renew or rollback to previous valid certificate | Platform team + on-call |
| Certificate misconfigured | Re-deploy correct chain and test all endpoints | Platform team |
| Certificate compromised | Revoke, replace, and investigate exposure | Security team |
| Domain validation failure | Re-verify DNS or HTTP validation and retry | Platform team |
| Auto-renewal failure | Switch to manual renewal and fix automation root cause | Platform team |

## Explanation

Certificate management is a repetitive operational task that becomes risky at scale. The template centralizes inventory, renewal dates, and deployment procedures so that certificates do not expire unexpectedly. It also links certificate health to monitoring and incident response, making certificate issues easier to detect and resolve quickly.

## Variants

- **Let's Encrypt automation**: Uses Certbot, acme.sh, or ACME clients with automated renewal and deployment.
- **Managed certificate service**: Uses AWS ACM, Azure Key Vault, or Cloudflare SSL for fully managed certificates.
- **Enterprise CA workflow**: Uses internal certificate authorities with approval workflows and domain validation.
- **Multi-cloud certificate management**: Centralizes certificates across providers using a vault or certificate manager.
- **Container-native certificate management**: Uses cert-manager or similar tools in Kubernetes.

## Best Practices

- Maintain a single source of truth for all certificates and their owners.
- Automate renewal and deployment where possible.
- Monitor certificate expiry with alerts at 60, 30, 14, 7, and 1 day before expiration.
- Use short-lived certificates with automated renewal to reduce exposure.
- Store private keys and certificates in a secure vault.
- Test certificate deployments in staging before production.
- Document exceptions for certificates that cannot be auto-renewed.
- Include certificate checks in change management and audit reviews.

## Common Mistakes

- Relying on manual tracking in spreadsheets without monitoring.
- Forgetting to deploy the intermediate certificate chain.
- Missing certificates on secondary endpoints such as CDNs or load balancers.
- Not updating monitoring after certificate renewal.
- Leaving expired certificates in configuration files.
- Using self-signed certificates for public-facing services.
- Not revoking certificates after a compromise.

## FAQs

### What is the difference between SSL and TLS?

SSL is the older protocol. TLS is the modern, secure successor. The term "SSL certificate" is still commonly used, but certificates today support TLS 1.2 or TLS 1.3.

### Should we use wildcards or separate certificates for each subdomain?

Wildcards are convenient for many subdomains but share a single private key. Separate certificates reduce blast radius and support different renewal cycles. Choose based on security needs and operational complexity.

### How do we prevent certificate expiry outages?

Use automated renewal with monitoring alerts, maintain an accurate inventory, and test deployments. Treat certificates expiring within 7 days as incidents.
