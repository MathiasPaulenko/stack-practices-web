---



contentType: recipes
slug: generate-slugs
title: "Generate URL Slugs"
description: "How to generate clean, URL-friendly slugs from strings in multiple programming languages."
metaDescription: "Learn how to generate URL-friendly slugs from strings in Python, JavaScript, and Java. Clean, SEO-safe slugs for web apps."
difficulty: beginner
topics:
  - data
tags:
  - slug
  - url
  - sanitization
  - python
  - javascript
  - java
relatedResources:
  - /recipes/parse-csv-files
  - /recipes/parse-json
  - /recipes/regular-expressions
  - /recipes/input-validation
  - /recipes/truncate-text
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Learn how to generate URL-friendly slugs from strings in Python, JavaScript, and Java. Clean, SEO-safe slugs for web apps."
  keywords:
    - slug
    - url
    - sanitization
    - python
    - javascript
    - java



---

## Overview

URL slugs are human-readable identifiers used in web addresses. A well-formed slug improves SEO, usability, and shareability. Generating slugs involves transliterating non-ASCII characters, removing special symbols, collapsing whitespace, and ensuring uniqueness.

## When to Use


- For alternatives, see [Convert CSV to JSON](/recipes/convert-csv-to-json/).

Use this resource when:
- Converting article titles, product names, or user-generated content into permalink URLs
- Building CMSs, blogs, e-commerce platforms, or any app with user-facing URLs
- Normalizing filenames for uploaded assets to avoid encoding issues
- Creating SEO-friendly paths for multi-language content

## Solution

### Python

```python
import re
import unicodedata

def generate_slug(text):
    # Normalize unicode and remove accents
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    # Lowercase and replace non-alphanumeric with hyphens
    text = re.sub(r'[^\w\s-]', '', text.lower())
    # Collapse multiple hyphens/whitespace
    text = re.sub(r'[-\s]+', '-', text).strip('-_')
    return text

print(generate_slug("Hello, World! 2024"))  # hello-world-2024
print(generate_slug("Cafe & Creme Brulee"))  # cafe-creme-brulee
```

### JavaScript

```javascript
function generateSlug(text) {
    return text
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[-\s]+/g, '-');
}

console.log(generateSlug("Hello, World! 2024"));  // hello-world-2024
console.log(generateSlug("Cafe & Creme Brulee"));  // cafe-creme-brulee
```

```javascript
// Using the popular slugify library
// npm install slugify
import slugify from 'slugify';

slugify('Hello, World! 2024');  // hello-world-2024
slugify('Cafe & Creme Brulee');  // cafe-creme-brulee
```

### Java

```java
import java.text.Normalizer;
import java.util.Locale;

public class SlugGenerator {
    public static String generateSlug(String input) {
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFKD)
            .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return normalized.toLowerCase(Locale.ROOT)
            .replaceAll("[^\\w\\s-]", "")
            .replaceAll("[-\\s]+", "-")
            .replaceAll("^-+|$-+", "");
    }

    public static void main(String[] args) {
        System.out.println(generateSlug("Hello, World! 2024"));  // hello-world-2024
        System.out.println(generateSlug("Cafe & Creme Brulee"));  // cafe-creme-brulee
    }
}
```

## Explanation

The core algorithm is consistent across languages:
1. **Unicode normalization** (`NFKD`) decomposes accented characters into base + combining mark, allowing removal of diacritics
2. **Lowercasing** ensures case-insensitive URLs
3. **Strip special characters** except alphanumeric, hyphens, and spaces
4. **Collapse separators** into single hyphens and trim leading/trailing ones

This produces ASCII-only, lowercase, hyphen-delimited strings that are safe for URLs, filenames, and IDs.

### Handling Non-Latin Scripts

For languages like Chinese, Japanese, Arabic, or Russian, NFKD normalization alone is insufficient because the characters do not decompose into ASCII. You need transliteration:

```python
from slugify import slugify

print(slugify('ä½ å¥½ä¸–ç•Œ'))  # ni-hao-shi-jie
print(slugify('ÐŸÑ€Ð¸Ð²ÐµÑ‚ Ð¼Ð¸Ñ€'))  # privet-mir
```

```javascript
import slugify from '@sindresorhus/slugify';

console.log(slugify('ä½ å¥½ä¸–ç•Œ'));  // ni-hao-shi-jie
```

If transliteration is not available, generate a random ID or use a numeric suffix as a fallback.

### Python with Uniqueness Handling

```python
import re
import unicodedata

def generate_slug(text, existing_slugs=None, max_length=100):
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    text = re.sub(r'[^\w\s-]', '', text.lower())
    text = re.sub(r'[-\s]+', '-', text).strip('-_')
    text = text[:max_length].rstrip('-')

    if existing_slugs is None:
        return text

    base = text
    counter = 2
    while text in existing_slugs:
        suffix = f'-{counter}'
        text = base[:max_length - len(suffix)] + suffix
        counter += 1
    return text

existing = {'hello-world', 'hello-world-2'}
print(generate_slug('Hello World', existing))  # hello-world-3
```

### JavaScript with Custom Options

```javascript
function generateSlug(text, options = {}) {
  const {
    replacement = '-',
    remove = /[^\w\s-]/g,
    lower = true,
    strict = true,
  } = options;

  let result = text
    .normalize('NFKD')
.replace(/[\u0300-\u036f]/g, '')
.replace(remove, '')
    .trim()
.replace(/[-\s]+/g, replacement);

  if (lower) result = result.toLowerCase();
  if (strict) result = result.replace(/[^a-z0-9-]/g, '');

  return result;
}
```

### Go (Using golang.org/x/text)

```go
package main

import (
    "fmt"
    "regexp"
    "strings"
    "unicode"
    "golang.org/x/text/unicode/norm"
)

func generateSlug(text string) string {
    t := norm.NFKD.String(text)

    var b strings.Builder
    for _, r := range t {
        if unicode.Is(unicode.Mn, r) {
            continue
        }
        b.WriteRune(r)
    }
    text = b.String()
    text = strings.ToLower(text)

    reg := regexp.MustCompile(`[^a-z0-9]+`)
    text = reg.ReplaceAllString(text, "-")

    return strings.Trim(text, "-")
}
```

## Variants

| Technology | Library | Approach | Notes |
|------------|---------|----------|-------|
| Python | `python-slugify` | `slugify()` | Handles unicode, supports language-specific rules |
| Python | `unicodedata` + `re` | Manual | No dependencies, full control |
| JavaScript | `slugify` | `slugify()` | Lightweight, supports custom replacements |
| JavaScript | Manual | `normalize()` + regex | Zero dependencies |
| Java | `slugify` (Maven) | `Slugify` | Supports custom replacements and language rules |
| Java | `Normalizer` + regex | Manual | Built-in JDK, no external deps |
| Go | `golang.org/x/text` | `norm.NFKD` + regex | Stdlib extended, no third-party deps |

## What Works

- **Always normalize Unicode** before stripping accents to handle e, n, CJK correctly
- **Enforce maximum length** (e.g., 100 characters) to prevent URL bloat and database issues
- **Check for uniqueness** against existing slugs in your database; append `-2`, `-3` if needed
- **Avoid trailing/leading hyphens** that look unprofessional and may break relative URL resolution
- **Use lowercase exclusively**; URLs are case-sensitive on most Unix servers
- **Test with edge cases**: empty strings, strings with only special characters, very long strings, and strings with mixed scripts
- **Consider locale-specific rules**: German ae (not a), Turkish i. Use locale-aware libraries when these distinctions matter
- **Cache generated slugs**: if you generate slugs on every page load, cache them to avoid repeated CPU-intensive normalization

## Common Mistakes

- **Stripping accents without NFKD normalization**: accented characters stay intact instead of becoming their base form
- **Allowing reserved URL characters**: `#`, `%`, `?`, `&` have special meaning in URLs and must be removed
- **Not limiting slug length**: Extremely long slugs hurt readability and may exceed database column limits
- **Ignoring duplicate slugs**: Two articles with the same title will collide without a uniqueness strategy
- **Translating instead of transliterating**: Translating "hello" to Spanish is not the same as making it URL-safe
- **Not handling empty slugs**: if the input is entirely special characters, the slug becomes empty. Add a fallback like `untitled` or a random ID
- **Using underscores instead of hyphens**: underscores are valid in URLs but Google treats hyphens as word separators, improving SEO
- **Not stripping consecutive separators**: `hello---world` looks broken. Always collapse multiple hyphens into one

## Frequently Asked Questions

### How do I handle completely non-Latin scripts like Chinese or Arabic?

For Chinese, use Pinyin romanization libraries (`pypinyin` in Python, `pinyin` in JS). For Arabic, Persian, or Cyrillic, use transliteration libraries (`unidecode`, `transliteration`). As a fallback, generate a random ID or use a numeric suffix.

### Should slugs be unique globally or per user?

It depends on your URL structure. If URLs are `/posts/:slug`, slugs must be globally unique. If they are `/:username/:slug`, uniqueness only needs to be enforced per user. Always index the slug column for fast lookups.

### Can I change a slug after publishing?

Changing slugs breaks existing links and bookmarks. If you must change a slug, implement a 301 redirect from the old slug to the new one. Store the old slug in a redirects table to preserve SEO value.

### Should I store slugs in the database or generate them on the fly?

Store them. Generating slugs on the fly means a title change silently breaks URLs. Store the slug as a column with a unique index. When the title changes, decide whether to update the slug (with a redirect) or keep the old one.

### How do I handle slug collisions at scale?

For high-traffic sites, appending `-2`, `-3` can lead to race conditions. Use a database transaction with `SELECT ... FOR UPDATE` to atomically check and insert. Alternatively, append a short random suffix (e.g., 4 characters) to guarantee uniqueness without a lookup.

### What is the ideal slug length?

Keep slugs between 3 and 75 characters. Search engines truncate URLs around 60-75 characters in results pages. Short slugs (under 3 characters) are ambiguous and may conflict with reserved paths. Truncate at the last complete word boundary to avoid splitting words.

### How do I slugify content with emojis?

Strip emojis entirely. Most URL parsers and browsers do not handle emoji URLs reliably. In Python, use `re.sub(r'[\U0001F600-\U0001F64F]', '', text)` or the `emoji` library to remove them. In JavaScript, use `text.replace(/\p{Extended_Pictographic}/gu, '')`.

### Are slugs case-sensitive?

Technically, URLs are case-sensitive per RFC 3986. In practice, most servers treat them as case-insensitive, but this is not guaranteed. Always use lowercase to avoid ambiguity. Some servers (nginx, Apache) can be configured to redirect uppercase URLs to lowercase for consistency.

### What libraries handle transliteration for non-Latin scripts?

In Python, `python-slugify` includes transliteration for most scripts. `unidecode` handles many scripts but produces ASCII-only output. In JavaScript, `@sindresorhus/slugify` and `transliteration` package cover Chinese, Cyrillic, and Arabic. In Java, `junidecode` provides similar functionality. Test with your actual content — transliteration quality varies between libraries.
