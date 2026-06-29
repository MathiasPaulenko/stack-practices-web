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
