---



contentType: recipes
slug: parse-toml-files
title: "Analizar Archivos TOML"
description: "Cómo analizar archivos de configuración TOML en Python, Java y JavaScript."
metaDescription: "Aprende a analizar archivos TOML en Python, Java y JavaScript. Lee configs de aplicaciones con ejemplos prácticos de código."
difficulty: beginner
topics:
  - data
tags:
  - toml
  - parsing
  - config
  - python
  - javascript
  - java
relatedResources:
  - /recipes/parse-yaml-files
  - /recipes/parse-json
  - /recipes/validate-json-schema
  - /recipes/serialize-deserialize-data
  - /recipes/parse-xml-files
  - /recipes/parse-command-line-arguments
lastUpdated: "2026-07-09"
author: "StackPractices"
seo:
  metaDescription: "Aprende a analizar archivos TOML en Python, Java y JavaScript. Lee configs de aplicaciones con ejemplos prácticos de código."
  keywords:
    - toml
    - parsing
    - config
    - python
    - javascript
    - java



---

## Visión General

TOML (Tom's Obvious, Minimal Language) es un formato de archivo de configuración diseñado para ser más legible que JSON y más simple que YAML. Es el estándar para `Cargo.toml` de Rust, `pyproject.toml` de Python y muchas herramientas modernas. Analizar TOML programáticamente habilita gestión automatizada de configuración, overrides específicos por ambiente y tooling para package managers.

## Cuándo Usar


- For alternatives, see [Parse YAML Files](/es/recipes/parse-yaml-files/).

Usa este recurso cuando:
- Leas `pyproject.toml`, `Cargo.toml` o `config.toml` en build scripts o pipelines CI/CD
- Construyas herramientas de desarrollo que necesiten analizar archivos de configuración de proyecto
- Migres de INI o JSON a un formato de config más expresivo
- Valides configuración de herramientas antes de la ejecución

## Solución

### Python

```python
# tomllib está incluido en la librería estándar de Python 3.11+
# Para Python < 3.11: pip install tomli
import tomllib

with open('pyproject.toml', 'rb') as f:
    config = tomllib.load(f)

print(config['project']['name'])
print(config['tool']['pytest']['ini_options'])
```

```python
# Escribir TOML requiere el paquete de terceros `tomli-w`
# pip install tomli-w
import tomli_w

data = {'project': {'name': 'myapp', 'version': '1.0.0'}}
with open('output.toml', 'wb') as f:
    tomli_w.dump(data, f)
```

### JavaScript

```javascript
// @iarna/toml es un parser TOML confiable para Node.js
// npm install @iarna/toml
import toml from '@iarna/toml';
import fs from 'fs';

const doc = toml.parse(fs.readFileSync('config.toml', 'utf8'));
console.log(doc.database.host);
```

```javascript
// Volcar objetos a TOML
import toml from '@iarna/toml';

const data = { app: { name: 'myapp', debug: false } };
console.log(toml.stringify(data));
```

### Java

```java
// tomlj es un parser TOML moderno para Java
// Maven: org.tomlj:tomlj
import org.tomlj.Toml;
import org.tomlj.TomlTable;

public class TomlParser {
    public static void main(String[] args) throws Exception {
        TomlTable table = Toml.parse("config.toml");
        String host = table.getString("database.host");
        System.out.println(host);
    }
}
```

## Explicación

TOML usa una gramática estricta y no ambigua: pares clave-valor, arrays, tablas inline y secciones estándar de tabla/cabecera (`[section]` / `[[array-of-tables]]`). A diferencia de YAML, TOML no depende de indentación, haciéndolo menos propenso a errores en edición manual. Fechas y horas usan formato ISO 8601, y strings soportan formas literal (`'...'`) y básica (`"..."`) con reglas de escape diferentes.

Python 3.11 agregó `tomllib` a la librería estándar, eliminando la necesidad de paquetes externos para parsing. Para escribir TOML, `tomli-w` sigue siendo el estándar. Los ecosistemas JavaScript y Java requieren librerías de terceros porque TOML no está soportado nativamente.

## Variantes

| Tecnología | Librería | Enfoque | Notas |
|------------|----------|---------|-------|
| Python | `tomllib` | `load()` | Librería estándar desde 3.11, solo lectura |
| Python | `tomli` | `load()` | Backport para < 3.11, API idéntica |
| Python | `tomli-w` | `dump()` | Estándar para escribir TOML |
| JavaScript | `@iarna/toml` | `parse()` / `stringify()` | Rápido, compliant con spec |
| Java | `tomlj` | `Toml.parse()` | Moderno, soporta acceso por dotted keys |
| Java | `toml4j` | `Toml.read()` | Más antiguo pero ampliamente usado |

## Lo que funciona

- **Usa `tomllib` en Python 3.11+** en lugar de paquetes `toml` o `tomli` deprecados para lectura
- **Quottea strings con caracteres especiales** para evitar ambigüedad en parsers TOML
- **Usa dotted keys** (`database.host`) en lugar de tablas anidadas cuando sea posible para configs más planas
- **Mantén arrays de tablas (`[[...]]`) simples**: La anidación profunda hace los archivos difíciles de leer
- **Versiona tu `pyproject.toml`** cuidadosamente porque afecta la resolución de paquetes

## Errores Comunes

- **Usar `tomllib` para escribir TOML**: Es solo lectura; usa `tomli-w` para serialización
- **Olvidar modo `rb` en Python**: `tomllib.load()` requiere modo binario, no texto
- **Mezclar dotted keys con headers de tabla**: `key = 1` bajo `[section]` y `[section.key]` son diferentes
- **Asumir que TOML preserva orden de claves**: La spec garantiza orden para arrays pero no necesariamente para tablas en todos los parsers
- **No escapar backslashes en strings básicas**: Usa strings literales (`'...'`) para paths Windows y regex patterns

## Avanzado: Merge de Config Específico por Ambiente

```python
import tomllib
from pathlib import Path

def load_config(env: str = 'dev') -> dict:
    base = tomllib.loads(Path('config/base.toml').read_text())
    env_file = Path(f'config/{env}.toml')
    if env_file.exists():
        override = tomllib.loads(env_file.read_bytes())
        return deep_merge(base, override)
    return base

def deep_merge(base: dict, override: dict) -> dict:
    result = base.copy()
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    return result
```

Carga un archivo de config base, luego superpone overrides específicos por ambiente. Este patrón soporta `base.toml` para settings compartidos y `prod.toml` / `staging.toml` para diferencias por ambiente. Haz deep-merge de tablas anidadas para que los overrides solo reemplacen las claves que especifican.

## Avanzado: Validación TOML con Pydantic

```python
import tomllib
from pydantic import BaseModel, ValidationError

class DatabaseConfig(BaseModel):
    host: str
    port: int = 5432
    password: str

class AppConfig(BaseModel):
    app_name: str
    debug: bool = False
    database: DatabaseConfig

with open('config.toml', 'rb') as f:
    raw = tomllib.load(f)

try:
    config = AppConfig(**raw)
except ValidationError as e:
    print(f"Config validation failed: {e}")
    raise
```

Parsea TOML a un modelo Pydantic para obtener type checking, valores default y validación. Esto detecta campos requeridos faltantes, discrepancias de tipo y valores inválidos al inicio en lugar de en runtime. Usa `model_config = ConfigDict(extra='forbid')` para rechazar campos desconocidos.

## Avanzado: Dotted Keys vs Tablas Anidadas en TOML

```toml
# Estos dos son equivalentes

# Dotted keys
[database]
server.host = "localhost"
server.port = 5432

# Tabla anidada
[database.server]
host = "localhost"
port = 5432
```

Las dotted keys producen la misma estructura que las tablas anidadas pero son más compactas. Usa dotted keys para anidación superficial (2-3 niveles). Cambia a headers `[section]` explícitos cuando la anidación es más profunda o cuando la sección tiene muchas claves. Mezclar ambas en la misma sección es válido pero puede confundir a los lectores.

## Avanzado: Escribir Archivos TOML

```python
import tomli_w

config = {
    'app': {
        'name': 'myapp',
        'version': '2.1.0',
        'debug': False
    },
    'database': {
        'host': 'localhost',
        'port': 5432,
        'pool_size': 10
    },
    'features': ['auth', 'logging', 'metrics']
}

with open('config.toml', 'wb') as f:
    tomli_w.dump(config, f)
```

El `tomllib` de Python es solo lectura. Usa `tomli-w` para escribir archivos TOML. La función `dump()` acepta un diccionario y un file handle binario. Para output como string, usa `tomli_w.dumps()` que devuelve un string. Nota que `tomli-w` no preserva comentarios ni formato del archivo original — genera TOML desde la estructura de datos.

## Avanzado: Arrays de Tablas en TOML

```toml
[[servers]]
name = "web-1"
ip = "10.0.0.1"
port = 8080

[[servers]]
name = "web-2"
ip = "10.0.0.2"
port = 8080

[[servers]]
name = "db-1"
ip = "10.0.0.10"
port = 5432
```

Los arrays de tablas usan la sintaxis `[[table_name]]` para definir múltiples entradas con la misma estructura. Esto es útil para listas de servidores, feature flags y pools de conexiones de base de datos. En Python, estos parsean a una lista de diccionarios bajo la clave `servers`. En JavaScript con `@iarna/toml`, se convierten en un array de objetos.

## Cuándo Evitar

- **Configs generados por máquinas**: JSON es mejor para configs escritos por herramientas y APIs
- **Estructuras profundamente anidadas**: YAML maneja 5+ niveles de anidación más naturalmente que TOML
- **Archivos de datos grandes**: TOML es para configuración, no almacenamiento de datos; usa JSON o una base de datos para datasets grandes
- **Sistemas legacy**: Si tu toolchain solo soporta INI o JSON, añadir soporte TOML puede no valer el costo de migración

## Preguntas Frecuentes

### ¿Debo usar TOML o YAML para la configuración de mi proyecto?

Usa TOML cuando la config sea plana, simple y editada por desarrolladores (e.g., `pyproject.toml`, configs de herramientas). Usa YAML cuando necesites estructuras anidadas complejas, anchors o extensa documentación en comentarios. Usa JSON para configs generados por máquinas y contratos de API.

### ¿Puedo validar TOML contra un JSON Schema?

TOML parsea en las mismas estructuras de datos que JSON (maps, arrays, escalares). Después de parsear, valida el objeto resultante contra un JSON Schema usando los mismos validadores que usas para JSON. No existe un equivalente nativo de "TOML Schema", aunque la spec de TOML misma enforcea reglas de sintaxis.

### ¿Cómo mergeo múltiples archivos TOML?

Parsea cada archivo independientemente, luego haz deep-merge de los diccionarios/maps resultantes. Python `deepmerge`, JavaScript `lodash.merge` y Java `Map.merge()` pueden combinar configs. Implementa reglas de override (e.g., `local.toml` overridea `base.toml`) explícitamente en tu lógica de aplicación.

### ¿TOML soporta comentarios?

Sí, TOML soporta comentarios inline con `#`. Los comentarios pueden aparecer en su propia línea o al final de cualquier línea. Esto hace TOML más legible que JSON para configs editados por humanos. A diferencia de YAML, los comentarios TOML son preservados por algunos parsers (e.g., `tomli-w` no preserva comentarios, pero la CLI `taplo` sí).

### ¿Cómo manejo fechas y horas en TOML?

TOML tiene tipos nativos de fecha y hora usando ISO 8601: `2026-07-09` (fecha), `07:30:00` (hora), `2026-07-09T07:30:00Z` (datetime). El `tomllib` de Python parsea estos a objetos `datetime.date`, `datetime.time` y `datetime.datetime`. Úsalos para configs de scheduling, fechas de expiración y timestamps de versión.

### ¿Cuál es la diferencia entre TOML 1.0 y TOML 1.0.0-rc.1?

TOML 1.0 se finalizó en noviembre 2021. El release candidate rc.1 tenía diferencias menores en reglas de trailing comma en arrays y comportamiento de multiline strings. La mayoría de los parsers ahora apuntan a TOML 1.0. Si usas features como arrays heterogéneos (arrays con tipos mixtos), revisa el soporte de versión de tu parser — algunos parsers rechazan arrays de tipos mixtos.

### ¿Puedo usar TOML para manifiestos Kubernetes?

No. Kubernetes usa YAML para manifiestos porque soporta archivos multi-documento (separador `---`), anidación compleja y anchors. TOML carece de soporte multi-documento y maneja anidación profunda menos naturalmente. Usa TOML para configs de aplicación y herramientas (`pyproject.toml`, `Cargo.toml`), no para manifiestos de infraestructura.

### ¿Cómo convierto entre TOML y JSON?

Parsea el archivo TOML a un diccionario, luego serializa a JSON. En Python: `json.dumps(tomllib.load(f))`. En JavaScript: `JSON.stringify(TOML.parse(content), null, 2)`. El reverso también funciona — parsea JSON y escribe con `tomli_w.dump()`. Esto es útil para tooling que espera input JSON pero tu config está en TOML.
