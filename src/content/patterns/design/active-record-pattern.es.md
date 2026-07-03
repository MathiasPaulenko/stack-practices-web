---
contentType: patterns
slug: active-record-pattern
title: "Patrón Active Record"
description: "Envuelve una tabla o vista de base de datos en una clase donde una instancia está vinculada a una sola fila, y la clase provee métodos para operaciones CRUD directamente en el objeto."
metaDescription: "Aprende el Patrón Active Record para mapeo objeto-relacional. Ejemplos en Python, Java y JavaScript con métodos de persistencia built-in en objetos de dominio."
difficulty: beginner
topics:
  - design
tags:
  - active-record
  - pattern
  - design-pattern
  - structural
  - orm
  - persistence
  - database
relatedResources:
  - /patterns/design/data-access-object-pattern
  - /patterns/design/data-mapper-pattern
  - /patterns/design/repository-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Active Record para mapeo objeto-relacional. Ejemplos en Python, Java y JavaScript con métodos de persistencia built-in en objetos de dominio."
  keywords:
    - active record
    - design pattern
    - orm
    - persistence
    - database
---

# Patrón Active Record

## Descripción General

El Patrón Active Record envuelve una tabla de base de datos en una clase donde cada instancia representa una sola fila. El objeto lleva tanto datos (atributos) como comportamiento (métodos CRUD). Llamar `user.save()` persiste el objeto directamente a la base de datos sin una capa de acceso a datos separada.

Este patrón es la forma más simple de conectar objetos y bases de datos relacionales. Ruby on Rails, Django ORM y Laravel Eloquent están todos construidos sobre Active Record. Reduce boilerplate pero acopla lógica de dominio a persistencia.

## Cuándo Usar

Usa el Patrón Active Record cuando:
- El modelo de dominio mapea estrechamente a tablas de base de datos
- Quieres mínimo boilerplate para operaciones CRUD
- El prototipado rápido es más importante que la pureza arquitectónica
- La aplicación es pequeña a mediana y no necesita lógica de dominio compleja

## Cuándo Evitar

- La lógica de dominio compleja debería aislarse de la persistencia (usa Data Mapper o Repository)
- La misma entidad necesita persistirse a múltiples fuentes de datos
- El testing unitario sin base de datos es difícil porque el objeto depende de ella
- La aplicación crece y los objetos Active Record se vuelven bloated

## Solución

### Python

```python
import sqlite3
from typing import Optional, List

class User:
    _db_path = "app.db"

    def __init__(self, id: int = None, name: str = "", email: str = ""):
        self.id = id
        self.name = name
        self.email = email

    @classmethod
    def _connect(cls):
        return sqlite3.connect(cls._db_path)

    def save(self):
        with self._connect() as conn:
            if self.id is None:
                cursor = conn.execute(
                    "INSERT INTO users (name, email) VALUES (?, ?)",
                    (self.name, self.email)
                )
                self.id = cursor.lastrowid
            else:
                conn.execute(
                    "UPDATE users SET name = ?, email = ? WHERE id = ?",
                    (self.name, self.email, self.id)
                )
            conn.commit()
        return self

    def delete(self):
        with self._connect() as conn:
            conn.execute("DELETE FROM users WHERE id = ?", (self.id,))
            conn.commit()

    @classmethod
    def find_by_id(cls, user_id: int) -> Optional["User"]:
        with cls._connect() as conn:
            row = conn.execute(
                "SELECT id, name, email FROM users WHERE id = ?", (user_id,)
            ).fetchone()
            return cls(*row) if row else None

    @classmethod
    def find_all(cls) -> List["User"]:
        with cls._connect() as conn:
            rows = conn.execute("SELECT id, name, email FROM users").fetchall()
            return [cls(*row) for row in rows]


# Uso
user = User(name="Alice", email="alice@example.com")
user.save()
print(User.find_by_id(user.id))
```

### Java

```java
import java.sql.*;
import java.util.*;

public class User {
    private static String dbUrl = "jdbc:sqlite:app.db";

    private int id;
    private String name;
    private String email;

    public User() {}

    public User(int id, String name, String email) {
        this.id = id;
        this.name = name;
        this.email = email;
    }

    public void save() {
        try (Connection conn = DriverManager.getConnection(dbUrl)) {
            if (id == 0) {
                PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO users (name, email) VALUES (?, ?)", Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, name);
                ps.setString(2, email);
                ps.executeUpdate();
                ResultSet keys = ps.getGeneratedKeys();
                keys.next();
                id = keys.getInt(1);
            } else {
                PreparedStatement ps = conn.prepareStatement(
                    "UPDATE users SET name = ?, email = ? WHERE id = ?");
                ps.setString(1, name);
                ps.setString(2, email);
                ps.setInt(3, id);
                ps.executeUpdate();
            }
        } catch (SQLException e) { throw new RuntimeException(e); }
    }

    public void delete() {
        try (Connection conn = DriverManager.getConnection(dbUrl)) {
            PreparedStatement ps = conn.prepareStatement("DELETE FROM users WHERE id = ?");
            ps.setInt(1, id);
            ps.executeUpdate();
        } catch (SQLException e) { throw new RuntimeException(e); }
    }

    public static User findById(int id) {
        try (Connection conn = DriverManager.getConnection(dbUrl)) {
            PreparedStatement ps = conn.prepareStatement("SELECT id, name, email FROM users WHERE id = ?");
            ps.setInt(1, id);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) return new User(rs.getInt(1), rs.getString(2), rs.getString(3));
        } catch (SQLException e) { throw new RuntimeException(e); }
        return null;
    }

    public static List<User> findAll() {
        List<User> users = new ArrayList<>();
        try (Connection conn = DriverManager.getConnection(dbUrl)) {
            Statement st = conn.createStatement();
            ResultSet rs = st.executeQuery("SELECT id, name, email FROM users");
            while (rs.next()) {
                users.add(new User(rs.getInt(1), rs.getString(2), rs.getString(3)));
            }
        } catch (SQLException e) { throw new RuntimeException(e); }
        return users;
    }

    public int getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}

// Uso
User user = new User();
user.setName("Alice");
user.save();
System.out.println(User.findById(user.getId()));
```

### JavaScript

```javascript
class User {
  static db = null; // Conexión de base de datos inyectada

  constructor({ id = null, name = '', email = '' } = {}) {
    this.id = id;
    this.name = name;
    this.email = email;
  }

  async save() {
    if (this.id === null) {
      const result = await User.db.run(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        this.name, this.email
      );
      this.id = result.lastID;
    } else {
      await User.db.run(
        'UPDATE users SET name = ?, email = ? WHERE id = ?',
        this.name, this.email, this.id
      );
    }
    return this;
  }

  async delete() {
    await User.db.run('DELETE FROM users WHERE id = ?', this.id);
  }

  static async findById(userId) {
    const row = await User.db.get('SELECT id, name, email FROM users WHERE id = ?', userId);
    return row ? new User(row) : null;
  }

  static async findAll() {
    const rows = await User.db.all('SELECT id, name, email FROM users');
    return rows.map(row => new User(row));
  }
}

// Uso
const user = new User({ name: 'Alice', email: 'alice@example.com' });
await user.save();
const found = await User.findById(user.id);
console.log(found);
```

## Explicación

Un objeto Active Record combina:

- **Datos de dominio**: Campos que mapean a columnas de base de datos
- **Lógica de persistencia**: Métodos como `save()`, `delete()`, y `find()` que ejecutan SQL
- **Validación**: Reglas de negocio chequeadas antes de persistir

La clase es tanto un modelo de dominio como un gateway a la base de datos. Esta simplicidad es su fortaleza y debilidad.

## Variantes

| Variante | Descripción | Caso de Uso |
|----------|-------------|-------------|
| **Classic Active Record** | Objeto posee su persistencia | Rails, Django ORM |
| **Data Mapper** | Clase mapper separada maneja persistencia | Hibernate, SQLAlchemy |
| **Repository** | Abstracción tipo colección sobre persistencia | Aggregates DDD |
| **Table Data Gateway** | Métodos estáticos en clase, no instancias | Utilidades CRUD simples |

## Lo que funciona

- **Mantén validaciones en el modelo.** Chequea constraints antes de guardar y lanza errores significativos.
- **Usa callbacks con moderación.** Hooks `before_save` y `after_create` crean flujo de control invisible.
- **Scopea queries.** `User.where(active=True)` es más seguro que SQL raw en lógica de negocio.
- **Lazy load asociaciones.** Carga registros relacionados solo cuando se acceden, no en cada fetch.
- **Evita lógica de negocio en la base de datos.** Stored procedures acoplan tu código al vendor de BD.

## Errores Comunes

- **Fat models** con 500 líneas de código. Separa lógica de negocio en service objects.
- **N+1 queries** al iterar sobre asociaciones. Usa eager loading (`select_related`, `includes`).
- **Acceso a base de datos en tests unitarios.** Active Record hace esto difícil. Usa SQLite in-memory o mocks.
- **Validación en controllers** en lugar del modelo. El modelo es el lugar autoritativo para reglas.
- **Mutar durante iteración.** Modificar una colección mientras iteras causa comportamiento indefinido.

## Ejemplos del Mundo Real

### Ruby on Rails

`User.create(name: "Alice")` crea un registro, lo valida y lo persiste en una llamada. Asociaciones como `user.posts` se cargan lazy.

### Django ORM

`user.save()` y `User.objects.get(id=1)` son operaciones Active Record. Django agrega managers (`objects`) para queries de colección.

### Laravel Eloquent

`User::find(1)` y `$user->save()` siguen Active Record. Eloquent también soporta relaciones, scopes y query builders.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Active Record y Data Mapper?**
A: Active Record pone métodos de persistencia en el objeto de dominio. [Data Mapper](/patterns/design/data-mapper-pattern) usa una clase separada para mapear objetos a la base de datos, manteniendo el modelo de dominio puro.

**Q: Active Record es un anti-pattern?**
A: No, pero es una mala elección para dominios complejos. Brilla en aplicaciones CRUD-heavy y prototipado rápido.

**Q: Cómo testeo objetos Active Record sin base de datos?**
A: Usa una base de datos SQLite in-memory para tests, o refactoriza persistencia en una capa separada que puede ser mockeada.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
