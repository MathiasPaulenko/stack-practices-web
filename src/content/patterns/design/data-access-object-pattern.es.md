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
