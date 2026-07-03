---
contentType: docs
slug: bug-report-template
templateType: bug-report
title: "Plantilla de Reporte de Bug"
description: "Plantilla estructurada de reporte de bugs para ayudar a equipos a reproducir, clasificar y resolver defectos más rápido con pasos claros y comportamiento esperado."
metaDescription: "Plantilla de reporte de bugs con pasos de reproducción, comportamiento esperado vs actual, detalles de entorno y severidad. Ayuda a tu equipo a arreglar bugs más rápido."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - issue-tracking
  - template
  - ci-cd
  - automation
relatedResources:
  - /guides/testing/test-driven-development-guide
  - /guides/devops/on-call-incident-response-guide
  - /docs/templates/feature-request-template
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Plantilla de reporte de bugs con pasos de reproducción, comportamiento esperado vs actual, detalles de entorno y severidad. Ayuda a tu equipo a arreglar bugs más rápido."
  keywords:
    - plantilla reporte bug
    - formato reporte issue
    - plantilla seguimiento defectos
    - pasos reproduccion template
    - reporte bug software
---

# Plantilla de Reporte de Bug

Usa esta plantilla para reportar bugs de manera que ayude a ingenieros a reproducirlos y corregirlos rápidamente.

## Plantilla

```markdown
# Reporte de Bug

## Resumen
Descripción de una oración del bug.

## Pasos para Reproducir
1. Ir a '...'
2. Hacer clic en '...'
3. Desplazarse hasta '...'
4. Observar el error

## Comportamiento Esperado
Lo que esperabas que sucediera.

## Comportamiento Actual
Lo que realmente sucedió. Incluye capturas de pantalla o mensajes de error.

## Entorno
- **SO:** [ej. macOS 14, Windows 11]
- **Navegador:** [ej. Chrome 120, Safari 17]
- **Versión de la app:** [ej. v2.4.1]
- **Ambiente:** [staging / producción / local]

## Severidad
- [ ] Crítico — pérdida de datos, brecha de seguridad, caída completa
- [ ] Alto — feature principal roto, workaround difícil
- [ ] Medio — feature degradado, workaround existe
- [ ] Bajo — problema cosmético, inconveniente menor

## Contexto Adicional
- Link a issue, PR, o [solicitud de feature](/docs/templates/feature-request-template) relacionado. Consulta [Test-Driven Development](/guides/testing/test-driven-development-guide) para escribir tests que reproduzcan bugs.
- Frecuencia de ocurrencia
- Cambios recientes que puedan estar relacionados
```

## Por Qué Funciona Esta Estructura

| Sección | Propósito |
|---------|-----------|
| **Resumen** | El lector decide la prioridad en 5 segundos |
| **Pasos de reproducción** | El ingeniero puede verificar el bug localmente |
| **Esperado vs actual** | Clarifica qué significa "arreglado" |
| **Entorno** | El bug puede ser específico de plataforma |
| **Severidad** | Ordenamiento de la cola de triage |

## Consejos para Quienes Reportan

- **Reprodúcelo dos veces** antes de reportar — los issues transitorios necesitan manejo diferente
- **Aísla los pasos** — elimina acciones no relacionadas del path de reproducción
- **Prueba en modo incógnito** — descarta extensiones del navegador
- **Revisa issues existentes primero** — los duplicados desperdician tiempo de triage

## Consejos para Equipos de Triage

- **Etiqueta inmediatamente** — `bug`, `frontend`, `backend`, `necesita-reproduccion`
- **Asigna en 24 horas** — los bugs sin asignar se deterioran
- **Solicita info faltante pronto** — usa la plantilla como checklist

## Preguntas Frecuentes

### ¿Qué pasa si no puedo reproducir el bug consistentemente?

Aún así archiva el reporte. Marca la frecuencia como "intermitente" e incluye timestamps, logs y patrones que hayas notado (ej. "solo ocurre después de 10 minutos de inactividad").

### ¿Los clientes deberían usar esta plantilla también?

Sí, pero simplifícala. Los clientes reciben un formulario con Resumen, Pasos y Entorno únicamente. Los equipos internos reciben la plantilla completa con severidad y contexto.

### ¿Cómo manejo bugs de "en mi máquina funciona"?

Agrega verificaciones de paridad de entorno: [Docker](/recipes/devops/docker-compose-local-dev), versiones exactas de dependencias, y datos de prueba. Consulta [Integration Testing](/recipes/testing/integration-testing-strategies) para verificar fixes en diferentes entornos. Si solo ocurre en producción, el bug está en los datos o la configuración, no en el código.
