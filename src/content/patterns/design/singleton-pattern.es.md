---
contentType: patterns
slug: singleton-pattern
title: "Patrón Singleton"
description: "Garantiza que una clase tenga una única instancia y proporciona un acceso global a ella. Patrón de diseño creacional para controlar la creación de objetos."
metaDescription: "Aprende el Patrón Singleton con ejemplos prácticos en Python, Java y JavaScript. Patrón creacional para el control de instancias únicas."
difficulty: beginner
topics:
  - design
tags:
  - singleton
  - pattern
  - design-pattern
  - creational
  - python
  - javascript
  - java
relatedResources:
  - /recipes/data/parse-json
  - /patterns/design/factory-pattern
  - /guides/api/rest-api-design-guide
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende el Patrón Singleton con ejemplos prácticos en Python, Java y JavaScript. Patrón creacional para el control de instancias únicas."
  keywords:
    - singleton pattern
    - patrón de diseño
    - patrón creacional
    - instancia única
    - python singleton
    - java singleton
    - javascript singleton
---

# Patrón Singleton

## Visión general

El [Patrón Singleton](/patterns/design/singleton-pattern) es un patrón de diseño creacional que restringe una clase a una única instancia y proporciona un punto de acceso global a ella. Es útil cuando se necesita exactamente un objeto para coordinar acciones en todo el sistema.

Casos de uso comunes incluyen pools de conexiones a bases de datos, gestores de configuración y servicios de logging.

## Cuándo usarlo

Usa el Patrón Singleton cuando:
- Debe existir exactamente una instancia de una clase en el sistema
- Se necesita acceso controlado a un recurso compartido (ej. configuración, caché, pool de conexiones)
- Necesitas un punto de acceso global sin contaminar el espacio de nombres con variables globales
- Se desea inicialización perezosa para evitar crear la instancia hasta que se necesite

## Solución

### Python

```python
class Singleton:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

# Uso
a = Singleton()
b = Singleton()
print(a is b)  # True
```

### JavaScript

```javascript
class Singleton {
  static #instance = null;

  static getInstance() {
    if (!Singleton.#instance) {
      Singleton.#instance = new Singleton();
    }
    return Singleton.#instance;
  }
}

// Uso
const a = Singleton.getInstance();
const b = Singleton.getInstance();
console.log(a === b); // true
```

### Java

```java
public class Singleton {
    private static Singleton instance;

    private Singleton() {}

    public static synchronized Singleton getInstance() {
        if (instance == null) {
            instance = new Singleton();
        }
        return instance;
    }
}

// Uso
Singleton a = Singleton.getInstance();
Singleton b = Singleton.getInstance();
System.out.println(a == b); // true
```

## Explicación

El Patrón Singleton garantiza una única instancia a través de tres mecanismos:

- **Constructor privado**: Evita la instanciación directa desde fuera de la clase
- **Campo de instancia estático**: Almacena la única instancia compartida
- **Método de acceso global**: Proporciona una forma controlada de recuperar la instancia

En entornos multi-hilo (como Java), usa `synchronized` o inicialización eager para prevenir condiciones de carrera durante la creación de la instancia.

## Variantes

| Variante | Caso de uso | Compromiso |
|----------|-------------|------------|
| **Inicialización perezosa** | Instancia creada en el primer acceso | Problemas de thread-safety |
| **Inicialización eager** | Instancia creada al cargar la clase | Sin problemas de hilos, puede desperdiciar recursos |
| **Doble verificación de bloqueo** | Inicialización perezosa de alto rendimiento | Más complejo, propenso a errores en algunos lenguajes |

## Lo que funciona

- **Haz el constructor privado** para prevenir la instanciación directa accidental
- **Usa inicialización perezosa** solo cuando el costo de inicio importa
- **Considera la seguridad de hilos** en entornos concurrentes
- **Evita el abuso**: los Singletons pueden dificultar las pruebas unitarias debido al estado global oculto
- **Documenta la naturaleza singleton** para que otros desarrolladores no intenten crear múltiples instancias

## Errores comunes

- **Condiciones de carrera**: dos hilos crean instancias separadas simultáneamente
- **Dificultades de testing**: el estado global oculto hace que las pruebas dependan del orden
- **Abuso**: convertir cada servicio compartido en singleton aumenta el acoplamiento
- **Problemas de serialización**: deserializar puede crear instancias duplicadas a menos que se gestione
- **Uso incorrecto de herencia**: las subclases pueden romper la garantía de instancia única

## Ejemplos del mundo real

### Pool de conexiones a base de datos

La mayoría de drivers de base de datos (SQLAlchemy, JDBC connection pools) usan un patrón similar a singleton para gestionar un pool fijo de conexiones. Crear una nueva conexión por cada query agotaría el servidor de base de datos.

### Gestor de configuración

Las aplicaciones cargan configuración desde archivos o variables de entorno una sola vez al iniciar. Un gestor de configuración singleton asegura que todos los módulos lean del mismo estado en memoria sin recargar desde disco.

### Capa de caché

Las cachés en memoria (clientes [Redis](/patterns/design/cache-aside-pattern), cachés LRU locales) se comparten típicamente a través de la aplicación. Un singleton garantiza consistencia de caché y evita duplicación de memoria.

### Fábrica de loggers

Los frameworks de logging usan frecuentemente un registro de loggers nombrados que se comportan como singletons. Llamar `Logger.getLogger("my.module")` múltiples veces devuelve la misma instancia.

## Preguntas frecuentes

**P: ¿Es Singleton un anti-patrón?**
R: No inherentemente, pero su abuso lleva a acoplamiento fuerte y dependencias ocultas. Úsalo con moderación para recursos que realmente requieren una única instancia.

**P: ¿Cómo hago un Singleton thread-safe en Python?**
R: El enfoque `__new__` mostrado arriba es thread-safe en CPython debido al GIL. Para mayor seguridad, usa un lock o variables a nivel de módulo.

**P: ¿Puede un Singleton tener subclases?**
R: Es posible pero complicado. Cada subclase puede terminar con su propia instancia, lo cual puede o no ser el comportamiento deseado.

**P: ¿Cómo testeo unitariamente código que usa un Singleton?**
R: Inyecta el singleton como dependencia en lugar de llamarlo directamente, o proporciona un método `reset()` para tests. Alternativamente, usa una fábrica que devuelva el singleton por defecto pero pueda ser mockeada en tests.

**P: ¿Cuáles son alternativas al Singleton?**
R: [Inyección de dependencias](/patterns/design/dependency-injection-pattern), localizadores de servicios, o variables a nivel de módulo en lenguajes que lo soporten (los módulos de Python son singletons naturales). Estos enfoques hacen las dependencias explícitas y más fáciles de testear.
