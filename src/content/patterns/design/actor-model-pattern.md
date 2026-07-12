---



contentType: patterns
slug: actor-model-pattern
title: "Actor Model Pattern"
description: "Isolate state in actors that communicate only via messages. Each actor processes one message at a time, eliminating shared-state concurrency bugs by design."
metaDescription: "Isolate state in actors that communicate via messages. Each actor processes one message at a time, eliminating shared-state concurrency bugs by design."
difficulty: advanced
topics:
  - concurrency
  - architecture
tags:
  - actor-model
  - pattern
  - design-pattern
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
  metaDescription: "Isolate state in actors that communicate via messages. Each actor processes one message at a time, eliminating shared-state concurrency bugs by design."
  keywords:
    - actor model pattern
    - message passing concurrency
    - isolated state actors
    - pattern design



---

## Overview

Shared mutable state is the root of most concurrency bugs. Locks, mutexes, and condition variables are error-prone: forget one lock and you get race conditions; lock in the wrong order and you get deadlocks. The Actor Model takes a different approach. Each actor owns its private state. Actors communicate exclusively by sending messages to each other. Each actor processes one message at a time, so there is no concurrent access to its state. No locks needed.

## When to Use


- For alternatives, see [Distributed Lock Pattern](/patterns/distributed-lock-pattern/).

- You have mutable state accessed by multiple threads and locks are error-prone
- You need fault tolerance: if one actor fails, others continue running
- Your system is naturally modeled as independent entities that communicate by messages
- You want location transparency: actors can run on the same machine or across a network

## Solution

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

    # Send messages: no locks needed, actor processes one at a time
    account.send({"type": "deposit", "amount": 100})
    account.send({"type": "deposit", "amount": 50})
    account.send({"type": "withdraw", "amount": 30})
    account.send({"type": "withdraw", "amount": 200})  # Insufficient
    account.send({"type": "stop"})

    await task

asyncio.run(main())
```

### JavaScript (worker threads as actors)

```javascript
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { fileURLToPath } from "url";
import path from "path";

// actor.js — runs in a Worker thread with isolated state
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

  // Send messages: no locks needed, actor processes one at a time
  actor.postMessage({ type: "deposit", amount: 100 });
  actor.postMessage({ type: "deposit", amount: 50 });
  actor.postMessage({ type: "withdraw", amount: 30 });
  actor.postMessage({ type: "withdraw", amount: 200 }); // Insufficient
  actor.postMessage({ type: "stop" });
}
```

### Java (Akka-style actor)

```java
import java.util.concurrent.*;

public class ActorModelExample {

    // Actor base: processes messages from a single-threaded queue
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

    // Bank account actor with private state
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

        // Send messages: no locks needed, actor processes one at a time
        account.tell(new Deposit(100));
        account.tell(new Deposit(50));
        account.tell(new Withdraw(30));
        account.tell(new Withdraw(200)); // Insufficient
        Thread.sleep(100);
        account.tell(new StopSignal());
    }
}
```

## Explanation

An actor is an entity with three properties:
1. **Private state**: Only the actor itself can read or modify its state. No external code touches it.
2. **Mailbox**: A queue of incoming messages. Messages are delivered asynchronously.
3. **Single-threaded processing**: The actor processes one message at a time from its mailbox. This guarantees no concurrent access to its state.

Actors communicate by sending messages to each other's mailboxes. The sender does not wait for the receiver to process the message (fire-and-forget). If a response is needed, the sender includes a reply-to address in the message.

Because each actor processes messages sequentially, there are no race conditions within an actor. Because state is private, there are no shared-state bugs. The tradeoff is that all state access must go through message passing, which adds latency compared to direct method calls.

## Variants

| Variant | Implementation | Use Case | Tradeoff |
|---------|----------------|----------|----------|
| **Akka** | JVM (Scala/Java) | Enterprise, distributed systems | Heavy framework, JVM-only |
| **Erlang/OTP** | BEAM VM | Telecom, high-availability | Erlang language |
| **asyncio actors** | Python asyncio | Single-process concurrency | Single-threaded, no true parallelism |
| **Worker threads** | Node.js | CPU-bound isolation | Limited message types |
| **Proto Actor** | Go, .NET | Cross-platform actors | Smaller ecosystem |

## What Works

- Keep actors small and focused: one responsibility per actor
- Make messages immutable: prevent the sender from modifying a message after sending
- Use supervisor actors to monitor and restart failed actors (Erlang's "let it crash" philosophy)
- Design messages as typed records or classes for clarity
- Avoid blocking operations inside an actor: if you need to call a slow API, spawn a temporary worker
- Monitor mailbox depth: a growing mailbox means the actor cannot keep up
- Use actor hierarchies: supervisors manage child actors and handle their failures

## Common Mistakes

- **Sharing mutable state outside the actor**: If external code modifies the actor's state, the isolation guarantee breaks. All state access must go through messages.
- **Blocking inside the actor**: A blocking call (synchronous I/O, long computation) stops the actor from processing other messages. Offload to a worker.
- **Synchronous request-reply**: Actors are designed for async messaging. Forcing synchronous calls creates deadlocks and reduces throughput.
- **Too many fine-grained actors**: Each actor has overhead (mailbox, thread). Too many actors waste memory and context-switching. Group related state into one actor.
- **Not handling failures**: If an actor crashes, its mailbox messages are lost. Use supervisors to restart actors and replay critical messages.
- **Large messages**: Sending large objects between actors (especially across a network) is expensive. Send references or IDs instead.

## FAQ

### How is the actor model different from thread pools?

Thread pools share state across threads and require locks for safety. Actors isolate state per actor and use message passing instead of locks. Thread pools are better for stateless parallel work; actors are better for stateful concurrent entities.

### Can actors run on different machines?

Yes. Actor frameworks like Akka and Erlang/OTP support location transparency. You send a message to an actor address; the framework routes it locally or over the network. The sender does not know or care where the actor runs.

### What happens if an actor crashes?

In Erlang/OTP and Akka, a supervisor actor detects the failure and restarts the child actor. The restarted actor starts with a fresh state. Critical state should be persisted externally (database, event log) before processing, so it can be recovered.

### Is the actor model faster than shared memory?

For low-contention scenarios, shared memory with locks is faster because direct access is cheaper than message passing. For high-contention scenarios, actors can be faster because they avoid lock contention and context-switching from blocked threads.

### Should I use actors for everything?

No. Actors add overhead (message serialization, mailbox management). For simple parallel computation without shared state, thread pools or async/await are simpler and faster. Use actors when you have stateful concurrent entities that need isolation and fault tolerance.
