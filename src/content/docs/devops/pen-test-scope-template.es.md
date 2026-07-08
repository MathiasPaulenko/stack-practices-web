---
contentType: docs
slug: pen-test-scope-template
title: "Plantilla de Alcance de Prueba de Penetracion"
description: "Una plantilla para definir los limites, objetivos, reglas y entregables de una prueba de penetracion."
metaDescription: "Define los limites de una prueba de penetracion con esta plantilla. Cubre objetivos, exclusiones, reglas de juego, entregables y cronograma."
difficulty: intermediate
topics:
  - security
  - testing
tags:
  - penetration-test
  - security-assessment
  - scope
  - red-team
  - compliance
relatedResources:
  - /docs/devops/container-security-baseline-template
  - /docs/devops/network-segmentation-policy-template
  - /docs/devops/compliance-gap-analysis-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Define los limites de una prueba de penetracion con esta plantilla. Cubre objetivos, exclusiones, reglas de juego, entregables y cronograma."
  keywords:
    - alcance de prueba de penetracion
    - evaluacion de seguridad
    - reglas de juego
    - plantilla de pen test
    - evaluacion de vulnerabilidades
---

## Descripcion General

Una Plantilla de Alcance de Prueba de Penetracion define que se probara, que no se probara, como se conducira la prueba y que espera recibir la organizacion. Un alcance claro protege a la organizacion de interrupciones no deseadas, previene problemas legales para los probadores y asegura que el compromiso entregue valor util.

## Cuando Usar

- Contratar una firma de seguridad externa para una prueba de penetracion.
- Ejecutar un ejercicio interno de red team o purple team.
- Cumplir requisitos de pruebas anuales para cumplimiento.
- Despues de un cambio mayor de arquitectura o lanzamiento de producto.
- Definir el alcance de un programa de bug bounty o pruebas crowdsourced.

## Prerequisitos

- Un inventario de sistemas, aplicaciones y rangos de red.
- Aprobacion legal y de cumplimiento para realizar la prueba.
- Una lista de contactos para escalamiento de emergencias.
- Conocimiento de la metodologia de prueba, como OWASP o PTES.

## Solucion

### Plantilla

#### 1. Detalles del Compromiso

| Campo | Descripcion | Valor |
|-------|-------------|-------|
| Organizacion | Entidad a probar | Acme Corp |
| Tipo de compromiso | Caja negra, gris o blanca | Caja gris |
| Fecha de inicio | Cuando comienza la prueba | 2026-07-01 |
| Fecha de fin | Cuando termina la prueba | 2026-07-15 |
| Ventana de prueba | Horarios permitidos | 08:00 - 18:00 UTC |
| Contacto de emergencia | Contacto 24/7 para hallazgos criticos | security@example.com |
| Fecha de entrega del informe | Cuando se entregan los hallazgos | 2026-07-22 |

#### 2. Objetivos en Alcance

| Objetivo | Tipo | Ambiente | URL / Rango IP | Notas |
|----------|------|----------|----------------|-------|
| app.example.com | Aplicacion web | Produccion | 203.0.113.10 | Publica |
| api.example.com | API | Produccion | 203.0.113.11 | Protegida con OAuth2 |
| Cluster k8s | Infraestructura cloud | Staging | 10.0.0.0/16 | Credenciales solo lectura |
| Portal admin | Aplicacion web | Produccion | admin.example.com | MFA habilitado |

#### 3. Elementos Fuera de Alcance

| Elemento | Razon |
|----------|-------|
| Proveedores SaaS de terceros | Fuera del control organizacional |
| Seguridad fisica | No incluido en este compromiso |
| Ingenieria social | Excluido por solicitud legal |
| Ataques de denegacion de servicio | Riesgo para disponibilidad de produccion |
| Dispositivos personales de empleados | Limites de privacidad y legales |
| Escrituras en base de datos de produccion | Podrian corromper datos de clientes |

#### 4. Reglas de Juego

| Regla | Descripcion |
|-------|-------------|
| Prueba autorizada | Solo se pueden probar los objetivos listados |
| Comunicacion | Los hallazgos criticos se reportan inmediatamente |
| Manejo de datos | Sin exfiltracion de datos de clientes a menos que sea aprobada |
| Herramientas | Herramientas comerciales y open source permitidas; sin auto-explotacion en produccion |
| Evidencia | Se requieren capturas de pantalla y logs para todos los hallazgos |
| Confidencialidad | Resultados almacenados cifrados y compartidos solo con destinatarios nombrados |
| Limpieza | El probador debe remover cualquier persistencia o cuenta creada durante la prueba |

#### 5. Metodologia de Prueba

| Fase | Actividades | Entregable |
|------|-------------|------------|
| Reconocimiento | Recopilar informacion publica y mapear objetivos | Inventario de objetivos |
| Escaneo | Escaneo de vulnerabilidades y configuraciones | Salida de escaneo |
| Explotacion | Intentar validar vulnerabilidades | Evidencia de explotacion |
| Post-explotacion | Evaluar impacto y movimiento lateral | Analisis de impacto |
| Reporte | Documentar hallazgos, riesgo y remediacion | Informe final |
| Re-test | Verificar correcciones despues de remediacion | Informe de re-test |

#### 6. Criterios de Exito

| Criterio | Objetivo |
|----------|----------|
| Cobertura | 100% de los objetivos en alcance probados |
| Hallazgos criticos | Reportados dentro de 24 horas de descubrimiento |
| Calidad del informe | Incluye calificacion de riesgo, evidencia y pasos de remediacion |
| Re-test | Todos los hallazgos altos y criticos remediados y re-testeados |
| Debrief | Sesiones ejecutivas y tecnicas entregadas |

## Explicacion

La plantilla de alcance alinea a la organizacion y a los probadores antes de enviar cualquier trafico. Reduce el riesgo legal, previene interrupciones en produccion y asegura que los hallazgos sean relevantes. Las reglas de juego son especialmente importantes porque separan la prueba autorizada de actividad criminal bajo leyes de fraude informatico.

## Variantes

- **Prueba de penetracion de aplicacion web**: Enfocada en pruebas OWASP Top 10 para una sola app.
- **Prueba de penetracion cloud**: Apunta a configuraciones e IAM de AWS, Azure o GCP.
- **Ejercicio de red team**: Alcance mas amplio con objetivos de sigilo y mayor duracion.
- **Alcance de bug bounty**: Objetivos publicos con lenguaje de safe harbor y reglas de recompensa.
- **Prueba de red interna**: Asume una perspectiva de insider o endpoint comprometido.

## Lo que funciona

- Obtener autorizacion escrita antes de comenzar cualquier prueba.
- Incluir a duenos tecnicos y de negocio en la definicion del alcance.
- Definir contactos de emergencia y rutas de escalamiento.
- Excluir sistemas de terceros a menos que se obtenga permiso explicito.
- Requerir evidencia de prueba de concepto para cada hallazgo.
- Programar re-test para validar la remediacion.
- Almacenar hallazgos de forma segura y limitar la distribucion.

## Errores Comunes

- Definir un alcance demasiado estrecho para encontrar riesgos reales.
- Olvidar incluir APIs, microservicios y backends moviles.
- No proporcionar credenciales de prueba para pruebas autenticadas.
- Permitir pruebas en produccion sin un plan de rollback.
- Saltarse el re-test y asumir que las correcciones estan completas.
- No informar al SOC o NOC que ocurrira la prueba.

## FAQs

### Que es una prueba de caja gris?

Una prueba de caja gris proporciona al probador algo de conocimiento interno, como credenciales, diagramas de arquitectura o codigo fuente, mientras simula un atacante con acceso limitado.

### Podemos probar sistemas de produccion?

Las pruebas en produccion estan permitidas si estan explicitamente incluidas en el alcance, durante ventanas acordadas y con planes de rollback. Muchas organizaciones prefieren probar staging primero.

### Que debe incluir un informe?

Como minimo: resumen ejecutivo, metodologia, alcance, hallazgos calificados por riesgo, evidencia, impacto, pasos de remediacion y resultados de re-test. Incluye cronogramas y puntajes CVSS cuando aplique.

## Soluciones Avanzadas

### Reconocimiento automatizado con Nmap y Nuclei

Ejecuta escaneo automatizado como primera pasada antes de la explotacion manual para identificar vulnerabilidades de baja complejidad:

```bash
#!/bin/bash
set -euo pipefail

TARGETS_FILE="targets.txt"
OUTPUT_DIR="pentest-recon-$(date +%Y%m%d)"
mkdir -p "$OUTPUT_DIR"

# Port scan all targets
echo "=== Port Scanning ==="
while IFS= read -r target; do
  echo "Scanning $target..."
  nmap -sV -sC -oA "$OUTPUT_DIR/nmap-$target" "$target" >> "$OUTPUT_DIR/nmap-summary.txt" 2>&1
done < "$TARGETS_FILE"

# Run Nuclei for known vulnerability templates
echo "=== Nuclei Vulnerability Scan ==="
nuclei -l "$TARGETS_FILE" \
  -t cves/ \
  -t exposures/ \
  -t misconfiguration/ \
  -severity critical,high,medium \
  -o "$OUTPUT_DIR/nuclei-findings.txt" \
  -json-export "$OUTPUT_DIR/nuclei-findings.json"

# Check for SSL/TLS issues
echo "=== SSL/TLS Assessment ==="
while IFS= read -r target; do
  testssl --severity HIGH --quiet "$target" >> "$OUTPUT_DIR/testssl-$target.txt" 2>&1
done < "$TARGETS_FILE"

# Summarize findings
echo "=== Summary ==="
echo "Nmap scans: $(ls "$OUTPUT_DIR"/nmap-*.xml 2>/dev/null | wc -l)"
echo "Nuclei findings: $(wc -l < "$OUTPUT_DIR/nuclei-findings.txt" 2>/dev/null || echo 0)"
echo "Results stored in $OUTPUT_DIR/"
```

### Escaneo automatizado con OWASP ZAP para aplicaciones web

Ejecuta escaneos autenticados contra objetivos web usando la API de ZAP:

```python
import time
from zapv2 import ZAPv2
from typing import List, Dict

class ZAPScanner:
    def __init__(self, zap_proxy: str = "http://127.0.0.1:8080", api_key: str = ""):
        self.zap = ZAPv2(proxies={"http": zap_proxy, "https": zap_proxy}, apikey=api_key)

    def scan_target(self, target_url: str, context_name: str = None) -> Dict:
        """Run a full ZAP scan against a target URL."""
        results = {"target": target_url, "alerts": []}

        # Step 1: Spider the target
        print(f"Spidering {target_url}...")
        scan_id = self.zap.spider.scan(target_url)
        while int(self.zap.spider.status(scan_id)) < 100:
            time.sleep(2)
        print(f"Spider complete. Found {len(self.zap.core.urls())} URLs.")

        # Step 2: Active scan
        print(f"Active scanning {target_url}...")
        ascan_id = self.zap.ascan.scan(target_url)
        while int(self.zap.ascan.status(ascan_id)) < 100:
            time.sleep(5)
        print("Active scan complete.")

        # Step 3: Collect alerts
        alerts = self.zap.core.alerts(baseurl=target_url)
        for alert in alerts:
            results["alerts"].append({
                "name": alert.get("name"),
                "risk": alert.get("risk"),
                "confidence": alert.get("confidence"),
                "url": alert.get("url"),
                "param": alert.get("param"),
                "solution": alert.get("solution"),
            })

        # Summary by risk level
        risk_counts = {}
        for a in results["alerts"]:
            risk = a["risk"]
            risk_counts[risk] = risk_counts.get(risk, 0) + 1

        results["summary"] = risk_counts
        return results

    def generate_report(self, results: List[Dict], output_file: str) -> None:
        """Generate a markdown report from scan results."""
        with open(output_file, "w") as f:
            f.write("# ZAP Automated Scan Report\n\n")
            f.write(f"**Date:** {time.strftime('%Y-%m-%d %H:%M UTC')}\n\n")

            for result in results:
                f.write(f"## {result['target']}\n\n")
                f.write(f"**Alerts by risk:** {result['summary']}\n\n")

                for alert in result["alerts"]:
                    f.write(f"### {alert['name']} ({alert['risk']})\n\n")
                    f.write(f"- **URL:** {alert['url']}\n")
                    f.write(f"- **Confidence:** {alert['confidence']}\n")
                    f.write(f"- **Solution:** {alert['solution']}\n\n")

# Example usage
scanner = ZAPScanner(zap_proxy="http://127.0.0.1:8080")
results = scanner.scan_target("https://app.example.com")
scanner.generate_report([results], "zap-report.md")
```

### Seguimiento de hallazgos con integracion Jira

Crea tickets automaticamente para hallazgos de la prueba de penetracion:

```python
from jira import JIRA
from dataclasses import dataclass
from typing import List

@dataclass
class PentestFinding:
    title: str
    severity: str  # Critical, High, Medium, Low
    description: str
    affected_component: str
    evidence: str
    remediation: str
    cvss_score: float

SEVERITY_TO_PRIORITY = {
    "Critical": "Highest",
    "High": "High",
    "Medium": "Medium",
    "Low": "Low",
}

class FindingToJira:
    def __init__(self, jira_url: str, api_token: str, project_key: str):
        self.jira = JIRA(server=jira_url, token_auth=api_token)
        self.project_key = project_key

    def create_tickets(self, findings: List[PentestFinding]) -> None:
        """Create Jira tickets for each penetration test finding."""
        for finding in findings:
            issue_dict = {
                "project": {"key": self.project_key},
                "summary": f"[Pentest] {finding.title} - {finding.affected_component}",
                "description": (
                    f"h3. Description\n{finding.description}\n\n"
                    f"h3. Affected Component\n{finding.affected_component}\n\n"
                    f"h3. Evidence\n{{code}}{finding.evidence}{{code}}\n\n"
                    f"h3. Remediation\n{finding.remediation}\n\n"
                    f"h3. CVSS Score\n{finding.cvss_score}"
                ),
                "issuetype": {"name": "Bug"},
                "priority": {"name": SEVERITY_TO_PRIORITY.get(finding.severity, "Medium")},
                "labels": ["pentest-finding", f"severity-{finding.severity.lower()}"],
            }
            issue = self.jira.create_issue(fields=issue_dict)
            print(f"Created {issue.key}: {finding.title} ({finding.severity})")

# Example usage
findings = [
    PentestFinding(
        title="SQL Injection in login endpoint",
        severity="Critical",
        description="The /api/login endpoint is vulnerable to SQL injection via the username parameter.",
        affected_component="api.example.com /api/login",
        evidence="' OR '1'='1' -- returned all user records",
        remediation="Use parameterized queries and input validation. See OWASP SQL Injection Prevention Cheat Sheet.",
        cvss_score=9.8,
    ),
    PentestFinding(
        title="Missing security headers",
        severity="Low",
        description="X-Frame-Options and Content-Security-Policy headers are not set.",
        affected_component="app.example.com",
        evidence="curl -I https://app.example.com shows missing headers",
        remediation="Add security headers in web server configuration or application middleware.",
        cvss_score=3.1,
    ),
]

jira_client = FindingToJira("https://company.atlassian.net", "api-token", "SEC")
jira_client.create_tickets(findings)
```

## Mejores Practicas Adicionales

1. **Usa una matriz de severidad de hallazgos que mapee a riesgo de negocio.** La severidad tecnica por si sola no captura el contexto de negocio. Una inyeccion SQL media en una API de pago publica es mas urgente que un hallazgo alto en una herramienta admin interna detras de VPN:

```markdown
## Business Risk Adjustment Matrix

| Technical Severity | Public-Facing | Authenticated Users Only | Internal Only |
|-------------------|---------------|-------------------------|---------------|
| Critical | Critical | Critical | High |
| High | High | High | Medium |
| Medium | Medium | Medium | Low |
| Low | Low | Low | Informational |
```

2. **Proporciona a los probadores un entorno de pruebas cuando sea posible.** Probar staging o una replica de produccion reduce el riesgo mientras aun encuentra vulnerabilidades reales:

```bash
#!/bin/bash
# Clone production database to staging for testing
aws rds create-db-snapshot \
  --db-instance-identifier prod-db \
  --db-snapshot-identifier pentest-snapshot-$(date +%Y%m%d)

aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier pentest-staging-db \
  --db-snapshot-identifier pentest-snapshot-$(date +%Y%m%d) \
  --db-subnet-group-name staging-subnet \
  --vpc-security-group-ids sg-pentest-access
```

## Errores Comunes Adicionales

1. **No notificar a los proveedores cloud sobre la prueba de penetracion.** Algunos proveedores cloud (AWS, Azure) requieren notificacion antes de probar. AWS ya no requiere aprobacion previa, pero Azure aun la requiere para ciertos tipos de prueba:

```bash
# Azure - notify Microsoft of penetration testing
# Submit via: https://msrc.microsoft.com/engage/pentest
# Include: subscription ID, test dates, target IPs, test types

# AWS - no longer requires approval, but review the testing policy
# https://aws.amazon.com/security/penetration-testing/
# Prohibited: DNS zone walking, DoS, DDoS
```

2. **No limpiar los artefactos de prueba.** Los probadores pueden dejar archivos, scripts o cuentas de usuario. Requiere una checklist de limpieza como parte de los entregables:

```markdown
## Post-Test Cleanup Checklist

- [ ] All test accounts removed from target systems
- [ ] Any uploaded files or scripts deleted
- [ ] Persistence mechanisms (cron jobs, services) removed
- [ ] Test data purged from databases
- [ ] SSH keys or credentials created during testing revoked
- [ ] Any modified configurations restored to original state
- [ ] Confirmation of cleanup provided in writing
```

## FAQs Adicionales

### Como definimos el alcance de una prueba de penetracion para microservicios?

Lista cada endpoint de microservicio por separado en la tabla de alcance. Incluye el API gateway, los endpoints de servicios individuales y cualquier ruta de comunicacion servicio a servicio. Proporciona las specs de Swagger/OpenAPI a los probadores para cobertura completa. Prueba tanto el gateway (perspectiva externa) como los servicios individuales (perspectiva interna). Incluye pruebas de autenticacion y autorizacion para la API de cada servicio.

### Cual es la diferencia entre un escaneo de vulnerabilidades y una prueba de penetracion?

Un escaneo de vulnerabilidades identifica debilidades potenciales usando herramientas automatizadas. Una prueba de penetracion va mas alla: un humano valida los hallazgos, encadena vulnerabilidades, intenta movimiento lateral y evalua el impacto real. Los escaneos de vulnerabilidades son rutinarios y frecuentes; las pruebas de penetracion son periodicas y mas profundas. Ambos son necesarios para un programa de seguridad completo.
