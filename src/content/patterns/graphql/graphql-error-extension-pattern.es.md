---
contentType: patterns
slug: graphql-error-extension-pattern
title: "Patron de Extension de Errores en GraphQL"
description: "Adjunta metadatos estructurados a errores GraphQL usando codigos de extension para manejo de errores predecible del lado del cliente."
metaDescription: "Agrega metadatos estructurados a errores GraphQL con codigos de extension. Estandariza el manejo de errores con codigos legibles por maquina y contexto."
difficulty: intermediate
category: structural
topics:
  - graphql
  - api
  - architecture
tags:
  - error-extension
  - pattern
  - graphql-errors
  - error-handling
  - api-design
relatedResources:
  - /patterns/graphql-batched-resolver-pattern
  - /guides/complete-guide-graphql-federation
  - /guides/complete-guide-graphql-federation
  - /guides/complete-guide-graphql-federation
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Agrega metadatos estructurados a errores GraphQL con codigos de extension. Estandariza el manejo de errores con codigos legibles por maquina y contexto."
  keywords:
    - error-extension
    - pattern
    - graphql-errors
    - error-handling
    - api-design
---

## Descripcion general

Los errores GraphQL vuelven como una lista de objetos `{ message, locations, path }`. El campo `message` es un string legible por humanos, pero los clientes necesitan codigos legibles por maquina para manejar errores programaticamente. El patron de extension de errores adjunta metadatos estructurados a los errores via el campo `extensions` — codigos de error, equivalentes de estado HTTP, rutas de campos y contexto — para que los clientes puedan ramificar segun `code` en lugar de parsear `message`.

## Cuando Usar

- Cualquier API GraphQL donde los clientes necesitan manejar errores programaticamente (mostrar UI diferente para auth vs validacion vs no-encontrado)
- APIs consumidas por apps mobile u otros servicios que necesitan contratos de error estables
- Clientes multi-idioma donde parsear mensajes de error en ingles es fragil
- APIs que necesitan reportar errores de validacion con detalles a nivel de campo

## Cuando No Usar

- Herramientas internas donde el `message` por defecto es suficiente
- Prototipos o APIs desechables donde el manejo de errores no es prioridad

## Solucion

### 1. Definir Codigos de Error

Usar un enum consistente de codigos de error en toda la API:

```typescript
const ErrorCodes = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BAD_USER_INPUT: 'BAD_USER_INPUT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  CONFLICT: 'CONFLICT',
} as const;

type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
```

### 2. Clase de Error Personalizada

```typescript
import { GraphQLError } from 'graphql';

class GraphQLExtendedError extends GraphQLError {
  constructor(
    message: string,
    code: ErrorCode,
    extensions: Record<string, unknown> = {}
  ) {
    super(message, {
      extensions: {
        code,
        ...extensions,
      },
    });
  }
}
```

### 3. Lanzar Errores Estructurados en Resolvers

```typescript
const resolvers = {
  Query: {
    post: async (_parent, { id }, { db, user }) => {
      if (!user) {
        throw new GraphQLExtendedError(
          'Authentication required',
          ErrorCodes.UNAUTHENTICATED,
          { http: { status: 401 } }
        );
      }

      const post = await db.post.findById(id);
      if (!post) {
        throw new GraphQLExtendedError(
          `Post ${id} not found`,
          ErrorCodes.NOT_FOUND,
          { resourceId: id, http: { status: 404 } }
        );
      }

      if (post.authorId !== user.id && user.role !== 'admin') {
        throw new GraphQLExtendedError(
          'You do not have permission to view this post',
          ErrorCodes.FORBIDDEN,
          { http: { status: 403 } }
        );
      }

      return post;
    },
  },
  Mutation: {
    createPost: async (_parent, { input }, { db, user }) => {
      if (!user) {
        throw new GraphQLExtendedError(
          'Authentication required',
          ErrorCodes.UNAUTHENTICATED
        );
      }

      if (!input.title || input.title.trim().length === 0) {
        throw new GraphQLExtendedError(
          'Title is required',
          ErrorCodes.VALIDATION_ERROR,
          { field: 'title', constraint: 'required' }
        );
      }

      if (input.title.length > 200) {
        throw new GraphQLExtendedError(
          'Title must be 200 characters or less',
          ErrorCodes.VALIDATION_ERROR,
          { field: 'title', constraint: 'max_length', max: 200, actual: input.title.length }
        );
      }

      return db.post.create({ ...input, authorId: user.id });
    },
  },
};
```

### 4. Manejo de Errores del Lado del Cliente

Los clientes ramifican segun `extensions.code` en lugar de parsear `message`:

```typescript
async function fetchPost(id: string) {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: `query { post(id: "${id}") { title body } }` }),
  });

  const { data, errors } = await response.json();

  if (errors) {
    const error = errors[0];
    const code = error.extensions?.code;

    switch (code) {
      case 'UNAUTHENTICATED':
        redirectToLogin();
        return;
      case 'NOT_FOUND':
        showNotFoundPage();
        return;
      case 'FORBIDDEN':
        showAccessDenied();
        return;
      case 'VALIDATION_ERROR':
        showFieldError(error.extensions.field, error.message);
        return;
      default:
        showGenericError(error.message);
        return;
    }
  }

  return data.post;
}
```

### 5. Formateo Global de Errores

Usar `formatError` de Apollo Server para sanitizar errores antes de que lleguen a los clientes:

```typescript
import { ApolloServer } from '@apollo/server';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (formattedError, error) => {
    // Nunca exponer errores internos a los clientes
    if (formattedError.extensions?.code === 'INTERNAL_ERROR') {
      return {
        message: 'An internal error occurred',
        extensions: {
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Loguear error completo del lado servidor, retornar version sanitizada al cliente
    console.error('GraphQL Error:', {
      code: formattedError.extensions?.code,
      message: formattedError.message,
      path: formattedError.path,
      stack: error?.stack,
    });

    // Remover stack traces de respuestas al cliente
    delete formattedError.extensions?.stacktrace;
    return formattedError;
  },
});
```

## Explicacion

- **Codigos de error**: Identificadores estables y legibles por maquina sobre los que los clientes pueden hacer switch. Nunca cambian incluso cuando los mensajes se reformulan
- **Extensions**: El campo `extensions` en errores de la especificacion GraphQL es un objeto JSON arbitrario — usalo para `code`, `field`, `http.status`, `resourceId`, o cualquier metadato que los clientes necesiten
- **Estado HTTP**: Las respuestas GraphQL siempre retornan HTTP 200, pero incluir `http.status` en extensions permite a gateways o middleware traducir a codigos HTTP apropiados si es necesario
- **Sanitizacion**: `formatError` se ejecuta antes de enviar la respuesta — elimina stack traces, reescribe errores internos, agrega timestamps

## Variantes

### Coleccion de Errores de Validacion

Retornar multiples errores de validacion en una respuesta:

```typescript
Mutation: {
  createPost: async (_parent, { input }, { db, user }) => {
    const errors: GraphQLError[] = [];

    if (!input.title?.trim()) {
      errors.push(new GraphQLExtendedError('Title required', ErrorCodes.VALIDATION_ERROR, { field: 'title' }));
    }
    if (!input.body?.trim()) {
      errors.push(new GraphQLExtendedError('Body required', ErrorCodes.VALIDATION_ERROR, { field: 'body' }));
    }
    if (input.tags && input.tags.length > 10) {
      errors.push(new GraphQLExtendedError('Max 10 tags', ErrorCodes.VALIDATION_ERROR, { field: 'tags', max: 10 }));
    }

    if (errors.length > 0) {
      throw new GraphQLError('Validation failed', {
        extensions: {
          code: ErrorCodes.VALIDATION_ERROR,
          errors: errors.map((e) => e.extensions),
        },
      });
    }

    return db.post.create(input);
  },
},
```

### Traduccion de Errores por Idioma

```typescript
const errorMessages = {
  UNAUTHENTICATED: {
    en: 'Authentication required',
    es: 'Se requiere autenticacion',
    fr: 'Authentification requise',
  },
  NOT_FOUND: {
    en: 'Resource not found',
    es: 'Recurso no encontrado',
    fr: 'Ressource introuvable',
  },
};

function createError(code: ErrorCode, lang: string, extensions: Record<string, unknown> = {}) {
  const message = errorMessages[code]?.[lang] ?? errorMessages[code]?.en ?? code;
  return new GraphQLExtendedError(message, code, extensions);
}
```

### Error de Rate Limit con Retry-After

```typescript
throw new GraphQLExtendedError(
  'Rate limit exceeded. Try again in 60 seconds.',
  ErrorCodes.RATE_LIMITED,
  {
    http: { status: 429 },
    retryAfter: 60,
    limit: 100,
    remaining: 0,
  }
);
```

## Mejores Practicas

- Usar un conjunto fijo de codigos de error — documentarlos en el esquema como un scalar personalizado o directiva
- Nunca cambiar los strings de codigos de error despues del release — los clientes dependen de ellos
- Siempre incluir `code` en extensions, incluso para errores inesperados
- Eliminar stack traces y detalles internos en `formatError` antes de enviar a clientes
- Loguear errores completos del lado servidor con IDs de peticion para debugging
- Incluir detalles a nivel de campo en errores de validacion para que los clientes puedan resaltar los inputs correctos
- Usar `INTERNAL_ERROR` para excepciones no manejadas — nunca filtrar mensajes de error de base de datos

## Errores Comunes

- **Depender de `message` para control de flujo**: Los mensajes se reformulan o traducen, rompiendo la logica del cliente
- **Filtrar stack traces**: Apollo Server por defecto incluye `extensions.stacktrace` — eliminarlo en `formatError`
- **Usar codigos de estado HTTP como codigos de error**: Son dominios diferentes. Usar codigos semanticos (`NOT_FOUND`) y opcionalmente incluir estado HTTP en extensions
- **No manejar errores inesperados**: Envolver resolvers en try/catch o usar un plugin de error global para asegurar que cada error tenga un `code`
- **Retornar errores como data en lugar de lanzarlos**: GraphQL tiene un array de errores integrado — usalo. Los clientes esperan errores ahi, no en `data`

## FAQ

**Deberia usar errores GraphQL o retornar tipos de error en el esquema?**

Ambos enfoques funcionan. Los errores son mas simples para preocupaciones transversales (auth, validacion). Los tipos de retorno union (`CreatePostResult = CreatePostSuccess | ValidationError`) dan manejo de errores type-safe por campo pero anaden complejidad al esquema. Usar errores para la mayoria de los casos, unions para campos donde los errores son parte del flujo normal.

**Como funcionan las extensiones de error con federation?**

Federation preserva las extensiones de error a traves del gateway. Los errores de subgrafos se reenvian al cliente con sus extensiones intactas, incluyendo el nombre del subgrafo en `extensions.serviceName`.

**Puedo localizar mensajes de error?**

Si. Pasar la preferencia de idioma del usuario via context y traducir mensajes en resolvers o `formatError`. Mantener los codigos de error independientes del idioma.

**Que estado HTTP deberian retornar los errores GraphQL?**

La especificacion GraphQL dice que las respuestas usan HTTP 200 independientemente de los errores. Algunos gateways traducen codigos de error especificos a HTTP 4xx/5xx. Incluir `http.status` en extensions si necesitas este comportamiento.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
