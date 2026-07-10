---
contentType: recipes
slug: graphql-mocking-apollo-server
title: "Mocks de resolvers GraphQL para desarrollo frontend"
description: "Configura resolvers GraphQL mockeados con Apollo Server para que los equipos frontend desarrollen contra una API falsa antes del backend"
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
relatedResources:
  - /recipes/api/graphql-apollo-server
  - /recipes/api/api-mocking
  - /recipes/graphql/graphql-error-handling-best-practices
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Mockea resolvers GraphQL con Apollo Server para desarrollo frontend. Genera datos falsos, preserva tipos y desbloquea el trabajo de UI."
  keywords:
    - graphql mocking
    - apollo server mock
    - graphql fake data
    - frontend development
    - graphql testing
---

# Mocks de resolvers GraphQL para desarrollo frontend

Cuando el backend no esta listo, los equipos frontend pueden bloquearse por dependencias de API. El mocking integrado de Apollo Server genera datos falsos para cada campo del schema, permitiendo a los desarrolladores de UI construir y probar contra un endpoint GraphQL funcional en minutos. Puedes empezar con mocks auto-generados y reemplazarlos progresivamente con resolvers personalizados conforme el schema se estabiliza.

## Cuando Usar Esto

- Equipos frontend y backend trabajan en paralelo en una nueva feature
- Necesitas una API GraphQL corriendo para demos o prototipado
- Pruebas de componentes UI contra formas de datos realistas

## Requisitos Previos

- Una instancia de Apollo Server con un schema definido
- `@apollo/server` y `graphql` instalados

## Solucion

### 1. Habilitar mocking integrado

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
  mock: true,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`Mock server ready at ${url}`);
```

Apollo auto-genera valores basados en tipos escalares: strings aleatorios para `String`, numeros incrementales para `Int`/`ID`, timestamps ISO para campos con nombres de fecha.

### 2. Personalizar mocks

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
  mock: { mocks },
});
```

### 3. Mockear tipos y campos especificos

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
  mock: { mocks },
});
```

### 4. Alternar mocking por entorno

```typescript
const server = new ApolloServer({
  typeDefs,
  resolvers: process.env.NODE_ENV === 'production' ? realResolvers : undefined,
  mock: process.env.MOCK_API === 'true',
});

// O combinar resolvers reales con fallback mock
const server = new ApolloServer({
  typeDefs,
  resolvers: realResolvers,
  mock: process.env.NODE_ENV === 'development'
    ? { mocks, preserveResolvers: true }
    : false,
});
```

Con `preserveResolvers: true`, Apollo usa tus resolvers reales donde existen y falla a mocks para campos no implementados.

## Como Funciona

1. **Auto-mocking** inspecciona el schema y genera un valor por defecto para cada escalar — strings, numeros, booleanos y listas se rellenan automaticamente.
2. **Funciones mock personalizadas** sobrescriben los defaults por tipo o escalar. Un mock de `User` retorna un objeto con generadores a nivel campo.
3. **`preserveResolvers`** permite mezclar datos reales y mockeados. Los campos con resolver usan la implementacion real; los que no tienen usan el mock.
4. **Integracion con Faker** produce datos realistas — nombres, emails, frases, fechas — para que la UI se vea y comporte como con datos reales.

## Avanzado: Mockear con Custom Scalars y Enums

Cuando tu schema usa custom scalars o enums, proporciona funciones mock para ellos explícitamente:

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
  mock: { mocks },
});
```

Sin mocks de custom scalars, Apollo retorna `null` para esos campos, lo que puede romper el frontend si espera un valor válido.

## Avanzado: Mockear Paginación con Relay Connections

Para schemas que usan paginación cursor estilo Relay, mockea la estructura de connection:

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

Esto permite al frontend probar infinite scroll, botones de load-more y navegación basada en cursor sin un backend real.

## Variantes

### Mock con MSW (Mock Service Worker)

Para mocking solo frontend sin servidor corriendo, usa MSW con un handler GraphQL:

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

### Mocks con seed para pruebas reproducibles

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

Con un seed fijo, cada inicio del servidor produce los mismos datos falsos — util para snapshot tests.

### Mock de errores

Simula respuestas de error para probar el manejo de errores en la UI:

```typescript
const server = new ApolloServer({
  typeDefs,
  mock: { mocks },
  formatError: () => ({
    message: 'Simulated server error',
    extensions: { code: 'MOCK_ERROR' },
  }),
});

// O lanzar en un resolver mock
const mocks = {
  Query: () => ({
    user: () => { throw new Error('User not found'); },
  }),
};
```

## Mejores Practicas

- **Usa datos realistas** — `faker` produce nombres, emails y fechas que parecen reales, haciendo las revisiones de UI mas efectivas
- **Empieza con auto-mocks, luego personaliza** — pon el servidor a correr con `mock: true` primero, luego reemplaza campos uno por uno
- **Usa `preserveResolvers` durante la migracion** — mantén resolvers reales para features implementadas mientras mockeas el resto
- **Sembriza faker en pruebas** — seeds fijos hacen los snapshot tests deterministicos

## Errores Comunes

- **Mockear con strings vacios** — la UI puede ocultar o colapsar valores vacios, escondiendo bugs de layout
- **No mockear longitudes de listas** — un mock de lista que retorna un item no prueba paginacion ni estados vacios
- **Olvidar deshabilitar mocks en produccion** — usa variables de entorno para alternar el mocking
- **No probar estados de error** — mockea respuestas de error para verificar que la UI los maneja

## FAQ

**Q: Puedo mockear solo parte del schema?**
A: Si. Usa `preserveResolvers: true` y proporciona resolvers reales para los campos implementados. Apollo mockea solo los campos sin resolver.

**Q: Como mockeo autenticacion?**
A: Mockea el context para retornar un usuario falso, o omite los checks de auth en modo mock.

**Q: Debo usar mocking de Apollo o MSW?**
A: Usa mocking de Apollo cuando quieras un servidor corriendo. Usa MSW cuando quieras intercepcion del lado del cliente sin servidor.

**Q: Puedo mockear suscripciones?**
A: El mocking integrado de Apollo no soporta suscripciones. Usa un PubSub personalizado con eventos falsos para pruebas de suscripciones.

### ¿Cómo mockeo custom scalars y enums?

Proporciona funciones mock para cada custom scalar y enum en el objeto `mocks`. Por ejemplo, `Date: () => new Date().toISOString()` y `Role: () => faker.helpers.arrayElement(['ADMIN', 'EDITOR', 'VIEWER'])`. Sin estos, Apollo retorna `null` para campos de custom scalar.

### ¿Puedo mockear paginación cursor estilo Relay?

Sí. Mockea los campos `edges`, `pageInfo` y `totalCount` en tu tipo connection. Retorna un array de objetos edge con propiedades `node` y `cursor`, y setea `hasNextPage` a `true` para probar el comportamiento de load-more en la UI.

### ¿Cómo comparto mocks entre tests y el dev server?

Exporta el objeto `mocks` desde un módulo compartido (e.g., `src/mocks/index.ts`). Impórtalo tanto en tu setup de tests como en la configuración del dev server. Esto asegura datos falsos consistentes entre entornos de test y desarrollo. Usa `faker.seed()` en tests para output determinístico.

**Q: Como mockeo errores y excepciones de GraphQL?**
R: Retorna una funcion mock que lanza un `GraphQLError` con el codigo apropiado. Por ejemplo, `getUser: () => { throw new GraphQLError('Not found', { extensions: { code: 'NOT_FOUND' } }) }`. Esto prueba como tu UI maneja errores de GraphQL.
