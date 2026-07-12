---



contentType: recipes
slug: sql-recursive-cte-query
title: "Recorrer datos jerárquicos con CTEs recursivas"
description: "Consulta estructuras en árbol o grafo en SQL usando expresiones comunes de tabla recursivas para recorrer relaciones padre-hijo."
metaDescription: "Recorre datos jerárquicos en SQL con CTEs recursivas. Aprende a consultar organigramas, comentarios anidados y listas de materiales."
difficulty: intermediate
topics:
  - databases
tags:
  - sql
  - recursive-cte
  - postgresql
  - hierarchy
  - trees
relatedResources:
  - /guides/sql-cte-guide
  - /recipes/sql-find-duplicate-rows
  - /docs/database-schema-documentation-template
  - /guides/full-text-search-guide
  - /guides/read-replica-guide
  - /recipes/sql-index-optimization-analysis
  - /recipes/sql-migration-zero-downtime
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Recorre datos jerárquicos en SQL con CTEs recursivas. Aprende a consultar organigramas, comentarios anidados y listas de materiales."
  keywords:
    - sql
    - cte recursiva
    - postgresql
    - jerarquía
    - árbol



---


## Visión General

Las bases de datos relacionales son excelentes para tablas, pero muchos problemas del mundo real son árboles: organigramas, hilos de comentarios, listas de materiales y sistemas de archivos. Las CTEs recursivas permiten que SQL recorra estas jerarquías comenzando desde la raíz y uniendo repetidamente hijos hasta que no se encuentren más filas. El resultado es una tabla plana con una columna de profundidad que muestra qué tan lejos está cada nodo del punto de inicio.

## Cuándo Usar


- For alternatives, see [SQL CTEs — Common Table Expressions Explained](/es/guides/sql-cte-guide/).

Usa este recurso cuando:
- Necesites consultar relaciones padre-hijo almacenadas en la misma tabla.
- Quieras listar todos los descendientes o ancestros de un nodo.
- Un modelo nested-set o closure-table sea demasiado complejo para tu esquema actual.
- Estés construyendo organigramas, comentarios anidados o árboles de categorías.

## Solución

### CTE recursiva para un organigrama

```sql
WITH RECURSIVE org_tree AS (
  -- Ancla: comenzar en el CEO
  SELECT id, name, manager_id, 0 AS depth
  FROM employees
  WHERE manager_id IS NULL

  UNION ALL

  -- Recursivo: agregar reportes directos
  SELECT e.id, e.name, e.manager_id, ot.depth + 1
  FROM employees e
  INNER JOIN org_tree ot ON e.manager_id = ot.id
)
SELECT * FROM org_tree
ORDER BY depth, name;
```

### Construir un string de ruta con breadcrumbs

```sql
WITH RECURSIVE category_tree AS (
  -- Ancla: categorías raíz
  SELECT id, name, parent_id, 0 AS depth, name::TEXT AS path
  FROM categories
  WHERE parent_id IS NULL

  UNION ALL

  -- Recursivo: agregar nombre del hijo al path
  SELECT c.id, c.name, c.parent_id, ct.depth + 1,
         ct.path || ' > ' || c.name
  FROM categories c
  INNER JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT id, name, depth, path
FROM category_tree
ORDER BY path;
```

### Encontrar todos los descendientes de un nodo específico

```sql
WITH RECURSIVE descendants AS (
  -- Ancla: comenzar desde un nodo específico
  SELECT id, name, parent_id, 0 AS depth
  FROM categories
  WHERE id = 42  -- nodo inicial

  UNION ALL

  -- Recursivo: encontrar hijos
  SELECT c.id, c.name, c.parent_id, d.depth + 1
  FROM categories c
  INNER JOIN descendants d ON c.parent_id = d.id
)
SELECT * FROM descendants
ORDER BY depth, name;
```

### Encontrar todos los ancestros de un nodo (camino a la raíz)

```sql
WITH RECURSIVE ancestors AS (
  -- Ancla: comenzar desde un nodo específico
  SELECT id, name, parent_id, 0 AS depth
  FROM categories
  WHERE id = 99  -- nodo inicial

  UNION ALL

  -- Recursivo: encontrar padre
  SELECT c.id, c.name, c.parent_id, a.depth + 1
  FROM categories c
  INNER JOIN ancestors a ON a.parent_id = c.id
)
SELECT * FROM ancestors
ORDER BY depth DESC;
```

### Detección de ciclos con un array de ruta

```sql
WITH RECURSIVE safe_tree AS (
  -- Ancla
  SELECT id, name, manager_id, 0 AS depth,
         ARRAY[id] AS visited
  FROM employees
  WHERE manager_id IS NULL

  UNION ALL

  -- Recursivo: solo agregar nodos no visitados
  SELECT e.id, e.name, e.manager_id, st.depth + 1,
         st.visited || e.id
  FROM employees e
  INNER JOIN safe_tree st ON e.manager_id = st.id
  WHERE NOT e.id = ANY(st.visited)
)
SELECT id, name, depth, visited
FROM safe_tree
ORDER BY depth, name;
```

### Explosión de lista de materiales (BOM)

```sql
WITH RECURSIVE bom_explosion AS (
  -- Ancla: ensamblaje de nivel superior
  SELECT
    part_id, part_name, 1 AS quantity,
    0 AS depth, ARRAY[part_id] AS path
  FROM parts
  WHERE parent_part_id IS NULL
    AND part_id = 'BICYCLE-001'

  UNION ALL

  -- Recursivo: explotar sub-componentes
  SELECT
    p.part_id, p.part_name,
    p.quantity * be.quantity AS total_quantity,
    be.depth + 1,
    be.path || p.part_id
  FROM parts p
  INNER JOIN bom_explosion be ON p.parent_part_id = be.part_id
)
SELECT
  part_id, part_name, total_quantity, depth,
  array_to_string(path, ' -> ') AS assembly_path
FROM bom_explosion
ORDER BY depth, part_name;
```

### Limitar profundidad de recursión

```sql
WITH RECURSIVE limited_tree AS (
  SELECT id, name, manager_id, 0 AS depth
  FROM employees
  WHERE manager_id IS NULL

  UNION ALL

  SELECT e.id, e.name, e.manager_id, lt.depth + 1
  FROM employees e
  INNER JOIN limited_tree lt ON e.manager_id = lt.id
  WHERE lt.depth < 5  -- detener en 5 niveles
)
SELECT * FROM limited_tree
ORDER BY depth, name;
```

## Explicación

La CTE recursiva tiene dos partes. El miembro ancla selecciona los nodos de nivel superior, típicamente donde la referencia al padre es `NULL`. El miembro recursivo une la tabla employees a la CTE misma, encontrando filas cuyo `manager_id` coincida con un `id` ya en el conjunto de resultados. `UNION ALL` combina ambas partes, y la base de datos repite el paso recursivo hasta que no se produzcan nuevas filas. La columna `depth` se incrementa en cada nivel para que puedas visualizar la jerarquía o limitar la recursión con `WHERE depth < N`.

### Cómo ejecuta la base de datos las CTEs recursivas

1. Evaluar el miembro ancla y almacenar resultados en una tabla de trabajo
2. Evaluar el miembro recursivo usando la tabla de trabajo como entrada
3. Reemplazar la tabla de trabajo con los nuevos resultados
4. Repetir pasos 2-3 hasta que la tabla de trabajo esté vacía
5. Combinar todos los resultados con `UNION ALL`

### Seguridad de ciclos

Sin detección de ciclos, una fila que se referencia a sí misma (directa o transitivamente) causa recursión infinita. El enfoque del array `visited` rastrea qué nodos han sido vistos. PostgreSQL 14+ también soporta la cláusula `CYCLE`:

```sql
WITH RECURSIVE org_tree AS (
  SELECT id, name, manager_id FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.name, e.manager_id FROM employees e
  JOIN org_tree ot ON e.manager_id = ot.id
)
CYCLE id SET is_cycle TO true DEFAULT false USING cycle_path
SELECT * FROM org_tree WHERE NOT is_cycle;
```

## Variantes

| Caso de uso | Ancla | Join recursivo |
|---------------|-------|----------------|
| Organigrama (top-down) | `manager_id IS NULL` | `manager_id = id` |
| Camino a la raíz (bottom-up) | `id = ?` | `id = parent_id` |
| Hilo de comentarios | `parent_id IS NULL` | `parent_id = id` |
| Lista de materiales | `parent_part_id IS NULL` | `parent_part_id = id` |
| Sistema de archivos | `parent_dir_id IS NULL` | `parent_dir_id = id` |
| Árbol de categorías | `parent_id IS NULL` | `parent_id = id` |

## Lo que funciona

1. **Incluye siempre un guarda contra ciclos.** Agrega un array `path` o una verificación `visited` para evitar recursión infinita cuando los datos contienen ciclos.
2. **Indexa las columnas padre/hijo.** Un índice en `manager_id` hace el join recursivo mucho más rápido.
3. **Limita la profundidad de recursión cuando sea posible.** Usa `WHERE depth < 10` para evitar consultas descontroladas con datos malos.
4. **Materializa árboles pequeños si se leen frecuentemente.** Una CTE recursiva en cada request puede ser costosa; cachea o precomputa para jerarquías estáticas.
5. **Prefiere listas de adyacencia para árboles simples.** Las CTEs recursivas funcionan mejor con columnas simples padre-hijo.
6. **Usa `ARRAY` para rastreo de ruta.** Los arrays son eficientes para detección de ciclos y pueden renderizarse como breadcrumbs.
7. **Prueba con datasets pequeños primero.** Las CTEs recursivas pueden ser difíciles de depurar; comienza con 10-20 filas y verifica las columnas depth y path.

## Errores Comunes

1. **Olvidar `UNION ALL` vs `UNION`.** Las CTEs recursivas requieren `UNION ALL` porque los duplicados son intencionales. `UNION` elimina duplicados y puede ocultar datos.
2. **Sin protección de ciclos.** Una fila que apunta a sí misma causa desbordamiento de pila o cancelación de consulta.
3. **Condición de ancla ausente.** Sin un punto de inicio claro, la CTE devuelve nada o todo.
4. **Join recursivo en dirección incorrecta.** Confundir `parent_id = id` e `id = parent_id` produce ancestros en lugar de descendientes.
5. **Ejecutar CTEs recursivas en grafos enormes.** La recursión profunda puede agotar memoria de trabajo o alcanzar límites de la base de datos.
6. **No indexar la columna de join.** El miembro recursivo une por `manager_id`; sin índice, cada iteración escanea toda la tabla.
7. **Usar límite de profundidad sin entender los datos.** Un `WHERE depth < 5` puede truncar silenciosamente jerarquías legítimamente profundas.

## Preguntas Frecuentes

**P: ¿Las CTEs recursivas pueden manejar ciclos?**
R: Sí, pero debes rastrear nodos visitados con un array o usar la cláusula `CYCLE` de PostgreSQL (14+). Sin protección, los ciclos causan recursión infinita.

**P: ¿Las CTEs recursivas están soportadas en todas las bases de datos?**
R: La mayoría de bases de datos modernas las soportan: MySQL 8.0+, PostgreSQL, SQL Server, SQLite 3.8.3+. Oracle usa `CONNECT BY` como alternativa.

**P: ¿Cómo construyo un string de ruta en una CTE recursiva?**
R: Agrega una columna como `path || '/' || name` y pásala en cada nivel de recursión para mostrar el breadcrumb completo.

**P: ¿Cuál es el impacto de rendimiento de las CTEs recursivas?**
R: Cada iteración del miembro recursivo ejecuta un join. Con un índice en la columna de join, cada iteración es una búsqueda por índice. Sin índice, cada iteración escanea toda la tabla, haciendo la CTE O(n * depth).

**P: ¿Puedo usar CTEs recursivas para recorrido de grafos?**
R: Sí, pero solo para árboles (cada nodo tiene un padre). Para grafos generales con múltiples caminos al mismo nodo, usa detección de ciclos y considera bases de datos especializadas en grafos.

**P: ¿Cómo limito el número de filas devueltas?**
R: Usa `LIMIT N` en la consulta externa. La base de datos sigue computando todos los resultados recursivos, pero solo devuelve N filas.

**P: ¿Puedo agregar datos en cada nivel de la jerarquía?**
R: Sí. Usa una CTE recursiva para generar el árbol, luego join de vuelta para agregar. Por ejemplo, sumar todas las ventas de cada gerente incluyendo las de sub-gerentes.

**P: ¿Cómo depuro una CTE recursiva que no devuelve filas?**
R: Ejecuta el miembro ancla solo primero. Si devuelve filas, agrega el miembro recursivo con `LIMIT 1` iteración. Verifica la dirección de la condición de join y que la condición ancla coincida con tus datos.

## Consejos de Rendimiento

1. **Indexa la columna de join.** El miembro recursivo une por `manager_id` o `parent_id`. Sin índice, cada iteración escanea toda la tabla.

```sql
CREATE INDEX idx_employees_manager_id ON employees (manager_id);
CREATE INDEX idx_categories_parent_id ON categories (parent_id);
```

2. **Usa `MATERIALIZED` para CTEs grandes.** En PostgreSQL 12+, las CTEs se inlinean por defecto. Para CTEs recursivas referenciadas múltiples veces, usa `MATERIALIZED` para computar una vez:

```sql
WITH RECURSIVE org_tree AS MATERIALIZED (
  SELECT id, name, manager_id, 0 AS depth FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.name, e.manager_id, ot.depth + 1 FROM employees e JOIN org_tree ot ON e.manager_id = ot.id
)
SELECT * FROM org_tree;
```

3. **Aumenta `work_mem` para árboles profundos.** Las CTEs recursivas acumulan resultados intermedios en memoria. Aumenta `work_mem` para la sesión si hay spills a disco.

4. **Usa `EXPLAIN ANALYZE` para verificar el conteo de iteraciones.** El plan muestra cuántas iteraciones ejecutó el miembro recursivo. Si ejecuta cientos de veces, verifica índices faltantes o ciclos.
