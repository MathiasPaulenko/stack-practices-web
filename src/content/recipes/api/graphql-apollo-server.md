---
contentType: recipes
slug: graphql-apollo-server
title: "Build a GraphQL API with Apollo Server and TypeScript"
description: "How to build a production-ready GraphQL API using Apollo Server, TypeScript, and DataLoader to solve the N+1 query problem"
metaDescription: "Build a GraphQL API with Apollo Server and TypeScript. Use DataLoader for N+1 queries, implement authentication, and structure resolvers cleanly."
difficulty: intermediate
topics:
  - api
tags:
  - graphql
  - api
  - typescript
  - nodejs
relatedResources:
  - /patterns/design/adapter-pattern-api
  - /recipes/api/call-rest-api
  - /guides/api-design-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build a GraphQL API with Apollo Server and TypeScript. Use DataLoader for N+1 queries, implement authentication, and structure resolvers cleanly."
  keywords:
    - graphql
    - apollo server
    - typescript
    - dataloader
    - api design
---

# Build a GraphQL API with Apollo Server and TypeScript

GraphQL allows clients to request exactly the data they need in a single query. Apollo Server provides a production-ready framework for building GraphQL APIs with schema-first development, built-in subscription support, and a rich plugin ecosystem.

## When to Use This

- Clients need flexible queries over a complex domain model
- You want to reduce over-fetching and under-fetching common in REST APIs
- Real-time updates via subscriptions are a requirement

## Prerequisites

- Node.js 18+
- Basic understanding of GraphQL schema syntax

## Solution

### 1. Install Dependencies

```bash
npm install @apollo/server graphql graphql-tag
npm install -D @types/node typescript
```

### 2. Define the Schema

```typescript
// schema.ts
import gql from 'graphql-tag';

export const typeDefs = gql`
  type User {
    id: ID!
    email: String!
    name: String!
    posts: [Post!]!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    author: User!
  }

  type Query {
    user(id: ID!): User
    users(limit: Int = 10): [User!]!
    posts: [Post!]!
  }

  type Mutation {
    createPost(title: String!, content: String!, authorId: ID!): Post!
  }
`;
```

### 3. Implement Resolvers with DataLoader

```typescript
// resolvers.ts
import DataLoader from 'dataloader';

// Batch load users by ID to solve N+1
const createUserLoader = (db: DbConnection) =>
  new DataLoader(async (userIds: readonly string[]) => {
    const users = await db.users.findMany({ where: { id: { in: [...userIds] } } });
    return userIds.map(id => users.find(u => u.id === id));
  });

export const createResolvers = (db: DbConnection) => {
  const userLoader = createUserLoader(db);

  return {
    Query: {
      user: (_: unknown, { id }: { id: string }) => db.users.findById(id),
      users: (_: unknown, { limit }: { limit: number }) =>
        db.users.findMany({ take: limit }),
      posts: () => db.posts.findMany(),
    },

    Mutation: {
      createPost: (_: unknown, args: { title: string; content: string; authorId: string }) =>
        db.posts.create(args),
    },

    Post: {
      author: (post: Post) => userLoader.load(post.authorId),
    },

    User: {
      posts: (user: User) => db.posts.findMany({ where: { authorId: user.id } }),
    },
  };
};
```

### 4. Create the Server

```typescript
// server.ts
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './schema';
import { createResolvers } from './resolvers';
import { db } from './db';

const server = new ApolloServer({
  typeDefs,
  resolvers: createResolvers(db),
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = token ? await verifyToken(token) : null;
    return { user, db };
  },
});

console.log(`Server ready at ${url}`);
```

### 5. Authentication Middleware

```typescript
// auth.ts
export const authDirective = (schema: GraphQLSchema) =>
  mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const authDirective = getDirective(schema, fieldConfig, 'auth')?.[0];
      if (authDirective) {
        const { resolve = defaultFieldResolver } = fieldConfig;
        fieldConfig.resolve = (source, args, context, info) => {
          if (!context.user) throw new Error('Unauthorized');
          return resolve(source, args, context, info);
        };
      }
      return fieldConfig;
    },
  });
```

## How It Works

1. **Schema Definition** serves as the contract between client and server
2. **Resolvers** fetch data for each field, composable and testable independently
3. **DataLoader** batches requests across a single tick of the event loop
4. **Context** carries authentication and database connections per request

## Production Considerations

- Use **Apollo Federation** to compose multiple GraphQL services into a unified gateway
- Enable **response caching** with `@cacheControl` directives for GET queries
- Implement **rate limiting** per operation complexity, not just request count
- Add **operation safelisting** to prevent arbitrary expensive queries in production

## FAQ

**Q: Should I use Apollo Server or GraphQL Yoga?**
A: Apollo Server has the largest ecosystem. Yoga is lighter and faster for simple use cases. Both are production-ready.

**Q: How do I handle file uploads in GraphQL?**
A: Use `graphql-upload-minimal` with multipart requests, or prefer a separate REST endpoint for large files.

**Q: When should I avoid GraphQL?**
A: For simple CRUD with few relationships, REST is often simpler. GraphQL shines when clients need flexible queries over complex graphs.
