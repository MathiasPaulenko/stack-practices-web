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

Los soft deletes marcan registros como eliminados sin removerlos realmente de la base de datos. Esto preserva datos para auditoría, recuperación e integridad referencial mientras mantiene los registros eliminados invisibles para consultas normales de la aplicación. Esta receta implementa soft deletes con columnas de timestamp y consultas filtradas en Python, JavaScript y Java.

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
