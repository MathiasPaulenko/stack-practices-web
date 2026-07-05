---
contentType: recipes
slug: typescript-utility-types-generics
title: "Construir Utility Types Reutilizables con Generics"
description: "Cómo crear utility types reutilizables en TypeScript usando conditional types, mapped types, template literals y generic constraints para APIs type-safe."
metaDescription: "Crea utility types reutilizables en TypeScript con conditional types, mapped types, template literals y generic constraints para APIs type-safe más seguras."
difficulty: advanced
topics:
  - frontend
tags:
  - frontend
  - typescript
  - generics
  - utility-types
  - conditional-types
  - recipe
relatedResources:
  - /recipes/frontend/typescript-discriminated-unions-exhaustive
  - /recipes/frontend/react-form-react-hook-form-validation
  - /recipes/frontend/react-usememo-usecallback-performance
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Crea utility types reutilizables en TypeScript con conditional types, mapped types, template literals y generic constraints para APIs type-safe más seguras."
  keywords:
    - frontend
    - typescript
    - generics
    - utility-types
    - conditional-types
    - recipe
---

## Overview

El type system de TypeScript soporta conditional types, mapped types y template literal types. Combinados con generics, puedes construir utility types que derivan nuevos tipos de existentes — `Partial<T>`, `Pick<T, K>`, `Omit<T, K>` son ejemplos built-in. Los custom utility types reducen duplicación, enforcean invariantes en compile time y hacen las APIs más expresivas sin overhead de runtime.

## When to Use

- Derivar tipos de formularios a partir de tipos de API response (omitir campos solo de servidor)
- Hacer propiedades específicas required u optional basado en contexto
- Crear builders type-safe que enforcean el orden de asignación de propiedades
- Extraer tipos de parámetros o return de funciones para reutilizar
- Construir tipos de API client a partir de schema definitions

## When NOT to Use

- Aplicaciones simples con pocos tipos — los utilities built-in (`Partial`, `Pick`, `Omit`) son suficientes
- Cuando un type alias es más claro — no crees un utility type si una definición directa es más legible
- Runtime validation — los utility types son solo compile time; usa Zod para checks de runtime

## Solution

### Hacer propiedades específicas required

```typescript
type RequireFields<T, K extends keyof T> = T & {
  [P in K]-?: T[P];
};

interface User {
  id?: string;
  name?: string;
  email?: string;
  role: string;
}

type UserWithRequiredEmail = RequireFields<User, "id" | "email">;
// { id: string; name?: string; email: string; role: string }
```

### Hacer propiedades específicas optional

```typescript
type OptionalFields<T, K extends keyof T> = Omit<T, K> & {
  [P in K]?: T[P];
};

interface CreateUserDTO {
  name: string;
  email: string;
  role: string;
  avatar: string;
}

type UpdateUserDTO = OptionalFields<CreateUserDTO, "name" | "email" | "role" | "avatar">;
// Todos los campos optional — equivalente a Partial<CreateUserDTO>
```

### Seleccionar propiedades por tipo de valor

```typescript
type PickByValue<T, ValueType> = {
  [P in keyof T as T[P] extends ValueType ? P : never]: T[P];
};

interface Config {
  port: number;
  host: string;
  debug: boolean;
  retries: number;
  logFile: string;
}

type StringConfig = PickByValue<Config, string>;
// { host: string; logFile: string }

type NumberConfig = PickByValue<Config, number>;
// { port: number; retries: number }
```

### Omitir propiedades por tipo de valor

```typescript
type OmitByValue<T, ValueType> = {
  [P in keyof T as T[P] extends ValueType ? never : P]: T[P];
};

type NonBooleanConfig = OmitByValue<Config, boolean>;
// { port: number; host: string; retries: number; logFile: string }
```

### Deep partial

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

interface AppConfig {
  server: {
    port: number;
    host: string;
  };
  database: {
    url: string;
    poolSize: number;
  };
  logging: {
    level: string;
    file: string;
  };
}

type PartialConfig = DeepPartial<AppConfig>;
// Todas las propiedades optional en todos los niveles
const config: PartialConfig = {
  server: { port: 3000 }, // host es optional
};
```

### Deep readonly

```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

type ReadonlyConfig = DeepReadonly<AppConfig>;
// Todas las propiedades readonly en todos los niveles
```

### Template literal types

```typescript
type EventName<T extends string> = `on${Capitalize<T>}`;

type ClickEvent = EventName<"click">; // "onClick"
type FocusEvent = EventName<"focus">; // "onFocus"

type EventHandler<T extends string> = {
  [K in EventName<T>]?: (event: { type: T; target: HTMLElement }) => void;
};

type ButtonHandlers = EventHandler<"click" | "focus" | "blur">;
// { onClick?: ...; onFocus?: ...; onBlur?: ... }
```

### API response wrapper

```typescript
type ApiResponse<T, E = string> =
  | { success: true; data: T; timestamp: number }
  | { success: false; error: E; timestamp: number };

type UserResponse = ApiResponse<{ id: string; name: string }>;
type ListResponse<T> = ApiResponse<T[], "not_found" | "server_error">;
```

### Builder pattern con type safety

```typescript
type Builder<T> = {
  [K in keyof T]: (value: T[K]) => Builder<Omit<T, K>>;
} & { build: () => T };

function createBuilder<T>(): Builder<T> {
  const state = {} as T;
  const proxy = {} as Builder<T>;

  for (const key in state) {
    proxy[key] = ((value: any) => {
      (state as any)[key] = value;
      return proxy;
    }) as any;
  }

  proxy.build = () => state;
  return proxy;
}

interface User {
  id: string;
  name: string;
  email: string;
}

const user = createBuilder<User>()
  .id("123")
  .name("Alice")
  .email("alice@example.com")
  .build();
```

### Extraer parámetros de ruta

```typescript
type RouteParams<T extends string> = T extends `${string}:${infer Param}/${infer Rest}`
  ? { [K in Param]: string } & RouteParams<Rest>
  : T extends `${string}:${infer Param}`
  ? { [K in Param]: string }
  : {};

type UserRoute = "/users/:userId/posts/:postId";
type UserRouteParams = RouteParams<UserRoute>;
// { userId: string; postId: string }

function navigate<T extends string>(
  route: T,
  params: RouteParams<T>
): string {
  let path = route;
  for (const [key, value] of Object.entries(params)) {
    path = path.replace(`:${key}`, value as string);
  }
  return path;
}

navigate("/users/:userId/posts/:postId", { userId: "123", postId: "456" });
// "/users/123/posts/456"
```

### Versión mutable de un tipo

```typescript
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

interface ReadonlyUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

type EditableUser = Mutable<ReadonlyUser>;
// { id: string; name: string; email: string } — sin readonly
```

### Tipos de parámetros y return de funciones

```typescript
type FirstParam<T> = T extends (first: infer P, ...rest: any[]) => any ? P : never;
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type AllParams<T> = T extends (...args: infer P) => any ? P : never;

function createUser(name: string, age: number, email: string): { id: string } {
  return { id: "1" };
}

type Name = FirstParam<typeof createUser>; // string
type Result = ReturnType<typeof createUser>; // { id: string }
type Params = AllParams<typeof createUser>; // [string, number, string]
```

## Variants

### Usar con Zod para tipos derivados de schema

```typescript
import { z } from "zod";

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(["admin", "user", "guest"]),
});

type User = z.infer<typeof UserSchema>;

type CreateUserInput = OptionalFields<Omit<User, "id">, "role">;
// { name: string; email: string; role?: "admin" | "user" | "guest" }

type AdminUser = RequireFields<User, "role"> & { role: "admin" };
```

### Conditional type con `infer` para elemento de array

```typescript
type ArrayElement<T> = T extends (infer E)[] ? E : never;

type StringElement = ArrayElement<string[]>; // string
type NumberElement = ArrayElement<number[]>; // number
type NotArray = ArrayElement<string>; // never
```

### Unwrapping de Promise

```typescript
type Awaited<T> = T extends Promise<infer U> ? U : T;

type Result = Awaited<Promise<string>>; // string
type Nested = Awaited<Promise<Promise<number>>>; // number (en TypeScript 4.5+)
```

## Best Practices

- Nombra los utility types descriptivamente — `RequireFields<T, K>` es más claro que `T & { [P in K]-?: T[P] }`
- Agrega generic constraints (`K extends keyof T`) para atrapar uso inválido en compile time
- Mantén los utility types pequeños y componibles — combina utilities simples en lugar de construir complejos
- Testea utility types con `expect-type` o type assertions simples — asegúrate de que produzcan el shape esperado
- Documenta edge cases — qué pasa con propiedades opcionales, unions u objetos anidados
- Prefiere utilities built-in cuando estén disponibles — `Partial`, `Required`, `Pick`, `Omit`, `Readonly` cubren la mayoría de los casos

## Common Mistakes

- **Sobre-complicar tipos**: un utility type de 50 líneas que podría ser un type alias de 5 líneas. La legibilidad importa.
- **No testear utility types**: un tipo que compila no significa que produce el shape correcto. Usa type assertions para verificar.
- **Ignorar `never`**: cuando un conditional type no coincide, resuelve a `never`. Esto puede romper mapped types silenciosamente.
- **Olvidar `-?`**: remover opcionalidad requiere el modifier `-?`. Sin él, las propiedades `?` quedan opcionales.
- **No constreñir generics**: `K extends keyof T` previene pasar keys inválidas. Sin el constraint, TypeScript no puede atrapar typos.

## FAQ

### ¿Qué es un conditional type?

Un tipo que selecciona entre dos tipos basado en una condición: `T extends U ? X : Y`. Si `T` extiende `U`, el resultado es `X`; de lo contrario `Y`. Con `infer`, puedes extraer tipos de dentro de otros tipos.

### ¿Qué es un mapped type?

Un tipo que transforma cada propiedad de un tipo existente: `{ [P in keyof T]: NewType }`. Puedes agregar/remover modifiers `readonly` y `?` con prefijos `+`/`-`.

### ¿Puedo usar utility types con enums?

Sí, pero los string literal unions son preferidos. `keyof typeof MyEnum` da las keys del enum como un union type.

### ¿Cómo debuggeo un utility type?

Usa `type assertions` para verificar el resultado:

```typescript
type Test = RequireFields<User, "email">;
const test: Test = { id: "1", email: "a@b.com", role: "user" }; // Debería compilar
```

### ¿Cuál es la diferencia entre `keyof T` y `keyof T & string`?

`keyof T` incluye `number | symbol` si `T` tiene esos key types. `keyof T & string` restringe a solo string keys, lo cual es útil para template literal types.
