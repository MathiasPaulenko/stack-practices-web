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

Las bases de datos NoSQL intercambian la consistencia estricta y el modelo relacional del SQL por flexibilidad, escalabilidad horizontal y patrones de acceso especializados. Elegir la correcta significa hacer coincidir la forma de tus datos, los patrones de consulta y los requerimientos de consistencia con el store adecuado.

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
- Necesidad de escalabilidad lineal en hardware commodity
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
| IDs auto-incrementales | Usa UUIDs o claves compuestas (user_id + timestamp) |
| Analytics ad-hoc | Usa change data capture (CDC) para stream a un data warehouse |
| Fuente única de verdad | Acepta que diferentes stores pueden tener diferentes vistas de la verdad (CQRS) |

## Mejores Prácticas

- **Modela para tus lecturas, no para tus escrituras** — el performance NoSQL depende del patrón de acceso
- **Evita particiones calientes** — distribuye escrituras uniformemente entre claves de partición
- **Configura TTLs donde sea apropiado** — expira datos viejos automáticamente en lugar de jobs de limpieza
- **Prueba con volúmenes de datos de producción** — el comportamiento a 1K filas no predice el comportamiento a 1B filas
- **Ten un camino de migración** — la gravedad de datos es real; elige cuidadosamente porque migrar después es costoso

## Errores Comunes

- Usar MongoDB como cache (Redis es más barato y rápido)
- Usar DynamoDB para analytics ad-hoc (Athena/BigQuery son más adecuados)
- Usar Cassandra para OLTP con consultas complejas (Cassandra brilla en queries simples, scoped a partición)
- Tratar NoSQL como "SQL que escala mejor" — el modelo de datos es fundamentalmente diferente
- Ignorar complejidad operativa — Cassandra y MongoDB sharded requieren expertise operativo dedicado

## Preguntas Frecuentes

### ¿Debería migrar de PostgreSQL a MongoDB por flexibilidad?

No solo por flexibilidad. PostgreSQL tiene JSONB, que te da flexibilidad de documento mientras mantienes transacciones ACID. Migra a MongoDB cuando necesites sharding horizontal o un lenguaje de consulta nativo de documentos.

### ¿Puedo usar múltiples bases de datos NoSQL en una aplicación?

Sí, y es común. Usa Redis para cache/sesiones, DynamoDB para perfiles de usuario, y Elasticsearch para búsqueda. Esto es persistencia políglota. El trade-off es complejidad operativa.

### ¿Cómo manejo transacciones entre bases de datos NoSQL?

La mayoría de stores NoSQL no soportan transacciones ACID cross-documento o cross-table. Usa sagas, patrones outbox, u operaciones idempotentes con entrega at-least-once para lograr consistencia eventual.
