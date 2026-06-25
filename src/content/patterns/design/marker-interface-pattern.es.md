---
contentType: patterns
slug: marker-interface-pattern
title: "Patrón Marker Interface"
description: "Usa interfaces vacías como tags de metadata para señalar propiedades o capacidades en tiempo de compilación y runtime, habilitando verificaciones type-safe sin modificar comportamiento de clase."
metaDescription: "Aprende el Patrón Marker Interface para tagging de metadata type-safe. Ejemplos en Python, Java y JavaScript con serialización, cloneable y markers custom."
difficulty: beginner
topics:
  - design
  - architecture
tags:
  - marker-interface
  - pattern
  - design-pattern
  - structural
  - metadata
  - typing
  - java
relatedResources:
  - /patterns/design/type-object-pattern
  - /patterns/design/strategy-pattern
  - /patterns/design/decorator-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Marker Interface para tagging de metadata type-safe. Ejemplos en Python, Java y JavaScript con serialización, cloneable y markers custom."
  keywords:
    - marker interface
    - design pattern
    - metadata
    - typing
    - java
---

# Patrón Marker Interface

## Descripción General

El Patrón Marker Interface usa interfaces vacías (interfaces sin métodos) como tags de metadata para señalar propiedades o capacidades de una clase. A diferencia de anotaciones o atributos, los marker interfaces son verificados en tiempo de compilación por el sistema de tipos, proveiendo garantías más fuertes que la reflexión en runtime sola.

El ejemplo canónico es `java.io.Serializable` y `java.lang.Cloneable` de Java. Ninguno define métodos, pero las clases que los implementan declaran su intención de ser serializadas o clonadas. Los frameworks y librerías usan checks `instanceof` para determinar si aplicar manejo especial.

Aunque las anotaciones han reemplazado en gran medida los marker interfaces en Java moderno, el patrón sigue siendo relevante en lenguajes con sistemas de tipos fuertes donde las garantías en tiempo de compilación son preferidas sobre metadata en runtime.

## Cuándo Usar

Usa el Patrón Marker Interface cuando:
- Necesitas type safety en tiempo de compilación para clasificación de metadata
- Checks `instanceof` en runtime deberían determinar comportamiento en frameworks
- Quieres evitar el overhead en runtime de escaneo de anotaciones
- Una jerarquía de tipos expresa naturalmente una capacidad (ej. todos los objetos `Renderable`)

## Cuándo Evitar

- Lenguajes sin interfaces o con sistemas de tipos débiles (anotaciones/decoradores son mejores)
- Metadata que necesita parámetros (anotaciones con valores son más expresivas)
- Cuando la performance de reflexión en runtime es aceptable y la flexibilidad es preferida
- Los marker interfaces proliferan en docenas de tipos vacíos, creando pollution de interfaces

## Solución

### Python

Python no tiene interfaces nativamente, pero `typing.Protocol` y clases base abstractas sirven el mismo propósito:

```python
from typing import Protocol, runtime_checkable
import pickle
import copy

@runtime_checkable
class Serializable(Protocol):
    """Protocol marker: clases implementando esto declaran serializabilidad"""
    pass

@runtime_checkable
class Cloneable(Protocol):
    """Protocol marker: clases implementando esto declaran cloneabilidad"""
    pass


class User:
    def __init__(self, name: str, email: str):
        self.name = name
        self.email = email

    def __repr__(self):
        return f"User({self.name!r}, {self.email!r})"


# Registro explícito como implementando los protocol markers
class SerializableUser(User):
    pass

# Verificación en runtime
assert isinstance(SerializableUser("a", "b"), Serializable)


class Serializer:
    """Componente de framework que usa checks de markers"""
    @staticmethod
    def safe_serialize(obj) -> bytes:
        if isinstance(obj, Serializable):
            return pickle.dumps(obj)
        raise TypeError(f"Objeto de tipo {type(obj).__name__} no es Serializable")

    @staticmethod
    def safe_clone(obj):
        if isinstance(obj, Cloneable):
            return copy.deepcopy(obj)
        raise TypeError(f"Objeto de tipo {type(obj).__name__} no es Cloneable")


# Uso
try:
    user = SerializableUser("Alice", "alice@example.com")
    data = Serializer.safe_serialize(user)
    print(f"Serializado {len(data)} bytes")
except TypeError as e:
    print(e)
```

### Java

```java
// Marker interfaces custom
interface Auditable {}
interface Immutable {}

class Transaction implements Auditable {
    private final String id;
    private final double amount;

    public Transaction(String id, double amount) {
        this.id = id; this.amount = amount;
    }

    public String getId() { return id; }
    public double getAmount() { return amount; }
}

class MutableConfig {
    private String value;
    public MutableConfig(String value) { this.value = value; }
    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }
}

class AuditFramework {
    public void logIfAuditable(Object obj) {
        if (obj instanceof Auditable) {
            System.out.println("AUDIT: " + obj.getClass().getSimpleName() + " fue accedido");
        }
    }
}

class ValidationFramework {
    public void validateImmutable(Object obj) {
        if (obj instanceof Immutable) {
            System.out.println("VALIDADO: " + obj.getClass().getSimpleName() + " es inmutable");
        }
    }
}

// Uso
Transaction tx = new Transaction("TX-001", 100.0);
new AuditFramework().logIfAuditable(tx);  // Logueará
new AuditFramework().logIfAuditable(new MutableConfig("x"));  // No logueará
```

### JavaScript

JavaScript no tiene interfaces, pero symbols y duck typing logran resultados similares:

```javascript
// Symbols actúan como keys de marker únicos
const Serializable = Symbol('Serializable');
const Cloneable = Symbol('Cloneable');

class User {
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }

  // Marca esta clase como Serializable
  static [Serializable] = true;
  static [Cloneable] = true;
}

class SecretData {
  constructor(data) {
    this.data = data;
  }
  // No marcado como Serializable
}

class Serializer {
  static safeSerialize(obj) {
    const constructor = obj.constructor;
    if (constructor[Serializable]) {
      return JSON.stringify(obj);
    }
    throw new TypeError(`Objeto de tipo ${constructor.name} no es Serializable`);
  }

  static safeClone(obj) {
    const constructor = obj.constructor;
    if (constructor[Cloneable]) {
      return JSON.parse(JSON.stringify(obj));
    }
    throw new TypeError(`Objeto de tipo ${constructor.name} no es Cloneable`);
  }
}

// Uso
try {
  const user = new User('Alice', 'alice@example.com');
  const json = Serializer.safeSerialize(user);
  console.log('Serializado:', json);
} catch (e) {
  console.error(e.message);
}

// Esto fallará
try {
  const secret = new SecretData('top-secret');
  Serializer.safeSerialize(secret);
} catch (e) {
  console.error(e.message);
}
```

## Explicación

El Patrón Marker Interface es engañosamente simple pero poderoso:

1. **Define una interface vacía** sin métodos
2. **Las clases opt-in** implementando la interface
3. **Los frameworks verifican** vía `instanceof` (Java), `isinstance` (Python) o symbol checks (JS)
4. **El comportamiento se ramifica** basado en si el marker está presente

La ventaja clave sobre anotaciones es el type checking en tiempo de compilación. Si un método requiere `Serializable`, el compilador lo fuerza. Las anotaciones solo se verifican en runtime.

## Variantes

| Variante | Mecanismo | Lenguaje |
|----------|-----------|----------|
| **Interface** | Checks `instanceof` | Java, C# |
| **Protocol** | `isinstance` con `@runtime_checkable` | Python |
| **Symbol** | Propiedades estáticas de symbol | JavaScript |
| **Annotation** | `@Marker` con reflexión | Java (alternativa moderna) |
| **Trait** | Trait bounds vacíos | Rust |

## Mejores Prácticas

- **Usa con moderación.** Demasiados marker interfaces polucionan la jerarquía de tipos.
- **Documenta el contrato.** Aun las interfaces vacías deberían explicar qué prometen los implementadores.
- **Prefiere anotaciones para metadata parametrizada.** `@Retryable(maxAttempts=3)` supera a la interface `Retryable`.
- **Combina con visitor pattern.** Los markers ayudan a los visitors a decidir qué método visit invocar.
- **No mezcles markers con comportamiento.** Mantén las marker interfaces vacías; usa interfaces regulares para métodos.

## Errores Comunes

- **Tratar markers como comportamiento.** `Cloneable` en Java es notorio: no hace los objetos clonables por sí mismo; solo señala intención. El clonado real lo hace `Object.clone()`.
- **Sobreusar markers en lugar de tipos propios.** Si el marker podría reemplazarse por una interface real con métodos, preferir eso.
- **Olvidar checks en runtime.** Una clase implementando `Serializable` sin checks `instanceof` en el framework no hace nada.
- **Aplicación inconsistente de markers.** Algunas subclases implementan el marker, otras no, rompiendo expectativas de polimorfismo.

## Ejemplos del Mundo Real

### Java Serializable

`java.io.Serializable` es el marker interface clásico. `ObjectOutputStream.writeObject()` verifica `instanceof Serializable` y lanza `NotSerializableException` si está ausente.

### Java Cloneable

`java.lang.Cloneable` marca clases que soportan clonado vía `Object.clone()`. Sin el marker, `clone()` lanza `CloneNotSupportedException`.

### JPA Entity Lifecycle

JPA usa marker interfaces como `Entity` (aunque técnicamente anotado) y `Serializable` para determinar qué clases deberían ser gestionadas por el persistence context.

## Preguntas Frecuentes

**Q: Por qué no usar solo anotaciones?**
A: Las anotaciones son más flexibles (pueden tener parámetros) pero solo se verifican en runtime. Los marker interfaces proveen type safety en tiempo de compilación.

**Q: Puede una clase tener múltiples markers?**
A: Sí, una clase puede implementar cualquier número de marker interfaces. Esta es una fortaleza sobre jerarquías de herencia simple.

**Q: Cuál es la diferencia entre Marker Interface y Tag Interface?**
A: Son sinónimos. "Marker" es el término GoF; "tag" se usa a veces en C# y otras comunidades.
