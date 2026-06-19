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
  - /patterns/design/mvc-pattern
  - /patterns/design/repository-pattern
  - /guides/api/rest-api-design-guide
  - /guides/devops/cicd-pipeline-guide
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

**Estructura**: Unidad desplegable única que contiene toda la funcionalidad.

**Cuándo elegir**

- Equipo pequeño (< 10 desarrolladores)
- Dominio simple con baja complejidad
- Fase de prototipado rápido
- Requerimientos de latencia estrictos entre componentes

**Pros**: Despliegue simple, testing fácil, bajo overhead operacional.
**Contras**: Alto acoplamiento, más difícil escalar componentes individuales, riesgo de fallas en cascada.

### Arquitectura de Microservicios

**Estructura**: Servicios independientes que se comunican por red.

**Cuándo elegir**

- Equipo grande (> 20 desarrolladores)
- Dominio complejo con contextos acotados claros
- Necesidad de escalar y desplegar independientemente
- Múltiples stacks tecnológicos requeridos

**Pros**: Despliegue independiente, autonomía de equipo, persistencia políglota.
**Contras**: Latencia de red, complejidad operacional, dificultad de debugging distribuido.

### Monolito Modular

**Estructura**: Unidad desplegable única con módulos internos bien definidos.

**Cuándo elegir**

- Equipo mediano (10–30 desarrolladores)
- Quieres postergar la complejidad de microservicios
- Límites de dominio claros pero infraestructura compartida

**Pros**: Operaciones más simples que microservicios, mejor estructura que big-ball-of-mud.
**Contras**: Requiere disciplina para mantener límites de módulos.

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

**Regla de Dependencia**: Las capas internas no deben depender de las externas. Consulta [principios SOLID](/guides/design/solid-principles-guide).

## Patrones de Flujo de Datos

### CQRS (Command Query Responsibility Segregation)

Separa los modelos de lectura y escritura.

**Cuándo usar**

- Las cargas de lectura y escritura difieren significativamente
- Los modelos de lectura requieren datos denormalizados/optimizados
- Event sourcing ya está en uso

**Trade-off**: Agrega complejidad; úsalo solo cuando lecturas y escrituras escalan independientemente.

### Arquitectura Event-Driven

Los componentes se comunican mediante eventos asíncronos.

**Cuándo usar**

- Se requiere desacoplamiento entre servicios
- Las acciones pueden procesarse asíncronamente
- La trazabilidad de cambios de estado es valiosa

**Opciones de Event Bus**: Apache Kafka, RabbitMQ, AWS SNS/SQS, NATS.

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

Documenta cada elección tecnológica significativa con contexto, alternativas y consecuencias. Usa la [Plantilla de ADR](/docs/templates/adr-template).

## Patrones de Escalabilidad

### Escalado Horizontal

Agrega más instancias detrás de un load balancer.

```
Client -> Load Balancer -> [Instance 1, Instance 2, Instance 3]
```

**Requerimiento**: El estado debe externalizarse (base de datos, cache, object storage).

### Escalado de Base de Datos

| Patrón | Caso de uso |
| ------- | -------- |
| Read replicas | Cargas de lectura intensiva |
| Sharding | Escritura intensiva, datasets grandes |
| Connection pooling | Muchas instancias de aplicación |
| Caching (Redis) | Datos calientes, storage de sesiones |

## Comunicación entre Componentes

### Síncrona (REST / gRPC)

- **Pros**: Modelo mental simple, feedback inmediato.
- **Contras**: Acoplamiento fuerte, posibles fallas en cascada.
- **Usar para**: Operaciones orientadas al usuario que requieren respuesta inmediata.

### Asíncrona (Events / Message Queues)

- **Pros**: Desacoplada, resiliente, escalable.
- **Contras**: Consistencia eventual, más difícil de debuggear.
- **Usar para**: Procesamiento en background, notificaciones, analytics.

## Anti-Patrones

- **Big Ball of Mud**: Sin arquitectura, todo acoplado
- **Microservicios prematuros**: Dividir antes de entender los límites
- **Golden Hammer**: Usar la tecnología favorita para todo
- **Not Invented Here**: Reconstruir en vez de comprar/adoptar
- **Over-Engineering**: Resolver problemas que todavía no tienes

## Mejores prácticas

- **Empieza simple**: Comienza con un [monolito modular](/guides/architecture/monolith-to-microservices-migration-guide); extrae servicios cuando sea necesario
- **Define contextos acotados**: Usa [Domain-Driven Design](/guides/architecture/domain-driven-design-guide) para encontrar límites naturales
- **Diseña para observabilidad**: Cada componente debe exponer [métricas, logs, traces](/recipes/observability/metrics-collection)
- **Automatiza todo**: [CI/CD](/guides/cicd-pipeline-guide), [infraestructura](/guides/devops/infrastructure-as-code-guide), testing, escaneo de seguridad
- **Documenta decisiones**: ADRs para cada elección arquitectónica significativa

## FAQ

**Q: ¿Cuándo debería dividir de monolito a microservicios?**
A: Cuando los equipos se pisan durante los despliegues, o cuando el escalado independiente de componentes se vuelve crítico. La mayoría de los equipos debería empezar con un monolito modular.

**Q: ¿Cómo elijo entre REST y gRPC?**
A: REST para APIs públicas y clientes de navegador; gRPC para comunicación interna servicio-a-servicio que requiere performance y type safety.

**Q: ¿Debería usar un event bus o llamadas HTTP directas?**
A: Usa HTTP para operaciones que requieren consistencia inmediata y feedback al usuario. Usa eventos para trabajo en background, notificaciones y cuando necesitas desacoplamiento temporal.
