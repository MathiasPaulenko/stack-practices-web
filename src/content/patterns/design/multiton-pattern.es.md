---



contentType: patterns
slug: multiton-pattern
title: "Patrón Multiton"
description: "Gestiona un mapa de instancias singleton nombradas, proporcionando acceso controlado a un conjunto finito de objetos compartidos identificados por claves."
metaDescription: "Aprende el Patrón Multiton para gestionar instancias singleton nombradas. Ejemplos en Python, Java y JavaScript para registros de objetos con clave."
difficulty: intermediate
topics:
  - design
tags:
  - multiton
  - pattern
  - design-pattern
  - creational
  - registry
  - singleton
relatedResources:
  - /patterns/singleton-pattern
  - /patterns/factory-pattern
  - /patterns/object-pool-pattern
  - /patterns/registry-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Multiton para gestionar instancias singleton nombradas. Ejemplos en Python, Java y JavaScript para registros de objetos con clave."
  keywords:
    - multiton
    - design pattern
    - creational pattern
    - named singleton
    - registry



---

# Patrón Multiton

## Descripción General

El Patrón Multiton extiende el concepto de Singleton para gestionar múltiples instancias nombradas. En lugar de una única instancia global, un Multiton mantiene un registro de instancias indexadas por nombre o identificador. Solicitar la misma clave siempre retorna la misma instancia, pero diferentes claves producen instancias diferentes.

Este patrón es útil cuando necesitas un conjunto controlado de singletons relacionados — por ejemplo, pools de conexiones a base de datos por tenant, instancias de logger por módulo o configuraciones de tema por cliente.

## Cuándo Usar


- For alternatives, see [Singleton Pattern](/es/patterns/singleton-pattern/).

Usa el Patrón Multiton cuando:
- Necesitas un conjunto controlado de instancias tipo singleton identificadas por claves
- Los recursos son costosos y deben compartirse por categoría, no globalmente
- Quieres evitar crear instancias para claves que nunca se usan (inicialización lazy)
- El número de claves posibles es finito y conocido

## Cuándo Evitar

- Las claves son live o ilimitadas (usa un caché o pool genérico en su lugar)
- Las instancias son livianas y baratas de crear (la instanciación directa es más simple)
- Necesitas gestión de ciclo de vida por instancia (usa una factory con contenedor DI)

## Solución

### Python

```python
import threading

class DatabaseConnectionPool:
    _instances = {}
    _lock = threading.Lock()

    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.connections = []
        print(f"Pool creado para tenant {tenant_id}")

    @classmethod
    def get_instance(cls, tenant_id: str):
        if tenant_id not in cls._instances:
            with cls._lock:
                if tenant_id not in cls._instances:
                    cls._instances[tenant_id] = cls(tenant_id)
        return cls._instances[tenant_id]

    def query(self, sql: str):
        return f"[{self.tenant_id}] Resultado para: {sql}"


# Uso
pool_a = DatabaseConnectionPool.get_instance("tenant-a")
pool_b = DatabaseConnectionPool.get_instance("tenant-b")
pool_a2 = DatabaseConnectionPool.get_instance("tenant-a")

print(pool_a is pool_a2)  # True — misma instancia
print(pool_a is pool_b)   # False — instancia diferente
```

### Java

```java
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

public class ThemeManager {
    private static final Map<String, ThemeManager> instances = new ConcurrentHashMap<>();
    private final String themeName;

    private ThemeManager(String themeName) {
        this.themeName = themeName;
        System.out.println("Theme manager creado para " + themeName);
    }

    public static ThemeManager getInstance(String themeName) {
        return instances.computeIfAbsent(themeName, ThemeManager::new);
    }

    public String apply(String component) {
        return "[" + themeName + "] Estilizado " + component;
    }
}

// Uso
ThemeManager light = ThemeManager.getInstance("light");
ThemeManager dark = ThemeManager.getInstance("dark");
ThemeManager light2 = ThemeManager.getInstance("light");

System.out.println(light == light2); // true
System.out.println(light == dark);   // false
```

### JavaScript

```javascript
class Logger {
  static #instances = new Map();

  constructor(moduleName) {
    this.moduleName = moduleName;
    console.log(`Logger creado para ${moduleName}`);
  }

  static getInstance(moduleName) {
    if (!Logger.#instances.has(moduleName)) {
      Logger.#instances.set(moduleName, new Logger(moduleName));
    }
    return Logger.#instances.get(moduleName);
  }

  log(message) {
    console.log(`[${this.moduleName}] ${message}`);
  }
}

// Uso
const dbLogger = Logger.getInstance('database');
const apiLogger = Logger.getInstance('api');
const dbLogger2 = Logger.getInstance('database');

console.log(dbLogger === dbLogger2); // true
console.log(dbLogger === apiLogger); // false
```

## Explicación

El Patrón Multiton involucra:

- **Registro**: Un mapa o diccionario que almacena instancias indexadas por identificador
- **Factory Method**: `getInstance(clave)` crea o retorna la instancia existente para esa clave
- **Constructor Privado**: Previene la instanciación directa fuera de la clase
- **Thread Safety**: Sincronización u operaciones atómicas previenen la creación duplicada bajo concurrencia

## Variantes

| Variante | Comportamiento | Caso de Uso |
|----------|----------------|-------------|
| **Lazy Multiton** | Crea al primer acceso | Espacios de claves grandes donde la mayoría no se usan |
| **Eager Multiton** | Pre-crea todas las instancias | Conjunto pequeño y fijo de claves (temas, entornos) |
| **Bounded Multiton** | Evicita la más antigua cuando está lleno | Caches sensibles a memoria con capacidad máxima |
| **Weak Multiton** | Permite GC cuando no hay referencias | Recursos temporales por-request |

## Lo que funciona

- **Usa registros thread-safe.** El acceso concurrente al mapa de instancias es la fuente más común de bugs.
- **Limpia instancias no usadas.** Para claves live, implementa evicción o TTL para prevenir crecimiento ilimitado.
- **Valida las claves.** Rechaza claves desconocidas o malformadas en lugar de crear instancias para ellas.
- **Documenta el namespace de claves.** Los multitones son difíciles de descubrir; documenta qué claves son válidas y qué representan.
- **No almacenes estado global mutable** en instancias multiton a menos que sea el comportamiento intencionado.

## Errores Comunes

- **Crecimiento ilimitado de claves** causa memory leaks cuando las claves se generan live (ej., IDs de usuario).
- **Race conditions** durante la creación de instancias bajo carga llevan a instancias duplicadas para la misma clave.
- **Hardcodear claves** en código cliente dispersa la configuración. Usa constantes o selección de claves basada en configuración.
- **Usar Multiton como caché** — los caches necesitan políticas de evicción; los multitones son para familias permanentes de singletons.
- **Exponer el registro interno** permite que código externo modifique o limpie instancias de forma impredecible.

## Ejemplos del Mundo Real

### Java Locale

`NumberFormat.getCurrencyInstance(Locale.US)` retorna un formatter compartido para moneda US. Diferentes locales retornan diferentes singletons de formatter.

### Frameworks de Logging

Log4j y SLF4J mantienen loggers nombrados por clase o módulo. `LoggerFactory.getLogger("com.myapp.db")` siempre retorna la misma instancia de logger.

### Pools de Conexiones

Aplicaciones SaaS multi-tenant suelen mantener un pool de base de datos por tenant, accedido por `PoolManager.get(tenantId)`.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Multiton y un Map común?**
A: Un Multiton controla la creación de instancias (constructor privado) y garantiza la misma instancia para la misma clave. Un Map solo almacena objetos creados externamente.

**Q: Puedo eliminar instancias de un Multiton?**
A: Sí, pero con cuidado. Provee un método controlado `evict(clave)` para limpieza explícita en lugar de exponer el mapa interno.

**Q: Es Multiton un anti-patrón?**
A: Como Singleton, no es inherentemente malo pero se abusa fácilmente. Es apropiado para conjuntos finitos y bien definidos de recursos compartidos.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.


## Temas Avanzados

### Escenario: Multiton para Conexiones Multi-tenant

```typescript
// Multiton: singleton con clave, una instancia por key
class TenantDatabase {
  private static instances = new Map<string, TenantDatabase>();
  private pool: Pool;

  private constructor(private tenantId: string, config: DBConfig) {
    this.pool = createPool({
      host: config.host,
      port: config.port,
      database: `tenant_${tenantId}`,
      max: 10,
    });
  }

  static getInstance(tenantId: string, config?: DBConfig): TenantDatabase {
    if (!this.instances.has(tenantId)) {
      if (!config) throw new Error(`Config required for new tenant: ${tenantId}`);
      this.instances.set(tenantId, new TenantDatabase(tenantId, config));
    }
    return this.instances.get(tenantId)!;
  }

  async query(sql: string, params: unknown[]) {
    return this.pool.query(sql, params);
  }

  static async closeAll(): Promise<void> {
    for (const instance of this.instances.values()) {
      await instance.pool.end();
    }
    this.instances.clear();
  }

  static getActiveTenants(): string[] {
    return [...this.instances.keys()];
  }
}

// Uso: una conexion DB por tenant
const tenantA = TenantDatabase.getInstance("tenant-a", { host: "localhost", port: 5432 });
const tenantB = TenantDatabase.getInstance("tenant-b", { host: "localhost", port: 5432 });
const tenantA2 = TenantDatabase.getInstance("tenant-a"); // misma instancia

console.log(tenantA === tenantA2); // true
console.log(tenantA === tenantB); // false
console.log(TenantDatabase.getActiveTenants()); // ["tenant-a", "tenant-b"]

// Comparacion: Singleton vs Multiton
  | Patron | Instancias | Clave | Use case |
  |--------|-----------|-------|----------|
  | Singleton | 1 global | N/A | Logger, config |
  | Multiton | N por key | string/enum | Multi-tenant, multi-DB |
  | Factory | N ilimitadas | N/A | Crear objetos variados |
  | Object Pool | N limitadas | N/A | Reutilizar objetos caros |
```

Lecciones:
  - Multiton es Singleton con clave: una instancia por key
  - Ideal para multi-tenant: una conexion DB por tenant
  - closeAll() para limpiar al shutdown
  - Map para almacenar instancias: O(1) lookup
  - En tests, siempre resetar con closeAll() entre suites
```

### Como evito memory leaks con Multiton?

Llama closeAll() o removeInstance(key) cuando un tenant ya no es activo. Implementa un TTL o LRU eviction: si hay mas de N tenants activos, cierra el menos usado. En K8s, los pods se reciclan, pero en procesos long-running, los tenants inactivos pueden acumularse. Monitorea getActiveTenants() y alerta si crece sin limite.


End of document. Review and update quarterly.