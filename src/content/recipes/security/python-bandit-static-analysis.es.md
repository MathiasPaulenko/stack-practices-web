---




contentType: recipes
slug: python-bandit-static-analysis
title: "Encontrar Problemas de Seguridad en Código Python con Bandit"
description: "Cómo usar Bandit para escanear código Python en busca de vulnerabilidades de seguridad comunes, configurar ignore lists, integrar con CI/CD e interpretar resultados."
metaDescription: "Escanea código Python en busca de vulnerabilidades de seguridad con Bandit. Configura ignore lists, integra con CI/CD, interpreta resultados y corrige findings comunes."
difficulty: beginner
topics:
  - security
tags:
  - security
  - python
  - bandit
  - static-analysis
  - code-quality
  - recipe
relatedResources:
  - /recipes/python-pip-audit-vulnerability-scan
  - /recipes/python-mypy-strict-type-checking
  - /recipes/github-actions-reusable-workflows
  - /recipes/java-spotbugs-static-analysis
  - /recipes/nodejs-eslint-security-plugin
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Escanea código Python en busca de vulnerabilidades de seguridad con Bandit. Configura ignore lists, integra con CI/CD, interpreta resultados y corrige findings comunes."
  keywords:
    - security
    - python
    - bandit
    - static-analysis
    - code-quality
    - recipe




---

## Overview

Bandit es una herramienta de static analysis que escanea código Python en busca de vulnerabilidades de seguridad comunes. Parsea el AST (Abstract Syntax Tree) y chequea patrones inseguros conocidos — passwords hardcodeadas, shell injection, crypto débil, assert statements en producción, y más. Bandit produce un reporte con niveles de severity (LOW, MEDIUM, HIGH) y niveles de confidence (LOW, MEDIUM, HIGH) para cada finding.

## When to Use

- Escanear proyectos Python en busca de issues de seguridad comunes antes de release
- Integrar security checks en pipelines CI/CD
- Auditar código Python de terceros o dependencias
- Enforzar standards de seguridad a través de un equipo
- Pre-commit hooks para atrapar issues antes de que lleguen al repositorio

## When NOT to Use

- Codebases non-Python — Bandit solo soporta Python
- Detección de vulnerabilidades en runtime — Bandit es static analysis únicamente
- Scanning de vulnerabilidades de dependencias — usá `pip-audit` o `safety` en su lugar
- Cuando necesitás deep taint analysis — Bandit chequea patterns, no data flow

## Solution

### Instalar Bandit

```bash
pip install bandit

# O como dev dependency
pip install bandit[toml]

# Usando poetry
poetry add --group dev bandit

# Usando pipenv
pipenv install --dev bandit
```

### Scan básico

```bash
# Escanear un solo archivo
bandit myapp.py

# Escanear un directorio recursivamente
bandit -r src/

# Escanear con output verbose
bandit -r src/ -v

# Output a un archivo
bandit -r src/ -o bandit-report.txt

# Output JSON para CI/CD
bandit -r src/ -f json -o bandit-report.json

# Reporte HTML
bandit -r src/ -f html -o bandit-report.html
```

### Archivo de configuración

```ini
# .bandit — Configuración de Bandit
[bandit]
# Tests a skipear (por ID)
skips: B101,B104,B105,B601,B602

# Tests a correr (overridea skips si se especifica)
# tests: B201,B301,B501

# Paths a excluir
exclude_dirs: tests,venv,.venv,__pycache__,migrations,build,dist

# Archivos/globs target
targets: src

# Scan recursivo
recursive: true

# Exit en primer failure
# stop_on_failure: true
```

### Configuración YAML (pyproject.toml)

```toml
# pyproject.toml
[tool.bandit]
targets = ["src"]
exclude_dirs = ["tests", "venv", "migrations"]
skips = ["B101", "B104", "B105"]

[tool.bandit.tests]
# Correr solo tests específicos
# tests = ["B201", "B301", "B501"]
```

### Findings comunes de Bandit y sus fixes

#### B101: Assert statements en producción

```python
# BAD — Bandit B101
assert user.is_authenticated, "User not authenticated"

# GOOD — raise explicit exception
if not user.is_authenticated:
    raise PermissionError("User not authenticated")
```

#### B105: String de password hardcodeada

```python
# BAD — Bandit B105
PASSWORD = "admin123"
API_KEY = "sk-abc123"

# GOOD — usar environment variables
import os
PASSWORD = os.environ["APP_PASSWORD"]
API_KEY = os.environ["API_KEY"]
```

#### B602/B603: Subprocess shell injection

```python
# BAD — Bandit B602 (shell=True)
import subprocess
subprocess.call(f"ls {user_input}", shell=True)

# GOOD — pasar args como lista, sin shell
import subprocess
subprocess.call(["ls", user_input])

# GOOD — usar shlex para comandos complejos
import shlex
import subprocess
cmd = f"grep {pattern} {filename}"
subprocess.call(shlex.split(cmd))
```

#### B301/B302: Pickle deserialization

```python
# BAD — Bandit B301
import pickle
data = pickle.loads(user_supplied_bytes)

# GOOD — usar JSON
import json
data = json.loads(user_supplied_string)
```

#### B501: Request con verify=False

```python
# BAD — Bandit B501 (SSL verification disabled)
import requests
response = requests.get(url, verify=False)

# GOOD — siempre verificar SSL
import requests
response = requests.get(url, verify=True)
```

#### B311: Random para crypto

```python
# BAD — Bandit B311 (random no es cryptographically secure)
import random
token = ''.join(random.choices(string.ascii_letters, k=32))

# GOOD — usar secrets module
import secrets
token = ''.join(secrets.choice(string.ascii_letters) for _ in range(32))
# O más simple:
token = secrets.token_urlsafe(32)
```

#### B404: Importar subprocess

```python
# Bandit B404 flags cualquier import de subprocess
# Esto es informational — revisá el uso, no suprimas a ciegas

# Si subprocess es necesario, importalo y usalo de forma segura
import subprocess  # nosec B404 — revisado, usado con shell=False

# O suprimí a nivel de función
def run_command(cmd):
    # nosec B603 — argumentos validados antes de llamar
    return subprocess.run(cmd, shell=False, check=True)
```

### Supresiones inline

```python
# Suprimir un finding específico en una línea
password = "test-password"  # nosec B105 — test fixture, no producción

# Suprimir múltiples findings
import subprocess  # nosec B404,B603 — revisado, shell=False usado

# Suprimir todos los findings en una línea
data = pickle.loads(trusted_data)  # nosec — data de fuente interna confiable
```

### Integración con CI/CD usando GitHub Actions

```yaml
# .github/workflows/bandit.yml
name: Bandit Security Scan

on: [push, pull_request]

jobs:
  bandit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install Bandit
        run: pip install bandit[toml]

      - name: Run Bandit
        run: bandit -r src/ -f json -o bandit-report.json || true

      - name: Check Bandit results
        run: |
          # Fallar si hay findings de severity HIGH
          HIGH_COUNT=$(python -c "
          import json
          with open('bandit-report.json') as f:
              data = json.load(f)
          high = sum(1 for r in data.get('results', []) if r['issue_severity'] == 'HIGH')
          print(high)
          ")
          if [ "$HIGH_COUNT" -gt 0 ]; then
            echo "Found $HIGH_COUNT HIGH severity findings"
            exit 1
          fi

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: bandit-report
          path: bandit-report.json
```

### Pre-commit hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/PyCQA/bandit
    rev: 1.7.9
    hooks:
      - id: bandit
        args: ["-r", "src/", "-ll"]
        exclude: ^(tests/|migrations/)
```

### Baseline file para scanning incremental

```bash
# Generar un baseline de findings actuales
bandit -r src/ -f json -o .bandit-baseline.json

# Correr con baseline — solo muestra findings NUEVOS
bandit -r src/ -b .bandit-baseline.json
```

### Plugin custom de Bandit

```python
# bandit_plugins/no_print_statements.py
from bandit.core import issue
from bandit.core import test_properties as test_properties

@test_properties.checks('Call')
def no_print_statements(context, config):
    if context.call_function_name == 'print':
        return issue.Issue(
            severity=issue.Certainty.MEDIUM,
            confidence=issue.Certainty.HIGH,
            text="Print statement found in production code",
            lineno=context.node.lineno,
        )
```

```bash
# Correr con plugin custom
bandit -r src/ --plugins bandit_plugins/no_print_statements.py
```

## Variants

### Bandit con tox

```ini
# tox.ini
[tox]
envlist = bandit

[testenv:bandit]
deps = bandit
commands = bandit -r src/ -ll -ii
```

### Bandit en Makefile

```makefile
# Makefile
.PHONY: security
security:
	bandit -r src/ -ll -ii -f json -o bandit-report.json
	@echo "Bandit scan complete. Report: bandit-report.json"

.PHONY: security-verbose
security-verbose:
	bandit -r src/ -v
```

### Bandit con filtering de severity

```bash
# Solo mostrar findings MEDIUM y HIGH (-ll = threshold LOW)
bandit -r src/ -ll

# Solo mostrar findings HIGH (-lll = solo HIGH)
bandit -r src/ -lll

# Solo mostrar findings de HIGH confidence (-ii = solo HIGH confidence)
bandit -r src/ -ii

# Combinar: HIGH severity + HIGH confidence
bandit -r src/ -lll -ii
```

## Best Practices


- For a deeper guide, see [Detect Bugs in Java with SpotBugs Static Analysis](/es/recipes/java-spotbugs-static-analysis/).

- Corré Bandit en CI/CD — atrapá issues de seguridad antes del merge
- Usá `-ll` o `-lll` para filtrar ruido — findings de LOW severity son often false positives
- Creá un archivo `.bandit` config — documentá qué tests se skipean y por qué
- Usá baseline files para codebases legacy — no bloquees en issues pre-existentes
- No suprimas findings a ciegas — entendé por qué existe un finding antes de agregar `# nosec`
- Combiná con `pip-audit` — Bandit chequea código, pip-audit chequea dependencias
- Corré en pre-commit hooks — atrapá issues localmente antes de pushear
- Revisá los skips periódicamente — nuevas versiones de Bandit agregan nuevos checks

## Common Mistakes

- **Suprimir findings sin entender**: agregar `# nosec` sin revisar el finding esconde vulnerabilidades reales. Siempre documentá por qué.
- **Correr Bandit solo en src/**: tests y scripts pueden tener issues de seguridad también. Incluilos o revisalos separadamente.
- **Ignorar findings de LOW severity**: algunos findings LOW indican malos patterns que pueden escalar. Revisalos periódicamente.
- **No filtrar código de test**: los archivos de test usan passwords hardcodeadas, asserts y mock objects. Excluí directorios de test o skipeá los tests relevantes.
- **Correr Bandit una sola vez**: el security scanning debería ser continuo, no un audit one-time.

## FAQ

### ¿Qué es Bandit?

Una herramienta de static analysis para Python que escanea código en busca de vulnerabilidades de seguridad comunes parseando el AST y chequeando patrones inseguros conocidos.

### ¿En qué se diferencia Bandit de pip-audit?

Bandit escanea tu source code en busca de patterns de coding inseguros. pip-audit escanea tus dependencias instaladas en busca de CVEs conocidos. Usá ambos para coverage de seguridad comprehensiva.

### ¿Qué significan severity y confidence en Bandit?

Severity (LOW/MEDIUM/HIGH) indica el impacto potencial de la vulnerabilidad. Confidence (LOW/MEDIUM/HIGH) indica qué tan seguro está Bandit de que el finding es real. Filtrá por ambos para reducir false positives.

### ¿Cómo suprimo un finding de Bandit?

Agregá `# nosec` al final de la línea. Para suprimir un test específico, usá `# nosec B105`. Siempre agregá un comentario explicando por qué la supresión es segura.

### ¿Puede Bandit detectar todas las vulnerabilidades de seguridad?

No. Bandit chequea patrones inseguros conocidos. No puede detectar logic flaws, business logic vulnerabilities, o issues que requieren runtime analysis. Usalo como una capa en una estrategia de seguridad.
