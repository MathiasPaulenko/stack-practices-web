---
contentType: recipes
slug: hexagonal-architecture
title: "Construir Aplicaciones Mantenibles con Arquitectura Hexagonal"
description: "Cómo estructurar aplicaciones usando ports y adapters para aislar lógica de negocio de frameworks, bases de datos y servicios externos para testabilidad y flexibilidad."
metaDescription: "Aprende arquitectura hexagonal para apps mantenibles. Usa ports y adapters para aislar lógica de negocio de frameworks, bases de datos y servicios externos."
difficulty: intermediate
topics:
  - design
tags:
  - hexagonal-architecture
  - ports-and-adapters
  - clean-architecture
  - dependency-inversion
  - testability
  - domain-logic
  - adapters
  - decoupling
relatedResources:
  - /recipes/domain-driven-design
  - /recipes/microservices-patterns
  - /recipes/unit-testing-mocking
  - /recipes/api-contract-testing
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende arquitectura hexagonal para apps mantenibles. Usa ports y adapters para aislar lógica de negocio de frameworks, bases de datos y servicios externos."
  keywords:
    - arquitectura hexagonal
    - ports and adapters
    - clean architecture
    - aislamiento logica dominio
    - aplicaciones testeables
---

## Visión general

La arquitectura tradicional en capas organiza el código en capas horizontales: los controllers llaman a services, los services llaman a repositories, los repositories consultan bases de datos. El problema es que las dependencias fluyen hacia abajo, acoplando la lógica de negocio a frameworks e infraestructura. Si cambias de PostgreSQL a MongoDB, la capa de servicio cambia. Si reemplazas Express con Fastify, la capa de controller cambia. Las reglas de negocio — el código más valioso y estable — se contaminan con detalles técnicos volátiles.

La arquitectura hexagonal (también llamada ports and adapters) invierte esto. El dominio se sienta en el centro, sin depender de nada. Define ports — interfaces describiendo qué capacidades necesita (ej. `UserRepository`, `PaymentGateway`). Los adapters implementan estos ports para tecnologías específicas (PostgreSQLUserRepository, StripePaymentGateway). El dominio no sabe si está hablando con una base de datos o un array en memoria. Esto hace al core trivialmente testeable sin bases de datos, frameworks o servicios externos.

## Cuándo usarlo

Usa esta receta cuando:

- Las reglas de negocio son complejas y cambian menos frecuentemente que los frameworks
- Necesitas testear lógica core sin levantar bases de datos o servidores HTTP
- Migrando entre tecnologías de infraestructura (ORMs, message brokers, proveedores cloud)
- Trabajando con múltiples interfaces de cliente (API REST, CLI, cola de mensajes) que comparten el mismo core
- Construyendo bibliotecas o frameworks donde el core debe permanecer independiente de consumidores

## Solución

### Core de Dominio con Ports (TypeScript)

```typescript
interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

interface EmailService {
  send(user: User, subject: string, body: string): Promise<void>;
}

class User {
  constructor(
    public readonly id: string,
    public email: string,
    public name: string,
    public isVerified: boolean = false
  ) {}

  verify() {
    this.isVerified = true;
  }
}

class UserRegistrationService {
  constructor(
    private users: UserRepository,
    private email: EmailService
  ) {}

  async register(email: string, name: string): Promise<User> {
    const existing = await this.users.findById(email);
    if (existing) throw new Error("User already exists");

    const user = new User(crypto.randomUUID(), email, name);
    await this.users.save(user);
    await this.email.send(user, "Welcome", `Hello ${name}, welcome aboard!`);
    return user;
  }
}
```

### Adapters (Infraestructura)

```typescript
class PostgresUserRepository implements UserRepository {
  constructor(private db: Pool) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return new User(row.id, row.email, row.name, row.is_verified);
  }

  async save(user: User): Promise<void> {
    await this.db.query(
      `INSERT INTO users (id, email, name, is_verified) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET email = $2, name = $3, is_verified = $4`,
      [user.id, user.email, user.name, user.isVerified]
    );
  }
}

class InMemoryUserRepository implements UserRepository {
  private users: Map<string, User> = new Map();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }
}

class MockEmailService implements EmailService {
  sentEmails: Array<{ user: User; subject: string; body: string }> = [];

  async send(user: User, subject: string, body: string): Promise<void> {
    this.sentEmails.push({ user, subject, body });
  }
}
```

### Bootstrap de Aplicación

```typescript
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const userRepository = new PostgresUserRepository(pool);
const emailService = new SmtpEmailService();
const registrationService = new UserRegistrationService(userRepository, emailService);

app.post('/users', async (req, res) => {
  try {
    const user = await registrationService.register(req.body.email, req.body.name);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
```

## Explicación

- **Dominio**: el centro del hexágono. Contiene entidades de negocio, value objects y domain services. Tiene cero dependencias de frameworks, bases de datos o APIs externas. Solo conoce ports — interfaces que necesita para hacer su trabajo.
- **Ports**: interfaces definidas por el dominio. `UserRepository` describe qué operaciones de persistencia necesita el dominio. `EmailService` describe qué capacidades de notificación necesita. El dominio depende de abstracciones, no implementaciones.
- **Adapters**: implementaciones concretas de ports. Un adapter PostgreSQL implementa `UserRepository` usando SQL. Un adapter en memoria implementa la misma interfaz usando un Map. El dominio no distingue entre ellos. Los adapters también adaptan concerns externos — los HTTP controllers adaptan requests entrantes a llamadas de métodos de dominio.
- **Inversión de dependencias**: el dominio no depende de PostgreSQL. PostgreSQL depende del dominio (vía la interfaz `UserRepository`). Este es el principio SOLID de inversión de dependencias. La flecha de dependencia apunta hacia adentro, hacia el dominio.

## Variantes

| Capa | Contenidos | Dependencias | Testeabilidad |
|------|------------|--------------|---------------|
| Dominio | Entities, value objects, domain services | Ninguna (solo lenguaje) | Unit tests, sin I/O |
| Aplicación | Casos de uso, orquestación, ports | Dominio | Unit tests con mocks |
| Adapters | Controllers, repositories, clientes externos | Dominio + frameworks | Tests de integración |
| Framework | Servidor HTTP, base de datos, cola de mensajes | Adapters | Tests E2E |

## Mejores prácticas

- **Mantén el dominio puro**: sin imports de `node_modules` en código de dominio. Solo primitivas del lenguaje y biblioteca estándar. Si ves `import express` o `import typeorm` en el dominio, el límite está violado.
- **Usa inyección de dependencias**: pasa adapters a los domain services vía constructores. No uses service locators o singletons globales. La inyección por constructor hace las dependencias explícitas y testeables.
- **Escribe tests contra adapters en memoria**: los unit tests para lógica de dominio deberían usar repositories en memoria, no bases de datos de test. Corren en milisegundos, no requieren setup, y prueban que la lógica de dominio funciona independientemente de infraestructura.
- **Un composition root**: el archivo de bootstrap de la aplicación (frecuentemente `main.ts` o `index.js`) es el único lugar donde los adapters se instancian y conectan. Este es el único archivo que sabe sobre PostgreSQL, Express y SMTP. Todo lo demás es agnóstico a la tecnología.
- **No filtres tipos de framework al dominio**: si tu domain service acepta un objeto `Request` o retorna un `Response`, está acoplado a HTTP. El dominio debería aceptar primitivas y objetos de dominio. Los adapters extraen datos de requests HTTP y llaman métodos de dominio.

## Errores comunes

- **Modelo de dominio anémico**: un dominio con solo getters y setters, donde toda la lógica vive en application services. Esto es solo data transfer objects. Empuja comportamiento a las entidades — `order.submit()`, no `orderService.submit(order)`.
- **Filtrar entidades de ORM al dominio**: usar modelos de TypeORM o Prisma directamente como entidades de dominio ata el dominio al esquema de base de datos. Mantén entidades de dominio separadas y mapea entre ellas en el adapter de repository.
- **Sobre-ingeniería CRUD simple**: un todo list con create, read, update, delete no necesita ports, adapters e inversión de dependencias. Usa arquitectura hexagonal cuando la complejidad de negocio justifique el costo de abstracción.
- **Dependencias circulares**: la capa de aplicación orquesta casos de uso llamando domain services y adapters. Si la capa de aplicación importa un adapter, y el adapter importa la capa de aplicación, tienes una dependencia circular. Los adapters deben depender solo del dominio.

## Preguntas frecuentes

**P: ¿La arquitectura hexagonal es lo mismo que clean architecture?**
R: Comparten el mismo principio — proteger el dominio de frameworks. Clean architecture (Robert C. Martin) agrega capas explícitas: entities, use cases, interface adapters, frameworks. Hexagonal (Alistair Cockburn) usa la metáfora de ports/adapters. En la práctica, producen estructuras similares.

**P: ¿Cómo manejo transacciones entre múltiples ports?**
R: Las transacciones son un concern de infraestructura. El application service llama a un patrón unit of work o transaction manager adapter que coordina commits entre repositories. El dominio no sabe sobre transacciones — solo llama `save()`.

**P: ¿Puedo usar arquitectura hexagonal con un framework serverless?**
R: Sí. El handler de Lambda es un adapter. Deserializa el evento, llama al domain service, y serializa la respuesta. El dominio permanece puro y testeable offline. Usa inyección de dependencias en la fase de inicialización del handler.

**P: ¿Necesito un adapter separado para cada servicio externo?**
R: Sí — cada dependencia externa recibe su propio adapter implementando un port definido por el dominio. Esto aísla cambios. Si cambias de SendGrid a Mailgun, solo cambia el adapter de email. Las capas de dominio y aplicación permanecen intactas.

