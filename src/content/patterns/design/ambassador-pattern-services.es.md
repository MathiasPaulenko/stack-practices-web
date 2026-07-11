---
contentType: patterns
slug: ambassador-pattern-services
title: "Ambassador Pattern para Acceso Resiliente a Servicios"
description: "Agrega un ambassador local que maneja reintentos, circuit breaking y monitoreo al llamar servicios remotos, manteniendo el cliente simple y la logica de servicio pura"
metaDescription: "Ambassador pattern para llamadas resilientes. Usa un proxy local para manejar reintentos, circuit breaking y monitoreo al acceder microservicios remotos."
difficulty: intermediate
topics:
  - design
  - infrastructure
tags:
  - ambassador
  - structural-patterns
  - microservices
  - design-pattern
  - design-patterns
relatedResources:
  - /patterns/design/circuit-breaker-pattern
  - /patterns/design/abstract-factory-cross-platform
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ambassador pattern para llamadas resilientes. Usa un proxy local para manejar reintentos, circuit breaking y monitoreo al acceder microservicios remotos."
  keywords:
    - ambassador pattern
    - service mesh
    - remote service proxy
    - structural patterns
    - resilience
---

# Ambassador Pattern para Acceso Resiliente a Servicios Remotos

El Ambassador pattern crea una instancia helper local que actua en nombre de un servicio remoto. Maneja preocupaciones de red como reintentos, timeouts, circuit breaking y logging, manteniendo el codigo del cliente limpio y la interfaz del servicio remoto simple. Este pattern es comun en [microservicios](/guides/architecture/microservices-architecture-guide) y despliegues containerizados.

## Cuando Usar Esto

- Un cliente llama un servicio remoto y necesita reintentos, cacheo o monitoreo
- Quieres mantener la interfaz de servicio simple sin cross-cutting concerns
- Restricciones de lenguaje o framework previenen usar un sidecar proxy

## Problema

Cada servicio que llama una API remota duplica logica de reintentos, manejo de timeouts y recoleccion de metricas. Esto hincha los clientes y hace las politicas de resiliencia inconsistentes.

## Solucion

```typescript
// ambassador/ServiceClient.ts
interface UserService {
  getUser(id: string): Promise<{ id: string; name: string }>;
}

// Implementacion de servicio remoto
class RemoteUserService implements UserService {
  async getUser(id: string): Promise<{ id: string; name: string }> {
    const response = await fetch(`https://api.example.com/users/${id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
}

// Ambassador con logica de resiliencia
class UserServiceAmbassador implements UserService {
  private circuitOpen = false;
  private failureCount = 0;
  private readonly failureThreshold = 5;
  private readonly retryCount = 3;
  private readonly timeoutMs = 2000;

  constructor(private remote: UserService) {}

  async getUser(id: string): Promise<{ id: string; name: string }> {
    if (this.circuitOpen) {
      throw new Error('Circuit breaker is open');
    }

    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        const result = await this.callWithTimeout(id);
        this.onSuccess();
        return result;
      } catch (error) {
        console.log(`Attempt ${attempt} failed:`, error);
        if (attempt === this.retryCount) {
          this.onFailure();
          throw error;
        }
        await this.delay(1000 * attempt); // Exponential backoff
      }
    }

    throw new Error('Unreachable');
  }

  private async callWithTimeout(id: string): Promise<{ id: string; name: string }> {
    return Promise.race([
      this.remote.getUser(id),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), this.timeoutMs)
      ),
    ]);
  }

  private onSuccess(): void {
    this.failureCount = 0;
  }

  private onFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.circuitOpen = true;
      setTimeout(() => {
        this.circuitOpen = false;
        this.failureCount = 0;
      }, 30000);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Cliente usa el ambassador transparentemente
class OrderService {
  constructor(private users: UserService) {}

  async getOrderWithUser(orderId: string): Promise<unknown> {
    const order = { id: orderId, userId: 'user-123' };
    const user = await this.users.getUser(order.userId);
    return { ...order, user };
  }
}

// Uso
const remote = new RemoteUserService();
const ambassador = new UserServiceAmbassador(remote);
const orders = new OrderService(ambassador);
```

## Variacion: Ambassador de Monitoreo

```typescript
// ambassador/Monitoring.ts
class MonitoringAmbassador implements UserService {
  private requestCount = 0;
  private errorCount = 0;
  private totalLatency = 0;

  constructor(private remote: UserService) {}

  async getUser(id: string): Promise<{ id: string; name: string }> {
    const start = Date.now();
    this.requestCount++;

    try {
      const result = await this.remote.getUser(id);
      this.totalLatency += Date.now() - start;
      return result;
    } catch (error) {
      this.errorCount++;
      throw error;
    }
  }

  getMetrics(): { requests: number; errors: number; avgLatency: number } {
    return {
      requests: this.requestCount,
      errors: this.errorCount,
      avgLatency: this.requestCount > 0 ? this.totalLatency / this.requestCount : 0,
    };
  }
}
```

## Como Funciona

1. **Remote Service** provee la logica de negocio core
2. **Ambassador** envuelve el servicio remoto con resiliencia y observabilidad
3. **Client** llama al ambassador como si fuera el servicio real
4. **Policies** (reintentos, circuit breaking) se centralizan en el ambassador

## Consideraciones de Produccion

- Combina con un [service mesh](/guides/architecture/microservices-architecture-guide) (Istio, Linkerd) para enforcement de politicas a nivel de cluster
- Usa connection pooling en el ambassador para reducir overhead de TCP
- Manten el ambassador stateless para que pueda recrearse en fallo

## Errores Comunes

- Poner logica de negocio en el ambassador en lugar de logica de resiliencia
- No distinguir entre errores reintentables y no reintentables
- Fallar en propagar senales de cancelacion a traves del ambassador

## FAQ

**P: En que se diferencia de Proxy?**
R: [Proxy](/patterns/design/proxy-pattern) controla acceso a un unico objeto. Ambassador maneja especificamente resiliencia de servicio remoto y usualmente se despliega como proceso local o libreria.

**P: Puedo usar esto con gRPC?**
R: Si. Los interceptores de gRPC son una forma de ambassador pattern para agregar reintentos, deadlines y auth a llamadas de servicio.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.


## Temas Avanzados

### Escenario: Ambassador para Servicio Legacy

```text
Sistema: Microservicio moderno necesita llamar a servicio legacy SOAP
Patron: Ambassador como intermediario

Arquitectura:
  Modern Service -> Ambassador -> Legacy SOAP Service

  Ambassador responsabilidades:
    1. Traducir REST/JSON a SOAP/XML
    2. Retries con backoff exponencial
    3. Circuit breaker
    4. Metricas y logging
    5. Rate limiting
    6. Caching de respuestas

```typescript
// Ambassador: envuelve el servicio legacy
class LegacyAmbassador {
  private circuitBreaker: CircuitBreaker;
  private cache = new Map<string, { data: unknown; expiry: number }>();
  private retryConfig = { maxRetries: 3, backoffMs: 1000 };

  constructor(private legacyEndpoint: string) {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeoutMs: 30000,
    });
  }

  async callLegacy(method: string, params: unknown): Promise<unknown> {
    // 1. Circuit breaker
    if (!this.circuitBreaker.canExecute()) {
      throw new Error("Circuit open: legacy service unavailable");
    }

    // 2. Cache check
    const cacheKey = `${method}:${JSON.stringify(params)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    // 3. Retry con backoff
    for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await this.callSOAP(method, params);
        this.circuitBreaker.recordSuccess();
        this.cache.set(cacheKey, { data: result, expiry: Date.now() + 60000 });
        return result;
      } catch (err) {
        this.circuitBreaker.recordFailure();
        if (attempt < this.retryConfig.maxRetries - 1) {
          await new Promise(r => setTimeout(r, this.retryConfig.backoffMs * Math.pow(2, attempt)));
        }
      }
    }
    throw new Error("Legacy service failed after retries");
  }

  private async callSOAP(method: string, params: unknown): Promise<unknown> {
    // Traducir JSON a XML SOAP envelope
    const soapEnvelope = this.jsonToSOAP(method, params);
    const response = await fetch(this.legacyEndpoint, {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: soapEnvelope,
    });
    const xml = await response.text();
    return this.soapToJSON(xml);
  }

  private jsonToSOAP(method: string, params: unknown): string {
    return `<?xml version="1.0"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${method}>${JSON.stringify(params)}</${method}>
  </soap:Body>
</soap:Envelope>`;
  }

  private soapToJSON(xml: string): unknown {
    // Parse XML response to JSON
    return JSON.parse(xml.match(/<return>(.*)<\/return>/s)?.[1] || "{}");
  }
}
```

Lecciones:
  - Ambassador aísla la complejidad del servicio legacy
  - El servicio moderno no sabe que habla con SOAP
  - Circuit breaker protege contra fallos en cascada
  - Cache reduce llamadas al servicio legacy
  - Metricas del ambassador son visibles para monitoreo
```

### Ambassador vs Sidecar: cual uso?

Usa Ambassador cuando necesitas un intermediario que envuelve un servicio externo (legacy, third-party). El ambassador vive en el cliente y traduce/protige las llamadas. Usa Sidecar cuando necesitas funcionalidad complementaria que vive junto al servicio (logging, monitoring, proxy). Ambassador es cliente-side, Sidecar es server-side. Amb pueden ser containers en K8s.
