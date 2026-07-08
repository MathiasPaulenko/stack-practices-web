---
contentType: patterns
slug: data-access-object-pattern
title: "Patrón Data Access Object (DAO)"
description: "Abstrae y encapsula todo acceso a una fuente de datos exponiendo una interfaz limpia mientras oculta los detalles de persistencia de la lógica de negocio."
metaDescription: "Aprende el Patrón DAO para abstraer acceso a base de datos. Ejemplos en Python, Java y JavaScript con separación limpia entre persistencia y lógica de negocio."
difficulty: beginner
topics:
  - design
tags:
  - data-access-object
  - pattern
  - design-pattern
  - structural
  - persistence
  - database
  - repository
  - abstraction
relatedResources:
  - /patterns/design/repository-pattern
  - /patterns/design/active-record-pattern
  - /patterns/design/data-mapper-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón DAO para abstraer acceso a base de datos. Ejemplos en Python, Java y JavaScript con separación limpia entre persistencia y lógica de negocio."
  keywords:
    - data access object
    - dao pattern
    - design pattern
    - persistence
    - database abstraction
---

# Patrón Data Access Object (DAO)

## Descripción General

El Patrón Data Access Object (DAO) separa las operaciones de acceso a datos de bajo nivel de la lógica de negocio de alto nivel. Un DAO provee una interfaz limpia para crear, leer, actualizar y eliminar entidades, mientras encapsula los detalles de la base de datos o mecanismo de almacenamiento subyacente.

Este patrón es la base de la arquitectura limpia: el código de negocio llama `userDao.findById(42)` sin saber si los datos vienen de PostgreSQL, MongoDB o un cache en memoria.

## Cuándo Usar

Usa el Patrón DAO cuando:
- Quieres aislar la lógica de persistencia de la lógica de negocio
- La fuente de datos podría cambiar (SQL hoy, NoSQL mañana)
- Múltiples partes de la aplicación necesitan las mismas operaciones CRUD
- Necesitas centralizar la construcción de queries y el manejo de conexiones

## Cuándo Evitar

- La aplicación es un script pequeño donde SQL directo es más simple
- Estás usando un ORM completo que ya provee abstracciones tipo DAO
- La abstracción agrega más boilerplate que valor

## Solución

### Python

```python
from dataclasses import dataclass
from typing import Optional, List
import sqlite3

@dataclass
class User:
    id: int
    name: str
    email: str

class UserDao:
    def __init__(self, db_path: str):
        self.db_path = db_path

    def _connect(self):
        return sqlite3.connect(self.db_path)

    def find_by_id(self, user_id: int) -> Optional[User]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT id, name, email FROM users WHERE id = ?", (user_id,)
            ).fetchone()
            return User(*row) if row else None

    def find_all(self) -> List[User]:
        with self._connect() as conn:
            rows = conn.execute("SELECT id, name, email FROM users").fetchall()
            return [User(*row) for row in rows]

    def save(self, user: User) -> User:
        with self._connect() as conn:
            cursor = conn.execute(
                "INSERT INTO users (name, email) VALUES (?, ?)",
                (user.name, user.email)
            )
            user.id = cursor.lastrowid
            conn.commit()
            return user

    def delete(self, user_id: int):
        with self._connect() as conn:
            conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
            conn.commit()


# Uso
dao = UserDao("app.db")
user = dao.save(User(id=0, name="Alice", email="alice@example.com"))
found = dao.find_by_id(user.id)
print(found)
```

### Java

```java
import java.sql.*;
import java.util.*;

public record User(int id, String name, String email) {}

public interface UserDao {
    Optional<User> findById(int id);
    List<User> findAll();
    User save(User user);
    void delete(int id);
}

public class SqlUserDao implements UserDao {
    private final Connection conn;

    public SqlUserDao(Connection conn) {
        this.conn = conn;
    }

    public Optional<User> findById(int id) {
        try (PreparedStatement ps = conn.prepareStatement(
            "SELECT id, name, email FROM users WHERE id = ?")) {
            ps.setInt(1, id);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return Optional.of(new User(rs.getInt(1), rs.getString(2), rs.getString(3)));
            }
        } catch (SQLException e) { throw new RuntimeException(e); }
        return Optional.empty();
    }

    public List<User> findAll() {
        List<User> users = new ArrayList<>();
        try (Statement st = conn.createStatement()) {
            ResultSet rs = st.executeQuery("SELECT id, name, email FROM users");
            while (rs.next()) {
                users.add(new User(rs.getInt(1), rs.getString(2), rs.getString(3)));
            }
        } catch (SQLException e) { throw new RuntimeException(e); }
        return users;
    }

    public User save(User user) {
        try (PreparedStatement ps = conn.prepareStatement(
            "INSERT INTO users (name, email) VALUES (?, ?)", Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, user.name());
            ps.setString(2, user.email());
            ps.executeUpdate();
            ResultSet keys = ps.getGeneratedKeys();
            keys.next();
            return new User(keys.getInt(1), user.name(), user.email());
        } catch (SQLException e) { throw new RuntimeException(e); }
    }

    public void delete(int id) {
        try (PreparedStatement ps = conn.prepareStatement(
            "DELETE FROM users WHERE id = ?")) {
            ps.setInt(1, id);
            ps.executeUpdate();
        } catch (SQLException e) { throw new RuntimeException(e); }
    }
}

// Uso
UserDao dao = new SqlUserDao(conn);
User saved = dao.save(new User(0, "Alice", "alice@example.com"));
System.out.println(dao.findById(saved.id()).orElseThrow());
```

### JavaScript

```javascript
class UserDao {
  constructor(db) {
    this.db = db;
  }

  async findById(userId) {
    const row = await this.db.get(
      'SELECT id, name, email FROM users WHERE id = ?', userId
    );
    return row || null;
  }

  async findAll() {
    return this.db.all('SELECT id, name, email FROM users');
  }

  async save(user) {
    const result = await this.db.run(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      user.name, user.email
    );
    return { id: result.lastID, name: user.name, email: user.email };
  }

  async delete(userId) {
    await this.db.run('DELETE FROM users WHERE id = ?', userId);
  }
}

// Uso
const dao = new UserDao(db);
const saved = await dao.save({ name: 'Alice', email: 'alice@example.com' });
const found = await dao.findById(saved.id);
console.log(found);
```

## Explicación

El Patrón DAO separa concerns mediante:

- **Interface**: Define el contrato para operaciones CRUD en términos de dominio
- **Implementación**: Maneja SQL, manejo de conexiones y mapeo
- **Consumidor**: Lógica de negocio que depende solo de la interface

Si la base de datos cambia de MySQL a MongoDB, solo cambia la implementación del DAO. El código de negocio permanece intacto.

## Variantes

| Variante | Nivel de Abstracción | Caso de Uso |
|----------|----------------------|-------------|
| **Table DAO** | Un DAO por tabla | Aplicaciones CRUD simples |
| **Generic DAO** | `BaseDao<T>` | Reduce boilerplate con generics |
| **Repository** | Queries domain-driven | `findByEmail`, `findActiveSince` |
| **Active Record** | Entidad conoce su DAO | Modelos simples con persistencia built-in |

## Lo que funciona

- **Retorna objetos de dominio, no raw result sets.** Mapea filas de base de datos a clases de entidad en el boundary del DAO.
- **Usa una interface.** Esto habilita mocking para tests y swapping de implementaciones.
- **Centraliza transacciones.** La capa DAO debería manejar el ciclo de vida de conexiones, no los callers.
- **No leak excepciones SQL.** Wrap excepciones SQL checked en excepciones runtime específicas del dominio.
- **Operaciones batch** al insertar o actualizar muchas filas para reducir round trips.

## Errores Comunes

- **SQL esparcido en lógica de negocio** anula el propósito. Toda construcción de queries pertenece al DAO.
- **Retornar ResultSets** desde métodos DAO leak el mecanismo de persistencia y hace difícil testear callers.
- **Sin interface** significa que cada consumidor está fuertemente acoplado a una base de datos específica.
- **DAO como God class** con 50 métodos es una señal de pobre modelado de dominio. Divide en DAOs enfocados.
- **Manejar conexiones por query** en lugar de reutilizarlas o poollas mata el performance.

## Ejemplos del Mundo Real

### JDBC

JDBC de Java es un toolkit DAO de bajo nivel. `PreparedStatement`, `ResultSet` y `Connection` son los bloques de construcción que la mayoría de DAOs Java usan internamente.

### Django ORM

El ORM de Django abstrae acceso a tablas mediante managers de Model. `User.objects.filter(email="alice@example.com")` es una query estilo DAO.

### Node.js Knex.js

Knex provee un query builder que actúa como capa DAO. `knex('users').where({ id: 42 }).first()` abstrae SQL raw.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre DAO y Repository?**
A: DAO es persistence-centric (uno por tabla, CRUD-focused). [Repository](/patterns/design/repository-pattern) es domain-centric (uno por aggregate, query-focused).

**Q: Cada tabla debería tener su propio DAO?**
A: Usualmente sí, pero para aplicaciones pequeñas un `BaseDao<T>` genérico reduce boilerplate.

**Q: Cómo manejo transacciones con DAOs?**
A: Usa un patrón unit of work o pasa un contexto de transacción a métodos DAO para que múltiples DAOs compartan la misma conexión.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.

## Soluciones Avanzadas

### DAO genérico con TypeScript para reducir boilerplate

Un DAO base genérico elimina código CRUD repetitivo a través de múltiples entidades:

```typescript
import { Pool } from 'pg';

export interface Entity {
  id: number;
}

export abstract class BaseDao<T extends Entity> {
  constructor(
    protected pool: Pool,
    protected tableName: string,
    protected columns: string[]
  ) {}

  async findById(id: number): Promise<T | null> {
    const result = await this.pool.query(
      `SELECT ${this.columns.join(', ')} FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findAll(): Promise<T[]> {
    const result = await this.pool.query(
      `SELECT ${this.columns.join(', ')} FROM ${this.tableName}`
    );
    return result.rows;
  }

  async save(entity: Omit<T, 'id'>): Promise<T> {
    const columns = Object.keys(entity);
    const values = Object.values(entity);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const result = await this.pool.query(
      `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async update(id: number, updates: Partial<T>): Promise<T> {
    const setClause = Object.keys(updates)
      .map((key, i) => `${key} = $${i + 2}`)
      .join(', ');
    const values = [...Object.values(updates), id];

    const result = await this.pool.query(
      `UPDATE ${this.tableName} SET ${setClause} WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async delete(id: number): Promise<void> {
    await this.pool.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
  }
}

// DAO concreto para entidad User
interface User extends Entity {
  name: string;
  email: string;
  created_at: Date;
}

class UserDao extends BaseDao<User> {
  constructor(pool: Pool) {
    super(pool, 'users', ['id', 'name', 'email', 'created_at']);
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT id, name, email, created_at FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }
}

// Uso
const pool = new Pool({ connectionString: 'postgres://localhost/app' });
const userDao = new UserDao(pool);
const user = await userDao.save({ name: 'Alice', email: 'alice@example.com', created_at: new Date() });
```

### DAO con connection pooling y soporte de transacciones

Los DAOs de producción necesitan connection pooling y manejo de transacciones para performance y consistencia de datos:

```python
import psycopg2
from psycopg2 import pool
from contextlib import contextmanager
from typing import Optional, List, Callable, Any
from dataclasses import dataclass

@dataclass
class User:
    id: int
    name: str
    email: str

class UserDao:
    def __init__(self, min_conn: int = 1, max_conn: int = 10):
        self.connection_pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=min_conn,
            maxconn=max_conn,
            dsn="postgresql://user:pass@localhost/app"
        )

    @contextmanager
    def _get_connection(self):
        """Context manager para el ciclo de vida de conexión."""
        conn = self.connection_pool.getconn()
        try:
            yield conn
        finally:
            self.connection_pool.putconn(conn)

    def find_by_id(self, user_id: int) -> Optional[User]:
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, name, email FROM users WHERE id = %s",
                    (user_id,)
                )
                row = cur.fetchone()
                return User(*row) if row else None

    def find_all(self) -> List[User]:
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, name, email FROM users")
                return [User(*row) for row in cur.fetchall()]

    def save(self, user: User) -> User:
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO users (name, email) VALUES (%s, %s) RETURNING id",
                    (user.name, user.email)
                )
                user.id = cur.fetchone()[0]
                conn.commit()
                return user

    def transaction(self, operations: Callable[[Any], Any]):
        """Ejecuta múltiples operaciones en una sola transacción."""
        with self._get_connection() as conn:
            try:
                with conn.cursor() as cur:
                    operations(cur)
                conn.commit()
            except Exception:
                conn.rollback()
                raise

# Uso con transacción
dao = UserDao()

def transfer_user_data(cur):
    """Transfiere datos de usuario entre tablas en una transacción."""
    cur.execute("INSERT INTO users_archive SELECT * FROM users WHERE id = %s", (42,))
    cur.execute("DELETE FROM users WHERE id = %s", (42,))

dao.transaction(transfer_user_data)
```

### DAO con capa de caching para workloads intensivos en lectura

Añade una capa de cache al DAO para reducir la carga de base de datos para datos frecuentemente accedidos:

```python
from functools import lru_cache
from typing import Optional
import hashlib
import json

class CachedUserDao(UserDao):
    def __init__(self, db_path: str, cache_ttl: int = 300):
        super().__init__(db_path)
        self.cache_ttl = cache_ttl
        self._cache = {}

    def _cache_key(self, method: str, *args) -> str:
        """Genera una clave de cache desde nombre de método y argumentos."""
        key_data = f"{method}:{args}"
        return hashlib.md5(key_data.encode()).hexdigest()

    def _get_from_cache(self, key: str) -> Optional[User]:
        """Recupera del cache si no ha expirado."""
        if key in self._cache:
            data, timestamp = self._cache[key]
            if time.time() - timestamp < self.cache_ttl:
                return data
            del self._cache[key]
        return None

    def _set_cache(self, key: str, user: User):
        """Almacena en cache con timestamp actual."""
        self._cache[key] = (user, time.time())

    def find_by_id(self, user_id: int) -> Optional[User]:
        key = self._cache_key("find_by_id", user_id)
        cached = self._get_from_cache(key)
        if cached:
            return cached

        user = super().find_by_id(user_id)
        if user:
            self._set_cache(key, user)
        return user

    def save(self, user: User) -> User:
        """Invalida cache en save."""
        saved = super().save(user)
        # Invalida todas las entradas de cache relacionadas con usuario
        self._cache.clear()
        return saved

    def delete(self, user_id: int):
        """Invalida cache en delete."""
        super().delete(user_id)
        self._cache.clear()
```

## Mejores Practicas Adicionales

1. **Usa query builders para queries complejas.** Los strings SQL raw se vuelven inmanejables para joins, subqueries y condiciones dinámicas. Librerías como SQLAlchemy (Python), jOOQ (Java) o Knex.js (JavaScript) construyen queries programáticamente:

```python
# Usando SQLAlchemy query builder
from sqlalchemy import select, and_

def find_active_users_since(self, since: datetime) -> List[User]:
    stmt = select(User).where(
        and_(
            User.created_at >= since,
            User.is_active == True
        )
    )
    with self._connect() as conn:
        return conn.execute(stmt).scalars().all()
```

2. **Implementa paginación para result sets grandes.** Obtener todas las filas a la vez causa problemas de memoria y respuestas lentas:

```python
def find_paginated(self, page: int, page_size: int = 50) -> List[User]:
    offset = (page - 1) * page_size
    with self._connect() as conn:
        rows = conn.execute(
            "SELECT id, name, email FROM users LIMIT ? OFFSET ?",
            (page_size, offset)
        ).fetchall()
        return [User(*row) for row in rows]
```

## Errores Comunes Adicionales

1. **No manejar el agotamiento de conexiones.** Abrir una nueva conexión para cada query agota el connection pool bajo carga. Siempre usa connection pooling y reutiliza conexiones. Monitorea métricas de pool (conexiones activas, tiempo de espera) para identificar agotamiento antes de que cause interrupciones.

2. **Problema N+1 query en métodos DAO.** Un método DAO que obtiene una lista de entidades y luego llama otro método DAO para cada entidad causa N+1 queries. Usa eager loading con joins o batch fetching para hacer un solo round-trip:

```python
# Mal: N+1 queries
def find_users_with_orders(self):
    users = self.find_all()
    for user in users:
        user.orders = self.order_dao.find_by_user_id(user.id)  # N queries
    return users

# Bien: Query único con join
def find_users_with_orders(self):
    with self._connect() as conn:
        rows = conn.execute("""
            SELECT u.id, u.name, u.email, o.id as order_id, o.total
            FROM users u
            LEFT JOIN orders o ON u.id = o.user_id
        """).fetchall()
        # Mapea a usuarios con orders
```

## FAQs Adicionales

### Cómo manejo migraciones de schema con DAOs?

Los DAOs dependen del schema de base de datos. Cuando el schema cambia, los DAOs deben actualizarse en sincronía. Usa herramientas de migración (Flyway para Java, Alembic para Python, Knex migrations para Node.js) para versionar cambios de schema. Ejecuta migraciones como parte del deployment. Mantén los DAOs en sincronía probando contra el schema migrado.

### Los DAOs deberían manejar validación?

No. La validación pertenece a la capa de dominio o clases de entidad. Los DAOs deberían confiar que los datos que reciben son válidos. Esto mantiene el DAO enfocado solo en persistencia. Valida antes de llamar métodos DAO, no dentro de ellos.

### Cómo pruebo DAOs sin una base de datos real?

Usa una base de datos en memoria (H2 para Java, SQLite para Python, better-sqlite3 para Node.js) en tests. Configura el DAO para usar la base de datos en memoria durante test runs. Esto provee tests rápidos y aislados sin requerir una instancia de base de datos real. Para tests de integración, usa Docker para levantar una base de datos real.
