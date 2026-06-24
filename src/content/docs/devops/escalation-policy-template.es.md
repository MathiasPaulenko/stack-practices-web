---
contentType: docs
slug: escalation-policy-template
title: "Plantilla de Política de Escalamiento"
description: "Una plantilla para definir niveles de severidad de incidentes y rutas de escalamiento de guardia."
metaDescription: "Define niveles de severidad, rutas de escalamiento y SLAs de respuesta para tu equipo de guardia."
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
  metaDescription: "Define niveles de severidad, rutas de escalamiento y SLAs de respuesta para tu equipo de guardia."
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
| SEV 2 | Mayor | Característica principal rota; degradación significativa de rendimiento | 15 min | 8 horas |
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

## Variantes

| Tamaño de Organización | Profundidad de Escalamiento | Diferencia Clave |
|------------------------|----------------------------|------------------|
| Startup (< 20 ingenieros) | L1 → L2 (founder/CTO) | Plano; el CTO suele ser L2 |
| Mediano (20–100) | L1 → L2 → L3 | Los líderes de equipo son la capa crítica |
| Empresa (100+) | L1 → L2 → L3 → L4 | VP/CTO solo para SEV 1 de varias horas |
| SaaS 24/7 | Agregar L0 — NOC / SRE de guardia | El NOC triaje antes de que ingeniería reciba páginas |
| Follow-the-sun | Transferencias regionales de L1 | APAC → EMEA → AMER rotación |

## Mejores Prácticas

1. Imprime la matriz de escalamiento y publícala en el tema del canal de Slack de guardia
2. Usa los mismos criterios de severidad en todos los equipos; definiciones inconsistentes causan confusión
3. Prueba la ruta de escalamiento trimestralmente con una página sintética; los números de teléfono caducan
4. Define "sin progreso significativo" explícitamente (por ejemplo, "sin hipótesis de causa raíz en 10 minutos")
5. Documenta métodos de contacto fuera de horario por separado; no confíes en DMs de Slack a las 3 a.m.

## Errores Comunes

1. Hacer el escalamiento opcional o culturalmente desalentado ("no despiertes al manager")
2. No definir contactos de backup; el principal de guardia puede estar dormido, enfermo o en un avión
3. Usar severidad como medida de esfuerzo en lugar de impacto
4. Omitir la actualización de la página de estado porque "se arreglará pronto"
5. No revisar decisiones de escalamiento después de incidentes; los patrones revelan brechas de entrenamiento

## Preguntas Frecuentes

### ¿Qué pasa si el ingeniero de guardia no puede clasificar la severidad inmediatamente?

Comienza con la severidad más alta razonable. Siempre es más fácil bajar que subir. Si no estás seguro entre SEV 1 y SEV 2, trátalo como SEV 1 por los primeros 15 minutos. Reclasifica cuando tengas suficientes datos. Documenta la reclasificación y su justificación en el hilo del incidente.

### ¿Debería la misma persona estar de guardia para múltiples servicios?

Evítalo si es posible. El cambio de contexto entre servicios no relacionados durante una interrupción reduce la efectividad. Si es inevitable por tamaño del equipo, asegúrate de que el runbook para cada servicio sea extremadamente detallado y que el sistema de paging incluya el nombre del servicio en la alerta. La política de escalamiento debe aplicarse por servicio, no por persona.

### ¿Cómo manejo a un ingeniero de guardia que no responde?

La política debe especificar un tiempo de espera para no respuesta (por ejemplo, 5 minutos para SEV 1, 10 minutos para SEV 2). Después de ese tiempo, el sistema de paging escala automáticamente al backup de guardia, luego al líder de equipo. No dejes que "quizás está en la ducha" se convierta en una demora de 30 minutos. Automatiza esto en PagerDuty, Opsgenie o tu herramienta de paging.
