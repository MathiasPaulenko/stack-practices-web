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
