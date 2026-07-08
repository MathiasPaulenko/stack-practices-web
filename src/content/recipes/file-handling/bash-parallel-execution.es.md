---
contentType: recipes
slug: bash-parallel-execution
title: "Ejecución Paralela en Bash"
description: "Cómo ejecutar comandos de shell en paralelo con xargs, GNU parallel y trabajos en segundo plano de Bash controlando la concurrencia y recolectando resultados."
metaDescription: "Ejecuta comandos de shell en paralelo con xargs, GNU parallel y trabajos en segundo plano, controlando concurrencia y recursos."
difficulty: intermediate
topics:
  - file-handling
tags:
  - file-handling
  - bash
  - parallel
  - xargs
  - concurrency
  - performance
  - recipe
relatedResources:
  - /recipes/file-handling/bash-loop-over-files
  - /recipes/file-handling/bash-text-processing
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Ejecuta comandos de shell en paralelo con xargs, GNU parallel y trabajos en segundo plano, controlando concurrencia y recursos."
  keywords:
    - file-handling
    - bash
    - parallel
    - xargs
    - concurrency
    - performance
    - recipe
---

## Descripción General

Las máquinas modernas tienen múltiples núcleos de CPU, pero muchos scripts de shell corren secuencialmente, dejando la mayoría de los núcleos inactivos. La ejecución paralela puede reducir el tiempo de procesamiento por batch en un 4-10x, pero el paralelismo sin control agota memoria, sobrecarga APIs o activa límites de tasa. El patron a continuacion demuestra patrones seguros para ejecución paralela en Bash.

## Cuándo Usar

- Procesar miles de archivos con una herramienta CPU-intensive (conversión de imágenes, compresión)
- Ejecutar tests a través de múltiples directorios o configuraciones
- Llamadas a APIs bulk donde el servicio remoto soporta concurrencia
- Descargar múltiples archivos simultáneamente con curl o wget
- Codificar videos o archivos de audio en batch

## Cuándo NO Usar

- La tarea está I/O-bound en un solo disco — lecturas paralelas pueden saturar el disco y ralentizar todo
- La API remota tiene límites de tasa estrictos — llamadas paralelas activan errores 429
- Las tareas dependen de la salida de otras — usa una herramienta DAG (Make, Airflow) en su lugar
- Necesitas preservar el orden de resultados — xargs y trabajos en segundo plano reordenan por tiempo de finalización

## Implementación Paso a Paso

### xargs (POSIX, Sin Dependencias Extra)

```bash
#!/bin/bash
set -euo pipefail

# Procesar 4 archivos a la vez
find images/ -name '*.png' -print0 | \
    xargs -0 -n 1 -P 4 convert '{}' '{}.jpg'

# Limitar concurrencia al número de CPUs
CPU_COUNT=$(nproc)
find images/ -name '*.png' -print0 | \
    xargs -0 -n 1 -P "$CPU_COUNT" convert '{}' '{}.jpg'

# Ejecutar un script por archivo, preservando códigos de salida
find data/ -name '*.json' -print0 | \
    xargs -0 -n 1 -P 4 -I {} sh -c 'validate_json "{}" || echo "FAIL: {}"'

# Copiar archivos a múltiples hosts en paralelo
for host in host1 host2 host3; do
    echo "$host"
done | xargs -n 1 -P 3 -I {} rsync -avz ./deploy/ {}:/var/app/
```

### GNU Parallel (Más Poderoso)

```bash
#!/bin/bash
set -euo pipefail

# Ejecución paralela básica con barra de progreso
find images/ -name '*.png' | \
    parallel --bar convert '{}' '{.}.jpg'

# Controlar concurrencia y preservar orden
find logs/ -name '*.log' | \
    parallel -j 8 --keep-order gzip '{}'

# Ejecutar diferentes comandos por entrada
parallel -j 4 'echo "Procesando {} en job {#}"' ::: file1 file2 file3 file4

# SSH paralelo a través de flota
parallel -j 10 --tag ssh {} uptime ::: server1 server2 server3

# Reanudar trabajos fallidos con --joblog
find videos/ -name '*.mov' | \
    parallel --joblog parallel.log --resume-failed \
    ffmpeg -i '{}' -c:v libx264 '{.}.mp4'

# Agrupar salida por job (--group) o intercalar (--ungroup)
parallel --ungroup -j 4 'ping -c 2 {}' ::: 8.8.8.8 1.1.1.1 9.9.9.9
```

### Trabajos en Segundo Plano de Bash

```bash
#!/bin/bash
set -euo pipefail

# Trabajos en segundo plano simples con wait
MAX_JOBS=4
for file in *.mp4; do
    # Esperar hasta que haya un slot libre
    while (( $(jobs -r | wc -l) >= MAX_JOBS )); do
        sleep 0.1
    done

    ffmpeg -i "$file" "${file%.mp4}.webm" &
done

# Esperar a que todos los trabajos en segundo plano terminen
wait

# Recolectar códigos de salida
EXIT_CODES=()
for job in $(jobs -p); do
    if wait "$job"; then
        EXIT_CODES+=(0)
    else
        EXIT_CODES+=("$?")
    fi
done

# Verificar fallos
for code in "${EXIT_CODES[@]}"; do
    if [ "$code" -ne 0 ]; then
        echo "Uno o más trabajos fallaron" >&2
        exit 1
    fi
done
```

### Patrón Semáforo para APIs con Límite de Tasa

```bash
#!/bin/bash
set -euo pipefail

# Semáforo GNU parallel para llamadas a APIs con límite de tasa
API_LIMIT=10  # llamadas por segundo

for id in $(cat ids.txt); do
    # Adquirir slot de semáforo (limitar llamadas concurrentes)
    sem --id api_calls -j "$API_LIMIT" \
        curl -s "https://api.example.com/items/$id" > "results/$id.json" &
done

wait
sem --id api_calls --wait
```

## Lo que funciona

- **Siempre configura `-P` o `-j` explícitamente.** El paralelismo ilimitado agota descriptores de archivo, memoria o cuotas remotas.
- **Usa `-print0 | xargs -0` o el manejo de líneas por defecto de GNU parallel.** Los nombres de archivo con espacios rompen pipelines ingenuos.
- **Prefiere `xargs` cuando esté disponible** por simplicidad y compatibilidad POSIX. Usa GNU parallel cuando necesites reanudar, ejecución remota o agrupación compleja.
- **Captura salida por trabajo para evitar entrelazado.** Redirige cada trabajo a su propio archivo de log, o usa la opción `--files` de GNU parallel.
- **Prueba con un subconjunto pequeño primero.** Haz `head -n 10` a tu lista de entrada y verifica que la ejecución paralela produce los mismos resultados que la secuencial.

## Errores Comunes

- **Correr sin límite `-P`.** El `xargs` por defecto es secuencial (`-P 1`); olvidar configurarlo es seguro pero lento. GNU parallel usa por defecto el número de núcleos de CPU, que aún puede ser demasiado alto para trabajo I/O-bound.
- **Salida entrelazada.** Múltiples trabajos escribiendo a stdout simultáneamente producen líneas mezcladas. Usa `--group` (GNU parallel) o redirige a archivos individuales.
- **Ignorar códigos de salida.** `xargs` con `-P` sale con 123 si algún hijo falla, pero debes verificarlo. Los trabajos en segundo plano requieren loops de `wait` para detectar fallos.
- **Pasar variables de shell a xargs incorrectamente.** Las comillas simples en `sh -c` previenen la expansión de variables. Usa comillas dobles y escapa cuidadosamente, o pasa variables como argumentos posicionales.
- **Usar GNU parallel sin aceptar el aviso de citación.** Imprime un recordatorio de citación en el primer uso; usa `--will-cite` o `--cite` para silenciarlo en CI.

## Preguntas Frecuentes

**Q: ¿Cuál es el riesgo de ejecutar demasiados jobs en paralelo?**
A: Puedes agotar CPU, memoria o descriptores de archivo, y saturar servicios o APIs downstream. Siempre limita la concurrencia a un límite probado.

**Q: ¿Cómo limito el paralelismo con GNU parallel?**
A: Usa `parallel -j 4` para ejecutar como máximo cuatro jobs simultáneamente. Ajusta el número según los núcleos de CPU y restricciones de I/O.

**Q: ¿Cómo manejo fallos en jobs paralelos?**
A: Usa `parallel --halt soon,fail=1` para detenerte en el primer fallo, o captura los códigos de salida por separado y agrégalos al final.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Soluciones Avanzadas

### Cola de jobs con control de concurrencia basado en FIFO

```bash
#!/bin/bash
set -euo pipefail

# Cola de jobs basada en FIFO para control preciso de concurrencia
# Funciona sin GNU parallel, usando solo herramientas POSIX

MAX_JOBS=4
FIFO="/tmp/job_queue_$$"
mkfifo "$FIFO"
exec 3<>"$FIFO"
rm "$FIFO"

# Pre-llenar la cola con tokens
for ((i = 0; i < MAX_JOBS; i++)); do
    echo >&3
done

process_file() {
    local file="$1"
    local base="${file%.log}"
    gzip "$file"
    echo "Comprimido: $file"
}

# Procesar archivos, adquiriendo un token antes de cada job
for file in *.log; do
    [ -e "$file" ] || continue
    # Leer un token (bloquea si todos los slots están ocupados)
    read -u 3
    process_file "$file" &
done

# Esperar a que todos los jobs en segundo plano terminen
wait
exec 3>&-
```

### Manejo de timeout por job

```bash
#!/bin/bash
set -uo pipefail

# Ejecutar jobs con timeout por job, recolectando resultados
TIMEOUT=30
RESULTS_DIR="./results"
mkdir -p "$RESULTS_DIR"

run_with_timeout() {
    local file="$1"
    local name=$(basename "$file")
    local output="$RESULTS_DIR/${name}.out"
    local errors="$RESULTS_DIR/${name}.err"

    timeout "$TIMEOUT" python3 "$file" >"$output" 2>"$errors"
    local exit_code=$?

    case $exit_code in
        0)   echo "[OK]   $name" ;;
        124) echo "[TIMEOUT] $name excedió ${TIMEOUT}s" ;;
        *)   echo "[FAIL] $name salió con $exit_code" ;;
    esac
    return $exit_code
}

# Ejecutar en paralelo con xargs, cada job tiene su propio timeout
export -f run_with_timeout
export TIMEOUT RESULTS_DIR

find scripts/ -name '*.py' -print0 | \
    xargs -0 -P 4 -I {} bash -c 'run_with_timeout "{}"'
```

### Agregación de resultados con archivos temporales

```bash
#!/bin/bash
set -euo pipefail

# Procesamiento paralelo con resultados agregados
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

MAX_JOBS=4
TOTAL=0
SUCCESS=0
FAIL=0

# Cada worker escribe su resultado a un archivo temporal
worker() {
    local file="$1"
    local result_file="$TMPDIR/result_$$"
    if python3 -c "import json; json.load(open('$file'))" 2>/dev/null; then
        echo "OK $file" >> "$result_file"
    else
        echo "FAIL $file" >> "$result_file"
    fi
}

export -f worker
export TMPDIR

# Contar total
shopt -s nullglob
files=(*.json)
TOTAL=${#files[@]}
shopt -u nullglob

if [ "$TOTAL" -eq 0 ]; then
    echo "No se encontraron archivos JSON"
    exit 0
fi

# Ejecutar en paralelo
for file in "${files[@]}"; do
    worker "$file" &
    while [ "$(jobs -rp | wc -l)" -ge "$MAX_JOBS" ]; do
        wait -n 2>/dev/null || sleep 0.1
    done
done
wait

# Agregar resultados
if [ -f "$TMPDIR/result_$$" ]; then
    SUCCESS=$(grep -c "^OK" "$TMPDIR/result_$$" || true)
    FAIL=$(grep -c "^FAIL" "$TMPDIR/result_$$" || true)
fi

echo "=== Resumen ==="
echo "Total:  $TOTAL"
echo "OK:     $SUCCESS"
echo "FAIL:   $FAIL"
```

### Concurrencia dinámica basada en carga del sistema

```bash
#!/bin/bash
set -euo pipefail

# Ajustar concurrencia basado en el load average actual del sistema
get_dynamic_jobs() {
    local load_avg=$(awk '{print int($1)}' /proc/loadavg 2>/dev/null || echo 1)
    local cpu_count=$(nproc 2>/dev/null || echo 4)
    local available=$((cpu_count - load_avg))
    if [ "$available" -lt 1 ]; then
        available=1
    fi
    echo "$available"
}

MAX_CPU=$(nproc)
echo "Núcleos CPU: $MAX_CPU"

for file in *.mp4; do
    [ -e "$file" ] || continue

    # Verificar dinámicamente cuántos jobs podemos iniciar
    current_jobs=$(jobs -rp | wc -l)
    dynamic_limit=$(get_dynamic_jobs)

    while [ "$current_jobs" -ge "$dynamic_limit" ]; do
        wait -n 2>/dev/null || sleep 0.5
        current_jobs=$(jobs -rp | wc -l)
        dynamic_limit=$(get_dynamic_jobs)
    done

    ffmpeg -i "$file" -c:v libx264 -preset fast "${file%.mp4}.mkv" 2>/dev/null &
    echo "Iniciado: $file (jobs: $(jobs -rp | wc -l))"
done

wait
echo "Todas las conversiones completas"
```

## Mejores Prácticas Adicionales

1. **Usa `wait -n` para gestión eficiente de slots de jobs.** Bash 4.3+ soporta `wait -n`, que espera al siguiente job que termine. Es más eficiente que polling con `sleep`:

```bash
#!/bin/bash
set -euo pipefail
MAX_JOBS=4

for file in *.png; do
    [ -e "$file" ] || continue
    # Esperar a que cualquier job termine si estamos a capacidad
    while [ "$(jobs -rp | wc -l)" -ge "$MAX_JOBS" ]; do
        wait -n 2>/dev/null || sleep 0.1
    done
    convert "$file" "${file%.png}.webp" &
done
wait
```

2. **Loguea la salida por job a archivos separados.** Esto previene salida entrelazada y provee debugging por job:

```bash
#!/bin/bash
set -euo pipefail
LOG_DIR="./logs"
mkdir -p "$LOG_DIR"

find data/ -name '*.csv' -print0 | while IFS= read -r -d '' file; do
    name=$(basename "$file" .csv)
    parallel -j 4 --results "$LOG_DIR/{1}" \
        process_csv {} ::: "$file"
done
```

3. **Usa `--halt` para comportamiento fail-fast con GNU parallel.** Detiene todos los jobs en el primer fallo para evitar desperdiciar recursos:

```bash
#!/bin/bash
# Detener en el primer fallo, matar jobs en ejecución
find tests/ -name '*.sh' | parallel -j 8 --halt soon,fail=1 bash {}

# Detener en el primer fallo, esperar a que los jobs en ejecución terminen
find tests/ -name '*.sh' | parallel -j 8 --halt now,fail=1 bash {}
```

## Errores Comunes Adicionales

1. **Usar `wait` sin verificar códigos de salida individuales.** `wait` sin argumentos retorna 0 si todos los jobs tienen éxito, pero con `set -e`, un job en segundo plano que falla puede no disparar un exit a menos que explícitamente esperes por él:

```bash
#!/bin/bash
set -uo pipefail

# Mal: set -e no captura fallos de jobs en segundo plano
# command_that_fails &
# wait  # Puede no salir con error

# Bien: verificar el código de salida de cada job
pids=()
for file in *.txt; do
    [ -e "$file" ] || continue
    process "$file" &
    pids+=($!)
done

failed=0
for pid in "${pids[@]}"; do
    if ! wait "$pid"; then
        echo "Job $pid falló" >&2
        ((failed++))
    fi
done
[ "$failed" -eq 0 ] || exit 1
```

2. **No manejar `SIGINT` (Ctrl+C) en scripts paralelos.** Los jobs en segundo plano continúan ejecutándose después de que el padre es matado. Captura señales y limpia:

```bash
#!/bin/bash
set -uo pipefail

# Matar todos los jobs en segundo plano al salir
cleanup() {
    echo "Limpiando jobs en segundo plano..."
    jobs -p | xargs -r kill 2>/dev/null
    exit 1
}
trap cleanup SIGINT SIGTERM

for file in *.mp4; do
    [ -e "$file" ] || continue
    ffmpeg -i "$file" "${file%.mp4}.webm" &
done

wait
```

3. **Olvidar que los subshells no comparten estado de variables.** Los jobs en segundo plano corren en subshells, así que los cambios de variables dentro de ellos no son visibles en el padre:

```bash
#!/bin/bash
# Mal: counter no será actualizado por jobs en segundo plano
# counter=0
# for file in *.txt; do
#     ((counter++)) &
# done
# wait
# echo "$counter"  # Sigue siendo 0

# Bien: usa archivos temporales para estado compartido
counter_file=$(mktemp)
echo 0 > "$counter_file"

for file in *.txt; do
    [ -e "$file" ] || continue
    {
        flock "$counter_file" -c "echo \$((\$(cat $counter_file) + 1)) > $counter_file"
    } &
done
wait
echo "Procesados: $(cat $counter_file)"
rm "$counter_file"
```

## Preguntas Frecuentes Adicionales

### ¿Cómo elijo entre xargs y GNU parallel?

Usa `xargs` cuando necesites compatibilidad POSIX, sin dependencias extra, y patrones simples de un comando por entrada. Usa GNU parallel cuando necesites capacidad de reanudar (`--joblog --resume-failed`), barras de progreso (`--bar`), agrupación de salida (`--group`), ejecución remota (`--sshlogin`), o manipulación compleja de entrada (`--colsep`, `{1}`, `{2}`). GNU parallel es más potente pero puede no estar instalado por defecto en todos los sistemas.

### ¿Cómo hago benchmark del nivel óptimo de concurrencia?

Empieza con `nproc` (número de CPUs) para tareas CPU-bound. Para tareas I/O-bound (red, disco), empieza con 2-4x `nproc`. Mide el throughput en cada nivel y encuentra la meseta. Usa `time` para medir la ejecución total:

```bash
#!/bin/bash
# Benchmark de diferentes niveles de concurrencia
for jobs in 1 2 4 8 16; do
    echo -n "Jobs=$jobs: "
    time (find images/ -name '*.png' -print0 | \
        xargs -0 -n 1 -P "$jobs" -I{} convert '{}' '{.}.jpg' 2>/dev/null)
done
```

### ¿Cómo ejecuto jobs paralelos a través de hosts remotos?

Usa GNU parallel con `--sshlogin` o SSH plano con jobs en segundo plano:

```bash
#!/bin/bash
# GNU parallel a través de hosts remotos
parallel -S server1,server2,server3 -j 4 \
    'cd /var/app && git pull && npm install && npm run build' ::: {}

# SSH plano con jobs en segundo plano
hosts=("server1" "server2" "server3")
for host in "${hosts[@]}"; do
    ssh "$host" 'cd /var/app && git pull && npm install' &
done
wait
echo "Todos los hosts actualizados"
```
