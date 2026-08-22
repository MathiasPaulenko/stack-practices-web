---
contentType: recipes
slug: java-wiremock-stub-external
title: "Stubear APIs HTTP Externos con WireMock en Java"
description: "Usá WireMock en tests de Java para stubear servicios HTTP externos. Cubre templating, simulación de delays, stubs stateful y verificación de requests."
metaDescription: "Stubeá servicios HTTP externos en tests de Java con WireMock. Simulá respuestas, delays, comportamiento stateful y response templating para tests confiables."
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
  metaDescription: "Stubeá servicios HTTP externos en tests de Java con WireMock. Simulá respuestas, delays, comportamiento stateful y response templating para tests confiables."
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

WireMock es una librería de Java que levanta un servidor HTTP real dentro del proceso de tus tests.
En lugar de pegarle a una API de terceros, tu código habla con WireMock y vos decidís exactamente
qué devuelve cada endpoint. Podés configurar códigos de estado, headers, bodies, delays artificiales
e incluso comportamiento stateful — todo desde el propio test.

## Cuándo Usar

- Tu código llama a una API REST externa, como un payment gateway, proveedor de SMS o servicio de
    email, y querés tests que no dependan del servicio real.
- Necesitás simular fallas — timeouts, 500s, respuestas lentas o rate limits — para ver cómo se
    comporta tu lógica de retry y fallback.
- Querés verificar el request exacto que envía tu código, no solo la respuesta que recibe.
- Estás construyendo un webhook receiver y necesitás un sender controlado sin levantar uno real.
- Corrés tests de integración en CI y no podés depender del acceso a red.

## Cuándo NO Usar

- Estás testeando tus propios endpoints. Para Spring, usá `MockMvc` o `WebTestClient`.
- Solo necesitás unit tests para lógica de negocio. En ese caso, mockeá la interfaz directamente con
    Mockito.
- Estás haciendo load testing. WireMock agrega overhead, así que usá un entorno real.
- Estás testeando interacciones con base de datos. Para eso, usá Testcontainers con una base real.

## Solución

### Setup con JUnit 5

```xml
<dependency>
    <groupId>com.github.tomakehurst</groupId>
    <artifactId>wiremock-jre8</artifactId>
    <version>3.9.1</version>
    <scope>test</scope>
</dependency>
```

### Stub básico con la extensión de JUnit 5

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

Este test arranca WireMock en un puerto aleatorio, registra un stub para `/api/users/1` y luego le
hace un HTTP call real.

### Stub con body JSON desde archivo

```java
wireMock.stubFor(WireMock.get(WireMock.urlPathEqualTo("/api/products"))
    .willReturn(WireMock.aResponse()
        .withStatus(200)
        .withBodyFile("products-response.json")));
```

Colocá `products-response.json` bajo `src/test/resources/__files/`.

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

### Verificar que se hicieron requests

```java
wireMock.verify(WireMock.postRequestedFor(WireMock.urlEqualTo("/api/orders"))
    .withRequestBody(WireMock.matchingJsonPath("$.product_id", WireMock.equalTo("10")))
    .withHeader("Authorization", WireMock.matching("Bearer .*")));
```

### Stubs stateful con escenarios

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

### Response templating con Handlebars

```java
wireMock.stubFor(WireMock.get(WireMock.urlPathMatching("/api/users/([0-9]+)"))
    .willReturn(WireMock.aResponse()
        .withStatus(200)
        .withTransformers("response-template")
        .withBody("{\"id\":{{request.path.[1]}},\"name\":\"User {{request.path.[1]}}\"}")));
```

### WireMock como servidor standalone

```java
import com.github.tomakehurst.wiremock.WireMockServer;

WireMockServer server = new WireMockServer(8089);
server.start();
server.stubFor(WireMock.get("/api/test").willReturn(WireMock.ok("hello")));
// ... correr tests ...
server.stop();
```

## Variantes

### Usando la anotación `@WireMockTest` (WireMock 3+)

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

### WireMock con Spring Boot

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

## Buenas Prácticas

- Dejá que WireMock elija el puerto con `dynamicPort()`. Los puertos fijos generan conflictos cuando
    los tests corren en paralelo.
- Guardá bodies grandes en archivos bajo `__files/` en lugar de inlinear JSON largo en Java.
- Usá `verify()` para chequear que tu código envió el request correcto, no solo que recibió una
    respuesta.
- Reseteá WireMock entre tests con `wireMock.resetAll()` o la anotación `@ResetWireMock`.
- Usá response templating para IDs dinámicos, así no necesitás un stub por cada valor.
- Siempre testeá los caminos de falla — delays, errores y respuestas lentas — o tu lógica de retry y
    fallback queda sin testear.

## Errores Comunes

- **Usar puertos fijos** — el puerto 8080 puede estar en uso. Dejá que WireMock elija.
- **No resetear entre tests** — los stubs de un test pueden filtrarse al siguiente. Llamá
    `resetAll()` en `@AfterEach`.
- **Stubs demasiado amplios** — `urlMatching(".*")` atrapa todo y oculta stubs faltantes.
- **No verificar requests** — stubear respuestas sin verificar el request te hace perder bugs en
    cómo tu código llama a la API.
- **Ignorar los logs de WireMock** — activá salida detallada con `.notifier(new
    ConsoleNotifier(true))` cuando un stub no matchea.

## Preguntas Frecuentes

### ¿Cómo matcheo request bodies con JSON path?

```java
wireMock.stubFor(WireMock.post(WireMock.urlEqualTo("/api/orders"))
    .withRequestBody(WireMock.matchingJsonPath("$.total", WireMockGreaterThan.greaterThan(100)))
    .willReturn(WireMock.ok()));
```

### ¿Puede WireMock proxyar requests a un servidor real?

Sí. El proxy mode pasa cualquier request que no tenga stub:

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

Sí, la API es la misma. En Kotlin, usá un `companion object` para la extensión:

```kotlin
companion object {
    @RegisterExtension
    @JvmStatic
    val wireMock = WireMockExtension.newInstance()
        .options(wireMockConfig().dynamicPort())
        .build()
}
```

### ¿Cómo debuggeo por qué un stub no hace match?

Activá el console logging:

```java
wireMockConfig()
    .notifier(new ConsoleNotifier(true))
```

WireMock imprime cada request entrante y los stubs contra los que intentó matchear.
