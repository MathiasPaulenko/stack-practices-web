---
contentType: docs
slug: capacity-planning-forecast-template
title: "Plantilla de Pronostico de Planificacion de Capacidad"
description: "Una plantilla estructurada para pronosticar el crecimiento de infraestructura, identificar cuellos de botella de recursos y planificar la capacidad antes de que los picos de trafico causen interrupciones."
metaDescription: "Planifica el crecimiento de infraestructura con esta plantilla. Cubre proyecciones de trafico, cuellos de botella y presupuestos."
difficulty: intermediate
topics:
  - infrastructure
  - devops
tags:
  - capacity-planning
  - forecasting
  - infrastructure
  - scaling
  - performance
relatedResources:
  - /docs/devops/production-readiness-review-template
  - /docs/devops/feature-specification-template
  - /docs/devops/monitoring-alerting-policy-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Planifica el crecimiento de infraestructura con esta plantilla. Cubre proyecciones de trafico, cuellos de botella y presupuestos."
  keywords:
    - planificacion de capacidad
    - pronostico de infraestructura
    - plantilla de escalado
    - planificacion de recursos
    - proyeccion de trafico
---

## Descripcion General

El trafico crece, pero la infraestructura no crece sola. La mayoria de las interrupciones no son causadas por codigo malo, sino por sistemas que chocan contra un limite que nadie midio. La planificacion de capacidad es la disciplina de mirar hacia adelante: cuanto trafico tendremos en seis meses, que recurso se agotara primero y cuanto costara mantenernos por delante de la demanda. Un pronostico de capacidad convierte el escalado impulsado por el panico en una operacion programada, presupuestada y probada.

## Cuando Usar

Usa esta plantilla cuando:
- Entras en una fase de crecimiento (campaña de marketing, lanzamiento de producto, pico estacional)
- Un servicio se acerca al 60-70% de utilizacion de cualquier recurso critico
- Necesitas justificar gastos de infraestructura ante finanzas o liderazgo
- Quieres pasar del escalado reactivo al proactivo
- Estas evaluando una transicion de escalado vertical a horizontal

## Requisitos Previos

Antes de crear un pronostico de capacidad:
- [ ] Existen metricas de referencia: CPU, memoria, disco I/O, throughput de red, tasa de peticiones, latencia
- [ ] Hay datos historicos de trafico disponibles de al menos los ultimos tres meses
- [ ] Las suposiciones de crecimiento estan documentadas (planes de marketing, metas de adquisicion de usuarios, lanzamientos de funciones)
- [ ] Los datos de costos estan disponibles: facturas de proveedores cloud, precios de instancias reservadas, licencias
- [ ] El equipo acuerda que significa "lleno" (80%? 90%? 100% con margen?)

## Solucion

```markdown
# Pronostico de Planificacion de Capacidad: `<Sistema / Servicio>`

> Autor: ______ | Fecha: ______ | Fecha de revision: ______
> Propietario del servicio: ______ | Equipo: ______ | Horizonte del pronostico: ______

## 1. Estado Actual

| Metrica | Actual | Pico (ultimos 30d) | Limite | Margen |
|---------|--------|--------------------|--------|--------|
| Peticiones / seg | ______ | ______ | ______ | ______ |
| Utilizacion CPU (%) | ______ | ______ | ______ | ______ |
| Utilizacion memoria (%) | ______ | ______ | ______ | ______ |
| I/O disco (MB/s o IOPS) | ______ | ______ | ______ | ______ |
| Throughput red (Gbps) | ______ | ______ | ______ | ______ |
| Conexiones base de datos | ______ | ______ | ______ | ______ |
| Almacenamiento usado (GB) | ______ | ______ | ______ | ______ |
| Profundidad de cola / backlog | ______ | ______ | ______ | ______ |

**Infraestructura actual:**
- ______ instancias de tamano ______
- ______ bases de datos de tier ______
- ______ nodos de cache
- ______ balanceadores de carga
- Costo mensual estimado: ______

## 2. Suposiciones de Crecimiento

| Impulsor | Cambio Esperado | Plazo | Confianza |
|----------|-----------------|-----------|------------|
| ______ | ______ | ______ | Alta / Media / Baja |
| ______ | ______ | ______ | Alta / Media / Baja |
| ______ | ______ | ______ | Alta / Media / Baja |

**Suposiciones clave:**
- [ ] ______
- [ ] ______

## 3. Proyecciones de Trafico

| Periodo | RPS Proyectado | MAU Proyectado | Tasa de Crecimiento |
|---------|----------------|----------------|---------------------|
| Actual | ______ | ______ | — |
| +3 meses | ______ | ______ | ______ |
| +6 meses | ______ | ______ | ______ |
| +12 meses | ______ | ______ | ______ |

## 4. Pronostico de Recursos

| Recurso | Actual | +3m | +6m | +12m | Primero en Alcanzar Limite? |
|---------|--------|-----|-----|------|-----------------------------|
| CPU | ______ | ______ | ______ | ______ | Si / No |
| Memoria | ______ | ______ | ______ | ______ | Si / No |
| I/O disco | ______ | ______ | ______ | ______ | Si / No |
| Red | ______ | ______ | ______ | ______ | Si / No |
| Conexiones BD | ______ | ______ | ______ | ______ | Si / No |
| Almacenamiento | ______ | ______ | ______ | ______ | Si / No |

## 5. Plan de Escalado

### Corto Plazo (0-3 meses)
- [ ] ______
- [ ] ______

### Mediano Plazo (3-6 meses)
- [ ] ______
- [ ] ______

### Largo Plazo (6-12 meses)
- [ ] ______
- [ ] ______

## 6. Proyeccion de Costos

| Escenario | Costo Mensual | Costo Anual | Notas |
|-----------|---------------|-------------|-------|
| No hacer nada | ______ | ______ | Riesgo de interrupcion |
| Minimo viable | ______ | ______ | Justo por delante de la demanda |
| Margen comodo | ______ | ______ | Buffer del 30-40% |

## 7. Evaluacion de Riesgos

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|--------------|---------|------------|
| Crecimiento excede pronostico | ______ | ______ | ______ |
| Limites del proveedor cloud | ______ | ______ | ______ |
| Escalado toma mas de lo esperado | ______ | ______ | ______ |
| Presupuesto no aprobado | ______ | ______ | ______ |

## 8. Acciones Pendientes

| Tarea | Responsable | Fecha Limite | Estado |
|-------|-------------|--------------|--------|
| ______ | ______ | ______ | ______ |

## 9. Apendice

- Links a dashboards: ______
- Datos historicos de incidentes: ______
- ADRs o documentos de diseno relacionados: ______
```

## Explicacion

La plantilla separa la **medicion** (estado actual) de la **prediccion** (suposiciones de crecimiento y proyecciones de trafico) de la **decision** (plan de escalado y proyeccion de costos). La **tabla de pronostico de recursos** resalta cual recurso alcanzara su limite primero — este es el cuello de botella que determina tu linea de tiempo de escalado. La **proyeccion de costos** enmarca el plan tecnico en terminos de negocio, facilitando la obtencion de presupuesto.

## Variantes

| Contexto | Ajustes | Notas |
|---------|---------|-------|
| Especifico para bases de datos | Agrega throughput de consultas, crecimiento de indices, lag de replicacion y limites del pool de conexiones | Las bases de datos alcanzan limites de forma diferente al computo |
| Sistemas con uso intensivo de almacenamiento | Agrega politicas de retencion de datos, planes de compresion y costos de almacenamiento por niveles | El almacenamiento crece predeciblemente pero es costoso |
| Basados en eventos / colas | Agrega throughput por shard, lag del consumidor y crecimiento de la cola de mensajes muertos | Las colas ocultan la presion hasta que se desbordan |
| Multi-region | Agrega ancho de banda de replicacion entre regiones y capacidad por region | Cada region puede tener un crecimiento diferente |
| Serverless | Agrega conteo de invocaciones, limites de concurrencia y frecuencia de cold starts | Los limites serverless son diferentes a los de instancias |

## Lo que funciona

1. **Pronostica mensualmente, revisa trimestralmente** — las suposiciones cambian; actualiza el pronostico antes de que se convierta en ficcion
2. **Usa percentiles, no promedios** — la latencia p99 y el pico de CPU importan mas que los valores medios
3. **Incluye un escenario de "no hacer nada"** — hace explicito el costo de la inaccion
4. **Prueba tu plan de escalado** — ejecuta una prueba de carga que simule tu proyeccion a 6 meses antes de necesitarlo
5. **Comparte el pronostico ampliamente** — producto, finanzas e ingenieria deben ver los mismos numeros

## Errores Comunes

1. **Planificar basado en promedios** — un sistema al 50% de CPU promedio puede estar al 95% durante las horas pico
2. **Ignorar la base de datos** — el computo escala horizontalmente; las bases de datos a menudo no
3. **Olvidar los servicios downstream** — escalar tu API no sirve si tu cache o base de datos no pueden seguir
4. **Sin niveles de confianza en las suposiciones** — las campanas de marketing fracasan; construye escenarios para crecimiento alto, medio y bajo
5. **Esperar hasta el 90% de utilizacion** — para entonces ya estas en modo emergencia; planifica al 70%

## Preguntas Frecuentes

### A que plazo deberiamos pronosticar?

Doce meses es tipico para la planificacion de infraestructura, pero revisa trimestralmente. Mas alla de 12 meses, las suposiciones se convierten en conjeturas. Para startups de alto crecimiento, 6 meses puede ser mas realista. La clave no es el horizonte, sino la cadencia de revision.

### Que pasa si nos equivocamos?

Construye contingencias en el plan: auto-escalado para picos inesperados, instancias reservadas para carga base predecible, y un runbook documentado de escalado de emergencia. El objetivo no es una prediccion perfecta; es saber que hacer cuando la realidad diverge del pronostico.

### Quien deberia ser responsable de la planificacion de capacidad?

Los equipos de plataforma o SRE usualmente son propietarios del proceso, pero producto e ingenieria deben proporcionar las suposiciones de crecimiento. Finanzas deberia revisar las proyecciones de costo. Es un documento multifuncional, no un ejercicio individual.
