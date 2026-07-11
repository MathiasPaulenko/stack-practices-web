---
contentType: patterns
slug: value-object-pattern
title: "Patrón Value Object"
description: "Modela conceptos de dominio por valor en lugar de identidad. Un objeto inmutable definido por sus atributos, no por un ID único."
metaDescription: "Aprende el Patrón Value Object para objetos de dominio inmutables definidos por sus atributos. Ejemplos en Python, Java y JavaScript."
difficulty: intermediate
topics:
  - design
tags:
  - value-object
  - pattern
  - design-pattern
  - ddd
  - immutability
  - domain-modeling
relatedResources:
  - /patterns/design/entity-component-system-pattern
  - /patterns/design/aggregate-pattern
  - /patterns/design/solid-principles-typescript
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón Value Object para objetos de dominio inmutables definidos por sus atributos. Ejemplos en Python, Java y JavaScript."
  keywords:
    - value object
    - design pattern
    - ddd
    - immutability
    - domain modeling
---

# Patrón Value Object

## Descripción General

Un Value Object es un objeto inmutable definido enteramente por sus atributos, no por una identidad única. Dos value objects con los mismos valores se consideran iguales independientemente de si son la misma instancia. Dinero, fechas, coordenadas y direcciones de email son ejemplos clásicos.

Este patrón es fundamental en Domain-Driven Design (DDD). Encapsula validación, formateo y lógica de comparación en un wrapper type-safe, previniendo la obsesión por primitivos (representar conceptos de dominio como strings o números).

## Cuándo Usar

Usa el Patrón Value Object cuando:
- Un concepto no tiene identidad conceptual (ej., $20 es $20 independientemente del billete)
- Necesitas lógica de validación al momento de construcción (ej., formato de email, montos positivos)
- La inmutabilidad previene bugs de mutación accidental en código concurrente
- Quieres comportamiento rico de comparación y aritmética para primitivos

## Cuándo Evitar

- El concepto tiene un ciclo de vida y cambia de estado con el tiempo (usa una Entity en su lugar)
- Necesitas trackear versiones históricas del mismo objeto
- El performance de crear muchos objetos pequeños es inaceptable

## Solución

### Python (Dataclass con Frozen)

```python
from dataclasses import dataclass
import re

@dataclass(frozen=True)
class EmailAddress:
    value: str

    def __post_init__(self):
        if not re.match(r"^[^@]+@[^@]+\.[^@]+$", self.value):
            raise ValueError(f"Email inválido: {self.value}")

    def domain(self) -> str:
        return self.value.split("@")[1]

    def local_part(self) -> str:
        return self.value.split("@")[0]


@dataclass(frozen=True)
class Money:
    amount: int
    currency: str

    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("El monto no puede ser negativo")

    def add(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError("Divisa no coincide")
        return Money(self.amount + other.amount, self.currency)

    def __str__(self):
        return f"{self.currency} {self.amount / 100:.2f}"


# Uso
email = EmailAddress("alice@example.com")
price = Money(1999, "USD")
discount = Money(200, "USD")
total = price.add(discount)
print(total)  # USD 21.99
```

### Java (Record)

```java
public record EmailAddress(String value) {
    public EmailAddress {
        if (!value.matches("^[^@]+@[^@]+\\.[^@]+$")) {
            throw new IllegalArgumentException("Email inválido: " + value);
        }
    }

    public String domain() {
        return value.substring(value.indexOf('@') + 1);
    }
}

public record Money(long amount, String currency) {
    public Money {
        if (amount < 0) throw new IllegalArgumentException("Monto negativo");
    }

    public Money add(Money other) {
        if (!currency.equals(other.currency)) {
            throw new IllegalArgumentException("Divisa no coincide");
        }
        return new Money(amount + other.amount, currency);
    }

    @Override
    public String toString() {
        return String.format("%s %.2f", currency, amount / 100.0);
    }
}

// Uso
EmailAddress email = new EmailAddress("alice@example.com");
Money price = new Money(1999, "USD");
Money total = price.add(new Money(200, "USD"));
```

### JavaScript

```javascript
class EmailAddress {
  constructor(value) {
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(value)) {
      throw new Error(`Email inválido: ${value}`);
    }
    this._value = value;
    Object.freeze(this);
  }

  get value() { return this._value; }

  domain() { return this._value.split('@')[1]; }
  localPart() { return this._value.split('@')[0]; }

  equals(other) {
    return other instanceof EmailAddress && this._value === other._value;
  }
}

class Money {
  constructor(amount, currency) {
    if (amount < 0) throw new Error('Monto negativo');
    this._amount = amount;
    this._currency = currency;
    Object.freeze(this);
  }

  get amount() { return this._amount; }
  get currency() { return this._currency; }

  add(other) {
    if (this._currency !== other._currency) {
      throw new Error('Divisa no coincide');
    }
    return new Money(this._amount + other._amount, this._currency);
  }

  toString() {
    return `${this._currency} ${(this._amount / 100).toFixed(2)}`;
  }
}

// Uso
const email = new EmailAddress('alice@example.com');
const price = new Money(1999, 'USD');
console.log(price.add(new Money(200, 'USD')).toString());
```

## Explicación

Los Value Objects se caracterizan por:

- **Inmutabilidad**: Una vez creados, nunca cambian. Las operaciones retornan nuevas instancias.
- **Igualdad sin identidad**: Dos value objects son iguales si sus atributos coinciden.
- **Auto-validación**: Estados inválidos son imposibles después de la construcción.
- **Comportamiento rico**: Formateo, aritmética y lógica de comparación vive con los datos.

## Variantes

| Variante | Caso de Uso |
|----------|-------------|
| **Composite Value Object** | Dirección con calle, ciudad, zip como una unidad |
| **Range Value Object** | DateRange, TemperatureRange con validación |
| **Calculated Value Object** | TaxAmount calculado desde Money y Rate |

## Lo que funciona

- **Hazlos inmutables.** Sin setters, campos mutables ni actualizaciones in-place. Retorna nuevas instancias para transformaciones.
- **Valida al construir.** Un `EmailAddress` inválido debería ser imposible de crear. Falla rápido con errores claros.
- **Implementa `equals` y `hashCode`** correctamente (o usa records/dataclasses) para que las colecciones se comporten correctamente.
- **Manténlos pequeños.** Un value object con 15 campos es probablemente una Entity disfrazada.
- **Úsalos en APIs.** Prefiere `Money` sobre `int` en firmas de métodos para type safety y claridad.

## Errores Comunes

- **Agregar un ID** convierte un value object en una entity. Si trackeas "el email que Alice cambió el martes pasado," es una entity.
- **Mutar value objects** después de creación rompe los contratos de igualdad y causa bugs en colecciones basadas en hash.
- **Usar igualdad por referencia** (`==` en Java, `is` en Python) en lugar de igualdad por valor. Siempre sobrescribe `equals`/`__eq__`.
- **Over-engineering** con value objects para cada primitivo. No cada string necesita ser un objeto `FirstName`.
- **Faltar `hashCode`/`__hash__`** al implementar igualdad personalizada hace que búsquedas en `HashMap`/`set` fallen silenciosamente.

## Ejemplos del Mundo Real

### Java Money and Currency

JSR-354 `MonetaryAmount` es un value object estandarizado para dinero, manejando divisas, redondeo y aritmética correctamente.

### Python datetime

`datetime.date(2024, 6, 25)` es un value object. Dos fechas con el mismo año, mes y día son iguales independientemente de la identidad de instancia.

### JavaScript Temporal API

El próximo `Temporal.PlainDate` reemplazará a `Date` como un value object inmutable para fechas de calendario sin confusión de time zone.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre Value Object y Entity?**
A: Una Entity se define por identidad (un usuario con ID 42). Un Value Object se define por atributos ($20 USD). Las Entities cambian; los value objects se reemplazan.

**Q: Los value objects pueden contener entities?**
A: No, pero las entities pueden contener value objects. Una `User` entity puede tener un `Address` value object.

**Q: Debería almacenar value objects en una base de datos?**
A: Sí, como columnas embebidas o campos JSON. No necesitan su propia tabla a menos que el ORM lo requiera.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.


## Temas Avanzados

### Escenario: Value Objects para Dinero y Coordenadas

```typescript
// Value Object: inmutable, sin identidad, igualdad por valor
class Money {
  constructor(readonly amount: number, readonly currency: string) {
    if (amount < 0) throw new Error("Amount cannot be negative");
    if (!currency || currency.length !== 3) throw new Error("Invalid currency code");
    Object.freeze(this); // Inmutable
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) throw new Error("Currency mismatch");
    return new Money(this.amount + other.amount, this.currency);
  }
  subtract(other: Money): Money {
    if (this.currency !== other.currency) throw new Error("Currency mismatch");
    return new Money(this.amount - other.amount, this.currency);
  }
  multiply(factor: number): Money {
    return new Money(Math.round(this.amount * factor * 100) / 100, this.currency);
  }
  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
  toString(): string {
    return `${this.amount.toFixed(2)} ${this.currency}`;
  }
}

// Value Object: Coordenadas geograficas
class GeoCoordinate {
  constructor(readonly lat: number, readonly lng: number) {
    if (lat < -90 || lat > 90) throw new Error("Invalid latitude");
    if (lng < -180 || lng > 180) throw new Error("Invalid longitude");
    Object.freeze(this);
  }
  distanceTo(other: GeoCoordinate): number {
    const R = 6371; // km
    const dLat = (other.lat - this.lat) * Math.PI / 180;
    const dLng = (other.lng - this.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 +
      Math.cos(this.lat * Math.PI / 180) * Math.cos(other.lat * Math.PI / 180) *
      Math.sin(dLng/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  equals(other: GeoCoordinate): boolean {
    return this.lat === other.lat && this.lng === other.lng;
  }
}

// Uso
const price = new Money(99.99, "USD");
const tax = new Money(8.99, "USD");
const total = price.add(tax);
console.log(total.toString()); // "108.98 USD"
console.log(price.equals(new Money(99.99, "USD"))); // true
console.log(price.equals(total)); // false

const nyc = new GeoCoordinate(40.7128, -74.0060);
const la = new GeoCoordinate(34.0522, -118.2437);
console.log(`${nyc.distanceTo(la).toFixed(0)} km`); // "3936 km"
```

Lecciones:
  - Value Object: inmutable, sin identidad, igualdad por valor
  - Money: no usar float para dinero. Usar cents (integer) o BigDecimal
  - Object.freeze() garantiza inmutabilidad en runtime
  - Operaciones retornan nuevas instancias, no mutan
  - equals() compara por valor, no por referencia
  - Validacion en constructor: un Value Object invalido no existe
```

### Value Object vs Entity: cual uso?

Usa Value Object cuando la identidad no importa: Money, Date, Coordinate, Address. Dos Money de 100 USD son intercambiables. Usa Entity cuando la identidad importa: User, Order, Product. Dos Users con el mismo nombre son diferentes personas. Value Objects son inmutables; Entities son mutables. Value Objects se comparan por valor; Entities por id. Prefiere Value Objects cuando sea posible: son mas simples, testeables y no tienen efectos secundarios.
