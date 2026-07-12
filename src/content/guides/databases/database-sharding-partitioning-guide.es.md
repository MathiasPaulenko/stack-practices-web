---



contentType: guides
slug: database-sharding-partitioning-guide
title: "Sharding y Particionamiento de Bases de Datos"
description: "Guía práctica de particionamiento horizontal (sharding), vertical y estrategias range vs hash. Escala bases de datos sin downtime."
metaDescription: "Estrategias de sharding y particionamiento de bases de datos: range, hash y list sharding. Escala horizontalmente sin downtime ni hotspots."
difficulty: advanced
topics:
  - databases
tags:
  - database
  - escalabilidad
  - escalado-horizontal
  - guia
  - particionamiento
  - rendimiento-base-de-datos
  - sharding
relatedResources:
  - /guides/sql-performance-tuning-guide
  - /guides/nosql-database-selection-guide
  - /guides/system-design-interview-guide
  - /docs/database-migration-runbook-template
  - /guides/cap-theorem-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Estrategias de sharding y particionamiento de bases de datos: range, hash y list sharding. Escala horizontalmente sin downtime ni hotspots."
  keywords:
    - sharding base de datos
    - particionamiento horizontal
    - range vs hash sharding
    - estrategia escalado base de datos
    - seleccion partition key



---

# Sharding y Particionamiento de Bases de Datos

## Introducción

Cuando un servidor de base de datos no puede manejar la carga, tienes tres opciones: comprar una máquina más grande (escalado vertical), agregar réplicas de lectura (escalado horizontal de lectura), o dividir los datos entre múltiples servidores (sharding). Consulta [SQL Performance Tuning](/guides/databases/sql-performance-tuning-guide) antes de escalar horizontalmente. El sharding es el más difícil pero la única opción para escalado horizontal ilimitado. A continuación: estrategias, trade-offs y consideraciones operativas.

## Particionamiento vs Sharding

| Término | Definición | Alcance |
|---------|-----------|---------|
| **Particionamiento** | Dividir una tabla en piezas más pequeñas dentro de una base de datos | Nodo único |
| **Sharding** | Distribuir particiones entre múltiples servidores de base de datos | Multi-nodo |
| **Horizontal** | Dividir filas por partition key | Filas distribuidas |
| **Vertical** | Dividir columnas en tablas separadas | Columnas separadas |

## Particionamiento Vertical

Separa columnas de una tabla ancha en tablas separadas, típicamente por patrón de acceso.

```sql
-- Antes: tabla única ancha
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(100),
    profile_json JSONB,
    avatar_url VARCHAR(500),
    preferences_json JSONB,
    created_at TIMESTAMP
);

-- Después: columnas frecuentes en users, raramente accedidas en user_profiles
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(100),
    created_at TIMESTAMP
);

CREATE TABLE user_profiles (
    user_id INT PRIMARY KEY REFERENCES users(id),
    profile_json JSONB,
    avatar_url VARCHAR(500),
    preferences_json JSONB
);
```

**Cuándo usar:** Cuando algunas columnas se acceden 100x más que otras. Reduce I/O para queries comunes.

## Particionamiento Horizontal (Particionamiento de Tabla)

Divide filas de una tabla dentro del mismo servidor.

```sql
-- PostgreSQL particionamiento declarativo por rango
CREATE TABLE events (
    id BIGSERIAL,
    event_type VARCHAR(50),
    created_at TIMESTAMP NOT NULL,
    data JSONB
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2024_01 PARTITION OF events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE events_2024_02 PARTITION OF events
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

**Beneficios:** Pruning de queries (solo escanea particiones relevantes), archivado más fácil (detach particiones viejas), vacuum/analyze más rápido.

## Estrategias de Sharding

### 1. Range Sharding

Divide datos por rangos contiguos de la shard key.

```
Shard 1: user_id 1 - 1,000,000
Shard 2: user_id 1,000,001 - 2,000,000
Shard 3: user_id 2,000,001 - 3,000,000
```

| Pros | Contras |
|------|---------|
| Queries de rango eficientes | Hotspots si los datos están sesgados |
| Fácil de entender | Rebalance requiere mover bloques grandes |
| Natural para series de tiempo | |

**Mejor para:** Datos de series de tiempo, particionamiento por fecha, workloads append-only.

### 2. Hash Sharding

Aplica una función hash a la shard key y mapea a un shard.

```python
def get_shard(user_id, num_shards=4):
    return hash(user_id) % num_shards
```

| Pros | Contras |
|------|---------|
| Distribución uniforme | Queries de rango requieren escanear todos los shards |
| Sin hotspots por sesgo | Agregar shards requiere rehashing (costoso) |

**Mejor para:** Keys uniformemente distribuidos, workloads OLTP con lookups puntuales.

### 3. Consistent Hashing

Variante de hash sharding que minimiza rebalancing al agregar/eliminar shards.

**Solo 1/4 de las keys se mueven al agregar un 4to nodo (vs 1/2 con hash simple).**

### 4. Directory-Based Sharding

Mantiene una tabla de búsqueda que mapea keys a shards. Permite asignación flexible y manual.

```sql
CREATE TABLE shard_directory (
    tenant_id INT PRIMARY KEY,
    shard_id INT NOT NULL,
    region VARCHAR(20)
);
```

**Mejor para:** SaaS multi-tenant donde tenants necesitan aislamiento geográfico.

## Eligiendo una Shard Key

| Buena Shard Key | Mala Shard Key |
|---------------|---------------|
| Alta cardinalidad (muchos valores únicos) | Baja cardinalidad (ej: país con 5 opciones) |
| Datos accedidos juntos permanecen juntos | Datos frecuentemente unidos viven en shards distintos |
| Distribución uniforme | Sesgada (1% de usuarios genera 50% de eventos) |
| Inmutable (o raramente cambia) | Cambia frecuentemente (causa migración de datos) |

## El Problema del Hotspot

**Soluciones:** Sub-sharding (dividir la key caliente), write splitting (distribuir writes de la key caliente), capa de cache (absorber reads en Redis).

## Queries Cross-Shard y Transacciones

| Enfoque | Trade-off |
|---------|-----------|
| **Scatter-gather** | Consulta todos los shards, agrega. Lento. |
| **Índice secundario global** | Mantiene índice en key no-shard. Agrega amplificación de escritura. |
| **CQRS / read model** | Replica datos a store analítico para queries cross-shard. |
| **Evita transacciones cross-shard** | Diseña alrededor de ellas. Usa sagas para operaciones multi-shard. |

## Lo que funciona

- Planifica rebalancing desde el día uno — la gravedad de datos es real
- Mantén transacciones dentro de un shard — cross-shard son dolorosas
- Monitorea métricas a nivel shard — uso desigual de CPU/memoria/disco señala necesidad de rebalance
- Usa routing a nivel aplicación primero — tu app conoce la shard key
- Testea con volúmenes de datos de producción — hotspots y sesgo solo aparecen a escala

## Errores Comunes

- Elegir shard key con baja cardinalidad
- Asumir que hash sharding elimina todos los hotspots
- JOINs cross-shard (no existen; debes hacerlos en código de aplicación)
- No planificar rebalancing hasta que un shard está 90% lleno
- Hacer sharding demasiado temprano (< 10M filas o < 1K escrituras/segundo)

## Preguntas Frecuentes

### ¿Cuándo debería empezar a hacer sharding?

Cuando hayas agotado el escalado vertical y réplicas de lectura. Señales típicas: CPU de servidor único > 70% sostenido, throughput de escritura es el cuello de botella, o necesitas distribución geográfica. La mayoría de aplicaciones nunca necesitan sharding. Consulta [diseño de bases de datos](/guides/databases/database-design-guide) primero.

### ¿Puedo cambiar la shard key más tarde?

Técnicamente sí, prácticamente no. Cambiar la shard key requiere reescribir todos los datos. Diseña tu shard key como inmutable.

### ¿Cómo manejo consultas que necesitan unir datos de múltiples shards?

Evita los JOINs cross-shard en la base de datos. En su lugar, diseña tu esquema para que las consultas más frecuentes caigan en un único shard (query-based sharding), o usa patrones de aplicación como [CQRS](/guides/architecture/event-driven-architecture-guide) con tablas de lectura desnormalizadas. Para reportes analíticos, replica los datos a un data warehouse.


## Temas Avanzados

### Escenario: Sharding Multi-Tenant SaaS

```text
Sistema: SaaS con 2,000 tenants, 500GB por tenant
Estrategia: Directory-based sharding por tenant_id

Arquitectura:
  App -> Shard Router -> shard_directory (metadata DB)
  Shard 1 (us-east): tenants 1001, 1003, 1005
  Shard 2 (eu-west): tenants 1002, 1004, 1006
  Shard 3 (ap-southeast): tenants 1007, 1008

Router (Node.js):
  class ShardRouter {
    constructor() { this.shards = new Map(); }
    async loadDirectory() {
      const rows = await this.metaDb.query(
        "SELECT tenant_id, shard_id FROM shard_directory");
      for (const r of rows) {
        this.shards.set(r.tenant_id, this.pools[r.shard_id]);
      }
    }
    getShard(tenantId) {
      const pool = this.shards.get(tenantId);
      if (!pool) throw new Error("Tenant no encontrado");
      return pool;
    }
    async query(tenantId, sql, params) {
      return this.getShard(tenantId).query(sql, params);
    }
  }

  // Middleware extrae tenant_id del JWT
  app.use((req, res, next) => {
    req.db = shardRouter.getShard(req.user.tenantId);
    next();
  });

Rebalanceo (Shard 1 al 80%):
  1. Crear Shard 4
  2. Migrar tenants seleccionados
  3. Actualizar shard_directory
  4. Recargar routing
  5. Eliminar datos del shard viejo

  async function migrateTenant(tenantId, from, to) {
    const tables = ["users", "orders", "invoices"];
    for (const t of tables) {
      const rows = await from.query(
        `SELECT * FROM ${t} WHERE tenant_id = $1`, [tenantId]);
      for (const row of rows) {
        const cols = Object.keys(row);
        const ph = cols.map((_, i) => `$${i+1}`).join(",");
        await to.query(`INSERT INTO ${t} (${cols.join(",")}) VALUES (${ph})`,
          Object.values(row));
      }
    }
    await metaDb.query(
      "UPDATE shard_directory SET shard_id = $1 WHERE tenant_id = $2",
      [newShardId, tenantId]);
    for (const t of tables) {
      await from.query(`DELETE FROM ${t} WHERE tenant_id = $1`, [tenantId]);
    }
  }

Monitoreo:
  | Metrica | Alerta |
  |---------|--------|
  | Disco por shard | > 75% |
  | Queries/sec desviacion | > 30% del promedio |
  | Tenants por shard | > 500 |
  | Lag de migracion | > 5 min |

Lecciones:
  - Directory-based da control total de asignacion
  - Rebalanceo es el desafio operativo mas grande
  - Manten transacciones dentro de un shard
  - Router debe cachear el directorio
  - Tenants grandes pueden necesitar shard dedicado
```

### Como manejo consultas cross-shard?

Evita consultas cross-shard. Para agregaciones globales usa un data warehouse alimentado por CDC. Para dashboards en tiempo real, pre-computa metricas via eventos. Si no hay alternativa, scatter-gather con timeout agresivo.


End of document. Review and update quarterly.