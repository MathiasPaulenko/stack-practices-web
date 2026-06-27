---
contentType: recipes
slug: validate-json-schema
title: "Validar JSON Schema"
description: "Cómo validar datos JSON contra schemas en Python, Java y JavaScript."
metaDescription: "Aprende validación JSON Schema en Python, Java y JavaScript. Valida payloads de API y archivos de configuración con schemas y mejores prácticas."
difficulty: intermediate
topics:
  - data
tags:
  - json
  - schema
  - validation
  - python
  - javascript
  - java
relatedResources:
  - /recipes/data/parse-json
  - /recipes/api/input-validation
  - /recipes/data/parse-xml-files
  - /patterns/design/factory-pattern
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Aprende validación JSON Schema en Python, Java y JavaScript. Valida payloads de API y archivos de configuración con schemas y mejores prácticas."
  keywords:
    - json
    - schema
    - validation
    - python
    - javascript
    - java
---

## Visión General

JSON Schema define la estructura, tipos y restricciones de datos JSON. Es el estándar de la industria para validar cuerpos de solicitudes de API, archivos de configuración y mensajes entre servicios. Implementar validación de schemas desde el inicio captura datos malformados antes de que lleguen a la lógica de negocio, reduciendo bugs y riesgos de seguridad.

## Cuándo Usar

Usa este recurso cuando:
- Valides payloads de solicitudes de API REST antes de procesarlos
- Impongas contratos entre microservicios vía schemas de mensajes
- Valides archivos de configuración generados por usuarios al iniciar
- Generes tipos TypeScript, documentación o especificaciones OpenAPI desde schemas

## Solución

### Python

```python
# jsonschema es la librería más popular en Python
# pip install jsonschema
from jsonschema import validate, ValidationError

schema = {
    "type": "object",
    "properties": {
        "name": {"type": "string", "minLength": 1},
        "age": {"type": "integer", "minimum": 0},
        "email": {"type": "string", "format": "email"}
    },
    "required": ["name", "age", "email"]
}

try:
    validate(instance={"name": "Ada", "age": 30, "email": "ada@example.com"}, schema=schema)
    print("Válido")
except ValidationError as e:
    print(f"Inválido: {e.message}")
```

### JavaScript

```javascript
// Ajv es el validador JSON Schema más rápido para JavaScript
// npm install ajv
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });

const schema = {
    type: 'object',
    properties: {
        name: { type: 'string', minLength: 1 },
        age: { type: 'integer', minimum: 0 },
        email: { type: 'string', format: 'email' }
    },
    required: ['name', 'age', 'email']
};

const validate = ajv.compile(schema);
const valid = validate({ name: 'Ada', age: 30, email: 'ada@example.com' });

if (!valid) {
    console.log(validate.errors);
}
```

### Java

```java
// networknt/json-schema-validator es una opción popular y ligera
// Maven: com.networknt:json-schema-validator
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.ValidationMessage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V7);
JsonSchema schema = factory.getSchema("{\"type\":\"object\",\"properties\":{\"name\":{\"type\":\"string\"}},\"required\":[\"name\"]}");

ObjectMapper mapper = new ObjectMapper();
JsonNode node = mapper.readTree("{\"name\":\"Ada\"}");
Set<ValidationMessage> errors = schema.validate(node);

if (!errors.isEmpty()) {
    errors.forEach(System.out::println);
}
```

## Explicación

JSON Schema es especificado por la JSON Schema Organization y soporta los drafts 04, 06, 07, 2019-09 y 2020-12. Las palabras clave de validación principales incluyen `type`, `properties`, `required`, `minimum`/`maximum`, `pattern`, `enum` y `format`. Las características avanzadas incluyen `$ref` para composición, `if/then/else` para schemas condicionales y `unevaluatedProperties` para validación estricta.

La mayoría de los validadores también soportan formatos personalizados (email, uri, date-time) y vocabularios definidos por el usuario. Ajv además soporta compilación inline a funciones JavaScript para máximo rendimiento.

## Variantes

| Tecnología | Librería | Soporte de Draft | Notas |
|------------|----------|------------------|-------|
| Python | jsonschema | 04, 06, 07, 2019, 2020 | Más features, algo más lento |
| Python | fastjsonschema | 07, 2020 | Compila a código Python, muy rápido |
| JavaScript | Ajv | 04, 06, 07, 2019, 2020 | Validador JS más rápido, compila schemas |
| JavaScript | zod | N/A (similar) | Schemas type-first, no requiere JSON Schema |
| Java | networknt | 04, 06, 07, 2019, 2020 | Ligero, integración con Jackson |
| Java | everit | 04, 06, 07 | Maduro, cumplimiento estricto |

## Mejores Prácticas

- **Usa modo estricto (`additionalProperties: false`)** para rechazar campos inesperados y detectar errores tipográficos
- **Retorna todos los errores a la vez** (`allErrors: true` en Ajv) para mejor UX en formularios
- **Versiona tus schemas** junto con las versiones de API para evitar cambios breaking
- **Reutiliza definiciones con `$ref`** en lugar de duplicar sub-schemas comunes
- **Mantén schemas en archivos `.json`** bajo control de versiones, no inline en código

## Errores Comunes

- **Usar `type: "number"` para enteros**: Usa `type: "integer"` cuando se requieren números enteros
- **Olvidar arrays `required`**: Las propiedades son opcionales por defecto; lista explícitamente las requeridas
- **Validar archivos grandes sincrónicamente**: La validación de schemas puede bloquear el event loop; usa streams o worker threads
- **No fijar la versión del draft**: Diferentes validadores usan drafts por defecto distintos; siempre especifica `$schema`
- **Ignorar validación de formatos**: Formatos como `email` y `date-time` pueden omitirse por defecto; habilítalos explícitamente

## Preguntas Frecuentes

### ¿Qué draft de JSON Schema debo usar?

El Draft 2020-12 es la última versión estable y está soportada por Ajv, jsonschema y networknt. Úsalo para proyectos nuevos. Solo usa drafts antiguos al integrar con sistemas legacy.

### ¿Puedo generar tipos TypeScript desde JSON Schema?

Sí. Herramientas como `json-schema-to-typescript` (npm) y QuickType generan interfaces TypeScript desde schemas. A la inversa, Zod y TypeBox te permiten definir schemas como tipos TypeScript primero.

### ¿Cómo valido objetos profundamente anidados eficientemente?

Usa `$ref` para modularizar sub-schemas y habilita compilación (Ajv `compile()`, fastjsonschema). En Python, `fastjsonschema` compila schemas a código Python, ofreciendo 100x+ de aceleración sobre validación interpretada.
