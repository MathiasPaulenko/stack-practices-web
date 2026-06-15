---
contentType: docs
slug: runbook-template
templateType: runbook
title: "Plantilla de Runbook"
description: "Una plantilla reutilizable para runbooks operacionales: respuesta a incidentes, procedimientos de deployment y tareas rutinarias."
metaDescription: "Usa esta plantilla de runbook para documentar procedimientos operacionales, playbooks de respuesta a incidentes y tareas de mantenimiento rutinarias."
difficulty: beginner
topics:
  - devops
tags:
  - runbook
  - template
  - operaciones
  - sre
  - incident-response
  - devops
relatedResources:
  - /docs/templates/readme-template
  - /recipes/devops/github-actions
  - /guides/testing/testing-strategy-guide
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usa esta plantilla de runbook para documentar procedimientos operacionales, playbooks de respuesta a incidentes y tareas de mantenimiento rutinarias."
  keywords:
    - runbook template
    - procedimientos operacionales
    - respuesta a incidentes
    - sre playbook
    - tareas de mantenimiento
---

## Estructura de la plantilla

Usa esta plantilla para documentar cualquier procedimiento operacional que tu equipo necesite ejecutar.

---

## Runbook: [Nombre del procedimiento]

### Metadatos

| Campo | Valor |
| ----- | ----- |
| **Responsable** | @team o @person |
| **Severidad** | P1 / P2 / P3 |
| **Frecuencia** | Bajo demanda / Diario / Semanal |
| **Última actualización** | YYYY-MM-DD |

### Propósito

Descripción en una oración de qué logra este runbook y cuándo usarlo.

### Prerrequisitos

- [ ] Acceso a [sistema/herramienta]
- [ ] Permisos: [roles requeridos]
- [ ] Alertas/monitoreo: [dashboards relevantes]

### Procedimiento

#### Paso 1: [Acción]

```bash
# Comando o script a ejecutar
```

**Resultado esperado**: Describe cómo se ve el éxito.
**Rollback**: Cómo deshacer este paso si algo sale mal.

#### Paso 2: [Acción]

```bash
# Comando o script a ejecutar
```

**Resultado esperado**: Describe cómo se ve el éxito.

### Verificación

- [ ] Verificar que [métrica/endpoint] retorne [valor esperado]
- [ ] Confirmar que [log/alerta] muestre [patrón]
- [ ] Notificar a [stakeholder] que el procedimiento está completo

### Troubleshooting

| Síntoma | Causa | Solución |
| ------- | ----- | -------- |
| Error X | Y no está corriendo | Reiniciar Y con `command` |
| Timeout | Latencia de red | Reintentar después de 30s |

### Acciones post-incidente (si aplica)

- [ ] Actualizar página de estado
- [ ] Escribir retrospectiva del incidente
- [ ] Crear tickets de seguimiento
- [ ] Actualizar este runbook si el procedimiento cambió

### Escalamiento

Si este runbook no resuelve el problema dentro de [tiempo], escalar a:

- **L2**: @on-call-engineer
- **L3**: @engineering-manager
- **Externo**: [vendor support link/number]

---

## Mejores prácticas

- **Mantenlo corto**: Una página por procedimiento rutinario
- **Usa checkboxes**: Facilita seguirlo bajo presión
- **Incluye comandos**: Scripts listos para copiar y pegar
- **Prueba periódicamente**: Ejecuta los runbooks en períodos de calma
- **Control de versiones**: Guarda en `docs/runbooks/` con tu código

## Anti-patrones comunes

- Runbooks excesivamente largos que nadie lee durante incidentes
- Pasos de rollback faltantes
- Sin path de escalamiento definido
- Información de contacto desactualizada
- Asumir contexto que el lector no tiene

## Preguntas Frecuentes

### Cuál es la diferencia entre un runbook y un playbook?

Un runbook es un procedimiento paso a paso para una tarea operacional específica. Un playbook es una colección más amplia de estrategias y procedimientos para una categoría de incidentes o escenarios.

### Con qué frecuencia debería probar los runbooks?

Prueba los runbooks críticos trimestralmente durante períodos de calma. Actualiza los runbooks inmediatamente después de cualquier incidente donde el runbook se usó y se encontró deficiente o incorrecto.

### Los runbooks deberían incluir pasos de troubleshooting?

Sí. Incluye modos de falla comunes y sus síntomas. Agrega árboles de decisión o diagramas de flujo para procedimientos complejos. Cada runbook debería tener un path de escalamiento claro si el procedimiento no resuelve el issue.
