---
contentType: patterns
slug: unit-of-work-pattern
title: "Patrón Unit of Work"
description: "Trackea cambios a objetos en memoria durante una transacción de negocio y commitea todas las actualizaciones atómicamente a la base de datos, asegurando consistencia."
metaDescription: "Aprende el Patrón Unit of Work para transacciones atómicas. Ejemplos en Python, Java y JavaScript con change tracking y commit batch."
difficulty: intermediate
topics:
  - design
  - databases
tags:
  - unit-of-work
  - pattern
  - design-pattern
  - structural
  - transactions
  - databases
  - orm
relatedResources:
  - /patterns/design/data-mapper-pattern
  - /patterns/design/data-access-object-pattern
  - /patterns/design/active-record-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Unit of Work para transacciones atómicas. Ejemplos en Python, Java y JavaScript con change tracking y commit batch."
  keywords:
    - unit of work
    - design pattern
    - transactions
    - databases
    - orm
---

# Patrón Unit of Work

## Descripción General

El Patrón Unit of Work mantiene una lista de objetos afectados por una transacción de negocio y coordina la escritura de cambios a la base de datos como una única operación atómica. En lugar de guardar cada cambio de entidad inmediatamente, el Unit of Work trackea inserciones, actualizaciones y eliminaciones, luego las commitea todas juntas — o las hace rollback todas en caso de fallo.

Este patrón es esencial para consistencia transaccional. Previene actualizaciones parciales donde un objeto es guardado y otro falla, dejando la base de datos en un estado inconsistente. ORMs como la `Session` de Hibernate y `DbContext` de Entity Framework son implementaciones de Unit of Work.

## Cuándo Usar

Usa el Patrón Unit of Work cuando:
- Múltiples objetos deben ser actualizados atómicamente dentro de una transacción de negocio
- Necesitas batch de operaciones de base de datos para performance
- Los cambios abarcan múltiples repositories o mappers
- La consistencia es más importante que la persistencia inmediata

## Cuándo Evitar

- Actualizaciones de un solo objeto donde la persistencia inmediata es más simple
- Transacciones de solo lectura (sin cambios para trackear)
- Cuando el boundary de transacción es poco claro y el unit of work crece demasiado
- Modelos de consistencia eventual donde procesamiento asíncrono es preferido

## Solución

### Python

```python
from typing import List, Dict, Set, Any, Optional
from dataclasses import dataclass
from enum import Enum, auto

class ChangeAction(Enum):
    INSERT = auto()
    UPDATE = auto()
    DELETE = auto()

@dataclass
class Change:
    entity: Any
    action: ChangeAction

class UnitOfWork:
    def __init__(self, connection):
        self._conn = connection
        self._changes: List[Change] = []
        self._identity_map: Dict[Any, Any] = {}
        self._committed = False

    def register_new(self, entity):
        self._changes.append(Change(entity, ChangeAction.INSERT))

    def register_dirty(self, entity):
        # Evitar tracking dirty duplicado
        if not any(c.entity is entity and c.action == ChangeAction.UPDATE for c in self._changes):
            self._changes.append(Change(entity, ChangeAction.UPDATE))

    def register_deleted(self, entity):
        self._changes.append(Change(entity, ChangeAction.DELETE))

    def commit(self):
        if self._committed:
            raise RuntimeError("Already committed")
        try:
            for change in self._changes:
                if change.action == ChangeAction.INSERT:
                    self._insert(change.entity)
                elif change.action == ChangeAction.UPDATE:
                    self._update(change.entity)
                elif change.action == ChangeAction.DELETE:
                    self._delete(change.entity)
            self._conn.commit()
            self._committed = True
        except Exception:
            self._conn.rollback()
            raise

    def _insert(self, entity):
        cursor = self._conn.execute(
            "INSERT INTO users (name, email) VALUES (?, ?)",
            (entity.name, entity.email)
        )
        entity.id = cursor.lastrowid

    def _update(self, entity):
        self._conn.execute(
            "UPDATE users SET name = ?, email = ? WHERE id = ?",
            (entity.name, entity.email, entity.id)
        )

    def _delete(self, entity):
        self._conn.execute("DELETE FROM users WHERE id = ?", (entity.id,))


# Modelo de dominio
class User:
    def __init__(self, name: str, email: str):
        self.id = None
        self.name = name
        self.email = email


# Uso
import sqlite3
conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)")

uow = UnitOfWork(conn)
user1 = User("Alice", "alice@example.com")
user2 = User("Bob", "bob@example.com")

uow.register_new(user1)
uow.register_new(user2)
user2.email = "bob2@example.com"
uow.register_dirty(user2)

uow.commit()
print(f"Alice ID: {user1.id}, Bob ID: {user2.id}")
```

### Java

```java
import java.sql.*;
import java.util.*;

public class User {
    private Integer id;
    private String name;
    private String email;

    public User(String name, String email) {
        this.name = name;
        this.email = email;
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}

enum ChangeAction { INSERT, UPDATE, DELETE }

record Change(User entity, ChangeAction action) {}

class UnitOfWork {
    private final Connection conn;
    private final List<Change> changes = new ArrayList<>();
    private boolean committed = false;

    public UnitOfWork(Connection conn) { this.conn = conn; }

    public void registerNew(User entity) { changes.add(new Change(entity, ChangeAction.INSERT)); }
    public void registerDirty(User entity) { changes.add(new Change(entity, ChangeAction.UPDATE)); }
    public void registerDeleted(User entity) { changes.add(new Change(entity, ChangeAction.DELETE)); }

    public void commit() throws SQLException {
        if (committed) throw new IllegalStateException("Already committed");
        try {
            for (Change change : changes) {
                switch (change.action()) {
                    case INSERT -> insert(change.entity());
                    case UPDATE -> update(change.entity());
                    case DELETE -> delete(change.entity());
                }
            }
            conn.commit();
            committed = true;
        } catch (SQLException e) {
            conn.rollback();
            throw e;
        }
    }

    private void insert(User user) throws SQLException {
        try (PreparedStatement stmt = conn.prepareStatement(
                "INSERT INTO users (name, email) VALUES (?, ?)", Statement.RETURN_GENERATED_KEYS)) {
            stmt.setString(1, user.getName());
            stmt.setString(2, user.getEmail());
            stmt.executeUpdate();
            try (ResultSet keys = stmt.getGeneratedKeys()) {
                if (keys.next()) user.setId(keys.getInt(1));
            }
        }
    }

    private void update(User user) throws SQLException {
        try (PreparedStatement stmt = conn.prepareStatement(
                "UPDATE users SET name = ?, email = ? WHERE id = ?")) {
            stmt.setString(1, user.getName());
            stmt.setString(2, user.getEmail());
            stmt.setInt(3, user.getId());
            stmt.executeUpdate();
        }
    }

    private void delete(User user) throws SQLException {
        try (PreparedStatement stmt = conn.prepareStatement("DELETE FROM users WHERE id = ?")) {
            stmt.setInt(1, user.getId());
            stmt.executeUpdate();
        }
    }
}

// Uso
Connection conn = DriverManager.getConnection("jdbc:sqlite::memory:");
conn.createStatement().execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)");

UnitOfWork uow = new UnitOfWork(conn);
User alice = new User("Alice", "alice@example.com");
User bob = new User("Bob", "bob@example.com");

uow.registerNew(alice);
uow.registerNew(bob);
uow.commit();
```

### JavaScript

```javascript
class User {
  constructor(name, email) {
    this.id = null;
    this.name = name;
    this.email = email;
  }
}

const ChangeAction = {
  INSERT: 'INSERT',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
};

class UnitOfWork {
  constructor(db) {
    this.db = db;
    this.changes = [];
    this.committed = false;
  }

  registerNew(entity) {
    this.changes.push({ entity, action: ChangeAction.INSERT });
  }

  registerDirty(entity) {
    this.changes.push({ entity, action: ChangeAction.UPDATE });
  }

  registerDeleted(entity) {
    this.changes.push({ entity, action: ChangeAction.DELETE });
  }

  async commit() {
    if (this.committed) throw new Error('Already committed');
    try {
      for (const change of this.changes) {
        if (change.action === ChangeAction.INSERT) await this.insert(change.entity);
        else if (change.action === ChangeAction.UPDATE) await this.update(change.entity);
        else if (change.action === ChangeAction.DELETE) await this.delete(change.entity);
      }
      this.committed = true;
    } catch (e) {
      throw e;
    }
  }

  async insert(user) {
    const result = await this.db.run(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      [user.name, user.email]
    );
    user.id = result.lastID;
  }

  async update(user) {
    await this.db.run(
      'UPDATE users SET name = ?, email = ? WHERE id = ?',
      [user.name, user.email, user.id]
    );
  }

  async delete(user) {
    await this.db.run('DELETE FROM users WHERE id = ?', [user.id]);
  }
}

// Uso
// const uow = new UnitOfWork(db);
// uow.registerNew(new User('Alice', 'alice@example.com'));
// await uow.commit();
```

## Explicación

Unit of Work resuelve dos problemas:

1. **Atomicidad**: Todos los cambios tienen éxito o ninguno lo hace. Sin actualizaciones parciales.
2. **Change tracking**: La aplicación modifica objetos en memoria libremente. El Unit of Work registra qué cambió y lo escribe eficientemente.

El patrón coordina entre:
- **Objetos de dominio**: Modificados libremente durante la transacción
- **Data mappers/repositories**: Deferred hasta el commit
- **Base de datos**: Recibe operaciones en batch dentro de una transacción

## Variantes

| Variante | Método de Tracking | Caso de Uso |
|----------|-------------------|-------------|
| **Caller registration** | App llama explícitamente `registerDirty()` | Control explícito sobre qué se guarda |
| **Object registration** | Objeto de dominio notifica al UoW en cambio | Tracking dirty automático |
| **Proxy-based** | Proxies interceptan setters para trackear cambios | Transparente al modelo de dominio |
| **Snapshot** | Compara estado actual contra snapshot cargado | Funciona con objetos inmutables |

## Lo que Funciona

- **Un Unit of Work por transacción.** No reutilices un UoW commiteado.
- **Mantén transacciones cortas.** UoWs de larga duración retienen locks y acumulan estado.
- **Usa Identity Map junto con UoW.** Los dos patrones se complementan perfectamente.
- **Commit en el boundary.** La capa de controller o service debería poseer la transacción.
- **Rollback ante cualquier excepción.** Nunca tragues errores sin hacer rollback.

## Errores Comunes

- **Múltiples UoWs en una transacción.** No pueden coordinarse entre sí.
- **Olvidar llamar commit().** Los cambios permanecen en memoria y se pierden.
- **Modificar objetos después del commit.** Están detached de la transacción.
- **UoW como singleton global.** La thread safety se vuelve una pesadilla.
- **Incluir queries de solo lectura en el UoW.** Solo debería trackear cambios.

## Ejemplos del Mundo Real

### Hibernate Session

La `Session` de Hibernate es un Unit of Work. El flushing escribe todos los cambios pendientes. `Transaction.commit()` delega a la session.

### Entity Framework Core

`DbContext` trackea estados de entidades (`Added`, `Modified`, `Deleted`). `SaveChanges()` commitea todo atómicamente.

### Django ORM

Django no tiene un Unit of Work clásico, pero transacciones atómicas vía `transaction.atomic()` logran el mismo objetivo.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Unit of Work y una transacción de base de datos?**
A: Una transacción de base de datos es el boundary ACID a nivel de DB. Unit of Work es el coordinador a nivel de aplicación que trackea cambios y conduce la transacción.

**Q: Puede Unit of Work abarcar múltiples bases de datos?**
A: Sí, con transacciones distribuidas (2PC) o patrones saga, pero agrega complejidad significativa.

**Q: Cómo se relaciona Unit of Work con Repository?**
A: El Repository abstrae la persistencia. El Unit of Work trackea qué cambiaron los repositories y coordina el commit.
