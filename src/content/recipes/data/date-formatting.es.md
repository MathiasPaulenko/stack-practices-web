---
contentType: recipes
slug: date-formatting
title: "Formateo de Fechas"
description: "Cómo parsear, formatear y manipular fechas a través de timezones usando Python, JavaScript y Java."
metaDescription: "Ejemplos prácticos de formateo de fechas en Python, JavaScript y Java. Aprende ISO 8601, manejo de timezones y formateo localizado."
difficulty: beginner
topics:
  - data
tags:
  - data
relatedResources:
  - /recipes/parse-json
  - /recipes/call-rest-api
  - /recipes/cron-jobs
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejemplos prácticos de formateo de fechas en Python, JavaScript y Java. Aprende ISO 8601, manejo de timezones y formateo localizado."
  keywords:
    - formateo de fechas
    - parsear fechas
    - manejo de timezones
    - ISO 8601
    - datetime python
    - javascript fechas
    - java datetime
    - formateo localizado
    - UTC
---

## Visión general

El formateo de fechas convierte objetos `Date` o `DateTime` en strings legibles (y viceversa). Es esencial para APIs, interfaces de usuario, reportes y cualquier sistema que intercambie datos temporales.

Almacena y transmite siempre las fechas en UTC (ISO 8601), y formatea a hora local solo en la capa de presentación.

## Cuándo usarlo

Usa esta recipe cuando:

- Serializas fechas a JSON o XML para [APIs](/recipes/api/call-rest-api)
- Muestras fechas en interfaces de usuario con localización apropiada
- Parseas fechas ingresadas por usuarios desde formularios o archivos. Consulta [Data Validation](/recipes/data/data-validation) para sanitizar input.
- Conviertes entre timezones para aplicaciones globales
- Logueas y auditas eventos con timestamps precisos. Consulta [Logging](/recipes/api/logging) para patrones de observabilidad.

## Solución

### Python

```python
from datetime import datetime, timezone, timedelta

# Hora UTC actual
now_utc = datetime.now(timezone.utc)
print(now_utc.isoformat())  # 2026-06-10T14:30:00+00:00

# Formatear para display
print(now_utc.strftime("%Y-%m-%d %H:%M:%S"))  # 2026-06-10 14:30:00
print(now_utc.strftime("%A, %B %d, %Y"))      # Tuesday, June 10, 2026

# Parsear string ISO 8601
dt = datetime.fromisoformat("2026-06-10T14:30:00+00:00")

# Convertir timezone
berlin = dt.astimezone(timezone(timedelta(hours=2)))
print(berlin.strftime("%Y-%m-%d %H:%M:%S %z"))  # 2026-06-10 16:30:00 +0200
```

### JavaScript

```javascript
const now = new Date();

// ISO 8601 (siempre UTC)
console.log(now.toISOString()); // 2026-06-10T14:30:00.000Z

// Formateo locale-specific
console.log(now.toLocaleString('en-US', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'America/New_York',
})); // Tuesday, June 10, 2026 at 10:30 AM

// Formatear con Intl.DateTimeFormat
const fmt = new Intl.DateTimeFormat('de-DE', {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit',
  timeZone: 'Europe/Berlin',
});
console.log(fmt.format(now)); // 10.06.2026, 16:30

// Parsear string ISO
const parsed = new Date('2026-06-10T14:30:00Z');
console.log(parsed.toISOString());
```

### Java

```java
import java.time.*;
import java.time.format.DateTimeFormatter;

// UTC actual
ZonedDateTime nowUtc = ZonedDateTime.now(ZoneOffset.UTC);
System.out.println(nowUtc.format(DateTimeFormatter.ISO_INSTANT));

// Formatear para display
DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss z");
System.out.println(nowUtc.format(formatter)); // 2026-06-10 14:30:00 UTC

// Parsear string ISO
ZonedDateTime parsed = ZonedDateTime.parse("2026-06-10T14:30:00Z", DateTimeFormatter.ISO_INSTANT);

// Convertir timezone
ZonedDateTime tokyo = parsed.withZoneSameInstant(ZoneId.of("Asia/Tokyo"));
System.out.println(tokyo.format(formatter)); // 2026-06-10 23:30:00 JST
```

## Patrones de formato comunes

| Patrón | Ejemplo | Descripción |
|--------|---------|-------------|
| `yyyy-MM-dd` | 2026-06-10 | Fecha ISO |
| `yyyy-MM-dd'T'HH:mm:ss'Z'` | 2026-06-10T14:30:00Z | ISO 8601 UTC |
| `MMM d, yyyy` | Jun 10, 2026 | Nombre de mes corto |
| `EEEE, MMMM d, yyyy` | Tuesday, June 10, 2026 | Día de semana y mes completos |
| `HH:mm:ss` | 14:30:00 | Hora 24h |
| `h:mm a` | 2:30 PM | Hora 12h con AM/PM |

## Lo que funciona

- **Almacena en UTC**: Persiste todas las fechas en UTC para evitar ambigüedad
- **Usa ISO 8601 para APIs**: `2026-06-10T14:30:00Z` es inequívoco y universalmente parseable
- **Formatea en el edge**: Convierte a hora local solo al renderizar para el usuario
- **Incluye offsets de timezone** en respuestas de API: Ayuda a clientes a mostrar hora local correcta
- **Evita formatos ambiguos**: `02/03/2026` podría ser 2 de marzo o 3 de febrero según el locale
- **Usa IDs de timezone conocidos**: Prefiere `America/New_York` sobre `EST` porque este último no considera DST

## Errores comunes

- Almacenar hora local sin información de timezone, causando confusión durante cambios de horario de verano
- Usar `Date.parse()` con strings no ISO (el comportamiento varía entre browsers)
- Formatear fechas en el backend con el timezone local del servidor en lugar del del usuario
- Ignorar leap seconds y edge cases en aritmética de calendario
- Concatenar fechas como strings en lugar de usar librerías de fechas apropiadas

## Preguntas frecuentes

**P: ¿Debería usar timestamps o strings formateados en mi base de datos?**
R: Usa tipos nativos `TIMESTAMP WITH TIME ZONE`. Almacenan instantes precisos en el tiempo y manejan conversiones automáticamente. Consulta [Database Transactions](/recipes/databases/database-transactions) para integridad de datos.

**P: ¿Cómo manejo el horario de verano (daylight saving)?**
R: Almacena todo en UTC. Usa IDs de timezone IANA (ej. `Europe/Madrid`) para conversiones user-facing. Nunca hard-codees offsets.

**P: ¿Cuál es la diferencia entre `toISOString()` y `toUTCString()`?**
R: `toISOString()` produce formato ISO 8601 (`2026-06-10T14:30:00.000Z`). `toUTCString()` produce un string RFC 7231 (`Tue, 10 Jun 2026 14:30:00 GMT`). Usa ISO 8601 para APIs.
