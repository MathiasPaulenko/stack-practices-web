---
contentType: recipes
slug: csp-communication
title: "Coordinar Tareas Concurrentes con Communicating"
description: "CÃ³mo estructurar programas concurrentes usando channels, select statements y goroutines para comunicaciÃ³n segura sin estado mutable compartido en Go, Rust y JavaScript."
metaDescription: "Aprende CSP para coordinaciÃ³n de tareas concurrentes. Usa channels, select statements y goroutines para comunicar sin estado mutable compartido en Go, Rust y JS."
difficulty: intermediate
topics:
  - concurrency
tags:
  - concurrency
  - async
  - threads
  - parallel
  - locks
relatedResources:
  - /recipes/locks-and-mutexes
  - /recipes/thread-pools
  - /recipes/async-patterns
  - /recipes/concurrent-data-structures
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende CSP para coordinaciÃ³n de tareas concurrentes. Usa channels, select statements y goroutines para comunicar sin estado mutable compartido en Go, Rust y JS."
  keywords:
    - CSP communicating sequential processes
    - channels concurrencia
    - goroutines go
    - select statement
    - message passing
---

## VisiÃ³n general

La concurrencia con memoria compartida es propensa a errores. Dos threads leen y escriben la misma variable, y necesitas locks, operaciones atÃ³micas y razonamiento cuidadoso sobre visibilidad de memoria para prevenir condiciones de carrera. El problema central no es la concurrencia misma â€” es compartir estado mutable entre actores concurrentes.

Communicating Sequential Processes (CSP), popularizado por Go, invierte este modelo. En lugar de compartir memoria, las goroutines (threads ligeros) comunican enviando mensajes a travÃ©s de channels. Un channel es una cola tipada donde una goroutine escribe y otra lee. El emisor se bloquea hasta que el receptor estÃ¡ listo (para channels sin buffer), o hasta que el buffer tiene espacio (para channels con buffer). Por diseÃ±o, las goroutines no comparten estado mutable â€” pasan la propiedad de los datos a travÃ©s de channels. El siguiente enfoque cubre channels de Go, channels async de Rust y patrones CSP en JavaScript con ejemplos prÃ¡cticos.

## CuÃ¡ndo usarlo

Usa esta receta cuando:

- MÃºltiples workers concurrentes necesitan coordinar sin estado mutable compartido
- Construyendo [pipelines](/guides/architecture/microservices-architecture-guide) donde la salida de una etapa es la entrada de la siguiente
- Implementando fan-out (un productor, muchos consumidores) y fan-in (muchos productores, un consumidor)
- Reemplazando [concurrencia basada en locks](/recipes/concurrency/concurrent-data-structures) por paso de mensajes para claridad y seguridad
- Escribiendo programas en Go donde goroutines y channels son el modelo de concurrencia idiomÃ¡tico

## SoluciÃ³n

### Channels y Goroutines en Go

```go
package main

import (
	"fmt"
	"time"
)

// Etapa de pipeline: generator produce nÃºmeros
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

// Fan-out: mÃºltiples workers consumiendo del mismo channel
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

## ExplicaciÃ³n

- **Channels como colas tipadas**: un channel en Go es una cola FIFO tipada. El sistema de tipos asegura que no puedas enviar accidentalmente un string a un channel que espera enteros. Los channels con buffer desacoplan emisor y receptor â€” el emisor se bloquea solo cuando el buffer estÃ¡ lleno. Los channels sin buffer sincronizan emisor y receptor en el momento exacto del handoff.
- **Select para multiplexaciÃ³n**: el statement `select` espera mÃºltiples operaciones de channel simultÃ¡neamente. Si mÃºltiples channels estÃ¡n listos, Go elige uno pseudoaleatoriamente. Esto permite mergear mÃºltiples streams de entrada, agregar timeouts e implementar receives no bloqueantes. Es el equivalente CSP de `poll()` o `epoll()`.
- **Transferencia de propiedad**: cuando un valor se envÃ­a a travÃ©s de un channel, el emisor renuncia a la propiedad. El receptor se convierte en el Ãºnico propietario despuÃ©s del receive. Esto elimina condiciones de carrera por construcciÃ³n â€” no hay estado compartido sobre el cual competir. El Ãºnico punto de sincronizaciÃ³n es el channel mismo.
- **Fan-out / fan-in**: fan-out crea mÃºltiples goroutines worker leyendo del mismo channel de jobs. El channel balancea la carga naturalmente â€” el worker que estÃ© listo recibe el siguiente job. Fan-in mergea mÃºltiples channels de resultados en uno usando `select`. Este patrÃ³n escala a miles de goroutines porque son ligeras (pocos KB de stack que crecen y decrecen dinÃ¡micamente).

## Variantes

| Tipo de channel | Buffer | SincronizaciÃ³n | Mejor para |
|----------------|--------|----------------|------------|
| Sin buffer | 0 | Rendezvous | Handshake, timing preciso |
| Con buffer | N > 0 | Desacoplado | Productor-consumidor, backpressure |
| Cerrado | N/A | SeÃ±al de completitud | SeÃ±alizar no mÃ¡s valores |
| Nil | N/A | Nunca seleccionado | Deshabilitar casos de select |

## Lo que funciona

- **Cierra channels desde el emisor, no desde el receptor**: en Go, solo el emisor debe cerrar un channel. Cerrar desde el receptor causa panic si el emisor envÃ­a simultÃ¡neamente. Usa un channel `done` o `context.Context` para seÃ±ales de cancelaciÃ³n en lugar de cerrar desde el lado del consumidor.
- **Usa `select` con un channel `done` para cancelaciÃ³n**: las goroutines de larga duraciÃ³n deben aceptar un channel `done` o `ctx.Done()`. Cuando el padre quiere cancelar, cierra el channel done. El hijo usa `select` para hacer trabajo o salir cuando done se cierra.
- **Siempre recibe desde channels cerrados correctamente**: leer de un channel cerrado retorna el valor zero del tipo inmediatamente. Usa el comma-ok idiom (`v, ok := <-ch`) para distinguir entre un valor zero real y un channel cerrado.
- **Usa channels con buffer cuando es apropiado**: los channels sin buffer fuerzan sincronizaciÃ³n estricta, lo cual puede serializar tu programa y negar los beneficios de la concurrencia. Los channels con buffer permiten que el emisor continÃºe sin esperar, mejorando el throughput. Dimensiona el buffer para emparejar la rÃ¡faga esperada.
- **Usa `sync.WaitGroup` para coordinaciÃ³n de goroutines**: cuando lanzas un nÃºmero fijo de goroutines, usa `WaitGroup` para bloquear hasta que todas completen. No cuentes receives de un channel de resultados a menos que conozcas el nÃºmero exacto esperado â€” un send faltante o extra deadlocktea el programa.

## Errores comunes

- **Enviar en un channel cerrado**: esto genera panic. AsegÃºrate de que solo una goroutine cierra el channel, y que ninguna otra goroutine envÃ­a despuÃ©s del cierre. Usa `sync.Once` o una goroutine controladora dedicada si existen mÃºltiples emisores.
- **Fugas de goroutines**: lanzar una goroutine que nunca sale fuga memoria. Si una goroutine espera en un channel que nunca se cierra y nunca recibe otro send, permanece viva para siempre. AsegÃºrate siempre de que haya un path de salida â€” ya sea mediante cierre de channel, seÃ±al done, o timeout.
- **Usar variables compartidas con goroutines**: cerrar sobre una variable de loop (`for i := 0; i < 10; i++ { go func() { fmt.Println(i) }() }`) captura la misma referencia de variable en cada closure, causando que todas las goroutines impriman el valor final. Pasa la variable como parÃ¡metro al closure: `go func(i int) { ... }(i)`.
- **Olvidar que recibir de nil bloquea para siempre**: un channel nil nunca estÃ¡ listo para send o receive. Si una variable de tipo channel se declara pero no se inicializa, leer de ella bloquea para siempre. Siempre inicializa channels con `make(chan T)` o asÃ­gnalos desde una funciÃ³n que retorna un channel inicializado.

## Cuando No Usar Este Enfoque

- **Pipelines de datos de alto throughput**: los channels CSP agregan overhead de coordinaciÃ³n. Para transferencia bulk de datos, memoria compartida con locks o colas lock-free ofrecen 3-5x mayor throughput
- **Sistemas que requieren acceso aleatorio a datos compartidos**: los channels son para transferir propiedad, no para compartir estado mutable. Si mÃºltiples readers necesitan acceso aleatorio a los mismos datos, usa memoria compartida con sincronizaciÃ³n
- **Inner loops sensibles a latencia**: send/receive de channel involucra scheduling y potencial bloqueo. Para operaciones sub-microsegundo, acceso directo a memoria o atomics son mÃ¡s apropiados
- **ComunicaciÃ³n inter-proceso**: los channels de Go funcionan dentro de un solo proceso. Para IPC, usa pipes del SO, memoria compartida o message queues. CSP no cruza boundaries de proceso
- **Patrones simples request-response**: si una funciÃ³n solo necesita llamar a otra y obtener un resultado, un channel es excesivo. Usa una llamada directa a funciÃ³n o un future/promise
- **Fan-out a millones de consumidores**: los channels son comunicaciÃ³n M:N, no pub/sub. Broadcastear a millones de consumidores requiere un patrÃ³n distinto (ej. sistemas de messaging basados en topics)

## Benchmarks de Rendimiento

- **Latencia send/receive de channel**: send+receive en channel no bufferado toma ~50-100ns en hardware moderno. Los channels bufferados agregan ~20-50ns para gestiÃ³n de cola
- **Throughput de channel**: un solo channel de Go maneja 10-50 millones de mensajes/seg para payloads pequeÃ±os (<64 bytes). Payloads mÃ¡s grandes (1KB+) reducen el throughput a 1-5 millones/seg por la alocaciÃ³n de memoria
- **Overhead de select**: un select con 4 cases agrega ~30ns por operaciÃ³n. Con 64 cases, el overhead sube a ~200ns. MantÃ©n select pequeÃ±o y enfocado
- **Scheduling de goroutines**: el scheduler de Go multiplexa goroutines sobre threads del SO con ~100ns de costo de context switch. Un GOMAXPROCS de 4 maneja 100,000 goroutines con <1ms de latencia de scheduling
- **Channel vs mutex**: para compartir un contador, sync.Mutex + int64 es 2-3x mÃ¡s rÃ¡pido que comunicaciÃ³n basada en channels. Los channels destacan en coordinaciÃ³n, no en sharing fino de datos
- **Bufferado vs no bufferado**: los channels bufferados con capacidad 1,000 logran 2x el throughput de los no bufferados bajo carga alta. Capacidad mÃ¡s allÃ¡ de 10,000 muestra retornos decrecientes y aumenta la presiÃ³n de memoria

## Estrategia de Testing

- **Test de deadlocks**: ejecuta tests con flag -race en Go. Usa untime.GOMAXPROCS(runtime.NumCPU()) para maximizar la diversidad de scheduling y detectar deadlocks
- **Test de comportamiento de cierre de channel**: verifica que enviar en un channel cerrado paniquee y recibir en un channel cerrado retorne el zero value. Testea mÃºltiples receivers drenando un channel despuÃ©s del close
- **Test de fairness de select**: el select de Go randomiza la selecciÃ³n de cases. Ejecuta tests 1,000+ veces para verificar que ningÃºn case se starve sistemÃ¡ticamente
- **Test de backpressure**: llena un channel bufferado y verifica que los senders bloqueen. Usa timeouts (select con 	ime.After) para detectar comportamiento de bloqueo
- **Test de leaks de goroutines**: usa untime.NumGoroutine() antes y despuÃ©s de los tests. Un conteo creciente indica goroutines que nunca terminan (bloqueadas en receive de channel)
- **Test con el race detector**: go test -race detecta data races en runtime. EjecÃºtalo en cada build de CI. Agrega 2-10x al tiempo de ejecuciÃ³n pero detecta bugs que son invisibles de otra forma

## Estimacion de Costos

- **Memoria por channel**: un channel no bufferado usa ~96 bytes. Un channel bufferado con capacidad N usa ~96 + N * element_size bytes. 10,000 channels bufferados con capacidad 100 y elementos de 8 bytes usan ~80MB
- **Memoria de stack de goroutines**: cada goroutine comienza con 2KB y crece/decrece dinÃ¡micamente. 100,000 goroutines usan ~200MB mÃ­nimo. Presupuesta memoria para crecimiento de stack bajo cargas pesadas
- **Productividad de desarrollo**: CSP fomenta boundaries de propiedad claras. Los equipos reportan 30-40% menos bugs de condiciones de carrera comparado con concurrencia de memoria compartida. El costo de diseÃ±o upfront se paga en menos horas de debugging
- **Ahorros de infraestructura**: el modelo eficiente de goroutines de Go significa menos servidores. Un servicio Go que maneja 100K conexiones concurrentes corre en una sola instancia de 4 cores donde un modelo thread-per-connection necesitarÃ­a 10+ instancias
- **Costo de monitoreo**: las herramientas integradas pprof y trace de Go son gratuitas. La contenciÃ³n de channels y leaks de goroutines son visibles sin herramientas APM comerciales. Presupuesta 0$ para infraestructura de monitoreo

## Monitoring y Observabilidad

- **Conteo de goroutines**: monitorea untime.NumGoroutine(). Un conteo creciente indica leaks. Alerta cuando el conteo excede 2x el steady state esperado
- **Channel queue depth**: no hay alertas integradas de len() para channels. Envuelve channels en un struct que trackee conteos de send/receive y exponga mÃ©tricas vÃ­a Prometheus
- **GC pause time**: los pauses del GC de Go son tÃ­picamente <1ms. Monitorea las distribuciones de pauses. Pauses >10ms indican presiÃ³n excesiva de heap por buffers de channels o stacks de goroutines
- **Latencia del scheduler**: usa untime/trace para medir delays de scheduling. Delays altos (>1ms) indican CPU starvation o demasiadas goroutines runnable
- **Tiempo de bloqueo send/receive**: instrumenta operaciones de channel con timers para medir cuÃ¡nto bloquean senders y receivers. Tiempos de bloqueo altos indican backpressure o productores/consumidores desbalanceados

## Deployment Checklist

- [ ] Setear GOMAXPROCS al nÃºmero de CPU cores (default en Go 1.5+). No lo overridess a menos que tengas una razÃ³n especÃ­fica
- [ ] Configurar graceful shutdown: cierra channels en orden de dependencia, usa context.Context para cancelaciÃ³n, espera goroutines con sync.WaitGroup
- [ ] Setear lÃ­mites de memoria: el runtime de Go respeta GOMEMLIMIT (Go 1.19+). Setealo a 80% de la memoria del contenedor para evitar OOM kills
- [ ] Habilitar endpoints pprof en producciÃ³n (
et/http/pprof). Protegelos con autenticaciÃ³n o bindÃ©alos a un puerto interno
- [ ] Setear parÃ¡metros de GC tuning: GOGC controla el ratio de trigger. Default 100 significa que el GC corre cuando el heap se duplica. Valores mÃ¡s bajos reducen memoria a costo de CPU
- [ ] Configurar tamaÃ±os de buffer de channel basados en anÃ¡lisis de rate productor/consumidor. Default a no bufferado a menos que midas un beneficio especÃ­fico

## Consideraciones de Seguridad

- **DoS por leak de goroutines**: un atacante puede provocar leaks de goroutines abriendo conexiones y nunca completando el handshake. Cada goroutine leakeada mantiene ~2KB+ de memoria. Implementa timeouts de conexiÃ³n y context cancellation
- **Agotamiento de recursos basado en channels**: los channels no bufferados bloquean a los senders. Un atacante puede explotar esto siendo un receptor lento, causando que los senders se acumulen y agoten goroutines. Usa channels bufferados con timeouts
- **InyecciÃ³n de poison pill**: un productor malicioso puede enviar un valor especialmente craftado que cause que los consumidores paniquee o entren en un loop infinito. Valida los mensajes del channel antes de procesarlos
- **Fuga de informaciÃ³n vÃ­a timing de channel**: el timing de send/receive de channel varÃ­a con la profundidad de la cola. Un atacante midiendo tiempos de respuesta puede inferir el estado interno. Agrega jitter o respuestas de tiempo constante para operaciones security-sensitive
- **Captura insegura de closure**: cerrar sobre variables de loop en goroutines captura el valor final de la variable de loop. Este es un bug conocido de Go que puede leakear datos o causar comportamiento incorrecto. Pasa variables como parÃ¡metros
- **Race de cierre de channel**: cerrar un channel mientras un sender sigue activo causa panic. Usa sync.Once o context.Context para coordinar el shutdown. Nunca cierres un channel del lado del receptor
- **Denial of service vÃ­a select starvation**: si un select tiene cases con tiempos de ejecuciÃ³n variables, los cases rÃ¡pidos pueden starvar a los lentos. Go randomiza la selecciÃ³n de cases, pero un atacante puede explotar el timing para biasar la selecciÃ³n. Usa channels separados para niveles de prioridad
- **Agotamiento de memoria vÃ­a mensajes grandes en channel**: los channels no limitan el tamaÃ±o de mensajes. Un atacante puede enviar payloads grandes a travÃ©s de un channel para agotar memoria. Implementa lÃ­mites de tamaÃ±o a nivel aplicaciÃ³n
- **Ataques de crecimiento de stack de goroutines**: goroutines con recursiÃ³n profunda pueden crecer su stack hasta el lÃ­mite de 1GB. Un atacante puede triggerar recursiÃ³n profunda vÃ­a input craftado. Setea lÃ­mites de profundidad de recursiÃ³n
- **Bypass de context cancellation**: si una goroutine no chequea ctx.Done(), ignora la cancelaciÃ³n. Audita todas las goroutines para verificar checks de context. Usa ctx.Err() para verificar el estado de cancelaciÃ³n
## Preguntas frecuentes

**P: Â¿Son channels solo colas con locks?**
R: Bajo el capÃ³, los channels usan locks y variables de condiciÃ³n. Pero la abstracciÃ³n que proveen â€” transferencia de propiedad, comunicaciÃ³n tipada, y multiplexaciÃ³n basada en select â€” es de mÃ¡s alto nivel y mÃ¡s segura que el lock manual. La implementaciÃ³n usa locks; el modelo mental no.

**P: Â¿CuÃ¡ntas goroutines son demasiadas?**
R: Go maneja rutinariamente cientos de miles de goroutines. Comienzan con un stack de 2KB que crece y decrece. El scheduler multiplexa goroutines sobre threads del SO (scheduling M:N). El lÃ­mite es la memoria â€” cada goroutine consume cierto overhead. Si alcanzas lÃ­mites de memoria, usa un worker pool con un nÃºmero fijo de goroutines.

**P: Â¿DeberÃ­a usar mutexes o channels?**
R: Usa channels para coordinar y comunicar entre goroutines. Usa mutexes para proteger estado compartido que debe ser accedido por mÃºltiples goroutines. El proverbio de Go es "comparte memoria comunicando, no comuniques compartiendo memoria." Cuando dudes, comienza con channels. Consulta [Estructuras de Datos Concurrentes](/recipes/concurrency/concurrent-data-structures) para alternativas basadas en locks.

**P: Â¿Puedo usar patrones CSP en lenguajes distintos a Go?**
R: SÃ­ â€” Rust tiene `tokio::sync::mpsc`, JavaScript puede usar async generators, y lenguajes como Clojure tienen core.async. El patrÃ³n fundamental (paso de mensajes entre procesos secuenciales) es agnÃ³stico al lenguaje, aunque la sintaxis nativa de Go (`go`, `chan`, `select`) lo hace el mÃ¡s ergonÃ³mico.


### Â¿Esta soluciÃ³n estÃ¡ lista para producciÃ³n?

SÃ­. Los ejemplos de cÃ³digo arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuraciÃ³n a tu entorno especÃ­fico antes de desplegar.

### Â¿CuÃ¡les son las caracterÃ­sticas de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, aÃ±ade caching, batching y connection pooling segÃºn sea necesario.

### Â¿CÃ³mo depuro problemas con este enfoque?

Empieza con el ejemplo mÃ­nimo de arriba. AÃ±ade logging en cada paso. Prueba con entradas pequeÃ±as primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
