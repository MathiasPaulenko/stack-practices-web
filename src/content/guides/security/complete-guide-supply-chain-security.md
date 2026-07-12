---






contentType: guides
slug: complete-guide-supply-chain-security
title: "Complete Guide to Supply Chain Security"
description: "Secure your software supply chain end-to-end. Covers SBOM generation, dependency scanning, Sigstore, SLSA framework, provenance attestation, package registries, typosquatting, dependency confusion, and CI/CD pipeline hardening with practical code examples."
metaDescription: "Secure software supply chain. Covers SBOM, dependency scanning, Sigstore, SLSA, provenance attestation, typosquatting, dependency confusion, CI/CD."
difficulty: advanced
topics:
  - security
  - devops
  - infrastructure
tags:
  - supply-chain-security
  - security
  - guide
  - sbom
  - sigstore
  - slsa
  - dependency-scanning
  - provenance
relatedResources:
  - /guides/complete-guide-owasp-top-10-2025
  - /guides/complete-guide-secrets-management
  - /guides/complete-guide-api-security
  - /guides/ci-cd-security-guide
  - /recipes/python-secrets-management-vault
  - /docs/vulnerability-management-template
  - /guides/complete-guide-docker-production
lastUpdated: "2026-07-04"
author: "Mathias Paulenko"
seo:
  metaDescription: "Secure software supply chain. Covers SBOM, dependency scanning, Sigstore, SLSA, provenance attestation, typosquatting, dependency confusion, CI/CD."
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

## Introduction

Software supply chain attacks target the tools, processes, and dependencies that build your software. Attackers compromise build systems, inject malicious code into dependencies, or create typosquatted packages. The following guide covers SBOMs, dependency scanning, code signing with Sigstore, the SLSA framework, provenance attestation, and CI/CD hardening.

## Software Bill of Materials (SBOM)

### Generating an SBOM

```python
# Python: Generate SBOM with cyclonedx
# pip install cyclonedx-bom

# Generate SBOM from requirements.txt
# cyclonedx-py requirements -i requirements.txt -o sbom.json

# Generate SBOM from Poetry
# cyclonedx-py poetry -o sbom.json

# Node.js: Generate SBOM with npm
# npm sbom --sbom-format cyclonedx > sbom.json

# Java: Generate SBOM with Maven plugin
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

### SBOM Validation and Monitoring

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

# Usage
validator = SBOMValidator("sbom.json")

# Check license compliance
allowed = {"MIT", "Apache-2.0", "BSD-3-Clause", "ISC", "MPL-2.0"}
violations = validator.check_license_compliance(allowed)
for v in violations:
    print(f"License violation: {v['component']} uses {v['license']}")

# Check for outdated dependencies
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

# Parse and report
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

### SCA in CI/CD Pipeline

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

## Sigstore and Code Signing

### Signing Artifacts with Cosign

```bash
# Install cosign
brew install sigstore/cosign/cosign

# Generate key pair
cosign generate-key-pair

# Sign a container image
cosign sign --key cosign.key myregistry.com/myapp:v1.0.0

# Verify a signed image
cosign verify --key cosign.pub myregistry.com/myapp:v1.0.0

# Sign with keyless (OIDC-based, no key management)
cosign sign myregistry.com/myapp:v1.0.0

# Verify keyless signature
cosign verify myregistry.com/myapp:v1.0.0 \
  --certificate-identity "https://github.com/myorg/myrepo/.github/workflows/deploy.yml@refs/heads/main" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com"
```

### Signing Python Packages

```python
# Sign a Python package with sigstore
# pip install sigstore

# Sign a distribution
# python -m sigstore sign dist/myapp-1.0.0-py3-none-any.whl

# Verify a signed package
# python -m sigstore verify \
#   --identity "https://github.com/myorg/myapp/.github/workflows/release.yml@refs/tags/v1.0.0" \
#   --oidc-issuer "https://token.actions.githubusercontent.com" \
#   dist/myapp-1.0.0-py3-none-any.whl
```

### Signing in CI/CD

```yaml
# GitHub Actions: Sign container image with cosign
name: Build and Sign
on:
  push:
    tags: ["v*"]

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # Required for keyless signing
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
SLSA Level 1: Build process is scripted/automated
  - Build documented
  - Provenance available
  
SLSA Level 2: Build on managed platform
  - Version controlled source
  - Hosted build platform
  - Generated provenance (authenticated)
  
SLSA Level 3: Build platform hardened
  - Isolated builds
  - Tamper-resistant provenance
  - Two-party review for changes
  
SLSA Level 4: Audited build platform
  - Hermetic builds (no network)
  - Reproducible builds
  - Verified provenance
  
SLSA Level 5: Highest assurance
  - Policy-enforced builds
  - Monitored build platform
  - Supply chain policy enforcement
```

### Generating SLSA Provenance

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

# Usage
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

### The Attack

```text
Dependency confusion exploits package managers that check both
internal and public registries. If an attacker publishes a public
package with the same name as your internal package but a higher
version number, the package manager may download the attacker's
package instead of your internal one.

Attack vector:
  1. Attacker discovers internal package names (from error messages,
     job postings, or leaked configs)
  2. Attacker publishes a malicious package with the same name to
     the public registry (npm, PyPI) with a higher version
  3. Your build system fetches the attacker's package instead of
     your internal one
```

### Prevention

```python
# .npmrc: Force scoped packages to use internal registry
"""
@myorg:registry=https://npm.internal.myorg.com
registry=https://registry.npmjs.org
always-auth=true
"""

# pip.conf: Use internal index with explicit fallback
"""
[global]
index-url = https://pypi.internal.myorg.com/simple
extra-index-url = https://pypi.org/simple
trusted-host = pypi.internal.myorg.com
"""

# Better: Use a virtual repository (Artifactory, Nexus) that
# resolves internal packages first and proxies public packages
"""
[global]
index-url = https://artifactory.internal.myorg.com/api/pypi/pypi-virtual/simple
"""

# Verify package integrity with hashes
# requirements.txt with hashes
"""
requests==2.32.0 \
    --hash=sha256:1234abc... \
    --hash=sha256:5678def...
flask==3.0.3 \
    --hash=sha256:abcd123...
"""

# Install with hash checking
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
        """Detect if a package name is a typosquat of a popular package."""
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
        """Scan all dependencies for typosquats."""
        results = {}
        for dep in dependencies:
            name = dep.split("==")[0].split(">=")[0].split("<=")[0].strip()
            typosquats = self.detect_typosquats(name)
            if typosquats:
                results[name] = typosquats
        return results

# Usage
detector = TyposquatDetector()

# Check a suspicious package
suspicious = detector.detect_typosquats("reqeusts")
print(suspicious)  # Similar to "requests"

# Scan all dependencies
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
      id-token: write  # For OIDC
      packages: write
    
    steps:
      # Pin actions to SHA, not tags (tags can be moved)
      - uses: actions/checkout@8e5e7e5  # Pinned SHA
        with:
          fetch-depth: 0  # Full history for analysis
      
      # Verify commit signatures
      - name: Verify commits
        run: |
          git log --pretty=format:'%H %G?' main..HEAD | while read hash signed; do
            if [ "$signed" != "G" ] && [ "$signed" != "B" ]; then
              echo "Unsigned commit: $hash"
              exit 1
            fi
          done
      
      # Run in isolated environment
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
      
      # Scan for vulnerabilities
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
      
      # Upload with attestation
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
  [ ] All commits signed (GPG or SSH)
  [ ] Branch protection rules enforced
  [ ] Two-party review required for merges
  [ ] No force pushes to main branches
  [ ] Secrets scanned in git history

Dependencies:
  [ ] SBOM generated for every release
  [ ] Automated dependency scanning in CI/CD
  [ ] License compliance verified
  [ ] Dependency hashes pinned (pip --require-hashes, npm package-lock)
  [ ] Internal package names protected against dependency confusion
  [ ] Typosquatting detection on new dependencies

Build:
  [ ] Build runs in isolated environment (no network)
  [ ] Build tools pinned to specific versions
  [ ] GitHub Actions pinned to SHAs, not tags
  [ ] Build provenance generated (SLSA Level 3+)
  [ ] Artifacts signed with Sigstore/cosign

Distribution:
  [ ] Container images signed
  [ ] Provenance attestation attached
  [ ] Package registry requires authentication
  [ ] Download verification (checksums, signatures)
  [ ] Rollback plan for compromised packages
```

## FAQ

### What is an SBOM and why do I need one?

An SBOM (Software Bill of Materials) is a formal, machine-readable inventory of all components in your software, including transitive dependencies, their versions, and licenses. You need one to quickly identify if you are affected by a newly disclosed vulnerability (e.g., Log4Shell). Many regulations now require SBOMs (US Executive Order 14028). Generate one with cyclonedx or syft for every release.

### What is the SLSA framework?

SLSA (Supply-chain Levels for Software Artifacts) is a security framework that defines levels (1-5) of supply chain assurance. Higher levels require more rigorous controls: isolated builds, tamper-resistant provenance, hermetic builds, and audited platforms. Start at SLSA Level 1 (automated builds with provenance) and work toward Level 3 (hardened build platform with verified provenance).

### How do I prevent dependency confusion attacks?

Use a virtual repository (Artifactory, Nexus) that resolves internal packages first before proxying to public registries. Configure your package manager to check internal registries first. Pin dependency hashes (`pip install --require-hashes`). Never use the same package name internally and publicly. Monitor for your internal package names appearing on public registries.

### What is Sigstore and how does it work?

Sigstore is a free, open-source code signing tool that uses ephemeral keys and OIDC (OpenID Connect) for authentication. Instead of managing long-lived signing keys, you sign artifacts using a short-lived certificate issued by Sigstore's Fulcio CA, verified by your OIDC identity (GitHub Actions, Google, etc.). Signatures are stored in Rekor, a transparency log. This makes signing easy, secure, and auditable.

### How do I detect typosquatting in my dependencies?

Use a typosquatting detector that compares package names against a list of popular packages using string similarity (e.g., `difflib.SequenceMatcher`). Flag packages with high similarity (>80%) to popular names. Also check for common typosquatting patterns: character substitutions, added/removed characters, separator changes (- vs _), and appended suffixes (2, s, js).

### Should I pin GitHub Actions to commit SHAs?

Yes. Pinning actions to commit SHAs instead of tags prevents supply chain attacks where a malicious actor modifies a tag to point to a different commit. Tags are mutable — they can be moved. SHAs are immutable. Use `actions/checkout@<sha>` instead of `actions/checkout@v4`. Tools like renovatebot can automate SHA pinning and updates.

## See Also

- [CI/CD Security: Harden Your Pipelines and Prevent Supply](/guides/ci-cd-security-guide/)
- [Complete Guide to Secrets Management](/guides/complete-guide-secrets-management/)
- [Complete Guide to Docker in Production](/guides/complete-guide-docker-production/)
- [Disaster Recovery: RTO, RPO, and Resilient Recovery Runbooks](/guides/disaster-recovery-guide/)
- [Secrets Management: Vault, Cloud Managers](/guides/secrets-management-guide/)

