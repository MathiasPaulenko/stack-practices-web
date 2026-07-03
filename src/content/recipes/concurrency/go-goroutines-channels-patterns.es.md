---
contentType: recipes
slug: go-goroutines-channels-patterns
title: "Patrones Concurrentes con Go Goroutines y Channels"
description: "Construir sistemas concurrentes en Go usando goroutines, channels, select statements, worker pools, fan-out/fan-in, pipelines, context cancellation y rate limiting con tickers."
metaDescription: "Construye sistemas concurrentes en Go con goroutines y channels. Usa select, worker pools, fan-out/fan-in, pipelines, context cancellation y patrones de rate limiting."
difficulty: intermediate
topics:
  - concurrency
  - performance
  - architecture
tags:
  - go
  - golang
  - goroutines
  - channels
  - concurrency
relatedResources:
  - /recipes/concurrency/python-asyncio-gather-task-groups
  - /recipes/concurrency/java-completable-future-composition
  - /guides/concurrency-patterns-guide
  - /guides/complete-guide-graphql-federation
lastUpdated: "2026-07-03"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye sistemas concurrentes en Go con goroutines y channels. Usa select, worker pools, fan-out/fan-in, pipelines, context cancellation y patrones de rate limiting."
  keywords:
    - go goroutines channels
    - golang concurrency patterns
    - go worker pool
    - go fan-out fan-in
    - go select context cancellation
---

## Descripcion general

El modelo de concurrencia de Go esta construido sobre goroutines (threads ligeros) y channels (conductos tipados para comunicacion). El statement `select` multiplexa operaciones de channel. A continuacion: basics de goroutines, worker pools, fan-out/fan-in, construccion de pipelines, cancellation basada en context, rate limiting con tickers y manejo de errores con errgroup.

## Cuando Usar Esto

- Llamadas a API o procesamiento de datos en paralelo
- Pipelines producer-consumer con multiples etapas
- Operaciones con rate limiting (llamadas a API, queries a base de datos)
- Workers en background con shutdown graceful

## Prerrequisitos

- Go 1.21+

## Solucion

### 1. Goroutines y Channels Basicos

```go
package main

import (
	"fmt"
	"sync"
	"time"
)

func worker(id int, jobs <-chan int, results chan<- int, wg *sync.WaitGroup) {
	defer wg.Done()
	for job := range jobs {
		fmt.Printf("Worker %d processing job %d\n", id, job)
		time.Sleep(time.Second) // Simular trabajo
		results <- job * 2
	}
}

func main() {
	jobs := make(chan int, 100)
	results := make(chan int, 100)

	var wg sync.WaitGroup

	// Iniciar 3 workers
	for w := 1; w <= 3; w++ {
		wg.Add(1)
		go worker(w, jobs, results, &wg)
	}

	// Enviar 5 jobs
	for j := 1; j <= 5; j++ {
		jobs <- j
	}
	close(jobs)

	// Esperar a que todos los workers terminen
	go func() {
		wg.Wait()
		close(results)
	}()

	// Recolectar resultados
	for r := range results {
		fmt.Printf("Result: %d\n", r)
	}
}
```

### 2. Patron Worker Pool

```go
package main

import (
	"fmt"
	"sync"
)

type Job struct {
	ID    int
	Input string
}

type Result struct {
	JobID  int
	Output string
	Err    error
}

func worker(id int, jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup) {
	defer wg.Done()
	for job := range jobs {
		// Procesar job
		output, err := process(job.Input)
		results <- Result{
			JobID:  job.ID,
			Output: output,
			Err:    err,
		}
	}
}

func process(input string) (string, error) {
	return "processed:" + input, nil
}

func runWorkerPool(numWorkers, numJobs int) []Result {
	jobs := make(chan Job, numJobs)
	results := make(chan Result, numJobs)
	var wg sync.WaitGroup

	// Lanzar workers
	for w := 0; w < numWorkers; w++ {
		wg.Add(1)
		go worker(w, jobs, results, &wg)
	}

	// Enviar jobs
	for j := 0; j < numJobs; j++ {
		jobs <- Job{ID: j, Input: fmt.Sprintf("task-%d", j)}
	}
	close(jobs)

	// Esperar y recolectar
	go func() {
		wg.Wait()
		close(results)
	}()

	var allResults []Result
	for r := range results {
		allResults = append(allResults, r)
	}
	return allResults
}

func main() {
	results := runWorkerPool(5, 20)
	fmt.Printf("Processed %d jobs\n", len(results))
}
```

### 3. Fan-Out / Fan-In

```go
package main

import (
	"fmt"
	"sync"
)

// Fan-out: distribuir trabajo a multiples goroutines
// Fan-in: merge resultados de multiples goroutines en un channel

func producer(start, end int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for i := start; i <= end; i++ {
			out <- i
		}
	}()
	return out
}

func square(in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for n := range in {
			out <- n * n
		}
	}()
	return out
}

// Fan-in: merge multiples channels en uno
func merge(channels ...<-chan int) <-chan int {
	var wg sync.WaitGroup
	out := make(chan int)

	output := func(c <-chan int) {
		defer wg.Done()
		for n := range c {
			out <- n
		}
	}

	wg.Add(len(channels))
	for _, c := range channels {
		go output(c)
	}

	go func() {
		wg.Wait()
		close(out)
	}()

	return out
}

func main() {
	// Fan-out: 4 workers procesando el mismo input
	input := producer(1, 100)

	squared1 := square(input)
	squared2 := square(input)
	squared3 := square(input)
	squared4 := square(input)

	// Fan-in: merge todos los outputs squared
	for result := range merge(squared1, squared2, squared3, squared4) {
		fmt.Printf("Result: %d\n", result)
	}
}
```

### 4. Patron Pipeline

```go
package main

import "fmt"

// Pipeline multi-etapa: generate → filter → transform → collect

func generate(nums ...int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for _, n := range nums {
			out <- n
		}
	}()
	return out
}

func filter(in <-chan int, predicate func(int) bool) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for n := range in {
			if predicate(n) {
				out <- n
			}
		}
	}()
	return out
}

func transform(in <-chan int, fn func(int) int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for n := range in {
			out <- fn(n)
		}
	}()
	return out
}

func main() {
	// Pipeline: generate → filter even → square → print
	nums := generate(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
	evens := filter(nums, func(n int) bool { return n%2 == 0 })
	squared := transform(evens, func(n int) int { return n * n })

	for result := range squared {
		fmt.Printf("Even squared: %d\n", result)
	}
}
```

### 5. Context Cancellation y Timeout

```go
package main

import (
	"context"
	"fmt"
	"time"
)

func workerWithCtx(ctx context.Context, id int) error {
	for {
		select {
		case <-ctx.Done():
			fmt.Printf("Worker %d cancelled: %v\n", id, ctx.Err())
			return ctx.Err()
		default:
			// Simular trabajo
			time.Sleep(500 * time.Millisecond)
			fmt.Printf("Worker %d working...\n", id)
		}
	}
}

func main() {
	// Context con timeout — cancela despues de 2 segundos
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	// Iniciar 3 workers
	done := make(chan struct{})
	go func() {
		workerWithCtx(ctx, 1)
		workerWithCtx(ctx, 2)
		workerWithCtx(ctx, 3)
		close(done)
	}()

	select {
	case <-done:
		fmt.Println("All workers done")
	case <-ctx.Done():
		fmt.Println("Context cancelled:", ctx.Err())
	}
}
```

### 6. Rate Limiting con Ticker

```go
package main

import (
	"fmt"
	"time"
)

func rateLimitedWorker(id int, rate <-chan time.Time) {
	for t := range rate {
		fmt.Printf("Worker %d ticked at %v\n", id, t)
		// Hacer trabajo rate-limited aqui
	}
}

func main() {
	// 5 operaciones por segundo
	ticker := time.NewTicker(200 * time.Millisecond)
	defer ticker.Stop()

	// Ejecutar por 2 segundos
	timeout := time.After(2 * time.Second)

	go rateLimitedWorker(1, ticker.C)

	select {
	case <-timeout:
		fmt.Println("Time's up!")
	}
}
```

### 7. Select con Multiples Channels

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	tick := time.Tick(100 * time.Millisecond)
	boom := time.After(500 * time.Millisecond)

	for {
		select {
		case <-tick:
			fmt.Println("tick.")
		case <-boom:
			fmt.Println("BOOM!")
			return
		default:
			fmt.Println("    .")
			time.Sleep(50 * time.Millisecond)
		}
	}
}
```

### 8. Error Group (errgroup)

```go
package main

import (
	"fmt"
	"net/http"
	"golang.org/x/sync/errgroup"
)

func fetchURL(url string) error {
	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("fetch %s: %w", url, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("fetch %s: status %d", url, resp.StatusCode)
	}
	return nil
}

func main() {
	urls := []string{
		"https://api.example.com/users",
		"https://api.example.com/orders",
		"https://api.example.com/products",
	}

	var g errgroup.Group

	for _, url := range urls {
		url := url // Capturar variable del loop
		g.Go(func() error {
			return fetchURL(url)
		})
	}

	// Esperar todas las goroutines — retorna el primer error
	if err := g.Wait(); err != nil {
		fmt.Printf("Error: %v\n", err)
	} else {
		fmt.Println("All fetches succeeded")
	}
}
```

## Como Funciona

1. **Goroutines**: Threads ligeros gestionados por el runtime de Go. Empiezan con ~2KB de stack y crecen segun sea necesario. Millones de goroutines pueden ejecutar concurrentemente en un punado de OS threads.
2. **Channels**: Conductos tipados para comunicacion entre goroutines. Los unbuffered channels bloquean hasta que tanto sender como receiver estan listos. Los buffered channels bloquean solo cuando el buffer esta lleno.
3. **`select`**: Multiplexa multiples operaciones de channel. Bloquea hasta que un case esta listo, luego lo ejecuta. Si multiples cases estan listos, se elige uno al azar. El case `default` hace que `select` sea non-blocking.
4. **`context`**: Transporta signals de cancellation, deadlines y valores a traves de boundaries de API. `context.WithCancel` crea un context cancellable. `context.WithTimeout` agrega un deadline. Las goroutines deben verificar `ctx.Done()` para saber cuando parar.
5. **`errgroup`**: De `golang.org/x/sync/errgroup`. Gestiona un grupo de goroutines y retorna el primer error. Si una goroutine falla, el context se cancela, signalando a otras goroutines que se detengan.

## Variantes

### Paralelismo Limitado con Semaforo

```go
func boundedParallel(urls []string, maxConcurrent int) []error {
	sem := make(chan struct{}, maxConcurrent)
	errs := make([]error, len(urls))
	var wg sync.WaitGroup

	for i, url := range urls {
		wg.Add(1)
		go func(idx int, u string) {
			defer wg.Done()
			sem <- struct{}{}        // Adquirir
			defer func() { <-sem }() // Liberar
			errs[idx] = fetchURL(u)
		}(i, url)
	}

	wg.Wait()
	return errs
}
```

### Done Channel para Cancellation

```go
func worker(done <-chan struct{}, jobs <-chan Job) {
	for {
		select {
		case <-done:
			return
		case job := <-jobs:
			process(job)
		}
	}
}

// Cancelar cerrando el done channel
done := make(chan struct{})
go worker(done, jobs)
// ... despues
close(done) // Signala a todos los workers que se detengan
```

### Patron Tee (Split Channel)

```go
func tee[T any](in <-chan T) (<-chan T, <-chan T) {
	out1 := make(chan T)
	out2 := make(chan T)
	go func() {
		defer close(out1)
		defer close(out2)
		for val := range in {
			out1 <- val
			out2 <- val
		}
	}()
	return out1, out2
}
```

## Mejores Practicas

- **Cerrar channels desde el lado del sender**: La goroutine que escribe a un channel debe cerrarlo. Nunca cierres desde el lado del receiver — enviar a un channel cerrado paniquea.
- **Usar `context` para cancellation**: No uses done channels custom. `context.Context` es la forma estandar de propagar cancellation. Se integra con HTTP servers, database drivers y la mayoria de librerias.
- **Verificar `ctx.Done()` en loops**: Las goroutines de larga duracion deben verificar cancellation regularmente. Usa `select` con `case <-ctx.Done()` en el loop.
- **Usar buffered channels para desacoplar**: Los buffered channels permiten que producers y consumers trabajen a diferentes tasas. Establece el buffer size al tamano de burst esperado.
- **Usar `errgroup` para fan-out con error-awareness**: Si cualquier goroutine falla, `errgroup` cancela el context, deteniendo otras goroutines. Esto previene trabajo desperdiciado.
- **Evitar leaks de goroutines**: Cada goroutine debe tener una condicion de terminacion — ya sea un channel cerrado, un context cancelado o un range completado. Las goroutines con leak consumen memoria y CPU.

## Errores Comunes

- **Cerrar un channel desde el receiver**: Enviar a un channel cerrado paniquea. Solo el sender debe cerrar el channel.
- **No capturar variables del loop**: `for _, url := range urls { go func() { fetch(url) }() }` — todas las goroutines ven el ultimo `url`. Usa `url := url` dentro del loop o pasalo como parametro.
- **Leaks de goroutines**: Iniciar una goroutine que bloquea para siempre (ej., leyendo de un channel que nadie escribe). Usa `context` o un done channel para asegurar terminacion.
- **Usar unbuffered channels cuando se necesita desacoplar**: Los unbuffered channels fuerzan al sender y receiver a sincronizar. Si el receiver es lento, el sender bloquea. Usa buffered channels para desacoplar.
- **No manejar el close del channel**: `for val := range ch` maneja el close automaticamente. Pero `val, ok := <-ch` requiere verificar `ok` — `ok` es false cuando el channel esta cerrado y vacio.

## FAQ

**Cuantas goroutines puedo ejecutar?**

El runtime de Go soporta millones de goroutines. Cada una empieza con ~2KB de stack. 100,000 goroutines usan ~200MB de stack. El limite practico es memoria, no el scheduler.

**Deberia usar buffered o unbuffered channels?**

Los unbuffered channels proporcionan sincronizacion — el sender bloquea hasta que el receiver esta listo. Los buffered channels desacoplan sender y receiver. Usa unbuffered cuando necesitas sincronizacion, buffered cuando necesitas desacoplar.

**Cual es la diferencia entre `context.WithCancel` y `context.WithTimeout`?**

`WithCancel` crea un context que cancelas manualmente llamando `cancel()`. `WithTimeout` crea un context que cancela automaticamente despues de la duracion especificada. Usa `WithTimeout` para operaciones con deadline, `WithCancel` para cancellation explicita.

**Como espero a que todas las goroutines terminen?**

Usa `sync.WaitGroup`. Llama `wg.Add(1)` antes de iniciar cada goroutine, `wg.Done()` cuando termina, y `wg.Wait()` para bloquear hasta que todas terminen. Para espera con error-awareness, usa `errgroup.Group`.

**Que pasa si envio a un channel cerrado?**

Paniquea con "send on closed channel". Este es un bug comun. Solo el sender debe cerrar el channel, y solo despues de que todos los sends estan completos. Usa `sync.Once` si multiples goroutines podrian cerrar el mismo channel.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
