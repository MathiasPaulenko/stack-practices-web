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
relatedResources:
  - /recipes/databases/mongodb-crud-mongoose
  - /recipes/query-optimization
  - /guides/database-design-guide
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

- Necesitas busqueda facetada con filtros de conteo por categoria
- Los dashboards de analitica en tiempo real requieren agregaciones sub-segundo sobre millones de documentos
- Datos de series temporales deben agruparse por rangos de fecha con estadisticas anidadas

## Requisitos Previos

- Cluster de Elasticsearch 8+ ejecutandose localmente o en Elastic Cloud
- Documentos ya indexados con mappings que soporten campos de agregacion

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
- Considera **runtime fields** para agregaciones ad-hoc sobre datos no indexados

## Errores Comunes

- Agregar sobre campos `text` en lugar de subcampos `keyword`
- Solicitar demasiados buckets con `size: 10000`, causando presion de memoria
- No usar agregaciones compuestas cuando se pagina a traves de sets grandes

## FAQ

**P: Las agregaciones de Elasticsearch son precisas en datasets grandes?**
R: Las terms aggregations usan conteo aproximado para top-N. Usa ajuste de `shard_size` o agregaciones `composite` para conteos exactos.

**P: Puedo combinar multiples agregaciones en una sola consulta?**
R: Si. Elasticsearch soporta agregaciones anidadas y pipeline aggregations hermanas en la misma peticion.

**P: Como filtro resultados sin afectar conteos de agregacion?**
R: Usa `post_filter` para aplicar filtros de busqueda despues de que las agregaciones son computadas.
