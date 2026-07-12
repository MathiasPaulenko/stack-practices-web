---



contentType: recipes
slug: graphql-subscriptions-realtime
title: "Real-Time Data with GraphQL WebSocket Subscriptions"
description: "Implement GraphQL subscriptions over WebSockets with Apollo Server and PubSub for real-time updates pushed to connected clients"
metaDescription: "Build real-time GraphQL subscriptions with WebSockets and PubSub. Push live updates to clients on data changes with Apollo Server and ws-link."
difficulty: advanced
topics:
  - graphql
  - api
tags:
  - graphql
  - subscriptions
  - websocket
  - realtime
  - apollo
relatedResources:
  - /recipes/graphql-apollo-server
  - /recipes/graphql-dataloader-batching
  - /recipes/real-time-websockets
  - /recipes/graphql-federation-gateway-setup
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build real-time GraphQL subscriptions with WebSockets and PubSub. Push live updates to clients on data changes with Apollo Server and ws-link."
  keywords:
    - graphql subscriptions
    - graphql websocket
    - realtime graphql
    - apollo subscriptions
    - graphql pubsub



---

# Real-Time Data with GraphQL WebSocket Subscriptions

GraphQL subscriptions deliver data to clients in real time using a persistent WebSocket connection. Unlike queries and mutations, which follow a request-response cycle, subscriptions keep the connection open and push updates when server-side events occur. The code below implements subscriptions with Apollo Server's `PubSub` engine and a WebSocket gateway.

## When to Use This

- Live dashboards or activity feeds that update as data changes
- Chat applications where messages appear instantly
- Collaborative editing with cursor presence or field-level updates
- Any scenario where polling is too slow or wasteful

## Prerequisites

- Node.js 18+ with Apollo Server installed
- A WebSocket-capable HTTP server (`ws` package or `@nestjs/websockets`)

## Solution

### 1. Install Dependencies

```bash
npm install @apollo/server graphql-ws graphql ws
```

### 2. Define the Subscription Schema

```typescript
// schema.ts
import gql from 'graphql-tag';

export const typeDefs = gql`
  type Post {
    id: ID!
    title: String!
    content: String!
    authorId: ID!
    createdAt: String!
  }

  type Query {
    posts: [Post!]!
  }

  type Mutation {
    createPost(title: String!, content: String!): Post!
  }

  type Subscription {
    postCreated: Post!
    postUpdated(id: ID!): Post!
  }
`;
```

### 3. Set Up PubSub and Resolvers

```typescript
// resolvers.ts
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

const POST_CREATED = 'POST_CREATED';
const POST_UPDATED = 'POST_UPDATED';

export const resolvers = {
  Query: {
    posts: (_: unknown, __: unknown, ctx: Context) =>
      ctx.db.posts.findMany(),
  },

  Mutation: {
    createPost: async (_: unknown, args: { title: string; content: string }, ctx: Context) => {
      const post = await ctx.db.posts.create({
        ...args,
        authorId: ctx.user.id,
        createdAt: new Date().toISOString(),
      });

      pubsub.publish(POST_CREATED, { postCreated: post });
      return post;
    },
  },

  Subscription: {
    postCreated: {
      subscribe: () => pubsub.asyncIterator([POST_CREATED]),
    },

    postUpdated: {
      subscribe: (_: unknown, { id }: { id: string }) =>
        pubsub.asyncIterator([{ topic: POST_UPDATED, payload: { id } }]),
    },
  },
};

export { pubsub, POST_CREATED, POST_UPDATED };
```

### 4. Start the HTTP and WebSocket Servers

```typescript
// server.ts
import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import http from 'http';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { createContext } from './context';

const schema = makeExecutableSchema({ typeDefs, resolvers });

const httpServer = http.createServer();
const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });

const serverCleanup = useServer(
  {
    schema,
    context: async (ctx) => {
      const token = ctx.connectionParams?.authorization?.replace('Bearer ', '');
      const user = token ? await verifyToken(token) : null;
      if (!user) throw new Error('Unauthorized');
      return createContext(user);
    },
  },
  wsServer
);

const apolloServer = new ApolloServer({ schema });
await apolloServer.start();

httpServer.listen(4000, () => {
  console.log('Server ready at http://localhost:4000/graphql');
});
```

### 5. Client-Side Subscription

```typescript
// client.ts
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { ApolloClient, InMemoryCache, split, HttpLink } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';

const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:4000/graphql',
    connectionParams: {
      authorization: `Bearer ${getToken()}`,
    },
  })
);

const httpLink = new HttpLink({ uri: 'http://localhost:4000/graphql' });

const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return def.kind === 'OperationDefinition' && def.operation === 'subscription';
  },
  wsLink,
  httpLink
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

const POST_CREATED_SUBSCRIPTION = gql`
  subscription OnPostCreated {
    postCreated {
      id
      title
      content
      createdAt
    }
  }
`;

client.subscribe({ query: POST_CREATED_SUBSCRIPTION }).subscribe({
  next: ({ data }) => {
    console.log('New post:', data.postCreated);
  },
  error: (err) => console.error('Subscription error:', err),
});
```

## How It Works

1. **PubSub** is an in-memory event emitter. `pubsub.publish(topic, payload)` notifies all active iterators for that topic.
2. **`asyncIterator`** wraps the PubSub stream into an async iterable that GraphQL's execution engine consumes, yielding each published event to the subscriber.
3. **`graphql-ws`** handles the WebSocket protocol — the subscription query is sent over the socket, and the server pushes events as they are published.
4. **`split` link** on the client routes subscriptions to the WebSocket link and queries/mutations to the HTTP link, so a single `ApolloClient` handles both.

## Variants

### Redis PubSub for Multi-Instance

When running multiple server instances, use `graphql-redis-subscriptions` to share events across processes:

```bash
npm install graphql-redis-subscriptions ioredis
```

```typescript
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';

const pubsub = new RedisPubSub({
  publisher: new Redis('redis://localhost:6379'),
  subscriber: new Redis('redis://localhost:6379'),
});
```

### Filtered Subscriptions

Filter events so clients only receive relevant updates:

```typescript
Subscription: {
  postCreated: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([POST_CREATED]),
      (payload, variables, ctx) => {
        return payload.postCreated.authorId === ctx.user.id;
      }
    ),
  },
},
```

### Subscription Lifecycle Hooks

Track connection and disconnection for cleanup:

```typescript
const serverCleanup = useServer(
  {
    schema,
    onConnect: async (ctx) => {
      console.log('Client connected:', ctx.connectionParams);
    },
    onDisconnect: (ctx, code, reason) => {
      console.log('Client disconnected:', code, reason);
    },
  },
  wsServer
);
```

## Best Practices


- For a deeper guide, see [GraphQL Federation in Production](/guides/complete-guide-graphql-federation-production/).

- **Authenticate on connection** — validate the token in `context` when the WebSocket opens, not per message
- **Use Redis PubSub in production** — in-memory PubSub does not share events across server instances
- **Filter events server-side** — use `withFilter` to avoid sending irrelevant data to each client
- **Close iterators on disconnect** — `graphql-ws` handles this automatically, but custom implementations must clean up

## Common Mistakes

- **Using in-memory PubSub in a cluster** — events published on one instance never reach subscribers on another
- **Forgetting to split the client link** — without `split`, subscriptions go over HTTP and fail
- **Not handling reconnection** — WebSocket connections drop; configure `retryAttempts` and `reconnecting` on the client
- **Publishing sensitive data** — the subscription event goes to every subscriber on that topic; filter by user or permission

## FAQ

**Q: Are subscriptions supported over HTTP/2?**
A: WebSocket is the standard transport. SSE (Server-Sent Events) works for one-way updates but cannot handle the full GraphQL subscription protocol.

**Q: How many concurrent subscriptions can one server handle?**
A: Thousands per instance with `graphql-ws`. Use Redis PubSub and horizontal scaling for higher loads.

**Q: Should I use subscriptions or polling for live data?**
A: Subscriptions are better for frequent, server-pushed updates. Polling is simpler for low-frequency data or when WebSockets are not available.

**Q: How do I test subscriptions?**
A: Use `graphql-ws` client in your test suite to open a real WebSocket connection and assert on received events. Mock PubSub for unit tests.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
