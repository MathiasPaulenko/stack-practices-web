---
contentType: patterns
slug: identity-map-pattern
title: "Patrón Identity Map"
description: "Asegura que cada objeto sea cargado solo una vez por transacción cacheando instancias por su primary key, previniendo representaciones duplicadas en memoria del mismo row de base de datos."
metaDescription: "Aprende el Patrón Identity Map. Ejemplos en Python, Java y JavaScript con caching de objetos por primary key para prevenir duplicados."
difficulty: intermediate
topics:
  - design
  - databases
tags:
  - identity-map
  - pattern
  - design-pattern
  - structural
  - caching
  - databases
  - orm
relatedResources:
  - /patterns/design/data-mapper-pattern
  - /patterns/design/unit-of-work-pattern
  - /patterns/design/data-access-object-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Identity Map. Ejemplos en Python, Java y JavaScript con caching de objetos por primary key para prevenir duplicados."
  keywords:
    - identity map
    - design pattern
    - caching
    - databases
    - orm
---

# Patrón Identity Map

## Descripción General

El Patrón Identity Map asegura que cada objeto sea cargado solo una vez por transacción manteniendo un cache de todos los objetos que han sido leídos de la base de datos en una unidad de trabajo. Cuando un objeto es solicitado por ID, el Identity Map chequea si una instancia ya existe en memoria antes de volver a consultar la base de datos.

Sin este patrón, cargar el mismo row de base de datos dos veces dentro de una transacción resulta en dos instancias de objeto diferentes. Modificar una instancia y guardarla puede sobreescribir cambios hechos a la otra, causando updates perdidos. El Identity Map garantiza identidad de objeto: `row_id=42` siempre mapea al mismo objeto en memoria.

## Cuándo Usar

Usa el Patrón Identity Map cuando:
- El mismo row de base de datos puede ser cargado múltiples veces durante una transacción
- La igualdad de identidad de objeto (`is` / `==`) importa para la lógica de negocio
- Quieres prevenir estado inconsistente en memoria a través de la transacción
- El Unit of Work o Data Mapper necesita trackear qué objetos ya fueron cargados

## Cuándo Evitar

- Queries de solo lectura donde instancias duplicadas no importan
- APIs stateless donde cada request empieza fresco y no reutiliza objetos
- Cuando el overhead de memoria de cachear todos los objetos cargados es inaceptable
- Transacciones de larga duración donde objetos cacheados se vuelven stale

## Solución

### Python

```python
from typing import Dict, Optional, Type, Any

class User:
    def __init__(self, user_id: int, name: str, email: str):
        self.id = user_id
        self.name = name
        self.email = email

    def __repr__(self):
        return f"User(id={self.id}, name='{self.name}')"


class IdentityMap:
    def __init__(self):
        self._map: Dict[Type, Dict[Any, Any]] = {}

    def add(self, entity):
        entity_type = type(entity)
        if entity_type not in self._map:
            self._map[entity_type] = {}
        key = self._extract_key(entity)
        self._map[entity_type][key] = entity

    def get(self, entity_type: Type, key: Any) -> Optional[Any]:
        return self._map.get(entity_type, {}).get(key)

    def has(self, entity_type: Type, key: Any) -> bool:
        return key in self._map.get(entity_type, {})

    def remove(self, entity_type: Type, key: Any):
        type_map = self._map.get(entity_type)
        if type_map:
            type_map.pop(key, None)

    def _extract_key(self, entity) -> Any:
        return getattr(entity, 'id', None)


class UserMapper:
    def __init__(self, connection, identity_map: IdentityMap):
        self._conn = connection
        self._identity_map = identity_map

    def find_by_id(self, user_id: int) -> Optional[User]:
        # Chequear identity map primero
        cached = self._identity_map.get(User, user_id)
        if cached:
            return cached

        row = self._conn.execute(
            "SELECT id, name, email FROM users WHERE id = ?", (user_id,)
        ).fetchone()
        if row:
            user = User(user_id=row["id"], name=row["name"], email=row["email"])
            self._identity_map.add(user)
            return user
        return None

    def find_all(self):
        rows = self._conn.execute("SELECT id, name, email FROM users").fetchall()
        users = []
        for row in rows:
            user = self._identity_map.get(User, row["id"])
            if not user:
                user = User(user_id=row["id"], name=row["name"], email=row["email"])
                self._identity_map.add(user)
            users.append(user)
        return users


# Uso
import sqlite3
conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)")
conn.execute("INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')")

identity_map = IdentityMap()
mapper = UserMapper(conn, identity_map)

user1 = mapper.find_by_id(1)
user2 = mapper.find_by_id(1)

print(user1 is user2)  # True — misma instancia de objeto
```

### Java

```java
import java.sql.*;
import java.util.*;

public class User {
    private final int id;
    private String name;
    private String email;

    public User(int id, String name, String email) {
        this.id = id; this.name = name; this.email = email;
    }
    public int getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}

class IdentityMap {
    private final Map<Class<?>, Map<Object, Object>> map = new HashMap<>();

    @SuppressWarnings("unchecked")
    public <T> T get(Class<T> type, Object key) {
        return (T) map.getOrDefault(type, Collections.emptyMap()).get(key);
    }

    public <T> void add(Class<T> type, Object key, T entity) {
        map.computeIfAbsent(type, k -> new HashMap<>()).put(key, entity);
    }

    public <T> boolean has(Class<T> type, Object key) {
        return map.getOrDefault(type, Collections.emptyMap()).containsKey(key);
    }
}

class UserMapper {
    private final Connection conn;
    private final IdentityMap identityMap;

    public UserMapper(Connection conn, IdentityMap identityMap) {
        this.conn = conn; this.identityMap = identityMap;
    }

    public User findById(int id) throws SQLException {
        User cached = identityMap.get(User.class, id);
        if (cached != null) return cached;

        try (PreparedStatement stmt = conn.prepareStatement(
                "SELECT id, name, email FROM users WHERE id = ?")) {
            stmt.setInt(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    User user = new User(rs.getInt("id"), rs.getString("name"), rs.getString("email"));
                    identityMap.add(User.class, id, user);
                    return user;
                }
            }
        }
        return null;
    }
}

// Uso
Connection conn = DriverManager.getConnection("jdbc:sqlite::memory:");
conn.createStatement().execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)");
conn.createStatement().execute("INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')");

IdentityMap im = new IdentityMap();
UserMapper mapper = new UserMapper(conn, im);

User user1 = mapper.findById(1);
User user2 = mapper.findById(1);
System.out.println(user1 == user2); // true
```

### JavaScript

```javascript
class User {
  constructor(id, name, email) {
    this.id = id;
    this.name = name;
    this.email = email;
  }
}

class IdentityMap {
  constructor() {
    this.map = new Map();
  }

  get(type, key) {
    const typeMap = this.map.get(type);
    return typeMap ? typeMap.get(key) : undefined;
  }

  add(type, key, entity) {
    if (!this.map.has(type)) {
      this.map.set(type, new Map());
    }
    this.map.get(type).set(key, entity);
  }

  has(type, key) {
    const typeMap = this.map.get(type);
    return typeMap ? typeMap.has(key) : false;
  }
}

class UserMapper {
  constructor(db, identityMap) {
    this.db = db;
    this.identityMap = identityMap;
  }

  async findById(id) {
    const cached = this.identityMap.get(User, id);
    if (cached) return cached;

    const row = await this.db.get('SELECT id, name, email FROM users WHERE id = ?', id);
    if (!row) return null;

    const user = new User(row.id, row.name, row.email);
    this.identityMap.add(User, id, user);
    return user;
  }

  async findAll() {
    const rows = await this.db.all('SELECT id, name, email FROM users');
    const users = [];
    for (const row of rows) {
      let user = this.identityMap.get(User, row.id);
      if (!user) {
        user = new User(row.id, row.name, row.email);
        this.identityMap.add(User, row.id, user);
      }
      users.push(user);
    }
    return users;
  }
}

// Uso
// const im = new IdentityMap();
// const mapper = new UserMapper(db, im);
// const u1 = await mapper.findById(1);
// const u2 = await mapper.findById(1);
// console.log(u1 === u2); // true
```

## Explicación

El Identity Map se sienta entre la base de datos y la aplicación:

1. **Request de carga** llega para `User(id=5)`
2. **Identity Map chequea** si `User:5` ya está en memoria
3. **Cache hit**: Retorna la instancia existente
4. **Cache miss**: Carga desde DB, agrega al map, retorna la nueva instancia

Esto garantiza que `find_by_id(5)` llamado tres veces en una transacción retorna exactamente el mismo objeto.

## Variantes

| Variante | Scope | Caso de Uso |
|----------|-------|-------------|
| **Transaction-scoped** | Vive para una Unit of Work | Comportamiento default de ORM |
| **Session-scoped** | Vive para una sesión de usuario | Web apps con sesiones largas |
| **Process-scoped** | Vive para el lifetime de la app | Datos de referencia read-heavy |
| **Distributed** | Compartido a través de servicios | Microservicios con caches compartidos |

## Lo que funciona

- **Scope el Identity Map a la transacción.** Mapas de larga vida causan datos stale.
- **Usa junto con Unit of Work.** Los dos patrones se complementan perfectamente.
- **Incluye en find_all() también.** Iterar una colección debería reutilizar instancias existentes.
- **Clear en rollback.** No dejes objetos half-committed en el map.
- **Usa weak references para mapas de larga vida.** Permite garbage collection si la memoria es escasa.

## Errores Comunes

- **Identity Map vive demasiado.** Objetos stale causan inconsistencias de datos.
- **No usarlo en queries de colección.** `find_all()` debería seguir chequeando el map.
- **Olvidar remover entidades eliminadas.** Un objeto eliminado no debería ser retornado del map.
- **Issues de thread safety.** Mapas compartidos a través de threads necesitan sincronización.
- **Key mismatch.** Usar el campo equivocado como key causa colisiones o misses.

## Ejemplos del Mundo Real

### Hibernate First-Level Cache

El cache a nivel de session de Hibernate es un Identity Map. `session.get(User.class, 5)` retorna el mismo objeto en llamadas repetidas dentro de la misma session.

### Entity Framework Core

EF Core trackea entidades por key dentro de una instancia de `DbContext`. Consultar la misma key dos veces retorna la misma entidad trackeada.

### SQLAlchemy Session

La `Session` de SQLAlchemy mantiene un identity map. Cargar el mismo row dos veces produce objetos Python idénticos (`user1 is user2` es `True`).

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Identity Map y un cache general?**
A: Un cache general almacena datos para performance. Un Identity Map preserva identidad de objeto dentro del scope de una transacción. Su objetivo primario es correctitud, no velocidad.

**Q: Puedo usar Identity Map sin Unit of Work?**
A: Sí, pero usualmente están pareados. El Identity Map previene duplicados, mientras que el Unit of Work coordina writes.

**Q: Qué pasa si la base de datos cambia mientras los objetos están en el Identity Map?**
A: Los objetos se vuelven stale. Por eso los Identity Maps deberían ser transaction-scoped, no application-scoped.
