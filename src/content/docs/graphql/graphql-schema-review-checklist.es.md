---
contentType: docs
slug: graphql-schema-review-checklist
templateType: post-deployment-checklist
title: "Checklist de Revision de Schema GraphQL"
description: "Checklist para revisar schemas GraphQL: naming conventions, type design, pagination, error handling, security, performance, deprecation y federation readiness con ejemplos de codigo y validation rules."
metaDescription: "Checklist for GraphQL schema review: naming, type design, pagination, error handling, security, performance, deprecation, federation readiness with examples."
difficulty: intermediate
topics:
  - graphql
tags:
  - graphql
  - schema-review
  - checklist
  - api-design
  - performance
  - security
relatedResources:
  - /docs/ai/graphql-api-design-guideline
  - /docs/ai/graphql-deprecation-policy-template
  - /guides/architecture/complete-guide-graphql-federation
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Checklist for GraphQL schema review: naming, type design, pagination, error handling, security, performance, deprecation, federation readiness with examples."
  keywords:
    - graphql schema review
    - graphql checklist
    - graphql best practices
    - schema design
    - graphql security
    - graphql performance
    - graphql federation
---

## Overview

Este checklist cubre todo lo que tenes que revisar en un GraphQL schema antes de mergear o deployear. Corre a traves de cada section para new schemas, schema changes y periodic audits. Poor schema design componea over time — catchea issues early.

---

## 1. Naming Conventions

### 1.1 Type Names

- [ ] Types usan PascalCase (e.g., `User`, `ProductOrder`)
- [ ] Types son singular (e.g., `User` no `Users`)
- [ ] Edge types siguen `{Parent}Edge` convention (e.g., `UserEdge`)
- [ ] Connection types siguen `{Parent}Connection` convention
- [ ] Input types siguen `{Type}Input` convention (e.g., `CreateUserInput`)
- [ ] Payload types siguen `{Action}{Type}Payload` (e.g., `CreateUserPayload`)
- [ ] Filter/sort inputs siguen `{Type}Filter` y `{Type}Sort`

```graphql
# Good
type User { ... }
type ProductOrder { ... }
input CreateUserInput { ... }
type CreateUserPayload { ... }

# Bad
type Users { ... }
type user { ... }
input NewUser { ... }
type CreateUserResult { ... }
```

### 1.2 Field Names

- [ ] Fields usan camelCase (e.g., `firstName`, `createdAt`)
- [ ] Boolean fields empiezan con un verb (e.g., `isActive`, `hasPermissions`)
- [ ] DateTime fields terminan con `At` (e.g., `createdAt`, `updatedAt`, `deletedAt`)
- [ ] Count fields terminan con `Count` (e.g., `orderCount`, `commentCount`)
- [ ] ID fields usan `ID` type, no `String`
- [ ] No abbreviations a menos que domain-standard (e.g., `URL`, `ISBN`)

```graphql
# Good
type User {
  id: ID!
  firstName: String!
  isActive: Boolean!
  createdAt: DateTime!
  orderCount: Int!
}

# Bad
type User {
  id: String!
  first_name: String!
  active: Boolean!
  created: String!
  orders: Int!
}
```

### 1.3 Mutation Names

- [ ] Mutations usan verbs: `create`, `update`, `delete`, `archive`, `restore`
- [ ] Format: `{verb}{Type}` (e.g., `createUser`, `updateProduct`, `deleteOrder`)
- [ ] Bulk mutations: `{verb}{Type}s` (e.g., `createUsers`, `deleteOrders`)
- [ ] No generic names como `save` o `modify`

---

## 2. Type Design

### 2.1 Nullability

```text
Rules:
  - Usa Non-Null (!) para fields que siempre estan present
  - Usa Nullable para fields que pueden ser absent o optional
  - Nunca hagas un field Non-Null si puede become null en el future
  - Database required fields → Non-Null en schema
  - Optional fields → Nullable en schema
  - Lists: usa [Type!]! para required non-empty lists
  - Lists: usa [Type!] para optional lists (puede ser null)
  - Lists: usa [Type] para lists que pueden contain null items (rare)
```

```graphql
# Good — clear nullability contract
type User {
  id: ID!                    # Always present
  email: String!             # Always present
  phone: String              # Optional
  orders: [Order!]!          # Always a list, never null items
  deletedAt: DateTime        # Null until deleted
}

# Bad — unsafe nullability
type User {
  id: ID
  email: String
  orders: [Order]
  deletedAt: DateTime!
}
```

### 2.2 Enums

- [ ] Enums usados para fields con un fixed set de values
- [ ] Enum values usan UPPER_SNAKE_CASE
- [ ] Enum names usan PascalCase
- [ ] No generic enums (e.g., `Status` — usa `OrderStatus`, `UserStatus`)

```graphql
enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}
```

### 2.3 Interfaces y Unions

- [ ] Interfaces usados cuando multiple types shareean fields
- [ ] Unions usados cuando un field puede returnar different types sin shared fields
- [ ] Interface names son nouns (e.g., `Node`, `Ownable`)
- [ ] Union names describen el relationship (e.g., `SearchResult`)

```graphql
interface Node {
  id: ID!
}

type User implements Node {
  id: ID!
  name: String!
}

type Product implements Node {
  id: ID!
  price: Float!
}

union SearchResult = User | Product | Article
```

### 2.4 Custom Scalars

- [ ] Custom scalars definidos para domain-specific types
- [ ] Custom scalar parsers implemented (serialize, parseValue, parseLiteral)
- [ ] Scalars documentados con format examples

```graphql
scalar DateTime
scalar URL
scalar Email
scalar UUID
scalar JSON

# Example scalar resolver
const DateTime = {
  serialize: (value: Date) => value.toISOString(),
  parseValue: (value: string) => new Date(value),
  parseLiteral: (ast) => {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
};
```

---

## 3. Pagination

### 3.1 Connection Pattern

- [ ] List fields usan el Connection/Edge pattern (Relay spec)
- [ ] Connections incluyen `pageInfo` con `hasNextPage`, `hasPreviousPage`
- [ ] Connections incluyen `totalCount` cuando needed
- [ ] Edges incluyen `cursor` y `node`
- [ ] Edges incluyen edge-specific fields (e.g., `role` on `UserGroupEdge`)

```graphql
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type UserEdge {
  node: User!
  cursor: String!
  joinedAt: DateTime!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type Query {
  users(first: Int, after: String, last: Int, before: String): UserConnection!
}
```

### 3.2 Pagination Checklist

- [ ] `first` y `last` tienen maximum limits (e.g., max 100)
- [ ] Default page size definido (e.g., 20)
- [ ] Cursors son opaque base64-encoded strings
- [ ] `after`/`before` cursors validados server-side
- [ ] No offset-based pagination para large datasets
- [ ] `totalCount` solo computed cuando requested (deferred)

---

## 4. Error Handling

### 4.1 Mutation Errors

```graphql
# Mutation payload deberia incluir userErrors para partial failures
type CreateUserPayload {
  user: User
  userErrors: [UserError!]!
}

type UserError {
  field: String
  message: String!
  code: UserErrorCode!
}

enum UserErrorCode {
  INVALID_EMAIL
  DUPLICATE_EMAIL
  PASSWORD_TOO_SHORT
  UNAUTHORIZED
}
```

### 4.2 Error Handling Checklist

- [ ] Mutations returnean payload types con error fields
- [ ] Errors son typed con error codes (no solo messages)
- [ ] Validation errors incluyen field-level information
- [ ] Authentication errors usan standard `UNAUTHENTICATED` code
- [ ] Authorization errors usan standard `FORBIDDEN` code
- [ ] No sensitive information en error messages
- [ ] Rate limit errors incluyen `retryAfter` information

---

## 5. Security

### 5.1 Query Depth Limiting

```javascript
// Server configuration — limit query depth
import { createDepthLimit } from 'graphql-depth-limit';

const depthLimit = createDepthLimit({
  maxDepth: 10,
  ignore: ['__schema', '__type'],
});
```

### 5.2 Query Complexity

```javascript
// Limit total query complexity
import { createComplexityRule } from 'graphql-query-complexity';

const complexityRule = createComplexityRule({
  maximumComplexity: 1000,
  estimators: [
    fieldExtensionsEstimator(),
    directiveEstimator(),
    simpleEstimator({ defaultComplexity: 1 }),
  ],
});
```

### 5.3 Security Checklist

- [ ] Query depth limited (max 10-15 levels)
- [ ] Query complexity limited (prevent expensive queries)
- [ ] Rate limiting per user/IP
- [ ] Authentication enforced en all non-public fields
- [ ] Authorization checkeado per field (no solo per query)
- [ ] Introspection disabled en production
- [ ] Persisted queries para production clients
- [ ] No sensitive data en error messages
- [ ] CORS configurado correctamente
- [ ] File upload size limits enforced

---

## 6. Performance

### 6.1 N+1 Prevention

```javascript
// Usa DataLoader para batch y cache database queries
import DataLoader from 'dataloader';

const userLoader = new DataLoader(async (userIds) => {
  const users = await db.users.findMany({ where: { id: { in: userIds } } });
  return userIds.map(id => users.find(u => u.id === id));
});

// En resolver
const resolvers = {
  Order: {
    user: (parent, _, context) => context.loaders.user.load(parent.userId),
  },
};
```

### 6.2 Performance Checklist

- [ ] DataLoaders usados para all N+1-prone resolvers
- [ ] Database queries batcheados per request
- [ ] Resolvers avoid unnecessary database calls
- [ ] `@defer` usado para slow fields
- [ ] `@stream` usado para large lists
- [ ] Field-level caching donde appropriate
- [ ] Query persisted para production clients
- [ ] Response compression enabled (gzip/brotli)
- [ ] Subscriptions cleaned up on disconnect

---

## 7. Deprecation

### 7.1 Deprecation Checklist

- [ ] Deprecated fields usan `@deprecated` directive con reason
- [ ] Deprecated fields tienen replacement documentado
- [ ] Deprecation timeline communicated a clients
- [ ] Deprecated fields tracked para usage
- [ ] Fields removed solo despues de deprecation period (min 6 months)
- [ ] Breaking changes documentados en changelog

```graphql
type User {
  id: ID!
  name: String! @deprecated(reason: "Use firstName and lastName instead")
  firstName: String!
  lastName: String!
}
```

---

## 8. Federation Readiness

### 8.1 Federation Checklist

- [ ] Entity types tienen `@key` directive con unique fields
- [ ] `__resolveReference` implemented para all entities
- [ ] No circular dependencies entre subgraphs
- [ ] Shared types extended con `@extends`
- [ ] Custom scalars consistent across subgraphs
- [ ] Enum values consistent across subgraphs
- [ ] No orphaned types (types no referenced por any query)

```graphql
# Subgraph A — User entity
type User @key(fields: "id") {
  id: ID!
  name: String!
}

# Subgraph B — extends User
type User @key(fields: "id") @extends {
  id: ID! @external
  orders: [Order!]!
}
```

## Preguntas Frecuentes

### ¿Cómo handleo breaking changes en un GraphQL schema?

Nunca removeas fields sin un deprecation period. Addea el new field primero, depretea el old one con `@deprecated(reason: "...")`, communicate el timeline a clients, monitorea usage del deprecated field, y removeelo solo despues que usage droppea a zero o el deprecation period expira (minimum 6 months). Para type changes, crea un new type y depretea el old one. Documenta all breaking changes en tu changelog.

### ¿Cuál es el maximum query depth que deberia allow?

Setea el maximum depth a 10-15 levels para most APIs. Analyza tus legitimate client queries para determinar el actual maximum depth needed. Setea el limit just above de eso. Malicious queries con excessive depth (e.g., `user { friends { friends { friends { ... } } } }`) pueden causar exponential resource consumption. Usa `graphql-depth-limit` para enforce el limit server-side.

### ¿Deberia usar offset o cursor-based pagination?

Usa cursor-based pagination (el Connection pattern) para all list fields. Cursor pagination es stable under data changes (new items no shiftean offsets), works con large datasets, y supportea bidirectional pagination. Offset pagination es acceptable para small, static lists (e.g., configuration items under 100). Para cualquier list que pueda grow, usa cursors desde el start — migrar despues es painful.

### ¿Cómo prevengo N+1 queries en GraphQL?

Usa DataLoader para every resolver que fetchea related data. DataLoader batchea multiple requests para el same resource dentro de un single GraphQL execution y cachea por key. Sin el, una query para 50 orders con sus users resulta en 50 separate database queries. Con DataLoader, se becomes una query: `SELECT * FROM users WHERE id IN (1, 2, 3, ...)`. Profilea tus resolvers con logging para verificar batch behavior.

### ¿Qué deberia checkear antes de enable federation?

Asegurate que every entity type tiene un `@key` directive con un field que unique identifica across subgraphs. Implementa `__resolveReference` para cada entity. Verifica que no circular dependencies existan entre subgraphs (Subgraph A extends un type de Subgraph B que extends un type de Subgraph A). Asegura que custom scalars y enums estan definidos identicamente en all subgraphs que los usan. Testea el composed schema con `rover supergraph compose` antes de deployear.
