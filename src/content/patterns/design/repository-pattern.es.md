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
  - architectural
  - architecture
  - data-access
  - design-pattern
  - java
  - javascript
  - pattern
  - python
  - repository
relatedResources:
  - /patterns/mvc-pattern
  - /recipes/sql-joins
  - /patterns/factory-pattern
  - /recipes/dependency-injection
  - /guides/domain-driven-design-guide
  - /guides/layered-architecture-guide
  - /guides/onion-architecture-guide
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
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

# Patrón Repository

## Visión general

El [Patrón Repository](/patterns/design/repository-pattern-typescript) es un patrón de diseño arquitectural que media entre la capa de dominio y las capas de mapeo de datos usando una interfaz similar a una colección para acceder a objetos de dominio. Abstrae los detalles de almacenamiento y recuperación de datos.

Es la base de clean architecture, Domain-Driven Design (DDD) y se usa ampliamente en frameworks como Spring Data JPA, Entity Framework y Django ORM.

## Cuándo usarlo

Usa el Patrón Repository cuando:
- Necesitas desacoplar la lógica de negocio de la implementación de acceso a datos
- Quieres intercambiar fuentes de datos (base de datos, API, caché, archivo) sin cambiar código de negocio
- Necesitas capas de datos testeables que puedan ser mockeadas
- Tu lógica de acceso a datos está dispersa por la base de código y necesita centralización
- Quieres aplicar caché, logging o gestión de transacciones de forma uniforme

## Solución

### Python

```python
from abc import ABC, abstractmethod
from typing import List, Optional

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

# Uso
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
    return this.users.get(id);
  }
  save(user) {
    this.users.set(user.id, user);
  }
}

// Uso
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

// Uso
UserRepository repo = new InMemoryUserRepository();
repo.save(new User(1, "Alice"));
System.out.println(repo.getById(1).map(u -> u.name).orElse("Unknown")); // Alice
```

## Explicación

El Patrón Repository separa el acceso a datos en dos capas:

- **Interfaz Repository**: Define qué operaciones están disponibles (find, save, delete) sin exponer cómo se implementan
- **Repository concreto**: Implementa la interfaz para un mecanismo de almacenamiento específico (base de datos SQL, en memoria, API REST)

La lógica de negocio depende solo de la interfaz, por lo que puedes intercambiar implementaciones para testing (en memoria) o producción (PostgreSQL, MongoDB) sin tocar código de negocio.

## Variantes

| Variante | Caso de uso | Compromiso |
|----------|-------------|------------|
| **[Repository Genérico](/patterns/design/repository-pattern-typescript)** | CRUD para cualquier tipo de entidad | Menos duplicación de código, pero menos optimización de queries específicas |
| **Specification Pattern** | Composición de queries complejas | Muy flexible, pero más difícil de optimizar a nivel de base de datos |
| **Unit of Work** | Lote de múltiples operaciones en una sola transacción | Añade complejidad, pero esencial para integridad de datos |

## Lo que funciona

- **Retorna objetos de dominio, no filas de datos crudos**: Mapea resultados de base de datos a objetos de dominio ricos
- **Usa interfaces para repositories**: Esto es lo que los hace testeables e intercambiables. Consulta [Inyección de Dependencias](/patterns/design/dependency-injection-pattern) para estrategias de wiring.
- **Mantén los repositories enfocados en acceso a datos**: La lógica de negocio pertenece a servicios, no a repositories
- **Retorna `Optional` o tipos nullable** en lugar de lanzar excepciones para datos faltantes
- **Considera paginación** para operaciones `findAll` para prevenir cargar datasets masivos

## Errores comunes

- **Filtrar detalles del ORM**: Retornar objetos específicos del ORM en lugar de objetos de dominio planos
- **Lógica de negocio en repositories**: Los repositories solo deben buscar y persistir; la lógica pertenece a servicios
- **God repositories**: Un único repository manejando tipos de entidades no relacionados
- **Ignorar transacciones**: Múltiples operaciones de repository que deberían ser atómicas pero no están envueltas en una transacción
- **Carga eager de todo**: Traer más datos de los necesarios porque la abstracción oculta el costo de la query

## Preguntas frecuentes

**P: ¿Es Repository lo mismo que DAO (Data Access Object)?**
R: Similar, pero DAO es típicamente de más bajo nivel y más cercano a la base de datos. Repository es de más alto nivel y trabaja con agregados de dominio. En la práctica, los términos se usan a menudo indistintamente.

**P: ¿Necesito Repository si uso un ORM?**
R: Sí. Los ORMs manejan el mapeo, pero los repositories añaden una capa semántica que hace explícita la intención del acceso a datos y lo hace testeable.

**P: ¿Puedo usar Repository con bases de datos NoSQL?**
R: Absolutamente. El patrón es agnóstico al almacenamiento. Puedes tener `MongoUserRepository`, `RedisUserRepository` y `PostgresUserRepository` implementando la misma interfaz.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.


## Temas Avanzados

### Escenario: Repository para Multi-DB con TypeORM

```typescript
// Repository pattern: abstraer acceso a datos
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(opts: QueryOpts): Promise<User[]>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}

// Implementacion PostgreSQL
class PostgresUserRepository implements UserRepository {
  constructor(private pool: Pool) {}
  async findById(id: string): Promise<User | null> {
    const res = await this.pool.query("SELECT * FROM users WHERE id = $1", [id]);
    return res.rows[0] || null;
  }
  async findByEmail(email: string): Promise<User | null> {
    const res = await this.pool.query("SELECT * FROM users WHERE email = $1", [email]);
    return res.rows[0] || null;
  }
  async findAll(opts: QueryOpts): Promise<User[]> {
    const limit = opts.limit || 50;
    const offset = opts.offset || 0;
    const res = await this.pool.query("SELECT * FROM users LIMIT $1 OFFSET $2", [limit, offset]);
    return res.rows;
  }
  async save(user: User): Promise<User> {
    if (user.id) {
      const res = await this.pool.query(
        "UPDATE users SET name=$1, email=$2 WHERE id=$3 RETURNING *",
        [user.name, user.email, user.id]
      );
      return res.rows[0];
    }
    const res = await this.pool.query(
      "INSERT INTO users (id, name, email) VALUES ($1, $2, $3) RETURNING *",
      [crypto.randomUUID(), user.name, user.email]
    );
    return res.rows[0];
  }
  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM users WHERE id = $1", [id]);
  }
}

// Implementacion MongoDB
class MongoUserRepository implements UserRepository {
  constructor(private collection: Collection) {}
  async findById(id: string): Promise<User | null> {
    return this.collection.findOne({ _id: new ObjectId(id) });
  }
  async save(user: User): Promise<User> {
    if (user._id) {
      await this.collection.updateOne({ _id: user._id }, { $set: user });
      return user;
    }
    const res = await this.collection.insertOne(user);
    return { ...user, _id: res.insertedId };
  }
}

// Uso: el servicio no sabe que DB se usa
class UserService {
  constructor(private repo: UserRepository) {}
  async getUser(id: string) { return this.repo.findById(id); }
  async createUser(data: NewUser) { return this.repo.save(data); }
}

// En tests: usar mock repository
class MockUserRepository implements UserRepository {
  private users = new Map<string, User>();
  async findById(id: string) { return this.users.get(id) || null; }
  async save(user: User) { this.users.set(user.id, user); return user; }
}
```

Lecciones:
  - Repository abstrae el acceso a datos del dominio
  - El servicio no conoce SQL, MongoDB ni detalles de storage
  - Cambiar de DB solo requiere nueva implementacion del repository
  - En tests, usar mock o in-memory repository
  - Repository vs DAO: repository es domain-centric, DAO es table-centric
```

### Repository vs DAO: cual uso?

Usa Repository cuando piensas en terminos de dominio (User, Order) y quieres abstraer el storage completo. Usa DAO cuando mapeas directamente tablas y necesitas queries especificas. Repository devuelve agregados de dominio; DAO devuelve filas. Repository es mas alto nivel; DAO es mas bajo nivel. Para microservicios, Repository es preferible: el dominio no debe conocer SQL.
