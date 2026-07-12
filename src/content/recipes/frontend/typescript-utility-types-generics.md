---



contentType: recipes
slug: typescript-utility-types-generics
title: "Build Reusable Utility Types with Generics"
description: "How to create reusable TypeScript utility types using conditional types, mapped types, template literals, and generic constraints for type-safe APIs."
metaDescription: "Create reusable TypeScript utility types with conditional types, mapped types, template literals, and generic constraints for safer type-safe APIs."
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
  - /recipes/typescript-discriminated-unions-exhaustive
  - /recipes/react-form-react-hook-form-validation
  - /recipes/react-usememo-usecallback-performance
  - /guides/complete-guide-typescript-advanced-types
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Create reusable TypeScript utility types with conditional types, mapped types, template literals, and generic constraints for safer type-safe APIs."
  keywords:
    - frontend
    - typescript
    - generics
    - utility-types
    - conditional-types
    - recipe



---

## Overview

TypeScript's type system supports conditional types, mapped types, and template literal types. Combined with generics, you can build utility types that derive new types from existing ones — `Partial<T>`, `Pick<T, K>`, `Omit<T, K>` are built-in examples. Custom utility types reduce duplication, enforce invariants at compile time, and make APIs more expressive without runtime overhead.

## When to Use

- Deriving form types from API response types (omit server-only fields)
- Making specific properties required or optional based on context
- Creating type-safe builders that enforce property assignment order
- Extracting function parameter or return types for reuse
- Building API client types from schema definitions

## When NOT to Use

- Simple applications with few types — built-in utilities (`Partial`, `Pick`, `Omit`) are sufficient
- When a type alias is clearer — don't create a utility type if a direct definition is more readable
- Runtime validation — utility types are compile-time only; use Zod for runtime checks

## Solution

### Make specific properties required

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

### Make specific properties optional

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
// All fields optional — equivalent to Partial<CreateUserDTO>
```

### Pick properties by value type

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

### Omit properties by value type

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
// All properties optional at all levels
const config: PartialConfig = {
  server: { port: 3000 }, // host is optional
};
```

### Deep readonly

```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

type ReadonlyConfig = DeepReadonly<AppConfig>;
// All properties readonly at all levels
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

### Builder pattern with type safety

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

### Extract route parameters

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

### Mutable version of a type

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
// { id: string; name: string; email: string } — no readonly
```

### Function parameter and return types

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

### Using with Zod for schema-derived types

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

### Conditional type with `infer` for array element

```typescript
type ArrayElement<T> = T extends (infer E)[] ? E : never;

type StringElement = ArrayElement<string[]>; // string
type NumberElement = ArrayElement<number[]>; // number
type NotArray = ArrayElement<string>; // never
```

### Promise unwrapping

```typescript
type Awaited<T> = T extends Promise<infer U> ? U : T;

type Result = Awaited<Promise<string>>; // string
type Nested = Awaited<Promise<Promise<number>>>; // number (in TypeScript 4.5+)
```

## Best Practices


- For a deeper guide, see [Complete Guide to TypeScript Advanced Types](/guides/complete-guide-typescript-advanced-types/).

- Name utility types descriptively — `RequireFields<T, K>` is clearer than `T & { [P in K]-?: T[P] }`
- Add generic constraints (`K extends keyof T`) to catch invalid usage at compile time
- Keep utility types small and composable — combine simple utilities instead of building complex ones
- Test utility types with `expect-type` or simple type assertions — ensure they produce the expected shape
- Document edge cases — what happens with optional properties, unions, or nested objects
- Prefer built-in utilities when available — `Partial`, `Required`, `Pick`, `Omit`, `Readonly` cover most cases

## Common Mistakes

- **Overcomplicating types**: a 50-line utility type that could be a 5-line type alias. Readability matters.
- **Not testing utility types**: a type that compiles doesn't mean it produces the right shape. Use `type assertions` to verify.
- **Ignoring `never`**: when a conditional type doesn't match, it resolves to `never`. This can silently break mapped types.
- **Forgetting `-?`**: removing optionality requires `-?` modifier. Without it, `?` properties stay optional.
- **Not constraining generics**: `K extends keyof T` prevents passing invalid keys. Without the constraint, TypeScript can't catch typos.

## FAQ

### What is a conditional type?

A type that selects between two types based on a condition: `T extends U ? X : Y`. If `T` extends `U`, the result is `X`; otherwise `Y`. With `infer`, you can extract types from within other types.

### What is a mapped type?

A type that transforms each property of an existing type: `{ [P in keyof T]: NewType }`. You can add/remove `readonly` and `?` modifiers with `+`/`-` prefixes.

### Can utility types be used with enums?

Yes, but string literal unions are preferred. `keyof typeof MyEnum` gives the enum keys as a union type.

### How do I debug a utility type?

Use `type assertions` to check the result:

```typescript
type Test = RequireFields<User, "email">;
const test: Test = { id: "1", email: "a@b.com", role: "user" }; // Should compile
```

### What is the difference between `keyof T` and `keyof T & string`?

`keyof T` includes `number | symbol` if `T` has those key types. `keyof T & string` restricts to string keys only, which is useful for template literal types.
