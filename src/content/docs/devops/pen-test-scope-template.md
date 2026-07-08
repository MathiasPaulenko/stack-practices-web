---
contentType: docs
slug: pen-test-scope-template
title: "Penetration Test Scope Template"
description: "A template for defining the boundaries, targets, rules, and deliverables for a penetration testing engagement."
metaDescription: "Define penetration testing boundaries with this scope template. Covers targets, exclusions, rules of engagement, deliverables, and schedule."
difficulty: intermediate
topics:
  - security
  - testing
tags:
  - penetration-test
  - security-assessment
  - scope
  - red-team
  - compliance
relatedResources:
  - /docs/devops/container-security-baseline-template
  - /docs/devops/network-segmentation-policy-template
  - /docs/devops/compliance-gap-analysis-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Define penetration testing boundaries with this scope template. Covers targets, exclusions, rules of engagement, deliverables, and schedule."
  keywords:
    - penetration test scope
    - security assessment
    - rules of engagement
    - pen test template
    - vulnerability assessment
---

## Overview

A Penetration Test Scope Template defines what will be tested, what will not be tested, how the testing will be conducted, and what the organization expects to receive. A clear scope protects the organization from unintended disruption, prevents legal issues for testers, and ensures the engagement delivers useful value.

## When to Use

- Hiring an external security firm for a penetration test.
- Running an internal red-team or purple-team exercise.
- Meeting compliance requirements for annual testing.
- After a major architecture change or product launch.
- Scoping a bug bounty or crowdsourced testing program.

## Prerequisites

- An inventory of systems, applications, and network ranges.
- Legal and compliance approval for testing.
- A contact list for emergency escalation.
- An understanding of the testing methodology, such as OWASP or PTES.

## Solution

### Template

#### 1. Engagement Details

| Field | Description | Value |
|-------|-------------|-------|
| Organization | Entity being tested | Acme Corp |
| Engagement type | Black box, gray box, or white box | Gray box |
| Start date | When testing begins | 2026-07-01 |
| End date | When testing ends | 2026-07-15 |
| Testing window | Allowed hours | 08:00 - 18:00 UTC |
| Emergency contact | 24/7 contact for critical findings | security@example.com |
| Report due date | When findings are delivered | 2026-07-22 |

#### 2. Targets In Scope

| Target | Type | Environment | URL / IP Range | Notes |
|--------|------|-------------|----------------|-------|
| app.example.com | Web application | Production | 203.0.113.10 | Public-facing |
| api.example.com | API | Production | 203.0.113.11 | OAuth2 protected |
| k8s cluster | Cloud infrastructure | Staging | 10.0.0.0/16 | Read-only credentials provided |
| Admin portal | Web application | Production | admin.example.com | MFA enabled |

#### 3. Out-of-Scope Items

| Item | Reason |
|------|--------|
| Third-party SaaS providers | Outside organizational control |
| Physical security | Not included in this engagement |
| Social engineering | Excluded per legal request |
| Denial-of-service attacks | Risk to production uptime |
| Employee personal devices | Privacy and legal boundaries |
| Production database writes | Could corrupt customer data |

#### 4. Rules of Engagement

| Rule | Description |
|------|-------------|
| Authorized testing | Only listed targets may be tested |
| Communication | Critical findings reported immediately |
| Data handling | No customer data exfiltration unless approved |
| Tooling | Commercial and open-source tools allowed; no auto-exploitation on production |
| Evidence | Screenshots and logs required for all findings |
| Confidentiality | Results stored encrypted and shared only with named recipients |
| Clean-up | Tester must remove any persistence or accounts created during testing |

#### 5. Testing Methodology

| Phase | Activities | Deliverable |
|-------|------------|-------------|
| Reconnaissance | Collect public information and map targets | Target inventory |
| Scanning | Vulnerability and configuration scanning | Scan output |
| Exploitation | Attempt to validate vulnerabilities | Exploitation evidence |
| Post-exploitation | Assess impact and lateral movement | Impact analysis |
| Reporting | Document findings, risk, and remediation | Final report |
| Retest | Verify fixes after remediation | Retest report |

#### 6. Success Criteria

| Criterion | Target |
|-----------|--------|
| Coverage | 100% of in-scope targets tested |
| Critical findings | Reported within 24 hours of discovery |
| Report quality | Includes risk rating, evidence, and remediation steps |
| Retest | All high and critical findings remediated and retested |
| Debrief | Executive and technical sessions delivered |

## Explanation

The scope template aligns the organization and testers before any traffic is sent. It reduces legal risk, prevents production outages, and ensures the findings are relevant. Rules of engagement are especially important because they separate authorized testing from criminal activity under computer fraud laws.

## Variants

- **Web application penetration test**: Focuses on OWASP Top 10 testing for a single app.
- **Cloud penetration test**: Targets AWS, Azure, or GCP configurations and IAM.
- **Red team exercise**: Broader scope with stealth objectives and longer duration.
- **Bug bounty scope**: Public-facing targets with safe harbor language and reward rules.
- **Internal network test**: Assumes an insider or compromised endpoint perspective.

## What works

- Get written authorization before any testing begins.
- Include both technical and business owners in scope definition.
- Define emergency contacts and escalation paths.
- Exclude third-party systems unless explicit permission is obtained.
- Require proof-of-concept evidence for every finding.
- Schedule retesting to validate remediation.
- Store findings securely and limit distribution.

## Common Mistakes

- Defining a scope that is too narrow to find real risks.
- Forgetting to include APIs, microservices, and mobile backends.
- Not providing test credentials for authenticated testing.
- Allowing testing on production without a rollback plan.
- Skipping retest and assuming fixes are complete.
- Not informing SOC or NOC that testing will occur.

## FAQs

### What is a gray box test?

A gray box test provides the tester with some internal knowledge, such as credentials, architecture diagrams, or source code, while still simulating an attacker with limited access.

### Can we test production systems?

Production testing is allowed if explicitly included in the scope, during agreed windows, and with rollback plans. Many organizations prefer testing staging first.

### What should a report include?

At minimum: executive summary, methodology, scope, risk-rated findings, evidence, impact, remediation steps, and retest results. Include timelines and CVSS scores where applicable.

## Advanced Solutions

### Automated reconnaissance with Nmap and Nuclei

Run automated scanning as a first pass before manual exploitation to identify low-hanging fruit:

```bash
#!/bin/bash
set -euo pipefail

TARGETS_FILE="targets.txt"
OUTPUT_DIR="pentest-recon-$(date +%Y%m%d)"
mkdir -p "$OUTPUT_DIR"

# Port scan all targets
echo "=== Port Scanning ==="
while IFS= read -r target; do
  echo "Scanning $target..."
  nmap -sV -sC -oA "$OUTPUT_DIR/nmap-$target" "$target" >> "$OUTPUT_DIR/nmap-summary.txt" 2>&1
done < "$TARGETS_FILE"

# Run Nuclei for known vulnerability templates
echo "=== Nuclei Vulnerability Scan ==="
nuclei -l "$TARGETS_FILE" \
  -t cves/ \
  -t exposures/ \
  -t misconfiguration/ \
  -severity critical,high,medium \
  -o "$OUTPUT_DIR/nuclei-findings.txt" \
  -json-export "$OUTPUT_DIR/nuclei-findings.json"

# Check for SSL/TLS issues
echo "=== SSL/TLS Assessment ==="
while IFS= read -r target; do
  testssl --severity HIGH --quiet "$target" >> "$OUTPUT_DIR/testssl-$target.txt" 2>&1
done < "$TARGETS_FILE"

# Summarize findings
echo "=== Summary ==="
echo "Nmap scans: $(ls "$OUTPUT_DIR"/nmap-*.xml 2>/dev/null | wc -l)"
echo "Nuclei findings: $(wc -l < "$OUTPUT_DIR/nuclei-findings.txt" 2>/dev/null || echo 0)"
echo "Results stored in $OUTPUT_DIR/"
```

### OWASP ZAP automated scan for web applications

Run authenticated scans against web targets using ZAP's API:

```python
import time
from zapv2 import ZAPv2
from typing import List, Dict

class ZAPScanner:
    def __init__(self, zap_proxy: str = "http://127.0.0.1:8080", api_key: str = ""):
        self.zap = ZAPv2(proxies={"http": zap_proxy, "https": zap_proxy}, apikey=api_key)

    def scan_target(self, target_url: str, context_name: str = None) -> Dict:
        """Run a full ZAP scan against a target URL."""
        results = {"target": target_url, "alerts": []}

        # Step 1: Spider the target
        print(f"Spidering {target_url}...")
        scan_id = self.zap.spider.scan(target_url)
        while int(self.zap.spider.status(scan_id)) < 100:
            time.sleep(2)
        print(f"Spider complete. Found {len(self.zap.core.urls())} URLs.")

        # Step 2: Active scan
        print(f"Active scanning {target_url}...")
        ascan_id = self.zap.ascan.scan(target_url)
        while int(self.zap.ascan.status(ascan_id)) < 100:
            time.sleep(5)
        print("Active scan complete.")

        # Step 3: Collect alerts
        alerts = self.zap.core.alerts(baseurl=target_url)
        for alert in alerts:
            results["alerts"].append({
                "name": alert.get("name"),
                "risk": alert.get("risk"),
                "confidence": alert.get("confidence"),
                "url": alert.get("url"),
                "param": alert.get("param"),
                "solution": alert.get("solution"),
            })

        # Summary by risk level
        risk_counts = {}
        for a in results["alerts"]:
            risk = a["risk"]
            risk_counts[risk] = risk_counts.get(risk, 0) + 1

        results["summary"] = risk_counts
        return results

    def generate_report(self, results: List[Dict], output_file: str) -> None:
        """Generate a markdown report from scan results."""
        with open(output_file, "w") as f:
            f.write("# ZAP Automated Scan Report\n\n")
            f.write(f"**Date:** {time.strftime('%Y-%m-%d %H:%M UTC')}\n\n")

            for result in results:
                f.write(f"## {result['target']}\n\n")
                f.write(f"**Alerts by risk:** {result['summary']}\n\n")

                for alert in result["alerts"]:
                    f.write(f"### {alert['name']} ({alert['risk']})\n\n")
                    f.write(f"- **URL:** {alert['url']}\n")
                    f.write(f"- **Confidence:** {alert['confidence']}\n")
                    f.write(f"- **Solution:** {alert['solution']}\n\n")

# Example usage
scanner = ZAPScanner(zap_proxy="http://127.0.0.1:8080")
results = scanner.scan_target("https://app.example.com")
scanner.generate_report([results], "zap-report.md")
```

### Finding tracking with Jira integration

Automatically create tickets for penetration test findings:

```python
from jira import JIRA
from dataclasses import dataclass
from typing import List

@dataclass
class PentestFinding:
    title: str
    severity: str  # Critical, High, Medium, Low
    description: str
    affected_component: str
    evidence: str
    remediation: str
    cvss_score: float

SEVERITY_TO_PRIORITY = {
    "Critical": "Highest",
    "High": "High",
    "Medium": "Medium",
    "Low": "Low",
}

class FindingToJira:
    def __init__(self, jira_url: str, api_token: str, project_key: str):
        self.jira = JIRA(server=jira_url, token_auth=api_token)
        self.project_key = project_key

    def create_tickets(self, findings: List[PentestFinding]) -> None:
        """Create Jira tickets for each penetration test finding."""
        for finding in findings:
            issue_dict = {
                "project": {"key": self.project_key},
                "summary": f"[Pentest] {finding.title} - {finding.affected_component}",
                "description": (
                    f"h3. Description\n{finding.description}\n\n"
                    f"h3. Affected Component\n{finding.affected_component}\n\n"
                    f"h3. Evidence\n{{code}}{finding.evidence}{{code}}\n\n"
                    f"h3. Remediation\n{finding.remediation}\n\n"
                    f"h3. CVSS Score\n{finding.cvss_score}"
                ),
                "issuetype": {"name": "Bug"},
                "priority": {"name": SEVERITY_TO_PRIORITY.get(finding.severity, "Medium")},
                "labels": ["pentest-finding", f"severity-{finding.severity.lower()}"],
            }
            issue = self.jira.create_issue(fields=issue_dict)
            print(f"Created {issue.key}: {finding.title} ({finding.severity})")

# Example usage
findings = [
    PentestFinding(
        title="SQL Injection in login endpoint",
        severity="Critical",
        description="The /api/login endpoint is vulnerable to SQL injection via the username parameter.",
        affected_component="api.example.com /api/login",
        evidence="' OR '1'='1' -- returned all user records",
        remediation="Use parameterized queries and input validation. See OWASP SQL Injection Prevention Cheat Sheet.",
        cvss_score=9.8,
    ),
    PentestFinding(
        title="Missing security headers",
        severity="Low",
        description="X-Frame-Options and Content-Security-Policy headers are not set.",
        affected_component="app.example.com",
        evidence="curl -I https://app.example.com shows missing headers",
        remediation="Add security headers in web server configuration or application middleware.",
        cvss_score=3.1,
    ),
]

jira_client = FindingToJira("https://company.atlassian.net", "api-token", "SEC")
jira_client.create_tickets(findings)
```

## Additional Best Practices

1. **Use a finding severity matrix that maps to business risk.** Technical severity alone does not capture business context. A medium SQL injection on a public-facing payment API is more urgent than a high finding on an internal admin tool behind VPN:

```markdown
## Business Risk Adjustment Matrix

| Technical Severity | Public-Facing | Authenticated Users Only | Internal Only |
|-------------------|---------------|-------------------------|---------------|
| Critical | Critical | Critical | High |
| High | High | High | Medium |
| Medium | Medium | Medium | Low |
| Low | Low | Low | Informational |
```

2. **Provide testers with a test environment when possible.** Testing staging or a production replica reduces risk while still finding real vulnerabilities:

```bash
#!/bin/bash
# Clone production database to staging for testing
aws rds create-db-snapshot \
  --db-instance-identifier prod-db \
  --db-snapshot-identifier pentest-snapshot-$(date +%Y%m%d)

aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier pentest-staging-db \
  --db-snapshot-identifier pentest-snapshot-$(date +%Y%m%d) \
  --db-subnet-group-name staging-subnet \
  --vpc-security-group-ids sg-pentest-access
```

## Additional Common Mistakes

1. **Not notifying cloud providers about penetration testing.** Some cloud providers (AWS, Azure) require notification before testing. AWS no longer requires prior approval, but Azure still does for certain test types:

```bash
# Azure - notify Microsoft of penetration testing
# Submit via: https://msrc.microsoft.com/engage/pentest
# Include: subscription ID, test dates, target IPs, test types

# AWS - no longer requires approval, but review the testing policy
# https://aws.amazon.com/security/penetration-testing/
# Prohibited: DNS zone walking, DoS, DDoS
```

2. **Failing to clean up test artifacts.** Testers may leave behind files, scripts, or user accounts. Require a cleanup checklist as part of the deliverables:

```markdown
## Post-Test Cleanup Checklist

- [ ] All test accounts removed from target systems
- [ ] Any uploaded files or scripts deleted
- [ ] Persistence mechanisms (cron jobs, services) removed
- [ ] Test data purged from databases
- [ ] SSH keys or credentials created during testing revoked
- [ ] Any modified configurations restored to original state
- [ ] Confirmation of cleanup provided in writing
```

## Additional FAQs

### How do we scope a penetration test for microservices?

List each microservice endpoint separately in the scope table. Include the API gateway, individual service endpoints, and any service-to-service communication paths. Provide Swagger/OpenAPI specs to testers for comprehensive coverage. Test both the gateway (external perspective) and individual services (internal perspective). Include authentication and authorization testing for each service's API.

### What is the difference between a vulnerability scan and a penetration test?

A vulnerability scan identifies potential weaknesses using automated tools. A penetration test goes further: a human validates findings, chains vulnerabilities together, attempts lateral movement, and assesses real-world impact. Vulnerability scans are routine and frequent; penetration tests are periodic and deeper. Both are needed for a complete security program.
