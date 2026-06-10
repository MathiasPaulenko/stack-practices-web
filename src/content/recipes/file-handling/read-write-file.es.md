---
contentType: recipes
slug: read-write-file
title: "Leer y Escribir Archivos"
description: "Cómo leer y escribir archivos de forma segura en varios lenguajes de programación."
metaDescription: "Aprende a leer y escribir archivos en Python, JavaScript y Bash con ejemplos prácticos, consejos de codificación y buenas prácticas de manejo de errores."
difficulty: beginner
topics:
  - file-handling
tags:
  - files
  - io
  - python
  - javascript
  - bash
relatedResources:
  - /recipes/call-rest-api
  - /recipes/parse-json
lastUpdated: "2026-06-09"
author: "StackPractices"
seo:
  metaDescription: "Aprende a leer y escribir archivos en Python, JavaScript y Bash con ejemplos prácticos, consejos de codificación y buenas prácticas de manejo de errores."
  keywords:
    - leer archivo
    - escribir archivo
    - archivos python
    - fs node
    - archivos bash
---
## Visión General

Leer y escribir archivos es una de las tareas de E/S más habituales: cargar configuración, procesar logs, exportar informes o persistir estado. Hacerlo de forma segura implica manejar bien la codificación y cerrar siempre el descriptor del archivo.

Esta receta muestra la forma idiomática de leer y escribir archivos de texto en Python, JavaScript (Node.js) y Bash.

## Cuándo Usar

Usa esta receta cuando:

- Cargas archivos de configuración o datos al arrancar
- Generas informes, exportaciones o logs
- Procesas texto línea a línea (CSV, logs, fixtures)
- Persistes pequeñas cantidades de estado sin una base de datos

## Solución

### Python

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

```javascript
import { readFile, writeFile } from "node:fs/promises";

await writeFile("notes.txt", "Hola, archivo!\n", "utf-8");

const content = await readFile("notes.txt", "utf-8");
console.log(content);
```

### Bash

```bash
# Escribir (sobrescribir) y añadir
echo "Hola, archivo!" > notes.txt
echo "Otra línea" >> notes.txt

# Leer
cat notes.txt
```

## Explicación

- **Python** usa la sentencia `with` (context manager) para que el archivo se cierre siempre, incluso ante un error. Especifica siempre `encoding="utf-8"`.
- **JavaScript** usa la API basada en promesas `fs/promises`. Prefiérela sobre las síncronas `readFileSync`/`writeFileSync`, que bloquean el event loop.
- **Bash** usa redirección: `>` sobrescribe, `>>` añade. `cat` imprime el contenido.

Para convertir el contenido de un archivo en datos estructurados, consulta [Parsear JSON](/es/recipes/parse-json).

## Variantes

| Lenguaje | Leer | Escribir | Añadir |
|----------|------|----------|--------|
| Python | `open(p).read()` | `open(p, "w")` | `open(p, "a")` |
| JavaScript | `readFile(p)` | `writeFile(p, data)` | `appendFile(p, data)` |
| Bash | `cat p` | `> p` | `>> p` |

## Mejores Prácticas

- **Define siempre la codificación**: un `utf-8` explícito evita valores por defecto dependientes de la plataforma.
- **Usa context managers / APIs async**: `with` en Python, `fs/promises` en Node, para evitar fugas y bloqueos.
- **Comprueba que la ruta existe**: maneja los archivos ausentes con elegancia en lugar de fallar.
- **Procesa archivos grandes en streaming**: lee línea a línea en vez de cargar gigabytes en memoria.
- **Escribe de forma atómica**: escribe en un archivo temporal y luego renómbralo, para no corromper datos ante un fallo.

## Errores Comunes

- **Olvidar cerrar el descriptor**: provoca fugas de descriptores; usa `with` o `try/finally`.
- **Bloquear el event loop en Node**: evita `readFileSync` en los manejadores de peticiones.
- **Codificación incorrecta**: leer UTF-8 como ASCII corrompe los caracteres no ingleses.
- **Sobrescribir con `>`**: usar `>` en lugar de `>>` en Bash borra el archivo en silencio.
- **Ignorar errores**: un archivo ausente o un error de permisos debe manejarse, no tragarse.

## Preguntas Frecuentes

**Q: ¿Cómo añado contenido en vez de sobrescribir?**
A: Abre en modo append: `open(p, "a")` en Python, `appendFile` en Node, o `>>` en Bash.

**Q: ¿Por qué debo evitar `readFileSync` en Node.js?**
A: Bloquea el event loop de un solo hilo, congelando el resto de peticiones hasta que termine la lectura. Usa `fs/promises` en su lugar.

**Q: ¿Cómo leo un archivo grande sin quedarme sin memoria?**
A: Prosésalo línea a línea: `for line in f` en Python, un stream de lectura en Node, o `while read line` en Bash.
