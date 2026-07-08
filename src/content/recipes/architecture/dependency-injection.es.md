---
contentType: recipes
slug: dependency-injection
title: "Inyección de Dependencias"
description: "Implementa inyección de dependencias para escribir código testeable, desacoplado y mantenible en múltiples lenguajes y frameworks."
metaDescription: "Patrones de inyección de dependencias en TypeScript, Python, Java y C#. Escribe código testeable y desacoplado con contenedores DI e inyección manual."
difficulty: intermediate
topics:
  - architecture
tags:
  - dependency-injection
  - architecture
  - typescript
  - java
  - python
relatedResources:
  - /patterns/mvc-pattern
  - /patterns/repository-pattern
  - /patterns/dependency-injection-pattern
  - /docs/adr-template
  - /docs/database-schema-documentation-template
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Patrones de inyección de dependencias en TypeScript, Python, Java y C#. Escribe código testeable y desacoplado con contenedores DI e inyección manual."
  keywords:
    - dependency-injection
    - architecture
    - typescript
    - java
    - python
---
## Visión General

La Inyección de Dependencias (DI) es un patrón de diseño donde los objetos reciben sus dependencias desde fuentes externas en lugar de crearlas internamente. Desacopla componentes, hace el código testeable sin mocks y permite composición flexible de servicios.

## Cuándo Usar

Usa este recurso cuando:
- Escribas tests unitarios que requieren sustituir servicios reales por dobles de prueba
- Construyas aplicaciones modulares donde los componentes no deberían conocer implementaciones concretas
- Manejes grafos de objetos complejos con dependencias transitivas
- Implementes arquitecturas de plugins o [patrones de estrategia](/patterns/design/strategy-pattern)

## Solución

### Inyección por Constructor (TypeScript)

```typescript
interface EmailService {
  send(to: string, subject: string, body: string): Promise<void>;
}

class UserService {
  constructor(
    private emailService: EmailService,
    private userRepository: UserRepository
  ) {}

  async register(email: string, password: string) {
    const user = await this.userRepository.create({ email, password });
    await this.emailService.send(email, 'Bienvenido', '¡Gracias por registrarte!');
    return user;
  }
}

// Cableado en producción
const userService = new UserService(
  new SendGridEmailService(),
  new PostgresUserRepository()
);

// Cableado en tests
const userServiceTest = new UserService(
  new FakeEmailService(),
  new InMemoryUserRepository()
);
```

### Inyección por Propiedad (Python)

```python
from typing import Protocol

class Logger(Protocol):
    def log(self, message: str) -> None: ...

class ConsoleLogger:
    def log(self, message: str) -> None:
        print(f"[LOG] {message}")

class OrderProcessor:
    logger: Logger = ConsoleLogger()  # Default

    def process(self, order: dict) -> None:
        self.logger.log(f"Procesando orden {order['id']}")
```

### Contenedor de DI (Java con Spring)

```java
@Service
public class PaymentService {
    private final PaymentGateway gateway;
    private final FraudChecker fraudChecker;

    public PaymentService(PaymentGateway gateway, FraudChecker fraudChecker) {
        this.gateway = gateway;
        this.fraudChecker = fraudChecker;
    }
}
```

## Explicación

La DI invierte el control: en lugar de que los componentes encuentren o creen sus dependencias, el contenedor o el llamador las provee. Esto permite:

1. **Testeabilidad**: Intercambia servicios reales por fakes sin modificar código
2. **Flexibilidad**: Cambia implementaciones sin tocar consumidores
3. **Gestión de ciclo de vida**: Los contenedores pueden manejar singletons, instancias scoped y disposal
4. **Soporte AOP**: Decoradores e interceptores pueden inyectarse transparentemente

## Variantes

| Enfoque | Caso de Uso | Compromiso |
|---------|-------------|------------|
| Constructor | Dependencias obligatorias | Más explícito; mejor para testing |
| Propiedad/Setter | Dependencias opcionales | Puede crear objetos parcialmente inicializados |
| Método | Dependencias por llamada | Verboso; usado para inyección de estrategia |
| Service Locator | Código legacy | Oculta dependencias; más difícil de testear |

## Lo que funciona

- **Prefiere inyección por constructor**: Hace las dependencias explícitas e inmutables
- **Evita service locators**: Ocultan dependencias y dificultan los tests
- **Usa interfaces/protocolos**: Depende de abstracciones, no de tipos concretos. Consulta [Factory Pattern](/patterns/design/factory-pattern) para abstracciones de creación de objetos.
- **Mantén roots de composición superficiales**: Cablea dependencias en el punto de entrada de la aplicación

## Errores Comunes

1. **Explosión de constructores**: Más de 5 parámetros señala una abstracción faltante
2. **Fugas del contenedor**: Pasar el contenedor de DI a los servicios anula el propósito
3. **Acoplamiento al framework**: Usa anotaciones estándar (@Inject) cuando sea posible
4. **Ignorar ciclo de vida**: Servicios scoped resueltos como singletons causan fugas de memoria
5. **Dependencias circulares**: Refactoriza en eventos o un [mediador](/patterns/design/mediator-pattern) si A depende de B y B de A

## Preguntas Frecuentes

**P: ¿La DI solo es para lenguajes orientados a objetos?**
R: No. Los lenguajes funcionales logran el mismo desacoplamiento mediante funciones de orden superior y aplicación parcial.

**P: ¿Cuándo usar un contenedor de DI vs. cableado manual?**
R: Cableado manual para apps simples (<50 servicios). Contenedores para grafos complejos, gestión de ciclo de vida o AOP.

**P: ¿La DI afecta la performance?**
R: Sobrecarga insignificante en runtime. Resuelve dependencias al inicio (root de composición), no por request.

### Contenedor de DI Ligero (TypeScript)

```typescript
type Factory<T> = () => T;

class DIContainer {
  private factories: Map<string, Factory<any>> = new Map();
  private singletons: Map<string, any> = new Map();
  private scoped: Map<string, any> = new Map();

  registerTransient<T>(key: string, factory: Factory<T>): void {
    this.factories.set(key, factory);
  }

  registerSingleton<T>(key: string, factory: Factory<T>): void {
    this.factories.set(key, () => {
      if (!this.singletons.has(key)) {
        this.singletons.set(key, factory());
      }
      return this.singletons.get(key);
    });
  }

  registerScoped<T>(key: string, factory: Factory<T>): void {
    this.factories.set(key, () => {
      if (!this.scoped.has(key)) {
        this.scoped.set(key, factory());
      }
      return this.scoped.get(key);
    });
  }

  resolve<T>(key: string): T {
    const factory = this.factories.get(key);
    if (!factory) {
      throw new Error(`No service registered for key: ${key}`);
    }
    return factory();
  }

  beginScope(): void {
    this.scoped.clear();
  }

  endScope(): void {
    this.scoped.clear();
  }
}

// Registro en el composition root
const container = new DIContainer();

container.registerSingleton('db', () => new PostgresPool({ connectionString: process.env.DB_URL }));
container.registerSingleton('emailService', () => new SendGridEmailService(process.env.SENDGRID_KEY));
container.registerScoped('userRepository', () => new PostgresUserRepository(container.resolve('db')));
container.registerScoped('userService', () =>
  new UserService(container.resolve('emailService'), container.resolve('userRepository'))
);

// Uso por request
container.beginScope();
const userService = container.resolve<UserService>('userService');
await userService.register('user@example.com', 'password');
container.endScope();
```

### Lifecycle Scoped con Context Managers (Python)

```python
from contextlib import contextmanager
from typing import TypeVar, Callable, Dict

T = TypeVar('T')

class DIContainer:
    def __init__(self):
        self._factories: Dict[str, Callable] = {}
        self._singletons: Dict[str, object] = {}
        self._scoped: Dict[str, object] = {}

    def register_singleton(self, key: str, factory: Callable[[], T]) -> None:
        self._factories[key] = lambda: self._singletons.setdefault(key, factory())

    def register_scoped(self, key: str, factory: Callable[[], T]) -> None:
        self._factories[key] = lambda: self._scoped.setdefault(key, factory())

    def register_transient(self, key: str, factory: Callable[[], T]) -> None:
        self._factories[key] = factory

    def resolve(self, key: str) -> T:
        if key not in self._factories:
            raise KeyError(f'No service registered for: {key}')
        return self._factories[key]()

    @contextmanager
    def scope(self):
        """Context manager para scoped lifetime."""
        self._scoped.clear()
        try:
            yield self
        finally:
            self._scoped.clear()

# Uso — scoped por request
container = DIContainer()
container.register_singleton('db', lambda: create_engine('postgresql://localhost/app'))
container.register_scoped('session', lambda: Session(container.resolve('db')))
container.register_transient('user_service', lambda: UserService(container.resolve('session')))

with container.scope() as scoped:
    service = scoped.resolve('user_service')
    service.register('user@example.com', 'password')
```

### Patrones de Testing con DI (TypeScript)

```typescript
class TestContainer extends DIContainer {
  constructor() {
    super();
    // Override servicios reales con fakes
    this.registerSingleton('db', () => new InMemoryDatabase());
    this.registerSingleton('emailService', () => new FakeEmailService());
    this.registerScoped('userRepository', () => new InMemoryUserRepository());
    this.registerScoped('userService', () =>
      new UserService(this.resolve('emailService'), this.resolve('userRepository'))
    );
  }
}

describe('UserService', () => {
  let container: TestContainer;
  let userService: UserService;
  let emailService: FakeEmailService;

  beforeEach(() => {
    container = new TestContainer();
    container.beginScope();
    userService = container.resolve('userService');
    emailService = container.resolve('emailService');
  });

  afterEach(() => {
    container.endScope();
  });

  it('sends welcome email on register', async () => {
    await userService.register('user@example.com', 'password');
    expect(emailService.sentEmails).toHaveLength(1);
    expect(emailService.sentEmails[0].to).toBe('user@example.com');
    expect(emailService.sentEmails[0].subject).toBe('Welcome');
  });

  it('persists user to repository', async () => {
    const user = await userService.register('user@example.com', 'password');
    const repo = container.resolve('userRepository') as InMemoryUserRepository;
    expect(repo.users).toHaveLength(1);
    expect(repo.users[0].email).toBe('user@example.com');
  });
});
```

## Mejores Prácticas Adicionales

1. **Usa composición de módulos para apps grandes.** Divide los registros en módulos que pueden componerse en el composition root:

```typescript
interface DIModule {
  register(container: DIContainer): void;
}

class DatabaseModule implements DIModule {
  register(container: DIContainer): void {
    container.registerSingleton('db', () => new PostgresPool(getDbConfig()));
    container.registerScoped('session', () => container.resolve('db').createSession());
    container.registerScoped('userRepo', () => new UserRepository(container.resolve('session')));
  }
}

class EmailModule implements DIModule {
  register(container: DIContainer): void {
    container.registerSingleton('emailService', () => new SendGridEmailService(getEmailConfig()));
  }
}

// Composition root — compón módulos
const container = new DIContainer();
[new DatabaseModule(), new EmailModule()].forEach(m => m.register(container));
```

2. **Dispon recursos correctamente.** Servicios que mantienen recursos (conexiones, file handles) necesitan disposal explícito:

```typescript
interface Disposable {
  dispose(): Promise<void>;
}

class DIContainer {
  private disposables: Disposable[] = [];

  async disposeAll(): Promise<void> {
    await Promise.all(this.disposables.map(d => d.dispose()));
    this.disposables = [];
    this.singletons.clear();
    this.scoped.clear();
  }
}
```

3. **Valida el contenedor al arranque.** Resuelve eagermente todos los registros singleton para detectar errores de cableado antes de la primera request:

```typescript
function validateContainer(container: DIContainer, keys: string[]): void {
  for (const key of keys) {
    try {
      container.resolve(key);
    } catch (e) {
      throw new Error(`Container validation failed for '${key}': ${(e as Error).message}`);
    }
  }
}

validateContainer(container, ['db', 'emailService', 'userService']);
```

## Errores Comunes Adicionales

1. **Dependencias cautivas.** Un singleton que depende de un servicio scoped captura la instancia scoped para siempre. El servicio scoped se convierte en un singleton accidental:

```typescript
// Mal: singleton captura repositorio scoped
container.registerSingleton('reportService', () =>
  new ReportService(container.resolve('userRepository')) // userRepository es scoped!
);

// Bien: haz reportService scoped también, o inyecta una factory
container.registerScoped('reportService', () =>
  new ReportService(container.resolve('userRepository'))
);
```

2. **Registrar tipos concretos en lugar de interfaces.** Cuando registras una clase concreta, los consumidores quedan acoplados a esa implementación. Registra contra una clave de interfaz:

```typescript
// Mal: acoplado a tipo concreto
container.registerTransient('emailService', () => new SendGridEmailService());

// Bien: clave de interfaz, implementación intercambiable
container.registerTransient('EmailService', () => new SendGridEmailService());
// En tests: container.registerTransient('EmailService', () => new FakeEmailService());
```

3. **Resolver dependencias dentro de métodos.** Resolver en runtime en lugar de en tiempo de construcción oculta el grafo de dependencias y dificulta el testing:

```typescript
// Mal: dependencia oculta
class OrderService {
  process(order: Order) {
    const paymentService = container.resolve('paymentService'); // oculta
    return paymentService.charge(order.total);
  }
}

// Bien: dependencia explícita
class OrderService {
  constructor(private paymentService: PaymentService) {}

  process(order: Order) {
    return this.paymentService.charge(order.total);
  }
}
```

## FAQ Adicional

### ¿Cómo manejo dependencias circulares en DI?

Las dependencias circulares (A necesita B, B necesita A) indican un problema de diseño. Rompe el ciclo:
- Extrayendo la lógica compartida en un tercer servicio C del que ambos A y B dependen
- Usando eventos o un patrón mediator para una dirección de la dependencia
- Introduciendo una resolución lazy donde un lado recibe una factory en lugar de la instancia

```typescript
// Romper un ciclo con una factory
container.registerSingleton('serviceA', () => new ServiceA(container.resolve('serviceB')));
container.registerSingleton('serviceB', () => new ServiceB(() => container.resolve('serviceA')));
```

### ¿Esta solución está lista para producción?

Sí. La inyección por constructor es el patrón DI estándar en cada framework moderno (Spring, NestJS, ASP.NET Core, Dagger). El contenedor DI ligero refleja cómo NestJS e InversifyJS funcionan internamente. El lifecycle scoped con context managers es el patrón que SQLAlchemy y FastAPI usan para sesiones request-scoped. Los patrones de testing con un contenedor de test dedicado son estándar en codebases enterprise.

### ¿Cuáles son las características de rendimiento?

La resolución de singleton es un Map lookup después de la primera creación — O(1), sub-microsegundo. La resolución transient llama a la factory cada vez — mide el costo de la factory. La resolución scoped es un Map lookup dentro del scope. La validación del contenedor al arranque añade un costo one-time proporcional al número de registros. Evita resolver por-request en hot paths; resuelve una vez a nivel de controller o handler y pasa las instancias hacia abajo.

### ¿Cómo depuro problemas con este enfoque?

Loggea cada resolución con la clave y el tipo resultante. Para detección de dependencias cautivas, loggea el lifecycle (singleton/scoped/transient) junto con la clave. Para dependencias circulares, la mayoría de los contenedores lanzan un error específico — inspecciona la cadena de dependencias en el mensaje de error. Usa la validación del contenedor al arranque para detectar registros faltantes antes de la primera request. En tests, verifica que el contenedor de test registra todas las claves que el contenedor de producción registra.
