---
contentType: recipes
slug: java-wiremock-stub-external
title: "Stub External HTTP APIs with WireMock in Java"
description: "Use WireMock in Java tests to stub external HTTP services. Covers response templating, delay simulation, stateful stubs, and request verification."
metaDescription: "Stub external HTTP services in Java tests with WireMock. Simulate responses, delays, stateful behavior, and response templating for reliable integration tests."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - java
  - wiremock
  - mocking
  - http
  - stub
  - integration
  - junit
relatedResources:
  - /recipes/java-testcontainers-integration
  - /recipes/java-junit5-assertions-soft
  - /recipes/integration-testing-strategies
  - /recipes/javascript-msw-mock-service-worker
  - /recipes/api-mocking
  - /recipes/setup-test-fixtures
lastUpdated: "2026-08-22"
publishedAt: "2026-07-05"
author: Mathias Paulenko
seo:
  metaDescription: "Stub external HTTP services in Java tests with WireMock. Simulate responses, delays, stateful behavior, and response templating for reliable integration tests."
  keywords:
    - testing
    - java
    - wiremock
    - mocking
    - http
    - stub
    - integration
    - junit
---

WireMock is a Java library that starts a real HTTP server inside the test process. Instead of
calling a real third-party API, the code under test calls WireMock, which returns the responses you
define. That includes status codes, headers, body, delays, and even stateful behavior — all without
leaving the test.

## When to Use

- Testing code that talks to an external REST API — payment gateways, SMS providers, email services,
    and the like — without depending on the real service.
- Simulating failures such as timeouts, 500s, slow responses, or rate limits to exercise retry and
    fallback logic.
- Verifying the exact request your code sends, not just the response it receives.
- Building a webhook receiver and needing a fake sender without setting up a real one.
- Running integration tests in CI where network access isn't guaranteed.

## When NOT to Use

- Testing your own endpoints. For Spring, use `MockMvc` or `WebTestClient`.
- Pure business-logic unit tests. Mock the interface directly with Mockito.
- Load testing. WireMock has its own overhead, so use a real test environment.
- Database interactions. Use Testcontainers with a real database instead.

## Solution

### Setup with JUnit 5

```xml
<dependency>
    <groupId>com.github.tomakehurst</groupId>
    <artifactId>wiremock-jre8</artifactId>
    <version>3.9.1</version>
    <scope>test</scope>
</dependency>
```

### Basic stub with the JUnit 5 extension

```java
import com.github.tomakehurst.wiremock.client.WireMock;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.junit.jupiter.api.Assertions.assertEquals;

class ExternalServiceTest {

    @RegisterExtension
    static WireMockExtension wireMock = WireMockExtension.newInstance()
        .options(wireMockConfig().dynamicPort())
        .build();

    @Test
    void shouldStubGetRequest() throws Exception {
        wireMock.stubFor(WireMock.get(WireMock.urlEqualTo("/api/users/1"))
            .willReturn(WireMock.aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{\"id\":1,\"name\":\"Alice\"}")));

        HttpResponse<String> response = HttpClient.newHttpClient()
            .send(HttpRequest.newBuilder()
                .uri(URI.create(wireMock.getRuntimeInfo().getHttpBaseUrl() + "/api/users/1"))
                .GET().build(), HttpResponse.BodyHandlers.ofString());

        assertEquals(200, response.statusCode());
        assertEquals("Alice", parseJson(response.body(), "name"));
    }
}
```

This test starts WireMock on a random port, registers a stub for `/api/users/1`, then makes a real
HTTP call to it.

### Stub with a JSON body from a file

```java
wireMock.stubFor(WireMock.get(WireMock.urlPathEqualTo("/api/products"))
    .willReturn(WireMock.aResponse()
        .withStatus(200)
        .withBodyFile("products-response.json")));
```

Put `products-response.json` under `src/test/resources/__files/`.

### Simulate delay and timeout

```java
wireMock.stubFor(WireMock.get(WireMock.urlEqualTo("/api/slow"))
    .willReturn(WireMock.aResponse()
        .withStatus(200)
        .withFixedDelay(5000)
        .withBody("{\"data\":\"delayed\"}")));
```

### Simulate error responses

```java
wireMock.stubFor(WireMock.get(WireMock.urlEqualTo("/api/error"))
    .willReturn(WireMock.aResponse()
        .withStatus(500)
        .withBody("{\"error\":\"Internal Server Error\"}")));

wireMock.stubFor(WireMock.post(WireMock.urlEqualTo("/api/rate-limited"))
    .willReturn(WireMock.aResponse()
        .withStatus(429)
        .withHeader("Retry-After", "60")
        .withBody("{\"error\":\"Rate limit exceeded\"}")));
```

### Verify requests were made

```java
wireMock.verify(WireMock.postRequestedFor(WireMock.urlEqualTo("/api/orders"))
    .withRequestBody(WireMock.matchingJsonPath("$.product_id", WireMock.equalTo("10")))
    .withHeader("Authorization", WireMock.matching("Bearer .*")));
```

### Stateful stubbing with scenarios

```java
wireMock.stubFor(WireMock.get(WireMock.urlEqualTo("/api/order/status"))
    .inScenario("Order Processing")
    .whenScenarioStateIs("Started")
    .willReturn(WireMock.aResponse().withBody("{\"status\":\"pending\"}"))
    .willSetStateTo("Processing"));

wireMock.stubFor(WireMock.get(WireMock.urlEqualTo("/api/order/status"))
    .inScenario("Order Processing")
    .whenScenarioStateIs("Processing")
    .willReturn(WireMock.aResponse().withBody("{\"status\":\"shipped\"}"))
    .willSetStateTo("Completed"));

wireMock.stubFor(WireMock.get(WireMock.urlEqualTo("/api/order/status"))
    .inScenario("Order Processing")
    .whenScenarioStateIs("Completed")
    .willReturn(WireMock.aResponse().withBody("{\"status\":\"delivered\"}")));
```

### Response templating with Handlebars

```java
wireMock.stubFor(WireMock.get(WireMock.urlPathMatching("/api/users/([0-9]+)"))
    .willReturn(WireMock.aResponse()
        .withStatus(200)
        .withTransformers("response-template")
        .withBody("{\"id\":{{request.path.[1]}},\"name\":\"User {{request.path.[1]}}\"}")));
```

### WireMock as a standalone server

```java
import com.github.tomakehurst.wiremock.WireMockServer;

WireMockServer server = new WireMockServer(8089);
server.start();
server.stubFor(WireMock.get("/api/test").willReturn(WireMock.ok("hello")));
// ... run tests ...
server.stop();
```

## Variants

### Using the `@WireMockTest` annotation (WireMock 3+)

```java
@WireMockTest(httpPort = 8089)
class AnnotationTest {

    @Test
    void testWithAnnotation(WireMock wireMock) {
        wireMock.register(WireMock.get("/api/test")
            .willReturn(WireMock.ok("hello")));
        // test code
    }
}
```

### WireMock with Spring Boot

```java
@SpringBootTest
class SpringIntegrationTest {

    @RegisterExtension
    static WireMockExtension wireMock = WireMockExtension.newInstance()
        .options(wireMockConfig().dynamicPort())
        .build();

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("external.api.url", wireMock::getRuntimeInfo);
    }
}
```

## Best Practices

- Let WireMock pick the port with `dynamicPort()`. Hard-coded ports are a recipe for conflicts when
    tests run in parallel.
- Store large response bodies in files under `__files/` instead of inlining long JSON strings in
    Java.
- Use `verify()` to confirm your code sent the right request, not only that it got a response.
- Reset WireMock between tests with `wireMock.resetAll()` or the `@ResetWireMock` annotation.
- Use response templating for dynamic IDs so you don't need one stub per value.
- Always exercise the failure paths — delays, errors, and slow responses — or your retry and
    fallback logic stays untested.

## Common Mistakes

- **Using fixed ports** — port 8080 might already be in use. Use `dynamicPort()`.
- **Not resetting between tests** — stubs from one test can leak into the next. Call `resetAll()` in
    `@AfterEach`.
- **Stubbing too broadly** — `urlMatching(".*")` catches every request and hides missing stubs.
- **Not verifying requests** — stubbing responses without checking the request misses bugs in how
    your code calls the API.
- **Ignoring WireMock logs** — enable verbose output with `.notifier(new ConsoleNotifier(true))`
    when a stub isn't matching.

## FAQ

### How do I match request bodies with JSON path?

```java
wireMock.stubFor(WireMock.post(WireMock.urlEqualTo("/api/orders"))
    .withRequestBody(WireMock.matchingJsonPath("$.total", WireMockGreaterThan.greaterThan(100)))
    .willReturn(WireMock.ok()));
```

### Can WireMock proxy requests to a real server?

Yes. Proxy mode passes through any request that doesn't have a stub:

```java
wireMock.stubFor(WireMock.any(WireMock.anyUrl())
    .willReturn(WireMock.aResponse().proxiedFrom("https://real-api.example.com")));
```

### How do I simulate a connection reset?

```java
wireMock.stubFor(WireMock.get("/api/down")
    .willReturn(WireMock.aResponse()
        .withFault(Fault.CONNECTION_RESET_BY_PEER)));
```

### Can I use WireMock with Kotlin?

Yes — the API is the same. In Kotlin, use a `companion object` for the extension:

```kotlin
companion object {
    @RegisterExtension
    @JvmStatic
    val wireMock = WireMockExtension.newInstance()
        .options(wireMockConfig().dynamicPort())
        .build()
}
```

### How do I debug why a stub isn't matching?

Enable console logging and WireMock prints every incoming request, plus the stubs it tried to match:

```java
wireMockConfig()
    .notifier(new ConsoleNotifier(true))
```
