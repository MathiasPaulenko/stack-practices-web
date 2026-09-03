---
contentType: patterns
slug: repository-pattern
title: "Patrón Repository"
description: "Abstrae la lógica de acceso a datos detrás de una interfaz limpia. Patrón de diseño arquitectural para capas de datos testeables y mantenibles."
metaDescription: "Aprende el Patrón Repository con ejemplos prácticos en Python, Java y JavaScript. Patrón arquitectural para acceso a datos limpio y testeable."
difficulty: intermediate
topics:
  - architecture
tags:
  - repository
  - design-pattern
  - architecture
  - data-access
  - python
  - java
  - javascript
relatedResources:
  - /patterns/repository-pattern-typescript
  - /patterns/factory-pattern
  - /patterns/dependency-injection-pattern
  - /guides/vertical-slice-architecture-guide
  - /guides/layered-architecture-guide
  - /recipes/soft-deletes
lastUpdated: "2026-08-31"
publishedAt: "2026-06-10"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende el Patrón Repository con ejemplos prácticos en Python, Java y JavaScript. Patrón arquitectural para acceso a datos limpio y testeable."
  keywords:
    - repository pattern
    - patrón de diseño
    - patrón arquitectural
    - acceso a datos
    - persistencia
    - python repository
    - java repository
    - javascript repository
---

## Visión General

El Patrón Repository es un patrón de diseño arquitectural que media entre la
capa de dominio y las capas de mapeo de datos. Provee una interfaz similar a
una colección para acceder a objetos de dominio y abstrae los detalles de
almacenamiento y recuperación.

Es una base de Clean Architecture y Domain-Driven Design (DDD), y se usa en
frameworks como Spring Data JPA, Entity Framework y Django ORM.

## Cuándo Usar

- Necesitás desacoplar la lógica de negocio de la implementación de acceso a
  datos.
- Querés intercambiar fuentes de datos (base de datos, API, caché, archivo) sin
  cambiar código de negocio.
- Necesitás capas de datos testeables que puedan mockearse o reemplazarse con
  stores en memoria.
- La lógica de acceso a datos está dispersa y necesita centralización.
- Querés aplicar caché, logging o gestión de transacciones de forma uniforme.

### Cuándo evitarlo

- Aplicaciones CRUD pequeñas con una sola fuente de datos y sin necesidad de
  test doubles.
- Prototipos donde la capa extra agrega más fricción que valor.

## Solución

### Python

```python
from abc import ABC, abstractmethod
from typing import Optional

class User:
    def __init__(self, id: int, name: str):
        self.id = id
        self.name = name

class UserRepository(ABC):
    @abstractmethod
    def get_by_id(self, id: int) -> Optional[User]:
        pass

    @abstractmethod
    def save(self, user: User) -> None:
        pass

class InMemoryUserRepository(UserRepository):
    def __init__(self):
        self._users = {}

    def get_by_id(self, id: int) -> Optional[User]:
        return self._users.get(id)

    def save(self, user: User) -> None:
        self._users[user.id] = user

repo = InMemoryUserRepository()
repo.save(User(1, "Alice"))
print(repo.get_by_id(1).name)  # Alice
```

### JavaScript

```javascript
class User {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }
}

class UserRepository {
  getById(id) {
    throw new Error("Not implemented");
  }
  save(user) {
    throw new Error("Not implemented");
  }
}

class InMemoryUserRepository extends UserRepository {
  constructor() {
    super();
    this.users = new Map();
  }
  getById(id) {
    return this.users.get(id) ?? null;
  }
  save(user) {
    this.users.set(user.id, user);
  }
}

const repo = new InMemoryUserRepository();
repo.save(new User(1, "Alice"));
console.log(repo.getById(1).name); // Alice
```

### Java

```java
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

class User {
    int id;
    String name;
    User(int id, String name) { this.id = id; this.name = name; }
}

interface UserRepository {
    Optional<User> getById(int id);
    void save(User user);
}

class InMemoryUserRepository implements UserRepository {
    private final Map<Integer, User> users = new HashMap<>();

    public Optional<User> getById(int id) {
        return Optional.ofNullable(users.get(id));
    }

    public void save(User user) {
        users.put(user.id, user);
    }
}

UserRepository repo = new InMemoryUserRepository();
repo.save(new User(1, "Alice"));
System.out.println(repo.getById(1).map(u -> u.name).orElse("Unknown")); // Alice
```

## Explicación

El patrón separa el acceso a datos en dos capas:

- **Interfaz de Repository**: define qué operaciones están disponibles — como
  `find`, `save` y `delete` — sin exponer cómo se implementan.
- **Repository Concreto**: implementa la interfaz para un mecanismo de
  almacenamiento específico, como SQL, MongoDB, una REST API o un Map en
  memoria.

La lógica de negocio depende solo de la interfaz. Esto permite reemplazar la
implementación en memoria para tests y una implementación PostgreSQL o MongoDB
para producción sin tocar el código de negocio. Consultá
[Inyección de Dependencias](/patterns/dependency-injection-pattern/) para
estrategias comunes de wiring.

## Variantes

| Variante | Caso de uso | Trade-off |
| --- | --- | --- |
| [Generic Repository](/patterns/repository-pattern-typescript/) | CRUD para cualquier entidad con generics de TypeScript | Menos duplicación, pero menos margen para optimizar queries |
| Specification Pattern | Componer queries complejas con objetos reutilizables | Flexible, pero más difícil de optimizar a nivel de base de datos |
| Unit of Work | Agrupar varias operaciones en una sola transacción | Agrega complejidad, pero mantiene integridad de datos |

## Mejores Prácticas

- Devolver objetos de dominio, no filas crudas ni tipos específicos del ORM.
- Usar interfaces para que los repositorios sean testeables e intercambiables.
- Mantener los repositorios enfocados en acceso a datos; la lógica de negocio
  va en los servicios.
- Devolver `Optional` o tipos nullable para datos ausentes en lugar de lanzar
  excepciones.
- Agregar paginación en `findAll` para evitar cargar conjuntos enormes.
- Usar transacciones cuando varias operaciones deban ser atómicas.

## Errores Comunes

- Filtrar detalles del ORM en los servicios devolviendo objetos específicos de
  base de datos.
- Meter lógica de negocio dentro de los repositorios.
- Crear repositorios dios que manejen tipos de entidades no relacionadas.
- Ignorar transacciones entre operaciones que deberían ser atómicas.
- Cargar más datos de los necesarios porque la abstracción oculta el costo.

## FAQ

### ¿Es Repository lo mismo que DAO?

Son similares, pero un DAO suele ser más de bajo nivel y cercano a las tablas.
Un Repository es de más alto nivel y trabaja con aggregates de dominio. En la
práctica los términos suelen usarse indistintamente.

### ¿Necesito Repository si uso un ORM?

Sí. Los ORM manejan el mapeo; los repositorios agregan una capa semántica que
hace explícita la intención del acceso a datos y lo hace testeable.

### ¿Puedo usar Repository con bases NoSQL?

Sí. El patrón es agnóstico al storage. Podés tener `MongoUserRepository`,
`RedisUserRepository` y `PostgresUserRepository` implementando la misma
interfaz.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes puede agregar complejidad
innecesaria. Empezá simple e introducí el patrón cuando sientas el problema que
resuelve.

### ¿Repository o DAO: cuál uso?

Usá Repository cuando pensás en términos de dominio (User, Order) y querés
abstraer el storage por completo. Usá DAO cuando mapeás directamente a tablas y
necesitás queries específicas. Repository es domain-centric; DAO es
 table-centric.
