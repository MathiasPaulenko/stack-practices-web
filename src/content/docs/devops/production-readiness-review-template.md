---
contentType: docs
slug: production-readiness-review-template
title: "Production Readiness Review Template"
description: "A thorough checklist for verifying that a service, feature, or system is ready for production deployment and ongoing operation."
metaDescription: "Ensure production readiness with this review checklist. Covers monitoring, SLOs, rollback, security, docs, and operational procedures."
difficulty: intermediate
topics:
  - devops
  - infrastructure
tags:
  - production-readiness
  - checklist
  - deployment
  - monitoring
  - operations
relatedResources:
  - /docs/devops/feature-specification-template
  - /docs/devops/service-ownership-document-template
  - /docs/devops/incident-communication-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Ensure production readiness with this review checklist. Covers monitoring, SLOs, rollback, security, docs, and operational procedures."
  keywords:
    - production readiness review
    - production checklist
    - deployment readiness
    - go-live checklist
    - service launch
---

## Overview

Shipping to production is not the finish line. It is the starting line for operational responsibility. A production readiness review (PRR) is a structured checkpoint that verifies a service or feature is ready to run in production: it can be monitored, rolled back, secured, and operated by people other than the author. PRRs prevent the 3 AM surprises where no one knows how to restart a service, what "normal" looks like, or how to roll back a bad deployment.

## When to Use

Use this template when:
- A new service is being deployed to production for the first time
- A major feature or refactor changes how an existing service operates
- A service is changing tiers (e.g., from Tier 3 internal tool to Tier 1 customer-facing)
- You are acquiring or migrating a service from another team or company
- An audit requires documented evidence of production readiness

## Prerequisites

Before conducting a PRR:
- [ ] The service or feature is code-complete and passes all automated tests
- [ ] A service ownership document exists (or will be created as part of this review)
- [ ] On-call rotation is defined and trained
- [ ] Runbooks exist for common failure scenarios
- [ ] A rollback procedure has been tested in a non-production environment

## Solution

```markdown
# Production Readiness Review: `<Service / Feature Name>`

> Reviewer: ______ | Date: ______ | Status: Pass / Conditional / Fail
> Service owner: ______ | Team: ______ | Release target: ______

---

## 1. Service Definition

- [ ] Service purpose is documented and understood by on-call engineers
- [ ] Service tier is defined (1 / 2 / 3) and matches operational requirements
- [ ] Service ownership document is complete and accessible
- [ ] Dependencies (upstream and downstream) are documented
- [ ] Data classification is defined (Public / Internal / Confidential / Restricted)

## 2. Architecture and Code Quality

- [ ] Architecture is reviewed and approved by a senior engineer or architect
- [ ] Code follows team standards (linting, formatting, test coverage)
- [ ] No known security vulnerabilities in dependencies (scanned within 30 days)
- [ ] Secrets are managed via secret manager, not hardcoded or in config files
- [ ] No single points of failure without documented mitigations

## 3. Testing

- [ ] Unit test coverage is above team minimum (usually 70-80%)
- [ ] Integration tests cover external dependencies and critical paths
- [ ] Load tests confirm the service handles expected peak traffic
- [ ] Chaos or failure injection tests verify graceful degradation
- [ ] End-to-end tests cover the full user journey where applicable

## 4. Observability

- [ ] Metrics are emitted for request rate, errors, and duration (RED)
- [ ] Logs are structured, correlated with trace IDs, and queryable
- [ ] Distributed tracing is configured for cross-service requests
- [ ] Dashboards exist for service health and key business metrics
- [ ] Alerting rules are configured with appropriate severity and thresholds
- [ ] On-call engineers can distinguish between symptoms and causes

## 5. Reliability and Resilience

- [ ] Health check endpoint exists and is used by load balancers
- [ ] Circuit breakers or bulkheads protect against cascading failures
- [ ] Timeouts and retries are configured for external calls
- [ ] Rate limiting is in place for public or partner-facing endpoints
- [ ] Database connections are pooled and bounded
- [ ] The service degrades gracefully when dependencies fail

## 6. Deployment and Release

- [ ] CI/CD pipeline exists and is green
- [ ] Deployments are automated; no manual production changes required
- [ ] Canary or staged rollout is configured for high-tier services
- [ ] Feature flags are available for risky or irreversible changes
- [ ] Database migrations are backward-compatible or have a tested rollback
- [ ] Rollback procedure is documented and tested within the last 30 days

## 7. Security

- [ ] Authentication and authorization are implemented correctly
- [ ] Input validation and sanitization protect against injection attacks
- [ ] Encryption in transit (TLS 1.2+) is enforced
- [ ] Sensitive data is encrypted at rest
- [ ] Security review is completed for auth, payment, or data-handling changes
- [ ] Penetration test or security scan results are reviewed and remediated

## 8. Data and State

- [ ] Database schema changes are reviewed for performance impact
- [ ] Backups are configured and tested (restore verified within 90 days)
- [ ] Data retention policies are documented and enforced
- [ ] GDPR / CCPA / compliance requirements are met for user data
- [ ] Migration scripts are idempotent and reversible where possible

## 9. Documentation

- [ ] README explains how to build, test, and run the service locally
- [ ] API documentation is current (OpenAPI / Swagger / equivalent)
- [ ] Runbooks exist for: deployment, rollback, common incidents, and escalation
- [ ] On-call handoff document is updated with recent changes and risks
- [ ] Architecture Decision Records (ADRs) cover major design choices

## 10. Operational Readiness

- [ ] On-call rotation is staffed and trained on this service
- [ ] Paging alerts reach the right people with useful context
- [ ] Escalation path is documented and contacts are verified
- [ ] Runbooks have been tested by someone who did not write the service
- [ ] Post-deployment verification steps are defined and automated where possible

---

## Review Notes

| Item | Finding | Risk | Mitigation / Action | Owner | Due Date |
|------|---------|------|---------------------|-------|----------|
| ______ | ______ | High / Medium / Low | ______ | ______ | ______ |

## Sign-Off

| Role | Name | Date | Signature (approve / block) |
|------|------|------|------------------------------|
| Engineering owner | ______ | ______ | ______ |
| Product owner | ______ | ______ | ______ |
| Security reviewer | ______ | ______ | ______ |
| SRE / Platform | ______ | ______ | ______ |
```

## Explanation

The PRR is organized into ten domains that cover the full lifecycle of operating software in production. Each domain has concrete checkboxes that can be verified objectively. The sign-off section ensures that no single person can declare a service ready without input from engineering, product, security, and operations. The review notes table captures gaps that are not blockers but need tracking.

## Completed PRR Example

```markdown
# PRR: Real-time Notification Service

## Service
- Name: notification-service
- Type: Microservice (Go)
- Tier: 1 (Critical for user experience)
- Review date: 2026-07-11

## Review Findings

| Item | Finding | Risk | Mitigation | Owner | Due |
|------|---------|------|------------|-------|-----|
| Observability | No WebSocket dashboard | Medium | Create dashboard before launch | alice | 2026-07-15 |
| Alerting | No alert for rejected connections | High | Add alert before launch | bob | 2026-07-14 |
| Security | JWT validation missing expiry test | High | Add test before launch | carol | 2026-07-14 |
| Documentation | No rollback runbook | Medium | Write runbook before launch | alice | 2026-07-16 |
| Operational | On-call not trained on WebSocket | Medium | Training session | platform | 2026-07-18 |

## Sign-Off

| Role | Name | Date | Decision |
|------|------|------|----------|
| Engineering owner | alice | 2026-07-18 | Conditional approve |
| Product owner | dave | 2026-07-18 | Approve |
| Security reviewer | carol | 2026-07-18 | Approve (test added) |
| SRE / Platform | bob | 2026-07-18 | Conditional approve |

## Decision
Conditionally approved. Launch permitted after completing the
3 High-risk items (alerting, security, test). Medium-risk items
tracked with due dates but do not block launch.
```


## Variants

| Context | Adjustments | Notes |
|---------|-------------|-------|
| Mobile app release | Add app store review, rollout percentage, and crashlytics monitoring | Mobile releases are harder to roll back |
| Data platform / pipeline | Add data quality checks, schema evolution plan, and consumer impact assessment | Data changes affect downstream teams silently |
| Third-party integration | Add vendor SLA review, contract terms, and fallback behavior | You do not control the upstream |
| Security-critical launch | Require mandatory security review and sign-off from security team | Auth, payment, and health data |
| Internal tool promotion | Reduce observability and on-call requirements; focus on documentation and support | Internal tools have different operational standards |

## What Works

1. Run the PRR early. Do not wait until the day before launch; identify gaps while there is still time to fix them
2. Make it a conversation, not a gate. The goal is readiness, not paperwork; collaborate on mitigations
3. Track gaps explicitly. Items that are not checked should have owners and due dates, not be ignored
4. Review quarterly for existing services. Services drift from readiness over time; schedule periodic reviews
5. Automate what you can. Coverage reports, dependency scans, and deployment health checks should feed into the PRR automatically

## Common Mistakes

1. Treating the PRR as a one-time event. Production readiness decays; schedule re-reviews for major changes
2. Skipping the rollback test. The only thing worse than a bad deploy is not knowing how to undo it
3. Not involving operations early. SREs and platform teams catch constraints that developers miss
4. Checking boxes without verifying. "We have monitoring" is not enough; confirm dashboards are useful and alerts are useful
5. Forgetting the human side. On-call engineers need training, not just documentation; verify they have run through the runbooks

## Frequently Asked Questions

### Who runs the production readiness review?

The service owner coordinates it. Reviewers include at least one engineer familiar with the service, one SRE or platform engineer, and security for sensitive services. Product may sign off but is not typically a technical reviewer.

### What happens if the review fails?

The team addresses gaps, reschedules the review, and does not deploy to production until sign-off is achieved. Conditional passes are acceptable if gaps are tracked with owners and due dates that do not block launch.

### Should we review existing services?

Yes. Schedule annual PRRs for Tier 1 and Tier 2 services. Major refactors, infrastructure migrations, or team changes should trigger an out-of-cycle review. The goal is readiness over time, not just at launch.


### How do we automate parts of the production readiness review?

Automate checks that are objectively verifiable: test coverage (threshold > 80%), dependency scans (Snyk, Dependabot), security scans (SAST/DAST), deployment health checks, and alert configuration verification. Use CI/CD to run these checks automatically and generate a report. Integrate results into the PRR document. For checks that require human judgment (runbook quality, dashboard usefulness), use a structured checklist with clear criteria. Automation reduces review effort and makes checks reproducible.

### What if a service fails the PRR repeatedly?

If a service fails the PRR more than 2 times: schedule a review with engineering leadership to understand why. Is it lack of resources? Lack of knowledge? Is the service too complex? Consider: embedding an SRE with the team, simplifying the service before retrying, or reducing the launch scope to pass fewer PRR items. Document recurring gaps and escalate if systemic. Never approve a service that fails the PRR without a remediation plan with due dates. A service not ready for production is a risk to everyone.

### How do we handle the PRR for infrastructure migrations?

For migrations (e.g., cloud provider change, database migration): run a full PRR for both the new system and the migration process. The new system PRR verifies it meets operational standards. The migration process PRR verifies: rollback plan, stakeholder communication, maintenance window, monitoring during migration, and success/failure criteria. Run the migration PRR at least 2 weeks before the scheduled migration. Document migration risks separately from service risks.

### How often should we review existing services?

Tier 1 services (critical): full PRR annually. Tier 2 services (important): PRR every 18 months. Tier 3 services (internal): PRR every 2 years or on major change. Triggers for out-of-cycle PRR: team owner change, major architectural refactor, infrastructure migration, SEV1 incident revealing operational gaps, or compliance requirement changes. Maintain a registry of PRRs per service with dates and findings. Include PRR status in the service health dashboard.

### What is the SRE role in the production readiness review?

The SRE or platform engineer is the technical reviewer of the PRR. Their role: verify alerts are actionable (not just noise), dashboards show useful metrics (not vanity metrics), runbooks are executable by someone who did not write the service, scaling is tested, and the rollback plan works. The SRE is not a security or product approver — their domain is operability. If the SRE blocks, the block is about operational readiness, not features or product priorities. Document SRE blocks with specific criteria for unblocking.

































End of document. Review and update quarterly.