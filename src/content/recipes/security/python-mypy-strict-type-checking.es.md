---




contentType: recipes
slug: python-mypy-strict-type-checking
title: "Type Checking Estricto en Python con mypy"
description: "Cómo configurar mypy strict mode para proyectos Python, manejar errores de tipo comunes, usar Protocol y TypeGuard, e integrar con CI/CD."
metaDescription: "Configura mypy strict mode para proyectos Python. Maneja errores de tipo comunes, usa Protocol, TypeGuard, overload e integra con pipelines CI/CD."
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
  metaDescription: "Configura mypy strict mode para proyectos Python. Maneja errores de tipo comunes, usa Protocol, TypeGuard, overload e integra con pipelines CI/CD."
  keywords:
    - security
    - python
    - mypy
    - type-checking
    - code-quality
    - recipe




---

## Overview

mypy es un static type checker para Python. En strict mode, enforza type annotations en todas las funciones, atrapa `None` donde se esperaba `int`, previene uso inseguro de `Any`, y flagea return statements faltantes. El type checking estricto atrapa bugs en tiempo de desarrollo que de otra forma surgirían en producción — `AttributeError` en `None`, argumentos de tipo equivocado, valores `Optional` no manejados.

## When to Use

- Codebases de Python de producción donde los bugs en runtime son costosos
- Librerías y APIs consumidas por otros equipos
- Codebases con data flows complejos donde los types ayudan a la navegación
- Cuando onboarding nuevos developers — los types sirven como documentación
- Pipelines CI/CD para enforzar type safety antes del merge

## When NOT to Use

- Scripts rápidos o prototipos — el overhead de annotation no vale la pena
- Codebases legacy sin annotations existentes — empezá gradual, no strict
- Jupyter notebooks — mypy no se integra bien con workflows de notebook
- Cuando el equipo no tiene experiencia con TypeScript/mypy — empezá con basic mode primero

## Solution

### Instalar mypy

```bash
pip install mypy

# Con extensiones útiles
pip install mypy types-requests types-pyyaml

# Usando poetry
poetry add --group dev mypy
```

### Configuración básica

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

### Configuración en pyproject.toml

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

# Overrides por módulo
[[tool.mypy.overrides]]
module = "legacy.*"
strict = false
ignore_missing_imports = true

[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false
```

### Anotar funciones

```python
from typing import Optional


# BAD — sin annotations, mypy strict va a error
def process_data(data):
    return data["key"]


# GOOD — annotations completas
def process_data(data: dict[str, str]) -> str:
    return data["key"]


# GOOD — manejar Optional explícitamente
def find_user(user_id: int) -> Optional[dict[str, str]]:
    user = db.get(user_id)
    if user is None:
        return None
    return user


# GOOD — caller maneja Optional
user = find_user(42)
if user is not None:
    print(user["name"])
```

### Errores comunes de mypy y fixes

#### error: Missing return statement

```python
# BAD — mypy: Missing return statement
def get_status(code: int) -> str:
    if code == 200:
        return "OK"
    elif code == 404:
        return "Not Found"
    # ¿Qué pasa con otros códigos?

# GOOD — return exhaustivo
def get_status(code: int) -> str:
    if code == 200:
        return "OK"
    elif code == 404:
        return "Not Found"
    return "Unknown"


# GOOD — usar assert_never para checking exhaustivo
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
greet(user_input)  # Error: None no compatible con str

# GOOD — chequear None primero
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

# GOOD — usar assert (mypy narrow después de assert)
assert user is not None
print(user.name)
```

#### error: Returning Any from function

```python
# BAD — mypy: Returning Any from function declared to return str
import json
def get_config() -> str:
    return json.loads('{"key": "value"}')  # json.loads retorna Any

# GOOD — cast o validar
from typing import cast
import json

def get_config() -> dict[str, str]:
    data = json.loads('{"key": "value"}')
    return cast(dict[str, str], data)

# MEJOR — usar TypedDict
from typing import TypedDict

class Config(TypedDict):
    key: str

def get_config() -> Config:
    data = json.loads('{"key": "value"}')
    return Config(**data)
```

### Usar Protocol para structural typing

```python
from typing import Protocol


class Readable(Protocol):
    def read(self, size: int = -1) -> bytes: ...


def process_stream(stream: Readable) -> str:
    data = stream.read(1024)
    return data.decode("utf-8")


# Cualquier objeto con un método read() funciona — sin herencia necesaria
class MyReader:
    def read(self, size: int = -1) -> bytes:
        return b"hello"

process_stream(MyReader())  # OK — estructuralmente compatible
process_stream(open("file.txt", "rb"))  # OK — file objects tienen read()
```

### Usar TypeGuard para custom type narrowing

```python
from typing import TypeGuard, Any


def is_str_list(value: list[Any]) -> TypeGuard[list[str]]:
    return all(isinstance(item, str) for item in value)


def process_items(items: list[Any]) -> None:
    if is_str_list(items):
        # mypy sabe que items es list[str] aquí
        for item in items:
            print(item.upper())  # OK — método de str
```

### Usar @overload para múltiples signatures

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


# mypy sabe el return type basado en el argumento
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


# Type inference desde el uso
stack: Stack[int] = Stack()
stack.push(42)
value = stack.pop()  # mypy sabe: int | None
```

### Inline type: ignore

```python
# Suprimir un error code específico
result = some_untyped_function()  # type: ignore[no-untyped-call]

# Suprimir todos los errors en una línea (usar con moderación)
data = legacy_parse(input_data)  # type: ignore
```

### Integración con CI/CD

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

### Gradual typing para código legacy

```toml
# pyproject.toml — empezar lenient, tightenar over time
[tool.mypy]
python_version = "3.12"
disallow_untyped_defs = false  # Empezar aquí
check_untyped_defs = true
warn_redundant_casts = true
warn_unused_ignores = true

# Tightenar módulos específicos que ya están anotados
[[tool.mypy.overrides]]
module = "src.models.*"
strict = true

[[tool.mypy.overrides]]
module = "src.api.*"
strict = true
```

### mypy con Pydantic

```python
from pydantic import BaseModel

class User(BaseModel):
    id: int
    name: str
    email: str | None = None

# mypy entiende Pydantic models
user = User(id=1, name="Alice")
user_id: int = user.id  # OK — mypy sabe que id es int
user_name: str = user.name  # OK
```

### mypy con SQLAlchemy

```python
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)

# mypy conoce los types desde Mapped
user = session.get(User, 1)
if user:
    print(user.name)  # str
    print(user.email)  # str | None
```

## Best Practices


- For a deeper guide, see [Find Security Issues in Python Code with Bandit](/es/recipes/python-bandit-static-analysis/).

- Empezá con `strict = True` para proyectos nuevos — atrapar issues early es más fácil que retrofitting
- Usá `show_error_codes = True` — los error codes hacen `# type: ignore[code]` preciso
- Usá `pretty = True` — output legible con context lines
- Overrides por módulo para código legacy — no bloquees todo el codebase por un módulo
- Instalá `types-*` stub packages — provee types para librerías de terceros
- Usá `assert_never` para checking exhaustivo de enum/union — atrapa cases faltantes
- Corré en pre-commit y CI/CD — enforzá types antes del merge
- Revisá los comentarios `# type: ignore` periódicamente — algunos se vuelven innecesarios a medida que los types mejoran

## Common Mistakes

- **Empezar con strict en un codebase legacy**: cientos de errors van a abrumar al equipo. Empezá lenient y tightená por módulo.
- **Usar `# type: ignore` sin error codes**: `# type: ignore` suprime todo. Usá `# type: ignore[no-untyped-call]` para suprimir errors específicos.
- **No instalar type stubs**: librerías de terceros como `requests` necesitan `types-requests` para que mypy las entienda.
- **Ignorar `warn_unused_ignores`**: si un `# type: ignore` se vuelve innecesario, este flag lo atrapa.
- **No usar `Optional` explícitamente**: `def f(x: int = None)` no es válido en strict mode. Usá `def f(x: int | None = None)`.

## FAQ

### ¿Qué es mypy strict mode?

Una configuración que habilita todos los flags de type-checking: `disallow_untyped_defs`, `warn_return_any`, `disallow_any_generics`, `no_implicit_optional`, y más. Atrapa la mayoría de los bugs relacionados con types pero requiere annotations completas.

### ¿Cómo manejo librerías de terceros sin type stubs?

Instalá `types-*` packages (e.g., `types-requests`). Si no existen stubs, usá `[[tool.mypy.overrides]]` con `ignore_missing_imports = true` para ese módulo.

### ¿Cuál es la diferencia entre mypy y pyright?

mypy es el original Python type checker, más lento pero estable. pyright (usado por Pylance) es más rápido y agresivo. Ambos siguen PEP 484. Usá mypy para CI/CD, pyright para IDE feedback.

### ¿Debería usar `Optional[X]` o `X | None`?

Ambos son equivalentes. `X | None` es la sintaxis moderna (Python 3.10+). `Optional[X]` es la sintaxis older. Usá `X | None` para código nuevo.

### ¿Cómo tipeo un dictionary con keys específicas?

Usá `TypedDict`:

```python
class UserDict(TypedDict):
    id: int
    name: str
    email: str | None
```

Esto te da type checking en dict keys y values.
