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
  - /recipes/bash-aws-cli-scripts
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

### Patrón Semáforo para Concurrencia Controlada

```bash
#!/bin/bash
# semaphore.sh — limitar background jobs con un semáforo

MAX_JOBS=4
open_semaphores() {
    for i in $(seq 1 $MAX_JOBS); do
        echo
    done
}

run_with_semaphore() {
    read -r line <&3
    (
        "$@"
    ) 3>&1
}

# Abrir semáforo
exec 3< <(open_semaphores)

for file in *.log; do
    run_with_semaphore process_file "$file" &
done

wait
echo "Todos listos con max $MAX_JOBS jobs concurrentes"
```

### Manejo de Errores en Jobs Paralelos

```bash
#!/bin/bash
# parallel-with-errors.sh

process_with_error() {
    local file="$1"
    if gzip "$file" 2>/dev/null; then
        echo "OK: $file"
    else
        echo "FAIL: $file" >&2
        return 1
    fi
}

export -f process_with_error

# Capturar exit codes
find . -name "*.log" | parallel -j 4 process_with_error {}
EXIT_CODES=$?

if [ $EXIT_CODES -ne 0 ]; then
    echo "Algunos jobs fallaron. Exit code: $EXIT_CODES"
    exit 1
fi
```

### Timeout por Job

```bash
#!/bin/bash
# timeout-parallel.sh

# Cada job tiene un timeout de 30 segundos
cat urls.txt | parallel -j 8 --timeout 30 wget -q {}

# Con comando timeout de GNU para funciones custom
process_with_timeout() {
    local url="$1"
    timeout 30 curl -s -o /dev/null -w "%{http_code}" "$url" || echo "TIMEOUT: $url"
}

export -f process_with_timeout
cat urls.txt | parallel -j 8 process_with_timeout {}
```

### Paralelo con Logging

```bash
#!/bin/bash
# parallel-logging.sh

LOGDIR="./logs"
mkdir -p "$LOGDIR"

process_and_log() {
    local file="$1"
    local logfile="$LOGDIR/$(basename "$file").log"
    {
        echo "Start: $(date -Iseconds)"
        gzip "$file"
        echo "End: $(date -Iseconds) exit=$?"
    } > "$logfile" 2>&1
}

export -f process_and_log

find . -name "*.log" -not -path "./logs/*" | parallel -j 4 process_and_log {}
```

## Mejores Prácticas Adicionales


- For a deeper guide, see [Parallel Job Execution with Bash](/es/recipes/bash-parallel-job-execution/).

1. **Usa `--joblog` para trackear resultados.** GNU parallel puede escribir un log estructurado de todos los jobs:

```bash
parallel --joblog results.txt -j 4 process.sh ::: file1 file2 file3

# Formato de results.txt:
# Seq Host Starttime JobRuntime Send Receive Exitval Signal Command
```

2. **Dry-run antes de ejecutar.** Siempre previsualiza lo que parallel va a ejecutar:

```bash
# Mostrar comandos sin ejecutar
parallel --dry-run -j 4 gzip {} ::: *.log
```

3. **Usa `--bar` para progreso simple.** Más limpio que `--progress` para terminales:

```bash
ls *.jpg | parallel --bar -j 8 convert {} -resize 50% small_{}
```

## Errores Comunes Adicionales

1. **No manejar nombres de archivo con newlines.** Usa `-0` con xargs y `-print0` con find:

```bash
# Mal: se rompe con nombres de archivo con espacios o newlines
find . -name "*.txt" | xargs -P4 grep "error"

# Bien: delimitado por null
find . -name "*.txt" -print0 | xargs -0 -P4 grep "error"
```

2. **Olvidar exportar variables.** Los subshells no heredan variables no exportadas:

```bash
# Mal: CONFIG_FILE está vacío en subshell
CONFIG_FILE="/etc/app.conf"
parallel -j 4 process.sh {} ::: *.txt

# Bien: exportarla
export CONFIG_FILE="/etc/app.conf"
parallel -j 4 process.sh {} ::: *.txt
```

3. **No setear `ulimit` para lotes grandes.** Demasiados file handles pueden crashear:

```bash
# Aumentar límite de file descriptors antes de correr lotes grandes
ulimit -n 4096
find . -name "*.log" | parallel -j 32 gzip {}
```

## FAQ Adicional

### Como ejecuto jobs paralelos a través de múltiples servidores?

Usa `--sshlogin` con un archivo de lista de servidores:

```bash
# servers.txt:
# server1
# server2
# server3
parallel --sshloginfile servers.txt -j 2 "uptime" ::: 1 2 3
```

### Cuál es la diferencia entre `xargs -P` y `parallel -j`?

`xargs -P` es más simple y disponible en todos los sistemas Unix. `parallel -j` ofrece más features: output ordenado (`-k`), barras de progreso, reintentos, job logging, distribución SSH, y reemplazo estructurado de argumentos. Usa `xargs` para one-liners rápidos, `parallel` para workflows complejos.

### Como mato todos los jobs paralelos si uno falla?

Usa `--halt` para detener todos los jobs en el primer fallo:

```bash
# Detener todos los jobs inmediatamente en el primer error
parallel --halt now,fail=1 -j 4 process.sh {} ::: *.txt

# Detener después de 3 fallos
parallel --halt soon,fail=3 -j 4 process.sh {} ::: *.txt
```

## Tips de Rendimiento

1. **Benchmark diferentes niveles de concurrencia.** El valor óptimo de `-j` depende de tu workload:

```bash
# Testear con diferentes concurrencias
for j in 1 2 4 8 16; do
    time find . -name "*.log" | parallel -j $j gzip {}
done
```

2. **Usa `--round-robin` para workloads desiguales.** Distribuye el trabajo más uniformemente cuando los jobs varían en tamaño:

```bash
# Agrupar archivos por tamaño, luego distribuir
find . -name "*.log" -exec du -b {} + | sort -n | parallel --round-robin -j 4 gzip {2}
```

3. **Fija jobs a cores de CPU con `taskset`.** Para trabajo CPU-bound, evita context switching:

```bash
# Asignar cada job paralelo a un core específico
parallel -j $(nproc) 'taskset -c %{} gzip {}' ::: *.log
```
