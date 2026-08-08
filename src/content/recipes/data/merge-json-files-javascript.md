---
contentType: recipes
slug: merge-json-files-javascript
title: "Merge JSON Files in JavaScript"
description: "Combine multiple JSON files with conflict resolution strategies using Node.js."
metaDescription: "Merge multiple JSON files in JavaScript with conflict resolution. Learn deep merge, shallow merge, and custom strategies with Node.js code examples."
difficulty: intermediate
topics:
  - data
tags:
  - json
  - javascript
  - nodejs
  - data-processing
  - merge
relatedResources:
  - /recipes/merge-json-files
  - /recipes/convert-csv-to-json
  - /recipes/convert-json-to-csv
  - /recipes/diff-json-objects
  - /recipes/parse-csv-files
lastUpdated: "2026-07-01"
publishedAt: "2026-07-01"
author: Mathias Paulenko
seo:
  metaDescription: "Merge multiple JSON files in JavaScript with conflict resolution. Learn deep merge, shallow merge, and custom strategies with Node.js code examples."
  keywords:
    - json
    - javascript
    - nodejs
    - data-processing
    - merge

---
## Overview

Merging JSON files is a common task when combining configuration, aggregating API responses, or building data pipelines. JavaScript offers several approaches, from a simple spread operator to recursive deep merge libraries. Below is a practical approach to the main strategies and when to use each.

## When to Use


- For alternatives, see [Merge JSON Files](/recipes/merge-json-files/).

- You need to combine multiple JSON config files into one
- You are aggregating paginated API responses into a single payload
- You need to merge user settings with defaults without losing nested keys
- You are building a data pipeline that joins JSON from different sources

## Solution

### Shallow merge with spread operator

```javascript
const fileA = require("./config-a.json");
const fileB = require("./config-b.json");

const merged = { ...fileA, ...fileB };
// fileB values overwrite fileA at the top level only
```

### Reading and merging multiple files with fs

```javascript
const fs = require("fs");
const path = require("path");

function mergeJsonFiles(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const result = {};

  for (const file of files) {
    const content = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
    Object.assign(result, content);
  }

  return result;
}

const merged = mergeJsonFiles("./configs");
```

### Deep merge with a recursive function

```javascript
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (
      typeof source[key] === "object" &&
      source[key] !== null &&
      !Array.isArray(source[key])
    ) {
      target[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const defaults = { api: { timeout: 5000, retries: 3 }, log: { level: "info" } };
const user = { api: { timeout: 10000 }, log: { format: "json" } };

const merged = deepMerge({}, defaults);
deepMerge(merged, user);
// Result: { api: { timeout: 10000, retries: 3 }, log: { level: "info", format: "json" } }
```

### Using lodash for deep merge

```javascript
const _ = require("lodash");

const defaults = { api: { timeout: 5000, retries: 3 } };
const user = { api: { timeout: 10000 } };

const merged = _.merge({}, defaults, user);
// lodash merges nested objects without overwriting sibling keys
```

### Custom conflict resolution

```javascript
function mergeWithConflictResolution(sources, resolver) {
  const result = {};

  for (const source of sources) {
    for (const key of Object.keys(source)) {
      if (key in result && !deepEqual(result[key], source[key])) {
        result[key] = resolver(key, result[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }

  return result;
}

// Example: last value wins, but log the conflict
const merged = mergeWithConflictResolution(
  [fileA, fileB, fileC],
  (key, oldVal, newVal) => {
    console.warn(`Conflict on "${key}": using new value`);
    return newVal;
  }
);
```

## Explanation

Shallow merge (`{ ...a, ...b }`) only merges top-level keys. If both objects have a nested object at the same key, the second one replaces the first entirely. This is fine for flat configs.

Deep merge recursively walks nested objects, combining keys at every level. This is what you want when merging configs with nested sections (database settings, API options, etc.).

Arrays are tricky. Most deep merge implementations replace arrays rather than concatenating them. If you need array concatenation, use a custom resolver or lodash with `mergeWith` and a customizer.

## Variants

| Approach | Handles Nesting | Handles Arrays | Dependency |
|----------|----------------|----------------|------------|
| Spread operator | No (top level only) | Overwrites | None |
| Object.assign | No (top level only) | Overwrites | None |
| Custom deepMerge | Yes | Overwrites | None |
| lodash _.merge | Yes | Overwrites | lodash |
| lodash mergeWith | Yes | Customizable | lodash |

## Guidelines

- Use shallow merge for flat configs. It is simpler and faster.
- Use deep merge when configs have nested sections that should combine, not replace.
- Decide on array behavior explicitly. Default deep merge replaces arrays; you may want concatenation.
- Validate merged output with a schema (AJV, Joi) before using it in production.
- Log conflicts when merging from multiple untrusted sources.

## Common Mistakes

- Using spread operator for nested configs and losing keys silently. `{ ...a, ...b }` replaces `a.nested` entirely with `b.nested`.
- Mutating source objects. Always start with a fresh object: `deepMerge({}, source1, source2)`.
- Assuming arrays merge by concatenation. They do not. Most implementations overwrite.
- Not handling `null` values. `null` is an object in `typeof`, so deep merge may recurse into it.
- Forgetting that `JSON.parse` can throw. Wrap file reads in try/catch.

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
## Integration Patterns

- **API request validation pipeline**: validate request body against schema (pydantic/zod) -> sanitize input (strip whitespace, normalize encoding) -> authorize (check permissions) -> process.
- **Event-driven data processing**: when data changes, publish an event.  Consumers validate and process the event independently.
- **CQRS with separate read/write models**: write model validates and stores data.  Read model projects data into optimized query structures.  Validation happens only on the write side.
- **Data contract enforcement**: define data contracts between services using JSON Schema or Protobuf.  Validate at both producer and consumer sides.
- **Batch validation with reporting**: validate 10,000+ records in batch.
- **Real-time validation with feedback**: validate data as it arrives.  Send immediate feedback to the data source (API response, UI error message).

## Error Handling and Recovery

- **Validation error aggregation**: collect all validation errors for a single input, not just the first one.  Return all errors to the client so they can fix everything in one round-trip.  Pydantic supports this with ValidationError.
- **Retry with backoff for transient failures**: if validation fails due to a transient dependency (e. g. , reference data service is down), retry with exponential backoff.
- **Circuit breaker for validation dependencies**: if a reference data service (needed for validation) is down, open a circuit breaker.
- **Compensating transactions for validation failures**: if validation fails after partial processing (e. g.
- **Dead letter queue for invalid records**: records that fail validation go to a dead letter queue for manual inspection.
- **Schema evolution with backward compatibility**: when updating a schema, ensure backward compatibility.  New required fields must have defaults.  Removed fields should be optional for one release cycle before deletion.

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

- **Apply merge json files in javascript** when you need a practical solution for your use case.
- **Monitor performance** after implementation; measure latency, errors, and resource usage before and after.
- **Check the Troubleshooting section** for common failures; most have documented root causes with fixes.
- **Keep dependencies updated** and run tests in CI to prevent production regressions.

## FAQ

### How do I merge arrays instead of replacing them?

Use lodash `mergeWith` with a customizer that concatenates arrays:

```javascript
const merged = _.mergeWith({}, a, b, (objVal, srcVal) => {
  if (Array.isArray(objVal) && Array.isArray(srcVal)) {
    return objVal.concat(srcVal);
  }
});
```

### What is the difference between Object.assign and spread?

They are equivalent for plain objects. `{ ...a, ...b }` is syntactic sugar for `Object.assign({}, a, b)`. Both do shallow merge.

### How do I merge JSON files asynchronously?

Use `fs.promises.readFile` and `Promise.all`:

```javascript
const files = ["a.json", "b.json"];
const contents = await Promise.all(
  files.map((f) => fs.promises.readFile(f, "utf-8").then(JSON.parse))
);
const merged = contents.reduce((acc, obj) => deepMerge(acc, obj), {});
```

### Should I use a library or write my own deep merge?

Write your own only if the logic is simple and you want zero dependencies. For production code, lodash `_.merge` is well-tested and handles edge cases like `null`, arrays, and circular references.

## Common Production Pitfalls

- Copying the example without adapting it to real data volumes and failure modes.
- Skipping load and error-injection tests before the first production deployment.
- Hard-coding values that should be configurable per environment.
- Forgetting to add logging and monitoring at each step.
- Deploying without a rollback plan or a tested backup strategy.
- Assuming the minimal example will scale without adding caching or batching.
- Not documenting the version and configuration used in production.
- Letting the recipe sit unchanged when dependencies or scale evolve.
