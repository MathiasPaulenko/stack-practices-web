---
contentType: patterns
slug: mediator-pattern
title: "Patrón Mediator"
description: "Define un objeto que encapsula cómo interactúa un conjunto de objetos. Un patrón de comportamiento para reducir dependencias caóticas."
metaDescription: "Aprende el Patrón Mediator en Python, Java y JavaScript. Patrón de comportamiento para reducir acoplamiento entre componentes."
difficulty: intermediate
topics:
  - design
tags:
  - mediator
  - patron
  - patron-de-diseno
  - comportamiento
  - desacoplamiento
  - coordinacion
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/observer-pattern
  - /patterns/design/state-pattern
  - /patterns/design/singleton-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende el Patrón Mediator en Python, Java y JavaScript. Patrón de comportamiento para reducir acoplamiento entre componentes."
  keywords:
    - patron mediator
    - patron de diseno
    - patron de comportamiento
    - desacoplamiento
    - coordinacion de componentes
    - python mediator
    - java mediator
    - javascript mediator
---

# Patrón Mediator

## Visión General

El [Patrón Mediator](/patterns/design/mediator-pattern-components) es un patrón de diseño de comportamiento que define un objeto que encapsula cómo interactúa un conjunto de objetos. En lugar de que los objetos se refieran entre sí directamente, se comunican a través de un mediador central. Esto reduce el número de conexiones directas entre componentes y centraliza la lógica de coordinación compleja.

## Cuándo Usarlo

Usa el Patrón Mediator cuando:
- Tienes muchos objetos que necesitan comunicarse de formas complejas
- Las dependencias entre objetos crean un lío enredado (código spaghetti)
- Quieres centralizar la lógica de coordinación compleja
- Reusar un componente individual es difícil porque depende de muchos otros
- Un cambio en un componente fuerza cambios en muchos otros

## Solución

### Python

```python
from abc import ABC, abstractmethod

class ChatMediator(ABC):
    @abstractmethod
    def send_message(self, message: str, sender):
        pass

    @abstractmethod
    def add_user(self, user):
        pass

class ChatRoom(ChatMediator):
    def __init__(self):
        self.users = []

    def add_user(self, user):
        self.users.append(user)

    def send_message(self, message: str, sender):
        for user in self.users:
            if user != sender:
                user.receive(message, sender.name)

class User:
    def __init__(self, name: str, mediator: ChatMediator):
        self.name = name
        self.mediator = mediator
        mediator.add_user(self)

    def send(self, message: str):
        print(f"{self.name} envía: {message}")
        self.mediator.send_message(message, self)

    def receive(self, message: str, from_name: str):
        print(f"{self.name} recibe de {from_name}: {message}")

# Uso
room = ChatRoom()
alice = User("Alice", room)
bob = User("Bob", room)

alice.send("¡Hola a todos!")
```

### JavaScript

```javascript
class ChatRoom {
  constructor() {
    this.users = [];
  }

  addUser(user) {
    this.users.push(user);
  }

  sendMessage(message, sender) {
    for (const user of this.users) {
      if (user !== sender) {
        user.receive(message, sender.name);
      }
    }
  }
}

class User {
  constructor(name, mediator) {
    this.name = name;
    this.mediator = mediator;
    mediator.addUser(this);
  }

  send(message) {
    console.log(`${this.name} envía: ${message}`);
    this.mediator.sendMessage(message, this);
  }

  receive(message, fromName) {
    console.log(`${this.name} recibe de ${fromName}: ${message}`);
  }
}

// Uso
const room = new ChatRoom();
const alice = new User("Alice", room);
const bob = new User("Bob", room);

alice.send("¡Hola a todos!");
```

### Java

```java
import java.util.ArrayList;
import java.util.List;

public interface ChatMediator {
    void sendMessage(String message, User sender);
    void addUser(User user);
}

public class ChatRoom implements ChatMediator {
    private final List<User> users = new ArrayList<>();

    public void addUser(User user) {
        users.add(user);
    }

    public void sendMessage(String message, User sender) {
        for (User user : users) {
            if (user != sender) {
                user.receive(message, sender.getName());
            }
        }
    }
}

public class User {
    private final String name;
    private final ChatMediator mediator;

    public User(String name, ChatMediator mediator) {
        this.name = name;
        this.mediator = mediator;
        mediator.addUser(this);
    }

    public String getName() { return name; }

    public void send(String message) {
        System.out.println(name + " envía: " + message);
        mediator.sendMessage(message, this);
    }

    public void receive(String message, String fromName) {
        System.out.println(name + " recibe de " + fromName + ": " + message);
    }
}

// Uso
ChatRoom room = new ChatRoom();
User alice = new User("Alice", room);
User bob = new User("Bob", room);
alice.send("¡Hola a todos!");
```

## Explicación

El Patrón Mediator tiene dos roles:

- **Mediator** (`ChatRoom`): Define la interfaz para la comunicación entre componentes
- **Colegas** (`User`): Objetos que se comunican a través del mediador en lugar de directamente

Sin el mediador, cada usuario necesitaría una referencia a cada otro usuario. Con él, cada usuario solo necesita una referencia al mediador.

## Variantes

| Variante | Descripción | Caso de Uso |
|----------|-------------|-------------|
| **Event Bus** | Pub/sub desacoplado vía un canal central | Sistemas grandes con muchos publishers/subscribers |
| **Command Bus** | Comandos enrutados a través de un handler central | CQRS, despacho de tareas |
| **Dialog Director** | Widgets UI coordinados por un controlador de diálogo | Validación de formularios, flujos de wizard |

## Lo que funciona

- **Mantén el mediador enfocado** en coordinación, no en lógica de negocio
- **Evita convertir el mediador en un objeto dios** — si crece demasiado, divídelo
- **Documenta qué eventos maneja el mediador** para que los colegas sepan qué esperar
- **Considera un event bus** para sistemas muy grandes donde un solo mediador sería un cuello de botella
- **Haz el mediador observable** para que sistemas externos puedan monitorear interacciones

## Errores Comunes

- Poner demasiada lógica en el mediador, creando una "god class" difícil de mantener
- Usar un mediador cuando simples llamadas directas serían suficientes (sobre-ingeniería)
- Hacer del mediador un cuello de botella centralizando toda la comunicación de forma bloqueante
- No documentar el rol del mediador, haciendo difícil entender por qué los componentes no se comunican directamente
- Permitir que el mediador filtre detalles de colegas a otros colegas

## Preguntas Frecuentes

**P: ¿Es Mediator lo mismo que Observer?**
R: Relacionados pero diferentes. [Observer](/patterns/design/observer-pattern) es una dependencia uno-a-muchos donde los sujetos notifican a los observadores. Mediator centraliza la comunicación muchos-a-muchos. Un event bus puede servir como ambos.

**P: ¿Cuál es la diferencia entre Mediator y Facade?**
R: [Facade](/patterns/design/adapter-pattern) proporciona una interfaz simplificada a un subsistema. Mediator coordina la comunicación entre objetos pares. Facade es sobre simplificar acceso; Mediator es sobre desacoplar pares.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.


## Temas Avanzados

### Escenario: Mediator para Wizard Form Multi-Step

```typescript
// Mediator: coordinar pasos de un wizard sin acoplamiento
interface WizardMediator {
  notify(sender: string, event: string, data?: unknown): void;
}

abstract class WizardStep {
  constructor(protected mediator: WizardMediator, public name: string) {}
  abstract render(): string;
  abstract validate(): boolean;
}

class PersonalInfoStep extends WizardStep {
  private data = { name: "", email: "" };
  render() { return `<input name="name" /><input name="email" />`; }
  validate() {
    if (!this.data.name || !this.data.email) return false;
    this.mediator.notify(this.name, "valid", this.data);
    return true;
  }
}

class AddressStep extends WizardStep {
  private data = { street: "", city: "" };
  render() { return `<input name="street" /><input name="city" />`; }
  validate() {
    if (!this.data.street || !this.data.city) return false;
    this.mediator.notify(this.name, "valid", this.data);
    return true;
  }
}

class PaymentStep extends WizardStep {
  private data = { card: "", cvv: "" };
  render() { return `<input name="card" /><input name="cvv" />`; }
  validate() {
    if (this.data.card.length < 16) return false;
    this.mediator.notify(this.name, "valid", this.data);
    return true;
  }
}

// Mediator concreto
class CheckoutWizard implements WizardMediator {
  private steps: WizardStep[] = [];
  private currentStep = 0;
  private collectedData: Record<string, unknown> = {};

  constructor() {
    this.steps = [
      new PersonalInfoStep(this, "personal"),
      new AddressStep(this, "address"),
      new PaymentStep(this, "payment"),
    ];
  }

  notify(sender: string, event: string, data?: unknown) {
    if (event === "valid") {
      this.collectedData[sender] = data;
      this.next();
    }
  }

  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.renderCurrent();
    } else {
      this.complete();
    }
  }

  back() {
    if (this.currentStep > 0) { this.currentStep--; this.renderCurrent(); }
  }

  renderCurrent(): string { return this.steps[this.currentStep].render(); }
  validateCurrent(): boolean { return this.steps[this.currentStep].validate(); }
  complete() { console.log("Wizard complete:", this.collectedData); }
}

// Uso: los pasos no se conocen entre si
const wizard = new CheckoutWizard();
wizard.renderCurrent(); // Step 1: PersonalInfo
wizard.validateCurrent(); // -> notify -> next()
wizard.renderCurrent(); // Step 2: Address
```

Lecciones:
  - Mediator coordina pasos del wizard sin acoplamiento
  - Cada paso solo conoce al mediator, no a otros pasos
  - Anadir nuevo paso = nueva clase + registrar en mediator
  - El mediator controla el flujo: next, back, complete
  - Los datos se centralizan en el mediator
```

### Mediator vs Observer en formularios?

Usa Mediator en formularios multi-step: el mediator controla el flujo (next, back, validate). Usa Observer en formularios reactivos: el campo notifica cambios a observadores (validacion en vivo, dependencias entre campos). Mediator es centralizado: el mediator decide. Observer es descentralizado: cada componente reacciona. Para wizards, Mediator. Para reactive forms, Observer.
