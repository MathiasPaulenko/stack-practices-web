---
contentType: guides
slug: cqrs-event-sourcing-combined-guide
title: "CQRS + Event Sourcing — Guía Combinada"
description: "Guía práctica de combinar CQRS y Event Sourcing: separar modelos de lectura y escritura, reconstruir estado desde eventos y manejar consistencia eventual."
metaDescription: "Aprende CQRS + Event Sourcing: separa modelos de lectura/escritura, reconstruye estado desde eventos, maneja consistencia eventual. Guía práctica con ejemplos."
difficulty: advanced
topics:
  - architecture
  - databases
  - messaging
tags:
  - cqrs
  - event-sourcing
  - read-model
  - write-model
  - eventual-consistency
  - event-store
  - projection
  - guia
relatedResources:
  - /guides/onion-architecture-guide
  - /guides/data-mesh-guide
  - /patterns/design/saga-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende CQRS + Event Sourcing: separa modelos de lectura/escritura, reconstruye estado desde eventos, maneja consistencia eventual. Guía práctica con ejemplos."
  keywords:
    - cqrs
    - event-sourcing
    - read-model
    - write-model
    - eventual-consistency
    - event-store
    - guia
---

## Overview

CQRS (Command Query Responsibility Segregation) y Event Sourcing se usan frecuentemente juntos pero resuelven problemas diferentes. CQRS separa operaciones de lectura y escritura en modelos optimizados para cada una. Event Sourcing almacena cambios de estado como una secuencia de eventos en lugar de sobrescribir el estado actual. Combinados, crean un patrón capaz donde el modelo de escritura agrega eventos, el modelo de lectura proyecta esos eventos en vistas consultables, y el sistema puede reconstruir cualquier estado pasado reproduciendo el log de eventos.

## Cuándo Usar

- Dominios complejos donde auditar cada cambio de estado es requerido
- Las cargas de lectura y escritura tienen patrones de acceso fundamentalmente diferentes
- Necesitas reconstruir modelos de lectura sin tocar el camino de escritura
- Microservicios event-driven necesitan una fuente de verdad confiable
- Los requerimientos de negocio demandan consultas temporales ("Cuál era el estado el 15 de marzo?")

## La Arquitectura Combinada

```
┌─────────────┐     Comando      ┌──────────────┐
│   Cliente   │ ───────────────> │  Lado de     │
│             │                  │  Comandos    │
│             │ <─────────────── │ (Write Model)│
└─────────────┘     Evento       └──────┬───────┘
                                        │
                                        │ Guardar Eventos
                                        ▼
                                ┌──────────────┐
                                │  Event Store │
                                └──────┬───────┘
                                       │ Publicar
                                       ▼
┌─────────────┐     Consulta   ┌──────────────┐
│   Cliente   │ <──────────────│  Lado de     │
│             │                │  Consultas   │
└─────────────┘                │ (Read Model) │
                               └──────────────┘
```

## Modelo de Escritura — Event Sourcing

```csharp
// Comandos
public record PlaceOrderCommand(Guid CustomerId, List<OrderLineItem> Items);
public record CancelOrderCommand(Guid OrderId, string Reason);

// Eventos de Dominio
public record OrderPlaced(Guid OrderId, Guid CustomerId, List<OrderLineItem> Items, DateTime PlacedAt);
public record OrderCancelled(Guid OrderId, string Reason, DateTime CancelledAt);

// Aggregate Root
public class Order : AggregateRoot
{
    private List<OrderLineItem> _items = new();
    private OrderStatus _status = OrderStatus.Pending;

    public static Order Create(PlaceOrderCommand command)
    {
        var order = new Order();
        order.Apply(new OrderPlaced(
            Guid.NewGuid(),
            command.CustomerId,
            command.Items,
            DateTime.UtcNow));
        return order;
    }

    public void Cancel(string reason)
    {
        if (_status == OrderStatus.Shipped)
            throw new DomainException("No se puede cancelar una orden enviada");
        
        Apply(new OrderCancelled(Id, reason, DateTime.UtcNow));
    }

    // Rehidratación desde eventos
    protected override void When(object @event)
    {
        switch (@event)
        {
            case OrderPlaced e:
                Id = e.OrderId;
                _items = e.Items;
                _status = OrderStatus.Placed;
                break;
            case OrderCancelled:
                _status = OrderStatus.Cancelled;
                break;
        }
    }
}
```

## Event Store

```csharp
public interface IEventStore
{
    Task AppendAsync(string streamId, IEnumerable<object> events, long expectedVersion);
    Task<IReadOnlyList<object>> ReadStreamAsync(string streamId);
}

public class PostgresEventStore : IEventStore
{
    private readonly NpgsqlConnection _connection;

    public async Task AppendAsync(string streamId, IEnumerable<object> events, long expectedVersion)
    {
        await using var transaction = await _connection.BeginTransactionAsync();
        
        var currentVersion = await GetCurrentVersionAsync(streamId);
        if (currentVersion != expectedVersion)
            throw new ConcurrencyException($"Versión esperada {expectedVersion}, encontrada {currentVersion}");

        foreach (var @event in events)
        {
            await _connection.ExecuteAsync(
                "INSERT INTO events (stream_id, version, type, data, metadata) VALUES (@streamId, @version, @type, @data, @metadata)",
                new { streamId, version = ++currentVersion, type = @event.GetType().Name, data = JsonSerializer.Serialize(@event) });
        }
        
        await transaction.CommitAsync();
    }

    public async Task<IReadOnlyList<object>> ReadStreamAsync(string streamId)
    {
        var rows = await _connection.QueryAsync<EventRow>(
            "SELECT type, data FROM events WHERE stream_id = @streamId ORDER BY version",
            new { streamId });
        
        return rows.Select(r => JsonSerializer.Deserialize(r.Data, Type.GetType(r.Type))).ToList();
    }
}
```

## Modelo de Lectura — Proyecciones

```csharp
public class OrderProjectionHandler : IEventHandler<OrderPlaced>, IEventHandler<OrderCancelled>
{
    private readonly OrderReadDbContext _dbContext;

    public OrderProjectionHandler(OrderReadDbContext dbContext) => _dbContext = dbContext;

    public async Task Handle(OrderPlaced @event, CancellationToken cancellationToken)
    {
        var orderView = new OrderView
        {
            Id = @event.OrderId,
            CustomerId = @event.CustomerId,
            Status = "Placed",
            Total = @event.Items.Sum(i => i.Price * i.Quantity),
            ItemCount = @event.Items.Count,
            PlacedAt = @event.PlacedAt
        };
        _dbContext.OrderViews.Add(orderView);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task Handle(OrderCancelled @event, CancellationToken cancellationToken)
    {
        var orderView = await _dbContext.OrderViews.FindAsync(@event.OrderId);
        if (orderView != null)
        {
            orderView.Status = "Cancelled";
            orderView.CancelledAt = @event.CancelledAt;
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
```

## Consultas del Modelo de Lectura

```csharp
public class GetOrdersQueryHandler : IRequestHandler<GetOrdersQuery, List<OrderSummaryDto>>
{
    private readonly OrderReadDbContext _dbContext;

    public GetOrdersQueryHandler(OrderReadDbContext dbContext) => _dbContext = dbContext;

    public async Task<List<OrderSummaryDto>> Handle(GetOrdersQuery request, CancellationToken cancellationToken)
    {
        return await _dbContext.OrderViews
            .Where(o => request.Status == null || o.Status == request.Status)
            .OrderByDescending(o => o.PlacedAt)
            .Select(o => new OrderSummaryDto(o.Id, o.Status, o.Total, o.ItemCount))
            .ToListAsync(cancellationToken);
    }
}
```

## Manejando Consistencia Eventual

| Estrategia | Cuándo Usar |
|-----------|-------------|
| **Polling** | UI simple con bajos requerimientos de latencia |
| **WebSockets/SSE** | Actualizaciones de UI en tiempo real |
| **Retornar ID de proyección** | Dejar que el cliente haga polling al modelo de lectura directamente |
| **Proyección síncrona** | Aceptable solo para caminos críticos con bajo volumen |

```csharp
// Opción: Retornar ubicación del modelo de lectura después del comando
public async Task<IActionResult> PlaceOrder(PlaceOrderCommand command)
{
    var orderId = await _commandBus.SendAsync(command);
    return AcceptedAtAction(
        actionName: nameof(GetOrder),
        routeValues: new { id = orderId },
        value: new { message = "Procesando orden", checkStatusAt = $"/orders/{orderId}" });
}
```

## Errores Comunes

- **Sobre-ingeniería para CRUD simple** — CQRS + ES añade mayor complejidad; úsalo cuando el dominio lo justifica
- **Sin estrategia de versionado** — los esquemas de eventos evolucionan; implementa upcasting o múltiples versiones
- **Falta de idempotencia** — los handlers pueden procesar el mismo evento dos veces; diseña para idempotencia
- **Aggregates grandes** — aggregates grandes generan muchos eventos; considera dividir por bounded context
- **Sin estrategia de snapshots** — reproducir miles de eventos para cada carga es lento; usa snapshots para aggregates calientes

## FAQ

**Puedo usar CQRS sin Event Sourcing?**
Sí. CQRS solo requiere modelos de lectura/escritura separados. El modelo de escritura puede usar una base de datos relacional tradicional.

**Cómo manejo cambios de esquema en eventos?**
Versiona tus eventos. Al leer eventos antiguos, aplica un upcaster para transformarlos al esquema actual. Nunca modifiques eventos almacenados.

**Qué base de datos debo usar para el event store?**
PostgreSQL con JSONB funciona bien para escala moderada. Para alto throughput, usa event stores especializados como EventStoreDB o Axon Server.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.


## Temas Avanzados

### Escenario Detallado: Ledger Bancario con CQRS + Event Sourcing

```text
Sistema: Ledger de cuentas bancarias (C# + .NET 8 + PostgreSQL + Elasticsearch)
Requerimientos: Audit trail completo, consultas temporales, cumplimiento regulatorio
Volumen: 2M cuentas, 50M transacciones/ano

Schema del event store (PostgreSQL):
  CREATE TABLE event_store (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id VARCHAR(64) NOT NULL,  -- account-{accountId}
    version BIGINT NOT NULL,
    event_type VARCHAR(128) NOT NULL,
    payload JSONB NOT NULL,
    metadata JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(stream_id, version)
  );

  CREATE INDEX idx_stream ON event_store(stream_id, version);
  CREATE INDEX idx_event_type ON event_store(event_type);
  CREATE INDEX idx_occurred ON event_store(occurred_at);

Eventos de dominio:
  AccountOpened { accountId, customerId, initialDeposit, openedAt }
  MoneyDeposited { accountId, amount, balanceAfter, depositAt, tellerId }
  MoneyWithdrawn { accountId, amount, balanceAfter, withdrawAt, atmId }
  TransferInitiated { fromAccount, toAccount, amount, transferId }
  TransferCompleted { transferId, completedAt }
  AccountClosed { accountId, closedAt, reason }

Aggregate: Account (C#)
  public class Account : AggregateRoot
  {
      private decimal _balance;
      private AccountStatus _status;

      public static Account Open(Guid customerId, Money initialDeposit)
      {
          if (initialDeposit < Money.Zero)
              throw new DomainException("Deposito inicial no puede ser negativo");
          var account = new Account();
          account.Raise(new AccountOpened(Guid.NewGuid(), customerId, initialDeposit, DateTime.UtcNow));
          return account;
      }

      public void Deposit(Money amount, string tellerId)
      {
          if (_status != AccountStatus.Active)
              throw new DomainException("Cuenta no activa");
          if (amount <= Money.Zero)
              throw new DomainException("Deposito debe ser positivo");
          Raise(new MoneyDeposited(Id, amount, _balance + amount, DateTime.UtcNow, tellerId));
      }

      public void Withdraw(Money amount, string atmId)
      {
          if (_status != AccountStatus.Active)
              throw new DomainException("Cuenta no activa");
          if (amount > _balance)
              throw new DomainException("Fondos insuficientes");
          Raise(new MoneyWithdrawn(Id, amount, _balance - amount, DateTime.UtcNow, atmId));
      }

      protected override void When(object @event)
      {
          switch (@event)
          {
              case AccountOpened e:
                  Id = e.AccountId;
                  _balance = e.InitialDeposit;
                  _status = AccountStatus.Active;
                  break;
              case MoneyDeposited e:
                  _balance = e.BalanceAfter;
                  break;
              case MoneyWithdrawn e:
                  _balance = e.BalanceAfter;
                  break;
              case AccountClosed:
                  _status = AccountStatus.Closed;
                  break;
          }
      }
  }

Estrategia de snapshots:
  - Snapshot cada 500 eventos por cuenta
  - Tabla snapshots: snapshots(stream_id, version, state, created_at)
  - Al cargar: leer ultimo snapshot + eventos despues de la version del snapshot
  - Cuenta promedio: 120 eventos (no necesita snapshot)
  - Usuarios power: 5000+ eventos (snapshot ahorra ~4.5s de carga)

Modelo de lectura: Elasticsearch (desnormalizado para consultas)
  Indice: accounts
    { accountId, customerId, balance, status, lastTransactionAt, ... }

  Indice: transactions
    { accountId, type, amount, balanceAfter, occurredAt, ... }

Projection handler:
  class AccountProjection :
    - AccountOpened -> insertar doc de account
    - MoneyDeposited -> actualizar balance + insertar doc de transaction
    - MoneyWithdrawn -> actualizar balance + insertar doc de transaction
    - AccountClosed -> actualizar status a closed

Ejemplo de consulta temporal:
  "Cual era el balance de la cuenta ABC-123 el 15 de marzo de 2026?"
  -> Replay eventos de la cuenta ABC-123 hasta el 15 de marzo de 2026
  -> Fold eventos para calcular el balance en ese punto
  -> Retornar balance (no necesita consultar el read model)

  // Implementacion en C#
  public async Task<decimal> GetBalanceAt(Guid accountId, DateTime date)
  {
      var events = await _eventStore.ReadStreamAsync(
          $"account-{accountId}", until: date);
      var account = Account.FromHistory(events);
      return account.Balance;
  }

Cumplimiento regulatorio:
  - Cada transaccion es un evento inmutable (audit trail por diseno)
  - Exportar eventos a cold storage (S3) trimestralmente para retencion de 7 anos
  - Versionado de esquema de eventos con upcasters para compatibilidad
  - PII encriptada en payloads de eventos (envelope encryption con KMS)
```

### Como manejo la evolucion del esquema de eventos sin romper consumers?

Usa upcasters: al leer eventos antiguos, transformalos al esquema actual antes de aplicarlos. Nunca modifiques eventos almacenados. Agrega nuevos campos con valores por defecto (compatible hacia atras). Para cambios breaking, crea un nuevo tipo de evento (ej: OrderPlacedV2) y mantén ambas versiones en el event store hasta que todos los aggregates que usan V1 sean archivados. Los consumers manejan ambas versiones durante el periodo de transicion. Documenta cada cambio de esquema en un catalogo de eventos.
