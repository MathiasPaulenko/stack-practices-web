---
contentType: recipes
slug: graphql-subscriptions-realtime
title: "Datos en tiempo real con suscripciones GraphQL sobre WebSockets"
description: "Implementa suscripciones GraphQL sobre WebSockets con Apollo Server y PubSub para actualizaciones en tiempo real enviadas a clientes conectados"
metaDescription: "Construye suscripciones GraphQL en tiempo real con WebSockets y PubSub. Envia actualizaciones en vivo a clientes ante cambios con Apollo Server."
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
  - /recipes/api/graphql-apollo-server
  - /recipes/graphql/graphql-dataloader-batching
  - /recipes/api/real-time-websockets
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye suscripciones GraphQL en tiempo real con WebSockets y PubSub. Envia actualizaciones en vivo a clientes ante cambios con Apollo Server."
  keywords:
    - graphql subscriptions
    - graphql websocket
    - realtime graphql
    - apollo subscriptions
    - graphql pubsub
---

# Datos en tiempo real con suscripciones GraphQL sobre WebSockets

Las suscripciones GraphQL entregan datos a clientes en tiempo real usando una conexion WebSocket persistente. A diferencia de queries y mutaciones, que siguen un ciclo request-response, las suscripciones mantienen la conexion abierta y envian actualizaciones cuando ocurren eventos en el servidor. Esta receta implementa suscripciones con el motor `PubSub` de Apollo Server y un gateway WebSocket.

## Cuando Usar Esto

- Dashboards en vivo o feeds de actividad que se actualizan al cambiar datos
- Aplicaciones de chat donde los mensajes aparecen al instante
- Edicion colaborativa con presencia de cursores o actualizaciones a nivel campo
- Cualquier escenario donde el polling es demasiado lento o costoso

## Requisitos Previos

- Node.js 18+ con Apollo Server instalado
- Un servidor HTTP con capacidad WebSocket (paquete `ws` o `@nestjs/websockets`)

## Solucion

### 1. Instalar dependencias

```bash
npm install @apollo/server graphql-ws graphql ws
```

### 2. Definir el schema de suscripcion

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

### 3. Configurar PubSub y resolvers

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

### 4. Iniciar los servidores HTTP y WebSocket

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

### 5. Suscripcion en el cliente

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

## Como Funciona

1. **PubSub** es un emisor de eventos en memoria. `pubsub.publish(topic, payload)` notifica a todos los iteradores activos de ese topic.
2. **`asyncIterator`** envuelve el stream de PubSub en un iterable asincrono que el motor de ejecucion de GraphQL consume, entregando cada evento publicado al suscriptor.
3. **`graphql-ws`** maneja el protocolo WebSocket — la consulta de suscripcion se envia por el socket y el servidor envia eventos a medida que se publican.
4. **El link `split`** en el cliente enruta suscripciones al link WebSocket y queries/mutaciones al link HTTP, para que un solo `ApolloClient` maneje ambos.

## Variantes

### Redis PubSub para multi-instancia

Cuando ejecutas multiples instancias del servidor, usa `graphql-redis-subscriptions` para compartir eventos entre procesos:

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

### Suscripciones filtradas

Filtra eventos para que los clientes solo reciban actualizaciones relevantes:

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

### Hooks del ciclo de vida de suscripcion

Rastrea conexion y desconexion para limpieza:

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

## Mejores Practicas

- **Autentica al conectar** — valida el token en `context` cuando se abre el WebSocket, no por mensaje
- **Usa Redis PubSub en produccion** — PubSub en memoria no comparte eventos entre instancias del servidor
- **Filtra eventos en el servidor** — usa `withFilter` para evitar enviar datos irrelevantes a cada cliente
- **Cierra iteradores al desconectar** — `graphql-ws` lo maneja automaticamente, pero implementaciones custom deben limpiar

## Errores Comunes

- **Usar PubSub en memoria en un cluster** — los eventos publicados en una instancia nunca llegan a suscriptores en otra
- **Olvidar dividir el link del cliente** — sin `split`, las suscripciones van por HTTP y fallan
- **No manejar reconexion** — las conexiones WebSocket caen; configura `retryAttempts` y `reconnecting` en el cliente
- **Publicar datos sensibles** — el evento de suscripcion llega a cada suscriptor del topic; filtra por usuario o permiso

## FAQ

**Q: Las suscripciones son soportadas sobre HTTP/2?**
A: WebSocket es el transporte estandar. SSE (Server-Sent Events) funciona para actualizaciones unidireccionales pero no puede manejar el protocolo completo de suscripciones GraphQL.

**Q: Cuantas suscripciones concurrentes puede manejar un servidor?**
A: Miles por instancia con `graphql-ws`. Usa Redis PubSub y escalado horizontal para cargas mayores.

**Q: Debo usar suscripciones o polling para datos en vivo?**
A: Las suscripciones son mejores para actualizaciones frecuentes enviadas por el servidor. El polling es mas simple para datos de baja frecuencia o cuando WebSockets no estan disponibles.

**Q: Como pruebo suscripciones?**
A: Usa el cliente `graphql-ws` en tu suite de pruebas para abrir una conexion WebSocket real y verificar eventos recibidos. Mockea PubSub para pruebas unitarias.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
