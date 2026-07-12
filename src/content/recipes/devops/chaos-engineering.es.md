---
contentType: recipes
slug: chaos-engineering
title: "Chaos Engineering"
description: "Construye sistemas resilientes inyectando fallas intencionalmente y observando cómo responden y se recuperan tus servicios distribuidos."
metaDescription: "Chaos engineering: inyección de fallas, game days, rollback automático y experimentos controlados para resiliencia en sistemas productivos."
difficulty: advanced
topics:
  - devops
tags:
  - chaos-engineering
  - resilience
  - testing
  - distributed-systems
  - devops
relatedResources:
  - /guides/cicd-pipeline-guide
  - /docs/api-status-page-template
  - /docs/bug-report-template
  - /docs/capacity-planning-template
  - /docs/changelog-template
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Chaos engineering: inyección de fallas, game days, rollback automático y experimentos controlados para resiliencia en sistemas productivos."
  keywords:
    - chaos-engineering
    - resilience
    - testing
    - distributed-systems
---
## Visión General

El chaos engineering es la disciplina de experimentar en sistemas distribuidos para construir confianza en su resiliencia. Al inyectar fallas intencionalmente — matar instancias, inyectar latencia, corromper paquetes — los equipos descubren debilidades antes que los clientes. Netflix fue novedoso con Chaos Monkey; hoy, herramientas como Litmus, Gremlin y AWS Fault Injection Simulator lo hacen accesible para cualquier equipo.

## Cuándo Usar

Usa este recurso cuando:
- Operas sistemas distribuidos donde las fallas son inevitables. Consulta [Event-Driven Microservices](/recipes/messaging/event-driven-microservices) para arquitecturas resilientes.
- Te preparas para drills de disaster recovery y game days. Consulta [Load Testing](/recipes/testing/load-testing) para verificación de capacidad.
- Validas auto-escalado, failover y mecanismos de auto-curación. Consulta [Health Check Endpoint](/recipes/devops/health-check-endpoint) para configuración de probes.
- Construyes confianza antes de eventos de alto tráfico (lanzamientos, Black Friday). Consulta [Retry Logic](/recipes/architecture/retry-backoff) para manejar fallas gracefulmente.

## Solución

### Chaos de Pods en Kubernetes (Litmus)

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: pod-delete-experiment
spec:
  appinfo:
    appns: 'production'
    applabel: 'app=payment-service'
    appkind: 'deployment'
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: '30'
            - name: CHAOS_INTERVAL
              value: '10'
            - name: FORCE
              value: 'false'
```

### Inyección de Latencia de Red (tc + Bash)

```bash
#!/bin/bash
# Agregar 500ms de latencia al tráfico de salida en eth0

echo "Inyectando 500ms de latencia por 60 segundos..."
tc qdisc add dev eth0 root netem delay 500ms 50ms distribution normal

sleep 60

echo "Removiendo latencia..."
tc qdisc del dev eth0 root

# Verificar con ping
ping -c 5 api.example.com
```

### AWS Fault Injection Simulator (Python)

```python
import boto3

fis = boto3.client('fis')

response = fis.start_experiment(
    experimentTemplateId='EXT-12345678',
    tags={'Environment': 'staging'}
)

print(f"Experimento iniciado: {response['experiment']['id']}")
```

## Explicación

**Cinco tipos de experimentos de chaos**:

1. **Infraestructura**: Matar VMs, terminar contenedores, desacoplar volúmenes
1. **Red**: Inyectar latencia, dropear paquetes, particionar zonas
1. **Aplicación**: Lanzar excepciones, retornar 503s, activar memory leaks
1. **Estado**: Llenar discos, corromper bases de datos, expirar certificados
1. **Dependencia**: Hacer que APIs downstream hagan timeout o retornen errores

**El principio del blast radius**:
- Empieza en staging, luego mueve a producción con tráfico mínimo
- Siempre ten un botón de abortar (rollback automático ante violación de SLO)
- Ejecuta durante horas de oficina cuando el equipo esté disponible
- Mide contra SLOs, no solo "¿se cae?"

## Variantes

| Herramienta | Plataforma | Tipos de Experimento |
|-------------|------------|----------------------|
| Chaos Monkey | AWS/Netflix | Terminación de instancias |
| Litmus | Kubernetes | Pod, red, disco, stress |
| Gremlin | Multi-cloud | CPU, memoria, red, estado |
| AWS FIS | AWS | Fallas EC2, ECS, EKS, RDS |
| Toxiproxy | Cualquiera | Latencia de red, timeouts |

## Lo que funciona

- **Define steady state primero**: Conoce tu tasa de error normal, latencia y throughput
- **Hipótesis-driven**: "Si matamos la base de datos primaria, el failover completa en <30s"
- **Automatiza rollback**: Detén experimentos automáticamente si la tasa de error excede el 1%
- **Corre game days**: Eventos de chaos programados trimestralmente con todo el equipo
- **Documenta hallazgos**: Cada experimento produce una actualización de runbook o un fix arquitectónico

## Errores Comunes

1. **Chaos sin monitoreo**: No puedes observar efectos si los dashboards están incompletos
1. **Producción primero**: Nunca corras chaos en producción antes de probarlo seguro en staging
1. **Sin plan de rollback**: Experimentos que no se pueden detener rápidamente se convierten en outages
1. **Probar solo fallas**: También prueba recuperación (¿el auto-healing realmente sana?)
1. **Ignorar blast radius**: Un experimento no debería afectar a todos los clientes

## Preguntas Frecuentes

**P: ¿El chaos engineering es solo romper cosas al azar?**
R: No. Es experimentación hipótesis-driven con resultados medidos y guardias de seguridad automáticas.

**P: ¿Cómo convenzo a la gerencia de permitir chaos en producción?**
R: Empieza en staging, muestra hallazgos, cuantifica outages prevenidos. Enmarca como un seguro proactivo.

**P: ¿Cuál es la diferencia entre chaos engineering y load testing?**
R: El load testing verifica comportamiento bajo alto tráfico. El chaos engineering verifica comportamiento bajo fallas.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### Ataque Gremlin (CPU Stress)

```bash
# Instalar Gremlin CLI
sudo apt-get install gremlin

# CPU stress en un contenedor específico por 60 segundos
gremlin attack cpu --percent 80 --length 60 --container <container-id>

# Blackhole de red (descartar todo el tráfico a una dependencia)
gremlin attack blackhole --ip 10.0.4.20 --length 30

# Consumo de memoria
gremlin attack memory --percent 75 --length 45
```

### Toxiproxy (Chaos de Red para Dependencias)

```bash
# Iniciar Toxiproxy
docker run -p 8474:8474 -p 3306:3306 ghcr.io/shopify/toxiproxy:latest

# Crear un proxy para MySQL
toxiproxy-cli create mysql-proxy -l 0.0.0.0:3306 -u 127.0.0.1:3307

# Añadir 2000ms de latencia a conexiones MySQL
toxiproxy-cli toxic add mysql-proxy -n latency -t latency=2000

# Añadir timeout (conexiones caen después de 500ms)
toxiproxy-cli toxic add mysql-proxy -n timeout -t timeout=500

# Remover todos los toxics
toxiproxy-cli toxic delete mysql-proxy -n latency
```

### Script de Verificación de Steady-State

```python
import requests
import time
import sys

def check_steady_state():
    """Verifica SLOs antes, durante y después de experimentos de chaos."""
    checks = [
        ("https://api.example.com/health", 200, 500),
        ("https://api.example.com/metrics", 200, 1000),
    ]
    all_pass = True
    for url, expected_status, max_latency in checks:
        try:
            start = time.time()
            resp = requests.get(url, timeout=5)
            latency_ms = (time.time() - start) * 1000
            if resp.status_code != expected_status:
                print(f"FAIL: {url} retornó {resp.status_code}, esperado {expected_status}")
                all_pass = False
            elif latency_ms > max_latency:
                print(f"FAIL: {url} latencia {latency_ms:.0f}ms excede {max_latency}ms")
                all_pass = False
            else:
                print(f"OK: {url} - {resp.status_code} en {latency_ms:.0f}ms")
        except requests.RequestException as e:
            print(f"FAIL: {url} inalcanzable: {e}")
            all_pass = False
    return all_pass

if __name__ == "__main__":
    if not check_steady_state():
        print("Steady state violado. Abortando experimento.")
        sys.exit(1)
    print("Steady state confirmado. Seguro proceder.")
```

### Plantilla de Runbook para Game Day

```markdown
# Game Day: <Fecha>

## Participantes
- Facilitador: <nombre>
- Observadores: <nombres>
- Ingeniero on-call: <nombre>

## Alcance
- Servicio objetivo: payment-service
- Entorno: staging
- Blast radius: 10% del tráfico

## Experimentos
1. Matar pod de base de datos primario - esperar failover < 30s
2. Inyectar 500ms de latencia al payment gateway - esperar p99 < 2s
3. Descartar 20% de paquetes a Redis - esperar solo aumento de cache miss rate

## Criterios de Aborto
- Tasa de error > 1% por > 2 minutos
- p99 latencia > 5s
- Cualquier corrupción de datos detectada

## Plan de Rollback
- `kubectl rollout undo deployment/payment-service`
- `toxiproxy-cli toxic delete --all`
- Pagear al ingeniero on-call
```

## Mejores Prácticas Adicionales

1. **Empieza con un solo servicio.** No experimentes en múltiples servicios simultáneamente hasta tener confianza en el aislamiento:

```yaml
# Litmus: apuntar solo a un deployment
spec:
  appinfo:
    appns: 'staging'
    applabel: 'app=payment-service'  # Solo este servicio
    appkind: 'deployment'
```

1. **Programa experimentos durante horario laboral.** El equipo debe estar disponible para responder:

```bash
# Cron para game days: cada viernes a las 2pm
0 14 * * 5 /usr/local/bin/run-chaos-experiment.sh
```

1. **Versiona tus experimentos.** Trata los experimentos de chaos como código:

```bash
git add experiments/
git commit -m "experiment: add pod-delete for payment-service staging"
```

## Errores Comunes Adicionales

1. **Correr experimentos sin baselines.** Necesitas métricas de steady-state antes del chaos para comparar:

```bash
# Registrar baseline antes del experimento
curl -s https://api.example.com/metrics > baseline-metrics.json
# Correr experimento
# Comparar después
curl -s https://api.example.com/metrics > post-experiment-metrics.json
diff <(jq '.latency_p99' baseline-metrics.json) <(jq '.latency_p99' post-experiment-metrics.json)
```

1. **No limpiar después de experimentos.** Los toxics de Toxiproxy, reglas tc, y fallas inyectadas persisten si no se remueven:

```bash
# Siempre limpiar
tc qdisc del dev eth0 root 2>/dev/null
toxiproxy-cli toxic delete --all
kubectl delete chaosengine --all -n staging
```

## FAQ

### ¿Con qué frecuencia debemos correr experimentos de chaos?

Empieza con game days mensuales en staging. A medida que crezca la confianza, pasa a experimentos automatizados semanales en producción con blast radius reducido. Netflix corre Chaos Monkey diariamente en producción.

### ¿Qué métricas debemos monitorear durante experimentos?

Trackea estos SLOs:
- Tasa de error (debe mantenerse < 1%)
- p99 latencia (debe mantenerse dentro del SLO)
- Throughput (no debe caer > 10%)
- Tiempo de recuperación (tiempo para volver a steady state)

### ¿Puede el chaos engineering funcionar sin Kubernetes?

Sí. Herramientas como Gremlin y Toxiproxy funcionan en VMs, bare metal y contenedores. AWS FIS funciona con EC2, ECS y RDS. Los principios son los mismos independientemente de la plataforma.

## Tips de Rendimiento

1. **Corre experimentos en horas valle.** Incluso con blast radius reducido, los experimentos añaden carga:

```bash
# Programar a las 2am cuando el tráfico es menor
0 2 * * * /usr/local/bin/chaos-experiment.sh
```

1. **Usa duraciones cortas de experimento.** 30-60 segundos son suficientes para observar comportamiento:

```yaml
# Litmus: 30 segundos máximo
env:
  - name: TOTAL_CHAOS_DURATION
    value: '30'
```

1. **Cachéa resultados de escaneos.** Si los experimentos de chaos dependen de resultados de escaneo, cachéalos:

```python
import functools

@functools.lru_cache(maxsize=1)
def get_service_inventory():
    return fetch_service_inventory()  # Llamada costosa
```

1. **Paraleliza checks de steady-state.** Verifica múltiples endpoints simultáneamente:

```python
import concurrent.futures

def check_all_endpoints(urls):
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(check_endpoint, urls))
    return all(results)
```
