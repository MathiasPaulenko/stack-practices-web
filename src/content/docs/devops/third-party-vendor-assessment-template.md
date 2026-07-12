---




contentType: docs
slug: third-party-vendor-assessment-template
title: "Third-Party Vendor Assessment Template"
description: "A structured template for evaluating the security, compliance, and operational posture of third-party vendors before onboarding or renewal."
metaDescription: "Evaluate third-party vendors with this assessment template. Covers security posture, compliance, SLA commitments, and risk scoring."
difficulty: intermediate
topics:
  - security
  - devops
tags:
  - vendor-assessment
  - third-party-risk
  - security
  - compliance
  - due-diligence
relatedResources:
  - /docs/data-breach-response-playbook
  - /docs/access-control-review-template
  - /docs/rbac-policy-template
  - /recipes/bash-iptables-firewall
  - /docs/dependency-vulnerability-report-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Evaluate third-party vendors with this assessment template. Covers security posture, compliance, SLA commitments, and risk scoring."
  keywords:
    - vendor assessment
    - third party risk
    - security questionnaire
    - vendor due diligence
    - compliance review




---

## Overview

A Third-Party Vendor Assessment Template standardizes how your organization evaluates external service providers before contract signing, integration, or renewal. It gathers evidence about a vendor's security controls, compliance certifications, operational practices, and business continuity posture so teams can make informed risk decisions.

## When to Use

- Before onboarding a new SaaS, cloud, or infrastructure vendor.
- During annual security reviews or contract renewals.
- After a vendor experiences a security incident or breach.
- When procurement requires a documented risk acceptance process.
- To compare multiple vendors against the same security criteria.

## Prerequisites

- A defined risk appetite and acceptable control baselines.
- Legal or procurement support for contract review.
- Access to the vendor's security documentation, SOC 2 reports, or penetration test summaries.
- A stakeholder from engineering, security, and legal for scoring.

## Solution

### Template

#### 1. Vendor Identification

| Field | Description | Example |
|-------|-------------|---------|
| Vendor name | Legal entity name | Acme Cloud Services |
| Service description | What the vendor provides | Managed Kubernetes hosting |
| Data access | Data the vendor will process or store | Customer email addresses, logs |
| Integration type | How the vendor connects to your systems | API, OAuth, SSO |
| Renewal date | Contract expiration | 2027-12-31 |

#### 2. Security Posture

| Control Area | Vendor Response | Evidence Requested | Score (1-5) |
|--------------|-----------------|-------------------|-------------|
| Encryption in transit | TLS 1.2+ | Certificate scan | |
| Encryption at rest | AES-256 | Architecture doc | |
| Identity and access management | SSO + MFA | Configuration screenshot | |
| Logging and monitoring | SIEM + alerts | Policy document | |
| Incident response | 24/7 response team | Runbook or contract clause | |
| Vulnerability management | Monthly scans | Scan report | |

#### 3. Compliance and Certifications

| Certification | Status | Expiration | Notes |
|---------------|--------|------------|-------|
| SOC 2 Type II | Current | 2026-09-30 | Report reviewed |
| ISO 27001 | Current | 2027-03-15 | Certificate attached |
| GDPR / privacy | Compliant | N/A | DPA signed |
| HIPAA | N/A | N/A | No health data |

#### 4. Operational Resilience

| Topic | Question | Answer |
|-------|----------|--------|
| Uptime SLA | What is the guaranteed availability? | 99.95% monthly |
| Support response | Response time for critical issues | 1 hour |
| Data residency | Where is data stored? | EU, US-East |
| Backup and recovery | RPO / RTO targets | 1 hour / 4 hours |
| Exit strategy | How is data returned or deleted on termination? | Encrypted export within 30 days |

#### 5. Risk Scoring Summary

| Risk Category | Weight | Score | Weighted Score |
|---------------|--------|-------|----------------|
| Security | 30% | 4 | 1.2 |
| Compliance | 25% | 5 | 1.25 |
| Operational | 25% | 3 | 0.75 |
| Financial | 10% | 4 | 0.4 |
| Reputational | 10% | 3 | 0.3 |
| **Total** | 100% | | **3.9** |

#### 6. Decision

| Outcome | Condition |
|---------|-----------|
| Approve | Total score >= 4.0 and no critical gaps |
| Approve with conditions | Score 3.0 - 3.9 and gaps can be remediated |
| Reject | Score < 3.0 or critical unmitigated risk |

## Explanation

The template collects consistent evidence across vendors, which makes it easier to compare risk and justify decisions. Scoring converts qualitative answers into numbers that can be tracked over time and escalated to leadership. The decision section removes ambiguity about whether a vendor can proceed.

## Variants

- **Lightweight vendor review**: A shorter 10-question checklist for low-risk vendors such as analytics or marketing tools.
- **Critical infrastructure review**: A deeper assessment with architectural diagrams, source-code review rights, and on-site audits.
- **AI/ML vendor assessment**: Adds questions about model training data, bias, output ownership, and explainability.
- **Renewal-only review**: Skips basic onboarding questions and focuses on changes since the last assessment.

## What Works

- Reuse the same template for every vendor to keep comparisons fair.
- Request evidence, not just yes/no answers.
- Define a minimum score and mandatory controls before starting the review.
- Store completed assessments in a central repository for audit trails.
- Re-evaluate high-risk vendors annually or after major incidents.
- Include right-to-audit clauses in contracts when risk is high.

## Common Mistakes

- Accepting vendor-provided marketing slides as evidence.
- Skipping re-assessment during renewals.
- Failing to track remediation commitments after conditional approval.
- Assigning scoring to a single person without peer review.
- Ignoring subcontractors or fourth-party dependencies used by the vendor.

## FAQs

### What if a vendor refuses to share a SOC 2 report?

Request a summary of controls or a compliance questionnaire. If they still refuse, escalate the risk and consider requiring a contractual right-to-audit or additional security controls.

### How often should vendors be reassessed?

Annually for high-risk vendors, and at every renewal or major service change for others. Incident-triggered reviews are also recommended.

### Who should own the assessment process?

Security or risk teams usually own the process, but procurement, legal, and engineering must provide input. Final approval should involve the data owner.

## Advanced Solutions

### Automated vendor security questionnaire with API checks

Automate initial vendor screening by checking public security APIs and registries before sending the full questionnaire:

```python
import requests
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class VendorSecurityCheck:
    vendor_name: str
    domain: str
    results: dict = field(default_factory=dict)

    def check_dnssec(self) -> None:
        """Check if the vendor domain has DNSSEC enabled."""
        try:
            resp = requests.get(
                f"https://dns.google/resolve?name={self.domain}&type=DNSKEY",
                timeout=10
            )
            has_dnssec = len(resp.json().get("Answer", [])) > 0
            self.results["dnssec"] = "enabled" if has_dnssec else "disabled"
        except Exception:
            self.results["dnssec"] = "error"

    def check_tls(self) -> None:
        """Check TLS configuration via SSL Labs API."""
        try:
            resp = requests.get(
                f"https://api.ssllabs.com/api/v3/analyze?host={self.domain}",
                timeout=15
            )
            data = resp.json()
            self.results["tls_grade"] = data.get("grade", "pending")
            self.results["tls_protocols"] = data.get("protocols", [])
        except Exception:
            self.results["tls_grade"] = "error"

    def check_cps(self) -> None:
        """Check for published Certificate Practice Statement."""
        cps_urls = [
            f"https://{self.domain}/cps",
            f"https://{self.domain}/.well-known/security.txt",
        ]
        for url in cps_urls:
            try:
                resp = requests.head(url, timeout=10, allow_redirects=True)
                if resp.status_code == 200:
                    self.results["security_txt"] = url
                    return
            except Exception:
                pass
        self.results["security_txt"] = "not found"

    def check_breach_history(self) -> None:
        """Check Have I Been Pwned API for known breaches."""
        try:
            resp = requests.get(
                f"https://haveibeenpwned.com/api/v3/breaches?domain={self.domain}",
                headers={"User-Agent": "VendorAssessment/1.0"},
                timeout=10
            )
            if resp.status_code == 200:
                breaches = resp.json()
                self.results["breach_count"] = len(breaches)
                self.results["breaches"] = [b["Name"] for b in breaches[:5]]
            else:
                self.results["breach_count"] = 0
        except Exception:
            self.results["breach_count"] = "error"

    def run_all(self) -> dict:
        self.check_dnssec()
        self.check_tls()
        self.check_cps()
        self.check_breach_history()
        return self.results

# Example usage
vendor = VendorSecurityCheck(vendor_name="Acme Cloud", domain="acmecloud.com")
report = vendor.run_all()
for key, value in report.items():
    print(f"  {key}: {value}")
```

### Vendor risk scoring automation

Automate the weighted risk scoring from the assessment template:

```python
from dataclasses import dataclass
from typing import Dict

@dataclass
class VendorRiskScorer:
    scores: Dict[str, float]  # category -> score (1-5)
    weights: Dict[str, float] = field(default_factory=lambda: {
        "security": 0.30,
        "compliance": 0.25,
        "operational": 0.25,
        "financial": 0.10,
        "reputational": 0.10,
    })

    @property
    def total_score(self) -> float:
        total = 0.0
        for category, weight in self.weights.items():
            score = self.scores.get(category, 0)
            total += score * weight
        return round(total, 2)

    @property
    def decision(self) -> str:
        score = self.total_score
        if score >= 4.0:
            return "APPROVE"
        elif score >= 3.0:
            return "APPROVE_WITH_CONDITIONS"
        else:
            return "REJECT"

    @property
    def critical_gaps(self) -> list:
        gaps = []
        for category, score in self.scores.items():
            if score <= 2:
                gaps.append(f"{category}: score {score}/5 is critical")
        return gaps

    def report(self) -> str:
        lines = ["Vendor Risk Assessment Report", "=" * 40]
        for cat, score in self.scores.items():
            weight = self.weights.get(cat, 0)
            weighted = round(score * weight, 2)
            lines.append(f"  {cat}: {score}/5 (weight: {weight:.0%}, weighted: {weighted})")
        lines.append(f"\n  Total Score: {self.total_score}/5.0")
        lines.append(f"  Decision: {self.decision}")
        if self.critical_gaps:
            lines.append(f"  Critical Gaps: {', '.join(self.critical_gaps)}")
        return "\n".join(lines)

from dataclasses import field

# Example usage
scorer = VendorRiskScorer(scores={
    "security": 4,
    "compliance": 5,
    "operational": 3,
    "financial": 4,
    "reputational": 3,
})
print(scorer.report())
```

### Continuous vendor monitoring with scheduled checks

Set up a scheduled CI job to monitor vendor security posture changes between formal assessments:

```yaml
# .github/workflows/vendor-monitoring.yml
name: Vendor Security Monitoring
on:
  schedule:
    - cron: "0 6 * * 1"  # Weekly Monday 6am
  workflow_dispatch:

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Install dependencies
        run: pip install requests pyyaml
      - name: Run vendor checks
        env:
          SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
        run: |
          python scripts/vendor_monitoring.py \
            --config vendor-registry.yaml \
            --notify slack
```

```yaml
# vendor-registry.yaml
vendors:
  - name: "Acme Cloud Services"
    domain: "acmecloud.com"
    risk_level: high
    renewal_date: "2027-12-31"
  - name: "Analytics Pro"
    domain: "analyticspro.com"
    risk_level: low
    renewal_date: "2026-09-15"
```

## Additional Best Practices


- For a deeper guide, see [Vulnerability Management Template](/docs/vulnerability-management-template/).

1. **Map vendor access to your data classification levels.** Not every vendor needs access to the same data tier. Document what data each vendor can access and align controls accordingly:

```yaml
# vendor-data-access-matrix.yaml
data_classification:
  public:
    vendors: ["analytics-pro", "marketing-tools"]
    required_controls: ["tls-12", "basic-auth"]
  internal:
    vendors: ["acme-cloud", "support-zendesk"]
    required_controls: ["tls-12", "sso", "mfa", "dpa-signed"]
  restricted:
    vendors: ["payment-processor"]
    required_controls: ["tls-13", "sso", "mfa", "pci-dss", "right-to-audit"]
```

2. **Track remediation commitments with expiration dates.** Vendors often promise fixes during assessment but never deliver. Link commitments to contract renewals:

```bash
#!/bin/bash
# Check for overdue vendor remediation items
set -euo pipefail

REMEDICATION_FILE="vendor-remediation-log.csv"
TODAY=$(date +%Y-%m-%d)

awk -F',' -v today="$TODAY" '
NR>1 && $5 < today && $6 != "completed" {
    print "OVERDUE: " $1 " - " $2 " (due: " $5 ", status: " $6 ")"
}' "$REMEDICATION_FILE"
```

## Additional Common Mistakes

1. **Not assessing fourth-party risk (subcontractors).** Your vendor may use subcontractors that process your data. Require disclosure of sub-processors and their security posture:

```python
# Check vendor sub-processor list against your approved list
approved_subprocessors = {"aws", "gcp", "azure", "cloudflare"}
vendor_subprocessors = {"aws", "digitalocean", "cloudflare"}

unapproved = vendor_subprocessors - approved_subprocessors
if unapproved:
    print(f"Unapproved sub-processors found: {unapproved}")
```

2. **Accepting a SOC 2 report without checking the scope.** A SOC 2 report may cover only a subset of the vendor's services. Verify that the report covers the systems and controls relevant to your engagement:

```markdown
## SOC 2 Scope Verification Checklist
- [ ] Report covers the specific service you will use
- [ ] Report period is current (within last 12 months)
- [ ] Trust criteria match your requirements (Security, Availability, Confidentiality, Processing Integrity, Privacy)
- [ ] No qualified opinion or material exceptions
- [ ] Description of system matches actual architecture
```

## Additional Frequently Asked Questions

### What should we do if a vendor has a breach during our contract?

Activate your incident response plan. Notify affected users if the vendor processed their data. Require a post-incident report from the vendor, assess whether the breach exploited a gap in their security controls, and decide whether to continue, renegotiate, or terminate the contract.

### How do we handle vendors that cannot meet our security requirements?

If the vendor provides critical functionality that cannot be replaced, implement compensating controls: restrict data access, add monitoring, require contractual indemnification, and document a formal risk acceptance with an expiration date and executive sign-off.
