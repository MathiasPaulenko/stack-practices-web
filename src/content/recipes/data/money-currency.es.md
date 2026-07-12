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
  - parsing
  - json
  - csv
  - processing
relatedResources:
  - /recipes/date-formatting
  - /recipes/caching
  - /recipes/parse-json
  - /recipes/regular-expressions
  - /recipes/sort-array
  - /recipes/deep-clone-javascript
  - /recipes/flatten-unflatten-objects
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

Los cálculos financieros exigen precisión. Los números de punto flotante (`float`, `double`) no pueden representar con exactitud la mayoría de las fracciones decimales, provocando errores de redondeo que se acumulan en sistemas de facturación, cobro y trading. A continuacion se cubre la representación de dinero como valores decimales exactos, formateo con símbolos de moneda según locale, aritmética sin pérdida de precisión y conversiones de tipo de cambio en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Construyas carritos de e-commerce, flujos de checkout o sistemas de facturación. Consulta [Input Validation](/recipes/api/input-validation) para sanitizar datos de ordenes.
- Agregues transacciones financieras donde la precisión al nivel del centavo importa
- Muestres precios en múltiples monedas con reglas de redondeo correctas
- Conviertas entre monedas usando [APIs de tasas de cambio externas](/recipes/api/call-rest-api)

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

## Lo que funciona

1. **Almacena cantidades en unidades menores** (centavos) o tipos decimales exactos; nunca almacenes dinero como punto flotante en bases de datos.
2. **Redondea en el límite correcto** — calcula líneas de ítem con precisión completa, redondea por línea, luego suma los valores redondeados para el total.
3. **Separa dinero de visualización** — mantén `Decimal` / `BigDecimal` / centavos internamente y formatea solo en la capa UI/API.
4. **Usa redondeo bancario (HALF_UP)** para la mayoría de monedas; algunas jurisdicciones requieren HALF_EVEN — conoce tu dominio.
5. **[Cachea tasas de cambio](/recipes/data/caching)** con TTL y timestamp; siempre convierte usando la tasa que se aplicaba al momento de la transacción.

## Errores Comunes

1. Usar `float` o `double` para precios, provocando errores tipo `0.30000000000000004`.
2. Redondear solo al final de una larga cadena de cálculos, propagando errores sub-centavo.
3. Almacenar dinero como strings y parsear con comas/puntos dependientes de locale, causando bugs regionales.
4. Sumar diferentes monedas directamente sin conversión, produciendo totales sin sentido.
5. Ignorar subunidades de moneda — algunas monedas (JPY, KRW) no tienen decimales; otras (BHD, IQD) tienen 3.

## Cuando No Usar Este Enfoque

- **Formatting locale-aware en sistemas distribuidos**: si los servidores spanean multiples timezones, formatear fechas localmente por-servidor causa inconsistencias. Siempre formatea en UTC en el servidor y convierte en la capa de presentacion usando el locale del usuario
- **Llamadas de formatting de alta frecuencia**: si el formatting se llama millones de veces por segundo, el overhead de strftime o Intl.DateTimeFormat se vuelve significativo. Pre-formatea valores estaticos y cachea el resultado
- **Calculos financieros que requieren precision exacta**: la aritmetica de floating-point causa errores de redondeo en calculos de dinero (0.1 + 0.2 != 0.3). Usa decimal.Decimal (Python), BigDecimal (Java) o representacion en centavos enteros
- **URL encoding de strings ya encodeados**: double-encoding %20 produce %2520. Chequea si el string ya esta encodeado antes de aplicar encodeURIComponent. Usa decodeURIComponent primero para normalizar
- **Generacion de UUID en paths performance-critical**: la generacion de UUIDv4 usa CSPRNG que es 10-100x mas lento que IDs secuenciales. Para sistemas internos, usa UUIDv7 (time-ordered) o Snowflake IDs para mejor localidad de indice en base de datos
- **Parsing de argumentos CLI para scripts simples**: si un script necesita 2-3 flags, rgparse o commander es excesivo. Usa sys.argv o argumentos posicionales directamente

## Benchmarks de Rendimiento

- **Formatting de fechas**: strftime en Python formatea 1M fechas en 200-500ms. Intl.DateTimeFormat en JavaScript formatea 1M fechas en 100-300ms. Formatting ISO 8601 (	oISOString) es 2-5x mas rapido que formatting locale-aware
- **URL encoding**: encodeURIComponent en JavaScript encodea 1M strings en 50-200ms. urllib.parse.quote de Python encodea 1M strings en 100-400ms. Tablas de encoding pre-computadas pueden lograr 10-50ms para el mismo volumen
- **Generacion de UUID**: uuid.uuid4() en Python genera 1M UUIDs en 500ms-2s. crypto.randomUUID() en Node.js genera 1M UUIDs en 100-300ms. La generacion de UUIDv7 es similar a v4 pero produce IDs time-ordered
- **Truncacion de texto**: slicear 1M strings a 100 chars toma 50-150ms en Python y 20-80ms en JavaScript. Truncacion Unicode-aware (sin romper caracteres multi-byte) agrega 2-3x de overhead
- **Formatting de phone numbers**: la libreria phonenumbers en Python formatea 100K phone numbers en 500ms-2s. Google's libphonenumber (C++) formatea el mismo volumen en 50-100ms
- **Generacion de QR codes**: la libreria qrcode en Python genera un QR code de 100x100 en 5-20ms. qrcode-terminal es mas rapido pero produce output de menor calidad. Generacion batch de 10,000 QR codes toma 50-200ms

## Estrategia de Testing

- **Test de manejo de timezones**: verifica que el formatting de fechas produzca output correcto a traves de timezones (UTC, PST, JST, AEDT). Testea transiciones DST (spring forward, fall back) y cambios historicos de timezone
- **Test con input invalido**: verifica que phone numbers invalidos, URLs malformadas y fechas out-of-range sean rechazadas con errores claros. Testea con strings vacios, null y undefined
- **Test de formatting locale-specific**: verifica que el formatting de currency use el simbolo correcto, separador decimal y agrupamiento para cada locale (,234.56 vs 1.234,56 EUR)
- **Test de edge cases Unicode**: verifica que la truncacion no rompa caracteres multi-byte (emoji, CJK). Testea URL encoding con paths Unicode (IRI). Testea formatting de fechas con calendarios no-Gregorianos
- **Test de unicidad de UUID**: genera 10M UUIDs y verifica que no haya colisiones. Usa un set o bloom filter para deteccion de colisiones. UUIDv4 tiene 50% de probabilidad de colision despues de 2.7x10^36 IDs
- **Test de edge cases de argumentos CLI**: testea con argumentos requeridos faltantes, flags duplicados, numeros negativos como valores y separador --. Verifica que el texto de ayuda sea preciso y completo

## Estimacion de Costos

- **TamaÃ±o de bundle de libreria de fechas**: moment.js es 67KB minificado. date-fns con tree-shaking es 5-15KB. luxon es 25KB. Intl.DateTimeFormat nativo es 0KB (built into the runtime). Elije APIs nativas cuando sea posible
- **Validacion de phone numbers**: libphonenumber-js es 45KB minificado. La validacion server-side con la libreria de Google es gratis pero requiere una dependencia C++. Para validacion solo web, usa un regex ligero para checking de formato
- **Costo de generacion de QR codes**: generar 1M QR codes server-side cuesta .50-2.00 en compute. Pre-generar y almacenar como PNG cuesta -20/mes en almacenamiento pero elimina el compute por-request
- **Infraestructura de generacion de UUID**: UUIDv4 no requiere coordinacion pero causa patrones de I/O random en bases de datos. UUIDv7 o Snowflake IDs mejoran el throughput de escritura 2-5x clusterizando inserts. El costo es una dependencia de time-source
- **Distribucion de CLI tools**: empaquetar un CLI tool con pip o 
pm es gratis. Distribuir como binario standalone (PyInstaller, pkg) agrega 10-50MB pero elimina la dependencia de runtime. Elije basado en la audiencia de usuarios

## Monitoring y Observabilidad

- **Tasa de errores de formatting**: trackea el porcentaje de operaciones de formatting que fallan. Tasas altas indican datos de input malos o issues de configuracion de locale
- **Latencia de formatting**: monitorea el tiempo gastado en formatting de fechas/phone/URL. Si el formatting excede 5% del tiempo de request, cachea valores formateados o cambia a librerias mas rapidas
- **Drift de configuracion de timezone**: loguea el timezone del server al startup. Alerta si cambia de UTC. Timezones de server no-UTC son una fuente comun de bugs de fecha en sistemas distribuidos
- **Rate de generacion de UUID**: monitorea el rate de generacion de UUID. Un spike repentino puede indicar un bug causando creacion excesiva de IDs o un retry loop
- **Patrones de uso de CLI**: loguea que flags de CLI se usan mas frecuentemente. Esto informa prioridades de documentacion y decisiones de deprecation

## Deployment Checklist

- [ ] Setear el timezone del server a UTC: variable de entorno TZ=UTC. Nunca confies en el timezone default del sistema en codigo de produccion
- [ ] Configurar defaults de locale: setea variables de entorno LANG y LC_ALL. Usa Intl.DateTimeFormat con locale explicito en JavaScript
- [ ] Setear longitud maxima de input: rechaza strings mas largos que el maximo configurado antes de formatear. Previene agotamiento de memoria por inputs oversized
- [ ] Configurar nivel de correccion de errores de QR code: usa nivel M (15% recovery) para uso general, nivel H (30% recovery) para entornos industriales. Niveles mas altos producen codes mas densos
- [ ] Setear limites de argumentos CLI: limita el numero de argumentos y su tamaÃ±o total. getopt y rgparse tienen limites built-in, pero parsers custom necesitan limites explicitos
- [ ] Pinear versiones de librerias: las librerias de fechas y phone cambian frecuentemente. Pinea versiones para evitar breaking changes de updates de timezone database o cambios de formato de locale

## Consideraciones de Seguridad

- **Bypass de control de acceso basado en timezone**: si los checks de control de acceso usan hora local, un cambio de timezone del server puede bypassar restricciones basadas en tiempo. Siempre usa UTC para comparaciones de tiempo security-relevant
- **Bypass de URL encoding**: double-encoding o mixed encoding puede bypassar filtros de seguridad basados en URL. Normaliza URLs con decodeURIComponent y luego re-encodea antes de checks de seguridad
- **Spoofing de phone numbers**: el caller ID spoofing significa que la validacion de phone number no verifica identidad. No uses validacion de formato de phone number como unico factor de autenticacion
- **Phishing via QR codes**: los QR codes pueden encodear URLs maliciosas. Si generas QR codes desde input del usuario, valida la URL target contra una blocklist antes de encodear
- **Predictibilidad de UUID**: UUIDv1 contiene la MAC address y timestamp, lo que leakea info de hardware y permite prediccion. Usa UUIDv4 (random) o UUIDv7 (time-ordered sin MAC) para contextos security-sensitive
- **Inyeccion via parsing de fechas**: algunos parsers de fechas ejecutan codigo arbitrario via format strings (ej. strftime con format controlado por el usuario). Nunca pases input del usuario directamente como format string
- **Bypass de XSS via truncacion**: truncar HTML a un numero fijo de caracteres puede partir tags y crear HTML invalido que bypassa filtros XSS. Trunca en boundaries de tags o usa un parser HTML apropiado
- **Inyeccion de argumentos CLI**: si los argumentos CLI se pasan a subprocess sin escaping apropiado, un atacante puede inyectar shell commands. Usa subprocess.run(args_list) en lugar de shell=True
- **Perdida de precision en formatting de dinero**: convertir entre currencies usando floating-point puede perder precision. Usa Decimal con modos de redondeo explicitos. Loguea todas las conversiones de currency para audit
- **Leak de metadata de phone numbers**: libphonenumber puede revelar el carrier y region de un phone number. No expongas esta metadata a clientes no confiables
- **Inyeccion de contenido en QR codes**: si los QR codes se renderizan desde URLs suministradas por el usuario sin validacion, un atacante puede encodear URIs javascript: o data:. Valida el scheme de la URL antes de la generacion de QR
- **DoS via format strings de fecha**: algunas librerias de formatting de fechas soportan format strings complejas que pueden causar uso excesivo de CPU. Limita la longitud y complejidad del format string en APIs user-facing
## Variantes y Alternativas

- **Intl nativo vs librerias**: Intl.DateTimeFormat, Intl.NumberFormat e Intl.ListFormat estan built-in en runtimes JS modernos. Son 0KB y 2-5x mas rapidos que moment.js o date-fns. Usa librerias solo para math de timezone complejo
- **UUIDv4 vs UUIDv7 vs ULID vs Snowflake**: UUIDv4 es random (bueno para seguridad, malo para indices DB). UUIDv7 es time-ordered (bueno para localidad DB). ULID es lexicograficamente sortable. Snowflake es distribuido y requiere coordinacion
- **Decimal vs centavos enteros vs floating-point**: Decimal es exacto pero lento. Centavos enteros (guardar 199 en lugar de 1.99) es exacto y rapido pero requiere conversion en boundaries. Floating-point es rapido pero con perdida (nunca uses para dinero)
- **Template literals vs concatenacion de strings**: template literals (` Hola  `) son mas legibles y ligeramente mas rapidos en V8. Concatenacion ("Hola " + name) es compatible con runtimes antiguos. Elije basado en el entorno target
- **API URL nativa vs parsing con regex**: 
ew URL(string) parsea URLs correctamente incluyendo edge cases (IPv6, userinfo, caracteres encodeados). Parsing basado en regex pierde edge cases. Siempre usa la API URL nativa para manipulacion de URLs
- **Comparacion de frameworks CLI**: rgparse (Python, stdlib, verbose), click (Python, decorators, clean), 	yper (Python, type hints, modern), commander (Node.js, widely used), yargs (Node.js, feature-rich). Elije basado en complejidad

## Pitfalls Comunes en Produccion

- **Offset de timezone vs nombre de timezone**: +02:00 es un offset que cambia con DST. Europe/Paris es un nombre de timezone que maneja DST automaticamente. Siempre almacena nombres de timezone, no offsets, para eventos recurrentes
- **Confusion de codigos de locale**: en-US vs en_US vs en â€” diferentes librerias esperan diferentes formatos. ICU usa en-US, POSIX usa en_US. Normaliza codigos de locale en el boundary de la aplicacion
- **Modos de redondeo de currency**: ROUND_HALF_UP (banker's rounding) difiere de ROUND_HALF_EVEN (default Python). Sistemas financieros requieren modos de redondeo especificos. Documenta y testea el modo de redondeo explicitamente
- **Colision de UUID en la practica**: la probabilidad de colision de UUIDv4 es despreciable (1 en 2.7x10^36 para 50% de probabilidad). Pero la colision de UUIDv1 puede ocurrir si la MAC address se reusa o el reloj se setea hacia atras. Usa v4 o v7 para seguridad
- **URL encoding de caracteres especiales**: !, ', (, ) son tecnicamente seguros en URLs pero algunos servidores los rechazan. encodeURIComponent los encodea; encodeURI no. Usa encodeURIComponent para valores de query parameters
- **Truncacion con HTML**: truncar HTML por conteo de caracteres puede romper tags. Usa un parser HTML apropiado para truncar en boundaries de tags. Alternativamente, strippa tags HTML antes de truncar para previews de plain-text
## Patrones de Integracion

- **Pipeline de internacionalizacion (i18n)**: extrae strings user-facing -> formatea con funciones locale-specific -> renderiza en UI. Usa ICU MessageFormat para pluralizacion y genero. Almacena traducciones en archivos JSON o XLIFF. Carga traducciones lazymente por locale
- **Pipeline de fecha/tiempo**: parsea fecha de input (ISO 8601) -> convierte a UTC -> almacena como string ISO o timestamp -> formatea para display usando locale del usuario. Nunca almacenes strings de fecha localizados en bases de datos. Siempre convierte a UTC antes del almacenamiento
- **Pipeline de dinero**: parsea monto (string a Decimal) -> valida codigo de currency (ISO 4217) -> convierte currency si es necesario (usando exchange rates diarios) -> formatea para display usando locale. Almacena como centavos enteros o Decimal, nunca floating-point
- **Pipeline de building de URL**: valida URL base -> appendea path segments (URL-encoded) -> appendea query parameters (URL-encoded) -> appendea fragment. Usa APIs URL y URLSearchParams. Nunca construyas URLs con concatenacion de strings
- **Pipeline de generacion de UUID**: genera UUID -> valida formato -> almacena como string (no tipo UUID para portabilidad) -> usa como primary key. Para sistemas distribuidos, usa UUIDv7 para IDs time-ordered que funcionan bien con indices B-tree
- **Integracion de CLI con archivos de config**: flags de CLI overriden valores de config file, que overriden variables de entorno, que overriden defaults. Esta jerarquia es estandar en apps 12-factor. Usa python-dotenv o dotenv para carga de variables de entorno

## Manejo de Errores y Recuperacion

- **Fallback graceful de locale**: si una traduccion falta para r-CA, falla a r, luego en. Loguea traducciones faltantes para agregarlas despues. Nunca muestres keys de traduccion raw a los usuarios
- **Cadena de fallback de parsing de fechas**: prueba ISO 8601 primero, luego formatos locale-specific, luego formatos comunes (MM/DD/YYYY, DD/MM/YYYY). Si todos fallan, retorna null y deja que el caller decida. Nunca adivines el formato silenciosamente
- **Manejo de errores de conversion de currency**: si la API de exchange rate esta caida, usa el ultimo rate cacheado. Loguea un warning. Si no hay rate cacheado, rechaza la conversion con un error claro. Nunca uses rates stale mas antiguos que 24 horas sin warning
- **Errores de normalizacion de URL**: si el parsing de URL falla, loguea la URL original y el error. No intentes fixear la URL automaticamente â€” URLs malformadas pueden ser intencionales (ej. para testing). Retorna un error claro al caller
- **Manejo de colisiones de UUID**: si ocurre una colision de UUID (extremadamente raro con v4/v7), regenera con un nuevo componente random. Loguea la colision para investigacion. Colisiones de UUIDv1 indican un problema de clock o MAC address
- **Recuperacion de errores de argumentos CLI**: si un argumento requerido falta, imprime el texto de ayuda y sale con codigo 2. Si un argumento tiene un valor invalido, imprime el error, el formato esperado, y sale con codigo 2. Nunca procedas con argumentos invalidos
## Preguntas Frecuentes

### ¿Por qué no puedo usar `float` o `double` para dinero?

El punto flotante binario representa fracciones como sumas de potencias inversas de 2. Decimales como `0.1` son secuencias infinitas en binario, así que se redondean. Estos errores diminutos se acumulan en multiplicación y división, provocando facturas desviadas por centavos o más.

### ¿Cómo debería almacenar dinero en una base de datos?

Usa `DECIMAL(19,4)` (o `NUMERIC` en PostgreSQL) para preservar 4 decimales de precisión. Esto maneja cálculos sub-centavo (tasas de impuesto, tasas de cambio) manteniendo exacto el valor final de 2 decimales. Evita columnas `FLOAT`, `DOUBLE` y `REAL`.

### ¿Qué modo de redondeo debería usar?

`HALF_UP` (redondear 0.5 lejos de cero) es estándar para la mayoría de aplicaciones comerciales. `HALF_EVEN` (redondeo bancario) se usa en algunos estándares financieros (IEEE 754, contabilidad). Siempre redondea consistentemente dentro de tu dominio y documenta el modo para auditores.