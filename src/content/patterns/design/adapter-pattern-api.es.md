---





contentType: patterns
slug: adapter-pattern-api
title: "Adapter Pattern para Integrar APIs REST Externas"
description: "Usa el Adapter pattern para normalizar respuestas de APIs REST externas en un modelo interno consistente sin filtrar formatos de terceros en tu dominio"
metaDescription: "Adapter pattern para APIs REST externas. Normaliza respuestas de terceros en modelos internos consistentes. Separacion limpia entre logica externa y de dominio."
difficulty: beginner
topics:
  - design
  - api
tags:
  - adapter
  - api
  - structural
  - design-pattern
  - design-patterns
relatedResources:
  - /patterns/decorator-pattern-pipeline
  - /patterns/facade-pattern
  - /recipes/call-rest-api
  - /recipes/graphql-apollo-server
  - /patterns/bridge-pattern-ui-themes
  - /patterns/composite-pattern-ui
  - /patterns/repository-pattern-typescript
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Adapter pattern para APIs REST externas. Normaliza respuestas de terceros en modelos internos consistentes. Separacion limpia entre logica externa y de dominio."
  keywords:
    - adapter pattern
    - rest api integration
    - structural pattern
    - data normalization
    - third-party api





---

# Adapter Pattern para Integrar APIs REST Externas

El [Adapter](/patterns/design/adapter-pattern) pattern convierte la interfaz de una clase en otra interfaz que los clientes esperan. Al integrar APIs REST de terceros, se convierte en una capa de traduccion que mapea formatos de datos externos a modelos de dominio limpios y estables que tu aplicacion controla.

## Cuando Usar Esto

- Consumes multiples APIs de terceros con diferentes formatos de respuesta
- Los contratos de API cambian y quieres contener cambios disruptivos en el limite
- Tu modelo de dominio debe permanecer independiente de la representacion externa

## Problema

Stripe, PayPal y Square exponen datos de pago de formas distintas. Si tu servicio de checkout accede a los tres directamente, cada cambio de version de API contamina tu dominio con logica condicional.

## Solucion

```typescript
// domain/Payment.ts
interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}

// adapters/PaymentAdapter.ts
interface PaymentAdapter {
  fetchPayment(externalId: string): Promise<Payment>;
}

// adapters/StripeAdapter.ts
class StripeAdapter implements PaymentAdapter {
  async fetchPayment(externalId: string): Promise<Payment> {
    const stripePayment = await stripeClient.paymentIntents.retrieve(externalId);
    return {
      id: stripePayment.id,
      amount: stripePayment.amount / 100,
      currency: stripePayment.currency.toUpperCase(),
      status: this.mapStatus(stripePayment.status),
      createdAt: new Date(stripePayment.created * 1000),
    };
  }

  private mapStatus(status: string): Payment['status'] {
    const map: Record<string, Payment['status']> = {
      'requires_payment_method': 'pending',
      'succeeded': 'completed',
      'canceled': 'failed',
    };
    return map[status] || 'failed';
  }
}

// adapters/PayPalAdapter.ts
class PayPalAdapter implements PaymentAdapter {
  async fetchPayment(externalId: string): Promise<Payment> {
    const paypalPayment = await paypalClient.orders.retrieve(externalId);
    return {
      id: paypalPayment.id,
      amount: parseFloat(paypalPayment.purchase_units[0].amount.value),
      currency: paypalPayment.purchase_units[0].amount.currency_code,
      status: paypalPayment.status === 'COMPLETED' ? 'completed' : 'pending',
      createdAt: new Date(paypalPayment.create_time),
    };
  }
}

// services/PaymentService.ts
class PaymentService {
  constructor(private adapter: PaymentAdapter) {}

  async getPaymentSummary(id: string) {
    const payment = await this.adapter.fetchPayment(id);
    return {
      total: payment.amount,
      currency: payment.currency,
      isPaid: payment.status === 'completed',
    };
  }
}
```

## Uso

```typescript
const service = new PaymentService(new StripeAdapter());
// Cambiar proveedor sin tocar logica de dominio
// const service = new PaymentService(new PayPalAdapter());
```

## Variaciones

- **Two-Way Adapter**: Convierte modelos internos de vuelta a formato externo para actualizaciones
- **Caching Adapter**: Combina con [Proxy](/patterns/design/proxy-pattern) para cachear busquedas externas
- **Batch Adapter**: Adapta endpoints de lista a consultas internas paginadas

## Lo que funciona

- Manten los adapters stateless y enfocados solo en traduccion
- Mapea IDs externos a UUIDs internos para evitar filtrar nombres de proveedor
- Versiona los adapters independientemente cuando las APIs de terceros cambian

## Técnicas Avanzadas

### Adapter bidireccional para conversión bidireccional

Soporta convertir modelos internos de vuelta a formatos externos para actualizaciones:

```typescript
// adapters/BiDirectionalPaymentAdapter.ts
interface BiDirectionalPaymentAdapter extends PaymentAdapter {
  toExternal(payment: Payment): Promise<ExternalPayment>;
}

interface ExternalPayment {
  provider: 'stripe' | 'paypal';
  data: any;
}

class StripeBiDirectionalAdapter implements BiDirectionalPaymentAdapter {
  async fetchPayment(externalId: string): Promise<Payment> {
    const stripePayment = await stripeClient.paymentIntents.retrieve(externalId);
    return this.fromStripe(stripePayment);
  }

  async toExternal(payment: Payment): Promise<ExternalPayment> {
    const stripePayment = await this.toStripe(payment);
    return { provider: 'stripe', data: stripePayment };
  }

  private fromStripe(stripePayment: any): Payment {
    return {
      id: stripePayment.id,
      amount: stripePayment.amount / 100,
      currency: stripePayment.currency.toUpperCase(),
      status: this.mapStatus(stripePayment.status),
      createdAt: new Date(stripePayment.created * 1000),
    };
  }

  private async toStripe(payment: Payment): Promise<any> {
    return {
      amount: Math.round(payment.amount * 100),
      currency: payment.currency.toLowerCase(),
      metadata: { internal_id: payment.id },
    };
  }

  private mapStatus(status: string): Payment['status'] {
    const map: Record<string, Payment['status']> = {
      'requires_payment_method': 'pending',
      'succeeded': 'completed',
      'canceled': 'failed',
    };
    return map[status] || 'failed';
  }
}
```

### Adapter con cache usando patrón proxy

Combina adapter con proxy para cachear busquedas externas y reducir llamadas API:

```typescript
// adapters/CachingPaymentAdapter.ts
class CachingPaymentAdapter implements PaymentAdapter {
  private cache = new Map<string, { payment: Payment; expiresAt: number }>();
  private readonly ttl = 60000; // 1 minuto

  constructor(private delegate: PaymentAdapter) {}

  async fetchPayment(externalId: string): Promise<Payment> {
    const cached = this.cache.get(externalId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.payment;
    }

    const payment = await this.delegate.fetchPayment(externalId);
    this.cache.set(externalId, {
      payment,
      expiresAt: Date.now() + this.ttl,
    });
    return payment;
  }

  invalidate(externalId: string): void {
    this.cache.delete(externalId);
  }
}

// Uso
const stripeAdapter = new StripeAdapter();
const cachingAdapter = new CachingPaymentAdapter(stripeAdapter);
const service = new PaymentService(cachingAdapter);
```

### Adapter batch para endpoints paginados

Adapta endpoints de lista a consultas internas paginadas:

```typescript
// adapters/BatchPaymentAdapter.ts
interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

class StripeBatchAdapter implements PaymentAdapter {
  async fetchPayment(externalId: string): Promise<Payment> {
    // Fetch de pago individual
  }

  async fetchPayments(options: {
    page?: number;
    pageSize?: number;
    status?: Payment['status'];
  }): Promise<PaginatedResult<Payment>> {
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    const stripePayments = await stripeClient.paymentIntents.list({
      limit: pageSize,
      starting_after: page > 1 ? this.getPageCursor(page - 1) : undefined,
    });

    const payments = stripePayments.data.map(sp => ({
      id: sp.id,
      amount: sp.amount / 100,
      currency: sp.currency.toUpperCase(),
      status: this.mapStatus(sp.status),
      createdAt: new Date(sp.created * 1000),
    }));

    return {
      items: payments,
      total: stripePayments.total_count || 0,
      page,
      pageSize,
    };
  }

  private mapStatus(status: string): Payment['status'] {
    const map: Record<string, Payment['status']> = {
      'requires_payment_method': 'pending',
      'succeeded': 'completed',
      'canceled': 'failed',
    };
    return map[status] || 'failed';
  }

  private getPageCursor(page: number): string {
    // Implementa logica de cursor para paginacion
    return '';
  }
}
```

### Factory de adapter para seleccion de proveedor

Usa el patrón factory para seleccionar el adapter apropiado en runtime:

```typescript
// adapters/PaymentAdapterFactory.ts
class PaymentAdapterFactory {
  private adapters = new Map<string, PaymentAdapter>();

  register(provider: string, adapter: PaymentAdapter): void {
    this.adapters.set(provider, adapter);
  }

  getAdapter(provider: string): PaymentAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`No adapter registrado para proveedor: ${provider}`);
    }
    return adapter;
  }

  getAdapterFromConfig(config: { provider: string }): PaymentAdapter {
    return this.getAdapter(config.provider);
  }
}

// Uso
const factory = new PaymentAdapterFactory();
factory.register('stripe', new StripeAdapter());
factory.register('paypal', new PayPalAdapter());
factory.register('square', new SquareAdapter());

// Seleccion en runtime
const config = { provider: 'stripe' };
const adapter = factory.getAdapterFromConfig(config);
const service = new PaymentService(adapter);
```

### Adapter con retry y backoff exponencial

Añade logica de retry a adapters para manejar fallos transitorios:

```typescript
// adapters/RetryPaymentAdapter.ts
class RetryPaymentAdapter implements PaymentAdapter {
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000;

  constructor(private delegate: PaymentAdapter) {}

  async fetchPayment(externalId: string): Promise<Payment> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.delegate.fetchPayment(externalId);
      } catch (error) {
        lastError = error;
        if (attempt < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Uso
const stripeAdapter = new StripeAdapter();
const retryAdapter = new RetryPaymentAdapter(stripeAdapter);
const service = new PaymentService(retryAdapter);
```

### Adapter con validacion y normalizacion de errores

Normaliza errores de diferentes proveedores en errores internos consistentes:

```typescript
// adapters/ValidatingPaymentAdapter.ts
class PaymentAdapterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider: string
  ) {
    super(message);
    this.name = 'PaymentAdapterError';
  }
}

class ValidatingPaymentAdapter implements PaymentAdapter {
  constructor(
    private delegate: PaymentAdapter,
    private provider: string
  ) {}

  async fetchPayment(externalId: string): Promise<Payment> {
    try {
      const payment = await this.delegate.fetchPayment(externalId);
      this.validatePayment(payment);
      return payment;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  private validatePayment(payment: Payment): void {
    if (!payment.id) {
      throw new PaymentAdapterError(
        'Payment ID es requerido',
        'MISSING_ID',
        this.provider
      );
    }
    if (payment.amount < 0) {
      throw new PaymentAdapterError(
        'El monto de pago no puede ser negativo',
        'INVALID_AMOUNT',
        this.provider
      );
    }
  }

  private normalizeError(error: any): PaymentAdapterError {
    if (error instanceof PaymentAdapterError) {
      return error;
    }

    // Normaliza errores especificos de proveedor
    if (error.code === 'resource_missing') {
      return new PaymentAdapterError(
        'Pago no encontrado',
        'NOT_FOUND',
        this.provider
      );
    }

    return new PaymentAdapterError(
      error.message || 'Error desconocido',
      'UNKNOWN',
      this.provider
    );
  }
}
```

## Mejores Prácticas

1. **Mantén los adapters stateless.** Los adapters deberian enfocarse solo en traduccion, no mantener estado. Esto los hace mas faciles de probar y reutilizar.
2. **Mapea IDs externos a UUIDs internos.** Evita filtrar formatos de ID especificos de proveedor en tu dominio mapeando a identificadores internos.
3. **Versiona los adapters independientemente.** Cuando las APIs de terceros cambian, versiona tus adapters para soportar multiples versiones de API simultaneamente.
4. **Usa interfaces para adapters.** Define interfaces claras que los adapters deben implementar, facilitando el intercambio de implementaciones.
5. **Maneja todos los edge cases.** Considera campos faltantes, valores nulos y estructuras de datos inesperadas en respuestas externas.
6. **Logea transformaciones de adapter.** Añade logging para rastrear como se transforman los datos externos, util para debug de problemas de integracion.
7. **Prueba con respuestas grabadas.** Usa respuestas HTTP grabadas o mocks para unit testing, reservando llamadas API reales para tests de contrato.
8. **Documenta contratos externos.** Manten documentacion de los contratos de API externos de los que dependen tus adapters.
9. **Monitorea rendimiento de adapter.** Rastrea metricas de latencia de llamadas de adapter, tasas de error y tasas de cache hit.
10. **Separa logica de validacion.** Manten la validacion de datos separada de la logica de traduccion para mantener responsabilidad unica.

## Errores Comunes

1. **Agregar logica de negocio dentro del adapter.** Los adapters deberian solo traducir datos, no contener reglas de negocio. Manten la logica de negocio en servicios de dominio.
2. **Retornar tipos externos directamente.** Cuando solo se necesita un subconjunto de campos, mapea a tipos internos en lugar de retornar objetos externos.
3. **No manejar campos faltantes o nulos.** Las APIs externas pueden omitir campos o retornar valores nulos. Siempre maneja estos casos gracefulmente.
4. **Hard-codificar logica especifica de proveedor en servicios de dominio.** Esto derrota el proposito de adapters. Manten detalles de proveedor aislados.
5. **Ignorar normalizacion de errores.** Diferentes proveedores retornan errores en diferentes formatos. Normalizalos en errores internos consistentes.
6. **No versionar adapters.** Cuando las APIs externas cambian, soporta multiples versiones para evitar romper clientes existentes.
7. **Sobre-cachear datos sensibles.** Ten cuidado al cachear datos financieros o personales. Considera estrategias de invalidacion de cache.
8. **Mezclar concerns en adapters.** No combines autenticacion, rate limiting u otros concerns con logica de traduccion.
9. **Filtrar formatos externos en mensajes de error.** Asegura que los mensajes de error usen terminologia interna, no terminologia especifica de proveedor.
10. **Saltar tests de contrato.** Los unit tests con mocks no son suficientes. Ejecuta tests de contrato contra APIs reales para verificar integracion.

## FAQ

**P: Como se diferencia de una funcion mapper?**
R: Un [adapter](/patterns/design/adapter-pattern) implementa una interfaz conocida asi que el servicio consumidor no depende de que proveedor este activo. Un mapper es tipicamente una llamada de funcion aislada.

**P: Deberia probar adapters con llamadas HTTP reales?**
R: Prefiere respuestas grabadas o stubs para velocidad. Prueba el adapter real en una suite de test de contrato separada para verificar integracion con la API real.

**P: Puedo usar adapters para operaciones de escritura?**
R: Si. Los adapters bidireccionales pueden convertir modelos internos de vuelta a formatos externos para actualizaciones, manteniendo los mismos beneficios de traduccion para escrituras.

**P: Como manejo rate limits de API en adapters?**
R: Implementa rate limiting a nivel de adapter usando algoritmos de token bucket o ventana deslizante. Considera combinar con cache para reducir llamadas API.

**P: Deberian los adapters manejar autenticacion?**
R: La autenticacion deberia manejarse separadamente, tipicamente por un cliente HTTP o interceptor. Los adapters deberian enfocarse solo en traduccion de datos.

**P: Como versiono adapters cuando las APIs externas cambian?**
R: Crea clases de adapter separadas para cada version de API (ej. StripeV1Adapter, StripeV2Adapter) y usa una factory para seleccionar la version apropiada basada en configuracion.

**P: Pueden los adapters usarse para streams de datos en tiempo real?**
R: Si. Los adapters pueden transformar datos de streaming desde websockets o server-sent events a modelos de dominio internos en tiempo real.

**P: Como manejo fallos parciales en adapters batch?**
R: Implementa manejo de exito parcial donde el adapter retorna tanto items transformados exitosamente como items fallidos con detalles de error.

**P: Deberian los adapters realizar enriquecimiento de datos?**
R: No. El enriquecimiento deberia manejarse por servicios de dominio. Los adapters deberian solo traducir datos externos a formatos internos.

**P: ¿Es este patrón adecuado para proyectos pequeños?**
R: Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

**P: ¿Cómo se compara este patrón con alternativas?**
R: Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

**P: ¿Puedo aplicar este patrón parcialmente?**
R: Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
