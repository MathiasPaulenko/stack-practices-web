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
  - /recipes/api/go-rest-api-gin
  - /patterns/design/builder-pattern
  - /guides/security/security-best-practices-guide
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
