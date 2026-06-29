---
contentType: docs
slug: service-level-objective-slo-template
title: "Plantilla de Objetivo de Nivel de Servicio (SLO)"
description: "Una plantilla para definir objetivos de confiabilidad, presupuestos de error y metodos de medicion para servicios y sistemas."
metaDescription: "Define SLOs con esta plantilla. Cubre objetivos de confiabilidad, SLIs, presupuestos de error, ventanas de medicion y procesos de revision."
difficulty: intermediate
topics:
  - observability
  - devops
tags:
  - slo
  - reliability
  - observability
  - error-budget
  - monitoring
relatedResources:
  - /docs/devops/monitoring-alerting-policy-template
  - /docs/devops/escalation-policy-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Define SLOs con esta plantilla. Cubre objetivos de confiabilidad, SLIs, presupuestos de error, ventanas de medicion y procesos de revision."
  keywords:
    - plantilla de SLO
    - objetivo de nivel de servicio
    - objetivo de confiabilidad
    - presupuesto de error
    - SLI
---

## Descripcion General

Un Objetivo de Nivel de Servicio (SLO) define un objetivo de confiabilidad para un servicio. Traduce las expectativas de los usuarios en metas medibles que orientan las prioridades de ingenieria, las compensaciones y la inversion. Esta plantilla ayuda a los equipos a definir Indicadores de Nivel de Servicio (SLIs), establecer objetivos, gestionar presupuestos de error y revisar el rendimiento en el tiempo.

## Cuando Usar

- Lanzar un nuevo servicio o producto.
- Establecer expectativas de confiabilidad con stakeholders o clientes.
- Introducir presupuestos de error para equilibrar velocidad y estabilidad.
- Negociar un Acuerdo de Nivel de Servicio (SLA) interno o externo.
- Revisar la salud del servicio trimestralmente o despues de incidentes mayores.

## Prerequisitos

- Comprension clara de la funcionalidad orientada al usuario y los viajes criticos del usuario.
- Instrumentacion que produce las metricas necesarias para los SLIs.
- Plataforma de monitoreo u observabilidad que pueda calcular la confiabilidad en el tiempo.
- Acuerdo de prioridades entre producto, ingenieria y operaciones.
- Datos historicos o estimaciones para establecer objetivos realistas.

## Solucion

### Plantilla

#### 1. Definicion del SLO

| Campo | Descripcion | Ejemplo |
|-------|-------------|---------|
| Nombre del servicio | El servicio o sistema cubierto | `Checkout API` |
| Nombre del SLO | Nombre corto para el objetivo | `Disponibilidad de checkout` |
| SLI | Medida cuantitativa del nivel de servicio | `Ratio de solicitudes HTTP exitosas` |
| Objetivo | Nivel de confiabilidad deseado | `99.9%` |
| Ventana de medicion | Periodo de tiempo para evaluacion | `30 dias` |
| Dueno | Equipo responsable | `Equipo checkout` |
| Stakeholders | Usuarios del SLO | `Producto, soporte, plataforma` |

#### 2. Tipos Comunes de SLIs

| Tipo de SLI | Que Mide | Formula Tipica de SLI |
|-------------|----------|------------------------|
| Disponibilidad | Esta respondiendo el servicio? | `solicitudes exitosas / solicitudes totales` |
| Latencia | Que tan rapido es el servicio? | `porcentaje de solicitudes bajo umbral` |
| Calidad | Es correcta la salida? | `respuestas validas / respuestas totales` |
| Tasa de error | Con que frecuencia falla? | `1 - (solicitudes exitosas / solicitudes totales)` |
| Throughput | Puede manejar la carga? | `solicitudes por segundo` |
| Frescura | Los datos estan actualizados? | `porcentaje de datos actualizados dentro del umbral` |
| Durabilidad | Se preservan los datos? | `porcentaje de objetos almacenados exitosamente en el tiempo` |

#### 3. Ejemplos de SLOs

| Servicio | SLI | Objetivo | Ventana | Justificacion |
|----------|-----|----------|---------|---------------|
| Checkout API | Disponibilidad | 99.95% | 30 dias | Endpoint critico para ingresos |
| Checkout API | Latencia p99 | < 500ms | 30 dias | Umbral de experiencia de usuario |
| Servicio de busqueda | Disponibilidad | 99.9% | 30 dias | Importante pero no critico para ingresos |
| Servicio de busqueda | Latencia p95 | < 200ms | 30 dias | Retroalimentacion rapida al usuario |
| Pipeline de datos | Frescura | 99.5% | 24 horas | Analitica necesita datos recientes |
| Almacenamiento de objetos | Durabilidad | 99.999999999% | 1 ano | Proteccion contra perdida de datos |

#### 4. Politica de Presupuesto de Error

| Objetivo | Presupuesto de Error | Tasa de Quemado (Diaria) | Accion al Agotar el Presupuesto |
|----------|----------------------|--------------------------|--------------------------------|
| 99.9% | 0.1% | ~0.003% | Revisar politica de releases y congelar cambios no criticos |
| 99.95% | 0.05% | ~0.0017% | Endurecer rollout y requerir revision de incidentes |
| 99.99% | 0.01% | ~0.0003% | Detener releases de features y priorizar trabajo de confiabilidad |

Lineamientos:
- Un presupuesto de error mide cuanta falta de confiabilidad es aceptable en una ventana.
- La tasa de quemado indica que tan rapido se consume el presupuesto.
- Cuando el presupuesto se agota o se proyecta agotarse, reducir cambios riesgosos.
- Un presupuesto excesivo restante puede indicar objetivos demasiado conservadores.

#### 5. Medicion y Alertas

| Metrica | Fuente | Agregacion | Umbral de Alerta |
|---------|--------|------------|------------------|
| Disponibilidad | Load balancer o logs de aplicacion | Ventana 5 min | Objetivo SLO - 1% durante 10 min |
| Latencia p99 | Metricas de aplicacion | Ventana 1 hora | Latencia objetivo + 20% durante 15 min |
| Tasa de error | Logs de aplicacion | Ventana 5 min | > 0.5% durante 5 min |
| Presupuesto de error | Calculo de SLO | 30 dias movil | 80% consumido en 50% de la ventana |
| Tasa de quemado | Calculo de SLO | Ventana 1 hora | Alta tasa de quemado por 2 horas consecutivas |

#### 6. Ciclo de Revision y Mejora

| Actividad | Frecuencia | Dueno | Salida |
|-----------|------------|-------|--------|
| Revision de dashboard de SLOs | Semanal | Equipo SRE | Estado actual y tendencias |
| Revision de presupuesto de error | Mensual | Dueno del servicio | Decisiones de releases y acciones de seguimiento |
| Revision de objetivos SLO | Trimestral | Producto + ingenieria | Objetivos ajustados con justificacion |
| Revision post-incidente | Despues de cada incidente | Comandante de incidente | Impacto en SLO y acciones de mejora |
| Comunicacion de SLOs | Trimestral | Liderazgo de ingenieria | Reporte de stakeholders sobre confiabilidad |

## Explicacion

Los SLOs dan a los equipos un lenguaje compartido para la confiabilidad. Al definir SLIs, objetivos y presupuestos de error, una organizacion puede decidir cuando priorizar nuevas funciones versus trabajo de estabilidad. Los SLOs tambien reducen la fatiga de alertas al enfocar el monitoreo en la confiabilidad que impacta al usuario en lugar de cada metrica interna.

## Variantes

- **SLO orientado al cliente**: Se usa para respaldar SLAs externos y comunicaciones con clientes.
- **SLO de plataforma interna**: Rastrea la confiabilidad de servicios internos consumidos por otros equipos.
- **SLO de carga batch**: Se enfoca en throughput, frescura y ventanas de finalizacion en lugar de disponibilidad.
- **SLO de movil o cliente**: Incluye tasas de crash, tiempo de inicio de app y latencia de respuesta API.
- **SLO de plataforma de datos**: Enfatiza frescura, completitud y rendimiento de consultas.

## Lo que funciona

- Comienza con unos pocos viajes criticos del usuario en lugar de medir todo.
- Establece objetivos basados en expectativas de usuario y necesidades de negocio, no en infraestructura ideal.
- Usa presupuestos de error para guiar decisiones de release en lugar de como castigo.
- Manten los SLOs simples y comprensibles para stakeholders no tecnicos.
- Revisa los objetivos trimestralmente y ajustalos a medida que evolucionan los servicios.
- Alerta sobre quemado rapido de presupuesto, no solo sobre faltas de objetivo.
- Documenta los SLIs de forma reproducible entre herramientas.
- Alinea los SLOs con las prioridades de respuesta a incidentes.

## Errores Comunes

- Establecer SLOs al 100% sin considerar costo y complejidad.
- Elegir SLIs que no reflejan la experiencia real del usuario.
- Definir demasiados SLOs y perder el foco.
- No usar presupuestos de error para influir en decisiones de release.
- Ignorar los SLOs despues de definirlos.
- Establecer objetivos basados solo en el rendimiento actual sin metas de mejora.
- Confundir SLOs internos con SLAs externos.

## FAQs

### Cual es la diferencia entre SLI, SLO y SLA?

Un SLI es una metrica. Un SLO es el objetivo para esa metrica. Un SLA es un compromiso contractual, a menudo basado en SLOs, con consecuencias por no cumplir los objetivos.

### Como elegimos el objetivo SLO correcto?

Comienza con datos historicos, considera los puntos de dolor del usuario y equilibra la confiabilidad contra el costo y la velocidad de features. Puntos de partida comunes son 99.9% para servicios importantes y 99.95% o mas para servicios criticos.

### Que pasa cuando se agota el presupuesto de error?

El equipo debe reducir cambios riesgosos, priorizar mejoras de confiabilidad y revisar incidentes recientes. Es una senal para invertir en estabilidad, no una razon para culpar a individuos.
