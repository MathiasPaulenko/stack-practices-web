---
contentType: guides
slug: vertical-slice-architecture-guide
title: "Arquitectura por Slices Verticales: Organización por Feature"
description: "Guía práctica de Arquitectura por Slices Verticales: organizar código por feature en lugar de por capa técnica, reducir navegación cruzada y mejorar cohesión."
metaDescription: "Aprende Slices Verticales: organiza código por feature, no por capa. Reduce navegación cruzada, mejora cohesión y simplifica cambios con ejemplos prácticos."
difficulty: intermediate
topics:
  - architecture
  - design
tags:
  - vertical-slice-architecture
  - feature-based
  - feature-folder
  - code-organization
  - cohesion
  - maintainability
  - guia
relatedResources:
  - /guides/onion-architecture-guide
  - /guides/layered-architecture-guide
  - /patterns/design/cqrs-pattern
  - /patterns/design/mediator-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende Slices Verticales: organiza código por feature, no por capa. Reduce navegación cruzada, mejora cohesión y simplifica cambios con ejemplos prácticos."
  keywords:
    - vertical-slice-architecture
    - feature-based
    - feature-folder
    - code-organization
    - cohesion
    - guia
---

## Overview

La Arquitectura por Slices Verticales, popularizada por Jimmy Bogard, invierte el enfoque tradicional por capas. En lugar de organizar código por preocupación técnica (Controladores, Servicios, Repositorios), organizas por feature. Todo el código de una feature — controlador, servicio, consultas, DTOs, validación — vive junto en un solo lugar. Cuando necesitas cambiar "Crear Orden", todo el código relevante está en una carpeta. Esto reduce drásticamente la carga cognitiva de navegar una codebase.

## Cuándo Usar

- Tu aplicación tiene muchas funcionalidades que evolucionan independientemente
- Miembros del equipo preguntan frecuentemente "dónde está el código de X?"
- Cambios cruzados entre capas requieren tocar 5+ archivos en 3+ directorios
- Quieres minimizar conflictos de merge entre equipos de funcionalidades
- Algunas funcionalidades son CRUD simple, otras son flujos complejos

## Organización Horizontal vs Vertical

```
Horizontal (Capas)            Vertical (Slices)
├── Controladores             ├── Features
│   ├── OrderController.cs    │   ├── CreateOrder
│   └── ProductController.cs  │   │   ├── CreateOrderCommand.cs
├── Servicios                 │   │   ├── CreateOrderHandler.cs
│   ├── OrderService.cs       │   │   ├── CreateOrderValidator.cs
│   └── ProductService.cs     │   │   └── CreateOrderEndpoint.cs
├── Repositorios              │   ├── GetOrderById
│   ├── OrderRepository.cs    │   │   ├── GetOrderByIdQuery.cs
│   └── ProductRepository.cs  │   │   └── GetOrderByIdHandler.cs
                              │   └── UpdateOrderStatus
```

## Estructura de una Feature

Cada feature es autocontenida y típicamente incluye:

| Componente | Propósito |
|-----------|----------|
| **Command/Query** | Modelo de entrada (DTO) |
| **Handler** | Lógica de negocio de la feature |
| **Validator** | Reglas de validación de entrada |
| **Endpoint/Controller** | Punto de entrada HTTP o de mensajería |
| **Response** | Modelo de salida (DTO) |

## Ejemplo: Feature Crear Orden

```csharp
// Features/Orders/CreateOrder/CreateOrderCommand.cs
public record CreateOrderCommand(
    int ProductId,
    int Quantity,
    string CustomerEmail
) : IRequest<OrderDto>;
```

```csharp
// Features/Orders/CreateOrder/CreateOrderHandler.cs
public class CreateOrderHandler : IRequestHandler<CreateOrderCommand, OrderDto>
{
    private readonly AppDbContext _dbContext;

    public CreateOrderHandler(AppDbContext dbContext) => _dbContext = dbContext;

    public async Task<OrderDto> Handle(CreateOrderCommand request, CancellationToken cancellationToken)
    {
        var product = await _dbContext.Products.FindAsync(request.ProductId);
        if (product == null) throw new NotFoundException("Producto no encontrado");
        if (product.Stock < request.Quantity)
            throw new ValidationException("Stock insuficiente");

        var order = new Order
        {
            ProductId = request.ProductId,
            Quantity = request.Quantity,
            CustomerEmail = request.CustomerEmail,
            Total = product.Price * request.Quantity,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Orders.Add(order);
        product.Stock -= request.Quantity;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new OrderDto(order);
    }
}
```

```csharp
// Features/Orders/CreateOrder/CreateOrderValidator.cs
public class CreateOrderValidator : AbstractValidator<CreateOrderCommand>
{
    public CreateOrderValidator()
    {
        RuleFor(x => x.ProductId).GreaterThan(0);
        RuleFor(x => x.Quantity).GreaterThan(0).LessThanOrEqualTo(100);
        RuleFor(x => x.CustomerEmail).NotEmpty().EmailAddress();
    }
}
```

```csharp
// Features/Orders/CreateOrder/CreateOrderEndpoint.cs
public class CreateOrderEndpoint : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapPost("/orders", async (CreateOrderCommand command, ISender sender) =>
        {
            var result = await sender.Send(command);
            return Results.Created($"/orders/{result.Id}", result);
        });
    }
}
```

## Compartiendo Preocupaciones Transversales

No todo pertenece a un slice vertical. La infraestructura compartida vive en una carpeta común:

```
├── Features/           # Slices verticales
├── Common/
│   ├── Behaviors/      # Pipelines de MediatR (logging, validación, transacciones)
│   ├── Exceptions/     # Excepciones de dominio y aplicación
│   ├── Interfaces/     # Abstracciones compartidas
│   └── Infrastructure/ # DbContext, configuración de DI
```

## Errores Comunes

- **Sin abstracciones compartidas** — duplicar acceso a DbContext o pipelines de validación en cada feature
- **Features demasiado granulares** — crear un slice para cada operación CRUD en lugar de agrupar operaciones relacionadas
- **Lógica de negocio en endpoints** — los handlers deben contener la lógica, los endpoints solo delegan
- **Ignorar preocupaciones transversales** — logging, caching y transacciones aún necesitan manejo centralizado
- **Mezclar horizontal y vertical** — elegir un enfoque por aplicación, no ambos arbitrariamente

## FAQ

**Reemplaza Vertical Slice a Clean Architecture?**
No, abordan preocupaciones diferentes. Vertical Slice es sobre organización de código (estructura de carpetas). Clean Architecture es sobre dirección de dependencias. Puedes combinarlos: features organizadas verticalmente con dependencias que apuntan hacia adentro.

**Qué framework funciona mejor con Vertical Slice?**
Cualquier framework que soporte un patrón mediator. ASP.NET Core con MediatR, FastAPI con inyección de dependencias, o Spring Boot con librerías CQRS funcionan bien.

**Cómo manejo features que comparten lógica?**
Extrae la lógica compartida en servicios de dominio o comportamientos comunes. El objetivo es cohesión dentro de una feature, no aislamiento absoluto a toda costa.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.
