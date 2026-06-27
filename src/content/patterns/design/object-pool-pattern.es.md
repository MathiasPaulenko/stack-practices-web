---
contentType: patterns
slug: object-pool-pattern
title: "Patrón Object Pool"
description: "Reutiliza objetos costosos en lugar de crearlos y destruirlos repetidamente. Un patrón creacional para gestionar recursos escasos eficientemente."
metaDescription: "Aprende el Patrón Object Pool para reutilizar objetos costosos eficientemente. Ejemplos en Python, Java y JavaScript para pools de conexiones."
difficulty: intermediate
topics:
  - design
tags:
  - object-pool
  - pattern
  - design-pattern
  - creational
  - performance
  - resource-management
relatedResources:
  - /patterns/design/singleton-pattern
  - /patterns/design/factory-pattern
  - /guides/connection-pooling-deep-dive-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Object Pool para reutilizar objetos costosos eficientemente. Ejemplos en Python, Java y JavaScript para pools de conexiones."
  keywords:
    - object pool
    - design pattern
    - creational pattern
    - connection pool
    - resource reuse
    - performance
---

# Patrón Object Pool

## Descripción General

El Patrón Object Pool reutiliza objetos costosos de crear en lugar de instanciarlos y destruirlos bajo demanda. Los objetos se extraen de un pool pre-inicializado, se usan y se devuelven para futura reutilización. Este patrón es esencial cuando la creación de objetos es costosa en tiempo o memoria, como conexiones de base de datos, threads o bitmaps grandes.

Sin un pool, cada request crea una nueva conexión, ejecuta una query y la cierra. Bajo carga, esto agota el límite de conexiones de la base de datos y degrada el rendimiento. Un pool de conexiones mantiene un conjunto fijo de conexiones reutilizables, reduciendo drásticamente el overhead.

## Cuándo Usar

Usa el Patrón Object Pool cuando:
- La creación de objetos es costosa (conexiones de red, threads, buffers grandes)
- Los objetos se crean y destruyen frecuentemente en un ciclo de vida corto
- Existe un límite estricto en el número de instancias (conexiones de base de datos, file handles)
- Necesitas uso de recursos predecible en lugar de crecimiento sin límites
- El tiempo de inicialización domina el tiempo de trabajo real del objeto

## Cuándo Evitar

- La creación de objetos es barata y rápida (objetos de datos simples)
- Los objetos mantienen estado mutable que es difícil de resetear entre usos
- El pool mismo se convierte en un cuello de botella o fuente de memory leaks
- Necesitas cleanup determinista (los objetos en pool pueden permanecer vivos más tiempo)

## Solución

### Python

```python
import queue
import threading

class DatabaseConnection:
    _id_counter = 0
    _lock = threading.Lock()

    def __init__(self):
        with DatabaseConnection._lock:
            DatabaseConnection._id_counter += 1
            self.id = DatabaseConnection._id_counter
        self.active = False
        print(f"Created connection {self.id} (expensive)")

    def open(self):
        self.active = True
        return self

    def close(self):
        self.active = False

    def query(self, sql):
        if not self.active:
            raise RuntimeError("Connection not open")
        return f"Result for: {sql}"


class ConnectionPool:
    def __init__(self, max_size=5):
        self.max_size = max_size
        self._available = queue.Queue()
        self._in_use = set()
        self._lock = threading.Lock()

        # Pre-calentar el pool
        for _ in range(max_size):
            self._available.put(DatabaseConnection())

    def acquire(self):
        conn = self._available.get(timeout=5)
        with self._lock:
            self._in_use.add(conn)
        conn.open()
        return conn

    def release(self, conn):
        conn.close()
        with self._lock:
            self._in_use.discard(conn)
        self._available.put(conn)

    def size(self):
        return self._available.qsize() + len(self._in_use)


# Uso
pool = ConnectionPool(max_size=3)
conn = pool.acquire()
result = conn.query("SELECT * FROM users")
print(result)
pool.release(conn)
```

### Java

```java
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;

class DatabaseConnection {
    private static int counter = 0;
    private final int id;
    private boolean active = false;

    public DatabaseConnection() {
        this.id = ++counter;
        System.out.println("Created connection " + id + " (expensive)");
    }

    public void open() { this.active = true; }
    public void close() { this.active = false; }
    public String query(String sql) {
        if (!active) throw new IllegalStateException("Not open");
        return "Result for: " + sql;
    }
}

class ConnectionPool {
    private final BlockingQueue<DatabaseConnection> available;

    public ConnectionPool(int size) {
        available = new ArrayBlockingQueue<>(size);
        for (int i = 0; i < size; i++) {
            available.offer(new DatabaseConnection());
        }
    }

    public DatabaseConnection acquire() throws InterruptedException {
        DatabaseConnection conn = available.take();
        conn.open();
        return conn;
    }

    public void release(DatabaseConnection conn) {
        conn.close();
        available.offer(conn);
    }
}

// Uso
ConnectionPool pool = new ConnectionPool(3);
DatabaseConnection conn = pool.acquire();
System.out.println(conn.query("SELECT * FROM users"));
pool.release(conn);
```

### JavaScript

```javascript
class DatabaseConnection {
  static #counter = 0;

  constructor() {
    this.id = ++DatabaseConnection.#counter;
    this.active = false;
    console.log(`Created connection ${this.id} (expensive)`);
  }

  open() { this.active = true; return this; }
  close() { this.active = false; }
  query(sql) {
    if (!this.active) throw new Error('Not open');
    return `Result for: ${sql}`;
  }
}

class ConnectionPool {
  constructor(maxSize = 5) {
    this.maxSize = maxSize;
    this.available = [];
    this.inUse = new Set();

    for (let i = 0; i < maxSize; i++) {
      this.available.push(new DatabaseConnection());
    }
  }

  acquire() {
    if (this.available.length === 0) {
      throw new Error('Pool exhausted');
    }
    const conn = this.available.pop();
    this.inUse.add(conn);
    return conn.open();
  }

  release(conn) {
    conn.close();
    this.inUse.delete(conn);
    this.available.push(conn);
  }
}

// Uso
const pool = new ConnectionPool(3);
const conn = pool.acquire();
console.log(conn.query('SELECT * FROM users'));
pool.release(conn);
```

## Explicación

El Patrón Object Pool involucra cuatro componentes clave:

- **Pooled Object** (`DatabaseConnection`): El recurso costoso siendo reutilizado
- **Pool** (`ConnectionPool`): Gestiona objetos disponibles y en uso
- **Acquire**: Extrae un objeto del pool, inicializándolo si es necesario
- **Release**: Devuelve el objeto al pool después de resetear su estado

Al pre-crear objetos y reutilizarlos, el pool elimina el overhead repetido de allocación y limita el consumo total de recursos.

## Variantes

| Variante | Caso de Uso | Trade-off |
|----------|-------------|-----------|
| **Pool de tamaño fijo** | Uso de memoria predecible | Puede bloquear o fallar bajo pico de carga |
| **Pool expandible** | Tráfico burst | Riesgo de crecimiento sin límites |
| **Pool perezoso** | Recursos raramente usados | El primer request paga el costo de creación |
| **Borrow-and-return** | Operaciones de corta duración | Requiere disciplina para devolver objetos |

## Mejores Prácticas

- **Configura el tamaño del pool basado en límites reales.** Un pool de conexiones a base de datos no debería exceder `max_connections` menos overhead administrativo.
- **Valida objetos al checkout.** Una conexión en pool puede haber sido cerrada por el servidor; verifica con un health check ligero antes de devolverla.
- **Resetea el estado del objeto al retornarlo.** Limpia buffers, resetea contadores y cierra file handles para prevenir data leaking entre consumidores.
- **Usa timeouts en acquire.** Una espera indefinida cuando el pool está agotado hace que los requests cuelguen para siempre. Falla rápido con un error claro.
- **Monitorea métricas del pool.** Trackea utilización del pool, tiempos de espera y vida útil de objetos para ajustar el tamaño y detectar leaks.

## Errores Comunes

- **Nunca liberar objetos** causa agotamiento del pool y deadlock de la aplicación. Siempre usa try-finally o equivalentes del lenguaje.
- **Pools sobredimensionados** desperdician memoria y pueden abrumar sistemas downstream. Comienza pequeño y escala basado en métricas.
- **No manejar objetos inválidos** devueltos al pool causa fallos en cascada. Valida y evicta conexiones stale.
- **Compartir estado mutable** entre objetos en pool lleva a race conditions. Cada checkout debería presentar una tabla rasa.
- **Usar pools para objetos baratos** añade complejidad innecesaria. Los pools solo valen la pena cuando el costo de creación excede el overhead de gestión.

## Ejemplos del Mundo Real

### JDBC Connection Pool

Las aplicaciones Java usan HikariCP o C3P0 para mantener un pool de conexiones a base de datos. Crear una conexión TCP a PostgreSQL toma ~50ms; reutilizar una de HikariCP toma <1ms.

### Thread Pools

`Executors.newFixedThreadPool()` en Java y `ThreadPoolExecutor` en Python mantienen threads de trabajo en lugar de spawnear nuevos por tarea, evitando el overhead de creación de threads del SO.

### Graphics Buffers

Los motores de juegos hacen pool de vertex buffers y objetos de textura en la GPU. Subir una textura a VRAM es lento; renderizar reutiliza buffers en pool a través de frames.

## Preguntas Frecuentes

**Q: Object Pool es lo mismo que Singleton?**
A: No. Un [Singleton](/patterns/design/singleton-pattern) asegura que una instancia existe globalmente. Un Object Pool gestiona múltiples instancias, reutilizándolas entre muchos consumidores.

**Q: Cómo elijo el tamaño del pool?**
A: Tamaño = (requests concurrentes de pico × tiempo promedio de retención) / duración promedio de request. Monitorea uso real y ajusta. Para pools de DB, mantente debajo de `max_connections - 5`.

**Q: Qué pasa cuando el pool se agota?**
A: Opciones: bloquear y esperar (con timeout), crear un objeto temporal, o rechazar el request. Elige basado en tus requisitos de latencia y capacidad.

**Q: Debería hacer pool de objetos en un lenguaje con garbage collection?**
A: Sí, para recursos costosos. GC maneja memoria, pero sockets de red y threads son recursos del SO que GC no gestiona eficientemente.
