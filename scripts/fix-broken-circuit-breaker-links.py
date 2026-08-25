from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent

# Files reported by find-broken-body-links.py
files = [
    "src/content/docs/architecture/api-lifecycle-management-template.md",
    "src/content/docs/architecture/api-lifecycle-management-template.es.md",
    "src/content/docs/architecture/api-monitoring-alerting-template.md",
    "src/content/docs/architecture/api-monitoring-alerting-template.es.md",
    "src/content/docs/architecture/api-performance-budget-template.md",
    "src/content/docs/architecture/api-performance-budget-template.es.md",
    "src/content/docs/architecture/microservice-contract-template.md",
    "src/content/docs/architecture/microservice-contract-template.es.md",
    "src/content/docs/architecture/service-dependency-map-template.md",
    "src/content/docs/architecture/service-dependency-map-template.es.md",
    "src/content/docs/architecture/system-diagram-template.md",
    "src/content/docs/architecture/system-diagram-template.es.md",
    "src/content/docs/architecture/technical-spec-template.md",
    "src/content/docs/architecture/technical-spec-template.es.md",
    "src/content/docs/devops/architecture-decision-record-adr-template.md",
    "src/content/docs/devops/architecture-decision-record-adr-template.es.md",
]

OLD = "/recipes/circuit-breaker-pattern-recipe"
NEW = "/patterns/circuit-breaker-pattern"

for rel in files:
    path = ROOT / rel
    if not path.exists():
        print(f"MISSING: {rel}")
        continue
    text = path.read_text(encoding="utf-8")
    if OLD not in text:
        print(f"NO CHANGE NEEDED: {rel}")
        continue
    text = text.replace(OLD, NEW)
    path.write_text(text, encoding="utf-8")
    print(f"FIXED: {rel}")

print("\nDone. Run find-broken-body-links.py to validate.")
