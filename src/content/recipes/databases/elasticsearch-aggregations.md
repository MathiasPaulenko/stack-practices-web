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
  - /recipes/database-views-materialized
  - /recipes/cursor-pagination-postgresql
  - /guides/complete-guide-elasticsearch-cluster-setup
  - /guides/full-text-search-guide
lastUpdated: "2026-08-30"
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

I've used this pattern on product catalogs where the same request returns
matching products and facet counts for category, brand, and price range. Without aggregations, you would need a second query or a batch job, and
the facets would be stale by the time they reach the UI.

Most examples target Elasticsearch 8.x. They also work on 7.10+, but
`date_histogram` switched from `interval` to `calendar_interval` between major
versions. The official docs keep a complete aggregation reference at
[Elasticsearch Aggregations](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations.html).

The request cache and eager global ordinals can speed up aggregations, but
only after the query itself is well structured. I cover both in Best Practices.

## When to Use

- You're building faceted search with category-level count filters. The query
  side is covered in [Full-Text Search](/recipes/full-text-search/).
- Your analytics dashboards need sub-second numbers across large document sets.
- You want to bucket time series and nest statistics like sum, average, or
  percentiles.
- You need unique counts, top hits per bucket, or derivative metrics in the same request.

### When to avoid

- The query looks like a SQL join across several tables: aggregations stay
  inside one index and can't span them.
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
accurate but consume more heap. With `precision_threshold: 40000`, Elasticsearch returns counts within 1% of the true value. That margin is enough for most dashboards.

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

### Mapping for keyword aggregation

```json
PUT /products
{
  "mappings": {
    "properties": {
      "category": {
        "type": "text",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "brand": {
        "type": "text",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      }
    }
  }
}
```

This mapping is what makes the `.keyword` subfield examples work. Elasticsearch analyzes the `text` field for search, but stores the `keyword`
sibling as a single token for grouping and sorting.

## Explanation

Bucket aggregations split documents into groups. `terms` and `range` are bucket
aggregations; `date_histogram` splits by time. Metric aggregations like `sum`,
`avg`, `stats`, and `percentiles` run inside each bucket.

Nesting aggregations lets you answer multi-level questions: monthly revenue per
category, average price per price range, or percentile latency per region. Set
`size: 0` and Elasticsearch skips the hits, returning only aggregation results.
Skipping the hits is faster when the documents themselves aren't needed.

```mermaid
flowchart LR
    A[Search request] --> B[Query / filter<br>narrows documents]
    B --> C[Bucket aggregations<br>group documents]
    C --> D[Metric aggregations<br>compute values]
    D --> E[Pipeline aggregations<br>derive from buckets]
    E --> F[Result JSON]
```

Aggregations run in two main phases: a shard-level phase and a reduce phase. During the shard-level phase, each shard handles its own documents and computes a partial result. In the reduce phase, the
coordinating node merges those partials into the final response. This design is
why `size: 0` is so effective: you skip the fetch and merge of the actual hits
and only ship the compact aggregation results.

The `terms` aggregation is approximate because it uses a per-shard priority
queue. Elasticsearch returns `doc_count_error_upper_bound` so you can judge how
much the count may be off. If exact counts matter, increase `shard_size` (the
default is the same as `size`) or switch to `composite`, which walks the
doc-values in sorted order.

For pagination, `composite` is the safest aggregation to use. It returns an `after_key` that you pass to the next request. Unlike `terms` with `from`, the `after_key` is
stable while new documents are being indexed. For the document side of paging,
see [Cursor-Based Pagination with PostgreSQL](/recipes/cursor-pagination-postgresql/).

Metric aggregations are generally exact, but `cardinality` isn't. It uses
HyperLogLog++ to estimate distinct counts with a configurable
`precision_threshold`. At `40000`, Elasticsearch keeps the error below 1%, which is usually fine for dashboard metrics. If you need exact unique counts, use a
`terms` aggregation with a large enough `size`, though it will consume more
memory.

Pipeline aggregations such as `derivative` and `moving_avg` are powerful but
costly. They run a second pass over the bucket list, so they push up CPU and memory
usage on large time ranges. I avoid them for dashboards with hundreds of
buckets and prefer to compute trends in the application layer when possible.

Text fields are analyzed and tokenized, so they can't be aggregated directly.
For counts, groupings, and filters, use the `.keyword` subfield: that sibling is
stored as a single unanalyzed token, which is exactly what aggregations need.

`post_filter` applies search filters after aggregations are computed. Use it
when users filter results but you want to keep the original facet counts.

## Variants

|| Aggregation | Use case | Key parameters |
|| --- | --- | --- |
|| `terms` | Count by category, brand, or status | `field`, `size`, `shard_size` |
|| `date_histogram` | Time-series bucketing | `field`, `calendar_interval` |
|| `range` | Predefined bands such as price tiers | `ranges` |
|| `composite` | Paginating over high-cardinality keys | `sources`, `size`, `after` |
|| `cardinality` | Approximate unique counts | `precision_threshold` |
|| `top_hits` | Best document per bucket | `size`, `sort`, `_source` |
|| `filter` | Conditional sub-aggregations | `filter` query |

Use this table as a quick reference, not as a replacement for the examples.
`terms` and `date_histogram` cover most day-to-day use cases, while `composite`
is the right choice when you need to stream buckets instead of returning a top-N.

## Best Practices

- Set `size: 0` when you only need aggregations and not the search hits.
- Aggregate on `keyword` subfields, not on analyzed `text` fields.
- Switch to `composite` when an aggregation could return more than a few
  thousand buckets.
- Enable `eager_global_ordinals` on fields you aggregate frequently, especially
  for high-cardinality `terms`.
- Use `post_filter` to filter returned results without changing aggregation
  counts.
- Tune `precision_threshold` on `cardinality` to balance memory and accuracy.
- Set a realistic `shard_size` for `terms` when counts need to be closer to
  exact; I usually start with `5 * size` and measure.
- Use `min_doc_count: 1` to drop empty buckets unless you actually need them.
- Cache expensive aggregation requests with the
  [request cache](https://www.elastic.co/guide/en/elasticsearch/reference/current/shard-request-cache.html)
  when the underlying data doesn't change often.

## Common Mistakes

- Aggregating on a `text` field instead of its `.keyword` subfield.
- Setting `size: 10000` on a `terms` aggregation and assuming the cluster has
  unlimited heap.
- Paginating large `terms` results without `composite`.
- Forgetting that `terms` and `cardinality` return approximate counts.
- Running heavy pipeline aggregations on very large time ranges.
- Using `from` on a `terms` aggregation and getting unstable results.
- Ignoring `doc_count_error_upper_bound` and treating `terms` counts as exact.
- Running `top_hits` without a `sort`, which makes the returned document
  unpredictable.

## See Also

- [Full-Text Search](/recipes/full-text-search/) — for the query side of the same use case.
- [Complete Guide to Elasticsearch Cluster Setup](/guides/complete-guide-elasticsearch-cluster-setup/) —
  when you want to scale from a single node to production.
- [Database Views and Materialized Views](/recipes/database-views-materialized/) —
  an alternative to real-time aggregations when precomputed results are enough.
- [Elasticsearch Aggregations](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations.html) —
  official reference.
- [Composite aggregation](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-composite-aggregation.html) —
  official docs for deep pagination.
- [Cardinality aggregation](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-cardinality-aggregation.html) —
  details on `precision_threshold`.

## FAQ

### Can I combine multiple aggregations in one query?

Yes. You can place several top-level aggregations and nest bucket and metric
aggregations inside each other in the same request.

### How do I filter results without changing aggregation counts?

Use `post_filter` when you want filters applied after the aggregations are
computed.
The aggregations see the full query, while the returned hits are filtered.

### Are Elasticsearch aggregations exact on large datasets?

`terms` and `cardinality` are approximate, so don't expect exact counts.
Increase `shard_size`, use `composite` for exact counts, or raise
`precision_threshold` to improve cardinality accuracy.

### Why should I use `composite` instead of `terms` for pagination?

`composite` returns a stable `after_key` and walks the result set in sorted
order. `terms` pagination with `from` isn't reliable because bucket order can
change as data is indexed.

### What is the difference between `filter` and `post_filter`?

A `filter` aggregation adds a bucket under the aggregation tree. `post_filter`
applies only to the search hits, so the aggregation values stay the same.

### How do I debug slow aggregation queries?

Start with the
[Profile API](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-profile.html).
It breaks each aggregation phase into `collect`, `build_aggregation`, and
`reduce` times, so you can see whether the slowness is at the shard or reduce
level. You can also enable `slow_log` for queries that exceed a threshold value.
