---
contentType: recipes
slug: regular-expressions
title: "Regular Expressions"
description: "How to use regular expressions for pattern matching, validation, and text extraction across Python, JavaScript, and Java."
metaDescription: "Practical regular expression examples in Python, JavaScript, and Java. Learn pattern matching, validation, groups, and common regex patterns for developers."
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
  metaDescription: "Practical regular expression examples in Python, JavaScript, and Java. Learn pattern matching, validation, groups, and common regex patterns for developers."
  keywords:
    - regular expressions
    - regex
    - pattern matching
    - text validation
    - python regex
    - javascript regex
    - java regex
    - regex groups
    - regex flags
---

## Overview

Regular expressions (regex) are sequences of characters that define search patterns. They are the standard tool for text validation, extraction, substitution, and parsing across virtually every programming language and text editor.

Despite their cryptic syntax, regex is indispensable for working with unstructured text, form validation, log parsing, and data cleaning.

## When to Use

Use this recipe when:

- Validating email addresses, phone numbers, or IDs. See [Data Validation](/recipes/data/data-validation) for schema-based approaches.
- Extracting data from unstructured text or [log files](/recipes/api/logging)
- Replacing or formatting strings with complex rules
- Splitting text on live delimiters
- Searching for patterns within large documents

## Solution

### Python

```python
import re

text = "Contact us at support@example.com or sales@example.org"

# Search for email pattern
pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
matches = re.findall(pattern, text)
print(matches)  # ['support@example.com', 'sales@example.org']

# Extract groups
match = re.search(r'(\w+)@(\w+\.\w+)', text)
if match:
    print(match.group(1))  # support
    print(match.group(2))  # example.com

# Replace
new_text = re.sub(r'\b\w+@\w+\.\w+\b', '[REDACTED]', text)
print(new_text)  # Contact us at [REDACTED] or [REDACTED]
```

### JavaScript

```javascript
const text = "Contact us at support@example.com or sales@example.org";

// Match all emails
const pattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const matches = text.match(pattern);
console.log(matches);  // ['support@example.com', 'sales@example.org']

// Extract groups
const groupPattern = /(\w+)@(\w+\.\w+)/;
const match = text.match(groupPattern);
if (match) {
  console.log(match[1]); // support
  console.log(match[2]); // example.com
}

// Replace
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

// Extract groups
Pattern groupPattern = Pattern.compile("(\\w+)@(\\w+\\.\\w+)");
Matcher groupMatcher = groupPattern.matcher(text);
if (groupMatcher.find()) {
    System.out.println(groupMatcher.group(1));  // support
    System.out.println(groupMatcher.group(2));  // example.com
}
```

## Explanation

- **Pattern**: The regex string that defines what to search for
- **Matcher / Match object**: Holds the result of applying a pattern to text
- **Groups** (`()`): Capture sub-expressions for extraction
- **Flags** (`i`, `g`, `m`): Modify behavior (case-insensitive, global, multiline)
- **Character classes** (`[a-z]`, `\d`, `\w`): Match sets of characters

## Common Patterns

| Pattern | Description | Example |
|---------|-------------|---------|
| `\d{3}-\d{2}-\d{4}` | US Social Security Number | 123-45-6789 |
| `\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b` | IPv4 address | 192.168.1.1 |
| `https?://[^\s]+` | URL | https://example.com |
| `^\d{4}-\d{2}-\d{2}$` | ISO date (YYYY-MM-DD) | 2024-03-15 |
| `^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$` | Email (basic) | user@domain.com |
| `^#[0-9A-Fa-f]{6}$` | Hex color code | #3B82F6 |
| `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$` | Strong password | MyP@ssw0rd |
| `^\+?[1-9]\d{1,14}$` | International phone (E.164) | +14155552671 |
| `^[a-zA-Z0-9_-]+$` | Safe filename (no spaces/special) | my-file_v2 |

## Performance Considerations

### ReDoS (Regular Expression Denial of Service)

Poorly written regex with nested quantifiers can cause catastrophic backtracking, consuming 100% CPU on a single request:

```
Dangerous:  (a+)+$  against "aaaaaaaaaaaaaaaaaaaaaaaaaaaa!"
Safe:       a+$      against the same input
```

**Mitigation strategies:**
- Avoid nested quantifiers (`(a+)+`, `(a*)*`) whenever possible
- Use possessive quantifiers (`++`, `*+`) or atomic groups if your engine supports them
- Set a reasonable timeout on regex operations in production
- Test with malicious inputs during development

### Compilation Cost

Most regex engines compile patterns into an internal representation. Recompiling the same pattern in a loop is wasteful:

```python
# Bad: compiles pattern on every iteration
for line in lines:
    re.search(r'\berror\b', line)

# Good: compile once and reuse
error_pattern = re.compile(r'\berror\b')
for line in lines:
    error_pattern.search(line)
```

## What Works

- **Always escape special characters** when building regex live. See [Input Validation](/recipes/api/input-validation) for safe string handling.
- **Use raw strings** in Python (`r'...'`) to avoid double escaping
- **Prefer explicit character classes** over `.` (dot) for predictable matching
- **Anchor your patterns** with `^` and `$` when validating entire strings
- **Test with edge cases**: empty strings, Unicode, very long inputs
- **Document complex patterns** with comments or the `(?x)` verbose flag

## Common Mistakes

- Forgetting to escape backslashes (use raw strings in Python)
- Using greedy quantifiers (`.*`) when non-greedy (`.*?`) is needed
- Not anchoring validation patterns, allowing partial matches
- Ignoring Unicode and international characters in real-world text
- Writing overly complex regex when a simple string function suffices

## Frequently Asked Questions

**Q: Should I use regex to parse HTML?**
A: No. HTML is not a regular language. Use a proper HTML parser (BeautifulSoup, DOM API, Jsoup).

**Q: What is the difference between `match()` and `search()` in Python?**
A: `match()` checks only at the beginning of the string. `search()` scans the entire string.

**Q: How do I make a regex case-insensitive?**
A: Use the `i` flag (JavaScript), `re.IGNORECASE` (Python), or `Pattern.CASE_INSENSITIVE` (Java).
