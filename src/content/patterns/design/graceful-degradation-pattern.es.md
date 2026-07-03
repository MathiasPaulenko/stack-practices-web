---
contentType: patterns
slug: graceful-degradation-pattern
title: "Patrón Graceful Degradation"
description: "Degradar funcionalidad en lugar de fallar cuando dependencias no estan disponibles. Servir resultados parciales, datos cacheados o features de fallback."
metaDescription: "Degradar funcionalidad en lugar de fallar cuando dependencias caen. Servir resultados parciales, datos cacheados o features alternativas para mantener usuarios activos."
difficulty: intermediate
topics:
  - architecture
  - design
tags:
  - graceful-degradation
  - patron
  - patron-diseno
  - resiliencia
  - tolerancia-fallos
  - fallback
  - fallo-parcial
relatedResources:
  - /patterns/design/circuit-breaker-pattern
  - /patterns/design/timeout-pattern
  - /patterns/design/bulkhead-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Degradar funcionalidad en lugar de fallar cuando dependencias caen. Servir resultados parciales, datos cacheados o features alternativas para mantener usuarios activos."
  keywords:
    - patron graceful degradation
    - patron diseno
    - patron resiliencia
    - tolerancia a fallos
    - fallo parcial
    - features fallback
    - degradar funcionalidad
---

# Patrón Graceful Degradation

## Descripción general

Cuando una dependencia downstream falla, el comportamiento por defecto es devolver un error al usuario. Graceful degradation hace lo opuesto: detecta el fallo y sirve una experiencia reducida pero funcional. Si el servicio de recomendaciones esta caido, muestra productos sin recomendaciones. Si la API de busqueda hace timeout, muestra resultados cacheados. Si el gateway de pago no esta disponible, deja a los usuarios seguir comprando y encola el pago para despues.

El patrón envuelve cada dependencia externa con una estrategia de fallback. Cuando la llamada primaria falla (timeout, circuit breaker abierto, 5xx), el fallback entra en accion. Los fallbacks pueden ser datos cacheados, valores por defecto, una version simplificada del feature, o saltar el feature completamente mientras el resto de la pagina sigue funcionando.

## Cuándo usarlo

Usa el patrón Graceful Degradation cuando:
- Tu aplicacion tiene features opcionales que mejoran pero no son criticas para la experiencia principal
- Un fallo de una sola dependencia no deberia tirar toda la pagina o respuesta API
- Sirves diferentes niveles de importancia de datos (critico vs nice-to-have)
- Ejemplos: paginas de producto e-commerce, feeds de noticias, dashboards con multiples widgets, interfaces de busqueda

## Solución

### Python

```python
from dataclasses import dataclass
from typing import Callable, Dict, Optional, Any
from enum import Enum
import time

class ServiceStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    DOWN = "down"

@dataclass
class ServiceResult:
    data: Any
    status: ServiceStatus
    source: str
    degraded: bool = False
    error: Optional[str] = None

class GracefulDegradation:
    def __init__(self):
        self._cache: Dict[str, tuple] = {}

    def _cache_get(self, key: str) -> Optional[Any]:
        if key in self._cache:
            data, timestamp = self._cache[key]
            if time.time() - timestamp < 300:
                return data
        return None

    def _cache_set(self, key: str, data: Any) -> None:
        self._cache[key] = (data, time.time())

    def call_with_fallback(self, service_name: str, primary_fn: Callable,
                           default: Any = None, cache_key: Optional[str] = None) -> ServiceResult:
        try:
            result = primary_fn()
            if cache_key:
                self._cache_set(cache_key, result)
            return ServiceResult(data=result, status=ServiceStatus.HEALTHY, source=service_name)
        except Exception as e:
            if cache_key:
                cached = self._cache_get(cache_key)
                if cached is not None:
                    return ServiceResult(data=cached, status=ServiceStatus.DEGRADED,
                                         source=f"{service_name}:cache", degraded=True, error=str(e))
            return ServiceResult(data=default, status=ServiceStatus.DOWN,
                                 source=f"{service_name}:default", degraded=True, error=str(e))

    def aggregate(self, calls: Dict[str, Callable], defaults: Dict[str, Any] = None) -> Dict[str, ServiceResult]:
        defaults = defaults or {}
        return {
            name: self.call_with_fallback(name, fn, defaults.get(name), name)
            for name, fn in calls.items()
        }

# Uso
deg = GracefulDegradation()
results = deg.aggregate(
    calls={
        "product_details": lambda: {"id": "P100", "name": "Headphones", "price": 99.99},
        "recommendations": lambda: (_ for _ in ()).throw(ConnectionError("Service down")),
        "reviews": lambda: [{"user": "alice", "rating": 5}],
        "inventory": lambda: (_ for _ in ()).throw(TimeoutError("Inventory API timeout")),
    },
    defaults={"recommendations": [], "inventory": {"in_stock": None, "message": "Check back later"}},
)

for name, result in results.items():
    icon = "OK" if not result.degraded else "DEGRADED"
    print(f"  [{icon}] {name}: source={result.source}, data={result.data}")
```

### JavaScript

```javascript
class ServiceResult {
  constructor(data, status, source, degraded = false, error = null) {
    this.data = data; this.status = status; this.source = source;
    this.degraded = degraded; this.error = error;
  }
}

class GracefulDegradation {
  constructor() { this.cache = new Map(); }

  _cacheGet(key) {
    if (this.cache.has(key)) {
      const { data, timestamp } = this.cache.get(key);
      if (Date.now() / 1000 - timestamp < 300) return data;
    }
    return null;
  }

  _cacheSet(key, data) { this.cache.set(key, { data, timestamp: Date.now() / 1000 }); }

  callWithFallback(serviceName, primaryFn, defaultVal = null, cacheKey = null) {
    try {
      const result = primaryFn();
      if (cacheKey) this._cacheSet(cacheKey, result);
      return new ServiceResult(result, "healthy", serviceName);
    } catch (e) {
      if (cacheKey) {
        const cached = this._cacheGet(cacheKey);
        if (cached !== null) return new ServiceResult(cached, "degraded", `${serviceName}:cache`, true, e.message);
      }
      return new ServiceResult(defaultVal, "down", `${serviceName}:default`, true, e.message);
    }
  }

  aggregate(calls, defaults = {}) {
    const results = {};
    for (const [name, fn] of Object.entries(calls)) {
      results[name] = this.callWithFallback(name, fn, defaults[name] ?? null, name);
    }
    return results;
  }
}

// Uso
const deg = new GracefulDegradation();
const results = deg.aggregate(
  {
    product_details: () => ({ id: "P100", name: "Headphones", price: 99.99 }),
    recommendations: () => { throw new Error("Service down"); },
    reviews: () => [{ user: "alice", rating: 5 }],
    inventory: () => { throw new Error("Inventory API timeout"); },
  },
  { recommendations: [], inventory: { inStock: null, message: "Check back later" } }
);

for (const [name, result] of Object.entries(results)) {
  const icon = result.degraded ? "DEGRADED" : "OK";
  console.log(`  [${icon}] ${name}: source=${result.source}, data=${JSON.stringify(result.data)}`);
}
```

### Java

```java
import java.util.*;

public class GracefulDegradation {

    enum Status { HEALTHY, DEGRADED, DOWN }

    record ServiceResult(Object data, Status status, String source, boolean degraded, String error) {
        static ServiceResult healthy(Object d, String s) { return new ServiceResult(d, Status.HEALTHY, s, false, null); }
        static ServiceResult degraded(Object d, String s, String e) { return new ServiceResult(d, Status.DEGRADED, s, true, e); }
        static ServiceResult down(Object d, String s, String e) { return new ServiceResult(d, Status.DOWN, s, true, e); }
    }

    private final Map<String, Object> cacheData = new HashMap<>();
    private final Map<String, long[]> cacheTs = new HashMap<>();

    Object cacheGet(String key) {
        if (cacheData.containsKey(key) && System.currentTimeMillis() / 1000 - cacheTs.get(key)[0] < 300)
            return cacheData.get(key);
        return null;
    }

    void cacheSet(String key, Object data) {
        cacheData.put(key, data);
        cacheTs.put(key, new long[]{System.currentTimeMillis() / 1000});
    }

    ServiceResult callWithFallback(String name, java.util.function.Supplier<Object> fn, Object defaultVal, String cacheKey) {
        try {
            Object result = fn.get();
            if (cacheKey != null) cacheSet(cacheKey, result);
            return ServiceResult.healthy(result, name);
        } catch (Exception e) {
            if (cacheKey != null) {
                Object cached = cacheGet(cacheKey);
                if (cached != null) return ServiceResult.degraded(cached, name + ":cache", e.getMessage());
            }
            return ServiceResult.down(defaultVal, name + ":default", e.getMessage());
        }
    }

    public static void main(String[] args) {
        var deg = new GracefulDegradation();
        var results = new LinkedHashMap<String, ServiceResult>();
        results.put("product_details", deg.callWithFallback("product_details",
            () -> Map.of("id", "P100", "name", "Headphones", "price", 99.99), null, "product_details"));
        results.put("recommendations", deg.callWithFallback("recommendations",
            () -> { throw new RuntimeException("Service down"); }, List.of(), "recommendations"));
        results.put("reviews", deg.callWithFallback("reviews",
            () -> List.of(Map.of("user", "alice", "rating", 5)), null, "reviews"));
        results.put("inventory", deg.callWithFallback("inventory",
            () -> { throw new RuntimeException("Inventory timeout"); },
            Map.of("inStock", "unknown", "message", "Check back later"), "inventory"));

        System.out.println("=== Page Assembly ===");
        results.forEach((name, r) -> {
            String icon = r.degraded() ? "DEGRADED" : "OK";
            System.out.printf("  [%s] %s: source=%s, data=%s%n", icon, name, r.source(), r.data());
        });
    }
}
```

## Explicación

El patrón funciona en tres capas:

1. **Llamada primaria**: Intenta la operacion normal. Si tiene exito, cachea el resultado (si aplica) y lo devuelve como healthy.
2. **Fallback de cache**: Si la primaria falla, verifica el cache para un resultado reciente. Si lo encuentra, lo devuelve marcado como degradado. El usuario obtiene datos ligeramente stale en lugar de un error.
3. **Fallback por defecto**: Si no hay cache o el cache expiro, devuelve un valor por defecto. Puede ser una lista vacia, un mensaje estatico, o una version simplificada del feature.

El metodo `aggregate` ejecuta multiples llamadas a servicios independientemente. Cada llamada se degrada por su cuenta sin afectar las otras. Una pagina de producto donde las recomendaciones fallan pero las reviews y detalles siguen cargando es una experiencia degradada pero util.

## Variantes

| Variante | Descripción | Caso de uso |
|---------|-------------|-------------|
| **Feature flags** | Deshabilitar un feature via flag cuando su backend esta caido | Degradacion controlada sin cambios de codigo |
| **Encolar y diferir** | Encolar acciones del usuario para procesar despues cuando una dependencia esta caida | Pagos, envio de emails, notificaciones |
| **UI simplificada** | Ocultar widgets rotos y reorganizar la pagina | Dashboards, portales con muchos widgets |
| **Modo solo lectura** | Permitir lectura pero bloquear escrituras cuando la BD no esta disponible | CMS, herramientas colaborativas durante outages |

## Buenas prácticas

- **Cachea resultados exitosos** para tener datos de fallback cuando el servicio falla
- **Marca respuestas degradadas** para que la UI pueda mostrar un banner o indicador
- **Degradar por feature** no por pagina; un servicio que falla no deberia romper toda la pagina
- **Define TTLs de cache** para que los datos stale no persistan indefinidamente
- **Registra eventos de degradacion** para rastrear que servicios fallan mas
- **Prueba los paths de fallback** en staging rompiendo dependencias deliberadamente

## Errores comunes

- Tratar todos los features como criticos, asi cualquier fallo devuelve una pagina de error completa
- No cachear resultados exitosos, sin dejar datos de fallback disponibles
- Mostrar errores a los usuarios en lugar de degradar silenciosamente features no criticos
- No definir TTLs de cache, sirviendo datos stale indefinidamente
- Funciones de fallback que llaman a otra dependencia que tambien falla
- No registrar eventos de degradacion, dificultando identificar servicios debiles

## Preguntas frecuentes

**Q: Como decido que features son degradables?**
A: Preguntate: si este feature falta, puede el usuario completar su tarea principal? Si si, es degradable. Detalles de producto y carrito son criticos. Recomendaciones y articulos relacionados son degradables.

**Q: Debo decirle al usuario que los datos estan stale?**
A: Para features no criticos, la degradacion silenciosa esta bien. Para datos que afectan decisiones (precios, inventario, disponibilidad), muestra un indicador sutil como "Mostrando datos cacheados, alguna info puede estar desactualizada."

**Q: Cual es la diferencia entre graceful degradation y circuit breaker?**
A: Circuit breaker previene llamadas a un servicio que falla para evitar fallos en cascada. Graceful degradation define que servir en su lugar cuando la llamada falla. Trabajan juntos: el circuit breaker se abre, y el fallback de degradacion sirve datos cacheados o por defecto.

**Q: Por cuanto tiempo debo cachear datos de fallback?**
A: Ajusta el TTL del cache a que tan stale pueden estar los datos sin causar problemas. Las recomendaciones de producto pueden cachearse por horas. Los datos de precios quizas solo minutos. Define el TTL basado en requisitos de negocio, no conveniencia tecnica.
