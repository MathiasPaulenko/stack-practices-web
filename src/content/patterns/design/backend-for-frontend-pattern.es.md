---
contentType: patterns
slug: backend-for-frontend-pattern
title: "Patrón Backend for Frontend (BFF)"
description: "Crea servicios backend dedicados adaptados a las necesidades específicas de cada tipo de frontend client, agregando APIs downstream y optimizando formas de datos por plataforma."
metaDescription: "Aprende el Patrón Backend for Frontend para agregación de APIs por cliente. Ejemplos en Python, Java y JavaScript con GraphQL, optimización mobile y tailoring web."
difficulty: intermediate
topics:
  - design
  - architecture
  - api
tags:
  - backend-for-frontend
  - pattern
  - design-pattern
  - architecture
  - api
  - mobile
  - web
  - graphql
relatedResources:
  - /patterns/design/api-gateway-pattern
  - /patterns/design/aggregator-pattern
  - /patterns/design/facade-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Backend for Frontend para agregación de APIs por cliente. Ejemplos en Python, Java y JavaScript con GraphQL, optimización mobile y tailoring web."
  keywords:
    - backend for frontend
    - design pattern
    - api
    - mobile
    - web
    - graphql
    - bff
---

# Patrón Backend for Frontend (BFF)

## Descripción General

El Patrón Backend for Frontend (BFF) crea servicios backend dedicados adaptados a las necesidades específicas de cada tipo de frontend client (web, mobile, IoT, desktop). En lugar de forzar a todos los clientes a consumir una única API de propósito general, cada frontend obtiene un backend que agrega microservicios downstream, optimiza formas de datos, maneja preocupaciones de autenticación, y expone una API perfectamente alineada con los requerimientos de ese cliente.

Una app mobile puede necesitar respuestas ligeras y agregadas para minimizar uso de batería y ancho de banda. Un dashboard web puede necesitar datos profundamente anidados con actualizaciones en tiempo real. Un dispositivo IoT puede necesitar payloads binarios mínimos. Una única API no puede servir óptimamente a los tres.

El BFF se sienta entre el cliente y los microservicios core, actuando como agregador, transformador, y capa de caching específico para un tipo de cliente.

## Cuándo Usar

Usa el Patrón BFF cuando:
- Diferentes clientes frontend tienen requerimientos de datos incompatibles
- Clientes mobile necesitan payload reducido y menos round-trips de red
- Clientes web necesitan server-side rendering o datos optimizados para SEO
- Integraciones de terceros necesitan una superficie de API sanitizada y limitada
- Quieres iterar sobre APIs de frontend sin afectar otros clientes

## Cuándo Evitar

- Tienes solo un tipo de cliente frontend (una única API gateway basta)
- El overhead de mantener múltiples servicios BFF excede el beneficio
- Las necesidades de frontend son casi idénticas a través de plataformas
- El BFF se convierte en una capa gruesa conteniendo lógica de negocio que pertenece al dominio

## Solución

### Python

```python
from dataclasses import dataclass
from typing import List, Dict, Optional
import json

# ============================================================================
# CORE MICROSERVICES (servicios backend compartidos)
# ============================================================================

class UserService:
    def get_user(self, user_id: str) -> dict:
        return {
            "id": user_id,
            "name": "Alice Johnson",
            "email": "alice@example.com",
            "address": {"street": "123 Main St", "city": "NYC", "zip": "10001"},
            "preferences": {"theme": "dark", "notifications": True},
            "created_at": "2022-01-15T00:00:00Z"
        }

class OrderService:
    def get_orders(self, user_id: str) -> List[dict]:
        return [
            {"id": "ORD-001", "user_id": user_id, "total": 99.99,
             "items": [{"sku": "A1", "name": "Widget", "price": 99.99}],
             "status": "delivered", "created_at": "2024-03-01"},
            {"id": "ORD-002", "user_id": user_id, "total": 45.00,
             "items": [{"sku": "B2", "name": "Gadget", "price": 45.00}],
             "status": "shipped", "created_at": "2024-03-10"}
        ]

class InventoryService:
    def get_stock(self, sku: str) -> dict:
        return {"sku": sku, "quantity": 150, "warehouse": "US-East"}

# ============================================================================
# BFF PARA CLIENTE MOBILE
# ============================================================================

@dataclass
class MobileOrderSummary:
    order_id: str
    total: float
    item_count: int
    status: str

@dataclass
class MobileUserProfile:
    name: str
    recent_orders: List[MobileOrderSummary]
    unread_notifications: int

class MobileBFF:
    """BFF optimizado para mobile: ligero, agregado, mínimos campos"""
    def __init__(self, user_service: UserService, order_service: OrderService):
        self.users = user_service
        self.orders = order_service

    def get_profile(self, user_id: str) -> MobileUserProfile:
        user = self.users.get_user(user_id)
        orders = self.orders.get_orders(user_id)

        recent_orders = [
            MobileOrderSummary(
                order_id=o["id"],
                total=o["total"],
                item_count=len(o["items"]),
                status=o["status"]
            )
            for o in orders[:3]  # Solo últimas 3 órdenes para mobile
        ]

        return MobileUserProfile(
            name=user["name"],
            recent_orders=recent_orders,
            unread_notifications=2  # Agregado desde notification service
        )

# ============================================================================
# BFF PARA CLIENTE WEB
# ============================================================================

class WebBFF:
    """BFF optimizado para web: datos ricos, relaciones anidadas, historial completo"""
    def __init__(self, user_service: UserService, order_service: OrderService,
                 inventory_service: InventoryService):
        self.users = user_service
        self.orders = order_service
        self.inventory = inventory_service

    def get_profile(self, user_id: str) -> dict:
        user = self.users.get_user(user_id)
        orders = self.orders.get_orders(user_id)

        # Enriquecer órdenes con datos de inventario
        enriched_orders = []
        for order in orders:
            enriched_items = []
            for item in order["items"]:
                stock = self.inventory.get_stock(item["sku"])
                enriched_items.append({
                    **item,
                    "in_stock": stock["quantity"] > 0,
                    "warehouse": stock["warehouse"]
                })
            enriched_orders.append({**order, "items": enriched_items})

        return {
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "member_since": user["created_at"]
            },
            "orders": enriched_orders,
            "order_count": len(orders),
            "total_spent": sum(o["total"] for o in orders)
        }


# ============================================================================
# USO
# ============================================================================

users = UserService()
orders = OrderService()
inventory = InventoryService()

mobile_bff = MobileBFF(users, orders)
web_bff = WebBFF(users, orders, inventory)

mobile_profile = mobile_bff.get_profile("U-123")
print("MOBILE:", json.dumps(mobile_profile.__dict__, indent=2))

web_profile = web_bff.get_profile("U-123")
print("WEB:", json.dumps(web_profile, indent=2))
```

### Java

```java
import java.util.*;
import java.util.stream.*;

// Core services
class UserService {
    public Map<String, Object> getUser(String userId) {
        Map<String, Object> user = new HashMap<>();
        user.put("id", userId);
        user.put("name", "Alice Johnson");
        user.put("email", "alice@example.com");
        user.put("createdAt", "2022-01-15T00:00:00Z");
        return user;
    }
}

class OrderService {
    public List<Map<String, Object>> getOrders(String userId) {
        List<Map<String, Object>> orders = new ArrayList<>();
        Map<String, Object> o1 = new HashMap<>();
        o1.put("id", "ORD-001"); o1.put("total", 99.99); o1.put("status", "delivered");
        orders.add(o1);
        return orders;
    }
}

// Mobile BFF
class MobileBFF {
    private final UserService users;
    private final OrderService orders;

    public MobileBFF(UserService users, OrderService orders) {
        this.users = users; this.orders = orders;
    }

    public Map<String, Object> getProfile(String userId) {
        Map<String, Object> user = users.getUser(userId);
        List<Map<String, Object>> allOrders = orders.getOrders(userId);

        List<Map<String, Object>> recent = allOrders.stream()
            .limit(3)
            .map(o -> {
                Map<String, Object> m = new HashMap<>();
                m.put("orderId", o.get("id"));
                m.put("total", o.get("total"));
                m.put("status", o.get("status"));
                return m;
            })
            .collect(Collectors.toList());

        Map<String, Object> profile = new HashMap<>();
        profile.put("name", user.get("name"));
        profile.put("recentOrders", recent);
        return profile;
    }
}

// Web BFF
class WebBFF {
    private final UserService users;
    private final OrderService orders;

    public WebBFF(UserService users, OrderService orders) {
        this.users = users; this.orders = orders;
    }

    public Map<String, Object> getProfile(String userId) {
        Map<String, Object> user = users.getUser(userId);
        List<Map<String, Object>> allOrders = orders.getOrders(userId);

        Map<String, Object> profile = new HashMap<>();
        profile.put("user", user);
        profile.put("orders", allOrders);
        profile.put("orderCount", allOrders.size());
        double total = allOrders.stream()
            .mapToDouble(o -> ((Number) o.get("total")).doubleValue())
            .sum();
        profile.put("totalSpent", total);
        return profile;
    }
}

// Uso
UserService users = new UserService();
OrderService orders = new OrderService();
MobileBFF mobile = new MobileBFF(users, orders);
WebBFF web = new WebBFF(users, orders);
System.out.println(mobile.getProfile("U-123"));
System.out.println(web.getProfile("U-123"));
```

### JavaScript

```javascript
// Core microservices
class UserService {
  async getUser(userId) {
    return { id: userId, name: 'Alice Johnson', email: 'alice@example.com', createdAt: '2022-01-15' };
  }
}

class OrderService {
  async getOrders(userId) {
    return [
      { id: 'ORD-001', total: 99.99, status: 'delivered', items: [{ sku: 'A1', name: 'Widget' }] },
      { id: 'ORD-002', total: 45.00, status: 'shipped', items: [{ sku: 'B2', name: 'Gadget' }] }
    ];
  }
}

class InventoryService {
  async getStock(sku) {
    return { sku, quantity: 150, warehouse: 'US-East' };
  }
}

// Mobile BFF
class MobileBFF {
  constructor(userService, orderService) {
    this.users = userService;
    this.orders = orderService;
  }

  async getProfile(userId) {
    const [user, allOrders] = await Promise.all([
      this.users.getUser(userId),
      this.orders.getOrders(userId)
    ]);

    const recentOrders = allOrders.slice(0, 3).map(o => ({
      orderId: o.id,
      total: o.total,
      status: o.status,
      itemCount: o.items.length
    }));

    return {
      name: user.name,
      recentOrders,
      unreadNotifications: 2
    };
  }
}

// Web BFF
class WebBFF {
  constructor(userService, orderService, inventoryService) {
    this.users = userService;
    this.orders = orderService;
    this.inventory = inventoryService;
  }

  async getProfile(userId) {
    const [user, allOrders] = await Promise.all([
      this.users.getUser(userId),
      this.orders.getOrders(userId)
    ]);

    const enrichedOrders = await Promise.all(
      allOrders.map(async order => {
        const enrichedItems = await Promise.all(
          order.items.map(async item => {
            const stock = await this.inventory.getStock(item.sku);
            return { ...item, inStock: stock.quantity > 0, warehouse: stock.warehouse };
          })
        );
        return { ...order, items: enrichedItems };
      })
    );

    return {
      user,
      orders: enrichedOrders,
      orderCount: allOrders.length,
      totalSpent: allOrders.reduce((sum, o) => sum + o.total, 0)
    };
  }
}

// Uso
async function demo() {
  const users = new UserService();
  const orders = new OrderService();
  const inventory = new InventoryService();

  const mobile = new MobileBFF(users, orders);
  const web = new WebBFF(users, orders, inventory);

  console.log('Mobile:', await mobile.getProfile('U-123'));
  console.log('Web:', await web.getProfile('U-123'));
}

demo().catch(console.error);
```

## Explicación

El BFF es una **facade de API por tipo de cliente**:

1. **Agregación**: El BFF llama múltiples servicios downstream y ensambla una respuesta unificada
2. **Transformación**: Los datos se reconfiguran para coincidir con las necesidades del cliente (mobile obtiene resúmenes, web obtiene objetos completos)
3. **Optimización**: El tamaño de payload, caching, y selección de campos se ajustan por plataforma
4. **Aislamiento**: Los cambios en la UI web no afectan clientes mobile y vice versa

Cada BFF es propiedad del equipo responsable de ese frontend, permitiéndoles iterar independientemente.

## Variantes

| Variante | Tipo de Cliente | Especialización |
|----------|----------------|-----------------|
| **Mobile BFF** | iOS/Android | Payloads pequeños, resiliencia de conexión, soporte offline |
| **Web BFF** | Browser/SPA | SSR, SEO, data nesting profundo, features en tiempo real |
| **IoT BFF** | Dispositivos embebidos | Protocolos binarios, JSON mínimo, edge caching |
| **Partner BFF** | Integraciones de terceros | Rate limiting, datos restringidos, versionado de API |
| **GraphQL BFF** | Cualquiera | Schema stitching, agregación basada en resolvers |

## Mejores Prácticas

- **Mantén los BFFs thin.** Deberían agregar y transformar, no implementar lógica de negocio core.
- **Co-ubica el BFF con el equipo de frontend.** El equipo que posee el cliente debería poseer su BFF.
- **Usa GraphQL cuando los clientes necesitan queries flexibles.** Un único BFF GraphQL puede reemplazar múltiples BFFs REST.
- **Cache agresivamente en el BFF.** Reduce llamadas a servicios downstream con caching basado en TTL.
- **Comparte código via librerías.** Clientes HTTP comunes, middleware de auth, y logging deberían ser código de librería.

## Errores Comunes

- **Duplicar lógica de negocio.** El BFF no debería reimplementar reglas de validación o cálculo.
- **Over-fetching desde downstream.** Usa llamadas de servicio específicas, no "fetch todo y filtra."
- **Un BFF para todos los clientes.** Esto derrota el propósito y crea el mismo acoplamiento que una API general.
- **No manejar fallas gracefulmente.** Una falla de un solo servicio downstream no debería romper toda la respuesta del BFF.
- **Ignorar contexto de autenticación.** Los BFFs deberían propagar identidad de usuario y permisos a servicios downstream.

## Ejemplos del Mundo Real

### Netflix

Netflix usa BFFs por tipo de dispositivo (TV, mobile, web). Cada BFF agrega personalización, catálogo, y datos de playback en formas optimizadas para las constraints de UI y ancho de banda de ese dispositivo.

### Spotify

Los clientes mobile y desktop de Spotify consumen diferentes BFFs. El BFF mobile reduce agresivamente el tamaño de payload y pre-fetch de contenido probable, mientras que el BFF desktop provee metadata más rica y features sociales.

### SoundCloud

La API de SoundCloud migró de una única API a BFFs para web, mobile, y players embebidos. Esto permitió al equipo mobile reducir llamadas de API de 6 por pantalla a 1, mejorando dramáticamente el tiempo de inicio.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre BFF y API Gateway?**
A: Un API Gateway es un punto de entrada compartido y genérico. Un BFF es un backend específico para un cliente. Puedes tener un API Gateway al frente de múltiples BFFs.

**Q: Puede un BFF servir múltiples clientes similares?**
A: Sí, si sus necesidades son casi idénticas (ej. iOS y Android). Pero resiste la tentación de generalizar — el valor del BFF está en la especificidad.

**Q: Los BFFs deberían manejar autenticación?**
A: Los BFFs típicamente validan tokens y propagan identidad, pero el proveedor de identidad real (OAuth, OIDC) debería ser un servicio compartido.

**Q: Cómo se relacionan los BFFs con los microservicios?**
A: Los BFFs se sientan arriba de los microservicios. Son consumidores de la capa de microservicios, no reemplazos de ella.
