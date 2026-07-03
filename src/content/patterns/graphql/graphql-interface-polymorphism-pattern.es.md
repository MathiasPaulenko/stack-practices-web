---
contentType: patterns
slug: graphql-interface-polymorphism-pattern
title: "Patron de Polimorfismo con Interfaces en GraphQL"
description: "Modela tipos polimorficos con interfaces GraphQL para compartir contratos de campos entre diferentes tipos de objeto manteniendo resolvers especificos."
metaDescription: "Modela tipos polimorficos en GraphQL con interfaces. Comparte contratos de campos entre tipos, resuelve campos especificos y consulta unions."
difficulty: advanced
category: structural
topics:
  - graphql
  - architecture
  - api
tags:
  - interface-polymorphism
  - pattern
  - graphql-interfaces
  - type-system
  - schema-design
relatedResources:
  - /patterns/graphql-schema-stitching-pattern
  - /patterns/graphql-error-extension-pattern
  - /guides/complete-guide-graphql-federation
  - /guides/complete-guide-graphql-federation
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Modela tipos polimorficos en GraphQL con interfaces. Comparte contratos de campos entre tipos, resuelve campos especificos y consulta unions."
  keywords:
    - interface-polymorphism
    - pattern
    - graphql-interfaces
    - type-system
    - schema-design
---

## Descripcion general

Las interfaces GraphQL definen un contrato que multiples tipos de objeto pueden implementar. Una interfaz declara un conjunto de campos que cada tipo implementador debe incluir, mas cualquier numero de campos especificos del tipo. Esto permite a los clientes consultar campos compartidos sin conocer el tipo concreto, y usar inline fragments para acceder a campos especificos del tipo cuando sea necesario.

Las interfaces son el equivalente en GraphQL de tipos abstractos o interfaces en lenguajes orientados a objetos. Modelan relaciones polimorficas — un resultado de busqueda que podria ser User, Post, o Comment — manteniendo el esquema fuertemente tipado.

## Cuando Usar

- Un campo puede retornar multiples tipos que comparten campos comunes (resultados de busqueda, notificaciones, items de feed)
- Necesitas un contrato comun entre tipos pero quieres campos especificos del tipo tambien
- Modelar jerarquias de herencia (Animal → Dog, Cat, Bird)
- Union types donde todos los miembros comparten un conjunto base de campos

## Cuando No Usar

- Los tipos no comparten campos comunes (usar `union` en su lugar)
- Solo un tipo concreto implementa la interfaz (no hay polimorfismo necesario)
- La interfaz tendria cero campos (contrato sin significado)

## Solucion

### 1. Definir la Interfaz

```graphql
interface Node {
  id: ID!
  createdAt: String!
  updatedAt: String!
}

interface Searchable {
  id: ID!
  title: String!
  snippet: String!
  searchScore: Float!
}
```

### 2. Implementar la Interfaz en Tipos de Objeto

```graphql
type Post implements Node & Searchable {
  id: ID!
  createdAt: String!
  updatedAt: String!
  title: String!
  snippet: String!
  searchScore: Float!

  # Campos especificos de Post
  body: String!
  tags: [String!]!
  author: User!
}

type Comment implements Node {
  id: ID!
  createdAt: String!
  updatedAt: String!

  # Campos especificos de Comment
  body: String!
  author: User!
  post: Post!
}

type User implements Node {
  id: ID!
  createdAt: String!
  updatedAt: String!

  # Campos especificos de User
  name: String!
  email: String!
  posts: [Post!]!
}
```

### 3. Resolvers para Campos de Interfaz

GraphQL necesita saber que tipo concreto es un objeto de interfaz. El resolver `__resolveType` mapea un objeto a su nombre de tipo.

```typescript
const resolvers = {
  Node: {
    __resolveType: (obj) => {
      if (obj.body && obj.tags) return 'Post';
      if (obj.name && obj.email) return 'User';
      if (obj.body && obj.postId) return 'Comment';
      return null;
    },
  },
  Searchable: {
    __resolveType: (obj) => {
      if (obj.body && obj.tags) return 'Post';
      if (obj.title && obj.snippet) return 'Article';
      return null;
    },
  },
  Post: {
    author: (post, _args, { loaders }) => loaders.userLoader.load(post.authorId),
    tags: (post) => post.tags ?? [],
  },
  Comment: {
    author: (comment, _args, { loaders }) => loaders.userLoader.load(comment.authorId),
    post: (comment, _args, { db }) => db.post.findById(comment.postId),
  },
  User: {
    posts: (user, _args, { db }) => db.post.findMany({ where: { authorId: user.id } }),
  },
};
```

### 4. Consultar Campos de Interfaz

Los clientes consultan campos compartidos directamente y campos especificos del tipo con inline fragments:

```graphql
query {
  search(term: "graphql") {
    # Campos compartidos de la interfaz Searchable
    id
    title
    snippet
    searchScore

    # Campos especificos del tipo via inline fragments
    ... on Post {
      body
      tags
      author {
        name
      }
    }
    ... on Article {
      url
      wordCount
    }
  }
}
```

### 5. Campos de Interfaz en Listas

```graphql
type Query {
  feed: [Node!]!  # Retorna una mezcla de Post, Comment, y User
  search(term: String!): [Searchable!]!
  node(id: ID!): Node  # Lookup global estilo Relay
}
```

```typescript
const resolvers = {
  Query: {
    feed: (_parent, _args, { db }) => db.feed.getRecent(),
    search: (_parent, { term }, { db }) => db.search.search(term),
    node: (_parent, { id }, { db }) => db.node.findById(id),
  },
};
```

### 6. Resolucion de ID Global Estilo Relay

```typescript
function globalIdToType(id: string): { type: string; id: string } {
  const [type, localId] = Buffer.from(id, 'base64').toString().split(':');
  return { type, id: localId };
}

const resolvers = {
  Query: {
    node: async (_parent, { id }, { db }) => {
      const { type, id: localId } = globalIdToType(id);
      switch (type) {
        case 'Post': return db.post.findById(localId);
        case 'User': return db.user.findById(localId);
        case 'Comment': return db.comment.findById(localId);
        default: throw new Error(`Unknown type: ${type}`);
      }
    },
  },
  Node: {
    __resolveType: (obj) => {
      if (obj.tags !== undefined) return 'Post';
      if (obj.email !== undefined) return 'User';
      if (obj.postId !== undefined) return 'Comment';
      return null;
    },
  },
};
```

## Explicacion

- **Contrato de interfaz**: Cada tipo implementador debe incluir todos los campos declarados en la interfaz. La validacion del esquema falla de lo contrario
- **`__resolveType`**: GraphQL llama este resolver para determinar el tipo concreto de un objeto de interfaz. Retorna el nombre del tipo como string
- **Inline fragments**: Los clientes usan `... on TypeName { }` para acceder a campos especificos de un tipo concreto
- **Resolvers compartidos**: Los campos definidos en la interfaz pueden tener resolvers por defecto que aplican a todos los tipos implementadores, o cada tipo puede sobrescribirlos
- **Interfaces vs unions**: Las interfaces requieren campos compartidos. Los unions (`union Result = Post | User | Comment`) no requieren ninguno. Usar interfaces cuando los miembros comparten campos

## Variantes

### Implementacion de Multiples Interfaces

Un tipo puede implementar multiples interfaces:

```graphql
interface Timestamped {
  createdAt: String!
  updatedAt: String!
}

interface Ownable {
  owner: User!
}

type Document implements Node & Timestamped & Ownable {
  id: ID!
  createdAt: String!
  updatedAt: String!
  owner: User!
  title: String!
  content: String!
}
```

### Interfaz con Resolver de Campo por Defecto

```typescript
const resolvers = {
  Timestamped: {
    // Resolver por defecto para todos los tipos implementadores
    createdAt: (obj) => obj.createdAt,
    updatedAt: (obj) => obj.updatedAt,
    ageInDays: (obj) => {
      const diff = Date.now() - new Date(obj.createdAt).getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    },
  },
  // Post hereda createdAt, updatedAt, ageInDays de Timestamped
  Post: {
    // Sobrescribir solo si es necesario
  },
};
```

### Interfaz que Implementa Otra Interfaz

```graphql
interface Entity {
  id: ID!
}

interface TimestampedEntity implements Entity {
  id: ID!
  createdAt: String!
}

type Article implements TimestampedEntity & Entity {
  id: ID!
  createdAt: String!
  title: String!
}
```

### Union con Campos de Interfaz Compartida

```graphql
interface SearchResult {
  id: ID!
  title: String!
}

type PostResult implements SearchResult {
  id: ID!
  title: String!
  body: String!
}

type VideoResult implements SearchResult {
  id: ID!
  title: String!
  duration: Int!
}

union SearchItem = PostResult | VideoResult

type Query {
  search(term: String!): [SearchItem!]!
}
```

Los clientes consultan con inline fragments en el union, pero ambos miembros comparten los campos de la interfaz `SearchResult`.

## Mejores Practicas

- Mantener las interfaces enfocadas en una sola preocupacion (separar `Node`, `Timestamped`, `Ownable` en lugar de una interfaz grande)
- Usar `__resolveType` con un campo discriminador confiable — evitar adivinar desde la forma de los datos
- Documentar que tipos implementan cada interfaz en las descripciones del esquema
- Usar interfaces para identificacion global de nodos estilo Relay (`interface Node { id: ID! }`)
- Preferir interfaces sobre unions cuando los miembros comparten campos — los clientes obtienen mejor DX
- Mantener `__resolveType` rapido — se ejecuta para cada objeto de interfaz en la respuesta

## Errores Comunes

- **Falta `__resolveType`**: GraphQL no puede determinar el tipo concreto y retorna un error
- **Retornar nombre de tipo incorrecto**: `__resolveType` debe retornar un string que coincida con un nombre de tipo en el esquema, no el nombre de clase del objeto
- **Implementar interfaz sin todos los campos**: La validacion del esquema falla — cada tipo implementador debe incluir todos los campos de la interfaz
- **Usar unions cuando las interfaces encajan mejor**: Si todos los miembros del union comparten campos, una interfaz da a los clientes mejor experiencia de query
- **`__resolveType` lento**: Se ejecuta por objeto. Si hace lookups de base de datos, se vuelve un cuello de botella. Usar un campo discriminador en el objeto en su lugar

## FAQ

**Cual es la diferencia entre interfaz y union en GraphQL?**

Una interfaz define campos compartidos que todos los tipos implementadores deben incluir. Un union es un conjunto de tipos sin campos compartidos requeridos. Usar interfaces cuando los miembros comparten campos, unions cuando no.

**Puede un tipo implementar multiples interfaces?**

Si. Usar `&` en SDL: `type Post implements Node & Timestamped & Ownable`.

**Como funciona `__resolveType`?**

GraphQL llama `__resolveType` con el objeto resuelto. Retorna el nombre del tipo concreto como string (ej., `'Post'`). GraphQL luego usa ese tipo para validar que campos estan disponibles.

**Deberia usar interfaces para identificacion global de Relay?**

Si. La interfaz `Node` (`id: ID!`) es el estandar para identificacion global de objetos estilo Relay. Cada tipo que puede buscarse por un ID global la implementa.

**Pueden las interfaces heredar de otras interfaces?**

Si, desde GraphQL 2.0. Una interfaz puede implementar otra interfaz usando `implements`, requiriendo que los tipos implementadores incluyan campos de ambas.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
