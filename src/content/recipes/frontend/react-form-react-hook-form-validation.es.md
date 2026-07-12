---




contentType: recipes
slug: react-form-react-hook-form-validation
title: "Validación de Formularios con react-hook-form y Zod"
description: "Cómo construir formularios type-safe en React usando react-hook-form con validación de esquemas Zod, incluyendo campos anidados, validación async y campos dinámicos."
metaDescription: "Construye formularios type-safe en React con react-hook-form y Zod. Valida campos anidados, reglas async, campos dinámicos e integra con librerías de UI."
difficulty: intermediate
topics:
  - frontend
tags:
  - frontend
  - react
  - forms
  - validation
  - react-hook-form
  - zod
  - recipe
relatedResources:
  - /recipes/typescript-discriminated-unions-exhaustive
  - /recipes/react-usememo-usecallback-performance
  - /recipes/typescript-utility-types-generics
  - /recipes/react-virtual-list-react-window
  - /recipes/vue-composition-api-fetch
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Construye formularios type-safe en React con react-hook-form y Zod. Valida campos anidados, reglas async, campos dinámicos e integra con librerías de UI."
  keywords:
    - frontend
    - react
    - forms
    - validation
    - react-hook-form
    - zod
    - recipe




---

## Overview

`react-hook-form` maneja el estado del formulario con re-renders mínimos. `zod` define esquemas de validación con full TypeScript inference. Juntos, `@hookform/resolvers/zod` los conecta — el formulario valida contra el esquema Zod y los valores del formulario se tipan automáticamente. Esta combinación te da formularios type-safe y performantes con reglas de validación declarativas.

## When to Use

- Formularios con reglas de validación complejas (condicionales, cross-field, async)
- Formularios type-safe donde el tipo de data enviada coincide con el esquema
- Formularios con campos dinámicos (field arrays, secciones condicionales)
- Formularios grandes donde la performance importa — react-hook-form evita re-renders en cada keystroke
- Formularios integrados con librerías de UI (shadcn/ui, Material UI, Chakra)

## When NOT to Use

- Formularios simples con 1-2 campos — `useState` y un check básico es suficiente
- Formularios que requieren feedback visual complejo en cada keystroke — controlled components pueden ser más simples
- Proyectos non-React — react-hook-form es solo React

## Solution

### Setup

```bash
npm install react-hook-form @hookform/resolvers zod
```

### Formulario básico con validación Zod

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  age: z.number().min(18, "Must be at least 18").max(120, "Invalid age"),
});

type FormData = z.infer<typeof schema>;

function SignupForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    await fetch("/api/signup", {
      method: "POST",
      body: JSON.stringify(data),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" type="text" {...register("name")} />
        {errors.name && <span>{errors.name.message}</span>}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" {...register("email")} />
        {errors.email && <span>{errors.email.message}</span>}
      </div>

      <div>
        <label htmlFor="age">Age</label>
        <input id="age" type="number" {...register("age", { valueAsNumber: true })} />
        {errors.age && <span>{errors.age.message}</span>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Sign up"}
      </button>
    </form>
  );
}
```

### Validación de objeto anidado

```tsx
const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  address: z.object({
    street: z.string().min(1, "Street is required"),
    city: z.string().min(1, "City is required"),
    zipCode: z.string().regex(/^\d{5}$/, "Must be 5 digits"),
  }),
  preferences: z.object({
    newsletter: z.boolean().default(false),
    notifications: z.enum(["all", "important", "none"]),
  }),
});

type FormData = z.infer<typeof schema>;

function ProfileForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <input {...register("firstName")} placeholder="First name" />
      <input {...register("lastName")} placeholder="Last name" />

      <input {...register("address.street")} placeholder="Street" />
      {errors.address?.street && <span>{errors.address.street.message}</span>}

      <input {...register("address.city")} placeholder="City" />
      {errors.address?.city && <span>{errors.address.city.message}</span>}

      <input {...register("address.zipCode")} placeholder="ZIP" />
      {errors.address?.zipCode && <span>{errors.address.zipCode.message}</span>}

      <select {...register("preferences.notifications")}>
        <option value="all">All</option>
        <option value="important">Important only</option>
        <option value="none">None</option>
      </select>

      <label>
        <input type="checkbox" {...register("preferences.newsletter")} />
        Subscribe to newsletter
      </label>

      <button type="submit">Save</button>
    </form>
  );
}
```

### Validación cross-field

```tsx
const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

function PasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <input type="password" {...register("password")} placeholder="Password" />
      {errors.password && <span>{errors.password.message}</span>}

      <input type="password" {...register("confirmPassword")} placeholder="Confirm" />
      {errors.confirmPassword && <span>{errors.confirmPassword.message}</span>}

      <button type="submit">Set password</button>
    </form>
  );
}
```

### Validación async

```tsx
const schema = z.object({
  username: z.string().min(3).refine(
    async (username) => {
      const res = await fetch(`/api/check-username?u=${username}`);
      const { available } = await res.json();
      return available;
    },
    "Username already taken"
  ),
  email: z.string().email(),
});

function UsernameForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isValidating },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <input {...register("username")} placeholder="Username" />
      {isValidating && <span>Checking...</span>}
      {errors.username && <span>{errors.username.message}</span>}

      <input {...register("email")} placeholder="Email" />
      {errors.email && <span>{errors.email.message}</span>}

      <button type="submit">Register</button>
    </form>
  );
}
```

### Field arrays (campos dinámicos)

```tsx
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  items: z.array(
    z.object({
      name: z.string().min(1, "Item name required"),
      quantity: z.number().min(1, "At least 1"),
      price: z.number().min(0, "Must be positive"),
    })
  ).min(1, "At least one item required"),
});

type FormData = z.infer<typeof schema>;

function InvoiceForm() {
  const { register, control, handleSubmit, formState: { errors } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: { items: [{ name: "", quantity: 1, price: 0 }] },
    });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  return (
    <form onSubmit={handleSubmit(console.log)}>
      {fields.map((field, index) => (
        <div key={field.id}>
          <input {...register(`items.${index}.name`)} placeholder="Item name" />
          <input type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
          <input type="number" {...register(`items.${index}.price`, { valueAsNumber: true })} />
          <button type="button" onClick={() => remove(index)}>Remove</button>
        </div>
      ))}
      {errors.items?.message && <span>{errors.items.message}</span>}

      <button type="button" onClick={() => append({ name: "", quantity: 1, price: 0 })}>
        Add item
      </button>
      <button type="submit">Submit</button>
    </form>
  );
}
```

### Validación condicional

```tsx
const schema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("individual"),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    ssn: z.string().regex(/^\d{3}-\d{2}-\d{4}$/),
  }),
  z.object({
    type: z.literal("business"),
    companyName: z.string().min(1),
    taxId: z.string().regex(/^\d{2}-\d{7}$/),
  }),
]);

type FormData = z.infer<typeof schema>;

function RegistrationForm() {
  const { register, handleSubmit, watch, formState: { errors } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const type = watch("type");

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <select {...register("type")}>
        <option value="individual">Individual</option>
        <option value="business">Business</option>
      </select>

      {type === "individual" && (
        <>
          <input {...register("firstName")} placeholder="First name" />
          <input {...register("lastName")} placeholder="Last name" />
          <input {...register("ssn")} placeholder="SSN" />
        </>
      )}

      {type === "business" && (
        <>
          <input {...register("companyName")} placeholder="Company name" />
          <input {...register("taxId")} placeholder="Tax ID" />
        </>
      )}

      <button type="submit">Register</button>
    </form>
  );
}
```

### Integración con shadcn/ui

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Min 8 characters"),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit(console.log)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register("password")} />
        {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
      </div>

      <Button type="submit" className="w-full">Login</Button>
    </form>
  );
}
```

## Variants

### Usar `FormProvider` para componentes anidados

```tsx
import { FormProvider, useForm, useFormContext } from "react-hook-form";

function AddressFields() {
  const { register, formState: { errors } } = useFormContext();

  return (
    <>
      <input {...register("address.street")} placeholder="Street" />
      {errors.address?.street && <span>{errors.address.street.message}</span>}
    </>
  );
}

function CheckoutForm() {
  const methods = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(console.log)}>
        <AddressFields />
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
}
```

### Resetear formulario después del envío

```tsx
function EditProfileForm({ defaultValues }: { defaultValues: FormData }) {
  const { register, handleSubmit, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const onSubmit = async (data: FormData) => {
    await saveProfile(data);
    reset(data); // Resetear a los nuevos valores guardados
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* fields */}
      <button type="submit">Save</button>
      <button type="button" onClick={() => reset()}>Reset</button>
    </form>
  );
}
```

## Best Practices


- For a deeper guide, see [When to Use useMemo and useCallback](/es/recipes/react-usememo-usecallback-performance/).

- Siempre deriva el tipo del formulario del esquema Zod con `z.infer<typeof schema>` — no dupliques el tipo
- Usa `valueAsNumber: true` para inputs de números — sin él, el valor es un string
- Setea `defaultValues` para todos los campos — react-hook-form funciona mejor con valores iniciales
- Usa `mode: "onBlur"` o `mode: "onChange"` para validar en blur o change en lugar de solo en submit
- Usa `useFieldArray` para listas dinámicas — no manages índices de arrays manualmente
- Usa `FormProvider` cuando los campos del formulario se dividen entre múltiples child components
- Valida en el esquema, no en el componente — mantén las reglas de validación en un solo lugar

## Common Mistakes

- **No usar `valueAsNumber`**: los inputs de números retornan strings por defecto. Sin `valueAsNumber`, `z.number()` de Zod falla.
- **Faltan `defaultValues`**: sin defaults, checkboxes y selects pueden tener valores undefined.
- **Validar solo en submit**: setea `mode: "onBlur"` para mejor UX — los usuarios ven errores antes de submittear.
- **No tipar el resolver**: `useForm<FormData>({ resolver: zodResolver(schema) })` — sin el generic, los valores del formulario son untyped.
- **Usar controlled components innecesariamente**: react-hook-form usa uncontrolled components por defecto. No spreades `value` y `onChange` encima de `register`.

## FAQ

### ¿Cómo valido en change en lugar de en submit?

```tsx
useForm<FormData>({
  resolver: zodResolver(schema),
  mode: "onChange",
});
```

### ¿Puedo usar react-hook-form sin Zod?

Sí. Usa `register("name", { required: true, minLength: 2 })` para validación inline. Zod es para esquemas complejos y reutilizables.

### ¿Cómo seteo un valor de campo programáticamente?

```tsx
const { setValue } = useForm<FormData>();

setValue("email", "test@example.com", { shouldValidate: true });
```

### ¿Cómo observo un valor de campo?

```tsx
const email = watch("email");
// o
const { watch } = useForm<FormData>();
const subscription = watch((value) => console.log(value));
```

### ¿Puedo usar react-hook-form con React Native?

Sí. Usa `Controller` para componentes custom:

```tsx
import { Controller } from "react-hook-form";

<Controller
  control={control}
  name="email"
  render={({ field: { onChange, value } }) => (
    <TextInput onChangeText={onChange} value={value} />
  )}
/>;
```
