---



contentType: patterns
slug: registry-pattern
title: "Patrón Registry"
description: "Centraliza el acceso a servicios y objetos compartidos vía una tabla de lookup. Un patrón structural que desacopla consumidores de implementaciones concretas."
metaDescription: "Aprende el Patrón Registry para lookup centralizado de servicios. Ejemplos en Python, Java y JavaScript para resolución de dependencias desacoplada."
difficulty: intermediate
topics:
  - design
tags:
  - registry
  - pattern
  - design-pattern
  - structural
  - service-locator
  - decoupling
  - lookup
relatedResources:
  - /patterns/multiton-pattern
  - /patterns/dependency-injection-pattern
  - /patterns/singleton-pattern
  - /patterns/plugin-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Registry para lookup centralizado de servicios. Ejemplos en Python, Java y JavaScript para resolución de dependencias desacoplada."
  keywords:
    - registry pattern
    - design pattern
    - service locator
    - dependency lookup
    - structural pattern



---

# Patrón Registry

## Descripción General

El Patrón Registry provee un mecanismo de lookup centralizado para servicios, configuraciones u objetos compartidos. En lugar de pasar dependencias a través de largas cadenas de constructores, los componentes solicitan lo que necesitan desde un registry. Esto desacopla a los consumidores de las implementaciones concretas que usan.

Aunque similar a un Service Locator, el Patrón Registry es más amplio: puede almacenar cualquier cosa desde conexiones a bases de datos hasta feature flags, no solo servicios. Es una alternativa pragmática a la inyección de dependencias completa cuando los frameworks DI no están disponibles.

## Cuándo Usar


- For alternatives, see [Bridge Pattern](/es/patterns/bridge-pattern/).

Usa el Patrón Registry cuando:
- Múltiples componentes necesitan acceso al mismo recurso compartido
- La inyección por constructor crearía listas de parámetros excesivamente largas
- Necesitas lookup en runtime basado en configuración o contexto
- Prefieres una alternativa liviana a un contenedor DI completo

## Cuándo Evitar

- El codebase tiene un framework DI adecuado (Spring, Angular, Dagger)
- Los lookups del registry ocultan dependencias y dificultan las pruebas
- El registry se convierte en un vertedero de estado global
- Necesitas type safety en tiempo de compilación para todas las dependencias

## Solución

### Python

```python
from typing import Dict, Any, Callable, TypeVar

T = TypeVar('T')

class Registry:
    _store: Dict[str, Any] = {}
    _factories: Dict[str, Callable[[], Any]] = {}

    @classmethod
    def register(cls, name: str, instance: Any):
        cls._store[name] = instance

    @classmethod
    def register_factory(cls, name: str, factory: Callable[[], Any]):
        cls._factories[name] = factory

    @classmethod
    def get(cls, name: str) -> Any:
        if name in cls._store:
            return cls._store[name]
        if name in cls._factories:
            instance = cls._factories[name]()
            cls._store[name] = instance
            return instance
        raise KeyError(f"No hay registro para: {name}")

    @classmethod
    def has(cls, name: str) -> bool:
        return name in cls._store or name in cls._factories


# Uso
class DatabaseConnection:
    def query(self, sql: str):
        return f"Resultado: {sql}"

class CacheClient:
    def get(self, key: str):
        return f"cached-{key}"

Registry.register("db", DatabaseConnection())
Registry.register_factory("cache", lambda: CacheClient())

db = Registry.get("db")
cache = Registry.get("cache")
print(db.query("SELECT 1"))
print(cache.get("users"))
```

### Java

```java
import java.util.*;
import java.util.function.Supplier;

public class Registry {
    private static final Map<String, Object> instances = new HashMap<>();
    private static final Map<String, Supplier<?>> factories = new HashMap<>();

    public static void register(String name, Object instance) {
        instances.put(name, instance);
    }

    public static void registerFactory(String name, Supplier<?> factory) {
        factories.put(name, factory);
    }

    @SuppressWarnings("unchecked")
    public static <T> T get(String name) {
        if (instances.containsKey(name)) {
            return (T) instances.get(name);
        }
        if (factories.containsKey(name)) {
            T instance = (T) factories.get(name).get();
            instances.put(name, instance);
            return instance;
        }
        throw new IllegalArgumentException("No hay registro para: " + name);
    }

    public static boolean has(String name) {
        return instances.containsKey(name) || factories.containsKey(name);
    }
}

// Uso
class DatabaseConnection {
    String query(String sql) { return "Resultado: " + sql; }
}

class CacheClient {
    String get(String key) { return "cached-" + key; }
}

Registry.register("db", new DatabaseConnection());
Registry.registerFactory("cache", CacheClient::new);

DatabaseConnection db = Registry.get("db");
CacheClient cache = Registry.get("cache");
```

### JavaScript

```javascript
class Registry {
  static #instances = new Map();
  static #factories = new Map();

  static register(name, instance) {
    Registry.#instances.set(name, instance);
  }

  static registerFactory(name, factory) {
    Registry.#factories.set(name, factory);
  }

  static get(name) {
    if (Registry.#instances.has(name)) {
      return Registry.#instances.get(name);
    }
    if (Registry.#factories.has(name)) {
      const instance = Registry.#factories.get(name)();
      Registry.#instances.set(name, instance);
      return instance;
    }
    throw new Error(`No hay registro para: ${name}`);
  }

  static has(name) {
    return Registry.#instances.has(name) || Registry.#factories.has(name);
  }
}

// Uso
class DatabaseConnection {
  query(sql) { return `Resultado: ${sql}`; }
}

class CacheClient {
  get(key) { return `cached-${key}`; }
}

Registry.register('db', new DatabaseConnection());
Registry.registerFactory('cache', () => new CacheClient());

const db = Registry.get('db');
const cache = Registry.get('cache');
console.log(db.query('SELECT 1'));
```

## Explicación

El Patrón Registry tiene tres roles:

- **Registry**: El mapa central que almacena instancias y funciones factory
- **Registro**: Código que agrega servicios al registry al inicio
- **Lookup**: Código que solicita servicios del registry en runtime

Las instancias pueden registrarse directamente o crearse lazy vía factories en el primer acceso.

## Variantes

| Variante | Estilo de Lookup | Caso de Uso |
|----------|------------------|-------------|
| **Class Registry** | `Registry.get("name")` | Lookup simple basado en strings |
| **Typed Registry** | `registry.get(DatabaseConnection.class)` | Type-safe con generics |
| **Hierarchical Registry** | Cadena de fallback a padre | Registros hijos que sobreescriben defaults |
| **Event Registry** | `on(event, handler)` | Sistemas de event bus / pub-sub |

## Lo que funciona

- **Registra al inicio, no durante requests.** El registro en runtime causa race conditions y comportamiento impredecible.
- **Usa factory registration para objetos costosos.** La creación lazy evita demoras de startup para servicios que pueden no usarse.
- **Documenta las entradas del registry.** Un registry compartido sin documentación se convierte en una caja de misterios.
- **Prefiere DI para código nuevo.** Los registries son pragmáticos; los frameworks DI son más limpios para codebases grandes.
- **Evita la mutación en runtime.** Desregistrar o re-registrar durante la operación causa bugs sutiles.

## Errores Comunes

- **Registry como variable global** dificulta las pruebas. Inyecta el registry o usa un wrapper testeable.
- **Lookups con strings** son frágiles. Renombra una clave de servicio y cada consumidor se rompe silenciosamente.
- **Dependencias circulares** en el registry causan stack overflows durante la resolución de factories.
- **Almacenar estado mutable** en entradas del registry convierte al registry en una variable global oculta.
- **Sin cleanup al shutdown** deja conexiones a base de datos y handles de archivos abiertos.

## Ejemplos del Mundo Real

### Django Settings

El objeto `settings` de Django es un registry de valores de configuración. Los módulos importan `from django.conf import settings` en lugar de pasar config a través de cada función.

### WordPress Plugin API

`add_action` y `add_filter` registran callbacks en un registry global. Temas y plugins se enganchan a WordPress sin modificar archivos core.

### JDBC DriverManager

`DriverManager.getConnection(url)` es un registry que busca el driver de base de datos apropiado basado en el prefijo de URL.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Registry y Service Locator?**
A: Service Locator es un tipo específico de registry enfocado en resolver dependencias de servicios. Registry es más amplio y puede almacenar cualquier objeto compartido.

**Q: Es Registry un anti-patrón?**
A: Algunos lo consideran un anti-patrón más liviano que las variables globales, pero comparte los mismos riesgos. Úsalo con moderación y prefiere DI para código nuevo.

**Q: Cómo testeo código que usa un Registry?**
A: Limpia el registry antes de cada test, registra mocks, y ejecuta el test. Mejor aún, refactoriza para aceptar dependencias vía constructor injection.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.


## Temas Avanzados

### Escenario: Registry para Plugins Dinamicos

```typescript
// Registry: almacenar y recuperar implementaciones por clave
interface Plugin {
  name: string;
  init(config: unknown): Promise<void>;
  execute(input: unknown): Promise<unknown>;
}

class PluginRegistry {
  private plugins = new Map<string, Plugin>();
  private factories = new Map<string, () => Plugin>();

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) throw new Error(`Plugin ${plugin.name} already registered`);
    this.plugins.set(plugin.name, plugin);
  }

  registerFactory(name: string, factory: () => Plugin): void {
    this.factories.set(name, factory);
  }

  get(name: string): Plugin | undefined {
    if (this.plugins.has(name)) return this.plugins.get(name);
    const factory = this.factories.get(name);
    if (factory) {
      const plugin = factory();
      this.plugins.set(name, plugin);
      return plugin;
    }
    return undefined;
  }

  list(): string[] { return [...this.plugins.keys(), ...this.factories.keys()]; }
  unregister(name: string): void {
    this.plugins.delete(name);
    this.factories.delete(name);
  }
}

// Uso: registrar plugins de export
const registry = new PluginRegistry();
registry.register({ name: "csv", init: async () => {}, execute: async (data) => toCSV(data) });
registry.register({ name: "json", init: async () => {}, execute: async (data) => JSON.stringify(data) });
registry.registerFactory("pdf", () => new PDFExportPlugin());

// Cliente: obtener plugin por nombre
const exporter = registry.get("csv");
if (exporter) {
  await exporter.init({ delimiter: "," });
  const result = await exporter.execute(data);
}

console.log(registry.list()); // ["csv", "json", "pdf"]
```

Lecciones:
  - Registry almacena implementaciones por clave (nombre)
  - Lazy registration: factories crean el plugin bajo demanda
  - El cliente obtiene plugins por nombre sin conocer la clase
  - Ideal para sistemas de plugins, extensiones, strategies
  - Registry vs Service Locator: Registry es para tipos; SL es para dependencias
  - En tests, unregister entre suites para evitar contaminacion
```

### Registry vs Service Locator: cual uso?

Registry es un catalogo de implementaciones: el cliente pide por nombre y recibe una instancia. Service Locator es un resolver de dependencias: el servicio pide sus deps al locator. Registry es para plugins/strategies: el cliente decide cual usar. SL es para DI: el servicio no conoce sus deps concretas. Registry es explicito: el cliente llama a get("csv"). SL es implicito: el servicio llama a locator.get(Logger). Prefiere Registry para extensiones, SL solo en legacy.
