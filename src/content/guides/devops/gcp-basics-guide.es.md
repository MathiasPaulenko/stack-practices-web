---
contentType: guides
slug: gcp-basics-guide
title: "GCP Básico — Servicios Core para Desarrolladores"
description: "Guía práctica de servicios core de Google Cloud Platform para desarrolladores: compute, storage, bases de datos, networking y data analytics con ejemplos hands-on."
metaDescription: "Aprende servicios core de GCP para desarrolladores: Compute Engine, Cloud Storage, Cloud SQL, Cloud Run, BigQuery. Guía práctica para aplicaciones cloud."
difficulty: beginner
topics:
  - devops
  - infrastructure
  - cloud
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
  - guia
relatedResources:
  - /guides/terraform-best-practices-guide
  - /guides/kubernetes-advanced-guide
  - /guides/aws-basics-guide
  - /guides/azure-basics-guide
  - /recipes/devops/deploy-static-site-gcp
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Aprende servicios core de GCP para desarrolladores: Compute Engine, Cloud Storage, Cloud SQL, Cloud Run, BigQuery. Guía práctica para aplicaciones cloud."
  keywords:
    - gcp
    - google-cloud
    - cloud-computing
    - compute-engine
    - cloud-storage
    - cloud-sql
    - cloud-run
    - bigquery
    - guia
---

## Overview

Google Cloud Platform (GCP) es conocido por su liderazgo en data analytics, AI/ML y Kubernetes. Construido sobre la misma infraestructura que potencia Google Search y YouTube, GCP ofrece a desarrolladores herramientas poderosas para compute, storage, bases de datos y big data. Esta guía cubre los servicios core que necesitas para construir y desplegar aplicaciones en GCP.

## When to Use

- Necesitas servicios de data analytics y AI/ML de clase mundial
- Estás construyendo aplicaciones containerizadas o serverless
- Quieres integración profunda con herramientas open-source (Kubernetes, TensorFlow, Apache Beam)
- Tus workloads se benefician de la red global de Google y su modelo de pricing

## Compute — GCE, GKE y Cloud Run

### Compute Engine (GCE)

Virtual machines con sizing flexible y pricing (descuentos por uso sostenido, committed use discounts).

```bash
# Crear una instancia VM
gcloud compute instances create my-vm \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB
```

| Familia de Máquina | Caso de Uso |
|--------------------|-------------|
| E2 | Propósito general optimizado en costo |
| N2/N2D | Balance entre rendimiento y costo |
| C2/C2D | Workloads intensivos en compute |
| M1/M2 | Intensivos en memoria (ultramem) |

### Google Kubernetes Engine (GKE)

Kubernetes gestionado con modos autopilot y standard.

```bash
# Crear un cluster GKE
gcloud container clusters create my-cluster \
  --zone=us-central1-a \
  --num-nodes=3 \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=10

# Desplegar una aplicación
kubectl create deployment hello-app --image=gcr.io/project/hello-app:v1
kubectl expose deployment hello-app --type=LoadBalancer --port=80
```

### Cloud Run

Containers serverless: despliega cualquier aplicación containerizada sin gestionar servidores.

```bash
# Desplegar un container a Cloud Run
gcloud run deploy hello-service \
  --image=gcr.io/project/hello-app:v1 \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated
```

Cloud Run escala automáticamente a cero y maneja HTTPS termination.

## Storage — Cloud Storage y Persistent Disks

### Cloud Storage

Storage de objetos unificado con caching global de edge.

```bash
# Crear un bucket
gsutil mb -l us-central1 gs://my-app-bucket

# Subir un archivo
gsutil cp app.zip gs://my-app-bucket/builds/

# Hacer público (con precaución)
gsutil iam ch allUsers:objectViewer gs://my-app-bucket
```

| Clase | Caso de Uso | Almacenamiento Mínimo |
|-------|-------------|----------------------|
| Standard | Acceso frecuente | Ninguno |
| Nearline | Acceso mensual | 30 días |
| Coldline | Acceso trimestral | 90 días |
| Archive | Acceso anual | 365 días |

### Persistent Disks

Block storage para Compute Engine y GKE.

```bash
# Crear y adjuntar un disco
gcloud compute disks create my-disk --size=100GB --type=pd-ssd --zone=us-central1-a
gcloud compute instances attach-disk my-vm --disk=my-disk --zone=us-central1-a
```

| Tipo de Disco | IOPS | Throughput | Caso de Uso |
|---------------|------|------------|-------------|
| pd-standard | 500 | 120 MB/s | Boot disks, bajo I/O |
| pd-balanced | 15,000 | 240 MB/s | Propósito general |
| pd-ssd | 30,000 | 480 MB/s | Bases de datos, alto I/O |
| pd-extreme | 120,000 | 2,200 MB/s | SAP, HPC |

## Bases de Datos — Cloud SQL, Firestore y BigQuery

### Cloud SQL

PostgreSQL, MySQL y SQL Server gestionados con backups automatizados y réplicas.

```bash
# Crear una instancia PostgreSQL
gcloud sql instances create mydb \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-size=10GB

gcloud sql databases create myapp --instance=mydb
```

### Firestore

Base de datos NoSQL serverless con sync en tiempo real y SDKs mobile.

```javascript
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const db = getFirestore();
await setDoc(doc(db, 'users', 'user-1'), { name: 'Alice', email: 'alice@example.com' });
```

### BigQuery

Data warehouse serverless para analytics a escala petabyte.

```sql
-- Query dataset público
SELECT
  name,
  SUM(number) AS total_births
FROM `bigquery-public-data.usa_names.usa_1910_2013`
WHERE gender = 'F'
GROUP BY name
ORDER BY total_births DESC
LIMIT 10;
```

## Networking — VPC

Global Virtual Private Cloud con routing automático.

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

Features clave de networking:
- **Cloud Load Balancing:** Global, anycast-based load balancing
- **Cloud CDN:** Content delivery con 140+ edge locations
- **Cloud Armor:** Protección DDoS y WAF
- **Private Service Connect:** Acceso seguro a servicios gestionados

## Seguridad — IAM y Cloud KMS

Identity and Access Management con políticas basadas en recursos.

```yaml
bindings:
  - members:
      - serviceAccount:my-app@project.iam.gserviceaccount.com
    role: roles/storage.objectViewer
  - members:
      - serviceAccount:my-app@project.iam.gserviceaccount.com
    role: roles/cloudsql.client
```

Mejores prácticas:
- Usa service accounts, no credenciales de usuario
- Habilita VPC Service Controls para prevención de exfiltración de datos
- Usa Cloud KMS para key management y encryption
- Habilita Cloud Audit Logs para todos los servicios

## Errores Comunes

- **Usar VPC default sin segmentación** — crea networks custom con subnets por environment
- **Sobreaprovisionar Compute Engine** — usa recomendaciones de rightsizing
- **Ignorar costos de egress** — transferencia de datos entre regiones es cara
- **No usar Cloud NAT para instancias privadas** — instancias privadas necesitan internet outbound para updates
- **Guardar secrets en variables de entorno** — usa Secret Manager en su lugar

## FAQ

**¿Es GCP gratis?**
GCP ofrece un Free Tier con 300 USD de crédito por 90 días y límites always-free en Compute Engine, Cloud Storage y BigQuery.

**¿GCP vs AWS vs Azure?**
- GCP: Mejor para data analytics, AI/ML, Kubernetes, open-source
- AWS: Servicios más amplios, ecosistema más grande
- Azure: Mejor para integración Microsoft, cloud híbrido

**¿Cómo despliego desde GitHub?**
Usa Cloud Build triggers conectados a repositorios GitHub, o GitHub Actions con `google-github-actions/setup-gcloud` y `google-github-actions/deploy-cloudrun`.
