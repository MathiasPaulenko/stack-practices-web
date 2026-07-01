---
contentType: docs
slug: security-incident-response-template
templateType: security-incident-response
title: "Plantilla de Respuesta a Incidentes de Seguridad"
description: "Plantilla de respuesta a incidentes de seguridad para documentar brechas, contener amenazas y comunicar con stakeholders durante un evento de seguridad."
metaDescription: "Plantilla de respuesta a incidentes de seguridad: documenta brechas, contiene amenazas y comunica durante eventos de seguridad. Reduce impacto y tiempo de recuperación."
difficulty: intermediate
topics:
  - security
tags:
  - incident-response
  - security
  - template
relatedResources:
  - /guides/security/web-application-security-guide
  - /guides/devops/on-call-incident-response-guide
  - /docs/templates/incident-postmortem-template
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Plantilla de respuesta a incidentes de seguridad: documenta brechas, contiene amenazas y comunica durante eventos de seguridad. Reduce impacto y tiempo de recuperación."
  keywords:
    - plantilla respuesta incidente seguridad
    - template respuesta brecha
    - reporte incidente seguridad
    - playbook respuesta incidentes
    - documentacion evento seguridad
---

# Plantilla de Respuesta a Incidentes de Seguridad

Usa esta plantilla durante un evento de seguridad para asegurar que nada se pasa por alto bajo presión. Consulta la [Guía de Seguridad de Aplicaciones Web](/guides/security/web-application-security-guide) para prevención y la [Guía de Respuesta a Incidentes On-Call](/guides/devops/on-call-incident-response-guide) para procedimientos de respuesta.

## Plantilla

```markdown
# Reporte de Incidente de Seguridad

## Clasificación
| Campo | Valor |
|-------|-------|
| **ID de incidente** | SEC-AAAA-NNNN |
| **Severidad** | [Crítica / Alta / Media / Baja] |
| **Tipo** | [Data breach / RCE / Fuga de credenciales / DDoS / Insider threat] |
| **Estado** | [Abierto / Contenido / Resuelto / Cerrado] |

## Timeline

| Hora (UTC) | Evento | Actor |
|------------|--------|-------|
| 00:00 | Alerta inicial disparada | Monitoreo |
| 00:05 | Comandante de incidente asignado | On-call |
| 00:30 | Amenaza contenida | Ingeniería |

## Descubrimiento
- **Cómo se detectó:** [alerta / reporte de cliente / auditoría / tip externo]
- **Alcance inicial:** [sistemas afectados / tipos de datos / cantidad de usuarios]
- **Evidencia preservada:** [logs / imágenes de disco / dumps de memoria]

## Contención
- **Acciones inmediatas tomadas:** [aislar instancia / revocar tokens / bloquear IP]
- **Sistemas aislados:** [lista]
- **Comunicación enviada:** [interna / clientes / reguladores / prensa]

## Evaluación de Impacto
- **Datos accedidos:** [ninguno / PII / financieros / credenciales]
- **Usuarios afectados:** [cantidad o "desconocido"]
- **Servicios degradados:** [lista o "ninguno"]

## Causa Raíz
- **Vulnerabilidad:** [descripción]
- **Vector de ataque:** [cómo el atacante entró]
- **Tiempo hasta detección:** [minutos / horas / días]

## Remediación
- **Fixes a corto plazo aplicados:** [patch / cambio de config / rotación]
- **Mejoras a largo plazo:** [cambio de arquitectura / actualización de proceso]
- **Verificación:** [cómo confirmaste el fix]

## Lecciones Aprendidas
- **Qué funcionó bien:**
- **Qué podría mejorarse:**
- **Action items:** [dueño + fecha límite]
```

## Clasificación de Severidad

| Nivel | Criterios | Tiempo de Respuesta | Comunicación |
|-------|----------|-------------------|-------------|
| **Crítica** | Brecha activa, exfiltración de datos, RCE | 15 minutos | Legal + ejecutivos + clientes |
| **Alta** | Vulnerabilidad confirmada, sin explotación confirmada | 1 hora | Interna + potencial aviso a clientes |
| **Media** | Actividad sospechosa, sin compromiso confirmado | 4 horas | Equipo interno |
| **Baja** | Violación de política, sin impacto de negocio | 24 horas | Team lead |

## Plantillas de Comunicación

### Interna (dentro de 1 hora)

```
Asunto: Incidente de Seguridad SEC-AAAA-NNNN — [Severidad]

Hemos detectado [tipo] afectando [alcance]. El comandante de incidente es [nombre].
No discutir externamente. Actualizaciones cada 2 horas en #security-incidents.
```

### Clientes Externos (si PII afectada)

```
Le escribimos para informarle de un incidente de seguridad que puede haber
involucrado su [tipo de dato]. Hemos [contenido / remediado] el issue y estamos
[pasos tomados]. Le actualizaremos dentro de 72 horas.
```

## Lo que funciona

- **Designa un comandante de incidente inmediatamente** — una persona coordina, otros ejecutan
- **Preserva evidencia antes de contención** — dumps de memoria y logs desaparecen al reiniciar. Consulta la [Guía de Monitoreo y Alertas](/guides/devops/monitoring-alerting-guide) para gestión de logs.
- **Comunica temprano y frecuentemente** — el silencio genera especulación y penalizaciones regulatorias
- **Asume brecha hasta que se pruebe lo contrario** — mejor sobre-responder que sub-responder
- **Documenta sobre la marcha** — la memoria post-incidente es poco confiable

## Errores Comunes

- Destruir evidencia reiniciando servidores — preserva memoria volátil primero
- No involucrar legal temprano — las leyes de disclosure tienen deadlines ajustados (72 horas para GDPR)
- Comunicar demasiado temprano con hechos no verificados — retractar declaraciones daña la confianza
- Saltarse el postmortem — los incidentes de seguridad enseñan más que outages regulares. Usa la [Plantilla de Postmortem de Incidente](/docs/templates/incident-postmortem-template) para seguimiento estructurado.

## Preguntas Frecuentes

### ¿Cuándo debería notificar a clientes sobre un incidente de seguridad?

Si sus datos fueron o podrían haber sido accedidos, notifícalos directa y prontamente. Consulta la [Plantilla de Política de Retención de Datos](/docs/devops/data-retention-policy-template) para guía de clasificación de datos. Las regulaciones varían: GDPR requiere 72 horas a reguladores, notificación a clientes sin demora indebida. Cuando en duda, notifica.

### ¿Debería pagar una demanda de ransomware?

Generalmente no. El pago financia futuros ataques y no garantiza recuperación de datos. Consulta legal y fuerzas del orden. Enfócate en recuperación desde backups y herramientas públicas de desencriptación.

### ¿Cómo manejo una amenaza de insider sospechada?

Involucra a RRHH y legal inmediatamente. No confrontes al individuo directamente. Preserva logs silenciosamente, restringe acceso gradualmente, y sigue el protocolo de amenaza interna de tu organización.
