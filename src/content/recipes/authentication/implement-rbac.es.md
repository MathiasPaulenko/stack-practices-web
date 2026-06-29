---
contentType: recipes
slug: implement-rbac
title: "Implementar RBAC"
description: "Cómo implementar control de acceso basado en roles con roles jerárquicos, grants de permisos y middleware de enforce en Python, Node.js y Java."
metaDescription: "Implementa control de acceso basado en roles con roles jerárquicos, grants de permisos y middleware de enforce en Python, Node.js y Java."
difficulty: intermediate
topics:
  - authentication
tags:
  - authentication
  - rbac
  - authorization
  - roles
  - permissions
  - security
  - recipe
relatedResources:
  - /recipes/authentication/implement-abac
  - /recipes/authentication/implement-sso-saml
  - /guides/security/secrets-management-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Implementa control de acceso basado en roles con roles jerárquicos, grants de permisos y middleware de enforce en Python, Node.js y Java."
  keywords:
    - authentication
    - rbac
    - authorization
    - roles
    - permissions
    - security
    - recipe
---

## Descripción General

Role-Based Access Control (RBAC) asigna permisos a roles, y roles a usuarios. Un usuario hereda todos los permisos de sus roles. Este modelo es simple, auditable y escala a cientos de roles sin la complejidad de sistemas basados en atributos. RBAC es la elección correcta cuando las decisiones de acceso dependen principalmente de la función laboral.

## Cuándo Usar

- Tu aplicación tiene funciones laborales claramente definidas (admin, editor, viewer, auditor)
- El control de acceso cambia infrecuentemente
- Necesitas una traza de auditoría fácil de explicar a stakeholders no técnicos
- Frameworks de compliance (SOC 2, ISO 27001) requieren matrices de control de acceso documentadas

## Cuándo NO Usar

- Las decisiones de acceso dependen de tiempo, ubicación o dispositivo — usa ABAC
- Usuarios necesitan permisos diferentes para diferentes proyectos — usa ACLs a nivel de recurso
- El mismo usuario actúa en nombre de múltiples organizaciones — usa RBAC multi-tenant

## Implementación Paso a Paso

### Python (Flask + SQLAlchemy)

```python
from functools import wraps
from flask import Flask, g, jsonify
from sqlalchemy import Column, Integer, String, Table, ForeignKey
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

user_roles = Table('user_roles', Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('role_id', Integer, ForeignKey('roles.id'))
)

role_permissions = Table('role_permissions', Base.metadata,
    Column('role_id', Integer, ForeignKey('roles.id')),
    Column('permission_id', Integer, ForeignKey('permissions.id'))
)

class Permission(Base):
    __tablename__ = 'permissions'
    id = Column(Integer, primary_key=True)
    resource = Column(String(100), nullable=False)
    action = Column(String(50), nullable=False)

class Role(Base):
    __tablename__ = 'roles'
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True)
    parent_id = Column(Integer, ForeignKey('roles.id'), nullable=True)
    permissions = relationship('Permission', secondary=role_permissions)
    parent = relationship('Role', remote_side=[id], backref='children')

    def get_all_permissions(self):
        perms = set(self.permissions)
        if self.parent:
            perms.update(self.parent.get_all_permissions())
        return perms

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    roles = relationship('Role', secondary=user_roles)

    def has_permission(self, resource, action):
        for role in self.roles:
            for perm in role.get_all_permissions():
                if perm.resource == resource and perm.action == action:
                    return True
        return False

def require_permission(resource, action):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            if not g.user or not g.user.has_permission(resource, action):
                return jsonify({"error": "Forbidden"}), 403
            return f(*args, **kwargs)
        return wrapped
    return decorator

@app.route('/orders/<int:id>', methods=['PUT'])
@require_permission('orders', 'write')
def update_order(id):
    return jsonify({"message": f"Updated order {id}"})
```

### Node.js (Express + Prisma)

```javascript
// middleware/rbac.js
const prisma = require('../prisma/client');

function requirePermission(resource, action) {
  return async (req, res, next) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        roles: {
          include: {
            permissions: true,
            parent: { include: { permissions: true } }
          }
        }
      }
    });

    const hasPermission = user.roles.some(role => {
      const rolePerms = [...role.permissions];
      if (role.parent) rolePerms.push(...role.parent.permissions);
      return rolePerms.some(p => p.resource === resource && p.action === action);
    });

    if (!hasPermission) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

// Uso
app.put('/orders/:id', authenticate, requirePermission('orders', 'write'), updateOrder);
```

### Java (Spring Security)

```java
@Entity
public class Role {
    @Id @GeneratedValue private Long id;
    @Column(unique = true, nullable = false) private String name;
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "role_permissions",
        joinColumns = @JoinColumn(name = "role_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id"))
    private Set<Permission> permissions = new HashSet<>();

    @ManyToOne @JoinColumn(name = "parent_id") private Role parent;

    public Set<Permission> getAllPermissions() {
        Set<Permission> all = new HashSet<>(permissions);
        if (parent != null) all.addAll(parent.getAllPermissions());
        return all;
    }
}

@Entity
public class Permission {
    @Id @GeneratedValue private Long id;
    @Column(nullable = false) private String resource;
    @Column(nullable = false) private String action;
}

@Entity
public class User {
    @Id @GeneratedValue private Long id;
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roles = new HashSet<>();

    public boolean hasPermission(String resource, String action) {
        return roles.stream()
            .flatMap(r -> r.getAllPermissions().stream())
            .anyMatch(p -> p.getResource().equals(resource) && p.getAction().equals(action));
    }
}

@PreAuthorize("hasAuthority('orders:write')")
public Order updateOrder(Long orderId, OrderUpdateRequest req) { }
```

## Lo que funciona

- **Define permisos como pares recurso + acción.** `orders:read` es más claro que `VIEWER` y permite composición fina. Los roles agrupan permisos, no los reemplazan.
- **Implementa jerarquía de roles, no duplicación.** Si `editor` puede hacer todo lo que `viewer`, haz que `editor` herede de `viewer` en lugar de copiar permisos.
- **Deniega por defecto.** Sin permiso explícito, la respuesta es siempre `false`. No uses lógica "allow unless denied".
- **Cachea lookups de permisos.** Recorrer jerarquías y hacer joins en cada request es costoso. Cachea el conjunto útil de permisos por usuario.
- **Audita cambios de permisos.** Loggea cada grant, revoke y asignación de rol con quién hizo el cambio y cuándo.

## Errores Comunes

- **Usar nombres de rol como permisos.** `if (user.role == 'admin')` hardcodea lógica de negocio en código. Agregar un rol `supervisor` rompe todos los checks.
- **No considerar jerarquía de roles.** Un usuario con rol `admin` también es implícitamente `editor` y `viewer` si la jerarquía lo configura.
- **Guardar roles en JWTs sin expiración.** Un usuario degradado retiene acceso de admin hasta que el JWT expire. Usa tokens de vida corta o una lista de revocación.
- **Ignorar el principio de least privilege.** Roles por defecto con permisos amplios exponen datos que deberían estar restringidos.
- **No testear lógica de autorización.** Los tests de unidad verifican lógica de negocio pero raramente testean que `viewer` no pueda llamar `DELETE /users/1`.

## Preguntas Frecuentes

**Q: ¿Cuál es el principal beneficio de RBAC?**
A: RBAC simplifica el control de acceso agrupando permisos en roles. Los usuarios se asignan a roles y los administradores gestionan permisos a nivel de rol en lugar de por usuario.

**Q: ¿Qué tan granulares deben ser los roles?**
A: Comienza con roles gruesos (admin, editor, viewer) y divídelos solo cuando surjan necesidades reales de negocio. Demasiados roles generan sobrecarga de mantenimiento y explosión de roles.

**Q: ¿Se pueden usar RBAC y ABAC juntos?**
A: Sí. Un patrón común es usar RBAC para acceso amplio y ABAC para decisiones contextuales y granulares dentro de un rol.
