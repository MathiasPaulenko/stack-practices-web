---
contentType: recipes
slug: api-versioning
title: "Versionado de APIs"
description: "Cómo versionar APIs REST y GraphQL para mantener compatibilidad hacia atrás mientras evolucionas tu interfaz."
metaDescription: "Aprende estrategias de versionado de APIs REST y GraphQL en Python, JavaScript y Java. Cubre versionado por URL, header y media-type con patrones de migración."
difficulty: intermediate
topics:
  - api
tags:
  - api
  - versioning
  - rest
  - graphql
  - backward-compatibility
  - python
  - javascript
  - java
relatedResources:
  - /recipes/call-rest-api
  - /recipes/handle-errors
  - /recipes/rate-limiting
  - /recipes/input-validation
  - /recipes/logging
lastUpdated: "2026-06-11"
author: "StackPractices"
seo:
  metaDescription: "Aprende estrategias de versionado de APIs REST y GraphQL en Python, JavaScript y Java. Cubre versionado por URL, header y media-type con patrones de migración."
  keywords:
    - api
    - versionado
    - rest
    - graphql
    - compatibilidad
    - python
    - javascript
    - java
---
## Visión General

Las APIs evolucionan: se añaden campos, cambian las formas de respuesta y se deprecan endpoints. Sin una estrategia de versionado, estos cambios rompen clientes existentes. Esta receta cubre los tres enfoques dominantes de versionado — ruta URL, header personalizado y negociación de contenido (media type) — con implementación de middleware en Python, JavaScript y Java. También cubre políticas de deprecación y patrones de cambio compatible hacia atrás.

## Cuándo Usar

Usa este recurso cuando:
- Publiques una API pública consumida por clientes externos que no puedes actualizar simultáneamente
- Introduzcas cambios rotos (campos eliminados, recursos renombrados, nuevos requisitos de auth)
- Soportes múltiples generaciones de clientes (apps móviles, integraciones de terceros, widgets embebidos)
- Planifiques una migración a largo plazo desde una forma legada de API a un diseño moderno

## Solución

### Python (Flask + Versionado por Ruta URL)

```python
from flask import Flask, jsonify, request

app = Flask(__name__)

# Registro de blueprints versionados
from v1 import users as users_v1
from v2 import users as users_v2

app.register_blueprint(users_v1.bp, url_prefix="/api/v1/users")
app.register_blueprint(users_v2.bp, url_prefix="/api/v2/users")

# Alternativa basada en header
@app.before_request
def version_from_header():
    version = request.headers.get("X-API-Version", "v1")
    request.api_version = version

@app.route("/api/users/<int:id>")
def get_user(id):
    if request.api_version == "v2":
        return jsonify({"id": id, "full_name": "Alice", "email": "alice@example.com"})
    return jsonify({"id": id, "name": "Alice"})

# Negociación de contenido (header Accept)
@app.route("/api/users")
def list_users():
    accept = request.headers.get("Accept", "")
    if "application/vnd.myapp.v2+json" in accept:
        return jsonify({"users": [{"full_name": "Alice"}]})
    return jsonify({"users": [{"name": "Alice"}]})
```

### JavaScript (Express + Versionado por Ruta URL)

```javascript
import express from "express";

const app = express();

// Versionado a nivel de ruta
app.use("/api/v1/users", (await import("./routes/v1/users.js")).default);
app.use("/api/v2/users", (await import("./routes/v2/users.js")).default);

// Versionado basado en middleware
function apiVersion(req, res, next) {
  req.apiVersion = req.headers["x-api-version"] || "v1";
  next();
}

app.get("/api/users/:id", apiVersion, (req, res) => {
  if (req.apiVersion === "v2") {
    return res.json({ id: req.params.id, full_name: "Alice", email: "alice@example.com" });
  }
  res.json({ id: req.params.id, name: "Alice" });
});

// Negociación de contenido
app.get("/api/users", (req, res) => {
  const accept = req.get("Accept") || "";
  if (accept.includes("application/vnd.myapp.v2+json")) {
    return res.json({ users: [{ full_name: "Alice" }] });
  }
  res.json({ users: [{ name: "Alice" }] });
});
```

### Java (Spring Boot + Ruta URL y Header)

```java
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;

@RestController
public class UserController {

  // Versionado por ruta URL
  @GetMapping("/api/v1/users/{id}")
  public UserV1 getUserV1(@PathVariable Long id) {
    return new UserV1(id, "Alice");
  }

  @GetMapping("/api/v2/users/{id}")
  public UserV2 getUserV2(@PathVariable Long id) {
    return new UserV2(id, "Alice", "alice@example.com");
  }

  // Versionado por header
  @GetMapping(value = "/api/users/{id}", headers = "X-API-Version=v1")
  public UserV1 getUserHeaderV1(@PathVariable Long id) {
    return getUserV1(id);
  }

  @GetMapping(value = "/api/users/{id}", headers = "X-API-Version=v2")
  public UserV2 getUserHeaderV2(@PathVariable Long id) {
    return getUserV2(id);
  }

  // Negociación de contenido (produces)
  @GetMapping(value = "/api/users/{id}", produces = "application/vnd.myapp.v2+json")
  public UserV2 getUserMediaV2(@PathVariable Long id) {
    return getUserV2(id);
  }
}

record UserV1(Long id, String name) {}
record UserV2(Long id, String fullName, String email) {}
```

## Explicación

- **Versionado por ruta URL** (`/v1/`, `/v2/`) es el más simple y amigable con caches. Es visible, fácil de documentar y funciona con todo cliente HTTP. La contrapartida es que ensucia la URL y obliga a los clientes a cambiar URLs por cada actualización rotosa.
- **Versionado por header** (`X-API-Version: v2`) mantiene URLs limpias pero requiere headers personalizados, que algunos clientes (navegadores, scripts simples) pueden no soportar bien. Es más difícil de cachear a nivel CDN sin reglas custom.
- **Negociación de contenido** (`Accept: application/vnd.myapp.v2+json`) es el enfoque más RESTful. Usa mecanismos HTTP estándar pero es complejo para consumidores y puede confundir con expectativas de `application/json` estándar.
- **Compatibilidad hacia atrás** significa cambios solo aditivos dentro de una versión: nuevos campos opcionales, nuevos endpoints y enums expandidos son seguros. Eliminar o renombrar campos requiere una nueva versión.
- **Deprecación** debe señalarse con headers `Sunset` y documentación de changelog, dando a los clientes una ventana clara de migración (típicamente 6-12 meses para APIs públicas).

## Variantes

| Estrategia | Mecanismo | Ideal Para |
|------------|-----------|------------|
| Ruta URL | `/api/v1/resource` | APIs públicas, caching simple, soporte amplio de clientes |
| Header Personalizado | `X-API-Version: v2` | APIs internas, URLs limpias, routing consciente de CDN |
| Media Type | `Accept: application/vnd.app.v2+json` | Diseño RESTful estricto, APIs orientadas a contenido |
| Query Parameter | `?version=v2` | Prototipado rápido, implementación más simple para clientes |

## Mejores Prácticas

1. **Empieza con versionado por ruta URL** — es el más descubrible y no requiere lógica especial del cliente.
2. **Nunca rompas versiones existentes** — una vez publicada una versión, mantenla hasta una fecha de sunset publicada.
3. **Documenta los cambios explícitamente** — publica un changelog con guías de migración y ejemplos de diff para cada cambio de versión.
4. **Versiona solo en cambios rotos** — cambios aditivos (campos opcionales nuevos) no requieren nueva versión.
5. **Comunica la deprecación proactivamente** — usa headers `Sunset`, notificaciones por email y headers de respuesta (`Deprecation: true`) bien antes de la eliminación.

## Errores Comunes

1. Subir la versión por cada cambio menor, fragmentando el ecosistema de clientes.
2. Eliminar versiones antiguas sin un período de sunset, rompiendo integraciones de producción de la noche a la mañana.
3. Mezclar estrategias de versionado inconsistentemente entre endpoints de la misma API.
4. No validar identificadores de versión, provocando que `v1.0` y `v1` se traten como versiones diferentes accidentalmente.
5. Retornar diferentes códigos de estado o formas de error entre versiones sin documentarlos.

## Preguntas Frecuentes

### ¿Cuándo debería lanzar una nueva versión de API?

Solo por cambios rotos: campos eliminados, recursos renombrados, requisitos de auth cambiados o comportamiento alterado del que dependen clientes existentes. Cambios aditivos (campos opcionales nuevos, endpoints nuevos) no requieren subir la versión.

### ¿Puedo soportar múltiples versiones con la misma base de código?

Sí. Usa controladores o handlers de ruta versionados que deleguen a servicios compartidos. Mantén la lógica específica de versión delgada (serialización y validación) y la lógica de negocio agnóstica de versión. Spring Boot, Express y Flask soportan este patrón limpiamente.

### ¿Cuánto tiempo debería mantener una versión antigua de API?

Para APIs públicas: 12-24 meses con avisos activos de deprecación. Para APIs internas: 3-6 meses o hasta que todos los clientes conocidos migren. Siempre monitorea tráfico a versiones antiguas y contacta usuarios activos antes del sunset.
