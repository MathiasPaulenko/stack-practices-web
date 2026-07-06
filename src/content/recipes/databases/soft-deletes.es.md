---
contentType: recipes
slug: soft-deletes
title: "Eliminación Suave (Soft Deletes)"
description: "Cómo implementar soft deletes para preservar datos mientras se ocultan registros de consultas normales."
metaDescription: "Aprende a implementar soft deletes en Python, JavaScript y Java. Cubre columnas de flag, consultas filtradas y estrategias de eliminación permanente."
difficulty: beginner
topics:
  - databases
tags:
  - database
  - audit
  - databases
  - sql
  - postgresql
relatedResources:
  - /recipes/database-transactions
  - /recipes/full-text-search
  - /patterns/abstract-factory-pattern
  - /patterns/adapter-pattern
  - /patterns/builder-pattern
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a implementar soft deletes en Python, JavaScript y Java. Cubre columnas de flag, consultas filtradas y estrategias de eliminación permanente."
  keywords:
    - soft delete postgresql
    - eliminacion suave django
    - paranoid sequelize
    - hibernate soft delete
    - gdpr borrado datos
---
## Visión General

Los soft deletes marcan registros como eliminados sin removerlos realmente de la base de datos. Esto preserva datos para auditoría, recuperación e integridad referencial mientras mantiene los registros eliminados invisibles para consultas normales de la aplicación. El codigo a continuacion implementa soft deletes con columnas de timestamp y consultas filtradas en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Los usuarios necesiten recuperar datos eliminados accidentalmente. Consulta [Database Transactions](/recipes/databases/database-transactions) para patrones de rollback.
- Debas mantener trails de auditoría para compliance (GDPR, HIPAA, SOC2). Consulta [API Security Checklist](/guides/security/api-security-checklist-guide) para compliance.
- Las restricciones de clave foránea impidan eliminaciones duras. Consulta [SQL Joins](/recipes/databases/sql-joins) para patrones relacionales.
- Quieras mostrar capacidades de papelera/reciclaje con elementos "recientemente eliminados"

## Solución

### Python (SQLAlchemy)

```python
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import declarative_base, Session, Query
from sqlalchemy.sql import func
import datetime

Base = declarative_base()

class SoftDeleteMixin:
    deleted_at = Column(DateTime, nullable=True)

    @classmethod
    def query_visible(cls, session: Session):
        return session.query(cls).filter(cls.deleted_at.is_(None))

    def soft_delete(self):
        self.deleted_at = datetime.datetime.utcnow()

class User(Base, SoftDeleteMixin):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, nullable=False)

engine = create_engine("sqlite:///app.db")
Base.metadata.create_all(engine)

with Session(engine) as session:
    user = User(email="alice@example.com")
    session.add(user)
    session.commit()

    # Soft delete
    user.soft_delete()
    session.commit()

    # Solo usuarios visibles
    visible = User.query_visible(session).all()
    print(visible)  # []
```

### JavaScript (Sequelize)

```javascript
const { Sequelize, DataTypes, Model, Op } = require("sequelize");
const sequelize = new Sequelize({ dialect: "sqlite", storage: "app.db" });

class User extends Model {
  async softDelete() {
    this.deletedAt = new Date();
    await this.save();
  }
}

User.init(
  {
    email: { type: DataTypes.STRING, allowNull: false },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: "User",
    paranoid: true, // Sequelize maneja soft deletes automáticamente
    deletedAt: "deletedAt",
  }
);

await sequelize.sync();

const user = await User.create({ email: "alice@example.com" });
await user.destroy(); // Soft delete porque paranoid: true

const visible = await User.findAll(); // Excluye soft-deleted por defecto
const deleted = await User.findAll({ paranoid: false, where: { deletedAt: { [Op.ne]: null } } });
```

### Java (JPA / Hibernate)

```java
import jakarta.persistence.*;
import java.time.Instant;
import java.util.List;

@Entity
@Table(name = "users")
@FilterDef(name = "softDeleteFilter", parameters = @ParamDef(name = "deleted", type = Boolean.class))
@Filter(name = "softDeleteFilter", condition = "deleted_at is null")
public class User {
    @Id @GeneratedValue
    private Long id;
    private String email;
    private Instant deletedAt;

    public void softDelete() {
        this.deletedAt = Instant.now();
    }

    // getters/setters omitidos
}

// Repositorio con filtro habilitado
public List<User> findActiveUsers(EntityManager em) {
    em.unwrap(Session.class).enableFilter("softDeleteFilter").setParameter("deleted", false);
    return em.createQuery("SELECT u FROM User u", User.class).getResultList();
}
```

## Explicación

Los soft deletes funcionan agregando una columna `deleted_at` (o `is_deleted`) a tu tabla. En lugar de `DELETE FROM`, ejecutas `UPDATE ... SET deleted_at = NOW()`. Todas las consultas estándar agregan `WHERE deleted_at IS NULL` para excluir filas soft-deleted.

**Compromisos**:

- **Pros**: Datos recuperables, integridad referencial preservada, trail de auditoría incorporado
- **Contras**: Las tablas crecen indefinidamente, restricciones únicas deben incluir `deleted_at`, los índices necesitan filtrado

Para eliminación real, implementa una operación de "hard delete" o "purge" que ejecute `DELETE FROM` en registros soft-deleted por más de un período de retención (ej. 30 días).

## Variantes

| Enfoque | Columna | Ideal Para | Notas |
|---------|---------|------------|-------|
| Timestamp (`deleted_at`) | `DATETIME NULL` | Trails de auditoría, ventanas de recuperación | Soporta consultas "eliminado antes de X fecha" |
| Boolean (`is_deleted`) | `BOOLEAN DEFAULT FALSE` | Lógica simple, sin timeline de recuperación | Requiere `deleted_at` separado para auditorías |
| Tabla de archivo separada | Copia completa | Compliance, rendimiento | Más complejo, triggers o app-level |
| Partición por estado de eliminación | PG/MySQL nativo | Tablas muy grandes | Usa particionamiento de tabla para activos vs eliminados |

## Lo que funciona

- **Siempre filtra por defecto**: Tu ORM o query builder debería excluir registros eliminados a menos que se solicite explícitamente.
- **Incluye `deleted_at` en índices únicos**: De lo contrario, no puedes recrear un registro con la misma clave única después de soft delete.
- **Programa eliminaciones duras periódicas**: El Artículo 17 del GDPR otorga el derecho al olvido. Debes eliminar realmente después de un período de retención. Consulta [Batch Processing](/recipes/data/batch-processing-patterns) para jobs programados.
- **Registra hard deletes por separado**: Cuando finalmente purgas, regístralo en una tabla de auditoría o event stream. Consulta [Logging](/recipes/api/logging) para trails de auditoría.
- **Prueba tu flujo de recuperación**: Un soft delete es inútil si los usuarios no pueden restaurar desde una UI de papelera.

## Errores Comunes

- **Olvidar filtrar**: Un `WHERE deleted_at IS NULL` faltante expone datos eliminados a usuarios.
- **Violaciones de restricción única**: Crear un nuevo usuario con el mismo email que uno soft-deleted falla si el índice único no incluye `deleted_at`.
- **Sin estrategia de purge**: Los datos soft-deleted se acumulan para siempre, inflando backups y ralentizando consultas.
- **Cascada de soft deletes**: Si `posts` pertenecen a `users`, eliminar un usuario probablemente debería soft-delete sus posts también. Implementa esto en tu capa de servicio.
- **Consultar registros eliminados por defecto**: Algunos ORMs (Django, Sequelize) manejan esto automáticamente, pero SQL crudo y algunos ORMs no.

## Preguntas Frecuentes

### Cómo manejo restricciones únicas con soft deletes?

Haz tu índice único parcial o condicional: `UNIQUE (email, deleted_at) WHERE deleted_at IS NULL` (PostgreSQL) o `UNIQUE (email, deleted_at)` (MySQL/SQLite). Alternativamente, usa un índice compuesto en `(email, is_deleted)` y asegúrate que `is_deleted` sea parte de la restricción.

### Los soft deletes violan GDPR?

El Artículo 17 del GDPR otorga el derecho al olvido. El soft delete solo no es suficiente si el usuario solicita eliminación. Debes (a) hard delete después de un período de retención, o (b) anonimizar el registro para que ya no pueda vincularse al individuo. Documenta tu política de retención en tu política de privacidad.

### Cómo hago cascada de soft deletes a registros relacionados?

Implementa esto en tu capa de servicio o repositorio, no en la base de datos (las claves foráneas no propagan updates). Cuando soft-deletes un `User`, itera sobre sus `Posts` y soft-delete cada uno. Para árboles grandes, usa un CTE recursivo o batch update. Algunos ORMs (Django, Eloquent) proveen paquetes de cascada de soft delete integrados.

### Cascada de Soft Delete con CTE Recursivo

```sql
-- Soft delete un usuario y todos sus posts y comentarios
WITH RECURSIVE dependent_posts AS (
    SELECT id FROM posts WHERE user_id = 42 AND deleted_at IS NULL
)
UPDATE posts SET deleted_at = NOW()
WHERE id IN (SELECT id FROM dependent_posts);

WITH RECURSIVE dependent_comments AS (
    SELECT id FROM comments WHERE post_id IN (
        SELECT id FROM posts WHERE user_id = 42
    ) AND deleted_at IS NULL
)
UPDATE comments SET deleted_at = NOW()
WHERE id IN (SELECT id FROM dependent_comments);

UPDATE users SET deleted_at = NOW() WHERE id = 42;
```

### Restaurar Registros Soft-Deleted

```python
def restore_user(session, user_id):
    user = session.query(User).filter_by(id=user_id).first()
    if user and user.deleted_at is not None:
        user.deleted_at = None
        session.commit()
        # Restaurar posts relacionados
        session.query(Post).filter_by(user_id=user_id).update({"deleted_at": None})
        session.commit()
    return user
```

### Job de Purge Programado para Compliance GDPR

```python
import datetime
from sqlalchemy import text

def purge_old_soft_deletes(session, days=30):
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=days)

    # Hard delete usuarios soft-deleted hace más de 30 días
    result = session.execute(text(
        "DELETE FROM users WHERE deleted_at IS NOT NULL AND deleted_at < :cutoff"
    ), {"cutoff": cutoff})

    session.execute(text(
        "DELETE FROM posts WHERE deleted_at IS NOT NULL AND deleted_at < :cutoff"
    ), {"cutoff": cutoff})

    session.commit()
    print(f"Purgados {result.rowcount} usuarios")
```

### Índice Único Parcial para Soft Deletes en PostgreSQL

```sql
-- Permitir recrear un registro con el mismo email después de soft delete
CREATE UNIQUE INDEX idx_users_email_active
ON users (email)
WHERE deleted_at IS NULL;

-- Esto permite múltiples registros soft-deleted con el mismo email,
-- pero solo un registro activo por email.
```

### Soft Delete con Particionamiento de Tabla

```sql
-- Particionar usuarios por estado de eliminación para tablas grandes
CREATE TABLE users (
    id BIGSERIAL,
    email VARCHAR(255) NOT NULL,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY LIST (deleted_at IS NULL);

CREATE TABLE users_active PARTITION OF users
FOR VALUES IN (true);

CREATE TABLE users_deleted PARTITION OF users
FOR VALUES IN (false);

-- Consultas en usuarios activos solo escanean la partición activa
SELECT * FROM users WHERE email = 'alice@example.com';
-- Solo escanea la partición users_active
```

### Soft Delete en Django con Signals

```python
from django.db import models
from django.db.models.signals import pre_delete
from django.dispatch import receiver

class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

class BaseModel(models.Model):
    deleted_at = models.DateTimeField(null=True, blank=True)
    objects = SoftDeleteManager()
    all_objects = models.Manager()  # Incluye eliminados

    def soft_delete(self):
        self.deleted_at = timezone.now()
        self.save()

    class Meta:
        abstract = True

class User(BaseModel):
    email = models.EmailField(unique=False)

class Post(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)

@receiver(pre_delete, sender=User)
def cascade_soft_delete(sender, instance, **kwargs):
    Post.objects.filter(user=instance, deleted_at__isnull=True).update(
        deleted_at=timezone.now()
    )
```

## Buenas Prácticas Adicionales

6. **Usa defaults a nivel base de datos para `deleted_at`.** Establece `DEFAULT NULL` explícitamente para evitar confusión:

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    deleted_at TIMESTAMP DEFAULT NULL
);
```

7. **Indexa la columna `deleted_at`.** Las consultas que filtran `WHERE deleted_at IS NULL` se benefician de un índice parcial:

```sql
CREATE INDEX idx_users_active ON users (email) WHERE deleted_at IS NULL;
```

8. **Registra eventos de soft delete.** Registra quién eliminó y cuándo en una tabla de auditoría:

```sql
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100),
    record_id INTEGER,
    action VARCHAR(20),
    actor_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO audit_log (table_name, record_id, action, actor_id)
VALUES ('users', 42, 'soft_delete', 1);
```

9. **Usa `deleted_at` en lugar de `is_deleted`.** Un timestamp proporciona tanto el flag de eliminación como el momento de eliminación, útil para políticas de retención y debugging.

10. **Prueba el comportamiento de cascada explícitamente.** Verifica que soft-deletar un padre también soft-deletea los hijos, y que restaurar un padre restaura los hijos.

## Errores Comunes Adicionales

6. **No actualizar `updated_at` al soft delete.** Algunos sistemas de auditoría trackean cambios en `updated_at`. Asegúrate que el soft delete actualice este timestamp.

7. **Soft-deletar sin verificar permisos.** Siempre verifica que el usuario tenga permiso de eliminar antes de establecer `deleted_at`.

8. **No manejar registros soft-deleted en índices de búsqueda.** Los índices de Elasticsearch o Meilisearch deben actualizarse cuando se soft-deletan registros. Remuévelos o márcalos como eliminados en el índice de búsqueda.

9. **Usar `COUNT(*)` sin filtrar.** `COUNT(*)` incluye registros soft-deleted. Siempre usa `COUNT(*) WHERE deleted_at IS NULL` para conteos activos.

10. **No considerar integridad referencial para hard deletes.** Al purgar registros soft-deleted, maneja las restricciones de clave foránea. Elimina hijos primero o usa `ON DELETE CASCADE`.

## Preguntas Frecuentes Adicionales

### Cómo manejo soft deletes con Elasticsearch?

Cuando soft-deletes un registro, remuévelo del índice de búsqueda o márcalo como eliminado:

```python
# Remover de Elasticsearch
es.delete(index="articles", id=article_id)

# O marcar como eliminado
es.update(index="articles", id=article_id, body={
    "doc": {"deleted": True}
})
```

### Debería usar soft deletes en todas las tablas?

No. Usa soft deletes para datos user-facing donde la recuperación es valiosa (usuarios, posts, órdenes). No los uses para datos transitorios (sesiones, logs, entradas de caché) o tablas de alto volumen donde el overhead no está justificado.

### Cómo implemento una UI de "papelera" con restauración?

Almacena el timestamp `deleted_at`. Consulta `WHERE deleted_at IS NOT NULL` para la vista de papelera. Proporciona un botón de restaurar que establece `deleted_at = NULL`. Muestra la fecha de eliminación para que los usuarios sepan cuánto falta hasta el auto-purge.

### Cuál es el impacto de rendimiento de los soft deletes?

Los soft deletes incrementan el tamaño de la tabla, lo que ralentiza las consultas y aumenta el tiempo de backup. Los índices parciales mitigan el rendimiento de consultas. Programa purgas regulares para controlar el crecimiento de la tabla. Para tablas muy grandes, considera particionar por estado de eliminación.

## Tips de Rendimiento

1. **Usa índices parciales para registros activos.** Esto mantiene el índice pequeño y rápido:

```sql
CREATE INDEX idx_orders_active_user ON orders (user_id) WHERE deleted_at IS NULL;
```

2. **Programa purgas durante períodos de bajo tráfico.** Ejecuta el job de purge como tarea cron durante horas valle para evitar impactar consultas de usuarios.

3. **Usa `VACUUM` después de purgas.** Los hard deletes crean dead tuples. Ejecuta `VACUUM` para reclamar espacio:

```sql
VACUUM (VERBOSE, ANALYZE) users;
```

4. **Archiva registros soft-deleted a una tabla separada.** Mueve registros soft-deleted antiguos a una tabla de archivo para mantener la tabla principal pequeña:

```sql
INSERT INTO users_archive SELECT * FROM users WHERE deleted_at < NOW() - INTERVAL '30 days';
DELETE FROM users WHERE deleted_at < NOW() - INTERVAL '30 days';
```

5. **Usa `EXPLAIN` para verificar uso de índices.** Asegúrate que las consultas en registros activos usen el índice parcial:

```sql
EXPLAIN SELECT * FROM users WHERE email = 'alice@example.com' AND deleted_at IS NULL;
-- Debería mostrar "Index Scan using idx_users_email_active"
```
