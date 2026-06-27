---
contentType: guides
slug: full-text-search-guide
title: "Búsqueda de Texto Completo — Implementa una Búsqueda que Realmente Funcione"
description: "Guía práctica sobre búsqueda de texto completo: tsvector de PostgreSQL, indexación en Elasticsearch, diseño de consultas, ajuste de relevancia, y construcción de búsqueda con autocompletado, faceting y tolerancia a errores tipográficos."
metaDescription: "Aprende búsqueda de texto completo: PostgreSQL tsvector, Elasticsearch, relevancia, autocompletado y faceting."
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
  metaDescription: "Aprende búsqueda de texto completo: PostgreSQL tsvector, Elasticsearch, relevancia, autocompletado y faceting."
  keywords:
    - full-text-search
    - elasticsearch
    - postgresql
    - search
    - indexing
    - relevance
    - guide
---

## Descripción General

La búsqueda de texto completo transforma texto crudo en resultados consultables y ranqueados. A diferencia de simples consultas `LIKE '%término%'` que escanean tablas completas, la búsqueda de texto completo usa índices invertidos, stemming, algoritmos de ranqueo, y puntuación de relevancia para devolver resultados significativos en milisegundos.

Esta guía cubre búsqueda integrada de PostgreSQL, Elasticsearch para casos de uso avanzados, diseño de consultas y ajuste de producción.

## Cuándo Usar

- Los usuarios necesitan buscar en múltiples campos de texto (título, descripción, etiquetas, contenido)
- Las consultas `LIKE` tardan más de 100ms en datos de producción
- Necesitas resultados ranqueados (más relevantes primero, no más recientes)
- La búsqueda debe soportar stemming (buscar "correr" coincide con "corriendo")
- Quieres autocompletado, tolerancia a errores tipográficos, o búsqueda facetada
- Necesitas buscar en millones de documentos

## Cuándo NO Usar

- Búsquedas simples de coincidencia exacta en columnas indexadas — usa `=` o índices `B-tree`
- Búsquedas de rangos numéricos o de fechas — usa índices estándar
- Tu dataset tiene menos de 10,000 filas y `ILIKE` es suficientemente rápido
- Solo necesitas coincidencia por prefijo en una sola columna — usa `text_pattern_ops`

## Conceptos Clave

| Concepto | Descripción |
|---------|-------------|
| **Índice Invertido** | Mapea términos a los documentos que los contienen |
| **Tokenización** | Dividir texto en términos buscables (palabras, n-gramas) |
| **Stemming** | Reducir palabras a su forma raíz (corriendo → correr) |
| **Puntuación de Relevancia** | Ranqueo numérico de qué tan bien un documento coincide con una consulta |
| **Faceting** | Contar resultados por categoría para filtrado de UI |
| **Tolerancia a Errores** | Coincidir documentos a pesar de errores de ortografía |

## Búsqueda de Texto Completo en PostgreSQL

Comienza con búsqueda integrada antes de agregar Elasticsearch:

### 1. Crear un Índice de Búsqueda

```sql
-- Agregar columna tsvector e índice
ALTER TABLE products ADD COLUMN search_vector tsvector;

-- Crear índice GIN para consultas de texto completo rápidas
CREATE INDEX idx_products_search ON products USING GIN(search_vector);

-- Actualizar vector de búsqueda con contenido ponderado
UPDATE products SET search_vector =
    setweight(to_tsvector('spanish', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(tags::text, '')), 'C');
```

### 2. Construir una Consulta de Búsqueda

```sql
-- Búsqueda ranqueada básica
SELECT 
    id, 
    name, 
    description,
    ts_rank(search_vector, query) as rank
FROM products, 
    plainto_tsquery('spanish', 'auriculares inalámbricos') query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;

-- Búsqueda con resaltado (mostrar texto coincidente)
SELECT 
    id,
    name,
    ts_headline('spanish', description, query) as highlighted
FROM products,
    plainto_tsquery('spanish', 'cancelación de ruido') query
WHERE search_vector @@ query;

-- Búsqueda filtrada con facets
SELECT 
    category,
    count(*) as product_count,
    avg(ts_rank(search_vector, query)) as avg_relevance
FROM products,
    plainto_tsquery('spanish', 'teclado gaming') query
WHERE search_vector @@ query
GROUP BY category
ORDER BY product_count DESC;
```

### 3. Mantener el Índice Actualizado

```sql
-- Trigger para auto-actualizar vector de búsqueda al cambiar
CREATE OR REPLACE FUNCTION products_search_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('spanish', coalesce(NEW.name, '')), 'A') ||
        setweight(to_tsvector('spanish', coalesce(NEW.description, '')), 'B') ||
        setweight(to_tsvector('spanish', coalesce(NEW.tags::text, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_search_trigger
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION products_search_update();
```

**Capacidades de búsqueda de PostgreSQL:**

| Característica | Soporte | Notas |
|----------------|---------|-------|
| Stemming | Sí | Integrado en diccionarios de búsqueda de texto |
| Ranqueo | Sí | `ts_rank()` y `ts_rank_cd()` |
| Resaltado | Sí | `ts_headline()` para vistas previas de resultados |
| Múltiples idiomas | Sí | Selección de idioma por columna o por consulta |
| Búsqueda por prefijo | Parcial | Usar `to_tsquery('spanish', 'inalámbrico:*')` |
| Tolerancia a errores | No | Requiere pg_trgm o motor externo |
| Coincidencia difusa | Parcial | Similitud de `pg_trgm` para errores tipográficos |

## Elasticsearch para Búsqueda Avanzada

Cuando PostgreSQL no es suficiente, Elasticsearch proporciona búsqueda distribuida y escalable:

### 1. Definir un Mapping de Índice

```json
// Mapping de índice Elasticsearch para productos de e-commerce
PUT /products
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "custom_spanish": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "spanish_stop", "spanish_stemmer", "synonym_filter"]
        }
      },
      "filter": {
        "spanish_stop": { "type": "stop", "stopwords": "_spanish_" },
        "spanish_stemmer": { "type": "stemmer", "language": "spanish" },
        "synonym_filter": { "type": "synonym", "synonyms": ["laptop, portátil, notebook, computadora portátil"] }
      }
    }
  },
  "mappings": {
    "properties": {
      "name": { 
        "type": "text", 
        "analyzer": "custom_spanish",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "description": { "type": "text", "analyzer": "custom_spanish" },
      "category": { "type": "keyword" },
      "price": { "type": "float" },
      "tags": { "type": "keyword" },
      "in_stock": { "type": "boolean" }
    }
  }
}
```

### 2. Construir Consultas de Búsqueda

```json
// Búsqueda multi-match con boosting
GET /products/_search
{
  "query": {
    "bool": {
      "must": {
        "multi_match": {
          "query": "auriculares gaming inalámbricos",
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
# Ejemplo: Cliente Python de Elasticsearch
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

### 3. Implementar Autocompletado

```json
// Suggester de completado para autocompletado
PUT /products/_mapping
{
  "properties": {
    "suggest": {
      "type": "completion"
    }
  }
}

// Indexar documentos con sugerencias
POST /products/_doc/1
{
  "name": "Auriculares Gaming Inalámbricos",
  "suggest": {
    "input": ["auriculares gaming inalámbricos", "gaming auriculares", "auriculares inalámbricos"],
    "weight": 10
  }
}

// Consulta para autocompletado
GET /products/_search
{
  "suggest": {
    "product-suggest": {
      "prefix": "auri",
      "completion": {
        "field": "suggest",
        "fuzzy": { "fuzziness": "AUTO" }
      }
    }
  }
}
```

## Implementación de Búsqueda Paso a Paso

### 1. Elige tu Motor

| Caso de Uso | PostgreSQL | Elasticsearch | Meilisearch |
|-------------|------------|---------------|-------------|
| <100k documentos | ✅ Excelente | Exceso | Exceso |
| <1M documentos, ranqueo simple | ✅ Bueno | Opcional | ✅ Bueno |
| Búsqueda difusa/errores tipográficos | ⚠️ Parcial | ✅ Excelente | ✅ Excelente |
| E-commerce facetado | ⚠️ Complejo | ✅ Excelente | ✅ Bueno |
| Escala distribuida | ❌ No | ✅ Integrado | ❌ Nodo único |
| Actualizaciones en tiempo real | ✅ Instantáneo | ✅ Casi instantáneo | ✅ Instantáneo |
| Ajuste complejo de relevancia | ⚠️ Limitado | ✅ Muy flexible | ✅ Simple |

### 2. Diseña tu Índice

```sql
-- PostgreSQL: Un vector de búsqueda por tabla
-- Estrategia: Ponderar campos por importancia

-- Peso A (más importante): nombre de producto, SKU exacto
-- Peso B (importante): descripción, resumen corto
-- Peso C (menos importante): etiquetas, especificaciones

UPDATE products SET search_vector =
    setweight(to_tsvector('spanish', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(sku, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(category, '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(array_to_string(tags, ' '), '')), 'C');
```

```json
// Elasticsearch: Mappings multi-campo
{
  "mappings": {
    "properties": {
      "name": {
        "type": "text",
        "analyzer": "spanish",
        "fields": {
          "keyword": { "type": "keyword" },
          "suggest": { "type": "completion" }
        }
      }
    }
  }
}
```

### 3. Ajusta la Relevancia

```sql
-- PostgreSQL: Ranqueo personalizado con pesos de campo
SELECT 
    id, name,
    ts_rank_cd('{0.1, 0.2, 0.4, 1.0}', search_vector, query, 32) as rank
FROM products,
    plainto_tsquery('spanish', 'soporte laptop') query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

```json
// Elasticsearch: Function score para ranqueo personalizado
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

### 4. Sincroniza Datos al Índice de Búsqueda

```python
# Ejemplo: Sincronizar cambios de base de datos a Elasticsearch
from elasticsearch import Elasticsearch
import psycopg2

es = Elasticsearch(['http://localhost:9200'])

def sync_product_to_es(product_id):
    """Sincronizar un producto a Elasticsearch."""
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
    """Reindexación completa — ejecutar durante ventana de mantenimiento."""
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

## Mejores Prácticas

- **Comienza con PostgreSQL.** Agrega Elasticsearch solo cuando necesites características que PostgreSQL no puede proporcionar.
- **Usa triggers de base de datos o CDC para sincronización.** No confíes en código de aplicación para mantener índices de búsqueda actualizados.
- **Indexa solo campos buscables.** Incluir blobs de texto grandes en tu índice de búsqueda desperdicia espacio y ralentiza indexación.
- **Prueba con consultas reales.** Consultas benchmark sintéticas no coinciden con patrones de búsqueda de usuarios reales.
- **Monitorea latencia de consulta.** La búsqueda es orientada al usuario; picos de latencia impactan directamente la conversión.
- **Implementa analytics de búsqueda.** Rastrea qué buscan los usuarios, qué hacen clic y cuándo obtienen cero resultados.

## Errores Comunes

- **`LIKE '%término%'` en tablas grandes.** Esto realiza un escaneo completo de tabla. Siempre usa índices de texto completo.
- **No actualizar índices de búsqueda.** Resultados de búsqueda obsoletos son peores que búsqueda lenta.
- **Sobre-ingeniería con Elasticsearch.** Para casos de uso simples, la búsqueda de PostgreSQL es más rápida de implementar y operar.
- **Ignorar retroalimentación de relevancia.** Si los usuarios consistentemente refinan búsquedas, tu ranqueo está mal.
- **Sin estrategia para cero resultados.** Cuando la búsqueda no devuelve nada, muestra categorías relacionadas o artículos populares.
- **Búsqueda sensible a mayúsculas/minúsculas.** Usa `to_tsvector` (PostgreSQL) o filtro `lowercase` (Elasticsearch), no `LIKE`.

## Variantes

- **pg_trgm para coincidencia difusa:** Similitud de trigramas para tolerancia a errores tipográficos en PostgreSQL
- **Meilisearch:** Alternativa amigable para desarrolladores a Elasticsearch con tolerancia a errores integrada
- **Typesense:** Búsqueda open-source con búsqueda instantánea y capacidades de geo-búsqueda
- **Búsqueda SaaS:** Algolia, Swiftype — gestionado, costoso a escala, más rápido de implementar
- **Búsqueda vectorial:** Pinecone, Weaviate, pgvector — búsqueda semántica con embeddings

## FAQ

**P: ¿Debería usar PostgreSQL o Elasticsearch para búsqueda?**
Comienza con PostgreSQL si tienes <1M documentos y no necesitas coincidencia difusa o faceting complejo. Mueve a Elasticsearch cuando la búsqueda se convierta en una característica principal con requisitos avanzados.

**P: ¿Cómo mantengo Elasticsearch sincronizado con mi base de datos?**
Usa Change Data Capture (Debezium), triggers de base de datos con una cola de mensajes, o escrituras duales a nivel de aplicación. CDC es el más confiable.

**P: ¿Cómo manejo cero resultados de búsqueda?**
Muestra productos populares, categorías relacionadas, o una sugerencia de "¿quisiste decir?". Registra la consulta para análisis.

**P: ¿Puedo usar PostgreSQL para autocompletado?**
Sí, con la extensión `pg_trgm`: `SELECT word FROM words WHERE word % 'parial' ORDER BY similarity(word, 'parial') DESC LIMIT 5;`

## Conclusión

La búsqueda de texto completo es una característica orientada al usuario donde el rendimiento y la relevancia impactan directamente el engagement. Al elegir el motor correcto para tu escala, diseñar índices para tus patrones de consulta, y ajustar continuamente la relevancia, construyes búsqueda en la que los usuarios confían y dependen.

## Recursos Relacionados

- [Sharding de Base de Datos](/guides/data/database-sharding-implementation-guide)
- [Réplicas de Lectura](/guides/data/read-replica-guide)
- [Estrategias de Caché](/guides/data/caching-strategies-guide)
- [Testing de Rendimiento](/guides/performance/performance-testing-guide)
- [Escalado](/guides/devops/scaling-guide)
