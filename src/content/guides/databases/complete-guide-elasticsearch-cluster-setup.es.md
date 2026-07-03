---
contentType: guides
slug: complete-guide-elasticsearch-cluster-setup
title: "Guía Completa de Elasticsearch Cluster Setup"
description: "Despliega y escala clusters de Elasticsearch. Cubre roles de nodos, sharding, réplicas, index templates, mapping, snapshots y tuning de producción para search a escala."
metaDescription: "Guía completa de Elasticsearch cluster setup. Despliega, configura roles, sharding, réplicas, index templates, mapping, snapshots y tuning de producción."
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
  metaDescription: "Guía completa de Elasticsearch cluster setup. Despliega, configura roles, sharding, réplicas, index templates, mapping, snapshots y tuning de producción."
  keywords:
    - elasticsearch cluster
    - elasticsearch setup
    - elasticsearch sharding
    - elasticsearch mapping
    - elasticsearch production
    - search cluster
    - index templates
---

# Guía Completa de Elasticsearch Cluster Setup

## Introducción

Elasticsearch es un motor distribuido de search y analytics. Maneja full-text search, structured search, analytics y vector search. Correrlo en producción requiere entender roles de nodos, estrategias de sharding, mapping y cluster health. Esta guía cubre arquitectura de cluster, deployment, index management, mapping, snapshots y tuning de producción.

## Arquitectura de Cluster

### Roles de nodos

```yaml
# elasticsearch.yml

# Nodo master-eligible — gestión de cluster state
node.roles: [master]

# Nodo data — almacena data, ejecuta CRUD y search
node.roles: [data]

# Nodo coordinating — routing, query aggregation (sin data, sin master)
node.roles: []

# Nodo ingest — pre-procesa documentos antes de indexar
node.roles: [data, ingest]

# Arquitectura hot/warm
node.roles: [data_hot]    # data reciente, SSD rápido
node.roles: [data_warm]   # data más vieja, discos más lentos
node.roles: [data_cold]   # read-only, storage más barato
```

### Cluster mínimo de producción (3 nodos)

```yaml
# Nodo 1 — master + data (clusters pequeños)
cluster.name: prod-es-cluster
node.name: node-1
network.host: 0.0.0.0
discovery.seed_hosts: ["node-1", "node-2", "node-3"]
cluster.initial_master_nodes: ["node-1", "node-2", "node-3"]
xpack.security.enabled: true
xpack.security.enrollment.enabled: true
```

### Master nodes dedicados (clusters grandes)

```yaml
# 3 master nodes dedicados (sin data)
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

## Sharding y Réplicas

### Index con shards custom

```bash
# Crear index con 3 primary shards y 1 réplica
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

### Pautas de sharding

| Tamaño de Index | Shards | Rationale |
|------------|--------|----------|
| < 1GB | 1 | Sin beneficio de sharding |
| 1-10GB | 1-2 | Un shard maneja esto bien |
| 10-50GB | 3-5 | Search paralelo across shards |
| 50-200GB | 5-10 | Máx 50GB por shard |
| > 200GB | 10-20 | Split por tiempo o categoría |

### Actualizar replica count (sin reindex)

```bash
PUT /products/_settings
{
  "number_of_replicas": 2
}
```

## Index Templates

```bash
# Crear un index template para el patrón logs-*
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

### Mapping explícito

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

### Control de dynamic mapping

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
# Crear ILM policy para logs
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

## Snapshots y Backup

```bash
# Registrar un filesystem snapshot repository
PUT /_snapshot/backup_repo
{
  "type": "fs",
  "settings": {
    "location": "/mnt/backups/elasticsearch",
    "compress": true
  }
}

# Crear un snapshot
PUT /_snapshot/backup_repo/snapshot_2024_01_01?wait_for_completion=true
{
  "indices": "products,orders",
  "ignore_unavailable": true
}

# Restaurar un snapshot
POST /_snapshot/backup_repo/snapshot_2024_01_01/_restore
{
  "indices": "products",
  "rename_pattern": "products",
  "rename_replacement": "restored_products"
}
```

## Cluster Health y Monitoreo

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

## Tuning de Producción

```yaml
# elasticsearch.yml — settings de JVM y sistema

# JVM heap — 50% de RAM, máx 31GB
# Setear en jvm.options:
# -Xms16g
# -Xmx16g

# Deshabilitar swap
bootstrap.memory_lock: true

# Tuning de thread pool
thread_pool.search.size: 50
thread_pool.search.queue_size: 1000

# Settings de index
index.refresh_interval: 5s  # default 1s es muy frecuente para bulk indexing
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

## Pautas

- **Siempre usar 3 master-eligible nodes** — evitar split-brain con quórum
- **Mantener shard size bajo 50GB** — shards grandes ralentizan recovery y search
- **Usar mapping explícito** — dynamic mapping puede crear field types inesperados
- **Setear `bootstrap.memory_lock: true`** — prevenir que swap destruya performance
- **Asignar 50% de RAM a JVM heap** — máx 31GB (compressed oops threshold)
- **Usar ILM para time-series data** — automatizar rollover, shrink y delete
- **Deshabilitar `_source` solo si nunca reindexas** — casi siempre necesitas reindexar
- **Usar bulk API para operaciones batch** — requests individuales son 10-100x más lentos
- **Monitorear cluster health continuamente** — estado red significa data en riesgo
- **Tomar snapshots regulares** — la replicación de Elasticsearch no es un backup
- **Usar arquitectura hot/warm/cold** — ahorrar costos con storage tiered
- **Setear `refresh_interval` a 30s durante bulk indexing** — luego resetear a 1s

## Errores Comunes

- Over-sharding — demasiados shards pequeños desperdician recursos y ralentizan searches
- Usar dynamic mapping en producción — field types inesperados rompen queries
- No setear memory_lock — swap destruye latencia
- Asignar > 31GB heap — compressed oops deshabilitado, performance cae
- Sin ILM policy — índices crecen indefinidamente, el cluster se queda sin espacio
- Sin snapshots — la replicación no protege contra borrado accidental
- Nodo único en producción — sin high availability
- Demasiados índices — cada índice tiene overhead; usar index templates con patterns
- No monitorear unassigned shards — data puede estar unavailable
- Forzar cluster reroute manualmente — usualmente enmascara un issue de config más profundo

## Preguntas Frecuentes

### ¿Cuántos shards debo usar?

Apuntar a 10-50GB por shard. Para un índice de 100GB, usar 3-5 shards. No puedes shrink primary shards sin reindex, así que planear adelante. Para time-series data, usar ILM con rollover para crear nuevos índices automáticamente.

### ¿Debo usar Elasticsearch u OpenSearch?

OpenSearch es un fork de Elasticsearch 7.10 con licencia Apache 2.0. Usar Elasticsearch si necesitas las últimas features y X-Pack. Usar OpenSearch si necesitas una solución fully open-source sin restricciones de licencia. Ambos son API-compatible para la mayoría de use cases.

### ¿Cómo hago reindex sin downtime?

Usar aliases. Apuntar el alias al índice viejo, crear el índice nuevo con mapping actualizado, reindex del viejo al nuevo, luego switchar el alias:

```bash
POST /_aliases
{
  "actions": [
    { "remove": { "index": "products_v1", "alias": "products" } },
    { "add": { "index": "products_v2", "alias": "products" } }
  ]
}
```
