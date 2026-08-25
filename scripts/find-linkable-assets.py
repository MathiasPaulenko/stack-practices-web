"""Find linkable assets: resources with >=3000 words, code blocks, and FAQ sections."""
import os
import re
from pathlib import Path

CONTENT_DIR = Path("src/content")
MIN_WORDS = 2000

def count_words(text):
    # Remove code blocks first to count prose words
    prose = re.sub(r'```[\s\S]*?```', '', text)
    prose = re.sub(r'`[^`]+`', '', prose)
    words = re.findall(r'\b[a-zA-Z0-9]+\b', prose)
    return len(words)

def has_code_blocks(text):
    return bool(re.search(r'```', text))

def has_faq(text):
    return bool(re.search(r'## FAQ|## Frequently Asked|## Preguntas', text, re.IGNORECASE))

def count_code_blocks(text):
    return len(re.findall(r'```', text)) // 2

assets = []
for col in ['guides', 'recipes', 'patterns', 'docs']:
    col_dir = CONTENT_DIR / col
    if not col_dir.exists():
        continue
    for md_file in col_dir.rglob("*.md"):
        if md_file.name.endswith(".es.md"):
            continue
        text = md_file.read_text(encoding='utf-8')
        words = count_words(text)
        if words >= MIN_WORDS:
            code = has_code_blocks(text)
            faq = has_faq(text)
            code_count = count_code_blocks(text)
            # Get slug from path
            rel = md_file.relative_to(CONTENT_DIR / col)
            slug = str(rel).replace('\\', '/').replace('.md', '')
            assets.append({
                'col': col,
                'slug': slug,
                'words': words,
                'code': code,
                'code_blocks': code_count,
                'faq': faq,
                'path': str(md_file),
            })

# Sort by score: words + code_blocks*100 + faq*500
assets.sort(key=lambda a: a['words'] + a['code_blocks']*100 + (500 if a['faq'] else 0), reverse=True)

print(f"Total linkable assets (>= {MIN_WORDS} words): {len(assets)}")
print(f"  With code blocks: {sum(1 for a in assets if a['code'])}")
print(f"  With FAQ: {sum(1 for a in assets if a['faq'])}")
print(f"  With both code + FAQ: {sum(1 for a in assets if a['code'] and a['faq'])}")
print()
print(f"{'#':>3} {'Words':>6} {'Code':>5} {'FAQ':>4} {'Type':<8} {'Slug'}")
print("-" * 80)
for i, a in enumerate(assets[:50], 1):
    print(f"{i:>3} {a['words']:>6} {a['code_blocks']:>5} {'Y' if a['faq'] else 'N':>4} {a['col']:<8} {a['slug']}")

print()
print("=== By collection ===")
for col in ['guides', 'recipes', 'patterns', 'docs']:
    col_assets = [a for a in assets if a['col'] == col]
    print(f"  {col}: {len(col_assets)} assets")
