---
contentType: recipes
slug: go-rest-api-gin
title: "REST API en Go con Gin y Middleware"
description: "Construye APIs REST production-ready en Go usando el framework Gin con middleware custom para logging, autenticacion, validacion y manejo de errores"
metaDescription: "Construye APIs REST production-ready en Go con Gin. Implementa middleware custom para logging, auth, validacion y manejo de errores en servicios de alto rendimiento."
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
  metaDescription: "Construye APIs REST production-ready en Go con Gin. Implementa middleware custom para logging, auth, validacion y manejo de errores en servicios de alto rendimiento."
  keywords:
    - golang api
    - gin framework
    - rest api go
    - middleware
    - go microservices
---

# REST API en Go con Gin y Middleware

Construye APIs REST de alto rendimiento en Go usando el framework Gin. Esta recipe cubre routing, middleware custom para cross-cutting concerns, validacion de requests, manejo estructurado de errores y graceful shutdown usados en microservicios de produccion.

## Cuando Usar Esto

- Necesitas un framework HTTP rapido y liviano para servicios en Go
- Cross-cutting concerns (logging, auth, metrics) deben ser reusables entre endpoints
- La API sirve como backend para SPAs o aplicaciones mobile. Consulta [Llamar REST API](/recipes/api/call-rest-api) para patrones de cliente.

## Solucion

### 1. Setup Basico del Servidor

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

### 2. [Middleware](/patterns/design/chain-of-responsibility-middleware) Custom

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

### 3. Validacion de Requests

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

### 4. Manejo Estructurado de [Errores](/recipes/api/handle-errors)

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

## Como Funciona

- **Gin** provee routing rapido y manejo de JSON con minimas allocaciones
- **Middleware** chains ejecutan en orden para cada request matching
- **Binding** valida y popula structs desde JSON/form data automaticamente
- **Graceful shutdown** completa requests en vuelo antes de terminar

## Variacion: Route Groups con [Rate Limiting](/recipes/api/api-rate-limiting-redis)

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

## Consideraciones de Produccion

- Usa `gin.ReleaseMode()` en produccion para deshabilitar debug logging
- Implementa logging estructurado con `zap` o `zerolog` en lugar de log estandar
- Profilea memoria y CPU para optimizar hot paths en middleware

## Errores Comunes

- No usar `gin.New()` en lugar de `gin.Default()` cuando necesitas orden custom de middleware
- Olvidar `c.Next()` o `c.Abort()` en middleware, rompiendo la cadena
- Mantener conexiones a base de datos en context sin pooling apropiado

## FAQ

**P: Como se compara Gin con la libreria estandar `net/http`?**
R: Gin agrega routing, middleware y binding con minimo overhead. Para APIs simples, `net/http` con `chi` o la libreria estandar es suficiente.

**P: Puedo usar Gin con gRPC?**
R: Si. Corre servidores [gRPC](/recipes/api/grpc-api) y HTTP lado a lado, o usa `grpc-gateway` para generar endpoints HTTP desde definiciones protobuf.
