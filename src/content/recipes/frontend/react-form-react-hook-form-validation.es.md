---
contentType: recipes
slug: react-form-react-hook-form-validation
title: "Validación de Formularios con react-hook-form y Zod"
description: "Construí formularios type-safe en React usando react-hook-form con validación de esquemas Zod, incluyendo campos anidados, reglas async, campos dinámicos e integración con librerías de UI."
metaDescription: "Construye formularios type-safe en React con react-hook-form y Zod. Valida campos anidados, reglas async, campos dinámicos e integra con librerías de UI."
difficulty: intermediate
topics:
  - frontend
tags:
  - frontend
  - react
  - forms
  - validation
  - typescript
  - zod
  - react-hook-form
relatedResources:
  - /recipes/react-usememo-usecallback-performance
  - /recipes/react-virtual-list-react-window
  - /recipes/typescript-discriminated-unions-exhaustive
  - /recipes/typescript-utility-types-generics
  - /recipes/javascript-debounce-throttle-implementation
  - /recipes/server-side-rendering
lastUpdated: "2026-08-22"
publishedAt: "2026-07-05"
author: Mathias Paulenko
seo:
  metaDescription: "Construye formularios type-safe en React con react-hook-form y Zod. Valida campos anidados, reglas async, campos dinámicos e integra con librerías de UI."
  keywords:
    - react
    - formularios
    - validación
    - react-hook-form
    - zod
    - typescript
    - frontend
    - forms type-safe
---

`react-hook-form` mantiene los re-renders bajos registrando inputs no controlados en lugar de
trackear
cada keystroke. `zod` te permite escribir un esquema de validación y sacarle un tipo de TypeScript.
Sumá `@hookform/resolvers/zod` y el formulario valida contra el esquema mientras los valores salen
ya
tipados. El resultado es un formulario type-safe y rápido, con las reglas de validación en un solo
lugar.

## Cuándo Usarlo

Este combo brilla cuando la validación se pone fea: reglas condicionales, cross-field, validaciones
async del lado del servidor, objetos anidados o field arrays. También es la elección correcta para
formularios grandes donde cada keystroke no debería disparar un re-render, y para integrar con
librerías de UI como shadcn/ui, Material UI o Chakra.

## Cuándo NO Usarlo

Para un formulario con uno o dos campos, un poco de `useState` y un chequeo manual alcanzan. Si
necesitás feedback visual rico en cada keystroke, un componente totalmente controlado puede ser más
simple. Y obviamente, solo funciona en React.

## Solución

### Instalación

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

## Variantes

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

## Buenas Prácticas

Derivá el tipo del formulario del esquema Zod con `z.infer<typeof schema>` en vez de definirlo dos
veces. Para inputs numéricos, agregá `valueAsNumber: true` para que el valor parseado sea realmente
un número y no un string. Seteá `defaultValues` para cada campo; react-hook-form se comporta mejor
con valores iniciales, especialmente para checkboxes y selects.

Si querés feedback antes de que el usuario envíe, usá `mode: "onBlur"` o `mode: "onChange"`. Para
campos repetidos o dinámicos, `useFieldArray` es mucho más seguro que manejar índices a mano. Cuando
el formulario se divide en componentes hijos, usá `FormProvider` para evitar prop drilling. Mantené
las reglas de validación dentro del esquema Zod en lugar de dispersarlas en el componente. Para
tips de performance, consultá [When to Use useMemo and
useCallback](/es/recipes/react-usememo-usecallback-performance/).

## Errores Comunes

- **Olvidar `valueAsNumber`**. Los inputs numéricos retornan strings por defecto, así que
    `z.number()` los rechaza a menos que agregues `valueAsNumber: true`.
- **Saltear `defaultValues`**. Sin ellos, checkboxes y selects pueden quedar `undefined`.
- **Validar solo en submit**. `mode: "onBlur"` le da feedback al usuario antes.
- **No tipar el resolver**. Siempre pasá el genérico `useForm<FormData>({ resolver:
    zodResolver(schema) })` para obtener valores tipados.
- **Usar controlled components innecesariamente**. `register` devuelve props para inputs no
    controlados, así que no pongas tu propio `value` y `onChange` encima.

## Preguntas Frecuentes

### ¿Cómo valido en change en lugar de en submit?

```tsx
useForm<FormData>({
  resolver: zodResolver(schema),
  mode: "onChange",
});
```

### ¿Puedo usar react-hook-form sin Zod?

Sí. Para casos simples podés pasar las reglas directamente a `register`, como `register("name", {
required: true, minLength: 2 })`. Zod empieza a valer la pena cuando el esquema crece o querés
reutilizarlo en varios lugares.

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

Sí. `Controller` es el camino para componentes que no exponen una ref plana, como el `TextInput` de
React Native:

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
