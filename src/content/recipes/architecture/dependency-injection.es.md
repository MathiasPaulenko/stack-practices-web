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

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
