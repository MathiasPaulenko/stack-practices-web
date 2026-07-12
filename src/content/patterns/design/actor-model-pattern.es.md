---



contentType: patterns
slug: actor-model-pattern
title: "Patrón Actor Model"
description: "Aislar estado en actores que se comunican solo via mensajes. Cada actor procesa un mensaje a la vez, eliminando bugs de concurrencia por estado compartido por diseno."
metaDescription: "Aislar estado en actores que se comunican via mensajes. Cada actor procesa un mensaje a la vez, eliminando bugs de concurrencia por estado compartido."
difficulty: advanced
topics:
  - concurrency
  - architecture
tags:
  - actor-model
  - patron
  - patron-diseno
  - message-passing
  - concurrency
  - isolation
  - erlang
relatedResources:
  - /patterns/thread-pool-pattern
  - /patterns/producer-consumer-pattern
  - /patterns/publish-subscribe-pattern
  - /patterns/lock-free-queue-pattern
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aislar estado en actores que se comunican via mensajes. Cada actor procesa un mensaje a la vez, eliminando bugs de concurrencia por estado compartido."
  keywords:
    - patron actor model
    - message passing concurrencia
    - actores estado aislado
    - patron diseno



---

## Descripción General

El estado mutable compartido es la raiz de la mayoria de los bugs de concurrencia. Locks, mutexes y condition variables son propensos a errores: olvida un lock y obtienes race conditions; bloquea en el orden equivocado y obtienes deadlocks. El Actor Model toma un enfoque diferente. Cada actor posee su estado privado. Los actores se comunican exclusivamente enviando mensajes entre si. Cada actor procesa un mensaje a la vez, por lo que no hay acceso concurrente a su estado. Sin locks.

## Cuándo Usar


- For alternatives, see [Distributed Lock Pattern](/es/patterns/distributed-lock-pattern/).

- Tienes estado mutable accedido por multiples threads y los locks son propensos a errores
- Necesitas tolerancia a fallos: si un actor falla, otros continuan ejecutando
- Tu sistema se modela naturalmente como entidades independientes que se comunican por mensajes
- Quieres transparencia de ubicacion: los actores pueden ejecutar en la misma maquina o a traves de una red

## Solución

### Python (asyncio + message passing)

```python
import asyncio

class Actor:
    def __init__(self, name):
        self.name = name
        self.inbox = asyncio.Queue()
        self.state = {}

    async def run(self):
        while True:
            message = await self.inbox.get()
            if message.get("type") == "stop":
                print(f"[{self.name}] Stopping")
                break
            await self.handle(message)

    async def handle(self, message):
        msg_type = message.get("type")
        if msg_type == "deposit":
            amount = message["amount"]
            self.state["balance"] = self.state.get("balance", 0) + amount
            print(f"[{self.name}] Balance: {self.state['balance']}")
        elif msg_type == "withdraw":
            amount = message["amount"]
            if self.state.get("balance", 0) >= amount:
                self.state["balance"] -= amount
                print(f"[{self.name}] Withdrew {amount}, balance: {self.state['balance']}")
            else:
                print(f"[{self.name}] Insufficient funds")

    def send(self, message):
        self.inbox.put_nowait(message)


async def main():
    account = Actor("account-1")
    task = asyncio.create_task(account.run())

    # Enviar mensajes: sin locks, el actor procesa uno a la vez
    account.send({"type": "deposit", "amount": 100})
    account.send({"type": "deposit", "amount": 50})
    account.send({"type": "withdraw", "amount": 30})
    account.send({"type": "withdraw", "amount": 200})  # Insufficient
    account.send({"type": "stop"})

    await task

asyncio.run(main())
```

### JavaScript (worker threads como actores)

```javascript
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { fileURLToPath } from "url";
import path from "path";

// actor.js — se ejecuta en un Worker thread con estado aislado
if (!isMainThread) {
  const state = { balance: 0 };

  parentPort.on("message", (message) => {
    if (message.type === "stop") {
      parentPort.close();
      return;
    }

    if (message.type === "deposit") {
      state.balance += message.amount;
      parentPort.postMessage({
        type: "result",
        balance: state.balance,
      });
    } else if (message.type === "withdraw") {
      if (state.balance >= message.amount) {
        state.balance -= message.amount;
        parentPort.postMessage({
          type: "result",
          balance: state.balance,
        });
      } else {
        parentPort.postMessage({
          type: "error",
          message: "Insufficient funds",
        });
      }
    }
  });
}

// main.js
if (isMainThread) {
  const __filename = fileURLToPath(import.meta.url);
  const actor = new Worker(__filename);

  actor.on("message", (msg) => {
    if (msg.type === "result") {
      console.log(`Balance: ${msg.balance}`);
    } else if (msg.type === "error") {
      console.log(`Error: ${msg.message}`);
    }
  });

  // Enviar mensajes: sin locks, el actor procesa uno a la vez
  actor.postMessage({ type: "deposit", amount: 100 });
  actor.postMessage({ type: "deposit", amount: 50 });
  actor.postMessage({ type: "withdraw", amount: 30 });
  actor.postMessage({ type: "withdraw", amount: 200 }); // Insufficient
  actor.postMessage({ type: "stop" });
}
```

### Java (estilo Akka)

```java
import java.util.concurrent.*;

public class ActorModelExample {

    // Base Actor: procesa mensajes desde una cola single-threaded
    static abstract class Actor {
        private final BlockingQueue<Object> mailbox = new LinkedBlockingQueue<>();
        private final String name;
        private volatile boolean running = true;

        public Actor(String name) {
            this.name = name;
        }

        public void start() {
            new Thread(() -> {
                while (running) {
                    try {
                        Object message = mailbox.take();
                        if (message instanceof StopSignal) {
                            running = false;
                            break;
                        }
                        onMessage(message);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
                System.out.println("[" + name + "] Stopped");
            }, "actor-" + name).start();
        }

        public void tell(Object message) {
            mailbox.offer(message);
        }

        protected abstract void onMessage(Object message);
    }

    // Actor de cuenta bancaria con estado privado
    static class AccountActor extends Actor {
        private int balance = 0;

        public AccountActor(String name) {
            super(name);
        }

        @Override
        protected void onMessage(Object message) {
            if (message instanceof Deposit dep) {
                balance += dep.amount();
                System.out.println("[account] Balance: " + balance);
            } else if (message instanceof Withdraw w) {
                if (balance >= w.amount()) {
                    balance -= w.amount();
                    System.out.println("[account] Withdrew " + w.amount() + ", balance: " + balance);
                } else {
                    System.out.println("[account] Insufficient funds");
                }
            }
        }
    }

    record Deposit(int amount) {}
    record Withdraw(int amount) {}
    record StopSignal() {}

    public static void main(String[] args) throws Exception {
        AccountActor account = new AccountActor("account-1");
        account.start();

        // Enviar mensajes: sin locks, el actor procesa uno a la vez
        account.tell(new Deposit(100));
        account.tell(new Deposit(50));
        account.tell(new Withdraw(30));
        account.tell(new Withdraw(200)); // Insufficient
        Thread.sleep(100);
        account.tell(new StopSignal());
    }
}
```

## Explicación

Un actor es una entidad con tres propiedades:

1. **Estado privado**: Solo el actor mismo puede leer o modificar su estado. Ningun codigo externo lo toca.
2. **Buzon**: Una cola de mensajes entrantes. Los mensajes se entregan asincronamente.
3. **Procesamiento single-threaded**: El actor procesa un mensaje a la vez desde su buzon. Esto garantiza que no hay acceso concurrente a su estado.

Los actores se comunican enviando mensajes a los buzones de otros. El emisor no espera que el receptor procese el mensaje (fire-and-forget). Si se necesita una respuesta, el emisor incluye una direccion de respuesta en el mensaje.

Como cada actor procesa mensajes secuencialmente, no hay race conditions dentro de un actor. Como el estado es privado, no hay bugs de estado compartido. La contrapartida es que todo acceso al estado debe ir a traves de paso de mensajes, lo que anade latencia comparado con llamadas a metodos directas.

## Variantes

| Variante | Implementacion | Caso de Uso | Compromiso |
|----------|----------------|-------------|------------|
| **Akka** | JVM (Scala/Java) | Enterprise, sistemas distribuidos | Framework pesado, solo JVM |
| **Erlang/OTP** | BEAM VM | Telecom, alta disponibilidad | Lenguaje Erlang |
| **asyncio actors** | Python asyncio | Concurrencia single-process | Single-threaded, sin paralelismo real |
| **Worker threads** | Node.js | Aislamiento CPU-bound | Tipos de mensaje limitados |
| **Proto Actor** | Go, .NET | Actores cross-platform | Ecosistema mas pequeño |

## Qué Funciona

- Manten los actores pequeños y enfocados: una responsabilidad por actor
- Haz los mensajes inmutables: previene que el emisor modifique un mensaje despues de enviarlo
- Usa actores supervisores para monitorear y reiniciar actores fallidos (filosofia "let it crash" de Erlang)
- Disena mensajes como records o clases tipadas para claridad
- Evita operaciones bloqueantes dentro de un actor: si necesitas llamar una API lenta, spawn un worker temporal
- Monitorea la profundidad del buzon: un buzon creciente significa que el actor no da abasto
- Usa jerarquias de actores: los supervisores gestionan actores hijos y manejan sus fallos

## Errores Comunes

- **Compartir estado mutable fuera del actor**: Si codigo externo modifica el estado del actor, la garantia de aislamiento se rompe. Todo acceso al estado debe ir por mensajes.
- **Bloquear dentro del actor**: Una llamada bloqueante (I/O sincrono, computacion larga) detiene al actor de procesar otros mensajes. Descarga a un worker.
- **Request-reply sincrono**: Los actores estan disenados para mensajeria async. Forzar llamadas sincronas crea deadlocks y reduce throughput.
- **Demasiados actores de grano fino**: Cada actor tiene overhead (buzon, thread). Demasiados actores desperdician memoria y context-switching. Agrupa estado relacionado en un actor.
- **No manejar fallos**: Si un actor crasheaa, los mensajes de su buzon se pierden. Usa supervisores para reiniciar actores y reproducir mensajes criticos.
- **Mensajes grandes**: Enviar objetos grandes entre actores (especialmente a traves de red) es costoso. Envia referencias o IDs.

## Preguntas Frecuentes

### ¿En qué se diferencia el actor model de los thread pools?

Los thread pools comparten estado entre threads y requieren locks para seguridad. Los actores aislan estado por actor y usan paso de mensajes en lugar de locks. Los thread pools son mejores para trabajo paralelo sin estado; los actores son mejores para entidades concurrentes con estado.

### ¿Los actores pueden ejecutar en diferentes máquinas?

Si. Frameworks de actores como Akka y Erlang/OTP soportan transparencia de ubicacion. Envias un mensaje a una direccion de actor; el framework lo rutea localmente o por la red. El emisor no sabe ni le importa donde se ejecuta el actor.

### ¿Qué pasa si un actor crashea?

En Erlang/OTP y Akka, un actor supervisor detecta el fallo y reinicia al actor hijo. El actor reiniciado arranca con estado fresco. El estado critico debe persistirse externamente (base de datos, event log) antes del procesamiento, para poder recuperarlo.

### ¿El actor model es más rápido que memoria compartida?

Para escenarios de baja contencion, memoria compartida con locks es mas rapido porque el acceso directo es mas barato que el paso de mensajes. Para escenarios de alta contencion, los actores pueden ser mas rapidos porque evitan contencion de locks y context-switching de threads bloqueados.

### ¿Debería usar actores para todo?

No. Los actores anaden overhead (serializacion de mensajes, gestion de buzones). Para computacion paralela simple sin estado compartido, thread pools o async/await son mas simples y rapidos. Usa actores cuando tienes entidades concurrentes con estado que necesitan aislamiento y tolerancia a fallos.
