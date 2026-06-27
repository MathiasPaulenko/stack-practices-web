---
contentType: recipes
slug: implement-sso-saml
title: "Implementar SSO con SAML"
description: "Cómo implementar single sign-on SAML 2.0 como Service Provider con verificación de firma XML, manejo de metadatos IdP y gestión de sesiones segura en Python, Node.js y Java."
metaDescription: "Implementa single sign-on SAML 2.0 como Service Provider con verificación de firma XML, manejo de metadatos IdP y gestión de sesiones segura."
difficulty: advanced
topics:
  - authentication
tags:
  - authentication
  - saml
  - sso
  - identity-provider
  - security
  - xml-signature
  - recipe
relatedResources:
  - /recipes/authentication/implement-rbac
  - /recipes/authentication/implement-abac
  - /guides/security/secrets-management-guide
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Implementa single sign-on SAML 2.0 como Service Provider con verificación de firma XML, manejo de metadatos IdP y gestión de sesiones segura."
  keywords:
    - authentication
    - saml
    - sso
    - identity-provider
    - security
    - xml-signature
    - recipe
---

## Descripción General

SAML 2.0 es el protocolo dominante de single sign-on enterprise. Permite a una organización autenticar usuarios en un Identity Provider (IdP) centralizado — Okta, Azure AD, Keycloak o ADFS — y luego afirmar su identidad a Service Providers (SPs) downstream mediante documentos XML firmados. Implementar SAML correctamente requiere manejar parsing de XML de forma segura, validar firmas, gestionar intercambio de metadatos y prevenir ataques de replay.

## Cuándo Usar

- Tu aplicación sirve clientes enterprise que ya tienen un IdP centralizado
- Necesitas identidad federada a través de múltiples organizaciones (SaaS multi-tenant)
- La organización requiere interoperabilidad a nivel de protocolo con infraestructura SSO existente
- Necesitas soportar Just-In-Time provisioning (crear cuentas desde assertions SAML)
- Requisitos de compliance mandatan un protocolo estándar en lugar de OAuth 2.0 / OIDC

## Cuándo NO Usar

- Estás construyendo una aplicación orientada a consumidores — usa OAuth 2.0 + OIDC en su lugar
- El IdP soporta OIDC (la mayoría de IdPs modernos lo hacen) — OIDC es más simple, basado en JSON y más ampliamente soportado por librerías de developers
- Necesitas autenticación móvil o SPA — SAML es centrado en navegador web y incómodo para apps nativas
- El overhead de seguridad XML (verificación de firmas, validación de schema) excede la experiencia de tu equipo

## Implementación Paso a Paso

### Python (python3-saml / onelogin)

```python
from onelogin.saml2.auth import OneLogin_Saml2_Auth
from onelogin.saml2.settings import OneLogin_Saml2_Settings
from flask import Flask, request, session, redirect, url_for
import os

# Configuración SAML (almacena certificados de forma segura, no en código)
SAML_CONFIG = {
    "sp": {
        "entityId": "https://app.example.com/saml/metadata",
        "assertionConsumerService": {
            "url": "https://app.example.com/saml/acs",
            "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        },
        "singleLogoutService": {
            "url": "https://app.example.com/saml/sls",
            "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
        },
        "x509cert": os.environ["SP_CERT"],
        "privateKey": os.environ["SP_PRIVATE_KEY"]
    },
    "idp": {
        "entityId": os.environ["IDP_ENTITY_ID"],
        "singleSignOnService": {
            "url": os.environ["IDP_SSO_URL"],
            "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
        },
        "x509cert": os.environ["IDP_CERT"]
    },
    "security": {
        "nameIdEncrypted": False,
        "authnRequestsSigned": True,
        "logoutRequestSigned": True,
        "wantAssertionsSigned": True,
        "wantMessagesSigned": True,
        "wantNameId": True,
        "requestedAuthnContext": True,
        "signMetadata": True
    }
}

app = Flask(__name__)
app.secret_key = os.environ["SECRET_KEY"]

def init_saml_auth(req):
    return OneLogin_Saml2_Auth(req, SAML_CONFIG)

@app.route("/saml/login")
def saml_login():
    req = {
        "https": "on" if request.is_secure else "off",
        "http_host": request.host,
        "script_name": request.path,
        "server_port": request.environ.get("SERVER_PORT"),
        "get_data": request.args.copy(),
        "post_data": request.form.copy()
    }
    auth = init_saml_auth(req)
    return redirect(auth.login())

@app.route("/saml/acs", methods=["POST"])
def saml_acs():
    req = {
        "https": "on" if request.is_secure else "off",
        "http_host": request.host,
        "script_name": request.path,
        "server_port": request.environ.get("SERVER_PORT"),
        "get_data": request.args.copy(),
        "post_data": request.form.copy()
    }
    auth = init_saml_auth(req)
    auth.process_response()

    errors = auth.get_errors()
    if errors:
        app.logger.error(f"Errores SAML: {errors}")
        return "Authentication failed", 401

    if not auth.is_authenticated():
        return "Not authenticated", 401

    # Extraer atributos y crear sesión
    session["saml_user"] = {
        "email": auth.get_nameid(),
        "attributes": auth.get_attributes(),
        "session_index": auth.get_session_index()
    }

    # Opcional: JIT provisioning
    user = find_or_create_user(
        email=auth.get_nameid(),
        name=auth.get_attributes().get("firstName", [""])[0],
        groups=auth.get_attributes().get("groups", [])
    )
    session["user_id"] = user.id

    return redirect("/dashboard")

@app.route("/saml/sls")
def saml_sls():
    req = {
        "https": "on" if request.is_secure else "off",
        "http_host": request.host,
        "script_name": request.path,
        "server_port": request.environ.get("SERVER_PORT"),
        "get_data": request.args.copy(),
        "post_data": request.form.copy()
    }
    auth = init_saml_auth(req)
    url = auth.process_slo(delete_session_cb=lambda: session.clear())
    return redirect(url or "/")
```

### Node.js (passport-saml)

```javascript
import passport from 'passport';
import { Strategy as SamlStrategy } from 'passport-saml';
import fs from 'fs';

const samlConfig = {
  entryPoint: process.env.IDP_SSO_URL,
  issuer: 'https://app.example.com/saml/metadata',
  callbackUrl: 'https://app.example.com/saml/acs',
  logoutUrl: 'https://app.example.com/saml/sls',
  cert: fs.readFileSync(process.env.IDP_CERT_PATH, 'utf-8'),
  privateKey: fs.readFileSync(process.env.SP_PRIVATE_KEY_PATH, 'utf-8'),
  decryptionPvk: fs.readFileSync(process.env.SP_PRIVATE_KEY_PATH, 'utf-8'),
  signatureAlgorithm: 'sha256',
  digestAlgorithm: 'sha256',
  validateInResponseTo: true,
  disableRequestedAuthnContext: false,
  acceptedClockSkewMs: 300000  // 5 minutos
};

passport.use(new SamlStrategy(samlConfig, (profile, done) => {
  // JIT provisioning
  const user = {
    email: profile.nameID,
    name: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || profile.nameID,
    groups: profile['http://schemas.xmlsoap.org/claims/Group'] || [],
    sessionIndex: profile.sessionIndex
  };
  return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Rutas Express
app.get('/saml/login', passport.authenticate('saml'));
app.post('/saml/acs',
  passport.authenticate('saml', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/dashboard')
);
app.get('/saml/logout', (req, res) => {
  samlStrategy.logout(req, (err, url) => {
    if (err) return res.status(500).send('Logout failed');
    req.logout(() => res.redirect(url));
  });
});
```

### Java (Spring Security SAML)

```java
@Configuration
@EnableWebSecurity
public class SamlSecurityConfig {

    @Bean
    public RelyingPartyRegistrationRepository relyingPartyRegistrations() {
        RelyingPartyRegistration registration = RelyingPartyRegistrations
            .fromMetadataLocation("https://idp.example.com/metadata.xml")
            .registrationId("okta")
            .entityId("https://app.example.com/saml/metadata")
            .assertionConsumerServiceBinding(Saml2MessageBinding.POST)
            .signingX509Credentials(c -> c.add(
                Saml2X509Credential.signing(loadPrivateKey(), loadCertificate())
            ))
            .decryptionX509Credentials(c -> c.add(
                Saml2X509Credential.decryption(loadPrivateKey(), loadCertificate())
            ))
            .build();

        return new InMemoryRelyingPartyRegistrationRepository(registration);
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .saml2Login(saml2 -> saml2
                .loginPage("/saml/login")
                .defaultSuccessUrl("/dashboard", true)
            )
            .saml2Logout(withDefaults());

        return http.build();
    }

    // Mapeo personalizado de usuario desde assertion SAML
    @Bean
    public GrantedAuthoritiesMapper authoritiesMapper() {
        return authorities -> {
            Set<GrantedAuthority> mapped = new HashSet<>();
            for (GrantedAuthority auth : authorities) {
                if (auth.getAuthority().startsWith("GROUP_")) {
                    mapped.add(new SimpleGrantedAuthority(
                        "ROLE_" + auth.getAuthority().substring(6)
                    ));
                }
            }
            return mapped;
        };
    }
}
```

## Mejores Prácticas

- **Valida la firma de la respuesta SAML antes de parsear assertions.** Los ataques XML Signature Wrapping (XSW) inyectan assertions maliciosas que evaden verificación de firma si el código busca en el nodo XML incorrecto.
- **Usa HTTPS en todas partes.** Los assertions SAML contienen tokens de autenticación; transmitirlos por HTTP permite interceptación y replay.
- **Almacena private keys en un hardware security module (HSM) o secret manager.** Nunca commitees SP private keys a git o las expongas en variables de entorno en máquinas de desarrolladores.
- **Configura un lifetime corto para assertions (5-10 minutos).** Los assertions son bearer tokens; uno robado puede ser reutilizado hasta que expire. El campo `NotOnOrAfter` debe ser validado estrictamente.
- **Implementa single logout (SLO).** Sin SLO, hacer logout del SP no termina la sesión del IdP, permitiendo al usuario re-autenticarse silenciosamente vía otro SP.

## Errores Comunes

- **Desactivar la validación de firma en desarrollo y olvidar reactivarla.** La vulnerabilidad SAML más común en producción es `wantAssertionsSigned: false` que queda del testing local.
- **Usar parsing de XML basado en strings en lugar de una librería XML segura.** Los parsers DOM estándar son vulnerables a ataques XXE. Usa librerías SAML específicas que deshabiliten el procesamiento de DTD.
- **Confiar en NameID como único identificador de usuario.** Si un atacante puede cambiar su NameID en el IdP, puede suplantar a otro usuario. Mapea a un ID de usuario estable e interno.
- **Ignorar clock skew.** IdP y SP con relojes que difieren más que el lifetime del assertion causan logins legítimos fallidos. Permite un pequeño skew (1-5 minutos) pero loggea warnings.
- **No validar el campo `InResponseTo`.** Sin este check, un atacante puede capturar un assertion legítimo y reutilizarlo contra una request de autenticación diferente.
