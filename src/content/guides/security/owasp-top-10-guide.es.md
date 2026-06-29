---
contentType: guides
slug: owasp-top-10-guide
title: "OWASP Top 10 — Explicado con Mitigaciones"
description: "Guía orientada a desarrolladores sobre los 10 riesgos de seguridad más críticos de OWASP: cómo funciona cada vulnerabilidad, ejemplos del mundo real y mitigaciones prácticas."
metaDescription: "Aprende los 10 riesgos OWASP con mitigaciones. Entiende inyección, autenticación rota, XSS, deserialización insegura y cómo prevenirlos en tus apps."
difficulty: intermediate
topics:
  - security
  - frontend
tags:
  - owasp
  - owasp-top-10
  - web-security
  - vulnerability-mitigation
  - secure-coding
  - guia
relatedResources:
  - /guides/secure-coding-guide
  - /guides/threat-modeling-guide
  - /guides/cryptography-basics-guide
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Aprende los 10 riesgos OWASP con mitigaciones. Entiende inyección, autenticación rota, XSS, deserialización insegura y cómo prevenirlos en tus apps."
  keywords:
    - owasp
    - owasp-top-10
    - web-security
    - vulnerability-mitigation
    - secure-coding
    - guia
---

## Overview

El OWASP Top 10 es un documento de concienciación estándar para desarrolladores y seguridad de aplicaciones web. Representa un consenso amplio sobre los riesgos de seguridad más críticos para aplicaciones web. Entender estos riesgos — y más importante aún, cómo prevenirlos — es una habilidad base para todo desarrollador que envíe código a producción.

## When to Use

- Construyes o mantienes aplicaciones web
- Necesitas comunicar riesgos de seguridad a stakeholders
- Preparas auditorías de seguridad o pruebas de penetración
- Quieres establecer estándares de codificación segura

## A01 — Control de Acceso Roto

**Riesgo:** Los usuarios pueden acceder a recursos o realizar acciones fuera de sus permisos previstos.

**Ejemplo:** Un atacante cambia la URL de `/account/123` a `/account/124` y ve los datos de otro usuario.

**Mitigación:**
- Denegar por defecto; validar en el servidor en cada solicitud
- Usar un mecanismo único y reutilizable de control de acceso
- Implementar políticas CORS adecuadas
- Limitar la tasa de solicitudes a endpoints de API para prevenir abuso automatizado

```python
# Verificación de autorización en el servidor
def get_account(account_id: str, user: User):
    account = db.get_account(account_id)
    if account.owner_id != user.id and not user.is_admin:
        raise Forbidden("Acceso denegado")
    return account
```

## A02 — Fallas Criptográficas

**Riesgo:** Los datos sensibles se exponen a través de encriptación débil o ausente.

**Ejemplo:** Contraseñas almacenadas en texto plano, o números de tarjetas transmitidos por HTTP.

**Mitigación:**
- Encriptar datos en reposo (AES-256) y en tránsito (TLS 1.3)
- Usar hashing fuerte de contraseñas: Argon2id, scrypt o bcrypt
- Nunca almacenar datos sensibles que no necesites (cumplimiento PCI DSS)
- Usar generadores de números aleatorios seguros para tokens e IDs

```python
import bcrypt

# Hashear una contraseña
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))

# Verificar
if bcrypt.checkpw(password.encode(), hashed):
    # Autenticado
```

## A03 — Inyección

**Riesgo:** Datos no confiables se envían a un intérprete como parte de un comando o consulta.

**Ejemplo:** Inyección SQL a través de entrada de usuario no sanitizada en un campo de búsqueda.

**Mitigación:**
- Usar consultas parametrizadas (prepared statements)
- Usar ORMs que escapan consultas automáticamente
- Validar y sanitizar toda la entrada del usuario
- Usar LIMIT en consultas SQL para minimizar el daño de inyecciones

```python
# Seguro: consulta parametrizada
cursor.execute("SELECT * FROM users WHERE email = %s", (email,))

# Inseguro: formato de string
cursor.execute(f"SELECT * FROM users WHERE email = '{email}'")
```

## A04 — Diseño Inseguro

**Riesgo:** Fallas en el diseño de la aplicación que no pueden ser corregidas solo con implementación perfecta.

**Ejemplo:** Un flujo de restablecimiento de contraseña que envía un token predecible en la URL.

**Mitigación:**
- Establecer patrones de diseño seguro y modelado de amenazas
- Usar arquitecturas de referencia con seguridad integrada
- Separar dominios en contextos acotados con autenticación independiente
- Implementar pruebas unitarias e integrales de controles de seguridad

## A05 — Configuración de Seguridad Incorrecta

**Riesgo:** Configuraciones por defecto, configuraciones incompletas o demasiado permisivas.

**Ejemplo:** Credenciales de administrador por defecto, almacenamiento cloud expuesto o capacidades innecesarias habilitadas.

**Mitigación:**
- Endurecer todos los ambientes (dev, staging, prod) por igual
- Eliminar capacidades, dependencias y documentación no utilizadas
- Segmentar la arquitectura de la aplicación (containers, serverless)
- Automatizar la validación de configuración en pipelines CI/CD

## A06 — Componentes Vulnerables y Desactualizados

**Riesgo:** Usar componentes con vulnerabilidades conocidas.

**Ejemplo:** Ejecutar Log4j 2.14.1 después de la divulgación de CVE-2021-44228.

**Mitigación:**
- Mantener un inventario de software (SBOM)
- Usar escáners de dependencias (Snyk, OWASP Dependency-Check, npm audit)
- Suscribirse a avisos de seguridad para tu stack
- Tener un SLA de parches (crítico: 24h, alto: 7 días)

## A07 — Fallas de Identificación y Autenticación

**Riesgo:** Debilidades de autenticación permiten credential stuffing, fuerza bruta o secuestro de sesiones.

**Ejemplo:** Sin límite de tasa en login, sesiones que nunca expiran o políticas de contraseña débiles.

**Mitigación:**
- Implementar autenticación multifactor (MFA)
- Usar gestión segura de sesiones (cookies httpOnly, secure, SameSite)
- Hacer cumplir políticas de contraseñas fuertes o autenticación sin contraseña
- Detectar y bloquear intentos de credential stuffing

```http
Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Strict; Max-Age=3600
```

## A08 — Fallas de Integridad de Software y Datos

**Riesgo:** Aplicaciones que dependen de plugins, librerías o módulos de fuentes no confiables.

**Ejemplo:** Un pipeline CI/CD que obtiene dependencias sin verificar firmas.

**Mitigación:**
- Verificar firmas digitales de paquetes y actualizaciones
- Usar repositorios privados con controles de acceso estrictos
- Asegurar que los pipelines CI/CD tengan controles de acceso fuertes y logging de auditoría
- No actualizar automáticamente dependencias de producción

## A09 — Fallas de Logging y Monitoreo de Seguridad

**Riesgo:** Logging insuficiente previene la detección de brechas y ralentiza la respuesta a incidentes.

**Ejemplo:** Un ataque de exfiltración de datos que pasa desapercibido durante meses porque no se recolectaban logs.

**Mitigación:**
- Registrar todas las fallas de autenticación, control de acceso y validación de entrada
- Asegurar que los logs sean resistentes a alteraciones y almacenados centralmente
- Implementar alertas en tiempo real para patrones sospechosos
- Practicar simulacros de respuesta a incidentes con tus logs

## A10 — Server-Side Request Forgery (SSRF)

**Riesgo:** Un atacante fuerza al servidor a hacer solicitudes a recursos internos o restringidos.

**Ejemplo:** Un buscador de URLs que sigue redirecciones a `http://169.254.169.254/latest/meta-data/` en AWS.

**Mitigación:**
- Validar y sanitizar todas las URLs (esquema, host, puerto)
- Usar listas de permitidos para solicitudes salientes
- Desactivar el seguimiento de redirecciones o validar el destino final
- Ejecutar servicios de obtención en segmentos de red aislados

## Tabla Resumen

| Rango | Riesgo | Mitigación Clave |
|-------|--------|-----------------|
| A01 | Control de Acceso Roto | Verificaciones de autorización en el servidor |
| A02 | Fallas Criptográficas | Encriptar datos en reposo y en tránsito |
| A03 | Inyección | Consultas parametrizadas y validación de entrada |
| A04 | Diseño Inseguro | Modelado de amenazas y patrones seguros |
| A05 | Configuración Incorrecta | Endurecer todos los ambientes por igual |
| A06 | Componentes Vulnerables | Escaneo de dependencias y SLAs de parches |
| A07 | Fallas de Autenticación | MFA, sesiones seguras, límite de tasa |
| A08 | Fallas de Integridad | Verificación de firmas y seguridad de cadena de suministro |
| A09 | Fallas de Logging | Logging centralizado resistente a alteraciones |
| A10 | SSRF | Validación de URLs y segmentación de red |

## Errores Comunes

- **Pensar que el framework lo maneja todo** — los frameworks ayudan, pero aún necesitas configurarlos correctamente
- **Solo probar XSS y SQLi** — las aplicaciones modernas enfrentan riesgos de cadena de suministro, lógica de negocio y SSRF
- **Tratar la seguridad como algo posterior** — construye seguridad en el diseño, no como una lista de verificación pre-lanzamiento
- **Ignorar variantes móviles y de API** — OWASP tiene listas separadas para seguridad móvil y de APIs

## FAQ

**¿Con qué frecuencia actualiza OWASP el Top 10?**
Aproximadamente cada 3-4 años. La versión actual es de 2021. Consulta `owasp.org` para actualizaciones.

**¿Es OWASP Top 10 suficiente para cumplimiento?**
Es un excelente punto de partida pero no exhaustivo. Considera OWASP ASVS (Application Security Verification Standard) para requisitos exhaustivos.

**¿Cómo pruebo estas vulnerabilidades?**
Usa escáners automatizados (OWASP ZAP, Burp Suite) como línea base, luego realiza pruebas de penetración manuales y revisión de código.
