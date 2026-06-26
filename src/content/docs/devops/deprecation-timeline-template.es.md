---
contentType: docs
slug: deprecation-timeline-template
title: "Plantilla de Linea de Tiempo de Deprecacion"
description: "Una plantilla para planificar y comunicar la discontinuacion de funciones legacy, APIs o servicios con hitos claros y notificaciones a stakeholders."
metaDescription: "Planifica la discontinuacion de funciones legacy con esta plantilla. Cubre hitos, cronogramas de comunicacion, rutas de migracion y fechas finales de apagado."
difficulty: intermediate
topics:
  - devops
  - architecture
tags:
  - deprecation
  - sunset
  - legacy
  - migration
  - communication
relatedResources:
  - /docs/devops/system-decommissioning-checklist-template
  - /docs/devops/service-ownership-document-template
  - /docs/devops/feature-specification-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Planifica la discontinuacion de funciones legacy con esta plantilla. Cubre hitos, cronogramas de comunicacion, rutas de migracion y fechas finales de apagado."
  keywords:
    - linea de tiempo de deprecacion
    - discontinuacion de funciones
    - migracion legacy
    - deprecacion de API
    - plan de fin de vida
---

## Descripcion General

Deprecar una funcion o API es facil de anunciar y dificil de terminar. Los usuarios se pierden el correo, las integraciones se rompen en el ultimo minuto y el equipo se queda atascado soportando un sistema que creia muerto. Una linea de tiempo de deprecacion es un contrato entre el equipo y sus consumidores: aqui esta lo que termina, cuando termina, que debes usar en su lugar y como te ayudaremos a migrar.

## Cuando Usar

Usa esta plantilla cuando:
- Un endpoint de API, funcion o integracion esta siendo reemplazado por una version mas nueva
- Una dependencia de terceros esta llegando a fin de vida
- Un servicio esta siendo consolidado en otro sistema
- Una libreria cliente o version de SDK esta siendo retirada
- Una herramienta interna esta siendo reemplazada y otros equipos necesitan tiempo para adaptarse

## Requisitos Previos

Antes de anunciar la deprecacion:
- [ ] El reemplazo esta disponible y documentado
- [ ] Existe documentacion de migracion y ha sido probada
- [ ] Hay capacidad de soporte disponible para responder preguntas de consumidores
- [ ] Legal o cumplimiento ha revisado cualquier obligacion contractual
- [ ] Se ha decidido si se ofrecera un periodo de gracia o un corte definitivo

## Solucion

```markdown
# Linea de Tiempo de Deprecacion: `<Funcion / API / Servicio>`

> Propietario de la deprecacion: ______ | Fecha: ______ | Apagado objetivo: ______
> Reemplazo: ______ | Canal de comunicacion: ______

## 1. Resumen de la Deprecacion

- **Que se esta deprecando:** ______
- **Por que se esta deprecando:** ______
- **Que lo reemplaza:** ______
- **Quien se ve afectado:** ______
- **Fecha final de apagado:** ______

## 2. Linea de Tiempo

| Hito | Fecha | Descripcion | Responsable | Estado |
|------|-------|-------------|-------------|--------|
| Anuncio | ______ | Notificacion publica de deprecacion | ______ | ______ |
| Documentacion | ______ | Guia de migracion publicada | ______ | ______ |
| Ejemplos de codigo | ______ | Migraciones de ejemplo en todos los lenguajes soportados | ______ | ______ |
| Advertencia suave | ______ | La API o UI comienza a mostrar avisos de deprecacion | ______ | ______ |
| Advertencia fuerte | ______ | Frecuencia o severidad de avisos aumentada | ______ | ______ |
| Congelamiento de funciones | ______ | Sin nueva funcionalidad en el sistema deprecado | ______ | ______ |
| Corte final | ______ | El sistema deprecado deja de responder | ______ | ______ |
| Post-apagado | ______ | Tickets de soporte y retrospectiva | ______ | ______ |

## 3. Plan de Comunicacion

| Audiencia | Canal | Mensaje | Fecha |
|-----------|-------|---------|-------|
| Equipos internos | ______ | ______ | ______ |
| Desarrolladores externos | ______ | ______ | ______ |
| Clientes enterprise | ______ | ______ | ______ |
| Equipo de soporte | ______ | ______ | ______ |
| Marketing / comunidad | ______ | ______ | ______ |

### Plantillas de mensaje

**Anuncio:**
> Estamos deprecando ______ el ______. Sera reemplazado por ______. La documentacion de migracion esta disponible en ______. Por favor migra antes de ______ para evitar interrupciones.

**Recordatorio a 30 dias:**
> Este es un recordatorio de que ______ sera apagado el ______. Si aun no has migrado, revisa ______ y contacta ______ para asistencia.

**Aviso final:**
> ______ sera apagado en 7 dias. Despues de ______, las peticiones a ______ retornaran ______. Para soporte urgente de migracion, contacta ______.

## 4. Ruta de Migracion

### Para consumidores usando ______

1. ______
2. ______
3. ______

### Cambios disruptivos

| Comportamiento anterior | Nuevo comportamiento | Accion requerida |
|-------------------------|----------------------|------------------|
| ______ | ______ | ______ |

## 5. Plan de Soporte

| Nivel de soporte | Disponibilidad | Contacto | Notas |
|------------------|----------------|----------|-------|
| Preguntas de migracion | ______ | ______ | ______ |
| Reportes de bugs en sistema deprecado | ______ | ______ | ______ |
| Solicitudes de funciones en sistema deprecado | ______ | ______ | ______ |

## 6. Rollback / Periodo de Gracia

- [ ] Periodo de gracia disponible: Si / No
- [ ] Duracion del periodo de gracia: ______
- [ ] Como solicitar periodo de gracia: ______
- [ ] Criterios de aprobacion: ______

## 7. Post-Apagado

- [ ] Monitorear trafico o errores inesperados por ______ dias
- [ ] Redirigir documentacion y links al reemplazo
- [ ] Archivar anuncio de deprecacion
- [ ] Actualizar catalogo de servicios para reflejar la remocion
- [ ] Realizar retrospectiva con consumidores afectados
```

## Explicacion

La linea de tiempo es el nucleo de este documento. Cada hito da a los consumidores multiples oportunidades de notar y actuar. El **plan de comunicacion** asegura que el mensaje llegue a todas las audiencias a traves de sus canales preferidos. La **ruta de migracion** elimina la ambiguedad — los consumidores deben saber exactamente que cambiar. El **plan de soporte** establece expectativas: ayudaras, pero solo por un periodo definido. El **periodo de gracia** reconoce que las migraciones del mundo real se retrasan y te da una politica para manejar excepciones sin socavar la fecha limite.

## Variantes

| Contexto | Ajustes | Notas |
|---------|---------|-------|
| Deprecacion de API publica | Agregar entrada de changelog, post de blog para desarrolladores y cronograma de actualizacion de SDK | Las APIs publicas tienen mas consumidores y mayor visibilidad |
| Deprecacion de servicio interno | Agregar soporte de migracion del equipo propietario y seguimiento de Jira por consumidor | Los consumidores internos esperan soporte mas directo |
| Sunset de libreria cliente | Agregar matriz de compatibilidad de versiones y flags de deprecacion de npm/artefactos | Los gestores de paquetes tienen mecanismos de deprecacion integrados |
| Remocion de feature flag | Agregar analitica de uso del flag y plan de despliegue gradual | Saber quien aun tiene el flag habilitado |
| Fin de vida de dependencia de terceros | Agregar comunicacion con el proveedor, revision de contrato y evaluacion de alternativas | No controlas la linea de tiempo |

## Mejores Practicas

1. **Anuncia temprano, corta firmemente** — da el maximo aviso, luego cumple la fecha
2. **Haz la migracion mas facil que quedarse** — ejemplos de codigo, herramientas CLI y documentacion clara reducen la carga de soporte
3. **Monitorea la adopcion** — rastrea cuantos consumidores han migrado; apunta a los rezagados directamente
4. **No agregues funciones a un sistema deprecado** — senala que la deprecacion no es seria
5. **Documenta la decision** — escribe un ADR o breve explicando por que el sistema se esta deprecando

## Errores Comunes

1. **Anunciar sin reemplazo** — los consumidores no pueden migrar a la nada
2. **Un correo y listo** — la gente pierde correos; comunica repetidamente a traves de multiples canales
3. **Sin corte definitivo** — las deprecaciones suaves nunca terminan; establece una fecha real
4. **Ignorar contratos enterprise** — algunos clientes tienen SLAs que requieren aviso anticipado
5. **Olvidar la documentacion** — viejos posts de blog, respuestas de Stack Overflow y READMEs viven para siempre

## Preguntas Frecuentes

### Cuanto aviso debemos dar?

Para APIs publicas, 6-12 meses es estandar. Para servicios internos, 3 meses pueden ser suficientes si tienes canales de comunicacion directos. Cuanto mas consumidores tengas, mas aviso necesitas. Los clientes enterprise pueden requerir periodos de aviso definidos en contratos.

### Que pasa si un cliente critico no puede migrar a tiempo?

Ten una politica documentada de periodo de gracia antes de anunciar. No hagas excepciones ad hoc — socava la linea de tiempo para todos los demas. Si se aprueba un periodo de gracia, establece una fecha secundaria firme y comunicala transparentemente.

### Debemos mantener la API anterior retornando un redirect?

Por un corto periodo despues del apagado (dias, no meses), retornar un error claro con un link a la documentacion de migracion es util. Los redirects permanentes ocultan el problema y retrasan la migracion. Eventualmente el endpoint debe retornar un error definitivo.
