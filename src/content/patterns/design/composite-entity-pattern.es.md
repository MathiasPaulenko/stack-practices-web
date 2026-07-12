---



contentType: patterns
slug: composite-entity-pattern
title: "Patrón Composite Entity"
description: "Mapea una entidad coarse-grained a múltiples tablas de base de datos componiendo objetos dependientes, reduciendo la cantidad de llamadas remotas fine-grained en EJB y sistemas distribuidos."
metaDescription: "Aprende el Patrón Composite Entity para persistencia coarse-grained. Ejemplos en Python, Java y JavaScript con objetos dependientes compuestos y mapeo de tablas."
difficulty: intermediate
topics:
  - design
  - databases
tags:
  - composite-entity
  - pattern
  - design-pattern
  - structural
  - databases
  - persistence
  - orm
relatedResources:
  - /patterns/data-mapper-pattern
  - /patterns/active-record-pattern
  - /patterns/unit-of-work-pattern
  - /patterns/role-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Composite Entity para persistencia coarse-grained. Ejemplos en Python, Java y JavaScript con objetos dependientes compuestos y mapeo de tablas."
  keywords:
    - composite entity
    - design pattern
    - databases
    - persistence
    - orm



---

# Patrón Composite Entity

## Descripción General

El Patrón Composite Entity mapea un objeto de entidad coarse-grained a múltiples tablas fine-grained de base de datos componiendo objetos dependientes. En lugar de exponer objetos dependientes individuales a través de interfaces remotas separadas, la entidad composite los agrega en un único objeto que puede ser cargado, modificado y persistido en una operación.

Este patrón fue originalmente diseñado para entity beans EJB 2.x para reducir la cantidad de llamadas remotas fine-grained. En aplicaciones modernas, sigue siendo útil para mapeo ORM donde un aggregate root (como Order) contiene múltiples value objects dependientes (line items, shipping address, payment details) que no existen independientemente.

## Cuándo Usar


- For alternatives, see [Data Mapper Pattern](/es/patterns/data-mapper-pattern/).

Usa el Patrón Composite Entity cuando:
- Un aggregate root contiene múltiples objetos dependientes que deberían persistirse juntos
- Necesitas objetos coarse-grained para reducir overhead de llamadas remotas
- Objetos dependientes no tienen significado fuera de su entidad padre
- Quieres mantener integridad referencial a través de tablas relacionadas

## Cuándo Evitar

- Objetos dependientes son compartidos a través de múltiples entidades padre
- Operaciones CRUD independientes son necesarias en objetos hijo
- El graph de objetos está profundamente anidado y causa problemas de memoria/performance
- Límites de microservicio serían violados por aggregates coarse-grained

## Solución

### Python

```python
from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class LineItem:
    product_id: str
    quantity: int
    unit_price: float

    @property
    def total(self) -> float:
        return self.quantity * self.unit_price

@dataclass
class ShippingAddress:
    street: str
    city: str
    country: str
    postal_code: str

@dataclass
class PaymentDetails:
    method: str
    transaction_id: str
    amount: float

@dataclass
class Order:
    order_id: Optional[str] = None
    customer_id: str = ""
    line_items: List[LineItem] = field(default_factory=list)
    shipping_address: Optional[ShippingAddress] = None
    payment: Optional[PaymentDetails] = None

    @property
    def total(self) -> float:
        return sum(item.total for item in self.line_items)


class OrderMapper:
    """Composite entity mapper cargando desde múltiples tablas"""
    def __init__(self, conn):
        self._conn = conn

    def find_by_id(self, order_id: str) -> Optional[Order]:
        # Cargar orden padre
        row = self._conn.execute(
            "SELECT order_id, customer_id FROM orders WHERE order_id = ?",
            (order_id,)
        ).fetchone()
        if not row:
            return None

        order = Order(order_id=row["order_id"], customer_id=row["customer_id"])

        # Cargar line items dependientes
        for item_row in self._conn.execute(
            "SELECT product_id, quantity, unit_price FROM line_items WHERE order_id = ?",
            (order_id,)
        ):
            order.line_items.append(LineItem(
                product_id=item_row["product_id"],
                quantity=item_row["quantity"],
                unit_price=item_row["unit_price"]
            ))

        # Cargar shipping address
        addr_row = self._conn.execute(
            "SELECT street, city, country, postal_code FROM shipping_addresses WHERE order_id = ?",
            (order_id,)
        ).fetchone()
        if addr_row:
            order.shipping_address = ShippingAddress(
                street=addr_row["street"],
                city=addr_row["city"],
                country=addr_row["country"],
                postal_code=addr_row["postal_code"]
            )

        return order

    def save(self, order: Order):
        # Guardar padre
        self._conn.execute(
            "INSERT OR REPLACE INTO orders (order_id, customer_id) VALUES (?, ?)",
            (order.order_id, order.customer_id)
        )

        # Eliminar viejos line items, re-insertar
        self._conn.execute("DELETE FROM line_items WHERE order_id = ?", (order.order_id,))
        for item in order.line_items:
            self._conn.execute(
                "INSERT INTO line_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
                (order.order_id, item.product_id, item.quantity, item.unit_price)
            )

        # Guardar shipping address
        if order.shipping_address:
            self._conn.execute(
                """INSERT OR REPLACE INTO shipping_addresses
                   (order_id, street, city, country, postal_code)
                   VALUES (?, ?, ?, ?, ?)""",
                (order.order_id, order.shipping_address.street,
                 order.shipping_address.city, order.shipping_address.country,
                 order.shipping_address.postal_code)
            )

        self._conn.commit()


# Uso
import sqlite3
conn = sqlite3.connect(":memory:")
conn.row_factory = sqlite3.Row
conn.execute("CREATE TABLE orders (order_id TEXT PRIMARY KEY, customer_id TEXT)")
conn.execute("""CREATE TABLE line_items (
    order_id TEXT, product_id TEXT, quantity INTEGER, unit_price REAL
)""")
conn.execute("""CREATE TABLE shipping_addresses (
    order_id TEXT PRIMARY KEY, street TEXT, city TEXT, country TEXT, postal_code TEXT
)""")

mapper = OrderMapper(conn)
order = Order(
    order_id="ORD-001",
    customer_id="CUST-001",
    line_items=[
        LineItem("PROD-1", 2, 29.99),
        LineItem("PROD-2", 1, 49.99),
    ],
    shipping_address=ShippingAddress("123 Main St", "Springfield", "USA", "62701")
)

mapper.save(order)
loaded = mapper.find_by_id("ORD-001")
print(f"Order total: ${loaded.total:.2f}")
```

### Java

```java
import java.sql.*;
import java.util.*;

public class LineItem {
    private final String productId;
    private final int quantity;
    private final double unitPrice;

    public LineItem(String productId, int quantity, double unitPrice) {
        this.productId = productId; this.quantity = quantity; this.unitPrice = unitPrice;
    }
    public double getTotal() { return quantity * unitPrice; }
    public String getProductId() { return productId; }
    public int getQuantity() { return quantity; }
    public double getUnitPrice() { return unitPrice; }
}

public class ShippingAddress {
    private final String street, city, country, postalCode;
    public ShippingAddress(String street, String city, String country, String postalCode) {
        this.street = street; this.city = city; this.country = country; this.postalCode = postalCode;
    }
    public String getStreet() { return street; }
    public String getCity() { return city; }
    public String getCountry() { return country; }
    public String getPostalCode() { return postalCode; }
}

public class Order {
    private final String orderId;
    private final String customerId;
    private final List<LineItem> lineItems = new ArrayList<>();
    private ShippingAddress shippingAddress;

    public Order(String orderId, String customerId) {
        this.orderId = orderId; this.customerId = customerId;
    }
    public String getOrderId() { return orderId; }
    public String getCustomerId() { return customerId; }
    public List<LineItem> getLineItems() { return lineItems; }
    public ShippingAddress getShippingAddress() { return shippingAddress; }
    public void setShippingAddress(ShippingAddress addr) { this.shippingAddress = addr; }
    public double getTotal() { return lineItems.stream().mapToDouble(LineItem::getTotal).sum(); }
}

class OrderMapper {
    private final Connection conn;
    public OrderMapper(Connection conn) { this.conn = conn; }

    public Order findById(String orderId) throws SQLException {
        try (PreparedStatement stmt = conn.prepareStatement(
                "SELECT customer_id FROM orders WHERE order_id = ?")) {
            stmt.setString(1, orderId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (!rs.next()) return null;
                Order order = new Order(orderId, rs.getString("customer_id"));

                // Cargar line items
                try (PreparedStatement itemStmt = conn.prepareStatement(
                        "SELECT product_id, quantity, unit_price FROM line_items WHERE order_id = ?")) {
                    itemStmt.setString(1, orderId);
                    try (ResultSet items = itemStmt.executeQuery()) {
                        while (items.next()) {
                            order.getLineItems().add(new LineItem(
                                items.getString("product_id"),
                                items.getInt("quantity"),
                                items.getDouble("unit_price")
                            ));
                        }
                    }
                }

                // Cargar shipping
                try (PreparedStatement addrStmt = conn.prepareStatement(
                        "SELECT street, city, country, postal_code FROM shipping_addresses WHERE order_id = ?")) {
                    addrStmt.setString(1, orderId);
                    try (ResultSet addr = addrStmt.executeQuery()) {
                        if (addr.next()) {
                            order.setShippingAddress(new ShippingAddress(
                                addr.getString("street"), addr.getString("city"),
                                addr.getString("country"), addr.getString("postal_code")
                            ));
                        }
                    }
                }
                return order;
            }
        }
    }
}

// Uso
Connection conn = DriverManager.getConnection("jdbc:sqlite::memory:");
conn.createStatement().execute("CREATE TABLE orders (order_id TEXT PRIMARY KEY, customer_id TEXT)");
conn.createStatement().execute("CREATE TABLE line_items (order_id TEXT, product_id TEXT, quantity INTEGER, unit_price REAL)");
conn.createStatement().execute("CREATE TABLE shipping_addresses (order_id TEXT PRIMARY KEY, street TEXT, city TEXT, country TEXT, postal_code TEXT)");

OrderMapper mapper = new OrderMapper(conn);
// Guardar y cargar orden...
```

### JavaScript

```javascript
class LineItem {
  constructor(productId, quantity, unitPrice) {
    this.productId = productId;
    this.quantity = quantity;
    this.unitPrice = unitPrice;
  }

  get total() {
    return this.quantity * this.unitPrice;
  }
}

class ShippingAddress {
  constructor(street, city, country, postalCode) {
    this.street = street;
    this.city = city;
    this.country = country;
    this.postalCode = postalCode;
  }
}

class Order {
  constructor(orderId, customerId) {
    this.orderId = orderId;
    this.customerId = customerId;
    this.lineItems = [];
    this.shippingAddress = null;
  }

  get total() {
    return this.lineItems.reduce((sum, item) => sum + item.total, 0);
  }
}

class OrderMapper {
  constructor(db) {
    this.db = db;
  }

  async findById(orderId) {
    const row = await this.db.get('SELECT customer_id FROM orders WHERE order_id = ?', orderId);
    if (!row) return null;

    const order = new Order(orderId, row.customer_id);

    const items = await this.db.all('SELECT product_id, quantity, unit_price FROM line_items WHERE order_id = ?', orderId);
    for (const item of items) {
      order.lineItems.push(new LineItem(item.product_id, item.quantity, item.unit_price));
    }

    const addr = await this.db.get('SELECT street, city, country, postal_code FROM shipping_addresses WHERE order_id = ?', orderId);
    if (addr) {
      order.shippingAddress = new ShippingAddress(addr.street, addr.city, addr.country, addr.postal_code);
    }

    return order;
  }
}

// Uso
// const mapper = new OrderMapper(db);
// const order = await mapper.findById('ORD-001');
// console.log(order.total);
```

## Explicación

El Patrón Composite Entity trata un grupo de objetos relacionados como una única unidad de persistencia:

- **Composite Entity (Order)**: El aggregate root que contiene objetos dependientes
- **Dependent Objects (LineItem, ShippingAddress)**: Objetos que solo existen dentro del padre
- **Mapper**: Coordina carga y guardado a través de múltiples tablas

La insight clave es que los objetos dependientes no tienen identidad standalone. Son parte del composite y se persisten, cargan, y eliminan como una unidad.

## Variantes

| Variante | Estrategia de Mapping | Caso de Uso |
|----------|----------------------|-------------|
| **Table per class** | Cada dependiente tiene su propia tabla | Queries complejos sobre datos hijo |
| **Single table** | Todos los datos en una tabla denormalizada | Reads simples, no joins necesarios |
| **JSON column** | Dependientes almacenados como JSON | Schema flexible, bases de datos document |
| **Embedded value** | Aplanado en columnas del padre | Value objects simples |

## Lo que funciona

- **Haz objetos dependientes inmutables.** Los cambios deberían ir a través del aggregate root.
- **Enfuerza invariantes a nivel de aggregate.** La entidad composite valida el todo.
- **Usa persistencia cascading.** Guardar el padre guarda todos los hijos automáticamente.
- **Evita anidamiento profundo.** Más de 2-3 niveles de composición se vuelve difícil de manejar.
- **Considera columnas JSON para flexibilidad.** Las bases de datos modernas soportan tipos de datos estructurados.

## Errores Comunes

- **Exponer objetos dependientes directamente.** Los clientes deberían interactuar con el aggregate root.
- **Permitir persistencia standalone de dependientes.** Esto rompe el boundary del composite.
- **Cargar todo el graph para queries simples.** Usa proyecciones para escenarios de solo lectura.
- **Compartir objetos dependientes entre padres.** Cada composite debería poseer sus hijos.
- **Ignorar eliminación de huérfanos.** Los dependientes removidos deberían ser eliminados de la base de datos.

## Ejemplos del Mundo Real

### JPA @Embeddable

La anotación `@Embeddable` de JPA marca objetos dependientes que se almacenan dentro de la tabla de su padre. `@Embedded` los compone en la entidad.

### DDD Aggregate Roots

Domain-Driven Design usa Aggregate Roots (como Order) que encapsulan entidades y value objects con boundaries de consistencia transaccional.

### MongoDB Embedded Documents

MongoDB soporta naturalmente composite entities mediante el embedding de documentos relacionados, haciéndolo adecuado para dominios aggregate-heavy.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Composite Entity y Composite Pattern?**
A: Composite Pattern (GoF) es sobre estructuras de árbol donde nodos hoja y composite comparten la misma interfaz. Composite Entity es sobre mapeo de persistencia de objetos aggregate.

**Q: Pueden los objetos dependientes tener sus propios IDs?**
A: Sí, pero no deberían ser globalmente únicos. Su identidad es local al padre (ej: número de line item dentro de una orden).

**Q: Siempre debería cascade deletes?**
A: Sí, para verdaderos objetos dependientes. Si un hijo podría sobrevivir al padre, no es un dependiente y debería modelarse como entidad independiente.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
