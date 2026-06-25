---
contentType: recipes
slug: implement-mutation-testing
title: "Implementar Mutation Testing"
description: "Cómo usar mutation testing con MutPy, Stryker y PIT para evaluar si tus tests realmente asertan comportamiento o simplemente ejecutan código."
metaDescription: "Usa mutation testing con MutPy, Stryker y PIT para evaluar si tus tests asertan comportamiento o simplemente ejecutan código."
difficulty: advanced
topics:
  - testing
tags:
  - testing
  - mutation-testing
  - stryker
  - pit
  - mutpy
  - test-quality
  - recipe
relatedResources:
  - /recipes/testing/measure-test-coverage
  - /recipes/testing/implement-property-based-testing
  - /recipes/testing/setup-test-fixtures
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Usa mutation testing con MutPy, Stryker y PIT para evaluar si tus tests asertan comportamiento o simplemente ejecutan código."
  keywords:
    - testing
    - mutation-testing
    - stryker
    - pit
    - mutpy
    - test-quality
    - recipe
---

## Descripción General

La cobertura de código te dice qué líneas fueron ejecutadas, pero no si los tests fallarían si el comportamiento cambiara. El mutation testing aborda esto introduciendo bugs pequeños y semánticamente significativos (mutantes) en tu código — cambiando `+` por `-`, invirtiendo una condición, eliminando una llamada a método — y verificando que al menos un test falle. Un alto mutation score significa que tus tests genuinamente asertan comportamiento, no solo pasan a través del código.

## Cuándo Usar

- La cobertura es alta (80%+) pero bugs aún llegan a producción
- Sospechas que los tests carecen de assertions significativas (tests mock-heavy que no verifican nada)
- La lógica de negocio crítica necesita confianza más allá de la cobertura de líneas
- Estás refactorizando código legacy y quieres asegurar que los tests atrapen regresiones
- Las revisiones de código descubren repetidamente "este test pasa incluso si borro la implementación"

## Cuándo NO Usar

- El codebase tiene baja cobertura para empezar — arregla la cobertura antes del mutation testing
- Los suites de test ya tardan 30+ minutos — el mutation testing multiplica ese tiempo significativamente
- Estás en fase de prototipo temprano y los tests son intencionalmente mínimos
- El equipo no tiene tiempo para investigar y fortalecer tests que no matan mutantes

## Implementación Paso a Paso

### Python (MutPy)

```bash
# Instalar
pip install mutpy

# Ejecutar mutation testing en un módulo
mutpy --target mymodule --unit-test tests/ --runner pytest

# Generar reporte HTML
mutpy --target mymodule --unit-test tests/ --runner pytest --report-html mutpy_report/

# Mostrar mutantes sobrevivientes (tests que deberían haber fallado pero no)
mutpy --target mymodule --unit-test tests/ --runner pytest --show-mutants
```

```yaml
# Configuración .mutpy.yml
target:
  - myproject/core/
tests:
  - tests/core/
runner: pytest
show_mutants: true
exclude:
  - "*/migrations/*"
  - "*/tests/*"

# Operadores de mutación a aplicar
operators:
  - AOR  # Reemplazo de operador aritmético (+ por -, etc.)
  - ROR  # Reemplazo de operador relacional (> por >=, etc.)
  - COR  # Reemplazo de operador condicional (and por or)
  - UOI  # Inserción/eliminación de operador unario
  - ABS  # Inserción de valor absoluto
```

```python
# Ejemplo: un test que sobrevive mutación (malo)
def test_calculate_discount():
    result = calculate_discount(100, 0.2)
    # Sin assertion — cualquier mutante sobrevive

# Test fortalecido que mata mutantes
def test_calculate_discount():
    result = calculate_discount(100, 0.2)
    assert result == 80  # Mutantes que devuelven 81, 79, 100, 0 fallarán
    assert isinstance(result, (int, float))
```

### JavaScript (Stryker)

```bash
# Instalar
npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner

# Inicializar configuración
npx stryker init
```

```javascript
// stryker.config.mjs
export default {
  testRunner: 'jest',
  reporters: ['progress', 'clear-text', 'html'],
  mutate: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/vendor/**'
  ],
  coverageAnalysis: 'perTest',
  thresholds: {
    high: 80,
    low: 60,
    break: 50    # CI falla bajo 50% de mutation score
  }
};
```

```bash
# Ejecutar mutation testing
npx stryker run

# Modo check (más rápido, no genera reporte completo)
npx stryker run --check

# Dashboard reporter para comentarios en PR
npx stryker run --reporters dashboard
```

```javascript
// Ejemplo: detección de mutante sobreviviente
// Código original
function isEligible(age, income) {
  return age >= 18 && income > 30000;  # Stryker muta >= a >
}

// Test débil (sobrevive el mutante >= a >)
test('eligibility', () => {
  expect(isEligible(18, 40000)).toBe(true);
});

// Test fuerte (mata el mutante)
test('eligibility boundary', () => {
  expect(isEligible(18, 30000)).toBe(false);  # income > 30000 falla aquí
  expect(isEligible(17, 40000)).toBe(false);  # age >= 18 falla aquí
  expect(isEligible(18, 40000)).toBe(true);
});
```

### Java (PIT)

```xml
<!-- pom.xml -->
<plugin>
  <groupId>org.pitest</groupId>
  <artifactId>pitest-maven</artifactId>
  <version>1.15.0</version>
  <configuration>
    <targetClasses>
      <param>com.example.core.*</param>
    </targetClasses>
    <targetTests>
      <param>com.example.core.*Test</param>
    </targetTests>
    <mutators>
      <mutator>CONDITIONALS_BOUNDARY</mutator>
      <mutator>MATH</mutator>
      <mutator>NEGATE_CONDITIONALS</mutator>
      <mutator>RETURN_VALS</mutator>
      <mutator>VOID_METHOD_CALLS</mutator>
    </mutators>
    <thresholds>
      <mutation>70</mutation>
      <coverage>80</coverage>
    </thresholds>
    <outputFormats>
      <format>HTML</format>
      <format>XML</format>
    </outputFormats>
  </configuration>
</plugin>
```

```bash
# Ejecutar PIT mutation testing
mvn org.pitest:pitest-maven:mutationCoverage

# Más rápido con análisis incremental (solo código cambiado)
mvn org.pitest:pitest-maven:mutationCoverage -DwithHistory
```

## Interpretando Resultados

| Término | Significado |
|---------|-------------|
| **Mutante** | Una versión modificada de tu código con un cambio semántico |
| **Killed** | Al menos un test falló en el mutante — bueno |
| **Survived** | Todos los tests pasaron en el mutante — gap de test encontrado |
| **Timeout** | El mutante causó un loop infinito o slowdown extremo |
| **Equivalent** | El mutante se comporta idénticamente al original (falso positivo) |
| **Mutation Score** | Killed / (Killed + Survived) × 100 |

```text
# Ejemplo de output de Stryker
Ran 12.4k mutants in 4m 32s
- Killed: 10,210 (82%)
- Survived: 2,134 (17%)
- Timed out: 56 (<1%)
- Equivalent: ~120 (excluded from score)

Mutantes sobrevivientes:
src/cart.js:45  # cambiado >= a > en calculateTotal
src/cart.js:67  # removido null check en applyDiscount
```

## Mejores Prácticas

- **Apunta al código de alto valor primero.** Ejecuta mutation testing en la lógica de negocio core, no en el wiring de controladores o mapeos de DTO. El mutation testing es costoso; enfócalo donde importa.
- **Distingue mutantes equivalentes de gaps reales.** Un mutante equivalente (`a + 0` cambiado a `a - 0`) no puede ser matado. Márcalos en la configuración para evitar ruido.
- **Usa modo incremental en CI.** El history mode de PIT y el análisis incremental de Stryker solo mutan archivos cambiados, reduciendo el tiempo de horas a minutos.
- **Configura thresholds realistas.** Un 100% de mutation score usualmente no vale el esfuerzo. 70-80% en módulos core es una señal fuerte de calidad de test.
- **Trata mutantes sobrevivientes como tickets.** Cada mutante sobreviviente es un bug potencial oculto en producción. Priorízalos como comentarios de code review.

## Errores Comunes

- **Ejecutar mutation tests en todo el suite sin filtrar.** Un codebase grande puede tardar horas. Comienza con un paquete o módulo.
- **Perseguir 100% de mutation score.** El último 10% a menudo requiere testear getters triviales o llamadas de logging que no proveen valor de negocio.
- **Ignorar mutantes equivalentes.** Crean ruido y hacen que los desarrolladores desconfíen de la herramienta. Configura exclusiones o anotaciones.
- **Usar mutation score como KPI de equipo.** Incentiva escribir tests específicamente para matar mutantes en lugar de testear requerimientos reales.
- **Ejecutar mutation tests en tests de integración sin mock.** Las llamadas a base de datos y requests HTTP hacen el mutation testing imposible de lento; apunta a tests unitarios.

## Recursos Relacionados

- [Medir Cobertura de Test](/recipes/testing/measure-test-coverage)
- [Property-Based Testing](/recipes/testing/implement-property-based-testing)
- [Configurar Fixtures de Test](/recipes/testing/setup-test-fixtures)
