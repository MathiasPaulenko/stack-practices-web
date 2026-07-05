---
contentType: recipes
slug: java-spotbugs-static-analysis
title: "Detect Bugs in Java with SpotBugs Static Analysis"
description: "How to configure SpotBugs for Maven and Gradle, interpret bug patterns, suppress false positives, and integrate with CI/CD pipelines."
metaDescription: "Detect bugs in Java code with SpotBugs. Configure Maven and Gradle, interpret bug patterns, suppress false positives, and integrate with CI/CD."
difficulty: intermediate
topics:
  - security
tags:
  - security
  - java
  - spotbugs
  - static-analysis
  - code-quality
  - recipe
relatedResources:
  - /recipes/security/python-bandit-static-analysis
  - /recipes/security/typescript-eslint-strict-config
  - /recipes/devops/github-actions-reusable-workflows
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Detect bugs in Java code with SpotBugs. Configure Maven and Gradle, interpret bug patterns, suppress false positives, and integrate with CI/CD."
  keywords:
    - security
    - java
    - spotbugs
    - static-analysis
    - code-quality
    - recipe
---

## Overview

SpotBugs is a static analysis tool for Java that detects bug patterns — null pointer dereferences, resource leaks, SQL injection, unsafe serialization, concurrency issues, and more. It's the successor to FindBugs and integrates with Maven, Gradle, and IDEs. SpotBugs classifies findings by priority (High, Medium, Low) and by category (Correctness, Bad Practice, Malicious Code, Performance, Security).

## When to Use

- Java projects where runtime bugs are costly
- Codebases handling user input, file I/O, or database operations
- CI/CD pipelines to catch bugs before merge
- Security audits of Java applications
- Enforcing code quality standards across a team

## When NOT to Use

- Non-JVM languages — SpotBugs only analyzes Java bytecode
- Kotlin/Scala projects — use Detekt or Scalafix instead
- When you need runtime profiling — SpotBugs is static analysis only
- For dependency vulnerability scanning — use OWASP Dependency-Check instead

## Solution

### Maven configuration

```xml
<!-- pom.xml -->
<build>
  <plugins>
    <plugin>
      <groupId>com.github.spotbugs</groupId>
      <artifactId>spotbugs-maven-plugin</artifactId>
      <version>4.8.6.4</version>
      <dependencies>
        <dependency>
          <groupId>com.github.spotbugs</groupId>
          <artifactId>spotbugs</artifactId>
          <version>4.8.6</version>
        </dependency>
      </dependencies>
      <configuration>
        <effort>Max</effort>
        <threshold>Medium</threshold>
        <failOnError>true</failOnError>
        <excludeFilterFile>spotbugs-exclude.xml</excludeFilterFile>
        <plugins>
          <plugin>
            <groupId>com.h3xstream.findsecbugs</groupId>
            <artifactId>findsecbugs-plugin</artifactId>
            <version>1.13.0</version>
          </plugin>
        </plugins>
      </configuration>
      <executions>
        <execution>
          <goals>
            <goal>check</goal>
          </goals>
        </execution>
      </executions>
    </plugin>
  </plugins>
</build>
```

### Gradle configuration

```groovy
// build.gradle
plugins {
  id 'com.github.spotbugs' version '6.0.18'
}

spotbugs {
  effort = 'max'
  reportLevel = 'medium'
  excludeFilter = file('spotbugs-exclude.xml')
}

spotbugsMain {
  reports {
    html {
      required = true
      outputLocation = file("$buildDir/reports/spotbugs/main/spotbugs.html")
    }
    xml {
      required = true
      outputLocation = file("$buildDir/reports/spotbugs/main/spotbugs.xml")
    }
  }
}

// Add Find Security Bugs plugin
dependencies {
  spotbugsPlugins 'com.h3xstream.findsecbugs:findsecbugs-plugin:1.13.0'
}
```

### Gradle Kotlin DSL

```kotlin
// build.gradle.kts
plugins {
    id("com.github.spotbugs") version "6.0.18"
}

spotbugs {
    effort = com.github.spotbugs.snom.Effort.MAX
    reportLevel = com.github.spotbugs.snom.Confidence.MEDIUM
    excludeFilter = file("spotbugs-exclude.xml")
}

spotbugsMain {
    reports {
        create("html") {
            required = true
            outputLocation = file("$buildDir/reports/spotbugs/main/spotbugs.html")
        }
        create("xml") {
            required = true
            outputLocation = file("$buildDir/reports/spotbugs/main/spotbugs.xml")
        }
    }
}

dependencies {
    spotbugsPlugins("com.h3xstream.findsecbugs:findsecbugs-plugin:1.13.0")
}
```

### Running SpotBugs

```bash
# Maven
mvn spotbugs:check

# Maven with specific threshold
mvn spotbugs:check -Dspotbugs.threshold=high

# Gradle
./gradlew spotbugsMain

# Gradle — check all source sets
./gradlew spotbugsMain spotbugsTest

# Generate report only (don't fail build)
mvn spotbugs:spotbugs
```

### Exclude filter file

```xml
<!-- spotbugs-exclude.xml -->
<FindBugsFilter>
  <!-- Exclude test classes -->
  <Match>
    <Class name="~.*Test"/>
  </Match>

  <!-- Exclude generated code -->
  <Match>
    <Class name="~.*Generated.*"/>
  </Match>

  <!-- Exclude specific bug pattern in a class -->
  <Match>
    <Class name="com.example.legacy.LegacyService"/>
    <Bug pattern="EI_EXPOSE_REP"/>
  </Match>

  <!-- Exclude specific bug pattern everywhere -->
  <Match>
    <Bug pattern="EI_EXPOSE_REP,EI_EXPOSE_REP2"/>
  </Match>

  <!-- Exclude by priority and category -->
  <Match>
    <Bug category="PERFORMANCE" priority="3"/>
  </Match>
</FindBugsFilter>
```

### Common SpotBugs findings and fixes

#### NP_NULL_ON_SOME_PATH — Possible null pointer dereference

```java
// BAD — SpotBugs: NP_NULL_ON_SOME_PATH
public String getUserName(User user) {
    return user.getName().trim();  // user could be null
}

// GOOD — null check
public String getUserName(User user) {
    if (user == null) {
        return "";
    }
    return user.getName().trim();
}

// GOOD — use Optional
public String getUserName(Optional<User> user) {
    return user.map(User::getName).map(String::trim).orElse("");
}
```

#### EI_EXPOSE_REP — Returning internal array exposes representation

```java
// BAD — SpotBugs: EI_EXPOSE_REP
public class Inventory {
    private String[] items;

    public String[] getItems() {
        return items;  // Exposes internal array to modification
    }
}

// GOOD — return a copy
public class Inventory {
    private String[] items;

    public String[] getItems() {
        return Arrays.copyOf(items, items.length);
    }

    // Or return an unmodifiable list
    public List<String> getItemList() {
        return Collections.unmodifiableList(Arrays.asList(items));
    }
}
```

#### MS_SHOULD_BE_FINAL — Field should be final

```java
// BAD — SpotBugs: MS_SHOULD_BE_FINAL
public class Config {
    public static String API_URL = "https://api.example.com";
}

// GOOD — make it final
public class Config {
    public static final String API_URL = "https://api.example.com";
}
```

#### SQL_INJECTION_JDBC — Potential SQL injection

```java
// BAD — SpotBugs: SQL_INJECTION_JDBC
public User findUser(String name) throws SQLException {
    String query = "SELECT * FROM users WHERE name = '" + name + "'";
    Statement stmt = connection.createStatement();
    ResultSet rs = stmt.executeQuery(query);
    // ...
}

// GOOD — use PreparedStatement
public User findUser(String name) throws SQLException {
    String query = "SELECT * FROM users WHERE name = ?";
    PreparedStatement stmt = connection.prepareStatement(query);
    stmt.setString(1, name);
    ResultSet rs = stmt.executeQuery();
    // ...
}
```

#### OBL_UNSATISFIED_OBLIGATION — Resource not closed on all paths

```java
// BAD — SpotBugs: OBL_UNSATISFIED_OBLIGATION
public String readFile(String path) throws IOException {
    BufferedReader reader = new BufferedReader(new FileReader(path));
    String line = reader.readLine();
    return line;  // reader never closed
}

// GOOD — try-with-resources
public String readFile(String path) throws IOException {
    try (BufferedReader reader = new BufferedReader(new FileReader(path))) {
        return reader.readLine();
    }
}
```

#### RCN_REDUNDANT_NULLCHECK — Redundant null check

```java
// BAD — SpotBugs: RCN_REDUNDANT_NULLCHECK
public void process(String input) {
    if (input != null) {
        String result = input.trim();
        if (result != null) {  // trim() never returns null
            System.out.println(result);
        }
    }
}

// GOOD — remove redundant check
public void process(String input) {
    if (input != null) {
        String result = input.trim();
        System.out.println(result);
    }
}
```

### Inline suppression with annotations

```java
import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;

public class LegacyService {

    @SuppressFBWarnings(
        value = "EI_EXPOSE_REP",
        justification = "Internal API, not exposed to untrusted callers"
    )
    public String[] getInternalData() {
        return items;
    }

    // Suppress multiple patterns
    @SuppressFBWarnings(
        value = {"NP_NULL_ON_SOME_PATH", "RCN_REDUNDANT_NULLCHECK"},
        justification = "Reviewed: input is validated upstream"
    )
    public void process(String input) {
        // ...
    }
}
```

### CI/CD integration with GitHub Actions

```yaml
# .github/workflows/spotbugs.yml
name: SpotBugs Analysis

on: [push, pull_request]

jobs:
  spotbugs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: maven

      - name: Run SpotBugs
        run: mvn spotbugs:check -Dspotbugs.threshold=medium

      - name: Generate report
        if: always()
        run: mvn spotbugs:spotbugs

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: spotbugs-report
          path: target/spotbugsXml.xml
```

### CI/CD with Gradle

```yaml
# .github/workflows/spotbugs-gradle.yml
name: SpotBugs Analysis

on: [push, pull_request]

jobs:
  spotbugs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'

      - name: Run SpotBugs
        run: ./gradlew spotbugsMain --continue

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: spotbugs-report
          path: build/reports/spotbugs/
```

### Find Security Bugs plugin

```xml
<!-- pom.xml — adds security-specific bug patterns -->
<configuration>
  <plugins>
    <plugin>
      <groupId>com.h3xstream.findsecbugs</groupId>
      <artifactId>findsecbugs-plugin</artifactId>
      <version>1.13.0</version>
    </plugin>
  </plugins>
</configuration>
```

This adds detection for: SQL injection, XSS, LDAP injection, path traversal, insecure deserialization, weak crypto, hardcoded passwords, and more.

## Variants

### SpotBugs with custom ruleset

```xml
<!-- spotbugs-include.xml — only run specific categories -->
<FindBugsFilter>
  <Match>
    <Bug category="SECURITY,CORRECTNESS,MALICIOUS_CODE"/>
  </Match>
</FindBugsFilter>
```

```xml
<!-- pom.xml -->
<configuration>
  <includeFilterFile>spotbugs-include.xml</includeFilterFile>
  <excludeFilterFile>spotbugs-exclude.xml</excludeFilterFile>
</configuration>
```

### SpotBugs with SonarQube

```xml
<!-- pom.xml — SonarQube integrates SpotBugs findings -->
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.12</version>
</plugin>
```

```bash
# Run SpotBugs then SonarQube analysis
mvn spotbugs:spotbugs sonar:sonar -Dsonar.plugins=spotbugs
```

### SpotBugs baseline for incremental analysis

```bash
# Generate baseline
mvn spotbugs:spotbugs -Dspotbugs.baseline=spotbugs-baseline.xml

# On subsequent runs, only new bugs are reported
mvn spotbugs:check -Dspotbugs.baseline=spotbugs-baseline.xml
```

## Best Practices

- Use `effort=Max` for thorough analysis — slower but finds more issues
- Start with `threshold=Medium` — High is too strict for most projects, Low is too noisy
- Use the Find Security Bugs plugin — adds security-specific patterns
- Create an exclude filter file — document exclusions, don't suppress inline without reason
- Run in CI/CD — catch bugs before merge, not in production
- Use `@SuppressFBWarnings` with justification — always document why a finding is suppressed
- Combine with JaCoCo for coverage — SpotBugs finds bugs, JaCoCo shows what's tested
- Review excludes periodically — new SpotBugs versions add new patterns

## Common Mistakes

- **Setting `failOnError=true` on legacy codebases**: hundreds of findings will break the build. Start with `false`, fix gradually, then enable.
- **Suppressing without justification**: `@SuppressFBWarnings("EI_EXPOSE_REP")` without a `justification` hides the reason. Always document.
- **Only running on main source set**: test code can have bugs too. Run `spotbugsTest` as well.
- **Ignoring Low priority findings**: some Low findings indicate bad patterns that could escalate. Review them periodically.
- **Not using Find Security Bugs**: the base SpotBugs patterns miss many security issues. The plugin adds critical security checks.

## FAQ

### What is SpotBugs?

A static analysis tool for Java that detects bug patterns in compiled bytecode — null pointers, resource leaks, SQL injection, concurrency issues, and more.

### How is SpotBugs different from FindBugs?

SpotBugs is the community-maintained successor to FindBugs. FindBugs is no longer maintained. SpotBugs supports Java 9+ and has an active plugin ecosystem.

### What is Find Security Bugs?

A SpotBugs plugin that adds security-specific bug patterns — SQL injection, XSS, path traversal, insecure deserialization, weak crypto, hardcoded passwords, and more.

### Should I use SpotBugs or SonarQube?

They complement each other. SpotBugs does deep bytecode analysis. SonarQube aggregates multiple tools (including SpotBugs) and adds code smells, duplication, and coverage. Use both.

### How do I suppress a SpotBugs finding?

Use `@SuppressFBWarnings(value = "BUG_CODE", justification = "reason")` on the method or class. For broader exclusions, use the XML exclude filter file.
