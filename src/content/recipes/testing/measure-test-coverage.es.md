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
lastUpdated: "2026-07-09"
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

La cobertura de código mide qué líneas, branches y condiciones fueron ejecutadas durante los tests. Es un proxy útil para código no testeado, pero no una medida de calidad de test — 100% de cobertura sin assertions es meaningless. El patron a continuacion demuestra cómo recolectar, reportar y configurar thresholds de cobertura significativos sin crear incentivos perversos.

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

## Lo que funciona

- **Mide branch coverage, no solo line coverage.** Una sola línea con `if x:` reporta como cubierta si la rama true se ejecuta, incluso si la rama false nunca se testea. Branch coverage detecta esto.
- **Configura thresholds por módulo, no globalmente.** La lógica de negocio core debería tener thresholds más altos (85-90%) que el código glue de UI o archivos auto-generados (50-60%).
- **Excluye código de infraestructura de los objetivos.** Migraciones de base de datos, clientes gRPC generados y archivos de config no deberían contar contra tu métrica de cobertura.
- **Rastrea tendencias de cobertura, no números absolutos.** Una caída de 5% en un PR es más útil que "estamos en 82% hoy".
- **Revisa líneas no cubiertas en PRs, no solo el porcentaje.** Un bot de comentarios que lista las 3 líneas no cubiertas es más útil que un checkmark rojo al 79%.

## Errores Comunes

- **Hacer cumplir 100% de cobertura.** Incentiva tests que ejecutan código sin asertar comportamiento, o anotaciones `@exclude` para gamear la métrica.
- **Solo medir line coverage.** Una función con 10 branches puede mostrar 100% de line coverage mientras solo 2 branches están testeados.
- **Incluir archivos de test en cobertura.** Utilidades de test y clases mock inflan el número y ocultan cobertura de producción faltante.
- **Comparar cobertura entre lenguajes.** Python branch coverage y Java line coverage no son métricas comparables — rastrea tendencias dentro de cada codebase.
- **Ignorar cobertura en tests de integración.** Los tests de integración lentos a menudo cubiertan las rutas más importantes; excluirlos de cobertura oculta gaps reales.

## Preguntas Frecuentes

**Q: ¿Es 100% de cobertura un buen objetivo?**
A: 100% de cobertura de líneas es alcanzable pero puede ser engañoso. Un número alto de cobertura con aserciones débiles no significa que el código esté bien probado. Apunta a una cobertura significativa de caminos críticos.

**Q: ¿Cuál es la diferencia entre cobertura de líneas y de ramas?**
A: La cobertura de líneas cuenta líneas ejecutadas. La cobertura de ramas cuenta si cada rama de decisión (if/else, switch) fue tomada. La cobertura de ramas suele revelar más caminos no probados.

**Q: ¿Cómo debo usar cobertura en CI?**
A: Establece umbrales mínimos para módulos críticos, rastrea tendencias a lo largo del tiempo y rechaza pull requests que bajen considerablemente la cobertura sin justificación. Evita jugar con la métrica.

### ¿Cómo manejo cobertura para código cargado dinámicamente?

El código cargado vía `import()` o reflection puede no aparecer en reportes de cobertura. Configura tu herramienta de cobertura para incluir todos los archivos fuente, incluso los que no se importan durante el run de tests. En nyc, usa el flag `--all`. En JaCoCo, configura `<includes>` para cubrir todos los paquetes. En pytest-cov, usa `--cov=package_name` con `--cov-branch`.

### ¿Cuál es la diferencia entre branch y condition coverage?

Branch coverage chequea si cada rama de una estructura de control fue tomada (if true, if false). Condition coverage chequea si cada subexpresión booleana en una condición compuesta fue evaluada a true y false. Por ejemplo, `if (a && b)` tiene 2 branches pero 4 combinaciones de conditions. Condition coverage es más estricto y más informativo pero más difícil de alcanzar.

### ¿Debería usar badges de cobertura en mi README?

Los badges de cobertura son útiles para proyectos open-source para señalizar calidad. Sin embargo, pueden crear presión por mantener un número en lugar de tests significativos. Si usas badges, muestra branch coverage (no solo line coverage) y linkea al reporte completo. Evita usar badges como gate para contribuciones — revisa la calidad del test, no solo el porcentaje.

### ¿Cómo excluyo código generado o vendored de la cobertura?

Configura patrones de exclusión en tu herramienta de cobertura. En nyc, setea `exclude` en `.nycrc` para incluir `**/dist/**`, `**/vendor/**`, `**/*.d.ts`. En JaCoCo, usa `<excludes>` en la configuración del plugin con patrones estilo Ant. En pytest-cov, usa `--cov-config` con un archivo `.coveragerc` que setee patrones `omit`. Siempre excluye código generado, librerías de terceros y scripts de migración de los reportes de cobertura.

### ¿Qué es MC/DC coverage y cuándo es requerido?

MC/DC (Modified Condition/Decision Coverage) requiere que cada condición afecte independientemente el resultado de la decisión. Es obligatorio por estándares de seguridad de aviación (DO-178C) y automotriz (ISO 26262). MC/DC es más estricto que condition coverage — para `if (a && b)`, debes mostrar que toggleear `a` solo cambia el resultado cuando `b` es true, y viceversa. Herramientas como LDRA, VectorCAST y coverage.py (experimental) soportan análisis MC/DC.

### ¿Cómo rastreo tendencias de cobertura a lo largo del tiempo?

Sube reportes de cobertura a un servicio de tracking como Codecov, Coveralls o SonarQube en cada run de CI. Estos servicios almacenan datos históricos de cobertura y muestran tendencias como gráficos. Configura checks de pull request para comentar el diff de cobertura (líneas añadidas vs. removidas cubiertas). Setea alertas de tendencia que notifiquen cuando la cobertura baja más de un umbral configurable (ej., 2%). Para monorepos, rastrea cobertura por paquete para evitar enmascarar drops en un paquete con gains en otro.

### ¿Pueden las herramientas de cobertura medir la efectividad de los tests?

La cobertura mide qué código fue ejecutado durante los tests, no si los tests realmente verifican corrección. Para medir efectividad, combina cobertura con mutation testing (ver recipe `implement-mutation-testing`). Mutation testing modifica el código fuente y chequea si los tests capturan el cambio. Un score alto de cobertura con un score bajo de mutation significa que los tests ejecutan el código pero no asertan comportamiento significativo. Usa ambas métricas juntas para una imagen completa de la calidad del test. Trackea ambas métricas en CI para capturar regresiones en efectividad del test a lo largo del tiempo.

Setea umbrales separados para cobertura y mutation score — requiere 80% branch coverage pero solo 60% mutation score inicialmente, luego sube el umbral a medida que la suite madura.
