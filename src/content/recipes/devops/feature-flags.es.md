---
contentType: recipes
slug: feature-flags
title: "Feature Flags: Rollout, Segmentación y Rollback Seguro"
description: "Implementá feature toggles para desplegar, probar y revertir funcionalidad de forma segura sin volver a desplegar código."
metaDescription: "Implementá feature flags en Python, JavaScript y Java. Incluye toggles booleanos, porcentajes de rollout, targeting de usuarios y rollbacks seguros."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - feature-flags
  - toggles
  - ci-cd
  - deployment
  - ab-testing
relatedResources:
  - /recipes/background-jobs
  - /recipes/cli-tool-argument-parsing
  - /recipes/environment-variables
  - /recipes/health-check-endpoint
  - /recipes/parse-config-files
  - /recipes/retry-logic-exponential-backoff
lastUpdated: "2026-08-19"
publishedAt: "2026-06-11"
author: Mathias Paulenko
seo:
  metaDescription: "Implementá feature flags en Python, JavaScript y Java. Incluye toggles booleanos, porcentajes de rollout, targeting de usuarios y rollbacks seguros."
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

## Resumen

Las feature flags desacoplan el despliegue del release. Podés mergear código
incompleto a `main`, mantenerlo oculto, habilitarlo para un subconjunto de usuarios,
medir el impacto y apagarlo al instante sin un nuevo despliegue. Esta receta muestra
cómo construir un servicio ligero de flags en Python, JavaScript y Java con rollouts
booleanos, porcentuales, por usuario y por grupo.

## Cuándo Usar

- Para hacer un rollout gradual de una funcionalidad riesgosa y monitorear errores.
- Para correr A/B tests comparando dos implementaciones.
- Para desplegar código sin terminar a `main` sin exponerlo a los usuarios.
- Para agregar un kill-switch para una funcionalidad que causa problemas en
  producción.

## Cuándo NO Usar

- Para reforzar límites de seguridad o reglas de autorización.
- Cuando un setting de configuración simple alcanza y no cambia por usuario.
- Para lógica de bifurcación de larga duración que debería ser un camino normal de
  código.

## Solución

### Python

```python
import hashlib
from typing import Any

class FeatureFlags:
    def __init__(self, config: dict[str, Any]):
        self.config = config

    def is_enabled(self, flag: str, user_id: str | None = None) -> bool:
        rule = self.config.get(flag, False)

        if isinstance(rule, bool):
            return rule

        if isinstance(rule, dict):
            if "percentage" in rule and user_id:
                return self._hash_bucket(user_id, flag) < rule["percentage"]
            if "users" in rule and user_id:
                return user_id in rule["users"]
            if "groups" in rule:
                return self._check_groups(rule["groups"])

        return False

    def _hash_bucket(self, user_id: str, flag: str) -> int:
        digest = hashlib.md5(f"{flag}:{user_id}".encode()).hexdigest()
        return int(digest, 16) % 100

    def _check_groups(self, groups: list[str]) -> bool:
        # Hook para consulta de membresía a grupos
        return False

flags = FeatureFlags({
    "new_dashboard": True,
    "beta_search": {"percentage": 10},
    "vip_feature": {"users": ["user_123"]},
    "admin_tools": {"groups": ["admins"]},
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
    return false;
  }
}

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
    return false;
  }

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

### Servicio administrado con LaunchDarkly

```python
from ldclient import LDClient
from ldclient.config import Config

ldclient = LDClient(Config(sdk_key="${LAUNCHDARKLY_SDK_KEY}"))

def is_enabled(flag: str, user: dict) -> bool:
    return ldclient.variation(flag, user, default=False)

user = {"key": "user_123", "email": "user@example.com", "country": "US"}
if is_enabled("new_checkout", user):
    render_new_checkout()
```

## Explicación

- Los **flags booleanos** son interruptores simples, ideales para kill-switches y dark
  launches.
- Los **rollouts por porcentaje** ubican a los usuarios en buckets usando un hash
  determinístico de `flag_name + user_id`. El mismo usuario siempre cae en el mismo
  bucket.
- El **targeting por usuario** incluye en una lista blanca a usuarios específicos.
- El **targeting por grupo** verifica membresía en roles o segmentos.
- El **hash determinístico** es clave: la asignación aleatoria haría que un usuario
  cambie de variante en cada request, rompiendo la experiencia y las métricas.

## Variantes

|Estrategia|Regla|Ideal para|
|----------|-----|----------|
|Booleano|`true` / `false`|Kill-switches, rollbacks de emergencia|
|Porcentaje|`{"percentage": 10}`|Rollout gradual, canary releases|
|Por usuario|`{"users": ["id1"]}`|Programas beta, dogfooding interno|
|Por grupo|`{"groups": ["premium"]}`|Tiers de funcionalidad, acceso por rol|
|A/B test|`{"percentage": 50, "variant": "B"}`|Comparar dos implementaciones|

## Buenas Prácticas

- Mantené las flags de corta duración. Eliminalas y los caminos de código muerto una
  vez que la funcionalidad esté completamente desplegada.
- Usá bucketing determinístico para que el mismo usuario siempre tenga la misma
  experiencia.
- Logueá las evaluaciones de flags para correlacionar variantes con comportamiento y
  errores.
- Default a off para que un servicio de flags caído no habilite funcionalidades por
  accidente.
- Auditá los cambios de flags como deploys de producción: revisalos y seguirlos en
  control de versiones.

## Errores Comunes

- Dejar flags permanentemente en el código, creando un laberinto de caminos muertos.
- Usar bucketing aleatorio en lugar de determinístico, dando una experiencia
  inconsistente.
- No manejar un servicio de flags inaccesible, causando fallas en cascada.
- Hacer targeting individual en lugar de por grupos, lo que no escala.
- Liberar una funcionalidad bajo flag sin monitoreo ni alertas.

## Preguntas Frecuentes

### ¿Cuándo debería eliminar una feature flag?

Eliminala una vez que la funcionalidad sea estable para el 100% de los usuarios y haya
estado en producción sin problemas durante 1-2 ciclos de release. Las flags que viven
más que eso se convierten en deuda técnica.

### ¿En qué se diferencian las feature flags de los settings de configuración?

Los settings de configuración suelen ser estáticos y globales, como valores de timeout.
Las feature flags son por usuario, dinámicas, y diseñadas para alternar rápidamente sin
redeploy.

### ¿Puedo usar feature flags para autorización?

No. Las feature flags controlan visibilidad y rollout. La autorización controla
permisos de acceso. Un usuario que evite un check de flag no debería acceder a datos u
operaciones sensibles.

### ¿Cómo hago un rollout gradual?

Usá un plan escalonado e incrementá el porcentaje mientras monitoreás errores y
métricas clave:

```python
rollout_plan = [
    {"percentage": 1,  "duration_hours": 24},
    {"percentage": 5,  "duration_hours": 48},
    {"percentage": 25, "duration_hours": 72},
    {"percentage": 50, "duration_hours": 96},
    {"percentage": 100, "duration_hours": 0},
]

def advance_rollout(flag: str, current_pct: int) -> int:
    for stage in rollout_plan:
        if stage["percentage"] > current_pct:
            update_flag(flag, {"percentage": stage["percentage"]})
            return stage["percentage"]
    return 100
```

### ¿Cómo hago un A/B test?

Asigná variantes de forma determinística y trackeá eventos por variante:

```javascript
function getVariant(flag, userId) {
  const bucket = hashBucket(userId, flag);
  return bucket < 50 ? "A" : "B";
}

const variant = getVariant("checkout_redesign", userId);
if (variant === "B") renderNewCheckout();

analytics.track({
  experiment: "checkout_redesign",
  userId,
  variant,
  event: "checkout_view",
});
```
