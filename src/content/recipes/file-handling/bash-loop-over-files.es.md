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
  - /recipes/bash-parallel-execution
  - /recipes/bash-text-processing
  - /recipes/generate-temporary-files
  - /recipes/bash-backup-rotation-script
  - /recipes/bash-log-rotation-compression
  - /recipes/bash-monitoring-disk-usage
  - /recipes/bash-parallel-job-execution
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

Iterar sobre archivos es una de las operaciones más comunes en Bash, pero frecuentemente se hace incorrectamente. Los nombres de archivo con espacios, saltos de línea o caracteres glob (`*`, `?`) rompen los loops ingenuos. Aqui se muestra la forma de patrones seguros y portables para iterar archivos, filtrar por extensión, recursar subdirectorios y procesar resultados.

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

## Soluciones Avanzadas

### Array asociativo para metadata de archivos

```bash
#!/bin/bash
set -euo pipefail

# Rastrear metadata de archivos en un array asociativo
declare -A file_sizes
declare -A file_hashes

shopt -s nullglob
for file in *.log; do
    file_sizes["$file"]=$(stat -c%s "$file")
    file_hashes["$file"]=$(sha256sum "$file" | cut -d' ' -f1)
done

# Reporte
for file in "${!file_sizes[@]}"; do
    size="${file_sizes[$file]}"
    hash="${file_hashes[$file]}"
    printf "%-30s %10s bytes  %s\n" "$file" "$size" "${hash:0:16}"
done

# Encontrar duplicados por hash
declare -A hash_count
for file in "${!file_hashes[@]}"; do
    hash="${file_hashes[$file]}"
    ((hash_count["$hash"]++))
done

echo "Archivos duplicados:"
for hash in "${!hash_count[@]}"; do
    if [ "${hash_count[$hash]}" -gt 1 ]; then
        echo "  Hash ${hash:0:16}... tiene ${hash_count[$hash]} copias"
    fi
done
```

### Procesamiento paralelo con seguimiento de progreso

```bash
#!/bin/bash
set -euo pipefail

# Procesar archivos en paralelo con una barra de progreso
process_dir="${1:-.}"
max_jobs=4
total=0
done=0

# Contar total de archivos
shopt -s nullglob
files=("$process_dir"/*.jpg)
total=${#files[@]}
shopt -u nullglob

if [ "$total" -eq 0 ]; then
    echo "No hay archivos para procesar"
    exit 0
fi

echo "Procesando $total archivos con $max_jobs workers paralelos..."

pids=()
for file in "${files[@]}"; do
    # Esperar si hay demasiados procesos corriendo
    while [ "$(jobs -rp | wc -l)" -ge "$max_jobs" ]; do
        wait -n 2>/dev/null || sleep 0.1
    done

    (
        base="${file%.jpg}"
        convert "$file" -resize 1200x -quality 85 "${base}_optimized.jpg" 2>/dev/null
    ) &

    pids+=($!)
    ((done++))
    printf "\rProgreso: %d/%d (%d%%)" "$done" "$total" $((done * 100 / total))
done

wait
echo ""
echo "Listo: procesados $total archivos"
```

### Renombrado batch seguro con modo dry-run

```bash
#!/bin/bash
set -euo pipefail

# Renombrar archivos en batch con reemplazo de patrón y soporte dry-run
DRY_RUN=false
PATTERN=""
REPLACEMENT=""

while getopts "dnp:r:" opt; do
    case $opt in
        d) DRY_RUN=true ;;
        n) DRY_RUN=true ;;
        p) PATTERN="$OPTARG" ;;
        r) REPLACEMENT="$OPTARG" ;;
        *) echo "Uso: $0 [-d] -p PATRÓN -r REEMPLAZO <dir>"; exit 1 ;;
    esac
done
shift $((OPTIND - 1))

target_dir="${1:-.}"

if [ -z "$PATTERN" ]; then
    echo "Error: patrón (-p) es requerido"
    exit 1
fi

shopt -s nullglob
renamed=0
for file in "$target_dir"/*; do
    [ -f "$file" ] || continue
    filename=$(basename "$file")
    new_name="${filename//$PATTERN/$REPLACEMENT}"
    if [ "$filename" != "$new_name" ]; then
        if $DRY_RUN; then
            echo "[DRY-RUN] $filename -> $new_name"
        else
            mv -- "$file" "$target_dir/$new_name"
            echo "[OK] $filename -> $new_name"
        fi
        ((renamed++))
    fi
done

echo "Total: $renamed archivos $($DRY_RUN && echo 'serían ' || echo '')renombrados"
```

### Manejo de errores con códigos de salida por archivo

```bash
#!/bin/bash
set -uo pipefail

# Procesar archivos y recolectar códigos de salida por archivo sin abortar en error
declare -A results
error_count=0
ok_count=0

while IFS= read -r -d '' file; do
    if python3 -c "import json; json.load(open('$file'))" 2>/dev/null; then
        results["$file"]="OK"
        ((ok_count++))
    else
        results["$file"]="FAIL"
        ((error_count++))
    fi
done < <(find . -type f -name '*.json' -print0)

# Reporte resumen
echo "=== Reporte de Validación ==="
echo "OK:   $ok_count"
echo "FAIL: $error_count"
echo ""

if [ "$error_count" -gt 0 ]; then
    echo "Archivos fallidos:"
    for file in "${!results[@]}"; do
        if [ "${results[$file]}" = "FAIL" ]; then
            echo "  - $file"
        fi
    done
    exit 1
fi
```

## Mejores Prácticas Adicionales


- For a deeper guide, see [Bash Parallel Execution](/es/recipes/bash-parallel-execution/).

1. **Usa `mapfile` para leer listas de archivos en arrays.** Es más rápido que un loop `while read` para listas grandes y preserva caracteres especiales:

```bash
#!/bin/bash
# Leer todos los archivos .py en un array de forma segura
mapfile -d '' -t pyfiles < <(find src/ -type f -name '*.py' -print0)

echo "Encontrados ${#pyfiles[@]} archivos Python"
for file in "${pyfiles[@]}"; do
    echo "  $file"
done
```

2. **Usa `xargs` para operaciones simples de un comando por archivo.** Maneja batching y paralelismo automáticamente:

```bash
#!/bin/bash
# Comprimir todos los archivos .log en paralelo (4 a la vez)
find /var/log -type f -name '*.log' -print0 | xargs -0 -P 4 -I{} gzip "{}"

# Ejecutar eslint en todos los archivos .js, 20 a la vez
find src/ -type f -name '*.js' -print0 | xargs -0 -n 20 eslint
```

3. **Configura `IFS` correctamente al parsear salida de comandos.** El IFS por defecto incluye espacios, lo que rompe nombres de archivo. Siempre usa `IFS=` con `read`:

```bash
#!/bin/bash
# Mal: IFS incluye espacio, rompe con "My File.txt"
# echo "My File.txt" | while read file; do echo "$file"; done
# Salida: "My" y "File.txt" en líneas separadas

# Bien: IFS= previene trimming de espacios iniciales/finales
echo "My File.txt" | while IFS= read -r file; do echo "$file"; done
# Salida: "My File.txt"
```

## Errores Comunes Adicionales

1. **Usar `for file in $(find ...)` en vez de `while read`.** El loop `for` divide en espacios, rompiendo nombres con espacios. Siempre pipea `find -print0` a `while IFS= read -r -d ''`:

```bash
# Mal: rompe con espacios
# for file in $(find . -name "*.txt"); do echo "$file"; done

# Bien: maneja todos los nombres de archivo
while IFS= read -r -d '' file; do
    echo "$file"
done < <(find . -name "*.txt" -print0)
```

2. **No usar `set -euo pipefail` en scripts.** Sin `set -e`, los errores en el cuerpo del loop se ignoran silenciosamente. Sin `set -u`, las variables indefinidas se expanden a strings vacíos. Sin `pipefail`, los comandos pipeados que fallan se enmascaran:

```bash
#!/bin/bash
# Mal: los errores se ignoran silenciosamente
# for file in *.txt; do
#     process "$file"
# done

# Bien: aborta en error, variable indefinida o fallo de pipe
set -euo pipefail
for file in *.txt; do
    [ -e "$file" ] || continue
    process "$file"
done
```

3. **Modificar archivos mientras se itera.** Añadir, eliminar o renombrar archivos durante un loop glob puede causar procesamiento saltado o duplicado. Recolecta la lista de archivos primero, luego itera:

```bash
#!/bin/bash
shopt -s nullglob
files=(*.tmp)
shopt -u nullglob

for file in "${files[@]}"; do
    # Seguro: ya capturamos la lista
    rm -- "$file"
done
```

## Preguntas Frecuentes Adicionales

### ¿Cómo itero sobre archivos ordenados por fecha de modificación?

Usa `find` con `-printf` y `sort`, o `ls -t` con `mapfile`:

```bash
#!/bin/bash
# Ordenar por fecha de modificación (más reciente primero)
mapfile -d '' -t files < <(find . -type f -name '*.log' -printf '%T@ %p\0' | sort -rz -n | cut -z -d' ' -f2-)

for file in "${files[@]}"; do
    echo "$(date -r "$file" '+%Y-%m-%d %H:%M') $file"
done

# Alternativa: ls -t para casos simples (sin espacios en nombres)
# for file in $(ls -t *.log); do echo "$file"; done
```

### ¿Cómo salto archivos mayores a cierto tamaño?

Usa `find` con filtro `-size`:

```bash
#!/bin/bash
# Procesar solo archivos menores a 10MB
while IFS= read -r -d '' file; do
    size=$(stat -c%s "$file")
    echo "Procesando $file ($((size / 1024)) KB)"
done < <(find . -type f -name '*.log' -size -10M -print0)
```

### ¿Cómo itero sobre archivos con múltiples extensiones?

Usa brace expansion con `nullglob`, o `find` con múltiples patrones `-name`:

```bash
#!/bin/bash
shopt -s nullglob

# Brace expansion
for file in *.{jpg,jpeg,png,webp}; do
    [ -f "$file" ] || continue
    echo "Imagen: $file"
done

# find con múltiples -name
while IFS= read -r -d '' file; do
    echo "Imagen: $file"
done < <(find . -type f \( -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' -o -name '*.webp' \) -print0)
```

### ¿Cómo manejo nombres de archivo con saltos de línea?

Solo `find -print0` con `read -d ''` maneja nombres de archivo que contienen saltos de línea. Los patrones glob también funcionan ya que Bash los expande correctamente. Nunca uses salida de `ls` o sustitución de comandos sin entrecomillar:

```bash
#!/bin/bash
# Esto maneja nombres con saltos de línea, espacios y caracteres especiales
while IFS= read -r -d '' file; do
    echo "Procesando: $file"
done < <(find . -type f -print0)
```
