---

contentType: recipes
slug: database-views-materialized
title: "Crear y usar vistas de base de datos y vistas materializadas"
description: "Cómo crear y usar vistas de base de datos y vistas materializadas para simplificar consultas y mejorar rendimiento de lectura"
metaDescription: "Crea vistas de base de datos y vistas materializadas para simplificar consultas y acelerar lecturas. Usa PostgreSQL, MySQL y SQL Server con ejemplos."
difficulty: intermediate
topics:
  - databases
tags:
  - database
  - sql
  - postgresql
  - mysql
relatedResources:
  - /guides/sql-performance-tuning-guide
  - /recipes/database-deadlocks-retries
  - /recipes/database-read-replicas
  - /recipes/sql-joins
  - /guides/database-design-guide
  - /recipes/optimistic-locking
lastUpdated: "2026-06-13"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Crea vistas de base de datos y vistas materializadas para simplificar consultas y acelerar lecturas. Usa PostgreSQL, MySQL y SQL Server con ejemplos."
  keywords:
    - vistas-base-datos
    - vistas-materializadas
    - postgresql
    - mysql
    - sql-server
    - rendimiento
    - sql

---

## Visión General

Las vistas de base de datos son tablas virtuales definidas por una consulta. Simplifican joins complejos, implementan control de acceso exponiendo solo columnas seleccionadas y centralizan lógica de negocio en el esquema. Las vistas materializadas van más allá almacenando físicamente el resultado de la consulta, intercambiando espacio en disco y eventual desfase por lecturas dramáticamente más rápidas. Lo siguiente cubre crear, refrescar e indexar ambos tipos en PostgreSQL, MySQL y SQL Server.

## Cuándo Usar

Usa este recurso cuando:
- Ejecutas repetidamente la misma [consulta de agregación](/recipes/sql-joins/) compleja y es lenta
- Quieres restringir acceso a datos sin duplicar lógica de permisos en código de aplicación
- Necesitas precomputar joins o agregaciones costosas para [dashboards de reportes](/recipes/postgres-query-optimization/)
- Quieres abstraer cambios de esquema de consumidores downstream. Consulta [Input Validation](/recipes/input-validation/) para seguridad de schema.

## Solución

### Python

```python
import psycopg2

conn = psycopg2.connect("dbname=app user=app password=secret")
cur = conn.cursor()

# Crear una vista estándar
cur.execute("""
CREATE OR REPLACE VIEW monthly_revenue AS
SELECT
    date_trunc('month', created_at) AS month,
    SUM(amount) AS total
FROM orders
WHERE status = 'completed'
GROUP BY 1;
""")

# Crear una vista materializada
cur.execute("""
CREATE MATERIALIZED VIEW monthly_revenue_mat AS
SELECT
    date_trunc('month', created_at) AS month,
    SUM(amount) AS total
FROM orders
WHERE status = 'completed'
GROUP BY 1;
""")

# Indexar la vista materializada para búsquedas rápidas
cur.execute("""
CREATE UNIQUE INDEX idx_monthly_revenue_mat_month
ON monthly_revenue_mat (month);
""")

# Refrescar la vista materializada (bloqueante)
cur.execute("REFRESH MATERIALIZED VIEW monthly_revenue_mat;")

# Refresco concurrente (requiere índice único)
cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue_mat;")

conn.commit()
```

### JavaScript

```javascript
// Usando Knex.js / SQL raw con PostgreSQL
const knex = require('knex')({
  client: 'pg',
  connection: { host: 'localhost', database: 'app', user: 'app', password: 'secret' }
});

async function setupViews() {
  await knex.raw(`
    CREATE OR REPLACE VIEW active_users AS
    SELECT id, email, created_at
    FROM users
    WHERE deleted_at IS NULL;
  `);

  await knex.raw(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS daily_signups AS
    SELECT DATE(created_at) AS day, COUNT(*) AS signups
    FROM users
    GROUP BY DATE(created_at);
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_signups_day
    ON daily_signups (day);
  `);
}

async function refreshMaterializedView() {
  await knex.raw('REFRESH MATERIALIZED VIEW CONCURRENTLY daily_signups;');
}
```

### Java

```java
// Usando Spring Data JPA con entidad mapeada a vista
import jakarta.persistence.*;

@Entity
@Table(name = "monthly_revenue")
@Immutable  // Crítico: marcar entidades de vista como inmutables
public class MonthlyRevenue {
    @Id
    private java.sql.Date month;

    @Column(name = "total")
    private BigDecimal total;

    // Getters...
}

// Repository
public interface MonthlyRevenueRepository extends JpaRepository<MonthlyRevenue, java.sql.Date> {
    List<MonthlyRevenue> findByMonthAfter(LocalDate date);
}

// Refrescar vista materializada vía JdbcTemplate
@Autowired
private JdbcTemplate jdbcTemplate;

public void refreshRevenueView() {
    jdbcTemplate.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue");
}
```

## Explicación

Una **vista** es una consulta almacenada. Cada vez que consultas la vista, el SQL subyacente se ejecuta. Esto significa que los datos siempre están frescos pero el rendimiento depende de la complejidad de la consulta y los índices de las tablas base.

Una **vista materializada** almacena el resultado de la consulta en disco. Las lecturas son tan rápidas como consultar una tabla regular, pero los datos solo están tan frescos como el último refresco. Son ideales para:
- Agregaciones costosas que corren en dashboards
- Unir tablas grandes donde los índices no ayudan lo suficiente
- Áreas de staging para data warehousing y ETL

**Compromisos:**
- Vistas: siempre frescas, sin overhead de almacenamiento, pero pueden ser lentas para consultas complejas
- Vistas materializadas: lecturas rápidas, consumen espacio en disco y requieren refresco explícito

## Variantes

| Base de datos | Soporte de vista | Vista materializada | Notas |
|---------------|------------------|---------------------|-------|
| PostgreSQL | Completo | Completo | `REFRESH MATERIALIZED VIEW CONCURRENTLY` para refresco sin downtime |
| MySQL | Completo | Parcial (vía Flexviews o tablas manuales) | Sin MV nativa; simula con tablas + reconstrucciones programadas |
| SQL Server | Completo | Vistas indexadas | Crear con `SCHEMABINDING` e `INDEX CLUSTERED` |
| Oracle | Completo | Completo | Opciones de refresco `ON COMMIT` u `ON DEMAND` |
| SQLite | Completo | Ninguno | Usa triggers para simular tablas materializadas |

## Lo que funciona

1. Siempre crea un índice único en vistas materializadas antes de usar refresco `CONCURRENTLY`
2. Usa `CREATE OR REPLACE VIEW` para cambios no disruptivos; elimina y recrea solo cuando sea necesario
3. Programa refrescos con cron, pg_cron o tu scheduler de jobs; refresca después de ETL, no durante picos de lectura. Consulta [Batch Processing](/recipes/batch-processing-patterns/) para programación de jobs.
4. Usa vistas para exponer solo las columnas necesarias para control de acceso de mínimo privilegio
5. Monitorea uso de disco; las vistas materializadas pueden crecer mucho con filas anchas o alta cardinalidad

## Errores Comunes

1. **Olvidar refrescar** — las vistas materializadas obsoletas devuelven silenciosamente datos desactualizados
2. **Sin índice único** — `REFRESH CONCURRENTLY` falla sin uno, bloqueando la vista durante el refresco
3. **Vistas modificables sin reglas/triggers** — no todas las bases de datos soportan `INSERT` en vistas; el código de aplicación debe manejarlo
4. **Vistas complejas sin índices subyacentes** — una vista no crea índices; asegúrate de que las tablas base estén indexadas
5. **Usar vistas para consultas transaccionales en tiempo real** — las vistas añaden overhead de consulta; úsalas para reportes, no para caminos calientes OLTP. Consulta [Database Transactions](/recipes/database-transactions/) para patrones transaccionales.

## Preguntas Frecuentes

### ¿Puedo actualizar datos a través de una vista?

A veces. Las vistas simples de una sola tabla suelen ser actualizables. Los joins de múltiples tablas, agregaciones o vistas con `DISTINCT` no lo son. PostgreSQL soporta triggers `INSTEAD OF` para hacer vistas complejas actualizables.

### ¿Con qué frecuencia debo refrescar una vista materializada?

Refresca después de que los datos subyacentes cambien, o en un horario que coincida con tu tolerancia a la desfase. Un dashboard de ingresos podría refrescarse cada hora; un índice de búsqueda de usuarios cada 5 minutos. Usa `CONCURRENTLY` para evitar bloqueos de lectura.

### ¿Cuál es la diferencia entre una vista y un CTE?

Un CTE (`WITH`) existe solo durante la duración de una sola consulta. Una vista es un objeto de esquema persistente que cualquier consulta puede referenciar. Usa CTEs para organización one-off de consultas; usa vistas para abstracciones reutilizables.

### SQL Server Indexed Views

SQL Server soporta indexed views (similares a vistas materializadas) con `SCHEMABINDING`:

```sql
-- Crear vista con SCHEMABINDING (requerido para indexed views)
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

-- Crear índice clustered (materializa la vista)
CREATE UNIQUE CLUSTERED INDEX IX_OrderTotals_Customer
ON dbo.OrderTotals (customer_id);
GO

-- Consultar la indexed view (usa los datos materializados)
SELECT * FROM dbo.OrderTotals WITH (NOEXPAND)
WHERE total_spent > 1000;
```

### Oracle Materialized Views con Opciones de Refresh

```sql
-- Fast refresh (incremental, requiere materialized view logs)
CREATE MATERIALIZED VIEW mv_monthly_revenue
REFRESH FAST ON COMMIT
AS
SELECT
    TRUNC(created_at, 'MM') AS month,
    SUM(amount) AS total
FROM orders
WHERE status = 'completed'
GROUP BY TRUNC(created_at, 'MM');

-- Crear materialized view log para fast refresh
CREATE MATERIALIZED VIEW LOG ON orders
WITH PRIMARY KEY, ROWID (status, amount, created_at)
INCLUDING NEW VALUES;

-- On-demand complete refresh
EXEC DBMS_MVIEW.REFRESH('mv_monthly_revenue', 'C');

-- On-demand fast refresh
EXEC DBMS_MVIEW.REFRESH('mv_monthly_revenue', 'F');
```

### Refresh Basado en Triggers para BDs Sin Materialized Views

```sql
-- MySQL: simular materialized views con triggers
DELIMITER //

CREATE TABLE mv_daily_signups (
    day DATE PRIMARY KEY,
    signups INT NOT NULL DEFAULT 0
);

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

### Programar Refreshes con pg_cron

```sql
-- Instalar extensión pg_cron (PostgreSQL)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Programar refresh diario a las 2 AM
SELECT cron.schedule(
    'refresh_monthly_revenue',
    '0 2 * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue_mat'
);

-- Programar refresh por hora para vistas sensibles al tiempo
SELECT cron.schedule(
    'refresh_hourly_signups',
    '0 * * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY daily_signups'
);

-- Listar jobs programados
SELECT jobid, schedule, command, active FROM cron.job;

-- Desprogramar un job
SELECT cron.unschedule('refresh_monthly_revenue');
```

### Vistas Actualizables con Triggers INSTEAD OF

```sql
-- Crear una vista que une users y profiles
CREATE OR REPLACE VIEW user_profiles AS
SELECT
    u.id,
    u.email,
    u.role,
    p.full_name,
    p.bio,
    p.avatar_url
FROM users u
LEFT JOIN profiles p ON p.user_id = u.id;

-- Hacer la vista actualizable con trigger INSTEAD OF
CREATE OR REPLACE FUNCTION upsert_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar tabla users
    UPDATE users SET email = NEW.email, role = NEW.role
    WHERE id = NEW.id;

    -- Upsert profile
    INSERT INTO profiles (user_id, full_name, bio, avatar_url)
    VALUES (NEW.id, NEW.full_name, NEW.bio, NEW.avatar_url)
    ON CONFLICT (user_id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        bio = EXCLUDED.bio,
        avatar_url = EXCLUDED.avatar_url;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_upsert_user_profile
INSTEAD OF INSERT OR UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION upsert_user_profile();

-- Ahora puedes INSERT/UPDATE a través de la vista
INSERT INTO user_profiles (id, email, role, full_name, bio)
VALUES (1, 'alice@example.com', 'admin', 'Alice Smith', 'Software engineer');
```

### Uso de Vistas para Row-Level Security

```sql
-- Crear una vista que filtra por usuario actual
CREATE OR REPLACE VIEW my_orders AS
SELECT * FROM orders
WHERE customer_id = current_setting('app.current_user_id')::int;

-- Conceder acceso a la vista, no a la tabla base
GRANT SELECT ON my_orders TO app_user;
REVOKE SELECT ON orders FROM app_user;

-- Establecer el contexto de usuario actual
SET app.current_user_id = '42';
SELECT * FROM my_orders; -- Solo ve órdenes del cliente 42
```

### Monitoreo de Staleness en Vistas Materializadas

```sql
-- PostgreSQL: rastrear último refresh
CREATE TABLE mv_refresh_log (
    view_name TEXT PRIMARY KEY,
    last_refresh TIMESTAMP DEFAULT NOW(),
    duration_ms INTEGER,
    rows_refreshed INTEGER
);

-- Refresh automatizado con logging
CREATE OR REPLACE FUNCTION refresh_mv_with_logging(view_name TEXT)
RETURNS VOID AS $$
DECLARE
    start_time TIMESTAMP;
    row_count INTEGER;
BEGIN
    start_time := clock_timestamp();

    EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', view_name);

    EXECUTE format('SELECT COUNT(*) FROM %I', view_name) INTO row_count;

    INSERT INTO mv_refresh_log (view_name, last_refresh, duration_ms, rows_refreshed)
    VALUES (view_name, NOW(), EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000, row_count)
    ON CONFLICT (view_name) DO UPDATE
    SET last_refresh = EXCLUDED.last_refresh,
        duration_ms = EXCLUDED.duration_ms,
        rows_refreshed = EXCLUDED.rows_refreshed;
END;
$$ LANGUAGE plpgsql;

-- Verificar staleness
SELECT view_name, last_refresh,
       EXTRACT(EPOCH FROM (NOW() - last_refresh)) / 60 AS minutes_since_refresh
FROM mv_refresh_log
ORDER BY minutes_since_refresh DESC;
```




## Tips de Rendimiento

1. **Usa `CONCURRENTLY` para todos los refreshes en producción.** Esto previene bloqueo de lecturas:

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue_mat;
```

2. **Particiona vistas materializadas grandes.** Si tu vista agrega millones de filas, considera particionar la tabla subyacente por rango de fechas:

```sql
CREATE TABLE orders (
    id SERIAL,
    created_at TIMESTAMP NOT NULL,
    amount DECIMAL(10,2),
    status VARCHAR(20)
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2025_01 PARTITION OF orders
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

3. **Usa `ANALYZE` después del refresh.** Actualiza las estadísticas del planner para que las consultas contra la vista materializada usen planes óptimos:

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue_mat;
ANALYZE monthly_revenue_mat;
```

4. **Considera `pg_ivm` para mantenimiento incremental de vistas.** La extensión `pg_ivm` proporciona mantenimiento inmediato (actualizaciones en cada cambio de tabla base):

```sql
CREATE EXTENSION pg_ivm;
SELECT create_immv('monthly_revenue_ivm',
    'SELECT date_trunc(''month'', created_at) AS month, SUM(amount) AS total
     FROM orders WHERE status = ''completed'' GROUP BY 1');
```

5. **Usa `EXPLAIN` en consultas de vistas.** Las vistas son expansiones de macros — el planner ve la consulta completa. Verifica que los índices en las tablas base se están usando:

```sql
EXPLAIN ANALYZE SELECT * FROM monthly_revenue WHERE total > 10000;
```
