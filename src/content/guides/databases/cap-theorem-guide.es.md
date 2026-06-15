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
  - cap-theorem
  - consistencia
  - disponibilidad
  - tolerancia-a-particiones
  - sistemas-distribuidos
  - tradeoffs-base-de-datos
  - guia
relatedResources:
  - /guides/databases/nosql-database-selection-guide
  - /guides/databases/database-sharding-partitioning-guide
  - /guides/architecture/microservices-architecture-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Guía del teorema CAP: consistencia, disponibilidad, tolerancia a particiones. Elige los trade-offs correctos de base de datos para tus requerimientos."
  keywords:
    - teorema cap explicado
    - consistencia disponibilidad tolerancia particiones
    - trade offs base de datos
    - acid vs base
    - consistencia eventual
---

# Teorema CAP y Trade-offs de Bases de Datos

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

## Mejores Prácticas

- **No uses consistencia fuerte en todas partes** — cuesta latencia y disponibilidad
- **Identifica tus requerimientos de consistencia por operación** — no todos los datos necesitan las mismas garantías
- **Usa patrones saga para transacciones distribuidas** — no fuerces ACID entre servicios
- **Diseña para idempotencia** — la consistencia eventual significa reintentos, y los reintentos significan duplicados
- **Monitorea lag de replicación** — el lag es la distancia entre "escrito" y "visible en todas partes"

## Errores Comunes

- Tratar todos los datos como si necesitaran consistencia fuerte — la mayoría de datos de aplicación está bien con eventual
- Construir sistemas distribuidos sin entender los trade-offs — lleva a fallas impredecibles
- Asumir que "distribuido" significa "más consistente" — usualmente es lo opuesto
- Usar una base CP para una carga de trabajo AP (o viceversa) — empareja la herramienta al requerimiento
- Ignorar lag de replicación en escenarios read-after-write — los usuarios pueden no ver sus propias escrituras inmediatamente

## Preguntas Frecuentes

### ¿Es posible tener las tres propiedades CAP?

No. El teorema es una prueba matemática: en presencia de una partición de red, debes elegir entre consistencia y disponibilidad. Ningún sistema distribuido puede garantizar las tres simultáneamente.

### ¿CAP significa que no puedo tener consistencia y disponibilidad?

No. Cuando no hay partición, puedes tener ambas. El trade-off solo aplica durante una partición. Muchos sistemas son CA (consistentes y disponibles) bajo condiciones normales y se vuelven CP o AP solo durante fallas.

### ¿Cómo elijo entre CP y AP?

Pregunta: "¿Qué duele más — una escritura fallida o datos stale?" Si escrituras fallidas son inaceptables (pagos, inventario), elige CP. Si datos stale son aceptables (feeds, analytics), elige AP. La mayoría de sistemas usa una mezcla: CP para paths críticos, AP para todo lo demás.
