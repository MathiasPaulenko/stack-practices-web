---
contentType: patterns
slug: backend-for-frontend-pattern
title: "Backend for Frontend (BFF) Pattern"
description: "Create dedicated backend services tailored to the specific needs of each frontend client type, aggregating downstream APIs and optimizing data shapes per platform."
metaDescription: "Learn the Backend for Frontend Pattern for API aggregation per client type. Examples in Python, Java, and JavaScript with GraphQL gateways and mobile optimization."
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
  metaDescription: "Learn the Backend for Frontend Pattern for API aggregation per client type. Examples in Python, Java, and JavaScript with GraphQL gateways and mobile optimization."
  keywords:
    - backend for frontend
    - design pattern
    - api
    - mobile
    - web
    - graphql
    - bff
---

# Backend for Frontend (BFF) Pattern

## Overview

The Backend for Frontend (BFF) Pattern creates dedicated backend services tailored to the specific needs of each frontend client type (web, mobile, IoT, desktop). Instead of forcing all clients to consume a single general-purpose API, each frontend gets a backend that aggregates downstream microservices, optimizes data shapes, handles authentication concerns, and exposes an API perfectly aligned with that client's requirements.

A mobile app may need lightweight, aggregated responses to minimize battery and bandwidth usage. A web dashboard may need heavily nested, joined data with real-time updates. An IoT device may need binary-efficient, minimal payloads. A single API cannot optimally serve all three.

The BFF sits between the client and the core microservices, acting as an aggregator, transformer, and caching layer specific to one client type.

## When to Use

Use the BFF Pattern when:
- Different frontend clients have incompatible data requirements
- Mobile clients need reduced payload size and fewer network round-trips
- Web clients need server-side rendering or SEO-optimized data
- Third-party integrations need a sanitized, limited API surface
- You want to iterate on frontend APIs without affecting other clients

## When to Avoid

- You have only one frontend client type (a single API gateway suffices)
- The overhead of maintaining multiple BFF services exceeds the benefit
- Frontend needs are nearly identical across platforms
- The BFF becomes a thick layer containing business logic that belongs in the domain

## Solution

### Python

```python
from dataclasses import dataclass
from typing import List, Dict, Optional
import json

# ============================================================================
# CORE MICROSERVICES (shared backend services)
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
# BFF FOR MOBILE CLIENT
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
    """BFF optimized for mobile: lightweight, aggregated, minimal fields"""
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
            for o in orders[:3]  # Only last 3 orders for mobile
        ]

        return MobileUserProfile(
            name=user["name"],
            recent_orders=recent_orders,
            unread_notifications=2  # Aggregated from notification service
        )

# ============================================================================
# BFF FOR WEB CLIENT
# ============================================================================

class WebBFF:
    """BFF optimized for web: rich data, nested relationships, full history"""
    def __init__(self, user_service: UserService, order_service: OrderService,
                 inventory_service: InventoryService):
        self.users = user_service
        self.orders = order_service
        self.inventory = inventory_service

    def get_profile(self, user_id: str) -> dict:
        user = self.users.get_user(user_id)
        orders = self.orders.get_orders(user_id)

        # Enrich orders with inventory data
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
# USAGE
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

// Usage
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

// Usage
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

## Explanation

The BFF is an **API facade per client type**:

1. **Aggregation**: The BFF calls multiple downstream services and assembles a unified response
2. **Transformation**: Data is reshaped to match the client's needs (mobile gets summaries, web gets full objects)
3. **Optimization**: Payload size, caching, and field selection are tuned per platform
4. **Isolation**: Changes to the web UI do not affect mobile clients and vice versa

Each BFF is owned by the team responsible for that frontend, allowing them to iterate independently.

## Variants

| Variant | Client Type | Specialization |
|-----------|-------------|----------------|
| **Mobile BFF** | iOS/Android | Small payloads, connection resilience, offline support |
| **Web BFF** | Browser/SPA | SSR, SEO, deep data nesting, real-time features |
| **IoT BFF** | Embedded devices | Binary protocols, minimal JSON, edge caching |
| **Partner BFF** | Third-party integrations | Rate limiting, restricted data, API versioning |
| **GraphQL BFF** | Any | Schema stitching, resolver-based aggregation |

## Best Practices

- **Keep BFFs thin.** They should aggregate and transform, not implement core business logic.
- **Co-locate BFF with frontend team.** The team that owns the client should own its BFF.
- **Use GraphQL when clients need flexible queries.** A single GraphQL BFF can replace multiple REST BFFs.
- **Cache aggressively at the BFF.** Reduce downstream service calls with TTL-based caching.
- **Share code via libraries.** Common HTTP clients, auth middleware, and logging should be library code.

## Common Mistakes

- **Duplicating business logic.** The BFF should not reimplement validation or calculation rules.
- **Over-fetching from downstream.** Use targeted service calls, not "fetch everything and filter."
- **One BFF for all clients.** This defeats the purpose and creates the same coupling a general API has.
- **Not handling failures gracefully.** A single downstream failure should not break the entire BFF response.
- **Ignoring authentication context.** BFFs should propagate user identity and permissions to downstream services.

## Real-World Examples

### Netflix

Netflix uses BFFs per device type (TV, mobile, web). Each BFF aggregates personalization, catalog, and playback data in shapes optimized for that device's UI and bandwidth constraints.

### Spotify

Spotify's mobile and desktop clients consume different BFFs. The mobile BFF aggressively reduces payload size and pre-fetches likely-next content, while the desktop BFF provides richer metadata and social features.

### SoundCloud

SoundCloud's API migrated from a single API to BFFs for web, mobile, and embedded players. This allowed the mobile team to reduce API calls from 6 per screen to 1, dramatically improving startup time.

## Frequently Asked Questions

**Q: What is the difference between BFF and API Gateway?**
A: An API Gateway is a shared, generic entry point. A BFF is a client-specific backend. You may have an API Gateway in front of multiple BFFs.

**Q: Can one BFF serve multiple similar clients?**
A: Yes, if their needs are nearly identical (e.g., iOS and Android). But resist the temptation to generalize — the value of BFF is specificity.

**Q: Should BFFs handle authentication?**
A: BFFs typically validate tokens and propagate identity, but the actual identity provider (OAuth, OIDC) should be a shared service.

**Q: How do BFFs relate to microservices?**
A: BFFs sit above microservices. They are consumers of the microservice layer, not replacements for it.
