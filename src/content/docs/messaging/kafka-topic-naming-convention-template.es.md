---


contentType: docs
slug: kafka-topic-naming-convention-template
templateType: guideline
title: "Plantilla de Convencion de Naming de Kafka Topics"
description: "Plantilla para estandarizar nombres de Kafka topics across teams: naming patterns, environment prefixes, domain segmentation, event type suffixes, partition count rules y retention policies con ejemplos."
metaDescription: "Kafka topic naming convention template: environment prefixes, domain names, event type suffixes, partition rules, retention policies with examples."
difficulty: intermediate
topics:
  - messaging
tags:
  - kafka
  - naming-convention
  - messaging
  - topics
  - governance
  - event-streaming
relatedResources:
  - /docs/rabbitmq-queue-design-template
  - /docs/message-schema-evolution-policy
  - /docs/dead-letter-queue-runbook
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Kafka topic naming convention template: environment prefixes, domain names, event type suffixes, partition rules, retention policies with examples."
  keywords:
    - kafka topic naming
    - topic naming convention
    - kafka governance
    - event streaming
    - topic design
    - kafka partitions
    - kafka retention


---

## Overview

Esta plantilla define naming conventions para Kafka topics across una organization. Consistent topic naming enablea discoverability, previene collisions entre teams, simplifica ACL management y hace monitoring y debugging easier.

---

## 1. Naming Pattern

### 1.1 Standard Format

```text
<environment>.<domain>.<entity>.<event-type>[.<version>]

Components:
  environment  — dev, staging, prod (required)
  domain       — business domain (required)
  entity       — entity or aggregate root (required)
  event-type   — event, command, snapshot, dlq (required)
  version      — v1, v2, v3 (optional, for schema evolution)
```

### 1.2 Examples

```text
prod.orders.order-created.v1
prod.orders.order-cancelled.v1
prod.payments.payment-processed.v1
prod.users.user-signed-up.v1
prod.inventory.stock-updated.v1
staging.orders.order-created.v1
dev.users.user-signed-up.v2

# Dead letter queues
prod.orders.order-created.dlq

# Compact topics (snapshots)
prod.users.user-profile.snapshot
prod.inventory.product-catalog.snapshot
```

### 1.3 Rules

- Usa **lowercase** only
- Usa **hyphens** (`-`) para separate words within a component
- Usa **dots** (`.`) para separate components
- Maximum **249 characters** (Kafka limit)
- No spaces, underscores o special characters
- Empieza con environment, termina con event-type o version

---

## 2. Environment Prefixes

### 2.1 Standard Environments

```text
Prefix     | Environment | Purpose
───────────┼─────────────┼──────────────────────────────
dev        | Development | Local dev, feature branches
staging    | Staging     | Pre-production testing
prod       | Production  | Live traffic
sandbox    | Sandbox     | Experimentation, demos
```

### 2.2 Rules

- Every topic DEBE empezar con un environment prefix
- No cross-environment topic sharing (usa MirrorMaker para replication)
- Environment prefixes alinean con Kafka cluster boundaries
- Dev topics tienen shorter retention (24h) para save resources

---

## 3. Domain Segmentation

### 3.1 Domain List

```text
Domain         | Description              | Example entities
───────────────┼──────────────────────────┼──────────────────────
orders         | Order management         | order, cart, checkout
payments       | Payment processing       | payment, refund, invoice
users          | User identity            | user, profile, session
inventory      | Product catalog          | product, stock, sku
shipping       | Fulfillment              | shipment, delivery, tracking
notifications  | Messaging and alerts     | email, sms, push
analytics      | Event analytics          | click, view, conversion
audit          | Compliance audit trail   | action, change, access
```

### 3.2 Adding New Domains

```text
1. Propose domain name en architecture review
2. Verifica no collision con existing domains
3. Documenta domain ownership (team, on-call)
4. Add al domain registry (Confluence o wiki)
5. Crea ACL templates para el new domain
6. Anuncia en #kafka-governance channel
```

---

## 4. Event Type Suffixes

### 4.1 Standard Suffixes

```text
Suffix      | Meaning              | Retention    | Compaction
────────────┼──────────────────────┼──────────────┼───────────
event       | Domain event (fact)  | 7-30 days    | No
command     | Command (intent)     | 3-7 days     | No
snapshot    | Current state        | Indefinite   | Yes (compact)
dlq         | Dead letter queue    | 7 days       | No
audit       | Audit trail          | 365 days     | No
metric      | Operational metric   | 3 days       | No
```

### 4.2 Event vs Command

```text
# Event — algo que HA pasado (past tense, immutable)
prod.orders.order-created.v1
prod.payments.payment-processed.v1

# Command — algo que QUIERES que pase (imperative, may fail)
prod.orders.cancel-order.v1
prod.payments.process-refund.v1
```

---

## 5. Partition Count

### 5.1 Sizing Guidelines

```text
Expected throughput (msg/s) | Partitions | Notes
────────────────────────────┼────────────┼────────────────────────
< 100                       | 1          | Single partition is fine
100 - 1,000                 | 3          | Allow parallel consumers
1,000 - 10,000              | 6          | Multiple consumer groups
10,000 - 100,000            | 12         | High throughput
> 100,000                   | 24+        | Consult platform team
```

### 5.2 Rules

- Empieza con fewer partitions (solo puedes increase, nunca decrease)
- Partition count debe matchear consumer parallelism needs
- Cada partition addea overhead al broker (mas partitions = mas files)
- Maximum 100 partitions per topic sin platform team approval
- Replication factor: 3 para prod, 2 para staging, 1 para dev

---

## 6. Retention Policies

### 6.1 Standard Retention

```text
Topic type       | Retention     | Size limit   | Compaction
─────────────────┼───────────────┼──────────────┼───────────
event            | 7 days        | 1 GB         | No
command          | 3 days        | 500 MB       | No
snapshot         | Infinite      | No limit     | Yes (compact)
dlq              | 7 days        | 500 MB       | No
audit            | 365 days      | 10 GB        | No
metric           | 3 days        | 500 MB       | No
```

### 6.2 Custom Retention

```bash
# Setea retention para un topic
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics \
  --entity-name prod.orders.order-created.v1 \
  --alter \
  --add-config retention.ms=604800000,retention.bytes=1073741824

# Setea compaction para snapshot topics
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics \
  --entity-name prod.users.user-profile.snapshot \
  --alter \
  --add-config cleanup.policy=compact,delete.retention.ms=86400000
```

---

## 7. Access Control

### 7.1 ACL Patterns

```bash
# Producer ACL — solo producing team puede write
kafka-acls.sh --bootstrap-server localhost:9092 \
  --add --allow-principal User:CN=orders-service \
  --producer --topic "prod.orders.order-created.v1"

# Consumer ACL — consuming team puede read
kafka-acls.sh --bootstrap-server localhost:9092 \
  --add --allow-principal User:CN=analytics-service \
  --consumer --topic "prod.orders.order-created.v1" \
  --group "analytics-consumer-group"

# Wildcard ACL para domain (all topics bajo orders domain)
kafka-acls.sh --bootstrap-server localhost:9092 \
  --add --allow-principal User:CN=orders-service \
  --producer --topic "prod.orders.>"
```

### 7.2 Rules

- Solo el owning team tiene producer ACLs
- Consumer ACLs se grantean per consumer group
- No cluster-wide wildcard ACLs en production
- Reviewea ACLs quarterly
- Usa Kafka User ACLs, no IP-based rules

---

## 8. Topic Creation Process

### 8.1 Request Workflow

```text
1. Sube topic request ticket con:
   - Topic name (siguiendo convention)
   - Expected throughput (msg/s)
   - Expected message size (KB)
   - Retention requirements
   - Partition count (con justification)
   - Owning team
   - Consumer teams

2. Platform team reviewea request
3. Topic se crea via Terraform/Ansible (no manual)
4. ACLs se aplican
5. Topic se registra en catalog
6. Requester se notifica
```

### 8.2 Terraform Example

```hcl
resource "kafka_topic" "order_created" {
  name               = "prod.orders.order-created.v1"
  replication_factor = 3
  partitions         = 6

  config = {
    "retention.ms"     = "604800000"   # 7 days
    "retention.bytes"  = "1073741824"  # 1 GB
    "cleanup.policy"   = "delete"
    "compression.type" = "snappy"
    "max.message.bytes" = "1048576"    # 1 MB
  }
}
```

---

## 9. Monitoring

### 9.1 Key Metrics

```text
Metric                    | Alert threshold        | Description
──────────────────────────┼────────────────────────┼──────────────────────
Under-replicated partitions| > 0 for 5 min         | Broker health issue
Consumer lag              | > 10,000 messages      | Consumer can't keep up
Bytes in/out per second   | > 80% of capacity      | Throughput saturation
Partition count per broker| > 4,000                | Broker overload risk
Offline partitions        | > 0                    | Critical — data unavailable
```

### 9.2 Grafana Dashboard Queries

```promql
# Consumer lag by topic
sum by (topic) (
  rate(kafka_consumergroup_lag_sum[5m])
)

# Bytes in per topic
sum by (topic) (
  rate(kafka_topic_bytes_in_per_sec[5m])
)

# Under-replicated partitions
sum by (broker) (
  kafka_cluster_under_replicated_partition
)
```

## Preguntas Frecuentes

### ¿Qué hago si necesito renamear un topic?

Kafka no soporta topic renaming. Debes crear un new topic con el correct name, dual-producir a ambos topics durante un migration period, switchea consumers al new topic, then decommissiona el old topic. Planea para un 2-4 week migration window. Usa MirrorMaker 2 si cross-cluster replication se necesita durante la migration.

### ¿Cómo versiono topics cuando el schema cambia?

Para backward-compatible schema changes (adding optional fields), keepea el same topic name y updateea el schema en el schema registry. Para breaking changes (removing fields, changing types), crea un new topic con un incremented version suffix (e.g., `v1` a `v2`). Dual-producir durante migration, switchea consumers gradually, then decommissiona el old topic.

### ¿Puedo usar un single topic para multiple event types?

Avoidalo. Mixing event types en un topic complica consumer logic, previene independent retention policies y hace monitoring harder. Usa separate topics per event type. Si debes share un topic, usa un header o field para distinguish event types y documentalo clearly.

### ¿Con cuantas partitions deberia empezar?

Empieza con el minimum que meetee tu consumer parallelism needs. Siempre puedes add partitions despues, pero no puedes removearlas. Adding partitions breakea key-based ordering para existing keys. Un common starting point es 3-6 partitions para most topics. Para high-throughput topics (> 10K msg/s), empieza con 12.

### ¿Qué retention deberia setear para replay-able topics?

Para topics que consumers pueden necesitar replay (e.g., para bug fixes o new consumers), setea retention a 7-30 days. Para snapshot topics con compaction, retention es infinite ya que compaction keepea solo el latest value per key. Para audit topics, setea retention a 365 days o usa Kafka's log compaction con delete para keepear solo recent records.

## See Also

- [Complete Guide to Kafka Stream Processing](/es/guides/complete-guide-kafka-stream-processing/)
- [Complete Guide to Apache Kafka in Production](/es/guides/complete-guide-kafka-production/)
- [Message Queues — RabbitMQ, Kafka, and SQS detailed analysis](/es/guides/message-queue-guide/)
- [Idempotent Consumer Pattern](/es/patterns/idempotent-consumer-pattern/)
- [Sequential Convoy Pattern](/es/patterns/sequential-convoy-pattern/)

