---
contentType: docs
slug: escalation-policy-template
title: "Plantilla de Política de Escalamiento"
description: "Una plantilla para definir niveles de severidad de incidentes y rutas de escalamiento de guardia."
metaDescription: "Plantilla de política de escalamiento: define niveles de severidad, rutas de escalamiento, SLAs de respuesta y responsables para tu equipo de guardia."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - escalation
  - policy
  - on-call
  - operations
  - template
relatedResources:
  - /docs/auto-scaling-policy-template
  - /docs/bug-triage-template
  - /docs/change-management-template
  - /docs/runbook-template
  - /docs/backup-and-restore-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Plantilla de política de escalamiento: define niveles de severidad, rutas de escalamiento, SLAs de respuesta y responsables para tu equipo de guardia."
  keywords:
    - devops
    - escalamiento
    - política
    - guardia
    - operaciones
    - plantilla
---
## Visión General

Cuando un incidente crítico ocurre a las 3 a.m., un ingeniero de guardia debe saber en 30 segundos si debe despertar al CTO o manejarlo solo. La mayoría de los equipos asumen que el escalamiento es "sentido común" — hasta que un ticket de baja prioridad despierta al CEO o un incidente de pérdida de datos permanece sin resolver durante horas porque nadie sabía a quién llamar. Esta plantilla define niveles de severidad claros, tiempos de respuesta y rutas de escalamiento para que tu equipo responda con confianza, no con pánico.

## Cuándo Usar

Usa este recurso cuando:
- Estás construyendo o revisando una rotación de guardia y necesitas reglas de escalamiento explícitas
- Un incidente reciente se manejó mal porque el ingeniero de guardia no sabía a quién escalar
- Tu marco de cumplimiento (SOC 2, ISO 27001) requiere SLAs de respuesta a incidentes documentados

## Solución

```markdown
# Política de Escalamiento: `<Equipo / Servicio>`

## 1. Niveles de Severidad

| Nivel | Nombre | Criterios | Tiempo de Respuesta | Objetivo de Resolución |
|-------|--------|-----------|---------------------|------------------------|
| SEV 1 | Crítico | Servicio caído; pérdida de datos; brecha de seguridad; impacto en ingresos | 5 min | 4 horas |
| SEV 2 | Mayor | Capacidad principal rota; degradacion mayor de rendimiento | 15 min | 8 horas |
| SEV 3 | Menor | Característica degradada; interrupción parcial afectando subconjunto de usuarios | 1 hora | 24 horas |
| SEV 4 | Bajo | Issue cosmético; error de documentación; pregunta no urgente | 4 horas | Próximo día hábil |

## 2. Lista de Guardia

| Rol | Principal | Backup | Método de Contacto | SLA de Respuesta |
|-----|-----------|--------|--------------------|------------------|
| L1 — Ingeniero de Guardia | `@nombre` | `@nombre` | Pager / SMS | 5 min (SEV 1), 15 min (SEV 2) |
| L2 — Líder de Equipo | `@nombre` | `@nombre` | Teléfono / Slack | 15 min (SEV 1), 30 min (SEV 2) |
| L3 — Manager de Ingeniería | `@nombre` | `@nombre` | Teléfono | 30 min (SEV 1), 1 hora (SEV 2) |
| L4 — VP de Ingeniería / CTO | `@nombre` | `@nombre` | Teléfono | 1 hora (solo SEV 1) |

## 3. Rutas de Escalamiento

### SEV 1 — Crítico

| Tiempo Transcurrido | Acción | Escalar A |
|---------------------|--------|-----------|
| 0 min | Acusar recibo de página; iniciar respuesta | L1 |
| 10 min | Sin progreso significativo; página al backup | L2 |
| 20 min | Sin ruta de resolución identificada; página al manager | L3 |
| 45 min | Sin resolución; conciencia ejecutiva requerida | L4 |
| 2 horas | Abrir sala de guerra; notificar equipos orientados al cliente | L3 + Comms |

### SEV 2 — Mayor

| Tiempo Transcurrido | Acción | Escalar A |
|---------------------|--------|-----------|
| 0 min | Acusar recibo; evaluar alcance | L1 |
| 30 min | Sin arreglo claro; involucrar líder de equipo | L2 |
| 1 hora | Sin resolución; conciencia del manager | L3 |
| 3 horas | Abrir bridge; comunicación con clientes si afecta usuarios | L3 + Comms |

### SEV 3 / SEV 4

| Tiempo Transcurrido | Acción | Escalar A |
|---------------------|--------|-----------|
| 0 min | Acusar recibo; triaje | L1 |
| 4 horas (SEV 3) | Sin progreso; notificación al líder de equipo | L2 |
| Próximo día hábil (SEV 4) | Asignación estándar de backlog | L2 |

## 4. Canales de Comunicación

| Severidad | Alerta Inicial | Actualizaciones | Página de Estado | Comms con Clientes |
|-----------|---------------|-----------------|------------------|--------------------|
| SEV 1 | Página + Slack #incidents | Cada 15 min | Sí, inmediatamente | Sí, dentro de 30 min |
| SEV 2 | Página + Slack #incidents | Cada 30 min | Sí, dentro de 30 min | Sí, si afecta usuarios |
| SEV 3 | Slack #incidents | Cada 1 hora | No | No |
| SEV 4 | Ticket en JIRA / Linear | Daily standup | No | No |

## 5. Lista de Verificación del Runbook de Respuesta

- [ ] Acusar recibo de la alerta dentro del SLA
- [ ] Clasificar severidad usando los criterios anteriores
- [ ] Si SEV 1 o SEV 2: crear hilo en Slack #incidents
- [ ] Si SEV 1: abrir bridge de sala de guerra inmediatamente
- [ ] Documentar línea de tiempo en herramienta de seguimiento de incidentes
- [ ] Actualizar página de estado para SEV 1–2 dentro del SLA
- [ ] Notificar equipos orientados al cliente si el impacto a usuarios > 5%
- [ ] Publicar evaluación inicial en el hilo del incidente dentro de 15 minutos
- [ ] Actualizar hilo del incidente cada 15–30 minutos hasta resolución
```

## Explicación

La plantilla separa **clasificación de severidad** de **tiempo de escalamiento**. Muchos equipos confunden ambos: asumen que una alerta crítica automáticamente despierta al CTO. En la práctica, el escalamiento debe basarse en **tiempo**, no solo en severidad. Un SEV 1 que se resuelve en 10 minutos nunca necesita involucramiento ejecutivo. Las rutas de escalamiento forzan decisiones estructuradas en intervalos fijos, previniendo tanto el pánico prematuro como la demora peligrosa.

## Configuración de Política de Escalamiento en PagerDuty

```yaml
escalation_policy:
  name: "Platform Team - SEV1"
  num_loops: 2
  rules:
    - escalation_delay_in_minutes: 5
      targets:
        - type: user
          id: "L1-primary"
    - escalation_delay_in_minutes: 10
      targets:
        - type: user
          id: "L1-backup"
    - escalation_delay_in_minutes: 15
      targets:
        - type: user
          id: "L2-team-lead"
    - escalation_delay_in_minutes: 30
      targets:
        - type: user
          id: "L3-engineering-manager"
  on_call_handoff_time: "08:00:00"
  on_call_handoff_timezone: "UTC"
```

## Plantillas de Comunicación de Incidentes

### Aviso Inicial al Cliente (SEV 1)

```text
[INCIDENTE] Estamos investigando un problema que afecta a <servicio>.
Impacto: <descripción del impacto para el usuario>
Inicio: <timestamp UTC>
Estado: Investigando
Próxima actualización: Dentro de 15 minutos
```

### Aviso de Resolución

```text
[RESUELTO] <servicio> funciona normalmente.
Duración: <tiempo total>
Causa raíz: <resumen breve>
Usuarios afectados: <conteo o porcentaje aproximado>
Acción preventiva: <qué estamos haciendo para prevenir recurrencia>
```

## Plantilla de Revisión Post-Incidente

```markdown
# Revisión Post-Incidente: <Título del Incidente>

## Resumen
- Fecha: YYYY-MM-DD
- Duración: X horas Y minutos
- Severidad: SEV X
- Impacto: <usuarios afectados, impacto en ingresos, downtime>

## Línea de Tiempo
| Hora (UTC) | Evento |
|------------|-------|
| 00:00 | Alerta disparada |
| 00:05 | Guardia acusó recibo |
| 00:15 | Causa raíz identificada |
| 00:45 | Fix desplegado |
| 01:00 | Confirmado resuelto |

## Causa Raíz
<Qué causó el incidente>

## Factores Contribuyentes
<Qué empeoró la situación o dificultó la detección>

## Qué Funcionó Bien
- <Cosas que funcionaron>

## Qué Salió Mal
- <Cosas que no funcionaron>

## Acciones
| Acción | Responsable | Fecha Límite | Prioridad |
|--------|-------------|--------------|----------|
| <acción> | @nombre | YYYY-MM-DD | P1 |
```

## Variantes

| Tamaño de Organización | Profundidad de Escalamiento | Diferencia Clave |
|------------------------|----------------------------|------------------|
| Startup (< 20 ingenieros) | L1 → L2 (founder/CTO) | Plano; el CTO suele ser L2 |
| Mediano (20–100) | L1 → L2 → L3 | Los líderes de equipo son la capa crítica |
| Empresa (100+) | L1 → L2 → L3 → L4 | VP/CTO solo para SEV 1 de varias horas |
| SaaS 24/7 | Agregar L0 — NOC / SRE de guardia | El NOC triaje antes de que ingeniería reciba páginas |
| Follow-the-sun | Transferencias regionales de L1 | APAC → EMEA → AMER rotación |
| Industria regulada | Agregar oficial de compliance | Notificar al DPO o líder de compliance para brechas de datos |
| SaaS multi-tenant | Agregar escalamiento de customer success | Notificar al CSM para cuentas > $100k ARR |

## Lo que funciona

1. Imprime la matriz de escalamiento y publícala en el tema del canal de Slack de guardia
2. Usa los mismos criterios de severidad en todos los equipos; definiciones inconsistentes causan confusión
3. Prueba la ruta de escalamiento trimestralmente con una página sintética; los números de teléfono caducan
4. Define "sin progreso significativo" explícitamente (por ejemplo, "sin hipótesis de causa raíz en 10 minutos")
5. Documenta métodos de contacto fuera de horario por separado; no confíes en DMs de Slack a las 3 a.m.
6. Automatiza el escalamiento en tu herramienta de paging; el escalamiento manual falla bajo estrés
7. Incluye un período de "enfriamiento" después de la rotación de guardia para prevenir burnout

## Errores Comunes

1. Hacer el escalamiento opcional o culturalmente desalentado ("no despiertes al manager")
2. No definir contactos de backup; el principal de guardia puede estar dormido, enfermo o en un avión
3. Usar severidad como medida de esfuerzo en lugar de impacto
4. Omitir la actualización de la página de estado porque "se arreglará pronto"
5. No revisar decisiones de escalamiento después de incidentes; los patrones revelan brechas de entrenamiento
6. Escalar a individuos en lugar de roles; las personas se van, los roles persisten
7. No actualizar la información de contacto después de cambios en el equipo; números obsoletos causan demoras críticas

## Preguntas Frecuentes

### ¿Qué pasa si el ingeniero de guardia no puede clasificar la severidad inmediatamente?

Comienza con la severidad más alta razonable. Siempre es más fácil bajar que subir. Si no estás seguro entre SEV 1 y SEV 2, trátalo como SEV 1 por los primeros 15 minutos. Reclasifica cuando tengas suficientes datos. Documenta la reclasificación y su justificación en el hilo del incidente.

### ¿Debería la misma persona estar de guardia para múltiples servicios?

Evítalo si es posible. El cambio de contexto entre servicios no relacionados durante una interrupción reduce la efectividad. Si es inevitable por tamaño del equipo, asegúrate de que el runbook para cada servicio sea extremadamente detallado y que el sistema de paging incluya el nombre del servicio en la alerta. La política de escalamiento debe aplicarse por servicio, no por persona.

### ¿Cómo manejo a un ingeniero de guardia que no responde?

La política debe especificar un tiempo de espera para no respuesta (por ejemplo, 5 minutos para SEV 1, 10 minutos para SEV 2). Después de ese tiempo, el sistema de paging escala automáticamente al backup de guardia, luego al líder de equipo. No dejes que "quizás está en la ducha" se convierta en una demora de 30 minutos. Automatiza esto en PagerDuty, Opsgenie o tu herramienta de paging.

### ¿Cuánto debería durar un turno de guardia?

Una semana es el estándar. Turnos más cortos (3-4 días) reducen la fatiga pero aumentan la sobrecarga de transferencia. Turnos más largos (2 semanas) causan burnout y reducen la alerta. Nunca programes a alguien por más de 2 semanas consecutivas. Incluye un período de enfriamiento de al menos una semana libre después de cada rotación.

### ¿Cuál es la diferencia entre una política de escalamiento y un plan de respuesta a incidentes?

Una política de escalamiento define a quién contactar y cuándo. Un plan de respuesta a incidentes define qué hacer una vez contactado: triaje, mitigación, comunicación, resolución y revisión. La política de escalamiento es un componente del plan más amplio de respuesta a incidentes.

### ¿Deberíamos usar una única política de escalamiento en todos los equipos?

Usa una plantilla compartida pero permite personalización por equipo. Los niveles de severidad y los estándares de comunicación deben ser organizacionales. La lista de contactos, la profundidad de escalamiento y las reglas de paging deben ser específicas por equipo. Esto balancea consistencia con flexibilidad práctica.

### ¿Cómo medimos la efectividad de la política de escalamiento?

Rastrea estas métricas mensualmente: tiempo medio para acusar recibo (MTTA), tiempo medio para resolver (MTTR), porcentaje de incidentes escalados, tasa de falsos escalamientos y puntaje de satisfacción de guardia. Si el MTTA está consistentemente por encima del SLA, la política o la herramienta de paging necesita ajustes.


### ¿Deberiamos notificar al cliente durante incidentes SEV 2?

Si el incidente afecta a usuarios, si. Envia un aviso inicial dentro de 30 minutos y actualizaciones cada 30 minutos hasta resolver. Incluso si el impacto es menor, la transparencia genera confianza. Usa la plantilla de aviso al cliente del SEV 1 pero ajusta el tono para reflejar menor severidad.

### ¿Como prevenimos el burnout de guardia?

Rota semanalmente, limita a 2 semanas consecutivas maximo, incluye una semana de enfriamiento despues de cada rotacion, y compensa con tiempo libre o pago extra. Monitorea el numero de paginas por turno. Si un ingeniero recibe mas de 5 paginas en un turno, reasigna servicios o ajusta umbrales de alerta.

### ¿Que hacemos si el ingeniero de guardia esta enfermo o no disponible?

La politica debe definir un procedimiento de intercambio: el ingeniero notifica al backup y al lider de equipo lo antes posible. El backup asume la guardia inmediatamente. Si ambos primario y backup no estan disponibles, el lider de equipo (L2) asume temporalmente mientras se encuentra un reemplazo. Documenta el intercambio en el canal de guardia de Slack.

### ¿Deberiamos tener un NOC (L0) antes del equipo de ingenieria?

Para servicios 24/7 con alto volumen de alertas, si. Un NOC o equipo SRE de guardia (L0) filtra alertas repetidas, ejecuta runbooks conocidos y solo escala a ingenieria cuando se necesita experiencia del servicio. Esto reduce las paginas al equipo de ingenieria en un 40-60%. Para equipos pequenos, el L1 hace este filtrado.

### ¿Como manejamos escalamientos cross-team durante un incidente?

Designa un Incident Commander (IC) que coordina entre equipos. El IC no resuelve el problema directamente sino que facilita comunicacion, asigna acciones y mantiene la linea de tiempo. Si el incidente involucra 3 o mas equipos, el IC debe ser alguien fuera de los equipos afectados para mantener objetividad. El IC reporta al L3/L4 con un resumen cada 30 minutos.

### ¿Que herramientas recomendamos para automatizar el escalamiento?

PagerDuty, Opsgenie y Grafana Oncall son las opciones mas comunes. Todas soportan: rotaciones automaticas, escalamiento por tiempo, reglas de enrutamiento por severidad, y integraciones con Slack/Teams. Elige segun tu stack existente: PagerDuty para ecosistema amplio, Opsgenie si usas Atlassian, Grafana Oncall si ya tienes Grafana.

Configura integraciones con tu herramienta de tickets (JIRA, Linear) para crear tickets automaticamente cuando se resuelve un incidente, asegurando que las acciones post-incidente no se pierdan.

Revisa y actualiza la politica trimestralmente con feedback del equipo de guardia.