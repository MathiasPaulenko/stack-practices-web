---





contentType: guides
slug: onion-architecture-guide
title: "Arquitectura Onion"
description: "Guía práctica de Arquitectura Onion: organizar código alrededor del modelo de dominio, forzar dirección de dependencias hacia adentro y aislar infraestructura de la lógica de negocio."
metaDescription: "Aprende Arquitectura Onion: organiza código alrededor del dominio, fuerza dependencias hacia adentro, aisla infraestructura. Guía práctica con ejemplos."
difficulty: intermediate
topics:
  - architecture
  - design
tags:
  - onion-architecture
  - dependency-inversion
  - domain-driven-design
  - clean-architecture
  - ports-and-adapters
  - layered-architecture
  - guia
relatedResources:
  - /guides/layered-architecture-guide
  - /guides/vertical-slice-architecture-guide
  - /patterns/dependency-injection-pattern
  - /patterns/repository-pattern
  - /guides/clean-architecture-guide
  - /guides/cqrs-event-sourcing-combined-guide
  - /guides/hexagonal-architecture-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende Arquitectura Onion: organiza código alrededor del dominio, fuerza dependencias hacia adentro, aisla infraestructura. Guía práctica con ejemplos."
  keywords:
    - onion-architecture
    - dependency-inversion
    - domain-driven-design
    - clean-architecture
    - ports-and-adapters
    - guia





---

## Overview

La Arquitectura Onion, popularizada por Jeffrey Palermo, estructura aplicaciones como capas concéntricas con el modelo de dominio en el centro. A diferencia de la arquitectura tradicional por capas donde las dependencias apuntan hacia abajo (UI → Negocio → Datos), Onion invierte esto: todas las dependencias apuntan hacia adentro hacia el núcleo del dominio. La infraestructura, UI y servicios externos viven en los bordes exteriores y dependen de abstracciones internas, nunca al revés. Esto hace que el modelo de dominio quede completamente aislado de frameworks, bases de datos y mecanismos de entrega.

## Cuándo Usar


- For alternatives, see [Hexagonal Architecture — Ports, Adapters, and Testability](/es/guides/hexagonal-architecture-guide/).

- Necesitas un modelo de dominio que sobreviva cambios de framework
- Tu lógica de negocio es compleja y cambia frecuentemente
- Quieres diferir decisiones tecnológicas (base de datos, framework, UI)
- Probar reglas de negocio sin base de datos ni servidor web es prioridad
- Estás aplicando principios de Domain-Driven Design (DDD)

## Las Capas

| Capa | Responsabilidad | Dependencias |
|------|---------------|--------------|
| **Núcleo de Dominio** | Entidades, objetos de valor, eventos de dominio, reglas de negocio | Ninguna (pura) |
| **Servicios de Dominio** | Operaciones que no pertenecen a una entidad | Núcleo de Dominio |
| **Servicios de Aplicación** | Casos de uso, orquestación, DTOs | Núcleo de Dominio, Servicios de Dominio |
| **Infraestructura** | Acceso a BD, APIs externas, mensajería, sistema de archivos | Servicios de Aplicación (vía interfaces) |
| **Presentación** | Controladores, manejadores CLI, vistas | Servicios de Aplicación |

## Regla de Dependencia

Todas las dependencias apuntan hacia adentro. Las capas exteriores dependen de las capas interiores vía interfaces definidas en las capas internas.

```csharp
// Núcleo de Dominio — capa más interna
public interface IOrderRepository
{
    Task<Order> GetByIdAsync(OrderId id);
    Task SaveAsync(Order order);
}

public class Order
{
    public OrderId Id { get; private set; }
    public Money Total { get; private set; }
    private List<OrderLine> _lines = new();

    public void AddLine(Product product, int quantity)
    {
        if (quantity <= 0) throw new DomainException("La cantidad debe ser positiva");
        _lines.Add(new OrderLine(product, quantity));
        RecalculateTotal();
    }

    private void RecalculateTotal() =>
        Total = _lines.Aggregate(Money.Zero, (sum, line) => sum + line.Subtotal);
}
```

```csharp
// Capa de Aplicación — orquesta casos de uso
public class PlaceOrderHandler
{
    private readonly IOrderRepository _orderRepository;
    private readonly IProductRepository _productRepository;
    private readonly IEventBus _eventBus;

    public PlaceOrderHandler(
        IOrderRepository orderRepository,
        IProductRepository productRepository,
        IEventBus eventBus)
    {
        _orderRepository = orderRepository;
        _productRepository = productRepository;
        _eventBus = eventBus;
    }

    public async Task<OrderId> Handle(PlaceOrderCommand command)
    {
        var order = new Order();
        foreach (var item in command.Items)
        {
            var product = await _productRepository.GetByIdAsync(item.ProductId);
            order.AddLine(product, item.Quantity);
        }
        await _orderRepository.SaveAsync(order);
        await _eventBus.PublishAsync(new OrderPlacedEvent(order.Id, order.Total));
        return order.Id;
    }
}
```

```csharp
// Capa de Infraestructura — implementa interfaces del dominio
public class SqlOrderRepository : IOrderRepository
{
    private readonly AppDbContext _dbContext;

    public SqlOrderRepository(AppDbContext dbContext) => _dbContext = dbContext;

    public async Task<Order> GetByIdAsync(OrderId id) =>
        await _dbContext.Orders
            .Include(o => o.Lines)
            .FirstAsync(o => o.Id == id);

    public async Task SaveAsync(Order order)
    {
        _dbContext.Orders.Add(order);
        await _dbContext.SaveChangesAsync();
    }
}
```

## Puertos y Adaptadores

Las capas exteriores implementan interfaces (puertos) definidas por las capas internas. Este es el patrón Puertos y Adaptadores.

```
┌─────────────────────────────────────┐
│  Presentación (Controladores, CLI) │
│         ↓ usa interfaces           │
├─────────────────────────────────────┤
│  Servicios de Aplicación (casos)   │
│         ↓ usa interfaces           │
├─────────────────────────────────────┤
│  Servicios de Dominio (operaciones)│
│         ↓ usa                     │
├─────────────────────────────────────┤
│  Núcleo de Dominio (entidades)    │
└─────────────────────────────────────┘
         ↑
   Infraestructura implementa interfaces definidas arriba
```

## Errores Comunes

- **Filtrar detalles del ORM al dominio** — la configuración de mapeo pertenece a infraestructura, no a clases de entidad
- **Servicios de aplicación con lógica de negocio** — las reglas de negocio pertenecen al dominio, la orquestación a aplicación
- **Dependencias circulares** — usa herramientas como ArchUnit o NetArchTest para forzar límites de capa
- **Modelo de dominio anémico** — las entidades deben encapsular comportamiento, no solo datos
- **Demasiadas capas** — para CRUD simple, Onion puede ser exceso; úsala cuando la complejidad del dominio lo justifica

## FAQ

**Onion vs Clean Architecture?**
Ambas comparten el mismo principio de inversión de dependencias. Onion nombra explícitamente las capas (Dominio, Aplicación, Infraestructura, Presentación), mientras que Clean Architecture usa un modelo de anillos concéntricos más genérico. Son funcionalmente equivalentes.

**Puedo usar Onion en una aplicación monolítica?**
Sí. La Arquitectura Onion funciona a nivel de módulo o aplicación. Un monolito puede tener múltiples módulos estructurados con Onion.

**Qué ORM funciona mejor con Onion?**
Cualquier ORM que soporte entidades POCO/POJO sin requerir clases base o atributos. EF Core con Fluent API, Dapper, Hibernate con mapeos XML, o SQLAlchemy con base declarativa funcionan bien.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.


## Temas Avanzados

### Escenario Detallado: App de Pedidos con Arquitectura Onion

```text
Proyecto: Sistema de pedidos .NET 8
Estructura de proyectos:
  src/
    Domain/                    # Nucleo — sin dependencias externas
      ├── Entities/
      │   ├── Order.cs          # Entidad con logica de negocio
      │   ├── OrderLine.cs      # Value object
      │   └── Product.cs
      ├── ValueObjects/
      │   ├── Money.cs          # Value object inmutable
      │   └── OrderId.cs
      ├── Events/
      │   ├── OrderPlacedEvent.cs
      │   └── OrderCancelledEvent.cs
      ├── Interfaces/
      │   ├── IOrderRepository.cs   # Puerto definido en dominio
      │   ├── IProductRepository.cs
      │   └── IEventBus.cs
      └── Exceptions/
          └── DomainException.cs
    Application/               # Casos de uso — depende de Domain
      ├── Orders/
      │   ├── PlaceOrder/
      │   │   ├── PlaceOrderCommand.cs
      │   │   ├── PlaceOrderHandler.cs
      │   │   └── PlaceOrderValidator.cs
      │   ├── CancelOrder/
      │   │   ├── CancelOrderCommand.cs
      │   │   └── CancelOrderHandler.cs
      │   └── GetOrderById/
      │       ├── GetOrderByIdQuery.cs
      │       └── GetOrderByIdHandler.cs
      └── DTOs/
          └── OrderDto.cs
    Infrastructure/           # Implementaciones — depende de Application
      ├── Persistence/
      │   ├── AppDbContext.cs
      │   ├── Configurations/
      │   │   └── OrderConfiguration.cs   # Mapeo EF Core
      │   └── Repositories/
      │       ├── SqlOrderRepository.cs    # Implementa IOrderRepository
      │       └── SqlProductRepository.cs
      ├── Messaging/
      │   └── RabbitMqEventBus.cs          # Implementa IEventBus
      └── DependencyInjection.cs
    Presentation/             # API — depende de Application
      ├── Controllers/
      │   └── OrdersController.cs
      └── Program.cs

Reglas de dependencia (verificadas con NetArchTest):
  Domain no referencia ningun proyecto
  Application referencia solo Domain
  Infrastructure referencia Application y Domain
  Presentation referencia Application y Domain
  Ningun proyecto referencia Infrastructure (inversion de dependencias)

Testeo por capa:
  | Capa | Tipo | Herramienta |
  |------|------|------------|
  | Domain | Unit puro, sin mocks | xUnit |
  | Application | Unit con mocks de repos | xUnit + NSubstitute |
  | Infrastructure | Integration con Testcontainers | xUnit + Testcontainers |
  | Presentation | Integration con WebApplicationFactory | xUnit |

Verificacion arquitectura en CI:
  // ArchUnitTest.cs
  var result = Types.InAssembly(typeof(Order).Assembly)
      .Should().NotHaveDependencyOn("Infrastructure")
      .And().NotHaveDependencyOn("Presentation")
      .And().NotHaveDependencyOn("Microsoft.EntityFrameworkCore")
      .GetResult();
  result.IsSuccessful.Should().BeTrue();
```

### Como manejo transacciones en Arquitectura Onion?

Define una interfaz IUnitOfWork en el dominio. La infraestructura la implementa con EF Core o Dapper. El handler de aplicacion usa IUnitOfWork para coordinar transacciones: abre la unidad de trabajo, ejecuta operaciones de dominio, y hace commit o rollback. El dominio no sabe nada sobre transacciones; solo expone metodos que cambian su estado. La capa de aplicacion decide cuando persistir.























End of document. Review and update quarterly.