---
contentType: recipes
slug: magic-link-authentication
title: "Implementar Login Sin Contraseña con Magic Links"
description: "Cómo construir autenticación passwordless segura usando links mágicos de tiempo limitado enviados por email, con generación de tokens, validación y prevención de ataques replay."
metaDescription: "Aprende login sin contraseña con magic links. Links de tiempo limitado por email con generación de tokens, validación y prevención replay."
difficulty: intermediate
topics:
  - authentication
tags:
  - authentication
relatedResources:
  - /recipes/jwt-authentication
  - /recipes/session-management
  - /recipes/oauth2-login
  - /recipes/two-factor-authentication
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende login sin contraseña con magic links. Links de tiempo limitado por email con generación de tokens, validación y prevención replay."
  keywords:
    - magic links
    - autenticacion sin contraseña
    - login por email
    - link unico
    - token seguro
---

## Visión general

La fatiga de contraseñas es real. Los usuarios olvidan contraseñas, las reutilizan entre sitios, caen en ataques de phishing o abandonan flujos de registro cuando se les pide crear otra credencial compleja. La autenticación con magic links elimina las contraseñas por completo enviando una URL de tiempo limitado y uso único a la dirección de email del usuario. Al hacer clic en el link, el usuario se autentica instantáneamente, creando una experiencia de login fluida sin requerir contraseña alguna.

El modelo de seguridad de los magic links se basa en el supuesto de que la cuenta de email del usuario es segura. Si un atacante gana acceso al inbox del usuario, puede interceptar magic links igual que podría interceptar emails de reset de contraseña. La defensa es mantener los tokens de corta duración (5-15 minutos), de uso único, criptográficamente aleatorios, y transmitidos exclusivamente sobre HTTPS. Esta receta cubre generación de tokens, entrega de email, lógica de validación y hardening contra ataques replay.

## Cuándo usarlo

Usa esta receta cuando:

- Reduciendo fricción en flujos de onboarding y login de usuarios
- Construyendo aplicaciones donde los usuarios inician sesión infrecuentemente (semanal o mensualmente)
- Sirviendo usuarios que luchan con password managers o requisitos complejos
- Complementando [login social](/recipes/authentication/oauth2-login) (Google, GitHub) con una alternativa basada en email
- Creando herramientas internas o productos B2B donde el email es la identidad primaria

## Solución

### Generando Magic Links (Python / FastAPI)

```python
import secrets
import hashlib
from datetime import datetime, timedelta
from itsdangerous import URLSafeTimedSerializer

serializer = URLSafeTimedSerializer(secret_key="your-app-secret")

def generate_magic_link(email: str, redirect_url: str) -> str:
    nonce = secrets.token_urlsafe(32)
    token_data = f"{email}:{nonce}"
    token = serializer.dumps(token_data)

    db.execute(
        """INSERT INTO magic_tokens (email, nonce, token_hash, expires_at, used)
           VALUES (:email, :nonce, :token_hash, :expires, FALSE)""",
        {
            "email": email.lower().strip(),
            "nonce": nonce,
            "token_hash": hashlib.sha256(token.encode()).hexdigest(),
            "expires": datetime.utcnow() + timedelta(minutes=15),
        }
    )
    db.commit()

    return f"https://app.example.com/auth/verify?token={token}"
```

### Validando Magic Links (Python / FastAPI)

```python
from fastapi import HTTPException

def verify_magic_link(token: str) -> dict:
    try:
        token_data = serializer.loads(token, max_age=900)
    except Exception:
        raise HTTPException(status_code=400, detail="Link inválido o expirado")

    email, nonce = token_data.split(":", 1)
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    row = db.execute(
        "SELECT * FROM magic_tokens WHERE token_hash = :hash AND used = FALSE",
        {"hash": token_hash}
    ).fetchone()

    if not row:
        raise HTTPException(status_code=400, detail="Link ya usado o inválido")

    if row["expires_at"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Link expirado")

    db.execute(
        "UPDATE magic_tokens SET used = TRUE, used_at = :now WHERE id = :id",
        {"now": datetime.utcnow(), "id": row["id"]}
    )
    db.commit()

    # Crear [sesión](/recipes/authentication/session-management) o [JWT](/recipes/authentication/jwt-authentication) de usuario
    user = get_or_create_user(email)
    session = create_session(user.id)

    return {"user": user, "session": session}
```

### Enviando Emails de Magic Link (Node.js / Nodemailer)

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendMagicLink(email, magicLink) {
  await transporter.sendMail({
    from: '"App Name" <login@app.example.com>',
    to: email,
    subject: 'Tu link de inicio de sesión',
    html: `
      <p>Haz clic en el link de abajo para iniciar sesión. Expira en 15 minutos.</p>
      <a href="${magicLink}" style="padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px;">
        Iniciar sesión en App
      </a>
      <p>Si no solicitaste esto, ignora este email.</p>
    `,
    text: `Iniciar sesión: ${magicLink}\n\nExpira en 15 minutos.`,
  });
}
```

## Explicación

- **Generación de tokens**: los tokens de magic links deben ser impredecibles. Usa `secrets.token_urlsafe(32)` o un serializer firmado como `itsdangerous` para generar tokens que sean aleatorios y protegidos en integridad.
- **Enforce de uso único**: la propiedad de seguridad central. Cada token se marca `used = TRUE` inmediatamente al primer uso. Cualquier intento posterior con el mismo token falla, previniendo ataques replay donde un link interceptado se reutiliza.
- **Límites de tiempo**: los tokens expiran después de 15 minutos por defecto. Esto limita la ventana de oportunidad para un atacante que intercepta un email. No hagas tokens válidos por horas o días.
- **Normalización de email**: normaliza direcciones de email a lowercase y trim antes de almacenar y buscar. Esto previene que `User@Example.com` y `user@example.com` sean tratadas como identidades diferentes.

## Variantes

| Enfoque | Almacenamiento de token | Expiración | UX | Mejor para |
|---------|------------------------|------------|-----|------------|
| Database-backed | Tabla SQL | 15 min | Clic en link | Web apps estándar |
| Signed JWT | Stateless | 5-10 min | Clic en link | Alta escala, corta duración |
| SMS code | En memoria/Redis | 5 min | Ingreso de código | Apps mobile-first |
| Push notification | Stateless | 1 min | Tap para aprobar | Banca, alta seguridad |

## Mejores prácticas

- **Envía desde un subdominio dedicado**: usa `auth@login.yourapp.com` o similar. Esto ayuda a usuarios a reconocer emails legítimos y te permite implementar políticas DMARC, DKIM y SPF específicamente para emails de autenticación.
- **Incluye fallback de texto plano**: siempre provee una versión en texto plano del magic link junto a HTML. Algunos clientes de email deshabilitan HTML o lo renderizan mal. El link debe ser cliqueable o copiable en forma de texto.
- **Invalida al solicitar nuevo**: si un usuario solicita un segundo magic link antes de usar el primero, invalida el token anterior. Esto previene confusión de múltiples links válidos y limita la superficie de ataque.
- **Registra patrones sospechosos**: alerta cuando múltiples requests de magic links apuntan a diferentes emails desde la misma IP, o cuando un solo email recibe docenas de requests en una ventana corta. Ambos pueden indicar ataques de enumeración.
- **Combina con [confianza de dispositivo](/recipes/authentication/two-factor-authentication)**: para seguridad adicional, requiere verificación de email en nuevos dispositivos o navegadores. Almacena una cookie de fingerprint de dispositivo después del primer login exitoso y solicita re-verificación en dispositivos no reconocidos.

## Errores comunes

- **Permitir reutilización de token**: un magic link que puede cliquearse dos veces es tan peligroso como una contraseña reutilizable. Siempre marca los tokens como consumidos al primer uso y rechaza intentos subsecuentes con el mismo hash.
- **Enviar tokens en parámetros URL sobre HTTP**: los magic links deben usar `https://` exclusivamente. Un token enviado sobre HTTP es expuesto a sniffers de red, poisoning de DNS y ataques man-in-the-middle.
- **No [limitar requests](/recipes/api/rate-limiting) de links**: sin rate limiting, un atacante puede inundar el inbox de una víctima con miles de emails de login, constituyendo acoso y potencialmente enmascarando un ataque real. Limita a 3-5 requests por email por hora.
- **Almacenar tokens crudos en logs**: nunca loguees la URL completa del magic link. Loguea solo la dirección de email, timestamp y flag de éxito/fracaso. Si los logs filtran, los tokens crudos otorgan acceso inmediato.

## Preguntas frecuentes

**P: ¿Los magic links son menos seguros que las contraseñas?**
R: Tienen diferentes modelos de amenaza. Los magic links dependen de la seguridad del email; las contraseñas dependen de la memoria del usuario y hashing. Para la mayoría de aplicaciones de consumo, los magic links son tan seguros o más seguros que contraseñas débiles elegidas por usuarios, y eliminan ataques de credential stuffing por completo.

**P: ¿Qué pasa si el email de un usuario es comprometido?**
R: El atacante puede iniciar sesión interceptando magic links. Esto es equivalente a un compromiso de flujo de reset de contraseña. Mitiga con confianza de dispositivo, alertas de login sospechosas y MFA opcional para acciones sensibles post-login. Consulta [Gestión de Sesiones](/recipes/authentication/session-management) para capas adicionales de seguridad.

**P: ¿Puedo usar magic links para apps móviles?**
R: Sí, usando deep links o universal links. El magic link abre la app directamente vía un scheme de URL registrado (`yourapp://auth/verify?token=...`). Asegúrate de que la app valide el token server-side, no solo en el cliente.

**P: ¿Debería ofrecer tanto magic links como contraseñas?**
R: La mayoría de aplicaciones modernas elige un método primario. Ofrecer ambos crea confusión y aumenta la superficie de ataque. Si necesitas un fallback, usa login social (Google, Apple) en lugar de mantener un sistema separado de contraseñas.

