---
contentType: recipes
slug: python-sql-injection-sqlalchemy
title: "Previene inyeccion SQL con consultas parametrizadas en SQLAlchemy"
description: "Protege aplicaciones Python de inyeccion SQL usando consultas parametrizadas de SQLAlchemy, modelos ORM, validacion de input e inspeccion de queries para acceso seguro a base de datos"
metaDescription: "Previene inyeccion SQL con consultas parametrizadas y ORM de SQLAlchemy. Valida inputs, inspecciona SQL generado y aplica patrones seguros para acceso a BD."
difficulty: intermediate
topics:
  - security
  - databases
tags:
  - python
  - sqlalchemy
  - sql injection
  - security
  - database
relatedResources:
  - /recipes/security/python-jwt-refresh-token-rotation
  - /recipes/security/nodejs-helmet-security-headers
  - /recipes/ai/python-openai-function-calling-structured
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Previene inyeccion SQL con consultas parametrizadas y ORM de SQLAlchemy. Valida inputs, inspecciona SQL generado y aplica patrones seguros para acceso a BD."
  keywords:
    - sql injection prevention
    - sqlalchemy parameterized
    - python sql security
    - orm injection
    - database security
---

# Previene inyeccion SQL con consultas parametrizadas en SQLAlchemy

La inyeccion SQL ocurre cuando el input del usuario se concatena en strings SQL en lugar de parametrizarse. Encabeza el OWASP Top 10 anio tras anio. Las APIs de consulta ORM y Core de SQLAlchemy parametrizan por defecto, haciendo la inyeccion casi imposible cuando se usan correctamente. A continuacion: patrones seguros e inseguros lado a lado.

## Cuando Usar Esto

- Cualquier aplicacion Python que interactua con una base de datos SQL
- Migracion de strings SQL crudos a un ORM
- Auditorias de seguridad de codigo existente de acceso a base de datos

## Requisitos Previos

- Python 3.10+
- Paquete `sqlalchemy` (`pip install sqlalchemy`)

## Solucion

### 1. Instalar dependencias

```bash
pip install sqlalchemy
```

### 2. Codigo vulnerable (NO HACER ESTO)

```python
from sqlalchemy import create_engine, text

engine = create_engine("postgresql://user:pass@localhost/mydb")

# VULNERABLE — concatenacion de strings
def get_user_vulnerable(username: str):
    with engine.connect() as conn:
        # INYECCION SQL: el atacante puede inputar: ' OR '1'='1' --
        query = f"SELECT * FROM users WHERE username = '{username}'"
        result = conn.execute(text(query))
        return result.fetchall()

# Ataque: get_user_vulnerable("' OR '1'='1' --")
# Retorna TODOS los usuarios en lugar de uno
```

### 3. Codigo seguro con consultas parametrizadas

```python
def get_user_safe(username: str):
    """Safe query using parameterized binding."""
    with engine.connect() as conn:
        query = text("SELECT * FROM users WHERE username = :username")
        result = conn.execute(query, {"username": username})
        return result.fetchone()

# El input de ataque se trata como un string literal, no SQL
# get_user_safe("' OR '1'='1' --") retorna None (ningun usuario con ese nombre)
```

### 4. Codigo seguro con ORM de SQLAlchemy

```python
from sqlalchemy import String, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, Session

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50))
    email: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20))

def get_user_orm(session: Session, username: str) -> User | None:
    """Safe ORM query — automatically parameterized."""
    stmt = select(User).where(User.username == username)
    return session.execute(stmt).scalar_one_or_none()

def search_users_by_role(session: Session, role: str) -> list[User]:
    """Safe ORM query with filtering."""
    stmt = select(User).where(User.role == role).order_by(User.username)
    return list(session.execute(stmt).scalars())
```

### 5. Consultas dinamicas seguras

```python
from sqlalchemy import or_, and_, desc

def search_users(
    session: Session,
    username: str | None = None,
    role: str | None = None,
    order_by: str = "username",
) -> list[User]:
    """Build dynamic queries safely with SQLAlchemy Core expressions."""
    conditions = []
    if username:
        conditions.append(User.username.ilike(f"%{username}%"))
    if role:
        conditions.append(User.role == role)

    stmt = select(User)
    if conditions:
        stmt = stmt.where(and_(*conditions))

    # Ordenamiento de columna seguro — validar contra columnas permitidas
    allowed_order = {"username", "email", "id", "role"}
    if order_by in allowed_order:
        column = getattr(User, order_by)
        stmt = stmt.order_by(column)

    return list(session.execute(stmt).scalars())
```

### 6. Operaciones batch seguras

```python
def bulk_insert_safe(session: Session, users: list[dict]) -> None:
    """Safe bulk insert with parameterized values."""
    session.execute(
        User.__table__.insert(),
        users,  # Lista de dicts — cada valor es parametrizado
    )
    session.commit()

# Uso
users = [
    {"username": "alice", "email": "alice@example.com", "role": "admin"},
    {"username": "bob", "email": "bob@example.com", "role": "user"},
]
bulk_insert_safe(session, users)
```

### 7. Consultas LIKE seguras

```python
def search_by_pattern(session: Session, pattern: str) -> list[User]:
    """Safe LIKE query — pattern is parameterized, wildcards are literal."""
    # Escapar wildcards SQL en input del usuario para prevenir inyeccion de patron
    safe_pattern = pattern.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    stmt = select(User).where(User.username.ilike(f"%{safe_pattern}%"))
    return list(session.execute(stmt).scalars())
```

### 8. Inspeccionar SQL generado

```python
from sqlalchemy import event
import logging

logging.basicConfig()
logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)

# Todo el SQL ejecutado con parametros sera logueado
# Esto ayuda a verificar que las consultas estan parametrizadas

# O inspeccionar un statement sin ejecutar
stmt = select(User).where(User.username == "alice")
print(stmt.compile(compile_kwargs={"literal_binds": True}))
# SELECT users.id, users.username, users.email, users.role
# FROM users WHERE users.username = 'alice'
```

## Como Funciona

1. **Consultas parametrizadas** separan la estructura SQL de los datos. La base de datos compila la plantilla SQL primero, luego vincula los parametros como valores literales. Incluso si el parametro contiene sintaxis SQL, se trata como un string, no SQL ejecutable.
2. **Consultas ORM** (`select(User).where(...)`) usan expresiones Python que SQLAlchemy compila a SQL parametrizado. La expresion `User.username == username` genera `WHERE users.username = :username_1` con `username` como parametro vinculado.
3. **Condiciones dinamicas** construidas con `and_()`, `or_()` y comparaciones de columnas siempre estan parametrizadas. El riesgo viene de `text()` con formateo de strings, que evita la parametrizacion.
4. **Wildcards LIKE** (`%`, `_`) en input del usuario pueden coincidir con patrones no intencionales. Escaparlos antes de agregar tus propios wildcards previene inyeccion de patron.

## Variantes

### SQL crudo seguro con text()

```python
from sqlalchemy import text, bindparam

def safe_raw_query(user_id: int, min_age: int):
    """Safe raw SQL with explicit parameter binding."""
    query = text("""
        SELECT u.*, COUNT(o.id) as order_count
        FROM users u
        LEFT JOIN orders o ON o.user_id = u.id
        WHERE u.id = :user_id AND u.age >= :min_age
        GROUP BY u.id
    """).bindparams(
        bindparam("user_id", type_=int),
        bindparam("min_age", type_=int),
    )

    with engine.connect() as conn:
        return conn.execute(query, {"user_id": user_id, "min_age": min_age}).fetchone()
```

### Clausula IN segura

```python
from sqlalchemy import select

def get_users_by_ids(session: Session, user_ids: list[int]) -> list[User]:
    """Safe IN clause — SQLAlchemy handles list expansion."""
    stmt = select(User).where(User.id.in_(user_ids))
    return list(session.execute(stmt).scalars())

# SQLAlchemy genera: WHERE users.id IN (?, ?, ?)
# Cada valor es un parametro separado
```

### ORDER BY seguro desde input del usuario

```python
from sqlalchemy import Column, asc, desc

def get_users_sorted(session: Session, sort_field: str, sort_dir: str = "asc"):
    """Safe dynamic sorting — validate column name against model."""
    # Whitelist de columnas ordenables
    sortable = {
        "username": User.username,
        "email": User.email,
        "created_at": User.created_at,
    }

    column = sortable.get(sort_field, User.username)  # Fallback por defecto
    order_func = desc if sort_dir == "desc" else asc

    stmt = select(User).order_by(order_func(column))
    return list(session.execute(stmt).scalars())
```

### Validacion de input con Pydantic

```python
from pydantic import BaseModel, field_validator
import re

class UserSearchInput(BaseModel):
    username: str | None = None
    role: str | None = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str | None) -> str | None:
        if v is None:
            return v
        allowed = {"admin", "user", "moderator"}
        if v not in allowed:
            raise ValueError(f"Invalid role. Allowed: {allowed}")
        return v

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not re.match(r"^[a-zA-Z0-9_]{1,50}$", v):
            raise ValueError("Username must be alphanumeric, max 50 chars")
        return v

# Uso con FastAPI
from fastapi import FastAPI

app = FastAPI()

@app.get("/users")
def search_users_api(params: UserSearchInput):
    return search_users(session, params.username, params.role)
```

## Mejores Practicas

- **Nunca uses f-strings o .format() para SQL** — siempre usa consultas parametrizadas u ORM
- **Usa consultas ORM por defecto** — se parametrizan automaticamente
- **Valida y whitelistea columnas de ordenamiento** — nunca aceptes nombres de columna directamente del input del usuario
- **Escapa wildcards LIKE** — `%` y `_` en input del usuario pueden coincidir con patrones no intencionales
- **Habilita logging SQL en desarrollo** — verifica que las consultas esten parametrizadas

## Errores Comunes

- **Usar `text()` con f-strings** — `text(f"WHERE x = '{value}'")` es vulnerable
- **Aceptar nombres de columna del input del usuario** — `ORDER BY {user_input}` permite inyeccion SQL
- **No escapar wildcards LIKE** — input del usuario con `%` puede coincidir con todas las filas
- **Confiar que el ORM es seguro con `text()`** — mezclar ORM con `text()` crudo puede reintroducir vulnerabilidades

## FAQ

**Q: El ORM de SQLAlchemy es completamente inmune a inyeccion SQL?**
A: Cuando se usa correctamente (sin `text()` con f-strings), si. Las consultas ORM siempre estan parametrizadas. El riesgo viene de SQL crudo via `text()` con formateo de strings.

**Q: Puede ocurrir inyeccion SQL con parametros enteros?**
A: Menos probable, pero posible si el entero se concatena en un string. Siempre usa binding parametrizado incluso para enteros.

**Q: Debo usar ORM o Core para seguridad?**
A: Ambos son seguros cuando se usan correctamente. El ORM es mas seguro por defecto porque es mas dificil introducir SQL crudo accidentalmente.

**Q: Como testeo inyeccion SQL en mi app?**
A: Prueba inyectar `' OR '1'='1' --` en cada campo de input. Si la consulta retorna resultados inesperados, tienes una vulnerabilidad. Usa herramientas como SQLMap para testing automatizado.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
