---


contentType: patterns
slug: backends-for-frontends-pattern
title: "Backends for Frontends: Dedicated Backend per Client Type"
description: "How to create dedicated backends per client type. Covers BFF for web, mobile, and desktop. Covers API aggregation, client-specific optimization, and GraphQL BFF."
metaDescription: "Create dedicated backends per client type. Learn BFF for web, mobile, desktop, API aggregation, client-specific optimization, and GraphQL BFF pattern."
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
  - /patterns/strangler-fig-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Create dedicated backends per client type. Learn BFF for web, mobile, desktop, API aggregation, client-specific optimization, and GraphQL BFF pattern."
  keywords:
    - architecture
    - bff
    - api
    - microservices
    - pattern


---

## Overview

The backends for frontends (BFF) pattern creates a separate backend service for each frontend client type: one for web, one for mobile, one for desktop. Each BFF aggregates data from multiple microservices, optimizes responses for its client's needs, and handles client-specific concerns like authentication, caching, and response formatting. Instead of a single generic API that serves all clients (and ends up bloated with client-specific endpoints), each BFF is tailored to its client. The web BFF can return rich data for large screens; the mobile BFF returns minimal payloads for slow networks. Teams own their BFF end-to-end, from frontend to backend.

## When to Use

- Multiple frontend clients (web, mobile, desktop, smartwatch) with different data needs
- Mobile clients that need smaller payloads than web
- Frontend teams that want to iterate independently of backend teams
- Applications where different clients need different authentication flows
- Reducing over-fetching: clients receive only the data they need

## When NOT to Use

- Single client type (one web app only)
- Simple API with few endpoints that already serves all clients well
- Small team where maintaining multiple BFFs adds too much overhead
- Internal tools where payload size and client optimization don't matter

## Solution

### BFF architecture diagram

```
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
// web-bff/server.js — Web BFF aggregates multiple services
const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const USER_SERVICE = process.env.USER_SERVICE_URL || "http://user-service:3001";
const ORDER_SERVICE = process.env.ORDER_SERVICE_URL || "http://order-service:3002";
const INVENTORY_SERVICE = process.env.INVENTORY_SERVICE_URL || "http://inventory-service:3003";

// Web dashboard — aggregates user profile, recent orders, and recommendations
app.get("/api/dashboard", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
        // Fetch data from multiple services in parallel
        const [userResp, ordersResp, recommendationsResp] = await Promise.all([
            axios.get(`${USER_SERVICE}/users/${userId}`),
            axios.get(`${ORDER_SERVICE}/users/${userId}/orders?limit=10`),
            axios.get(`${INVENTORY_SERVICE}/recommendations?userId=${userId}&limit=5`)
        ]);

        // Aggregate and format for web client
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

// Web product detail — includes reviews and related products
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
// mobile-bff/main.go — Mobile BFF returns minimal payloads
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

    // Fetch user name
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

    // Fetch orders summary
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

    // Fetch minimal product suggestions
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
// graphql-bff/server.js — GraphQL BFF for flexible client queries
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

### Python BFF with Flask

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

    # Fetch minimal data for mobile
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

    # Minimal payload for mobile
    return jsonify({
        "userName": results["user"]["name"] if results["user"] else "",
        "orderCount": len(results["orders"].get("orders", [])),
        "lastOrder": results["orders"]["orders"][0] if results["orders"]["orders"] else None,
        "suggestions": results["suggestions"].get("products", [])
    })

@app.route("/api/product/<product_id>")
def mobile_product(product_id):
    # Mobile only needs name, price, and availability — no reviews, no related
    resp = requests.get(
        f"{INVENTORY_SERVICE}/products/{product_id}",
        params={"fields": "id,name,price,inStock"},
        timeout=5
    )
    if resp.status_code != 200:
        return jsonify({"error": "Not found"}), 404
    return jsonify(resp.json())
```

### BFF with caching

```javascript
// bff/cache.js — BFF with Redis caching for expensive aggregations
const express = require("express");
const redis = require("redis");
const axios = require("axios");

const app = express();
const cache = redis.createClient({ url: process.env.REDIS_URL });
cache.connect();

const CACHE_TTL = 60; // 1 minute

// Cache middleware for BFF endpoints
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

### Shared BFF with client-specific response shaping

```python
# shared_bff.py — one BFF with response shapers per client type
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

def shape_for_web(data):
    """Full payload for web with large screens."""
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
    """Minimal payload for mobile."""
    return {
        "userName": data["user"]["name"],
        "orderCount": len(data["orders"]),
        "lastOrder": data["orders"][0] if data["orders"] else None
    }

@app.route("/api/dashboard")
def dashboard():
    client_type = request.headers.get("X-Client-Type", "web")
    user_id = request.headers.get("X-User-Id")

    # Fetch full data once
    data = fetch_dashboard_data(user_id)

    # Shape based on client
    shaper = shape_for_mobile if client_type == "mobile" else shape_for_web
    return jsonify(shaper(data))
```

### BFF with WebSocket for real-time updates

```javascript
// bff/websocket.js — BFF with WebSocket for live updates
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

    // Push order status updates
    socket.join(`orders:${userId}`);

    // Push inventory updates
    socket.join("inventory:updates");
});

// Webhook from order service — push to connected clients
app.post("/webhooks/order-updated", (req, res) => {
    const { userId, order } = req.body;
    io.to(`orders:${userId}`).emit("order:updated", order);
    res.json({ ok: true });
});

server.listen(4000, () => console.log("BFF with WebSocket on port 4000"));
```

## Best Practices


- For a deeper guide, see [Gateway Routing Pattern](/patterns/gateway-routing-pattern/).

- One BFF per client type, not per device — web BFF serves both desktop and mobile web
- Keep BFF thin — aggregation and formatting only, no business logic
- Use parallel calls — fetch from multiple services concurrently to reduce latency
- Cache aggressively — dashboard data changes slowly; cache for 30-60 seconds
- Handle partial failures — if one service is down, return partial data with a warning
- Version the BFF API — `/api/v1/dashboard` so you can evolve without breaking clients
- Consider GraphQL for flexible clients — clients request exactly what they need
- Monitor BFF latency — it's the user's critical path; track p50, p95, p99

## Common Mistakes

- **Business logic in BFF**: the BFF should only aggregate and format. Business rules belong in domain services.
- **One BFF for all clients**: defeats the purpose. Mobile gets web payloads, wasting bandwidth.
- **Sequential service calls**: calling services one by one. Use `Promise.all` or equivalent for parallel calls.
- **No caching**: every request hits all downstream services. Cache expensive aggregations.
- **No error handling for partial failures**: one service failure breaks the entire response. Return partial data.

## FAQ

### What is the BFF pattern?

A separate backend service for each frontend client type (web, mobile, desktop). Each BFF aggregates data from multiple microservices and formats responses optimized for its client. The web BFF returns rich data; the mobile BFF returns minimal payloads.

### How many BFFs should I have?

One per distinct client type. Typically: web BFF, mobile BFF. If you have a desktop app with very different needs, add a desktop BFF. Don't create a BFF per device model — one mobile BFF serves all mobile devices.

### Should the BFF use GraphQL or REST?

Both work. REST is simpler and well-understood. GraphQL lets clients request exactly the fields they need, which is useful when different screens need different subsets of data. Start with REST; adopt GraphQL if over-fetching becomes a problem.

### Can the BFF call other BFFs?

No. BFFs should call domain microservices, not other BFFs. BFF-to-BFF calls create coupling and circular dependencies. If two BFFs need the same data, they both call the same domain service.

### Who owns the BFF?

The frontend team owns the BFF. This is a key principle: the team that builds the frontend also builds its BFF. This gives the frontend team end-to-end ownership and lets them iterate without waiting for backend teams.
