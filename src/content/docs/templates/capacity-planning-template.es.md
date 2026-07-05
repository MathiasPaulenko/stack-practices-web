---
contentType: docs
slug: capacity-planning-template
templateType: capacity-planning
title: "Plantilla de Planificación de Capacidad"
description: "Una plantilla reutilizable para planificar capacidad del sistema, estimar crecimiento y prevenir cuellos de botella de rendimiento antes de que ocurran."
metaDescription: "Plantilla de planificación de capacidad con estimación de recursos, pronóstico de carga y estrategias de escalado para equipos de ingeniería."
difficulty: intermediate
topics:
  - performance
  - infrastructure
  - devops
tags:
  - capacity-planning
  - template
  - scalability
  - performance
  - infrastructure
  - resource-estimation
  - devops
relatedResources:
  - /docs/system-diagram-template
  - /guides/performance/performance-optimization-guide
  - /guides/devops/infrastructure-as-code-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Plantilla de planificación de capacidad con estimación de recursos, pronóstico de carga y estrategias de escalado para equipos de ingeniería."
  keywords:
    - template
    - capacity-planning
    - scalability
    - performance
    - infrastructure

---

## Resumen

La planificación de capacidad responde una pregunta simple: ¿nuestros sistemas manejarán la carga que esperamos en los próximos 12-24 meses? La respuesta requiere datos, no suposiciones. Esta plantilla te ayuda a recolectar esos datos, estimar crecimiento y planificar escalado antes de que los cuellos de botella lleguen a producción.

La plantilla cubre:

1. **Línea base actual de recursos** — qué tienes ahora y cuánto se usa
2. **Proyecciones de crecimiento** — estimaciones de tráfico, datos y usuarios
3. **Análisis de cuellos de botella** — qué componente se romperá primero
4. **Plan de escalado** — qué agregar, cuándo y cuánto cuesta
5. **Cronograma de revisión** — cuándo revisar y ajustar

## Plantilla

```markdown
# Plan de Capacidad: [Nombre del Sistema]

## 1. Línea Base Actual (al [fecha])

### Recursos de Compute

| Servicio | Tipo de instancia | Cantidad | CPU avg | CPU pico | Memoria avg | Memoria pico | Notas |
|----------|-------------------|----------|---------|----------|-------------|--------------|-------|
| Servidores API | c6i.xlarge | 6 | 35% | 72% | 45% | 68% | Auto-scaling 4-10 |
| Workers | c6i.large | 4 | 20% | 55% | 30% | 50% | Batch processing |
| Dashboard | t3.medium | 2 | 15% | 40% | 25% | 45% | Static + SSR |

### Recursos de Base de Datos

| Cluster | Tipo | Storage usado | Storage capacity | Conexiones avg | Conexiones pico | Lag replicación |
|---------|------|---------------|------------------|----------------|-----------------|-----------------|
| Primario | r6i.2xlarge | 340 GB | 500 GB | 80 | 140 | — |
| Réplica 1 | r6i.large | 340 GB | 500 GB | 45 | 90 | < 1s |
| Réplica 2 | r6i.large | 340 GB | 500 GB | 30 | 60 | < 1s |

### Red

| Métrica | Avg actual | Pico actual | Límite | Margen |
|---------|-----------|-------------|--------|--------|
| Ancho de banda in | 120 Mbps | 280 Mbps | 1 Gbps | 72% |
| Ancho de banda out | 200 Mbps | 450 Mbps | 1 Gbps | 55% |
| Requests/seg | 8,000 | 18,000 | 25,000 | 28% |

### Crecimiento de Storage

| Dataset | Tamaño actual | Rate de crecimiento | Proyectado en 12 meses | Política de retención |
|---------|---------------|---------------------|------------------------|----------------------|
| Datos de usuario | 12 GB | 0.5 GB/mes | 18 GB | Indefinida |
| Pedidos | 45 GB | 3 GB/mes | 81 GB | 7 años (legal) |
| Audit logs | 120 GB | 8 GB/mes | 216 GB | 90 días hot, 1 año cold |
| Media uploads | 800 GB | 40 GB/mes | 1,280 GB | Indefinida |

## 2. Proyecciones de Crecimiento

### Proyecciones de Tráfico

| Métrica | Actual (mensual) | Q+1 | Q+2 | Q+3 | Q+4 | Fuente |
|---------|-------------------|-----|-----|-----|-----|--------|
| Usuarios activos | 50,000 | 58,000 | 67,000 | 78,000 | 90,000 | Roadmap de producto |
| Requests API | 24M | 28M | 33M | 38M | 44M | 15% MoM growth |
| RPS pico | 18,000 | 21,000 | 24,000 | 28,000 | 32,000 | Load tests |
| Storage agregado | 51 GB | 52 GB | 53 GB | 54 GB | 55 GB | Tendencia lineal |

### Supuestos

- Crecimiento de usuarios: 15% mes-over-mes (basado en últimos 6 meses)
- Requests API por usuario: estable en ~480/mes
- Tráfico pico: 2.5x promedio (basado en datos de load tests)
- Campañas de marketing: lanzamiento Q3 puede causar burst 3x por 2 semanas
- No hay cambios arquitectónicos mayores planificados

### Factores de riesgo

- **Lanzamiento Q3** — marketing espera burst 3x por 2 semanas. Planificar para 50k RPS pico.
- **Temporada navideña** — histórico 2x tráfico en noviembre-diciembre.
- **Nuevo cliente enterprise** — pipeline de ventas incluye contrato enterprise de 10k usuarios (Q2). Añadiría 20% a la base de usuarios de un día para el otro.

## 3. Análisis de Cuellos de Botella

| Componente | Límite actual | Punto de ruptura proyectado | Cuándo | Mitigación |
|------------|---------------|----------------------------|--------|------------|
| Servidores API (CPU) | 25k RPS | ~28k RPS a eficiencia actual | Q3 | Agregar 2 instancias + optimizar hot paths |
| Conexiones BD | 200 max | ~180 al pico proyectado | Q2 | Agregar réplica + connection pooling |
| Storage BD primaria | 500 GB | ~480 GB en 12 meses | Q4 | Provisionar 1 TB o particionar datos viejos |
| Ancho de banda out | 1 Gbps | ~800 Mbps al pico proyectado | Q3 | Upgrade a 2 Gbps o agregar CDN |
| Storage audit logs | 500 GB asignado | ~480 GB en 12 meses | Q4 | Mover a cold storage (S3 Glacier) |

## 4. Plan de Escalado

### Q1 (trimestre actual)

| Acción | Componente | Costo (mensual) | Justificación |
|--------|-----------|-----------------|---------------|
| Agregar 2 instancias API | Servidores API | $480 | Margen para crecimiento Q2 |
| Habilitar connection pooling | BD | $0 (config change) | Prevenir agotamiento de conexiones |
| Set up CDN para media | Red | $200 | Reducir presión de ancho de banda |

### Q2

| Acción | Componente | Costo (mensual) | Justificación |
|--------|-----------|-----------------|---------------|
| Agregar réplica 3 | BD | $320 | Tráfico de lectura del cliente enterprise |
| Upgrade ancho de banda a 2 Gbps | Red | $150 | Preparación burst de lanzamiento Q3 |
| Implementar archival de audit logs | Storage | $50 (Glacier) | Prevenir agotamiento de storage |

### Q3

| Acción | Componente | Costo (mensual) | Justificación |
|--------|-----------|-----------------|---------------|
| Agregar 4 instancias API (burst pool) | Servidores API | $960 | Lanzamiento de producto 3x tráfico |
| Agregar 2 instancias worker | Workers | $240 | Batch processing para nuevos usuarios |
| Provisionar 1 TB storage BD | BD | $200 | Crecimiento de storage + particionamiento |

### Q4

| Acción | Componente | Costo (mensual) | Justificación |
|--------|-----------|-----------------|---------------|
| Evaluar particionamiento BD | BD | Eng time | Tabla de pedidos creciendo rápido |
| Agregar CDN edge en APAC | Red | $300 | Crecimiento de usuarios en Asia |

### Aumento proyectado de costo total

| Trimestre | Costo mensual adicional |
|-----------|------------------------|
| Q1 | $680 |
| Q2 | $520 |
| Q3 | $1,400 |
| Q4 | $300 |
| **Aumento anual total** | **$2,900/mes promedio** |

## 5. Cronograma de Revisión

| Revisión | Fecha | Owner | Foco |
|----------|-------|-------|------|
| Revisión Q1 | 2026-04-01 | Platform team | Validar acciones Q1, ajustar plan Q2 |
| Revisión Q2 | 2026-07-01 | Platform team | Capacity check post-lanzamiento |
| Revisión Q3 | 2026-10-01 | Platform team | Prep navideña, ajustes Q4 |
| Revisión Q4 | 2027-01-01 | Platform team | Recap anual, plan próximo año |
```

## Lo que funciona

- **Planifica antes del cuello de botella** — La planificación de capacidad es proactiva, no reactiva. Si ya estás al 80% de utilización, llegaste tarde
- **Usa datos de pruebas de carga** — No adivines; ejecuta [load tests](/recipes/testing/load-testing) para encontrar puntos de ruptura reales
- **Incluye un margen de seguridad** — Apunta a un margen de al menos 30-40% sobre la carga pico proyectada
- **Revisa trimestralmente** — Los supuestos de crecimiento cambian; revisa los planes cada trimestre
- **Documenta dependencias** — Un límite de réplicas de base de datos afecta la capacidad de la aplicación incluso si los servidores de app tienen CPU disponible. Consulta la [Plantilla de Diagramas de Sistema](/docs/templates/adr-template) para mapear dependencias.
- **Modela tráfico burst** — Planifica para 2-3x el pico normal durante campañas de marketing o eventos virales
- **Considera retención de datos** — El almacenamiento crece continuamente incluso si el crecimiento de usuarios es plano
- **Incluye proyecciones de costo** — Las decisiones de capacidad tienen impacto presupuestario. Finanzas necesita tiempo
- **Trackea actuals vs proyecciones** — Compara crecimiento predicho vs actual cada trimestre. Ajusta tu modelo.

## Errores Comunes

- Usar carga promedio en vez de pico para planificar — los promedios ocultan los momentos que causan interrupciones
- Ignorar escalado no lineal — Algunos componentes se degradan más rápido después de un umbral (ej: contención de locks en BD)
- No involucrar a finanzas temprano — las aprobaciones de presupuesto sorpresa matan los cronogramas
- Olvidar ambientes no productivos — Staging y CI también necesitan capacidad
- Planificar solo compute e ignorar almacenamiento — la capacidad de disco se agota silenciosamente y mata servicios
- Asumir crecimiento lineal indefinidamente — las tasas de crecimiento cambian; revisa supuestos trimestralmente
- Ignorar límites de conexiones — bases de datos y load balancers tienen límites hard de conexiones que se alcanzan antes que CPU o memoria
- No planificar rollback — si escalas y luego el tráfico baja, ¿puedes escalar hacia abajo?

## Variantes

### Cloud-native (auto-scaling)

En entornos cloud con auto-scaling, la planificación de capacidad se enfoca en setear umbrales y límites de escalado correctos en vez de pre-provisionar. Trackea: min/max de instancias, cooldown periods de escalado, y tiempo de warm-up de instancias. El riesgo es el lag de escalado — auto-scaling reacciona después de que la carga aumenta, así que igual necesitas margen.

### On-premise (capacidad fija)

On-premise requiere mayores lead times para procurement de hardware (4-8 semanas). Planifica con 6 meses de anticipación. Mantén un inventario de hardware con edad y fechas de reemplazo esperadas. Las decisiones de capacidad son más difíciles de revertir.

### Serverless (pay-per-use)

Serverless reduce la planificación de capacidad para compute pero introduce nuevas restricciones: latencia de cold start, límites de ejecución concurrente, y timeouts por función. Planifica para: concurrencia pico, asignación de memoria por invocación, y costo total al volumen proyectado.

## Preguntas Frecuentes

### ¿Qué tan lejos debo planificar?

Para sistemas estables, 12 meses es suficiente. Para productos de alto crecimiento o antes de lanzamientos mayores, planifica 18-24 meses con revisiones trimestrales.

### ¿Debería sobreaprovisionar o escalar bajo demanda?

Sobreaprovisiona rutas críticas (autenticación, procesamiento de pagos) y usa auto-scaling para cargas variables no críticas. El trade-off costo vs. confiabilidad depende de tu SLA.

### ¿Qué pasa si las proyecciones de crecimiento están equivocadas?

Construye flexibilidad en tu arquitectura (cargas de trabajo containerizadas, [infraestructura como código](/guides/devops/infrastructure-as-code-guide)) para que puedas pivotar entre escalado vertical y horizontal sin reescribir la aplicación.

### ¿Cómo estimo el crecimiento de storage?

Revisa datos históricos. Si tienes 6+ meses de métricas de storage, calcula la tasa de crecimiento mensual y proyecta hacia adelante. Considera nuevas features que pueden agregar storage-por-usuario (ej: uploads de archivos, audit logging). En caso de duda, agrega 20% de buffer.

### ¿Debería incluir capacidad de disaster recovery?

Sí. La capacidad de DR es parte de tu plan de capacidad. Si tu sitio de DR necesita manejar el 100% de la carga de producción, necesita la misma capacidad. Si solo maneja 50% (modo degradado), documentalo explícitamente.

### ¿Cómo manejo picos súbitos de tráfico (eventos virales)?

Set up auto-scaling con upper bounds agresivos, usa CDN para contenido estático, e implementa rate limiting para proteger servicios backend. Pre-calienta instancias antes de eventos planificados. Para picos no planificados, ten un runbook que describa cómo agregar capacidad manualmente y habilitar modos degradados. Consulta [Circuit Breaker Pattern](/patterns/design/circuit-breaker-pattern) para estrategias de degradación.

### ¿Qué herramientas debo usar para planificación de capacidad?

Usa tu sistema de monitoreo (Prometheus, Datadog, CloudWatch) para datos históricos. Usa herramientas de load testing (k6, Locust, JMeter) para datos de puntos de ruptura. Usa spreadsheets o herramientas dedicadas de capacity planning (Kubecost para Kubernetes, AWS Compute Optimizer) para proyecciones. La herramienta importa menos que la disciplina de revisar regularmente.
