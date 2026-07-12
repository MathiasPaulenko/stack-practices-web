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
  - /docs/incident-communication-template
  - /docs/incident-timeline-template
  - /docs/monitoring-alerting-policy-template
  - /docs/data-breach-response-playbook
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


- For alternatives, see [Blameless Postmortems: Learning from Incidents Without Blame](/es/guides/postmortem-guide/).

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

## Ejemplo de Postmortem Real

```markdown
# Postmortem: INC-2026-07-11-001 — Fallo de Login en EU

## Resumen
El 11 de julio de 2026, el servicio de autenticacion experimento una
tasa de error del 15% para intentos de login en la region EU durante
30 minutos. La causa raiz fue un cambio de configuracion que altero
el intervalo de rotacion del JWT secret, causando validacion de
tokens fallida para sesiones activas.

## Impacto
- Duracion: 30 minutos (10:55 - 11:25 UTC)
- Usuarios afectados: ~15,000 (15% de intentos de login)
- Region: eu-west-1
- Ingresos perdidos: estimados en $2,500
- Tickets de soporte: 47

## Linea de Tiempo
- 10:42  CPU de DB comienza a subir
- 10:55  Alertas de PagerDuty disparan
- 11:00  SEV1 declarado
- 11:03  Cambio de config identificado como causa
- 11:05  Rollback iniciado
- 11:08  Rollback desplegado
- 11:12  Tasa de error en 0%
- 11:25  Incidente resuelto

## Analisis de Causa Raiz
1. Por que fallo la validacion de tokens?
   El JWT secret se roto antes de que los tokens existentes expiraran.
2. Por que se roto el secret?
   El cambio de config redujo el intervalo de rotacion de 24h a 1h.
3. Por que el cambio paso las pruebas?
   Las pruebas de config no validaban la rotacion de secrets.
4. Por que no hubo alerta antes del impacto?
   La alerta de latencia tenia un umbral demasiado alto.

## Que salio bien
- Deteccion y respuesta rapida (3 min de deteccion a declaracion)
- Comunicacion clara a stakeholders y soporte
- Rollback rapido y efectivo

## Que salio mal
- Cambio de config sin revision de seguridad
- Pruebas de config insuficientes
- Umbrales de alerta demasiado altos

## Acciones Pendientes
| Accion | Responsable | Fecha | Prioridad |
|--------|-------------|-------|-----------|
| Agregar test de rotacion de secret | alice | 2026-07-18 | P0 |
| Revisar umbrales de alerta de latencia | bob | 2026-07-15 | P1 |
| Agregar revision de seguridad para cambios de config | platform | 2026-07-25 | P1 |
```


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


### Como facilitamos una sesion de postmortem efectiva?

Asigna un facilitador que no fue respondedor del incidente — trae perspectiva fresca. Comienza con la linea de tiempo para establecer hechos. Luego usa la tecnica de "5 porques" para el analisis de causa raiz. Fomenta preguntas, no acusaciones. Limita la sesion a 60 minutos — si se necesita mas tiempo, programa una sesion de seguimiento. Documenta todo en tiempo real en un documento compartido. Asigna accion items al final con responsables y fechas. Envia el postmortem a todos los equipos de ingenieria dentro de 48 horas.

### Que es la tecnica de "5 porques" y como la aplicamos?

La tecnica de "5 porques" es un metodo de analisis de causa raiz que pregunta "por que" sucesivamente hasta llegar a la causa fundamental. Ejemplo: "Por que fallo el login?" -> "Los tokens eran invalidos." -> "Por que eran invalidos?" -> "El secret se roto." -> "Por que se roto?" -> "El intervalo de rotacion se cambio." -> "Por que se cambio?" -> "El cambio de config no fue revisado." -> "Por que no fue revisado?" -> "No hay proceso de revision para cambios de config." La causa raiz es la falta de proceso, no el cambio en si. Documenta la cadena completa en el postmortem.

### Como manejamos postmortems para incidentes recurrentes?

Si un incidente es similar a uno anterior, referencia el postmortem anterior y compara. Pregunta: por que volvio a pasar? Las acciones del postmortem anterior se completaron? Fueron efectivas? Hay una causa sistemica mas profunda? Para incidentes que ocurren 3+ veces, escalala a liderazgo para una revision de arquitectura. Considera que el sistema necesita un redisenio, no solo fixes incrementales. Documenta el patron recurrente y las acciones tomadas en cada iteracion.

### Como medimos la efectividad de los postmortems?

Rastrea: porcentaje de accion items completados dentro de la fecha limite (objetivo: > 80%), tiempo promedio de completacion de accion items, numero de incidentes recurrentes (mismo tipo) despues de un postmortem, y tiempo desde el incidente hasta la publicacion del postmortem (objetivo: < 72 horas). Revisa estas metricas trimestralmente. Si los accion items no se completan, investiga por que — son demasiado ambiciosos? Falta de recursos? No son prioritarios? Ajusta el proceso basado en los hallazgos.

### Quien deberia aprobar el postmortem antes de publicarlo?

El postmortem debe ser revisado por: el incident commander (para precision de hechos), los respondedores clave (para precision tecnica), y el team lead o engineering manager (para accion items y priorizacion). Para incidentes SEV1, el CTO o VP de ingenieria deberia revisar. Para incidentes de seguridad, el equipo legal y de compliance deben aprobar antes de cualquier publicacion externa. Documenta los revisores en el changelog del postmortem. Nunca publiques un postmortem sin revision — los errores en un postmortem erosionan la confianza.




























End of document. Review and update quarterly.