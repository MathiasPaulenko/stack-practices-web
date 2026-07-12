---





contentType: recipes
slug: csharp-async-await-task-run
title: "Construir Pipelines Async con C# async/await y Task.Run"
description: "Construir pipelines async en C# usando async/await, Task.Run, Task.WhenAll, Task.WhenAny, CancellationTokenSource, Channels y Parallel.ForEachAsync para I/O y CPU concurrente."
metaDescription: "Construye pipelines async en C# con async/await, Task.Run, Task.WhenAll, CancellationTokenSource, Channels y Parallel.ForEachAsync para I/O y CPU concurrente."
difficulty: intermediate
topics:
  - concurrency
  - performance
  - architecture
tags:
  - csharp
  - dotnet
  - async-await
  - task
  - concurrency
relatedResources:
  - /recipes/java-completable-future-composition
  - /recipes/python-asyncio-gather-task-groups
  - /guides/concurrency-patterns-guide
  - /recipes/java-virtual-threads-project-loom
  - /recipes/rust-tokio-async-runtime
  - /recipes/go-goroutines-channels-patterns
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye pipelines async en C# con async/await, Task.Run, Task.WhenAll, CancellationTokenSource, Channels y Parallel.ForEachAsync para I/O y CPU concurrente."
  keywords:
    - csharp async await
    - c# task.run
    - c# task.whenall
    - c# cancellation token
    - c# channels concurrency





---

## Descripcion general

El modelo `async`/`await` de C# proporciona una maquina de estados basada en el compilador que transforma metodos async en callbacks. `Task` y `Task<T>` representan operaciones async. Aqui se explica como basics de `async`/`await`, `Task.WhenAll` para ejecucion paralela, `Task.WhenAny` para primero-en-completar, `CancellationTokenSource` para cancellation, `System.Threading.Channels` para producer-consumer y `Parallel.ForEachAsync` para I/O paralelo limitado.

## Cuando Usar Esto


- For alternatives, see [Concurrent Patterns with Go Goroutines and Channels](/es/recipes/go-goroutines-channels-patterns/).

- Operaciones I/O async (llamadas HTTP, queries a base de datos, I/O de archivos)
- Llamadas a API concurrentes con agregacion de resultados
- Operaciones de larga duracion con soporte de cancellation
- Pipelines producer-consumer con backpressure

## Prerrequisitos

- .NET 8+
- Paquete `System.Threading.Channels` (incluido en .NET 8+)

## Solucion

### 1. async/await Basico

```csharp
using System.Diagnostics;

public class BasicAsync
{
    public static async Task<string> FetchDataAsync(string url)
    {
        using var client = new HttpClient();
        var response = await client.GetStringAsync(url);
        return response;
    }

    public static async Task RunAsync()
    {
        var sw = Stopwatch.StartNew();

        // Secuencial — 2s total
        var data1 = await FetchDataAsync("https://httpbin.org/delay/1");
        var data2 = await FetchDataAsync("https://httpbin.org/delay/1");

        sw.Stop();
        Console.WriteLine($"Sequential: {sw.ElapsedMilliseconds}ms");
    }
}
```

### 2. Task.WhenAll — Ejecucion Paralela

```csharp
using System.Diagnostics;

public class ParallelAsync
{
    public static async Task<string> FetchDataAsync(string url)
    {
        using var client = new HttpClient();
        return await client.GetStringAsync(url);
    }

    public static async Task RunWhenAllAsync()
    {
        var sw = Stopwatch.StartNew();

        var urls = new[]
        {
            "https://httpbin.org/delay/1",
            "https://httpbin.org/delay/1",
            "https://httpbin.org/delay/1",
            "https://httpbin.org/delay/1",
            "https://httpbin.org/delay/1"
        };

        // Paralelo — ~1s total en lugar de 5s
        var tasks = urls.Select(FetchDataAsync);
        var results = await Task.WhenAll(tasks);

        sw.Stop();
        Console.WriteLine($"Parallel: {sw.ElapsedMilliseconds}ms");
        Console.WriteLine($"Fetched {results.Length} responses");
    }
}
```

### 3. Task.WhenAny — Primero en Completar

```csharp
public class FirstResultAsync
{
    public static async Task<string> FetchWithTimeoutAsync(string url, TimeSpan timeout)
    {
        using var client = new HttpClient();
        var fetchTask = client.GetStringAsync(url);
        var timeoutTask = Task.Delay(timeout);

        // Retorna cuando cualquiera completa
        var completedTask = await Task.WhenAny(fetchTask, timeoutTask);

        if (completedTask == timeoutTask)
        {
            throw new TimeoutException($"Request to {url} timed out after {timeout}");
        }

        return await fetchTask;
    }

    public static async Task RunWhenAnyAsync()
    {
        try
        {
            var result = await FetchWithTimeoutAsync(
                "https://httpbin.org/delay/5",
                TimeSpan.FromSeconds(2)
            );
            Console.WriteLine(result);
        }
        catch (TimeoutException ex)
        {
            Console.WriteLine(ex.Message);
        }
    }
}
```

### 4. CancellationToken — Cancellation Cooperativa

```csharp
using System.Threading;

public class CancellationAsync
{
    public static async Task ProcessWithCancellationAsync(
        CancellationToken cancellationToken)
    {
        for (int i = 0; i < 100; i++)
        {
            cancellationToken.ThrowIfCancellationRequested();

            await Task.Delay(100, cancellationToken);
            Console.WriteLine($"Processing item {i}");
        }
    }

    public static async Task RunCancellationAsync()
    {
        using var cts = new CancellationTokenSource();

        // Cancelar despues de 500ms
        cts.CancelAfter(TimeSpan.FromMilliseconds(500));

        try
        {
            await ProcessWithCancellationAsync(cts.Token);
        }
        catch (OperationCanceledException)
        {
            Console.WriteLine("Operation was cancelled");
        }
    }
}
```

### 5. Task.Run para Trabajo CPU-Bound

```csharp
public class CpuBoundAsync
{
    public static long ComputeSum(long start, long end)
    {
        long sum = 0;
        for (long i = start; i < end; i++)
        {
            sum += i;
        }
        return sum;
    }

    public static async Task RunCpuBoundAsync()
    {
        var sw = Stopwatch.StartNew();

        // Ejecutar trabajo CPU-bound en thread pool — no bloquear la async state machine
        var task1 = Task.Run(() => ComputeSum(0, 50_000_000));
        var task2 = Task.Run(() => ComputeSum(50_000_000, 100_000_000));

        var results = await Task.WhenAll(task1, task2);

        sw.Stop();
        Console.WriteLine($"Sum: {results[0] + results[1]}");
        Console.WriteLine($"Time: {sw.ElapsedMilliseconds}ms");
    }
}
```

### 6. System.Threading.Channels — Producer-Consumer

```csharp
using System.Threading.Channels;

public class ChannelExample
{
    public static async Task RunChannelAsync()
    {
        // Bounded channel con capacidad 10
        var channel = Channel.CreateBounded<int>(10);

        // Producer
        async Task ProduceAsync()
        {
            for (int i = 0; i < 100; i++)
            {
                await channel.Writer.WriteAsync(i);
                Console.WriteLine($"Produced: {i}");
            }
            channel.Writer.Complete();
        }

        // Consumer
        async Task ConsumeAsync(int workerId)
        {
            await foreach (var item in channel.Reader.ReadAllAsync())
            {
                await Task.Delay(50); // Simular procesamiento
                Console.WriteLine($"Worker {workerId} consumed: {item}");
            }
        }

        // Iniciar 3 consumers y 1 producer
        var consumers = Enumerable.Range(0, 3)
            .Select(id => ConsumeAsync(id));
        var producer = ProduceAsync();

        await Task.WhenAll(
            Task.WhenAll(consumers),
            producer
        );

        Console.WriteLine("Channel processing complete");
    }
}
```

### 7. Parallel.ForEachAsync — I/O Paralelo Limitado

```csharp
public class ParallelForEachAsync
{
    public static async Task RunParallelForEachAsync()
    {
        var urls = Enumerable.Range(1, 20)
            .Select(i => $"https://httpbin.org/delay/1?page={i}")
            .ToList();

        using var client = new HttpClient();
        var options = new ParallelOptions
        {
            MaxDegreeOfParallelism = 5 // Max 5 concurrentes
        };

        int successCount = 0;

        await Parallel.ForEachAsync(urls, options, async (url, ct) =>
        {
            try
            {
                var response = await client.GetStringAsync(url, ct);
                Interlocked.Increment(ref successCount);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed {url}: {ex.Message}");
            }
        });

        Console.WriteLine($"Successfully fetched {successCount}/{urls.Count}");
    }
}
```

### 8. SemaphoreSlim — Rate Limiting Async

```csharp
public class SemaphoreAsync
{
    private static readonly HttpClient client = new();

    public static async Task RunSemaphoreAsync()
    {
        var urls = Enumerable.Range(1, 50)
            .Select(i => $"https://httpbin.org/delay/1?id={i}")
            .ToList();

        using var semaphore = new SemaphoreSlim(5); // Max 5 concurrentes
        var sw = Stopwatch.StartNew();

        var tasks = urls.Select(async url =>
        {
            await semaphore.WaitAsync();
            try
            {
                var response = await client.GetStringAsync(url);
                return response.Length;
            }
            finally
            {
                semaphore.Release();
            }
        });

        var results = await Task.WhenAll(tasks);

        sw.Stop();
        Console.WriteLine($"Fetched {results.Length} URLs in {sw.ElapsedMilliseconds}ms");
    }
}
```

### 9. IAsyncEnumerable — Async Streams

```csharp
public class AsyncStreamExample
{
    public static async IAsyncEnumerable<int> GenerateNumbersAsync(
        int count,
        [System.Runtime.CompilerServices.EnumeratorCancellation]
        CancellationToken cancellationToken = default)
    {
        for (int i = 0; i < count; i++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            await Task.Delay(100, cancellationToken);
            yield return i;
        }
    }

    public static async Task RunAsyncStreamAsync()
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));

        try
        {
            await foreach (var num in GenerateNumbersAsync(100, cts.Token))
            {
                Console.WriteLine($"Received: {num}");
            }
        }
        catch (OperationCanceledException)
        {
            Console.WriteLine("Stream cancelled");
        }
    }
}
```

## Como Funciona

1. **`async`/`await`**: El compilador de C# transforma un metodo `async` en una maquina de estados. En cada `await`, el metodo se suspende y retorna control al caller. Cuando el task awaited completa, la continuacion se reanuda en un thread del thread pool (o el synchronization context si existe).
2. **`Task.WhenAll`**: Crea un task que completa cuando todos los tasks de entrada completan. Si cualquier task lanza una excepcion, `WhenAll` relanza la primera excepcion. Los tasks se ejecutan concurrentemente en el thread pool.
3. **`Task.WhenAny`**: Retorna el primer task en completar (ya sea exito, fallo o cancelacion). Util para timeouts y racing de multiples fuentes.
4. **`CancellationTokenSource`**: Crea cancellation tokens que se propagan a operaciones async. `Cancel()` dispara la cancellation. `CancelAfter` auto-cancela despues de un delay. Los metodos async verifican `ThrowIfCancellationRequested()` o pasan el token a llamadas downstream.
5. **`System.Threading.Channels`**: Una cola thread-safe para escenarios async producer-consumer. `WriteAsync` bloquea cuando el channel esta lleno (bounded). `ReadAllAsync` retorna un `IAsyncEnumerable` que produce items a medida que llegan.
6. **`Parallel.ForEachAsync`**: Introducido en .NET 6. Ejecuta un delegate async para cada item con paralelismo limitado. `MaxDegreeOfParallelism` controla el limite de concurrencia.

## Variantes

### TaskCompletionSource — Bridge de Callbacks a Tasks

```csharp
public static Task<string> FromEventAsync()
{
    var tcs = new TaskCompletionSource<string>();

    // Algun API basada en eventos
    var timer = new System.Timers.Timer(1000);
    timer.Elapsed += (s, e) =>
    {
        timer.Dispose();
        tcs.SetResult("Timer fired");
    };
    timer.Start();

    return tcs.Task;
}

// Uso
var result = await FromEventAsync();
```

### ConfigureAwait(false)

```csharp
// En codigo de libreria, usa ConfigureAwait(false) para evitar
// capturar el synchronization context (mejora rendimiento
// y previene deadlocks en apps UI)

public static async Task<string> FetchAsync(string url)
{
    using var client = new HttpClient();
    var response = await client.GetAsync(url).ConfigureAwait(false);
    return await response.Content.ReadAsStringAsync().ConfigureAwait(false);
}
```

### Inicializacion Lazy Async

```csharp
public class AsyncLazy<T>
{
    private readonly Lazy<Task<T>> _lazy;

    public AsyncLazy(Func<Task<T>> factory)
    {
        _lazy = new Lazy<Task<T>>(() => Task.Run(factory));
    }

    public Task<T> Value => _lazy.Value;
}

// Uso
var lazyConfig = new AsyncLazy<string>(LoadConfigAsync);
var config = await lazyConfig.Value; // Carga una vez, cachea el resultado
```

## Mejores Practicas

- **Usar `async`/`await` sobre `.Result` y `.Wait()`**: Bloquear en codigo async puede causar deadlocks, especialmente en aplicaciones con synchronization context (ASP.NET clasico, WPF, WinForms).
- **Usar `ConfigureAwait(false)` en codigo de libreria**: Previene capturar el synchronization context, mejorando rendimiento y evitando deadlocks.
- **Pasar `CancellationToken` a traves de la cadena de llamadas**: Cada metodo async deberia aceptar y propagar un `CancellationToken`. Verifica con `ThrowIfCancellationRequested()` en loops.
- **Usar `Task.Run` solo para trabajo CPU-bound**: No uses `Task.Run` para metodos async I/O-bound — ya ceden el thread. Usalo para offload trabajo CPU al thread pool.
- **Preferir `Task.WhenAll` sobre awaits secuenciales**: `await task1; await task2;` se ejecuta secuencialmente. `await Task.WhenAll(task1, task2)` se ejecuta concurrentemente.
- **Usar `SemaphoreSlim` para rate limiting async**: `SemaphoreSlim.WaitAsync` es compatible con async. `Semaphore` (la version sync) bloquea el thread.

## Errores Comunes

- **Usar `.Result` o `.Wait()`**: Bloquea el thread y puede causar deadlock. Siempre `await` operaciones async.
- **Olvidar `ConfigureAwait(false)` en librerias**: Captura el synchronization context innecesariamente, causando problemas de rendimiento y potenciales deadlocks.
- **No propagar `CancellationToken`**: Si aceptas un token pero no lo pasas a llamadas downstream, la cancellation no funcionara.
- **Usar `async void`**: Los metodos `async void` no pueden ser awaited y las excepciones crashean el proceso. Usa `async Task` en su lugar. La unica excepcion son event handlers.
- **Olvidar `Complete()` en writers de channels**: Si no llamas `Writer.Complete()`, `ReadAllAsync` cuelga para siempre esperando mas items.

## FAQ

**Cual es la diferencia entre `Task` y `Task<T>`?**

`Task` representa una operacion async sin valor de retorno (como `void`). `Task<T>` representa una operacion async que retorna un valor de tipo `T`. Usa `Task` para operaciones fire-and-forget y `Task<T>` cuando necesitas el resultado.

**Deberia usar `Task.Run` para metodos async I/O?**

No. Los metodos async I/O ya ceden el thread mientras esperan. `Task.Run` solo agregaria un hop innecesario al thread pool. Usa `Task.Run` solo para trabajo CPU-bound que bloquearia la async state machine.

**Que es `ConfigureAwait(false)` y cuando deberia usarlo?**

`ConfigureAwait(false)` le dice al awaiter que no capture el synchronization context actual. Usalo en codigo de libreria para mejorar rendimiento y evitar deadlocks. En aplicaciones UI (WPF, WinForms), el synchronization context es el UI thread — capturarlo significa que las continuaciones se ejecutan en el UI thread, lo cual puede no ser deseable.

**Como se comparan los channels con `BlockingCollection`?**

`System.Threading.Channels` es compatible con async — `WriteAsync` y `ReadAllAsync` no bloquean threads. `BlockingCollection` bloquea threads, lo cual es desperdicio en aplicaciones async. Usa channels para patrones async producer-consumer.

**Que es `IAsyncEnumerable` y como difiere de `Task<IEnumerable>`?**

`IAsyncEnumerable<T>` produce items asincronicamente a medida que estan disponibles. `Task<IEnumerable<T>>` retorna todos los items a la vez cuando el task completa. Usa `IAsyncEnumerable` para streaming de datos (ej., filas de base de datos, eventos en tiempo real).

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
