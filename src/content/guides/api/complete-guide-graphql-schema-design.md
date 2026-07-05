---
contentType: guides
slug: complete-guide-graphql-schema-design
title: "Complete Guide to GraphQL Schema Design"
description: "Design GraphQL schemas for evolution, performance, and maintainability. Covers type design, connections, mutations, error handling, deprecation, and schema-first vs code-first workflows."
metaDescription: "Complete guide to GraphQL schema design. Learn type design, connections, mutations, error handling, deprecation, and schema-first vs code-first workflows."
difficulty: advanced
topics:
  - graphql
  - api
  - architecture
tags:
  - graphql
  - schema-design
  - api-design
  - guide
  - types
  - mutations
  - connections
  - deprecation
relatedResources:
  - /guides/api/complete-guide-graphql-federation
  - /guides/architecture/graphql-vs-rest-guide
  - /patterns/design/graphql-interface-polymorphism-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Complete guide to GraphQL schema design. Learn type design, connections, mutations, error handling, deprecation, and schema-first vs code-first workflows."
  keywords:
    - graphql schema design
    - graphql types
    - graphql mutations
    - graphql connections
    - schema-first graphql
    - graphql deprecation
    - graphql error handling
---

## Introduction

A GraphQL schema is the contract between your API and its clients. A well-designed schema is easy to understand, hard to misuse, and evolves without breaking existing clients. A poorly designed schema leads to confusing queries, N+1 performance problems, and painful migrations. This guide covers the principles and patterns for designing GraphQL schemas that hold up over time.

## Schema-First vs Code-First

Two approaches exist for defining a GraphQL schema. Both produce the same result, but the workflow differs.

### Schema-First

You write `.graphql` files with type definitions by hand. Code generators produce types and boilerplate for your resolvers.

```graphql
# schema.graphql
type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  author: User!
}

type Query {
  user(id: ID!): User
  users(limit: Int = 10, offset: Int = 0): [User!]!
}

type Mutation {
  createUser(input: CreateUserInput!): CreateUserPayload!
}

input CreateUserInput {
  name: String!
  email: String!
}

type CreateUserPayload {
  user: User
  errors: [UserError!]!
}

type UserError {
  field: String
  message: String!
}
```

Advantages: The schema is the single source of truth. Designers and frontend developers can review the schema before any backend code is written. Code generation ensures resolvers match the schema.

Disadvantages: You maintain two sources of truth (schema file + resolver code). Code generation tooling adds build complexity.

### Code-First

You define types in your programming language. A library builds the schema from your type definitions.

```typescript
import { schema } from "nexus";

schema.objectType({
  name: "User",
  definition(t) {
    t.id("id");
    t.string("name");
    t.string("email");
    t.list.field("posts", {
      type: "Post",
      resolve: (user, _args, ctx) => ctx.db.posts.findMany({ where: { authorId: user.id } }),
    });
  },
});

schema.queryType({
  definition(t) {
    t.field("user", {
      type: "User",
      args: { id: schema.idArg() },
      resolve: (_root, args, ctx) => ctx.db.users.findUnique({ where: { id: args.id } }),
    });
  },
});
```

Advantages: Single source of truth in your codebase. Type safety across resolvers. No code generation step.

Disadvantages: Schema design is mixed with implementation. Frontend developers cannot review the schema without reading backend code.

### Which to Choose

Use schema-first when a dedicated API designer or frontend team needs to review the schema before implementation. Use code-first when the backend team owns the schema and wants tighter type integration with the codebase. Both approaches produce equivalent schemas.

## Type Design Principles

### Name with Nouns, Not Verbs

Types represent entities, not actions. Name them after the domain concept.

```graphql
# Good
type User { ... }
type Product { ... }
type Order { ... }

# Bad: verbs as type names
type GetUser { ... }
type CreateOrder { ... }
```

### Use Non-Null by Default

Mark fields as non-null (`!`) when they should always have a value. Mark them as nullable only when the field can legitimately be absent.

```graphql
type User {
  id: ID!           # Always present
  name: String!     # Always present
  email: String     # May be null if user has not set email
  deletedAt: DateTime  # Null until deleted
}
```

When a non-null field's resolver throws, the error propagates up and nulls the nearest nullable parent. This is why you should avoid non-null on fields that depend on external services: a downstream failure nulls the entire object.

### Use Enums for Fixed Values

Enums are self-documenting and type-safe. Use them instead of strings for values with a fixed set of options.

```graphql
enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}

type Order {
  status: OrderStatus!
}
```

### Use Interfaces for Shared Fields

When multiple types share fields, define an interface. This enables polymorphic queries and reduces duplication.

```graphql
interface Node {
  id: ID!
}

interface Timestamped {
  createdAt: DateTime!
  updatedAt: DateTime!
}

type User implements Node & Timestamped {
  id: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
  name: String!
  email: String!
}

type Post implements Node & Timestamped {
  id: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
  title: String!
  body: String!
}
```

Clients can query shared fields without knowing the concrete type:

```graphql
query {
  search(term: "alice") {
    id
    createdAt
    ... on User { name }
    ... on Post { title }
  }
}
```

## Pagination with Connections

Lists should use the Relay Connection pattern for consistent pagination. This gives clients cursors, total counts, and metadata about whether more items exist.

```graphql
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type UserEdge {
  node: User!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type Query {
  users(first: Int = 10, after: String): UserConnection!
}
```

Client query:

```graphql
query {
  users(first: 10, after: "abc123") {
    edges {
      node { id name email }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

### Offset vs Cursor Pagination

Offset pagination (`limit` + `offset`) is simple but breaks when items are inserted or deleted between pages. Cursor pagination uses an opaque cursor (typically an encoded ID or timestamp) and is stable under inserts and deletes.

Use offset pagination for admin dashboards where exact page numbers matter. Use cursor pagination for feeds, lists, and infinite scroll where stability matters more than page numbers.

## Mutation Design

### One Mutation per Action

Each mutation represents one business operation. Do not create generic "upsert" mutations that try to handle both create and update with conditional logic.

```graphql
# Good: separate mutations
type Mutation {
  createUser(input: CreateUserInput!): CreateUserPayload!
  updateUser(input: UpdateUserInput!): UpdateUserPayload!
  deleteUser(input: DeleteUserInput!): DeleteUserPayload!
}

# Bad: ambiguous upsert
type Mutation {
  upsertUser(input: UpsertUserInput!): UpsertUserPayload!
}
```

### Input Types for Arguments

Mutations should accept a single `input` argument. This makes it easy to add fields without breaking existing clients and keeps the mutation signature clean.

```graphql
input CreateUserInput {
  name: String!
  email: String!
  role: UserRole = MEMBER
}

input UpdateUserInput {
  id: ID!
  name: String
  email: String
  role: UserRole
}
```

### Payload Types with Errors

Every mutation should return a payload type with the result and a list of errors. This lets clients handle errors structurally instead of parsing error messages.

```graphql
type CreateUserPayload {
  user: User
  errors: [UserError!]!
}

type UserError {
  field: String
  message: String!
  code: ErrorCode!
}

enum ErrorCode {
  VALIDATION
  NOT_FOUND
  UNAUTHORIZED
  CONFLICT
  INTERNAL
}
```

### Mutation Naming

Name mutations as verbs in past tense for the payload and imperative for the operation. This makes it clear what happened.

```graphql
type Mutation {
  createUser(input: CreateUserInput!): CreateUserPayload!
  updateUser(input: UpdateUserInput!): UpdateUserPayload!
  deleteUser(input: DeleteUserInput!): DeleteUserPayload!
  sendPasswordResetEmail(input: SendPasswordResetEmailInput!): SendPasswordResetEmailPayload!
}
```

## Error Handling

GraphQL errors come in two flavors: transport-level errors (network, parsing) and field-level errors (resolver threw). The `errors` array in the response contains both.

### Structured Errors in Payloads

For expected errors (validation, not found, unauthorized), return them in the payload. Do not throw. Throwing puts the error in the `errors` array, which is harder for clients to handle programmatically.

```typescript
const resolvers = {
  Mutation: {
    createUser: async (_root, { input }, ctx) => {
      const existing = await ctx.db.users.findUnique({ where: { email: input.email } });
      if (existing) {
        return {
          user: null,
          errors: [{
            field: "email",
            message: "Email already in use",
            code: "CONFLICT",
          }],
        };
      }

      const user = await ctx.db.users.create({ data: input });
      return { user, errors: [] };
    },
  },
};
```

### Throwing for Unexpected Errors

For unexpected errors (database down, internal bugs), let the error propagate. The GraphQL runtime catches it, nulls the field, and adds an entry to the `errors` array. Log the full error server-side; send a generic message to the client.

## Schema Evolution

### Adding Fields (Non-Breaking)

Adding a new field to an existing type is non-breaking. Existing clients ignore the new field. New clients can opt in.

```graphql
# v1
type User {
  id: ID!
  name: String!
  email: String!
}

# v2: add avatarUrl (non-breaking)
type User {
  id: ID!
  name: String!
  email: String!
  avatarUrl: String
}
```

### Removing Fields (Breaking)

Removing a field breaks any client that queries it. Use deprecation instead.

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  # Deprecated: use avatarUrl instead
  avatar: String @deprecated(reason: "Use avatarUrl. Removed in v3.")
  avatarUrl: String
}
```

Track field usage to know when all clients have migrated. Once no client queries the deprecated field, remove it in the next major version.

### Deprecation Best Practices

- Always provide a `reason` in the `@deprecated` directive
- Document the replacement field or mutation
- Monitor field usage via GraphQL metrics (DataLoader, Apollo Studio)
- Set a removal date to create urgency for migration
- Never deprecate a field without providing an alternative

## N+1 Prevention

The N+1 problem occurs when a list field resolver makes one database query per item. For a list of 100 users, fetching each user's posts results in 101 queries (1 for users + 100 for posts).

### DataLoader

DataLoader batches individual loads into a single query. Instead of 100 queries for posts, it does one query with `WHERE authorId IN (1, 2, 3, ..., 100)`.

```typescript
import DataLoader from "dataloader";

const postsLoader = new DataLoader(async (userIds: number[]) => {
  const posts = await db.posts.findMany({ where: { authorId: { in: userIds } } });
  // Group posts by authorId
  const postsByAuthor = new Map<number, Post[]>();
  for (const post of posts) {
    const list = postsByAuthor.get(post.authorId) ?? [];
    list.push(post);
    postsByAuthor.set(post.authorId, list);
  }
  return userIds.map((id) => postsByAuthor.get(id) ?? []);
});

const resolvers = {
  User: {
    posts: (user: User) => postsLoader.load(user.id),
  },
};
```

### Field-Level Batching

If you control the query, you can batch at the resolver level without DataLoader:

```typescript
const resolvers = {
  Query: {
    users: async (_root, { limit, offset }, ctx) => {
      const users = await ctx.db.users.findMany({ take: limit, skip: offset });
      // Pre-fetch all posts for these users in one query
      const userIds = users.map((u) => u.id);
      const allPosts = await ctx.db.posts.findMany({ where: { authorId: { in: userIds } } });
      // Attach posts to users
      for (const user of users) {
        user.posts = allPosts.filter((p) => p.authorId === user.id);
      }
      return users;
    },
  },
};
```

## Schema Validation and Linting

Use tools to enforce schema quality:

- **graphql-schema-linter**: Lints schemas for naming conventions, deprecation policies, and structure
- **Apollo Studio**: Provides schema analytics, field usage, and performance metrics
- **graphql-inspector**: Detects breaking changes between schema versions

Example `graphql-schema-linter` rules:

```yaml
# .graphql-schema-linterrc
rules:
  - types-have-descriptions
  - fields-have-descriptions
  - enum-values-have-descriptions
  - input-object-values-have-descriptions
  - deprecations-have-a-reason
  - enum-values-sorted-alphabetically
  - type-fields-sorted-alphabetically
```

## Checklist for Schema Review

Before publishing a schema change, verify:

- [ ] All types and fields have descriptions
- [ ] Non-null is used correctly (not on fields that depend on external services)
- [ ] Lists use the Connection pattern for pagination
- [ ] Mutations use input types and return payload types with errors
- [ ] Enums are used for fixed-value fields instead of strings
- [ ] Interfaces are used for shared fields across types
- [ ] Deprecated fields have a reason and a replacement
- [ ] No N+1 resolvers (use DataLoader or batch loading)
- [ ] Schema passes linter rules
- [ ] No breaking changes (or documented in migration guide)

## FAQ

### Should I use nullable or non-null fields?

Default to non-null for fields that always have a value (id, name, createdAt). Use nullable for fields that can be absent (email, avatarUrl, deletedAt). Avoid non-null on fields resolved by external services: a downstream failure nulls the entire object.

### How do I handle authentication in the schema?

Do not put auth in the schema. Authentication is handled in the context or middleware layer. The resolver checks `ctx.user` and throws `UNAUTHORIZED` if the user is not authenticated. The schema stays clean of auth concerns.

### Should I expose computed fields?

Yes. Computed fields (fullName from firstName + lastName, orderTotal from line items) are useful for clients and keep business logic server-side. Document them as computed so clients know they do not need to compute them locally.

### How do I version my GraphQL schema?

GraphQL does not use URL versioning like REST. Instead, evolve the schema by adding fields and deprecating old ones. Track field usage and remove deprecated fields when no clients use them. For major breaking changes, run two schemas in parallel during migration.

### What is the difference between interfaces and unions?

Interfaces define shared fields that implementing types must have. Unions define a set of types without shared fields. Use interfaces when types share fields (Node with id). Use unions when types are unrelated but can appear in the same field (SearchResult = User | Post | Product).

### Should I use custom scalars?

Use custom scalars for domain-specific types that need validation (DateTime, Email, URL, UUID). Do not use custom scalars for everything: standard scalars (String, Int, Boolean) are clearer for simple values. Custom scalars should have clear serialization and parsing rules.
