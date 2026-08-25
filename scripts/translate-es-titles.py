#!/usr/bin/env python3
"""Translate ES titles that are identical to EN."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "src" / "content"

translations = [
    ("recipes/api/logging.es.md", "Logging", "Registro de eventos (Logging)"),
    ("recipes/api/middleware.es.md", "Middleware", "Middleware: Interceptores HTTP"),
    ("recipes/api/rate-limiting.es.md", "Rate Limiting", "Limitacion de tasa (Rate Limiting)"),
    ("recipes/api/webhooks.es.md", "Webhooks", "Webhooks: Notificaciones HTTP"),
    ("recipes/architecture/service-discovery.es.md", "Service Discovery", "Descubrimiento de servicios"),
    ("recipes/architecture/workflow-engine.es.md", "Workflow Engines", "Motores de workflows"),
    ("recipes/data/url-encoding.es.md", "URL Encoding", "Codificacion de URLs"),
    ("recipes/devops/chaos-engineering.es.md", "Chaos Engineering", "Ingenieria del caos"),
    ("recipes/devops/cron-jobs.es.md", "Cron Jobs", "Tareas programadas con Cron"),
    ("recipes/devops/github-actions.es.md", "GitHub Actions CI/CD", "GitHub Actions: CI/CD"),
    ("recipes/frontend/server-side-rendering.es.md", "Server-Side Rendering", "Renderizado en el servidor (SSR)"),
    ("recipes/messaging/dead-letter-queue.es.md", "Dead Letter Queues", "Colas de mensajes muertos (Dead Letter Queues)"),
    ("recipes/observability/metrics-collection.es.md", "Metrics Collection", "Recoleccion de metricas"),
    ("recipes/security/security-headers.es.md", "Security Headers", "Cabeceras de seguridad HTTP"),
    ("patterns/design/factory-pattern.es.md", "Factory Pattern", "Patron Factory"),
    ("patterns/frontend/custom-hook-composition-pattern.es.md", "Custom Hook Composition", "Composicion de hooks personalizados"),
    ("patterns/testing/golden-master-testing-pattern.es.md", "Golden Master Testing", "Testing con Golden Master"),
    ("guides/architecture/clean-architecture-guide.es.md", "Clean Architecture", "Arquitectura limpia (Clean Architecture)"),
    ("guides/devops/sre-practices-guide.es.md", "Site Reliability Engineering", "Ingenieria de confiabilidad del sitio (SRE)"),
]

count = 0
for rel, old, new in translations:
    p = CONTENT_DIR / rel
    if not p.exists():
        print(f"MISSING: {rel}")
        continue
    text = p.read_text(encoding="utf-8")
    patterns = [
        f'title: "{old}"',
        f"title: '{old}'",
        f"title: {old}",
    ]
    replaced = False
    for pat in patterns:
        if pat in text:
            text = text.replace(pat, f'title: "{new}"', 1)
            p.write_text(text, encoding="utf-8")
            count += 1
            replaced = True
            print(f"OK: {rel} -> {new}")
            break
    if not replaced:
        print(f"NOT FOUND: {rel} (expected title: {old!r})")

print(f"Total translated: {count}")
