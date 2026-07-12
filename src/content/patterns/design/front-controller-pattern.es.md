---


contentType: patterns
slug: front-controller-pattern
title: "Patrón Front Controller"
description: "Enruta todas las peticiones entrantes a través de un único handler que despacha al comando de página apropiado, centralizando el procesamiento de requests y seguridad."
metaDescription: "Aprende el Patrón Front Controller para manejo centralizado de requests en web apps. Ejemplos en Python, Java y JavaScript con routing y dispatch."
difficulty: intermediate
topics:
  - design
tags:
  - front-controller
  - pattern
  - design-pattern
  - structural
  - web
  - routing
  - mvc
relatedResources:
  - /patterns/page-controller-pattern
  - /patterns/model-view-presenter-pattern
  - /patterns/facade-pattern
  - /patterns/model-view-viewmodel-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Front Controller para manejo centralizado de requests en web apps. Ejemplos en Python, Java y JavaScript con routing y dispatch."
  keywords:
    - front controller
    - design pattern
    - routing
    - web
    - mvc


---

# Patrón Front Controller

## Descripción General

El Patrón Front Controller enruta todas las peticiones entrantes a través de un único punto de entrada — un handler central que procesa cada request y lo despacha al comando o controlador apropiado. En lugar de que cada página maneje su propio parsing de request, autenticación y logging, el Front Controller centraliza estos concerns transversales.

Este es el patrón detrás de virtualmente todos los frameworks web modernos. El `DispatcherServlet` de Spring Boot, el handler WSGI de Django y las cadenas de middleware de Express.js encarnan principios de Front Controller. Un handler recibe cada request, realiza procesamiento común, luego delega a un controlador específico de página.

## Cuándo Usar

Usa el Patrón Front Controller cuando:
- Múltiples páginas comparten preprocesamiento común (autenticación, logging, encoding)
- Quieres un sistema de routing de URLs limpio e independiente de la estructura de archivos
- El manejo de requests necesita ser consistente a través de toda la aplicación
- Necesitas manejo centralizado de errores y chequeos de seguridad

## Cuándo Evitar

- Aplicaciones muy simples con solo unas pocas páginas (overhead sin beneficio)
- Sitios estáticos donde cada página puede servirse directamente
- Cuando el front controller se convierte en un God object manejando demasiadas responsabilidades

## Solución

### Python

```python
from typing import Callable, Dict
from http.server import BaseHTTPRequestHandler, HTTPServer

class Request:
    def __init__(self, path: str, method: str, headers: dict):
        self.path = path
        self.method = method
        self.headers = headers

class Response:
    def __init__(self, body: str, status: int = 200):
        self.body = body
        self.status = status

class FrontController:
    def __init__(self):
        self._handlers: Dict[str, Callable] = {}

    def register(self, path: str, handler: Callable):
        self._handlers[path] = handler

    def dispatch(self, request: Request) -> Response:
        # Preprocesamiento común
        if not self._authenticate(request):
            return Response("Unauthorized", 401)

        handler = self._handlers.get(request.path)
        if handler:
            return handler(request)
        return Response("Not Found", 404)

    def _authenticate(self, request: Request) -> bool:
        return request.headers.get("Authorization") == "Bearer valid"


def home_handler(request: Request) -> Response:
    return Response("Welcome to the home page")

def user_handler(request: Request) -> Response:
    return Response("User profile page")


# Setup
controller = FrontController()
controller.register("/", home_handler)
controller.register("/user", user_handler)

# Uso
req = Request("/user", "GET", {"Authorization": "Bearer valid"})
resp = controller.dispatch(req)
print(resp.status, resp.body)
```

### Java

```java
import java.util.*;

public record Request(String path, String method, Map<String, String> headers) {}
public record Response(String body, int status) {
    public Response(String body) { this(body, 200); }
}

@FunctionalInterface
interface RequestHandler {
    Response handle(Request request);
}

class FrontController {
    private final Map<String, RequestHandler> handlers = new HashMap<>();

    public void register(String path, RequestHandler handler) {
        handlers.put(path, handler);
    }

    public Response dispatch(Request request) {
        if (!authenticate(request)) {
            return new Response("Unauthorized", 401);
        }
        RequestHandler handler = handlers.get(request.path());
        if (handler != null) {
            return handler.handle(request);
        }
        return new Response("Not Found", 404);
    }

    private boolean authenticate(Request request) {
        return "Bearer valid".equals(request.headers().get("Authorization"));
    }
}

// Handlers
class HomeHandler implements RequestHandler {
    public Response handle(Request request) {
        return new Response("Welcome to the home page");
    }
}

class UserHandler implements RequestHandler {
    public Response handle(Request request) {
        return new Response("User profile page");
    }
}

// Uso
FrontController controller = new FrontController();
controller.register("/", new HomeHandler());
controller.register("/user", new UserHandler());

Request req = new Request("/user", "GET", Map.of("Authorization", "Bearer valid"));
Response resp = controller.dispatch(req);
System.out.println(resp.status() + " " + resp.body());
```

### JavaScript

```javascript
class Request {
  constructor(path, method, headers) {
    this.path = path;
    this.method = method;
    this.headers = headers;
  }
}

class Response {
  constructor(body, status = 200) {
    this.body = body;
    this.status = status;
  }
}

class FrontController {
  constructor() {
    this.handlers = new Map();
  }

  register(path, handler) {
    this.handlers.set(path, handler);
  }

  dispatch(request) {
    if (!this.authenticate(request)) {
      return new Response('Unauthorized', 401);
    }
    const handler = this.handlers.get(request.path);
    if (handler) {
      return handler(request);
    }
    return new Response('Not Found', 404);
  }

  authenticate(request) {
    return request.headers.authorization === 'Bearer valid';
  }
}

// Handlers
const homeHandler = (req) => new Response('Welcome to the home page');
const userHandler = (req) => new Response('User profile page');

// Setup
const controller = new FrontController();
controller.register('/', homeHandler);
controller.register('/user', userHandler);

// Uso
const req = new Request('/user', 'GET', { authorization: 'Bearer valid' });
const resp = controller.dispatch(req);
console.log(resp.status, resp.body);
```

## Explicación

El Front Controller centraliza:

- **Parsing de requests**: URL decoding, extracción de parámetros, content negotiation
- **Preprocesamiento**: Autenticación, autorización, validación de input
- **Routing**: Mapeo de URLs al controlador de página correcto
- **Postprocesamiento**: Logging, métricas, formato de respuesta
- **Manejo de errores**: Conversión de excepciones en códigos de estado HTTP

## Variantes

| Variante | Mecanismo | Caso de Uso |
|----------|-----------|-------------|
| **Servlet Filter** | Cadena de filters en Java web apps | Autenticación, encoding, compresión |
| **Middleware** | Stack de middleware Express.js / Django | Procesamiento cross-cutting de requests |
| **Dispatcher** | Spring MVC `DispatcherServlet` | Framework MVC completo con view resolution |
| **Reverse Proxy** | Nginx / Apache como front controller | Load balancing, SSL termination, caching |

## Lo que funciona

- **Mantén el controller lean.** Delega lógica de página a command objects o sub-controllers dedicados.
- **Usa una routing table.** Mapea patrones de URL a handlers declarativamente en lugar de if-else anidados.
- **Procesa concerns comunes primero.** Autenticación, protección CSRF y sanitización de input pertenecen aquí.
- **Soporta interceptors.** Permite que middleware modifique requests y responses sin cambiar el core.
- **Retorna temprano para errores.** Requests inválidos deberían fallar fast antes de llegar a lógica de página.

## Errores Comunes

- **Front Controller bloated** que sabe demasiado sobre lógica de página. Debería despachar, no implementar.
- **Acoplamiento fuerte a tecnología de view específica.** El controller no debería generar HTML directamente.
- **Ignorar semántica HTTP.** Retornar 200 para cada response esconde errores de los clientes.
- **Missing error boundaries.** Excepciones no manejadas filtran stack traces a los usuarios.
- **Bloqueo síncrono.** El front controller no debería realizar operaciones de larga duración inline.

## Ejemplos del Mundo Real

### Spring MVC

`DispatcherServlet` es el Front Controller. Recibe todos los HTTP requests, resuelve controllers vía anotaciones y delega renderizado de views a `ViewResolver`.

### Django

La aplicación WSGI de Django actúa como Front Controller. El routing de URLs (`urls.py`) mapea requests entrantes a views después del procesamiento de middleware.

### Express.js

Las apps de Express usan un objeto app central con middleware. `app.use(auth)` y `app.get('/user', handler)` construyen un pipeline de Front Controller.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Front Controller y Page Controller?**
A: [Page Controller](/patterns/design/page-controller-pattern) usa un controlador por página. Front Controller usa un único punto de entrada para toda la aplicación.

**Q: Todos los web frameworks usan Front Controller?**
A: La mayoría de los frameworks modernos sí. El modelo original de PHP (un archivo por página) es el approach alternativo de Page Controller.

**Q: Puede un Front Controller manejar conexiones WebSocket?**
A: Sí. El punto de entrada inspecciona el upgrade header y enruta a un WebSocket handler o un HTTP handler según corresponda.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
