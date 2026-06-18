---
contentType: patterns
slug: repository-pattern-typescript
title: "Repository Pattern con Generics de TypeScript"
description: "Implementa el Repository pattern con generics de TypeScript que desacopla logica de acceso a datos de servicios de dominio usando generics e interfaces"
metaDescription: "Repository pattern en TypeScript con generics. Desacopla acceso a datos de logica de dominio con repositorios type-safe, interfaces e inyeccion de dependencias limpia."
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
  - /patterns/design/adapter-pattern-api
  - /recipes/database-indexing
  - /guides/database-design-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Repository pattern en TypeScript con generics. Desacopla acceso a datos de logica de dominio con repositorios type-safe, interfaces e inyeccion de dependencias limpia."
  keywords:
    - repository pattern
    - typescript generics
    - data access layer
    - architecture pattern
    - clean architecture
---

# Repository Pattern con Generics de TypeScript

El Repository pattern media entre las capas de dominio y mapeo de datos. Actua como una coleccion en memoria de objetos de dominio, abstrayendo detalles de persistencia para que tus servicios permanezcan enfocados en logica de negocio.

## Cuando Usar Esto

- Quieres cambiar tecnologias de base de datos sin tocar logica de negocio
- Los tests unitarios deben ejecutarse sin una base de datos real
- Multiples servicios de dominio comparten patrones de consulta similares

## Problema

Consultas a base de datos dispersas a traves de servicios hacen los tests imposibles, migraciones riesgosas y la optimizacion de consultas una busqueda en todo el codigo.

## Solucion

```typescript
// repositories/Repository.ts
interface Repository<T, ID> {
  findById(id: ID): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(id: ID, entity: Partial<T>): Promise<T | null>;
  delete(id: ID): Promise<boolean>;
}

// repositories/MongooseRepository.ts
import { Model, Types } from 'mongoose';

class MongooseRepository<T extends { id: string }> implements Repository<T, string> {
  constructor(private model: Model<any>) {}

  async findById(id: string): Promise<T | null> {
    const doc = await this.model.findById(id).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async findAll(filter: Record<string, any> = {}): Promise<T[]> {
    const docs = await this.model.find(filter).lean();
    return docs.map(this.toEntity);
  }

  async create(data: Omit<T, 'id'>): Promise<T> {
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

// domain/User.ts
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

// services/UserService.ts
class UserService {
  constructor(private userRepo: Repository<User, string>) {}

  async promoteToAdmin(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error('Usuario no encontrado');
    return this.userRepo.update(userId, { role: 'admin' });
  }
}
```

## Uso

```typescript
const userRepo = new MongooseRepository<User>(UserModel);
const userService = new UserService(userRepo);
```

## Variaciones

- **In-Memory Repository**: Para tests unitarios con una implementacion respaldada por Map
- **Specification Pattern**: Compone filtros de consulta como objetos de especificacion reutilizables
- **Unit of Work**: Agrupa multiples operaciones de repositorio en una sola transaccion

## Mejores Practicas

- Retorna entidades de dominio, no documentos de base de datos, desde metodos de repositorio
- Manten los repositorios enfocados en persistencia; las reglas de negocio van en servicios
- Inyecta la interfaz del repositorio, no la implementacion concreta

## Errores Comunes

- Fugando queries de ORM en metodos de servicio
- Retornar documentos de base de datos en lugar de entidades mapeadas
- Poner manejo de transacciones dentro del repositorio en lugar de la capa de servicio

## FAQ

**P: El Repository pattern es excesivo para proyectos pequenos?**
R: Para apps CRUD simples, active record esta bien. Usa repositorios cuando necesites testeabilidad, multiples fuentes de datos o logica de consulta compleja.

**P: Como se compara con el Active Record pattern?**
R: Active Record mezcla acceso a datos y logica de dominio. Repository los separa, haciendo la capa de dominio independiente de la persistencia.
