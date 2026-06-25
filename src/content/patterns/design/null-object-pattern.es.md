---
contentType: patterns
slug: null-object-pattern
title: "Patrón Null Object"
description: "Usa un objeto por defecto en lugar de referencias null para eliminar verificaciones de null y simplificar el código cliente. Un patrón behavioral para defaults más seguros."
metaDescription: "Aprende el Patrón Null Object para eliminar verificaciones de null con objetos default seguros. Ejemplos en Python, Java y JavaScript."
difficulty: beginner
topics:
  - design
tags:
  - null-object
  - pattern
  - design-pattern
  - behavioral
  - safety
  - defaults
relatedResources:
  - /patterns/design/strategy-pattern
  - /patterns/design/singleton-pattern
  - /patterns/design/dependency-injection-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Null Object para eliminar verificaciones de null con objetos default seguros. Ejemplos en Python, Java y JavaScript."
  keywords:
    - null object
    - design pattern
    - behavioral pattern
    - null safety
    - default object
---

# Patrón Null Object

## Descripción General

El Patrón Null Object elimina las verificaciones de referencias null proveyendo un objeto "no-op" por defecto que implementa la misma interfaz que los objetos reales. En lugar de ramificar con `if (user != null)` en todas partes, los clientes interactúan con un `NullUser` que retorna defaults seguros como strings vacíos, conteos en cero o comportamiento no-op.

Este patrón previene el error de mil millones de dólares de las referencias null. En lugar de crashear con `NullPointerException` o dispersar verificaciones defensivas por toda la base de código, el null object maneja datos faltantes gracefulmente.

## Cuándo Usar

Usa el Patrón Null Object cuando:
- Un método puede no retornar nada, pero los callers esperan un objeto para interactuar
- Quieres evitar verificaciones de null dispersas por todo el código cliente
- Los datos faltantes tienen un comportamiento default sensato (lista vacía, balance cero, usuario guest)
- Quieres tratar la ausencia de datos como un concepto de primera clase

## Cuándo Evitar

- Un valor faltante es verdaderamente excepcional y debería fallar rápido
- El comportamiento default silenciosamente ocultaría bugs (ej., saltear verificaciones de seguridad)
- No hay un default significativo para el caso ausente

## Solución

### Python

```python
from abc import ABC, abstractmethod

class User(ABC):
    @abstractmethod
    def get_name(self) -> str:
        pass

    @abstractmethod
    def has_access(self, resource: str) -> bool:
        pass

    @abstractmethod
    def get_permissions(self) -> list:
        pass


class RealUser(User):
    def __init__(self, name, permissions=None):
        self.name = name
        self.permissions = permissions or []

    def get_name(self):
        return self.name

    def has_access(self, resource):
        return resource in self.permissions

    def get_permissions(self):
        return self.permissions


class NullUser(User):
    """Null object con comportamiento default seguro."""

    def get_name(self):
        return "Guest"

    def has_access(self, resource):
        return False

    def get_permissions(self):
        return []


# Uso
def find_user(user_id):
    # Búsqueda simulada
    if user_id == 1:
        return RealUser("Alice", ["reports", "settings"])
    return NullUser()  # No hay null, no hay crash

user = find_user(999)
print(user.get_name())          # Guest
print(user.has_access("admin")) # False
print(user.get_permissions())   # []
```

### Java

```java
interface User {
    String getName();
    boolean hasAccess(String resource);
    List<String> getPermissions();
}

class RealUser implements User {
    private final String name;
    private final List<String> permissions;

    public RealUser(String name, List<String> permissions) {
        this.name = name;
        this.permissions = permissions;
    }

    public String getName() { return name; }
    public boolean hasAccess(String resource) {
        return permissions.contains(resource);
    }
    public List<String> getPermissions() { return permissions; }
}

class NullUser implements User {
    public String getName() { return "Guest"; }
    public boolean hasAccess(String resource) { return false; }
    public List<String> getPermissions() { return List.of(); }
}

// Uso
public class UserService {
    public User findUser(int id) {
        if (id == 1) return new RealUser("Alice", List.of("reports"));
        return new NullUser();  // Siempre retorna un User válido
    }
}
```

### JavaScript

```javascript
class User {
  getName() { throw new Error('Abstract'); }
  hasAccess(resource) { throw new Error('Abstract'); }
  getPermissions() { throw new Error('Abstract'); }
}

class RealUser extends User {
  constructor(name, permissions = []) {
    super();
    this.name = name;
    this.permissions = permissions;
  }
  getName() { return this.name; }
  hasAccess(resource) { return this.permissions.includes(resource); }
  getPermissions() { return this.permissions; }
}

class NullUser extends User {
  getName() { return 'Guest'; }
  hasAccess() { return false; }
  getPermissions() { return []; }
}

// Uso
function findUser(id) {
  if (id === 1) return new RealUser('Alice', ['reports']);
  return new NullUser();
}

const user = findUser(999);
console.log(user.getName());          // Guest
console.log(user.hasAccess('admin')); // false
```

## Explicación

El Patrón Null Object tiene tres partes:

- **Interfaz Abstracta** (`User`): Define el contrato que todos los objetos implementan
- **Objeto Real** (`RealUser`): La implementación normal con datos reales
- **Null Object** (`NullUser`): Un objeto válido que retorna defaults seguros

Los clientes nunca verifican por null; tratan todos los objetos uniformemente.

## Variantes

| Variante | Comportamiento Default | Ejemplo |
|----------|----------------------|---------|
| **Null Logger** | Llamadas de logging son no-op | Logger de producción que descarta output debug |
| **Null Cache** | Siempre miss, nunca store | Wrapper de cache para ambientes sin Redis |
| **Null Subscription** | Unsubscribe es no-op | Event handler que ignora callbacks safe |
| **Null Mailer** | Silenciosamente descarta emails | Mailer de desarrollo que imprime a consola |

## Mejores Prácticas

- **Retorna null objects desde factories y búsquedas** en lugar de `None` o `null`
- **Haz null objects inmutables** para que no puedan ser modificados accidentalmente
- **Loggea el uso de null objects** en modo debug para detectar ausencias inesperadas
- **Usa features del lenguaje** como `Optional` de Java o tipos anulables de C# junto con null objects para APIs que modelan explícitamente la ausencia
- **Mantén el comportamiento del null object simple** — lógica compleja en un null object es un code smell

## Errores Comunes

- **Null objects con side effects sorprendentes** como silenciosamente tragar errores o permitir acceso no autorizado
- **Olvidar implementar nuevos métodos de interfaz** en el null object cuando la interfaz cambia
- **Usar null objects donde las excepciones son correctas** — un payment processor faltante debería fallar, no retornar un no-op processor
- **Almacenar estado mutable en null objects** causa bugs de estado compartido cuando la misma instancia null es reutilizada
- **Crear null objects para tipos primitivos** — `NullInt` retornando `0` puede ser semánticamente incorrecto; usa `Optional<int>` en su lugar

## Ejemplos del Mundo Real

### Java Collections

`Collections.emptyList()` retorna una lista null object que implementa `List`. El código puede iterar, chequear tamaño y llamar `contains()` sin verificaciones de null.

### Logging Frameworks

El NOP logger de SLF4J es un null object que silenciosamente descarta statements de log cuando no hay binding configurado, previniendo `NullPointerException` en `logger.info()`.

### UI Components

El rendering condicional de React a menudo usa componentes vacíos o fragments como null objects — renderizar `<></>` en lugar de `null` evita layout shifts.

## Preguntas Frecuentes

**Q: Null Object es lo mismo que Optional?**
A: No. `Optional` fuerza a los callers a manejar la ausencia explícitamente. Null Object oculta la ausencia detrás de llamadas a métodos normales. Usa Optional para APIs; Null Object para grafos de objetos internos.

**Q: Los null objects pueden mantener estado?**
A: No deberían. Un null object es conceptualmente stateless. Si mantiene estado, probablemente sea un objeto real con un nombre inusual.

**Q: Cómo testeo código que usa Null Object?**
A: Inyecta el null object explícitamente en tests y aserta que los métodos retornan los defaults esperados. No se necesita framework de mocking.
