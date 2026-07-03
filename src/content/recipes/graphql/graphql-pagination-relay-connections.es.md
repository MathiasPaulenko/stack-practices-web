---
contentType: recipes
slug: graphql-pagination-relay-connections
title: "Paginacion por cursores con GraphQL Relay Connections"
description: "Implementa paginacion estilo Relay con cursores en GraphQL usando edges, nodes y pageInfo para recorrido eficiente hacia adelante y atras"
metaDescription: "Implementa paginacion por cursores en GraphQL con la especificacion Relay Connections. Edges, nodes, cursores y pageInfo para recorrido eficiente."
difficulty: intermediate
topics:
  - graphql
  - api
tags:
  - graphql
  - pagination
  - relay
  - cursor
  - api
relatedResources:
  - /recipes/api/graphql-apollo-server
  - /recipes/data/cursor-pagination-postgresql
  - /patterns/graphql/graphql-batched-resolver-pattern
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementa paginacion por cursores en GraphQL con la especificacion Relay Connections. Edges, nodes, cursores y pageInfo para recorrido eficiente."
  keywords:
    - graphql pagination
    - relay connections
    - cursor pagination
    - graphql edges
    - graphql pageinfo
---

# Paginacion por cursores con GraphQL Relay Connections

La especificacion Relay Connection es el estandar de facto para paginar resultados en GraphQL. Modela las colecciones como conexiones que contienen edges, donde cada edge envuelve un node y un cursor. Esta estructura soporta paginacion estable ante inserciones y borrados, a diferencia de los enfoques basados en offset que saltan o duplican filas cuando los datos cambian entre peticiones.

## Cuando Usar Esto

- Colecciones que crecen con el tiempo y necesitan paginacion estable
- Clientes que soportan scroll infinito o patrones de "cargar mas"
- APIs consumidas por Relay, Apollo o cualquier cliente que espere navegacion por cursores

## Requisitos Previos

- Un servidor GraphQL (Apollo Server, GraphQL Yoga o similar)
- Una fuente de datos con una columna ordenable y unica (ID, timestamp o cursor)

## Solucion

### 1. Definir los tipos de conexion

```typescript
// schema.ts
import gql from 'graphql-tag';

export const typeDefs = gql`
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type PostEdge {
    cursor: String!
    node: Post!
  }

  type PostConnection {
    edges: [PostEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    createdAt: String!
  }

  input PaginationInput {
    first: Int
    after: String
    last: Int
    before: String
  }

  type Query {
    posts(pagination: PaginationInput): PostConnection!
  }
`;
```

### 2. Implementar la codificacion del cursor

```typescript
// cursor.ts
export function encodeCursor(value: string | number): string {
  return Buffer.from(String(value)).toString('base64');
}

export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64').toString('utf8');
}
```

### 3. Construir el resolver

```typescript
// resolvers.ts
import { encodeCursor, decodeCursor } from './cursor';

interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export const postResolvers = {
  Query: {
    posts: async (
      _: unknown,
      { pagination }: { pagination: { first?: number; after?: string; last?: number; before?: string } },
      context: { db: { posts: { findMany: (opts: any) => Promise<Post[]>; count: () => Promise<number> } } }
    ) => {
      const { first, after, last, before } = pagination;
      const limit = first ?? last ?? 10;
      const maxLimit = 50;

      const take = Math.min(limit, maxLimit);

      let cursor: string | undefined;
      let skip = 0;
      let order: 'asc' | 'desc' = 'desc';

      if (after) {
        cursor = decodeCursor(after);
        skip = 1;
      } else if (before) {
        cursor = decodeCursor(before);
        skip = 1;
        order = 'asc';
      }

      const posts = await context.db.posts.findMany({
        take: take + 1,
        skip,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { id: order },
      });

      const hasMore = posts.length > take;
      const trimmed = hasMore ? posts.slice(0, take) : posts;
      const reversed = last ? trimmed.reverse() : trimmed;

      const edges = reversed.map((post) => ({
        cursor: encodeCursor(post.id),
        node: post,
      }));

      const totalCount = await context.db.posts.count();

      return {
        edges,
        totalCount,
        pageInfo: {
          hasNextPage: Boolean(first && hasMore),
          hasPreviousPage: Boolean(after),
          startCursor: edges[0]?.cursor ?? null,
          endCursor: edges[edges.length - 1]?.cursor ?? null,
        },
      };
    },
  },
};
```

### 4. Consultar la conexion

```graphql
query GetPosts($first: Int, $after: String) {
  posts(pagination: { first: $first, after: $after }) {
    edges {
      cursor
      node {
        id
        title
        createdAt
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

Pasa el `endCursor` de la respuesta anterior como `after` en la siguiente peticion para cargar la proxima pagina.

## Como Funciona

1. **Cursores** son tokens opacos que codifican la ultima posicion vista (tipicamente el ID de la fila). Los clientes los tratan como cajas negras.
2. **Edges** emparejan cada node con su cursor, permitiendo navegar desde cualquier punto sin rastrear offsets.
3. **`first` + `after`** navega hacia adelante; **`last` + `before`** hacia atras. El resolver invierte los resultados al paginar hacia atras.
4. **`take + 1`** es un truco para verificar si hay mas paginas sin una consulta de conteo separada — si obtienes mas filas de las solicitadas, `hasNextPage` es true.

## Variantes

### Fallback con offset

Para fuentes de datos sin soporte de cursores (agregaciones de Elasticsearch, APIs legacy), usa offset pero mantén la forma de conexion para compatibilidad del cliente:

```typescript
const offset = after ? parseInt(decodeCursor(after), 10) + 1 : 0;
const posts = await db.posts.findMany({ skip: offset, take });
```

### Paginacion keyset con cursores compuestos

Para columnas ordenadas no unicas (como `createdAt`), usa un cursor compuesto `(createdAt, id)` para evitar saltar filas con timestamps identicos:

```typescript
export function encodeCompositeCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`).toString('base64');
}
```

## Mejores Practicas

- **Limita `first` y `last`** a un maximo razonable (50-100) para evitar consultas costosas
- **Ordena por una columna estable** — ordenar por campos no unicos sin desempate causa filas saltadas
- **Mantén los cursores opacos** — no expongas estructuras internas que los clientes podrian intentar parsear
- **Incluye `totalCount`** solo cuando el cliente lo necesite; puede ser costoso en tablas grandes

## Errores Comunes

- **Usar offset como cursor** — esto derrocha el proposito de la paginacion por cursores y reintroduce problemas de salto/duplicado
- **Olvidar `skip: 1`** despues de un cursor — sin esto, el primer item de cada pagina repite el ultimo de la pagina anterior
- **No manejar resultados vacios** — retorna un array `edges` vacio con `hasNextPage: false` en lugar de lanzar error

## FAQ

**Q: Debo usar cursor o offset para GraphQL?**
A: La paginacion por cursores es el estandar para GraphQL porque maneja inserciones y borrados correctamente. Usa offset solo cuando los cursores no sean soportados por la fuente de datos.

**Q: Como implemento paginacion bidireccional?**
A: Soporta tanto `first/after` como `last/before` en tu resolver. El flag `hasPreviousPage` indica a los clientes si existe una pagina anterior.

**Q: Puedo usar Relay connections sin el cliente Relay?**
A: Si. La especificacion de conexiones funciona con cualquier cliente GraphQL. Apollo Client, urql y graphql-request la soportan.

**Q: Que debe codificar el cursor?**
A: Tipicamente la clave primaria o un compuesto de la columna de orden mas la clave primaria. Evita codificar offsets.
