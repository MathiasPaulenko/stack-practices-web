---
contentType: recipes
slug: api-documentation-openapi
title: "Crear documentación de API con OpenAPI"
description: "Genera documentación de API interactiva a partir de specs OpenAPI usando Swagger UI, Redoc y herramientas nativas en Python, JavaScript y Java."
metaDescription: "Crea documentación de API con OpenAPI y Swagger. Genera docs interactivos desde specs en Python, JavaScript y Java con ejemplos y mejores prácticas."
difficulty: beginner
topics:
  - api
tags:
  - api
  - api-documentation
  - java
relatedResources:
  - /recipes/api-versioning
  - /recipes/call-rest-api
  - /recipes/graphql-api
  - /recipes/handle-cors
  - /recipes/handle-errors
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Crea documentación de API con OpenAPI y Swagger. Genera docs interactivos desde specs en Python, JavaScript y Java con ejemplos y mejores prácticas."
  keywords:
    - openapi
    - swagger
    - api-documentation
    - redoc
    - python
    - javascript
    - java
---
## Visión General

OpenAPI (anteriormente Swagger) es el estándar de la industria para describir [APIs REST](/recipes/api/rest-api-design). Un spec OpenAPI bien mantenido sirve como única fuente de verdad para tu API — generando documentación interactiva, clientes SDK y tests automatizados desde un solo archivo YAML o JSON.

Esta receta cubre la generación de documentación de API interactiva a partir de specs OpenAPI usando Swagger UI, Redoc y herramientas nativas de frameworks.

## Cuándo Usar

Usa este recurso cuando:
- Necesitas documentación de API interactiva que se mantenga sincronizada con tu código
- Quieres generar automáticamente clientes SDK en múltiples lenguajes
- Tu equipo necesita un enfoque contract-first para el desarrollo de APIs
- Necesitas validar peticiones entrantes contra un schema formal

## Solución

### Python

```python
from fastapi import FastAPI
from fastapi.openapi.docs import get_swagger_ui_html

app = FastAPI(title="Book API", version="1.0.0")

@app.get("/books/{book_id}", tags=["books"])
def get_book(book_id: int):
    """Recupera un libro por su ID."""
    return {"id": book_id, "title": "Clean Code"}

# FastAPI genera automáticamente /openapi.json y /docs (Swagger UI)
```

### JavaScript

```javascript
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const app = express();
const swaggerDocument = YAML.load('./openapi.yaml');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.listen(3000);
```

### Java

```java
import org.springdoc.core.annotations.RouterOperation;
import org.springdoc.core.annotations.RouterOperations;

@RestController
@RequestMapping("/books")
public class BookController {

    @Operation(summary = "Obtener libro por ID", description = "Devuelve un único libro")
    @ApiResponse(responseCode = "200", description = "Libro encontrado")
    @GetMapping("/{id}")
    public Book getBook(@PathVariable Long id) {
        return bookService.findById(id);
    }
}
// springdoc-openapi genera automáticamente /v3/api-docs y /swagger-ui.html
```

## Explicación

Los specs OpenAPI se generan típicamente de dos formas:
- **Code-first**: Las anotaciones en tu código generan el spec automáticamente ([FastAPI](/recipes/api/go-rest-api-gin), SpringDoc, tsoa)
- **Design-first**: Escribes el spec YAML/JSON manualmente, luego generas stubs del servidor y [clientes SDK](/recipes/api/call-rest-api)

El spec generado (`openapi.json`) alimenta:
- **Swagger UI**: Explorador interactivo para probar endpoints
- **Redoc**: Documentación limpia y responsive (mejor para lectura)
- **Generadores de clientes**: `openapi-generator-cli` crea clientes TypeScript, Python, Java

## Variantes

| Herramienta | Lenguaje | Enfoque | Salida |
|-------------|----------|---------|--------|
| FastAPI | Python | Code-first | /openapi.json + /docs auto-generados |
| Flask-RESTX | Python | Code-first | Swagger UI integrado |
| SpringDoc | Java | Code-first | /v3/api-docs + /swagger-ui.html |
| Express + swagger-ui | JavaScript | Design-first | Servir YAML pre-escrito |
| tsoa | TypeScript | Code-first | Generar spec desde decoradores |

## Mejores Prácticas

- **Versiona tu spec**: Usa el campo `version` y documenta cambios breaking
- **Añade ejemplos**: Ejemplos ricos en schemas reducen la fricción de integración
- **Usa tags**: Agrupa endpoints lógicamente (usuarios, pedidos, productos)
- **Documenta errores**: Incluye respuestas 4xx y 5xx con problem details
- **Mantén el spec en CI**: Valida la sintaxis del spec en cada build con `swagger-codegen validate`

## Errores Comunes

- **Divergencia entre código y spec**: El código cambia pero el spec no se actualiza — usa code-first para evitarlo
- **Definiciones de seguridad ausentes**: Documenta requisitos de auth ([Bearer](/recipes/security/oauth2-pkce-spa), OAuth2, API key)
- **Compartir modelos internos**: Expón DTOs, no [entidades de base de datos](/guides/databases/database-design-guide), en el spec
- **Ignorar campos nullable**: OpenAPI 3.0 requiere `nullable: true` explícitamente
- **URLs de servidor hardcodeadas**: Usa variables (`{serverUrl}`) para diferentes entornos

## Preguntas Frecuentes

**P: ¿Debería usar code-first o design-first?**
R: Code-first es más rápido para APIs existentes. Design-first es mejor para contratos entre equipos donde frontend y backend desarrollan en paralelo.

**P: ¿Cómo mantengo la documentación sincronizada con el código desplegado?**
R: Genera el spec en CI desde tu código, publícalo en un registro (SwaggerHub, Stoplight), y vincula la documentación desplegada a la última versión del spec.

**P: ¿Puedo convertir Swagger 2.0 a OpenAPI 3.0?**
R: Sí. Usa la herramienta CLI `swagger2openapi` o el conversor integrado de Swagger Editor. La mayoría de herramientas modernas soportan 3.0 nativamente.
