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
  - /recipes/data/parse-csv-files
  - /recipes/data/parse-json
  - /recipes/data/regular-expressions
  - /recipes/api/input-validation
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
print(generate_slug("Café & Crème Brûlée"))  # cafe-creme-brulee
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
console.log(generateSlug("Café & Crème Brûlée"));  // cafe-creme-brulee
```

```javascript
// Using the popular slugify library
// npm install slugify
import slugify from 'slugify';

slugify('Hello, World! 2024');  // hello-world-2024
slugify('Café & Crème Brûlée');  // cafe-creme-brulee
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
        System.out.println(generateSlug("Café & Crème Brûlée"));  // cafe-creme-brulee
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

## Variants

| Technology | Library | Approach | Notes |
|------------|---------|----------|-------|
| Python | `python-slugify` | `slugify()` | Handles unicode, supports language-specific rules |
| Python | `unicodedata` + `re` | Manual | No dependencies, full control |
| JavaScript | `slugify` | `slugify()` | Lightweight, supports custom replacements |
| JavaScript | Manual | `normalize()` + regex | Zero dependencies |
| Java | `slugify` (Maven) | `Slugify` | Supports custom replacements and language rules |
| Java | `Normalizer` + regex | Manual | Built-in JDK, no external deps |

## Best Practices

- **Always normalize Unicode** before stripping accents to handle é, ñ, 中文 correctly
- **Enforce maximum length** (e.g., 100 characters) to prevent URL bloat and database issues
- **Check for uniqueness** against existing slugs in your database; append `-2`, `-3` if needed
- **Avoid trailing/leading hyphens** that look unprofessional and may break relative URL resolution
- **Use lowercase exclusively**; URLs are case-sensitive on most Unix servers

## Common Mistakes

- **Stripping accents without NFKD normalization**: `é` stays as `é` instead of becoming `e`
- **Allowing reserved URL characters**: `#`, `%`, `?`, `&` have special meaning in URLs and must be removed
- **Not limiting slug length**: Extremely long slugs hurt readability and may exceed database column limits
- **Ignoring duplicate slugs**: Two articles with the same title will collide without a uniqueness strategy
- **Translating instead of transliterating**: Translating "hello" to Spanish is not the same as making it URL-safe

## Frequently Asked Questions

### How do I handle completely non-Latin scripts like Chinese or Arabic?

For Chinese, use Pinyin romanization libraries (`pypinyin` in Python, `pinyin` in JS). For Arabic, Persian, or Cyrillic, use transliteration libraries (`unidecode`, `transliteration`). As a fallback, generate a random ID or use a numeric suffix.

### Should slugs be unique globally or per user?

It depends on your URL structure. If URLs are `/posts/:slug`, slugs must be globally unique. If they are `/:username/:slug`, uniqueness only needs to be enforced per user. Always index the slug column for fast lookups.

### Can I change a slug after publishing?

Changing slugs breaks existing links and bookmarks. If you must change a slug, implement a 301 redirect from the old slug to the new one. Store the old slug in a redirects table to preserve SEO value.
