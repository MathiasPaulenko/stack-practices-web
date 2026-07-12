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
  - /docs/readme-template
  - /recipes/github-actions
  - /guides/testing-strategy-guide
  - /docs/dependency-upgrade-template
  - /docs/backup-verification-test-template
  - /docs/bug-triage-template
  - /docs/change-management-template
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

Usa esta plantilla para documentar cualquier procedimiento operacional que tu equipo necesite ejecutar. Consulta la [Guía de Respuesta a Incidentes On-Call](/guides/devops/on-call-incident-response-guide) para cultura de respuesta más amplia.

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
- [ ] Escribir [postmortem del incidente](/docs/templates/incident-postmortem-template)
- [ ] Crear tickets de seguimiento
- [ ] Actualizar este runbook si el procedimiento cambió

### Escalamiento

Si este runbook no resuelve el problema dentro de [tiempo], escalar a:

- **L2**: @on-call-engineer
- **L3**: @engineering-manager
- **Externo**: [vendor support link/number]

---

## Lo que funciona

- **Mantenlo corto**: Una página por procedimiento rutinario
- **Usa checkboxes**: Facilita seguirlo bajo presión
- **Incluye comandos**: Scripts listos para copiar y pegar
- **Prueba periódicamente**: Ejecuta los runbooks en períodos de calma. Consulta la [Plantilla de Plan de Recuperación ante Desastres](/docs/templates/disaster-recovery-plan-template) para planificación de drills.
- **Control de versiones**: Guarda en `docs/runbooks/` con tu código

## Anti-patrones comunes

- Runbooks excesivamente largos que nadie lee durante incidentes
- Pasos de rollback faltantes. Consulta la [Plantilla de Runbook de Migración de BD](/docs/templates/database-migration-runbook-template) para patrones de rollback.
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


## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Servicio sin estado | Simplificar seccion de estado | No hay estado que preservar |
| Base de datos | Agregar procedimientos de backup/restore | Incluir comandos especificos |
| Cola/mensajeria | Agregar procedimientos de DLQ y reprocess | Manejar mensajes atascados |
| Cron job | Agregar procedimientos de re-ejecucion | Incluir dependencias temporales |

## Ejemplo de Runbook: Alta CPU en payment-service

```text
=== Runbook: Alta CPU en payment-service ===

Alerta: PaymentServiceHighCPU
Severidad: Warning
Condicion: CPU > 80% por 5 minutos

Sintomas:
  - Latencia de pagos aumenta
  - Cola de requests crece
  - Errores 5xx pueden aparecer

Pasos de Diagnostico:
  1. Verificar trafico actual:
     kubectl top pods -n production -l app=payment
     -> Si un pod tiene CPU significativamente mayor, puede ser un hot spot

  2. Verificar errores:
     kubectl logs -n production -l app=payment --tail=100 | grep ERROR
     -> Errores en bucle pueden causar alto CPU

  3. Verificar conexiones de DB:
     kubectl exec -n production payment-db-0 -- psql -c "SELECT count(*) FROM pg_stat_activity"
     -> Pool agotado causa retries que consumen CPU

  4. Verificar garbage collection:
     kubectl logs -n production -l app=payment --tail=200 | grep "GC"
     -> GC frecuente indica memory pressure que causa CPU usage

Acciones de Mitigacion:
  A. Si es un hot spot (un pod):
     kubectl scale deployment payment -n production --replicas=+2
     -> Agregar pods para distribuir carga

  B. Si es un bucle de errores:
     Identificar el error y revertir el deploy responsable
     kubectl rollout undo deployment payment -n production

  C. Si es pool de DB agotado:
     Aumentar pool max en configuracion
     kubectl patch configmap payment-config -n production --patch '{"data":{"DB_POOL_MAX":"200"}}'
     kubectl rollout restart deployment payment -n production

  D. Si es GC pressure:
     Aumentar memoria del pod
     kubectl patch deployment payment -n production -p '{"spec":{"template":{"spec":{"containers":[{"name":"payment","resources":{"limits":{"memory":"2Gi"}}}]}}}}'

Verificacion Post-Mitigacion:
  - CPU baja a < 60% en 10 minutos
  - Latencia p95 vuelve a < 500ms
  - No hay errores 5xx nuevos
  - Confirmar con dashboard de Grafana

Escalacion:
  - Si no se resuelve en 30 min: escalar a SRE on-call
  - Si hay impacto en clientes: declarar incidente SEV2
  - Si es horario laboral: contactar al owner del servicio (Team Payments)

Postmortem:
  - Crear postmortem si el impacto fue > 15 min de degradacion
  - Identificar causa raiz y crear action items
```

### Como mantenemos los runbooks actualizados?

Los runbooks obsoletos son peores que no tener runbooks — enganan durante incidentes. Para mantenerlos actualizados: revisa cada runbook despues de cada incidente que lo uso — si un paso fallo, actualizalo. Programa revision trimestral de todos los runbooks. Asigna un dueno a cada runbook (usualmente el equipo que posee el servicio). Versiona los runbooks en el mismo repo que el codigo — los PRs de codigo que cambian el comportamiento del servicio deben actualizar el runbook. Usa un lint de runbooks que verifique que los comandos referenciados existen. Marca runbooks con fecha de ultima revision — los mayores a 6 meses se marcan como "posiblemente obsoletos".

### Que hace un buen runbook?

Un buen runbook es accionable, no explicativo. El ingeniero on-call deberia poder seguirlo paso a paso sin conocimiento previo del servicio. Incluye comandos exactos (copy-paste, no "ejecuta el comando apropiado"). Incluye que buscar en cada paso (no solo "verifica los logs" sino "busca ERROR en los ultimos 100 logs"). Incluye acciones de mitigacion para cada diagnostico (no solo "identifica el problema" sino "si es X, haz Y"). Incluye criterios de escalacion (cuando escalar, a quien). Incluye verificacion post-mitigacion (como confirmar que el problema esta resuelto). Un runbook de 2 paginas que se puede seguir bajo presion es mejor que un documento de 20 paginas que nadie lee.

### Como probamos que los runbooks funcionan?

Prueba los runbooks durante game days: simula la alerta y sigue el runbook paso a paso. Si un paso falla o es confuso, actualiza el runbook. Usa chaos engineering para inyectar el problema real y verificar que el runbook lo resuelve. Pide a ingenieros que no son del equipo que sigan el runbook — si no pueden, el runbook necesita mas detalle. Ejecuta los comandos del runbook en un entorno de staging para verificar que funcionan. Documenta los resultados de las pruebas de runbooks. Un runbook no probado es una esperanza, no una herramienta.












































































End of document. Review and update quarterly.