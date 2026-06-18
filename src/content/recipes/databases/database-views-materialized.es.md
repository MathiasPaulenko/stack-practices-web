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
  - database-views
  - materialized-views
relatedResources:
  - /guides/sql-performance-tuning-guide
  - /recipes/database-deadlocks-retries
  - /recipes/database-read-replicas
  - /recipes/sql-joins
  - /guides/database-design-guide
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
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

Las vistas de base de datos son tablas virtuales definidas por una consulta. Simplifican joins complejos, implementan control de acceso exponiendo solo columnas seleccionadas y centralizan lógica de negocio en el esquema. Las vistas materializadas van más allá almacenando físicamente el resultado de la consulta, intercambiando espacio en disco y eventual desfase por lecturas dramáticamente más rápidas. Esta receta cubre crear, refrescar e indexar ambos tipos en PostgreSQL, MySQL y SQL Server.

## Cuándo Usar

Usa este recurso cuando:
- Ejecutas repetidamente la misma consulta de agregación compleja y es lenta
- Quieres restringir acceso a datos sin duplicar lógica de permisos en código de aplicación
- Necesitas precomputar joins o agregaciones costosas para dashboards de reportes
- Quieres abstraer cambios de esquema de consumidores downstream

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

## Mejores Prácticas

1. Siempre crea un índice único en vistas materializadas antes de usar refresco `CONCURRENTLY`
2. Usa `CREATE OR REPLACE VIEW` para cambios no disruptivos; elimina y recrea solo cuando sea necesario
3. Programa refrescos con cron, pg_cron o tu scheduler de jobs; refresca después de ETL, no durante picos de lectura
4. Usa vistas para exponer solo las columnas necesarias para control de acceso de mínimo privilegio
5. Monitorea uso de disco; las vistas materializadas pueden crecer mucho con filas anchas o alta cardinalidad

## Errores Comunes

1. **Olvidar refrescar** — las vistas materializadas obsoletas devuelven silenciosamente datos desactualizados
2. **Sin índice único** — `REFRESH CONCURRENTLY` falla sin uno, bloqueando la vista durante el refresco
3. **Vistas modificables sin reglas/triggers** — no todas las bases de datos soportan `INSERT` en vistas; el código de aplicación debe manejarlo
4. **Vistas complejas sin índices subyacentes** — una vista no crea índices; asegúrate de que las tablas base estén indexadas
5. **Usar vistas para consultas transaccionales en tiempo real** — las vistas añaden overhead de consulta; úsalas para reportes, no para caminos calientes OLTP

## Preguntas Frecuentes

### ¿Puedo actualizar datos a través de una vista?

A veces. Las vistas simples de una sola tabla suelen ser actualizables. Los joins de múltiples tablas, agregaciones o vistas con `DISTINCT` no lo son. PostgreSQL soporta triggers `INSTEAD OF` para hacer vistas complejas actualizables.

### ¿Con qué frecuencia debo refrescar una vista materializada?

Refresca después de que los datos subyacentes cambien, o en un horario que coincida con tu tolerancia a la desfase. Un dashboard de ingresos podría refrescarse cada hora; un índice de búsqueda de usuarios cada 5 minutos. Usa `CONCURRENTLY` para evitar bloqueos de lectura.

### ¿Cuál es la diferencia entre una vista y un CTE?

Un CTE (`WITH`) existe solo durante la duración de una sola consulta. Una vista es un objeto de esquema persistente que cualquier consulta puede referenciar. Usa CTEs para organización one-off de consultas; usa vistas para abstracciones reutilizables.
