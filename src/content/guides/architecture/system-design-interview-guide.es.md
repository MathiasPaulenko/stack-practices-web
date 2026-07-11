---
contentType: guides
slug: system-design-interview-guide
title: "Guía de Entrevistas de System Design: Conceptos Clave"
description: "Una guía práctica para entrevistas de system design: escalabilidad, bases de datos, caching, load balancing, microservicios y cómo estructurar tu respuesta."
metaDescription: "Guía de entrevistas de system design: escalabilidad, bases de datos, caching, load balancing, microservicios. Estructura respuestas para entrevistas técnicas."
difficulty: advanced
topics:
  - architecture
  - performance
tags:
  - architecture
  - arquitectura
  - entrevista
  - escalabilidad
  - guia
  - performance
  - sistemas-distribuidos
relatedResources:
  - /guides/architecture/software-architecture-guide
  - /guides/devops/kubernetes-basics-guide
  - /patterns/design/cache-aside-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Guía de entrevistas de system design: escalabilidad, bases de datos, caching, load balancing, microservicios. Estructura respuestas para entrevistas técnicas."
  keywords:
    - entrevista system design
    - guia system design
    - entrevista sistemas distribuidos
    - preguntas escalabilidad
    - disenar twitter
    - disenar url shortener
---

# Guía de Entrevistas de System Design

## Introducción

Las entrevistas de system design evalúan tu capacidad para diseñar sistemas listos para crecimiento, confiables y mantenibles. A diferencia de las entrevistas de código, no hay una única respuesta correcta. El objetivo es demostrar pensamiento estructurado, análisis de trade-offs y profundidad de conocimiento técnico.

## Estructura de la Entrevista

Una respuesta fuerte sigue un framework de 4S:

### 1. Scope (2-3 minutos)

Clarifica los requerimientos antes de diseñar:

#### Requerimientos Funcionales

- ¿Qué capacidades debe soportar el sistema?
- ¿Cuáles son los casos de uso principales?

#### Requerimientos No Funcionales

- Escala: ¿Cuántos usuarios? ¿Requests por segundo?
- Latencia: ¿Cuál es el tiempo de respuesta aceptable?
- Disponibilidad: ¿Qué uptime se requiere (99.9%, 99.99%)?
- Consistencia vs. disponibilidad: ¿Podemos tolerar consistencia eventual?

#### Ejemplo
> "Diseña un acortador de URLs como bit.ly."
> - Funcional: Acortar URL, redireccionar, alias personalizados, analytics
> - Escala: 100M URLs nuevas/día, 10B lecturas/día
> - Latencia: <50ms para redirecciones
> - Disponibilidad: 99.99%

### 2. Sketch (10-15 minutos)

Dibuja un diseño de alto nivel con los componentes principales:

```
Cliente → Load Balancer → API Servers → Cache → Database
              ↓
        Message Queue → Analytics Workers
```

Componentes clave a considerar:
- Load Balancer: Distribuye tráfico (round-robin, least connections)
- API Gateway: Autenticación, rate limiting, routing
- Application Servers: Stateless, listos para crecimiento horizontal
- Cache: Redis, Memcached para datos hot
- Database: Elección SQL vs. NoSQL
- Message Queue: Kafka, RabbitMQ para procesamiento async
- CDN: Assets estáticos y edge caching
- Object Storage: S3 para archivos/imágenes

### 3. Scale (10-15 minutos)

Identifica cuellos de botella y propone soluciones:

| Cuello de Botella | Solución |
|-------------------|----------|
| Tráfico read-heavy | Cache + CDN + read replicas |
| Tráfico write-heavy | Sharding + message queues |
| Punto único de fallo | Multi-AZ, replicación, failover |
| Queries lentos | Índices, desnormalización, índices de búsqueda |
| Almacenamiento de archivos grandes | Object storage (S3) + presigned URLs |

#### Cálculos Aproximados

```
100M URLs/día = ~1,160 escrituras/segundo (peak ~3,000/s)
10B lecturas/día = ~115,000 lecturas/segundo (peak ~300,000/s)

Registro de URL: short_code (6 bytes) + long_url (500 bytes) + metadata (100 bytes)
≈ 600 bytes por URL

Almacenamiento diario: 100M × 600B = 60 GB/día
Almacenamiento anual: ~22 TB/año
```

### 4. Solidify (5 minutos)

Trata casos edge y preocupaciones operacionales:
- Monitoreo: Latencia, tasa de error, throughput
- Seguridad: Rate limiting, validación de inputs, protección DDoS
- Retención de datos: Políticas de archivo, eliminación GDPR
- Disaster recovery: Backups, point-in-time recovery

## Conceptos Core

### Escalado Horizontal vs. Vertical

| | Vertical | Horizontal |
|---|----------|------------|
| **Enfoque** | Máquina más grande | Más máquinas |
| **Límite** | Tope de hardware | Casi ilimitado |
| **Costo** | Caro por unidad | Más barato por unidad |
| **Downtime** | Usualmente requiere | Rolling, sin downtime |
| **Complejidad** | Simple | Requiere balanceo de carga, estado distribuido |

### Sharding de Base de Datos

Particiona datos entre múltiples bases de datos para distribuir carga:

```
Shard por user_id % 4:
  Usuario 1 → Shard 0
  Usuario 2 → Shard 1
  Usuario 3 → Shard 2
  Usuario 4 → Shard 3
  Usuario 5 → Shard 0
```

#### Criterios de Selección de Shard Key

- Alta cardinalidad (muchos valores distintos)
- Distribución uniforme (evita hotspots)
- Localidad de queries (la mayoría de queries incluyen la shard key)

### Estrategias de Caching

| Estrategia | Cómo Funciona | Caso de Uso |
|-----------|-------------|-------------|
| **Cache-Aside** | La app revisa cache, carga de DB en miss | Read-heavy, la app controla la lógica |
| **Read-Through** | La cache fetcha de DB transparentemente | Lógica de app más simple |
| **Write-Through** | Las escrituras actualizan cache y DB simultáneamente | Consistencia fuerte |
| **Write-Behind** | Las escrituras van a cache, flush async a DB | Write-heavy, tolera delay |

### Teorema CAP

En un sistema distribuido, solo puedes garantizar dos de tres:

- Consistencia: Todos los nodos ven los mismos datos simultáneamente
- Disponibilidad: Cada request recibe una respuesta
- Tolerancia a Particiones: El sistema continúa operando a pesar de fallas de red

#### Implicación Práctica

Las particiones de red son inevitables, así que eliges entre sistemas CP (consistentes) o AP (disponibles).

## Problemas de Diseño Comunes

| Problema | Desafíos Clave |
|----------|---------------|
| **URL Shortener** | Colisiones de hash, alto volumen de lecturas, analytics |
| **Twitter Feed** | [Fan-out](/guides/architecture/event-driven-architecture-guide) (push vs. pull), generación de timeline |
| **Sistema de Chat** | [Entrega en tiempo real](/recipes/serverless/real-time-websockets), presencia, orden de mensajes |
| **Motor de Búsqueda** | Indexación, ranking, parsing de queries |
| **Video Streaming** | [CDN](/recipes/performance/cdn-edge-caching), bitrate adaptativo, encoding |
| **Rate Limiter** | [Token bucket vs. sliding window](/recipes/api/rate-limiting), estado distribuido |

## Lo que funciona

- Empieza simple, luego agrega complejidad solo cuando esté justificada
- Establece suposiciones explícitamente. Los entrevistadores evalúan tu razonamiento.
- Discute trade-offs. Cada decisión tiene pros y contras.
- Usa números concretos. La matemática aproximada muestra rigor.
- Conoce tu stack tecnológico. No propongas tecnologías que no puedas explicar.
- Practica con timer. 45 minutos pasan rápido.

## Errores Comunes

- Saltar a un esquema de base de datos detallado antes de clarificar requerimientos
- Ignorar requerimientos no funcionales (escala, disponibilidad)
- Proponer tecnologías sin entenderlas (ej. "usa Kafka" sin saber por qué)
- No discutir trade-offs (ej. [SQL vs. NoSQL](/guides/databases/nosql-database-selection-guide))
- Olvidar [monitoreo](/recipes/devops/prometheus-monitoring-alerts), [seguridad](/guides/security/security-best-practices-guide) y preocupaciones operacionales
- Diseñar para escala infinita cuando los requerimientos no la justifican

## Preguntas Frecuentes

**P: ¿Qué tan profundo debo ir en una tecnología?**
R: Lo suficientemente profundo para explicar por qué la elegiste y sus limitaciones. Si mencionas Redis, estate listo para explicar políticas de evicción y opciones de persistencia.

**P: ¿Debería mencionar proveedores de cloud específicos?**
R: Usa términos genéricos ("object storage" en lugar de "S3") a menos que el entrevistador pida específicos. Esto muestra pensamiento arquitectónico independiente de vendors.

**P: ¿Qué pasa si no conozco una tecnología que el entrevistador pregunta?**
R: Sé honesto. Di "No estoy familiarizado con X, pero lo abordaría..." y describe el espacio del problema y cómo evaluarías soluciones.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.


## Temas Avanzados

### Escenario Detallado: Disenar un Acortador de URLs

```text
Problema: Disenar un acortador de URLs como bit.ly
Requerimientos:
  Funcional: Acortar URL, redirigir, alias personalizados, analytics
  Escala: 100M URLs nuevas/dia, 10B lecturas/dia
  Latencia: < 50ms para redirecciones
  Disponibilidad: 99.99%

Paso 1: Estimacion de capacidad
  Escrituras: 100M/dia = ~1,160/s (peak ~3,000/s)
  Lecturas: 10B/dia = ~115,000/s (peak ~300,000/s)
  Ratio Lectura:Escritura = 100:1

  Storage por URL:
    short_code: 7 bytes (base62)
    long_url: 500 bytes promedio
    user_id: 8 bytes
    created_at: 8 bytes
    metadata: 50 bytes
    Total: ~573 bytes por registro

  Storage diario: 100M x 573B = ~57 GB/dia
  Storage anual: ~21 TB/ano
  Storage 5 anos: ~105 TB

Paso 2: Diseno de API
  POST /api/v1/shorten
    Body: { "url": "https://example.com/...", "custom_alias": "my-link" }
    Response: { "short_url": "https://s.io/my-link", "code": "my-link" }

  GET /:code
    Response: 301 redirect a long_url
    Headers: Cache-Control: public, max-age=31536000

  GET /api/v1/stats/:code
    Response: { "clicks": 12345, "unique_visitors": 8900, ... }

Paso 3: Generacion de short code
  Opcion A: Base62 encoding de auto-increment ID
    - ID 1 -> "1", ID 1000000 -> "15FTI"
    - Pro: Sin colisiones, sortable
    - Contra: Predecible (alguien puede enumerar URLs)

  Opcion B: MD5 hash + primeros 7 chars
    - hash(long_url + user_id) -> primeros 7 chars de base62
    - Pro: Misma URL = mismo code (deduplicacion)
    - Contra: Riesgo de colision (necesita retry logic)

  Opcion C: Contador distribuido (Snowflake ID)
    - 64-bit ID: timestamp + worker_id + sequence
    - Base62 encode -> 11 chars, tomar primeros 7
    - Pro: Sin coordinacion, sin colisiones
    - Contra: Codes mas largos de lo necesario

  Decision: Opcion A con XOR obfuscation para prevenir enumeracion

Paso 4: Modelo de datos
  PostgreSQL (escritura) + Redis (cache) + Cassandra (analytics)

  -- PostgreSQL: Mapeo de URLs
  CREATE TABLE url_mappings (
      short_code VARCHAR(7) PRIMARY KEY,
      long_url TEXT NOT NULL,
      user_id BIGINT,
      created_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP,
      INDEX idx_long_url (long_url)
  );

  -- Cassandra: Click analytics (escritura intensiva)
  CREATE TABLE click_events (
      short_code TEXT,
      clicked_at TIMESTAMP,
      ip_address TEXT,
      user_agent TEXT,
      referrer TEXT,
      PRIMARY KEY (short_code, clicked_at)
  ) WITH CLUSTERING ORDER BY (clicked_at DESC);

Paso 5: Diagrama de arquitectura
  Cliente -> CDN (edge redirect cache)
    -> Load Balancer
      -> API Servers (stateless, auto-scaled)
        -> Redis (cache lookup, 95% hit rate)
        -> PostgreSQL (escritura + cache miss)
        -> Kafka (async click events)
          -> Analytics Consumer -> Cassandra

Paso 6: Estrategia de caching
  - Redis cache: short_code -> long_url (TTL: 24h)
  - CDN cache: 301 redirects cached en edge (TTL: 1 ano)
  - Cache hit rate target: > 95% (solo 5% llega a PostgreSQL)
  - Invalidacion: en update de URL, borrar de Redis + CDN purge

Paso 7: Sharding (ano 2+)
  Shard por short_code hash: 16 shards
  Cada shard: 1 master + 3 read replicas
  Capacidad escritura: 16 x 3,000 = 48,000 writes/s
  Capacidad lectura: 16 x 20,000 = 320,000 reads/s (con replicas)

Paso 8: Preocupaciones operacionales
  - Monitoreo: latencia de redirect, cache hit rate, error rate
  - Alerting: p99 > 100ms, cache hit < 90%, error rate > 0.1%
  - Backup: PostgreSQL PITR + snapshot diario a S3
  - DR: Multi-AZ, RPO < 1 min, RTO < 15 min
```

### Como estimo storage y bandwidth en una entrevista?

Empieza con los numeros dados en los requerimientos. Calcula escrituras y lecturas diarias. Multiplica por el tamanio del registro para obtener storage diario. Multiplica por 365 para el anual. Agrega 20% de overhead para indices y metadata. Para bandwidth, multiplica requests/segundo por el tamanio promedio de respuesta. Establece tus suposiciones explicitamente y redondea para facilitar la matematica. Los entrevistadores evaluan el proceso, no los numeros exactos.
