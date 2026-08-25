import re, glob, random

random.seed(42)
htmls = glob.glob('dist/**/*.html', recursive=True)
sample = random.sample(htmls, 50)
issues = 0
for h in sample:
    with open(h, encoding='utf-8') as f:
        txt = f.read()
    h1 = re.search(r'<h1[^>]*>(.*?)</h1>', txt, re.DOTALL)
    title = re.search(r'<title>([^<]*)</title>', txt)
    meta_desc = re.search(r'<meta name="description" content="([^"]*)"', txt)
    main_content = re.search(r'<main[^>]*>(.*?)</main>', txt, re.DOTALL)
    if not h1:
        print(f'{h}: missing H1')
        issues += 1
    if not main_content or len(main_content.group(1)) < 200:
        print(f'{h}: main content too short or missing')
        issues += 1

print(f'Sampled {len(sample)} pages')
print(f'Issues: {issues}')
