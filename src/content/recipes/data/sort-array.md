---
contentType: recipes
slug: sort-array
title: "Sort an Array"
description: "How to sort arrays and lists in ascending, descending, and custom order across multiple languages."
metaDescription: "Practical array sorting examples in Python, JavaScript, and Java. Learn ascending, descending, and custom comparator patterns."
difficulty: beginner
topics:
  - data
tags:
  - sorting
  - array
  - python
  - javascript
  - java
relatedResources:
  - /recipes/parse-json
  - /recipes/unit-testing
  - /recipes/date-formatting
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Practical array sorting examples in Python, JavaScript, and Java. Learn ascending, descending, and custom comparator patterns."
  keywords:
    - sort array
    - sorting
    - list sort
    - comparator
---

## Overview

Sorting is one of the most common data manipulation tasks. Every language provides built-in, optimized sorting utilities. This recipe shows how to sort arrays and lists in ascending order, descending order, and by custom criteria (e.g., by a property or with a custom comparator).

## When to Use

Use this recipe when:

- Displaying data in a specific order (alphabetical, chronological, by priority)
- Preparing data for algorithms that require sorted input (binary search, merge)
- Normalizing data before comparison or deduplication
- Implementing ranking, leaderboards, or search result ordering

## Solution

### Python

```python
numbers = [3, 1, 4, 1, 5, 9, 2, 6]

# Ascending (default)
asc = sorted(numbers)
# [1, 1, 2, 3, 4, 5, 6, 9]

# Descending
 desc = sorted(numbers, reverse=True)
# [9, 6, 5, 4, 3, 2, 1, 1]

# Sort objects by key
users = [
    {"name": "Bob", "age": 30},
    {"name": "Ada", "age": 36},
    {"name": "Chen", "age": 25},
]
by_age = sorted(users, key=lambda u: u["age"])
# Chen (25), Bob (30), Ada (36)

# Sort in-place
numbers.sort()
```

### JavaScript

```javascript
const numbers = [3, 1, 4, 1, 5, 9, 2, 6];

// Ascending
const asc = numbers.toSorted((a, b) => a - b);
// [1, 1, 2, 3, 4, 5, 6, 9]

// Descending
const desc = numbers.toSorted((a, b) => b - a);
// [9, 6, 5, 4, 3, 2, 1, 1]

// Sort objects by property
const users = [
  { name: 'Bob', age: 30 },
  { name: 'Ada', age: 36 },
  { name: 'Chen', age: 25 },
];
const byAge = users.toSorted((a, b) => a.age - b.age);
// Chen (25), Bob (30), Ada (36)

// In-place sort
numbers.sort((a, b) => a - b);
```

### Java

```java
import java.util.*;

List<Integer> numbers = new ArrayList<>(List.of(3, 1, 4, 1, 5, 9, 2, 6));

// Ascending
Collections.sort(numbers);
// [1, 1, 2, 3, 4, 5, 6, 9]

// Descending
numbers.sort(Collections.reverseOrder());
// [9, 6, 5, 4, 3, 2, 1, 1]

// Sort objects by field
record User(String name, int age) {}
List<User> users = List.of(
    new User("Bob", 30),
    new User("Ada", 36),
    new User("Chen", 25)
);
List<User> byAge = users.stream()
    .sorted(Comparator.comparingInt(User::age))
    .toList();
// Chen (25), Bob (30), Ada (36)

// Custom comparator (name length descending)
users.stream()
    .sorted(Comparator.comparingInt((User u) -> u.name().length()).reversed())
    .toList();
```

## Explanation

- **Stability**: Python and JavaScript use Timsort, which is stable (equal elements keep their original order). Java's `Collections.sort()` also uses Timsort and is stable.
- **Comparator contract**: a comparator returns a negative number if `a < b`, zero if equal, and positive if `a > b`. Violating this contract (e.g., inconsistent results) causes undefined behavior.
- **In-place vs. copy**: `list.sort()` and `Arrays.sort()` modify the original; `sorted()` and `toSorted()` return a new collection. Prefer immutable copies unless memory is constrained.
- **Time complexity**: built-in sorts are `O(n log n)` average and worst case. For specialized data (integers in a small range), counting sort can be `O(n)`.

## Variants

| Task | Python | JavaScript | Java |
|------|--------|------------|------|
| Ascending | `sorted(lst)` | `toSorted((a,b)=>a-b)` | `Collections.sort(list)` |
| Descending | `sorted(lst, reverse=True)` | `toSorted((a,b)=>b-a)` | `sort(reverseOrder())` |
| By key/property | `sorted(lst, key=fn)` | `toSorted((a,b)=>a.p-b.p)` | `sorted(Comparator.comparing(...))` |
| In-place | `lst.sort()` | `lst.sort(...)` | `list.sort(...)` |

## Best Practices

- **Use built-in sorts**: do not implement your own sorting algorithm unless you have a very specific performance profile (e.g., nearly-sorted data).
- **Keep comparators pure**: comparator functions should not mutate data or depend on external state.
- **Handle ties explicitly**: if two items are equal on the primary key, sort by a secondary key to ensure deterministic order.
- **Prefer immutability**: returning a new sorted array/list avoids surprising side effects in the calling code.
- **Locale-aware sorting**: for user-facing strings, use locale-sensitive collation (`localeCompare` in JS, `locale.strxfrm` in Python) rather than raw code-point comparison.

## Common Mistakes

- **Sorting numbers alphabetically in JavaScript**: `[10, 2].sort()` produces `[10, 2]` because default sort converts elements to strings. Always pass a comparator for numbers.
- **Mutating during sort**: modifying the array being sorted (e.g., in a comparator with side effects) causes unpredictable results.
- **Inconsistent comparator**: returning only `1` and `-1` without `0` for equality can cause crashes or wrong results in some implementations.
- **Sorting huge datasets in memory**: for datasets larger than available RAM, use external sorting or database `ORDER BY`.
- **Assuming all sorts are stable**: while most modern languages use stable sorts, do not rely on stability unless documented. Explicitly sort by secondary keys when order matters.

## Frequently Asked Questions

**Q: Why does `[10, 2].sort()` return `[10, 2]` in JavaScript?**
A: The default `sort()` converts elements to strings and compares UTF-16 code units. `"10"` comes before `"2"` lexicographically. Always pass `(a, b) => a - b` for numeric sorts.

**Q: How do I sort by multiple fields?**
A: In Python, return a tuple from the key function: `sorted(users, key=lambda u: (u.country, u.age))`. In JavaScript, chain comparisons: `(a, b) => a.country.localeCompare(b.country) || a.age - b.age`.

**Q: Is in-place sorting faster than creating a new sorted copy?**
A: Slightly, because it avoids allocating a new array. However, for most applications the difference is negligible. Prefer immutability unless profiling shows a bottleneck.
