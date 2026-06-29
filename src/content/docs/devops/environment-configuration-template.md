---
contentType: docs
slug: environment-configuration-template
title: "Environment Configuration Template"
description: "A template to document environment variables, secrets, endpoints, and infrastructure settings per deployment environment."
metaDescription: "Document environment variables, secrets, endpoints, and infrastructure settings per deployment environment with this template."
difficulty: beginner
topics:
  - devops
  - infrastructure
tags:
  - configuration
  - environment
  - env-vars
  - secrets
  - deployment
relatedResources:
  - /docs/runbook-template
  - /docs/devops/deployment-checklist-template
  - /docs/devops/cloud-resource-tagging-policy-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Document environment variables, secrets, endpoints, and infrastructure settings per deployment environment with this template."
  keywords:
    - environment configuration template
    - env vars documentation
    - environment settings document
    - deployment configuration template
    - per environment configuration
---

## Overview

Every application runs in multiple environments such as development, staging, and production. Each environment has its own configuration, endpoints, secrets, and infrastructure settings. This template helps teams document those settings in one place, making onboarding, debugging, and disaster recovery easier.

## When to Use

- Setting up a new application or service.
- Onboarding a new team member or contractor.
- Preparing a deployment or migration plan.
- Troubleshooting environment-specific bugs.
- Auditing configuration drift between environments.
- Creating a runbook for incident response.

## Prerequisites

- Access to the deployment platform or cloud console.
- A list of services, databases, and third-party integrations the application uses.
- Permission to view secrets and credentials, or a secure handoff process.
- A naming convention for environment variables and configuration keys.
- An understanding of compliance and security requirements for each environment.

## Solution

### Template

#### 1. Environment Identification

| Field | Description | Example |
|-------|-------------|---------|
| Application / Service | Name of the system | `Payment API` |
| Environment | dev, staging, production, etc. | `production` |
| Region / Zone | Geographic deployment | `us-east-1` |
| Cluster / Instance | Where the app runs | `prod-k8s-cluster-01` |
| Version deployed | Current release | `v2.4.1` |
| Owner | Team responsible | `Payments team` |
| Last reviewed | Date of last update | `2026-06-27` |

#### 2. Core Environment Variables

| Variable | Purpose | dev Value | staging Value | production Value | Secret |
|----------|---------|-----------|---------------|------------------|--------|
| `APP_ENV` | Runtime environment | `development` | `staging` | `production` | No |
| `LOG_LEVEL` | Logging verbosity | `debug` | `info` | `warn` | No |
| `API_PORT` | Port the service listens on | `8080` | `8080` | `443` | No |
| `DATABASE_URL` | Connection string for primary database | `postgres://dev-db` | `postgres://staging-db` | `postgres://prod-db` | Yes |
| `REDIS_URL` | Cache connection string | `redis://dev-redis` | `redis://staging-redis` | `redis://prod-redis` | Yes |
| `JWT_SECRET` | Secret for token signing | `dev-secret` | `staging-secret` | `prod-secret` | Yes |
| `EXTERNAL_API_KEY` | Key for third-party integration | `test-key` | `test-key` | `live-key` | Yes |
| `FEATURE_FLAG_X` | Toggle for new feature | `true` | `true` | `false` | No |

#### 3. Service Endpoints

| Service | Environment | URL / Host | Port | Protocol | Notes |
|---------|-------------|------------|------|----------|-------|
| Application | production | `api.payments.example.com` | `443` | HTTPS | Behind load balancer |
| Database | production | `prod-db.internal.example.com` | `5432` | PostgreSQL | Private subnet |
| Cache | production | `prod-redis.internal.example.com` | `6379` | Redis | Private subnet |
| Message queue | production | `prod-rabbit.internal.example.com` | `5672` | AMQP | Private subnet |
| Object storage | production | `s3://prod-payments-data` | `443` | HTTPS | Encrypted at rest |

#### 4. Infrastructure Settings

| Resource | dev | staging | production | Notes |
|----------|-----|---------|------------|-------|
| Compute | 1 small container | 2 medium containers | 4 large containers | Auto-scaling in production |
| CPU / memory | 0.5 vCPU / 1 GB | 1 vCPU / 2 GB | 2 vCPU / 4 GB | Per container |
| Database | Shared dev instance | Single staging instance | Multi-AZ cluster | With read replicas in production |
| Cache | Single dev node | Single staging node | Clustered production | Redis cluster mode |
| Storage | Standard class | Standard class | Infrequent access tier | Lifecycle policy applied |
| Network | Public for dev tools | Private subnet | Private subnet + NAT | VPN access required |

#### 5. Secrets and Credentials

| Secret Name | Used By | Storage Location | Rotation Schedule | Last Rotated |
|-------------|---------|------------------|-------------------|--------------|
| `DATABASE_PASSWORD` | Application | AWS Secrets Manager | Quarterly | `2026-06-01` |
| `JWT_SECRET` | Application | HashiCorp Vault | Quarterly | `2026-06-01` |
| `EXTERNAL_API_KEY` | Integration service | Azure Key Vault | On vendor rotation | `2026-05-15` |
| `TLS_CERTIFICATE` | Load balancer | AWS ACM | Annual | `2026-04-20` |

#### 6. Configuration Change Log

| Date | Change | Author | Reason | Approved By |
|------|--------|--------|--------|-------------|
| 2026-06-10 | Increased production cache cluster size | `alice@example.com` | Prepare for flash sale | `bob@example.com` |
| 2026-05-22 | Added `FEATURE_FLAG_X` | `carol@example.com` | Roll out new checkout flow | `dave@example.com` |
| 2026-05-01 | Rotated database credentials | `platform-team` | Quarterly rotation | `security-team` |

## Explanation

A single source of truth for environment configuration reduces confusion and mistakes. When variables, endpoints, and secrets are documented, teams can deploy faster, debug issues across environments, and recover from incidents without guessing. The template also helps identify differences between environments, which is a common source of production bugs.

## Variants

- **Microservices environment configuration**: One document per service with cross-service endpoint references.
- **Infrastructure-as-Code environment configuration**: Links to Terraform or CloudFormation variables files.
- **Container environment configuration**: Focus on Docker compose, Kubernetes ConfigMaps, and Secrets.
- **Serverless environment configuration**: Document function-level variables, API Gateway settings, and event sources.
- **Mobile app environment configuration**: Document backend endpoints, API keys, and feature flags per build variant.
- **Database environment configuration**: Focus on connection strings, replica endpoints, and backup settings.

## What works

- Keep secrets out of version control and store them in a secure vault.
- Use the same variable names across environments where possible.
- Document why a value differs between environments.
- Review and update the document after every major deployment or infrastructure change.
- Separate sensitive values from non-sensitive configuration.
- Automate the generation of this document from infrastructure-as-code when possible.
- Use a consistent naming convention for environment variables.
- Include contact information for the environment owner.

## Common Mistakes

- Hard-coding environment-specific values in source code.
- Storing secrets in plain text or unencrypted files.
- Not updating the document after configuration changes.
- Using different variable names for the same concept in different environments.
- Mixing configuration for multiple environments in one file.
- Omitting the reason for environment differences.
- Not including third-party service endpoints or credentials.

## FAQs

### Should we store secrets in this document?

No. Store secret names and rotation schedules here, but keep actual values in a secure vault. This document should reference where to find secrets, not contain them.

### How do we keep this document up to date?

Assign an owner and review the document after each deployment, infrastructure change, or quarterly. Link it to the change management process.

### What is the difference between environment variables and configuration files?

Environment variables are typically used for values that change between environments or are sensitive. Configuration files are better for stable, structured settings that can be versioned.
