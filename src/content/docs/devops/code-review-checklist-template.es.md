---
contentType: docs
slug: code-review-checklist-template
title: "Plantilla de Checklist para Code Review"
description: "Una checklist estructurada para realizar revisiones de codigo consistentes y exhaustivas que detecten bugs, mejoren la legibilidad y compartan conocimiento entre el equipo."
metaDescription: "Estandariza las revisiones de codigo con esta checklist. Cubre logica, seguridad, rendimiento, tests y estilo para feedback consistente y de alta calidad."
difficulty: beginner
topics:
  - devops
  - testing
tags:
  - code-review
  - checklist
  - quality-assurance
  - team-process
  - pull-request
relatedResources:
  - /docs/devops/engineering-handbook-template
  - /docs/devops/git-branching-strategy-document
  - /docs/devops/onboarding-checklist-backend-engineer
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Estandariza las revisiones de codigo con esta checklist. Cubre logica, seguridad, rendimiento, tests y estilo para feedback consistente y de alta calidad."
  keywords:
    - checklist de code review
    - revision de pull request
    - plantilla de calidad de codigo
    - estandares de revision
    - checklist de desarrollador
---

## Descripcion General

Las revisiones de codigo son la puerta de calidad mas util en la entrega de software, pero solo cuando son consistentes. Sin una checklist, los revisores se enfocan en lo que les importa personalmente: un ingeniero verifica inyeccion SQL, otro se obsesiona con nombres de variables, y un tercero solo mira cobertura de tests. Una checklist compartida asegura que cada revision cubra las dimensiones que importan al equipo, dejando espacio para el juicio humano en diseno y arquitectura.

## Cuando Usar

Usa esta plantilla cuando:
- Quieras estandarizar que significa "listo" para la revision de codigo en el equipo
- Nuevos revisores no esten seguros de que buscar en un pull request
- Las revisiones tarden demasiado porque los revisores no conocen el alcance
- Estes integrando un nuevo equipo y necesitas establecer estandares compartidos rapidamente
- Quieras reducir defectos post-merge e incidentes en produccion

## Prerrequisitos

Antes de adoptar esta checklist:
- [ ] El equipo acuerda que items son obligatorios vs. opcionales
- [ ] CI esta configurado para detectar problemas automaticos (linting, formato, type checks)
- [ ] Los revisores entienden que las checklists complementan el juicio; no lo reemplazan
- [ ] Existe una ruta documentada para escalar desacuerdos entre autor y revisor
- [ ] La checklist esta almacenada donde los revisores puedan consultarla facilmente (plantilla de PR, wiki, o mensaje fijado)

## Solucion

```markdown
# Checklist de Code Review

> Revisor: ______ | Autor: ______ | PR: ______ | Fecha: ______

## 1. Logica y Correctitud
- [ ] El codigo hace lo que la descripcion del PR dice que hace
- [ ] Los casos borde estan manejados (entradas vacias, nulos, timeouts, fallas)
- [ ] No hay errores off-by-one, condiciones de carrera, o bucles infinitos
- [ ] Los caminos de error son explicitos y no silencian excepciones
- [ ] La logica de negocio coincide con la especificacion o requerimiento del ticket

## 2. Seguridad
- [ ] No hay secretos, tokens, o credenciales en el codigo
- [ ] Las entradas de usuario son validadas y sanitizadas
- [ ] Existen verificaciones de autorizacion para operaciones protegidas
- [ ] No hay vulnerabilidades de inyeccion SQL, XSS, o command injection
- [ ] Las dependencias agregadas son verificadas y de fuentes confiables

## 3. Rendimiento
- [ ] No hay consultas N+1 o ineficiencias algoritmicas obvias
- [ ] Conjuntos grandes de datos estan paginados o transmitidos en stream
- [ ] No hay llamadas de red innecesarias ni I/O bloqueante en caminos calientes
- [ ] Caching se utiliza apropiadamente donde sea aplicable
- [ ] Se previenen fugas de recursos (conexiones, manejadores de archivos, memoria)

## 4. Testing
- [ ] Los unit tests cubren la logica nueva o modificada
- [ ] Los integration tests cubren dependencias externas y limites
- [ ] Casos borde y caminos de falla estan probados, no solo caminos felices
- [ ] Los tests son deterministicos y no dependen de tiempo ni orden
- [ ] Los nombres de los tests describen comportamiento, no implementacion

## 5. Mantenibilidad y Estilo
- [ ] El codigo es legible sin necesidad de preguntarle al autor
- [ ] Los nombres de variables y funciones son descriptivos y consistentes
- [ ] No hay logica duplicada que podria extraerse o reutilizarse
- [ ] Los comentarios explican "por que", no "que" (el codigo muestra el que)
- [ ] La complejidad es apropiada; se senala la sobre-ingenieria

## 6. Documentacion
- [ ] Las APIs publicas tienen documentacion actualizada o specs OpenAPI
- [ ] El README o runbooks se actualizan si el comportamiento cambio
- [ ] Los breaking changes se destacan explicitamente en la descripcion del PR
- [ ] Los pasos de migracion estan documentados si cambio el esquema o config

## 7. Despliegue y Operaciones
- [ ] Feature flags se usan para cambios riesgosos o irreversibles
- [ ] Monitoreo y alertas se agregan o actualizan para nuevos caminos
- [ ] El procedimiento de rollback es entendido y probado
- [ ] Las migraciones de base de datos son compatibles hacia atras o tienen un plan

---

## Notas de Revision

| Linea / Archivo | Problema | Severidad | Accion |
|-----------------|----------|-----------|--------|
| ______ | ______ | Nit / Sugerencia / Bloqueador | ______ |

**Veredicto general:** Aprobar / Solicitar cambios / Comentar
**Preparacion para merge:** Listo / Necesita trabajo / Bloqueado
```

## Explicacion

La checklist esta organizada por preocupacion en lugar de por tipo de archivo. Esto evita que los revisores se pierdan leyendo diff linea por linea y en su lugar evaluen el cambio contra las dimensiones que importan al equipo: correctitud, seguridad, rendimiento, testing, mantenibilidad, documentacion y operaciones. Separar las preocupaciones automaticas (linting, formato) de las humanas (diseno, legibilidad) mantiene las revisiones enfocadas en lo que los humanos hacen mejor.

## Variantes

| Contexto | Ajustes | Notas |
|----------|---------|-------|
| Codigo frontend / UI | Agregar accesibilidad, diseno responsivo, y compatibilidad de navegador | Los cambios visuales necesitan verificacion manual |
| Data pipelines | Agregar verificaciones de calidad de datos, compatibilidad de esquema, y consideraciones de backfill | Los cambios de datos son mas dificiles de deshacer que los de codigo |
| Infraestructura / Terraform | Agregar seguridad de estado, revision de plan, y evaluacion de radio de impacto | Una mala configuracion puede caer produccion |
| Codigo critico de seguridad | Hacer la seccion de seguridad obligatoria y requerir aprobacion del equipo de seguridad | Finanzas, salud, y sistemas de autenticacion |
| Hotfix / respuesta a incidente | Acortar la checklist a seguridad, correctitud, y rollback solamente | La velocidad importa; documenta lo que se omitio y por que |

## Lo que funciona

1. Mantente la checklist visible. Embebela en la plantilla de PR para que los revisores la vean automaticamente
2. Distingue nits de bloqueadores. No cada problema impide el merge; usa etiquetas de severidad para mantener las revisiones fluidas
3. Rota revisores. Las checklists reducen la brecha de experiencia, facilitando distribuir la carga de revision
4. Revisa la checklist trimestralmente. Elimina items que ahora son automaticos; agrega items que siguen escapandose
5. Limita el tiempo de revision. Si una revision toma mas de 30 minutos, el PR probablemente es demasiado grande

## Errores Comunes

1. Tratar la checklist como sustituto del pensamiento. La checklist atrapa omissiones comunes, no fallas de diseno
2. Hacer cada item obligatorio. Esto ralentiza las revisiones sin mejorar la calidad; solo bloquea en correctitud, seguridad y tests
3. No actualizar la checklist. A medida que las herramientas mejoran, las verificaciones manuales deberian automatizarse
4. Revisar solo. Las revisiones en pareja en cambios criticos atrapan problemas que los revisores solitarios omiten
5. Enfocarse solo en el diff. Los revisores tambien deberian verificar que la descripcion del PR, tests, y documentacion sean consistentes

## Preguntas Frecuentes

### Cuanto deberia durar una revision de codigo?

PRs pequenos (menos de 200 lineas) deberian revisarse en pocas horas. PRs grandes deberian dividirse o revisarse por etapas. Si una revision consistentemente toma mas de 30 minutos, el equipo deberia investigar si los PRs son demasiado grandes o la checklist es demasiado amplia.

### Deberian ingenieros junior revisar codigo de ingenieros senior?

Si. La revision de codigo es una oportunidad de aprendizaje tanto como una puerta de calidad. Los revisores junior detectan problemas de claridad que los senior pasan por alto porque ya comparten las suposiciones del autor. La checklist nivela el campo de juego al indicarle a todos que verificar.

### Que pasa si el autor no esta de acuerdo con un comentario de revision?

Discutanlo. Si la conversacion se estanca, escale a un tech lead o al desempatador documentado del equipo. La checklist existe para reducir debates subjetivos haciendo las expectativas explicitas, pero no puede eliminar todo desacuerdo.

## Soluciones Avanzadas

### Revision de codigo automatizada con GitHub Actions y CodeQL

Combina la checklist manual con analisis automatizado para detectar problemas que los humanos pasan por alto:

```yaml
# .github/workflows/code-review-automation.yml
name: Automated Code Review
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  codeql-analysis:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: python, javascript
      - uses: github/codeql-action/autobuild@v3
      - uses: github/codeql-action/analyze@v3

  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - name: Comment PR with lint results
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.payload.pull_request.number,
              body: "Linting or type checking failed. Please fix before requesting review."
            })

  pr-size-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Check PR size
        uses: actions/github-script@v7
        with:
          script: |
            const diff = await github.rest.pulls.listFiles({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.payload.pull_request.number,
            });
            const totalChanges = diff.data.reduce(
              (sum, file) => sum + file.changes, 0
            );
            if (totalChanges > 500) {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.payload.pull_request.number,
                body: `This PR has ${totalChanges} changes. Consider splitting into smaller PRs for easier review.`
              });
            }
```

### Bot de revision para hacer cumplir la checklist

Verifica automaticamente que los PRs cumplan los requisitos de la checklist antes de la revision:

```python
import subprocess
import json
import re
from typing import List, Dict

class PRChecklistValidator:
    def __init__(self, pr_diff: str, pr_description: str):
        self.diff = pr_diff
        self.description = pr_description

    def check_tests_added(self) -> bool:
        """Verify that new code includes tests."""
        has_source = bool(re.search(r'\+\+\+ b/src/.*\.py', self.diff))
        has_tests = bool(re.search(r'\+\+\+ b/tests/.*\.py', self.diff))
        if has_source and not has_tests:
            return False
        return True

    def check_no_secrets(self) -> bool:
        """Check for common secret patterns in the diff."""
        secret_patterns = [
            r'(?i)api[_-]?key\s*=\s*["\'][^"\']+["\']',
            r'(?i)password\s*=\s*["\'][^"\']+["\']',
            r'(?i)secret\s*=\s*["\'][^"\']+["\']',
            r'-----BEGIN (RSA |EC )?PRIVATE KEY-----',
            r'(?i)aws_secret_access_key\s*=\s*["\'][^"\']+["\']',
        ]
        added_lines = [line for line in self.diff.split('\n') if line.startswith('+')]
        for line in added_lines:
            for pattern in secret_patterns:
                if re.search(pattern, line):
                    return False
        return True

    def check_pr_description(self) -> bool:
        """Verify PR description has required sections."""
        required_sections = ["## Summary", "## Testing", "## Breaking Changes"]
        return all(section in self.description for section in required_sections)

    def run_all_checks(self) -> List[Dict]:
        """Run all checklist validations and return results."""
        checks = [
            ("Tests added for new code", self.check_tests_added),
            ("No secrets in diff", self.check_no_secrets),
            ("PR description complete", self.check_pr_description),
        ]
        results = []
        for name, check_fn in checks:
            passed = check_fn()
            results.append({
                "check": name,
                "passed": passed,
                "status": "PASS" if passed else "FAIL",
            })
        return results

# Example usage
diff = subprocess.run(
    ["git", "diff", "main...HEAD"],
    capture_output=True, text=True
).stdout

validator = PRChecklistValidator(diff, pr_description)
results = validator.run_all_checks()
for r in results:
    print(f"{r['status']}: {r['check']}")
```

### Dashboard de metricas de revision

Rastrea tiempo de ciclo de revision, calidad de comentarios y tasa de escape de defectos:

```python
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import List
from collections import defaultdict

@dataclass
class ReviewMetric:
    pr_number: int
    author: str
    reviewer: str
    created_at: datetime
    merged_at: datetime
    comments_count: int
    blockers_count: int
    post_merge_defects: int

def calculate_review_metrics(metrics: List[ReviewMetric]) -> Dict:
    """Calculate aggregate review metrics for the team."""
    if not metrics:
        return {}

    cycle_times = [(m.merged_at - m.created_at).total_seconds() / 3600 for m in metrics]
    comment_counts = [m.comments_count for m in metrics]
    defect_rate = sum(1 for m in metrics if m.post_merge_defects > 0) / len(metrics)

    by_reviewer = defaultdict(list)
    for m in metrics:
        by_reviewer[m.reviewer].append(m)

    reviewer_stats = {}
    for reviewer, reviews in by_reviewer.items():
        reviewer_stats[reviewer] = {
            "total_reviews": len(reviews),
            "avg_comments": sum(r.comments_count for r in reviews) / len(reviews),
            "avg_blockers": sum(r.blockers_count for r in reviews) / len(reviews),
            "defects_missed": sum(r.post_merge_defects for r in reviews),
        }

    return {
        "avg_cycle_time_hours": sum(cycle_times) / len(cycle_times),
        "avg_comments_per_pr": sum(comment_counts) / len(comment_counts),
        "defect_escape_rate": defect_rate,
        "by_reviewer": reviewer_stats,
    }

# Example usage
metrics = [
    ReviewMetric(101, "alice", "bob", datetime.now() - timedelta(hours=5), datetime.now(), 3, 1, 0),
    ReviewMetric(102, "charlie", "bob", datetime.now() - timedelta(hours=2), datetime.now(), 5, 2, 1),
    ReviewMetric(103, "alice", "dave", datetime.now() - timedelta(hours=8), datetime.now(), 1, 0, 0),
]

results = calculate_review_metrics(metrics)
print(f"Average cycle time: {results['avg_cycle_time_hours']:.1f}h")
print(f"Defect escape rate: {results['defect_escape_rate']:.0%}")
```

## Mejores Practicas Adicionales

1. **Usa slots de revision para prevenir fatiga del revisor.** Asigna un maximo de 2-3 revisiones por ingeniero por dia. Mas alla de eso, la calidad de revision cae considerablemente:

```yaml
# GitHub Actions - check reviewer load before assignment
- name: Check reviewer load
  uses: actions/github-script@v7
  with:
    script: |
      const reviewer = "bob";
      const prs = await github.rest.pulls.list({
        owner: context.repo.owner,
        repo: context.repo.repo,
        state: "open",
      });
      const assigned = prs.data.filter(pr =>
        pr.requested_reviewers.some(r => r.login === reviewer)
      );
      if (assigned.length >= 3) {
        core.warning(`${reviewer} already has ${assigned.length} open reviews. Consider assigning someone else.`);
      }
```

2. **Etiqueta revisiones por tipo para rastrear patrones.** Usa labels como `review:security`, `review:performance`, `review:refactor` para categorizar que tipos de issues son mas comunes:

```bash
#!/bin/bash
# Aggregate review labels from last 30 days
gh pr list \
  --state all \
  --search "is:pr closed:>=2026-06-01 label:review:" \
  --json labels,number \
  --jq '[.[] | .labels[] | select(.name | startswith("review:")) | .name] | group_by(.) | map({type: .[0], count: length}) | sort_by(.count) | reverse'
```

## Errores Comunes Adicionales

1. **Aprobar con "se ve bien" sin leer el codigo.** Esto derrota el proposito de la revision. Requiere al menos un comentario sustantivo o confirmacion explicita de que cada seccion de la checklist fue revisada:

```markdown
## Reviewer Confirmation

- [ ] I read every changed line
- [ ] I ran the tests locally
- [ ] I verified the PR description matches the changes
- [ ] I checked for breaking changes beyond the author's claims
```

2. **No revisar tests con el mismo rigor que el codigo de produccion.** Codigo de test fragil, no determinista o que no afirma lo correcto da falsa confianza. Aplica la misma checklist a los archivos de test:

```python
# Anti-pattern: test that always passes
def test_user_creation():
    user = create_user(email="test@example.com")
    assert user is not None  # Does not verify email, id, or status

# Better: test that verifies behavior
def test_user_creation_sets_correct_fields():
    user = create_user(email="test@example.com")
    assert user.email == "test@example.com"
    assert user.id is not None
    assert user.status == "active"
    assert user.created_at is not None
```

## Preguntas Frecuentes Adicionales

### Como manejamos revisiones para hotfixes urgentes?

Crea una checklist acortada que cubra solo las tres areas criticas: seguridad, correctitud y plan de rollback. Documenta lo que se omitio y programa una revision de seguimiento dentro de 48 horas para cubrir los items restantes. Nunca omitas las verificaciones de seguridad y correctitud, incluso bajo presion de tiempo. La revision de seguimiento detecta problemas mientras el contexto aun esta fresco.

### Deberiamos usar herramientas de revision de codigo con IA junto con la checklist?

Las herramientas con IA (CodeQL, Semgrep, Codacy) son utiles para detectar patrones conocidos como vulnerabilidades de seguridad y code smells. Manejan la porcion automatizada de la checklist, liberando a los revisores humanos para enfocarse en diseno, logica de negocio y casos borde. Sin embargo, las herramientas con IA no pueden reemplazar el juicio humano en decisiones de arquitectura, diseno de API o si el codigo realmente resuelve el problema del usuario. Usalas como primera pasada, no como aprobacion final.
