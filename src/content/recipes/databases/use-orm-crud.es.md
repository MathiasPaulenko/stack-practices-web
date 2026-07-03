---
contentType: recipes
slug: use-orm-crud
title: "[ES] Use ORM for CRUD"
description: "[ES] How to perform CRUD operations using ORMs in Python, JavaScript, and Java."
metaDescription: "Learn ORM CRUD operations using SQLAlchemy, Prisma, and Hibernate with practical code examples in Python, JavaScript, and Java."
difficulty: intermediate
topics:
  - databases
tags:
  - databases
  - orm
  - crud
  - python
  - javascript
  - java
relatedResources:
  - /recipes/connect-to-mysql
  - /recipes/connect-to-postgresql
  - /recipes/connect-to-redis
  - /recipes/execute-raw-sql
  - /patterns/abstract-factory-pattern
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Learn ORM CRUD operations using SQLAlchemy, Prisma, and Hibernate with practical code examples in Python, JavaScript, and Java."
  keywords:
    - databases
    - orm
    - crud
    - python
    - javascript
    - java
---
## Visión General

Los ORMs (Object-Relational Mappers) abstraen las interacciones con la base de datos en objetos de código nativo, reduciendo código repetitivo SQL y mejorando la mantenibilidad. Esta receta demuestra operaciones CRUD usando SQLAlchemy (Python), Prisma (JavaScript) y Hibernate (Java).

## Cuándo Usar

Usa este recurso cuando:
- Construyes aplicaciones con muchos tipos de entidades y relaciones
- Reduces código repetitivo SQL y overhead de migraciones
- Garantizas type safety y autocomplete para operaciones de base de datos

## Solución

### Python

```python
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    email = Column(String, nullable=False, unique=True)
    role = Column(String, default='user')

engine = create_engine('postgresql://user:pass@localhost/mydb')
Session = sessionmaker(bind=engine)

# Create
session = Session()
user = User(email='alice@example.com', role='admin')
session.add(user)
session.commit()

# Read
user = session.query(User).filter_by(email='alice@example.com').first()

# Update
user.role = 'superadmin'
session.commit()

# Delete
session.delete(user)
session.commit()
session.close()
```

### JavaScript

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function crud() {
    // Create
    const user = await prisma.user.create({
        data: { email: 'alice@example.com', role: 'admin' }
    });

    // Read
    const found = await prisma.user.findUnique({
        where: { email: 'alice@example.com' }
    });

    // Update
    const updated = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'superadmin' }
    });

    // Delete
    await prisma.user.delete({ where: { id: user.id } });
}
```

### Java

```java
import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    @Column(nullable = false, unique = true)
    private String email;
    private String role = "user";

    // getters y setters omitidos
}

public class UserRepository {
    private final EntityManager em;

    public UserRepository(EntityManager em) { this.em = em; }

    public void create(User user) {
        em.getTransaction().begin();
        em.persist(user);
        em.getTransaction().commit();
    }

    public User findByEmail(String email) {
        return em.createQuery("SELECT u FROM User u WHERE u.email = :email", User.class)
                 .setParameter("email", email)
                 .getSingleResult();
    }

    public void updateRole(Integer id, String role) {
        em.getTransaction().begin();
        User user = em.find(User.class, id);
        user.setRole(role);
        em.getTransaction().commit();
    }

    public void delete(Integer id) {
        em.getTransaction().begin();
        em.remove(em.find(User.class, id));
        em.getTransaction().commit();
    }
}
```

## Explicación

**SQLAlchemy** usa una clase base declarativa donde las clases Python se mapean a tablas. Las sesiones gestionan transacciones y ciclos de vida de objetos. **Prisma** genera un cliente type-safe desde un archivo de schema, ofreciendo validación en tiempo de compilación y excelente soporte de IDE. **Hibernate** usa anotaciones JPA (`@Entity`, `@Id`, `@Column`) para mapear objetos Java a tablas, con `EntityManager` gestionando contextos de persistencia y transacciones.

## Variantes

| Tecnología | Enfoque | Notas |
|------------|---------|-------|
| Python | `Django ORM` | Todo incluido, fuertemente acoplado a Django |
| JavaScript | `TypeORM` | ORM basado en decoradores con fuerte soporte de TypeScript |
| Java | `Spring Data JPA` | Abstracción de repositorio sobre Hibernate |

## Lo que funciona

1. Define schemas y constraints explícitos en el ORM, no solo en la base de datos
2. Usa transacciones para operaciones multi-paso para garantizar atomicidad
3. Añade índices a nivel de base de datos en columnas frecuentemente consultadas
4. Usa eager loading (`joinedload`, `include`, `fetch`) cuidadosamente para evitar consultas N+1
5. Mantén las entidades ORM livianas; mueve la lógica de negocio a capas de servicio

## Errores Comunes

1. Usar ORMs para consultas analíticas complejas, causando mal rendimiento
2. Ignorar el problema de consultas N+1 cargando datos relacionados en bucles
3. Almacenar lógica de negocio dentro de clases de entidad ORM
4. No manejar `LazyInitializationException` en Hibernate fuera de sesiones
5. Olvidar cerrar sesiones o clientes Prisma, causando fugas de conexiones

## Preguntas Frecuentes

### ¿Debería usar un ORM o SQL crudo?

Usa un ORM para CRUD, relaciones y migraciones. Usa SQL crudo para agregaciones complejas, reportes y rutas críticas de rendimiento. Muchos proyectos usan ambos.

### ¿Cómo evito consultas N+1 con un ORM?

Usa eager loading: `selectinload` en SQLAlchemy, `include` en Prisma, `FetchType.EAGER` o `JOIN FETCH` en Hibernate. Monitorea el conteo de consultas en desarrollo.

### ¿Los ORMs pueden manejar migraciones de base de datos?

Sí. SQLAlchemy usa Alembic, Prisma tiene migraciones integradas, y Hibernate puede autogenerar schemas con `hbm2ddl`. Sin embargo, las migraciones de producción deben revisarse y probarse.
