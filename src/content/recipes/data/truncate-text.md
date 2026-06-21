---
contentType: recipes
slug: truncate-text
title: "Truncate Text"
description: "How to truncate text with ellipsis and word boundaries in Python, Java, and JavaScript."
metaDescription: "Learn how to truncate text in Python, Java, and JavaScript. Preserve word boundaries and add ellipsis with practical code examples."
difficulty: beginner
topics:
  - data
tags:
  - text
  - truncation
  - formatting
  - strings
  - python
  - javascript
  - java
relatedResources:
  - /recipes/data/parse-pdf-files
  - /recipes/data/convert-csv-to-json
  - /recipes/data/convert-json-to-csv
  - /recipes/data/diff-json-objects
  - /recipes/data/generate-slugs
lastUpdated: "2026-06-20"
author: "StackPractices"
seo:
  metaDescription: "Learn how to truncate text in Python, Java, and JavaScript. Preserve word boundaries and add ellipsis with practical code examples."
  keywords:
    - text
    - truncation
    - formatting
    - strings
    - python
    - javascript
    - java
---
## Overview

Truncating text is a common UI and data-processing task: previews, notification snippets, search result summaries, and CSV exports all need to cut long strings down to a maximum length without breaking words or HTML. This recipe covers character-based, word-boundary, and HTML-aware truncation in Python, JavaScript, and Java.

## When to Use

Use this resource when:
- Displaying article previews, comment summaries, or product descriptions with "Read more" links
- Exporting report data to fixed-width columns or spreadsheets
- Generating email subject lines or push notification bodies with platform length limits
- Trimming user-generated content before storing or indexing

## Solution

### Python

```python
# Character-based truncation with ellipsis
def truncate(text: str, max_length: int = 100) -> str:
    if len(text) <= max_length:
        return text
    return text[:max_length - 3].rstrip() + '...'

print(truncate("This is a very long sentence that needs to be shortened."))
# Output: 'This is a very long sentence that needs to be shor...'
```

```python
# Word-boundary truncation with textwrap
import textwrap

def truncate_words(text: str, max_length: int = 100) -> str:
    if len(text) <= max_length:
        return text
    shortened = textwrap.shorten(text, width=max_length, placeholder='...')
    return shortened

print(truncate_words("This is a very long sentence that needs to be shortened."))
# Output: 'This is a very long sentence that needs to be...'
```

### JavaScript

```javascript
// Character-based truncation
function truncate(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trimEnd() + '...';
}

console.log(truncate("This is a very long sentence that needs to be shortened."));
// Output: 'This is a very long sentence that needs to be shor...'
```

```javascript
// Word-boundary truncation
function truncateWords(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

console.log(truncateWords("This is a very long sentence that needs to be shortened."));
// Output: 'This is a very long sentence that needs to be...'
```

### Java

```java
// Apache Commons Lang StringUtils
// Maven: org.apache.commons:commons-lang3
import org.apache.commons.lang3.StringUtils;

public class TextTruncator {
    public static String truncate(String text, int maxLength) {
        return StringUtils.abbreviate(text, maxLength);
    }
}

// truncate("This is a very long sentence...", 30)
// Output: "This is a very long sente..."
```

```java
// Word-boundary truncation with Streams
import java.util.Arrays;
import java.util.stream.Collectors;

public class WordTruncator {
    public static String truncateWords(String text, int maxLength) {
        String[] words = text.split(" ");
        StringBuilder result = new StringBuilder();
        for (String word : words) {
            if (result.length() + word.length() + 1 > maxLength) break;
            if (result.length() > 0) result.append(" ");
            result.append(word);
        }
        return result.toString() + (result.length() < text.length() ? "..." : "");
    }
}
```

## Explanation

Character truncation is straightforward but can split words in half, producing awkward output like "shor...". Word-boundary truncation searches backward from the cutoff point to the nearest space, preserving readability. `textwrap.shorten` (Python) handles both character and word truncation with a single call. JavaScript requires manual slicing and index search. Java's `StringUtils.abbreviate` defaults to character truncation; word-boundary logic must be built manually or with a library like `Truncation`.

HTML-aware truncation is more complex: you must close any opened tags before appending the ellipsis, or use a dedicated HTML parser. For plain text, word-boundary truncation is usually the best balance of simplicity and readability.

## Variants

| Technology | Library / Approach | Strategy | Notes |
|------------|-------------------|----------|-------|
| Python | Slicing + ellipsis | Character | Fast, simple, may split words |
| Python | `textwrap.shorten` | Word + character | Stdlib, handles word breaks gracefully |
| JavaScript | `slice` + `trimEnd` | Character | Fast, built-in, no dependencies |
| JavaScript | `lastIndexOf(' ')` | Word | Manual, no dependencies |
| Java | `StringUtils.abbreviate` | Character | Apache Commons, configurable placeholder |
| Java | Custom stream builder | Word | Full control over delimiter and ellipsis |

## Best Practices

- **Respect word boundaries for UI text**: "Readability is more important than exact character count in user-facing strings"
- **Use character truncation for machine output**: Fixed-width files, database columns, and logs need exact lengths
- **Strip trailing whitespace before measuring**: Leading/trailing spaces skew length calculations and produce `"..."` on empty strings
- **Handle surrogate pairs and combining characters**: JavaScript `length` counts UTF-16 code units, not grapheme clusters; use `Intl.Segmenter` for proper Unicode counting
- **Add title attributes for truncated links**: `<a title="Full text">truncated...</a>` improves accessibility

## Common Mistakes

- **Splitting HTML tags**: Truncating raw HTML at position 100 can break `<a href="...` mid-tag; use an HTML parser or strip tags first
- **Forgetting to add ellipsis length**: A 100-char limit with `...` means the slice should end at 97, not 100
- **Not handling multibyte characters**: A 20-character slice of Japanese text may cut a 2-byte kanji in half in some encodings
- **Trimming before length check**: `trim()` then slice can still exceed the limit if the original string had no trailing spaces
- **Assuming spaces are the only word boundary**: Hyphens, em-dashes, and CJK characters have different boundary rules

## Frequently Asked Questions

### How do I truncate HTML without breaking tags?

Use an HTML-aware library. Python has `html-truncate` and `BeautifulSoup`; JavaScript has `truncate-html`; Java has `Jsoup` combined with manual node traversal. The rule is: count visible text characters, and when the limit is reached, close all open tags before appending the ellipsis.

### How do I handle Unicode grapheme clusters when truncating?

A grapheme cluster is what a human perceives as one character (e.g., emoji with skin-tone modifiers). JavaScript's `.length` counts UTF-16 code units, not graphemes. Use `Intl.Segmenter` (modern browsers) or the `grapheme-splitter` package. In Python, `len()` counts code points; use the `grapheme` library for true cluster counting. In Java, use `BreakIterator.getCharacterInstance()`.

### Should I truncate on the client or the server?

For UI previews, client-side truncation with CSS (`text-overflow: ellipsis`) is simplest and preserves the full text for screen readers. For fixed-length exports, database constraints, or search result snippets, truncate on the server. Server truncation is required when the full text is too large to transfer to the client.
