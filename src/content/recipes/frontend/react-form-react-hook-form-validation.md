---
contentType: recipes
slug: react-form-react-hook-form-validation
title: "Form Validation with react-hook-form and Zod"
description: "How to build type-safe forms in React using react-hook-form with Zod schema validation, including nested fields, async validation, and dynamic fields."
metaDescription: "Build type-safe React forms with react-hook-form and Zod. Validate nested fields, async rules, dynamic fields, and integrate with UI libraries."
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
  - /recipes/frontend/typescript-discriminated-unions-exhaustive
  - /recipes/frontend/react-usememo-usecallback-performance
  - /recipes/frontend/typescript-utility-types-generics
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Build type-safe React forms with react-hook-form and Zod. Validate nested fields, async rules, dynamic fields, and integrate with UI libraries."
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

`react-hook-form` manages form state with minimal re-renders. `zod` defines validation schemas with full TypeScript inference. Together, `@hookform/resolvers/zod` connects them — the form validates against the Zod schema and the form values are typed automatically. This combination gives you type-safe, performant forms with declarative validation rules.

## When to Use

- Forms with complex validation rules (conditional, cross-field, async)
- Type-safe forms where the submitted data type matches the schema
- Forms with dynamic fields (field arrays, conditional sections)
- Large forms where performance matters — react-hook-form avoids re-rendering on every keystroke
- Forms integrated with UI component libraries (shadcn/ui, Material UI, Chakra)

## When NOT to Use

- Simple forms with 1-2 fields — `useState` and a basic check is sufficient
- Forms requiring complex visual feedback on every keystroke — controlled components might be simpler
- Non-React projects — react-hook-form is React-only

## Solution

### Setup

```bash
npm install react-hook-form @hookform/resolvers zod
```

### Basic form with Zod validation

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

### Nested object validation

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

### Cross-field validation

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

### Async validation

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

### Field arrays (dynamic fields)

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

### Conditional validation

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

### Integration with shadcn/ui

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

### Using `FormProvider` for nested components

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

### Resetting form after submission

```tsx
function EditProfileForm({ defaultValues }: { defaultValues: FormData }) {
  const { register, handleSubmit, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const onSubmit = async (data: FormData) => {
    await saveProfile(data);
    reset(data); // Reset to the new saved values
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

- Always derive the form type from the Zod schema with `z.infer<typeof schema>` — don't duplicate the type
- Use `valueAsNumber: true` for number inputs — without it, the value is a string
- Set `defaultValues` for all fields — react-hook-form works better with initial values
- Use `mode: "onBlur"` or `mode: "onChange"` to validate on blur or change instead of only on submit
- Use `useFieldArray` for dynamic lists — don't manage array indices manually
- Use `FormProvider` when form fields are split across multiple child components
- Validate on the schema, not in the component — keep validation rules in one place

## Common Mistakes

- **Not using `valueAsNumber`**: number inputs return strings by default. Without `valueAsNumber`, Zod's `z.number()` fails.
- **Missing `defaultValues`**: without defaults, checkboxes and select elements may have undefined values.
- **Validating only on submit**: set `mode: "onBlur"` for better UX — users see errors before submitting.
- **Not typing the resolver**: `useForm<FormData>({ resolver: zodResolver(schema) })` — without the generic, the form values are untyped.
- **Using controlled components unnecessarily**: react-hook-form uses uncontrolled components by default. Don't spread `value` and `onChange` on top of `register`.

## FAQ

### How do I validate on change instead of on submit?

```tsx
useForm<FormData>({
  resolver: zodResolver(schema),
  mode: "onChange",
});
```

### Can I use react-hook-form without Zod?

Yes. Use `register("name", { required: true, minLength: 2 })` for inline validation. Zod is for complex, reusable schemas.

### How do I set a field value programmatically?

```tsx
const { setValue } = useForm<FormData>();

setValue("email", "test@example.com", { shouldValidate: true });
```

### How do I watch a field value?

```tsx
const email = watch("email");
// or
const { watch } = useForm<FormData>();
const subscription = watch((value) => console.log(value));
```

### Can I use react-hook-form with React Native?

Yes. Use `Controller` for custom components:

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
