---
contentType: guides
slug: feature-flags-guide
title: "Feature Flags: Release Progresivo y Experimentación Segura"
description: "Guía práctica sobre feature flags: patrones de implementación, rollouts progresivos, kill switches, integración con A/B testing y gestión del ciclo de vida de feature flags a escala."
metaDescription: "Aprende feature flags: patrones de implementación, rollouts progresivos, kill switches, A/B testing y gestión de ciclo de vida a escala."
difficulty: intermediate
topics:
  - devops
  - frontend
  - performance
tags:
  - feature-flags
  - progressive-release
  - kill-switch
  - experimentation
  - toggles
  - rollout
  - guia
relatedResources:
  - /guides/deployment/canary-deployment-guide
  - /guides/deployment/a-b-testing-guide
  - /guides/devops/sre-practices-guide
  - /guides/observability-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende feature flags: patrones de implementación, rollouts progresivos, kill switches, A/B testing y gestión de ciclo de vida a escala."
  keywords:
    - feature-flags
    - progressive-release
    - kill-switch
    - experimentation
    - toggles
    - rollout
    - guia
---

## Overview

Los feature flags (también llamados feature toggles) desacoplan el despliegue del release. Permiten desplegar código a producción mientras mantienen funcionalidades ocultas, luego habilitarlas gradualmente para usuarios, regiones o porcentajes específicos. También sirven como kill switches para deshabilitar instantáneamente cambios problemáticos sin redeploy.

Esta guía cubre tipos de flags, patrones de implementación, estrategias de rollout y métodos operacionales probados.

## When to Use

- Quieres desplegar cambios incompletos sin exponerlos a usuarios
- Necesitas lanzar cambios gradualmente para monitorear impacto
- Quieres hacer A/B testing de cambios con usuarios reales
- Necesitas kill switches de emergencia para cambios críticos
- Manejas branches de larga duración y quieres mergear código más temprano

## Core Concepts

| Concepto | Descripción |
|----------|-------------|
| **Feature Flag** | Un check condicional que habilita o deshabilita un camino de código |
| **Kill Switch** | Un flag que deshabilita instantáneamente un cambio en producción |
| **Rollout Progresivo** | Aumentar gradualmente el porcentaje de usuarios que ven un cambio |
| **Flag Dirigido** | Un flag habilitado para usuarios, grupos o regiones específicas |
| **Vida del Flag** | El período desde creación hasta remoción permanente del código |
| **Deuda Técnica** | Flags viejos acumulados que saturan código y configuración |

## Feature Flag Types

| Tipo | Caso de Uso | Vida |
|------|-------------|------|
| **Flag de release** | Ocultar cambios incompletos durante desarrollo | Corta (días a semanas) |
| **Flag de experimento** | A/B testing y decisiones basadas en datos | Media (semanas a meses) |
| **Flag operacional** | Circuit breakers, límites de rate, modos debug | Larga (meses a permanente) |
| **Flag de permiso** | Control de acceso a capacidades por tier de usuario | Permanente |
| **Kill switch** | Deshabilitación de emergencia para cambios riesgosos | Corta (removido después de estabilización) |

## Step-by-Step Feature Flag Implementation

### 1. Elegir un Sistema de Feature Flags

Decisión build vs buy:

| Opción | Mejor Para | Ejemplos |
|--------|------------|----------|
| **Open-source** | Auto-hospedado, control total | Unleash, Flagsmith, Flipt |
| **SaaS** | Configuración rápida, capacidades enterprise | LaunchDarkly, Split, Optimizely |
| **Build custom** | Casos simples, integración estrecha | Config en-app + base de datos |
| **Archivos de config** | Flags estáticos, sin cambios en runtime | YAML/JSON configs |

```python
# Ejemplo: Sistema simple de feature flags custom
from dataclasses import dataclass
from typing import Optional
import hashlib

@dataclass
class FeatureFlag:
    name: str
    enabled: bool
    rollout_percentage: float = 100.0
    target_users: Optional[list[str]] = None

class FeatureFlagManager:
    def __init__(self):
        self.flags = {}
    
    def register(self, flag: FeatureFlag):
        self.flags[flag.name] = flag
    
    def is_enabled(self, flag_name: str, user_id: str = None) -> bool:
        flag = self.flags.get(flag_name)
        if not flag:
            return False
        
        if not flag.enabled:
            return False
        
        # Verificar usuarios dirigidos
        if flag.target_users and user_id:
            return user_id in flag.target_users
        
        # Rollout basado en porcentaje
        if flag.rollout_percentage < 100 and user_id:
            hash_value = int(hashlib.md5(f"{flag.name}:{user_id}".encode()).hexdigest(), 16)
            user_bucket = hash_value % 100
            return user_bucket < flag.rollout_percentage
        
        return True

# Uso
ffm = FeatureFlagManager()
ffm.register(FeatureFlag("new-dashboard", enabled=True, rollout_percentage=10))

if ffm.is_enabled("new-dashboard", user_id="user-123"):
    show_new_dashboard()
else:
    show_legacy_dashboard()
```

### 2. Implementar Rollout Progresivo

Aumentar exposición gradualmente mientras monitoreas:

```python
# Ejemplo: Etapas de rollout progresivo
ROLLOUT_STAGES = [
    {"name": "dev-team", "percentage": 0, "target_users": ["dev1", "dev2", "qa1"]},
    {"name": "1-percent", "percentage": 1, "target_users": None},
    {"name": "10-percent", "percentage": 10, "target_users": None},
    {"name": "50-percent", "percentage": 50, "target_users": None},
    {"name": "full-release", "percentage": 100, "target_users": None},
]

def advance_rollout(flag_name: str, current_stage: int):
    if current_stage < len(ROLLOUT_STAGES) - 1:
        next_stage = ROLLOUT_STAGES[current_stage + 1]
        update_flag(flag_name, 
            rollout_percentage=next_stage["percentage"],
            target_users=next_stage["target_users"]
        )
        print(f"Avanzado {flag_name} a etapa: {next_stage['name']}")
    else:
        print(f"{flag_name} ya está al 100%")
```

#### Progresión de Rollout

1. Solo internos: Habilitar para equipo de desarrollo (0% + usuarios target)
2. Usuarios beta: Habilitar para early adopters amigables (0% + lista beta)
3. 1% rollout: Exponer a 1% del tráfico
4. 10% rollout: Monitorear métricas a pequeña escala
5. 50% rollout: Validar a gran volumen
6. 100% rollout: Release completo
7. Remover flag: Limpiar código condicional

### 3. Agregar Kill Switches

Deshabilitar instantáneamente cambios sin desplegar:

```python
# Ejemplo: Patrón de kill switch
def process_payment(order):
    # Kill switch para procesamiento de pagos
    if not feature_flags.is_enabled("payment-processing-v2"):
        return process_payment_v1(order)
    
    try:
        result = process_payment_v2(order)
        return result
    except Exception as e:
        # Auto-fallback si nueva versión falla
        if feature_flags.is_enabled("payment-auto-fallback"):
            return process_payment_v1(order)
        raise
```

#### Lo que Funciona para Kill Switches

- Cada nuevo cambio obtiene un kill switch por defecto
- Documenta qué cambios tienen kill switches en tu runbook
- Practica drills de kill switch trimestralmente
- Configura alertas cuando un kill switch se active
- Asegúrate de que los kill switches tengan latencia mínima (cachear valores de flags)

### 4. Monitorear Rendimiento de Flags

Rastrear métricas para cambios con flags:

| Métrica | Por Qué Importa |
|---------|-----------------|
| **Latencia de evaluación de flag** | Evaluaciones lentas agregan overhead de request |
| **Tasa de error por estado de flag** | Detectar si cambios habilitados causan errores |
| **Engagement de usuario** | Comparar uso entre grupos on/off |
| **Impacto en conversión** | Medir efecto de negocio del cambio |
| **Viejez de flag** | Identificar flags que han estado activos por mucho tiempo |

```yaml
# Ejemplo: Dashboard de monitoreo de flags
panels:
  - title: "Tasa de Evaluación de Feature Flags"
    query: 'rate(feature_flag_evaluations_total[5m])'
  - title: "Kill Switches Activos"
    query: 'feature_flag_enabled{name=~".*-kill-switch"}'
  - title: "Viejez de Flags"
    query: 'time() - feature_flag_last_modified > 7776000'  # 90 días
```

### 5. Gestionar Ciclo de Vida de Flags

Los flags no deberían vivir para siempre:

```bash
# Ejemplo: Workflow de limpieza de flags
# 1. Identificar flags estancados (habilitados por >30 días sin cambios)
# 2. Verificar que funcionalidad es estable y completamente adoptada
# 3. Crear ticket para remover flag del código
# 4. En código: remover condicional, mantener solo rama true
# 5. Remover flag de configuración
# 6. Desplegar limpieza
# 7. Verificar que no hay regresiones
```

#### Reglas de Ciclo de Vida

- Establecer fechas de expiración en flags de release y experimento (30-60 días)
- Revisar todos los flags mensualmente en standup de ingeniería
- Archivar flags removidos en un changelog para propósitos de auditoría
- Nunca remover un flag antes de confirmar que el cambio es estable

## Lo que funciona

- Mantén flags simples. Un flag por cambio, no condicionales anidados.
- Default seguro. Si el sistema de flags cae, default al comportamiento probado.
- Evalúa flags una vez por request. Cachear el resultado para evitar lookups repetidos.
- Prueba ambos caminos. Los tests unitarios deben cubrir estados habilitado y deshabilitado.
- Documenta propósito del flag. Cada flag necesita un owner, descripción y fecha de expiración.
- Evita interdependencias de flags. Combinar flags crea complejidad combinatoria.

## Common Mistakes

- Dejar flags en código indefinidamente. Flags estancados crean deuda técnica y código muerto.
- Usar flags para control de acceso permanente. Usa RBAC apropiado para permisos de larga duración.
- Evaluar flags en bucles calientes. Las evaluaciones de flag en bucles ajustados dañan rendimiento.
- Estado de flag inconsistente entre servicios. Asegúrate de que los flags estén sincronizados en sistemas distribuidos.
- Olvidar probar el camino deshabilitado. El camino default es lo que la mayoría de usuarios ven.

## Variants

- Configuración dinámica: Más amplia que flags. Incluye umbrales, límites y parámetros de flag.
- Flags contextuales: Flags que varían por hora del día, geografía o tipo de dispositivo
- Flags multi-variante: Flags con múltiples estados (testing A/B/C/D)
- Flags del lado del cliente: Evaluados en browser/mobile para variaciones de UI

## FAQ

**Q: ¿Cuál es la diferencia entre un feature flag y un toggle de configuración?**
Los feature flags son de corta duración y ligados a caminos de código. Los toggles de configuración son settings operacionales de larga duración.

**Q: ¿Cómo manejo feature flags en un sistema distribuido?**
Usa un servicio de flags centralizado con caching. Evalúa flags al inicio del request y propaga a través de contexto.

**Q: ¿Pueden los feature flags ralentizar mi aplicación?**
Sí, si se evalúan frecuentemente. Usa caching en memoria, evaluaciones batch, y evita checks de flag en bucles ajustados.

**Q: ¿Cuándo debería remover un feature flag?**
Tan pronto como el cambio sea estable y completamente lanzado. Apunta a remoción dentro de 30 días del release completo.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.

## Conclusion

Los feature flags son esenciales para la entrega continua moderna. Te permiten desplegar con confianza, lanzar gradualmente y reaccionar instantáneamente a problemas. Trata los flags como andamiaje temporal, no arquitectura permanente, y límpialos agresivamente para mantener tu codebase saludable.

