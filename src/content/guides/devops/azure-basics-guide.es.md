---
contentType: guides
slug: azure-basics-guide
title: "Azure Básico — Servicios Core para Desarrolladores"
description: "Guía práctica de servicios core de Microsoft Azure para desarrolladores: compute, storage, bases de datos, networking e identity con ejemplos hands-on."
metaDescription: "Aprende servicios core de Azure para desarrolladores: VMs, App Service, Blob Storage, Azure SQL, Functions. Guía práctica para construir aplicaciones cloud."
difficulty: beginner
topics:
  - devops
  - infrastructure
  - data
tags:
  - azure
  - cloud-computing
  - azure-functions
  - azure-sql
  - blob-storage
  - app-service
  - active-directory
  - guia
relatedResources:
  - /guides/terraform-best-practices-guide
  - /guides/kubernetes-advanced-guide
  - /guides/aws-basics-guide
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Aprende servicios core de Azure para desarrolladores: VMs, App Service, Blob Storage, Azure SQL, Functions. Guía práctica para construir aplicaciones cloud."
  keywords:
    - azure
    - cloud-computing
    - azure-functions
    - azure-sql
    - blob-storage
    - app-service
    - active-directory
    - guia
---

## Overview

Microsoft Azure es la segunda plataforma cloud más grande, profundamente integrada con herramientas empresariales como Microsoft 365, Active Directory y .NET. Para desarrolladores, Azure ofrece un conjunto completo de servicios para compute, storage, bases de datos, networking e identity management. Esta guía cubre los servicios que usarás más frecuentemente y cómo se conectan en una arquitectura de aplicación típica.

## When to Use

- Tu organización usa tecnologías Microsoft (.NET, Office 365, Active Directory)
- Necesitas capacidades de cloud híbrido
- Quieres integración estrecha con pipelines CI/CD (Azure DevOps, GitHub Actions)
- Estás construyendo aplicaciones enterprise con fuertes requisitos de identidad

## Compute — VMs, App Service y Functions

### Azure Virtual Machines

IaaS con control total del SO y entorno.

```bash
# Crear una VM con Azure CLI
az vm create \
  --resource-group myResourceGroup \
  --name myVM \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys
```

| Serie de VM | Caso de Uso |
|-------------|-------------|
| B-series | Burst, dev/test rentable |
| D-series | Propósito general productivo |
| F-series | Optimizada para compute |
| E-series | Optimizada para memoria |

### App Service

PaaS para web apps, APIs y backends mobile. Soporta .NET, Java, Node.js, Python y PHP.

```bash
# Crear una web app
az webapp create \
  --resource-group myResourceGroup \
  --plan myAppPlan \
  --name my-webapp-123 \
  --runtime "NODE|18-lts"
```

Features: auto-scaling, deployment slots, dominios custom, certificados gestionados y CI/CD built-in.

### Azure Functions

Compute serverless que ejecuta código en respuesta a triggers.

```csharp
[FunctionName("HttpTrigger")]
public static IActionResult Run(
    [HttpTrigger(AuthorizationLevel.Function, "get", Route = null)] HttpRequest req)
{
    return new OkObjectResult("Hello from Azure Functions");
}
```

## Storage — Blob, Queue y Table

### Blob Storage

Storage de objetos para datos no estructurados: archivos, imágenes, backups y logs.

```bash
# Crear storage account y container
az storage account create --name mystorage123 --sku Standard_LRS
az storage container create --name uploads --account-name mystorage123

# Subir un archivo
az storage blob upload --container-name uploads --file report.pdf --name report.pdf
```

| Tier | Caso de Uso |
|------|-------------|
| Hot | Datos accedidos frecuentemente |
| Cool | Datos poco frecuentes, almacenados ≥ 30 días |
| Archive | Datos raramente accedidos, almacenados ≥ 180 días |

### Queue Storage

Message queuing simple para desacoplar componentes.

```python
from azure.storage.queue import QueueServiceClient

queue = QueueServiceClient.from_connection_string(conn_str).get_queue_client("tasks")
queue.send_message("process-order-123")
message = queue.receive_message()
```

## Bases de Datos — Azure SQL y Cosmos DB

### Azure SQL

SQL Server gestionado con auto-scaling, backups y alta disponibilidad.

```bash
# Crear un servidor y base de datos
az sql server create --name myserver --admin-user sqladmin --admin-password Password123!
az sql db create --server myserver --name mydb --service-objective S0
```

### Cosmos DB

Base de datos NoSQL globalmente distribuida con múltiples APIs (SQL, MongoDB, Cassandra, Gremlin, Table).

```python
from azure.cosmos import CosmosClient

client = CosmosClient(url, credential=key)
database = client.create_database_if_not_exists("mydb")
container = database.create_container_if_not_exists("users", partition_key="/id")
container.upsert_item({"id": "user-1", "name": "Alice"})
```

## Networking — VNet

Virtual Network aísla y asegura tus recursos de Azure.

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

Servicios clave de networking:
- **VNet Peering:** Conectar networks entre regiones
- **Private Link:** Acceso seguro a servicios PaaS sobre IP privada
- **Application Gateway:** Load balancer Layer 7 con WAF
- **Azure Firewall:** Protección gestionada a nivel network y aplicación

## Identity — Azure AD

Azure Active Directory (ahora Entra ID) provee autenticación y autorización.

```json
{
  "issuer": "https://login.microsoftonline.com/{tenant}/v2.0",
  "audience": "{client-id}",
  "claims": {
    "roles": ["Reader", "Contributor"]
  }
}
```

Mejores prácticas:
- Usa Managed Identity para autenticación service-to-service
- Habilita Conditional Access policies
- Usa RBAC a nivel resource group
- Integra con GitHub para deployments OIDC

## Errores Comunes

- **Usar una sola región** — despliega across availability zones para resiliencia
- **No usar managed identities** — los service principals con secrets expiran y filtran
- **Ignorar cost management** — Azure Cost Management + budgets son esenciales
- **Sobreaprovisionar VMs** — right-size con recomendaciones de Azure Advisor
- **Exponer bases de datos públicamente** — siempre usa Private Link o firewall rules

## FAQ

**¿Es Azure gratis?**
Azure ofrece un Free Tier: 12 meses de servicios selectos + 200 USD de crédito por 30 días. Algunos servicios son siempre gratis dentro de límites.

**¿Azure vs AWS vs GCP?**
- Azure: Mejor para empresas Microsoft-centric, cloud híbrido
- AWS: Catálogo más amplio de servicios, mayor market share
- GCP: Mejor para data analytics, AI/ML, Kubernetes

**¿Cómo despliego desde GitHub?**
Usa Azure App Service deployment center o GitHub Actions con `azure/login` y `azure/webapps-deploy`.
