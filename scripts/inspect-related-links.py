import re

h = 'dist/recipes/redis-distributed-lock/index.html'
with open(h, encoding='utf-8') as f:
    txt = f.read()

# Find all <a> links in the page
links = re.findall(r'<a[^>]+href="([^"]+)"[^>]*>([^<]*)</a>', txt)
print(f'Total <a> links: {len(links)}')
print('\nFirst 30 links:')
for href, text in links[:30]:
    print(f'  {href} -> {text[:60].strip()}')

print('\nLinks to /es/...:')
for href, text in links:
    if href.startswith('/es/'):
        print(f'  {href} -> {text[:60].strip()}')
