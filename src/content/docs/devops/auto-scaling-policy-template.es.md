---
contentType: docs
slug: auto-scaling-policy-template
title: "Plantilla de Política de Auto-Scaling"
description: "Una plantilla para documentar reglas de scale-up y scale-down para infraestructura en la nube."
metaDescription: "Usa esta plantilla de política de auto-scaling para definir reglas de escalamiento basadas en CPU, memoria y requests para cargas de trabajo en la nube."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - auto-scaling
  - cloud
  - infrastructure
  - policy
  - template
relatedResources:
  - /docs/capacity-planning-template
  - /docs/deployment-checklist-template
  - /docs/api-status-page-template
  - /docs/bug-report-template
  - /docs/contributing-guide
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de política de auto-scaling para definir reglas de escalamiento basadas en CPU, memoria y requests para cargas de trabajo en la nube."
  keywords:
    - devops
    - auto-scaling
    - cloud
    - infraestructura
    - política
    - plantilla
---
## Visión General

El auto-scaling es el puente entre eficiencia de costos y disponibilidad. Escalar demasiado tarde y tu servicio se cae bajo carga; escalar demasiado temprano y quemas dinero en capacidad ociosa. Esta plantilla documenta las reglas exactas, umbrales y procedimientos que tu equipo de infraestructura usa para escalar cargas de trabajo automáticamente hacia arriba y hacia abajo.

## Cuándo Usar

Usa este recurso cuando:
- Defines reglas de escalamiento para un nuevo servicio desplegado en la nube
- Auditas por qué un evento de auto-scaling causó una caída o costo excesivo
- Migras de tamaños de instancia estáticos a escalamiento live

## Solución

```markdown
# Política de Auto-Scaling: `<Nombre del Servicio>`

## 1. Metadatos del Servicio

| Campo | Valor |
|-------|-------|
| Servicio | `nombre` |
| Plataforma | `AWS / GCP / Azure / Kubernetes` |
| Equipo Responsable | `@team-name` |
| Última Revisión | `YYYY-MM-DD` |

## 2. Política de Scale-Up

### 2.1. Disparadores

| Métrica | Umbral | Duración | Acción de Escalamiento | Cooldown |
|---------|--------|----------|------------------------|----------|
| CPU utilization | > 60% | 2 minutos | Agregar 1 instancia | 3 minutos |
| Memory utilization | > 70% | 2 minutos | Agregar 1 instancia | 3 minutos |
| Request count | > 5,000 RPS | 1 minuto | Agregar 2 instancias | 5 minutos |
| Queue depth | > 100 mensajes | 3 minutos | Agregar 1 instancia | 3 minutos |
| Latency p95 | > 500ms | 2 minutos | Agregar 2 instancias | 5 minutos |

### 2.2. Límites

| Límite | Valor | Justificación |
|--------|-------|---------------|
| Máx instancias | 20 | Techo de costo, límite de conexiones DB |
| Máx scale-up por evento | 50% del actual | Prevenir thundering herd en cold start |
| Cooldown de scale-up | 3 minutos | Permitir estabilización de métricas |

## 3. Política de Scale-Down

### 3.1. Disparadores

| Métrica | Umbral | Duración | Acción de Escalamiento | Cooldown |
|---------|--------|----------|------------------------|----------|
| CPU utilization | < 30% | 10 minutos | Remover 1 instancia | 5 minutos |
| Memory utilization | < 30% | 10 minutos | Remover 1 instancia | 5 minutos |
| Request count | < 1,000 RPS | 10 minutos | Remover 1 instancia | 5 minutos |

### 3.2. Límites

| Límite | Valor | Justificación |
|--------|-------|---------------|
| Mín instancias | 3 | Redundancia, buffer para despliegue rolling |
| Máx scale-down por evento | 25% del actual | Evitar sobre-corrección |
| Cooldown de scale-down | 5 minutos | Permitir estabilización de métricas |

## 4. Requisitos de Instancia

### 4.1. Health Checks

- [ ] El health check del load balancer pasa antes de que la instancia reciba tráfico
- [ ] La instancia debe servir tráfico por mínimo 5 minutos antes de ser elegible para scale-down
- [ ] El connection draining permite completar requests en vuelo (30 segundos)

### 4.2. Warm-Up

- [ ] Las nuevas instancias completan inicialización (inicio de app, warm-up de caché) antes de unirse al pool
- [ ] Tiempo de warm-up documentado: `60 segundos`
- [ ] Startup probe / readiness probe configurado en el orquestador

## 5. Controles de Costo

| Control | Valor | Notas |
|---------|-------|-------|
| Gasto máximo por hora | $500 | Alertar si se excede |
| Tipo de instancia | `c5.large` | Optimizada para CPU para workload de API |
| Spot / Preemptible | 50% de instancias | Usar solo para procesamiento batch no crítico |
| Capacidad reservada | Línea base de 3 instancias | Descuento de compromiso para el mínimo |

## 6. Respuesta a Incidentes

| Escenario | Acción | Responsable |
|-----------|--------|-------------|
| Scale-up falla (cuota excedida) | Página on-call, escalar a admin de cloud | SRE |
| Scale-down causa errores | Pausar auto-scaling, investigar | Plataforma |
| Pico de costo > 2x línea base | Revisar política, verificar jobs desbocados | Finanzas + SRE |
| Latencia sube a pesar del escalamiento | Alerta: probable cuello de botella de DB, no compute | DBA + App Team |
```

## Explicación

La plantilla separa **scale-up** (rápido, agresivo) de **scale-down** (lento, conservador). Los disparadores de scale-up usan duraciones más cortas porque necesitas capacidad antes de que ocurran fallas. El scale-down usa duraciones más largas para evitar fluctuar instancias entrando y saliendo durante jitter normal de tráfico. El **cooldown** previene que el auto-scaler reaccione al ruido de métricas causado por el propio evento de escalamiento. Las **instancias mínimas** existen por redundancia: incluso con tráfico cero, necesitas suficientes instancias para sobrevivir un despliegue rolling sin downtime.

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Kubernetes HPA | Métricas via custom metrics API | Escalar en métricas custom (profundidad de cola, latencia de request) |
| AWS EC2 Auto Scaling | Alarmas de CloudWatch | Usar predictive scaling para patrones conocidos |
| Serverless (Lambda) | Límites de concurrencia | No hay escalamiento tradicional; gestionar max concurrency y reserved concurrency |
| Workloads GPU | Escalar en GPU utilization | Warm-up más largo, costo más alto; evitar instancias spot |

## Lo que funciona

1. Siempre establecer límites máximos de instancias para prevenir escalamiento desbocado por loops infinitos o DDoS
2. Usar predictive scaling para patrones de tráfico predecibles (batch nocturno, horario comercial)
3. Testear eventos de scale-up y scale-down en staging antes de producción
4. Monitorear frecuencia de eventos de escalamiento; eventos frecuentes indican mala configuración de umbrales
5. Documentar por qué se eligió cada umbral para que equipos futuros puedan ajustar inteligentemente

## Errores Comunes

1. Establecer umbral de CPU al 80% o más, dejando sin margen para picos
2. Usar la misma política para todos los servicios sin importar sus patrones de workload
3. Olvidar el connection draining, causando requests dropeadas durante scale-down
4. Escalar solo en CPU e ignorar memoria, red o métricas custom
5. Permitir scale-down a cero para servicios stateful que necesitan conexiones persistentes

## Preguntas Frecuentes

### ¿Debería escalar por CPU o por requests por segundo?

CPU funciona para workloads compute-bound (procesamiento de imágenes, inferencia de ML). RPS funciona para workloads I/O-bound (APIs, proxies). Usa métricas custom (profundidad de cola, latencia) cuando ni CPU ni RPS correlacionan con la experiencia de usuario. Las mejores políticas usan múltiples métricas con lógica OR.

### ¿Qué es predictive scaling y cuándo debo usarlo?

El predictive scaling (AWS, GCP) usa tráfico histórico para precalentar instancias antes de que llegue el pico. Úsalo para patrones predecibles: picos diarios, jobs batch semanales o campañas de marketing. No lo uses para tráfico viral impredecible.

### ¿Cómo evito explosiones de costo por auto-scaling?

Establece un conteo máximo hard de instancias. Usa alertas de presupuesto. Revisa tipos de instancia trimestralmente (una generación más nueva puede ser más barata y rápida). Usa instancias reservadas para capacidad de línea base y auto-scaling para overflow. Etiqueta instancias por servicio para que finanzas pueda atribuir costos con precisión.
