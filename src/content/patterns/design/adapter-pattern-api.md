---
contentType: patterns
slug: adapter-pattern-api
title: "Adapter Pattern for Integrating External REST APIs"
description: "Use the Adapter pattern to normalize responses from external REST APIs into a consistent internal model without leaking third-party formats into your domain"
metaDescription: "Adapter pattern for external REST APIs. Normalize third-party responses into consistent internal models. Clean separation between external and domain logic."
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
  - /patterns/design/decorator-pattern-pipeline
  - /patterns/design/facade-pattern
  - /recipes/api/call-rest-api
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Adapter pattern for external REST APIs. Normalize third-party responses into consistent internal models. Clean separation between external and domain logic."
  keywords:
    - adapter pattern
    - rest api integration
    - structural pattern
    - data normalization
    - third-party api
---

# Adapter Pattern for Integrating External REST APIs

The [Adapter](/patterns/design/adapter-pattern) pattern converts the interface of one class into another interface clients expect. When integrating third-party REST APIs, it becomes a translation layer that maps external data formats into clean, stable domain models your application controls.

## When to Use This

- You consume multiple third-party APIs with different response formats
- API contracts change and you want to contain breaking changes at the boundary
- Your domain model must remain independent from external representation

## Problem

Stripe, PayPal, and Square all expose payment data differently. If your checkout service accesses all three directly, every API version bump pollutes your domain with conditional logic.

## Solution

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

## Usage

```typescript
const service = new PaymentService(new StripeAdapter());
// Switch provider without touching domain logic
// const service = new PaymentService(new PayPalAdapter());
```

## Variations

- **Two-Way Adapter**: Convert internal models back to external format for updates
- **Caching Adapter**: Combine with [Proxy](/patterns/design/proxy-pattern) to cache external lookups
- **Batch Adapter**: Adapt list endpoints into paginated internal queries

## What Works

- Keep adapters stateless and focused on translation only
- Map external IDs to internal UUIDs to avoid leaking provider names
- Version adapters independently when third-party APIs change

## Advanced Techniques

### Two-way adapter for bidirectional conversion

Support converting internal models back to external formats for updates:

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

### Caching adapter with proxy pattern

Combine adapter with proxy to cache external lookups and reduce API calls:

```typescript
// adapters/CachingPaymentAdapter.ts
class CachingPaymentAdapter implements PaymentAdapter {
  private cache = new Map<string, { payment: Payment; expiresAt: number }>();
  private readonly ttl = 60000; // 1 minute

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

// Usage
const stripeAdapter = new StripeAdapter();
const cachingAdapter = new CachingPaymentAdapter(stripeAdapter);
const service = new PaymentService(cachingAdapter);
```

### Batch adapter for paginated endpoints

Adapt list endpoints into paginated internal queries:

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
    // Single payment fetch
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
    // Implement cursor logic for pagination
    return '';
  }
}
```

### Adapter factory for provider selection

Use factory pattern to select appropriate adapter at runtime:

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
      throw new Error(`No adapter registered for provider: ${provider}`);
    }
    return adapter;
  }

  getAdapterFromConfig(config: { provider: string }): PaymentAdapter {
    return this.getAdapter(config.provider);
  }
}

// Usage
const factory = new PaymentAdapterFactory();
factory.register('stripe', new StripeAdapter());
factory.register('paypal', new PayPalAdapter());
factory.register('square', new SquareAdapter());

// Runtime selection
const config = { provider: 'stripe' };
const adapter = factory.getAdapterFromConfig(config);
const service = new PaymentService(adapter);
```

### Retry adapter with exponential backoff

Add retry logic to adapters for handling transient failures:

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

// Usage
const stripeAdapter = new StripeAdapter();
const retryAdapter = new RetryPaymentAdapter(stripeAdapter);
const service = new PaymentService(retryAdapter);
```

### Adapter with validation and error normalization

Normalize errors from different providers into consistent internal errors:

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
        'Payment ID is required',
        'MISSING_ID',
        this.provider
      );
    }
    if (payment.amount < 0) {
      throw new PaymentAdapterError(
        'Payment amount cannot be negative',
        'INVALID_AMOUNT',
        this.provider
      );
    }
  }

  private normalizeError(error: any): PaymentAdapterError {
    if (error instanceof PaymentAdapterError) {
      return error;
    }

    // Normalize provider-specific errors
    if (error.code === 'resource_missing') {
      return new PaymentAdapterError(
        'Payment not found',
        'NOT_FOUND',
        this.provider
      );
    }

    return new PaymentAdapterError(
      error.message || 'Unknown error',
      'UNKNOWN',
      this.provider
    );
  }
}
```

## Best Practices

1. **Keep adapters stateless.** Adapters should focus on translation only, not maintain state. This makes them easier to test and reuse.
2. **Map external IDs to internal UUIDs.** Avoid leaking provider-specific ID formats into your domain by mapping to internal identifiers.
3. **Version adapters independently.** When third-party APIs change, version your adapters to support multiple API versions simultaneously.
4. **Use interfaces for adapters.** Define clear interfaces that adapters must implement, making it easy to swap implementations.
5. **Handle all edge cases.** Account for missing fields, null values, and unexpected data structures in external responses.
6. **Log adapter transformations.** Add logging to track how external data is being transformed, useful for debugging integration issues.
7. **Test with recorded responses.** Use recorded HTTP responses or mocks for unit testing, reserving real API calls for contract tests.
8. **Document external contracts.** Maintain documentation of the external API contracts your adapters depend on.
9. **Monitor adapter performance.** Track metrics on adapter call latency, error rates, and cache hit rates.
10. **Separate validation logic.** Keep data validation separate from translation logic to maintain single responsibility.

## Common Mistakes

1. **Adding business logic inside the adapter.** Adapters should only translate data, not contain business rules. Keep business logic in domain services.
2. **Directly returning external types.** When only a subset of fields is needed, map to internal types rather than returning external objects.
3. **Failing to handle missing or null fields.** External APIs may omit fields or return null values. Always handle these cases gracefully.
4. **Hard-coding provider-specific logic in domain services.** This defeats the purpose of adapters. Keep provider details isolated.
5. **Ignoring error normalization.** Different providers return errors in different formats. Normalize them into consistent internal errors.
6. **Not versioning adapters.** When external APIs change, support multiple versions to avoid breaking existing clients.
7. **Over-caching sensitive data.** Be careful about caching financial or personal data. Consider cache invalidation strategies.
8. **Mixing concerns in adapters.** Don't combine authentication, rate limiting, or other concerns with translation logic.
9. **Leaking external formats in error messages.** Ensure error messages use internal terminology, not provider-specific terms.
10. **Skipping contract tests.** Unit tests with mocks are not enough. Run contract tests against actual APIs to verify integration.

## FAQ

**Q: How is this different from a mapper function?**
A: An [adapter](/patterns/design/adapter-pattern) implements a known interface so the consuming service does not depend on which provider is active. A mapper is typically a one-off function call.

**Q: Should I test adapters with real HTTP calls?**
A: Prefer recorded responses or stubs for speed. Test the real adapter in a separate contract test suite to verify integration with the actual API.

**Q: Can I use adapters for write operations?**
A: Yes. Two-way adapters can convert internal models back to external formats for updates, maintaining the same translation benefits for writes.

**Q: How do I handle API rate limits in adapters?**
A: Implement rate limiting at the adapter level using token buckets or sliding window algorithms. Consider combining with caching to reduce API calls.

**Q: Should adapters handle authentication?**
A: Authentication should be handled separately, typically by an HTTP client or interceptor. Adapters should focus on data translation only.

**Q: How do I version adapters when external APIs change?**
A: Create separate adapter classes for each API version (e.g., StripeV1Adapter, StripeV2Adapter) and use a factory to select the appropriate version based on configuration.

**Q: Can adapters be used for real-time data streams?**
A: Yes. Adapters can transform streaming data from websockets or server-sent events into internal domain models in real-time.

**Q: How do I handle partial failures in batch adapters?**
A: Implement partial success handling where the adapter returns both successfully transformed items and failed items with error details.

**Q: Should adapters perform data enrichment?**
A: No. Enrichment should be handled by domain services. Adapters should only translate external data into internal formats.

**Q: Is this pattern suitable for small projects?**
A: For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

**Q: How does this pattern compare to alternatives?**
A: Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

**Q: Can I partially apply this pattern?**
A: Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
