---
contentType: recipes
slug: pagination
title: "Paginación"
description: "Cómo implementar paginación basada en cursor y offset en APIs y bases de datos en Python, JavaScript y SQL."
metaDescription: "Ejemplos prácticos de paginación en Python, JavaScript y SQL. Aprende paginación offset vs cursor, LIMIT/OFFSET y APIs cursor-based para fetching escalable."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - pagination
  - database
relatedResources:
  - /recipes/call-rest-api
  - /recipes/sql-joins
  - /recipes/handle-errors
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejemplos prácticos de paginación en Python, JavaScript y SQL. Aprende paginación offset vs cursor, LIMIT/OFFSET y APIs cursor-based para fetching escalable."
  keywords:
    - paginación
    - api pagination
    - paginación offset
    - paginación cursor
    - limit offset
    - python paginación
    - javascript paginación
    - sql paginación
---

## Visión general

La paginación es la técnica de dividir un dataset grande en páginas discretas, mejorando el rendimiento y la experiencia de usuario. Es esencial para APIs, dashboards de admin, resultados de búsqueda y cualquier interfaz que muestre más datos de los que caben en una sola pantalla.

Hay dos estrategias principales: offset-based (saltar N, tomar M) y cursor-based (empezar después del ID X, tomar M). Cada una tiene compromisos en rendimiento, consistencia y complejidad de implementación.

## Cuándo usarlo

Usa esta recipe cuando:

- Construyes APIs [REST](/recipes/api/call-rest-api) o [GraphQL](/recipes/api/graphql-api) que retornan colecciones
- Muestras tablas o listas grandes en una UI
- Exportas datos en chunks manejables
- Evitas errores de out-of-memory al procesar datasets grandes

## Solución

### Python

```python
from typing import List, Dict, Any

# Paginación offset-based
async def get_users_offset(db, page: int = 1, page_size: int = 20) -> List[Dict[str, Any]]:
    offset = (page - 1) * page_size
    rows = await db.fetch("SELECT * FROM users ORDER BY id LIMIT $1 OFFSET $2", page_size, offset)
    return [dict(row) for row in rows]

# Paginación cursor-based (recomendada para datasets grandes)
async def get_users_cursor(db, cursor: int = None, page_size: int = 20) -> Dict[str, Any]:
    if cursor:
        rows = await db.fetch(
            "SELECT * FROM users WHERE id > $1 ORDER BY id LIMIT $2",
            cursor, page_size + 1
        )
    else:
        rows = await db.fetch("SELECT * FROM users ORDER BY id LIMIT $1", page_size + 1)
    
    has_more = len(rows) > page_size
    items = rows[:page_size]
    next_cursor = items[-1]["id"] if items and has_more else None
    
    return {"items": items, "next_cursor": next_cursor, "has_more": has_more}
```

### JavaScript (Node.js)

```javascript
// Offset-based
async function getUsersOffset(page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  const users = await db.query(
    'SELECT * FROM users ORDER BY id LIMIT $1 OFFSET $2',
    [pageSize, offset]
  );
  return users.rows;
}

// Cursor-based (recomendada)
async function getUsersCursor(cursor = null, pageSize = 20) {
  const query = cursor
    ? 'SELECT * FROM users WHERE id > $1 ORDER BY id LIMIT $2'
    : 'SELECT * FROM users ORDER BY id LIMIT $1';
  const params = cursor ? [cursor, pageSize + 1] : [pageSize + 1];
  
  const result = await db.query(query, params);
  const rows = result.rows;
  const hasMore = rows.length > pageSize;
  const items = rows.slice(0, pageSize);
  const nextCursor = hasMore ? items[items.length - 1].id : null;
  
  return { items, nextCursor, hasMore };
}
```

### SQL

```sql
-- Offset-based (simple pero más lento en offsets grandes)
SELECT * FROM users
ORDER BY created_at DESC
LIMIT 20 OFFSET 400;

-- Cursor-based (eficiente para datasets grandes)
SELECT * FROM users
WHERE created_at < '2024-01-15T10:00:00Z'
ORDER BY created_at DESC
LIMIT 20;

-- Count para metadata de paginación offset
SELECT COUNT(*) FROM users;
```

## Explicación

- **Paginación offset**: Simple de implementar. `LIMIT 20 OFFSET 400` salta 400 filas, retorna 20. Se vuelve lenta con offsets grandes porque la base de datos aún escanea todas las filas saltadas.
- **Paginación cursor**: Usa un valor (generalmente un ID o timestamp) para reanudar. Consistente y rápida incluso para páginas profundas. Más difícil saltar a páginas arbitrarias.
- **Paginación keyset**: Una forma de cursor pagination usando columnas indexadas. Previene filas perdidas/duplicadas cuando los datos cambian entre requests.

## Variantes

| Enfoque | Pros | Cons | Mejor para |
|---------|------|------|------------|
| Offset/Limit | Simple, salta a cualquier página | Lento en offsets profundos, inconsistente bajo mutaciones | Datasets pequeños, UIs de admin |
| Cursor-based | Rápido, consistente | No puede saltar a página arbitraria | Feeds sociales, scroll infinito |
| Seek / Keyset | Rápido, sorting estable | Requiere clave única ordenada | Datasets ordenados grandes |

## Mejores prácticas

- **Usa cursor pagination para APIs de alto tráfico**: Previene cliffs de rendimiento
- **Siempre ORDER BY**: Sin ordenar, la paginación es no determinística. Consulta [SQL Joins](/recipes/databases/sql-joins) para optimización de queries.
- **Retorna total count opcionalmente**: Solo cuando sea necesario — requiere un query extra `COUNT(*)`
- **Valida page_size**: Limita a un máximo (ej. 100) para prevenir abuso
- **Usa columnas indexadas para campos cursor**: Asegura scans de rango eficientes
- **Codifica cursors**: Ofusca IDs con base64 o strings encriptadas

## Errores comunes

- No ordenar resultados, causando que items se desplacen entre páginas
- Usar `SELECT COUNT(*)` innecesariamente en tablas masivas
- Permitir `page_size` ilimitado
- Usar paginación offset en datasets con millones de filas. Consulta [Paginación con Cursor](/recipes/api/cursor-pagination-postgresql) para paginación escalable.
- Ignorar race conditions donde los datos se insertan/eliminan entre requests de página

## Preguntas frecuentes

**P: ¿Qué método de paginación debería usar para una API REST?**
R: Cursor-based para APIs públicas/de alto tráfico (feeds, búsqueda). Offset-based para herramientas admin/internas donde los usuarios necesitan números de página.

**P: ¿Cómo pagino con filtros y sorting?**
R: Incluye las columnas de filtro/sort en tu cursor. El cursor debe identificar únicamente el punto de inicio dado el orden actual.

**P: ¿Cuál es el máximo page size que debería permitir?**
R: Típicamente 50-100. Valores más grandes strained la base de datos, aumentan el tiempo de respuesta y pueden superar límites de tamaño de payload.
