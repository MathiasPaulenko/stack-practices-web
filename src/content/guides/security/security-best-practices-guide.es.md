---
contentType: guides
slug: security-best-practices-guide
title: "Guía de Mejores Prácticas de Seguridad"
description: "Una Referencia Detallada de seguridad de aplicaciones: autenticación, autorización, validación de inputs, gestión de secretos y prevención de vulnerabilidades comunes."
metaDescription: "Aprende prácticas esenciales de seguridad: autenticación, validación de inputs, gestión de secretos y prevención de vulnerabilidades OWASP."
difficulty: intermediate
topics:
  - security
  - authentication
tags:
  - security
  - authentication
  - owasp
  - secrets
  - encryption
  - authorization
  - vulnerability
  - best-practices
relatedResources:
  - /recipes/password-hashing
  - /recipes/jwt-authentication
  - /recipes/input-validation
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende prácticas esenciales de seguridad: autenticación, validación de inputs, gestión de secretos y prevención de vulnerabilidades OWASP."
  keywords:
    - seguridad aplicaciones
    - owasp top 10
    - autenticacion segura
    - gestion de secretos
    - validacion de inputs
    - autorizacion
---

## Overview

La seguridad no es una feature que agregas después—es un fundamento que construyes en cada capa de tu aplicación. A continuación: las prácticas esenciales para construir software seguro.

## When to Apply

- Construyes cualquier aplicación que maneje datos de usuarios
- Procesas pagos o información sensible
- Expones APIs a internet
- Trabajas en industrias reguladas (salud, finanzas, etc.)

## Authentication & Authorization

### Usa Librerías de Autenticación Probadas

Nunca inventes tu propia autenticación. Usa librerías probadas en batalla:

| Lenguaje | Librería Recomendada |
| -------- | ------------------- |
| Node.js | Passport.js, Auth.js |
| Python | Django Auth, Flask-Login |
| Java | Spring Security, OAuth2 |
| Go | casbin, gorilla/sessions |

### Autenticación Multi-Factor (MFA)

Requiere MFA para:
- Cuentas de administrador
- Acceso a producción
- Operaciones financieras

### Patrones de Autorización

**Control de Acceso Basado en Roles (RBAC)**

```
User -> Role -> Permission -> Resource
```

**Principio del Mínimo Privilegio**

Otorga solo los permisos necesarios para cada rol. Audita permisos trimestralmente.

## Validación de Inputs

### Valida en el Límite

```python
# Python con Pydantic
from pydantic import BaseModel, EmailStr, constr

class CreateUserRequest(BaseModel):
    email: EmailStr
    password: constr(min_length=12)
    role: constr(pattern=r'^(user|admin)$')
```

### Sanitiza Output

- Usa queries parametrizadas (nunca concatenación de strings)
- Escapa HTML antes de renderizar en navegadores
- Codifica JSON de forma segura

## Gestión de Secretos

### Nunca Hardcodees Secretos

```bash
# ❌ Mal
API_KEY = "sk-live-abc123"

# ✅ Bien
API_KEY = os.environ.get("API_KEY")
```

### Usa un Gestor de Secretos

| Herramienta | Caso de uso |
| ---- | -------- |
| HashiCorp Vault | Enterprise, políticas complejas |
| AWS Secrets Manager | Aplicaciones nativas de AWS |
| Azure Key Vault | Aplicaciones nativas de Azure |
| Doppler | Multi-cloud, developer-friendly |
| 1Password Secrets | Equipos pequeños, setup simple |

## Seguridad de Dependencias

### Mantén Dependencias Actualizadas

```bash
# Escanear vulnerabilidades
npm audit
pip-audit
snyk test
```

### Archivos de Lock

Siempre commitea archivos de lock (`package-lock.json`, `poetry.lock`, `Cargo.lock`) para asegurar builds reproducibles.

## Prevención del OWASP Top 10

| Vulnerabilidad | Prevención |
| ------------- | ---------- |
| Injection | [Queries parametrizadas](/recipes/security/sql-injection-prevention), [validación de inputs](/recipes/api/input-validation) |
| Broken Access Control | Denegar por defecto, forzar ownership |
| Cryptographic Failures | [HTTPS en todas partes](/recipes/api/handle-cors), [encriptar en reposo](/recipes/security/encryption-at-rest) |
| Insecure Design | Threat modeling, requerimientos de seguridad |
| Security Misconfiguration | Plataformas mínimas, remover defaults |
| Vulnerable Components | Escaneo de dependencias, auto-updates |
| Auth Failures | MFA, contraseñas fuertes, [límites de sesión](/recipes/security/oauth2-pkce-spa) |
| Software Integrity | Verificar paquetes, commits firmados |
| Logging Failures | [Loggear eventos de auth](/recipes/observability/structured-logging), [monitorear anomalías](/recipes/observability/metrics-collection) |
| SSRF | Whitelist de URLs, deshabilitar protocolos innecesarios |

## Comunicación Segura

### HTTPS en Todas Partes

- Redirige HTTP a HTTPS
- Usa headers HSTS
- Mantén certificados TLS actualizados

### Seguridad de APIs

- [Rate limiting](/recipes/api/rate-limiting) (prevenir fuerza bruta)
- Versionado de APIs (deprecación graceful)
- Firmado de requests (verificar integridad)

## Logging & Monitoreo

### Qué Loggear

- Intentos de autenticación (éxito y fracaso)
- Fallas de autorización
- Errores de validación de input
- Patrones de tráfico inusuales

### Qué NO Loggear

- Contraseñas
- API keys
- Información médica personal
- Números de tarjeta de crédito

## Security Checklist

- [ ] Autenticación usa MFA donde se requiere
- [ ] Autorización verifica ownership del recurso
- [ ] Todos los inputs validados y sanitizados
- [ ] Secretos almacenados en un gestor de secretos
- [ ] Dependencias escaneadas por vulnerabilidades
- [ ] HTTPS forzado para todo el tráfico
- [ ] Headers de seguridad configurados (CSP, HSTS)
- [ ] Rate limiting habilitado en APIs públicas
- [ ] Datos sensibles encriptados en reposo
- [ ] Eventos de seguridad loggeados y monitoreados

## FAQ

**Q: ¿Con qué frecuencia debería actualizar dependencias?**
A: Al menos mensualmente. Habilita Dependabot o Renovate para PRs automatizados.

**Q: ¿Es JWT seguro?**
A: JWT es seguro cuando se implementa correctamente: expiración corta, algoritmos de firma fuertes (RS256/ES256), almacenamiento seguro de secretos, y transmisión solo por HTTPS.

**Q: ¿Debería encriptar todo en la base de datos?**
A: Encripta campos sensibles (PII, credenciales, tokens). La encriptación en reposo debería estar habilitada a nivel de [base de datos](/guides/databases/database-design-guide).

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.


## Temas Avanzados

### Escenario: Hardening de API Node.js para Produccion

```javascript
// 1. Helmet: headers de seguridad HTTP
const helmet = require("helmet");
app.use(helmet());
// X-Content-Type-Options: nosniff
// X-Frame-Options: DENY
// Strict-Transport-Security: max-age=31536000
// Content-Security-Policy: default-src self

// 2. Rate limiting
const rateLimit = require("express-rate-limit");
app.use("/api", rateLimit({
  windowMs: 60 * 1000,  // 1 minuto
  max: 100,              // 100 requests por minuto
  message: "Demasiadas requests"
}));

// 3. CORS estricto
const cors = require("cors");
app.use(cors({
  origin: ["https://app.example.com"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// 4. Input validation (Zod)
const { z } = require("zod");
const userSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(12).max(128),
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9 ]+$/)
});
app.post("/api/users", (req, res) => {
  const result = userSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  // ... procesar
});

// 5. SQL injection prevention (parameterized queries)
app.get("/api/users/:id", async (req, res) => {
  // NUNCA: `SELECT * FROM users WHERE id = ${req.params.id}`
  // SIEMPRE: queries parametrizadas
  const result = await pool.query(
    "SELECT id, email, name FROM users WHERE id = $1",
    [req.params.id]
  );
  res.json(result.rows[0]);
});

// 6. JWT seguro
const jwt = require("jsonwebtoken");
const token = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: "15m", algorithm: "RS256" }
);

// 7. Audit logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
      ip: req.ip,
      userId: req.user?.id,
    });
  });
  next();
});

// 8. Dependency scanning en CI
// npm audit --audit-level=high
// npx snyk test
// npx trivy fs .
```

### Que headers de seguridad son obligatorios?

X-Content-Type-Options: nosniff (prevenir MIME sniffing), Strict-Transport-Security: max-age=31536000 (forzar HTTPS), X-Frame-Options: DENY (prevenir clickjacking), Content-Security-Policy: default-src self (prevenir XSS), Referrer-Policy: no-referrer (minimizar info expuesta). Usa helmet() en Express para configurar todos automaticamente.
