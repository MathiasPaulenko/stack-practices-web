---
contentType: guides
slug: nosql-patterns-guide
title: "Patrones de Modelado NoSQL — Documentos, Clave-Valor, Columnas Anchas, Grafos"
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
