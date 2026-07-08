---
contentType: docs
slug: ssl-certificate-renewal-template
title: "SSL Certificate Renewal Template"
description: "A template for tracking SSL certificate expiration and renewal workflows."
metaDescription: "Use this SSL certificate renewal template to track certificate expiration dates, renewal workflows, and validation checks before they expire."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - ssl
  - certificate
  - tls
  - security
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
  metaDescription: "Use this SSL certificate renewal template to track certificate expiration dates, renewal workflows, and validation checks before they expire."
  keywords:
    - devops
    - ssl
    - certificate
    - tls
    - security
    - template
---
## Overview

SSL/TLS certificates expire. When they do, browsers block your site, APIs fail, and users see scary security warnings. Most teams discover an expired certificate when a customer complains. This template creates a repeatable renewal workflow with tracking, validation checks, and rollback steps so you never miss an expiration again.

## When to Use

Use this resource when:
- You manage multiple domains, subdomains, or wildcard certificates across environments
- Your team has missed a certificate expiration in the past
- You are migrating from manual renewal to automated certificate management

## Solution

```markdown
# SSL Certificate Renewal Tracker: `<Domain>`

## 1. Certificate Inventory

| Domain / Subdomain | Provider | Type | Expiration | Auto-Renew | Owner | Last Verified |
|--------------------|----------|------|------------|------------|-------|---------------|
| `example.com` | Let's Encrypt | DV | `YYYY-MM-DD` | Yes | `@sre-team` | `YYYY-MM-DD` |
| `*.api.example.com` | DigiCert | Wildcard OV | `YYYY-MM-DD` | No | `@platform-team` | `YYYY-MM-DD` |
| `internal.example.com` | Internal CA | Enterprise | `YYYY-MM-DD` | N/A | `@it-team` | `YYYY-MM-DD` |

## 2. Renewal Timeline

| Phase | Trigger | Action | Owner | Deadline |
|-------|---------|--------|-------|----------|
| Alert | 30 days before expiry | Create renewal ticket | `@sre-team` | — |
| Prep | 14 days before expiry | Verify DNS control + generate CSR | `@sre-team` | — |
| Request | 10 days before expiry | Submit certificate request | `@sre-team` | — |
| Install | 7 days before expiry | Deploy to load balancers / CDN | `@sre-team` | — |
| Validate | 5 days before expiry | Run validation checks (see below) | `@sre-team` | — |
| Monitor | 48 hours after install | Watch for mixed-content or handshake errors | `@on-call` | — |

## 3. Validation Checklist

- [ ] Certificate chain is complete (leaf + intermediates + root)
- [ ] Domain name matches exactly (no SAN omissions)
- [ ] Expiration date is beyond the expected renewal window
- [ ] TLS 1.2+ handshake succeeds from external probe
- [ ] OCSP responder is reachable and returns valid status
- [ ] No mixed-content warnings on primary pages
- [ ] Mobile apps and third-party integrations accept the new certificate
- [ ] Old certificate revoked (if applicable) after validation

## 4. Rollback Plan

| Condition | Action | Time to Complete |
|-----------|--------|-----------------|
| New cert causes handshake failures | Re-deploy previous certificate from backup | 5 minutes |
| Chain incomplete | Re-bundle with correct intermediate CA | 10 minutes |
| SAN missing | Re-issue with corrected CSR | 2–24 hours (provider dependent) |

## 5. Automation Notes

| Tool | Renewal Method | Validation | Deployment Target |
|------|---------------|------------|-------------------|
| certbot | ACME challenge | HTTP-01 / DNS-01 | Local web server |
| cert-manager (Kubernetes) | ACME / Vault | DNS-01 / HTTP-01 | Kubernetes secret → Ingress |
| AWS ACM | Managed | DNS validation | ALB / CloudFront |
| Azure Key Vault | Managed / imported | DNS / email | Application Gateway / CDN |
```

## Explanation

The template separates **inventory** (what certificates you have) from **workflow** (how you renew them). The inventory prevents certificates from being forgotten on edge services (CDNs, internal APIs, mobile gateways). The workflow enforces a buffer: if anything goes wrong during renewal, you have days to fix it before expiry. The validation checklist catches the most common post-deployment issues—missing intermediate certificates and incomplete SANs—before users do.

## Variants

| Environment | Certificate Source | Renewal Strategy | Notes |
|-------------|-------------------|------------------|-------|
| Public web | Let's Encrypt (ACME) | Automated 60-day cycle with certbot or cert-manager | Free, short-lived (90 days) |
| Enterprise SaaS | DigiCert / Sectigo | Annual purchase with manual approval for OV/EV | Longer validity, higher trust |
| Internal services | Internal PKI / Vault | Auto-renewal via Vault PKI engine | Full control, requires trust distribution |
| IoT / embedded | Device-attested certs | Factory provisioning + OTA updates | Limited validation options |

## What Works

1. Set calendar alerts at 30, 14, and 7 days before expiration—even for "auto-renewing" certificates
2. Store certificate backups (private key + chain) in a secrets manager, not on a single engineer's laptop
3. Test the renewal process on staging before production; ACME challenges can fail due to DNS or firewall changes
4. Use wildcard certificates sparingly; they reduce management overhead but increase blast radius if compromised
5. Document the exact command or pipeline used for renewal so anyone on-call can execute it

## Common Mistakes

1. Relying on auto-renewal without monitoring whether it actually succeeded
2. Forgetting to update certificate on CDN or WAF after renewing on the origin server
3. Missing intermediate certificates in the bundle, causing "untrusted" errors on some clients
4. Not including all required SANs in the CSR (e.g., `www.` and apex domain)
5. Letting the old certificate expire before validating the new one on all endpoints

## Frequently Asked Questions

### How do I handle wildcard certificates?

Wildcard certificates (`*.example.com`) cover all subdomains but cannot cover the apex domain (`example.com`) unless explicitly included as a SAN. For ACME wildcard renewal, you must use DNS-01 validation, which requires API access to your DNS provider. Keep wildcard scope narrow—do not use a single wildcard across production and staging.

### What is the difference between DV, OV, and EV certificates?

**DV (Domain Validated)** proves you control the domain. **OV (Organization Validated)** adds verified company identity. **EV (Extended Validation)** shows the company name in the browser bar and requires the most rigorous vetting. For most APIs and internal services, DV is sufficient. Customer-facing SaaS may benefit from OV for brand trust.

### Should I use a CDN-managed certificate or bring my own?

CDN-managed certificates (AWS ACM, Cloudflare Origin CA) simplify deployment and auto-renewal but lock you to that provider. Bring-your-own certificates offer portability but require you to handle renewal and deployment. For multi-cloud architectures, use a central secrets manager (HashiCorp Vault, AWS Secrets Manager) and push certificates to each edge during deployment.

## Advanced Solutions

### cert-manager for Kubernetes with Let's Encrypt

Automate certificate issuance and renewal in Kubernetes using cert-manager with DNS-01 challenge:

```yaml
# Install cert-manager CRDs and configure ClusterIssuer
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: platform-team@company.com
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
      - dns01:
          cloudflare:
            email: platform-team@company.com
            apiKeySecretRef:
              name: cloudflare-api-key
              key: api-key
---
# Issue a certificate for the ingress
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-tls
  namespace: production
spec:
  secretName: api-tls-secret
  duration: 2160h    # 90 days
  renewBefore: 360h  # Renew 15 days before expiry
  dnsNames:
    - api.example.com
    - "*.api.example.com"
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
---
# Reference in Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls-secret
```

### HashiCorp Vault PKI engine for internal certificates

Set up a private CA using Vault PKI secrets engine for internal services:

```bash
# Enable PKI engine
vault secrets enable -path=pki pki

# Configure max lease duration
vault secrets tune -max-lease-ttl=87600h pki

# Generate root CA
vault write pki/root/generate/internal \
    common_name="Internal CA" \
    ttl=87600h

# Configure URLs for CRL and issuing
vault write pki/config/urls \
    issuing_certificates="https://vault.internal:8200/v1/pki/ca" \
    crl_distribution_points="https://vault.internal:8200/v1/pki/crl"

# Create a role for issuing certificates
vault write pki/roles/internal-service \
    allowed_domains="internal.company.com" \
    allow_subdomains=true \
    max_ttl="720h" \
    key_type="rsa" \
    key_bits=2048

# Issue a certificate
vault write pki/issue/internal-service \
    common_name="api.internal.company.com" \
    ttl="24h"
```

### Certificate expiration monitoring script

A bash script to check all certificates in a Kubernetes cluster and alert on upcoming expirations:

```bash
#!/bin/bash
set -euo pipefail

DAYS_THRESHOLD=30
ALERT_EMAIL="platform-team@company.com"

echo "Checking TLS certificates across all namespaces..."

kubectl get secrets --all-namespaces -o json | \
  jq -r '.items[] | select(.type=="kubernetes.io/tls") | "\(.metadata.namespace) \(.metadata.name) \(.data."tls.crt")"' | \
  while read -r namespace secret_name cert_b64; do
    cert_pem=$(echo "$cert_b64" | base64 -d)
    expiry_date=$(echo "$cert_pem" | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    if [ -z "$expiry_date" ]; then
      continue
    fi

    expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry_date" +%s 2>/dev/null)
    now_epoch=$(date +%s)
    days_left=$(( (expiry_epoch - now_epoch) / 86400 ))

    if [ "$days_left" -lt "$DAYS_THRESHOLD" ]; then
      echo "WARNING: $namespace/$secret_name expires in $days_left days ($expiry_date)"
    fi
  done
```

## Additional Best Practices

1. **Use certificate transparency monitoring.** Subscribe to CT logs for your domains to detect unauthorized certificate issuance. Set up alerts when a new certificate is issued for a domain you own:

```bash
# Check CT logs for your domain using curl
curl -s "https://crt.sh/?q=%25.example.com&output=json" | \
  jq '.[] | select(.not_before > "2026-01-01") | {issuer_name, common_name, not_before}'
```

2. **Implement HSTS preload for production domains.** Once you have reliable certificate automation, enable HTTP Strict Transport Security to prevent downgrade attacks:

```nginx
# nginx configuration
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

## Additional Common Mistakes

1. **Using TLS 1.0 or 1.1 after certificate renewal.** Renewing a certificate does not update your TLS configuration. Explicitly disable old protocols during renewal to avoid compliance failures:

```nginx
# Disable TLS 1.0 and 1.1
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers on;
```

2. **Not updating OCSP stapling configuration.** After renewal, OCSP stapling may serve stale data from the old certificate. Restart the web server or clear the OCSP cache:

```bash
# Restart nginx to refresh OCSP stapling
nginx -t && systemctl restart nginx
```

## Additional Frequently Asked Questions

### How do I automate certificate renewal for multiple domains?

Use cert-manager in Kubernetes or a central ACME client (certbot, acme.sh) with a cron job. For non-Kubernetes environments, certbot with DNS-01 challenge and a DNS provider plugin handles wildcard and multi-domain certificates automatically:

```bash
# certbot wildcard renewal with Cloudflare DNS
certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d "*.example.com" \
  -d "example.com" \
  --non-interactive \
  --agree-tos \
  --email platform-team@company.com
```

### What is OCSP stapling and why does it matter?

OCSP stapling allows the server to include a signed OCSP response from the CA in the TLS handshake, so the client does not need to contact the CA's OCSP responder separately. This improves performance and privacy. Enable it in your web server configuration and ensure the OCSP responder is reachable during renewal.
