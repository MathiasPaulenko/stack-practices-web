---
contentType: docs
slug: kafka-topic-naming-convention-template
templateType: guideline
title: "Kafka Topic Naming Convention Template"
description: "Template for standardizing Kafka topic names across teams: naming patterns, environment prefixes, domain segmentation, event type suffixes, partition count rules, and retention policies with examples."
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
  - /docs/messaging/rabbitmq-queue-design-template
  - /docs/messaging/message-schema-evolution-policy
  - /docs/messaging/dead-letter-queue-runbook
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

This template defines naming conventions for Kafka topics across an organization. Consistent topic naming enables discoverability, prevents collisions between teams, simplifies ACL management, and makes monitoring and debugging easier.

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

- Use **lowercase** only
- Use **hyphens** (`-`) to separate words within a component
- Use **dots** (`.`) to separate components
- Maximum **249 characters** (Kafka limit)
- No spaces, underscores, or special characters
- Start with environment, end with event-type or version

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

- Every topic MUST start with an environment prefix
- No cross-environment topic sharing (use MirrorMaker for replication)
- Environment prefixes align with Kafka cluster boundaries
- Dev topics have shorter retention (24h) to save resources

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
1. Propose domain name in architecture review
2. Verify no collision with existing domains
3. Document domain ownership (team, on-call)
4. Add to domain registry (Confluence or wiki)
5. Create ACL templates for the new domain
6. Announce to #kafka-governance channel
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
# Event — something that HAS happened (past tense, immutable)
prod.orders.order-created.v1
prod.payments.payment-processed.v1

# Command — something you WANT to happen (imperative, may fail)
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

- Start with fewer partitions (can only increase, never decrease)
- Partition count should match consumer parallelism needs
- Each partition adds overhead to the broker (more partitions = more files)
- Maximum 100 partitions per topic without platform team approval
- Replication factor: 3 for prod, 2 for staging, 1 for dev

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
# Set retention for a topic
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics \
  --entity-name prod.orders.order-created.v1 \
  --alter \
  --add-config retention.ms=604800000,retention.bytes=1073741824

# Set compaction for snapshot topics
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
# Producer ACL — only producing team can write
kafka-acls.sh --bootstrap-server localhost:9092 \
  --add --allow-principal User:CN=orders-service \
  --producer --topic "prod.orders.order-created.v1"

# Consumer ACL — consuming team can read
kafka-acls.sh --bootstrap-server localhost:9092 \
  --add --allow-principal User:CN=analytics-service \
  --consumer --topic "prod.orders.order-created.v1" \
  --group "analytics-consumer-group"

# Wildcard ACL for domain (all topics under orders domain)
kafka-acls.sh --bootstrap-server localhost:9092 \
  --add --allow-principal User:CN=orders-service \
  --producer --topic "prod.orders.>"
```

### 7.2 Rules

- Only the owning team has producer ACLs
- Consumer ACLs are granted per consumer group
- No cluster-wide wildcard ACLs in production
- Review ACLs quarterly
- Use Kafka User ACLs, not IP-based rules

---

## 8. Topic Creation Process

### 8.1 Request Workflow

```text
1. Submit topic request ticket with:
   - Topic name (following convention)
   - Expected throughput (msg/s)
   - Expected message size (KB)
   - Retention requirements
   - Partition count (with justification)
   - Owning team
   - Consumer teams

2. Platform team reviews request
3. Topic created via Terraform/Ansible (not manual)
4. ACLs applied
5. Topic registered in catalog
6. Requester notified
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

## FAQ

### What if I need to rename a topic?

Kafka does not support topic renaming. You must create a new topic with the correct name, dual-produce to both topics during a migration period, switch consumers to the new topic, then decommission the old topic. Plan for a 2-4 week migration window. Use MirrorMaker 2 if cross-cluster replication is needed during the migration.

### How do I version topics when the schema changes?

For backward-compatible schema changes (adding optional fields), keep the same topic name and update the schema in the schema registry. For breaking changes (removing fields, changing types), create a new topic with an incremented version suffix (e.g., `v1` to `v2`). Dual-produce during migration, switch consumers gradually, then decommission the old topic.

### Can I use a single topic for multiple event types?

Avoid it. Mixing event types in one topic complicates consumer logic, prevents independent retention policies, and makes monitoring harder. Use separate topics per event type. If you must share a topic, use a header or field to distinguish event types and document it clearly.

### How many partitions should I start with?

Start with the minimum that meets your consumer parallelism needs. You can always add partitions later, but you cannot remove them. Adding partitions breaks key-based ordering for existing keys. A common starting point is 3-6 partitions for most topics. For high-throughput topics (> 10K msg/s), start with 12.

### What retention should I set for replay-able topics?

For topics that consumers may need to replay (e.g., for bug fixes or new consumers), set retention to 7-30 days. For snapshot topics with compaction, retention is infinite since compaction keeps only the latest value per key. For audit topics, set retention to 365 days or use Kafka's log compaction with delete to keep only recent records.
