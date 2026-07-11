---
contentType: docs
slug: monitoring-alerting-policy-template
title: "Plantilla de Politica de Monitoreo y Alertas"
description: "Una plantilla de politica que define como se configuran, enrutan, escalan y revisan las alertas en servicios e infraestructura."
metaDescription: "Define politicas de monitoreo y alertas con esta plantilla. Cubre umbrales, enrutamiento, escalacion, niveles de severidad y cadencia de revision."
difficulty: beginner
topics:
  - observability
  - devops
tags:
  - monitoring
  - alerting
  - incident-response
  - observability
  - policy
relatedResources:
  - /docs/devops/logging-standards-document
  - /docs/devops/escalation-policy-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Define politicas de monitoreo y alertas con esta plantilla. Cubre umbrales, enrutamiento, escalacion, niveles de severidad y cadencia de revision."
  keywords:
    - politica de monitoreo y alertas
    - umbrales de alerta
    - escalacion de alertas
    - politica de observabilidad
    - enrutamiento de alertas
---

## Descripcion General

Una Politica de Monitoreo y Alertas define como una organizacion detecta problemas, notifica a las personas correctas y escala cuando los incidentes no se resuelven rapidamente. Sin una politica clara, los equipos sufren fatiga de alertas, incidentes perdidos o tiempos de respuesta inconsistentes. Esta plantilla proporciona un marco estructurado para umbrales, niveles de severidad, reglas de enrutamiento, caminos de escalacion y revision regular.

## Cuando Usar

- Configurar una nueva plataforma de observabilidad o stack de monitoreo.
- Incorporar un nuevo servicio o equipo al sistema de alertas.
- Revisar la calidad de alertas despues de un periodo de ruido o incidentes perdidos.
- Definir responsabilidades de guardia y caminos de escalacion.
- Prepararse para una auditoria de madurez operacional o respuesta a incidentes.

## Prerequisitos

- Una plataforma de monitoreo y observabilidad como Prometheus, Datadog, Grafana, New Relic o PagerDuty.
- Una lista de servicios criticos y componentes de infraestructura.
- Rotaciones de guardia y contactos de escalacion definidos.
- Un canal de comunicacion para alertas, como Slack, Microsoft Teams o correo.
- Un proceso de respuesta a incidentes que las alertas activaran.

## Solucion

### Plantilla de Politica

#### 1. Niveles de Severidad de Alertas

| Severidad | Tiempo de Respuesta | Ejemplo | Canal de Notificacion |
|-----------|---------------------|---------|-----------------------|
| P1 - Critica | Inmediato (5 min) | Servicio caido, perdida de datos, impacto en ingresos | Pagina al guardia + notificacion ejecutiva |
| P2 - Alta | 15 minutos | Rendimiento degradado, backups fallidos | Pagina al guardia + alerta Slack |
| P3 - Media | 1 hora | Tasa de errores alta, presion de recursos | Slack o correo al equipo dueno |
| P4 - Baja | Proximo dia laboral | Advertencia de capacidad, desviacion no urgente | Correo o aviso en dashboard |
| P5 - Informativa | Ninguno | Metricas de uso, datos de tendencia | Solo dashboard |

#### 2. Categorias de Alertas

| Categoria | Proposito | Ejemplos |
|-----------|-----------|----------|
| Disponibilidad | Detectar servicio inalcanzable | HTTP 5xx, timeout de conexion, falla de health check |
| Rendimiento | Detectar latencia y throughput | Latencia p99 > 500ms, profundidad de cola alta |
| Capacidad | Detectar agotamiento de recursos | CPU > 85%, disco > 80%, presion de memoria |
| Tasa de error | Detectar tasas de falla inusuales | Tasa de error > 1% durante 5 minutos |
| Seguridad | Detectar actividad sospechosa | Inicios de sesion fallidos, limites de tasa, trafico bloqueado |
| Negocio | Detectar impacto en ingresos o flujos | Pagos fallidos, caida de ordenes, registro fallido |
| Salud de datos | Detectar problemas de calidad o pipelines | Datos obsoletos, particiones faltantes, lag de sincronizacion |

#### 3. Matriz de Enrutamiento de Alertas

| Equipo | Horario Principal | Horario de Guardia | Canales | Camino de Escalacion |
|--------|-------------------|--------------------|---------|----------------------|
| Equipo de plataforma | 08:00 - 18:00 UTC | 24/7 | PagerDuty, #platform-alerts | Gerente, luego VP de Ingenieria |
| Equipo de aplicacion | 08:00 - 18:00 UTC | 24/7 | PagerDuty, #app-alerts | Lider de equipo, luego Gerente de ingenieria |
| Equipo de seguridad | 24/7 | 24/7 | PagerDuty, #security-alerts | Lider de seguridad, luego CISO |
| Equipo de bases de datos | 08:00 - 18:00 UTC | 24/7 | PagerDuty, #db-alerts | Lider DBA, luego Gerente de plataforma |
| Operaciones de negocio | Horario laboral | Ninguno | Correo, Slack | Gerente de operaciones |

#### 4. Lineamientos de Umbrales de Alerta

| Senal | Umbral de Advertencia | Umbral Critico | Ventana de Evaluacion |
|-------|-----------------------|----------------|-----------------------|
| Tasa de error HTTP | > 1% durante 5 min | > 5% durante 2 min | 5 minutos movil |
| Latencia p99 | > 500ms durante 10 min | > 1s durante 5 min | 10 minutos movil |
| Utilizacion CPU | > 70% durante 10 min | > 90% durante 5 min | 5 minutos movil |
| Utilizacion disco | > 75% durante 1 hora | > 90% durante 15 min | 15 minutos movil |
| Utilizacion memoria | > 80% durante 10 min | > 95% durante 5 min | 5 minutos movil |
| Profundidad de cola | > 1000 durante 10 min | > 5000 durante 5 min | 5 minutos movil |
| Backup fallido | N/A | Cualquier backup fallido | Por ejecucion del job |
| Vencimiento certificado SSL | < 30 dias | < 7 dias | Verificacion diaria |

#### 5. Reglas de Escalacion

| Severidad | Alerta Inicial | Sin Reconocimiento | Aun Sin Resolver | Escalacion Final |
|-----------|----------------|--------------------|------------------|------------------|
| P1 | Pagina al guardia inmediatamente | 5 min | 15 min | Notificacion ejecutiva + sala de guerra |
| P2 | Pagina al guardia | 15 min | 30 min | Pagina al gerente |
| P3 | Slack al equipo dueno | 1 hora | 4 horas | Notificacion al gerente |
| P4 | Correo o dashboard | Proximo dia laboral | N/A | Revision semanal |

#### 6. Revision y Mantenimiento de Alertas

| Actividad | Frecuencia | Dueno | Salida |
|-----------|------------|-------|--------|
| Revision de calidad de alertas | Semanal | Ingeniero de guardia | Alertas mas ruidosas, acciones de ajuste |
| Revision de runbooks de alertas | Mensual | Equipo SRE | Runbooks actualizados para cada alerta |
| Calibracion de umbrales | Trimestral | Equipo de observabilidad | Ajustes de umbrales con evidencia |
| Retro de guardia | Despues de incidente mayor | Comandante de incidente | Mejoras de alertas, tareas de seguimiento |
| Revision de politica | Anual | Liderazgo de ingenieria | Documento de politica actualizado |

## Explicacion

Esta politica convierte senales de monitoreo en alertas útiles. Al asignar severidad, enrutamiento y reglas de escalacion, la organizacion asegura que los problemas criticos reciban atencion rapida mientras que las advertencias de baja prioridad no interrumpen a los ingenieros de guardia. La seccion de revision y mantenimiento previene la fatiga de alertas mediante el ajuste continuo de umbrales y la eliminacion de alertas ruidosas.

## Reglas de Alerta de Prometheus (Ejemplo)

```yaml
groups:
  - name: api_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
          / sum(rate(http_requests_total[5m])) by (service) > 0.05
        for: 2m
        labels:
          severity: P1
          team: platform
        annotations:
          summary: "{{ $labels.service }} tasa de error > 5%"
          description: "{{ $labels.service }} tiene {{ $value | humanizePercentage }} tasa de error por 2 minutos"
          runbook: "https://runbooks.example.com/high-error-rate"

      - alert: HighLatencyP99
        expr: |
          histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[10m])) by (le, service)) > 1
        for: 5m
        labels:
          severity: P2
          team: platform
        annotations:
          summary: "{{ $labels.service }} latencia p99 > 1s"
          runbook: "https://runbooks.example.com/high-latency"

      - alert: DiskSpaceLow
        expr: |
          (node_filesystem_avail_bytes{mountpoint="/"}
          / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 10
        for: 15m
        labels:
          severity: P2
          team: infrastructure
        annotations:
          summary: "Espacio en disco < 10% en {{ $labels.instance }}"
          runbook: "https://runbooks.example.com/disk-space"
```

## Configuracion de Enrutamiento de Alertmanager

```yaml
route:
  receiver: default
  group_by: ["alertname", "service", "severity"]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - matchers:
        - severity = "P1"
      receiver: pagerduty-critical
      group_wait: 0s
      repeat_interval: 30m
    - matchers:
        - severity = "P2"
      receiver: pagerduty-warning
      group_wait: 30s
      repeat_interval: 2h
    - matchers:
        - severity = "P3"
      receiver: slack-alerts
      group_wait: 5m
    - matchers:
        - severity = "P4"
      receiver: email-alerts
      group_wait: 1h

receivers:
  - name: pagerduty-critical
    pagerduty_configs:
      - service_key: "P1_KEY"
  - name: pagerduty-warning
    pagerduty_configs:
      - service_key: "P2_KEY"
  - name: slack-alerts
    slack_configs:
      - channel: "#alerts"
        api_url: "SLACK_WEBHOOK_URL"
  - name: email-alerts
    email_configs:
      - to: "team@example.com"
  - name: default
    slack_configs:
      - channel: "#alerts"
```

## Tabla de Puntuacion de Calidad de Alertas

Revisa cada alerta trimestralmente con esta tabla:

| Criterio | Puntuacion (1-5) | Notas |
|----------|-----------------|-------|
| Accionable: La alerta desencadena una respuesta clara? | | |
| Precision: La tasa de falsos positivos es menor a 5%? | | |
| Oportuna: La alerta se dispara antes del impacto al usuario? | | |
| Enrutada: Llega al equipo que puede resolverla? | | |
| Documentada: Hay un runbook vinculado? | | |
| Unica: Esta alerta es redundante con otra? | | |

Puntuacion total menor a 18 significa que la alerta necesita ajuste o eliminacion.


## Variantes

- **Politica de alertas cloud-native**: Usa Prometheus Alertmanager, Grafana Oncall o PagerDuty para ambientes de contenedores y serverless.
- **Politica de monitoreo empresarial**: Se enfoca en infraestructura, red e integracion con service desk.
- **Politica de alertas de seguridad**: Enfatiza reglas de SIEM, deteccion de amenazas y disparadores de respuesta a incidentes.
- **Alertas de operaciones de negocio**: Rastrea KPIs, ingresos y metricas orientadas al cliente con notificaciones en horario laboral.
- **Alertas self-service para desarrolladores**: Permite a los equipos definir sus propias reglas de alerta dentro de guardrails.

## Lo que funciona

- Alerta sobre sintomas que afectan a los usuarios, no solo metricas internas.
- Usa umbrales de multi-ventana o multi-tasa de quemado para reducir falsos positivos.
- Requiere que cada alerta tenga un runbook o enlace de troubleshooting asociado.
- Enruta alertas al equipo que puede resolver el problema, no a una cola central.
- Manten los mensajes de alerta concisos e incluye contexto como severidad, servicio e impacto.
- Revisa las alertas ruidosas semanalmente y ajustalas o eliminalas.
- Prueba los caminos de escalacion durante simulacros regulares.
- Documenta los umbrales y la justificacion de los cambios.

## Errores Comunes

- Alertar sobre cada umbral metrico sin considerar el impacto al usuario.
- Enviar todas las alertas a un unico canal sin enrutamiento.
- Usar la misma severidad para todas las alertas.
- No requerir reconocimiento ni rastrear tiempo de resolucion.
- Ignorar alertas que suenan repetidamente sin accion.
- Faltar caminos de escalacion para incidentes severos.
- No revisar y retirar alertas obsoletas despues de cambios en el sistema.

## FAQs

### Que es la fatiga de alertas y como la evitamos?

La fatiga de alertas ocurre cuando los ingenieros de guardia reciben demasiadas alertas de bajo valor. Se evita ajustando umbrales, agrupando alertas relacionadas, suprimiendo problemas conocidos y eliminando regularmente alertas que no generan accion.

### Debe cada alerta pagar a alguien?

No. Solo las alertas P1 y P2 deben pagar al ingeniero de guardia. Las alertas de menor severidad deben usar Slack, correo o notificaciones de dashboard para no interrumpir el tiempo de respuesta de problemas criticos.

### Como sabemos si nuestros umbrales son correctos?

Rastrea la proporcion de alertas útiles respecto al total, mide el tiempo medio de reconocimiento y resolucion, y revisa las tasas de falsos positivos. Si una alerta suena frecuentemente sin generar accion, es candidata a ajuste o eliminacion.


### Que es el alerting multi-ventana y por que deberia usarlo?

El alerting multi-ventana evalua una condicion sobre una ventana de tiempo corta y larga antes de dispararse. Por ejemplo, tasa de error above 5% por ambas ventanas de 1m y 5m. Esto previene que las alertas se disparen en picos transitorios mientras aun captura problemas sostenidos. Prometheus soporta esto con la clausula `for` y multiples expresiones.

### Como manejamos las alertas durante mantenimiento planificado?

Usa supresion o silenciamiento de alertas en tu herramienta de alertas. En Alertmanager, crea una regla de silencio con horas de inicio/fin y matchers para los servicios afectados. Documenta la ventana de mantenimiento en un canal de incidentes para que los ingenieros de guardia sepan por que las alertas estan suprimidas. Nunca deshabilites las alertas globalmente; suprime solo las reglas especificas afectadas.

### Deberiamos usar alerting basado en SLO en lugar de alerting basado en umbrales?

El alerting basado en SLO (tasa de quemado de presupuesto de error) es mas robusto para servicios orientados al usuario porque mide directamente el impacto al usuario. El alerting basado en umbrales es mas simple y funciona bien para metricas de infraestructura (CPU, disco, memoria). Usa alerting basado en SLO para rutas de usuario criticas y basado en umbrales para salud de infraestructura.

### Cuantas alertas deberia recibir un ingeniero de guardia por turno?

Un turno de guardia saludable tiene 0-2 paginas (P1/P2) y 5-15 alertas de Slack/correo (P3/P4). Si un ingeniero recibe mas de 5 paginas por turno, la politica de alertas necesita ajuste inmediato. Rastrea el volumen de alertas por turno y revisa en retros semanales de guardia.


Alertas con puntuacion menor a 12 deben eliminarse inmediatamente. Alertas con puntuacion 12-17 deben ponerse en un plan de mejora de 30 dias con un dueno asignado.

### Deberiamos tener un NOC (L0) antes del equipo de ingenieria?

Para servicios 24/7 con alto volumen de alertas, si. Un NOC o equipo SRE de guardia (L0) filtra alertas repetidas, ejecuta runbooks conocidos y solo escala a ingenieria cuando se necesita experiencia del servicio. Esto reduce las paginas al equipo de ingenieria en un 40-60%.

Para equipos pequenos, el L1 hace este filtrado. El diseno del NOC debe incluir runbooks automatizados para las top 10 alertas mas frecuentes.

Configura integraciones con tu herramienta de tickets para crear tickets automaticamente cuando se resuelve un incidente.