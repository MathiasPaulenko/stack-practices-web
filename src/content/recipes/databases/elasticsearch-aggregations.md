---
contentType: recipes
slug: elasticsearch-aggregations
title: "Elasticsearch Aggregations"
description: "Build faceted search, metrics, and time-series summaries with Elasticsearch aggregations. Covers terms, date histograms, ranges, and composite buckets."
metaDescription: "Use Elasticsearch aggregations for faceted search, metrics, and time-series analytics. Learn terms, date_histogram, range, and composite with real examples."
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
  metaDescription: "Use Elasticsearch aggregations for faceted search, metrics, and time-series analytics. Learn terms, date_histogram, range, and composite with real examples."
  keywords:
    - elasticsearch
    - aggregations
    - faceted search
    - analytics
    - time-series
---

## Overview

Elasticsearch aggregations group and summarize indexed data in real time. They
run on the inverted index, so counts and metrics over millions of documents are
fast enough to power search facets and live dashboards.

A single request can mix bucket aggregations, which split documents into groups,
and metric aggregations, which compute values inside each group. Nesting them
lets you build time-series, percentiles, and faceted summaries without a
separate batch job.

## When to Use

- You need faceted search with category-level count filters. See also
  [Full-Text Search](/recipes/full-text-search/) for the query side.
- You're building real-time analytics dashboards that must return sub-second
  aggregations over large document sets.
- You want to bucket time series and nest statistics such as sum, average, or
  percentiles.
- You need unique counts, top hits per bucket, or derivative metrics in a single
  request.

### When to avoid

- The query resembles a multi-table SQL join across separate indices.
- The field you want to aggregate isn't indexed, or it's a full-text `text`
  field without a `keyword` subfield.
- You need exact counts over extremely high-cardinality fields; use
  `composite` or tune `shard_size` instead of a plain `terms` aggregation.

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
accurate but consume more heap. With a threshold of 40,000, counts land within 1% of the real value.

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
aggregations; `date_histogram` splits by time. Metric aggregations such as
`sum`, `avg`, `stats`, and `percentiles` run inside each bucket.

You can nest aggregations to answer multi-level questions: monthly revenue per
category, average price per price range, or percentile latency per region.
Adding `size: 0` skips the search hits and returns only aggregations, which is
much faster if you don't need the documents themselves.

Text fields are analyzed and tokenized, so they can't be aggregated directly.
For counts, groupings, and filters, use the `.keyword` subfield, which is
stored as a single unanalyzed token.

The `composite` aggregation returns a key per bucket and an `after_key` for
pagination. It's the safest way to scan large aggregation result sets because it keeps
memory bounded and never skips buckets.

`post_filter` applies search filters after aggregations are computed. Use it
when users filter results but you want to keep the original facet counts.

Pipeline aggregations such as `derivative` and `moving_avg` read values from
other buckets. They work well for time-series analysis, but they add a second
pass and cost more CPU and memory.

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
- Use `composite` whenever an aggregation could return more than a few thousand
  buckets.
- Enable `eager_global_ordinals` on fields you aggregate frequently, especially
  for high-cardinality `terms`.
- Use `post_filter` to filter returned results without changing aggregation
  counts.
- Tune `precision_threshold` for `cardinality` to balance memory against
  accuracy.

## Common Mistakes

- Aggregating on a `text` field instead of its `.keyword` subfield.
- Requesting `size: 10000` on a `terms` aggregation and causing out-of-memory
  errors.
- Paginating large `terms` results without `composite`.
- Ignoring that `terms` and `cardinality` return approximate counts.
- Running heavy pipeline aggregations on very large time ranges.

## FAQ

### Can I combine multiple aggregations in one query?

Yes. You can place several top-level aggregations and nest bucket and metric
aggregations inside each other in the same request.

### How do I filter results without changing aggregation counts?

Use `post_filter` to apply search filters after the aggregations are computed.
The aggregations see the full query, while the returned hits are filtered.

### Are Elasticsearch aggregations exact on large datasets?

`terms` and `cardinality` are approximate. Adjust `shard_size` or use
`composite` aggregations for more exact counts, and raise
`precision_threshold` for better cardinality accuracy.

### Why should I use `composite` instead of `terms` for pagination?

`composite` returns a stable `after_key` and walks the result set in sorted
order. `terms` pagination with `from` isn't reliable because bucket order can
change as data is indexed.

### What is the difference between `filter` and `post_filter`?

A `filter` aggregation adds a bucket under the aggregation tree. `post_filter`
limits the search hits returned without affecting the aggregation values.
