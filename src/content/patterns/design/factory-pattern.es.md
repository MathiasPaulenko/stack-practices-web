---





contentType: patterns
slug: factory-pattern
title: "Factory Pattern"
description: "Crea objetos sin especificar la clase exacta a instanciar. Un patrón de diseño creacional para la creación flexible de objetos."
metaDescription: "Aprende el Factory Pattern con ejemplos prácticos en Python, Java y JavaScript. Patrón creacional para la creación flexible de objetos."
difficulty: beginner
topics:
  - design
tags:
  - factory
  - patron
  - design-pattern
  - creacional
  - python
  - javascript
  - java
relatedResources:
  - /recipes/call-rest-api
  - /recipes/parse-json
  - /guides/rest-api-design-guide
  - /patterns/abstract-factory-pattern
  - /patterns/builder-pattern
  - /patterns/dependency-injection-pattern
  - /patterns/dependency-injection-typescript
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende el Factory Pattern con ejemplos prácticos en Python, Java y JavaScript. Patrón creacional para la creación flexible de objetos."
  keywords:
    - factory pattern
    - patron de diseño
    - patron creacional
    - creacion de objetos
    - python factory
    - java factory
    - javascript factory





---

# Factory Pattern

## Overview

El Factory Pattern es un patrón de diseño creacional que proporciona una interfaz para crear objetos sin especificar sus clases exactas. En lugar de llamar a un constructor directamente, llamas a un método de fábrica que devuelve una nueva instancia basada en parámetros de entrada.

Este patrón es esencial cuando la lógica de creación es compleja, necesita centralizarse o debe variar en tiempo de ejecución.

## When to Use

Usa el Factory Pattern cuando:
- El tipo exacto de objeto a crear se determina en tiempo de ejecución
- La creación de objetos implica configuración compleja
- Quieres desacoplar la creación del uso de objetos
- Necesitas soportar múltiples implementaciones de una interfaz
- Las pruebas requieren sustitución fácil de objetos mock

## Solution

### Python

```python
from abc import ABC, abstractmethod

class Notification(ABC):
    @abstractmethod
    def send(self, message: str) -> str:
        pass

class EmailNotification(Notification):
    def send(self, message: str) -> str:
        return f"Enviando email: {message}"

class SmsNotification(Notification):
    def send(self, message: str) -> str:
        return f"Enviando SMS: {message}"

class NotificationFactory:
    @staticmethod
    def create(channel: str) -> Notification:
        if channel == "email":
            return EmailNotification()
        if channel == "sms":
            return SmsNotification()
        raise ValueError(f"Canal desconocido: {channel}")

# Uso
notifier = NotificationFactory.create("email")
print(notifier.send("Hola!"))  # Enviando email: Hola!
```

### JavaScript

```javascript
class Notification {
  send(message) {
    throw new Error("No implementado");
  }
}

class EmailNotification extends Notification {
  send(message) {
    return `Enviando email: ${message}`;
  }
}

class SmsNotification extends Notification {
  send(message) {
    return `Enviando SMS: ${message}`;
  }
}

class NotificationFactory {
  static create(channel) {
    switch (channel) {
      case "email": return new EmailNotification();
      case "sms": return new SmsNotification();
      default: throw new Error(`Canal desconocido: ${channel}`);
    }
  }
}

const notifier = NotificationFactory.create("email");
console.log(notifier.send("Hola!")); // Enviando email: Hola!
```

### Java

```java
public interface Notification {
    String send(String message);
}

public class EmailNotification implements Notification {
    public String send(String message) {
        return "Enviando email: " + message;
    }
}

public class SmsNotification implements Notification {
    public String send(String message) {
        return "Enviando SMS: " + message;
    }
}

public class NotificationFactory {
    public static Notification create(String channel) {
        switch (channel) {
            case "email": return new EmailNotification();
            case "sms": return new SmsNotification();
            default: throw new IllegalArgumentException("Desconocido: " + channel);
        }
    }
}

// Uso
Notification notifier = NotificationFactory.create("email");
System.out.println(notifier.send("Hola!"));
```

## Explanation

El Factory Pattern desacopla la creación de objetos de su uso a través de tres roles:

- **Interfaz de Producto** (`Notification`): Define el contrato que todos los objetos creados deben seguir
- **Productos Concretos** (`EmailNotification`, `SmsNotification`): Las implementaciones reales
- **Fábrica** (`NotificationFactory`): Centraliza la lógica de creación y devuelve la instancia correcta

Esta estructura permite agregar nuevos canales de notificación sin modificar el código que usa las notificaciones.

## Variants

| Variante | Caso de Uso | Compromiso |
|---------|----------|-----------|
| **Simple Factory** | Método único con lógica condicional | Fácil de empezar, difícil de escalar |
| **Factory Method** | Subclases sobreescriben la creación | Más flexible, más clases |
| **[Abstract Factory](/patterns/design/abstract-factory-pattern)** | Familias de objetos relacionados | Complejo, pero maneja familias de productos |

## Lo que funciona

- **Usa enums para canales/tipos** en lugar de strings raw para evitar errores de tipeo
- **Lanza errores explícitos** para tipos no soportados en lugar de devolver null
- **Mantén la fábrica sin estado** cuando sea posible para seguridad de hilos
- **Registra tipos dinámicamente** en sistemas grandes (ej. contenedores de inyección de dependencias)
- **Prefiere interfaces sobre herencia** para el contrato del producto

## Common Mistakes

- **Sobre-ingeniería**: Usar Abstract Factory cuando Simple Factory es suficiente
- **Dispatch basado en strings**: Propenso a errores de tipeo; usa enums o constantes
- **Fábricas con estado**: Pueden causar problemas de thread-safety en entornos multi-hilo
- **Devolver null**: Devolver `null` en lugar de lanzar excepciones hace más difícil rastrear bugs
- **Acoplamiento fuerte**: Fábrica dependiendo de clases concretas en lugar de abstracciones

## Frequently Asked Questions

**Q: ¿Cuál es la diferencia entre Factory Method y Abstract Factory?**
A: [Factory Method](/patterns/design/factory-pattern) permite que las subclases decidan qué clase instanciar. [Abstract Factory](/patterns/design/abstract-factory-pattern) crea familias de objetos relacionados (ej. componentes UI para Windows vs. Mac).

**Q: ¿Es el Factory Pattern lo mismo que la inyección de dependencias?**
A: No. [DI](/patterns/design/dependency-injection-pattern) se trata de quién provee la dependencia; Factory se trata de cómo se crea la dependencia. A menudo funcionan juntos.

**Q: ¿Cuándo debería evitar el Factory Pattern?**
A: Evítalo cuando la creación de objetos es trivial (un simple `new Class()`) y hay solo una implementación.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.


## Temas Avanzados

### Escenario: Factory para Conexiones Multi-DB

```typescript
// Factory pattern: crear objetos sin exponer logica de creacion
interface DatabaseConnection {
  connect(): Promise<void>;
  query(sql: string): Promise<unknown[]>;
  close(): Promise<void>;
}

class PostgreSQLConnection implements DatabaseConnection {
  constructor(private config: PGConfig) {}
  async connect() { /* pg.connect() */ }
  async query(sql: string) { /* pg.query(sql) */ return []; }
  async close() { /* pg.end() */ }
}

class MySQLConnection implements DatabaseConnection {
  constructor(private config: MySQLConfig) {}
  async connect() { /* mysql.connect() */ }
  async query(sql: string) { /* mysql.query(sql) */ return []; }
  async close() { /* mysql.end() */ }
}

class MongoDBConnection implements DatabaseConnection {
  constructor(private config: MongoConfig) {}
  async connect() { /* mongo.connect() */ }
  async query(sql: string) { /* mongo.find() */ return []; }
  async close() { /* mongo.close() */ }
}

// Factory
class DatabaseFactory {
  static create(type: "postgres" | "mysql" | "mongo", config: unknown): DatabaseConnection {
    switch (type) {
      case "postgres": return new PostgreSQLConnection(config as PGConfig);
      case "mysql": return new MySQLConnection(config as MySQLConfig);
      case "mongo": return new MongoDBConnection(config as MongoConfig);
      default: throw new Error(`Unknown DB type: ${type}`);
    }
  }
}

// Uso: el cliente no sabe que DB se usa
const db = DatabaseFactory.create("postgres", {
  host: "localhost",
  port: 5432,
  database: "myapp",
});
await db.connect();
const results = await db.query("SELECT * FROM users");
await db.close();

// Factory con registry (plugin pattern)
class PluginDatabaseFactory {
  private static registry = new Map<string, (config: unknown) => DatabaseConnection>();

  static register(type: string, creator: (config: unknown) => DatabaseConnection) {
    this.registry.set(type, creator);
  }

  static create(type: string, config: unknown): DatabaseConnection {
    const creator = this.registry.get(type);
    if (!creator) throw new Error(`Unknown DB type: ${type}`);
    return creator(config);
  }
}

// Registrar plugins
PluginDatabaseFactory.register("postgres", (cfg) => new PostgreSQLConnection(cfg as PGConfig));
PluginDatabaseFactory.register("mysql", (cfg) => new MySQLConnection(cfg as MySQLConfig));
```

Lecciones:
  - Factory encapsula la creacion: el cliente no conoce la clase concreta
  - Anadir nuevo tipo de DB solo requiere modificar el factory
  - Plugin factory permite registrar tipos sin modificar el factory
  - Factory vs Abstract Factory: una clase vs familia de productos
  - Factory vs DI: factory es explicito, DI es automatico
```

### Factory vs Abstract Factory: cual uso?

Usa Factory cuando necesitas crear un tipo de objeto con variantes (ej: DatabaseConnection con postgres/mysql/mongo). Usa Abstract Factory cuando necesitas crear una familia de objetos relacionados (ej: UI toolkit que crea Button + Input + Modal, todos del mismo tema). Factory tiene un metodo create; Abstract Factory tiene multiples metodos create para productos relacionados.


End of document. Review and update quarterly.