---
contentType: recipes
slug: go-rest-api-gin
title: "REST API en Go con Gin y Middleware"
description: "Construye APIs REST production-ready en Go usando el framework Gin con middleware custom para logging, autenticación, validación y manejo de errores."
metaDescription: "Construye APIs REST production-ready en Go con Gin. Implementa middleware custom para logging, auth, validación y manejo de errores en servicios de alto rendimiento."
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
  metaDescription: "Construye APIs REST production-ready en Go con Gin. Implementa middleware custom para logging, auth, validación y manejo de errores en servicios de alto rendimiento."
  keywords:
    - golang api
    - gin framework
    - rest api go
    - middleware
    - go microservices
    - gin
---

## Visión General

Gin es un framework HTTP rápido y de baja asignación de memoria para Go. Agrega
routing, cadenas de middleware reutilizables, binding de requests y manejo de
errores sobre el paquete estándar `net/http`. Esta receta muestra cómo construir
una API REST pequeña pero lista para producción, con middleware custom,
validación, errores estructurados y graceful shutdown.

## Cuándo Usar

- Necesitás un framework HTTP rápido y liviano para servicios en Go.
- Los cross-cutting concerns como logging, auth y métricas deben ser reutilizables
  entre endpoints.
- La API sirve a SPAs, clientes mobile u otros backends. Consultá
  [Llamar REST API](/recipes/call-rest-api/) para patrones de cliente.

## Solución

### Setup básico del servidor

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

### Middleware custom

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

Usá el middleware en `main.go`:

```go
r := gin.New()
r.Use(middleware.Logger(), gin.Recovery())

api := r.Group("/api/v1")
api.Use(middleware.AuthRequired())
```

### Validación de requests

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

    // Reemplazá con tu lógica real de persistencia.
    user := gin.H{"id": 1, "name": req.Name, "email": req.Email, "age": req.Age}
    c.JSON(http.StatusCreated, user)
}
```

### Manejo estructurado de errores

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

Adjuntá errores al contexto con `c.Error()` en handlers o middleware. El error
handler corre después de `c.Next()` y escribe una respuesta consistente.

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

## Explicación

Gin mantiene el procesamiento de requests rápido mediante un árbol radix para
routing y pocas asignaciones de memoria para JSON. Cada request pasa por la
cadena de middleware en el orden en que se registró; `c.Next()` continúa con el
siguiente handler, mientras que `c.Abort()` detiene la cadena.

El paquete `binding` valida y llena una struct desde JSON, query o form data. Es
un atajo sobre el parsing manual, pero solo indica que el input cumple las
reglas. Siempre agregá validación de negocio propia donde corresponda.

El error handler al final de la cadena inspecciona `c.Errors`. Los errores
adjuntos con `c.Error()` se acumulan ahí. Esto evita que los handlers escriban la
respuesta dos veces y mantiene el formato final consistente.

El graceful shutdown envuelve el `http.Server` de la librería estándar. Inicia el
server en una goroutine, espera una señal de interrupción y luego da a los
requests en vuelo un tiempo para terminar antes de cerrar.

## Variantes

### Route groups con rate limiting

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

Para un limiter por cliente, guardá un limiter por IP o por user ID. Para
despliegues distribuidos, mové el limiter a Redis. Consultá
[Rate Limiting with Redis](/recipes/api-rate-limiting-redis/) para esa
configuración.

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

## Mejores Prácticas

- Llamá `gin.SetMode(gin.ReleaseMode)` en producción para deshabilitar debug
  logging y color output.
- Usá `gin.New()` en lugar de `gin.Default()` cuando querés controlar
  exactamente qué middleware corre y en qué orden.
- Preferí logging estructurado con `zap` o `zerolog` en lugar del paquete
  estándar `log`.
- Mantené el middleware pequeño y enfocado. Uno para logging, otro para auth,
  otro para errores. Mezclar responsabilidades dificulta los tests.
- Devolvé formas de error consistentes desde los handlers y dejá que el
  middleware de errores haga el formateo final.
- Corré load tests sobre los percentiles más lentos, no solo sobre la latencia
  promedio.

## Errores Comunes

- Usar `gin.Default()` y luego agregar middleware que conflictúa con el logger o
  recovery built-in.
- Olvidar `c.Next()` en el middleware, de modo que el handler nunca corre.
- Llamar `c.Abort()` sin escribir una respuesta, dejando al cliente colgado.
- Mantener conexiones a base de datos en el context sin un pool de conexiones.
- Confiar solo en la validación del binding para reglas de negocio.
- Devolver errores crudos a los clientes en lugar de un `APIError`
  estructurado.

## Preguntas Frecuentes

### ¿Cómo se compara Gin con el paquete estándar `net/http`?

Gin agrega routing, middleware, binding de requests y recuperación de panics con
mínimo overhead. Para APIs muy pequeñas, `net/http` con un router como `chi`
también es suficiente.

### ¿Puedo usar Gin con gRPC?

Sí. Podés correr servidores gRPC y HTTP lado a lado, o usar `grpc-gateway` para
exponer endpoints HTTP generados desde definiciones protobuf.

### ¿Cómo estructuro una aplicación Gin grande?

Agrupá rutas por dominio con `gin.RouterGroup`. Mantené archivos de rutas por
dominio (`routes/users.go`, `routes/orders.go`) y registrá todo en `main.go`.
Pasá las dependencias a los handlers a través de una struct en lugar de variables
globales, y usá repositorios basados en interfaces para que los handlers sean
fáciles de testear.

### ¿Cómo valido request bodies?

Usá tags `binding` en los campos de la struct y llamá `c.ShouldBindJSON(&req)`.
Para reglas custom, registrá un validador con `binding.Validator` o validá
manualmente después del binding. Usá `ShouldBindJSON` en lugar de `BindJSON` para
poder formatear la respuesta de error a tu gusto.

### ¿Cómo manejo graceful shutdown?

Envolvé `gin.Engine` dentro de un `http.Server`, iniciá el server en una
goroutine, esperá `SIGINT` o `SIGTERM` y luego llamá `server.Shutdown(ctx)` con
un timeout. Cerrá conexiones a base de datos y flusheá logs después de que
termine el shutdown.

### ¿Cómo implemento rate limiting?

Usá un token bucket como `golang.org/x/time/rate` como middleware. Para una sola
instancia, un limiter por IP de cliente funciona. Para sistemas distribuidos,
usá un limiter respaldado en Redis e incluí un header `Retry-After` en las
respuestas `429`.

### ¿Cómo testeo handlers de Gin?

Usá `httptest.NewRecorder()` y `router.ServeHTTP` para llamar handlers sin
levantar un server. Creá un router con dependencias mockeadas y asertá sobre el
status code, body y headers.

### ¿Cómo manejo errores consistentemente?

Definí una struct `APIError` pequeña con `code` y `message`. Devolvé esos errores
desde los servicios, adjuntalos con `c.Error()` y dejá que un middleware de
errores escriba el JSON final. Logueá el error original con un request ID para
tracing.

### ¿Cómo uso Gin con OpenAPI/Swagger?

Usá `swaggo/swag` para generar docs OpenAPI desde anotaciones. Agregá comentarios
`@Summary`, `@Param` y `@Router` arriba de cada handler, ejecutá `swag init` y
serví la UI con `ginSwagger`. Mantené las anotaciones sincronizadas con las
signatures de los handlers.

### ¿Cómo aseguro rutas con JWT?

Extraé el token del header `Authorization: Bearer <token>`, validalo con una
librería JWT y guardá el user ID en el contexto con `c.Set()`. Devolvé `401` para
tokens inválidos o expirados.

### ¿Cómo implemento health checks?

Registrá un endpoint `/health` que devuelva `200` con `{"status": "healthy"}`.
Para readiness, agregá `/health/ready` que haga ping a bases de datos o servicios
externos y devuelva `503` si alguna dependencia está caída. Mantené el liveness
check ligero.
