---





contentType: patterns
slug: dependency-injection-pattern
title: "Patrón Dependency Injection"
description: "Suministra dependencias desde fuera en lugar de crearlas internamente. Un patrón arquitectural para código desacoplado y testeable."
metaDescription: "Aprende el Patrón Dependency Injection en Python, Java y JavaScript. Patrón arquitectural para código desacoplado, testeable y mantenible."
difficulty: intermediate
topics:
  - design
tags:
  - dependency-injection
  - desacoplamiento
  - java
  - javascript
  - patron
  - patron-arquitectural
  - python
relatedResources:
  - /patterns/factory-pattern
  - /patterns/singleton-pattern
  - /patterns/strategy-pattern
  - /patterns/context-object-pattern
  - /patterns/manager-pattern
  - /patterns/null-object-pattern
  - /patterns/registry-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende el Patrón Dependency Injection en Python, Java y JavaScript. Patrón arquitectural para código desacoplado, testeable y mantenible."
  keywords:
    - dependency injection
    - patron de diseno
    - patron arquitectural
    - inversion de control
    - contenedor di
    - python di
    - java spring
    - javascript di





---

# Patrón Dependency Injection

## Visión General

El [Patrón Dependency Injection](/patterns/design/dependency-injection-typescript) es un patrón arquitectural donde las dependencias se suministran a una clase desde fuera en lugar de ser creadas internamente. Esto invierte el control: la clase declara lo que necesita, y un mecanismo externo lo provee. El resultado es código débilmente acoplado y altamente testeable.

## Cuándo Usarlo

Usa Dependency Injection cuando:
- Las clases dependen de otras clases y quieres evitar acoplamiento fuerte
- Necesitas sustituir implementaciones para testing (mocks, stubs)
- Quieres configurar comportamiento en tiempo de ejecución o despliegue
- Estás construyendo una arquitectura de plugins o modular
- Quieres seguir el Principio de Inversión de Dependencias (SOLID)

## Solución

### Python

```python
from abc import ABC, abstractmethod

class PaymentProcessor(ABC):
    @abstractmethod
    def charge(self, amount: float) -> bool:
        pass

class StripeProcessor(PaymentProcessor):
    def charge(self, amount: float) -> bool:
        print(f"Cobrando ${amount} via Stripe")
        return True

class PayPalProcessor(PaymentProcessor):
    def charge(self, amount: float) -> bool:
        print(f"Cobrando ${amount} via PayPal")
        return True

class OrderService:
    def __init__(self, processor: PaymentProcessor):
        # Dependencia inyectada via constructor
        self.processor = processor

    def checkout(self, amount: float) -> bool:
        return self.processor.charge(amount)

# Uso: intercambiar implementaciones fácilmente
stripe_service = OrderService(StripeProcessor())
stripe_service.checkout(100.0)

# Testing: inyectar un mock
class MockProcessor(PaymentProcessor):
    def charge(self, amount: float) -> bool:
        return True

test_service = OrderService(MockProcessor())
assert test_service.checkout(1.0)
```

### JavaScript

```javascript
class StripeProcessor {
  charge(amount) {
    console.log(`Cobrando $${amount} via Stripe`);
    return true;
  }
}

class PayPalProcessor {
  charge(amount) {
    console.log(`Cobrando $${amount} via PayPal`);
    return true;
  }
}

class OrderService {
  constructor(processor) {
    this.processor = processor;
  }

  checkout(amount) {
    return this.processor.charge(amount);
  }
}

// Uso
const stripeService = new OrderService(new StripeProcessor());
stripeService.checkout(100.0);

// Testing con mock
class MockProcessor {
  charge(amount) { return true; }
}
const testService = new OrderService(new MockProcessor());
console.assert(testService.checkout(1.0));
```

### Java

```java
public interface PaymentProcessor {
    boolean charge(double amount);
}

public class StripeProcessor implements PaymentProcessor {
    public boolean charge(double amount) {
        System.out.println("Cobrando $" + amount + " via Stripe");
        return true;
    }
}

public class PayPalProcessor implements PaymentProcessor {
    public boolean charge(double amount) {
        System.out.println("Cobrando $" + amount + " via PayPal");
        return true;
    }
}

public class OrderService {
    private final PaymentProcessor processor;

    // Inyección por constructor
    public OrderService(PaymentProcessor processor) {
        this.processor = processor;
    }

    public boolean checkout(double amount) {
        return processor.charge(amount);
    }
}

// Uso
OrderService stripeService = new OrderService(new StripeProcessor());
stripeService.checkout(100.0);
```

## Explicación

Dependency Injection tiene tres formas comunes:

- **Inyección por Constructor** — dependencias pasadas via constructor (más común, asegura que el objeto siempre esté completamente inicializado)
- **Inyección por Setter** — dependencias establecidas via setters después de la construcción (flexible, pero el objeto puede estar en estado incompleto)
- **Inyección por Interfaz** — dependencias proporcionadas a través de un método de interfaz (menos común, usada en frameworks)

La idea central es **Inversión de Control**: en lugar de que una clase cree sus propias dependencias, se suministran externamente.

## Variantes

| Variante | Descripción | Ideal Para |
|----------|-------------|------------|
| **Inyección por Constructor** | Dependencias pasadas al crear | Dependencias obligatorias; servicios inmutables |
| **Inyección por Setter** | Dependencias establecidas después | Dependencias opcionales; reconfiguración en tiempo de ejecución |
| **Inyección por Interfaz** | Dependencias via método de interfaz | Ciclo de vida gestionado por framework |
| **Service Locator** | Clase pide dependencias a un registro | Sistemas legacy; evitar en código nuevo |
| **[Contenedor DI](/patterns/design/dependency-injection-typescript)** | Framework resuelve e inyecta automáticamente | Aplicaciones grandes (Spring, Angular, .NET Core) |

## Lo que Funciona

- **Prefiere inyección por constructor** para dependencias requeridas; hace explícitas las necesidades de la clase
- **Usa interfaces o abstracciones** como tipos de dependencia, no clases concretas
- **Evita service locators** cuando sea posible; ocultan dependencias y dificultan testing
- **Mantén la configuración DI separada** de la lógica de negocio (usa módulos, archivos de config o anotaciones)
- **Respeta la Ley de Demeter** — no inyectes el contenedor mismo, solo las dependencias específicas necesarias

## Errores Comunes

- Inyectar el contenedor DI en sí mismo en lugar de dependencias específicas, creando un anti-patrón service locator
- Usar inyección por setter para dependencias requeridas, permitiendo que objetos existan en estado incompleto
- Sobre-ingeniería con un contenedor DI para proyectos pequeños donde el cableado manual es más simple
- Permitir dependencias circulares entre servicios inyectados, causando fallos de inicialización
- Olvidar registrar todas las dependencias en el contenedor, llevando a errores de resolución en tiempo de ejecución

## Preguntas Frecuentes

**P: ¿Es DI lo mismo que Inversión de Control?**
R: DI es una forma específica de IoC. IoC es el principio más amplio de delegar control a código externo. DI logra IoC inyectando dependencias desde fuera.

**P: ¿Necesito un framework de DI?**
R: No. Para proyectos pequeños, la inyección manual por constructor es suficiente. Consulta [DI Container en TypeScript](/patterns/design/dependency-injection-typescript) para una implementación liviana. Los frameworks de DI como Spring, Angular injector o InversifyJS brillan en aplicaciones grandes con muchos servicios interdependientes.

**P: ¿Cómo ayuda DI con el testing?**
R: Al depender de abstracciones (interfaces), puedes inyectar implementaciones mock o stub durante las pruebas. Consulta [unit testing](/recipes/testing/unit-testing) para patrones de testing. Esto aísla la clase bajo prueba de sus colaboradores reales.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.


## Temas Avanzados

### Escenario: DI para Servicio de Notificaciones

```typescript
// DI pattern: inyectar dependencias en lugar de crearlas
// Sin DI (acoplado)
class BadNotificationService {
  private emailProvider = new SendGridProvider();  // acoplado
  private logger = new ConsoleLogger();             // acoplado
  async notify(email: string, msg: string) {
    await this.emailProvider.send(email, msg);
    this.logger.log(`Sent to ${email}`);
  }
}

// Con DI (desacoplado)
interface EmailProvider { send(to: string, body: string): Promise<void>; }
interface Logger { log(msg: string): void; }

class GoodNotificationService {
  constructor(
    private emailProvider: EmailProvider,
    private logger: Logger
  ) {}

  async notify(email: string, msg: string) {
    await this.emailProvider.send(email, msg);
    this.logger.log(`Sent to ${email}`);
  }
}

// Composicion: elegir implementaciones al construir
const service = new GoodNotificationService(
  new SendGridProvider(),   // o new SESProvider(), o new MockProvider()
  new WinstonLogger()       // o new ConsoleLogger(), o new SilentLogger()
);

// En tests: inyectar mocks
const mockEmail: EmailProvider = { send: async (to, body) => { console.log(`Mock send to ${to}`); } };
const mockLogger: Logger = { log: (msg) => { /* spy */ } };
const testService = new GoodNotificationService(mockEmail, mockLogger);

// Tipos de inyeccion
  | Tipo | Ejemplo | Ventajas | Desventajas |
  |------|---------|----------|-------------|
  | Constructor | constructor(db: DB) | Deps obligatorias | Params largos |
  | Setter | setDB(db: DB) | Opcional, flexible | Deps pueden faltar |
  | Interface | @Injectable() | Metadata, DI container | Requiere framework |
  | Property | @Inject() | Conciso | Deps ocultas |
  | Method | process(db: DB, data) | Por llamada | Repetitivo |
```

Lecciones:
  - DI desacopla: el servicio no crea sus dependencias
  - Constructor injection es preferido: deps obligatorias y explicitas
  - En tests, inyectar mocks: no tocar servicios reales
  - DI container automatiza la composicion (tsyringe, InversifyJS)
  - Sin DI container: composicion manual en el entry point
  - DI vs Service Locator: DI es explicito, SL es implicito y oculto
```

### DI vs Service Locator: cual uso?

Usa DI: las dependencias se pasan al constructor, son visibles y obligatorias. Usa Service Locator solo en legacy: el servicio pide dependencias a un registry global. DI es explicito: ves que necesita el servicio. SL es implicito: el servicio pide dependencias internamente, ocultando acoplamiento. DI es testable; SL es dificil de testear. Prefiere DI siempre.




End of document. Review and update quarterly.