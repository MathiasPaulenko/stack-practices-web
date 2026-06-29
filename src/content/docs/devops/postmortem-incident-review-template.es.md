---
contentType: docs
slug: postmortem-incident-review-template
title: "Plantilla de Revision de Incidentes Postmortem"
description: "Una plantilla de postmortem sin culpa para analizar incidentes, identificar causas raiz y documentar lecciones para prevenir recurrencia."
metaDescription: "Realiza revisiones de incidentes sin culpa con esta plantilla. Cubre reconstruccion de linea de tiempo, analisis de causa raiz y lecciones."
difficulty: intermediate
topics:
  - devops
  - observability
tags:
  - postmortem
  - incident-review
  - root-cause
  - sre
  - reliability
relatedResources:
  - /docs/devops/incident-communication-template
  - /docs/devops/incident-timeline-template
  - /docs/devops/monitoring-alerting-policy-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Realiza revisiones de incidentes sin culpa con esta plantilla. Cubre reconstruccion de linea de tiempo, analisis de causa raiz y lecciones."
  keywords:
    - plantilla de postmortem
    - revision de incidentes
    - postmortem sin culpa
    - analisis de causa raiz
    - practicas sre
---

## Descripcion General

Cada interrupcion es una leccion que alguien repetira a menos que se documente. Los postmortems no son sobre culpa — son sobre entender como un sistema con buenas personas y buenas intenciones aun asi fallo. Un postmortem bien ejecutado reconstruye que paso, identifica la cadena de eventos que llevo al fallo y produce acciones concretas que hacen el proximo incidente menos probable o menos severo.

## Cuando Usar

Usa esta plantilla cuando:
- Un incidente con impacto en el servicio ha sido resuelto
- Un incidente excedio un umbral de severidad (ej., SEV-2 o mayor)
- Un incidente causo perdida de datos, exposicion de seguridad o impacto de cumplimiento
- Un cuasi-incidente revelo un riesgo mayor que no se materializo
- Un problema recurrente sugiere un problema sistemico mas profundo

## Requisitos Previos

Antes de realizar un postmortem:
- [ ] El incidente esta completamente resuelto y los sistemas son estables
- [ ] Se ha recopilado una linea de tiempo de eventos (ver plantilla de linea de tiempo de incidentes)
- [ ] Los participantes clave estan disponibles: respondedores, ingenieros involucrados y observadores
- [ ] El liderazgo apoya un proceso sin culpa
- [ ] Se ha decidido si el postmortem es solo interno o de cara al cliente

## Solucion

```markdown
# Postmortem: `<Titulo del Incidente>`

> ID del incidente: ______ | Fecha: ______ | Severidad: ______
> Respondedor lider: ______ | Propietario del postmortem: ______
> Fecha de revision: ______ | Estado: Borrador / Revisado / Aprobado

## 1. Resumen Ejecutivo

- **Que paso:** ______
- **Impacto:** ______
- **Duracion:** ______
- **Causa raiz (una oracion):** ______
- **Estado:** ______

## 2. Evaluacion del Impacto

| Metrica | Valor |
|---------|-------|
| Servicios afectados | ______ |
| Usuarios afectados | ______ |
| Incremento en tasa de error | ______ |
| Impacto en ingresos / transacciones | ______ |
| Datos afectados | ______ |
| Impacto en SLA / SLO | ______ |

## 3. Linea de Tiempo

| Hora (UTC) | Evento | Fuente |
|------------|--------|--------|
| ______ | ______ | ______ |
| ______ | ______ | ______ |
| ______ | ______ | ______ |

## 4. Analisis de Causa Raiz

### Cual fue el disparador?

______

### Cual fue el factor contribuyente?

______

### Por que la deteccion tomo mas de lo esperado?

______

### Por que la recuperacion tomo mas de lo esperado?

______

### Que defensas fallaron o faltaron?

______

## 5. Lecciones Aprendidas

### Que salio bien

- ______
- ______

### Que salio mal

- ______
- ______

### Donde tuvimos suerte

- ______
- ______

## 6. Acciones Pendientes

| Accion | Responsable | Fecha Limite | Prioridad | Estado |
|--------|-------------|---------------|-----------|--------|
| ______ | ______ | ______ | P0 / P1 / P2 | ______ |

## 7. Comunicacion

- [ ] Stakeholders internos notificados
- [ ] Post de cara al cliente publicado (si aplica)
- [ ] Equipo de soporte informado
- [ ] Pagina de estado actualizada con resolucion

## 8. Apendice

- Links a dashboards: ______
- Links a logs: ______
- Links a canales de incidente: ______
- Tickets relacionados: ______
```

## Explicacion

La plantilla separa la **historia** (linea de tiempo, que paso) del **analisis** (por que paso) de la **accion** (que haremos). La **seccion de analisis de causa raiz** usa una cadena de preguntas que exponen no solo el disparador sino las condiciones que permitieron que el disparador causara una interrupcion. La **seccion "donde tuvimos suerte"** es critica: identifica cuasi-incidentes y riesgos ocultos que no se materializaron esta vez pero pueden hacerlo la proxima.

## Variantes

| Contexto | Ajustes | Notas |
|---------|---------|-------|
| Incidente de seguridad | Agregar seccion de evaluacion de impacto para exposicion de datos, agregar revision legal y restringir distribucion | Los postmortems de seguridad pueden ser confidenciales |
| Incidente de perdida de datos | Agregar pasos de recuperacion de datos, verificacion de respaldos y cronograma de notificacion a clientes | Enfocarse en que se perdio y que se recupero |
| Degradacion de rendimiento (no interrupcion) | Agregar percentiles de latencia, caida de throughput y efectos de ralentizacion en cascada | La degradacion es mas dificil de definir que el downtime |
| Falla de dependencia de terceros | Agregar cronograma de comunicacion con el proveedor y evaluacion de proveedor alternativo | No puedes arreglar al proveedor, pero puedes reducir la dependencia |
| Incidente recurrente | Agregar comparacion con incidentes anteriores similares y analisis sistemico mas profundo | Los patrones importan mas que los eventos individuales |

## Lo que funciona

1. **Programa dentro de 48 horas** — la memoria se desvanece y los logs rotan; ejecuta el postmortem mientras los detalles estan frescos
2. **Invita observadores, no solo respondedores** — personas que no estuvieron en el calor del momento a menudo ven patrones que los respondedores no ven
3. **Enfocate en sistemas, no en personas** — "la alerta se perdio" es un sintoma; "la alerta se ahogo en ruido" es un problema de sistema
4. **Publica acciones pendientes en la misma semana** — el valor de un postmortem es proporcional a que tan rapido sus acciones son rastreadas
5. **Revisa postmortems antiguos trimestralmente** — busca temas recurrentes y brechas sistemicas

## Errores Comunes

1. **Causa raiz = error humano** — los humanos son el componente mas variable; el sistema deberia haber hecho el error seguro
2. **Sin resumen ejecutivo** — sin un parrafo de resumen, el liderazgo no leera el resto
3. **Acciones sin responsables ni fechas** — acciones no asignadas son acciones olvidadas
4. **Saltarse "que salio bien"** — los postmortems no son solo quejas; refuerzan practicas que funcionaron
5. **Sin seguimiento** — si nadie verifica si las acciones se completan, el postmortem fue una perdida de tiempo

## Preguntas Frecuentes

### Que pasa si alguien claramente cometio un error?

Pregunta: por que fue posible el error? Era la documentacion confusa? Era la herramienta confusa? Estaba la persona sobrecargada? No habia salvaguarda? Sin culpa no significa sin consecuencias — significa enfocarse en mejoras del sistema en lugar de castigo.

### Los postmortems deberian ser publicos?

Los postmortems internos deberian ser visibles para todos los equipos de ingenieria. Los postmortems de cara al cliente deberian ser sanitizados y publicados en una pagina de estado o blog. La transparencia genera confianza, pero protege detalles tecnicos sensibles que podrian ayudar a atacantes.

### Como evitamos la "bancarrota de acciones pendientes"?

Rastrea las acciones de postmortem en el mismo backlog que el trabajo de funcionalidades. Revisalas en la planificacion de sprint. Si una accion se retrasa repetidamente, pregunta si es realmente importante — y si no, cerrala explicitamente en lugar de dejarla podrirse.
