---
contentType: recipes
slug: singleton-pattern-recipe
title: "Asegurar una Única Instancia con el Singleton Pattern"
description: "Cómo garantizar exactamente una instancia de una clase en una aplicación usando inicialización perezosa, creación thread-safe y singletons basados en registro."
metaDescription: "Aprende singleton pattern para instancias únicas. Usa inicialización perezosa, creación thread-safe y singletons basados en registro para asegurar una instancia por app."
difficulty: beginner
topics:
  - design
tags:
  - design
  - singleton-pattern
  - creational-patterns
  - design-patterns
  - patterns
relatedResources:
  - /recipes/factory-pattern-recipe
  - /recipes/hexagonal-architecture
  - /recipes/unit-testing-mocking
  - /recipes/locks-and-mutexes
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende singleton pattern para instancias únicas. Usa inicialización perezosa, creación thread-safe y singletons basados en registro para asegurar una instancia por app."
  keywords:
    - singleton pattern
    - instancia unica
    - inicializacion perezosa
    - singleton thread safe
    - estado global
---

## Visión general

Algunos recursos son inherentemente singulares dentro del alcance de una aplicación: un pool de conexiones a base de datos, un gestor de configuración, un framework de logging o un cache en memoria. Crear múltiples instancias de estos recursos desperdicia memoria, causa inconsistencia de estado y puede agotar límites del sistema (ej. demasiadas conexiones a base de datos). El singleton pattern asegura que una clase tenga exactamente una instancia y provee un punto de acceso global a ella.

La implementación ingenua — un campo estático inicializado al cargar la clase — funciona para casos simples pero falla bajo concurrencia y hace el testing difícil. Un test que muta el estado del singleton filtra esa mutación a tests posteriores. Las implementaciones modernas usan inicialización perezosa, inyección de dependencias o registros para balancear rendimiento, thread safety y testeabilidad. El siguiente enfoque cubre la evolución desde singletons básicos hasta producción.

## Cuándo usarlo

Usa esta receta cuando:

- Una clase gestiona un recurso que debe ser único dentro de la aplicación (pool de conexiones, cache, config). Consulta [Factory Pattern](/recipes/factory-pattern-recipe) para patrones de creación.
- Múltiples instancias causarían conflictos o agotamiento de recursos. Consulta [Connection Pooling](/recipes/databases/database-connection-pooling) para recursos compartidos.
- Necesitas inicialización perezosa para evitar setup costoso durante el arranque
- El singleton es stateless o read-only después de la inicialización (evita estado global mutable). Consulta [Locks y Mutexes](/recipes/concurrency/locks-and-mutexes) para acceso thread-safe.

## Solución

### Singleton Thread-Safe (Java)

```java
public class DatabaseConnectionPool {
    private static volatile DatabaseConnectionPool instance;
    private static final Object lock = new Object();
    private final HikariDataSource dataSource;

    private DatabaseConnectionPool() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(System.getenv("DATABASE_URL"));
        config.setMaximumPoolSize(10);
        this.dataSource = new HikariDataSource(config);
    }

    public static DatabaseConnectionPool getInstance() {
        if (instance == null) {
            synchronized (lock) {
                if (instance == null) {
                    instance = new DatabaseConnectionPool();
                }
            }
        }
        return instance;
    }

    public Connection getConnection() throws SQLException {
        return dataSource.getConnection();
    }
}
```

### Singleton a Nivel de Módulo (Python)

```python
from psycopg2 import pool

class DatabaseConnectionPool:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        self.pool = pool.ThreadedConnectionPool(
            minconn=2, maxconn=10,
            dsn="postgresql://user:pass@localhost/db"
        )

    def get_connection(self):
        return self.pool.getconn()

    def release_connection(self, conn):
        self.pool.putconn(conn)

# Los imports del modulo dan la misma instancia en todas partes
from connection_pool import DatabaseConnectionPool
pool = DatabaseConnectionPool()
```

### Singleton Basado en Registro (TypeScript)

```typescript
class SingletonRegistry {
  private static instances: Map<string, unknown> = new Map();

  static get<T>(key: string, factory: () => T): T {
    if (!SingletonRegistry.instances.has(key)) {
      SingletonRegistry.instances.set(key, factory());
    }
    return SingletonRegistry.instances.get(key) as T;
  }

  static reset(key: string): void {
    SingletonRegistry.instances.delete(key);
  }

  static clear(): void {
    SingletonRegistry.instances.clear();
  }
}

const pool = SingletonRegistry.get('db-pool', () => new ConnectionPool());
SingletonRegistry.reset('db-pool'); // para tests
```

### Singleton con DI Container (C# / .NET)

```csharp
builder.Services.AddSingleton<IDatabaseConnectionPool, DatabaseConnectionPool>();

public class OrderService {
    private readonly IDatabaseConnectionPool _pool;

    public OrderService(IDatabaseConnectionPool pool) {
        _pool = pool;
    }

    public async Task<Order> GetOrder(int id) {
        await using var conn = await _pool.GetConnectionAsync();
        // ...
    }
}
```

## Explicación

- **Double-checked locking**: el ejemplo de Java chequea `instance == null` dos veces — una sin lock (ruta rápida) y otra con lock (ruta lenta). Después del primer chequeo exitoso, otro thread podría haber inicializado la instancia entre el chequeo y el lock, así que el segundo chequeo dentro del bloque sincronizado es necesario. `volatile` asegura visibilidad entre threads.
- **Singleton a nivel de módulo (Python)**: los módulos de Python se importan una vez y se cachean en `sys.modules`. Una clase definida en un módulo e instanciada a nivel de módulo se comporta como singleton. Todos los imports referencian el mismo objeto. Es más simple que `__new__` pero menos explícito.
- **Patrón registro**: en lugar de hardcodear `getInstance()` en cada clase, un registro central mapea claves a instancias singleton. Esto desacopla la creación de la clase, soporta singletons parametrizados y permite reset fácil para testing. El registro mismo es un singleton.
- **Singleton con DI container**: frameworks modernos (Spring, ASP.NET, Angular) gestionan el ciclo de vida de singletons declarativamente. Declaras un binding como singleton scope y el container crea una instancia que inyecta en todas partes. Es el enfoque más testeable — los tests usan un container separado con mocks.

## Variantes

| Enfoque | Thread-safe | Perezoso | Testeable | Mejor para |
|---------|------------|----------|-----------|------------|
| Estático eager | Sí | No | Pobre | Recursos simples, siempre necesarios |
| Double-checked lock | Sí | Sí | Pobre | Inicialización perezosa performance-crítica |
| Bill Pugh (holder) | Sí | Sí | Pobre | Enfoque preferido en Java |
| Enum singleton | Sí | No | Pobre | Singleton basado en enum Java |
| A nivel de módulo | Sí* | Sí | Pobre | Casos simples en Python |
| Registro | Sí | Sí | Bueno | Múltiples singletons nombrados |
| DI container | Sí | Sí | Excelente | Aplicaciones modernas |

## Lo que funciona

- **Prefiere DI sobre singletons manuales**: un container de inyección de dependencias gestiona singletons declarativamente. Configuras `services.AddSingleton<IConfig, AppConfig>()` y el container maneja creación, cacheo y disposición. Las dependencias son explícitas y el testing es trivial.
- **Haz singletons stateless o inmutables**: un singleton mutable es estado global, y el estado global es el enemigo del testing y la concurrencia. Consulta [Prevención de Race Conditions](/recipes/data/race-condition-prevention) para seguridad concurrente. Si el singleton debe mantener estado, hazlo thread-safe (usa locks u operaciones atómicas) y documenta las garantías de thread-safety.
- **Evita singletons para lógica de negocio**: un `UserService` no debería ser singleton. Las reglas de negocio cambian por request (usuarios distintos, contextos distintos). Reserva singletons para infraestructura: pools de conexiones, caches, loggers, lectores de configuración.
- **Implementa IDisposable / Closeable**: un singleton frecuentemente mantiene recursos (conexiones, threads, file handles). Implementa métodos de limpieza y llámalos durante el shutdown de la aplicación. En Spring o ASP.NET, registra hooks de disposición con el container.
- **Documenta thread-safety**: si el singleton no es thread-safe, documentalo claramente. Los consumidores deben sincronizar externamente. Si es thread-safe, documenta qué operaciones son atómicas y cuáles no.

## Errores comunes

- **Testing con singletons mutables**: un test que llama `Config.setDebug(true)` filtra ese setting a todos los tests subsecuentes. Usa un registro con capacidad de reset, o mejor, evita objetos de configuración singleton. Pasa configuración como parámetros de constructor.
- **Inicialización perezosa en código multithread sin sincronización**: dos threads llamando `getInstance()` simultáneamente pueden crear dos instancias antes de que alguna asigne al campo estático. Siempre sincroniza la inicialización perezosa o usa un holder de inicialización thread-safe.
- **Singletons con estado de ámbito de request**: un cache singleton que almacena datos por usuario es una fuga de memoria. Usa objetos de ámbito request o session para estado específico de usuario. Los singletons deben mantener solo datos de ámbito aplicación.
- **Dependencias circulares en singletons**: si `ConnectionPool` es singleton que depende de `ConfigManager`, y `ConfigManager` es singleton que depende de `ConnectionPool`, ninguno puede construirse. Los containers DI detectan esto y lanzan excepciones, pero los singletons manuales se bloquean durante la inicialización estática.

## Preguntas frecuentes

**P: ¿Es el singleton pattern un anti-pattern?**
R: Frecuentemente se usa mal. Los singletons para estado global mutable hacen difícil el testing y el razonamiento. Pero los singletons para configuración inmutable, pools de conexiones y caches thread-safe son legítimos y necesarios. El anti-pattern es el estado global, no las instancias únicas.

**P: ¿Cómo testeo código que usa un singleton?**
R: Si usas un registro, llama `reset()` antes de cada test. Si usas DI, configura el container de test con mocks. Si usas `getInstance()`, refactoriza para aceptar la dependencia vía inyección de constructor. `getInstance()` estático es lo más difícil de testear.

**P: ¿Puedo tener múltiples singletons de la misma clase?**
R: El patrón clásico lo prohíbe, pero los registros y containers DI soportan singletons nombrados o con scope. `services.AddSingleton<IQueue, PriorityQueue>("orders")` y `services.AddSingleton<IQueue, FifoQueue>("events")` implementan `IQueue` como singletons separados.

**P: ¿Qué diferencia hay entre singleton y clase estática?**
R: Un singleton es un objeto — puede implementar interfaces, pasarse como parámetro y mockearse. Una clase estática es solo un namespace para funciones — no puede ser polimórfica, instanciada o inyectada. Prefiere objetos singleton sobre clases estáticas.


### Bill Pugh Holder Idiom (Java)

```java
public class ConfigManager {
    private ConfigManager() {
        // Cargar config desde entorno o archivo
    }

    // Clase interna estática — cargada solo cuando getInstance() se llama
    private static class Holder {
        static final ConfigManager INSTANCE = new ConfigManager();
    }

    public static ConfigManager getInstance() {
        return Holder.INSTANCE;
    }

    public String get(String key) {
        // ...
        return "";
    }
}
```

La JVM garantiza que una clase se inicializa exactamente una vez, y la clase holder no se carga hasta que `getInstance()` se llama por primera vez. Esto da inicialización perezosa sin overhead de sincronización — la JVM maneja la thread safety.

### Enum Singleton (Java)

```java
public enum DatabaseType {
    INSTANCE;

    private final Map<String, String> properties;

    DatabaseType() {
        this.properties = loadProperties();
    }

    public String getProperty(String key) {
        return properties.get(key);
    }

    private Map<String, String> loadProperties() {
        // Cargar desde archivo o env
        return Map.of("driver", "postgresql");
    }
}

// Uso
String driver = DatabaseType.INSTANCE.getProperty("driver");
```

Los enum singletons están garantizados por la JVM como instancias únicas, incluso a través de serialización y reflection. Esta es la forma más robusta de singleton en Java.

### Testing de Código Singleton

```typescript
// Singleton testeable vía registro — reset entre tests
describe('OrderService con singleton pool', () => {
  afterEach(() => {
    SingletonRegistry.clear();
  });

  it('usa pool de conexiones compartido', () => {
    const pool = SingletonRegistry.get('pool', () => new InMemoryConnectionPool());
    const service = new OrderService(pool);

    service.process({ id: '1', items: [] });

    expect(pool.getConnectionsUsed()).toBe(1);
  });

  it('aísla estado entre tests', () => {
    // Registro fue limpiado — nueva instancia de pool
    const pool = SingletonRegistry.get('pool', () => new InMemoryConnectionPool());
    expect(pool.getConnectionsUsed()).toBe(0);
  });
});
```

```java
// Java — test con DI container
@Test
void testOrderServiceWithMockPool() {
    var container = new DIContainer();
    container.bind(IDatabaseConnectionPool.class, MockConnectionPool.class, Scope.SINGLETON);

    var service = container.resolve(OrderService.class);
    service.process(new Order("1", List.of()));

    var mockPool = container.resolve(IDatabaseConnectionPool.class);
    verify(mockPool, times(1)).getConnection();
}
```

## Mejores Prácticas Adicionales

1. **Usa singletons con scope en frameworks web.** Los singletons request-scoped en ASP.NET o Spring no son singletons reales — existen uno por request:

```csharp
// Una instancia por HTTP request, no por app
builder.Services.AddScoped<IRequestContext, RequestContext>();
```

2. **Evita ruptura de singleton por reflection.** En Java, reflection puede acceder constructores privados. Los enum singletons lo previenen. Para singletons basados en clases, añade un guard en el constructor:

```java
private DatabaseConnectionPool() {
    if (instance != null) {
        throw new IllegalStateException("Use getInstance()");
    }
    // ...
}
```

3. **Prefiere monostate sobre singleton para configuración.** Todas las instancias comparten estado pero la clase se puede instanciar libremente:

```typescript
class AppConfig {
  private static _values: Record<string, string> = {};

  constructor() {}

  get(key: string): string {
    return AppConfig._values[key];
  }

  set(key: string, value: string): void {
    AppConfig._values[key] = value;
  }
}
```

## Errores Comunes Adicionales

1. **Usar singleton para compartir estado entre microservicios.** Cada microservicio tiene su propia JVM/proceso — un singleton en uno no es visible para otro. Usa un cache distribuido (Redis) o base de datos compartida.

2. **Singleton con colecciones mutables sin sincronización.** Un singleton con un `HashMap` que múltiples threads leen y escriben se corromperá. Usa `ConcurrentHashMap` o sincroniza el acceso:

```java
// Mal: race condition en HashMap
private Map<String, User> cache = new HashMap<>();

// Bien: thread-safe
private Map<String, User> cache = new ConcurrentHashMap<>();
```

3. **Olvidar cerrar recursos singleton en shutdown.** Los pools de conexiones y thread executors filtran si no se cierran:

```java
// Hook de shutdown
Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    DatabaseConnectionPool.getInstance().close();
}));
```

## FAQ Adicional

### ¿Cómo manejo la serialización con singletons?

En Java, implementa `readResolve()` para retornar la instancia existente en lugar de crear una nueva durante la deserialización:

```java
protected Object readResolve() {
    return getInstance();
}
```

Los enum singletons manejan esto automáticamente — la JVM asegura que solo existe una constante enum.

### ¿Cuál es la diferencia entre monostate y singleton?

Un singleton enforcea una instancia. Un monostate permite múltiples instancias pero todas comparten el mismo estado estático. Monostate es más flexible — puedes crear instancias libremente, pasarlas como parámetros y mockearlas en tests. Usa monostate cuando quieras estado compartido sin restringir la instanciación.

### ¿Esta solución está lista para producción?

Sí. Los patrones de double-checked locking, Bill Pugh holder y enum singleton en Java son todos probados en producción. El patrón de registro en TypeScript se usa en codebases de producción. El enfoque de DI container en C# es el estándar en aplicaciones ASP.NET.

### ¿Cuáles son las características de rendimiento?

La inicialización estática eager tiene costo cero en runtime después de la carga de clase. Double-checked locking tiene un volatile read en la ruta rápida. Bill Pugh holder tiene cero overhead — la JVM lo maneja. Las búsquedas en registro son operaciones O(1) en Map. La resolución de DI container involucra una búsqueda en diccionario, típicamente nanosegundos.

### ¿Cómo depuro problemas con este enfoque?

Si un singleton parece tener múltiples instancias, verifica: (1) jerarquía de classloaders en Java EE/application servers, (2) serialización creando nuevas instancias, (3) reflection saltándose el constructor privado. Añade logging en el constructor para rastrear la creación. Usa `System.identityHashCode(instance)` para verificar la identidad del objeto.
