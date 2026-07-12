---


contentType: patterns
slug: canary-release-pattern
title: "Patrón Canary Release"
description: "Rutear un porcentaje pequeno de trafico a la nueva version mientras el resto se queda en estable. Monitorear salud y aumentar gradualmente o revertir segun resultados."
metaDescription: "Rutear un porcentaje pequeno de trafico a la nueva version mientras el resto se queda en estable. Monitorear salud y aumentar gradualmente o revertir segun resultados."
difficulty: intermediate
topics:
  - devops
  - architecture
tags:
  - canary-release
  - patron
  - patron-diseno
  - estrategia-despliegue
  - progressive-delivery
  - rollout
  - reduccion-riesgo
relatedResources:
  - /patterns/blue-green-deployment-pattern
  - /patterns/deployment-ring-pattern
  - /patterns/graceful-degradation-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Rutear un porcentaje pequeno de trafico a la nueva version mientras el resto se queda en estable. Monitorear salud y aumentar gradualmente o revertir segun resultados."
  keywords:
    - patron canary release
    - progressive delivery
    - patron diseno
    - estrategia despliegue
    - canary rollout
    - release incremental
    - despliegue reduccion riesgo


---

# Patrón Canary Release

## Descripción general

El patrón Canary Release rutear un porcentaje pequeno de trafico a una nueva version mientras la mayoria continua recibiendo la version estable. El nombre viene de los mineros de carbon que llevaban canarios para detectar gases peligrosos: el canario servia como sistema de alerta temprana. En software, la version canario sirve primero a un grupo pequeno de usuarios. Si falla, solo ese grupo pequeno se ve afectado.

El patron funciona en etapas: empieza en 1%, observa tasas de error y latencia, luego aumenta a 5%, 10%, 25%, 50% y 100%. En cada etapa, las metricas de salud determinan si proceder o revertir. A diferencia de blue-green (que cambia todo el trafico de una vez), canary release cambia el trafico gradualmente, dandote tiempo para detectar problemas que solo aparecen bajo carga real de usuarios.

## Cuándo usarlo


- For alternatives, see [Blue-Green Deployment Pattern](/es/patterns/blue-green-deployment-pattern/).

Usa el patrón Canary Release cuando:
- Quieres validar una nueva version con usuarios reales antes del rollout completo
- Los problemas pueden solo aparecer bajo trafico de produccion (no detectados por tests de staging)
- Necesitas control mas fino que el switch todo-o-nada de blue-green
- Tu infraestructura soporta traffic splitting (pesos de load balancer, service mesh)
- Ejemplos: versionado de API, rediseños de UI, cambios performance-sensitive, cambios de queries de BD

## Solución

### Python

```python
from dataclasses import dataclass
from typing import Callable, List, Optional, Dict
from enum import Enum
import time

class CanaryStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    PROMOTED = "promoted"
    ROLLED_BACK = "rolled_back"

@dataclass
class HealthMetrics:
    error_rate: float
    p95_latency_ms: float
    success_rate: float

    def is_healthy(self, max_error_rate: float = 0.02, max_p95: float = 300) -> bool:
        return self.error_rate <= max_error_rate and self.p95_latency_ms <= max_p95

@dataclass
class CanaryStage:
    percentage: float
    bake_time_seconds: float
    passed: bool = False

class CanaryRelease:
    def __init__(self, version: str, stable_version: str,
                 health_check_fn: Callable[[], HealthMetrics],
                 max_error_rate: float = 0.02, max_p95: float = 300):
        self.version = version
        self.stable_version = stable_version
        self.health_check_fn = health_check_fn
        self.max_error_rate = max_error_rate
        self.max_p95 = max_p95
        self.status = CanaryStatus.PENDING
        self.current_stage_idx = -1
        self.stages = [
            CanaryStage(1.0, 0.3), CanaryStage(5.0, 0.3),
            CanaryStage(25.0, 0.3), CanaryStage(50.0, 0.3),
            CanaryStage(100.0, 0.3),
        ]

    def _run_stage(self, stage: CanaryStage) -> bool:
        self.current_stage_idx += 1
        self.status = CanaryStatus.RUNNING
        print(f"  Canary at {stage.percentage}% -> stable={100 - stage.percentage}%")
        time.sleep(stage.bake_time_seconds)
        metrics = self.health_check_fn()
        stage.passed = metrics.is_healthy(self.max_error_rate, self.max_p95)
        print(f"    error_rate={metrics.error_rate:.2%}, p95={metrics.p95_latency_ms}ms")
        if stage.passed:
            print(f"    PASS - advancing")
            return True
        print(f"    FAIL - rolling back")
        self.status = CanaryStatus.ROLLED_BACK
        return False

    def execute(self) -> Dict:
        print(f"\n=== Canary Release: v{self.version} (stable: v{self.stable_version}) ===")
        for i, stage in enumerate(self.stages):
            if not self._run_stage(stage):
                return {"version": self.version, "status": self.status.value,
                        "rolled_back": True, "failed_stage": i,
                        "max_percentage": self.stages[self.current_stage_idx].percentage}
        self.status = CanaryStatus.PROMOTED
        print(f"\nCanary promoted. v{self.version} is now at 100%.")
        return {"version": self.version, "status": self.status.value,
                "rolled_back": False, "stages_passed": len(self.stages)}

# Uso
call_count = 0
def mock_health_check() -> HealthMetrics:
    global call_count
    call_count += 1
    if call_count == 3:
        return HealthMetrics(error_rate=0.05, p95_latency_ms=400, success_rate=0.95)
    return HealthMetrics(error_rate=0.005, p95_latency_ms=80, success_rate=0.995)

canary = CanaryRelease("3.0.0", "2.9.0", mock_health_check, 0.02, 300)
print(f"\nResult: {canary.execute()}")
```

### JavaScript

```javascript
class CanaryRelease {
  constructor(version, stableVersion, healthCheckFn, options = {}) {
    this.version = version;
    this.stableVersion = stableVersion;
    this.healthCheckFn = healthCheckFn;
    this.maxErrorRate = options.maxErrorRate ?? 0.02;
    this.maxP95 = options.maxP95 ?? 300;
    this.status = "pending";
    this.currentStageIdx = -1;
    this.stages = [
      { percentage: 1.0, bakeTimeMs: 50 }, { percentage: 5.0, bakeTimeMs: 50 },
      { percentage: 25.0, bakeTimeMs: 50 }, { percentage: 50.0, bakeTimeMs: 50 },
      { percentage: 100.0, bakeTimeMs: 50 },
    ];
  }

  async _runStage(stage) {
    this.currentStageIdx++;
    this.status = "running";
    console.log(`  Canary at ${stage.percentage}% -> stable=${100 - stage.percentage}%`);
    await new Promise(r => setTimeout(r, stage.bakeTimeMs));
    const m = this.healthCheckFn();
    const healthy = m.errorRate <= this.maxErrorRate && m.p95LatencyMs <= this.maxP95;
    console.log(`    error_rate=${(m.errorRate * 100).toFixed(2)}%, p95=${m.p95LatencyMs}ms`);
    if (healthy) { console.log("    PASS - advancing"); return true; }
    console.log("    FAIL - rolling back"); this.status = "rolled_back"; return false;
  }

  async execute() {
    console.log(`\n=== Canary Release: v${this.version} (stable: v${this.stableVersion}) ===`);
    for (let i = 0; i < this.stages.length; i++) {
      if (!await this._runStage(this.stages[i])) {
        return { version: this.version, status: this.status, rolledBack: true, failedStage: i,
                 maxPercentage: this.stages[this.currentStageIdx].percentage };
      }
    }
    this.status = "promoted";
    console.log(`\nCanary promoted. v${this.version} is now at 100%.`);
    return { version: this.version, status: this.status, rolledBack: false, stagesPassed: this.stages.length };
  }
}

// Uso
let callCount = 0;
const mockHealthCheck = () => {
  callCount++;
  if (callCount === 3) return { errorRate: 0.05, p95LatencyMs: 400, successRate: 0.95 };
  return { errorRate: 0.005, p95LatencyMs: 80, successRate: 0.995 };
};

(async () => {
  const canary = new CanaryRelease("3.0.0", "2.9.0", mockHealthCheck, { maxErrorRate: 0.02, maxP95: 300 });
  console.log("\nResult:", await canary.execute());
})();
```

### Java

```java
import java.util.*;

public class CanaryRelease {

    record HealthMetrics(double errorRate, double p95LatencyMs, double successRate) {
        boolean isHealthy(double maxError, double maxP95) {
            return errorRate <= maxError && p95LatencyMs <= maxP95;
        }
    }

    record Stage(double percentage, long bakeTimeMs) {}

    private final String version, stableVersion;
    private final java.util.function.Supplier<HealthMetrics> healthCheckFn;
    private final double maxErrorRate, maxP95;
    private String status = "pending";
    private int currentStageIdx = -1;
    private final List<Stage> stages = List.of(
        new Stage(1.0, 50), new Stage(5.0, 50), new Stage(25.0, 50),
        new Stage(50.0, 50), new Stage(100.0, 50)
    );

    public CanaryRelease(String version, String stableVersion,
                         java.util.function.Supplier<HealthMetrics> fn, double maxError, double maxP95) {
        this.version = version; this.stableVersion = stableVersion;
        this.healthCheckFn = fn; this.maxErrorRate = maxError; this.maxP95 = maxP95;
    }

    private boolean runStage(Stage stage) {
        currentStageIdx++;
        status = "running";
        System.out.printf("  Canary at %.0f%% -> stable=%.0f%%%n", stage.percentage(), 100 - stage.percentage());
        try { Thread.sleep(stage.bakeTimeMs()); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        HealthMetrics m = healthCheckFn.get();
        boolean healthy = m.isHealthy(maxErrorRate, maxP95);
        System.out.printf("    error_rate=%.2f%%, p95=%.0fms%n", m.errorRate() * 100, m.p95LatencyMs());
        if (healthy) { System.out.println("    PASS - advancing"); return true; }
        System.out.println("    FAIL - rolling back"); status = "rolled_back"; return false;
    }

    public Map<String, Object> execute() {
        System.out.printf("%n=== Canary Release: v%s (stable: v%s) ===%n", version, stableVersion);
        for (int i = 0; i < stages.size(); i++) {
            if (!runStage(stages.get(i))) {
                return Map.of("version", version, "status", status, "rolledBack", true,
                    "failedStage", i, "maxPercentage", stages.get(currentStageIdx).percentage());
            }
        }
        status = "promoted";
        System.out.printf("%nCanary promoted. v%s is now at 100%%.%n", version);
        return Map.of("version", version, "status", status, "rolledBack", false, "stagesPassed", stages.size());
    }

    public static void main(String[] args) {
        int[] callCount = {0};
        var healthCheck = (java.util.function.Supplier<HealthMetrics>) () -> {
            callCount[0]++;
            if (callCount[0] == 3) return new HealthMetrics(0.05, 400, 0.95);
            return new HealthMetrics(0.005, 80, 0.995);
        };
        System.out.println("\nResult: " + new CanaryRelease("3.0.0", "2.9.0", healthCheck, 0.02, 300).execute());
    }
}
```

## Explicación

El canary release procede a traves de etapas predefinidas:

1. **Rutear un porcentaje**: Configura el load balancer o service mesh para enviar un porcentaje pequeno de trafico a la version canary. El resto va a la version estable. Ambas versiones corren simultaneamente.
2. **Bake y medir**: Espera el bake time para acumular trafico, luego recolecta metricas de salud del canary. Compara tasa de error, latencia y metricas de negocio contra umbrales.
3. **Avanzar o revertir**: Si las metricas estan dentro de umbrales, aumenta el porcentaje del canary a la siguiente etapa. Si las metricas se degradan, rutea todo el trafico de vuelta a la version estable y detiene el canary.
4. **Promover**: Cuando el canary llega a 100% y las metricas son saludables, el canary se convierte en la nueva version estable. La version estable anterior se puede decomisionar.

## Variantes

| Variante | Descripción | Caso de uso |
|---------|-------------|-------------|
| **Canary por usuario** | Rutear usuarios especificos (equipo interno, beta users) al canary | Testing controlado con usuarios conocidos |
| **Canary por header** | Rutear por header de request (cookie, custom header) | Testing con clientes o regiones especificas |
| **Canary shadow** | Enviar trafico al canary pero descartar respuestas | Testear bajo carga real sin impacto al usuario |
| **Canary auto-promote** | Avanzar etapas automaticamente si las metricas pasan | Cambios de bajo riesgo con monitoreo fuerte |

## Buenas prácticas

- **Empieza en 1% o menos** para minimizar el blast radius
- **Monitorea tanto metricas tecnicas como de negocio** (tasa de error, latencia, conversion)
- **Define bake times suficientemente largos** para data estadisticamente significativa
- **Define umbrales de auto-rollback** antes de empezar el canary
- **Usa sticky sessions** para que un usuario se quede en la misma version durante el canary
- **Mantén la version estable corriendo** hasta que el canary llegue a 100% y se confirme saludable

## Errores comunes

- Empezar con un porcentaje demasiado alto (10% o mas), anulando el proposito de alerta temprana
- No monitorear metricas de negocio, solo verificar tasas de error
- Bake times demasiado cortos, avanzando antes de que acumule suficiente data
- Sin auto-rollback, requiriendo intervencion manual durante incidentes
- Usuarios rebotando entre versiones por falta de sticky sessions
- Decomisionar la version estable antes de que el canary se promueva completamente

## Preguntas frecuentes

**Q: Como se diferencia canary release de blue-green deployment?**
A: Blue-green cambia 100% del trafico entre dos entornos instantaneamente. Canary gradualmente cambia un porcentaje de trafico a la nueva version mientras la vieja continua sirviendo el resto. Canary da control mas granular y deteccion mas temprana.

**Q: Con que porcentaje debo empezar?**
A: 1% es el estandar. Para servicios de alto trafico, incluso 1% representa miles de usuarios. Para servicios de bajo trafico, quizas necesites un porcentaje mas alto para obtener data significativa en un bake time razonable.

**Q: Como ruteo un porcentaje de trafico al canary?**
A: Usa pesos de load balancer (e.g., AWS ALB weighted routing), reglas de service mesh (Istio, Linkerd), feature flags (LaunchDarkly, Unleash), o traffic splitting de API gateway. Todos te permiten ajustar el porcentaje sin redesplegar.

**Q: Que pasa si el canary pasa metricas tecnicas pero los usuarios reportan problemas?**
A: Incluye metricas de usuario en tu health check: tasa de tickets de soporte, errores reportados por usuarios, duracion de sesion, bounce rate. Las metricas tecnicas detectan crashes, pero las metricas de usuario detectan regresiones de UX que no aparecen como errores.
