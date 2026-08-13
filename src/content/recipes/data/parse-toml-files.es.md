---
contentType: recipes
slug: parse-toml-files
title: "Analiza y escribe TOML en Python, Java y JavaScript"
description: "Cómo analizar y escribir archivos de configuración TOML en Python, Java y JavaScript."
metaDescription: "Aprende a analizar archivos TOML en Python, Java y JavaScript. Lee, escribe y valida configuraciones TOML con ejemplos de código prácticos para tu proyecto."
difficulty: beginner
topics:
  - data
tags:
  - data
  - parsing
  - config
  - python
  - javascript
  - java
  - toml
  - tomli
relatedResources:
  - /recipes/parse-yaml-files
  - /recipes/parse-json
  - /recipes/validate-json-schema
  - /recipes/serialize-deserialize-data
  - /recipes/parse-xml-files
  - /recipes/parse-command-line-arguments
lastUpdated: "2026-08-13"
publishedAt: "2026-04-02"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende a analizar archivos TOML en Python, Java y JavaScript. Lee, escribe y valida configuraciones TOML con ejemplos de código prácticos para tu proyecto."
  keywords:
    - toml
    - analizar toml
    - toml config
    - python
    - javascript
    - java
---

## Visión General

TOML es el formato que hay detrás de pyproject.toml, Cargo.toml y un montón de configs de herramientas. Se queda a medio camino entre la rigidez de JSON y la obsesión por la indentación de YAML: tienes comentarios, tablas anidadas y valores tipados sin preocuparte por los espacios en blanco. Puedes leer y escribir TOML en Python, JavaScript y Java con los ejemplos de abajo. También te comparto algunos trucos para que tus archivos de configuración no se conviertan en un desastre.

## Cuándo Usar

Usa esta receta cuando:

- leas pyproject.toml, Cargo.toml o config.toml en build scripts o pipelines de CI/CD
- construyas una herramienta que necesite analizar archivos de configuración de proyectos
- migres de INI o JSON a un formato que soporte comentarios y tablas anidadas
- quieras validar la configuración de una herramienta antes de que arranque la aplicación

Si la config la generan máquinas, JSON sigue siendo la opción más segura. Para árboles profundos con anchors, YAML suele ser menos incómodo. El punto fuerte de TOML es la config editada por humanos que necesita tipos y comentarios. Si YAML encaja mejor, mira [Analizar archivos YAML](/es/recipes/parse-yaml-files/).

## Solución

### Python

```python
# tomllib está en la librería estándar desde Python 3.11+
# Para versiones anteriores: pip install tomli
import tomllib

with open('pyproject.toml', 'rb') as f:
    config = tomllib.load(f)

print(config['project']['name'])
print(config['tool']['pytest']['ini_options'])
```

```python
# Para escribir TOML necesitas el paquete `tomli-w`
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
// Convierte un objeto de vuelta a TOML
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

TOML se basa en pares clave-valor, arrays y tablas. Marcaste una tabla con una cabecera entre corchetes y una lista de tablas con una cabecera entre corchetes dobles, como muestra el código de abajo. No usa indentación, así que un tabulador accidental no te rompe el archivo como puede pasar en YAML. Las fechas y horas siguen ISO 8601, y los strings pueden ser literales con comillas simples o básicos con comillas dobles, con reglas de escape distintas.

Python 3.11 incluye tomllib, así que no necesitas un paquete externo solo para leer TOML. Para escribir, la mayoría recurre a tomli-w. JavaScript y Java no traen soporte TOML de fábrica, así que usas @iarna/toml y tomlj. Los tres parsean a los mismos mapas, listas y escalares que te daría JSON, lo que significa que puedes validar TOML con los mismos esquemas que usas para JSON.

## Variantes

| Tecnología | Librería | Enfoque | Notas |
| --- | --- | --- | --- |
| Python | tomllib | load() | Librería estándar desde 3.11, solo lectura |
| Python | tomli | load() | Backport para Python < 3.11, misma API |
| Python | tomli-w | dump() | La opción estándar para escribir TOML |
| JavaScript | @iarna/toml | parse() / stringify() | Rápido y compatible con la especificación |
| Java | tomlj | Toml.parse() | Moderno, soporta acceso por dotted keys |
| Java | toml4j | Toml.read() | Más antiguo pero todavía común |

## Lo que funciona

- Si estás en Python 3.11 o posterior, lee con tomllib y olvida el paquete toml más antiguo.
- Si un string tiene comillas o barras invertidas, ponlo entre comillas dobles y escapa los caracteres problemáticos. El parser se tropezará de otra forma.
- Prefiere dotted keys como database.host en lugar de tablas profundamente anidadas cuando puedas.
- Mantén los arrays de tablas poco profundos; mucha anidación hace los archivos difíciles de leer.
- Fija las versiones de pyproject.toml con el mismo cuidado que darías a requirements.txt, porque determinan la resolución de paquetes.

## Errores Comunes

Muchos intentan escribir TOML con tomllib, pero ese módulo es solo lectura. Para escribir, necesitas tomli-w.

Abre un archivo TOML en modo texto y el parser fallará o leerá mal los bytes, así que usa siempre mode='rb'.

No mezcles dotted keys y cabeceras de tabla en la misma sección. Una vez que abres una tabla con una cabecera entre corchetes, una clave como server.host pertenece a ella. Agregar después una cabecera anidada para el mismo camino es un error.

Los parsers de TOML no están obligados a conservar el orden de las claves en las tablas, así que no cuentes con ello. Los arrays sí mantienen el orden, por eso los arrays de tablas son más seguros para listas ordenadas.

Las rutas y expresiones regulares con muchas barras invertidas son más fáciles en strings literales; las comillas simples te permiten saltar el baile de escapes.

## Avanzado: Merge de Config Específico por Ambiente

```python
import tomllib
from pathlib import Path

def load_config(env: str = 'dev') -> dict:
    base = tomllib.loads(Path('config/base.toml').read_text())
    env_file = Path(f'config/{env}.toml')
    if env_file.exists():
        override = tomllib.loads(env_file.read_text())
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

Carga una config base y luego añade las capas específicas por ambiente encima. Este patrón usa base.toml para los valores compartidos y prod.toml o staging.toml para las diferencias. El merge recursivo mantiene las tablas anidadas intactas, así que un override solo reemplaza las claves que define explícitamente.

## Avanzado: Validación TOML con Pydantic

```python
import tomllib
from pydantic import BaseModel, ConfigDict, ValidationError

class DatabaseConfig(BaseModel):
    host: str
    port: int = 5432
    password: str

class AppConfig(BaseModel):
    model_config = ConfigDict(extra='forbid')
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

Parsea el archivo a un modelo de Pydantic y obtienes type checking, valores por defecto y validación de un solo paso. Atrapa campos faltantes, tipos equivocados y valores sin sentido. Los detectás antes de que la aplicación arranque. El modelo de Pydantic del ejemplo también rechaza claves desconocidas, lo cual es útil cuando el archivo de config se ha desviado del esquema esperado.

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

Las dotted keys y las tablas anidadas producen la misma estructura, pero las dotted keys mantienen el archivo más plano. Yo las uso cuando solo voy dos o tres niveles de profundidad, y cambio a cabeceras entre corchetes explícitas cuando la anidación crece. Mezclar ambos estilos en una misma sección funciona, pero suele confundir al próximo que lea el archivo.

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

El tomllib de Python solo lee, así que para escribir usas tomli-w. Usá dump() con un diccionario y un file handle binario, o llamá a dumps() para obtener un string. No conserva comentarios ni formato de un archivo existente, porque genera el TOML desde cero a partir de la estructura de datos.

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

Definís un array de tablas poniendo el nombre de la tabla entre corchetes dobles. Cada entrada comparte la misma forma, así que sirven para listas de servidores, feature flags o pools de conexiones de base de datos. En Python, se parsean a una lista de diccionarios bajo la clave de la tabla. En JavaScript con @iarna/toml, se convierten en un array de objetos.

## Cuándo Evitar

Si la config la genera una herramienta, JSON suele ser menos sorprendente porque cualquier lenguaje lo lee sin dependencias extra. YAML es la mejor opción cuando llegas a cinco o más niveles de anidación. TOML es para configuración, no para almacenar datos, así que los datasets grandes van en JSON o una base de datos. Y si tu toolchain solo soporta INI o JSON, añadir TOML puede no merecer el costo de migración.

## Solución de Problemas

Si tomllib lanza un TOMLDecodeError, el archivo probablemente tiene una clave duplicada, una coma trailing en un array o un dotted key que choca con una cabecera de tabla. Ejecuta python -m tomllib sobre el archivo o usa el CLI taplo para encontrar la línea exacta.

Si JavaScript te da undefined para una clave anidada, revisa si usaste la sintaxis de dotted key en el archivo. @iarna/toml parsea dotted keys correctamente, pero un typo como databse.host en lugar de database.host no lanza error; simplemente devuelve undefined.

Perder comentarios cuando tomli-w reescribe un archivo es esperable. La librería no conserva el formato; reconstruye el documento desde cero a partir de los datos parseados. Guarda una plantilla o versiona el archivo en git.

Si un merge por ambiente te sorprende, revisá que no esté reemplazando tablas completas cuando solo debería cambiar una clave. Registrá los diccionarios base y override mientras depurás.

## Lectura Adicional

- La [especificación TOML](https://toml.io/en/v1.0.0) tiene la última palabra sobre la sintaxis y los tipos de datos.
- La [documentación de tomllib en Python](https://docs.python.org/3/library/tomllib.html) cubre la API de la librería estándar y el soporte de TOML 1.0.
- El [repositorio de tomli-w](https://github.com/hukkin/tomli-w) tiene ejemplos para escribir TOML desde Python.
- La [documentación de tomlj](https://github.com/tomlj/tomlj) explica el parser de Java y el acceso por dotted keys.

## Notas de Producción

Fija las versiones de los parsers en tu requirements.txt o package.json. tomllib está atado a la versión de Python, pero las librerías de terceros pueden traer cambios breaking. Linter archivos TOML en CI con taplo o toml-test para detectar claves duplicadas y fechas inválidas antes del despliegue. Guarda los archivos TOML específicos por ambiente fuera del repositorio si contienen secretos, o inyecta valores sensibles mediante variables de entorno. Si generas TOML desde datos fuente, regenéralo en lugar de editarlo a mano, para mantener comentarios y orden consistentes.

## Puntos Clave

TOML es un formato de configuración amigable para humanos que Python, JavaScript y Java pueden parsear con librerías pequeñas y enfocadas. Lee con tomllib, @iarna/toml o tomlj; escribe con tomli-w o toml.stringify. Valida el TOML parseado con Pydantic o JSON Schema para atrapar errores de configuración temprano. Usa dotted keys y arrays de tablas para mantener los archivos legibles, y mezcla overrides específicos por ambiente con un merge recursivo.

## Preguntas Frecuentes

### ¿Debo usar TOML o YAML para la configuración de mi proyecto?

Si la config es plana, la editan desarrolladores y necesita comentarios, TOML encaja bien. Elige YAML para anidación profunda, anchors o archivos multi-documento. Para configs generadas por máquinas, JSON sigue siendo el default.

### ¿Puedo validar TOML contra un JSON Schema?

Sí. Parsea el archivo TOML a un diccionario y luego valida el resultado con cualquier validador de JSON Schema. TOML no tiene un lenguaje de esquema nativo, así que un esquema después del parsing es el enfoque habitual.

### ¿Cómo mergeo más de un archivo TOML?

Parsea cada archivo por su cuenta y luego hacé un merge recursivo de los mapas. En Python, deepmerge hace el trabajo; en JavaScript, lodash.merge o una función recursiva hecha a mano; en Java, fusioná instancias de Map. Decidí las reglas de override explícitas, como que local.toml gane sobre base.toml.

### ¿TOML soporta comentarios?

Sí. Los comentarios empiezan con # y pueden estar solos en una línea o al final de una línea con un valor. Eso hace que TOML sea más legible que JSON para config editada a mano.

### ¿Cómo manejo fechas y horas en TOML?

TOML tiene tipos nativos de fecha, hora y datetime, todos en ISO 8601. Eso significa que podés poner timestamps reales en un archivo de config sin envolverlos en strings.

```toml
started = 2026-08-13T07:30:00Z
expires = 2026-08-13
daily = 07:30:00
```

El tomllib de Python los convierte en objetos datetime reales, así que los podés comparar o pasar a otro código sin parsearlos de nuevo. Usalos para fechas de expiración, schedules y timestamps de versión.

### ¿Cómo convierto entre TOML y JSON?

Parsea el TOML a un diccionario y luego serialízalo como JSON. En Python, llamá json.dumps sobre el diccionario parseado. En JavaScript, llamá JSON.stringify sobre el objeto parseado. El reverso también funciona: parseá JSON y escribílo con tomli_w.dump().
