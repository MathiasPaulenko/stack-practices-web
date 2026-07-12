---



contentType: guides
slug: nosql-patterns-guide
title: "Patrones de Modelado NoSQL"
description: "Guia practica de modelado NoSQL: embebido vs referenciado, diseno basado en patrones de acceso, y patrones para MongoDB, DynamoDB, Cassandra y Redis."
metaDescription: "Aprende modelado NoSQL: embebido vs referenciado, diseno basado en patrones de acceso. Patrones para MongoDB, DynamoDB, Cassandra y Redis con ejemplos."
difficulty: intermediate
topics:
  - databases
  - data
tags:
  - nosql
  - mongodb
  - dynamodb
  - cassandra
  - redis
  - modelado-datos
  - embebido
  - referenciado
  - guia
relatedResources:
  - /guides/database-design-guide
  - /guides/time-series-database-guide
  - /guides/graph-database-guide
  - /guides/acid-vs-base-guide
  - /guides/vector-database-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende modelado NoSQL: embebido vs referenciado, diseno basado en patrones de acceso. Patrones para MongoDB, DynamoDB, Cassandra y Redis con ejemplos."
  keywords:
    - nosql
    - mongodb
    - dynamodb
    - cassandra
    - redis
    - modelado-datos
    - embebido
    - guia



---

## Overview

Las bases de datos NoSQL abandonan el modelo rigido de tabla-fila en favor de esquemas flexibles optimizados para patrones de acceso especificos. Almacenes de documentos (MongoDB), clave-valor (Redis), columnas anchas (Cassandra, DynamoDB) y grafos (Neo4j) tienen principios de modelado diferentes. La regla clave: modela para tus consultas, no para entidades normalizadas. Comienza con los patrones de lectura y escritura que tu aplicacion necesita, luego disena el esquema para soportarlos eficientemente.

## When to Use


- For alternatives, see [NoSQL Database Selection — MongoDB, DynamoDB, Cassandra](/es/guides/nosql-database-selection-guide/).

- El esquema evoluciona frecuentemente y no puede migrarse facilmente
- Los patrones de lectura son bien conocidos y deben servirse en una sola consulta
- Se requiere escalado horizontal mas alla de lo que proporcionan bases relacionales
- Los datos son naturalmente jerarquicos o de tipo grafo
- Necesidades extremas de rendimiento o baja latencia justifican almacenes especializados

## Embebido vs Referenciado

| Enfoque | Mejor Para | Compromiso |
|---------|-----------|------------|
| **Embebido** | Uno-a-pocos, datos leidos juntos, raramente actualizados independientemente | Documentos mas grandes, duplicacion en actualizacion |
| **Referenciado** | Uno-a-muchos, crecimiento ilimitado, actualizaciones independientes | Requiere joins a nivel de aplicacion |

```javascript
// MongoDB: Embebido (orden con items)
{
    _id: "order-001",
    customerId: "cust-123",
    items: [
        { productId: "p1", name: "Widget", qty: 2, price: 10.00 },
        { productId: "p2", name: "Gadget", qty: 1, price: 25.00 }
    ],
    total: 45.00
}

// MongoDB: Referenciado (colecciones separadas)
// coleccion orders
{ _id: "order-001", customerId: "cust-123", itemIds: ["li-1", "li-2"] }
// coleccion line_items
{ _id: "li-1", productId: "p1", name: "Widget", qty: 2, price: 10.00 }
{ _id: "li-2", productId: "p2", name: "Gadget", qty: 1, price: 25.00 }
```

## Diseno de Tabla Unica en DynamoDB

```json
// DynamoDB: Tabla unica con GSI sobrecargado
{
    "PK": "USER#123",
    "SK": "PROFILE",
    "name": "Alice",
    "email": "alice@example.com"
}
{
    "PK": "USER#123",
    "SK": "ORDER#001",
    "total": 45.00,
    "status": "shipped"
}
{
    "PK": "ORDER#001",
    "SK": "DETAIL",
    "items": [...]
}

// Consultar todas las ordenes de un usuario
Query PK = "USER#123" AND begins_with(SK, "ORDER#")

// Consultar detalles de orden
Query PK = "ORDER#001"
```

## Patron de Fila Ancha en Cassandra

```sql
// Datos de series temporales: una fila por sensor, columnas para buckets de tiempo
CREATE TABLE sensor_readings (
    sensor_id UUID,
    day DATE,
    hour INT,
    minute INT,
    temperature DOUBLE,
    humidity DOUBLE,
    PRIMARY KEY ((sensor_id, day), hour, minute)
) WITH CLUSTERING ORDER BY (hour DESC, minute DESC);

// Consulta: ultimas 24 horas de un sensor
SELECT * FROM sensor_readings
WHERE sensor_id = ? AND day >= ?;
```

## Patrones Redis

```python
# Tabla de clasificacion con sorted sets
import redis
r = redis.Redis()

r.zadd('leaderboard:2024', {'alice': 1500, 'bob': 1200, 'charlie': 1800})
top_players = r.zrevrange('leaderboard:2024', 0, 9, withscores=True)

# Rate limiter con ventana deslizante
pipe = r.pipeline()
pipe.zremrangebyscore('rate:user:123', 0, time.time() - 60)
pipe.zcard('rate:user:123')
current_count = pipe.execute()[1]
if current_count < 100:
    r.zadd('rate:user:123', {str(time.time()): time.time()})
```

## Common Mistakes

- **Aplicar modelado relacional a NoSQL** — normaliza para consistencia en SQL; desnormaliza para lecturas en NoSQL
- **Arreglos ilimitados** — embeber una lista que crece para siempre causa hinchazon de documentos/columnas
- **Ignorar patrones de acceso** — los esquemas NoSQL deben ser guiados por consultas, no entidades
- **Sin estrategia de paginacion** — conjuntos de resultados grandes necesitan paginacion basada en cursor o keyset
- **Tratar todas las bases NoSQL igual** — el embebido de MongoDB, tabla unica de DynamoDB y filas anchas de Cassandra son enfoques fundamentalmente diferentes

## FAQ

**Cuando debo usar un almacen de documentos vs una base relacional?**
Usa documentos cuando la flexibilidad de esquema, datos jerarquicos y cargas de lectura dominen. Usa relacional cuando transacciones ACID, joins complejos y esquema estricto sean requeridos.

**Puedo hacer referential integrity en NoSQL?**
Generalmente no, no a nivel de base de datos. Las aplicaciones deben hacer cumplir las restricciones, o usar patrones de consistencia eventual como saga transactions.

**Como migro esquema en NoSQL?**
Usa migracion perezosa: actualiza el codigo de aplicacion para manejar ambos formatos viejo y nuevo, y migra datos en lectura o en jobs de fondo.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.


## Temas Avanzados

### Escenario Detallado: Modelado de Blog con MongoDB

```text
Sistema: Plataforma de blog con 1M posts, 10M comentarios
Patrones de acceso:
  1. Leer post completo con autor y comentarios (90% de lecturas)
  2. Listar posts por autor
  3. Listar posts por tag
  4. Buscar posts por texto

Modelo embebido (post + comentarios):
  db.posts.insertOne({
    _id: "post-001",
    title: "Patrones NoSQL en la practica",
    slug: "patrones-nosql-practica",
    author: {
      id: "user-123",
      name: "Ana Garcia",
      avatar: "/avatars/ana.jpg"
    },
    tags: ["nosql", "mongodb", "modelado"],
    content: "Contenido del post...",
    comments: [
      {
        id: "c-001",
        author: "Carlos",
        text: "Excelente articulo",
        createdAt: ISODate("2026-03-01"),
        likes: 12
      },
      {
        id: "c-002",
        author: "Beatriz",
        text: "Tengo una pregunta",
        createdAt: ISODate("2026-03-02"),
        likes: 3
      }
    ],
    commentCount: 2,
    publishedAt: ISODate("2026-03-01"),
    updatedAt: ISODate("2026-03-05")
  });

Indices:
  db.posts.createIndex({ slug: 1 }, { unique: true });
  db.posts.createIndex({ "author.id": 1, publishedAt: -1 });
  db.posts.createIndex({ tags: 1, publishedAt: -1 });
  db.posts.createIndex({ title: "text", content: "text" });

Consultas:
  // Post completo por slug (una sola consulta)
  db.posts.findOne({ slug: "patrones-nosql-practica" });

  // Posts por autor (paginados)
  db.posts.find({ "author.id": "user-123" })
    .sort({ publishedAt: -1 })
    .skip(0)
    .limit(10);

  // Posts por tag
  db.posts.find({ tags: "mongodb" })
    .sort({ publishedAt: -1 })
    .limit(20);

Cuando embeber vs referenciar comentarios:
  | Criterio | Embeber | Referenciar |
  |----------|---------|-------------|
  | Comentarios por post | < 100 | > 1000 |
  | Frecuencia de actualizacion | Baja | Alta |
  | Tamano del comentario | Corto | Largo |
  | Necesidad de query independiente | No | Si |

Patron de migracion: empezar embebido, migrar a referenciado si:
  - El documento excede 16MB (limite de MongoDB)
  - Los tiempos de escritura se degradan
  - Necesitas paginar comentarios independientemente

Migracion:
  1. Crear coleccion comments separada
  2. Mover comentarios existentes con un script
  3. Actualizar la app para leer de comments
  4. Mantener commentCount en el post para evitar COUNT queries

Lecciones aprendidas:
  - Embeber cuando los datos se leen juntos y son pocos
  - Referenciar cuando la lista crece sin limite
  - Mantener contadores desnormalizados para evitar COUNT
  - Los indices de texto eliminan necesidad de Elasticsearch para busqueda simple
```

### Como manejo consistencia eventual entre colecciones referenciadas?

Usa el patron Outbox: cuando actualices una coleccion, escribe un evento en una coleccion outbox dentro de la misma transaccion. Un proceso separado lee el outbox y actualiza las colecciones dependientes. Para MongoDB, usa transacciones multi-documento (disponibles desde 4.0 con replica sets). Si no necesitas consistencia inmediata, usa change streams para reaccionar a cambios y actualizar vistas desnormalizadas.





























End of document. Review and update quarterly.