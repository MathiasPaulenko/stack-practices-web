---
contentType: patterns
slug: page-controller-pattern
title: "Patrón Page Controller"
description: "Usa un objeto controlador dedicado para cada página lógica en una aplicación web, manejando el request y poblando la view para esa página específica."
metaDescription: "Aprende el Patrón Page Controller con un controlador por página. Ejemplos en Python, Java y JavaScript para manejo de requests y población de views."
difficulty: beginner
topics:
  - design
tags:
  - page-controller
  - pattern
  - design-pattern
  - structural
  - web
  - mvc
  - controller
relatedResources:
  - /patterns/design/front-controller-pattern
  - /patterns/design/model-view-presenter-pattern
  - /patterns/design/model-view-viewmodel-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Page Controller con un controlador por página. Ejemplos en Python, Java y JavaScript para manejo de requests y población de views."
  keywords:
    - page controller
    - design pattern
    - web
    - mvc
    - controller
---

# Patrón Page Controller

## Descripción General

El Patrón Page Controller usa un objeto controlador dedicado para cada página lógica en una aplicación web. Cada controlador maneja requests HTTP para una página específica: parseando parámetros, invocando lógica de negocio y seleccionando la view apropiada para renderizar. A diferencia de Front Controller, no hay un único punto de entrada — cada página tiene su propio handler.

Este patrón es más simple que Front Controller para aplicaciones pequeñas. Es la estructura natural del modelo original de PHP (un archivo `.php` por página) y muchos frameworks web tempranos. A medida que las aplicaciones crecen, Page Controller puede evolucionar hacia Front Controller con una capa de routing.

## Cuándo Usar

Usa el Patrón Page Controller cuando:
- La aplicación tiene un número pequeño de páginas
- Cada página tiene lógica de procesamiento distinta e independiente
- Quieres la estructura más simple posible sin un framework de routing
- La estructura de URLs mapea naturalmente uno-a-uno con controladores de página

## Cuándo Evitar

- La aplicación tiene muchas páginas con preprocesamiento compartido (usa Front Controller)
- El routing de URLs necesita ser dinámico o RESTful
- Concerns transversales como autenticación necesitarían duplicarse en cada controlador
- El número de páginas hace que mantener controladores separados sea incómodo

## Solución

### Python

```python
from typing import Dict

class Request:
    def __init__(self, path: str, params: Dict[str, str]):
        self.path = path
        self.params = params

class Response:
    def __init__(self, body: str, status: int = 200):
        self.body = body
        self.status = status


class HomePageController:
    def handle(self, request: Request) -> Response:
        return Response("<h1>Home Page</h1><p>Welcome!</p>")


class UserProfileController:
    def handle(self, request: Request) -> Response:
        user_id = request.params.get("id", "guest")
        return Response(f"<h1>User Profile</h1><p>User ID: {user_id}</p>")


class OrderHistoryController:
    def __init__(self, order_service):
        self.order_service = order_service

    def handle(self, request: Request) -> Response:
        user_id = request.params.get("user_id")
        orders = self.order_service.get_orders(user_id)
        html = "<h1>Order History</h1><ul>"
        for order in orders:
            html += f"<li>Order {order['id']}: ${order['total']}</li>"
        html += "</ul>"
        return Response(html)


# Simple router mapeando paths a controladores
controllers = {
    "/": HomePageController(),
    "/user": UserProfileController(),
    "/orders": OrderHistoryController(order_service={"get_orders": lambda uid: [{"id": 1, "total": 99.99}]}),
}

def handle_request(request: Request) -> Response:
    controller = controllers.get(request.path)
    if controller:
        return controller.handle(request)
    return Response("Not Found", 404)


# Uso
req = Request("/user", {"id": "42"})
resp = handle_request(req)
print(resp.status, resp.body)
```

### Java

```java
import java.util.*;

public record Request(String path, Map<String, String> params) {}
public record Response(String body, int status) {
    public Response(String body) { this(body, 200); }
}

public interface PageController {
    Response handle(Request request);
}

class HomePageController implements PageController {
    public Response handle(Request request) {
        return new Response("<h1>Home Page</h1><p>Welcome!</p>");
    }
}

class UserProfileController implements PageController {
    public Response handle(Request request) {
        String userId = request.params().getOrDefault("id", "guest");
        return new Response("<h1>User Profile</h1><p>User ID: " + userId + "</p>");
    }
}

class OrderHistoryController implements PageController {
    public Response handle(Request request) {
        String userId = request.params().get("user_id");
        List<Map<String, Object>> orders = fetchOrders(userId);
        StringBuilder html = new StringBuilder("<h1>Order History</h1><ul>");
        for (Map<String, Object> order : orders) {
            html.append("<li>Order ").append(order.get("id")).append("</li>");
        }
        html.append("</ul>");
        return new Response(html.toString());
    }

    private List<Map<String, Object>> fetchOrders(String userId) {
        return List.of(Map.of("id", 1, "total", 99.99));
    }
}

// Router
class SimpleRouter {
    private final Map<String, PageController> controllers = new HashMap<>();

    public void register(String path, PageController controller) {
        controllers.put(path, controller);
    }

    public Response handle(Request request) {
        PageController controller = controllers.get(request.path());
        if (controller != null) {
            return controller.handle(request);
        }
        return new Response("Not Found", 404);
    }
}

// Uso
SimpleRouter router = new SimpleRouter();
router.register("/", new HomePageController());
router.register("/user", new UserProfileController());

Request req = new Request("/user", Map.of("id", "42"));
Response resp = router.handle(req);
System.out.println(resp.status() + " " + resp.body());
```

### JavaScript

```javascript
class Request {
  constructor(path, params) {
    this.path = path;
    this.params = params;
  }
}

class Response {
  constructor(body, status = 200) {
    this.body = body;
    this.status = status;
  }
}

class HomePageController {
  handle(request) {
    return new Response('<h1>Home Page</h1><p>Welcome!</p>');
  }
}

class UserProfileController {
  handle(request) {
    const userId = request.params.id || 'guest';
    return new Response(`<h1>User Profile</h1><p>User ID: ${userId}</p>`);
  }
}

class OrderHistoryController {
  handle(request) {
    const userId = request.params.user_id;
    const orders = [{ id: 1, total: 99.99 }];
    const html = `<h1>Order History</h1><ul>${
      orders.map(o => `<li>Order ${o.id}: $${o.total}</li>`).join('')
    }</ul>`;
    return new Response(html);
  }
}

// Router
const controllers = {
  '/': new HomePageController(),
  '/user': new UserProfileController(),
  '/orders': new OrderHistoryController(),
};

function handleRequest(request) {
  const controller = controllers[request.path];
  if (controller) {
    return controller.handle(request);
  }
  return new Response('Not Found', 404);
}

// Uso
const req = new Request('/user', { id: '42' });
const resp = handleRequest(req);
console.log(resp.status, resp.body);
```

## Explicación

Cada Page Controller:

- **Recibe** el request HTTP para su página específica
- **Parsea** parámetros del request y valida input
- **Invoca** lógica de negocio (services, repositories)
- **Selecciona** la view y la puebla con datos
- **Retorna** la response renderizada

El patrón mantiene la lógica de página aislada. Agregar una nueva página significa agregar un nuevo controlador sin tocar los existentes.

## Variantes

| Variante | Estructura | Caso de Uso |
|----------|------------|-------------|
| **Classic Page Controller** | Una clase/archivo por página | Aplicaciones pequeñas, estilo PHP |
| **Front Controller + Command** | Punto de entrada único con command objects | Apps más grandes con preprocesamiento compartido |
| **REST Controller** | Un controlador por recurso | APIs con operaciones CRUD |
| **Component-based** | Framework enruta a métodos | Spring `@Controller`, ASP.NET MVC |

## Lo que Funciona

- **Mantén controladores thin.** La lógica de negocio pertenece a services, no a controladores.
- **Usa una clase base** para concerns compartidos si no usas Front Controller.
- **Valida input temprano.** Rechaza requests malformados antes de llamar services.
- **Selecciona views por convención.** `UserProfileController` → `user_profile.html` reduce configuración.
- **Retorna el HTTP status correcto.** 404 para recursos faltantes, 400 para input malo, 500 para errores de servidor.

## Errores Comunes

- **Lógica de negocio en controladores** los hace difíciles de testear y reutilizar.
- **Duplicar autenticación** en cada controlador en lugar de usar un filter o clase base.
- **Acoplamiento fuerte al template de view.** El controlador debería pasar datos, no generar HTML inline.
- **Sin separación entre GET y POST.** Manejar ambos en un método sin chequear el verbo.
- **Exponer IDs internos** directamente en URLs sin validación.

## Ejemplos del Mundo Real

### Classic PHP

Cada archivo `.php` es un page controller. `user.php` maneja la página de perfil de usuario directamente. No existe un router central.

### ASP.NET Web Forms

Cada página `.aspx` tiene un archivo code-behind que actúa como su Page Controller, manejando eventos y data binding.

### Ruby on Rails (parcial)

Aunque Rails usa Front Controller a nivel de framework, cada clase de controlador (`UsersController`, `OrdersController`) sigue principios de Page Controller para sus acciones.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Page Controller y Front Controller?**
A: [Front Controller](/patterns/design/front-controller-pattern) enruta todo a través de un handler. Page Controller le da a cada página su propio handler.

**Q: Puedo combinar ambos patrones?**
A: Sí. Un Front Controller maneja concerns compartidos, luego delega a Page Controllers para lógica específica de página. La mayoría de los frameworks modernos funcionan así.

**Q: Es Page Controller solo para web apps?**
A: Principalmente sí, pero el concepto aplica a cualquier UI donde cada pantalla tiene lógica distinta (apps de escritorio, apps móviles).
