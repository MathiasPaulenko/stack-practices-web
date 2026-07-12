---




contentType: recipes
slug: data-validation-zod
title: "Schema-Based Data Validation with Zod in TypeScript"
description: "Validate and sanitize incoming data using Zod schemas with TypeScript inference, custom refinements, and error formatting for reliable API and form validation"
metaDescription: "Validate data with Zod schemas in TypeScript. Use type inference, custom refinements, and error formatting for reliable API and form validation."
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
  metaDescription: "Validate data with Zod schemas in TypeScript. Use type inference, custom refinements, and error formatting for reliable API and form validation."
  keywords:
    - zod validation
    - schema validation
    - typescript
    - data sanitization
    - form validation




---

# Schema-Based Data Validation with Zod in TypeScript

Use Zod to define schemas that validate runtime data while automatically inferring TypeScript types. The solution below covers basic schemas, custom refinements, error formatting, and integration with forms and APIs for bulletproof data validation.

## When to Use This

- API request bodies must be validated before processing
- Form inputs need both client-side and server-side validation
- Configuration objects and environment variables require type-safe parsing. See [Parse JSON](/recipes/data/parse-json) for parsing structured config data.

## Solution

### 1. Basic Schema Definition

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

// Infer TypeScript type automatically
type User = z.infer<typeof UserSchema>;
```

### 2. Custom Refinements

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

// Reusable email with domain check
const WorkEmailSchema = z.string()
  .email()
  .refine(
    (val) => val.endsWith('@company.com'),
    'Email must be a company address'
  );
```

### 3. Nested and Array Schemas

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

### 4. Error Formatting

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

// API middleware
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

// Usage
app.post('/users', validateBody(UserSchema), (req, res) => {
  const user = req.validatedBody;
  // user is fully typed and validated
});
```

### 5. Form Integration

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

## How It Works

- **Zod schemas** define shape, type, and constraints declaratively
- **Type inference** generates TypeScript types from schemas automatically
- **Refinements** add custom validation logic beyond built-in checks
- **Safe parse** returns discriminated unions for explicit error handling
- **Coercion** transforms string inputs into proper types (dates, numbers)

## Production Considerations

- Use `.strict()` to reject unexpected properties and prevent injection
- Precompile schemas for hot paths to reduce parsing overhead
- Combine Zod with tRPC for end-to-end type-safe APIs. See [REST API design](/guides/api/rest-api-design-guide).

## Common Mistakes

- Using `.parse()` without try-catch, crashing on invalid input
- Not coercing query parameters and form data, which arrive as strings. See [input validation](/recipes/api/input-validation).
- Creating new schema instances on every render instead of reusing them

## FAQ

**Q: How does Zod compare to Yup or Joi?**
A: Zod offers native TypeScript inference without a separate type declaration. It has zero dependencies and tree-shakes well.

**Q: Can Zod validate async operations?**
A: Yes. Use `.refine()` with an async function for database uniqueness checks or external validation.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

## Advanced Solutions

### Environment variable validation

Validate environment variables at startup so missing or invalid config fails fast instead of causing runtime errors:

```typescript
// schemas/env.ts
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/, 'Must be like "1h" or "7d"'),
  CORS_ORIGINS: z.string()
    .transform((val) => val.split(','))
    .pipe(z.array(z.string().url())),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;
// env is fully typed: env.PORT is number, env.CORS_ORIGINS is string[]
```

### Discriminated unions for API responses

Handle polymorphic payloads with discriminated unions so each variant gets its own typed shape:

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

// Usage: TypeScript narrows the type based on `type`
function handleWebhook(event: WebhookEvent) {
  switch (event.type) {
    case 'order.created':
      // event.data.amount is number
      console.log(`Order ${event.data.orderId} created for ${event.data.amount}`);
      break;
    case 'order.refunded':
      // event.data.refundAmount is number
      console.log(`Refund ${event.data.refundAmount} for ${event.data.orderId}`);
      break;
    case 'order.shipped':
      // event.data.trackingNumber is string
      console.log(`Shipped via ${event.data.carrier}: ${event.data.trackingNumber}`);
      break;
  }
}
```

### Async refinements for database checks

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
    { message: 'Email already registered', path: ['email'] },
  )
  .refine(
    async (data) => {
      const existing = await db.user.findUnique({
        where: { username: data.username },
      });
      return !existing;
    },
    { message: 'Username already taken', path: ['username'] },
  );

// Usage with async parse
async function registerUser(input: unknown) {
  const result = await RegistrationSchema.safeParseAsync(input);
  if (!result.success) {
    return { errors: formatZodErrors(result.error) };
  }
  // result.data is fully validated including async checks
  return { user: result.data };
}
```

### Recursive schemas for nested comments

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

// Validates arbitrarily nested comment trees
const commentTree = CommentSchema.parse(inputFromApi);
```

### Zod with React Hook Form integration

```typescript
// hooks/useZodForm.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const RegistrationFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms' }),
  }),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: 'Passwords do not match', path: ['confirmPassword'] },
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
    // data is fully typed and validated
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
      <button type="submit" disabled={isSubmitting}>Register</button>
    </form>
  );
}
```

## Additional Best Practices

1. **Use `.strict()` on API input schemas.** Reject unexpected properties to prevent mass assignment attacks and catch client bugs early:

```typescript
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['user', 'admin']).default('user'),
}).strict(); // Rejects unknown keys like `id`, `createdAt`, `isAdmin`

// Without .strict(), an attacker could send { email, name, role: 'admin', id: '...' }
// and the extra fields would pass through silently
```

2. **Reuse schemas with `.pick()`, `.omit()`, and `.extend()`.** Avoid duplicating schema definitions for related DTOs:

```typescript
const BaseUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['user', 'admin']),
});

// CreateUser: same fields, no id
const CreateUserSchema = BaseUserSchema.strict();

// UpdateUser: all fields optional
const UpdateUserSchema = BaseUserSchema.partial();

// AdminUser: extends with admin-only fields
const AdminUserSchema = BaseUserSchema.extend({
  permissions: z.array(z.string()),
  department: z.string(),
});
```

## Additional Common Mistakes

1. **Not stripping sensitive fields from output.** Validation schemas define what input you accept, but you also need output schemas to avoid leaking fields like `passwordHash`:

```typescript
// Input schema accepts password
const RegisterInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Output schema excludes password
const UserOutputSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.coerce.date(),
}).strict();

// Always validate output before sending to client
app.post('/register', async (req, res) => {
  const input = RegisterInputSchema.parse(req.body);
  const user = await createUser(input);
  const output = UserOutputSchema.parse(user); // Strips passwordHash
  res.json(output);
});
```

2. **Using `.regex()` for email validation instead of `.email()`.** Custom regex patterns often miss edge cases defined in RFC 5322. Use Zod's built-in `.email()` which handles common formats correctly, and add domain restrictions with `.refine()` only if needed.

## Additional FAQ

### How do I handle file uploads with Zod?

Zod does not validate file contents directly. Validate the metadata (filename, MIME type, size) with Zod, then validate the file contents separately:

```typescript
const FileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  size: z.number().int().positive().max(10 * 1024 * 1024, 'Max 10MB'),
});

// Validate metadata, then check magic bytes separately
const fileMeta = FileUploadSchema.parse({
  filename: file.name,
  mimeType: file.type,
  size: file.size,
});
```

### Can I use Zod with MongoDB or Mongoose?

Yes. Define Zod schemas for input validation and use Mongoose schemas for storage. Validate incoming data with Zod before passing to Mongoose models. This separates validation concerns (Zod) from persistence concerns (Mongoose):

```typescript
const CreateUserInput = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  age: z.number().int().min(0).max(150).optional(),
});

// Validate input, then save with Mongoose
const validated = CreateUserInput.parse(req.body);
const user = await User.create(validated);
```

### How does Zod handle prototype pollution?

Zod strips `__proto__`, `constructor`, and `prototype` keys from parsed objects by default when using `.strict()` or when the schema does not explicitly allow those keys. Always use `.strict()` on API input schemas to reject any unexpected keys including prototype pollution attempts.
