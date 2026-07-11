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

Migrar de un monolito a microservicios es uno de los proyectos de refactorización más riesgosos. Hecho mal, crea un monolito distribuido — más lento y complejo. Hecho bien, habilita autonomía de equipo y delivery más rápido. A continuación: estrategias de descomposición segura.

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
| Q2 | Implementar [API Gateway](/recipes/serverless/serverless-api-gateway) y [service discovery](/recipes/architecture/service-discovery) |
| Q3 | Extraer servicio medio-crítico con Branch by Abstraction |
| Q4 | Parallel run para un servicio alto-crítico |
| Año 2 | Extraer servicios core; monolito se encoge |
| Año 3 | Retirar monolito |

## Lo que funciona

- Nunca hagas un rewrite big-bang — la extracción incremental preserva opcionalidad
- Mide antes y después: deploy frequency, lead time, failure rate
- Mantén el monolito deployable — no dejes que la extracción rompa [CI/CD](/guides/devops/cicd-pipeline-guide)
- Invierte en testing — [contract tests](/recipes/testing/api-contract-testing) capturan breaking changes
- Acepta que algún código nunca se mueve

## Errores Comunes

- Extraer servicios basados en capas técnicas en vez de capacidades de negocio
- Ignorar consistencia de datos — las transacciones distribuidas requieren [sagas](/guides/architecture/event-driven-architecture-guide)
- Subestimar el "último 10%" — los servicios finales son los más acoplados
- Remover el monolito demasiado temprano — es tu red de seguridad
- No invertir en experiencia de desarrollador — local dev y [testing](/guides/testing/testing-strategy-guide) son más difíciles con microservicios

## Preguntas Frecuentes

### ¿Cuánto dura una migración de monolito a microservicios?

Para un sistema con 100+ ingenieros, espera 1-3 años. El primer servicio toma meses; el décimo toma semanas. El cuello de botella rara vez es técnico — es alineación organizacional y confianza en testing.

### ¿Deberíamos parar el desarrollo de capacidades durante la migración?

No. El negocio no se detiene. Corre migración como track paralelo: 70% capacidades, 30% migración. Si migración toma 100% de capacidad, estás extrayendo muy agresivamente.

### ¿Qué pasa si terminamos con un monolito distribuido?

Un monolito distribuido ocurre cuando servicios comparten BD o deployan juntos. La prevención es la cura: aplica database-per-service y pipelines de deploy independientes. Arreglarlo después es doloroso; préviene desde el inicio.


## Escenario Detallado: Extraccion del Servicio de Notificaciones

```text
Sistema: E-commerce monolito (Rails, 450k lineas, 30 devs)
Servicio a extraer: Notificaciones (email + SMS + push)
Riesgo: Bajo (no afecta pagos ni pedidos)
Esfuerzo estimado: 6 semanas

Semana 1-2: Branch by Abstraction
  1. Crear interfaz NotificationSender en el monolito
     - send_email(user_id, template, data)
     - send_sms(user_id, message)
     - send_push(user_id, payload)
  2. Mover implementacion existente a MonolithNotificationSender
  3. Todos los callers usan la interfaz via DI
  4. Tests existentes siguen pasando sin cambios

Semana 3-4: Construir el servicio
  $ mkdir notification-service && cd notification-service
  $ npm init -y && npm install fastify aws-sdk pino
  $ mkdir src && cat > src/handler.js << EOF
  async function sendEmail(req, reply) {
    const { user_id, template, data } = req.body;
    const result = await ses.sendTemplatedEmail({
      Source: "no-reply@app.com",
      Destination: { ToAddresses: [await getUserEmail(user_id)] },
      Template: template,
      TemplateData: JSON.stringify(data)
    }).promise();
    return { id: result.MessageId, status: "sent" };
  }
  EOF
  $ docker build -t notification-service:latest .
  $ kubectl apply -f k8s/deployment.yaml

Semana 5: Parallel run
  - Feature flag: use_new_notification_service (50% de usuarios)
  - Loggear divergencias entre monolito y servicio
  - Monitorear latencia y tasa de error
  - Configuracion del feature flag:
    flags.configure("use_new_notification_service", {
      percentage: 50,
      user_id_hash: true  // consistencia: mismo user siempre va al mismo destino
    })

Semana 6: Cutover
  - Subir a 100% en ventana de bajo trafico (domingo 2am)
  - Monitorear 24h con rollback listo
  - Despues de 7 dias estables, remover MonolithNotificationSender
  - Despues de 30 dias, remover codigo de notificaciones del monolito

Metricas antes/despues:
  | Metrica | Monolito | Servicio |
  |---------|----------|----------|
  | Deploy frequency | Semanal | Diario |
  | Lead time | 3 dias | 2 horas |
  | P95 latencia send_email | 800ms | 120ms |
  | Tasa de error | 0.8% | 0.1% |
```

### Como manejo la base de datos compartida durante la migracion?

El patron mas seguro es Change Data Capture (CDC). Usa Debezium para replicar cambios del monolito al servicio nuevo sin modificar el codigo del monolito. El servicio nuevo lee de su propia base de datos alimentada por CDC. Cuando confias en la replicacion, cambia las escrituras al servicio nuevo. Finalmente, elimina la tabla del monolito. Nunca dejes dos servicios escribiendo a la misma tabla: las condiciones de carrera son inevitables.

### Que hago cuando el equipo se resiste a la migracion?

La resistencia suele ser racional: los devs conocen el monolito y temen lo desconocido. Empieza con un servicio de bajo riesgo y documenta el proceso en detalle. Invita al equipo escptico a participar en la primera extraccion. Muestra las metricas despues del cutover: deploy frequency, lead time, tasa de error. Los datos convencen mas que las presentaciones. Si la resistencia persiste, reconsidera si la migracion es necesaria.

### Como testeo durante la migracion?

Usa contract tests entre el monolito y el servicio nuevo. El monolito es consumidor del servicio durante la transicion. Pact tests verifican que el contrato no se rompe. Parallel run es tu test de integracion mas valioso: si ambas implementaciones producen el mismo resultado para los mismos inputs, la migracion es segura. Agrega tests E2E que cubran el flujo completo a traves del nuevo servicio.







































































End of document. Review and update quarterly.