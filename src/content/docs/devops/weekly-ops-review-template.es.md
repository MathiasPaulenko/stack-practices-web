---
contentType: docs
slug: weekly-ops-review-template
title: "Plantilla de Revisión Semanal de Operaciones"
description: "Plantilla para resumir incidentes, costos, rendimiento y acciones en revisiones semanales de operaciones."
metaDescription: "Usa esta plantilla de revisión semanal de operaciones para resumir incidentes, costos en la nube, métricas de rendimiento y acciones para tu equipo de operaciones."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - weekly
  - review
  - operations
  - incident
  - cost
  - performance
  - template
relatedResources:
  - /docs/performance-regression-template
  - /docs/bug-triage-template
  - /docs/change-management-template
  - /docs/cloud-cost-allocation-template
  - /docs/downtime-communication-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de revisión semanal de operaciones para resumir incidentes, costos en la nube, métricas de rendimiento y acciones para tu equipo de operaciones."
  keywords:
    - devops
    - weekly
    - review
    - operations
    - incident
    - cost
    - performance
    - template
---
## Visión General

Las revisiones de operaciones son donde los equipos detectan tendencias antes de que se conviertan en incidentes. Una revisión semanal de incidentes, costos y rendimiento transforma alertas dispersas en patrones accionables. Sin estructura, las revisiones de operaciones se convierten en sesiones de quejas o actualizaciones de estado que nadie lee. Esta plantilla crea un formato repetible: qué pasó, qué costó, qué está en tendencia y qué vamos a hacer al respecto.

## Cuándo Usar

Usa este recurso cuando:
- Tu equipo está reaccionando a incidentes pero nunca analiza patrones
- Los costos en la nube aumentan silenciosamente sin explicación
- Estás estableciendo una práctica de SRE o ingeniería de plataforma y necesitas una cadencia de revisión regular

## Solución

```markdown
# Revisión Semanal de Operaciones: `<Semana del AAAA-MM-DD>`

## 1. Resumen Ejecutivo

| Métrica | Esta Semana | Semana Pasada | Tendencia | Objetivo |
|---------|-------------|---------------|-----------|----------|
| Incidentes | `X` | `Y` | ↑ / ↓ / → | `< 3` |
| SEV 1–2 | `X` | `Y` | ↑ / ↓ / → | `0` |
| MTTR (promedio) | `X min` | `Y min` | ↑ / ↓ / → | `< 30 min` |
| Costo en la Nube | `$X` | `$Y` | ↑ / ↓ / → | `< $Z` |
| Presupuesto de Error Restante | `X%` | `Y%` | ↑ / ↓ / → | `> 50%` |

**Narrativa:** `Un párrafo resumiendo la semana: mayor problema, mayor éxito, mayor riesgo.`

## 2. Revisión de Incidentes

| ID | Severidad | Servicio | Causa Raíz | MTTR | Acción | Responsable | Estado |
|----|-----------|----------|------------|------|--------|-------------|--------|
| INC-### | SEV 1/2/3 | `servicio` | `causa` | `X min` | `acción` | `@nombre` | Abierto / Cerrado |

### Temas Recurrentes

- `Tema 1: descripción y frecuencia`
- `Tema 2: descripción y frecuencia`

### Seguimiento de la Semana Pasada

- [ ] `Acción 1` — `@responsable` — `estado`
- [ ] `Acción 2` — `@responsable` — `estado`

## 3. Análisis de Costos

| Categoría | Esta Semana | Semana Pasada | Delta | Presupuesto | Variación |
|-----------|-------------|---------------|-------|-------------|-----------|
| Compute (EC2 / GCE) | `$X` | `$Y` | `+/- Z%` | `$B` | `+/- V%` |
| Almacenamiento | `$X` | `$Y` | `+/- Z%` | `$B` | `+/- V%` |
| Transferencia de Datos | `$X` | `$Y` | `+/- Z%` | `$B` | `+/- V%` |
| Servicios Administrados | `$X` | `$Y` | `+/- Z%` | `$B` | `+/- V%` |
| **Total** | `$X` | `$Y` | `+/- Z%` | `$B` | `+/- V%` |

### Drivers de Costo

- `Driver 1: descripción`
- `Driver 2: descripción`

### Acciones de Costo

| Acción | Ahorro Proyectado | Responsable | Fecha Límite |
|--------|-------------------|-------------|--------------|
| | | | |

## 4. Rendimiento y Confiabilidad

| Servicio | Disponibilidad | Latencia P99 | Tasa de Error | Saturación | Estado |
|----------|----------------|--------------|---------------|------------|--------|
| `API` | `X%` | `Y ms` | `Z%` | `W%` | ✅ / ⚠️ / ❌ |
| `Web` | `X%` | `Y ms` | `Z%` | `W%` | ✅ / ⚠️ / ❌ |
| `Worker` | `X%` | `Y ms` | `Z%` | `W%` | ✅ / ⚠️ / ❌ |

### Violaciones de SLO

| Servicio | SLO | Actual | Impacto en Presupuesto | Acción |
|----------|-----|--------|------------------------|--------|
| | | | | |

## 5. Acciones para la Próxima Semana

| Prioridad | Acción | Responsable | ETA | Criterio de Éxito |
|-----------|--------|-------------|-----|-------------------|
| P0 | | | | |
| P1 | | | | |
| P2 | | | | |

## 6. Riesgos y Escalamientos

| Riesgo | Probabilidad | Impacto | Mitigación | Escalamiento |
|--------|--------------|---------|------------|--------------|
| | | | | |
```

## Explicación

La plantilla separa **datos** de **narrativa**. Las tablas fuerzan una revisión cuantitativa; la sección narrativa explica qué significan los números. Muchos equipos omiten el análisis de costos hasta que la factura sorprende a finanzas. Incluir costos semanalmente construye consciencia de costos en la cultura de ingeniería. La sección de temas recurrentes es donde detectas problemas sistémicos: tres incidentes relacionados con memoria en tres semanas significa un patrón, no mala suerte.

## Variantes

| Contexto | Enfoque | Cadencia |
|----------|---------|----------|
| Startup (< 20 personas) | Incidentes + costos solo; omitir tablas SLO | Semanal, 15 min |
| Scale-up (20–100) | Plantilla completa; asignar responsables de acciones | Semanal, 30 min |
| Enterprise (100+) | Revisiones por servicio; agregación mensual | Semanal por equipo, mensual cross-team |
| Equipo de Plataforma / SRE | Enfoque en infraestructura compartida y salud de tenants | Semanal, 45 min |
| Organización consciente de costos | Expandir sección de costos; incluir costo por feature | Semanal, 30 min |

## Mejores Prácticas

1. Mantén la revisión bajo 30 minutos; reuniones largas matan el engagement
2. Asigna responsables a cada acción en la reunión, no después
3. Revisa primero las acciones de la semana pasada; la rendición de cuentas refuerza el hábito
4. Usa números reales, no anécdotas; "se siente lento" no es accionable
5. Documenta riesgos antes de que se conviertan en incidentes; escalar temprano previene incendios

## Errores Comunes

1. Convertir la revisión en una sesión de culpas; enfócate en sistemas, no en personas
2. Omitir el análisis de costos hasta que finanzas se queje; los costos aumentan silenciosamente
3. No revisar acciones de semanas anteriores; esto hace inútil la reunión
4. Permitir que "no hubo incidentes esta semana" signifique "no hay nada que discutir"; siempre revisa tendencias
5. No escalar riesgos temprano; esperar a que un riesgo se convierta en incidente desperdicia la revisión

## Preguntas Frecuentes

### ¿Quién debería asistir a la revisión de operaciones?

Líderes de ingeniería, representantes de guardia y un stakeholder de producto o negocio. El líder de SRE o plataforma dirige la reunión. Los contribuidores individuales asisten cuando se discute su servicio. Mantén el grupo pequeño: máximo 6–8 personas. Grupos más grandes convierten la reunión en un reporte de estado que nadie asume.

### ¿Qué pasa si no hubo incidentes esta semana?

Celebra brevemente, luego investiga más profundo. Revisa tendencias de costos, degradación de rendimiento y riesgos próximos. Una semana tranquila es una oportunidad para pagar deuda técnica o ajustar SLOs. Nunca canceles la revisión porque "no pasó nada"; la consistencia construye el hábito que detecta problemas temprano.

### ¿Cómo hago que los ingenieros se preocupen por los costos?

Muestra costo por feature o por cliente, no solo gasto total. Los ingenieros se relacionan con la eficiencia. Si la Feature X cuesta $0.05 por usuario por mes y la Feature Y cuesta $2.00, esa comparación impulsa la optimización. También, comparte logros de ahorro de costos como victorias de ingeniería; reducir desperdicio es tan valioso como entregar código.
