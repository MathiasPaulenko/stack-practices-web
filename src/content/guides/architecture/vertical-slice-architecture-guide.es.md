---
contentType: guides
slug: vertical-slice-architecture-guide
title: "Arquitectura por Slices Verticales: Organización por Feature"
description: "Guía práctica de Arquitectura por Slices Verticales: organizar código por feature en lugar de por capa técnica para reducir navegación cruzada y mejorar cohesión."
metaDescription: "Aprende Slices Verticales: organiza código por feature, no por capa. Reduce navegación, mejora cohesión y simplifica cambios con ejemplos prácticos."
difficulty: intermediate
topics:
  - architecture
  - design
tags:
  - maintainability
  - guide
  - vertical-slice
  - architecture
  - feature-based
  - modularity
  - cohesion
relatedResources:
  - /guides/onion-architecture-guide
  - /guides/layered-architecture-guide
  - /guides/clean-architecture-guide
  - /patterns/cqrs-pattern
  - /patterns/mediator-pattern
  - /patterns/repository-pattern
lastUpdated: "2026-08-19"
publishedAt: "2026-06-25"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende Slices Verticales: organiza código por feature, no por capa. Reduce navegación, mejora cohesión y simplifica cambios con ejemplos prácticos."
  keywords:
    - vertical-slice-architecture
    - feature-based
    - feature-folder
    - code-organization
    - cohesion
    - guia
---

## Visión General

La Arquitectura por Slices Verticales, popularizada por Jimmy Bogard, invierte el
enfoque tradicional por capas. En lugar de organizar código por preocupación
técnica (Controladores, Servicios, Repositorios), organizás por feature. Todo el
código de una feature — comando, handler, validador y endpoint — vive junto en
una carpeta. Cuando necesitás cambiar "Crear Orden", todos los archivos
relevantes están ahí. Eso reduce la carga cognitiva de navegar la codebase y
baja los conflictos de merge entre equipos.

## Cuándo Usar

- Tu aplicación tiene muchas funcionalidades que evolucionan independientemente.
- Los miembros del equipo preguntan seguido "¿dónde está el código de X?"
- Cambios entre capas requieren tocar varios archivos en varios directorios.
- Querés minimizar conflictos de merge entre equipos de funcionalidades.
- Algunas funcionalidades son CRUD simples, otras son flujos complejos.

Para alternativas, consultá [Clean Architecture](/es/guides/clean-architecture-guide/).

### Cuándo evitarlo

- La codebase es pequeña. Una carpeta por feature no simplifica un proyecto que
  ya entra en pocos archivos.
- Cada feature reusa el mismo modelo de dominio masivo. Acoplamiento profundo
  entre slices significa que el dominio no está bien dividido.
- La organización no está lista para que un equipo se haga cargo de un slice de
  punta a punta.

## Organización Horizontal vs Vertical

```text
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
| --- | --- |
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

    public async Task<OrderDto> Handle(CreateOrderCommand request, CancellationToken ct)
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
        await _dbContext.SaveChangesAsync(ct);

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

No todo pertenece a un slice vertical. La infraestructura compartida vive en una
carpeta común:

```text
├── Features/           # Slices verticales
├── Common/
│   ├── Behaviors/      # Pipelines de MediatR (logging, validación, transacciones)
│   ├── Exceptions/     # Excepciones de dominio y aplicación
│   ├── Interfaces/     # Abstracciones compartidas
│   └── Infrastructure/ # DbContext, configuración de DI
```

Usá esta carpeta para código reutilizado entre slices: logging, pipelines de
validación, transacciones y excepciones compartidas. Mantené la lógica de
negocio dentro del slice.

## Mejores Prácticas

- Agrupá operaciones relacionadas en un slice. No crees un slice para cada acción
  CRUD si comparten los mismos datos y reglas.
- Dejá los handlers con la lógica y los endpoints livianos. Los endpoints
  delegan; los handlers contienen la lógica de negocio.
- Extraé lógica compartida a `Common/` o servicios de dominio, pero solo cuando
  al menos dos slices la necesiten.
- Organizá tests por feature. Poné `CreateOrderTests.cs` al lado del código de la
  feature o en una carpeta de tests con la misma estructura.
- Usá una librería mediator (MediatR, Mediator) para rutear requests a handlers
  sin acoplar slices entre sí.
- Elegí una organización principal por aplicación. Mezclar horizontal y vertical
  en el mismo proyecto genera confusión.

## Errores Comunes

- Duplicar acceso a `DbContext` o pipelines de validación en cada feature en
  lugar de usar comportamientos compartidos.
- Hacer slices demasiado granulares. Una carpeta por cada operación CRUD pequeña
  agrega ruido, no claridad.
- Poner lógica de negocio en endpoints o controladores. Eso saca la lógica del
  slice y la vuelve a una capa horizontal.
- Ignorar preocupaciones transversales. Logging, caching y transacciones todavía
  necesitan un lugar central.
- Forzar aislamiento absoluto. Las entidades de dominio compartidas pueden vivir
  en `Common/Domain` y seguir manteniendo cohesión en cada slice.

## FAQ

### ¿Reemplaza Vertical Slice a Clean Architecture?

No. Vertical Slice es sobre organización de carpetas. Clean Architecture es sobre
dirección de dependencias. Podés combinarlos: slices organizados
verticalmente con dependencias que apuntan hacia adentro.

### ¿Qué framework funciona mejor con Vertical Slice?

Cualquier framework que soporte un patrón mediator. ASP.NET Core con MediatR,
FastAPI con inyección de dependencias, o Spring Boot con librerías CQRS funcionan
bien.

### ¿Cómo manejo features que comparten lógica?

Extraé la lógica compartida en servicios de dominio o comportamientos comunes. El
objetivo es cohesión dentro de una feature, no aislamiento a toda costa.

### ¿Cómo migro de capas a slices verticales?

Migrá una feature a la vez. Empezá por la más simple, mové su código a la
nueva carpeta del slice, verificá que los tests pasen y eliminá los archivos
viejos. Repetí. No migres todo de golpe.

### ¿Cómo manejo entidades de dominio compartidas?

Entidades como `Order` o `Product` viven en `Common/Domain/` o en un proyecto
compartido. Los slices las referencian pero mantienen su propia lógica. Si dos
slices necesitan la misma lógica de dominio, extraé un método en la entidad o
creá un servicio de dominio en `Common/`.

### ¿Cuándo un slice es demasiado grande?

Cuando la carpeta empieza a parecer su propia aplicación — múltiples procesos de
negocio, datos no relacionados y muchas subcarpetas — probablemente es un bounded
context que merece su propio servicio o módulo.
