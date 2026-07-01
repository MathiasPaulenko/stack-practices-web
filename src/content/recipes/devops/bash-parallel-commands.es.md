---
contentType: recipes
slug: bash-parallel-commands
title: "Ejecutar Comandos Shell en Paralelo con Bash"
description: "Ejecuta múltiples comandos shell concurrentemente usando xargs, GNU parallel y background jobs."
metaDescription: "Ejecuta comandos shell en paralelo con bash. Usa xargs, GNU parallel y background jobs para acelerar procesamiento en lote con ejemplos."
difficulty: intermediate
topics:
  - devops
tags:
  - bash
  - parallel
  - xargs
  - gnu-parallel
  - concurrency
  - shell
relatedResources:
  - /recipes/bash-parallel-job-execution
  - /recipes/bash-parallel-execution
  - /recipes/bash-backup-rotation
  - /recipes/bash-scripting-automation
  - /recipes/bash-loop-over-files
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Ejecuta comandos shell en paralelo con bash. Usa xargs, GNU parallel y background jobs para acelerar procesamiento en lote con ejemplos."
  keywords:
    - bash paralelo comandos
    - xargs paralelo bash
    - gnu parallel bash
    - background jobs bash
    - concurrencia shell linux
---
## Visión General

Ejecutar comandos secuencialmente es lento cuando las tareas son independientes. Bash tiene tres enfoques integrados para paralelismo: background jobs con `&`, `xargs -P`, y `GNU parallel`. Esta recipe cubre los tres con ejemplos prácticos para procesamiento en lote de archivos, conversión de imágenes y llamadas a APIs.

## Cuándo Usar

- Necesitas procesar cientos de archivos (redimensionar, convertir, comprimir)
- Estás haciendo llamadas a múltiples endpoints de una API
- Quieres acelerar operaciones batch que son I/O bound
- Necesitas ejecutar comandos shell independientes concurrentemente

## Solución

### Background jobs con wait

```bash
#!/bin/bash

process_file() {
    local file="$1"
    gzip "$file"
    echo "Done: $file"
}

for file in *.log; do
    process_file "$file" &
done

wait
echo "All files processed"
```

### Limitar concurrencia con xargs

```bash
# Comprimir 4 archivos a la vez
find . -name "*.log" -print0 | xargs -0 -P4 -I{} gzip {}

# Redimensionar imágenes 8 a la vez
ls *.jpg | xargs -P8 -I{} convert {} -resize 50% small_{}
```

### GNU parallel

```bash
# Instalar si es necesario
# apt install parallel

# Procesar archivos en paralelo con barra de progreso
ls *.jpg | parallel -j 8 convert {} -resize 50% small_{}

# Procesar con progreso y ETA
ls *.jpg | parallel --progress -j 8 convert {} -resize 50% small_{}

# Mantener output ordenado
ls *.txt | parallel -k grep "error" {}
```

### Paralelo con función custom

```bash
#!/bin/bash

process_url() {
    local url="$1"
    local output=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    echo "$url: $output"
}

export -f process_url

urls=(
    "https://api.example.com/users"
    "https://api.example.com/posts"
    "https://api.example.com/comments"
)

printf '%s\n' "${urls[@]}" | parallel -j 4 process_url {}
```

### Recolectar resultados de jobs paralelos

```bash
#!/bin/bash

# Ejecutar comandos en background y recolectar exit codes
declare -a pids
declare -a results

for i in 1 2 3 4 5; do
    (sleep $((RANDOM % 5)); echo "Task $i done") &
    pids+=($!)
done

for pid in "${pids[@]}"; do
    wait "$pid"
    results+=("PID $pid exited with $?")
done

for result in "${results[@]}"; do
    echo "$result"
done
```

### Descargas de archivos en paralelo

```bash
#!/bin/bash

urls_file="downloads.txt"
# downloads.txt contiene un URL por línea

cat "$urls_file" | xargs -P4 -I{} wget -q {}

# O con GNU parallel
cat "$urls_file" | parallel -j 4 wget -q {}
```

### Paralelo con output a archivos separados

```bash
# Cada comando escribe a su propio archivo de log
ls *.txt | parallel 'grep "error" {} > {.}.errors'

# {.} quita la extensión, entonces file.txt se convierte en file.errors
```

## Explicación

Background jobs (`&`) envían un proceso al background y retornan inmediatamente. `wait` bloquea hasta que todos los background jobs terminan. Este es el enfoque más simple pero no tiene límite de concurrencia integrado. Si lanzas 1000 jobs, obtienes 1000 procesos simultáneos.

`xargs -P N` ejecuta hasta N comandos en paralelo. Lee items de stdin y los pasa al comando. `-0` maneja nombres de archivo con espacios. `-I{}` te permite posicionar el argumento con precisión.

`GNU parallel` es la herramienta más capaz. Soporta:
- **`-j N`**: Limitar jobs concurrentes a N.
- **`-k`**: Mantener output en orden de input (no de completion).
- **`--progress`**: Mostrar barra de progreso.
- **`{}`**: Placeholder para el item de input.
- **`{.}`**: Item de input sin extensión.
- **`--eta`**: Mostrar tiempo estimado de completion.

## Variantes

| Enfoque | Control de Concurrencia | Orden | Usar Cuando |
|---------|------------------------|-------|-------------|
| `&` + `wait` | Ninguno | Ninguno | Pocos jobs, scripts simples |
| `xargs -P` | Fijo (-P N) | Ninguno | Procesamiento batch de archivos |
| GNU parallel | Fijo (-j N) | Opcional (-k) | Workflows paralelos complejos |
| `coproc` | Único | Ninguno | Comunicación bidireccional |

## Pautas

- Limita la concurrencia al número de cores de CPU para tareas CPU-bound. Usa `-j $(nproc)`.
- Para tareas I/O-bound (descargas, llamadas a API), concurrencia más alta (8-16) está bien.
- Usa `xargs -0` o `parallel` para manejar nombres de archivo con espacios correctamente.
- Exporta funciones con `export -f` antes de usarlas en `xargs` o `parallel`.
- Usa `--dry-run` con `parallel` para previsualizar comandos antes de ejecutarlos.

## Errores Comunes

- Lanzar demasiados background jobs sin límite. Esto puede agotar memoria o file descriptors.
- No usar `wait` después de background jobs. El script sale antes de que los jobs terminen.
- Olvidar `-0` con `xargs` cuando los nombres de archivo contienen espacios. Los archivos se splitean en espacios.
- No exportar funciones al usarlas con `parallel`. La función no está disponible en subshells.
- Mezclar output de jobs paralelos sin `-k`. El output se intercala y se vuelve ilegible.

## Preguntas Frecuentes

### ¿Cómo limito el paralelismo al número de cores de CPU?

```bash
find . -name "*.jpg" | parallel -j $(nproc) convert {} -resize 50% small_{}
```

### ¿Cómo reintentar comandos fallidos con GNU parallel?

Usa `--retries N`:

```bash
cat urls.txt | parallel --retries 3 wget -q {}
```

### ¿Puedo usar parallel con SSH?

Sí. GNU parallel puede ejecutar comandos en máquinas remotas:

```bash
parallel --sshlogin server1,server2 -j 2 --transfer --return {}.out --cleanup "process.sh {}" ::: file1 file2
```

### ¿Cómo muestro una barra de progreso con xargs?

`xargs` no tiene barra de progreso integrada. Usa `parallel --progress` en su lugar, o pipea a través de `pv`:

```bash
cat urls.txt | pv -l | xargs -P4 -I{} wget -q {}
```
