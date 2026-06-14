---
contentType: recipes
slug: adapter-pattern
title: "Bridge Incompatible Interfaces with the Adapter Pattern"
description: "How to integrate legacy APIs, third-party libraries, and incompatible interfaces using object adapters, class adapters, and facade adapters in Java, TypeScript, and Python."
metaDescription: "Learn adapter pattern to integrate incompatible interfaces. Bridge legacy APIs and third-party libraries using object and class adapters in Java, TypeScript, Python."
difficulty: beginner
topics:
  - design
tags:
  - adapter-pattern
  - structural-patterns
  - legacy-integration
  - third-party-apis
  - interface-compatibility
  - wrapper
  - facade
  - decoupling
relatedResources:
  - /recipes/hexagonal-architecture
  - /recipes/factory-pattern
  - /recipes/api-gateway
  - /recipes/singleton-pattern
lastUpdated: "2026-06-14"
author: "StackPractices"
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

The adapter pattern solves this by introducing a wrapper class that implements your application's interface and translates calls to the third-party SDK. Your business code depends only on the adapter interface. Swapping Stripe for PayPal means writing a new adapter — no changes to business logic. This recipe covers object adapters, class adapters, two-way adapters, and adapter registries with practical examples.

## When to use it

Use this recipe when:

- Integrating a third-party library with an incompatible interface
- Migrating from a legacy system without rewriting dependent code
- Exposing a simplified facade over a complex subsystem
- Supporting multiple implementations of the same capability (payments, storage, messaging)
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

## Best practices

- **Adapt at the boundary, not everywhere**: introduce adapters at system boundaries where external interfaces meet internal abstractions. Do not let third-party types leak into business logic.
- **Document translation behavior**: adapters do more than rename methods. They may convert units, transform error types, or batch requests. Document these translations clearly.
- **Handle errors gracefully**: third-party APIs throw vendor-specific exceptions. The adapter should catch these and map them to your application's error taxonomy. `StripeCardError` becomes `PaymentDeclinedError`.
- **Keep adapters thin**: an adapter with hundreds of lines of logic is a service, not an adapter. Complex transformations belong in application services. The adapter should translate calls and errors, then get out of the way.
- **Test adapters with contract tests**: write tests that verify the adapter satisfies the target interface, not tests that verify the third-party SDK. Use mocks of the adaptee to test the adapter in isolation.

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

