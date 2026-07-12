---
contentType: guides
slug: complete-guide-supply-chain-security
title: "Referencia Detallada de Supply Chain Security"
description: "Asegurar tu software supply chain end-to-end. Cubre generacion de SBOM, dependency scanning, Sigstore, SLSA framework, provenance attestation, package registries, typosquatting, dependency confusion y hardening de CI/CD pipelines con ejemplos de codigo."
metaDescription: "Asegurar software supply chain. Cubre SBOM, dependency scanning, Sigstore, SLSA, provenance, typosquatting, dependency confusion, CI/CD."
difficulty: advanced
topics:
  - security
  - devops
  - infrastructure
tags:
  - supply-chain-security
  - security
  - guia
  - sbom
  - sigstore
  - slsa
  - dependency-scanning
  - provenance
relatedResources:
  - /guides/security/complete-guide-owasp-top-10-2025
  - /guides/security/complete-guide-secrets-management
  - /guides/security/complete-guide-api-security
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Asegurar software supply chain. Cubre SBOM, dependency scanning, Sigstore, SLSA, provenance, typosquatting, dependency confusion, CI/CD."
  keywords:
    - supply chain security
    - sbom
    - dependency scanning
    - sigstore
    - slsa framework
    - provenance attestation
    - typosquatting
    - dependency confusion
---

## Introducción

Los software supply chain attacks targetean las tools, processes, y dependencies que construyen tu software. Attackers comprometen build systems, injectan malicious code en dependencies, o crean typosquatted packages. Lo siguiente es una guia practica para SBOMs, dependency scanning, code signing con Sigstore, el SLSA framework, provenance attestation, y CI/CD hardening.

## Software Bill of Materials (SBOM)

### Generar un SBOM

```python
# Python: Generar SBOM con cyclonedx
# pip install cyclonedx-bom

# Generate SBOM desde requirements.txt
# cyclonedx-py requirements -i requirements.txt -o sbom.json

# Generate SBOM desde Poetry
# cyclonedx-py poetry -o sbom.json

# Node.js: Generate SBOM con npm
# npm sbom --sbom-format cyclonedx > sbom.json

# Java: Generate SBOM con Maven plugin
# mvn org.cyclonedx:cyclonedx-maven-plugin:makeAggregateBom
```

```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "components": [
    {
      "type": "library",
      "name": "requests",
      "version": "2.31.0",
      "purl": "pkg:pypi/requests@2.31.0",
      "licenses": [
        {"license": {"id": "Apache-2.0"}}
      ]
    },
    {
      "type": "library",
      "name": "flask",
      "version": "3.0.0",
      "purl": "pkg:pypi/flask@3.0.0",
      "licenses": [
        {"license": {"id": "BSD-3-Clause"}}
      ]
    }
  ]
}
```

### SBOM Validation y Monitoring

```python
import json
from datetime import datetime

class SBOMValidator:
    def __init__(self, sbom_path: str):
        with open(sbom_path) as f:
            self.sbom = json.load(f)
    
    def get_components(self) -> list:
        return self.sbom.get("components", [])
    
    def find_component(self, name: str) -> dict | None:
        for comp in self.get_components():
            if comp["name"] == name:
                return comp
        return None
    
    def check_license_compliance(self, allowed_licenses: set) -> list:
        violations = []
        for comp in self.get_components():
            licenses = comp.get("licenses", [])
            for lic in licenses:
                lic_id = lic.get("license", {}).get("id", "")
                if lic_id and lic_id not in allowed_licenses:
                    violations.append({
                        "component": comp["name"],
                        "version": comp["version"],
                        "license": lic_id
                    })
        return violations
    
    def check_outdated(self, latest_versions: dict) -> list:
        outdated = []
        for comp in self.get_components():
            name = comp["name"]
            current = comp["version"]
            latest = latest_versions.get(name)
            if latest and current != latest:
                outdated.append({
                    "component": name,
                    "current": current,
                    "latest": latest
                })
        return outdated

# Uso
validator = SBOMValidator("sbom.json")

# Checkear license compliance
allowed = {"MIT", "Apache-2.0", "BSD-3-Clause", "ISC", "MPL-2.0"}
violations = validator.check_license_compliance(allowed)
for v in violations:
    print(f"License violation: {v['component']} uses {v['license']}")

# Checkear outdated dependencies
latest = {"requests": "2.32.0", "flask": "3.0.3"}
outdated = validator.check_outdated(latest)
for o in outdated:
    print(f"Outdated: {o['component']} {o['current']} -> {o['latest']}")
```

## Dependency Scanning

### Automated Vulnerability Scanning

```python
# Python: pip-audit
# pip install pip-audit
# pip-audit --strict --format json > audit-report.json

import subprocess
import json

def run_pip_audit() -> dict:
    result = subprocess.run(
        ["pip-audit", "--format", "json"],
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        return json.loads(result.stdout) if result.stdout else {}
    return json.loads(result.stdout) if result.stdout else {"dependencies": []}

# Node.js: npm audit
def run_npm_audit() -> dict:
    result = subprocess.run(
        ["npm", "audit", "--json"],
        capture_output=True,
        text=True
    )
    return json.loads(result.stdout)

# Parse y report
def report_vulnerabilities(audit_data: dict) -> str:
    vulns = audit_data.get("vulnerabilities", {})
    if not vulns:
        return "No vulnerabilities found"
    
    report = []
    for name, info in vulns.items():
        severity = info.get("severity", "unknown")
        via = info.get("via", [])
        fix_available = info.get("fixAvailable", False)
        
        report.append(
            f"  {name}: {severity} (fix available: {fix_available})"
        )
    
    return "\n".join(report)
```

### SCA en CI/CD Pipeline

```yaml
# .github/workflows/sca.yml
name: Software Composition Analysis
on: [push, pull_request]

jobs:
  sca:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Python dependency audit
        run: |
          pip install pip-audit
          pip-audit --strict --require-hashes
      
      - name: npm audit
        run: |
          npm audit --audit-level=high
          npm audit signatures  # Verify package signatures
      
      - name: Trivy filesystem scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: fs
          scan-ref: .
          severity: HIGH,CRITICAL
          format: json
          output: trivy-report.json
      
      - name: Snyk scan
        uses: snyk/actions/python@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
      
      - name: Generate SBOM
        run: |
          pip install cyclonedx-bom
          cyclonedx-py requirements -i requirements.txt -o sbom.json
      
      - name: Upload SBOM
        uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.json
```

## Sigstore y Code Signing

### Firmar Artifacts con Cosign

```bash
# Install cosign
brew install sigstore/cosign/cosign

# Generate key pair
cosign generate-key-pair

# Sign un container image
cosign sign --key cosign.key myregistry.com/myapp:v1.0.0

# Verify un signed image
cosign verify --key cosign.pub myregistry.com/myapp:v1.0.0

# Sign con keyless (OIDC-based, no key management)
cosign sign myregistry.com/myapp:v1.0.0

# Verify keyless signature
cosign verify myregistry.com/myapp:v1.0.0 \
  --certificate-identity "https://github.com/myorg/myrepo/.github/workflows/deploy.yml@refs/heads/main" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com"
```

### Firmar Python Packages

```python
# Sign un Python package con sigstore
# pip install sigstore

# Sign un distribution
# python -m sigstore sign dist/myapp-1.0.0-py3-none-any.whl

# Verify un signed package
# python -m sigstore verify \
#   --identity "https://github.com/myorg/myapp/.github/workflows/release.yml@refs/tags/v1.0.0" \
#   --oidc-issuer "https://token.actions.githubusercontent.com" \
#   dist/myapp-1.0.0-py3-none-any.whl
```

### Firmar en CI/CD

```yaml
# GitHub Actions: Sign container image con cosign
name: Build and Sign
on:
  push:
    tags: ["v*"]

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # Required para keyless signing
      packages: write
    steps:
      - uses: actions/checkout@v4
      
      - name: Build image
        run: docker build -t ghcr.io/myorg/myapp:${{ github.ref_name }} .
      
      - name: Push image
        run: docker push ghcr.io/myorg/myapp:${{ github.ref_name }}
      
      - name: Install cosign
        uses: sigstore/cosign-installer@v3
      
      - name: Sign image (keyless)
        run: |
          cosign sign --yes ghcr.io/myorg/myapp:${{ github.ref_name }}
      
      - name: Generate provenance attestation
        run: |
          cosign attest --yes \
            --predicate <(echo '{"buildType":"github-actions","repository":"myorg/myapp"}') \
            --type slsaprovenance \
            ghcr.io/myorg/myapp:${{ github.ref_name }}
```

## SLSA Framework

### SLSA Levels

```text
SLSA Level 1: Build process es scripted/automated
  - Build documented
  - Provenance available
  
SLSA Level 2: Build en managed platform
  - Version controlled source
  - Hosted build platform
  - Generated provenance (authenticated)
  
SLSA Level 3: Build platform hardened
  - Isolated builds
  - Tamper-resistant provenance
  - Two-party review para changes
  
SLSA Level 4: Audited build platform
  - Hermetic builds (no network)
  - Reproducible builds
  - Verified provenance
  
SLSA Level 5: Highest assurance
  - Policy-enforced builds
  - Monitored build platform
  - Supply chain policy enforcement
```

### Generar SLSA Provenance

```python
import json
from datetime import datetime

def generate_provenance(
    source_repo: str,
    commit_sha: str,
    build_command: str,
    artifacts: list,
    builder_id: str
) -> dict:
    """Generate SLSA Level 3 provenance attestation."""
    provenance = {
        "_type": "https://in-toto.io/Statement/v0.1",
        "subject": [
            {
                "name": artifact["name"],
                "digest": artifact["digest"]
            }
            for artifact in artifacts
        ],
        "predicateType": "https://slsa.dev/provenance/v0.2",
        "predicate": {
            "builder": {
                "id": builder_id
            },
            "buildType": "https://github.com/myorg/myrepo/.github/workflows/build.yml",
            "invocation": {
                "configSource": {
                    "uri": source_repo,
                    "digest": {"sha1": commit_sha}
                },
                "parameters": {
                    "build_command": build_command
                }
            },
            "buildConfig": {
                "source": source_repo,
                "commit": commit_sha
            },
            "metadata": {
                "buildStartedOn": datetime.now().isoformat(),
                "completeness": {
                    "parameters": True,
                    "environment": True,
                    "materials": True
                },
                "reproducible": False
            },
            "materials": [
                {
                    "uri": source_repo,
                    "digest": {"sha1": commit_sha}
                }
            ]
        }
    }
    return provenance

# Uso
provenance = generate_provenance(
    source_repo="https://github.com/myorg/myapp",
    commit_sha="abc123def456",
    build_command="docker build -t myapp:v1.0.0 .",
    artifacts=[{
        "name": "ghcr.io/myorg/myapp:v1.0.0",
        "digest": {"sha256": "a1b2c3d4e5f6..."}
    }],
    builder_id="https://github.com/actions/runner"
)

with open("provenance.json", "w") as f:
    json.dump(provenance, f, indent=2)
```

## Dependency Confusion Attacks

### El Attack

```text
Dependency confusion explota package managers que checkean ambos
internal y public registries. Si un attacker publish un public
package con el mismo name que tu internal package pero un higher
version number, el package manager puede download el attacker's
package en vez de tu internal one.

Attack vector:
  1. Attacker descubre internal package names (de error messages,
     job postings, o leaked configs)
  2. Attacker publish un malicious package con el mismo name al
     public registry (npm, PyPI) con un higher version
  3. Tu build system fetcha el attacker's package en vez de
     tu internal one
```

### Prevencion

```python
# .npmrc: Force scoped packages a usar internal registry
"""
@myorg:registry=https://npm.internal.myorg.com
registry=https://registry.npmjs.org
always-auth=true
"""

# pip.conf: Usar internal index con explicit fallback
"""
[global]
index-url = https://pypi.internal.myorg.com/simple
extra-index-url = https://pypi.org/simple
trusted-host = pypi.internal.myorg.com
"""

# Mejor: Usar un virtual repository (Artifactory, Nexus) que
# resuelve internal packages first y proxies public packages
"""
[global]
index-url = https://artifactory.internal.myorg.com/api/pypi/pypi-virtual/simple
"""

# Verify package integrity con hashes
# requirements.txt con hashes
"""
requests==2.32.0 \
    --hash=sha256:1234abc... \
    --hash=sha256:5678def...
flask==3.0.3 \
    --hash=sha256:abcd123...
"""

# Install con hash checking
# pip install --require-hashes -r requirements.txt
```

## Typosquatting Detection

```python
import difflib
from typing import List

class TyposquatDetector:
    POPULAR_PACKAGES = [
        "requests", "flask", "django", "fastapi", "numpy",
        "pandas", "scipy", "matplotlib", "tensorflow", "torch",
        "transformers", "pytest", "celery", "redis", "sqlalchemy",
        "pydantic", "uvicorn", "gunicorn", "httpx", "aiohttp"
    ]
    
    def detect_typosquats(self, package_name: str, threshold: float = 0.8) -> list:
        """Detectar si un package name es un typosquat de un popular package."""
        typosquats = []
        
        for popular in self.POPULAR_PACKAGES:
            similarity = difflib.SequenceMatcher(None, package_name, popular).ratio()
            if similarity >= threshold and package_name != popular:
                typosquats.append({
                    "package": package_name,
                    "mimics": popular,
                    "similarity": similarity,
                    "reason": self._get_reason(package_name, popular)
                })
        
        return typosquats
    
    def _get_reason(self, name: str, target: str) -> str:
        if name == target + "s" or name == target + "2":
            return f"Appended suffix to {target}"
        if name == target.replace("s", ""):
            return f"Removed trailing 's' from {target}"
        if name == target.replace("-", "_") or name == target.replace("_", "-"):
            return f"Changed separator in {target}"
        if len(name) == len(target) and sum(a != b for a, b in zip(name, target)) <= 2:
            return f"Character substitution in {target}"
        return f"Similar to {target}"
    
    def scan_dependencies(self, dependencies: list) -> dict:
        """Scanear todas las dependencies para typosquats."""
        results = {}
        for dep in dependencies:
            name = dep.split("==")[0].split(">=")[0].split("<=")[0].strip()
            typosquats = self.detect_typosquats(name)
            if typosquats:
                results[name] = typosquats
        return results

# Uso
detector = TyposquatDetector()

# Checkear un suspicious package
suspicious = detector.detect_typosquats("reqeusts")
print(suspicious)  # Similar a "requests"

# Scanear todas las dependencies
deps = ["requests==2.31.0", "flask==3.0.0", "reqeusts==1.0.0", "numpyy==1.0.0"]
results = detector.scan_dependencies(deps)
for pkg, typosquats in results.items():
    for ts in typosquats:
        print(f"WARNING: {ts['package']} mimics {ts['mimics']} ({ts['reason']})")
```

## CI/CD Pipeline Hardening

```yaml
# Hardened GitHub Actions workflow
name: Secure Build
on:
  push:
    branches: [main]
  pull_request:

jobs:
  secure-build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write  # Para OIDC
      packages: write
    
    steps:
      # Pin actions a SHA, no tags (tags pueden ser moved)
      - uses: actions/checkout@8e5e7e5  # Pinned SHA
        with:
          fetch-depth: 0  # Full history para analysis
      
      # Verify commit signatures
      - name: Verify commits
        run: |
          git log --pretty=format:'%H %G?' main..HEAD | while read hash signed; do
            if [ "$signed" != "G" ] && [ "$signed" != "B" ]; then
              echo "Unsigned commit: $hash"
              exit 1
            fi
          done
      
      # Run en isolated environment
      - name: Build in container
        run: |
          docker run --rm \
            --network=none \
            --read-only \
            --tmpfs /tmp \
            -v $(pwd):/src:ro \
            -v $(pwd)/build:/build \
            myorg/builder:latest \
            /bin/sh -c "cd /src && npm ci && npm run build -- --outDir /build"
      
      # Generate SBOM
      - name: Generate SBOM
        run: |
          npx cyclonedx-bom -o build/sbom.json
      
      # Scanear vulnerabilities
      - name: Trivy scan
        uses: aquasecurity/trivy-action@0.20.0
        with:
          scan-type: fs
          scan-ref: ./build
          severity: HIGH,CRITICAL
          exit-code: 1  # Fail build on critical vulns
      
      # Sign artifacts
      - uses: sigstore/cosign-installer@v3
      - name: Sign artifacts
        run: |
          cosign sign-blob --yes build/app.tar.gz --output-signature build/app.sig
          cosign sign-blob --yes build/sbom.json --output-signature build/sbom.sig
      
      # Generate provenance
      - name: Generate provenance
        uses: slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml@v2.0.0
      
      # Upload con attestation
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-outputs
          path: |
            build/app.tar.gz
            build/app.sig
            build/sbom.json
            build/sbom.sig
            provenance.json
```

## Security Checklist

```text
Supply Chain Security Checklist:

Source Code:
  [ ] Todos los commits signed (GPG o SSH)
  [ ] Branch protection rules enforced
  [ ] Two-party review required para merges
  [ ] No force pushes a main branches
  [ ] Secrets scanned en git history

Dependencies:
  [ ] SBOM generated para every release
  [ ] Automated dependency scanning en CI/CD
  [ ] License compliance verified
  [ ] Dependency hashes pinned (pip --require-hashes, npm package-lock)
  [ ] Internal package names protected contra dependency confusion
  [ ] Typosquatting detection en new dependencies

Build:
  [ ] Build runs en isolated environment (no network)
  [ ] Build tools pinned a specific versions
  [ ] GitHub Actions pinned a SHAs, no tags
  [ ] Build provenance generated (SLSA Level 3+)
  [ ] Artifacts signed con Sigstore/cosign

Distribution:
  [ ] Container images signed
  [ ] Provenance attestation attached
  [ ] Package registry requires authentication
  [ ] Download verification (checksums, signatures)
  [ ] Rollback plan para compromised packages
```

## Preguntas Frecuentes

### ¿Qué es un SBOM y por qué necesito uno?

Un SBOM (Software Bill of Materials) es un formal, machine-readable inventory de todos los components en tu software, incluyendo transitive dependencies, sus versions, y licenses. Necesitas uno para quickly identificar si estas affected por un newly disclosed vulnerability (e.g., Log4Shell). Muchas regulations ahora require SBOMs (US Executive Order 14028). Generate uno con cyclonedx o syft para every release.

### ¿Qué es el SLSA framework?

SLSA (Supply-chain Levels for Software Artifacts) es un security framework que define levels (1-5) de supply chain assurance. Higher levels require mas rigorous controls: isolated builds, tamper-resistant provenance, hermetic builds, y audited platforms. Empieza en SLSA Level 1 (automated builds con provenance) y trabaja toward Level 3 (hardened build platform con verified provenance).

### ¿Cómo prevengo dependency confusion attacks?

Usa un virtual repository (Artifactory, Nexus) que resuelve internal packages first antes de proxying a public registries. Configura tu package manager para checkear internal registries first. Pin dependency hashes (`pip install --require-hashes`). Nunca uses el mismo package name internamente y publicamente. Monitorea por tus internal package names apareciendo en public registries.

### ¿Qué es Sigstore y cómo funciona?

Sigstore es un free, open-source code signing tool que usa ephemeral keys y OIDC (OpenID Connect) para authentication. En vez de managear long-lived signing keys, firmas artifacts usando un short-lived certificate issued por Sigstore's Fulcio CA, verified por tu OIDC identity (GitHub Actions, Google, etc.). Signatures son stored en Rekor, un transparency log. Esto hace signing easy, secure, y auditable.

### ¿Cómo detecto typosquatting en mis dependencies?

Usa un typosquatting detector que compara package names contra una lista de popular packages usando string similarity (e.g., `difflib.SequenceMatcher`). Flag packages con high similarity (>80%) a popular names. Tambien checkea common typosquatting patterns: character substitutions, added/removed characters, separator changes (- vs _), y appended suffixes (2, s, js).

### ¿Debería pin GitHub Actions a commit SHAs?

Si. Pinning actions a commit SHAs en vez de tags previene supply chain attacks donde un malicious actor modifica un tag para point a un different commit. Tags son mutable — pueden ser moved. SHAs son immutable. Usa `actions/checkout@<sha>` en vez de `actions/checkout@v4`. Tools como renovatebot pueden automatizar SHA pinning y updates.
