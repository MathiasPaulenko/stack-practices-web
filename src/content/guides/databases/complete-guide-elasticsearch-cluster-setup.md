---
contentType: guides
slug: complete-guide-elasticsearch-cluster-setup
title: "Complete Guide to Elasticsearch Cluster Setup"
description: "Deploy and scale Elasticsearch clusters. Covers node roles, sharding, replicas, index templates, mapping, snapshots, and production tuning for search at scale."
metaDescription: "Complete guide to Elasticsearch cluster setup. Deploy, configure node roles, sharding, replicas, index templates, mapping, snapshots and production tuning."
difficulty: advanced
topics:
  - databases
  - infrastructure
  - data
tags:
  - elasticsearch
  - search
  - cluster
  - sharding
  - opensearch
  - guide
  - databases
  - infrastructure
relatedResources:
  - /guides/databases/database-denormalization-guide
  - /guides/architecture/complete-guide-kafka-stream-processing
  - /guides/devops/deployment-strategies-guide
lastUpdated: "2026-07-02"
author: "StackPractices"
seo:
  metaDescription: "Complete guide to Elasticsearch cluster setup. Deploy, configure node roles, sharding, replicas, index templates, mapping, snapshots and production tuning."
  keywords:
    - elasticsearch cluster
    - elasticsearch setup
    - elasticsearch sharding
    - elasticsearch mapping
    - elasticsearch production
    - search cluster
    - index templates
---

# Complete Guide to Elasticsearch Cluster Setup

## Introduction

Elasticsearch is a distributed search and analytics engine. It handles full-text search, structured search, analytics, and vector search. Running it in production requires understanding node roles, sharding strategies, mapping, and cluster health. This guide covers cluster architecture, deployment, index management, mapping, snapshots, and production tuning.

## Cluster Architecture

### Node roles

```yaml
# elasticsearch.yml

# Master-eligible node — cluster state management
node.roles: [master]

# Data node — stores data, executes CRUD and search
node.roles: [data]

# Coordinating node — routing, query aggregation (no data, no master)
node.roles: []

# Ingest node — pre-process documents before indexing
node.roles: [data, ingest]

# Hot/warm architecture
node.roles: [data_hot]    # recent data, fast SSD
node.roles: [data_warm]   # older data, slower disks
node.roles: [data_cold]   # read-only, cheapest storage
```

### Minimal production cluster (3 nodes)

```yaml
# Node 1 — master + data (small clusters)
cluster.name: prod-es-cluster
node.name: node-1
network.host: 0.0.0.0
discovery.seed_hosts: ["node-1", "node-2", "node-3"]
cluster.initial_master_nodes: ["node-1", "node-2", "node-3"]
xpack.security.enabled: true
xpack.security.enrollment.enabled: true
```

### Dedicated master nodes (large clusters)

```yaml
# 3 dedicated master nodes (no data)
cluster.name: prod-es-cluster
node.name: master-1
node.roles: [master]
discovery.seed_hosts: ["master-1", "master-2", "master-3"]
cluster.initial_master_nodes: ["master-1", "master-2", "master-3"]

# Data nodes
node.name: data-1
node.roles: [data, ingest]
discovery.seed_hosts: ["master-1", "master-2", "master-3"]
```

## Sharding and Replicas

### Index with custom shards

```bash
# Create index with 3 primary shards and 1 replica
PUT /products
{
  "settings": {
    "index": {
      "number_of_shards": 3,
      "number_of_replicas": 1
    }
  }
}
```

### Sharding guidelines

| Index Size | Shards | Rationale |
|------------|--------|----------|
| < 1GB | 1 | No benefit from sharding |
| 1-10GB | 1-2 | One shard handles this well |
| 10-50GB | 3-5 | Parallel search across shards |
| 50-200GB | 5-10 | Max 50GB per shard |
| > 200GB | 10-20 | Split by time or category |

### Update replica count (no reindex needed)

```bash
PUT /products/_settings
{
  "number_of_replicas": 2
}
```

## Index Templates

```bash
# Create an index template for logs-* pattern
PUT /_index_template/logs
{
  "index_patterns": ["logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1,
      "index.refresh_interval": "5s",
      "index.lifecycle.name": "logs-policy"
    },
    "mappings": {
      "properties": {
        "@timestamp": { "type": "date" },
        "level": { "type": "keyword" },
        "message": { "type": "text" },
        "service": { "type": "keyword" },
        "host": { "type": "keyword" }
      }
    }
  },
  "priority": 100
}
```

## Mapping

### Explicit mapping

```bash
PUT /products
{
  "mappings": {
    "properties": {
      "name": {
        "type": "text",
        "analyzer": "standard",
        "fields": {
          "keyword": { "type": "keyword", "ignore_above": 256 }
        }
      },
      "price": { "type": "scaled_float", "scaling_factor": 100 },
      "in_stock": { "type": "boolean" },
      "created_at": { "type": "date" },
      "tags": { "type": "keyword" },
      "description": {
        "type": "text",
        "analyzer": "english"
      },
      "metadata": { "type": "object", "enabled": false }
    }
  }
}
```

### Dynamic mapping control

```bash
PUT /products
{
  "mappings": {
    "dynamic": "strict",
    "properties": {
      "name": { "type": "text" },
      "price": { "type": "float" }
    }
  }
}
```

### Dynamic templates

```bash
PUT /products
{
  "mappings": {
    "dynamic_templates": [
      {
        "strings_as_keyword": {
          "match_mapping_type": "string",
          "mapping": { "type": "keyword" }
        }
      },
      {
        "dates_default": {
          "match": ".*_at",
          "mapping": { "type": "date" }
        }
      }
    ]
  }
}
```

## Index Lifecycle Management (ILM)

```bash
# Create ILM policy for logs
PUT /_ilm/policy/logs-policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_age": "7d",
            "max_primary_shard_size": "50gb"
          },
          "set_priority": { "priority": 100 }
        }
      },
      "warm": {
        "min_age": "30d",
        "actions": {
          "shrink": { "number_of_shards": 1 },
          "forcemerge": { "max_num_segments": 1 },
          "set_priority": { "priority": 50 }
        }
      },
      "cold": {
        "min_age": "90d",
        "actions": {
          "freeze": {},
          "set_priority": { "priority": 0 }
        }
      },
      "delete": {
        "min_age": "365d",
        "actions": { "delete": {} }
      }
    }
  }
}
```

## Snapshots and Backup

```bash
# Register a filesystem snapshot repository
PUT /_snapshot/backup_repo
{
  "type": "fs",
  "settings": {
    "location": "/mnt/backups/elasticsearch",
    "compress": true
  }
}

# Create a snapshot
PUT /_snapshot/backup_repo/snapshot_2024_01_01?wait_for_completion=true
{
  "indices": "products,orders",
  "ignore_unavailable": true
}

# Restore a snapshot
POST /_snapshot/backup_repo/snapshot_2024_01_01/_restore
{
  "indices": "products",
  "rename_pattern": "products",
  "rename_replacement": "restored_products"
}
```

## Cluster Health and Monitoring

```bash
# Cluster health
GET /_cluster/health

# Cluster stats
GET /_cluster/stats

# Node info
GET /_nodes/info

# Index stats
GET /products/_stats

# Shard allocation
GET /_cat/shards/products?v

# Unassigned shards
GET /_cat/shards?v&h=index,shard,prirep,state,unassigned.reason
```

## Production Tuning

```yaml
# elasticsearch.yml — JVM and system settings

# JVM heap — 50% of RAM, max 31GB
# Set in jvm.options:
# -Xms16g
# -Xmx16g

# Disable swap
bootstrap.memory_lock: true

# Thread pool tuning
thread_pool.search.size: 50
thread_pool.search.queue_size: 1000

# Index settings
index.refresh_interval: 5s  # default 1s is too frequent for bulk indexing
index.number_of_replicas: 1

# Circuit breakers
indices.fielddata.cache.size: 40%
indices.breaker.fielddata.limit: 60%
indices.breaker.request.limit: 60%
```

### Bulk indexing

```bash
POST /_bulk
{ "index": { "_index": "products", "_id": "1" } }
{ "name": "Widget", "price": 9.99 }
{ "index": { "_index": "products", "_id": "2" } }
{ "name": "Gadget", "price": 19.99 }
{ "update": { "_index": "products", "_id": "3" } }
{ "doc": { "price": 14.99 } }
```

```python
from elasticsearch import Elasticsearch, helpers

es = Elasticsearch(["http://localhost:9200"])

actions = [
    {"_index": "products", "_id": i, "_source": {"name": f"Product {i}", "price": i * 1.99}}
    for i in range(10000)
]

helpers.bulk(es, actions, chunk_size=1000, request_timeout=60)
```

## Best Practices

- **Always use 3 master-eligible nodes** — avoid split-brain with quorum
- **Keep shard size under 50GB** — large shards slow recovery and search
- **Use explicit mapping** — dynamic mapping can create unexpected field types
- **Set `bootstrap.memory_lock: true`** — prevent swap from destroying performance
- **Allocate 50% of RAM to JVM heap** — max 31GB (compressed oops threshold)
- **Use ILM for time-series data** — automate rollover, shrink, and delete
- **Disable `_source` only if you never reindex** — you almost always need to reindex
- **Use bulk API for batch operations** — individual requests are 10-100x slower
- **Monitor cluster health continuously** — red status means data is at risk
- **Take regular snapshots** — Elasticsearch replication is not a backup
- **Use hot/warm/cold architecture** — save costs with tiered storage
- **Set `refresh_interval` to 30s during bulk indexing** — then reset to 1s

## Common Mistakes

- Over-sharding — too many small shards waste resources and slow searches
- Using dynamic mapping in production — unexpected field types break queries
- Not setting memory_lock — swap destroys latency
- Allocating > 31GB heap — compressed oops disabled, performance drops
- No ILM policy — indices grow indefinitely, cluster runs out of space
- No snapshots — replication does not protect against accidental deletion
- Single node in production — no high availability
- Too many indices — each index has overhead; use index templates with patterns
- Not monitoring unassigned shards — data may be unavailable
- Forcing cluster reroute manually — usually masks a deeper config issue

## Frequently Asked Questions

### How many shards should I use?

Aim for 10-50GB per shard. For a 100GB index, use 3-5 shards. You cannot shrink primary shards without reindexing, so plan ahead. For time-series data, use ILM with rollover to create new indices automatically.

### Should I use Elasticsearch or OpenSearch?

OpenSearch is a fork of Elasticsearch 7.10 with Apache 2.0 license. Use Elasticsearch if you need the latest features and X-Pack. Use OpenSearch if you need a fully open-source solution with no license restrictions. Both are API-compatible for most use cases.

### How do I reindex without downtime?

Use aliases. Point the alias to the old index, create the new index with updated mapping, reindex from old to new, then switch the alias:

```bash
POST /_aliases
{
  "actions": [
    { "remove": { "index": "products_v1", "alias": "products" } },
    { "add": { "index": "products_v2", "alias": "products" } }
  ]
}
```
