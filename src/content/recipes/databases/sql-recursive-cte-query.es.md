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

## Explicación

La CTE recursiva tiene dos partes. El miembro ancla selecciona los nodos de nivel superior, típicamente donde la referencia al padre es `NULL`. El miembro recursivo une la tabla employees a la CTE misma, encontrando filas cuyo `manager_id` coincida con un `id` ya en el conjunto de resultados. `UNION ALL` combina ambas partes, y la base de datos repite el paso recursivo hasta que no se produzcan nuevas filas. La columna `depth` se incrementa en cada nivel para que puedas visualizar la jerarquía o limitar la recursión con `WHERE depth < N`.

## Variantes

| Caso de uso | Ancla | Join recursivo |
|---------------|-------|----------------|
| Organigrama | `manager_id IS NULL` | `manager_id = id` |
| Hilo de comentarios | `parent_id IS NULL` | `parent_id = id` |
| Lista de materiales | `parent_part_id IS NULL` | `parent_part_id = id` |
| Camino a la raíz | `id = ?` | `id = parent_id` |

## Lo que funciona

1. **Incluye siempre un guarda contra ciclos.** Agrega un array `path` o una verificación `visited` para evitar recursión infinita cuando los datos contienen ciclos.
2. **Indexa las columnas padre/hijo.** Un índice en `manager_id` hace el join recursivo mucho más rápido.
3. **Limita la profundidad de recursión cuando sea posible.** Usa `WHERE depth < 10` para evitar consultas descontroladas con datos malos.
4. **Materializa árboles pequeños si se leen frecuentemente.** Una CTE recursiva en cada request puede ser costosa; cachea o precomputa para jerarquías estáticas.
5. **Prefiere listas de adyacencia para árboles simples.** Las CTEs recursivas funcionan mejor con columnas simples padre-hijo.

## Errores Comunes

1. **Olvidar `UNION ALL` vs `UNION`.** Las CTEs recursivas requieren `UNION ALL` porque los duplicados son intencionales.
2. **Sin protección de ciclos.** Una fila que apunta a sí misma causa desbordamiento de pila o cancelación de consulta.
3. **Condición de ancla ausente.** Sin un punto de inicio claro, la CTE devuelve nada o todo.
4. **Join recursivo en dirección incorrecta.** Confundir `parent_id = id` e `id = parent_id` produce ancestros en lugar de descendientes.
5. **Ejecutar CTEs recursivas en grafos enormes.** La recursión profunda puede agotar memoria de trabajo o alcanzar límites de la base de datos.

## Preguntas Frecuentes

**P: ¿Las CTEs recursivas pueden manejar ciclos?**
R: Sí, pero debes rastrear nodos visitados. PostgreSQL también puede usar sintaxis de detección `CYCLE` en versiones nuevas.

**P: ¿Las CTEs recursivas están soportadas en todas las bases de datos?**
R: La mayoría de bases de datos modernas las soportan, pero MySQL 8.0+, PostgreSQL, SQL Server y SQLite 3.8.3+ sí. Oracle usa `CONNECT BY` como alternativa.

**P: ¿Cómo construyo un string de ruta en una CTE recursiva?**
R: Agrega una columna como `path || '/' || name` y pásala en cada nivel de recursión para mostrar el breadcrumb completo.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
