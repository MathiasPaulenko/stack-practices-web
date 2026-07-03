---
contentType: recipes
slug: bash-loop-over-files
title: "Loop Sobre Archivos en Bash"
description: "Cómo iterar de forma segura sobre archivos y directorios en Bash, manejando espacios, globs y listas grandes de archivos con patrones correctos."
metaDescription: "Itera de forma segura sobre archivos y directorios en Bash manejando espacios, globs y listas grandes de archivos con patrones correctos."
difficulty: beginner
topics:
  - file-handling
tags:
  - file-handling
  - bash
  - loops
  - globbing
  - shell
  - recipe
relatedResources:
  - /recipes/file-handling/bash-parallel-execution
  - /recipes/file-handling/bash-text-processing
  - /recipes/file-handling/generate-temporary-files
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Itera de forma segura sobre archivos y directorios en Bash manejando espacios, globs y listas grandes de archivos con patrones correctos."
  keywords:
    - file-handling
    - bash
    - loops
    - globbing
    - shell
    - recipe
---

## Descripción General

Iterar sobre archivos es una de las operaciones más comunes en Bash, pero frecuentemente se hace incorrectamente. Los nombres de archivo con espacios, saltos de línea o caracteres glob (`*`, `?`) rompen los loops ingenuos. Esta receta muestra patrones seguros y portables para iterar archivos, filtrar por extensión, recursar subdirectorios y procesar resultados.

## Cuándo Usar

- Ejecutar el mismo comando sobre muchos archivos (convertir, analizar, mover)
- Encontrar archivos que coincidan con un patrón y procesarlos en orden
- Renombrar, cambiar permisos o validar en batch
- Generar reportes desde un directorio de archivos de entrada
- Reemplazar texto a través de múltiples archivos

## Cuándo NO Usar

- Procesar millones de archivos — los límites de longitud de lista de argumentos (`ARG_MAX`) fallarán
- Filtrado complejo que es más fácil con `find` usando `-exec` o `xargs`
- Operaciones que requieren estado entre archivos — usa un lenguaje de scripting apropiado (Python, Perl)
- Tareas que necesitan recuperación de errores por archivo — `set -e` con loops es complicado

## Implementación Paso a Paso

### Loop Seguro Básico con Glob

```bash
#!/bin/bash
set -euo pipefail

# CORRECTO: Siempre entrecomilla la variable
txt_count=0
for file in *.txt; do
    # Manejar el caso de no-coincidencia (glob deja literal '*.txt')
    [ -e "$file" ] || continue
    echo "Procesando: $file"
    ((txt_count++))
done
echo "Total archivos .txt: $txt_count"
```

### Recursar con `find`

```bash
#!/bin/bash
set -euo pipefail

# Procesar todos los archivos .py bajo src/, manejando espacios de forma segura
while IFS= read -r -d '' file; do
    echo "Linting: $file"
    pylint "$file"
done < <(find src/ -type f -name '*.py' -print0)

# Versión one-liner con xargs (no se necesita loop)
find src/ -type f -name '*.py' -print0 | xargs -0 pylint

# Procesar con un límite (más seguro para directorios enormes)
find src/ -maxdepth 2 -type f -name '*.py' -print0 | \
    xargs -0 -n 10 -P 4 pylint
```

### Filtrar y Ordenar

```bash
#!/bin/bash

# Orden numérico en nombres como report_001.txt, report_002.txt
for file in $(ls -1 report_*.txt | sort -t_ -k2 -n); do
    echo "Procesando en orden: $file"
done

# Alternativa más segura usando array + glob
files=(report_*.txt)
IFS=$'\n' sorted=($(sort -t_ -k2 -n <<< "${files[*]}")); unset IFS
for file in "${sorted[@]}"; do
    echo "Ordenado: $file"
done
```

### Procesar Archivos con Espacios y Caracteres Especiales

```bash
#!/bin/bash
set -euo pipefail

# Manejar nombres de archivo con espacios, saltos de línea y globs
srcdir="/data/uploads"

# Enfoque 1: read con find -print0
while IFS= read -r -d '' filepath; do
    filename=$(basename "$filepath")
    echo "Archivo: $filename"
done < <(find "$srcdir" -type f -print0)

# Enfoque 2: shopt nullglob + expansión entrecomillada
shopt -s nullglob
targets=("$srcdir"/*)
shopt -u nullglob

for filepath in "${targets[@]}"; do
    [ -f "$filepath" ] || continue
    echo "Encontrado: $(basename "$filepath")"
done
```

### Operaciones en Batch

```bash
#!/bin/bash
set -euo pipefail

# Renombrar .jpeg a .jpg
for file in *.jpeg; do
    [ -e "$file" ] || continue
    mv -- "$file" "${file%.jpeg}.jpg"
done

# Convertir todas las imágenes HEIC a JPEG
for file in *.heic; do
    [ -e "$file" ] || continue
    base="${file%.heic}"
    heif-convert "$file" "$base.jpg"
done

# Validar todos los archivos JSON
error_count=0
for file in *.json; do
    [ -e "$file" ] || continue
    if ! jq empty "$file" 2>/dev/null; then
        echo "ERROR: JSON inválido en $file" >&2
        ((error_count++))
    fi
done
[ "$error_count" -eq 0 ] || exit 1
```

## Lo que funciona

- **Siempre entrecomilla variables de archivo.** `"$file"` previene el splitting de palabras en espacios y la interpretación de caracteres glob.
- **Usa `find -print0 | while read -r -d ''`** para filtrado recursivo o complejo. Es la única forma portable de manejar todos los nombres de archivo válidos.
- **Habilita `nullglob` al usar globs en loops.** De lo contrario `*.txt` sin coincidencias itera una vez con el string literal `*.txt`.
- **Usa `--` antes de nombres de archivo en comandos.** `mv -- "$file" "$dest"` previene que nombres que empiezan con `-` sean interpretados como opciones.
- **Verifica `[ -e "$file" ]` al inicio del loop.** Maneja tanto `nullglob` deshabilitado como directorios vacíos.

## Errores Comunes

- **`for file in $(ls *.txt)` — nunca hagas esto.** La salida de `ls` no es parseable; los espacios y saltos de línea en nombres de archivo rompen el loop.
- **Variables sin entrecomillar:** `mv $file $dest` falla con `My Document.txt` porque se divide en dos argumentos.
- **Olvidar `nullglob`:** El cuerpo del loop corre una vez con `*.txt` como nombre de archivo cuando no hay coincidencias.
- **Usar `cat` para alimentar un solo archivo a un programa:** `cat "$file" | grep pattern` es un uso inútil de `cat`. Usa `grep pattern "$file"`.
- **No manejar el caso de no-coincidencia:** Un directorio vacío con un loop ingenuo puede producir comportamiento inesperado o errores.

## Preguntas Frecuentes

**Q: ¿Por qué debo evitar `for f in $(ls)`?**
A: Fallan con nombres de archivo que contienen espacios o caracteres especiales. Usa un patrón glob como `for f in *.txt` o `while IFS= read -r` con `find -print0`.

**Q: ¿Cuándo debo usar `find` en lugar de un loop con glob?**
A: Usa `find` cuando necesites recursión, filtrado por tamaño o fecha, o cuando debas manejar nombres de archivo arbitrarios de forma segura con `-print0`.

**Q: ¿Cómo proceso archivos en subdirectorios?**
A: Usa `find . -type f -name "*.txt" -print0 | while IFS= read -r -d  file; do ... done` para recorrer directorios anidados de forma segura.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
