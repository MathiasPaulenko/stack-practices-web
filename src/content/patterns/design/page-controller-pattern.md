---

contentType: patterns
slug: page-controller-pattern
title: "Page Controller Pattern"
description: "Use a dedicated controller object for each logical page in a web application, handling the request and populating the view for that specific page."
metaDescription: "Learn the Page Controller Pattern with one controller per page. Examples in Python, Java, and JavaScript for request handling and view population."
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
  - /patterns/front-controller-pattern
  - /patterns/model-view-presenter-pattern
  - /patterns/model-view-viewmodel-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Page Controller Pattern with one controller per page. Examples in Python, Java, and JavaScript for request handling and view population."
  keywords:
    - page controller
    - design pattern
    - web
    - mvc
    - controller

---

# Page Controller Pattern

## Overview

The Page Controller Pattern uses a dedicated controller object for each logical page in a web application. Each controller handles HTTP requests for one specific page: parsing parameters, invoking business logic, and selecting the appropriate view to render. Unlike Front Controller, there is no single entry point — each page has its own handler.

This pattern is simpler than Front Controller for small applications. It is the natural structure of PHP's original model (one `.php` file per page) and many early web frameworks. As applications grow, Page Controller can evolve into Front Controller with a routing layer.

## When to Use

Use the Page Controller Pattern when:
- The application has a small number of pages
- Each page has distinct and independent processing logic
- You want the simplest possible structure without a routing framework
- The URL structure naturally maps one-to-one with page controllers

## When to Avoid

- The application has many pages with shared preprocessing (use Front Controller)
- URL routing needs to be dynamic or RESTful
- Cross-cutting concerns like authentication would need to be duplicated in every controller
- The number of pages makes maintaining separate controllers unwieldy

## Solution

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


# Simple router mapping paths to controllers
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


# Usage
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

// Usage
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

// Usage
const req = new Request('/user', { id: '42' });
const resp = handleRequest(req);
console.log(resp.status, resp.body);
```

## Explanation

Each Page Controller:

- **Receives** the HTTP request for its specific page
- **Parses** request parameters and validates input
- **Invokes** business logic (services, repositories)
- **Selects** the view and populates it with data
- **Returns** the rendered response

The pattern keeps page logic isolated. Adding a new page means adding a new controller without touching existing ones.

## Variants

| Variant | Structure | Use Case |
|---------|-----------|----------|
| **Classic Page Controller** | One class/file per page | Small applications, PHP-style |
| **Front Controller + Command** | Single entry with command objects | Larger apps with shared preprocessing |
| **REST Controller** | One controller per resource | APIs with CRUD operations |
| **Component-based** | Framework routes to methods | Spring `@Controller`, ASP.NET MVC |

## What Works

- **Keep controllers thin.** Business logic belongs in services, not controllers.
- **Use a base class** for shared concerns if not using Front Controller.
- **Validate input early.** Reject malformed requests before calling services.
- **Select views by convention.** `UserProfileController` → `user_profile.html` reduces configuration.
- **Return the correct HTTP status.** 404 for missing resources, 400 for bad input, 500 for server errors.

## Common Mistakes

- **Business logic in controllers** makes them hard to test and reuse.
- **Duplicating authentication** in every controller instead of using a filter or base class.
- **Tight coupling to the view template.** The controller should pass data, not generate HTML inline.
- **No separation between GET and POST.** Handling both in one method without checking the verb.
- **Exposing internal IDs** directly in URLs without validation.

## Real-World Examples

### Classic PHP

Each `.php` file is a page controller. `user.php` handles the user profile page directly. No central router exists.

### ASP.NET Web Forms

Each `.aspx` page has a code-behind file that acts as its Page Controller, handling events and data binding.

### Ruby on Rails (partial)

While Rails uses Front Controller at the framework level, each controller class (`UsersController`, `OrdersController`) follows Page Controller principles for its actions.

## Frequently Asked Questions

**Q: What is the difference between Page Controller and Front Controller?**
A: [Front Controller](/patterns/design/front-controller-pattern) routes everything through one handler. Page Controller gives each page its own handler.

**Q: Can I combine both patterns?**
A: Yes. A Front Controller handles shared concerns, then delegates to Page Controllers for page-specific logic. Most modern frameworks work this way.

**Q: Is Page Controller only for web apps?**
A: Primarily yes, but the concept applies to any UI where each screen has distinct logic (desktop apps, mobile apps).

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
