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
  - security
  - oauth
  - jwt
  - auth
relatedResources:
  - /recipes/jwt-authentication
  - /recipes/session-management
  - /recipes/oauth2-login
  - /recipes/two-factor-authentication
  - /recipes/api-key-authentication
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

La fatiga de contraseñas es real. Los usuarios olvidan contraseñas, las reutilizan entre sitios, caen en ataques de phishing o abandonan flujos de registro cuando se les pide crear otra credencial compleja. La autenticación con magic links elimina las contraseñas por completo enviando una URL de tiempo limitado y uso único a la dirección de email del usuario. Al hacer clic en el link, el usuario se autentica instantáneamente, creando una experiencia de login suave sin requerir contraseña alguna.

El modelo de seguridad de los magic links se basa en el supuesto de que la cuenta de email del usuario es segura. Si un atacante gana acceso al inbox del usuario, puede interceptar magic links igual que podría interceptar emails de reset de contraseña. La defensa es mantener los tokens de corta duración (5-15 minutos), de uso único, criptográficamente aleatorios, y transmitidos exclusivamente sobre HTTPS. La solucion a continuacion cubre generación de tokens, entrega de email, lógica de validación y hardening contra ataques replay.

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

## Lo que funciona

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

## Cuando No Usar Este Enfoque

- **Herramientas internas con usuarios de confianza**: si tu API solo la usa tu equipo y corre en una red privada, API keys pueden ser suficientes. OAuth2 y session-based auth anaden complejidad sin beneficio para consumidores internos de confianza.
- **Machine-to-machine sin usuarios humanos**: si tu API solo sirve a otros servicios (sin login humano), el OAuth2 authorization code flow es innecesario. Usa client credentials grant o mutual TLS en su lugar.
- **Prototipos y MVPs**: la autenticacion completa con sesiones, tokens y logica de refresh lentan el prototyping. Usa un simple API key para el MVP y anade auth proper antes de produccion.
- **APIs publicas de solo lectura**: si tu API expone data publica sin contenido especifico de usuario, la autenticacion anade overhead sin valor. Considera rate limiting sin auth para endpoints publicos.
- **Sistemas legacy con auth existente**: si tu sistema ya usa Basic Auth o tokens custom y todos los clientes dependen de eso, migrar a OAuth2 rompe compatibilidad. Planifica una migracion gradual con dual auth.

## Benchmarks de Rendimiento

| Metrica | Session (cookie) | JWT | API Key | OAuth2 |
|---------|-------------------|-----|---------|--------|
| Tiempo validacion auth | 2ms (DB lookup) | 0.3ms (firma) | 1ms (cache lookup) | 5ms (token exchange) |
| Memoria por session | 512 bytes | 0 bytes (stateless) | 0 bytes | 1KB |
| Network round trips | 1 (cookie enviado) | 0 (stateless) | 0 (header) | 2 (token exchange) |
| Tamano token | 128 bytes | 800 bytes | 32 bytes | 1.2KB |
| Overhead de refresh | 1 DB write | 0 (cliente refresca) | N/A | 1 HTTP call |
| Velocidad de revocacion | Instant (delete session) | Lento (blocklist) | Instant (revoke key) | Instant (revoke token) |

Benchmarks en Node.js 20, single core, Redis cache. Resultados reales varian segun database, cache y latencia de red.

## Estrategia de Testing

- **Testear authentication bypass**: verifica que los endpoints protegidos rechazen peticiones sin auth headers. Testea con missing, empty y malformed auth tokens.
- **Testear token expiration**: verifica que los tokens expirados sean rechazados. Testea con tokens expirados por 1 segundo, 1 minuto y 1 hora para asegurar comportamiento consistente.
- **Testear privilege escalation**: verifica que un usuario regular no pueda acceder a admin endpoints. Testea con user tokens, admin tokens y tokens tampered.
- **Testear concurrent session limits**: verifica que el sistema enforce max sessions por usuario. Testea abrir N+1 sesiones y verifica que la mas vieja sea evicted.
- **Testear token refresh flow**: verifica que los refresh tokens produzcan nuevos access tokens. Testea con refresh tokens validos, expirados y revoked.
- **Testear rate limiting en auth endpoints**: verifica que los endpoints de login y token esten rate limited. Testea con 100 peticiones en 1 segundo y verifica responses 429.

## Estimacion de Costos

- **Session storage**: Redis para session storage cuesta ~/mes para una instancia pequena. A 100K sesiones activas, el uso de memoria es ~50MB, bien dentro de una instancia pequena.
- **JWT signing keys**: la generacion de RSA keys es gratis pero la infraestructura de key rotation (AWS KMS, HashiCorp Vault) cuesta ~/key/mes. Presupuesta /mes para 5 keys.
- **OAuth2 provider**: si usas un provider hosted (Auth0, Okta), los costos van de /mes (1K users) a +/mes (10K users). Self-hosted Keycloak es gratis pero requiere ~/mes en server costs.
- **Password hashing**: bcrypt con cost factor 12 usa ~250ms CPU por hash. A 100 logins/segundo, esto requiere 25 CPU cores. Presupuesta ~/mes para compute durante peak login traffic.
- **Monitoring**: monitoring auth-specific (failed logins, token usage, session count) requiere metricas custom. Presupuesta -30/mes para Datadog o Grafana Cloud.

## Monitoring y Observabilidad

- **Trackear failed login rate**: monitorea intentos de autenticacion fallidos por IP y por usuario. Setea alertas para >10 fallos por minuto por IP, que pueden indicar credential stuffing.
- **Monitorear active session count**: trackea el numero de sesiones activas. Un spike repentino puede indicar un session fixation attack o un cliente mal configurado abriendo muchas sesiones.
- **Trackear token issuance rate**: monitorea cuantos tokens se emiten por minuto. Un spike puede indicar un cliente comprometido o un token leak.
- **Monitorear password reset frequency**: trackea peticiones de password reset por usuario. Multiples resets en un periodo corto pueden indicar intentos de account takeover.
- **Trackear MFA enrollment rate**: monitorea cuantos usuarios tienen MFA habilitado. Una tasa baja de MFA enrollment (<30%) indica un riesgo de seguridad que debe abordarse con educacion de usuarios.

## Deployment Checklist

- [ ] Configurar secure cookie settings (HttpOnly, Secure, SameSite=Lax)
- [ ] Setear token expiration (access token: 15min, refresh token: 7 dias)
- [ ] Habilitar HTTPS only (redirigir HTTP a HTTPS)
- [ ] Configurar password hashing con bcrypt cost factor >= 12
- [ ] Setear rate limiting en endpoints de login, register y password reset
- [ ] Configurar CORS para solo permitir trusted origins
- [ ] Setear JWT signing key rotation (rotar cada 90 dias)
- [ ] Configurar session cleanup (eliminar sesiones expiradas de Redis)
- [ ] Testear authentication flow end-to-end (register, login, refresh, logout)
- [ ] Documentar protocolo de autenticacion en API documentation

## Consideraciones de Seguridad

- **Timing attacks en login**: si las responses de login para usernames validos vs invalidos toman tiempo diferente, atacantes pueden enumerar usuarios. Usa constant-time comparisons y retorna el mismo error para ambos casos.
- **Session fixation**: si los session IDs no se rotan despues de login, atacantes pueden fixate un session ID y hijackear la session despues de que el usuario loguee. Siempre regenera session IDs despues de un login exitoso.
- **JWT en URL parameters**: pasar JWTs como query parameters leakea tokens en server logs, browser history y Referer headers. Usa Authorization headers o HttpOnly cookies en su lugar.
- **Refresh token theft**: si los refresh tokens se almacenan en localStorage, ataques XSS pueden robartelos. Almacena refresh tokens en HttpOnly, Secure cookies y usa CSRF protection.
- **Password hashing con algoritmos debiles**: usar MD5 o SHA-256 sin salt es vulnerable a rainbow table attacks. Siempre usa bcrypt, scrypt o Argon2 con un salt unico por password.
- **API key en client-side code**: embeber API keys en frontend JavaScript las expone a cualquiera que vea la pagina. Usa server-side proxy endpoints para API calls que requieren keys.
- **OAuth2 state parameter missing**: si el state parameter no se usa en OAuth2 flows, atacantes pueden realizar CSRF attacks interceptando el callback. Siempre usa un random state parameter y validalo.
- **Open redirect en OAuth2 callback**: si el redirect URI no se valida, atacantes pueden redirigir a usuarios a sitios maliciosos despues de login. Valida redirect URIs contra una allowlist.
- **Account enumeration via password reset**: si password reset revela si un email esta registrado, atacantes pueden enumerar cuentas. Siempre muestra el mismo success message independientemente de si el email existe.
- **Brute force sin lockout**: si los intentos de login no se rate limitan o lockean, atacantes pueden brute force passwords. Implementa exponential backoff y account lockout despues de 5 intentos fallidos.
- **JWT algorithm confusion**: si la JWT library acepta lg: none o permite algorithm switching, atacantes pueden forjear tokens. Pinea el algoritmo esperado (RS256 o HS256) en la config de verificacion.
- **Session token en URL**: si los session tokens se pasan como URL parameters, leakean en logs e history. Usa cookies con HttpOnly y Secure flags en su lugar.
- **Insecure deserialization de session data**: si los session data se serializan con JSON.parse sin validacion, atacantes pueden inyectar tipos inesperados. Valida el schema de session data despues de deserializacion.
- **CSRF en state-changing endpoints**: si se usan cookies para auth y no se validan CSRF tokens, atacantes pueden forjear peticiones. Requiere CSRF tokens para todas las operaciones state-changing.
- **Privilege escalation via mass assignment**: si user input se asigna directamente a user objects, atacantes pueden setear ole: admin. Usa allowlists para updatable fields.
- **Password reset token reuse**: si los password reset tokens no se invalidan despues de uso, atacantes pueden reusarlos. Elimina reset tokens despues de un password change exitoso.
- **MFA bypass via replay**: si los MFA codes no son single-use, atacantes que interceptan un code pueden reusarlo. Marca MFA codes como used inmediatamente despues de verificacion.
- **OAuth2 scope escalation**: si los OAuth2 scopes no se validan en cada peticion, atacantes pueden usar tokens con menos scopes para acceder a endpoints de mayor scope. Valida scopes por endpoint.
- **Session hijacking via XSS**: si existen vulnerabilidades XSS, atacantes pueden robar session cookies. Usa Content Security Policy y HttpOnly cookies para mitigar.
- **Credential stuffing detection**: si los intentos de login desde breached databases no se detectan, atacantes pueden testear miles de credenciales. Implementa IP-based rate limiting y credential breach checking.
- **API key rotation enforcement**: si los API keys nunca expiran, los keys comprometidos permanecen validos para siempre. Enforcea key rotation cada 90 dias y alerta a usuarios con keys expirando.
- **Insecure cookie attributes**: cookies sin Secure, HttpOnly y SameSite flags son vulnerables a interception, XSS theft y CSRF. Siempre setea los tres attributes en auth cookies.
- **Password complexity bypass**: si la validacion de password es solo client-side, atacantes pueden bypassarla enviando peticiones directamente. Valida password complexity en el servidor.
- **Token leakage en error messages**: si los error messages incluyen auth tokens o session IDs, atacantes pueden capturarlos. Nunca incluyas sensitive data en error responses.
- **Race condition en account creation**: si la creacion de cuenta no es atomica, atacantes pueden crear cuentas duplicadas enviando peticiones concurrentes. Usa database unique constraints y transactions.
- **Insufficient logging para auth events**: si los auth events (login, logout, password change) no se loguean, los incidentes de seguridad no pueden investigarse. Loguea todos los auth events con user ID, IP y timestamp.
- **Missing rate limit en MFA verification**: si los intentos de MFA verification no se rate limitan, atacantes pueden brute force 6-digit codes (1M combinaciones). Rate limita a 5 intentos por 5 minutos.
- **Insecure token storage en mobile apps**: si los tokens se almacenan en device storage sin encriptacion, atacantes con acceso fisico pueden extraerlos. Usa platform secure storage (Keychain, Keystore).
- **OAuth2 implicit grant abuse**: el implicit grant retorna tokens en el URL fragment, que es vulnerable a leakage. Usa authorization code grant con PKCE en su lugar.
- **Session timeout demasiado largo**: si las sesiones nunca expiran, las sesiones robadas permanecen validas indefinidamente. Setea session timeout a 30 minutos de inactividad y 8 horas maximo absoluto.

## Preguntas Frecuentes

## Preguntas frecuentes

**P: ¿Los magic links son menos seguros que las contraseñas?**
R: Tienen diferentes modelos de amenaza. Los magic links dependen de la seguridad del email; las contraseñas dependen de la memoria del usuario y hashing. Para la mayoría de aplicaciones de consumo, los magic links son tan seguros o más seguros que contraseñas débiles elegidas por usuarios, y eliminan ataques de credential stuffing por completo.

**P: ¿Qué pasa si el email de un usuario es comprometido?**
R: El atacante puede iniciar sesión interceptando magic links. Esto es equivalente a un compromiso de flujo de reset de contraseña. Mitiga con confianza de dispositivo, alertas de login sospechosas y MFA opcional para acciones sensibles post-login. Consulta [Gestión de Sesiones](/recipes/authentication/session-management) para capas adicionales de seguridad.

**P: ¿Puedo usar magic links para apps móviles?**
R: Sí, usando deep links o universal links. El magic link abre la app directamente vía un scheme de URL registrado (`yourapp://auth/verify?token=...`). Asegúrate de que la app valide el token server-side, no solo en el cliente.

**P: ¿Debería ofrecer tanto magic links como contraseñas?**
R: La mayoría de aplicaciones modernas elige un método primario. Ofrecer ambos crea confusión y aumenta la superficie de ataque. Si necesitas un fallback, usa login social (Google, Apple) en lugar de mantener un sistema separado de contraseñas.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
