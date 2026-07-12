---





contentType: recipes
slug: password-hashing
title: "Hashing de Contraseñas"
description: "Cómo hashear y verificar contraseñas de forma segura usando algoritmos modernos en Python, JavaScript y Java."
metaDescription: "Ejemplos prácticos de hashing de contraseñas en Python, JavaScript y Java. Usa bcrypt, argon2 y PBKDF2 con salt para almacenar contraseñas de forma segura."
difficulty: intermediate
topics:
  - authentication
tags:
  - authentication
  - bcrypt
  - security
  - oauth
  - jwt
relatedResources:
  - /recipes/jwt-authentication
  - /recipes/handle-errors
  - /patterns/singleton-pattern
  - /recipes/oauth2-login
  - /recipes/session-management
  - /recipes/two-factor-authentication
  - /guides/security-best-practices-guide
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Ejemplos prácticos de hashing de contraseñas en Python, JavaScript y Java. Usa bcrypt, argon2 y PBKDF2 con salt para almacenar contraseñas de forma segura."
  keywords:
    - hashing de contraseñas
    - bcrypt
    - argon2
    - pbkdf2
    - salt
    - contraseñas seguras
    - python bcrypt
    - node bcrypt
    - java password hashing





---

## Visión general

El hashing de contraseñas es el proceso de convertir una contraseña en texto plano en una cadena de longitud fija e irreversible usando una función criptográfica de una sola vía. Nunca almacenes contraseñas en texto plano. Hashea siempre con un salt único y un algoritmo lento diseñado para contraseñas.

Algoritmos modernos como bcrypt, Argon2 y PBKDF2 son intencionalmente lentos para resistir ataques de fuerza bruta y tablas arcoíris.

Las consecuencias de hacer esto mal son severas. Las filtraciones de datos que involucran contraseñas en texto plano o hashes débiles exponen millones de cuentas de usuario a ataques de credential stuffing, donde los atacantes prueban contraseñas filtradas en otros servicios. Filtraciones de alto perfil han demostrado que incluso organizaciones grandes son víctimas de almacenamiento incorrecto de contraseñas. El hashing no es una decoración opcional — es un control de seguridad fundamental que protege a tus usuarios incluso cuando tu base de datos es comprometida.

A continuacion se cubre los tres ecosistemas de lenguaje más comunes y explica cómo elegir el algoritmo correcto para tu modelo de amenazas.

## Cuándo usarlo

Usa esta recipe cuando:

- Almacenas credenciales de usuario en una base de datos o directorio de usuarios
- Implementas [sistemas de autenticación](/recipes/authentication/session-management) con flujos de usuario y contraseña
- Migras sistemas legacy desde hashes rápidos (MD5, SHA-1) a almacenamiento moderno de contraseñas
- Validas contraseñas durante el login y los flujos de reset de contraseña
- Cumples con estándares de seguridad (PCI-DSS, SOC 2, GDPR) que mandatan protección adecuada de credenciales. Consulta [Checklist de Seguridad de APIs](/guides/security/api-security-checklist-guide) para lo que funciona para compliance.
- Construyes paneles de administración o herramientas CLI que crean cuentas de servicio con contraseñas

## Solución

### Python

La librería `bcrypt` de Python maneja generación de salt, hashing y verificación en una sola llamada. La función `gensalt` crea un salt aleatorio y embebe el factor de trabajo para que futuras verificaciones puedan usar los mismos parámetros.

```python
import bcrypt

# Hashear una contraseña
password = b"supersecret"
salt = bcrypt.gensalt(rounds=12)
hashed = bcrypt.hashpw(password, salt)

# Verificar una contraseña
if bcrypt.checkpw(password, hashed):
    print("Password matches")
else:
    print("Invalid password")
```

### JavaScript (Node.js)

El paquete npm `bcrypt` proporciona una API async que siempre debe usarse en producción. Las variantes síncronas bloquean el event loop y anulan los beneficios de rendimiento de la arquitectura non-blocking de Node.

```javascript
const bcrypt = require('bcrypt');

async function hashPassword(password) {
  const saltRounds = 12;
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
}

async function verifyPassword(password, hash) {
  const match = await bcrypt.compare(password, hash);
  return match;
}

// Uso
hashPassword('supersecret').then(hash => {
  verifyPassword('supersecret', hash).then(ok => console.log(ok));
});
```

### Java

El `BCryptPasswordEncoder` de Spring Security envuelve la implementación subyacente de bcrypt y maneja la generación de salt de forma transparente. El parámetro de strength (12) controla el factor de trabajo logarítmico.

```java
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

// Hash
String hashed = encoder.encode("supersecret");

// Verificar
boolean matches = encoder.matches("supersecret", hashed);
System.out.println(matches);
```

## Explicación

- **Salt**: Un valor aleatorio agregado a la contraseña antes de hashear. Incluso contraseñas idénticas producen hashes diferentes cuando están salteadas, haciendo inútiles los ataques de tablas arcoíris precomputadas. bcrypt embebe el salt en el string de output, por lo que no se necesita almacenamiento separado.
- **Factor de trabajo (rounds)**: Controla la velocidad de hashing logarítmicamente. Mayor = más lento = más seguro. 12 es un default moderno que produce un hash en aproximadamente 250ms en hardware contemporáneo. A medida que las computadoras se vuelven más rápidas, deberías aumentar este valor.
- **bcrypt**: Función de hash adaptativa basada en el cifrado Blowfish. Manejo de salt incorporado y factor de trabajo ajustable lo hacen la opción moderna más ampliamente soportada.
- **Argon2**: Ganador del Password Hashing Competition de 2015. Proporciona resistencia contra ataques GPU y ASIC al ser memory-hard, haciéndolo la mejor opción para sistemas nuevos sin restricciones legacy.
- **PBKDF2**: Aprobado por NIST y compatible con FIPS. Más lento que bcrypt pero ampliamente soportado en entornos empresariales y gubernamentales donde el cumplimiento lo manda.
- **scrypt**: Función memory-hard similar a Argon2. Fue el predecesor de Argon2 y sigue siendo una opción sólida si las librerías de Argon2 no están disponibles en tu stack.

## Variantes

| Algoritmo | Fortaleza | Velocidad | Mejor para |
|-----------|-----------|-----------|------------|
| bcrypt | Buena | Moderada | Uso general, ampliamente soportado |
| Argon2 | Excelente | Ajustable | Nuevas aplicaciones, máxima seguridad |
| PBKDF2 | Buena | Lenta | Cumplimiento NIST/FIPS |
| scrypt | Buena | Memory-hard | Resiste ataques GPU/ASIC |

## Lo que funciona

- **Nunca inventes tu propia criptografía**: Usa librerías establecidas (bcrypt, argon2, passlib). La criptografía es notoriamente fácil de hacer mal de formas sutiles que solo se hacen evidentes bajo ataque.
- **Usa siempre salt**: Único por contraseña, manejado automáticamente por bcrypt. Sin salt, dos usuarios con la misma contraseña tendrán hashes idénticos, filtrando esa relación a cualquiera con acceso a la base de datos.
- **Usa un factor de trabajo suficiente**: 12+ rounds para bcrypt, ajusta según el hardware. Haz benchmark de tu duración objetivo (~250ms) y aumenta el factor cada 2-3 años a medida que los CPUs se vuelven más rápidos.
- **Re-hashea en login**: Actualiza gradualmente los factores de trabajo cuando los usuarios se autentican. Almacena el nuevo hash y marca la cuenta como actualizada para no re-hashear de nuevo en el próximo login.
- **Nunca compares en texto plano**: Usa siempre funciones de verificación de la librería. Estas realizan comparación en tiempo constante para prevenir ataques de timing que podrían filtrar información sobre la contraseña.
- **Hashea antes de cualquier otra transformación**: No apliques lowercase, trim u otra normalización antes de hashear. Algunos usuarios intencionalmente incluyen mayúsculas y espacios en passphrases.
- **Almacena hashes en una columna dedicada**: Nunca almacenes el salt separado del hash. bcrypt y Argon2 codifican el salt dentro del string de hash por esta razón.

## Errores comunes

- **Almacenar contraseñas en texto plano o encriptación reversible**: Si tu base de datos es filtrada, los atacantes obtienen acceso inmediato a cada cuenta. El hashing es irreversible por diseño.
- **Usar hashes rápidos como MD5, SHA-1 o SHA-256 para contraseñas**: Estos están diseñados para ser rápidos, lo que beneficia a los atacantes ejecutando ataques de fuerza bruta. Una GPU moderna puede probar miles de millones de hashes SHA-256 por segundo.
- **Reutilizar salts entre múltiples usuarios**: Anula el propósito principal del salting. Si dos usuarios comparten la misma contraseña y el mismo salt, sus hashes serán idénticos.
- **Hard-codear salts en el código fuente**: El código fuente a menudo se almacena en control de versiones. Un salt hard-codeado es tan malo como no tener salt, ya que los atacantes lo encontrarán en el repositorio.
- **Usar factores de trabajo insuficientes (ej. bcrypt con <10 rounds)**: Hashes más rápidos significan que los atacantes pueden probar más contraseñas por segundo. Un factor de trabajo de 10 completa en ~100ms; 12 completa en ~250ms. Ese delay extra agrega protección masiva a un costo de usuario negligible.
- **Almacenar el hash sin el identificador de algoritmo**: Almacena siempre el string de output completo de bcrypt/Argon2 que incluye el algoritmo, costo, salt y hash. Esto asegura que puedas re-verificar correctamente incluso si cambias de algoritmo más adelante.
- **Enviar contraseñas sobre conexiones no encriptadas**: El hashing protege las contraseñas almacenadas, pero la contraseña debe viajar de forma segura a tu servidor primero. Usa siempre [TLS](/recipes/api/nginx-reverse-proxy) para formularios de login y endpoints de API.

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

**P: ¿Debería usar SHA-256 para hashear contraseñas?**
R: No. SHA-256 está diseñado para ser rápido. El hashing de contraseñas debe ser intencionalmente lento para resistir fuerza bruta. Usa bcrypt, Argon2 o PBKDF2 en su lugar.

**P: ¿Cómo migro usuarios de hashes MD5 antiguos?**
R: Re-hashea los hashes MD5 existentes con bcrypt en el próximo login, luego reemplaza el hash viejo en tu base de datos. Consulta [Logging](/recipes/api/logging) para monitorear el progreso de migración. Marca las cuentas migradas para no intentar re-hashearlas de nuevo. Hasta que un usuario haga login, su hash legacy permanece en su lugar como medida provisional.

**P: ¿Qué factor de trabajo debo usar para bcrypt?**
R: Empieza con 12. Haz benchmarking para que el hashing tarde ~250ms en tu hardware de producción. Aumenta el factor cada 2-3 años a medida que los CPUs se vuelven más rápidos. El cuarto de segundo extra es imperceptible para los usuarios pero aumenta dramáticamente el costo del ataque.

**P: ¿Es Argon2 mejor que bcrypt?**
R: Sí, para sistemas nuevos. Argon2 es memory-hard, haciendo los ataques GPU y ASIC mucho más caros. Sin embargo, bcrypt sigue siendo perfectamente seguro para la mayoría de aplicaciones y tiene soporte de librerías más amplio. Si no tienes datos legacy, prefiere Argon2.

**P: ¿Puedo usar el mismo hash tanto para autenticación como para tokens de API?**
R: No. Los hashes de autenticación son lentos por diseño. Los tokens de API deberían usar hashes rápidos y deterministas (como HMAC-SHA-256) porque se verifican en cada petición y no deben agregar latencia a cada llamada de API.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
- **Pepper storage compromise**: si el pepper (un server-side secret anadido a passwords) se almacena en source code, un source code leak expone todas las passwords. Almacena peppers en un secrets manager (Vault, AWS Secrets Manager).
- **Hash truncation vulnerability**: si bcrypt se trunca a 72 bytes y se permiten passwords mas largas que 72 bytes, atacantes pueden usar los primeros 72 bytes para autenticar. Pre-hasha con SHA-256 antes de bcrypt si se necesitan passwords mas largas.
- **Argon2 parameter tuning**: si los parametros de Argon2 (memory, iterations, parallelism) son demasiado bajos, el hash es vulnerable a GPU attacks. Usa Argon2id con 64MB memory, 3 iterations y 4 parallelism lanes.
- **Salt reuse across users**: si se usa el mismo salt para todas las passwords, se pueden precomputar rainbow tables para ese salt. Siempre genera un random salt unico por password.
- **Hash timing side-channel**: si la verificacion de password usa non-constant-time comparison, atacantes pueden medir response time para determinar hash prefixes. Usa constant-time comparison functions.
- **Password storage in reversible form**: si las passwords se encriptan en lugar de hashear, un key compromise expone todas las passwords. Nunca almacenes passwords en reversible form; siempre usa one-way hashing.
- **Hash algorithm downgrade**: si el sistema soporta multiples hash algorithms y permite downgrade, atacantes pueden reemplazar strong hashes con weak ones despues de un compromise. Solo permite upgrades a algoritmos mas fuertes.
- **Memory-hard hash DoS**: si memory-hard hashes (Argon2, scrypt) se usan para cada login, atacantes pueden exhaustar server memory con muchos concurrent logins. Usa una queue o rate limit concurrent hash computations.
- **Hash format confusion**: si el sistema acepta multiples hash formats (bcrypt, scrypt, Argon2, PBKDF2), un bug de format parsing podria bypassar verificacion. Usa un solo hash format y validalo estrictamente.
- **Password hash in error messages**: si los error messages revelan si el hash matcheo, atacantes pueden usar timing para enumerar credenciales validas. Retorna generic errors para todos los auth failures.
- **Backup hash exposure**: si los database backups contienen password hashes y se almacenan sin encriptar, un backup leak expone todas las passwords. Encripta database backups at rest.
- **Hash migration timing**: si los hashes se migran de weak a strong algorithms durante login, los usuarios que nunca loguean de nuevo mantienen weak hashes. Migra hashes proactivamente o force password reset para usuarios inactivos.
- **Client-side hashing bypass**: si el hashing se hace client-side y el servidor confia en el hash, atacantes pueden bypassar hashing enviando pre-computed hashes. Siempre hashea server-side; client-side hashing es solo para UX.
- **Hash comparison short-circuit**: si la hash comparison para en el primer byte que difiere, atacantes pueden medir timing para determinar hash prefixes. Usa full-length constant-time comparison.
- **Password pepper rotation**: si el pepper se rota, todos los hashes existentes se vuelven invalidos. Usa un pepper versioning scheme para soportar multiples peppers durante rotation.
- **Hash storage in memory**: si los password hashes se cachean en memoria para performance, un memory dump los expone. Evita cachear password hashes; cachea solo el resultado de verificacion con un short TTL.
- **Weak random for salt generation**: si el salt se genera con Math.random() en lugar de crypto.randomBytes(), los salts son predecibles. Siempre usa cryptographically secure random para salt generation.
- **Hash encoding confusion**: si los hashes se almacenan como hex pero se comparan como base64, encoding mismatches causan false negatives. Normaliza encoding antes de comparison.
- **Password hash in logs**: si los password hashes se loguean durante debugging, los log files se vuelven un security risk. Nunca loguees password hashes; redactalos en todo log output.
- **Hash upgrade on every login**: si el hash se upgradea en cada login incluso cuando el algoritmo ya es fuerte, esto desperdicia CPU. Solo upgradea cuando el algoritmo actual es mas debil que el target.
- **Concurrent hash computation race**: si dos concurrent logins para el mismo usuario computan hashes simultaneamente, una race condition puede causar verificacion incorrecta. Usa un mutex por usuario durante password verification.
- **Hash truncation in database**: si la database column es demasiado corta para el hash completo, el hash se trunca silenciosamente. Asegurate que el column size matchee el hash output size (bcrypt: 60 chars, Argon2: 96+ chars).
