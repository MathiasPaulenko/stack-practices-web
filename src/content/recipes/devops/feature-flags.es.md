---
contentType: recipes
slug: feature-flags
title: "Feature Flags (Banderas de Funcionalidad)"
description: "Cómo implementar feature toggles para desplegar, probar y revertir funcionalidad de forma segura sin desplegar código."
metaDescription: "Aprende a implementar feature flags en Python, JavaScript y Java. Cubre servicios de toggle, A/B testing, estrategias de rollout y rollbacks seguros."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - feature-flags
  - ci-cd
  - automation
  - deployment
relatedResources:
  - /recipes/background-jobs
  - /recipes/cli-tool-argument-parsing
  - /recipes/environment-variables
  - /recipes/health-check-endpoint
  - /recipes/parse-config-files
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a implementar feature flags en Python, JavaScript y Java. Cubre servicios de toggle, A/B testing, estrategias de rollout y rollbacks seguros."
  keywords:
    - feature-flags
    - toggles
    - rollout
    - ab-testing
    - devops
    - python
    - javascript
    - java
---
## Visión General

Los feature flags (o feature toggles) desacoplan el despliegue del lanzamiento. Permiten mergear funciones incompletas a `main`, habilitarlas para un subconjunto de usuarios, medir impacto y revertir instantáneamente sin un nuevo despliegue. Aqui se explica como la construcción de un servicio ligero de flags, estrategias de rollout (booleano, porcentaje, targeting de usuarios) y patrones de limpieza segura en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Despliegues gradualmente una función de alto riesgo para monitorear errores. Consulta [Health Check Endpoint](/recipes/devops/health-check-endpoint) para monitorear salud de la aplicación.
- Ejecutes tests A/B para comparar dos implementaciones de una función. Consulta [Load Testing](/recipes/testing/load-testing) para medir rendimiento bajo carga.
- Despliegues código incompleto a `main` sin exponerlo a usuarios. Consulta [Git Workflow](/recipes/devops/git-workflow) para gestión de ramas.
- Necesites un kill-switch instantáneo para una función causando problemas en producción. Consulta [Retry Logic](/recipes/architecture/retry-backoff) para manejar fallas transitorias gracefulmente.

## Solución

### Python

```python
import hashlib
import random
from typing import Callable

class FeatureFlags:
    def __init__(self, config: dict[str, any]):
        self.config = config

    def is_enabled(self, flag: str, user_id: str = None) -> bool:
        rule = self.config.get(flag, False)

        if isinstance(rule, bool):
            return rule

        if isinstance(rule, dict):
            # Rollout por porcentaje
            if "percentage" in rule and user_id:
                bucket = self._hash_bucket(user_id, flag)
                return bucket < rule["percentage"]
            # Usuarios target
            if "users" in rule and user_id:
                return user_id in rule["users"]
            # Grupos target
            if "groups" in rule:
                return self._check_groups(rule["groups"])

        return False

    def _hash_bucket(self, user_id: str, flag: str) -> int:
        digest = hashlib.md5(f"{flag}:{user_id}".encode()).hexdigest()
        return int(digest, 16) % 100

    def _check_groups(self, groups: list[str]) -> bool:
        # Hook para lookup de membresía de grupo
        return False

# Uso
flags = FeatureFlags({
    "new_dashboard": True,
    "beta_search": {"percentage": 10},          # 10% rollout
    "vip_feature": {"users": ["user_123"]},     # dirigido
    "admin_tools": {"groups": ["admins"]},       # por grupos
})

if flags.is_enabled("new_dashboard"):
    render_new_dashboard()

if flags.is_enabled("beta_search", user_id="user_456"):
    show_beta_search()
```

### JavaScript

```javascript
import { createHash } from "crypto";

class FeatureFlags {
  constructor(config) {
    this.config = config;
  }

  isEnabled(flag, userId = null) {
    const rule = this.config[flag] ?? false;

    if (typeof rule === "boolean") return rule;
    if (typeof rule !== "object") return false;

    if (rule.percentage != null && userId) {
      return this.#hashBucket(userId, flag) < rule.percentage;
    }
    if (rule.users && userId) {
      return rule.users.includes(userId);
    }
    if (rule.groups) {
      return this.#checkGroups(rule.groups);
    }
    return false;
  }

  #hashBucket(userId, flag) {
    const hash = createHash("md5").update(`${flag}:${userId}`).digest("hex");
    return parseInt(hash.slice(0, 8), 16) % 100;
  }

  #checkGroups(groups) {
    return false; // hook para membresía de grupo
  }
}

// Uso
const flags = new FeatureFlags({
  newDashboard: true,
  betaSearch: { percentage: 10 },
  vipFeature: { users: ["user_123"] },
  adminTools: { groups: ["admins"] },
});

if (flags.isEnabled("newDashboard")) {
  renderNewDashboard();
}

if (flags.isEnabled("betaSearch", "user_456")) {
  showBetaSearch();
}
```

### Java

```java
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;

public class FeatureFlags {
  private final Map<String, Object> config;

  public FeatureFlags(Map<String, Object> config) {
    this.config = config;
  }

  public boolean isEnabled(String flag, String userId) {
    Object rule = config.getOrDefault(flag, false);

    if (rule instanceof Boolean b) return b;
    if (!(rule instanceof Map<?, ?> map)) return false;

    @SuppressWarnings("unchecked")
    Map<String, Object> ruleMap = (Map<String, Object>) map;

    if (ruleMap.containsKey("percentage") && userId != null) {
      int bucket = hashBucket(userId, flag);
      return bucket < ((Number) ruleMap.get("percentage")).intValue();
    }
    if (ruleMap.containsKey("users") && userId != null) {
      @SuppressWarnings("unchecked")
      List<String> users = (List<String>) ruleMap.get("users");
      return users.contains(userId);
    }
    if (ruleMap.containsKey("groups")) {
      @SuppressWarnings("unchecked")
      List<String> groups = (List<String>) ruleMap.get("groups");
      return checkGroups(groups);
    }
    return false;
  }

  private int hashBucket(String userId, String flag) {
    try {
      MessageDigest md = MessageDigest.getInstance("MD5");
      byte[] digest = md.digest((flag + ":" + userId).getBytes());
      return Math.abs(Arrays.hashCode(digest)) % 100;
    } catch (NoSuchAlgorithmException e) {
      return 0;
    }
  }

  private boolean checkGroups(List<String> groups) {
    return false; // hook para lookup de membresía
  }

  // Uso
  public static void main(String[] args) {
    Map<String, Object> config = Map.of(
      "newDashboard", true,
      "betaSearch", Map.of("percentage", 10),
      "vipFeature", Map.of("users", List.of("user_123")),
      "adminTools", Map.of("groups", List.of("admins"))
    );

    FeatureFlags flags = new FeatureFlags(config);
    System.out.println(flags.isEnabled("newDashboard", null)); // true
    System.out.println(flags.isEnabled("betaSearch", "user_456")); // ~10%
  }
}
```

## Explicación

- **Flags booleanos** son interruptores on/off para toda la aplicación. Úsalos para kill-switches y dark launches.
- **Rollouts por porcentaje** asignan usuarios a buckets vía un hash determinístico de `(flag_name + user_id) % 100`. El mismo usuario siempre ve el mismo bucket, asegurando experiencias consistentes.
- **Targeting de usuarios** whitelistea explícitamente usuarios (beta testers, equipo interno) para acceso temprano.
- **Targeting de grupos** verifica membresía en roles o segmentos (admin, premium, región geográfica).
- **Hashing determinístico** es crítico: la asignación aleatoria haría que un mismo usuario alterne entre variantes en cada request, rompiendo UX y analytics.

## Variantes

| Estrategia | Tipo de Regla | Ideal Para |
|------------|---------------|------------|
| Booleano | `true` / `false` | Kill-switches, rollbacks de emergencia |
| Porcentaje | `{"percentage": 10}` | Rollout gradual, releases canary |
| Target por Usuario | `{"users": ["id1"]}` | Programas beta, dogfooding interno |
| Target por Grupo | `{"groups": ["premium"]}` | Tiers de función, acceso basado en roles |
| A/B Test | `{"percentage": 50, "variant": "B"}` | Comparar dos implementaciones |

## Lo que funciona

1. **Mantén los flags de corta duración** — los flags permanentes se convierten en deuda técnica. Elimínalos y las rutas de código muerto una vez que una función esté completamente desplegada.
2. **Usa bucketing determinístico** — hashea `(flag + user_id)` para que el mismo usuario siempre obtenga la misma experiencia, evitando alternancias.
3. **Loguea evaluaciones de flags** — registra qué usuarios vieron qué variante para debugging y correlación de analytics.
4. **Default a off** — si el servicio de flags es inalcanzable, la función debería estar deshabilitada para prevenir exposición inesperada.
5. **Audita cambios de flags** — trata los cambios de configuración de flags como despliegues de producción; requiere code review y trackea en control de versiones.

## Errores Comunes

1. Dejar flags en la base de código permanentemente, creando un laberinto de rutas de código muerto.
2. Usar bucketing aleatorio en vez de hashing determinístico, causando experiencias de usuario inconsistentes.
3. No manejar el caso donde el servicio de config de flags está caído, provocando fallos en cascada.
4. Hacer over-targeting de flags a usuarios individuales en vez de grupos, haciendo la gestión no escalable.
5. Lanzar una función bajo un flag sin monitoreo ni alerting, perdiendo problemas de producción.

## Preguntas Frecuentes

### ¿Cuándo debería eliminar un feature flag?

Elimina el flag y sus ramas condicionales una vez que la función es estable para el 100% de usuarios y ha estado corriendo en producción sin problemas por 1-2 ciclos de release. Los flags que viven más de un mes tras el despliegue completo se convierten en deuda técnica.

### ¿En qué se diferencian los feature flags de los settings de configuración?

Los settings de configuración son típicamente estáticos y aplican globalmente (valores de timeout, límites de funciones). Los feature flags son live, scoped por usuario, y diseñados para toggle rápido sin redeployment. Los flags evalúan por request; la config se carga al inicio.

### ¿Puedo usar feature flags para autorización?

No. Los feature flags controlan visibilidad y rollout de funciones; la autorización controla derechos de acceso. No uses flags para reforzar límites de seguridad. Un usuario que evade un chequeo de flag no debería ganar acceso no autorizado a datos u operaciones sensibles.

### Integración con Servicio Gestionado (LaunchDarkly)

```python
from ldclient import LDClient
from ldclient.config import Config

ldclient = LDClient(Config(sdk_key="sdk-xxx"))

def is_enabled(flag: str, user: dict) -> bool:
    return ldclient.variation(flag, user, default=False)

# Uso
user = {"key": "user_123", "email": "user@example.com", "country": "US"}
if is_enabled("new_checkout", user):
    render_new_checkout()
```

### Estrategia de Rollout Escalonado

```python
# Plan de rollout progresivo
rollout_plan = [
    {"percentage": 1,  "duration_hours": 24,  "monitor": True},
    {"percentage": 5,  "duration_hours": 48,  "monitor": True},
    {"percentage": 25, "duration_hours": 72,  "monitor": True},
    {"percentage": 50, "duration_hours": 96,  "monitor": True},
    {"percentage": 100,"duration_hours": 0,   "monitor": True},
]

def advance_rollout(flag: str, current_pct: int) -> int:
    for stage in rollout_plan:
        if stage["percentage"] > current_pct:
            update_flag(flag, {"percentage": stage["percentage"]})
            return stage["percentage"]
    return 100
```

### A/B Testing con Feature Flags

```javascript
// Asignar usuarios a variante A o B deterministicamente
function getVariant(flag, userId) {
  const bucket = hashBucket(userId, flag);
  if (bucket < 50) return "A";  // control
  return "B";                    // tratamiento
}

// Trackear eventos de conversión por variante
function trackExperiment(flag, userId, variant, event) {
  analytics.track({
    experiment: flag,
    userId,
    variant,
    event,
    timestamp: Date.now(),
  });
}

// Uso
const variant = getVariant("checkout_redesign", userId);
if (variant === "B") {
  renderNewCheckout();
} else {
  renderOldCheckout();
}
trackExperiment("checkout_redesign", userId, variant, "checkout_view");
```

## Mejores Prácticas Adicionales

1. **Nombra flags con una convención.** Usa formato `team_feature_state` para descubribilidad:

```yaml
# Bien: team, feature y estado claros
checkout_new_payment_flow_beta
auth_oauth_migration_canary
analytics_v2_enabled

# Mal: ambiguo, sin prefijo de team
new_feature
flag_1
temp_toggle
```

2. **Agrega fechas de expiración a los flags.** Previene zombie flags con una fecha de limpieza:

```python
flag_config = {
    "new_dashboard": {
        "enabled": True,
        "expires": "2026-09-01",  # eliminar después de esta fecha
        "owner": "frontend-team",
    }
}
```

3. **Usa metadata de flags para observabilidad.** Taguea flags con team, ticket y nivel de riesgo:

```yaml
new_checkout:
  enabled: true
  percentage: 25
  owner: payments-team
  ticket: PROJ-1234
  risk: high
  rollback_plan: "Set percentage to 0"
```

## Errores Comunes Adicionales

1. **Anidar flags dentro de flags.** Lógica condicional compleja se vuelve untestable:

```python
# Mal: spaghetti de flags
if flags.is_enabled("feature_a"):
    if flags.is_enabled("feature_b"):
        if flags.is_enabled("feature_c"):
            do_thing()

# Bien: un flag por concern
if flags.is_enabled("feature_abc"):
    do_thing()
```

2. **No testear el estado off.** Siempre verifica que el path feature-off funcione:

```python
# Testear ambos estados en CI
@pytest.mark.parametrize("flag_state", [True, False])
def test_checkout(flag_state, monkeypatch):
    monkeypatch.setattr(flags, "is_enabled", lambda f, u=None: flag_state)
    response = client.get("/checkout")
    assert response.status_code == 200
```

3. **Toggle flags durante requests activos.** Usa evaluación snapshot para evitar cambios mid-request:

```python
# Evaluar una vez por request, no por chequeo
flag_snapshot = {
    flag: flags.is_enabled(flag, user_id)
    for flag in required_flags
}
# Usar flag_snapshot durante todo el ciclo de vida del request
```

## FAQ Adicional

### Como gestiono flags entre entornos?

Usa configs de flags separadas por entorno (dev, staging, prod). En dev, los flags pueden estar on por defecto para testing. En prod, default a off. Servicios gestionados como LaunchDarkly o Unleash manejan esto con proyectos scoped por entorno.

### Qué es un dark launch?

Un dark launch despliega código nuevo a producción pero lo mantiene invisible a usuarios vía un flag. Puedes testear infraestructura, rendimiento e integración con tráfico real enrutando una copia de requests al nuevo code path mientras sirves a los usuarios la respuesta vieja.

### Cuántos flags debería tener?

Mantén los flags activos bajo 20-30 por servicio. Más que eso indica limpieza insuficiente. Ejecuta una auditoría mensual de flags para identificar y eliminar flags stale.

## Tips de Rendimiento

1. **Cachéa evaluaciones de flags por request.** Evita lookups repetidos para el mismo flag:

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def cached_is_enabled(flag: str, user_id: str) -> bool:
    return flags.is_enabled(flag, user_id)
```

2. **Usa evaluación local.** Evita llamadas de red por chequeo de flag descargando la config de flags:

```python
# Descargar config de flags una vez, evaluar localmente
flag_config = fetch_flag_config()  # refresh periódico
local_flags = FeatureFlags(flag_config)

# Evaluar sin llamadas de red
if local_flags.is_enabled("new_feature", user_id):
    ...
```

3. **Batchea evaluaciones de flags.** Reduce llamadas al SDK evaluando múltiples flags a la vez:

```python
# LaunchDarkly: evaluar todos los flags en una llamada
all_flags = ldclient.all_flags_state(user)
if all_flags.get_flag_value("new_checkout"):
    render_new_checkout()
if all_flags.get_flag_value("new_search"):
    render_new_search()
```
