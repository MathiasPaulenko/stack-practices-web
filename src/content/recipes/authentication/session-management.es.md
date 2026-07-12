---

contentType: recipes
slug: session-management
title: "Implementar Gestión de Sesiones Segura"
description: "Cómo crear, validar y expirar sesiones de usuario de forma segura en aplicaciones web usando cookies, tokens y almacenamiento server-side."
metaDescription: "Aprende gestión de sesiones segura. Crea, valida y expira sesiones con cookies HTTP-only, almacenamiento Redis y protección CSRF en aplicaciones web."
difficulty: intermediate
topics:
  - authentication
tags:
  - authentication
  - cookies
  - jwt
  - security
  - oauth
relatedResources:
  - /recipes/jwt-authentication
  - /recipes/oauth2-login
  - /recipes/password-hashing
  - /recipes/magic-link-authentication
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende gestión de sesiones segura. Crea, valida y expira sesiones con cookies HTTP-only, almacenamiento Redis y protección CSRF en aplicaciones web."
  keywords:
    - session management
    - secure cookies
    - csrf protection
    - redis sessions
    - session expiration
    - web security

---

## Visión general

Las sesiones mantienen el estado del usuario entre requests HTTP en aplicaciones web stateless. Después de que un usuario inicia sesión, el servidor crea un identificador de sesión — típicamente un token aleatorio almacenado en una cookie HTTP-only — que asocia requests subsecuentes con ese usuario autenticado. La gestión de sesiones segura es crítica: un ID de sesión filtrado es equivalente a una contraseña robada.

La gestión de sesiones segura requiere generar IDs impredecibles, transmitirlos sobre HTTPS, almacenarlos server-side con expiración, e invalidarlos en logout o actividad sospechosa. Lo siguiente cubre sesiones server-side, atributos de seguridad de cookies y protección CSRF.

## Cuándo usarlo

Usa esta receta cuando:

- Construyes aplicaciones web tradicionales server-rendered con funcionalidad de login
- Implementas dashboards de admin, carritos de e-commerce o portales de usuario
- Eliges entre sesiones stateful y autenticación [JWT](/recipes/authentication/jwt-authentication) stateless
- Protegiendo contra session fixation, hijacking y ataques CSRF. Consulta [Checklist de Seguridad de APIs](/guides/security/api-security-checklist-guide) para prácticas de seguridad minuciosas.
- Configurando stores de sesión (Redis, PostgreSQL, memoria) para aplicaciones de producción

## Solución

### Express.js con Redis Sessions

```javascript
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const redis = require('redis');

const redisClient = redis.createClient({ url: 'redis://localhost:6379' });

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'sessionId',
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 3600000,
  },
}));
```

### Spring Boot Session (Java)

```java
@Configuration
@EnableRedisHttpSession(maxInactiveIntervalInSeconds = 3600)
public class SessionConfig {
    @Bean
    public LettuceConnectionFactory connectionFactory() {
        return new LettuceConnectionFactory();
    }
}

@PostMapping("/logout")
public ResponseEntity<Void> logout(HttpSession session) {
    session.invalidate();
    return ResponseEntity.noContent().build();
}
```

### Spring Boot Auth Filter (Java)

```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req,
                                    HttpServletRequest request) {
        User user = userService.authenticate(req.email(), req.password());
        if (user == null) {
            return ResponseEntity.status(401).body("Credenciales inválidas");
        }

        HttpSession session = request.getSession(true);
        session.setAttribute("userId", user.getId());
        session.setMaxInactiveInterval(30 * 60); // 30 minutos

        return ResponseEntity.ok(Map.of("status", "logged_in"));
    }
}

@Component
public class AuthFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req,
                                    HttpServletResponse res,
                                    FilterChain chain) throws ServletException, IOException {
        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("userId") == null) {
            res.setStatus(401);
            res.getWriter().write("No autorizado");
            return;
        }
        chain.doFilter(req, res);
    }
}
```

### Python (FastAPI con JWT)

```python
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

SECRET_KEY = "your-secret-key"  # Carga desde env en producción
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        return user_id
    except JWTError:
        raise credentials_exception
```

### Protección CSRF (Django)

```python
from django.middleware.csrf import get_token

def login_view(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        # authenticate...
```

## Explicación

- **Generación de Session ID**: Debe ser criptográficamente aleatorio (al menos 128 bits) para prevenir ataques de adivinación. Frameworks como Express, Django y Spring los generan automáticamente.
- **Cookies HTTP-only**: La flag `HttpOnly` previene que JavaScript lea la cookie de sesión, mitigando el robo de sesión por XSS.
- **Flag Secure**: La flag `Secure` asegura que las cookies solo se envíen sobre HTTPS. Sin ella, un man-in-the-middle puede interceptar IDs de sesión en WiFi público.
- **SameSite**: Configurar `SameSite=Strict` previene que el navegador envíe cookies con requests cross-origin, bloqueando ataques CSRF.
- **Almacenamiento server-side**: Almacenar datos de sesión en Redis o una base de datos te permite revocar sesiones instantáneamente y compartir estado entre múltiples servidores de aplicación.

### Protección contra Session Fixation

Los ataques de session fixation ocurren cuando un atacante fuerza el ID de sesión de un usuario antes del login. Después de una autenticación exitosa, regenera el ID de sesión para invalidar el viejo:

```javascript
// Express.js: regenerar sesión después del login
router.post("/login", async (req, res) => {
  const user = await User.authenticate(req.body.email, req.body.password);
  if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

  // Regenerar ID de sesión para prevenir fixation
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: "Error de sesión" });
    req.session.userId = user.id;
    res.json({ status: "logged_in" });
  });
});
```

### Control de Sesiones Concurrentes

Para limitar el número de sesiones activas por usuario (ej. máx 3 dispositivos), trackea sesiones activas en un store server-side e invalida la más antigua cuando ocurre un nuevo login:

```python
import redis

r = redis.Redis()
MAX_SESSIONS = 3

def on_login(user_id, session_id):
    key = f"user_sessions:{user_id}"
    r.lpush(key, session_id)
    r.ltrim(key, 0, MAX_SESSIONS - 1)  # Mantener solo las N más nuevas
    # Las sesiones recortadas ahora son inválidas
```

## Variantes

| Enfoque | Almacenamiento | Crecimiento | Mejor para |
|---------|---------------|---------------|------------|
| Sesiones en memoria | RAM del servidor | Pobre (servidor único) | Desarrollo, prototipos |
| Sesiones Redis | Redis | Excelente | Aplicaciones web de producción |
| Sesiones en base de datos | PostgreSQL/MySQL | Buena | Cuando Redis no está disponible |
| [JWT cliente](/recipes/authentication/jwt-authentication) | Browser storage | Excelente | SPAs, APIs móviles |

## Lo que funciona

- **Rota session IDs después del login**: previene ataques de session fixation generando un nuevo ID de sesión inmediatamente después de la autenticación.
- **Configura expiración corta con refresh deslizante**: expira sesiones después de 30 minutos de inactividad, pero extiende la expiración en cada request válido.
- **Invalida sesiones en logout**: no solo limpies la cookie del cliente. Elimina el registro de sesión del lado del servidor para que el ID no pueda reutilizarse.
- **Vincula sesiones a IP o device fingerprinting**: para aplicaciones de alta seguridad, invalida sesiones si la dirección IP o User-Agent del usuario cambian inesperadamente.
- **Loguea y monitorea anomalías de sesión**: múltiples sesiones concurrentes desde diferentes países o ciclos rápidos de login/logout pueden señalar intentos de account takeover.
- **Configura el atributo `SameSite` en cookies**: `SameSite=Lax` previene CSRF bloqueando el envío cross-site de cookies en navegaciones top-level. Usa `SameSite=Strict` para cookies que nunca deberían enviarse cross-site.

## Errores comunes

- **Almacenar datos sensibles en cookies del cliente**: las cookies son visibles para el usuario y pueden ser robadas. Almacena solo el session ID en el cliente; mantén los datos del usuario server-side.
- **Faltar flag `secure` en producción**: HTTP-only es inútil si la cookie se transmite sobre HTTP sin encriptar.
- **Expiración infinita de sesiones**: las sesiones que nunca expiran aumentan la ventana de oportunidad para IDs de sesión robados. Siempre configura una vida máxima.
- **No regenerar IDs en cambio de privilegios**: cuando un usuario cambia su contraseña o eleva privilegios, todas las sesiones existentes deberían invalidarse.
- **Almacenar JWTs en localStorage**: JavaScript puede leer localStorage, haciéndolo vulnerable al robo de tokens por XSS. Usa cookies `HttpOnly` en su lugar. Si debes usar localStorage, implementa cabeceras Content Security Policy (CSP) para mitigar XSS.
- **No implementar timeout de sesión**: las sesiones idle que nunca expiran son un riesgo de seguridad en computadoras compartidas. Setea un timeout idle (30 minutos) y un lifetime máximo absoluto (24 horas).
- **Usar claves de firma débiles para JWTs**: una clave secreta corta o predecible permite a atacantes forjar JWTs válidos. Usa claves aleatorias de al menos 256 bits generadas con un CSPRNG.

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

**P: ¿Debería usar sesiones o JWT para autenticación?**
R: Usa sesiones server-side para aplicaciones web tradicionales donde necesitas revocación instantánea. Usa [JWT](/recipes/authentication/jwt-authentication) para APIs stateless y SPAs donde quieres evitar lookups de base de datos en cada request.

**P: ¿Cómo manejo sesiones entre múltiples servidores?**
R: Usa un store de sesión compartido como Redis o una base de datos. Cada servidor lee y escribe datos de sesión desde el store central en lugar de memoria local.

**P: ¿Cuál es la diferencia entre session fixation y session hijacking?**
R: Session fixation fuerza a la víctima a usar un ID de sesión conocido por el atacante. Session hijacking roba un ID de sesión legítimo existente. Ambos se mitigan con flags de cookies seguros y expiración corta.

**P: ¿Puedo almacenar [JWTs](/recipes/authentication/jwt-authentication) en localStorage en lugar de cookies?**
R: Puedes, pero localStorage es accesible para JavaScript y vulnerable al robo por XSS. Las cookies HTTP-only son la opción más segura para aplicaciones web.

**P: ¿Cómo manejo sesiones en una arquitectura de microservicios?**
R: Usa un store de sesión compartido (Redis, Memcached) que todos los servicios puedan leer, o cambia a sesiones stateless basadas en JWT donde cada servicio valida el token independientemente. Para JWTs, usa un API gateway para centralizar la validación de tokens e inyectar contexto de usuario en los requests downstream.

**P: ¿Cuál es la diferencia entre access tokens y refresh tokens?**
R: Los access tokens son de corta duración (15-30 minutos) y se usan para autenticación de API. Los refresh tokens son de larga duración (días a semanas) y se almacenan de forma segura (cookie HttpOnly). Cuando el access token expira, el cliente envía el refresh token para obtener un nuevo access token sin requerir que el usuario inicie sesión nuevamente.

**P: ¿Cómo testeo la seguridad de sesiones?**
R: Testea session fixation (¿cambia el ID de sesión después del login?), timeout de sesión (¿expira la sesión después de tiempo idle?) y límites de sesiones concurrentes. Usa herramientas como OWASP ZAP o Burp Suite para automatizar el testing de seguridad de sesiones. Verifica que las cookies tengan los atributos `Secure`, `HttpOnly` y `SameSite`.

**P: ¿Debería usar autenticación basada en sesiones o JWT?**
R: Usa autenticación basada en sesiones para apps web server-rendered donde controlas el servidor. Usa JWT para SPAs, apps móviles o microservicios donde la validación stateless reduce el almacenamiento server-side. Los JWTs son más difíciles de revocar; las sesiones son más difíciles de escalar. Elige basándote en tu arquitectura, no en hype.

**P: ¿Cómo implemento funcionalidad de "recuérdame"?**
R: Emite un token separado de larga duración (30-90 días) almacenado en una cookie `HttpOnly` con `SameSite=Strict`. En cada request, si la sesión ha expirado pero el token de recuérdame es válido, crea una nueva sesión y refresca el token. Usa un token aleatorio (no un JWT) almacenado en una base de datos con asociación de usuario para permitir revocación.
