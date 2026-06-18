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
relatedResources:
  - /patterns/design/decorator-pattern-pipeline
  - /patterns/design/facade-pattern
  - /recipes/api/call-rest-api
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

El Adapter pattern convierte la interfaz de una clase en otra interfaz que los clientes esperan. Al integrar APIs REST de terceros, se convierte en una capa de traduccion que mapea formatos de datos externos a modelos de dominio limpios y estables que tu aplicacion controla.

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
- **Caching Adapter**: Combina con Proxy para cachear busquedas externas
- **Batch Adapter**: Adapta endpoints de lista a consultas internas paginadas

## Mejores Practicas

- Manten los adapters stateless y enfocados solo en traduccion
- Mapea IDs externos a UUIDs internos para evitar filtrar nombres de proveedor
- Versiona los adapters independientemente cuando las APIs de terceros cambian

## Errores Comunes

- Agregar logica de negocio dentro del adapter en lugar del servicio de dominio
- Retornar tipos externos directamente cuando solo se necesita un subconjunto de campos
- No manejar campos faltantes o nulos en respuestas externas

## FAQ

**P: Como se diferencia de una funcion mapper?**
R: Un adapter implementa una interfaz conocida asi que el servicio consumidor no depende de que proveedor este activo. Un mapper es tipicamente una llamada de funcion aislada.

**P: Deberia probar adapters con llamadas HTTP reales?**
R: Prefiere respuestas grabadas o stubs para velocidad. Prueba el adapter real en una suite de test de contrato separada.
