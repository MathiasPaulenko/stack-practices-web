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
  - /docs/production-readiness-review-template
  - /docs/feature-specification-template
  - /docs/monitoring-alerting-policy-template
  - /docs/infrastructure-cost-allocation-template
  - /docs/load-test-execution-plan-template
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


- For alternatives, see [Capacity Planning — Forecast, Scale](/es/guides/capacity-planning-guide/).

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

## Ejemplo de Dashboard de Forecast de Capacidad

```text
=== Dashboard de Forecast de Capacidad — Q3 2026 ===

ESTADO ACTUAL (al 2026-07-11):
  Utilizacion CPU (prom):    42%
  Utilizacion CPU (pico):    68%
  Utilizacion Memoria (prom): 55%
  Utilizacion Memoria (pico): 78%
  Uso de disco:              3.2 TB / 5 TB (64%)
  Throughput de red (prom):  120 Mbps
  Throughput de red (pico):  450 Mbps
  Conexiones DB (prom):      45 / 100
  Conexiones DB (pico):      82 / 100

SUPUESTOS DE CRECIMIENTO:
  Tasa de crecimiento de usuarios:  8% / mes (basado en ultimos 6 meses)
  Tasa de crecimiento de trafico:   12% / mes (trafico crece mas rapido que usuarios)
  Tasa de crecimiento de datos:     50 GB / mes
  Factor de pico estacional:        2.5x (Black Friday, temporada navidena)

PROYECCION A 6 MESES:
  Mes      | CPU Pico | Mem Pico | Disco   | DB Conn Pico
  ---------|----------|----------|---------|-------------
  Ago 2026 | 72%      | 82%      | 3.7 TB  | 88
  Sep 2026 | 78%      | 86%      | 4.2 TB  | 94
  Oct 2026 | 85%      | 91%      | 4.7 TB  | 102 (SOBRE!)
  Nov 2026 | 95%      | 96%      | 5.2 TB  | 115 (SOBRE!)
  Dic 2026 | 98%      | 98%      | 5.7 TB  | 125 (SOBRE!)
  Ene 2027 | 100%+    | 100%+    | 6.2 TB  | 140 (SOBRE!)

BOTTLENECK: Conexiones de DB alcanzan limite en Octubre 2026
ACCION: Aumentar pool de conexiones a 200 para Septiembre 2026

BOTTLENECK: Disco alcanza limite de 5 TB en Noviembre 2026
ACCION: Agregar 3 TB de almacenamiento para Octubre 2026

BOTTLENECK: CPU alcanza 90% en Noviembre 2026 (pico estacional)
ACCION: Agregar 4 instancias al auto-scaling group para Octubre 2026
```


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


### Como hacemos forecast para picos de trafico estacionales?

Analiza datos historicos de trafico para patrones estacionales: compras navidenas, temporada de impuestos, vuelta a la escuela, o eventos especificos de la industria. Identifica el multiplicador de pico (ej., 2.5x trafico normal). Planifica capacidad para el pico, no el promedio. Pre-escala antes de que comience la temporada — escalar toma tiempo, y hacerlo durante el pico es demasiado tarde. Usa instancias reservadas para la carga base y on-demand para el pico estacional. Despues de la temporada, escala hacia abajo y revisa la precision del forecast. Documenta el real vs. proyectado para planificacion futura. Configura alertas que se disparen al 70% de la capacidad del pico estacional.

### Cual es la diferencia entre escalado vertical y horizontal?

Escalado vertical (escalar hacia arriba) significa agregar mas recursos a instancias existentes (mas CPU, mas RAM). Es mas simple pero tiene un limite duro — el tamano maximo de instancia. A menudo requiere downtime. Escalado horizontal (escalar hacia afuera) significa agregar mas instancias. Es mas complejo (requiere load balancing, servicios stateless) pero no tiene limite teorico. La mayoria de los sistemas usan una combinacion: vertical para bases de datos (que son dificiles de escalar horizontalmente), horizontal para servicios stateless (que son faciles de escalar). Planifica para ambos en tu forecast de capacidad.

### Como manejamos la planificacion de capacidad para arquitecturas serverless?

Para serverless: rastrea conteo de invocaciones, ejecuciones concurrentes, y frecuencia de cold-start. Monitorea cuotas de servicio (AWS Lambda: 1000 ejecuciones concurrentes por defecto). Pronostica basado en la tasa de crecimiento de requests, no CPU o memoria. Planifica para cold starts durante picos de trafico — pre-calienta funciones si es necesario. Considera provisioned concurrency para caminos sensibles a latencia. Monitorea costo por invocacion — los costos serverless pueden escalar super-linealmente con el trafico. Incluye configuracion de timeout y memoria en el plan de capacidad. Documenta el comportamiento de escalado y los limites de cada servicio serverless en uso.

### Como comunicamos necesidades de capacidad al liderazgo?

Traduce metricas tecnicas a terminos de negocio: "Al crecimiento actual, nos quedaremos sin capacidad de base de datos en Octubre. Esto causara respuestas lentas para el 30% de los usuarios. La solucion cuesta $5,000/mes y toma 3 semanas implementar." Usa la tabla de proyeccion de costos para mostrar el costo de inaccion vs. el costo de accion. Incluye un cronograma con fechas limite. Usa ayudas visuales — un grafico mostrando utilizacion tendiendo hacia 100% es mas convincente que una tabla. Presenta el forecast en la revision mensual de ingenieria, no como emergencia cuando la capacidad ya esta agotada. Conecta capacidad a metricas de negocio (usuarios, ingresos, transacciones).

### Que herramientas ayudan con la planificacion de capacidad?

Herramientas utiles: Dashboards de proveedor cloud (AWS CloudWatch, GCP Monitoring, Azure Monitor) para metricas actuales. Datadog o New Relic para observabilidad unificada. Kubernetes metrics-server y cluster autoscaler para workloads en contenedores. Terraform para infraestructura como codigo (para provisionar capacidad rapidamente). Herramientas de gestion de costos (AWS Cost Explorer, CloudHealth) para proyecciones de costos. Modelos de hoja de calculo para forecasting (simple pero efectivo). Grafana para dashboards personalizados de capacidad. La mejor herramienta es una que se integra con tu monitoreo existente y proporciona datos historicos para analisis de tendencias.



































End of document. Review and update quarterly.