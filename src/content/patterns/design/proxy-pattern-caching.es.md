---
contentType: patterns
slug: proxy-pattern-caching
title: "Proxy Pattern para Cacheo de Respuestas de API"
description: "Como implementar un proxy de cacheo que intercepta llamadas a APIs y almacena respuestas para reducir latencia y evitar peticiones redundantes"
metaDescription: "Implementa un proxy de cacheo para respuestas de API. Reduce latencia, evita peticiones redundantes y controla invalidacion de cache con un wrapper limpio."
difficulty: intermediate
topics:
  - design
  - performance
tags:
  - proxy
  - caching
  - performance
  - structural
  - design-pattern
relatedResources:
  - /patterns/design/decorator-pattern
  - /patterns/design/adapter-pattern
  - /recipes/cache-invalidation
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Implementa un proxy de cacheo para respuestas de API. Reduce latencia, evita peticiones redundantes y controla invalidacion de cache con un wrapper limpio."
  keywords:
    - proxy pattern
    - caching proxy
    - api caching
    - structural pattern
    - response cache
---

# Proxy Pattern para Cacheo de Respuestas de API

El [Proxy](/patterns/design/proxy-pattern) pattern intercepta el acceso a un objeto para agregar comportamiento sin cambiar la implementacion original. Cuando se aplica a clientes de API, se convierte en una potente capa de cacheo que almacena respuestas, reduce latencia y protege servicios de peticiones redundantes.

## Cuando Usar Esto

- Las respuestas de API son costosas de computar pero se leen frecuentemente
- Quieres evitar limites de rate en APIs de terceros
- La frescura de la respuesta puede controlarse por TTL en lugar de requerimientos en tiempo real

## Problema

Cada llamada a una API externa dispara una peticion de red, serializacion y deserializacion. Para datos frecuentemente accedidos pero que cambian lentamente — como tasas de cambio, catalogos de productos o permisos de usuario — esto es ineficiente y lento.

## Solucion

Implementa un proxy que envuelve el cliente real de la API y almacena respuestas en cache con expiracion configurable.

```typescript
// api/WeatherClient.ts
interface WeatherClient {
  getForecast(city: string): Promise<Forecast>;
}

// api/OpenWeatherClient.ts
class OpenWeatherClient implements WeatherClient {
  async getForecast(city: string): Promise<Forecast> {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}`);
    return res.json();
  }
}

// proxy/CachedWeatherClient.ts
class CachedWeatherClient implements WeatherClient {
  private cache = new Map<string, { data: Forecast; expiry: number }>();

  constructor(
    private client: WeatherClient,
    private ttlMs: number = 300_000
  ) {}

  async getForecast(city: string): Promise<Forecast> {
    const key = city.toLowerCase();
    const cached = this.cache.get(key);

    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const data = await this.client.getForecast(city);
    this.cache.set(key, { data, expiry: Date.now() + this.ttlMs });
    return data;
  }

  invalidate(city: string): void {
    this.cache.delete(city.toLowerCase());
  }
}
```

## Uso

```typescript
const realClient = new OpenWeatherClient();
const cachedClient = new CachedWeatherClient(realClient, 600_000);

const forecast = await cachedClient.getForecast('London');
```

## Variaciones

- **Redis Proxy**: Almacena cache en Redis para sistemas distribuidos
- **Smart Proxy**: Agrega metricas, logging y circuit breaker junto al cacheo
- **Lazy Proxy**: Diferencia la inicializacion de conexiones costosas hasta el primer uso

## Lo que Funciona

- Configura TTL basado en volatilidad de datos, no un valor fijo para todo. Consulta [invalidacion de cache](/patterns/design/cache-aside-pattern) patrones.
- Implementa hooks de invalidacion de cache para consistencia write-through
- Usa decorador o composicion para apilar multiples proxies

## Errores Comunes

- Cachear respuestas de POST/PUT sin entender efectos secundarios
- No manejar eviccion de cache cuando crece la presion de memoria
- Devolver datos obsoletos silenciosamente sin logging
- Establecer TTL demasiado largo para datos volatiles
- No implementar limites de tamaño de cache
- Cachear datos sensibles sin encriptacion
- Ignorar el tiempo de calentamiento de cache
- No monitorear ratios de aciertos/fallos de cache
- Usar cache como almacenamiento primario en lugar de optimizacion
- No manejar fallos de cache elegantemente

## Técnicas Avanzadas

### Cache Multi-Nivel

Implementa una jerarquía de caches para diferentes patrones de acceso:

```typescript
class MultiLevelCachedClient implements WeatherClient {
  private l1Cache = new Map<string, { data: Forecast; expiry: number }>();
  private l2Cache = new Map<string, { data: Forecast; expiry: number }>();

  constructor(
    private client: WeatherClient,
    private l1TtlMs: number = 60_000,
    private l2TtlMs: number = 300_000
  ) {}

  async getForecast(city: string): Promise<Forecast> {
    const key = city.toLowerCase();

    const l1Cached = this.l1Cache.get(key);
    if (l1Cached && l1Cached.expiry > Date.now()) {
      return l1Cached.data;
    }

    const l2Cached = this.l2Cache.get(key);
    if (l2Cached && l2Cached.expiry > Date.now()) {
      this.l1Cache.set(key, { data: l2Cached.data, expiry: Date.now() + this.l1TtlMs });
      return l2Cached.data;
    }

    const data = await this.client.getForecast(city);
    this.l1Cache.set(key, { data, expiry: Date.now() + this.l1TtlMs });
    this.l2Cache.set(key, { data, expiry: Date.now() + this.l2TtlMs });
    return data;
  }
}
```

### Cache con Métricas

Agrega observabilidad para entender el comportamiento del cache:

```typescript
class MetricsCachedClient implements WeatherClient {
  private cache = new Map<string, { data: Forecast; expiry: number }>();
  private hits = 0;
  private misses = 0;

  constructor(
    private client: WeatherClient,
    private ttlMs: number = 300_000
  ) {}

  async getForecast(city: string): Promise<Forecast> {
    const key = city.toLowerCase();
    const cached = this.cache.get(key);

    if (cached && cached.expiry > Date.now()) {
      this.hits++;
      return cached.data;
    }

    this.misses++;
    const data = await this.client.getForecast(city);
    this.cache.set(key, { data, expiry: Date.now() + this.ttlMs });
    return data;
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0
    };
  }
}
```

### Cache con Límites de Tamaño (LRU)

Implementa evicción LRU para prevenir crecimiento descontrolado de memoria:

```typescript
class LRUCachedClient implements WeatherClient {
  private cache = new Map<string, { data: Forecast; expiry: number }>();
  private accessOrder: string[] = [];

  constructor(
    private client: WeatherClient,
    private ttlMs: number = 300_000,
    private maxSize: number = 1000
  ) {}

  async getForecast(city: string): Promise<Forecast> {
    const key = city.toLowerCase();
    const cached = this.cache.get(key);

    if (cached && cached.expiry > Date.now()) {
      this.updateAccessOrder(key);
      return cached.data;
    }

    const data = await this.client.getForecast(city);
    this.cache.set(key, { data, expiry: Date.now() + this.ttlMs });
    this.updateAccessOrder(key);
    this.evictIfNeeded();
    return data;
  }

  private updateAccessOrder(key: string) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  private evictIfNeeded() {
    while (this.cache.size > this.maxSize) {
      const lruKey = this.accessOrder.shift();
      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }
  }
}
```

### Cache con Refresco en Segundo Plano

Refresca entradas de cache antes de que expiren para prevenir arranques en frío:

```typescript
class RefreshingCachedClient implements WeatherClient {
  private cache = new Map<string, { data: Forecast; expiry: number; refreshing: boolean }>();

  constructor(
    private client: WeatherClient,
    private ttlMs: number = 300_000,
    private refreshBeforeExpiryMs: number = 60_000
  ) {}

  async getForecast(city: string): Promise<Forecast> {
    const key = city.toLowerCase();
    const cached = this.cache.get(key);

    if (cached && cached.expiry > Date.now()) {
      if (cached.expiry - Date.now() < this.refreshBeforeExpiryMs && !cached.refreshing) {
        cached.refreshing = true;
        this.refreshInBackground(key, city);
      }
      return cached.data;
    }

    const data = await this.client.getForecast(city);
    this.cache.set(key, { data, expiry: Date.now() + this.ttlMs, refreshing: false });
    return data;
  }

  private async refreshInBackground(key: string, city: string) {
    try {
      const data = await this.client.getForecast(city);
      this.cache.set(key, { data, expiry: Date.now() + this.ttlMs, refreshing: false });
    } catch (error) {
      const cached = this.cache.get(key);
      if (cached) {
        cached.refreshing = false;
      }
    }
  }
}
```

## Mejores Prácticas

1. **Establece TTL apropiado basado en volatilidad de datos.** Usa TTL corto para datos que cambian frecuentemente y TTL más largo para datos estables. Nunca uses un TTL único para todo.

2. **Implementa límites de tamaño de cache.** Caches sin límites pueden causar problemas de memoria. Usa evicción LRU o estrategias similares para gestionar memoria.

3. **Monitorea el rendimiento del cache.** Rastrea ratios de aciertos, ratios de fallos y patrones de evicción para optimizar la configuración del cache.

4. **Maneja fallos de cache elegantemente.** Si el cache falla, vuelve al cliente original en lugar de romper la aplicación.

5. **Documenta estrategias de invalidación de cache.** Documenta claramente cuándo y cómo deben invalidarse las entradas de cache.

6. **Usa claves de cache consistentemente.** Asegúrate de que las claves de cache sean deterministas e incluyan todos los parámetros relevantes.

7. **Considera el calentamiento de cache.** Pre-pobla el cache con datos frecuentemente accedidos para evitar arranques en frío.

8. **Implementa métricas de cache.** Agrega logging y métricas para entender el comportamiento del cache e identificar problemas.

9. **No caches respuestas de POST/PUT/DELETE.** Estas operaciones tienen efectos secundarios y no deben cachearse sin consideración cuidadosa.

10. **Encripta datos sensibles en cache.** Si caches información sensible, asegúrate de que esté encriptada en reposo.

## FAQ

**P: Como se diferencia de una simple funcion wrapper?**
R: El Proxy pattern implementa la misma interfaz que el objeto real, asi que los llamadores no saben ni les importa si estan usando el cache o el cliente original.

**P: Puedo combinar esto con el Decorator pattern?**
R: Si. Un [Decorator](/patterns/design/decorator-pattern) agrega comportamiento; un Proxy controla acceso. Se usan frecuentemente juntos en la practica.

**P: Como manejo la invalidacion de cache?**
R: Implementa metodos de invalidacion explicitos para consistencia write-through, o usa expiracion basada en TTL para consistencia eventual.

**P: Debo usar cache en memoria o cache distribuido?**
R: Usa cache en memoria para aplicaciones de instancia unica. Usa cache distribuido (Redis, Memcached) para despliegues multi-instancia.

**P: Como prevengo cache stampede?**
R: Implementa coalescing de peticiones o usa locks de cache para prevenir multiples peticiones simultaneas para el mismo dato no cacheado.

**P: Puedo cachear peticiones POST?**
R: Generalmente no. Las peticiones POST tienen efectos secundarios y no deben cachearse a menos que entiendas completamente las implicaciones.

**P: Como manejo la serializacion de cache?**
R: Usa serializacion JSON para objetos simples. Considera formatos mas eficientes (MessagePack, Protocol Buffers) para escenarios de alto rendimiento.

**P: Debo cachear errores?**
R: Cachea errores con TTL corto para prevenir peticiones fallidas repetidas de abrumar servicios downstream.

**P: Como implemento el calentamiento de cache?**
R: Pre-pobla el cache durante el inicio de la aplicacion o trabajos programados para evitar arranques en frio para datos frecuentemente accedidos.

**P: Puedo usar este patron con GraphQL?**
R: Si. Implementa cacheo a nivel de resolver o usa una capa de cacheo especifica de GraphQL como DataLoader.

**P: Como manejo el versionado de cache?**
R: Incluye informacion de version en claves de cache para manejar cambios de esquema y prevenir problemas de datos obsoletos.

**P: Debo cachear resultados de paginacion?**
R: Cachea paginas individuales con TTL corto, pero evita cachear conjuntos de resultados completos a menos que los datos sean estables.

**P: Como implemento la compresion de cache?**
R: Comprime datos cacheados antes del almacenamiento para reducir uso de memoria, especialmente para payloads grandes.

**P: Puedo usar este patron con conexiones WebSocket?**
R: Si. Cachea estados de conexion WebSocket o historias de mensajes para mejorar el rendimiento de reconexion.

**P: Como manejo la consistencia de cache entre instancias?**
R: Usa cache distribuido con invalidacion pub/sub o implementa mensajes de invalidacion de cache.

**P: Debo cachear tokens de autenticacion?**
R: Cachea tokens con TTL apropiado que coincida con su tiempo de expiracion para reducir sobrecarga de autenticacion.

**P: Como implemento la deteccion de obsolescencia de cache?**
R: Agrega metadatos a entradas cacheadas (ultima modificacion, ETag) para detectar obsolescencia y activar refrescos.

**P: Puedo usar este patron con operaciones de sistema de archivos?**
R: Si. Cachea contenidos de archivos o metadatos para reducir I/O de disco para archivos frecuentemente accedidos.

**P: Como manejo politicas de eviccion de cache?**
R: Implementa politicas de eviccion LRU, LFU o basadas en tiempo segun tus patrones de acceso y requisitos.

**P: Debo cachear resultados de consultas de base de datos?**
R: Cachea resultados de consultas con consideracion cuidadosa de volatilidad de datos y estrategias de invalidacion.

**P: Como implemento backup y restauracion de cache?**
R: Periodicamente vuelca el estado del cache a almacenamiento persistente para escenarios de recuperacion de desastres.

**P: Puedo usar este patron con limitacion de tasa de API?**
R: Si. Combina cacheo con limitacion de tasa para reducir llamadas de API y mantenerse dentro de limites de tasa.

**P: Como manejo la seguridad de cache?**
R: Implementa controles de acceso, encriptacion y logging de auditoria para datos sensibles en cache.

**P: Debo cachear respuestas de API con autenticacion?**
R: Cachea respuestas con claves de cache especificas de usuario para prevenir acceso no autorizado a datos.

**P: Como implemento monitoreo y alertas de cache?**
R: Monitorea ratios de aciertos, ratios de eviccion y tamaño de cache. Configura alertas para patrones anormales.

**P: Puedo usar este patron con microservicios?**
R: Si. Implementa cacheo en limites de servicio para reducir sobrecarga de comunicacion inter-servicio.

**P: Como manejo el calentamiento de cache para nuevos despliegues?**
R: Implementa estrategias de calentamiento gradual para prevenir cache stampedes durante despliegues.

**P: Debo cachear respuestas de API con peticiones condicionales?**
R: Usa encabezados ETag y Last-Modified para implementar peticiones condicionales y reducir ancho de banda.

**P: Como implemento cache para respuestas de streaming?**
R: Cachea metadatos de stream o chunks iniciales, pero evita cachear respuestas de streaming completas.

**P: Puedo usar este patron con suscripciones de GraphQL?**
R: Cachea estado de suscripcion o datos iniciales para mejorar el rendimiento de inicializacion de suscripcion.

**P: Como manejo cache para datos sensibles al tiempo?**
R: Usa TTL muy corto o implementa invalidacion basada en tiempo para datos sensibles al tiempo como precios de acciones.

**P: Debo cachear respuestas de API con paginacion?**
R: Cachea paginas individuales con TTL apropiado, pero considera cachear conjuntos de resultados completos para datos estables.

**P: Como implemento cache para aplicaciones multi-tenant?**
R: Usa claves de cache especificas de tenant para prevenir fugas de datos entre tenants.

**P: Puedo usar este patron con gateways de API?**
R: Si. Implementa cacheo a nivel de gateway de API para reducir carga en servicios backend.

**P: Como manejo cache para sistemas distribuidos geograficamente?**
R: Usa cache edge o implementa estrategias de replicacion de cache para despliegues distribuidos geograficamente.

**P: Debo cachear respuestas de API con soft deletes?**
R: Implementa invalidacion de cache en soft deletes o usa TTL corto para prevenir servir datos eliminados.

**P: Como implemento cache para versionado de API?**
R: Incluye version de API en claves de cache para prevenir conflictos de version y asegurar consistencia de datos.

**P: Puedo usar este patron con mutaciones de GraphQL?**
R: Generalmente evita cachear mutaciones. Cachea solo operaciones de lectura que son idempotentes y seguras de cachear.

**P: Como manejo cache para respuestas de API con datos condicionales?**
R: Incluye todos los parametros condicionales en claves de cache para asegurar aciertos de cache correctos.

**P: Debo cachear respuestas de API con datos especificos de usuario?**
R: Cachea datos especificos de usuario con claves de cache especificas de usuario y medidas de seguridad apropiadas.

**P: Como implemento cache para respuestas de API con contenido dinamico?**
R: Usa TTL corto o implementa invalidacion de cache basada en eventos de cambio de contenido.

**P: Puedo usar este patron con compresion de respuesta de API?**
R: Si. Comprime respuestas cacheadas para reducir uso de memoria y mejorar rendimiento de transferencia.

**P: Como manejo cache para respuestas de API con payloads grandes?**
R: Implementa cacheo fragmentado o usa enfoques de streaming para payloads grandes.

**P: Debo cachear respuestas de API con tokens de autenticacion?**
R: Cachea tokens de autenticacion con TTL apropiado que coincida con su tiempo de expiracion.

**P: Como implemento cache para respuestas de API con limitacion de tasa?**
R: Combina cacheo con limitacion de tasa para reducir llamadas de API y mantenerse dentro de limites de tasa.

**P: Puedo usar este patron con validacion de respuesta de API?**
R: Si. Valida respuestas cacheadas al recuperar para asegurar integridad y consistencia de datos.

**P: Como manejo cache para respuestas de API con renderizado condicional?**
R: Cachea datos crudos y aplica logica de renderizado condicional al recuperar del cache.

**P: Debo cachear respuestas de API con datos en tiempo real?**
R: Usa TTL muy corto o implementa invalidacion de cache basada en actualizaciones de datos en tiempo real.

**P: Como implemento cache para respuestas de API con paginacion y ordenamiento?**
R: Incluye parametros de paginacion y ordenamiento en claves de cache para aciertos de cache precisos.

**P: Puedo usar este patron con transformacion de respuesta de API?**
R: Si. Cachea respuestas transformadas para evitar sobrecarga de transformacion repetida.

**P: Como manejo cache para respuestas de API con filtrado?**
R: Incluye parametros de filtro en claves de cache para asegurar aciertos de cache correctos para datos filtrados.

**P: Debo cachear respuestas de API con agregacion?**
R: Cachea resultados agregados con TTL apropiado basado en volatilidad de datos y frecuencia de actualizacion.

**P: Como implemento cache para respuestas de API con joins?**
R: Cachea resultados de joins o implementa cacheo multi-nivel para entidades individuales.

**P: Puedo usar este patron con deduplicacion de respuesta de API?**
R: Si. Implementa deduplicacion de cache para evitar almacenar respuestas duplicadas para peticiones identicas.

**P: Como manejo cache para respuestas de API con actualizaciones parciales?**
R: Implementa parcheo de cache o usa TTL corto para datos que reciben actualizaciones parciales.

**P: Debo cachear respuestas de API con consultas complejas?**
R: Cachea resultados de consultas complejas con consideracion cuidadosa de estrategias de invalidacion.

**P: Como implemento cache para respuestas de API con datos anidados?**
R: Cachea estructuras de datos anidados o implementa cacheo jerarquico para diferentes niveles de anidamiento.

**P: Puedo usar este patron con streaming de respuesta de API?**
R: Cachea metadatos de stream o chunks iniciales, pero evita cachear respuestas de streaming completas.
