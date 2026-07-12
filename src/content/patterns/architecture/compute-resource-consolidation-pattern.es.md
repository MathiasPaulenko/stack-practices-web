---



contentType: patterns
slug: compute-resource-consolidation-pattern
title: "Patron de Consolidacion de Recursos de Computo"
description: "Combina cargas de trabajo en menos recursos de computo para reducir costos, mejorar la utilizacion y simplificar operaciones."
metaDescription: "Reduce costos en la nube con el Patron de Consolidacion de Recursos de Computo. Combina cargas, mejora la utilizacion y simplifica operaciones de infraestructura."
difficulty: intermediate
category: architectural
topics:
  - architecture
  - infrastructure
  - performance
tags:
  - compute-resource-consolidation
  - pattern
  - cost-optimization
  - architecture
  - infrastructure
relatedResources:
  - /patterns/content-delivery-network-pattern
  - /patterns/gateway-routing-pattern
  - /patterns/anti-corruption-layer-pattern
  - /docs/capacity-planning-template
  - /guides/system-design-interview-guide
  - /recipes/cost-optimization
  - /patterns/external-configuration-store-pattern
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Reduce costos en la nube con el Patron de Consolidacion de Recursos de Computo. Combina cargas, mejora la utilizacion y simplifica operaciones de infraestructura."
  keywords:
    - consolidacion de recursos de computo
    - compute resource consolidation
    - optimizacion de costos
    - arquitectura
    - infraestructura



---
## Visión General

El Patron de Consolidacion de Recursos de Computo combina cargas de trabajo en menos recursos de computo para mejorar la utilizacion, reducir costos y simplificar operaciones. En lugar de ejecutar una carga por instancia, agrupas cargas compatibles segun sus perfiles de recursos, necesidades de disponibilidad y limites de seguridad.

Este patron es comun en la optimizacion de costos en la nube, procesamiento por lotes y proyectos de consolidacion de sistemas legados donde la capacidad ociosa es costosa y la sobrecarga administrativa es alta.

## Cuándo Usar


- For alternatives, see [Content Delivery Network (CDN) Pattern](/es/patterns/content-delivery-network-pattern/).

Usa este patron cuando:
- Tengas muchas cargas pequenas con baja utilizacion individual
- Los costos en la nube aumenten debido a instancias sobreaprovisionadas u ociosas
- Quieras reducir la cantidad de servidores, contenedores o nodos a gestionar
- Las cargas tengan perfiles de recursos complementarios (e.g., limitadas por CPU y por memoria)
- Puedas compartir infraestructura de forma segura sin violar limites de seguridad o cumplimiento

## Solución

```python
# Analizador simplificado de perfiles de recursos para decisiones de consolidacion
workloads = [
    {'name': 'report-generator', 'cpu_avg': 0.2, 'mem_avg': 0.8, 'peak_hours': [2, 3]},
    {'name': 'notification-sender', 'cpu_avg': 0.6, 'mem_avg': 0.2, 'peak_hours': [9, 10, 11]},
    {'name': 'data-cleaner', 'cpu_avg': 0.1, 'mem_avg': 0.1, 'peak_hours': [0, 1]},
]

def can_consolidate(a, b):
    overlapping_peaks = set(a['peak_hours']) & set(b['peak_hours'])
    combined_cpu = a['cpu_avg'] + b['cpu_avg']
    combined_mem = a['mem_avg'] + b['mem_avg']
    return not overlapping_peaks and combined_cpu < 0.9 and combined_mem < 0.9

# Ejemplo: report-generator y notification-sender tienen picos complementarios
print(can_consolidate(workloads[0], workloads[1]))  # True
```

```yaml
# Pod de Kubernetes con multiples contenedores compartiendo un nodo
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: worker-a
      resources:
        requests:
          cpu: "250m"
          memory: "128Mi"
    - name: worker-b
      resources:
        requests:
          cpu: "250m"
          memory: "128Mi"
```

## Explicación

La consolidacion funciona analizando las demandas de recursos y los patrones de programacion de cada carga. Las cargas compatibles se colocan en el mismo recurso de computo siempre que su uso pico combinado permanezca por debajo de la capacidad. El objetivo es maximizar la utilizacion sin introducir contencion o violar requisitos de aislamiento.

El patron suele implicar:
- **Perfilado**: medir CPU, memoria, disco y red a lo largo del tiempo
- **Empaquetado**: agrupar cargas para que las necesidades totales encajen en la capacidad disponible
- **Programacion**: colocar cargas con horarios desplazados en el mismo recurso
- **Monitoreo**: vigilar la contencion despues de la consolidacion
- **Respaldo**: mantener capacidad de burst lista para cargas inesperadas

## Variantes

| Variante | Enfoque | Ideal Para |
|----------|---------|------------|
| **Consolidacion de contenedores** | Multiples contenedores en un host o pod | Microservicios con baja utilizacion |
| **Consolidacion de VMs** | Multiples cargas en una maquina virtual | Aplicaciones legadas |
| **Agrupacion serverless** | Combinar funciones en un solo proceso o runtime | Cargas orientadas a eventos |
| **Programacion por lotes** | Ejecutar trabajos en horarios distintos en recursos compartidos | Cron jobs y pipelines ETL |

## Lo que funciona

- Perfiliza cargas para uso **promedio y pico** antes de consolidar
- Manten claros los **limites de seguridad**; no mezcles cargas sensibles y publicas
- Deja **margen** para picos y conmutaciones por error
- Usa **cuotas y limites** de recursos para evitar que una carga ahogue a las demas
- Monitorea **latencia y tasas de error** tras la consolidacion para detectar contencion
- Documenta **planes de respaldo** para dividir cargas de nuevo si es necesario

## Errores Comunes

- Consolidar cargas con **horas pico superpuestas**, causando contencion
- Ignorar efectos de **vecino ruidoso** en CPU, memoria o disco compartidos
- Mezclar cargas con **requisitos de cumplimiento o seguridad distintos**
- Eliminar demasiada capacidad, sin margen para escalado o fallos
- Olvidar actualizar umbrales de monitoreo y alertas tras la consolidacion

## Preguntas Frecuentes

**P: Es la consolidacion lo mismo que el autoscaling?**
R: No. La consolidacion reduce la cantidad de recursos que usas. El autoscaling ajusta la cantidad de recursos segun la demanda. Ambos pueden combinarse.

**P: Deberia consolidar cargas de produccion y desarrollo?**
R: Generalmente no. Las cargas de produccion deben aislarse de los entornos no productivos por estabilidad y seguridad.

**P: Como se cuando la consolidacion ha ido demasiado lejos?**
R: Observa aumento de latencia, mayores tasas de error, presion de memoria o aceleramiento de CPU. Son senales de que las cargas compiten por recursos.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.

## Soluciones Avanzadas

### Empaquetado dinámico con scheduler de Kubernetes

Usa schedulers personalizados de Kubernetes o plugins para implementar empaquetado inteligente:

```yaml
# Config de scheduler de Kubernetes para optimizacion de empaquetado
apiVersion: kubescheduler.config.k8s.io/v1beta3
kind: KubeSchedulerConfiguration
profiles:
  - schedulerName: bin-packing-scheduler
    pluginConfig:
      - name: NodeResourcesFit
        args:
          scoringStrategy:
            type: LeastAllocated
            resources:
              - name: cpu
                weight: 1
              - name: memory
                weight: 1
```

```python
# Plugin de scoring personalizado para perfiles de recursos complementarios
def score_node(pod, node):
    node_cpu_used = sum(cpu for c in node.pods)
    node_mem_used = sum(mem for c in node.pods)
    node_cpu_total = node.allocatable['cpu']
    node_mem_total = node.allocatable['memory']
    
    pod_cpu = pod.spec.containers[0].resources.requests.cpu
    pod_mem = pod.spec.containers[0].resources.requests.memory
    
    # Preferir nodos donde el pod llena huecos en el perfil de recursos
    cpu_fill = (node_cpu_used + pod_cpu) / node_cpu_total
    mem_fill = (node_mem_used + pod_mem) / node_mem_total
    
    # Mayor score para mejor balance de recursos
    return 100 - abs(cpu_fill - mem_fill) * 50
```

### Consolidacion basada en tiempo con instancias spot

Usa instancias spot con cargas desplazadas en tiempo para ahorro maximo de costos:

```python
import boto3
import datetime

def schedule_spot_consolidation(workloads, region='us-east-1'):
    ec2 = boto3.client('ec2', region_name=region)
    
    # Agrupar cargas por ventanas de tiempo
    time_windows = {}
    for w in workloads:
        window = (w['start_hour'], w['end_hour'])
        if window not in time_windows:
            time_windows[window] = []
        time_windows[window].append(w)
    
    # Lanzar instancias spot para cada ventana de tiempo
    for window, ws in time_windows.items():
        instance_type = 'm5.large'  # Balance de CPU y memoria
        
        # Calcular requisitos totales de recursos
        total_cpu = sum(w['cpu'] for w in ws)
        total_mem = sum(w['mem'] for w in ws)
        
        # Solicitar instancia spot
        response = ec2.request_spot_instances(
            InstanceCount=1,
            Type='one-time',
            InstanceInterruptionBehavior='terminate',
            LaunchSpecification={
                'ImageId': 'ami-12345678',
                'InstanceType': instance_type,
                'UserData': f'#cloud-config\nruncmd:\n  - docker run -d {total_cpu}m {total_mem}Mi'
            }
        )
        
        print(f"Lanzada instancia spot para ventana {window}: {response['SpotInstanceRequests'][0]['SpotInstanceRequestId']}")
```

### Aislamiento de recursos de contenedor con cgroups

Previene efectos de vecino ruidoso usando cgroups de Linux:

```bash
# Crear cgroup para aislamiento de CPU
sudo cgcreate -g cpu,memory:/workload-a

# Configurar cuota de CPU (50% de un core)
sudo cgset -r cpu.cfs_quota_us=50000 /workload-a
sudo cgset -r cpu.cfs_period_us=100000 /workload-a

# Configurar limite de memoria (512MB)
sudo cgset -r memory.limit_in_bytes=536870912 /workload-a

# Ejecutar carga en cgroup
sudo cgexec -g cpu,memory:workload-a python workload-a.py

# Crear cgroup para workload-b con diferentes limites
sudo cgcreate -g cpu,memory:/workload-b
sudo cgset -r cpu.cfs_quota_us=50000 /workload-b
sudo cgset -r memory.limit_in_bytes=536870912 /workload-b
sudo cgexec -g cpu,memory:workload-b python workload-b.py
```

## Mejores Practicas Adicionales

1. **Usa cuotas de recursos a multiples niveles.** Aplica cuotas a nivel de cluster, namespace y pod para forzar limites jerarquicamente. Esto previene que un equipo o aplicacion consuma todos los recursos.

2. **Implementa estrategias de capacidad de burst.** Manten un pequeno pool de instancias on-demand listo para interrupciones de instancias spot o picos de carga inesperados. Usa el cluster autoscaler de Kubernetes para agregar nodos cuando falla la programacion de pods.

3. **Monitorea la utilizacion de recursos continuamente.** Usa Prometheus y Grafana para rastrear CPU, memoria, disco y red a granularidad de 1 minuto. Configura alertas para utilizacion alta sostenida (>80%) que indica que la consolidacion puede ser muy agresiva.

## Errores Comunes Adicionales

1. **Ignorar limitaciones de ancho de banda de red.** Consolidar cargas intensivas en I/O en el mismo host puede saturar interfaces de red. Monitorea el throughput de red y considera politicas de red al consolidar.

2. **Olvidar la contencion de I/O de disco.** Cargas de base de datos y aplicaciones con logs pesados compartiendo el mismo disco pueden causar espera de I/O. Usa discos separados o SSDs para cargas intensivas en I/O.

## FAQs Adicionales

### ¿Cómo manejo interrupciones de instancias spot?

Implementa handlers de shutdown graceful que guarden estado y migren a instancias on-demand. Usa pod disruption budgets de Kubernetes para asegurar disponibilidad minima durante terminacion de instancias spot. Almacena datos de checkpoint en almacenamiento duradero como S3 o EFS.

### ¿Debería consolidar aplicaciones con estado?

Las aplicaciones con estado como bases de datos requieren consolidacion cuidadosa. Considera usar servicios de base de datos gestionados que manejen multi-tenancy internamente. Si es self-hosted, asegurate que cada carga tenga almacenamiento dedicado y aislamiento de red para prevenir corrupcion de datos.

### ¿Cómo mido la efectividad de la consolidacion?

Rastrea metricas antes y despues de la consolidacion: conteo total de recursos, utilizacion promedio, costo por unidad de trabajo y tasa de incidentes. Calcula el ratio de consolidacion (recursos antes / recursos despues) y apunta a 2:1 o mejor mientras mantienes objetivos de nivel de servicio.

### ¿Qué herramientas pueden ayudar a automatizar la consolidacion?

Usa cluster autoscaler de Kubernetes con politicas de puntuacion personalizadas, AWS Compute Optimizer para recomendaciones de tipos de instancia y Azure Advisor para sugerencias de consolidacion. Herramientas como Prometheus y Grafana pueden visualizar patrones de utilizacion de recursos e identificar oportunidades de consolidacion. Soluciones cloud-native como Google Kubernetes Engine Autopilot gestionan automaticamente el aprovisionamiento de nodos basado en requisitos de carga de trabajo.

### ¿Cómo afecta la consolidacion al debugging y observabilidad?

La consolidacion puede hacer el debugging mas complejo ya que multiples cargas comparten recursos. Implementa limites de recursos por carga y seguimiento de solicitudes para atribuir problemas a aplicaciones especificas. Usa trazabilidad distribuida para seguir solicitudes a traves de servicios consolidados. Asegurate que el logging incluya identificadores de carga y contexto de recursos para troubleshooting mas facil.

### ¿Cuándo debo evitar la consolidacion?

Evita la consolidacion cuando:
- Las cargas tienen requisitos estrictos de seguridad o cumplimiento que mandate aislamiento fisico
- Las aplicaciones tienen requisitos de rendimiento extremos que necesitan hardware dedicado
- Las cargas exhiben patrones de consumo de recursos impredecibles que podrian causar contencion
- Los requisitos regulatorios previenen que ciertas cargas compartan infraestructura
- La complejidad operativa supera los ahorros de costo

En estos casos, usa infraestructura dedicada o implementa mecanismos de aislamiento fuertes a nivel de red, almacenamiento y runtime.
