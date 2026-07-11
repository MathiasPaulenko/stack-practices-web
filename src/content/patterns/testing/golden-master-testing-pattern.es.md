---
contentType: patterns
slug: golden-master-testing-pattern
title: "Golden Master Testing"
description: "Cómo usar golden master testing para caracterizar comportamiento de legacy code antes de refactorizar. Cubre captura de output, comparación de baselines, e incremental refactoring."
metaDescription: "Caracteriza legacy code con golden master testing. Aprende a capturar baselines, comparar cambios y refactorizar con characterization tests."
difficulty: advanced
topics:
  - testing
tags:
  - testing
  - golden-master
  - characterization-tests
  - legacy-code
  - refactoring
  - pattern
category: architectural
relatedResources:
  - /patterns/snapshot-testing-pattern
  - /patterns/test-double-pattern
  - /patterns/test-pyramid-pattern
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Caracteriza legacy code con golden master testing. Aprende a capturar baselines, comparar cambios y refactorizar con characterization tests."
  keywords:
    - testing
    - golden-master
    - characterization-tests
    - legacy-code
    - refactoring
    - pattern
---

## Overview

El golden master testing (también llamado characterization testing) captura el comportamiento actual de un sistema como baseline, después verifica que cambios futuros no alteren ese comportamiento. Es la técnica primaria para testear legacy code que no tiene tests — no asertás qué el código *debería* hacer, asertás qué *actualmente* hace. El nombre viene del "golden master" — un output de referencia que sirve como truth. Cuando refactorizás, cualquier desviación del golden master señala una regresión.

## When to Use

- Legacy code sin tests que necesitás refactorizar con seguridad
- Código donde las business rules son unclear o undocumented
- Sistemas donde el output es deterministic pero complex (reports, calculations, transformations)
- Antes de migrar un sistema a un nuevo lenguaje o framework
- Cuando necesitás confidence para cambiar código que no entendés completamente

## When NOT to Use

- Código nuevo con requirements claros — escribí tests primero (TDD)
- Cuando el output es non-deterministic — random values, timestamps, network calls
- Para funciones simples — explicit assertions son más claras
- Cuando entendés el código bien suficiente para escribir targeted tests
- Para código que está por ser reemplazado enteramente — no caracterices lo que vas a borrar

## Solution

### Approach básico de golden master

```python
# Python — capturar output como golden master
import json
import subprocess
import hashlib

def run_legacy_system(inputs):
    """Correr el legacy system con given inputs y capturar output."""
    result = subprocess.run(
        ['python', 'legacy_calculator.py'],
        input=json.dumps(inputs),
        capture_output=True,
        text=True,
    )
    return result.stdout

def generate_golden_master(input_file):
    """Generar golden master desde input file."""
    with open(input_file) as f:
        inputs = json.load(f)

    outputs = []
    for input_data in inputs:
        output = run_legacy_system(input_data)
        outputs.append({
            'input': input_data,
            'output': output,
            'hash': hashlib.sha256(output.encode()).hexdigest(),
        })

    with open('golden_master.json', 'w') as f:
        json.dump(outputs, f, indent=2)

    print(f"Golden master generated with {len(outputs)} cases")

# Step 1: Generar golden master
generate_golden_master('test_inputs.json')
```

### Comparar contra golden master

```python
# Python — verificar que el código refactorizado matchea el golden master
import json
import subprocess
import hashlib
import pytest

def load_golden_master():
    with open('golden_master.json') as f:
        return json.load(f)

def run_refactored_system(input_data):
    """Correr el sistema refactorizado."""
    result = subprocess.run(
        ['python', 'refactored_calculator.py'],
        input=json.dumps(input_data),
        capture_output=True,
        text=True,
    )
    return result.stdout

@pytest.mark.parametrize("case", load_golden_master())
def test_matches_golden_master(case):
    input_data = case['input']
    expected_output = case['output']
    expected_hash = case['hash']

    actual_output = run_refactored_system(input_data)
    actual_hash = hashlib.sha256(actual_output.encode()).hexdigest()

    assert actual_hash == expected_hash, (
        f"Output mismatch for input: {input_data}\n"
        f"Expected: {expected_output[:200]}\n"
        f"Actual:   {actual_output[:200]}"
    )
```

### Golden master con file-based output

```python
# Python — comparar file output (e.g., generated reports)
import os
import filecmp
import subprocess
import pytest

def generate_report(input_file, output_dir, system='legacy'):
    """Generar un report usando legacy o refactored system."""
    script = f'{system}_report_generator.py'
    subprocess.run([
        'python', script,
        '--input', input_file,
        '--output', output_dir,
    ], check=True)

@pytest.fixture(scope="session")
def golden_master_reports(tmp_path_factory):
    """Generar golden master reports una vez por session."""
    golden_dir = tmp_path_factory.mktemp("golden")
    test_inputs = [
        'tests/data/report_input_1.json',
        'tests/data/report_input_2.json',
        'tests/data/report_input_3.json',
    ]

    for i, input_file in enumerate(test_inputs):
        output_file = golden_dir / f'report_{i}.html'
        generate_report(input_file, str(output_file), system='legacy')

    return golden_dir, test_inputs

def test_refactored_matches_golden(golden_master_reports, tmp_path):
    golden_dir, test_inputs = golden_master_reports

    for i, input_file in enumerate(test_inputs):
        # Generar con refactored system
        refactored_output = tmp_path / f'report_{i}.html'
        generate_report(input_file, str(refactored_output), system='refactored')

        # Comparar
        golden_file = golden_dir / f'report_{i}.html'
        assert filecmp.cmp(golden_file, refactored_output, shallow=False), (
            f"Report mismatch for {input_file}"
        )
```

### Golden master con large input sets

```python
# Python — generar large input sets para characterization thorough
import random
import json

def generate_test_inputs(count=1000):
    """Generar diverse inputs para exercise el legacy system."""
    inputs = []

    # Normal cases
    for i in range(count // 2):
        inputs.append({
            'operation': random.choice(['add', 'subtract', 'multiply', 'divide']),
            'a': random.uniform(-1000, 1000),
            'b': random.uniform(-1000, 1000),
        })

    # Edge cases
    inputs.extend([
        {'operation': 'add', 'a': 0, 'b': 0},
        {'operation': 'divide', 'a': 1, 'b': 0},  # Division by zero
        {'operation': 'multiply', 'a': -1, 'b': -1},
        {'operation': 'add', 'a': 1e10, 'b': -1e10},
        {'operation': 'subtract', 'a': 0.1, 'b': 0.3},
    ])

    # Boundary values
    inputs.extend([
        {'operation': 'add', 'a': float('inf'), 'b': 1},
        {'operation': 'add', 'a': float('-inf'), 'b': 1},
        {'operation': 'add', 'a': float('nan'), 'b': 1},
    ])

    with open('test_inputs.json', 'w') as f:
        json.dump(inputs, f, indent=2)

    print(f"Generated {len(inputs)} test inputs")
```

### Approach de approval testing

```python
# Python — approval testing con approvaltests library
from approvaltests import Approvals
from approvaltests.reporters import PythonNativeReporter

def test_legacy_formatter_output():
    # Correr el legacy formatter con test input
    input_data = [
        {"name": "Alice", "age": 30, "role": "admin"},
        {"name": "Bob", "age": 25, "role": "member"},
        {"name": "Charlie", "age": 35, "role": "guest"},
    ]

    output = legacy_formatter.format_table(input_data)

    # First run: crea approved file (golden master)
    # Runs subsiguientes: compara contra approved file
    # Si mismatch: abre diff tool para review
    Approvals.verify(output, reporter=PythonNativeReporter())

def test_legacy_calculator_with_multiple_inputs():
    results = []
    for a, b, op in [(1, 2, 'add'), (10, 5, 'subtract'), (3, 4, 'multiply')]:
        result = legacy_calculator.calculate(a, b, op)
        results.append(f"{a} {op} {b} = {result}")

    output = '\n'.join(results)
    Approvals.verify(output)
```

### JavaScript golden master

```javascript
// JavaScript — golden master con Jest snapshot
const { execSync } = require('child_process');

function runSystem(input, system = 'legacy') {
  const result = execSync(`node ${system}_calculator.js`, {
    input: JSON.stringify(input),
    encoding: 'utf-8',
  });
  return result;
}

describe('Golden Master: legacy vs refactored', () => {
  const testCases = require('./test_inputs.json');

  test.each(testCases)('matches golden master for %j', (input) => {
    const legacyOutput = runSystem(input, 'legacy');
    const refactoredOutput = runSystem(input, 'refactored');

    expect(refactoredOutput).toBe(legacyOutput);
  });
});

// Alternativa: usar Jest snapshots como golden master
describe('Golden Master with snapshots', () => {
  const testCases = require('./test_inputs.json');

  test.each(testCases)('output matches snapshot for %j', (input) => {
    const output = runSystem(input, 'legacy');
    expect(output).toMatchSnapshot();
  });
});
```

### Incremental refactoring con golden master

```python
# Python — step-by-step refactoring con golden master safety net

# Step 1: Generar golden master (antes de cualquier cambio)
# python generate_golden_master.py

# Step 2: Escribir characterization tests
class TestCharacterization:
    @pytest.mark.parametrize("case", load_golden_master())
    def test_legacy_behavior_preserved(self, case):
        output = run_current_system(case['input'])
        assert output == case['output']

# Step 3: Refactorizar en pasos pequeños, corriendo tests después de cada cambio
# - Extract method
# - Rename variable
# - Replace conditional with polymorphism
# - Cada step: correr golden master tests

# Step 4: Una vez refactorizado, escribir proper unit tests para la nueva estructura
# - Borrar golden master tests una vez que los unit tests proveen equal confidence
```

### Manejar output non-deterministic

```python
# Python — normalizar non-deterministic values antes de comparar
import re
from datetime import datetime

def normalize_output(output):
    """Remover non-deterministic elements del output."""
    # Reemplazar timestamps
    output = re.sub(
        r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d+Z?',
        '<TIMESTAMP>',
        output,
    )
    # Reemplazar UUIDs
    output = re.sub(
        r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
        '<UUID>',
        output,
    )
    # Reemplazar random IDs
    output = re.sub(r'"id": \d+', '"id": <ID>', output)
    # Reemplazar file paths
    output = re.sub(r'/tmp/[^\s"]+', '<TMP_PATH>', output)
    return output

def test_with_normalization():
    input_data = {'action': 'create', 'name': 'Alice'}
    legacy_output = normalize_output(run_legacy_system(input_data))
    refactored_output = normalize_output(run_refactored_system(input_data))

    assert refactored_output == legacy_output
```

## Variants

### Parallel run en producción

```python
# Python — correr legacy y refactored en parallel, comparar results
import logging

def parallel_run(input_data):
    """Correr ambos sistemas y loggear differences."""
    try:
        legacy_result = run_legacy_system(input_data)
        refactored_result = run_refactored_system(input_data)

        if legacy_result != refactored_result:
            logging.warning(
                f"Output mismatch detected!\n"
                f"Input: {input_data}\n"
                f"Legacy: {legacy_result[:200]}\n"
                f"Refactored: {refactored_result[:200]}"
            )
            return False
        return True
    except Exception as e:
        logging.error(f"Error in parallel run: {e}")
        return False

# Correr en producción con shadow traffic
# Loggear mismatches pero servir desde legacy system
```

### Golden master con database state

```python
# Python — capturar database state como golden master
import json
import hashlib

def capture_db_state(db_connection):
    """Capturar current database state como hash."""
    tables = ['users', 'orders', 'products']
    state = {}

    for table in tables:
        rows = db_connection.execute(f'SELECT * FROM {table} ORDER BY id')
        state[table] = [dict(row) for row in rows]

    state_json = json.dumps(state, sort_keys=True, default=str)
    return hashlib.sha256(state_json.encode()).hexdigest()

def test_database_state_unchanged_after_refactor():
    # Setup: popular database con test data
    setup_test_data(db)

    # Capturar golden master state
    golden_hash = capture_db_state(db)

    # Correr la refactored operation
    refactored_service.process_orders()

    # Verificar que database state matchea
    current_hash = capture_db_state(db)
    assert current_hash == golden_hash, "Database state changed unexpectedly"
```

### Golden master con API responses

```javascript
// JavaScript — capturar API responses como golden master
const axios = require('axios');

async function captureApiResponses(baseUrl) {
  const endpoints = [
    { method: 'GET', path: '/api/users' },
    { method: 'GET', path: '/api/users/1' },
    { method: 'GET', path: '/api/orders' },
    { method: 'POST', path: '/api/orders', body: { userId: 1, total: 100 } },
  ];

  const responses = [];
  for (const endpoint of endpoints) {
    const res = await axios({
      method: endpoint.method,
      url: `${baseUrl}${endpoint.path}`,
      data: endpoint.body,
    });
    responses.push({
      endpoint,
      status: res.status,
      body: res.data,
    });
  }

  return responses;
}

test('refactored API matches golden master', async () => {
  const goldenMaster = require('./api_golden_master.json');
  const refactoredResponses = await captureApiResponses('http://localhost:3001');

  expect(refactoredResponses).toEqual(goldenMaster);
});
```

## Best Practices

- Generá diverse inputs — normal, edge, boundary, e invalid cases
- Normalizá non-deterministic values — timestamps, UUIDs, random IDs antes de comparar
- Usá hashes para outputs grandes — SHA-256 comparison es más rápido que string comparison
- Corré golden master tests en CI — atrapá regresiones early
- Mantené el golden master bajo version control — trackeá qué comportamiento caracterizaste
- Refactorizá en pasos pequeños — corré golden master después de cada cambio
- Borrá golden master tests cuando termines — una vez que tengas proper unit tests, el golden master es redundant
- Documentá qué cubre el golden master — los devs futuros necesitan saber qué comportamiento está caracterizado

## Common Mistakes

- **Test inputs insuficientes**: generar solo happy-path inputs se pierde edge cases. Incluí boundary e invalid inputs.
- **No normalizar output**: timestamps y random values causan false failures. Siempre normalizá antes de comparar.
- **Updatear golden master a ciegas**: cuando el golden master cambia, revisá el diff cuidadosamente. Un cambio puede ser una regresión, no una mejora.
- **Mantener golden master para siempre**: los golden master tests son un safety net para refactorizar. Una vez que tengas proper tests, borrálos.
- **Testear demasiado output**: comparar entire HTML pages o large JSON hace los diffs illegibles. Focate en las partes relevantes.

## FAQ

### ¿Qué es un golden master test?

Un test que captura el output actual de un sistema como baseline (el "golden master") y verifica que cambios futuros produzcan el mismo output. Caracteriza qué hace el código, no qué debería hacer.

### ¿En qué se diferencia de snapshot testing?

Snapshot testing es una implementación específica de golden master testing. Golden master es el concepto; snapshots son una tool. Otras tools incluyen file comparison, hash comparison, y approval testing.

### ¿Cuándo debería borrar golden master tests?

Cuando tengas proper unit tests que proveen equal o mejor confidence. Los golden master tests son un safety net temporal para refactorizar legacy code, no una permanent testing strategy.

### ¿Qué pasa si el golden master tiene un bug?

El golden master captura current behavior, incluyendo bugs. Si encontrás un bug, fixealo y updateá el golden master. Documentá que el comportamiento cambió intencionalmente.

### ¿Cuántos test inputs necesito?

Suficientes para exercise todos los code paths. Empezá con 100-1000 inputs cubriendo normal, edge, y boundary cases. Para sistemas complex, usá property-based testing para generar inputs automáticamente.
