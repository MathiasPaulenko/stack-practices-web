---
contentType: patterns
slug: intercepting-filter-pattern
title: "Patrón Intercepting Filter"
description: "Compone cross-cutting concerns en una cadena de filtros pluggeables que interceptan requests y responses, habilitando lógica de preprocesamiento y postprocesamiento reusable."
metaDescription: "Aprende el Patrón Intercepting Filter para pipelines de request/response. Ejemplos en Python, Java y JavaScript con cadenas de filtros, decoradores y middleware."
difficulty: intermediate
topics:
  - design
  - architecture
tags:
  - intercepting-filter
  - pattern
  - design-pattern
  - behavioral
  - architecture
  - middleware
  - pipeline
relatedResources:
  - /patterns/design/chain-of-responsibility-pattern
  - /patterns/design/decorator-pattern
  - /patterns/design/proxy-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Intercepting Filter para pipelines de request/response. Ejemplos en Python, Java y JavaScript con cadenas de filtros, decoradores y middleware."
  keywords:
    - intercepting filter
    - design pattern
    - architecture
    - middleware
    - pipeline
---

# Patrón Intercepting Filter

## Descripción General

El Patrón Intercepting Filter compone cross-cutting concerns en una cadena de filtros pluggeables que interceptan requests y responses. Cada filtro realiza una tarea específica de preprocesamiento o postprocesamiento (autenticación, logging, compresión, validación) y delega al siguiente filtro en la cadena. El target final (un servlet, handler o controller) procesa la lógica de negocio core.

Este patrón es la fundación de HTTP middleware en web frameworks, servlet filters en Java EE, y pipelines de middleware de ASP.NET Core. Permite que los concerns sean agregados, removidos o reordenados sin modificar el core request handler.

## Cuándo Usar

Usa el Patrón Intercepting Filter cuando:
- Los cross-cutting concerns (auth, logging, caching) deberían ser reutilizados a través de múltiples handlers
- El procesamiento de request/response necesita etapas de preprocesamiento o postprocesamiento
- Necesitas un pipeline flexible y configurable donde filtros pueden ser agregados o reordenados
- Múltiples handlers comparten el mismo set de cross-cutting concerns

## Cuándo Evitar

- Un único handler con concerns one-off únicos (un decorator simple basta)
- Paths críticos de performance donde el overhead de pipeline es inaceptable
- Cuando las dependencias de ordenamiento de filtros se vuelven complejas y difíciles de razonar
- Aplicaciones simples donde llamadas directas de método son más claras

## Solución

### Python

```python
from abc import ABC, abstractmethod
from typing import Dict, Any
from dataclasses import dataclass

@dataclass
class HttpRequest:
    path: str
    headers: Dict[str, str]
    body: Any = None
    user: Any = None
    authenticated: bool = False

@dataclass
class HttpResponse:
    status: int = 200
    headers: Dict[str, str] = None
    body: Any = None

    def __post_init__(self):
        if self.headers is None:
            self.headers = {}


class Filter(ABC):
    """Filtro base que puede encadenar al siguiente filtro"""
    def __init__(self, next_filter: 'Filter' = None):
        self.next_filter = next_filter

    @abstractmethod
    def do_filter(self, request: HttpRequest, response: HttpResponse):
        pass

    def _invoke_next(self, request: HttpRequest, response: HttpResponse):
        if self.next_filter:
            self.next_filter.do_filter(request, response)


class AuthenticationFilter(Filter):
    """Verifica si el request tiene un token válido"""
    def do_filter(self, request: HttpRequest, response: HttpResponse):
        token = request.headers.get("Authorization")
        if token and token.startswith("Bearer "):
            request.user = "authenticated_user"
            request.authenticated = True
            self._invoke_next(request, response)
        else:
            response.status = 401
            response.body = {"error": "Unauthorized"}


class LoggingFilter(Filter):
    """Loguea detalles del request antes y después de procesar"""
    def do_filter(self, request: HttpRequest, response: HttpResponse):
        print(f"[LOG] Request a {request.path}")
        self._invoke_next(request, response)
        print(f"[LOG] Response status: {response.status}")


class CompressionFilter(Filter):
    """Comprime body de response si el cliente lo acepta"""
    def do_filter(self, request: HttpRequest, response: HttpResponse):
        self._invoke_next(request, response)
        if "gzip" in request.headers.get("Accept-Encoding", ""):
            response.headers["Content-Encoding"] = "gzip"
            print("[COMPRESS] Response comprimida")


class TargetHandler(Filter):
    """El handler final que procesa el request core"""
    def __init__(self):
        super().__init__(None)

    def do_filter(self, request: HttpRequest, response: HttpResponse):
        if response.status == 200:
            response.body = {"message": f"Hola, {request.user or 'invitado'}!"}


class FilterChain:
    """Construye y ejecuta el pipeline de filtros"""
    def __init__(self):
        self.filters: list[type[Filter]] = []

    def add_filter(self, filter_cls):
        self.filters.append(filter_cls)
        return self

    def execute(self, request: HttpRequest) -> HttpResponse:
        target = TargetHandler()
        current = target
        for filter_cls in reversed(self.filters):
            new_filter = filter_cls()
            new_filter.next_filter = current
            current = new_filter

        response = HttpResponse()
        current.do_filter(request, response)
        return response


# Uso
chain = FilterChain()
chain.add_filter(AuthenticationFilter) \
     .add_filter(LoggingFilter) \
     .add_filter(CompressionFilter)

request = HttpRequest(
    path="/api/hello",
    headers={"Authorization": "Bearer abc123", "Accept-Encoding": "gzip"}
)
response = chain.execute(request)
print(f"Resultado: {response.status} - {response.body}")
```

### Java

```java
import java.util.*;

class HttpRequest {
    private final String path;
    private final Map<String, String> headers;
    private String user;
    private boolean authenticated;

    public HttpRequest(String path, Map<String, String> headers) {
        this.path = path; this.headers = headers;
    }
    public String getPath() { return path; }
    public Map<String, String> getHeaders() { return headers; }
    public String getUser() { return user; }
    public void setUser(String user) { this.user = user; }
    public boolean isAuthenticated() { return authenticated; }
    public void setAuthenticated(boolean auth) { this.authenticated = auth; }
}

class HttpResponse {
    private int status = 200;
    private final Map<String, String> headers = new HashMap<>();
    private Object body;

    public int getStatus() { return status; }
    public void setStatus(int status) { this.status = status; }
    public Map<String, String> getHeaders() { return headers; }
    public Object getBody() { return body; }
    public void setBody(Object body) { this.body = body; }
}

interface Filter {
    void doFilter(HttpRequest request, HttpResponse response, FilterChain chain);
}

class FilterChain {
    private final List<Filter> filters = new ArrayList<>();
    private int currentIndex = 0;

    public void addFilter(Filter filter) { filters.add(filter); }

    public void doFilter(HttpRequest request, HttpResponse response) {
        if (currentIndex < filters.size()) {
            Filter filter = filters.get(currentIndex++);
            filter.doFilter(request, response, this);
        }
    }
}

class AuthenticationFilter implements Filter {
    public void doFilter(HttpRequest request, HttpResponse response, FilterChain chain) {
        String token = request.getHeaders().get("Authorization");
        if (token != null && token.startsWith("Bearer ")) {
            request.setUser("authenticated_user");
            request.setAuthenticated(true);
            chain.doFilter(request, response);
        } else {
            response.setStatus(401);
            response.setBody(Map.of("error", "Unauthorized"));
        }
    }
}

class LoggingFilter implements Filter {
    public void doFilter(HttpRequest request, HttpResponse response, FilterChain chain) {
        System.out.println("[LOG] Request a " + request.getPath());
        chain.doFilter(request, response);
        System.out.println("[LOG] Response status: " + response.getStatus());
    }
}

class TargetHandler implements Filter {
    public void doFilter(HttpRequest request, HttpResponse response, FilterChain chain) {
        if (response.getStatus() == 200) {
            response.setBody("Hola, " + (request.getUser() != null ? request.getUser() : "invitado") + "!");
        }
    }
}

// Uso
HttpRequest request = new HttpRequest("/api/hello", Map.of(
    "Authorization", "Bearer abc123",
    "Accept-Encoding", "gzip"
));
HttpResponse response = new HttpResponse();

FilterChain chain = new FilterChain();
chain.addFilter(new AuthenticationFilter());
chain.addFilter(new LoggingFilter());
chain.addFilter(new TargetHandler());
chain.doFilter(request, response);

System.out.println("Resultado: " + response.getStatus() + " - " + response.getBody());
```

### JavaScript

```javascript
class HttpRequest {
  constructor(path, headers) {
    this.path = path;
    this.headers = headers;
    this.user = null;
    this.authenticated = false;
  }
}

class HttpResponse {
  constructor() {
    this.status = 200;
    this.headers = {};
    this.body = null;
  }
}

class FilterChain {
  constructor() {
    this.filters = [];
    this.index = 0;
  }

  addFilter(filter) {
    this.filters.push(filter);
    return this;
  }

  doFilter(request, response) {
    if (this.index < this.filters.length) {
      const filter = this.filters[this.index++];
      filter.doFilter(request, response, this);
    }
  }
}

class AuthenticationFilter {
  doFilter(request, response, chain) {
    const token = request.headers['Authorization'];
    if (token && token.startsWith('Bearer ')) {
      request.user = 'authenticated_user';
      request.authenticated = true;
      chain.doFilter(request, response);
    } else {
      response.status = 401;
      response.body = { error: 'Unauthorized' };
    }
  }
}

class LoggingFilter {
  doFilter(request, response, chain) {
    console.log(`[LOG] Request a ${request.path}`);
    chain.doFilter(request, response);
    console.log(`[LOG] Response status: ${response.status}`);
  }
}

class CompressionFilter {
  doFilter(request, response, chain) {
    chain.doFilter(request, response);
    const encoding = request.headers['Accept-Encoding'] || '';
    if (encoding.includes('gzip')) {
      response.headers['Content-Encoding'] = 'gzip';
      console.log('[COMPRESS] Response comprimida');
    }
  }
}

class TargetHandler {
  doFilter(request, response, chain) {
    if (response.status === 200) {
      response.body = { message: `Hola, ${request.user || 'invitado'}!` };
    }
  }
}

// Uso
const request = new HttpRequest('/api/hello', {
  Authorization: 'Bearer abc123',
  'Accept-Encoding': 'gzip',
});
const response = new HttpResponse();

const chain = new FilterChain();
chain.addFilter(new AuthenticationFilter())
     .addFilter(new LoggingFilter())
     .addFilter(new CompressionFilter())
     .addFilter(new TargetHandler());

chain.doFilter(request, response);
console.log('Resultado:', response.status, response.body);
```

## Explicación

El Patrón Intercepting Filter estructura el procesamiento de requests como un pipeline:

1. **El request llega** al entry point de la cadena de filtros
2. **Cada filtro** puede inspeccionar, modificar, o cortocircuitar el request
3. **Los filtros delegan** al siguiente filtro vía `chain.doFilter()`
4. **El handler target** ejecuta la lógica de negocio core
5. **Postprocesamiento** ocurre mientras el call stack se desenrolla (response filters)

Los filtros están ordenados. La autenticación debería correr antes de autorización, que debería correr antes de caching. El orden es configurable en runtime.

## Variantes

| Variante | Mecanismo | Caso de Uso |
|----------|-----------|-------------|
| **Cadena lineal** | Cada filtro llama al siguiente | Web middleware estándar |
| **Decoradores** | Object wrapping | Composición funcional |
| **Event-driven** | Filtros se suscriben a eventos | Sistemas altamente desacoplados |
| **Pipeline DAG** | Grafo dirigido acíclico de etapas | Procesamiento complejo de datos |

## Lo que funciona

- **Ordena filtros cuidadosamente.** Autenticación antes de autorización antes de caching.
- **Haz filtros stateless.** La seguridad de threads depende de instancias de filtros stateless.
- **Cortocircuita ante fallo.** Un fallo de auth debería detener la cadena, no continuar.
- **Usa la cadena para request y response.** Postprocesamiento en el path de unwinding.
- **Documenta dependencias de filtros.** El orden importa; haz las constraints explícitas.

## Errores Comunes

- **Orden de filtros equivocado.** Cachear antes de auth cachea responses no autorizados.
- **Filtros stateful.** Las race conditions ocurren con estado a nivel de instancia.
- **Tragar excepciones.** Un error en un filtro no debería silenciosamente romper la cadena.
- **Demasiados filtros.** Cada uno agrega overhead; consolida concerns relacionados.
- **Modificar request body sin copiar.** Los filtros no deberían mutar estado compartido de forma inesperada.

## Ejemplos del Mundo Real

### Servlet Filters (Java EE)

La interfaz `javax.servlet.Filter` define `doFilter(request, response, chain)`. Los filtros se configuran en `web.xml` o vía anotaciones `@WebFilter`.

### Express.js Middleware

Las funciones middleware de Express son Intercepting Filters: `app.use((req, res, next) => { ... next() })`. La llamada `next()` es la delegación de cadena.

### ASP.NET Core Middleware

ASP.NET Core construye el request pipeline con `app.Use()`, `app.Map()`, y clases middleware custom implementando `Invoke()`.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Intercepting Filter y Chain of Responsibility?**
A: Chain of Responsibility tiene múltiples handlers, cualquiera de los cuales puede procesar el request. Intercepting Filter tiene un único target, con todos los filtros contribuyendo pre/postprocesamiento.

**Q: Cómo manejo excepciones en una cadena de filtros?**
A: Usa un filtro dedicado de manejo de errores al final, o envuelve la ejecución de la cadena en un try-catch que produce un error response.

**Q: Pueden los filtros modificar la response de regreso?**
A: Sí. El postprocesamiento ocurre naturalmente después de que `chain.doFilter()` retorna en cada filtro.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
