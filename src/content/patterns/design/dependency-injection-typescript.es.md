---
contentType: patterns
slug: dependency-injection-typescript
title: "Dependency Injection Container en TypeScript"
description: "Construye un DI container liviano que resuelve dependencias de clases automaticamente, habilitando aplicaciones testeables y debilmente acopladas sin frameworks pesados"
metaDescription: "Construye un DI container liviano en TypeScript. Resuelve dependencias de clases automaticamente para aplicaciones testeables y debilmente acopladas."
difficulty: intermediate
topics:
  - design
tags:
  - dependency-injection
  - typescript
  - design-pattern
  - testing
  - design-patterns
relatedResources:
  - /patterns/design/singleton-pattern
  - /patterns/design/factory-pattern
  - /recipes/testing/unit-testing-mocking
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye un DI container liviano en TypeScript. Resuelve dependencias de clases automaticamente para aplicaciones testeables y debilmente acopladas."
  keywords:
    - dependency injection
    - di container
    - typescript
    - inversion of control
    - testable code
---

# Dependency Injection Container en TypeScript

Implementa un container de [dependency injection](/patterns/design/dependency-injection-pattern) liviano en TypeScript que resuelve dependencias de clases automaticamente a traves de decorators o metadata de constructores. Este pattern desacopla la creacion de objetos de la logica de negocio, haciendo el codigo testeable, modular y mas facil de refactorizar sin frameworks pesados.

## Cuando Usar Esto

- Las clases tienen cadenas de dependencias profundas que hacen la construccion manual tediosa
- Necesitas swapear implementaciones para testing (mocks, stubs)
- El manejo de ciclo de vida de la aplicacion requiere singletons, instancias scoped y disposal

## Problema

Un servicio depende de un repositorio, que depende de una conexion a base de datos, que depende de un config loader. Consulta [Dependency Injection Pattern](/patterns/design/dependency-injection-pattern) para ejemplos independientes del lenguaje. Crear objetos manualmente genera codigo fragil y dificil de testear.

## Solucion

### 1. Container con Token Registration

```typescript
// di/Container.ts
type Constructor<T> = new (...args: unknown[]) => T;

class Container {
  private registry = new Map<symbol, { impl: Constructor<unknown>; singleton?: unknown }>();

  register<T>(token: symbol, impl: Constructor<T>): this {
    this.registry.set(token, { impl });
    return this;
  }

  resolve<T>(token: symbol): T {
    const entry = this.registry.get(token);
    if (!entry) throw new Error(`No registration for token: ${token.toString()}`);

    // Retorna singleton cacheado si esta disponible
    if (entry.singleton) return entry.singleton as T;

    // Resuelve dependencias recursivamente
    const params = Reflect.getMetadata('design:paramtypes', entry.impl) || [];
    const deps = params.map((param: symbol) => this.resolve(param));

    const instance = new (entry.impl as Constructor<T>)(...deps);
    entry.singleton = instance;
    return instance;
  }
}
```

### 2. Injectable Decorator con Metadata

```typescript
// di/Injectable.ts
import 'reflect-metadata';

const INJECTABLE_KEY = Symbol('injectable');

function Injectable<T extends Constructor<unknown>>(target: T): T {
  Reflect.defineMetadata(INJECTABLE_KEY, true, target);
  return target;
}

function Inject(token: symbol) {
  return function (target: unknown, _propertyKey: string | symbol, parameterIndex: number) {
    const existing = Reflect.getMetadata('design:paramtypes', target) || [];
    existing[parameterIndex] = token;
    Reflect.defineMetadata('design:paramtypes', existing, target);
  };
}
```

### 3. Definiciones de Servicios

```typescript
// services/Database.ts
const DB_TOKEN = Symbol('Database');

@Injectable
class Database {
  private connection: unknown;

  connect(): void {
    this.connection = { status: 'connected' };
  }

  query(sql: string): unknown[] {
    return [{ id: 1, name: 'Alice' }];
  }
}

// services/UserRepository.ts
const REPO_TOKEN = Symbol('UserRepository');

@Injectable
class UserRepository {
  constructor(@Inject(DB_TOKEN) private db: Database) {}

  findAll(): unknown[] {
    return this.db.query('SELECT * FROM users');
  }
}

// services/UserService.ts
const SERVICE_TOKEN = Symbol('UserService');

@Injectable
class UserService {
  constructor(@Inject(REPO_TOKEN) private repo: UserRepository) {}

  getUsers(): unknown[] {
    return this.repo.findAll();
  }
}
```

### 4. Bootstrap de Aplicacion

```typescript
// main.ts
const container = new Container();

container.register(DB_TOKEN, Database);
container.register(REPO_TOKEN, UserRepository);
container.register(SERVICE_TOKEN, UserService);

const userService = container.resolve<UserService>(SERVICE_TOKEN);
console.log(userService.getUsers());
```

## Como Funciona

- **Container** almacena registrations mapeando tokens a implementaciones
- **Reflect Metadata** captura tipos de parametros del constructor en compile time
- **@Injectable** marca clases que el container puede instanciar
- **@Inject** sobreescribe tokens de parametros para interfaces o clases abstractas
- **resolve** crea instancias recursivamente, cacheando singletons

## Variacion: Scoped Lifetime

```typescript
// di/ScopedContainer.ts
class ScopedContainer {
  private parent: Container;
  private scoped = new Map<symbol, unknown>();

  resolve<T>(token: symbol): T {
    if (this.scoped.has(token)) return this.scoped.get(token) as T;

    const instance = this.parent.resolve<T>(token);
    this.scoped.set(token, instance);
    return instance;
  }
}
```

## Consideraciones de Produccion

- Usa `tsyringe` o `inversify` para produccion en lugar de un container custom
- Habilita `emitDecoratorMetadata` en `tsconfig.json` para metadata de Reflect
- Dispon instancias scoped apropiadamente para prevenir memory leaks en apps de larga duracion

## Errores Comunes

- Dependencias circulares que causan recursion infinita durante resolution
- Olvidar llamar `connect()` o metodos de inicializacion despues de resolution
- Registrar clases concretas cuando se necesitan interfaces o abstracciones

## FAQ

**P: En que se diferencia de Service Locator?**
R: Service Locator pide un registro global por dependencias. DI inyecta dependencias a traves de constructores, haciendolas explicitas y testeables. Consulta [Dependency Injection Pattern](/patterns/design/dependency-injection-pattern) para cobertura mas amplia.

**P: Puedo usar esto sin decorators?**
R: Si. Usa una factory function o registration manual con arrays de dependencias explicitas: `container.register(UserService, { deps: [UserRepository] })`.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.


## Temas Avanzados

### Escenario: DI Container para Microservicio

```typescript
// DI container minimal en TypeScript
type Constructor<T = unknown> = new (...args: unknown[]) => T;

class DIContainer {
  private services = new Map<string, { factory: () => unknown; singleton: boolean; instance?: unknown }>();

  registerTransient<T>(token: string, factory: () => T): void {
    this.services.set(token, { factory, singleton: false });
  }

  registerSingleton<T>(token: string, factory: () => T): void {
    this.services.set(token, { factory, singleton: true });
  }

  resolve<T>(token: string): T {
    const service = this.services.get(token);
    if (!service) throw new Error(`Service not found: ${token}`);
    if (service.singleton) {
      if (!service.instance) {
        service.instance = service.factory();
      }
      return service.instance as T;
    }
    return service.factory() as T;
  }
}

// Uso: registrar servicios
const container = new DIContainer();

// Singleton: una instancia para toda la app
container.registerSingleton("Database", () => new PostgreSQLConnection({
  host: "localhost", port: 5432, max: 20
}));

// Singleton: logger compartido
container.registerSingleton("Logger", () => new WinstonLogger({
  level: "info", format: "json"
}));

// Transient: nueva instancia cada vez
container.registerTransient("UserRepository", () => {
  const db = container.resolve<DatabaseConnection>("Database");
  const logger = container.resolve<Logger>("Logger");
  return new UserRepository(db, logger);
});

// Transient: nueva instancia cada request
container.registerTransient("UserService", () => {
  const repo = container.resolve<UserRepository>("UserRepository");
  return new UserService(repo);
});

// Resolver en el handler
app.get("/api/users/:id", (req, res) => {
  const userService = container.resolve<UserService>("UserService");
  const user = await userService.findById(req.params.id);
  res.json(user);
});

// Tipos de DI
  | Tipo | Descripcion | Ejemplo |
  |------|-------------|---------|
  | Constructor | Deps en constructor | constructor(db: DB) |
  | Setter | Deps via setter | service.setDB(db) |
  | Interface | Deps via interfaz | @Injectable() |
  | Property | Deps en propiedades | @Inject() |
```

Lecciones:
  - DI desacopla la creacion de dependencias del uso
  - Singleton para recursos compartidos (DB, logger, cache)
  - Transient para objetos por-request (repos, services)
  - Constructor injection es la mas segura (deps obligatorias)
  - En tests, registra mocks en el container
  - Frameworks: tsyringe, InversifyJS, NestJS DI
```

### Como testeo con DI?

En tests, crea un container separado y registra mocks. Usa registerSingleton para reemplazar DB con una mock, Logger con un spy. Resuelve el servicio bajo test: sus dependencias seran los mocks. Esto permite testear unitario sin tocar DB real. Para integration tests, usa el container real con Testcontainers para DB.
