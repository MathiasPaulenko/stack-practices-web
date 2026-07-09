---
contentType: recipes
slug: python-coverage-pytest-cov
title: "Medir Cobertura de Tests con pytest-cov"
description: "Cómo medir y exigir umbrales de cobertura de tests en Python con pytest-cov, incluyendo branch coverage, reportes HTML, exclusiones e integración con CI."
metaDescription: "Mide y exige cobertura de tests en Python con pytest-cov. Genera reportes HTML, branch coverage, excluye líneas y falla CI con umbrales bajos de cobertura."
difficulty: beginner
topics:
  - testing
tags:
  - testing
  - python
  - pytest
  - coverage
  - pytest-cov
  - ci
  - recipe
relatedResources:
  - /recipes/testing/python-pytest-fixtures-parametrize
  - /recipes/testing/measure-test-coverage
  - /recipes/testing/python-mock-external-apis-responses
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Mide y exige cobertura de tests en Python con pytest-cov. Genera reportes HTML, branch coverage, excluye líneas y falla CI con umbrales bajos de cobertura."
  keywords:
    - testing
    - python
    - pytest
    - coverage
    - pytest-cov
    - ci
    - recipe
---

## Overview

`pytest-cov` es un plugin de pytest que integra la librería `coverage.py`. Mide qué líneas de tu código Python se ejecutan durante los tests y reporta el porcentaje. Puedes exigir umbrales mínimos, generar reportes HTML y trackear branch coverage (paths if/else) — no solo line coverage.

## When to Use

- Medir qué porción de tu codebase está cubierta por tests
- Exigir un umbral mínimo de cobertura en CI (e.g., fallar builds por debajo de 80%)
- Identificar código muerto que nunca se ejecuta por ningún test
- Generar reportes HTML de cobertura para inspección visual de gaps
- Trackear branch coverage para asegurar que ambos lados de if/else estén testeados

## When NOT to Use

- Perseguir 100% de cobertura como meta — 80-90% con buena calidad de test es mejor que 100% con tests triviales
- Medir cobertura para scripts o utilidades one-off — enfócate en código de producción testado
- Usar cobertura como la única métrica de calidad — cobertura alta con malas aserciones da falsa confianza

## Solution

### Setup

```bash
pip install pytest pytest-cov
```

### Run básico de cobertura

```bash
pytest --cov=myapp tests/
```

Esto imprime un resumen en la terminal:

```
---------- coverage: platform linux, python 3.12 ----------
Name                    Stmts   Miss  Cover
-------------------------------------------
myapp/__init__.py           2      0   100%
myapp/models.py            45      5    89%
myapp/services.py          80     12    85%
myapp/api.py               60      8    87%
-------------------------------------------
TOTAL                     187     25    87%
```

### Exigir cobertura mínima

```bash
pytest --cov=myapp --cov-fail-under=80 tests/
```

Si la cobertura cae por debajo de 80%, pytest termina con un código non-zero, fallando CI.

### Reporte HTML

```bash
pytest --cov=myapp --cov-report=html tests/
```

Abre `htmlcov/index.html` en un navegador. Las líneas verdes están cubiertas, las rojas no, con highlighting línea por línea.

### Branch coverage

```bash
pytest --cov=myapp --cov-branch --cov-report=term-missing tests/
```

Branch coverage verifica que tanto el path `if` como el `else` de cada condicional se ejecuten. Line coverage solo puede miss branches donde la condición es siempre true o siempre false en los tests.

### Configuración en `pyproject.toml`

```toml
[tool.pytest.ini_options]
addopts = "--cov=myapp --cov-report=term-missing --cov-report=html --cov-branch"

[tool.coverage.run]
source = ["myapp"]
branch = true
omit = [
    "myapp/__init__.py",
    "myapp/migrations/*",
    "*/tests/*",
]

[tool.coverage.report]
show_missing = true
skip_covered = false
fail_under = 80
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
    "if __name__ == .__main__.:",
]
```

### Excluir líneas específicas

```python
def get_config(key: str, default=None):
    if key in os.environ:
        return os.environ[key]
    return default  # pragma: no cover
```

El comentario `# pragma: no cover` le dice a coverage que ignore esa línea.

### Excluir bloques enteros

```python
if TYPE_CHECKING:
    from myapp.models import User  # pragma: no cover
```

Con la config `exclude_lines` de arriba, cualquier línea que matchee `if TYPE_CHECKING:` y todo lo que está debajo se excluye.

### Cobertura para multiprocessing

```python
# pyproject.toml
[tool.coverage.run]
concurrency = ["multiprocessing", "thread"]
```

### Cobertura con ejecución paralela de tests

```bash
pytest -n auto --cov=myapp --cov-report=term-missing
```

Con `pytest-xdist`, cada worker escribe su propio archivo `.coverage`. Usa `coverage combine` antes de generar el reporte:

```bash
coverage combine
coverage report
coverage html
```

## Variants

### Usar `coverage.py` directamente (sin pytest)

```bash
coverage run -m pytest tests/
coverage report -m
coverage html
```

### Coverage diff con `diff-cover`

```bash
pip install diff-cover
coverage xml
diff-cover coverage.xml --compare-branch=origin/main --html-report=coverage-diff.html
```

Esto muestra cobertura solo para las líneas cambiadas en la rama actual — útil para revisiones de PR.

### Tendencias de cobertura con `coverage-badge`

```bash
pip install coverage-badge
coverage-badge -o coverage-badge.svg
```

Genera un SVG badge con el porcentaje de cobertura actual para tu README.

## Best Practices

- Setea un umbral realista (80-85%) — muy alto fomenta tests triviales solo para alcanzar el número
- Usa branch coverage junto con line coverage — atrapa paths else no testeados
- Excluye archivos de migración, `__init__.py` y archivos de test de la medición de cobertura
- Usa `# pragma: no cover` para código solo de debug, `__repr__` y bloques `if __name__`
- Revisa los reportes de cobertura regularmente — encuentra gaps en paths críticos, no solo el porcentaje general
- Genera XML de cobertura para herramientas de CI (SonarQube, Codecov, Coveralls)

## Common Mistakes

- **Perseguir 100% de cobertura**: escribir tests triviales (`assert True`) para cubrir líneas sin verificar comportamiento.
- **No usar branch coverage**: line coverage de 100% puede aún miss branches `else`.
- **Incluir archivos de test en la cobertura**: `tests/` debería excluirse — estás midiendo código de producción.
- **No combinar archivos de cobertura paralelos**: con `pytest-xdist`, cada worker escribe un archivo separado. Corre `coverage combine` antes de reportar.
- **Excluir demasiado**: si excluyes cada línea difícil de testear, el número pierde sentido.

## FAQ

### ¿Cuál es la diferencia entre line coverage y branch coverage?

Line coverage mide si una línea se ejecutó. Branch coverage mide si ambos paths de un condicional (if/else) se tomaron. Una línea con `if x:` puede tener 100% line coverage pero solo 50% branch coverage si `x` es siempre `True` en los tests.

### ¿Cómo excluyo un archivo entero de la cobertura?

En `pyproject.toml`:

```toml
[tool.coverage.run]
omit = ["myapp/legacy/*", "myapp/migrations/*"]
```

### ¿Cómo obtengo cobertura para un solo archivo de test?

```bash
pytest tests/test_models.py --cov=myapp.models --cov-report=term-missing
```

### ¿Puedo usar pytest-cov con Django o Flask?

Sí. Apunta `--cov` al paquete de tu proyecto:

```bash
pytest --cov=myproject --cov-report=html
```

Para Django, asegúrate de que `DJANGO_SETTINGS_MODULE` esté seteado en tu configuración de test.

### ¿Cómo fallo CI solo cuando la cobertura disminuye?

Usa `diff-cover` con `--fail-under=100` para requerir 100% de cobertura en líneas cambiadas:

```bash
coverage xml
diff-cover coverage.xml --compare-branch=origin/main --fail-under=100
```

### ¿Cómo excluyo líneas de la cobertura?

Agrega `# pragma: no cover` para excluir líneas individuales. Usa `# pragma: no cover <reason>` para documentación. Configura exclusiones en `.coveragerc`:

```ini
[report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise NotImplementedError
    if __name__ == .__main__.:
```

Excluye código de debug, métodos repr, y stubs de métodos abstractos. No excluyas paths de error handling — esos son críticos de testear.

### ¿Cómo mido branch coverage en lugar de line coverage?

Pasa `--cov-branch` a pytest-cov o setea `branch = True` en `.coveragerc`:

```bash
pytest --cov=myapp --cov-branch --cov-report=term-missing
```

Branch coverage reporta si tanto el path true como el false de cada condicional fueron ejecutados. Detecta else branches faltantes y paths de short-circuit evaluation que line coverage no detecta.

### ¿Cómo genero badges de cobertura para mi README?

Usa `coverage-badge` para generar badges SVG desde tu reporte de cobertura:

```bash
pip install coverage-badge
coverage-badge -o coverage.svg
```

Agrega el badge a tu README: `![coverage](coverage.svg)`. En CI, genera el badge como artifact y commitealo a una rama `badges` o subelo a un servicio de badges como shields.io.

### ¿Cómo manejo cobertura con multiprocessing?

Usa `coverage` con `--concurrency=multiprocessing` en `.coveragerc`:

```ini
[run]
concurrency = multiprocessing
parallel = True
```

Esto genera archivos de coverage data separados por proceso. Ejecuta `coverage combine` después de la suite de tests para mergeearlos. Sin esto, la cobertura de procesos child se pierde.

### ¿Cómo integro cobertura con GitHub Actions?

Agrega un step en tu workflow para ejecutar pytest con cobertura y subir el reporte:

```yaml
- run: pytest --cov=myapp --cov-report=xml
- uses: codecov/codecov-action@v4
  with:
    file: ./coverage.xml
```

Codecov publica un comentario en PRs con el diff de cobertura y visualiza líneas no cubiertas. Usa `fail_under` en `.coveragerc` para fallear el job de CI si la cobertura baja de un threshold.
