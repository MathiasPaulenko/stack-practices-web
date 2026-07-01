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
relatedResources:
  - /recipes/jwt-authentication
  - /recipes/oauth2-login
  - /recipes/rate-limiting
  - /recipes/secret-management
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
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

El desafío con las API keys no es la generación — cualquier string aleatorio sirve — sino la gestión del ciclo de vida. Las keys deben generarse con suficiente entropía, transmitirse sobre TLS, validarse eficientemente, rotarse periódicamente y revocarse inmediatamente ante compromiso. Una API key filtrada embebida en una app móvil o commiteada a un repositorio público otorga a atacantes los mismos privilegios que el servicio legítimo. Esta receta cubre generación de keys con firmas HMAC, validación de requests, enforce de scopes y estrategias de rotación.

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

- **Estructura de key**: una API key bien diseñada contiene un identificador público (key ID) y una firma secreta. El key ID se loguea y muestra en dashboards; la firma se valida server-side. Nunca almacenes la key completa en logs.
- **Validación HMAC**: en lugar de almacenar cada key en base de datos y hacer lookup, puedes validar keys usando HMAC. La firma prueba que la key fue generada por tu sistema sin necesidad de ronda de base de datos. Sin embargo, almacenar metadata (owner, scopes, expiración) aún requiere lookup.
- **Control de acceso basado en scopes**: asigna scopes como `users:read`, `orders:write`, `admin:full` a cada key. El middleware chequea que el scope requerido del endpoint esté presente en la lista de scopes de la key antes de permitir acceso.
- **[Rate limiting](/recipes/api/api-rate-limiting-redis) por key**: trackea conteos de requests por API key en Redis con ventanas TTL. Aplica límites por tier — una key de tier gratis obtiene 100 requests/hora mientras que una enterprise obtiene 100,000.

## Variantes

| Enfoque | Almacenamiento | Velocidad validación | Revocación | Mejor para |
|---------|---------------|---------------------|------------|------------|
| HMAC stateless | Ninguno (firma) | Rápida (sin DB) | Imposible | Servicios internos con keys de corta duración |
| Database lookup | SQL/NoSQL | Media | Instantánea | APIs públicas con tiers de usuario |
| Redis cache | Redis | Rápida | Basada en TTL | APIs de alto tráfico |
| API Gateway managed | Cloud provider | Rápida | Vía dashboard | APIs alojadas en AWS/GCP/Azure |

## Lo que funciona

- **Nunca commitees keys a control de versiones**: usa `.gitignore` para archivos `.env` y ejecuta herramientas de escaneo de secretos (GitGuardian, TruffleHog) en pipelines CI. Rota inmediatamente cualquier key encontrada en historial de commits.
- **Usa HTTPS exclusivamente**: las API keys enviadas sobre HTTP sin encriptar son trivialmente interceptadas por sniffers de red. Rechaza peticiones HTTP planas en el load balancer o gateway.
- **Rota keys proactivamente**: establece una edad máxima de key (90 días para producción, 30 días para alta sensibilidad) y notifica a owners antes de expiración. Provee un período de gracia donde tanto la key vieja como la nueva funcionan.
- **Loguea key IDs, nunca keys completas**: al loguear requests, registra solo el prefijo del key ID (`pk_abc123...`). La porción de firma completa nunca debería aparecer en logs, mensajes de error o URLs.
- **Implementa alertas de uso**: notifica a owners de keys cuando se acercan al 80% de su límite de rate. Esto reduce sorpresas de error 429 y fomenta upgrades para crecimiento legítimo.

## Errores comunes

- **Usar formatos de key predecibles**: IDs secuenciales o keys UUIDv1 filtran tiempo de generación. Usa strings aleatorios criptográficamente seguros (32+ bytes de `secrets.token_urlsafe` o `/dev/urandom`).
- **Almacenar keys en código client-side**: apps móviles y JavaScript frontend no pueden mantener secretos. Usa OAuth2 o tokens de corta duración para aplicaciones clientes en lugar de API keys permanentes.
- **No validar scopes**: una key de solo lectura de analytics no debería poder eliminar registros. Siempre chequea scopes a nivel de endpoint, no solo durante autenticación.
- **Hardcodear keys en configuración**: almacenar keys de producción en `config.json` o variables de entorno en servidores compartidos las expone a todos los procesos. Usa un [secret manager](/recipes/devops/secret-management) con controles de acceso.

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre API keys y [JWT tokens](/recipes/authentication/jwt-authentication)?**
R: Las API keys son strings opacos típicamente usados para auth service-to-service con permisos fijos. Los JWT tokens son claims auto-contenidos usados para sesiones de usuario, frecuentemente con lifespans más cortos y permisos live. Los JWTs pueden codificar identidad de usuario; las API keys usualmente codifican identidad de aplicación.

**P: ¿Cómo revoco una API key comprometida?**
R: Si usas keys respaldadas por base de datos, elimina o deshabilita el registro de key inmediatamente. Si usas keys HMAC-only stateless, no puedes revocar individualmente — debes rotar el master secret (lo cual invalida todas las keys) o mantener una lista de bloqueo.

**P: ¿Debería encriptar API keys en reposo?**
R: Sí. Almacena keys hasheadas o encriptadas en tu base de datos. Cuando se presenta una key, hasheala y compara contra el hash almacenado. Esto previene que atacantes lean keys utilizables si la base de datos es vulnerada.

**P: ¿Puedo usar API keys para autenticación de usuarios?**
R: Las API keys están diseñadas para clientes machine, no usuarios humanos. Para autenticación de usuarios, usa session cookies, OAuth2 o OIDC. Las API keys carecen de capacidades como autenticación multifactor y son más difíciles de gestionar de forma segura por usuarios.

