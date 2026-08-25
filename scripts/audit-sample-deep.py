import os, re, collections, random
import json

random.seed(42)

targets = {'recipes': 1300, 'patterns': 1500, 'guides': 3000, 'docs': 3000}

ai_words = [
    'delve', 'leverage', 'robust', 'seamless', 'comprehensive', 'intricate', 'nuanced',
    'tapestry', 'realm', 'embark', 'journey', 'landscape', 'myriad', 'unwavering',
    'pivotal', 'paramount', 'crucial', 'vital', 'essential', 'fundamental',
    'cornerstone', 'keystone', 'linchpin', 'game-changer', 'cutting-edge',
    'state-of-the-art', 'harness', 'unleash', 'unlock', 'supercharge', 'turbocharge',
    'elevate', 'skyrocket', 'sky-rocket', 'revolutionize', 'disrupt', 'transform',
    'game-changing', 'next-generation', 'next-gen', 'world-class', 'best-in-class',
    'industry-leading', 'top-tier', 'premier', 'elite', 'ultimate', 'definitive',
    'complete guide', 'in-depth', 'deep dive', 'deep-dive', 'hands-on', 'step-by-step',
    'end-to-end', 'full-stack', 'production-ready', 'enterprise-grade', 'battle-tested',
    'tried-and-true', 'tried and true', 'tried-and-tested', 'real-world', 'real world',
    'firstly', 'secondly', 'thirdly', 'moreover', 'furthermore', 'additionally',
    'in conclusion', 'in summary', 'it is important to note', 'it should be noted',
    'as mentioned earlier', 'as previously discussed', 'in the world of', 'in the realm of',
    'at the end of the day', 'the fact that', 'in order to'
]

all_files = []
for root, dirs, fnames in os.walk('src/content'):
    for f in fnames:
        if f.endswith('.md') and not f.startswith(('AGENTS', 'README')):
            all_files.append(os.path.join(root, f))

en_files = [p for p in all_files if not p.endswith('.es.md')]

# Top 100 slugs from checklist
top = [
    'api-documentation-openapi', 'parse-toml-files', 'chatbot-openai', 'optimistic-locking',
    'python-coverage-pytest-cov', 'python-schedule-periodic-tasks', 'concurrent-data-structures',
    'parse-log-files', 'flatten-unflatten-objects', 'python-asyncio-semaphore-rate-limiting',
    'penetration-test-template', 'parse-csv-python-pandas', 'database-read-replicas',
    'email-templates-mjml', 'python-sentiment-analysis-nltk', 'url-encoding',
    'database-deadlocks-retries', 'generate-pdf-report-python', 'go-rest-api-gin', 'llm-fine-tuning',
    'complete-guide-modular-monolith', 'deep-clone-javascript', 'rabbitmq-task-queue',
    'partial-class-pattern', 'convert-csv-to-json', 'server-sent-events-node',
    'python-airflow-dag-scheduling', 'elasticsearch-aggregations', 'password-hashing',
    'grpc-services-typescript', 'pre-commit-hooks', 'message-idempotency',
    'vertical-slice-architecture-guide', 'prometheus-api-monitoring', 'docker-network-isolation',
    'export-csv-excel', 'grpc-api', 'handle-errors', 'python-secrets-management-vault',
    'traffic-mirroring', 'async-generator-pattern', 'soft-deletes',
    'complete-guide-rabbitmq-architecture', 'domain-driven-design-guide',
    'idempotent-consumer-pattern', 'circuit-breaker-with-monitoring-pattern',
    'idempotent-api-endpoints', 'repository-pattern-typescript', 'repository-pattern',
    'complete-guide-graphql-caching', 'python-data-validation-pandera', 'call-rest-api',
    'prometheus-monitoring-alerts', 'database-views-materialized', 'parse-config-files',
    'complete-guide-local-llm-deployment', 'feature-flags', 'brotli-nginx-compression',
    'server-sent-events', 'graphql-federated-entity-pattern', 'cli-tool-argument-parsing',
    'sql-cte-guide', 'javascript-vitest-snapshot-testing', 'complete-guide-bundle-size-optimization',
    'java-wiremock-stub-external', 'caching', 'bridge-pattern', 'api-gateway', 'uuid-generation',
    'react-form-react-hook-form-validation', 'terraform-best-practices-guide', 'server-sent-events-go',
    'pipes-and-filters-pattern', 'graphql-mocking-apollo-server', 'unit-testing-mocking',
    'graceful-shutdown', 'encryption-at-rest', 'sql-cte-recursive-hierarchy',
    'model-view-viewmodel-pattern', 'python-rate-limiting-fastapi-redis', 'parse-command-line-arguments',
    'python-spark-groupby-aggregation', 'complete-guide-sentry-error-tracking', 'priority-queue-pattern',
    'semantic-search', 'copy-move-files', 'send-emails-smtp', 'distributed-lock-pattern',
    'connection-pooling', 'event-sourcing-relational', 'graphql-directives-auth',
    'python-dask-parallel-dataframe', 'flyweight-pattern', 'graphql-mutation-validation-pattern',
    'queue-based-load-leveling-pattern', 'onion-architecture-guide', 'grafana-dashboards-observability',
    'javascript-debounce-throttle-implementation', 'python-prometheus-metrics-exporter',
    'complete-guide-graphql-federation'
]

sample = []
for slug in top:
    for ctype in ['recipes', 'patterns', 'guides', 'docs']:
        for root, dirs, fnames in os.walk(f'src/content/{ctype}'):
            for f in fnames:
                if f == slug + '.md':
                    sample.append(os.path.join(root, f))

sample.extend(random.sample(en_files, 50))

# Add thin files
thin_files = []
for p in en_files:
    with open(p, encoding='utf-8') as fh:
        txt = fh.read()
    body = re.sub(r'^---\n.*?\n---', '', txt, count=1, flags=re.DOTALL)
    words = len(re.findall(r'\S+', body))
    rel = os.path.relpath(p, 'src/content').replace(os.sep, '/')
    ctype = rel.split('/')[0]
    if words < targets.get(ctype, 9999) * 0.6:
        thin_files.append((p, words))
thin_files.sort(key=lambda x: x[1])
sample.extend([p for p, w in thin_files[:20]])

sample = list(set(sample))

scores = []
for p in sample:
    with open(p, encoding='utf-8') as fh:
        txt = fh.read()
    fm_m = re.match(r'^---\n(.*?)\n---', txt, re.DOTALL)
    fm = fm_m.group(1) if fm_m else ''
    body = txt[fm_m.end():] if fm_m else txt
    words = len(re.findall(r'\S+', body))
    rel = os.path.relpath(p, 'src/content').replace(os.sep, '/')
    parts = rel.split('/')
    ctype = parts[0]
    target = targets.get(ctype, 0)
    thin_pct = words / target * 100 if target else 0
    thin = 'OK' if words >= target else 'THIN'

    md = re.search(r'^metaDescription:\s*(.+?)$', fm, re.MULTILINE)
    meta = md.group(1).strip().strip("'\"").strip('"').strip("'") if md else ''
    meta_len = len(meta)
    meta_status = 'OK' if 50 <= meta_len <= 170 else 'BAD'

    t = re.search(r'^title:\s*(.+?)$', fm, re.MULTILINE)
    title = t.group(1).strip().strip("'\"").strip('"').strip("'") if t else ''
    title_len = len(title)
    title_status = 'OK' if title_len <= 60 else 'LONG'

    h2 = re.findall(r'\n##\s+(.+)', body, re.IGNORECASE)
    h3 = re.findall(r'\n###\s+(.+)', body, re.IGNORECASE)
    dup_h2 = len(h2) - len(set([x.lower() for x in h2]))
    dup_h3 = len(h3) - len(set([x.lower() for x in h3]))

    em = body.count(' — ')
    em_ratio = em / (words / 100) if words else 0

    body_lower = body.lower()
    ai_hits = [w for w in ai_words if w in body_lower]
    passive = len(re.findall(r'\b(is|are|was|were|be|been|being)\s+\w+ed\b', body_lower))
    passive_ratio = passive / (words / 100) if words else 0

    body_links = len(re.findall(r'\]\((/[^)]+)\)', body))

    rr = re.search(r'^relatedResources:\s*\n((?:\s*-\s*[^\n]+\n?)*)', fm, re.MULTILINE)
    rr_count = 0
    if rr:
        rr_count = len(re.findall(r'^\s*-\s+', rr.group(1), re.MULTILINE))

    es_path = p.replace('.md', '.es.md')
    es_exists = os.path.exists(es_path)

    score = 100
    if thin == 'THIN':
        score -= min(40, int((100 - thin_pct) / 2))
    if meta_status == 'BAD':
        score -= 15
    if title_status == 'LONG':
        score -= 10
    if dup_h2 > 0:
        score -= 10
    if dup_h3 > 0:
        score -= 5
    if em_ratio > 1.5:
        score -= 10
    if em_ratio > 3:
        score -= 10
    if len(ai_hits) > 3:
        score -= 10
    if passive_ratio > 5:
        score -= 5
    if body_links < 2:
        score -= 10
    if rr_count < 3:
        score -= 5
    if not es_exists:
        score -= 25

    scores.append({
        'path': rel,
        'type': ctype,
        'words': words,
        'target': target,
        'thin_pct': thin_pct,
        'thin': thin,
        'meta_len': meta_len,
        'meta_status': meta_status,
        'title_len': title_len,
        'title_status': title_status,
        'dup_h2': dup_h2,
        'dup_h3': dup_h3,
        'em': em,
        'em_ratio': em_ratio,
        'ai_hits': ai_hits[:5],
        'ai_count': len(ai_hits),
        'passive': passive,
        'passive_ratio': passive_ratio,
        'body_links': body_links,
        'rr_count': rr_count,
        'es_exists': es_exists,
        'score': max(0, score)
    })

# Summary
print('\n=== SAMPLE AUDIT SUMMARY ===')
print(f'Total audited: {len(scores)}')
print(f'Average score: {sum(s["score"] for s in scores) / len(scores):.1f}')
print(f'Below 60: {sum(1 for s in scores if s["score"] < 60)}')
print(f'60-79: {sum(1 for s in scores if 60 <= s["score"] < 80)}')
print(f'80-89: {sum(1 for s in scores if 80 <= s["score"] < 90)}')
print(f'90+: {sum(1 for s in scores if s["score"] >= 90)}')
print(f'THIN: {sum(1 for s in scores if s["thin"] == "THIN")}')
print(f'Bad meta: {sum(1 for s in scores if s["meta_status"] == "BAD")}')
print(f'Long title: {sum(1 for s in scores if s["title_status"] == "LONG")}')
print(f'Dup H2: {sum(1 for s in scores if s["dup_h2"] > 0)}')
print(f'Dup H3: {sum(1 for s in scores if s["dup_h3"] > 0)}')
print(f'Em-dash >3 per 100w: {sum(1 for s in scores if s["em_ratio"] > 3)}')
print(f'AI words >3: {sum(1 for s in scores if s["ai_count"] > 3)}')
print(f'Body links <2: {sum(1 for s in scores if s["body_links"] < 2)}')
print(f'relatedResources <3: {sum(1 for s in scores if s["rr_count"] < 3)}')
print(f'Missing ES: {sum(1 for s in scores if not s["es_exists"])}')

print('\n=== TOP 20 LOWEST SCORES ===')
for s in sorted(scores, key=lambda x: x['score'])[:20]:
    print(f'{s["score"]:3d} {s["thin"]:5s} {s["words"]:5d}/{s["target"]:4d} {s["path"]}')

# Save full details
with open('ref/audit/reports/sample-audit-details.json', 'w', encoding='utf-8') as f:
    json.dump(scores, f, indent=2)

print('\nSaved details to ref/audit/reports/sample-audit-details.json')
