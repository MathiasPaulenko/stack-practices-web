---
contentType: guides
slug: incident-response-guide
title: "Respuesta a Incidentes — Manejo Estructurado de Interrupciones en Producción"
description: "Guía práctica sobre respuesta a incidentes: declarar incidentes, construir una estructura de comando de incidentes, protocolos de comunicación y reducir el tiempo medio de resolución con procesos estructurados."
metaDescription: "Aprende respuesta a incidentes: declaración, estructura de comando, protocolos de comunicación y reducción de MTTR con procesos estructurados."
difficulty: intermediate
topics:
  - observability
  - devops
  - security
tags:
  - incident-response
  - outage
  - mttr
  - communication
  - runbook
  - guide
relatedResources:
  - /guides/observability/alert-management-guide
  - /guides/observability/postmortem-guide
  - /guides/devops/sre-practices-guide
  - /guides/devops/chaos-engineering-guide
  - /guides/planning/disaster-recovery-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende respuesta a incidentes: declaración, estructura de comando, protocolos de comunicación y reducción de MTTR con procesos estructurados."
  keywords:
    - incident-response
    - outage
    - mttr
    - communication
    - runbook
    - guide
---

## Descripción General

La respuesta a incidentes es el proceso estructurado de reaccionar ante interrupciones de servicio no planificadas. Sin estructura, los incidentes devienen en caos: demasiada gente hablando, sin un responsable claro de decisiones, y comunicación confusa con stakeholders. Un proceso de respuesta definido reduce el tiempo medio de resolución (MTTR), minimiza el impacto al cliente y reduce el estrés de los respondedores.

Esta guía cubre declaración de incidentes, roles, comunicación y flujos de trabajo de resolución.

## Cuándo Usar

- Experimentas interrupciones de producción sin propiedad clara
- Múltiples ingenieros intervienen en incidentes sin coordinación
- La comunicación a stakeholders durante interrupciones es inconsistente o falta
- Tu MTTR está tendiendo al alza o excede tu SLO
- Quieres practicar y mejorar capacidades de respuesta proactivamente

## Conceptos Clave

| Concepto | Descripción |
|---------|-------------|
| **Incidente** | Una interrupción o degradación no planificada del servicio |
| **Comandante de Incidente (IC)** | Único tomador de decisiones que coordina la respuesta |
| **Severidad** | Clasificación de impacto (Sev1 = crítico, Sev4 = menor) |
| **MTTR** | Tiempo Medio de Resolución — tiempo promedio para arreglar |
| **Líder de Comunicación** | Persona responsable de actualizaciones a stakeholders |
| **Postmortem** | Revisión sin culpa tras la resolución del incidente |

## Clasificación de Severidad de Incidentes

| Severidad | Criterios | Respuesta | Comunicación |
|-----------|-----------|-----------|--------------|
| **Sev1** | Interrupción completa, ingresos detenidos, pérdida de datos | Todas las manos, sala de guerra | Notificación ejecutiva, página de estado, comunicación a clientes |
| **Sev2** | Degradación mayor, funcionalidad principal rota | Equipo de guardia + respaldo | Página de estado, canales internos |
| **Sev3** | Impacto parcial, workaround disponible | Guardia primario | Ticket interno, sin comunicación externa |
| **Sev4** | Problema menor, impacto mínimo al usuario | Mejor esfuerzo | Seguimiento en ticket, sin urgencia |

## Respuesta a Incidentes Paso a Paso

### 1. Detectar y Declarar

Reconoce cuándo una alerta se convierte en incidente:

```markdown
## Checklist de Declaración de Incidente

- [ ] Alerta recibida y reconocida
- [ ] Triage inicial confirma impacto a usuario
- [ ] Severidad evaluada (Sev1-4)
- [ ] Comandante de Incidente asignado
- [ ] Canal de incidente creado (e.g., #incident-2024-001)
- [ ] Página de estado actualizada (Sev1/Sev2)
- [ ] Stakeholders notificados (Sev1)
```

**Principios de declaración:**
- En caso de duda, declara. Bajar severidad es más fácil que recuperarse.
- Los incidentes Sev1 obtienen un Comandante de Incidente inmediatamente.
- Crea un canal dedicado para cada incidente Sev1/Sev2.
- Registra hora de inicio, disparador y evaluación inicial.

### 2. Asignar Roles

Roles claros previenen el caos:

| Rol | Responsabilidades | Requerido Para |
|-----|-------------------|---------------|
| **Comandante de Incidente** | Toma todas las decisiones, asigna tareas, controla alcance | Sev1, Sev2 |
| **Líder Técnico** | Investiga causa raíz, propone soluciones | Sev1, Sev2 |
| **Líder de Comunicación** | Escribe actualizaciones de estado, maneja comunicación a stakeholders | Sev1 |
| **Escriba** | Documenta timeline, acciones y decisiones | Sev1 |
| **Respondedor** | Ejecuta tareas asignadas por el IC | Todos |

```markdown
## Estructura de Comando de Incidente

                  Comandante de Incidente
                         │
         ┌──────────────┼──────────────┐
         │              │              │
    Líder         Líder de      Escriba
   Técnico        Comunicación
         │
    Responders
```

**Mejores prácticas de roles:**
- El IC no investiga directamente; coordina
- Solo el IC habla en nombre del equipo de incidentes a stakeholders
- Rota al IC si la persona actual lleva más de 2 horas
- El escriba marca con timestamp cada acción y decisión importante

### 3. Comunicar Efectivamente

La comunicación es tan importante como la respuesta técnica:

| Audiencia | Canal | Frecuencia | Contenido |
|-----------|-------|------------|-----------|
| **Equipo de respuesta** | Canal de incidente | Continuo | Estado, hipótesis, acciones |
| **Stakeholders internos** | #incidents o Slack | Cada 15-30 min (Sev1) | Impacto, ETA, lo que sabemos |
| **Ejecutivos** | Email/Slack DM | Cada 30-60 min (Sev1) | Impacto de negocio, plan de recuperación |
| **Clientes** | Página de estado | Cada 15-30 min (Sev1/2) | Qué está afectado, ETA, workarounds |

```markdown
## Plantilla de Actualización de Estado

**Incidente:** #incident-2024-001
**Severidad:** Sev1
**Inicio:** 14:30 UTC
**Estado:** [Investigando / Identificado / Monitoreando / Resuelto]

**Impacto:** [Qué está roto y quién está afectado]
**Lo que sabemos:** [Entendimiento actual de causa raíz]
**Lo que estamos haciendo:** [Pasos activos de remediación]
**ETA:** [Tiempo estimado de resolución o siguiente actualización]
**Workaround:** [Cualquier workaround disponible para usuarios]

Siguiente actualización: 15:00 UTC
```

**Principios de comunicación:**
- Promete menos y entrega más en las ETAs
- No especules sobre causa raíz hasta estar seguro
- Actualiza incluso si nada ha cambiado ("seguimos investigando")
- Cierra el ciclo: notifica cuando se resuelve, luego sigue con timeline de postmortem

### 4. Investigar y Mitigar

Respuesta técnica estructurada:

```markdown
## Pasos de Investigación

1. **Confirmar alcance:** ¿Qué está roto? ¿Para quién? ¿Desde cuándo?
2. **Identificar cambios:** ¿Qué se desplegó recientemente? ¿Cambios de configuración?
3. **Verificar dependencias:** ¿Los servicios downstream están saludables?
4. **Revisar logs y métricas:** Encuentra el primer error, el pico, la divergencia
5. **Formular hipótesis:** ¿Cuál es la causa más probable?
6. **Probar hipótesis:** ¿Puedes reproducir o validar la teoría?
7. **Implementar solución:** Rollback, cambio de config, escalar, parchear
8. **Verificar recuperación:** Confirma métricas regresan a normal, reportes de usuarios resueltos
```

**Estrategias de mitigación:**
| Estrategia | Cuándo Usar | Riesgo |
|------------|-------------|--------|
| **Rollback** | Despliegue reciente causó el problema | Bajo, si fue probado |
| **Desactivar feature flag** | Funcionalidad específica está rota | Muy bajo |
| **Escalar** | Agotamiento de capacidad | Bajo, pero puede ocultar causa raíz |
| **Circuit breaker** | Dependencia está fallando | Bajo, degrada funcionalidad |
| **Shift de tráfico** | Problema regional o de despliegue | Medio, requiere preparación |
| **Intervención manual** | Corrupción de datos, estado complejo | Alto, requiere expertise |

### 5. Resolver y Cerrar

Formaliza el fin de un incidente:

```markdown
## Checklist de Resolución

- [ ] Servicio completamente restaurado y verificado
- [ ] Monitoreo muestra verde por 15+ minutos
- [ ] Página de estado actualizada a "Resuelto"
- [ ] Comunicación final enviada a stakeholders
- [ ] Escriba tiene timeline completo documentado
- [ ] Postmortem agendado dentro de 48 horas
- [ ] Incidente cerrado formalmente en sistema de seguimiento
```

**Principios de resolución:**
- No cierres hasta tener confirmación del monitoreo
- Mantén el canal de incidente abierto por 24 horas para preguntas de seguimiento
- Agenda postmortem antes de que la memoria se desvanezca
- Rastrea MTTR y frecuencia de incidentes como métricas operativas

## Mejores Prácticas

- **Practica antes de necesitarlo.** Corre game days y ejercicios de chaos engineering.
- **Comienza con mitigación, no causa raíz.** Arregla el impacto al usuario primero; investiga después.
- **Un Comandante de Incidente.** La autoridad de decisión debe ser clara y singular.
- **Comunica temprano y a menudo.** El silencio durante un incidente crea pánico.
- **Documenta todo.** Las notas del escriba son la base del postmortem.
- **Aprende de cada incidente.** Si tienes el mismo incidente dos veces, tu proceso está roto.

## Errores Comunes

- **Sin IC claro.** Múltiples personas dando órdenes crea confusión y retraso.
- **Saltarse comunicación.** Los stakeholders hacen sus propias (usualmente erróneas) suposiciones.
- **Perseguir causa raíz antes de mitigar.** A los usuarios no les importa por qué falló; les importa que funcione.
- **Olvidar verificar.** Marcar resuelto muy temprano lleva a incidentes reabiertos.
- **Sin seguimiento.** Incidentes sin postmortems son oportunidades de aprendizaje desperdiciadas.

## Variantes

- **Respuesta a incidentes automatizada:** Runbooks de auto-remediación disparados por alertas
- **Respuesta follow-the-sun:** Equipos regionales transfieren incidentes entre zonas horarias
- **Incidentes de dependencia externa:** Escalamiento predefinido a vendors de terceros
- **Respuesta a incidentes de seguridad:** Playbook separado para brechas y exposición de datos

## FAQ

**P: ¿Cuándo debería declarar un incidente vs manejar como alerta normal?**
Declara cuando síntomas que impactan usuarios son confirmados y la respuesta estándar de alerta es insuficiente. En caso de duda, declara.

**P: ¿Quién debería ser Comandante de Incidente?**
El ingeniero senior más disponible que no esté depurando activamente. El IC coordina; no investiga.

**P: ¿Cómo corro un postmortem efectivo?**
Agéndalo dentro de 48 horas, enfócate en proceso y mejoras de sistemas, no en culpa. Ve la [Guía de Postmortems](/guides/observability/postmortem-guide).

**P: ¿Qué pasa si no podemos encontrar la causa raíz?**
Está bien. Documenta lo que sabes, lo que intentaste y qué monitorearás. Algunos incidentes permanecen parcialmente inexplicados.

## Conclusión

La respuesta a incidentes es un deporte de equipo con reglas claras. Al declarar temprano, asignar roles, comunicar sin descanso y enfocarse en mitigación antes que investigación, conviertes interrupciones caóticas en eventos estructurados y aprendibles.
