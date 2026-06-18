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
relatedResources:
  - /recipes/api/server-sent-events-go
  - /patterns/design/middleware-pattern
  - /patterns/design/ambassador-pattern-services
lastUpdated: "2026-06-18"
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

Build high-performance REST APIs in Go using the Gin framework. This recipe covers routing, custom middleware for cross-cutting concerns, request validation, structured error handling, and graceful shutdown patterns used in production microservices.

## When to Use This

- You need a fast, lightweight HTTP framework for Go services
- Cross-cutting concerns (logging, auth, metrics) must be reusable across endpoints
- The API serves as a backend for SPAs or mobile applications

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

### 2. Custom Middleware

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

### 4. Structured Error Handling

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

## Variation: Route Groups with Rate Limiting

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
A: Yes. Run gRPC and HTTP servers side by side, or use the `grpc-gateway` to generate HTTP endpoints from protobuf definitions.
