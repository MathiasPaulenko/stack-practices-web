---
contentType: patterns
slug: data-mapper-pattern
title: "Patrón Data Mapper"
description: "Separa objetos de dominio en memoria de la base de datos delegando la persistencia a una capa de mappers dedicada, manteniendo los modelos framework-agnostic."
metaDescription: "Aprende el Patrón Data Mapper para arquitectura ORM limpia. Ejemplos en Python, Java y JavaScript con mappers, repositories y modelos de dominio."
difficulty: intermediate
topics:
  - design
  - databases
tags:
  - data-mapper
  - pattern
  - design-pattern
  - structural
  - orm
  - persistence
  - databases
relatedResources:
  - /patterns/design/active-record-pattern
  - /patterns/design/data-access-object-pattern
  - /patterns/design/unit-of-work-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Data Mapper para arquitectura ORM limpia. Ejemplos en Python, Java y JavaScript con mappers, repositories y modelos de dominio."
  keywords:
    - data mapper
    - design pattern
    - orm
    - persistence
    - databases
---

# Patrón Data Mapper

## Descripción General

El Patrón Data Mapper separa objetos de dominio en memoria de la base de datos delegando toda la lógica de persistencia a una capa de mappers dedicada. El modelo de dominio no sabe nada sobre la base de datos — sin SQL, sin decoradores ORM, sin métodos `save()`. Un objeto Data Mapper separado maneja la traducción entre el modelo de dominio y los registros de la base de datos.

Este es el patrón detrás de Hibernate (JPA), el mapping clásico de SQLAlchemy y el patrón Repository cuando se usa con ORMs. Proporciona la separación de concerns más limpia para dominios complejos pero requiere más boilerplate que Active Record.

## Cuándo Usar

Usa el Patrón Data Mapper cuando:
- El modelo de dominio es rico y debería permanecer independiente de la base de datos
- Necesitas mapear el mismo objeto de dominio a múltiples esquemas de base de datos
- Testear lógica de dominio sin tocar la base de datos es importante
- El mecanismo de persistencia puede cambiar (SQL ahora, NoSQL después)

## Cuándo Evitar

- Aplicaciones CRUD simples donde Active Record es suficiente
- Cuando el overhead de una capa extra de mapping no está justificado
- Prototipos o herramientas internas donde la velocidad de desarrollo importa más que la pureza

## Solución

### Python

```python
from dataclasses import dataclass
from typing import Optional, Dict, List

# Modelo de Dominio — no sabe nada de la base de datos
@dataclass
class User:
    id: Optional[int] = None
    name: str = ""
    email: str = ""

    def update_email(self, new_email: str):
        if "@" not in new_email:
            raise ValueError("Invalid email")
        self.email = new_email


# Data Mapper — maneja toda la lógica de persistencia
class UserMapper:
    def __init__(self, connection):
        self._conn = connection

    def find_by_id(self, user_id: int) -> Optional[User]:
        row = self._conn.execute(
            "SELECT id, name, email FROM users WHERE id = ?", (user_id,)
        ).fetchone()
        if row:
            return User(id=row["id"], name=row["name"], email=row["email"])
        return None

    def find_all(self) -> List[User]:
        rows = self._conn.execute("SELECT id, name, email FROM users").fetchall()
        return [User(id=r["id"], name=r["name"], email=r["email"]) for r in rows]

    def insert(self, user: User):
        cursor = self._conn.execute(
            "INSERT INTO users (name, email) VALUES (?, ?)",
            (user.name, user.email)
        )
        user.id = cursor.lastrowid

    def update(self, user: User):
        self._conn.execute(
            "UPDATE users SET name = ?, email = ? WHERE id = ?",
            (user.name, user.email, user.id)
        )

    def delete(self, user_id: int):
        self._conn.execute("DELETE FROM users WHERE id = ?", (user_id,))


# Uso
import sqlite3
conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)")

mapper = UserMapper(conn)
user = User(name="Alice", email="alice@example.com")
mapper.insert(user)
print(f"Inserted user with ID: {user.id}")

loaded = mapper.find_by_id(user.id)
print(loaded.name, loaded.email)
```

### Java

```java
import java.sql.*;
import java.util.*;

public class User {
    private Integer id;
    private String name;
    private String email;

    public User() {}
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

    public void updateEmail(String newEmail) {
        if (!newEmail.contains("@")) throw new IllegalArgumentException("Invalid email");
        this.email = newEmail;
    }
}

class UserMapper {
    private final Connection conn;

    public UserMapper(Connection conn) { this.conn = conn; }

    public User findById(int id) throws SQLException {
        try (PreparedStatement stmt = conn.prepareStatement(
                "SELECT id, name, email FROM users WHERE id = ?")) {
            stmt.setInt(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    User user = new User();
                    user.setId(rs.getInt("id"));
                    user.setName(rs.getString("name"));
                    user.setEmail(rs.getString("email"));
                    return user;
                }
            }
        }
        return null;
    }

    public List<User> findAll() throws SQLException {
        List<User> users = new ArrayList<>();
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT id, name, email FROM users")) {
            while (rs.next()) {
                User user = new User();
                user.setId(rs.getInt("id"));
                user.setName(rs.getString("name"));
                user.setEmail(rs.getString("email"));
                users.add(user);
            }
        }
        return users;
    }

    public void insert(User user) throws SQLException {
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

    public void update(User user) throws SQLException {
        try (PreparedStatement stmt = conn.prepareStatement(
                "UPDATE users SET name = ?, email = ? WHERE id = ?")) {
            stmt.setString(1, user.getName());
            stmt.setString(2, user.getEmail());
            stmt.setInt(3, user.getId());
            stmt.executeUpdate();
        }
    }
}

// Uso
Connection conn = DriverManager.getConnection("jdbc:sqlite::memory:");
conn.createStatement().execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)");

UserMapper mapper = new UserMapper(conn);
User user = new User("Alice", "alice@example.com");
mapper.insert(user);
```

### JavaScript

```javascript
class User {
  constructor(name, email) {
    this.id = null;
    this.name = name;
    this.email = email;
  }

  updateEmail(newEmail) {
    if (!newEmail.includes('@')) throw new Error('Invalid email');
    this.email = newEmail;
  }
}

class UserMapper {
  constructor(db) {
    this.db = db;
  }

  async findById(id) {
    const row = await this.db.get('SELECT id, name, email FROM users WHERE id = ?', id);
    if (!row) return null;
    const user = new User(row.name, row.email);
    user.id = row.id;
    return user;
  }

  async findAll() {
    const rows = await this.db.all('SELECT id, name, email FROM users');
    return rows.map(r => {
      const user = new User(r.name, r.email);
      user.id = r.id;
      return user;
    });
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

  async delete(id) {
    await this.db.run('DELETE FROM users WHERE id = ?', id);
  }
}

// Uso
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');
// db would need promisify wrapper for async/await
```

## Explicación

Data Mapper separa concerns en capas distintas:

- **Modelo de Dominio**: Lógica de negocio pura. Sin imports de base de datos, sin anotaciones, sin `save()`.
- **Data Mapper**: Sabe cómo convertir objetos de dominio a SQL y viceversa. Sin lógica de negocio.
- **Base de Datos**: El store de persistencia, completamente oculto del modelo de dominio.

Esta separación hace que el modelo de dominio sea portable a través de frameworks y bases de datos.

## Variantes

| Variante | Approach | Caso de Uso |
|----------|----------|-------------|
| **Identity Map** | Cachea objetos cargados por ID | Prevenir instancias duplicadas de objetos |
| **Unit of Work** | Trackea cambios y commitea como batch | Consistencia transaccional |
| **Query Object** | Encapsula SQL en un objeto | Queries de base de datos componibles |
| **Repository** | Media entre dominio y datos | Abstraer detalles de mapper de la app |

## Lo que funciona

- **Mantén el modelo de dominio puro.** Sin dependencias de framework, sin métodos de persistencia.
- **Un mapper por clase de dominio.** No dejes que un mapper maneje múltiples tipos no relacionados.
- **Usa lazy loading con cuidado.** Es conveniente pero puede causar queries N+1.
- **Identity Map previene duplicados.** Trackea objetos cargados para evitar crear múltiples instancias del mismo row.
- **Retorna snapshots inmutables** cuando expongas datos de dominio para prevenir mutación accidental.

## Errores Comunes

- **Filtrar SQL al modelo de dominio.** Si el modelo sabe de la base de datos, no es Data Mapper.
- **Mapper como God class.** Una clase manejando 20 tipos de dominio se vuelve unmaintainable.
- **Ignorar transacciones.** Operaciones individuales de mapper necesitan ser componibles en transacciones.
- **Deep object graphs sin lazy loading.** Cargar eager un árbol puede traer toda la base de datos.
- **Tratar mappers como repositories.** El mapper es sobre persistencia. El repository es sobre semántica de colección.

## Ejemplos del Mundo Real

### Hibernate (JPA)

Hibernate usa mapping basado en XML o anotaciones para separar entidades de tablas. La `Session` actúa como data mapper, traduciendo entre estado de objeto y SQL.

### SQLAlchemy Classical Mapping

SQLAlchemy soporta estilos declarativo (tipo Active Record) y clásico (Data Mapper). El mapping clásico usa `mapper(User, user_table)` para separar la clase de la definición de tabla.

### Doctrine ORM

El ORM Doctrine de PHP usa Data Mapper con mappings XML/YAML/anotaciones para separar clases de entidad de detalles de persistencia.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Data Mapper y Active Record?**
A: [Active Record](/patterns/design/active-record-pattern) agrupa datos y persistencia en la misma clase. Data Mapper los separa en un objeto mapper distinto.

**Q: Es Data Mapper más lento que Active Record?**
A: Ligeramente más overhead por la capa extra de abstracción, pero la diferencia es negligible comparada con round-trips de base de datos.

**Q: Puedo usar Data Mapper con bases de datos NoSQL?**
A: Sí. El mapper traduce entre objetos de dominio y el formato document/key-value de la base de datos.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
