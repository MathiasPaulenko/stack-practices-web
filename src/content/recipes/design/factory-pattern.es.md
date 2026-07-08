---
contentType: recipes
slug: factory-pattern-recipe
title: "Crear Objetos Flexiblemente con el Factory Pattern"
description: "Cómo usar factory methods, abstract factories y containers de inyección de dependencias para desacoplar creación de objetos de su uso y mejorar testeabilidad."
metaDescription: "Aprende factory pattern para creación flexible. Usa factory methods, abstract factories y DI containers para desacoplar creación de objetos."
difficulty: beginner
topics:
  - design
tags:
  - design
  - factory-pattern
  - creational-patterns
  - design-patterns
  - patterns
relatedResources:
  - /recipes/hexagonal-architecture
  - /recipes/domain-driven-design
  - /recipes/unit-testing-mocking
  - /recipes/api-gateway
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende factory pattern para creación flexible. Usa factory methods, abstract factories y DI containers para desacoplar creación de objetos."
  keywords:
    - factory pattern
    - factory method
    - abstract factory
    - creacion objetos
    - inyeccion dependencias
---

## Visión general

Crear objetos directamente con `new` es el enfoque más simple: `new DatabaseConnection("postgres://...")`. También es el más rígido. El llamador conoce la clase exacta, la firma del constructor y las dependencias requeridas. Si el driver de base de datos cambia, cada sitio de llamada debe actualizarse. Si la conexión necesita un pool en lugar de una conexión directa, cada declaración `new` se rompe. Si quieres testear el llamador con una base de datos mock, no puedes — la palabra `new` hardcodea la clase concreta.

El factory pattern mueve la creación de objetos a un método o clase dedicado. El llamador solicita un objeto de la factory, no de un constructor. La factory decide qué clase concreta instanciar, cómo conectar dependencias y qué configuraciones por defecto aplicar. El llamador depende de una abstracción (interfaz o clase abstracta), no de una implementación concreta. Lo siguiente cubre factory methods, abstract factories y ejemplos prácticos en TypeScript, Java y Python.

## Cuándo usarlo

Usa esta receta cuando:

- La clase exacta del objeto se determina en runtime basado en configuración o input
- La creación de objetos involucra lógica de inicialización compleja (connection pools, caches, event listeners). Consulta [Singleton Pattern](/recipes/singleton-pattern-recipe) para gestionar instancias compartidas.
- El testing requiere sustituir implementaciones reales con mocks o stubs. Consulta [Input Validation](/recipes/api/input-validation) para testing de límites.
- Crear objetos directamente viola inversión de dependencias (módulos de alto nivel dependen de detalles de bajo nivel). Consulta [Arquitectura Hexagonal](/recipes/design/hexagonal-architecture) para inversión de dependencias.
- Construyendo frameworks o bibliotecas donde usuarios proveen sus propias implementaciones

## Solución

### Factory Method (TypeScript)

```typescript
interface Notifier {
  send(message: string, recipient: string): Promise<void>;
}

class EmailNotifier implements Notifier {
  constructor(private smtpHost: string, private from: string) {}
  async send(message: string, recipient: string): Promise<void> {
    console.log(`Email to ${recipient}: ${message}`);
  }
}

class SmsNotifier implements Notifier {
  constructor(private twilioSid: string) {}
  async send(message: string, recipient: string): Promise<void> {
    console.log(`SMS to ${recipient}: ${message}`);
  }
}

abstract class NotificationFactory {
  abstract createNotifier(): Notifier;

  async notifyUser(message: string, recipient: string): Promise<void> {
    const notifier = this.createNotifier();
    await notifier.send(message, recipient);
  }
}

class EmailNotificationFactory extends NotificationFactory {
  createNotifier(): Notifier {
    return new EmailNotifier(process.env.SMTP_HOST!, 'noreply@example.com');
  }
}

class SmsNotificationFactory extends NotificationFactory {
  createNotifier(): Notifier {
    return new SmsNotifier(process.env.TWILIO_SID!);
  }
}

const factory: NotificationFactory = process.env.NOTIFY_BY === 'sms'
  ? new SmsNotificationFactory()
  : new EmailNotificationFactory();

await factory.notifyUser('Your order has shipped!', 'user@example.com');
```

### Abstract Factory (Java)

```java
interface Button { void render(); }
interface Checkbox { void check(); }

class WindowsButton implements Button {
  public void render() { System.out.println("Rendering Windows button"); }
}

class MacButton implements Button {
  public void render() { System.out.println("Rendering Mac button"); }
}

interface UIFactory {
  Button createButton();
  Checkbox createCheckbox();
}

class WindowsUIFactory implements UIFactory {
  public Button createButton() { return new WindowsButton(); }
  public Checkbox createCheckbox() { return new WindowsCheckbox(); }
}

class MacUIFactory implements UIFactory {
  public Button createButton() { return new MacButton(); }
  public Checkbox createCheckbox() { return new MacCheckbox(); }
}

class Application {
  private final Button button;
  Application(UIFactory factory) {
    this.button = factory.createButton();
  }
  void renderUI() { button.render(); }
}

UIFactory factory = System.getProperty("os.name").contains("Windows")
  ? new WindowsUIFactory()
  : new MacUIFactory();
new Application(factory).renderUI();
```

### Simple Factory (Python)

```python
from typing import Protocol

class PaymentProcessor(Protocol):
  def charge(self, amount: float, currency: str) -> dict: ...

class StripeProcessor:
  def __init__(self, api_key: str):
    self.api_key = api_key
  def charge(self, amount: float, currency: str) -> dict:
    return {"provider": "stripe", "status": "success", "amount": amount}

class PayPalProcessor:
  def __init__(self, client_id: str, secret: str):
    self.client_id = client_id
    self.secret = secret
  def charge(self, amount: float, currency: str) -> dict:
    return {"provider": "paypal", "status": "success", "amount": amount}

class PaymentProcessorFactory:
  def create(self, provider: str) -> PaymentProcessor:
    if provider == "stripe":
      return StripeProcessor(api_key="sk_test_xxx")
    elif provider == "paypal":
      return PayPalProcessor(client_id="xxx", secret="yyy")
    else:
      raise ValueError(f"Unknown provider: {provider}")

factory = PaymentProcessorFactory()
processor = factory.create("stripe")
result = processor.charge(99.99, "USD")
```

## Explicación

- **Factory method**: un método en una clase que las subclasses overridean para instanciar objetos. La clase base define el algoritmo (`notifyUser`); la subclass decide qué notifier concreto crear. La clase base depende de la interfaz `Notifier`, no de `EmailNotifier` o `SmsNotifier`.
- **Abstract factory**: una familia de factories relacionadas. `WindowsUIFactory` crea un `WindowsButton` y `WindowsCheckbox` que comparten un tema visual. Cambiar temas significa cambiar factories, no instanciaciones individuales de objetos. Esto asegura consistencia entre productos relacionados.
- **Simple factory**: una sola función o clase que crea objetos basado en un parámetro. No es un patrón GoF pero se usa comúnmente en la práctica. Centraliza lógica de creación pero no invierte la dependencia tan fuertemente como factory method o abstract factory.

## Variantes

| Patrón | Nivel de abstracción | Mejor para | Complejidad |
|--------|---------------------|------------|-------------|
| Simple factory | Bajo | Creator único con tipo en runtime | Baja |
| Factory method | Medio | Template method con creación customizable | Media |
| Abstract factory | Alto | Familias de objetos relacionados | Media-Alta |
| Builder | Alto | Objetos complejos con muchos parámetros opcionales | Media |
| DI container | Máximo | Aplicaciones enterprise con grafos profundos de dependencias | Alta |

## Lo que funciona

- **Retorna abstracciones, no concreciones**: un factory method debería retornar `Notifier`, no `EmailNotifier`. Esto permite a los llamadores tratar todos los productos uniformemente y habilita sustitución. Si el tipo de retorno es concreto, la factory no provee desacoplamiento.
- **Mantén las factories stateless**: una factory no debería mantener estado de aplicación. Crea y retorna objetos — nada más. Las factories con estado son difíciles de testear y oscurecen lifetimes de objetos. Pasa configuración como parámetros.
- **Usa DI containers para grafos complejos**: cuando un servicio requiere un repository, que requiere un connection pool, que requiere un config loader, el wiring manual de factory se vuelve tedioso. Usa un DI container para declarativamente bind interfaces a implementaciones y resolver dependencias transitivas.
- **No sobre-uses para objetos triviales**: una factory para un objeto `Date` o un `Point` con dos coordenadas es sobre-ingeniería. Usa `new` para simples value objects. Reserva factories para objetos con dependencias, configuración o polimorfismo en runtime.

## Errores comunes

- **God factory**: una sola factory que crea cada objeto en la aplicación. Crece a cientos de líneas y viola el principio de responsabilidad única. Separa factories por dominio o capa — `NotificationFactory`, `PaymentFactory`, `RepositoryFactory`.
- **Factory que hace lógica de negocio**: una factory debería crear objetos, no validar reglas de negocio, trigger side effects u orquestar workflows. Si tu factory chequea si el usuario tiene permiso antes de crear un notifier, esa lógica pertenece a un service, no a la factory.
- **Ignorar lifecycle de disposición**: las factories crean objetos pero frecuentemente no manejan su destrucción. Si la factory mantiene referencias a objetos creados, se convierte en memory leak. Usa scopes de dependencia (singleton, request, transient) y asegura cleanup al shutdown.
- **Hardcodear configuración en factories**: `new DatabaseConnection("postgres://localhost")` embebe config en código. Inyecta configuración en la factory para que el mismo código de factory funcione en development, staging y production sin modificación.

## Preguntas frecuentes

**P: ¿Cuándo debería usar una factory vs un DI container?**
R: Usa una factory para creación localizada de objetos dentro de un módulo. Usa un DI container para grafos de dependencias a nivel de aplicación. La mayoría de frameworks modernos combinan ambos: el container usa factory providers para crear objetos.

**P: ¿Es el factory pattern todavía relevante con frameworks de DI?**
R: Sí. Los frameworks de DI usan [factories](/recipes/factory-pattern-recipe) internamente. Todavía escribes factory methods cuando la creación de objetos requiere lógica custom (ej. elegir un database shard basado en el user ID). DI maneja el wiring; las factories manejan las decisiones de creación.

**P: ¿Cómo testeo código que usa factories?**
R: Mock la factory misma. Si `OrderService` depende de `PaymentProcessorFactory`, inyecta una factory mock que retorna un stub processor. Alternativamente, usa DI para inyectar el processor directamente, bypassando la factory en tests.

**P: ¿Puedo combinar factory con builder?**
R: Sí, y es común. Una factory decide qué clase instanciar; un builder configura la instancia después de la creación. `factory.create("email").withTimeout(30).withRetries(3)`.


### DI Container con Factory Providers (TypeScript)

```typescript
interface Container {
  bind<T>(token: string, factory: () => T): void;
  resolve<T>(token: string): T;
}

class SimpleContainer implements Container {
  private bindings: Map<string, () => unknown> = new Map();
  private instances: Map<string, unknown> = new Map();

  bind<T>(token: string, factory: () => T): void {
    this.bindings.set(token, factory);
  }

  resolve<T>(token: string): T {
    if (this.instances.has(token)) {
      return this.instances.get(token) as T;
    }
    const factory = this.bindings.get(token);
    if (!factory) throw new Error(`No binding for ${token}`);
    const instance = factory() as T;
    this.instances.set(token, instance);
    return instance;
  }
}

// Configuración
const container = new SimpleContainer();

container.bind('Logger', () => new ConsoleLogger());
container.bind('Database', () => new PostgresConnection(process.env.DATABASE_URL));
container.bind('UserRepository', () => {
  const db = container.resolve<PostgresConnection>('Database');
  const logger = container.resolve<ConsoleLogger>('Logger');
  return new UserRepository(db, logger);
});
container.bind('UserService', () => {
  const repo = container.resolve<UserRepository>('UserRepository');
  return new UserService(repo);
});

// Uso — resuelve dependencias en cualquier lugar
const userService = container.resolve<UserService>('UserService');
await userService.createUser({ email: 'user@example.com', name: 'Alice' });
```

### Factory con Builder Pattern (TypeScript)

```typescript
class NotificationBuilder {
  private channel: 'email' | 'sms' | 'push' = 'email';
  private timeout: number = 30;
  private retries: number = 3;
  private priority: 'low' | 'normal' | 'high' = 'normal';

  withChannel(channel: 'email' | 'sms' | 'push'): this {
    this.channel = channel;
    return this;
  }

  withTimeout(seconds: number): this {
    this.timeout = seconds;
    return this;
  }

  withRetries(count: number): this {
    this.retries = count;
    return this;
  }

  withPriority(priority: 'low' | 'normal' | 'high'): this {
    this.priority = priority;
    return this;
  }

  build(): Notifier {
    const base = this.channel === 'email'
      ? new EmailNotifier(process.env.SMTP_HOST!, 'noreply@example.com')
      : this.channel === 'sms'
      ? new SmsNotifier(process.env.TWILIO_SID!)
      : new PushNotifier(process.env.FCM_KEY!);

    return new ResilientNotifier(base, this.timeout, this.retries, this.priority);
  }
}

// Uso — factory decide la clase, builder la configura
const notifier = new NotificationBuilder()
  .withChannel('sms')
  .withTimeout(10)
  .withRetries(5)
  .withPriority('high')
  .build();

await notifier.send('Server down!', 'admin@example.com');
```

### Async Factory con Connection Pooling (Python)

```python
import asyncio
from typing import Optional

class DatabaseConnectionFactory:
    _pool: Optional[asyncpg.Pool] = None
    _lock = asyncio.Lock()

    @classmethod
    async def create(cls, config: dict) -> 'DatabaseConnection':
        if cls._pool is None:
            async with cls._lock:
                if cls._pool is None:
                    cls._pool = await asyncpg.create_pool(
                        dsn=config['url'],
                        min_size=config.get('min_pool', 5),
                        max_size=config.get('max_pool', 20),
                        command_timeout=config.get('timeout', 30),
                    )
        return DatabaseConnection(await cls._pool.acquire())

    @classmethod
    async def close(cls) -> None:
        if cls._pool:
            await cls._pool.close()
            cls._pool = None

class DatabaseConnection:
    def __init__(self, conn):
        self._conn = conn

    async def query(self, sql: str, *args) -> list:
        return await self._conn.fetch(sql, *args)

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self._conn.close()

# Uso — async factory con connection pooling
async def main():
    config = {'url': 'postgresql://localhost/mydb', 'max_pool': 10}
    async with await DatabaseConnectionFactory.create(config) as db:
        users = await db.query('SELECT * FROM users WHERE active = $1', True)
    await DatabaseConnectionFactory.close()
```

## Mejores Prácticas Adicionales

1. **Usa factory functions para casos simples.** No toda factory necesita una clase. Una función es más simple y suficiente:

```typescript
function createNotifier(config: NotificationConfig): Notifier {
  switch (config.channel) {
    case 'email': return new EmailNotifier(config.smtpHost, config.from);
    case 'sms': return new SmsNotifier(config.twilioSid);
    case 'push': return new PushNotifier(config.fcmKey);
    default: throw new Error(`Unknown channel: ${config.channel}`);
  }
}
```

2. **Registra factories por token.** Usa string tokens o symbols para bindings de DI para evitar importar clases concretas:

```typescript
const TOKENS = {
  Logger: Symbol('Logger'),
  Database: Symbol('Database'),
  UserRepository: Symbol('UserRepository'),
} as const;

container.bind(TOKENS.Logger, () => new ConsoleLogger());
container.bind(TOKENS.Database, () => new PostgresConnection(process.env.DATABASE_URL));

// El consumidor resuelve por token — sin import de PostgresConnection
const db = container.resolve<DatabaseConnection>(TOKENS.Database);
```

3. **Usa factory pools para objetos costosos.** Si la creación de objetos es costosa (conexiones de base de datos, HTTP clients), haz pooling:

```typescript
class HttpClientPool {
  private pool: HttpClient[] = [];
  private inUse: Set<HttpClient> = new Set();

  acquire(): HttpClient {
    const available = this.pool.find(c => !this.inUse.has(c));
    if (available) {
      this.inUse.add(available);
      return available;
    }
    const client = new HttpClient({ timeout: 5000 });
    this.pool.push(client);
    this.inUse.add(client);
    return client;
  }

  release(client: HttpClient): void {
    this.inUse.delete(client);
  }
}
```

## Errores Comunes Adicionales

1. **Factory que retorna la interfaz equivocada.** Si la factory retorna una clase concreta, los llamadores quedan acoplados a ella:

```typescript
// Mal: retorna clase concreta
class UserRepoFactory {
  create(): PostgresUserRepository {
    return new PostgresUserRepository(db);
  }
}

// Bien: retorna interfaz
class UserRepoFactory {
  create(): UserRepository {
    return new PostgresUserRepository(db);
  }
}
```

2. **Factory singleton con estado mutable.** Una factory que cachea instancias y también guarda datos por-request es una race condition esperando a pasar:

```typescript
// Mal: estado mutable en factory
class OrderFactory {
  private currentOrder: Order | null = null;

  create(orderId: string): Order {
    this.currentOrder = new Order(orderId); // compartido entre requests!
    return this.currentOrder;
  }
}

// Bien: sin estado mutable compartido
class OrderFactory {
  create(orderId: string): Order {
    return new Order(orderId);
  }
}
```

3. **No disponer recursos creados por factory.** Si la factory crea objetos que持有 recursos (conexiones, file handles), el llamador debe disponerlos:

```typescript
class ConnectionFactory {
  create(): DatabaseConnection {
    return new DatabaseConnection(process.env.DATABASE_URL);
  }
}

// El llamador debe cerrar
const conn = factory.create();
try {
  await conn.query('SELECT 1');
} finally {
  await conn.close();
}
```

## FAQ Adicional

### ¿Cómo manejo dependencias circulares con factories?

Usa inicialización perezosa o property injection en lugar de constructor injection. Resuelve una dependencia después de la construcción:

```typescript
class OrderService {
  private _paymentService?: PaymentService;

  constructor(private container: Container) {}

  get paymentService(): PaymentService {
    if (!this._paymentService) {
      this._paymentService = this.container.resolve<PaymentService>('PaymentService');
    }
    return this._paymentService;
  }
}
```

### ¿Esta solución está lista para producción?

Sí. Los patrones de factory method, abstract factory y DI container son todos probados en producción. El ejemplo de DI container refleja los patrones de InversifyJS y tsyringe. La async factory con connection pooling es estándar en aplicaciones Python async usando asyncpg o aiomysql. La combinación factory + builder es común en sistemas de notificación y mensajería.

### ¿Cuáles son las características de rendimiento?

Las llamadas a factory method añaden una llamada a función de overhead — despreciable. La resolución de DI container es O(1) para singletons cacheados, O(n) para dependencias transitivas en la primera resolución. La async factory con connection pooling amortiza el costo de conexión entre requests. Pool acquire/release es O(n) para pools pequeños (típicamente 5-20 conexiones). Para sistemas de alto throughput, pre-calienta el pool al arranque.

### ¿Cómo depuro problemas con este enfoque?

Loggea cada creación de factory con el token y tipo resuelto. Para DI containers, loggea el grafo de dependencias al arranque para detectar dependencias circulares. Para async factories, loggea stats del pool (active, idle, waiting) en un intervalo. Usa el método `resolve` del container en un REPL para inspeccionar qué bindings están configurados.
