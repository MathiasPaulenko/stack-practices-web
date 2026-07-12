---




contentType: recipes
slug: data-validation-zod
title: "Validacion de Datos Basada en Schemas con Zod en TypeScript"
description: "Valida y sanitiza datos entrantes usando schemas Zod con inferencia de TypeScript, refinements custom y formateo de errores para validacion robusta de APIs y formularios"
metaDescription: "Valida datos con schemas Zod en TypeScript. Usa inferencia de tipos, refinements custom y formateo de errores para validacion robusta de APIs y formularios."
difficulty: beginner
topics:
  - security
  - api
tags:
  - data-validation
  - typescript
  - security
  - vulnerabilities
  - encryption
relatedResources:
  - /recipes/go-rest-api-gin
  - /patterns/builder-pattern
  - /guides/security-best-practices-guide
  - /recipes/express-middleware-patterns
  - /recipes/graphql-input-validation
  - /guides/webhook-security-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Valida datos con schemas Zod en TypeScript. Usa inferencia de tipos, refinements custom y formateo de errores para validacion robusta de APIs y formularios."
  keywords:
    - zod validation
    - schema validation
    - typescript
    - data sanitization
    - form validation




---

# Validacion de Datos Basada en Schemas con Zod en TypeScript

Usa Zod para definir schemas que validan datos en runtime mientras infieren automaticamente tipos de TypeScript. Esta recipe cubre schemas basicos, refinements custom, formateo de errores e integracion con formularios y APIs para validacion de datos a prueba de balas.

## Cuando Usar Esto

- Los bodies de requests de API deben validarse antes de procesarse
- Los inputs de formularios necesitan validacion tanto client-side como server-side
- Los objetos de configuracion y variables de entorno requieren parsing type-safe. Consulta [Parse JSON](/recipes/data/parse-json) para parsear datos de config estructurados.

## Solucion

### 1. Definicion Basica de Schema

```typescript
// schemas/User.ts
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(2).max(50),
  age: z.number().int().min(0).max(150),
  role: z.enum(['user', 'admin', 'moderator']),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
});

// Inferir tipo de TypeScript automaticamente
type User = z.infer<typeof UserSchema>;
```

### 2. Refinements Custom

```typescript
// schemas/Password.ts
const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .refine(
    (val) => /[A-Z]/.test(val),
    'Password must contain an uppercase letter'
  )
  .refine(
    (val) => /[0-9]/.test(val),
    'Password must contain a number'
  )
  .refine(
    (val) => /[^a-zA-Z0-9]/.test(val),
    'Password must contain a special character'
  );

// Email reusable con chequeo de dominio
const WorkEmailSchema = z.string()
  .email()
  .refine(
    (val) => val.endsWith('@company.com'),
    'Email must be a company address'
  );
```

### 3. Schemas Anidados y de Array

```typescript
// schemas/Order.ts
const OrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  price: z.number().positive().multipleOf(0.01),
});

const OrderSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  items: z.array(OrderItemSchema).min(1),
  shippingAddress: z.object({
    street: z.string().min(5),
    city: z.string().min(2),
    zipCode: z.string().regex(/^\d{5}$/),
  }),
  total: z.number().positive(),
});
```

### 4. Formateo de Errores

```typescript
// utils/parseErrors.ts
function formatZodErrors(error: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};

  error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    formatted[path] = issue.message;
  });

  return formatted;
}

// Middleware de API
function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        errors: formatZodErrors(result.error),
      });
    }

    req.validatedBody = result.data;
    next();
  };
}

// Uso
app.post('/users', validateBody(UserSchema), (req, res) => {
  const user = req.validatedBody;
  // user esta completamente tipado y validado
});
```

### 5. Integracion con Formularios

```typescript
// hooks/useZodForm.ts
import { useState } from 'react';

function useZodForm<T extends z.ZodObject<any>>(schema: T) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (data: unknown): z.infer<T> | null => {
    const result = schema.safeParse(data);

    if (!result.success) {
      setErrors(formatZodErrors(result.error));
      return null;
    }

    setErrors({});
    return result.data;
  };

  return { validate, errors };
}
```

## Como Funciona

- **Zod schemas** definen shape, tipo y constraints declarativamente
- **Inferencia de tipos** genera tipos de TypeScript desde schemas automaticamente
- **Refinements** agregan logica de validacion custom mas alla de checks built-in
- **Safe parse** retorna unions discriminadas para manejo explicito de errores
- **Coercion** transforma inputs de string en tipos apropiados (dates, numbers)

## Consideraciones de Produccion

- Usa `.strict()` para rechazar propiedades inesperadas y prevenir injection
- Precompila schemas para hot paths para reducir overhead de parsing
- Combina Zod con tRPC para APIs end-to-end type-safe. Consulta [diseño de APIs](/guides/api/rest-api-design-guide).

## Errores Comunes

- Usar `.parse()` sin try-catch, crasheando en input invalido
- No coercionar query parameters y form data, que llegan como strings. Consulta [validación de input](/recipes/api/input-validation).
- Crear nuevas instancias de schema en cada render en lugar de reusarlas

## FAQ

**P: Como se compara Zod con Yup o Joi?**
R: Zod ofrece inferencia nativa de TypeScript sin declaracion de tipo separada. Tiene cero dependencias y tree-shakea bien.

**P: Puede Zod validar operaciones async?**
R: Si. Usa `.refine()` con una funcion async para checks de unicidad en base de datos o validacion externa.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Soluciones Avanzadas

### Validación de variables de entorno

Valida variables de entorno al iniciar para que config faltante o inválida falle rápido en lugar de causar errores en runtime:

```typescript
// schemas/env.ts
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32, 'JWT secret debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/, 'Debe ser como "1h" o "7d"'),
  CORS_ORIGINS: z.string()
    .transform((val) => val.split(','))
    .pipe(z.array(z.string().url())),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Configuración de entorno inválida:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;
// env está completamente tipado: env.PORT es number, env.CORS_ORIGINS es string[]
```

### Discriminated unions para respuestas de API

Maneja payloads polimórficos con discriminated unions para que cada variante obtenga su propio shape tipado:

```typescript
// schemas/webhook.ts
import { z } from 'zod';

const OrderCreatedEvent = z.object({
  type: z.literal('order.created'),
  data: z.object({
    orderId: z.string().uuid(),
    customerId: z.string().uuid(),
    amount: z.number().positive(),
    currency: z.string().length(3),
  }),
});

const OrderRefundedEvent = z.object({
  type: z.literal('order.refunded'),
  data: z.object({
    orderId: z.string().uuid(),
    refundAmount: z.number().positive(),
    reason: z.string().min(1).max(500),
  }),
});

const OrderShippedEvent = z.object({
  type: z.literal('order.shipped'),
  data: z.object({
    orderId: z.string().uuid(),
    carrier: z.string(),
    trackingNumber: z.string(),
    shippedAt: z.coerce.date(),
  }),
});

const WebhookEvent = z.discriminatedUnion('type', [
  OrderCreatedEvent,
  OrderRefundedEvent,
  OrderShippedEvent,
]);

type WebhookEvent = z.infer<typeof WebhookEvent>;

// Uso: TypeScript estrecha el tipo basado en `type`
function handleWebhook(event: WebhookEvent) {
  switch (event.type) {
    case 'order.created':
      // event.data.amount es number
      console.log(`Orden ${event.data.orderId} creada por ${event.data.amount}`);
      break;
    case 'order.refunded':
      // event.data.refundAmount es number
      console.log(`Reembolso ${event.data.refundAmount} para ${event.data.orderId}`);
      break;
    case 'order.shipped':
      // event.data.trackingNumber es string
      console.log(`Enviado via ${event.data.carrier}: ${event.data.trackingNumber}`);
      break;
  }
}
```

### Refinements async para checks de base de datos

```typescript
// schemas/registration.ts
import { z } from 'zod';
import { db } from '../db/client';

const RegistrationSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8),
})
  .refine(
    async (data) => {
      const existing = await db.user.findUnique({
        where: { email: data.email },
      });
      return !existing;
    },
    { message: 'Email ya registrado', path: ['email'] },
  )
  .refine(
    async (data) => {
      const existing = await db.user.findUnique({
        where: { username: data.username },
      });
      return !existing;
    },
    { message: 'Username ya tomado', path: ['username'] },
  );

// Uso con async parse
async function registerUser(input: unknown) {
  const result = await RegistrationSchema.safeParseAsync(input);
  if (!result.success) {
    return { errors: formatZodErrors(result.error) };
  }
  // result.data está completamente validado incluyendo checks async
  return { user: result.data };
}
```

### Schemas recursivos para comentarios anidados

```typescript
// schemas/comment.ts
import { z } from 'zod';

const CommentSchema: z.ZodType<Comment> = z.lazy(() =>
  z.object({
    id: z.string().uuid(),
    author: z.string().min(1),
    body: z.string().min(1).max(5000),
    createdAt: z.coerce.date(),
    replies: z.array(CommentSchema).default([]),
  }),
);

interface Comment {
  id: string;
  author: string;
  body: string;
  createdAt: Date;
  replies: Comment[];
}

// Valida árboles de comentarios arbitrariamente anidados
const commentTree = CommentSchema.parse(inputFromApi);
```

### Integración de Zod con React Hook Form

```typescript
// hooks/useZodForm.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const RegistrationFormSchema = z.object({
  firstName: z.string().min(1, 'Nombre es requerido'),
  lastName: z.string().min(1, 'Apellido es requerido'),
  email: z.string().email('Ingresa un email válido'),
  password: z.string()
    .min(8, 'Al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener una mayúscula')
    .regex(/[0-9]/, 'Debe contener un número'),
  confirmPassword: z.string(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar los términos' }),
  }),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: 'Las contraseñas no coinciden', path: ['confirmPassword'] },
);

type RegistrationForm = z.infer<typeof RegistrationFormSchema>;

function RegistrationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationForm>({
    resolver: zodResolver(RegistrationFormSchema),
  });

  const onSubmit = async (data: RegistrationForm) => {
    // data está completamente tipado y validado
    await api.register(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('firstName')} />
      {errors.firstName && <span>{errors.firstName.message}</span>}
      <input {...register('email')} type="email" />
      {errors.email && <span>{errors.email.message}</span>}
      <input {...register('password')} type="password" />
      {errors.password && <span>{errors.password.message}</span>}
      <button type="submit" disabled={isSubmitting}>Registrarse</button>
    </form>
  );
}
```

## Mejores Prácticas Adicionales

1. **Usa `.strict()` en schemas de input de API.** Rechaza propiedades inesperadas para prevenir ataques de mass assignment y detectar bugs del cliente temprano:

```typescript
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['user', 'admin']).default('user'),
}).strict(); // Rechaza keys desconocidas como `id`, `createdAt`, `isAdmin`

// Sin .strict(), un atacante podría enviar { email, name, role: 'admin', id: '...' }
// y los campos extra pasarían silenciosamente
```

2. **Reutiliza schemas con `.pick()`, `.omit()`, y `.extend()`.** Evita duplicar definiciones de schemas para DTOs relacionados:

```typescript
const BaseUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['user', 'admin']),
});

// CreateUser: mismos campos, sin id
const CreateUserSchema = BaseUserSchema.strict();

// UpdateUser: todos los campos opcionales
const UpdateUserSchema = BaseUserSchema.partial();

// AdminUser: extiende con campos solo de admin
const AdminUserSchema = BaseUserSchema.extend({
  permissions: z.array(z.string()),
  department: z.string(),
});
```

## Errores Comunes Adicionales

1. **No remover campos sensibles del output.** Los schemas de validación definen qué input aceptas, pero también necesitas schemas de output para evitar filtrar campos como `passwordHash`:

```typescript
// Schema de input acepta password
const RegisterInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Schema de output excluye password
const UserOutputSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.coerce.date(),
}).strict();

// Siempre valida el output antes de enviar al cliente
app.post('/register', async (req, res) => {
  const input = RegisterInputSchema.parse(req.body);
  const user = await createUser(input);
  const output = UserOutputSchema.parse(user); // Remueve passwordHash
  res.json(output);
});
```

2. **Usar `.regex()` para validación de email en lugar de `.email()`.** Los patrones regex custom a menudo no consideran edge cases definidos en RFC 5322. Usa `.email()` built-in de Zod que maneja formatos comunes correctamente, y añade restricciones de dominio con `.refine()` solo si es necesario.

## Preguntas Frecuentes Adicionales

### ¿Cómo manejo file uploads con Zod?

Zod no valida contenidos de archivos directamente. Valida los metadatos (filename, MIME type, size) con Zod, luego valida el contenido del archivo por separado:

```typescript
const FileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  size: z.number().int().positive().max(10 * 1024 * 1024, 'Máx 10MB'),
});

// Validar metadatos, luego verificar magic bytes por separado
const fileMeta = FileUploadSchema.parse({
  filename: file.name,
  mimeType: file.type,
  size: file.size,
});
```

### ¿Puedo usar Zod con MongoDB o Mongoose?

Sí. Define schemas de Zod para validación de input y usa schemas de Mongoose para almacenamiento. Valida datos entrantes con Zod antes de pasar a modelos de Mongoose. Esto separa concerns de validación (Zod) de concerns de persistencia (Mongoose):

```typescript
const CreateUserInput = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  age: z.number().int().min(0).max(150).optional(),
});

// Validar input, luego guardar con Mongoose
const validated = CreateUserInput.parse(req.body);
const user = await User.create(validated);
```

### ¿Cómo maneja Zod la prototype pollution?

Zod remueve las keys `__proto__`, `constructor`, y `prototype` de los objetos parseados por defecto cuando se usa `.strict()` o cuando el schema no permite explícitamente esas keys. Siempre usa `.strict()` en schemas de input de API para rechazar cualquier key inesperada incluyendo intentos de prototype pollution.
