---
contentType: patterns
slug: database-per-service-pattern
title: "Patrón Database per Service"
description: "Asigna a cada microservicio su propia base de datos privada para asegurar loose coupling, deployment independiente y heterogeneidad tecnológica a través del portafolio de aplicaciones."
metaDescription: "Aprende el Patrón Database per Service para aislamiento de datos en microservicios. Ejemplos en Python, Java y JavaScript con schemas por servicio y sync de eventos."
difficulty: intermediate
topics:
  - design
  - architecture
  - databases
tags:
  - database-per-service
  - pattern
  - design-pattern
  - microservices
  - databases
  - isolation
  - data-ownership
relatedResources:
  - /patterns/design/saga-pattern
  - /patterns/design/event-sourcing-pattern
  - /patterns/design/cqrs-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Database per Service para aislamiento de datos en microservicios. Ejemplos en Python, Java y JavaScript con schemas por servicio y sync de eventos."
  keywords:
    - database per service
    - microservices
    - data isolation
    - design pattern
    - saga
    - event sourcing
---

# Patrón Database per Service

## Descripción General

El Patrón Database per Service asigna a cada microservicio su propia base de datos privada a la que ningún otro servicio puede acceder directamente. Esto asegura que los servicios estén débilmente acoplados, puedan desplegarse independientemente, y puedan elegir la tecnología de base de datos más adecuada a sus necesidades. Los datos de un servicio solo son accedidos a través de su API, creando un boundary claro y fuente única de verdad para ese dominio.

En un monolito, múltiples módulos comparten una única base de datos, creando acoplamiento fuerte: los cambios de schema requieren coordinación entre equipos, una query pesada de un módulo afecta a otros, y escalar requiere escalar toda la base de datos. Con Database per Service, cada equipo posee su schema, puede optimizar independientemente, y despliega sin temor de romper otros servicios.

El tradeoff es complejidad: consultar a través de servicios requiere composición de APIs o sincronización basada en eventos, y las transacciones que abarcan múltiples bases de datos necesitan patrones como Saga.

## Cuándo Usar

Usa el Patrón Database per Service cuando:
- Construyendo microservicios donde los equipos necesitan velocidad de deployment independiente
- Diferentes servicios tienen patrones de acceso a datos fundamentalmente diferentes (OLTP vs analytics)
- Los servicios necesitan diferentes tecnologías de base de datos (graph, document, relational)
- Quieres prevenir acoplamiento accidental a través de schemas de base de datos compartidos

## Cuándo Evitar

- La aplicación es un monolito o lo suficientemente pequeña como para que una única base de datos baste
- El overhead de manejar múltiples bases de datos excede el beneficio de independencia
- Las consultas cross-service complejas son frecuentes y la composición de APIs es demasiado lenta
- Se requiere consistencia fuerte entre servicios y la consistencia eventual es inaceptable

## Solución

### Python (Bases de Datos por Servicio con Sync de Eventos)

```python
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional
import sqlite3
import json

# ============================================================================
# BASE DE DATOS DEL SERVICIO DE ÓRDENES
# ============================================================================

class OrderDatabase:
    """Base de datos privada para el Order Service"""
    def __init__(self, db_path: str = "order_service.db"):
        self.conn = sqlite3.connect(db_path)
        self._init_schema()

    def _init_schema(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                order_id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                total_amount REAL NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS order_events (
                event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                payload TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.conn.commit()

    def create_order(self, order_id: str, customer_id: str, total: float) -> dict:
        self.conn.execute(
            "INSERT INTO orders (order_id, customer_id, total_amount) VALUES (?, ?, ?)",
            (order_id, customer_id, total)
        )
        self._emit_event("ORDER_CREATED", {
            "order_id": order_id,
            "customer_id": customer_id,
            "total": total
        })
        self.conn.commit()
        return {"order_id": order_id, "status": "pending"}

    def _emit_event(self, event_type: str, payload: dict):
        """Publica evento a outbox local para consumidores downstream"""
        self.conn.execute(
            "INSERT INTO order_events (order_id, event_type, payload) VALUES (?, ?, ?)",
            (payload["order_id"], event_type, json.dumps(payload))
        )

    def get_order(self, order_id: str) -> Optional[dict]:
        cursor = self.conn.execute(
            "SELECT * FROM orders WHERE order_id = ?", (order_id,)
        )
        row = cursor.fetchone()
        if row:
            return {
                "order_id": row[0], "customer_id": row[1],
                "total_amount": row[2], "status": row[3]
            }
        return None


# ============================================================================
# BASE DE DATOS DEL SERVICIO DE CLIENTES
# ============================================================================

class CustomerDatabase:
    """Base de datos privada para el Customer Service"""
    def __init__(self, db_path: str = "customer_service.db"):
        self.conn = sqlite3.connect(db_path)
        self._init_schema()

    def _init_schema(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                customer_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                loyalty_points INTEGER DEFAULT 0
            )
        """)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS customer_events (
                event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                payload TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.conn.commit()

    def create_customer(self, customer_id: str, name: str, email: str):
        self.conn.execute(
            "INSERT INTO customers (customer_id, name, email) VALUES (?, ?, ?)",
            (customer_id, name, email)
        )
        self.conn.commit()

    def add_loyalty_points(self, customer_id: str, points: int):
        self.conn.execute(
            "UPDATE customers SET loyalty_points = loyalty_points + ? WHERE customer_id = ?",
            (points, customer_id)
        )
        self.conn.commit()

    def get_customer(self, customer_id: str) -> Optional[dict]:
        cursor = self.conn.execute(
            "SELECT * FROM customers WHERE customer_id = ?", (customer_id,)
        )
        row = cursor.fetchone()
        if row:
            return {"customer_id": row[0], "name": row[1], "email": row[2], "loyalty_points": row[3]}
        return None


# ============================================================================
# EVENT BUS (simulando broker de mensajes para sync cross-service)
# ============================================================================

class EventBus:
    """Bus de eventos simplificado para comunicación inter-servicio"""
    def __init__(self):
        self.subscribers = {}

    def subscribe(self, event_type: str, handler):
        self.subscribers.setdefault(event_type, []).append(handler)

    def publish(self, event_type: str, payload: dict):
        for handler in self.subscribers.get(event_type, []):
            handler(payload)


# ============================================================================
# CAPA DE SERVICIO
# ============================================================================

class OrderService:
    """Encapsula lógica de negocio de órdenes y base de datos privada"""
    def __init__(self, database: OrderDatabase, event_bus: EventBus):
        self.db = database
        self.events = event_bus

    def place_order(self, order_id: str, customer_id: str, items: List[dict]) -> dict:
        total = sum(item["price"] * item["quantity"] for item in items)
        result = self.db.create_order(order_id, customer_id, total)
        return result

    def get_order(self, order_id: str) -> Optional[dict]:
        return self.db.get_order(order_id)


class CustomerService:
    """Encapsula lógica de negocio de clientes y base de datos privada"""
    def __init__(self, database: CustomerDatabase, event_bus: EventBus):
        self.db = database
        self.events = event_bus
        self._subscribe_to_events()

    def _subscribe_to_events(self):
        self.events.subscribe("ORDER_CREATED", self._on_order_created)

    def _on_order_created(self, payload: dict):
        """Reacciona a órdenes actualizando puntos de lealtad"""
        points = int(payload["total"] * 0.1)  # 10% del valor de orden
        self.db.add_loyalty_points(payload["customer_id"], points)
        print(f"Agregados {points} puntos de lealtad a cliente {payload['customer_id']}")

    def register_customer(self, customer_id: str, name: str, email: str):
        self.db.create_customer(customer_id, name, email)

    def get_customer(self, customer_id: str) -> Optional[dict]:
        return self.db.get_customer(customer_id)


# ============================================================================
# USO: Los servicios se comunican via eventos, no base de datos compartida
# ============================================================================

bus = EventBus()
order_service = OrderService(OrderDatabase(), bus)
customer_service = CustomerService(CustomerDatabase(), bus)

# Registrar un cliente
customer_service.register_customer("C-001", "Alice Johnson", "alice@example.com")

# Realizar una orden (dispara actualización de puntos via evento)
order_service.place_order("ORD-001", "C-001", [
    {"sku": "A1", "price": 50.0, "quantity": 2}
])

# Verificar datos en bases de datos respectivas
print("Orden:", order_service.get_order("ORD-001"))
print("Cliente:", customer_service.get_customer("C-001"))
```

### Java (Spring Boot con DataSources Separados)

```java
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.JpaRepository;
import javax.persistence.*;
import javax.sql.DataSource;

// Configuración de base de datos del Order Service
@Configuration
public class OrderDatabaseConfig {
    @Bean
    @ConfigurationProperties("app.datasource.order")
    public DataSourceProperties orderDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    public DataSource orderDataSource() {
        return orderDataSourceProperties()
            .initializeDataSourceBuilder()
            .build();
    }
}

// Entidad Order (en base de datos del Order Service)
@Entity
@Table(name = "orders")
class Order {
    @Id
    private String orderId;
    private String customerId;
    private double totalAmount;
    private String status = "pending";

    // getters, setters
}

interface OrderRepository extends JpaRepository<Order, String> {}

// Customer Service (servicio separado, base de datos separada)
@Entity
@Table(name = "customers")
class Customer {
    @Id
    private String customerId;
    private String name;
    private String email;
    private int loyaltyPoints = 0;

    public void addLoyaltyPoints(int points) {
        this.loyaltyPoints += points;
    }

    // getters, setters
}

interface CustomerRepository extends JpaRepository<Customer, String> {}

// Sincronización via eventos
record OrderCreatedEvent(String orderId, String customerId, double total) {}

@Service
class CustomerEventHandler {
    private final CustomerRepository customerRepo;

    public CustomerEventHandler(CustomerRepository customerRepo) {
        this.customerRepo = customerRepo;
    }

    @EventListener
    @Transactional
    public void onOrderCreated(OrderCreatedEvent event) {
        Customer customer = customerRepo.findById(event.customerId())
            .orElseThrow();
        int points = (int) (event.total() * 0.1);
        customer.addLoyaltyPoints(points);
        customerRepo.save(customer);
    }
}
```

### JavaScript (Node.js con Colecciones MongoDB Separadas)

```javascript
const { MongoClient } = require('mongodb');

class DatabasePerService {
  constructor(uri) {
    this.client = new MongoClient(uri);
  }

  async connect() {
    await this.client.connect();
    // Cada servicio obtiene su propia base de datos
    this.orderDb = this.client.db('order_service');
    this.customerDb = this.client.db('customer_service');
    this.inventoryDb = this.client.db('inventory_service');
  }

  // Métodos del Order Service
  async createOrder(orderId, customerId, items) {
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const orders = this.orderDb.collection('orders');
    await orders.insertOne({
      orderId, customerId, total, status: 'pending',
      createdAt: new Date()
    });
    return { orderId, status: 'pending' };
  }

  async getOrder(orderId) {
    return this.orderDb.collection('orders').findOne({ orderId });
  }

  // Métodos del Customer Service
  async createCustomer(customerId, name, email) {
    await this.customerDb.collection('customers').insertOne({
      customerId, name, email, loyaltyPoints: 0
    });
  }

  async addLoyaltyPoints(customerId, points) {
    await this.customerDb.collection('customers').updateOne(
      { customerId },
      { $inc: { loyaltyPoints: points } }
    );
  }

  // Métodos del Inventory Service
  async reserveInventory(orderId, sku, qty) {
    const inventory = this.inventoryDb.collection('inventory');
    const result = await inventory.updateOne(
      { sku, available: { $gte: qty } },
      { $inc: { available: -qty, reserved: qty } }
    );
    return result.modifiedCount > 0;
  }
}

// Bus de eventos para comunicación cross-service
class EventBus {
  constructor() {
    this.handlers = new Map();
  }

  on(event, handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event).push(handler);
  }

  emit(event, payload) {
    (this.handlers.get(event) || []).forEach(h => h(payload));
  }
}

// Uso
async function demo() {
  const db = new DatabasePerService('mongodb://localhost:27017');
  await db.connect();

  const bus = new EventBus();

  // Suscribir customer service a eventos de orden
  bus.on('ORDER_CREATED', async (payload) => {
    const points = Math.floor(payload.total * 0.1);
    await db.addLoyaltyPoints(payload.customerId, points);
    console.log(`Agregados ${points} puntos a ${payload.customerId}`);
  });

  // Crear cliente
  await db.createCustomer('C-001', 'Alice', 'alice@example.com');

  // Crear orden + emitir evento
  const order = await db.createOrder('ORD-001', 'C-001', [
    { sku: 'A1', price: 50, qty: 2 }
  ]);
  bus.emit('ORDER_CREATED', { orderId: 'ORD-001', customerId: 'C-001', total: 100 });

  console.log('Orden:', await db.getOrder('ORD-001'));
}

demo().catch(console.error);
```

## Explicación

Database per Service impone boundaries a través de aislamiento físico:

1. **Schema privado**: Cada servicio posee sus tablas/colecciones y puede cambiarlas independientemente
2. **Acceso solo via API**: Otros servicios interactúan a través de HTTP/gRPC/Eventos, no queries SQL
3. **Elección de tecnología**: Un servicio usa PostgreSQL, otro MongoDB, otro Redis — lo que mejor se ajuste
4. **Sincronización por eventos**: Datos que necesitan ser compartidos se publican como eventos que otros servicios consumen en sus propias bases de datos

## Variantes

| Variante | Nivel de Aislamiento | Caso de Uso |
|----------|---------------------|-------------|
| **Servidores de base de datos separados** | Aislamiento físico completo | Máxima independencia, diferentes tecnologías |
| **Schemas separados** | Aislamiento lógico dentro de un servidor | Misma tecnología, overhead operacional reducido |
| **Colecciones/tablas separadas** | Aislamiento mínimo | Fase de migración desde monolito |
| **Schema por tenant + servicio** | Microservicios multi-tenant | Aplicaciones SaaS con datos por tenant |

## Mejores Prácticas

- **Nunca expongas tu base de datos directamente.** Accede a otros servicios siempre a través de sus APIs o eventos.
- **Usa un outbox pattern para eventos.** Publica eventos atómicamente con transacciones de base de datos.
- **Abraza la consistencia eventual.** Los datos cross-service estarán temporalmente inconsistentes; diseña para ello.
- **Implementa sagas para transacciones multi-servicio.** Las transacciones compensatorias manejan fallas entre servicios.
- **Mantén las bases de datos de servicio pequeñas.** Si la base de datos de un servicio crece demasiado, considera dividir el servicio.

## Errores Comunes

- **Acceso directo a base de datos entre servicios.** Esto crea el mismo acoplamiento que el patrón está diseñado para prevenir.
- **Compartir una base de datos "temporalmente."** Las bases de datos compartidas temporalmente se vuelven permanentes y derrotan el propósito.
- **No manejar consistencia eventual.** Los usuarios ven datos obsoletos porque la UI asume consistencia inmediata.
- **APIs excesivamente chatty.** Hacer 10 llamadas API para componer una página es señal de boundaries de servicio deficientes.
- **Ignorar duplicación de datos.** Alguna duplicación de datos entre servicios es normal y necesaria.

## Ejemplos del Mundo Real

### Amazon

La arquitectura de Amazon usa database per service. El servicio de órdenes, el servicio de clientes y el servicio de inventario cada uno tienen sus propios data stores, sincronizados via eventos. Esto permite a cada equipo innovar independientemente.

### Netflix

Netflix usa Cassandra para algunos servicios, Elasticsearch para otros, y S3 para otros más. Cada equipo de servicio elige la tecnología que mejor se ajusta a sus patrones de acceso y necesidades de escalado.

### Uber

Uber migró de una base de datos Postgres monolítica a microservicios con bases de datos separadas. El servicio de viajes, el servicio de pagos y el servicio de conductores cada uno tienen data stores dedicados, con change data capture (CDC) transmitiendo eventos entre ellos.

## Preguntas Frecuentes

**Q: Cómo consulto a través de múltiples servicios?**
A: Usa composición de APIs (llama múltiples servicios y agrega) o construye un read model via consumo de eventos. CQRS y materialized views son soluciones comunes.

**Q: Qué pasa con reportes y analytics?**
A: Extrae datos de servicios a un data warehouse o lake via ETL/CDC. Los servicios publican eventos de cambio que son consumidos por pipelines de analytics.

**Q: Cada servicio necesita una tecnología de base de datos diferente?**
A: No. Muchas organizaciones estandarizan en una o dos tecnologías para reducir complejidad operacional. El patrón es sobre ownership, no heterogeneidad.

**Q: Cómo manejo relaciones de foreign key a través de servicios?**
A: No las uses. Los servicios referencian a otros servicios solo por ID, sin constraints a nivel de base de datos. La consistencia se aplica a nivel de aplicación via sagas o eventos.
