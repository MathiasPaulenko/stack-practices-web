---
contentType: recipes
slug: measure-test-coverage
title: "Medir Cobertura de Test"
description: "Cómo medir, reportar y hacer cumplir la cobertura de código con branch y condition coverage usando pytest-cov, nyc y JaCoCo para quality gates significativos."
metaDescription: "Mide, reporta y haz cumplir cobertura de código con branch y condition coverage usando pytest-cov, nyc y JaCoCo en pipelines CI/CD."
difficulty: beginner
topics:
  - testing
tags:
  - testing
  - coverage
  - pytest-cov
  - nyc
  - jacoco
  - ci-cd
  - recipe
relatedResources:
  - /recipes/testing/setup-test-fixtures
  - /recipes/testing/generate-test-data
  - /guides/testing/testing-strategy-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Mide, reporta y haz cumplir cobertura de código con branch y condition coverage usando pytest-cov, nyc y JaCoCo en pipelines CI/CD."
  keywords:
    - testing
    - coverage
    - pytest-cov
    - nyc
    - jacoco
    - ci-cd
    - recipe
---

## Descripción General

La cobertura de código mide qué líneas, branches y condiciones fueron ejecutadas durante los tests. Es un proxy útil para código no testeado, pero no una medida de calidad de test — 100% de cobertura sin assertions es meaningless. Esta receta muestra cómo recolectar, reportar y configurar thresholds de cobertura significativos sin crear incentivos perversos.

## Cuándo Usar

- Necesitas visibilidad sobre qué rutas de código carecen de ejecución de test
- Los pipelines de CI necesitan una puerta para prevenir código no testeado de ser mergeado
- Estás refactorizando código legacy y quieres asegurar que los cambios nuevos están testeados
- Los equipos necesitan una métrica compartida para rastrear progreso de testing con el tiempo
- Quieres identificar código muerto que nunca se ejecuta en producción o tests

## Cuándo NO Usar

- La cobertura se trata como un objetivo (ej. "debe ser 90%") en lugar de una guía — esto lleva a tests sin assertions
- El codebase es un prototipo o spike que será descartado — la cobertura no añade valor
- Estás testeando código generado, boilerplate de framework o archivos de configuración
- El equipo optimiza porcentaje de cobertura sobre encontrar bugs reales

## Implementación Paso a Paso

### Python (pytest-cov)

```bash
# Instalar
pip install pytest-cov

# Ejecutar con reporte de terminal
pytest --cov=myproject --cov-report=term-missing tests/

# Generar reporte HTML
pytest --cov=myproject --cov-report=html --cov-report=xml tests/

# Fallar bajo threshold (hecho cumplir en CI)
pytest --cov=myproject --cov-fail-under=80 tests/

# Branch coverage (rastrea si if/else ambos tomados)
pytest --cov=myproject --cov-branch tests/
```

```ini
# Configuración pyproject.toml
[tool.coverage.run]
source = ["myproject"]
branch = true
omit = [
    "*/tests/*",
    "*/migrations/*",
    "*/venv/*",
]

[tool.coverage.report]
precision = 2
fail_under = 80
skip_covered = true
show_missing = true

[tool.coverage.html]
directory = "htmlcov"

[tool.coverage.xml]
output = "coverage.xml"
```

```python
# Ejecutando en CI con múltiples markers
pytest -m "not slow" --cov=myproject --cov-report=xml --cov-fail-under=80
```

### JavaScript (nyc / c8)

```bash
# c8 es la moderna herramienta de cobertura nativa V8 rápida
npm install --save-dev c8

# Ejecutar tests con cobertura
npx c8 npm test

# Reporte HTML
npx c8 --reporter=html --reporter=text npm test

# Fallar bajo threshold
npx c8 --check-coverage --lines 80 --functions 80 --branches 75 npm test

# Excluir archivos de cobertura
npx c8 --exclude="src/**/*.test.js" --exclude="src/vendor/**" npm test
```

```json
// package.json
{
  "scripts": {
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "@vitest/coverage-v8": "^1.0.0",
    "vitest": "^1.0.0"
  }
}
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
      exclude: [
        '**/*.test.ts',
        '**/tests/**',
        '**/node_modules/**',
        '**/vendor/**'
      ]
    }
  }
});
```

### Java (JaCoCo)

```xml
<!-- pom.xml -->
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.11</version>
  <executions>
    <execution>
      <goals>
        <goal>prepare-agent</goal>
      </goals>
    </execution>
    <execution>
      <id>report</id>
      <phase>test</phase>
      <goals>
        <goal>report</goal>
      </goals>
    </execution>
    <execution>
      <id>check</id>
      <goals>
        <goal>check</goal>
      </goals>
      <configuration>
        <rules>
          <rule>
            <element>BUNDLE</element>
            <limits>
              <limit>
                <counter>LINE</counter>
                <value>COVEREDRATIO</value>
                <minimum>0.80</minimum>
              </limit>
              <limit>
                <counter>BRANCH</counter>
                <value>COVEREDRATIO</value>
                <minimum>0.75</minimum>
              </limit>
            </limits>
          </rule>
        </rules>
      </configuration>
    </execution>
  </executions>
</plugin>
```

```bash
# Generar reporte
mvn jacoco:report

# Verificar thresholds
mvn jacoco:check

# Generar badge para README
mvn jacoco:report && cat target/site/jacoco/index.html | grep -oP 'Total[^%]+%'
```

## Integración CI

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install pytest pytest-cov
      - run: pytest --cov=myproject --cov-report=xml --cov-fail-under=80
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage.xml
```

## Mejores Prácticas

- **Mide branch coverage, no solo line coverage.** Una sola línea con `if x:` reporta como cubierta si la rama true se ejecuta, incluso si la rama false nunca se testea. Branch coverage detecta esto.
- **Configura thresholds por módulo, no globalmente.** La lógica de negocio core debería tener thresholds más altos (85-90%) que el código glue de UI o archivos auto-generados (50-60%).
- **Excluye código de infraestructura de los objetivos.** Migraciones de base de datos, clientes gRPC generados y archivos de config no deberían contar contra tu métrica de cobertura.
- **Rastrea tendencias de cobertura, no números absolutos.** Una caída de 5% en un PR es más accionable que "estamos en 82% hoy".
- **Revisa líneas no cubiertas en PRs, no solo el porcentaje.** Un bot de comentarios que lista las 3 líneas no cubiertas es más útil que un checkmark rojo al 79%.

## Errores Comunes

- **Hacer cumplir 100% de cobertura.** Incentiva tests que ejecutan código sin asertar comportamiento, o anotaciones `@exclude` para gamear la métrica.
- **Solo medir line coverage.** Una función con 10 branches puede mostrar 100% de line coverage mientras solo 2 branches están testeados.
- **Incluir archivos de test en cobertura.** Utilidades de test y clases mock inflan el número y ocultan cobertura de producción faltante.
- **Comparar cobertura entre lenguajes.** Python branch coverage y Java line coverage no son métricas comparables — rastrea tendencias dentro de cada codebase.
- **Ignorar cobertura en tests de integración.** Los tests de integración lentos a menudo cubiertan las rutas más importantes; excluirlos de cobertura oculta gaps reales.
