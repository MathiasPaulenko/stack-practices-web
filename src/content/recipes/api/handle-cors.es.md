---
contentType: recipes
slug: handle-cors
title: "Manejo Correcto de CORS"
description: "Cómo configurar headers de Cross-Origin Resource Sharing (CORS) correctamente para APIs, SPAs y funciones serverless sin abrir agujeros de seguridad."
metaDescription: "Aprende configuración de CORS en Python, JavaScript y Java. Cubre preflight requests, credenciales, orígenes permitidos y errores comunes de seguridad CORS."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - cors
  - http
relatedResources:
  - /recipes/call-rest-api
  - /recipes/api-versioning
  - /recipes/handle-errors
  - /recipes/rate-limiting
  - /recipes/input-validation
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende configuración de CORS en Python, JavaScript y Java. Cubre preflight requests, credenciales, orígenes permitidos y errores comunes de seguridad CORS."
  keywords:
    - cors
    - seguridad
    - api
    - http
    - headers
    - python
    - javascript
    - java
---
## Visión General

Cross-Origin Resource Sharing (CORS) es un mecanismo de seguridad del navegador que controla qué orígenes pueden acceder a los recursos de tu API. Un CORS mal configurado es una de las fuentes más comunes de fricción en la integración frontend-backend y de vulnerabilidades de seguridad. Esta receta cubre la implementación de middleware CORS apropiado con validación de allowlist, manejo de preflight, soporte de credenciales y declaraciones explícitas de headers/métodos en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Tu frontend (SPA, app móvil, widget de terceros) corre en un origen distinto al de tu [API](/recipes/api/call-rest-api)
- Necesites soportar requests cross-origin autenticados con cookies o headers de autorización
- Estés construyendo una API pública consumida por múltiples dominios externos
- Estés debuggeando misteriosos errores de navegador "CORS policy" en llamadas a APIs

## Solución

### Python (Flask)

```python
from flask import Flask, request, make_response
from urllib.parse import urlparse

app = Flask(__name__)

ALLOWED_ORIGINS = {
    "https://app.example.com",
    "https://admin.example.com",
    "http://localhost:3000",
}
ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"]
ALLOWED_HEADERS = ["Content-Type", "Authorization", "X-Request-ID"]
ALLOW_CREDENTIALS = True

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin")

    # Solo refleja orígenes permitidos; nunca uses "*" con credenciales
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"

    if ALLOW_CREDENTIALS:
        response.headers["Access-Control-Allow-Credentials"] = "true"

    return response

@app.route("/api/<path:path>", methods=["OPTIONS"])
def handle_preflight(path):
    origin = request.headers.get("Origin")
    if origin not in ALLOWED_ORIGINS:
        return make_response(("", 204))  # Sin headers CORS para orígenes no permitidos

    response = make_response(("", 204))
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Methods"] = ", ".join(ALLOWED_METHODS)
    response.headers["Access-Control-Allow-Headers"] = ", ".join(ALLOWED_HEADERS)
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Max-Age"] = "86400"
    return response
```

### JavaScript (Express)

```javascript
import express from "express";

const app = express();

const ALLOWED_ORIGINS = new Set([
  "https://app.example.com",
  "https://admin.example.com",
  "http://localhost:3000",
]);

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }

  res.header("Access-Control-Allow-Credentials", "true");

  // Request de preflight
  if (req.method === "OPTIONS") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return res.sendStatus(204);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID");
    res.header("Access-Control-Max-Age", "86400");
    return res.sendStatus(204);
  }

  next();
}

app.use(corsMiddleware);
app.use(express.json());

// Alternativa: usando el paquete cors con allowlist explícito
// import cors from "cors";
// app.use(cors({
//   origin: (origin, callback) => {
//     if (!origin || ALLOWED_ORIGINS.has(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error("Not allowed by CORS"));
//     }
//   },
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
//   allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
// }));
```

### Java (Spring Boot)

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig {

  private static final String[] ALLOWED_ORIGINS = {
    "https://app.example.com",
    "https://admin.example.com",
    "http://localhost:3000"
  };

  @Bean
  public WebMvcConfigurer corsConfigurer() {
    return new WebMvcConfigurer() {
      @Override
      public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
          .allowedOrigins(ALLOWED_ORIGINS)
          .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH")
          .allowedHeaders("Content-Type", "Authorization", "X-Request-ID")
          .allowCredentials(true)
          .maxAge(86400);
      }
    };
  }
}

// Integración con Spring Security (si usas SecurityFilterChain)
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http.cors(cors -> {})
        .csrf(csrf -> csrf.disable()) // solo si la API es stateless con tokens
        .authorizeHttpRequests(auth -> auth
          .requestMatchers("/api/**").authenticated()
          .anyRequest().permitAll()
        );
    // Consulta [Checklist de Seguridad de APIs](/guides/security/api-security-checklist-guide) para patrones de autenticación.
    return http.build();
  }
}
```

## Explicación

- **Same-Origin Policy** los navegadores bloquean requests de `origin-a.com` a `origin-b.com` por defecto. CORS es una relajación controlada de esta política.
- **Preflight (OPTIONS)** los navegadores envían un request de preflight para métodos no simples (PUT, DELETE, PATCH) y headers custom. El servidor debe responder con orígenes, métodos y headers permitidos.
- **`Access-Control-Allow-Origin`** debe ser una coincidencia exacta (`https://app.example.com`) o `*`. Nunca uses `*` cuando `Access-Control-Allow-Credentials: true` está seteado — los navegadores rechazan esta combinación.
- **`Vary: Origin`** es crítico cuando sirves headers CORS distintos según el origen del request. Sin él, los CDNs pueden cachear una respuesta con un header de origen y servirla a requests de orígenes diferentes.
- **`Access-Control-Allow-Credentials`** habilita cookies y headers de autorización en requests cross-origin. Tanto el cliente (`withCredentials: true` / `credentials: 'include'`) como el servidor deben optar por esto.

## Variantes

| Enfoque | Configuración | Ideal Para |
|---------|-------------|------------|
| Allowlist | Lista explícita de orígenes | APIs de producción con consumidores conocidos |
| Patrón regex | `*.example.com` | Wildcards de subdominios (valida cuidadosamente) |
| Origen dinámico | Origen validado en runtime | APIs multi-tenant con orígenes por tenant |
| Wildcard `*` | Sin restricción de origen | APIs públicas de solo lectura sin credenciales |
| Proxy | Frontend proxy a API | Desarrollo, deployment de mismo origen |

## Mejores Prácticas

1. **Nunca uses `*` con credenciales** — los navegadores rechazan `Access-Control-Allow-Origin: *` cuando `Allow-Credentials: true`. Siempre refleja el origen del request si está en tu allowlist.
2. **Valida orígenes explícitamente** — mantén una allowlist de orígenes exactos. No hagas parseo o regex-match de orígenes sin validación cuidadosa para evitar bypasses.
3. **Setea `Vary: Origin`** — cuando los headers CORS varían por origen, añade `Vary: Origin` para que los caches no sirvan respuestas cross-origin a los dominios equivocados.
4. **Mantén max-age de preflight razonable** — `86400` (1 día) es típico. Muy largo retrasa la propagación de cambios de política CORS; muy corto desperdicia requests de preflight.
5. **Restringe métodos y headers permitidos** — solo declara los métodos HTTP y headers que tu API realmente soporta. Un CORS sobre-permisivo expande la superficie de ataque.

## Errores Comunes

1. Setear `Access-Control-Allow-Origin: *` y preguntarse por qué las cookies no funcionan cross-origin.
2. Reflejar el header `Origin` del request sin validación, permitiendo que cualquier sitio web llame a tu API.
3. Olvidar manejar el preflight `OPTIONS`, causando errores CORS del navegador en requests PUT/DELETE.
4. No setear `Vary: Origin`, llevando a cache poisoning de CDN donde la respuesta de un origen se sirve a otro.
5. Habilitar `allowCredentials` en APIs públicas sin validación de origen, exponiendo endpoints autenticados a sitios maliciosos. Consulta [Checklist de Seguridad de APIs](/guides/security/api-security-checklist-guide) para validación de origen.

## Preguntas Frecuentes

### ¿Por qué mi API funciona en Postman pero falla en el navegador?

Postman no es un navegador — no aplica la Same-Origin Policy ni CORS. Los navegadores bloquean respuestas de requests cross-origin a menos que el servidor envíe los headers `Access-Control-Allow-*` apropiados. Testea la configuración CORS con DevTools reales del navegador o herramientas como `curl` con el header `Origin`.

### ¿Puedo usar un wildcard para subdominios como `*.example.com`?

No directamente en `Access-Control-Allow-Origin`. El header requiere una coincidencia exacta de origen. Puedes validar orígenes dinámicamente: verifica si el origen del request termina en `.example.com` en runtime y refleja el origen exacto de vuelta. Spring Boot `allowedOriginPatterns` soporta esto; en Express/Flask, implementa validación de origen custom.

### ¿Necesito CORS si despliego mi frontend y API en el mismo dominio?

No. CORS solo aplica cuando el origen (scheme + host + port) del frontend difiere del de la API. Si ambos corren en `https://example.com` (o la API está en un subdominio con configuración apropiada), no se necesitan headers CORS. Usar un [reverse proxy](/recipes/api/nginx-reverse-proxy) (nginx) para rutear `/api` a tu backend es una estrategia común de deployment de mismo origen.
