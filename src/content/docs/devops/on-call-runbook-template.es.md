---
contentType: docs
slug: on-call-runbook-template
title: "Plantilla de Runbook de Guardia"
description: "Una plantilla que documenta alertas comunes y procedimientos de respuesta paso a paso para ingenieros de guardia."
metaDescription: "Usa esta plantilla de runbook de guardia para documentar alertas comunes, procedimientos de respuesta paso a paso y pasos de solución de problemas para ingenieros de guardia."
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
  metaDescription: "Usa esta plantilla de runbook de guardia para documentar alertas comunes, procedimientos de respuesta paso a paso y pasos de solución de problemas para ingenieros de guardia."
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

## Mejores Prácticas

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
