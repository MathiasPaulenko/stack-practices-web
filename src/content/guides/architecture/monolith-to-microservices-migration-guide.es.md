---
contentType: guides
slug: monolith-to-microservices-migration-guide
title: "De Monolito a Microservicios — Estrategias de Migración"
description: "Guía práctica para descomponer monolitos: strangler fig, branch by abstraction y patrones de extracción incremental que reducen riesgo y preservan continuidad del negocio."
metaDescription: "Migración de monolito a microservicios: strangler fig, branch by abstraction, extracción incremental. Descompón de forma segura sin detener el negocio."
difficulty: advanced
topics:
  - architecture
  - devops
tags:
  - architecture
  - devops
  - guia
  - microservicios
  - migracion
  - modernizacion
  - monolito
  - refactorizacion
relatedResources:
  - /guides/architecture/microservices-architecture-guide
  - /guides/architecture/domain-driven-design-guide
  - /guides/design/solid-principles-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Migración de monolito a microservicios: strangler fig, branch by abstraction, extracción incremental. Descompón de forma segura sin detener el negocio."
  keywords:
    - monolito a microservicios
    - estrategia migracion microservicios
    - patron strangler fig
    - branch by abstraction
    - extraccion incremental servicios
---

# De Monolito a Microservicios — Estrategias de Migración

## Introducción

Migrar de un monolito a microservicios es uno de los proyectos de refactorización más riesgosos. Hecho mal, crea un monolito distribuido — más lento y complejo. Hecho bien, habilita autonomía de equipo y delivery más rápido. Esta guía cubre estrategias de descomposición segura.

## Antes de Empezar

### Valida la Decisión

| Pregunta | Si "no", reconsidera |
|----------|---------------------|
| ¿Tienes > 50 ingenieros? | Monolito + límites modulares puede bastar |
| ¿Los deploys son dolorosos? | Arregla CI/CD primero |
| ¿Puedes medir el costo del monolito? | Cuantifica el dolor antes de justificar |
| ¿Tienes expertise operativo? | Los microservicios necesitan madurez DevOps/SRE |

### Identifica el Primer Servicio a Extraer

Elige un servicio que sea: bajo riesgo, alto dolor, límite claro, valor independiente. Buenos candidatos: notificaciones, reporting, o feature flags.

## Patrones de Migración

### 1. Strangler Fig (Higuera Estranguladora)

Reemplaza gradualmente funcionalidad del monolito redirigiendo tráfico a nuevos servicios.

```
Fase 1: [Usuarios] → [Monolito]
Fase 2: [Usuarios] → [API Gateway] → [Monolito] + [Nuevo Servicio]
Fase 3: [Usuarios] → [API Gateway] → [Servicios]
```

```python
class Router:
    def route(self, request):
        if flags.is_enabled("use-new-catalog", request.user_id):
            return self.catalog_service.handle(request)
        return self.monolith.handle(request)
```

**Por qué funciona:** Rollback instantáneo via feature flag. El monolito es tu red de seguridad.

### 2. Branch by Abstraction

Crea una abstracción en el monolito, luego intercambia la implementación.

```python
class NotificationSender(ABC):
    @abstractmethod
    def send(self, user, message): pass

class MonolithNotificationSender(NotificationSender): ...
class ServiceNotificationSender(NotificationSender): ...

sender = ServiceNotificationSender() if flags.enabled("new") else MonolithNotificationSender()
```

**Por qué funciona:** El monolito nunca sabe que habla con un servicio. Rollback de una línea.

### 3. Parallel Run

Corre ambas implementaciones, compara outputs, pero solo sirve el viejo.

```python
old = monolith_recommendations.get(user_id)
new = recommendations_service.get(user_id)
if old != new:
    logger.warning("Divergencia", old=old, new=new)
return old
```

**Cuándo usar:** Correctness crítico (pagos, precios, recomendaciones).

### 4. Migración de Datos

| Patrón | Uso |
|--------|-----|
| **BD compartida (temporal)** | Semanas, no meses |
| **Change Data Capture (Debezium)** | Sincronizar sin modificar el monolito |
| **Dual-write y switch** | Escribir a ambas bases, luego cambiar lecturas |

## Hoja de Ruta

| Trimestre | Objetivo |
|-----------|----------|
| Q1 | Extraer servicio no crítico con Strangler Fig |
| Q2 | Implementar [API Gateway](/recipes/serverless-api-gateway) y [service discovery](/recipes/service-discovery) |
| Q3 | Extraer servicio medio-crítico con Branch by Abstraction |
| Q4 | Parallel run para un servicio alto-crítico |
| Año 2 | Extraer servicios core; monolito se encoge |
| Año 3 | Retirar monolito |

## Mejores Prácticas

- Nunca hagas un rewrite big-bang — la extracción incremental preserva opcionalidad
- Mide antes y después: deploy frequency, lead time, failure rate
- Mantén el monolito deployable — no dejes que la extracción rompa [CI/CD](/guides/cicd-pipeline-guide)
- Invierte en testing — [contract tests](/recipes/api-contract-testing) capturan breaking changes
- Acepta que algún código nunca se mueve

## Errores Comunes

- Extraer servicios basados en capas técnicas en vez de capacidades de negocio
- Ignorar consistencia de datos — las transacciones distribuidas requieren [sagas](/guides/event-driven-architecture-guide)
- Subestimar el "último 10%" — los servicios finales son los más acoplados
- Remover el monolito demasiado temprano — es tu red de seguridad
- No invertir en experiencia de desarrollador — local dev y [testing](/guides/testing-strategy-guide) son más difíciles con microservicios

## Preguntas Frecuentes

### ¿Cuánto dura una migración de monolito a microservicios?

Para un sistema con 100+ ingenieros, espera 1-3 años. El primer servicio toma meses; el décimo toma semanas. El cuello de botella rara vez es técnico — es alineación organizacional y confianza en testing.

### ¿Deberíamos parar el desarrollo de features durante la migración?

No. El negocio no se detiene. Corre migración como track paralelo: 70% features, 30% migración. Si migración toma 100% de capacidad, estás extrayendo muy agresivamente.

### ¿Qué pasa si terminamos con un monolito distribuido?

Un monolito distribuido ocurre cuando servicios comparten BD o deployan juntos. La prevención es la cura: aplica database-per-service y pipelines de deploy independientes. Arreglarlo después es doloroso; préviene desde el inicio.
