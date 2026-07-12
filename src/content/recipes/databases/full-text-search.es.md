---


contentType: recipes
slug: full-text-search
title: "Búsqueda de Texto Completo"
description: "Cómo implementar búsqueda de texto completo con Elasticsearch, Meilisearch y PostgreSQL."
metaDescription: "Aprende a implementar búsqueda de texto completo en Python, JavaScript y Java. Cubre Elasticsearch, Meilisearch y PostgreSQL tsvector."
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - elasticsearch
  - databases
  - sql
  - postgresql
relatedResources:
  - /recipes/database-transactions
  - /patterns/abstract-factory-pattern
  - /patterns/adapter-pattern
  - /patterns/builder-pattern
  - /patterns/command-pattern
  - /recipes/caching-redis
  - /recipes/database-deadlocks-retries
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a implementar búsqueda de texto completo en Python, JavaScript y Java. Cubre Elasticsearch, Meilisearch y PostgreSQL tsvector."
  keywords:
    - busqueda texto completo postgresql
    - elasticsearch tutorial
    - meilisearch python
    - full text search java
    - tsvector postgresql


---
## Visión General

La búsqueda de texto completo permite que los usuarios encuentren documentos por relevancia en lugar de coincidencia exacta de subcadenas. A diferencia de `LIKE '%query%'`, que escanea tablas completas, los índices de texto completo tokenizan el contenido y clasifican resultados. Aqui se explica como las implementaciones de PostgreSQL `tsvector`, Elasticsearch y Meilisearch en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Los usuarios necesiten buscar artículos, productos o documentos con tolerancia a errores tipográficos. Consulta [Parse JSON](/recipes/data/parse-json) para indexación de documentos.
- Tu app requiera resultados clasificados, búsqueda facetada o resaltado
- Las consultas `LIKE` sean demasiado lentas en tablas con >100k filas. Consulta [Query Optimization](/recipes/databases/postgres-query-optimization) para ajuste de índices.
- Quieras comportamiento de búsqueda mientras escribes (autocompletado). Consulta [Input Validation](/recipes/api/input-validation) para sanitización de consultas.

## Solución

### Python (PostgreSQL + SQLAlchemy)

```python
from sqlalchemy import create_engine, Column, Integer, String, Text, func
from sqlalchemy.orm import declarative_base, Session

Base = declarative_base()

class Article(Base):
    __tablename__ = "articles"
    id = Column(Integer, primary_key=True)
    title = Column(String)
    content = Column(Text)

engine = create_engine("postgresql://user:pass@localhost/db")

# Crear índice GIN para tsvector
with engine.connect() as conn:
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_articles_search
        ON articles USING GIN (to_tsvector('english', title || ' ' || content));
    """)

def search(query: str):
    with Session(engine) as session:
        tsquery = func.plainto_tsquery("english", query)
        return session.query(Article).filter(
            func.to_tsvector("english", Article.title + " " + Article.content)
            .op("@@")(tsquery)
        ).all()
```

### JavaScript (Meilisearch)

```javascript
const { MeiliSearch } = require("meilisearch");

const client = new MeiliSearch({ host: "http://localhost:7700", apiKey: "masterKey" });
const index = client.index("articles");

async function setup() {
  await index.updateSettings({
    searchableAttributes: ["title", "content"],
    rankingRules: [
      "words",
      "typo",
      "proximity",
      "attribute",
      "sort",
      "exactness",
    ],
  });
}

async function search(query) {
  return await index.search(query, {
    attributesToHighlight: ["title", "content"],
    limit: 20,
  });
}

setup();
search("distributed systems").then(console.log);
```

### Java (Elasticsearch + RestHighLevelClient)

```java
import org.elasticsearch.action.search.SearchRequest;
import org.elasticsearch.action.search.SearchResponse;
import org.elasticsearch.client.RequestOptions;
import org.elasticsearch.client.RestHighLevelClient;
import org.elasticsearch.index.query.QueryBuilders;
import org.elasticsearch.search.builder.SearchSourceBuilder;

import java.io.IOException;

public class ArticleSearch {
    private final RestHighLevelClient client;

    public ArticleSearch(RestHighLevelClient client) {
        this.client = client;
    }

    public SearchResponse search(String query) throws IOException {
        SearchSourceBuilder source = SearchSourceBuilder.searchSource()
            .query(QueryBuilders.multiMatchQuery(query, "title", "content"))
            .size(20);

        SearchRequest request = new SearchRequest("articles").source(source);
        return client.search(request, RequestOptions.DEFAULT);
    }
}
```

## Explicación

La búsqueda de texto completo funciona en tres etapas:

1. **Tokenización**: El texto se divide en palabras, se normaliza (minúsculas, stemming) y se eliminan stop words ("el", "la", "y").
2. **Indexación**: Los tokens se almacenan en un índice invertido que mapea cada término a los documentos que lo contienen.
3. **Consulta**: La consulta se tokeniza de la misma forma, y el índice se consulta para documentos coincidentes, clasificados por algoritmos de relevancia.

PostgreSQL `tsvector` es excelente para casos simples sin infraestructura adicional. Meilisearch ofrece tolerancia a errores tipográficos, facetado y sinónimos listos para usar. Elasticsearch es el más potente pero también el más complejo de operar.

## Variantes

| Motor | Ideal Para | Complejidad de Setup | Tolerancia a Errores |
|-------|------------|----------------------|----------------------|
| PostgreSQL `tsvector` | Búsqueda simple sobre datos PG existentes | Baja | No |
| Meilisearch | Setup rápido, API moderna | Baja | Sí |
| Elasticsearch | Escala, agregaciones complejas | Alta | Sí (fuzzy) |
| SQLite FTS5 | Apps embebidas/móviles | Ninguna | Limitada |
| Typesense | Búsqueda instantánea, tolerancia a errores | Baja | Sí |

## Lo que funciona

- **Usa índices GIN en PostgreSQL**: Las consultas `to_tsvector` sin índice son escaneos completos de tabla. Consulta [Query Optimization](/recipes/databases/postgres-query-optimization) para indexación.
- **Limita campos buscables**: Indexar cada columna desperdicia espacio y degrada relevancia.
- **Aplica stemming antes de indexar**: "corriendo" y "correr" deberían coincidir con el mismo documento.
- **Resalta términos coincidentes**: Los usuarios necesitan confirmación visual de por qué un resultado coincidió.
- **Monitorea el tamaño del índice**: Los índices de texto completo pueden crecer 2-5x respecto a los datos fuente.

## Errores Comunes

- **Usar `LIKE '%term%'` en tablas grandes**: Los escaneos secuenciales matan el rendimiento pasadas las 100k filas.
- **No configurar stop words**: "El" no debería influir en el ranking.
- **Ignorar la latencia de refresco del índice**: Elasticsearch es casi en tiempo real, no instantáneo.
- **Almacenar todos los datos en el motor de búsqueda**: Usa IDs de búsqueda para obtener registros completos de la base de datos. Consulta [Data Validation](/recipes/data/data-validation) para integridad de datos.
- **Sin timeout en consultas**: Una consulta malformada puede colgar por minutos en índices no optimizados.

## Preguntas Frecuentes

### Debería usar PostgreSQL full-text search o un motor dedicado?

Usa PostgreSQL si tus datos viven en PG, la búsqueda es secundaria y no necesitas tolerancia a errores tipográficos ni facetado. Usa Meilisearch o Elasticsearch para capacidades de búsqueda primarias, alto tráfico o filtrado complejo.

### Cómo manejo sinónimos (ej. "laptop" = "notebook")?

Meilisearch y Elasticsearch soportan diccionarios de sinónimos. En PostgreSQL, puedes expandir consultas manualmente con una tabla de sinónimos o usar diccionarios `synonym` vía `CREATE TEXT SEARCH DICTIONARY`.

### Por qué mis resultados de búsqueda no se actualizan inmediatamente después de insertar?

Elasticsearch refresca índices en un horario (default 1s). Meilisearch es casi instantáneo. PostgreSQL `tsvector` solo se actualiza cuando reindexas o usas un trigger. Para tiempo real, usa un trigger `BEFORE INSERT OR UPDATE` que regenere la columna `tsvector`.

### Ranking en PostgreSQL con `ts_rank` y `ts_rank_cd`

```sql
SELECT
    title,
    ts_rank_cd(
        to_tsvector('english', title || ' ' || content),
        plainto_tsquery('english', 'database optimization')
    ) AS rank
FROM articles
WHERE to_tsvector('english', title || ' ' || content)
      @@ plainto_tsquery('english', 'database optimization')
ORDER BY rank DESC
LIMIT 20;
```

`ts_rank` calcula relevancia basada en frecuencia de términos. `ts_rank_cd` usa cover density, que mide qué tan cerca están los términos coincidentes entre sí. Cover density es usualmente mejor para documentos cortos.

### Búsqueda Trigram para Tolerancia a Errores en PostgreSQL

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice GIN para similitud trigram rápida
CREATE INDEX idx_articles_title_trgm
ON articles USING GIN (title gin_trgm_ops);

-- Coincidencia difusa con umbral de similitud
SELECT title, similarity(title, 'datbase optimiztion') AS sim
FROM articles
WHERE title % 'datbase optimiztion'
ORDER BY sim DESC
LIMIT 10;

-- Establecer umbral de similitud (0.0 a 1.0)
SET pg_trgm.similarity_threshold = 0.3;
```

### Consultas Fuzzy y Bool en Elasticsearch

```json
GET /articles/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "multi_match": {
            "query": "database optimization",
            "fields": ["title^2", "content"],
            "fuzziness": "AUTO",
            "prefix_length": 2
          }
        }
      ],
      "filter": [
        { "term": { "status": "published" } },
        { "range": { "published_at": { "gte": "2024-01-01" } } }
      ]
    }
  },
  "highlight": {
    "fields": {
      "title": { "number_of_fragments": 0 },
      "content": { "fragment_size": 150, "number_of_fragments": 3 }
    }
  }
}
```

### Trigger de Búsqueda PostgreSQL para Actualizaciones en Tiempo Real

```sql
-- Agregar columna tsvector generada
ALTER TABLE articles
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || content)) STORED;

-- Índice GIN en la columna generada
CREATE INDEX idx_articles_search_vector
ON articles USING GIN (search_vector);

-- Consultar usando la columna generada
SELECT title, ts_rank(search_vector, query) AS rank
FROM articles, plainto_tsquery('english', 'postgres indexing') query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

### Búsqueda Facetada con Meilisearch

```javascript
async function searchWithFacets(query, filters = {}) {
  return await index.search(query, {
    attributesToHighlight: ['title', 'content'],
    attributesToCrop: ['content'],
    cropLength: 50,
    limit: 20,
    filter: `status = "published" AND category = "${filters.category || ''}"`,
    facets: ['category', 'author', 'tags'],
  });
}
```

### Configuración de Sinónimos

```sql
-- PostgreSQL: crear diccionario de sinónimos
CREATE TEXT SEARCH DICTIONARY my_syn (
    TEMPLATE = synonym,
    SYNONYMS = 'my_synonyms'
);

-- Archivo: $SHAREDIR/tsearch_data/my_synonyms.syn
-- laptop notebook
-- mobile phone smartphone

-- Usar en configuración de búsqueda de texto
ALTER TEXT SEARCH CONFIGURATION english
ALTER MAPPING FOR word WITH my_syn;
```

```javascript
// Meilisearch: configurar sinónimos
await index.updateSettings({
  synonyms: {
    laptop: ['notebook'],
    notebook: ['laptop'],
    mobile: ['phone', 'smartphone'],
  },
});
```

## Buenas Prácticas Adicionales

6. **Usa consultas `phrase` para coincidencias exactas.** En PostgreSQL, `phraseto_tsquery` enforce el orden de palabras:

```sql
SELECT * FROM articles
WHERE to_tsvector('english', content) @@ phraseto_tsquery('english', 'database optimization');
```

7. **Configura `max_parallel_workers_per_gather` para índices grandes.** Los index scans paralelos aceleran consultas full-text en tablas grandes:

```sql
SET max_parallel_workers_per_gather = 4;
```

8. **Usa `copy_to` para indexación masiva en Elasticsearch.** En lugar de indexar documentos individuales, usa la bulk API:

```json
POST /_bulk
{"index": {"_index": "articles", "_id": "1"}}
{"title": "PostgreSQL Guide", "content": "..."}
{"index": {"_index": "articles", "_id": "2"}}
{"title": "MySQL Tuning", "content": "..."}
```

9. **Configura `search_path` para configs de búsqueda de texto PostgreSQL.** Usa la config de lenguaje correcta para tu contenido:

```sql
-- Para contenido en español
SELECT * FROM articles
WHERE to_tsvector('spanish', content) @@ plainto_tsquery('spanish', 'base de datos');
```

10. **Monitorea el uso de memoria del índice.** Elasticsearch almacena fielddata en memoria. Monitorea con `_stats/fielddata`:

```json
GET /_nodes/stats/indices/fielddata
```

## Errores Comunes Adicionales

6. **No configurar `analyzer` por campo.** Usar el analyzer estándar para snippets de código o URLs produce resultados pobres. Configura analyzers personalizados con tokenizers apropiados.

7. **Indexar HTML sin strippear tags.** Usa mapping `html_strip` o strippea tags antes de indexar:

```json
"content": {
  "type": "text",
  "analyzer": "standard",
  "fields": {
    "stripped": {
      "type": "text",
      "analyzer": "html_strip_analyzer"
    }
  }
}
```

8. **No usar `copy_to` para búsqueda multi-campo.** En lugar de consultar cada campo por separado, copia campos en un campo combinado:

```json
"mappings": {
  "properties": {
    "all_text": { "type": "text" },
    "title": { "type": "text", "copy_to": "all_text" },
    "content": { "type": "text", "copy_to": "all_text" }
  }
}
```

9. **Ignorar `search_analyzer` vs `index_analyzer`.** Usa diferentes analyzers para indexación (ej. stemming) y búsqueda (ej. sin stemming para coincidencias exactas de prefijo).

10. **No benchmarkear con datos de producción.** El rendimiento de búsqueda en 1.000 documentos difiere de 1M documentos. Siempre prueba con volúmenes de datos realistas.

## Preguntas Frecuentes Adicionales

### Cómo implemento autocompletado/búsqueda mientras escribes?

En PostgreSQL, usa índices trigram con coincidencia de prefijo `LIKE`:

```sql
SELECT title FROM articles
WHERE title LIKE 'postg%'
ORDER BY title
LIMIT 5;
```

En Elasticsearch, usa el tipo de campo `search_as_you_type` o edge n-grams:

```json
"title_suggest": {
  "type": "search_as_you_type"
}
```

En Meilisearch, el autocompletado está integrado — sin configuración necesaria.

### Cómo manejo búsqueda multi-idioma?

PostgreSQL soporta configs por idioma: `to_tsvector('spanish', content)`. Elasticsearch soporta analyzers multi-campo con diferentes analyzers de idioma. Meilisearch detecta el idioma automáticamente. Almacena el idioma por documento y usa el analyzer apropiado al consultar.

### Cuál es la diferencia entre `match` y `term` en Elasticsearch?

`match` analiza el string de consulta (tokeniza, minúsculas) antes de buscar. `term` busca el valor exacto sin análisis. Usa `term` para campos `keyword`, enums e IDs. Usa `match` para campos full-text.

## Tips de Rendimiento

1. **Usa `size: 0` cuando solo necesitas agregaciones.** Esto omite obtener documentos hits, reduciendo tamaño de respuesta y uso de memoria.

2. **Establece `timeout` en consultas de búsqueda.** Previene que consultas long-running bloqueen:

```json
GET /articles/_search
{
  "timeout": "5s",
  "query": { "match_all": {} }
}
```

3. **Usa `preference` para routing de shards consistente.** Rutea consultas repetidas del mismo usuario a los mismos shards para mejor utilización de caché:

```json
GET /articles/_search?preference=user_123
```

4. **Monitorea `pg_stat_statements` para consultas de búsqueda lentas.** Identifica consultas full-text que necesitan optimización:

```sql
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%to_tsvector%'
ORDER BY mean_exec_time DESC;
```

5. **Usa `index_options` para controlar el comportamiento de posting lists.** Para campos que necesitan consultas phrase, establece `index_options: "positions"`:

```json
"content": {
  "type": "text",
  "index_options": "positions"
}
```
