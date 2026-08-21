---
contentType: recipes
slug: database-views-materialized
title: "Crear y usar vistas y vistas materializadas"
description: "Cómo crear y usar vistas de base de datos y vistas materializadas para simplificar consultas y mejorar el rendimiento de lectura."
metaDescription: "Crea vistas de base de datos y vistas materializadas para simplificar consultas y acelerar lecturas. Ejemplos en PostgreSQL, MySQL y SQL Server."
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - sql
  - postgresql
  - mysql
  - views
  - materialized-views
relatedResources:
  - /guides/sql-performance-tuning-guide
  - /recipes/database-deadlocks-retries
  - /recipes/database-read-replicas
  - /recipes/sql-joins
  - /guides/database-design-guide
  - /recipes/optimistic-locking
lastUpdated: "2026-08-19"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Crea vistas de base de datos y vistas materializadas para simplificar consultas y acelerar lecturas. Ejemplos en PostgreSQL, MySQL y SQL Server."
  keywords:
    - vistas-base-datos
    - vistas-materializadas
    - postgresql
    - mysql
    - sql-server
    - rendimiento
    - sql
---

## Resumen

Una vista de base de datos es una consulta guardada que se ve como una tabla.
Simplifica joins complejos, limita la exposición de columnas para control de acceso y
mantiene la lógica de negocio en el esquema. Una vista materializada guarda el
resultado en disco: sacrifica algo de frescura y espacio para conseguir lecturas mucho
más rápidas.

Esta receta muestra cómo crear, refrescar e indexar ambos tipos en PostgreSQL, MySQL y
SQL Server.

## Cuándo Usar

- Ejecutás repetidamente la misma agregación compleja y es lenta.
- Querés exponer solo algunas columnas para un acceso de mínimo privilegio.
- Necesitás joins o agregaciones precomputadas para dashboards.
- Querés abstraer cambios de esquema de los consumidores downstream.

## Cuándo NO Usar

- Para datos transaccionales en tiempo real donde resultados desfasados no son
  aceptables.
- Cuando las tablas base cambian constantemente y el costo de refrescar es muy alto.
- Como reemplazo de índices faltantes en las tablas base.

## Solución

### Vista y vista materializada en PostgreSQL

```sql
-- Vista normal: siempre fresca, ejecuta la consulta cada vez
CREATE OR REPLACE VIEW monthly_revenue AS
SELECT
    date_trunc('month', created_at) AS month,
    SUM(amount) AS total
FROM orders
WHERE status = 'completed'
GROUP BY 1;

-- Vista materializada: guardada en disco, hay que refrescarla
CREATE MATERIALIZED VIEW monthly_revenue_mat AS
SELECT
    date_trunc('month', created_at) AS month,
    SUM(amount) AS total
FROM orders
WHERE status = 'completed'
GROUP BY 1;

-- Índice único requerido para refresco CONCURRENTLY
CREATE UNIQUE INDEX idx_monthly_revenue_mat_month
ON monthly_revenue_mat (month);

-- Refresco bloqueante
REFRESH MATERIALIZED VIEW monthly_revenue_mat;

-- Refresco no bloqueante
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue_mat;
```

### Vista indexada en SQL Server

```sql
-- Crear la vista con SCHEMABINDING
CREATE VIEW dbo.OrderTotals
WITH SCHEMABINDING
AS
SELECT
    o.customer_id,
    COUNT_BIG(*) AS order_count,
    SUM(o.total) AS total_spent
FROM dbo.orders o
WHERE o.status = 'completed'
GROUP BY o.customer_id;
GO

-- Índice clustered materializa la vista
CREATE UNIQUE CLUSTERED INDEX IX_OrderTotals_Customer
ON dbo.OrderTotals (customer_id);
GO

-- Consultar los datos materializados
SELECT * FROM dbo.OrderTotals WITH (NOEXPAND)
WHERE total_spent > 1000;
```

### Vista materializada simulada en MySQL

MySQL no tiene vistas materializadas nativas. Usá una tabla y triggers para mantenerla:

```sql
CREATE TABLE mv_daily_signups (
    day DATE PRIMARY KEY,
    signups INT NOT NULL DEFAULT 0
);

DELIMITER //

CREATE TRIGGER trg_user_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO mv_daily_signups (day, signups)
    VALUES (DATE(NEW.created_at), 1)
    ON DUPLICATE KEY UPDATE signups = signups + 1;
END //

CREATE TRIGGER trg_user_delete
AFTER DELETE ON users
FOR EACH ROW
BEGIN
    UPDATE mv_daily_signups
    SET signups = signups - 1
    WHERE day = DATE(OLD.created_at);
END //

DELIMITER ;
```

### Programar refresco con pg_cron

```sql
-- PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'refresh_monthly_revenue',
    '0 2 * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue_mat'
);
```

## Explicación

Una **vista** es solo una consulta almacenada. Cada lectura la ejecuta de nuevo, así
que los datos siempre son frescos, pero el rendimiento depende de las tablas base y sus
índices.

Una **vista materializada** guarda el resultado físicamente. Las lecturas son rápidas,
pero los datos están desfasados hasta que se refrescan. Es ideal para agregaciones
costosas usadas por dashboards o reportes.

**Trade-offs:**

|Vista|Vista materializada|
|-----|-------------------|
|Siempre fresca|Desfasada hasta refrescar|
|Sin espacio extra|Usa espacio en disco|
|Costo depende de tablas base|Costo de lectura como una tabla|

## Variantes

|Base de datos|Vista nativa|Vista materializada|
|-------------|------------|-------------------|
|PostgreSQL|Sí|Sí, con `REFRESH MATERIALIZED VIEW`|
|SQL Server|Sí|Vistas indexadas (`SCHEMABINDING` + clustered index)|
|MySQL|Sí|Simular con tablas + triggers|
|Oracle|Sí|Sí, con `ON COMMIT` o `ON DEMAND`|
|SQLite|Sí|No soportado|

## Buenas Prácticas

- Creá un índice único antes de usar `REFRESH ... CONCURRENTLY` en PostgreSQL.
- Usá `SCHEMABINDING` en SQL Server para que la tabla base no rompa la vista indexada.
- Refrescá después de ETL o en horarios de bajo tráfico, no en picos de lectura.
- Usá `CONCURRENTLY` o `WITH (NOEXPAND)` para evitar bloquear lectores.
- Controlá el uso de disco; las vistas materializadas pueden crecer rápido.
- Ejecutá `ANALYZE` sobre la vista luego de refrescar para actualizar estadísticas.

## Errores Comunes

- **Olvidar refrescar**: los usuarios ven datos viejos hasta que corrás `REFRESH`.
- **No tener índice único**: `REFRESH CONCURRENTLY` falla sin uno.
- **Escribir en vistas materializadas**: son de solo lectura; actualizá las tablas base.
- **Agrupación de alta cardinalidad**: vistas con demasiados grupos únicos pueden
  hinchar el almacenamiento.
- **Saltear índices en tablas base**: una vista no arregla índices faltantes.

## Preguntas Frecuentes

### ¿Puedo actualizar datos a través de una vista?

A veces. Las vistas simples de una sola tabla suelen ser actualizables. Los joins entre
varias tablas, agregaciones o `DISTINCT` las vuelven de solo lectura. PostgreSQL
soporta triggers `INSTEAD OF` para casos complejos.

### ¿Con qué frecuencia refresco una vista materializada?

Depende de tu tolerancia a datos desfasados. Los dashboards pueden refrescar cada hora;
un índice de búsqueda cada cinco minutos. Usá `CONCURRENTLY` para evitar bloqueos de
lectura.

### ¿Cuál es la diferencia entre una vista y un CTE?

Un CTE (`WITH`) existe solo para una consulta. Una vista es un objeto persistente del
esquema que cualquier consulta puede referenciar. Usá CTEs para organizar consultas
puntuales; usá vistas para abstracciones reutilizables.

### ¿Las vistas materializadas reemplazan los índices?

No. Ayudan con agregaciones y joins costosos, pero no arreglan índices faltantes en las
tablas subyacentes.
