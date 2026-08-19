---
contentType: recipes
slug: elasticsearch-aggregations
title: "How to Use Elasticsearch Aggregations (With Examples)"
description: "Use Elasticsearch aggregations for faceted search, metrics, and time-series analytics. Step-by-step examples for terms, date_histogram, range, and composite."
metaDescription: "Use Elasticsearch aggregations for faceted search, metrics, and time-series analytics. Step-by-step examples for terms, date_histogram, range, and composite."
difficulty: intermediate
topics:
  - databases
  - data
tags:
  - elasticsearch
  - aggregations
  - analytics
  - search
  - databases
relatedResources:
  - /recipes/full-text-search
  - /recipes/mongodb-crud-mongoose
  - /recipes/metrics-collection
  - /recipes/pagination
  - /guides/complete-guide-elasticsearch-cluster-setup
  - /guides/full-text-search-guide
lastUpdated: "2026-08-19"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Use Elasticsearch aggregations for faceted search, metrics, and time-series analytics. Step-by-step examples for terms, date_histogram, range, and composite."
  keywords:
    - elasticsearch
    - aggregations
    - faceted search
    - analytics
    - time-series
---

## Overview

Any time you need counts, sums, or percentiles from an Elasticsearch index,
aggregations are the obvious place to start. They run directly on the inverted
index, which keeps counts and metrics over millions of documents fast enough for
live facets and dashboards.

A single request can combine bucket aggregations that split documents into groups
with metric aggregations that compute values inside each group. Nest them to
build time-series, percentiles, and faceted summaries without shipping data to a
separate batch job.

## When to Use

- You're building faceted search with category-level count filters. The query
  side is covered in [Full-Text Search](/recipes/full-text-search/).
- Your analytics dashboards have to return numbers in under a second over large
  document sets.
- You want to bucket time series and nest statistics like sum, average, or
  percentiles.
- You need unique counts, top hits per bucket, or derivative metrics inside the
  same request.

### When to avoid

- The query reads like a SQL join across several tables: aggregations stay
  inside one index and won't span across them.
- The field you want to aggregate isn't indexed, or it's a tokenized `text`
  field with no `.keyword` subfield.
- You need exact counts over very high-cardinality fields; prefer `composite`
  or tune `shard_size` instead of a plain `terms` aggregation.

## Solution

### Terms aggregation for faceted search

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

### Faceted search with the JavaScript client

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

### Date histogram with nested metrics

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

### Range aggregation for pricing tiers

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

### Composite aggregation for deep pagination

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

```javascript
async function paginateAggregations(afterKey = null) {
  const body = {
    size: 0,
    aggs: {
      events_by_region: {
        composite: {
          size: 100,
          sources: [
            { region: { terms: { field: 'region.keyword' } } },
            { day: { date_histogram: { field: 'timestamp', calendar_interval: 'day' } } }
          ],
          ...(afterKey && { after: afterKey })
        }
      }
    }
  };

  const response = await client.search({ index: 'events', body });
  const { buckets, after_key } = response.aggregations.events_by_region;

  if (after_key) {
    console.log(`Got ${buckets.length} buckets, fetching next page...`);
    return [...buckets, ...await paginateAggregations(after_key)];
  }
  return buckets;
}
```

### Python client: terms, stats, and percentiles

```python
from elasticsearch import Elasticsearch

es = Elasticsearch("http://localhost:9200")

response = es.search(
    index="products",
    size=0,
    query={"match": {"name": "laptop"}},
    aggs={
        "categories": {
            "terms": {"field": "category.keyword", "size": 20}
        },
        "price_stats": {
            "stats": {"field": "price"}
        },
        "price_percentiles": {
            "percentiles": {"field": "price", "percents": [25, 50, 75, 95]}
        }
    }
)

print(response["aggregations"]["categories"]["buckets"])
print(response["aggregations"]["price_stats"])
```

### Filter bucket aggregation

```json
GET /products/_search
{
  "size": 0,
  "aggs": {
    "in_stock": {
      "filter": { "term": { "status": "in_stock" } },
      "aggs": {
        "avg_price": { "avg": { "field": "price" } }
      }
    },
    "out_of_stock": {
      "filter": { "term": { "status": "out_of_stock" } },
      "aggs": {
        "avg_price": { "avg": { "field": "price" } }
      }
    }
  }
}
```

### Cardinality for unique counts

```json
GET /orders/_search
{
  "size": 0,
  "aggs": {
    "unique_customers": {
      "cardinality": {
        "field": "customer_id",
        "precision_threshold": 40000
      }
    }
  }
}
```

Cardinality uses HyperLogLog++ for approximate distinct counts. The
`precision_threshold` trades accuracy for memory: higher values are more
accurate but consume more heap. With `precision_threshold: 40000`, Elasticsearch returns counts within 1% of the
true value. That margin is good enough for most dashboards.

### Top hits per bucket

```json
GET /products/_search
{
  "size": 0,
  "aggs": {
    "by_category": {
      "terms": { "field": "category.keyword", "size": 10 },
      "aggs": {
        "top_products": {
          "top_hits": {
            "size": 3,
            "sort": [{ "popularity": "desc" }],
            "_source": ["name", "price", "rating"]
          }
        }
      }
    }
  }
}
```

### Pipeline aggregations

```json
GET /orders/_search
{
  "size": 0,
  "aggs": {
    "monthly_sales": {
      "date_histogram": {
        "field": "created_at",
        "calendar_interval": "month"
      },
      "aggs": {
        "revenue": {
          "sum": { "field": "total_amount" }
        },
        "revenue_derivative": {
          "derivative": { "buckets_path": "revenue" }
        },
        "revenue_moving_avg": {
          "moving_avg": {
            "buckets_path": "revenue",
            "window": 3,
            "model": "holt"
          }
        }
      }
    }
  }
}
```

## Explanation

Bucket aggregations split documents into groups. `terms` and `range` are bucket
aggregations; `date_histogram` splits by time. Metric aggregations like `sum`,
`avg`, `stats`, and `percentiles` run inside each bucket.

Nesting aggregations lets you answer multi-level questions: monthly revenue per
category, average price per price range, or percentile latency per region. Set
`size: 0` and Elasticsearch skips the hits, returning only aggregation results.
Skipping the hits is much faster when you don't actually need the documents.

Text fields are analyzed and tokenized, so they can't be aggregated directly.
For counts, groupings, and filters, use the `.keyword` subfield: that sibling is
stored as a single unanalyzed token, which is exactly what aggregations need.

The `composite` aggregation returns a key per bucket and an `after_key` for
pagination. It keeps memory bounded and never skips buckets, so it's the safest
way to scan large aggregation result sets. For the document side of paging,
see [Pagination](/recipes/pagination/).

`post_filter` applies search filters after aggregations are computed. Use it
when users filter results but you want to keep the original facet counts.

Pipeline aggregations such as `derivative` and `moving_avg` read values from
other buckets. Pipelines fit time-series analysis, but they force a second pass and drive up
CPU and memory usage.

## Variants

| Aggregation | Use case | Key parameters |
| --- | --- | --- |
| `terms` | Count by category, brand, or status | `field`, `size`, `shard_size` |
| `date_histogram` | Time-series bucketing | `field`, `calendar_interval` |
| `range` | Predefined bands such as price tiers | `ranges` |
| `composite` | Paginating over high-cardinality keys | `sources`, `size`, `after` |
| `cardinality` | Approximate unique counts | `precision_threshold` |
| `top_hits` | Best document per bucket | `size`, `sort`, `_source` |
| `filter` | Conditional sub-aggregations | `filter` query |

## Best Practices

- Set `size: 0` when you only need aggregations, not search hits.
- Aggregate on `keyword` subfields, not on analyzed `text` fields.
- Switch to `composite` when an aggregation could return more than a few
  thousand buckets.
- Enable `eager_global_ordinals` on fields you aggregate frequently, especially
  for high-cardinality `terms`.
- Use `post_filter` to filter returned results without changing aggregation
  counts.
- Tune `precision_threshold` on `cardinality` to balance memory and accuracy.

## Common Mistakes

- Aggregating on a `text` field instead of its `.keyword` subfield.
- Setting `size: 10000` on a `terms` aggregation and assuming the cluster has
  unlimited heap.
- Paginating large `terms` results without `composite`.
- Forgetting that `terms` and `cardinality` return approximate counts.
- Running heavy pipeline aggregations on very large time ranges.

## FAQ

### Can I combine multiple aggregations in one query?

Yes. You can place several top-level aggregations and nest bucket and metric
aggregations inside each other in the same request.

### How do I filter results without changing aggregation counts?

Use `post_filter` when you want filters applied after the aggregations are
computed.
The aggregations see the full query, while the returned hits are filtered.

### Are Elasticsearch aggregations exact on large datasets?

Remember that `terms` and `cardinality` are approximate, not exact counts. Increase `shard_size`, use
`composite` for exact counts, or raise `precision_threshold` to improve
cardinality accuracy.

### Why should I use `composite` instead of `terms` for pagination?

`composite` returns a stable `after_key` and walks the result set in sorted
order. `terms` pagination with `from` isn't reliable because bucket order can
change as data is indexed.

### What is the difference between `filter` and `post_filter`?

A `filter` aggregation adds a bucket under the aggregation tree. `post_filter`
applies only to the search hits, so the aggregation values stay the same.
