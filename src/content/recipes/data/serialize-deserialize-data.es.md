---
contentType: recipes
slug: serialize-deserialize-data
title: "Serializar y Deserializar Datos"
description: "Cómo serializar y deserializar datos en JSON, XML y YAML en Python, Java y JavaScript."
metaDescription: "Aprende serialización y deserialización en Python, Java y JavaScript. Convierte objetos a JSON, XML y YAML con ejemplos de código."
difficulty: beginner
topics:
  - data
tags:
  - serialization
  - json
  - xml
  - yaml
  - python
  - javascript
  - java
relatedResources:
  - /recipes/data/parse-json
  - /recipes/data/parse-xml-files
  - /recipes/data/parse-yaml-files
  - /recipes/data/validate-json-schema
  - /recipes/data/convert-json-to-csv
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Aprende serialización y deserialización en Python, Java y JavaScript. Convierte objetos a JSON, XML y YAML con ejemplos de código."
  keywords:
    - serialization
    - json
    - xml
    - yaml
    - python
    - javascript
    - java
---

## Visión General

La serialización convierte objetos en memoria a un formato que puede almacenarse o transmitirse. La deserialización revierte el proceso, reconstruyendo objetos desde bytes o texto. Estas operaciones son esenciales para APIs, caching, message queues, archivos de configuración y persistencia de sesiones. Esta recipe cubre serialización JSON, XML y YAML en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Envíes datos a través de APIs HTTP o message brokers
- Guardes estado de aplicación a disco o capas de caching
- Conviertas entre formatos de configuración (JSON, YAML, XML)
- Implementes sistemas distribuidos que intercambien mensajes tipados

## Solución

### Python

```python
import json

# Serializar (objeto -> string JSON)
data = {'name': 'Alice', 'age': 30, 'active': True}
json_str = json.dumps(data, indent=2)
print(json_str)

# Deserializar (string JSON -> objeto)
parsed = json.loads(json_str)
print(parsed['name'])
```

```python
# Serialización YAML con PyYAML
import yaml

yaml_str = yaml.safe_dump(data, default_flow_style=False)
parsed_yaml = yaml.safe_load(yaml_str)
```

### JavaScript

```javascript
// JSON es nativo en JavaScript
const data = { name: 'Alice', age: 30, active: true };

// Serializar
const jsonStr = JSON.stringify(data, null, 2);
console.log(jsonStr);

// Deserializar
const parsed = JSON.parse(jsonStr);
console.log(parsed.name);
```

```javascript
// Serialización YAML con js-yaml
// npm install js-yaml
import yaml from 'js-yaml';

const yamlStr = yaml.dump(data);
const parsedYaml = yaml.load(yamlStr);
```

### Java

```java
// Jackson es el estándar para JSON en Java
// Maven: com.fasterxml.jackson.core:jackson-databind
import com.fasterxml.jackson.databind.ObjectMapper;

public class SerializationDemo {
    public static void main(String[] args) throws Exception {
        ObjectMapper mapper = new ObjectMapper();

        User user = new User("Alice", 30, true);

        // Serializar
        String json = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(user);
        System.out.println(json);

        // Deserializar
        User parsed = mapper.readValue(json, User.class);
        System.out.println(parsed.getName());
    }
}

class User {
    private String name;
    private int age;
    private boolean active;

    public User() {}
    public User(String name, int age, boolean active) {
        this.name = name; this.age = age; this.active = active;
    }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public int getAge() { return age; }
    public void setAge(int age) { this.age = age; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
```

## Explicación

JSON es el formato de intercambio dominante debido a su simplicidad y soporte nativo en JavaScript y lenguajes modernos. Mapea limpiamente a diccionarios/objetos, arrays, strings, números, booleans y null. XML permanece relevante en servicios SOAP enterprise, archivos de configuración (Spring, Android) y flujos document-centric. YAML es preferido para configs editados por humanos porque soporta comentarios y nesting complejo con sintaxis mínima.

Jackson (Java) usa reflection para vincular campos JSON a propiedades POJO via getters/setters o campos públicos. Python `json` trabaja con cualquier tipo serializable JSON (dicts, listas, primitivos). JavaScript `JSON.stringify` maneja ciclos deficientemente (lanza `TypeError`) a menos que se provea un replacer.

## Variantes

| Tecnología | Formato | Librería | Enfoque | Notas |
|------------|---------|----------|---------|-------|
| Python | JSON | `json` (stdlib) | `dumps()` / `loads()` | Maneja tipos básicos, soporte de encoder custom |
| Python | YAML | `PyYAML` | `safe_dump()` / `safe_load()` | Soporta tags custom y anchors |
| Python | XML | `xml.etree.ElementTree` | `tostring()` / `fromstring()` | Librería estándar, sin validación de schema |
| JavaScript | JSON | Nativo | `JSON.stringify()` / `JSON.parse()` | Cero dependencias, soporta reviver/replacer |
| JavaScript | YAML | `js-yaml` | `dump()` / `load()` | Rápido, seguro por defecto |
| Java | JSON | `Jackson` | `writeValueAsString()` / `readValue()` | Binding a POJO, streaming, tree model |
| Java | XML | `JAXB` / `Jackson XML` | Driven por anotaciones | JAXB está deprecado; preferir Jackson XML |

## Mejores Prácticas

- **Usa `safe_load` para YAML** en contextos no confiables para prevenir ejecución de código arbitrario
- **Valida JSON Schema** después de deserializar para asegurar corrección estructural antes de lógica de negocio
- **Maneja referencias circulares** explícitamente en `JSON.stringify` con un replacer o librería como `flatted`
- **Versiona tus datos serializados** agregando un campo `schema_version` para evolución backward-compatible
- **Prefiere JSON para APIs** y YAML para configs; evita XML a menos que integres con sistemas legacy

## Errores Comunes

- **No manejar `undefined` en JavaScript**: `JSON.stringify({x: undefined})` elimina la clave silenciosamente
- **Olvidar constructores por defecto en Java**: Jackson requiere un constructor no-arg para deserialización
- **Usar `float` para valores monetarios**: La serialización puede introducir errores de precisión; usa `Decimal` / `BigDecimal`
- **No setear headers content-type**: Las APIs deberían enviar `application/json`, no `text/plain`
- **Ignorar problemas de encoding**: Especifica siempre UTF-8 al leer/escribir archivos de texto serializados

## Preguntas Frecuentes

### ¿Qué formato de serialización debería elegir para microservicios?

Usa Protocol Buffers (protobuf) o MessagePack para comunicación interna servicio-a-servicio porque son compactos y fuertemente tipados. Usa JSON para APIs externas y endpoints human-facing porque es auto-descriptivo y universalmente soportado.

### ¿Cómo manejo serialización de objetos custom en Python?

Implementa una subclase `JSONEncoder` custom o provee un callable `default` a `json.dumps()` que convierta tu objeto a un dict serializable. Para deserialización, pasa un `object_hook` a `json.loads()` para reconstruir tipos custom desde dicts.

### ¿Puedo serializar objetos Java sin getters y setters?

Sí. Jackson puede serializar campos públicos directamente si se configura con `ObjectMapper.setVisibility(PropertyAccessor.FIELD, Visibility.ANY)`. Sin embargo, usar getters/setters es la convención estándar de Java y asegura encapsulación. Alternativamente, usa records (Java 14+) que generan constructores canónicos y métodos accessor automáticamente.
