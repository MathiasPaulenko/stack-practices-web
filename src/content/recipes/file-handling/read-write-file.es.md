---
contentType: recipes
slug: read-write-file
title: "Leer y Escribir Archivos"
description: "Cómo leer y escribir archivos de forma segura en varios lenguajes de programación."
metaDescription: "Aprende a leer y escribir archivos en Python, JavaScript y Bash con ejemplos prácticos, consejos de codificación y lo que funciona para manejo de errores."
difficulty: beginner
topics:
  - file-handling
tags:
  - file-handling
  - bash
  - io
  - streams
  - files
relatedResources:
  - /recipes/call-rest-api
  - /recipes/parse-json
  - /recipes/regular-expressions
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a leer y escribir archivos en Python, JavaScript y Bash con ejemplos prácticos, consejos de codificación y lo que funciona para manejo de errores."
  keywords:
    - leer archivo
    - escribir archivo
    - archivos python
    - fs node
    - archivos bash
---
## Visión General

Leer y escribir archivos es una de las tareas de E/S más habituales: cargar configuración, procesar logs, exportar informes o persistir estado. Hacerlo de forma segura implica manejar bien la codificación y cerrar siempre el descriptor del archivo.

Los archivos son la interfaz universal entre programas y almacenamiento persistente. Ya sea que estés guardando preferencias de usuario, leyendo logs del servidor o generando una exportación CSV, los mismos principios aplican: abrir el archivo, realizar la operación y asegurar que el recurso se libere incluso cuando ocurren errores. Los runtimes modernos proporcionan abstracciones de alto nivel que manejan buffering, codificación y limpieza automáticamente, pero entender la mecánica subyacente te ayuda a depurar problemas de rendimiento y evitar corrupción de datos.

Esta receta muestra la forma idiomática de leer y escribir archivos de texto en Python, JavaScript (Node.js) y Bash, además de cómo hacer streaming de archivos grandes sin agotar la memoria.

## Cuándo Usar

Usa esta receta cuando:

- Cargas archivos de configuración o datos al arrancar. Consulta [Parse JSON](/recipes/data/parse-json) para archivos de config estructurados.
- Generas informes, exportaciones o logs para auditoría y análisis
- Procesas texto línea a línea (CSV, logs, fixtures)
- Persistes pequeñas cantidades de estado sin una base de datos
- Lees y escribes archivos de configuración JSON o YAML
- Haces streaming de archivos de logs grandes sin cargarlos completamente en memoria
- Creas archivos temporales para procesamiento intermedio en pipelines de datos. Consulta [Call REST API](/recipes/api/call-rest-api) para descargar datos remotos.

## Solución

### Python

La sentencia `with` de Python crea un context manager que cierra automáticamente el archivo, incluso si se levanta una excepción dentro del bloque. Especifica siempre `encoding="utf-8"` para evitar valores por defecto dependientes de la plataforma.

```python
# Escribir
with open("notes.txt", "w", encoding="utf-8") as f:
    f.write("Hola, archivo!\n")

# Leer
with open("notes.txt", "r", encoding="utf-8") as f:
    content = f.read()
print(content)
```

### JavaScript

Node.js proporciona una API basada en promesas bajo `node:fs/promises` que evita bloquear el event loop. Esto es esencial para aplicaciones de servidor que manejan peticiones concurrentes.

```javascript
import { readFile, writeFile } from "node:fs/promises";

await writeFile("notes.txt", "Hola, archivo!\n", "utf-8");

const content = await readFile("notes.txt", "utf-8");
console.log(content);
```

### Bash

Bash usa redirección de shell para operaciones de archivo. El operador `>` sobrescribe el archivo destino, mientras que `>>` añade. Estas son las formas más rápidas de escribir pequeñas cantidades de datos desde scripts.

```bash
# Escribir (sobrescribir) y añadir
echo "Hola, archivo!" > notes.txt
echo "Otra línea" >> notes.txt

# Leer
cat notes.txt
```

## Explicación

- **Python** usa la sentencia `with` (context manager) para que el archivo se cierre siempre, incluso ante un error. La función `open()` acepta un string de modo: `"r"` para lectura, `"w"` para escritura (truncar), `"a"` para append, y `"x"` para creación exclusiva. Especifica siempre `encoding="utf-8"`.
- **JavaScript** usa la API basada en promesas `fs/promises`. Prefiérela sobre las síncronas `readFileSync`/`writeFileSync`, que bloquean el event loop. Para archivos grandes, usa `createReadStream()` para procesar datos en chunks.
- **Bash** usa redirección: `>` sobrescribe, `>>` añade. `cat` imprime el contenido. Para parsing estructurado, combina `cat` con `jq` para JSON o `awk` para CSV.

Para convertir el contenido de un archivo en datos estructurados, consulta [Parsear JSON](/recipes/data/parse-json).

## Variantes

| Lenguaje | Leer | Escribir | Añadir |
|----------|------|----------|--------|
| Python | `open(p).read()` | `open(p, "w")` | `open(p, "a")` |
| JavaScript | `readFile(p)` | `writeFile(p, data)` | `appendFile(p, data)` |
| Bash | `cat p` | `> p` | `>> p` |

## Lo que funciona

- **Define siempre la codificación**: un `utf-8` explícito evita valores por defecto dependientes de la plataforma que pueden corromper caracteres no-ASCII en Windows o macOS.
- **Usa context managers / APIs async**: `with` en Python, `fs/promises` en Node, para evitar fugas de descriptores y bloqueos del event loop. Estas abstracciones garantizan limpieza incluso cuando ocurren excepciones.
- **Comprueba que la ruta existe**: maneja los archivos ausentes con elegancia en lugar de fallar. En Python, usa `pathlib.Path.exists()`; en Node, usa `fs.access()` o `fs.stat()`.
- **Procesa archivos grandes en streaming**: lee línea a línea en vez de cargar gigabytes en memoria. Python proporciona `for line in f`; Node proporciona `readline` o `createReadStream`; Bash proporciona `while read line`.
- **Escribe de forma atómica**: escribe en un archivo temporal y luego renómbralo, para no corromper datos ante un fallo. Si el proceso muere durante la escritura, el archivo original permanece intacto.
- **Usa rutas absolutas en scripts**: las rutas relativas se rompen cuando cambia el directorio de trabajo. Resuelve rutas con `pathlib` (Python) o `path.resolve()` (Node) antes de abrir archivos.
- **Establece permisos restrictivos en archivos sensibles**: los archivos de configuración que contienen secrets deben ser legibles solo por el owner (`chmod 600`).

## Errores Comunes

- **Olvidar cerrar el descriptor**: provoca fugas de descriptores y eventualmente agota el límite del proceso; usa siempre `with` o `try/finally`.
- **Bloquear el event loop en Node**: evita `readFileSync` en los manejadores de peticiones. Una sola lectura síncrona puede congelar todo tu servidor para todos los usuarios concurrentes.
- **Codificación incorrecta**: leer UTF-8 como ASCII corrompe los caracteres no ingleses y puede producir mojibake en logs o output orientado al usuario.
- **Sobrescribir con `>`**: usar `>` en lugar de `>>` en Bash borra el archivo en silencio sin undo ni confirmación.
- **Ignorar errores**: un archivo ausente o un error de permisos debe manejarse, no tragarse con un catch vacío. Registra el error y falla con elegancia.
- **Leer archivos completos en memoria**: cargar un archivo de logs de 10 GB en un string hará crash tu proceso. Siempre verifica el tamaño del archivo o usa streaming para cualquier cosa superior a unos pocos megabytes.
- **Escribir en el mismo archivo que estás leyendo**: sobrescribir un archivo de entrada in-place puede truncarlo antes de que termines de leer, resultando en pérdida de datos.

## Preguntas Frecuentes

**Q: ¿Cómo añado contenido en vez de sobrescribir?**
A: Abre en modo append: `open(p, "a")` en Python, `appendFile` en Node, o `>>` en Bash. Esto preserva el contenido existente y agrega nuevos datos al final.

**Q: ¿Por qué debo evitar `readFileSync` en Node.js?**
A: Bloquea el event loop de un solo hilo, congelando el resto de peticiones hasta que termine la lectura. Usa `fs/promises` en su lugar para cualquier código de servidor en producción.

**Q: ¿Cómo leo un archivo grande sin quedarme sin memoria?**
A: Prosésalo línea a línea: `for line in f` en Python, `createReadStream` en Node, o `while read line` en Bash. Esto mantiene el uso de memoria constante independientemente del tamaño del archivo.

**Q: ¿Cómo escribo de forma segura en un archivo que otros procesos podrían estar leyendo?**
A: Escribe en un archivo temporal en el mismo filesystem, luego renómbralo atómicamente sobre el destino. Los lectores verán o el archivo viejo completo o el nuevo completo, nunca uno parcialmente escrito.

**Q: ¿Cuál es la diferencia entre modo texto y modo binario?**
A: El modo texto aplica traducción de newlines específica de la plataforma (`\r\n` en Windows) y codificación. El modo binario lee bytes raw sin transformación. Usa modo binario para imágenes, archivos comprimidos, o cuando necesitas fidelidad byte por byte exacta.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
