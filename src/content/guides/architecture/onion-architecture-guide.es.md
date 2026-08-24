---
contentType: guides
slug: onion-architecture-guide
title: "Guía de Arquitectura Onion: Diseño Centrado en el Dominio"
description: "Guía práctica de Arquitectura Onion: organiza código alrededor del dominio, fuerza dependencias hacia adentro y aísla infraestructura. Incluye ejemplos en C#."
metaDescription: "Guía práctica de Arquitectura Onion: organiza código alrededor del dominio, fuerza dependencias hacia adentro y aísla infraestructura. Incluye ejemplos en C#."
difficulty: intermediate
topics:
  - architecture
  - design
tags:
  - architecture
  - dependency-inversion
  - domain-driven-design
  - clean-architecture
  - ports-and-adapters
  - layered-architecture
  - guide
relatedResources:
  - /guides/layered-architecture-guide
  - /guides/vertical-slice-architecture-guide
  - /patterns/dependency-injection-pattern
  - /patterns/repository-pattern
  - /guides/clean-architecture-guide
  - /guides/cqrs-event-sourcing-combined-guide
  - /guides/hexagonal-architecture-guide
lastUpdated: "2026-08-23"
publishedAt: "2026-06-25"
author: Mathias Paulenko
seo:
  metaDescription: "Guía práctica de Arquitectura Onion: organiza código alrededor del dominio, fuerza dependencias hacia adentro y aísla infraestructura. Incluye ejemplos en C#."
  keywords:
    - onion-architecture
    - dependency-inversion
    - domain-driven-design
    - clean-architecture
    - ports-and-adapters
    - guia
---

## Descripción General

La Arquitectura Onion, introducida por Jeffrey Palermo, organiza una aplicación
como capas concéntricas con el modelo de dominio en el centro. En un diseño
por capas tradicional, las dependencias apuntan hacia abajo: la UI depende de la
lógica de negocio, que depende de la base de datos. Onion invierte esa
dirección. Cada capa depende de las más cercanas al centro, nunca al revés. La
infraestructura, la UI y los servicios externos están en el borde exterior y
dependen de abstracciones definidas en el núcleo del dominio. Esto mantiene el
modelo de dominio libre de frameworks, bases de datos y mecanismos de entrega.

## Cuándo Usarla

Usala cuando el modelo de dominio deba sobrevivir a las decisiones de
framework, cuando las reglas de negocio sean complejas y cambien frecuentemente,
y cuando quieras retrasar decisiones sobre la base de datos, el framework web o
la UI. También ayuda cuando necesitás tests rápidos y determinísticos de reglas
de negocio sin levantar una base de datos o servidor web, y cuando ya estás
aplicando Domain-Driven Design.

## Cuándo Evitarla

Evitala para CRUD simples o prototipos descartables donde la capa extra cueste
más de lo que aporta. Si el equipo no está cómodo con la inversión de
dependencias o el testeo a través de interfaces, la estructura puede pesar.
También es una mala elección cuando los plazos importan más que la
mantenibilidad a largo plazo y el dominio no vaya a cambiar.

## Conceptos Clave

### Las Capas

La arquitectura divide al sistema en cuatro capas, cada una con una
responsabilidad clara. El **Núcleo de Dominio** está en el centro y contiene
entidades, objetos de valor, eventos de dominio y reglas de negocio, y se mantiene
libre de dependencias externas. Los **Servicios de Dominio** contienen
operaciones que no caben naturalmente dentro de una entidad, y solo dependen del
Núcleo de Dominio. Los **Servicios de Aplicación** coordinan casos de uso, mapean
DTOs y manejan objetos de dominio, apoyándose en el Núcleo de Dominio y en los
Servicios de Dominio. La **Infraestructura** llena las interfaces definidas por
las capas interiores, como repositorios, buses de mensajes, almacenamiento de
archivos y APIs externas, y se conecta con la capa de Aplicación a través de esas
interfaces. La **Presentación** contiene controladores, manejadores CLI o vistas,
y depende de los Servicios de Aplicación. Este orden deja al dominio como la
parte más estable del sistema.

### La Regla de Dependencia

Todas las dependencias apuntan hacia adentro. Las capas exteriores dependen de
las interiores a través de interfaces que viven en las capas interiores. El
dominio se mantiene alejado de Entity Framework, ASP.NET, RabbitMQ y cualquier
otro framework. En cambio, la capa de infraestructura referencia el dominio y
llena interfaces como `IOrderRepository` o `IEventBus`.

### Puertos y Adaptadores

Las interfaces definidas por las capas interiores son puertos. Las
implementaciones concretas en las capas exteriores son adaptadores. La
aplicación declara lo que necesita, y la infraestructura lo satisface. Este
desacoplamiento permite cambiar SQL Server por PostgreSQL, REST por gRPC, o un
bus real por un fake en memoria sin tocar el dominio.

## Ejemplo de Implementación

Los snippets de C# más abajo muestran un pequeño sistema de pedidos: el dominio
define una entidad `Order` y un puerto `IOrderRepository`, la capa de aplicación
realiza un pedido, y la capa de infraestructura construye el repositorio con
Entity Framework Core.

```csharp
// Núcleo de Dominio — sin dependencias externas
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

Una solución .NET típica se ve así:

```text
src/
  Domain/
    Entities/Order.cs
    ValueObjects/Money.cs
    Events/OrderPlacedEvent.cs
    Interfaces/IOrderRepository.cs
  Application/
    Orders/PlaceOrder/PlaceOrderHandler.cs
    DTOs/OrderDto.cs
  Infrastructure/
    Persistence/Repositories/SqlOrderRepository.cs
    Messaging/RabbitMqEventBus.cs
  Presentation/
    Controllers/OrdersController.cs
```

Las reglas de dependencia se pueden forzar en CI con un test como este usando
NetArchTest o ArchUnit:

```csharp
var result = Types.InAssembly(typeof(Order).Assembly)
    .Should().NotHaveDependencyOn("Infrastructure")
    .And().NotHaveDependencyOn("Presentation")
    .And().NotHaveDependencyOn("Microsoft.EntityFrameworkCore")
    .GetResult();

result.IsSuccessful.Should().BeTrue();
```

## Mejores Prácticas

Mantené el Núcleo de Dominio puro asegurándote de que nunca referencie un
framework, ORM ni librería externa. Definí interfaces de repositorio, bus y
unit-of-work en el dominio o en la capa de aplicación, no en infraestructura.
Cableá adaptadores concretos a través de inyección de dependencias en la raíz de
composición, normalmente en `Program.cs` o un módulo de inicio. Forzá los límites
de capa con tests de arquitectura en CI, porque un build que pasa no alcanza si
una referencia nueva se cuela hacia adentro. Mapeá explícitamente entre entidades
y DTOs, y nunca expongas objetos de dominio directamente desde los controladores.
Mantené las reglas de negocio dentro de entidades y servicios de dominio, y
deja que los servicios de aplicación solo coordinen.

## Errores Comunes

Filtrar detalles del ORM al dominio es un error común; la configuración de mapeo
y los atributos del framework pertenecen a infraestructura. Poner lógica de
negocio en servicios de aplicación también rompe el modelo, porque las reglas
van en el dominio mientras el código de aplicación coordina. Las dependencias
circulares entre capas se pueden detectar temprano con tests de arquitectura.
Construir un modelo de dominio anémico, donde las entidades sean solo bolsas de
datos con getters y setters, pierde el punto. Agregar todas las capas a una app
CRUD pequeña es exceso; el patrón solo rinde cuando la complejidad del dominio
es genuina.

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre Onion y Clean Architecture?

Ambas usan la misma regla de dependencia hacia adentro. Onion nombra
explícitamente las capas: Dominio, Aplicación, Infraestructura, Presentación.
Clean Architecture dibuja la misma idea como anillos concéntricos genéricos. Son
funcionalmente iguales.

### ¿Puedo usar Arquitectura Onion en un monolito?

Sí. Funciona a nivel de módulo o aplicación. Un monolito puede contener varios
módulos con estructura Onion, cada uno con su propio núcleo de dominio.

### ¿Qué ORM funciona mejor?

Cualquiera que permita usar entidades POCO o POJO sin clases base o atributos.
EF Core con Fluent API, Dapper, Hibernate con mapeos XML y SQLAlchemy con base
declarativa funcionan bien.

### ¿Cómo empiezo en un proyecto existente?

Elegí un bounded context o servicio y aplicá el layering ahí. Mové el código de
framework hacia afuera, definí puertos en el dominio y agregá un adaptador.
Medí antes de expandirte.

### ¿Cómo manejo transacciones?

Definí `IUnitOfWork` en el dominio o en la capa de aplicación. La
infraestructura lo resuelve con EF Core o Dapper. El handler de aplicación abre
la unidad de trabajo, ejecuta operaciones de dominio y hace commit. El dominio
no sabe nada de transacciones.

### ¿Cómo testeo cada capa?

Los tests del Núcleo de Dominio son unitarios puros y sin mocks. Los tests de
los Servicios de Aplicación usan puertos mockeados. Los tests de Infraestructura
corren contra una base de datos real o un contenedor de prueba. Los tests de
Presentación corren contra el host completo de la API.
