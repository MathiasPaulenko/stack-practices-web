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

## Configuracion de Auto Scaling en AWS con Terraform

```hcl
resource "aws_autoscaling_group" "app" {
  name                = "app-asg"
  vpc_zone_identifier = data.aws_subnets.private.ids
  min_size            = 3
  max_size            = 20
  desired_capacity    = 5

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  tag {
    key                 = "Team"
    value               = "platform"
    propagate_at_launch = true
  }
}

resource "aws_autoscaling_policy" "scale_up" {
  name                   = "scale-up"
  autoscaling_group_name = aws_autoscaling_group.app.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = 2
  cooldown               = 300
}

resource "aws_autoscaling_policy" "scale_down" {
  name                   = "scale-down"
  autoscaling_group_name = aws_autoscaling_group.app.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = -1
  cooldown               = 600
}

resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Average"
  threshold           = 70
  alarm_actions       = [aws_autoscaling_policy.scale_up.arn]
}

resource "aws_cloudwatch_metric_alarm" "low_cpu" {
  alarm_name          = "low-cpu"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 10
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Average"
  threshold           = 30
  alarm_actions       = [aws_autoscaling_policy.scale_down.arn]
}
```

## HPA de Kubernetes con Metricas Personalizadas

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 30
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "1000"
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 100
          periodSeconds: 60
        - type: Pods
          value: 4
          periodSeconds: 60
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 25
          periodSeconds: 120
      selectPolicy: Min
```

## Consulta para Dashboard de Eventos de Scaling

```text
=== Log de Eventos de Scaling (Ultimas 24h) ===

Hora         Direccion   Trigger              De -> A      Duracion
02:15 UTC    Scale UP    CPU > 70% (2 min)    5 -> 7       45s warm-up
02:45 UTC    Scale UP    CPU > 70% (2 min)    7 -> 9       42s warm-up
04:30 UTC    Scale DOWN  CPU < 30% (10 min)   9 -> 8       15s drain
08:00 UTC    Scale UP    RPS > 1000 (1 min)   8 -> 12      38s warm-up
08:30 UTC    Scale UP    RPS > 1000 (1 min)   12 -> 16     41s warm-up
10:00 UTC    Scale DOWN  CPU < 30% (10 min)   16 -> 14     12s drain
14:00 UTC    Scale DOWN  CPU < 30% (10 min)   14 -> 10     18s drain
18:00 UTC    Scale DOWN  CPU < 30% (10 min)   10 -> 8      15s drain
22:00 UTC    Scale DOWN  CPU < 30% (10 min)   8 -> 5       20s drain

Eventos totales: 9
Scale-up: 4 (warm-up promedio: 41s)
Scale-down: 5 (drain promedio: 16s)
Thrashing detectado: No (min 2h entre eventos opuestos)
```


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


### Como manejamos scaling para servicios con estado?

Los servicios con estado (bases de datos, caches con persistencia) no deben usar auto-scaling estandar. En su lugar, usa read replicas para escalar lecturas y scaling vertical (instancias mas grandes) para capacidad de escritura. Si debes escalar servicios con estado horizontalmente, usa sticky sessions o consistent hashing para distribuir la carga. Nunca permitas scale-down a cero para servicios con estado. Documenta la estrategia de scaling separadamente de los servicios sin estado.

### Que es step scaling vs target tracking?

Target tracking mantiene un valor objetivo de metrica (ej. 70% CPU) ajustando capacidad automaticamente. Es mas simple y requiere menos ajuste. Step scaling usa alarmas de CloudWatch con ajustes especificos (ej. +2 instancias cuando CPU > 70%, +4 cuando > 85%). Ofrece mas control pero requiere mas configuracion. Usa target tracking para la mayoria de workloads. Usa step scaling cuando necesitas diferentes respuestas en diferentes umbrales.

### Como probamos las politicas de auto-scaling?

1. Despliega la politica en staging. 2. Genera carga con herramientas como k6, Locust o Artillery. 3. Verifica que scale-up se dispare en el umbral y ventana de tiempo esperados. 4. Deten la carga y verifica scale-down despues del cooldown. 5. Comprueba que las nuevas instancias pasen health checks antes de recibir trafico. 6. Verifica que connection draining funcione durante scale-down. 7. Monitorea el impacto en costos. 8. Documenta los resultados y ajusta umbrales si es necesario.

### Que es el warm-up time y por que importa?

El warm-up time es el retraso entre el inicio de una instancia y su disponibilidad para servir trafico. Durante el warm-up, la instancia consume recursos pero no maneja requests. Para aplicaciones JVM, el warm-up puede ser 60-120 segundos debido a compilacion JIT. Para servicios en contenedores, 10-30 segundos es tipico. Configura el warm-up time en tu politica de auto-scaling para evitar contar instancias que aun no estan listas. Si el warm-up es muy corto, las nuevas instancias pueden fallar health checks y disparar eventos innecesarios de scale-up.

### Como manejamos scaling durante despliegues?

Usa despliegues rolling con max surge y max unavailable para controlar cuantas instancias nuevas se crean. Para despliegues blue-green, escala el entorno green antes de cortar trafico. Para despliegues canary, escala incrementalmente a medida que el trafico se desplaza. Pausa el auto-scaling durante despliegues si el despliegue cambia los patrones de uso de recursos. Reanuda el auto-scaling despues de que el despliegue se estabilice. Documenta el comportamiento de scaling especifico del despliegue en el runbook de despliegue.
