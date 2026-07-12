---


contentType: recipes
slug: oauth2-login
title: "Inicio de Sesión OAuth 2.0"
description: "Cómo implementar autenticación OAuth 2.0 con Google, GitHub y otros proveedores."
metaDescription: "Aprende a implementar inicio de sesión OAuth 2.0 en Python, JavaScript y Java. Cubre flujo de código de autorización, PKCE, parámetro state y refresh de tokens."
difficulty: intermediate
topics:
  - authentication
tags:
  - authentication
  - oauth2
  - security
  - oauth
  - jwt
relatedResources:
  - /recipes/jwt-authentication
  - /recipes/password-hashing
  - /recipes/middleware
  - /patterns/abstract-factory-pattern
  - /patterns/adapter-pattern
  - /recipes/api-key-authentication
  - /recipes/magic-link-authentication
lastUpdated: "2026-06-11"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende a implementar inicio de sesión OAuth 2.0 en Python, JavaScript y Java. Cubre flujo de código de autorización, PKCE, parámetro state y refresh de tokens."
  keywords:
    - oauth2 login tutorial
    - iniciar sesion con google
    - passport js oauth
    - spring security oauth2
    - pkce oauth2


---
## Visión General

OAuth 2.0 es el estándar de la industria para autorización delegada. Permite que los usuarios inicien sesión con cuentas existentes (Google, GitHub, Microsoft) sin exponer sus contraseñas a tu aplicación. Esta implementacion proporciona el flujo de Código de Autorización con PKCE en Python, JavaScript y Java, incluyendo validación de state y refresh de tokens.

## Cuándo Usar

Usa este recurso cuando:
- Quieras ofrecer "Iniciar sesión con Google / GitHub" en tu plataforma. Consulta [Magic Links](/recipes/authentication/magic-link-authentication) para alternativas sin contraseña.
- Necesites acceder a datos de usuarios desde APIs de terceros en su nombre
- Quieras reducir fatiga de contraseñas y mejorar seguridad
- Construyas una SaaS con requisitos de SSO enterprise

## Solución

### Python (Flask + Authlib)

```python
from flask import Flask, redirect, session, url_for
from authlib.integrations.flask_client import OAuth
import secrets

app = Flask(__name__)
app.secret_key = "dev-secret"
oauth = OAuth(app)

google = oauth.register(
    name="google",
    client_id="GOOGLE_CLIENT_ID",
    client_secret="GOOGLE_CLIENT_SECRET",
    access_token_url="https://oauth2.googleapis.com/token",
    authorize_url="https://accounts.google.com/o/oauth2/auth",
    api_base_url="https://www.googleapis.com/oauth2/v1/",
    client_kwargs={"scope": "openid email profile"},
)

@app.route("/login")
def login():
    redirect_uri = url_for("callback", _external=True)
    return google.authorize_redirect(redirect_uri)

@app.route("/callback")
def callback():
    token = google.authorize_access_token()
    user = google.get("userinfo").json()
    session["user"] = user
    return redirect("/dashboard")
```

### JavaScript (Express + Passport)

```javascript
const express = require("express");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    (accessToken, refreshToken, profile, done) => {
      // Encontrar o crear usuario en DB
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

const app = express();
app.use(passport.initialize());
app.use(passport.session());

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => res.redirect("/dashboard")
);
```

### Java (Spring Security + OAuth2 Client)

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/login").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .defaultSuccessUrl("/dashboard", true)
            )
            .logout(logout -> logout
                .logoutSuccessUrl("/")
            );
        return http.build();
    }
}
```

## Explicación

El **flujo de Código de Autorización** funciona en cuatro pasos:

1. **Redirección**: Tu app redirige al usuario a la URL de autorización del proveedor con `client_id`, `redirect_uri`, `scope` y un parámetro `state` aleatorio.
2. **Consentimiento**: El usuario inicia sesión en el proveedor y acepta los scopes solicitados.
3. **Callback**: El proveedor redirige de vuelta a tu app con un `code` de autorización.
4. **Intercambio de Token**: Tu backend intercambia el `code` por un `access_token` e `id_token` usando tu `client_secret`.

**PKCE** (Proof Key for Code Exchange) agrega un verificador secreto para prevenir ataques de interceptación en apps móviles y SPAs. **State** previene [CSRF](/recipes/authentication/session-management) vinculando el callback a la solicitud original.

## Variantes

| Flujo | Caso de Uso | Client Secret? | PKCE? |
|-------|-------------|----------------|-------|
| Código de Autorización | Apps web server-side | Sí | Opcional |
| Código de Autorización + PKCE | SPAs, apps móviles | No | Requerido |
| Implicit (obsoleto) | SPAs legacy | No | No |
| Client Credentials | Máquina a máquina | Sí | No |
| Device Code | TVs, herramientas CLI | No | No |

## Lo que funciona

- **Usa PKCE incluso para apps server**: Es una adición de una línea y elimina el riesgo de interceptación de código.
- **Valida el parámetro `state`**: Siempre compara el state en el callback con el almacenado en la sesión del usuario.
- **Almacena tokens encriptados**: Access tokens y refresh tokens son tan sensibles como contraseñas.
- **Implementa refresh de tokens**: Los access tokens expiran rápidamente; usa refresh tokens para mantener sesiones.
- **Scope mínimo**: Solo solicita permisos que tu app realmente necesita.

## Errores Comunes

- **Omitir validación de state**: Abre tu app a ataques de CSRF en login.
- **Guardar tokens en localStorage**: XSS puede robarlos. Usa [cookies httpOnly](/recipes/authentication/session-management).
- **No manejar revocación de tokens**: Los usuarios esperan que "Cerrar sesión en todos lados" funcione.
- **Hardcodear redirect URIs**: Deben coincidir exactamente con las URIs registradas en el proveedor.
- **Ignorar branding de pantalla de consentimiento**: Una pantalla de consentimiento OAuth genérica reduce tasas de conversión.

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

## Preguntas Frecuentes

### Puedo usar OAuth 2.0 para autenticación máquina a máquina?

Sí, con el flujo de **Client Credentials**. El cliente se autentica directamente con su ID y secreto (o JWT de aserción de cliente) para obtener un access token. No hay interacción de usuario. Es ideal para servicios backend, cron jobs y microservicios.

### Cómo soporto múltiples proveedores (Google, GitHub, Microsoft)?

Usa una librería que abstraiga diferencias de proveedores (Passport.js, Authlib, Spring Security). Consulta [Autenticación con API Keys](/recipes/authentication/api-key-authentication) para auth máquina a máquina. Almacena campos específicos del proveedor (`provider`, `provider_user_id`) en tu tabla de usuarios. Normaliza campos de email/nombre entre proveedores para crear un perfil de usuario unificado.

### Cuál es la diferencia entre OAuth 2.0 y OpenID Connect?

OAuth 2.0 es un framework de **autorización** ("Puede esta app acceder a mis datos?"). OpenID Connect (OIDC) es una capa de **autenticación** construida sobre OAuth 2.0 que estandariza claims de identidad (`id_token`, `/userinfo`). Si solo necesitas login (quién es este usuario?), OIDC es suficiente. Si necesitas acceso a APIs, necesitas scopes de OAuth 2.0.
- **OAuth2 token leakage via referrer**: si los OAuth2 callbacks redirigen con tokens en la URL, el Referer header puede leakear tokens a sitios third-party. Usa Referrer-Policy: no-referrer en callback pages.
- **OAuth2 PKCE downgrade**: si el servidor no requiere PKCE, atacantes pueden downgradear el flow e interceptar authorization codes. Siempre requiere PKCE para public clients.
- **OAuth2 refresh token rotation**: si los refresh tokens no se rotan en cada uso, un token robado puede usarse indefinidamente. Implementa refresh token rotation con reuse detection.
- **OAuth2 scope validation bypass**: si la validacion de scope es case-insensitive, atacantes pueden bypassar scope checks usando diferentes cases. Usa case-sensitive scope comparison.
- **OAuth2 code verifier entropy**: si el PKCE code verifier es demasiado corto, atacantes pueden brute forcearlo. Usa un verifier de al menos 43 caracteres (128 bits de entropy).
- **OAuth2 redirect URI prefix matching**: si los redirect URIs se matchean por prefix, atacantes pueden registrar https://evil.com/callback para matchear https://app.com/callback. Usa exact matching solo.
- **OAuth2 state parameter fixation**: si el state parameter es predecible, atacantes pueden adivinarlo y realizar CSRF. Usa un cryptographically random state de al menos 16 bytes.
- **OAuth2 token endpoint CORS**: si el token endpoint tiene CORS permisivo, atacantes pueden exchange codes desde cualquier origin. Restringe CORS en el token endpoint a trusted clients solo.
- **OAuth2 implicit flow token exposure**: el implicit flow retorna access tokens en el URL fragment, que es accesible a cualquier script en la pagina. Usa authorization code flow con PKCE en su lugar.
- **OAuth2 mixed content**: si el OAuth2 flow corre sobre HTTP, los tokens pueden ser interceptados. Forza HTTPS para todos los OAuth2 endpoints y redirige HTTP a HTTPS.
- **OAuth2 token binding sin mTLS**: si el token no esta bound al cliente via mTLS, un token robado puede usarse desde cualquier cliente. Implementa token binding con mTLS para clientes de alta seguridad.
- **OAuth2 resource indicator sin validacion**: si el resource parameter no se valida, atacantes pueden acceder a recursos no autorizados con un token valido. Valida el resource parameter contra una allowlist por cliente.
