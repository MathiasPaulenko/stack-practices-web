---
contentType: patterns
slug: builder-pattern-configuration
title: "Builder Pattern para Objetos de Configuracion Complejos"
description: "Usa el Builder pattern para construir objetos de configuracion complejos con parametros opcionales y valores por defecto sensatos sin constructores telescopicos"
metaDescription: "Builder pattern para objetos de configuracion. Construye objetos complejos con parametros opcionales, API fluida y valores por defecto sin constructores telescopicos."
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
  metaDescription: "Builder pattern para objetos de configuracion. Construye objetos complejos con parametros opcionales, API fluida y valores por defecto sin constructores telescopicos."
  keywords:
    - builder pattern
    - configuration builder
    - creational pattern
    - fluent api
    - object construction
---

# Builder Pattern para Objetos de Configuracion Complejos

El [Builder](/patterns/design/builder-pattern) pattern separa la construccion de un objeto complejo de su representacion. En lugar de pasar ocho argumentos al constructor o crear un objeto vacio y establecer campos individualmente, el builder proporciona una API legible paso a paso con valores por defecto y validacion.

## Cuando Usar Esto

- Un objeto tiene muchos parametros opcionales y valores por defecto sensatos
- Quieres prevenir que objetos se creen en un estado invalido
- El telescopio de constructores se vuelve ilegible con mas de tres argumentos opcionales

## Problema

Construir una configuracion de conexion a base de datos con opciones de pooling, SSL y reintentos lleva a constructores de 12 argumentos u objetos mutables parcialmente inicializados.

## Solucion

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

## Uso

```typescript
const config = new DatabaseConfigBuilder()
  .setHost('db.example.com')
  .setCredentials('app_user', process.env.DB_PASSWORD!)
  .setDatabase('analytics')
  .enableSSL()
  .setPoolSize(20)
  .build();
```

## Variaciones

- **Immutable Builder**: Retorna un nuevo builder en cada paso en lugar de mutar estado
- **[Director](/patterns/design/builder-pattern)**: Encapsula configuraciones comunes detras de una clase director
- **Step Builder**: Refuerza orden de construccion a traves de interfaces separadas para cada paso

## Lo que funciona

- Valida solo al llamar `build()`, no en cada setter; consulta [Builder pattern](/patterns/design/builder-pattern) para estrategias de validacion
- Retorna `this` para encadenamiento de metodos (interfaz fluida)
- Congela o sella el objeto retornado para prevenir mutacion post-construccion

## Errores Comunes

- Agregar logica de negocio al builder en lugar de mantenerlo como construccion pura
- Olvidar resetear estado interno cuando un builder se reutiliza
- Retornar objetos parcialmente construidos sin validacion

## FAQ

**P: Cuando deberia preferir un builder sobre un literal de objeto?**
R: Cuando se necesita validacion, los valores por defecto son complejos, o la misma logica de construccion se reutiliza en multiples puntos de llamada. Para casos simples, considera [Factory Method](/patterns/design/factory-pattern) en su lugar.

**P: El Builder pattern sigue siendo relevante con la sintaxis de spread de objetos?**
R: Si. Los spreads son convenientes para casos simples pero no enforcean validacion, valores por defecto ni orden de construccion.
