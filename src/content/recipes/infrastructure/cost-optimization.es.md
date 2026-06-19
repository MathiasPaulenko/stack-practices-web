---
contentType: recipes
slug: cost-optimization
title: "Optimización de Costos Cloud"
description: "Reduce costos de infraestructura cloud con right-sizing, instancias reservadas, spot instances y scheduling automatizado en AWS, GCP y Azure."
metaDescription: "Estrategias de optimización de costos cloud: right-sizing, reserved instances, spot instances, políticas de auto-scaling y scheduling automatizado."
difficulty: intermediate
topics:
  - infrastructure
tags:
  - cost-optimization
  - infrastructure
  - aws
  - devops
relatedResources:
  - /docs/capacity-planning-template
  - /recipes/helm-chart-deployment
  - /recipes/terraform-aws-vpc
  - /recipes/docker-compose-local-dev
  - /recipes/istio-canary-deployment
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Estrategias de optimización de costos cloud: right-sizing, reserved instances, spot instances, políticas de auto-scaling y scheduling automatizado."
  keywords:
    - cost-optimization
    - infrastructure
    - aws
    - devops
---
## Visión General

Los costos cloud pueden escalar inesperadamente — recursos sin usar, instancias oversized y ambientes de desarrollo olvidados drenan presupuestos silenciosamente. La optimización de costos no es solo reducir gastos; es alinear la capacidad de infraestructura con la demanda actual. Este recurso cubre right-sizing, estrategias de compra (reserved vs. spot), scheduling automatizado y prácticas FinOps que reducen desperdicio sin impactar la confiabilidad.

## Cuándo Usar

Usa este recurso cuando:
- Las facturas mensuales de cloud crecen más rápido que el tráfico de usuarios
- Ambientes de desarrollo y staging corren 24/7 a pesar de solo usarse durante horario de oficina
- Pagas por instancias overprovisionadas que usan <20% de CPU
- Necesitas justificar costos de infraestructura ante finanzas o liderazgo

## Solución

### AWS Cost Explorer Analysis (AWS CLI)

```bash
# Encontrar top drivers de costo por servicio
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '30 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --query 'ResultsByTime[0].Groups[?Metrics.BlendedCost.Amount > \`100\`].Keys'

# Encontrar volúmenes EBS no adjuntos
aws ec2 describe-volumes \
  --filters Name=status,Values=available \
  --query 'Volumes[*].[VolumeId,Size,CreateTime]'
```

### Terraform Scheduled Scaling

```hcl
resource "aws_autoscaling_schedule" "dev_office_hours" {
  scheduled_action_name  = "dev-office-hours"
  min_size               = 1
  max_size               = 3
  desired_capacity       = 2
  recurrence             = "0 9 * * MON-FRI"  # 9 AM UTC
  autoscaling_group_name = aws_autoscaling_group.dev.name
}

resource "aws_autoscaling_schedule" "dev_night_shutdown" {
  scheduled_action_name  = "dev-night-shutdown"
  min_size               = 0
  max_size               = 0
  desired_capacity       = 0
  recurrence             = "0 18 * * MON-FRI" # 6 PM UTC
  autoscaling_group_name = aws_autoscaling_group.dev.name
}
```

### Spot Instance con Fallback (Kubernetes)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spot-workload
spec:
  replicas: 5
  template:
    spec:
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                  - key: node-type
                    operator: In
                    values: [spot]
      tolerations:
        - key: spot
          operator: Equal
          value: "true"
          effect: NoSchedule
      containers:
        - name: app
          image: myapp:latest
```

## Explicación

**Cuatro pilares de optimización de costos cloud**:

1. **Right-size**: Matchea el tipo de instancia al uso actual; reduce el tamaño de recursos overprovisionados
2. **Capacidad reservada**: Compromete a 1-3 años de reserved instances para workloads predecibles (ahorro 40-60%)
3. **Spot/preemptible**: Usa instancias interrumpibles para jobs batch tolerantes a fallas (ahorro 60-90%)
4. **Auto-scheduling**: Apaga ambientes dev/staging noches y fines de semana

**Ciclo de vida FinOps**:
- **Inform**: Visibilidad del gasto cloud por equipo, proyecto y ambiente
- **Optimize**: Optimizaciones técnicas y de rate (RI, spot, rightsizing)
- **Operate**: Gobernanza continua, budgets y políticas automatizadas

## Variantes

| Estrategia | Ahorro | Esfuerzo | Riesgo |
|------------|--------|----------|--------|
| Reserved instances | 40-60% | Bajo | Lock-in de compromiso |
| Spot instances | 60-90% | Medio | Interrupción |
| Scheduled shutdown | 50-70% | Bajo | Supervisión manual |
| Storage tiering | 30-50% | Bajo | Latencia de acceso |
| Serverless | Variable | Medio | Cold start |

## Mejores Prácticas

- **Taggea todo**: Tags de allocación de costos (equipo, proyecto, ambiente) habilitan chargeback
- **Setea budgets y alertas**: Alerta al 80% del budget mensual; investiga inmediatamente
- **Revisa recursos sin usar semanalmente**: IPs flotantes, volúmenes huérfanos y snapshots stale se acumulan
- **Usa Savings Plans sobre RIs**: Más flexible; aplica a través de familias de instancias y regiones
- **Implementa auto-scaling**: Escala a zero para ambientes dev; escala up para picos de producción

## Errores Comunes

1. **Sin ownership de costos**: Cuando engineering no ve la factura, el desperdicio se acumula
2. **Overcommitting a reserved instances**: Comprar RIs de 3 años para workloads que pueden migrar a serverless
3. **Ignorar costos de data transfer**: NAT Gateway, tráfico cross-AZ y egress pueden exceder costos de compute
4. **Dejar recursos de preview corriendo**: POCs y experimentos que se convierten en items permanentes
5. **Pricing one-size-fits-all**: Producción necesita estabilidad; dev puede tolerar interrupciones de spot

## Preguntas Frecuentes

**P: ¿Debería usar spot instances para producción?**
R: Solo para workloads stateless y tolerantes a fallas con fallback adecuado a on-demand. Nunca para bases de datos o servicios singleton.

**P: ¿Cómo prevengo que developers creen recursos caros?**
R: Las SCPs (Service Control Policies) restringen tipos de instancia por OU. Las políticas de Terraform enforcean familias de instancias aprobadas.

**P: ¿Cuál es la diferencia entre FinOps y DevOps?**
R: DevOps optimiza para velocidad y confiabilidad. FinOps agrega costo como métrica de primera clase, con accountability cross-funcional.
