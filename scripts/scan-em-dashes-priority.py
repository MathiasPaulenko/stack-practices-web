#!/usr/bin/env python3
"""Check em-dash counts in the top-20 priority resources and high-count resources."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "src" / "content"
EM_DASH = "\u2014"

# Top-20 from master-checklist.md
TOP_20 = [
    "recipes/api/api-documentation-openapi",
    "guides/architecture/domain-driven-design-guide",
    "guides/architecture/vertical-slice-architecture-guide",
    "guides/databases/sql-cte-guide",
    "guides/architecture/onion-architecture-guide",
    "guides/messaging/complete-guide-rabbitmq-architecture",
    "guides/ai/complete-guide-local-llm-deployment",
    "guides/api/complete-guide-graphql-federation",
    "guides/frontend/complete-guide-bundle-size-optimization",
    "guides/devops/terraform-best-practices-guide",
    "recipes/data/parse-csv-python-pandas",
    "recipes/data/parse-log-files",
    "recipes/security/password-hashing",
    "recipes/api/server-sent-events-node",
    "recipes/data/convert-csv-to-json",
    "patterns/design/repository-pattern",
    "patterns/design/repository-pattern-typescript",
    "recipes/caching/caching",
    "recipes/api/handle-errors",
    "recipes/observability/prometheus-api-monitoring",
]


def count_em(text: str) -> tuple[int, int]:
    parts = text.split("---", 2)
    body = parts[2] if len(parts) > 2 else text
    words = len(re.findall(r"\b[\w]+\b", body))
    return body.count(EM_DASH), words


print("=== Top-20 priority resources ===")
print(f"{'Em':>4} {'Words':>6}  Resource")
print("-" * 70)
for slug_path in TOP_20:
    p = CONTENT_DIR / f"{slug_path}.md"
    if not p.exists():
        print(f"  MISSING: {slug_path}")
        continue
    em, words = count_em(p.read_text(encoding="utf-8"))
    status = " WARN" if em >= 5 else ""
    print(f"{em:>4} {words:>6}  {slug_path}{status}")

print()
print("=== Resources with >= 15 em-dashes (all EN) ===")
TYPES = ["recipes", "patterns", "guides", "docs"]
all_files = []
for t in TYPES:
    all_files.extend(sorted((CONTENT_DIR / t).rglob("*.md")))
all_files = [f for f in all_files if not f.name.endswith(".es.md") and f.name not in ("AGENTS.md", "README.md")]

high = []
for f in all_files:
    em, words = count_em(f.read_text(encoding="utf-8"))
    if em >= 15:
        rel = f.relative_to(CONTENT_DIR).as_posix()
        high.append((em, words, rel))

high.sort(key=lambda x: -x[0])
print(f"Total with >= 15: {len(high)}")
print(f"{'Em':>4} {'Words':>6}  File")
print("-" * 70)
for em, words, rel in high:
    print(f"{em:>4} {words:>6}  {rel}")
