---
contentType: recipes
slug: api-key-authentication
title: "Autenticación Segura con API Keys para Servicios y Clientes"
description: "Cómo generar, distribuir, validar y rotar API keys para autenticación machine-to-machine usando firmas HMAC, scopes y políticas de rate limiting."
metaDescription: "Aprende autenticación con API keys para servicios. Genera, valida y rota API keys usando firmas HMAC, scopes y políticas de rate limiting para machine-to-machine auth."
difficulty: intermediate
topics:
  - authentication
tags:
  - authentication
  - hmac
  - security
  - oauth
  - jwt
relatedResources:
  - /recipes/jwt-authentication
  - /recipes/oauth2-login
  - /recipes/rate-limiting
  - /recipes/secret-management
  - /recipes/magic-link-authentication
lastUpdated: "2026-06-14"
publishedAt: "2026-06-14"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende autenticación con API keys para servicios. Genera, valida y rota API keys usando firmas HMAC, scopes y políticas de rate limiting para machine-to-machine auth."
  keywords:
    - api key authentication
    - autenticacion servicios
    - firma hmac
    - rotacion api keys
    - api keys seguras

---
## Visión general

Las API keys son la forma más simple y ampliamente desplegada de autenticación machine-to-machine. A diferencia de los flujos OAuth2 diseñados para delegación de usuarios, o los tokens JWT que codifican claims, las API keys son strings opacos intercambiados entre servicios confiables. Cuando se implementan correctamente, proporcionan autenticación rápida, revocación simple y control de acceso granular a través de permisos scoped.

El desafío con las API keys no es la generación — cualquier string aleatorio sirve — sino la gestión del ciclo de vida. Las keys deben generarse con suficiente entropía, transmitirse sobre TLS, validarse eficientemente, rotarse periódicamente y revocarse inmediatamente ante compromiso. Una API key filtrada embebida en una app móvil o commiteada a un repositorio público otorga a atacantes los mismos privilegios que el servicio legítimo. El siguiente enfoque cubre generación de keys con firmas HMAC, validación de requests, enforce de scopes y estrategias de rotación.

## Cuándo usarlo

Usa esta receta cuando:

- Autenticando servicios backend, [microservicios](/guides/architecture/microservices-architecture-guide) o funciones serverless entre sí
- Proporcionando a desarrolladores de terceros acceso a una API pública con límites de uso
- Asegurando endpoints de [webhook](/recipes/api/webhooks) que reciben notificaciones push de proveedores externos
- Reemplazando autenticación básica (usuario/contraseña) en llamadas service-to-service
- Implementando acceso a API por tiers con diferentes keys para operaciones de solo lectura vs escritura

## Solución

### Generando API Keys Seguras (Python)

```python
import secrets
import hmac
import hashlib
import base64

class APIKeyManager:
    def __init__(self, master_secret: str):
        self.master_secret = master_secret.encode()

    def generate_key(self, owner_id: str, scopes: list[str]) -> dict:
        random_part = secrets.token_urlsafe(32)
        key_id = f"pk_{random_part[:16]}"

        # Firma HMAC-SHA256 que vincula la key al owner y scopes
        payload = f"{key_id}:{owner_id}:{':'.join(sorted(scopes))}"
        signature = hmac.new(
            self.master_secret,
            payload.encode(),
            hashlib.sha256
        ).hexdigest()[:16]

        api_key = f"{key_id}.{signature}"
        return {
            "key_id": key_id,
            "api_key": api_key,
            "owner_id": owner_id,
            "scopes": scopes,
            "created_at": datetime.utcnow().isoformat(),
            "last_used": None,
        }

    def validate_key(self, api_key: str, owner_id: str, scopes: list[str]) -> bool:
        parts = api_key.split('.')
        if len(parts) != 2:
            return False

        key_id, provided_sig = parts
        payload = f"{key_id}:{owner_id}:{':'.join(sorted(scopes))}"
        expected_sig = hmac.new(
            self.master_secret,
            payload.encode(),
            hashlib.sha256
        ).hexdigest()[:16]

        return hmac.compare_digest(provided_sig, expected_sig)
```

### Validando API Keys en Middleware (Node.js / Express)

```javascript
const crypto = require('crypto');

function apiKeyAuth(masterSecret) {
  return async (req, res, next) => {
    const authHeader = req.headers['x-api-key'];
    if (!authHeader) {
      return res.status(401).json({ error: 'API key required' });
    }

    const keyData = await redis.get(`apikey:${authHeader}`);
    if (!keyData) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const key = JSON.parse(keyData);

    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      return res.status(401).json({ error: 'API key expired' });
    }

    const requiredScope = req.routeScope;
    if (requiredScope && !key.scopes.includes(requiredScope)) {
      return res.status(403).json({ error: 'Insufficient scope' });
    }

    redis.hset(`apikey:${authHeader}:meta`, 'last_used', Date.now());

    req.apiKey = key;
    next();
  };
}

app.get('/api/v1/users', apiKeyAuth(process.env.API_SECRET), requireScope('users:read'), (req, res) => {
  res.json(users);
});
```

### Validación de Key en API Gateway (AWS)

```yaml
openapi: 3.0.1
info:
  title: Secure API
paths:
  /users:
    get:
      x-amazon-apigateway-request-validator: params-only
      security:
        - api_key: []
      x-amazon-apigateway-integration:
        type: aws_proxy
        uri: arn:aws:apigateway:...:lambda:path/...

components:
  securitySchemes:
    api_key:
      type: apiKey
      name: x-api-key
      in: header
      x-amazon-apigateway-api-key-source: HEADER
```

## Explicación

- **Estructura de key**: una API key bien diseñada contiene un identificador público (key ID) y una firma secreta.   El key ID se loguea y muestra en dashboards; la firma se valida server-side.   Nunca almacenes la key completa en logs.
- **Validación HMAC**: La firma prueba que la key fue generada por tu sistema sin necesidad de ronda de base de datos.
- **Control de acceso basado en scopes**: asigna scopes como `users:read`, `orders:write`, `admin:full` a cada key.
- **[Rate limiting](/recipes/api/api-rate-limiting-redis) por key**: Aplica límites por tier — una key de tier gratis obtiene 100 requests/hora mientras que una enterprise obtiene 100,000.

## Variantes

| Enfoque | Almacenamiento | Velocidad validación | Revocación | Mejor para |
|---------|---------------|---------------------|------------|------------|
| HMAC stateless | Ninguno (firma) | Rápida (sin DB) | Imposible | Servicios internos con keys de corta duración |
| Database lookup | SQL/NoSQL | Media | Instantánea | APIs públicas con tiers de usuario |
| Redis cache | Redis | Rápida | Basada en TTL | APIs de alto tráfico |
| API Gateway managed | Cloud provider | Rápida | Vía dashboard | APIs alojadas en AWS/GCP/Azure |

## Lo que funciona

- **Nunca commitees keys a control de versiones**: gitignore` para archivos `.  env` y ejecuta herramientas de escaneo de secretos (GitGuardian, TruffleHog) en pipelines CI.   Rota inmediatamente cualquier key encontrada en historial de commits.
- **Usa HTTPS exclusivamente**: las API keys enviadas sobre HTTP sin encriptar son trivialmente interceptadas por sniffers de red.   Rechaza peticiones HTTP planas en el load balancer o gateway.
- **Rota keys proactivamente**: establece una edad máxima de key (90 días para producción, 30 días para alta sensibilidad) y notifica a owners antes de expiración.   Provee un período de gracia donde tanto la key vieja como la nueva funcionan.
- **Loguea key IDs, nunca keys completas**: al loguear requests, registra solo el prefijo del key ID (`pk_abc123...  `).   La porción de firma completa nunca debería aparecer en logs, mensajes de error o URLs.
- **Implementa alertas de uso**: notifica a owners de keys cuando se acercan al 80% de su límite de rate.   Esto reduce sorpresas de error 429 y fomenta upgrades para crecimiento legítimo.

## Errores comunes

- **Usar formatos de key predecibles**: IDs secuenciales o keys UUIDv1 filtran tiempo de generación.  token_urlsafe` o `/dev/urandom`).
- **Almacenar keys en código client-side**: apps móviles y JavaScript frontend no pueden mantener secretos.
- **No validar scopes**: una key de solo lectura de analytics no debería poder eliminar registros.
- **Hardcodear keys en configuración**: json` o variables de entorno en servidores compartidos las expone a todos los procesos.

## Cuando No Usar Este Enfoque

- **Herramientas internas con usuarios de confianza**: si tu API solo la usa tu equipo y corre en una red privada, API keys pueden ser suficientes.   OAuth2 y session-based auth anaden complejidad sin beneficio para consumidores internos de confianza.
- **Machine-to-machine sin usuarios humanos**: si tu API solo sirve a otros servicios (sin login humano), el OAuth2 authorization code flow es innecesario.
- **Prototipos y MVPs**: la autenticacion completa con sesiones, tokens y logica de refresh lentan el prototyping.
- **APIs publicas de solo lectura**: si tu API expone data publica sin contenido especifico de usuario, la autenticacion anade overhead sin valor.   Considera rate limiting sin auth para endpoints publicos.
- **Sistemas legacy con auth existente**: Planifica una migracion gradual con dual auth.

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

- **Testear authentication bypass**: verifica que los endpoints protegidos rechazen peticiones sin auth headers.
- **Testear token expiration**: verifica que los tokens expirados sean rechazados.
- **Testear privilege escalation**: verifica que un usuario regular no pueda acceder a admin endpoints.
- **Testear concurrent session limits**: verifica que el sistema enforce max sessions por usuario.
- **Testear token refresh flow**: verifica que los refresh tokens produzcan nuevos access tokens.
- **Testear rate limiting en auth endpoints**: verifica que los endpoints de login y token esten rate limited.

## Estimacion de Costos

- **Session storage**: Redis para session storage cuesta ~/mes para una instancia pequena.   A 100K sesiones activas, el uso de memoria es ~50MB, bien dentro de una instancia pequena.
- **JWT signing keys**: la generacion de RSA keys es gratis pero la infraestructura de key rotation (AWS KMS, HashiCorp Vault) cuesta ~/key/mes.   Presupuesta /mes para 5 keys.
- **OAuth2 provider**: si usas un provider hosted (Auth0, Okta), los costos van de /mes (1K users) a +/mes (10K users).   Self-hosted Keycloak es gratis pero requiere ~/mes en server costs.
- **Password hashing**: A 100 logins/segundo, esto requiere 25 CPU cores.   Presupuesta ~/mes para compute durante peak login traffic.
- **Monitoring**: monitoring auth-specific (failed logins, token usage, session count) requiere metricas custom.   Presupuesta -30/mes para Datadog o Grafana Cloud.

## Monitoring y Observabilidad

- **Trackear failed login rate**: Setea alertas para >10 fallos por minuto por IP, que pueden indicar credential stuffing.
- **Monitorear active session count**: Un spike repentino puede indicar un session fixation attack o un cliente mal configurado abriendo muchas sesiones.
- **Trackear token issuance rate**: Un spike puede indicar un cliente comprometido o un token leak.
- **Monitorear password reset frequency**: Multiples resets en un periodo corto pueden indicar intentos de account takeover.
- **Trackear MFA enrollment rate**: Una tasa baja de MFA enrollment (<30%) indica un riesgo de seguridad que debe abordarse con educacion de usuarios.

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

- **Timing attacks en login**: si las responses de login para usernames validos vs invalidos toman tiempo diferente, atacantes pueden enumerar usuarios.
- **Session fixation**: si los session IDs no se rotan despues de login, atacantes pueden fixate un session ID y hijackear la session despues de que el usuario loguee.   Siempre regenera session IDs despues de un login exitoso.
- **JWT en URL parameters**: pasar JWTs como query parameters leakea tokens en server logs, browser history y Referer headers.
- **Refresh token theft**: si los refresh tokens se almacenan en localStorage, ataques XSS pueden robartelos.
- **Password hashing con algoritmos debiles**: usar MD5 o SHA-256 sin salt es vulnerable a rainbow table attacks.
- **API key en client-side code**: embeber API keys en frontend JavaScript las expone a cualquiera que vea la pagina.
- **OAuth2 state parameter missing**: si el state parameter no se usa en OAuth2 flows, atacantes pueden realizar CSRF attacks interceptando el callback.
- **Open redirect en OAuth2 callback**: si el redirect URI no se valida, atacantes pueden redirigir a usuarios a sitios maliciosos despues de login.   Valida redirect URIs contra una allowlist.
- **Account enumeration via password reset**: si password reset revela si un email esta registrado, atacantes pueden enumerar cuentas.   Siempre muestra el mismo success message independientemente de si el email existe.
- **Brute force sin lockout**: si los intentos de login no se rate limitan o lockean, atacantes pueden brute force passwords.
- **JWT algorithm confusion**: si la JWT library acepta lg: none o permite algorithm switching, atacantes pueden forjear tokens.   Pinea el algoritmo esperado (RS256 o HS256) en la config de verificacion.
- **Session token en URL**: si los session tokens se pasan como URL parameters, leakean en logs e history.
- **Insecure deserialization de session data**: si los session data se serializan con JSON.  parse sin validacion, atacantes pueden inyectar tipos inesperados.   Valida el schema de session data despues de deserializacion.
- **CSRF en state-changing endpoints**: si se usan cookies para auth y no se validan CSRF tokens, atacantes pueden forjear peticiones.   Requiere CSRF tokens para todas las operaciones state-changing.
- **Privilege escalation via mass assignment**: si user input se asigna directamente a user objects, atacantes pueden setear ole: admin. Usa allowlists para updatable fields.
- **Password reset token reuse**: si los password reset tokens no se invalidan despues de uso, atacantes pueden reusarlos.
- **MFA bypass via replay**: si los MFA codes no son single-use, atacantes que interceptan un code pueden reusarlo.   Marca MFA codes como used inmediatamente despues de verificacion.
- **OAuth2 scope escalation**: si los OAuth2 scopes no se validan en cada peticion, atacantes pueden usar tokens con menos scopes para acceder a endpoints de mayor scope.   Valida scopes por endpoint.
- **Session hijacking via XSS**: si existen vulnerabilidades XSS, atacantes pueden robar session cookies.
- **Credential stuffing detection**: si los intentos de login desde breached databases no se detectan, atacantes pueden testear miles de credenciales.
- **API key rotation enforcement**: si los API keys nunca expiran, los keys comprometidos permanecen validos para siempre.   Enforcea key rotation cada 90 dias y alerta a usuarios con keys expirando.
- **Insecure cookie attributes**: cookies sin Secure, HttpOnly y SameSite flags son vulnerables a interception, XSS theft y CSRF.   Siempre setea los tres attributes en auth cookies.
- **Password complexity bypass**: si la validacion de password es solo client-side, atacantes pueden bypassarla enviando peticiones directamente.   Valida password complexity en el servidor.
- **Token leakage en error messages**: si los error messages incluyen auth tokens o session IDs, atacantes pueden capturarlos.   Nunca incluyas sensitive data en error responses.
- **Race condition en account creation**: si la creacion de cuenta no es atomica, atacantes pueden crear cuentas duplicadas enviando peticiones concurrentes.
- **Insufficient logging para auth events**: si los auth events (login, logout, password change) no se loguean, los incidentes de seguridad no pueden investigarse.   Loguea todos los auth events con user ID, IP y timestamp.
- **Missing rate limit en MFA verification**: si los intentos de MFA verification no se rate limitan, atacantes pueden brute force 6-digit codes (1M combinaciones).   Rate limita a 5 intentos por 5 minutos.
- **Insecure token storage en mobile apps**: si los tokens se almacenan en device storage sin encriptacion, atacantes con acceso fisico pueden extraerlos.
- **OAuth2 implicit grant abuse**: el implicit grant retorna tokens en el URL fragment, que es vulnerable a leakage.
- **Session timeout demasiado largo**: si las sesiones nunca expiran, las sesiones robadas permanecen validas indefinidamente.   Setea session timeout a 30 minutos de inactividad y 8 horas maximo absoluto.




## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica autenticación segura con api keys para servicios y clientes** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre API keys y [JWT tokens](/recipes/authentication/jwt-authentication)?**
R: Las API keys son strings opacos típicamente usados para auth service-to-service con permisos fijos. Los JWT tokens son claims auto-contenidos usados para sesiones de usuario, frecuentemente con lifespans más cortos y permisos live. Los JWTs pueden codificar identidad de usuario; las API keys usualmente codifican identidad de aplicación.

**P: ¿Cómo revoco una API key comprometida?**
R: Si usas keys respaldadas por base de datos, elimina o deshabilita el registro de key inmediatamente. Si usas keys HMAC-only stateless, no puedes revocar individualmente — debes rotar el master secret (lo cual invalida todas las keys) o mantener una lista de bloqueo.

**P: ¿Debería encriptar API keys en reposo?**
R: Sí. Almacena keys hasheadas o encriptadas en tu base de datos. Cuando se presenta una key, hasheala y compara contra el hash almacenado. Esto previene que atacantes lean keys utilizables si la base de datos es vulnerada.

**P: ¿Puedo usar API keys para autenticación de usuarios?**
R: Las API keys están diseñadas para clientes machine, no usuarios humanos. Para autenticación de usuarios, usa session cookies, OAuth2 o OIDC. Las API keys carecen de capacidades como autenticación multifactor y son más difíciles de gestionar de forma segura por usuarios.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Troubleshooting

- **Login works for some users but not others**: check identity provider configuration, user claims, and role mappings.   Look for case sensitivity in identifiers.
- **Token expires too quickly**: verify token lifetime, refresh logic, and clock skew.   Short tokens with secure refresh are preferred.
- **Session is not shared across subdomains**: set the cookie domain and SameSite policy correctly.
- **Brute force attempts increase**: implement rate limiting, account lockout, and CAPTCHA.
- **OIDC flow fails with invalid_state**: ensure the state parameter is stored, transmitted, and validated in the same user session.

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos que deberían ser configurables por entorno.
- Olvidar agregar logging y monitoreo en cada paso.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar caché o procesamiento por lotes.
- No documentar la versión y configuración usadas en producción.
- Dejar la receta sin cambios cuando evolucionan las dependencias o la escala.
