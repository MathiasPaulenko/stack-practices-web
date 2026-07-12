---


contentType: patterns
slug: deployment-ring-pattern
title: "Patrón Deployment Ring"
description: "Desplegar cambios progresivamente en anillos de tamano creciente. Empezar con un grupo pequeno, verificar salud, luego expandir a anillos mas grandes antes del despliegue total."
metaDescription: "Desplegar cambios en anillos de tamano creciente. Empezar con un grupo pequeno, verificar salud y expandir antes del despliegue total."
difficulty: intermediate
topics:
  - devops
  - architecture
tags:
  - deployment-ring
  - patron
  - patron-diseno
  - rollout-progresivo
  - estrategia-despliegue
  - anillos
  - canary
relatedResources:
  - /patterns/canary-release-pattern
  - /patterns/blue-green-deployment-pattern
  - /patterns/graceful-degradation-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Desplegar cambios en anillos de tamano creciente. Empezar con un grupo pequeno, verificar salud y expandir antes del despliegue total."
  keywords:
    - patron deployment ring
    - rollout progresivo
    - patron diseno
    - estrategia despliegue
    - despliegue por anillos
    - canary rings
    - despliegue incremental


---

# Patrón Deployment Ring

## Descripción general

El patrón Deployment Ring despliega una nueva version en anillos concentricos de tamano creciente. El anillo 0 puede ser usuarios internos (1%). El anillo 1 es early adopters (5%). El anillo 2 es un segmento mas grande (25%). El anillo 3 es todos (100%). Entre cada anillo, el sistema verifica metricas de salud (tasa de error, latencia, conversion). Si las metricas se degradan, el rollout se detiene o se revierte. Si las metricas son estables, el siguiente anillo procede.

Este patron reduce el blast radius. Un bug que afectaria a todos los usuarios en un despliegue completo solo afecta al 1% en el anillo 0. Para cuando el rollout llega al 100%, la version ha sido validada a traves de grupos progresivamente mas grandes y diversos.

## Cuándo usarlo


- For alternatives, see [Blue-Green Deployment Pattern](/es/patterns/blue-green-deployment-pattern/).

Usa el patrón Deployment Ring cuando:
- Despliegas cambios que conllevan riesgo (nuevos features, cambios de schema, actualizaciones de infra)
- Necesitas validar con trafico real antes del rollout completo
- Quieres rollback automatico ante degradacion de salud
- Tu base de usuarios es lo suficientemente grande para segmentar considerablemente
- Ejemplos: plataformas SaaS, servicios API, updates de apps moviles, despliegues de microservicios

## Solución

### Python

```python
from dataclasses import dataclass, field
from typing import Callable, List, Optional, Dict
from enum import Enum
import time

class RingStatus(Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    ROLLED_BACK = "rolled_back"
    FAILED = "failed"

@dataclass
class Ring:
    ring_id: int
    name: str
    percentage: float
    status: RingStatus = RingStatus.PENDING
    health_check_passed: bool = False

@dataclass
class HealthMetrics:
    error_rate: float
    p95_latency_ms: float
    success_rate: float

    def is_healthy(self, max_error_rate: float = 0.05, max_p95: float = 500) -> bool:
        return self.error_rate < max_error_rate and self.p95_latency_ms < max_p95

class RingDeployment:
    def __init__(self, version: str, rings: List[Ring],
                 health_check_fn: Callable[[], HealthMetrics],
                 max_error_rate: float = 0.05, max_p95: float = 500,
                 bake_time_seconds: float = 0.5):
        self.version = version
        self.rings = rings
        self.health_check_fn = health_check_fn
        self.max_error_rate = max_error_rate
        self.max_p95 = max_p95
        self.bake_time = bake_time_seconds

    def _deploy_to_ring(self, ring: Ring) -> bool:
        ring.status = RingStatus.ACTIVE
        print(f"  Deploying v{self.version} to {ring.name} ({ring.percentage}%)")
        time.sleep(self.bake_time)
        metrics = self.health_check_fn()
        ring.health_check_passed = metrics.is_healthy(self.max_error_rate, self.max_p95)
        print(f"    Health: error_rate={metrics.error_rate:.2%}, p95={metrics.p95_latency_ms}ms")
        if ring.health_check_passed:
            ring.status = RingStatus.COMPLETED
            print(f"    PASS - Ring {ring.ring_id} completed")
            return True
        ring.status = RingStatus.FAILED
        print(f"    FAIL - Ring {ring.ring_id} failed, rolling back")
        return False

    def execute(self) -> Dict:
        print(f"\n=== Ring Deployment: v{self.version} ===")
        for i, ring in enumerate(self.rings):
            if not self._deploy_to_ring(ring):
                self._rollback()
                return {"version": self.version, "status": "rolled_back",
                        "failed_ring": ring.ring_id, "rings_completed": i}
        print(f"\nAll rings completed. v{self.version} is live for 100%.")
        return {"version": self.version, "status": "completed", "rings_completed": len(self.rings)}

    def _rollback(self) -> None:
        for ring in self.rings:
            if ring.status == RingStatus.COMPLETED:
                ring.status = RingStatus.ROLLED_BACK
                print(f"  Rolling back ring {ring.ring_id} ({ring.name})")

# Uso
call_count = 0
def mock_health_check() -> HealthMetrics:
    global call_count
    call_count += 1
    if call_count == 3:
        return HealthMetrics(error_rate=0.08, p95_latency_ms=600, success_rate=0.92)
    return HealthMetrics(error_rate=0.01, p95_latency_ms=120, success_rate=0.99)

rings = [
    Ring(ring_id=0, name="internal", percentage=1.0),
    Ring(ring_id=1, name="early-adopters", percentage=5.0),
    Ring(ring_id=2, name="canary", percentage=25.0),
    Ring(ring_id=3, name="general", percentage=100.0),
]

deployment = RingDeployment("2.1.0", rings, mock_health_check, 0.05, 500, 0.3)
result = deployment.execute()
print(f"\nResult: {result}")
```

### JavaScript

```javascript
class RingDeployment {
  constructor(version, rings, healthCheckFn, options = {}) {
    this.version = version;
    this.rings = rings;
    this.healthCheckFn = healthCheckFn;
    this.maxErrorRate = options.maxErrorRate ?? 0.05;
    this.maxP95 = options.maxP95 ?? 500;
    this.bakeTimeMs = options.bakeTimeMs ?? 100;
  }

  async _deployToRing(ring) {
    ring.status = "active";
    console.log(`  Deploying v${this.version} to ${ring.name} (${ring.percentage}%)`);
    await new Promise(r => setTimeout(r, this.bakeTimeMs));
    const m = this.healthCheckFn();
    ring.healthCheckPassed = m.errorRate < this.maxErrorRate && m.p95LatencyMs < this.maxP95;
    console.log(`    Health: error_rate=${(m.errorRate * 100).toFixed(1)}%, p95=${m.p95LatencyMs}ms`);
    if (ring.healthCheckPassed) { ring.status = "completed"; console.log(`    PASS`); return true; }
    ring.status = "failed"; console.log(`    FAIL, rolling back`); return false;
  }

  async execute() {
    console.log(`\n=== Ring Deployment: v${this.version} ===`);
    for (let i = 0; i < this.rings.length; i++) {
      if (!await this._deployToRing(this.rings[i])) {
        this._rollback();
        return { version: this.version, status: "rolled_back", failedRing: this.rings[i].ringId, ringsCompleted: i };
      }
    }
    console.log(`\nAll rings completed. v${this.version} is live for 100%.`);
    return { version: this.version, status: "completed", ringsCompleted: this.rings.length };
  }

  _rollback() {
    for (const ring of this.rings)
      if (ring.status === "completed") { ring.status = "rolled_back"; console.log(`  Rolling back ring ${ring.ringId}`); }
  }
}

// Uso
let callCount = 0;
const mockHealthCheck = () => {
  callCount++;
  if (callCount === 3) return { errorRate: 0.08, p95LatencyMs: 600, successRate: 0.92 };
  return { errorRate: 0.01, p95LatencyMs: 120, successRate: 0.99 };
};

const rings = [
  { ringId: 0, name: "internal", percentage: 1.0, status: "pending" },
  { ringId: 1, name: "early-adopters", percentage: 5.0, status: "pending" },
  { ringId: 2, name: "canary", percentage: 25.0, status: "pending" },
  { ringId: 3, name: "general", percentage: 100.0, status: "pending" },
];

(async () => {
  const deployment = new RingDeployment("2.1.0", rings, mockHealthCheck, { maxErrorRate: 0.05, maxP95: 500, bakeTimeMs: 50 });
  console.log("\nResult:", await deployment.execute());
})();
```

### Java

```java
import java.util.*;

public class RingDeployment {

    record Ring(int ringId, String name, double percentage, String status) {}
    record HealthMetrics(double errorRate, double p95LatencyMs, double successRate) {
        boolean isHealthy(double maxError, double maxP95) { return errorRate < maxError && p95LatencyMs < maxP95; }
    }

    private final String version;
    private final List<Ring> rings;
    private final java.util.function.Supplier<HealthMetrics> healthCheckFn;
    private final double maxErrorRate, maxP95;

    public RingDeployment(String version, List<Ring> rings, java.util.function.Supplier<HealthMetrics> fn, double maxError, double maxP95) {
        this.version = version; this.rings = rings; this.healthCheckFn = fn; this.maxErrorRate = maxError; this.maxP95 = maxP95;
    }

    private boolean deployToRing(Ring ring) {
        System.out.printf("  Deploying v%s to %s (%.1f%%)%n", version, ring.name(), ring.percentage());
        try { Thread.sleep(50); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        HealthMetrics m = healthCheckFn.get();
        boolean healthy = m.isHealthy(maxErrorRate, maxP95);
        System.out.printf("    Health: error_rate=%.2f%%, p95=%.0fms%n", m.errorRate() * 100, m.p95LatencyMs());
        if (healthy) { System.out.println("    PASS"); return true; }
        System.out.println("    FAIL, rolling back"); return false;
    }

    public Map<String, Object> execute() {
        System.out.printf("%n=== Ring Deployment: v%s ===%n", version);
        for (int i = 0; i < rings.size(); i++) {
            if (!deployToRing(rings.get(i))) {
                System.out.printf("  Rolling back completed rings%n");
                return Map.of("version", version, "status", "rolled_back", "failedRing", rings.get(i).ringId(), "ringsCompleted", i);
            }
        }
        System.out.printf("%nAll rings completed. v%s is live for 100%%.%n", version);
        return Map.of("version", version, "status", "completed", "ringsCompleted", rings.size());
    }

    public static void main(String[] args) {
        int[] callCount = {0};
        var healthCheck = (java.util.function.Supplier<HealthMetrics>) () -> {
            callCount[0]++;
            if (callCount[0] == 3) return new HealthMetrics(0.08, 600, 0.92);
            return new HealthMetrics(0.01, 120, 0.99);
        };
        var rings = List.of(
            new Ring(0, "internal", 1.0, "pending"),
            new Ring(1, "early-adopters", 5.0, "pending"),
            new Ring(2, "canary", 25.0, "pending"),
            new Ring(3, "general", 100.0, "pending")
        );
        System.out.println("\nResult: " + new RingDeployment("2.1.0", rings, healthCheck, 0.05, 500).execute());
    }
}
```

## Explicación

El despliegue procede a traves de cada anillo secuencialmente:

1. **Desplegar al anillo**: Rutea el porcentaje configurado de trafico a la nueva version. Esto se hace via feature flags, pesos del load balancer, o estrategias de rollout de Kubernetes.
2. **Bake time**: Espera un periodo configurado para acumular suficiente trafico para metricas de salud significativas. Corto para anillos pequenos (minutos), mas largo para anillos grandes (horas).
3. **Health check**: Compara metricas contra umbrales. Tasa de error, latencia y metricas de negocio (conversion, signup) son señales comunes.
4. **Avanzar o revertir**: Si es saludable, procede al siguiente anillo. Si no es saludable, detiene el rollout y revierte todos los anillos completados a la version anterior.

## Variantes

| Variante | Descripción | Caso de uso |
|---------|-------------|-------------|
| **Anillos geograficos** | Desplegar por region (US, EU, APAC) | Compliance regional, testing de latencia |
| **Anillos por tier** | Desplegar por plan (free, pro, enterprise) | SaaS con SLAs por niveles |
| **Anillos por tiempo** | Expandir el anillo automaticamente con el tiempo | Cambios de bajo riesgo que necesitan minima supervision |
| **Anillos con aprobacion manual** | Requerir aprobacion humana entre anillos | Cambios de alto riesgo, requisitos de compliance |

## Buenas prácticas

- **Empieza con 1% o menos** para detectar problemas obvios con impacto minimal
- **Usa trafico real de usuarios**, no tests sinteticos, para validacion de salud
- **Define bake times proporcionales al tamano del anillo** (mas trafico = señal mas rapida)
- **Define criterios de rollback antes de empezar** para que la decision sea automatica
- **Monitorea metricas de negocio**, no solo tecnicas (conversion, revenue)
- **Mantén la version anterior caliente** para que el rollback sea instantaneo

## Errores comunes

- Saltarse el bake time, avanzar antes de que acumule suficiente data
- Usar solo metricas tecnicas, perdiendo impacto de negocio (conversiones caidas)
- Anillos demasiado grandes (saltar de 5% a 100% anula el proposito)
- Sin rollback automatico, dependiendo de intervencion manual durante incidentes
- Revertir solo el anillo fallido, dejando anillos anteriores en la nueva version
- No probar el procedimiento de rollback mismo

## Preguntas frecuentes

**Q: Como se diferencia el despliegue por anillos del canary release?**
A: Canary release es un solo paso: rutea un porcentaje pequeno a la nueva version, observa, luego ve a 100%. El despliegue por anillos es multi-paso: multiples anillos de tamano creciente con health checks entre cada uno. El despliegue por anillos es canary release con control mas granular.

**Q: Cuanto debe durar el bake time?**
A: Lo suficiente para obtener data de salud estadisticamente significativa. Para 1% de trafico, quizas horas. Para 25%, minutos. Una regla: apunta a al menos 1000 requests en el anillo antes de evaluar salud.

**Q: Que metricas debo verificar?**
A: Tasa de error y latencia son el minimo. Anade metricas de negocio relevantes a tu app: tasa de conversion, completacion de checkout, tasa de signup. Una version tecnicamente saludable pero que cae conversiones no deberia avanzar.

**Q: Puedo saltar anillos para cambios de bajo riesgo?**
A: Si. Para cambios triviales (updates de texto, fixes de CSS), puedes empezar en un anillo mas grande. Para cambios de alto riesgo (migraciones de schema, nuevas dependencias), empieza en el anillo mas pequeno. Ajusta la estrategia de anillos al nivel de riesgo.
