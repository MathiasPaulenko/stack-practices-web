---




contentType: patterns
slug: refresh-ahead-cache-pattern
title: "Patron Refresh-Ahead Cache"
description: "Refresca proactivamente entradas de cache antes de que expiren para eliminar cache misses en hot keys y mantener latencia de lectura consistente."
metaDescription: "Patron refresh-ahead cache: refresca entradas antes de que el TTL expire. Elimina cache misses en hot keys con Python, Java y TypeScript."
difficulty: advanced
topics:
  - caching
  - design
tags:
  - caching
  - refresh-ahead
  - patron
  - redis
  - proactive-refresh
  - performance
  - python
  - java
  - typescript
relatedResources:
  - /patterns/read-through-cache-pattern
  - /patterns/cache-stampede-prevention-pattern
  - /patterns/cache-invalidation-pattern
  - /patterns/write-behind-cache-pattern
  - /patterns/write-through-cache-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Patron refresh-ahead cache: refresca entradas antes de que el TTL expire. Elimina cache misses en hot keys con Python, Java y TypeScript."
  keywords:
    - refresh-ahead cache
    - proactive cache refresh
    - cache preloading
    - background cache refresh
    - redis cache refresh
    - cache miss elimination




---

# Patron Refresh-Ahead Cache

## Descripcion general

Refresh-ahead recarga proactivamente entradas de cache antes de que expiren. Un proceso en segundo plano monitoriza entradas que se acercan a su deadline de TTL y las refresca desde la base de datos. El cache siempre tiene datos frescos, y las lecturas nunca fallan en hot keys.

Este patron elimina el pico de latencia que ocurre cuando una key popular expira. En lugar de que una peticion espere un cache miss + recarga de base de datos, los datos ya estan refrescados. El trade-off es trabajo en segundo plano: el sistema recarga datos incluso si nadie los lee.

## Cuando usarlo


- For alternatives, see [Read-Through Cache Pattern](/es/patterns/read-through-cache-pattern/).

- Hot keys deben servirse siempre desde cache con latencia de miss cero
- Cache misses en keys populares causan picos de latencia perceptibles para usuarios
- La base de datos puede manejar la carga de refresco en segundo plano
- Puedes predecir que keys son suficientemente hot para justificar refresco proactivo
- La consistencia de lectura importa mas que la consistencia de escritura

## Solucion

### Python con hilo de refresco en segundo plano

```python
import redis
import json
import threading
import time

class RefreshAheadCache:
    def __init__(self, redis_client: redis.Redis, ttl: int = 3600, refresh_threshold: float = 0.8):
        self.redis = redis_client
        self.ttl = ttl
        self.refresh_threshold = refresh_threshold  # Refrescar cuando 80% del TTL ha pasado
        self._refresh_callbacks = {}
        self._running = True
        self._refresh_thread = threading.Thread(target=self._refresh_loop, daemon=True)
        self._refresh_thread.start()

    def register(self, key: str, loader: callable, ttl: int = None):
        self._refresh_callbacks[key] = {
            "loader": loader,
            "ttl": ttl or self.ttl
        }
        # Poblacion inicial
        self._refresh_key(key)

    def get(self, key: str) -> any:
        cached = self.redis.get(key)
        if cached is not None:
            return json.loads(cached)
        # Fallback: cargar sincronamente si no esta registrado o el refresco fallo
        if key in self._refresh_callbacks:
            return self._refresh_key(key)
        return None

    def _refresh_loop(self):
        while self._running:
            time.sleep(10)  # Comprobar cada 10 segundos
            for key, config in list(self._refresh_callbacks.items()):
                ttl_remaining = self.redis.ttl(key)
                # Refrescar si el TTL esta por debajo del umbral o la key falta
                if ttl_remaining < 0 or ttl_remaining < config["ttl"] * (1 - self.refresh_threshold):
                    try:
                        self._refresh_key(key)
                    except Exception as e:
                        # Log error, mantener datos stale, reintentar siguiente ciclo
                        print(f"Refresh failed for {key}: {e}")

    def _refresh_key(self, key: str) -> any:
        config = self._refresh_callbacks[key]
        value = config["loader"]()
        self.redis.setex(key, config["ttl"], json.dumps(value))
        return value

    def shutdown(self):
        self._running = False
        self._refresh_thread.join(timeout=10)


cache = RefreshAheadCache(
    redis.Redis(host='localhost', port=6379),
    ttl=300,
    refresh_threshold=0.8
)

# Registrar hot keys para refresco proactivo
cache.register(
    "product:featured",
    lambda: db.query_all("SELECT * FROM products WHERE featured = TRUE LIMIT 10"),
    ttl=300
)

cache.register(
    "config:app_settings",
    lambda: db.query_all("SELECT key, value FROM app_settings"),
    ttl=600
)

# Las lecturas siempre hacen hit en cache
featured_products = cache.get("product:featured")
```

### TypeScript con refresco en segundo plano

```typescript
import { createClient } from 'redis';

interface RefreshConfig {
  loader: () => Promise<any>;
  ttl: number;
}

class RefreshAheadCache {
  private redis: ReturnType<typeof createClient>;
  private refreshCallbacks: Map<string, RefreshConfig> = new Map();
  private refreshThreshold: number;
  private refreshTimer: NodeJS.Timeout | null = null;
  private running: boolean = true;

  constructor(redisClient: ReturnType<typeof createClient>, refreshThreshold = 0.8) {
    this.redis = redisClient;
    this.refreshThreshold = refreshThreshold;
    this.startRefreshLoop();
  }

  async register(key: string, loader: () => Promise<any>, ttl: number): Promise<void> {
    this.refreshCallbacks.set(key, { loader, ttl });
    await this.refreshKey(key);
  }

  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }
    const config = this.refreshCallbacks.get(key);
    if (config) {
      return await this.refreshKey(key) as T;
    }
    return null;
  }

  private startRefreshLoop(): void {
    this.refreshTimer = setInterval(() => this.checkAndRefresh(), 10000);
  }

  private async checkAndRefresh(): Promise<void> {
    for (const [key, config] of this.refreshCallbacks) {
      const ttlRemaining = await this.redis.ttl(key);
      if (ttlRemaining < 0 || ttlRemaining < config.ttl * (1 - this.refreshThreshold)) {
        try {
          await this.refreshKey(key);
        } catch (error) {
          console.error(`Refresh failed for ${key}:`, error);
        }
      }
    }
  }

  private async refreshKey(key: string): Promise<any> {
    const config = this.refreshCallbacks.get(key)!;
    const value = await config.loader();
    await this.redis.set(key, JSON.stringify(value), { EX: config.ttl });
    return value;
  }

  async shutdown(): Promise<void> {
    this.running = false;
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }
}
```

### Java con Scheduled Executor

```java
import redis.clients.jedis.Jedis;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.concurrent.*;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class RefreshAheadCacheManager {

    private final Jedis redis;
    private final ObjectMapper mapper = new ObjectMapper();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);
    private final Map<String, RefreshConfig> refreshConfigs = new ConcurrentHashMap<>();
    private final double refreshThreshold;

    private record RefreshConfig(Callable<Object> loader, int ttl) {}

    public RefreshAheadCacheManager(Jedis jedis, double refreshThreshold) {
        this.redis = jedis;
        this.refreshThreshold = refreshThreshold;
        scheduler.scheduleAtFixedRate(this::checkAndRefresh, 10, 10, TimeUnit.SECONDS);
    }

    public void register(String key, Callable<Object> loader, int ttl) {
        refreshConfigs.put(key, new RefreshConfig(loader, ttl));
        refreshKey(key);
    }

    public <T> T get(String key, Class<T> type) {
        String cached = redis.get(key);
        if (cached != null) {
            try {
                return mapper.readValue(cached, type);
            } catch (Exception e) {
                // Pasar al refresco
            }
        }
        RefreshConfig config = refreshConfigs.get(key);
        if (config != null) {
            return refreshKey(key, type);
        }
        return null;
    }

    private void checkAndRefresh() {
        for (var entry : refreshConfigs.entrySet()) {
            String key = entry.getKey();
            RefreshConfig config = entry.getValue();
            long ttlRemaining = redis.ttl(key);
            if (ttlRemaining < 0 || ttlRemaining < config.ttl() * (1 - refreshThreshold)) {
                try {
                    refreshKey(key);
                } catch (Exception e) {
                    // Mantener datos stale, reintentar siguiente ciclo
                }
            }
        }
    }

    private void refreshKey(String key) {
        RefreshConfig config = refreshConfigs.get(key);
        if (config == null) return;
        try {
            Object value = config.loader().call();
            redis.setex(key, config.ttl(), mapper.writeValueAsString(value));
        } catch (Exception e) {
            throw new RuntimeException("Refresh failed for " + key, e);
        }
    }

    @SuppressWarnings("unchecked")
    private <T> T refreshKey(String key, Class<T> type) {
        refreshKey(key);
        String cached = redis.get(key);
        try {
            return mapper.readValue(cached, type);
        } catch (Exception e) {
            throw new RuntimeException("Deserialization failed for " + key, e);
        }
    }

    public void shutdown() {
        scheduler.shutdown();
    }
}
```

## Explicacion

Refresh-ahead funciona trackeando el TTL de cada key registrada. Un proceso en segundo plano comprueba periodicamente si el TTL restante de una key ha caido por debajo de un umbral (ej. 20% restante). Si es asi, recarga los datos desde la base de datos y resetea el TTL.

El umbral de refresco determina cuan agresivamente se refrescan las entradas. Un umbral de 0.8 significa refrescar cuando 80% del TTL ha transcurrido (20% restante). Un umbral mas alto refresca antes, reduciendo el riesgo de un miss pero aumentando la carga en base de datos.

El insight clave es que las lecturas siempre se sirven desde cache. El refresco en segundo plano absorbe la carga de base de datos. Si un refresco falla, los datos stale del cache se siguen sirviendo hasta que el siguiente ciclo de refresco tenga exito. Esto proporciona degradacion graceful.

## Variantes

| Enfoque | Disparador | Ideal para |
|---------|------------|------------|
| Refresco por tiempo | Comprobar TTL cada N segundos | Hot keys en estado estable |
| Refresco por evento | Refrescar en evento de cambio en DB | Datos que cambian impredeciblemente |
| Refresco probabilistico | Refresco aleatorio cerca de expiracion | Keys de alto trafico, distribuye carga |
| Refresco hibrido | Tiempo + evento combinados | Patrones de acceso mixtos |
| Refresco adaptativo | Ajustar umbral segun frecuencia de acceso | Patrones de trafico variables |

## Buenas practicas

- **Solo refresca hot keys** — refresh-ahead recarga datos independientemente de las lecturas. Registra solo keys que se lean suficientemente frecuente para justificar el trabajo en segundo plano.
- **Establece un umbral de refresco** — refresca cuando 70-90% del TTL ha transcurrido. Muy temprano desperdicia carga en base de datos; muy tarde arriesga un miss si el refresco falla.
- **Mantén datos stale en fallo de refresco** — si la base de datos no esta disponible temporalmente, sirve el valor stale del cache. Loguea el fallo y reintenta en el siguiente ciclo.
- **Monitoriza la tasa de exito de refresco** — si los refrescos fallan frecuentemente, la base de datos puede estar sobrecargada. Aumenta el intervalo de refresco o reduce el numero de keys registradas.
- **Usa un hilo o proceso separado** — el trabajo de refresco no debe bloquear peticiones de lectura. Usa un hilo daemon, scheduled executor, o proceso worker separado.

## Errores comunes

- **Refrescar todas las keys** — refrescar cada key cacheada derrocha el proposito. Solo las hot keys se benefician de refresh-ahead. Las cold keys deben confiar en la expiracion por TTL.
- **Sin manejo de fallos** — si un refresco falla y la key expira, todas las lecturas fallan. Siempre mantén datos stale y reintenta el refresco.
- **Bloquear lecturas en refresco** — si el refresco corre en el camino de lectura, anade latencia. Ejecuta refrescos en un hilo en segundo plano, nunca en el handler de peticion.
- **Umbral demasiado bajo** — refrescar al 10% de TTL restante deja casi sin tiempo para recuperar de un refresco fallido. Establece el umbral a al menos 20% restante.
- **No monitorizar la carga de base de datos** — refresh-ahead anade carga constante a la base de datos. Si la base de datos ya esta bajo presion, los refrescos empeoran la situacion.

## Preguntas frecuentes

### En que se diferencia refresh-ahead de read-through?

Read-through refresca en un cache miss: la peticion espera la carga desde base de datos. Refresh-ahead refresca antes del miss: un proceso en segundo plano recarga datos mientras el cache sigue sirviendo el valor antiguo. Read-through anade latencia en miss; refresh-ahead elimina la latencia de miss.

### Cuando debo usar refresh-ahead sobre un TTL mas largo?

Usa refresh-ahead cuando los datos cambian frecuentemente y un TTL mas largo serviria datos stale durante demasiado tiempo. Usa un TTL mas largo cuando los datos cambian infrecuentemente y el staleness es aceptable. Refresh-ahead mantiene los datos mas frescos sin anadir latencia de miss.

### Que pasa si la base de datos esta caida durante un refresco?

El refresco falla. El cache sigue sirviendo el valor stale hasta que expira. Una vez expirado, las lecturas fallan y el loader intenta una carga directa desde base de datos. Si eso tambien falla, la aplicacion debe manejar el error (fallback, reintento, o respuesta de error).

### Puedo combinar refresh-ahead con cache stampede prevention?

Si. Refresh-ahead maneja el caso comun (hot keys cerca de expirar). Cache stampede prevention maneja casos edge (fallo de refresco, picos de trafico inesperados). Juntos proporcionan proteccion proactiva y reactiva.
