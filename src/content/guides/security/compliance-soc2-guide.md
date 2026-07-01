---
contentType: guides
slug: compliance-soc2-guide
title: "SOC 2 Compliance — Basics for Engineering Teams"
description: "A practical guide to SOC 2 Type II for developers: Trust Service Criteria, evidence collection, and building compliant systems from day one."
metaDescription: "Learn SOC 2 basics for developers: Trust Service Criteria, evidence collection, access controls, and building compliant systems from day one."
difficulty: intermediate
topics:
  - security
tags:
  - soc2
  - compliance
  - audit
  - trust-service-criteria
  - security-controls
  - guide
relatedResources:
  - /guides/compliance-gdpr-guide
  - /guides/secrets-management-guide
  - /guides/owasp-top-10-guide
  - /docs/security-audit-checklist-template
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Learn SOC 2 basics for developers: Trust Service Criteria, evidence collection, access controls, and building compliant systems from day one."
  keywords:
    - soc2
    - compliance
    - audit
    - trust-service-criteria
    - security-controls
    - guide
---

## Overview

SOC 2 (Service Organization Control 2) is an audit framework developed by the AICPA that evaluates how service organizations manage customer data. Unlike compliance checklists, SOC 2 Type II requires demonstrating that your controls operate well over time. For engineering teams, this means building systems with security, availability, processing integrity, confidentiality, and privacy — and proving they work through evidence.

## When to Use

- Your organization needs a SOC 2 report to sell to enterprise customers
- You are designing systems that will be audited
- You need to implement security controls that satisfy auditors
- You want to align engineering practices with industry-standard trust criteria

## Trust Service Criteria

SOC 2 evaluates five categories. Most startups start with Security (Common Criteria).

| Criteria | Focus | Developer Actions |
|----------|-------|-------------------|
| **Security (CC)** | System is protected against unauthorized access | IAM, encryption, logging, penetration testing |
| **Availability** | System is operational and accessible | Uptime monitoring, disaster recovery, capacity planning |
| **Processing Integrity** | Data processing is complete, valid, and accurate | Input validation, reconciliation, error handling |
| **Confidentiality** | Designated data is protected | Encryption, access controls, data classification |
| **Privacy** | Personal information is handled per privacy notice | Consent management, data retention, subject rights |

## Building Compliant Systems

### Access Controls (CC6)

Implement role-based access with least privilege and regular reviews.

```python
# Enforce MFA for production access
@mfa_required
def deploy_to_production(user, artifact):
    if not user.has_role("production_deployer"):
        raise Forbidden("Insufficient privileges")
    
    audit_log.record(
        actor=user.id,
        action="deploy",
        resource=artifact.id,
        timestamp=datetime.utcnow()
    )
    
    return deploy(artifact)
```

### System Operations (CC7)

Monitor, detect, and respond to security events.

```python
# Automated anomaly detection
def monitor_privilege_escalation():
    for event in auth_logs.recent(hours=24):
        if event.action == "role_change" and event.new_role == "admin":
            if event.old_role != "admin":
                alert_security_team(
                    f"Privilege escalation: {event.user_id} to admin"
                )
```

### Change Management (CC8)

All changes to production must be authorized, tested, and documented.

```yaml
# GitHub Actions: require approval for production
name: Deploy to Production
on:
  workflow_dispatch:
    inputs:
      approved_by:
        required: true
        description: "Security team approver"

jobs:
  deploy:
    environment: production  # Requires manual approval
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/verify-change-ticket.sh ${{ github.sha }}
      - run: ./scripts/deploy.sh production
```

### Risk Mitigation (CC9)

Identify, assess, and mitigate risks to the system.

```python
# Vulnerability management pipeline
def vulnerability_scan():
    results = {
        "dependency_check": run_snyk(),
        "container_scan": run_trivy(),
        "secrets_scan": run_trufflehog(),
    }
    
    for tool, findings in results.items():
        for finding in findings.critical:
            create_jira_ticket(
                summary=f"[CRITICAL] {finding.title}",
                assignee="security-team",
                due_date=now() + timedelta(days=1)
            )
```

## Evidence Collection

Auditors need proof that controls are operating. Automate evidence where possible.

| Control | Evidence Type | Automation |
|---------|--------------|------------|
| Access reviews | Quarterly user access reports | Export from IAM; diff against previous quarter |
| Penetration tests | Third-party test report | Schedule annually; track findings to closure |
| Backup restoration | Monthly restoration test | Automated test with pass/fail logging |
| Code review | PR approval audit trail | GitHub API export of approvals and rejections |
| Incident response | Postmortem documents | Template-driven; track time to resolution |

## System Monitoring

```python
# Centralized audit logging
class AuditEvent(BaseModel):
    timestamp: datetime
    actor: str
    action: str
    resource: str
    result: str  # success / denied / error
    ip_address: str
    user_agent: str
    correlation_id: str

def log_audit_event(event: AuditEvent):
    # Write to tamper-resistant log store
    audit_store.append(event.json())
    
    # Alert on suspicious patterns
    if event.result == "denied" and event.action == "admin_access":
        alert_security_team(f"Admin access denied: {event.actor}")
```

## Vendor Management

SOC 2 requires due diligence on third-party vendors.

```
Vendor Onboarding Checklist:
- [ ] Review vendor SOC 2 report (Type II preferred)
- [ ] Document data shared with vendor
- [ ] Sign DPA (Data Processing Agreement)
- [ ] Verify encryption in transit and at rest
- [ ] Confirm incident notification SLA
- [ ] Schedule annual review
```

## Common Mistakes

- **Treating SOC 2 as a one-time project** — it is continuous; auditors review 3-12 months of evidence
- **Relying on manual screenshots for evidence** — automate evidence collection where possible
- **No incident response plan** — auditors will ask how you handled past incidents
- **Ignoring offboarding** — former employees with lingering access is a common finding
- **Missing change management for infrastructure** — Terraform changes need approval and audit trails too

## FAQ

**How long does SOC 2 Type II take?**
Typically 3-6 months of preparation, then a 3-12 month observation period before the audit report is issued.

**What is the difference between Type I and Type II?**
Type I evaluates controls at a point in time. Type II evaluates controls over a period (usually 3-12 months) and requires evidence of continuous operation.

**Do I need a separate audit for each customer?**
No. A single SOC 2 report can be shared with all customers, though some may request supplemental questionnaires.
