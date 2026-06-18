---
contentType: recipes
slug: csp-communication
title: "Coordinar Tareas Concurrentes con Communicating Sequential Processes (CSP)"
description: "Cómo estructurar programas concurrentes usando channels, select statements y goroutines para comunicación segura sin estado mutable compartido en Go, Rust y JavaScript."
metaDescription: "Aprende CSP para coordinación de tareas concurrentes. Usa channels, select statements y goroutines para comunicar sin estado mutable compartido en Go, Rust y JS."
difficulty: intermediate
topics:
  - concurrency
tags:
  - concurrency
  - channels
  - go-routines
relatedResources:
  - /recipes/locks-and-mutexes
  - /recipes/thread-pools
  - /recipes/async-patterns
  - /recipes/concurrent-data-structures
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende CSP para coordinación de tareas concurrentes. Usa channels, select statements y goroutines para comunicar sin estado mutable compartido en Go, Rust y JS."
  keywords:
    - CSP communicating sequential processes
    - channels concurrencia
    - goroutines go
    - select statement
    - message passing
---

## Visión general

La concurrencia con memoria compartida es propensa a errores. Dos threads leen y escriben la misma variable, y necesitas locks, operaciones atómicas y razonamiento cuidadoso sobre visibilidad de memoria para prevenir condiciones de carrera. El problema central no es la concurrencia misma — es compartir estado mutable entre actores concurrentes.

Communicating Sequential Processes (CSP), popularizado por Go, invierte este modelo. En lugar de compartir memoria, las goroutines (threads ligeros) comunican enviando mensajes a través de channels. Un channel es una cola tipada donde una goroutine escribe y otra lee. El emisor se bloquea hasta que el receptor está listo (para channels sin buffer), o hasta que el buffer tiene espacio (para channels con buffer). Por diseño, las goroutines no comparten estado mutable — pasan la propiedad de los datos a través de channels. Esta receta cubre channels de Go, channels async de Rust y patrones CSP en JavaScript con ejemplos prácticos.

## Cuándo usarlo

Usa esta receta cuando:

- Múltiples workers concurrentes necesitan coordinar sin estado mutable compartido
- Construyendo pipelines donde la salida de una etapa es la entrada de la siguiente
- Implementando fan-out (un productor, muchos consumidores) y fan-in (muchos productores, un consumidor)
- Reemplazando concurrencia basada en locks por paso de mensajes para claridad y seguridad
- Escribiendo programas en Go donde goroutines y channels son el modelo de concurrencia idiomático

## Solución

### Channels y Goroutines en Go

```go
package main

import (
	"fmt"
	"time"
)

// Etapa de pipeline: generator produce números
func generator(nums ...int) <-chan int {
	out := make(chan int)
	go func() {
		for _, n := range nums {
			out <- n
		}
		close(out)
	}()
	return out
}

// Etapa de pipeline: eleva al cuadrado
func square(in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		for n := range in {
			out <- n * n
		}
		close(out)
	}()
	return out
}

// Fan-out: múltiples workers consumiendo del mismo channel
func worker(id int, jobs <-chan int, results chan<- int) {
	for j := range jobs {
		fmt.Printf("Worker %d procesando job %d\n", id, j)
		time.Sleep(time.Millisecond * 100)
		results <- j * 2
	}
}

func main() {
	// Pipeline
	nums := generator(2, 3, 4, 5)
	squares := square(nums)
	for s := range squares {
		fmt.Println(s)
	}

	// Fan-out / Fan-in
	jobs := make(chan int, 100)
	results := make(chan int, 100)

	for w := 1; w <= 3; w++ {
		go worker(w, jobs, results)
	}

	for j := 1; j <= 9; j++ {
		jobs <- j
	}
	close(jobs)

	for a := 1; a <= 9; a++ {
		<-results
	}
}
```

### Select Statement (Go)

```go
func multiplex(ch1, ch2 <-chan string) <-chan string {
	out := make(chan string)
	go func() {
		for {
			select {
			case msg := <-ch1:
				out <- "ch1: " + msg
			case msg := <-ch2:
				out <- "ch2: " + msg
			case <-time.After(time.Second * 5):
				out <- "timeout"
				return
			}
		}
	}()
	return out
}
```

### Rust Async Channels (tokio)

```rust
use tokio::sync::mpsc;

#[tokio::main]
async fn main() {
    let (tx, mut rx) = mpsc::channel::<i32>(100);

    tokio::spawn(async move {
        for i in 0..10 {
            tx.send(i).await.unwrap();
        }
    });

    while let Some(value) = rx.recv().await {
        println!("Received: {}", value);
    }
}
```

### CSP en JavaScript (usando async generators)

```typescript
async function* generatorChannel() {
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 100));
    yield i;
  }
}

async function* squareChannel(source: AsyncIterable<number>) {
  for await (const n of source) {
    yield n * n;
  }
}

async function main() {
  const nums = generatorChannel();
  const squares = squareChannel(nums);

  for await (const s of squares) {
    console.log(s);
  }
}
```

## Explicación

- **Channels como colas tipadas**: un channel en Go es una cola FIFO tipada. El sistema de tipos asegura que no puedas enviar accidentalmente un string a un channel que espera enteros. Los channels con buffer desacoplan emisor y receptor — el emisor se bloquea solo cuando el buffer está lleno. Los channels sin buffer sincronizan emisor y receptor en el momento exacto del handoff.
- **Select para multiplexación**: el statement `select` espera múltiples operaciones de channel simultáneamente. Si múltiples channels están listos, Go elige uno pseudoaleatoriamente. Esto permite mergear múltiples streams de entrada, agregar timeouts e implementar receives no bloqueantes. Es el equivalente CSP de `poll()` o `epoll()`.
- **Transferencia de propiedad**: cuando un valor se envía a través de un channel, el emisor renuncia a la propiedad. El receptor se convierte en el único propietario después del receive. Esto elimina condiciones de carrera por construcción — no hay estado compartido sobre el cual competir. El único punto de sincronización es el channel mismo.
- **Fan-out / fan-in**: fan-out crea múltiples goroutines worker leyendo del mismo channel de jobs. El channel balancea la carga naturalmente — el worker que esté listo recibe el siguiente job. Fan-in mergea múltiples channels de resultados en uno usando `select`. Este patrón escala a miles de goroutines porque son ligeras (pocos KB de stack que crecen y decrecen dinámicamente).

## Variantes

| Tipo de channel | Buffer | Sincronización | Mejor para |
|----------------|--------|----------------|------------|
| Sin buffer | 0 | Rendezvous | Handshake, timing preciso |
| Con buffer | N > 0 | Desacoplado | Productor-consumidor, backpressure |
| Cerrado | N/A | Señal de completitud | Señalizar no más valores |
| Nil | N/A | Nunca seleccionado | Deshabilitar casos de select |

## Mejores prácticas

- **Cierra channels desde el emisor, no desde el receptor**: en Go, solo el emisor debe cerrar un channel. Cerrar desde el receptor causa panic si el emisor envía simultáneamente. Usa un channel `done` o `context.Context` para señales de cancelación en lugar de cerrar desde el lado del consumidor.
- **Usa `select` con un channel `done` para cancelación**: las goroutines de larga duración deben aceptar un channel `done` o `ctx.Done()`. Cuando el padre quiere cancelar, cierra el channel done. El hijo usa `select` para hacer trabajo o salir cuando done se cierra.
- **Siempre recibe desde channels cerrados correctamente**: leer de un channel cerrado retorna el valor zero del tipo inmediatamente. Usa el comma-ok idiom (`v, ok := <-ch`) para distinguir entre un valor zero real y un channel cerrado.
- **Usa channels con buffer cuando es apropiado**: los channels sin buffer fuerzan sincronización estricta, lo cual puede serializar tu programa y negar los beneficios de la concurrencia. Los channels con buffer permiten que el emisor continúe sin esperar, mejorando el throughput. Dimensiona el buffer para emparejar la ráfaga esperada.
- **Usa `sync.WaitGroup` para coordinación de goroutines**: cuando lanzas un número fijo de goroutines, usa `WaitGroup` para bloquear hasta que todas completen. No cuentes receives de un channel de resultados a menos que conozcas el número exacto esperado — un send faltante o extra deadlocktea el programa.

## Errores comunes

- **Enviar en un channel cerrado**: esto genera panic. Asegúrate de que solo una goroutine cierra el channel, y que ninguna otra goroutine envía después del cierre. Usa `sync.Once` o una goroutine controladora dedicada si existen múltiples emisores.
- **Fugas de goroutines**: lanzar una goroutine que nunca sale fuga memoria. Si una goroutine espera en un channel que nunca se cierra y nunca recibe otro send, permanece viva para siempre. Asegúrate siempre de que haya un path de salida — ya sea mediante cierre de channel, señal done, o timeout.
- **Usar variables compartidas con goroutines**: cerrar sobre una variable de loop (`for i := 0; i < 10; i++ { go func() { fmt.Println(i) }() }`) captura la misma referencia de variable en cada closure, causando que todas las goroutines impriman el valor final. Pasa la variable como parámetro al closure: `go func(i int) { ... }(i)`.
- **Olvidar que recibir de nil bloquea para siempre**: un channel nil nunca está listo para send o receive. Si una variable de tipo channel se declara pero no se inicializa, leer de ella bloquea para siempre. Siempre inicializa channels con `make(chan T)` o asígnalos desde una función que retorna un channel inicializado.

## Preguntas frecuentes

**P: ¿Son channels solo colas con locks?**
R: Bajo el capó, los channels usan locks y variables de condición. Pero la abstracción que proveen — transferencia de propiedad, comunicación tipada, y multiplexación basada en select — es de más alto nivel y más segura que el lock manual. La implementación usa locks; el modelo mental no.

**P: ¿Cuántas goroutines son demasiadas?**
R: Go maneja rutinariamente cientos de miles de goroutines. Comienzan con un stack de 2KB que crece y decrece. El scheduler multiplexa goroutines sobre threads del SO (scheduling M:N). El límite es la memoria — cada goroutine consume cierto overhead. Si alcanzas límites de memoria, usa un worker pool con un número fijo de goroutines.

**P: ¿Debería usar mutexes o channels?**
R: Usa channels para coordinar y comunicar entre goroutines. Usa mutexes para proteger estado compartido que debe ser accedido por múltiples goroutines. El proverbio de Go es "comparte memoria comunicando, no comuniques compartiendo memoria." Cuando dudes, comienza con channels.

**P: ¿Puedo usar patrones CSP en lenguajes distintos a Go?**
R: Sí — Rust tiene `tokio::sync::mpsc`, JavaScript puede usar async generators, y lenguajes como Clojure tienen core.async. El patrón fundamental (paso de mensajes entre procesos secuenciales) es agnóstico al lenguaje, aunque la sintaxis nativa de Go (`go`, `chan`, `select`) lo hace el más ergonómico.

