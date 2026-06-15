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
  - full-text-search
  - elasticsearch
  - meilisearch
  - postgresql
  - search
  - python
  - javascript
  - java
relatedResources:
  - /recipes/database-transactions
  - /patterns/abstract-factory-pattern
  - /patterns/adapter-pattern
  - /patterns/builder-pattern
  - /patterns/command-pattern
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

La búsqueda de texto completo permite que los usuarios encuentren documentos por relevancia en lugar de coincidencia exacta de subcadenas. A diferencia de `LIKE '%query%'`, que escanea tablas completas, los índices de texto completo tokenizan el contenido y clasifican resultados. Esta receta cubre las implementaciones de PostgreSQL `tsvector`, Elasticsearch y Meilisearch en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Los usuarios necesiten buscar artículos, productos o documentos con tolerancia a errores tipográficos
- Tu app requiera resultados clasificados, búsqueda facetada o resaltado
- Las consultas `LIKE` sean demasiado lentas en tablas con >100k filas
- Quieras comportamiento de búsqueda mientras escribes (autocompletado)

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

## Mejores Prácticas

- **Usa índices GIN en PostgreSQL**: Las consultas `to_tsvector` sin índice son escaneos completos de tabla.
- **Limita campos buscables**: Indexar cada columna desperdicia espacio y degrada relevancia.
- **Aplica stemming antes de indexar**: "corriendo" y "correr" deberían coincidir con el mismo documento.
- **Resalta términos coincidentes**: Los usuarios necesitan confirmación visual de por qué un resultado coincidió.
- **Monitorea el tamaño del índice**: Los índices de texto completo pueden crecer 2-5x respecto a los datos fuente.

## Errores Comunes

- **Usar `LIKE '%term%'` en tablas grandes**: Los escaneos secuenciales matan el rendimiento pasadas las 100k filas.
- **No configurar stop words**: "El" no debería influir en el ranking.
- **Ignorar la latencia de refresco del índice**: Elasticsearch es casi en tiempo real, no instantáneo.
- **Almacenar todos los datos en el motor de búsqueda**: Usa IDs de búsqueda para obtener registros completos de la base de datos.
- **Sin timeout en consultas**: Una consulta malformada puede colgar por minutos en índices no optimizados.

## Preguntas Frecuentes

### Debería usar PostgreSQL full-text search o un motor dedicado?

Usa PostgreSQL si tus datos viven en PG, la búsqueda es secundaria y no necesitas tolerancia a errores tipográficos ni facetado. Usa Meilisearch o Elasticsearch para características de búsqueda primarias, alto tráfico o filtrado complejo.

### Cómo manejo sinónimos (ej. "laptop" = "notebook")?

Meilisearch y Elasticsearch soportan diccionarios de sinónimos. En PostgreSQL, puedes expandir consultas manualmente con una tabla de sinónimos o usar diccionarios `synonym` vía `CREATE TEXT SEARCH DICTIONARY`.

### Por qué mis resultados de búsqueda no se actualizan inmediatamente después de insertar?

Elasticsearch refresca índices en un horario (default 1s). Meilisearch es casi instantáneo. PostgreSQL `tsvector` solo se actualiza cuando reindexas o usas un trigger. Para tiempo real, usa un trigger `BEFORE INSERT OR UPDATE` que regenere la columna `tsvector`.
