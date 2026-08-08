---
contentType: guides
slug: cap-theorem-guide
title: "Teorema CAP y Trade-offs de Bases de Datos"
description: "Guía práctica del teorema CAP: consistencia, disponibilidad y tolerancia a particiones. Aprende a elegir los trade-offs correctos para tu aplicación."
metaDescription: "Guía del teorema CAP: consistencia, disponibilidad, tolerancia a particiones. Elige los trade-offs correctos de base de datos para tus requerimientos."
difficulty: intermediate
topics:
  - databases
  - architecture
tags:
  - architecture
  - consistency
  - database
  - availability
  - guide
  - distributed-systems
relatedResources:
  - /guides/nosql-database-selection-guide
  - /guides/database-sharding-partitioning-guide
  - /guides/microservices-architecture-guide
  - /recipes/microservices-communication
  - /recipes/retry-backoff
  - /recipes/workflow-engine
  - /recipes/database-deadlocks-retries
  - /recipes/database-read-replicas
lastUpdated: "2026-06-12"
publishedAt: "2026-06-12"
author: Mathias Paulenko
seo:
  metaDescription: "Guía del teorema CAP: consistencia, disponibilidad, tolerancia a particiones. Elige los trade-offs correctos de base de datos para tus requerimientos."
  keywords:
    - teorema cap explicado
    - consistencia disponibilidad tolerancia particiones
    - trade offs base de datos
    - acid vs base
    - consistencia eventual





---
## Introducción

El teorema CAP establece que un almacén de datos distribuido puede garantizar como máximo dos de estas tres propiedades: Consistencia, Disponibilidad y Tolerancia a Particiones. Dado que las particiones de red son inevitables, realmente estás eligiendo entre sistemas CP (Consistencia + Tolerancia a Particiones) y AP (Disponibilidad + Tolerancia a Particiones). Esta guía explica qué significa cada propiedad y cómo elegir el trade-off correcto.

## Las Tres Propiedades

### Consistencia (C)

Cada lectura recibe la escritura más reciente o un error. Todos los nodos ven los mismos datos al mismo tiempo.

```
Cliente escribe X=10 en Nodo A
Cliente lee X desde Nodo B → debe obtener 10 (o error)
```

**Ejemplos:** PostgreSQL, MongoDB (con majority write concern), etcd, ZooKeeper.

### Disponibilidad (A)

Cada solicitud recibe una respuesta sin error, sin garantía de que contenga la escritura más reciente.

```
Cliente escribe X=10 en Nodo A (particionado de Nodo B)
Cliente lee X desde Nodo B → obtiene valor stale (ej: X=5)
```

**Ejemplos:** Cassandra, DynamoDB, Riak, Couchbase.

### Tolerancia a Particiones (P)

El sistema continúa operando a pesar de particiones de red (nodos que no pueden comunicarse).

**Realidad:** La tolerancia a particiones no es opcional en sistemas distribuidos. Las redes fallan. Debes elegir CP o AP.

## CP vs AP en la Práctica

### Sistemas CP (Eligen Consistencia)

| Cuándo Elegir | Ejemplos |
|--------------|----------|
| Transacciones financieras | Saldos bancarios, trading de acciones |
| Gestión de inventario | Conteos de stock de e-commerce |
| Almacenes de configuración | Service discovery, feature flags |
| Elección de líder | Locks distribuidos, coordinación de cluster |

**Trade-off:** Si ocurre una partición, el sistema puede rechazar escrituras (sacrificando disponibilidad) para mantener consistencia.

### Sistemas AP (Eligen Disponibilidad)

| Cuándo Elegir | Ejemplos |
|--------------|----------|
| Feeds de redes sociales | Timeline de Twitter, feed de Facebook |
| Analytics y métricas | Datos de series de tiempo, tracking de clicks |
| Almacenes de sesiones | Caché de sesiones de usuarios |
| Entrega de contenido | Caches de CDN, réplicas de lectura |

**Trade-off:** Si ocurre una partición, el sistema acepta escrituras en ambos lados de la partición, creando inconsistencia temporal que se resuelve después.

## PACELC: Extendiendo CAP

CAP solo discute comportamiento durante una partición. PACELC agrega comportamiento cuando no hay partición:

| Sistema | Durante Partición | Operación Normal |
|---------|-------------------|-----------------|
| **PA/EL** | Disponible | Optimizado para latencia (consistencia eventual) |
| **PA/EC** | Disponible | Optimizado para consistencia |
| **PC/EL** | Consistente | Optimizado para latencia |
| **PC/EC** | Consistente | Optimizado para consistencia |

## Modelos de Consistencia

| Modelo | Descripción | Ejemplo |
|--------|-------------|---------|
| **Fuerte** | Todas las lecturas ven la última escritura | PostgreSQL, etcd |
| **Causal** | Las lecturas respetan relaciones causales | Base de datos COPS |
| **Sesión** | Lecturas en una sesión ven escrituras previas | DynamoDB session consistency |
| **Staleness acotada** | Lecturas están como máximo X segundos stale | Azure Cosmos DB |
| **Eventual** | Las lecturas eventualmente convergen | Cassandra, S3 |

## Ejemplos del Mundo Real

### Checkout de E-Commerce

| Operación | Consistencia Requerida | Elección |
|-----------|----------------------|----------|
| Verificar stock | Fuerte (no vender de más) | CP — query nodo primario |
| Agregar al carrito | Sesión | AP — cache con afinidad de sesión |
| Ver recomendaciones | Eventual | AP — lectura desde cache |
| Procesar pago | Fuerte | CP — transacción ACID |

### Feed de Redes Sociales

| Operación | Consistencia Requerida | Elección |
|-----------|----------------------|----------|
| Publicar tweet | Eventual | AP — aceptar escritura, propagar async |
| Ver feed | Eventual | AP — cacheado, puede estar segundos stale |
| Dar like | Eventual | AP — incrementar contador, reconciliar después |
| Eliminar cuenta | Fuerte | CP — asegurar que todos los réplicas eliminen |

## Lo que funciona

- **No uses consistencia fuerte en todas partes** — cuesta latencia y disponibilidad
- **Identifica tus requerimientos de consistencia por operación** — no todos los datos necesitan las mismas garantías
- **Usa [patrones saga](/guides/architecture/event-driven-architecture-guide) para transacciones distribuidas** — no fuerces ACID entre servicios
- **Diseña para [idempotencia](/recipes/messaging/message-idempotency)** — la consistencia eventual significa reintentos, y los reintentos significan duplicados
- **Monitorea [lag de replicación](/recipes/databases/database-replication)** — el lag es la distancia entre "escrito" y "visible en todas partes"

## Errores Comunes

- Tratar todos los datos como si necesitaran consistencia fuerte — la mayoría de datos de aplicación está bien con eventual
- Construir sistemas distribuidos sin entender los trade-offs — lleva a fallas impredecibles
- Asumir que "distribuido" significa "más consistente" — usualmente es lo opuesto
- Usar una base CP para una carga de trabajo AP (o viceversa) — empareja la herramienta al requerimiento. Consulta [selección NoSQL](/guides/databases/nosql-database-selection-guide).
- Ignorar [lag de replicación](/recipes/databases/database-replication) en escenarios read-after-write — los usuarios pueden no ver sus propias escrituras inmediatamente




## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de architecture y consistency para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica teorema cap y trade-offs de bases de datos** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Preguntas Frecuentes

### ¿Es posible tener las tres propiedades CAP?

No. El teorema es una prueba matemática: en presencia de una partición de red, debes elegir entre consistencia y disponibilidad. Ningún sistema distribuido puede garantizar las tres simultáneamente.

### ¿CAP significa que no puedo tener consistencia y disponibilidad?

No. Cuando no hay partición, puedes tener ambas. El trade-off solo aplica durante una partición. Muchos sistemas son CA (consistentes y disponibles) bajo condiciones normales y se vuelven CP o AP solo durante fallas.

### ¿Cómo elijo entre CP y AP?

Pregunta: "¿Qué duele más — una escritura fallida o datos stale?" Si escrituras fallidas son inaceptables (pagos, inventario), elige CP. Si datos stale son aceptables (feeds, analytics), elige AP. La mayoría de sistemas usa una mezcla: CP para paths críticos, AP para todo lo demás.


## Temas Avanzados

### Escenario Detallado: Eleccion de Base de Datos para una App FinTech

```text
Sistema: App de pagos FinTech (microservicios)
Servicios: Cuentas, Transferencias, Notificaciones, Analytics

Matriz de requisitos por servicio:
  | Servicio | Consistencia | Disponibilidad | Latencia | Eleccion |
  |----------|--------------|----------------|----------|----------|
  | Cuentas (saldos) | Fuerte (CP) | 99.99% | < 10ms | PostgreSQL (primario + replica sync) |
  | Transferencias | Fuerte (CP) | 99.99% | < 50ms | PostgreSQL + saga pattern |
  | Notificaciones | Eventual (AP) | 99.9% | < 500ms | Cassandra (write-heavy) |
  | Analytics | Eventual (AP) | 99.9% | < 5s | ClickHouse (columnar OLAP) |
  | Cache de sesion | Eventual (AP) | 99.95% | < 2ms | Redis (in-memory) |
  | Feature flags | Fuerte (CP) | 99.9% | < 50ms | etcd (Raft consensus) |

Configuracion PostgreSQL para servicio de Cuentas:
  - Primario: 1 instancia (escrituras)
  - Replicas sincronas: 2 (lecturas + failover)
  - Synchronous commit: ON (esperar confirmacion de al menos 1 replica)
  - Failover: Patroni con etcd para consensus

  postgresql.conf:
    synchronous_commit = on
    synchronous_standby_names = "FIRST 1 (replica1, replica2)"
    wal_level = replica
    max_wal_senders = 10

Configuracion Cassandra para Notificaciones:
  - 5 nodos en 3 datacenters
  - Replication factor: 3 por datacenter
  - Consistency level: LOCAL_QUORUM para escrituras
  - Compaction: Size-tiered (STCS) para datos de notificacion

  CREATE KEYSPACE notifications WITH replication = {
      "class": "NetworkTopologyStrategy",
      "dc1": 3, "dc2": 3, "dc3": 3
  };

  CREATE TABLE notifications (
      user_id UUID,
      notification_id TIMEUUID,
      type TEXT,
      payload JSON,
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP,
      PRIMARY KEY (user_id, notification_id)
  ) WITH CLUSTERING ORDER BY (notification_id DESC);

Manejo de particiones de red:
  - Cuentas (CP): Si el primario pierde contacto con replicas,
    rechaza escrituras. Los usuarios no pueden transferir dinero
    pero los saldos son consistentes.
  - Notificaciones (AP): Si un datacenter se aisla,
    las notificaciones se aceptan en ambos lados.
    Hinted handoff resuelve la consistencia al reconectar.

Monitoreo:
  - Replication lag PostgreSQL: < 100ms (alerta si > 500ms)
  - Cassandra repair: ejecutar weekly para anti-entropy
  - etcd leader changes: alertar si > 1 por hora
  - Transferencias fallidas por particion: dashboard en tiempo real

Lecciones aprendidas:
  - No todos los servicios necesitan la misma base de datos
  - CP para dinero, AP para todo lo demas
  - El costo de consistencia fuerte es latencia y disponibilidad reducida
  - Monitorear replication lag es critico para detectar problemas antes
```

### Que es consistencia tunable?

Sistemas como Cassandra y DynamoDB permiten ajustar el nivel de consistencia por operacion. ONE: lee de un nodo (rapido, eventual). QUORUM: lee de mayoria (consistente, mas lento). ALL: lee de todos (maxima consistencia, menor disponibilidad). Esto te permite elegir el trade-off por consulta, no por sistema. Usa QUORUM para operaciones criticas y ONE para lecturas de cache o analytics.



























































End of document. Review and update quarterly.

## Troubleshooting

- **Query is slow after an index change**: check execution plans and cardinality estimates.   Rebuild statistics and verify the index is being used.
- **Replication lag grows**: Split large writes and consider parallel replication.
- **Connections exhausted**: review connection pool size, idle timeouts, and leaked connections.
- **Backup takes too long**: enable compression, incremental backups, and off-peak scheduling.
- **Deadlocks in high concurrency**: access tables and rows in a consistent order.

## Errores Comunes en Producción

- Tratar la guía como un checklist para completar una vez en lugar de una práctica por evolucionar.
- Adoptar cada recomendación de golpe en lugar de comenzar con un cambio medido.
- Saltar la evaluación de madurez e imponer prácticas avanzadas a un equipo no preparado.
- No actualizar runbooks y expectativas de guardia al introducir nuevas prácticas.
- Ignorar datos reales de incidentes al priorizar qué partes de la guía aplicar primero.
- No asignar un responsable que revise decisiones trimestralmente.
- Copiar ejemplos sin adaptarlos a las herramientas y restricciones reales del equipo.
- Olvidar medir resultados antes de agregar la siguiente mejora.
