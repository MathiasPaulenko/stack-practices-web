---
contentType: patterns
slug: sharding-pattern
title: "Patron de Sharding"
description: "Divide un dataset grande en particiones mas pequenas distribuidas entre multiples servidores para mejorar escalabilidad, rendimiento y disponibilidad."
metaDescription: "Aprende el Patron de Sharding para particionamiento horizontal de datos. Ejemplos en Python, Java y JavaScript con sharding por hash, rango y directorio."
difficulty: advanced
topics:
  - design
  - architecture
  - databases
tags:
  - sharding
  - patron
  - patron-de-diseno
  - bases-de-datos
  - escalabilidad
  - particionamiento
  - escala-horizontal
relatedResources:
  - /patterns/design/database-per-service-pattern
  - /patterns/design/materialized-view-pattern
  - /patterns/design/caching-pattern
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patron de Sharding para particionamiento horizontal de datos. Ejemplos en Python, Java y JavaScript con sharding por hash, rango y directorio."
  keywords:
    - sharding
    - patron de diseno
    - bases de datos
    - escalabilidad
    - particionamiento
    - escala horizontal
    - particion de datos
---

# Patron de Sharding

## Resumen

El Patron de Sharding divide un dataset grande en fragmentos mas pequenos llamados **shards** y los distribuye entre multiples servidores. En lugar de una unica base de datos monolitica, cada shard gestiona un subconjunto de datos, permitiendo escalabilidad horizontal.

Este patron es esencial cuando un servidor unico no puede manejar el volumen de datos, throughput de consultas o conexiones concurrentes.

## Cuando Usar

- Dataset excede la capacidad de almacenamiento de un nodo
- Throughput de consultas excede limites de CPU/IOPS
- Reducir latencia ubicando datos geograficamente mas cerca de usuarios
- Escrituras crean contencion de bloqueos en un solo nodo

## Cuando Evitar

- Dataset cabe comodamente en un solo servidor
- Consultas cross-shard frecuentes y complejas
- Complejidad operativa de multiples nodos excede capacidad del equipo
- Consistencia transaccional fuerte cross-shard requerida

## Solucion

### Python (Sharding por Hash con Redis)

```python
import hashlib
import redis

class ShardManager:
    def __init__(self, shards):
        self.shards = shards
        self.num_shards = len(shards)

    def _get_shard_index(self, key):
        return int(hashlib.md5(key.encode()).hexdigest(), 16) % self.num_shards

    def get(self, key):
        return self.shards[self._get_shard_index(key)].get(key)

    def set(self, key, value):
        return self.shards[self._get_shard_index(key)].set(key, value)

shards = [redis.Redis(host=f'redis-{i}', port=6379) for i in range(1, 4)]
manager = ShardManager(shards)
manager.set('user:1001', json.dumps({'name': 'Alice'}))
```

### Java (Sharding por Rango con Spring)

```java
@Component
public class RangeShardRouter {
    private final List<DataSource> shards;
    private final List<Long> boundaries;

    public JdbcTemplate getShardForId(Long id) {
        int index = 0;
        for (Long b : boundaries) { if (id <= b) break; index++; }
        return new JdbcTemplate(shards.get(index));
    }
}
```

### JavaScript (Sharding por Directorio)

```javascript
class DirectoryShardManager {
    constructor() {
        this.directory = new Map();
        this.shards = new Map();
    }
    registerShard(id, connection) { this.shards.set(id, connection); }
    assignToShard(entityId, shardId) { this.directory.set(entityId, shardId); }
    getShardForEntity(entityId) {
        return this.shards.get(this.directory.get(entityId));
    }
}
```

## Explicacion

Sharding aplica una **funcion de shard** que mapea cada clave a un shard especifico:

- **Por hash:** `shard = hash(key) % N` — distribucion uniforme pero consultas por rango costosas.
- **Por rango:** Rangos contiguos de claves por shard — eficiente para consultas por rango pero puede crear hotspots.
- **Por directorio:** Tabla de busqueda explicita — flexible pero agrega complejidad.

## Variantes

| Variante | Estrategia | Ideal Para |
|----------|------------|------------|
| Por hash | `hash(key) % N` | Distribucion uniforme |
| Por rango | Limites de rango de clave | Consultas por rango, series temporales |
| Por directorio | Tabla de busqueda | Sharding geografico, reasignacion flexible |
| Hash consistente | Mapeo en anillo | Minimizar rebalancing al cambiar shards |
| Por entidad | Una entidad por shard | SaaS multi-tenant con aislamiento |

## Mejores Practicas

- Elegir la clave de shard correcta
- Monitorear balance de shards
- Planificar para rebalancing
- Evitar transacciones cross-shard
- Replicar shards para disponibilidad

## Errores Comunes

- Mala eleccion de clave de shard
- Ignorar consultas cross-shard
- Sin estrategia de rebalancing
- Asumir escalabilidad lineal
- Olvidar joins entre tablas sharded

## Ejemplos del Mundo Real

- **MongoDB:** Usa shard key para distribuir documentos. El balanceador migra chunks entre shards.
- **Instagram:** Shards PostgreSQL por user ID. Datos de cada usuario viven en un solo shard.
- **Discord:** Shards mensajes por server ID. Historial de mensajes es local al shard.

## Preguntas Frecuentes

**P: ¿Como difiere del particionamiento?**
R: El particionamiento divide datos dentro de una instancia. Sharding distribuye particiones entre servidores independientes.

**P: ¿Que hace una buena clave de shard?**
R: Alta cardinalidad, distribucion uniforme, alineada con patrones de consulta.

**P: ¿Como agrego un shard sin downtime?**
R: Usar hash consistente o routing por directorio para minimizar remapeo de claves.

**P: ¿Puedo hacer JOINs entre shards?**
R: No nativamente. Requerir joins a nivel de aplicacion o desnormalizacion.
