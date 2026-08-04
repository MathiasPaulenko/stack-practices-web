from pathlib import Path
import re

for p in Path('D:/Codigo/stack-practices-web/src/content').rglob('*.md'):
    text = p.read_text(encoding='utf-8')
    new = re.sub(r'^author:\s*["\']?StackPractices["\']?$', 'author: Mathias Paulenko', text, flags=re.MULTILINE)
    if new != text:
        p.write_text(new, encoding='utf-8')
        print('updated', p)
