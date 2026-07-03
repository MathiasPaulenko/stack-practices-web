---
contentType: guides
slug: hexagonal-architecture-guide
title: "Arquitectura Hexagonal — Puertos, Adaptadores y Testabilidad"
description: "Guía completa de Arquitectura Hexagonal (Puertos y Adaptadores): estructura aplicaciones para aislar la lógica de dominio de frameworks, bases de datos y servicios externos."
metaDescription: "Aprende Arquitectura Hexagonal con puertos, adaptadores y aislamiento de dominio. Guía práctica para aplicaciones testeables e independientes de frameworks."
difficulty: advanced
topics:
  - architecture
  - design
tags:
  - hexagonal-architecture
  - ports-and-adapters
  - domain-driven-design
  - testability
  - clean-architecture
  - dependency-inversion
  - guide
relatedResources:
  - /guides/clean-architecture-guide
  - /guides/onion-architecture-guide
  - /guides/modular-monolith-guide
  - /guides/cqrs-guide
  - /patterns/design/dependency-injection-pattern
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Aprende Arquitectura Hexagonal con puertos, adaptadores y aislamiento de dominio. Guía práctica para aplicaciones testeables e independientes de frameworks."
  keywords:
    - arquitectura-hexagonal
    - puertos-y-adaptadores
    - domain-driven-design
    - testabilidad
    - clean-architecture
    - inversión-de-dependencias
    - guía
---

## Overview

La Arquitectura Hexagonal, también conocida como Puertos y Adaptadores, es un patrón de diseño que aísla la lógica central del dominio de preocupaciones externas como frameworks, bases de datos e interfaces de usuario. En lugar de que el dominio dependa de la infraestructura, la infraestructura depende del dominio a través de interfaces bien definidas llamadas puertos. Esta inversión de dependencias hace que las aplicaciones sean más fáciles de probar, refactorizar y adaptar a requisitos cambiantes.

## When to Use

- Necesitas cambiar frameworks (web, CLI, mensajería) sin tocar la lógica de negocio
- Quieres pruebas unitarias rápidas y aisladas sin mockear servicios externos
- Tu aplicación se integra con múltiples sistemas externos (bases de datos, APIs, colas)
- Estás migrando desde un monolito y necesitas límites claros

## Core Concepts

### Puertos

Los puertos son interfaces que definen lo que la aplicación necesita del mundo exterior, o lo que ofrece al mundo exterior. Pertenecen a la capa de dominio.

### Adaptadores

Los adaptadores son implementaciones concretas de los puertos. Traducen entre el dominio de la aplicación y tecnologías externas (HTTP, SQL, colas de mensajes).

### Dominio (Interior)

La lógica central de la aplicación: entidades, objetos de valor, casos de uso y servicios de dominio. No tiene dependencias externas.

## Estructura

```
┌─────────────────────────────────────┐
│         Adaptadores (Exterior)        │
│  ┌─────────┐ ┌─────────┐ ┌────────┐ │
│  │ Web API │ │ CLI     │ │ Eventos│ │
│  └────┬────┘ └────┬────┘ └───┬────┘ │
│       │           │          │       │
│  ┌────┴───────────┴──────────┴────┐ │
│  │         Puertos Primarios       │ │
│  │      (Adaptadores Motores)      │ │
│  └──────────────┬──────────────────┘ │
│                 │                    │
│  ┌──────────────┴──────────────────┐ │
│  │           Aplicación            │ │
│  │         (Casos de Uso)          │ │
│  └──────────────┬──────────────────┘ │
│                 │                    │
│  ┌──────────────┴──────────────────┐ │
│  │         Puertos Secundarios     │ │
│  │      (Adaptadores Impulsados)   │ │
│  └──────────────┬──────────────────┘ │
│       │          │           │      │
│  ┌────┴────┐ ┌───┴───┐ ┌─────┴────┐│
│  │ Base de │ │Externa│ │  Cola    ││
│  │ Datos   │ │ API   │ │  Adapt.  ││
│  └─────────┘ └────────┘ └──────────┘│
└─────────────────────────────────────┘
```

## Implementación

### Definir el Puerto

```java
// Puerto secundario (impulsado) — lo que el dominio necesita
public interface OrderRepository {
    Order findById(OrderId id);
    void save(Order order);
}

// Puerto primario (motor) — lo que el dominio ofrece
public interface PlaceOrderUseCase {
    OrderResult place(PlaceOrderCommand command);
}
```

### Implementar el Dominio

```java
public class PlaceOrderService implements PlaceOrderUseCase {
    private final OrderRepository repository;
    private final PaymentGatewayPort paymentPort;

    public PlaceOrderService(OrderRepository repository, PaymentGatewayPort paymentPort) {
        this.repository = repository;
        this.paymentPort = paymentPort;
    }

    @Override
    public OrderResult place(PlaceOrderCommand command) {
        Order order = Order.create(command);
        PaymentResult payment = paymentPort.charge(order.total());
        if (payment.success()) {
            order.confirm(payment.transactionId());
            repository.save(order);
            return OrderResult.success(order.id());
        }
        return OrderResult.failure(payment.error());
    }
}
```

### Crear el Adaptador

```java
@RestController
@RequestMapping("/orders")
public class OrderControllerAdapter {
    private final PlaceOrderUseCase useCase;

    public OrderControllerAdapter(PlaceOrderUseCase useCase) {
        this.useCase = useCase;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> place(@RequestBody PlaceOrderRequest request) {
        PlaceOrderCommand command = request.toCommand();
        OrderResult result = useCase.place(command);
        return result.isSuccess()
            ? ResponseEntity.ok(OrderResponse.from(result))
            : ResponseEntity.badRequest().body(OrderResponse.error(result));
    }
}
```

## Estrategia de Testing

| Tipo de Test | Qué Prueba | Dependencias |
|--------------|------------|-------------|
| Unitario | Lógica de dominio | Ninguna (Java puro) |
| Integración | Adaptador + BD real | Testcontainers |
| Contrato | Límite del puerto | Stub en memoria |
| E2E | Flujo completo | Todo |

## Errores Comunes

- **Filtrar anotaciones de frameworks al dominio** — mantén `@Entity`, `@Autowired` y similares fuera
- **Modelos de dominio anémicos** — los puertos deben exponer comportamiento, no solo acceso a datos
- **Sobre-ingeniería en CRUD simple** — la arquitectura hexagonal agrega ceremonia; úsala cuando el dominio lo justifique

## Variantes

- **Arquitectura Cebolla** — agrega capas explícitas de servicios de dominio y aplicación
- **Clean Architecture** — enfatiza la Regla de Dependencia: las dependencias apuntan hacia adentro
- **BCE (Boundary-Control-Entity)** — estructura similar con nombres diferentes

## FAQ

**¿En qué se diferencia Hexagonal de Clean Architecture?**
Hexagonal se enfoca en la metáfora de puertos y adaptadores. Clean Architecture agrega la regla explícita de dependencia entre capas. Ambas logran el mismo objetivo.

**¿Necesito DDD para usar Hexagonal?**
No. Puedes usar entidades y objetos de valor simples. DDD complementa la arquitectura hexagonal pero no es obligatorio.

**¿Cuándo NO debería usar Hexagonal?**
Aplicaciones CRUD simples, prototipos o scripts donde la estructura adicional no aporta valor.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.
