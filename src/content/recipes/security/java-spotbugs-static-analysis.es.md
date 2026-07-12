---




contentType: recipes
slug: java-spotbugs-static-analysis
title: "Detectar Bugs en Java con SpotBugs Static Analysis"
description: "Cómo configurar SpotBugs para Maven y Gradle, interpretar bug patterns, suprimir false positives e integrar con pipelines CI/CD."
metaDescription: "Detecta bugs en código Java con SpotBugs. Configura Maven y Gradle, interpreta bug patterns, suprime false positives e integra con CI/CD."
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
  - /recipes/python-bandit-static-analysis
  - /recipes/typescript-eslint-strict-config
  - /recipes/github-actions-reusable-workflows
  - /recipes/nodejs-eslint-security-plugin
  - /recipes/python-mypy-strict-type-checking
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Detecta bugs en código Java con SpotBugs. Configura Maven y Gradle, interpreta bug patterns, suprime false positives e integra con CI/CD."
  keywords:
    - security
    - java
    - spotbugs
    - static-analysis
    - code-quality
    - recipe




---

## Overview

SpotBugs es una herramienta de static analysis para Java que detecta bug patterns — null pointer dereferences, resource leaks, SQL injection, unsafe serialization, concurrency issues, y más. Es el sucesor de FindBugs y se integra con Maven, Gradle e IDEs. SpotBugs clasifica findings por priority (High, Medium, Low) y por category (Correctness, Bad Practice, Malicious Code, Performance, Security).

## When to Use

- Proyectos Java donde los bugs en runtime son costosos
- Codebases que manejan user input, file I/O, u operaciones de database
- Pipelines CI/CD para atrapar bugs antes del merge
- Security audits de aplicaciones Java
- Enforzar standards de code quality a través de un equipo

## When NOT to Use

- Lenguajes non-JVM — SpotBugs solo analiza Java bytecode
- Proyectos Kotlin/Scala — usá Detekt o Scalafix en su lugar
- Cuando necesitás runtime profiling — SpotBugs es static analysis únicamente
- Para scanning de vulnerabilidades de dependencias — usá OWASP Dependency-Check en su lugar

## Solution

### Configuración Maven

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

### Configuración Gradle

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

// Agregar Find Security Bugs plugin
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

### Correr SpotBugs

```bash
# Maven
mvn spotbugs:check

# Maven con threshold específico
mvn spotbugs:check -Dspotbugs.threshold=high

# Gradle
./gradlew spotbugsMain

# Gradle — checkear todos los source sets
./gradlew spotbugsMain spotbugsTest

# Generar reporte solo (no fallar build)
mvn spotbugs:spotbugs
```

### Archivo exclude filter

```xml
<!-- spotbugs-exclude.xml -->
<FindBugsFilter>
  <!-- Excluir clases de test -->
  <Match>
    <Class name="~.*Test"/>
  </Match>

  <!-- Excluir código generado -->
  <Match>
    <Class name="~.*Generated.*"/>
  </Match>

  <!-- Excluir bug pattern específico en una clase -->
  <Match>
    <Class name="com.example.legacy.LegacyService"/>
    <Bug pattern="EI_EXPOSE_REP"/>
  </Match>

  <!-- Excluir bug pattern específico en todos lados -->
  <Match>
    <Bug pattern="EI_EXPOSE_REP,EI_EXPOSE_REP2"/>
  </Match>

  <!-- Excluir por priority y category -->
  <Match>
    <Bug category="PERFORMANCE" priority="3"/>
  </Match>
</FindBugsFilter>
```

### Findings comunes de SpotBugs y fixes

#### NP_NULL_ON_SOME_PATH — Possible null pointer dereference

```java
// BAD — SpotBugs: NP_NULL_ON_SOME_PATH
public String getUserName(User user) {
    return user.getName().trim();  // user podría ser null
}

// GOOD — null check
public String getUserName(User user) {
    if (user == null) {
        return "";
    }
    return user.getName().trim();
}

// GOOD — usar Optional
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
        return items;  // Expone el array interno a modificación
    }
}

// GOOD — retornar una copia
public class Inventory {
    private String[] items;

    public String[] getItems() {
        return Arrays.copyOf(items, items.length);
    }

    // O retornar unmodifiable list
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

// GOOD — hacerla final
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

// GOOD — usar PreparedStatement
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
    return line;  // reader nunca se cierra
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
        if (result != null) {  // trim() nunca retorna null
            System.out.println(result);
        }
    }
}

// GOOD — remover check redundante
public void process(String input) {
    if (input != null) {
        String result = input.trim();
        System.out.println(result);
    }
}
```

### Supresión inline con annotations

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

    // Suprimir múltiples patterns
    @SuppressFBWarnings(
        value = {"NP_NULL_ON_SOME_PATH", "RCN_REDUNDANT_NULLCHECK"},
        justification = "Reviewed: input is validated upstream"
    )
    public void process(String input) {
        // ...
    }
}
```

### Integración con CI/CD usando GitHub Actions

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

### CI/CD con Gradle

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
<!-- pom.xml — agrega bug patterns security-specific -->
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

Esto agrega detección para: SQL injection, XSS, LDAP injection, path traversal, insecure deserialization, weak crypto, hardcoded passwords, y más.

## Variants

### SpotBugs con custom ruleset

```xml
<!-- spotbugs-include.xml — solo correr categories específicas -->
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

### SpotBugs con SonarQube

```xml
<!-- pom.xml — SonarQube integra findings de SpotBugs -->
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.12</version>
</plugin>
```

```bash
# Correr SpotBugs después análisis de SonarQube
mvn spotbugs:spotbugs sonar:sonar -Dsonar.plugins=spotbugs
```

### SpotBugs baseline para análisis incremental

```bash
# Generar baseline
mvn spotbugs:spotbugs -Dspotbugs.baseline=spotbugs-baseline.xml

# En runs subsiguientes, solo se reportan bugs nuevos
mvn spotbugs:check -Dspotbugs.baseline=spotbugs-baseline.xml
```

## Best Practices


- For a deeper guide, see [Enforce Security Rules in Node.js with](/es/recipes/nodejs-eslint-security-plugin/).

- Usá `effort=Max` para análisis exhaustivo — más lento pero encuentra más issues
- Empezá con `threshold=Medium` — High es demasiado strict para la mayoría de proyectos, Low es demasiado ruidoso
- Usá el Find Security Bugs plugin — agrega patterns security-specific
- Creá un archivo exclude filter — documentá las exclusiones, no suprimas inline sin razón
- Corré en CI/CD — atrapá bugs antes del merge, no en producción
- Usá `@SuppressFBWarnings` con justification — siempre documentá por qué un finding se suprime
- Combiná con JaCoCo para coverage — SpotBugs encuentra bugs, JaCoCo muestra qué está testeado
- Revisá los excludes periódicamente — nuevas versiones de SpotBugs agregan nuevos patterns

## Common Mistakes

- **Setear `failOnError=true` en codebases legacy**: cientos de findings van a romper el build. Empezá con `false`, fixeá gradualmente, después habilitá.
- **Suprimir sin justification**: `@SuppressFBWarnings("EI_EXPOSE_REP")` sin `justification` esconde la razón. Siempre documentá.
- **Solo correr en el source set main**: el código de test puede tener bugs también. Corré `spotbugsTest` también.
- **Ignorar findings de Low priority**: algunos findings Low indican malos patterns que pueden escalar. Revisalos periódicamente.
- **No usar Find Security Bugs**: los patterns base de SpotBugs se pierden muchos issues de seguridad. El plugin agrega checks de seguridad críticos.

## FAQ

### ¿Qué es SpotBugs?

Una herramienta de static analysis para Java que detecta bug patterns en bytecode compilado — null pointers, resource leaks, SQL injection, concurrency issues, y más.

### ¿En qué se diferencia SpotBugs de FindBugs?

SpotBugs es el sucesor mantenido por la comunidad de FindBugs. FindBugs ya no se mantiene. SpotBugs soporta Java 9+ y tiene un ecosistema de plugins activo.

### ¿Qué es Find Security Bugs?

Un plugin de SpotBugs que agrega bug patterns security-specific — SQL injection, XSS, path traversal, insecure deserialization, weak crypto, hardcoded passwords, y más.

### ¿Debería usar SpotBugs o SonarQube?

Se complementan. SpotBugs hace deep bytecode analysis. SonarQube agrega múltiples herramientas (incluyendo SpotBugs) y agrega code smells, duplicación, y coverage. Usá ambos.

### ¿Cómo suprimo un finding de SpotBugs?

Usá `@SuppressFBWarnings(value = "BUG_CODE", justification = "reason")` en el método o clase. Para exclusiones más amplias, usá el archivo XML exclude filter.
