---
contentType: recipes
slug: money-currency
title: "Manejo de Dinero y Moneda"
description: "Cómo representar, analizar, formatear y calcular valores monetarios con precisión entre monedas."
metaDescription: "Aprende a manejar dinero y moneda en Python, JavaScript y Java. Cubre aritmética decimal, formateo, tasas de cambio y errores comunes con punto flotante."
difficulty: intermediate
topics:
  - data
tags:
  - data
  - currency
relatedResources:
  - /recipes/date-formatting
  - /recipes/caching
  - /recipes/parse-json
  - /recipes/regular-expressions
  - /recipes/sort-array
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a manejar dinero y moneda en Python, JavaScript y Java. Cubre aritmética decimal, formateo, tasas de cambio y errores comunes con punto flotante."
  keywords:
    - dinero
    - moneda
    - decimal
    - finanzas
    - formateo
    - python
    - javascript
    - java
---
## Visión General

Los cálculos financieros exigen precisión. Los números de punto flotante (`float`, `double`) no pueden representar con exactitud la mayoría de las fracciones decimales, provocando errores de redondeo que se acumulan en sistemas de facturación, cobro y trading. Esta receta cubre la representación de dinero como valores decimales exactos, formateo con símbolos de moneda según locale, aritmética sin pérdida de precisión y conversiones de tipo de cambio en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Construyas carritos de e-commerce, flujos de checkout o sistemas de facturación
- Agregues transacciones financieras donde la precisión al nivel del centavo importa
- Muestres precios en múltiples monedas con reglas de redondeo correctas
- Conviertas entre monedas usando APIs de tasas de cambio externas

## Solución

### Python

```python
from decimal import Decimal, ROUND_HALF_UP, getcontext
import locale

# Establecer precisión para todas las operaciones Decimal
getcontext().prec = 28

class Money:
    def __init__(self, amount: str | Decimal, currency: str = "USD"):
        self.amount = Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        self.currency = currency.upper()

    def __add__(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError("No se pueden sumar diferentes monedas sin conversión")
        return Money(self.amount + other.amount, self.currency)

    def __mul__(self, factor: Decimal) -> "Money":
        return Money(self.amount * Decimal(str(factor)), self.currency)

    def format(self, locale_name: str = "en_US") -> str:
        symbol = {"USD": "$", "EUR": "€", "GBP": "£"}.get(self.currency, self.currency)
        return f"{symbol}{self.amount:,}"

    @staticmethod
    def convert(amount: "Money", rate: Decimal, target_currency: str) -> "Money":
        converted = amount.amount * Decimal(str(rate))
        return Money(converted, target_currency)

# Uso
price = Money("19.99")
tax = Money("1.70")
total = price + tax
converted = Money.convert(total, Decimal("0.85"), "EUR")
print(total.format())   # $21.69
print(converted.format())  # €21.69
```

### JavaScript

```javascript
import Dinero from "dinero.js";
import { USD, EUR } from "@dinero.js/currencies";

const price = Dinero({ amount: 1999, currency: USD });
const tax = Dinero({ amount: 170, currency: USD });
const total = price.add(tax);

// Formateo
function formatMoney(dineroObject, locale = "en-US") {
  return dineroObject.toFormattedString(locale, {
    style: "currency",
    currency: dineroObject.toJSON().currency.code,
  });
}

// Conversión (tasa estática para demo)
const rate = { amount: 85, scale: 2 }; // 0.85
const converted = total.convert(EUR, { amount: 8500n, scale: 4 });

console.log(formatMoney(total));      // $21.69
console.log(formatMoney(converted));  // €18.44
```

### Java

```java
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.util.Currency;
import java.util.Locale;

public class Money {
  private final BigDecimal amount;
  private final Currency currency;

  public Money(BigDecimal amount, String currencyCode) {
    this.amount = amount.setScale(2, RoundingMode.HALF_UP);
    this.currency = Currency.getInstance(currencyCode);
  }

  public Money add(Money other) {
    if (!this.currency.equals(other.currency)) {
      throw new IllegalArgumentException("Moneda incompatible");
    }
    return new Money(this.amount.add(other.amount), currency.getCurrencyCode());
  }

  public Money multiply(BigDecimal factor) {
    return new Money(this.amount.multiply(factor), currency.getCurrencyCode());
  }

  public String format(Locale locale) {
    NumberFormat formatter = NumberFormat.getCurrencyInstance(locale);
    formatter.setCurrency(currency);
    return formatter.format(amount);
  }

  public static Money convert(Money source, BigDecimal rate, String targetCurrency) {
    BigDecimal converted = source.amount.multiply(rate);
    return new Money(converted, targetCurrency);
  }

  // Uso
  public static void main(String[] args) {
    Money price = new Money(new BigDecimal("19.99"), "USD");
    Money tax = new Money(new BigDecimal("1.70"), "USD");
    Money total = price.add(tax);
    Money eur = Money.convert(total, new BigDecimal("0.85"), "EUR");

    System.out.println(total.format(Locale.US));   // $21.69
    System.out.println(eur.format(Locale.GERMANY)); // 18,44 €
  }
}
```

## Explicación

- **Nunca uses `float` o `double` para dinero** — el punto flotante binario no puede representar exactamente valores como `0.1`, provocando errores `0.1 + 0.2 != 0.3` que se acumulan en sistemas financieros.
- **Usa unidades enteras menores** (centavos) o decimales de precisión arbitraria (`Decimal`, `BigDecimal`, Dinero.js) para mantener valores exactos durante todo el cálculo.
- **El redondeo** debe ocurrir explícitamente en límites definidos (por línea de ítem, por impuesto y por total), nunca implícitamente por error de punto flotante.
- **Conversión de moneda** debe usar una tasa de cambio obtenida, aplicarla con aritmética exacta y luego redondear a las unidades menores de la moneda destino.
- **Formateo por locale** separa la lógica de visualización del almacenamiento: guarda valores numéricos raw y formatea con `NumberFormat` o bibliotecas ICU para símbolos, separadores y colocación.

## Variantes

| Enfoque | Librería / Tipo | Ideal Para |
|---------|-----------------|------------|
| Centavos enteros | `long` / `bigint` | Trading de alta frecuencia, menor huella de memoria |
| Precisión arbitraria | `Decimal` (Python), `BigDecimal` (Java) | Matemática decimal exacta de propósito general |
| Librería de dinero | Dinero.js, Money PHP, JSR-354 (Java) | APIs ricas de formateo, asignación y comparación |
| Almacenamiento en DB | `DECIMAL(19,4)` (SQL), `NUMERIC` (PostgreSQL) | Valores exactos persistentes con precisión de 4 decimales para tasas |

## Mejores Prácticas

1. **Almacena cantidades en unidades menores** (centavos) o tipos decimales exactos; nunca almacenes dinero como punto flotante en bases de datos.
2. **Redondea en el límite correcto** — calcula líneas de ítem con precisión completa, redondea por línea, luego suma los valores redondeados para el total.
3. **Separa dinero de visualización** — mantén `Decimal` / `BigDecimal` / centavos internamente y formatea solo en la capa UI/API.
4. **Usa redondeo bancario (HALF_UP)** para la mayoría de monedas; algunas jurisdicciones requieren HALF_EVEN — conoce tu dominio.
5. **Cachea tasas de cambio** con TTL y timestamp; siempre convierte usando la tasa vigente al momento de la transacción.

## Errores Comunes

1. Usar `float` o `double` para precios, provocando errores tipo `0.30000000000000004`.
2. Redondear solo al final de una larga cadena de cálculos, propagando errores sub-centavo.
3. Almacenar dinero como strings y parsear con comas/puntos dependientes de locale, causando bugs regionales.
4. Sumar diferentes monedas directamente sin conversión, produciendo totales sin sentido.
5. Ignorar subunidades de moneda — algunas monedas (JPY, KRW) no tienen decimales; otras (BHD, IQD) tienen 3.

## Preguntas Frecuentes

### ¿Por qué no puedo usar `float` o `double` para dinero?

El punto flotante binario representa fracciones como sumas de potencias inversas de 2. Decimales como `0.1` son secuencias infinitas en binario, así que se redondean. Estos errores diminutos se acumulan en multiplicación y división, provocando facturas desviadas por centavos o más.

### ¿Cómo debería almacenar dinero en una base de datos?

Usa `DECIMAL(19,4)` (o `NUMERIC` en PostgreSQL) para preservar 4 decimales de precisión. Esto maneja cálculos sub-centavo (tasas de impuesto, tasas de cambio) manteniendo exacto el valor final de 2 decimales. Evita columnas `FLOAT`, `DOUBLE` y `REAL`.

### ¿Qué modo de redondeo debería usar?

`HALF_UP` (redondear 0.5 lejos de cero) es estándar para la mayoría de aplicaciones comerciales. `HALF_EVEN` (redondeo bancario) se usa en algunos estándares financieros (IEEE 754, contabilidad). Siempre redondea consistentemente dentro de tu dominio y documenta el modo para auditores.
