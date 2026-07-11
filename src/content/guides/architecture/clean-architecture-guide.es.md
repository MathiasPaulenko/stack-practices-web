---
contentType: guides
slug: clean-architecture-guide
title: "Clean Architecture — La Regla de Dependencia y Límites entre Capas"
description: "Guía práctica de Clean Architecture de Uncle Bob: organiza el código en capas para que frameworks, UI y bases de datos sean detalles, no dependencias."
metaDescription: "Aprende Clean Architecture con la Regla de Dependencia, límites entre capas y ejemplos prácticos. Construye aplicaciones mantenibles y testeables."
difficulty: advanced
topics:
  - architecture
  - design
tags:
  - clean-architecture
  - dependency-rule
  - layered-architecture
  - testability
  - solid-principles
  - domain-driven-design
  - guide
relatedResources:
  - /guides/hexagonal-architecture-guide
  - /guides/onion-architecture-guide
  - /guides/layered-architecture-guide
  - /guides/solid-principles-guide
  - /patterns/design/dependency-injection-pattern
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Aprende Clean Architecture con la Regla de Dependencia, límites entre capas y ejemplos prácticos. Construye aplicaciones mantenibles y testeables."
  keywords:
    - clean-architecture
    - regla-de-dependencia
    - arquitectura-en-capas
    - testabilidad
    - solid-principles
    - domain-driven-design
    - guía
---

## Overview

Clean Architecture, introducida por Robert C. Martin (Uncle Bob), es una filosofía de diseño de software que organiza el código en capas concéntricas. La regla central — la Regla de Dependencia — establece que las dependencias del código fuente solo pueden apuntar hacia adentro. Nada en una capa interna puede saber nada sobre algo en una capa externa. Esto hace que frameworks, bases de datos e interfaces de usuario sean detalles reemplazables en lugar de dependencias centrales.

## Las Cuatro Capas

```
┌──────────────────────────────────────┐
│         Frameworks y Drivers           │
│    (Web, UI, APIs externas, BD)      │
├──────────────────────────────────────┤
│         Adaptadores de Interfaz        │
│  (Controladores, Presenters, Puertas)│
├──────────────────────────────────────┤
│    Reglas de Negocio de Aplicación   │
│    (Casos de Uso, Servicios App)     │
├──────────────────────────────────────┤
│    Reglas de Negocio de Empresa      │
│    (Entidades, Lógica de Dominio)   │
└──────────────────────────────────────┘
```

### Entidades (Más interna)

Reglas de negocio de toda la empresa. Son la capa más general y reutilizable. En muchas aplicaciones, las entidades son estructuras de datos simples con comportamiento.

```typescript
export class User {
  private constructor(
    private readonly id: UserId,
    private email: Email,
    private status: UserStatus
  ) {}

  static create(email: Email): User {
    return new User(UserId.generate(), email, UserStatus.PENDING);
  }

  activate(): void {
    this.status = UserStatus.ACTIVE;
  }

  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }
}
```

### Casos de Uso

Reglas de negocio específicas de la aplicación. Orquestan entidades y definen las operaciones que la aplicación soporta.

```typescript
export class RegisterUserUseCase {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService
  ) {}

  async execute(command: RegisterUserCommand): Promise<Result<User>> {
    const existing = await this.userRepository.findByEmail(command.email);
    if (existing) {
      return Result.failure('Email ya registrado');
    }

    const user = User.create(Email.create(command.email));
    await this.userRepository.save(user);
    await this.emailService.sendWelcome(user.email);

    return Result.success(user);
  }
}
```

### Adaptadores de Interfaz

Convierten datos del formato más conveniente para casos de uso y entidades, al formato más conveniente para frameworks y drivers.

```typescript
@RestController()
export class UserController {
  constructor(private registerUser: RegisterUserUseCase) {}

  @Post('/users')
  async register(@Body() dto: RegisterUserDto): Promise<UserResponse> {
    const result = await this.registerUser.execute(dto.toCommand());
    return result.isSuccess()
      ? UserResponse.from(result.value)
      : UserResponse.error(result.error);
  }
}
```

### Frameworks y Drivers

La capa más externa — frameworks web, bases de datos, UI, dispositivos externos. Esta capa contiene código mínimo y debe ser fácil de reemplazar.

## La Regla de Dependencia

> Las dependencias del código fuente deben apuntar solo hacia adentro, hacia políticas de mayor nivel.

Esto significa:
- El framework web importa el controlador, no al revés
- La base de datos importa la interfaz del repositorio, no al revés
- La UI importa el presenter, no al revés

## Cruzando Límites

En cada límite de capa, los datos cruzan como estructuras simples (DTOs) para evitar filtrar detalles de implementación:

```typescript
// Capa de dominio — no sabe nada de HTTP
interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  save(user: User): Promise<void>;
}

// Capa de infraestructura — implementa la interfaz
class PostgresUserRepository implements UserRepository {
  constructor(private db: Knex) {}

  async findById(id: UserId): Promise<User | null> {
    const row = await this.db('users').where('id', id.value).first();
    return row ? this.toDomain(row) : null;
  }

  async save(user: User): Promise<void> {
    await this.db('users').insert(this.toRow(user));
  }
}
```

## Estrategia de Testing

| Capa | Enfoque de Test | Velocidad |
|------|---------------|-----------|
| Entidades | Tests unitarios puros | < 10ms |
| Casos de Uso | Tests unitarios con repos en memoria | < 50ms |
| Adaptadores | Tests de integración con BD real | < 500ms |
| E2E | Tests de stack completo | segundos |

## Errores Comunes

- **Acoplamiento al framework** — importar Spring o Express dentro de casos de uso
- **Abstracciones filtradas** — pasar objetos de request HTTP al dominio
- **Modelos anémicos** — tratar entidades como bolsas de datos sin comportamiento
- **Sobre-abstracción** — agregar interfaces para cosas que nunca cambian

## Cuándo Usar

- Aplicaciones medianas a grandes con larga vida útil
- Aplicaciones donde la lógica de dominio es más compleja que el acceso a datos
- Equipos que valoran la testabilidad y el despliegue independiente
- Proyectos donde el cambio de framework es probable

## Cuándo NO Usar

- CRUD simple sin reglas de negocio
- Scripts, prototipos o MVPs donde la velocidad importa más que la estructura
- Equipos sin la disciplina para mantener los límites

## FAQ

**¿Clean Architecture es lo mismo que Hexagonal?**
Comparten el mismo objetivo (aislamiento del dominio) pero usan metáforas diferentes. Hexagonal usa puertos y adaptadores; Clean usa capas y la Regla de Dependencia. Ambas funcionan bien juntas.

**¿Cómo manejo transacciones entre casos de uso?**
Usa el patrón Unit of Work en la capa de adaptador, o envuelve casos de uso en un decorador de transacción que vive en la capa de aplicación.

**¿Puedo usar ORMs en la capa de entidades?**
No. Las anotaciones de ORM pertenecen a la capa de infraestructura. Mantén las entidades puras.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.


## Temas Avanzados

### Escenario Detallado: App de Registro de Usuarios con Clean Architecture

```text
Proyecto: Sistema de registro y autenticacion (TypeScript + Node.js)
Capas:
  Entities (dominio): User, Email, UserId, UserStatus
  Use Cases (aplicacion): RegisterUserUseCase, AuthenticateUserUseCase
  Interface Adapters: UserController, UserPresenter, RegisterUserDto
  Frameworks: Express.js, PostgreSQL, SendGrid

Estructura de archivos:
  src/
    domain/
      entities/User.ts
      valueobjects/Email.ts
      valueobjects/UserId.ts
      valueobjects/UserStatus.ts
      repositories/UserRepository.ts       # Interfaz (puerto)
      services/EmailService.ts             # Interfaz (puerto)
      errors/DomainError.ts
    application/
      usecases/RegisterUserUseCase.ts
      usecases/AuthenticateUserUseCase.ts
      dto/RegisterUserCommand.ts
      dto/UserResponse.ts
      results/Result.ts
    infrastructure/
      persistence/PostgresUserRepository.ts  # Implementa UserRepository
      email/SendGridEmailService.ts          # Implementa EmailService
      database/KnexConnection.ts
    presentation/
      controllers/UserController.ts
      presenters/UserPresenter.ts
      routes/userRoutes.ts
    app.ts                                    # Entry point (Express)

Flujo: Registrar usuario via POST /users
  1. Express recibe POST /users con body { email, password }
  2. UserController mapea a RegisterUserCommand
  3. Llama RegisterUserUseCase.execute(command)
  4. UseCase:
     a. userRepository.findByEmail(email) -> verifica si ya existe
     b. Si existe: retorna Result.failure("Email ya registrado")
     c. User.create(email) -> crea entidad con status PENDING
     d. userRepository.save(user)
     e. emailService.sendWelcome(user.email)
     f. Retorna Result.success(user)
  5. UserPresenter mapea Result a UserResponse
  6. UserController retorna 201 o 400

Testeo por capa:
  // domain/entities/User.test.ts
  describe("User", () => {
    test("create should set status to PENDING", () => {
      const user = User.create(Email.create("test@example.com"));
      expect(user.isActive()).toBe(false);
      expect(user.status).toBe(UserStatus.PENDING);
    });

    test("activate should change status to ACTIVE", () => {
      const user = User.create(Email.create("test@example.com"));
      user.activate();
      expect(user.isActive()).toBe(true);
    });
  });

  // application/usecases/RegisterUserUseCase.test.ts
  describe("RegisterUserUseCase", () => {
    let repo: InMemoryUserRepository;
    let emailService: SpyEmailService;
    let useCase: RegisterUserUseCase;

    beforeEach(() => {
      repo = new InMemoryUserRepository();
      emailService = new SpyEmailService();
      useCase = new RegisterUserUseCase(repo, emailService);
    });

    test("should register new user successfully", async () => {
      const cmd = new RegisterUserCommand("test@example.com");
      const result = await useCase.execute(cmd);
      expect(result.isSuccess()).toBe(true);
      expect(emailService.sentEmails).toHaveLength(1);
    });

    test("should fail if email already registered", async () => {
      repo.add(User.create(Email.create("test@example.com")));
      const cmd = new RegisterUserCommand("test@example.com");
      const result = await useCase.execute(cmd);
      expect(result.isFailure()).toBe(true);
      expect(emailService.sentEmails).toHaveLength(0);
    });
  });

  // Tests del dominio: < 10ms, sin mocks de BD ni red
  // Tests de use cases: < 50ms, con repos en memoria
  // Tests de integracion: < 500ms, con Testcontainers + PostgreSQL real
```

### Como manejo el paso de datos entre capas sin filtrar detalles?

Usa DTOs (Data Transfer Objects) en cada frontera de capa. El controlador recibe un RequestDTO y lo convierte a un Command del dominio. El use case retorna un Result con la entidad del dominio. El presenter convierte la entidad a un ResponseDTO. Nunca pases el objeto Request de Express al dominio. Nunca pases la entidad JPA al controlador. Cada capa habla su propio idioma; los DTOs son la traduccion.
