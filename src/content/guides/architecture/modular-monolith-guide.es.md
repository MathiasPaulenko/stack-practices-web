---
contentType: guides
slug: modular-monolith-guide
title: "Monolito Modular — Una Arquitectura Pragmática"
description: "Guía práctica de Monolitos Modulares: combina la simplicidad de los monolitos con la modularidad de los microservicios mediante bounded contexts y límites estrictos entre módulos."
metaDescription: "Aprende arquitectura de Monolito Modular con bounded contexts, límites entre módulos y rutas de migración a microservicios. Guía práctica para equipos en crecimiento."
difficulty: intermediate
topics:
  - architecture
  - design
tags:
  - modular-monolith
  - monolith
  - microservices
  - bounded-contexts
  - module-boundaries
  - domain-driven-design
  - guide
relatedResources:
  - /guides/microservices-architecture-guide
  - /guides/monolith-to-microservices-migration-guide
  - /guides/hexagonal-architecture-guide
  - /guides/clean-architecture-guide
  - /patterns/design/anti-corruption-layer-pattern
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Aprende arquitectura de Monolito Modular con bounded contexts, límites entre módulos y rutas de migración a microservicios. Guía práctica para equipos en crecimiento."
  keywords:
    - monolito-modular
    - monolito
    - microservicios
    - bounded-contexts
    - limites-modulos
    - domain-driven-design
    - guía
---

## Overview

Un Monolito Modular es una arquitectura de software que mantiene la simplicidad de despliegue de un monolito mientras impone los límites modulares de los microservicios. En lugar de desplegar muchos servicios pequeños, construyes una única unidad desplegable compuesta por módulos bien definidos y débilmente acoplados. Cada módulo posee su dominio, datos e interfaz pública. La comunicación entre módulos ocurre a través de APIs explícitas, no mediante tablas de base de datos compartidas o llamadas directas a métodos.

## When to Use

- Tu equipo no está listo para la complejidad operacional de los microservicios
- Necesitas despliegues rápidos y debugging simple pero quieres límites claros
- Estás migrando desde un big ball of mud y necesitas un punto intermedio
- Tu dominio tiene límites naturales (bounded contexts) pero no necesita escalado independiente
- Quieres posponer la decisión de dividir en microservicios hasta tener más información

## When NOT to Use

- Diferentes módulos necesitan escalar independientemente (CPU, memoria o por equipo)
- Los equipos deben desplegar en diferentes calendarios sin coordinación
- La diversidad tecnológica por módulo es un requisito duro
- La organización ya tiene infraestructura madura de microservicios

## Estructura de Módulos

```
├── src/
│   ├── modules/
│   │   ├── catalog/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   └── api/
│   │   ├── inventory/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   └── api/
│   │   └── orders/
│   │       ├── domain/
│   │       ├── application/
│   │       ├── infrastructure/
│   │       └── api/
│   └── shared/
│       └── kernel/
```

## Forzando Límites

### Límites en Tiempo de Compilación

Usa tu sistema de build para prevenir imports entre módulos:

```gradle
// catalog/build.gradle
dependencies {
    implementation project(':shared:kernel')
    // NO dependencies on inventory or orders
}

// orders/build.gradle
dependencies {
    implementation project(':shared:kernel')
    implementation project(':catalog')   // Solo si absolutamente necesario
    implementation project(':inventory')
}
```

### Límites de Base de Datos

Cada módulo posee su esquema. Sin foreign keys entre módulos.

```sql
-- esquema catalog
CREATE TABLE catalog.products (
    id UUID PRIMARY KEY,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    price_cents INTEGER NOT NULL
);

-- esquema orders
CREATE TABLE orders.order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders.orders(id),
    product_id UUID NOT NULL,  -- Sin FK a catalog.products
    product_name VARCHAR(255) NOT NULL,  -- Desnormalizado al momento de la orden
    quantity INTEGER NOT NULL,
    unit_price_cents INTEGER NOT NULL
);
```

### Comunicación por API

Los módulos se comunican a través de interfaces explícitas, no acceso directo a la base de datos.

```typescript
// módulo catalog expone esta interfaz
interface CatalogApi {
  getProduct(productId: ProductId): Promise<ProductSnapshot>;
  checkAvailability(productId: ProductId, quantity: number): Promise<boolean>;
}

// módulo orders depende de la interfaz, no de la implementación
class PlaceOrderService {
  constructor(
    private catalog: CatalogApi,
    private inventory: InventoryApi,
    private orderRepository: OrderRepository
  ) {}

  async execute(command: PlaceOrderCommand): Promise<void> {
    const product = await this.catalog.getProduct(command.productId);
    const available = await this.inventory.checkAvailability(command.productId, command.quantity);

    if (!available) throw new OutOfStockError(product.id);

    const order = Order.create({ ...command, productName: product.name, unitPrice: product.price });
    await this.orderRepository.save(order);
  }
}
```

## Shared Kernel

Un módulo compartido mínimo para conceptos transversales que sería excesivo duplicar:

- Tipos base de entidades con IDs y timestamps
- Clases base de eventos de dominio
- Objetos de valor comunes (Money, Email, Address si verdaderamente genéricos)
- Helpers de infraestructura (proveedores de fecha, generadores de ID)

**Mantén el shared kernel pequeño.** Resiste la tentación de mover lógica de negocio allí.

## Estrategia de Testing

| Alcance de Test | Qué Testea | Aislamiento |
|-----------------|------------|-------------|
| Unitario en módulo | Lógica de dominio | Sin dependencias de módulos |
| Integración en módulo | Adaptadores + BD | BD de test por módulo |
| Integración cruzada | Contratos de API | Fakes en memoria de otros módulos |
| Sistema completo | Flujo end-to-end | Aplicación completa |

## Migración a Microservicios

Un monolito modular es el punto de partida ideal para una extracción posterior:

1. **Identifica el módulo** con el límite más claro y mayor necesidad de escala
2. **Extrae su base de datos** en un esquema o servicio separado
3. **Reemplaza llamadas API in-process** por HTTP/gRPC, manteniendo la interfaz estable
4. **Despliega como servicio separado** mientras el monolito sigue corriendo
5. **Repite** para otros módulos

Como los módulos ya se comunican por APIs y poseen sus datos, la extracción es mecánica más que arquitectónica.

## Errores Comunes

- **Tablas de base de datos compartidas** — anula todo el propósito; usa esquema-por-módulo
- **Saltearse la API** — llamar directamente a las clases de dominio de otro módulo
- **Shared kernel inflado** — mover lógica de negocio a módulos compartidos crea acoplamiento
- **Extracción prematura** — dividir a microservicios antes de que los límites estén probados

## FAQ

**¿Un Monolito Modular es solo un monolito bien estructurado?**
Sí, pero la disciplina importa. Sin límites explícitos forzados por el sistema de build, se convierte en un big ball of mud.

**¿En qué se diferencia de una Arquitectura Orientada a Servicios?**
SOA típicamente implica unidades de despliegue separadas. Un monolito modular se despliega como una sola unidad.

**¿Puedo usar diferentes stacks tecnológicos por módulo?**
No. Un monolito modular usa un stack tecnológico. Si necesitas persistencia políglota, estás en territorio de microservicios.
