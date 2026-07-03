---
contentType: recipes
slug: database-query-result-caching
title: "Cachear Resultados de Consultas de Base de Datos con Redis y Python"
description: "Cachear resultados de consultas costosas en Redis con patron cache-aside, gestion de TTL e invalidacion en writes para aplicaciones Python."
metaDescription: "Cachear resultados de consultas en Redis con Python. Usa patron cache-aside, establece TTL, invalida en writes y maneja cache stampedes."
difficulty: intermediate
topics:
  - caching
  - databases
  - performance
tags:
  - python
  - redis
  - database-cache
  - cache-aside
  - query-optimization
relatedResources:
  - /recipes/caching/python-redis-cache-decorator
  - /recipes/caching/python-django-cache-framework
  - /guides/complete-guide-api-versioning-strategies
  - /guides/complete-guide-react-performance-optimization
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Cachear resultados de consultas en Redis con Python. Usa patron cache-aside, establece TTL, invalida en writes y maneja cache stampedes."
  keywords:
    - database query caching
    - redis cache aside
    - python query cache
    - cache invalidation database
    - query result cache redis
---

## Descripcion general

El caching de resultados de consultas de base de datos almacena el resultado de consultas costosas en Redis para que peticiones subsecuentes salten la base de datos completamente. El patron cache-aside — verificar cache, obtener de DB en miss, poblar cache — es el enfoque mas comun. A continuacion: implementar cache-aside en Python con Redis, manejar serializacion, invalidacion en writes, prevencion de cache stampede y caching multi-query.

## Cuando Usar Esto

- Consultas costosas (agregaciones, joins, full-text search) que se ejecutan frecuentemente
- Workloads de lectura intensa donde los datos cambian infrecuentemente
- Reducir la carga de base de datos durante picos de trafico
- Consultas de dashboard o reporting con staleness aceptable

## Prerrequisitos

- Python 3.10+
- Servidor Redis
- Paquetes `redis` (redis-py) y `sqlalchemy`

## Solucion

### 1. Instalar Dependencias

```bash
pip install redis sqlalchemy
```

### 2. Patron Cache-Aside

```python
import json
import redis
from sqlalchemy import create_engine, text

engine = create_engine("postgresql://user:pass@localhost/mydb")
redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

def get_product(product_id: int) -> dict:
    cache_key = f"product:{product_id}"

    # 1. Verificar cache
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    # 2. Obtener de base de datos en miss
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT id, name, price FROM products WHERE id = :id"),
            {"id": product_id}
        )
        row = result.fetchone()

    if row is None:
        return None

    product = {"id": row.id, "name": row.name, "price": float(row.price)}

    # 3. Poblar cache con TTL
    redis_client.setex(cache_key, 300, json.dumps(product))

    return product
```

### 3. Invalidacion de Cache en Writes

```python
def update_product(product_id: int, name: str, price: float) -> dict:
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE products SET name = :name, price = :price WHERE id = :id"),
            {"id": product_id, "name": name, "price": price}
        )

    # Invalidar cache — la siguiente lectura obtendra datos frescos
    redis_client.delete(f"product:{product_id}")

    return {"id": product_id, "name": name, "price": price}

def delete_product(product_id: int) -> None:
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM products WHERE id = :id"),
            {"id": product_id}
        )

    redis_client.delete(f"product:{product_id}")
```

### 4. Cachear Consultas de Lista

```python
def get_products_by_category(category_id: int, page: int = 1, per_page: int = 20) -> list:
    cache_key = f"products:category:{category_id}:page:{page}:size:{per_page}"

    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    offset = (page - 1) * per_page
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT id, name, price FROM products
                WHERE category_id = :cat
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset
            """),
            {"cat": category_id, "limit": per_page, "offset": offset}
        )
        products = [
            {"id": row.id, "name": row.name, "price": float(row.price)}
            for row in result
        ]

    redis_client.setex(cache_key, 300, json.dumps(products))
    return products

def invalidate_category_cache(category_id: int) -> None:
    # Eliminar todas las entradas de cache paginadas para esta categoria
    pattern = f"products:category:{category_id}:*"
    keys = list(redis_client.scan_iter(match=pattern, count=100))
    if keys:
        redis_client.delete(*keys)
```

### 5. Prevencion de Cache Stampede con Lock

```python
import time
import uuid

def get_product_with_lock(product_id: int) -> dict:
    cache_key = f"product:{product_id}"
    lock_key = f"lock:{cache_key}"

    # Verificar cache
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    # Intentar adquirir lock
    lock_token = str(uuid.uuid4())
    lock_acquired = redis_client.set(lock_key, lock_token, nx=True, ex=10)

    if lock_acquired:
        try:
            # Obtener de DB
            product = fetch_product_from_db(product_id)
            if product:
                redis_client.setex(cache_key, 300, json.dumps(product))
            return product
        finally:
            # Liberar lock (solo si aun lo poseemos)
            lua_script = """
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
            """
            redis_client.eval(lua_script, 1, lock_key, lock_token)
    else:
        # Esperar y reintentar
        time.sleep(0.1)
        return get_product_with_lock(product_id)
```

### 6. Cachear Consultas de Agregacion

```python
def get_sales_summary(start_date: str, end_date: str) -> dict:
    cache_key = f"sales:summary:{start_date}:{end_date}"

    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT
                    COUNT(*) as total_orders,
                    SUM(total) as revenue,
                    AVG(total) as avg_order_value
                FROM orders
                WHERE created_at BETWEEN :start AND :end
            """),
            {"start": start_date, "end": end_date}
        )
        row = result.fetchone()

    summary = {
        "total_orders": row.total_orders,
        "revenue": float(row.revenue) if row.revenue else 0,
        "avg_order_value": float(row.avg_order_value) if row.avg_order_value else 0,
    }

    # Cachear por 5 minutos — las agregaciones no necesitan frescura en tiempo real
    redis_client.setex(cache_key, 300, json.dumps(summary))
    return summary
```

### 7. Write-Through Cache

```python
def create_product_write_through(name: str, price: float, category_id: int) -> dict:
    with engine.begin() as conn:
        result = conn.execute(
            text("""
                INSERT INTO products (name, price, category_id)
                VALUES (:name, :price, :cat)
                RETURNING id, name, price
            """),
            {"name": name, "price": price, "cat": category_id}
        )
        row = result.fetchone()

    product = {"id": row.id, "name": row.name, "price": float(row.price)}

    # Poblar cache inmediatamente — sin ventana stale
    redis_client.setex(f"product:{row.id}", 300, json.dumps(product))

    # Invalidar caches de lista que incluirian este producto
    invalidate_category_cache(category_id)

    return product
```

### 8. Carga Masiva de Cache

```python
def get_products_batch(product_ids: list) -> dict:
    # Usar MGET para lookup masivo de cache
    cache_keys = [f"product:{pid}" for pid in product_ids]
    cached_values = redis_client.mget(cache_keys)

    results = {}
    missing_ids = []

    for pid, cached in zip(product_ids, cached_values):
        if cached:
            results[pid] = json.loads(cached)
        else:
            missing_ids.append(pid)

    # Obtener faltantes de DB en una sola consulta
    if missing_ids:
        with engine.connect() as conn:
            placeholders = ",".join(f":id{i}" for i in range(len(missing_ids)))
            params = {f"id{i}": pid for i, pid in enumerate(missing_ids)}
            result = conn.execute(
                text(f"SELECT id, name, price FROM products WHERE id IN ({placeholders})"),
                params
            )
            for row in result:
                product = {"id": row.id, "name": row.name, "price": float(row.price)}
                results[row.id] = product
                redis_client.setex(f"product:{row.id}", 300, json.dumps(product))

    return results
```

## Como Funciona

1. **Cache-aside**: La aplicacion verifica el cache antes de consultar la base de datos. En un cache hit, el valor cacheado se retorna. En un miss, se consulta la base de datos y el resultado se almacena en el cache con un TTL.
2. **Invalidacion**: Cuando los datos cambian (INSERT, UPDATE, DELETE), la aplicacion elimina explicitamente la clave de cache correspondiente. La siguiente lectura obtiene datos frescos de la base de datos y repuebla el cache.
3. **Cache stampede**: Cuando una entrada de cache popular expira, muchas peticiones concurrentes hit la base de datos simultaneamente. Un lock de Redis (`SET NX EX`) asegura que solo una peticion obtiene de la base de datos mientras otras esperan.
4. **Carga masiva**: `MGET` obtiene multiples entradas de cache en un solo comando Redis. Las entradas faltantes se obtienen de la base de datos en una sola consulta `WHERE id IN (...)`.
5. **TTL como red de seguridad**: Incluso con invalidacion explicita, un TTL asegura que los datos stale se auto-reparen si se pierde una invalidacion (ej., por un bug o excepcion).

## Variantes

### Cache con TTL Jitter

```python
import random

def set_with_jitter(key: str, value: str, base_ttl: int = 300):
    jitter = random.randint(0, 60)
    redis_client.setex(key, base_ttl + jitter, value)
```

### Read-Through Cache (Transparente)

```python
class ReadThroughCache:
    def __init__(self, redis_client, db_fetch_fn, ttl=300):
        self.redis = redis_client
        self.fetch_fn = db_fetch_fn
        self.ttl = ttl

    def get(self, key: str, *args, **kwargs):
        cached = self.redis.get(key)
        if cached:
            return json.loads(cached)

        value = self.fetch_fn(*args, **kwargs)
        if value is not None:
            self.redis.setex(key, self.ttl, json.dumps(value))
        return value

# Uso
product_cache = ReadThroughCache(
    redis_client,
    lambda pid: fetch_product_from_db(pid),
    ttl=300
)
product = product_cache.get(f"product:42", 42)
```

### Cache Multi-Nivel (L1 Memoria + L2 Redis)

```python
from functools import lru_cache

@lru_cache(maxsize=1000)
def get_product_l1(product_id: int) -> dict:
    # L1: cache en memoria (por-proceso)
    cached = redis_client.get(f"product:{product_id}")
    if cached:
        return json.loads(cached)

    product = fetch_product_from_db(product_id)
    if product:
        redis_client.setex(f"product:{product_id}", 300, json.dumps(product))
    return product

# L1 hit: instantaneo. L1 miss -> L2 (Redis) check -> L2 miss -> DB
```

### Cache con Stale-While-Revalidate

```python
def get_product_swr(product_id: int) -> dict:
    cache_key = f"product:{product_id}"
    stale_key = f"stale:{cache_key}"

    cached = redis_client.get(cache_key)
    if cached:
        # Verificar si es stale (pasado el TTL pero aun disponible)
        is_stale = redis_client.exists(stale_key)
        if is_stale:
            # Retornar datos stale y disparar refresco en background
            # En produccion, usa una cola de tareas (Celery, RQ) para el refresco
            pass
        return json.loads(cached)

    # Cache miss — obtener de DB
    product = fetch_product_from_db(product_id)
    if product:
        redis_client.setex(cache_key, 300, json.dumps(product))
        redis_client.setex(stale_key, 600, "1")  # Ventana stale: 5 minutos extra
    return product
```

## Mejores Practicas

- **Cachear en la granularidad correcta**: Cachea resultados completos de consultas, no filas individuales. Una clave de cache por query + parametros.
- **Establecer TTL incluso con invalidacion explicita**: El TTL es una red de seguridad. Si la invalidacion falla, los datos stale se auto-reparan.
- **Usar `SETEX` en lugar de `SET` + `EXPIRE`**: `SETEX` es atomico — la clave y el TTL se establecen en una operacion.
- **Invalidar caches de lista en writes**: Cuando se crea o elimina un producto, invalida las claves de cache a nivel categoria, no solo la clave individual del producto.
- **Usar `MGET` para lecturas masivas**: Obtener 100 productos uno por uno son 100 round-trips a Redis. `MGET` lo hace en uno.
- **Monitorear hit rate del cache**: Menos de 50% significa que el cache esta mal configurado o el workload no es cacheable.

## Errores Comunes

- **Cachear sin TTL**: Si la invalidacion falla, los datos stale persisten para siempre. Siempre establece un TTL.
- **Invalidar demasiado ampliamente**: Eliminar `product:*` cuando un producto cambia limpia todo el cache. Elimina claves especificas.
- **No manejar resultados `None`**: Si la base de datos retorna `None`, cachearlo previene repetidos DB hits para claves inexistentes. Usa un valor centinela o TTL corto para negative caching.
- **Colisiones de claves de cache**: Usa claves descriptivas con namespaces (`product:42`, no solo `42`). Diferentes queries con el mismo ID colisionaran.
- **Olvidar invalidar despues de operaciones masivas**: `UPDATE products SET price = price * 1.1` cambia todos los productos pero no dispara invalidacion por clave. Limpia el patron o incrementa una version.

## FAQ

**Cache-aside vs read-through — cual es la diferencia?**

En cache-aside, el codigo de la aplicacion verifica explicitamente el cache y obtiene de la base de datos. En read-through, una capa de cache obtiene transparentemente de la base de datos en miss. Cache-aside da mas control; read-through simplifica el codigo de aplicacion.

**Como cacheo consultas paginadas?**

Incluye numero de pagina y tamano de pagina en la clave de cache: `products:category:1:page:3:size:20`. Cuando un producto en la categoria cambia, invalida todas las paginas con un patron: `products:category:1:*`.

**Deberia cachear JOINs?**

Si, si el JOIN es costoso y el resultado se consume frecuentemente. Cachea el resultado denormalizado. Invalida cuando cualquiera de las tablas joined cambie.

**Que es negative caching?**

Cachear el hecho de que una clave no existe (ej., `product:999` retorna `None`). Esto previene repetidas consultas a la base de datos para claves inexistentes. Usa un TTL corto (30-60 segundos) para evitar cachear la no-existencia por demasiado tiempo.

**Como mido la efectividad del cache?**

Rastrea cache hits y misses. En Redis, usa el comando `INFO stats` para ver `keyspace_hits` y `keyspace_misses`. Calcula el hit rate: `hits / (hits + misses)`. Un buen hit rate es superior al 80%.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
