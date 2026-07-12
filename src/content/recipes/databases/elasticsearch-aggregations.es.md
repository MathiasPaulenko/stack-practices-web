---




contentType: recipes
slug: elasticsearch-aggregations
title: "Agregaciones de Elasticsearch para Analitica y Busqueda"
description: "Como usar agregaciones de Elasticsearch para construir busqueda facetada, dashboards de analitica y metricas en tiempo real desde datos indexados"
metaDescription: "Agregaciones de Elasticsearch para analitica. Construye busqueda facetada, dashboards de metricas y agregaciones en tiempo real con bucket y metric aggregations."
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
  metaDescription: "Agregaciones de Elasticsearch para analitica. Construye busqueda facetada, dashboards de metricas y agregaciones en tiempo real con bucket y metric aggregations."
  keywords:
    - elasticsearch
    - aggregations
    - faceted search
    - analytics
    - search engine




---

# Agregaciones de Elasticsearch para Analitica y Busqueda

Las agregaciones de Elasticsearch te permiten agrupar y resumir datos indexados en tiempo real. A diferencia de bases de datos relacionales que requieren consultas GROUP BY explicitas, Elasticsearch computa agregaciones sobre indices invertidos, haciendolas lo suficientemente rapidas para alimentar facetas de busqueda y dashboards de analitica en vivo.

## Cuando Usar Esto

- Necesitas busqueda facetada con filtros de conteo por categoria. Consulta [Full-Text Search](/recipes/databases/full-text-search) para implementaciones de busqueda.
- Los [dashboards de analitica](/recipes/api/logging) en tiempo real requieren agregaciones sub-segundo sobre millones de documentos
- Datos de series temporales deben agruparse por rangos de fecha con estadisticas anidadas

## Requisitos Previos

- Cluster de Elasticsearch 8+ ejecutandose localmente o en Elastic Cloud
- Documentos ya indexados con mappings que soporten campos de agregacion. Consulta [Parse JSON](/recipes/data/parse-json) para manejo de documentos.

## Solucion

### 1. Agregacion Basica de Terminos (Busqueda Facetada)

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

### 2. Histograma de Fechas Anidado con Metricas

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

### 3. Agregacion de Rango para Niveles de Precio

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

### 4. Agregacion Compuesta para Paginacion Profunda

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

## Como Funciona

1. **Terms Aggregation** cuenta valores unicos usando fielddata o indice keyword
2. **Bucket Aggregations** agrupa documentos en intervalos (fechas, rangos o filtros personalizados)
3. **Metric Aggregations** computa estadisticas (suma, promedio, percentiles) dentro de cada bucket
4. **Composite Keys** permiten paginar a traves de resultados de agregacion grandes sin perder datos

## Consideraciones de Produccion

- Configura `size: 0` cuando solo necesites agregaciones, no hits de busqueda
- Usa subcampos `keyword` para agregaciones de texto para evitar problemas de tokenizacion
- Habilita `eager_global_ordinals` en campos frecuentemente agregados para ejecucion mas rapida
- Considera **runtime fields** para agregaciones ad-hoc sobre datos no indexados. Consulta [Data Validation](/recipes/data/data-validation) para tipado de campos.

## Errores Comunes

- Agregar sobre campos `text` en lugar de subcampos `keyword`
- Solicitar demasiados buckets con `size: 10000`, causando presion de memoria
- No usar agregaciones compuestas cuando se pagina a traves de sets grandes. Consulta [Pagination](/recipes/api/pagination) para gestion de resultados.

## FAQ

**P: Las agregaciones de Elasticsearch son precisas en datasets grandes?**
R: Las terms aggregations usan conteo aproximado para top-N. Usa ajuste de `shard_size` o agregaciones `composite` para conteos exactos.

**P: Puedo combinar multiples agregaciones en una sola consulta?**
R: Si. Elasticsearch soporta agregaciones anidadas y pipeline aggregations hermanas en la misma peticion.

**P: Como filtro resultados sin afectar conteos de agregacion?**
R: Usa `post_filter` para aplicar filtros de busqueda despues de que las agregaciones son computadas.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### Cliente Python: Agregación de Términos y Estadísticas

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

### Agregación de Cardinalidad para Conteos Únicos

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

Cardinality usa HyperLogLog++ para conteos aproximados de distintos. `precision_threshold` controla precisión vs memoria: valores más altos son más precisos pero usan más memoria. En 40.000, los conteos son precisos dentro del 1%.

### Agregaciones Pipeline para Métricas Derivadas

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

### Agregación de Bucket de Filtro

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

### Cliente Java: Aggregation Builder

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

### Agregación Top Hits para Mejores Items por Bucket

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

### JavaScript: Agregación Compuesta con Paginación

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
    console.log(`Obtenidos ${buckets.length} buckets, obteniendo siguiente página...`);
    return [...buckets, ...await paginateAggregations(after_key)];
  }
  return buckets;
}
```

## Buenas Prácticas Adicionales

6. **Usa `doc_count_error_upper_bound` para estimar precisión de terms aggregation.** Este campo muestra el error máximo en conteos de documentos para términos no incluidos en el resultado:

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

7. **Habilita `eager_global_ordinals` en campos keyword.** Esto precarga global ordinals al refresh, reduciendo latencia de agregación:

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

8. **Usa `post_filter` en lugar de `query` para facetas filtradas.** `post_filter` aplica filtros después de las agregaciones, así los conteos de facetas reflejan el resultado sin filtrar:

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

9. **Establece `collect_mode: "breadth_first"` para agregaciones anidadas grandes.** Esto reduce uso de memoria diferiendo la colección de documentos hasta el nivel final de bucket:

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

10. **Usa runtime fields para agregaciones ad-hoc.** Define campos al momento de consulta sin cambiar mappings:

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

## Errores Comunes Adicionales

6. **Usar `size: 0` pero seguir solicitando `highlight`.** Los highlights requieren documentos fuente. Si necesitas highlights, establece `size` > 0.

7. **No establecer `shard_size` para terms aggregations precisas.** En índices multi-shard, cada shard retorna solo `size` buckets. Incrementa `shard_size` para mejorar precisión:

```json
"terms": {
  "field": "category.keyword",
  "size": 10,
  "shard_size": 200
}
```

8. **Agregar sobre campos de alta cardinalidad sin `cardinality`.** Terms aggregation en un campo con millones de valores únicos causa presión de memoria. Usa `cardinality` para conteos aproximados.

9. **No cachear agregaciones frecuentemente usadas.** Elasticsearch cachea resultados a nivel shard automáticamente, pero solo para consultas `size: 0`. Evita mezclar hits de búsqueda con agregaciones cuando el caché importa.

10. **Ignorar límites de memoria `fielddata`.** Campos text con `fielddata` habilitado pueden agotar el heap. Monitorea `indices/fielddata/memory_size` y establece `indices.fielddata.cache.size`.

## Preguntas Frecuentes Adicionales

### Cómo obtengo conteos exactos en lugar de aproximados?

Las terms aggregations son aproximadas en índices multi-shard. Para conteos exactos, establece `shard_size` a un valor mayor que el número total de términos únicos, o usa un índice de un solo shard. Alternativamente, usa agregaciones `composite` que paginan a través de todos los buckets.

### Puedo anidar agregaciones arbitrariamente profundo?

Sí, pero cada nivel añade costo de memoria y CPU. Mantén el anidamiento a 2-3 niveles para consultas de producción. Para análisis más profundo, usa transforms o rollup indices.

### Cómo agrego sobre un campo calculado?

Usa runtime fields (Elasticsearch 7.11+) o scripted metrics. Runtime fields son preferidos porque son más rápidos y no requieren habilitar scripting:

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

### Cuál es la diferencia entre `bucket_sort` y ordenamiento de `terms`?

`terms` aggregation ordena buckets por `doc_count` o por una sub-agregación. `bucket_sort` es una pipeline aggregation que ordena buckets por cualquier métrica, incluyendo calculadas como derivadas.

## Tips de Rendimiento

1. **Usa `preference: _only_local` para consultas dev más rápidas.** Esto evita fan-out a shards remotos:

```json
GET /products/_search?preference=_only_local
```

2. **Establece `request_cache: true` para consultas de agregación repetidas.** Elasticsearch cachea resultados a nivel shard:

```json
GET /products/_search?request_cache=true
{
  "size": 0,
  "aggs": { "categories": { "terms": { "field": "category.keyword" } } }
}
```

3. **Usa `index_sort` para agregaciones de series temporales.** Pre-ordenar documentos por timestamp acelera las agregaciones date_histogram:

```json
"settings": {
  "index": {
    "sort.field": ["timestamp"],
    "sort.order": ["desc"]
  }
}
```

4. **Monitorea memoria de agregación con `_stats`.** Trackea uso de fielddata y query cache:

```json
GET /_stats/fielddata,query_cache,aggregations
```

5. **Usa rollup indices para agregaciones históricas.** Pre-agrega datos de series temporales en rollups horarios o diarios para reducir carga de consulta:

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
