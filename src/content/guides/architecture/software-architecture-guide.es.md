---




contentType: guides
slug: software-architecture-guide
title: "Guía de Arquitectura de Software"
description: "Una guía para diseñar arquitectura de software: monolitos vs microservicios, arquitectura en capas, flujo de datos y criterios de selección de tecnología."
metaDescription: "Aprende fundamentos de arquitectura de software: monolito vs microservicios, arquitectura en capas, patrones CQRS, event-driven design y selección de tecnología."
difficulty: advanced
topics:
  - architecture
  - design
tags:
  - architecture
  - cqrs
  - event-driven
  - microservices
  - monolith
  - scalability
relatedResources:
  - /patterns/mvc-pattern
  - /patterns/repository-pattern
  - /guides/rest-api-design-guide
  - /guides/cicd-pipeline-guide
  - /recipes/microservices-communication
  - /recipes/service-discovery
  - /guides/domain-driven-design-guide
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende fundamentos de arquitectura de software: monolito vs microservicios, arquitectura en capas, patrones CQRS, event-driven design y selección de tecnología."
  keywords:
    - arquitectura de software
    - monolito vs microservicios
    - arquitectura en capas
    - patron cqrs
    - arquitectura event driven
    - system design




---

## Overview

La arquitectura de software define la estructura de un sistema, las relaciones entre componentes y los principios que guían el diseño y la evolución. Una buena arquitectura permite a los equipos moverse rápido sin romper cosas.

## When to Apply

- Inicias un proyecto nuevo o una reescritura mayor
- Escalas un sistema que está alcanzando límites de performance
- Organizas un equipo grande alrededor de ownership de código
- Migras de infraestructura legacy a moderna

## Estilos Arquitectónicos

### Arquitectura Monolítica

Estructura: Unidad desplegable única que contiene toda la funcionalidad.

#### Cuándo Elegir

- Equipo pequeño (< 10 desarrolladores)
- Dominio simple con baja complejidad
- Fase de prototipado rápido
- Requerimientos de latencia estrictos entre componentes

Pros: Despliegue simple, testing fácil, bajo overhead operacional.
Contras: Alto acoplamiento, más difícil escalar componentes individuales, riesgo de fallas en cascada.

### Arquitectura de Microservicios

Estructura: Servicios independientes que se comunican por red.

#### Cuándo Elegir

- Equipo grande (> 20 desarrolladores)
- Dominio complejo con contextos acotados claros
- Necesidad de escalar y desplegar independientemente
- Múltiples stacks tecnológicos requeridos

Pros: Despliegue independiente, autonomía de equipo, persistencia políglota.
Contras: Latencia de red, complejidad operacional, dificultad de debugging distribuido.

### Monolito Modular

Estructura: Unidad desplegable única con módulos internos bien definidos.

#### Cuándo Elegir

- Equipo mediano (10–30 desarrolladores)
- Quieres postergar la complejidad de microservicios
- Límites de dominio claros pero infraestructura compartida

Pros: Operaciones más simples que microservicios, mejor estructura que big-ball-of-mud.
Contras: Requiere disciplina para mantener límites de módulos.

## Arquitectura en Capas

### Modelo Clásico de 3 Capas

```
┌──────────────────────────────┐
│ Capa de Presentación         │
│ - Controllers, Views, DTOs   │
├──────────────────────────────┤
│ Capa de Lógica de Negocio    │
│ - Services, Domain Models    │
├──────────────────────────────┤
│ Capa de Acceso a Datos       │
│ - Repositories, ORM, Queries │
└──────────────────────────────┘
```

Regla de Dependencia: Las capas internas no deben depender de las externas. Consulta [principios SOLID](/guides/design/solid-principles-guide).

## Patrones de Flujo de Datos

### CQRS (Command Query Responsibility Segregation)

Separa los modelos de lectura y escritura.

#### Cuándo Usar

- Las cargas de lectura y escritura difieren considerablemente
- Los modelos de lectura requieren datos denormalizados/optimizados
- Event sourcing ya está en uso

Trade-off: Agrega complejidad; úsalo solo cuando lecturas y escrituras escalan independientemente.

### Arquitectura Event-Driven

Los componentes se comunican mediante eventos asíncronos.

#### Cuándo Usar

- Se requiere desacoplamiento entre servicios
- Las acciones pueden procesarse asíncronamente
- La trazabilidad de cambios de estado es valiosa

Opciones de Event Bus: Apache Kafka, RabbitMQ, AWS SNS/SQS, NATS.

## Framework de Selección de Tecnología

### Matriz de Criterios

| Criterio | Peso | Opción A | Opción B | Opción C |
| --------- | ------ | -------- | -------- | -------- |
| Experiencia del equipo | Alto | 5 | 3 | 4 |
| Soporte de comunidad | Medio | 5 | 4 | 3 |
| Performance | Medio | 3 | 5 | 4 |
| Costo operacional | Alto | 4 | 2 | 5 |
| **Score Ponderado** | | **4.2** | **3.3** | **4.1** |

### Registro de Decisiones

Documenta cada elección tecnológica mayor con contexto, alternativas y consecuencias. Usa la [Plantilla de ADR](/docs/templates/adr-template).

## Patrones de Escalabilidad

### Escalado Horizontal

Agrega más instancias detrás de un load balancer.

```
Client -> Load Balancer -> [Instance 1, Instance 2, Instance 3]
```

Requerimiento: El estado debe externalizarse (base de datos, cache, object storage).

### Escalado de Base de Datos

| Patrón | Caso de uso |
| ------- | -------- |
| Read replicas | Cargas de lectura intensiva |
| Sharding | Escritura intensiva, datasets grandes |
| Connection pooling | Muchas instancias de aplicación |
| Caching (Redis) | Datos calientes, storage de sesiones |

## Comunicación entre Componentes

### Síncrona (REST / gRPC)

- Pros: Modelo mental simple, feedback inmediato.
- Contras: Acoplamiento fuerte, posibles fallas en cascada.
- Usar para: Operaciones orientadas al usuario que requieren respuesta inmediata.

### Asíncrona (Events / Message Queues)

- Pros: Desacoplada, resiliente, escalable.
- Contras: Consistencia eventual, más difícil de debuggear.
- Usar para: Procesamiento en background, notificaciones, analytics.

## Anti-Patrones

- Big Ball of Mud: Sin arquitectura, todo acoplado
- Microservicios prematuros: Dividir antes de entender los límites
- Golden Hammer: Usar la tecnología favorita para todo
- Not Invented Here: Reconstruir en vez de comprar/adoptar
- Over-Engineering: Resolver problemas que todavía no tienes

## Lo que funciona

- Empieza simple: Comienza con un [monolito modular](/guides/architecture/monolith-to-microservices-migration-guide); extrae servicios cuando sea necesario
- Define contextos acotados: Usa [Domain-Driven Design](/guides/architecture/domain-driven-design-guide) para encontrar límites naturales
- Diseña para observabilidad: Cada componente debe exponer [métricas, logs, traces](/recipes/observability/metrics-collection)
- Automatiza todo: [CI/CD](/guides/devops/cicd-pipeline-guide), [infraestructura](/guides/devops/infrastructure-as-code-guide), testing, escaneo de seguridad
- Documenta decisiones: ADRs para cada elección arquitectónica mayor

## FAQ

Q: ¿Cuándo debería dividir de monolito a microservicios?
A: Cuando los equipos se pisan durante los despliegues, o cuando el escalado independiente de componentes se vuelve crítico. La mayoría de los equipos debería empezar con un monolito modular.

Q: ¿Cómo elijo entre REST y gRPC?
A: REST para APIs públicas y clientes de navegador; gRPC para comunicación interna servicio-a-servicio que requiere performance y type safety.

Q: ¿Debería usar un event bus o llamadas HTTP directas?
A: Usa HTTP para operaciones que requieren consistencia inmediata y feedback al usuario. Usa eventos para trabajo en background, notificaciones y cuando necesitas desacoplamiento temporal.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.


## Temas Avanzados

### Escenario Detallado: Seleccion de Arquitectura para E-commerce

```text
Proyecto: Plataforma e-commerce (Python + Django)
Equipo: 8 desarrolladores (creciendo a 15 en 12 meses)
Volumen: 50k usuarios activos, 10k pedidos/dia
Dominio: Catalogo, Orders, Payments, Users, Notifications

Fase 1: Monolito modular (mes 0-6)
  - Django con modulos separados por bounded context
  - Esquema PostgreSQL por modulo (sin FKs entre modulos)
  - Comunicacion via servicios internos (no acceso directo a DB)
  - Deploy: 1 binario, CI/CD con GitHub Actions

  Estructura:
    shop/
      modules/
        catalog/
          domain/          # Product, Category, SKU
          application/     # CreateProductService, SearchService
          infrastructure/  # ProductRepository (Django ORM)
          api/             # CatalogApi (interfaz publica)
          views/           # HTTP views
        orders/
          domain/          # Order, OrderLine, OrderStatus
          application/     # PlaceOrderService, CancelOrderService
          infrastructure/  # OrderRepository
          api/             # OrdersApi
          views/
        payments/
          domain/          # Payment, Transaction
          application/     # ProcessPaymentService
          infrastructure/  # StripeGateway, PaymentRepository
          api/
          views/
      shared/
        kernel/            # BaseEntity, Money, DomainEvent

  Reglas de boundary:
    - catalog NO importa de orders ni payments
    - orders importa CatalogApi (interfaz), no implementacion
    - payments importa OrdersApi (interfaz)
    - Verificado con pylint-import-checker en CI

  Testeo:
    - Unitarios por modulo: < 10ms (sin DB)
    - Integracion por modulo: < 200ms (SQLite en memoria)
    - Cross-module: fakes en memoria de otros modulos
    - E2E: Django test client, < 2s por test

Fase 2: Extraccion de notificaciones (mes 6-9)
  - Notificaciones es el modulo con menor acoplamiento
  - Extraer a microservicio independiente (Go + RabbitMQ)
  - Reemplazar NotificationApi in-process por cliente HTTP
  - Migrar datos con CDC (Debezium -> Kafka -> nueva DB)
  - Traffic shift gradual: 5% -> 25% -> 50% -> 100%

Fase 3: Extraccion de catalogo (mes 12-18)
  - Catalogo necesita escalado independiente (busquedas intensivas)
  - Extraer a microservicio (Python + Elasticsearch)
  - Migrar de PostgreSQL a Elasticsearch para busquedas
  - Mantener PostgreSQL para escritura (CQRS)

Decision matrix para extraccion:
  | Modulo | Riesgo | Valor | Esfuerzo | Prioridad |
  |--------|--------|-------|----------|-----------|
  | Notifications | Bajo | Medio | 4 sem | 1 |
  | Catalog | Medio | Alto | 8 sem | 2 |
  | Payments | Alto | Alto | 12 sem | 3 |
  | Orders | Alto | Critico | 16 sem | 4 |
  | Users | Medio | Alto | 8 sem | 5 |

Lecciones aprendidas:
  - El monolito modular permitio extraccion mecanica (no arquitectonica)
  - Los tests cross-module con fakes detectaron breaking changes
  - El traffic shift gradual dio confianza al negocio
  - CDC evito dual-write y posibles inconsistencias
```

### Como documento decisiones arquitectonicas?

Usa ADRs (Architecture Decision Records). Cada ADR documenta: contexto, decision, alternativas consideradas, consecuencias. Guarda los ADRs en el repositorio junto al codigo (carpeta docs/adr/). Usa numeracion secuencial (ADR-001, ADR-002). Un ADR no se borra ni se edita; si la decision cambia, crea un nuevo ADR que lo suprime. Esto crea un historial auditable de decisiones y su razonamiento.
