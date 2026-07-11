---
contentType: docs
slug: api-changelog-template
title: "Plantilla de Changelog de API"
description: "Plantilla para documentar cambios de API incluyendo cambios breaking, nuevas capacidades, deprecaciones y correcciones."
metaDescription: "Usa esta plantilla de changelog de API para documentar cambios breaking, nuevas capacidades, deprecaciones y correcciones con versionado claro."
difficulty: beginner
topics:
  - api
  - architecture
tags:
  - api
  - changelog
  - versionado
  - documentacion
  - plantilla
relatedResources:
  - /docs/architecture/api-lifecycle-management-template
  - /docs/api/api-deprecation-notice-template
  - /docs/architecture/technical-spec-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de changelog de API para documentar cambios breaking, nuevas capacidades, deprecaciones y correcciones con versionado claro."
  keywords:
    - changelog api
    - versionado
    - cambios breaking
    - notas de lanzamiento
    - documentacion api
    - plantilla changelog
---

## Resumen

Los consumidores de API necesitan saber que cambio, cuando cambio, y si necesitan actuar. Un changelog no estructurado — o la ausencia de changelog — obliga a los consumidores a comparar tu API o descubrir cambios breaking en produccion. Esta plantilla proporciona un formato estandarizado para documentar cada cambio de API con version, fecha, severidad y guia de migracion.

## Cuando Usar

Usa este recurso cuando:
- Lanaces una nueva version o capacidad de API
- Depreces o elimines un endpoint o campo
- Corrijas un bug que afecte el comportamiento de la API
- Publiques una actualizacion mensual o trimestral de API

## Solucion

```markdown
# Changelog de API

## 2.5.0 — 2026-06-26

### Cambios Breaking
- **Eliminado:** `GET /v1/orders/{id}/items` — Usar `GET /v2/orders/{id}?expand=items` en su lugar
- **Cambiado:** Campo `total` renombrado a `totalAmount` en todas las respuestas de orden
- **Requerido:** Header `X-Request-ID` ahora obligatorio para todas las operaciones de escritura

### Nuevas Capacidades
- **Agregado:** `POST /v2/orders/bulk` — Crear hasta 100 ordenes en una sola solicitud
- **Agregado:** Campo `paymentStatus` en respuestas de orden (`pending`, `paid`, `failed`)
- **Agregado:** Evento de webhook `order.payment_failed` para notificaciones de pago fallido

### Correcciones
- **Corregido:** `GET /v2/products` ahora retorna arreglo vacio `[]` en lugar de `null` cuando no existen productos
- **Corregido:** Los campos de fecha ahora retornan consistentemente formato ISO 8601 con offset de zona horaria

### Deprecaciones
- **Deprecado:** Parametro de consulta `customer_id` — Usar `customerId` en su lugar (retiro: 2026-10-01)
- **Deprecado:** Ruta base `v1` de API — Migrar a `v2` antes del 2026-12-01

## 2.4.0 — 2026-05-15

### Nuevas Capacidades
- **Agregado:** `PATCH /v2/orders/{id}` para actualizaciones parciales de orden
- **Agregado:** Headers de limite de tasa (`X-RateLimit-Limit`, `X-RateLimit-Remaining`) en todas las respuestas

### Correcciones
- **Corregido:** `500 Internal Server Error` en `POST /v2/orders` cuando el arreglo `items` estaba vacio

---

## Politica de Versionado

Seguimos [Versionado Semantico](https://semver.org/lang/es/):
- **MAJOR:** Cambios breaking que requieren accion del consumidor
- **MINOR:** Nuevas capacidades, compatibles hacia atras
- **PATCH:** Correcciones de bugs, compatibles hacia atras

## Categorias de Cambio

| Categoria | Descripcion | Accion Requerida del Consumidor |
|-----------|-------------|--------------------------------|
| Cambio Breaking | Las integraciones existentes pueden fallar | Si — migracion requerida |
| Nueva Capacidad | Nuevos endpoints, campos o comportamientos | Opcional — adoptar cuando este listo |
| Correccion | Bug corregido o comportamiento inconsistente | No — pero verificar si dependias del comportamiento anterior |
| Deprecacion | Capacidad programada para eliminacion | Si — antes de la fecha de retiro |

## Suscribirse a Cambios

- **Feed RSS:** https://developer.ejemplo.com/changelog.xml
- **Email:** Suscribirse en https://developer.ejemplo.com/subscribe
- **Webhook:** Configurar evento `api.changelog_published` en tu panel
- **Slack:** Unirse a #api-announcements en nuestro Slack comunitario
```

## Ejemplo de Plantilla Extendida

Aqui hay un changelog mas detallado con multiples versiones, mostrando como las entradas se acumulan con el tiempo:

```markdown
# Changelog de API

## 3.0.0 — 2026-09-01

### Cambios Breaking
- **Eliminado:** Todos los endpoints v1. Migrar a v2 o v3. Ver guia de migracion.
- **Cambiado:** Autenticacion cambiada de API keys a OAuth 2.0 bearer tokens
- **Cambiado:** Formato de error estandarizado a RFC 7807 Problem Details
- **Eliminado:** `GET /v2/users/{id}/permissions` — Usar `GET /v2/users/{id}?expand=permissions`
- **Cambiado:** Paginacion `offset`/`limit` reemplazada por `cursor`/`limit`

### Nuevas Capacidades
- **Agregado:** `POST /v3/webhooks` — Registrar endpoints de webhook programaticamente
- **Agregado:** Endpoint de exportacion masiva `GET /v3/orders/export?format=csv`
- **Agregado:** Soporte de clave de idempotencia en todos los endpoints POST via header `Idempotency-Key`

### Correcciones
- **Corregido:** Los contadores de limite de tasa ahora se reinician correctamente a medianoche UTC en lugar de la hora local del servidor
- **Corregido:** `PATCH /v2/orders/{id}` ya no sobrescribe valores `null` cuando el campo se omite

### Deprecaciones
- **Deprecado:** Ruta base `v2` de API — Migrar a `v3` antes del 2027-03-01
- **Deprecado:** Header `X-API-Key` — Usar `Authorization: Bearer <token>` en su lugar

## 2.5.0 — 2026-06-26

### Cambios Breaking
- **Eliminado:** `GET /v1/orders/{id}/items` — Usar `GET /v2/orders/{id}?expand=items` en su lugar
- **Cambiado:** Campo `total` renombrado a `totalAmount` en todas las respuestas de orden
- **Requerido:** Header `X-Request-ID` ahora obligatorio para todas las operaciones de escritura

### Nuevas Capacidades
- **Agregado:** `POST /v2/orders/bulk` — Crear hasta 100 ordenes en una sola solicitud
- **Agregado:** Campo `paymentStatus` en respuestas de orden (`pending`, `paid`, `failed`)
- **Agregado:** Evento de webhook `order.payment_failed` para notificaciones de pago fallido

### Correcciones
- **Corregido:** `GET /v2/products` ahora retorna arreglo vacio `[]` en lugar de `null` cuando no existen productos
- **Corregido:** Los campos de fecha ahora retornan consistentemente formato ISO 8601 con offset de zona horaria

### Deprecaciones
- **Deprecado:** Parametro de consulta `customer_id` — Usar `customerId` en su lugar (retiro: 2026-10-01)
- **Deprecado:** Ruta base `v1` de API — Migrar a `v2` antes del 2026-12-01

## 2.4.0 — 2026-05-15

### Nuevas Capacidades
- **Agregado:** `PATCH /v2/orders/{id}` para actualizaciones parciales de orden
- **Agregado:** Headers de limite de tasa (`X-RateLimit-Limit`, `X-RateLimit-Remaining`) en todas las respuestas

### Correcciones
- **Corregido:** `500 Internal Server Error` en `POST /v2/orders` cuando el arreglo `items` estaba vacio
```

## Automatizacion de Changelog

Generar changelogs manualmente es propenso a errores. Usa convenciones de mensajes de commit y herramientas para producir changelogs automatica o semi-automaticamente.

### Conventional Commits

Estructura los mensajes de commit para que una herramienta pueda parsearlos:

```
feat(api): agregar endpoint de creacion masiva de ordenes

POST /v2/orders/bulk acepta hasta 100 ordenes en una solicitud.
Retorna 207 Multi-Status con resultados por orden.

BREAKING CHANGE: campo total renombrado a totalAmount en respuestas de orden
```

### Script de Node.js para Generar Changelog desde Tags de Git

```javascript
const { execSync } = "child_process";

function generateChangelog(fromTag, toTag) {
  const log = execSync(
    `git log ${fromTag}..${toTag} --pretty=format:"%s|%H" --no-merges`
  ).toString();

  const entries = log.split("\n").map((line) => {
    const [message, hash] = line.split("|");
    return { message: message.trim(), hash };
  });

  const breaking = entries.filter((e) =>
    e.message.includes("BREAKING CHANGE") || e.message.startsWith("feat!")
  );
  const features = entries.filter((e) =>
    e.message.startsWith("feat") && !e.message.includes("BREAKING")
  );
  const fixes = entries.filter((e) => e.message.startsWith("fix"));
  const deprecations = entries.filter((e) =>
    e.message.startsWith("deprecate") || e.message.includes("DEPRECATED")
  );

  let output = `## ${toTag} — ${new Date().toISOString().split("T")[0]}\n\n`;

  if (breaking.length) {
    output += "### Cambios Breaking\n";
    breaking.forEach((e) => {
      output += `- **Cambiado:** ${e.message.replace(/BREAKING CHANGE:\s*/, "")}\n`;
    });
    output += "\n";
  }

  if (features.length) {
    output += "### Nuevas Capacidades\n";
    features.forEach((e) => {
      output += `- **Agregado:** ${e.message.replace(/^feat\([^)]+\):\s*/, "")}\n`;
    });
    output += "\n";
  }

  if (fixes.length) {
    output += "### Correcciones\n";
    fixes.forEach((e) => {
      output += `- **Corregido:** ${e.message.replace(/^fix\([^)]+\):\s*/, "")}\n`;
    });
    output += "\n";
  }

  if (deprecations.length) {
    output += "### Deprecaciones\n";
    deprecations.forEach((e) => {
      output += `- **Deprecado:** ${e.message.replace(/^deprecate\([^)]+\):\s*/, "")}\n`;
    });
  }

  return output;
}

console.log(generateChangelog("v2.4.0", "v2.5.0"));
```

### Herramientas que Generan Changelogs

| Herramienta | Lenguaje | Enfoque |
|-------------|----------|---------|
| [semantic-release](https://github.com/semantic-release/semantic-release) | JavaScript | Parsea conventional commits, genera releases automaticamente |
| [conventional-changelog](https://github.com/conventional-changelog/conventional-changelog) | JavaScript | CLI para generar changelogs desde historial de commits |
| [auto-changelog](https://github.com/CookPete/auto-changelog) | JavaScript | CLI simple, genera Markdown desde git log |
| [git-cliff](https://github.com/orhun/git-cliff) | Rust | Generador de changelog configurable desde commits |
| [changeloguru](https://github.com/changeloguru/changeloguru) | Go | Conventional commits a changelog |

## Headers de Deprecacion en Practica

Envia headers HTTP en respuestas de API deprecadas para que los consumidores detecten la deprecacion programaticamente:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Deprecation: true
Sunset: Sat, 01 Oct 2026 00:00:00 GMT
Link: <https://docs.ejemplo.com/api-migration>; rel="deprecation"
```

### Verificar Headers de Deprecacion en Codigo Cliente

```python
import requests

response = requests.get("https://api.ejemplo.com/v1/orders", headers={
    "Authorization": "Bearer token123"
})

if response.headers.get("Deprecation") == "true":
    sunset = response.headers.get("Sunset", "fecha desconocida")
    link = response.headers.get("Link", "")
    print(f"ADVERTENCIA: Este endpoint esta deprecado. Retiro: {sunset}")
    print(f"Guia de migracion: {link}")
```

```javascript
const response = await fetch("https://api.ejemplo.com/v1/orders", {
  headers: { Authorization: "Bearer token123" }
});

const deprecation = response.headers.get("Deprecation");
if (deprecation === "true") {
  const sunset = response.headers.get("Sunset");
  const link = response.headers.get("Link");
  console.warn(`Endpoint deprecado. Retiro: ${sunset}`);
  console.warn(`Guia de migracion: ${link}`);
}
```

## Estandares de Formato de Changelog

| Elemento | Estandar | Ejemplo |
|----------|----------|---------|
| Numero de version | Versionado Semantico | `2.5.0` |
| Formato de fecha | ISO 8601 (`YYYY-MM-DD`) | `2026-06-26` |
| Verbo de entrada | Pasado, en negrita | `**Agregado:**`, `**Corregido:**` |
| Marcador de cambio breaking | Primera seccion bajo cada version | `### Cambios Breaking` |
| Retiro de deprecacion | Fecha ISO 8601 entre parentesis | `(retiro: 2026-10-01)` |
| Enlace de migracion | URL o referencia a endpoint | `Usar GET /v2/orders/{id}?expand=items` |

## Explicacion

El changelog usa una jerarquia de **version-fecha-entrada** para que los consumidores puedan escanear su version actual y ver todo lo que cambio desde entonces. Los cambios breaking se listan primero porque demandan atencion inmediata. Cada entrada incluye un verbo (`Agregado`, `Eliminado`, `Corregido`, `Deprecado`) para que los consumidores entiendan la naturaleza del cambio de un vistazo. La seccion de politica de versionado reduce confusion sobre lo que significa cada numero de version.

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| API Publica | Changelog completo con RSS/email | Los consumidores se autoserven, reducen tickets de soporte |
| API Interna | Slack + resumen corto | Mas rapido, menos ceremonia |
| API de Partners | Email + enlace a guia de migracion | Los partners necesitan comunicacion de lujo |
| API GraphQL | Diff de esquema + changelog | Usar directiva `@deprecated` en esquema junto al changelog |

## Lo que funciona

1. **Publicar el changelog antes de desplegar el cambio** — no despues de que los consumidores reporten problemas
2. **Agrupar entradas por severidad** — cambios breaking primero, luego capacidades, luego correcciones
3. **Incluir instrucciones de migracion** con cada cambio breaking, no solo una descripcion
4. **Enlazar a documentacion** para capacidades nuevas complejas en lugar de explicar en el changelog
5. **Archivar versiones antiguas** pero mantenerlas accesibles — los clientes enterprise pueden estar varias versiones atras
6. **Usar conventional commits** para que los changelogs se generen o verifiquen automaticamente
7. **Enviar headers de deprecacion** en respuestas de API para que el codigo cliente detecte y advierta

## Errores Comunes

1. **Mezclar correcciones de bugs y cambios breaking** sin categorizacion clara
2. **Escribir "varias correcciones de bugs"** en lugar de listar correcciones especificas que les importan a los consumidores
3. **Publicar changelogs dias despues del despliegue** — los consumidores ya estan rotos
4. **No versionar el changelog mismo** — si el changelog cambia, los consumidores pierden confianza
5. **Olvidar documentar campos eliminados** — los consumidores descubren datos faltantes solo en produccion
6. **Omitir la fecha de retiro para deprecaciones** — los consumidores no saben cuanto tiempo tienen
7. **No enlazar a guias de migracion** desde la entrada del changelog
8. **Usar formatos de fecha inconsistentes** entre versiones — usar ISO 8601
9. **Enterrar los cambios breaking** al final de una entrada de version en lugar de listarlos primero

## Preguntas Frecuentes

### Hasta donde atras deberia ir el changelog?

Mantener al menos los ultimos 12 meses de cambios en linea. Archivar versiones mas antiguas en una pagina separada. Los clientes enterprise con ciclos de adquisicion largos pueden necesitar referenciar cambios de hace un ano.

### Deberia documentar cambios solo internos?

No. El changelog es para consumidores. La refactorizacion interna, cambios de CI/CD o actualizaciones de infraestructura pertenecen a notas de lanzamiento internas, no al changelog publico de API.

### Que pasa si una correccion de bug cambia comportamiento en el que algunos consumidores dependian?

Documentarlo como un cambio breaking si el comportamiento anterior estaba documentado. Si el comportamiento anterior era un bug, documentarlo como una correccion pero incluir una nota: "El comportamiento anterior era involuntario e inconsistente con la documentacion."

### El changelog deberia ser un solo archivo o una pagina por version?

Para APIs pequenas, un solo archivo Markdown funciona bien. Para APIs con releases frecuentes, usar una pagina por version mayor con un indice. Esto mantiene la pagina cargable y buscable.

### Como manejo versiones pre-release?

Usar etiquetas pre-release de SemVer: `3.0.0-beta.1`, `3.0.0-rc.1`. Documentarlas en el changelog con una nota de que la API puede cambiar antes del release estable.

### Deberia incluir mejoras de rendimiento en el changelog?

Solo si cambian comportamiento observable — por ejemplo, una garantia de menor latencia o un nuevo header de cache. Optimizaciones internas de rendimiento que no afectan a los consumidores pertenecen a notas internas.

### Como automatizo la publicacion del changelog?

Usar un pipeline CI/CD que se ejecute al crear un tag: generar la seccion del changelog desde los commits, agregarla al archivo de changelog, publicar en el sitio de docs y enviar una notificacion a los canales suscritos.
