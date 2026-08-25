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
  - parsing
  - json
relatedResources:
  - /recipes/parse-json
  - /recipes/handle-errors
  - /recipes/sort-array
  - /recipes/deep-clone-javascript
  - /recipes/flatten-unflatten-objects
  - /recipes/generate-slugs
  - /recipes/money-currency
  - /recipes/parse-csv-files
  - /recipes/parse-xml-files
  - /recipes/url-encoding
lastUpdated: "2026-06-10"
publishedAt: "2026-06-10"
author: Mathias Paulenko
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

Despite their cryptic syntax, regex is indispensable for working with unstructured text, form validation, log parsing, and data cleaning. Related recipes: [Parse Log Files](/recipes/parse-log-files/).

## When to Use

Use this recipe when:

- Validating email addresses, phone numbers, or IDs. See [Data Validation](/recipes/data-validation/) for schema-based approaches.
- Extracting data from unstructured text or [log files](/recipes/logging/)
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

- **Always escape special characters** when building regex live. See [Input Validation](/recipes/input-validation/) for safe string handling.
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

## When Not to Use This Approach

- **Schema is unknown or frequently changing**: if the data structure changes weekly, rigid validation schemas become a maintenance burden.
- **Data fits in a database**: if the data needs querying, indexing, or transactions, storing it in JSON files and manipulating in-memory is the wrong approach.
- **Real-time validation of streaming data**: batch validation of JSON payloads is too slow for streaming.
- **Simple type checking**: if you only need to verify a value is a string or number, a full schema validator is overkill.
- **CPU-bound transformations on large datasets**: if processing 10M+ records takes minutes, in-memory manipulation hits limits.
- **Distributed data processing**: if data spans multiple machines, local JSON manipulation does not work.

## Performance Benchmarks

- **JSON serialization**: json. dumps() in Python serializes 1MB of data in 30-100ms.  orjson serializes the same data in 5-15ms.
- **Schema validation**: jsonschema validates 10,000 JSON documents against a schema in 2-10 seconds.  pydantic validates the same volume in 0. 5-2 seconds.
- **Deep clone performance**: copy. deepcopy() on a 1MB Python object takes 50-200ms.  json. loads(json. dumps(obj)) takes 30-80ms but loses non-serializable types.
- **Sort performance**: Python sorted() on 1M integers takes 200-400ms. 
umpy.sort() on the same array takes 50-100ms. JavaScript Array.sort() on 1M numbers takes 100-300ms (V8 Timsort)
- **Diff performance**: difflib comparing two 10,000-line files takes 500ms-2s.  deepdiff comparing two 1MB JSON objects takes 200ms-1s.
- **Regex performance**: compiled regex in Python matches 1M strings in 50-200ms.  Uncompiled regex takes 2-5x longer.

## Testing Strategy

- **Test with edge-case data**: empty objects, null values, nested arrays, Unicode strings, very large numbers (>2^53), and mixed-type arrays.
- **Test serialization round-trips**: serialize an object, deserialize it, and compare.  Round-trip testing catches data loss from type coercion (e. g.
- **Test schema validation failures**: verify that invalid data is rejected with clear error messages.
- **Test with adversarial input**: deeply nested JSON (10,000 levels), huge strings (1MB+), many keys (100,000+), and duplicate keys.
- **Test sort stability**: verify that equal elements maintain their original order.  Python's sorted() is stable.  JavaScript's Array. sort() is stable in V8 since ES2019.
- **Test regex against malicious input**: patterns like (a+)+b cause catastrophic backtracking on input like aaaaaaaaaaaaaaaaaaa!.

## Cost Estimation

- **Validation overhead**: schema validation adds 5-20% latency to request processing.  For a service handling 10,000 req/s, this costs 1-2 extra CPU cores (-100/month).
- **Memory for large JSON**: a 500MB JSON file uses 2-3GB in memory after parsing (Python dict overhead).
- **Caching infrastructure**: Redis for caching validated data costs -200/month for a 10GB cache.  Memcached is cheaper but lacks persistence.
- **Development cost**: writing custom validators takes 4-16 hours per data type.  Using pydantic or zod reduces this to 1-2 hours.
- **Serialization format tradeoffs**: JSON is human-readable but 2-5x larger than binary formats.

## Monitoring and Observability

- **Validation error rate**: track the percentage of inputs that fail validation.  Alert when error rate exceeds 5%.
- **Serialization duration**: monitor time spent serializing/deserializing.
- **Cache hit rate**: if caching validated data, monitor hit rate.
- **Memory usage of data structures**: monitor peak memory after loading large JSON objects.
- **Regex execution time**: log slow regex operations (>100ms).  Slow regexes on user input are a DoS vector.

## Deployment Checklist

- [ ] Set maximum payload size: reject JSON payloads larger than 1MB (or appropriate limit) at the load balancer. Return HTTP 413 for oversized payloads
- [ ] Configure schema versioning: include a schema version field in validated data. Reject data with unknown versions to prevent silent schema drift
- [ ] Set recursion depth limits: for recursive validation or serialization, set a maximum depth (e.g., 100). Reject data that exceeds the limit to prevent stack overflow
- [ ] Enable caching for validated data: cache validation results with a TTL. Use the raw input hash as the cache key. Invalidate on schema changes
- [ ] Configure error responses: return structured validation errors with field paths and messages. Do not expose internal schema details in error responses
- [ ] Set regex timeouts: use 
e.TIMEOUT (Python 3.11+) or run regex in a separate process with a timeout. Kill regex operations that exceed 1 second

## Security Considerations

- **Prototype pollution via JSON merge**: merging user-supplied JSON with __proto__ or constructor keys can pollute JavaScript object prototypes.
- **Deserialization attacks**: pickle. loads() in Python and unserialize() in PHP execute arbitrary code.  Never deserialize untrusted data with these formats.
- **Regex DoS (ReDoS)**: patterns with nested quantifiers like (a+)+ cause exponential backtracking.  An attacker can hang the server with a 30-character input.
- **JSON injection via key collision**: duplicate keys in JSON ({"role": "user", "role": "admin") are handled differently by parsers.  Python uses the last value, JavaScript uses the last value, but some parsers use the first.
- **Cache poisoning via validation bypass**: if validation results are cached by input hash, an attacker who finds a hash collision can inject a cached "valid" result for invalid input.
- **Type confusion in dynamic languages**: isinstance(x, int) returns True for True in Python (bool is a subclass of int).
- **Information leakage in error messages**: validation errors that include schema details, internal field names, or stack traces help attackers understand the system.
- **Deep clone bypassing security checks**: if a security-sensitive object is cloned and the clone skips validation, an attacker can modify the clone to bypass checks.
- **Sort comparator injection**: if sort comparators come from user input, an attacker can provide a comparator that throws or hangs.
- **Diff leaking sensitive data**: if diff output is logged or displayed, it may expose sensitive fields (passwords, tokens).
- **Cache key enumeration**: if cache keys are sequential or predictable, an attacker can enumerate cached data.
- **Regex-based input validation bypass**: ^pattern$ with 
e.DOTALL allows . to match newlines, potentially bypassing line-based validation. Use 
e.ASCII and explicit anchors for security-sensitive regexes
## Variants and Alternatives

- **Schema-first vs code-first validation**: JSON Schema, OpenAPI, and Protobuf define schemas in a language-agnostic format.  Pydantic, zod, and joi define schemas in code.
- **Strict vs lenient validation**: strict validation rejects unknown fields.  Lenient validation ignores them.  For APIs, strict validation prevents client errors from typos.
- **Deep copy vs shallow copy vs structural sharing**: deep copy duplicates everything (expensive, safe).  Shallow copy shares references (fast, unsafe for mutation).  Structural sharing (used in immutable.
- **In-place sort vs copy sort**: list. sort() sorts in-place (0 extra memory).  sorted() returns a new list (O(n) memory).  For large datasets, in-place sort is preferred.
- **Centralized vs distributed caching**: Redis/Memcached are centralized caches shared across instances.  In-process caches (LRU, functools. lru_cache) are faster but not shared.
- **Sync vs async validation**: synchronous validation blocks the event loop.  Async validation allows concurrent validation of multiple payloads.

## Common Pitfalls in Production

- **Schema evolution breaks**: adding a required field breaks existing clients.  Removing a field breaks consumers that depend on it.
- **Validation order matters**: validate format first (cheap), then type (medium), then business rules (expensive).
- **Silent type coercion**: int("3. 14") raises ValueError but loat("3") succeeds.  JSON parsers coerce strings to numbers in some languages.
- **Cache stampede**: when a cache entry expires, all concurrent requests hit the backend simultaneously.
- **Deep copy performance traps**: copy. deepcopy() on objects with circular references causes infinite recursion.
- **Sort instability with custom keys**: Python's sorted() is stable, but custom key functions that return equal values for different items can produce unexpected orderings.

## Troubleshooting

- **Pipeline output does not match expectations**: validate input schemas, intermediate states, and row counts at each step.
- **Data quality degrades over time**: add data validation checks and anomaly detection.  Define SLIs for freshness, completeness, and accuracy.
- **Job fails intermittently**: look for race conditions, external dependencies, and resource contention.  Retry with idempotency and bounded backoff.
- **Schema changes break consumers**: use schema registries and backward-compatible evolution.
- **Storage costs grow unexpectedly**: audit partition retention, compression, and duplicate copies.  Archive cold data and set lifecycle policies.



## Production Notes

- **Deploy gradually** using canary or blue-green to catch regressions early.
- **Configure alerts** for error rate, p99 latency, and failure rate before enabling in production.
- **Document the rollback** in the runbook; test the procedure in staging at least once per quarter.
- **Review structured logs** with correlation IDs to trace requests end-to-end during incidents.

## Key Takeaways

- **Apply regular expressions** when you need a practical solution for your use case.
- **Monitor performance** after implementation; measure latency, errors, and resource usage before and after.
- **Check the Troubleshooting section** for common failures; most have documented root causes with fixes.
- **Keep dependencies updated** and run tests in CI to prevent production regressions.

## FAQ

**Q: Should I use regex to parse HTML?**
A: No. HTML is not a regular language. Use a proper HTML parser (BeautifulSoup, DOM API, Jsoup).

**Q: What is the difference between `match()` and `search()` in Python?**
A: `match()` checks only at the beginning of the string. `search()` scans the entire string.

**Q: How do I make a regex case-insensitive?**
A: Use the `i` flag (JavaScript), `re.IGNORECASE` (Python), or `Pattern.CASE_INSENSITIVE` (Java).

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Common Production Pitfalls

- Copying the example without adapting it to real data volumes and failure modes.
- Skipping load and error-injection tests before the first production deployment.
- Hard-coding values that should be configurable per environment.
- Forgetting to add logging and monitoring at each step.
- Deploying without a rollback plan or a tested backup strategy.
- Assuming the minimal example will scale without adding caching or batching.
- Not documenting the version and configuration used in production.
- Letting the recipe sit unchanged when dependencies or scale evolve.
