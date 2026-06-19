---
contentType: recipes
slug: money-currency
title: "Money and Currency Handling"
description: "How to represent, parse, format, and calculate monetary values accurately across currencies."
metaDescription: "Learn to handle money and currency in Python, JavaScript, and Java. Covers decimal arithmetic, formatting, exchange rates, and common pitfalls with floating-point."
difficulty: intermediate
topics:
  - data
tags:
  - data
relatedResources:
  - /recipes/date-formatting
  - /recipes/caching
  - /recipes/parse-json
  - /recipes/regular-expressions
  - /recipes/sort-array
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn to handle money and currency in Python, JavaScript, and Java. Covers decimal arithmetic, formatting, exchange rates, and common pitfalls with floating-point."
  keywords:
    - money
    - currency
    - decimal
    - finance
    - formatting
    - python
    - javascript
    - java
---
## Overview

Financial calculations demand precision. Floating-point numbers (`float`, `double`) cannot accurately represent most decimal fractions, leading to rounding errors that compound in billing, invoicing, and trading systems. This recipe covers representing money as exact decimal values, formatting with locale-aware currency symbols, performing arithmetic without precision loss, and handling exchange rate conversions in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Building e-commerce carts, checkout flows, or invoicing systems
- Aggregating financial transactions where penny-level accuracy matters
- Displaying prices in multiple currencies with correct rounding rules
- Converting between currencies using external exchange rate APIs

## Solution

### Python

```python
from decimal import Decimal, ROUND_HALF_UP, getcontext
import locale

# Set precision for all Decimal operations
getcontext().prec = 28

class Money:
    def __init__(self, amount: str | Decimal, currency: str = "USD"):
        self.amount = Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        self.currency = currency.upper()

    def __add__(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError("Cannot add different currencies without conversion")
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

# Usage
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

// Formatting
function formatMoney(dineroObject, locale = "en-US") {
  return dineroObject.toFormattedString(locale, {
    style: "currency",
    currency: dineroObject.toJSON().currency.code,
  });
}

// Conversion (static rate for demo)
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
      throw new IllegalArgumentException("Currency mismatch");
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

  // Usage
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

## Explanation

- **Never use `float` or `double` for money** — binary floating-point cannot exactly represent values like `0.1`, causing `0.1 + 0.2 != 0.3` errors that accumulate in financial systems.
- **Use integer minor units** (cents) or arbitrary-precision decimals (`Decimal`, `BigDecimal`, Dinero.js) to keep exact values throughout calculations.
- **Rounding** must happen explicitly at defined boundaries (per-line item, per-tax, and per-total), never implicitly through floating-point error.
- **Currency conversion** should use a fetched exchange rate, apply it with exact arithmetic, then round to the target currency's minor units.
- **Locale formatting** separates display logic from storage: store raw numeric values and format with `NumberFormat` or ICU libraries for symbols, separators, and placement.

## Variants

| Approach | Library / Type | Best For |
|----------|---------------|----------|
| Integer cents | `long` / `bigint` | High-frequency trading, smallest memory footprint |
| Arbitrary precision | `Decimal` (Python), `BigDecimal` (Java) | General-purpose exact decimal math |
| Money library | Dinero.js, Money PHP, JSR-354 (Java) | Rich formatting, allocation, and comparison APIs |
| Database storage | `DECIMAL(19,4)` (SQL), `NUMERIC` (PostgreSQL) | Persistent exact values with 4-decimal precision for rates |

## Best Practices

1. **Store amounts in minor units** (cents) or exact decimal types; never store money as floating-point in databases.
2. **Round at the right boundary** — calculate line items with full precision, round per-line, then sum rounded values for the total.
3. **Separate money from display** — keep raw `Decimal` / `BigDecimal` / cents internally and format only at the UI/API layer.
4. **Use banker's rounding (HALF_UP)** for most currencies; some jurisdictions require HALF_EVEN — know your domain.
5. **Cache exchange rates** with TTL and timestamp; always convert using the rate effective at the transaction time.

## Common Mistakes

1. Using `float` or `double` for prices, leading to `0.30000000000000004`-style errors.
2. Rounding only at the very end of a long calculation chain, propagating sub-penny errors.
3. Storing money as strings and parsing with locale-dependent commas/dots, causing regional bugs.
4. Adding different currencies directly without conversion, producing meaningless totals.
5. Ignoring currency subunits — some currencies (JPY, KRW) have no decimal places; others (BHD, IQD) have 3.

## Frequently Asked Questions

### Why can't I just use `float` or `double` for money?

Binary floating-point represents fractions as sums of inverse powers of 2. Decimals like `0.1` are infinite repeating sequences in binary, so they get rounded. These tiny errors accumulate in multiplication and division, causing invoices to be off by pennies or worse.

### How should I store money in a database?

Use `DECIMAL(19,4)` (or `NUMERIC` in PostgreSQL) to preserve 4 decimal places of precision. This handles sub-penny calculations (tax rates, exchange rates) while keeping the final 2-decimal value exact. Avoid `FLOAT`, `DOUBLE`, and `REAL` columns.

### What rounding mode should I use?

`HALF_UP` (round 0.5 away from zero) is standard for most commercial applications. `HALF_EVEN` (banker's rounding) is used in some financial standards (IEEE 754, accounting). Always round consistently within your domain and document the mode for auditors.
