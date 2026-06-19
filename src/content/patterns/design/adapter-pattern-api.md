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

## Best Practices

- Keep adapters stateless and focused on translation only
- Map external IDs to internal UUIDs to avoid leaking provider names
- Version adapters independently when third-party APIs change

## Common Mistakes

- Adding business logic inside the adapter instead of the domain service
- Directly returning external types when only a subset of fields are needed
- Failing to handle missing or null fields in external responses

## FAQ

**Q: How is this different from a mapper function?**
A: An [adapter](/patterns/design/adapter-pattern) implements a known interface so the consuming service does not depend on which provider is active. A mapper is typically a one-off function call.

**Q: Should I test adapters with real HTTP calls?**
A: Prefer recorded responses or stubs for speed. Test the real adapter in a separate contract test suite.
