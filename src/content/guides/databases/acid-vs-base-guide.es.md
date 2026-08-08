---
contentType: guides
slug: acid-vs-base-guide
title: "ACID vs BASE — Modelos de Consistencia Explicados"
description: "Guía práctica comparando modelos de consistencia ACID y BASE: cuándo elegir consistencia fuerte, cuándo aceptar consistencia eventual y cómo cada uno afecta el diseño del sistema."
metaDescription: "Aprende modelos ACID vs BASE con ejemplos. Entiende consistencia fuerte vs eventual, teorema CAP y cuándo usar cada uno en sistemas distribuidos."
difficulty: intermediate
topics:
  - databases
  - architecture
tags:
  - acid
  - databases
  - distributed-systems
  - eventual-consistency
  - transactions
  - guide
relatedResources:
  - /guides/database-normalization-guide
  - /guides/database-replication-guide
  - /guides/nosql-patterns-guide
  - /guides/cqrs-guide
  - /patterns/distributed-lock-pattern
lastUpdated: "2026-06-24"
publishedAt: "2026-06-24"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende modelos ACID vs BASE con ejemplos. Entiende consistencia fuerte vs eventual, teorema CAP y cuándo usar cada uno en sistemas distribuidos."
  keywords:
    - acid
    - base
    - modelos-consistencia
    - teorema-cap
    - sistemas-distribuidos
    - consistencia-eventual
    - guia


---
## Overview

ACID y BASE representan dos filosofías para manejar consistencia de datos en bases de datos. ACID garantiza consistencia fuerte a través de transacciones que son Atómicas, Consistentes, Aisladas y Duraderas. BASE prioriza disponibilidad y tolerancia a particiones, aceptando que los datos pueden estar temporalmente inconsistentes. Entender cuándo usar cada modelo — y cómo combinarlos — es esencial para diseñar sistemas distribuidos confiables.

## Propiedades ACID

### Atomicidad

Todas las operaciones en una transacción completan exitosamente, o ninguna lo hace. No existe completación parcial.

```sql
BEGIN TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 'A';
UPDATE accounts SET balance = balance + 100 WHERE id = 'B';
COMMIT;  -- Ambas tienen éxito, o ROLLBACK cancela ambas
```

### Consistencia

Las transacciones llevan la base de datos de un estado válido a otro, preservando todas las restricciones y reglas.

### Aislamiento

Las transacciones concurrentes no se interfieren entre sí. El resultado es como si las transacciones se ejecutaran secuencialmente.

### Durabilidad

Una vez comprometidas, los cambios sobreviven fallos del sistema. Los datos se escriben en almacenamiento persistente.

## Niveles de Aislamiento

| Nivel | Dirty Read | Non-Repeatable Read | Phantom Read | Caso de Uso |
|-------|------------|---------------------|--------------|-------------|
| Read Uncommitted | Posible | Posible | Posible | Raro, solo analítica |
| Read Committed | No | Posible | Posible | Default para la mayoría |
| Repeatable Read | No | No | Posible | Operaciones financieras de lectura |
| Serializable | No | No | No | Transacciones financieras críticas |

## Propiedades BASE

### Básicamente Disponible

El sistema garantiza disponibilidad. Cada request recibe una respuesta, pero esa respuesta puede estar desactualizada.

### Estado Suave

El estado del sistema puede cambiar con el tiempo, incluso sin input, mientras los datos se replican y reconcilian.

### Consistencia Eventual

Si no se realizan nuevas actualizaciones, eventualmente todos los nodos convergerán al mismo valor.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Escritura │────▶│  Réplica A  │────▶│  Réplica B  │
│   X = 42    │     │   X = 42    │     │   X = null  │
└─────────────┘     └─────────────┘     └─────────────┘
                          │                     │
                          └───────sync──────────┘
                                         │
                                    X = 42 (eventual)
```

## Comparación ACID vs BASE

| Aspecto | ACID | BASE |
|---------|------|------|
| Consistencia | Fuerte (inmediata) | Eventual (demorada) |
| Disponibilidad | Puede rechazar bajo carga | Siempre responde |
| Tolerancia a Particiones | Sacrificada si es necesario | Requerida |
| Mejor Para | Financiero, inventario, reservas | Social, analítica, caching |
| Complejidad | Manejada por la base de datos | Manejada por la aplicación |
| Ejemplo | PostgreSQL, MySQL (InnoDB) | Cassandra, DynamoDB, Couchbase |

## Teorema CAP

El teorema CAP establece que un sistema distribuido puede garantizar como máximo dos de:

- **Consistencia:** Todos los nodos ven los mismos datos al mismo tiempo
- **Disponibilidad:** Cada request recibe una respuesta
- **Tolerancia a Particiones:** El sistema continúa a pesar de fallos de red

En la práctica, la tolerancia a particiones es obligatoria en sistemas distribuidos, así que la elección real es CP (consistente) vs AP (disponible).

## Elegir Entre ACID y BASE

### Elige ACID Cuando

- Transacciones financieras (banca, pagos, trading)
- Gestión de inventario (prevenir sobreventa)
- Sistemas de reserva (prevenir doble reserva)
- Cumplimiento regulatorio requiere registros exactos
- El costo de inconsistencia excede el costo del downtime

### Elige BASE Cuando

- Feeds de redes sociales (datos desactualizados son aceptables)
- Analítica y métricas (aproximado es suficiente)
- Carritos de compra (inconsistencia temporal es tolerable)
- Content delivery (los cachés CDN son inherentemente desactualizados)
- Sistemas donde el uptime es más crítico que la precisión perfecta

## Enfoques Híbridos

Los sistemas modernos a menudo usan ambos modelos en diferentes partes:

```
┌─────────────────────────────────────────┐
│           Capa de Aplicación            │
└──────────────┬──────────────────────────┘
               │
      ┌────────┴────────┐
      │                 │
┌─────▼─────┐    ┌──────▼──────┐
│  ACID DB  │    │  BASE Store │
│PostgreSQL │    │  Cassandra  │
│  Órdenes  │    │  Analytics  │
│  Pagos    │    │  Sesiones   │
└───────────┘    └─────────────┘
```

## Implementando BASE con Sagas

Cuando necesitas semánticas BASE pero confiabilidad tipo ACID, usa sagas:

```typescript
class OrderSaga {
  async execute(order: Order): Promise<void> {
    try {
      await this.inventoryService.reserve(order.items);
      await this.paymentService.charge(order.total);
      await this.shippingService.schedule(order);
    } catch (error) {
      await this.compensate(order);
    }
  }

  private async compensate(order: Order): Promise<void> {
    await this.inventoryService.release(order.items);
    await this.paymentService.refund(order.total);
  }
}
```

## Errores Comunes

- **Usar ACID para todo** — añade latencia y complejidad innecesaria a datos no críticos
- **Usar BASE para datos financieros** — la consistencia eventual puede causar doble gasto o sobreventa
- **Ignorar la elección CAP** — pretender que puedes tener los tres en un sistema distribuido
- **No manejar anomalías de lectura BASE** — leer datos desactualizados y tomar decisiones sobre ellos


## Troubleshooting

- **Query is slow after an index change**: check execution plans and cardinality estimates.   Rebuild statistics and verify the index is being used.
- **Replication lag grows**: Split large writes and consider parallel replication.
- **Connections exhausted**: review connection pool size, idle timeouts, and leaked connections.
- **Backup takes too long**: enable compression, incremental backups, and off-peak scheduling.
- **Deadlocks in high concurrency**: access tables and rows in a consistent order.

## FAQ

**¿Una base de datos puede soportar ACID y BASE?**
Sí. PostgreSQL con réplicas de lectura provee ACID en el primario y BASE en las réplicas. Algunas bases (ej. Cosmos DB) permiten elegir consistencia por request.

**¿Cómo manejo conflictos en sistemas BASE?**
Usa relojes vectoriales, last-write-wins con timestamps, o resolución de conflictos específica de la aplicación (ej. merge de carritos de compra).

**¿Es BASE más rápido que ACID?**
Generalmente sí, porque evita overhead de coordinación (locks, two-phase commit). Pero la diferencia de velocidad depende de la carga de trabajo e implementación.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.


## Temas Avanzados

### Escenario: E-commerce Hibrido ACID/BASE

```text
Sistema: 10M usuarios, 500K ordenes/dia
Modelo: ACID para pagos/inventario, BASE para catalogo/reviews

Arquitectura:
  | Servicio | Modelo | DB | Consistencia |
  |----------|--------|-----|-------------|
  | Pagos | ACID | PostgreSQL | Serializable |
  | Inventario | ACID | PostgreSQL | Repeatable Read |
  | Ordenes | ACID | PostgreSQL | Read Committed |
  | Catalogo | BASE | MongoDB | Eventual |
  | Search | BASE | Elasticsearch | NRT |
  | Analytics | BASE | ClickHouse | Eventual |

Flujo de orden (Saga):
  1. Reservar inventario (ACID)
     BEGIN; UPDATE inventory SET stock = stock - qty WHERE sku = ?;
     INSERT INTO reservations ...; COMMIT;
  2. Procesar pago (ACID)
     BEGIN; INSERT INTO payments ...; UPDATE accounts ...; COMMIT;
  3. Crear orden (ACID)
     INSERT INTO orders ...; COMMIT;
  4. Publicar evento (BASE, Kafka)
     Producir OrderCreated a Kafka

  Compensacion si falla:
  - Pago falla: liberar inventario
  - Orden falla: reembolsar pago, liberar inventario

  TypeScript:
    class CheckoutSaga {
      async execute(cart, paymentMethod) {
        const reservation = await this.reserveInventory(cart.items);
        try {
          const payment = await this.processPayment(cart.total, paymentMethod);
          const order = await this.createOrder(cart, payment.id);
          await this.eventBus.publish(new OrderCreated(order));
          return order;
        } catch (error) {
          await this.releaseInventory(reservation);
          await this.refundPayment(payment?.id);
          throw error;
        }
      }
    }

Patron Outbox (garantiza publicacion):
  BEGIN; INSERT INTO orders ...;
  INSERT INTO outbox (event_type, payload) VALUES ("OrderCreated", ...);
  COMMIT;
  -- Proceso separado lee outbox y publica a Kafka

Sincronizacion:
  Catalogo -> ES: MongoDB Change Stream, latencia 1-5s
  Ordenes -> Analytics: Kafka consumer -> ClickHouse, 30-60s

Manejo de inconsistencias:
  | Escenario | Mitigacion |
  |-----------|------------|
  | Catalogo desactualizado | TTL cache + refresh |
  | Review no indexada | Reindex programado |
  | Analytics atrasado | Aceptar NRT |
  | Saga no compensa | Alerta + reconciliacion |

Monitoreo:
  - Kafka lag: < 60s (alerta > 300s)
  - Outbox sin procesar: > 100 (alerta)
  - Reconciliacion: job diario cross-store

Lecciones:
  - ACID para dinero, BASE para lo demas
  - Outbox resuelve dual-write
  - Sagas necesitan compensacion idempotente
  - Reconciliacion periodica detecta inconsistencias silenciosas
```

### Que es consistencia ajustable?

Cassandra y DynamoDB permiten ajustar consistencia por operacion. ONE: lee un nodo (rapido). QUORUM: lee mayoria (consistente). ALL: lee todos (max consistencia). Usa QUORAM para operaciones criticas y ONE para cache.




End of document. Review and update quarterly.

## See Also

- [CQRS + Event Sourcing — Combined Guide](/es/guides/cqrs-event-sourcing-combined-guide/)
- [CAP Theorem and Database Trade-offs](/es/guides/cap-theorem-guide/)
- [Complete Guide to RAG in Production](/es/guides/complete-guide-rag-production/)
- [Complete Guide to Vector Databases](/es/guides/complete-guide-vector-databases/)
- [Data Lake vs Data Warehouse — Architecture Guide](/es/guides/data-lake-guide/)




## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de acid y databases para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica acid vs base — modelos de consistencia explicados** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Errores Comunes en Producción

- Tratar la guía como un checklist para completar una vez en lugar de una práctica por evolucionar.
- Adoptar cada recomendación de golpe en lugar de comenzar con un cambio medido.
- Saltar la evaluación de madurez e imponer prácticas avanzadas a un equipo no preparado.
- No actualizar runbooks y expectativas de guardia al introducir nuevas prácticas.
- Ignorar datos reales de incidentes al priorizar qué partes de la guía aplicar primero.
- No asignar un responsable que revise decisiones trimestralmente.
- Copiar ejemplos sin adaptarlos a las herramientas y restricciones reales del equipo.
- Olvidar medir resultados antes de agregar la siguiente mejora.
