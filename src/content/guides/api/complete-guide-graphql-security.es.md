---
contentType: guides
slug: complete-guide-graphql-security
title: "Guía Completa de Seguridad GraphQL"
description: "Asegurar APIs GraphQL contra leaks de introspection, ataques de profundidad, DoS por costo, abuso de batching e inyeccion. Cubre patrones de auth, rate limiting y hardening de produccion."
metaDescription: "Asegurar APIs GraphQL contra introspection, ataques de profundidad, DoS por costo, abuso de batching e inyeccion. Cubre auth, rate limiting y hardening de produccion."
difficulty: advanced
topics:
  - graphql
  - security
  - api
tags:
  - graphql
  - security
  - guia
  - introspection
  - depth-limiting
  - cost-analysis
  - rate-limiting
  - authentication
relatedResources:
  - /guides/api/complete-guide-graphql-schema-design
  - /guides/architecture/graphql-vs-rest-guide
  - /patterns/design/graphql-interface-polymorphism-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Asegurar APIs GraphQL contra introspection, ataques de profundidad, DoS por costo, abuso de batching e inyeccion. Cubre auth, rate limiting y hardening de produccion."
  keywords:
    - seguridad graphql
    - graphql introspection
    - graphql depth limiting
    - graphql cost analysis
    - graphql rate limiting
    - graphql autenticacion
    - graphql dos proteccion
---

## Introducción

Las APIs GraphQL son poderosas para los clientes y peligrosas para los atacantes. Un solo endpoint acepta queries arbitrarias, lo que significa que el servidor debe defenderse contra queries profundamente anidadas, excesivamente complejas, o disenadas para extraer datos sensibles. Las APIs REST limitan la exposicion a traves de endpoints fijos; GraphQL expone el esquema completo y deja a los clientes construir cualquier query. Lo siguiente es una guia practica para la superficie de ataque y las defensas que necesitas en produccion.

## Superficie de Ataque

Las APIs GraphQL enfrentan estas amenazas principales:

- **Leaks de introspection**: El esquema revela todos los tipos, campos, y relaciones
- **Ataques de profundidad de query**: Queries profundamente anidadas causan llamadas recursivas a resolvers
- **DoS basado en costo**: Queries costosas (muchos campos, listas grandes) consumen recursos del servidor
- **Abuso de batching**: Los clientes envian muchas queries en una request para bypassar rate limits
- **Inyeccion**: Input del usuario pasado a resolvers llega a bases de datos o servicios externos
- **Divulgacion de informacion**: Mensajes de error revelan estructura interna o datos

## Control de Introspection

### Deshabilitar en Producción

Introspection deja a cualquiera descubrir tu esquema entero. En produccion, deshabilitalo.

```javascript
import { ApolloServer } from "@apollo/server";

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: false, // Deshabilitar en produccion
});
```

### Habilitar Solo para Usuarios Autorizados

Si necesitas introspection para herramientas internas, protejela detras de autenticacion.

```javascript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== "production",
  plugins: [
    {
      async requestDidForOperation(requestContext) {
        if (requestContext.operation?.operation === "query") {
          const query = requestContext.request.query || "";
          if (query.includes("__schema") || query.includes("__type") ) {
            const user = requestContext.contextValue.user;
            if (!user || user.role !== "ADMIN") {
              throw new Error("Introspection is disabled");
            }
          }
        }
      },
    },
  ],
});
```

### Persisted Queries como Alternativa

En lugar de exponer introspection, usa persisted queries. Los clientes envian un hash de query en lugar de la query completa. El servidor mapea el hash a una query pre-registrada. Los clientes nunca ven el esquema completo.

```javascript
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginCacheControl } from "@apollo/server/plugin/cacheControl";

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: false,
  allowBatchedHttpRequests: false,
});
```

## Limitación de Profundidad de Query

Una query como `user { posts { author { posts { author { ... } } } } }` puede recursar indefinidamente. Cada nivel dispara llamadas a resolvers y queries de base de datos. Limita la profundidad maxima.

```javascript
import depthLimit from "graphql-depth-limit";

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(10)], // Max 10 niveles de profundidad
});
```

### Elegir un Limite de Profundidad

Analiza tu esquema para determinar la profundidad legitima maxima. Un esquema tipico de e-commerce podria necesitar:

- `query { users { orders { items { product { category { name } } } } } }` = profundidad 6

Setea el limite a la profundidad legitima maxima mas un margen pequeno (ej., 10 para una profundidad legitima maxima de 7).

## Análisis de Costo de Query

Limitar la profundidad no es suficiente. Una query superficial con 100 campos o una lista con 1000 items puede ser costosa. El analisis de costo asigna un costo a cada campo y rechaza queries que exceden un presupuesto.

### Cálculo de Costo Estático

```javascript
import costAnalysis from "graphql-cost-analysis";

const costAnalyzer = costAnalysis({
  maximumCost: 1000,
  variables: {},
  createCost: 1,      // Costo de una mutacion create
  readCost: 1,        // Costo de leer un campo
  updateCost: 1,      // Costo de una mutacion update
  deleteCost: 1,      // Costo de una mutacion delete
  complexityCost: 2,  // Costo de un campo con argumentos
  listMultiplier: 10, // Multiplicador para campos de lista
  onSuccess: (cost) => console.log(`Query cost: ${cost}`),
  onError: (cost, maximumCost) => {
    throw new Error(`Query cost ${cost} exceeds maximum ${maximumCost}`);
  },
});

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [costAnalyzer],
});
```

### Directivas de Costo por Campo

Anota campos costosos con directivas de costo para que el analizador calcule con precision.

```graphql
type Query {
  users(first: Int = 10): [User!]! @cost(complexity: 2, multipliers: ["first"])
  search(term: String!, limit: Int = 20): [SearchResult!]! @cost(complexity: 5, multipliers: ["limit"])
  report(startDate: DateTime!, endDate: DateTime!): Report @cost(complexity: 50)
}
```

### Costo Dinámico con @listSize

Para conexiones relay, usa `@listSize` para estimar el numero de items retornados.

```graphql
type UserConnection {
  edges: [UserEdge!]! @cost(complexity: 1, multipliers: ["first"], useMultipliers: true)
}
```

## Rate Limiting

### Rate Limiting por Operación

Limita por nombre de operacion o hash de query, no solo por IP. Esto previene que un cliente inunde el servidor con diferentes queries.

```javascript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minuto
  max: 100,             // 100 requests por minuto por IP
  message: "Too many requests",
});

app.use("/graphql", limiter);
```

### Rate Limiting Consciente de Costo

Combina analisis de costo con rate limiting. Rastrea el costo total de queries por cliente, no solo el conteo. Un cliente que envia 10 queries baratas no deberia alcanzar el mismo limite que uno que envia 10 queries costosas.

```javascript
const clientCosts = new Map(); // clientId -> { cost, resetAt }

function checkCostBudget(clientId, queryCost) {
  const now = Date.now();
  let entry = clientCosts.get(clientId);
  
  if (!entry || entry.resetAt < now) {
    entry = { cost: 0, resetAt: now + 60000 }; // Ventana de 1 minuto
    clientCosts.set(clientId, entry);
  }
  
  if (entry.cost + queryCost > 5000) {
    throw new Error(`Cost budget exceeded: ${entry.cost + queryCost} > 5000`);
  }
  
  entry.cost += queryCost;
}
```

## Autenticación y Autorización

### Autenticación en Context

Autentica en la capa HTTP, no en el esquema. Extrae el usuario del request y ponlo en el context.

```javascript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return { user: null };
    
    const user = await verifyToken(token);
    return { user };
  },
});
```

### Autorización a Nivel de Campo

Verifica permisos en resolvers. No confies en que el cliente evite consultar campos sensibles.

```javascript
const resolvers = {
  User: {
    email: (user, _args, ctx) => {
      if (!ctx.user) throw new ForbiddenError("Not authenticated");
      if (ctx.user.id !== user.id && ctx.user.role !== "ADMIN") {
        throw new ForbiddenError("Not authorized to view email");
      }
      return user.email;
    },
    ssn: (user, _args, ctx) => {
      if (ctx.user?.role !== "ADMIN") {
        throw new ForbiddenError("SSN requires admin access");
      }
      return user.ssn;
    },
  },
};
```

### Directivas de Esquema para Autorización

Usa directivas custom para declarar roles requeridos en campos. Esto hace los permisos visibles en el esquema.

```graphql
type Query {
  adminDashboard: AdminDashboard @auth(requires: ADMIN)
  userSettings: UserSettings @auth(requires: USER)
}

directive @auth(requires: Role!) on FIELD_DEFINITION

enum Role {
  ADMIN
  USER
  GUEST
}
```

```javascript
const { SchemaDirectiveVisitor } = require("@graphql-tools/utils");
const { defaultFieldResolver } = require("graphql");

class AuthDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field) {
    const requiredRole = this.args.requires;
    const originalResolve = field.resolve || defaultFieldResolver;
    
    field.resolve = async (root, args, ctx, info) => {
      if (!ctx.user) throw new ForbiddenError("Not authenticated");
      if (ctx.user.role !== requiredRole && ctx.user.role !== "ADMIN") {
        throw new ForbiddenError(`Requires ${requiredRole} role`);
      }
      return originalResolve(root, args, ctx, info);
    };
  }
}
```

## Prevención de Abuso de Batching

Clientes GraphQL como Apollo Client batchean multiples queries en una request. Atacantes pueden abusar esto para enviar cientos de queries en una sola HTTP request, bypassando rate limits que cuentan HTTP requests.

### Limitar Tamaño de Batch

```javascript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  allowBatchedHttpRequests: true,
  plugins: [{
    async requestDidForOperation() {
      // Check batch size in context
    },
  }],
});

// Middleware Express para limitar batch size
app.use("/graphql", (req, res, next) => {
  if (Array.isArray(req.body) && req.body.length > 10) {
    return res.status(400).json({ error: "Batch size limit: 10 operations" });
  }
  next();
});
```

## Prevención de Inyección

### Inyección SQL via Resolvers

GraphQL no previene inyeccion SQL. Si un resolver pasa input del usuario directamente a una query de base de datos, es vulnerable.

```javascript
// VULNERABLE: concatenacion de strings
const resolvers = {
  Query: {
    userByName: (_root, { name }, ctx) => {
      return ctx.db.query(`SELECT * FROM users WHERE name = '${name}'`);
    },
  },
};

// SEGURO: query parametrizada
const resolvers = {
  Query: {
    userByName: (_root, { name }, ctx) => {
      return ctx.db.query("SELECT * FROM users WHERE name = $1", [name]);
    },
  },
};
```

### Inyección NoSQL

Ten cuidado con objetos pasados a bases de datos NoSQL. Un input de query como `{ "email": { "$ne": null } }` puede matchear todos los documentos.

```javascript
// VULNERABLE: pasar input crudo a MongoDB
const resolvers = {
  Query: {
    search: (_root, { filter }, ctx) => {
      return ctx.db.users.find(filter).toArray(); // filter podria ser { $where: "true" }
    },
  },
};

// SEGURO: whitelist de campos y sanitizacion
const resolvers = {
  Query: {
    search: (_root, { filter }, ctx) => {
      const safeFilter = {
        name: filter.name,
        email: filter.email,
      };
      Object.keys(safeFilter).forEach(k => safeFilter[k] === undefined && delete safeFilter[k]);
      return ctx.db.users.find(safeFilter).toArray();
    },
  },
};
```

## Manejo de Errores para Seguridad

### Ocultar Errores Internos

No expongas stack traces, mensajes de error de base de datos, o paths internos a los clientes. Retorna errores genericos con codigos estructurados.

```javascript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (formattedError, error) => {
    // Loggear error completo server-side
    console.error(error);
    
    // Retornar error sanitizado al cliente
    if (formattedError.extensions?.code === "INTERNAL_SERVER_ERROR") {
      return {
        message: "Internal server error",
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      };
    }
    return formattedError;
  },
});
```

### Evitar Leakage de Datos en Errores

No incluyas datos sensibles en mensajes de error. En lugar de "User with email alice@example.com not found", retorna "User not found".

## Checklist de Hardening de Producción

- [ ] Introspection deshabilitada en produccion
- [ ] Limite de profundidad de query seteado (ej., 10)
- [ ] Analisis de costo de query con presupuesto maximo
- [ ] Rate limiting por IP y por operacion
- [ ] Autenticacion requerida para todas las queries no publicas
- [ ] Autorizacion a nivel de campo en campos sensibles
- [ ] Tamaño de batch limitado (ej., 10 operaciones)
- [ ] Prevencion de inyeccion SQL/NoSQL (queries parametrizadas, sanitizacion de input)
- [ ] Mensajes de error sanitizados (sin stack traces, sin datos internos)
- [ ] HTTPS enforceado
- [ ] CORS configurado para permitir solo origenes confiables
- [ ] Logging de queries sospechosas (alto costo, profundidad alta, intentos de introspection)
- [ ] Persisted queries para APIs publicas
- [ ] Query allowlist para operaciones de cliente conocidas

## Preguntas Frecuentes

### ¿Debería deshabilitar introspection en producción?

Si. Introspection revela tu esquema entero a cualquiera que pueda enviar una query. Atacantes usan esto para encontrar campos sensibles y construir queries dirigidas. Deshabilita en produccion y usa persisted queries o un schema registry para herramientas internas.

### ¿Es GraphQL menos seguro que REST?

GraphQL tiene una superficie de ataque mas amplia porque acepta queries arbitrarias. REST limita la exposicion a traves de endpoints fijos. Sin embargo, GraphQL con depth limiting, cost analysis, y auth adecuados es tan seguro como REST. La clave es aplicar los mismos principios de seguridad (auth, rate limiting, validacion de input) a GraphQL.

### ¿Cómo prevengo que N+1 queries sean explotadas?

Usa DataLoader para batch loading. El analisis de costo captura queries que piden muchos campos de lista. El depth limiting previene anidamiento recursivo. Combinadas, estas defensas previenen la mayoria de los ataques DoS basados en N+1.

### ¿Qué es un persisted query?

Un persisted query es una query pre-registrada con el servidor. El cliente envia un hash en lugar del texto completo de la query. El servidor busca la query por hash. Esto previene que los clientes envien queries arbitrarias, reduciendo la superficie de ataque a solo operaciones pre-aprobadas.

### ¿Cómo manejo CORS para GraphQL?

Setea CORS para permitir solo tus origenes de cliente conocidos. No uses `Access-Control-Allow-Origin: *` con credenciales. Configura origenes especificos en tu middleware del servidor.

```javascript
import cors from "cors";

app.use("/graphql", cors({
  origin: ["https://app.example.com", "https://admin.example.com"],
  credentials: true,
}));
```

### ¿Debería usar un WAF para GraphQL?

Si. Un Web Application Firewall con soporte GraphQL (como Cloudflare GraphQL Protection o AWS WAF) puede bloquear queries maliciosas antes de que lleguen a tu servidor. Busca WAFs que entiendan tipos de operacion GraphQL, profundidad, y complejidad.
