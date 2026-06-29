---
contentType: docs
slug: downtime-communication-template
title: "Plantilla de Comunicación de Tiempo de Inactividad"
description: "Plantilla para mensajes internos y externos durante interrupciones del servicio."
metaDescription: "Usa esta plantilla de comunicación de inactividad para redactar mensajes internos y externos durante interrupciones del servicio e incidentes."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - downtime
  - communication
  - outage
  - incident
  - template
relatedResources:
  - /docs/auto-scaling-policy-template
  - /docs/backup-and-restore-template
  - /docs/bug-triage-template
  - /docs/change-management-template
  - /docs/cloud-cost-allocation-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de comunicación de inactividad para redactar mensajes internos y externos durante interrupciones del servicio e incidentes."
  keywords:
    - devops
    - inactividad
    - comunicacion
    - interrupcion
    - incidente
    - plantilla
---
## Visión General

Cuando tu servicio cae, el silencio es peor que las malas noticias. Los clientes entran en pánico, los equipos internos adivinan, y los ejecutivos exigen respuestas que aún no tienes. Un plan de comunicación estructurado te permite controlar la narrativa, reducir el volumen de tickets de soporte y reconstruir la confianza. Esta plantilla proporciona mensajes pre-redactados para equipos internos, clientes y páginas de estado en cada etapa de un incidente.

## Cuándo Usar

Usa este recurso cuando:
- Una interrupción o degradación afecta servicios de producción
- Necesitas coordinar mensajes entre soporte, marketing, ingeniería y ejecutivos
- Estás construyendo un runbook de respuesta a incidentes y necesitas plantillas de comunicación

## Solución

```markdown
# Comunicación de Inactividad: `<Servicio>`

## 1. Metadatos del Incidente

| Campo | Valor |
|-------|-------|
| ID de Incidente | `INC-AAAA-NNNN` |
| Servicio | `nombre` |
| Hora de Inicio (UTC) | `AAAA-MM-DD HH:MM` |
| Detectado Por | `Monitoreo / Reporte de cliente / Interno` |
| Severidad | `SEV 1 (Crítico) / SEV 2 (Mayor) / SEV 3 (Menor)` |
| Comunicador | `@nombre` |
| URL de Página de Estado | `https://status.example.com` |

## 2. Matriz de Audiencias

| Audiencia | Canal | Tiempo | Responsable | Sección de Plantilla |
|-----------|-------|--------|-------------|----------------------|
| Interno — Ingeniería | Slack #incidents | Inmediato | `@ic` | Técnico interno |
| Interno — Ejecutivos | Email / Slack DM | Dentro de 15 min | `@comms` | Resumen ejecutivo |
| Interno — Soporte | Slack #support-alerts | Dentro de 15 min | `@comms` | Borrador para clientes |
| Externo — Clientes | Página de estado + email | Dentro de 30 min | `@comms` | Notificación a clientes |
| Externo — Empresarial | Canal dedicado de cuenta | Dentro de 30 min | `@account-team` | Actualización personalizada |

## 3. Plantillas de Mensajes

### 3.1. Detección Inicial (Técnico Interno)

> **Incidente `INC-XXXX` — `<Servicio>` Degradado**
>
> - **Estado**: Investigando
> - **Síntomas**: `breve descripción`
> - **Impacto**: `regiones / capacidades / segmentos de usuarios afectados`
> - **Iniciado**: `hora`
> - **Acciones**: El equipo de ingeniería está investigando. Actualizaciones cada 15 minutos.

### 3.2. Detección Inicial (Para Clientes)

> **Investigando — Problema en `<Servicio>`**
>
> Estamos investigando reportes de `síntoma` afectando `servicio`. Proporcionaremos una actualización dentro de 30 minutos o tan pronto como tengamos más información.
>
> **Afectado**: `regiones / capacidades`
> **Solución alternativa**: `si existe`

### 3.3. Actualización (Cada 30–60 Minutos)

> **Actualización — Problema en `<Servicio>`**
>
> Continuamos investigando la causa de `síntoma`. `Opcional: Hemos identificado la causa raíz como X y estamos aplicando un arreglo.` Esperamos proporcionar otra actualización para `hora`.
>
> **Estado**: Investigando / Identificado / Monitoreando

### 3.4. Resolución

> **Resuelto — Problema en `<Servicio>`**
>
> `Servicio` ahora está totalmente operacional. El problema fue causado por `causa raíz (breve, sin jerga)`. Todos los sistemas están estables y estamos monitoreando de cerca.
>
> **Duración**: `X minutos / horas`
> **Próximos pasos**: Publicaremos un post-mortem dentro de `plazo`.

### 3.5. Notificación de Post-Mortem

> **Post-Mortem — Incidente en `<Servicio>` el `Fecha`**
>
> Hemos completado nuestra revisión del incidente del `fecha`. Puedes leer el post-mortem completo aquí: `enlace`.
>
> **Resumen**: `Un párrafo, sin culpa, sin jerga.`
> **Impacto**: `Duración + usuarios afectados`
> **Causa raíz**: `Lenguaje sencillo`
> **Arreglos implementados**: `Lista`
> **Prevención**: `Qué estamos haciendo para evitar recurrencia`

## 4. Tiempos basados en Severidad

| Severidad | Primera actualización al cliente | Frecuencia de actualización | Escalamiento |
|-----------|----------------------------------|-----------------------------|--------------|
| SEV 1 (Crítico) | 15 minutos | Cada 15 minutos | Notificación al CEO después de 1 hora |
| SEV 2 (Mayor) | 30 minutos | Cada 30 minutos | Notificación al VP después de 2 horas |
| SEV 3 (Menor) | 1 hora | Cada 1 hora | Notificación al manager si > 4 horas |

## 5. Lista de Verificación de Aprobación

- [ ] El mensaje es factual; sin promesas sobre tiempo de resolución a menos que se esté confiado
- [ ] Sin jerga interna o detalles técnicos que confundan a clientes
- [ ] La solución alternativa está verificada antes de publicar
- [ ] Legal / cumplimiento revisado si involucra PII o datos regulatorios
- [ ] La página de estado se actualiza antes que cualquier otro canal
- [ ] Redes sociales / PR están alineados si la prensa externa puede cubrir la historia
```

## Explicación

La plantilla separa la comunicación **interna** (detallada, técnica, rápida) de la **externa** (sencilla, tranquilizadora, precisa). El fallo más común durante incidentes es prometer un tiempo de resolución que no puedes cumplir. Las plantillas omiten deliberadamente ETAs específicas a menos que el arreglo ya esté desplegado y validándose. La matriz de audiencias evita que el soporte se entere de una interrupción por clientes enojados en lugar de por ingeniería.

## Variantes

| Contexto | Mezcla de Canales | Tono |
|----------|-------------------|------|
| SaaS B2B | Página de estado + email directo + llamada de account manager | Profesional, responsable |
| App de consumidor | Banner en app + Twitter / X + página de estado | Amigable, conciso |
| Plataforma de API | Página de estado + Slack / Discord de desarrolladores | Técnico, transparente |
| Servicio global | Páginas de estado regionales + emails localizados | Localizado, consciente de zona horaria |
| Incidente de seguridad | Divulgación limitada + notificación directa al cliente | Cuidadoso, conforme a legal |

## Lo que funciona

1. Actualiza la página de estado primero; es la única fuente de verdad
2. Nunca digas "estamos de vuelta a la normalidad" hasta que el monitoreo confirme durante al menos 10 minutos
3. Usa lenguaje sencillo; "lag de replicación de base de datos" no significa nada para los clientes
4. No culpes a terceros públicamente, incluso si ellos causaron el problema; enfócate en tu resolución
5. Publica un post-mortem dentro de 72 horas para incidentes SEV 1–2; el silencio destruye la confianza

## Errores Comunes

1. Esperar hasta "entender completamente" el problema antes de comunicar; los clientes notan el silencio
2. Prometer un tiempo de resolución para calmar a stakeholders, y luego fallarlo
3. Usar palabras diferentes entre canales (la página de estado dice "degradado", Twitter dice "caído")
4. Olvidar notificar al soporte interno antes que a los clientes externos
5. Omitir el post-mortem o hacerlo tan técnico que los no ingenieros no puedan entenderlo

## Preguntas Frecuentes

### ¿Debo comunicar si solo afecta a un pequeño porcentaje de usuarios?

Sí. Incluso el 1% de usuarios para un servicio grande son miles de personas. Una breve actualización en la página de estado reduce la carga de soporte y muestra transparencia. Para issues muy menores (SEV 3), un aviso en la app o una actualización en la página de estado sin email puede ser suficiente. La clave es emparejar el canal con el impacto.

### ¿Qué pasa si aún no conocemos la causa raíz?

Comunica lo que sabes (síntomas, áreas afectadas, acciones en curso) y lo que no sabes (causa raíz, ETA). La honestidad genera más confianza que el silencio. Ejemplo: "Hemos identificado que el login está fallando para usuarios en la región de la UE. Estamos investigando la causa y actualizaremos en 30 minutos."

### ¿Cómo manejo un incidente de seguridad de manera diferente?

Los incidentes de seguridad requieren revisión legal y de cumplimiento antes de la comunicación externa. No divulgues detalles que puedan ayudar a atacantes. Notifica a los clientes afectados directamente (no solo una página de estado pública). Sigue tu plan de respuesta a incidentes y cualquier ley de notificación de violaciones (regla de 72 horas del GDPR, leyes estatales de violaciones). El mensaje debe ser factual, limitado y aprobado por legal.
