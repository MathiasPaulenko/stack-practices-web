---
contentType: recipes
slug: graphql-mocking-apollo-server
title: "Mocks de resolvers GraphQL para desarrollo frontend"
description: "Configura resolvers GraphQL mockeados con Apollo Server para que los equipos frontend desarrollen contra una API falsa antes del backend."
metaDescription: "Mockea resolvers GraphQL con Apollo Server para desarrollo frontend. Genera datos falsos, preserva tipos y desbloquea el trabajo de UI."
difficulty: beginner
topics:
  - graphql
  - api
  - testing
tags:
  - graphql
  - mocking
  - apollo
  - frontend
  - testing
  - resolvers
relatedResources:
  - /recipes/graphql-apollo-server
  - /recipes/api-mocking
  - /recipes/graphql-error-handling-best-practices
  - /guides/complete-guide-graphql-testing
  - /guides/complete-guide-graphql-federation-production
  - /guides/complete-guide-graphql-federation
lastUpdated: "2026-08-19"
publishedAt: "2026-07-03"
author: Mathias Paulenko
seo:
  metaDescription: "Mockea resolvers GraphQL con Apollo Server para desarrollo frontend. Genera datos falsos, preserva tipos y desbloquea el trabajo de UI."
  keywords:
    - graphql mocking
    - apollo server mock
    - graphql fake data
    - frontend development
    - graphql testing
---

## Resumen

Cuando el backend no está listo, los equipos frontend pueden bloquearse por dependencias de API. El
mocking integrado de Apollo Server genera datos falsos para cada campo del schema, permitiendo a los
desarrolladores de UI construir y probar contra un endpoint GraphQL funcional en minutos. Podés
empezar con mocks auto-generados y reemplazarlos progresivamente con resolvers personalizados
conforme el schema se estabiliza.

## Cuándo Usarlo

- Los equipos frontend y backend trabajan en paralelo en una feature nueva.
- Necesitás una API GraphQL corriendo para demos o prototipos.
- Testeás componentes de UI contra shapes de datos realistas.
- Querés simular estados de error antes de que el servicio real esté disponible.

## Cuándo NO Usarlo

- El backend está disponible y necesitás validación de contrato end-to-end — usá
  [Integration Testing](/es/recipes/integration-testing/).
- Necesitás mockear HTTP a nivel de browser sin un servidor — usá
  [MSW](/es/recipes/api-mocking/).
- El schema cambia rápidamente — los mocks pueden ocultar breaking changes del schema.

## Solución

### Habilitar mocking integrado

```typescript
// mock-server.ts
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    author: User!
    publishedAt: String!
  }

  type Query {
    users: [User!]!
    user(id: ID!): User
    posts: [Post!]!
  }
`;

const server = new ApolloServer({
  typeDefs,
  mocks: true,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`Mock server ready at ${url}`);
```

Apollo genera valores automáticamente según el tipo escalar: strings aleatorios para `String`,
números incrementales para `Int` e `ID`, y timestamps ISO para campos con nombres de fechas.

### Personalizar mocks con escalares

```typescript
import { ApolloServer } from '@apollo/server';

const mocks = {
  ID: () => crypto.randomUUID(),
  String: () => 'Lorem ipsum',
  Int: () => Math.floor(Math.random() * 1000),
  Boolean: () => Math.random() > 0.5,
};

const server = new ApolloServer({
  typeDefs,
  mocks,
});
```

### Mockear tipos y campos específicos

```typescript
const mocks = {
  User: () => ({
    id: () => crypto.randomUUID(),
    name: () => faker.person.fullName(),
    email: () => faker.internet.email(),
    role: () => faker.helpers.arrayElement(['admin', 'editor', 'viewer']),
  }),

  Post: () => ({
    id: () => crypto.randomUUID(),
    title: () => faker.lorem.sentence(),
    content: () => faker.lorem.paragraphs(3),
    publishedAt: () => faker.date.recent().toISOString(),
  }),

  Query: () => ({
    users: () => Array.from({ length: 5 }, () => ({})),
    posts: () => Array.from({ length: 10 }, () => ({})),
  }),
};

const server = new ApolloServer({
  typeDefs,
  mocks,
});
```

### Alternar mocking por entorno

```typescript
const server = new ApolloServer({
  typeDefs,
  resolvers: process.env.NODE_ENV === 'production' ? realResolvers : undefined,
  mocks: process.env.MOCK_API === 'true',
});

// O combinar resolvers reales con fallback a mocks
const server = new ApolloServer({
  typeDefs,
  resolvers: realResolvers,
  mocks: process.env.NODE_ENV === 'development'
    ? { mocks, preserveResolvers: true }
    : false,
});
```

Con `preserveResolvers: true`, Apollo usa tus resolvers reales donde existen y recurre a mocks para
los campos no implementados.

## Explicación

1. **Auto-mocking**: inspecciona el schema y genera un valor por defecto para cada escalar — strings,
   números, booleanos y listas se completan automáticamente.
2. **Funciones de mock personalizadas**: sobreescriben los valores por defecto por tipo o escalar. Un
   mock de `User` devuelve un objeto con generadores a nivel de campo.
3. **`preserveResolvers`**: permite mezclar datos reales y mockeados. Los campos con resolver usan la
   implementación real; los que no, usan el mock.
4. **Integración con Faker**: produce datos realistas — nombres, emails, oraciones, fechas — para que
   la UI se vea y se comporte como con datos reales.

## Variantes

### Scalares y enums personalizados

Cuando tu schema usa escalares o enums personalizados, proveé funciones de mock explícitas:

```typescript
import { ApolloServer } from '@apollo/server';

const typeDefs = gql`
  enum Role {
    ADMIN
    EDITOR
    VIEWER
  }

  scalar Date

  type User {
    id: ID!
    name: String!
    role: Role!
    createdAt: Date!
  }
`;

const mocks = {
  Date: () => new Date().toISOString(),
  Role: () => faker.helpers.arrayElement(['ADMIN', 'EDITOR', 'VIEWER']),
  User: () => ({
    name: () => faker.person.fullName(),
    role: () => faker.helpers.arrayElement(['ADMIN', 'EDITOR', 'VIEWER']),
    createdAt: () => faker.date.past().toISOString(),
  }),
};

const server = new ApolloServer({
  typeDefs,
  mocks,
});
```

Sin mocks para escalares personalizados, Apollo devuelve `null` en esos campos, lo que puede romper
el frontend si espera un valor válido.

### Paginación con conexiones Relay

Para schemas que usan paginación por cursor estilo Relay, mockeá la estructura de conexión:

```typescript
const mocks = {
  Query: () => ({
    users: () => {
      const edges = Array.from({ length: 10 }, (_, i) => ({
        node: {
          id: `user-${i}`,
          name: faker.person.fullName(),
          email: faker.internet.email(),
        },
        cursor: `cursor-${i}`,
      }));
      return {
        edges,
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: 'cursor-0',
          endCursor: 'cursor-9',
        },
        totalCount: 100,
      };
    },
  }),
};
```

Esto permite testear infinite scroll, botones de "cargar más" y navegación basada en cursor sin un
backend real.

### Mock con MSW

Para mocking solo en el frontend sin un servidor corriendo, usá MSW con un handler GraphQL:

```typescript
import { graphql } from 'msw';

export const handlers = [
  graphql.query('GetUsers', (req, res, ctx) => {
    return res(
      ctx.data({
        users: Array.from({ length: 5 }, () => ({
          id: crypto.randomUUID(),
          name: faker.person.fullName(),
          email: faker.internet.email(),
        })),
      })
    );
  }),
];
```

### Mocks con seed para tests reproducibles

```typescript
import { faker } from '@faker-js/faker';

faker.seed(12345);

const mocks = {
  User: () => ({
    name: () => faker.person.fullName(),
    email: () => faker.internet.email(),
  }),
};
```

Con un seed fijo, cada inicio del servidor produce los mismos datos falsos — útil para snapshot
tests.

### Mock de errores

Simulá respuestas de error para testear el manejo de errores en la UI:

```typescript
const mocks = {
  Query: () => ({
    user: () => { throw new Error('User not found'); },
  }),
};

const server = new ApolloServer({
  typeDefs,
  mocks,
});
```

## Buenas Prácticas

- Usá datos realistas de `faker` para que las revisiones de UI sean más efectivas.
- Empezá con auto-mocks y luego personalizá los campos uno a uno conforme el schema se estabiliza.
- Usá `preserveResolvers` durante la migración para mantener resolvers reales para las partes ya
  construidas mientras mockeás el resto.
- Seteá `faker.seed()` en tests para que los snapshots sean determinísticos.
- Mockeá longitudes de listas que reflejen casos reales — un solo ítem no alcanza para testear
  paginación o estados vacíos.

## Errores Comunes

- Mockear con strings vacíos — la UI puede ocultar o colapsar valores vacíos, escondiendo bugs de
  layout.
- No mockear longitudes de listas — un mock de lista con un ítem no testea paginación o estados
  vacíos.
- Olvidar deshabilitar mocks en producción — usá variables de entorno para alternar el mocking.
- No testear estados de error — mockeá respuestas de error para verificar que la UI los maneja.
- Dejar que los mocks se separen de los resolvers reales — mantené los shapes de mock alineados con
  el schema productivo.

## Preguntas Frecuentes

### ¿Puedo mockear solo parte del schema?

Sí. Usá `preserveResolvers: true` y proveé resolvers reales para los campos implementados. Apollo
mockea solo los campos sin resolvers.

### ¿Cómo mockeo autenticación?

Mockeá el context para devolver un usuario falso, o evitá los controles de auth en modo mock.

### ¿Uso Apollo mocking o MSW?

Usá Apollo mocking cuando querés un servidor corriendo. Usá MSW cuando querés interceptación del lado
 del cliente sin un servidor.

### ¿Puedo mockear subscriptions?

El mocking integrado de Apollo no soporta subscriptions. Usá un PubSub personalizado con eventos
falsos para testear subscriptions.

### ¿Cómo mockeo scalares y enums personalizados?

Proveé funciones de mock para cada escalar y enum en el objeto `mocks`. Por ejemplo,
`Date: () => new Date().toISOString()` y `Role: () => faker.helpers.arrayElement(['ADMIN',
'EDITOR', 'VIEWER'])`. Sin esto, Apollo devuelve `null` en campos de scalares personalizados.

### ¿Cómo comparto mocks entre tests y el dev server?

Exportá el objeto `mocks` desde un módulo compartido. Importalo tanto en la configuración de tests
como en la del dev server. Eso asegura datos falsos consistentes entre tests y desarrollo. Usá
`faker.seed()` en tests para output determinístico.
