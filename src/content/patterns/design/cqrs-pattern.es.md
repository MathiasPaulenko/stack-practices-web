---
contentType: patterns
slug: cqrs-pattern
title: "Patrón CQRS"
description: "Separa las operaciones de lectura y escritura en modelos diferentes, optimizando cada uno para su carga de trabajo específica. Un patrón de datos para sistemas escalables."
metaDescription: "Aprende el Patrón CQRS en Python, Java y JavaScript. Patrón arquitectónico que separa modelos de lectura y escritura para rendimiento y escalabilidad."
difficulty: advanced
topics:
  - design
tags:
  - cqrs
  - patron
  - patron-de-diseno
  - arquitectura
  - modelo-lectura
  - modelo-escritura
  - escalabilidad
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/event-sourcing-pattern
  - /patterns/design/saga-pattern
  - /patterns/design/cache-aside-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende el Patrón CQRS en Python, Java y JavaScript. Patrón arquitectónico que separa modelos de lectura y escritura para rendimiento y escalabilidad."
  keywords:
    - patron cqrs
    - patron de diseno
    - patron arquitectonico
    - modelo lectura
    - modelo escritura
    - python cqrs
    - java cqrs
    - javascript cqrs
---

# Patrón CQRS

## Resumen

CQRS (Command Query Responsibility Segregation) es un patrón arquitectónico que separa las operaciones de lectura y escritura en modelos distintos. En lugar de usar un único modelo de datos para consultas y actualizaciones, CQRS usa un **Modelo de Comandos** para escrituras y un **Modelo de Consultas** para lecturas, cada uno optimizado para su carga de trabajo específica.

## Cuándo usarlo

Usa el Patrón CQRS cuando:
- Las cargas de trabajo de lectura y escritura tengan características de rendimiento muy diferentes o escalen independientemente
- Necesites capacidades de consulta complejas (agregación, filtrado, búsqueda) sin complicar el modelo de escritura
- El event sourcing ya esté en uso, haciendo que las proyecciones del modelo de lectura sean naturales
- Diferentes equipos sean dueños de lecturas vs. escrituras, y el desacoplamiento reduzca coordinación
- Ejemplos: dashboards de analytics, catálogos de e-commerce, feeds de redes sociales, sistemas de reportes

## Solución

### Python

```python
from dataclasses import dataclass, field
from typing import List, Dict
from datetime import datetime

# Modelo de Escritura (Command Side)
@dataclass
class Order:
    order_id: str
    customer_id: str
    items: List[dict] = field(default_factory=list)
    status: str = "pending"
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

class OrderCommandHandler:
    def __init__(self):
        self.orders: Dict[str, Order] = {}

    def create_order(self, order_id: str, customer_id: str) -> Order:
        order = Order(order_id=order_id, customer_id=customer_id)
        self.orders[order_id] = order
        return order

    def add_item(self, order_id: str, product: str, qty: int, price: float):
        order = self.orders[order_id]
        order.items.append({"product": product, "qty": qty, "price": price})

    def confirm(self, order_id: str):
        self.orders[order_id].status = "confirmed"

# Modelo de Lectura (Query Side) — optimizado para lecturas
@dataclass
class OrderSummary:
    order_id: str
    customer_id: str
    total: float
    item_count: int
    status: str

class OrderQueryHandler:
    def __init__(self, command_store: Dict[str, Order]):
        self.command_store = command_store

    def get_summary(self, order_id: str) -> OrderSummary:
        order = self.command_store[order_id]
        total = sum(i["qty"] * i["price"] for i in order.items)
        return OrderSummary(
            order_id=order.order_id,
            customer_id=order.customer_id,
            total=total,
            item_count=len(order.items),
            status=order.status
        )

    def list_by_customer(self, customer_id: str) -> List[OrderSummary]:
        return [
            self.get_summary(o.order_id)
            for o in self.command_store.values()
            if o.customer_id == customer_id
        ]

# Uso
commands = OrderCommandHandler()
commands.create_order("ORD-1", "CUST-1")
commands.add_item("ORD-1", "Laptop", 1, 999.99)
commands.add_item("ORD-1", "Mouse", 2, 29.99)
commands.confirm("ORD-1")

queries = OrderQueryHandler(commands.orders)
summary = queries.get_summary("ORD-1")
print(f"Order {summary.order_id}: ${summary.total:.2f} ({summary.item_count} items)")
```

### JavaScript

```javascript
// Modelo de Escritura (Command Side)
class OrderCommandHandler {
  constructor() {
    this.orders = new Map();
  }

  createOrder(orderId, customerId) {
    this.orders.set(orderId, {
      orderId, customerId, items: [], status: "pending",
      createdAt: new Date().toISOString()
    });
  }

  addItem(orderId, product, qty, price) {
    this.orders.get(orderId).items.push({ product, qty, price });
  }

  confirm(orderId) {
    this.orders.get(orderId).status = "confirmed";
  }
}

// Modelo de Lectura (Query Side)
class OrderQueryHandler {
  constructor(commandStore) {
    this.store = commandStore;
  }

  getSummary(orderId) {
    const order = this.store.get(orderId);
    const total = order.items.reduce((sum, i) => sum + i.qty * i.price, 0);
    return {
      orderId: order.orderId,
      customerId: order.customerId,
      total,
      itemCount: order.items.length,
      status: order.status
    };
  }

  listByCustomer(customerId) {
    return Array.from(this.store.values())
      .filter(o => o.customerId === customerId)
      .map(o => this.getSummary(o.orderId));
  }
}

// Uso
const commands = new OrderCommandHandler();
commands.createOrder("ORD-1", "CUST-1");
commands.addItem("ORD-1", "Laptop", 1, 999.99);
commands.confirm("ORD-1");

const queries = new OrderQueryHandler(commands.orders);
console.log(queries.getSummary("ORD-1"));
```

### Java

```java
import java.util.*;

// Modelo de Escritura
class Order {
    String orderId;
    String customerId;
    List<Map<String, Object>> items = new ArrayList<>();
    String status = "pending";
    String createdAt = new Date().toString();
}

class OrderCommandHandler {
    private final Map<String, Order> orders = new HashMap<>();

    public void createOrder(String orderId, String customerId) {
        Order o = new Order();
        o.orderId = orderId;
        o.customerId = customerId;
        orders.put(orderId, o);
    }

    public void addItem(String orderId, String product, int qty, double price) {
        Map<String, Object> item = new HashMap<>();
        item.put("product", product);
        item.put("qty", qty);
        item.put("price", price);
        orders.get(orderId).items.add(item);
    }

    public void confirm(String orderId) {
        orders.get(orderId).status = "confirmed";
    }

    public Map<String, Order> getStore() { return orders; }
}

// Modelo de Lectura
class OrderSummary {
    public String orderId;
    public String customerId;
    public double total;
    public int itemCount;
    public String status;
}

class OrderQueryHandler {
    private final Map<String, Order> store;

    public OrderQueryHandler(Map<String, Order> store) {
        this.store = store;
    }

    public OrderSummary getSummary(String orderId) {
        Order o = store.get(orderId);
        OrderSummary s = new OrderSummary();
        s.orderId = o.orderId;
        s.customerId = o.customerId;
        s.total = o.items.stream().mapToDouble(i ->
            (int)i.get("qty") * (double)i.get("price")).sum();
        s.itemCount = o.items.size();
        s.status = o.status;
        return s;
    }
}

// Uso
OrderCommandHandler commands = new OrderCommandHandler();
commands.createOrder("ORD-1", "CUST-1");
commands.addItem("ORD-1", "Laptop", 1, 999.99);
commands.confirm("ORD-1");

OrderQueryHandler queries = new OrderQueryHandler(commands.getStore());
System.out.println(queries.getSummary("ORD-1").total);
```

## Explicación

CQRS separa dos preocupaciones:

- **Modelo de Comandos**: Optimizado para escrituras — valida reglas de negocio, mantiene invariantes, procesa cambios de estado
- **Modelo de Consultas**: Optimizado para lecturas — desnormalizado, indexado, a menudo leído de una base de datos separada (ej. Elasticsearch para búsqueda, Redis para búsquedas rápidas)

Los dos modelos se sincronizan ya sea sincrónicamente (misma transacción) o asíncronamente (proyecciones impulsadas por eventos).

## Variantes

| Variante | Descripción | Caso de uso |
|----------|-------------|-------------|
| **Base de Datos Única** | Modelos separados, misma base de datos | CQRS simple; menor complejidad |
| **Doble Base de Datos** | Escritura a SQL, lectura de NoSQL/búsqueda | Consultas complejas; alta escala de lectura |
| **[Event Sourcing](/patterns/design/event-sourcing-pattern) + CQRS** | Los eventos son la fuente de verdad; los modelos de lectura son proyecciones | Trails de auditoría; consultas temporales |
| **Segregación de API** | Endpoints REST/GraphQL separados para comandos y consultas | Microservicios; límites de equipo |

## Mejores prácticas

- **Empieza simple** — separa modelos dentro de la misma base de datos antes de introducir almacenamiento dual
- **Usa consistencia eventual** para modelos de lectura cuando las proyecciones asíncronas sean aceptables
- **Versiona tus modelos de lectura** cuando cambie el esquema de consulta
- **Monitorea el lag de proyección** — asegura que los modelos de lectura no se queden demasiado atrás de las escrituras
- **Mantén los comandos pequeños y enfocados** — un comando debería hacer una sola cosa

## Errores comunes

- Aplicar CQRS a aplicaciones CRUD simples donde un único modelo es suficiente
- Permitir que el modelo de lectura evada reglas de negocio (la validación pertenece a los comandos)
- Ignorar problemas de consistencia eventual en CQRS asíncrono
- Sobre-ingeniería con bases de datos separadas antes de probar la necesidad
- No manejar reconstrucciones de modelos de lectura cuando cambia la lógica de proyección

## Preguntas frecuentes

**P: ¿CQRS requiere Event Sourcing?**
R: No. CQRS puede usarse con cualquier modelo de persistencia. [Event Sourcing](/patterns/design/event-sourcing-pattern) a menudo se empareja con CQRS porque los eventos hacen datos de origen naturales para proyecciones de modelos de lectura, pero son patrones independientes.

**P: ¿Cómo mantengo los modelos de lectura y escritura sincronizados?**
R: En CQRS síncrono, actualiza ambos en la misma transacción. En CQRS asíncrono, publica eventos después de escrituras y haz que los consumidores reconstruyan el modelo de lectura. Acepta la consistencia eventual.

**P: ¿Cuándo debería evitar CQRS?**
R: Evita CQRS para aplicaciones CRUD simples, equipos pequeños, o cuando las proporciones de lectura/escritura estén balanceadas. Consulta [arquitectura de microservicios](/guides/architecture/microservices-architecture-guide) para patrones de sistemas distribuidos que suelen beneficiarse de CQRS. La complejidad agregada solo se justifica cuando los dos lados tienen necesidades fundamentalmente diferentes de escalado o modelado.
