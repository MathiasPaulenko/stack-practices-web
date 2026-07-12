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
  - /guides/database-normalization-guide
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

Los ORMs (Object-Relational Mappers) abstraen las interacciones con la base de datos en objetos de código nativo, reduciendo código repetitivo SQL y mejorando la mantenibilidad. Operaciones CRUD usando SQLAlchemy (Python), Prisma (JavaScript) y Hibernate (Java).

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

### SQLAlchemy con Relaciones y Eager Loading

```python
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, selectinload

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    email = Column(String, nullable=False, unique=True)
    role = Column(String, default='user')
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")

class Post(Base):
    __tablename__ = 'posts'
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'))
    author = relationship("User", back_populates="posts")

engine = create_engine('postgresql://user:pass@localhost/mydb')
Session = sessionmaker(bind=engine)
session = Session()

# Eager loading con selectinload (evita N+1)
from sqlalchemy import select
stmt = (
    select(User)
    .options(selectinload(User.posts))
    .where(User.role == 'admin')
)
admins_with_posts = session.execute(stmt).scalars().all()

# Bulk insert
session.add_all([
    User(email=f'user{i}@example.com', role='user')
    for i in range(100)
])
session.commit()

# Bulk update con Core
from sqlalchemy import update
session.execute(
    update(User)
    .where(User.role == 'user')
    .values(role='member')
)
session.commit()
```

### Schema de Prisma con Relaciones

```prisma
// schema.prisma
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  role  String  @default("user")
  posts Post[]

  @@index([role])
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  authorId Int
  author   User   @relation(fields: [authorId], references: [id])

  @@index([authorId])
}
```

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Crear con registros anidados
const user = await prisma.user.create({
  data: {
    email: 'alice@example.com',
    role: 'admin',
    posts: {
      create: [
        { title: 'First Post' },
        { title: 'Second Post' },
      ],
    },
  },
  include: { posts: true },
});

// Transacción con múltiples operaciones
const [newUser, updatedPost] = await prisma.$transaction([
  prisma.user.create({ data: { email: 'bob@example.com' } }),
  prisma.post.update({ where: { id: 1 }, data: { title: 'Updated' } }),
]);

// Upsert (crear o actualizar)
const result = await prisma.user.upsert({
  where: { email: 'carol@example.com' },
  update: { role: 'admin' },
  create: { email: 'carol@example.com', role: 'admin' },
});

// SQL crudo para consultas complejas
const topUsers = await prisma.$queryRaw`
  SELECT u.email, COUNT(p.id) AS post_count
  FROM users u
  LEFT JOIN posts p ON p.author_id = u.id
  GROUP BY u.email
  ORDER BY post_count DESC
  LIMIT 10
`;
```

### Django ORM

```python
# models.py
from django.db import models

class User(models.Model):
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, default='user')

    class Meta:
        indexes = [models.Index(fields=['role'])]

class Post(models.Model):
    title = models.CharField(max_length=200)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')

# Operaciones CRUD
user = User.objects.create(email='alice@example.com', role='admin')
users = User.objects.filter(role='admin').select_related('posts')  # Eager load
user.role = 'superadmin'
user.save()
user.delete()

# Bulk create
User.objects.bulk_create([
    User(email=f'user{i}@example.com') for i in range(100)
])

# Bulk update
User.objects.filter(role='user').update(role='member')

# Agregación
from django.db.models import Count, Avg
User.objects.annotate(post_count=Count('posts')).filter(post_count__gt=5)
```

### Spring Data JPA Repository

```java
public interface UserRepository extends JpaRepository<User, Integer> {

    // Métodos de consulta derivados
    Optional<User> findByEmail(String email);
    List<User> findByRole(String role);

    // Consultas personalizadas con @Query
    @Query("SELECT u FROM User u WHERE u.role = :role ORDER BY u.email")
    List<User> findByRoleOrdered(@Param("role") String role);

    // Consulta nativa
    @Query(value = "SELECT * FROM users WHERE email LIKE :pattern",
           nativeQuery = true)
    List<User> findByEmailPattern(@Param("pattern") String pattern);

    // Consultas de modificación
    @Modifying
    @Query("UPDATE User u SET u.role = :role WHERE u.id = :id")
    int updateRole(@Param("id") Integer id, @Param("role") String role);

    // Paginación y ordenamiento
    Page<User> findByRole(String role, Pageable pageable);
}

// Uso con paginación
Pageable pageable = PageRequest.of(0, 20, Sort.by("email").ascending());
Page<User> adminPage = userRepository.findByRole("admin", pageable);
```

### TypeORM (TypeScript)

```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from 'typeorm';

@Entity()
class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ default: 'user' })
  role: string;

  @OneToMany(() => Post, post => post.author)
  posts: Post[];
}

@Entity()
class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @ManyToOne(() => User, user => user.posts)
  author: User;
}

// Patrón repository
const userRepo = dataSource.getRepository(User);

// Crear
const user = userRepo.create({ email: 'alice@example.com', role: 'admin' });
await userRepo.save(user);

// Leer con relaciones
const users = await userRepo.find({
  where: { role: 'admin' },
  relations: ['posts'],
  order: { email: 'ASC' },
  take: 20,
  skip: 0,
});

// Operaciones bulk
await userRepo
  .createQueryBuilder()
  .update()
  .set({ role: 'member' })
  .where('role = :role', { role: 'user' })
  .execute();
```

## Mejores Prácticas Adicionales


- For a deeper guide, see [Connect to MySQL](/es/recipes/connect-to-mysql/).

6. **Usa `selectinload` o `joinedload` para relaciones.** El lazy loading por defecto causa consultas N+1. SQLAlchemy 1.4+ proporciona `selectinload` como la estrategia preferida:

```python
# Mal: consultas N+1 (1 para users + N para los posts de cada user)
users = session.query(User).all()
for user in users:
    print(len(user.posts))  # Dispara una consulta por user

# Bien: 2 consultas total
users = session.execute(
    select(User).options(selectinload(User.posts))
).scalars().all()
```

7. **Usa operaciones bulk para inserts y actualizaciones en lote.** Los `INSERT` individuales son lentos para datasets grandes:

```python
# SQLAlchemy bulk insert (sin overhead del ORM)
session.bulk_insert_mappings(User, [
    {'email': f'user{i}@example.com', 'role': 'user'}
    for i in range(1000)
])
session.commit()
```

8. **Habilita el logging de consultas en desarrollo.** Observa cada sentencia SQL que tu ORM genera:

```python
import logging
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
```

```javascript
// Prisma query logging
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

9. **Usa connection pooling.** Los ORMs crean conexiones por sesión por defecto. Configura pooling para producción:

```python
engine = create_engine(
    'postgresql://user:pass@localhost/mydb',
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=3600,
)
```

10. **Mapea entidades ORM a DTOs, no directamente a respuestas de API.** Exponer entidades ORM a APIs causa problemas de serialización y filtra estructura interna:

```python
from dataclasses import dataclass

@dataclass
class UserDTO:
    id: int
    email: str
    role: str

    @classmethod
    def from_entity(cls, user: User) -> 'UserDTO':
        return cls(id=user.id, email=user.email, role=user.role)
```

## Errores Comunes Adicionales

6. **Usar `SELECT *` a través del ORM cuando necesitas una sola columna.** Cargar entidades completas cuando solo necesitas un campo desperdicia memoria y ancho de banda:

```python
# Mal: carga todas las columnas
users = session.query(User).all()
emails = [u.email for u in users]

# Bien: carga solo email
emails = session.execute(select(User.email)).scalars().all()
```

7. **No usar restricciones a nivel base de datos.** Los ORMs pueden validar en código, pero las restricciones de base de datos son la última línea de defensa:

```python
class User(Base):
    __tablename__ = 'users'
    email = Column(String, nullable=False, unique=True)
    age = Column(Integer)

    __table_args__ = (
        CheckConstraint('age >= 0', name='check_age_positive'),
    )
```

8. **Errores de entidad detached en Hibernate.** Acceder a una relación lazy-loaded fuera de la sesión lanza `LazyInitializationException`. Usa `JOIN FETCH` o proyecciones DTO:

```java
// Mal: lazy loading fuera de transacción
User user = repo.findById(id).orElseThrow();
user.getPosts().size(); // Lanza excepción si la sesión cerró

// Bien: fetch con JOIN FETCH
@Query("SELECT u FROM User u LEFT JOIN FETCH u.posts WHERE u.id = :id")
Optional<User> findByIdWithPosts(@Param("id") Integer id);
```

9. **No manejar conflictos de optimistic locking.** Cuando dos usuarios editan el mismo registro, el último write gana silenciosamente a menos que añadas versionado:

```python
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    email = Column(String)
    version_id = Column(Integer, default=1)

    __mapper_args__ = {'version_id_col': version_id}
```

## FAQ Adicional

### ¿Cómo manejo consultas complejas difíciles de expresar en sintaxis ORM?

Usa SQL crudo o APIs de query builder para joins complejos, window functions y CTEs. Todos los ORMs principales proporcionan escape hatches:

```python
from sqlalchemy import text
result = session.execute(text("""
    SELECT u.email, COUNT(o.id) AS order_count
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id
    GROUP BY u.email
    HAVING COUNT(o.id) > :min_orders
"""), {"min_orders": 5})
```

```javascript
const results = await prisma.$queryRaw`
  SELECT u.email, COUNT(o.id) AS order_count
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.id
  GROUP BY u.email
  HAVING COUNT(o.id) > ${5}
`;
```

### ¿Debo usar el patrón repository con ORMs?

Depende. Spring Data JPA ya usa repositories. Para SQLAlchemy y Prisma, una capa de servicio delgada es suficiente. Usa el patrón repository cuando necesites intercambiar fuentes de datos o mockear acceso a base de datos en unit tests.

### ¿Cómo manejo features específicas de base de datos con un ORM?

La mayoría de ORMs soportan features específicas mediante dialectos o consultas nativas. Para features específicas de PostgreSQL como `JSONB`, `tsvector` o columnas `array`:

```python
from sqlalchemy.dialects.postgresql import JSONB

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    metadata_ = Column('metadata', JSONB, default={})

session.query(User).filter(User.metadata_['theme'].astext == 'dark').all()
```

## Tips de Rendimiento

1. **Usa `lean()` en Mongoose o proyecciones DTO en Hibernate.** Omite la hidratación del ORM para consultas de solo lectura:

```javascript
const users = await User.find().lean().exec();
```

```java
@Query("SELECT new com.app.dto.UserDTO(u.id, u.email) FROM User u WHERE u.role = :role")
List<UserDTO> findDTOsByRole(@Param("role") String role);
```

2. **Usa paginación basada en cursor en lugar de offset.** La paginación con offset se vuelve más lenta a medida que avanzas:

```python
# Mal: paginación con offset (lenta para offsets grandes)
session.query(User).offset(100000).limit(20).all()

# Bien: paginación con cursor (tiempo constante)
last_id = 100000
session.query(User).filter(User.id > last_id).order_by(User.id).limit(20).all()
```

3. **Habilita el caché de segundo nivel en Hibernate.** Cachea entidades leídas frecuentemente:

```java
@Entity
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
public class User {
    // ...
}
```

4. **Usa `EXPLAIN ANALYZE` en las consultas generadas por el ORM.** El SQL que tu ORM genera puede no usar índices eficientemente. Siempre verifica con `EXPLAIN`:

```sql
EXPLAIN ANALYZE SELECT users.id, users.email, users.role
FROM users
WHERE users.role = 'admin'
ORDER BY users.email;
```

5. **Desactiva `auto_flush` durante operaciones bulk.** SQLAlchemy hace flush de la sesión antes de cada consulta por defecto. Desactívalo durante batch inserts:

```python
session.autoflush = False
# Operaciones bulk
session.autoflush = True
```
