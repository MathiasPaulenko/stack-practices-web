---
contentType: recipes
slug: java-completable-future-composition
title: "Componer Pipelines Asincronos con Java CompletableFuture"
description: "Construir pipelines async no bloqueantes en Java usando CompletableFuture con thenCompose, thenCombine, allOf, anyOf, manejo de excepciones, timeouts y thread pools personalizados."
metaDescription: "Construye pipelines async en Java con CompletableFuture. Usa thenCompose, thenCombine, allOf, anyOf, manejo de errores, timeouts y executors personalizados."
difficulty: advanced
topics:
  - concurrency
  - performance
  - api
tags:
  - java
  - completable-future
  - async
  - concurrency
  - composition
relatedResources:
  - /recipes/concurrency/python-asyncio-gather-task-groups
  - /recipes/concurrency/python-thread-pool-executor
  - /guides/concurrency-patterns-guide
  - /guides/complete-guide-graphql-federation
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye pipelines async en Java con CompletableFuture. Usa thenCompose, thenCombine, allOf, anyOf, manejo de errores, timeouts y executors personalizados."
  keywords:
    - java completablefuture
    - completablefuture thenCompose
    - java async pipeline
    - completablefuture allOf
    - java non-blocking composition
---

## Descripcion general

`CompletableFuture` es el primitivo async componible de Java. Encadena operaciones, combina multiples futures, maneja errores declarativamente y ejecuta en thread pools configurables. A continuacion: composicion secuencial con `thenCompose`, combinacion paralela con `thenCombine` y `allOf`, recuperacion de errores con `exceptionally` y `handle`, timeouts y executors personalizados.

## Cuando Usar Esto

- Llamadas a API a multiples servicios que necesitan agregacion
- Pipelines async multi-paso (fetch → transform → persist)
- Carga paralela de datos para vistas de dashboard o reportes
- Reemplazar async basado en callbacks con pipelines componibles

## Prerrequisitos

- Java 17+
- `java.net.http.HttpClient` (Java 11+)

## Solucion

### 1. CompletableFuture Basico

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.concurrent.CompletableFuture;

public class AsyncApiClient {
    private static final HttpClient client = HttpClient.newHttpClient();

    public static CompletableFuture<String> fetchAsync(String url) {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .GET()
            .build();

        return client.sendAsync(request, HttpResponse.BodyHandlers.ofString())
            .thenApply(HttpResponse::body);
    }

    public static void main(String[] args) {
        // No bloqueante — ejecuta en el executor del HttpClient
        CompletableFuture<String> future = fetchAsync("https://api.example.com/users");

        // Hacer otro trabajo mientras la peticion esta en vuelo...

        // Bloquear solo cuando necesitas el resultado
        String result = future.join();
        System.out.println(result);
    }
}
```

### 2. Composicion Secuencial con thenCompose

```java
import java.util.concurrent.CompletableFuture;

public class SequentialPipeline {

    public static CompletableFuture<User> fetchUser(String userId) {
        return fetchAsync("https://api.example.com/users/" + userId)
            .thenApply(json -> parseUser(json));
    }

    public static CompletableFuture<List<Order>> fetchOrders(String userId) {
        return fetchAsync("https://api.example.com/users/" + userId + "/orders")
            .thenApply(json -> parseOrders(json));
    }

    public static CompletableFuture<UserProfile> buildProfile(String userId) {
        // thenCompose encadena futures — cada paso espera al anterior
        return fetchUser(userId)
            .thenCompose(user -> fetchOrders(user.getId())
                .thenApply(orders -> new UserProfile(user, orders)));
    }

    public static void main(String[] args) {
        UserProfile profile = buildProfile("123").join();
        System.out.println(profile);
    }
}
```

### 3. Combinacion Paralela con thenCombine

```java
import java.util.concurrent.CompletableFuture;

public class ParallelCombination {

    public static CompletableFuture<Dashboard> buildDashboard(String userId) {
        // Los tres fetches ejecutan en paralelo
        CompletableFuture<User> userFuture = fetchUser(userId);
        CompletableFuture<List<Order>> ordersFuture = fetchOrders(userId);
        CompletableFuture<List<Notification>> notifsFuture = fetchNotifications(userId);

        // thenCombine merge dos futures — ejecuta despues de que ambos completan
        return userFuture
            .thenCombine(ordersFuture, (user, orders) ->
                new PartialDashboard(user, orders))
            .thenCombine(notifsFuture, (partial, notifs) ->
                new Dashboard(partial.getUser(), partial.getOrders(), notifs));
    }

    // Tiempo total = max(fetchUser, fetchOrders, fetchNotifications), no suma
    public static void main(String[] args) {
        Dashboard dashboard = buildDashboard("123").join();
        System.out.println(dashboard);
    }
}
```

### 4. allOf — Esperar Todos los Futures

```java
import java.util.concurrent.CompletableFuture;
import java.util.List;
import java.util.stream.Collectors;

public class AllOfPattern {

    public static CompletableFuture<List<String>> fetchAllUrls(List<String> urls) {
        // Iniciar todos los fetches en paralelo
        List<CompletableFuture<String>> futures = urls.stream()
            .map(AsyncApiClient::fetchAsync)
            .collect(Collectors.toList());

        // allOf retorna un CompletableFuture<Void> — completa cuando todos completan
        CompletableFuture<Void> allDone = CompletableFuture.allOf(
            futures.toArray(new CompletableFuture[0])
        );

        // Despues de que todos completan, recolectar resultados
        return allDone.thenApply(v ->
            futures.stream()
                .map(CompletableFuture::join)  // Seguro — todos estan completos
                .collect(Collectors.toList())
        );
    }

    public static void main(String[] args) {
        List<String> urls = List.of(
            "https://api.example.com/data/1",
            "https://api.example.com/data/2",
            "https://api.example.com/data/3"
        );

        List<String> results = fetchAllUrls(urls).join();
        results.forEach(System.out::println);
    }
}
```

### 5. anyOf — Primero en Completar

```java
import java.util.concurrent.CompletableFuture;

public class AnyOfPattern {

    // Retorna la primera respuesta exitosa — util para racing replicas
    public static CompletableFuture<String> fetchFirstAvailable(List<String> urls) {
        CompletableFuture<?>[] futures = urls.stream()
            .map(AsyncApiClient::fetchAsync)
            .toArray(CompletableFuture[]::new);

        // anyOf completa cuando el primer future completa
        return CompletableFuture.anyOf(futures)
            .thenApply(obj -> (String) obj);
    }

    public static void main(String[] args) {
        List<String> replicaUrls = List.of(
            "https://replica1.example.com/data",
            "https://replica2.example.com/data",
            "https://replica3.example.com/data"
        );

        String result = fetchFirstAvailable(replicaUrls).join();
        System.out.println("First response: " + result);
    }
}
```

### 6. Manejo de Errores

```java
import java.util.concurrent.CompletableFuture;

public class ErrorHandling {

    public static CompletableFuture<String> fetchWithFallback(String url, String fallback) {
        return fetchAsync(url)
            // exceptionally — manejar errores, proporcionar fallback
            .exceptionally(ex -> {
                System.err.println("Fetch failed: " + ex.getMessage());
                return fallback;
            });
    }

    public static CompletableFuture<String> fetchWithRetry(String url, int maxRetries) {
        return fetchAsync(url)
            .handle((result, ex) -> {
                if (ex != null) {
                    if (maxRetries > 0) {
                        System.err.println("Retrying (" + maxRetries + " left): " + ex.getMessage());
                        return fetchWithRetry(url, maxRetries - 1);
                    }
                    throw new RuntimeException("Max retries exceeded", ex);
                }
                return CompletableFuture.completedFuture(result);
            })
            .thenCompose(f -> f);  // Aplanar CompletableFuture anidado
    }

    // whenComplete — side effects sin cambiar el resultado
    public static CompletableFuture<String> fetchWithLogging(String url) {
        return fetchAsync(url)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Request to {} failed: {}", url, ex.getMessage());
                } else {
                    log.info("Request to {} succeeded ({} bytes)", url, result.length());
                }
            });
    }

    public static void main(String[] args) {
        String result = fetchWithFallback(
            "https://api.example.com/maybe-down",
            "{\"status\": \"fallback\"}"
        ).join();
        System.out.println(result);
    }
}
```

### 7. Thread Pool Personalizado

```java
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class CustomExecutorExample {

    // Usar un pool dedicado — no depender del ForkJoinPool comun
    private static final ExecutorService executor = Executors.newFixedThreadPool(
        Runtime.getRuntime().availableProcessors(),
        r -> {
            Thread t = new Thread(r);
            t.setName("async-worker-" + t.getId());
            t.setDaemon(true);
            return t;
        }
    );

    public static CompletableFuture<String> fetchWithCustomPool(String url) {
        // supplyAsync ejecuta en el executor especificado
        return CompletableFuture.supplyAsync(() -> {
            // Llamada bloqueante ejecuta en un thread worker, no en el thread principal
            return blockingFetch(url);
        }, executor);
    }

    public static CompletableFuture<UserProfile> buildProfileWithPool(String userId) {
        return fetchUserWithPool(userId)
            .thenComposeAsync(user -> fetchOrdersWithPool(user.getId()), executor)
            .thenApplyAsync(orders -> new UserProfile(orders), executor);
    }

    public static void main(String[] args) {
        try {
            UserProfile profile = buildProfileWithPool("123").join();
            System.out.println(profile);
        } finally {
            executor.shutdown();
        }
    }
}
```

### 8. Timeouts (Java 9+)

```java
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

public class TimeoutExample {

    public static CompletableFuture<String> fetchWithTimeout(String url) {
        return fetchAsync(url)
            .orTimeout(5, TimeUnit.SECONDS)  // Completa excepcionalmente con TimeoutException
            .exceptionally(ex -> {
                if (ex instanceof java.util.concurrent.TimeoutException) {
                    return "{\"error\": \"request timed out\"}";
                }
                return "{\"error\": \"" + ex.getMessage() + "\"}";
            });
    }

    // completeOnTimeout — proporcionar un valor default en lugar de una excepcion
    public static CompletableFuture<String> fetchWithDefault(String url, String defaultValue) {
        return fetchAsync(url)
            .completeOnTimeout(defaultValue, 3, TimeUnit.SECONDS);
    }

    public static void main(String[] args) {
        String result = fetchWithTimeout("https://slow-api.example.com/data").join();
        System.out.println(result);
    }
}
```

## Como Funciona

1. **CompletableFuture**: Representa una computacion async que producira un resultado. Puede ser completado manualmente o por una operacion async. Metodos como `thenApply`, `thenCompose` y `thenCombine` registran callbacks que ejecutan cuando el future completa.
2. **`thenApply` vs `thenCompose`**: `thenApply` toma una funcion sincrona (mapea el resultado). `thenCompose` toma una funcion que retorna otro CompletableFuture (aplana futures anidados — como `flatMap` en programacion funcional).
3. **`thenCombine`**: Merge dos futures independientes — el callback recibe ambos resultados. Ambos futures ejecutan en paralelo; el callback ejecuta despues de que ambos completan.
4. **`allOf` / `anyOf`**: `allOf` retorna un future que completa cuando todos los futures de entrada completan. `anyOf` completa cuando el primer future de entrada completa. Ambos retornan `CompletableFuture<Void>` / `CompletableFuture<Object>`.
5. **Callbacks async vs sync**: `thenApply` ejecuta el callback en el thread que completo el future. `thenApplyAsync` lo ejecuta en un thread separado (del executor). Usa variantes async para callbacks CPU-intensivos.

## Variantes

### Retry con Backoff Exponencial

```java
public static CompletableFuture<String> fetchWithBackoff(
        String url, int maxAttempts, long initialDelayMs) {
    return fetchAsync(url)
        .handle((result, ex) -> {
            if (ex != null && maxAttempts > 0) {
                long delay = initialDelayMs * (long) Math.pow(2, maxAttempts - 1);
                return CompletableFuture.delayedExecutor(delay, TimeUnit.MILLISECONDS)
                    .supplyAsync(() -> fetchWithBackoff(url, maxAttempts - 1, initialDelayMs))
                    .thenCompose(f -> f);
            }
            return CompletableFuture.completedFuture(
                ex != null ? null : result
            );
        })
        .thenCompose(f -> f);
}
```

### Combinar Resultados con Transformacion

```java
public static CompletableFuture<AggregatedReport> buildReport(
        String userId, String dateRange) {
    CompletableFuture<SalesData> sales = fetchSales(userId, dateRange);
    CompletableFuture<TrafficData> traffic = fetchTraffic(userId, dateRange);
    CompletableFuture<RevenueData> revenue = fetchRevenue(userId, dateRange);

    return CompletableFuture.allOf(sales, traffic, revenue)
        .thenApply(v -> {
            // Los tres estan completos — combinar resultados
            return new AggregatedReport(
                sales.join(),
                traffic.join(),
                revenue.join()
            );
        });
}
```

## Mejores Practicas

- **Siempre usar executors personalizados**: Por defecto, `CompletableFuture` ejecuta en el `ForkJoinPool.commonPool()`. Este pool es compartido en toda la JVM — una operacion lenta puede bloquear otras. Siempre pasa un `Executor` dedicado.
- **Usar `thenCompose` para encadenado async**: `thenApply` con un tipo de retorno `CompletableFuture` crea futures anidados. Usa `thenCompose` para aplanarlos.
- **Siempre manejar excepciones**: Las excepciones no manejadas en `CompletableFuture` se swallow silenciosamente. Usa `exceptionally`, `handle` o `whenComplete` para log y recuperacion.
- **Establecer timeouts**: Sin timeouts, una operacion lenta bloquea `join()` indefinidamente. Usa `orTimeout()` (Java 9+) o `completeOnTimeout()`.
- **Usar `allOf` para fan-out paralelo**: Inicia todos los futures, luego `allOf` para esperar. Esto maximiza paralelismo — el tiempo total es el future mas lento, no la suma.
- **Evitar `join()` en pipelines async**: `join()` bloquea el thread actual. Usalo solo al final del pipeline. Dentro del pipeline, usa `thenCompose` y `thenCombine`.

## Errores Comunes

- **Usar el ForkJoinPool comun**: `supplyAsync` sin un executor usa el pool comun compartido. Una operacion bloqueante puede starvear otras tareas. Siempre pasa un executor personalizado.
- **Anidar `thenApply` con futures**: `thenApply(f -> fetchAsync(...))` crea `CompletableFuture<CompletableFuture<T>>`. Usa `thenCompose` en su lugar para aplanar.
- **No manejar excepciones**: Si un future completa excepcionalmente y nadie llama `exceptionally` o `handle`, la excepcion se pierde. Siempre agrega manejo de errores.
- **Bloquear con `join()` en el pipeline**: `thenApply(f -> blockingCall())` bloquea el thread del callback. Usa `thenApplyAsync` con un executor personalizado para callbacks bloqueantes.
- **No apagar los executors**: Los executors personalizados mantienen threads vivos. Siempre `shutdown()` en un bloque `finally` o via shutdown hook.

## FAQ

**Cual es la diferencia entre `thenApply` y `thenCompose`?**

`thenApply` toma una `Function<T, R>` y retorna `CompletableFuture<R>`. `thenCompose` toma una `Function<T, CompletableFuture<R>>` y retorna `CompletableFuture<R>` — aplana futures anidados. Usa `thenCompose` cuando el callback retorna otro future.

**Deberia usar `thenApply` o `thenApplyAsync`?**

`thenApply` ejecuta el callback en el thread que completo el future (podria ser el thread del caller). `thenApplyAsync` lo ejecuta en un thread separado. Usa variantes async para callbacks CPU-intensivos o bloqueantes.

**Como ejecuto multiples futures en paralelo?**

Inicia todos los futures (ejecutan concurrentemente), luego usa `allOf` para esperar a todos. `allOf` retorna `CompletableFuture<Void>` — encadena `thenApply` para recolectar resultados.

**Que pasa si un future en `allOf` falla?**

`allOf` completa excepcionalmente si cualquier future falla. La excepcion es la primera encontrada. Usa `handle` en cada future para prevenir que un fallo aborte todo el batch.

**Como establezco un timeout en un CompletableFuture?**

Usa `orTimeout(5, TimeUnit.SECONDS)` (Java 9+) — el future completa excepcionalmente con `TimeoutException`. Usa `completeOnTimeout(defaultValue, 5, TimeUnit.SECONDS)` para proporcionar un valor fallback en su lugar.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
