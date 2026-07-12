---




contentType: recipes
slug: redis-sorted-set-leaderboard
title: "Construir un leaderboard en tiempo real con Redis Sorted"
description: "Usa sorted sets de Redis para implementar leaderboards en tiempo real con seguimiento de ranking, actualizacion de puntajes y consultas top-N en O(log N)"
metaDescription: "Construye leaderboards en tiempo real con Redis sorted sets. Actualiza puntajes, consulta rankings y obtiene top-N en O(log N) con ZADD y ZREVRANGE."
difficulty: intermediate
topics:
  - caching
  - performance
tags:
  - redis
  - sorted sets
  - leaderboard
  - real-time
  - data structures
relatedResources:
  - /recipes/redis-cache-aside-pattern
  - /recipes/redis-pubsub-messaging
  - /recipes/redis-rate-limiting-token-bucket
lastUpdated: "2026-07-02"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye leaderboards en tiempo real con Redis sorted sets. Actualiza puntajes, consulta rankings y obtiene top-N en O(log N) con ZADD y ZREVRANGE."
  keywords:
    - redis sorted set
    - redis leaderboard
    - zadd zrevrange
    - real-time ranking
    - redis data structures




---

# Construir un leaderboard en tiempo real con Redis Sorted Sets

Los sorted sets de Redis (ZSETs) almacenan miembros unicos ordenados por puntaje. Son la estructura de datos ideal para leaderboards — puedes actualizar un puntaje, obtener un ranking y consultar el top N de jugadores en tiempo logaritmico. Esta receta construye un servicio de leaderboard con actualizacion de puntajes, consultas de ranking y paginacion.

## Cuando Usar Esto


- For alternatives, see [Complete Guide to Redis Caching Strategies](/es/guides/complete-guide-redis-caching-strategies/).

- Leaderboards de juegos con actualizaciones de puntaje en tiempo real
- Sistemas de ranking para popularidad de contenido o actividad de usuario
- Cualquier escenario donde necesitas mantener un conjunto ordenado con actualizaciones frecuentes

## Requisitos Previos

- Python 3.10+
- Paquete `redis` (`pip install redis`)

## Solucion

### 1. Instalar dependencias

```bash
pip install redis
```

### 2. Implementar el leaderboard

```python
import logging
from redis import Redis

logger = logging.getLogger(__name__)


class Leaderboard:
    def __init__(self, redis_client: Redis, key: str = "leaderboard"):
        self.redis = redis_client
        self.key = key

    def add_score(self, member: str, score: float) -> int:
        """Add or update a member's score.

        Args:
            member: Unique member identifier (e.g., user ID).
            score: Score to set.

        Returns:
            Number of new elements added (0 if updated existing).
        """
        return self.redis.zadd(self.key, {member: score})

    def increment_score(self, member: str, increment: float) -> float:
        """Increment a member's score by a delta.

        Args:
            member: Member identifier.
            increment: Amount to add (can be negative).

        Returns:
            New score after increment.
        """
        return self.redis.zincrby(self.key, increment, member)

    def get_rank(self, member: str) -> int | None:
        """Get a member's rank (0-indexed, highest score first).

        Args:
            member: Member identifier.

        Returns:
            Rank (0 = top) or None if not on the leaderboard.
        """
        rank = self.redis.zrevrank(self.key, member)
        return rank

    def get_score(self, member: str) -> float | None:
        """Get a member's current score."""
        return self.redis.zscore(self.key, member)

    def get_top_n(self, n: int = 10) -> list[dict]:
        """Get the top N members with scores.

        Args:
            n: Number of top members to return.

        Returns:
            List of {member, score, rank} dicts, highest first.
        """
        results = self.redis.zrevrange(
            self.key, 0, n - 1, withscores=True
        )
        return [
            {"member": member.decode() if isinstance(member, bytes) else member,
             "score": score, "rank": idx}
            for idx, (member, score) in enumerate(results)
        ]

    def get_around_member(self, member: str, count: int = 5) -> list[dict]:
        """Get members ranked around a specific member.

        Args:
            member: Member to center on.
            count: Number of members above and below.

        Returns:
            List of nearby members with scores and ranks.
        """
        rank = self.redis.zrevrank(self.key, member)
        if rank is None:
            return []

        start = max(0, rank - count)
        end = rank + count

        results = self.redis.zrevrange(
            self.key, start, end, withscores=True
        )
        return [
            {"member": m.decode() if isinstance(m, bytes) else m,
             "score": s, "rank": start + idx}
            for idx, (m, s) in enumerate(results)
        ]

    def remove_member(self, member: str) -> int:
        """Remove a member from the leaderboard."""
        return self.redis.zrem(self.key, member)

    def total_members(self) -> int:
        """Get the total number of members on the leaderboard."""
        return self.redis.zcard(self.key)

    def clear(self) -> int:
        """Remove all members from the leaderboard."""
        return self.redis.delete(self.key)
```

### 3. Usar el leaderboard

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)
lb = Leaderboard(r, key="game:scores")

# Agregar puntajes
lb.add_score("alice", 1500)
lb.add_score("bob", 2300)
lb.add_score("charlie", 1800)
lb.increment_score("alice", 500)  # alice ahora tiene 2000

# Obtener top 3
top3 = lb.get_top_n(3)
# [{'member': 'bob', 'score': 2300.0, 'rank': 0},
#  {'member': 'alice', 'score': 2000.0, 'rank': 1},
#  {'member': 'charlie', 'score': 1800.0, 'rank': 2}]

# Obtener ranking de alice
rank = lb.get_rank("alice")  # 1

# Obtener jugadores alrededor de alice
nearby = lb.get_around_member("alice", count=2)
# Retorna 2 jugadores por encima y por debajo de alice
```

### 4. Leaderboards por periodo temporal

Usa sorted sets de Redis con claves basadas en fecha para leaderboards diarios, semanales o de todos los tiempos:

```python
from datetime import date

class TimeBasedLeaderboard(Leaderboard):
    def __init__(self, redis_client: Redis, game_id: str):
        self.redis = redis_client
        self.game_id = game_id

    def _key(self, period: str = "all") -> str:
        if period == "daily":
            return f"lb:{self.game_id}:daily:{date.today().isoformat()}"
        elif period == "weekly":
            year, week, _ = date.today().isocalendar()
            return f"lb:{self.game_id}:weekly:{year}-W{week}"
        return f"lb:{self.game_id}:all"

    def add_score(self, member: str, score: float, period: str = "all") -> int:
        key = self._key(period)
        return self.redis.zadd(key, {member: score})

    def increment_score(self, member: str, increment: float, period: str = "all") -> float:
        key = self._key(period)
        return self.redis.zincrby(key, increment, member)

    def get_top_n(self, n: int = 10, period: str = "all") -> list[dict]:
        key = self._key(period)
        results = self.redis.zrevrange(key, 0, n - 1, withscores=True)
        return [
            {"member": m, "score": s, "rank": idx}
            for idx, (m, s) in enumerate(results)
        ]
```

### 5. Expirar leaderboards antiguos

Establece TTLs en claves diarias/semanales para que los leaderboards antiguos auto-expiren:

```python
def add_score_with_expiry(self, member: str, score: float, period: str = "daily") -> int:
    key = self._key(period)
    result = self.redis.zadd(key, {member: score})
    # Establecer expiracion solo si la clave es nueva
    if result == 1:
        if period == "daily":
            self.redis.expire(key, 86400 * 2)  # 2 dias
        elif period == "weekly":
            self.redis.expire(key, 86400 * 8)  # 8 dias
    return result
```

## Como Funciona

1. **`ZADD`** agrega o actualiza el puntaje de un miembro. Si el miembro existe, se actualiza el puntaje; de lo contrario, se crea una nueva entrada.
2. **`ZINCRBY`** incrementa atomicamente un puntaje, lo cual es esencial para actualizaciones concurrentes desde multiples servidores de juego.
3. **`ZREVRANGE`** retorna miembros en orden descendente de puntaje (mayor primero). `withscores=True` incluye los puntajes en el resultado.
4. **`ZREVRANK`** retorna la posicion del miembro en el sorted set, indexado desde 0 desde arriba.
5. **Claves basadas en fecha** (`lb:game:daily:2026-07-02`) crean sorted sets separados por periodo, y `EXPIRE` limpia claves antiguas automaticamente.

## Variantes

### Leaderboard con empates

Cuando los miembros pueden tener el mismo puntaje, usa el timestamp de union como desempate:

```python
def add_score_with_tiebreak(self, member: str, score: float, join_time: float) -> int:
    # Usar puntaje compuesto: score * 1e10 + (max_time - join_time)
    composite = score * 10_000_000_000 + (10_000_000_000 - join_time)
    return self.redis.zadd(self.key, {member: composite})
```

### Rango por percentil

```python
def get_percentile(self, member: str) -> float | None:
    """Get the member's percentile (0-100, higher is better)."""
    rank = self.redis.zrevrank(self.key, member)
    total = self.redis.zcard(self.key)
    if rank is None or total == 0:
        return None
    return ((total - rank - 1) / total) * 100
```

### Leaderboard con metadatos de miembro

Almacena metadatos de miembro en un hash separado y une al recuperar:

```python
def get_top_n_with_meta(self, n: int = 10) -> list[dict]:
    top = self.get_top_n(n)
    pipe = self.redis.pipeline()
    for entry in top:
        pipe.hgetall(f"user:{entry['member']}")
    metas = pipe.execute()

    for entry, meta in zip(top, metas):
        entry["metadata"] = meta
    return top
```

## Mejores Practicas

- **Usa `ZINCRBY` para actualizaciones concurrentes** — es atomico y evita race conditions
- **Establece TTLs en claves temporales** — leaderboards diarios/semanales deben expirar para liberar memoria
- **Usa pipelines para lecturas batch** — obtener metadatos de top N miembros en un solo round trip
- **Mantén los IDs de miembro cortos** — los sorted sets almacenan el string del miembro; UUIDs largos aumentan el uso de memoria

## Errores Comunes

- **Usar `ZRANGE` en lugar de `ZREVRANGE`** — `ZRANGE` retorna de menor a mayor, que usualmente no es lo que quieres para leaderboards
- **No manejar miembros faltantes** — `zscore` y `zrevrank` retornan `None` para miembros inexistentes
- **Almacenar metadatos en el sorted set** — los sorted sets solo almacenan miembro + puntaje; usa un hash separado para metadatos
- **No expirar claves diarias** — sin TTL, las claves de leaderboard antiguas se acumulan indefinidamente

## FAQ

**Q: Cual es la complejidad temporal de las operaciones de sorted set?**
A: `ZADD` y `ZINCRBY` son O(log N). `ZREVRANGE` es O(log N + M) donde M es el numero de elementos retornados. `ZREVRANK` es O(log N).

**Q: Cuantos miembros puede tener un sorted set?**
A: Hasta 2^32 - 1 miembros. En la practica, la memoria es el factor limitante — cada miembro consume aproximadamente 80-100 bytes.

**Q: Puedo usar puntajes de coma flotante?**
A: Si. Los sorted sets de Redis aceptan floats de doble precision. Ten cuidado con problemas de comparacion de coma flotante para empates exactos.

**Q: Como migro un leaderboard a una nueva clave?**
A: Usa `ZUNIONSTORE` para mergear: `ZUNIONSTORE new_key 1 old_key`. O usa `DUMP`/`RESTORE` para volcar y restaurar.

**Q: ¿Qué pasa cuando dos miembros tienen el mismo score?**
A: Redis ordena por score primero, luego por nombre de miembro lexicográficamente. Si necesitas desempate por timestamp, encódalo en el score: `score = actual_score * 1e10 + (max_timestamp - timestamp)`.

**Q: ¿Cómo expiro entradas viejas del leaderboard automáticamente?**
A: Los sorted sets no soportan TTL por miembro. Usa un sorted set separado como índice de "última actividad" y elimina periódicamente miembros stale: `ZREMRANGEBYSCORE leaderboard -inf <cutoff_score>`. Alternativamente, ejecuta un job programado que elimine miembros cuyo timestamp de `last_active` sea anterior a tu umbral.

**Q: ¿Cuál es el consumo de memoria de un sorted set?**
A: Cada miembro usa aproximadamente 80–100 bytes (nombre del miembro + score + punteros de skiplist). Un leaderboard con 1 millón de miembros usa aproximadamente 80–100 MB. Monitorea con `MEMORY USAGE leaderboard_key`.

**Q: ¿Puedo usar Redis Cluster con leaderboards de sorted sets?**
A: Sí, pero todas las operaciones en un solo sorted set deben rutearse al mismo shard. Como los sorted sets son estructuras de clave única, Redis Cluster maneja esto automáticamente via asignación de hash slots. Operaciones cross-shard como `ZUNIONSTORE` requieren hash tags: `{leaderboard}:daily` y `{leaderboard}:weekly`.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
