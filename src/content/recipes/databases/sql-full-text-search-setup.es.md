---



contentType: recipes
slug: sql-full-text-search-setup
title: "Configurar índices de búsqueda de texto completo"
description: "Configura índices de búsqueda de texto completo en PostgreSQL para consultar grandes columnas de texto con ranking y resaltado."
metaDescription: "Configura búsqueda de texto completo en PostgreSQL. Crea índices GIN, consulta con tsvector y clasifica resultados por relevancia."
difficulty: intermediate
topics:
  - databases
tags:
  - sql
  - postgresql
  - full-text-search
  - gin
  - tsvector
relatedResources:
  - /guides/full-text-search-guide
  - /recipes/sql-find-duplicate-rows
  - /recipes/sql-index-optimization-analysis
  - /recipes/sql-migration-zero-downtime
  - /recipes/sql-partitioning-strategies
  - /recipes/database-migrations
  - /recipes/database-read-replicas
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Configura búsqueda de texto completo en PostgreSQL. Crea índices GIN, consulta con tsvector y clasifica resultados por relevancia."
  keywords:
    - sql
    - postgresql
    - búsqueda de texto completo
    - gin
    - tsvector



---


## Visión General

La búsqueda por patrones con `LIKE '%word%'` es lenta y no puede clasificar resultados por relevancia. La búsqueda de texto completo transforma el texto en tokens buscables, los indexa y permite consultar por significado en lugar de subcadena exacta. PostgreSQL tiene un motor de búsqueda de texto completo maduro integrado, así que puedes agregar búsqueda funcional sin servicios externos como Elasticsearch para muchos casos de uso.

## Cuándo Usar


- For alternatives, see [Full-Text Search — Implement Search That Actually Works](/es/guides/full-text-search-guide/).

Usa este recurso cuando:
- Los usuarios necesiten buscar en columnas de texto largo como artículos, tickets o descripciones de productos.
- Las consultas `LIKE` sean demasiado lentas o devuelvan demasiadas coincidencias irrelevantes.
- Quieras clasificar resultados por relevancia y resaltar términos coincidentes.
- Necesites stemming, manejo de stop words y diccionarios específicos por idioma.

## Solución

### Búsqueda de texto completo en PostgreSQL

```sql
-- Agregar una columna tsvector generada
ALTER TABLE articles
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || body)) STORED;

-- Crear un índice GIN para búsqueda rápida
CREATE INDEX idx_articles_search
ON articles USING GIN (search_vector);

-- Buscar y clasificar resultados
SELECT id, title, ts_rank_cd(search_vector, query) AS rank
FROM articles, plainto_tsquery('english', 'database indexing') query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

### Búsqueda con resaltado y snippets

```sql
-- Devolver snippets resaltados del texto coincidente
SELECT
  id,
  title,
  ts_headline('english', body, query, 'MaxWords=35, MinWords=15') AS snippet,
  ts_rank_cd(search_vector, query) AS rank
FROM articles, plainto_tsquery('english', 'database indexing') query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;
```

### Búsqueda ponderada en múltiples columnas

```sql
-- Ponderar coincidencias de título más que de cuerpo
ALTER TABLE articles
ADD COLUMN search_vector_weighted tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(body, '')), 'B')
) STORED;

CREATE INDEX idx_articles_search_weighted
ON articles USING GIN (search_vector_weighted);

-- Coincidencias de título clasifican más alto que las de cuerpo
SELECT id, title,
  ts_rank_cd(search_vector_weighted, query) AS rank
FROM articles, plainto_tsquery('english', 'database indexing') query
WHERE search_vector_weighted @@ query
ORDER BY rank DESC;
```

### Búsqueda de frases y proximidad

```sql
-- Coincidencia exacta de frase
SELECT id, title
FROM articles, phraseto_tsquery('english', 'database indexing') query
WHERE search_vector @@ query;

-- Proximidad: palabras dentro de 3 posiciones entre sí
SELECT id, title
FROM articles, to_tsquery('english', 'database <-> indexing') query
WHERE search_vector @@ query;

-- Palabras dentro de N posiciones: operador <N>
SELECT id, title
FROM articles, to_tsquery('english', 'database <3> indexing') query
WHERE search_vector @@ query;
```

### Búsqueda difusa con trigramas

```sql
-- Habilitar extensión pg_trgm
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Crear índice trigram para coincidencia difusa
CREATE INDEX idx_articles_title_trgm
ON articles USING GIN (title gin_trgm_ops);

-- Búsqueda difusa: encuentra títulos similares a 'databse indexing'
SELECT id, title, similarity(title, 'databse indexing') AS sim
FROM articles
WHERE title % 'databse indexing'
ORDER BY sim DESC
LIMIT 10;
```

### Búsqueda combinada de texto completo y trigramas

```sql
-- Texto completo para significado + trigramas para typos
SELECT a.id, a.title,
  ts_rank_cd(a.search_vector, ftq) AS text_rank,
  similarity(a.title, 'databse indexing') AS trigram_rank
FROM articles a,
  plainto_tsquery('english', 'database indexing') ftq
WHERE a.search_vector @@ ftq
   OR a.title % 'databse indexing'
ORDER BY (text_rank + trigram_rank) DESC
LIMIT 20;
```

### Búsqueda multi-idioma

```sql
-- Crear tsvector con idioma desde una columna
ALTER TABLE articles
ADD COLUMN search_vector_multi tsvector
GENERATED ALWAYS AS (
  to_tsvector(coalesce(language, 'english'), title || ' ' || body)
) STORED;

CREATE INDEX idx_articles_search_multi
ON articles USING GIN (search_vector_multi);

-- Buscar en el idioma apropiado
SELECT id, title
FROM articles, plainto_tsquery('spanish', 'base de datos') query
WHERE search_vector_multi @@ query
ORDER BY ts_rank_cd(search_vector_multi, query) DESC;
```

## Explicación

La función `to_tsvector` analiza el texto en una lista de tokens normalizados llamados lexemas, eliminando stop words y aplicando stemming. El operador `@@` verifica si la consulta coincide con el documento. Un índice GIN en la columna `tsvector` hace la búsqueda rápida incluso en millones de filas. `ts_rank_cd` devuelve un score de relevancia para ordenar. La columna generada se actualiza automáticamente cuando el texto subyacente cambia, así que el índice se mantiene sincronizado sin lógica de aplicación.

### Cómo funciona el ranking

`ts_rank_cd` calcula la densidad de cobertura: qué tan cerca están los lexemas coincidentes entre sí en el documento. Mayor densidad significa una coincidencia más relevante. La función `setweight` asigna etiquetas de prioridad (A, B, C, D) a diferentes partes del documento, para que las coincidencias de título superen a las del cuerpo.

### Índices GIN vs GiST

| Tipo de índice | Velocidad de build | Velocidad de búsqueda | Velocidad de update | Caso de uso |
|----------------|-------------------|----------------------|---------------------|-------------|
| GIN | Lento | Rápido | Lento | Datos estáticos o de lectura intensa |
| GiST | Rápido | Moderado | Rápido | Datos actualizados frecuentemente |

## Variantes

| Enfoque | Índice | Caso de uso |
|---------|--------|-------------|
| Columna generada + GIN | GIN | Propósito general, auto-actualizado |
| Índice de expresión en to_tsvector | GIN | Sin columna extra, pero índice más grande |
| Índice trigram | GIN | Búsqueda difusa, patrones `LIKE` |
| Columnas ponderadas | GIN | Relevancia título vs cuerpo |
| Externo | Elasticsearch | Facetado complejo, búsqueda distribuida |

## Lo que funciona

1. **Usa la configuración correcta de búsqueda de texto.** PostgreSQL soporta múltiples diccionarios; elige uno que coincida con el idioma de tu contenido.
2. **Indexa el tsvector, no el texto raw.** GIN sobre `tsvector` es mucho más eficiente que escanear texto.
3. **Combina búsqueda de texto con filtros.** Agrega `WHERE status = 'published'` para reducir el alcance del escaneo de índice.
4. **Limita el ranking a top-N resultados.** Calcular el rank para cada coincidencia es costoso; usa paginación.
5. **Monitorea el tamaño del índice.** Los índices GIN pueden crecer mucho; considera índices parciales solo para datos activos.
6. **Usa columnas ponderadas para relevancia.** Las coincidencias de título deben clasificar más alto que las del cuerpo.
7. **Agrega índices trigram para tolerancia a typos.** La búsqueda de texto completo no maneja errores ortográficos; los trigramas sí.

## Errores Comunes

1. **Buscar texto raw con `LIKE` después de agregar búsqueda de texto completo.** Migra las consultas a usar `tsvector` y `@@`.
2. **Olvidar actualizar la columna tsvector.** Si usas una columna manual, triggers o lógica de aplicación deben mantenerla actualizada.
3. **Configuración de idioma incorrecta.** El stemming en inglés no funcionará bien para texto en español y viceversa.
4. **No manejar typos o prefijos.** La búsqueda de texto completo estándar no coincide con palabras parciales; usa trigramas para eso.
5. **Sobrecargar la base de datos.** Para búsquedas muy grandes o altamente concurrentes, considera un motor de búsqueda dedicado.
6. **Usar `plainto_tsquery` para consultas complejas.** Usa `to_tsquery` para operadores booleanos (`&`, `|`, `!`) y `phraseto_tsquery` para frases.
7. **Ignorar el rendimiento de `ts_headline`.** Generar snippets es costoso; úsalo solo para los resultados paginados finales, no para todo el conjunto de resultados.

## Preguntas Frecuentes

**P: ¿Puedo buscar en múltiples columnas?**
R: Sí. Combina columnas en un solo `tsvector` con `to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))`.

**P: ¿Cómo resalto términos coincidentes en los resultados?**
R: Usa `ts_headline` para devolver snippets con los términos coincidentes resaltados. Usa los parámetros `MaxWords` y `MinWords` para controlar la longitud del snippet.

**P: ¿La búsqueda de texto completo soporta coincidencia de frases?**
R: Sí. Usa `phraseto_tsquery` o el operador `<->` en `to_tsquery` para búsqueda exacta de frases. Usa `<N>` para proximidad dentro de N posiciones.

**P: ¿En qué se diferencia la búsqueda de texto completo de LIKE?**
R: `LIKE '%word%'` escanea cada fila y coincide subcadenas exactas. La búsqueda de texto completo tokeniza el texto, aplica stemming, elimina stop words y usa un índice para búsqueda rápida. También clasifica resultados por relevancia.

**P: ¿Puedo usar búsqueda de texto completo con columnas JSONB?**
R: Sí. Extrae texto del JSONB y conviértelo a tsvector: `to_tsvector('english', jsonb_path_query_first(data, '$.description')::text)`.

**P: ¿Cómo manejo búsqueda en múltiples idiomas?**
R: Almacena el idioma por fila y úsalo en `to_tsvector`: `to_tsvector(coalesce(language, 'english'), text)`. Cada fila se procesa con el diccionario apropiado.

**P: ¿Cuál es la diferencia entre ts_rank y ts_rank_cd?**
R: `ts_rank` usa conteo de coincidencias y posición. `ts_rank_cd` usa densidad de cobertura, que mide qué tan cerca están los términos coincidentes entre sí. La densidad de cobertura generalmente produce mejor ordenamiento por relevancia.

**P: ¿Cómo depuro por qué una búsqueda no devuelve resultados?**
R: Compara el tsvector y tsquery para ver si los lexemas coinciden: `SELECT to_tsvector('english', 'tu texto'), plainto_tsquery('english', 'tu consulta')`. Si los lexemas no se superponen, no habrá coincidencia.

## Consejos de Rendimiento

1. **Usa `LIMIT` con ranking.** Calcular `ts_rank_cd` para cada coincidencia es costoso. Siempre pagina:

```sql
SELECT id, title, ts_rank_cd(search_vector, query) AS rank
FROM articles, plainto_tsquery('english', 'database indexing') query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20 OFFSET 0;
```

2. **Habilita `fastupdate` en GIN.** Para tablas actualizadas frecuentemente:

```sql
CREATE INDEX idx_articles_search
ON articles USING GIN (search_vector) WITH (fastupdate = true);
```

3. **Usa índices parciales solo para contenido publicado:**

```sql
CREATE INDEX idx_articles_published_search
ON articles USING GIN (search_vector)
WHERE status = 'published';
```

4. **Monitorea el bloat del índice.** Los índices GIN pueden acumular entradas muertas:

```sql
SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexname::regclass))
FROM pg_indexes
WHERE indexname LIKE '%search%';
```

5. **Considera el índice `rum` para ranking más rápido.** La extensión RUM almacena información de ranking en el índice mismo:

```sql
CREATE EXTENSION rum;
CREATE INDEX idx_articles_rum
ON articles USING rum (search_vector);
```

6. **Benchmark con datos realistas.** El rendimiento de la búsqueda de texto completo depende del tamaño del documento, complejidad de la consulta y tamaño del conjunto de resultados.

7. **Usa connection pooling.** Las consultas de búsqueda de texto completo pueden ser intensivas en CPU. Usa PgBouncer o un pooler similar para gestionar conexiones.

8. **Monitorea consultas lentas.** Registra consultas que tomen más de 100ms y analiza sus planes de ejecución. Causas comunes incluyen índices faltantes, consultas demasiado amplias o `ts_headline` en conjuntos de resultados grandes.

9. **Usa `pg_trgm` junto con búsqueda de texto completo.** Los índices trigram complementan la búsqueda de texto completo manejando typos y coincidencias parciales que `to_tsvector` no puede encontrar. Combina ambos para máxima cobertura de búsqueda.

10. **Ejecuta `ANALYZE` regularmente en la tabla de búsqueda.** El planificador de consultas necesita estadísticas precisas para elegir entre escaneos de índice GIN y escaneos secuenciales. Ejecuta `ANALYZE articles;` después de cargas masivas o cambios significativos de datos.

11. **Considera `pg_bigm` para bigram matching.** Para aplicaciones que necesitan coincidencias difusas más agresivas, la extensión `pg_bigm` ofrece índices de bigramas con mejor cobertura de typos que `pg_trgm`.

## Técnicas Avanzadas

### Configuraciones de búsqueda de texto personalizadas

Crea una configuración personalizada para terminología específica del dominio:

```sql
-- Crear una configuración personalizada basada en inglés
CREATE TEXT SEARCH CONFIGURATION my_config (COPY = english);

-- Agregar un diccionario personalizado para términos técnicos
CREATE TEXT SEARCH DICTIONARY my_dict (
  TEMPLATE = simple,
  STOPWORDS = english
);

-- Agregar sinónimos para términos técnicos
ALTER TEXT SEARCH CONFIGURATION my_config
  ALTER MAPPING FOR asciiword, asciihword
  WITH my_dict, english_stem;
```

### Búsqueda con faceting y filtros

Combina búsqueda de texto completo con filtrado por categoría:

```sql
-- Buscar dentro de categorías específicas
SELECT a.id, a.title, a.category,
  ts_rank_cd(a.search_vector, query) AS rank
FROM articles a,
  plainto_tsquery('english', 'database indexing') query
WHERE a.search_vector @@ query
  AND a.category IN ('engineering', 'data-science')
  AND a.status = 'published'
ORDER BY rank DESC
LIMIT 20;
```

### Actualizaciones incrementales de búsqueda con triggers

Para tablas que requieren actualizaciones inmediatas del índice de búsqueda:

```sql
-- Crear una función para actualizar search_vector
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', NEW.title || ' ' || NEW.body);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizaciones automáticas
CREATE TRIGGER trigger_update_search_vector
BEFORE INSERT OR UPDATE ON articles
FOR EACH ROW
EXECUTE FUNCTION update_search_vector();
```

### Búsqueda con agregación de resultados

Agrupa resultados de búsqueda por categoría u otros atributos:

```sql
-- Contar coincidencias por categoría
SELECT a.category, COUNT(*) AS match_count
FROM articles a,
  plainto_tsquery('english', 'database') query
WHERE a.search_vector @@ query
GROUP BY a.category
ORDER BY match_count DESC;
```

### Autocomplete y búsqueda de prefijos

Usa índices trigram para funcionalidad de autocomplete:

```sql
-- Habilitar extensión pg_trgm
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Crear índice trigram en título
CREATE INDEX idx_articles_title_autocomplete
ON articles USING GIN (title gin_trgm_ops);

-- Consulta de autocomplete
SELECT title
FROM articles
WHERE title LIKE 'data%'
ORDER BY similarity(title, 'data') DESC
LIMIT 10;
```

### Caching de resultados de búsqueda

Cachea consultas de búsqueda frecuentes para reducir carga:

```sql
-- Crear una vista materializada para búsquedas populares
CREATE MATERIALIZED VIEW popular_search_results AS
SELECT a.id, a.title,
  ts_rank_cd(a.search_vector, query) AS rank
FROM articles a,
  plainto_tsquery('english', 'database') query
WHERE a.search_vector @@ query
ORDER BY rank DESC
LIMIT 100;

-- Refrescar periódicamente
REFRESH MATERIALIZED VIEW CONCURRENTLY popular_search_results;
```
