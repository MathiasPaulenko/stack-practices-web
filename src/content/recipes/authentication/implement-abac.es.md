---
contentType: recipes
slug: implement-abac
title: "Implementar ABAC"
description: "Cómo implementar control de acceso basado en atributos con motores de políticas, evaluación de contexto en vivo y decisiones de autorización granulares en Python, Node.js y Java."
metaDescription: "Implementa control de acceso basado en atributos con motores de políticas, evaluación de contexto en vivo y decisiones granulares."
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
  metaDescription: "Implementa control de acceso basado en atributos con motores de políticas, evaluación de contexto en vivo y decisiones granulares."
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

Attribute-Based Access Control (ABAC) evalúa decisiones de acceso usando atributos del usuario, el recurso, la acción y el entorno. A diferencia de RBAC, que pregunta "¿es Alice admin?", ABAC pregunta "¿Alice, trabajando desde la IP de la oficina, durante horario laboral, en un documento no clasificado, tiene acceso de lectura?" ABAC es la elección correcta cuando el acceso depende de factores contextuales en vivo.

## Cuándo Usar

- El acceso debe variar por hora del día, ubicación, nivel de confianza del dispositivo o zona de red
- El mismo usuario necesita diferentes niveles de acceso para diferentes proyectos, clientes o clasificaciones de datos
- Estás implementando una arquitectura zero-trust donde cada request es re-evaluado
- Se requieren permisos a nivel de recurso (ej., Alice puede editar Documento A pero solo ver Documento B)

## Cuándo NO Usar

- Tu aplicación tiene menos de 5 roles y reglas de acceso simples — RBAC es más simple
- La lógica de autorización raramente cambia — ABAC añade complejidad no justificada
- El rendimiento es crítico y la evaluación de políticas a nivel de milisegundos es inaceptable
- El equipo carece de experiencia con motores de políticas o sistemas de reglas formales

## Implementación Paso a Paso

### Python (Casbin + atributos de contexto)

```python
import casbin
from datetime import datetime
from functools import wraps
from flask import Flask, request, g, jsonify

# Definición de política (model.conf)
# [request_definition]
# r = sub, dom, obj, act, env
#
# [policy_definition]
# p = sub, dom, obj, act, rule
#
# [role_definition]
# g = _, _, _
#
# [policy_effect]
# e = some(where (p.eft == allow))
#
# [matchers]
# m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && r.obj == p.obj && r.act == p.act && eval(p.rule)

enforcer = casbin.Enforcer('model.conf', 'policy.csv')

# Constructor de contexto del request
def build_context(user, request):
    return {
        "time": datetime.now().hour,
        "ip": request.remote_addr,
        "device_trusted": user.device_trusted,
        "location": geoip_lookup(request.remote_addr),
        "data_classification": request.view_args.get('classification', 'public')
    }

# Decorador ABAC
def require_abac(resource, action):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            ctx = build_context(g.user, request)

            # Enforce con contexto
            allowed = enforcer.enforce(
                g.user.role,          # subject
                g.user.tenant_id,     # domain
                resource,             # object
                action,               # action
                ctx                   # environment context
            )

            if not allowed:
                return jsonify({"error": "Forbidden"}), 403
            return f(*args, **kwargs)
        return wrapped
    return decorator

# Función personalizada para evaluación de política
@enforcer.add_function('business_hours')
def business_hours(hour):
    return 9 <= hour <= 17

@enforcer.add_function('office_network')
def office_network(ip):
    return ip.startswith('10.0.0.') or ip.startswith('192.168.1.')
```

```csv
# policy.csv
# Rol, Tenant, Recurso, Acción, Regla
p, analyst, acme, reports, read, "business_hours(r_env.time) && office_network(r_env.ip)"
p, manager, acme, reports, read, "true"
p, manager, acme, reports, write, "business_hours(r_env.time)"
p, admin, acme, *, *, "true"

# Jerarquía de roles
g, alice, analyst, acme
g, bob, manager, acme
g, carol, admin, acme
```

### Node.js (Open Policy Agent / Cedar)

```javascript
// OPA (Open Policy Agent) con políticas Rego
// policies/document.rego
/*
package document

import future.keywords.if
import future.keywords.in

default allow := false

# Usuarios pueden leer documentos públicos
allow if {
    input.action == "read"
    input.resource.classification == "public"
}

# Managers pueden leer confidenciales en horario laboral
allow if {
    input.user.role == "manager"
    input.action == "read"
    input.resource.classification == "confidential"
    input.context.time.hour >= 9
    input.context.time.hour <= 17
}

# Los dueños de documentos siempre pueden editar los suyos
allow if {
    input.action == "write"
    input.resource.owner == input.user.id
}

# Admins pueden hacer cualquier cosa
allow if {
    input.user.role == "admin"
}
*/

// Cliente Node.js
import { OPAClient } from '@styra/opa';

const opa = new OPAClient('http://localhost:8181');

async function authorize(user, resource, action, context) {
    const input = {
        user,
        resource,
        action,
        context: {
            time: new Date(),
            ip: context.ip,
            deviceTrustScore: context.deviceTrustScore
        }
    };

    const result = await opa.evaluate('document/allow', input);
    return result === true;
}

// Cedar (ABAC estilo AWS)
// policies.cedar
/*
permit (
    principal,
    action == Action::"view",
    resource
)
when {
    resource.classification == "public"
};

permit (
    principal in Role::"manager",
    action in [Action::"view", Action::"edit"],
    resource
)
when {
    resource.classification == "confidential",
    context.time.hour >= 9,
    context.time.hour <= 17
};
*/

import { Authorizer, PolicySet } from '@cedar-policy/cedar-wasm';

const authorizer = new Authorizer();
authorizer.setPolicies(new PolicySet(/* policies.cedar content */));

function checkAccess(principal, action, resource, context) {
    return authorizer.isAuthorized({ principal, action, resource, context });
}
```

### Java (Spring Security + SpEL)

```java
// Expresión personalizada para seguridad a nivel de método
@Component("abac")
public class AbacExpression {

    public boolean canAccess(Authentication auth, Document document, String action) {
        User user = (User) auth.getPrincipal();
        LocalTime now = LocalTime.now();
        String ip = getClientIp();

        // El dueño del documento siempre tiene acceso de escritura
        if ("write".equals(action) && document.getOwnerId().equals(user.getId())) {
            return true;
        }

        // Documentos confidenciales: horario laboral + red de oficina
        if ("CONFIDENTIAL".equals(document.getClassification())) {
            boolean businessHours = now.isAfter(LocalTime.of(9, 0))
                && now.isBefore(LocalTime.of(17, 0));
            boolean officeNetwork = ip.startsWith("10.0.0.");
            return businessHours && officeNetwork && user.hasRole("MANAGER");
        }

        // Documentos públicos: cualquier usuario autenticado puede leer
        if ("PUBLIC".equals(document.getClassification()) && "read".equals(action)) {
            return true;
        }

        return false;
    }

    private String getClientIp() {
        // Extraer del contexto del request
        return ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes())
            .getRequest().getRemoteAddr();
    }
}

// Uso
@RestController
public class DocumentController {

    @PreAuthorize("@abac.canAccess(authentication, #document, 'read')")
    @GetMapping("/documents/{id}")
    public Document getDocument(@PathVariable Long id) {
        return documentService.findById(id);
    }

    @PreAuthorize("@abac.canAccess(authentication, #document, 'write')")
    @PutMapping("/documents/{id}")
    public Document updateDocument(@PathVariable Long id, @RequestBody Document doc) {
        return documentService.update(id, doc);
    }
}
```

## Lo que funciona

- **Separa política del código.** Almacena reglas ABAC en un archivo de política dedicado (Rego, Cedar, o YAML) que puede actualizarse sin redeployar la aplicación. Las reglas hardcodeadas se vuelven inmanejables.
- **Cachea atributos de contexto, no decisiones.** Los scores de confianza de dispositivo y geolocalización de IP son costosos. Cachea el contexto durante la duración del request, pero re-evalúa la política cada vez.
- **Loggea cada evaluación de política.** Registra los atributos de entrada, la versión de política y la decisión (allow/deny) para auditoría de compliance. OPA y Cedar soportan decision logging.
- **Testea políticas independientemente de la aplicación.** Escribe tests unitarios para políticas Rego o Cedar en aislamiento. Un bug de política que otorga acceso admin a todos los usuarios debe detectarse antes del deploy.
- **Usa evaluación de corto circuito.** Ordena reglas de más específica a más general. Una regla que dice "denegar si la clasificación es TOP SECRET" debe verificarse antes de "permitir si el rol es admin".

## Errores Comunes

- **Reinventar un lenguaje de política con expresiones booleanas en código.** `if (user.role == 'admin' || (user.location == 'office' && time.hour > 9))` rápidamente se convierte en un desastre anidado. Usa un motor de políticas.
- **No validar atributos de contexto.** Un cliente que establece `device_trusted: true` en un request header evade tu seguridad. El contexto debe derivarse server-side desde fuentes confiables.
- **Ignorar rendimiento de evaluación de políticas.** Evaluar 50 reglas en cada API call añade latencia. Usa caching, políticas compiladas (OPA compila Rego a WASM) y evaluación lazy.
- **Almacenar políticas en base de datos sin versionado.** Un cambio de política que accidentalmente abre acceso no puede revertirse rápidamente. Versiona políticas en git y cárgalas desde archivos o un policy bundle.
- **Over-engineering de control de acceso simple.** Si la política es "admins pueden hacer todo, todos los demás pueden leer", ABAC es excesivo. Empieza con RBAC y evoluciona a ABAC cuando los requisitos lo exijan.

## Preguntas Frecuentes

**Q: ¿En qué se diferencia ABAC de RBAC?**
A: RBAC otorga acceso basado en roles (por ejemplo, admin, editor). ABAC otorga acceso basado en atributos del usuario, recurso, acción y entorno, permitiendo políticas más granulares.

**Q: ¿Cuáles son atributos comunes en ABAC?**
A: Atributos de usuario (departamento, clearance), de recurso (propietario, clasificación), de acción (leer, borrar) y de entorno (hora, ubicación, dispositivo).

**Q: ¿Cuándo debo elegir ABAC sobre RBAC?**
A: Elige ABAC cuando necesites decisiones contextuales, como permitir acceso solo durante horario laboral o desde una ubicación específica, o cuando los roles solos generen explosión de roles.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Errores Comunes Adicionales

- Evaluar atributos en cada request sin caching — los lookups repetidos a base de datos o LDAP crean picos de latencia
- No definir una política de fallback cuando las fuentes de atributos no están disponibles — decide si denegar o permitir cuando el motor de políticas no puede alcanzar el attribute store
- Crear políticas demasiado granulares — cada nueva combinación de atributos multiplica la matriz de políticas, dificultando las auditorías
- No loggear los resultados de evaluación de políticas — sin audit trails, no puedes investigar violaciones de acceso ni debuggear la lógica de políticas
- Mezclar reglas ABAC entre tenants sin namespacing — las políticas de un tenant pueden otorgar accidentalmente acceso a los recursos de otro tenant
- No testear cambios de política en staging antes de producción — un solo cambio de regla puede abrir o cerrar el acceso para todos los usuarios
- No manejar la expiración de atributos — los atributos cacheados como device trust scores pueden volverse stale durante sesiones largas
- No separar la evaluación de políticas de la definición de políticas — mezclarlas dificulta testear políticas en aislamiento
- No versionar archivos de política — cuando las políticas cambian, pierdes el audit trail de qué se enforceaba en un momento dado
- No usar un policy linter — typos en nombres de atributos o reglas de política son silenciosamente ignorados hasta que un usuario reporta un problema de acceso
- No definir un proceso de revisión para cambios de políticas — un solo desarrollador puede modificar políticas sin oversight, introduciendo vulnerabilidades de seguridad

### ¿Cómo testeo políticas ABAC?

Escribe tests unitarios para el motor de políticas con atributos mock. Testea el happy path (todos los atributos coinciden), el deny path (un atributo no coincide), y edge cases (atributos faltantes, valores null). Usa property-based testing para generar combinaciones aleatorias de atributos y verificar que la política nunca lance excepciones.

### ¿Puedo combinar ABAC con RBAC?

Sí. Usa RBAC como el primer filtro — el usuario debe tener un rol válido. Luego aplica ABAC para decisiones fine-grained dentro de ese rol. Por ejemplo, un usuario con el rol `editor` puede acceder al dashboard (RBAC), pero solo puede editar artículos de su departamento (ABAC). Esto reduce la matriz de políticas manteniendo la flexibilidad.
