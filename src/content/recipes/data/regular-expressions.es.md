---
contentType: recipes
slug: regular-expressions
title: "Expresiones Regulares"
description: "Cómo usar expresiones regulares para matching de patrones, validación y extracción de texto en Python, JavaScript y Java."
metaDescription: "Ejemplos prácticos de expresiones regulares en Python, JavaScript y Java. Aprende pattern matching, validación, grupos y patrones comunes."
difficulty: beginner
topics:
  - data
tags:
  - data
  - java
  - javascript
relatedResources:
  - /recipes/parse-json
  - /recipes/handle-errors
  - /recipes/sort-array
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejemplos prácticos de expresiones regulares en Python, JavaScript y Java. Aprende pattern matching, validación, grupos y patrones comunes."
  keywords:
    - expresiones regulares
    - regex
    - pattern matching
    - validación de texto
    - python regex
    - javascript regex
    - java regex
    - grupos regex
    - flags regex
---

## Visión general

Las expresiones regulares (regex) son secuencias de caracteres que definen patrones de búsqueda. Son la herramienta estándar para validación de texto, extracción, sustitución y parsing en prácticamente todos los lenguajes de programación y editores de texto.

A pesar de su sintaxis críptica, regex es indispensable para trabajar con texto no estructurado, validación de formularios, parsing de logs y limpieza de datos.

## Cuándo usarlo

Usa esta recipe cuando:

- Validas direcciones de email, números de teléfono o IDs. Consulta [Data Validation](/recipes/data/data-validation) para enfoques basados en schemas.
- Extraes datos de texto no estructurado o [archivos de log](/recipes/api/logging)
- Reemplazas o formateas strings con reglas complejas
- Divides texto en delimitadores dinámicos
- Buscas patrones dentro de documentos grandes

## Solución

### Python

```python
import re

text = "Contact us at support@example.com or sales@example.org"

# Buscar patrón de email
pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
matches = re.findall(pattern, text)
print(matches)  # ['support@example.com', 'sales@example.org']

# Extraer grupos
match = re.search(r'(\w+)@(\w+\.\w+)', text)
if match:
    print(match.group(1))  # support
    print(match.group(2))  # example.com

# Reemplazar
new_text = re.sub(r'\b\w+@\w+\.\w+\b', '[REDACTED]', text)
print(new_text)  # Contact us at [REDACTED] or [REDACTED]
```

### JavaScript

```javascript
const text = "Contact us at support@example.com or sales@example.org";

// Match todos los emails
const pattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const matches = text.match(pattern);
console.log(matches);  // ['support@example.com', 'sales@example.org']

// Extraer grupos
const groupPattern = /(\w+)@(\w+\.\w+)/;
const match = text.match(groupPattern);
if (match) {
  console.log(match[1]); // support
  console.log(match[2]); // example.com
}

// Reemplazar
const newText = text.replace(/\b\w+@\w+\.\w+\b/g, '[REDACTED]');
console.log(newText); // Contact us at [REDACTED] or [REDACTED]
```

### Java

```java
import java.util.regex.*;

String text = "Contact us at support@example.com or sales@example.org";

Pattern pattern = Pattern.compile("\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b");
Matcher matcher = pattern.matcher(text);

while (matcher.find()) {
    System.out.println(matcher.group());  // support@example.com, sales@example.org
}

// Extraer grupos
Pattern groupPattern = Pattern.compile("(\\w+)@(\\w+\\.\\w+)");
Matcher groupMatcher = groupPattern.matcher(text);
if (groupMatcher.find()) {
    System.out.println(groupMatcher.group(1));  // support
    System.out.println(groupMatcher.group(2));  // example.com
}
```

## Explicación

- **Patrón**: La cadena regex que define qué buscar
- **Matcher / Match object**: Contiene el resultado de aplicar un patrón a texto
- **Grupos** (`()`): Capturan sub-expresiones para extracción
- **Flags** (`i`, `g`, `m`): Modifican el comportamiento (case-insensitive, global, multiline)
- **Clases de caracteres** (`[a-z]`, `\d`, `\w`): Coinciden con conjuntos de caracteres

## Patrones comunes

| Patrón | Descripción | Ejemplo |
| -------- | ------------- | --------- |
| `\d{3}-\d{2}-\d{4}` | Número de Seguro Social de EE.UU. | `123-45-6789` |
| `\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b` | Dirección IPv4 | `192.168.1.1` |
| `https?://[^\s]+` | URL | `https://example.com` |
| `^\d{4}-\d{2}-\d{2}$` | Fecha ISO (YYYY-MM-DD) | `2024-03-15` |
| `^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$` | Email (básico) | `user@domain.com` |
| `^#[0-9A-Fa-f]{6}$` | Código de color hex | `#3B82F6` |
| `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$` | Contraseña fuerte | `MyP@ssw0rd` |
| `^\+?[1-9]\d{1,14}$` | Teléfono internacional (E.164) | `+14155552671` |
| `^[a-zA-Z0-9_-]+$` | Nombre de archivo seguro | `my-file_v2` |

## Consideraciones de rendimiento

### ReDoS (Regular Expression Denial of Service)

Regex mal escritos con cuantificadores anidados pueden causar backtracking catastrófico, consumiendo el 100% de CPU en una sola petición:

```text
Peligroso: (a+)+$  contra "aaaaaaaaaaaaaaaaaaaaaaaaaaaa!"
Seguro:    a+$     contra el mismo input
```

**Estrategias de mitigación:**

- Evita cuantificadores anidados (`(a+)+`, `(a*)*`) siempre que sea posible
- Usa cuantificadores posesivos (`++`, `*+`) o grupos atómicos si tu motor lo soporta
- Establece un timeout razonable en operaciones regex en producción
- Testea con inputs maliciosos durante el desarrollo

### Coste de compilación

La mayoría de motores regex compilan patrones en una representación interna. Recompilar el mismo patrón en un loop es ineficiente:

```python
# Malo: compila el patrón en cada iteración
for line in lines:
    re.search(r'\berror\b', line)

# Bueno: compila una vez y reutiliza
error_pattern = re.compile(r'\berror\b')
for line in lines:
    error_pattern.search(line)
```

## Mejores prácticas

- **Siempre escapa caracteres especiales** cuando construyas regex dinámicamente. Consulta [Input Validation](/recipes/api/input-validation) para manejo seguro de strings.
- **Usa raw strings** en Python (`r'...'`) para evitar escapes dobles
- **Prefiere clases de caracteres explícitas** sobre `.` (dot) para matching predecible
- **Ancla tus patrones** con `^` y `$` al validar strings completos
- **Testea con casos edge**: strings vacíos, Unicode, inputs muy largos
- **Documenta patrones complejos** con comentarios o el flag verbose `(?x)`

## Errores comunes

- Olvidar escapar backslashes (usa raw strings en Python)
- Usar cuantificadores greedy (`.*`) cuando se necesita non-greedy (`.*?`)
- No anclar patrones de validación, permitiendo matches parciales
- Ignorar Unicode y caracteres internacionales en texto real
- Escribir regex excesivamente complejas cuando una función de string simple basta

## Preguntas frecuentes

**P: ¿Debería usar regex para parsear HTML?**
R: No. HTML no es un lenguaje regular. Usa un parser de HTML apropiado (BeautifulSoup, DOM API, Jsoup).

**P: ¿Cuál es la diferencia entre `match()` y `search()` en Python?**
R: `match()` verifica solo al principio del string. `search()` escanea todo el string.

**P: ¿Cómo hago un regex case-insensitive?**
R: Usa el flag `i` (JavaScript), `re.IGNORECASE` (Python), o `Pattern.CASE_INSENSITIVE` (Java).
