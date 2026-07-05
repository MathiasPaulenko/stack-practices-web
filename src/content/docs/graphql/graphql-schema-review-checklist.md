---
contentType: docs
slug: graphql-schema-review-checklist
templateType: post-deployment-checklist
title: "GraphQL Schema Review Checklist"
description: "Checklist for reviewing GraphQL schemas: naming conventions, type design, pagination, error handling, security, performance, deprecation, and federation readiness with code examples and validation rules."
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

This checklist covers everything to review in a GraphQL schema before merging or deploying. Run through each section for new schemas, schema changes, and periodic audits. Poor schema design compounds over time — catch issues early.

---

## 1. Naming Conventions

### 1.1 Type Names

- [ ] Types use PascalCase (e.g., `User`, `ProductOrder`)
- [ ] Types are singular (e.g., `User` not `Users`)
- [ ] Edge types follow `{Parent}Edge` convention (e.g., `UserEdge`)
- [ ] Connection types follow `{Parent}Connection` convention
- [ ] Input types follow `{Type}Input` convention (e.g., `CreateUserInput`)
- [ ] Payload types follow `{Action}{Type}Payload` (e.g., `CreateUserPayload`)
- [ ] Filter/sort inputs follow `{Type}Filter` and `{Type}Sort`

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

- [ ] Fields use camelCase (e.g., `firstName`, `createdAt`)
- [ ] Boolean fields start with a verb (e.g., `isActive`, `hasPermissions`)
- [ ] DateTime fields end with `At` (e.g., `createdAt`, `updatedAt`, `deletedAt`)
- [ ] Count fields end with `Count` (e.g., `orderCount`, `commentCount`)
- [ ] ID fields use `ID` type, not `String`
- [ ] No abbreviations unless domain-standard (e.g., `URL`, `ISBN`)

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

- [ ] Mutations use verbs: `create`, `update`, `delete`, `archive`, `restore`
- [ ] Format: `{verb}{Type}` (e.g., `createUser`, `updateProduct`, `deleteOrder`)
- [ ] Bulk mutations: `{verb}{Type}s` (e.g., `createUsers`, `deleteOrders`)
- [ ] No generic names like `save` or `modify`

---

## 2. Type Design

### 2.1 Nullability

```text
Rules:
  - Use Non-Null (!) for fields that are always present
  - Use Nullable for fields that may be absent or optional
  - Never make a field Non-Null if it can become null in the future
  - Database required fields → Non-Null in schema
  - Optional fields → Nullable in schema
  - Lists: use [Type!]! for required non-empty lists
  - Lists: use [Type!] for optional lists (may be null)
  - Lists: use [Type] for lists that may contain null items (rare)
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

- [ ] Enums used for fields with a fixed set of values
- [ ] Enum values use UPPER_SNAKE_CASE
- [ ] Enum names use PascalCase
- [ ] No generic enums (e.g., `Status` — use `OrderStatus`, `UserStatus`)

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

### 2.3 Interfaces and Unions

- [ ] Interfaces used when multiple types share fields
- [ ] Unions used when a field can return different types with no shared fields
- [ ] Interface names are nouns (e.g., `Node`, `Ownable`)
- [ ] Union names describe the relationship (e.g., `SearchResult`)

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

- [ ] Custom scalars defined for domain-specific types
- [ ] Custom scalar parsers implemented (serialize, parseValue, parseLiteral)
- [ ] Scalars documented with format examples

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

- [ ] List fields use the Connection/Edge pattern (Relay spec)
- [ ] Connections include `pageInfo` with `hasNextPage`, `hasPreviousPage`
- [ ] Connections include `totalCount` when needed
- [ ] Edges include `cursor` and `node`
- [ ] Edges include edge-specific fields (e.g., `role` on `UserGroupEdge`)

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

- [ ] `first` and `last` have maximum limits (e.g., max 100)
- [ ] Default page size defined (e.g., 20)
- [ ] Cursors are opaque base64-encoded strings
- [ ] `after`/`before` cursors validated server-side
- [ ] No offset-based pagination for large datasets
- [ ] `totalCount` only computed when requested (deferred)

---

## 4. Error Handling

### 4.1 Mutation Errors

```graphql
# Mutation payload should include userErrors for partial failures
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

- [ ] Mutations return payload types with error fields
- [ ] Errors are typed with error codes (not just messages)
- [ ] Validation errors include field-level information
- [ ] Authentication errors use standard `UNAUTHENTICATED` code
- [ ] Authorization errors use standard `FORBIDDEN` code
- [ ] No sensitive information in error messages
- [ ] Rate limit errors include `retryAfter` information

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
- [ ] Authentication enforced on all non-public fields
- [ ] Authorization checked per field (not just per query)
- [ ] Introspection disabled in production
- [ ] Persisted queries for production clients
- [ ] No sensitive data in error messages
- [ ] CORS configured correctly
- [ ] File upload size limits enforced

---

## 6. Performance

### 6.1 N+1 Prevention

```javascript
// Use DataLoader to batch and cache database queries
import DataLoader from 'dataloader';

const userLoader = new DataLoader(async (userIds) => {
  const users = await db.users.findMany({ where: { id: { in: userIds } } });
  return userIds.map(id => users.find(u => u.id === id));
});

// In resolver
const resolvers = {
  Order: {
    user: (parent, _, context) => context.loaders.user.load(parent.userId),
  },
};
```

### 6.2 Performance Checklist

- [ ] DataLoaders used for all N+1-prone resolvers
- [ ] Database queries batched per request
- [ ] Resolvers avoid unnecessary database calls
- [ ] `@defer` used for slow fields
- [ ] `@stream` used for large lists
- [ ] Field-level caching where appropriate
- [ ] Query persisted for production clients
- [ ] Response compression enabled (gzip/brotli)
- [ ] Subscriptions cleaned up on disconnect

---

## 7. Deprecation

### 7.1 Deprecation Checklist

- [ ] Deprecated fields use `@deprecated` directive with reason
- [ ] Deprecated fields have replacement documented
- [ ] Deprecation timeline communicated to clients
- [ ] Deprecated fields tracked for usage
- [ ] Fields removed only after deprecation period (min 6 months)
- [ ] Breaking changes documented in changelog

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

- [ ] Entity types have `@key` directive with unique fields
- [ ] `__resolveReference` implemented for all entities
- [ ] No circular dependencies between subgraphs
- [ ] Shared types extended with `@extends`
- [ ] Custom scalars consistent across subgraphs
- [ ] Enum values consistent across subgraphs
- [ ] No orphaned types (types not referenced by any query)

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

## FAQ

### How do I handle breaking changes in a GraphQL schema?

Never remove fields without a deprecation period. Add the new field first, deprecate the old one with `@deprecated(reason: "...")`, communicate the timeline to clients, monitor usage of the deprecated field, and remove it only after usage drops to zero or the deprecation period expires (minimum 6 months). For type changes, create a new type and deprecate the old one. Document all breaking changes in your changelog.

### What is the maximum query depth I should allow?

Set the maximum depth to 10-15 levels for most APIs. Analyze your legitimate client queries to determine the actual maximum depth needed. Set the limit just above that. Malicious queries with excessive depth (e.g., `user { friends { friends { friends { ... } } } }`) can cause exponential resource consumption. Use `graphql-depth-limit` to enforce the limit server-side.

### Should I use offset or cursor-based pagination?

Use cursor-based pagination (the Connection pattern) for all list fields. Cursor pagination is stable under data changes (new items don't shift offsets), works with large datasets, and supports bidirectional pagination. Offset pagination is acceptable for small, static lists (e.g., configuration items under 100). For any list that can grow, use cursors from the start — migrating later is painful.

### How do I prevent N+1 queries in GraphQL?

Use DataLoader for every resolver that fetches related data. DataLoader batches multiple requests for the same resource within a single GraphQL execution and caches by key. Without it, a query for 50 orders with their users results in 50 separate database queries. With DataLoader, it becomes one query: `SELECT * FROM users WHERE id IN (1, 2, 3, ...)`. Profile your resolvers with logging to verify batch behavior.

### What should I check before enabling federation?

Ensure every entity type has a `@key` directive with a field that uniquely identifies it across subgraphs. Implement `__resolveReference` for each entity. Verify no circular dependencies exist between subgraphs (Subgraph A extends a type from Subgraph B which extends a type from Subgraph A). Ensure custom scalars and enums are defined identically in all subgraphs that use them. Test the composed schema with `rover supergraph compose` before deploying.
