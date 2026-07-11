---
contentType: patterns
slug: backends-for-frontends-pattern
title: "Patrón Backends for Frontends"
description: "Cómo crear dedicated backends per client type. Cubre BFF para web, mobile, y desktop. Cubre API aggregation, client-specific optimization, y GraphQL BFF."
metaDescription: "Creá dedicated backends per client type. Aprende BFF para web, mobile, desktop, API aggregation, client-specific optimization, y GraphQL BFF pattern."
difficulty: intermediate
topics:
  - architecture
  - api
tags:
  - architecture
  - bff
  - api
  - microservices
  - pattern
category: architectural
relatedResources:
  - /patterns/modular-monolith-pattern
  - /patterns/ambassador-pattern
  - /patterns/anti-corruption-layer-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Creá dedicated backends per client type. Aprende BFF para web, mobile, desktop, API aggregation, client-specific optimization, y GraphQL BFF pattern."
  keywords:
    - architecture
    - bff
    - api
    - microservices
    - pattern
---

## Overview

El backends for frontends (BFF) pattern crea un separate backend service para cada frontend client type: uno para web, uno para mobile, uno para desktop. Cada BFF aggregateéa data desde múltiples microservices, optimizeéa responses para su client's needs, y handlea client-specific concerns como authentication, caching, y response formatting. En vez de un single generic API que sirve a todos los clients (y termina bloated con client-specific endpoints), cada BFF está tailored a su client. El web BFF puede returnear rich data para large screens; el mobile BFF returnea minimal payloads para slow networks. Los teams ownean su BFF end-to-end, desde frontend hasta backend.

## When to Use

- Múltiples frontend clients (web, mobile, desktop, smartwatch) con different data needs
- Mobile clients que necesitan smaller payloads que web
- Frontend teams que quieren iteratear independentemente de backend teams
- Applications donde diferentes clients necesitan different authentication flows
- Reducir over-fetching: clients reciben solo la data que necesitan

## When NOT to Use

- Single client type (solo un web app)
- Simple API con few endpoints que ya sirve a todos los clients bien
- Team chico donde maintainar múltiples BFFs agrega too much overhead
- Internal tools donde payload size y client optimization no importan

## Solution

### BFF architecture diagram

```text
                    ┌──────────────┐
                    │  Web Client  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   Web BFF    │
                    │  (Node.js)   │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌───▼─────┐ ┌───▼──────┐
        │  User     │ │ Order   │ │ Inventory│
        │ Service   │ │ Service │ │ Service  │
        └───────────┘ └─────────┘ └──────────┘
              │            │            │
              │            │            │
                    ┌──────▲───────┐
                    │ Mobile BFF   │
                    │  (Go)        │
                    └──────▲───────┘
                           │
                    ┌──────┴───────┐
                    │ Mobile Client│
                    └──────────────┘
```

### Web BFF (Node.js)

```javascript
// web-bff/server.js — Web BFF aggregateéa múltiples services
const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const USER_SERVICE = process.env.USER_SERVICE_URL || "http://user-service:3001";
const ORDER_SERVICE = process.env.ORDER_SERVICE_URL || "http://order-service:3002";
const INVENTORY_SERVICE = process.env.INVENTORY_SERVICE_URL || "http://inventory-service:3003";

// Web dashboard — aggregateéa user profile, recent orders, y recommendations
app.get("/api/dashboard", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
        // Fetcheá data desde múltiples services en parallel
        const [userResp, ordersResp, recommendationsResp] = await Promise.all([
            axios.get(`${USER_SERVICE}/users/${userId}`),
            axios.get(`${ORDER_SERVICE}/users/${userId}/orders?limit=10`),
            axios.get(`${INVENTORY_SERVICE}/recommendations?userId=${userId}&limit=5`)
        ]);

        // Aggregateéa y formateá para web client
        const dashboard = {
            user: {
                id: userResp.data.id,
                name: userResp.data.name,
                email: userResp.data.email,
                avatarUrl: userResp.data.avatarUrl,
                memberSince: userResp.data.createdAt
            },
            recentOrders: ordersResp.data.orders.map(order => ({
                id: order.id,
                date: order.createdAt,
                status: order.status,
                total: order.total,
                items: order.items.length
            })),
            recommendations: recommendationsResp.data.products.map(product => ({
                id: product.id,
                name: product.name,
                price: product.price,
                imageUrl: product.imageUrl,
                rating: product.rating
            }))
        };

        res.json(dashboard);
    } catch (error) {
        console.error("Dashboard aggregation failed:", error.message);
        res.status(502).json({ error: "Failed to load dashboard" });
    }
});

// Web product detail — incluye reviews y related products
app.get("/api/products/:productId", async (req, res) => {
    const { productId } = req.params;

    try {
        const [productResp, reviewsResp, relatedResp] = await Promise.all([
            axios.get(`${INVENTORY_SERVICE}/products/${productId}`),
            axios.get(`${INVENTORY_SERVICE}/products/${productId}/reviews?limit=20`),
            axios.get(`${INVENTORY_SERVICE}/products/${productId}/related`)
        ]);

        res.json({
            product: productResp.data,
            reviews: reviewsResp.data.reviews,
            relatedProducts: relatedResp.data.products
        });
    } catch (error) {
        res.status(502).json({ error: "Failed to load product" });
    }
});

app.listen(4000, () => console.log("Web BFF running on port 4000"));
```

### Mobile BFF (Go)

```go
// mobile-bff/main.go — Mobile BFF returnea minimal payloads
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "sync"
)

type MobileDashboard struct {
    UserName    string          `json:"userName"`
    OrderCount  int             `json:"orderCount"`
    LastOrder   *MobileOrder    `json:"lastOrder,omitempty"`
    Suggestions []MobileProduct `json:"suggestions"`
}

type MobileOrder struct {
    ID     string  `json:"id"`
    Status string  `json:"status"`
    Total  float64 `json:"total"`
}

type MobileProduct struct {
    ID       string  `json:"id"`
    Name     string  `json:"name"`
    Price    float64 `json:"price"`
}

var (
    userService     = "http://user-service:3001"
    orderService    = "http://order-service:3002"
    inventoryService = "http://inventory-service:3003"
)

func dashboardHandler(w http.ResponseWriter, r *http.Request) {
    userID := r.Header.Get("X-User-Id")
    if userID == "" {
        http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
        return
    }

    var wg sync.WaitGroup
    var userName string
    var orderCount int
    var lastOrder *MobileOrder
    var suggestions []MobileProduct

    // Fetcéa user name
    wg.Add(1)
    go func() {
        defer wg.Done()
        resp, err := http.Get(fmt.Sprintf("%s/users/%s", userService, userID))
        if err == nil && resp.StatusCode == 200 {
            var user struct{ Name string `json:"name"` }
            json.NewDecoder(resp.Body).Decode(&user)
            userName = user.Name
        }
    }()

    // Fetcéa orders summary
    wg.Add(1)
    go func() {
        defer wg.Done()
        resp, err := http.Get(fmt.Sprintf("%s/users/%s/orders?limit=1", orderService, userID))
        if err == nil && resp.StatusCode == 200 {
            var orders struct {
                Total int           `json:"total"`
                Items []MobileOrder `json:"orders"`
            }
            json.NewDecoder(resp.Body).Decode(&orders)
            orderCount = orders.Total
            if len(orders.Items) > 0 {
                lastOrder = &orders.Items[0]
            }
        }
    }()

    // Fetcéa minimal product suggestions
    wg.Add(1)
    go func() {
        defer wg.Done()
        resp, err := http.Get(fmt.Sprintf("%s/recommendations?userId=%s&limit=3", inventoryService, userID))
        if err == nil && resp.StatusCode == 200 {
            var recs struct{ Products []MobileProduct `json:"products"` }
            json.NewDecoder(resp.Body).Decode(&recs)
            suggestions = recs.Products
        }
    }()

    wg.Wait()

    dashboard := MobileDashboard{
        UserName:    userName,
        OrderCount:  orderCount,
        LastOrder:   lastOrder,
        Suggestions: suggestions,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(dashboard)
}

func main() {
    http.HandleFunc("/api/dashboard", dashboardHandler)
    log.Println("Mobile BFF running on port 5000")
    log.Fatal(http.ListenAndServe(":5000", nil))
}
```

### GraphQL BFF

```javascript
// graphql-bff/server.js — GraphQL BFF para flexible client queries
const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const axios = require("axios");

const typeDefs = `#graphql
  type User {
    id: ID!
    name: String!
    email: String!
    avatarUrl: String
  }

  type Order {
    id: ID!
    status: String!
    total: Float!
    createdAt: String!
    items: [OrderItem!]!
  }

  type OrderItem {
    productId: ID!
    productName: String!
    quantity: Int!
    price: Float!
  }

  type Dashboard {
    user: User!
    recentOrders: [Order!]!
    totalOrders: Int!
  }

  type Query {
    dashboard(userId: ID!): Dashboard!
    user(id: ID!): User
    orders(userId: ID!, limit: Int): [Order!]!
  }
`;

const resolvers = {
    Query: {
        async dashboard(_, { userId }) {
            const [userResp, ordersResp] = await Promise.all([
                axios.get(`http://user-service:3001/users/${userId}`),
                axios.get(`http://order-service:3002/users/${userId}/orders?limit=5`)
            ]);

            return {
                user: userResp.data,
                recentOrders: ordersResp.data.orders,
                totalOrders: ordersResp.data.total
            };
        },

        async user(_, { id }) {
            const resp = await axios.get(`http://user-service:3001/users/${id}`);
            return resp.data;
        },

        async orders(_, { userId, limit = 10 }) {
            const resp = await axios.get(
                `http://order-service:3002/users/${userId}/orders?limit=${limit}`
            );
            return resp.data.orders;
        }
    }
};

const server = new ApolloServer({ typeDefs, resolvers });
startStandaloneServer(server, { listen: { port: 4000 } })
    .then(({ url }) => console.log(`GraphQL BFF ready at ${url}`));
```

### Python BFF con Flask

```python
# bff/mobile.py — Python mobile BFF
from flask import Flask, request, jsonify
import requests
from concurrent.futures import ThreadPoolExecutor

app = Flask(__name__)

USER_SERVICE = "http://user-service:3001"
ORDER_SERVICE = "http://order-service:3002"
INVENTORY_SERVICE = "http://inventory-service:3003"

executor = ThreadPoolExecutor(max_workers=10)

@app.route("/api/dashboard")
def mobile_dashboard():
    user_id = request.headers.get("X-User-Id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    # Fetcéa minimal data para mobile
    def fetch_user():
        resp = requests.get(f"{USER_SERVICE}/users/{user_id}", timeout=5)
        return resp.json() if resp.status_code == 200 else None

    def fetch_orders():
        resp = requests.get(
            f"{ORDER_SERVICE}/users/{user_id}/orders",
            params={"limit": 3, "fields": "id,status,total"},
            timeout=5
        )
        return resp.json() if resp.status_code == 200 else {"orders": []}

    def fetch_suggestions():
        resp = requests.get(
            f"{INVENTORY_SERVICE}/recommendations",
            params={"userId": user_id, "limit": 3, "fields": "id,name,price"},
            timeout=5
        )
        return resp.json() if resp.status_code == 200 else {"products": []}

    # Parallel fetch
    from concurrent.futures import as_completed
    futures = {
        executor.submit(fetch_user): "user",
        executor.submit(fetch_orders): "orders",
        executor.submit(fetch_suggestions): "suggestions"
    }

    results = {}
    for future in as_completed(futures):
        key = futures[future]
        results[key] = future.result()

    # Minimal payload para mobile
    return jsonify({
        "userName": results["user"]["name"] if results["user"] else "",
        "orderCount": len(results["orders"].get("orders", [])),
        "lastOrder": results["orders"]["orders"][0] if results["orders"]["orders"] else None,
        "suggestions": results["suggestions"].get("products", [])
    })

@app.route("/api/product/<product_id>")
def mobile_product(product_id):
    # Mobile solo necesita name, price, y availability — no reviews, no related
    resp = requests.get(
        f"{INVENTORY_SERVICE}/products/{product_id}",
        params={"fields": "id,name,price,inStock"},
        timeout=5
    )
    if resp.status_code != 200:
        return jsonify({"error": "Not found"}), 404
    return jsonify(resp.json())
```

### BFF con caching

```javascript
// bff/cache.js — BFF con Redis caching para expensive aggregations
const express = require("express");
const redis = require("redis");
const axios = require("axios");

const app = express();
const cache = redis.createClient({ url: process.env.REDIS_URL });
cache.connect();

const CACHE_TTL = 60; // 1 minute

// Cache middleware para BFF endpoints
async function cacheMiddleware(key, ttl, handler) {
    return async (req, res) => {
        const cacheKey = `${key}:${req.headers["x-user-id"] || "anonymous"}`;

        try {
            const cached = await cache.get(cacheKey);
            if (cached) {
                res.setHeader("X-Cache", "HIT");
                return res.json(JSON.parse(cached));
            }
        } catch (err) {
            console.error("Cache read failed:", err);
        }

        const result = await handler(req);
        res.setHeader("X-Cache", "MISS");

        try {
            await cache.setEx(cacheKey, ttl, JSON.stringify(result));
        } catch (err) {
            console.error("Cache write failed:", err);
        }

        res.json(result);
    };
}

app.get("/api/dashboard", cacheMiddleware("dashboard", CACHE_TTL, async (req) => {
    const userId = req.headers["x-user-id"];
    const [user, orders] = await Promise.all([
        axios.get(`http://user-service:3001/users/${userId}`),
        axios.get(`http://order-service:3002/users/${userId}/orders?limit=5`)
    ]);
    return { user: user.data, recentOrders: orders.data.orders };
}));
```

## Variants

### Shared BFF con client-specific response shaping

```python
# shared_bff.py — un BFF con response shapers per client type
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

def shape_for_web(data):
    """Full payload para web con large screens."""
    return {
        "user": {
            "id": data["user"]["id"],
            "name": data["user"]["name"],
            "email": data["user"]["email"],
            "avatarUrl": data["user"].get("avatarUrl"),
            "memberSince": data["user"]["createdAt"]
        },
        "orders": data["orders"],
        "recommendations": data.get("recommendations", [])
    }

def shape_for_mobile(data):
    """Minimal payload para mobile."""
    return {
        "userName": data["user"]["name"],
        "orderCount": len(data["orders"]),
        "lastOrder": data["orders"][0] if data["orders"] else None
    }

@app.route("/api/dashboard")
def dashboard():
    client_type = request.headers.get("X-Client-Type", "web")
    user_id = request.headers.get("X-User-Id")

    # Fetcéa full data una vez
    data = fetch_dashboard_data(user_id)

    # Shapeéa basado en client
    shaper = shape_for_mobile if client_type == "mobile" else shape_for_web
    return jsonify(shaper(data))
```

### BFF con WebSocket para real-time updates

```javascript
// bff/websocket.js — BFF con WebSocket para live updates
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.on("connection", (socket) => {
    const userId = socket.handshake.auth.userId;
    if (!userId) {
        socket.disconnect();
        return;
    }

    console.log(`Client connected: ${userId}`);

    // Pusheá order status updates
    socket.join(`orders:${userId}`);

    // Pusheá inventory updates
    socket.join("inventory:updates");
});

// Webhook desde order service — pusheá a connected clients
app.post("/webhooks/order-updated", (req, res) => {
    const { userId, order } = req.body;
    io.to(`orders:${userId}`).emit("order:updated", order);
    res.json({ ok: true });
});

server.listen(4000, () => console.log("BFF with WebSocket on port 4000"));
```

## Best Practices

- Un BFF per client type, no per device — web BFF sirve a both desktop y mobile web
- Mantené el BFF thin — aggregation y formatting only, no business logic
- Usá parallel calls — fetcéa desde múltiples services concurrently para reducir latency
- Cacheéa agresivamente — dashboard data cambia slowly; cacheéa por 30-60 segundos
- Handleá partial failures — si un service está down, returneá partial data con un warning
- Versioneá el BFF API — `/api/v1/dashboard` para podér evolvear sin breakear clients
- Considerá GraphQL para flexible clients — clients requestéan exactamente lo que necesitan
- Monitoreá BFF latency — es el user's critical path; trackeá p50, p95, p99

## Common Mistakes

- **Business logic en BFF**: el BFF debería solo aggregatear y formatear. Business rules pertenecen en domain services.
- **Un BFF para todos los clients**: defeatéa el purpose. Mobile obtiene web payloads, wasting bandwidth.
- **Sequential service calls**: llamar services uno por uno. Usá `Promise.all` o equivalent para parallel calls.
- **No caching**: cada request hittea todos los downstream services. Cacheéa expensive aggregations.
- **No error handling para partial failures**: un service failure breakea el entire response. Returneá partial data.

## FAQ

### ¿Qué es el BFF pattern?

Un separate backend service para cada frontend client type (web, mobile, desktop). Cada BFF aggregateéa data desde múltiples microservices y formateéa responses optimized para su client. El web BFF returnea rich data; el mobile BFF returnea minimal payloads.

### ¿Cuántos BFFs debería tener?

Uno per distinct client type. Típicamente: web BFF, mobile BFF. Si tenés un desktop app con muy different needs, agregá un desktop BFF. No creés un BFF per device model — un mobile BFF sirve a todos los mobile devices.

### ¿Debería el BFF usar GraphQL o REST?

Ambos funcionan. REST es más simple y well-understood. GraphQL deja a los clients requestéar exactamente los fields que necesitan, lo cual es useful cuando diferentes screens necesitan different subsets de data. Arrancá con REST; adoptá GraphQL si over-fetching se vuelve un problema.

### ¿Puede el BFF llamar a otros BFFs?

No. Los BFFs deberían llamar a domain microservices, no a otros BFFs. BFF-to-BFF calls crean coupling y circular dependencies. Si dos BFFs necesitan la misma data, ambos llaman al mismo domain service.

### ¿Quién ownea el BFF?

El frontend team ownea el BFF. Este es un key principle: el team que buildea el frontend también buildea su BFF. Esto le da al frontend team end-to-end ownership y les deja iteratear sin esperar por backend teams.
