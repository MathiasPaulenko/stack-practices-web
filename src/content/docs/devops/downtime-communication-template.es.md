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
  - /docs/sla-definition-template
  - /docs/incident-communication-template
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


- For alternatives, see [Incident Communication Template](/es/docs/incident-communication-template/).

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

## Plantillas de Mensajes para Pagina de Estado

```text
=== SEV 1: Deteccion Inicial ===

Estado: Investigando
Estamos investigando un problema que afecta a [SERVICIO/FEATURE AFECTADA].
Los clientes pueden experimentar [SINTOMAS: ej., fallos de login, respuestas lentas].
Identificamos el problema a las [HORA] y estamos trabajando activamente en una solucion.
Proxima actualizacion en 15 minutos.

=== SEV 1: Identificado ===

Estado: Identificado
Hemos identificado la causa raiz: [DESCRIPCION EN LENGUAJE PLANO].
Se esta desplegando una correccion y esperamos que el servicio se restaure dentro de [TIMEFRAME].
Proxima actualizacion en 15 minutos.

=== SEV 1: Monitoreando ===

Estado: Monitoreando
Se ha desplegado una correccion y estamos monitoreando el servicio.
Los indicadores preliminares muestran mejora pero queremos confirmar estabilidad.
Proxima actualizacion en 15 minutos.

=== SEV 1: Resuelto ===

Estado: Resuelto
El problema ha sido resuelto. El servicio opera normalmente.
Publicaremos un post-mortem dentro de 72 horas.
Gracias por su paciencia.
```

## Plantillas de Comunicacion Interna en Slack

```text
=== Canal de Incidente: #incident-2026-07-11 ===

[11:00] @on-call: SEV1 declarado — auth-service devolviendo 500s
[11:01] @on-call: Impacto: ~15% de intentos de login fallando, region EU
[11:02] @sre: Investigando — revisando despliegues recientes y salud de DB
[11:05] @sre: Encontrado — deploy de config reciente cambio rotacion de JWT secret
[11:06] @on-call: Fix identificado — revirtiendo cambio de config
[11:08] @sre: Rollback desplegado, monitoreando tasa de error
[11:12] @on-call: Tasa de error bajando — 15% -> 3% -> 0.5%
[11:15] @on-call: Tasa de error en 0%. Monitoreando por 10 minutos mas.
[11:25] @on-call: Estable. SEV1 resuelto. Post-mortem programado para manana.

=== Canal de Soporte: #support ===

[11:02] @on-call: SEV1 — fallos de login para usuarios EU. Pagina de estado actualizada.
[11:03] @on-call: Si clientes preguntan: "Somos conscientes de problemas de login en EU y estamos trabajando en ello."
[11:08] @on-call: Fix desplegado, monitoreando. No prometer tiempo de resolucion aun.
[11:25] @on-call: Resuelto. Pagina de estado actualizada a verde. Gracias equipo de soporte.
```


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


### Como comunicamos durante una interrupcion prolongada?

Para interrupciones que duran mas de 1 hora: actualiza la pagina de estado cada 30 minutos incluso si no hay nueva informacion. Comparte lo que estas haciendo, no solo lo que sabes. Ejemplo: "Estamos probando un failover de base de datos a la region secundaria. Este proceso toma aproximadamente 20 minutos." Asigna un comunicador dedicado que no este en la ruta de resolucion del incidente. El comunicador recopila actualizaciones del incident commander y las traduce para audiencias externas. Mantén mensajes internos y externos consistentes en tono y hechos.

### Que deberiamos incluir en un post-mortem?

Un post-mortem deberia incluir: resumen del incidente (que paso, cuando, impacto), cronologia de eventos (deteccion, respuesta, resolucion), analisis de causa raiz (la causa real, no solo el sintoma), factores contribuyentes (que empeoro o dificulto la deteccion), action items con responsables y plazos, lecciones aprendidas (que fue bien, que no), y anexos (graficos, logs, capturas). Escribelo sin culpa — enfocate en sistemas y procesos, no individuos. Compartelo con todo el equipo de ingenieria. Rastrea los action items hasta completarlos.

### Como manejamos la comunicacion para degradacion parcial?

La degradacion parcial es mas dificil de comunicar que una interrupcion total. Se especifico sobre que esta afectado y que no. Ejemplo: "La funcionalidad de busqueda esta degradada — los resultados pueden tardar hasta 10 segundos. Todas las demas features operan normalmente." Evita terminos vagos como "algunos usuarios" — cuantifica si es posible. Actualiza la pagina de estado con un indicador de "Interrupcion Parcial" o "Rendimiento Degradado". Monitorea si la degradacion parcial empeora hacia una interrupcion total y escala la comunicacion en consecuencia.

### Deberiamos usar redes sociales durante incidentes?

Usa redes sociales (Twitter/X) para servicios orientados al consumidor para alcanzar usuarios que pueden no revisar la pagina de estado. Mantén mensajes cortos y enlaza a la pagina de estado para detalles. No participes en debates tecnicos en redes sociales durante un incidente activo. Asigna a una persona para monitorear redes sociales por reportes de clientes. Despues de la resolucion, publica un resumen enlazando al post-mortem. Para servicios B2B, las redes sociales son menos importantes — enfocate en comunicacion directa con clientes.

### Como capacitamos al equipo en comunicacion de incidentes?

Ejecuta ejercicios regulares de comunicacion de incidentes (game days). Simula un incidente y practica el flujo de comunicacion: actualizaciones de pagina de estado, mensajes internos de Slack, notificaciones al equipo de soporte, y emails a stakeholders. Revisa los mensajes despues por claridad, tono y timing. Rota el rol de comunicador para que multiples miembros del equipo ganen experiencia. Crea un runbook de comunicacion con plantillas y arboles de decision. Revisa comunicaciones de incidentes pasados en retrospectivas de equipo para identificar mejoras.


### Como manejamos la comunicacion para mantenimiento programado?

Para mantenimiento programado: notifica a los clientes con al menos 7 dias de anticipacion via email y pagina de estado. Incluye: ventana de mantenimiento (hora de inicio y fin), impacto esperado (downtime, rendimiento degradado, o modo solo lectura), servicios afectados, y razon del mantenimiento. Envia un recordatorio 24 horas antes. Actualiza la pagina de estado a "Mantenimiento" durante la ventana. Proporciona actualizaciones en tiempo real durante el mantenimiento. Envia una notificacion de resolucion cuando el mantenimiento completa. Documenta el mantenimiento en el post-mortem si ocurrieron problemas inesperados.

### Que es una pagina de estado y que servicio deberiamos usar?

Una pagina de estado es una pagina web publica que muestra el estado operacional actual de tu servicio. Opciones populares: Atlassian Statuspage, Better Uptime, Instatus, o auto-alojada (Cachet, Staytus). Elige basado en: presupuesto, integracion con herramientas de monitoreo, necesidades de personalizacion, y flujo de gestion de incidentes. La pagina de estado deberia mostrar: estado actual (operacional, degradado, interrupcion parcial, interrupcion mayor), incidentes activos con timestamps, mantenimiento programado, e historial de incidentes. Mantenla en un dominio o subdominio separado para que sea accesible incluso si tu servicio principal esta caido.

### Como medimos la efectividad de la comunicacion durante incidentes?

Rastrea: tiempo desde deteccion hasta primera comunicacion externa (objetivo: < 15 min para SEV1), numero de actualizaciones de pagina de estado durante el incidente, satisfaccion del cliente con la comunicacion (encuesta post-incidente), volumen de tickets de soporte durante el incidente (menor = mejor comunicacion), y sentimiento en redes sociales. Revisa estas metricas en el post-mortem. Establece objetivos: primera actualizacion dentro de 15 minutos, actualizaciones cada 15-30 minutos, post-mortem dentro de 72 horas. Mejora los procesos de comunicacion basados en estas metricas.


Fin del documento. Revisa y actualiza las plantillas de comunicacion despues de cada incidente mayor. Capacita a todos los ingenieros on-call en el proceso de comunicacion trimestralmente.























End of document. Review and update quarterly.