---
contentType: docs
slug: on-call-runbook-template
title: "Plantilla de Runbook de Guardia"
description: "Una plantilla que documenta alertas comunes y procedimientos de respuesta paso a paso para ingenieros de guardia."
metaDescription: "Plantilla de runbook de guardia: documenta alertas comunes, pasos de diagnóstico, procedimientos de respuesta y canales de escalamiento."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - on-call
  - runbook
  - alerts
  - operations
  - template
relatedResources:
  - /docs/escalation-policy-template
  - /docs/runbook-template
  - /docs/bug-triage-template
  - /docs/change-management-template
  - /docs/patch-management-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Plantilla de runbook de guardia: documenta alertas comunes, pasos de diagnóstico, procedimientos de respuesta y canales de escalamiento."
  keywords:
    - devops
    - guardia
    - runbook
    - alertas
    - operaciones
    - plantilla
---
## Visión General

A las 3 a.m., un ingeniero junior recibe una página: "Pool de conexiones a base de datos agotado." Sin un runbook, pasan 30 minutos buscando en Google en lugar de 5 minutos siguiendo una lista de verificación. Un runbook no es un lujo para equipos grandes — es una herramienta de supervivencia para quien esté de guardia. Esta plantilla estructura alertas comunes, pasos de diagnóstico y procedimientos de resolución para que los ingenieros de guardia actúen con confianza, no con miedo.

## Cuándo Usar

Usa este recurso cuando:
- Estás creando la primera rotación de guardia de tu equipo y no tienes procedimientos documentados
- Tu tiempo medio de resolución (MTTR) es alto porque los ingenieros depuran desde cero cada vez
- Estás incorporando nuevos miembros al equipo que se unirán a la rotación de guardia

## Solución

```markdown
# Runbook de Guardia: `<Servicio / Equipo>`

## 1. Índice de Alertas

| Nombre de Alerta | Severidad | ¿Page? | Sección del Runbook | Última Verificación |
|------------------|-----------|--------|---------------------|---------------------|
| Alta Tasa de Error | SEV 2 | Sí | 2.1 | `AAAA-MM-DD` |
| Latencia P99 > 2s | SEV 2 | Sí | 2.2 | `AAAA-MM-DD` |
| Uso de Disco > 85% | SEV 3 | No | 2.3 | `AAAA-MM-DD` |
| Uso de Memoria > 90% | SEV 3 | No | 2.4 | `AAAA-MM-DD` |
| SSL Expira < 7 días | SEV 3 | No | 2.5 | `AAAA-MM-DD` |
| Dependencia No Saludable | SEV 2 | Sí | 2.6 | `AAAA-MM-DD` |
| Acumulación en Cola de Trabajos | SEV 3 | No | 2.7 | `AAAA-MM-DD` |

## 2. Procedimientos de Respuesta

### 2.1. Alta Tasa de Error

**Síntomas:**
- Tasa de error > 1% (o umbral definido en alerta)
- Pico en respuestas 5xx

**Pasos de Diagnóstico:**
1. Revisar dashboard de errores para los tipos de error principales
2. Correlacionar con despliegues recientes (últimas 2 horas)
3. Verificar salud de dependencias downstream
4. Revisar logs de aplicación para stack traces

**Resolución:**
- Si causado por despliegue: ejecutar plan de rollback
- Si causado por falla de dependencia: ver 2.6 Dependencia No Saludable
- Si causado por agotamiento de recursos: ver 2.3 o 2.4
- Si pico transitorio: monitorear 10 minutos; recuperación automática común

**Escalamiento:**
- Si tasa de error > 10% o errores de pérdida de datos: página al líder de equipo (SEV 1)
- Si no hay causa raíz en 30 minutos: página al líder de equipo

### 2.2. Latencia P99 > 2s

**Síntomas:**
- Latencia P99 por encima del umbral
- Quejas de usuarios sobre respuestas lentas

**Pasos de Diagnóstico:**
1. Verificar latencia de consultas a base de datos
2. Verificar tasa de acierto de caché (Redis / Memcached)
3. Buscar patrones de consulta N+1 en logs
4. Verificar latencia de servicios downstream
5. Revisar utilización de CPU y memoria

**Resolución:**
- Si cuello de botella en base de datos: matar consultas largas, escalar réplicas de lectura
- Si tormenta de miss de caché: pre-calentar caché, aumentar TTL temporalmente
- Si latencia downstream: ver 2.6 Dependencia No Saludable

**Escalamiento:**
- Si latencia > 10s o afecta > 50% de usuarios: página al líder de equipo
- Si causado por DDoS: involucrar equipo de seguridad inmediatamente

### 2.3. Uso de Disco > 85%

**Síntomas:**
- Alerta de uso de disco disparándose
- Riesgo de fallas de escritura

**Pasos de Diagnóstico:**
1. Identificar directorios más grandes (`du -sh /* | sort -rh | head`)
2. Verificar configuración de rotación de logs
3. Buscar archivos temporales o core dumps
4. Verificar tamaño y tasa de crecimiento de base de datos

**Resolución:**
- Limpiar logs antiguos (asegurar que la política de retención lo permita)
- Truncar tablas / particiones sobredimensionadas
- Expandir disco si es cloud-hosted (AWS EBS, GCP PD)
- Habilitar rotación de logs si está deshabilitada

**Escalamiento:**
- Si > 95% y escrituras fallando: página al líder de equipo
- Si expansión falla: página al equipo de infraestructura

### 2.4. Uso de Memoria > 90%

**Síntomas:**
- Alerta de uso de memoria disparándose
- Riesgo de kills por OOM

**Pasos de Diagnóstico:**
1. Identificar procesos con alto consumo de memoria (`ps aux --sort=-%mem | head`)
2. Verificar fugas de memoria (tendencia de 7 días)
3. Verificar tamaño de caché y tasa de evicción
4. Buscar crecimiento descontrolado de colas

**Resolución:**
- Reiniciar servicio si se sospecha fuga (arreglo temporal)
- Escalar a instancia más grande si hay crecimiento sostenido
- Reducir tamaño de caché o TTL
- Arreglar fuga de código en siguiente release

**Escalamiento:**
- Si kills por OOM causan reinicios: página al líder de equipo
- Si causa raíz de fuga no está clara: página al líder de equipo

### 2.5. SSL Expira < 7 Días

**Síntomas:**
- Advertencia de expiración de certificado

**Pasos de Diagnóstico:**
1. Confirmar detalles del certificado y fecha exacta de expiración
2. Verificar que la renovación automática está configurada
3. Verificar si el cert está desplegado en todos los endpoints

**Resolución:**
- Si renovación automática falló: renovar manualmente (ver runbook de cert)
- Si cert manual: crear ticket de renovación para equipo SRE
- Desplegar cert renovado en todos los balanceadores de carga / CDNs

**Escalamiento:**
- Si expiración < 24 horas: página al líder de equipo SRE

### 2.6. Dependencia No Saludable

**Síntomas:**
- Health check de servicio downstream fallando
- Errores de timeout a endpoint específico

**Pasos de Diagnóstico:**
1. Verificar página de estado de la dependencia
2. Verificar dashboard de métricas de la dependencia
3. Verificar conectividad de red (ping, traceroute)
4. Buscar problemas de resolución DNS
5. Verificar que tokens de autenticación / API keys no hayan expirado

**Resolución:**
- Si interrupción de dependencia: habilitar circuit breaker, servir modo degradado
- Si problema de red: involucrar proveedor de red / cloud
- Si problema de auth: rotar credenciales
- Si problema de capacidad: solicitar escalamiento al equipo de la dependencia

**Escalamiento:**
- Si dependencia es crítica y no hay modo degradado: página al líder de equipo + equipo de dependencia

### 2.7. Acumulación en Cola de Trabajos

**Síntomas:**
- Profundidad de cola creciendo
- Lag de procesamiento aumentando

**Pasos de Diagnóstico:**
1. Verificar cantidad y salud de procesos worker
2. Verificar utilización de CPU / memoria de workers
3. Buscar crecimiento en cola de mensajes fallidos (dead-letter)
4. Revisar tasa de fallo de trabajos

**Resolución:**
- Escalar workers horizontalmente si CPU < 70%
- Reiniciar workers atascados
- Reintentar trabajos fallidos desde dead-letter queue
- Si cuello de botella en base de datos: escalar réplicas de lectura

**Escalamiento:**
- Si acumulación > 1 hora y creciendo: página al líder de equipo
```

## Explicación

El runbook trata cada alerta como un **flujo de trabajo de diagnóstico**, no solo como un problema a arreglar. Al forzar al ingeniero a verificar cosas específicas en orden, reduce la probabilidad de diagnóstico erróneo (por ejemplo, reiniciar un servicio cuando el problema es una dependencia downstream). Las reglas de escalamiento evitan que el ingeniero de guardia permanezca en silencio durante horas mientras lucha solo.

## Variantes

| Contexto | Enfoque de Alerta | Adición Clave |
|----------|-------------------|---------------|
| Kubernetes | Reinicios de pods, presión de nodos, errores de ingress | Comandos kubectl para inspección de pods |
| Serverless | Errores de Lambda, cold starts, throttling | Queries de CloudWatch Logs Insights |
| Backend móvil | Fallas de push notifications, límites de rate de API | Segmentación de errores por dispositivo |
| Pipeline de datos | Fallas de trabajos, drift de schema, datos tardíos | Procedimientos de reintento de tareas Airflow / Dagster |
| Multi-región | Latencia específica por región, lag de replicación | Sección de runbook de failover |

## Lo que funciona

1. Mantén cada procedimiento en una página; los runbooks largos no se leen durante incidentes
2. Incluye comandos exactos, no solo "revisa logs"; el estrés reduce la precisión al tipear
3. Verifica cada procedimiento trimestralmente; runbooks obsoletos son peores que ninguno
4. Enlaza a dashboards y logs, no pegues screenshots que caducan
5. Incluye una decisión de "cuándo escalar" para cada alerta; la ambigüedad causa demora

## Errores Comunes

1. Escribir runbooks para expertos; son para el ingeniero que nunca ha visto esta alerta
2. No probar comandos del runbook en un entorno de staging
3. Omitir pasos de rollback; a veces el arreglo es "deshacer el último cambio"
4. Crear runbooks pero no enlazarlos desde el sistema de alertas
5. Tratar los runbooks como documentos estáticos; deben actualizarse después de cada incidente

## Preguntas Frecuentes

### ¿Qué tan detallado debe ser un runbook?

Cada procedimiento de alerta debe caber en una pantalla. Incluye: qué significa, 3–5 comandos de diagnóstico, 2–3 resoluciones comunes, y cuándo escalar. No incluyas explicaciones de arquitectura — eso pertenece a la documentación. El runbook es una lista de verificación para la acción, no un libro de texto.

### ¿Debería tener un runbook por servicio o uno por equipo?

Uno por servicio es más claro, pero consolida si tienes > 10 microservicios. En ese caso, crea un runbook de equipo con un índice de alertas que enlace a sub-páginas específicas por servicio. La clave es que el ingeniero de guardia encuentre el procedimiento correcto en menos de 30 segundos.

### ¿Qué pasa si la alerta no está en el runbook?

Sigue un procedimiento genérico de "alerta desconocida": clasifica severidad, recopila métricas básicas (CPU, memoria, tasa de error, latencia), verifica el último despliegue, y escala si no emerge una hipótesis en 15 minutos. Después del incidente, agrega la nueva alerta al runbook. La primera vez que una alerta se dispara es una oportunidad para documentarla.

## Soluciones Avanzadas

### Ejecución automatizada de runbook con scripts de diagnóstico

Pre-cablea pasos comunes de diagnóstico en scripts ejecutables que el ingeniero de guardia puede ejecutar con un solo comando:

```bash
#!/bin/bash
# diagnose.sh - Recopilador automatizado de diagnóstico para ingenieros de guardia
# Usage: ./diagnose.sh <service-name>

set -euo pipefail

SERVICE="${1:?Usage: $0 <service-name>}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
REPORT_DIR="/tmp/diagnostics-${SERVICE}-${TIMESTAMP}"

mkdir -p "$REPORT_DIR"

echo "=== Collecting diagnostics for $SERVICE at $TIMESTAMP ==="

# 1. Service status
echo "Checking service status..."
systemctl status "$SERVICE" 2>&1 | tee "$REPORT_DIR/service-status.txt" || true

# 2. Recent logs (last 100 lines)
echo "Collecting recent logs..."
journalctl -u "$SERVICE" --since "1 hour ago" --no-pager 2>&1 \
  | tail -100 > "$REPORT_DIR/recent-logs.txt" || true

# 3. Resource utilization
echo "Checking resource utilization..."
{
  echo "=== CPU ==="
  top -bn1 | head -20
  echo ""
  echo "=== Memory ==="
  free -h
  echo ""
  echo "=== Disk ==="
  df -h
  echo ""
  echo "=== Top processes by CPU ==="
  ps aux --sort=-%cpu | head -10
  echo ""
  echo "=== Top processes by Memory ==="
  ps aux --sort=-%mem | head -10
} > "$REPORT_DIR/resources.txt"

# 4. Network connectivity
echo "Checking network..."
{
  echo "=== Listening ports ==="
  ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null
  echo ""
  echo "=== Active connections ==="
  ss -tn state established 2>/dev/null | head -20
} > "$REPORT_DIR/network.txt"

# 5. Recent deployments
echo "Checking recent deployments..."
{
  echo "=== Docker containers ==="
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Docker not available"
  echo ""
  echo "=== Kubernetes pods ==="
  kubectl get pods -l app="$SERVICE" 2>/dev/null || echo "kubectl not available or no pods found"
} > "$REPORT_DIR/deployments.txt"

# 6. Health check
echo "Running health check..."
curl -sS -o "$REPORT_DIR/health-response.txt" -w "%{http_code}" \
  "http://localhost:8080/health" 2>&1 | tee "$REPORT_DIR/health-status.txt" || true

echo ""
echo "=== Diagnostics complete ==="
echo "Report saved to: $REPORT_DIR"
echo "Review files and attach to incident ticket."
```

### Comandos de diagnóstico específicos para Kubernetes

Para entornos containerizados, incluye one-liners de kubectl que los ingenieros de guardia pueden copiar y pegar:

```bash
# Quick pod status check
kubectl get pods -n production -o wide | grep -v Running

# Get logs from a crashing pod
kubectl logs -n production <pod-name> --previous --tail=50

# Describe a pod for events and conditions
kubectl describe pod -n production <pod-name>

# Check resource usage across nodes
kubectl top nodes
kubectl top pods -n production --sort-by=memory

# Execute into a pod for network debugging
kubectl exec -it -n production <pod-name> -- /bin/sh -c "nslookup <dependency>"

# Check recent events in namespace
kubectl get events -n production --sort-by='.lastTimestamp' | tail -20

# Port-forward for local debugging
kubectl port-forward -n production svc/<service-name> 8080:80
```

### Vinculación alerta-a-runbook con anotaciones de Prometheus

Vincula alertas directamente a secciones del runbook usando etiquetas de alerta de Prometheus para que los ingenieros nunca busquen el procedimiento correcto:

```yaml
# prometheus/alerts.yml
groups:
  - name: service-alerts
    rules:
      - alert: HighErrorRate
        expr: |
          rate(http_requests_total{status=~"5.."}[5m])
          / rate(http_requests_total[5m]) > 0.01
        for: 5m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "High error rate on {{ $labels.service }}"
          description: "Error rate is {{ $value | humanizePercentage }} for {{ $labels.service }}"
          runbook: "https://wiki.internal/runbooks/on-call#21-high-error-rate"
          dashboard: "https://grafana.internal/d/service-overview?var-service={{ $labels.service }}"

      - alert: DiskUsageHigh
        expr: |
          (1 - node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 > 85
        for: 10m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Disk usage > 85% on {{ $labels.instance }}"
          description: "Disk usage is {{ $value }}% on {{ $labels.instance }}"
          runbook: "https://wiki.internal/runbooks/on-call#23-disk-usage--85"
          dashboard: "https://grafana.internal/d/node-overview?var-node={{ $labels.instance }}"
```

### Checklist de actualización de runbook post-incidente

Después de cada incidente, verifica que el runbook se actualice con las lecciones aprendidas:

```markdown
## Post-Incident Runbook Update

- [ ] Was the alert in the runbook? If no, add it now
- [ ] Were the diagnostic steps accurate? Update if they missed the root cause
- [ ] Were the resolution steps correct? Update if they did not work
- [ ] Was the escalation threshold appropriate? Adjust if too high or too low
- [ ] Did the runbook link from the alert work? Fix if broken
- [ ] Are there new commands that would have helped? Add them
- [ ] Was the "last verified" date updated? Set to today
- [ ] Did the on-call engineer find the runbook useful? Note feedback
```

## Mejores Prácticas Adicionales

1. **Incluye el output esperado para cada comando de diagnóstico.** Los ingenieros de guardia bajo estrés pueden no reconocer output anormal. Muestra cómo se ve "normal":

```markdown
**Expected output:**
```
$ kubectl get pods -l app=api
NAME                   READY   STATUS    RESTARTS   AGE
api-7d9f6c8b5-x2k4m   1/1     Running   0          12h
api-7d9f6c8b5-p8n3q   1/1     Running   0          12h
```
If STATUS is not `Running` or RESTARTS > 0, proceed to diagnostic step 2.
```

2. **Agrega una sección "No Hacer" a cada procedimiento de alerta.** Los errores comunes durante incidentes valen la pena documentar:

```markdown
## 2.1 High Error Rate — Do NOT:
- Do NOT restart all pods simultaneously (causes cascading failures)
- Do NOT scale up without checking if the issue is downstream
- Do NOT deploy a fix without testing in staging first
- Do NOT close the alert until error rate is below threshold for 15 minutes
```

## Errores Comunes Adicionales

1. **No incluir estimaciones de tiempo para cada paso.** Cuando un ingeniero ve "verificar latencia de consultas a base de datos," no sabe si eso toma 30 segundos o 10 minutos. Agrega estimaciones de tiempo aproximadas para que puedan medir progreso y saber cuándo escalar:

```markdown
**Diagnostic Steps (estimated: 10 minutes):**
1. Check error dashboard (2 min)
2. Correlate with deployments (3 min)
3. Check dependency health (2 min)
4. Review logs for stack traces (3 min)
```

2. **Escribir runbooks en aislamiento.** Los runbooks escritos por un solo ingeniero senior a menudo omiten pasos que les parecen obvios pero no lo son para un ingeniero junior de guardia a las 3 a.m. Haz que un ingeniero junior recorra cada procedimiento durante un periodo de calma y anote dónde se atasca. Esos son los pasos que necesitan más detalle.

## FAQs Adicionales

### Cómo mantenemos los comandos del runbook sin que se vuelvan obsoletos?

Ejecuta los comandos del runbook como parte de tu pipeline de CI. Crea un job de prueba que ejecute comandos de diagnóstico contra un entorno de staging semanalmente. Si un comando falla porque la API cambió o la herramienta fue actualizada, el job de CI alerta al equipo para actualizar el runbook. Esto detecta comandos obsoletos antes de que lo haga un incidente.

### Los runbooks deberían estar en el mismo repo que el código del servicio?

Sí, cuando sea posible. Mantener los runbooks en el repo del servicio significa que se actualizan junto con los cambios de código. Un PR que cambia el manejo de errores debería también actualizar el runbook para la alerta de tasa de error. Si los runbooks viven en un wiki separado, se olvidan durante los cambios de código. Usa un directorio `docs/runbooks/` en el repo del servicio y enlázalos desde tu sistema de alertas.
