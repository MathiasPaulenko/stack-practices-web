---
contentType: recipes
slug: csrf-protection
title: "Proteger Formularios Web Contra Ataques CSRF"
description: "Cómo prevenir ataques de Cross-Site Request Forgery usando tokens de sincronización, cookies SameSite y patrones de double-submit cookie."
metaDescription: "Aprende protección CSRF para formularios web. Previene Cross-Site Request Forgery usando synchronizer tokens, cookies SameSite y patrones double-submit cookie."
difficulty: beginner
topics:
  - security
tags:
  - security
  - authentication
  - cookies
  - vulnerabilities
  - encryption
relatedResources:
  - /recipes/api-security-headers
  - /recipes/session-management
  - /recipes/xss-prevention
lastUpdated: "2026-06-13"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende protección CSRF para formularios web. Previene Cross-Site Request Forgery usando synchronizer tokens, cookies SameSite y patrones double-submit cookie."
  keywords:
    - csrf protection
    - cross site request forgery
    - synchronizer token
    - samesite cookies
    - web security
    - owasp
---

## Visión general

Cross-Site Request Forgery (CSRF) engaña a usuarios autenticados para que realicen acciones no deseadas en un sitio web en el que confían. Un atacante crea un enlace o formulario malicioso que, cuando el usuario logueado hace clic, envía un request al sitio víctima usando la cookie de sesión existente del usuario. El servidor ve un request legítimo de un usuario autenticado y ejecuta la acción — cambiar un email, transferir fondos o eliminar una cuenta — sin conocimiento del usuario.

A diferencia de [XSS](/recipes/security/xss-prevention), que inyecta scripts maliciosos, CSRF explota el comportamiento automático del navegador de enviar cookies. Si `bank.com` tiene un endpoint `POST /transfer`, un atacante puede incrustar un formulario en `evil.com` que se envía a `bank.com/transfer`. Mientras el usuario tenga una cookie de sesión válida para `bank.com`, el navegador la envía automáticamente.

## Cuándo usarlo

Usa esta receta cuando:

- Construyes aplicaciones web con endpoints que cambian estado (POST, PUT, DELETE, PATCH)
- Implementas configuraciones de cuenta, flujos de pago o paneles administrativos
- Auditando aplicaciones existentes por vulnerabilidades CSRF
- Eligiendo entre synchronizer tokens, double-submit cookies y protección SameSite-only

## Solución

### Synchronizer Token Pattern (Django/Python)

```python
from django.middleware.csrf import get_token

def render_form(request):
    context = {'csrf_token': get_token(request)}
    return render(request, 'form.html', context)

# Template
<form method="post" action="/settings/">
    {% csrf_token %}
    <input type="email" name="email" />
    <button type="submit">Actualizar</button>
</form>
```

### Double-Submit Cookie (Node.js/Express)

```javascript
const crypto = require('crypto');

function generateCsrfToken(req, res) {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie('csrfToken', token, { httpOnly: false, sameSite: 'strict' });
  return token;
}

function validateCsrfToken(req, res, next) {
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  if (token !== req.cookies.csrfToken) {
    return res.status(403).json({ error: 'Token CSRF inválido' });
  }
  next();
}
```

### SameSite Cookie (Spring Boot)

```java
@Configuration
public class CookieConfig implements WebMvcConfigurer {
    @Bean
    public CookieSerializer cookieSerializer() {
        DefaultCookieSerializer serializer = new DefaultCookieSerializer();
        serializer.setSameSite("Strict");
        serializer.setUseSecureCookie(true);
        return serializer;
    }
}
```

## Explicación

- **Synchronizer tokens**: El servidor genera un token aleatorio por sesión (o por request) y lo incrusta en cada formulario. El token se almacena server-side y se valida en el envío. Como `evil.com` no puede leer el token del DOM o cookies de `bank.com`, no puede forjar requests válidos.
- **Double-submit cookie**: Un token aleatorio se configura como cookie y también se envía en un campo de formulario o header. El servidor verifica que ambos valores coinciden. Es stateless — no requiere almacenamiento server-side — pero depende de que el atacante no pueda leer la cookie.
- **SameSite cookies**: Configurar `SameSite=Strict` o `Lax` en cookies de sesión previene que el navegador las envíe con requests cross-origin. Es la defensa más simple y confiable, pero no todos los navegadores y escenarios la soportan perfectamente.

## Variantes

| Técnica | Almacenamiento server | Stateless | Dependencia de navegador |
|---------|----------------------|-----------|-------------------------|
| Synchronizer token | Sí (sesión) | No | Ninguna |
| Double-submit cookie | No | Sí | Ninguna |
| SameSite cookie | No | Sí | Navegadores modernos |
| Custom headers | No | Sí | Solo AJAX |

## Lo que funciona

- **Usa SameSite=Strict en cookies de sesión**: esto solo bloquea la mayoría de ataques CSRF. Combínalo con tokens para defensa en profundidad.
- **Rota tokens CSRF por sesión, no por request**: los tokens por-request rompen el botón de atrás y los workflows multi-tab. Los tokens por sesión son seguros y usables.
- **Valida tokens para todos los métodos que cambian estado**: verifica protección CSRF en POST, PUT, PATCH y DELETE. Los métodos seguros (GET, HEAD) no deberían cambiar estado de todos modos.
- **Incluye tokens en headers de AJAX**: para SPAs, lee el token desde un meta tag o cookie y envíalo como header custom (`X-CSRF-Token`).
- **Rechaza tokens faltantes con 403**: no ignores silenciosamente tokens faltantes. Un 403 señala una mala configuración o un intento de ataque.

## Errores comunes

- **Confiar solo en SameSite sin tokens**: navegadores más antiguos y ciertos patrones de navegación cross-site pueden no enforce SameSite. Los tokens proveen una defensa de respaldo.
- **No proteger formularios de login**: login CSRF es real. Un atacante puede forzar a una víctima a loguearse en una cuenta controlada por el atacante, habilitando ataques subsecuentes.
- **Usar GET para acciones que cambian estado**: `GET /delete-account?id=123` es trivialmente explotable vía una image tag o enlace. Siempre usa POST, PUT, DELETE para mutaciones.
- **Almacenar tokens en localStorage**: [XSS](/recipes/security/xss-prevention) puede robar localStorage. Almacena el token server-side en un campo de formulario oculto o una cookie non-HttpOnly (para el patrón double-submit).

## Preguntas frecuentes

**P: ¿El CSRF sigue siendo relevante con SameSite cookies?**
R: Sí. SameSite bloquea la mayoría de CSRF pero no todos los escenarios (requests GET cross-site, iframes incrustados, endpoints que aceptan form data). La defensa en profundidad con tokens es recomendada.

**P: ¿Las APIs necesitan protección CSRF?**
R: Las APIs que aceptan submissions de formulario o usan autenticación por cookie necesitan protección CSRF. Las APIs que usan bearer tokens o API keys en headers son generalmente inmunes porque el atacante no puede forjar el header. Para seguridad de headers de API, consulta [headers de seguridad API](/recipes/security/api-security-headers).

**P: ¿Qué es login CSRF?**
R: Un atacante engaña a una víctima para que se loguee en un sitio bajo la cuenta del atacante. La víctima entonces realiza acciones (agregar métodos de pago, escribir reviews) que benefician al atacante.

**P: ¿Puedo usar un token CSRF estático para todos los usuarios?**
R: No. Los tokens estáticos son triviales de extraer y reutilizar. Los tokens deben ser únicos por sesión de usuario e impredecibles.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
