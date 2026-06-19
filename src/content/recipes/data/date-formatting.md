---
contentType: recipes
slug: date-formatting
title: "Date Formatting"
description: "How to parse, format, and manipulate dates across timezones using Python, JavaScript, and Java."
metaDescription: "Practical date formatting examples in Python, JavaScript, and Java. Learn ISO 8601, timezone handling, and locale formatting."
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
  metaDescription: "Practical date formatting examples in Python, JavaScript, and Java. Learn ISO 8601, timezone handling, and locale formatting."
  keywords:
    - date formatting
    - parse dates
    - timezone handling
    - ISO 8601
    - datetime python
    - javascript dates
    - java datetime
    - locale formatting
    - UTC
---

## Overview

Date formatting converts `Date` or `DateTime` objects into human-readable strings (and vice versa). It is essential for APIs, user interfaces, reports, and any system that exchanges temporal data.

Always store and transmit dates in UTC (ISO 8601), and format them to local time only at the presentation layer.

## When to Use

Use this recipe when:

- Serializing dates to JSON or XML for APIs
- Displaying dates in user interfaces with proper localization
- Parsing user-entered dates from forms or files
- Converting between timezones for global applications
- Logging and auditing events with precise timestamps

## Solution

### Python

```python
from datetime import datetime, timezone, timedelta

# Current UTC time
now_utc = datetime.now(timezone.utc)
print(now_utc.isoformat())  # 2026-06-10T14:30:00+00:00

# Format for display
print(now_utc.strftime("%Y-%m-%d %H:%M:%S"))  # 2026-06-10 14:30:00
print(now_utc.strftime("%A, %B %d, %Y"))      # Tuesday, June 10, 2026

# Parse ISO 8601 string
dt = datetime.fromisoformat("2026-06-10T14:30:00+00:00")

# Convert timezone
berlin = dt.astimezone(timezone(timedelta(hours=2)))
print(berlin.strftime("%Y-%m-%d %H:%M:%S %z"))  # 2026-06-10 16:30:00 +0200
```

### JavaScript

```javascript
const now = new Date();

// ISO 8601 (always UTC)
console.log(now.toISOString()); // 2026-06-10T14:30:00.000Z

// Locale-specific formatting
console.log(now.toLocaleString('en-US', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'America/New_York',
})); // Tuesday, June 10, 2026 at 10:30 AM

// Format with Intl.DateTimeFormat
const fmt = new Intl.DateTimeFormat('de-DE', {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit',
  timeZone: 'Europe/Berlin',
});
console.log(fmt.format(now)); // 10.06.2026, 16:30

// Parse ISO string
const parsed = new Date('2026-06-10T14:30:00Z');
console.log(parsed.toISOString());
```

### Java

```java
import java.time.*;
import java.time.format.DateTimeFormatter;

// Current UTC
ZonedDateTime nowUtc = ZonedDateTime.now(ZoneOffset.UTC);
System.out.println(nowUtc.format(DateTimeFormatter.ISO_INSTANT));

// Format for display
DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss z");
System.out.println(nowUtc.format(formatter)); // 2026-06-10 14:30:00 UTC

// Parse ISO string
ZonedDateTime parsed = ZonedDateTime.parse("2026-06-10T14:30:00Z", DateTimeFormatter.ISO_INSTANT);

// Convert timezone
ZonedDateTime tokyo = parsed.withZoneSameInstant(ZoneId.of("Asia/Tokyo"));
System.out.println(tokyo.format(formatter)); // 2026-06-10 23:30:00 JST
```

## Common Format Patterns

| Pattern | Example | Description |
|---------|---------|-------------|
| `yyyy-MM-dd` | 2026-06-10 | ISO date |
| `yyyy-MM-dd'T'HH:mm:ss'Z'` | 2026-06-10T14:30:00Z | ISO 8601 UTC |
| `MMM d, yyyy` | Jun 10, 2026 | Short month name |
| `EEEE, MMMM d, yyyy` | Tuesday, June 10, 2026 | Full weekday and month |
| `HH:mm:ss` | 14:30:00 | 24-hour time |
| `h:mm a` | 2:30 PM | 12-hour time with AM/PM |

## Best Practices

- **Store in UTC**: Persist all dates in UTC to avoid ambiguity
- **Use ISO 8601 for APIs**: `2026-06-10T14:30:00Z` is unambiguous and universally parseable
- **Format at the edge**: Convert to local time only when rendering for the user
- **Include timezone offsets** in API responses: Helps clients display the correct local time
- **Avoid ambiguous formats**: `02/03/2026` could be March 2 or February 3 depending on locale
- **Use well-known timezone IDs**: Prefer `America/New_York` over `EST` because the latter doesn't account for DST

## Common Mistakes

- Storing local time without timezone information, causing confusion during daylight saving changes
- Using `Date.parse()` with non-ISO strings (behavior varies across browsers)
- Formatting dates in the backend with the server's local timezone instead of the user's
- Ignoring leap seconds and edge cases in calendar arithmetic
- Concatenating dates as strings instead of using proper date libraries

## Frequently Asked Questions

**Q: Should I use timestamps or formatted strings in my database?**
A: Use native `TIMESTAMP WITH TIME ZONE` types. They store precise instants in time and handle conversions automatically.

**Q: How do I handle daylight saving time?**
A: Store everything in UTC. Use IANA timezone IDs (e.g., `Europe/Madrid`) for user-facing conversions. Never hard-code offsets.

**Q: What is the difference between `toISOString()` and `toUTCString()`?**
A: `toISOString()` produces ISO 8601 format (`2026-06-10T14:30:00.000Z`). `toUTCString()` produces an RFC 7231 string (`Tue, 10 Jun 2026 14:30:00 GMT`). Use ISO 8601 for APIs.
