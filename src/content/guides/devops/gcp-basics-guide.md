---


contentType: guides
slug: gcp-basics-guide
title: "GCP Basics: Core Services for Developers"
description: "A practical guide to Google Cloud Platform core services for developers: compute, storage, databases, networking, and data analytics with hands-on examples."
metaDescription: "Learn GCP core services for developers: Compute Engine, Cloud Storage, Cloud SQL, Cloud Run, BigQuery. Practical guide for cloud applications."
difficulty: beginner
topics:
  - devops
  - infrastructure
  - data
tags:
  - gcp
  - google-cloud
  - cloud-computing
  - compute-engine
  - cloud-storage
  - cloud-sql
  - cloud-run
  - bigquery
  - guide
relatedResources:
  - /guides/terraform-best-practices-guide
  - /guides/kubernetes-advanced-guide
  - /guides/aws-basics-guide
  - /guides/azure-basics-guide
  - /guides/multi-cloud-guide
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Learn GCP core services for developers: Compute Engine, Cloud Storage, Cloud SQL, Cloud Run, BigQuery. Practical guide for cloud applications."
  keywords:
    - gcp
    - google-cloud
    - cloud-computing
    - compute-engine
    - cloud-storage
    - cloud-sql
    - cloud-run
    - bigquery
    - guide


---

## Overview

Google Cloud Platform (GCP) is known for its leadership in data analytics, AI/ML, and Kubernetes. Built on the same infrastructure that powers Google Search and YouTube, GCP offers developers capable tools for compute, storage, databases, and big data. Below is a practical guide to the core services you need to build and deploy applications on GCP.

## When to Use


- For alternatives, see [AWS Basics — Core Services for Developers](/guides/aws-basics-guide/).

- You need leading data analytics and AI/ML services
- You are building containerized or serverless applications
- You want deep integration with open-source tools (Kubernetes, TensorFlow, Apache Beam)
- Your workloads benefit from Google's global network and pricing model

## Compute: GCE, GKE, and Cloud Run

### Compute Engine (GCE)

Virtual machines with flexible sizing and pricing (sustained use discounts, committed use discounts).

```bash
# Create a VM instance
gcloud compute instances create my-vm \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB
```

| Machine Family | Use Case |
|----------------|----------|
| E2 | Cost-optimized general purpose |
| N2/N2D | Balanced performance and cost |
| C2/C2D | Compute-intensive workloads |
| M1/M2 | Memory-intensive (ultramem) |

### Google Kubernetes Engine (GKE)

Managed Kubernetes with autopilot and standard modes.

```bash
# Create a GKE cluster
gcloud container clusters create my-cluster \
  --zone=us-central1-a \
  --num-nodes=3 \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=10

# Deploy an application
kubectl create deployment hello-app --image=gcr.io/project/hello-app:v1
kubectl expose deployment hello-app --type=LoadBalancer --port=80
```

### Cloud Run

Serverless containers: deploy any containerized application without managing servers.

```bash
# Deploy a container to Cloud Run
gcloud run deploy hello-service \
  --image=gcr.io/project/hello-app:v1 \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated
```

Cloud Run automatically scales to zero and handles HTTPS termination.

## Storage: Cloud Storage and Persistent Disks

### Cloud Storage

Unified object storage with global edge caching.

```bash
# Create a bucket
gsutil mb -l us-central1 gs://my-app-bucket

# Upload a file
gsutil cp app.zip gs://my-app-bucket/builds/

# Make public (with caution)
gsutil iam ch allUsers:objectViewer gs://my-app-bucket
```

| Class | Use Case | Minimum Storage |
|-------|----------|---------------|
| Standard | Frequently accessed | None |
| Nearline | Monthly access | 30 days |
| Coldline | Quarterly access | 90 days |
| Archive | Yearly access | 365 days |

### Persistent Disks

Block storage for Compute Engine and GKE.

```bash
# Create and attach a disk
gcloud compute disks create my-disk --size=100GB --type=pd-ssd --zone=us-central1-a
gcloud compute instances attach-disk my-vm --disk=my-disk --zone=us-central1-a
```

| Disk Type | IOPS | Throughput | Use Case |
|-----------|------|------------|----------|
| pd-standard | 500 | 120 MB/s | Boot disks, low I/O |
| pd-balanced | 15,000 | 240 MB/s | General purpose |
| pd-ssd | 30,000 | 480 MB/s | Databases, high I/O |
| pd-extreme | 120,000 | 2,200 MB/s | SAP, HPC |

## Databases: Cloud SQL, Firestore, and BigQuery

### Cloud SQL

Managed PostgreSQL, MySQL, and SQL Server with automated backups and replicas.

```bash
# Create a PostgreSQL instance
gcloud sql instances create mydb \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-size=10GB

gcloud sql databases create myapp --instance=mydb
```

### Firestore

Serverless NoSQL document database with real-time sync and mobile SDKs.

```javascript
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const db = getFirestore();
await setDoc(doc(db, 'users', 'user-1'), { name: 'Alice', email: 'alice@example.com' });
```

### BigQuery

Serverless data warehouse for analytics at petabyte scale.

```sql
-- Query public dataset
SELECT
  name,
  SUM(number) AS total_births
FROM `bigquery-public-data.usa_names.usa_1910_2013`
WHERE gender = 'F'
GROUP BY name
ORDER BY total_births DESC
LIMIT 10;
```

## Networking: VPC

Global Virtual Private Cloud with automatic routing.

```
┌─────────────────────────────────────────────┐
│              Global VPC                       │
│  ┌─────────────┐    ┌─────────────────────┐ │
│  │  Subnet A   │    │     Subnet B        │ │
│  │  (us-east)  │    │     (europe-west)   │ │
│  │  ┌───────┐  │    │  ┌───────┐ ┌─────┐ │ │
│  │  │  VM   │  │    │  │  VM   │ │SQL  │ │ │
│  │  └───┬───┘  │    │  └───┬───┘ └──┬──┘ │ │
│  │      │      │    │      │        │    │ │
│  │  Cloud Load  │    │   Cloud NAT        │ │
│  │  Balancer    │    │   (egress only)    │ │
│  └──────────────┘    └────────────────────┘ │
└─────────────────────────────────────────────┘
```

Key networking capabilities:
- Cloud Load Balancing: Global, anycast-based load balancing
- Cloud CDN: Content delivery with 140+ edge locations
- Cloud Armor: DDoS protection and WAF
- Private Service Connect: Secure access to managed services

## Security: IAM and Cloud KMS

Identity and Access Management with resource-based policies.

```yaml
# IAM policy for a service account
bindings:
  - members:
      - serviceAccount:my-app@project.iam.gserviceaccount.com
    role: roles/storage.objectViewer
  - members:
      - serviceAccount:my-app@project.iam.gserviceaccount.com
    role: roles/cloudsql.client
```

What works:
- Use service accounts, not user credentials
- Enable VPC Service Controls for data exfiltration prevention
- Use Cloud KMS for key management and encryption
- Enable Cloud Audit Logs for all services

## Common Mistakes

- Using default VPC without segmentation. Create custom networks with subnets per environment
- Over-provisioning Compute Engine. Use rightsizing recommendations
- Ignoring egress costs. Data transfer between regions is expensive
- Not using Cloud NAT for private instances. Private instances need outbound internet for updates
- Storing secrets in environment variables. Use Secret Manager instead

## FAQ

### Is GCP free?

GCP offers a Free Tier with 300 USD credit for 90 days and always-free limits on Compute Engine, Cloud Storage, and BigQuery.

### GCP vs AWS vs Azure?

- GCP: Best for data analytics, AI/ML, Kubernetes, open-source
- AWS: Broadest services, largest ecosystem
- Azure: Best for Microsoft integration, hybrid cloud

### How do I deploy from GitHub?

Use Cloud Build triggers connected to GitHub repositories, or GitHub Actions with `google-github-actions/setup-gcloud` and `google-github-actions/deploy-cloudrun`.


## Advanced Topics

### Scenario: Web Architecture on GCP

```text
System: Scalable web app, multi-region
Requirements: 99.95% availability, auto-scaling, DR

Architecture:
  Cloud Load Balancing -> Cloud Run (multi-region)
    Region 1: us-central1
    Region 2: europe-west1

  Cloud Run -> Cloud SQL (regional HA)
  Cloud Run -> Firestore (multi-region)
  Cloud Run -> Memorystore Redis
  Cloud Run -> Cloud Storage (assets)

Key services:
  | Layer | Service | Configuration |
  |-------|---------|---------------|
  | DNS/Routing | Cloud Load Balancing | Global, HTTP(S) |
  | Compute | Cloud Run | 2 vCPU / 4GB, min 2 max 20 |
  | DB | Cloud SQL PostgreSQL | db-custom-4-15360, HA |
  | NoSQL | Firestore | multi-region nam-eur |
  | Cache | Memorystore Redis | Standard 1GB |
  | Storage | Cloud Storage | Standard + Nearline lifecycle |
  | Monitoring | Cloud Monitoring + Cloud Trace | |
  | Secrets | Secret Manager | |
  | CDN | Cloud CDN | Edge caches global |

Auto-scaling (Cloud Run):
  - Concurrency: 80 requests per instance
  - Min instances: 2 (warm), Max: 20
  - CPU > 70% -> scale out
  - Scale to zero in dev (cost savings)

Disaster Recovery:
  | Component | RPO | RTO | Strategy |
  |-----------|-----|-----|----------|
  | Cloud SQL | < 1min | < 1min | Regional HA (sync replica) |
  | Firestore | 0 | 0 | Multi-region |
  | Cloud Storage | 0 | 0 | Cross-region replication |
  | Cloud Run | 0 | < 30s | Multi-region LB failover |
  | Memorystore | < 1min | < 5min | Failover to replica |

Estimated costs (monthly):
  | Service | Cost |
  |---------|------|
  | Cloud Run (8 instances) | $800 |
  | Cloud SQL (4 vCPU HA) | $1,200 |
  | Firestore (1M reads/writes) | $200 |
  | Memorystore (1GB) | $150 |
  | Cloud Storage (1TB) | $25 |
  | Load Balancing + CDN | $200 |
  | Secret Manager | $30 |
  | Total | ~$2,600/month |

Lessons:
  - Cloud Run scales to zero: ideal for variable workloads
  - Cloud SQL HA gives RPO < 1min with synchronous replica
  - Firestore multi-region eliminates DR for NoSQL
  - Cloud CDN + Load Balancing is global and serverless
  - Secret Manager integrates with Cloud Run via service account
```

### How do I choose between Cloud Run and GKE?

Use Cloud Run for simple stateless services that do not need Kubernetes. It is serverless, scales to zero, and charges per use. Use GKE when you need full control: service mesh, Helm, operators, stateful workloads, or multiple services with complex networking. Cloud Run is simpler and cheaper; GKE is more flexible. Start with Cloud Run and migrate to GKE if needed.
