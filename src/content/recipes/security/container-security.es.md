---
contentType: recipes
slug: container-security
title: "Escaneo de Seguridad de Containers"
description: "Escanea imágenes de container para vulnerabilidades, misconfiguraciones y secrets con Trivy, Clair y Snyk antes de desplegar a producción."
metaDescription: "Escaneo de seguridad de containers: detección de vulnerabilidades con Trivy, Clair, Snyk, hardening de imágenes, detección de secrets y gates de seguridad en CI."
difficulty: intermediate
topics:
  - security
tags:
  - container-security
  - security
  - docker
  - devops
relatedResources:
  - /recipes/container-security-scanning
  - /docs/data-retention-policy-template
  - /docs/dependency-audit-template
  - /docs/penetration-test-template
  - /docs/security-incident-response-template
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Escaneo de seguridad de containers: detección de vulnerabilidades con Trivy, Clair, Snyk, hardening de imágenes, detección de secrets y gates de seguridad en CI."
  keywords:
    - container-security
    - security
    - docker
    - devops
---
## Visión General

El escaneo de seguridad de containers identifica vulnerabilidades en imágenes Docker antes de que lleguen a producción. Una única imagen base desactualizada puede exponer cientos de CVEs. Herramientas como Trivy, Clair y Snyk analizan paquetes de OS, dependencias de lenguajes e incluso secrets embebidos en capas. Integrar el escaneo en [CI/CD](/guides/devops/cicd-pipeline-guide) crea una puerta de seguridad que previene imágenes vulnerables de desplegarse.

## Cuándo Usar

Usa este recurso cuando:
- Las imágenes Docker se construyen de imágenes base públicas que pueden contener CVEs conocidos
- Necesitas cumplir con [frameworks de seguridad](/guides/security/security-best-practices-guide) (SOC 2, PCI-DSS, FedRAMP)
- Los developers agregan [dependencias](/guides/security/security-best-practices-guide) sin revisar su postura de seguridad
- Incidentes de producción han sido rastreados a librerías de sistema vulnerables

## Solución

### Trivy Scan en CI/CD (GitHub Actions)

```yaml
name: Container Security Scan
on: [push]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .
      
      - name: Scan with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'myapp:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'
```

### Dockerfile Security Hardening

```dockerfile
# Usar imagen base mínima
FROM gcr.io/distroless/nodejs20-debian12

# Ejecutar como non-root
USER 65532:65532

# Read-only root filesystem
COPY --chown=65532:65532 . /app
WORKDIR /app

# Sin shell access; sin package manager
EXPOSE 3000
CMD ["server.js"]
```

### Secret Detection (TruffleHog)

```bash
# Escanear capas de imagen para secrets embebidos
trufflehog docker --image=myapp:latest

# Escanear filesystem antes del build
trufflehog filesystem --directory=.
```

## Explicación

**Qué detectan los scanners**:

| Capa | Issues Detectados | Ejemplo |
|------|-------------------|---------|
| Paquetes OS | CVEs en paquetes apt/yum | Vulnerabilidad OpenSSL |
| Paquetes de lenguaje | CVEs en npm/pip/gems | log4j, lodash prototype pollution |
| Configuración | Misconfiguraciones | Ejecutar como root, sin read-only filesystem |
| Secrets | API keys, tokens | Credenciales AWS en ENV |
| Licencias | Riesgo de compliance | GPL en software propietario |

**Respuesta por severidad**:
- **Critical**: Bloquear deploy; arreglar inmediatamente
- **High**: Bloquear deploy; arreglar dentro de 24 horas
- **Medium**: Advertencia; arreglar dentro del sprint
- **Low**: Trackear; arreglar oportunísticamente

## Variantes

| Scanner | Velocidad | Profundidad | Ideal Para |
|---------|-----------|-------------|------------|
| Trivy | Rápido | OS + lenguaje | Integración CI; setup simple |
| Snyk | Medio | OS + lenguaje + SCA | Enterprise; compliance de licencias |
| Clair | Medio | Paquetes OS | Integración Harbor registry |
| Grype | Rápido | OS + lenguaje | Integración Syft SBOM |
| Twistlock | Medio | Full stack | Enterprise runtime protection |

## Lo que funciona

- **Scannea en cada build**: Las vulnerabilidades se descubren diariamente; la imagen limpia de ayer es el riesgo de hoy
- **Usa bases distroless o mínimas**: `distroless`, `alpine` o `scratch` reducen superficie de ataque
- **Pinea digests de imagen base**: `FROM node:20-alpine@sha256:abc...` previene tampering de tags
- **Multi-stage builds**: No envíes build tools (gcc, git) en imágenes de producción. Consulta [infraestructura inmutable](/guides/devops/infrastructure-as-code-guide).
- **Firma imágenes con Cosign**: Verifica integridad de imagen y provenance antes del deploy

## Errores Comunes

1. **Scanneando solo la imagen base**: Las dependencias de aplicación a menudo tienen más CVEs que el OS
2. **Usando tag `:latest`**: Builds no reproducibles hacen la atribución de vulnerabilidades imposible
3. **Sin threshold de severidad**: Scannear pero ignorar todos los resultados crea falsa confianza
4. **Secrets en ENV**: `ENV AWS_SECRET_ACCESS_KEY=...` es visible para cualquiera que haga pull de la imagen. Sigue [secrets management](/guides/security/security-best-practices-guide).
5. **Olvidando escaneo en runtime**: La imagen está limpia en build time; las vulnerabilidades en runtime (volúmenes montados, sidecars) necesitan monitoreo

## Preguntas Frecuentes

**P: ¿Debería bloquear el deploy en CVEs de severidad media?**
R: Empieza con critical/high solo. A medida que madure tu postura de seguridad, ajusta a medium. Balancea velocidad vs. seguridad.

**P: ¿Con qué frecuencia debería rescanear imágenes existentes?**
R: Diariamente. Los CVEs nuevos se publican continuamente. La imagen limpia de ayer puede tener la vulnerabilidad crítica de hoy.

**P: ¿Cuál es la diferencia entre SAST y container scanning?**
R: SAST analiza código fuente para bugs. Container scanning analiza el artifact construido (paquetes, configs, secrets).
