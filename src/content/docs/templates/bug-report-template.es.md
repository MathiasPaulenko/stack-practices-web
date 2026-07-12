---





contentType: docs
slug: bug-report-template
templateType: bug-report
title: "Plantilla de Reporte de Bug"
description: "Plantilla estructurada de reporte de bugs para ayudar a equipos a reproducir, clasificar y resolver defectos más rápido con pasos claros y comportamiento esperado."
metaDescription: "Plantilla de reporte de bugs con pasos de reproducción, comportamiento esperado vs actual, detalles de entorno y severidad. Ayuda a arreglar bugs más rápido."
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
  - /guides/test-driven-development-guide
  - /guides/on-call-incident-response-guide
  - /docs/feature-request-template
  - /docs/environment-setup-guide-template
  - /docs/slo-document-template
  - /recipes/chaos-engineering
  - /recipes/pre-commit-hooks
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Plantilla de reporte de bugs con pasos de reproducción, comportamiento esperado vs actual, detalles de entorno y severidad. Ayuda a arreglar bugs más rápido."
  keywords:
    - plantilla reporte bug
    - formato reporte issue
    - plantilla seguimiento defectos
    - pasos reproduccion template
    - reporte bug software





---

# Plantilla de Reporte de Bug

Usa esta plantilla para reportar bugs de manera que ayude a ingenieros a reproducirlos y corregirlos rápidamente.

## Resumen

Un buen reporte de bug le da a ingenieros todo lo que necesitan para reproducir el issue en una sola lectura. Un mal reporte de bug genera un ida y vuelta que desperdicia horas. La diferencia es estructura: pasos claros, comportamiento esperado vs actual, y detalles del entorno.

Esta plantilla cubre:

1. **Pasos de reproducción** — numerados, aislados, testeables
2. **Comportamiento esperado vs actual** — define qué significa "arreglado"
3. **Detalles del entorno** — SO, navegador, versión, ambiente
4. **Clasificación de severidad** — evaluación de impacto estandarizada
5. **Ciclo de vida del bug** — de reporte a resolución

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

## Ejemplo Completo

```markdown
# Reporte de Bug: Export CSV descarga archivo vacío cuando el rango de fechas cruza meses

## Resumen
Exportar datos de analytics como CSV produce un archivo vacío cuando el rango de fechas
seleccionado cruza un límite de mes (ej. 28 de marzo a 3 de abril).

## Pasos para Reproducir
1. Navegar a /analytics/dashboard
2. Seleccionar rango de fechas: 2026-03-28 a 2026-04-03
3. Hacer clic en "Export CSV" en el gráfico "Revenue by Day"
4. Abrir el archivo descargado

## Comportamiento Esperado
Archivo CSV contiene 7 filas de datos (una por día) con columnas: date, revenue, orders.

## Comportamiento Actual
Archivo CSV descarga con headers únicamente (date, revenue, orders) y cero filas de datos.
No aparece mensaje de error en la UI. La consola no muestra errores.

## Entorno
- **SO:** macOS 14.4
- **Navegador:** Chrome 126.0
- **Versión de la app:** v2.4.1
- **Ambiente:** producción

## Severidad
- [x] Alto — feature de exportación roto para un caso de uso común, sin workaround

## Contexto Adicional
- Ocurre consistentemente cuando el rango cruza cualquier límite de mes
- Funciona bien para rangos de un solo mes (ej. 1-31 de marzo)
- Relacionado con [Solicitud de Feature: CSV Export](#123) — puede ser una regresión de v2.4.0
- Logs del servidor muestran que la query retorna 0 filas: `WHERE date >= '2026-03-28' AND date <= '2026-04-03'` — se sospecha issue de parsing de fechas
```

## Por Qué Funciona Esta Estructura

| Sección | Propósito |
|---------|-----------|
| **Resumen** | El lector decide la prioridad en 5 segundos |
| **Pasos de reproducción** | El ingeniero puede verificar el bug localmente |
| **Esperado vs actual** | Clarifica qué significa "arreglado" |
| **Entorno** | El bug puede ser específico de plataforma |
| **Severidad** | Ordenamiento de la cola de triage |
| **Contexto adicional** | Links a trabajo relacionado y pistas para la causa raíz |

## Definiciones de Severidad

| Severidad | Criterios | Tiempo de respuesta | Ejemplo |
|-----------|-----------|---------------------|---------|
| Crítico | Pérdida de datos, brecha de seguridad, caída completa | Inmediato (< 1 hora) | Todas las requests API retornan 500 |
| Alto | Feature principal roto, sin workaround o workaround difícil | Mismo día (< 8 horas) | Exportación produce archivo vacío |
| Medio | Feature degradado, workaround existe y es tolerable | Este sprint (< 1 semana) | Dirección de sort revertida en una columna |
| Bajo | Problema cosmético, inconveniente menor | Próximo sprint | Color de botón no coincide con el diseño |

## Ciclo de Vida del Bug

1. **Reportado** — Reportero completa la plantilla y crea un ticket
2. **Triageado** — Reviewer etiqueta dentro de 24 horas (`bug`, `frontend`, `necesita-repro`, `wont-fix`)
3. **Reproducido** — Ingeniero confirma que el bug existe localmente o en staging
4. **Asignado** — Ingeniero toma ownership y comienza investigación
5. **En progreso** — Causa raíz identificada, fix en implementación
6. **PR abierto** — Fix enviado con un test de regresión
7. **Verificado** — Reportero o QA confirma que el fix resuelve el issue
8. **Cerrado** — Ticket cerrado con versión del fix y release notes

## Consejos para Quienes Reportan

- **Reprodúcelo dos veces** antes de reportar — los issues transitorios necesitan manejo diferente
- **Aísla los pasos** — elimina acciones no relacionadas del path de reproducción
- **Prueba en modo incógnito** — descarta extensiones del navegador
- **Revisa issues existentes primero** — los duplicados desperdician tiempo de triage
- **Incluye capturas o grabaciones de pantalla** — los bugs visuales son difíciles de describir
- **Adjunta logs relevantes** — consola del navegador, logs del servidor, screenshots del network tab
- **Nota la frecuencia** — "siempre pasa" vs "pasa 1 de cada 10 veces" cambia la prioridad
- **Menciona cambios recientes** — "empezó después del deploy de v2.4.0" acota la búsqueda

## Consejos para Equipos de Triage

- **Etiqueta inmediatamente** — `bug`, `frontend`, `backend`, `necesita-reproduccion`
- **Asigna en 24 horas** — los bugs sin asignar se deterioran
- **Solicita info faltante pronto** — usa la plantilla como checklist
- **Cierra bugs stale** — si un bug no ha tenido actividad en 90 días, ciérralo con una nota
- **Linkea duplicados** — mezcla bugs que reportan el mismo issue y linkealos
- **Verifica severidad** — los reporteros tienden a sobreestimar severidad; ajusta durante triage

## Ejemplo de Bug Report

```text
=== Bug Report: Error 500 al exportar pedidos ===

Titulo: Error 500 al exportar mas de 1000 pedidos a CSV
ID: BUG-1234
Reportado por: bob@company.com
Fecha: 2026-07-12
Severidad: Alta
Ambiente: Produccion

Comportamiento Esperado:
  Al hacer clic en "Exportar CSV" en la pagina de pedidos con un
  filtro de fecha que retorna mas de 1000 pedidos, el sistema deberia
  descargar un archivo CSV con todos los pedidos.

Comportamiento Actual:
  El sistema retorna un error 500 despues de ~30 segundos.
  El error aparece en los logs como "Timeout de base de datos".

Pasos para Reproducir:
  1. Iniciar sesion como administrador
  2. Ir a /admin/pedidos
  3. Seleccionar rango de fechas: 2026-06-01 a 2026-07-01
  4. Hacer clic en "Exportar CSV"
  5. Esperar ~30 segundos
  6. Observar error 500 en el navegador

Evidencia:
  - Screenshot del error: https://drive.company.com/screenshot-error.png
  - Stack trace: https://pastebin.company.com/abc123
  - Request ID: req-abc-456 (buscar en Kibana)

Frecuencia:
  - Siempre reproducible con > 1000 pedidos
  - Funciona correctamente con < 500 pedidos
  - Intermittente entre 500-1000 pedidos

Impacto:
  - El equipo de ventas no puede exportar pedidos mensuales
  - Workaround temporal: exportar por semana (4 exportaciones)
  - 15 usuarios afectados

Ambiente:
  - Navegador: Chrome 126.0
  - OS: macOS 14.5
  - App version: v2.4.3
  - Region: us-east-1

Notas Adicionales:
  - Empezo despues del release v2.4.0
  - El endpoint es GET /api/orders/export
  - El timeout de DB es 30s; la query tarda 45s con 1000+ pedidos
```


## Variantes

### Orientada al cliente (portal de soporte)

Los clientes no deberían ver labels de severidad ni campos de contexto interno. Usa un formulario simplificado: Resumen, ¿Qué intentabas hacer?, ¿Qué pasó en su lugar?, Upload de screenshot. Mapea las submissions de clientes a reportes de bug internos durante triage.

### Reporte de crash (automatizado)

Reportes automáticos de crash desde error tracking (Sentry, Bugsnag, Crashlytics) deberían incluir: stack trace, info del dispositivo, versión de la app, acciones del usuario antes del crash, y frecuencia de crash. Estos auto-populan la plantilla y crean un ticket. Consulta [Error Handling Patterns](/patterns/design/error-handling-pattern) para reporte estructurado de errores.

### Reporte de vulnerabilidad de seguridad

Reportes de seguridad necesitan una plantilla diferente: no incluyas pasos de reproducción en un ticket público. Usa un canal privado de divulgación de vulnerabilidades. Incluye: componente afectado, vector de ataque, impacto potencial, y mitigación sugerida. Consulta [Security Audit Checklist](/docs/templates/security-audit-checklist) para plantillas específicas de seguridad.

## Preguntas Frecuentes

### ¿Qué pasa si no puedo reproducir el bug consistentemente?

Aún así archiva el reporte. Marca la frecuencia como "intermitente" e incluye timestamps, logs y patrones que hayas notado (ej. "solo ocurre después de 10 minutos de inactividad").

### ¿Los clientes deberían usar esta plantilla también?

Sí, pero simplifícala. Los clientes reciben un formulario con Resumen, Pasos y Entorno únicamente. Los equipos internos reciben la plantilla completa con severidad y contexto.

### ¿Cómo manejo bugs de "en mi máquina funciona"?

Agrega verificaciones de paridad de entorno: [Docker](/recipes/devops/docker-compose-local-dev), versiones exactas de dependencias, y datos de prueba. Consulta [Integration Testing](/recipes/testing/integration-testing-strategies) para verificar fixes en diferentes entornos. Si solo ocurre en producción, el bug está en los datos o la configuración, no en el código.

### ¿Cuál es la diferencia entre un bug y una solicitud de feature?

Un bug es un comportamiento que no coincide con el comportamiento documentado o intencionado. Una solicitud de feature es un pedido de nuevo comportamiento que nunca fue diseñado. Si el comportamiento es ambiguo, revisa el spec o pregunta al product owner. Usa la [Plantilla de Solicitud de Feature](/docs/templates/feature-request-template) para nuevas capacidades.

### ¿Cuánto detalle deberían tener los pasos de reproducción?

Suficiente para que alguien no familiarizado con el feature pueda reproducirlo. "Haz clic en el botón de exportación" es demasiado vago si hay múltiples opciones de exportación. "Haz clic en el botón 'Export CSV' en la barra de herramientas superior derecha del gráfico de Revenue" es específico. En caso de duda, agrega más detalle.

### ¿Debería adjuntar archivos al reporte de bug?

Sí, si ayudan. Screenshots del error, grabaciones de pantalla de los pasos de reproducción, y archivos de log son útiles. No adjuntes archivos que contengan datos sensibles (credenciales, PII). Usa file sharing seguro para adjuntos sensibles.

### ¿Qué pasa si el bug está en una dependencia de terceros?

Archiva el bug en tu tracker interno para visibilidad, pero también archiva un bug en el issue tracker de la dependencia. Linkea los dos tickets. Nota la versión de la dependencia y si existe un workaround. Si la dependencia está abandonada, nótalo y planifica una migración.


### Como determinamos la severidad de un bug?

Severidad mide el impacto en el negocio, no la complejidad tecnica. Critico: servicio caido o datos perdidos; resolver en 24h. Alto: feature principal no funciona para muchos usuarios; resolver en 48h. Medio: feature no funciona pero hay workaround; resolver en 1 semana. Bajo: problema menor sin impacto significativo; resolver en 30 dias. Informativo: cosmetic o typo; resolver cuando sea posible. Para determinar severidad: cuantos usuarios afecta? que tan frecuente es? hay workaround? impacta revenue? La severidad puede cambiar despues del triage — si el impacto es menor del esperado, baja la severidad. Documenta la razon del cambio.

### Como manejamos bug reports duplicados?

Antes de crear un nuevo bug report: buscar en el tracker si ya existe un report para el mismo problema. Buscar por palabras clave del error, no por el titulo exacto. Si encuentras un report existente: agrega tu informacion como comentario con pasos adicionales o evidencia, no crees un duplicado. Si no estas seguro si es el mismo bug: crea el report pero marca "posible duplicado de #XXX". El equipo de QA cierra duplicados y enlaza al report original. Manten los duplicados cerrados visibles — ayudan a buscar el bug por diferentes sintomas. Un bug con 5 reportes duplicados indica que es frecuente — sube la prioridad.

### Que informacion es obligatoria en un bug report?

Obligatorio: titulo descriptivo, pasos para reproducir, comportamiento esperado vs actual, ambiente (navegador, OS, version), y frecuencia. Recomendado: screenshots, stack traces, request IDs, impacto en usuarios, workaround si existe. Opcional: sospecha de causa raiz, logs adicionales, video. Un bug report sin pasos para reproducir es inutil — el ingeniero no puede confirmar el bug. Si no puedes reproducirlo: reporta lo que viste, marca "no reproducible consistentemente", y da el contexto. El reportero debe estar disponible para preguntas de seguimiento — el ingeniero puede necesitar mas informacion.













End of document. Review and update quarterly.