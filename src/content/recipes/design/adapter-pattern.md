---
contentType: recipes
slug: adapter-pattern-recipe
title: "Bridge Incompatible Interfaces with the Adapter Pattern"
description: "How to integrate legacy APIs, third-party libraries, and incompatible interfaces using object adapters, class adapters, and facade adapters in Java, TypeScript, and Python."
metaDescription: "Learn adapter pattern to integrate incompatible interfaces. Bridge legacy APIs and third-party libraries using object and class adapters in Java, TypeScript, Python."
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
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn adapter pattern to integrate incompatible interfaces. Bridge legacy APIs and third-party libraries using object and class adapters in Java, TypeScript, Python."
  keywords:
    - adapter pattern
    - interface adapter
    - legacy integration
    - third party wrapper
    - structural design pattern
---

## Overview

Your application expects a `PaymentProcessor` interface with methods `charge(amount)` and `refund(transactionId)`. The Stripe SDK uses `charges.create({ amount })` and `refunds.create({ charge })`. The PayPal SDK uses `orders.capture({ amount })` and `payments.refund({ captureId })`. Neither matches your interface. You could sprinkle Stripe-specific and PayPal-specific code throughout your codebase, but switching providers would require touching every file that processes payments.

The adapter pattern solves this by introducing a wrapper class that implements your application's interface and translates calls to the third-party SDK. Your business code depends only on the adapter interface. Swapping Stripe for PayPal means writing a new adapter — no changes to business logic. The following demonstrates how to object adapters, class adapters, two-way adapters, and adapter registries with practical examples.

## When to use it

Use this recipe when:

- Integrating a third-party library with an incompatible interface. See [Hexagonal Architecture](/recipes/design/hexagonal-architecture) for port/adapter isolation.
- Migrating from a legacy system without rewriting dependent code. See [Factory Pattern](/recipes/factory-pattern-recipe) for creating adapter instances.
- Exposing a simplified facade over a complex subsystem
- Supporting multiple implementations of the same capability (payments, storage, messaging). See [Strategy Pattern](/recipes/strategy-pattern-recipe) for runtime algorithm selection.
- Testing code that depends on external services by adapting mocks

## Solution

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

### Python Adapter with Registry

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

## Explanation

- **Object adapter**: the adapter holds a reference to the adaptee (the third-party class) and delegates calls to it. This is the most flexible approach — it works with final classes, supports composition over inheritance, and allows adapting multiple adaptees simultaneously.
- **Class adapter**: the adapter inherits from the adaptee and implements the target interface. This requires the adaptee to be non-final and works only in single-inheritance languages where the adapter does not already extend another class. It is less flexible but slightly faster.
- **Two-way adapter**: when two systems need to interoperate and neither can be changed, a two-way adapter implements both interfaces. It translates calls in both directions, acting as a bridge during incremental migration.
- **Adapter registry**: when supporting multiple providers (Stripe, PayPal, Braintree), a registry maps provider names to adapter classes. The factory instantiates the correct adapter based on configuration, isolating adapter selection from business logic.

## Variants

| Variant | Flexibility | Performance | Best for |
|---------|------------|-------------|----------|
| Object adapter | High | Medium | General use, third-party SDKs |
| Class adapter | Low | High | Performance-critical, single adaptee |
| Two-way adapter | Medium | Medium | Incremental migration |
| Facade adapter | High | Medium | Simplifying complex subsystems |
| Registry + adapter | High | Medium | Multiple provider support |

## What Works

- **Adapt at the boundary, not everywhere**: introduce adapters at system boundaries where external interfaces meet internal abstractions. Do not let third-party types leak into business logic.
- **Document translation behavior**: adapters do more than rename methods. They may convert units, transform error types, or batch requests. Document these translations clearly.
- **Handle errors gracefully**: third-party APIs throw vendor-specific exceptions. The adapter should catch these and map them to your application's error taxonomy. `StripeCardError` becomes `PaymentDeclinedError`.
- **Keep adapters thin**: an adapter with hundreds of lines of logic is a service, not an adapter. Complex transformations belong in application services. The adapter should translate calls and errors, then get out of the way.
- **Test adapters with contract tests**: write tests that verify the adapter satisfies the target interface, not tests that verify the third-party SDK. Use mocks of the adaptee to test the adapter in isolation. See [Input Validation](/recipes/api/input-validation) for boundary contracts.

## Common mistakes

- **Leaking adaptee details**: returning the adaptee's native response objects from the adapter forces consumers to understand the third-party API. Always return domain types from the adapter.
- **Adapter bloat**: putting caching, retry logic, and metrics inside the adapter makes it hard to test and reuse. Use decorators or interceptors for cross-cutting concerns. Keep the adapter focused on interface translation.
- **Not handling null/undefined**: third-party APIs may return `null` where your interface expects an empty object or throws an exception. Define the adapter's null contract and translate consistently.
- **Tight coupling to SDK versions**: when the third-party SDK releases a breaking change, the adapter absorbs it. If you call the SDK directly from business code, every breaking change propagates everywhere. The adapter is your shock absorber — keep it.

## FAQ

**Q: Is the adapter pattern the same as the facade pattern?**
A: No. An adapter makes one interface compatible with another. A facade provides a simplified interface over a complex subsystem. You might use both: a facade simplifies a subsystem, and an adapter makes that facade compatible with your application's interface.

**Q: Should I write an adapter for every third-party library?**
A: Only for libraries with incompatible interfaces that your business code depends on. A logging library with a standard interface (SLF4J) does not need an adapter. A payment SDK with a proprietary interface does.

**Q: How do I handle SDK upgrades with adapters?**
A: The adapter isolates the upgrade impact. When the SDK changes, update only the adapter implementation. Run contract tests to ensure the adapter still satisfies the target interface. Business code remains unchanged.

**Q: Can adapters be used for testing?**
A: Yes. Write an `InMemoryPaymentAdapter` that implements `PaymentProcessor` using a `Map`. Tests inject this adapter instead of the real Stripe adapter, enabling fast, deterministic tests without network calls.


### PayPal Adapter and Multi-Provider Support

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

// Provider selection via factory
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

// Usage — swap providers via config
const processor = PaymentProcessorFactory.create(process.env.PAYMENT_PROVIDER);
```

### Two-Way Adapter for Incremental Migration

```typescript
// Old interface — being phased out
interface LegacyPaymentApi {
  processPayment(amount: number): Promise<{ txId: string }>;
}

// New interface — target architecture
interface ModernPaymentApi {
  charge(amount: number, currency: string): Promise<string>;
  refund(transactionId: string): Promise<void>;
}

// Two-way adapter — implements both interfaces
class PaymentBridge implements LegacyPaymentApi, ModernPaymentApi {
  constructor(private processor: PaymentProcessor) {}

  // Legacy interface — delegates to new
  async processPayment(amount: number): Promise<{ txId: string }> {
    const txId = await this.processor.charge(amount, 'USD');
    return { txId };
  }

  // Modern interface
  async charge(amount: number, currency: string): Promise<string> {
    return this.processor.charge(amount, currency);
  }

  async refund(transactionId: string): Promise<void> {
    return this.processor.refund(transactionId);
  }
}

// Old code can use processPayment(), new code uses charge()
// Both coexist during migration
```

### In-Memory Adapter for Testing

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

  // Test helpers
  getChargedAmount(txId: string): number | undefined {
    return this.transactions.get(txId)?.amount;
  }

  wasRefunded(txId: string): boolean {
    return this.refunded.has(txId);
  }
}

// Test usage
describe('CheckoutService', () => {
  it('charges the correct amount', async () => {
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

## Additional Best Practices

1. **Use decorators for cross-cutting concerns.** Keep the adapter focused on translation. Add retry, caching, and metrics via decorators:

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

// Compose: retry + logging + actual adapter
const processor = new RetryPaymentAdapter(
  new LoggingPaymentAdapter(
    new StripeAdapter(new StripeSDK())
  )
);
```

2. **Map vendor errors to domain errors.** Create an error mapping table:

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

3. **Version adapters alongside SDK versions.** Pin adapter implementations to SDK versions:

```typescript
// Stripe SDK v2024-03-20
class StripeAdapterV2024 implements PaymentProcessor { ... }

// Stripe SDK v2025-01-27
class StripeAdapterV2025 implements PaymentProcessor { ... }
```

## Additional Common Mistakes

1. **Adapting at the wrong layer.** Adapting inside domain services instead of at system boundaries causes adapter logic to spread:

```typescript
// Bad: adapter logic inside domain service
class OrderService {
  async process(order: Order) {
    const stripeResult = await stripe.charges.create({
      amount: order.total * 100,
      currency: order.currency,
    });
    // business logic mixed with SDK calls
  }
}

// Good: adapter at boundary, domain service uses interface
class OrderService {
  constructor(private processor: PaymentProcessor) {}
  async process(order: Order) {
    const txId = await this.processor.charge(order.total, order.currency);
    // pure business logic
  }
}
```

2. **Not testing error mapping.** Adapters that catch vendor exceptions but map them incorrectly cause confusing bugs:

```typescript
describe('StripeAdapter error mapping', () => {
  it('maps card_declined to PaymentDeclinedError', async () => {
    const stripe = new MockStripeSDK({ throwError: { code: 'card_declined' } });
    const adapter = new StripeAdapter(stripe);

    await expect(adapter.charge(100, 'USD'))
      .rejects.toThrow(PaymentDeclinedError);
  });
});
```

3. **Returning raw SDK types.** Leaking `StripeCharge` objects forces consumers to import SDK types:

```typescript
// Bad: returns Stripe SDK type
async charge(amount: number): Promise<StripeCharge> {
  return this.stripe.createCharge({ amount });
}

// Good: returns domain type
async charge(amount: number): Promise<PaymentResult> {
  const result = await this.stripe.createCharge({ amount });
  return { transactionId: result.id, status: 'charged' };
}
```

## Additional FAQ

### How do I handle async initialization in adapters?

Some SDKs require async setup (loading credentials, establishing connections). Use a factory function or lazy initialization:

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

### Is this solution production-ready?

Yes. The object adapter, class adapter, and registry patterns are all production-proven. The PayPal and Stripe adapters mirror real SDK integration patterns. The two-way adapter is used in incremental migration projects. The in-memory test adapter pattern is standard in test-driven codebases.

### What are the performance characteristics?

Object adapters add one method call of overhead per operation — negligible compared to network I/O. Class adapters avoid the delegation call but are marginal in practice. Registry lookups are O(1) Map operations. The main performance concern is SDK initialization, which should happen once at startup, not per request.

### How do I debug issues with this approach?

Enable logging in the adapter that records the input, the translated call, and the SDK response. If the adapter maps errors, log the original error before mapping. Use contract tests to isolate whether a bug is in the adapter or the SDK. Test the adapter with a mock SDK that throws specific errors to verify error mapping.
