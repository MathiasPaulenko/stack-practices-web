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
  - /docs/templates/system-diagram-template
  - /guides/performance/performance-optimization-guide
  - /guides/devops/infrastructure-as-code-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Plantilla de planificación de capacidad con estimación de recursos, pronóstico de carga y estrategias de escalado para equipos de ingeniería."
  keywords:
    - template
---

## Mejores Prácticas

- **Planifica antes del cuello de botella** — La planificación de capacidad es proactiva, no reactiva. Si ya estás al 80% de utilización, llegaste tarde
- **Usa datos de pruebas de carga** — No adivines; ejecuta load tests para encontrar puntos de ruptura reales
- **Incluye un margen de seguridad** — Apunta a un margen de al menos 30-40% sobre la carga pico proyectada
- **Revisa trimestralmente** — Los supuestos de crecimiento cambian; revisa los planes cada trimestre
- **Documenta dependencias** — Un límite de réplicas de base de datos afecta la capacidad de la aplicación incluso si los servidores de app tienen CPU disponible
- **Modela tráfico burst** — Planifica para 2-3x el pico normal durante campañas de marketing o eventos virales
- **Considera retención de datos** — El almacenamiento crece continuamente incluso si el crecimiento de usuarios es plano

## Errores Comunes

- Usar carga promedio en vez de pico para planificar — los promedios ocultan los momentos que causan interrupciones
- Ignorar escalado no lineal — Algunos componentes se degradan más rápido después de un umbral (ej: contención de locks en BD)
- No involucrar a finanzas temprano — las aprobaciones de presupuesto sorpresa matan los cronogramas
- Olvidar ambientes no productivos — Staging y CI también necesitan capacidad
- Planificar solo compute e ignorar almacenamiento — la capacidad de disco se agota silenciosamente y mata servicios

## Preguntas Frecuentes

### ¿Qué tan lejos debo planificar?

Para sistemas estables, 12 meses es suficiente. Para productos de alto crecimiento o antes de lanzamientos mayores, planifica 18-24 meses con revisiones trimestrales.

### ¿Debería sobreaprovisionar o escalar bajo demanda?

Sobreaprovisiona rutas críticas (autenticación, procesamiento de pagos) y usa auto-scaling para cargas variables no críticas. El trade-off costo vs. confiabilidad depende de tu SLA.

### ¿Qué pasa si las proyecciones de crecimiento están equivocadas?

Construye flexibilidad en tu arquitectura (cargas de trabajo containerizadas, infraestructura como código) para que puedas pivotar entre escalado vertical y horizontal sin reescribir la aplicación.
