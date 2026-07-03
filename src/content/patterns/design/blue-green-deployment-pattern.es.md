---
contentType: patterns
slug: blue-green-deployment-pattern
title: "Patrón Blue-Green Deployment"
description: "Mantener dos entornos identicos y cambiar trafico entre ellos. Desplegar al inactivo, testear, luego cambiar el router para release instantaneo o rollback."
metaDescription: "Mantener dos entornos identicos y cambiar trafico entre ellos. Desplegar al inactivo, testear, luego cambiar el router para release instantaneo o rollback."
difficulty: intermediate
topics:
  - devops
  - architecture
tags:
  - blue-green-deployment
  - patron
  - patron-diseno
  - estrategia-despliegue
  - zero-downtime
  - rollback
  - release
relatedResources:
  - /patterns/design/canary-release-pattern
  - /patterns/design/deployment-ring-pattern
  - /patterns/design/graceful-degradation-pattern
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Mantener dos entornos identicos y cambiar trafico entre ellos. Desplegar al inactivo, testear, luego cambiar el router para release instantaneo o rollback."
  keywords:
    - patron blue green deployment
    - despliegue zero downtime
    - patron diseno
    - estrategia despliegue
    - rollback instantaneo
    - patron release
    - switch blue green
---

# Patrón Blue-Green Deployment

## Descripción general

El patrón Blue-Green Deployment mantiene dos entornos de produccion identicos: blue y green. En cualquier momento, un entorno sirve trafico en vivo (activo) mientras el otro esta inactivo. Para desplegar una nueva version, despliegas al entorno inactivo, ejecutas smoke tests contra el, y luego cambias el router para enviar trafico al entorno recien desplegado. El switch es instantaneo.

Si algo sale mal, cambias el router de vuelta al entorno anterior. No hay re-despliegue, no hay espera por builds. La version anterior sigue corriendo y lista para servir trafico inmediatamente. Esto hace el rollback tan simple como un cambio de DNS o switch de load balancer.

## Cuándo usarlo

Usa el patrón Blue-Green Deployment cuando:
- Necesitas despliegues sin downtime para un servicio stateless
- La velocidad de rollback es critica (segundos, no minutos)
- Puedes permitirte correr dos entornos identicos
- Tu servicio no requiere conexiones de larga duracion que compliquen el switch
- Ejemplos: servicios API, aplicaciones web, microservicios con estado externalizado

## Solución

### Python

```python
from dataclasses import dataclass
from typing import Optional, List, Dict
from enum import Enum
import time

class EnvironmentColor(Enum):
    BLUE = "blue"
    GREEN = "green"

class EnvironmentStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    DEPLOYING = "deploying"
    TESTING = "testing"

@dataclass
class Environment:
    color: EnvironmentColor
    version: str = ""
    status: EnvironmentStatus = EnvironmentStatus.INACTIVE
    health: bool = False
    instance_count: int = 0

class BlueGreenDeployment:
    def __init__(self):
        self.blue = Environment(color=EnvironmentColor.BLUE, version="1.0.0",
                                status=EnvironmentStatus.ACTIVE, health=True, instance_count=3)
        self.green = Environment(color=EnvironmentColor.GREEN)
        self._active = self.blue
        self._inactive = self.green
        self._history: List[Dict] = []

    @property
    def active(self) -> Environment:
        return self._active

    @property
    def inactive(self) -> Environment:
        return self._inactive

    def _switch(self) -> None:
        self._active, self._inactive = self._inactive, self._active
        self._active.status = EnvironmentStatus.ACTIVE
        self._inactive.status = EnvironmentStatus.INACTIVE

    def deploy(self, new_version: str, smoke_tests: List[callable] = None) -> Dict:
        print(f"\n=== Blue-Green Deploy: v{new_version} ===")
        smoke_tests = smoke_tests or []
        target = self.inactive
        print(f"  Deploying to {target.color.value}")
        target.status = EnvironmentStatus.DEPLOYING
        target.version = new_version
        target.instance_count = 3
        print(f"  Deployed v{new_version} to {target.color.value}")

        target.status = EnvironmentStatus.TESTING
        for test in smoke_tests:
            if not test():
                target.health = False
                target.status = EnvironmentStatus.INACTIVE
                print(f"  Smoke tests FAILED on {target.color.value}")
                return {"success": False, "active": self.active.color.value, "version": self.active.version}

        target.health = True
        print(f"  Smoke tests passed on {target.color.value}")
        self._switch()
        print(f"  Switched: {self.active.color.value} (v{self.active.version}) is now active")
        self._history.append({"version": new_version, "active": self.active.color.value})
        return {"success": True, "active": self.active.color.value, "version": new_version}

    def rollback(self) -> Dict:
        print(f"\n=== Rollback ===")
        if self.inactive.health and self.inactive.version:
            self._switch()
            print(f"  Rolled back to {self.active.color.value} (v{self.active.version})")
            return {"success": True, "active": self.active.color.value, "version": self.active.version, "rollback": True}
        return {"success": False, "active": self.active.color.value, "version": self.active.version}

# Uso
bg = BlueGreenDeployment()
result = bg.deploy("2.0.0", smoke_tests=[
    lambda: (print("    Test: API response"), True)[1],
    lambda: (print("    Test: DB connection"), True)[1],
])
print(f"Result: {result}")
print(f"\n=== Rolling back ===")
print(f"Rollback: {bg.rollback()}")
```

### JavaScript

```javascript
class Environment {
  constructor(color) {
    this.color = color; this.version = ""; this.status = "inactive";
    this.health = false; this.instanceCount = 0;
  }
}

class BlueGreenDeployment {
  constructor() {
    this.blue = new Environment("blue");
    this.blue.version = "1.0.0"; this.blue.status = "active"; this.blue.health = true; this.blue.instanceCount = 3;
    this.green = new Environment("green");
    this.active = this.blue; this.inactive = this.green;
    this.history = [];
  }

  _switch() {
    [this.active, this.inactive] = [this.inactive, this.active];
    this.active.status = "active"; this.inactive.status = "inactive";
  }

  async deploy(newVersion, smokeTests = []) {
    console.log(`\n=== Blue-Green Deploy: v${newVersion} ===`);
    const target = this.inactive;
    console.log(`  Deploying to ${target.color}`);
    target.status = "deploying"; target.version = newVersion; target.instanceCount = 3;
    console.log(`  Deployed v${newVersion} to ${target.color}`);

    for (const test of smokeTests) {
      if (!await test()) {
        target.health = false; target.status = "inactive";
        console.log(`  Smoke tests FAILED on ${target.color}`);
        return { success: false, active: this.active.color, version: this.active.version };
      }
    }
    target.health = true;
    console.log(`  Smoke tests passed on ${target.color}`);
    this._switch();
    console.log(`  Switched: ${this.active.color} (v${this.active.version}) is now active`);
    return { success: true, active: this.active.color, version: newVersion };
  }

  rollback() {
    console.log(`\n=== Rollback ===`);
    if (this.inactive.health && this.inactive.version) {
      this._switch();
      console.log(`  Rolled back to ${this.active.color} (v${this.active.version})`);
      return { success: true, active: this.active.color, version: this.active.version, rollback: true };
    }
    return { success: false, active: this.active.color, version: this.active.version };
  }
}

// Uso
(async () => {
  const bg = new BlueGreenDeployment();
  const result = await bg.deploy("2.0.0", [
    async () => { console.log("    Test: API response"); return true; },
    async () => { console.log("    Test: DB connection"); return true; },
  ]);
  console.log("Result:", result);
  console.log("\n=== Rolling back ===");
  console.log("Rollback:", bg.rollback());
})();
```

### Java

```java
import java.util.*;

public class BlueGreenDeployment {

    enum Color { BLUE, GREEN }

    static class Environment {
        Color color; String version = ""; String status = "inactive";
        boolean health = false; int instanceCount = 0;
        Environment(Color c) { this.color = c; }
    }

    private Environment active, inactive;
    private final List<Map<String, Object>> history = new ArrayList<>();

    public BlueGreenDeployment() {
        active = new Environment(Color.BLUE);
        active.version = "1.0.0"; active.status = "active"; active.health = true; active.instanceCount = 3;
        inactive = new Environment(Color.GREEN);
    }

    private void switchEnv() {
        Environment tmp = active; active = inactive; inactive = tmp;
        active.status = "active"; inactive.status = "inactive";
    }

    public Map<String, Object> deploy(String newVersion, List<java.util.function.Supplier<Boolean>> smokeTests) {
        System.out.printf("%n=== Blue-Green Deploy: v%s ===%n", newVersion);
        Environment target = inactive;
        System.out.printf("  Deploying to %s%n", target.color);
        target.status = "deploying"; target.version = newVersion; target.instanceCount = 3;

        for (var test : smokeTests) {
            if (!test.get()) {
                target.health = false; target.status = "inactive";
                System.out.printf("  Smoke tests FAILED on %s%n", target.color);
                return Map.of("success", false, "active", active.color, "version", active.version);
            }
        }
        target.health = true;
        System.out.printf("  Smoke tests passed on %s%n", target.color);
        switchEnv();
        System.out.printf("  Switched: %s (v%s) is now active%n", active.color, active.version);
        return Map.of("success", true, "active", active.color, "version", newVersion);
    }

    public Map<String, Object> rollback() {
        System.out.println("\n=== Rollback ===");
        if (inactive.health && !inactive.version.isEmpty()) {
            switchEnv();
            System.out.printf("  Rolled back to %s (v%s)%n", active.color, active.version);
            return Map.of("success", true, "active", active.color, "version", active.version, "rollback", true);
        }
        return Map.of("success", false, "active", active.color, "version", active.version);
    }

    public static void main(String[] args) {
        var bg = new BlueGreenDeployment();
        System.out.println("Result: " + bg.deploy("2.0.0", List.of(
            () -> { System.out.println("    Test: API response"); return true; },
            () -> { System.out.println("    Test: DB connection"); return true; }
        )));
        System.out.println("\nRollback: " + bg.rollback());
    }
}
```

## Explicación

El patron opera en cuatro fases:

1. **Desplegar al inactivo**: La nueva version se despliega al entorno que no esta sirviendo trafico. El entorno activo continua sirviendo usuarios sin interrupcion.
2. **Smoke test**: Ejecuta tests contra el entorno inactivo para verificar que la nueva version funciona. Estos tests van directo al entorno inactivo, no a traves del router.
3. **Switch**: Actualiza el router (load balancer, DNS, API gateway) para enviar trafico al entorno recien desplegado. El switch es un cambio de configuracion, no un despliegue, asi que toma segundos.
4. **Rollback si es necesario**: Si aparecen problemas despues del switch, cambia el router de vuelta. La version anterior sigue corriendo en el otro entorno, lista para servir trafico inmediatamente.

## Variantes

| Variante | Descripción | Caso de uso |
|---------|-------------|-------------|
| **Blue-green gradual** | Cambiar trafico gradualmente en lugar de un switch instantaneo | Volumenes de trafico grandes donde el switch instantaneo abruma |
| **Blue-green con canary** | Combinar con canary: shift 10% primero, luego 100% | Despliegues aversos al riesgo |
| **Trafico shadow** | Enviar una copia de trafico al env inactivo para testing | Validar bajo carga real antes del switch |
| **Blue-green con drain** | Esperar que conexiones activas terminen antes del switch | Conexiones de larga duracion (WebSocket, uploads) |

## Buenas prácticas

- **Externaliza todo el estado** (BD, cache, sesiones) para que los entornos sean realmente intercambiables
- **Ejecuta smoke tests contra el entorno inactivo** antes del switch
- **Mantén ambos entornos a la misma escala** para que el nuevo pueda manejar toda la carga
- **Usa un solo punto de switch** (load balancer, API gateway) para cambio de trafico instantaneo
- **Monitorea el nuevo entorno inmediatamente despues del switch** para picos de error
- **Mantén la version anterior corriendo** un rato despues del switch, no solo para rollback sino para comparacion

## Errores comunes

- No externalizar estado, asi el entorno inactivo tiene data stale o faltante
- Correr entornos a escalas diferentes, causando problemas de capacidad despues del switch
- Cambiar sin smoke testear el entorno inactivo primero
- No probar el procedimiento de rollback, descubrir que falla cuando lo necesitas
- Cambiar DNS sin TTL bajo, asi los clientes cachean la IP vieja por demasiado tiempo
- Conexiones de larga duracion (WebSocket, uploads) que no se transfieren limpiamente durante el switch

## Preguntas frecuentes

**Q: Como se diferencia blue-green del despliegue canary?**
A: Blue-green cambia 100% del trafico de una vez entre dos entornos. Canary gradualmente cambia un porcentaje de trafico a la nueva version. Blue-green da rollback instantaneo. Canary da validacion gradual. Se pueden combinar.

**Q: Funciona blue-green con bases de datos?**
A: Solo si el cambio de schema de BD es backward-compatible. Ambas versiones deben funcionar con la misma BD. Para cambios de schema breaking, necesitas una migracion expansion-contraction (anadir columnas nuevas, desplegar, migrar data, remover columnas viejas).

**Q: Que pasa con el costo? Estoy corriendo dos entornos de produccion?**
A: Si. Necesitas dos entornos completos. Algunos equipos mantienen el inactivo a escala reducida y lo escalan antes del switch. Entornos cloud pueden automatizar esto: escalar arriba, switch, escalar abajo el viejo.

**Q: Como manejo WebSocket o conexiones de larga duracion?**
A: El switch no mata conexiones existentes. Nuevas conexiones van al nuevo entorno. Conexiones viejas drenan naturalmente. Para cutover inmediato, puedes cerrar conexiones existentes con un mensaje de graceful shutdown y dejar que los clientes se reconecten al nuevo entorno.
