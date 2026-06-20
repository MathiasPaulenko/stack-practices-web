---
contentType: recipes
slug: data-validation
title: "Validar y Sanitizar Datos de Input de Usuario"
description: "Cómo validar, sanitizar y restringir datos de input de usuario en el boundary de aplicación usando schemas, type checking y librerías de validación."
metaDescription: "Aprende validación de datos para input de usuario. Valida, sanitiza y restringe datos usando schemas, type checking y librerías de validación."
difficulty: beginner
topics:
  - data
tags:
  - data
  - data-validation
  - input-validation
relatedResources:
  - /recipes/input-validation
  - /recipes/api-security-headers
  - /recipes/xss-prevention
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende validación de datos para input de usuario. Valida, sanitiza y restringe datos usando schemas, type checking y librerías de validación."
  keywords:
    - data validation
    - input validation
    - sanitize data
    - schema validation
    - zod validation
    - pydantic models
---

## Visión general

El input de usuario es el vector de ataque principal para aplicaciones web. SQL injection, cross-site scripting y ejecución remota de código comienzan con datos no confiables entrando al sistema. La validación de datos es la primera línea de defensa — rechazar input malformado, excesivamente grande o malicioso antes de que alcance la lógica de aplicación o almacenamiento.

La validación efectiva opera en múltiples capas: client-side para feedback inmediato, server-side para seguridad, y a nivel de base de datos para integridad de datos. Esta receta se enfoca en validación server-side usando librerías de schema que combinan type safety, checking de constraints y mensajes de error automáticos.

## Cuándo usarlo

Usa esta receta cuando:

- Recibiendo input de usuario desde formularios, [APIs](/recipes/api/call-rest-api), uploads de archivos o webhooks
- Definiendo contratos de request/response de API en schemas OpenAPI o GraphQL
- Previniendo ataques de inyección rechazando tipos o formatos de datos inesperados. Consulta [Input Validation](/recipes/api/input-validation) para patrones de chequeo de boundary.
- Asegurando reglas de negocio (monto mínimo de orden, rangos de fechas válidos) en el boundary
- Construyendo pipelines de datos que consumen fuentes externas o de terceros

## Solución

### Zod (TypeScript)

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  email: z.string().email(),
  age: z.number().int().min(18).max(120),
  role: z.enum(['user', 'admin', 'moderator']),
  tags: z.array(z.string()).max(10),
});

const result = UserSchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({ errors: result.error.flatten() });
}
const user = result.data;
```

### Pydantic (Python)

```python
from pydantic import BaseModel, EmailStr, Field, validator
from typing import List

class User(BaseModel):
    email: EmailStr
    age: int = Field(..., ge=18, le=120)
    role: str = Field(..., regex='^(user|admin|moderator)$')
    tags: List[str] = Field(default_factory=list, max_length=10)

    @validator('email')
    def lowercase_email(cls, v):
        return v.lower()

try:
    user = User(**request.json)
except ValidationError as e:
    return JSONResponse(status_code=400, content={"errors": e.errors()})
```

### Joi (Node.js)

```javascript
const Joi = require('joi');

const userSchema = Joi.object({
  email: Joi.string().email().required(),
  age: Joi.number().integer().min(18).max(120).required(),
  role: Joi.string().valid('user', 'admin', 'moderator').required(),
  tags: Joi.array().items(Joi.string()).max(10),
});

const { error, value } = userSchema.validate(req.body);
if (error) {
  return res.status(400).json({ errors: error.details.map(d => d.message) });
}
```

## Explicación

- **Definición de schema**: Especifica declarativamente cómo se ve data válida — tipos, formatos, rangos, relaciones. Los schemas sirven como documentación viva y enforces contratos automáticamente.
- **Fail-fast validation**: Rechaza input inválido inmediatamente en el boundary de aplicación, antes de que cualquier lógica de negocio se ejecute. Esto previene que data malformada contamine el sistema.
- **Mensajes de error automáticos**: Las librerías de validación generan descripciones de error legibles para humanos con paths de campo. Devuélvelos a usuarios para validación de formularios o loguéalos para debugging.
- **Sanitización**: Más allá de la validación, sanitiza input recortando whitespace, normalizando case, escapando HTML o removiendo campos inesperados. Nunca confíes en que data válida sea data segura.

## Variantes

| Librería | Lenguaje | Inferencia de tipos | Mejor para |
|----------|----------|---------------------|------------|
| Zod | TypeScript | Nativa | APIs TypeScript, formularios |
| Pydantic | Python | Nativa | FastAPI, pipelines de datos |
| Joi | JavaScript | Ninguna | Express, Hapi |
| JSON Schema | Multi | Via generators | OpenAPI, cross-platform |
| class-validator | TypeScript | Nativa | NestJS, class-based |

## Mejores prácticas

- **Valida en el boundary, no en todas partes**: centraliza validación en middleware o puntos de entrada de controladores. La lógica de negocio debería asumir que la data ya está limpia. Consulta [Middleware](/recipes/api/middleware) para patrones de procesamiento de requests.
- **Whitelist, no blacklist**: define lo que está permitido en lugar de lo que está prohibido. Las blacklists son imposibles de completar y siempre dejan brechas.
- **Sanitiza antes de almacenar**: strip HTML tags de campos de texto, normaliza direcciones de email a lowercase, y recorta whitespace antes de escribir a la base de datos.
- **Retorna errores estructurados**: en lugar de un genérico "bad request," retorna `{ field: "email", message: "Invalid email format" }` para que clientes puedan resaltar el input correcto.
- **[Loguea fallas de validación](/recipes/api/logging)**: errores de validación repetidos del mismo IP o user agent pueden indicar scanning o intentos de ataque automatizado.

## Errores comunes

- **Confiar solo en validación client-side**: la validación client-side mejora UX pero es trivialmente bypassed. La validación server-side es obligatoria para seguridad.
- **Usar regex para validación de email**: la mayoría de regexes de email son incorrectos o incompletos. Usa un validador dedicado (Zod `email()`, Pydantic `EmailStr`) que sigue estándares RFC.
- **Validar después de parsear**: parsear JSON y luego validar el resultado es más seguro que validar strings crudos, pero aún requiere checks de schema. Type casting (`as User`) sin validación es peligroso.
- **Ignorar problemas de encoding**: valida que el input de texto sea UTF-8 válido y rechaza caracteres de control que podrían romper procesamiento o sistemas de logging downstream.

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre validación y sanitización?**
R: La validación chequea si la data cumple criterios ("¿es este un email válido?"). La sanitización transforma data para hacerla segura ("strip HTML tags, recorta whitespace"). Haz ambas.

**P: ¿Debería validar también en la capa de base de datos?**
R: Sí. Los constraints de base de datos (NOT NULL, CHECK, FOREIGN KEY) son la red de seguridad final. Protegen contra bugs de aplicación y acceso directo a base de datos.

**P: ¿Cómo manejo validación para objetos anidados?**
R: Todas las librerías principales soportan schemas anidados. En Zod, usa `z.object({ address: AddressSchema })`. En Pydantic, embebe un `BaseModel` como tipo de campo.

**P: ¿Puedo reutilizar el mismo schema para cliente y servidor?**
R: Con TypeScript/Zod o Python/Pydantic, sí — comparte el archivo de schema entre frontend y backend. Esto garantiza que ambos lados enforceen el mismo contrato.

