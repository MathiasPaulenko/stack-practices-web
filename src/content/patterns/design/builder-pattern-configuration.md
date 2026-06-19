---
contentType: patterns
slug: builder-pattern-configuration
title: "Builder Pattern for Complex Configuration Objects"
description: "Use the Builder pattern to construct complex configuration objects with optional parameters and sensible defaults without telescoping constructors"
metaDescription: "Builder pattern for configuration objects. Construct complex objects with optional parameters, fluent API, and sensible defaults without telescoping constructors."
difficulty: beginner
topics:
  - design
tags:
  - builder
  - creational
  - design-pattern
  - fluent-interface
relatedResources:
  - /patterns/design/abstract-factory-pattern
  - /patterns/design/proxy-pattern-caching
  - /recipes/api/call-rest-api
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Builder pattern for configuration objects. Construct complex objects with optional parameters, fluent API, and sensible defaults without telescoping constructors."
  keywords:
    - builder pattern
    - configuration builder
    - creational pattern
    - fluent api
    - object construction
---

# Builder Pattern for Complex Configuration Objects

The [Builder](/patterns/design/builder-pattern) pattern separates the construction of a complex object from its representation. Instead of passing eight constructor arguments or creating an empty object and setting fields individually, the builder provides a readable, step-by-step API with defaults and validation.

## When to Use This

- An object has many optional parameters and sensible defaults
- You want to prevent objects from being created in an invalid state
- Constructor telescoping becomes unreadable with more than three optional arguments

## Problem

Constructing a database connection config with optional pooling, SSL, and retry settings leads to either 12-argument constructors or partially-initialized mutable objects.

## Solution

```typescript
// config/DatabaseConfig.ts
interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: boolean;
  poolSize?: number;
  maxRetries?: number;
  connectionTimeout?: number;
}

class DatabaseConfigBuilder {
  private config: Partial<DatabaseConfig> = {
    port: 5432,
    ssl: false,
    poolSize: 10,
    maxRetries: 3,
    connectionTimeout: 5000,
  };

  setHost(host: string): this {
    this.config.host = host;
    return this;
  }

  setPort(port: number): this {
    this.config.port = port;
    return this;
  }

  setCredentials(username: string, password: string): this {
    this.config.username = username;
    this.config.password = password;
    return this;
  }

  setDatabase(name: string): this {
    this.config.database = name;
    return this;
  }

  enableSSL(): this {
    this.config.ssl = true;
    return this;
  }

  setPoolSize(size: number): this {
    this.config.poolSize = size;
    return this;
  }

  setMaxRetries(retries: number): this {
    this.config.maxRetries = retries;
    return this;
  }

  build(): DatabaseConfig {
    if (!this.config.host || !this.config.username || !this.config.database) {
      throw new Error('Host, username, and database are required');
    }
    return this.config as DatabaseConfig;
  }
}
```

## Usage

```typescript
const config = new DatabaseConfigBuilder()
  .setHost('db.example.com')
  .setCredentials('app_user', process.env.DB_PASSWORD!)
  .setDatabase('analytics')
  .enableSSL()
  .setPoolSize(20)
  .build();
```

## Variations

- **Immutable Builder**: Return a new builder on each step instead of mutating state
- **[Director](/patterns/design/builder-pattern)**: Encapsulate common configurations behind a director class
- **Step Builder**: Enforce build order through separate interfaces for each step

## Best Practices

- Validate only at `build()` time, not on every setter; see [Builder pattern](/patterns/design/builder-pattern) for validation strategies
- Return `this` for method chaining (fluent interface)
- Freeze or seal the returned object to prevent post-construction mutation

## Common Mistakes

- Adding business logic to the builder instead of keeping it as pure construction
- Forgetting to reset internal state when a builder is reused
- Returning partially built objects without validation

## FAQ

**Q: When should I prefer a builder over an object literal?**
A: When validation is needed, defaults are complex, or the same construction logic is reused across multiple call sites. For simple cases, consider [Factory Method](/patterns/design/factory-pattern) instead.

**Q: Is the Builder pattern still relevant with object spread syntax?**
A: Yes. Spreads are convenient for simple cases but do not enforce validation, defaults, or construction order.
