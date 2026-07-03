---
contentType: guides
slug: solid-principles-guide
title: "SOLID Principles Explained with Examples"
description: "Learn the five SOLID principles with practical code examples: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion."
metaDescription: "SOLID principles guide with practical examples: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion."
difficulty: intermediate
topics:
  - design
tags:
  - architecture
  - guide
  - maintainability
  - solid
  - design-patterns
relatedResources:
  - /guides/design/clean-code-principles-guide
  - /guides/design/design-patterns-guide
  - /guides/architecture/domain-driven-design-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "SOLID principles guide with practical examples: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion."
  keywords:
    - solid principles
    - single responsibility principle
    - open closed principle
    - liskov substitution
    - interface segregation
    - dependency inversion
---

# SOLID Principles Explained with Examples

## Introduction

SOLID is an acronym for five design principles that make software designs more understandable, flexible, and maintainable. They were introduced by Robert C. Martin and are foundational to object-oriented design.

| Letter | Principle | Core Idea |
|--------|-----------|-----------|
| **S** | Single Responsibility | A class should have one reason to change |
| **O** | Open/Closed | Open for extension, closed for modification |
| **L** | Liskov Substitution | Subtypes must be substitutable for their base types |
| **I** | Interface Segregation | Clients should not depend on interfaces they don't use |
| **D** | Dependency Inversion | Depend on abstractions, not concretions |

## S — Single Responsibility Principle (SRP)

**A class should have only one reason to change.**

```python
# Bad: one class handles order logic AND reporting
class OrderManager:
    def create_order(self, items):
        ...
    def cancel_order(self, order_id):
        ...
    def generate_monthly_report(self):
        ...  # completely different concern

# Good: separate responsibilities
class OrderService:
    def create_order(self, items):
        ...
    def cancel_order(self, order_id):
        ...

class ReportGenerator:
    def generate_monthly_report(self):
        ...
```

**Why it matters:** When a class has multiple responsibilities, changes to one responsibility can break another. Small, focused classes are easier to understand, test, and reuse. See [Clean Code Principles](/guides/design/clean-code-principles-guide) for related practices.

## O — Open/Closed Principle (OCP)

**Software entities should be open for extension but closed for modification.**

```python
# Bad: modify existing code for every new payment method
class PaymentProcessor:
    def process(self, payment):
        if payment.type == "credit_card":
            ...
        elif payment.type == "paypal":
            ...
        elif payment.type == "crypto":  # added later
            ...

# Good: extend via new classes
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

# Adding a new method requires zero changes to existing code
class CryptoPayment(PaymentMethod):
    def process(self, amount):
        ...
```

**Why it matters:** Modifying existing, working code introduces risk. By extending through new code, you preserve the stability of what already works. See [Strategy Pattern](/patterns/design/strategy-pattern) for interchangeable behavior.

## L — Liskov Substitution Principle (LSP)

**Objects of a superclass should be replaceable with objects of its subclasses without breaking the program.**

```python
# Bad: Square violates LSP when used as Rectangle
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

class Square(Rectangle):  # violates LSP
    def set_width(self, w):
        self._width = w
        self._height = w  # surprising side effect!

    def set_height(self, h):
        self._width = h   # surprising side effect!
        self._height = h

# A function expecting Rectangle behavior breaks with Square

def resize_rectangle(rect: Rectangle):
    rect.set_width(5)
    rect.set_height(4)
    assert rect.area() == 20  # fails for Square!
```

```python
# Good: model Square independently or as a value object
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

**Why it matters:** Violating LSP leads to subtle bugs when polymorphism is used. The subclass must honor the contract of the parent class.

## I — Interface Segregation Principle (ISP)

**Clients should not be forced to depend on interfaces they do not use.**

```python
# Bad: one fat interface
class Worker(ABC):
    @abstractmethod
    def work(self):
        pass
    @abstractmethod
    def eat(self):  # robots don't eat
        pass
    @abstractmethod
    def sleep(self):  # robots don't sleep
        pass

# Good: split into focused interfaces
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
    # no need to implement eat() or sleep()
```

**Why it matters:** Fat interfaces create unnecessary coupling. When a client depends on methods it doesn't use, changes to those methods can force unnecessary recompilation or retesting.

## D — Dependency Inversion Principle (DIP)

**High-level modules should not depend on low-level modules. Both should depend on abstractions.**

```python
# Bad: high-level module depends on concrete low-level module
class EmailService:
    def send(self, to, subject, body):
        ...  # SMTP logic

class NotificationManager:  # high-level
    def __init__(self):
        self.email = EmailService()  # hardcoded dependency

    def notify_user(self, user):
        self.email.send(user.email, "Hello", "...")

# Good: depend on abstraction
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
        self.channel.send(user.email, "Hello", "...")

# Easy to swap implementations without changing NotificationManager
email_notifier = NotificationManager(EmailService())
sms_notifier = NotificationManager(SMSService())
```

**Why it matters:** Depending on abstractions makes the system flexible. You can swap implementations (for testing, different environments, or new requirements) without touching the high-level business logic. See [Factory Pattern](/patterns/design/factory-pattern) for creating abstractions.

## Applying SOLID Together

SOLID principles reinforce each other:

| Principle | Supports |
|-----------|----------|
| **SRP** → | Makes OCP easier (smaller classes = easier to extend) |
| **OCP** → | Enables LSP (extension via inheritance/substitution) |
| **LSP** → | Enables polymorphism used by DIP |
| **ISP** → | Reduces the surface area of dependencies for DIP |
| **DIP** → | Enables OCP by allowing behavior injection |

## Common Mistakes

- Creating a class per method to force SRP — not every function needs its own class
- Using OCP as an excuse for premature abstraction — YAGNI still applies
- Misapplying LSP to value objects that aren't meant to be substitutable
- Splitting interfaces so finely that the system becomes fragmented
- Injecting dependencies everywhere including trivial, stable utilities

## Frequently Asked Questions

### Should I apply all SOLID principles to every class?

No. These are guidelines, not laws. Apply them where they reduce complexity and coupling. Small scripts and [CRUD operations](/guides/databases/database-design-guide) often don't need full SOLID treatment.

### Do SOLID principles apply only to OOP?

The concepts translate well to other models. Functional programming achieves DIP via higher-order functions, and SRP applies to modules and functions in any model. See [design patterns](/guides/design/design-patterns-guide) for practical examples.

### How do I convince my team to refactor toward SOLID?

Don't refactor for the sake of the principles. Wait until a change is needed, then use the principles to guide a cleaner design. Show before/after comparisons in PRs.
