import re, glob, json

htmls = glob.glob('dist/**/*.html', recursive=True)
results = []
for h in htmls[:200]:  # sample 200
    with open(h, encoding='utf-8') as f:
        txt = f.read()
    jsonld_blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', txt, re.DOTALL)
    valid = 0
    invalid = 0
    types = []
    for j in jsonld_blocks:
        try:
            data = json.loads(j)
            valid += 1
            if isinstance(data, list):
                for item in data:
                    types.append(item.get('@type', 'unknown'))
            elif isinstance(data, dict):
                if '@graph' in data:
                    for item in data['@graph']:
                        types.append(item.get('@type', 'unknown'))
                else:
                    types.append(data.get('@type', 'unknown'))
        except json.JSONDecodeError:
            invalid += 1
    results.append({'path': h, 'valid': valid, 'invalid': invalid, 'types': types})

print(f'Sampled {len(results)} dist HTML files')
print(f'Files with JSON-LD: {sum(1 for r in results if r["valid"]>0)}')
print(f'Invalid JSON-LD blocks: {sum(r["invalid"] for r in results)}')
from collections import Counter
type_counter = Counter(t for r in results for t in r['types'])
print('\nJSON-LD types:')
for t, c in type_counter.most_common(15):
    print(f'  {t}: {c}')

# Check for missing FAQPage on pages with FAQ section
with_faq_but_no_faqpage = 0
for r in results:
    with open(r['path'], encoding='utf-8') as f:
        txt = f.read()
    has_faq = 'FAQ' in txt or 'Preguntas Frecuentes' in txt
    has_faqpage = 'FAQPage' in r['types']
    if has_faq and not has_faqpage:
        with_faq_but_no_faqpage += 1
print(f'\nPages with FAQ section but no FAQPage schema: {with_faq_but_no_faqpage}')
