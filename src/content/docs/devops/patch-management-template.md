---
contentType: docs
slug: patch-management-template
title: "Patch Management Template"
description: "A template for scheduling, testing, and deploying security patches across environments."
metaDescription: "Use this patch management template to schedule security patches, track testing across environments, and deploy updates with minimal downtime."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - patch
  - management
  - security
  - operations
  - template
relatedResources:
  - /docs/bug-triage-template
  - /docs/change-management-template
  - /docs/escalation-policy-template
  - /docs/ssl-certificate-renewal-template
  - /docs/runbook-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Use this patch management template to schedule security patches, track testing across environments, and deploy updates with minimal downtime."
  keywords:
    - devops
    - patch
    - management
    - security
    - operations
    - template
---
## Overview

Unpatched systems are the easiest targets. The Equifax breach, WannaCry, and countless other incidents were caused by known vulnerabilities that had patches available for months. Most teams patch reactively after a breach. This template creates a proactive patch management workflow: identify, test, schedule, deploy, and verify—before attackers exploit the gap.

## When to Use

Use this resource when:
- Your security audit flagged unpatched systems or outdated dependencies
- You are building a vulnerability management program from scratch
- Production patches have caused outages in the past due to inadequate testing

## Solution

```markdown
# Patch Management Plan: `<System / Service>`

## 1. Patch Inventory

| CVE / Advisory | Severity | CVSS | Affected Systems | Patch Available | Current Version | Target Version | Owner |
|----------------|----------|------|------------------|-----------------|-----------------|----------------|-------|
| CVE-YYYY-NNNNN | Critical | 9.8 | `list` | `YYYY-MM-DD` | `X.Y.Z` | `A.B.C` | `@sre-team` |
| GHSA-YYYY-NNNNN | High | 7.5 | `list` | `YYYY-MM-DD` | `X.Y.Z` | `A.B.C` | `@platform-team` |

## 2. Patch Classification

| Severity | Criteria | Test Requirement | Deployment Window | SLA |
|----------|----------|------------------|-------------------|-----|
| Critical | RCE, privilege escalation, data exfiltration; actively exploited | Minimal: smoke test in staging | Emergency: within 24 hours | 24 hours |
| High | Remote attack vector; no known exploit yet | Standard: full regression in staging | Next maintenance window | 7 days |
| Medium | Local access required; complex exploit chain | Standard: full regression in staging | Next maintenance window | 30 days |
| Low | Denial of service only; no data impact | Deferred: test with next release | Next release cycle | 90 days |

## 3. Testing Checklist

- [ ] Patch applies cleanly without manual intervention
- [ ] Application starts successfully after patch
- [ ] Core user journeys pass (smoke test)
- [ ] Integration tests pass against patched environment
- [ ] Performance benchmarks within 5% of baseline
- [ ] No new errors in logs during 30-minute soak test
- [ ] Rollback image / snapshot available before production deploy

## 4. Deployment Schedule

| Environment | Window | Pre-approval Required | Rollback Ready |
|-------------|--------|----------------------|----------------|
| Staging | Anytime | Team lead sign-off | Previous image tagged |
| Canary (5% traffic) | Low-traffic hours | Manager notification | Instant rollback via LB |
| Production — Batch A (non-critical) | Tuesday 10:00 UTC | CAB for Critical patches | Snapshot + runbook tested |
| Production — Batch B (critical) | Immediate after staging pass | Security + manager | Snapshot + runbook tested |

## 5. Verification

| Check | Method | Owner | Timeline |
|-------|--------|-------|----------|
| Vulnerability scan post-patch | Nessus / Trivy / Snyk | `@security-team` | Within 24 hours of deploy |
| System health metrics | Grafana / Datadog dashboard | `@sre-team` | 1 hour post-deploy |
| Error rate baseline comparison | APM tool | `@sre-team` | 4 hours post-deploy |
| User-facing functional test | Synthetic monitoring | `@qa-team` | 4 hours post-deploy |
| Dependency audit | `npm audit`, `pip-audit`, OS package manager | `@platform-team` | Weekly |

## 6. Exception Log

| CVE | Reason for Delay | Risk Accepted By | Expiry Date | Compensating Control |
|-----|------------------|------------------|-------------|----------------------|
| | | | | |
```

## Explanation

The template separates **patch inventory** (what needs fixing) from **patch workflow** (how you fix it safely). The classification table prevents every patch from being treated as an emergency—most teams burn out if they emergency-patch weekly. The testing checklist catches the most common patch failure: a library update that breaks a subtle integration. The exception log is critical for compliance; auditors will ask why a CVE was not patched, and "we forgot" is not an acceptable answer.

## Variants

| Context | Patch Source | Testing Approach | Notes |
|---------|-------------|------------------|-------|
| OS (Linux / Windows) | Package manager (apt, yum, WSUS) | Reboot test in staging; verify services start | Kernel patches often require reboot |
| Container base images | Docker image rebuild | Integration test with new base image | Use distroless or minimal images to reduce surface |
| Application dependencies | npm, pip, Maven, Cargo | Unit + integration test suite | Pin versions; use lock files; automate with Dependabot |
| Cloud-managed (RDS, EKS) | Provider-managed | Verify application compatibility after platform update | AWS / GCP notify in advance; schedule maintenance windows |
| Third-party SaaS | Vendor-managed | Monitor vendor status page; verify your integration | You cannot patch SaaS; verify their SOC 2 includes patch SLAs |

## What Works

1. Automate dependency scanning in CI; catch new CVEs before they reach production
2. Maintain a staging environment that mirrors production for patch testing
3. Tag rollback images before any production deployment
4. Document the exact patch command or pipeline; do not rely on one person's memory
5. Review exception log monthly; delayed patches should not become permanent

## Common Mistakes

1. Treating all patches as emergencies; this creates fatigue and increases error rates
2. Patching production without testing in staging; even minor updates can break things
3. Not verifying the patch actually closed the vulnerability (re-scan after deploy)
4. Patching during peak traffic without a maintenance window
5. Ignoring container base images; application dependencies get attention, OS libraries do not

## Frequently Asked Questions

### How do I handle a zero-day vulnerability with no patch available?

Activate compensating controls immediately: WAF rules, network segmentation, disabling the vulnerable feature, or adding rate limiting. Document the mitigation in the exception log. Monitor the vendor's security advisory daily. When the patch drops, treat it as Critical severity regardless of its CVSS score—attackers are already prepared for it.

### Should I automate patch deployment to production?

Automate only Low and Medium severity patches after they pass staging. Critical and High patches should have a human approval gate, even if the pipeline is automated. The approval should be a documented sign-off (Slack acknowledgment is acceptable) that verifies the patch was tested and the rollback plan is ready.

### What is the difference between patch management and vulnerability management?

**Patch management** is the operational process of applying fixes. **Vulnerability management** is the broader program: discovery (scanning), risk assessment (CVSS + business context), prioritization, patching, and verification. This template covers the patching phase; you also need a scanning tool (Trivy, Nessus, Snyk) and a risk scoring process to feed the inventory.

## Advanced Solutions

### Automated OS patching with Ansible

Automate security patches across Linux servers using Ansible with rolling updates:

```yaml
---
- name: Apply security patches to Linux servers
  hosts: production_servers
  become: yes
  serial: 1    # Rolling: one server at a time
  max_fail_percentage: 0

  pre_tasks:
    - name: Create rollback snapshot
      community.general.snap:
        name: "pre-patch-{{ ansible_date_time.iso8601 }}"
        state: present

  tasks:
    - name: Update apt cache and install security updates (Debian/Ubuntu)
      apt:
        update_cache: yes
        upgrade: dist
        only_upgrade: yes
      when: ansible_os_family == "Debian"
      register: apt_result

    - name: Install security updates (RHEL/CentOS)
      yum:
        name: "*"
        state: latest
        security: yes
      when: ansible_os_family == "RedHat"
      register: yum_result

    - name: Check if reboot is required (Debian/Ubuntu)
      stat:
        path: /var/run/reboot-required
      register: reboot_required
      when: ansible_os_family == "Debian"

    - name: Reboot server if required
      reboot:
        reboot_timeout: 300
      when: reboot_required.stat.exists | default(false)

    - name: Wait for server to recover
      wait_for_connection:
        delay: 10
        timeout: 300

  post_tasks:
    - name: Verify critical services are running
      service:
        name: "{{ item }}"
        state: started
      loop:
        - nginx
        - postgresql
        - redis

    - name: Run health check endpoint
      uri:
        url: "http://{{ inventory_hostname }}:8080/health"
        status_code: 200
        timeout: 10
      retries: 3
      delay: 5
```

### Container image patching pipeline

Automate base image patching for Docker containers with a CI/CD pipeline:

```bash
#!/bin/bash
set -euo pipefail

IMAGE_NAME="myapp"
REGISTRY="registry.example.com"
NEW_BASE="node:20-slim"

# Pull latest base image
docker pull "$NEW_BASE"

# Build patched image
docker build \
  --build-arg BASE_IMAGE="$NEW_BASE" \
  -t "$REGISTRY/$IMAGE_NAME:patched-$(date +%Y%m%d)" \
  -t "$REGISTRY/$IMAGE_NAME:latest" \
  .

# Scan the new image for vulnerabilities
trivy image --exit-code 1 --severity HIGH,CRITICAL \
  "$REGISTRY/$IMAGE_NAME:patched-$(date +%Y%m%d)"

# Push patched image
docker push "$REGISTRY/$IMAGE_NAME:patched-$(date +%Y%m%d)"
docker push "$REGISTRY/$IMAGE_NAME:latest"

# Trigger rolling deployment in Kubernetes
kubectl set image deployment/myapp \
  "app=$REGISTRY/$IMAGE_NAME:patched-$(date +%Y%m%d)" \
  -n production

kubectl rollout status deployment/myapp -n production
```

### Kernel live patching with kpatch

Apply critical kernel patches without rebooting using kpatch on RHEL/CentOS:

```bash
#!/bin/bash
set -euo pipefail

# Install kpatch utilities
yum install -y kpatch

# Check available live patches
kpatch list

# Load a specific kernel patch module
kpatch load "kpatch-$(uname -r)-CVE-2024-12345.ko"

# Verify patch is active
kpatch info "kpatch-$(uname -r)-CVE-2024-12345.ko"

# Enable patch to persist across reboots
systemctl enable kpatch.service

echo "Kernel patch applied without reboot. Verify with: kpatch list"
```

## Additional Best Practices

1. **Use canary deployments for OS patches.** Instead of patching all servers at once, patch 5% of your fleet first. Monitor error rates, latency, and resource usage for 24 hours before proceeding:

```bash
# Patch canary instances only
ansible-playbook patch-security-updates.yml \
  --limit "production_canary_group" \
  --extra-vars "canary_mode=true"
```

2. **Track patch provenance for audit trails.** Record which patches were applied, when, by whom, and with what approval. This creates evidence for SOC 2 and ISO 27001 audits:

```bash
# Generate patch audit report
ansible-playbook patch-security-updates.yml \
  --extra-vars "audit_log=/var/log/patch-audit/$(date +%Y%m%d).json"
```

## Additional Common Mistakes

1. **Not testing kernel patches on staging with identical hardware.** Kernel patches can cause driver failures on specific hardware. Test on a staging server with the same hardware profile before production:

```bash
# Verify kernel module compatibility after patch
lsmod | grep -E "(driver_name|module_name)"
dmesg | grep -i "error\|fail\|warning" | tail -20
```

2. **Forgetting to patch container orchestration components.** Kubernetes components (kubelet, etcd, kube-proxy) need patching too. Use kubeadm to upgrade the cluster:

```bash
# Upgrade Kubernetes cluster components
kubeadm upgrade plan
kubeadm upgrade apply v1.30.0
kubectl drain node-1 --ignore-daemonsets
kubeadm upgrade node
kubectl uncordon node-1
```

## Additional Frequently Asked Questions

### How do I patch air-gapped systems?

Transfer patch files via removable media or a dedicated bastion host. Verify file integrity with SHA-256 checksums before applying. Document each patch in an offline inventory. Schedule periodic full vulnerability scans using an offline scanner like Nessus or OpenSCAP.

### What is live patching and when should I use it?

Live patching applies kernel security fixes without rebooting. Use it for Critical CVEs on production systems where reboots are not immediately possible (single-instance databases, legacy applications). Live patching is not a substitute for scheduled maintenance—plan a reboot during the next window to ensure full kernel consistency.
