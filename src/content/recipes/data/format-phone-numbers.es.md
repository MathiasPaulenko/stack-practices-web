---
contentType: recipes
slug: format-phone-numbers
title: "Formatear Números de Teléfono"
description: "Cómo formatear y validar números de teléfono en Python, Java y JavaScript."
metaDescription: "Aprende a formatear números de teléfono en Python, Java y JavaScript. Valida números internacionales y aplica formatos regionales con ejemplos de código."
difficulty: beginner
topics:
  - data
tags:
  - phone
  - formatting
  - validation
  - international
  - libphonenumber
  - python
  - javascript
  - java
relatedResources:
  - /recipes/data/truncate-text
  - /recipes/data/validate-json-schema
  - /recipes/data/convert-csv-to-json
  - /recipes/data/convert-json-to-csv
  - /recipes/data/diff-json-objects
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Aprende a formatear números de teléfono en Python, Java y JavaScript. Valida números internacionales y aplica formatos regionales con ejemplos de código."
  keywords:
    - phone
    - formatting
    - validation
    - international
    - libphonenumber
    - python
    - javascript
    - java
---
## Visión General

Los números de teléfono son deceptivamente complejos: códigos de país, códigos de área, extensiones, prefijos móviles vs fijos y reglas de formato regional varían en más de 200 territorios. Almacenar strings crudos lleva a duplicados, entregas de SMS fallidas y links click-to-call rotos. Esta recipe cubre parsing, validación, formateo y extracción con libphonenumber de Google en Python, JavaScript y Java.

## Cuándo Usar

Usa este recurso cuando:
- Aceptes números de teléfono de formularios de registro o checkout de usuarios
- Normalices números internacionales antes de almacenar en una base de datos
- Formatees números para display en formatos regionales o E.164
- Valides números antes de enviar SMS o hacer llamadas de API de voz

## Solución

### Python

```python
# Librería phonenumbers (port de Google libphonenumber)
# pip install phonenumbers
import phonenumbers

number = phonenumbers.parse("+1 415-555-2671", None)
print(phonenumbers.is_valid_number(number))
# Output: True

formatted = phonenumbers.format_number(number, phonenumbers.PhoneNumberFormat.INTERNATIONAL)
print(formatted)
# Output: '+1 415-555-2671'
```

```python
# Normalización a E.164 para almacenamiento
def normalize_phone(raw: str, country_hint: str = "US") -> str | None:
    try:
        parsed = phonenumbers.parse(raw, country_hint)
        if phonenumbers.is_valid_number(parsed):
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except phonenumbers.NumberParseException:
        pass
    return None

print(normalize_phone("(415) 555-2671"))
# Output: '+14155552671'
```

### JavaScript

```javascript
// Port liviano de libphonenumber-js
// npm install libphonenumber-js
import { parsePhoneNumberFromString } from 'libphonenumber-js';

const phone = parsePhoneNumberFromString('+1 415-555-2671');
console.log(phone.isValid());
// Output: true

console.log(phone.formatInternational());
// Output: '+1 415 555 2671'

console.log(phone.formatNational());
// Output: '(415) 555-2671'
```

```javascript
// Formateador as-you-type para campos de input
import { AsYouType } from 'libphonenumber-js';

const formatter = new AsYouType('US');
console.log(formatter.input('4155552671'));
// Output: '(415) 555-2671'
```

### Java

```java
// Google libphonenumber
// Maven: com.googlecode.libphonenumber:libphonenumber
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.google.i18n.phonenumbers.Phonenumber;

public class PhoneFormatter {
    private static final PhoneNumberUtil util = PhoneNumberUtil.getInstance();

    public static String formatE164(String raw, String region) throws Exception {
        Phonenumber.PhoneNumber number = util.parse(raw, region);
        if (!util.isValidNumber(number)) throw new IllegalArgumentException("Invalid number");
        return util.format(number, PhoneNumberUtil.PhoneNumberFormat.E164);
    }
}
```

```java
// Formateo as-you-type
import com.google.i18n.phonenumbers.AsYouTypeFormatter;

public class AsYouTypeFormat {
    public static String formatInput(String input, String region) {
        AsYouTypeFormatter formatter = util.getAsYouTypeFormatter(region);
        StringBuilder result = new StringBuilder();
        for (char c : input.toCharArray()) {
            result = new StringBuilder(formatter.inputDigit(c));
        }
        return result.toString();
    }
}
```

## Explicación

El libphonenumber de Google es el estándar de la industria para manejo de números de teléfono. Mantiene una base de datos de metadata de planes de numeración para cada región, incluyendo qué prefijos son válidos, longitudes mínimas y máximas, y templates de formato nacional. La librería puede distinguir entre número fijo y móvil en la mayoría de países, detectar números posibles (sintácticamente válidos pero no asignados) y formatear en formatos E.164, nacional o RFC3966 (tel: URI).

E.164 (`+14155552671`) es el formato de almacenamiento canónico: es inequívoco, ordena correctamente y funciona con Twilio, AWS SNS y la mayoría de APIs de telecom. Los formatos nacionales (`(415) 555-2671`) son para display. Los formatos internacionales (`+1 415 555 2671`) funcionan para páginas de audiencia mixta. Nunca almacenes input de usuario crudo; siempre parsea y normaliza a E.164.

## Variantes

| Tecnología | Librería | Funcionalidad | Notas |
|------------|----------|---------------|-------|
| Python | `phonenumbers` | Parse, validate, format | Port completo de libphonenumber, incluye geocoder |
| JavaScript | `libphonenumber-js` | Parse, validate, format | Liviano, tree-shakeable, JS moderno |
| JavaScript | `libphonenumber-js` `AsYouType` | Formateo en tiempo real | Ideal para input masking |
| Java | `libphonenumber` | Parse, validate, format | Original de Google, metadata más completa |
| Java | `AsYouTypeFormatter` | Formateo en tiempo real | Formateo carácter por carácter |

## Mejores Prácticas

- **Almacena E.164, muestra nacional**: E.164 remueve ambigüedad; el formato nacional mejora legibilidad
- **Parsea con una región por defecto**: `parse("4155552671", "US")` resuelve correctamente; sin hint, requiere prefijo `+`
- **Valida antes de enviar SMS**: Números inválidos fallan silenciosamente o cuestan dinero; siempre chequea `isValidNumber()`
- **Usa formateo AsYouType para inputs**: El formateo en tiempo real reduce errores de usuario y mejora tasas de completitud
- **Nunca confíes solo en regex**: Las reglas de teléfono cambian; libphonenumber actualiza su metadata regularmente

## Errores Comunes

- **Almacenar strings formateados**: `(415) 555-2671` es inútil para marcar; almacena E.164 y formatea al leer
- **Olvidar el hint de país**: Parsear `020 7946 0958` sin región es ambiguo (UK, Nigeria, etc.)
- **Validar con regex de longitud fija**: Algunos países tienen números de 7 dígitos, otros de 13; la longitud varía por prefijo
- **Exponer input crudo en links tel:**: Un link tel con espacios o paréntesis puede fallar en algunos dispositivos; usa E.164 en `href`
- **Ignorar manejo de extensiones**: `+1 555-1234 ext 42` debe almacenar la extensión separadamente; libphonenumber puede extraerla

## Preguntas Frecuentes

### ¿Cómo manejo números de teléfono sin código de país?

Requiere una selección de país en la UI, o geolocaliza al usuario y usa eso como región por defecto. Si el usuario ingresa un número que empieza con `+`, parsealo como internacional. Si no, parsea con la región seleccionada/por defecto. Nunca adivines basado solo en IP, ya que VPNs y viajeros rompen la suposición.

### ¿Qué es E.164 y por qué debería usarlo?

E.164 es la recomendación ITU-T para números de teléfono internacionales: un prefijo `+`, código de país y dígitos nacionales significativos sin caracteres de formato. Es inequívoco, globalmente único y soportado por toda API de telecom. Almacena en E.164; formatea para display.

### ¿Puedo detectar la compañía o tipo de número?

Sí. libphonenumber retorna el tipo de número (`MOBILE`, `FIXED_LINE`, `TOLL_FREE`, etc.) y, en algunos países, el nombre de la compañía. En Python: `phonenumbers.number_type(parsed)`. En JavaScript: `phone.getType()`. En Java: `util.getNumberType(number)`. Nota que los datos de compañía no están disponibles para todas las regiones.
