---
contentType: recipes
slug: graphql-input-validation
title: "Validacion y sanitizacion de input types en GraphQL en el servidor"
description: "Implementa validacion centralizada de inputs en GraphQL con funciones personalizadas, schemas Zod y transformaciones de input types"
metaDescription: "Valida input types de GraphQL en el servidor con schemas Zod. Sanea strings, aplica restricciones y retorna errores de validacion estructurados."
difficulty: intermediate
topics:
  - graphql
  - api
  - security
tags:
  - graphql
  - validation
  - zod
  - input sanitization
  - security
relatedResources:
  - /recipes/graphql/graphql-custom-scalar-types
  - /recipes/graphql/graphql-error-handling-best-practices
  - /recipes/data/data-validation-zod
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Valida input types de GraphQL en el servidor con schemas Zod. Sanea strings, aplica restricciones y retorna errores de validacion estructurados."
  keywords:
    - graphql input validation
    - graphql zod
    - graphql sanitization
    - input type validation
    - graphql security
---

# Validacion y sanitizacion de input types en GraphQL en el servidor

GraphQL valida que los inputs coincidan con sus tipos declarados, pero no aplica restricciones de negocio — longitud de string, rangos numericos, formato de email o sanitizacion XSS. Sin una capa de validacion, los resolvers reciben input crudo y deben implementar sus propios checks. Centralizar la validacion con schemas Zod mantiene los resolvers limpios y asegura mensajes de error consistentes.

## Cuando Usar Esto

- Cualquier mutacion que acepta input del usuario (create, update, delete)
- APIs expuestas a clientes publicos donde el input no es confiable
- Schemas con input types complejos que necesitan validacion entre campos

## Requisitos Previos

- Un servidor GraphQL (Apollo Server, GraphQL Yoga)
- Zod instalado (`npm install zod`)

## Solucion

### 1. Definir input types en el schema

```typescript
// schema.ts
import gql from 'graphql-tag';

export const typeDefs = gql`
  input CreatePostInput {
    title: String!
    content: String!
    tags: [String!]!
    publishedAt: String
  }

  input UpdateUserInput {
    name: String
    bio: String
    website: String
  }

  type ValidationError {
    field: String!
    message: String!
  }

  type ValidationErrors {
    errors: [ValidationError!]!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    tags: [String!]!
    publishedAt: String
  }

  type Mutation {
    createPost(input: CreatePostInput!): Post!
    updateUser(id: ID!, input: UpdateUserInput!): User!
  }
`;
```

### 2. Crear schemas de validacion Zod

```typescript
// validation/schemas.ts
import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be at most 200 characters')
    .trim(),
  content: z.string()
    .min(10, 'Content must be at least 10 characters')
    .max(50000, 'Content is too long')
    .trim(),
  tags: z.array(z.string().min(1).max(30).trim())
    .min(1, 'At least one tag is required')
    .max(10, 'Maximum 10 tags allowed'),
  publishedAt: z.string()
    .datetime()
    .optional()
    .refine(
      (date) => !date || new Date(date) > new Date(),
      'Published date must be in the future'
    ),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  bio: z.string().max(500).trim().optional(),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): { success: true; data: T } | { success: false; errors: { field: string; message: string }[] } {
  const result = schema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
  return { success: false, errors };
}
```

### 3. Usar validacion en los resolvers

```typescript
// resolvers.ts
import { createPostSchema, updateUserSchema, validateInput } from './validation/schemas';

export const resolvers = {
  Mutation: {
    createPost: async (
      _: unknown,
      { input }: { input: any },
      ctx: { db: { posts: { create: (data: any) => Promise<any> }; user: { id: string } } }
    ) => {
      const result = validateInput(createPostSchema, input);
      if (!result.success) {
        throw new ValidationException(result.errors);
      }

      return ctx.db.posts.create({
        ...result.data,
        authorId: ctx.user.id,
      });
    },

    updateUser: async (
      _: unknown,
      { id, input }: { id: string; input: any },
      ctx: { db: { users: { update: (id: string, data: any) => Promise<any> } } }
    ) => {
      const result = validateInput(updateUserSchema, input);
      if (!result.success) {
        throw new ValidationException(result.errors);
      }

      return ctx.db.users.update(id, result.data);
    },
  },
};
```

### 4. Clase de error personalizada

```typescript
// errors.ts
export class ValidationException extends Error {
  constructor(
    public readonly validationErrors: { field: string; message: string }[]
  ) {
    super('Validation failed');
    this.name = 'ValidationException';
  }
}
```

### 5. Formatear errores en Apollo Server

```typescript
// server.ts
import { ApolloServer } from '@apollo/server';
import { ValidationException } from './errors';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (formatted, error) => {
    if (error instanceof ValidationException) {
      return {
        message: 'Input validation failed',
        extensions: {
          code: 'VALIDATION_ERROR',
          errors: error.validationErrors,
        },
      };
    }
    return formatted;
  },
});
```

## Como Funciona

1. **Schemas Zod** definen restricciones declarativamente — longitud min/max, patrones regex, formato URL, refinamientos personalizados
2. **`safeParse`** retorna una union discriminada: `{ success: true, data }` o `{ success: false, error }` — sin excepciones
3. **`validateInput`** convierte errores de Zod a un array plano `{ field, message }` que los clientes pueden mapear a campos de formulario
4. **`ValidationException`** transporta errores estructurados a traves del manejo de errores de GraphQL al bloque `extensions`

## Variantes

### Validacion entre campos

Valida que dos campos se relacionen entre si:

```typescript
export const eventSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  { message: 'End date must be after start date', path: ['endDate'] }
);
```

### Sanitizacion con DOMPurify

Elimina HTML del input del usuario para prevenir XSS:

```typescript
import DOMPurify from 'isomorphic-dompurify';

export const htmlContentSchema = z.string()
  .transform((value) => DOMPurify.sanitize(value))
  .refine((value) => value.length > 0, 'Content cannot be empty after sanitization');
```

### Directivas de validacion

Usa directivas de schema para marcar campos para validacion declarativamente:

```graphql
input CreatePostInput {
  title: String @constraint(minLength: 3, maxLength: 200)
  content: String @constraint(minLength: 10, maxLength: 50000)
}
```

## Mejores Practicas

- **Valida en la frontera** — ejecuta la validacion como primer paso en cada resolver que acepta input
- **Sanea, no solo valides** — usa `.trim()` y sanitizadores HTML para limpiar input, no solo rechazarlo
- **Retorna errores estructurados** — errores a nivel de campo permiten a los clientes mapear mensajes a inputs especificos
- **Reutiliza schemas entre capas** — comparte schemas Zod entre resolvers GraphQL, handlers REST y formularios frontend

## Errores Comunes

- **Confiar en la verificacion de tipos nativa de GraphQL** — GraphQL valida tipos pero no restricciones como longitud minima o formato
- **Validar en cada resolver por separado** — genera reglas inconsistentes y logica duplicada
- **Lanzar errores sin estructura** — los clientes no pueden manejar errores de validacion programaticamente sin extensions estructuradas
- **Olvidar sanitizar HTML** — la validacion sola no previene XSS; elimina tags peligrosos antes de almacenar

## FAQ

**Q: Debo usar Zod o escalares personalizados de GraphQL para validacion?**
A: Usa escalares para validacion de formato (email, fecha). Usa Zod para restricciones de negocio (longitud min, reglas entre campos). Se complementan.

**Q: Puedo compartir schemas Zod con el frontend?**
A: Si. Si tu frontend usa TypeScript, importa los mismos schemas Zod para validacion del lado del cliente antes de enviar a la API.

**Q: Como manejo subida de archivos con validacion?**
A: Valida metadatos del archivo (tamano, MIME type) en el resolver. La especificacion de subida multipart de GraphQL no soporta Zod directamente.

**Q: Que pasa con rendimiento con inputs grandes?**
A: Zod es rapido para tamanos tipicos. Para payloads muy grandes (100KB+), considera validacion streaming o limites de tamano en la capa HTTP.
