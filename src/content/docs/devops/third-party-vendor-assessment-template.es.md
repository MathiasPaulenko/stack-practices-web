---




contentType: docs
slug: third-party-vendor-assessment-template
title: "Plantilla de Evaluacion de Proveedores Terceros"
description: "Una plantilla estructurada para evaluar la seguridad, cumplimiento y postura operativa de proveedores terceros antes de la incorporacion o renovacion."
metaDescription: "Evalua proveedores terceros con esta plantilla. Cubre postura de seguridad, cumplimiento, compromisos de SLA y puntuacion de riesgo."
difficulty: intermediate
topics:
  - security
  - devops
tags:
  - vendor-assessment
  - third-party-risk
  - security
  - compliance
  - due-diligence
relatedResources:
  - /docs/data-breach-response-playbook
  - /docs/access-control-review-template
  - /docs/rbac-policy-template
  - /recipes/bash-iptables-firewall
  - /docs/dependency-vulnerability-report-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Evalua proveedores terceros con esta plantilla. Cubre postura de seguridad, cumplimiento, compromisos de SLA y puntuacion de riesgo."
  keywords:
    - evaluacion de proveedores
    - riesgo tercero
    - cuestionario de seguridad
    - debida diligencia
    - revision de cumplimiento




---

## Descripcion General

Una Plantilla de Evaluacion de Proveedores Terceros estandariza como tu organizacion evalua a proveedores externos antes de firmar un contrato, integrar un servicio o renovar un acuerdo. Recolecta evidencia sobre los controles de seguridad, certificaciones de cumplimiento, practicas operativas y postura de continuidad del negocio del proveedor para que los equipos puedan tomar decisiones de riesgo informadas.

## Cuando Usar


- For alternatives, see [Vulnerability Management Template](/es/docs/vulnerability-management-template/).

- Antes de incorporar un nuevo proveedor SaaS, cloud o infraestructura.
- Durante revisiones de seguridad anuales o renovaciones de contrato.
- Despues de que un proveedor experimente un incidente o violacion de seguridad.
- Cuando procurement requiere un proceso documentado de aceptacion de riesgo.
- Para comparar multiples proveedores contra los mismos criterios de seguridad.

## Prerequisitos

- Un apetito de riesgo definido y baselines de controles aceptables.
- Soporte legal o de procurement para la revision de contratos.
- Acceso a la documentacion de seguridad del proveedor, reportes SOC 2 o resumenes de pruebas de penetracion.
- Un stakeholder de ingenieria, seguridad y legal para la puntuacion.

## Solucion

### Plantilla

#### 1. Identificacion del Proveedor

| Campo | Descripcion | Ejemplo |
|-------|-------------|---------|
| Nombre del proveedor | Nombre legal | Acme Cloud Services |
| Descripcion del servicio | Que provee el proveedor | Managed Kubernetes hosting |
| Acceso a datos | Datos que procesara o almacenara | Direcciones de email de clientes, logs |
| Tipo de integracion | Como se conecta a tus sistemas | API, OAuth, SSO |
| Fecha de renovacion | Vencimiento del contrato | 2027-12-31 |

#### 2. Postura de Seguridad

| Area de Control | Respuesta del Proveedor | Evidencia Requerida | Puntuacion (1-5) |
|-----------------|-------------------------|---------------------|------------------|
| Cifrado en transito | TLS 1.2+ | Escaneo de certificado | |
| Cifrado en reposo | AES-256 | Documento de arquitectura | |
| Gestion de identidad y acceso | SSO + MFA | Captura de configuracion | |
| Logging y monitoreo | SIEM + alertas | Documento de politica | |
| Respuesta a incidentes | Equipo 24/7 | Runbook o clausula de contrato | |
| Gestion de vulnerabilidades | Escaneos mensuales | Reporte de escaneo | |

#### 3. Cumplimiento y Certificaciones

| Certificacion | Estado | Vencimiento | Notas |
|---------------|--------|-------------|-------|
| SOC 2 Type II | Vigente | 2026-09-30 | Reporte revisado |
| ISO 27001 | Vigente | 2027-03-15 | Certificado adjunto |
| GDPR / privacidad | Cumple | N/A | DPA firmado |
| HIPAA | N/A | N/A | Sin datos de salud |

#### 4. Resiliencia Operativa

| Topico | Pregunta | Respuesta |
|--------|----------|-----------|
| SLA de uptime | Disponibilidad garantizada | 99.95% mensual |
| Respuesta de soporte | Tiempo para issues criticos | 1 hora |
| Residencia de datos | Donde se almacenan los datos | UE, US-East |
| Backup y recuperacion | Objetivos RPO / RTO | 1 hora / 4 horas |
| Estrategia de salida | Como se devuelven o eliminan datos | Export cifrado en 30 dias |

#### 5. Resumen de Puntuacion de Riesgo

| Categoria de Riesgo | Peso | Puntuacion | Puntuacion Ponderada |
|---------------------|------|------------|----------------------|
| Seguridad | 30% | 4 | 1.2 |
| Cumplimiento | 25% | 5 | 1.25 |
| Operativo | 25% | 3 | 0.75 |
| Financiero | 10% | 4 | 0.4 |
| Reputacional | 10% | 3 | 0.3 |
| **Total** | 100% | | **3.9** |

#### 6. Decision

| Resultado | Condicion |
|-----------|-----------|
| Aprobar | Puntuacion total >= 4.0 y sin brechas criticas |
| Aprobar con condiciones | Puntuacion 3.0 - 3.9 y brechas remediables |
| Rechazar | Puntuacion < 3.0 o riesgo critico no mitigado |

## Explicacion

La plantilla recolecta evidencia consistente entre proveedores, lo que facilita comparar riesgos y justificar decisiones. La puntuacion convierte respuestas cualitativas en numeros que se pueden rastrear a lo largo del tiempo y escalar a liderazgo. La seccion de decision elimina la ambiguedad sobre si un proveedor puede avanzar.

## Variantes

- **Revision ligera de proveedor**: Una checklist corta de 10 preguntas para proveedores de bajo riesgo como herramientas de analytics o marketing.
- **Revision de infraestructura critica**: Una evaluacion profunda con diagramas arquitectonicos, derechos de revision de codigo y auditorias presenciales.
- **Evaluacion de proveedor AI/ML**: Agrega preguntas sobre datos de entrenamiento, sesgo, propiedad de outputs y explicabilidad.
- **Revision de renovacion**: Omite preguntas basicas de onboarding y se enfoca en cambios desde la ultima evaluacion.

## Lo que funciona

- Reutiliza la misma plantilla para cada proveedor para mantener comparaciones justas.
- Solicita evidencia, no solo respuestas si/no.
- Define una puntuacion minima y controles obligatorios antes de comenzar la revision.
- Almacena las evaluaciones completadas en un repositorio central para auditorias.
- Re-evalua proveedores de alto riesgo anualmente o despues de incidentes mayores.
- Incluye clausulas de derecho a auditar en contratos cuando el riesgo es alto.

## Errores Comunes

- Aceptar diapositivas de marketing del proveedor como evidencia.
- Saltar la re-evaluacion durante renovaciones.
- No rastrear compromisos de remediacion despues de aprobacion condicional.
- Asignar la puntuacion a una sola persona sin revision entre pares.
- Ignorar subcontratistas o dependencias de cuarto nivel usadas por el proveedor.

## FAQs

### Que pasa si un proveedor se niega a compartir un reporte SOC 2?

Solicita un resumen de controles o un cuestionario de cumplimiento. Si aun se niega, escala el riesgo y considera requerir un derecho a auditar contractual o controles de seguridad adicionales.

### Con que frecuencia se deben reevaluar los proveedores?

Anualmente para proveedores de alto riesgo, y en cada renovacion o cambio mayor de servicio para los demas. Tambien se recomiendan revisiones disparadas por incidentes.

### Quien debe ser dueno del proceso de evaluacion?

Seguridad o riesgo usualmente son duenos, pero procurement, legal e ingenieria deben aportar. La aprobacion final debe involucrar al dueno de los datos.

## Soluciones Avanzadas

### Cuestionario automatizado de seguridad de proveedores con verificaciones API

Automatiza el cribado inicial de proveedores verificando APIs publicas de seguridad y registros antes de enviar el cuestionario completo:

```python
import requests
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class VendorSecurityCheck:
    vendor_name: str
    domain: str
    results: dict = field(default_factory=dict)

    def check_dnssec(self) -> None:
        """Check if the vendor domain has DNSSEC enabled."""
        try:
            resp = requests.get(
                f"https://dns.google/resolve?name={self.domain}&type=DNSKEY",
                timeout=10
            )
            has_dnssec = len(resp.json().get("Answer", [])) > 0
            self.results["dnssec"] = "enabled" if has_dnssec else "disabled"
        except Exception:
            self.results["dnssec"] = "error"

    def check_tls(self) -> None:
        """Check TLS configuration via SSL Labs API."""
        try:
            resp = requests.get(
                f"https://api.ssllabs.com/api/v3/analyze?host={self.domain}",
                timeout=15
            )
            data = resp.json()
            self.results["tls_grade"] = data.get("grade", "pending")
            self.results["tls_protocols"] = data.get("protocols", [])
        except Exception:
            self.results["tls_grade"] = "error"

    def check_cps(self) -> None:
        """Check for published Certificate Practice Statement."""
        cps_urls = [
            f"https://{self.domain}/cps",
            f"https://{self.domain}/.well-known/security.txt",
        ]
        for url in cps_urls:
            try:
                resp = requests.head(url, timeout=10, allow_redirects=True)
                if resp.status_code == 200:
                    self.results["security_txt"] = url
                    return
            except Exception:
                pass
        self.results["security_txt"] = "not found"

    def check_breach_history(self) -> None:
        """Check Have I Been Pwned API for known breaches."""
        try:
            resp = requests.get(
                f"https://haveibeenpwned.com/api/v3/breaches?domain={self.domain}",
                headers={"User-Agent": "VendorAssessment/1.0"},
                timeout=10
            )
            if resp.status_code == 200:
                breaches = resp.json()
                self.results["breach_count"] = len(breaches)
                self.results["breaches"] = [b["Name"] for b in breaches[:5]]
            else:
                self.results["breach_count"] = 0
        except Exception:
            self.results["breach_count"] = "error"

    def run_all(self) -> dict:
        self.check_dnssec()
        self.check_tls()
        self.check_cps()
        self.check_breach_history()
        return self.results

# Example usage
vendor = VendorSecurityCheck(vendor_name="Acme Cloud", domain="acmecloud.com")
report = vendor.run_all()
for key, value in report.items():
    print(f"  {key}: {value}")
```

### Automatizacion de puntuacion de riesgo de proveedores

Automatiza la puntuacion de riesgo ponderada de la plantilla de evaluacion:

```python
from dataclasses import dataclass
from typing import Dict

@dataclass
class VendorRiskScorer:
    scores: Dict[str, float]  # category -> score (1-5)
    weights: Dict[str, float] = field(default_factory=lambda: {
        "security": 0.30,
        "compliance": 0.25,
        "operational": 0.25,
        "financial": 0.10,
        "reputational": 0.10,
    })

    @property
    def total_score(self) -> float:
        total = 0.0
        for category, weight in self.weights.items():
            score = self.scores.get(category, 0)
            total += score * weight
        return round(total, 2)

    @property
    def decision(self) -> str:
        score = self.total_score
        if score >= 4.0:
            return "APPROVE"
        elif score >= 3.0:
            return "APPROVE_WITH_CONDITIONS"
        else:
            return "REJECT"

    @property
    def critical_gaps(self) -> list:
        gaps = []
        for category, score in self.scores.items():
            if score <= 2:
                gaps.append(f"{category}: score {score}/5 is critical")
        return gaps

    def report(self) -> str:
        lines = ["Vendor Risk Assessment Report", "=" * 40]
        for cat, score in self.scores.items():
            weight = self.weights.get(cat, 0)
            weighted = round(score * weight, 2)
            lines.append(f"  {cat}: {score}/5 (weight: {weight:.0%}, weighted: {weighted})")
        lines.append(f"\n  Total Score: {self.total_score}/5.0")
        lines.append(f"  Decision: {self.decision}")
        if self.critical_gaps:
            lines.append(f"  Critical Gaps: {', '.join(self.critical_gaps)}")
        return "\n".join(lines)

from dataclasses import field

# Example usage
scorer = VendorRiskScorer(scores={
    "security": 4,
    "compliance": 5,
    "operational": 3,
    "financial": 4,
    "reputational": 3,
})
print(scorer.report())
```

### Monitoreo continuo de proveedores con verificaciones programadas

Configura una tarea programada de CI para monitorear cambios en la postura de seguridad de proveedores entre evaluaciones formales:

```yaml
# .github/workflows/vendor-monitoring.yml
name: Vendor Security Monitoring
on:
  schedule:
    - cron: "0 6 * * 1"  # Weekly Monday 6am
  workflow_dispatch:

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Install dependencies
        run: pip install requests pyyaml
      - name: Run vendor checks
        env:
          SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
        run: |
          python scripts/vendor_monitoring.py \
            --config vendor-registry.yaml \
            --notify slack
```

```yaml
# vendor-registry.yaml
vendors:
  - name: "Acme Cloud Services"
    domain: "acmecloud.com"
    risk_level: high
    renewal_date: "2027-12-31"
  - name: "Analytics Pro"
    domain: "analyticspro.com"
    risk_level: low
    renewal_date: "2026-09-15"
```

## Mejores Practicas Adicionales

1. **Mapea el acceso del proveedor a tus niveles de clasificacion de datos.** No todos los proveedores necesitan acceso al mismo nivel de datos. Documenta que datos puede acceder cada proveedor y alinea los controles en consecuencia:

```yaml
# vendor-data-access-matrix.yaml
data_classification:
  public:
    vendors: ["analytics-pro", "marketing-tools"]
    required_controls: ["tls-12", "basic-auth"]
  internal:
    vendors: ["acme-cloud", "support-zendesk"]
    required_controls: ["tls-12", "sso", "mfa", "dpa-signed"]
  restricted:
    vendors: ["payment-processor"]
    required_controls: ["tls-13", "sso", "mfa", "pci-dss", "right-to-audit"]
```

2. **Rastrea los compromisos de remediacion con fechas de vencimiento.** Los proveedores suelen prometer correcciones durante la evaluacion pero nunca las entregan. Vincula los compromisos a las renovaciones de contrato:

```bash
#!/bin/bash
# Check for overdue vendor remediation items
set -euo pipefail

REMEDICATION_FILE="vendor-remediation-log.csv"
TODAY=$(date +%Y-%m-%d)

awk -F',' -v today="$TODAY" '
NR>1 && $5 < today && $6 != "completed" {
    print "OVERDUE: " $1 " - " $2 " (due: " $5 ", status: " $6 ")"
}' "$REMEDICATION_FILE"
```

## Errores Comunes Adicionales

1. **No evaluar el riesgo de cuarto nivel (subcontratistas).** Tu proveedor puede usar subcontratistas que procesan tus datos. Exige la divulgacion de sub-procesadores y su postura de seguridad:

```python
# Check vendor sub-processor list against your approved list
approved_subprocessors = {"aws", "gcp", "azure", "cloudflare"}
vendor_subprocessors = {"aws", "digitalocean", "cloudflare"}

unapproved = vendor_subprocessors - approved_subprocessors
if unapproved:
    print(f"Unapproved sub-processors found: {unapproved}")
```

2. **Aceptar un reporte SOC 2 sin verificar el alcance.** Un reporte SOC 2 puede cubrir solo un subconjunto de los servicios del proveedor. Verifica que el reporte cubra los sistemas y controles relevantes para tu engagement:

```markdown
## SOC 2 Scope Verification Checklist
- [ ] Report covers the specific service you will use
- [ ] Report period is current (within last 12 months)
- [ ] Trust criteria match your requirements (Security, Availability, Confidentiality, Processing Integrity, Privacy)
- [ ] No qualified opinion or material exceptions
- [ ] Description of system matches actual architecture
```

## Preguntas Frecuentes Adicionales

### Que debemos hacer si un proveedor sufre una violacion durante nuestro contrato?

Activa tu plan de respuesta a incidentes. Notifica a los usuarios afectados si el proveedor proceso sus datos. Exige un reporte post-incidente del proveedor, evalua si la violacion exploto una brecha en sus controles de seguridad, y decide si continuar, renegociar o terminar el contrato.

### Como manejamos proveedores que no pueden cumplir con nuestros requisitos de seguridad?

Si el proveedor proporciona funcionalidad critica que no se puede reemplazar, implementa controles compensatorios: restringe el acceso a datos, agrega monitoreo, requiere indemnizacion contractual, y documenta una aceptacion formal de riesgo con fecha de vencimiento y aprobacion ejecutiva.
