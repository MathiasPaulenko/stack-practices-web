---
contentType: recipes
slug: sql-partitioning-strategies
title: "Particionar tablas grandes por fecha o rango"
description: "Divide tablas SQL enormes en particiones más pequeñas por fecha, rango o lista para mejorar el rendimiento y el mantenimiento."
metaDescription: "Particiona tablas SQL grandes por fecha, rango o lista. Mejora el rendimiento, poda particiones y simplifica el mantenimiento."
difficulty: advanced
topics:
  - databases
tags:
  - sql
  - postgresql
  - partitioning
  - performance
  - maintenance
relatedResources:
  - /recipes/sql-index-optimization-analysis
  - /guides/read-replica-guide
  - /guides/sql-performance-tuning-guide
  - /recipes/postgres-query-optimization
  - /recipes/sql-find-duplicate-rows
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Particiona tablas SQL grandes por fecha, rango o lista. Mejora el rendimiento, poda particiones y simplifica el mantenimiento."
  keywords:
    - sql
    - postgresql
    - particionamiento
    - rendimiento
    - mantenimiento
---


## Visión General

Cuando una tabla crece más allá de cientos de millones de filas, cada consulta se convierte en una batalla contra el tamaño del índice y el tiempo de mantenimiento. La partición divide la tabla en pedazos más pequeños y manejables manteniendo la tabla completa consultable como una sola. La base de datos poda particiones que no coinciden con la consulta, por lo que los escaneos son más pequeños y el mantenimiento de índices es más barato.

## Cuándo Usar

Usa este recurso cuando:
- Una tabla crece más rápido que tu presupuesto de hardware.
- Las consultas filtran principalmente por un rango natural como fecha o región.
- Las ventanas de mantenimiento son demasiado cortas para vacuum o reindexar toda la tabla.
- Necesitas archivar o eliminar datos antiguos eficientemente.

## Solución

### Particionar orders por mes en PostgreSQL

```sql
-- Crear una tabla particionada
CREATE TABLE orders (
  id BIGSERIAL,
  customer_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  amount NUMERIC(10,2),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Crear particiones mensuales
CREATE TABLE orders_2024_01 PARTITION OF orders
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE orders_2024_02 PARTITION OF orders
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Crear particiones futuras automáticamente con un script o extensión
```

### Particionamiento por lista con región

```sql
-- Particionar clientes por región
CREATE TABLE customers (
  id BIGSERIAL,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  email TEXT,
  PRIMARY KEY (id, region)
) PARTITION BY LIST (region);

CREATE TABLE customers_north PARTITION OF customers
  FOR VALUES IN ('north', 'northeast');

CREATE TABLE customers_south PARTITION OF customers
  FOR VALUES IN ('south', 'southeast');

CREATE TABLE customers_west PARTITION OF customers
  FOR VALUES IN ('west', 'southwest');

-- Partición por defecto para valores inesperados
CREATE TABLE customers_default PARTITION OF customers DEFAULT;
```

### Particionamiento por hash para distribución pareja

```sql
-- Particionar usuarios por hash de user_id para distribución pareja
CREATE TABLE user_events (
  id BIGSERIAL,
  user_id BIGINT NOT NULL,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id, user_id)
) PARTITION BY HASH (user_id);

-- Crear 4 particiones hash
CREATE TABLE user_events_p0 PARTITION OF user_events
  FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE user_events_p1 PARTITION OF user_events
  FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE user_events_p2 PARTITION OF user_events
  FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE user_events_p3 PARTITION OF user_events
  FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

### Sub-particionamiento (compuesto)

```sql
-- Particionar por rango (fecha) luego sub-particionar por lista (región)
CREATE TABLE sales (
  id BIGSERIAL,
  region TEXT NOT NULL,
  sale_date DATE NOT NULL,
  amount NUMERIC(10,2),
  PRIMARY KEY (id, sale_date, region)
) PARTITION BY RANGE (sale_date);

-- Enero 2024, sub-particionado por región
CREATE TABLE sales_2024_01 PARTITION OF sales
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01')
  PARTITION BY LIST (region);

CREATE TABLE sales_2024_01_north PARTITION OF sales_2024_01
  FOR VALUES IN ('north', 'northeast');

CREATE TABLE sales_2024_01_south PARTITION OF sales_2024_01
  FOR VALUES IN ('south', 'southeast');
```

### Verificar poda de particiones con EXPLAIN

```sql
-- Confirmar que el planificador salta particiones irrelevantes
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE created_at >= '2024-01-15' AND created_at < '2024-02-01';

-- Bien: solo orders_2024_01 es escaneada
-- Mal: todas las particiones son escaneadas (verifica restricciones faltantes)
```

### Archivar particiones antiguas

```sql
-- Desconectar una partición en lugar de borrarla (conserva datos como tabla independiente)
ALTER TABLE orders DETACH PARTITION orders_2023_01;

-- Ahora los datos están en una tabla regular que puede archivarse
-- Borrar la tabla desconectada cuando ya no se necesite
DROP TABLE orders_2023_01;

-- O moverla a almacenamiento más barato
ALTER TABLE orders_2023_01 SET TABLESPACE archive_tablespace;
```

### Automatizar creación de particiones con pg_partman

```sql
-- Instalar extensión pg_partman
CREATE EXTENSION IF NOT EXISTS pg_partman;

-- Crear una tabla particionada semanalmente con mantenimiento automático
SELECT partman.create_parent(
  'public.events',
  'created_at',
  'weekly',
  p_count := 4  -- pre-crear 4 particiones futuras
);

-- Programar mantenimiento semanal para crear nuevas particiones
-- Ejecutar vía cron: SELECT partman.run_maintenance_proc();
```

### Crear índices en tablas particionadas

```sql
-- Crear un índice en la tabla padre; PostgreSQL lo crea en todas las particiones
CREATE INDEX idx_orders_customer ON orders (customer_id);

-- Crear un índice incluyendo la clave de partición
CREATE INDEX idx_orders_customer_date ON orders (customer_id, created_at);

-- Verificar que los índices existen en las particiones hijas
SELECT tablename, indexname FROM pg_indexes
WHERE tablename LIKE 'orders_2024%'
ORDER BY tablename, indexname;
```

## Explicación

El particionamiento declarativo en PostgreSQL permite definir una tabla particionada y adjuntar tablas hijas que contienen rangos específicos. La clave de partición debe ser parte de la clave primaria. Cuando una consulta filtra por `created_at`, el planificador solo escanea las particiones que pueden contener filas coincidentes, un proceso llamado poda de particiones. Eliminar datos antiguos se convierte en `DROP TABLE orders_2024_01`, mucho más rápido y recupera espacio inmediatamente comparado con borrar millones de filas.

### Poda de particiones

La poda de particiones ocurre en tiempo de planificación (poda estática) o tiempo de ejecución (poda dinámica). La poda estática funciona cuando el filtro es una constante literal. La poda dinámica funciona con consultas parametrizadas (ej. prepared statements).

```sql
-- Poda estática: el planificador conoce la fecha al planear
SELECT * FROM orders WHERE created_at = '2024-01-15';

-- Poda dinámica: la poda ocurre en tiempo de ejecución
PREPARE get_orders(DATE) AS
  SELECT * FROM orders WHERE created_at = $1;
EXECUTE get_orders('2024-01-15');
```

### Particionamiento vs sharding

| Característica | Particionamiento | Sharding |
|----------------|------------------|----------|
| Alcance | Base de datos única | Múltiples bases de datos |
| Transparencia | Automática | Consciente de la aplicación |
| Caso de uso | Tablas grandes en un solo nodo | Escalado horizontal |
| Consulta | Conexión única | Fan-out entre nodos |
| Transacciones | ACID | Distribuidas (2PC) |

## Variantes

| Estrategia | Clave | Mejor para |
|------------|-------|------------|
| Rango | Fecha, rango numérico | Series temporales, logs |
| Lista | Región, status | Categorías discretas |
| Hash | Hash de clave | Distribución pareja, sin rango natural |
| Compuesto | Rango + Lista | Tablas multi-tenant grandes |
| Por defecto | Catch-all | Valores inesperados en particionamiento por lista |

## Lo que funciona

1. **Elige la clave de partición según patrones de consulta.** Particionar por una columna que nunca filtras es overhead desperdiciado.
2. **Crea particiones futuras antes de que lleguen datos.** Usa un cron job o extensión como `pg_partman` para automatizar.
3. **Mantén índices en cada partición.** Los índices locales son más baratos de reconstruir que un índice global gigante.
4. **Archiva particiones viejas en lugar de borrar filas.** `DROP TABLE` o `DETACH PARTITION` es rápido y recupera espacio.
5. **Prueba la poda de particiones con EXPLAIN.** Confirma que el planificador salta particiones irrelevantes.
6. **Comienza con particionamiento por rango en fecha.** Es el más común y fácil de razonar.
7. **Usa una partición por defecto para particionamiento por lista.** Atrapa valores inesperados y previene fallos de inserción.

## Errores Comunes

1. **Particionar demasiado pronto.** Tablas con pocos millones de filas raramente se benefician del particionamiento.
2. **Clave de partición incorrecta.** Una clave con baja cardinalidad o distribución desigual crea particiones calientes.
3. **Olvidar la clave de partición en la clave primaria.** PostgreSQL la requiere para particionamiento por rango y lista.
4. **Demasiadas particiones.** Cientos de particiones pueden ralentizar la planificación y aumentar el bloat del catálogo.
5. **Actualizaciones entre particiones.** Actualizar la clave de partición mueve una fila entre particiones y puede ser lento o bloqueante.
6. **No automatizar la creación de particiones.** Olvidar crear la partición del mes próximo causa fallos de inserción.
7. **Ignorar el tamaño de la partición por defecto.** Una partición por defecto que crece mucho se convierte en un cuello de botella de rendimiento.

## Preguntas Frecuentes

**P: ¿Necesito cambiar las consultas de la aplicación?**
R: No. Las tablas particionadas parecen tablas normales para las aplicaciones. El planificador maneja la poda automáticamente.

**P: ¿Cómo agrego una partición para un mes nuevo?**
R: Usa `CREATE TABLE ... PARTITION OF ... FOR VALUES FROM ... TO ...`. Automatiza esto con un job programado o pg_partman.

**P: ¿Puedo particionar una tabla existente?**
R: Sí, pero generalmente requiere crear una nueva tabla particionada, migrar datos y renombrar. PostgreSQL no soporta convertir una tabla regular en el lugar.

**P: ¿Cuántas particiones debo crear?**
R: Apunta a particiones entre 1GB y 50GB cada una. Para datos de series temporales, particiones mensuales son un buen punto de partida. Evita más de unos cientos de particiones por tabla.

**P: ¿Qué pasa si inserto una fila sin partición coincidente?**
R: Para particionamiento por rango y lista sin partición por defecto, la inserción falla con un error. Para particionamiento por hash, la fila va al bucket hash correspondiente.

**P: ¿Puedo tener claves foráneas que referencien una tabla particionada?**
R: PostgreSQL 12+ soporta claves foráneas que referencian tablas particionadas. La clave de partición debe ser parte del conjunto de columnas referenciadas.

**P: ¿Cómo afecta el particionamiento a VACUUM y mantenimiento?**
R: Cada partición se vacía independientemente, por lo que el mantenimiento es más rápido y puede paralelizarse. Las particiones viejas pueden desconectarse y borrarse en lugar de vaciarse.

**P: ¿Cuál es la diferencia entre particionamiento declarativo y por herencia?**
R: El particionamiento declarativo (PostgreSQL 10+) usa la sintaxis `PARTITION BY` y es el enfoque recomendado. El particionamiento por herencia usa herencia de tablas con triggers y es el enfoque manual más antiguo.

## Consejos de Rendimiento

1. **Verifica la poda de particiones regularmente.** Ejecuta `EXPLAIN ANALYZE` en consultas clave y confirma que solo las particiones relevantes son escaneadas. Restricciones faltantes o tipos de datos incorrectos pueden impedir la poda.

2. **Usa `pg_partman` para automatización de series temporales.** Maneja creación, rotación y archivado de particiones automáticamente:

```sql
-- Ejecutar mantenimiento semanalmente vía cron
SELECT partman.run_maintenance_proc();
```

3. **Monitorea el tamaño de las particiones.** Vigila los tamaños para detectar particiones calientes o distribución desigual:

```sql
SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE tablename LIKE 'orders_2024%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

4. **Ajusta `max_parallel_workers_per_gather`.** Los escaneos de tablas particionadas pueden beneficiarse de workers paralelos. Aumenta este setting para escaneos grandes de particiones.

5. **Usa `SET enable_partition_pruning = on`** para asegurar que la poda esté activa. Está activado por defecto en PostgreSQL 11+, pero verifica si las consultas escanean todas las particiones inesperadamente.
