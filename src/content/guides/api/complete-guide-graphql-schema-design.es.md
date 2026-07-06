---
contentType: guides
slug: complete-guide-graphql-schema-design
title: "Guía Completa de Diseño de Esquemas GraphQL"
description: "Disenar esquemas GraphQL para evolucion, rendimiento y mantenibilidad. Cubre diseno de tipos, conexiones, mutaciones, manejo de errores, deprecation y workflows schema-first vs code-first."
metaDescription: "Guia completa de diseno de esquemas GraphQL. Aprende diseno de tipos, conexiones, mutaciones, manejo de errores, deprecation y schema-first vs code-first."
difficulty: advanced
topics:
  - graphql
  - api
  - architecture
tags:
  - graphql
  - schema-design
  - api-design
  - guia
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
  metaDescription: "Guia completa de diseno de esquemas GraphQL. Aprende diseno de tipos, conexiones, mutaciones, manejo de errores, deprecation y schema-first vs code-first."
  keywords:
    - diseno esquema graphql
    - graphql tipos
    - graphql mutaciones
    - graphql conexiones
    - schema-first graphql
    - graphql deprecation
    - graphql manejo errores
---

## Introducción

Un esquema GraphQL es el contrato entre tu API y sus clientes. Un esquema bien disenado es facil de entender, dificil de usar mal, y evoluciona sin romper clientes existentes. Un esquema mal disenado lleva a queries confusas, problemas de rendimiento N+1, y migraciones dolorosas. A continuacion se cubre los principios y patrones para disenar esquemas GraphQL que se mantienen en el tiempo.

## Schema-First vs Code-First

Existen dos enfoques para definir un esquema GraphQL. Ambos producen el mismo resultado, pero el workflow difiere.

### Schema-First

Escribes archivos `.graphql` con definiciones de tipos a mano. Generadores de codigo producen tipos y boilerplate para tus resolvers.

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

Ventajas: El esquema es la fuente unica de verdad. Disenadores y desarrolladores frontend pueden revisar el esquema antes de que se escriba codigo backend. La generacion de codigo asegura que los resolvers coincidan con el esquema.

Desventajas: Mantienes dos fuentes de verdad (archivo de esquema + codigo de resolver). Las herramientas de generacion de codigo anaden complejidad al build.

### Code-First

Defines tipos en tu lenguaje de programacion. Una libreria construye el esquema desde tus definiciones de tipo.

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

Ventajas: Fuente unica de verdad en tu codebase. Type safety a traves de resolvers. Sin paso de generacion de codigo.

Desventajas: El diseno del esquema se mezcla con la implementacion. Los desarrolladores frontend no pueden revisar el esquema sin leer codigo backend.

### Cuál Elegir

Usa schema-first cuando un disenador de API dedicado o equipo frontend necesita revisar el esquema antes de la implementacion. Usa code-first cuando el equipo backend es dueno del esquema y quiere integracion de tipos mas estrecha con el codebase. Ambos enfoques producen esquemas equivalentes.

## Principios de Diseño de Tipos

### Nombrar con Sustantivos, No Verbos

Los tipos representan entidades, no acciones. Nombralos despues del concepto de dominio.

```graphql
# Bien
type User { ... }
type Product { ... }
type Order { ... }

# Mal: verbos como nombres de tipo
type GetUser { ... }
type CreateOrder { ... }
```

### Usar Non-Null por Defecto

Marca campos como non-null (`!`) cuando siempre deben tener un valor. Marcalos como nullable solo cuando el campo puede legtimamente estar ausente.

```graphql
type User {
  id: ID!           # Siempre presente
  name: String!     # Siempre presente
  email: String     # Puede ser null si el usuario no ha seteado email
  deletedAt: DateTime  # Null hasta que se elimine
}
```

Cuando el resolver de un campo non-null lanza una excepcion, el error se propaga y nullifica el padre nullable mas cercano. Por eso debes evitar non-null en campos que dependen de servicios externos: un fallo downstream nullifica el objeto entero.

### Usar Enums para Valores Fijos

Los enums son auto-documentados y type-safe. Usalos en lugar de strings para valores con un conjunto fijo de opciones.

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

### Usar Interfaces para Campos Compartidos

Cuando multiples tipos comparten campos, define una interfaz. Esto habilita queries polimorficas y reduce duplicacion.

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

Los clientes pueden consultar campos compartidos sin conocer el tipo concreto:

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

## Paginación con Connections

Las listas deberian usar el patron Relay Connection para paginacion consistente. Esto da a los clientes cursores, conteos totales, y metadata sobre si existen mas items.

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

Query del cliente:

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

La paginacion offset (`limit` + `offset`) es simple pero se rompe cuando se insertan o eliminan items entre paginas. La paginacion cursor usa un cursor opaco (tipicamente un ID o timestamp codificado) y es estable bajo inserciones y eliminaciones.

Usa offset para dashboards admin donde los numeros de pagina exactos importan. Usa cursor para feeds, listas, e infinite scroll donde la estabilidad importa mas que los numeros de pagina.

## Diseño de Mutaciones

### Una Mutación por Acción

Cada mutacion representa una operacion de negocio. No crees mutaciones genericas "upsert" que intenten manejar create y update con logica condicional.

```graphql
# Bien: mutaciones separadas
type Mutation {
  createUser(input: CreateUserInput!): CreateUserPayload!
  updateUser(input: UpdateUserInput!): UpdateUserPayload!
  deleteUser(input: DeleteUserInput!): DeleteUserPayload!
}

# Mal: upsert ambiguo
type Mutation {
  upsertUser(input: UpsertUserInput!): UpsertUserPayload!
}
```

### Input Types para Argumentos

Las mutaciones deberian aceptar un solo argumento `input`. Esto facilita anadir campos sin romper clientes existentes y mantiene la firma de la mutacion limpia.

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

### Payload Types con Errores

Cada mutacion deberia retornar un payload type con el resultado y una lista de errores. Esto permite a los clientes manejar errores estructuralmente en lugar de parsear mensajes de error.

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

### Nomenclatura de Mutaciones

Nombra mutaciones como verbos en pasado para el payload e imperativo para la operacion. Esto deja claro que paso.

```graphql
type Mutation {
  createUser(input: CreateUserInput!): CreateUserPayload!
  updateUser(input: UpdateUserInput!): UpdateUserPayload!
  deleteUser(input: DeleteUserInput!): DeleteUserPayload!
  sendPasswordResetEmail(input: SendPasswordResetEmailInput!): SendPasswordResetEmailPayload!
}
```

## Manejo de Errores

Los errores de GraphQL vienen en dos tipos: errores a nivel de transporte (red, parsing) y errores a nivel de campo (resolver lanzo excepcion). El array `errors` en la respuesta contiene ambos.

### Errores Estructurados en Payloads

Para errores esperados (validacion, no encontrado, no autorizado), retornalos en el payload. No lances excepciones. Lanzar pone el error en el array `errors`, que es mas dificil de manejar programaticamente.

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

### Lanzar para Errores Inesperados

Para errores inesperados (base de datos caida, bugs internos), deja que el error se propague. El runtime de GraphQL lo captura, nullifica el campo, y anade una entrada al array `errors`. Registra el error completo server-side; envia un mensaje generico al cliente.

## Evolución del Esquema

### Agregar Campos (Non-Breaking)

Agregar un campo nuevo a un tipo existente es non-breaking. Los clientes existentes ignoran el campo nuevo. Los clientes nuevos pueden optar por usarlo.

```graphql
# v1
type User {
  id: ID!
  name: String!
  email: String!
}

# v2: agregar avatarUrl (non-breaking)
type User {
  id: ID!
  name: String!
  email: String!
  avatarUrl: String
}
```

### Eliminar Campos (Breaking)

Eliminar un campo rompe cualquier cliente que lo consulta. Usa deprecation en su lugar.

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  # Deprecated: usar avatarUrl en su lugar
  avatar: String @deprecated(reason: "Use avatarUrl. Removed in v3.")
  avatarUrl: String
}
```

Rastrea el uso de campos para saber cuando todos los clientes han migrado. Una vez que ningun cliente consulta el campo deprecado, eliminalo en la siguiente version major.

### Mejores Prácticas de Deprecation

- Siempre proporciona un `reason` en la directiva `@deprecated`
- Documenta el campo o mutacion de reemplazo
- Monitorea el uso de campos via metricas de GraphQL (DataLoader, Apollo Studio)
- Establece una fecha de eliminacion para crear urgencia de migracion
- Nunca deprecates un campo sin proporcionar una alternativa

## Prevención de N+1

El problema N+1 ocurre cuando un resolver de campo de lista hace una query de base de datos por item. Para una lista de 100 usuarios, obtener los posts de cada usuario resulta en 101 queries (1 para usuarios + 100 para posts).

### DataLoader

DataLoader agrupa cargas individuales en una sola query. En lugar de 100 queries para posts, hace una query con `WHERE authorId IN (1, 2, 3, ..., 100)`.

```typescript
import DataLoader from "dataloader";

const postsLoader = new DataLoader(async (userIds: number[]) => {
  const posts = await db.posts.findMany({ where: { authorId: { in: userIds } } });
  // Agrupar posts por authorId
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

### Batching a Nivel de Campo

Si controlas la query, puedes hacer batch a nivel de resolver sin DataLoader:

```typescript
const resolvers = {
  Query: {
    users: async (_root, { limit, offset }, ctx) => {
      const users = await ctx.db.users.findMany({ take: limit, skip: offset });
      // Pre-fetchear todos los posts para estos usuarios en una query
      const userIds = users.map((u) => u.id);
      const allPosts = await ctx.db.posts.findMany({ where: { authorId: { in: userIds } } });
      // Adjuntar posts a usuarios
      for (const user of users) {
        user.posts = allPosts.filter((p) => p.authorId === user.id);
      }
      return users;
    },
  },
};
```

## Validación y Linting de Esquemas

Usa herramientas para enforcear calidad del esquema:

- **graphql-schema-linter**: Linteza esquemas para convenciones de naming, politicas de deprecation, y estructura
- **Apollo Studio**: Proporciona analiticas de esquema, uso de campos, y metricas de rendimiento
- **graphql-inspector**: Detecta breaking changes entre versiones de esquema

Reglas de ejemplo para `graphql-schema-linter`:

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

## Checklist para Review de Esquema

Antes de publicar un cambio de esquema, verifica:

- [ ] Todos los tipos y campos tienen descripciones
- [ ] Non-null se usa correctamente (no en campos que dependen de servicios externos)
- [ ] Las listas usan el patron Connection para paginacion
- [ ] Las mutaciones usan input types y retornan payload types con errores
- [ ] Se usan enums para campos de valor fijo en lugar de strings
- [ ] Se usan interfaces para campos compartidos entre tipos
- [ ] Los campos deprecados tienen una razon y un reemplazo
- [ ] No hay resolvers N+1 (usa DataLoader o batch loading)
- [ ] El esquema pasa las reglas del linter
- [ ] No hay breaking changes (o documentados en guia de migracion)

## Preguntas Frecuentes

### ¿Debería usar campos nullable o non-null?

Por defecto non-null para campos que siempre tienen un valor (id, name, createdAt). Usa nullable para campos que pueden estar ausentes (email, avatarUrl, deletedAt). Evita non-null en campos resueltos por servicios externos: un fallo downstream nullifica el objeto entero.

### ¿Cómo manejo autenticación en el esquema?

No pongas auth en el esquema. La autenticacion se maneja en el contexto o capa de middleware. El resolver verifica `ctx.user` y lanza `UNAUTHORIZED` si el usuario no esta autenticado. El esquema se mantiene limpio de concerns de auth.

### ¿Debería exponer campos calculados?

Si. Los campos calculados (fullName de firstName + lastName, orderTotal de line items) son utiles para clientes y mantienen la logica de negocio server-side. Documentalos como calculados para que los clientes sepan que no necesitan calcularlos localmente.

### ¿Cómo versiono mi esquema GraphQL?

GraphQL no usa versionado por URL como REST. En su lugar, evoluciona el esquema agregando campos y deprecando los viejos. Rastrea el uso de campos y elimina los deprecados cuando ningun cliente los usa. Para breaking changes mayores, ejecuta dos esquemas en paralelo durante la migracion.

### ¿Cuál es la diferencia entre interfaces y unions?

Las interfaces definen campos compartidos que los tipos implementadores deben tener. Los unions definen un conjunto de tipos sin campos compartidos. Usa interfaces cuando los tipos comparten campos (Node con id). Usa unions cuando los tipos no estan relacionados pero pueden aparecer en el mismo campo (SearchResult = User | Post | Product).

### ¿Debería usar custom scalars?

Usa custom scalars para tipos especificos de dominio que necesitan validacion (DateTime, Email, URL, UUID). No uses custom scalars para todo: los scalars estandar (String, Int, Boolean) son mas claros para valores simples. Los custom scalars deberian tener reglas claras de serializacion y parsing.
