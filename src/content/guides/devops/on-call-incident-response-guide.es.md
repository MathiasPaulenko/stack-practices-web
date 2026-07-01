---
contentType: guides
slug: on-call-incident-response-guide
title: "Playbook de Guardias e Incidentes (On-Call)"
description: "Playbook práctico para ingenieros on-call: triage, escalamiento, comunicación y postmortems. Reduce el MTTR y construye una cultura de respuesta a incidentes resiliente."
metaDescription: "Playbook de guardias e incidentes: triage, escalamiento, comunicación, postmortems. Reduce MTTR y construye una cultura de respuesta a incidentes resiliente."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - guia
  - mttr
  - observabilidad
  - on-call
  - postmortem
  - respuesta-a-incidentes
relatedResources:
  - /guides/devops/docker-for-developers-guide
  - /guides/security/web-application-security-guide
  - /guides/devops/technical-documentation-strategy-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Playbook de guardias e incidentes: triage, escalamiento, comunicación, postmortems. Reduce MTTR y construye una cultura de respuesta a incidentes resiliente."
  keywords:
    - on call playbook
    - proceso respuesta a incidentes
    - ingenieria de confiabilidad
    - reducir mttr
    - plantilla postmortem
---

# Playbook de Guardias e Incidentes (On-Call)

## Introducción

Los incidentes son inevitables. Lo que separa a los equipos resilientes de los frágiles no es la ausencia de fallos, sino la velocidad y calidad de su respuesta. Este playbook proporciona un enfoque estructurado para manejar incidentes en producción — desde la primera alerta hasta el postmortem.

## Ciclo de Vida de la Respuesta a Incidentes

```
Detectar → Triage → Mitigar → Resolver → Postmortem
   ↑                                           │
   └────────── Monitorear y Comunicar ─────────┘
```

## 1. Detección

### Principios de Alertamiento

| Alerta | Por Qué Importa | Umbral |
|--------|-----------------|--------|
| **Pico de tasa de error** | Los usuarios ven fallos | > 0.1% de requests por 2 minutos |
| **Latencia p99** | Experiencia de usuario degradada | > 500ms por 5 minutos |
| **Saturación** | Agotamiento de recursos acercándose | CPU > 80%, memoria > 85%, disco > 90% |
| **Falla de dependencia** | Servicio downstream caído | Health check falla 3 veces |

### La Fatiga de Alertas Es Real

Si una alerta suena y el ingeniero on-call no toma acción, no es una alerta — es ruido. Elimina o degrada alertas con tasa de falsos positivos > 80%.

## 2. Triage

### Checklist del Primer Minuto

Cuando te paginan, responde estas preguntas en orden:

1. **¿Qué está fallando?** — nombre del servicio, endpoint, región
2. **¿Quién se ve afectado?** — todos los usuarios, un subconjunto, solo internos?
3. **¿Cuándo empezó?** — hora exacta del primer fallo (revisa logs de deploy)
4. **¿Qué cambió?** — algún deploy, cambio de config o shift de dependencia?
5. **¿Está empeorando?** — tendencia de tasa de error en el tiempo

### Niveles de Severidad

| Severidad | Definición | Tiempo de Respuesta | Ejemplo |
|-----------|-----------|---------------------|---------|
| **SEV-1** | Outage completo o pérdida de datos | 15 minutos | Sistema de pagos caído para todos |
| **SEV-2** | Funcionalidad mayor degradada | 30 minutos | Búsqueda devuelve vacío para 50% |
| **SEV-3** | Impacto menor o workaround existe | 2 horas | Dashboard admin lento, API rápido |
| **SEV-4** | Sin impacto a usuarios, riesgo potencial | Próximo día hábil | Pico de logs, sin errores aún |

## 3. Mitigación

### Detén la Sangría Primero

Tu primer objetivo no es arreglar la causa raíz — es restaurar el servicio. Prefiere rollback sobre forward-fix durante un incidente.

```bash
# Rollback de un deploy malo
kubectl rollout undo deployment/api-service

# Activar un kill switch de feature flag
curl -X POST "https://config-service/flags/checkout-v2" \
  -d '{"enabled": false}'

# Escalar horizontalmente para absorber carga
kubectl scale deployment/api-service --replicas=20
```

### Tácticas Comunes de Mitigación

| Problema | Mitigación Rápida |
|----------|-----------------|
| Deploy malo | Rollback a última versión buena |
| Pico de tráfico | Escalar horizontalmente, activar [rate limiting](/recipes/api/rate-limiting) |
| Falla de dependencia | Activar [circuit breaker](/recipes/circuit-breaker-pattern-recipe), servir cache viejo |
| Sobrecarga de base de datos | Matar queries lentas, agregar [réplicas de lectura](/guides/databases/database-design-guide) |
| Error de configuración | [Revertir config](/guides/devops/infrastructure-as-code-guide), reiniciar con valores previos |

## 4. Comunicación

### Actualizaciones de Estado Internas

Publica en tu canal de incidentes cada 10 minutos:

```
[SEV-2] Latencia de checkout elevada
- Inicio: 14:32 UTC
- Impacto: ~30% de requests de checkout timeout
- Causa: pool de conexiones a base de datos agotado tras deploy v2.4.1
- Mitigación: rollback a v2.4.0 a las 14:45, monitoreando recuperación
- ETA: 15:00 UTC si la tendencia se mantiene
- Comandante: @alice
```

### Comunicación Externa

| Severidad | ¿Notificar Externamente? | Quién |
|-----------|--------------------------|-------|
| SEV-1 | Sí, inmediato | Soporte + página de estado |
| SEV-2 | Sí, si > 30 min | Soporte + página de estado |
| SEV-3 | No, a menos que pregunte | Solo interno |
| SEV-4 | No | Solo interno |

### Reglas de Comunicación Sin Culpa

- No nombres individuos como causas
- No uses "error humano" como causa raíz
- Enfócate en qué pasó, qué se hizo, y qué sigue

## 5. Resolución

### Definición de Resuelto

Un incidente se considera resuelto cuando:
- Las tasas de error vuelven a línea base por 10 minutos
- Todas las mitigaciones son estables
- No aparecen nuevos síntomas
- El comandante de incidente declara "todo claro"

### Después del Todo Claro

1. Detén el reloj (registra duración total del incidente)
2. Agenda postmortem dentro de 24 horas para SEV-1/2
3. Crea tickets de seguimiento con dueños y fechas límite. Actualiza [CI/CD](/guides/devops/cicd-pipeline-guide) si es necesario.
4. Actualiza runbooks con lo aprendido

## 6. Postmortem

### Los Cinco Por Qué

Pregunta "por qué" recursivamente hasta llegar a un problema sistémico, no a un síntoma.

```
Problema: La API de pagos devolvió 500 por 20 minutos.

¿Por qué? → El pool de conexiones a base de datos se agotó.
¿Por qué? → v2.4.1 aumentó el pool por defecto pero olvidó cerrar conexiones en retry.
¿Por qué? → El cambio no fue probado bajo carga.
¿Por qué? → Los tests de carga no cubren el flujo de checkout.
¿Por qué? → Los escenarios de carga no se actualizaron en 6 meses.

Acción: Agregar flujo de checkout a [tests de carga](/recipes/performance/load-testing-k6) semanales; requerir pase de carga en [CI](/guides/devops/cicd-pipeline-guide).
```

### Plantilla de Postmortem

```markdown
# Postmortem: [Nombre del Incidente] ([SEV-X])

## Resumen
- Fecha: 2024-06-12
- Duración: 23 minutos
- Impacto: 12% de intentos de checkout fallidos

## Línea de Tiempo
- 14:32 — Primera alerta: spike de tasa de error en /api/checkout
- 14:35 — On-call reconoció
- 14:40 — Identificado agotamiento de pool de conexiones
- 14:45 — Rollback a v2.4.0
- 14:55 — Tasas de error volvieron a línea base

## Causa Raíz
v2.4.1 introdujo un loop de retry que filtraba conexiones a base de datos.

## Lo Que Salió Bien
- Rollback completado en menos de 5 minutos
- El monitoreo apuntó claramente al agotamiento del pool

## Lo Que Salió Mal
- Los tests de carga no cubrían la nueva lógica de retry
- No había detección de filtrado de conexiones en staging

## Acciones
| Acción | Dueño | Fecha Límite |
|--------|-------|-------------|
| Agregar flujo de checkout a tests de carga | @bob | 2024-06-19 |
| Agregar alerta de filtrado de conexiones | @alice | 2024-06-15 |
```

## Lo que funciona

- **Rota on-call de forma justa** — nadie debería estar on-call más de 1 semana en 4
- **Compensa por horas extras** — paga extra o da tiempo libre compensatorio
- **Shadow on-call** — nuevos ingenieros hacen shadow por 2-4 semanas antes de recibir el pager
- **Automatiza runbooks** — si un paso del runbook es manual, agrégalo al backlog de automatización
- **Revisa alertas trimestralmente** — elimina ruido, ajusta umbrales, arregla alertas intermitentes

## Errores Comunes

- Saltarse postmortems porque "estamos muy ocupados"
- Culpar individuos en lugar de arreglar sistemas
- Forward-fixear durante un incidente en lugar de hacer rollback
- Comunicar demasiado tarde a clientes
- No tener on-call secundario para escalamiento
- Mantener la misma persona on-call por semanas

## Preguntas Frecuentes

### ¿Qué pasa si no sé cómo arreglar el problema?

Esperado. Tu trabajo es contener el impacto y encontrar a la persona correcta — no saber cada sistema. Escalá temprano y claramente. Una escalación de 5 minutos es mejor que 30 minutos solo.

### ¿Cómo balanceo respuesta a incidentes con trabajo de funcionalidades?

Los incidentes son trabajo no planificado. Rastrealos. Si un equipo gasta > 20% de capacidad de sprint en incidentes, es una señal de invertir en confiabilidad (tests, automatización, refactor) en lugar de nuevas capacidades.

### ¿Deberían los ingenieros juniors estar on-call?

Sí, con mentoría. Hacer shadow de ingenieros senior durante incidentes es una de las formas más rápidas de aprender cómo fallan los sistemas. Empieza con rotaciones de baja severidad y páralos con un senior el primer mes.
