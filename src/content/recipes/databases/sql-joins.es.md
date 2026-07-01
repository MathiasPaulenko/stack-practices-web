---
contentType: recipes
slug: sql-joins
title: "Joins en SQL"
description: "Ejemplos prácticos de INNER, LEFT, RIGHT y FULL OUTER JOIN con patrones de consultas del mundo real."
metaDescription: "Aprende JOINs en SQL con ejemplos prácticos. INNER, LEFT, RIGHT y FULL OUTER JOIN explicados con consultas reales y tips de rendimiento."
difficulty: beginner
topics:
  - databases
tags:
  - database
  - sql
relatedResources:
  - /recipes/parse-json
  - /recipes/read-write-file
  - /recipes/pagination
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende JOINs en SQL con ejemplos prácticos. INNER, LEFT, RIGHT y FULL OUTER JOIN explicados con consultas reales y tips de rendimiento."
  keywords:
    - joins sql
    - inner join
    - left join
    - consultas base de datos
---

## Overview

Los JOINs en SQL combinan filas de dos o más tablas basándose en una columna relacionada. Son una de las capacidades más poderosas y frecuentemente mal entendidas de las bases de datos relacionales. Esta receta demuestra los cuatro tipos comunes de JOIN con un esquema realista de `users` y `orders`.

## When to Use

Usa JOINs cuando:

- Necesites datos de múltiples tablas en un solo resultado. Consulta [Database Views](/recipes/databases/database-views-materialized) para consultas reutilizables.
- Esquemas normalizados dividan datos relacionados entre tablas (ej. users, orders, products)
- Reportes o análisis requieran datos agregados de varias fuentes. Consulta [Query Optimization](/recipes/databases/postgres-query-optimization) para rendimiento.
- Quieras encontrar registros huérfanos o no coincidentes (ej. usuarios sin órdenes). Consulta [Soft Deletes](/recipes/databases/soft-deletes) para manejo de datos faltantes.

## Solution

### Schema

```sql
CREATE TABLE users (
    user_id INT PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    user_id INT,
    amount DECIMAL(10,2)
);

INSERT INTO users VALUES (1, 'Ada'), (2, 'Bob'), (3, 'Chen');
INSERT INTO orders VALUES (101, 1, 250.00), (102, 1, 75.50), (103, 2, 120.00);
```

### INNER JOIN (solo filas coincidentes)

```sql
SELECT u.name, o.order_id, o.amount
FROM users u
INNER JOIN orders o ON u.user_id = o.user_id;
```

| name | order_id | amount |
|------|----------|--------|
| Ada  | 101      | 250.00 |
| Ada  | 102      | 75.50  |
| Bob  | 103      | 120.00 |

Chen no tiene órdenes, así que Chen no aparece.

### LEFT JOIN (todas de la izquierda, coincidentes de la derecha)

```sql
SELECT u.name, o.order_id, o.amount
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id;
```

| name | order_id | amount |
|------|----------|--------|
| Ada  | 101      | 250.00 |
| Ada  | 102      | 75.50  |
| Bob  | 103      | 120.00 |
| Chen | NULL     | NULL   |

Chen aparece con NULLs para órdenes faltantes.

### RIGHT JOIN (todas de la derecha, coincidentes de la izquierda)

```sql
SELECT u.name, o.order_id, o.amount
FROM users u
RIGHT JOIN orders o ON u.user_id = o.user_id;
```

Mismo resultado que INNER JOIN aquí porque cada orden tiene un usuario. En la práctica, RIGHT JOIN es raro; intercambia el orden de las tablas y usa LEFT JOIN.

### FULL OUTER JOIN (todas las filas de ambas)

```sql
SELECT u.name, o.order_id, o.amount
FROM users u
FULL OUTER JOIN orders o ON u.user_id = o.user_id;
```

Devuelve todos los usuarios y todas las órdenes, con NULLs donde no hay coincidencia en algún lado. No soportado en MySQL; usa `UNION` de LEFT y RIGHT joins como workaround.

## Explanation

- **INNER JOIN**: devuelve solo filas donde la condición de join coincide en ambas tablas. Úsalo cuando solo te importen pares completos y válidos.
- **LEFT JOIN**: devuelve cada fila de la tabla izquierda, más filas coincidentes de la derecha. Úsalo cuando quieras todos los registros primarios aunque algunos carezcan de datos relacionados.
- **RIGHT JOIN**: el espejo de LEFT JOIN. Raramente usado porque invertir el orden de las tablas y usar LEFT JOIN es más intuitivo.
- **FULL OUTER JOIN**: devuelve todas las filas de ambas tablas. Útil para encontrar registros completamente no coincidentes en cualquier lado.

## Variants

| Objetivo | Tipo de Join |
|----------|--------------|
| Solo pares coincidentes | `INNER JOIN` |
| Todos los usuarios, con totales de órdenes | `LEFT JOIN` + `GROUP BY` |
| Usuarios sin órdenes | `LEFT JOIN` + `WHERE o.user_id IS NULL` |
| Órdenes sin usuarios (datos corruptos) | `RIGHT JOIN` o `LEFT JOIN` con tablas intercambiadas |
| Todos los registros de ambas | `FULL OUTER JOIN` (o `UNION` en MySQL) |

## Lo que funciona

- **Indexa claves foráneas**: la columna de join (`orders.user_id`) debería tener un índice o constraint de foreign key. Consulta [Query Optimization](/recipes/databases/postgres-query-optimization) para indexación. Sin él, tablas grandes hacen full scans.
- **Usa aliases de tabla**: `users u` hace las consultas legibles y más cortas.
- **Sé explícito**: escribe `INNER JOIN` en lugar de solo `JOIN` — comunica la intención claramente.
- **Filtra en la cláusula ON para lógica de join, WHERE para filtrado de resultados**: `ON u.id = o.user_id AND o.amount > 100` se comporta diferente que `WHERE o.amount > 100` con LEFT JOINs.
- **Cuidado con productos cartesianos**: olvidar la cláusula `ON` multiplica cada fila de la tabla A por cada fila de la tabla B.

## Common Mistakes

- **Usar LEFT JOIN cuando se necesita INNER JOIN**: esto produce filas NULL que el código downstream puede no esperar.
- **Join en la columna equivocada**: `ON u.name = o.user_id` compila pero da resultados sin sentido.
- **Consultas N+1 en código de aplicación**: obtener una lista de usuarios y luego consultar órdenes para cada uno individualmente es más lento que un solo JOIN. Consulta [Caching](/recipes/databases/redis-cache-patterns) para reducción de queries.
- **Índices faltantes**: JOINs en columnas sin indexar son rápidos en desarrollo con 100 filas y catastróficos en producción con millones.
- **Joins implícitos**: tablas separadas por coma en la cláusula `FROM` (`FROM users, orders`) son propensos a errores; siempre usa sintaxis de JOIN explícita.

## Frequently Asked Questions

**Q: ¿Cuál es la diferencia entre JOIN e INNER JOIN?**
A: Son idénticos. `JOIN` es shorthand de `INNER JOIN`. Escribir la palabra completa es más claro para los lectores.

**Q: ¿Cómo encuentro usuarios que nunca han hecho una orden?**
A: Usa un `LEFT JOIN` y filtra por NULL en el lado derecho: `SELECT u.name FROM users u LEFT JOIN orders o ON u.user_id = o.user_id WHERE o.user_id IS NULL`.

**Q: ¿Puedo hacer join de más de dos tablas?**
A: Sí. Encadena JOINs: `FROM a JOIN b ON ... JOIN c ON ...`. El query planner maneja el orden; asegúrate de que las columnas de join estén indexadas.
