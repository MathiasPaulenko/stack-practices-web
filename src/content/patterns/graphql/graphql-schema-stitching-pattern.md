---
contentType: patterns
slug: graphql-schema-stitching-pattern
title: "GraphQL Schema Stitching Pattern"
description: "Merge multiple independent GraphQL schemas into a single unified schema that clients can query as one graph."
metaDescription: "Combine multiple GraphQL schemas into one unified graph with schema stitching. Merge types, delegate resolvers, and expose a single endpoint."
difficulty: advanced
category: architectural
topics:
  - graphql
  - architecture
  - api
tags:
  - schema-stitching
  - pattern
  - graphql-federation
  - api-gateway
  - schema-merging
relatedResources:
  - /patterns/graphql-federated-entity-pattern
  - /patterns/graphql-batched-resolver-pattern
  - /guides/complete-guide-graphql-schema-design
  - /guides/complete-guide-graphql-federation-production
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Combine multiple GraphQL schemas into one unified graph with schema stitching. Merge types, delegate resolvers, and expose a single endpoint."
  keywords:
    - schema-stitching
    - pattern
    - graphql-federation
    - api-gateway
    - schema-merging
---

## Overview

Schema stitching merges multiple independent GraphQL schemas into a single unified schema. Each subschema owns its types and resolvers. The stitched gateway delegates field resolution back to the originating service. Clients query one endpoint and see one graph, while internally the work fans out to multiple services.

This differs from federation: stitching works at the schema level (merging type definitions), while federation works at the service level (each service contributes slices of a shared graph). Stitching is lighter-weight but requires manual merge configuration.

## When to Use

- Multiple teams own separate GraphQL APIs that need a unified entry point
- Migrating from a monolithic GraphQL schema to distributed services gradually
- Aggregating third-party GraphQL APIs behind a single gateway
- When federation is not feasible (non-Apollo servers, legacy schemas)

## When Not to Use

- Greenfield projects where federation is available from the start
- Schemas with heavy type conflicts that require complex merge rules
- Teams that need strict runtime isolation between services

## Solution

### 1. Define Subschemas

Each service exposes its own schema independently.

**Users Service (`users-api`)**

```graphql
type User {
  id: ID!
  name: String!
  email: String!
}

type Query {
  user(id: ID!): User
  users: [User!]!
}
```

**Posts Service (`posts-api`)**

```graphql
type Post {
  id: ID!
  title: String!
  body: String!
  authorId: ID!
}

type Query {
  post(id: ID!): Post
  posts: [Post!]!
}
```

### 2. Stitch with `@graphql-tools/stitch`

```typescript
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { createExecutor } from '@graphql-tools/executor-apollo-link';
import { ApolloLink, HttpLink } from '@apollo/client/core';

// Create executors for each subschema
const usersExecutor = createExecutor(
  new ApolloLink(new HttpLink({ uri: 'http://localhost:4001/graphql' }))
);

const postsExecutor = createExecutor(
  new ApolloLink(new HttpLink({ uri: 'http://localhost:4002/graphql' }))
);

// Define subschema configs
const usersSubschema = {
  schema: makeExecutableSchema({
    typeDefs: usersTypeDefs,
    resolvers: usersResolvers,
  }),
  executor: usersExecutor,
};

const postsSubschema = {
  schema: makeExecutableSchema({
    typeDefs: postsTypeDefs,
    resolvers: postsResolvers,
  }),
  executor: postsExecutor,
};
```

### 3. Add Merged Types with Field Delegation

The gateway extends `User` to include `posts` and `Post` to include `author`. Field resolvers delegate to the owning subschema.

```typescript
const linkTypeDefs = `
  extend type User {
    posts: [Post!]!
  }

  extend type Post {
    author: User!
  }
`;

const gatewaySchema = stitchSchemas({
  subschemas: [usersSubschema, postsSubschema],
  typeDefs: linkTypeDefs,
  resolvers: {
    User: {
      posts: {
        selectionSet: '{ id }',
        resolve: (user, _args, context, info) => {
          // Delegate to posts subschema
          return info.mergeInfo.delegateToSchema({
            schema: postsSubschema,
            operation: 'query',
            fieldName: 'posts',
            args: { authorId: user.id },
            context,
            info,
          });
        },
      },
    },
    Post: {
      author: {
        selectionSet: '{ authorId }',
        resolve: (post, _args, context, info) => {
          return info.mergeInfo.delegateToSchema({
            schema: usersSubschema,
            operation: 'query',
            fieldName: 'user',
            args: { id: post.authorId },
            context,
            info,
          });
        },
      },
    },
  },
});
```

### 4. Start the Gateway

```typescript
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

const server = new ApolloServer({ schema: gatewaySchema });

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`Gateway ready at ${url}`);
```

### 5. Query the Unified Graph

Clients query both services through one request:

```graphql
query {
  user(id: "1") {
    name
    email
    posts {
      title
      body
    }
  }
}
```

The gateway resolves `name` and `email` from the users service, then delegates `posts` to the posts service using the `id` field from the user.

## Explanation

- **Subschemas**: Each service runs independently with its own schema and resolvers
- **Executor**: Sends operations to the remote subschema endpoint via HTTP
- **Link types**: Type extensions (`extend type User { posts: [Post!]! }`) create cross-service relationships
- **Delegation**: `delegateToSchema` forwards a field resolution to the owning subschema, passing the parent object's fields as arguments
- **Selection set**: Tells the stitcher which fields from the parent object are needed for delegation (`{ id }` for `User.posts`, `{ authorId }` for `Post.author`)

## Variants

### Batch Delegation

Instead of resolving `posts` per user, batch the lookup:

```typescript
User: {
  posts: {
    selectionSet: '{ id }',
    resolve: async (user, _args, context, info) => {
      const result = await info.mergeInfo.delegateToSchema({
        schema: postsSubschema,
        operation: 'query',
        fieldName: 'postsByAuthorIds',
        args: { authorIds: [user.id] },
        context,
        info,
      });
      return result;
    },
  },
},
```

For lists of users, use a batch resolver that collects all `authorId` values and makes one request.

### Computed Fields

Add fields that don't exist in any subschema but are computed at the gateway:

```typescript
const gatewaySchema = stitchSchemas({
  subschemas: [usersSubschema, postsSubschema],
  resolvers: {
    User: {
      postCount: {
        selectionSet: '{ id }',
        resolve: async (user, _args, context, info) => {
          const posts = await info.mergeInfo.delegateToSchema({
            schema: postsSubschema,
            operation: 'query',
            fieldName: 'posts',
            args: { authorId: user.id },
            context,
            info,
          });
          return posts.length;
        },
      },
    },
  },
});
```

### Type Merging

For schemas that share a type (e.g., both services define `User`), configure merge rules:

```typescript
const usersSubschema = {
  schema: usersSchema,
  executor: usersExecutor,
  merge: {
    User: {
      selectionSet: '{ id }',
      fieldName: 'user',
      args: (originalResult) => ({ id: originalResult.id }),
    },
  },
};
```

## Best Practices

- Keep subschemas small and focused on one domain
- Use `selectionSet` on every merged field to avoid over-fetching
- Batch delegations when resolving list fields to avoid N+1 calls
- Cache executor results where possible to reduce gateway latency
- Document which service owns which type to avoid merge conflicts
- Monitor delegation latency — the gateway adds a network hop per delegation

## Common Mistakes

- **Missing `selectionSet`**: Without it, the stitcher may not have the fields needed for delegation, causing null results
- **Circular dependencies**: Service A extends Service B's type, Service B extends Service A's type — works but creates infinite resolution loops if not careful
- **Overlapping root query fields**: Two subschemas both defining `Query.user(id: ID!)` — configure merge rules or rename one
- **Not batching list delegations**: Resolving `posts` for 50 users one-by-one causes 50 requests to the posts service
- **Ignoring error propagation**: Errors from subschemas need proper mapping at the gateway level

## FAQ

**Schema stitching vs federation — which should I use?**

Federation (Apollo Federation) is the modern standard for distributed GraphQL. Use stitching when you have non-Apollo servers, legacy schemas, or need lighter-weight merging without the federation runtime.

**Can I stitch REST APIs?**

Yes. Wrap REST endpoints as GraphQL subschemas using `@graphql-tools/wrap` and a custom executor that translates GraphQL operations to HTTP calls.

**How does stitching handle authentication?**

The gateway extracts auth tokens from incoming requests and forwards them to subschemas via the executor's `context`. Each subschema enforces its own authorization rules.

**What about performance?**

Each delegation adds a network round-trip. Use batching, caching, and DataLoader at the gateway level to minimize calls. For high-traffic scenarios, consider federation with its query planning instead.
