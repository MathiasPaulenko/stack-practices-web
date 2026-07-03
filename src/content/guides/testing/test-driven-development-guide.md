---
contentType: guides
slug: test-driven-development-guide
title: "Test-Driven Development (TDD) — A Practical Workflow"
description: "Learn TDD step by step: write a failing test, make it pass, refactor. Red-Green-Refactor with real examples in Python, JavaScript, and Java."
metaDescription: "Test-Driven Development guide: Red-Green-Refactor cycle with practical examples. Learn TDD in Python, JavaScript, and Java with step-by-step workflows."
difficulty: beginner
topics:
  - testing
  - design
tags:
  - guide
  - red-green-refactor
  - tdd
  - test-driven-development
  - testing
  - unit-testing
  - workflow
relatedResources:
  - /guides/testing/testing-strategy-guide
  - /guides/design/clean-code-principles-guide
  - /guides/design/solid-principles-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Test-Driven Development guide: Red-Green-Refactor cycle with practical examples. Learn TDD in Python, JavaScript, and Java with step-by-step workflows."
  keywords:
    - test driven development
    - tdd tutorial
    - red green refactor
    - tdd python
    - tdd javascript
    - unit testing workflow
---

# Test-Driven Development (TDD)

## Introduction

Test-Driven Development is a software development process where tests are written before the production code. It follows a short, repeating cycle: write a failing test, write the minimal code to pass it, then refactor while keeping tests green.

## The Red-Green-Refactor Cycle

```
┌─────────┐    ┌─────────┐    ┌─────────┐
│   Red   │ →  │  Green  │ →  │ Refactor│
│  Write  │    │ Minimal │    │ Improve │
│  Failing│    │  Code   │    │  Design │
│  Test   │    │ to Pass │    │         │
└─────────┘    └─────────┘    └─────────┘
      ↑                           │
      └───────────────────────────┘
```

### 1. Red — Write a Failing Test

Start with a test that describes the behavior you want. Run it and watch it fail.

```python
# test_calculator.py
def test_add_two_numbers():
    calc = Calculator()
    result = calc.add(2, 3)
    assert result == 5
```

```bash
$ pytest test_calculator.py
FAILED: Calculator not defined
```

**Why red first?** A test that passes without any code proves nothing. Watching it fail confirms the test is actually testing something.

### 2. Green — Write Minimal Code

Write the simplest code that makes the test pass. Don't worry about elegance yet.

```python
# calculator.py
class Calculator:
    def add(self, a, b):
        return a + b  # simplest possible implementation
```

```bash
$ pytest test_calculator.py
PASSED
```

**Why minimal?** You want the shortest path to green. Premature abstraction obscures whether the test is actually verifying the right thing.

### 3. Refactor — Improve the Design

Now that the test passes, clean up: rename variables, extract methods, remove duplication. Run the tests after each change.

```python
# Refactored: still passes, but cleaner
class Calculator:
    def add(self, augend, addend):
        return augend + addend
```

**Why refactor while green?** Tests act as a safety net. If a refactor breaks something, you know immediately.

## A Complete Example

Let's build a `ShoppingCart` using TDD.

### Step 1: Empty Cart

```python
def test_empty_cart_total_is_zero():
    cart = ShoppingCart()
    assert cart.total() == 0
```

```python
class ShoppingCart:
    def total(self):
        return 0
```

### Step 2: Add Items

```python
def test_add_item_increases_total():
    cart = ShoppingCart()
    cart.add(Item("apple", 1.50))
    assert cart.total() == 1.50
```

```python
class ShoppingCart:
    def __init__(self):
        self.items = []

    def add(self, item):
        self.items.append(item)

    def total(self):
        return sum(item.price for item in self.items)
```

### Step 3: Apply Discount

```python
def test_apply_discount():
    cart = ShoppingCart()
    cart.add(Item("laptop", 1000))
    cart.apply_discount("SAVE10")
    assert cart.total() == 900
```

```python
class ShoppingCart:
    ...
    def apply_discount(self, code):
        self.discount = 0.10  # hardcoded for now

    def total(self):
        subtotal = sum(item.price for item in self.items)
        if hasattr(self, 'discount'):
            return subtotal * (1 - self.discount)
        return subtotal
```

### Step 4: Refactor — Extract Discount Logic

```python
class Discount:
    def __init__(self, code, percentage):
        self.code = code
        self.percentage = percentage

    def apply(self, amount):
        return amount * (1 - self.percentage)

class ShoppingCart:
    def __init__(self):
        self.items = []
        self.discount = None

    def add(self, item):
        self.items.append(item)

    def apply_discount(self, code):
        discounts = {"SAVE10": 0.10, "SAVE20": 0.20}
        self.discount = Discount(code, discounts.get(code, 0))

    def total(self):
        subtotal = sum(item.price for item in self.items)
        if self.discount:
            return self.discount.apply(subtotal)
        return subtotal
```

## The Three Laws of TDD

1. **You may not write production code until you have a failing unit test.**
2. **You may not write more of a unit test than is sufficient to fail.** (Compilation errors count as failures.)
3. **You may not write more production code than is sufficient to pass the currently failing test.**

## Benefits of TDD

| Benefit | How TDD Delivers |
|---------|-----------------|
| **Confidence** | Every feature is backed by a test that proves it works |
| **Design pressure** | Code must be testable, which tends toward [decoupled, modular designs](/guides/design/solid-principles-guide) |
| **Documentation** | Tests are executable examples of how the code should be used |
| **Regression safety** | Changes are safe because existing tests catch breakages |
| **Debugging time** | Bugs are caught immediately, not discovered days later |

## Common TDD Mistakes

- **Testing implementation, not behavior** — assert on return values, not internal state. See [unit testing](/recipes/testing/unit-testing).
- **Writing too many tests before any code** — keep the cycle tight (minutes, not hours)
- **Skipping the refactor step** — the third step is where [clean code](/guides/design/clean-code-principles-guide) improves
- **Testing trivial getters/setters** — focus on logic and decisions
- **Not running tests frequently** — if you write 50 lines without running tests, you're not doing TDD

## TDD vs. Unit Testing

| | Traditional Unit Testing | TDD |
|---|--------------------------|-----|
| **When tests are written** | After code | Before code |
| **Test coverage** | Often incomplete | Thorough by design |
| **Code design influence** | Minimal | Major (testability drives design) |
| **Debugging effort** | Higher | Lower |

## When TDD Works Best

Use TDD for:
- Business logic with clear inputs and outputs
- Algorithmic code
- APIs and service boundaries
- Code you expect to change frequently

Use caution with:
- UI components (use component tests instead)
- Exploratory prototyping
- Tightly coupled legacy code ([refactor](/guides/design/clean-code-principles-guide) to testability first)

## What Works

- **Keep tests fast** — a slow test suite discourages running it
- **One concept per test** — a test failure should point to exactly one problem
- **Use descriptive test names** — the name should explain the scenario and expected outcome
- **Avoid test interdependence** — each test should create its own state
- **Refactor tests too** — duplicated test setup is a smell; use fixtures and helpers

## Frequently Asked Questions

**Q: Does TDD slow down development?**
A: Initially yes, but it pays back in reduced debugging and safer refactoring. Studies show TDD can reduce defect rates by 40-90%.

**Q: What if I don't know what the API should look like yet?**
A: TDD is a design tool. Writing the test first helps you discover the API shape. If you're truly exploring, a quick spike is fine — then rewrite with TDD once you understand the problem.

**Q: Should I use TDD for every single function?**
A: No. Focus on code with behavior worth verifying. Simple data transfer objects or configuration often don't need dedicated unit tests.

### How do I get started with this in an existing project?

Start with a small, isolated part of your codebase. Apply the concepts from this guide to one module or service. Measure the impact, then expand to other areas.

### What tools do I need?

The tools mentioned throughout this guide are listed in each section. Most are open-source and widely adopted. Check the related resources for setup instructions.

### How do I measure success after implementing this?

Define clear metrics before starting: performance benchmarks, error rates, or maintainability indicators. Compare before and after. Iterate based on the data, not on assumptions.
