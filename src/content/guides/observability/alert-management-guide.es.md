---
contentType: guides
slug: alert-management-guide
title: "Gestión de Alertas — Mejores Prácticas de Alertas en Guardia"
description: "Guía práctica sobre gestión de alertas: reducir fatiga de alertas, definir niveles de severidad, políticas de escalamiento, diseño de rotaciones de guardia y construir una cultura de alertas sostenible."
metaDescription: "Aprende gestión de alertas: reduce fatiga de alertas, define niveles de severidad, diseña políticas de escalamiento, rotaciones de guardia y alertas sostenibles."
difficulty: intermediate
topics:
  - observability
  - devops
  - infrastructure
tags:
  - alert-management
  - on-call
  - escalation
  - alert-fatigue
  - pagerduty
  - opsgenie
  - guide
relatedResources:
  - /guides/observability/metrics-and-dashboards-guide
  - /guides/observability/incident-response-guide
  - /guides/observability/postmortem-guide
  - /guides/devops/sre-practices-guide
  - /guides/devops/observability-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende gestión de alertas: reduce fatiga de alertas, define niveles de severidad, diseña políticas de escalamiento, rotaciones de guardia y alertas sostenibles."
  keywords:
    - alert-management
    - on-call
    - escalation
    - alert-fatigue
    - pagerduty
    - opsgenie
    - guide
---

## Descripción General

Las alertas son la forma en que tus sistemas te indican que algo necesita atención. Hechas mal, crean ruido, agotamiento y respuesta más lenta a incidentes. Hechas bien, dan a la persona correcta la información correcta en el momento correcto para que pueda actuar con decisión.

Esta guía cubre diseño de alertas, clasificación de severidad, estructuras de guardia, políticas de escalamiento y prácticas operativas sostenibles.

## Cuándo Usar

- Tu equipo recibe más de 5 alertas por persona por semana
- Las alertas son frecuentemente ignoradas o tratadas como ruido
- Alertas críticas son perdidas debido al volumen
- Estás estableciendo o rediseñando una rotación de guardia
- La fatiga de alertas está causando agotamiento o rotación de personal

## Conceptos Clave

| Concepto | Descripción |
|---------|-------------|
| **Fatiga de Alertas** | Desensibilización causada por demasiadas alertas de bajo valor |
| **Severidad** | Clasificación de urgencia de alerta (crítica, advertencia, info) |
| **Escalamiento** | Enrutar automáticamente alertas no reconocidas al siguiente respondedor |
| **Rotación de Guardia** | Responsabilidad programada para respuesta a incidentes |
| **Presupuesto de Alertas** | Volumen máximo de alertas aceptable por período de tiempo |
| **Runbook** | Guía paso a paso para responder a una alerta específica |

## Niveles de Severidad

Define niveles de severidad claros y accionables:

| Nivel | Nombre | Tiempo de Respuesta | Canal | Ejemplo |
|-------|--------|---------------------|-------|---------|
| **P1** | Crítica | 5 minutos | Página/SMS | Servicio caído, impacto en ingresos, pérdida de datos |
| **P2** | Alta | 30 minutos | Página/Slack | Rendimiento degradado, interrupción parcial |
| **P3** | Media | 4 horas | Slack/Email | Umbral de capacidad, anomalía no urgente |
| **P4** | Baja | 1-2 días hábiles | Ticket | Limpieza necesaria, optimización no urgente |
| **P5** | Info | Ninguno | Solo dashboard | Métricas para contexto, no requiere acción |

**Principios de diseño de severidad:**
- P1 significa dejar todo y responder inmediatamente
- P2 significa responder dentro del período laboral actual
- P3 y below no paginan; crean tickets o mensajes de Slack
- Si todo es P1, nada es P1
- Revisa la distribución de severidad mensualmente; apunta a <10% P1

## Gestión de Alertas Paso a Paso

### 1. Diseña Alertas que Importan

Cada alerta debe ser accionable e impactar al usuario:

```yaml
# Ejemplo: Reglas de alerta de Prometheus con severidad

groups:
  - name: service_alerts
    rules:
      # P1: Servicio orientado al usuario está caído
      - alert: ServiceDown
        expr: up{job=~"api|web|payment"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "{{ $labels.job }} is down"
          runbook_url: "https://wiki/runbooks/service-down"

      # P2: Tasa de error elevada pero servicio aún responde
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.05
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "High error rate in {{ $labels.service }}"

      # P3: Advertencia de capacidad — no requiere acción inmediata
      - alert: DiskSpaceWarning
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.15
        for: 10m
        labels:
          severity: medium
        annotations:
          summary: "Disk space low on {{ $labels.instance }}"

      # P4: Informativo — seguimiento pero no pagina
      - alert: HighMemoryUsage
        expr: (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) < 0.1
        for: 30m
        labels:
          severity: low
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
```

**Checklist de diseño de alertas:**
- Alerta sobre síntomas que sienten los usuarios (errores, latencia), no causas (disco lleno)
- Cada alerta P1/P2 debe tener un link a runbook
- Usa `for:` para prevenir oscilación (requiere falla sostenida)
- Incluye `summary` y `description` que digan al respondedor qué revisar
- Añade labels para servicio, entorno, equipo y severidad

### 2. Construye Rotaciones de Guardia

Diseña rotaciones justas y sostenibles:

| Tipo de Rotación | Mejor Para | Estructura |
|------------------|------------|------------|
| **Primario/Secundario** | Equipos pequeños (3-6) | Un primario, un respaldo |
| **Follow-the-sun** | Equipos globales | Turnos de 8 horas entre zonas horarias |
| **Rotación semanal** | Equipos medianos (6-12) | Una semana de guardia, 3-5 semanas de descanso |
| **Rotación diaria** | Equipos grandes (12+) | Un día de guardia, resto de semana de descanso |

```yaml
# Ejemplo: Configuración de rotación de PagerDuty
# Primario: Rotación semanal, 6 ingenieros
# Secundario: Siguiente persona en rotación
# Escalamiento: Manager después de 15 minutos
```

**Mejores prácticas de rotación:**
- Limita frecuencia de guardia a no más de 1 semana en 4
- Asegura transferencia entre turnos incluyendo incidentes activos
- Compensa por tiempo de guardia (pago o tiempo libre)
- Permite exclusión para eventos personales con cobertura
- Rastrea y revisa frecuencia de incidentes por rotación

### 3. Define Políticas de Escalamiento

Asegura que alertas no reconocidas lleguen a un humano:

```
Ruta de Escalamiento Ejemplo:

Alerta Dispara
    → Guardia primario (página + SMS)
        → ¿Reconocida? (detener)
        → No reconocida en 5 min
            → Guardia secundario (página)
                → ¿Reconocida? (detener)
                → No reconocida en 10 min
                    → Gerente de Ingeniería (página)
                        → No reconocida en 15 min
                            → Director de Ingeniería (página)
```

**Principios de escalamiento:**
- Escala rápidamente para P1 (intervalos de 5-10 minutos)
- Escala más lentamente para P2 (intervalos de 30-60 minutos)
- Incluye al respondedor anterior en la cadena de escalamiento
- Configura canales de Slack de equipo para visibilidad
- Registra todos los escalamientos para revisión post-incidente

### 4. Crea Runbooks para Cada Alerta

Un runbook convierte una alerta en un problema resoluble:

```markdown
# Runbook: ServiceDown

## Alerta
ServiceDown: `{{ $labels.job }}` está caído

## Impacto
Usuarios no pueden acceder a `{{ $labels.job }}`. Impacto en ingresos si es pago o API.

## Pasos de Diagnóstico
1. Revisa endpoint de salud del servicio: `curl http://{{ $labels.instance }}/health`
2. Verifica si el pod está corriendo: `kubectl get pods -l app={{ $labels.job }}`
3. Revisa despliegues recientes: `kubectl rollout history deployment/{{ $labels.job }}`
4. Revisa uso de recursos: `kubectl top pod -l app={{ $labels.job }}`
5. Revisa logs: `kubectl logs -l app={{ $labels.job }} --tail=100`

## Pasos de Resolución
1. Si el pod falló: `kubectl rollout restart deployment/{{ $labels.job }}`
2. Si recursos agotados: Escala deployment o pool de nodos
3. Si despliegue causó el problema: `kubectl rollout undo deployment/{{ $labels.job }}`
4. Si dependencia caída: Revisa estado de dependencia y escala a equipo propietario

## Escalamiento
Si no se resuelve en 15 minutos, escalar a: platform-team@company.com
```

**Mejores prácticas de runbooks:**
- Un runbook por alerta P1/P2
- Incluye diagnóstico, resolución y escalamiento
- Vincula runbook directamente en notificación de alerta
- Revisa y actualiza runbooks trimestralmente
- Mide efectividad de runbooks (tiempo para resolver cuando se sigue)

### 5. Reduce la Fatiga de Alertas

Mide y reduce activamente el volumen de alertas:

| Métrica | Objetivo | Acción si se Excede |
|---------|----------|---------------------|
| Alertas por persona por semana | < 5 | Ajustar umbrales, eliminar alertas ruidosas |
| Alertas P1 por mes | < 2 | Arreglar causas raíz, no síntomas |
| Tiempo de reconocimiento de alerta | < 5 min para P1 | Mejorar runbooks, entrenamiento |
| Tasa de falsos positivos | < 10% | Aumentar `for:`, añadir condiciones |
| Alertas sin runbooks | 0 | Crear runbooks faltantes |

**Tácticas de reducción de fatiga:**
- **Consolida:** Agrupa alertas relacionadas en una notificación
- **Suprime:** Silencia ventanas de mantenimiento conocidas
- **Deduplica:** Una alerta por incidente, no por host afectado
- **Auto-remedia:** Auto-reinicio, auto-escala para problemas recuperables conocidos
- **Elimina:** Remueve alertas que disparan más de una vez sin acción

## Mejores Prácticas

- **Alerta sobre síntomas, no causas.** Disco lleno es una causa; peticiones lentas es el síntoma.
- **Cada alerta debe ser accionable.** Si la respuesta es "esperar y ver", no debería paginar.
- **Usa `for:` para prevenir oscilación.** Requiere violación sostenida del umbral antes de alertar.
- **Separa paginado de logging.** No todo lo interesante necesita despertar a alguien.
- **Revisa alertas mensualmente.** Rastrea qué alertas disparan, cuáles son reconocidas y cuáles ignoradas.
- **Compensa guardia justamente.** La guardia es trabajo; trátala como tal.

## Errores Comunes

- **Alertar sobre todo.** Más alertas no significan mejor cobertura; significan más ruido.
- **Sin ruta de escalamiento.** Si el primario no responde, la alerta muere en silencio.
- **Runbooks faltantes.** Una alerta sin runbook fuerza al respondedor a adivinar.
- **Ignorar fatiga de alertas.** Alto volumen de alertas lleva a agotamiento y alertas críticas perdidas.
- **Umbrales estáticos en métricas cíclicas.** Picos de CPU durante jobs batch son normales; alerta sobre desviación de línea base en su lugar.

## Variantes

- **Respuesta a incidentes sin operador:** Remediación totalmente automatizada sin involucramiento humano
- **Enrutamiento basado en severidad:** Canales diferentes para diferentes severidades (Slack para P3, PagerDuty para P1)
- **Propiedad por equipo:** Las alertas se enrutan al equipo que posee el servicio
- **Alertas asistidas por IA:** Detección de anomalías que ajusta umbrales dinámicamente

## FAQ

**P: ¿Cuántas alertas por semana son demasiadas?**
Más de 5 alertas accionables por persona por semana es excesivo. Si paginas más de una vez por semana, algo está mal con tu sistema o tus umbrales.

**P: ¿Debería alertar sobre uso de CPU y memoria?**
Generalmente no, a menos que esas métricas se correlacionen directamente con síntomas que impactan usuarios. Alerta sobre latencia de petición, tasa de error y throughput en su lugar.

**P: ¿Cómo manejo alertas ruidosas que no puedo arreglar inmediatamente?**
Siléncialas temporalmente con fecha de expiración, crea un ticket para arreglar la causa raíz, y programa la solución dentro del sprint actual.

**P: ¿Cuál es la diferencia entre una alerta y un dashboard?**
Las alertas te notifican de algo que requiere acción. Los dashboards te ayudan a entender qué está pasando. Usa alertas para problemas urgentes; dashboards para investigación.

## Conclusión

Buenas alertas son un producto que construyes para tus ingenieros de guardia. Deben ser precisas, accionables y respetuosas de su tiempo. Al diseñar alertas alrededor del impacto de usuario, crear runbooks claros y reducir activamente el ruido, construyes una cultura operativa que es sostenible y efectiva.
