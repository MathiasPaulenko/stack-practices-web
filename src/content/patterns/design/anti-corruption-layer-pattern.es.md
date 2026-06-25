---
contentType: patterns
slug: anti-corruption-layer-pattern
title: "Patrón Anti-Corruption Layer"
description: "Inserta una capa de traducción entre un bounded context y un sistema externo para aislar modelos de dominio, prevenir que restricciones legacy filtren, y preservar la integridad semántica."
metaDescription: "Aprende el Patrón Anti-Corruption Layer para aislar modelos de dominio de sistemas legacy. Ejemplos en Python, Java y JavaScript con adapters y translators."
difficulty: intermediate
topics:
  - design
  - architecture
  - infrastructure
tags:
  - anti-corruption-layer
  - pattern
  - design-pattern
  - architecture
  - ddd
  - legacy
  - adapter
  - bounded-context
relatedResources:
  - /patterns/design/adapter-pattern
  - /patterns/design/facade-pattern
  - /patterns/design/strangler-fig-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Anti-Corruption Layer para aislar modelos de dominio de sistemas legacy. Ejemplos en Python, Java y JavaScript con adapters y translators."
  keywords:
    - anti corruption layer
    - design pattern
    - ddd
    - legacy
    - adapter
    - bounded context
---

# Patrón Anti-Corruption Layer

## Descripción General

El Patrón Anti-Corruption Layer (ACL) inserta un límite de traducción entre un bounded context y un sistema externo — legacy, de terceros, o foráneo — para prevenir que modelos de dominio incompatibles, convenciones de nomenclatura, y restricciones arquitectónicas filtren hacia el contexto consumidor.

En Domain-Driven Design (DDD), cada bounded context posee su propio lenguaje ubicuo y modelo. Cuando se integra con un sistema legacy que usa terminología diferente (ej. `Customer` vs `Client`, `Order` vs `Transaction`), el acoplamiento directo causa que el modelo foráneo corrompa el dominio local. El ACL actúa como una membrana protectora: expone una interfaz limpia alineada con el dominio local, luego traduce llamadas hacia y desde la API o formato de datos del sistema externo.

## Cuándo Usar

Usa el Patrón Anti-Corruption Layer cuando:
- Integrando con un sistema legacy que tiene un modelo de dominio fundamentalmente diferente
- Consumiendo una API de terceros con nomenclatura, tipos o semántica incompatibles
- Construyendo un nuevo bounded context que no debe estar limitado por estructuras de datos externas
- Migrando de un sistema legacy de forma incremental (a menudo combinado con Strangler Fig)

## Cuándo Evitar

- El sistema externo comparte el mismo lenguaje ubicuo y modelo (la integración directa es más simple)
- La capa de traducción sería trivial (mapeo uno-a-uno de campos sin cambio semántico)
- El overhead de traducción es inaceptable en un path crítico de latencia
- El sistema externo es temporal y será reemplazado antes de que el ACL se pague

## Solución

### Python

```python
from dataclasses import dataclass
from typing import Optional
from datetime import datetime

# ============================================================================
# MODELO DE DOMINIO (nuestro bounded context)
# ============================================================================

@dataclass
class Customer:
    customer_id: str
    full_name: str
    email: str
    registered_at: datetime

@dataclass
class Order:
    order_id: str
    customer: Customer
    total_amount: float
    items: list

# ============================================================================
# SISTEMA LEGACY (modelo foráneo con el que debemos integrar)
# ============================================================================

class LegacyOrderSystem:
    """Simula un sistema legacy con diferente terminología y estructura"""
    def get_order_by_txn_id(self, txn_id: str) -> dict:
        return {
            "txn_id": txn_id,
            "cust_ref": "C-8842",
            "cust_name": "Alice Johnson",
            "cust_email": "alice@example.com",
            "txn_date": "2024-03-15T09:30:00Z",
            "line_items": [
                {"sku": "SKU-001", "desc": "Widget", "qty": 2, "unit_price": 25.0}
            ],
            "gross_value": 50.0,
            "tax_rate": 0.08,
            "discount_code": "SPRING10"
        }

# ============================================================================
# ANTI-CORRUPTION LAYER
# ============================================================================

class OrderTranslator:
    """Traduce entre el formato legacy y nuestro modelo de dominio"""
    @staticmethod
    def to_domain(legacy_data: dict) -> Order:
        customer = Customer(
            customer_id=legacy_data["cust_ref"],
            full_name=legacy_data["cust_name"],
            email=legacy_data["cust_email"],
            registered_at=datetime.fromisoformat(legacy_data["txn_date"].replace("Z", "+00:00"))
        )
        return Order(
            order_id=legacy_data["txn_id"],
            customer=customer,
            total_amount=legacy_data["gross_value"],
            items=legacy_data["line_items"]
        )

class OrderRepositoryACL:
    """ACL facade que expone una interfaz limpia de dominio sobre el sistema legacy"""
    def __init__(self, legacy_system: LegacyOrderSystem):
        self._legacy = legacy_system
        self._translator = OrderTranslator()

    def get_order(self, order_id: str) -> Optional[Order]:
        """Nombre de método alineado con el dominio; el caller no sabe nada sobre 'txn_id'"""
        legacy_data = self._legacy.get_order_by_txn_id(order_id)
        if not legacy_data:
            return None
        return self._translator.to_domain(legacy_data)


# ============================================================================
# USO (el código de dominio está aislado de los detalles legacy)
# ============================================================================

legacy = LegacyOrderSystem()
order_repo = OrderRepositoryACL(legacy)

order = order_repo.get_order("TXN-12345")
print(f"Order {order.order_id} para {order.customer.full_name}")
print(f"Total: ${order.total_amount}")
```

### Java

```java
import java.time.Instant;
import java.util.*;

// Modelo de dominio
record Customer(String customerId, String fullName, String email, Instant registeredAt) {}
record OrderItem(String sku, String description, int quantity, double unitPrice) {}
record Order(String orderId, Customer customer, double totalAmount, List<OrderItem> items) {}

// Sistema legacy
class LegacyOrderSystem {
    public Map<String, Object> getOrderByTxnId(String txnId) {
        Map<String, Object> result = new HashMap<>();
        result.put("txn_id", txnId);
        result.put("cust_ref", "C-8842");
        result.put("cust_name", "Alice Johnson");
        result.put("cust_email", "alice@example.com");
        result.put("txn_date", "2024-03-15T09:30:00Z");
        result.put("gross_value", 50.0);

        List<Map<String, Object>> items = new ArrayList<>();
        Map<String, Object> item = new HashMap<>();
        item.put("sku", "SKU-001");
        item.put("desc", "Widget");
        item.put("qty", 2);
        item.put("unit_price", 25.0);
        items.add(item);
        result.put("line_items", items);

        return result;
    }
}

// ACL Translator
class OrderTranslator {
    @SuppressWarnings("unchecked")
    public Order toDomain(Map<String, Object> legacy) {
        Customer customer = new Customer(
            (String) legacy.get("cust_ref"),
            (String) legacy.get("cust_name"),
            (String) legacy.get("cust_email"),
            Instant.parse((String) legacy.get("txn_date"))
        );

        List<Map<String, Object>> legacyItems = (List<Map<String, Object>>) legacy.get("line_items");
        List<OrderItem> items = new ArrayList<>();
        for (Map<String, Object> li : legacyItems) {
            items.add(new OrderItem(
                (String) li.get("sku"),
                (String) li.get("desc"),
                (Integer) li.get("qty"),
                ((Number) li.get("unit_price")).doubleValue()
            ));
        }

        return new Order(
            (String) legacy.get("txn_id"),
            customer,
            ((Number) legacy.get("gross_value")).doubleValue(),
            items
        );
    }
}

// ACL Facade
class OrderRepositoryACL {
    private final LegacyOrderSystem legacy;
    private final OrderTranslator translator = new OrderTranslator();

    public OrderRepositoryACL(LegacyOrderSystem legacy) {
        this.legacy = legacy;
    }

    public Order getOrder(String orderId) {
        Map<String, Object> legacyData = legacy.getOrderByTxnId(orderId);
        return translator.toDomain(legacyData);
    }
}

// Uso
LegacyOrderSystem legacy = new LegacyOrderSystem();
OrderRepositoryACL repo = new OrderRepositoryACL(legacy);
Order order = repo.getOrder("TXN-12345");
System.out.println("Order " + order.orderId() + " para " + order.customer().fullName());
```

### JavaScript

```javascript
// Modelo de dominio
class Customer {
  constructor(customerId, fullName, email, registeredAt) {
    this.customerId = customerId;
    this.fullName = fullName;
    this.email = email;
    this.registeredAt = registeredAt;
  }
}

class Order {
  constructor(orderId, customer, totalAmount, items) {
    this.orderId = orderId;
    this.customer = customer;
    this.totalAmount = totalAmount;
    this.items = items;
  }
}

// Sistema legacy
class LegacyOrderSystem {
  getOrderByTxnId(txnId) {
    return {
      txn_id: txnId,
      cust_ref: 'C-8842',
      cust_name: 'Alice Johnson',
      cust_email: 'alice@example.com',
      txn_date: '2024-03-15T09:30:00Z',
      gross_value: 50.0,
      line_items: [
        { sku: 'SKU-001', desc: 'Widget', qty: 2, unit_price: 25.0 }
      ]
    };
  }
}

// ACL Translator
class OrderTranslator {
  toDomain(legacyData) {
    const customer = new Customer(
      legacyData.cust_ref,
      legacyData.cust_name,
      legacyData.cust_email,
      new Date(legacyData.txn_date)
    );

    const items = legacyData.line_items.map(li => ({
      sku: li.sku,
      description: li.desc,
      quantity: li.qty,
      unitPrice: li.unit_price
    }));

    return new Order(
      legacyData.txn_id,
      customer,
      legacyData.gross_value,
      items
    );
  }
}

// ACL Facade
class OrderRepositoryACL {
  constructor(legacySystem) {
    this.legacy = legacySystem;
    this.translator = new OrderTranslator();
  }

  getOrder(orderId) {
    const legacyData = this.legacy.getOrderByTxnId(orderId);
    return this.translator.toDomain(legacyData);
  }
}

// Uso
const legacy = new LegacyOrderSystem();
const repo = new OrderRepositoryACL(legacy);
const order = repo.getOrder('TXN-12345');
console.log(`Order ${order.orderId} para ${order.customer.fullName}`);
console.log(`Total: $${order.totalAmount}`);
```

## Explicación

El ACL tiene tres responsabilidades:

1. **Traducción**: Convertir estructuras de datos, nombres de campo, tipos y semántica de valores entre sistemas
2. **Adaptación de interfaz**: Exponer métodos alineados con el lenguaje ubicuo local (`getOrder` no `getOrderByTxnId`)
3. **Aislamiento**: Prevenir que cambios en el sistema legacy se propaguen al modelo de dominio

El ACL típicamente se organiza como una **facade** (el punto de entrada) más **translators/mappers** (lógica de conversión de datos). También puede manejar **caching**, **circuit breaking**, y **logging** para proteger aún más el dominio.

## Variantes

| Variante | Estructura | Caso de Uso |
|----------|------------|-------------|
| **Adapter ACL** | Clase adapter única por sistema externo | Integración simple uno-a-uno |
| **Repository ACL** | Facade de repository + translator + data mapper | Boundary de acceso a datos |
| **Service ACL** | Service layer con anti-corruption services | Traducción de lógica de negocio compleja |
| **Event-driven ACL** | Traductor de eventos entre formatos de mensaje | Integración basada en eventos async |
| **CQRS read ACL** | Read model separado traduciendo a DTOs de query | Reportes sobre datos legacy |

## Mejores Prácticas

- **Mantén el ACL thin.** La lógica de negocio pertenece al dominio, no a la capa de traducción.
- **Testea traducciones independientemente.** Unit test de clases translator con datos de fixture de ambos sistemas.
- **Versiona la interfaz del ACL.** Los cambios en el sistema legacy deberían ser absorbidos por el ACL, no por el dominio.
- **Loggea fallas de traducción.** Campos no coincidentes o problemas de coerción de tipos deberían ser observables.
- **Considera traducción bidireccional.** Si los writes van al sistema legacy, necesitas `to_legacy()` además de `to_domain()`.

## Errores Comunes

- **Filtrar tipos legacy al dominio.** El ACL debería ser el único lugar que conoce estructuras legacy.
- **Poner lógica de dominio en el ACL.** Cálculos, validaciones e invariantes pertenecen a la capa de dominio.
- **Saltar tests para casos edge.** Campos nulos, enums inesperados y cambios de formato ocurren en sistemas legacy.
- **Acoplamiento fuerte entre ACL y dominio.** El dominio debería depender de una interfaz, no directamente de la implementación del ACL.
- **Una clase ACL gigante.** Separa por concern: `OrderACL`, `CustomerACL`, `InventoryACL`.

## Ejemplos del Mundo Real

### Integración SAP

Los sistemas enterprise que se integran con SAP a menudo construyen ACLs porque SAP usa nombres de campo germanocéntricos, formatos IDoc, e interfaces RFC/BAPI que no se parecen en nada al modelo de dominio interno.

### Wrappers de Payment Gateway

Stripe, Adyen y PayPal cada uno tienen diferentes formatos de webhook y estructuras de API. Un ACL de pagos los normaliza en un modelo uniforme `PaymentEvent` que el dominio procesa independientemente del proveedor.

### Boundaries de Microservicios

En una arquitectura de microservicios, cada servicio es un bounded context. Los ACLs en los boundaries de servicio traducen entre los modelos internos del Equipo A (ej. `UserProfile`) y el Equipo B (ej. `CustomerAccount`).

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre ACL y Adapter?**
A: Adapter hace dos interfaces compatibles. ACL adicionalmente previene corrupción semántica — aísla modelos y lenguajes, no solo firmas de métodos.

**Q: Debería el ACL manejar retries y circuit breaking?**
A: Sí, los patrones de resiliencia a menudo se ubican junto con el ACL porque protegen el dominio de fallas externas además de desajustes de modelos.

**Q: Es necesario un ACL para clientes de REST API?**
A: Si el modelo de la API coincide con tu dominio, un simple cliente HTTP basta. Si la API usa terminología, tipos o estructuras diferentes, un ACL agrega valor.

**Q: Cómo se relaciona ACL con el Patrón Strangler Fig?**
A: Strangler Fig reemplaza incrementalmente un sistema legacy. El ACL es a menudo el primer componente construido, actuando como la interfaz del nuevo sistema hacia el sistema legacy que se está strangulando.
