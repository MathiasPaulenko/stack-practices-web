---



contentType: guides
slug: layered-architecture-guide
title: "Arquitectura por Capas — N-Tier Explicado"
description: "Guía práctica de Arquitectura por Capas (N-Tier): separar presentación, lógica de negocio y capa de datos con responsabilidades claras y reglas de dependencia."
metaDescription: "Aprende Arquitectura por Capas: separa presentación, negocio y datos. Entiende la estructura N-Tier, reglas de dependencia y cuándo usarla."
difficulty: beginner
topics:
  - architecture
  - design
tags:
  - layered-architecture
  - n-tier
  - separation-of-concerns
  - presentation-layer
  - business-logic-layer
  - data-access-layer
  - guia
relatedResources:
  - /guides/onion-architecture-guide
  - /guides/vertical-slice-architecture-guide
  - /patterns/repository-pattern
  - /guides/clean-architecture-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende Arquitectura por Capas: separa presentación, negocio y datos. Entiende la estructura N-Tier, reglas de dependencia y cuándo usarla."
  keywords:
    - layered-architecture
    - n-tier
    - separation-of-concerns
    - presentation-layer
    - business-logic-layer
    - guia



---

## Overview

La Arquitectura por Capas (también llamada N-Tier) es el patrón arquitectónico más común en aplicaciones empresariales. Divide la aplicación en capas horizontales, cada una con una responsabilidad específica. El modelo clásico de tres capas separa Presentación, Lógica de Negocio y Acceso a Datos. Esta separación hace que el sistema sea más fácil de entender, probar y mantener — aunque también puede introducir abstracciones innecesarias si se aplica en exceso.

## Cuándo Usar


- For alternatives, see [Clean Architecture](/es/guides/clean-architecture-guide/).

- Construyes aplicaciones web o de escritorio empresariales tradicionales
- La estructura del equipo refleja especialización técnica (frontend, backend, BD)
- La lógica de negocio es moderadamente compleja pero no cambia rápidamente
- Necesitas una arquitectura probada y ampliamente documentada
- No se espera que la aplicación cambie su mecanismo de entrega (web vs móvil vs API)

## Las Tres Capas Clásicas

| Capa | Responsabilidad | Componentes de Ejemplo |
|------|---------------|----------------------|
| **Presentación** | Renderizado UI, validación de entrada, enrutamiento | Controladores, Vistas, ViewModels, DTOs |
| **Lógica de Negocio** | Reglas de dominio, cálculos, flujos de trabajo | Servicios, Entidades, Validadores |
| **Acceso a Datos** | Persistencia, consultas, transacciones | Repositorios, Mapeos ORM, SQL |

## Dirección de Dependencias

En arquitectura por capas estricta, una capa solo puede depender de la capa directamente inferior.

```
Capa de Presentación
      ↓ (depende de)
Capa de Lógica de Negocio
      ↓ (depende de)
Capa de Acceso a Datos
      ↓ (depende de)
Base de Datos
```

## Ejemplo de Implementación

```csharp
// Capa de Presentación — Controlador
public class OrderController : ControllerBase
{
    private readonly IOrderService _orderService;

    public OrderController(IOrderService orderService) =>
        _orderService = orderService;

    [HttpPost]
    public async Task<ActionResult<OrderDto>> Create(CreateOrderRequest request)
    {
        var dto = await _orderService.CreateOrderAsync(request.ProductId, request.Quantity);
        return CreatedAtAction(nameof(Get), new { id = dto.Id }, dto);
    }
}
```

```csharp
// Capa de Lógica de Negocio — Servicio
public class OrderService : IOrderService
{
    private readonly IOrderRepository _repository;
    private readonly IProductRepository _productRepository;

    public OrderService(IOrderRepository repository, IProductRepository productRepository)
    {
        _repository = repository;
        _productRepository = productRepository;
    }

    public async Task<OrderDto> CreateOrderAsync(int productId, int quantity)
    {
        var product = await _productRepository.GetByIdAsync(productId);
        if (product.Stock < quantity)
            throw new BusinessException("Stock insuficiente");

        var order = new Order { ProductId = productId, Quantity = quantity, Total = product.Price * quantity };
        await _repository.AddAsync(order);
        return new OrderDto(order);
    }
}
```

```csharp
// Capa de Acceso a Datos — Repositorio
public class OrderRepository : IOrderRepository
{
    private readonly AppDbContext _context;

    public OrderRepository(AppDbContext context) => _context = context;

    public async Task AddAsync(Order order)
    {
        _context.Orders.Add(order);
        await _context.SaveChangesAsync();
    }

    public async Task<Order> GetByIdAsync(int id) =>
        await _context.Orders.FindAsync(id);
}
```

## Capas Estrictas vs Relajadas

| Estilo | Regla | Compromiso |
|--------|------|-----------|
| **Estricta** | Capa N solo llama a Capa N-1 | Más limpia pero más capas de abstracción |
| **Relajada** | Capa N puede llamar cualquier capa inferior | Menos código, pero más difícil trazar dependencias |

## Variaciones Comunes

- **Dos capas**: Cliente accede directamente a base de datos (apps de escritorio legacy)
- **Tres capas**: Presentación → Negocio → Datos (más común)
- **Cuatro capas**: Presentación → Aplicación → Dominio → Infraestructura (influencia Onion/Clean)

## Errores Comunes

- **Lógica de negocio filtrándose a controladores** — controladores delgados, servicios robustos
- **Acceso directo a BD desde presentación** — rompe encapsulación y testabilidad
- **Dependencias circulares entre capas** — usa inyección de dependencias para prevenir
- **Modelo de dominio anémico** — entidades con solo getters/setters y toda la lógica en servicios
- **Explosión de DTOs** — crear DTOs separados para cada transición de capa sin necesidad

## FAQ

**Está desactualizada la Arquitectura por Capas?**
No, sigue siendo válida para muchas aplicaciones. Sin embargo, para dominios altamente complejos o sistemas que necesitan cambiar frecuentemente el mecanismo de entrega, las arquitecturas Onion/Clean/Hexagonal proporcionan mejor aislamiento.

**Cómo pruebo una aplicación por capas?**
Prueba unitaria cada capa aislando las capas inferiores con mocks. Pruebas de integración verifican el cableado entre capas. Pruebas end-to-end validan la pila completa.

**Pueden los microservicios usar arquitectura por capas?**
Sí. Cada microservicio puede usar internamente arquitectura por capas mientras se comunican vía APIs. El layering es un patrón de organización interna, no inter-servicio.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.


### Escenario Detallado: App de E-commerce con Cuatro Capas

```text
Proyecto: E-commerce .NET 8
Estructura de capas:
  src/
    ECommerce.Web/          # Presentacion (Controllers, Views)
    ECommerce.Application/  # Aplicacion (Servicios, DTOs, Validadores)
    ECommerce.Domain/       # Dominio (Entidades, Value Objects, Reglas)
    ECommerce.Infrastructure/ # Infraestructura (EF Core, Email, Cache)

Flujo: Crear pedido
  1. Web: OrderController.Create(CreateOrderRequest)
     - Valida input con DataAnnotations
     - Mapea a CreateOrderCommand
     - Llama _orderService.CreateOrderAsync(cmd)

  2. Application: OrderService.CreateOrderAsync(cmd)
     - Verifica stock via _productRepository
     - Calcula total, descuentos, impuestos
     - Crea entidad Order (logica en el dominio)
     - Persiste via _orderRepository
     - Publica evento OrderCreated
     - Retorna OrderDto

  3. Domain: Order.Create(customerId, items)
     - Aplica reglas de negocio: minimo 1 item,
       maximo 100 items, total > 0
     - Asigna estado = Pending
     - Asigna fecha de creacion

  4. Infrastructure: OrderRepository.AddAsync(order)
     - EF Core mapea entidad a tabla Orders
     - SaveChangesAsync persiste
     - Publica evento a RabbitMQ via outbox

Reglas de dependencia:
  Web -> Application -> Domain
  Infrastructure -> Domain (implementa interfaces del dominio)
  Domain no depende de nadie (puro, sin referencias externas)

Testeo por capa:
  | Capa | Tipo de test | Herramienta |
  |------|-------------|-------------|
  | Domain | Unit puro | xUnit, sin mocks |
  | Application | Unit con mocks de repos | xUnit + Moq |
  | Infrastructure | Integration con Testcontainers | xUnit + Testcontainers |
  | Web | Integration con TestServer | xUnit + Web.ApplicationFactory |
```

### Como evito el modelo de dominio anemico?

Mueve la logica de negocio a las entidades del dominio. Una entidad Order debe tener metodos como AddItem(), CalculateTotal(), Cancel(). Si toda la logica esta en OrderService y Order solo tiene getters/setters, tienes un modelo anemico. El servicio debe coordinar, no contener reglas. Las reglas pertenecen a la entidad que las gobierna. Esto hace las reglas testeable sin mocks y reutilizables entre servicios.

### Deberia usar inyeccion de dependencias en cada capa?

Si, pero con diferentes propositos. En la capa de aplicacion, DI coordina servicios y repositorios. En la capa de dominio, evita DI: el dominio debe ser puro y construible con `new`. En infraestructura, DI configura implementaciones concretas (EF Core, Redis, SMTP). Usa composicion de dependencias en el punto de entrada (Program.cs) para cablear todo.

































































End of document. Review and update quarterly.