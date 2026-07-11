---
contentType: guides
slug: nosql-database-selection-guide
title: "Selección de Base de Datos NoSQL"
description: "Guía práctica para elegir la base de datos NoSQL correcta. Compara documentos, clave-valor, columnas anchas y grafos con criterios de selección y tips de migración."
metaDescription: "Guía de selección de bases de datos NoSQL: compara MongoDB, DynamoDB, Cassandra, Redis. Elige el store de documentos, clave-valor o columnas anchas correcto."
difficulty: intermediate
topics:
  - databases
tags:
  - cassandra
  - database
  - dynamodb
  - guia
  - mongodb
  - nosql
  - redis
  - seleccion-base-de-datos
relatedResources:
  - /guides/databases/database-design-guide
  - /guides/databases/sql-performance-tuning-guide
  - /guides/architecture/system-design-interview-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Guía de selección de bases de datos NoSQL: compara MongoDB, DynamoDB, Cassandra, Redis. Elige el store de documentos, clave-valor o columnas anchas correcto."
  keywords:
    - seleccion base de datos nosql
    - mongodb vs dynamodb
    - cassandra vs mongodb
    - document store vs clave valor
    - elegir base de datos nosql
---

# Selección de Base de Datos NoSQL

## Introducción

Las bases de datos NoSQL intercambian la consistencia estricta y el modelo relacional del SQL por flexibilidad, crecimiento horizontal y patrones de acceso especializados. Elegir la correcta significa hacer coincidir la forma de tus datos, los patrones de consulta y los requerimientos de consistencia con el store adecuado.

## Las Cuatro Familias NoSQL

| Familia | Estructura | Mejor Para | Ejemplos |
|---------|-----------|------------|----------|
| **Documento** | Documentos tipo JSON con estructuras anidadas | Gestión de contenido, perfiles de usuario, catálogos | MongoDB, Firestore, Couchbase |
| **Clave-Valor** | Búsquedas simples clave → valor | Sesiones, caching, feature flags | Redis, DynamoDB, Riak |
| **Columnas Anchas** | Familias de columnas con filas como mapas dispersos | Series de tiempo, telemetría de alta escritura, mensajería | Cassandra, HBase, ScyllaDB |
| **Grafo** | Nodos y relaciones con propiedades | Redes sociales, motores de recomendación, detección de fraude | Neo4j, Amazon Neptune |

## Document Stores: MongoDB

### Cuándo Elegir

- Estructuras de datos ricas y anidadas con arrays y subdocumentos
- Esquema flexible que evoluciona con el tiempo
- Necesidad de índices secundarios y pipelines de agregación
- Consultas que se parecen a matching de objetos JavaScript

### Trade-offs

| Pro | Contra |
|-----|--------|
| Esquema flexible | La validación de esquema debe configurarse explícitamente |
| Lenguaje de consulta rico | Los joins son costosos y limitados |
| Índices secundarios | Los índices consumen RAM y ralentizan escrituras |
| Escalado horizontal (sharding) | Sharding agrega complejidad operativa |

## Key-Value Stores: DynamoDB y Redis

### DynamoDB (AWS)

Mejor para: latencia predecible a cualquier escala, patrones de lectura/escritura simples, arquitecturas serverless.

**Restricción crítica:** Los patrones de acceso deben conocerse de antemano. DynamoDB está optimizado para rutas de consulta conocidas, no para exploración ad-hoc.

### Redis

Mejor para: caching, leaderboards en tiempo real, rate limiting, almacenamiento de sesiones.

**Restricción crítica:** Todos los datos deben caber en RAM. Redis no es un store primario para datasets grandes.

## Wide-Column Stores: Cassandra

### Cuándo Elegir

- Workloads write-heavy (series de tiempo, IoT, mensajería)
- Necesidad de crecimiento lineal en hardware commodity
- Tolerancia a consistencia eventual y CQL

### Modelo de Datos

Cassandra es query-first: las tablas se diseñan alrededor de consultas específicas de lectura, no de entidades normalizadas.

## Matriz de Decisión

| Requerimiento | Mejor Elección | Por Qué |
|---------------|---------------|---------|
| Documentos JSON flexibles y anidados | MongoDB | Modelo de documento nativo, lenguaje de consulta rico |
| Búsquedas por clave con latencia predecible a escala | DynamoDB | Latencia de un dígito en ms, auto-scaling, serverless |
| Escrituras de series de tiempo de alto throughput | Cassandra | Almacenamiento log-structured, excelente performance de escritura |
| Datos efímeros y caching | Redis | Velocidad en memoria, estructuras de datos ricas |
| Recorrido complejo de relaciones | Neo4j | Recorridos de grafo optimizados |
| Transacciones ACID multi-item | PostgreSQL | Los stores NoSQL típicamente carecen de transacciones cross-documento |

## Tips de Migración desde SQL

| Hábito SQL | Adaptación NoSQL |
|-----------|-----------------|
| Tablas normalizadas | Embebe datos relacionados cuando se acceden juntos; referencia cuando se acceden por separado |
| JOINs por todas partes | Diseña tablas/colecciones alrededor de patrones de consulta, no de entidades |
| IDs auto-incrementales | Usa [UUIDs](/recipes/data/uuid-generation) o claves compuestas (user_id + timestamp) |
| Analytics ad-hoc | Usa [change data capture](/guides/architecture/event-driven-architecture-guide) para stream a un data warehouse |
| Fuente única de verdad | Acepta que diferentes stores pueden tener diferentes vistas de la verdad (CQRS) |

## Lo que funciona

- **Modela para tus lecturas, no para tus escrituras** — el performance NoSQL depende del patrón de acceso
- **Evita particiones calientes** — distribuye escrituras uniformemente entre claves de partición
- **Configura TTLs donde sea apropiado** — expira datos viejos automáticamente en lugar de jobs de limpieza
- **Prueba con volúmenes de datos de producción** — el comportamiento a 1K filas no predice el comportamiento a 1B filas
- **Ten un camino de migración** — la gravedad de datos es real; elige cuidadosamente porque migrar después es costoso

## Errores Comunes

- Usar MongoDB como cache (Redis es más barato y rápido)
- Usar DynamoDB para analytics ad-hoc (Athena/BigQuery son más adecuados)
- Usar Cassandra para OLTP con consultas complejas (Cassandra brilla en queries simples, scoped a partición)
- Tratar NoSQL como "SQL que crece mejor" — el modelo de datos es fundamentalmente diferente
- Ignorar complejidad operativa — Cassandra y MongoDB sharded requieren expertise operativo dedicado

## Ejemplo: Modelado de Datos NoSQL

```javascript
// MongoDB — modelo de documento embebido para e-commerce
db.products.insertOne({
  _id: "prod-001",
  name: "Laptop Pro 15",
  price: 1299.99,
  category: "electronics",
  specs: { cpu: "i7", ram: "16GB", storage: "512GB SSD" },
  reviews: [
    { user: "alice", rating: 5, comment: "Excelente", date: "2026-01-15" },
    { user: "bob", rating: 4, comment: "Buen producto", date: "2026-02-01" }
  ]
});

// Consulta eficiente sin joins
db.products.find(
  { category: "electronics", "specs.ram": "16GB" },
  { name: 1, price: 1, "specs.cpu": 1 }
).sort({ price: 1 }).limit(20);
```

## Preguntas Frecuentes

### ¿Debería migrar de PostgreSQL a MongoDB por flexibilidad?

No solo por flexibilidad. PostgreSQL tiene JSONB, que te da flexibilidad de documento mientras mantienes transacciones ACID. Migra a MongoDB cuando necesites sharding horizontal o un lenguaje de consulta nativo de documentos.

### ¿Puedo usar múltiples bases de datos NoSQL en una aplicación?

Sí, y es común. Usa Redis para cache/sesiones, DynamoDB para perfiles de usuario, y Elasticsearch para búsqueda. Esto es persistencia políglota. El trade-off es complejidad operativa.

### ¿Cómo manejo transacciones entre bases de datos NoSQL?

La mayoría de stores NoSQL no soportan transacciones ACID cross-documento o cross-table. Usa [sagas](/guides/architecture/event-driven-architecture-guide), patrones outbox, u [operaciones idempotentes](/recipes/messaging/message-idempotency) con entrega at-least-once para lograr consistencia eventual.


## Temas Avanzados

### Escenario Detallado: Arquitectura Poliglota para E-commerce

```text
Sistema: E-commerce a escala (5 bases de datos diferentes)
Volumen: 1M productos, 10M usuarios, 100M eventos/dia

Arquitectura de persistencia poliglota:

  | Servicio | Base de datos | Razon |
  |----------|--------------|--------|
  | Catalogo de productos | MongoDB | Documentos anidados (specs, reviews, variants) |
  | Carrito y sesion | Redis | Baja latencia (< 1ms), TTL automatico |
  | Ordenes y pagos | PostgreSQL | ACID, integridad referencial |
  | Eventos de tracking | Cassandra | Write-heavy, series temporales |
  | Busqueda de productos | Elasticsearch | Full-text, faceted search |

Modelo de catalogo en MongoDB:
  db.products.insertOne({
    _id: "prod-001",
    name: "Laptop Pro 15",
    brand: "TechCorp",
    price: 1299.99,
    currency: "USD",
    category: "electronics/laptops",
    specs: {
      cpu: "Intel i7-13700H",
      ram: "16GB DDR5",
      storage: "512GB NVMe SSD",
      display: "15.6 inch OLED"
    },
    variants: [
      { sku: "LP15-16-512", ram: "16GB", storage: "512GB", price: 1299.99 },
      { sku: "LP15-32-1T", ram: "32GB", storage: "1TB", price: 1799.99 }
    ],
    reviews: [
      { user: "alice", rating: 5, comment: "Excelente", date: "2026-01-15" },
      { user: "bob", rating: 4, comment: "Buen producto", date: "2026-02-01" }
    ],
    tags: ["laptop", "oled", "intel", "portatil"],
    created_at: ISODate("2026-01-01"),
    updated_at: ISODate("2026-06-15")
  });

  // Indice de texto para busqueda
  db.products.createIndex({ name: "text", "specs.cpu": "text", tags: "text" });
  db.products.createIndex({ category: 1, price: 1 });
  db.products.createIndex({ "variants.sku": 1 }, { unique: true });

Carrito en Redis:
  # Hash por usuario con items del carrito
  HSET cart:user:123 item:prod-001 2  # producto, cantidad
  HSET cart:user:123 item:prod-002 1
  EXPIRE cart:user:123 86400  # expira en 24h

  # Leaderboard de productos mas vistos
  ZINCRBY product_views 1 "prod-001"
  ZREVRANGE product_views 0 9 WITHSCORES  # top 10

Eventos de tracking en Cassandra:
  CREATE KEYSPACE tracking WITH replication = {
      "class": "SimpleStrategy", "replication_factor": 3
  };

  CREATE TABLE user_events (
      user_id UUID,
      event_date DATE,
      event_time TIMEUUID,
      event_type TEXT,
      product_id TEXT,
      metadata JSON,
      PRIMARY KEY ((user_id, event_date), event_time)
  ) WITH CLUSTERING ORDER BY (event_time DESC);

Busqueda en Elasticsearch:
  POST /products/_search
  {
    "query": {
      "bool": {
        "must": [{ "match": { "name": "laptop" } }],
        "filter": [{ "range": { "price": { "lte": 1500 } } }],
        "filter": [{ "term": { "category": "electronics/laptops" } }]
      }
    },
    "aggs": {
      "brands": { "terms": { "field": "brand", "size": 10 } }
    }
  }

Sincronizacion entre stores:
  - PostgreSQL -> Elasticsearch: CDC con Debezium + Kafka
  - MongoDB -> Elasticsearch: change streams + Kafka Connect
  - Ordenes (PostgreSQL) -> Eventos (Cassandra): outbox pattern

Lecciones aprendidas:
  - La persistencia poliglota agrega complejidad operativa
  - Cada store debe tener un responsable claro
  - La sincronizacion entre stores es el mayor riesgo
  - Usar CDC para sincronizacion, no doble escritura
  - Monitorear lag de sincronizacion entre stores
```

### Como manejo transacciones distribuidas con persistencia poliglota?

Evita transacciones ACID cross-store. Usa el patron Saga con compensaciones: cada servicio hace su escritura local ACID, publica un evento, el siguiente servicio reacciona. Si un paso falla, ejecuta compensaciones en orden inverso. El patron Outbox garantiza que la escritura y el evento se publican atomicamente: escribe el evento en una tabla outbox dentro de la misma transaccion, un proceso separado lo publica al broker.



























End of document. Review and update quarterly.