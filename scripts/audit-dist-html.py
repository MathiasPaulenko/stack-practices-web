import os, re, glob, random, json

random.seed(42)
htmls = glob.glob('dist/**/*.html', recursive=True)
sample = random.sample(htmls, 100)

issues = []
results = []

for h in sample:
    with open(h, encoding='utf-8') as f:
        txt = f.read()

    r = {'path': h, 'has_jsonld': False, 'jsonld_types': [], 'hreflangs': [], 'og_complete': False,
         'has_canonical': False, 'has_title': False, 'has_meta_desc': False, 'has_viewport': False,
         'has_lang': False, 'issues': []}

    # JSON-LD
    jsonld = re.findall(r'<script type="application/ld\+json">(.*?)</script>', txt, re.DOTALL)
    r['has_jsonld'] = len(jsonld) > 0
    r['jsonld_types'] = []
    for j in jsonld:
        t = re.search(r'"@type"\s*:\s*"([^"]+)"', j)
        if t:
            r['jsonld_types'].append(t.group(1))
        t2 = re.search(r'"@type"\s*:\s*\[\s*"([^"]+)"', j)
        if t2:
            r['jsonld_types'].append(t2.group(1))

    # hreflang
    hreflangs = re.findall(r'<link rel="alternate" hreflang="([^"]+)"', txt)
    r['hreflangs'] = hreflangs

    # OG
    og_title = re.search(r'<meta property="og:title" content="([^"]*)"', txt)
    og_desc = re.search(r'<meta property="og:description" content="([^"]*)"', txt)
    og_url = re.search(r'<meta property="og:url" content="([^"]*)"', txt)
    og_type = re.search(r'<meta property="og:type" content="([^"]*)"', txt)
    og_locale = re.search(r'<meta property="og:locale" content="([^"]*)"', txt)
    r['og_complete'] = all([og_title, og_desc, og_url, og_type, og_locale])

    # canonical
    canonical = re.search(r'<link rel="canonical" href="([^"]*)"', txt)
    r['has_canonical'] = bool(canonical)

    # title/desc/viewport/lang
    title = re.search(r'<title>([^<]*)</title>', txt)
    r['has_title'] = bool(title)
    desc = re.search(r'<meta name="description" content="([^"]*)"', txt)
    r['has_meta_desc'] = bool(desc)
    viewport = re.search(r'<meta name="viewport" content="([^"]*)"', txt)
    r['has_viewport'] = bool(viewport)
    html_tag = re.search(r'<html lang="([^"]+)"', txt)
    r['has_lang'] = bool(html_tag)

    if not r['has_jsonld']:
        r['issues'].append('missing JSON-LD')
    if 'en' not in r['hreflangs'] or 'es' not in r['hreflangs']:
        r['issues'].append('missing hreflang en/es')
    if not r['og_complete']:
        r['issues'].append('incomplete OG tags')
    if not r['has_canonical']:
        r['issues'].append('missing canonical')
    if not r['has_title']:
        r['issues'].append('missing title')
    if not r['has_meta_desc']:
        r['issues'].append('missing meta description')
    if not r['has_viewport']:
        r['issues'].append('missing viewport')
    if not r['has_lang']:
        r['issues'].append('missing html lang')

    results.append(r)

# Summary
print(f'Sampled {len(sample)} dist HTML files')
print(f'Has JSON-LD: {sum(1 for r in results if r["has_jsonld"])}')
print(f'Has hreflang en+es: {sum(1 for r in results if "en" in r["hreflangs"] and "es" in r["hreflangs"])}')
print(f'OG complete: {sum(1 for r in results if r["og_complete"])}')
print(f'Has canonical: {sum(1 for r in results if r["has_canonical"])}')
print(f'Has title: {sum(1 for r in results if r["has_title"])}')
print(f'Has meta desc: {sum(1 for r in results if r["has_meta_desc"])}')
print(f'Has viewport: {sum(1 for r in results if r["has_viewport"])}')
print(f'Has html lang: {sum(1 for r in results if r["has_lang"])}')
print(f'Files with issues: {sum(1 for r in results if r["issues"])}')

# Most common JSON-LD types
from collections import Counter
all_types = [t for r in results for t in r['jsonld_types']]
print(f'\nJSON-LD types: {Counter(all_types).most_common(10)}')

# Save
with open('ref/audit/reports/dist-html-audit.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)
print('\nSaved to ref/audit/reports/dist-html-audit.json')
