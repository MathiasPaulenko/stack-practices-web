import re

html = open('dist/recipes/api-documentation-openapi/index.html', 'r', encoding='utf-8').read()
head = re.search(r'<head>(.*?)</head>', html, re.S)
if head:
    text = head.group(1)
    patterns = [
        r'<title[^>]*>.*?</title>',
        r'<meta name="description"[^>]*>',
        r'<link rel="canonical"[^>]*>',
        r'<link rel="alternate"[^>]*>',
        r'<script type="application/ld\+json"[^>]*>.*?</script>',
    ]
    for pat in patterns:
        for m in re.finditer(pat, text, re.S):
            print(m.group(0)[:500])
            print()
