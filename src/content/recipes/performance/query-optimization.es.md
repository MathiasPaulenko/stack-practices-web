---
contentType: recipes
slug: query-optimization
title: "Optimizar Queries Lentas de Base de Datos"
description: "Cómo identificar, analizar y corregir queries SQL lentos usando EXPLAIN, refactoring de queries y técnicas de optimización específicas por base de datos."
metaDescription: "Aprende optimización de queries de base de datos. Usa EXPLAIN, refactoriza queries y aplica técnicas para corregir SQL lento y mejorar rendimiento."
difficulty: intermediate
topics:
  - performance
tags:
  - performance
  - database
  - optimization
  - profiling
  - latency
relatedResources:
  - /recipes/database-indexing
  - /recipes/sql-joins
  - /recipes/connection-pooling
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende optimización de queries de base de datos. Usa EXPLAIN, refactoriza queries y aplica técnicas para corregir SQL lento y mejorar rendimiento."
  keywords:
    - query optimization
    - slow queries
    - sql performance
    - explain analyze
    - database profiling
    - query refactoring
---

## Visión general

Las queries lentas de base de datos son una de las causas más comunes de degradación de rendimiento de aplicaciones. Una sola query no optimizada puede consumir el 100% de un core de CPU, mantener locks por segundos, o escanear millones de filas innecesariamente. La buena noticia es que la mayoría de queries lentas pueden mejorarse dramáticamente con análisis sistemático y refactoring dirigido.

La optimización de queries es un proceso de tres pasos: identificar queries lentas a través de logging y monitoreo, entender su plan de ejecución con `EXPLAIN`, y aplicar fixes dirigidos como indexing, reescritura o cambios de schema. Esta receta recorre cada paso con ejemplos concretos.

## Cuándo usarlo

Usa esta receta cuando:

- Los tiempos de respuesta de la aplicación degradan a medida que crece el volumen de datos
- El uso de CPU o I/O de la base de datos es consistentemente alto. Verifica [monitoreo y observabilidad](/guides/devops/logging-monitoring-observability-guide).
- [Herramientas de monitoreo](/guides/devops/logging-monitoring-observability-guide) marcan queries específicas como entradas de slow query log
- Agregando paginación, búsqueda o capacidades de reporting a tablas existentes
- Migrando SQL legacy a un nuevo motor de base de datos

## Solución

### Identificar Queries Lentas (PostgreSQL)

```sql
ALTER SYSTEM SET log_min_duration_statement = '1000ms';
SELECT pg_reload_conf();

SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Analizar con EXPLAIN

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT o.id, o.total, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.created_at > '2025-01-01'
ORDER BY o.total DESC
LIMIT 100;
```

### Refactorizar Queries N+1

```python
# ANTES: Queries N+1 (ineficiente)
for order in orders:
    customer = db.query("SELECT name FROM customers WHERE id = %s", (order.customer_id,))

# DESPUÉS: Single JOIN query
customers = db.query("""
    SELECT o.id, o.total, c.name
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE o.id = ANY(%s)
""", ([o.id for o in orders],))
```

### Agregar Covering Indexes

```sql
-- Sin covering index: table lookup por cada fila
SELECT id, email, name FROM users WHERE active = true;

-- Agregar covering index (todas las columnas en la query)
CREATE INDEX idx_users_active_covering
ON users (active)
INCLUDE (email, name);

-- Ahora la query usa Index Only Scan — sin acceso a tabla
```

### Optimizar Paginación

```sql
-- LENTO: OFFSET escanea todas las filas saltadas
SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 10000;

-- RÁPIDO: Keyset pagination usando el último valor visto
SELECT * FROM orders
WHERE created_at < '2025-06-15 10:30:00'
ORDER BY created_at DESC
LIMIT 20;
```

La paginación keyset (cursor) es O(1) independientemente de la profundidad de página. La paginación OFFSET es O(n) — la página 10000 es 500x más lenta que la página 1.

## Explicación

- **EXPLAIN ANALYZE**: Ejecuta la query y muestra el plan de ejecución actual, incluyendo conteos de filas, condiciones de filtro y operaciones de I/O. Busca sequential scans, nested loops con altos conteos de filas, y operaciones de sort sin índices.
- **Queries N+1**: Ocurren cuando el código itera sobre un result set y ejecuta una query adicional por iteración. Una sola JOIN o cláusula `IN` bien elaborada reemplaza cientos de queries individuales.
- **Índices covering**: Cuando todas las columnas que una query necesita están en el índice, la base de datos puede responder la query sin tocar la tabla. Esto se llama "index-only scan" y puede ser 10x más rápido.
- **Reescritura de queries**: A veces la query misma es el problema. Convertir `NOT IN` a `NOT EXISTS`, usar `UNION ALL` en lugar de `UNION`, o filtrar temprano con subqueries puede mejorar dramáticamente el rendimiento.

## Variantes

| Técnica | Impacto | Esfuerzo | Mejor para |
|---------|---------|----------|------------|
| Agregar [índice](/recipes/performance/database-indexing) | Alto | Bajo | Índice faltante en columnas WHERE/JOIN |
| Reescribir query | Alto | Medio | Joins ineficientes, subqueries |
| Particionar tabla | Muy alto | Alto | Tablas > 10M filas con queries basadas en tiempo |
| Vista materializada | Alto | Medio | Agregaciones complejas consultadas frecuentemente |
| Desnormalizar | Medio | Medio | Carga de lectura pesada, pocos escritores |
| Réplica de lectura | Medio | Alto | Escalado de lectura, reporting |

## Avanzado: Leer Output de EXPLAIN

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT o.id, o.total, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.created_at > '2025-01-01'
ORDER BY o.total DESC
LIMIT 100;
```

Cosas clave a buscar en el output:

- **Seq Scan**: Full table scan. Generalmente malo para tablas grandes. Agrega un índice.
- **Index Scan**: Bien — usando un índice para encontrar filas.
- **Index Only Scan**: Mejor — todos los datos del índice, sin acceso a tabla.
- **Hash Join**: Bien para joins grandes. Construye una hash table en la relación más pequeña.
- **Nested Loop**: Bien para result sets pequeños. Malo para grandes (O(n*m)).
- **Sort**: Costoso para result sets grandes. Agrega un índice en la columna de sort.
- **Buffers: shared hit=X read=Y**: `hit` = caché, `read` = disco. Alto `read` significa I/O de disco.
- **Rows removed by filter**: Si es mucho mayor que las filas devueltas, el índice no es suficientemente selectivo.

## Avanzado: Caching de Query Plans

La mayoría de bases de datos cachean los planes de ejecución. Las queries parametrizadas reutilizan planes cacheados:

```python
# Bien: parametrizada — el plan se cachea
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))

# Mal: concatenación de strings — nuevo plan cada vez
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
```

Esto también previene SQL injection. Consulta [prevención de SQL injection](/recipes/security/sql-injection-prevention) para detalles.

## Avanzado: Operaciones Batch

```sql
-- LENTO: 1000 INSERTs individuales
INSERT INTO logs (message) VALUES ('msg1');
INSERT INTO logs (message) VALUES ('msg2');
-- ... 998 más

-- RÁPIDO: single batch INSERT
INSERT INTO logs (message) VALUES
('msg1'), ('msg2'), /* ... */ ('msg1000');

-- Aún más rápido: COPY (PostgreSQL)
COPY logs FROM '/path/to/file.csv' WITH (FORMAT csv);
```

Las operaciones batch reducen round-trips de red y overhead de transacciones. Un batch INSERT de 1000 filas es típicamente 10-50x más rápido que 1000 INSERTs individuales.

## Avanzado: Impacto del Connection Pooling en Queries

Cada query adquiere una conexión del pool. Si el pool es muy pequeño, las queries hacen cola esperando una conexión libre. Esto se manifiesta como latencia aumentada sin ningún cuello de botella en la base de datos.

```python
# Mal: pool size 5 para un servicio de alto tráfico
pool = psycopg2.pool.SimpleConnectionPool(5, 5, dsn=DATABASE_URL)

# Bien: pool size basado en (core_count * 2) + effective_spikes
pool = psycopg2.pool.ThreadedConnectionPool(
    minconn=10,
    maxconn=50,
    dsn=DATABASE_URL
)
```

Monitorea el pool wait time separadamente del query execution time. Si el pool wait > 10% de la latencia total, aumenta el pool size o reduce la duración de las queries.

## Avanzado: Usar pg_stat_statements

```sql
-- Habilitar la extensión
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Encontrar las top 10 queries más lentas por tiempo total
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Encontrar queries con alta varianza (rendimiento inestable)
SELECT
    query,
    calls,
    mean_exec_time,
    stddev_exec_time,
    stddev_exec_time / mean_exec_time AS coefficient_of_variation
FROM pg_stat_statements
WHERE calls > 10
ORDER BY coefficient_of_variation DESC
LIMIT 10;
```

Resetea las estadísticas después de hacer cambios para obtener mediciones limpias: `SELECT pg_stat_statements_reset();`.

## Lo que funciona

- **Filtra temprano**: aplica condiciones `WHERE` en columnas indexadas antes de joins y sorts. Cuantas menos filas fluyan a través del pipeline de la query, más rápido corre.
- **Evita `SELECT *`**: traer columnas innecesarias desperdicia I/O y memoria. Selecciona solo las columnas que necesitas.
- **Usa `EXISTS` en lugar de `IN` para subqueries grandes**: `EXISTS` hace short-circuit en el primer match, mientras que `IN` puede construir un result set intermedio completo.
- **Actualiza estadísticas de tabla**: el query optimizer depende de estadísticas para elegir planes. Corre `ANALYZE` después de bulk loads o cambios de datos mayores.
- **Monitorea planes de ejecución a lo largo del tiempo**: los planes pueden cambiar a medida que la distribución de datos se desplaza. Configura alertas cuando una query previamente rápida se vuelve lenta repentinamente.

## Errores comunes

- **Indexar sin analizar**: agregar un índice en una columna de baja cardinalidad (como un booleano) raramente ayuda y siempre ralentiza escrituras.
- **Ignorar hints del query planner**: a veces el optimizer elige un mal plan. Usa hints (`USE INDEX`, `SET enable_seqscan = off`) juiciosamente cuando sabes más.
- **No testear con volumen de datos de producción**: una query que corre en 10ms en una base de datos de desarrollo con 1,000 filas puede tardar 10 segundos en producción con 10 millones de filas.
- **Optimización prematura**: profile primero. No reescribas queries que ya son rápidas. Enfócate en las top 5 queries más lentas por tiempo total de ejecución.

## Preguntas frecuentes

### ¿Cómo sé si una query está usando un índice?

Revisa el output de `EXPLAIN`. `Index Scan` o `Index Only Scan` significa que la query usa un índice. `Seq Scan` significa que está leyendo la tabla completa. Busca `Rows removed by filter` — si es alto, el índice no es suficientemente selectivo.

### ¿Debería siempre evitar `SELECT *`?

Para queries de producción, sí. Traer columnas innecesarias desperdicia I/O y memoria, e impide Index Only Scans. Para exploración ad-hoc o tablas muy pequeñas, `SELECT *` está bien.

### ¿Cuál es la diferencia entre `EXPLAIN` y `EXPLAIN ANALYZE`?

`EXPLAIN` muestra el plan estimado sin ejecutar. `EXPLAIN ANALYZE` ejecuta la query y muestra timings y conteos de filas reales. Siempre usa `ANALYZE` cuando estás tuneando — las estimaciones del planner pueden ser incorrectas.

### ¿Los ORMs pueden generar queries eficientes?

Usualmente, pero no siempre. ORMs como SQLAlchemy y Hibernate pueden generar queries N+1 o joins ineficientes. Consulta [prevención de SQL injection](/recipes/security/sql-injection-prevention) para patrones de queries seguras. Profile el SQL actual que emiten y optimiza a nivel SQL cuando sea necesario.

### ¿Qué es un covering index?

Un índice que incluye todas las columnas que una query necesita. La base de datos puede responder la query desde el índice sin acceder a la tabla. Esto se llama Index Only Scan y puede ser 10x más rápido. Usa la cláusula `INCLUDE` en PostgreSQL o índices compuestos en MySQL.

### ¿Cómo optimizo la paginación?

Usa paginación keyset (cursor) en lugar de OFFSET. La paginación keyset usa `WHERE created_at < last_value ORDER BY created_at DESC LIMIT 20` — es O(1) independientemente de la profundidad de página. La paginación OFFSET escanea todas las filas saltadas y se vuelve más lenta a medida que avanzas.

### ¿Qué es el slow query log?

Una feature de base de datos que loggea queries que exceden un umbral de tiempo. En PostgreSQL: `log_min_duration_statement = '1000ms'`. En MySQL: `long_query_time = 1`. Úsalo para identificar qué queries necesitan optimización. Combina con `pg_stat_statements` para estadísticas agregadas.

### ¿Cómo optimizo JOINs?

Asegúrate de que las columnas de join estén indexadas. Usa `EXPLAIN` para verificar la estrategia de join: Hash Join para joins grandes, Nested Loop para pequeños. Filtra temprano con WHERE antes de hacer join. Evita hacer join de tablas innecesarias. Considera desnormalizar si el mismo join se consulta frecuentemente.

### ¿Qué es el caching de query plans?

La base de datos cachea el plan de ejecución de una query para no reparsear y reoptimizar en cada ejecución. Las queries parametrizadas se benefician del caching de planes. Las queries con concatenación de strings no — cada una genera un plan nuevo.

### ¿Cómo manejo queries lentas en producción?

Configura slow query logging. Usa `pg_stat_statements` (PostgreSQL) o Performance Schema (MySQL) para encontrar las top queries más lentas por tiempo total. Optimiza las top 5 primero — usualmente account for 80% del tiempo total. Agrega índices, reescribe queries, o cachea resultados.

### ¿Cuándo debería particionar una tabla?

Cuando una tabla tiene más de 10 millones de filas y las queries filtran por rango de tiempo. Particiona por mes o semana. Esto convierte un full table scan en un single partition scan. PostgreSQL soporta particionamiento declarativo por RANGE, LIST o HASH.

### ¿Qué es una vista materializada?

Un result set precomputado almacenado como tabla. Útil para agregaciones complejas que se consultan frecuentemente pero cambian infrecuentemente. Refresca periódicamente con `REFRESH MATERIALIZED VIEW`. El tradeoff: espacio de almacenamiento y tiempo de refresh vs velocidad de query.
