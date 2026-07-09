---
contentType: recipes
slug: java-wiremock-stub-external
title: "Stub External HTTP Services with WireMock"
description: "How to use WireMock in Java tests to stub external HTTP services, including response templating, delay simulation, and stateful mock behavior."
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
  - recipe
relatedResources:
  - /recipes/testing/java-testcontainers-integration
  - /recipes/testing/java-junit5-assertions-soft
  - /recipes/testing/integration-testing-strategies
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Stub external HTTP services in Java tests with WireMock. Simulate responses, delays, stateful behavior, and response templating for reliable integration tests."
  keywords:
    - testing
    - java
    - wiremock
    - mocking
    - http
    - stub
    - recipe
---

## Overview

WireMock is a Java library that starts an HTTP server and lets you define stub mappings for external services. Instead of calling real third-party APIs, your code hits WireMock, which returns predefined responses. You control status codes, headers, bodies, delays, and even stateful behavior — all from your test code.

## When to Use

- Testing code that calls external REST APIs (payment gateways, SMS, email providers)
- Simulating API failures (timeouts, 500s, slow responses) to test retry logic
- Verifying that your code sends the correct request to an external service
- Testing webhook receivers without a real sender
- Running integration tests in CI without network access

## When NOT to Use

- Testing your own API endpoints — use `MockMvc` or `WebTestClient` for Spring
- Unit testing business logic — mock the interface directly with Mockito
- Load testing — WireMock adds overhead; use a real test environment instead
- Testing database interactions — use Testcontainers with a real database

## Solution

### Setup with JUnit5

```xml
<dependency>
    <groupId>com.github.tomakehurst</groupId>
    <artifactId>wiremock-jre8</artifactId>
    <version>3.9.1</version>
    <scope>test</scope>
</dependency>
```

### Basic stub with JUnit5 extension

```java
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import com.github.tomakehurst.wiremock.client.WireMock;
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

### Stub with JSON body from file

```java
wireMock.stubFor(WireMock.get(WireMock.urlPathEqualTo("/api/products"))
    .willReturn(WireMock.aResponse()
        .withStatus(200)
        .withBodyFile("products-response.json")));
```

Place `products-response.json` in `src/test/resources/__files/`.

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

### Using WireMock as a standalone server

```java
import com.github.tomakehurst.wiremock.WireMockServer;

WireMockServer server = new WireMockServer(8089);
server.start();
server.stubFor(WireMock.get("/api/test").willReturn(WireMock.ok("hello")));
// ... run tests ...
server.stop();
```

## Variants

### Using `@WireMockTest` annotation (WireMock 3+)

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

### Using WireMock with Spring Boot `@SpringBootTest`

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

- Use `dynamicPort()` — fixed ports cause conflicts when tests run in parallel
- Store large response bodies in files under `__files/` — don't inline 500-line JSON in test code
- Use `verify()` to assert your code sent the correct request, not just that it received the right response
- Reset WireMock between tests with `wireMock.resetAll()` or use `@ResetWireMock` annotation
- Use response templating for dynamic IDs instead of creating a stub per ID
- Simulate delays and errors — testing only the happy path misses retry and fallback logic

## Common Mistakes

- **Using fixed ports**: port 8080 might be in use. Always use `dynamicPort()`.
- **Not resetting between tests**: stubs from one test leak into the next. Call `resetAll()` in `@AfterEach`.
- **Stubbing too broadly**: `urlMatching(".*")` catches every request, hiding missing stubs for other endpoints.
- **Not verifying requests**: stubbing responses without verifying the request misses bugs in how your code calls the API.
- **Ignoring WireMock logs**: enable verbose logging with `.notifier(new ConsoleNotifier(true))` to debug stub matching issues.

## FAQ

### How do I match request bodies with JSON path?

```java
wireMock.stubFor(WireMock.post(WireMock.urlEqualTo("/api/orders"))
    .withRequestBody(WireMock.matchingJsonPath("$.total", WireMockGreaterThan.greaterThan(100)))
    .willReturn(WireMock.ok()));
```

### Can WireMock proxy requests to a real server?

Yes. Use proxy mode to pass through unstubbed requests:

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

Yes. The API works identically. Use `companion object` for the extension:

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

Enable console logging: `.notifier(new ConsoleNotifier(true))`. WireMock prints every incoming request and which stubs it tried to match.

### How do I stub OAuth2 token endpoints with WireMock?

Stub the token endpoint with a fixed expiry and use response templating to echo the requested scope:

```java
wireMock.stubFor(WireMock.post(WireMock.urlEqualTo("/oauth/token"))
    .withRequestBody(WireMock.containing("grant_type=client_credentials"))
    .willReturn(WireMock.aResponse()
        .withHeader("Content-Type", "application/json")
        .withBody("{"access_token":"test-token","expires_in":3600}")));
```

Configure your HTTP client to use the WireMock server URL as the token endpoint. This avoids hitting the real IdP during tests while still exercising the token retrieval flow.
