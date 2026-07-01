---
contentType: docs
slug: api-security-review-template
title: "Plantilla de Revisión de Seguridad de API"
description: "Una plantilla de checklist para revisar autenticación de API, rate limiting y cumplimiento OWASP."
metaDescription: "Usa esta plantilla de revisión de seguridad de API para auditar autenticación, autorización, rate limiting, validación de entrada y riesgos OWASP Top 10."
difficulty: intermediate
topics:
  - security
tags:
  - security
  - api
  - owasp
  - authentication
  - rate-limiting
  - template
relatedResources:
  - /guides/api-security-checklist-guide
  - /guides/security-best-practices-guide
  - /recipes/hmac-request-signing
  - /docs/incident-response-playbook-template
  - /docs/data-retention-policy-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de revisión de seguridad de API para auditar autenticación, autorización, rate limiting, validación de entrada y riesgos OWASP Top 10."
  keywords:
    - seguridad
    - api
    - owasp
    - autenticación
    - rate-limiting
    - plantilla
---
## Visión General

La seguridad de APIs no es solo un checkpoint previo al lanzamiento. Es un proceso continuo. Los cambios en código, dependencias y configuración introducen nuevos vectores de ataque. Esta plantilla proporciona un checklist completo para revisar la postura de seguridad de cualquier API, cubriendo autenticación, autorización, validación de entrada, rate limiting, logging y manejo de secretos.

## Cuándo Usar

Usa este recurso cuando:
- Realizas una revisión de seguridad antes de lanzar una nueva API
- Auditas una API existente después de un incidente o actualización de dependencias
- Onboardings de equipo: garantizas que nuevos desarrolladores conocen la línea base de seguridad

## Solución

```markdown
# Revisión de Seguridad de API: `<Nombre de la API>`

## 1. Información General

| Campo | Valor |
|-------|-------|
| Nombre de API | `nombre` |
| Versión | `v1.0.0` |
| Tipo de API | `REST / GraphQL / gRPC / WebSocket` |
| Exposición | `Pública / Interna / Socio` |
| Responsable de Seguridad | `@nombre` |
| Fecha de Revisión | `YYYY-MM-DD` |

## 2. Autenticación

- [ ] Todos los endpoints requieren autenticación, excepto los documentados como públicos
- [ ] OAuth 2.0 / OIDC tokens usan el header `Authorization: Bearer <token>`
- [ ] Las API keys se pasan en el header `X-Api-Key`, nunca en query params
- [ ] Los tokens tienen tiempo de expiración apropiado (< 1 hora para access tokens)
- [ ] Los refresh tokens se rotan en cada uso y tienen expiración
- [ ] Los tokens JWT se validan (firma, expiración, issuer, audience)
- [ ] La autenticación usa HTTPS/TLS 1.2+ obligatoriamente
- [ ] No se aceptan credenciales hardcodeadas en código fuente

## 3. Autorización

- [ ] Se verifica autorización después de autenticación en cada endpoint
- [ ] Los usuarios solo pueden acceder a sus propios recursos (control de acceso basado en recursos)
- [ ] Las listas y búsquedas limitan resultados al scope del usuario actual
- [ ] Los roles de administrador están protegidos con MFA donde aplique
- [ ] Se audita cada acción sensible (creación, eliminación, acceso a datos)

## 4. Validación de Entrada

- [ ] Todas las entradas son validadas contra un schema (OpenAPI, JSON Schema)
- [ ] Se rechazan payloads con tipos de datos incorrectos, no se coercen silenciosamente
- [ ] Se limitan tamaños de string, arrays y objetos anidados
- [ ] Se sanitizan datos de usuario antes de usar en queries de base de datos (prepared statements)
- [ ] Se usa una lista de permitidos para nombres de archivos y tipos MIME en uploads
- [ ] Se valida el Content-Type del request contra el body real

## 5. Rate Limiting

| Tipo de Cliente | Límite | Ventana | Acción al Exceder |
|-----------------|--------|---------|-------------------|
| No autenticado | 60 req/min | 1 minuto | 429 + header Retry-After |
| Autenticado | 1,000 req/min | 1 minuto | 429 + header Retry-After |
| Premium | 10,000 req/min | 1 minuto | Throttle escalonado |

- [ ] Rate limiting por clientId / IP, no global
- [ ] Headers de rate limit presentes en todas las respuestas (X-RateLimit-Limit, Remaining, Reset)
- [ ] DDoS: capa de CDN o WAF maneja ataques volumétricos

## 6. Manejo de Secretos

- [ ] No hay credenciales, tokens o claves de firma en código fuente
- [ ] Los secretos se inyectan como variables de entorno o via secret manager (Vault, AWS SM)
- [ ] Las claves de firma de JWT se rotan periódicamente
- [ ] Los logs no contienen tokens, contraseñas o números de tarjeta

## 7. Logging y Monitoreo

- [ ] Cada request loguea: timestamp, clientId, endpoint, método, statusCode, latencia
- [ ] Los errores 5xx loguean stack traces sin datos de usuario
- [ ] Los intentos de autenticación fallidos se loguean con IP y timestamp
- [ ] Se monitorea para patrones de uso anómalo (picos de tráfico, scraping)

## 8. Cumplimiento OWASP Top 10

| Riesgo | Estado | Evidencia |
|--------|--------|-----------|
| A01: Broken Access Control | [ ] Aprobado / [ ] Pendiente | Lista de verificación de RBAC |
| A02: Cryptographic Failures | [ ] Aprobado / [ ] Pendiente | TLS 1.2+, hashing bcrypt/Argon2 |
| A03: Injection | [ ] Aprobado / [ ] Pendiente | Prepared statements, parameterized queries |
| A04: Insecure Design | [ ] Aprobado / [ ] Pendiente | Threat model documentado |
| A05: Security Misconfiguration | [ ] Aprobado / [ ] Pendiente | Hardening checklist |
| A06: Vulnerable Components | [ ] Aprobado / [ ] Pendiente | Dependencias auditadas |
| A07: Auth Failures | [ ] Aprobado / [ ] Pendiente | Auth checklist completado |
| A08: Data Integrity Failures | [ ] Aprobado / [ ] Pendiente | Firmas de paquetes verificadas |
| A09: Logging Failures | [ ] Aprobado / [ ] Pendiente | Logs centralizados, retención definida |
| A10: SSRF | [ ] Aprobado / [ ] Pendiente | Validación de URLs salientes |
```

## Explicación

Esta plantilla agrupa la seguridad de API en capas concéntricas. La **autenticación** verifica quién eres. La **autorización** verifica qué puedes hacer. La **validación de entrada** limpia todo lo que entra. El **rate limiting** previene abuso. El **manejo de secretos** protege claves de compromiso. El **logging** permite detección de intrusiones. El checklist OWASP Top 10 asegura que no se omitan riesgos conocidos. Cada casilla sin marcar es un riesgo documentado que debe priorizarse antes del lanzamiento.

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| GraphQL | Verificar depth/complexity de queries | Limitar nesting y costo computacional |
| gRPC | Verificar certificados mTLS | Validar SANs y expiración |
| WebSocket | Validar origen y rate limitar frames | Prevenir DoS por flooding de frames |
| API Socio | Revisar HMAC request signing | Verificar timestamp y replay attacks |

## Lo que funciona

1. Ejecutar esta revisión en cada PR que modifica autenticación, autorización o validación de entrada
2. Automatizar lo que se pueda: linting de secretos, análisis estático de seguridad (SAST)
3. Documentar excepciones de seguridad con riesgo residual y plan de mitigación
4. Rotar secretos inmediatamente después de un incidente o rotación de personal
5. Realizar penetration testing externo al menos una vez al año

## Errores Comunes

1. Suponer que una API interna no necesita autenticación (la red interna no es un perímetro)
2. Usar expresiones regulares para validar email o URLs en lugar de parsers dedicados
3. Loggear el cuerpo completo del request que puede contener tokens o PII
4. Permitir CORS wildcard `*` en APIs que manejan datos sensibles
5. No limitar el tamaño de payloads, permitiendo ataques de deserialización o DoS de memoria

## Preguntas Frecuentes

### ¿Con qué frecuencia debo ejecutar esta revisión?

Antes de cada lanzamiento mayor. Después de cualquier cambio en autenticación, autorización o dependencias críticas. De forma continuada via CI para secretos, SAST y análisis de dependencias.

### ¿Necesito pentesting si uso esta plantilla?

Sí. Los checklists encuentran configuraciones incorrectas y omisiones conocidas. El pentesting encuentra vulnerabilidades que no conocías. Ambos son complementarios, no sustitutos.

### ¿Cómo manejo dependencias con vulnerabilidades conocidas?

Prioriza por severidad CVSS. Parchea las críticas (9.0+) en 24 horas. Documenta las medias (4.0-8.9) con plan de mitigación. Usa una herramienta de análisis de dependencias (Snyk, Dependabot) para detectar temprano.
