---
contentType: guides
slug: platform-engineering-guide
title: "Platform Engineering — Building Internal Developer Platforms"
description: "A practical guide to platform engineering: IDP concepts, golden paths, self-service infrastructure, developer experience, and tools like Backstage, Crossplane, and Terraform."
metaDescription: "Learn platform engineering: build Internal Developer Platforms, golden paths, self-service infrastructure. Tools like Backstage, Crossplane, and Terraform."
difficulty: intermediate
topics:
  - devops
  - infrastructure
tags:
  - platform-engineering
  - idp
  - internal-developer-platform
  - golden-path
  - developer-experience
  - backstage
  - crossplane
  - terraform
  - guide
relatedResources:
  - /guides/sre-practices-guide
  - /guides/observability-guide
  - /guides/terraform-best-practices-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn platform engineering: build Internal Developer Platforms, golden paths, self-service infrastructure. Tools like Backstage, Crossplane, and Terraform."
  keywords:
    - platform-engineering
    - idp
    - internal-developer-platform
    - golden-path
    - developer-experience
    - backstage
    - guide
---

## Overview

Platform engineering is the discipline of building and maintaining Internal Developer Platforms (IDPs): self-service layers that abstract infrastructure complexity and allow developers to deploy, operate, and observe their applications without deep platform expertise. Instead of every team reinventing CI/CD, observability, and security patterns, a platform team curates "golden paths" — paved roads with guardrails that make the right thing the easy thing. The goal is not to restrict developers but to accelerate them by removing cognitive load.

## When to Use

- You have 10+ engineering teams with duplicated infrastructure effort
- Developer onboarding takes days because environments are hand-crafted
- Teams spend more time on YAML than on business logic
- Security and compliance requirements are inconsistently applied
- You want to scale Kubernetes adoption without every team becoming a cluster admin

## IDP Core Components

| Component | Purpose | Example tools |
|-----------|---------|---------------|
| **Developer portal** | Service catalog, documentation, scaffolds | Backstage, Port, Cortex |
| **Self-service infrastructure** | On-demand environments, databases | Crossplane, Terraform Cloud, Pulumi |
| **Golden path CI/CD** | Standardized deployment pipelines | ArgoCD, GitHub Actions, Tekton |
| **Observability stack** | Metrics, logs, traces per service | Prometheus, Grafana, Tempo, Loki |
| **Security guardrails** | Policy-as-code, secret management | OPA, Kyverno, Vault |

## The Golden Path

A golden path is a well-supported, documented, and templated workflow for a common task:

```
┌─────────────────────────────────────────────────────────┐
│  Developer wants: "Deploy a new REST API"                │
│                                                         │
│  → Backstage scaffold: API template                      │
│  → Auto-generated: CI/CD pipeline, monitoring, TLS       │
│  → ArgoCD deploys to staging with policy checks          │
│  → PR to main → canary to production                     │
│  → Grafana dashboard and alerts auto-provisioned         │
└─────────────────────────────────────────────────────────┘
```

The developer does not choose the ingress controller, the log format, or the metric naming convention. The platform made those decisions — and enforces them.

## Backstage Configuration Example

```yaml
# app-config.yaml
app:
  title: Internal Developer Portal
  baseUrl: http://localhost:3000

backend:
  baseUrl: http://localhost:7007
  listen:
    port: 7007

catalog:
  rules:
    - allow: [Component, System, API, Resource, Location]
  locations:
    - type: url
      target: https://github.com/acme/catalog-info.yaml

scaffolder:
  # Template locations
  locations:
    - type: url
      target: https://github.com/acme/backstage-templates/nodejs-api/template.yaml

techdocs:
  builder: 'local'
  generator:
    runIn: 'docker'
```

## Crossplane for Self-Service Infrastructure

```yaml
apiVersion: platform.example.com/v1alpha1
kind: DatabaseClaim
metadata:
  name: payment-db
  namespace: payments
spec:
  engine: postgres
  version: "15"
  size: small
  backupRetentionDays: 7
```

The platform team defines this CRD. Crossplane composites it into RDS instances, VPC security groups, and backup policies. The developer requests a database without knowing AWS exists.

## Measuring Platform Success

| Metric | How to measure | Target |
|--------|---------------|--------|
| **Time to provision environment** | Backstage analytics | < 10 minutes |
| **Developer onboarding time** | HR + platform surveys | < 1 day |
| **Deployment frequency** | DORA metrics | 2+ per developer per day |
| **Platform NPS** | Quarterly developer survey | > 50 |
| **Ticket volume to platform team** | ITSM data | Decreasing trend |

## Platform Team Anti-Patterns

| Anti-pattern | Fix |
|--------------|-----|
| **Ticket ops platform team** | Build self-service APIs, not ticket queues |
| **One-size-fits-all mandates** | Golden paths should be defaults, not requirements. Allow escape hatches. |
| **Platform without users** | Treat internal teams as customers. Do user research. |
| **Over-abstracting** | If the platform is harder than the underlying tool, it has failed. |
| **No product management** | Platform teams need roadmaps, OKRs, and feedback loops like any product team. |

## Common Mistakes

- **Building before understanding pain** — interview teams before writing any platform code
- **No documentation** — a platform without docs is a black box that generates tickets
- **Treating platform as cost center** — measure developer productivity gains, not just platform uptime
- **Ignoring the long tail** — the 80% case is easy; the platform must handle the 20% without breaking
- **No migration path** — existing services need a path onto the platform, not just greenfield templates

## FAQ

**What is the difference between platform engineering and DevOps?**
DevOps is a culture of shared responsibility. Platform engineering is a team function that builds the tooling and abstractions that enable DevOps at scale. You can have DevOps without a platform team; you cannot have a platform team without DevOps culture.

**Should we build or buy an IDP?**
Start with Backstage (open source, widely adopted) for the portal. Buy managed infrastructure (RDS, EKS, Datadog) for the backend. Build only what differentiates your business.

**How do we prevent the platform from becoming a bottleneck?**
Make it self-service. Every request that requires a human on the platform team is a design failure. Automate approvals with policy-as-code where possible.
