---
contentType: recipes
slug: elasticsearch-aggregations
title: "Elasticsearch Aggregations for Analytics and Search"
description: "How to use Elasticsearch aggregations to build faceted search, analytics dashboards, and real-time metrics from indexed data"
metaDescription: "Elasticsearch aggregations for analytics. Build faceted search, metrics dashboards, and real-time aggregations with bucket and metric aggregations."
difficulty: intermediate
topics:
  - databases
  - data
tags:
  - elasticsearch
  - database
  - analytics
  - search
relatedResources:
  - /recipes/databases/mongodb-crud-mongoose
  - /recipes/query-optimization
  - /guides/database-design-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Elasticsearch aggregations for analytics. Build faceted search, metrics dashboards, and real-time aggregations with bucket and metric aggregations."
  keywords:
    - elasticsearch
    - aggregations
    - faceted search
    - analytics
    - search engine
---

# Elasticsearch Aggregations for Analytics and Search

Elasticsearch aggregations allow you to group and summarize indexed data in real time. Unlike relational databases that require explicit GROUP BY queries, Elasticsearch computes aggregations on inverted indexes, making them fast enough to power live search facets and analytics dashboards.

## When to Use This

- You need faceted search with count-per-category filters
- Real-time analytics dashboards require sub-second aggregations over millions of documents
- Time-series data must be bucketed by date ranges with nested statistics

## Prerequisites

- Elasticsearch 8+ cluster running locally or on Elastic Cloud
- Documents already indexed with mappings that support aggregation fields

## Solution

### 1. Basic Terms Aggregation (Faceted Search)

```json
GET /products/_search
{
  "size": 0,
  "aggs": {
    "categories": {
      "terms": {
        "field": "category.keyword",
        "size": 10
      }
    }
  }
}
```

```typescript
// client/SearchClient.ts
async function getCategoryFacets(query: string) {
  const response = await client.search({
    index: 'products',
    size: 0,
    query: { match: { name: query } },
    aggs: {
      categories: {
        terms: { field: 'category.keyword', size: 20 }
      },
      brands: {
        terms: { field: 'brand.keyword', size: 20 }
      }
    }
  });

  return {
    categories: response.aggregations?.categories.buckets,
    brands: response.aggregations?.brands.buckets,
  };
}
```

### 2. Nested Date Histogram with Metrics

```json
GET /orders/_search
{
  "size": 0,
  "aggs": {
    "sales_over_time": {
      "date_histogram": {
        "field": "created_at",
        "calendar_interval": "month"
      },
      "aggs": {
        "revenue": {
          "sum": { "field": "total_amount" }
        },
        "avg_order_value": {
          "avg": { "field": "total_amount" }
        }
      }
    }
  }
}
```

### 3. Range Aggregation for Pricing Tiers

```json
GET /products/_search
{
  "size": 0,
  "aggs": {
    "price_ranges": {
      "range": {
        "field": "price",
        "ranges": [
          { "to": 50, "key": "budget" },
          { "from": 50, "to": 200, "key": "mid-range" },
          { "from": 200, "key": "premium" }
        ]
      }
    }
  }
}
```

### 4. Composite Aggregation for Deep Pagination

```json
GET /events/_search
{
  "size": 0,
  "aggs": {
    "events_by_region": {
      "composite": {
        "size": 100,
        "sources": [
          { "region": { "terms": { "field": "region.keyword" } } },
          { "day": { "date_histogram": { "field": "timestamp", "calendar_interval": "day" } } }
        ]
      }
    }
  }
}
```

## How It Works

1. **Terms Aggregation** counts unique values using the fielddata or keyword index
2. **Bucket Aggregations** group documents into intervals (dates, ranges, or custom filters)
3. **Metric Aggregations** compute statistics (sum, avg, percentiles) within each bucket
4. **Composite Keys** allow paginating through large aggregation results without missing data

## Production Considerations

- Set `size: 0` when you only need aggregations, not search hits
- Use `keyword` subfields for text aggregations to avoid tokenization issues
- Enable `eager_global_ordinals` on frequently aggregated fields for faster execution
- Consider **runtime fields** for ad-hoc aggregations on unindexed data

## Common Mistakes

- Aggregating on `text` fields instead of `keyword` subfields
- Requesting too many buckets with `size: 10000`, causing memory pressure
- Not using composite aggregations when paginating through large result sets

## FAQ

**Q: Are Elasticsearch aggregations accurate on large datasets?**
A: Terms aggregations use approximate counting for top-N. Use `shard_size` tuning or `composite` aggregations for exact counts.

**Q: Can I combine multiple aggregations in a single query?**
A: Yes. Elasticsearch supports nested aggregations and sibling pipeline aggregations in the same request.

**Q: How do I filter results without affecting aggregation counts?**
A: Use `post_filter` to apply search filters after aggregations are computed.
