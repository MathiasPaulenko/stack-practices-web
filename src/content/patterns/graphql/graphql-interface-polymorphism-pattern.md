---
contentType: patterns
slug: graphql-interface-polymorphism-pattern
title: "GraphQL Interface Polymorphism Pattern"
description: "Model polymorphic types with GraphQL interfaces to share field contracts across different object types while keeping resolvers type-specific."
metaDescription: "Model polymorphic GraphQL types with interfaces. Share field contracts across object types, resolve type-specific fields, and query unions."
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
  metaDescription: "Model polymorphic GraphQL types with interfaces. Share field contracts across object types, resolve type-specific fields, and query unions."
  keywords:
    - interface-polymorphism
    - pattern
    - graphql-interfaces
    - type-system
    - schema-design
---

## Overview

GraphQL interfaces define a contract that multiple object types can implement. An interface declares a set of fields that every implementing type must include, plus any number of type-specific fields. This lets clients query shared fields without knowing the concrete type, and use inline fragments to access type-specific fields when needed.

Interfaces are GraphQL's equivalent of abstract types or interfaces in object-oriented languages. They model polymorphic relationships — a search result that could be a User, Post, or Comment — while keeping the schema strongly typed.

## When to Use

- A field can return multiple types that share common fields (search results, notifications, feed items)
- You need a common contract across types but want type-specific fields too
- Modeling inheritance hierarchies (Animal → Dog, Cat, Bird)
- Union types where all members share a base set of fields

## When Not to Use

- Types share no common fields (use `union` instead)
- Only one concrete type implements the interface (no polymorphism needed)
- The interface would have zero fields (meaningless contract)

## Solution

### 1. Define the Interface

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

### 2. Implement the Interface in Object Types

```graphql
type Post implements Node & Searchable {
  id: ID!
  createdAt: String!
  updatedAt: String!
  title: String!
  snippet: String!
  searchScore: Float!

  # Post-specific fields
  body: String!
  tags: [String!]!
  author: User!
}

type Comment implements Node {
  id: ID!
  createdAt: String!
  updatedAt: String!

  # Comment-specific fields
  body: String!
  author: User!
  post: Post!
}

type User implements Node {
  id: ID!
  createdAt: String!
  updatedAt: String!

  # User-specific fields
  name: String!
  email: String!
  posts: [Post!]!
}
```

### 3. Resolvers for Interface Fields

GraphQL needs to know which concrete type an interface object is. The `__resolveType` resolver maps an object to its type name.

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

### 4. Querying Interface Fields

Clients query shared fields directly and type-specific fields with inline fragments:

```graphql
query {
  search(term: "graphql") {
    # Shared fields from Searchable interface
    id
    title
    snippet
    searchScore

    # Type-specific fields via inline fragments
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

### 5. Interface Fields in Lists

```graphql
type Query {
  feed: [Node!]!  # Returns a mix of Post, Comment, and User
  search(term: String!): [Searchable!]!
  node(id: ID!): Node  # Relay-style global node lookup
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

### 6. Relay-Style Global ID Resolution

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

## Explanation

- **Interface contract**: Every implementing type must include all fields declared in the interface. The schema validation fails otherwise
- **`__resolveType`**: GraphQL calls this resolver to determine the concrete type of an interface object. It returns the type name as a string
- **Inline fragments**: Clients use `... on TypeName { }` to access fields specific to a concrete type
- **Shared resolvers**: Fields defined on the interface can have default resolvers that apply to all implementing types, or each type can override them
- **Interfaces vs unions**: Interfaces require shared fields. Unions (`union Result = Post | User | Comment`) require none. Use interfaces when members share fields

## Variants

### Multiple Interface Implementation

A type can implement multiple interfaces:

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

### Interface with Default Field Resolver

```typescript
const resolvers = {
  Timestamped: {
    // Default resolver for all implementing types
    createdAt: (obj) => obj.createdAt,
    updatedAt: (obj) => obj.updatedAt,
    ageInDays: (obj) => {
      const diff = Date.now() - new Date(obj.createdAt).getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    },
  },
  // Post inherits createdAt, updatedAt, ageInDays from Timestamped
  Post: {
    // Override only if needed
  },
};
```

### Interface Implementing Another Interface

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

### Union with Shared Interface Fields

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

Clients query with inline fragments on the union, but both members share the `SearchResult` interface fields.

## Best Practices

- Keep interfaces focused on one concern (separation of `Node`, `Timestamped`, `Ownable` instead of one fat interface)
- Use `__resolveType` with a reliable discriminator field — avoid guessing from data shape
- Document which types implement each interface in schema descriptions
- Use interfaces for Relay-style global node identification (`interface Node { id: ID! }`)
- Prefer interfaces over unions when members share fields — clients get a better DX
- Keep `__resolveType` fast — it runs for every interface object in the response

## Common Mistakes

- **Missing `__resolveType`**: GraphQL cannot determine the concrete type and returns an error
- **Returning wrong type name**: `__resolveType` must return a string matching a type name in the schema, not the object's class name
- **Implementing interface without all fields**: Schema validation fails — every implementing type must include all interface fields
- **Using unions when interfaces fit better**: If all union members share fields, an interface gives clients a better query experience
- **Slow `__resolveType`**: Runs per object. If it does database lookups, it becomes a bottleneck. Use a discriminator field on the object instead

## FAQ

**What is the difference between interface and union in GraphQL?**

An interface defines shared fields that all implementing types must include. A union is a set of types with no required shared fields. Use interfaces when members share fields, unions when they don't.

**Can a type implement multiple interfaces?**

Yes. Use `&` in SDL: `type Post implements Node & Timestamped & Ownable`.

**How does `__resolveType` work?**

GraphQL calls `__resolveType` with the resolved object. It returns the concrete type name as a string (e.g., `'Post'`). GraphQL then uses that type to validate which fields are available.

**Should I use interfaces for Relay global identification?**

Yes. The `Node` interface (`id: ID!`) is the standard for Relay-style global object identification. Every type that can be looked up by a global ID implements it.

**Can interfaces inherit from other interfaces?**

Yes, since GraphQL 2.0. An interface can implement another interface using `implements`, requiring implementing types to include fields from both.
