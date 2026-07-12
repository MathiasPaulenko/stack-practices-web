---




contentType: patterns
slug: graphql-connection-pagination-pattern
title: "Patron GraphQL Connection Pagination"
description: "Implementa paginacion basada en cursores estilo Relay con edges, nodes y pageInfo para queries de listas estables en GraphQL."
metaDescription: "Patron GraphQL connection pagination: paginacion con cursores estilo Relay, edges, nodes y pageInfo. Paginacion estable para listas grandes en Apollo Server."
difficulty: intermediate
topics:
  - graphql
  - design
tags:
  - graphql
  - pagination
  - connection
  - patron
  - relay
  - cursor
  - edges
  - typescript
  - apollo-server
relatedResources:
  - /patterns/graphql-batched-resolver-pattern
  - /patterns/graphql-dataloader-pattern
  - /recipes/graphql-pagination-relay-connections
  - /patterns/graphql-federated-entity-pattern
  - /patterns/graphql-mutation-validation-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Patron GraphQL connection pagination: paginacion con cursores estilo Relay, edges, nodes y pageInfo. Paginacion estable para listas grandes en Apollo Server."
  keywords:
    - graphql pagination
    - relay connections
    - cursor pagination graphql
    - graphql edges nodes
    - apollo server pagination
    - graphql connection pattern




---

# Patron GraphQL Connection Pagination

## Descripcion general

El patron Connection es el estandar de GraphQL para paginar campos de lista. En lugar de devolver un array plano, una connection envuelve los resultados en `edges` (cada uno conteniendo un `node` y un `cursor`), un objeto `pageInfo` (con `hasNextPage`, `hasPreviousPage`, `startCursor`, `endCursor`) y un `totalCount` opcional.

La paginacion basada en cursores es mas estable que la basada en offsets. Cuando se insertan o eliminan items entre peticiones, los cursores siguen apuntando a la posicion correcta. Los offsets se desplazan, causando items saltados o duplicados.

## Cuando usarlo


- For alternatives, see [GraphQL Mutation Validation Pattern](/es/patterns/graphql-mutation-validation-pattern/).

- Campos de lista que pueden devolver mas items de los que caben en una respuesta
- Necesitas paginacion estable que sobrevive a inserciones y eliminaciones entre paginas
- Los clientes necesitan obtener la siguiente o anterior pagina desde cualquier posicion
- Quieres cumplir con la especificacion GraphQL Relay Connection
- Necesitas paginacion bidireccional (adelante y atras)

## Solucion

### Definicion del esquema

```typescript
const typeDefs = `
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type UserEdge {
    node: User!
    cursor: String!
  }

  type UserConnection {
    edges: [UserEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type User {
    id: ID!
    name: String!
    email: String!
  }

  type Query {
    users(
      first: Int
      after: String
      last: Int
      before: String
    ): UserConnection!
  }
`;
```

### Implementacion del resolver

```typescript
import { base64, unbase64 } from './encoding';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function encodeCursor(offset: number): string {
  return base64(`offset:${offset}`);
}

function decodeCursor(cursor: string): number {
  const decoded = unbase64(cursor);
  const offset = parseInt(decoded.split(':')[1], 10);
  return isNaN(offset) ? 0 : offset;
}

const resolvers = {
  Query: {
    users: async (_, { first, after, last, before }, context) => {
      const limit = Math.min(first || last || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
      const direction = first !== undefined ? 'forward' : 'backward';

      let offset = 0;
      if (after) offset = decodeCursor(after) + 1;
      if (before) offset = Math.max(0, decodeCursor(before) - limit);

      const totalCountResult = await context.db.query(
        'SELECT COUNT(*) as count FROM users'
      );
      const totalCount = totalCountResult[0].count;

      const rows = await context.db.query(
        'SELECT id, name, email FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit + 1, offset]
      );

      const hasMore = rows.length > limit;
      const nodes = hasMore ? rows.slice(0, limit) : rows;

      const edges = nodes.map((node, index) => ({
        node,
        cursor: encodeCursor(offset + index),
      }));

      return {
        edges,
        totalCount,
        pageInfo: {
          hasNextPage: direction === 'forward' ? hasMore : offset + limit < totalCount,
          hasPreviousPage: offset > 0,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
      };
    },
  },
};
```

### Query de cliente

```graphql
query GetUsers($first: Int, $after: String) {
  users(first: $first, after: $after) {
    edges {
      cursor
      node {
        id
        name
        email
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

### Cursor con sort key (en lugar de offset)

Para datasets grandes, usa una sort key en lugar de un offset para evitar escanear rows saltadas:

```typescript
function encodeCursor(sortKey: string, id: string): string {
  return base64(`${sortKey}:${id}`);
}

function decodeCursor(cursor: string): { sortKey: string; id: string } {
  const decoded = unbase64(cursor);
  const [sortKey, id] = decoded.split(':');
  return { sortKey, id };
}

const resolvers = {
  Query: {
    users: async (_, { first, after }, context) => {
      const limit = Math.min(first || 20, 100);
      let query = 'SELECT id, name, email, created_at FROM users';
      const params = [];

      if (after) {
        const { sortKey, id } = decodeCursor(after);
        query += ' WHERE (created_at, id) < ($1, $2)';
        params.push(sortKey, id);
      }

      query += ' ORDER BY created_at DESC, id DESC LIMIT $' + (params.length + 1);
      params.push(limit + 1);

      const rows = await context.db.query(query, params);
      const hasMore = rows.length > limit;
      const nodes = hasMore ? rows.slice(0, limit) : rows;

      const edges = nodes.map((node) => ({
        node,
        cursor: encodeCursor(node.created_at, node.id),
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage: hasMore,
          hasPreviousPage: false,
          startCursor: edges[0]?.cursor || null,
          endCursor: edges[edges.length - 1]?.cursor || null,
        },
      };
    },
  },
};
```

## Explicacion

El patron Connection envuelve cada campo paginado en una estructura estandar:

- **edges** — un array donde cada item contiene un `node` (los datos reales) y un `cursor` (un string opaco que apunta a la posicion de ese item)
- **pageInfo** — metadata sobre la pagina actual: si existen mas paginas en cada direccion y los cursores del primer y ultimo item
- **totalCount** — opcional pero util para UIs que muestran el total de resultados

Los cursores son opacos para el cliente. El servidor codifica lo que necesite para encontrar la siguiente pagina: un offset, una sort key, un timestamp o una primary key. El cliente pasa el cursor de vuelta como `after` o `before` para navegar.

Usar un cursor de sort key en lugar de un cursor de offset es mas eficiente para datasets grandes. La base de datos puede usar un indice para saltar directamente a la posicion del cursor en lugar de escanear y saltar `OFFSET` rows.

## Variantes

| Enfoque | Tipo de cursor | Ideal para |
|---------|---------------|------------|
| Cursor de offset | `base64("offset:50")` | Datasets pequenos, implementacion simple |
| Cursor de sort key | `base64("2026-07-03:uuid")` | Datasets grandes, orden estable |
| Cursor keyset | Primary key + columna sort | Ordenado por columnas indexadas |
| Cursor temporal | ISO timestamp | Feeds cronologicos |
| Cursor hash | Hash del ultimo item | Sistemas distribuidos donde offset es desconocido |

## Buenas practicas

- **Haz los cursores opacos** — codificalos en base64 para que los clientes no intenten parsearlos o construirlos manualmente
- **Siempre pide LIMIT + 1** — obtiene un row extra para determinar `hasNextPage` sin una query de count separada
- **Usa columnas indexadas para cursores de sort key** — `(created_at, id)` con un indice compuesto evita full scans
- **Limita el tamano de pagina** — impone un maximo (ej. 100) para evitar que clientes pidan 10,000 items
- **Devuelve totalCount solo cuando sea necesario** — contar todos los rows es costoso en tablas grandes. Hazlo opcional

## Errores comunes

- **Usar cursores de offset en tablas grandes** — `OFFSET 100000` escanea 100,000 rows. Usa cursores de sort key con clausulas WHERE.
- **No codificar los cursores** — devolver offsets o timestamps en crudo permite a los clientes manipularlos. Siempre codifica en base64.
- **Orden de sort inconsistente** — si el orden cambia entre peticiones, los cursores apuntan a posiciones incorrectas. Incluye la columna de sort en el cursor.
- **Olvidar `hasPreviousPage`** — la paginacion hacia atras requiere trackear si existen items antes de la pagina actual. Calculalo desde el offset o una query reversa.
- **No manejar paginas vacias** — si una query devuelve cero edges, `startCursor` y `endCursor` deben ser `null`, no undefined. GraphQL requiere nulls explicitos.

## Preguntas frecuentes

### Cual es la diferencia entre paginacion offset y cursor?

La paginacion offset usa `LIMIT 20 OFFSET 40` para saltar rows. La paginacion cursor usa una clausula WHERE para saltar a una posicion especifica. Offset es mas simple pero lento en datasets grandes e inestable cuando se insertan o eliminan items entre peticiones. Cursor es estable y eficiente.

### Necesito seguir la especificacion Relay exactamente?

La especificacion Relay Connection es una convencion, no un requisito. Puedes anadir campos extra a `pageInfo` o `edges` segun sea necesario. Las estructuras clave (`edges`, `cursor`, `pageInfo.hasNextPage`) son lo que la mayoria de clientes esperan.

### Como manejo la paginacion con filtrado?

Incluye los criterios de filtro en el cursor o reaplica la misma clausula WHERE en cada peticion. El cursor solo marca la posicion; el filtro reduce el dataset. La combinacion de filtro + posicion del cursor te da la pagina correcta.

### Puedo usar connection pagination con DataLoader?

Si. Crea un DataLoader que batchee queries basadas en cursor. La funcion batch recibe multiples cursores y emite queries separadas para cada uno, o las combina si la fuente de datos lo soporta.


## Temas Avanzados

### Escenario: Connection Pagination para Feed de Productos

```typescript
// GraphQL Relay Connection: cursor-based pagination
type ProductConnection {
  edges: ProductEdge[]
  pageInfo: PageInfo
  totalCount: Int
}

type ProductEdge {
  node: Product
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

// Resolver: cursor-based pagination
const resolvers = {
  Query: {
    products: async (_, { first, after, last, before }, ctx) => {
      // Decode cursor: base64(JSON({ id, sortKey }))
      const afterCursor = after ? JSON.parse(Buffer.from(after, "base64").toString()) : null;
      const limit = first || last || 20;
      const order = first ? "ASC" : "DESC";

      let query = "SELECT * FROM products";
      const params: unknown[] = [];
      if (afterCursor) {
        query += ` WHERE created_at > $1 ORDER BY created_at ${order} LIMIT $2`;
        params.push(afterCursor.created_at, limit + 1);
      } else {
        query += ` ORDER BY created_at ${order} LIMIT $1`;
        params.push(limit + 1);
      }

      const res = await ctx.db.query(query, params);
      const rows = res.rows;
      const hasNextPage = rows.length > limit;
      const edges = rows.slice(0, limit).map(product => ({
        node: product,
        cursor: Buffer.from(JSON.stringify({ id: product.id, created_at: product.created_at })).toString("base64"),
      }));

      return {
        edges,
        totalCount: await ctx.db.query("SELECT COUNT(*) FROM products").then(r => r.rows[0].count),
        pageInfo: {
          hasNextPage,
          hasPreviousPage: !!afterCursor,
          startCursor: edges[0]?.cursor || null,
          endCursor: edges[edges.length - 1]?.cursor || null,
        },
      };
    },
  },
};

// Query: primera pagina
// { products(first: 10) { edges { node { id name } cursor } pageInfo { hasNextPage endCursor } } }

// Query: siguiente pagina
// { products(first: 10, after: "eyJpZCI6IjEyMyJ9") { ... } }
```

Lecciones:
  - Cursor-based: el cursor codifica la posicion (id + sort key)
  - Mas estable que offset: si se insertan items, el cursor no se desplaza
  - first/after: paginar hacia adelante. last/before: hacia atras
  - Pedir limit+1 para saber si hay hasNextPage sin query extra
  - El cursor es opaco: base64(JSON) para que el cliente no dependa del formato
  - Relay Connection es el estandar de la industria para GraphQL
```

### Cursor-based vs Offset-based: cual uso?

Cursor-based es estable: si se insertan items entre paginas, el cursor no se desplaza. Offset-based es simple: LIMIT/OFFSET pero si se insertan items, la pagina 2 puede repetir o saltar items. Usa cursor para feeds, timelines, listas dinamicas. Usa offset para reportes, tablas estaticas, admin panels. Cursor no soporta saltar a pagina N: solo next/prev. Offset si: page=3. Para GraphQL, cursor es el estandar (Relay).
