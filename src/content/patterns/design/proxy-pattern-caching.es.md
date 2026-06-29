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

- Configura TTL basado en volatilidad de datos, no un valor fijo para todo. Consulta [invalidacion de cache](/patterns/design/cache-aside-pattern) best practices.
- Implementa hooks de invalidacion de cache para consistencia write-through
- Usa decorador o composicion para apilar multiples proxies

## Errores Comunes

- Cachear respuestas de POST/PUT sin entender efectos secundarios
- No manejar eviccion de cache cuando crece la presion de memoria
- Devolver datos obsoletos silenciosamente sin logging

## FAQ

**P: Como se diferencia de una simple funcion wrapper?**
R: El Proxy pattern implementa la misma interfaz que el objeto real, asi que los llamadores no saben ni les importa si estan usando el cache o el cliente original.

**P: Puedo combinar esto con el Decorator pattern?**
R: Si. Un [Decorator](/patterns/design/decorator-pattern) agrega comportamiento; un Proxy controla acceso. Se usan frecuentemente juntos en la practica.
