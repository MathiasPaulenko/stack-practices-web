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

Las herramientas de procesamiento de texto Unix están diseñadas para componerse en pipelines: cada herramienta hace una cosa bien, y el shell las conecta con pipes. Una sola línea de Bash puede reemplazar cientos de líneas de Python o JavaScript para análisis de logs, extracción de datos y generación de reportes. Esta receta cubre las herramientas esenciales y cómo combinarlas de forma segura.

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
