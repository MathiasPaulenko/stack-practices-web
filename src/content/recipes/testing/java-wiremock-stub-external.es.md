---
contentType: recipes
slug: java-wiremock-stub-external
title: "Stubear Servicios HTTP Externos con WireMock"
description: "Cómo usar WireMock en tests de Java para stubear servicios HTTP externos, incluyendo templating de respuestas, simulación de delays y comportamiento stateful."
metaDescription: "Stubea servicios HTTP externos en tests de Java con WireMock. Simula respuestas, delays, comportamiento stateful y templating para tests de integración confiables."
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
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Stubea servicios HTTP externos en tests de Java con WireMock. Simula respuestas, delays, comportamiento stateful y templating para tests de integración confiables."
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

WireMock es una librería de Java que arranca un servidor HTTP y te permite definir stub mappings para servicios externos. En lugar de llamar APIs reales de terceros, tu código hittea WireMock, que devuelve respuestas predefinidas. Controlas códigos de estado, headers, bodies, delays e incluso comportamiento stateful — todo desde tu código de test.

## When to Use

- Testear código que llama APIs REST externas (payment gateways, SMS, email providers)
- Simular fallos de API (timeouts, 500s, respuestas lentas) para testear lógica de retry
- Verificar que tu código envía la petición correcta a un servicio externo
- Testear webhook receivers sin un sender real
- Correr tests de integración en CI sin acceso a red

## When NOT to Use

- Testear tus propios endpoints de API — usa `MockMvc` o `WebTestClient` para Spring
- Unit testing de lógica de negocio — mockea la interfaz directamente con Mockito
- Load testing — WireMock añade overhead; usa un entorno de test real en su lugar
- Testear interacciones con base de datos — usa Testcontainers con una DB real

## Solution

### Setup con JUnit5

```xml
<dependency>
    <groupId>com.github.tomakehurst</groupId>
    <artifactId>wiremock-jre8</artifactId>
    <version>3.9.1</version>
    <scope>test</scope>
</dependency>
```

### Stub básico con extensión de JUnit5

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

### Stub con JSON body desde archivo

```java
wireMock.stubFor(WireMock.get(WireMock.urlPathEqualTo("/api/products"))
    .willReturn(WireMock.aResponse()
        .withStatus(200)
        .withBodyFile("products-response.json")));
```

Coloca `products-response.json` en `src/test/resources/__files/`.

### Simular delay y timeout

```java
wireMock.stubFor(WireMock.get(WireMock.urlEqualTo("/api/slow"))
    .willReturn(WireMock.aResponse()
        .withStatus(200)
        .withFixedDelay(5000)
        .withBody("{\"data\":\"delayed\"}")));
```

### Simular respuestas de error

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

### Verificar que se hicieron las peticiones

```java
wireMock.verify(WireMock.postRequestedFor(WireMock.urlEqualTo("/api/orders"))
    .withRequestBody(WireMock.matchingJsonPath("$.product_id", WireMock.equalTo("10")))
    .withHeader("Authorization", WireMock.matching("Bearer .*")));
```

### Stubbing stateful con escenarios

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

### Templating de respuestas con Handlebars

```java
wireMock.stubFor(WireMock.get(WireMock.urlPathMatching("/api/users/([0-9]+)"))
    .willReturn(WireMock.aResponse()
        .withStatus(200)
        .withTransformers("response-template")
        .withBody("{\"id\":{{request.path.[1]}},\"name\":\"User {{request.path.[1]}}\"}")));
```

### Usar WireMock como servidor standalone

```java
import com.github.tomakehurst.wiremock.WireMockServer;

WireMockServer server = new WireMockServer(8089);
server.start();
server.stubFor(WireMock.get("/api/test").willReturn(WireMock.ok("hello")));
// ... correr tests ...
server.stop();
```

## Variants

### Usar anotación `@WireMockTest` (WireMock 3+)

```java
@WireMockTest(httpPort = 8089)
class AnnotationTest {

    @Test
    void testWithAnnotation(WireMock wireMock) {
        wireMock.register(WireMock.get("/api/test")
            .willReturn(WireMock.ok("hello")));
        // código de test
    }
}
```

### Usar WireMock con Spring Boot `@SpringBootTest`

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

- Usa `dynamicPort()` — los puertos fijos causan conflictos cuando los tests corren en paralelo
- Guarda bodies de respuesta grandes en archivos bajo `__files/` — no inlinees JSON de 500 líneas en código de test
- Usa `verify()` para asertar que tu código envió la petición correcta, no solo que recibió la respuesta correcta
- Resetea WireMock entre tests con `wireMock.resetAll()` o usa la anotación `@ResetWireMock`
- Usa templating de respuesta para IDs dinámicos en lugar de crear un stub por ID
- Simula delays y errores — testear solo el happy path misses lógica de retry y fallback

## Common Mistakes

- **Usar puertos fijos**: el puerto 8080 puede estar en uso. Siempre usa `dynamicPort()`.
- **No resetear entre tests**: los stubs de un test filtran al siguiente. Llama `resetAll()` en `@AfterEach`.
- **Stubear demasiado broad**: `urlMatching(".*")` atrapa cada petición, ocultando stubs faltantes para otros endpoints.
- **No verificar peticiones**: stubear respuestas sin verificar la petición misses bugs en cómo tu código llama a la API.
- **Ignorar logs de WireMock**: habilita logging verbose con `.notifier(new ConsoleNotifier(true))` para debuggear problemas de stub matching.

## FAQ

### ¿Cómo hago match de request bodies con JSON path?

```java
wireMock.stubFor(WireMock.post(WireMock.urlEqualTo("/api/orders"))
    .withRequestBody(WireMock.matchingJsonPath("$.total", WireMockGreaterThan.greaterThan(100)))
    .willReturn(WireMock.ok()));
```

### ¿WireMock puede proxyear peticiones a un servidor real?

Sí. Usa modo proxy para pasar peticiones sin stub:

```java
wireMock.stubFor(WireMock.any(WireMock.anyUrl())
    .willReturn(WireMock.aResponse().proxiedFrom("https://real-api.example.com")));
```

### ¿Cómo simulo un connection reset?

```java
wireMock.stubFor(WireMock.get("/api/down")
    .willReturn(WireMock.aResponse()
        .withFault(Fault.CONNECTION_RESET_BY_PEER)));
```

### ¿Puedo usar WireMock con Kotlin?

Sí. La API funciona idénticamente. Usa `companion object` para la extensión:

```kotlin
companion object {
    @RegisterExtension
    @JvmStatic
    val wireMock = WireMockExtension.newInstance()
        .options(wireMockConfig().dynamicPort())
        .build()
}
```

### ¿Cómo debuggeo por qué un stub no matchea?

Habilita console logging: `.notifier(new ConsoleNotifier(true))`. WireMock imprime cada petición entrante y qué stubs intentó matchear.
