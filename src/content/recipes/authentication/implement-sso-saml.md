---
contentType: recipes
slug: implement-sso-saml
title: "Implement SSO with SAML"
description: "How to implement SAML 2.0 single sign-on as a Service Provider with XML signature verification, IdP metadata handling, and secure session management in Python, Node.js, and Java."
metaDescription: "Implement SAML 2.0 single sign-on as a Service Provider with XML signature verification, IdP metadata, and secure session management."
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
  metaDescription: "Implement SAML 2.0 single sign-on as a Service Provider with XML signature verification, IdP metadata, and secure session management."
  keywords:
    - authentication
    - saml
    - sso
    - identity-provider
    - security
    - xml-signature
    - recipe
---

## Overview

SAML 2.0 is the dominant enterprise single sign-on protocol. It allows an organization to authenticate users in a central Identity Provider (IdP) — Okta, Azure AD, Keycloak, or ADFS — and then assert their identity to downstream Service Providers (SPs) via signed XML documents. Implementing SAML correctly requires handling XML parsing securely, validating signatures, managing metadata exchange, and preventing replay attacks.

## When to Use

- Your application serves enterprise customers who already have a centralized IdP
- You need federated identity across multiple organizations (multi-tenant SaaS)
- The organization requires protocol-level interoperability with existing SSO infrastructure
- You need to support Just-In-Time provisioning (creating accounts from SAML assertions)
- Compliance requirements mandate a standard protocol rather than OAuth 2.0 / OIDC

## When NOT to Use

- You are building a consumer-facing application — use OAuth 2.0 + OIDC instead
- The IdP supports OIDC (most modern IdPs do) — OIDC is simpler, JSON-based, and more widely supported by developer libraries
- You need mobile or SPA authentication — SAML is web-browser-centric and awkward for native apps
- The overhead of XML security (signature verification, schema validation) exceeds your team's expertise

## Step-by-Step Implementation

### Python (python3-saml / onelogin)

```python
from onelogin.saml2.auth import OneLogin_Saml2_Auth
from onelogin.saml2.settings import OneLogin_Saml2_Settings
from flask import Flask, request, session, redirect, url_for
import os

# SAML settings (store certificates securely, not in code)
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
        app.logger.error(f"SAML errors: {errors}")
        return "Authentication failed", 401

    if not auth.is_authenticated():
        return "Not authenticated", 401

    # Extract attributes and create session
    session["saml_user"] = {
        "email": auth.get_nameid(),
        "attributes": auth.get_attributes(),
        "session_index": auth.get_session_index()
    }

    # Optional: JIT provisioning
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
  acceptedClockSkewMs: 300000  // 5 minutes
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

// Express routes
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

    // Custom user mapping from SAML assertion
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

## What Works

- **Validate the SAML response signature before parsing any assertions.** XML Signature Wrapping (XSW) attacks inject malicious assertions that bypass signature checks if the code looks in the wrong XML node.
- **Use HTTPS everywhere.** SAML assertions contain authentication tokens; transmitting them over HTTP allows interception and replay.
- **Store private keys in a hardware security module (HSM) or secret manager.** Never commit SP private keys to git or expose them in environment variables on developer machines.
- **Set a short assertion lifetime (5-10 minutes).** Assertions are bearer tokens; a stolen assertion can be replayed until it expires. The `NotOnOrAfter` field must be strictly validated.
- **Implement single logout (SLO).** Without SLO, logging out of the SP does not terminate the IdP session, allowing the user to re-authenticate silently via another SP.

## Common Mistakes

- **Disabling signature validation in development and forgetting to re-enable.** The most common production SAML vulnerability is `wantAssertionsSigned: false` left over from local testing.
- **Using string-based XML parsing instead of a secure XML library.** Standard DOM parsers are vulnerable to XXE attacks. Use SAML-specific libraries that disable DTD processing.
- **Trusting the NameID as the only user identifier.** If an attacker can change their NameID at the IdP, they can impersonate another user. Map to a stable, internal user ID.
- **Ignoring clock skew.** IdP and SP clocks that differ by more than the assertion lifetime cause legitimate logins to fail. Allow a small skew (1-5 minutes) but log warnings.
- **Not validating the `InResponseTo` field.** Without this check, an attacker can capture a legitimate assertion and replay it against a different authentication request.

## Frequently Asked Questions

**Q: What is the difference between SAML and OAuth 2.0?**
A: SAML is an XML-based standard for authentication and authorization, often used for enterprise SSO. OAuth 2.0 is a framework for delegated authorization, commonly used for API access and social login.

**Q: What are the roles in SAML?**
A: The Service Provider (SP) is the application users want to access. The Identity Provider (IdP) authenticates users and issues SAML assertions.

**Q: How do I secure SAML assertions?**
A: Sign SAML assertions and responses with XML signatures, encrypt assertions in transit, validate the destination and timestamps, and enforce strict certificate pinning.
