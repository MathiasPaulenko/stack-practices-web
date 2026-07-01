---
contentType: recipes
slug: format-phone-numbers
title: "Format Phone Numbers"
description: "How to format and validate phone numbers in Python, Java, and JavaScript."
metaDescription: "Learn how to format phone numbers in Python, Java, and JavaScript. Validate international numbers and apply regional formats with code examples."
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
  metaDescription: "Learn how to format phone numbers in Python, Java, and JavaScript. Validate international numbers and apply regional formats with code examples."
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
## Overview

Phone numbers are deceptively complex: country codes, area codes, extensions, mobile vs landline prefixes, and regional formatting rules vary across 200+ territories. Storing raw strings leads to duplicates, failed SMS deliveries, and broken click-to-call links. This recipe covers parsing, validation, formatting, and extraction with Google's libphonenumber across Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Accepting phone numbers from user registration or checkout forms
- Normalizing international numbers before storing in a database
- Formatting numbers for display in regional or E.164 formats
- Validating numbers before sending SMS or making voice API calls

## Solution

### Python

```python
# phonenumbers library (Google libphonenumber port)
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
# Normalizing to E.164 for storage
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
// libphonenumber-js lightweight port
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
// As-you-type formatter for input fields
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
// As-you-type formatting
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

## Explanation

Google's libphonenumber is the industry standard for phone number handling. It maintains a metadata database of numbering plans for every region, including which prefixes are valid, minimum and maximum lengths, and national formatting templates. The library can distinguish between a fixed-line and mobile number in most countries, detect possible numbers (syntactically valid but unassigned), and format in E.164, national, or RFC3966 (tel: URI) formats.

E.164 (`+14155552671`) is the canonical storage format: it is unambiguous, sorts correctly, and works with Twilio, AWS SNS, and most telecom APIs. National formats (`(415) 555-2671`) are for display. International formats (`+1 415 555 2671`) work for mixed-audience pages. Never store user input raw; always parse and normalize to E.164.

## Variants

| Technology | Library | Feature | Notes |
|------------|---------|---------|-------|
| Python | `phonenumbers` | Parse, validate, format | Full port of libphonenumber, includes geocoder |
| JavaScript | `libphonenumber-js` | Parse, validate, format | Lightweight, tree-shakeable, modern JS |
| JavaScript | `libphonenumber-js` `AsYouType` | Real-time formatting | Ideal for input masking |
| Java | `libphonenumber` | Parse, validate, format | Google's original, most complete metadata |
| Java | `AsYouTypeFormatter` | Real-time formatting | Character-by-character formatting |

## What Works

- **Store E.164, display national**: E.164 removes ambiguity; national format improves readability
- **Parse with a default region hint**: `parse("4155552671", "US")` resolves correctly; without a hint, require a `+` prefix
- **Validate before sending SMS**: Invalid numbers fail silently or cost money; always check `isValidNumber()`
- **Use AsYouType formatting for inputs**: Real-time formatting reduces user errors and improves completion rates
- **Never rely on regex alone**: Phone rules change; libphonenumber updates its metadata regularly

## Common Mistakes

- **Storing formatted strings**: `(415) 555-2671` is useless for dialing; store E.164 and format on read
- **Forgetting the country hint**: Parsing `020 7946 0958` without a region is ambiguous (UK, Nigeria, etc.)
- **Validating with a fixed-length regex**: Some countries have 7-digit numbers, others have 13; length varies by prefix
- **Exposing raw input in tel: links**: A tel link with spaces or parentheses may fail on some devices; use E.164 in `href`
- **Ignoring extension handling**: `+1 555-1234 ext 42` should store the extension separately; libphonenumber can extract it

## Frequently Asked Questions

### How do I handle phone numbers without a country code?

Require a country selection in the UI, or geolocate the user and use that as the default region hint. If the user enters a number starting with `+`, parse it as an international number. If not, parse with the selected/default region. Never guess based on IP alone, as VPNs and travelers break the assumption.

### What is E.164 and why should I use it?

E.164 is the ITU-T recommendation for international phone numbers: a `+` prefix, country code, and national significant digits without any formatting characters. It is unambiguous, globally unique, and supported by every telecom API. Store in E.164; format for display.

### Can I detect the carrier or number type?

Yes. libphonenumber returns the number type (`MOBILE`, `FIXED_LINE`, `TOLL_FREE`, etc.) and, in some countries, the carrier name. In Python: `phonenumbers.number_type(parsed)`. In JavaScript: `phone.getType()`. In Java: `util.getNumberType(number)`. Note that carrier data is not available for all regions.
