---
contentType: recipes
slug: implement-rbac
title: "Implement RBAC"
description: "How to implement role-based access control with hierarchical roles, permission grants, and middleware enforcement across Python, Node.js, and Java."
metaDescription: "Implement role-based access control with hierarchical roles, permission grants, and middleware enforcement across Python, Node.js, and Java."
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
  metaDescription: "Implement role-based access control with hierarchical roles, permission grants, and middleware enforcement across Python, Node.js, and Java."
  keywords:
    - authentication
    - rbac
    - authorization
    - roles
    - permissions
    - security
    - recipe
---

## Overview

Role-Based Access Control (RBAC) assigns permissions to roles, and roles to users. A user inherits all permissions of their roles. This model is simple, auditable, and scales to hundreds of roles without the complexity of attribute-based systems. RBAC is the right choice when access decisions depend primarily on job function rather than dynamic context.

## When to Use

- Your application has clearly defined job functions (admin, editor, viewer, auditor)
- Access control changes infrequently — new roles are added quarterly, not per request
- You need an audit trail that is easy to explain to non-technical stakeholders
- Compliance frameworks (SOC 2, ISO 27001) require documented access control matrices
- You want to avoid the complexity of evaluating dynamic policies on every request

## When NOT to Use

- Access decisions depend on time, location, device posture, or data sensitivity — use ABAC
- Users need different permissions for different projects, teams, or resources — use resource-level ACLs or ReBAC
- The same user needs to act on behalf of multiple organizations with different roles — use multi-tenant RBAC or ABAC
- You are building a zero-trust architecture where every request is evaluated against dynamic context

## Step-by-Step Implementation

### Python (Flask + SQLAlchemy)

```python
from enum import Enum
from functools import wraps
from flask import Flask, g, request, jsonify
from sqlalchemy import Column, Integer, String, Table, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# Association tables
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
    name = Column(String(100), unique=True, nullable=False)
    resource = Column(String(100), nullable=False)  # e.g., 'users', 'orders'
    action = Column(String(50), nullable=False)      # e.g., 'read', 'write', 'delete'

class Role(Base):
    __tablename__ = 'roles'
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    parent_id = Column(Integer, ForeignKey('roles.id'), nullable=True)
    permissions = relationship('Permission', secondary=role_permissions)
    parent = relationship('Role', remote_side=[id], backref='children')

    def get_all_permissions(self):
        """Recursively collect permissions from parent roles."""
        perms = set(self.permissions)
        if self.parent:
            perms.update(self.parent.get_all_permissions())
        return perms

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True)
    roles = relationship('Role', secondary=user_roles)

    def has_permission(self, resource, action):
        for role in self.roles:
            for perm in role.get_all_permissions():
                if perm.resource == resource and perm.action == action:
                    return True
        return False

# Decorator for route protection
def require_permission(resource, action):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            if not g.user or not g.user.has_permission(resource, action):
                return jsonify({"error": "Forbidden"}), 403
            return f(*args, **kwargs)
        return wrapped
    return decorator

# Seed roles and permissions
def seed_rbac():
    viewer = Role(name='viewer')
    viewer.permissions = [
        Permission(resource='orders', action='read'),
        Permission(resource='reports', action='read')
    ]

    editor = Role(name='editor', parent=viewer)
    editor.permissions = [
        Permission(resource='orders', action='write'),
        Permission(resource='products', action='read')
    ]

    admin = Role(name='admin', parent=editor)
    admin.permissions = [
        Permission(resource='users', action='read'),
        Permission(resource='users', action='write'),
        Permission(resource='users', action='delete'),
        Permission(resource='settings', action='write')
    ]

    db.add_all([viewer, editor, admin])
    db.commit()

# Usage
@app.route('/orders/<int:id>', methods=['PUT'])
@require_permission('orders', 'write')
def update_order(id):
    return jsonify({"message": f"Updated order {id}"})
```

### Node.js (Express + Prisma)

```javascript
// prisma/schema.prisma
model Permission {
  id     Int    @id @default(autoincrement())
  name   String @unique
  resource String
  action   String
  roles  Role[]
}

model Role {
  id          Int          @id @default(autoincrement())
  name        String       @unique
  parentId    Int?         @map("parent_id")
  parent      Role?        @relation("RoleHierarchy", fields: [parentId], references: [id])
  children    Role[]       @relation("RoleHierarchy")
  permissions Permission[]
  users       User[]
}

model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  roles Role[]
}

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
            parent: {
              include: { permissions: true }
            }
          }
        }
      }
    });

    const hasPermission = user.roles.some(role => {
      const rolePerms = [...role.permissions];
      if (role.parent) rolePerms.push(...role.parent.permissions);
      return rolePerms.some(p => p.resource === resource && p.action === action);
    });

    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Usage
app.put('/orders/:id',
  authenticate,
  requirePermission('orders', 'write'),
  updateOrder
);

// Service layer for programmatic checks
class AuthorizationService {
  async can(userId, resource, action) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { permissions: true } } }
    });

    return user.roles.some(role =>
      role.permissions.some(p => p.resource === resource && p.action === action)
    );
  }

  async assignRole(userId, roleName) {
    return prisma.user.update({
      where: { id: userId },
      data: { roles: { connect: { name: roleName } } }
    });
  }
}
```

### Java (Spring Security)

```java
@Entity
public class Role {
    @Id @GeneratedValue
    private Long id;

    @Column(unique = true, nullable = false)
    private String name;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "role_permissions",
        joinColumns = @JoinColumn(name = "role_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    private Set<Permission> permissions = new HashSet<>();

    @ManyToOne
    @JoinColumn(name = "parent_id")
    private Role parent;

    public Set<Permission> getAllPermissions() {
        Set<Permission> all = new HashSet<>(permissions);
        if (parent != null) {
            all.addAll(parent.getAllPermissions());
        }
        return all;
    }
}

@Entity
public class Permission {
    @Id @GeneratedValue
    private Long id;

    @Column(nullable = false)
    private String resource;  // e.g., "orders"

    @Column(nullable = false)
    private String action;    // e.g., "READ", "WRITE"
}

@Entity
public class User {
    @Id @GeneratedValue
    private Long id;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roles = new HashSet<>();

    public boolean hasPermission(String resource, String action) {
        return roles.stream()
            .flatMap(role -> role.getAllPermissions().stream())
            .anyMatch(p -> p.getResource().equals(resource) && p.getAction().equals(action));
    }
}

// Spring Security method-level security
@PreAuthorize("hasAuthority('orders:write')")
public Order updateOrder(Long orderId, OrderUpdateRequest request) {
    // ...
}

// Custom permission evaluator
@Component
public class ResourcePermissionEvaluator implements PermissionEvaluator {
    @Autowired
    private UserRepository userRepository;

    @Override
    public boolean hasPermission(Authentication auth, Object target, Object permission) {
        String email = auth.getName();
        User user = userRepository.findByEmail(email);
        String[] parts = ((String) permission).split(":");
        return user.hasPermission(parts[0], parts[1]);
    }
}
```

## Best Practices

- **Define permissions as resource + action pairs.** `orders:read` is clearer than `VIEWER` and allows fine-grained composition. Roles are groupings of permissions, not replacements for them.
- **Implement role hierarchy, not role duplication.** If editors can do everything viewers can, make `editor` inherit from `viewer` instead of copying all viewer permissions to the editor role.
- **Deny by default.** If a user has no explicit permission for an action, the answer is always `false`. Do not implement "allow unless denied" logic.
- **Cache permission lookups.** Walking role hierarchies and joining tables on every request is expensive. Cache the effective permission set per user in Redis or in the JWT/session.
- **Audit permission changes.** Log every grant, revoke, and role assignment with who made the change and when. RBAC only works if the assignment trail is trustworthy.

## Common Mistakes

- **Using role names as permissions.** `if (user.role == 'admin')` hardcodes business logic in code. When the organization adds a `supervisor` role between `editor` and `admin`, every check breaks.
- **Not considering role hierarchy in authorization checks.** A user with the `admin` role is also implicitly an `editor` and `viewer` if the hierarchy is configured. Forgetting this causes false denials.
- **Storing roles in JWTs without expiration.** A user demoted from `admin` to `viewer` will retain admin access until their JWT expires. Use short-lived tokens or maintain a revocation list.
- **Ignoring the principle of least privilege.** Default roles with broad permissions (`user` can read everything) expose data that should be restricted.
- **Not testing authorization logic.** Unit tests verify business logic but rarely test that `viewer` cannot call `DELETE /users/1`. Add explicit authorization test cases.

## Related Resources

- [Implement ABAC](/recipes/authentication/implement-abac)
- [Implement SSO SAML](/recipes/authentication/implement-sso-saml)
- [Secrets Management](/guides/security/secrets-management-guide)
