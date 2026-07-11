---
contentType: guides
slug: solid-principles-guide
title: "Principios SOLID Explicados con Ejemplos"
description: "Aprende los cinco principios SOLID con ejemplos prácticos de código: Responsabilidad Única, Abierto/Cerrado, Sustitución de Liskov, Segregación de Interfaces e Inversión de Dependencias."
metaDescription: "Guía de principios SOLID con ejemplos prácticos: Responsabilidad Única, Abierto/Cerrado, Sustitución de Liskov, Segregación de Interfaces, Inversión de Dependencias."
difficulty: intermediate
topics:
  - design
tags:
  - solid
  - diseno-orientado-a-objetos
  - principios
  - arquitectura
  - mantenibilidad
  - guia
relatedResources:
  - /guides/design/clean-code-principles-guide
  - /guides/design/design-patterns-guide
  - /guides/architecture/domain-driven-design-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Guía de principios SOLID con ejemplos prácticos: Responsabilidad Única, Abierto/Cerrado, Sustitución de Liskov, Segregación de Interfaces, Inversión de Dependencias."
  keywords:
    - principios solid
    - principio de responsabilidad unica
    - principio abierto cerrado
    - sustitucion de liskov
    - segregacion de interfaces
    - inversión de dependencias
---

# Principios SOLID Explicados con Ejemplos

## Introducción

SOLID es un acrónimo de cinco principios de diseño que hacen los diseños de software más comprensibles, flexibles y mantenibles. Fueron introducidos por Robert C. Martin y son fundamentales para el diseño orientado a objetos.

| Letra | Principio | Idea Central |
|-------|-----------|--------------|
| **S** | Responsabilidad Única | Una clase debe tener una única razón para cambiar |
| **O** | Abierto/Cerrado | Abierto para extensión, cerrado para modificación |
| **L** | Sustitución de Liskov | Los subtipos deben ser sustituibles por sus tipos base |
| **I** | Segregación de Interfaces | Los clientes no deben depender de interfaces que no usan |
| **D** | Inversión de Dependencias | Depender de abstracciones, no de concreciones |

## S — Principio de Responsabilidad Única (SRP)

**Una clase debe tener solo una razón para cambiar.**

```python
# Malo: una clase maneja lógica de órdenes Y reportes
class OrderManager:
    def create_order(self, items):
        ...
    def cancel_order(self, order_id):
        ...
    def generate_monthly_report(self):
        ...  # preocupación completamente diferente

# Bueno: separar responsabilidades
class OrderService:
    def create_order(self, items):
        ...
    def cancel_order(self, order_id):
        ...

class ReportGenerator:
    def generate_monthly_report(self):
        ...
```

**Por qué importa:** Cuando una clase tiene múltiples responsabilidades, cambios en una pueden romper otra. Clases pequeñas y enfocadas son más fáciles de entender, probar y reutilizar. Consulta [Clean Code Principles](/guides/design/clean-code-principles-guide) para prácticas relacionadas.

## O — Principio Abierto/Cerrado (OCP)

**Las entidades de software deben estar abiertas para extensión pero cerradas para modificación.**

```python
# Malo: modificar código existente para cada nuevo método de pago
class PaymentProcessor:
    def process(self, payment):
        if payment.type == "credit_card":
            ...
        elif payment.type == "paypal":
            ...
        elif payment.type == "crypto":  # agregado después
            ...

# Bueno: extender vía nuevas clases
class PaymentMethod(ABC):
    @abstractmethod
    def process(self, amount):
        pass

class CreditCardPayment(PaymentMethod):
    def process(self, amount):
        ...

class PayPalPayment(PaymentMethod):
    def process(self, amount):
        ...

class PaymentProcessor:
    def __init__(self, method: PaymentMethod):
        self.method = method

    def process(self, amount):
        self.method.process(amount)

# Agregar un nuevo método requiere cero cambios en código existente
class CryptoPayment(PaymentMethod):
    def process(self, amount):
        ...
```

**Por qué importa:** Modificar código existente que funciona introduce riesgo. Al extender mediante nuevo código, preservas la estabilidad de lo que ya funciona. Consulta [Strategy Pattern](/patterns/design/strategy-pattern) para comportamiento intercambiable.

## L — Principio de Sustitución de Liskov (LSP)

**Los objetos de una superclase deben ser reemplazables por objetos de sus subclases sin romper el programa.**

```python
# Malo: Cuadrado viola LSP cuando se usa como Rectángulo
class Rectangle:
    def __init__(self, width, height):
        self._width = width
        self._height = height

    def set_width(self, w):
        self._width = w

    def set_height(self, h):
        self._height = h

    def area(self):
        return self._width * self._height

class Square(Rectangle):  # viola LSP
    def set_width(self, w):
        self._width = w
        self._height = w  # ¡efecto secundario sorprendente!

    def set_height(self, h):
        self._width = h   # ¡efecto secundario sorprendente!
        self._height = h

# Una función esperando comportamiento de Rectángulo se rompe con Cuadrado

def resize_rectangle(rect: Rectangle):
    rect.set_width(5)
    rect.set_height(4)
    assert rect.area() == 20  # ¡falla para Cuadrado!
```

```python
# Bueno: modelar Cuadrado independientemente o como value object
class Rectangle:
    def __init__(self, width, height):
        self.width = width
        self.height = height

    def area(self):
        return self.width * self.height

@dataclass(frozen=True)
class Square:
    side: int

    def area(self):
        return self.side * self.side
```

**Por qué importa:** Violar LSP conduce a bugs sutiles cuando se usa polimorfismo. La subclase debe honrar el contrato de la clase padre.

## I — Principio de Segregación de Interfaces (ISP)

**Los clientes no deben verse forzados a depender de interfaces que no usan.**

```python
# Malo: una interfaz gorda
class Worker(ABC):
    @abstractmethod
    def work(self):
        pass
    @abstractmethod
    def eat(self):  # los robots no comen
        pass
    @abstractmethod
    def sleep(self):  # los robots no duermen
        pass

# Bueno: dividir en interfaces enfocadas
class Workable(ABC):
    @abstractmethod
    def work(self):
        pass

class Feedable(ABC):
    @abstractmethod
    def eat(self):
        pass

class HumanWorker(Workable, Feedable):
    def work(self): ...
    def eat(self): ...

class RobotWorker(Workable):
    def work(self): ...
    # no necesita implementar eat() ni sleep()
```

**Por qué importa:** Las interfaces gordas crean acoplamiento innecesario. Cuando un cliente depende de métodos que no usa, cambios en esos métodos pueden forzar recompilación o retesteo innecesario.

## D — Principio de Inversión de Dependencias (DIP)

**Los módulos de alto nivel no deben depender de módulos de bajo nivel. Ambos deben depender de abstracciones.**

```python
# Malo: módulo de alto nivel depende de módulo de bajo nivel concreto
class EmailService:
    def send(self, to, subject, body):
        ...  # lógica SMTP

class NotificationManager:  # alto nivel
    def __init__(self):
        self.email = EmailService()  # dependencia hardcodeada

    def notify_user(self, user):
        self.email.send(user.email, "Hola", "...")

# Bueno: depender de abstracciones
class NotificationChannel(ABC):
    @abstractmethod
    def send(self, to, subject, body):
        pass

class EmailService(NotificationChannel):
    def send(self, to, subject, body):
        ...

class SMSService(NotificationChannel):
    def send(self, to, subject, body):
        ...

class NotificationManager:
    def __init__(self, channel: NotificationChannel):
        self.channel = channel

    def notify_user(self, user):
        self.channel.send(user.email, "Hola", "...")

# Fácil cambiar implementaciones sin tocar NotificationManager
email_notifier = NotificationManager(EmailService())
sms_notifier = NotificationManager(SMSService())
```

**Por qué importa:** Depender de abstracciones hace el sistema flexible. Puedes intercambiar implementaciones (para testing, diferentes entornos, o nuevos requerimientos) sin tocar la lógica de negocio de alto nivel. Consulta [Factory Pattern](/patterns/design/factory-pattern) para crear abstracciones.

## Aplicando SOLID Juntos

Los principios SOLID se refuerzan mutuamente:

| Principio | Soporta |
|-----------|---------|
| **SRP** → | Facilita OCP (clases más pequeñas = más fáciles de extender) |
| **OCP** → | Habilita LSP (extensión vía herencia/sustitución) |
| **LSP** → | Habilita polimorfismo usado por DIP |
| **ISP** → | Reduce la superficie de dependencias para DIP |
| **DIP** → | Habilita OCP permitiendo inyección de comportamiento |

## Errores Comunes

- Crear una clase por método para forzar SRP — no toda función necesita su propia clase
- Usar OCP como excusa para abstracción prematura — YAGNI aún aplica
- Aplicar mal LSP a value objects que no están destinados a ser sustituibles
- Dividir interfaces tan finamente que el sistema se fragmenta
- Inyectar dependencias en todas partes incluyendo utilidades triviales y estables

## Preguntas Frecuentes

### ¿Debería aplicar todos los principios SOLID a cada clase?

No. Son guías, no leyes. Aplícalos donde reduzcan complejidad y acoplamiento. Scripts pequeños y [operaciones CRUD](/guides/databases/database-design-guide) a menudo no necesitan tratamiento SOLID completo.

### ¿Los principios SOLID aplican solo a POO?

Los conceptos se traducen bien a otros modelos. La programación funcional logra DIP mediante funciones de orden superior, y SRP aplica a módulos y funciones en cualquier modelo. Consulta [design patterns](/guides/design/design-patterns-guide) para ejemplos prácticos.

### ¿Cómo convenzo a mi equipo de refactorizar hacia SOLID?

No refactorices por los principios en sí. Espera hasta que se necesite un cambio, luego usa los principios para guiar un diseño más limpio. Muestra comparaciones antes/después en PRs.


## Temas Avanzados

### Escenario: Refactorizacion de Servicio de Pagos con SOLID

```typescript
// Antes: viola SRP, OCP y DIP
class PaymentProcessor {
  processPayment(payment: Payment) {
    // Valida (violacion SRP)
    if (!payment.amount || payment.amount <= 0) throw new Error("Invalid");
    // Procesa con Stripe (violacion OCP - hardcoded)
    const stripe = new StripeClient("sk_live_xxx");
    const result = stripe.charge(payment.amount, payment.currency);
    // Loguea a console (violacion SRP)
    console.log("Payment processed:", result);
    // Envia email (violacion SRP)
    const email = new EmailService();
    email.send(payment.customerEmail, "Payment received");
    // Guarda a MySQL (violacion DIP - hardcoded)
    const db = new MySQLConnection("localhost", "payments");
    db.query("INSERT INTO payments ...", result);
    return result;
  }
}

// Despues: refactor conforme a SOLID

// SRP: Cada clase tiene una responsabilidad
interface PaymentValidator {
  validate(payment: Payment): void;
}
class PaymentValidatorImpl implements PaymentValidator {
  validate(payment: Payment) {
    if (!payment.amount || payment.amount <= 0)
      throw new Error("Monto invalido");
    if (!payment.currency || payment.currency.length !== 3)
      throw new Error("Moneda invalida");
  }
}

// OCP: Nuevos gateways sin modificar codigo existente
interface PaymentGateway {
  charge(amount: number, currency: string): Promise<PaymentResult>;
}
class StripeGateway implements PaymentGateway {
  constructor(private client: StripeClient) {}
  async charge(amount: number, currency: string) {
    return this.client.charge(amount, currency);
  }
}
class PayPalGateway implements PaymentGateway {
  constructor(private client: PayPalClient) {}
  async charge(amount: number, currency: string) {
    return this.client.createOrder(amount, currency);
  }
}

// ISP: Interfaces segregadas
interface PaymentRepository {
  save(result: PaymentResult): Promise<void>;
}
interface NotificationService {
  notify(email: string, subject: string, body: string): Promise<void>;
}
interface Logger {
  log(level: string, message: string, meta?: object): void;
}

// DIP: Depende de abstracciones, no concreciones
class PaymentProcessor {
  constructor(
    private validator: PaymentValidator,
    private gateway: PaymentGateway,
    private repo: PaymentRepository,
    private notifier: NotificationService,
    private logger: Logger
  ) {}

  async processPayment(payment: Payment): Promise<PaymentResult> {
    this.validator.validate(payment);
    this.logger.log("info", "Procesando pago", { amount: payment.amount });

    const result = await this.gateway.charge(payment.amount, payment.currency);

    await this.repo.save(result);
    await this.notifier.notify(payment.customerEmail, "Pago recibido",
      `Tu pago de ${payment.amount} ${payment.currency} fue procesado.`);
    this.logger.log("info", "Pago completado", { id: result.id });
    return result;
  }
}

// LSP: Cualquier implementacion de PaymentGateway funciona
const processor = new PaymentProcessor(
  new PaymentValidatorImpl(),
  new StripeGateway(stripeClient),  // o new PayPalGateway(paypalClient)
  new PostgresPaymentRepository(db),
  new EmailNotificationService(smtp),
  new WinstonLogger()
);

// Testing: mockea todo via interfaces
const testProcessor = new PaymentProcessor(
  mockValidator, mockGateway, mockRepo, mockNotifier, mockLogger
);
// Cada dependencia es intercambiable y testeable independientemente
```

### Como aplican los principios SOLID a microservicios?

SRP mapea a limites de servicio: cada servicio posee una capacidad de negocio. OCP significa que nuevas features son nuevos servicios o endpoints, no modificaciones a existentes. LSP asegura que los contratos API se respetan entre versiones. ISP significa que los clientes obtienen solo los endpoints que necesitan (patron BFF). DIP significa que los servicios dependen de contratos (API specs), no implementaciones.
