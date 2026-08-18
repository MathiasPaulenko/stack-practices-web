---
contentType: recipes
slug: go-rest-api-gin
title: "Go REST API with Gin and Middleware"
description: "Build production-ready REST APIs in Go using the Gin framework with custom middleware for logging, authentication, validation, and error handling."
metaDescription: "Build production REST APIs in Go with Gin. Implement custom middleware for logging, auth, validation, and error handling in high-performance services."
difficulty: intermediate
topics:
  - api
  - devops
tags:
  - golang
  - gin
  - api
  - rest
  - middleware
  - http
relatedResources:
  - /recipes/server-sent-events-go
  - /recipes/api-rate-limiting-redis
  - /recipes/cursor-pagination-postgresql
  - /patterns/chain-of-responsibility-middleware
  - /recipes/express-middleware-patterns
  - /recipes/data-validation-zod
lastUpdated: "2026-08-18"
publishedAt: "2026-06-18"
author: Mathias Paulenko
seo:
  metaDescription: "Build production REST APIs in Go with Gin. Implement custom middleware for logging, auth, validation, and error handling in high-performance services."
  keywords:
    - golang api
    - gin framework
    - rest api go
    - middleware
    - go microservices
    - gin
---

## Overview

Gin is a fast, low-allocation HTTP framework for Go. It adds routing, reusable
middleware chains, request binding, and error handling on top of the standard
`net/http` package. This recipe shows how to build a small but production-ready
REST API with custom middleware, validation, structured errors, and graceful
shutdown.

## When to Use

- You need a fast, lightweight HTTP framework for Go services.
- Cross-cutting concerns such as logging, auth, and metrics must be reusable
  across endpoints.
- The API serves SPAs, mobile clients, or other backends. See
  [Call REST API](/recipes/call-rest-api/) for client patterns.

## Solution

### Basic server setup

```go
// main.go
package main

import (
    "net/http"

    "github.com/gin-gonic/gin"
)

func main() {
    r := gin.New()
    r.Use(gin.Recovery())

    api := r.Group("/api/v1")
    {
        api.GET("/users", listUsers)
        api.GET("/users/:id", getUser)
        api.POST("/users", createUser)
    }

    r.Run(":8080")
}

func listUsers(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{"users": []string{"alice", "bob"}})
}

func getUser(c *gin.Context) {
    id := c.Param("id")
    c.JSON(http.StatusOK, gin.H{"id": id})
}
```

### Custom middleware

```go
// middleware/logger.go
package middleware

import (
    "log"
    "time"

    "github.com/gin-gonic/gin"
)

func Logger() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        path := c.Request.URL.Path

        c.Next()

        latency := time.Since(start)
        status := c.Writer.Status()
        log.Printf("[%s] %s %d %v", c.Request.Method, path, status, latency)
    }
}

// middleware/auth.go
func AuthRequired() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        if token == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
            return
        }
        c.Set("user", token)
        c.Next()
    }
}
```

Use the middleware in `main.go`:

```go
r := gin.New()
r.Use(middleware.Logger(), gin.Recovery())

api := r.Group("/api/v1")
api.Use(middleware.AuthRequired())
```

### Request validation

```go
// handlers/user.go
type CreateUserRequest struct {
    Name  string `json:"name" binding:"required,min=2,max=50"`
    Email string `json:"email" binding:"required,email"`
    Age   int    `json:"age" binding:"gte=0,lte=150"`
}

func createUser(c *gin.Context) {
    var req CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Replace with actual persistence logic.
    user := gin.H{"id": 1, "name": req.Name, "email": req.Email, "age": req.Age}
    c.JSON(http.StatusCreated, user)
}
```

### Structured error handling

```go
// errors/errors.go
type APIError struct {
    Code    string `json:"code"`
    Message string `json:"message"`
    Status  int    `json:"-"`
}

func (e *APIError) Error() string { return e.Message }

// middleware/error.go
func ErrorHandler() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Next()

        if len(c.Errors) == 0 {
            return
        }

        err := c.Errors.Last().Err
        if apiErr, ok := err.(*APIError); ok {
            c.JSON(apiErr.Status, apiErr)
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
    }
}
```

Attach errors to the context with `c.Error(err)` in handlers or middleware. The
error handler runs after `c.Next()` and writes a consistent response.

### Graceful shutdown

```go
// server.go
package main

import (
    "context"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func runWithGracefulShutdown(router *gin.Engine) {
    srv := &http.Server{
        Addr:    ":8080",
        Handler: router,
    }

    go func() {
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatalf("listen: %s", err)
        }
    }()

    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    if err := srv.Shutdown(ctx); err != nil {
        log.Fatal("server forced to shutdown:", err)
    }
}
```

## Explanation

Gin keeps request processing fast by using a radix tree for routing and a
minimal number of allocations for JSON. Each request passes through the
middleware chain in the order it was registered; `c.Next()` continues to the
next handler, while `c.Abort()` stops the chain.

The `binding` package validates and populates a struct from JSON, query, or form
data. It's a shortcut over manual parsing, but it only tells you that the input
matches the rules. Always add your own business validation where needed.

The error handler at the end of the chain inspects `c.Errors`. Errors attached
with `c.Error()` are collected there. This keeps handlers from writing the
response twice and makes the final response format consistent.

Graceful shutdown wraps the standard library `http.Server`. It starts the server
in a goroutine, waits for an interrupt signal, then gives in-flight requests a
time budget to finish before closing.

## Variants

### Route groups with rate limiting

```go
import "golang.org/x/time/rate"

func RateLimiter(rps float64, burst int) gin.HandlerFunc {
    limiter := rate.NewLimiter(rate.Limit(rps), burst)
    return func(c *gin.Context) {
        if !limiter.Allow() {
            c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
            return
        }
        c.Next()
    }
}

api := r.Group("/api/v1")
api.Use(RateLimiter(10, 20))
```

For a per-client limiter, store one limiter per IP or user ID. For distributed
deployments, move the limiter to Redis. See
[Rate Limiting with Redis](/recipes/api-rate-limiting-redis/) for that setup.

### CORS

```go
import "github.com/gin-contrib/cors"

r.Use(cors.New(cors.Config{
    AllowOrigins:     []string{"https://yourdomain.com"},
    AllowMethods:     []string{"GET", "POST", "PUT", "DELETE"},
    AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
    AllowCredentials: true,
    MaxAge:           12 * time.Hour,
}))
```

## Best Practices

- Call `gin.SetMode(gin.ReleaseMode)` in production to disable debug logging and
  color output.
- Use `gin.New()` instead of `gin.Default()` when you want full control over
  which middleware runs and in which order.
- Prefer structured logging with `zap` or `zerolog` over the standard library
  `log` package.
- Keep middleware small and focused. One middleware for logging, one for auth,
  one for errors. Mixing responsibilities makes testing harder.
- Return consistent error shapes from handlers and let the error middleware do
  the final formatting.
- Run load tests on the slowest percentiles, not just average latency.

## Common Mistakes

- Using `gin.Default()` and then adding middleware that conflicts with the
  built-in logger or recovery.
- Forgetting `c.Next()` in middleware, so the handler never runs.
- Calling `c.Abort()` without writing a response, which leaves the client
  hanging.
- Holding database connections in the context without using a connection pool.
- Trusting binding validation alone for business rules.
- Returning raw errors to clients instead of a structured `APIError`.

## FAQ

### How does Gin compare to the standard `net/http` package?

Gin adds routing, middleware, request binding, and panic recovery with minimal
overhead. For very small APIs, `net/http` with a router like `chi` is also
sufficient.

### Can I use Gin with gRPC?

Yes. You can run gRPC and HTTP servers side by side, or use `grpc-gateway` to
expose HTTP endpoints generated from protobuf definitions.

### How do I structure a large Gin application?

Group routes by domain with `gin.RouterGroup`. Keep route files per domain
(`routes/users.go`, `routes/orders.go`) and register them in `main.go`. Pass
dependencies through a struct to handlers instead of global variables, and use
interface-based repositories so handlers stay testable.

### How do I validate request bodies?

Use `binding` tags on struct fields and call `c.ShouldBindJSON(&req)`. For custom
rules, register a validator with `binding.Validator` or validate after binding.
Use `ShouldBindJSON` instead of `BindJSON` so you can format the error response
yourself.

### How do I handle graceful shutdown?

Wrap `gin.Engine` inside an `http.Server`, start it in a goroutine, wait for
`SIGINT` or `SIGTERM`, then call `server.Shutdown(ctx)` with a timeout. Close
database connections and flush logs after shutdown completes.

### How do I implement rate limiting?

Use a token bucket such as `golang.org/x/time/rate` as middleware. For a single
instance, one limiter per client IP works. For distributed systems, use a
Redis-backed limiter and include a `Retry-After` header on `429` responses.

### How do I test Gin handlers?

Use `httptest.NewRecorder()` and `router.ServeHTTP` to call handlers without
starting a server. Create a router with mocked dependencies and assert on the
status code, body, and headers.

### How do I handle errors consistently?

Define a small `APIError` struct with `code` and `message`. Return those errors
from services, attach them with `c.Error()`, and let an error middleware write
the final JSON. Log the original error with a request ID for tracing.

### How do I use Gin with OpenAPI/Swagger?

Use `swaggo/swag` to generate OpenAPI docs from annotations. Add `@Summary`,
`@Param`, and `@Router` comments above handlers, run `swag init`, and serve the UI
with `ginSwagger`. Keep annotations in sync with handler signatures.

### How do I secure routes with JWT?

Extract the token from the `Authorization: Bearer <token>` header, validate it
with a JWT library, and store the user ID in the context with `c.Set()`. Return
`401` for invalid or expired tokens.

### How do I implement health checks?

Register a `/health` endpoint that returns `200` with `{"status": "healthy"}`.
For readiness, add `/health/ready` that pings databases or downstream services
and returns `503` if any dependency is down. Keep the liveness check lightweight.
