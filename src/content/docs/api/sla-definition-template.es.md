---
contentType: docs
slug: sla-definition-template
title: "Plantilla de Definicion de SLA"
description: "Plantilla para definir y documentar Acuerdos de Nivel de Servicio incluyendo objetivos de uptime, tiempos de respuesta, presupuestos de error y procedimientos de escalamiento."
metaDescription: "Define Acuerdos de Nivel de Servicio con esta plantilla de SLA. Cubre objetivos de uptime, tiempos de respuesta, presupuestos de error y escalamiento."
difficulty: intermediate
topics:
  - api
  - architecture
  - devops
tags:
  - sla
  - acuerdo-de-nivel-de-servicio
  - uptime
  - disponibilidad
  - sre
  - plantilla
relatedResources:
  - /docs/devops/escalation-policy-template
  - /docs/devops/performance-regression-template
  - /docs/devops/auto-scaling-policy-template
  - /docs/devops/downtime-communication-template
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Define Acuerdos de Nivel de Servicio con esta plantilla de SLA. Cubre objetivos de uptime, tiempos de respuesta, presupuestos de error y escalamiento."
  keywords:
    - sla
    - acuerdo de nivel de servicio
    - objetivo de uptime
    - disponibilidad
    - presupuesto de error
    - sre
---

## Resumen

Un SLA sin presupuesto de error es solo una promesa que eventualmente romperas. Los equipos de ingenieria necesitan objetivos medibles concretos que equilibren confiabilidad y velocidad. Esta plantilla define compromisos de uptime, latencia y tasa de error — mas los presupuestos de error que permiten a los equipos lanzar cambios mientras respetan esos compromisos.

## Cuando Usar

Usa este recurso cuando:
- Lances un servicio de produccion del que dependen consumidores externos
- Negocies garantias contractuales con clientes enterprise
- Definas objetivos internos de confiabilidad para equipos de plataforma
- Establezcas practicas de SRE y rotaciones de guardia

## Solucion

```markdown
# Acuerdo de Nivel de Servicio: `<Nombre del Servicio>`

**Fecha de Efectividad:** `2026-07-01`
**Ciclo de Revision:** `Trimestral`
**Equipo Responsable:** `@equipo-plataforma`

## 1. Objetivos de Nivel de Servicio (SLOs)

| Metrica | Objetivo | Ventana de Medicion | Fuente de Datos |
|---------|----------|---------------------|-----------------|
| Disponibilidad | 99.9% | 30 dias rodante | Health checks del balanceador de carga |
| Latencia p95 | < 200ms | Por minuto | Metricas de aplicacion (Prometheus) |
| Latencia p99 | < 500ms | Por minuto | Metricas de aplicacion (Prometheus) |
| Tasa de Error | < 0.1% | 7 dias rodante | Logs de aplicacion + APM |
| Throughput | > 1,000 req/s | Por minuto | Metricas del balanceador de carga |

## 2. Indicadores de Nivel de Servicio (SLIs)

| SLI | Eventos Buenos | Eventos Validos | Calculo |
|-----|----------------|-----------------|---------|
| Disponibilidad | Health checks exitosos | Todos los health checks | Buenos / Validos |
| Latencia p95 | Solicitudes < 200ms | Todas las solicitudes | Percentil de validos |
| Tasa de Error | Respuestas con estado < 500 | Todas las respuestas | 1 - (errores / total) |

## 3. Presupuesto de Error

| SLO | Objetivo | Presupuesto de Error (30 dias) | Alerta de Tasa de Quema |
|-----|----------|-------------------------------|-------------------------|
| 99.9% disponibilidad | 43.8 minutos de downtime | 2% de presupuesto en 1 dia = critica |
| < 0.1% tasa de error | 0.43% de tasa de error permitida | 10% de presupuesto en 1 dia = advertencia |

### Alertas de Tasa de Quema

| Tasa de Quema | Presupuesto Consumido | Accion |
|---------------|----------------------|--------|
| 1x | Normal | Monitorear |
| 2x | 2x mas rapido de lo esperado | Llamar al de guardia (advertencia) |
| 10x | 10x mas rapido de lo esperado | Llamar al de guardia + congelar deploys (critica) |

## 4. Tiempos de Respuesta y Resolucion

| Severidad | Definicion | Tiempo de Respuesta | Objetivo de Resolucion | Escalamiento |
|-----------|------------|--------------------|------------------------|--------------|
| P1 (Critica) | Caida completa del servicio | 15 minutos | 2 horas | VP de Ingenieria |
| P2 (Alta) | Rendimiento degradado, workaround existe | 1 hora | 8 horas | Gerente de Ingenieria |
| P3 (Media) | Fallo parcial de funcion | 4 horas | 3 dias habiles | Lider de Equipo |
| P4 (Baja) | Problema cosmético, sin impacto de negocio | 1 dia habil | Proximo sprint | Cola de tickets |

## 5. Exclusiones

Las siguientes situaciones se excluyen de los calculos de SLA:
- **Mantenimiento programado:** Hasta 4 horas/mes con aviso de 7 dias
- **Caidas de terceros:** Dependencias fuera de nuestro control (proveedor cloud, pasarela de pagos)
- **Fuerza mayor:** Desastres naturales, actos de guerra, fallas de backbone de internet
- **Problemas del cliente:** Bugs del consumidor, violaciones de rate limit, solicitudes invalidas

## 6. Penalizaciones y Creditos

| Uptime Mensual | Credito de Servicio | Disparador |
|----------------|--------------------|------------|
| 99.0% - 99.9% | 10% de tarifa mensual | Automatico, sin solicitud requerida |
| 95.0% - 99.0% | 25% de tarifa mensual | Automatico |
| < 95.0% | 50% de tarifa mensual | Automatico + postmortem obligatorio |

## 7. Plan de Comunicacion

| Evento | Audiencia | Canal | Tiempo |
|--------|-----------|-------|--------|
| Degradacion detectada | Equipos internos | PagerDuty + Slack | Inmediato |
| Inicio de outage P1 | Clientes | Pagina de estado + email | Dentro de 30 minutos |
| P1 resuelto | Clientes | Actualizacion de pagina de estado | Dentro de 15 minutos de resolucion |
| Reporte mensual de SLA | Clientes | Email | Dentro de 5 dias habiles del fin de mes |

## 8. Revision y Revision

- **Revision trimestral:** Ingenieria + Producto + Customer Success
- **Revision por disparador:** Cualquier incidente P1 o falla de SLA dispara una revision ad-hoc
- **Proceso de revision:** Los cambios propuestos requieren aviso de 14 dias a clientes afectados
```

## Explicacion

La plantilla separa **objetivos** (lo que prometes) de **indicadores** (como mides) y **presupuestos de error** (cuanto fallo es aceptable). Sin presupuestos de error, los equipos o sobre-ingenierian buscando perfeccion o despliegan imprudentemente. Las alertas de tasa de quema traducen porcentajes abstractos en acciones concretas: a 10x de tasa de quema, detener despliegues y arreglar el problema.

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| SaaS Publico | SLA estricto con creditos automaticos | La confianza del cliente es una ventaja competitiva |
| Plataforma interna | SLA relajado, enfocado en SLOs | Los equipos internos necesitan confiabilidad, no contratos legales |
| Contrato enterprise | SLA personalizado por trato | Negociado individualmente con aprobacion legal |

## Lo que funciona

1. **Comenzar con SLOs internos antes de publicar SLAs** — un SLA es una promesa, un SLO es un objetivo
2. **Usar percentiles, no promedios** — la latencia p95 revela lo que los usuarios reales experimentan
3. **Medir desde la perspectiva del consumidor** — disponibilidad no es solo "servidor arriba" sino "solicitud exitosa"
4. **Revisar trimestralmente** — los servicios evolucionan, los objetivos deben evolucionar con ellos
5. **Publicar estado en tiempo real** — una pagina de estado publica construye confianza durante incidentes

## Errores Comunes

1. **Establecer 100% de disponibilidad como objetivo** — imposible y costoso, lleva al burnout
2. **Medir uptime del servidor en lugar de tasa de exito de solicitudes** — el servidor puede estar arriba mientras la app falla
3. **Ignorar latencia en los SLAs** — lento es el nuevo caido
4. **No definir presupuestos de error** — los equipos no tienen marco para equilibrar confiabilidad y cambios
5. **Hacer las revisiones de SLA solo reactivas** — programar revisiones trimestrales incluso cuando todo esta verde

## Preguntas Frecuentes

### Cual es la diferencia entre SLA, SLO y SLI?

- **SLI (Indicador):** La metrica que mides (ej. tasa de exito de solicitudes)
- **SLO (Objetivo):** El objetivo para esa metrica (ej. 99.9% de tasa de exito)
- **SLA (Acuerdo):** El contrato con consecuencias (ej. 99.9% o 10% de credito)

### Como calculo el presupuesto de error?

Presupuesto de error = 100% - Objetivo SLO. Para 99.9% de disponibilidad, el presupuesto de error es 0.1% de la ventana de medicion. En 30 dias, eso son 43.8 minutos de downtime aceptable.

### Deberia incluir latencia en el SLA?

Si, pero se realista. Un objetivo de latencia p95 de 200ms es alcanzable para la mayoria de APIs. Objetivos por debajo de 50ms requieren inversion importante en infraestructura y pueden no ser rentables.

### Que pasa si quemamos todo el presupuesto de error antes de que termine la ventana?

Congelar despliegues no criticos y priorizar trabajo de confiabilidad hasta que el presupuesto se recupere. Este es el principio central de SRE: las politicas de presupuesto de error deben impulsar las prioridades de ingenieria.
