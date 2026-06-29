---
contentType: guides
slug: full-text-search-guide
title: "Full-Text Search — Implement Search That Actually Works"
description: "A practical guide to full-text search: PostgreSQL tsvector, Elasticsearch indexing, query design, relevance tuning, and building search that users trust with autocomplete, faceting, and typo tolerance."
metaDescription: "Learn full-text search: PostgreSQL tsvector, Elasticsearch indexing, query design, relevance tuning, autocomplete, faceting, and typo tolerance."
difficulty: intermediate
topics:
  - databases
  - data
  - performance
tags:
  - full-text-search
  - elasticsearch
  - postgresql
  - search
  - indexing
  - relevance
  - guide
relatedResources:
  - /guides/data/database-sharding-implementation-guide
  - /guides/data/read-replica-guide
  - /guides/data/caching-strategies-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn full-text search: PostgreSQL tsvector, Elasticsearch indexing, query design, relevance tuning, autocomplete, faceting, and typo tolerance."
  keywords:
    - full-text-search
    - elasticsearch
    - postgresql
    - search
    - indexing
    - relevance
    - guide
---

## Overview

Full-text search transforms raw text into queryable, ranked results. Unlike simple `LIKE '%term%'` queries that scan entire tables, full-text search uses inverted indexes, stemming, ranking algorithms, and relevance scoring to return meaningful results in milliseconds.

This guide covers PostgreSQL built-in search, Elasticsearch for advanced use cases, query design, and production tuning.

## When to Use

- Users need to search across multiple text fields (title, description, tags, content)
- `LIKE` queries take longer than 100ms on production data
- You need ranked results (most relevant first, not most recent)
- Search must support stemming (searching "run" matches "running")
- You want autocomplete, typo tolerance, or faceted search
- You need to search across millions of documents

## When NOT to Use

- Simple exact-match lookups on indexed columns — use `=` or `B-tree` indexes
- Searching numeric or date ranges — use standard indexes
- Your dataset is under 10,000 rows and `ILIKE` is fast enough
- You only need prefix matching on a single column — use `text_pattern_ops`

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Inverted Index** | Maps terms to the documents that contain them |
| **Tokenization** | Splitting text into searchable terms (words, n-grams) |
| **Stemming** | Reducing words to their root form (running → run) |
| **Relevance Score** | Numerical ranking of how well a document matches a query |
| **Faceting** | Counting results per category for filtering UI |
| **Typo Tolerance** | Matching documents despite spelling errors |

## PostgreSQL Full-Text Search

Start with built-in search before adding Elasticsearch:

### 1. Create a Search Index

```sql
-- Add tsvector column and index
ALTER TABLE products ADD COLUMN search_vector tsvector;

-- Create GIN index for fast full-text queries
CREATE INDEX idx_products_search ON products USING GIN(search_vector);

-- Update search vector with weighted content
UPDATE products SET search_vector =
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(tags::text, '')), 'C');
```

### 2. Build a Search Query

```sql
-- Basic ranked search
SELECT 
    id, 
    name, 
    description,
    ts_rank(search_vector, query) as rank
FROM products, 
    plainto_tsquery('english', 'wireless headphones') query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;

-- Search with highlighting (show matching text)
SELECT 
    id,
    name,
    ts_headline('english', description, query) as highlighted
FROM products,
    plainto_tsquery('english', 'noise canceling') query
WHERE search_vector @@ query;

-- Filtered search with facets
SELECT 
    category,
    count(*) as product_count,
    avg(ts_rank(search_vector, query)) as avg_relevance
FROM products,
    plainto_tsquery('english', 'gaming keyboard') query
WHERE search_vector @@ query
GROUP BY category
ORDER BY product_count DESC;
```

### 3. Keep the Index Updated

```sql
-- Trigger to auto-update search vector on change
CREATE OR REPLACE FUNCTION products_search_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.tags::text, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_search_trigger
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION products_search_update();
```

**PostgreSQL search capabilities:**

| Feature | Support | Notes |
|---------|---------|-------|
| Stemming | Yes | Built into text search dictionaries |
| Ranking | Yes | `ts_rank()` and `ts_rank_cd()` |
| Highlighting | Yes | `ts_headline()` for result previews |
| Multiple languages | Yes | Per-column or per-query language selection |
| Prefix search | Partial | Use `to_tsquery('english', 'wireless:*')` |
| Typo tolerance | No | Requires pg_trgm or external engine |
| Fuzzy matching | Partial | `pg_trgm` similarity for typos |

## Elasticsearch for Advanced Search

When PostgreSQL is not enough, Elasticsearch provides distributed, growth-ready search:

### 1. Define an Index Mapping

```json
// Elasticsearch index mapping for e-commerce products
PUT /products
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "custom_english": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "english_stop", "english_stemmer", "synonym_filter"]
        }
      },
      "filter": {
        "english_stop": { "type": "stop", "stopwords": "_english_" },
        "english_stemmer": { "type": "stemmer", "language": "english" },
        "synonym_filter": { "type": "synonym", "synonyms": ["laptop, notebook, portable computer"] }
      }
    }
  },
  "mappings": {
    "properties": {
      "name": { 
        "type": "text", 
        "analyzer": "custom_english",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "description": { "type": "text", "analyzer": "custom_english" },
      "category": { "type": "keyword" },
      "price": { "type": "float" },
      "tags": { "type": "keyword" },
      "in_stock": { "type": "boolean" }
    }
  }
}
```

### 2. Build Search Queries

```json
// Multi-match search with boosting
GET /products/_search
{
  "query": {
    "bool": {
      "must": {
        "multi_match": {
          "query": "wireless gaming mouse",
          "fields": ["name^3", "description^2", "tags"],
          "type": "best_fields",
          "fuzziness": "AUTO"
        }
      },
      "filter": [
        { "term": { "in_stock": true } },
        { "range": { "price": { "lte": 100 } } }
      ]
    }
  },
  "aggs": {
    "by_category": {
      "terms": { "field": "category" }
    },
    "price_ranges": {
      "range": {
        "field": "price",
        "ranges": [
          { "to": 50 },
          { "from": 50, "to": 100 },
          { "from": 100 }
        ]
      }
    }
  },
  "highlight": {
    "fields": {
      "name": {},
      "description": { "fragment_size": 150 }
    }
  },
  "sort": [
    { "_score": "desc" },
    { "price": "asc" }
  ]
}
```

```python
# Example: Python Elasticsearch client
from elasticsearch import Elasticsearch

es = Elasticsearch(['http://localhost:9200'])

def search_products(query, category=None, max_price=None):
    search_body = {
        "query": {
            "bool": {
                "must": {
                    "multi_match": {
                        "query": query,
                        "fields": ["name^3", "description^2", "tags"],
                        "type": "best_fields",
                        "fuzziness": "AUTO"
                    }
                },
                "filter": []
            }
        },
        "aggs": {
            "categories": { "terms": { "field": "category" } }
        }
    }
    
    if category:
        search_body["query"]["bool"]["filter"].append(
            {"term": {"category": category}}
        )
    
    if max_price:
        search_body["query"]["bool"]["filter"].append(
            {"range": {"price": {"lte": max_price}}}
        )
    
    return es.search(index="products", body=search_body)
```

### 3. Implement Autocomplete

```json
// Completion suggester for autocomplete
PUT /products/_mapping
{
  "properties": {
    "suggest": {
      "type": "completion"
    }
  }
}

// Index documents with suggestions
POST /products/_doc/1
{
  "name": "Wireless Gaming Mouse",
  "suggest": {
    "input": ["wireless gaming mouse", "gaming mouse", "wireless mouse"],
    "weight": 10
  }
}

// Query for autocomplete
GET /products/_search
{
  "suggest": {
    "product-suggest": {
      "prefix": "wire",
      "completion": {
        "field": "suggest",
        "fuzzy": { "fuzziness": "AUTO" }
      }
    }
  }
}
```

## Step-by-Step Search Implementation

### 1. Choose Your Engine

| Use Case | PostgreSQL | Elasticsearch | Meilisearch |
|----------|-----------|---------------|-------------|
| <100k documents | ✅ Excellent | Overkill | Overkill |
| <1M documents, simple ranking | ✅ Good | Optional | ✅ Good |
| Fuzzy/typo search | ⚠️ Partial | ✅ Excellent | ✅ Excellent |
| Faceted e-commerce | ⚠️ Complex | ✅ Excellent | ✅ Good |
| Distributed scale | ❌ No | ✅ Built-in | ❌ Single node |
| Real-time updates | ✅ Instant | ✅ Near-instant | ✅ Instant |
| Complex relevance tuning | ⚠️ Limited | ✅ Very flexible | ✅ Simple |

### 2. Design Your Index

```sql
-- PostgreSQL: One search vector per table
-- Strategy: Weight fields by importance

-- A-weighted (most important): product name, exact SKU
-- B-weighted (important): description, short summary
-- C-weighted (less important): tags, specifications

UPDATE products SET search_vector =
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(sku, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'C');
```

```json
// Elasticsearch: Multi-field mappings
{
  "mappings": {
    "properties": {
      "name": {
        "type": "text",
        "analyzer": "english",
        "fields": {
          "keyword": { "type": "keyword" },
          "suggest": { "type": "completion" }
        }
      }
    }
  }
}
```

### 3. Tune Relevance

```sql
-- PostgreSQL: Custom ranking with field weights
SELECT 
    id, name,
    ts_rank_cd('{0.1, 0.2, 0.4, 1.0}', search_vector, query, 32) as rank
FROM products,
    plainto_tsquery('english', 'laptop stand') query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

```json
// Elasticsearch: Function score for custom ranking
{
  "query": {
    "function_score": {
      "query": { "multi_match": { "query": "laptop", "fields": ["name^3", "description"] } },
      "functions": [
        { "filter": { "term": { "in_stock": true } }, "weight": 2 },
        { "field_value_factor": { "field": "popularity_score", "factor": 1.2 } },
        { "gauss": { "price": { "origin": 500, "scale": 200 } } }
      ],
      "score_mode": "sum"
    }
  }
}
```

### 4. Sync Data to Search Index

```python
# Example: Sync database changes to Elasticsearch
from elasticsearch import Elasticsearch
import psycopg2

es = Elasticsearch(['http://localhost:9200'])

def sync_product_to_es(product_id):
    """Sync a single product to Elasticsearch."""
    conn = psycopg2.connect("dbname=shop")
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = %s", (product_id,))
    product = cursor.fetchone()
    
    es.index(
        index="products",
        id=product['id'],
        body={
            "name": product['name'],
            "description": product['description'],
            "category": product['category'],
            "price": product['price'],
            "tags": product['tags'],
            "in_stock": product['in_stock']
        }
    )

def bulk_sync():
    """Full reindex — run during maintenance window."""
    cursor.execute("SELECT * FROM products")
    
    from elasticsearch.helpers import bulk
    actions = (
        {
            "_index": "products",
            "_id": row['id'],
            "_source": {
                "name": row['name'],
                "description": row['description'],
                "category": row['category'],
                "price": row['price'],
                "tags": row['tags']
            }
        }
        for row in cursor
    )
    bulk(es, actions)
```

## What Works

- **Start with PostgreSQL.** Add Elasticsearch only when you need capabilities PostgreSQL cannot provide.
- **Use database triggers or CDC for sync.** Do not rely on application code to keep search indexes updated.
- **Index only searchable fields.** Including large text blobs in your search index wastes space and slows indexing.
- **Test with real queries.** Synthetic benchmark queries do not match actual user search patterns.
- **Monitor query latency.** Search is user-facing; latency spikes directly impact conversion.
- **Implement search analytics.** Track what users search for, what they click, and when they get zero results.

## Common Mistakes

- **LIKE '%term%' on large tables.** This performs a full table scan. Always use full-text indexes.
- **Not updating search indexes.** Stale search results are worse than slow search.
- **Over-engineering with Elasticsearch.** For simple use cases, PostgreSQL search is faster to implement and operate.
- **Ignoring relevance feedback.** If users consistently refine searches, your ranking is wrong.
- **No zero-results strategy.** When search returns nothing, show related categories or popular items.
- **Case-sensitive search.** Use `to_tsvector` (PostgreSQL) or `lowercase` filter (Elasticsearch), not `LIKE`.

## Variants

- **pg_trgm for fuzzy matching:** Trigram similarity for typo tolerance in PostgreSQL
- **Meilisearch:** Developer-friendly alternative to Elasticsearch with built-in typo tolerance
- **Typesense:** Open-source search with instant search and geo-search capabilities
- **SaaS search:** Algolia, Swiftype — managed, expensive at scale, fastest to implement
- **Vector search:** Pinecone, Weaviate, pgvector — semantic search with embeddings

## FAQ

**Q: Should I use PostgreSQL or Elasticsearch for search?**
Start with PostgreSQL if you have <1M documents and do not need fuzzy matching or complex faceting. Move to Elasticsearch when search becomes a core feature with advanced requirements.

**Q: How do I keep Elasticsearch in sync with my database?**
Use Change Data Capture (CDC) with Debezium, database triggers with a message queue, or application-level dual writes. CDC is the most reliable.

**Q: How do I handle zero search results?**
Show popular products, related categories, or a "did you mean?" suggestion. Log the query for analysis.

**Q: Can I use PostgreSQL for autocomplete?**
Yes, with `pg_trgm` extension: `SELECT word FROM words WHERE word % 'parial' ORDER BY similarity(word, 'parial') DESC LIMIT 5;`

## Conclusion

Full-text search is a user-facing feature where performance and relevance directly impact engagement. By choosing the right engine for your scale, designing indexes for your query patterns, and continuously tuning relevance, you build search that users trust and rely on.

