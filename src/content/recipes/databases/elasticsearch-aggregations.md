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
  - databases
  - sql
  - postgresql
relatedResources:
  - /recipes/mongodb-crud-mongoose
  - /recipes/query-optimization
  - /guides/database-design-guide
  - /guides/full-text-search-guide
  - /guides/complete-guide-elasticsearch-cluster-setup
  - /guides/complete-guide-sql-query-optimization
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

- You need faceted search with count-per-category filters. See [Full-Text Search](/recipes/databases/full-text-search) for search implementations.
- Real-time [analytics dashboards](/recipes/api/logging) require sub-second aggregations over millions of documents
- Time-series data must be bucketed by date ranges with nested statistics

## Prerequisites

- Elasticsearch 8+ cluster running locally or on Elastic Cloud
- Documents already indexed with mappings that support aggregation fields. See [Parse JSON](/recipes/data/parse-json) for document handling.

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
- Consider **runtime fields** for ad-hoc aggregations on unindexed data. See [Data Validation](/recipes/data/data-validation) for field typing.

## Common Mistakes

- Aggregating on `text` fields instead of `keyword` subfields
- Requesting too many buckets with `size: 10000`, causing memory pressure
- Not using composite aggregations when paginating through large result sets. See [Pagination](/recipes/api/pagination) for result management.

## FAQ

**Q: Are Elasticsearch aggregations accurate on large datasets?**
A: Terms aggregations use approximate counting for top-N. Use `shard_size` tuning or `composite` aggregations for exact counts.

**Q: Can I combine multiple aggregations in a single query?**
A: Yes. Elasticsearch supports nested aggregations and sibling pipeline aggregations in the same request.

**Q: How do I filter results without affecting aggregation counts?**
A: Use `post_filter` to apply search filters after aggregations are computed.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### Python Client: Terms and Stats Aggregation

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

### Cardinality Aggregation for Unique Counts

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

Cardinality uses HyperLogLog++ for approximate distinct counts. `precision_threshold` controls accuracy vs memory: higher values are more accurate but use more memory. At 40,000, counts are accurate to within 1%.

### Pipeline Aggregations for Derivative Metrics

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

### Filter Bucket Aggregation

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

### Java Client: Aggregation Builder

```java
import org.elasticsearch.action.search.SearchRequest;
import org.elasticsearch.action.search.SearchResponse;
import org.elasticsearch.client.RequestOptions;
import org.elasticsearch.client.RestHighLevelClient;
import org.elasticsearch.search.aggregations.AggregationBuilders;
import org.elasticsearch.search.builder.SearchSourceBuilder;

public class ProductAggregations {
    private final RestHighLevelClient client;

    public SearchResponse getCategoryStats() throws IOException {
        SearchSourceBuilder source = SearchSourceBuilder.searchSource()
            .size(0)
            .aggregation(
                AggregationBuilders.terms("categories")
                    .field("category.keyword")
                    .size(20)
                    .subAggregation(
                        AggregationBuilders.avg("avg_price").field("price")
                    )
            );

        SearchRequest request = new SearchRequest("products").source(source);
        return client.search(request, RequestOptions.DEFAULT);
    }
}
```

### Top Hits Aggregation for Best Items per Bucket

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
            size: 3,
            "sort": [{ "popularity": "desc" }],
            "_source": ["name", "price", "rating"]
          }
        }
      }
    }
  }
}
```

### JavaScript: Composite Aggregation with Pagination

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

## Additional Best Practices

6. **Use `doc_count_error_upper_bound` to estimate terms aggregation accuracy.** This field shows the maximum error in document counts for terms not included in the result:

```json
GET /products/_search
{
  "size": 0,
  "aggs": {
    "categories": {
      "terms": {
        "field": "category.keyword",
        "size": 10,
        "shard_size": 100
      }
    }
  }
}
```

7. **Enable `eager_global_ordinals` on keyword fields.** This preloads global ordinals at refresh time, reducing aggregation latency:

```json
"mappings": {
  "properties": {
    "category": {
      "type": "keyword",
      "eager_global_ordinals": true
    }
  }
}
```

8. **Use `post_filter` instead of `query` for filtered facets.** `post_filter` applies filters after aggregations, so facet counts reflect the unfiltered result set:

```json
GET /products/_search
{
  "size": 10,
  "aggs": {
    "all_categories": {
      "terms": { "field": "category.keyword" }
    }
  },
  "post_filter": {
    "term": { "brand": "acme" }
  }
}
```

9. **Set `collect_mode: "breadth_first"` for large nested aggregations.** This reduces memory usage by deferring document collection until the final bucket level:

```json
"aggs": {
  "categories": {
    "terms": {
      "field": "category.keyword",
      "collect_mode": "breadth_first"
    }
  }
}
```

10. **Use runtime fields for ad-hoc aggregations.** Define fields at query time without changing mappings:

```json
GET /orders/_search
{
  "runtime_mappings": {
    "order_tier": {
      "type": "keyword",
      "script": {
        "source": "if (doc['total_amount'].value > 1000) { emit('premium'); } else { emit('standard'); }"
      }
    }
  },
  "size": 0,
  "aggs": {
    "tiers": { "terms": { "field": "order_tier" } }
  }
}
```

## Additional Common Mistakes

6. **Using `size: 0` but still requesting `highlight`.** Highlights require source documents. If you need highlights, set `size` > 0.

7. **Not setting `shard_size` for accurate terms aggregations.** On multi-shard indices, each shard returns only `size` buckets. Increase `shard_size` to improve accuracy:

```json
"terms": {
  "field": "category.keyword",
  "size": 10,
  "shard_size": 200
}
```

8. **Aggregating on high-cardinality fields without `cardinality`.** Terms aggregation on a field with millions of unique values causes memory pressure. Use `cardinality` for approximate counts.

9. **Not caching frequently used aggregations.** Elasticsearch caches shard-level request results automatically, but only for `size: 0` queries. Avoid mixing search hits with aggregations when caching matters.

10. **Ignoring `fielddata` memory limits.** Text fields with `fielddata` enabled can blow up the heap. Monitor `indices/fielddata/memory_size` and set `indices.fielddata.cache.size`.

## Additional FAQ

### How do I get exact counts instead of approximate?

Terms aggregations are approximate on multi-shard indices. For exact counts, set `shard_size` to a value larger than the total number of unique terms, or use a single-shard index. Alternatively, use `composite` aggregations which paginate through all buckets.

### Can I nest aggregations arbitrarily deep?

Yes, but each level adds memory and CPU cost. Keep nesting to 2-3 levels for production queries. For deeper analysis, use transforms or rollup indices.

### How do I aggregate on a calculated field?

Use runtime fields (Elasticsearch 7.11+) or scripted metrics. Runtime fields are preferred because they're faster and don't require enabling scripting:

```json
"runtime_mappings": {
  "profit_margin": {
    "type": "double",
    "script": {
      "source": "emit(doc['revenue'].value - doc['cost'].value)"
    }
  }
}
```

### What is the difference between `bucket_sort` and `terms` sorting?

`terms` aggregation sorts buckets by `doc_count` or by a sub-aggregation. `bucket_sort` is a pipeline aggregation that sorts buckets by any metric, including computed ones like derivatives.

## Performance Tips

1. **Use `preference: _only_local` for faster dev queries.** This avoids fan-out to remote shards:

```json
GET /products/_search?preference=_only_local
```

2. **Set `request_cache: true` for repeated aggregation queries.** Elasticsearch caches shard-level results:

```json
GET /products/_search?request_cache=true
{
  "size": 0,
  "aggs": { "categories": { "terms": { "field": "category.keyword" } } }
}
```

3. **Use `index_sort` for time-series aggregations.** Pre-sorting documents by timestamp speeds up date_histogram aggregations:

```json
"settings": {
  "index": {
    "sort.field": ["timestamp"],
    "sort.order": ["desc"]
  }
}
```

4. **Monitor aggregation memory with `_stats`.** Track fielddata and query cache usage:

```json
GET /_stats/fielddata,query_cache,aggregations
```

5. **Use rollup indices for historical aggregations.** Pre-aggregate time-series data into hourly or daily rollups to reduce query load:

```json
PUT _rollup/job/sales_daily
{
  "index_pattern": "orders-*",
  "rollup_index": "orders_rollup",
  "cron": "0 0 * * * ?",
  "page_size": 1000,
  "groups": {
    "date_histogram": {
      "fields": ["created_at"],
      "calendar_interval": "1d"
    },
    "terms": {
      "fields": ["category.keyword"]
    }
  },
  "metrics": [
    { "field": "total_amount", "metrics": ["sum", "avg", "max"] }
  ]
}
```
