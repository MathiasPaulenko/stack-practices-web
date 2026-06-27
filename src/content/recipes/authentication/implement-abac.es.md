---
contentType: recipes
slug: implement-abac
title: "Implementar ABAC"
description: "Cómo implementar control de acceso basado en atributos con motores de políticas, evaluación de contexto dinámico y decisiones de autorización granulares en Python, Node.js y Java."
metaDescription: "Implementa control de acceso basado en atributos con motores de políticas, evaluación de contexto dinámico y decisiones granulares."
difficulty: advanced
topics:
  - authentication
tags:
  - authentication
  - abac
  - authorization
  - policy-engine
  - security
  - fine-grained
  - recipe
relatedResources:
  - /recipes/authentication/implement-rbac
  - /recipes/authentication/implement-sso-saml
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Implementa control de acceso basado en atributos con motores de políticas, evaluación de contexto dinámico y decisiones granulares."
  keywords:
    - authentication
    - abac
    - authorization
    - policy-engine
    - security
    - fine-grained
    - recipe
---

## Descripción General

Attribute-Based Access Control (ABAC) evalúa decisiones de acceso usando atributos del usuario, el recurso, la acción y el entorno. A diferencia de RBAC, que pregunta "¿es Alice admin?", ABAC pregunta "¿Alice, trabajando desde la IP de la oficina, durante horario laboral, en un documento no clasificado, tiene acceso de lectura?" ABAC es la elección correcta cuando el acceso depende de factores contextuales dinámicos.

## Cuándo Usar

- El acceso debe variar por hora del día, ubicación, nivel de confianza del dispositivo o zona de red
- El mismo usuario necesita diferentes niveles de acceso para diferentes proyectos, clientes o clasificaciones de datos
- Estás implementando una arquitectura zero-trust donde cada request es re-evaluado
- Se requieren permisos a nivel de recurso (ej., Alice puede editar Documento A pero solo ver Documento B)

## Cuándo NO Usar

- Tu aplicación tiene menos de 5 roles y reglas de acceso simples — RBAC es más simple
- La lógica de autorización raramente cambia — ABAC añade complejidad no justificada
- El rendimiento es crítico y la evaluación de políticas a nivel de milisegundos es inaceptable

## Implementación Paso a Paso

### Python (Casbin)

```python
import casbin
from datetime import datetime
from functools import wraps
from flask import Flask, request, g, jsonify

# Modelo de política (model.conf)
# [request_definition]
# r = sub, dom, obj, act, env
# [policy_definition]
# p = sub, dom, obj, act, rule
# [matchers]
# m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && r.obj == p.obj && r.act == p.act && eval(p.rule)

enforcer = casbin.Enforcer('model.conf', 'policy.csv')

def build_context(user, request):
    return {
        "time": datetime.now().hour,
        "ip": request.remote_addr,
        "device_trusted": user.device_trusted,
        "location": geoip_lookup(request.remote_addr)
    }

def require_abac(resource, action):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            ctx = build_context(g.user, request)
            allowed = enforcer.enforce(g.user.role, g.user.tenant_id, resource, action, ctx)
            if not allowed:
                return jsonify({"error": "Forbidden"}), 403
            return f(*args, **kwargs)
        return wrapped
    return decorator

@enforcer.add_function('business_hours')
def business_hours(hour):
    return 9 <= hour <= 17

@enforcer.add_function('office_network')
def office_network(ip):
    return ip.startswith('10.0.0.') or ip.startswith('192.168.1.')
```

```csv
# policy.csv
p, analyst, acme, reports, read, "business_hours(r_env.time) && office_network(r_env.ip)"
p, manager, acme, reports, read, "true"
p, manager, acme, reports, write, "business_hours(r_env.time)"
p, admin, acme, *, *, "true"
g, alice, analyst, acme
g, bob, manager, acme
g, carol, admin, acme
```

### Node.js (OPA / Cedar)

```javascript
// policies/document.rego
/*
package document
default allow := false
allow if { input.action == "read"; input.resource.classification == "public" }
allow if {
    input.user.role == "manager"; input.action == "read"
    input.resource.classification == "confidential"
    input.context.time.hour >= 9; input.context.time.hour <= 17
}
allow if { input.action == "write"; input.resource.owner == input.user.id }
allow if { input.user.role == "admin" }
*/

import { OPAClient } from '@styra/opa';
const opa = new OPAClient('http://localhost:8181');

async function authorize(user, resource, action, context) {
    const result = await opa.evaluate('document/allow', {
        user, resource, action, context
    });
    return result === true;
}
```

### Java (Spring Security + SpEL)

```java
@Component("abac")
public class AbacExpression {
    public boolean canAccess(Authentication auth, Document doc, String action) {
        User user = (User) auth.getPrincipal();
        LocalTime now = LocalTime.now();
        String ip = getClientIp();

        if ("write".equals(action) && doc.getOwnerId().equals(user.getId())) return true;

        if ("CONFIDENTIAL".equals(doc.getClassification())) {
            boolean businessHours = now.isAfter(LocalTime.of(9,0)) && now.isBefore(LocalTime.of(17,0));
            boolean officeNetwork = ip.startsWith("10.0.0.");
            return businessHours && officeNetwork && user.hasRole("MANAGER");
        }

        if ("PUBLIC".equals(doc.getClassification()) && "read".equals(action)) return true;
        return false;
    }
}

@RestController
public class DocumentController {
    @PreAuthorize("@abac.canAccess(authentication, #document, 'read')")
    @GetMapping("/documents/{id}") public Document get(@PathVariable Long id) { }
}
```

## Mejores Prácticas

- **Separa política del código.** Almacena reglas ABAC en un archivo de política dedicado que puede actualizarse sin redeployar la aplicación.
- **Cachea atributos de contexto, no decisiones.** Los scores de confianza de dispositivo y geolocalización de IP son costosos. Cachea el contexto durante la duración del request, pero re-evalúa la política cada vez.
- **Loggea cada evaluación de política.** Registra los atributos de entrada, la versión de política y la decisión para auditoría de compliance.
- **Testea políticas independientemente de la aplicación.** Escribe tests unitarios para políticas Rego o Cedar en aislamiento.
- **Usa evaluación de corto circuito.** Ordena reglas de más específica a más general.

## Errores Comunes

- **Reinventar un lenguaje de política con expresiones booleanas en código.** `if (user.role == 'admin' || ...)` rápidamente se convierte en un desastre anidado. Usa un motor de políticas.
- **No validar atributos de contexto.** Un cliente que establece `device_trusted: true` en un header evade tu seguridad. El contexto debe derivarse server-side desde fuentes confiables.
- **Ignorar rendimiento de evaluación de políticas.** Evaluar 50 reglas en cada API call añade latencia. Usa caching, políticas compiladas y evaluación lazy.
- **Almacenar políticas en base de datos sin versionado.** Un cambio de política que accidentalmente abre acceso no puede revertirse rápidamente. Versiona en git.
- **Over-engineering de control de acceso simple.** Si la política es "admins pueden hacer todo, todos los demás pueden leer", ABAC es excesivo.

## Preguntas Frecuentes

**Q: ¿En qué se diferencia ABAC de RBAC?**
A: RBAC otorga acceso basado en roles (por ejemplo, admin, editor). ABAC otorga acceso basado en atributos del usuario, recurso, acción y entorno, permitiendo políticas más granulares.

**Q: ¿Cuáles son atributos comunes en ABAC?**
A: Atributos de usuario (departamento, clearance), de recurso (propietario, clasificación), de acción (leer, borrar) y de entorno (hora, ubicación, dispositivo).

**Q: ¿Cuándo debo elegir ABAC sobre RBAC?**
A: Elige ABAC cuando necesites decisiones contextuales, como permitir acceso solo durante horario laboral o desde una ubicación específica, o cuando los roles solos generen explosión de roles.
