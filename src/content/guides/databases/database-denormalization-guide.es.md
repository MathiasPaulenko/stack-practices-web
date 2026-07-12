---




contentType: guides
slug: database-denormalization-guide
title: "Desnormalización de Bases de Datos"
description: "Guía práctica de desnormalización de bases de datos: cuándo intercambiar almacenamiento por rendimiento de lectura, patrones comunes y cómo mantener datos derivados consistentes."
metaDescription: "Aprende desnormalización de bases de datos: cuándo intercambiar almacenamiento por rendimiento, patrones comunes y mantener datos derivados consistentes."
difficulty: intermediate
topics:
  - databases
  - performance
tags:
  - desnormalizacion
  - diseno-base-datos
  - rendimiento-lectura
  - redundancia-datos
  - vistas-materializadas
  - tablas-contadores
  - guia
relatedResources:
  - /guides/database-design-guide
  - /guides/database-normalization-guide
  - /guides/sql-performance-tuning-guide
  - /guides/complete-guide-elasticsearch-cluster-setup
  - /guides/complete-guide-postgresql-tuning
  - /guides/database-replication-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende desnormalización de bases de datos: cuándo intercambiar almacenamiento por rendimiento, patrones comunes y mantener datos derivados consistentes."
  keywords:
    - desnormalizacion
    - diseno-base-datos
    - rendimiento-lectura
    - redundancia-datos
    - vistas-materializadas
    - guia




---

## Overview

La desnormalización es la introducción intencional de redundancia en un esquema de base de datos para mejorar el rendimiento de lectura. Mientras que la normalización elimina la redundancia para garantizar la consistencia, la desnormalización acepta duplicación controlada para reducir JOINs, simplificar consultas y acelerar lecturas. No es una excusa para un mal diseño; es una optimización deliberada aplicada después de establecer una base normalizada.

## When to Use


- For alternatives, see [Complete Guide to Redis Caching Strategies](/es/guides/complete-guide-redis-caching-strategies/).

- Cargas de trabajo con alta frecuencia de lectura donde los JOINs son el cuello de botella
- Consultas agregadas que se ejecutan frecuentemente sobre grandes conjuntos de datos
- Dashboards o analítica en tiempo real requieren respuesta sub-segundo
- Existe un mecanismo confiable para mantener datos derivados sincronizados
- El almacenamiento es más barato que la computación o la latencia

## Common Patterns

| Patron | Descripcion | Ejemplo |
|--------|-------------|---------|
| **Columnas computadas** | Almacenar valores derivados junto a los datos fuente | `total_price = quantity * unit_price` |
| **Contadores** | Mantener conteos pre-agregados | `post.like_count` actualizado en cada like |
| **Documentos embebidos** | Anidar datos relacionados en una sola fila/documento | Orden con items embebidos |
| **Tablas de lookup** | Duplicar datos de referencia frecuentemente unidos | Nombre de categoria en la fila del producto |
| **Vistas materializadas** | Resultados de consulta pre-computados refrescados periodicamente | Resumen diario de ingresos |

## Ejemplo de Tabla de Contadores

```sql
-- En lugar de contar likes en cada lectura
SELECT COUNT(*) FROM post_likes WHERE post_id = 123;

-- Desnormalizar en un contador
CREATE TABLE posts (
    post_id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    like_count INT NOT NULL DEFAULT 0
);

-- Actualizar contador transaccionalmente
BEGIN;
    INSERT INTO post_likes (post_id, user_id) VALUES (123, 456);
    UPDATE posts SET like_count = like_count + 1 WHERE post_id = 123;
COMMIT;
```

## Ejemplo de Columna Computada

```sql
CREATE TABLE order_items (
    item_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(order_id),
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    -- Columna computada desnormalizada
    line_total DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- La consulta ahora es un simple SELECT sin calculo
SELECT item_id, product_id, line_total FROM order_items WHERE order_id = 100;
```

## Vista Materializada para Agregaciones

```sql
CREATE MATERIALIZED VIEW daily_revenue AS
SELECT
    DATE(created_at) as day,
    SUM(total) as revenue,
    COUNT(*) as order_count
FROM orders
GROUP BY DATE(created_at);

-- Refrescar en un horario o trigger
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_revenue;

-- Indexar la vista materializada para lecturas rapidas
CREATE INDEX idx_daily_revenue_day ON daily_revenue(day);
```

## Mantener Datos Desnormalizados Consistentes

| Estrategia | Pros | Contras |
|------------|------|---------|
| **Actualizaciones a nivel aplicacion** | Simple, explicito | Riesgo de inconsistencia si multiples apps escriben |
| **Triggers de base de datos** | Garantizado en cada escritura | Dificil de depurar, puede ralentizar escrituras |
| **CDC (Change Data Capture)** | Desacoplado, asincrono | Consistencia eventual, overhead de infraestructura |
| **Refresco de vistas materializadas** | Automatico para agregados | Datos obsoletos entre refrescos |

```sql
-- Trigger para mantener contador desnormalizado
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET like_count = like_count + 1 WHERE post_id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET like_count = like_count - 1 WHERE post_id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_likes_trigger
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW EXECUTE FUNCTION update_post_like_count();
```

## Common Mistakes

- **Desnormalizar prematuramente** — normalizar primero, desnormalizar solo cuando el rendimiento lo demanda
- **Sin estrategia de sincronizacion** — datos desnormalizados que divergen causan bugs silenciosos
- **Sobredesnormalizar** — cada columna agregada es una carga de mantenimiento; justificar cada una
- **Ignorar amplificacion de escritura** — mas campos desnormalizados significan mas escrituras por operacion
- **Tratar desnormalizacion como fix para malas consultas** — optimizar consultas e indices antes de introducir redundancia

## FAQ

**La desnormalizacion viola la integridad de datos?**
No si se gestiona correctamente. La clave es tener una unica fuente de verdad (tablas normalizadas) y tratar campos desnormalizados como datos derivados/cache con mecanismos de sincronizacion claros.

**Debo desnormalizar en SQL o NoSQL?**
Las bases NoSQL frecuentemente fomentan la desnormalizacion por diseno (documentos embebidos). En SQL, usala con moderacion y documenta la razon de cada campo desnormalizado.

**Como detecto desviacion en datos desnormalizados?**
Ejecutar controles de consistencia periodicos: comparar el valor desnormalizado contra un calculo fresco de las tablas fuente. Alertar si divergen.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.


## Temas Avanzados

### Escenario Detallado: Desnormalizacion para Dashboard de Ventas

```text
Sistema: Dashboard de ventas en tiempo real (PostgreSQL)
Volumen: 10M ordenes, 50M items de orden
Problema: Query de resumen diario tarda 8s con JOINs
Objetivo: Reducir a < 200ms con desnormalizacion controlada

Esquema normalizado (antes):
  SELECT
      DATE(o.created_at) AS day,
      c.name AS category_name,
      COUNT(*) AS order_count,
      SUM(oi.quantity * oi.unit_price) AS revenue
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  JOIN products p ON p.id = oi.product_id
  JOIN categories c ON c.id = p.category_id
  WHERE o.created_at >= NOW() - INTERVAL "30 days"
  GROUP BY day, c.name
  ORDER BY day DESC, revenue DESC;
  -- Tiempo: 8.2s (3 JOINs + agregacion sobre 50M filas)

Estrategia de desnormalizacion:

  Paso 1: Agregar category_name en order_items
  ALTER TABLE order_items ADD COLUMN category_name VARCHAR(100);
  UPDATE order_items oi SET category_name = c.name
  FROM products p JOIN categories c ON c.id = p.category_id
  WHERE p.id = oi.product_id;

  -- Trigger para mantener consistencia
  CREATE FUNCTION sync_category_name() RETURNS TRIGGER AS $$
  BEGIN
      SELECT c.name INTO NEW.category_name
      FROM products p JOIN categories c ON c.id = p.category_id
      WHERE p.id = NEW.product_id;
      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER order_items_category
  BEFORE INSERT OR UPDATE OF product_id ON order_items
  FOR EACH ROW EXECUTE FUNCTION sync_category_name();

  Paso 2: Crear tabla de resumen diario desnormalizada
  CREATE TABLE daily_category_summary (
      day DATE NOT NULL,
      category_name VARCHAR(100) NOT NULL,
      order_count INT NOT NULL DEFAULT 0,
      revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
      avg_order_value DECIMAL(10,2) NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (day, category_name)
  );

  CREATE INDEX idx_summary_day ON daily_category_summary(day DESC);

  Paso 3: Vista materializada para refresco periodico
  CREATE MATERIALIZED VIEW mv_daily_category AS
  SELECT
      DATE(o.created_at) AS day,
      oi.category_name,
      COUNT(DISTINCT o.id) AS order_count,
      SUM(oi.quantity * oi.unit_price) AS revenue,
      AVG(oi.quantity * oi.unit_price) AS avg_order_value
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  WHERE o.created_at >= NOW() - INTERVAL "90 days"
  GROUP BY day, oi.category_name;

  -- Refresco cada hora
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_category;

  Paso 4: Query del dashboard usando la tabla desnormalizada
  SELECT day, category_name, order_count, revenue, avg_order_value
  FROM daily_category_summary
  WHERE day >= CURRENT_DATE - INTERVAL "30 days"
  ORDER BY day DESC, revenue DESC;
  -- Tiempo: 45ms (sin JOINs, indice en day)

Resultados:
  | Metrica | Antes (normalizado) | Despues (desnormalizado) |
  |---------|---------------------|--------------------------|
  | Tiempo de query | 8.2s | 45ms |
  | JOINs requeridos | 3 | 0 |
  | Filas escaneadas | 50M | 90 (30 dias x 3 categorias) |
  | Almacenamiento extra | 0 | +200MB (category_name + summary) |
  | Mantenimiento | Ninguno | Trigger + refresh horario |

Verificacion de consistencia (job nocturno):
  SELECT a.day, a.category_name,
         a.revenue AS denormalized, b.revenue AS fresh,
         ABS(a.revenue - b.revenue) AS drift
  FROM daily_category_summary a
  JOIN mv_daily_category b ON a.day = b.day AND a.category_name = b.category_name
  WHERE ABS(a.revenue - b.revenue) > 0.01;
  -- Si drift > 0.01, alertar y investigar
```

### Como decido entre trigger, CDC o refresh para sincronizar?

Usa triggers cuando la sincronizacion debe ser inmediata y el volumen de escrituras es bajo. Usa CDC (Debezium + Kafka) cuando necesitas desacoplar la sincronizacion del write path y toleras consistencia eventual. Usa refresh de vistas materializadas para agregados que no necesitan datos en tiempo real. La regla: triggers para datos criticos, CDC para escalabilidad, refresh para dashboards.
























End of document. Review and update quarterly.