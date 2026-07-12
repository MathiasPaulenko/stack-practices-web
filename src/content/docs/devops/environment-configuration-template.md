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
  - /docs/deployment-checklist-template
  - /docs/cloud-resource-tagging-policy-template
  - /docs/zero-downtime-deployment-checklist
  - /recipes/istio-canary-deployment
  - /patterns/external-configuration-store-pattern
  - /guides/canary-deployment-guide
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


- For alternatives, see [Blue-Green Deployment](/guides/blue-green-deployment-guide/).

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

## Kubernetes ConfigMap and Secret Example

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  DATABASE_HOST: "db.production.svc.cluster.local"
  DATABASE_PORT: "5432"
  REDIS_URL: "redis://redis.production.svc.cluster.local:6379"
  LOG_LEVEL: "info"
  FEATURE_FLAGS: "checkout-v2,search-v3"
  API_RATE_LIMIT: "1000"
  CORS_ORIGINS: "https://app.example.com,https://admin.example.com"
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: production
type: Opaque
stringData:
  DATABASE_PASSWORD: "rotated-2026-06"
  JWT_SECRET: "rotated-2026-06"
  STRIPE_API_KEY: "sk_live_..."
  SENTRY_DSN: "https://..."
```

## Environment Comparison Matrix

| Variable | Development | Staging | Production | Notes |
|----------|-------------|---------|------------|-------|
| DATABASE_HOST | localhost | db.staging.svc | db.prod.svc | Different per env |
| DATABASE_PORT | 5432 | 5432 | 5432 | Same |
| LOG_LEVEL | debug | info | warn | More verbose in dev |
| API_RATE_LIMIT | 100 | 500 | 1000 | Scales with traffic |
| FEATURE_FLAGS | all | selective | conservative | Dev enables all |
| CORS_ORIGINS | * | staging.example.com | app.example.com | Restricted in prod |
| REDIS_URL | localhost:6379 | redis.staging:6379 | redis.prod:6379 | Different per env |
| SENTRY_DSN | disabled | staging DSN | prod DSN | Error tracking |

## Secret Rotation Schedule Template

```text
=== Secret Rotation Schedule ===

Database credentials:
  - Rotation frequency: Quarterly
  - Owner: Platform team
  - Method: AWS Secrets Manager auto-rotation
  - Last rotated: 2026-06-01
  - Next rotation: 2026-09-01

JWT signing key:
  - Rotation frequency: Every 6 months
  - Owner: Security team
  - Method: Manual with dual-key overlap
  - Last rotated: 2026-04-15
  - Next rotation: 2026-10-15

Stripe API key:
  - Rotation frequency: Annually
  - Owner: Finance engineering
  - Method: Manual via Stripe dashboard
  - Last rotated: 2026-01-10
  - Next rotation: 2027-01-10

Sentry DSN:
  - Rotation frequency: On team member departure
  - Owner: SRE team
  - Method: Manual via Sentry dashboard
```


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


### How do we manage configuration for multiple environments without duplication?

Use a base configuration file with environment-specific overrides. Tools like Helm values files, Kustomize overlays, or dotenv hierarchy (.env.base, .env.staging, .env.production) allow shared settings with per-environment deltas. Keep the base file in version control and store environment-specific secrets in a vault. Validate that all environments have the required variables in CI.

### What tools should we use for secret management?

HashiCorp Vault for self-hosted, AWS Secrets Manager or Parameter Store for AWS-native, Azure Key Vault for Azure, GCP Secret Manager for Google Cloud. For Kubernetes, use External Secrets Operator to sync from your vault to Kubernetes Secrets. Never store secrets in Git, environment files, or CI variables for production. Use short-lived credentials with automatic rotation where possible.

### How do we handle configuration for feature flags?

Use a dedicated feature flag tool (LaunchDarkly, Unleash, Flagsmith) for dynamic flags that change without deployment. For static flags tied to releases, use environment variables or config files. Document which features are enabled in each environment and why. Include flag status in the environment configuration document for visibility. Clean up flags after features are fully rolled out or deprecated.

### What is configuration drift and how do we prevent it?

Configuration drift happens when an environment's actual state differs from its documented state, usually due to manual changes. Prevent it by: making all changes through IaC (Terraform, CloudFormation), banning manual changes to production, running drift detection daily (terraform plan), and auto-remediating drift when detected. Document any emergency manual changes immediately and reconcile them in IaC within 24 hours.

### How do we bootstrap a new environment?

1. Create the environment in IaC with all required resources. 2. Generate or import secrets into the vault. 3. Deploy base infrastructure (networking, databases, cache). 4. Run smoke tests against all endpoints. 5. Verify monitoring and alerting are active. 6. Document the environment in the configuration matrix. 7. Assign an environment owner. 8. Schedule the first configuration review.


### How do we manage configuration for microservices?

Each microservice should have its own configuration document. Use a shared configuration service (Spring Cloud Config, Consul KV, or AWS AppConfig) for centralized management. Cross-service endpoints should be documented in a service registry. Use service mesh (Istio, Linkerd) for inter-service communication configuration. Keep environment variables per service and avoid sharing secrets across services.

### What is the 12-factor app approach to configuration?

The 12-factor app methodology recommends storing configuration in environment variables. This separates config from code, making the same build deployable across environments. However, for complex configurations, use a combination: environment variables for simple values, config files for structured settings, and a secrets manager for sensitive data. Never store configuration that changes between environments in the codebase.

### How do we version configuration changes?

Store non-sensitive configuration in Git alongside application code. Use semantic versioning for configuration releases. Tag configuration commits with the corresponding application version. For secrets, version the secret metadata (name, rotation date, owner) in Git while keeping values in the vault. Use configuration diff tools to show what changed between versions and when.

### How do we handle configuration for databases?

Document database connection strings as variable names (not values) in the environment configuration. Store actual connection strings in the secrets manager. Document connection pool settings, timeout values, and SSL requirements per environment. For read replicas, document the replica endpoint and failover procedure. Include database version, engine type, and backup configuration. Review database configuration after every schema migration or failover event.

### What is the difference between build-time and runtime configuration?

Build-time configuration is baked into the artifact at build time (e.g., feature flags compiled into the binary). Runtime configuration is read at startup or during execution (e.g., environment variables, config files). Prefer runtime configuration for values that change between environments. Use build-time configuration only for values that are truly constant across all environments. Document which configuration is build-time vs runtime to avoid confusion during debugging.

### How do we handle configuration for serverless functions?

Document function-level environment variables, timeout settings, memory allocation, and concurrency limits. For Lambda, use environment variables for non-sensitive config and AWS Secrets Manager for secrets. Document event source mappings (SQS, EventBridge, S3) and their configuration. Include IAM role ARNs and permission boundaries. Track function versions and aliases per environment.


Review environment configuration documents quarterly. Remove obsolete variables, update owner information, and verify that all documented endpoints are still active and reachable.








End of document. Review and update quarterly.