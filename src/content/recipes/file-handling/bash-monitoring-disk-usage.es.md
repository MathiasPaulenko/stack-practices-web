---
contentType: recipes
slug: bash-monitoring-disk-usage
title: "Monitorear Uso de Disco"
description: "Alerta cuando el espacio en disco cruza umbrales usando un script de Bash que verifica mount points y notifica operadores."
metaDescription: "Monitorea el uso de disco con Bash: verifica mount points, configura umbrales, envía alertas y dispara limpieza antes de que el disco se llene y los servicios fallen."
difficulty: beginner
topics:
  - file-handling
tags:
  - bash
  - monitoring
  - disk
  - alerts
  - linux
relatedResources:
  - /recipes/bash-backup-rotation-script
  - /recipes/bash-scripting-automation
  - /recipes/bash-log-rotation-compression
  - /recipes/bash-loop-over-files
  - /recipes/bash-parallel-execution
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Monitorea el uso de disco con Bash: verifica mount points, configura umbrales, envía alertas y dispara limpieza antes de que el disco se llene y los servicios fallen."
  keywords:
    - bash
    - monitoreo
    - disco
    - alertas
    - linux
---
## Visión General

El espacio en disco es un asesino silencioso de servicios productivos. Cuando un log, caché o base de datos llena el disco, las aplicaciones se caen, las escrituras fallan y la recuperación se vuelve urgente. Un simple script de Bash que verifica mount points y alerta cuando el uso cruza un umbral te da advertencia temprana y puede disparar limpieza antes de que la situación se vuelva crítica.

## Cuándo Usar

Usa este recurso cuando:
- Quieras monitoreo ligero sin instalar un agente completo.
- Necesites alertar por email, Slack o archivo de log cuando el uso de disco sea alto.
- Ejecutes contenedores, VMs o servidores bare-metal con disco limitado.
- Quieras disparar limpieza automática cuando el uso cruza un umbral.

## Solución

### Script de monitoreo de uso de disco

```bash
#!/usr/bin/env bash
set -euo pipefail

THRESHOLD="${1:-80}"
EMAIL="${2:-admin@example.com}"

# Verificar todos los mount points locales
df -Hl | awk 'NR>1 && /^\/dev/{print $1, $5, $6}' | while read -r fs usage mount; do
    usage_val="${usage%%}"
    if (( usage_val >= THRESHOLD )); then
        echo "WARNING: $mount ($fs) is at $usage"
        # Enviar alerta (ejemplo con mail)
        echo "Disk usage on $mount is $usage" | mail -s "Disk alert: $mount" "$EMAIL"
    else
        echo "OK: $mount is at $usage"
    fi
done

# Opcional: disparar limpieza para mounts específicos
# if (( usage_val >= 90 )); then
#     /usr/local/bin/cleanup-logs.sh
# fi
```

## Explicación

El script usa `df -Hl` para listar filesystems locales y sus porcentajes de uso. `awk` filtra el encabezado y las entradas que no son dispositivos. Para cada mount point, elimina el signo de porcentaje, compara el valor numérico con el umbral e imprime una advertencia o mensaje OK. Si se excede el umbral, envía un alerta por email. El bloque de limpieza está comentado porque el borrado automático debe revisarse cuidadosamente antes de habilitarse.

## Variantes

| Canal de alerta | Herramienta | Mejor para |
|-----------------|-------------|------------|
| Email | `mail` | Servidores simples con MTA local |
| Slack | webhook curl | Equipos que ya usan Slack |
| PagerDuty | event API | Escalación on-call en producción |
| Log de archivo | redirect a syslog | Agregación centralizada de logs |

## Lo que funciona

1. **Configura umbrales por debajo del 100%.** Alerta al 80% y actúa al 90% para tener tiempo de responder.
2. **Monitorea mount points, no solo el disco total.** Un `/tmp` o `/var/log` pequeño puede llenarse independientemente del disco raíz.
3. **Incluye el filesystem en la alerta.** Saber qué partición está llena acelera la respuesta.
4. **Ejecuta desde cron cada pocos minutos.** El uso de disco puede crecer rápido durante incidentes.
5. **Empareja monitoreo con limpieza.** Una alerta de uso alto sin plan de limpieza es solo media solución.

## Errores Comunes

1. **Usar `df -h` sin cuidado en el parsing.** La columna de porcentaje puede estar vacía para filesystems especiales; filtra entradas `/dev/`.
2. **Alertar demasiado tarde.** Esperar al 95% deja casi ningún tiempo para reaccionar.
3. **Ignorar mounts efímeros.** `/tmp` y volúmenes de docker pueden llenarse rápido y colapsar servicios.
4. **Enviar alertas a individuos.** Usa un alias de equipo o rotación on-call para que las vacaciones no rompan el alerting.
5. **No manejar fallos de correo.** Si el MTA está caído, la alerta nunca llega; registra en un segundo canal.

## Preguntas Frecuentes

**P: ¿Cómo monitoreo múltiples servidores?**
R: Ejecuta el script en cada servidor vía cron y envía alertas a un sistema de logging o alerting centralizado. Mejor aún, usa una herramienta de gestión de configuración para desplegar el script.

**P: ¿Puedo verificar el uso de disco de un directorio específico?**
R: Sí. Usa `du -sh /path` para verificar un solo directorio, pero para alertas a nivel de partición usa `df` porque `du` no detecta límites de mount point.

**P: ¿Debería borrar archivos automáticamente cuando el disco esté lleno?**
R: Solo después de revisión cuidadosa. El borrado automático puede eliminar evidencia necesaria para debugging. Prefiere mover logs a archivo o notificar a un operador.
