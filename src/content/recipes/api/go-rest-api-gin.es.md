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
- La API funciona como backend para SPAs o aplicaciones mobile. Consulta [Llamar REST API](/recipes/api/call-rest-api) para patrones de cliente.

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

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### ¿Cómo estructuro una aplicación Gin grande?

Agrupa rutas por dominio usando `gin.RouterGroup`. Crea archivos de rutas separados por dominio (ej., `routes/users.go`, `routes/orders.go`) y registrálalos en `main.go`. Inyecta dependencias (database, cache, external clients) vía un struct pasado a los handler methods en lugar de variables globales. Usa repositories basados en interfaces para que los handlers sean testeables con mocks.

### ¿Cómo manejo graceful shutdown en Gin?

Usa `http.Server` con `Shutdown(ctx)` para drenar requests en vuelo. Escucha señales `SIGINT` y `SIGTERM`, luego llama `server.Shutdown(context.WithTimeout(ctx, 30*time.Second))`. Cierra conexiones a database y flushea logs después de que shutdown complete. Gin no bloquea en shutdown por defecto — necesitas wrap `router.Run()` en una goroutine y manejar el lifecycle tú mismo.

### ¿Cómo valido request bodies en Gin?

Usa `binding` tags en los campos de tu struct: `json:"name" binding:"required,min=3"`. Gin valida automáticamente cuando llamas `c.ShouldBindJSON(&req)`. Para validación custom, registra un `validator.Func` con el binding validator. Retorna `400 Bad Request` con detalles de error a nivel de campo cuando la validación falla. Usa `ShouldBindJSON` (no `BindJSON`) para evitar auto-escribir la response de error para que puedas formatearla tú mismo.

### ¿Cómo implemento rate limiting en Gin?

Usa el middleware `gin-contrib/limiter` o implementa un token bucket con `golang.org/x/time/rate`. Keyea el limiter por IP address o user ID. Setea un burst limit (ej., 10 requests) y un refill rate (ej., 1 request/second). Retorna `429 Too Many Requests` con un header `Retry-After`. Para deployments distribuidos, usa rate limiting backed en Redis para que el límite sea compartido entre instancias.

### ¿Cómo testeo handlers de Gin?

Usa `httptest.NewRecorder()` y `router.ServeHTTP` para testear handlers sin levantar un server. Crea un router de test con dependencias mockeadas. Aserta en el status code de response, body, y headers. Para tests de middleware, encadena el middleware y handler juntos y verifica la response. Usa `c.Set()` en tests para inyectar valores mock en el context.

### ¿Cómo manejo errores consistentemente en Gin?

Define un struct de error response custom con campos `code`, `message`, y `details`. Escribe una función helper `respondError(c, status, code, message)` que setea la JSON response y llama `c.Abort()`. Usa `c.Error(err)` para attachear errores al context, luego llama `c.AbortWithStatusJSON()` en un recovery middleware. Loggea errores con request ID para tracing. Retorna códigos de error consistentes (ej., `INVALID_INPUT`, `NOT_FOUND`, `UNAUTHORIZED`) para que los clientes puedan manejarlos programáticamente.

### ¿Cómo uso Gin con OpenAPI/Swagger?

Usa `swaggo/swag` para generar docs OpenAPI desde annotations. Agrega comentarios `@Summary`, `@Description`, `@Tags`, `@Param`, `@Success`, `@Router` arriba de cada handler. Ejecuta `swag init` para generar el package `docs`. Sirve el Swagger UI en `/swagger/index.html` usando el middleware `ginSwagger`. Mantén las annotations en sync con las signatures de los handlers — annotations desactualizadas producen API docs misleading.

### ¿Cómo manejo CORS en Gin?

Usa el middleware `gin-contrib/cors` con origins, methods, y headers explícitos permitidos. No uses `AllowAllOrigins: true` en producción — expone tu API a cross-site attacks. Setea `AllowOrigins: []string{"https://yourdomain.com"}` explícitamente. Habilita `AllowCredentials: true` solo si usas cookies o Authorization headers. Setea `MaxAge: 12 * time.Hour` para reducir preflight requests.

### ¿Cómo manejo file uploads en Gin?

Usa `c.FormFile("file")` para uploads de un solo archivo y `c.MultipartForm()` para múltiples archivos. Setea `router.MaxMultipartMemory = 8 << 20` (8 MiB) para limitar el parsing en memoria. Para archivos grandes, streamea directamente a S3 o disk usando `file.Open()` e `io.Copy`. Valida el tipo de archivo chequeando los primeros 512 bytes con `http.DetectContentType` en lugar de confiar en el header `Content-Type`. Setea un max file size en middleware usando `c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 50<<20)` para rechazar uploads oversized temprano.

### ¿Cómo implemento health checks en Gin?

Registra un endpoint `/health` que retorne `200 OK` con un body JSON `{"status": "healthy"}`. Para checks más profundos, agrega un endpoint `/health/ready` que verifique conectividad de base de datos, Redis ping, y disponibilidad de servicios externos. Retorna `503 Service Unavailable` si alguna dependencia está down. Usa `gin.HandlerFunc` con un timeout wrapper para prevenir health checks colgados. Container orchestrators (Kubernetes, ECS) usan estos endpoints para liveness y readiness probes. Mantén el liveness probe ligero — debería retornar en menos de 50ms. Agrega un endpoint `/health/live` que solo chequee si el proceso está corriendo, separado de los readiness checks que verifican dependencias.

### ¿Cómo aseguro rutas de Gin con JWT?

Usa el middleware `gin-jwt` o implementa un `gin.HandlerFunc` custom que extraiga el JWT del header `Authorization: Bearer <token>`. Valida el token con `jwt.ParseWithClaims` y setea el user ID en el context con `c.Set("userID", claims.Subject)`. Retorna `401 Unauthorized` para tokens inválidos o expirados. Para refresh tokens, implementa un endpoint separado `/refresh` que acepte un refresh token válido y retorne un nuevo access token.
