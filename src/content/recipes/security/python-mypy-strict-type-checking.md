---




contentType: recipes
slug: python-mypy-strict-type-checking
title: "Strict Type Checking in Python with mypy"
description: "How to configure mypy strict mode for Python projects, handle common type errors, use Protocol and TypeGuard, and integrate with CI/CD."
metaDescription: "Configure mypy strict mode for Python projects. Handle common type errors, use Protocol, TypeGuard, overload, and integrate with CI/CD pipelines."
difficulty: intermediate
topics:
  - security
tags:
  - security
  - python
  - mypy
  - type-checking
  - code-quality
  - recipe
relatedResources:
  - /recipes/python-bandit-static-analysis
  - /recipes/python-pip-audit-vulnerability-scan
  - /recipes/github-actions-reusable-workflows
  - /recipes/java-spotbugs-static-analysis
  - /recipes/typescript-eslint-strict-config
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Configure mypy strict mode for Python projects. Handle common type errors, use Protocol, TypeGuard, overload, and integrate with CI/CD pipelines."
  keywords:
    - security
    - python
    - mypy
    - type-checking
    - code-quality
    - recipe




---

## Overview

mypy is a static type checker for Python. In strict mode, it enforces type annotations on all functions, catches `None` where `int` was expected, prevents unsafe `Any` usage, and flags missing return statements. Strict type checking catches bugs at development time that would otherwise surface in production — `AttributeError` on `None`, wrong argument types, unhandled `Optional` values.

## When to Use

- Production Python codebases where runtime bugs are costly
- Libraries and APIs consumed by other teams
- Codebases with complex data flows where types help navigation
- When onboarding new developers — types serve as documentation
- CI/CD pipelines to enforce type safety before merge

## When NOT to Use

- Quick scripts or prototypes — the annotation overhead isn't worth it
- Legacy codebases with no existing annotations — start gradual, not strict
- Jupyter notebooks — mypy doesn't integrate well with notebook workflows
- When the team has no TypeScript/mypy experience — start with basic mode first

## Solution

### Install mypy

```bash
pip install mypy

# With useful extensions
pip install mypy types-requests types-pyyaml

# Using poetry
poetry add --group dev mypy
```

### Basic configuration

```ini
# mypy.ini
[mypy]
python_version = 3.12
strict = True
warn_return_any = True
warn_unused_ignores = True
warn_redundant_casts = True
warn_unreachable = True
disallow_untyped_defs = True
disallow_untyped_decorators = True
disallow_any_generics = True
no_implicit_optional = True
check_untyped_defs = True
show_error_codes = True
show_column_numbers = True
pretty = True
```

### Configuration in pyproject.toml

```toml
# pyproject.toml
[tool.mypy]
python_version = "3.12"
strict = true
warn_return_any = true
warn_unused_ignores = true
warn_redundant_casts = true
warn_unreachable = true
show_error_codes = true
show_column_numbers = true
pretty = true

# Per-module overrides
[[tool.mypy.overrides]]
module = "legacy.*"
strict = false
ignore_missing_imports = true

[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false
```

### Annotating functions

```python
from typing import Optional


# BAD — no annotations, mypy strict will error
def process_data(data):
    return data["key"]


# GOOD — full annotations
def process_data(data: dict[str, str]) -> str:
    return data["key"]


# GOOD — handle Optional explicitly
def find_user(user_id: int) -> Optional[dict[str, str]]:
    user = db.get(user_id)
    if user is None:
        return None
    return user


# GOOD — caller handles Optional
user = find_user(42)
if user is not None:
    print(user["name"])
```

### Common mypy errors and fixes

#### error: Missing return statement

```python
# BAD — mypy: Missing return statement
def get_status(code: int) -> str:
    if code == 200:
        return "OK"
    elif code == 404:
        return "Not Found"
    # What about other codes?

# GOOD — exhaustive return
def get_status(code: int) -> str:
    if code == 200:
        return "OK"
    elif code == 404:
        return "Not Found"
    return "Unknown"


# GOOD — use assert_never for exhaustive checking
from typing_extensions import assert_never

def get_status(code: int) -> str:
    if code == 200:
        return "OK"
    elif code == 404:
        return "Not Found"
    else:
        assert_never(f"Unexpected code: {code}")
```

#### error: Argument has incompatible type

```python
# BAD — mypy: Argument 1 has incompatible type "None"
def greet(name: str) -> str:
    return f"Hello, {name}"

user_input: str | None = get_input()
greet(user_input)  # Error: None not compatible with str

# GOOD — check for None first
if user_input is not None:
    greet(user_input)
```

#### error: Item "None" of "Optional[X]" has no attribute

```python
# BAD — mypy: Item "None" of "Optional[User]" has no attribute "name"
user: User | None = get_user(42)
print(user.name)  # Error

# GOOD — narrow the type
if user is not None:
    print(user.name)

# GOOD — use assert (mypy narrows after assert)
assert user is not None
print(user.name)
```

#### error: Returning Any from function

```python
# BAD — mypy: Returning Any from function declared to return str
import json
def get_config() -> str:
    return json.loads('{"key": "value"}')  # json.loads returns Any

# GOOD — cast or validate
from typing import cast
import json

def get_config() -> dict[str, str]:
    data = json.loads('{"key": "value"}')
    return cast(dict[str, str], data)

# BETTER — use TypedDict
from typing import TypedDict

class Config(TypedDict):
    key: str

def get_config() -> Config:
    data = json.loads('{"key": "value"}')
    return Config(**data)
```

### Using Protocol for structural typing

```python
from typing import Protocol


class Readable(Protocol):
    def read(self, size: int = -1) -> bytes: ...


def process_stream(stream: Readable) -> str:
    data = stream.read(1024)
    return data.decode("utf-8")


# Any object with a read() method works — no inheritance needed
class MyReader:
    def read(self, size: int = -1) -> bytes:
        return b"hello"

process_stream(MyReader())  # OK — structurally compatible
process_stream(open("file.txt", "rb"))  # OK — file objects have read()
```

### Using TypeGuard for custom type narrowing

```python
from typing import TypeGuard, Any


def is_str_list(value: list[Any]) -> TypeGuard[list[str]]:
    return all(isinstance(item, str) for item in value)


def process_items(items: list[Any]) -> None:
    if is_str_list(items):
        # mypy knows items is list[str] here
        for item in items:
            print(item.upper())  # OK — str method
```

### Using @overload for multiple signatures

```python
from typing import overload, Literal


@overload
def get_value(key: str, default: str) -> str: ...
@overload
def get_value(key: str, default: int) -> int: ...
@overload
def get_value(key: str, default: None) -> str | None: ...


def get_value(key: str, default: str | int | None) -> str | int | None:
    val = db.get(key)
    if val is None:
        return default
    return val


# mypy knows the return type based on the argument
name: str = get_value("name", "anonymous")  # OK
count: int = get_value("count", 0)  # OK
maybe: str | None = get_value("key", None)  # OK
```

### Generic classes

```python
from typing import Generic, TypeVar

T = TypeVar("T")


class Stack(Generic[T]):
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T | None:
        if not self._items:
            return None
        return self._items.pop()


# Type inference from usage
stack: Stack[int] = Stack()
stack.push(42)
value = stack.pop()  # mypy knows: int | None
```

### Inline type: ignore

```python
# Suppress a specific error code
result = some_untyped_function()  # type: ignore[no-untyped-call]

# Suppress all errors on a line (use sparingly)
data = legacy_parse(input_data)  # type: ignore
```

### CI/CD integration

```yaml
# .github/workflows/mypy.yml
name: mypy Type Check

on: [push, pull_request]

jobs:
  mypy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: |
          pip install mypy
          pip install -r requirements.txt

      - name: Run mypy
        run: mypy src/ --strict --show-error-codes --junit-xml mypy-report.xml

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: mypy-report
          path: mypy-report.xml
```

### Pre-commit hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.11.0
    hooks:
      - id: mypy
        args: [--strict, --show-error-codes]
        additional_dependencies: [types-requests, types-pyyaml]
        exclude: ^(tests/|migrations/)
```

## Variants

### Gradual typing for legacy code

```toml
# pyproject.toml — start lenient, tighten over time
[tool.mypy]
python_version = "3.12"
disallow_untyped_defs = false  # Start here
check_untyped_defs = true
warn_redundant_casts = true
warn_unused_ignores = true

# Tighten specific modules that are already annotated
[[tool.mypy.overrides]]
module = "src.models.*"
strict = true

[[tool.mypy.overrides]]
module = "src.api.*"
strict = true
```

### mypy with Pydantic

```python
from pydantic import BaseModel

class User(BaseModel):
    id: int
    name: str
    email: str | None = None

# mypy understands Pydantic models
user = User(id=1, name="Alice")
user_id: int = user.id  # OK — mypy knows id is int
user_name: str = user.name  # OK
```

### mypy with SQLAlchemy

```python
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)

# mypy knows the types from Mapped
user = session.get(User, 1)
if user:
    print(user.name)  # str
    print(user.email)  # str | None
```

## Best Practices


- For a deeper guide, see [Find Security Issues in Python Code with Bandit](/recipes/python-bandit-static-analysis/).

- Start with `strict = True` for new projects — catching issues early is easier than retrofitting
- Use `show_error_codes = True` — error codes make `# type: ignore[code]` precise
- Use `pretty = True` — readable output with context lines
- Per-module overrides for legacy code — don't block the whole codebase on one module
- Install `types-*` stub packages — provides types for third-party libraries
- Use `assert_never` for exhaustive enum/union checking — catches missing cases
- Run in pre-commit and CI/CD — enforce types before merge
- Review `# type: ignore` comments periodically — some become unnecessary as types improve

## Common Mistakes

- **Starting with strict on a legacy codebase**: hundreds of errors will overwhelm the team. Start lenient and tighten per-module.
- **Using `# type: ignore` without error codes**: `# type: ignore` suppresses everything. Use `# type: ignore[no-untyped-call]` to suppress specific errors.
- **Not installing type stubs**: third-party libraries like `requests` need `types-requests` for mypy to understand them.
- **Ignoring `warn_unused_ignores`**: if a `# type: ignore` becomes unnecessary, this flag catches it.
- **Not using `Optional` explicitly**: `def f(x: int = None)` is not valid in strict mode. Use `def f(x: int | None = None)`.

## FAQ

### What is mypy strict mode?

A configuration that enables all type-checking flags: `disallow_untyped_defs`, `warn_return_any`, `disallow_any_generics`, `no_implicit_optional`, and more. It catches the most type-related bugs but requires full annotations.

### How do I handle third-party libraries without type stubs?

Install `types-*` packages (e.g., `types-requests`). If no stubs exist, use `[[tool.mypy.overrides]]` with `ignore_missing_imports = true` for that module.

### What is the difference between mypy and pyright?

mypy is the original Python type checker, slower but stable. pyright (used by Pylance) is faster and more aggressive. Both follow PEP 484. Use mypy for CI/CD, pyright for IDE feedback.

### Should I use `Optional[X]` or `X | None`?

Both are equivalent. `X | None` is the modern syntax (Python 3.10+). `Optional[X]` is the older syntax. Use `X | None` for new code.

### How do I type a dictionary with specific keys?

Use `TypedDict`:

```python
class UserDict(TypedDict):
    id: int
    name: str
    email: str | None
```

This gives you type checking on dict keys and values.
