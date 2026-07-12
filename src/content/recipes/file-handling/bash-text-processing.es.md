---
contentType: recipes
slug: bash-text-processing
title: "Procesamiento de Texto en Bash"
description: "Cómo construir pipelines de procesamiento de texto con grep, sed, awk, cut, sort, uniq y tr para análisis de logs y transformación de datos."
metaDescription: "Construye pipelines de procesamiento de texto con grep, sed, awk, cut, sort, uniq y tr para análisis de logs y transformación de datos."
difficulty: intermediate
topics:
  - file-handling
tags:
  - file-handling
  - bash
  - grep
  - sed
  - awk
  - text-processing
  - recipe
relatedResources:
  - /recipes/file-handling/bash-loop-over-files
  - /recipes/file-handling/bash-parallel-execution
  - /recipes/observability/structured-logging
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Construye pipelines de procesamiento de texto con grep, sed, awk, cut, sort, uniq y tr para análisis de logs y transformación de datos."
  keywords:
    - file-handling
    - bash
    - grep
    - sed
    - awk
    - text-processing
    - recipe
---

## Descripción General

Las herramientas de procesamiento de texto Unix están diseñadas para componerse en pipelines: cada herramienta hace una cosa bien, y el shell las conecta con pipes. Una sola línea de Bash puede reemplazar cientos de líneas de Python o JavaScript para análisis de logs, extracción de datos y generación de reportes. El siguiente enfoque cubre las herramientas esenciales y cómo combinarlas de forma segura.

## Cuándo Usar

- Extraer y filtrar líneas de log por patrón, tiempo o código de estado
- Transformar datos CSV o tabulares (ordenar, deduplicación, agregación)
- Buscar en bases de código por patrones a través de miles de archivos
- Generar reportes rápidos desde salida de texto estructurado
- Pre-procesar datos antes de alimentarlos a una base de datos o API

## Cuándo NO Usar

- Parsear formatos anidados o irregulares (JSON, XML, HTML) — usa `jq`, `xq` o un parser apropiado
- Tareas que requieren estado complejo entre líneas — awk puede hacerlo, pero Python es más mantenible
- Transformaciones multi-paso donde el manejo de errores importa — los lenguajes de scripting tienen mejor debugging
- Casos edge de Unicode — las herramientas clásicas son byte-oriented y pueden dañar caracteres multibyte

## Implementación Paso a Paso

### grep — Coincidencia de Patrones

```bash
# Buscar recursivamente, mostrar números de línea, ignorar archivos binarios
grep -rn "ERROR" logs/

# Coincidencia invertida, contar ocurrencias
grep -vc "^#" config.ini

# Múltiples patrones con regex extendida
grep -E "(ERROR|FATAL|CRITICAL)" app.log

# Líneas de contexto: 2 antes, 3 después
grep -B 2 -A 3 "Exception" app.log

# Solo nombres de archivo que contienen coincidencia (útil para operaciones batch)
grep -rl "TODO" src/

# Regex compatible con Perl (PCRE) para lookaheads
grep -P "(?<=user_id=)\d+" access.log
```

### sed — Edición de Streams

```bash
# Reemplazar primera ocurrencia por línea
sed 's/foo/bar/' file.txt

# Reemplazar todas las ocurrencias globalmente
sed 's/foo/bar/g' file.txt

# Reemplazar in-place con backup
sed -i.bak 's/old_domain/new_domain/g' config.conf

# Eliminar líneas que coinciden con patrón
sed '/^#/d' config.ini        # Eliminar comentarios
sed '/^$/d' file.txt          # Eliminar líneas vacías

# Extraer líneas específicas
sed -n '10,20p' file.txt      # Imprimir líneas 10-20
sed -n '50,$p' file.txt       # Imprimir desde línea 50 al final

# Reemplazo multi-línea (append después de coincidencia)
sed '/pattern/a\\New line after match' file.txt
```

### awk — Procesamiento de Campos y Agregación

```bash
# Imprimir columnas específicas (delimitadas por espacio/tabulador)
awk '{print $1, $3}' access.log

# Sumar una columna
awk '{sum += $2} END {print sum}' sales.txt

# Promedio con conteo
awk '{sum += $2; count++} END {if (count) print sum/count}' data.txt

# Filtrar filas por condición
awk '$3 > 100 {print $1, $3}' orders.csv

# Procesar CSV con delimitador personalizado
awk -F',' '{print $2, $5}' customers.csv

# Agrupar y contar (como SQL GROUP BY)
awk '{count[$1]++} END {for (k in count) print k, count[k]}' status.log

# Formatear salida con encabezados
awk 'BEGIN {print "IP", "Requests"} {count[$1]++} END {for (ip in count) print ip, count[ip]}' access.log
```

### cut, sort, uniq — Extracción de Columnas y Deduplicación

```bash
# Extraer columnas por posición o delimitador
cut -d',' -f1,3,5 data.csv
cut -c1-10 file.txt           # Primeros 10 caracteres

# Ordenar numéricamente, inverso, por columna específica
sort -t',' -k3 -n sales.csv   # Ordenar por 3ra columna numéricamente
sort -u file.txt               # Ordenar y eliminar duplicados

# Contar ocurrencias únicas
sort file.txt | uniq -c | sort -rn   # Más frecuentes primero

# Mostrar solo líneas duplicadas o únicas
sort file.txt | uniq -d       # Solo duplicados
sort file.txt | uniq -u       # Solo líneas únicas
```

### tr — Traducción de Caracteres

```bash
# Convertir a mayúsculas
cat file.txt | tr 'a-z' 'A-Z'

# Comprimir caracteres repetidos
tr -s ' ' < file.txt           # Colapsar múltiples espacios a uno

# Eliminar caracteres
tr -d '\r' < file.txt          # Eliminar retornos de carro

# Reemplazar finales de línea
tr '\n' ',' < lines.txt > comma-separated.txt
```

### Pipelines Complejos

```bash
# Top 10 tipos de error más frecuentes en un log
awk '$0 ~ /ERROR|FATAL/ {print $5}' app.log | \
    sort | uniq -c | sort -rn | head -10

# Extraer IPs únicas de clientes con conteo de requests, ordenado
awk '{print $1}' access.log | sort | uniq -c | sort -rn | \
    awk '{print $2 "," $1}' > ip_counts.csv

# Encontrar queries lentas (>1s) y agrupar por tabla
awk '$NF > 1 {print}' slow_query.log | \
    grep -oP 'FROM \K\w+' | sort | uniq -c | sort -rn

# Convertir timestamps de log a formato ISO y filtrar rango de fechas
sed -n '/2024-06-01/,/2024-06-07/p' app.log | \
    awk '{gsub(/\//, "-", $1); print $1 "T" $2}'

# Generar reporte: distribución de códigos de estado
awk '{print $9}' access.log | sort | uniq -c | \
    awk '{printf "%s: %d requests (%.1f%%)\n", $2, $1, $1*100/total}' \
    total=$(wc -l < access.log)
```

## Lo que funciona

- **Siempre entrecomilla patrones de regex con caracteres especiales.** `grep "$pattern"` previene que el shell expanda `*` o `?` antes de que grep los vea.
- **Usa `awk` para datos columnares en lugar de `cut` cuando los campos varían en ancho.** `cut` falla con espaciado variable; `awk` divide en cualquier whitespace por defecto.
- **Prefiere `jq` para JSON, `xq` para XML, `csvkit` para CSV.** Las herramientas clásicas tratan estos formatos como texto plano y romperán en campos entrecomillados o estructuras anidadas.
- **Encadena herramientas de izquierda a derecha en orden de filtrado.** Pon `grep` temprano para reducir volumen de datos antes de operaciones costosas de `awk` o `sort`.
- **Usa `LC_ALL=C` para ordenamiento consistente y rendimiento.** Fuerza ordenamiento byte-wise y evita comportamiento dependiente de locale.

## Errores Comunes

- **Parsear JSON/HTML con grep/sed/awk.** Estos no son formatos estructurados — usa `jq`, `python -m json.tool` o un DOM parser.
- **Olvidar que `sed` y `awk` operan línea por línea por defecto.** Los patrones multi-línea requieren flags especiales (`sed -z`, manipulación de RS en `awk`) que no son obvios.
- **Asumir que `sort` es estable por defecto.** La estabilidad de `sort` varía por implementación; usa `sort -s` si la necesitas.
- **Usar `cat` innecesariamente.** `cat file | grep pattern` es un uso inútil de `cat`. Usa `grep pattern file`.
- **No manejar entrada vacía.** Muchos pipelines fallan silenciosamente en archivos vacíos — agrega `| cat` al final o verifica el tamaño del archivo primero.

## Preguntas Frecuentes

**Q: ¿Cuándo debo usar awk en lugar de sed?**
A: Usa `awk` para procesamiento basado en campos, aritmética y registros estructurados. Usa `sed` para sustituciones simples, eliminaciones y transformaciones orientadas a líneas.

**Q: ¿Cómo manejo archivos CSV de forma segura en Bash?**
A: Usa un parser CSV apropiado como el módulo `csv` de Python o `csvkit`. El `cut` o `awk` puro falla con campos entre comillas y comas embebidas.

**Q: ¿Por qué grep con regex es más lento de lo esperado?**
A: Las expresiones regulares con backtracking, especialmente con alternancias y comodines, pueden ser lentas. Usa búsqueda de string fijo con `grep -F` cuando no necesites regex.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Soluciones Avanzadas

### Máquina de estados en awk para registros multi-línea

awk puede rastrear estado entre líneas para extraer entradas de log multi-línea (e.g., stack traces):

```bash
#!/bin/bash

# Extraer stack traces de Java con sus mensajes de error
awk '
    /ERROR/ {
        in_error = 1
        print "---"
        print
        next
    }
    in_error && /^\s+at / {
        print
        next
    }
    in_error && /^Caused by:/ {
        print
        next
    }
    in_error {
        in_error = 0
        print "---"
    }
' app.log

# Extraer bloques de funciones de código fuente
awk '
    /^[a-zA-Z_].*\(/ { in_func = 1; brace_count = 0 }
    in_func { print }
    in_func && /{/ { brace_count++ }
    in_func && /}/ { brace_count--; if (brace_count == 0) { in_func = 0; print "---" } }
' source.c
```

### Patrones multi-línea con sed usando N y D

```bash
# Unir líneas que terminan con backslash (líneas de continuación)
sed ':a; /\\$/N; s/\\\n//; ta' file.txt

# Reemplazar texto que abarca múltiples líneas
sed 'N;s/match\nacross/matched\nlines/' file.txt

# Eliminar líneas vacías entre bloques de contenido
sed '/^$/{N;/^\n$/D}' file.txt

# Insertar un encabezado antes de la primera línea de un archivo
sed '1i\\## Encabezado de Reporte\n## Generado: $(date)' report.txt

# Capitalizar primera letra de cada palabra
sed 's/\b\(.\)/\u\1/g' file.txt
```

### Pipeline de análisis de logs con agrupación por ventana de tiempo

```bash
#!/bin/bash
set -euo pipefail

# Log Apache/Nginx: agrupar requests por ventanas de 5 minutos y código de estado
# Formato log: [10/Oct/2024:13:55:36 +0000] "GET /path" 200 1234

awk '
{
    # Extraer hora:minuto y redondear a ventana de 5 min
    match($0, /\[([0-9]+)\/([A-Za-z]+)\/([0-9]+):([0-9]+):([0-9]+)/, t)
    if (t[4] != "" && t[5] != "") {
        min = int(t[5] / 5) * 5
        window = sprintf("%s:%02d", t[4], min)
        status = $9  # Código HTTP
        count[window][status]++
    }
}
END {
    for (w in count) {
        for (s in count[w]) {
            printf "%s,%s,%d\n", w, s, count[w][s]
        }
    }
}
' access.log | sort -t',' -k1,1 -k2,2n > status_by_window.csv

echo "Ventana de tiempo,Código de estado,Conteo de requests"
cat status_by_window.csv
```

### Procesamiento de CSV con awk (manejando campos entre comillas)

```bash
#!/bin/bash

# Script awk que maneja campos CSV entre comillas con comas embebidas
awk -F'"' '
    function parse_csv(line,    fields, i, in_quote, field, char) {
        in_quote = 0
        field = ""
        field_idx = 1
        for (i = 1; i <= length(line); i++) {
            char = substr(line, i, 1)
            if (char == "\"") {
                in_quote = !in_quote
            } else if (char == "," && !in_quote) {
                fields[field_idx] = field
                field = ""
                field_idx++
            } else {
                field = field char
            }
        }
        fields[field_idx] = field
        return field_idx
    }
    {
        n = parse_csv($0)
        # Imprimir columnas 2 y 4 (nombre y email)
        if (n >= 4) print fields[2], fields[4]
    }
' contacts.csv

# Alternativa: usar csvkit para manejo robusto de CSV
# csvcut -c 2,4 contacts.csv
# csvgrep -c 3 -r "^Active$" contacts.csv | csvcut -c 1,2
```

### Patrones de extracción y transformación de texto

```bash
#!/bin/bash
set -euo pipefail

# Extraer todas las URLs de un archivo de texto
grep -oP 'https?://[^\s<>"'"'"']+' input.txt | sort -u

# Extraer direcciones de email y contar por dominio
grep -oP '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' emails.txt | \
    awk -F'@' '{print $2}' | sort | uniq -c | sort -rn

# Extraer y normalizar números de teléfono
sed -E 's/([0-9]{3})[-. ]?([0-9]{3})[-. ]?([0-9]{4})/\1-\2-\3/g' contacts.txt

# Extraer pares clave-valor de archivos de configuración
awk -F'=' '/^[^#]/ && NF==2 {gsub(/^[ \t]+|[ \t]+$/, "", $1); gsub(/^[ \t]+|[ \t]+$/, "", $2); print $1"="$2}' config.ini

# Convertir tab-separated a comma-separated (manejando tabs embebidos)
tr '\t' ',' < data.tsv > data.csv

# Remover códigos de color ANSI de la salida
sed 's/\x1b\[[0-9;]*m//g' colored_output.txt

# Extraer valores JSON con grep y sed (fallback cuando jq no está disponible)
grep -oP '"user_id"\s*:\s*\K[0-9]+' response.json | head -1
grep -oP '"name"\s*:\s*"\K[^"]+' response.json
```

### Procesamiento de texto en paralelo con split y merge

```bash
#!/bin/bash
set -euo pipefail

INPUT_FILE="large_log.txt"
CHUNK_SIZE=100000
OUTPUT_DIR=$(mktemp -d)
trap 'rm -rf "$OUTPUT_DIR"' EXIT

# Dividir archivo en chunks
split -l "$CHUNK_SIZE" "$INPUT_FILE" "$OUTPUT_DIR/chunk_"

# Procesar chunks en paralelo
for chunk in "$OUTPUT_DIR"/chunk_*; do
    (
        # Contar errores por chunk
        grep -c "ERROR" "$chunk" > "${chunk}.result"
    ) &
done
wait

# Fusionar resultados
total=0
for result in "$OUTPUT_DIR"/chunk_*.result; do
    count=$(cat "$result")
    total=$((total + count))
done

echo "Total de líneas ERROR: $total"
```

### Colección de one-liners de awk para tareas comunes

```bash
# Filtrar líneas por rango de número de línea
awk 'NR>=10 && NR<=20' file.txt

# Imprimir cada N-ésima línea
awk 'NR%3==0' file.txt          # Cada 3ra línea

# Eliminar líneas duplicadas preservando orden
awk '!seen[$0]++' file.txt

# Unir líneas con un separador
awk '{printf "%s%s", $0, (NR==1?"":", ")} END {print ""}' file.txt

# Calcular total acumulado
awk '{sum += $1; print NR, $1, sum}' numbers.txt

# Encontrar la línea más larga
awk '{if (length > max) {max = length; line = $0}} END {print line}' file.txt

# Imprimir líneas más largas que N caracteres
awk 'length > 80' file.txt

# Recortar whitespace inicial y final
awk '{gsub(/^[ \t]+|[ \t]+$/, ""); print}' file.txt

# Invertir orden de columnas
awk '{for (i=NF; i>=1; i--) printf "%s%s", $i, (i>1?OFS:ORS)}' file.txt

# Contar palabras por línea
awk '{print NR, NF, $0}' file.txt

# Imprimir pares de número de campo y nombre
awk '{for (i=1; i<=NF; i++) print i, $i}' file.txt
```

## Mejores Prácticas Adicionales

1. **Usa `LC_ALL=C` para 2-5x de speedup en archivos grandes.** El ordenamiento y comparación byte-wise omite el procesamiento Unicode dependiente de locale:

```bash
# Lento: ordenamiento locale-aware
sort large_file.txt > sorted.txt

# Rápido: ordenamiento byte-wise (2-5x más rápido en datos ASCII)
LC_ALL=C sort large_file.txt > sorted.txt

# grep rápido en archivos grandes
LC_ALL=C grep -n "pattern" huge_file.log
```

2. **Usa `grep -F` para strings fijos.** Cuando no necesitas regex, el modo de string fijo es considerablemente más rápido:

```bash
# Lento: el motor de regex procesa un string literal
grep "192.168.1.1" access.log

# Rápido: búsqueda de string fijo (sin overhead de regex)
grep -F "192.168.1.1" access.log

# Rápido: múltiples strings fijos desde un archivo
grep -Ff patterns.txt access.log
```

3. **Usa `mawk` o `gawk` para rendimiento.** `mawk` es más rápido que `gawk` para tareas simples, mientras que `gawk` tiene más features:

```bash
# Verificar qué awk está instalado
awk --version 2>/dev/null || awk -W version 2>&1 | head -1

# Instalar mawk para velocidad (Debian/Ubuntu)
# apt-get install mawk

# Usar mawk explícitamente para pipelines críticos de rendimiento
mawk '{print $1, $9}' access.log | sort | uniq -c | sort -rn
```

## Errores Comunes Adicionales

1. **Usar `sed -i` sin backup en archivos de producción.** Un regex incorrecto puede destruir el contenido del archivo irreversiblemente:

```bash
# Arriesgado: sin backup
sed -i 's/pattern/replacement/g' important.conf

# Seguro: crear backup con extensión .bak
sed -i.bak 's/pattern/replacement/g' important.conf

# Seguro: escribir a archivo temporal primero, verificar, luego reemplazar
sed 's/pattern/replacement/g' important.conf > important.conf.tmp
diff important.conf important.conf.tmp  # Verificar cambios
mv important.conf.tmp important.conf
```

2. **No anclar patrones de regex.** `grep "error"` coincide con "errors", "errorlog", "noerror" — usa límites de palabra:

```bash
# No intencionado: coincide con subcadenas
grep "error" log.txt  # También coincide con "errorlog", "noerror"

# Preciso: límite de palabra
grep -w "error" log.txt  # Solo coincide con la palabra "error"

# Preciso: anclado
grep -E "^error | error$" log.txt  # Inicio o fin de línea
```

3. **Asumir que el separador de campos de `awk` maneja todos los delimitadores.** `-F','` no maneja campos CSV entre comillas con comas embebidas. Usa un parser CSV apropiado:

```bash
# Roto: divide en cada coma, incluyendo las dentro de comillas
awk -F',' '{print $2}' "John, Doe",35,"123 Main St, Apt 4"

# Correcto: usar csvkit
csvcut -c 2 contacts.csv

# Correcto: usar Python
python3 -c "
import csv, sys
for row in csv.reader(sys.stdin):
    print(row[1])
" < contacts.csv
```

## Preguntas Frecuentes Adicionales

### ¿Cómo proceso archivos muy grandes sin quedarme sin memoria?

Todas las herramientas clásicas de Unix (grep, sed, awk, sort, cut) son orientadas a streams y procesan datos línea por línea. Usan memoria constante sin importar el tamaño del archivo. La excepción es `sort`, que usa archivos temporales para entradas grandes:

```bash
# Procesar un archivo de 50GB con memoria constante
LC_ALL=C grep "ERROR" huge_log.txt | awk '{print $5}' | sort | uniq -c | sort -rn

# sort usa archivos temporales automáticamente cuando la entrada excede la memoria
# Controla el directorio temporal con TMPDIR
TMPDIR=/fast_ssd sort huge_file.txt > sorted.txt
```

### ¿Cómo extraigo datos entre dos patrones?

Usa `sed` con rangos de dirección o `awk` con variables de flag:

```bash
# sed: imprimir líneas entre START y END (inclusivo)
sed -n '/START/,/END/p' file.txt

# sed: imprimir líneas entre START y END (exclusivo)
sed -n '/START/,/END/p' file.txt | sed '1d;$d'

# awk: más control sobre inclusión/exclusión
awk '/START/ {found=1; next} /END/ {found=0} found' file.txt

# awk: incluir marcadores de inicio y fin
awk '/START/ {found=1} found {print} /END/ {found=0}' file.txt
```

### ¿Cómo reemplazo texto a través de múltiples archivos de forma segura?

Usa `find` con `sed -i` y siempre crea backups:

```bash
#!/bin/bash
set -euo pipefail

# Buscar y reemplazar en todos los archivos .conf, con backup
find /etc/app -name "*.conf" -type f -exec sed -i.bak 's/old_host/new_host/g' {} +

# Verificar cambios antes de eliminar backups
find /etc/app -name "*.conf.bak" | while read bak; do
    orig="${bak%.bak}"
    if diff -q "$orig" "$bak" > /dev/null; then
        echo "Sin cambios: $orig"
        rm "$bak"
    else
        echo "Cambiado: $orig"
        # Revisar cambios, luego eliminar backup si estás satisfecho
        # rm "$bak"
    fi
done
```

### ¿Cómo fusiono dos archivos ordenados y elimino duplicados?

Usa `sort -m` para fusionar archivos pre-ordenados, luego `uniq`:

```bash
# Fusionar dos archivos ordenados, eliminar duplicados
sort -m file1_sorted.txt file2_sorted.txt | uniq > merged_unique.txt

# Fusionar y mantener solo líneas presentes en ambos archivos (intersección)
sort file1.txt file2.txt | uniq -d > intersection.txt

# Fusionar y mantener solo líneas únicas de file1 (diferencia)
sort file1.txt file2.txt file2.txt | uniq -u > only_file1.txt
```

### ¿Cómo coloco color en la salida de grep en scripts?

```bash
# Habilitar salida con color en grep
grep --color=auto "pattern" file.txt

# Forzar color incluso al hacer pipe (útil para logging)
grep --color=always "ERROR" app.log | less -R

# Color personalizado con awk
awk '
    /ERROR/ {print "\033[31m" $0 "\033[0m"; next}
    /WARN/  {print "\033[33m" $0 "\033[0m"; next}
    /INFO/  {print "\033[32m" $0 "\033[0m"; next}
    {print}
' app.log
```
