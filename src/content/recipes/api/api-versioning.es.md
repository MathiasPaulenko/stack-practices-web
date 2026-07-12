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
  - http
  - backend
relatedResources:
  - /recipes/call-rest-api
  - /recipes/handle-errors
  - /recipes/rate-limiting
  - /recipes/input-validation
  - /recipes/logging
  - /recipes/grpc-api
  - /recipes/grpc-services-typescript
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
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

Las APIs evolucionan: se añaden campos, cambian las formas de respuesta y se [deprecan](/docs/api/api-deprecation-notice-template) endpoints. Sin una estrategia de versionado, estos cambios rompen clientes existentes. Lo siguiente cubre los tres enfoques dominantes de versionado — ruta URL, header personalizado y negociación de contenido (media type) — con implementación de middleware en Python, JavaScript y Java. También cubre políticas de deprecación y patrones de cambio compatible hacia atrás.

## Cuándo Usar

Usa este recurso cuando:
- Publiques una API pública consumida por clientes externos que no puedes actualizar simultáneamente
- Introduzcas [cambios rotos](/recipes/api/handle-errors) (campos eliminados, recursos renombrados, nuevos requisitos de auth)
- Soportes múltiples generaciones de clientes (apps móviles, integraciones de terceros, widgets embebidos)
- Planifiques una migración a largo plazo desde una forma legada de API a un diseño moderno. Consulta [Llamar REST API](/recipes/api/call-rest-api) para patrones de cliente.

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
- **Deprecación** debe señalarse con headers `Sunset` y documentación de changelog, dando a los clientes una ventana clara de migración. Consulta [Plantilla de Aviso de Deprecación de API](/docs/api/api-deprecation-notice-template) para comunicación de deprecación.

## Variantes

| Estrategia | Mecanismo | Ideal Para |
|------------|-----------|------------|
| Ruta URL | `/api/v1/resource` | APIs públicas, caching simple, soporte amplio de clientes |
| Header Personalizado | `X-API-Version: v2` | APIs internas, URLs limpias, routing consciente de CDN |
| Media Type | `Accept: application/vnd.app.v2+json` | Diseño RESTful estricto, APIs orientadas a contenido |
| Query Parameter | `?version=v2` | Prototipado rápido, implementación más simple para clientes |

## Lo que funciona

1. **Empieza con versionado por ruta URL** — es el más descubrible y no requiere lógica especial del cliente.
2. **Nunca rompas versiones existentes** — una vez publicada una versión, mantenla hasta una fecha de sunset publicada.
3. **Documenta los cambios explícitamente** — publica un changelog con guías de migración y ejemplos de diff para cada cambio de versión.
4. **Versiona solo en cambios rotos** — cambios aditivos (campos opcionales nuevos) no requieren nueva versión.
5. **Comunica la deprecación proactivamente** — usa headers `Sunset`, notificaciones por email y headers de respuesta (`Deprecation: true`) bien antes de la eliminación.

## Errores Comunes

1. Subir la versión por cada cambio menor, fragmentando el ecosistema de clientes. Consulta [Validación de Input](/recipes/api/input-validation) para cambios aditivos seguros.
2. Eliminar versiones antiguas sin un período de sunset, rompiendo integraciones de producción de la noche a la mañana.
3. Mezclar estrategias de versionado inconsistentemente entre endpoints de la misma API.
4. No validar identificadores de versión, provocando que `v1.0` y `v1` se traten como versiones diferentes accidentalmente.
5. Retornar diferentes códigos de estado o formas de error entre versiones sin documentarlos.

## Preguntas Frecuentes

### ¿Cuándo debería lanzar una nueva versión de API?

Solo por cambios rotos: campos eliminados, recursos renombrados, requisitos de auth cambiados o comportamiento alterado del que dependen clientes existentes. [Cambios aditivos](/recipes/api/input-validation) (campos opcionales nuevos, endpoints nuevos) no requieren subir la versión.

### ¿Puedo soportar múltiples versiones con la misma base de código?

Sí. Usa controladores o handlers de ruta versionados que deleguen a servicios compartidos. Mantén la lógica específica de versión delgada (serialización y validación) y la lógica de negocio agnóstica de versión. Spring Boot, Express y Flask soportan este patrón limpiamente.

### ¿Cuánto tiempo debería mantener una versión antigua de API?

Para APIs públicas: 12-24 meses con avisos activos de deprecación. Para APIs internas: 3-6 meses o hasta que todos los clientes conocidos migren. Siempre monitorea tráfico a versiones antiguas y contacta usuarios activos antes del sunset.

## Mejores Prácticas

- **Usa versionado por URL path para APIs públicas**: `/api/v1/users` es la estrategia más intuitiva y cacheable. Versionado por headers es elegante pero más difícil de debuggear y documentar. Versionado por path funciona con todos los clientes HTTP y proxies.
- **Haz que los breaking changes sean difíciles**: requiere review arquitectónico para cualquier cambio que rompa backward compatibility. El costo de una nueva versión (mantenimiento, documentación, migración de clientes) siempre es mayor que el costo de un cambio aditivo.
- **Documenta timelines de deprecación en headers**: retorna headers HTTP `Deprecation` y `Sunset` en endpoints deprecados. Esto da a clientes programáticos visibilidad sobre deadlines de migración sin leer docs.
- **Mantén un changelog por versión**: trackea qué cambió entre versiones, cuándo y por qué. Usa semantic versioning para APIs internas (v1.1.0) y major-only para APIs públicas (v1, v2).
- **Versiona tu response schema, no solo tus rutas**: incluso con la misma URL, los payloads de respuesta pueden evolucionar. Incluye una versión de schema en response metadata para que los clientes puedan detectar cambios de formato.
- **Provee guías de migración**: para cada bump de major version, publica una guía de migración con ejemplos side-by-side del comportamiento old vs new. Esto reduce tickets de soporte durante los periodos de transición.

## Checklist de Producción

- [ ] Estrategia de versionado es consistente across todos los endpoints de la API
- [ ] Endpoints deprecados retornan headers `Deprecation` y `Sunset`
- [ ] Timeline de deprecación está documentado y comunicado a consumidores de API
- [ ] Tráfico a versiones antiguas está monitoreado y alertado (notifica usuarios activos antes del sunset)
- [ ] Documentación version-specific existe para cada versión soportada
- [ ] Breaking changes requieren review arquitectónico y sign-off
- [ ] Rutas del API gateway están configuradas para todas las versiones activas
- [ ] Tests de integración corren against todas las versiones soportadas
- [ ] Changelog se mantiene por versión con fechas y rationale
- [ ] Guía de migración se publica antes de que el periodo de deprecación comience

## Consideraciones de Escalado

- **Complejidad de código con muchas versiones**: soportar 3+ versiones activas incrementa la complejidad de código exponencialmente. Cada versión necesita sus propios controllers, serializers y tests. Extrae lógica de negocio compartida en servicios version-agnostic y mantén las capas version-specific delgadas.
- **Costo de infraestructura**: cada versión activa requiere su propio deployment, monitoring y documentación. A 5+ versiones activas, los costos de infraestructura pueden duplicarse. Enforcea un máximo de 3 versiones activas y haz sunset agresivo de las viejas.
- **Migraciones de database schema**: APIs versionadas pueden necesitar diferentes database schemas. Usa view-based schemas o tablas separadas por versión para evitar conflictos de migración. Nunca rompas versiones viejas cambiando estructuras de tablas compartidas.
- **CDN caching por versión**: las respuestas de cada versión deben tener cache keys distintos. Incluye la versión en el URL path (no solo en headers) para asegurar que el CDN caching funcione correctamente. Versionado por headers requiere Vary headers, lo que reduce cache hit rates.

## Estimación de Costos

| Componente | Costo | Notas |
|-----------|------|-------|
| API Gateway (por versión) | $0-$50/mes | AWS API Gateway, per-stage |
| Documentation hosting (por versión) | $0-$20/mes | Stoplight, ReadMe, SwaggerHub |
| Load testing (por versión) | $0-$100/mes | k6 Cloud, BlazeMeter |
| Monitoring (por versión) | $50-$200/mes | Datadog, New Relic per service |
| Development overhead | 2-3 engineer-weeks | Por migración de major version |

Cada versión activa agrega ~$100-$400/mes en costos de infraestructura y tooling. El costo oculto es tiempo de ingeniería: mantener 3 versiones requiere ~30% de la capacidad del equipo de API para bug fixes, tests y documentación version-specific.

## Cuándo No Usar Este Enfoque

- **APIs internas con un solo cliente**: si controlas tanto la API como su único consumidor, deployea breaking changes atómicamente. Versionar agrega indirección innecesaria cuando puedes actualizar ambos lados en un release.
- **APIs de prototipo y MVP**: APIs early-stage cambian rápidamente. Versionar formalmente ralentiza la iteración. Usa un prefijo `v0` para señalar inestabilidad y skipea procesos de deprecación hasta que la API se estabilice.
- **APIs GraphQL**: GraphQL tiene un solo endpoint y evoluciona through adiciones de schema, no versiones de URL. Usa deprecation markers y field-level versioning en lugar de route-level versioning.

## Benchmarks de Rendimiento

| Estrategia | Overhead de routing | Cache hit rate | Notas |
|----------|-----------------|---------------|-------|
| URL path (`/v1/`) | 0ms | 95%+ | Best para CDN caching |
| Header (`Accept: v=2`) | 0.1ms | 60-70% | Vary header reduce cache |
| Query param (`?v=1`) | 0ms | 80-85% | Cacheable pero menos clean |
| Content negotiation | 0.2ms | 50-60% | RESTful pero poor caching |

Versionado por URL path tiene zero routing overhead y el cache hit rate más alto porque los CDN edge nodes cachean cada versión independientemente. Versionado por headers requiere `Vary: Accept` que fragmenta cache entries por cliente, reduciendo hit rates en 25-40%.

## Estrategia de Testing

- **Testea version routing**: envía peticiones a endpoints `/v1/` y `/v2/` y verifica que rutear al handler correcto. Testea que versiones desconocidas retornen 404 con un error message helpful listando versiones soportadas.
- **Testea deprecation headers**: envía una petición a una versión deprecada y verifica que la respuesta incluya headers `Deprecation`, `Sunset` y `Link`. Testea que el header `Link` apunte a la migration guide.
- **Testea backward compatibility**: corre la v1 test suite contra v2 y verifica que todos los v1 tests pasen (a menos que se hayan roto intencionalmente). Usa `openapi-diff` para detectar breaking changes entre versiones automáticamente en CI.
- **Testea version sunset**: simula la sunset date y verifica que la API retorne 410 Gone con un mensaje dirigiendo usuarios a la nueva versión. Testea que el sunset grace period funcione correctamente.

## Errores Comunes Adicionales

- **Versionar cada cambio minor**: no cada cambio necesita una nueva versión. Cambios aditivos (nuevos fields, nuevos endpoints) son backward-compatible y no requieren versionado. Reserva nuevas versiones solo para breaking changes.
- **Mantener versiones viejas vivas demasiado tiempo**: mantener 3+ versiones simultáneamente aumenta code complexity, testing burden e infrastructure costs. Setea un timeline claro de deprecación (6-12 meses) y enfórzalo con sunset headers.
- **Versionado inconsistente across endpoints**: algunos endpoints en v1, otros en v2, crea confusión para API consumers. Versiona la API surface entera, no endpoints individuales. Usa un global version prefix (`/v2/`) no per-endpoint versioning.
- **No comunicar breaking changes**: releasear una nueva versión sin migration guides, changelogs o deprecation notices causa client breakage. Publica migration guides con code examples y anuncia deprecaciones via email, API response headers y status pages.

## Monitoring y Observabilidad

- **Trackea tráfico por versión**: monitorea peticiones/min para cada versión de API. Cuando el tráfico de v2 excede v1, planea el sunset de v1. Cuando el tráfico de v1 cae below 1% por 30 días, es seguro decommissionar.
- **Monitorea impresiones de deprecation headers**: cuenta cuántos clientes reciben headers `Deprecation` y `Sunset`. Trackea el migration rate over time para medir qué tan rápido los clientes se mueven a la nueva versión.
- **Alerta en 404s para versiones desconocidas**: clientes pidiendo versiones non-existent (e.g., `/v3/`) indican clientes mal configurados o typos. Loggea la versión pedida y client ID para ayudarles a fixear su integración.
- **Trackea response times por versión**: versiones más nuevas deberían ser más rápidas o iguales. Si v2 es más lenta que v1, investiga si las nuevas features agregan overhead excesivo o si las database queries necesitan optimización.

## Checklist de Despliegue

- [ ] Elegir strategy de versionado (URL path, header, query param, content negotiation)
- [ ] Configurar routing para todas las versiones soportadas en el API gateway
- [ ] Setear deprecation headers (`Deprecation`, `Sunset`, `Link`) para versiones viejas
- [ ] Publicar migration guides con code examples para cada transición de versión
- [ ] Setear `openapi-diff` en CI para detectar breaking changes entre versiones
- [ ] Configurar CDN caching por versión (separate cache keys para `/v1/` y `/v2/`)
- [ ] Monitorear traffic distribution across versiones
- [ ] Planear sunset timeline (6-12 meses deprecation, luego 410 Gone)
- [ ] Documentar versioning policy en API documentation
- [ ] Testear backward compatibility corriendo v1 test suite contra v2

## Consideraciones de Seguridad

- **Version header injection**: si usas header-based versioning, valida el version header para prevenir injection attacks. Solo acepta predefined version values y rechaza peticiones con headers inesperados.
