---
contentType: recipes
slug: input-validation
title: "Validación de Input"
description: "Cómo validar input de usuarios de forma segura usando schemas, type checking y sanitización en Python, JavaScript y Java."
metaDescription: "Ejemplos prácticos de validación de input en Python, JavaScript y Java. Aprende validación de schemas, sanitización y manejo seguro de formularios."
difficulty: beginner
topics:
  - api
tags:
  - api
  - input-validation
  - java
  - rest
  - http
relatedResources:
  - /recipes/handle-errors
  - /recipes/regular-expressions
  - /patterns/design/strategy-pattern
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejemplos prácticos de validación de input en Python, JavaScript y Java. Aprende validación de schemas, sanitización y manejo seguro de formularios."
  keywords:
    - validación de input
    - validación de schemas
    - pydantic
    - zod
    - joi
    - jakarta validation
    - validación de formularios
    - sanitización de datos
    - python validación
    - javascript validación
---

## Visión general

La validación de input asegura que los datos que entran a tu aplicación cumplan con los formatos, tipos y restricciones esperados antes de procesarlos. Es la primera línea de defensa contra ataques de inyección, corrupción de datos y errores de aplicación.

Nunca confíes en el input del usuario. Valida en el límite — lo más cerca posible de la fuente — y falla rápido con mensajes de error claros.

## Cuándo usarlo

Usa esta recipe cuando:

- Aceptas datos de APIs, formularios o uploads de usuarios
- Parseas datos externos (JSON, CSV, XML) antes de procesarlos
- Aplicas reglas de negocio en payloads entrantes
- Previenes ataques de inyección (SQL, XSS, command injection). Consulta [Guía de Seguridad](/guides/security/security-best-practices-guide) para patrones de defensa.
- Conviertes y sanitizas strings no confiables a valores tipados

## Solución

### Python (Pydantic)

```python
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional

class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    age: int = Field(..., ge=0, le=150)
    bio: Optional[str] = Field(default=None, max_length=500)
    
    @validator('name')
    def name_must_not_be_blank(cls, v):
        if not v.strip():
            raise ValueError('name cannot be blank')
        return v.strip()

# Uso
try:
    user = UserCreate(name="Ada Lovelace", email="ada@example.com", age=36)
    print(user.dict())
except ValueError as e:
    print(f"Validation error: {e}")
```

### JavaScript (Zod)

```javascript
const { z } = require('zod');

const UserCreate = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
  bio: z.string().max(500).optional(),
});

// Uso
try {
  const user = UserCreate.parse({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    age: 36,
  });
  console.log(user);
} catch (e) {
  console.error('Validation error:', e.errors);
}

// Safe parse (retorna resultado en lugar de lanzar)
const result = UserCreate.safeParse({ name: '', email: 'bad' });
if (!result.success) {
  console.error(result.error.issues);
}
```

### Java (Jakarta Validation / Hibernate Validator)

```java
import jakarta.validation.*;
import jakarta.validation.constraints.*;

public class UserCreate {
    @NotBlank
    @Size(min = 1, max = 100)
    private String name;
    
    @NotBlank
    @Email
    private String email;
    
    @Min(0)
    @Max(150)
    private int age;
    
    @Size(max = 500)
    private String bio;
    
    // Getters y setters omitidos
}

// Uso
ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
Validator validator = factory.getValidator();

UserCreate user = new UserCreate("Ada Lovelace", "ada@example.com", 36, null);
Set<ConstraintViolation<UserCreate>> violations = validator.validate(user);

for (ConstraintViolation<UserCreate> v : violations) {
    System.out.println(v.getPropertyPath() + ": " + v.getMessage());
}
```

## Explicación

- **Validación schema-first**: Define la forma esperada una vez, valida en todas partes
- **Coerción de tipos**: Librerías como Pydantic y Zod pueden hacer cast seguro de strings a números, booleans y fechas
- **Validadores custom**: Extiende schemas con lógica de negocio (ej. fortaleza de contraseña, checks de unicidad)
- **Agregación de errores**: Recolecta todos los errores de validación en una sola respuesta para mejor UX

## Lo que funciona

- **Valida temprano**: Rechaza input inválido en el límite de la API, no profundo en la capa de servicio
- **Usa schemas estrictos**: Prefiere allowlists explícitas sobre tipos catch-all permisivos
- **Sanitiza después de validar**: Escapa HTML, trim whitespace, normaliza Unicode
- **Retorna errores estructurados**: Retorna errores a nivel de campo para que la UI los muestre inline. Consulta [Manejo de Errores](/recipes/api/handle-errors) para patrones de respuesta de error.
- **Nunca confíes solo en validación frontend**: Siempre re-valida en el servidor
- **Loguea fallos de validación**: Monitorea patrones que pueden indicar ataques. Consulta [Logging](/recipes/api/logging) para agregación de logs.

## Errores comunes

- Confiar en validación client-side como única defensa. Consulta [Guía de Seguridad](/guides/security/security-best-practices-guide) para validación server-side.
- Usar regex para validación compleja cuando una librería de schemas está disponible
- Permitir coerción de tipos implícita sin reglas explícitas
- Retornar errores crudos de base de datos en lugar de mensajes de validación amigables
- Validar demasiado tarde, después de mutación parcial de estado

## Preguntas frecuentes

**P: ¿Debería validar en el controller o en la capa de servicio?**
R: Valida en el límite (controller / capa de API). La capa de servicio debe asumir datos limpios y validados.

**P: ¿Cómo manejo validación de objetos anidados y arrays?**
R: Las tres librerías soportan schemas anidados. Define modelos hijos y reférencialos en modelos padres.

**P: ¿Cuál es la diferencia entre sanitización y validación?**
R: La validación verifica si el input cumple restricciones. La sanitización limpia el input removiendo o escapando caracteres no deseados.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
