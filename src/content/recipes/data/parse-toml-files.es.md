---
contentType: recipes
slug: parse-toml-files
title: "Analizar TOML: Python, Java y JS con Ejemplos"
description: "Cómo analizar y escribir archivos de configuración TOML en Python, Java y JavaScript."
metaDescription: "Analiza archivos TOML en Python (tomli/tomllib), Java y JavaScript. Lee, escribe, valida configs, maneja límites de nesting y evita CVEs con ejemplos de código."
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
lastUpdated: "2026-08-25"
publishedAt: "2026-04-02"
author: Mathias Paulenko
seo:
  metaDescription: "Analiza archivos TOML en Python (tomli/tomllib), Java y JavaScript. Lee, escribe, valida configs, maneja límites de nesting y evita CVEs con ejemplos de código."
  keywords:
    - toml
    - analizar toml
    - toml config
    - python
    - javascript
    - java
---

## Visión General

TOML me parecía una mala idea. Un INI con corchetes. Después aparecieron pyproject.toml y Cargo.toml en todos lados, y hoy no me puedo escapar. Honestamente, me terminó gustando. JSON es demasiado rígido. YAML me vuelve paranoico con la indentación. TOML está justo en el medio: comentarios, tablas anidadas, valores tipados y nada de esos dolores de cabeza con los espacios. Acá te dejo cómo leo y escribo TOML en Python, JavaScript y Java. Más los errores que cometí. Para que vos no los repitas.

TOML significa Tom's Obvious, Minimal Language. Tom Preston-Werner escribió la especificación. Por eso es tan opinionado.

## Cuándo Usar

Yo recurro a TOML cuando estoy manejando pyproject.toml, Cargo.toml o algún config.toml dentro de build scripts o pipelines de CI/CD. También cuando armo una herramienta que analiza la configuración de un proyecto. O cuando migro desde INI o JSON y quiero comentarios y tablas anidadas en un solo archivo. ¿Validar la configuración antes de que arranque? Parsear TOML primero. Win fácil.

¿La config la genera una máquina? Me quedo con JSON. ¿Árboles profundos con anchors? YAML es menos incómodo. El fuerte de TOML es la config editada por humanos que necesita tipos y comentarios. ¿Más de tipo YAML? Yo usualmente mando a la gente a [Analizar archivos YAML](/es/recipes/parse-yaml-files/).

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
// Convertí un objeto de vuelta a TOML
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

TOML en el fondo es pares clave-valor, arrays y tablas. Una tabla sola lleva una cabecera entre corchetes. Una lista de tablas usa corchetes dobles. El código de arriba lo muestra. No le importa la indentación, así que un tabulador accidental no rompe el archivo como en YAML. Las fechas y horas siguen ISO 8601, y los strings pueden ser literales con comillas simples o básicos con comillas dobles, con reglas de escape distintas. Reglas de escape distintas sin razón. Así está la especificación.

Python 3.11 finalmente trae tomllib en la librería estándar, así que no necesito otro paquete solo para leer TOML. Cuando tengo que escribirlo, agarro tomli-w. JavaScript y Java no traen soporte TOML de fábrica, así que uso @iarna/toml y tomlj. Los tres terminan entregando mapas, listas y escalares muy parecidos a JSON, lo que significa que puedo validar TOML con los mismos esquemas que uso para JSON.

## Variantes

| Tecnología | Librería | Enfoque | Notas |
| --- | --- | --- | --- |
| Python | tomllib | load() | Solo lectura. No escribas con esto. |
| Python | tomli | load() | Backport. Misma API. |
| Python | tomli-w | dump() | El que uso para escribir. |
| JavaScript | @iarna/toml | parse() / stringify() | Rápido y compatible con la especificación. |
| Java | tomlj | Toml.parse() | Moderno. Le gustan los dotted keys. |
| Java | toml4j | Toml.read() | Más antiguo. Todavía ahí. |

## Lo que funciona

Si estás en Python 3.11 o posterior, yo uso tomllib y me olvido del paquete toml más viejo. Si un string tiene comillas o barras invertidas adentro, lo pongo entre comillas dobles y escapo las partes problemáticas; si no, el parser se tropieza. Prefiero dotted keys como database.host en lugar de tablas profundamente anidadas siempre que pueda. Los arrays de tablas conviene mantenerlos poco profundos, porque mucha anidación hace que un archivo sea un dolor de leer. Las versiones en pyproject.toml importan más de lo que parece, porque determinan la resolución de paquetes. Aburrido. Pero si te equivocás, te arruina la tarde.

## Errores Comunes

Más de una vez intenté escribir TOML con tomllib. No escribe. Solo lectura. Para escribir, usá tomli-w. Una vez estuve una hora dándole vueltas a un error de parseo. Después recordé que había abierto el archivo en modo texto. El parser falla o lee mal los bytes, así que siempre lo abro en modo binario.

No mezcles dotted keys y cabeceras de tabla en la misma sección. Una vez que abrís una tabla con una cabecera entre corchetes, una clave como server.host pertenece a ella. Agregar después una cabecera anidada para el mismo camino es un error. Los parsers de TOML no están obligados a conservar el orden de las claves en las tablas, así que no cuento con eso. Los arrays sí mantienen el orden, por eso los arrays de tablas me parecen más seguros para listas ordenadas. ¿Rutas o regexes con barras invertidas? Los meto en strings literales con comillas simples. Salteo el baile de escapes.

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

Cargo una config base. Después le sumo las capas específicas por ambiente encima. base.toml para los valores compartidos. prod.toml o staging.toml para las diferencias. El merge recursivo mantiene las tablas anidadas intactas, así que un override solo reemplaza las claves que define explícitamente. Si un merge por ambiente me devuelve un valor que no esperaba, suele ser porque reemplazó una tabla completa cuando solo debería haber cambiado una clave. Error clásico.

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

Parseo un archivo a un modelo de Pydantic y obtengo type checking, valores por defecto y validación de un solo paso. Atrapa campos faltantes, tipos equivocados y valores sin sentido antes de que la aplicación arranque. El modelo de este ejemplo también rechaza claves desconocidas, lo cual me sirve porque me grita cuando un archivo de config se desvió del esquema esperado.

Pydantic no es la única opción. Si necesito un esquema independiente del lenguaje, [valido el TOML parseado con JSON Schema](/es/recipes/validate-json-schema/).

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

Las dotted keys y las tablas anidadas producen la misma estructura, pero las dotted keys mantienen el archivo más plano. Yo las uso cuando solo voy dos o tres niveles de profundidad. Cambio a cabeceras entre corchetes explícitas cuando la anidación crece. Mezclar ambos estilos en una misma sección está permitido, pero el próximo que lea el archivo probablemente quiera tener una charla con vos. Yo trato de evitarlo.

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

El tomllib de Python solo lee, así que para escribir uso tomli-w. dump para archivos, dumps para strings. No conserva comentarios ni formato de un archivo existente porque genera el TOML desde cero a partir de los datos parseados. Siempre me olvido de eso la primera vez.

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

Para un array de tablas, ponés el nombre de la tabla entre corchetes dobles. Cada entrada tiene la misma forma. Por eso sirven para listas de servidores, feature flags o pools de conexiones de base de datos. En Python, la clave de la tabla termina siendo una lista de diccionarios. En JavaScript con @iarna/toml, te queda un array de objetos.

## Cuándo Evitar

Si una herramienta genera la config, [JSON](/es/recipes/parse-json/) suele ser menos sorprendente: cualquier lenguaje lo lee sin deps extra. YAML es la mejor opción cuando llegás a cinco o más niveles de anidación. TOML es para configuración, no para almacenar datos, así que los datasets grandes van a JSON o una base de datos. Y si tu toolchain solo habla INI o JSON, migrar a TOML puede no merecer la pena. A veces "aburrido y funciona" le gana a "nuevo y brillante".

## Solución de Problemas

Si tomllib lanza un TOMLDecodeError, el archivo probablemente tiene una clave duplicada, una coma trailing en un array o un dotted key que choca con una cabecera de tabla. Yo suelo ejecutar python -m tomllib sobre el archivo o usar el CLI de taplo. Encontrá la línea exacta.

JavaScript te devuelve undefined para una clave anidada? Revisá si usaste la sintaxis de dotted key en el archivo. @iarna/toml maneja dotted keys bien, pero si te equivocás y escribís databse.host en lugar de database.host, no lanza error. Simplemente devuelve undefined. Ningún traceback. Ninguna pista. Nada. Preguntame cómo lo sé.

Cuando tomli-w reescribe un archivo, los comentarios desaparecen. Esperable. Sigue siendo molesto. La librería no conserva el formato; reconstruye el documento desde cero a partir de los datos parseados. Yo guardo una plantilla o versiono el archivo en git.

Si un merge por ambiente te sorprende, revisá que no esté reemplazando tablas completas cuando solo debería cambiar una clave. Registrá los diccionarios base y override mientras depurás.

## Lectura Adicional

Tengo la [especificación TOML](https://toml.io/en/v1.0.0) en bookmarks. Perdí demasiadas horas con casos borde. Es a donde voy cuando necesito zanjar una discusión sobre sintaxis o tipos de datos. Para la API de Python, la [documentación de tomllib](https://docs.python.org/3/library/tomllib.html) es mi referencia. Cubre la API y el soporte de TOML 1.0. Cuando necesito escribir TOML desde Python, chusmeo el [repositorio de tomli-w](https://github.com/hukkin/tomli-w) para ver ejemplos. Y la [documentación de tomlj](https://github.com/tomlj/tomlj) explica el parser de Java y el acceso por dotted keys. La feature que más uso.

## Notas de Producción

Yo fijo las versiones de los parsers en requirements.txt o package.json. tomllib está atado a la versión de Python, pero las librerías de terceros pueden traer cambios breaking. En CI le doy un lint a los archivos TOML con taplo o toml-test para detectar claves duplicadas y fechas inválidas antes de que lleguen a producción. No es glamoroso. Me salva de malos despliegues. Los archivos TOML específicos por ambiente que contienen secretos se quedan fuera del repositorio, o inyecto los valores sensibles mediante variables de entorno. Si genero TOML desde datos fuente, lo regenero. No lo edito a mano. Así mantengo comentarios y orden consistentes.

## Puntos Clave

TOML es un formato de configuración que se puede leer sin sufrir demasiado. Python, JavaScript y Java pueden parsearlo con librerías chicas y enfocadas. Yo lo leo con tomllib, @iarna/toml o tomlj; lo escribo con tomli-w o toml.stringify. Para atrapar errores temprano, le tiro Pydantic o JSON Schema a los datos parseados. Los dotted keys y los arrays de tablas mantienen los archivos legibles, y un merge recursivo se encarga de los overrides específicos por ambiente.

## Preguntas Frecuentes

### ¿Debo usar TOML o YAML para la configuración de mi proyecto?

¿Config plana, la editan desarrolladores y necesita comentarios? TOML encaja bien. ¿Anidación profunda, anchors o archivos multi-documento? Elegí YAML. ¿La genera una máquina? JSON sigue siendo el default. Yo empiezo con TOML salvo que ya sepa que la config va a crecer con muchos niveles.

### ¿Puedo validar TOML contra un JSON Schema?

Sí. Parseá el archivo TOML a un diccionario y después validá el resultado con cualquier validador de JSON Schema. TOML no tiene un lenguaje de esquema nativo, así que un esquema después del parsing es el enfoque habitual. No es nativo, pero funciona.

### ¿Cómo mergeo más de un archivo TOML?

Parseá cada archivo por su cuenta y después hacé un merge recursivo de los mapas. En Python, deepmerge hace el trabajo; en JavaScript, lodash.merge o una función recursiva hecha a mano; en Java, fusioná instancias de Map. Decidí las reglas de override explícitas, como que local.toml gane sobre base.toml. Si no, te vas a arrepentir.

### ¿TOML soporta comentarios?

Sí. Los comentarios empiezan con # y pueden estar solos en una línea o al final de una línea con un valor. Eso hace que TOML sea más legible que JSON para config editada a mano. No hace comentarios de bloque, eso sí. Molesto, pero cierto.

### ¿Cómo manejo fechas y horas en TOML?

TOML tiene tipos nativos de fecha, hora y datetime, todos en ISO 8601. Eso significa timestamps reales en un archivo de config. Sin envolverlos en strings.

```toml
started = 2026-08-13T07:30:00Z
expires = 2026-08-13
daily = 07:30:00
```

El tomllib de Python los convierte en objetos datetime reales, así que los podés comparar o pasar a otro código sin parsearlos de nuevo. Los uso sobre todo para fechas de expiración, schedules y timestamps de versión. Práctico.

### ¿Cómo convierto entre TOML y JSON?

Parseá el TOML a un diccionario y después serialízalo como JSON. En Python, pasale el diccionario parseado a json.dumps. En JavaScript, pasale el objeto parseado a JSON.stringify. El reverso también funciona: parseá JSON y escribílo con tomli_w.dump().

Si necesitás un flujo de conversión más completo, mirá [Serializar y Deserializar Datos](/es/recipes/serialize-deserialize-data/).
