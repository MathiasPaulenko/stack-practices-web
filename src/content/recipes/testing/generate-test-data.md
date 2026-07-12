---




contentType: recipes
slug: generate-test-data
title: "Generate Test Data"
description: "How to generate realistic, deterministic test data with Faker, factory-boy, and type-aware generators for reliable test suites in Python, JavaScript, and Java."
metaDescription: "Generate realistic, deterministic test data with Faker, factory-boy, and type-aware generators in Python, JavaScript, and Java."
difficulty: beginner
topics:
  - testing
tags:
  - testing
  - test-data
  - faker
  - factory-pattern
  - python
  - javascript
  - java
  - recipe
relatedResources:
  - /recipes/setup-test-fixtures
  - /recipes/measure-test-coverage
  - /patterns/factory-pattern
  - /recipes/python-hypothesis-property-testing
  - /recipes/implement-property-based-testing
lastUpdated: "2026-07-09"
author: "StackPractices"
seo:
  metaDescription: "Generate realistic, deterministic test data with Faker, factory-boy, and type-aware generators in Python, JavaScript, and Java."
  keywords:
    - testing
    - test-data
    - faker
    - factory-pattern
    - python
    - javascript
    - java
    - recipe




---

## Overview

Hardcoded test data (`name = "John"`, `email = "test@test.com"`) quickly becomes stale, fails to expose edge cases, and does not represent production data distributions. Generators produce realistic, varied, and deterministic data that makes tests more reliable while reducing manual fixture maintenance.

## When to Use


- For alternatives, see [JUnit5 Soft Assertions with AssertJ](/recipes/java-junit5-assertions-soft/).

- You maintain dozens of hardcoded test objects that drift from the production schema
- Edge cases (empty strings, Unicode, very long values) are never tested because they are tedious to write
- Integration tests need a database seeded with hundreds of realistic rows
- You want tests to exercise validation rules with varied input distributions
- Load tests need large volumes of plausible data

## When NOT to Use

- The test requires a very specific, known scenario — hardcode it explicitly
- Determinism across runs is more important than data variety — seed the generator but keep values minimal
- The data schema is extremely simple (2-3 fields) — a literal object is clearer
- You are testing a Faker-like library itself — use controlled, predictable inputs

## Step-by-Step Implementation

### Python

```python
from faker import Faker
from dataclasses import dataclass
from typing import List
import factory
from factory import Faker as FactoryFaker

fake = Faker()
Faker.seed(12345)  # Deterministic across runs

# Basic Faker usage
fake.name()        # 'John Smith'
fake.email()       # 'john.smith@example.com'
fake.ipv4()        # '192.168.1.45'
fake.uuid4()       # '550e8400-e29b-41d4-a716-446655440000'

# factory-boy for ORM objects
@dataclass
class User:
    id: int
    name: str
    email: str
    age: int
    is_active: bool

class UserFactory(factory.Factory):
    class Meta:
        model = User

    id = factory.Sequence(lambda n: n)
    name = FactoryFaker('name')
    email = FactoryFaker('email')
    age = factory.Faker('random_int', min=18, max=90)
    is_active = True

# Usage
user = UserFactory()           # Single instance
users = UserFactory.build_batch(100)  # 100 instances
admin = UserFactory(name="Admin User", age=30)

# Custom provider for domain-specific data
from faker.providers import BaseProvider

class ProductProvider(BaseProvider):
    def sku(self):
        categories = ['ELEC', 'BOOK', 'HOME', 'TOY']
        return f"{self.random_element(categories)}-{self.random_int(1000, 9999)}"

fake.add_provider(ProductProvider)
fake.sku()  # 'ELEC-4521'

# Deterministic dataset for property-based tests
import hypothesis.strategies as st

user_strategy = st.builds(
    User,
    id=st.integers(min_value=1),
    name=st.text(min_size=1, max_size=100),
    email=st.emails(),
    age=st.integers(min_value=0, max_value=120),
    is_active=st.booleans()
)
```

### JavaScript

```javascript
import { faker } from '@faker-js/faker';

// Seed for determinism
faker.seed(12345);

// Basic generators
faker.person.fullName();    // 'John Smith'
faker.internet.email();     // 'john.smith@example.com'
faker.number.int({ min: 18, max: 65 });  // 34

// Factory function
function createUser(overrides = {}) {
    return {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        email: faker.internet.email(),
        age: faker.number.int({ min: 18, max: 90 }),
        avatar: faker.image.avatar(),
        isActive: true,
        ...overrides
    };
}

// Generate batch
const users = Array.from({ length: 100 }, () => createUser());

// Domain-specific faker helpers
const createOrder = (overrides = {}) => ({
    id: faker.string.uuid(),
    customerId: faker.string.uuid(),
    items: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => ({
        sku: `SKU-${faker.string.alphanumeric(6).toUpperCase()}`,
        quantity: faker.number.int({ min: 1, max: 10 }),
        price: faker.commerce.price({ min: 5, max: 500 })
    })),
    status: faker.helpers.arrayElement(['pending', 'paid', 'shipped', 'delivered']),
    createdAt: faker.date.past(),
    ...overrides
});

// Deterministic data for snapshots
faker.seed(42);
const snapshotUser = createUser({ name: 'Snapshot User' });
```

### Java

```java
import net.datafaker.Faker;
import java.util.List;
import java.util.stream.IntStream;

public class TestDataGenerator {
    private static final Faker faker = new Faker();

    public static User createUser() {
        return User.builder()
            .id(faker.number().randomNumber())
            .name(faker.name().fullName())
            .email(faker.internet().emailAddress())
            .age(faker.number().numberBetween(18, 90))
            .isActive(true)
            .build();
    }

    public static List<User> createUsers(int count) {
        return IntStream.range(0, count)
            .mapToObj(i -> createUser())
            .toList();
    }

    // JUnit 5 parameterized with generated data
    public static Stream<Arguments> emailProvider() {
        return Stream.generate(() -> Arguments.of(faker.internet().emailAddress()))
            .limit(50);
    }
}

// Instancio for type-aware generation
import org.instancio.Instancio;
import org.instancio.Select;

User user = Instancio.of(User.class)
    .set(Select.field("role"), "admin")
    .generate(Select.field("age"), gen -> gen.ints().range(18, 90))
    .create();

List<User> users = Instancio.ofList(User.class).size(100).create();
```

## What Works

- **Always seed your random generator.** Without a seed, a test that fails on CI may pass locally because the data was different. Set `Faker.seed()` or `faker.seed()` in a global setup file.
- **Override specific fields for scenario tests.** `createUser({ role: 'admin' })` is clearer than hoping the random generator happens to produce an admin.
- **Use realistic distributions.** A random age between 0 and 120 will mostly produce invalid data. Constrain ranges to match your domain (18-90 for adult users).
- **Generate data close to the test.** A global `users.json` fixture file drifts from the schema. Generate programmatically so adding a new field updates all tests automatically.
- **Include edge cases intentionally.** Explicitly test empty strings, maximum lengths, Unicode, and null values alongside happy-path generated data.

## Common Mistakes

- **Unseeded random data.** Tests fail intermittently because a random email happened to match a uniqueness constraint, or a random string happened to contain a SQL injection pattern.
- **Overly permissive ranges.** `faker.number.int()` defaults to large ranges that may violate business rules (negative prices, 200-character names).
- **Mixing generated and hardcoded data inconsistently.** Some tests use Faker, others use literals — the test suite has inconsistent coverage and developers do not know which to reach for.
- **Not regenerating static fixture files.** Exporting a JSON fixture once and checking it into git means the data never exercises new validation rules added after the export.
- **Generators that depend on each other.** `createOrder()` calling `createUser()` internally hides the user from the test, making assertions on the relationship impossible.

## Frequently Asked Questions

### Why should I use factories instead of static fixtures?

Factories generate data on demand and adapt to schema changes automatically. Static fixtures become stale when fields are added or removed — a `users.json` file checked into git does not exercise new validation rules. Factories also allow per-test overrides: `createUser({ email: 'invalid' })` tests validation without modifying a shared fixture. Use static fixtures only for golden-path tests where the exact data matters (e.g., snapshot tests).

### How do I keep test data deterministic across CI and local runs?

Seed your random generator with a fixed value in a global setup file. In Python, call `Faker.seed(12345)` in `conftest.py`. In JavaScript, call `faker.seed(12345)` in a Jest `globalSetup`. In Java, construct `new Faker(new Random(12345))`. Never rely on system time or `/dev/urandom` for test data generation. If tests fail intermittently, check for unseeded generators in helper functions or third-party libraries.

### What data should never appear in tests?

Never use real personal data, production credentials, or payment information. Use synthetic data that resembles real data without exposing anyone. Faker generates plausible names, emails, and addresses that pass format validation without corresponding to real people. For PII compliance, avoid copying production data to test environments — even with masking, residual fields can expose individuals. Use data masking tools or generate fresh synthetic datasets for integration tests.

### How do I generate data with relationships between entities?

Pass related objects explicitly: `const user = createUser(); const order = createOrder({ customerId: user.id })`. Do not have `createOrder()` internally call `createUser()` — this hides the user from the test and makes assertions on the relationship impossible. For complex object graphs, use a test data builder that constructs the entire graph with explicit references. In Python, use `factory.SubFactory(UserFactory)` in `factory-boy` to link factories.

### How do I generate edge case data systematically?

Combine Faker with explicit edge case lists. Generate 80% of test data with Faker for broad coverage, then add 20% targeted edge cases: empty strings, maximum-length strings, Unicode characters, null values, negative numbers, zero, very large numbers, dates at boundaries (epoch, year 9999). Use property-based testing (Hypothesis, fast-check) for exhaustive edge case generation with shrinking.

### How do I generate data for database integration tests?

Use factory-boy with SQLAlchemy or Django ORM: `class UserFactory(factory.django.DjangoModelFactory)` with `Meta: model = User`. Call `UserFactory.create()` to insert into the database. Use a transactional test fixture that rolls back after each test to avoid data accumulation. For large datasets (1000+ rows), use `UserFactory.create_batch(1000)` in a module-level fixture. Clean up with `User.objects.all().delete()` in teardown.

### How do I share test data generators across test suites?

Extract factories into a shared module: `tests/factories/user_factory.py`. Import in test files: `from tests.factories import UserFactory`. For JavaScript, export from `test-utils/`: `export { createUser, createOrder } from './factories'`. Keep generators framework-agnostic — do not import test runner specifics into factory modules. Version the shared module so breaking changes are explicit.

### How do I generate realistic API payloads for contract tests?

Use Faker to generate field values, then wrap them in the API's expected schema. For OpenAPI specs, use `@stoplight/prism-cli` to generate mock data from the spec. For protobuf, use `buf` with custom plugins. Validate generated payloads against the schema with `ajv` (JSON Schema) or `protobufjs` before sending. Include invalid payloads in a separate test suite to verify error handling.

### How do I generate time-based test data for scheduling tests?

Use Faker's date methods with fixed reference points. Generate dates relative to a known base: `faker.date.between({ from: '2026-01-01', to: '2026-12-31' })`. For scheduling tests, generate events with non-overlapping time windows: `start = baseDate + i * duration`. Avoid `faker.date.recent()` in tests — it uses `Date.now()` and produces non-deterministic values. For timezone-sensitive tests, generate dates in UTC and convert to the target timezone in the test assertion. Store the base date in a fixture so all tests in a suite use the same reference point.

### How do I generate large datasets for load testing?

Use batch generation with `factory.build_batch(N)` in Python or `Array.from({ length: N }, () => createUser())` in JavaScript. For 100K+ rows, stream data to a file or database instead of holding it all in memory. In Python, use `factory.build_batch(10000)` in a loop and write to CSV with `csv.writer`. In JavaScript, use `createWriteStream` and write JSONL one record at a time. Seed Faker once at the start — re-seeding mid-generation resets the random sequence and produces duplicates. For database seeding, use `COPY FROM` (PostgreSQL) or `LOAD DATA INFILE` (MySQL) for 10x faster inserts than row-by-row ORM calls.

### How do I handle unique constraints with generated data?

Faker does not guarantee uniqueness. For emails, append a counter: `f"user{n}@example.com"`. For UUIDs, use `faker.string.uuid()` which is unique by design. For unique names in a batch, use `factory.Sequence(lambda n: f"user_{n}")` in factory-boy. In JavaScript, use a counter: `let i = 0; const email = \`user\${i++}@example.com\``. For database tests, wrap creation in a try-catch and retry with a new value if a unique constraint violation occurs. Do not rely on random generation for uniqueness — the probability of collision increases with batch size (birthday paradox).

### How do I generate data with constraints of foreign key?

Create parents before children: `user = UserFactory.create(); post = PostFactory.create(user_id=user.id)`. In factory-boy, use `SubFactory`: `user = factory.SubFactory(UserFactory)`. For circular constraints (A references B, B references A), create a placeholder record first, then update it. In integration tests, use `factory.PostGeneration` to create dependent records after the parent. Clean up in reverse order (children before parents) to avoid foreign key violations. Use `ON DELETE CASCADE` in the schema so cleanup is automatic.

### How do I generate data for i18n and localization tests?

Use Faker with specific locales: `Faker('es_ES')` for Spanish, `Faker('ja_JP')` for Japanese. Generate names, addresses, and phone numbers that match the locale format. Test Unicode validation: CJK characters, emojis, RTL characters (Arabic, Hebrew). Generate strings with lengths that exceed byte vs character limits (a CJK character can be 3 bytes in UTF-8). For timezone tests, generate dates in different offsets and verify the system converts them correctly to UTC.

### How do I generate data for concurrency tests?

Generate N records in parallel and verify the system handles concurrent writes correctly. In Python, use `concurrent.futures.ThreadPoolExecutor` to create records in parallel. In JavaScript, use `Promise.all` with multiple factory calls. Test race conditions: two threads creating a record with the same unique key simultaneously. Verify that transactions roll back correctly on deadlocks. Generate timestamps very close together (within the same millisecond) to test ordering. Use `factory.build_batch(N)` to generate data without persisting, then persist in parallel to test the database layer.

### How do I generate data for API contract testing?

Generate payloads that match the API contract schema exactly. Use OpenAPI/JSON Schema definitions to create valid data: extract required fields, types, and constraints from the schema. In JavaScript, use `@faker-js/faker` with `openapi-backend` to generate valid requests automatically. In Python, use `hypothesis` with strategies based on the JSON Schema. Generate invalid payloads too for validation testing: missing required fields, wrong types, out-of-range values. For versioned APIs, generate payloads for each version and verify the server handles them correctly.

### How do I generate data for performance and benchmark tests?

Generate datasets representative of production: same distribution of record sizes, same proportion of types. Use synthetic data with statistical realism: gaussian distributions for ages, power-law for access frequencies. For query benchmarks, generate datasets at specific sizes (1K, 10K, 100K, 1M rows) and measure query time at each level. Generate indexes with realistic cardinality to test the query planner. For write benchmarks, generate batches of different sizes and measure throughput. Use `timeit` in Python or `benchmark.js` for precise measurements. Document generation parameters so benchmarks are reproducible.

### How do I clean up generated test data after tests?

Use transactional test fixtures: wrap each test in a database transaction and roll back at the end. In pytest, use the `pytest-postgresql` plugin or `factory-boy`'s `SQLAlchemyModelFactory` with session-scoped fixtures. In Jest, use `beforeEach`/`afterEach` to set up and tear down data. For shared state across tests, use a dedicated test schema or database that is truncated between test runs. Never run tests against a production database. Use `TRUNCATE TABLE` with `CASCADE` for fast cleanup between test suites. For file-based test data, use `tempfile` directories that are automatically cleaned up by the OS.
