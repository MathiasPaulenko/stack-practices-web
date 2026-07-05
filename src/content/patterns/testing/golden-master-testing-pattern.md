---
contentType: patterns
slug: golden-master-testing-pattern
title: "Golden Master Testing: Characterization Tests for Legacy Code"
description: "How to use golden master testing to characterize legacy code behavior before refactoring. Covers capturing output, comparing baselines, and incremental refactoring."
metaDescription: "Characterize legacy code with golden master testing. Learn to capture output baselines, compare against changes, and refactor safely with characterization tests."
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
  metaDescription: "Characterize legacy code with golden master testing. Learn to capture output baselines, compare against changes, and refactor safely with characterization tests."
  keywords:
    - testing
    - golden-master
    - characterization-tests
    - legacy-code
    - refactoring
    - pattern
---

## Overview

Golden master testing (also called characterization testing) captures the current behavior of a system as a baseline, then verifies that future changes don't alter that behavior. It's the primary technique for testing legacy code that has no tests — you don't assert what the code *should* do, you assert what it *currently* does. The name comes from the "golden master" — a reference output that serves as the truth. When you refactor, any deviation from the golden master signals a regression.

## When to Use

- Legacy code with no tests that you need to refactor safely
- Code where the business rules are unclear or undocumented
- Systems where the output is deterministic but complex (reports, calculations, transformations)
- Before migrating a system to a new language or framework
- When you need confidence to change code you don't fully understand

## When NOT to Use

- New code with clear requirements — write tests first (TDD)
- When output is non-deterministic — random values, timestamps, network calls
- For simple functions — explicit assertions are clearer
- When you understand the code well enough to write targeted tests
- For code that is about to be replaced entirely — don't characterize what you'll delete

## Solution

### Basic golden master approach

```python
# Python — capture output as golden master
import json
import subprocess
import hashlib

def run_legacy_system(inputs):
    """Run the legacy system with given inputs and capture output."""
    result = subprocess.run(
        ['python', 'legacy_calculator.py'],
        input=json.dumps(inputs),
        capture_output=True,
        text=True,
    )
    return result.stdout

def generate_golden_master(input_file):
    """Generate golden master from input file."""
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

# Step 1: Generate golden master
generate_golden_master('test_inputs.json')
```

### Comparing against golden master

```python
# Python — verify refactored code matches golden master
import json
import subprocess
import hashlib
import pytest

def load_golden_master():
    with open('golden_master.json') as f:
        return json.load(f)

def run_refactored_system(input_data):
    """Run the refactored system."""
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

### Golden master with file-based output

```python
# Python — compare file output (e.g., generated reports)
import os
import filecmp
import subprocess
import pytest

def generate_report(input_file, output_dir, system='legacy'):
    """Generate a report using either legacy or refactored system."""
    script = f'{system}_report_generator.py'
    subprocess.run([
        'python', script,
        '--input', input_file,
        '--output', output_dir,
    ], check=True)

@pytest.fixture(scope="session")
def golden_master_reports(tmp_path_factory):
    """Generate golden master reports once per session."""
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
        # Generate with refactored system
        refactored_output = tmp_path / f'report_{i}.html'
        generate_report(input_file, str(refactored_output), system='refactored')

        # Compare
        golden_file = golden_dir / f'report_{i}.html'
        assert filecmp.cmp(golden_file, refactored_output, shallow=False), (
            f"Report mismatch for {input_file}"
        )
```

### Golden master with large input sets

```python
# Python — generate large input sets for thorough characterization
import random
import json

def generate_test_inputs(count=1000):
    """Generate diverse inputs to exercise the legacy system."""
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

### Approval testing approach

```python
# Python — approval testing with approvaltests library
from approvaltests import Approvals
from approvaltests.reporters import PythonNativeReporter

def test_legacy_formatter_output():
    # Run the legacy formatter with test input
    input_data = [
        {"name": "Alice", "age": 30, "role": "admin"},
        {"name": "Bob", "age": 25, "role": "member"},
        {"name": "Charlie", "age": 35, "role": "guest"},
    ]

    output = legacy_formatter.format_table(input_data)

    # First run: creates approved file (golden master)
    # Subsequent runs: compares against approved file
    # If mismatch: opens diff tool for review
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
// JavaScript — golden master with Jest snapshot
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

// Alternative: use Jest snapshots as golden master
describe('Golden Master with snapshots', () => {
  const testCases = require('./test_inputs.json');

  test.each(testCases)('output matches snapshot for %j', (input) => {
    const output = runSystem(input, 'legacy');
    expect(output).toMatchSnapshot();
  });
});
```

### Incremental refactoring with golden master

```python
# Python — step-by-step refactoring with golden master safety net

# Step 1: Generate golden master (before any changes)
# python generate_golden_master.py

# Step 2: Write characterization tests
class TestCharacterization:
    @pytest.mark.parametrize("case", load_golden_master())
    def test_legacy_behavior_preserved(self, case):
        output = run_current_system(case['input'])
        assert output == case['output']

# Step 3: Refactor in small steps, running tests after each change
# - Extract method
# - Rename variable
# - Replace conditional with polymorphism
# - Each step: run golden master tests

# Step 4: Once refactored, write proper unit tests for the new structure
# - Delete golden master tests once unit tests provide equal confidence
```

### Handling non-deterministic output

```python
# Python — normalize non-deterministic values before comparison
import re
from datetime import datetime

def normalize_output(output):
    """Remove non-deterministic elements from output."""
    # Replace timestamps
    output = re.sub(
        r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d+Z?',
        '<TIMESTAMP>',
        output,
    )
    # Replace UUIDs
    output = re.sub(
        r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
        '<UUID>',
        output,
    )
    # Replace random IDs
    output = re.sub(r'"id": \d+', '"id": <ID>', output)
    # Replace file paths
    output = re.sub(r'/tmp/[^\s"]+', '<TMP_PATH>', output)
    return output

def test_with_normalization():
    input_data = {'action': 'create', 'name': 'Alice'}
    legacy_output = normalize_output(run_legacy_system(input_data))
    refactored_output = normalize_output(run_refactored_system(input_data))

    assert refactored_output == legacy_output
```

## Variants

### Parallel run in production

```python
# Python — run legacy and refactored in parallel, compare results
import logging

def parallel_run(input_data):
    """Run both systems and log differences."""
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

# Run in production with shadow traffic
# Log mismatches but serve from legacy system
```

### Golden master with database state

```python
# Python — capture database state as golden master
import json
import hashlib

def capture_db_state(db_connection):
    """Capture current database state as a hash."""
    tables = ['users', 'orders', 'products']
    state = {}

    for table in tables:
        rows = db_connection.execute(f'SELECT * FROM {table} ORDER BY id')
        state[table] = [dict(row) for row in rows]

    state_json = json.dumps(state, sort_keys=True, default=str)
    return hashlib.sha256(state_json.encode()).hexdigest()

def test_database_state_unchanged_after_refactor():
    # Setup: populate database with test data
    setup_test_data(db)

    # Capture golden master state
    golden_hash = capture_db_state(db)

    # Run the refactored operation
    refactored_service.process_orders()

    # Verify database state matches
    current_hash = capture_db_state(db)
    assert current_hash == golden_hash, "Database state changed unexpectedly"
```

### Golden master with API responses

```javascript
// JavaScript — capture API responses as golden master
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

- Generate diverse inputs — normal, edge, boundary, and invalid cases
- Normalize non-deterministic values — timestamps, UUIDs, random IDs before comparison
- Use hashes for large outputs — SHA-256 comparison is faster than string comparison
- Run golden master tests in CI — catch regressions early
- Keep the golden master under version control — track what behavior you characterized
- Refactor in small steps — run golden master after each change
- Delete golden master tests when done — once you have proper unit tests, the golden master is redundant
- Document what the golden master covers — future developers need to know what behavior is characterized

## Common Mistakes

- **Insufficient test inputs**: generating only happy-path inputs misses edge cases. Include boundary and invalid inputs.
- **Not normalizing output**: timestamps and random values cause false failures. Always normalize before comparison.
- **Updating golden master blindly**: when the golden master changes, review the diff carefully. A change might be a regression, not an improvement.
- **Keeping golden master forever**: golden master tests are a safety net for refactoring. Once you have proper tests, delete them.
- **Testing too much output**: comparing entire HTML pages or large JSON makes diffs unreadable. Focus on the relevant parts.

## FAQ

### What is a golden master test?

A test that captures the current output of a system as a baseline (the "golden master") and verifies that future changes produce the same output. It characterizes what the code does, not what it should do.

### How is this different from snapshot testing?

Snapshot testing is a specific implementation of golden master testing. Golden master is the concept; snapshots are one tool. Other tools include file comparison, hash comparison, and approval testing.

### When should I delete golden master tests?

When you have proper unit tests that provide equal or better confidence. Golden master tests are a temporary safety net for refactoring legacy code, not a permanent testing strategy.

### What if the golden master has a bug?

The golden master captures current behavior, including bugs. If you find a bug, fix it and update the golden master. Document that the behavior changed intentionally.

### How many test inputs do I need?

Enough to exercise all code paths. Start with 100-1000 inputs covering normal, edge, and boundary cases. For complex systems, use property-based testing to generate inputs automatically.
