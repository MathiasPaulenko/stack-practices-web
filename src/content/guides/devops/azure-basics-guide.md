---
contentType: guides
slug: azure-basics-guide
title: "Azure Basics — Core Services for Developers"
description: "A practical guide to Microsoft Azure core services for developers: compute, storage, databases, networking, and identity with hands-on examples."
metaDescription: "Learn Azure core services for developers: VMs, App Service, Blob Storage, Azure SQL, Functions. Practical guide for building cloud applications."
difficulty: beginner
topics:
  - devops
  - infrastructure
  - cloud
tags:
  - azure
  - cloud-computing
  - azure-functions
  - azure-sql
  - blob-storage
  - app-service
  - active-directory
  - guide
relatedResources:
  - /guides/terraform-best-practices-guide
  - /guides/kubernetes-advanced-guide
  - /guides/aws-basics-guide
  - /recipes/devops/deploy-static-site-azure
  - /recipes/infrastructure/create-azure-storage-account
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Learn Azure core services for developers: VMs, App Service, Blob Storage, Azure SQL, Functions. Practical guide for building cloud applications."
  keywords:
    - azure
    - cloud-computing
    - azure-functions
    - azure-sql
    - blob-storage
    - app-service
    - active-directory
    - guide
---

## Overview

Microsoft Azure is the second-largest cloud platform, deeply integrated with enterprise tools like Microsoft 365, Active Directory, and .NET. For developers, Azure offers a comprehensive set of services for compute, storage, databases, networking, and identity management. This guide covers the services you will use most frequently and how they connect in a typical application architecture.

## When to Use

- Your organization uses Microsoft technologies (.NET, Office 365, Active Directory)
- You need hybrid cloud capabilities
- You want tight integration with CI/CD pipelines (Azure DevOps, GitHub Actions)
- You are building enterprise applications with strong identity requirements

## Compute — VMs, App Service, and Functions

### Azure Virtual Machines

IaaS with full control over the OS and environment.

```bash
# Create a VM with Azure CLI
az vm create \
  --resource-group myResourceGroup \
  --name myVM \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys
```

| VM Series | Use Case |
|-----------|----------|
| B-series | Burstable, cost-effective dev/test |
| D-series | General purpose production |
| F-series | Compute-optimized |
| E-series | Memory-optimized |

### App Service

PaaS for web apps, APIs, and mobile backends. Supports .NET, Java, Node.js, Python, and PHP.

```bash
# Create a web app
az webapp create \
  --resource-group myResourceGroup \
  --plan myAppPlan \
  --name my-webapp-123 \
  --runtime "NODE|18-lts"
```

Features: auto-scaling, deployment slots, custom domains, managed certificates, and built-in CI/CD.

### Azure Functions

Serverless compute that runs code in response to triggers.

```csharp
[FunctionName("HttpTrigger")]
public static IActionResult Run(
    [HttpTrigger(AuthorizationLevel.Function, "get", Route = null)] HttpRequest req)
{
    return new OkObjectResult("Hello from Azure Functions");
}
```

## Storage — Blob, Queue, and Table

### Blob Storage

Object storage for unstructured data: files, images, backups, and logs.

```bash
# Create a storage account and container
az storage account create --name mystorage123 --sku Standard_LRS
az storage container create --name uploads --account-name mystorage123

# Upload a file
az storage blob upload --container-name uploads --file report.pdf --name report.pdf
```

| Tier | Use Case |
|------|----------|
| Hot | Frequently accessed data |
| Cool | Infrequently accessed, stored ≥ 30 days |
| Archive | Rarely accessed, stored ≥ 180 days |

### Queue Storage

Simple message queuing for decoupling components.

```python
from azure.storage.queue import QueueServiceClient

queue = QueueServiceClient.from_connection_string(conn_str).get_queue_client("tasks")
queue.send_message("process-order-123")
message = queue.receive_message()
```

## Databases — Azure SQL and Cosmos DB

### Azure SQL

Managed SQL Server with auto-scaling, backups, and high availability.

```bash
# Create a server and database
az sql server create --name myserver --admin-user sqladmin --admin-password Password123!
az sql db create --server myserver --name mydb --service-objective S0
```

### Cosmos DB

Globally distributed NoSQL database with multiple APIs (SQL, MongoDB, Cassandra, Gremlin, Table).

```python
from azure.cosmos import CosmosClient

client = CosmosClient(url, credential=key)
database = client.create_database_if_not_exists("mydb")
container = database.create_container_if_not_exists("users", partition_key="/id")
container.upsert_item({"id": "user-1", "name": "Alice"})
```

## Networking — VNet

Virtual Network isolates and secures your Azure resources.

```
┌─────────────────────────────────────────────┐
│                   VNet                        │
│  ┌─────────────┐    ┌─────────────────────┐ │
│  │  Subnet A   │    │     Subnet B        │ │
│  │  ┌───────┐  │    │  ┌───────┐ ┌─────┐ │ │
│  │  │  VM   │  │    │  │ VM    │ │ SQL │ │ │
│  │  └───┬───┘  │    │  └───┬───┘ └──┬──┘ │ │
│  │      │      │    │      │        │    │ │
│  │  Public IP   │    │   Private Link     │ │
│  │  (inbound)   │    │   (no inbound)     │ │
│  └──────────────┘    └────────────────────┘ │
└─────────────────────────────────────────────┘
```

Key networking services:
- **VNet Peering:** Connect networks across regions
- **Private Link:** Securely access PaaS services over private IP
- **Application Gateway:** Layer 7 load balancer with WAF
- **Azure Firewall:** Managed network and application-level protection

## Identity — Azure AD

Azure Active Directory (now Entra ID) provides authentication and authorization.

```json
{
  "issuer": "https://login.microsoftonline.com/{tenant}/v2.0",
  "audience": "{client-id}",
  "claims": {
    "roles": ["Reader", "Contributor"]
  }
}
```

Best practices:
- Use Managed Identity for service-to-service authentication
- Enable Conditional Access policies
- Use RBAC at the resource group level
- Integrate with GitHub for OIDC-based deployments

## Common Mistakes

- **Using a single region** — deploy across availability zones for resilience
- **Not using managed identities** — service principals with secrets expire and leak
- **Ignoring cost management** — Azure Cost Management + budgets are essential
- **Over-provisioning VMs** — right-size with Azure Advisor recommendations
- **Exposing databases publicly** — always use Private Link or firewall rules

## FAQ

**Is Azure free?**
Azure offers a Free Tier: 12 months of select services + 200 USD credit for 30 days. Some services are always free within limits.

**Azure vs AWS vs GCP?**
- Azure: Best for Microsoft-centric enterprises, hybrid cloud
- AWS: Broadest service catalog, largest market share
- GCP: Best for data analytics, AI/ML, Kubernetes

**How do I deploy from GitHub?**
Use Azure App Service deployment center or GitHub Actions with `azure/login` and `azure/webapps-deploy` actions.
