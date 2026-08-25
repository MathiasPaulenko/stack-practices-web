import re, glob, random

random.seed(42)
htmls = glob.glob('dist/**/*.html', recursive=True)
sample = random.sample(htmls, 50)
issues = 0
for h in sample:
    with open(h, encoding='utf-8') as f:
        txt = f.read()
    path = h.replace('dist/', '').replace('\\', '/')
    is_es = path.startswith('es/')
    # Only <a href=...> body links, not <link> (hreflang/alternate) or <base>
    body_links = re.findall(r'<a[^>]+href="([^"]+)"', txt)
    bad = []
    if is_es:
        for link in body_links:
            if re.match(r'/(recipes|patterns|guides|docs)/', link) and not link.startswith('/es/'):
                bad.append(link)
    else:
        for link in body_links:
            if re.match(r'/es/(recipes|patterns|guides|docs)/', link):
                bad.append(link)
    if bad:
        issues += len(bad)
        print(f'{h}: {len(bad)} potentially wrong-language body links: {bad[:5]}')

print(f'\nTotal wrong language link issues in sample: {issues}')
