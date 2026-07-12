---

contentType: recipes
slug: adapter-pattern-recipe
title: "Puente entre Interfaces Incompatibles con el Adapter Pattern"
description: "Cómo integrar APIs legacy, librerías de terceros e interfaces incompatibles usando object adapters, class adapters y facade adapters en Java, TypeScript y Python."
metaDescription: "Aprende adapter pattern para integrar interfaces incompatibles. Puentea APIs legacy y librerías de terceros usando object y class adapters en Java, TypeScript y Python."
difficulty: beginner
topics:
  - design
tags:
  - design
  - adapter-pattern
  - structural-patterns
  - design-patterns
  - patterns
relatedResources:
  - /recipes/hexagonal-architecture
  - /recipes/factory-pattern-recipe
  - /recipes/api-gateway
  - /recipes/singleton-pattern-recipe
  - /recipes/strategy-pattern-recipe
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende adapter pattern para integrar interfaces incompatibles. Puentea APIs legacy y librerías de terceros usando object y class adapters en Java, TypeScript y Python."
  keywords:
    - adapter pattern
    - adaptador interfaz
    - integracion legacy
    - wrapper terceros
    - patron estructural

---

## Visión general

Tu aplicación espera una interfaz `PaymentProcessor` con métodos `charge(amount)` y `refund(transactionId)`. El SDK de Stripe usa `charges.create({ amount })` y `refunds.create({ charge })`. El SDK de PayPal usa `orders.capture({ amount })` y `payments.refund({ captureId })`. Ninguno coincide con tu interfaz. Podrías esparcir código específico de Stripe y PayPal por todo tu codebase, pero cambiar de proveedor requeriría tocar cada archivo que procesa pagos.

El adapter pattern resuelve esto introduciendo una clase wrapper que implementa la interfaz de tu aplicación y traduce las llamadas al SDK de terceros. Tu código de negocio depende solo de la interfaz del adapter. Cambiar Stripe por PayPal significa escribir un nuevo adapter — sin cambios en la lógica de negocio. El siguiente enfoque cubre object adapters, class adapters, two-way adapters y adapter registries con ejemplos prácticos.

## Cuándo usarlo

Usa esta receta cuando:

- Integrando una librería de terceros con una interfaz incompatible. Consulta [Arquitectura Hexagonal](/recipes/design/hexagonal-architecture) para aislamiento de ports/adapters.
- Migrando desde un sistema legacy sin reescribir código dependiente. Consulta [Factory Pattern](/recipes/factory-pattern-recipe) para crear instancias de adapters.
- Exponiendo una fachada simplificada sobre un subsistema complejo
- Soportando múltiples implementaciones de la misma capacidad (pagos, storage, mensajería). Consulta [Strategy Pattern](/recipes/strategy-pattern-recipe) para selección de algoritmos en runtime.
- Testeando código que depende de servicios externos adaptando mocks

## Solución

### Object Adapter (TypeScript)

```typescript
interface PaymentProcessor {
  charge(amount: number, currency: string): Promise<string>;
  refund(transactionId: string): Promise<void>;
}

class StripeSDK {
  async createCharge(params: { amount: number; currency: string }) {
    return { id: 'ch_' + Math.random().toString(36) };
  }
  async createRefund(params: { charge: string }) {}
}

class StripeAdapter implements PaymentProcessor {
  constructor(private stripe: StripeSDK) {}

  async charge(amount: number, currency: string): Promise<string> {
    const result = await this.stripe.createCharge({ amount: amount * 100, currency });
    return result.id;
  }

  async refund(transactionId: string): Promise<void> {
    await this.stripe.createRefund({ charge: transactionId });
  }
}

class CheckoutService {
  constructor(private processor: PaymentProcessor) {}

  async process(order: Order): Promise<void> {
    const txId = await this.processor.charge(order.total, order.currency);
    await this.orderRepo.save({ ...order, transactionId: txId });
  }
}
```

### Class Adapter (Java)

```java
interface ModernLogger {
    void log(String level, String message);
}

class LegacyLogger {
    public void writeLogEntry(String entry) {
        System.out.println("[LEGACY] " + entry);
    }
}

class LoggerAdapter extends LegacyLogger implements ModernLogger {
    @Override
    public void log(String level, String message) {
        writeLogEntry(String.format("[%s] %s", level.toUpperCase(), message));
    }
}

ModernLogger logger = new LoggerAdapter();
logger.log("info", "Application started");
```

### Python Adapter con Registry

```python
from abc import ABC, abstractmethod
from typing import Dict

class StorageAdapter(ABC):
    @abstractmethod
    def upload(self, key: str, data: bytes) -> str: pass

    @abstractmethod
    def download(self, key: str) -> bytes: pass

class S3Adapter(StorageAdapter):
    def __init__(self, client):
        self.client = client

    def upload(self, key: str, data: bytes) -> str:
        self.client.put_object(Bucket="my-bucket", Key=key, Body=data)
        return f"s3://my-bucket/{key}"

    def download(self, key: str) -> bytes:
        return self.client.get_object(Bucket="my-bucket", Key=key)["Body"].read()

class AzureBlobAdapter(StorageAdapter):
    def __init__(self, container_client):
        self.container = container_client

    def upload(self, key: str, data: bytes) -> str:
        self.container.upload_blob(name=key, data=data, overwrite=True)
        return f"azure://my-container/{key}"

    def download(self, key: str) -> bytes:
        return self.container.download_blob(key).readall()

class StorageFactory:
    _adapters: Dict[str, type] = {}

    @classmethod
    def register(cls, name: str, adapter_class: type):
        cls._adapters[name] = adapter_class

    @classmethod
    def create(cls, name: str, config: dict) -> StorageAdapter:
        return cls._adapters[name](**config)

StorageFactory.register("s3", S3Adapter)
StorageFactory.register("azure", AzureBlobAdapter)

storage = StorageFactory.create("s3", {"client": boto3_client})
url = storage.upload("report.pdf", pdf_bytes)
```

## Explicación

- **Object adapter**: el adapter mantiene una referencia al adaptee (la clase de terceros) y delega las llamadas a él. Es el enfoque más flexible — funciona con clases final, soporta composición sobre herencia, y permite adaptar múltiples adaptees simultáneamente.
- **Class adapter**: el adapter hereda del adaptee e implementa la interfaz objetivo. Requiere que el adaptee no sea final y funciona solo en lenguajes de herencia simple donde el adapter no extiende otra clase. Es menos flexible pero ligeramente más rápido.
- **Two-way adapter**: cuando dos sistemas deben interoperar y ninguno puede cambiarse, un two-way adapter implementa ambas interfaces. Traduce llamadas en ambas direcciones, actuando como un puente durante migraciones incrementales.
- **Adapter registry**: cuando se soportan múltiples proveedores (Stripe, PayPal, Braintree), un registro mapea nombres de proveedor a clases adapter. La factory instancia el adapter correcto basado en configuración, aislando la selección del adapter de la lógica de negocio.

## Variantes

| Variante | Flexibilidad | Rendimiento | Mejor para |
|----------|-------------|-------------|------------|
| Object adapter | Alta | Medio | Uso general, SDKs de terceros |
| Class adapter | Baja | Alto | Crítico de rendimiento, un solo adaptee |
| Two-way adapter | Media | Medio | Migración incremental |
| Facade adapter | Alta | Medio | Simplificar subsistemas complejos |
| Registry + adapter | Alta | Medio | Soporte de múltiples proveedores |

## Lo que funciona

- **Adapta en el límite, no en todas partes**: introduce adapters en los límites del sistema donde las interfaces externas se encuentran con abstracciones internas. No dejes que los tipos de terceros se filtren a la lógica de negocio.
- **Documenta el comportamiento de traducción**: los adapters hacen más que renombrar métodos. Pueden convertir unidades, transformar tipos de error, o batch requests. Documenta estas traducciones claramente.
- **Maneja errores con elegancia**: las APIs de terceros lanzan excepciones específicas del vendor. El adapter debe capturarlas y mapearlas a la taxonomía de errores de tu aplicación. `StripeCardError` se convierte en `PaymentDeclinedError`.
- **Mantén los adapters delgados**: un adapter con cientos de líneas de lógica es un servicio, no un adapter. Las transformaciones complejas pertenecen a servicios de aplicación. El adapter debe traducir llamadas y errores, y luego salir del camino.
- **Testea adapters con contract tests**: escribe tests que verifiquen que el adapter satisface la interfaz objetivo, no tests que verifiquen el SDK de terceros. Usa mocks del adaptee para testear el adapter en aislamiento. Consulta [Input Validation](/recipes/api/input-validation) para contratos de límite.

## Errores comunes

- **Filtrar detalles del adaptee**: retornar objetos de respuesta nativos del adaptee desde el adapter fuerza a los consumidores a entender la API de terceros. Siempre retorna tipos de dominio desde el adapter.
- **Adapter inflado**: poner caching, reintentos y métricas dentro del adapter lo hace difícil de testear y reusar. Usa decorators o interceptores para concerns transversales. Mantén el adapter enfocado en traducción de interfaz.
- **No manejar null/undefined**: las APIs de terceros pueden retornar `null` donde tu interfaz espera un objeto vacío o una excepción. Define el contrato de null del adapter y traduce consistentemente.
- **Acoplamiento fuerte a versiones de SDK**: cuando el SDK de terceros lanza un cambio breaking, el adapter lo absorbe. Si llamas al SDK directamente desde código de negocio, cada cambio breaking se propaga por todas partes. El adapter es tu amortiguador de choque.

## Preguntas frecuentes

**P: ¿Es el adapter pattern lo mismo que el facade pattern?**
R: No. Un adapter hace compatible una interfaz con otra. Una fachada provee una interfaz simplificada sobre un subsistema complejo. Puedes usar ambos: una fachada simplifica un subsistema, y un adapter hace esa fachada compatible con la interfaz de tu aplicación.

**P: ¿Debería escribir un adapter para cada librería de terceros?**
R: Solo para librerías con interfaces incompatibles de las que tu código de negocio depende. Una librería de logging con interfaz estándar (SLF4J) no necesita adapter. Un SDK de pagos con interfaz propietaria sí.

**P: ¿Cómo manejo upgrades de SDK con adapters?**
R: El adapter aísla el impacto del upgrade. Cuando el SDK cambia, actualiza solo la implementación del adapter. Corre tests de contrato para asegurar que el adapter sigue satisfaciendo la interfaz objetivo. El código de negocio permanece sin cambios.

**P: ¿Pueden usarse adapters para testing?**
R: Sí. Escribe un `InMemoryPaymentAdapter` que implemente `PaymentProcessor` usando un `Map`. Los tests inyectan este adapter en lugar del adapter real de Stripe, permitiendo tests rápidos y deterministas sin llamadas de red.


### PayPal Adapter y Soporte Multi-Provider

```typescript
class PayPalSDK {
  async captureOrder(params: { amount: number; currency: string }) {
    return { id: 'PAYID-' + Math.random().toString(36) };
  }
  async refundPayment(params: { captureId: string }) {}
}

class PayPalAdapter implements PaymentProcessor {
  constructor(private paypal: PayPalSDK) {}

  async charge(amount: number, currency: string): Promise<string> {
    const result = await this.paypal.captureOrder({ amount, currency });
    return result.id;
  }

  async refund(transactionId: string): Promise<void> {
    await this.paypal.refundPayment({ captureId: transactionId });
  }
}

// Selección de proveedor vía factory
class PaymentProcessorFactory {
  private static providers: Map<string, () => PaymentProcessor> = new Map();

  static register(name: string, factory: () => PaymentProcessor) {
    this.providers.set(name, factory);
  }

  static create(name: string): PaymentProcessor {
    const factory = this.providers.get(name);
    if (!factory) throw new Error(`Unknown provider: ${name}`);
    return factory();
  }
}

PaymentProcessorFactory.register('stripe', () =>
  new StripeAdapter(new StripeSDK()));
PaymentProcessorFactory.register('paypal', () =>
  new PayPalAdapter(new PayPalSDK()));

// Uso — cambia proveedores vía config
const processor = PaymentProcessorFactory.create(process.env.PAYMENT_PROVIDER);
```

### Two-Way Adapter para Migración Incremental

```typescript
// Interfaz vieja — siendo reemplazada
interface LegacyPaymentApi {
  processPayment(amount: number): Promise<{ txId: string }>;
}

// Interfaz nueva — arquitectura objetivo
interface ModernPaymentApi {
  charge(amount: number, currency: string): Promise<string>;
  refund(transactionId: string): Promise<void>;
}

// Two-way adapter — implementa ambas interfaces
class PaymentBridge implements LegacyPaymentApi, ModernPaymentApi {
  constructor(private processor: PaymentProcessor) {}

  // Interfaz legacy — delega a la nueva
  async processPayment(amount: number): Promise<{ txId: string }> {
    const txId = await this.processor.charge(amount, 'USD');
    return { txId };
  }

  // Interfaz moderna
  async charge(amount: number, currency: string): Promise<string> {
    return this.processor.charge(amount, currency);
  }

  async refund(transactionId: string): Promise<void> {
    return this.processor.refund(transactionId);
  }
}

// Código viejo puede usar processPayment(), código nuevo usa charge()
// Ambos coexisten durante la migración
```

### In-Memory Adapter para Testing

```typescript
class InMemoryPaymentAdapter implements PaymentProcessor {
  private transactions: Map<string, { amount: number; currency: string }> = new Map();
  private refunded: Set<string> = new Set();

  async charge(amount: number, currency: string): Promise<string> {
    const txId = 'test_' + Math.random().toString(36);
    this.transactions.set(txId, { amount, currency });
    return txId;
  }

  async refund(transactionId: string): Promise<void> {
    if (!this.transactions.has(transactionId)) {
      throw new Error('Transaction not found');
    }
    this.refunded.add(transactionId);
  }

  // Helpers de test
  getChargedAmount(txId: string): number | undefined {
    return this.transactions.get(txId)?.amount;
  }

  wasRefunded(txId: string): boolean {
    return this.refunded.has(txId);
  }
}

// Uso en tests
describe('CheckoutService', () => {
  it('carga el monto correcto', async () => {
    const processor = new InMemoryPaymentAdapter();
    const service = new CheckoutService(processor);

    const txId = await service.process({
      total: 99.99,
      currency: 'USD',
    });

    expect(processor.getChargedAmount(txId)).toBe(99.99);
  });
});
```

## Mejores Prácticas Adicionales

1. **Usa decorators para concerns transversales.** Mantén el adapter enfocado en traducción. Añade retry, caching y métricas vía decorators:

```typescript
class RetryPaymentAdapter implements PaymentProcessor {
  constructor(
    private inner: PaymentProcessor,
    private maxRetries: number = 3
  ) {}

  async charge(amount: number, currency: string): Promise<string> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await this.inner.charge(amount, currency);
      } catch (err) {
        if (attempt === this.maxRetries - 1) throw err;
        await new Promise(r => setTimeout(r, 100 * Math.pow(2, attempt)));
      }
    }
    throw new Error('Unreachable');
  }

  async refund(transactionId: string): Promise<void> {
    return this.inner.refund(transactionId);
  }
}

// Componer: retry + logging + adapter real
const processor = new RetryPaymentAdapter(
  new LoggingPaymentAdapter(
    new StripeAdapter(new StripeSDK())
  )
);
```

2. **Mapea errores de vendor a errores de dominio.** Crea una tabla de mapeo de errores:

```typescript
class StripeErrorMapper {
  map(error: StripeError): PaymentError {
    switch (error.code) {
      case 'card_declined': return new PaymentDeclinedError(error.message);
      case 'expired_card': return new CardExpiredError(error.message);
      case 'processing_error': return new PaymentProcessingError(error.message);
      default: return new PaymentError(error.message);
    }
  }
}

class StripeAdapter implements PaymentProcessor {
  constructor(
    private stripe: StripeSDK,
    private errorMapper: StripeErrorMapper = new StripeErrorMapper()
  ) {}

  async charge(amount: number, currency: string): Promise<string> {
    try {
      const result = await this.stripe.createCharge({ amount: amount * 100, currency });
      return result.id;
    } catch (err) {
      throw this.errorMapper.map(err as StripeError);
    }
  }
}
```

3. **Versiona adapters junto con versiones de SDK.** Pinea implementaciones de adapter a versiones de SDK:

```typescript
// Stripe SDK v2024-03-20
class StripeAdapterV2024 implements PaymentProcessor { ... }

// Stripe SDK v2025-01-27
class StripeAdapterV2025 implements PaymentProcessor { ... }
```

## Errores Comunes Adicionales

1. **Adaptar en la capa equivocada.** Adaptar dentro de servicios de dominio en lugar de en los límites del sistema causa que la lógica del adapter se propague:

```typescript
// Mal: lógica de adapter dentro del servicio de dominio
class OrderService {
  async process(order: Order) {
    const stripeResult = await stripe.charges.create({
      amount: order.total * 100,
      currency: order.currency,
    });
    // lógica de negocio mezclada con llamadas SDK
  }
}

// Bien: adapter en el límite, servicio de dominio usa interfaz
class OrderService {
  constructor(private processor: PaymentProcessor) {}
  async process(order: Order) {
    const txId = await this.processor.charge(order.total, order.currency);
    // lógica de negocio pura
  }
}
```

2. **No testear el mapeo de errores.** Los adapters que capturan excepciones de vendor pero las mapean incorrectamente causan bugs confusos:

```typescript
describe('StripeAdapter error mapping', () => {
  it('mapea card_declined a PaymentDeclinedError', async () => {
    const stripe = new MockStripeSDK({ throwError: { code: 'card_declined' } });
    const adapter = new StripeAdapter(stripe);

    await expect(adapter.charge(100, 'USD'))
      .rejects.toThrow(PaymentDeclinedError);
  });
});
```

3. **Retornar tipos raw del SDK.** Filtrar objetos `StripeCharge` fuerza a los consumidores a importar tipos del SDK:

```typescript
// Mal: retorna tipo del SDK de Stripe
async charge(amount: number): Promise<StripeCharge> {
  return this.stripe.createCharge({ amount });
}

// Bien: retorna tipo de dominio
async charge(amount: number): Promise<PaymentResult> {
  const result = await this.stripe.createCharge({ amount });
  return { transactionId: result.id, status: 'charged' };
}
```

## FAQ Adicional

### ¿Cómo manejo inicialización async en adapters?

Algunos SDKs requieren setup async (cargar credenciales, establecer conexiones). Usa una factory function o inicialización perezosa:

```typescript
class LazyStripeAdapter implements PaymentProcessor {
  private stripe?: StripeSDK;

  private async getClient(): Promise<StripeSDK> {
    if (!this.stripe) {
      this.stripe = await StripeSDK.create(process.env.STRIPE_KEY);
    }
    return this.stripe;
  }

  async charge(amount: number, currency: string): Promise<string> {
    const client = await this.getClient();
    const result = await client.createCharge({ amount, currency });
    return result.id;
  }
}
```

### ¿Esta solución está lista para producción?

Sí. Los patrones de object adapter, class adapter y registry son todos probados en producción. Los adapters de PayPal y Stripe reflejan patrones reales de integración de SDKs. El two-way adapter se usa en proyectos de migración incremental. El patrón de in-memory test adapter es estándar en codebases test-driven.

### ¿Cuáles son las características de rendimiento?

Los object adapters añaden una llamada a método de overhead por operación — despreciable comparado con I/O de red. Los class adapters evitan la llamada de delegación pero son marginales en la práctica. Las búsquedas en registry son operaciones O(1) en Map. El principal concern de rendimiento es la inicialización del SDK, que debería ocurrir una vez al arranque, no por request.

### ¿Cómo depuro problemas con este enfoque?

Habilita logging en el adapter que registre la entrada, la llamada traducida, y la respuesta del SDK. Si el adapter mapea errores, loggea el error original antes de mapearlo. Usa contract tests para aislar si un bug está en el adapter o en el SDK. Testea el adapter con un mock SDK que lance errores específicos para verificar el mapeo de errores.
