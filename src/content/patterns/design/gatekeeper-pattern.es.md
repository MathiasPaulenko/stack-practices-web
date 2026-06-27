---
contentType: patterns
slug: gatekeeper-pattern
title: "Patrón Gatekeeper"
description: "Coloca un boundary de validación y seguridad en el edge del sistema para inspeccionar, sanitizar y autenticar todas las requests entrantes antes de que alcancen servicios internos."
metaDescription: "Aprende el Patrón Gatekeeper para validación en el edge. Ejemplos en Python, Java y JavaScript con API gateways, WAF, verificación JWT y sanitización."
difficulty: intermediate
topics:
  - design
  - architecture
  - security
tags:
  - gatekeeper
  - pattern
  - design-pattern
  - security
  - edge
  - validation
  - api-gateway
  - waf
relatedResources:
  - /patterns/design/throttling-pattern
  - /patterns/design/content-delivery-network-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Gatekeeper para validación en el edge. Ejemplos en Python, Java y JavaScript con API gateways, WAF, verificación JWT y sanitización."
  keywords:
    - gatekeeper
    - design pattern
    - security
    - edge
    - validation
    - api gateway
    - waf
---

# Patrón Gatekeeper

## Descripción General

El Patrón Gatekeeper coloca un boundary de validación y seguridad dedicado en el edge de un sistema para inspeccionar, sanitizar, autenticar y autorizar todas las requests entrantes antes de que alcancen los servicios internos. En lugar de embeber cheques de seguridad en cada servicio, un gatekeeper centralizado maneja preocupaciones cross-cutting — validación de tokens, rate limiting, sanitización de input, terminación TLS, y protección DDoS — en un único chokepoint.

El gatekeeper actúa como un reverse proxy con inteligencia. Rechaza requests malformados, bloquea tráfico no autorizado, remueve headers sensibles, y reenvía solo requests limpias y validadas a los servicios backend. Esto reduce la superficie de ataque de los servicios internos y centraliza la aplicación de políticas de seguridad.

Las implementaciones comunes incluyen API gateways (Kong, AWS API Gateway), reverse proxies con WAF (Nginx + ModSecurity, Cloudflare), ingress de service mesh (Istio Gateway), y middleware a nivel de aplicación.

## Cuándo Usar

Usa el Patrón Gatekeeper cuando:
- Múltiples servicios backend comparten requerimientos de seguridad y validación comunes
- Necesitas autenticación centralizada, rate limiting o protección DDoS
- Los servicios internos no deberían ser expuestos directamente a internet
- El compliance requiere logging y auditoría unificados de todas las requests externas

## Cuándo Evitar

- La aplicación es un único servicio donde validación en el edge no agrega valor
- La latencia en el edge es inaceptable (aplicaciones de ultra-baja latencia)
- El gatekeeper se convierte en cuello de botella o single point of failure
- La lógica de validación específica de servicio es demasiado compleja para generalizar en el edge

## Solución

### Python (FastAPI + Middleware Gatekeeper Personalizado)

```python
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import re
import time
from typing import Dict, Set
import jwt

app = FastAPI()

class GatekeeperMiddleware(BaseHTTPMiddleware):
    """Valida, sanitiza y autentica requests en el edge"""

    # Patrones bloqueados
    BLOCKED_PATHS = {"/admin", "/internal", "/debug"}
    SQL_INJECTION_PATTERNS = [
        r"(\b(union|select|insert|update|delete|drop)\b)",
        r"(--|;|--\s|/\*|\*/)",
        r"(\b(or|and)\b\s+\d+\s*=\s*\d+)"
    ]

    # Estado de rate limiting
    request_counts: Dict[str, list] = {}
    RATE_LIMIT = 100  # requests por ventana
    RATE_WINDOW = 60  # segundos

    # JWT secret
    JWT_SECRET = "your-secret-key"
    JWT_ALGORITHM = "HS256"

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host

        # 1. Validación de path
        if self._is_blocked_path(request.url.path):
            return JSONResponse(
                status_code=403,
                content={"error": "Acceso denegado", "code": "BLOCKED_PATH"}
            )

        # 2. Rate limiting
        if self._is_rate_limited(client_ip):
            return JSONResponse(
                status_code=429,
                content={"error": "Rate limit excedido", "code": "RATE_LIMITED"}
            )

        # 3. Sanitización de input
        if self._contains_injection(request):
            return JSONResponse(
                status_code=400,
                content={"error": "Request malformado", "code": "INJECTION_DETECTED"}
            )

        # 4. Autenticación
        auth_result = self._authenticate(request)
        if not auth_result["valid"]:
            return JSONResponse(
                status_code=401,
                content={"error": auth_result["error"], "code": "AUTH_FAILED"}
            )

        # Adjuntar info de usuario autenticado al estado de request
        request.state.user = auth_result.get("user")
        request.state.request_id = f"req-{int(time.time() * 1000)}"

        # Reenviar a servicio backend
        response = await call_next(request)

        # 5. Headers de seguridad
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Request-ID"] = request.state.request_id

        return response

    def _is_blocked_path(self, path: str) -> bool:
        return any(path.startswith(blocked) for blocked in self.BLOCKED_PATHS)

    def _is_rate_limited(self, client_ip: str) -> bool:
        now = time.time()
        window_start = now - self.RATE_WINDOW

        # Limpiar entradas viejas y contar ventana actual
        self.request_counts[client_ip] = [
            t for t in self.request_counts.get(client_ip, [])
            if t > window_start
        ]

        if len(self.request_counts[client_ip]) >= self.RATE_LIMIT:
            return True

        self.request_counts[client_ip].append(now)
        return False

    def _contains_injection(self, request: Request) -> bool:
        # Revisar query params y path para patrones de inyección SQL
        target = f"{request.url.path}?{request.url.query}"
        return any(re.search(pattern, target, re.IGNORECASE)
                  for pattern in self.SQL_INJECTION_PATTERNS)

    def _authenticate(self, request: Request) -> dict:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return {"valid": False, "error": "Header de autorización inválido o ausente"}

        token = auth_header[7:]
        try:
            payload = jwt.decode(token, self.JWT_SECRET, algorithms=[self.JWT_ALGORITHM])
            return {"valid": True, "user": payload}
        except jwt.ExpiredSignatureError:
            return {"valid": False, "error": "Token expirado"}
        except jwt.InvalidTokenError:
            return {"valid": False, "error": "Token inválido"}


# Registrar middleware
app.add_middleware(GatekeeperMiddleware)

# Rutas backend (protegidas por gatekeeper)
@app.get("/api/users/me")
async def get_current_user(request: Request):
    user = request.state.user
    return {"user_id": user["sub"], "email": user["email"]}

@app.get("/api/products")
async def list_products():
    return {"products": [{"id": 1, "name": "Widget"}]}
```

### Java (Spring Cloud Gateway con Filtros)

```java
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import java.util.List;

@Component
class GatekeeperFilter extends AbstractGatewayFilterFactory<GatekeeperFilter.Config> {

    private final JwtValidator jwtValidator;
    private final RateLimiter rateLimiter;

    public GatekeeperFilter(JwtValidator jwtValidator, RateLimiter rateLimiter) {
        super(Config.class);
        this.jwtValidator = jwtValidator;
        this.rateLimiter = rateLimiter;
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();

            // 1. Bloquear paths internos
            String path = request.getPath().value();
            if (isBlockedPath(path)) {
                exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
                return exchange.getResponse().setComplete();
            }

            // 2. Rate limiting
            String clientIp = request.getRemoteAddress().getAddress().getHostAddress();
            if (!rateLimiter.allowRequest(clientIp)) {
                exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
                return exchange.getResponse().setComplete();
            }

            // 3. Autenticación
            String authHeader = request.getHeaders().getFirst("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            }

            String token = authHeader.substring(7);
            if (!jwtValidator.isValid(token)) {
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            }

            // 4. Agregar headers de seguridad y reenviar
            ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                .header("X-Request-ID", generateRequestId())
                .header("X-Authenticated", "true")
                .build();

            return chain.filter(exchange.mutate().request(mutatedRequest).build());
        };
    }

    private boolean isBlockedPath(String path) {
        return path.startsWith("/admin") || path.startsWith("/internal");
    }

    private String generateRequestId() {
        return java.util.UUID.randomUUID().toString();
    }

    public static class Config {
        // Propiedades de configuración
    }
}
```

### JavaScript (Middleware Express.js Edge)

```javascript
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');

const app = express();

// 1. Headers de seguridad (Helmet)
app.use(helmet());

// 2. Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // requests por ventana
  message: { error: 'Rate limit excedido', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 3. Middleware de bloqueo de paths
const blockedPaths = ['/admin', '/internal', '/debug', '/.env', '/wp-admin'];
app.use((req, res, next) => {
  if (blockedPaths.some(path => req.path.startsWith(path))) {
    return res.status(403).json({ error: 'Acceso denegado', code: 'BLOCKED_PATH' });
  }
  next();
});

// 4. Sanitización de input
const sqlInjectionPattern = /(\b(union|select|insert|update|delete|drop)\b|--|;)/i;
app.use((req, res, next) => {
  const target = `${req.path}?${new URLSearchParams(req.query).toString()}`;
  if (sqlInjectionPattern.test(target)) {
    return res.status(400).json({ error: 'Request malformado', code: 'INJECTION_DETECTED' });
  }
  next();
});

// 5. Autenticación JWT
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
app.use('/api/protected', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autenticación requerida', code: 'AUTH_FAILED' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    req.requestId = `req-${Date.now()}`;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido', code: 'AUTH_FAILED' });
  }
});

// Rutas backend
app.get('/api/protected/users/me', (req, res) => {
  res.json({ userId: req.user.sub, requestId: req.requestId });
});

app.get('/api/public/products', (req, res) => {
  res.json({ products: [{ id: 1, name: 'Widget' }] });
});

app.listen(3000, () => console.log('Gatekeeper corriendo en puerto 3000'));
```

## Explicación

El Gatekeeper opera como un **perímetro defensivo** con capas:

1. **Capa de red**: Terminación TLS, mitigación DDoS, IP allowlisting
2. **Capa de request**: Bloqueo de paths, validación de métodos, límites de tamaño
3. **Capa de seguridad**: Autenticación, autorización, validación de tokens
4. **Capa de aplicación**: Sanitización de input, validación de schema, rate limiting
5. **Capa de observabilidad**: Propagación de request ID, logging, métricas

Cada request debe pasar todas las capas antes de alcanzar los servicios internos. Los requests rechazados se loguean para monitoreo de seguridad y nunca consumen recursos de backend.

## Variantes

| Variante | Tecnología | Caso de Uso |
|----------|-----------|-------------|
| **API Gateway** | Kong, AWS API Gateway, Azure APIM | Edge full-featured con plugins/políticas |
| **Reverse Proxy + WAF** | Nginx + ModSecurity, Cloudflare | Protección a nivel de red con rulesets |
| **Ingress de Service Mesh** | Istio Gateway, Linkerd | Nativo de Kubernetes, mTLS entre servicios |
| **Edge CDN** | Cloudflare Workers, Lambda@Edge | Computo en el edge para validación dinámica |
| **Middleware de Aplicación** | Express, FastAPI, Spring | Control a nivel de código, sin infra adicional |

## Mejores Prácticas

- **Fallar cerrado (fail closed).** Si el gatekeeper no puede validar un request, recházalo en lugar de reenviar tráfico incierto.
- **Usar defensa en profundidad.** Gatekeeper + auth a nivel de servicio + permisos de base de datos.
- **Loguear y monitorear requests rechazados.** Los patrones en rechazos revelan intentos de ataque.
- **Versionar reglas del gatekeeper.** Rastrear cambios de reglas en Git, desplegar via CI/CD.
- **Testear escenarios de bypass.** Asegurar que los servicios internos no sean directamente accesibles si el gatekeeper falla.

## Errores Comunes

- **Confiar en tráfico de red interna.** Los servicios internos todavía deberían validar requests — el modelo "zero trust".
- **Sobrecargar el gatekeeper.** La lógica de negocio compleja pertenece a los servicios, no al edge.
- **Sin circuit breaker para el gatekeeper.** Si el gatekeeper falla, el tráfico no debería pasar desinspeccionado.
- **Secrets hardcodeados en reglas.** Los secrets JWT, API keys y certificados deberían ser inyectados de forma segura.
- **Ignorar falsos positivos.** Reglas WAF demasiado agresivas bloquean usuarios legítimos; ajustar con tráfico de producción.

## Ejemplos del Mundo Real

### Cloudflare

Cloudflare se sienta al frente de millones de websites como gatekeeper: protección DDoS, reglas WAF, detección de bots, y terminación TLS todos ocurren en el edge antes de que el tráfico alcance los servidores origen.

### AWS API Gateway

API Gateway actúa como gatekeeper para backends Lambda y EC2. Maneja throttling, validación de API keys, verificación JWT, transformación de requests, y logging de CloudWatch — todo antes de que la lógica de negocio se ejecute.

### GitHub

La infraestructura edge de GitHub usa HAProxy con módulos Lua personalizados para enrutamiento de requests, detección de abuso, y rate limiting. Solo requests validados y no abusivas alcanzan los servidores de aplicación Rails.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Gatekeeper y API Gateway?**
A: Un API Gateway es un tipo de gatekeeper con features adicionales (enrutamiento de requests, traducción de protocolos, caching). Un gatekeeper se enfoca específicamente en validación y seguridad.

**Q: El gatekeeper debería manejar autenticación o solo pasar tokens a los servicios?**
A: El gatekeeper debería validar tokens (firma, expiración) para rechazar requests inválidos temprano. Las decisiones de autorización ("este usuario puede acceder a este recurso?") pueden estar en el gatekeeper o a nivel de servicio dependiendo de la complejidad.

**Q: Cómo se relaciona Gatekeeper con Service Mesh?**
A: Un service mesh (Istio, Linkerd) agrega gatekeeping entre servicios (tráfico east-west), mientras que el gatekeeper tradicional maneja tráfico externo (north-south). Juntos proveen defensa en profundidad.

**Q: Qué pasa si el gatekeeper se convierte en cuello de botella?**
A: Escalar horizontalmente con load balancers, usar diseño stateless para replicación fácil, y descargar tareas de computo pesado (detección de bots) a servicios especializados o edge computing.
