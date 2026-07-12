---



contentType: guides
slug: secure-coding-guide
title: "Prácticas de Codificación Segura — Por Lenguaje y Patrón"
description: "Guía práctica de prácticas de codificación segura en varios lenguajes: validación de entrada, seguridad de memoria, autenticación y patrones defensivos para Python, Java, JavaScript y Go."
metaDescription: "Aprende codificación segura por lenguaje: validación de entrada, seguridad de memoria y patrones defensivos. Guía práctica."
difficulty: intermediate
topics:
  - security
  - testing
tags:
  - secure-coding
  - input-validation
  - memory-safety
  - authentication
  - defensive-programming
  - guia
relatedResources:
  - /guides/owasp-top-10-guide
  - /guides/secrets-management-guide
  - /guides/cryptography-basics-guide
  - /guides/compliance-gdpr-guide
  - /guides/threat-modeling-guide
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Aprende codificación segura por lenguaje: validación de entrada, seguridad de memoria y patrones defensivos. Guía práctica."
  keywords:
    - secure-coding
    - input-validation
    - memory-safety
    - authentication
    - defensive-programming
    - guia



---

## Overview

La codificación segura es la práctica de escribir software que sea resistente a vulnerabilidades y ataques. No es una única técnica sino una mentalidad: valida cada suposición, desconfía de toda entrada y diseña para el fallo. A continuación: patrones específicos por lenguaje y técnicas defensivas universales que aplican independientemente de tu stack.

## When to Use


- For alternatives, see [Penetration Test Scope Template](/es/docs/pen-test-scope-template/).

- Escribes código que procesa entrada de usuarios o datos sensibles
- Necesitas prevenir las clases de vulnerabilidad más comunes
- Das onboarding a desarrolladores en una base de código consciente de seguridad
- Quieres establecer estándares de codificación segura para tu equipo

## Validación de Entrada

El control de seguridad más fundamental: nunca confíes en la entrada de usuarios, archivos, APIs o bases de datos sin validar.

### Validación por Lista Blanca

Rechaza lo que no permitas explícitamente.

```python
import re
from pydantic import BaseModel, validator

class UserRegistration(BaseModel):
    email: str
    username: str

    @validator('username')
    def username_alphanumeric(cls, v):
        if not re.match(r'^[a-zA-Z0-9_]{3,30}$', v):
            raise ValueError('Usuario inválido')
        return v
```

### Seguridad de Tipos

Usa tipado fuerte para prevenir ataques de confusión de tipos.

```typescript
// Validar payloads de API con Zod
import { z } from 'zod';

const UserSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  role: z.enum(['user', 'admin']),
});

const user = UserSchema.parse(req.body);
```

### Validación de Archivos Subidos

```python
import magic

ALLOWED_TYPES = {'image/png', 'image/jpeg', 'application/pdf'}
MAX_SIZE = 5 * 1024 * 1024  # 5 MB

def validate_upload(file):
    if file.size > MAX_SIZE:
        raise ValueError('Archivo demasiado grande')
    detected = magic.from_buffer(file.read(1024), mime=True)
    if detected not in ALLOWED_TYPES:
        raise ValueError('Tipo de archivo no soportado')
```

## Seguridad de Memoria

### Rust — Ownership y Borrowing

Rust previene errores de memoria en tiempo de compilación.

```rust
// Seguro: ownership previene use-after-free
fn process(data: Vec<u8>) {
    let slice = &data[0..10];
    println!("{:?}", slice);
} // data se libera aquí; no hay referencias colgantes

// Inseguro: requiere bloque unsafe explícito
unsafe {
    let raw = some_ptr.as_mut().unwrap();
}
```

### Go — Verificación de Límites

```go
// Acceso seguro a slice con verificación de límites
func safeAccess(data []byte, index int) byte {
    if index < 0 || index >= len(data) {
        panic("índice fuera de límites")
    }
    return data[index]
}
```

### Java — Evitar Deserialización de Datos No Confiables

```java
// Peligroso: ObjectInputStream con datos no confiables
ObjectInputStream ois = new ObjectInputStream(untrustedInput);
Object obj = ois.readObject(); // Puede ejecutar código arbitrario

// Más seguro: usar JSON con validación estricta de esquema
MyClass obj = objectMapper.readValue(json, MyClass.class);
```

## Patrones de Autenticación

### Manejo de Contraseñas

```python
import bcrypt

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())
```

### Lo que funciona de JWT

```python
import jwt
from datetime import datetime, timedelta

def create_token(user_id: str, secret: str) -> str:
    payload = {
        'sub': user_id,
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=1),
        'jti': generate_unique_id()  # Prevenir replay
    }
    return jwt.encode(payload, secret, algorithm='HS256')

def verify_token(token: str, secret: str) -> dict:
    return jwt.decode(token, secret, algorithms=['HS256'])
```

### Gestión de Sesiones

```java
// Cookies HttpOnly, Secure, SameSite
Cookie sessionCookie = new Cookie("session", sessionId);
sessionCookie.setHttpOnly(true);
sessionCookie.setSecure(true);
sessionCookie.setAttribute("SameSite", "Strict");
sessionCookie.setMaxAge(3600); // 1 hora
response.addCookie(sessionCookie);
```

## Patrones Defensivos

### Fallar de Forma Segura

```python
def withdraw(account, amount):
    if amount <= 0:
        raise ValueError("Monto inválido")
    if account.balance < amount:
        raise InsufficientFunds("Saldo insuficiente")
    
    # Operación atómica: deducir primero, luego transferir
    account.balance -= amount
    transaction.record(account, amount)
```

### Defensa en Profundidad

```
┌─────────────────────────────────────────┐
│         WAF / CDN (Capa 7)              │
├─────────────────────────────────────────┤
│         API Gateway (Rate Limit)        │
├─────────────────────────────────────────┤
│         Aplicación (Validación Entrada) │
├─────────────────────────────────────────┤
│         Base de Datos (Consulta Parametrizada)│
├─────────────────────────────────────────┤
│         Logs de Auditoría (Monitoreo)    │
└─────────────────────────────────────────┘
```

### Valores Seguros por Defecto

- Los nuevos usuarios no tienen permisos hasta que se otorgan explícitamente
- Las capacidades están deshabilitadas hasta que se habilitan
- Los errores revelan información mínima a atacantes
- El logging es verboso para eventos de seguridad pero nunca registra secretos

## Lista de Verificación por Lenguaje

| Lenguaje | Riesgos Clave | Mitigaciones |
|----------|---------------|--------------|
| Python | Pickle RCE, eval/exec | Usar JSON, evitar `eval`, lint con Bandit |
| Java | Deserialización, XXE | Usar Jackson de forma segura, desactivar DTDs |
| JavaScript | Prototype pollution, XSS | Validar objetos, escapar salida |
| Go | Condiciones de carrera, filtrado de panic | Usar detector `race`, recuperar panics |
| Rust | Bloques unsafe, abuso de unwrap | Minimizar `unsafe`, usar operador `?` |

## Errores Comunes

- **Registrar datos sensibles** — nunca registres contraseñas, tokens o PII
- **Ignorar advertencias del compilador** — las advertencias frecuentemente indican problemas de seguridad
- **Copiar y pegar código de Stack Overflow** — verifica las implicaciones de seguridad
- **Usar `eval` o equivalentes** — casi siempre innecesario y peligroso
- **Confiar solo en validación del lado del cliente** — siempre valida en el servidor

## FAQ

**¿Debería escribir mi propia criptografía?**
No. Usa librerías bien validadas: libsodium, OpenSSL, Bouncy Castle o criptografía nativa de la plataforma.

**¿Cómo manejo secretos en variables de entorno?**
Las variables de entorno son mejores que hardcodear pero aún visibles en dumps de procesos. Usa gestores de secretos dedicados para producción.

**¿Cuál es el principio más importante de codificación segura?**
Valida toda entrada, falla de forma segura y minimiza la superficie de ataque. La complejidad es el enemigo de la seguridad.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.


## Temas Avanzados

### Escenario: Secure Code Review para API de Pagos

```text
Sistema: API de pagos Node.js, 20 endpoints
Objetivo: Code review de seguridad antes de cada release

Checklist de secure code review:
  | Categoria | Item | Herramienta |
  |-----------|------|------------|
  | Input | Validacion con schema | Zod safeParse |
  | Input | Sanitizacion de strings | DOMPurify (HTML), escape SQL |
  | Auth | JWT verificado en cada request | middleware |
  | Auth | RBAC + scope por recurso | OPA o middleware |
  | Auth | Rate limiting en auth endpoints | express-rate-limit |
  | Crypto | bcrypt para passwords (rounds 12+) | bcrypt |
  | Crypto | AES-256-GCM para datos sensibles | crypto module |
  | Crypto | TLS 1.3 obligatorio | nginx/ALB config |
  | Output | No exponer stack traces | error handler |
  | Output | No exponer datos sensibles en respuestas | DTO + mapping |
  | Output | Headers de seguridad | helmet() |
  | Session | Expiracion de JWT (15min) | jwt.sign |
  | Session | Refresh token rotation | DB tracking |
  | Session | Logout invalida token | Redis blacklist |
  | Logging | No logear secrets/PII | winston redact |
  | Logging | Audit log de acciones criticas | audit table |
  | Deps | npm audit en CI | npm audit |
  | Deps | Snyk scan en CI | snyk test |
  | Deps | License check | license-checker |
  | Config | NODE_ENV=production | env var |
  | Config | CORS estricto | cors middleware |
  | Config | CSP headers | helmet contentSecurityPolicy |

```javascript
// Ejemplo: middleware de validacion + auth + RBAC
const { z } = require("zod");

const transferSchema = z.object({
  destinationAccountId: z.string().uuid(),
  amount: z.number().positive().max(100000),  // max 100K
  currency: z.enum(["USD", "EUR", "GBP"]),
  description: z.string().max(500).optional()
});

// Middleware chain: auth -> RBAC -> input validation -> handler
app.post("/api/transfers",
  authMiddleware,           // Verifica JWT
  roleMiddleware("user"),   // Verifica rol
  (req, res, next) => {
    const result = transferSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "Invalid input" });
    }
    req.body = result.data;
    next();
  },
  async (req, res) => {
    // Verificar ownership: el usuario solo puede transferir desde sus cuentas
    const account = await db.query(
      "SELECT owner_id FROM accounts WHERE id = $1",
      [req.body.sourceAccountId]
    );
    if (account.rows[0].owner_id !== req.user.id) {
      // Audit log de intento de acceso no autorizado
      await auditLog({ userId: req.user.id, action: "UNAUTHORIZED_TRANSFER", ip: req.ip });
      return res.status(403).json({ error: "Forbidden" });
    }
    // Ejecutar transferencia
    const transfer = await processTransfer(req.body);
    // Audit log
    await auditLog({ userId: req.user.id, action: "TRANSFER", amount: req.body.amount });
    res.json(transfer);
  }
);
```

Lecciones:
  - Validacion de input en cada endpoint, sin excepciones
  - Verificar ownership: IDOR es la vulnerabilidad mas comun
  - Audit log de acciones criticas y intentos no autorizados
  - Nunca exponer stack traces en respuestas
  - npm audit + Snyk en CI: deps vulnerables son riesgo real
```

### Que busco en un secure code review?

Input validation (todos los campos validados), autorizacion (verificar ownership y rol), manejo de errores (no exponer info sensible), logging (no logear secrets), dependencias (sin CVEs altos), configuracion (CORS, headers, TLS). Usa semgrep para escaneo automatizado en CI, pero el review manual es obligatorio para logica de negocio.
