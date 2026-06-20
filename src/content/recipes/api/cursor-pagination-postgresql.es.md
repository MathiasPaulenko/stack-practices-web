---
contentType: recipes
slug: cursor-pagination-postgresql
title: "Paginacion por Cursor con PostgreSQL"
description: "Implementa paginacion eficiente por cursor para datasets grandes en PostgreSQL, evitando la degradacion de performance de OFFSET con paginacion keyset indexada y orden estable"
metaDescription: "Implementa paginacion por cursor en PostgreSQL. Paginacion keyset eficiente para datasets grandes evitando degradacion de OFFSET con ordenamiento indexado."
difficulty: intermediate
topics:
  - api
  - databases
tags:
  - pagination
  - api
  - databases
relatedResources:
  - /recipes/databases/indexed-cursor-pagination
  - /recipes/api/go-rest-api-gin
  - /guides/api-design-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementa paginacion por cursor en PostgreSQL. Paginacion keyset eficiente para datasets grandes evitando degradacion de OFFSET con ordenamiento indexado."
  keywords:
    - cursor pagination
    - keyset pagination
    - postgresql
    - offset performance
    - api pagination
---

# Paginacion por Cursor con PostgreSQL

La paginacion basada en offset (`LIMIT 20 OFFSET 10000`) se degrada linealmente a medida que los offsets crecen porque PostgreSQL debe escanear y descartar todas las filas precedentes. La paginacion por cursor (keyset) usa columnas indexadas para buscar directamente el punto de inicio, manteniendo performance de tiempo constante independientemente del tamano del dataset. Esta recipe implementa paginacion por cursor con PostgreSQL, incluyendo encoding de cursor, navegacion bidireccional y casos edge con claves de sort duplicadas.

## Cuando Usar Esto

- Feeds de API con millones de items donde navegacion a paginas profundas es comun
- Datos en tiempo real donde filas se insertan continuamente, haciendo conteos de offset inestables
- Necesitas resultados de pagina consistentes incluso cuando los datos subyacentes cambian entre requests

## Solucion

### 1. Schema de Base de Datos e Indice

```sql
-- migrations/001_create_posts.sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0
);

-- Indice compuesto para paginacion por cursor por created_at
CREATE INDEX idx_posts_created_at_id ON posts (created_at DESC, id DESC);

-- Indice para paginacion por score
CREATE INDEX idx_posts_score_id ON posts (score DESC, id DESC);
```

### 2. Encoding y Decoding de Cursor

```typescript
// pagination/Cursor.ts
import { Buffer } from 'buffer';

interface CursorData {
  createdAt: string;
  id: string;
}

function encodeCursor(data: CursorData): string {
  const json = JSON.stringify(data);
  return Buffer.from(json).toString('base64url');
}

function decodeCursor(cursor: string): CursorData {
  const json = Buffer.from(cursor, 'base64url').toString('utf8');
  return JSON.parse(json);
}
```

### 3. Query con Keyset Pagination

```typescript
// pagination/PostRepository.ts
import { Pool } from 'pg';

interface PageResult<T> {
  data: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}

class PostRepository {
  constructor(private pool: Pool) {}

  async findPage(
    limit: number = 20,
    afterCursor?: string,
    beforeCursor?: string
  ): Promise<PageResult<Post>> {
    const client = await this.pool.connect();

    try {
      let query: string;
      let params: unknown[];

      if (afterCursor) {
        const { createdAt, id } = decodeCursor(afterCursor);
        query = `
          SELECT * FROM posts
          WHERE (created_at, id) < ($1, $2)
          ORDER BY created_at DESC, id DESC
          LIMIT $3
        `;
        params = [createdAt, id, limit + 1];
      } else if (beforeCursor) {
        const { createdAt, id } = decodeCursor(beforeCursor);
        query = `
          SELECT * FROM (
            SELECT * FROM posts
            WHERE (created_at, id) > ($1, $2)
            ORDER BY created_at ASC, id ASC
            LIMIT $3
          ) sub
          ORDER BY created_at DESC, id DESC
        `;
        params = [createdAt, id, limit + 1];
      } else {
        query = `
          SELECT * FROM posts
          ORDER BY created_at DESC, id DESC
          LIMIT $1
        `;
        params = [limit + 1];
      }

      const result = await client.query(query, params);
      const rows = result.rows;
      const hasMore = rows.length > limit;
      const data = hasMore ? rows.slice(0, limit) : rows;

      const nextCursor = hasMore && data.length > 0
        ? encodeCursor({ createdAt: data[data.length - 1].created_at, id: data[data.length - 1].id })
        : null;

      const prevCursor = data.length > 0
        ? encodeCursor({ createdAt: data[0].created_at, id: data[0].id })
        : null;

      return {
        data,
        nextCursor,
        prevCursor: afterCursor || (!beforeCursor && data.length > 0) ? prevCursor : null,
        hasMore,
      };
    } finally {
      client.release();
    }
  }
}
```

### 4. Endpoint de API [Express](/recipes/api/express-middleware-patterns)

```typescript
// routes/posts.ts
app.get('/api/posts', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const after = req.query.after as string | undefined;
  const before = req.query.before as string | undefined;

  const page = await postRepo.findPage(limit, after, before);

  res.json({
    data: page.data,
    pagination: {
      nextCursor: page.nextCursor,
      prevCursor: page.prevCursor,
      hasMore: page.hasMore,
    },
  });
});
```

### 5. Navegacion del Cliente

```typescript
// client/PaginatedFeed.ts
class PaginatedFeed {
  private nextCursor: string | null = null;
  private prevCursor: string | null = null;

  async loadNext(): Promise<Post[]> {
    const params = new URLSearchParams();
    params.set('limit', '20');
    if (this.nextCursor) params.set('after', this.nextCursor);

    const res = await fetch(`/api/posts?${params}`);
    const page = await res.json();

    this.nextCursor = page.pagination.nextCursor;
    this.prevCursor = page.pagination.prevCursor;
    return page.data;
  }

  async loadPrevious(): Promise<Post[]> {
    if (!this.prevCursor) return [];
    const params = new URLSearchParams();
    params.set('limit', '20');
    params.set('before', this.prevCursor);

    const res = await fetch(`/api/posts?${params}`);
    const page = await res.json();

    this.nextCursor = page.pagination.nextCursor;
    this.prevCursor = page.pagination.prevCursor;
    return page.data;
  }
}
```

## Como Funciona

- **Keyset pagination** usa claves compuestas indexadas en lugar de OFFSET, habilitando seeks O(log n)
- **Encoding de cursor** esconde detalles de implementacion y previene manipulacion de parametros de query por clientes
- **Cursores bidireccionales** soportan navegacion forward y backward a traves del mismo dataset
- **Over-fetching** de 1 fila determina si existen mas paginas sin una query COUNT separada

## Consideraciones de Produccion

- Crea siempre indices compuestos que coincidan con el orden exacto de sort usado en queries de paginacion. Consulta [Guía de Optimización de SQL](/guides/databases/sql-performance-tuning-guide) para estrategias de indexación.
- Usa `timestamptz` (no `timestamp`) para evitar ambiguedad de timezone en cursores
- Valida estructura de cursor para prevenir injection via payloads base64 malformados. Consulta [Validación de Input](/recipes/api/input-validation) para patrones de validación.

## Errores Comunes

- Paginar por una columna no unica sin un tiebreaker (ej. `created_at` solo), causando filas saltadas o duplicadas
- Usar valores LIMIT grandes, que aun requieren escaneo significativo de indice
- No manejar el caso donde la fila del cursor es borrada, rompiendo navegacion forward

## FAQ

**P: Deberia usar paginacion por offset alguna vez?**
R: Solo para datasets pequenos (< 10.000 filas) o interfaces de admin donde saltar a paginas arbitrarias es requerido.

**P: Como manejo ordenamiento por multiples columnas?**
R: Incluye todas las columnas de sort en el indice compuesto y codifica todos los valores en el cursor.
