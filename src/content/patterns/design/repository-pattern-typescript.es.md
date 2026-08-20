---
contentType: patterns
slug: repository-pattern-typescript
title: "Repository Pattern con Generics de TypeScript"
description: "Implementa el Repository pattern con generics de TypeScript para desacoplar la lógica de acceso a datos de los servicios de dominio usando interfaces."
metaDescription: "Repository pattern en TypeScript con generics. Desacopla acceso a datos de lógica de dominio con repositorios type-safe, interfaces e inyección limpia."
difficulty: intermediate
topics:
  - design
  - databases
tags:
  - repository
  - typescript
  - architecture
  - design-pattern
relatedResources:
  - /patterns/repository-pattern
  - /patterns/active-record-pattern
  - /patterns/dependency-injection-pattern
  - /patterns/adapter-pattern-api
  - /recipes/database-indexing
  - /guides/database-design-guide
lastUpdated: "2026-08-19"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Repository pattern en TypeScript con generics. Desacopla acceso a datos de lógica de dominio con repositorios type-safe, interfaces e inyección limpia."
  keywords:
    - repository pattern
    - typescript generics
    - data access layer
    - architecture pattern
    - clean architecture
---

## Visión General

El [Repository Pattern](/patterns/repository-pattern/) media entre las capas de
dominio y mapeo de datos. Actúa como una colección en memoria de objetos de
dominio, abstrayendo los detalles de persistencia para que los servicios se
mantengan enfocados en la lógica de negocio.

Esta versión usa generics de TypeScript para que una sola interfaz pueda
describir repositorios de cualquier entidad y tipo de id.

## Cuándo Usar

- Querés cambiar tecnologías de base de datos sin modificar la lógica de negocio.
- Los tests unitarios deben ejecutarse sin base de datos real.
- Múltiples servicios comparten patrones de consulta similares.
- Necesitás mantener las preocupaciones de persistencia fuera de los servicios.

### Cuándo evitarlo

- Aplicaciones CRUD simples donde un estilo active-record del ORM es suficiente.
- Prototipos que no necesitan test doubles ni cambios de almacenamiento.

## Solución

### Interfaz de repositorio

```typescript
interface Repository<T, ID> {
  findById(id: ID): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(entity: Omit<T, "id">): Promise<T>;
  update(id: ID, entity: Partial<T>): Promise<T | null>;
  delete(id: ID): Promise<boolean>;
}
```

### Implementación con Mongoose

```typescript
import { Model } from "mongoose";

class MongooseRepository<T extends { id: string }> implements Repository<T, string> {
  constructor(private model: Model<any>) {}

  async findById(id: string): Promise<T | null> {
    const doc = await this.model.findById(id).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async findAll(filter: Record<string, any> = {}): Promise<T[]> {
    const docs = await this.model.find(filter).lean();
    return docs.map((doc) => this.toEntity(doc));
  }

  async create(data: Omit<T, "id">): Promise<T> {
    const doc = await this.model.create(data);
    return this.toEntity(doc.toObject());
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const doc = await this.model.findByIdAndUpdate(id, data, { new: true }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id);
    return !!result;
  }

  private toEntity(doc: any): T {
    const { _id, __v, ...rest } = doc;
    return { id: _id.toString(), ...rest } as T;
  }
}
```

### Implementación en memoria para tests

```typescript
class InMemoryRepository<T extends { id: string }> implements Repository<T, string> {
  private items: Map<string, T> = new Map();

  async findById(id: string): Promise<T | null> {
    return this.items.get(id) ?? null;
  }

  async findAll(filter?: Partial<T>): Promise<T[]> {
    const all = Array.from(this.items.values());
    if (!filter) return all;

    return all.filter((item) =>
      Object.entries(filter).every(([key, value]) => (item as any)[key] === value)
    );
  }

  async create(data: Omit<T, "id">): Promise<T> {
    const id = crypto.randomUUID();
    const item = { id, ...data } as T;
    this.items.set(id, item);
    return item;
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const existing = this.items.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...data, id } as T;
    this.items.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}
```

### Entidad de dominio y servicio

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

class UserService {
  constructor(private userRepo: Repository<User, string>) {}

  async promoteToAdmin(userId: string): Promise<User | null> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error("Usuario no encontrado");
    return this.userRepo.update(userId, { role: "admin" });
  }
}
```

### Uso

```typescript
const userRepo = new MongooseRepository<User>(UserModel);
const userService = new UserService(userRepo);

// En tests
const testService = new UserService(new InMemoryRepository<User>());
```

## Explicación

La interfaz genérica `Repository<T, ID>` define el contrato. Las implementaciones
concretas manejan la persistencia, mientras que los servicios dependen solo de la
interfaz.

`MongooseRepository` mapea documentos de base de datos a entidades de dominio.
Esto mantiene los detalles específicos de Mongoose fuera del servicio.
`InMemoryRepository` permite testear servicios sin base de datos.

El parámetro `Repository<User, string>` en `UserService` hace la dependencia
explícita y reemplazable. Consultá
[Inyección de Dependencias](/patterns/dependency-injection-pattern/) para
estrategias de wiring.

## Variantes

| Variante | Propósito |
| --- | --- |
| Repositorio en memoria | Tests unitarios rápidos con Map como storage |
| Specification pattern | Componer objetos de consulta reutilizables |
| Unit of Work | Agrupar varias operaciones en una transacción |
| Separación lectura/escritura | Repositorios separados para queries y comandos en CQRS |

## Mejores Prácticas

- Devolver entidades de dominio, no documentos de base de datos.
- Mantener los repositorios enfocados en persistencia; las reglas de negocio van
  en los servicios.
- Inyectar la interfaz del repositorio, no la implementación concreta.
- Agregar paginación para `findAll` con muchos resultados.
- Usar transacciones para operaciones multi-paso.
- Manejar errores de conexión y constraints en el repositorio y traducirlos a
  excepciones de dominio.

## Errores Comunes

- Filtrar queries del ORM en los métodos del servicio.
- Devolver documentos crudos de base de datos en lugar de entidades mapeadas.
- Poner el manejo de transacciones dentro del repositorio en lugar del servicio.
- Crear repositorios tan genéricos que pierdan type safety.
- No manejar errores de base de datos o exponer excepciones del driver.
- Ignorar la paginación para conjuntos grandes.
- Mezclar lógica de negocio con lógica de acceso a datos.

## FAQ

### ¿Es el repository pattern excesivo para proyectos pequeños?

Para apps CRUD simples, active record suele ser suficiente. Usá repositorios
cuando necesitás testeabilidad, múltiples fuentes de datos o cambios de
almacenamiento. Consultá [Active Record Pattern](/patterns/active-record-pattern/)
para la alternativa.

### ¿En qué se diferencia de active record?

Active record mezcla acceso a datos y lógica de dominio. El repository pattern
los separa, haciendo la capa de dominio independiente de la persistencia.

### ¿Debería usar un repositorio por entidad o por aggregate root?

Usá un repositorio por aggregate root, no por entidad. Esto sigue los principios
de Domain-Driven Design y mantiene la consistencia dentro del aggregate.

### ¿Cómo testeo repositorios sin base de datos?

Creá una implementación en memoria de la interfaz del repositorio y usala en los
tests de los servicios. Esto evita setup de base de datos y hace los tests
determinísticos.

### ¿Cómo manejo la paginación?

Agregá parámetros `limit` y `offset` (o `page` y `size`) a `findAll`, y devolvé
un resultado paginado con metadata como el total.

### ¿Los repositorios deberían devolver DTOs o entidades de dominio?

Devolver entidades de dominio. Los DTOs son para respuestas de API y deberían
mapearse desde las entidades en el servicio o capa API.
