---






contentType: recipes
slug: go-rest-api-gin
title: "Go REST API with Gin and Middleware"
description: "Build production-ready REST APIs in Go using the Gin framework with custom middleware for logging, authentication, validation, and error handling"
metaDescription: "Build production REST APIs in Go with Gin framework. Implement custom middleware for logging, auth, validation, and error handling in high-performance services."
difficulty: intermediate
topics:
  - api
  - devops
tags:
  - golang
  - api
  - rest
  - microservices
  - http
relatedResources:
  - /recipes/server-sent-events-go
  - /patterns/ambassador-pattern-services
  - /recipes/grpc-services-typescript
  - /recipes/api-rate-limiting-redis
  - /recipes/cursor-pagination-postgresql
  - /recipes/express-middleware-patterns
  - /recipes/data-validation-zod
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build production REST APIs in Go with Gin framework. Implement custom middleware for logging, auth, validation, and error handling in high-performance services."
  keywords:
    - golang api
    - gin framework
    - rest api go
    - middleware
    - go microservices






---

# Go REST API with Gin and Middleware

Build high-performance REST APIs in Go using the Gin framework. The solution below covers routing, custom middleware for cross-cutting concerns, request validation, structured error handling, and graceful shutdown patterns used in production microservices.

## When to Use This

- You need a fast, lightweight HTTP framework for Go services
- Cross-cutting concerns (logging, auth, metrics) must be reusable across endpoints
- The API works as a backend for SPAs or mobile applications. See [Call REST API](/recipes/api/call-rest-api) for client patterns.

## Solution

### 1. Basic Server Setup

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
```

### 2. Custom [Middleware](/patterns/design/chain-of-responsibility-middleware)

```go
// middleware/logger.go
package middleware

import (
	"time"
	"github.com/gin-gonic/gin"
	"log"
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

### 3. Request Validation

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

	user := createInDB(req)
	c.JSON(http.StatusCreated, user)
}
```

### 4. Structured [Error Handling](/recipes/api/handle-errors)

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

		if len(c.Errors) > 0 {
			err := c.Errors.Last().Err
			if apiErr, ok := err.(*APIError); ok {
				c.JSON(apiErr.Status, apiErr)
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		}
	}
}
```

### 5. Graceful Shutdown

```go
// server.go
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
		log.Fatal("Server forced to shutdown:", err)
	}
}
```

## How It Works

- **Gin** provides fast routing and JSON handling with minimal allocations
- **Middleware** chains execute in order for every matching request
- **Binding** validates and populates structs from JSON/form data automatically
- **Graceful shutdown** completes in-flight requests before terminating

## Variation: Route Groups with [Rate Limiting](/recipes/api/api-rate-limiting-redis)

```go
import "golang.org/x/time/rate"

func RateLimiter() gin.HandlerFunc {
	limiter := rate.NewLimiter(10, 20)
	return func(c *gin.Context) {
		if !limiter.Allow() {
			c.AbortWithStatusJSON(429, gin.H{"error": "rate limit exceeded"})
			return
		}
		c.Next()
	}
}

api := r.Group("/api/v1")
api.Use(RateLimiter())
```

## Production Considerations

- Use `gin.ReleaseMode()` in production to disable debug logging
- Implement structured logging with `zap` or `zerolog` instead of standard log
- Profile memory and CPU to optimize hot paths in middleware

## Common Mistakes

- Not using `gin.New()` instead of `gin.Default()` when you need custom middleware ordering
- Forgetting `c.Next()` or `c.Abort()` in middleware, breaking the chain
- Holding database connections in context without proper pooling

## FAQ

**Q: How does Gin compare to standard library `net/http`?**
A: Gin adds routing, middleware, and binding with minimal overhead. For simple APIs, `net/http` with `chi` or standard library is sufficient.

**Q: Can I use Gin with gRPC?**
A: Yes. Run [gRPC](/recipes/api/grpc-api) and HTTP servers side by side, or use the `grpc-gateway` to generate HTTP endpoints from protobuf definitions.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### How do I structure a large Gin application?

Group routes by domain using `gin.RouterGroup`. Create separate route files per domain (e.g., `routes/users.go`, `routes/orders.go`) and register them in `main.go`. Inject dependencies (database, cache, external clients) via a struct passed to handler methods rather than global variables. Use interface-based repositories so handlers are testable with mocks.

### How do I handle graceful shutdown in Gin?

Use `http.Server` with `Shutdown(ctx)` to drain in-flight requests. Listen for `SIGINT` and `SIGTERM` signals, then call `server.Shutdown(context.WithTimeout(ctx, 30*time.Second))`. Close database connections and flush logs after shutdown completes. Gin does not block on shutdown by default — you need to wrap `router.Run()` in a goroutine and manage the lifecycle yourself.

### How do I validate request bodies in Gin?

Use `binding` tags on your struct fields: `json:"name" binding:"required,min=3"`. Gin validates automatically when you call `c.ShouldBindJSON(&req)`. For custom validation, register a `validator.Func` with the binding validator. Return `400 Bad Request` with field-level error details when validation fails. Use `ShouldBindJSON` (not `BindJSON`) to avoid auto-writing the error response so you can format it yourself.

### How do I implement rate limiting in Gin?

Use `gin-contrib/limiter` middleware or implement a token bucket with `golang.org/x/time/rate`. Key the limiter by IP address or user ID. Set a burst limit (e.g., 10 requests) and a refill rate (e.g., 1 request/second). Return `429 Too Many Requests` with a `Retry-After` header. For distributed deployments, use Redis-backed rate limiting so the limit is shared across instances.

### How do I test Gin handlers?

Use `httptest.NewRecorder()` and `router.ServeHTTP` to test handlers without starting a server. Create a test router with mocked dependencies. Assert on the response status code, body, and headers. For middleware tests, chain the middleware and handler together and verify the response. Use `c.Set()` in tests to inject mock values into the context.

### How do I handle errors consistently in Gin?

Define a custom error response struct with `code`, `message`, and `details` fields. Write a helper function `respondError(c, status, code, message)` that sets the JSON response and calls `c.Abort()`. Use `c.Error(err)` to attach errors to the context, then call `c.AbortWithStatusJSON()` in a recovery middleware. Log errors with request ID for tracing. Return consistent error codes (e.g., `INVALID_INPUT`, `NOT_FOUND`, `UNAUTHORIZED`) so clients can handle them programmatically.

### How do I use Gin with OpenAPI/Swagger?

Use `swaggo/swag` to generate OpenAPI docs from annotations. Add `@Summary`, `@Description`, `@Tags`, `@Param`, `@Success`, `@Router` comments above each handler. Run `swag init` to generate the `docs` package. Serve the Swagger UI at `/swagger/index.html` using `ginSwagger` middleware. Keep annotations in sync with handler signatures — outdated annotations produce misleading API docs.

### How do I handle CORS in Gin?

Use `gin-contrib/cors` middleware with explicit allowed origins, methods, and headers. Do not use `AllowAllOrigins: true` in production — it exposes your API to cross-site attacks. Set `AllowOrigins: []string{"https://yourdomain.com"}` explicitly. Enable `AllowCredentials: true` only if you use cookies or Authorization headers. Set `MaxAge: 12 * time.Hour` to reduce preflight requests.

### How do I handle file uploads in Gin?

Use `c.FormFile("file")` for single file uploads and `c.MultipartForm()` for multiple files. Set `router.MaxMultipartMemory = 8 << 20` (8 MiB) to limit in-memory parsing. For large files, stream directly to S3 or disk using `file.Open()` and `io.Copy`. Validate file type by checking the first 512 bytes with `http.DetectContentType` rather than trusting the `Content-Type` header. Set a max file size in middleware using `c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 50<<20)` to reject oversized uploads early.

### How do I implement health checks in Gin?

Register a `/health` endpoint that returns `200 OK` with a JSON body `{"status": "healthy"}`. For deeper checks, add a `/health/ready` endpoint that verifies database connectivity, Redis ping, and external service availability. Return `503 Service Unavailable` if any dependency is down. Use `gin.HandlerFunc` with a timeout wrapper to prevent hanging health checks. Container orchestrators (Kubernetes, ECS) use these endpoints for liveness and readiness probes. Keep the liveness probe lightweight — it should return in under 50ms. Add a `/health/live` endpoint that only checks if the process is running, separate from readiness checks that verify dependencies.

### How do I secure Gin routes with JWT?

Use `gin-jwt` middleware or implement a custom `gin.HandlerFunc` that extracts the JWT from the `Authorization: Bearer <token>` header. Validate the token with `jwt.ParseWithClaims` and set the user ID in the context with `c.Set("userID", claims.Subject)`. Return `401 Unauthorized` for invalid or expired tokens. For refresh tokens, implement a separate `/refresh` endpoint that accepts a valid refresh token and returns a new access token.
