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

La búsqueda por patrones con `LIKE '%word%'` es lenta y no puede clasificar resultados por relevancia. La búsqueda de texto completo transforma el texto en tokens buscables, los indexa y permite consultar por significado en lugar de subcadena exacta. PostgreSQL tiene un motor de búsqueda de texto completo maduro integrado, así que puedes agregar búsqueda potente sin servicios externos como Elasticsearch para muchos casos de uso.

## Cuándo Usar

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

## Explicación

La función `to_tsvector` analiza el texto en una lista de tokens normalizados llamados lexemas, eliminando stop words y aplicando stemming. El operador `@@` verifica si la consulta coincide con el documento. Un índice GIN en la columna `tsvector` hace la búsqueda rápida incluso en millones de filas. `ts_rank_cd` devuelve un score de relevancia para ordenar. La columna generada se actualiza automáticamente cuando el texto subyacente cambia, así que el índice se mantiene sincronizado sin lógica de aplicación.

## Variantes

| Enfoque | Índice | Caso de uso |
|---------|--------|-------------|
| Columna generada + GIN | GIN | Propósito general, auto-actualizado |
| Índice de expresión en to_tsvector | GIN | Sin columna extra, pero índice más grande |
| Índice trigram | GIN | Búsqueda difusa, patrones `LIKE` |
| Externo | Elasticsearch | Facetado complejo, búsqueda distribuida |

## Lo que funciona

1. **Usa la configuración correcta de búsqueda de texto.** PostgreSQL soporta múltiples diccionarios; elige uno que coincida con el idioma de tu contenido.
2. **Indexa el tsvector, no el texto raw.** GIN sobre `tsvector` es mucho más eficiente que escanear texto.
3. **Combina búsqueda de texto con filtros.** Agrega `WHERE status = 'published'` para reducir el alcance del escaneo de índice.
4. **Limita el ranking a top-N resultados.** Calcular el rank para cada coincidencia es costoso; usa paginación.
5. **Monitorea el tamaño del índice.** Los índices GIN pueden crecer mucho; considera índices parciales solo para datos activos.

## Errores Comunes

1. **Buscar texto raw con `LIKE` después de agregar búsqueda de texto completo.** Migra las consultas a usar `tsvector` y `@@`.
2. **Olvidar actualizar la columna tsvector.** Si usas una columna manual, triggers o lógica de aplicación deben mantenerla actualizada.
3. **Configuración de idioma incorrecta.** El stemming en inglés no funcionará bien para texto en español y viceversa.
4. **No manejar typos o prefijos.** La búsqueda de texto completo estándar no coincide con palabras parciales; usa trigramas para eso.
5. **Sobrecargar la base de datos.** Para búsquedas muy grandes o altamente concurrentes, considera un motor de búsqueda dedicado.

## Preguntas Frecuentes

**P: ¿Puedo buscar en múltiples columnas?**
R: Sí. Combina columnas en un solo `tsvector` con `to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))`.

**P: ¿Cómo resalto términos coincidentes en los resultados?**
R: Usa `ts_headline` para devolver snippets con los términos coincidentes resaltados.

**P: ¿La búsqueda de texto completo soporta coincidencia de frases?**
R: Sí. Usa `phraseto_tsquery` o el operador `<->` en `to_tsquery` para búsqueda exacta de frases.
