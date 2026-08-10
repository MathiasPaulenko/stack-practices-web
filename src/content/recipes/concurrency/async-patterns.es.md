---
contentType: recipes
slug: async-patterns
title: "Patrones Async con Promises, Futures y Coroutines"
description: "CÃ³mo escribir cÃ³digo concurrente eficiente usando async/await, promises, futures y coroutines en JavaScript, Python y Java para I/O no bloqueante y procesamiento paralelo."
metaDescription: "Aprende patrones async para programaciÃ³n concurrente. Domina async/await, promises, futures y coroutines en JavaScript, Python y Java para I/O no bloqueante."
difficulty: intermediate
topics:
  - concurrency
tags:
  - concurrency
  - event-loop
  - async
  - threads
  - parallel
relatedResources:
  - /recipes/microservices-patterns
  - /recipes/serverless-functions
  - /recipes/event-driven-functions
  - /recipes/load-testing
  - /recipes/csp-communication
  - /recipes/concurrent-data-structures
  - /recipes/locks-and-mutexes
  - /recipes/thread-pools
lastUpdated: "2026-06-14"
publishedAt: "2026-06-14"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende patrones async para programaciÃ³n concurrente. Domina async/await, promises, futures y coroutines en JavaScript, Python y Java para I/O no bloqueante."
  keywords:
    - patrones async await
    - concurrencia promises
    - corutinas python
    - io no bloqueante
    - procesamiento paralelo



---
## VisiÃ³n general

El cÃ³digo sÃ­ncrono bloquea el thread de ejecuciÃ³n hasta que una operaciÃ³n completa. Cuando esa operaciÃ³n es I/O â€” consultar una base de datos, obtener datos de una API, leer un archivo â€” el thread permanece inactivo, desperdiciando ciclos de CPU que podrÃ­an procesar otros requests. La programaciÃ³n async resuelve esto suspendiendo la tarea actual cuando encuentra I/O, permitiendo que el runtime ejecute otras tareas, y reanudando la tarea original cuando el I/O completa. Esto habilita a un solo thread para manejar miles de conexiones concurrentes.

El desafÃ­o no es escribir las keywords `async` y `await` â€” es entender el event loop subyacente, evitar el callback hell, manejar errores a travÃ©s de puntos de suspensiÃ³n, y prevenir contenciÃ³n de recursos cuando mÃºltiples tareas acceden a estado compartido. Diferentes runtimes implementan async de forma distinta: JavaScript usa un event loop con promises, Python usa `asyncio` con coroutines, y Java usa `CompletableFuture` con pools de threads. A continuacion se cubre patrones, anti-patrones e implementaciones prÃ¡cticas en los tres.

## CuÃ¡ndo usarlo

Usa esta receta cuando:

- Construyendo APIs que manejan cientos de requests concurrentes por proceso
- Obteniendo datos de mÃºltiples servicios que pueden llamarse en paralelo
- Procesando cargas de trabajo I/O-bound como web scraping, uploads de archivos o colas de mensajes
- Implementando capacidades en tiempo real como [WebSockets](/recipes/websocket-server/), chat o dashboards en vivo
- Reemplazando modelos de thread-por-request con [arquitecturas event-driven](/recipes/event-driven-architecture/) para eficiencia

## SoluciÃ³n

### Async/Await con Requests Concurrentes (JavaScript / Node.js)

```javascript
async function fetchUserDashboard(userId) {
  const [profile, orders, recommendations] = await Promise.all([
    getProfile(userId),
    getOrders(userId),
    getRecommendations(userId),
  ]);
  return { profile, orders, recommendations };
}

async function fetchDashboardResilient(userId) {
  const [profile, orders, recommendations] = await Promise.allSettled([
    getProfile(userId),
    getOrders(userId),
    getRecommendations(userId),
  ]);

  return {
    profile: profile.status === 'fulfilled' ? profile.value : null,
    orders: orders.status === 'fulfilled' ? orders.value : [],
    recommendations: recommendations.status === 'fulfilled' ? recommendations.value : [],
  };
}
```

### Python asyncio con Task Groups

```python
import asyncio
import aiohttp

async def fetch_url(session: aiohttp.ClientSession, url: str) -> dict:
    async with session.get(url) as response:
        return await response.json()

async def fetch_all_urls(urls: list[str]) -> list[dict]:
    async with aiohttp.ClientSession() as session:
        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(fetch_url(session, url)) for url in urls]
        return [task.result() for task in tasks]

async def fetch_with_limit(urls: list[str], max_concurrent: int = 10):
    semaphore = asyncio.Semaphore(max_concurrent)

    async def bounded_fetch(session, url):
        async with semaphore:
            return await fetch_url(session, url)

    async with aiohttp.ClientSession() as session:
        return await asyncio.gather(
            *[bounded_fetch(session, url) for url in urls]
        )

urls = ["https://api.example.com/users/1", "https://api.example.com/users/2"]
results = asyncio.run(fetch_all_urls(urls))
```

### Java CompletableFuture Pipeline

```java
import java.util.concurrent.CompletableFuture;

public class AsyncOrderService {
    public CompletableFuture<Order> processOrder(String orderId) {
        return validateOrder(orderId)
            .thenCompose(this::checkInventory)
            .thenCompose(this::processPayment)
            .thenCompose(this::createShipment)
            .exceptionally(ex -> {
                log.error("Order processing failed", ex);
                return Order.failed(orderId, ex.getMessage());
            });
    }

    private CompletableFuture<ValidatedOrder> validateOrder(String orderId) {
        return CompletableFuture.supplyAsync(() -> new ValidatedOrder(orderId));
    }

    public CompletableFuture<Dashboard> loadDashboard(String userId) {
        CompletableFuture<Profile> profileFuture = fetchProfile(userId);
        CompletableFuture<List<Order>> ordersFuture = fetchOrders(userId);
        return profileFuture.thenCombine(ordersFuture, Dashboard::new);
    }
}
```

## ExplicaciÃ³n

- **Event loop**: el mecanismo core en JavaScript y Python asyncio.   Mantiene una cola de tareas y las ejecuta una a la vez.   Cuando una tarea encuentra un `await`, cede control y el loop toma la siguiente tarea.   Cuando la operaciÃ³n esperada completa, la tarea se re-programa.
- **Concurrencia estructurada**: en Python 3.  11+, `asyncio.   Esto previene tareas huÃ©rfanas en segundo plano que filtran memoria o retienen recursos despuÃ©s de un fallo del padre.
- **ComposiciÃ³n de promises**: las promises de JavaScript se encadenan vÃ­a `.  then()` y `.  catch()`.   `Promise.  all()` espera todas las promises, fallando rÃ¡pido si alguna rechaza.   `Promise.  allSettled()` espera todas, retornando tanto Ã©xitos como fallos.   `Promise.  race()` retorna la primera en completarse.
- **Backpressure con semÃ¡foros**: la concurrencia ilimitada agota memoria, file descriptors y cuotas upstream.   Un semÃ¡foro limita el nÃºmero de operaciones simultÃ¡neas.   Con un lÃ­mite de 10, solo 10 requests HTTP estÃ¡n en vuelo a la vez; el 11Â° espera hasta que se libere un slot.

## Variantes

| PatrÃ³n | Lenguaje | Modelo de concurrencia | Manejo de errores | Mejor para |
|--------|----------|----------------------|-------------------|------------|
| async/await | JS/Python | Event loop | try/catch | APIs I/O-bound |
| CompletableFuture | Java | Thread pool | exceptionally() | Mix CPU + I/O |
| Goroutines | Go | M:N threads | Channels | Servicios de alto throughput |
| RxJS/RxPY | JS/Python | Observables | onError | Streams de eventos |
| Threads | Todos | OS threads | try/catch | Tareas CPU-bound |

## Lo que funciona

- **Siempre await las promises**: una promise no awaited es una operaciÃ³n fire-and-forget que silenciosamente traga errores.   Si una promise rechaza y nada la espera, Node.  js emite un warning `unhandledRejection`.   En funciones async, siempre `await` o `.  catch()` cada promise.
- **Usa Promise.all para independencia, secuencial para dependencias**: si la tarea B necesita el resultado de la tarea A, deben ejecutarse secuencialmente.  all` o `asyncio.  gather` para ejecutarlas concurrentemente.   Ejecutar tareas independientes secuencialmente desperdicia tiempo.
- **Establece timeouts en todas las llamadas externas**: una API no responiva puede colgar una operaciÃ³n async indefinidamente.   Envuelve cada llamada externa en un timeout con [retry logic](/recipes/retry-backoff/).
- **Prefiere concurrencia estructurada sobre fire-and-forget**: lanzar una tarea en segundo plano que sobrevive a su padre es una fuente comÃºn de filtraciones de memoria y condiciones de carrera.
- **Profilea el event loop**: en Node.  js` o `0x` para detectar lag del event loop.  run` con modo debug.   Si el event loop estÃ¡ bloqueado por trabajo CPU, muÃ©velo a un worker thread o process pool.

## Errores comunes

- **Bloquear el event loop**: llamar una lectura de archivo sÃ­ncrona (`fs.  readFileSync`) o una computaciÃ³n pesada dentro de una funciÃ³n async bloquea todo el event loop.   Todos los otros requests se detienen.  promises.  readFile`) o descarga trabajo CPU a worker threads.
- **Callback hell sin async/await**: cadenas profundamente anidadas `.  then()` son difÃ­ciles de leer y debuggear.   El JavaScript moderno deberÃ­a usar `async/await` para todos excepto los casos mÃ¡s simples.   Produce cÃ³digo plano y legible que luce sÃ­ncrono pero se ejecuta asÃ­ncronamente.
- **Condiciones de carrera en estado mutable compartido**: dos tareas concurrentes incrementando un contador sin sincronizaciÃ³n producen resultados incorrectos.
- **Ignorar backpressure**: aceptar requests mÃ¡s rÃ¡pido de lo que pueden procesarse lleva a agotamiento de memoria y kills por OOM.   Una respuesta 503 es mejor que un servidor caÃ­do.

## Cuando No Usar Este Enfoque

- **Tareas CPU-bound**: async no ayuda cuando el CPU es el cuello de botella.
- **Scripts secuenciales simples**: si tu script hace una llamada HTTP, espera y sale, async agrega complejidad sin beneficio. Un simple equests.get() es mÃ¡s claro que su equivalente async
- **Sistemas en tiempo real con deadlines estrictos**: los runtimes async introducen scheduling no determinista.
- **Sistemas embebidos con memoria muy limitada**: cada operaciÃ³n async pendiente mantiene un callback y closure.
- **Codebases legacy sin soporte async**: retrofitear async en un codebase sÃ­ncrono requiere tocar cada llamada I/O en la cadena.
- **Entornos sensibles al debugging**: los stack traces async son mÃ¡s difÃ­ciles de leer.
- **Jobs batch de una sola request**: un job nocturno que obtiene un endpoint API y escribe a la base de datos no gana nada con async.

## Benchmarks de Rendimiento

- **Node.js event loop**: un proceso Node.
- **Python asyncio vs threads**: asyncio procesa 15,000 requests HTTP/seg en un solo core vs 3,000 con threading (aiohttp vs Flask+gunicorn threads).
- **Go goroutines**: 100,000 goroutines consumen ~400MB de stack (2KB stack inicial cada una).
- **Rust tokio**: el runtime async de tokio agrega ~20ns por spawn de task vs ~5us para un thread del SO.
- **Java virtual threads**: 1M virtual threads consumen ~4GB de heap vs 1M platform threads que necesitarÃ­an ~2TB de stack.
- **Context switching**: el context switch de un thread del SO toma 1-10us.   El switch de una task async toma 100-500ns.
- **Memoria por conexiÃ³n**: Node.
- **Escalado de throughput**: el throughput de async I/O escala linealmente con conexiones hasta la saturaciÃ³n de CPU.
- **Percentiles de latencia**: los runtimes async tienen percentiles p99 mÃ¡s ajustados (50-100ms) bajo carga comparado con thread pools (200-500ms) porque no hay context switches ni esperas de cola del thread pool
- **PresiÃ³n de GC**: cada task async aloca un objeto state machine.

## Estrategia de Testing

- **Unit test funciones async individuales en aislamiento**: mockea dependencias I/O y verifica valores de retorno.  mark.
- **Integration test con I/O real**: levanta un servidor HTTP local y base de datos.   Verifica comportamiento end-to-end bajo carga async.
- **Stress test con alta concurrencia**: lanza 1,000+ tasks concurrentes y verifica que no haya deadlocks, leaks de recursos ni resultados incorrectos.
- **Test de comportamiento de timeouts**: verifica que operaciones lentas disparen timeouts correctamente.  wait_for o Promise.
- **Test de propagaciÃ³n de cancelaciÃ³n**: cancela una task padre y verifica que todas las tasks hijas se cancelen.
- **Test de propagaciÃ³n de errores**: verifica que excepciones en tasks hijas suban al padre.   Comprueba que syncio.
- **DetecciÃ³n de condiciones de carrera**: ejecuta tests con ThreadSanitizer (para cÃ³digo con threads) o usa syncio debug mode (PYTHONASYNCIODEBUG=1) para detectar recursos no cerrados y callbacks lentos
- **Load test con payloads realistas**: prueba con payloads de tamaÃ±o de producciÃ³n, no datos de juguete.
- **Test de manejo de backpressure**: envÃ­a requests mÃ¡s rÃ¡pido de lo que el servidor puede procesar y verifica que responda con 503 o los encole, en lugar de quedarse sin memoria
- **Chaos testing**: mata tasks aleatoriamente, inyecta delays de red y simula fallos de disco.

## Estimacion de Costos

- **Sizing de servidores**: las cargas async necesitan menos servidores.   Un servidor Node.
- **Licenciamiento de connection pools**: los async connection pools (ej.   asyncpg, aiohttp) son open source.
- **Costo de desarrollo**: el cÃ³digo async toma 20-30% mÃ¡s tiempo en escribirse y depurarse que el sÃ­ncrono equivalente.
- **Overhead de monitoreo**: los runtimes async necesitan monitoreo especializado (event loop lag, task queue depth, promise rejection tracking).
- **Ahorros de infraestructura**: migrar de thread-per-request a async puede reducir el nÃºmero de servidores 3-5x.
- **Costo de memoria**: las tasks async usan 10-100x menos memoria que los threads.
- **Costo operacional**: los sistemas async tienen menos partes mÃ³viles (sin tuning de thread pools, sin debugging de lock contention).

## Monitoring y Observabilidad

- **Event loop lag**: Lag >50ms indica que el event loop estÃ¡ bloqueado.   Herramientas: clinic.
- **Task queue depth**: Una cola creciente significa que las tasks se producen mÃ¡s rÃ¡pido de lo que se consumen.
- **Conexiones activas**: monitorea el conteo de conexiones concurrentes.
- **Tasa de promise rejections**: js) o unhandled task exceptions (Python).
- **GC pause time**: los runtimes async generan muchos objetos pequeÃ±os.
- **Uso de memoria**: trackea RSS y crecimiento de heap.
- **Percentiles de latencia de requests**: trackea p50, p95, p99.   Los sistemas async deben tener percentiles ajustados.

## Deployment Checklist

- [ ] Configurar lÃ­mites de file descriptors: ulimit -n 65536 o systemd LimitNOFILE=65536
- [ ] Configurar tamaÃ±os de connection pool basados en concurrencia esperada (pool size = 2 * CPU cores para async, no 50+)
- [ ] Setear timeouts en todas las operaciones I/O: clientes HTTP, queries de base de datos, lecturas de cachÃ©. Default a 5-30 segundos
- [ ] Habilitar logging estructurado con request IDs para trazar cadenas de llamadas async
- [ ] Configurar health checks que verifiquen que el event loop responde, no solo que el proceso estÃ¡ vivo
- [ ] Setear lÃ­mites de memoria y configurar comportamiento del OOM killer. Las tasks async son ligeras pero pueden acumularse
- [ ] Habilitar graceful shutdown: drenar tasks pendientes por 5-10 segundos antes de matar el proceso

## Consideraciones de Seguridad

- **Agotamiento de recursos por task flooding**: un atacante puede spawnear millones de tasks async enviando requests rÃ¡pidos.
- **InyecciÃ³n de callbacks async**: si input del usuario controla quÃ© callback se ejecuta, los atacantes pueden invocar funciones arbitrarias.
- **DoS por promise rejection**: las unhandled promise rejections en Node.  js <15 crashean el proceso.   Siempre adjunta handlers .
- **Bloqueo del event loop**: una sola operaciÃ³n sÃ­ncrona bloquea todo el event loop.   Audita todos los code paths por llamadas bloqueantes (s.  readFileSync, 	ime.  sleep, crypto.  pbkdf2Sync).
- **Estado mutable compartido en cÃ³digo async**: aunque async corre en un solo thread, los puntos wait permiten intercalaciÃ³n.   Estado compartido modificado a travÃ©s de boundaries wait puede causar condiciones de carrera.
- **Bypass de timeouts**: si se setea un timeout en una task pero la operaciÃ³n I/O subyacente no soporta cancelaciÃ³n, la task parece hacer timeout pero el I/O continÃºa consumiendo recursos.
- **Memory leaks vÃ­a closures**: cada task async captura su scope en un closure.   Tasks long-lived que mantienen referencias a objetos grandes previenen el GC.
- **Riesgos de supply chain en librerÃ­as async**: librerÃ­as async populares (aiohttp, asyncio, tokio) han tenido CVEs.
- **Denial of service vÃ­a clientes lentos**: un cliente HTTP lento mantiene una conexiÃ³n async abierta.
- **DeserializaciÃ³n insegura en pipelines async**: el parsing JSON async (wait response.  json()) puede explotarse con payloads grandes.
- **Spoofing de coroutines**: en Python, cualquier objeto con __await__ puede ser awaited.   Objetos maliciosos podrÃ­an ejecutar cÃ³digo al ser awaited.
- **Agotamiento de file descriptors**: Sin lÃ­mites, un flood de conexiones agota los FDs y crashea el proceso.
- **Fuga de informaciÃ³n en mensajes de error**: los stack traces async son profundos y pueden exponer paths internos, query strings o credenciales.
- **Defaults inseguros en clientes HTTP async**: muchos clientes HTTP async no verifican certificados TLS por defecto.
- **ReDoS en validaciÃ³n async de input**: la validaciÃ³n regex corriendo en el event loop puede bloquear por segundos con input craftado. Mueve regex a un worker thread o usa e2 que garantiza tiempo lineal
- **Condiciones de carrera en cancelaciÃ³n de tasks**: cancelar una task que realiza una operaciÃ³n no idempotente (ej.   cobrar una tarjeta) puede llevar a cobros dobles si la operaciÃ³n completa antes de que la cancelaciÃ³n propague.
- **Leaks de async context managers**: no usar sync with para recursos (conexiones de BD, sesiones HTTP) leakea conexiones.
- **Bypass de backpressure**: si un productor rÃ¡pido alimenta un consumidor lento sin backpressure, la memoria crece sin lÃ­mite.



## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de concurrency y event-loop para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica patrones async con promises, futures y coroutines** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Preguntas frecuentes

**P: Â¿Es async siempre mÃ¡s rÃ¡pido que sÃ­ncrono?**
R: Solo para cargas de trabajo I/O-bound. Para tareas CPU-bound (procesamiento de imÃ¡genes, machine learning), async no provee beneficio porque la CPU ya estÃ¡ saturada. Usa threads, procesos o workers dedicados para paralelismo CPU.

**P: Â¿CuÃ¡ntos requests concurrentes puede manejar un proceso Node.js?**
R: Miles, limitados por memoria y file descriptors. El event loop maneja una operaciÃ³n a la vez, pero la mayorÃ­a son esperas de I/O. Un servidor Node.js tÃ­pico maneja 5,000-10,000 conexiones concurrentes.

**P: Â¿CuÃ¡l es la diferencia entre concurrencia y paralelismo?**
R: La concurrencia es entrelazar tareas en un solo core (async/await). El paralelismo es ejecutar tareas simultÃ¡neamente en mÃºltiples cores (threads/procesos). Async provee concurrencia; multiprocessing provee paralelismo. Usa ambos para mÃ¡ximo throughput.

**P: Â¿DeberÃ­a usar threads o async en Python?**
R: Usa `asyncio` para cargas de trabajo I/O-bound con muchas conexiones. Usa `threading` para I/O con bibliotecas bloqueantes que no soportan async. Usa `multiprocessing` para trabajo CPU-bound que debe evadir el GIL. `asyncio` es usualmente la mejor opciÃ³n para servidores web y clientes de API.


### Â¿Esta soluciÃ³n estÃ¡ lista para producciÃ³n?

SÃ­. Los ejemplos de cÃ³digo arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuraciÃ³n a tu entorno especÃ­fico antes de desplegar.

### Â¿CuÃ¡les son las caracterÃ­sticas de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, aÃ±ade caching, batching y connection pooling segÃºn sea necesario.

### Â¿CÃ³mo depuro problemas con este enfoque?

Empieza con el ejemplo mÃ­nimo de arriba. AÃ±ade logging en cada paso. Prueba con entradas pequeÃ±as primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
- **Manipulacion de prioridad de tasks async**: si un atacante puede influir en el orden de scheduling de tasks (ej.   controlando el timing de creacion de tasks), puede starvar tasks criticos.
- **Side-channel via orden de completitud de tasks**: observar que tasks async completan primero puede revelar estado interno o dependencias de datos.
- **Hijacking de coroutines via event loop compartido**: si multiples modulos comparten un event loop, un modulo comprometido puede interceptar o manipular callbacks de otros modulos.
- **Fuga de informacion en async stack traces**: los objetos de error de operaciones async pueden contener paths internos, query strings de base de datos o API keys en stack traces.
- **Timing attacks en autenticacion async**: compare_digest (Python) o crypto.  timingSafeEqual (Node.
- **Replay attacks en validacion async de tokens**: si la validacion async de tokens cachea resultados para performance, un atacante puede reusar un token valido stale.
- **Async callback hell oscureciendo bugs de seguridad**: callbacks anidados profundamente dificultan auditar code paths security-critical.
- **Event emitter memory leaks como vector de ataque**: event emitters long-lived con listeners acumulados consumen memoria.   Un atacante puede triggerar acumulacion de listeners repitiendo eventos.
- **Bypass de async middleware**: si las cadenas de async middleware no se awaited correctamente, un middleware puede saltarse.
- **Condicion de carrera en rate limiting async**: si el estado de rate limiting se chequea y actualiza en operaciones async separadas, requests concurrentes pueden bypassar el limite.
- **Promise prototype pollution**: si un atacante puede modificar Promise.   Usa Object.  freeze(Promise.
- **Bypass de cleanup async en shutdown forzado**: si un proceso se mata con SIGKILL, los handlers de cleanup async no se ejecutan.
- **Agotamiento de pool de recursos async compartido**: si multiples consumidores async comparten un pool de conexiones sin limites, un pico en un consumidor puede starvar a otros.
- **Async logger bloqueante**: si el logging es sincrono dentro de un handler async, bloquea el event loop.
- **Cancelacion de coroutine ignorando locks**: si una coroutine se cancela mientras mantiene un lock, el lock puede no liberarse.
- **Async deserialization bombs**: parsear payloads JSON grandes con wait response.  json() puede consumir memoria antes de que la validacion se ejecute.
- **Event loop starvation via microtask flooding**: Promise.  resolve().  then() recursivo), starva otros requests.

## Troubleshooting

- **Race conditions appear under load**: protect shared state with locks, atomics, or message passing.   Reproduce with targeted stress tests.
- **Deadlock between workers**: establish a consistent lock acquisition order and keep critical sections short.
- **Thread pool saturation**: Increase pool size only if CPU and memory allow.
- **Actor mailbox grows unbounded**: apply backpressure, bounded queues, and load shedding.
- **Async task never completes**: check for unhandled promise rejections, forgotten awaits, and infinite loops in cooperative scheduling.

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos que deberían ser configurables por entorno.
- Olvidar agregar logging y monitoreo en cada paso.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar caché o procesamiento por lotes.
- No documentar la versión y configuración usadas en producción.
- Dejar la receta sin cambios cuando evolucionan las dependencias o la escala.
